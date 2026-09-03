// Wer die Rechnung bekommt, und wem wir sagen, dass er sie bekommt.
//
// Am 29.05.2026 wurde der Mitschnitt an kontakt@ aus `eb_send_invoice`
// genommen (Anti-Spam Patch C) — die Zeile steht seither auskommentiert da.
// Der TEXT blieb stehen: die Buchungsbestätigung sagte dem Kunden bis zum
// 03.09.2026, sie gehe „an Kunde, Anbieter und kontakt@eventbörse.de", und
// die Zahlungs-Vorschau versprach dasselbe schon VOR dem Bezahlen.
//
// Das ist keine Kosmetik. Es ist eine Aussage darüber, wohin die
// Buchungsdaten gehen, abgegeben im Moment der Zahlung, und sie stimmte
// nicht. Solche Sätze fallen nie auf: sie stehen in einer Mail, die niemand
// gegen den Code liest, und beide Seiten sehen für sich richtig aus.
//
// Geprüft wird die BEDINGUNG, nicht dieser eine Empfänger:
//
//   1. Ein auskommentierter Empfänger darf nirgends mehr versprochen werden.
//   2. Jede Adresse, die im Mailtext als Empfänger auftritt, muss auch
//      wirklich in `$recipients` landen.
//
// Regel 2 ist die Gegenrichtung von Regel 1 — sie fängt einen NEU erfundenen
// Empfänger. Ohne sie prüfte die Datei nur die Vergangenheit.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

// Der Rumpf von eb_send_invoice. Ein Test, der die ganze functions.php
// durchsucht, träfe die Nachrichten-Wege mit — die leiten wirklich an
// kontakt@ um (eb_messages_send), und dort ist die Aussage richtig.
function rumpfVonSendInvoice() {
  const quelle = lies('functions.php');
  const start = quelle.indexOf('function eb_send_invoice(');
  expect(start, 'eb_send_invoice ist nicht auffindbar — der Test hat kein '
    + 'Subjekt mehr und darf dann nicht gruen melden').toBeGreaterThan(-1);
  const ende = quelle.indexOf('\n}', start);
  expect(ende, 'das Ende von eb_send_invoice ist nicht auffindbar')
    .toBeGreaterThan(start);
  return quelle.slice(start, ende);
}

// `&ouml;` und Co. stehen im PHP-Mailtext, die Adresse im Code nicht.
// Ohne diese Auflösung verglichen wir zwei Schreibweisen derselben Adresse
// und fänden nie einen Treffer — eine Pruefung, die nichts finden KANN.
function entitaetenAufloesen(s) {
  return s
    .replace(/&ouml;/g, 'ö').replace(/&auml;/g, 'ä').replace(/&uuml;/g, 'ü')
    .replace(/&Ouml;/g, 'Ö').replace(/&Auml;/g, 'Ä').replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß').replace(/&amp;/g, '&');
}

const ADRESSE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.\-öäüÖÄÜ]+\.[A-Za-z]{2,}/g;

// Ein Satz, der einen Empfaenger NENNT — nicht jede Adresse im Text ist
// einer. „Bei Fragen: kontakt@…" ist eine Kontaktadresse und voellig in
// Ordnung; „sie geht an kontakt@…" ist eine Zusage.
const ZUSAGE = /\b(geht an|gehen an|geht zur|gesendet an|versendet an|Empf(ae|ä)nger)\b/i;

function empfaengerZusagen(rumpf) {
  const treffer = [];
  // Satzweise: der Punkt trennt die Zusage von der Fusszeile im selben
  // HTML-Block. Wer am ganzen Block misst, haelt jede Adresse fuer eine
  // Zusage und muss die Regel danach mit Ausnahmen aufweichen.
  for (const satz of entitaetenAufloesen(rumpf).split(/(?<=[.!?])\s|<\/p>|<\/div>/)) {
    if (!ZUSAGE.test(satz)) continue;
    for (const a of satz.match(ADRESSE) || []) treffer.push({ adresse: a, satz });
  }
  return treffer;
}

