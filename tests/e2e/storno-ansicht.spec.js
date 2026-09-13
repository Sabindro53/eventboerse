// Storno-Ansicht — der Weg hinein, und was sie NICHT entscheidet.
//
// ── WARUM ES DIESE SUITE GIBT ──────────────────────────────────────────
//
// In diesem Projekt ist der teuerste wiederkehrende Fehler nicht das
// fehlende Ziel, sondern der fehlende Weg dorthin: Freunde und Gruppen
// waren gebaut und vom Board aus mit NULL Wegen erreichbar; die
// Erstattungsroute existierte und wurde von keinem Client je gerufen.
//
// Ein Storno-Vorgang, den der Planer nicht findet, ist derselbe Fehler
// noch einmal. Diese Suite hält deshalb den WEG fest, nicht nur die Logik
// (die prüft `storno.spec.js` im echten PHP).
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { openApp } = require('./helpers');

const WURZEL = path.join(__dirname, '..', '..');
const MODUL = path.join(WURZEL, 'js', 'modules', 'payments', '45-storno.js');

test.describe('Storno-Ansicht: der Weg hinein', () => {
  test('die Ansicht hat einen Platz in der Shell', () => {
    // Ohne `#stornoListe` zeichnet `ebStornoAnsichtZeichnen()` still nichts
    // und gibt `false` zurück — die Funktion wäre da, geprüft und
    // wirkungslos. Genau die Klasse, die hier dreimal teuer war.
    const shell = fs.readFileSync(path.join(WURZEL, 'app-shell.html'), 'utf8');
    expect(shell, 'in app-shell.html gibt es kein `stornoListe` — die '
      + 'Storno-Ansicht hat keinen Platz und zeichnet nie etwas')
      .toContain('id="stornoListe"');
  });

  test('das Modul wird wirklich ausgeliefert', () => {
    // `app.js` ist eine Verkettung aus `modules.list`. Ein Modul, das dort
    // fehlt, liegt im Repo und erreicht den Browser nie.
    const liste = fs.readFileSync(path.join(WURZEL, 'js', 'modules', 'modules.list'), 'utf8');
    expect(liste, 'payments/45-storno.js steht nicht in modules.list')
      .toContain('payments/45-storno.js');
    const app = fs.readFileSync(path.join(WURZEL, 'app.js'), 'utf8');
    expect(app, 'ebStornoBeantragen fehlt in app.js — die Datei wurde nach der '
      + 'Änderung nicht neu gebaut (./build-app-js.sh)')
      .toContain('function ebStornoBeantragen');
  });

  test('die Funktionen sind im Browser erreichbar', async ({ page }) => {
    // Gemessen wird im echten Browser, nicht im Quelltext: eine Funktion,
    // die ein Syntaxfehler weiter oben verschluckt, steht in der Datei und
    // existiert nicht.
    await openApp(page);
    const da = await page.evaluate(() => ({
      beantragen: typeof window.ebStornoBeantragen === 'function',
      entscheiden: typeof window.ebStornoEntscheiden === 'function',
      zeichnen: typeof window.ebStornoAnsichtZeichnen === 'function',
      laden: typeof window.ebStornoLaden === 'function',
    }));
    expect(da, 'eine Storno-Funktion ist im Browser nicht definiert')
      .toEqual({ beantragen: true, entscheiden: true, zeichnen: true, laden: true });
  });

  test('abgemeldet öffnet der Antrag die Anmeldung, statt ins Leere zu laufen', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
      // FREIE Zuweisung, nicht `window.isLoggedIn`: die Variable ist in
      // app.js per `let` deklariert und damit KEINE window-Eigenschaft.
      // Über window gesetzt wirkt sie nie — und dann ist dieser Test aus
      // dem falschen Grund grün. Genau daran ist er beim ersten Lauf
      // gescheitert.
      isLoggedIn = false;
      let modal = null;
      const alt = window.openModal;
      window.openModal = (id) => { modal = id; };
      try { window.ebStornoBeantragen('pi_abc123'); } finally { window.openModal = alt; }
      return modal;
    });
    expect(r, 'ein Abgemeldeter bekommt keinen Anmeldedialog — der Klick tut '
      + 'dann nichts, und das sieht aus wie ein kaputter Knopf').toBe('loginModal');
  });

  test('eine kaputte Zahlungskennung erreicht den Server gar nicht', async ({ page }) => {
    // Höflichkeit, kein Schutz — der Server prüft dasselbe. Aber ein
    // Formular, das offensichtlich Falsches erst nach einer Runde ablehnt,
    // ist ein Formular, das den Nutzer warten lässt.
    await openApp(page);
    const r = await page.evaluate(async () => {
      isLoggedIn = true;                       // freie Zuweisung, siehe oben
      const rufe = [];
      const altF = window.fetch;
      const altT = showToast;
      const altP = window.prompt;
      let toast = null;
      window.fetch = (...a) => { rufe.push(String(a[0])); return altF(...a); };
      showToast = (t) => { toast = t; };
      // Der Abbruch muss VOR der Rückfrage kommen — wer erst nach dem
      // Tippen erfährt, dass die Buchung gar keine Zahlung hat, hat umsonst
      // getippt. Der Prompt ist hier trotzdem gestellt, damit der Test nicht
      // an einem echten Dialog hängenbleibt, falls die Reihenfolge kippt.
      window.prompt = () => 'Ein Grund, der lang genug ist.';
      try { ebStornoBeantragen('nicht-echt'); } finally {
        window.fetch = altF; showToast = altT; window.prompt = altP;
      }
      return { rufe: rufe.filter((u) => u.includes('storno')).length, toast };
    });
    expect(r.rufe, 'eine offensichtlich ungültige Kennung geht trotzdem an den '
      + 'Server').toBe(0);
    expect(r.toast, 'der Nutzer erfährt nicht, warum nichts passiert').toBeTruthy();
  });

  test('fremder Text wird maskiert, auch wenn der Server ihn schon geprüft hat', () => {
    // Der Grund kommt vom Gegenüber. Der Server entschärft ihn, die Ansicht
    // maskiert erneut — eine ausgelieferte Antwort kann veraltet oder
    // verfälscht sein. Dieselbe Regel wie beim Aktivitäten-Bestand.
    const js = fs.readFileSync(MODUL, 'utf8');
    const zeile = js.split('\n').find((l) => l.includes('storno-grund'));
    expect(zeile, 'die Grund-Zeile ist nicht auffindbar').toBeTruthy();
    expect(zeile, 'der Grund des Gegenübers landet unmaskiert im Markup')
      .toContain('escHtml(');
  });

  test('die Ansicht entscheidet nichts — sie ruft nur', () => {
    // Dieselbe Regel wie in den Nachbarmodulen: die Oberfläche blendet aus,
    // was der Server ohnehin ablehnt. Sie darf keine eigene Rechteregel
    // führen — zwei Fassungen driften, und diese driftete schon einmal auf
    // einem Geldweg.
    const js = fs.readFileSync(MODUL, 'utf8');
    for (const verboten of ['connect_id', 'metadata', 'transfer_data', 'acct_']) {
      expect(js, `das Ansichtsmodul liest \`${verboten}\` — damit fängt es an, `
        + `Rechte selbst zu beurteilen`).not.toContain(verboten);
    }
  });
});
