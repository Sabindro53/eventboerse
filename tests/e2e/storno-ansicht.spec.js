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
const { ohneJsKommentare } = require('./lib/js-code');

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

  test('eine echte Zeile wird gezeichnet — und maskiert fremden Text', async ({ page }) => {
    // ── WARUM DIESER TEST IM BROWSER LÄUFT ─────────────────────────────
    //
    // Die erste Fassung las den QUELLTEXT und prüfte, ob in der Zeile mit
    // `storno-grund` ein `escHtml(` steht. Es stand dort — und `escHtml`
    // GIBT ES IN DIESEM PROJEKT NICHT. Der Helfer heisst `_escHtml`.
    //
    // Jede Zeile mit einem echten Antrag warf damit `ReferenceError`, die
    // Liste blieb leer, und zwar ausgerechnet für die Nutzer, die einen
    // Antrag haben. Elf Tests waren grün, weil keiner je eine Zeile MIT
    // DATEN gezeichnet hat — sie kamen alle nur bis zu den leeren
    // Zuständen. Ein Muster, das den Aufruf findet, beweist nicht, dass
    // das Gerufene existiert.
    //
    // Gemessen wird deshalb das gerenderte DOM, mit echtem fremdem Text.
    await openApp(page);
    await page.evaluate(() => window.navigateTo('board'));

    const r = await page.evaluate(() => {
      isLoggedIn = true;                         // freie Zuweisung, siehe oben
      _stornoStand = {
        meine: [],
        an_mich: [{
          id: 7, zustand: 'offen', betrag_cents: 12500, waehrung: 'EUR',
          grund: '<img src=x onerror=alert(1)>Termin fällt aus',
          antwort: '<script>alert(2)</script>',
        }],
      };
      window.ebStornoAnsichtZeichnen();
      const ziel = document.getElementById('stornoListe');
      return {
        eintraege: ziel.querySelectorAll('.storno-eintrag').length,
        injiziert: ziel.querySelectorAll('img, script').length,
        grundText: (ziel.querySelector('.storno-grund') || {}).textContent || '',
        betrag: (ziel.querySelector('.storno-kopf strong') || {}).textContent || '',
        knoepfe: ziel.querySelectorAll('.storno-knoepfe button').length,
      };
    });

    expect(r.eintraege, 'die Zeile wurde gar nicht gezeichnet — vermutlich wirft '
      + 'ebStornoZeile(), und die Liste bleibt für genau die Nutzer leer, die '
      + 'einen Antrag haben').toBe(1);
    expect(r.injiziert, 'fremder Text wurde als Markup ausgeführt').toBe(0);
    expect(r.grundText, 'der Grund fehlt in der Zeile').toContain('Termin fällt aus');
    expect(r.grundText, 'das Markup wurde nicht maskiert, sondern entfernt — '
      + 'dann fehlt Text, den der Gegenüber geschrieben hat').toContain('<img');
    expect(r.betrag, 'der Betrag fehlt').toContain('125');
    expect(r.knoepfe, 'der Anbieter bekommt keine Entscheidungsknöpfe').toBe(2);
  });

  test('die eigene Zeile trägt keine Entscheidungsknöpfe', async ({ page }) => {
    // Gegenprobe zum Test darüber: ohne sie wäre „zeichne immer zwei
    // Knöpfe" eine Erklärung, die beide besteht — und der Planer könnte
    // seinen eigenen Antrag annehmen. Der Server lehnt das ab; ein Knopf,
    // der sicher scheitert, ist trotzdem ein kaputter Knopf.
    await openApp(page);
    await page.evaluate(() => window.navigateTo('board'));
    const knoepfe = await page.evaluate(() => {
      isLoggedIn = true;
      _stornoStand = { an_mich: [], meine: [{ id: 8, zustand: 'offen',
        betrag_cents: 5000, waehrung: 'EUR', grund: 'Termin fällt aus' }] };
      window.ebStornoAnsichtZeichnen();
      return document.querySelectorAll('#stornoListe .storno-knoepfe button').length;
    });
    expect(knoepfe, 'der Antragsteller bekommt Knöpfe auf den eigenen Antrag')
      .toBe(0);
  });

  test('der Antrag hat einen Aufrufer — es gibt einen Knopf', () => {
    // ── DER BEFUND, DER DIESEN TEST ERZWUNGEN HAT ──────────────────────
    //
    // Beim ersten Anlauf hatte `ebStornoBeantragen()` NULL Aufrufer. Das
    // Backend war richtig, das Modul war richtig, sieben Tests waren grün
    // — und kein Mensch konnte je einen Storno beantragen. Genau die
    // Klasse, vor der die Kopfzeile dieser Datei warnt, im eigenen PR.
    //
    // Gemessen wird in der AUSGELIEFERTEN `app.js`: ein Aufruf in einem
    // Modul, das nicht in `modules.list` steht, erreicht niemanden.
    //
    // NACH ABZUG DER KOMMENTARE — der erste Versuch zählte den Namen im
    // erklärenden Kommentar neben dem Knopf mit, und die Mutation „Knopf
    // entfernt" überlebte. Genau die Klasse, an der in diesem Projekt
    // schon vier Prüfungen gescheitert sind; deshalb gibt es den
    // gemeinsamen Griff.
    const app = ohneJsKommentare(fs.readFileSync(path.join(WURZEL, 'app.js'), 'utf8'));
    const stellen = (app.match(/ebStornoBeantragen\s*\(/g) || []).length;
    const deklaration = (app.match(/function\s+ebStornoBeantragen\s*\(/g) || []).length;
    expect(stellen - deklaration, 'ebStornoBeantragen() wird nirgends gerufen — '
      + 'der Vorgang ist gebaut und hat keinen Eingang').toBeGreaterThanOrEqual(1);
  });

  test('die Liste wird wirklich gefüllt — im echten Browser gemessen', async ({ page }) => {
    // Nicht "steht ein Aufruf im Quelltext", sondern: ist die Fläche
    // danach gefüllt. Ein Aufruf hinter einem `return`, in einem toten
    // Zweig oder mit vertauschter Reihenfolge sieht im Diff vollständig
    // richtig aus — genau daran ist der Soft-Refresh-Pfad des Boards fast
    // gescheitert, der unten mit `return` aussteigt.
    // Gemessen wird das ERWARTETE Ergebnis, nicht „irgendetwas steht da":
    // `ebStornoAnsichtZeichnen()` schreibt in jedem seiner vier Zustände
    // entweder `.storno-leer` oder `.storno-liste`. Auf die Länge des
    // Markups zu prüfen hiesse, den Platzhalter-Kommentar abziehen zu
    // müssen — und genau diesen Griff verbietet `pruefhygiene.spec.js`.
    await openApp(page);
    await page.evaluate(() => window.navigateTo('board'));
    await expect(page.locator('#stornoListe'), 'die Board-Seite trägt kein '
      + '#stornoListe').toHaveCount(1);
    await expect(page.locator('#stornoListe .storno-leer, #stornoListe .storno-liste'),
      '#stornoListe bleibt ungezeichnet — das Modul wird von nichts gerufen')
      .toHaveCount(1, { timeout: 7000 });
  });

  test('auch der Soft-Refresh des Boards zeichnet die Liste', async ({ page }) => {
    // `renderBoardPage()` steigt bei unverändertem Nutzer und unveränderter
    // Rolle früh mit `return` aus. Ein Aufruf DAHINTER liefe nur beim
    // ersten Aufbau — die Liste wäre danach für immer der Stand von vorhin,
    // und niemandem fiele auf, dass sie nicht mehr nachlädt.
    await openApp(page);
    await page.evaluate(() => window.navigateTo('board'));
    await expect(page.locator('#stornoListe')).toHaveCount(1);
    await page.evaluate(() => {
      document.getElementById('stornoListe').innerHTML = '';   // Fläche leeren
      window.renderBoardPage();                                // = Soft-Refresh
    });
    await expect(page.locator('#stornoListe .storno-leer, #stornoListe .storno-liste'),
      'beim zweiten Rendern bleibt #stornoListe ungezeichnet — der Aufruf steht '
      + 'hinter dem frühen `return` des Soft-Refresh-Pfads')
      .toHaveCount(1, { timeout: 7000 });
  });

  test('eine Störung bleibt sichtbar, eine leere Liste verschwindet', async ({ page }) => {
    // Die gefährliche Hälfte dieser Optimierung: wer den Block pauschal
    // ausblendet, wenn nichts dasteht, blendet auch den Netzfehler aus —
    // und meldet damit „nichts offen" für eine Liste, die nie ankam.
    // Dieselbe Regel wie bei der Jetzt-Ansicht und bei Freunden: Störung,
    // leer und „nicht angemeldet" sind drei verschiedene Aussagen.
    await openApp(page);
    await page.evaluate(() => window.navigateTo('board'));

    const zustand = await page.evaluate(() => {
      isLoggedIn = true;                       // freie Zuweisung, siehe oben
      const block = document.getElementById('stornoBlock');
      const aus = {};

      _stornoStand = null;                     // Störung
      window.ebStornoAnsichtZeichnen();
      aus.stoerungSichtbar = !block.hidden;

      _stornoStand = { meine: [], an_mich: [] };   // geladen, wirklich leer
      window.ebStornoAnsichtZeichnen();
      aus.leerVerborgen = block.hidden;

      _stornoStand = { meine: [{ id: 1, zustand: 'offen', betrag_cents: 5000,
        waehrung: 'EUR', grund: 'Termin fällt aus' }], an_mich: [] };
      window.ebStornoAnsichtZeichnen();
      aus.vollSichtbar = !block.hidden;
      return aus;
    });

    expect(zustand.stoerungSichtbar, 'ein Netzfehler wird weggeblendet — der '
      + 'Nutzer sieht dann gar nichts, wo eine Störung stehen müsste').toBe(true);
    expect(zustand.leerVerborgen, 'der leere Block steht dauerhaft auf jedem '
      + 'Board — eine Überschrift „Stornos" über einem leeren Kasten').toBe(true);
    expect(zustand.vollSichtbar, 'ein echter Antrag bleibt verborgen — der '
      + 'Dienstleister erfährt nie davon').toBe(true);
  });

  test('das Verbergen wirkt wirklich — `hidden` hat seine CSS-Regel', async ({ page }) => {
    // `hidden` allein genügt nicht, sobald das Element eine eigene
    // `display`-Angabe trägt: die schlägt das eingebaute `[hidden]` des
    // Browsers. Genau das ist in diesem Projekt schon einmal passiert (der
    // leere Zeit-Warnkasten stand sichtbar da). Gemessen wird deshalb die
    // errechnete Anzeige, nicht das Attribut.
    await openApp(page);
    await page.evaluate(() => window.navigateTo('board'));
    const anzeige = await page.evaluate(() => {
      const b = document.getElementById('stornoBlock');
      b.hidden = true;
      return getComputedStyle(b).display;
    });
    expect(anzeige, '`hidden` bleibt wirkungslos — es fehlt '
      + '`.storno-block[hidden] { display: none }`').toBe('none');
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
