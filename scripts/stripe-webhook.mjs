#!/usr/bin/env node
/**
 * stripe-webhook.mjs — hört Stripe wirklich auf das, was der Code behandelt?
 *
 * DIE FEHLERKLASSE, zum wiederholten Mal: ein Empfänger, der da ist, richtig
 * ist, geprüft ist — und nie gerufen wird. Am 23.09.2026 am Live-Konto
 * gemessen:
 *
 *   Stripe sendete   : payment_intent.succeeded, checkout.session.completed
 *   Der Code behandelt: zusätzlich charge.updated, refund.created,
 *                       refund.updated, refund.failed, transfer.created,
 *                       payment_intent.payment_failed, payment_intent.canceled,
 *                       account.updated
 *
 * Acht von zehn `case`-Zweigen waren unerreichbar. Der teuerste davon:
 * `eb_booking_record_refund()` in includes/booking.php trägt im eigenen
 * Kommentar „signed webhooks refresh rather than invent settlement" und
 * verhindert sorgfältig, dass ein verspätetes `refund.created` ein
 * bestätigtes Ergebnis zurückdreht. Er wurde FÜR einen Webhook gebaut, den
 * nie jemand abonniert hat. Eine Erstattung, die im Stripe-Dashboard
 * ausgelöst wird, bewegt damit Geld und erreicht das Board nie.
 *
 * Dieselbe Mechanik wie der tote Gitleaks-Scan: der Prüfer ist da, er ist
 * richtig, und sein Subjekt erreicht ihn nicht.
 *
 *   node scripts/stripe-webhook.mjs           Bericht
 *   node scripts/stripe-webhook.mjs --check   Tor: Exit 1 bei Drift
 *
 * BRAUCHT EINEN SCHLÜSSEL UND NETZ. Die Liste, um die es geht, liegt bei
 * Stripe und nirgends sonst — sie steht in keiner Datei dieses Repositories.
 * Ohne Schlüssel wird NICHT still durchgewunken: genau diese Verwechslung
 * („nicht geprüft" sieht aus wie „in Ordnung") ließ den toten Secret-Scanner
 * vier Monate wie Schutz aussehen.
 *
 * SCHLÜSSELWAHL. Bevorzugt wird EB_STRIPE_READ_KEY — ein eingeschränkter
 * Schlüssel mit Leserecht auf Webhook-Endpunkte genügt für alles hier.
 * EB_STRIPE_SECRET_KEY ist der Rückfall, damit das Tor sofort misst und
 * nicht als Leiche im Repository liegt; mehr Rechte als nötig sind aber
 * mehr Rechte als nötig. Der Schlüssel wird nie ausgegeben, auch nicht
 * gekürzt — Logs sind bei einem öffentlichen Repository öffentlich.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Der Kommentar-Entferner steht EINMAL im Projekt. Ihn hier nachzubauen wäre
// die elfte Fundstelle derselben Klasse — und `case 'refund.created':` steht
// in diesem Skript selbst im Kopfkommentar, also träfe ein roher Ausdruck
// über functions.php irgendwann genau so etwas.
const require = createRequire(import.meta.url);
const { phpOhneKommentare } = require('../tests/e2e/lib/php-code.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUELLE = join(ROOT, 'functions.php');

/** Der Pfad, unter dem unser Webhook wirklich hört. */
export const WEBHOOK_PFAD = '/wp-json/eventboerse/v1/stripe/webhook';

/**
 * Ereignisse, die der Code behandelt und die BEWUSST nicht abonniert sind.
 *
 * Stilllegen heißt eintragen, nicht verschweigen — dieselbe Regel wie bei den
 * Phantom-Workflows. Ein leerer Grund fällt im Test durch: „vergessen" und
 * „abgeschafft" müssen sich unterscheiden lassen.
 */
