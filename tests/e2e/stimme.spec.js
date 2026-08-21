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
const { test, expect, chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

/* Ein Browser mit simuliertem Mikrofon. Ohne das nimmt der Kreis Stille auf,
   und die Whisper-Strecke waere nur scheinbar geprueft. */
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
async function mitMikrofon() {
  const browser = await chromium.launch({
    executablePath: fs.existsSync(CHROMIUM) ? CHROMIUM : undefined,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const ctx = await browser.newContext({ permissions: ['microphone'], baseURL: 'http://localhost:8000' });
  const page = await ctx.newPage();
  await page.route('https://api.github.com/**', (r) => r.abort());
  await page.route('**/hq/stimme', (r) => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ verfuegbar: false, grund: 'nicht hinterlegt' }) }));
  return { browser, page };
}
async function circleAuf(page) {
  await page.goto('/hq.html');
  await page.waitForTimeout(1600);
  await page.evaluate(() => { window.speechSynthesis.speak = (u) => { if (u.onend) setTimeout(u.onend, 5); }; });
  await page.evaluate(() => window.ebCircleAPI.oeffnen());
}

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

test.describe('Spracheingabe', () => {
  test.describe.configure({ timeout: 60000 });

  test('Whisper hört zu, schickt und setzt die Frage ab', async () => {
    const { browser, page } = await mitMikrofon();
    const fehler = []; page.on('pageerror', (e) => fehler.push(String(e)));
    let aufrufe = 0, laenge = 0;
    await page.route('**/hq/gehoer', async (r) => {
      aufrufe++;
      laenge = (JSON.parse(r.request().postData() || '{}').audio || '').length;
      await r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ verfuegbar: true, text: 'Wie steht der Betrieb?' }) });
    });
    await circleAuf(page);
    await page.evaluate(() => window.ebCircleAPI.sprechen());
    await page.waitForTimeout(11000);
    expect(fehler).toEqual([]);
    expect(aufrufe, 'die Aufnahme wurde nie gesendet').toBe(1);
    expect(laenge, 'es wurde nichts aufgenommen').toBeGreaterThan(1000);
    // Die erkannte Frage muss auch wirklich gestellt worden sein.
    await expect(page.locator('#ebc-log .ebc-msg').last()).not.toHaveText(/^\s*$/);
    await browser.close();
  });

  test('ohne Whisper fällt es sichtbar auf die Browsererkennung zurück', async () => {
    const { browser, page } = await mitMikrofon();
    await page.route('**/hq/gehoer', (r) => r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ verfuegbar: false, grund: 'nicht hinterlegt' }) }));
    await circleAuf(page);
    const gestartet = await page.evaluate(async () => {
      window.__srStart = 0;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) SR.prototype.start = function () { window.__srStart++; };
      window.ebCircleAPI.sprechen();
      await new Promise((f) => setTimeout(f, 10000));
      return { sr: window.__srStart, zustand: (document.getElementById('ebc-state') || {}).textContent || '' };
    });
    // Entweder springt die Browsererkennung an, oder der Kreis sagt, dass es
    // hier nicht geht. Still bleiben darf er nicht.
    expect(gestartet.sr > 0 || /nicht verfügbar|Nichts gehört/i.test(gestartet.zustand),
      `weder Rückfall noch Hinweis (Zustand: "${gestartet.zustand}")`).toBe(true);
    await browser.close();
  });

  test('das Mikrofon geht zu, wenn das Gespräch endet', async () => {
    // Ein Mikrofon, das nach dem Beenden weiterläuft, ist ein
    // Datenschutzproblem und kein Schönheitsfehler.
    const { browser, page } = await mitMikrofon();
    await page.route('**/hq/gehoer', (r) => r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ verfuegbar: true, text: '' }) }));
    await page.goto('/hq.html');
    // Die Tonkanaele mitschreiben, BEVOR der Kreis das Mikrofon oeffnet.
    // Ein erster Entwurf dieses Tests las eine Liste, die niemand befuellte —
    // er pruefte ein leeres Array und bestand immer.
    await page.evaluate(() => {
      window.__spuren = [];
      const echt = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (c) => {
        const s = await echt(c);
        s.getTracks().forEach((t) => window.__spuren.push(t));
        return s;
      };
      window.speechSynthesis.speak = (u) => { if (u.onend) setTimeout(u.onend, 5); };
    });
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.ebCircleAPI.oeffnen());
    await page.evaluate(() => window.ebCircleAPI.sprechen());
    await page.waitForTimeout(1500);

    // Das Messfenster muss KUERZER sein als die Stille-Schwelle (900 ms).
    // Sonst beendet die Stille-Erkennung die Aufnahme im selben Zeitraum
    // ohnehin, und der Test kann beide Ursachen nicht unterscheiden: eine
    // Mutation, die aufnahmeBeenden() aus dem Schliesspfad entfernte, blieb
    // dadurch gruen.
    const r = await page.evaluate(async () => {
      const live = () => window.__spuren.filter((t) => t.readyState === 'live').length;
      // Warten, bis das Mikrofon wirklich offen ist.
      for (let i = 0; i < 40 && live() === 0; i++) await new Promise((f) => setTimeout(f, 50));
      const vorher = live();
      window.ebCircleAPI.beenden();
      await new Promise((f) => setTimeout(f, 150));
      return { vorher, nachher: live() };
    });
    expect(r.vorher, 'das Mikrofon wurde gar nicht geöffnet — der Test misst nichts').toBeGreaterThan(0);
    expect(r.nachher, 'ein Tonkanal blieb nach dem Beenden offen').toBe(0);
    await browser.close();
  });
});

