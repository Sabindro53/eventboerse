// Die Bausteine für die Mac-Sitzung — und wo sie auseinanderlaufen können.
//
// Auf dem Mac läuft `native/ios-einrichten.sh` einmal durch, und was dabei
// falsch ist, fällt frühestens im Xcode-Build auf, meistens erst in der Beta
// App Review. Diese Suite prüft von hier aus, was von hier aus prüfbar ist.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
// Der gemeinsame Griff, nicht selbst nachgebaut: `pruefhygiene.spec.js`
// verbietet jeder Suite, HTML-/XML-Kommentare eigenhaendig herauszuschneiden.
const { trefferAusserhalbKommentaren } = require('./lib/html-kommentare');

const ROOT = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

// Die Zwecktexte kommen aus dem Skript, nicht aus einer Abschrift hier —
// sonst prüfte die Suite ihre eigene Kopie.
function zwecktexte() {
  return JSON.parse(execFileSync('node', ['-e', `
    import('./native/zwecktexte.mjs').then(async (m) =>
      process.stdout.write(JSON.stringify(await m.zwecktexteLesen())));
  `], { cwd: ROOT, encoding: 'utf8' }));
}

test.describe('Zwecktexte: eine Quelle, kein zweiter Ort', () => {
  test('vier Schluessel, aus den Ueberschriften gelesen', () => {
    const e = zwecktexte();
    expect(e.map((x) => x.schluessel).sort()).toEqual([
      'NSCameraUsageDescription',
      'NSFaceIDUsageDescription',
      'NSLocationWhenInUseUsageDescription',
      'NSPhotoLibraryUsageDescription',
    ]);
  });

  test('das Mikrofon kommt NICHT mit', () => {
    // Der Kern der Ueberschriften-Regel. `NSMicrophoneUsageDescription` steht
    // in Info.plist-zwecktexte.md — im Fliesstext eines Abschnitts, der
    // ausdruecklich davon abraet. Ein Sammler, der die Datei nach
    // `NS…UsageDescription` durchsucht, erbaete eine Berechtigung, von der
    // die eigene Unterlage abraet.
    const quelle = lies('native', 'Info.plist-zwecktexte.md');
    expect(quelle, 'die Falle ist gar nicht mehr da — dann prueft dieser Test '
      + 'nichts').toContain('NSMicrophoneUsageDescription');
    expect(zwecktexte().map((x) => x.schluessel))
      .not.toContain('NSMicrophoneUsageDescription');
  });

  test('nichts aus „Nicht eintragen" rutscht durch', () => {
    const verboten = [
      'NSLocationAlwaysAndWhenInUseUsageDescription',
      'NSContactsUsageDescription',
      'NSPhotoLibraryAddUsageDescription',
      'NSUserTrackingUsageDescription',
    ];
    const quelle = lies('native', 'Info.plist-zwecktexte.md');
    const gelesen = zwecktexte().map((x) => x.schluessel);
    for (const k of verboten) {
      expect(quelle, `${k} steht nicht mehr unter „Nicht eintragen"`).toContain(k);
      expect(gelesen, `${k} wurde eingesammelt`).not.toContain(k);
    }
  });

  test('jeder Eintrag hat beide Sprachen und sagt, was passiert', () => {
    for (const e of zwecktexte()) {
      expect(e.de.length, `${e.schluessel}: DE ist zu kurz fuer eine Begruendung`)
        .toBeGreaterThan(40);
      expect(e.en.length, `${e.schluessel}: EN ist zu kurz`).toBeGreaterThan(40);
      // Apple lehnt Begruendungen ab, die nur die Berechtigung nennen. Ein
      // Text, der mit „Diese App benoetigt" beginnt, ist genau das.
      expect(e.de, `${e.schluessel}: DE beginnt mit einer Leerformel`)
        .not.toMatch(/^(Diese App ben|Wir ben|Die App ben)/i);
    }
  });
});

