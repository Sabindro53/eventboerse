// Einen Workflow-Schritt ausschneiden und so fahren, wie GitHub ihn fährt.
//
// Gebaut für recherche-schleuse.spec.js, am selben Tag gebraucht von
// claude-improve.spec.js. Zwei Suiten, die denselben Schnitt von Hand
// nachbauen, driften — genau daran ist hier schon der JS-Kommentar-Entferner
// zweimal auseinandergelaufen. Deshalb steht der Griff einmal.
//
// Bewusst kein YAML-Parser: das Projekt hat keinen als Abhängigkeit, und
// eine neue Abhängigkeit nur für Tests ist eine Lieferkettenfrage. Die
// Workflows dieses Repos rücken Schritte einheitlich mit sechs Leerzeichen
// ein; ein Schritt, den der Schnitt nicht findet, bricht laut ab, statt
// still nichts zu prüfen.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

/** Liefert die Schnittwerkzeuge für genau eine Workflow-Datei. */
function workflowSchritte(datei) {
  const text = () => fs.readFileSync(datei, 'utf8');
  const koepfe = () => [...text().matchAll(/^ {6}- name: (.+)$/gm)];

  /** Ein Schritt, vom `- name:` bis vor den nächsten; null, wenn es ihn nicht gibt. */
  function schritt(name) {
    const t = text();
    const kopf = koepfe();
    const i = kopf.findIndex((m) => m[1].trim() === name);
    if (i < 0) return null;
    const ende = i + 1 < kopf.length ? kopf[i + 1].index : t.length;
    return t.slice(kopf[i].index, ende);
  }

  /** Alle Schritte mit Namen und Rumpf. */
  function alle() {
    return koepfe().map((m) => m[1].trim()).map((name) => ({ name, block: schritt(name) }));
  }

  return { text, schritt, alle };
}

/** Der `run: |`-Block eines Schritts, Einrückung abgezogen; null ohne Block. */
function laufBlock(block) {
  const m = block && block.match(/^([ \t]+)run:[ \t]*\|[ \t]*\n/m);
  if (!m) return null;
  const tiefer = new RegExp(`^(?:${m[1]}[ \\t]|[ \\t]*$)`);
  const zeilen = [];
  for (const z of block.slice(m.index + m[0].length).split('\n')) {
    if (!tiefer.test(z)) break;
    zeilen.push(z.slice(m[1].length + 2));
  }
  return zeilen.join('\n');
}

/**
 * Fährt ein Skript wie GitHub einen `run:`-Block ohne `shell:` fährt:
 * `bash -e`, bewusst OHNE pipefail. Ein Tor, das nur mit pipefail hält,
 * hält in einem Job ohne `defaults: run: shell: bash` nicht.
 */
function fahreWieGithub(skript, cwd, env = {}) {
  return spawnSync('bash', ['--noprofile', '--norc', '-e', '-c', skript], {
    cwd, encoding: 'utf8', env: { ...process.env, ...env },
  });
}

/** Ausdrücke, die einen Eingabewert in den Shell-Quelltext kopieren würden. */
const EINGABE_IM_SKRIPT = /\$\{\{\s*(github\.event\.inputs|inputs|steps\.[\w-]+\.outputs)\./;

/**
 * Zerlegt eine Workflow-Datei in ihre Jobs: `[{ id, block }]`.
 *
 * Stand bis zum 29.10.2026 als lokale Fassung in `tore.spec.js`. Als
 * `ci-zeitlimit.spec.js` dieselbe Zerlegung brauchte, ist sie hierher
 * gewandert statt ein zweites Mal entstanden — denselben Weg sind die
 * Schnittwerkzeuge oben schon gegangen, und der JS-Kommentar-Entferner
 * zweimal nicht.
 *
 * Geschnitten wird ab `jobs:`, nicht über die ganze Datei: `on:` trägt
 * einen Schlüssel `pull_request`, und der sieht auf zwei Ebenen Einrückung
 * aus wie ein Job. Genau daran hat ein erster Entwurf in `tore.spec.js`
 * einen Job erfunden, der keiner ist.
 */
function workflowJobs(datei) {
  const text = fs.readFileSync(datei, 'utf8');
  const ab = text.indexOf('\njobs:');
  if (ab < 0) return [];
  const rumpf = text.slice(ab);
  const kopf = [...rumpf.matchAll(/^ {2}([A-Za-z0-9_-]+):[ \t]*$/gm)];
  return kopf.map((m, i) => ({
    id: m[1],
    block: rumpf.slice(m.index + m[0].length,
      i + 1 < kopf.length ? kopf[i + 1].index : rumpf.length),
  }));
}

module.exports = {
  workflowSchritte, laufBlock, fahreWieGithub, EINGABE_IM_SKRIPT, workflowJobs,
};
