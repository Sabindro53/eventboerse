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

/** Der `run:`-Rumpf eines Schritts, ausführbar (Einrückung entfernt). */
function rumpf(name) {
  const s = schritt(name);
  const ab = s.indexOf('run: |') + 'run: |'.length;
  return s.slice(ab).split('\n')
    .map((z) => (z.startsWith(' '.repeat(10)) ? z.slice(10) : z))
    .join('\n');
}

test.describe('HQ-Puls: die Spur kommt wirklich vom Server', () => {
  // Läufe 905, 906 und 908 endeten alle bei genau 14 Journaleinträgen —
  // 3 aus dem Repository plus 11 der Schicht. Bei funktionierendem Abruf
  // wären es beim zweiten Mal 25 gewesen. Die Spur verlor also bei jedem
  // Lauf ihre Geschichte, und der Grund stand erst da, als der Schritt
  // ihn nannte:
  //
  //   lftp: get: /public/.../eb-arbeit.json: /tmp/tmp.lU6IP2p7EC: File exists
  //
  // `mktemp` LEGT die Zieldatei an, und lftps `get` überschreibt eine
  // vorhandene lokale Datei nicht. Nicht Pfad, nicht Rechte, nicht Netz:
  // der Abruf bekam ein Ziel hingelegt, das er nicht anfassen durfte.
  //
  // Geprüft wird das am VERHALTEN, nicht am Wortlaut: ein gestelltes lftp
  // bildet genau diese Clobber-Regel nach. Eine Zeichenketten-Zusicherung
  // hätte den Fehler nie gefunden — der Wortlaut war ja korrekt.
  function vorladenMitLftp({ clobberRespektieren = true } = {}) {
    const heim = fs.mkdtempSync(path.join(os.tmpdir(), 'eb-vorlade-'));
    fs.mkdirSync(path.join(heim, 'assets'));
    fs.writeFileSync(path.join(heim, 'assets', 'eb-arbeit.json'),
      '{"version":1,"eintraege":[]}');
    fs.mkdirSync(path.join(heim, 'bin'));

    // Ein lftp, das sich wie das echte verhält: `get -o ZIEL` scheitert
    // an einem vorhandenen ZIEL, solange `xfer:clobber on` fehlt.
    fs.writeFileSync(path.join(heim, 'bin', 'lftp'), `#!/bin/bash
befehl=""
for a in "$@"; do case "$a" in *"get "*) befehl="$a";; esac; done
ziel="$(sed -n 's/.*-o \\([^;]*\\).*/\\1/p' <<<"$befehl" | tr -d ' ')"
if ${clobberRespektieren ? 'true' : 'false'} \\
   && [ -e "$ziel" ] && ! grep -q 'xfer:clobber on' <<<"$befehl"; then
  echo "get: /public/.../eb-arbeit.json: $ziel: File exists" >&2
  exit 1
fi
printf '{"version":1,"eintraege":[{"zeit":"a"},{"zeit":"b"},{"zeit":"c"}]}' > "$ziel"
exit 0
`);
    fs.chmodSync(path.join(heim, 'bin', 'lftp'), 0o755);

    const skript = path.join(heim, 'vorladen.sh');
    fs.writeFileSync(skript, rumpf('Bestehende Laufzeitspur vorladen'));
    let aus = '';
    try {
      aus = execFileSync('bash', [skript], {
        cwd: heim, encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${path.join(heim, 'bin')}:${process.env.PATH}`,
          GITHUB_STEP_SUMMARY: path.join(heim, 'summary.txt'),
          SFTP_HOST: 'h', SFTP_USER: 'u', SFTP_PASS: 'p',
        },
      });
    } catch (e) {
      aus = `EXIT ${e.status}\n${e.stdout || ''}${e.stderr || ''}`;
    }
    const journal = fs.readFileSync(
      path.join(heim, 'assets', 'eb-arbeit.json'), 'utf8');
    fs.rmSync(heim, { recursive: true, force: true });
    return { aus, journal };
  }

  test('ein vorhandenes Ziel verhindert den Abruf nicht mehr', () => {
    const r = vorladenMitLftp();
    expect(r.aus, `der Abruf scheitert weiterhin:\n${r.aus}`)
      .not.toMatch(/nicht lesbar/);
    expect(r.aus).toMatch(/Laufzeitspur vom Server: 3 Eintraege/);
    // Und die Spur ist wirklich übernommen, nicht nur gemeldet.
    expect(JSON.parse(r.journal).eintraege).toHaveLength(3);
  });

  test('der gestellte lftp bildet den echten Fehler nach', () => {
    // Gegenprobe am Prüfmittel selbst: nimmt man ihm die Clobber-Regel,
    // gälte der Test auch für die kaputte Fassung — er prüfte dann nichts.
    const ohneRegel = vorladenMitLftp({ clobberRespektieren: false });
    expect(ohneRegel.aus, 'ohne Clobber-Regel misst der Test nichts')
      .toMatch(/Laufzeitspur vom Server/);
  });
});

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
    //
    // Gesucht ist die AUSGABEZEILE, nicht jede Zeile mit dem Wortlaut: seit
    // der Schritt seinen Grund nennt, steht „nicht lesbar" auch in seinem
    // Kommentar, und ein Muster über den ganzen Rumpf traf beim Bauen
    // prompt den Kommentar statt des `echo`. Genau die Mehrdeutigkeit, die
    // `kontext.mjs` als Fehler wertet statt als bestanden.
    const ausgaben = s.split('\n')
      .filter((z) => /nicht lesbar/.test(z) && /^\s*echo /.test(z));
    expect(ausgaben, 'die Ausfallmeldung ist nicht eindeutig auffindbar')
      .toHaveLength(1);
    expect(ausgaben[0], 'der Ausfall geht nicht ins Log, nur in die Summary')
      .toMatch(/tee -a/);
  });

  test('der Ausfall nennt seinen Grund', () => {
    // Erste Fassung meldete „nicht lesbar" und sonst nichts — und genau
    // so blieb in den Läufen 905 und 906 unsichtbar, WARUM das Journal
    // beide Male bei 14 Einträgen stehen blieb, statt auf 25 zu wachsen.
    // Eine Meldung, die den Ausfall nennt und den Grund verschweigt, ist
    // nur die halbe Sichtbarkeit; sie kostet eine weitere Runde, um
    // überhaupt eine Vermutung zu haben.
    const s = schritt('Bestehende Laufzeitspur vorladen');
    expect(s, 'die lftp-Ausgabe wird wieder weggeworfen')
      .not.toMatch(/lftp[\s\S]{0,400}?>\/dev\/null 2>&1/);
    expect(s, 'kein Grund in der Ausfallmeldung').toMatch(/\$grund/);
    expect(s, 'das lftp-Protokoll wird nicht ausgegeben')
      .toMatch(/lftp: /);

    // Und die beiden Diagnosen bleiben getrennt: ein fehlgeschlagener
    // Abruf braucht einen anderen Handgriff als eine abgerufene, aber
    // unbrauchbare Datei. Ein gemeinsamer Text verwischt genau das.
    expect(s, 'ein fehlgeschlagener Abruf wird nicht als solcher benannt')
      .toMatch(/SFTP-Abruf fehlgeschlagen/);
    expect(s, 'eine unbrauchbare Datei wird nicht als solche benannt')
      .toMatch(/kein gueltiges Journal/);
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

test.describe('HQ-Puls: die Bilanz zählt, was wirklich herauskam', () => {
  // Lauf 905 meldete „11 gearbeitet, 0 abgebrochen" — und im selben Log
  // standen fünf Rollen mit ✗ („Antwort am Tokenlimit abgeschnitten",
  // „Provider lieferte eine leere Antwort"). Das Journal wusste es richtig:
  // 9 fertig, 5 fehler. Gelogen hat die Zusammenfassung.
  //
  // Die Ursache ist kein Zählfehler, sondern eine Verwechslung: agent.mjs
  // steigt bei einer unbrauchbaren Antwort bewusst mit 0 aus, damit ein
  // einzelner Anbieter nicht die ganze Schicht mitreißt. Ein Exit-Code 0
  // heißt hier also „sauber ausgestiegen", nicht „hat etwas geliefert".
  const schleife = (() => {
    const von = WF.indexOf('- name: Alle Rollen taskweise arbeiten lassen');
    return WF.slice(von, WF.indexOf('\n      - name:', von + 10));
  })();

  test('die Bilanz kommt aus dem Journal, nicht aus dem Exit-Code', () => {
    expect(schleife, 'die Bilanz zählt wieder Exit-Codes')
      .not.toMatch(/\*\*Bilanz:\*\* \$gearbeitet/);
    expect(schleife, 'das Journal wird für die Bilanz nicht gelesen')
      .toMatch(/eintraege\[\][\s\S]*ergebnis == "fertig"/);
    // Und sie unterscheidet die drei Ausgänge, die agent.mjs kennt.
    for (const ergebnis of ['fertig', 'fehler', 'uebersprungen']) {
      expect(schleife, `die Bilanz kennt „${ergebnis}" nicht`)
        .toMatch(new RegExp(`ergebnis == "${ergebnis}"`));
    }
  });

  test('gezählt werden nur die Einträge dieser Schicht', () => {
    // Ohne Grenze zählte die Bilanz das ganze Journal — bis zu 400 alte
    // Einträge, und der Bericht beschriebe die Woche statt den Lauf.
    expect(schleife, 'kein Stand vor der Schicht gemerkt')
      .toMatch(/seit="\$\(jq -r '\.eintraege\[0\]\.zeit/);
    expect(schleife, 'der gemerkte Stand grenzt die Zählung nicht ein')
      .toMatch(/select\(\.zeit > \$seit\)/);
    // Über die ZEIT, nicht über die Anzahl: das Journal ist gedeckelt,
    // und sobald der Deckel greift, wäre eine Längendifferenz falsch.
    expect(schleife, 'die Bilanz rechnet wieder mit Längen')
      .not.toMatch(/nachher - vorher|length\) - \$vorher/);
  });

  test('ein Prozessabbruch verschwindet nicht hinter der Bilanz', () => {
    // Ein Abbruch VOR dem Journaleintrag (Absturz, Timeout) taucht dort
    // nie auf. Die Journal-Bilanz allein würde ihn also verschlucken —
    // deshalb bleibt der Exit-Code-Zähler als zweite Zeile bestehen.
    expect(schleife, 'Prozessabbrüche werden nicht mehr gemeldet')
      .toMatch(/gescheitert" -gt 0/);
    expect(schleife, 'der Totalausfall macht den Lauf nicht mehr rot')
      .toMatch(/gearbeitet" -eq 0/);
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
