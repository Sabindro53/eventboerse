// Der Ensemble-Puls darf nicht an seiner eigenen Vorbedingung sterben.
//
// Gemeldet am 26.08.: „All jobs have failed". Nachgemessen: seit dem 23.08.
// war JEDER Lauf rot — rund 50 am Tag, drei Tage lang, ohne dass eine
// einzige Schicht gearbeitet hat.
//
// Zwei getrennte Fehler, beide hier festgehalten:
//
//   1. Der Vorlade-Schritt holte `assets/eb-arbeit.json` per anonymem curl
//      aus dem offenen Netz. Diese Datei gibt `eb_hq_zugang_offen()` aber
//      bewusst NICHT heraus — öffentlich sind nur eb-knowledge.json und
//      eb-demo-feed.json. Der Abruf konnte also nie gelingen. Der Schritt
//      brach hart ab, der Rollen-Schritt hat kein `if: always()` und wurde
//      übersprungen — und der Schritt, der eine gültige Spur hochlädt,
//      läuft nur bei geändertem Journal. Eine Automatik, die ihre eigene
//      Vorbedingung erzeugt und daran scheitert, steht für immer.
//
//   2. `scripts/agent.mjs` benutzte `aktuelleAufgabe` im Zweig „kein
//      Schlüssel", deklarierte es aber erst darunter. Der Ausfall, der als
//      `uebersprungen` im Journal stehen soll, endete in einem
//      ReferenceError — vor dem ersten Journaleintrag. Genau der Ausfall,
//      den der Zweig sichtbar machen soll, wurde dadurch unsichtbar.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const WF = fs.readFileSync(
  path.join(ROOT, '.github', 'workflows', 'hq-operations.yml'), 'utf8');

/** Der Rumpf eines Workflow-Schritts, vom Namen bis zum nächsten `- name:`. */
function schritt(name) {
  const von = WF.indexOf(`- name: ${name}`);
  expect(von, `Schritt „${name}" fehlt im Workflow`).toBeGreaterThan(-1);
  const bis = WF.indexOf('\n      - name:', von + 10);
  return WF.slice(von, bis > von ? bis : WF.length);
}

test.describe('HQ-Puls: der Lauf überlebt eine unlesbare Laufzeitspur', () => {
  test('die Spur wird nicht mehr aus dem offenen Netz geholt', () => {
    // eb-arbeit.json steht hinter der HQ-Zugangssperre. Ein anonymer Abruf
    // bekommt sie nie — der Schritt konnte gar nicht gelingen.
    const s = schritt('Bestehende Laufzeitspur vorladen');
    expect(s, 'die Spur wird wieder per HTTP geholt').not.toMatch(/curl/);
    expect(s, 'die Spur wird nicht per SFTP geholt').toMatch(/lftp/);

    // Gegenprobe am Code: die Datei ist wirklich nicht öffentlich.
    const functions = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
    const oeffentlich = (functions.match(/\$oeffentlich = array\(([^)]*)\)/) || [, ''])[1];
    expect(oeffentlich, 'eb-arbeit.json ist öffentlich geworden')
      .not.toMatch(/eb-arbeit/);
  });

  test('ein Fehlschlag beim Vorladen stoppt den Puls nicht', () => {
    // Das ist der Kern: vorher `exit 1`, und damit stand alles.
    const s = schritt('Bestehende Laufzeitspur vorladen');
    expect(s, 'der Vorlade-Schritt bricht den Lauf weiterhin ab')
      .not.toMatch(/exit 1/);
    // Aber er schweigt auch nicht.
    expect(s, 'der Ausfall wird nicht sichtbar gemacht')
      .toMatch(/nicht lesbar/);
    // Und zwar DIE AUSFALLZEILE selbst, nicht irgendeine im Schritt: die
    // Summary sieht nur, wer sie im Browser aufmacht; das Log steht in
    // jeder API und in jedem Werkzeug, das den Lauf spaeter untersucht.
    const ausfallzeile = (s.match(/^.*nicht lesbar.*$/m) || [''])[0];
    expect(ausfallzeile, 'der Ausfall geht nicht ins Log, nur in die Summary')
      .toMatch(/tee -a/);
  });

  test('das Werkzeug steht bereit, bevor es gebraucht wird', () => {
    // lftp wurde früher erst nach dem Vorladen installiert. Wer die Spur
    // per SFTP liest, braucht es vorher — sonst ist der Fallback der
    // Normalfall.
    const iInstall = WF.indexOf('apt-get install -y -qq lftp');
    const iVorladen = WF.indexOf('- name: Bestehende Laufzeitspur vorladen');
    expect(iInstall, 'lftp wird nicht mehr installiert').toBeGreaterThan(-1);
    expect(iInstall, 'lftp wird erst nach dem Vorladen installiert')
      .toBeLessThan(iVorladen);
    // Und nur einmal — ein zweiter Install-Schritt kostet in jedem Lauf.
    expect((WF.match(/apt-get install -y -qq lftp/g) || []).length).toBe(1);
  });
});