test.describe('Die Whisper-Route', () => {
  test('der Schlüssel erreicht den Browser nie', () => {
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_gehoer'));
    const rumpf = fn.slice(0, fn.indexOf('\n}\n') + 3);
    expect(rumpf).toMatch(/EB_OPENAI_API_KEY/);
    expect(HQ, 'Schlüsselname im ausgelieferten HTML').not.toMatch(/EB_OPENAI_API_KEY/);
    expect(rumpf, 'Fremdtext im Fehlerfall durchgereicht').not.toMatch(/retrieve_body\([^)]*\)[^;]*grund/);
  });

  test('sie hängt an derselben Rechteprüfung wie das übrige HQ', () => {
    const reg = FUNCTIONS.slice(FUNCTIONS.indexOf("'/hq/gehoer'"));
    expect(reg.slice(0, reg.indexOf(') );') + 4))
      .toMatch(/'permission_callback'\s*=>\s*'eb_hq_proxy_darf'/);
  });

  test('ohne Schlüssel antwortet sie ehrlich statt zu scheitern', () => {
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_gehoer'));
    expect(fn.slice(0, 500)).toMatch(/defined\(\s*'EB_OPENAI_API_KEY'\s*\)[\s\S]{0,300}'verfuegbar'\s*=>\s*false/);
  });

  test('Größe und Häufigkeit sind begrenzt, und base64 wird streng gelesen', () => {
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_gehoer'));
    const rumpf = fn.slice(0, fn.indexOf('\n}\n') + 3);
    const nurCode = rumpf.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    // Vor dem Dekodieren messen: base64 ist ein Drittel größer, und erst
    // decodieren hieße, den Speicher schon belegt zu haben.
    expect(nurCode, 'die Länge wird erst nach dem Dekodieren geprüft')
      .toMatch(/strlen\(\s*\$roh\s*\)[\s\S]{0,200}EB_HQ_GEHOER_MAX/);
    expect(nurCode, 'kein Limit nach dem Dekodieren').toMatch(/strlen\(\s*\$audio\s*\)\s*>\s*EB_HQ_GEHOER_MAX/);
    expect(nurCode, 'kein Rate-Limit').toMatch(/eventboerse_check_rate_limit\(\s*'hq_gehoer'/);
    // strict: sonst schluckt PHP Müll und liefert Bytes, die kein Ton sind.
    expect(nurCode, 'base64 wird nicht streng gelesen').toMatch(/base64_decode\([^)]*,\s*true\s*\)/);
  });

  test('der Ton wird nicht auf die Platte geschrieben', () => {
    // Eine Sprachaufnahme, die als Datei liegen bleibt, ist ein
    // personenbezogenes Datum mit unklarer Löschfrist.
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_gehoer'));
    const rumpf = fn.slice(0, fn.indexOf('\n}\n') + 3);
    const nurCode = rumpf.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(nurCode).not.toMatch(/file_put_contents|tmpfile|wp_upload_dir|fopen\(/);
  });

  test('leer erkannt ist kein Fehler, sondern eine Aussage', () => {
    const fn = FUNCTIONS.slice(FUNCTIONS.indexOf('function eb_hq_gehoer'));
    const rumpf = fn.slice(0, fn.indexOf('\n}\n') + 3);
    // Kein Text gesagt -> verfuegbar bleibt true, der Text ist leer. Sonst
    // faellt der Browser auf die schlechtere Erkennung zurueck, nur weil
    // gerade niemand gesprochen hat.
    expect(rumpf).toMatch(/'verfuegbar'\s*=>\s*true[\s\S]{0,300}'text'\s*=>\s*\$text/);
  });

  test('auch Firefox und Safari gelten jetzt als hörfähig', () => {
    // Die reine SpeechRecognition-Frage hätte sie weiter als taub gemeldet,
    // obwohl Whisper dort funktioniert.
    expect(HQ).toMatch(/kannHoeren[\s\S]{0,400}MediaRecorder/);
  });
});
