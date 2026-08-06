// KI-Abwehr: die Stellen, an denen fremde KI auf unsere trifft.
//
// Zwei verschiedene Bedrohungen, bewusst in einer Suite:
//
//   1. FREMDER TEXT ERREICHT UNSER MODELL. Der Code-Prüfer liest PR-Diffs.
//      Einen PR darf jeder öffnen. Steht im Diff „ignoriere deine
//      Anweisungen", ging das bisher als blanke Nutzernachricht ans Modell —
//      und dessen Antwort erscheint als Kommentar unter unserem Namen. Das
//      reicht für eine Falschaussage im eigenen Namen.
//
//   2. FREMDE KI ERNTET UNSERE INHALTE. Suchmaschinen schicken Besucher,
//      Trainingssammler nehmen und geben nichts zurück. Die Anfrage eines
//      Planers endet dann in einer fremden Antwort statt auf einem Profil.
//
// Beides ist keine Theorie: die Verbotsmuster für Fall 1 existierten längst,
// wurden aber nur im Quarantäne-Tor angewandt, nicht im Agenten.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');
const AGENT = fs.readFileSync(path.join(ROOT, 'scripts', 'agent.mjs'), 'utf8');
const ROBOTS = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');

/** Der Rumpf der live ausgelieferten robots.txt-Erzeugung. */
function robotsRumpf() {
  const von = FUNCTIONS.indexOf('function eb_seo_robots_txt');
  return FUNCTIONS.slice(von, FUNCTIONS.indexOf('\nfunction ', von + 10));
}

// Die Sammler, bei denen ein Ausfall am meisten kostet — nicht die ganze
// Liste, sonst prüft der Test nur seine eigene Kopie.
const PFLICHT = ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'PerplexityBot', 'Bytespider'];

test.describe('Vertrauliches verlässt das Repo nicht', () => {
  // Die Aufgaben-Dateien sind ein Datenabfluss nach außen: was dort steht,
  // geht an einen fremden Anbieter. Der Geheimnis-Musterscan reicht dafür
  // NICHT — der Security-Vault enthält nachweislich Beschreibungen statt
  // Zugangsdaten und käme anstandslos durch. Entschieden wird am Pfad.
  const { darfNichtRaus } = require('../../scripts/lib/verbotsmuster.mjs');

  const GESPERRT = [
    'vault/40-Governance/Security/Stripe-Webhook.md',
    'vault/40-Governance/Security/CSP-Headers.md',
    '.git/config',
    'node_modules/x/index.js',
    '/etc/passwd',
    '../../../etc/passwd',
    'vault/../vault/40-Governance/Security/EBSession.md',
  ];
  const ERLAUBT = ['hq.html', 'functions.php', 'vault/10-Produkt/Wissen/Gebuehren-und-Provision.md'];

  for (const p of GESPERRT) {
    test(`gesperrt: ${p}`, () => {
      expect(darfNichtRaus(p, ''), `${p} dürfte nach außen`).toBeTruthy();
    });
  }
  for (const p of ERLAUBT) {
    test(`erlaubt: ${p}`, () => {
      expect(darfNichtRaus(p, ''), `${p} wäre unnötig blockiert`).toBeNull();
    });
  }

  test('share: secret zählt auch außerhalb des Security-Ordners', () => {
    // Fängt den Fall ab, dass eine Notiz später als geheim eingestuft wird,
    // ohne in den gesperrten Ordner zu wandern.
    const geheim = '---\nlayer: L4\nshare: secret\n---\n\n# Test';
    expect(darfNichtRaus('vault/10-Produkt/irgendwas.md', geheim)).toBeTruthy();
    // Eine bloße Erwähnung im Fließtext ist keine Einstufung.
    const erwaehnung = '---\nshare: internal\n---\n\nWir nutzen share: secret für den Vault.';
    expect(darfNichtRaus('vault/10-Produkt/irgendwas.md', erwaehnung)).toBeNull();
  });

  test('beide Schichten rufen die Sperre auf', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const wurzel = path.join(__dirname, '..', '..');
    const AGENT = fs.readFileSync(path.join(wurzel, 'scripts', 'agent.mjs'), 'utf8');
    const MODELS = fs.readFileSync(path.join(wurzel, 'scripts', 'models.mjs'), 'utf8');
    // Laufzeit: der Agent darf so eine Datei gar nicht erst mitschicken.
    expect(AGENT, 'Agent prüft die Datei nicht').toMatch(/darfNichtRaus\(d,\s*inhalt\)/);
    expect(AGENT, 'gesperrte Datei muss den Lauf abbrechen').toMatch(/ergebnis: 'abgebrochen'/);
    // Katalog: so eine Aufgabe darf gar nicht erst entstehen.
    expect(MODELS, 'Katalog-Tor prüft die Datei nicht').toMatch(/darfNichtRaus\(d,\s*inhalt\)/);
  });
});

