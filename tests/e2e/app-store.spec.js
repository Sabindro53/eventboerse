// Die App für den App Store: was sich ohne macOS prüfen lässt.
//
// Das Xcode-Projekt entsteht erst auf einem Mac. Alles, was hier liegt, ist
// aber schon jetzt falsch oder richtig — und drei Dinge davon führen zu einer
// abgelehnten Einreichung, wenn sie auseinanderlaufen:
//
//   1. Privacy-Manifest gegen die Datenangaben im Vault. Apple prüft das
//      Manifest gegen App Store Connect; wer sie getrennt pflegt, merkt den
//      Widerspruch erst bei der Ablehnung.
//   2. viewport-fit gegen die safe-area-Abstände im CSS. Eines ohne das
//      andere ist wirkungslos, und zwar STILL.
//   3. Die Kontolöschung in der App (Guideline 5.1.1(v)) — ohne sie gibt es
//      keine Freigabe, und sie ist leicht wegzurefaktorisieren.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

const MANIFEST = lies('native', 'PrivacyInfo.xcprivacy');
const VAULT = lies('vault', '40-Governance', 'Legal', 'App-Store.md');
const CAPACITOR = JSON.parse(lies('native', 'capacitor.config.json'));
const INDEX_PHP = lies('index.php');
const STYLES = lies('styles.css');

/** Datenarten, die das Manifest wirklich deklariert. */
function ausManifest() {
  return [...MANIFEST.matchAll(
    /<key>NSPrivacyCollectedDataType<\/key>\s*<string>([^<]+)<\/string>/g)]
    .map((m) => m[1]);
}

/** Datenarten, die die Vault-Tabelle führt (Spalte „Kennung"). */
function ausVault() {
  return [...VAULT.matchAll(/`(NSPrivacyCollectedDataType\w+)`/g)].map((m) => m[1]);
}

test.describe('Privacy-Manifest und Vault sagen dasselbe', () => {
  test('beide Seiten führen überhaupt Datenarten', () => {
    // Zwei leere Listen stimmen immer überein. Ohne diese Prüfung wäre ein
    // kaputtes Muster ein bestandener Test.
    expect(ausManifest().length, 'das Manifest deklariert nichts')
      .toBeGreaterThanOrEqual(8);
    expect(ausVault().length, 'die Vault-Tabelle führt keine Kennungen')
      .toBeGreaterThanOrEqual(8);
  });

  test('keine Datenart steht nur auf einer Seite', () => {
    // Der eigentliche Zweck dieser Suite. Apple vergleicht das Manifest mit
    // den Angaben in App Store Connect, und die Vault-Tabelle ist die Quelle
    // für diese Angaben. Driften sie, fällt es bei der Einreichung auf.
    const m = new Set(ausManifest());
    const v = new Set(ausVault());
    const nurManifest = [...m].filter((x) => !v.has(x));
    const nurVault = [...v].filter((x) => !m.has(x));
    expect(nurManifest, `im Manifest, aber nicht im Vault: ${nurManifest.join(', ')}`)
      .toHaveLength(0);
    expect(nurVault, `im Vault, aber nicht im Manifest: ${nurVault.join(', ')}`)
      .toHaveLength(0);
  });

  test('jede Datenart ist genau einmal deklariert', () => {
    const alle = ausManifest();
    expect(new Set(alle).size, `doppelte Einträge im Manifest: ${alle.join(', ')}`)
      .toBe(alle.length);
  });

  test('der Standort ist als GENAU deklariert', () => {
    // getCurrentPosition() liefert die volle Auflösung. „Grober Standort"
    // anzugeben wäre eine Untertreibung gegenüber dem, was der Code tut.
    expect(ausManifest(), 'der Radar liest den genauen Standort')
      .toContain('NSPrivacyCollectedDataTypePreciseLocation');
    expect(lies('js', 'modules', 'search', '13-event-radar.js'),
      'Annahme veraltet: der Radar liest den Standort nicht mehr so')
      .toMatch(/getCurrentPosition/);
  });

  test('das Präferenzprofil läuft unter Personalisierung, nicht unter Funktion', () => {
    // eb_taste_v1 wird aus Such- und Klickverhalten ABGELEITET und ist in der
    // Cookie-Liste als profilbildend eingestuft. Es unter „App-Funktionalität"
    // zu führen wäre bequem und erzeugte einen Widerspruch zur eigenen
    // Datenschutzerklärung — genau die Sorte, die Apple findet.
    const block = MANIFEST.match(
      /NSPrivacyCollectedDataTypeProductInteraction<\/string>[\s\S]*?<\/array>\s*<\/dict>/);
    expect(block, 'Produktinteraktion ist nicht mehr deklariert').toBeTruthy();
    expect(block[0], 'die Personalisierung fehlt als Zweck')
      .toContain('NSPrivacyCollectedDataTypePurposeProductPersonalization');
    expect(lies('vault', '40-Governance', 'Legal', 'Cookie-Liste.md'),
      'Annahme veraltet: eb_taste_v1 gilt nicht mehr als profilbildend')
      .toMatch(/eb_taste_v1[^\n]*profilbildend/);
  });

  test('kein Tracking — und das ist am Code belegbar', () => {
    expect(MANIFEST, 'NSPrivacyTracking steht nicht auf false')
      .toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
    expect(MANIFEST, 'es sind Tracking-Domains eingetragen')
      .toMatch(/<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/);
  });

  test('die Begründung für UserDefaults liegt bei', () => {
    // Ohne sie lehnt App Store Connect mit ITMS-91053 ab. Capacitor legt
    // seinen Zustand dort ab, das ist nicht abwählbar.
    expect(MANIFEST, 'NSPrivacyAccessedAPITypes fehlt')
      .toMatch(/NSPrivacyAccessedAPICategoryUserDefaults/);
    expect(MANIFEST, 'der Grund CA92.1 fehlt').toMatch(/<string>CA92\.1<\/string>/);
  });

  test('das Manifest ist wohlgeformtes XML', () => {
    // Ein Manifest, das Xcode nicht parsen kann, fällt erst beim Bauen auf.
    const auf = (MANIFEST.match(/<dict>/g) || []).length;
    const zu = (MANIFEST.match(/<\/dict>/g) || []).length;
    expect(auf, 'unausgeglichene <dict>-Elemente').toBe(zu);
    const aufA = (MANIFEST.match(/<array>/g) || []).length;
    const zuA = (MANIFEST.match(/<\/array>/g) || []).length;
    expect(aufA, 'unausgeglichene <array>-Elemente').toBe(zuA);
    expect(MANIFEST, 'die plist-Deklaration fehlt').toMatch(/<plist version="1\.0">/);
  });
});

