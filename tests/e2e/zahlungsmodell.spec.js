// Das Zahlungsmodell der Rechtstexte muss das sein, das der Code fährt.
//
// Gefunden am 22.09.2026 beim Durchgehen des Unternehmens für die
// UG-Gründung. Das Impressum sagte „Direct-Charges-Modell", der Code fährt
// seit jeher Destination Charges mit `on_behalf_of` und `application_fee`.
//
// DAS IST KEIN FALSCHES WORT. Der Satz im Impressum ist die BEGRÜNDUNG
// dafür, dass wir keine ZAG-Erlaubnis brauchen, und diese Begründung hängt
// daran, auf wessen Konto die Zahlung entsteht: bei Direct Charges auf dem
// des Dienstleisters, bei Destination Charges auf unserem. Eine Plattform,
// die ihre Erlaubnisfreiheit mit einem Sachverhalt begründet, den es bei ihr
// nicht gibt, hat keine Begründung.
//
// Die AGB sagten es die ganze Zeit RICHTIG (§ 2 der Dienstleister-AGB:
// „Stripe Connect Express mit Destination Charges und Application Fee").
// Zwei Rechtstexte derselben Plattform, derselbe Geldweg, zwei
// Beschreibungen — und nur eine traf den Code. Zwei gepflegte Fassungen
// derselben Sache driften immer; diese war bereits gedriftet.
//
// GEMESSEN WIRD DER CODE, NICHT EINE LISTE. Welches Modell wir fahren,
// entscheiden die Felder, die an Stripe gehen — nicht ein Wort in einer
// Konstanten, das jemand umbenennen kann, ohne an diese Datei zu denken:
//
//   transfer_data[destination] + application_fee_amount  → Destination Charge
//   Stripe-Account-Header beim Anlegen                   → Direct Charge
//
// Erst danach wird gefragt, ob die Rechtstexte dasselbe sagen.
//
// WARUM DIESES TOR BLOCKIEREN DARF: Bis zum 22.09.2026 hätte es das nicht
// gedurft — der Widerspruch war von keinem einzelnen Commit behebbar, er
// brauchte eine Entscheidung des Inhabers. Seit die Texte stimmen, ist jede
// künftige Abweichung genau das: im selben Commit behebbar. Das ist die
// Regel aus recht.mjs, nicht eine Vorliebe.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { phpOhneKommentare } = require('./lib/php-code');
const { textAusHtml } = require('./lib/html-text');

const WURZEL = path.join(__dirname, '..', '..');
const FUNCTIONS = path.join(WURZEL, 'functions.php');
const SHELL = path.join(WURZEL, 'app-shell.html');

/** Der Rumpf der Funktion, die den echten Kundenweg bezahlt. */
function kundenZahlweg() {
  const code = phpOhneKommentare(FUNCTIONS);
  const ab = code.indexOf('function eb_stripe_create_payment_intent');
  expect(ab, 'eb_stripe_create_payment_intent() gibt es nicht mehr — '
    + 'dieses Tor hat sein Subjekt verloren').toBeGreaterThan(-1);
  // Bis zur nächsten Funktion auf oberster Ebene.
  const rest = code.slice(ab + 1);
  const bis = rest.search(/\nfunction\s/);
  return bis > -1 ? rest.slice(0, bis) : rest;
}

/**
 * Welches Connect-Modell beschreibt dieser Funktionsrumpf?
 *
 * Nimmt den Rumpf als ARGUMENT, nicht aus der Datei. Die erste Fassung las
 * selbst — und die Mutation „gib immer destination zurück" überlebte alle
 * sechs Tests, weil daneben ohnehin direkt auf die Felder geprüft wird. Eine
 * Wache, deren Ausgabe nichts ändert, ist eine Behauptung; dieselbe Klasse
 * wie ebAuftragSchluessel(), das hinter seiner Gruppierung nichts mehr
 * entschied. Mit einem Argument ist sie an gestellten Rümpfen messbar.
 */
function modellAus(rumpf) {
  const ziel = /transfer_data\[destination\]/.test(rumpf);
  const gebuehr = /application_fee_amount/.test(rumpf);
  const direkt = /Stripe-Account\s*:/i.test(rumpf);
  if (direkt && !ziel) return 'direct';
  if (ziel && gebuehr) return 'destination';
  return 'unbekannt';
}

/** Welches Connect-Modell fährt der Kundenweg wirklich? */
function gemessenesModell() {
  return modellAus(kundenZahlweg());
}