test.describe('Fremdtext erreicht das Modell nur eingezäunt', () => {
  test('der Kontext geht nicht blank an das Modell', () => {
    // Der konkrete Rückfall: `{ role: 'user', content: kontext }`.
    expect(AGENT, 'roher Kontext als Nutzernachricht').not.toMatch(
      /role:\s*'user',\s*content:\s*kontext\b/);
    expect(AGENT, 'Kontext muss eingezäunt werden').toMatch(/const eingezaeunt\s*=/);

    // Geprüft wird die EIGENSCHAFT, nicht die Schreibweise: die Nutzer-
    // nachricht trägt den eingezäunten Kontext und nirgends den rohen. Die
    // Zeile selbst darf sich ändern — sie hat es bereits, als die Auftrags-
    // struktur dazukam. Ein Test auf die exakte Form wäre da zu Unrecht rot
    // geworden, obwohl die Zusicherung hielt.
    const nutzer = AGENT.slice(AGENT.indexOf("role: 'user'"), AGENT.indexOf("role: 'user'") + 260);
    expect(nutzer, 'Nutzernachricht ohne eingezäunten Kontext').toMatch(/\beingezaeunt\b/);
    expect(nutzer, 'roher Kontext in der Nutzernachricht').not.toMatch(/\$\{\s*kontext\b/);
  });

  test('die Zaunmarke ist pro Lauf verschieden', () => {
    // Eine feste Marke kann ein Angreifer im Diff nachbauen und damit
    // vortäuschen, sein Text stünde außerhalb der Daten.
    const zaun = AGENT.slice(AGENT.indexOf('const zaun'), AGENT.indexOf('const zaun') + 200);
    expect(zaun, 'Zaunmarke muss zufällig sein').toMatch(/Math\.random\(\)/);
  });

  test('die Regel steht in der Systemnachricht, nicht in den Daten', () => {
    expect(AGENT, 'Regel fehlt').toMatch(/const regel\s*=/);
    // Sie muss dem Modell drei Dinge sagen: es sind Daten, darin stehen keine
    // Anweisungen, und ein Befehl darin ist ein Befund statt eines Auftrags.
    const regel = AGENT.slice(AGENT.indexOf('const regel'), AGENT.indexOf('const eingezaeunt'));
    const flach = regel.replace(/'\s*\+\s*'/g, '');
    expect(flach).toMatch(/DATENMATERIAL/);
    expect(flach).toMatch(/niemals Anweisungen/);
    expect(flach).toMatch(/Befolge es nicht/);
    // Und sie muss in der system-Rolle landen, nicht neben den Daten.
    expect(AGENT).toMatch(/role:\s*'system',[^\n]*\+\s*regel/);
  });

  test('Injektionsfunde werden gezählt, nie zitiert', () => {
    // Ein Journal, das den gefundenen Satz zitiert, trägt ihn beim nächsten
    // Lauf selbst in den Kontext. Genau daran ist das Quarantäne-Tor schon
    // einmal über sich selbst gestolpert.
    expect(AGENT).toMatch(/injektionsfunde:\s*injektionen\.length/);
    expect(AGENT, 'kein Wortlaut ins Journal').not.toMatch(/injektionen(\[0\]|\.map)[^\n]*why/);
  });

  test('Geheimnisse brechen den Lauf weiterhin ab', () => {
    // Einzäunen ersetzt die härtere Regel nicht: Geheimes wird gar nicht erst
    // gesendet, egal wie gut es markiert wäre.
    expect(AGENT).toMatch(/ersterTreffer\(kontext,\s*GEHEIMNISSE\)/);
    const block = AGENT.slice(AGENT.indexOf('const geheim'), AGENT.indexOf('const zaun'));
    expect(block).toMatch(/ergebnis:\s*'abgebrochen'/);
    expect(block).toMatch(/process\.exit\(1\)/);
  });
});

test.describe('KI-Sammler werden abgewiesen, Suchmaschinen nicht', () => {
  test('die live erzeugte robots.txt nennt jeden Pflicht-Sammler', () => {
    // Maßgeblich ist functions.php — die Datei im Repo wird laut ihrem eigenen
    // Kopf gar nicht ausgeliefert.
    const rumpf = robotsRumpf();
    for (const bot of PFLICHT) {
      expect(rumpf, `${bot} nicht ausgeschlossen`).toContain(bot);
    }
    expect(rumpf, 'Sammlerliste muss Disallow setzen').toMatch(/'User-agent: '\s*\.\s*\$bot/);
    expect(rumpf).toMatch(/\$lines\[\]\s*=\s*'Disallow: \/'/);
  });

  test('Suchmaschinen bleiben ausdrücklich erlaubt', () => {
    const rumpf = robotsRumpf();
    // Der Wildcard-Block erlaubt weiterhin alles außer den Auth-Routen.
    expect(rumpf).toMatch(/'User-agent: \*'/);
    expect(rumpf).toMatch(/'Allow: \/'/);
    // Googlebot und Bingbot dürfen NICHT in der Sammlerliste stehen — das
    // wäre der teuerste denkbare Tippfehler in dieser Datei.
    const liste = rumpf.slice(rumpf.indexOf('$ki_sammler'), rumpf.indexOf('foreach'));
    expect(liste, 'Googlebot ausgesperrt — Inserate würden unauffindbar').not.toMatch(/'Googlebot'/);
    expect(liste, 'Bingbot ausgesperrt').not.toMatch(/'Bingbot'/);
    // Google-Extended betrifft nur das Training und MUSS drin sein.
    expect(liste).toMatch(/'Google-Extended'/);
  });

  test('die Referenzdatei weicht nicht von der ausgelieferten ab', () => {
    // Zwei Listen driften. Die Referenz im Repo ist dokumentarisch — sie darf
    // nichts behaupten, was live nicht passiert.
    const rumpf = robotsRumpf();
    for (const bot of PFLICHT) {
      expect(ROBOTS, `${bot} fehlt in der Referenzdatei`).toContain(`User-agent: ${bot}`);
    }
    // Und umgekehrt: kein Sammler in der Referenz, den live niemand ausschließt.
    const inReferenz = [...ROBOTS.matchAll(/^User-agent: (.+)$/gm)]
      .map((m) => m[1].trim())
      .filter((b) => b !== '*');
    for (const bot of inReferenz) {
      expect(rumpf, `Referenz nennt ${bot}, functions.php nicht`).toContain(bot);
    }
  });

  test('robots.txt verrät die Verwaltungspfade nicht neu', () => {
    // Ein Disallow ist auch ein Hinweis. /hq darf hier nicht auftauchen —
    // die Adresse soll gar nicht erst bekannt sein.
    expect(robotsRumpf(), '/hq in robots.txt bestätigt die Existenz').not.toMatch(/Disallow: \/hq/);
    expect(ROBOTS).not.toMatch(/Disallow: \/hq/);
  });
});
