// Erstattung: wer darf das Geld zurueckholen?
//
// ── DER BEFUND ─────────────────────────────────────────────────────────
//
// Der Docblock von `eb_stripe_refund()` nennt seit jeher zwei Berechtigte:
// den Anbieter, dem das Geld zugeflossen ist, und Plattform-Admins. Der
// Code hatte einen dritten Zweig — `metadata.user_id` — und der Kommentar
// daneben erklaerte ihn mit „falls die App den Owner dort hinterlegt hat".
//
// Gemeint war der Anbieter. Geschrieben wird dort der ZAHLER:
// `'metadata[user_id]' => (string) $user->ID` beim Anlegen des
// PaymentIntents, also der bucheende Kunde.
//
// Die Route steht auf `permission_callback => 'is_user_logged_in'`. Ein
// Kunde konnte damit jederzeit und einseitig seine eigene Zahlung in voller
// Hoehe erstatten, auch nach erbrachter Leistung — und weil die Erstattung
// `reverse_transfer=true` setzt, wird das Geld aus dem Connect-Konto des
// Dienstleisters zurueckgeholt.
//
// Aufgehalten hat das nur, dass es keinen Knopf gab: gemessen am
// 13.09.2026 null Aufrufe der Route in `js/modules/**`, null in `hq.html`,
// null sonstwo im ausgelieferten Code. Eine REST-Route ist damit nicht
// unerreichbar, nur unbeworben.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { phpOhneKommentare } = require('./lib/php-code');

const WURZEL = path.join(__dirname, '..', '..');
const HARNISCH = path.join(__dirname, 'erstattung.php');
const QUELLE = path.join(WURZEL, 'includes', 'payments', 'erstattung-rechte.php');

const ANBIETER = 'acct_anbieter123';
const FREMD = 'acct_fremder999';

/** Ein PaymentIntent, wie Stripe ihn liefert — Geld floss an ANBIETER. */
const PI = {
  id: 'pi_test',
  amount_received: 120000,
  transfer_data: { destination: ANBIETER },
  metadata: { user_id: '42' },          // der ZAHLER, nicht der Anbieter
};

function darf(faelle) {
  const aus = execFileSync('php', [HARNISCH], {
    input: JSON.stringify(faelle),
    encoding: 'utf8',
  });
  const erg = JSON.parse(aus);
  expect(erg.length, 'der Prüfstand hat nicht auf jeden Fall geantwortet')
    .toBe(faelle.length);
  return erg;
}

