// Die Stimme des HQ — und der Ring, der sie zeigt.
//
// Ausgangslage: das HQ sprach ausschliesslich ueber window.speechSynthesis,
// also die Stimme des Betriebssystems. Auf Windows und Android klingt die
// blechern, in manchen Browsern fehlt sie ganz. Es war nie ein schlechtes
// Sprachmodell — es war gar keins.
//
// Die gefaehrliche Stelle beim Nachruesten ist nicht die Qualitaet, sondern
// der Ausfall: eine Sprachausgabe, die einfach still bleibt, ist fuer den
// Nutzer nicht von einem Absturz zu unterscheiden. Darum pruefen die ersten
// beiden Tests genau das — dass jeder Weg HOERBAR endet.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const HQ = fs.readFileSync(path.join(ROOT, 'hq.html'), 'utf8');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');

async function hqAuf(page) {
  await page.route('https://api.github.com/**', (r) => r.abort());
  await page.goto('/hq.html');
  await page.waitForTimeout(1600);
  await page.evaluate(() => {
    window.__gesprochen = [];
    window.speechSynthesis.speak = (u) => {
      window.__gesprochen.push(u.text);
      if (u.onend) setTimeout(u.onend, 5);
    };
    window.__gespielt = [];
    const Orig = window.Audio;
    window.Audio = function (src) {
      window.__gespielt.push(String(src).slice(0, 24));
      const a = new Orig();
      a.play = () => Promise.resolve();
      return a;
    };
  });
  await page.evaluate(() => window.ebCircleAPI.oeffnen());
}
const fragen = async (page) => {
  await page.locator('#ebc-input').fill('Wie steht der Betrieb?');
  await page.locator('#ebc-input').press('Enter');
  await page.waitForTimeout(1800);
};

test.describe('Sprachausgabe', () => {
  test('ohne Schlüssel fällt sie hörbar auf die Browserstimme zurück', async ({ page }) => {
    let anfragen = 0;
    await page.route('**/hq/stimme', (r) => {
      anfragen++;
      r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ verfuegbar: false, grund: 'nicht hinterlegt' }) });
    });
    await hqAuf(page);
    await fragen(page);
    const r = await page.evaluate(() => ({ g: window.__gesprochen.length, a: window.__gespielt.length }));
    expect(anfragen, 'die Serverstimme wurde nicht einmal versucht').toBeGreaterThan(0);
    expect(r.g, 'stumm geblieben, statt zurückzufallen').toBeGreaterThan(0);
    expect(r.a, 'ohne Schlüssel darf kein Audio entstehen').toBe(0);
  });

  test('mit Schlüssel spielt die Serverstimme — und nur sie', async ({ page }) => {
    await page.route('**/hq/stimme', (r) => r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ verfuegbar: true, format: 'mp3', audio: 'AAAA' }) }));
    await hqAuf(page);
    await fragen(page);
    const r = await page.evaluate(() => ({ g: window.__gesprochen.length, a: window.__gespielt.length }));
    expect(r.a, 'die Serverstimme wurde nicht abgespielt').toBeGreaterThan(0);
    expect(r.g, 'beide Stimmen gleichzeitig — das klingt wie ein Fehler').toBe(0);
  });

  test('nach einem Fehlschlag wird nicht bei jeder Antwort neu gefragt', async ({ page }) => {
    // Sonst kostet jede Antwort einen Aufruf für einen Schlüssel, den es nicht gibt.
    let anfragen = 0;
    await page.route('**/hq/stimme', (r) => {
      anfragen++;
      r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ verfuegbar: false, grund: 'nicht hinterlegt' }) });
    });
    await hqAuf(page);
    await fragen(page);
    await fragen(page);
    await fragen(page);
    expect(anfragen, 'jede Antwort fragt erneut nach der Serverstimme').toBe(1);
  });

  test('Beenden stoppt beide Stimmen, nicht nur eine', async () => {
    // Die drei Stopp-Stellen kannten nur speechSynthesis. Die Serverstimme
    // hätte weitergesprochen, während das Mikrofon schon wieder zuhört.
    const wirksam = HQ.split('\n').filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z)).join('\n');
    expect(wirksam).toMatch(/function stimmeStoppen/);
    // Nach dem Umbau darf ausserhalb von stimmeStoppen()/sayBrowser() keine
    // nackte cancel()-Stelle mehr stehen.
    const nackte = wirksam.split('\n').filter((z) =>
      /speechSynthesis\.cancel\(\)/.test(z) && !/stimmeStoppen|^\s*speechSynthesis\.cancel\(\);$/.test(z));
    expect(nackte, `Stopp-Stellen ohne Serverstimme: ${nackte.join(' | ')}`).toHaveLength(1);
  });
});

