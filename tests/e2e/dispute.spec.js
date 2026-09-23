// Chargebacks hatten im ganzen Code keinen Empfaenger.
//
// Am 23.09.2026 gezaehlt: `dispute`, `charge.dispute` und `chargeback` kamen
// in PHP, JS und HTML zusammen NULL Mal vor. Bei einer Destination Charge
// zieht Stripe den Betrag vom PLATTFORMKONTO ein, waehrend der Dienstleister
// seine Auszahlung behaelt — der Betreiber trug den Verlust bereits und
// erfuhr nichts davon.
//
// WAS HIER GEBAUT IST, UND WAS AUSDRUECKLICH NICHT. Festgehalten und
// gemeldet wird; zurueckgeholt wird NICHTS. Ob vom Dienstleister etwas
// zurueckverlangt wird, ist eine AGB-Frage und gehoert dem Inhaber —
// dieselbe Regel wie beim Storno, wo die Frist eine Zustaendigkeit erzeugt
// und keine Zahlung.
//
// Gemessen wird im echten PHP. Eine Wache, die nur GELESEN wird, ist nicht
// geprueft.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { phpOhneKommentare } = require('./lib/php-code');

const WURZEL = path.join(__dirname, '..', '..');
const PRUEFSTAND = path.join(__dirname, 'dispute.php');
const BOOKING = path.join(WURZEL, 'includes', 'booking.php');
const FUNCTIONS = path.join(WURZEL, 'functions.php');

