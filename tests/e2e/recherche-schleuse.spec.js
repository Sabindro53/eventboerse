// Die Recherche-Routine — ihre Schutzschritte ausgeführt, nicht gelesen.
//
// ── WARUM ES DIESE SUITE GIBT ──────────────────────────────────────────
//
// Am 21.10.2026 mit Trail of Bits' `agentic-actions-auditor` geprüft.
// `recherche.yml` lässt Claude im offenen Netz lesen — jede Seite ist
// Fremdtext — und gab ihm dabei vier Dinge mit, die nicht hätten sein
// dürfen:
//
// 1. Den Job-Token in `.git/config` (`actions/checkout` legt ihn dort ab)
//    und ein volles Gesprächsprotokoll in den Logs eines ÖFFENTLICHEN
//    Repositorys (`show_full_output: true`).
// 2. Ein Schleusen-Tor, das auf `git diff --name-only` stand. Das sieht
//    keine unverfolgten Dateien — und `create-pull-request` committet sie.
//    Eine NEUE Notiz `vault/10-Produkt/Wissen/x.md` mit `share: public`
//    kam an beiden Prüfungen vorbei in den PR. Dieselbe Klasse wie der
//    tote Gitleaks-Scan und der alte `geheimnisse.mjs`: ein Prüfer, dessen
//    Subjekt nur ein Ausschnitt ist.
// 3. Das freie Eingabefeld `thema` als `${{ }}` mitten im Shell-Skript.
//    Ein Ausdruck wird vor dem Parsen in den Quelltext kopiert; ein
//    Anführungszeichen beendete die Zeichenkette, ein Zeilenumbruch schrieb
//    weitere Schlüssel nach `$GITHUB_OUTPUT`.
// 4. Einen Auftrag, `node scripts/quarantine.mjs` zu fahren, ohne Bash zu
//    erlauben — die Action schaltet Bash ohne `--allowedTools` ab. Die
//    Routine konnte ihre eigene Aufgabe nicht erfüllen; sie ist nie
//    gelaufen, deshalb fiel es nie auf.
//
// Gemessen wird das VERHALTEN: die Schritte werden aus dem Workflow
// geschnitten und gegen ein Wegwerf-Repository gefahren. Ein Test auf
// „steht da `--cached`" bestünde auch, wenn die Zeile im Kommentar stünde.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { workflowSchritte, laufBlock, fahreWieGithub, EINGABE_IM_SKRIPT } = require('./lib/workflow-schritte');

const WURZEL = path.join(__dirname, '..', '..');
const WORKFLOW = path.join(WURZEL, '.github', 'workflows', 'recherche.yml');
const SCHLEUSE = 'vault/50-Evolution/Recherche/';

const ws = workflowSchritte(WORKFLOW);

/** Ein Schritt des Jobs; bricht laut ab, wenn es ihn nicht mehr gibt. */
function schritt(name) {
  const block = ws.schritt(name);
  expect(block, `der Schritt „${name}" fehlt in recherche.yml — umbenannt? `
    + `Dann hier mitziehen, sonst prüft diese Suite nichts mehr`).toBeTruthy();
  return block;
}
const lauf = laufBlock;
const alleSchritte = ws.alle;
const fahre = fahreWieGithub;

