// Aus Befunden wird Arbeit — und der Sicherheitsrahmen bleibt, wo er ist.
//
// Die Lücke, die der Auftragsstrom schließt: elf Rollen laufen alle 30 Minuten
// und schreiben Befunde ins Arbeitsjournal. Der Autopilot suchte sich seine
// Aufgabe davon völlig unabhängig selbst. Das Haus fand also Dinge, und
// niemand arbeitete daran.
//
// Die gefährliche Stelle dabei ist NICHT das Finden, sondern das Weiterreichen:
// ein Strom, der eine Datei außerhalb des freigegebenen Rahmens anbietet, würde
// den Autopiloten auf Backend, Auth oder Zahlungen zeigen.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const QUELLE = fs.readFileSync(path.join(ROOT, 'scripts', 'auftragsstrom.mjs'), 'utf8');
const AGENTEN = fs.readFileSync(path.join(ROOT, 'scripts', 'openrouter-agents.mjs'), 'utf8');

async function bauen(eintraege, jetzt) {
  const { auftragsstromBauen } = await import(
    require('node:url').pathToFileURL(path.join(ROOT, 'scripts', 'auftragsstrom.mjs')).href);
  return auftragsstromBauen({ version: 1, aktualisiert: '2026-08-13T00:00:00.000Z', eintraege }, jetzt);
}
async function whitelist() {
  const { SICHERE_DATEIEN } = await import(
    require('node:url').pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'sichere-dateien.mjs')).href);
  return SICHERE_DATEIEN;
}

const JETZT = Date.parse('2026-08-13T12:00:00.000Z');
const eintrag = (over = {}) => ({
  zeit: '2026-08-13T11:00:00.000Z', rolle: 'deepseek-code', person: 'Kito Sarr',
  rollenname: 'Code-Prüfer', bereich: 'engineering', ergebnis: 'fertig',
  aufgabe: 'Prüfen', text: 'Ein Fehler im Modal-Fokus.',
  dateien: ['js/modules/ui/31-modals-toast-qabot.js'], ...over,
});

