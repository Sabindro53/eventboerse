// Kontaktschutz im Chat — verhandeln ja, an der Plattform vorbei nein.
//
// ── WARUM DER KORPUS DIE ZUSICHERUNG IST ───────────────────────────────
//
// Eine Liste regulaerer Ausdruecke zu lesen sagt nichts darueber, was sie
// trifft. Der Filter stand seit jeher im Code und war nie gemessen; am
// 13.09.2026 zum ersten Mal an Saetzen gefahren, kam heraus:
//
//   | | blockiert (soll) | sauber durch (darf) |
//   |---|---|---|
//   | vorher | 15/22 | 26/32 — SECHS Fehlalarme |
//   | jetzt  | 22/22 | 32/32 |
//
// Die sechs Fehlalarme waren Rechnungs-, Angebots-, Bestell-, Kunden- und
// Seriennummern sowie ein IBAN-Fragment: neunstellige Zahlen ohne jeden
// Telefonbezug. Das ist die gefaehrlichere Haelfte — ein Filter, der die
// Rechnungsnummer blockiert, wird abgeschaltet, und dann schuetzt er gar
// nichts mehr.
//
// ── WAS HIER BEWUSST NICHT BLOCKIERT WIRD ──────────────────────────────
//
// „Meine Handynummer schicke ich dir gleich als Bild" enthaelt KEINE
// Kontaktdaten. Der Satz steht unten unter `durch`, nicht unter `blocken`.
// Kein Textfilter verhindert den Kontakt ausserhalb der Plattform; er
// verteuert den bequemen Weg. Wer diesen Fall nach `blocken` verschiebt,
// verlangt vom Filter etwas, das er nur durch Fehlalarme erreichen kann.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const WURZEL = path.join(__dirname, '..', '..');
const HARNISCH = path.join(__dirname, 'kontaktschutz.php');
const QUELLE = path.join(WURZEL, 'includes', 'chat', 'kontaktschutz.php');

/** Soll blockiert werden — der Nutzer will an der Plattform vorbei. */
const BLOCKEN = {
  'E-Mail, klar':          'Schreib mir an max.mueller@gmail.com',
  'E-Mail (at)':           'max.mueller (at) gmail punkt com',
  'E-Mail [at]':           'max [at] firma.de',
  'E-Mail mit Leerzeichen':'max . mueller @ gmail . com',
  'Freemail ohne @':       'max.mueller.gmail.com',
  'Anbieter genannt':      'Meine Kontaktdaten stehen auf gmx.de unter meinem Namen',
  'Telefon 0171':          'Meine Nummer ist 0171 2345678',
  'Telefon +49':           'Ruf an: +49 171 2345678',
  'Telefon zerhackt':      'Nummer: 0 1 7 1 / 2 3 4 5 6 7 8',
  'Telefon ohne Null':     'Erreichst du mich unter 171 2345678?',
  'Telefon Kontextwort':   'Mein Festnetz: 221 9876543',
  'Ziffern ausgeschrieben':'null eins sieben eins zwo drei vier fuenf sechs sieben acht',
  'Buchstaben statt Ziffern':'Meine Nummer: O171 234S678',
  'Vollbreiten-Ziffern':   'Nummer: ０１７１２３４５６７８',
  'WhatsApp':              'Schreib mir einfach auf WhatsApp',
  'Messenger-Kuerzel':     'Meld dich per WA, geht schneller',
  'Instagram':             'Findest du auf Instagram',
  '@Handle':               'Mein Handle: @maxmueller, du weisst schon wo',
  'URL':                   'Mehr auf https://meine-firma.de',
  'URL ohne Schema':       'Schau auf www.meine-firma.de',
  'Anschrift':             'Komm vorbei in der Hauptstraße 12',
  'PLZ und Ort':           'Wir sind in 50667 Köln',
};

