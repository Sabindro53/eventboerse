// Der Auftrag darf nicht mehr verlangen, als das Budget hergibt.
//
// Gemeldet am 26.08.: vier von elf Rollen liefern in jedem Lauf nichts.
// Nachgemessen an den Läufen 905, 908 und 910 — immer dieselbe Meldung:
//
//   ✗ Mira Yun  — Antwort am Tokenlimit abgeschnitten (240 Token)
//   ✗ Ben Oduya — Antwort am Tokenlimit abgeschnitten (180 Token)
//
// Die Ursache war kein zu kleines Limit, sondern ein Widerspruch: der
// Systemauftrag endete für ALLE elf Rollen mit „in höchstens 90 Wörtern",
// während die Budgets zwischen 180 und 300 Token lagen — in zwei
// verschiedenen Dateien gepflegt, ohne dass irgendetwas am Zuschnitt einer
// Rolle den Unterschied begründet hätte. Sechs Rollen konnten die Anweisung
// physisch nicht befolgen; wer es versuchte, wurde abgeschnitten, und der
// Lauf bezahlte die vollen Token für nichts.
//
// Geprüft wird deshalb die BEZIEHUNG zwischen beiden Zahlen, nicht die Zahl:
// ein Test auf „315" wäre nach der nächsten Anpassung wertlos und sähe dabei
// bestanden aus.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const AGENT = fs.readFileSync(path.join(ROOT, 'scripts', 'agent.mjs'), 'utf8');
const MODELS = fs.readFileSync(path.join(ROOT, 'scripts', 'models.mjs'), 'utf8');
const KATALOG = path.join(ROOT, 'assets', 'eb-models.json');

/** Die Konstanten, so wie der Betrieb sie sieht. */
async function grenze() {
  return import(
    'file://' + path.join(ROOT, 'scripts', 'lib', 'antwortgrenze.mjs'));
}