test.describe('Entitlements: die Haelfte, die am leichtesten fehlt', () => {
  const ent = () => lies('native', 'App.entitlements');

  test('BEIDE Associated Domains, nicht nur applinks', () => {
    // `applinks:` hat eine sichtbare Wirkung, `webcredentials:` nicht — bis
    // sich jemand anmelden will. Wer die zweite Zeile streicht, weil „die
    // Links ja gehen", baut eine App ohne Login.
    expect(ent(), 'webcredentials fehlt — dann bietet iOS keinen Passkey an')
      .toContain('webcredentials:xn--eventbrse-57a.de');
    expect(ent(), 'applinks fehlt').toContain('applinks:xn--eventbrse-57a.de');
  });

  test('Punycode, nicht Umlaut', () => {
    // Apple gleicht den Host zeichenweise gegen die Zuordnungsdatei ab.
    //
    // Gemessen wird AUSSERHALB der Kommentare. Die Datei nennt „eventbörse.de"
    // als Gegenbeispiel — daran ist dieser Test beim ersten Lauf selbst
    // haengengeblieben, im selben Muster, das dieses Projekt schon viermal
    // erwischt hat: der Ausdruck trifft das erklaerende Wort statt die Zeile.
    const treffer = trefferAusserhalbKommentaren(ent(), /eventbörse\.de/g);
    expect(treffer.map((t) => t.index),
      'der Umlaut steht ausserhalb eines Kommentars in den Entitlements')
      .toEqual([]);
  });

  test('die Domain stimmt mit der Capacitor-Konfiguration ueberein', () => {
    const cap = JSON.parse(lies('native', 'capacitor.config.json'));
    const host = new URL(cap.server.url).hostname;
    expect(ent(), `capacitor.config.json zeigt auf ${host}, die Entitlements `
      + 'nennen einen anderen Host').toContain(`applinks:${host}`);
    expect(ent()).toContain(`webcredentials:${host}`);
  });

  test('aps-environment steht auf development', () => {
    // `production` fest einzutragen bricht jeden Lauf auf dem Geraet; Xcode
    // ersetzt den Wert beim Archivieren selbst.
    expect(ent()).toMatch(/<key>aps-environment<\/key>\s*<string>development<\/string>/);
  });
});

