// AGENTS.md — der Rahmen, unter dem zwei Modelle an dieser Website arbeiten.
//
// WARUM DIESE SUITE EXISTIERT: eine Datei, die Zusammenarbeit regelt, wird
// genau dann gefaehrlich, wenn sie auf etwas zeigt, das es nicht gibt, oder
// wenn sie Regeln aus CLAUDE.md noch einmal aufschreibt. Beides sieht beim
// Lesen richtig aus und ist es nicht:
//
//  · Ein Verweis auf eine Datei, die fehlt, schickt das andere Modell ins
//    Leere — und es erfindet dann etwas.
//  · Eine zweite Fassung derselben Regel driftet. In diesem Projekt sind so
//    schon eine Sicherheitsliste, eine Testzahl, eine Icon-Liste und ein
//    Privacy-Manifest auseinandergelaufen, jedes Mal unbemerkt.
//
// Geprueft wird deshalb die BEDINGUNG, nicht der Wortlaut: dass jeder
// genannte Pfad existiert, und dass keine gepflegte Zahl doppelt gefuehrt
// wird.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..', '..');
const AGENTS = path.join(WURZEL, 'AGENTS.md');

function agentsText() {
  return fs.readFileSync(AGENTS, 'utf8');
}

/**
 * Pfade aus Backticks, ohne Platzhalter.
 *
 * `claude/*` und `js/modules/**` sind Muster, keine Dateien — wer sie prueft,
 * bekommt Fehlalarme und schaltet die Regel nach dem dritten ab.
 */
