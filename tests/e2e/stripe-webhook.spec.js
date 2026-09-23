// Hört Stripe auf das, was der Code behandelt?
//
// Am 23.09.2026 am Live-Konto gemessen: der Endpunkt führte ZWEI Ereignisse,
// der Code behandelt ZEHN. Acht `case`-Zweige waren unerreichbar — darunter
// `eb_booking_record_refund()`, das in includes/booking.php ausdrücklich für
// signierte Webhooks gebaut ist („signed webhooks refresh rather than invent
// settlement") und sorgfältig verhindert, dass ein verspätetes
// `refund.created` ein bestätigtes Ergebnis zurückdreht.
//
// Der Empfänger war für einen Webhook gebaut, den nie jemand abonniert hat.
// Eine Erstattung aus dem Stripe-Dashboard bewegte damit Geld und erreichte
// das Board nie.
//
// DIESELBE KLASSE WIE DER TOTE GITLEAKS-SCAN, auf dem Geldweg: der Prüfer ist
// da, er ist richtig, und sein Subjekt erreicht ihn nicht.
//
// Gemessen wird hier die BEDINGUNG, nicht der Einzelfall — die Abo-Liste
// liegt bei Stripe und ändert sich, ohne dass jemand eine Datei anfasst.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SKRIPT = path.join(__dirname, '..', '..', 'scripts', 'stripe-webhook.mjs');

let M;
test.beforeAll(async () => {
  M = await import('file://' + SKRIPT);
});

/** Eine PHP-Attrappe mit eigenem Webhook-Rumpf. */
function attrappe(rumpf) {
  const datei = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ebwh-')), 'f.php');
  fs.writeFileSync(datei, `<?php\nfunction eb_stripe_webhook( $r ) {\n  switch ( $t ) {\n${rumpf}\n  }\n}\n\nfunction danach() { }\n`);
  return datei;
}