test.describe('Das Einrichtungsskript behauptet seinen Erfolg nicht', () => {
  const skript = () => lies('native', 'ios-einrichten.sh');

  test('es liest die erzeugte Info.plist zurueck', () => {
    // Ein Einrichtungsskript, das „fertig" meldet, ohne nachzusehen, ist der
    // Pruefer, der gruen meldet, ohne geprueft zu haben.
    //
    // Die erste Fassung dieses Tests suchte nur `Print :$k` — und das steht
    // auch in der Gegenprobe-Schleife weiter unten. Die Mutation
    // `WERT=behauptet` ueberlebte damit: das Muster fand die falsche Stelle.
    // Gleiche Fehlerklasse wie ein Ausdruck, der den Kommentar trifft.
    //
    // Geprueft wird jetzt die VERKETTUNG: der Wert muss aus PlistBuddy
    // kommen, ein leerer Wert muss den Zaehler hochsetzen, und der Zaehler
    // muss den Lauf beenden. Faellt ein Glied weg, meldet das Skript Erfolg,
    // ohne einen zu haben.
    const s = skript();
    expect(s, 'der Rueckgabewert kommt nicht aus PlistBuddy')
      .toMatch(/WERT=\$\(\s*"\$PB"\s+-c\s+"Print :\$k"/);
    expect(s, 'ein leerer Wert erhoeht den Fehlzaehler nicht')
      .toMatch(/if \[ -z "\$WERT" \][\s\S]{0,200}FEHLT=\$\(\(FEHLT \+ 1\)\)/);
    expect(s, 'der Fehlzaehler beendet den Lauf nicht')
      .toMatch(/if \[ "\$FEHLT" -gt 0 \][\s\S]{0,200}exit 1/);
  });

  test('es prueft auch, was NICHT drinstehen darf', () => {
    expect(skript(), 'die Gegenprobe auf das Mikrofon fehlt')
      .toContain('NSMicrophoneUsageDescription');
    expect(skript(), 'die Gegenprobe auf Tracking fehlt')
      .toContain('NSUserTrackingUsageDescription');
  });

  test('es ist wiederholbar', () => {
    // Delete-dann-Add: `Set` scheitert bei fehlendem Schluessel, `Add` bei
    // vorhandenem. Wer nur eines von beiden nimmt, hat ein Skript, das genau
    // einmal laeuft — und beim ersten Fehler traut sich niemand mehr.
    expect(skript()).toMatch(/Delete :\$k/);
    expect(skript()).toMatch(/Add :\$k string/);
    expect(skript(), 'cap add ios laeuft auch beim zweiten Mal')
      .toMatch(/if \[ ! -d ios \]/);
  });

  test('es laeuft nicht versehentlich woanders', () => {
    expect(skript()).toMatch(/uname.*Darwin/);
  });
});

test.describe('Der Haendlerstatus blockiert TestFlight nicht', () => {
  test('die Unterlagen sagen das auch', () => {
    // Bis zum 06.09.2026 stand hier „Pflicht fuer jede App im EU-App-Store,
    // ohne ihn keine Listung" — als Vorbedingung gelesen, und so war er auch
    // als erster Punkt der Startreihenfolge gefuehrt. Fuer die Listung stimmt
    // der Satz, fuer TestFlight nicht.
    const tf = lies('native', 'TestFlight.md');
    expect(tf, 'TestFlight.md nennt die Ausnahme nicht').toMatch(/TestFlight/);
    expect(tf, 'der Unterschied erklaeren/verifizieren fehlt')
      .toMatch(/[Ee]rklären.*[Vv]erifikation|[Vv]erifikation.*[Ee]rklären/s);
    const vault = lies('vault', '40-Governance', 'Legal', 'App-Store.md');
    expect(vault, 'die alte Fassung steht noch unkorrigiert im Vault')
      .not.toMatch(/Pflicht für \*\*jede\*\* App im\n\s*EU-App-Store, ohne ihn keine Listung/);
  });

  test('intern und extern werden auseinandergehalten', () => {
    // Der Unterschied ist der ganze Zeitplan: interne Tester brauchen KEINE
    // Beta App Review, externe schon — samt Pruefkonten und 4.2-Begruendung.
    const tf = lies('native', 'TestFlight.md');
    expect(tf).toMatch(/[Ii]ntern/);
    expect(tf).toMatch(/Beta App Review/);
  });
});

test.describe('Altersfreigabe: die Stufe haengt an einer Konfigurationszeile', () => {
  test('„unrestricted web access" ist unsere Konfiguration, nicht eine Meinung', () => {
    // Apple ordnet „unrestricted web access" der Stufe 16+ zu. Bei uns trifft
    // das zu, weil die Navigation NICHT auf die eigene Domain begrenzt ist.
    // Wer das umstellt, aendert die Grundlage der Einstufung — und der Vault
    // behauptete sie danach weiter, ohne dass jemand es merkt.
    const cap = JSON.parse(lies('native', 'capacitor.config.json'));
    expect(cap.ios.limitsNavigationsToAppBoundDomains,
      'limitsNavigationsToAppBoundDomains ist nicht mehr false. Damit faellt '
      + '„unrestricted web access" weg und die dokumentierte Stufe 16+ stimmt '
      + 'womoeglich nicht mehr — App-Store.md nachziehen, bevor eingereicht wird.')
      .toBe(false);

    const vault = lies('vault', '40-Governance', 'Legal', 'App-Store.md');
    expect(vault, 'die Stufe 16+ ist nicht dokumentiert').toMatch(/\b16\+/);
    expect(vault, 'die Begruendung nennt die Konfigurationszeile nicht')
      .toContain('limitsNavigationsToAppBoundDomains');
  });

  test('die Unterlagen wissen, dass 17+ abgeschafft ist', () => {
    // Positiv geprueft, nicht negativ: ein `not.toContain('17+')` faende den
    // eigenen Erklaertext, der die alte Stufe ja nennen MUSS, um sie zu
    // korrigieren. Dieselbe Falle wie beim Umlaut in den Entitlements.
    const vault = lies('vault', '40-Governance', 'Legal', 'App-Store.md');
    expect(vault, 'die Umstellung des Rasters ist nicht vermerkt')
      .toMatch(/4\+[^\n]*9\+[^\n]*13\+[^\n]*16\+[^\n]*18\+/);
  });
});