export const OHNE_ABO = {
  'payment_intent.payment_failed':
    'Der Zweig ist ausdrücklich NOOP — der Zahlungsdialog zeigt den Fehler '
    + 'live, während er offen ist. Ein Abonnement erzeugte bei jedem '
    + 'Fehlversuch einen Aufruf, der nichts tut. Verkehr ohne Wirkung ist '
    + 'dasselbe wie ein Prüfer ohne Subjekt, nur andersherum.',
  'payment_intent.canceled':
    'Wie payment_intent.payment_failed: derselbe NOOP-Zweig.',
  'account.updated':
    'Erreicht uns NUR über einen Endpunkt mit Connect-Geltungsbereich '
    + '(Stripe: „Events from → Connected accounts"). Am vorhandenen '
    + 'Konto-Endpunkt eingetragen wäre es ein Tor, das nie auslöst. Ein '
    + 'zweiter Endpunkt trägt ein EIGENES Signaturgeheimnis, und '
    + 'eb_stripe_webhook() kennt genau eines — er wiese jede Connect-'
    + 'Lieferung mit 400 ab, bis Stripe ihn abschaltet. Reihenfolge also: '
    + 'zweites Geheimnis im Code, dann der Endpunkt. Solange das aussteht, '
    + 'trägt eb_stripe_connect_state_for_user() den Fall — es fragt Stripe '
    + 'bei JEDER Buchung live (functions.php:8894), der Status ist also nie '
    + 'veraltet, wenn es darauf ankommt.',
};

/**
 * Welche Ereignisse behandelt der Webhook wirklich?
 *
 * Gemessen am Rumpf von eb_stripe_webhook() und NACH ABZUG DER KOMMENTARE.
 * Der Rumpf wird begrenzt, weil `case '…'` auch anderswo in einer 10000-
 * Zeilen-Datei vorkommen kann und ein Prüfer, dessen Subjekt zu weit ist,
 * genauso falsch liegt wie einer, dessen Subjekt zu eng ist.
 */
export function behandelteEreignisse(quelltext) {
  const ab = quelltext.indexOf('function eb_stripe_webhook(');
  if (ab < 0) return [];
  const rest = quelltext.slice(ab);
  // Bis zur nächsten Funktion auf Spaltenebene 0 — das ist das Ende des Rumpfs.
  const bis = rest.search(/\n(?:function|add_action|add_filter)\s/);
  const rumpf = bis > -1 ? rest.slice(0, bis) : rest;

  const treffer = new Set();
  for (const m of rumpf.matchAll(/case\s+'([a-z0-9_]+(?:\.[a-z0-9_]+)+)'\s*:/g)) {
    treffer.add(m[1]);
  }
  return [...treffer].sort();
}

/** Dasselbe, aber gegen die echte Datei — mit Kommentarabzug. */
export function behandelteEreignisseAusDatei(datei = QUELLE) {
  return behandelteEreignisse(phpOhneKommentare(datei));
}

/**
 * Stellt Befund und Bewertung nebeneinander.
 *
 * BLOCKIEREND IST NUR, WAS DERSELBE COMMIT BEHEBEN KANN — dieselbe Regel wie
 * in recht.mjs und aktivitaeten.mjs. Ein fehlendes Abonnement ist
 * commit-behebbar: entweder es wird bei Stripe gesetzt, oder die Entscheidung
 * wandert mit Grund nach OHNE_ABO. Ein Abonnement OHNE Empfänger dagegen ist
 * harmlos (der default-Zweig quittiert mit 200) und von hier aus nicht
 * abstellbar — es wird gemeldet, nicht blockiert.
 */
export function vergleiche(behandelt, abonniert) {
  const alles = abonniert.includes('*');
  const hat = (e) => alles || abonniert.includes(e);

  const fehltAbo = [];      // behandelt, nicht abonniert, nicht begründet
  const stilleEntscheidung = []; // in OHNE_ABO und trotzdem abonniert
  const ohneGrund = [];     // in OHNE_ABO, aber ohne Begründung
  const ohneEmpfaenger = []; // abonniert, aber kein case im Code

  for (const e of behandelt) {
    const begruendet = Object.prototype.hasOwnProperty.call(OHNE_ABO, e);
    if (begruendet && !String(OHNE_ABO[e] || '').trim()) ohneGrund.push(e);

    if (hat(e)) {
      // Abonniert. Steht es trotzdem als „bewusst nicht abonniert" da, ist
      // die Aufzeichnung veraltet — und eine veraltete Begründung ist
      // schlimmer als keine, weil sie gelesen und geglaubt wird.
      if (begruendet) stilleEntscheidung.push(e);
      continue;
    }
    if (!begruendet) fehltAbo.push(e);
  }

  if (!alles) {
    for (const e of abonniert) {
      if (!behandelt.includes(e)) ohneEmpfaenger.push(e);
    }
  }

  return { fehltAbo, stilleEntscheidung, ohneGrund, ohneEmpfaenger };
}