test.describe('Antwortgrenze: Auftrag und Budget kommen aus einer Zahl', () => {
  test('das Budget trägt die Wortgrenze des Auftrags', async () => {
    const { WORTGRENZE, TOKEN_JE_WORT, MIN_ANTWORT_TOKENS } = await grenze();
    expect(MIN_ANTWORT_TOKENS).toBe(Math.ceil(WORTGRENZE * TOKEN_JE_WORT));

    // Und der Faktor deckt den schlechtesten gemessenen Fall ab. Ela Voss
    // brauchte für 58 Wörter bis zu 3,45 Token je Wort — und blieb dabei
    // weit unter der erlaubten Länge. Ein Faktor darunter würde denselben
    // Fehler wieder erzeugen, nur unsichtbar: abgeschnitten wird erst im
    // Betrieb, nicht im Test.
    expect(TOKEN_JE_WORT,
      'der Faktor liegt unter dem schlechtesten gemessenen Fall (3,45)')
      .toBeGreaterThanOrEqual(3.45);
  });

  test('das Budget FOLGT der Wortgrenze, es steht nicht daneben', async () => {
    // Die Gleichung oben allein genuegt nicht: ersetzt jemand die Ableitung
    // durch die feste Zahl, die gerade herauskommt, bleibt sie wahr — und
    // beim naechsten Verschieben der Wortgrenze zoege das Budget nicht mit.
    // Genau diese Mutation ueberlebte beim Bauen. Geprueft wird deshalb die
    // Abhaengigkeit: eine groessere Wortgrenze MUSS ein groesseres Budget
    // ergeben.
    const datei = path.join(ROOT, 'scripts', 'lib', 'antwortgrenze.mjs');
    const vorher = fs.readFileSync(datei, 'utf8');
    const gedreht = vorher.replace('export const WORTGRENZE = 90;',
      'export const WORTGRENZE = 120;');
    expect(gedreht, 'die Wortgrenze steht nicht mehr an der erwarteten Stelle')
      .not.toBe(vorher);

    const alt = (await grenze()).MIN_ANTWORT_TOKENS;
    fs.writeFileSync(datei, gedreht);
    let neu;
    try {
      // Frisch laden — ein Modul-Cache wuerde den alten Wert zurueckgeben
      // und den Test stillschweigend gruen faerben.
      neu = (await import(`file://${datei}?v=${Date.now()}`)).MIN_ANTWORT_TOKENS;
    } finally {
      fs.writeFileSync(datei, vorher);
    }
    expect(neu, 'eine groessere Wortgrenze aendert das Budget nicht')
      .toBeGreaterThan(alt);
  });

  test('jede Rolle kann die erlaubte Länge wirklich schreiben', async () => {
    const { MIN_ANTWORT_TOKENS, WORTGRENZE } = await grenze();
    const katalog = JSON.parse(fs.readFileSync(KATALOG, 'utf8'));
    const rollen = katalog.modelle.filter((m) => m.weg === 'openrouter');
    expect(rollen.length, 'keine OpenRouter-Rollen im Katalog')
      .toBeGreaterThan(1);

    const zuKnapp = rollen
      .filter((m) => !(m.maxTokens >= MIN_ANTWORT_TOKENS))
      .map((m) => `${m.person}: ${m.maxTokens}`);
    expect(zuKnapp,
      `diese Rollen können die ${WORTGRENZE} Wörter des Auftrags nicht schreiben`)
      .toEqual([]);
  });

  test('die Zahl im Auftragstext steht nicht mehr fest im Code', async () => {
    const { WORTGRENZE } = await grenze();
    // Genau hier lief es auseinander: die Anweisung stand als Literal in
    // agent.mjs, die Budgets in models.mjs. Zwei Orte, eine Aussage.
    expect(AGENT, 'die Wortgrenze steht wieder als Zahl im Auftragstext')
      .not.toMatch(/höchstens \d+ Wörtern/);
    expect(AGENT, 'der Auftrag nutzt nicht den geteilten Satz')
      .toMatch(/WORTGRENZE_SATZ/);
    // Und das Budget des Aufrufs kommt aus derselben Ableitung.
    expect(AGENT, 'max_tokens hält die abgeleitete Untergrenze nicht ein')
      .toMatch(/max_tokens: Math\.max\([^)]*MIN_ANTWORT_TOKENS\)/);

    const satz = (await grenze()).WORTGRENZE_SATZ;
    expect(satz).toContain(String(WORTGRENZE));
  });

  test('der Katalog leitet die Untergrenze ab, statt sie zu raten', () => {
    expect(MODELS, 'models.mjs kennt die geteilte Grenze nicht')
      .toMatch(/from '\.\/lib\/antwortgrenze\.mjs'/);
    // Die frühere Prüfung liess alles ab 100 Token durch — also auch die
    // 180er, die im Betrieb jedes Mal abgeschnitten wurden.
    expect(MODELS, 'die geratene Untergrenze 100 ist zurück')
      .not.toMatch(/m\.maxTokens < 100/);
    // Und kein per-Rolle-Budget mehr im Arbeitsplan: elf Zahlen, von denen
    // keine begründet war und sechs zu klein.
    expect(MODELS, 'die unbegründeten per-Rolle-Budgets sind zurück')
      .not.toMatch(/anteil: \d+, maxTokens:/);
  });
});

// Diese Tests schreiben assets/eb-models.json kurzzeitig um. Sie MUESSEN
// nacheinander laufen: bei `fullyParallel` aendert einer die Datei, waehrend
// ein anderer sie prueft — zwei Fehlschlaege, die nichts mit der Sache zu
// tun haetten.
test.describe.configure({ mode: 'serial' });