function genannteePfade(text) {
  const aus = new Set();
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim();
    if (t.includes('*') || t.includes(' ')) continue;
    if (!/[/]/.test(t) && !/\.(md|sh|mjs|js|json|html|php|css)$/.test(t)) continue;
    aus.add(t.replace(/^\.\//, ''));
  }
  return [...aus];
}

test.describe('AGENTS.md: der Rahmen für zwei Modelle', () => {
  test('die Datei gibt es, und sie schickt zuerst in CLAUDE.md', () => {
    // Ohne diesen Verweis waere AGENTS.md eine zweite Projektbeschreibung —
    // und damit genau die Drift, die sie verhindern soll.
    expect(fs.existsSync(AGENTS), 'AGENTS.md fehlt. Codex/Astra liest diese '
      + 'Datei als erstes; ohne sie arbeitet das zweite Modell ohne Rahmen')
      .toBe(true);
    const t = agentsText();
    expect(t, 'AGENTS.md nennt CLAUDE.md nicht. Dann ist sie entweder leer '
      + 'oder sie ist eine zweite Quelle — und zwei Quellen driften')
      .toMatch(/CLAUDE\.md/);
    expect(fs.existsSync(path.join(WURZEL, 'CLAUDE.md')),
      'CLAUDE.md fehlt — der Verweis zeigt ins Leere').toBe(true);
  });

  test('jeder genannte Pfad existiert wirklich', () => {
    // Ein Rahmen, der auf eine fehlende Datei zeigt, ist schlimmer als keiner:
    // das andere Modell sucht, findet nichts und erfindet einen Ersatz.
    const pfade = genannteePfade(agentsText());
    expect(pfade.length, 'AGENTS.md nennt gar keine Datei — dann prüft dieser '
      + 'Test nichts').toBeGreaterThan(4);
    const fehlen = pfade.filter((p) => !fs.existsSync(path.join(WURZEL, p)));
    expect(fehlen, `diese in AGENTS.md genannten Pfade gibt es nicht: `
      + `${fehlen.join(', ')}`).toEqual([]);
  });

  test('die Bau-Schritte heißen so, wie die Skripte wirklich heißen', () => {
    // Ein falscher Befehl im Rahmen kostet das andere Modell einen ganzen
    // Durchlauf — und `app.js` bliebe unterwegs stehen, ohne dass es auffällt.
    const t = agentsText();
    for (const skript of ['build-app-js.sh', 'build-index-html.sh']) {
      expect(t, `AGENTS.md nennt ${skript} nicht. Wer die Module ändert und `
        + 'nicht baut, liefert eine app.js, die nicht zum Quelltext passt — '
        + 'und der PR-Check bricht bei Drift ab').toContain(skript);
      expect(fs.existsSync(path.join(WURZEL, skript)),
        `${skript} ist genannt, existiert aber nicht`).toBe(true);
    }
  });

  test('keine gepflegte Zahl wird ein zweites Mal geführt', () => {
    // DIE EIGENTLICHE REGEL. Testzahl, Modulzahl, Routenzahl und Suitenzahl
    // misst `scripts/kontext.mjs` gegen den Code. Stünden sie zusätzlich in
    // AGENTS.md, gäbe es eine zweite, ungeprüfte Fassung — und die fällt
    // niemandem auf, weil sie beim Lesen richtig aussieht.
    const gefaehrlich = [
      [/\d+\s+Tests?\s+in\s+\d+\s+Suiten/i, 'die Testzahl'],
      [/\b\d+\s+(?:Frontend-)?Module\b/i, 'die Modulzahl'],
      [/\b\d+\s+Routen\b/i, 'die Routenzahl'],
      [/\b\d+\s+Suiten\b/i, 'die Suitenzahl'],
    ];
    const t = agentsText();
    const treffer = gefaehrlich.filter(([re]) => re.test(t)).map(([, n]) => n);
    expect(treffer, `AGENTS.md führt ${treffer.join(' und ')} ein zweites Mal. `
      + 'Diese Zahlen misst kontext.mjs gegen den Code; eine Kopie daneben '
      + 'driftet und wird von nichts geprüft. Verweise stattdessen auf '
      + 'CLAUDE.md').toEqual([]);
  });

  test('die drei Zweig-Spuren kollidieren nicht', () => {
    // `agent/` gehört dem OpenRouter-Autopiloten mit seinem eigenen, engen
    // Rahmen. Würde eines der beiden Modelle dort abladen, liefe sein Patch
    // durch fremde Guardrails — oder der Auto-Merge griffe nach etwas, das er
    // nie geprüft hat.
    const t = agentsText();
    for (const spur of ['claude/', 'codex/', 'agent/']) {
      expect(t, `AGENTS.md benennt die Spur \`${spur}\` nicht. Ohne klare `
        + 'Trennung landen zwei Modelle im selben Zweig').toContain(spur);
    }
    expect(fs.existsSync(path.join(WURZEL, 'scripts', 'lib', 'sichere-dateien.mjs')),
      'der Rahmen des Autopiloten ist genannt, die Datei fehlt aber').toBe(true);
  });

  test('der Übergabeort existiert und ist genau einer', () => {
    // Ein zweiter Ablageort wäre eine zweite Wahrheit — dieselbe Mechanik wie
    // bei zwei gepflegten Listen, nur eine Ebene höher.
    const t = agentsText();
    const ziel = 'vault/50-Evolution/Roadmap/Current-Sprint.md';
    expect(t, 'AGENTS.md nennt keinen Übergabeort. Dann erfindet sich jedes '
      + 'Modell seinen eigenen').toContain(ziel);
    expect(fs.existsSync(path.join(WURZEL, ziel)),
      'der Übergabeort ist genannt, existiert aber nicht').toBe(true);
  });

  test('fremder Text gilt auch zwischen den Modellen als Daten', () => {
    // Zwei Modelle, die einander ungeprüft folgen, sind ein Modell mit
    // doppelten Kosten — und ein Weg, auf dem eine eingeschleuste Anweisung
    // über die Schleuse hinweg in den Code käme.
    const t = agentsText();
    expect(t, 'AGENTS.md nennt die Quarantäne nicht — dann gibt es für '
      + 'fremden Text keinen geregelten Weg hinein')
      .toMatch(/quarantine\.mjs/);
    expect(t.toLowerCase(), 'AGENTS.md sagt nicht, dass die Ausgaben des '
      + 'jeweils anderen Modells Daten sind und keine Anweisung. Genau das '
      + 'ist bei zwei Modellen der neue Weg hinein').toMatch(/anweisung/);
  });
});