/** Ein Wegwerf-Repository mit einer bestehenden Notiz in der Schleuse. */
function pruefRepo() {
  const heim = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-schleuse-'));
  const g = (...a) => execFileSync('git', a, { cwd: heim, encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'test@example.invalid');
  g('config', 'user.name', 'Test');
  const schreibe = (datei, inhalt) => {
    fs.mkdirSync(path.dirname(path.join(heim, datei)), { recursive: true });
    fs.writeFileSync(path.join(heim, datei), inhalt);
  };
  schreibe('README.md', '# Probe\n');
  schreibe('vault/10-Produkt/Wissen/alt.md', '---\nshare: public\n---\nalt\n');
  schreibe('vault/20-System/intern.md', '---\nshare: internal\n---\nintern\n');
  schreibe(`${SCHLEUSE}_Schleuse.md`, '---\nshare: internal\n---\nRegeln\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'basis');
  return { heim, schreibe, g };
}

const internal = '---\nlayer: L5\nshare: internal\n---\nFund\n';
const oeffentlich = '---\nlayer: L5\nshare: public\n---\nFund\n';

test.describe('Das Schleusen-Tor sieht, was der PR mitnimmt', () => {
  const tor = () => lauf(schritt('Keine Freigabe durch die Hintertuer'));

  test('ein unverändertes Repository und ein interner Fund gehen durch', () => {
    // Die Gegenprobe zuerst: ein Tor, das immer rot ist, wird abgeschaltet.
    const leer = pruefRepo();
    expect(fahre(tor(), leer.heim).status, 'rot ohne jede Änderung').toBe(0);

    const fund = pruefRepo();
    fund.schreibe(`${SCHLEUSE}2026-10-21-fund.md`, internal);
    const r = fahre(tor(), fund.heim);
    expect(r.status, `ein interner Fund in der Schleuse wird abgewiesen:\n${r.stdout}${r.stderr}`).toBe(0);
  });

  test('eine NEUE Datei ausserhalb der Schleuse macht es rot', () => {
    // Der Befund selbst. Mit `git diff --name-only` war das hier grün.
    const r1 = pruefRepo();
    r1.schreibe('vault/10-Produkt/Wissen/neu.md', oeffentlich);
    const a = fahre(tor(), r1.heim);
    expect(a.status, 'eine neue, unverfolgte Notiz mit share: public ausserhalb '
      + 'der Schleuse kommt durch — create-pull-request nähme sie mit').not.toBe(0);
    expect(a.stdout, 'das Tor nennt die Datei nicht, an der es scheitert')
      .toContain('vault/10-Produkt/Wissen/neu.md');

    const r2 = pruefRepo();
    r2.schreibe('.github/workflows/neu.yml', 'name: x\n');
    expect(fahre(tor(), r2.heim).status, 'ein neuer Workflow kommt durch').not.toBe(0);
  });

  test('auch eine geänderte oder gelöschte Datei ausserhalb macht es rot', () => {
    const r1 = pruefRepo();
    r1.schreibe('README.md', '# verändert\n');
    expect(fahre(tor(), r1.heim).status, 'Änderung an README.md kommt durch').not.toBe(0);

    const r2 = pruefRepo();
    fs.rmSync(path.join(r2.heim, 'README.md'));
    expect(fahre(tor(), r2.heim).status, 'Löschung ausserhalb kommt durch').not.toBe(0);
  });

  test('ein Verschieben IN die Schleuse verrät, woher die Datei kam', () => {
    // Mit Umbenennungserkennung zeigt `--name-only` nur den NEUEN Pfad —
    // der liegt in der Schleuse, und die Löschung draussen wäre unsichtbar.
    //
    // Verschoben wird bewusst eine INTERNE Notiz. Die erste Fassung nahm
    // eine öffentliche — dann schlug die share-Prüfung an, der Test war rot
    // aus dem falschen Grund, und die Mutation „--no-renames entfernt"
    // überlebte ihn.
    const r = pruefRepo();
    r.g('mv', 'vault/20-System/intern.md', `${SCHLEUSE}intern.md`);
    const a = fahre(tor(), r.heim);
    expect(a.status, 'eine aus 20-System in die Schleuse verschobene Notiz '
      + 'kommt durch').not.toBe(0);
    expect(a.stdout, 'das Tor nennt den Herkunftspfad nicht')
      .toContain('vault/20-System/intern.md');
  });

  test('share: public IN der Schleuse macht es rot — auch in einer neuen Datei', () => {
    const r1 = pruefRepo();
    r1.schreibe(`${SCHLEUSE}2026-10-21-fund.md`, oeffentlich);
    expect(fahre(tor(), r1.heim).status, 'eine neue Notiz in der Schleuse mit '
      + 'share: public kommt durch').not.toBe(0);

    // Dieselbe Angabe in anderer Schreibweise ist dieselbe Freigabe.
    const r2 = pruefRepo();
    r2.schreibe(`${SCHLEUSE}2026-10-21-fund.md`, '---\nshare:  "public"\n---\nFund\n');
    expect(fahre(tor(), r2.heim).status, '`share:  "public"` kommt durch').not.toBe(0);
  });
});

test.describe('Das freie Thema kann den Shell-Quelltext nicht erreichen', () => {
  const themaSchritt = () => schritt('Thema bestimmen');

  /** Fährt den Thema-Schritt mit einer Eingabe; liefert Status und Ausgaben. */
  function bestimme(eingabe) {
    const heim = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-thema-'));
    const ausgabe = path.join(heim, 'output');
    const zusammenfassung = path.join(heim, 'summary');
    fs.writeFileSync(ausgabe, '');
    fs.writeFileSync(zusammenfassung, '');
    // Was der Workflow per env hineingibt, gibt der Test per env hinein —
    // ein verbliebener `${{ }}`-Ausdruck bleibt dagegen als Text stehen
    // und fällt im nächsten Test auf.
    const r = fahre(lauf(themaSchritt()), heim, {
      THEMA_EINGABE: eingabe,
      GITHUB_OUTPUT: ausgabe,
      GITHUB_STEP_SUMMARY: zusammenfassung,
      RUNNER_TEMP: heim,
    });
    return { ...r, heim, ausgabe: fs.readFileSync(ausgabe, 'utf8') };
  }

  test('kein Freitext steht als Ausdruck in einem Shell-Block', () => {
    for (const s of alleSchritte()) {
      const skript = lauf(s.block);
      if (!skript) continue;
      expect(skript, `„${s.name}" setzt einen Eingabewert als \${{ }} in den `
        + `Shell-Quelltext — der Wert wird vor dem Parsen eingefügt`)
        .not.toMatch(EINGABE_IM_SKRIPT);
    }
    expect(themaSchritt(), 'die Eingabe kommt nicht mehr über env herein')
      .toMatch(/THEMA_EINGABE:\s*\$\{\{\s*github\.event\.inputs\.thema\s*\}\}/);
  });

  test('ein gewöhnliches Thema kommt unverändert an', () => {
    const r = bestimme('Hochzeitsmessen 2027');
    expect(r.status, r.stderr).toBe(0);
    expect(r.ausgabe).toContain('thema=Hochzeitsmessen 2027\n');
    expect(fs.existsSync(path.join(r.heim, 'recherche')),
      'die Ablage ausserhalb des Checkouts wird nicht angelegt').toBe(true);
  });

  test('ein leeres Thema fällt auf den Wochenplan zurück', () => {
    const r = bestimme('');
    expect(r.status, r.stderr).toBe(0);
    expect(r.ausgabe).toMatch(/^thema=\S.+$/m);
  });

  test('ein Anführungszeichen bleibt Text, statt Befehl zu werden', () => {
    const r = bestimme('x"; touch GEKAPERT; echo "');
    expect(fs.existsSync(path.join(r.heim, 'GEKAPERT')),
      'das Thema wurde als Shell-Befehl ausgeführt').toBe(false);
    expect(r.status, r.stderr).toBe(0);
    expect(r.ausgabe).toContain('thema=x"; touch GEKAPERT; echo "\n');
  });

  test('ein Zeilenumbruch schreibt keinen zweiten Ausgabewert', () => {
    const r = bestimme('Messen\ndate=1999-01-01');
    expect(r.status, 'ein mehrzeiliges Thema wird angenommen').not.toBe(0);
    expect(r.ausgabe, 'trotz Abbruch steht ein eingeschleuster Wert in '
      + '$GITHUB_OUTPUT').not.toContain('1999-01-01');
  });

  test('ein überlanges Thema wird abgewiesen', () => {
    expect(bestimme('x'.repeat(121)).status).not.toBe(0);
    expect(bestimme('x'.repeat(120)).status, 'die Grenze liegt bei 120, nicht darunter').toBe(0);
  });
});

test.describe('Der Agent bekommt, was die Aufgabe braucht — und nicht mehr', () => {
  const claude = () => schritt('Claude recherchiert');

  test('kein Token in .git/config, kein volles Protokoll im öffentlichen Log', () => {
    expect(schritt('Checkout'), 'der Checkout legt den Job-Token wieder in '
      + '.git/config ab, wo der Agent ihn lesen kann')
      .toMatch(/persist-credentials:\s*false/);
    expect(claude(), 'das volle Gesprächsprotokoll geht wieder in die Logs '
      + 'eines öffentlichen Repositorys').not.toMatch(/show_full_output:\s*['"]?true/);
  });

  test('Bash ist genau für den einen Befehl der Aufgabe offen', () => {
    const args = claude().match(/--allowedTools\s+"([^"]*)"/);
    expect(args, 'ohne --allowedTools ist Bash in der Action aus — dann kann '
      + 'die Routine quarantine.mjs nicht fahren und ihre Aufgabe nicht erfüllen').toBeTruthy();
    // Getrennt wird an Komma oder Leerzeichen AUSSERHALB der Klammern —
    // so liest die CLI die Liste, und `Bash(node scripts/…)` trägt selbst
    // ein Leerzeichen. Wer schlicht an Leerzeichen trennt, sieht `Bash(node`.
    const eintraege = args[1].match(/[^\s,(]+(?:\([^)]*\))?/g) || [];
    const bash = eintraege.filter((t) => /^Bash\b/.test(t));
    expect(bash, 'Bash ist breiter offen als für quarantine.mjs — '
      + 'ein Agent, der Webseiten liest, darf keine freie Shell haben')
      .toEqual(['Bash(node scripts/quarantine.mjs:*)']);
  });

  test('Prompt und Folgeschritt meinen dieselbe Ablage ausserhalb des Checkouts', () => {
    // Driften die beiden Pfade, schreibt der Agent die Zusammenfassung
    // dorthin, wo niemand liest — oder ins Repository, und dann wird das
    // Tor rot, ohne dass jemand etwas falsch gemacht hätte.
    const prompt = claude();
    expect(prompt).toContain('${{ runner.temp }}/recherche/RECHERCHE_SUMMARY.md');
    expect(prompt).toMatch(/--add-dir \$\{\{ runner\.temp \}\}\/recherche/);
    expect(prompt, 'der Prompt schickt die Zusammenfassung wieder ins '
      + 'Repository').not.toMatch(/RECHERCHE_SUMMARY\.md im Repo/);
    expect(lauf(schritt('Zusammenfassung einlesen')))
      .toContain('"$RUNNER_TEMP/recherche/RECHERCHE_SUMMARY.md"');
  });

  test('die Zusammenfassung des Agenten kann ihre Endmarke nicht schliessen', () => {
    const heim = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-zus-'));
    fs.mkdirSync(path.join(heim, 'recherche'));
    // Der Agent schreibt die Datei. Kennt er die Endmarke, schliesst er
    // sie selbst — und jede Zeile danach ist ein neuer Ausgabewert.
    fs.writeFileSync(path.join(heim, 'recherche', 'RECHERCHE_SUMMARY.md'),
      'Fund\nSUMMARY_EOF\nbody=gekapert\n');
    const ausgabe = path.join(heim, 'output');
    fs.writeFileSync(ausgabe, '');
    const r = fahre(lauf(schritt('Zusammenfassung einlesen')), heim, {
      RUNNER_TEMP: heim, GITHUB_OUTPUT: ausgabe, THEMA: 'egal',
    });
    expect(r.status, r.stderr).toBe(0);
    const text = fs.readFileSync(ausgabe, 'utf8');
    const marke = text.match(/^body<<(\S+)$/m);
    expect(marke, 'die Ausgabe ist kein mehrzeiliger Wert').toBeTruthy();
    expect(marke[1], 'die Endmarke ist fest und damit aus der Datei heraus '
      + 'schliessbar').not.toBe('SUMMARY_EOF');
    const zeilen = text.split('\n');
    expect(zeilen.filter((z) => z === marke[1]).length,
      'die Endmarke steht nicht genau einmal am Ende').toBe(1);
    expect(zeilen.indexOf(marke[1]), 'der eingeschleuste Text steht hinter der Endmarke')
      .toBeGreaterThan(zeilen.indexOf('body=gekapert'));
  });
});