test.describe('Erstattung: wer darf das Geld zurückholen', () => {
  test('der Prüfstand führt den echten Quelltext aus', () => {
    // GEGENPROBE: ohne sie wären alle folgenden Tests still grün, wenn die
    // Datei fehlt — bei einer Rechteprüfung auf einem Geldweg die
    // teuerste denkbare Entwarnung.
    expect(fs.existsSync(QUELLE), 'includes/payments/erstattung-rechte.php fehlt')
      .toBe(true);
    const [ja, nein] = darf([
      { admin: true, konto: '', pi: PI },
      { admin: false, konto: '', pi: PI },
    ]);
    expect(ja, 'ein Admin darf nicht — der Prüfstand meldet immer false').toBe(true);
    expect(nein, 'jemand ohne Konto darf — der Prüfstand meldet immer true').toBe(false);
  });

  test('DER ZAHLER DARF SICH NICHT SELBST ERSTATTEN', () => {
    // DER BEFUND. Nutzer 42 steht als `metadata.user_id` im PaymentIntent,
    // weil er ihn angelegt hat. Er hat kein Connect-Konto — er ist der
    // Kunde. Er darf das Geld nicht aus dem Konto des Dienstleisters
    // zurückholen, der die Leistung womöglich längst erbracht hat.
    const [erg] = darf([{ admin: false, konto: '', pi: PI }]);
    expect(erg, 'der zahlende Kunde kann seine eigene Zahlung erstatten und '
      + 'das Geld per reverse_transfer aus dem Konto des Dienstleisters '
      + 'zurückholen — einseitig und auch nach erbrachter Leistung').toBe(false);
  });

  test('auch ein Zahler MIT eigenem Connect-Konto darf es nicht', () => {
    // Ein Dienstleister kann selbst buchen (Firmenfeier, Unterauftrag). Er
    // hat dann ein Connect-Konto — aber ein FREMDES. Ohne diesen Fall
    // überlebte „prüfe nur, ob überhaupt ein Konto da ist".
    const [erg] = darf([{ admin: false, konto: FREMD, pi: PI }]);
    expect(erg, 'ein fremdes Connect-Konto genügt für die Erstattung')
      .toBe(false);
  });

  test('der Anbieter, dem das Geld zufloss, darf', () => {
    // Die Gegenprobe zum Befund: wer nur sperrt, kommt mit „gib immer false
    // zurück" durch — und dann kann niemand mehr erstatten, auch der
    // Dienstleister nicht, der laut Auftrag genau das tun soll, wenn er
    // nicht liefern kann.
    const [erg] = darf([{ admin: false, konto: ANBIETER, pi: PI }]);
    expect(erg, 'der Anbieter kann seine eigene Buchung nicht erstatten — '
      + 'dann fehlt der Weg, den der Auftrag ausdrücklich verlangt').toBe(true);
  });

  test('ein Admin darf immer', () => {
    const [mit, ohne] = darf([
      { admin: true, konto: ANBIETER, pi: PI },
      { admin: true, konto: '', pi: { id: 'pi_x' } },
    ]);
    expect(mit).toBe(true);
    expect(ohne, 'ein Admin ohne eigenes Connect-Konto darf nicht — dann ist '
      + 'die Plattform bei einer Streitigkeit handlungsunfähig').toBe(true);
  });

  test('leer trifft nie auf leer', () => {
    // DIE STILLE FALLE. Ohne die zwei frühen Rückgaben wäre '' === ''
    // ein Treffer: jeder Angemeldete ohne Connect-Konto dürfte jede
    // Zahlung ohne Ziel erstatten. Das ist genau die Sorte Loch, die beim
    // Lesen wie eine Gleichheitsprüfung aussieht.
    const erg = darf([
      { admin: false, konto: '', pi: { id: 'pi_ohne_ziel' } },
      { admin: false, konto: '', pi: { id: 'p', transfer_data: {} } },
      { admin: false, konto: '   ', pi: { id: 'p', on_behalf_of: '   ' } },
    ]);
    expect(erg, 'ein leeres Konto trifft auf ein leeres Ziel — jeder '
      + 'Angemeldete dürfte dann erstatten').toEqual([false, false, false]);
  });

  test('on_behalf_of zählt wie transfer_data.destination', () => {
    // Stripe liefert das Konto je nach Ladungsart unter dem einen oder dem
    // anderen Feld, und beim Abruf über die API als Zeichenkette ODER als
    // eingebettetes Objekt. Wer nur einen Fall liest, sperrt den Anbieter
    // in den übrigen aus — ein Nein aus dem falschen Grund.
    const erg = darf([
      { admin: false, konto: ANBIETER, pi: { id: 'p', on_behalf_of: ANBIETER } },
      { admin: false, konto: ANBIETER, pi: { id: 'p', transfer_data: { destination: { id: ANBIETER } } } },
      { admin: false, konto: ANBIETER, pi: { id: 'p', on_behalf_of: { id: ANBIETER } } },
    ]);
    expect(erg, 'eine der Schreibweisen von Stripe wird nicht erkannt')
      .toEqual([true, true, true]);
  });

  test('der Handler benutzt die Prüfung wirklich', () => {
    // DIE TEUERSTE LÜCKE WÄRE EINE PERFEKTE REGEL, DIE NIEMAND RUFT.
    // Gesucht wird die Einbindung und der Aufruf, nicht der Pfad irgendwo:
    // ein Muster, das den erklärenden Kommentar trifft, hat in diesem
    // Projekt schon mehrere Prüfungen wertlos gemacht.
    // Gemessen wird NACH ABZUG DER KOMMENTARE. Der entfernte Zweig ist
    // unmittelbar darüber dokumentiert — so verlangt es dieses Projekt —,
    // und ein Muster über den Rohtext fände `$owner_match` dort wieder.
    // Genau daran ist diese Prüfung beim ersten Lauf gescheitert.
    const fn = phpOhneKommentare(path.join(WURZEL, 'functions.php'));
    expect(fn, 'functions.php bindet erstattung-rechte.php nicht per require ein')
      .toMatch(/require(?:_once)?[^;\n]*includes\/payments\/erstattung-rechte\.php/);

    const i = fn.indexOf('function eb_stripe_refund');
    expect(i, 'eb_stripe_refund ist nicht auffindbar').toBeGreaterThan(0);
    const rumpf = fn.slice(i, fn.indexOf("\n}\n", i));
    expect(rumpf, 'eb_stripe_refund ruft eb_erstattung_darf() nicht — die '
      + 'Regel wäre dann gebaut, geprüft und wirkungslos')
      .toMatch(/eb_erstattung_darf\s*\(/);

    // Und der alte Zweig ist wirklich weg, nicht nur daneben gestellt.
    expect(rumpf, 'eb_stripe_refund liest weiterhin metadata.user_id als '
      + 'Berechtigung — genau der Zweig, der den Zahler zum Erstatter macht')
      .not.toMatch(/\$owner_match/);
  });

  test('die autorisierte Anbieter-Stornierung ist der einzige App-Weg in diese Route', () => {
    // Vom Inhaber autorisierter Anbieter-Storno: der Dialog verlangt Grund
    // und Serverberechtigung. journey-integration prüft die UI-Grenze,
    // booking-boundaries führt den echten Endpunkt gegen Käufer/Fremde aus.
    const treffer = [];
    for (const verz of ['js/modules', 'hq.html']) {
      const p = path.join(WURZEL, verz);
      if (!fs.existsSync(p)) continue;
      const dateien = fs.statSync(p).isDirectory()
        ? fs.readdirSync(p, { recursive: true })
            .map((f) => path.join(p, String(f)))
            .filter((f) => f.endsWith('.js'))
        : [p];
      for (const d of dateien) {
        if (fs.readFileSync(d, 'utf8').includes('stripe/refund')) {
          treffer.push(path.relative(WURZEL, d));
        }
      }
    }
    expect(treffer, `diese Dateien rufen jetzt /stripe/refund: `
      + `${treffer.join(', ')}. Ein Weg dorthin ist eine Produktentscheidung `
      + `(Frist, Begründung, Benachrichtigung) — nicht ein stiller Aufruf`)
      .toEqual(['js/modules/payments/44-kv-buchung.js']);
  });
});