test.describe('Auftragsstrom: aus Befunden wird Arbeit', () => {
  test('ein Befund im Rahmen wird zum Auftrag — mit Herkunft', async () => {
    const s = await bauen([eintrag()], JETZT);
    expect(s.auftraege).toHaveLength(1);
    const a = s.auftraege[0];
    // Ohne Herkunft wäre es erfundene Arbeit.
    expect(a.quelle.rolle).toBe('deepseek-code');
    expect(a.quelle.person).toBe('Kito Sarr');
    expect(a.quelle.zeit).toBe('2026-08-13T11:00:00.000Z');
    expect(a.befund).toContain('Modal-Fokus');
    expect(a.dateien).toEqual(['js/modules/ui/31-modals-toast-qabot.js']);
    expect(a.warum, 'die Reihung wird nicht begründet').toBeTruthy();
  });

  test('KEIN Auftrag verlässt je den freigegebenen Rahmen', async () => {
    // Die tragende Sicherheitsregel. Ein Befund über functions.php darf nicht
    // zum Auftrag werden — auch nicht als Beifang neben einer erlaubten Datei.
    const erlaubt = await whitelist();
    const s = await bauen([
      eintrag({ dateien: ['functions.php'] }),
      eintrag({ dateien: ['webauthn.php', '.github/workflows/ionos-deploy.yml'] }),
      eintrag({ dateien: ['js/modules/ui/31-modals-toast-qabot.js', 'functions.php'] }),
    ], JETZT);

    for (const a of s.auftraege) {
      for (const d of a.dateien) {
        expect(Object.hasOwn(erlaubt, d), `${a.id} nennt ${d} — außerhalb des Rahmens`).toBe(true);
      }
    }
    // Der Mischfall: die erlaubte Datei bleibt, die verbotene wird ausgeklammert
    // und NICHT stillschweigend mitgeführt.
    const gemischt = s.auftraege.find((a) => a.dateien.includes('js/modules/ui/31-modals-toast-qabot.js'));
    expect(gemischt, 'der erlaubte Anteil geht verloren').toBeTruthy();
    expect(gemischt.dateien).not.toContain('functions.php');
    expect(gemischt.ausgeklammert, 'die verbotene Datei verschwindet spurlos').toContain('functions.php');
  });

  test('Ausschlüsse stehen mit Grund da, nicht im Papierkorb', async () => {
    // Eine Schlange, die nur Aufnahmen führt, sieht aus wie ein Haus ohne
    // Grenzen. Wer nicht reinkommt, muss mit Grund daneben stehen.
    const s = await bauen([
      eintrag({ dateien: ['functions.php'] }),
      eintrag({ ergebnis: 'uebersprungen', text: '' }),
      eintrag({ zeit: '2026-08-01T00:00:00.000Z' }),
    ], JETZT);
    expect(s.ausserhalb.length, 'der Rahmen-Ausschluss fehlt').toBeGreaterThan(0);
    expect(s.ausserhalb[0].grund).toMatch(/functions\.php.*außerhalb/);
    expect(s.verworfen.length, 'übersprungene und alte Einträge fehlen').toBeGreaterThan(0);
    expect(s.verworfen.map((v) => v.grund).join(' ')).toMatch(/uebersprungen|übersprungen/);
    expect(s.verworfen.map((v) => v.grund).join(' ')).toMatch(/älter als \d+ h/);
    for (const v of [...s.ausserhalb, ...s.verworfen]) {
      expect(v.herkunft?.person, 'ein Ausschluss ohne Herkunft ist nicht nachprüfbar').toBeTruthy();
    }
  });

  test('leer ist eine Aussage, fehlend eine andere', async () => {
    const leer = await bauen([], JETZT);
    expect(leer.auftraege).toHaveLength(0);
    expect(leer.lage, 'ein leerer Strom sagt nicht, dass er leer ist').toMatch(/Kein Befund/);

    const { auftragsstromBauen } = await import(
      require('node:url').pathToFileURL(path.join(ROOT, 'scripts', 'auftragsstrom.mjs')).href);
    const fehlt = auftragsstromBauen(null, JETZT);
    expect(fehlt.lage, 'ein fehlendes Journal wird mit einem leeren verwechselt')
      .toMatch(/nicht lesbar/);
    expect(fehlt.lage).not.toMatch(/^Kein Befund/);
  });

  test('dringendere Befunde stehen oben', async () => {
    const s = await bauen([
      eintrag({ text: 'Kleine Uneinheitlichkeit beim Abstand.', zeit: '2026-08-13T11:30:00.000Z' }),
      eintrag({ text: 'Ein Fehler bricht die Tastaturbedienung.', zeit: '2026-08-13T11:00:00.000Z' }),
    ], JETZT);
    expect(s.auftraege[0].befund, 'der Fehler steht nicht oben').toMatch(/Fehler/);
    expect(s.auftraege[0].rang).toBeGreaterThan(s.auftraege[1].rang);
  });

  test('der Autopilot sieht den Strom — und teilt sich den Rahmen, statt ihn zu kopieren', () => {
    // Eine Kopie der Whitelist wäre ein Drift-Risiko MIT Sicherheitsfolge:
    // der Strom könnte eine Datei anbieten, die der Autopilot nicht anfassen
    // darf — ein Vorschlag, der immer abgelehnt wird, sieht aus wie Arbeit.
    expect(QUELLE, 'der Strom kopiert die Whitelist').not.toMatch(/const SICHERE_DATEIEN\s*=\s*Object\.freeze/);
    expect(QUELLE).toMatch(/import \{ SICHERE_DATEIEN \} from '\.\/lib\/sichere-dateien\.mjs'/);
    expect(AGENTEN, 'der Autopilot kopiert die Whitelist').not.toMatch(/const SICHERE_DATEIEN\s*=\s*Object\.freeze/);
    expect(AGENTEN).toMatch(/from '\.\/lib\/sichere-dateien\.mjs'/);
    // Und der Scout bekommt ihn wirklich zu sehen.
    expect(AGENTEN, 'der Scout sieht den Auftragsstrom nicht').toMatch(/AUFTRAGSSTROM/);
    expect(AGENTEN, 'die Dateiprüfung wurde entfernt').toMatch(/pruefeDateiliste\(scout\.target_files\)/);
  });

  test('Prüfung läuft sauber durch', () => {
    const { execFileSync } = require('node:child_process');
    execFileSync('node', ['scripts/auftragsstrom.mjs'], { cwd: ROOT });
    execFileSync('node', ['scripts/auftragsstrom.mjs', '--check'], { cwd: ROOT });
  });
});
