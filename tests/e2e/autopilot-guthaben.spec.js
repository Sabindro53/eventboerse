// ── 34 ROTE LÄUFE, UND DIE MELDUNG ZEIGTE AUF DAS FALSCHE ────────────────
//
// Am 23.09.2026 war „🧠 Operationspuls · auto" **34 Läufe in Folge rot**,
// seit 15:18 UTC, alle fünf bis zehn Minuten einer. Der gemeldete Grund:
//
//   scout: kein Modell lieferte auswertbares strukturiertes JSON
//     qwen3-30b …: API OpenRouter 402: Insufficient credits
//     mistral-small …: API OpenRouter 402: Insufficient credits
//     llama-3.3-70b …: API OpenRouter 402: Insufficient credits
//
// **Kein Modell hatte überhaupt geantwortet.** Die Meldung zeigte auf das
// Schema, die Ursache lag auf dem Konto — wer ihr folgt, sucht am falschen
// Ende. Dieselbe Klasse wie ein Prüfer, der aus dem falschen Grund rot
// meldet: er kostet mehr als keiner.
//
// ── UND DIE VORPRÜFUNG HATTE DEN FALL VORHER DURCHGEWUNKEN ───────────────
//
// Im selben Log, zwei Zeilen darüber: *„OpenRouter-Schluessel ohne eigenes
// Limit; Laufbudget bleibt bei $0.12."* Die Bremse las `limit_remaining`
// aus `GET /api/v1/key` — das **Limit dieses Schlüssels**, nicht das
// **Guthaben des Kontos**. Ohne eigenes Limit steht dort `null`, und `null`
// wurde als „keine Grenze, weiterfahren" gelesen.
//
// Das ist die Signatur-Fehlerklasse dieses Hauses: *ein Prüfer, dessen
// Subjekt ein anderes ist als das vermutete, gibt eine Entwarnung, die er
// nicht decken kann.* CLAUDE.md warnt an anderer Stelle wörtlich davor —
// *„`null` bedeutet bei OpenRouter ‚kein Key-Limit', nicht ‚kein
// Guthaben'"* — und genau daran ist die Vorprüfung gescheitert.
//
// ── WARUM DIE MESSUNG HIER UND NICHT AM ECHTEN LAUF STEHT ────────────────
//
// `openrouter.ai` ist aus dieser Umgebung nicht erreichbar, und der
// Schlüssel liegt nur als GitHub-Secret vor. Der Fehlertext dagegen **ist
// gemessen** — er steht wörtlich im Lauf-Log vom 23.09.2026 und ist das
// Subjekt der 402-Wache. Die Wache trägt die Behebung deshalb allein; die
// Guthaben-Vorprüfung ist der billige frühe Ausstieg daneben und darf
// scheitern, ohne den Lauf zu gefährden.
//
//   npx playwright test tests/e2e/autopilot-guthaben.spec.js
//
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const { readFileSync, existsSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { ohneJsKommentare } = require('./lib/js-code.js');

const WURZEL = join(__dirname, '..', '..');
const SKRIPT = join(WURZEL, 'scripts', 'openrouter-agents.mjs');
const QUELLE = readFileSync(SKRIPT, 'utf8');

// DIE GEMESSENE MELDUNG. Wörtlich aus dem Log von Lauf 35929636836,
// 2026-09-23T22:40:51Z. Ein ausgedachter Text wäre hier wertlos: das Subjekt
// der Wache ist genau das, was OpenRouter wirklich schickt.
const ECHT_402 = 'qwen/qwen3-30b-a3b-instruct-2507: API OpenRouter 402: '
  + 'Insufficient credits. Add more using https://openrouter.ai/settings/credits';

/** Führt Node gegen das Skript aus und gibt JSON zurück. Der Aufruf ist die Messung. */
function fahre(code, cwd = WURZEL) {
  const r = execFileSync(process.execPath, ['--input-type=module', '-e', code],
    { cwd, encoding: 'utf8', timeout: 60000 });
  return JSON.parse(r.trim().split('\n').pop());
}

const IMPORT = `import * as m from ${JSON.stringify(SKRIPT)};`;

test.describe('Die 402-Wache misst, was OpenRouter wirklich geschickt hat', () => {
  test('die gemessene Meldung vom 23.09.2026 gilt als Guthabenfehler', () => {
    const r = fahre(`${IMPORT}
      console.log(JSON.stringify({ treffer: m.istGuthabenFehler(${JSON.stringify(ECHT_402)}) }));`);
    expect(r.treffer, 'die echte 402-Meldung wird nicht erkannt — die Wache hat kein Subjekt').toBe(true);
  });

  test('das Muster ist eng: es trifft weder Schemafehler noch 429 noch einen Modellnamen', () => {
    // Die Gegenprobe ist die wichtigere Hälfte. Ein zu weites Muster machte
    // aus JEDEM künftigen Defekt einen stillen, grünen Lauf — also aus einer
    // Behebung der nächste tote Prüfer.
    const harmlos = [
      'meta-llama/llama-3.3-70b-instruct: Pflichtfeld goal fehlt (finish_reason=stop)',
      'openai/gpt-oss-120b: API OpenRouter 429: Rate limited.',
      'anthropic/claude-credits-demo: Schema nicht erfuellt',
      'x: API OpenRouter 500: upstream error',
      '',
    ];
    const r = fahre(`${IMPORT}
      console.log(JSON.stringify(${JSON.stringify(harmlos)}.map((s) => m.istGuthabenFehler(s))));`);
    expect(r, `zu weites Muster — getroffen: ${harmlos.filter((_, i) => r[i]).join(' · ')}`)
      .toEqual(harmlos.map(() => false));
  });

  test('JEDER Fehlschlag muss ein Geldfehler sein, nicht irgendeiner', () => {
    // Ohne diese Grenze wäre die Behebung ein Weg, jeden künftigen Fehler
    // hinter einem beliebigen 402 verschwinden zu lassen.
    const r = fahre(`${IMPORT}
      const echt = ${JSON.stringify(ECHT_402)};
      console.log(JSON.stringify({
        alle:    m.istGuthabenStopp([echt, 'y: API OpenRouter 402: Insufficient credits.']),
        gemischt: m.istGuthabenStopp([echt, 'y: Pflichtfeld goal fehlt (finish_reason=length)']),
        leer:    m.istGuthabenStopp([]),
      }));`);
    expect(r.alle).toBe(true);
    expect(r.gemischt, 'ein echter Schemafehler neben einem 402 wird als Guthabenfall verbucht').toBe(false);
    expect(r.leer, 'eine leere Fehlerliste gilt als Guthabenfall').toBe(false);
  });
});

test.describe('Das Guthaben des Kontos ist nicht das Limit des Schlüssels', () => {
  test('der Kontostand entsteht aus total_credits minus total_usage', () => {
    const r = fahre(`${IMPORT}
      console.log(JSON.stringify({ wert: m.guthabenAusKonto({ data: { total_credits: 12.5, total_usage: 4.5 } }) }));`);
    expect(r.wert).toBe(8);
  });

  test('eine unlesbare Antwort ergibt UNBEKANNT, nie null Euro', () => {
    // Eine erfundene Null wäre eine Aussage über das Konto, die wir nicht
    // haben — und sie legte den Autopiloten still, ohne dass etwas fehlt.
    const faelle = [null, {}, { data: null }, { data: { total_credits: 5 } },
      { data: { total_usage: 1 } }, { abrufFehler: 'HTTP 500' }];
    const r = fahre(`${IMPORT}
      console.log(JSON.stringify(${JSON.stringify(faelle)}.map((b) => m.guthabenAusKonto(b))));`);
    expect(r).toEqual(faelle.map(() => null));
  });

  test('der kleinere der bekannten Werte bindet — genau der Befund', () => {
    // Ein Schlüssel mit $50 Limit auf einem leeren Konto darf nichts
    // ausgeben. Genau diese Lage lief 34 Läufe lang ins 402.
    const r = fahre(`${IMPORT}
      console.log(JSON.stringify({
        leeresKonto: m.bindendesGuthaben(50, 0),
        ohneLimit:   m.bindendesGuthaben(null, 3),
        ohneKonto:   m.bindendesGuthaben(2, null),
        beideWeg:    m.bindendesGuthaben(null, null),
      }));`);
    expect(r.leeresKonto, 'das leere Konto bindet nicht gegen ein offenes Schlüssel-Limit').toBe(0);
    expect(r.ohneLimit).toBe(3);
    expect(r.ohneKonto).toBe(2);
    expect(r.beideWeg, 'zwei unbekannte Werte ergeben nicht UNBEKANNT').toBeNull();
  });
});

// SERIELL, weil `OUT_DIR` am Repo-Wurzelverzeichnis hängt und nicht am cwd —
// zwei parallele Fälle schrieben dieselbe `.ai-run/result.json`. Der erste
// Entwurf legte dafür ein temporäres Verzeichnis an und mass darin: die Datei
// entstand woanders, und der Test war aus dem falschen Grund rot.
test.describe.serial('Kein Geld ist ein Zustand, kein Defekt', () => {
  const ERGEBNIS = join(WURZEL, '.ai-run', 'result.json');
  const MARKE = 'PRUEFSTAND-GUTHABEN-MARKE';

  test('ein Guthaben-Stopp wird angenommen und als Ergebnis geschrieben', () => {
    // Gemessen wird die WIRKUNG: es entsteht ein Ergebnis mit dem Stopp. Ein
    // Test auf „steht da ein return" überlebte jede Mutation, die den Zweig
    // umdreht — das Wort stünde weiter da.
    rmSync(ERGEBNIS, { force: true });
    const r = fahre(`${IMPORT}
      const fehler = new Error('scout: OpenRouter lehnt jeden Modellaufruf mangels Guthaben ab.');
      fehler.guthabenStopp = m.guthabenStoppErgebnis('accessibility', ${JSON.stringify(MARKE)});
      console.log(JSON.stringify({ angenommen: m.guthabenStoppAnnehmen(fehler) }));`);
    expect(r.angenommen, 'der Ausgang nimmt den Guthaben-Stopp nicht an').toBe(true);
    expect(existsSync(ERGEBNIS), 'es entsteht kein Ergebnis — der Stopp bliebe unsichtbar').toBe(true);
    const ergebnis = JSON.parse(readFileSync(ERGEBNIS, 'utf8'));
    expect(ergebnis.stopp).toBe('guthaben');
    expect(ergebnis.changed).toBe(false);
    expect(ergebnis.kosten).toBe(0);
    expect(ergebnis.scout.why_now).toContain(MARKE);
    expect(ergebnis.scout.target_files, 'ein tokenfreier Stopp nennt Zieldateien').toEqual([]);
  });

  test('ein gewöhnlicher Fehler wird NICHT angenommen und bleibt rot', () => {
    // Die Gegenprobe, und sie trägt den Beweis: ein Merkzeichen liegt schon
    // da. Wird es überschrieben, hat der Ausgang auch einen echten Defekt
    // angenommen — und der Workflow wäre nie wieder rot. Ohne diesen Fall
    // bestünde „nimm alles an" den Test darüber ebenso.
    expect(JSON.parse(readFileSync(ERGEBNIS, 'utf8')).scout.why_now,
      'Voraussetzung fehlt: das Merkzeichen des vorigen Falls liegt nicht vor').toContain(MARKE);
    const r = fahre(`${IMPORT}
      console.log(JSON.stringify({
        angenommen: m.guthabenStoppAnnehmen(new Error('Patch erzeugt keine Aenderung.')),
      }));`);
    expect(r.angenommen).toBe(false);
    expect(JSON.parse(readFileSync(ERGEBNIS, 'utf8')).scout.why_now,
      'ein gewöhnlicher Fehler hat ein Stopp-Ergebnis geschrieben').toContain(MARKE);
  });
});

test.describe('Die Teile sind verdrahtet — sonst prüfen sie nichts', () => {
  // Der teuerste wiederkehrende Fehler dieses Projekts ist nicht der falsche
  // Baustein, sondern der, den niemand ruft. Gemessen wird nach Abzug der
  // Kommentare: die Erklärungen oben nennen jeden dieser Namen mehrfach.
  const code = ohneJsKommentare(QUELLE);

  test('die Vorprüfung ruft das Kontoguthaben wirklich ab', () => {
    expect(code, 'ohne den Abruf ist der frühe Ausstieg tot — genau der Zustand vor dem 23.09.')
      .toMatch(/apiJson\(`\$\{API\}\/credits`/);
    expect(code, 'das Ergebnis des Abrufs wird nirgends ausgewertet').toContain('guthabenAusKonto(kontoInfo)');
    expect(code).toContain('bindendesGuthaben(remaining, kontoGuthaben)');
  });

  test('der Rollenlauf fragt die 402-Wache, bevor er das Schema beschuldigt', () => {
    const rumpf = code.slice(code.indexOf('kein Modell lieferte auswertbares') - 1200,
      code.indexOf('kein Modell lieferte auswertbares'));
    expect(rumpf, 'die Wache steht nicht vor der Schema-Meldung — dann meldet sie weiter das Falsche')
      .toContain('istGuthabenStopp(fehler)');
  });

  test('der Ausgang des Skripts nimmt den Stopp an', () => {
    expect(code, 'der Ausgang ruft guthabenStoppAnnehmen nicht — dann bleibt jeder Lauf rot')
      .toContain('if (guthabenStoppAnnehmen(error)) return;');
  });

  test('die Vorprüfung wirft nicht mehr, sie stoppt tokenfrei', () => {
    // Der alte Wurf machte aus einem Betriebszustand einen roten Lauf.
    expect(code).not.toContain('OpenRouter-Kostenbremse');
    expect(code).toContain("stopp: 'guthaben'");
  });

  test('„unbekannt" sieht nicht mehr aus wie „in Ordnung"', () => {
    // Die alte Zeile war wahr und trotzdem eine Entwarnung, die sie nicht
    // decken konnte. Gemessen wird der Text, den der Lauf ausgibt.
    expect(code).not.toContain('Schluessel ohne eigenes Limit');
    expect(code).toContain('Guthaben UNBEKANNT');
  });
});

test.describe('Der Selbsttest bleibt das schnelle Tor', () => {
  test('npm run test:agents deckt die Guthaben-Regeln mit ab', () => {
    const aus = execFileSync(process.execPath, [SKRIPT, '--self-test'],
      { cwd: WURZEL, encoding: 'utf8', timeout: 60000 });
    expect(aus).toContain('Guardrail-Selbsttest OK');
    const code = ohneJsKommentare(QUELLE);
    for (const name of ['istGuthabenFehler(', 'istGuthabenStopp(', 'guthabenAusKonto(', 'bindendesGuthaben(']) {
      const imSelbsttest = code.slice(code.indexOf('function selfTest()')).includes(name);
      expect(imSelbsttest, `${name} steht nicht im Selbsttest — das schnelle Tor sähe den Fall nicht`).toBe(true);
    }
  });
});
