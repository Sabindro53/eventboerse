// Eine Schicht darf nicht an einem schweigenden Modell verloren gehen.
//
// Gemessen an den Läufen 905, 910 und 912 — dieselben zwei Rollen fielen in
// JEDEM Lauf aus, und zwar aus modellspezifischen Gründen, nicht sporadisch:
//
//   Timo Rast (Qwen3 Coder 30B)  3 von 3: „Provider lieferte eine leere Antwort"
//   Ben Oduya (Llama 3.1 8B)     3 von 3: am Tokenlimit abgeschnitten — auch
//                                noch bei 315 Token, also nicht mehr am Budget
//
// `agent.mjs` machte genau einen Versuch: leere Antwort oder HTTP-Fehler, und
// die Schicht war weg. Der Autopilot wechselt in diesem Fall längst das
// Modell; dem Puls fehlte es. Zwei von elf Schichten gingen so in jedem Lauf
// verloren — bei 48 Läufen am Tag rund 90 bezahlte Aufrufe ohne Ergebnis.
//
// Geprüft wird am VERHALTEN: `agent.mjs` läuft wirklich, mit gestelltem
// `fetch`. Eine Prüfung auf den Wortlaut der Schleife würde nicht zeigen, ob
// wirklich ein zweiter Aufruf herausgeht, ob die Kosten beider Versuche
// gebucht werden und ob der Fehlversuch im Journal sichtbar bleibt.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');

/** Eine Antwort, wie OpenRouter sie liefert. */
function antwort({ text = '', grund = 'stop', modell = 'x', kosten = 0.0001 } = {}) {
  return {
    model: modell,
    choices: [{ message: { content: text }, finish_reason: grund }],
    usage: { prompt_tokens: 1000, completion_tokens: 200, total_tokens: 1200, cost: kosten },
  };
}

/**
 * Führt eine echte Schicht aus, mit gestelltem `fetch`.
 *
 * `--import` schiebt den Stub VOR agent.mjs — so braucht der Produktionscode
 * keinen Test-Haken. Ein Schalter, den nur der Test benutzt, wäre eine
 * Abzweigung, die im Betrieb nie geprüft wird.
 */
function schicht(rolleId, antworten) {
  const heim = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-ersatz-'));
  const journal = path.join(heim, 'journal.json');
  fs.writeFileSync(journal, JSON.stringify({ version: 1, eintraege: [] }));
  fs.writeFileSync(path.join(heim, 'kontext.txt'), 'Testkontext ohne Befund.');

  // Der Stub protokolliert JEDEN Aufruf mit seinem Modell — nur so lässt
  // sich zeigen, dass ein zweiter wirklich hinausging.
  fs.writeFileSync(path.join(heim, 'stub.mjs'), `
import { writeFileSync, readFileSync } from 'node:fs';
const spur = ${JSON.stringify(path.join(heim, 'aufrufe.json'))};
writeFileSync(spur, '[]');
const antworten = ${JSON.stringify(antworten)};
let i = 0;
globalThis.fetch = async (url, opts) => {
  // Die Kontingentprüfung läuft über denselben fetch — sie darf die
  // Zählung der Modellaufrufe nicht verfälschen.
  if (String(url).endsWith('/key')) {
    return { ok: true, json: async () => ({ data: { usage_daily: 0, limit_remaining: 99 } }) };
  }
  const modell = JSON.parse(opts.body).model;
  const bisher = JSON.parse(readFileSync(spur, 'utf8'));
  bisher.push(modell);
  writeFileSync(spur, JSON.stringify(bisher));
  const a = antworten[i++];
  if (!a) throw new Error('mehr Aufrufe als gestellte Antworten');
  if (a.http) return { ok: false, status: a.http, text: async () => 'Rate limited' };
  return { ok: true, json: async () => a };
};
`);

  let aus = '';
  let code = 0;
  try {
    aus = execFileSync('node', [
      '--import', path.join(heim, 'stub.mjs'),
      path.join(ROOT, 'scripts', 'agent.mjs'),
      '--rolle', rolleId,
      '--kontext', path.join(heim, 'kontext.txt'),
      '--anlass', 'Test',
    ], {
      cwd: ROOT, encoding: 'utf8',
      env: { ...process.env, OPENROUTER_API_KEY: 'test', EB_JOURNAL: journal },
    });
  } catch (e) {
    code = e.status ?? 1;
    aus = String(e.stdout || '') + String(e.stderr || '');
  }
  const eintrag = JSON.parse(fs.readFileSync(journal, 'utf8')).eintraege[0];
  const aufrufe = JSON.parse(fs.readFileSync(path.join(heim, 'aufrufe.json'), 'utf8'));
  fs.rmSync(heim, { recursive: true, force: true });
  return { aus, code, eintrag, aufrufe };
}

