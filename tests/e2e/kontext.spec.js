// Stimmen die Zahlen in CLAUDE.md noch?
//
// CLAUDE.md ist die Datei, die jede Sitzung zuerst liest — und war die
// einzige, die niemand nachmisst. Am 22.08.2026 waren vier Angaben veraltet,
// darunter eine „bekannte Schwäche", die es seit Langem nicht mehr gibt. Wer
// sie liest, sucht ein behobenes Problem; ein veraltetes Steuerungsdokument
// kostet mehr als gar keins, weil es Vertrauen geniesst.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SKRIPT = path.join(ROOT, 'scripts', 'kontext.mjs');
const CLAUDE_MD = path.join(ROOT, 'CLAUDE.md');

/** Führt das Tor aus; gibt Erfolg und Ausgabe zurück, ohne zu werfen. */
function tor() {
  try {
    return { ok: true, aus: execFileSync('node', [SKRIPT, '--check'], { cwd: ROOT, encoding: 'utf8' }) };
  } catch (e) {
    return { ok: false, aus: String(e.stdout || '') + String(e.stderr || '') };
  }
}

/** Ändert CLAUDE.md vorübergehend und stellt den Stand danach wieder her. */
function mitGeaenderterNotiz(alt, neu, fn) {
  const vorher = fs.readFileSync(CLAUDE_MD, 'utf8');
  expect(vorher.includes(alt), `Muster nicht in CLAUDE.md: ${alt}`).toBe(true);
  fs.writeFileSync(CLAUDE_MD, vorher.replace(alt, neu));
  try { return fn(); } finally { fs.writeFileSync(CLAUDE_MD, vorher); }
}

// Diese Tests schreiben CLAUDE.md kurzzeitig um. Sie MÜSSEN nacheinander
// laufen: bei `fullyParallel` änderte ein Test die Datei, während ein anderer
// sie prüfte — zwei Fehlschläge, die nichts mit dem Prüfer zu tun hatten.
test.describe.configure({ mode: 'serial' });

test.describe('Kontext: CLAUDE.md gegen den Code', () => {
  test('der ausgelieferte Stand ist stimmig', () => {
    const r = tor();
    expect(r.ok, r.aus).toBe(true);
    expect(r.aus).toMatch(/Alle prüfbaren Angaben stimmen/);
  });

  test('eine falsche Zahl fällt auf', () => {
    const r = mitGeaenderterNotiz('Quelle des Frontends: 24 Module',
      'Quelle des Frontends: 99 Module', tor);
    expect(r.ok, 'eine erfundene Modulzahl kommt durch').toBe(false);
    expect(r.aus).toMatch(/Frontend-Module/);
  });

  test('eine umformulierte Aussage gilt nicht als bestanden', () => {
    // Der gefährlichste Fall: der Sucher greift ins Leere und das Tor sieht
    // grün aus, obwohl es nichts mehr prüft. Deshalb ist „nicht gefunden"
    // ein Fehler und kein Durchwinken.
    const md = fs.readFileSync(CLAUDE_MD, 'utf8');
    const jetzt = (md.match(/REST API \(\d+ Routen\)/) || [])[0];
    expect(jetzt, 'die Routenzahl steht nicht mehr in CLAUDE.md').toBeTruthy();
    const r = mitGeaenderterNotiz(jetzt, 'REST API (viele Routen)', tor);
    expect(r.ok, 'eine verschwundene Aussage wird stillschweigend übergangen').toBe(false);
    expect(r.aus).toMatch(/nicht mehr gefunden/);
  });

  test('eine mehrdeutige Aussage gilt nicht als bestanden', () => {
    // Passiert beim Dokumentieren von selbst: der Fliesstext zitiert die
    // alte Zahl, und das Muster greift plötzlich zwei Stellen. Dann misst
    // der Prüfer nicht die Aussage, sondern die Reihenfolge im Dokument —
    // und meldete beim Bauen prompt einen Fehler, den es nicht gab.
    const r = mitGeaenderterNotiz('### Der Kontext wird nachgemessen',
      '### Der Kontext wird nachgemessen\n\nFrüher: REST API (86 Routen).', tor);
    expect(r.ok, 'eine doppelt getroffene Aussage kommt durch').toBe(false);
    expect(r.aus).toMatch(/mehrdeutig/);
  });

  test('zwei Dokumente dürfen nicht verschiedene Testzahlen nennen', () => {
    // Beide Zahlen pflege ich von Hand; genau dort läuft es auseinander.
    // Die aktuelle Zahl aus der Datei lesen statt sie hier zu verdrahten —
    // sonst bricht dieser Test bei jedem neuen Test in der Suite.
    const md = fs.readFileSync(CLAUDE_MD, 'utf8');
    const jetzt = (md.match(/(\d+ Tests in \d+ Suiten)/) || [])[1];
    expect(jetzt, 'die Testzahl steht nicht mehr in CLAUDE.md').toBeTruthy();
    const r = mitGeaenderterNotiz(jetzt, jetzt.replace(/^\d+/, '999'), tor);
    expect(r.ok).toBe(false);
    expect(r.aus).toMatch(/Testzahl uneinig/);
  });

  test('die überholte Polling-Angabe kommt nicht zurück', () => {
    // Sie beschrieb eine Schwäche, die es nicht mehr gibt: das Polling
    // beginnt bei 5 s, fällt bis 20 s zurück und pausiert bei verstecktem
    // Tab. Gemessen am Code, nicht an der Notiz.
    const md = fs.readFileSync(CLAUDE_MD, 'utf8');
    expect(md, 'die veraltete 3-Sekunden-Angabe steht wieder da')
      .not.toMatch(/Polling \(alle 3s\)/);
    const chat = fs.readFileSync(
      path.join(ROOT, 'js', 'modules', 'chat', '20-chat-nachrichten.js'), 'utf8');
    const basis = Number((chat.match(/_CHAT_POLL_BASE\s*=\s*(\d+)/) || [, 0])[1]);
    const deckel = Number((chat.match(/_CHAT_POLL_CAP\s*=\s*(\d+)/) || [, 0])[1]);
    expect(basis, 'der Takt ist wieder aggressiver als beschrieben').toBeGreaterThanOrEqual(5000);
    expect(deckel, 'ohne Rückfall pollt ein offener Chat dauerhaft').toBeGreaterThan(basis);
    // Und die Pause bei verstecktem Tab ist der Teil, der den PHP-Pool schont.
    expect(chat, 'kein Anhalten bei verstecktem Tab').toMatch(/document\.hidden/);
  });
});