/** Der Schlüssel — eingeschränkt bevorzugt, nie ausgegeben. */
export function schluessel(env = process.env) {
  return env.EB_STRIPE_READ_KEY || env.EB_STRIPE_SECRET_KEY || '';
}

/** Die abonnierten Ereignisse unserer Endpunkte, von Stripe geholt. */
export async function hole(key, holer = fetch) {
  if (!key) return { fehler: 'kein Schlüssel (EB_STRIPE_READ_KEY oder EB_STRIPE_SECRET_KEY)' };
  try {
    const r = await holer('https://api.stripe.com/v1/webhook_endpoints?limit=100', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return { fehler: `Stripe antwortete ${r.status}` };
    const d = await r.json();
    const alle = Array.isArray(d.data) ? d.data : [];
    const unsere = alle.filter((e) => String(e.url || '').includes(WEBHOOK_PFAD)
      && String(e.status || 'enabled') === 'enabled');
    const ereignisse = new Set();
    for (const e of unsere) for (const t of (e.enabled_events || [])) ereignisse.add(t);
    return { endpunkte: unsere, abonniert: [...ereignisse].sort(), gesamt: alle.length };
  } catch (e) {
    return { fehler: `Abruf fehlgeschlagen: ${e.message}` };
  }
}

// Nur ausführen, wenn direkt aufgerufen — die Tests importieren die Griffe.
if (process.argv[1] && process.argv[1].endsWith('stripe-webhook.mjs')) {
  const tor = process.argv.includes('--check');
  console.log('── Stripe-Webhook: Empfänger gegen Abonnement ────');

  const behandelt = behandelteEreignisseAusDatei();
  console.log(`Im Code behandelt   : ${behandelt.length}`);

  const antwort = await hole(schluessel());
  if (antwort.fehler) {
    // Nicht still durchwinken. Ohne die Liste ist nichts geprüft, und das
    // muss anders aussehen als „alles in Ordnung".
    console.log(`⚠  Nicht geprüft: ${antwort.fehler}`);
    console.log('─────────────────────────────────────────────────');
    process.exit(tor ? 1 : 0);
  }

  console.log(`Endpunkte auf unsere Route: ${antwort.endpunkte.length} (von ${antwort.gesamt})`);
  console.log(`Davon abonniert     : ${antwort.abonniert.length}`);

  const { fehltAbo, stilleEntscheidung, ohneGrund, ohneEmpfaenger } =
    vergleiche(behandelt, antwort.abonniert);

  for (const e of Object.keys(OHNE_ABO)) {
    if (behandelt.includes(e) && !antwort.abonniert.includes(e)) {
      console.log(`  ○ ${e} — bewusst ohne Abo`);
    }
  }
  for (const e of ohneEmpfaenger) {
    console.log(`  ~ ${e} — abonniert, aber kein case im Code (quittiert mit 200)`);
  }

  const verstoesse = [];
  for (const e of fehltAbo) {
    verstoesse.push(`${e} wird behandelt, aber nicht gesendet — der Zweig ist unerreichbar`);
  }
  for (const e of stilleEntscheidung) {
    verstoesse.push(`${e} steht in OHNE_ABO und IST abonniert — die Begründung ist veraltet`);
  }
  for (const e of ohneGrund) {
    verstoesse.push(`${e} steht in OHNE_ABO ohne Grund — „vergessen" sieht dann aus wie „abgeschafft"`);
  }

  if (verstoesse.length) {
    console.log('');
    for (const v of verstoesse) console.log(`  ⛔ ${v}`);
    console.log('');
    console.log('Entweder bei Stripe abonnieren (Dashboard → Webhooks → Endpunkt');
    console.log('bearbeiten) oder die Entscheidung in OHNE_ABO eintragen, mit Grund.');
    console.log('─────────────────────────────────────────────────');
    process.exit(tor ? 1 : 0);
  }

  console.log(`✓ Jeder der ${behandelt.length} behandelten Zweige ist abonniert oder begründet.`);
  console.log('─────────────────────────────────────────────────');
}