// Diese Tests starten Kindprozesse und schreiben je ein eigenes Journal —
// sie teilen keinen Zustand, dürfen also parallel laufen.
test.describe('Ersatzkette: eine schweigende Rolle verliert ihre Schicht nicht', () => {
  test('auf eine leere Antwort folgt das Ersatzmodell', () => {
    // Timo Rasts Fall, drei Läufe in Folge.
    const r = schicht('phi-kurz', [
      antwort({ text: '' }),
      antwort({ text: 'Ein belegter Befund zur Startseite.', modell: 'ersatz/modell' }),
    ]);
    expect(r.aufrufe, `es ging kein zweiter Aufruf hinaus:\n${r.aus}`).toHaveLength(2);
    expect(r.aufrufe[0]).not.toBe(r.aufrufe[1]);
    expect(r.eintrag.ergebnis, `die Schicht gilt weiter als Ausfall:\n${r.aus}`)
      .toBe('fertig');
    expect(r.eintrag.text).toContain('belegter Befund');
  });

  test('auch eine abgeschnittene Antwort löst den Wechsel aus', () => {
    // Ben Oduyas Fall: das Budget stimmt inzwischen, das Modell hält die
    // Wortgrenze trotzdem nicht. Ein weiterer Anlauf mit DEMSELBEN Modell
    // wäre derselbe Versuch — deshalb wechselt die Rolle.
    const r = schicht('llama-finance', [
      antwort({ text: 'Ein angefangener Satz, der', grund: 'length' }),
      antwort({ text: 'Eine vollständige Abweichungsmeldung.', modell: 'ersatz/modell' }),
    ]);
    expect(r.aufrufe).toHaveLength(2);
    expect(r.eintrag.ergebnis).toBe('fertig');
  });

  test('ein HTTP-Fehler kostet die Schicht nicht mehr', () => {
    // Nils Falk lief im Lauf 910 in ein 429 des Anbieters.
    const r = schicht('mistral-ops', [
      { http: 429 },
      antwort({ text: 'Betriebszustand belegt grün.', modell: 'ersatz/modell' }),
    ]);
    expect(r.aufrufe).toHaveLength(2);
    expect(r.eintrag.ergebnis).toBe('fertig');
  });

  test('eine brauchbare erste Antwort kostet keinen zweiten Aufruf', () => {
    // Die Gegenprobe. Ohne sie wäre ein Ausweichen, das IMMER passiert,
    // ebenfalls „bestanden" — und würde die Kosten des Pulses verdoppeln.
    const r = schicht('llama-arch', [antwort({ text: 'Ein klarer Produkthebel.' })]);
    expect(r.aufrufe, 'es ging ein überflüssiger zweiter Aufruf hinaus')
      .toHaveLength(1);
    expect(r.eintrag.ergebnis).toBe('fertig');
  });

  test('der Fehlversuch bleibt im Journal sichtbar', () => {
    // Ein Journal, das nur das Modell nennt, das geantwortet hat,
    // verschweigt, dass das eigene schweigt. Dann merkt niemand, dass eine
    // Rolle ihr Modell verloren hat — die Bilanz sähe makellos aus.
    const r = schicht('phi-kurz', [
      antwort({ text: '' }),
      antwort({ text: 'Ergebnis.', modell: 'ersatz/modell' }),
    ]);
    expect(r.eintrag.versuche, 'der Fehlversuch ist nicht festgehalten').toBeTruthy();
    expect(r.eintrag.versuche).toHaveLength(1);
    expect(r.eintrag.versuche[0].grund).toMatch(/leere Antwort/);
    // Und der Eintrag nennt das Modell, das WIRKLICH geantwortet hat.
    expect(r.eintrag.modellId).toBe('ersatz/modell');
  });

  test('beide Versuche werden bezahlt und beide gebucht', () => {
    // Wer nur den letzten Aufruf bucht, rechnet die Schicht billiger, als
    // sie war — und die Kostenbremse greift zu spät.
    const r = schicht('phi-kurz', [
      antwort({ text: '', kosten: 0.0004 }),
      antwort({ text: 'Ergebnis.', kosten: 0.0006 }),
    ]);
    expect(r.eintrag.kostenUsd, 'nur ein Versuch wurde gebucht')
      .toBeCloseTo(0.001, 6);
  });

  test('scheitern alle Kandidaten, steht das mit jedem Grund im Journal', () => {
    const r = schicht('phi-kurz', [antwort({ text: '' }), antwort({ text: '' })]);
    expect(r.eintrag.ergebnis).toBe('fehler');
    // Der Text nennt BEIDE Versuche. Vorher stand dort derselbe Satz wie
    // bei einem einzigen Modell — eine erschöpfte Ersatzkette sah damit aus
    // wie ein einzelner Aussetzer.
    expect(r.eintrag.text, 'der Text verschweigt den zweiten Versuch')
      .toMatch(/2 Modell\(en\)/);
    expect(r.eintrag.versuche).toHaveLength(2);
    // Und die Schicht reisst den Lauf trotzdem nicht mit.
    expect(r.code, 'ein Totalausfall der Rolle beendet den Lauf').toBe(0);
  });

  test('mehr als MAX_MODELLVERSUCHE Kandidaten werden nie angefasst', () => {
    // Der Deckel ist Kostendisziplin. Ohne ihn koennte eine Rolle mit langer
    // Kette in einem Anbieter-Ausfall beliebig viele Aufrufe verbrennen.
    const quelle = fs.readFileSync(
      path.join(ROOT, 'scripts', 'agent.mjs'), 'utf8');
    const deckel = Number((quelle.match(/MAX_MODELLVERSUCHE = (\d+)/) || [, 0])[1]);
    expect(deckel, 'kein Deckel für die Modellversuche').toBeGreaterThan(1);
    const r = schicht('phi-kurz',
      Array.from({ length: deckel + 2 }, () => antwort({ text: '' })));
    expect(r.aufrufe.length, 'die Schleife läuft über den Deckel hinaus')
      .toBe(deckel);
  });
});