// Adressen, die wirklich in $recipients landen — nur ungekommentierte Zeilen.
function echteEmpfaenger(rumpf) {
  const raus = new Set();
  for (const zeile of rumpf.split('\n')) {
    if (/^\s*(\/\/|#|\*)/.test(zeile)) continue;
    const m = zeile.match(/\$recipients\[\]\s*=\s*'([^']+)'/);
    if (m) raus.add(m[1]);
  }
  return raus;
}

// Adressen, die einmal Empfaenger WAREN und es nicht mehr sind. Genau sie
// sind die Falle: der Text ueberlebt die Entfernung.
function abbestellteEmpfaenger(rumpf) {
  const raus = new Set();
  for (const zeile of rumpf.split('\n')) {
    if (!/^\s*(\/\/|#)/.test(zeile)) continue;
    const m = zeile.match(/\$recipients\[\]\s*=\s*'([^']+)'/);
    if (m) raus.add(m[1]);
  }
  return raus;
}

test.describe('Die Rechnung verspricht keinen Empfaenger, den sie nicht hat', () => {
  test('jede zugesagte Adresse im Mailtext ist auch wirklich Empfaenger', () => {
    const rumpf = rumpfVonSendInvoice();
    const echte = echteEmpfaenger(rumpf);
    for (const { adresse, satz } of empfaengerZusagen(rumpf)) {
      expect(echte.has(adresse),
        `Der Mailtext sagt "${adresse}" als Empfaenger zu, aber $recipients `
        + `enthaelt die Adresse nicht. Satz: ${satz.trim().slice(0, 160)}`)
        .toBe(true);
    }
  });

  test('ein abbestellter Empfaenger wird nirgends mehr zugesagt', () => {
    const rumpf = rumpfVonSendInvoice();
    const abbestellt = abbestellteEmpfaenger(rumpf);
    // Kein Subjekt = kein Bestehen. Verschwindet die auskommentierte Zeile,
    // verliert diese Regel ihren Gegenstand und muesste still durchwinken —
    // dieselbe Mechanik wie beim toten Gitleaks-Scan.
    expect(abbestellt.size,
      'Es gibt keine auskommentierte $recipients-Zeile mehr. Sie ist das '
      + 'Protokoll der Entscheidung vom 29.05.2026; ohne sie prueft dieser '
      + 'Test nichts. Zeile wiederherstellen oder Regel bewusst streichen.')
      .toBeGreaterThan(0);

    const text = entitaetenAufloesen(rumpf);
    for (const adresse of abbestellt) {
      for (const { adresse: zugesagt, satz } of empfaengerZusagen(rumpf)) {
        expect(zugesagt,
          `"${adresse}" wurde als Empfaenger entfernt, der Text sagt sie aber `
          + `weiter zu. Satz: ${satz.trim().slice(0, 160)}`).not.toBe(adresse);
      }
      // Auch ohne Zusage-Formulierung: die Adresse darf im Mailtext nicht als
      // Aufzaehlungsglied neben Kunde/Anbieter stehen.
      expect(text,
        `"${adresse}" steht neben Kunde/Anbieter im Mailtext, bekommt die `
        + 'Mail aber nicht.').not.toMatch(
        new RegExp('Anbieter[^.]{0,80}' + adresse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  });
});

test.describe('Die Zahlungs-Vorschau verspricht dasselbe wie der Server', () => {
  // Der Satz VOR dem Bezahlen wiegt schwerer als der danach: er ist Teil der
  // Entscheidung, nicht ihrer Bestaetigung.
  function vorschauBlock() {
    const quelle = lies('js', 'modules', 'board', '41-flow-zahlung.js');
    const start = quelle.indexOf('Leistung erfüllt');
    expect(start, 'die Zahlungs-Vorschau ist nicht auffindbar — ohne Subjekt '
      + 'darf dieser Test nicht gruen melden').toBeGreaterThan(-1);
    return entitaetenAufloesen(quelle.slice(start, start + 900));
  }

  test('sie nennt keinen abbestellten Empfaenger', () => {
    const rumpf = rumpfVonSendInvoice();
    const block = vorschauBlock();
    for (const adresse of abbestellteEmpfaenger(rumpf)) {
      expect(block, `Die Zahlungs-Vorschau nennt "${adresse}" als Empfaenger `
        + 'der Rechnung; der Server sendet dorthin nicht.')
        .not.toContain(adresse);
      // Auch die blosse Domain zaehlt: hier stand „und eventbörse.de" —
      // dieselbe Zusage, nur ohne den lokalen Teil davor.
      const domain = adresse.split('@')[1];
      expect(block, `Die Zahlungs-Vorschau nennt "${domain}" als Empfaenger `
        + 'der Rechnung; der Server sendet dorthin nicht.')
        .not.toContain(domain);
    }
  });

  test('sie nennt genau die Empfaenger, die der Server unbedingt bedient', () => {
    // Kunde und Anbieter — die zwei Zeilen ohne Bedingung ausser „Adresse
    // vorhanden". testaccount@ haengt an Demo-Anbietern und ist fuer den
    // Kunden nichts anderes als „der Anbieter".
    const block = vorschauBlock();
    expect(block, 'die Vorschau nennt den Kunden nicht').toMatch(/<strong>dich<\/strong>/);
    expect(block, 'die Vorschau nennt den Anbieter nicht').toMatch(/<strong>Anbieter<\/strong>/);
  });
});
