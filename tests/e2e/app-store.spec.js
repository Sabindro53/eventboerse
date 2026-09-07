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
const { trefferAusserhalbKommentaren } = require('./lib/html-kommentare');

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
    // Der erklärende Kommentar in index.php zitiert den entfernten Wert, und
    // die erste Fassung dieses Tests fiel daran — eine Prüfung, die Prosa
    // trifft, prüft keinen Code.
    //
    // Der Griff steht in lib/html-kommentare.js und wird NICHT hier
    // nachgebaut: die von Hand geschriebene Fassung war es, die CodeQL zweimal
    // gemeldet hat.
    const treffer = trefferAusserhalbKommentaren(INDEX_PHP, /#6C63FF/gi);
    expect(treffer, `das tote #6C63FF ist zurück, an Position `
      + `${treffer.map((t) => t.index).join(', ')}`).toHaveLength(0);
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
    // IAP laufen. Apple nimmt 0 %.
    //
    // Hier stand bis zum 02.09.2026, der Browser-Umweg sei „der riskantere
    // Weg", weil 3.1.1(a) ihn ausserhalb der USA einschränke. Das war zu
    // stark: die Verbote in 3.1.1 gelten Apps mit DIGITALEN Inhalten, die IAP
    // benutzen müssen. Wir fallen unter 3.1.3(e) und liegen ausserhalb davon.
    //
    // Der Umweg wäre also erlaubt — er brächte nur nichts. Die Provision ist
    // eine application_fee_amount auf einer Stripe-Destination-Charge, in der
    // App identisch mit dem Browser. Apple sieht dieses Geld nie.
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

// ── Die Fragebögen in App Store Connect ───────────────────────────────────
//
// Beide sind Formulare, die jemand einmal ausfüllt — und danach nie wieder
// ansieht. Genau deshalb müssen die Antworten am Code hängen und nicht am
// Gedächtnis: eine Angabe, die stimmte, als sie eingetragen wurde, wird still
// falsch, sobald sich der Code darunter bewegt. Apple prüft sie später gegen
// die App, nicht gegen das Datum ihrer Eingabe.

/** Apples Beschriftungen im App-Privacy-Fragebogen, wörtlich. */
const ASC_DATENARTEN = {
  'Contact Info': ['Name', 'Email Address', 'Phone Number', 'Physical Address',
    'Other User Contact Info'],
  'Health & Fitness': ['Health', 'Fitness'],
  'Financial Info': ['Payment Info', 'Credit Info', 'Other Financial Info'],
  Location: ['Precise Location', 'Coarse Location'],
  'Sensitive Info': ['Sensitive Info'],
  Contacts: ['Contacts'],
  'User Content': ['Emails or Text Messages', 'Photos or Videos', 'Audio Data',
    'Gameplay Content', 'Customer Support', 'Other User Content'],
  'Browsing History': ['Browsing History', 'Search History'],
  Identifiers: ['User ID', 'Device ID'],
  Purchases: ['Purchase History'],
  'Usage Data': ['Product Interaction', 'Advertising Data', 'Other Usage Data'],
  Diagnostics: ['Crash Data', 'Performance Data', 'Other Diagnostic Data'],
  'Other Data': ['Other Data Types'],
};

/**
 * Die Zeilen der Vault-Tabelle als Paare {pfad, kennung}.
 *
 * Gelesen wird die Tabelle, nicht die Datei: ein Ausdruck über den ganzen Text
 * fände den Klickpfad auch im Fliesstext darunter und zählte ihn mit.
 */
function tabellenZeilen() {
  return [...VAULT.matchAll(
    /^\|\s*\*{0,2}([^|*]+?)\*{0,2}\s*\|\s*`(NSPrivacyCollectedDataType\w+)`\s*\|/gm)]
    .map((m) => ({ pfad: m[1].trim(), kennung: m[2] }));
}

test.describe('App Privacy: die Tabelle ist der Klickpfad', () => {
  test('jede Datenart des Manifests hat eine Zeile mit Klickpfad', () => {
    // Ohne diese Prüfung wäre ein kaputtes Muster ein bestandener Test — die
    // Fehlerklasse, die dieses Projekt am häufigsten erwischt hat.
    const zeilen = tabellenZeilen();
    expect(zeilen.length, 'die Tabelle liefert keine Zeilen — Muster kaputt?')
      .toBe(ausManifest().length);
    const inTabelle = new Set(zeilen.map((z) => z.kennung));
    for (const k of ausManifest()) {
      expect(inTabelle.has(k), `${k} steht im Manifest, aber in keiner `
        + 'Tabellenzeile mit Klickpfad').toBe(true);
    }
  });

  test('jeder Klickpfad gibt es bei Apple wirklich', () => {
    // Eine übersetzte oder erfundene Beschriftung ist im Formular nicht
    // auffindbar. Wer sucht, klickt irgendwann daneben — und eine falsche
    // Datenart in App Store Connect widerspricht dann dem Manifest.
    for (const { pfad, kennung } of tabellenZeilen()) {
      const teile = pfad.split('›').map((s) => s.trim());
      expect(teile.length, `${kennung}: „${pfad}" ist kein Pfad `
        + '„Kategorie › Datenart"').toBe(2);
      const [kategorie, datenart] = teile;
      expect(Object.keys(ASC_DATENARTEN), `${kennung}: „${kategorie}" ist `
        + 'keine Kategorie des App-Privacy-Fragebogens').toContain(kategorie);
      expect(ASC_DATENARTEN[kategorie], `${kennung}: „${datenart}" steht bei `
        + `Apple nicht unter „${kategorie}"`).toContain(datenart);
    }
  });

  test('der Standort ist auch im Klickpfad der genaue', () => {
    // Coarse Location anzuklicken wäre die bequemere Angabe und widerspräche
    // dem Manifest, das PreciseLocation deklariert — Apple vergleicht beides.
    const zeile = tabellenZeilen()
      .find((z) => z.kennung === 'NSPrivacyCollectedDataTypePreciseLocation');
    expect(zeile, 'die Zeile zum Standort fehlt').toBeTruthy();
    expect(zeile.pfad).toBe('Location › Precise Location');
  });
});

test.describe('Altersfreigabe: der Fragebogen hängt am Code', () => {
  test('Alkoholbezüge gibt es — „keine" wäre eine unwahre Angabe', () => {
    // Die Versuchung ist gross, hier „keine" anzukreuzen: „selten" ergibt 9+
    // und liegt weit unter unseren 16+, das Ergebnis ändert sich also nicht.
    // Geprüft wird später aber die Angabe, nicht das Ergebnis.
    const merkmale = lies('js', 'modules', 'ui', '22-inserat-settings-uploads.js');
    for (const m of ['Cocktail-Bar', 'Bier-Zapfanlage', 'Wein-Verkostung']) {
      expect(merkmale, `„${m}" ist aus der Merkmalsliste verschwunden — dann `
        + 'ist die Antwort „selten" zur Alkoholfrage neu zu prüfen').toContain(m);
    }
    // „Alkoholfreie Cocktails" steht ebenfalls in der Liste. Ein Ausdruck auf
    // „Alkohol" träfe genau den Eintrag, der das Gegenteil belegt — dieselbe
    // Falle wie ein Muster, das den erklärenden Kommentar trifft.
    expect(merkmale, 'Annahme veraltet: der alkoholfreie Eintrag ist weg')
      .toContain('Alkoholfreie Cocktails');
    // Gemessen wird die TABELLENZEILE, nicht die Datei: der Absatz darunter
    // erklärt die Antwort und nennt dabei „keine" als das, was falsch wäre.
    // Ein Ausdruck über den ganzen Text träfe die Erklärung statt der Angabe.
    const zeile = VAULT.split('\n')
      .find((l) => l.startsWith('|') && l.includes('Alkohol'));
    expect(zeile, 'die Alkoholzeile fehlt im Fragebogen-Abschnitt').toBeTruthy();
    const zellen = zeile.split('|').map((z) => z.trim());
    const antwort = zellen[zellen.findIndex((z) => z.includes('Alkohol')) + 1];
    expect(antwort, 'die Alkoholfrage ist mit „keine" beantwortet, obwohl die '
      + 'Merkmalsliste Cocktail-Bar, Bier-Zapfanlage und Wein-Verkostung führt')
      .toMatch(/selten/);
  });

  test('es gibt keine Alterskontrolle — und der Fragebogen sagt das auch', () => {
    // § 3 der AGB nennt 18 Jahre. Das ist eine Klausel, keine Kontrolle: die
    // Registrierung fragt weder Alter noch Geburtsdatum ab. Apple fragt nach
    // der Kontrolle. Kommt eine dazu, müssen zwei Antworten nachgezogen
    // werden — dieser Test bricht dann ab und sagt welche.
    const auth = lies('js', 'modules', 'core', '30-auth.js');
    expect(auth, 'in der Registrierung steht jetzt ein Alters-/Geburtsfeld — '
      + '„Age Assurance" und „Social Media Disabled for Users Under 13" im '
      + 'Fragebogen sind damit neu zu beantworten')
      .not.toMatch(/geburt|birthdate|birth_date|date_of_birth|age_(check|gate|verif)/i);
    expect(VAULT, 'die Antwort zu „Age Assurance" fehlt')
      .toMatch(/\|\s*Age Assurance\s*\|\s*\*\*nein\*\*/);
    expect(VAULT, 'die Antwort zu „Social Media Disabled for Users Under 13" fehlt')
      .toMatch(/\|\s*Social Media Disabled for Users Under 13\s*\|\s*\*\*nein\*\*/);
    expect(VAULT, 'die AGB-Klausel ist als Begründung nicht mehr benannt')
      .toMatch(/Klausel ist eine vertragliche Zusage, keine technische Kontrolle/);
  });

  test('unrestricted web access bleibt der Grund für 16+', () => {
    // Die Kopplung, die #235 gebaut hat — hier noch einmal aus Sicht des
    // Fragebogens: die Zeile muss „ja" sagen, solange die Konfiguration es tut.
    expect(CAPACITOR.ios.limitsNavigationsToAppBoundDomains).toBe(false);
    expect(VAULT, 'die Zeile „Unrestricted Web Access" antwortet nicht mehr „ja"')
      .toMatch(/Unrestricted Web Access\*{0,2}\s*\|\s*\*\*ja\*\*/);
  });
});

// ── Eine Erklärung, die durch Nichtstun falsch wird ──────────────────────
//
// Für die TestFlight-Phase ist „kein Händler auf dem App Store" die
// ZUTREFFENDE Angabe — Apple nimmt TestFlight ausdrücklich aus. Sie wird in
// dem Moment unwahr, in dem die App öffentlich im EU-App-Store steht, ohne
// dass jemand etwas ändert und ohne dass irgendwo eine Warnung erscheint.
//
// Das ist die gefährlichere Sorte: eine fehlende Erklärung blockiert und
// fällt auf, eine stillschweigend falsch gewordene nicht. Der einzige Schutz
// ist der Vermerk im Vault — deshalb hält ihn ein Test fest. Wer ihn löscht,
// löscht die einzige Warnung, die es dafür gibt.
test.describe('Händlerstatus: die Umstellung darf nicht vergessen werden', () => {
  const TESTFLIGHT = lies('native', 'TestFlight.md');

  /**
   * Markdown bricht Zeilen um, wo es der Umbruch will. Ein Muster mit festen
   * Leerzeichen prüft deshalb die Formatierung mit — und fällt beim nächsten
   * Umformatieren, ohne dass sich die Aussage geändert hätte. Genau daran
   * scheiterte der erste Anlauf dieses Tests: „Händlerstatus von" stand am
   * Zeilenende, „*kein Händler*" am nächsten Zeilenanfang.
   */
  const satz = (s) => new RegExp(s.trim().split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'));

  test('der Vault nennt die heute zutreffende Angabe UND ihre Umstellung', () => {
    // Beide Hälften. Nur die erste wäre eine Anleitung zur falschen Angabe,
    // nur die zweite liesse offen, was heute gilt.
    expect(VAULT, 'der Vault sagt nicht mehr, welche Angabe heute zutrifft')
      .toMatch(satz('kein Händler auf dem App Store'));
    expect(VAULT, 'der Vermerk fehlt, dass die Angabe durch NICHTSTUN falsch wird')
      .toMatch(satz('durch Nichtstun falsch'));
    expect(VAULT, 'die Umstellung auf „Händler" ist als Vorbedingung der '
      + 'öffentlichen EU-Listung nicht mehr benannt')
      .toMatch(satz('von *kein Händler* auf **Händler** umstellen'));
  });

  test('auch die TestFlight-Anleitung verlangt Umstellen, nicht nur Verifizieren', () => {
    // Dort stand nur „verifiziert, nicht nur erklärt". Wer das liest, prüft
    // den Haken an der Verifikation und übersieht, dass die Erklärung selbst
    // die falsche ist.
    expect(TESTFLIGHT, 'die Umstellung fehlt in der Liste vor der Listung')
      .toMatch(satz('auf *Händler* umstellen'));
    expect(TESTFLIGHT, 'die Anleitung verlangt wieder nur die Verifikation')
      .toMatch(satz('nicht nur verifizieren'));
  });

  test('der Cowork-Auftrag lässt bei persönlichen Daten anhalten', () => {
    // Die Grenze der Übertragung: die Auswahl darf Cowork treffen, den
    // Händler-Zweig mit Anschrift und Telefonnummer nicht. Fällt die
    // Abbruchregel weg, füllt ein fleissiger Agent das Formular fertig aus.
    const auftrag = lies('vault', '30-Betrieb', 'Cowork-Auftraege.md');

    // Gemessen wird die REGELLISTE, nicht die Datei und nicht ein
    // Zeichenabstand. Beide Abkürzungen waren schon falsch:
    //
    //   · `Anschrift…[\s\S]{0,160}…anhalten` prüft, wie weit zwei Wörter
    //     auseinanderstehen — also die Formatierung. Ein umgebrochener
    //     Absatz hätte den Test gebrochen, ohne dass sich etwas ändert.
    //   · Der ganze Abschnitt B2 war zu weit: „Postfach" steht dort ZWEIMAL,
    //     einmal in der Abbruchregel und einmal im Absatz „Anschrift auch als
    //     Postfach". Eine Mutation, die es aus der REGEL nahm, blieb deshalb
    //     grün — der Treffer kam aus der Erklärung. Dieselbe Mechanik wie
    //     „Alkoholfreie Cocktails" bei der Alkoholfrage.
    const von = auftrag.indexOf('#### Die Regel');
    const bis = auftrag.indexOf('#### Was du dazu melden musst');
    expect(von, 'die Regelliste in B2 ist nicht auffindbar — dann prüft '
      + 'dieser Test nichts').toBeGreaterThan(-1);
    expect(bis, 'das Ende der Regelliste ist nicht auffindbar').toBeGreaterThan(von);
    const regeln = auftrag.slice(von, bis);

    for (const feld of ['Anschrift', 'Postfach', 'Telefonnummer']) {
      expect(regeln, `„${feld}" ist aus der Abbruchregel verschwunden — dann `
        + 'füllt ein fleissiger Agent den Händler-Zweig fertig aus')
        .toContain(feld);
    }
    expect(regeln, 'die Regeln sagen nicht mehr, dass bei persönlichen Daten '
      + 'anzuhalten ist').toContain('anhalten');
    expect(regeln, 'das Verbot, EU-Verteilung anzukreuzen, ist weg')
      .toMatch(satz('niemals an, die App werde im EU-App-Store verteilt'));
  });
});
