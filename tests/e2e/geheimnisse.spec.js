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
function scanne(commits, argumente = [], ungespeichert = null) {
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

  // NACH dem letzten Commit geschrieben — also genau der Zustand, den
  // `git show HEAD:` nicht sieht: eine geänderte oder eine brandneue,
  // noch nicht hinzugefügte Datei.
  for (const [datei, inhalt] of Object.entries(ungespeichert || {})) {
    fs.mkdirSync(path.dirname(path.join(heim, datei)), { recursive: true });
    fs.writeFileSync(path.join(heim, datei), inhalt);
  }

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

// ── DER PRUEFER HIESS „ARBEITSBAUM" UND MASS DEN COMMITTETEN STAND ───────
//
// `arbeitsbaum()` las bis zum 24.09.2026 `git show HEAD:<datei>` — also den
// Blob, nicht die Platte. Für den PR-Check war das richtig (dort IST HEAD
// der Vorschlag), lokal war es eine Falle: eine geänderte, noch nicht
// committete Datei blieb unsichtbar, und der Bericht sah grün aus. Genau
// darauf bin ich am 23.09. hereingefallen — der Fund stand weiter im
// Bericht, nachdem die Zeile längst geändert war.
//
// Ein Sicherheitsprüfer, dessen Subjekt ein anderes ist als sein Name sagt,
// gibt eine Entwarnung, die er nicht decken kann. Dieselbe Klasse wie der
// tote Gitleaks-Scan, nur eine Ebene tiefer.
test.describe('Der Arbeitsbaum ist die Platte, nicht der letzte Commit', () => {
  test('ein Schlüssel in einer NICHT committeten Änderung macht das Tor rot', () => {
    // Das ist der Fall, den der alte Weg durchwinkte: committet steht dort
    // eine harmlose Zeile, auf der Platte der Schlüssel.
    const r = scanne(
      [{ 'src/konfig.js': 'const key = process.env.STRIPE_KEY;\n' }],
      ['--check'],
      { 'src/konfig.js': `const key = "${STRIPE}";\n` },
    );
    expect(r.code, `der ungespeicherte Schlüssel kam durch:\n${r.aus}`).toBe(1);
    expect(r.aus).toMatch(/src\/konfig\.js/);
  });

  test('ein Schlüssel in einer brandneuen, unverfolgten Datei fällt auf', () => {
    // Für BEIDE alten Wege unsichtbar — `git show HEAD:` kennt die Datei
    // nicht, und `ls-files` führte sie nicht. Es ist zugleich die
    // wahrscheinlichste Gestalt eines Unfalls.
    const r = scanne(
      [{ 'src/a.js': 'const x = 1;\n' }],
      ['--check'],
      { 'src/neu.js': `const token = "${GITHUB}";\n` },
    );
    expect(r.code, `die neue Datei wurde nicht angesehen:\n${r.aus}`).toBe(1);
    expect(r.aus).toMatch(/src\/neu\.js/);
    expect(r.aus, 'unverfolgte Dateien werden nicht als solche ausgewiesen')
      .toMatch(/unverfolgt/);
  });

  test('was .gitignore deckt, füllt den Bericht NICHT', () => {
    // Die Gegenprobe, und sie ist die wichtigere Hälfte: `.env` und
    // `node_modules` würden den Bericht bei jedem Lauf füllen. Ein Scanner,
    // der dreimal grundlos anschlägt, wird abgeschaltet — und dann schützt
    // er gar nichts mehr.
    const r = scanne(
      [{ 'src/a.js': 'const x = 1;\n', '.gitignore': '.env\n' }],
      ['--check'],
      { '.env': `STRIPE_KEY=${STRIPE}\n` },
    );
    expect(r.code, `eine ignorierte Datei macht das Tor rot:\n${r.aus}`).toBe(0);
    expect(r.aus).toMatch(/Kein Zugangsdatum gefunden/);
  });

  test('eine verfolgte, aber gelöschte Datei bricht den Lauf nicht ab', () => {
    // Sie steht in `ls-files` und nicht mehr auf der Platte. Ihr Blob gehört
    // der Historie, und die hat ihren eigenen Durchgang — hier darf sie den
    // Prüfer nur nicht zerlegen.
    const heim = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-geheim-'));
    const g = (...a) => execFileSync('git', a, { cwd: heim, encoding: 'utf8' });
    g('init', '-q', '-b', 'main');
    g('config', 'user.email', 'test@example.invalid');
    g('config', 'user.name', 'Test');
    fs.mkdirSync(path.join(heim, 'scripts', 'lib'), { recursive: true });
    fs.copyFileSync(SKRIPT, path.join(heim, 'scripts', 'geheimnisse.mjs'));
    fs.copyFileSync(path.join(ROOT, 'scripts', 'lib', 'verbotsmuster.mjs'),
      path.join(heim, 'scripts', 'lib', 'verbotsmuster.mjs'));
    fs.writeFileSync(path.join(heim, 'weg.js'), 'const x = 1;\n');
    g('add', '-A');
    g('commit', '-q', '-m', 'eins');
    fs.rmSync(path.join(heim, 'weg.js'));

    let code = 0;
    let aus = '';
    try {
      aus = execFileSync('node', [path.join(heim, 'scripts', 'geheimnisse.mjs'), '--check'],
        { cwd: heim, encoding: 'utf8' });
    } catch (e) {
      code = e.status ?? 1;
      aus = String(e.stdout || '') + String(e.stderr || '');
    }
    fs.rmSync(heim, { recursive: true, force: true });
    expect(code, `der Prüfer stolpert über eine gelöschte Datei:\n${aus}`).toBe(0);
    expect(aus).toMatch(/Kein Zugangsdatum gefunden/);
  });

  test('der Bericht sagt, dass er die Platte gemessen hat', () => {
    // „Arbeitsbaum" war das Etikett und HEAD das Subjekt. Wer das Etikett
    // behält und das Subjekt wechselt, hat nur die Falle verschoben.
    const skript = fs.readFileSync(SKRIPT, 'utf8');
    expect(skript, 'der Baum wird wieder aus dem Commit gelesen')
      .not.toMatch(/git\('show',\s*`HEAD:/);
    expect(skript, 'unverfolgte Dateien werden nicht mitgelesen')
      .toMatch(/--others'.*--exclude-standard|--exclude-standard/s);
  });
});