/** Der sichtbare Text einer Rechtsseite, ohne Markup. */
function seitenText(id) {
  const roh = fs.readFileSync(SHELL, 'utf8');
  const ab = roh.indexOf(`id="page-${id}"`);
  expect(ab, `die Seite page-${id} gibt es nicht`).toBeGreaterThan(-1);
  const rest = roh.slice(ab);
  const bis = rest.search(/id="page-(?!\{)/g) > 0 ? rest.slice(1).search(/id="page-/) : -1;
  return textAusHtml(bis > -1 ? rest.slice(0, bis + 1) : rest);
}

test.describe('Das Zahlungsmodell der Rechtstexte ist das des Codes', () => {
  test('die Modell-Erkennung unterscheidet wirklich', () => {
    // Das Subjekt der Wache, an gestellten Rümpfen. Ohne diesen Test
    // überlebte „gib immer destination zurück" die ganze Suite — nachgemessen
    // am 22.09.2026, alle sechs anderen blieben grün.
    expect(modellAus("$f['transfer_data[destination]'] = $c; "
      + "$f['application_fee_amount'] = 100;")).toBe('destination');
    expect(modellAus("$headers[] = 'Stripe-Account: ' . $connect_id;")).toBe('direct');
    // Ziel ohne Gebühr ist KEIN vollständiges Destination-Modell: ohne
    // application_fee bekämen wir keine Provision, und die AGB sagten etwas
    // anderes als der Code.
    expect(modellAus("$f['transfer_data[destination]'] = $c;")).toBe('unbekannt');
    expect(modellAus('$f = array();')).toBe('unbekannt');
  });

  test('der Kundenweg fährt ein erkennbares Connect-Modell', () => {
    // Gegenprobe zuerst: ohne sie wäre jede Aussage unten über "unbekannt"
    // erfüllbar, und das Tor hätte kein Subjekt.
    expect(gemessenesModell(),
      'weder Destination- noch Direct-Charge erkennbar — das Tor kann nichts halten')
      .not.toBe('unbekannt');
  });

  test('gemessen wird Destination Charge mit Application Fee', () => {
    const rumpf = kundenZahlweg();
    expect(rumpf).toContain('transfer_data[destination]');
    expect(rumpf).toContain('application_fee_amount');
    // on_behalf_of setzt den Dienstleister als Settlement-Merchant. Das ist
    // die Zeile, an der die ZAG-Argumentation wirklich hängt — fällt sie weg,
    // ändert sich der Sachverhalt, den das Impressum beschreibt.
    expect(rumpf, 'on_behalf_of fehlt — der Dienstleister wäre nicht mehr '
      + 'Zahlungsempfänger, und die Aussage im Impressum wäre wieder falsch')
      .toContain('on_behalf_of');
    expect(gemessenesModell()).toBe('destination');
  });

  test('das Impressum nennt genau dieses Modell', () => {
    const text = seitenText('impressum');
    expect(text, 'das Impressum spricht nicht über den Zahlungsweg').toMatch(/Stripe/);
    expect(text, 'das Impressum nennt das Zahlungsmodell nicht')
      .toMatch(/Destination Charge/i);
  });

  test('das Impressum behauptet kein Direct-Charge-Modell mehr', () => {
    // Der eigentliche Befund. Gemessen am SICHTBAREN Text, nicht am Markup:
    // ein Wort im Attribut ist keine Aussage an den Leser.
    const text = seitenText('impressum');
    expect(text, 'das Impressum begründet die ZAG-Freiheit wieder mit einem '
      + 'Sachverhalt, den der Code nicht herstellt')
      .not.toMatch(/Direct[- ]Charge/i);
  });

  test('Impressum und AGB widersprechen sich nicht', () => {
    // Die Drift, um die es geht: NUR die AGB hatten es richtig. Wer künftig
    // eine der beiden Seiten ändert, muss die andere mitnehmen.
    const impressum = seitenText('impressum');
    const agb = seitenText('agb-dienstleister');
    for (const [name, text] of [['Impressum', impressum], ['AGB-Dienstleister', agb]]) {
      expect(text, `${name} nennt Destination Charges nicht`).toMatch(/Destination Charge/i);
      expect(text, `${name} nennt wieder ein Direct-Charge-Modell`)
        .not.toMatch(/Direct[- ]Charge/i);
    }
  });

  test('der Admin-Testweg bleibt ausgenommen, ist aber wirklich einer', () => {
    // functions.php trägt EINEN Direct-Charge-Pfad. Er ist kein Kundenweg —
    // aber „ist ein Testweg" darf keine Behauptung sein, sonst wäre die
    // Ausnahme der bequeme Weg, einen echten zweiten Geldweg zu verstecken.
    const code = phpOhneKommentare(FUNCTIONS);
    const stelle = code.indexOf('[ADMIN-TEST]');
    expect(stelle, 'der Direct-Charge-Pfad ist nicht mehr als Testweg '
      + 'gekennzeichnet — dann ist er ein zweiter Kundenweg').toBeGreaterThan(-1);
  });
});