test.describe('Die Sprach-Route', () => {
  test('der Schlüssel erreicht den Browser nie', async () => {
    expect(HQ, 'ein Schlüsselname im ausgelieferten HTML').not.toMatch(/EB_OPENAI_API_KEY/);
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_stimme'));
    const rumpf = fn.slice(0, fn.indexOf('\n}\n') + 3);
    expect(rumpf, 'die Route gibt Audio zurück, keinen Schlüssel').not.toMatch(/'schluessel'|'key'/);
    expect(rumpf).toMatch(/base64_encode/);
    // Der Text der Gegenstelle darf nicht durchgereicht werden — er nennt
    // Organisation und Kontodetails.
    expect(rumpf, 'Fremdtext im Fehlerfall durchgereicht').not.toMatch(/retrieve_body\([^)]*\)[^;]*grund/);
  });

  test('sie hängt an derselben Rechteprüfung wie das übrige HQ', async () => {
    const reg = FUNCTIONS.slice(FUNCTIONS.indexOf("'/hq/stimme'"));
    expect(reg.slice(0, reg.indexOf(') );') + 4))
      .toMatch(/'permission_callback'\s*=>\s*'eb_hq_proxy_darf'/);
  });

  test('ohne Schlüssel antwortet sie ehrlich statt zu scheitern', async () => {
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_stimme'));
    expect(fn.slice(0, 600)).toMatch(/defined\(\s*'EB_OPENAI_API_KEY'\s*\)[\s\S]{0,300}'verfuegbar'\s*=>\s*false/);
  });

  test('Länge und Häufigkeit sind begrenzt — sonst ist es eine offene Rechnung', async () => {
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_stimme'));
    const rumpf = fn.slice(0, fn.indexOf('\n}\n') + 3);
    // Im CODE gemessen, nicht im Kommentar. Der erste Entwurf dieser Zeile
    // suchte bloß nach „1200" — und fand den Satz „1200 Zeichen sind rund
    // zwei Minuten". Eine Mutation, die das Limit ersatzlos strich, blieb
    // dadurch grün. Genau derselbe Fehler wie bei den Aufnahmekriterien des
    // Autopilot-Rahmens, nur eine Ebene tiefer.
    const nurCode = rumpf.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(nurCode, 'kein wirksames Längenlimit').toMatch(/(mb_)?substr\([^)]*1200\s*\)/);
    expect(nurCode, 'kein Rate-Limit').toMatch(/eventboerse_check_rate_limit\(\s*'hq_stimme'/);
    // mb_substr: ein Schnitt mitten durch ein Mehrbyte-Zeichen erzeugt
    // ungültiges UTF-8, und die Gegenstelle antwortet mit 400.
    expect(rumpf, 'Umlaute am Schnitt zerbrechen').toMatch(/mb_substr/);
  });
});

test.describe('HUD-Ringe am Sprech-Kreis', () => {
  test('vier Lagen, und im Ruhezustand steht alles still', async ({ page }) => {
    // Dieselbe Regel wie für die Impulse auf den Bahnen: eine Dauer-Animation
    // lässt ein stillstehendes System wie ein arbeitendes aussehen.
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(String(e)));
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.waitForTimeout(2000);
    expect(fehler).toEqual([]);
    for (const k of ['feld', 'aussen', 'teilung', 'klammer', 'innen']) {
      await expect(page.locator('.nn-hud-' + k)).toHaveCount(1);
    }
    const ruhe = await page.evaluate(() => ['aussen', 'teilung', 'klammer']
      .map((k) => getComputedStyle(document.querySelector('.nn-hud-' + k)).animationName));
    expect(ruhe, 'die Ringe drehen sich, ohne dass etwas passiert').toEqual(['none', 'none', 'none']);
  });

  test('Bewegung erst beim Zuhören', async ({ page }) => {
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.waitForTimeout(2000);
    const bewegt = await page.evaluate(() => {
      document.getElementById('neural').classList.add('hoert');
      return ['aussen', 'teilung', 'klammer']
        .map((k) => getComputedStyle(document.querySelector('.nn-hud-' + k)).animationName);
    });
    expect(bewegt.every((n) => n === 'nnHudDreh'), `gemessen: ${bewegt.join(', ')}`).toBe(true);
  });

  test('wer weniger Bewegung will, bekommt Stillstand statt Flimmern', async ({ page }) => {
    // Der globale Block setzt nur die Dauer auf ~0. Eine Endlosrotation steht
    // damit nicht still, sie flimmert — ausgerechnet für die Leute, die um
    // weniger Bewegung gebeten haben.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.waitForTimeout(2000);
    const namen = await page.evaluate(() => {
      document.getElementById('neural').classList.add('hoert');
      return ['aussen', 'teilung', 'klammer']
        .map((k) => getComputedStyle(document.querySelector('.nn-hud-' + k)).animationName);
    });
    expect(namen, 'die Ringe animieren trotz reduzierter Bewegung').toEqual(['none', 'none', 'none']);
  });

  test('die Zustände sind auch ohne Farbe unterscheidbar', async ({ page }) => {
    // Farbe allein wäre WCAG 1.4.1. Der Ruhe- und der Hörzustand müssen sich
    // an mehr als am Farbwert erkennen lassen.
    await page.route('https://api.github.com/**', (r) => r.abort());
    await page.goto('/hq.html');
    await page.waitForTimeout(2000);
    const ruhe = await page.evaluate(() => getComputedStyle(document.querySelector('.nn-hud-teilung')).animationName);
    const hoert = await page.evaluate(() => {
      document.getElementById('neural').classList.add('hoert');
      return getComputedStyle(document.querySelector('.nn-hud-teilung')).animationName;
    });
    expect(ruhe).not.toBe(hoert);
  });
});