test.describe('HQ-Puls: ein Ausfall steht im Journal', () => {
  /** Führt eine Schicht in einer Kopie des Repos aus, ohne Schlüssel. */
  function schichtOhneSchluessel() {
    const kopie = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-puls-'));
    // Nur was der Lauf braucht — das Journal wird dabei verändert.
    for (const rel of ['scripts', 'assets']) {
      fs.cpSync(path.join(ROOT, rel), path.join(kopie, rel), { recursive: true });
    }
    fs.writeFileSync(path.join(kopie, 'kontext.txt'), 'Testkontext');
    const umgebung = { ...process.env };
    delete umgebung.OPENROUTER_API_KEY;
    delete umgebung.EB_OPENROUTER_API_KEY;
    let code = 0, aus = '';
    try {
      aus = execFileSync('node', [path.join(kopie, 'scripts', 'agent.mjs'),
        '--rolle', 'llama-arch', '--kontext', 'kontext.txt', '--anlass', 'Test'],
        { cwd: kopie, env: umgebung, encoding: 'utf8' });
    } catch (e) {
      code = e.status ?? 1;
      aus = String(e.stdout || '') + String(e.stderr || '');
    }
    const journal = JSON.parse(
      fs.readFileSync(path.join(kopie, 'assets', 'eb-arbeit.json'), 'utf8'));
    fs.rmSync(kopie, { recursive: true, force: true });
    return { code, aus, journal };
  }

  test('ohne Schlüssel wird die Schicht sauber übersprungen', () => {
    const r = schichtOhneSchluessel();
    expect(r.code, `die Schicht stürzt ab statt auszusteigen:\n${r.aus}`).toBe(0);
    expect(r.aus).toMatch(/übersprungen/);
  });

  test('der Ausfall landet wirklich im Journal', () => {
    // Ein Dashboard, das Vollzähligkeit vortäuscht, ist schlimmer als eines,
    // das eine Lücke zeigt. Genau das war der Zustand: der ReferenceError
    // knallte VOR dem Eintrag.
    const r = schichtOhneSchluessel();
    const neu = r.journal.eintraege[0];
    expect(neu, 'das Journal ist leer geblieben').toBeTruthy();
    expect(neu.ergebnis, 'der Ausfall steht nicht als übersprungen im Journal')
      .toBe('uebersprungen');
    // Und er nennt, woran gearbeitet worden wäre — sonst ist der Eintrag
    // eine leere Hülle.
    expect(neu.aufgabe, 'der Eintrag nennt die Aufgabe nicht').toBeTruthy();
    expect(String(neu.aufgabe)).not.toMatch(/undefined/);
    expect(Number.isInteger(neu.aufgabeIndex)).toBe(true);
  });
});