test.describe('Stripe-Webhook: jeder Empfänger hat sein Ereignis', () => {
  test('Gegenprobe: der Auszug findet die echten Ereignisse', () => {
    // Ohne diesen Test bestünde alles Weitere auch an einer leeren Liste —
    // ein Prüfer ohne Subjekt gibt eine Entwarnung, die er nicht decken kann.
    const e = M.behandelteEreignisseAusDatei();
    expect(e.length, 'der Webhook-Rumpf wurde nicht gefunden').toBeGreaterThanOrEqual(8);
    expect(e).toContain('payment_intent.succeeded');
    expect(e).toContain('refund.created');
    expect(e).toContain('charge.updated');
  });

  test('ein case im KOMMENTAR zählt nicht', () => {
    // Die elfte Fundstelle dieser Klasse wäre hier fast entstanden: das
    // Skript nennt `case 'refund.created':` in seinem eigenen Kopfkommentar.
    const datei = attrappe(
      "    case 'refund.created':\n"
      + "      break;\n"
      + "    // frueher stand hier case 'charge.refunded':\n"
      + "    /* und im Block: case 'payout.failed': */\n"
    );
    const e = M.behandelteEreignisseAusDatei(datei);
    expect(e, 'der echte Zweig fehlt').toContain('refund.created');
    expect(e, 'ein Zeilenkommentar wurde mitgezaehlt').not.toContain('charge.refunded');
    expect(e, 'ein Blockkommentar wurde mitgezaehlt').not.toContain('payout.failed');
  });

  test('der Rumpf ist begrenzt — nicht die ganze Datei', () => {
    // Ein Subjekt, das zu weit ist, liegt genauso falsch wie eines, das zu
    // eng ist. `case '…'` kommt in einer 10 000-Zeilen-Datei auch anderswo vor.
    const datei = attrappe("    case 'refund.created':\n      break;\n");
    fs.appendFileSync(datei, "\nfunction fremd() { switch ( $x ) { case 'fremd.ereignis': break; } }\n");
    const e = M.behandelteEreignisseAusDatei(datei);
    expect(e).toContain('refund.created');
    expect(e, 'ein case aus einer FREMDEN Funktion wurde mitgezaehlt')
      .not.toContain('fremd.ereignis');
  });

  test('jeder Eintrag in OHNE_ABO traegt einen Grund', () => {
    // Stilllegen heisst eintragen, nicht verschweigen. Ein leerer Grund macht
    // „vergessen" von „abgeschafft" ununterscheidbar.
    const namen = Object.keys(M.OHNE_ABO);
    expect(namen.length, 'OHNE_ABO ist leer — dann prueft der Test nichts')
      .toBeGreaterThan(0);
    for (const n of namen) {
      expect(String(M.OHNE_ABO[n] || '').trim().length,
        `${n} steht ohne Begruendung in OHNE_ABO`).toBeGreaterThan(40);
    }
  });

  test('jeder Eintrag in OHNE_ABO wird auch wirklich behandelt', () => {
    // Sonst ist der Eintrag eine Leiche: er begruendet das Fehlen eines
    // Abonnements fuer einen Zweig, den es nicht mehr gibt.
    const behandelt = M.behandelteEreignisseAusDatei();
    for (const n of Object.keys(M.OHNE_ABO)) {
      expect(behandelt, `${n} steht in OHNE_ABO, hat aber keinen case im Code`)
        .toContain(n);
    }
  });

  test('ein unerreichbarer Zweig wird gemeldet', () => {
    const r = M.vergleiche(['refund.created', 'payment_intent.succeeded'],
      ['payment_intent.succeeded']);
    expect(r.fehltAbo, 'das fehlende Abo wurde nicht gemeldet')
      .toEqual(['refund.created']);
  });

  test('ein BEGRUENDETER Zweig wird NICHT gemeldet', () => {
    // Gegenprobe. Ohne sie waere „melde immer alles" eine Erklaerung, die
    // den Test darueber ebenfalls besteht.
    const begruendet = Object.keys(M.OHNE_ABO)[0];
    const r = M.vergleiche([begruendet, 'payment_intent.succeeded'],
      ['payment_intent.succeeded']);
    expect(r.fehltAbo, `${begruendet} ist begruendet und darf nicht blockieren`)
      .toEqual([]);
  });

  test('eine VERALTETE Begruendung wird gemeldet', () => {
    // In OHNE_ABO eingetragen und trotzdem abonniert: die Aufzeichnung stimmt
    // nicht mehr. Eine veraltete Begruendung ist schlimmer als keine, weil
    // sie gelesen und geglaubt wird.
    const begruendet = Object.keys(M.OHNE_ABO)[0];
    const r = M.vergleiche([begruendet], [begruendet]);
    expect(r.stilleEntscheidung).toEqual([begruendet]);
  });

  test('ein Abo ohne Empfaenger wird gemeldet, aber blockiert nicht', () => {
    // Blockierend ist nur, was derselbe Commit beheben kann. Ein ueberzaehliges
    // Abo bei Stripe ist von hier aus nicht abstellbar — und harmlos, der
    // default-Zweig quittiert mit 200.
    const r = M.vergleiche(['payment_intent.succeeded'],
      ['payment_intent.succeeded', 'invoice.paid']);
    expect(r.ohneEmpfaenger).toEqual(['invoice.paid']);
    expect(r.fehltAbo).toEqual([]);
  });

  test('ein Stern-Abo gilt als alles abonniert', () => {
    const r = M.vergleiche(['refund.created', 'charge.updated'], ['*']);
    expect(r.fehltAbo).toEqual([]);
    expect(r.ohneEmpfaenger).toEqual([]);
  });

  test('nur ENABLED-Endpunkte auf UNSERER Route zaehlen', async () => {
    const holer = async () => ({
      ok: true,
      json: async () => ({ data: [
        { url: 'https://xn--eventbrse-57a.de' + M.WEBHOOK_PFAD, status: 'enabled',
          enabled_events: ['payment_intent.succeeded'] },
        { url: 'https://xn--eventbrse-57a.de' + M.WEBHOOK_PFAD, status: 'disabled',
          enabled_events: ['refund.created'] },
        { url: 'https://fremd.example/hook', status: 'enabled',
          enabled_events: ['charge.updated'] },
      ] }),
    });
    const a = await M.hole('PLATZHALTER-ATTRAPPE', holer);
    expect(a.abonniert, 'ein abgeschalteter oder fremder Endpunkt wurde mitgezaehlt')
      .toEqual(['payment_intent.succeeded']);
  });

  test('ohne Schluessel ist --check Exit 1, nicht still gruen', () => {
    // DER KERN. Nicht messen ist kein Bestehen — genau diese Verwechslung
    // liess den toten Gitleaks-Scan vier Monate wie Schutz aussehen.
    const env = { ...process.env };
    delete env.EB_STRIPE_READ_KEY;
    delete env.EB_STRIPE_SECRET_KEY;

    const tor = spawnSync(process.execPath, [SKRIPT, '--check'], { env, encoding: 'utf8' });
    expect(tor.status, 'ohne Schluessel wurde durchgewunken').toBe(1);
    expect(tor.stdout).toMatch(/Nicht geprüft/);

    // Gegenprobe: der reine BERICHT darf nicht blockieren, sonst waere der
    // Unterschied zwischen Bericht und Tor bedeutungslos.
    const bericht = spawnSync(process.execPath, [SKRIPT], { env, encoding: 'utf8' });
    expect(bericht.status, 'der Bericht blockiert').toBe(0);
  });

  test('der Schluessel erscheint nirgends in der Ausgabe', () => {
    // Logs sind bei einem oeffentlichen Repository oeffentlich.
    //
    // DER PRUEFSTEIN IST BEWUSST NICHT SCHLUESSELFOERMIG. Die erste Fassung
    // trug das echte Live-Praefix eines Stripe-Schluessels — erfunden, aber
    // formgleich. GitHubs Push Protection hat den Push mit GH013 abgewiesen,
    // unter Angabe von Datei und Zeile. Das ist RICHTIGES Verhalten und das
    // genaue Gegenteil des toten Gitleaks-Scans: ein Schutz, der ausloest.
    //
    // Er wurde nicht per Freigabe-Link uebergangen. Gemessen wird hier, ob
    // eine bekannte Zeichenfolge in der Ausgabe auftaucht — ihre GESTALT ist
    // dafuer belanglos. Einen Schutz zu umgehen, um einen Test ueber
    // Geheimnisse zu schreiben, waere die Gewohnheit, an der solche
    // Schutzvorrichtungen sterben.
    //
    // UND DER ERSTE ERKLAERENDE KOMMENTAR HIER WAR SELBST DER FUND: er
    // nannte das Praefix woertlich, und geheimnisse.mjs schlug darauf an.
    // Kommentarabzug waere hier die FALSCHE Antwort — anders als bei den elf
    // Faellen davor ist das Subjekt dieses Pruefers die Datei, nicht der
    // Code: ein echter Schluessel in einem Kommentar ist ein echter
    // Schluessel. Also weicht der Text, nicht der Pruefer.
    const geheim = 'PLATZHALTER-NIEMALSAUSGEBEN-0123456789';
    const env = { ...process.env, EB_STRIPE_READ_KEY: geheim };
    delete env.EB_STRIPE_SECRET_KEY;
    const r = spawnSync(process.execPath, [SKRIPT], { env, encoding: 'utf8', timeout: 40000 });
    const alles = String(r.stdout) + String(r.stderr);
    expect(alles, 'der Schluessel steht in der Ausgabe').not.toContain(geheim);
    expect(alles, 'ein Teil des Schluessels steht in der Ausgabe')
      .not.toContain('NIEMALSAUSGEBEN');
  });
});