test.describe('Safe Areas: viewport-fit und CSS gehören zusammen', () => {
  test('styles.css rechnet mit safe-area-inset', () => {
    const treffer = (STYLES.match(/env\(safe-area-inset/g) || []).length;
    expect(treffer, 'kein einziger safe-area-Abstand — dieser Test prüft nichts')
      .toBeGreaterThanOrEqual(5);
  });

  test('viewport-fit=cover ist gesetzt — sonst liefert jedes env() eine 0', () => {
    // Der stille Fall: ohne dieses Attribut ergeben ALLE safe-area-Abfragen
    // 0. Das Layout sieht auf dem Schreibtisch richtig aus und liegt auf
    // einem iPhone mit Home-Indikator darunter. Bis zum 02.09.2026 war genau
    // das der Zustand — die Behandlung war da und war wirkungslos.
    expect(INDEX_PHP, 'in index.php fehlt viewport-fit=cover')
      .toMatch(/<meta name="viewport"[\s\S]{0,200}viewport-fit=cover/);
    expect(lies('index.html'), 'in der Dev-Shell fehlt viewport-fit=cover')
      .toMatch(/viewport-fit=cover/);
  });

  test('der native Vollbildbetrieb ist angemeldet', () => {
    expect(INDEX_PHP, 'apple-mobile-web-app-capable fehlt')
      .toMatch(/name="apple-mobile-web-app-capable"\s+content="yes"/);
    // black-translucent legt den Inhalt UNTER die Statusleiste. Das ist nur
    // zusammen mit viewport-fit und den safe-area-Abständen bedienbar.
    expect(INDEX_PHP, 'die Statusleisten-Art passt nicht zu viewport-fit=cover')
      .toMatch(/apple-mobile-web-app-status-bar-style"\s+content="black-translucent"/);
  });

  test('die Statusleisten-Farbe ist nicht mehr das tote Lila', () => {
    // #6C63FF kam im ganzen Projekt sonst nur in generate-icons.html vor,
    // einem Werkzeug, das nichts ausliefert. Die Marke ist #FF385C.
    //
    // Kommentare raus, BEVOR gesucht wird: der erklärende Kommentar in
    // index.php zitiert den entfernten Wert, und die erste Fassung dieses
    // Tests fiel daran. Dritter Fall desselben Musters an einem Tag —
    // eine Prüfung, die Prosa trifft, prüft keinen Code.
    const ohneKommentare = INDEX_PHP.replace(/<!--[\s\S]*?-->/g, '');
    expect(ohneKommentare, 'das tote #6C63FF ist zurück').not.toMatch(/#6C63FF/i);
    expect(INDEX_PHP, 'theme-color folgt dem Farbmodus nicht')
      .toMatch(/theme-color"[^>]*media="\(prefers-color-scheme: dark\)"/);
  });
});

test.describe('Capacitor: die Entscheidung ist bewusst und begründet', () => {
  test('die App lädt die echte Domain — dieselbe Herkunft wie Safari', () => {
    // Der Grund ist die Anmeldung: die REST-API authentifiziert über das
    // WordPress-Cookie plus X-WP-Nonce. Aus einem gebündelten Capacitor-App
    // (Herkunft capacitor://localhost) wäre jede Anfrage cross-site — kein
    // Cookie, kein Nonce. Ein Bundle bräuchte ein ZWEITES Auth-Verfahren für
    // alle 106 Routen.
    expect(CAPACITOR.server.url, 'die App zeigt nicht auf die Live-Domain')
      .toBe('https://xn--eventbrse-57a.de');
    expect(CAPACITOR.server.hostname, 'ohne hostname stimmt die Cookie-Herkunft nicht')
      .toBe('xn--eventbrse-57a.de');
  });

  test('nichts läuft im Klartext', () => {
    expect(CAPACITOR.server.cleartext, 'Klartext-HTTP ist erlaubt').toBe(false);
    expect(CAPACITOR.server.iosScheme).toBe('https');
    expect(CAPACITOR.server.androidScheme).toBe('https');
    expect(CAPACITOR.android.allowMixedContent, 'gemischte Inhalte sind erlaubt')
      .toBe(false);
  });

  test('native/ wird nicht auf den Webserver gespiegelt', () => {
    // `mirror --delete` haelt das Deploy-Ziel deckungsgleich mit dem Repo.
    // Ohne Ausschluss laegen capacitor.config.json, das Privacy-Manifest und
    // das README unter /wp-content/themes/eventboerse/native/ oeffentlich im
    // Netz. Kein Geheimnisleck bei einem offenen Repo, aber Baumaterial, das
    // auf dem Server nichts zu suchen hat — dieselbe Kategorie wie scripts/,
    // tests/ und js/modules/.
    const deploy = lies('.github', 'workflows', 'ionos-deploy.yml');
    expect(deploy, "native/ fehlt in der Ausschlussliste des Deploys")
      .toMatch(/-x '\^native\/'/);
  });

  test('die App-Kennung ist gesetzt und stabil', () => {
    // Sie lässt sich nach der ersten Einreichung nie wieder ändern.
    expect(CAPACITOR.appId).toBe('de.eventboerse.app');
    expect(CAPACITOR.appName).toBe('Eventbörse');
  });
});

test.describe('Freigabe-Hürden, die im Code liegen', () => {
  test('5.1.1(v): das Konto lässt sich IN der App löschen', () => {
    // Ohne diesen Weg gibt es keine Freigabe — und er ist leicht
    // wegzurefaktorisieren, weil er selten benutzt wird. DSGVO Art. 17
    // verlangt ihn ohnehin.
    expect(lies('functions.php'), 'die Route /settings/delete-account fehlt')
      .toMatch(/register_rest_route\([^)]*'\/settings\/delete-account'/);
    expect(lies('app-shell.html'), 'in den Einstellungen fehlt der Knopf')
      .toMatch(/confirmDeleteAccount\(\)/);
  });

  test('3.1.3(e): kein In-App-Kauf, und der Grund steht dabei', () => {
    // Eine Leistung, die ausserhalb der App erbracht wird, DARF nicht über
    // IAP laufen. Apple nimmt 0 %. Die Sorge vor der Provision war der Grund
    // für einen Browser-Umweg, den 3.1.1(a) ausserhalb der USA gerade
    // einschränkt — der riskantere Weg.
    expect(lies('native', 'README.md'), 'die Begründung zu 3.1.3(e) fehlt')
      .toMatch(/3\.1\.3\(e\)/);
    const paket = JSON.parse(lies('package.json'));
    const alle = JSON.stringify(paket.dependencies || {}) +
                 JSON.stringify(paket.devDependencies || {});
    expect(alle, 'ein In-App-Kauf-Plugin ist hinzugekommen — bei Leistungen '
      + 'ausserhalb der App ist das nicht erlaubt')
      .not.toMatch(/in-?app-?purchase|revenuecat|purchases-capacitor/i);
  });

  test('4.2: die geplanten nativen Fähigkeiten sind benannt', () => {
    // Eine reine Website-Hülle wird abgelehnt. Das ist der wahrscheinlichste
    // Ablehnungsgrund für diesen Aufbau und wird nicht durch Argumente
    // ausgeräumt, sondern durch Funktionen.
    const readme = lies('native', 'README.md');
    for (const f of ['Push', 'Kamera', 'Passkeys', 'Standort']) {
      expect(readme, `${f} ist als native Fähigkeit nicht benannt`).toContain(f);
    }
  });
});