/** Darf NICHT blockiert werden — normale Verhandlung im Marktplatz. */
const DURCH = {
  'Preis':            'Ich kann Ihnen 1200 Euro anbieten.',
  'Datum und Zeit':   'Das Event ist am 15.08.2026 von 14:00 bis 22:00 Uhr.',
  'Gaestezahl':       'Wir erwarten 120 Gäste, ist das machbar?',
  'Budget':           'Unser Budget liegt bei 2500-3000 EUR.',
  'Verhandlung':      'Bei 8 Stunden Einsatz und 2 Aufbaustunden waeren 950 okay?',
  'Rechnungsnummer':  'Die Rechnungsnummer lautet RE-2026-00841.',
  'Angebotsnummer':   'Angebot A-2026-115533 habe ich dir ins Board gelegt.',
  'Bestellnummer':    'Bestellnr. 2026001234 ist raus.',
  'Kundennummer':     'Meine Kundennummer bei euch ist 100200300.',
  'Seriennummer':     'Seriennummer 4820394857 steht auf dem Geraet.',
  'IBAN-Fragment':    'Verwendungszweck DE89-3704-0044 steht auf der Rechnung.',
  'Artikelnummer':    'Die Lichtanlage ist Modell LS-4000-2200.',
  'Stadtname':        'Die Location ist in Köln, mitten in der Altstadt.',
  'Uhrzeiten':        'Aufbau 12:00, Start 16:00, Ende 23:30.',
  'Uhrzeit mit Sek.': 'Von 18:00:00 bis 02:00:00 durchgehend Musik.',
  'Prozent':          'Koennen wir uns auf 10 Prozent Anzahlung einigen?',
  'Kapazitaet':       'Der Saal fasst 250 Personen auf 400 Quadratmetern.',
  'Bandbreite':       'Zwischen 15 und 20 Tische, je nach Zusage.',
  'Jahreszahlen':     'Die Veranstaltung laeuft von 2026 bis 2027 jaehrlich.',
  'Zahlen im Text':   'Wir hatten 2024 rund 350 Gaeste, 2025 waren es 480.',
  'Preisliste':       'Paket A 1490, Paket B 2390, Paket C 3190 Euro.',
  'Kilometer':        'Anfahrt sind 120 km, das sind 2 Stunden.',
  'Zahlwoerter kurz': 'Wir brauchen vier Kellner, zwei Barkeeper und drei Tische.',
  'Zahlwort-Aufzaehlung':'Erst eins, dann zwei, dann drei — so läuft der Abend ab.',
  'Wortcode':         'Der Saalcode lautet SOLO und der Schluessel liegt bereit.',
  'Mischtoken':       'Modell IS1000 und OS2000 stehen zur Wahl.',
  'Solisten':         'Wir haben Solisten und Saxofonisten im Programm.',
  '@home':            'Die Band spielt @home Sessions, kennst du die?',
  'Web als Wort':     'Ich schaue nachher im Web nach dem Termin.',
  'at als Wort':      'Die Band spielt at home sessions, kennst du die?',
  'Hausnummer spaeter':'Die Hausnummer teile ich nach der Buchung mit.',
  // DER EHRLICHE FALL: kein Kontaktdatum im Satz, also nichts zu blocken.
  // Er steht hier und nicht oben, weil ein Filter, der ihn faengt, nur
  // ueber Fehlalarme dorthin kaeme.
  'Ankuendigung ohne Daten':'Meine Handynummer schicke ich dir gleich als Bild',
};

/** Fuehrt den echten PHP-Filter ueber eine Liste von Texten. */
function filtern(texte) {
  const aus = execFileSync('php', [HARNISCH], {
    input: JSON.stringify(texte),
    encoding: 'utf8',
  });
  const erg = JSON.parse(aus);
  expect(erg.length, 'der Prüfstand hat nicht für jeden Text geantwortet')
    .toBe(texte.length);
  return erg;
}

