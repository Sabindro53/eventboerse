// Storno-Vorgang — der Weg des Planers zu seinem Geld.
//
// ── DER AUFTRAG ────────────────────────────────────────────────────────
//
// „wenn er das nicht erfüllen kann, muss er Bescheid geben und Geld
// zurückzahlen, ähnlich wie ein Pizzalieferant, der zu spät bei Lieferando
// eine bestellung bekommt … das muss immer sauber ablaufen."
//
// ── DIE ENTSCHEIDUNG, AN DER ALLES HÄNGT ───────────────────────────────
//
// EIN ANTRAG ERSTATTET NICHTS. Er ist eine Bitte mit Frist; erst die
// Annahme durch den Dienstleister bewegt Geld, und zwar über dieselbe
// Rechteregel wie bisher (`eb_erstattung_darf`). Der Planer bekommt einen
// VORGANG, keinen Knopf auf fremdes Geld — genau daran ist die alte
// Fassung gescheitert (siehe erstattung.spec.js).
//
// UND DIE FRIST ERSTATTET AUCH NICHT. Ein Antrag, der nach 72 Stunden von
// selbst Geld bewegt, wäre eine Geldentscheidung ohne einen Menschen
// darin. Nach Ablauf steht er auf `abgelaufen` und ist damit für den
// Betreiber sichtbar. Die Frist erzeugt eine Zuständigkeit, keine Zahlung.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { phpOhneKommentare } = require('./lib/php-code');

const WURZEL = path.join(__dirname, '..', '..');
const HARNISCH = path.join(__dirname, 'storno.php');
const QUELLE = path.join(WURZEL, 'includes', 'payments', 'storno.php');

const ANBIETER = 'acct_anbieter123';
const ZAHLER = 42;

/** Eine bezahlte Buchung: Zahler 42, Geld floss an ANBIETER. */
const PI = {
  id: 'pi_test',
  status: 'succeeded',
  amount_received: 120000,
  transfer_data: { destination: ANBIETER },
  metadata: { user_id: String(ZAHLER) },
};

function lauf(faelle) {
  const aus = execFileSync('php', [HARNISCH], {
    input: JSON.stringify(faelle),
    encoding: 'utf8',
  });
  const erg = JSON.parse(aus);
  expect(erg.length, 'der Prüfstand hat nicht auf jeden Fall geantwortet')
    .toBe(faelle.length);
  return erg;
}

