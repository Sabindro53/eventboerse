// Findet der Scanner ein Geheimnis, das wirklich da ist?
//
// Anlass: das Repository ist öffentlich, und der Gitleaks-Scan, den GitHub
// als „active" führt, ist seit dem 05.05.2026 kein einziges Mal gelaufen. Er
// wurde auf einem Zweig eingeführt, der nie nach main gemergt wurde — GitHub
// registriert Workflows von jedem Zweig, und ob ihre Datei auf main liegt,
// prüft niemand. Vier Monate scheinbarer Schutz.
//
// Ein Scanner, der auf einem sauberen Repo „nichts gefunden" meldet, beweist
// nichts: ein Scanner, der ÜBERHAUPT nichts findet, meldet dasselbe. Deshalb
// wird hier in ein echtes Wegwerf-Repository ein echtes Schlüsselformat
// gepflanzt — im Baum und, getrennt davon, nur in der Historie.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SKRIPT = path.join(ROOT, 'scripts', 'geheimnisse.mjs');

/**
 * Legt ein Wegwerf-Repository an, spielt die Commits ein und lässt den
 * Scanner darüber laufen.
 *
 * `commits` ist eine Liste von Runden: je ein Objekt {datei: inhalt}. So
 * lässt sich ein Geheimnis einbauen, das im nächsten Commit wieder
 * verschwindet — der Fall, der für ein öffentliches Repo zählt.
 */