/** Faehrt die Faelle im echten PHP. */
function fahre(faelle) {
  const r = spawnSync('php', [PRUEFSTAND], {
    input: JSON.stringify(faelle), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  expect(r.status, `Pruefstand brach ab:\n${r.stderr}`).toBe(0);
  // Exit 0 ist hier NICHT genug. `booking.php` traegt den WordPress-Waechter
  // `if ( ! defined( 'ABSPATH' ) ) exit;` — der steigt mit Status 0 aus. Ohne
  // diese Pruefung sah der Pruefstand erfolgreich aus und lieferte nichts,
  // und der Fehler kam erst als unverstaendlicher JSON-Parse-Fehler heraus.
  expect(r.stdout.trim().length, 'Pruefstand lieferte NICHTS bei Exit 0 — '
    + `Waechter am Dateikopf?\nstderr: ${r.stderr}`).toBeGreaterThan(0);
  return JSON.parse(r.stdout);
}

function dispute(over = {}) {
  return Object.assign({
    id: 'dp_1',
    payment_intent: 'pi_abc123',
    status: 'needs_response',
    amount: 45000,
    currency: 'eur',
    reason: 'product_not_received',
    evidence_details: { due_by: 1790000000 },
  }, over);
}

test.describe('Chargeback: festhalten und melden, kein Geld bewegen', () => {
  test('ein Dispute wird wirklich festgehalten', () => {
    const [, , stand] = fahre([
      { op: 'reset' },
      { op: 'dispute', objekt: dispute() },
      { op: 'stand', pi: 'pi_abc123' },
    ]);
    // Gegenprobe zuerst: ohne sie bestuende alles Weitere auch an einer
    // Funktion, die gar nichts schreibt.
    expect(stand.disputes.length, 'nichts festgehalten').toBe(1);
    expect(stand.disputes[0].id).toBe('dp_1');
    expect(stand.disputes[0].amount).toBe(45000);
    expect(stand.disputes[0].status).toBe('needs_response');
  });

  test('ein Dispute landet NICHT unter den Erstattungen', () => {
    // Ihn dorthin zu schreiben liesse das Board "erstattet" sagen, waehrend
    // der Ausgang offen ist — und ein gewonnener bringt das Geld zurueck.
    const [, , , stand] = fahre([
      { op: 'reset' },
      { op: 'dispute', objekt: dispute() },
      { op: 'refund', objekt: { id: 're_1', payment_intent: 'pi_abc123', status: 'succeeded', amount: 100 } },
      { op: 'stand', pi: 'pi_abc123' },
    ]);
    expect(stand.disputes.length).toBe(1);
    expect(stand.refunds.length).toBe(1);
    expect(stand.refunds.map((r) => r.id), 'der Dispute steht unter den Erstattungen')
      .not.toContain('dp_1');
  });

  test('ohne payment_intent wird nichts geschrieben', () => {
    const [, , stand] = fahre([
      { op: 'reset' },
      { op: 'dispute', objekt: dispute({ payment_intent: '' }) },
      { op: 'stand', pi: 'pi_abc123' },
    ]);
    expect(stand.schluessel, 'ein Dispute ohne Zahlung wurde abgelegt').toEqual([]);
  });

  test('ein geschlossener Ausgang wird nicht zurueckgedreht', () => {
    // Webhooks kommen nicht in Reihenfolge. Ein verspaetetes `created` darf
    // einen gewonnenen Fall nicht wieder auf "needs_response" setzen.
    const [, , , stand] = fahre([
      { op: 'reset' },
      { op: 'dispute', objekt: dispute({ status: 'won' }) },
      { op: 'dispute', objekt: dispute({ status: 'needs_response' }) },
      { op: 'stand', pi: 'pi_abc123' },
    ]);
    expect(stand.disputes[0].status, 'ein gewonnener Fall wurde zurueckgedreht').toBe('won');
  });

  test('ein Endzustand darf einen anderen Endzustand ersetzen', () => {
    // Gegenprobe zur Regel darueber: sonst waere "aendere nach dem ersten
    // Ereignis nie wieder etwas" eine Erklaerung, die den Test oben besteht.
    const [, , , stand] = fahre([
      { op: 'reset' },
      { op: 'dispute', objekt: dispute({ status: 'needs_response' }) },
      { op: 'dispute', objekt: dispute({ status: 'lost' }) },
      { op: 'stand', pi: 'pi_abc123' },
    ]);
    expect(stand.disputes[0].status).toBe('lost');
  });

  test('genau EINE Meldung je Dispute, auch bei vielen Ereignissen', () => {
    const [, , , , stand] = fahre([
      { op: 'reset' },
      { op: 'dispute', objekt: dispute({ status: 'needs_response' }) },
      { op: 'dispute', objekt: dispute({ status: 'under_review' }) },
      { op: 'dispute', objekt: dispute({ status: 'lost' }) },
      { op: 'stand', pi: 'pi_abc123' },
    ]);
    expect(stand.mails.length, 'eine Mail je Ereignis — das liest nach dem dritten Mal niemand')
      .toBe(1);
  });

  test('die Meldung nennt Betrag, Zahlung und die Beweisfrist', () => {
    // Eine Chargeback-Meldung ohne Frist sagt dem Betreiber nicht, wie lange
    // er Zeit hat — und nach Ablauf entscheidet die Bank ohne uns.
    const [, , stand] = fahre([
      { op: 'reset' },
      { op: 'dispute', objekt: dispute() },
      { op: 'stand', pi: 'pi_abc123' },
    ]);
    const m = stand.mails[0];
    expect(m.an).toBe('betrieb@example.test');
    expect(m.text).toContain('450,00 EUR');
    expect(m.text).toContain('pi_abc123');
    expect(m.text, 'die Beweisfrist fehlt').toMatch(/Beweise bis\s*:\s*\d{2}\.\d{2}\.\d{4}/);
    expect(m.text, 'der Grund fehlt').toContain('product_not_received');
  });

  test('scheitert die Mail, gilt der Dispute nicht als gemeldet', () => {
    // Sonst verschluckt ein einzelner SMTP-Aussetzer die einzige Meldung,
    // die es je gibt.
    const [, , stand] = fahre([
      { op: 'reset', mail_faellt_aus: true },
      { op: 'dispute', objekt: dispute() },
      { op: 'stand', pi: 'pi_abc123' },
    ]);
    expect(stand.mails.length).toBe(0);
    expect(stand.disputes[0].gemeldet_at, 'als gemeldet gebucht, obwohl nichts ankam').toBe(0);
  });

  test('der Empfaenger bewegt KEIN Geld', () => {
    // Der Kern. Ein Chargeback hat das Geld bereits bewegt; automatisch vom
    // Dienstleister zurueckzuholen waere eine Geldentscheidung ohne Menschen.
    // Gemessen nach Abzug der Kommentare — die Begruendung daneben nennt
    // "reverse_transfer" und "Erstattung" im Klartext.
    const code = phpOhneKommentare(BOOKING);
    const ab = code.indexOf('function eb_booking_record_dispute');
    expect(ab, 'die Funktion gibt es nicht').toBeGreaterThan(-1);
    const rest = code.slice(ab);
    const bis = rest.indexOf('\nfunction eb_booking_lock');
    const rumpf = bis > -1 ? rest.slice(0, bis) : rest;

    for (const verboten of ['api.stripe.com', 'reverse_transfer', 'eb_stripe_api', 'curl_init', 'refund_application_fee']) {
      expect(rumpf, `der Empfaenger ruft ${verboten} — er darf kein Geld bewegen`)
        .not.toContain(verboten);
    }
  });

  test('der Webhook ruft den Empfaenger wirklich', () => {
    // Ein Empfaenger ohne Zweig ist genau die Klasse, aus der dieser Befund
    // stammt. Gemessen nach Abzug der Kommentare.
    const code = phpOhneKommentare(FUNCTIONS);
    for (const ev of ['charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed']) {
      expect(code, `${ev} hat keinen case`).toContain(`case '${ev}':`);
    }
    expect(code, 'der case ruft eb_booking_record_dispute nicht')
      .toContain('eb_booking_record_dispute( $obj );');
  });

  test('die Abrechnung liefert die Disputes aus', () => {
    // Ohne diesen Weg sieht sie niemand ausser im Mailpostfach.
    const code = phpOhneKommentare(FUNCTIONS);
    expect(code, "der Abrechnungs-Endpunkt fuehrt 'disputes' nicht")
      .toMatch(/'disputes'\s*=>\s*array_values\(\s*get_option\(\s*'eb_booking_dispute_'/);
  });

  test('das Tor kennt die drei neuen Ereignisse', async () => {
    // Sie sind bei Stripe noch NICHT abonniert. Genau das soll
    // stripe-webhook.mjs melden — ein Empfaenger ohne Ereignis ist ein
    // toter Zweig, und das Tor existiert, um das sichtbar zu machen.
    const M = await import('file://' + path.join(WURZEL, 'scripts', 'stripe-webhook.mjs'));
    const behandelt = M.behandelteEreignisseAusDatei();
    for (const ev of ['charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed']) {
      expect(behandelt, `${ev} wird vom Tor nicht gesehen`).toContain(ev);
    }
    // Und sie stehen NICHT in OHNE_ABO: sie sollen abonniert werden.
    for (const ev of ['charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed']) {
      expect(Object.keys(M.OHNE_ABO), `${ev} ist als "bewusst ohne Abo" eingetragen`)
        .not.toContain(ev);
    }
  });

  test('der Pruefstand fasst die Datenbank nicht an', () => {
    // Gegenprobe auf die Attrappe: sie bricht bei jeder Abfrage ab. Liefe
    // eine, waere der Lauf mit Exit 3 gescheitert — die Tests oben belegen
    // also mit, dass der Empfaenger ohne $wpdb auskommt.
    const quelle = fs.readFileSync(PRUEFSTAND, 'utf8');
    expect(quelle, 'die Attrappe laesst Abfragen stillschweigend durch')
      .toContain('Unerwartete DB-Abfrage');
  });
});