test.describe('Storno: ein Vorgang, kein Knopf auf fremdes Geld', () => {
  test('der Prüfstand führt den echten Quelltext aus', () => {
    // GEGENPROBE. Bei einer Regel auf einem Geldweg ist eine stille
    // Entwarnung das Teuerste, was es gibt.
    expect(fs.existsSync(QUELLE), 'includes/payments/storno.php fehlt').toBe(true);
    const [ja, nein] = lauf([
      { op: 'beantragen', user: ZAHLER, pi: PI },
      { op: 'beantragen', user: 999, pi: PI },
    ]);
    expect(ja, 'der Zahler darf nicht beantragen — der Prüfstand misst nichts').toBe(true);
    expect(nein, 'ein Fremder darf beantragen — der Prüfstand meldet immer true').toBe(false);
  });

  test('nur der Zahler beantragt, und nur bei bezahlter Buchung', () => {
    // Die Kennung aus dem Antrag zu glauben wäre derselbe Fehler wie in der
    // alten Erstattungsroute, nur andersherum: gefragt wird, wen STRIPE als
    // Zahler führt.
    const [fremd, ohneZahler, nichtBezahlt, offen] = lauf([
      { op: 'beantragen', user: 999, pi: PI },
      { op: 'beantragen', user: ZAHLER, pi: { ...PI, metadata: {} } },
      { op: 'beantragen', user: ZAHLER, pi: { ...PI, status: 'requires_payment_method' } },
      { op: 'beantragen', user: 0, pi: PI },
    ]);
    expect(fremd, 'ein Fremder kann für eine fremde Zahlung stornieren').toBe(false);
    expect(ohneZahler, 'ohne Zahler im PaymentIntent wird trotzdem zugelassen').toBe(false);
    expect(nichtBezahlt, 'eine unbezahlte Buchung lässt sich stornieren — dann '
      + 'entsteht ein Vorgang über Geld, das nie geflossen ist').toBe(false);
    expect(offen, 'ein Abgemeldeter darf beantragen').toBe(false);
  });

  test('entschieden wird nach DERSELBEN Regel wie erstattet', () => {
    // Zwei Fassungen derselben Rechteregel driften — und diese driftete
    // schon einmal auf einem Geldweg. `eb_storno_darf_entscheiden()` gibt
    // die Frage deshalb an `eb_erstattung_darf()` weiter.
    const [anbieter, zahler, fremdesKonto, admin] = lauf([
      { op: 'entscheiden', admin: false, konto: ANBIETER, pi: PI },
      { op: 'entscheiden', admin: false, konto: '', pi: PI },
      { op: 'entscheiden', admin: false, konto: 'acct_fremd', pi: PI },
      { op: 'entscheiden', admin: true, konto: '', pi: PI },
    ]);
    expect(anbieter, 'der Anbieter kann nicht entscheiden — dann fehlt der Weg, '
      + 'den der Auftrag ausdrücklich verlangt').toBe(true);
    expect(zahler, 'DER ZAHLER kann über seinen eigenen Antrag entscheiden — '
      + 'damit wäre der Vorgang wieder der Knopf, den er ersetzen soll').toBe(false);
    expect(fremdesKonto, 'ein fremdes Connect-Konto genügt').toBe(false);
    expect(admin, 'der Betreiber kann nicht entscheiden — dann ist die '
      + 'Plattform bei einer Streitigkeit handlungsunfähig').toBe(true);
  });

  test('die Frist läuft ab, aber sie erstattet nichts', () => {
    // Der Zustand ist ABGELEITET, nicht gespeichert: sonst bräuchte es
    // einen Zeitgeber, der Zeilen umschreibt, und derselbe Antrag wäre je
    // nach dessen Laufzeit mal offen und mal abgelaufen.
    const jetzt = 1_700_000_000;
    const frisch = { status: 'offen', frist: new Date((jetzt + 3600) * 1000).toISOString().slice(0, 19).replace('T', ' ') };
    const alt = { status: 'offen', frist: new Date((jetzt - 3600) * 1000).toISOString().slice(0, 19).replace('T', ' ') };
    const [a, b, c, d] = lauf([
      { op: 'zustand', zeile: frisch, jetzt },
      { op: 'zustand', zeile: alt, jetzt },
      { op: 'zustand', zeile: { status: 'angenommen', frist: alt.frist }, jetzt },
      { op: 'zustand', zeile: { status: 'abgelehnt', frist: alt.frist }, jetzt },
    ]);
    expect(a, 'ein Antrag innerhalb der Frist gilt als abgelaufen').toBe('offen');
    expect(b, 'ein überfälliger Antrag bleibt offen — dann wird der Betreiber '
      + 'nie zuständig und der Planer wartet ewig').toBe('abgelaufen');
    expect(c, 'eine Annahme wird durch Fristablauf überschrieben').toBe('angenommen');
    expect(d, 'eine Ablehnung wird durch Fristablauf überschrieben').toBe('abgelehnt');
  });

  test('ein entschiedener Antrag wird nicht noch einmal entschieden', () => {
    // Ohne diese Grenze liesse sich eine Ablehnung später in eine Annahme
    // drehen und Geld bewegen, das längst abgerechnet ist. Ein abgelaufener
    // bleibt entscheidbar — der Dienstleister darf sich auch spät melden.
    const erg = lauf([
      { op: 'entscheidbar', zustand: 'offen' },
      { op: 'entscheidbar', zustand: 'abgelaufen' },
      { op: 'entscheidbar', zustand: 'angenommen' },
      { op: 'entscheidbar', zustand: 'abgelehnt' },
      { op: 'entscheidbar', zustand: '' },
    ]);
    expect(erg, 'ein bereits entschiedener Antrag lässt sich erneut entscheiden')
      .toEqual([true, true, false, false, false]);
  });

  test('die Begründung ist Pflicht, gedeckelt und entschärft', () => {
    // Der Text geht in die Oberfläche des Gegenübers. Entschärft wird er,
    // nicht verworfen — dieselbe Regel wie beim Aktivitäten-Bestand.
    const lang = 'A'.repeat(900);
    const [leer, kurz, gut, spitz, mitLang] = lauf([
      { op: 'grund', text: '   ' },
      { op: 'grund', text: 'nein' },
      { op: 'grund', text: '  Die   Location ist abgebrannt.  ' },
      { op: 'grund', text: 'Absage wegen <script>alert(1)</script> Krankheit' },
      { op: 'grund', text: lang },
    ]);
    expect(leer.startsWith('!'), 'eine leere Begründung wird angenommen').toBe(true);
    expect(kurz.startsWith('!'), '„nein" gilt als Begründung — der Gegenüber '
      + 'kann darauf nicht antworten').toBe(true);
    expect(gut, 'der Text wird nicht normalisiert').toBe('Die Location ist abgebrannt.');
    expect(spitz, 'spitze Klammern kommen durch — fremder Text ist Daten, '
      + 'nie Markup').not.toMatch(/[<>]/);
    expect(spitz, 'der Eintrag wurde verworfen statt entschärft').toContain('Krankheit');
    expect(mitLang.length, 'die Begründung ist nicht gedeckelt').toBeLessThanOrEqual(600);
  });

  test('die Frist ist eine Frist, keine Zahlung', () => {
    // DER KERN. Nichts im Modul darf bei Fristablauf selbst erstatten.
    // Gemessen NACH ABZUG DER KOMMENTARE — der erklärende Text daneben
    // nennt „erstatten" mehrfach, und ein Muster über den Rohtext fände es
    // dort wieder. Genau daran sind hier schon Prüfungen gescheitert.
    const code = phpOhneKommentare(QUELLE);
    for (const verboten of ['eb_stripe_refund', 'api.stripe.com', 'curl_init',
      'wp_schedule_event', 'wp_schedule_single_event']) {
      expect(code, `storno.php ruft \`${verboten}\` — der Vorgang darf kein Geld `
        + `bewegen und keinen Zeitgeber starten; erst die Annahme durch den `
        + `Dienstleister erstattet, und das tut die bestehende Route`)
        .not.toContain(verboten);
    }
    // Gegenprobe: die Frist gibt es überhaupt.
    const [f0, f1] = lauf([{ op: 'frist', jetzt: 0 }, { op: 'frist', jetzt: 3600 }]);
    expect(f0, 'es entsteht keine Frist').toMatch(/^\d{4}-\d{2}-\d{2} /);
    expect(f1 > f0, 'die Frist hängt nicht am Zeitpunkt').toBe(true);
  });

  test('der Vorgang hat eine eigene Tabelle, nicht den Board-Blob', () => {
    // Ein Storno ist zweiseitig: der Planer beantragt, der Dienstleister
    // entscheidet. In `eb_board_projects` — EIN JSON-Blob je Nutzer —
    // überschrieben sich beide, und die Entscheidung des einen wäre weg,
    // ohne Meldung. Dieselbe Begründung wie bei Freunden und Gruppen.
    const [sql] = lauf([{ op: 'sql' }]);
    expect(sql, 'es entsteht keine eigene Tabelle').toContain('eb_storno');
    expect(sql, 'ohne eindeutigen Schlüssel auf den PaymentIntent kann ein '
      + 'Planer beliebig viele Anträge zur selben Zahlung stellen')
      .toMatch(/UNIQUE KEY[^\n]*payment_intent/);
    const code = phpOhneKommentare(QUELLE);
    expect(code, 'storno.php fasst eb_board_projects an — genau den Blob, '
      + 'dessentwegen es diese Tabelle gibt').not.toContain('eb_board_projects');
  });
});