function scanne(commits, argumente = []) {
  const heim = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-geheim-'));
  const g = (...a) => execFileSync('git', a, { cwd: heim, encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'test@example.invalid');
  g('config', 'user.name', 'Test');

  for (const runde of commits) {
    // Was in dieser Runde fehlt, wird gelöscht — so entsteht ein Blob, der
    // nur noch in der Historie steht.
    for (const alt of fs.readdirSync(heim).filter((f) => f !== '.git')) {
      fs.rmSync(path.join(heim, alt), { recursive: true, force: true });
    }
    for (const [datei, inhalt] of Object.entries(runde)) {
      fs.mkdirSync(path.dirname(path.join(heim, datei)), { recursive: true });
      fs.writeFileSync(path.join(heim, datei), inhalt);
    }
    g('add', '-A');
    g('commit', '-q', '-m', 'runde');
  }

  // Der Scanner liegt im echten Repo, arbeitet aber auf dem Wegwerf-Baum:
  // sein ROOT ist das Verzeichnis über sich selbst, deshalb wird eine Kopie
  // samt lib/ neben das Prüf-Repo gelegt.
  fs.mkdirSync(path.join(heim, 'scripts', 'lib'), { recursive: true });
  fs.copyFileSync(SKRIPT, path.join(heim, 'scripts', 'geheimnisse.mjs'));
  fs.copyFileSync(path.join(ROOT, 'scripts', 'lib', 'verbotsmuster.mjs'),
    path.join(heim, 'scripts', 'lib', 'verbotsmuster.mjs'));
  g('add', '-A');
  g('commit', '-q', '-m', 'pruefer');

  let aus = '';
  let code = 0;
  try {
    aus = execFileSync('node', [path.join(heim, 'scripts', 'geheimnisse.mjs'), ...argumente],
      { cwd: heim, encoding: 'utf8' });
  } catch (e) {
    code = e.status ?? 1;
    aus = String(e.stdout || '') + String(e.stderr || '');
  }
  fs.rmSync(heim, { recursive: true, force: true });
  return { aus, code };
}

// Echte Schlüsselformate, aber keine echten Schlüssel: frei erfunden und in
// der Länge passend. Ein Test, der einen gültigen Schlüssel enthielte, wäre
// selbst das Leck, das er verhindern soll.
const STRIPE = 'sk_live_' + 'A1b2C3d4E5f6G7h8I9j0K1l2';
const GITHUB = 'ghp_' + 'a'.repeat(36);
const OPENROUTER = 'sk-or-v1-' + '0123456789abcdef'.repeat(2);

test.describe('Geheimnis-Scanner: er findet, was wirklich da ist', () => {
  test('ein Schlüssel im Arbeitsbaum fällt auf und macht das Tor rot', () => {
    const r = scanne([{ 'src/konfig.js': `const key = "${STRIPE}";\n` }], ['--check']);
    expect(r.code, 'ein Stripe-Live-Schlüssel kommt durch das Tor').toBe(1);
    expect(r.aus).toMatch(/Stripe-Live-Schlüssel/);
    // Der Bericht zitiert das Geheimnis NICHT — sonst trägt er es ins Log.
    expect(r.aus, 'der Bericht enthält den Schlüssel im Klartext')
      .not.toContain(STRIPE);
  });

  test('ein gelöschter Schlüssel bleibt in der Historie auffindbar', () => {
    // Der Fall, der für ein öffentliches Repo zählt: committet, im nächsten
    // Commit entfernt — und mit `git clone` weiterhin für jeden abrufbar.
    const commits = [
      { 'src/konfig.js': `const token = "${GITHUB}";\n` },
      { 'src/konfig.js': 'const token = process.env.TOKEN;\n' },
    ];
    const nurBaum = scanne(commits, ['--check']);
    expect(nurBaum.code, 'der Arbeitsbaum ist sauber — das ist richtig so').toBe(0);

    const mitHistorie = scanne(commits, ['--historie']);
    expect(mitHistorie.aus, 'der gelöschte Schlüssel wird nicht mehr gefunden')
      .toMatch(/GitHub-Token/);
  });

  test('ein Verweis auf eine Umgebungsvariable ist kein Fund', () => {
    // `= process.env.X` und `getenv(…)` enthalten kein Geheimnis, sondern
    // einen Verweis darauf. Schlüge der Scanner hier an, wäre er nach dem
    // dritten Fehlalarm abgeschaltet.
    const r = scanne([{
      'src/a.js': 'const apiKey = process.env.OPENROUTER_API_KEY;\n',
      'src/b.php': "$secret = getenv( 'STRIPE_WEBHOOK_SECRET' );\n",
      'src/c.yml': 'OPENAI_API_KEY: ${{ secrets.EB_OPENAI_API_KEY }}\n',
    }], ['--check']);
    expect(r.code, `Fehlalarm auf einem blossen Verweis:\n${r.aus}`).toBe(0);
  });

  test('eine Zeile, die ihren Wert erzeugt, ist kein Fund', () => {
    // Genau dieser Fall kam im echten Repo vor und hätte den Bericht bei
    // jedem Lauf mit demselben Fehlalarm gefüllt.
    const r = scanne([{
      'tests/pruefstand.php':
        "$PASSWORT = 'Pruefstand-Passwort-' . bin2hex( random_bytes( 8 ) );\n",
    }], ['--check']);
    expect(r.code, `Fehlalarm auf einem erzeugten Wert:\n${r.aus}`).toBe(0);
  });

  test('mehrere Schlüsselarten werden erkannt', () => {
    const r = scanne([{
      'a.js': `x = "${OPENROUTER}"\n`,
      'b.txt': '-----BEGIN RSA PRIVATE KEY-----\n',
      'c.env': 'DB=postgres://nutzer:supergeheim123@host/db\n',
    }], ['--check']);
    expect(r.code).toBe(1);
    for (const erwartet of [/OpenRouter/, /Privater Schlüssel/, /Datenbank-URL/]) {
      expect(r.aus, `nicht erkannt: ${erwartet}`).toMatch(erwartet);
    }
  });

  test('das echte Repository ist sauber — Baum und Historie', () => {
    // Die Gegenprobe. Ohne sie wäre ein Scanner, der ALLES meldet, ebenfalls
    // „bestanden" — und dieses Tor stünde ab dem ersten Lauf im Weg.
    let code = 0;
    let aus = '';
    try {
      aus = execFileSync('node', [SKRIPT, '--check'], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      code = e.status ?? 1;
      aus = String(e.stdout || '') + String(e.stderr || '');
    }
    expect(code, `das echte Repo faellt durch:\n${aus}`).toBe(0);
    expect(aus).toMatch(/Kein Zugangsdatum gefunden/);
  });

  test('die Muster stehen bei den anderen Verbotsmustern, nicht in einer Kopie', () => {
    // „Eine Kopie einer Sicherheitsliste driftet immer; die Frage ist nur, in
    // welche Richtung." — der Auto-Merge hatte diesen Fehler schon einmal.
    const skript = fs.readFileSync(SKRIPT, 'utf8');
    expect(skript, 'der Scanner bringt eine eigene Musterliste mit')
      .toMatch(/from '\.\/lib\/verbotsmuster\.mjs'/);
    expect(skript, 'die Muster stehen im Scanner statt in der geteilten Datei')
      .not.toMatch(/re:\s*\/\\b\(?sk[_-]/);
  });
});