test.describe('Kontaktschutz: verhandeln ja, vorbei nein', () => {
  test('der Prüfstand führt den echten Quelltext aus', () => {
    // GEGENPROBE. Ohne sie könnte die Datei fehlen oder leer sein und alle
    // folgenden Tests wären still grün — ein Filter, den niemand ausführt,
    // ist dieselbe Klasse wie ein Prüfer ohne Subjekt.
    expect(fs.existsSync(QUELLE), 'includes/chat/kontaktschutz.php fehlt')
      .toBe(true);
    const [a, b] = filtern(['max@gmail.com', 'Ich kann 1200 Euro anbieten.']);
    expect(a, 'eine klare E-Mail kommt durch — der Prüfstand misst nichts')
      .toBe(true);
    expect(b, 'ein Preis wird blockiert — der Prüfstand meldet immer true')
      .toBe(false);
  });

  test('jeder Umgehungsversuch mit Kontaktdaten wird blockiert', () => {
    const namen = Object.keys(BLOCKEN);
    const erg = filtern(namen.map((n) => BLOCKEN[n]));
    const durchgerutscht = namen.filter((n, i) => !erg[i]);
    expect(durchgerutscht, `diese Nachrichten tragen Kontaktdaten und kämen `
      + `durch: ${durchgerutscht.join(', ')}`).toEqual([]);
  });

  test('kein ehrlicher Verhandlungssatz wird blockiert', () => {
    // DIE GEFÄHRLICHERE HÄLFTE. Ein Filter, der die Rechnungsnummer
    // blockiert, wird abgeschaltet — und schützt danach gar nichts mehr.
    const namen = Object.keys(DURCH);
    const erg = filtern(namen.map((n) => DURCH[n]));
    const fehlalarm = namen.filter((n, i) => erg[i]);
    expect(fehlalarm, `diese Nachrichten sind harmlos und würden abgewiesen: `
      + `${fehlalarm.join(', ')}`).toEqual([]);
  });

  test('eine neunstellige Zahl allein ist keine Rufnummer', () => {
    // Der Kern der Fehlalarm-Behebung, einzeln festgehalten: entscheidend
    // ist die FORM (0 oder + voran) oder ein Telefon-Kontextwort — nicht
    // die Stellenzahl. Wer das aufweicht, holt sechs Fehlalarme zurück.
    const [ohne, mitNull, mitWort] = filtern([
      'Vorgang 2026001234 ist abgeschlossen.',
      'Vorgang 02026001234 ist abgeschlossen.',
      'Mein Handy: 2026001234',
    ]);
    expect(ohne, 'eine blanke neunstellige Zahl gilt als Rufnummer').toBe(false);
    expect(mitNull, 'eine Zahl mit führender Null gilt nicht als Rufnummer').toBe(true);
    expect(mitWort, 'eine Zahl mit „Handy" davor gilt nicht als Rufnummer').toBe(true);
  });

  test('fremde Ziffernschriften werden vorher auf ASCII gebracht', () => {
    // Ohne die Normierung umgeht EINE Vollbreiten-Ziffer den gesamten
    // Telefon-Zweig. Geprüft wird an mehreren Schriften, nicht an einer:
    // eine Normierung, die nur eine Familie kennt, sieht vollständig aus.
    const erg = filtern([
      'Nummer: ０１７１２３４５６７８',
      'Nummer: ٠١٧١٢٣٤٥٦٧٨',
      'Nummer: ۰۱۷۱۲۳۴۵۶۷۸',
    ]);
    expect(erg, 'eine fremde Ziffernschrift kommt ungehindert durch')
      .toEqual([true, true, true]);
  });

  test('der Filter wird im Nachrichtenweg wirklich gerufen', () => {
    // DIE TEURSTE LÜCKE WÄRE EIN PERFEKTER FILTER, DEN NIEMAND RUFT.
    // Dieselbe Klasse wie der tote Gitleaks-Scan und wie der Stripe-Lader,
    // dessen Weg hinein zugesperrt war: der Baustein ist geprüft, und das
    // sagt nichts über seine Erreichbarkeit.
    const fn = fs.readFileSync(path.join(WURZEL, 'functions.php'), 'utf8');
    // Gesucht wird die EINBINDUNG, nicht der Pfad irgendwo in der Datei.
    // Der erste Entwurf prüfte auf das blosse Vorkommen des Pfades — und
    // überlebte die Mutation „require_once entfernt", weil zwanzig Zeilen
    // weiter ein erklärender Kommentar denselben Pfad nennt. Genau der
    // Griff, an dem in diesem Projekt schon vier Prüfungen gescheitert
    // sind: das Muster traf das Wort im Kommentar statt die Zeile im Code.
    expect(fn, 'functions.php bindet includes/chat/kontaktschutz.php nicht per '
      + 'require ein — dann ist die Funktion im Betrieb undefiniert und PHP '
      + 'bricht bei JEDER Nachricht ab')
      .toMatch(/require(?:_once)?[^;\n]*includes\/chat\/kontaktschutz\.php/);

    const send = fn.slice(fn.indexOf('function eb_messages_send'));
    const rumpf = send.slice(0, send.indexOf("\n}"));
    expect(rumpf, 'eb_messages_send ruft den Kontaktschutz nicht — der Filter '
      + 'wäre dann gebaut, geprüft und wirkungslos')
      .toMatch(/eb_message_contains_off_platform_contact/);
    expect(rumpf, 'ein Treffer führt zu keiner abweisenden Antwort')
      .toMatch(/off_platform_contact/);
  });

  test('die Abweisung sagt, was zu tun ist', () => {
    // Eine Nachricht, die ohne Grund nicht ankommt, liest sich als Störung.
    // Der Text muss benennen, was gemeint ist, sonst probiert der Nutzer es
    // dreimal und geht dann zum Telefon.
    const fn = fs.readFileSync(path.join(WURZEL, 'functions.php'), 'utf8');
    const i = fn.indexOf("'off_platform_contact'");
    expect(i, 'die Abweisung ist nicht auffindbar').toBeGreaterThan(0);
    const nah = fn.slice(i, i + 600);
    expect(nah, 'die Abweisung nennt nicht, welche Angaben gemeint sind')
      .toMatch(/E-Mail|Telefon/i);
    expect(nah, 'die Abweisung nennt keinen Weg, der stattdessen geht')
      .toMatch(/Chat|Plattform|Buchung/i);
  });
});