test.describe('Antwortgrenze: das Tor weist ein zu knappes Budget ab', () => {
  // Verhalten, nicht Wortlaut — aber am richtigen Szenario.
  //
  // Erster Versuch: eb-models.json von Hand kleinrechnen und `--check`
  // rufen. Das schlug fehl, aber am DRIFT-Vergleich („ausgelieferter
  // Katalog weicht ab"), bevor die Antwortgrenze überhaupt drankam. Der
  // Test wäre also auch grün geblieben, wenn ich die Regel ganz entfernt
  // hätte — er hätte den Drift-Wächter geprüft und die Regel nie berührt.
  //
  // Der Fall, der wirklich eintreten kann, ist ein Eingriff an der QUELLE:
  // jemand gibt einer Rolle wieder ein eigenes, kleines Budget. Also wird
  // models.mjs manipuliert, der Katalog daraus neu erzeugt (kein Drift) und
  // erst dann geprüft.
  const MODELS_PFAD = path.join(ROOT, 'scripts', 'models.mjs');

  function torMitQuellBudget(tokens) {
    const quelleAlt = fs.readFileSync(MODELS_PFAD, 'utf8');
    const katalogAlt = fs.readFileSync(KATALOG, 'utf8');
    // Die abgeleitete Untergrenze durch ein festes, zu knappes Budget
    // ersetzen — genau der Eingriff, gegen den die Regel schützen soll.
    const quelleNeu = quelleAlt.replace(
      'maxTokens: Math.max(plan.maxTokens || 0, MIN_ANTWORT_TOKENS),',
      `maxTokens: ${tokens},`);
    expect(quelleNeu, 'die Ableitung steht nicht mehr an der erwarteten Stelle')
      .not.toBe(quelleAlt);
    fs.writeFileSync(MODELS_PFAD, quelleNeu);
    try {
      // Erst erzeugen (damit kein Drift entsteht), dann prüfen.
      execFileSync('node', [MODELS_PFAD], { cwd: ROOT, encoding: 'utf8' });
      execFileSync('node', [MODELS_PFAD, '--check'], { cwd: ROOT, encoding: 'utf8' });
      return { ok: true, aus: '' };
    } catch (e) {
      return { ok: false, aus: String(e.stdout || '') + String(e.stderr || '') };
    } finally {
      fs.writeFileSync(MODELS_PFAD, quelleAlt);
      fs.writeFileSync(KATALOG, katalogAlt);
    }
  }

  test('genau die Budgets, die im Betrieb abgeschnitten wurden, fallen durch', async () => {
    const { MIN_ANTWORT_TOKENS } = await grenze();
    // 180 (Ben Oduya), 220 (Rhea Malik), 240 (Mira Yun) — alle drei sind
    // im Betrieb nachweislich am Tokenlimit abgebrochen.
    for (const knapp of [180, 220, 240]) {
      expect(knapp, 'dieser Wert liegt gar nicht mehr unter der Grenze')
        .toBeLessThan(MIN_ANTWORT_TOKENS);
      const r = torMitQuellBudget(knapp);
      expect(r.ok, `ein Budget von ${knapp} Token kommt durch das Tor`).toBe(false);
      // Und zwar an der Antwortgrenze, nicht am Drift-Waechter.
      expect(r.aus, `${knapp} faellt am falschen Pruefer durch`)
        .toMatch(/Antwortgrenze/);
      expect(r.aus).not.toMatch(/weicht ab/);
    }
  });

  test('ein ausreichendes Budget kommt durch', async () => {
    // Gegenprobe am Pruefmittel: ein Tor, das ALLES abweist, prueft nichts.
    const { MIN_ANTWORT_TOKENS } = await grenze();
    const r = torMitQuellBudget(MIN_ANTWORT_TOKENS);
    expect(r.ok, `ein ausreichendes Budget faellt durch:\n${r.aus}`).toBe(true);
  });

  test('der ausgelieferte Katalog ist stimmig', () => {
    let ok = true, aus = '';
    try {
      execFileSync('node', [MODELS_PFAD, '--check'], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      ok = false; aus = String(e.stdout || '') + String(e.stderr || '');
    }
    expect(ok, `der echte Katalog faellt durch:\n${aus}`).toBe(true);
  });
});
