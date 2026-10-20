// ════════════════════════════════════════════════════════════════════════
// Chromes Passwortmanager bot im SUCHFELD gespeicherte Zugangsdaten an
//
// Gemeldet am 08.10.2026 vom Inhaber, mit Bild: wer auf der Landeseite in
// die Suche tippt, bekommt die Konten-Liste des Chrome-Passwortmanagers
// darüber gelegt — E-Mail-Adressen und Passwortpunkte, mitten im Produkt.
//
// DIE NAHELIEGENDE REPARATUR WAR LÄNGST DA UND TAT NICHTS. `#browseSearch`
// trug bereits `type="search"`, `autocomplete="off"`, `data-lpignore`,
// `data-1p-ignore` und `data-form-type="other"`. Chrome ignoriert
// `autocomplete="off"` aber ABSICHTLICH, sobald es ein Feld als Benutzer-
// namen eines Anmeldeformulars einstuft — die Attribute bedienen den
// gewöhnlichen Autofill, nicht den Passwortmanager. Dieselbe Klasse wie der
// tote Gitleaks-Scan: etwas ist da, sieht nach Schutz aus und wirkt nicht.
//
// DIE URSACHE IST DER FORM-EIGENTÜMER, gemessen im echten Chromium:
//
//   Formularfelder der Hülle            130
//   davon OHNE form-Eigentümer           58
//   darin Passwortfelder                  3   settingsCurrentPw/NewPw/ConfirmPw
//   darin Text-/Suchfelder               21   browseSearch, heroSearchInput, …
//
// Felder ohne `<form>` fasst Chrome zu EINER synthetischen Form zusammen.
// Lag darin ein Passwortfeld, war jedes Suchfeld der Anwendung ein
// Benutzernamen-Kandidat — auch das auf der Landeseite, dreitausend Zeilen
// entfernt. `#settingsEmail` liegt in demselben Pool und steht in der
// Dokumentreihenfolge direkt vor den Passwortfeldern; genau das Paar sucht
// die Heuristik.
//
// BEHOBEN AN DEN DREI, NICHT AN DEN EINUNDZWANZIG. Die Passwortfelder
// bekommen mit `#settingsPasswordForm` einen eigenen Eigentümer und
// verlassen den Pool. Jedes Textfeld — auch jedes künftige — ist damit
// wieder ein Textfeld. Die Gegenrichtung (jedes Suchfeld in ein eigenes
// `<form>`) wären 21 Stellen, die man bei der nächsten vergisst; dieselbe
// Begründung wie `defaults: run: shell: bash` am Job statt je Schritt.
//
// GEPRÜFT WIRD DIE BEDINGUNG, NICHT DER EINZELFALL. Ein Test auf
// „browseSearch zeigt keinen Vorschlag" wäre von hier aus ohnehin nicht zu
// führen: die Konten-Liste ist Browser-Oberfläche, kein DOM, und ein
// automatisierter Chromium hat keine gespeicherten Passwörter. Gemessen
// wird die Vorbedingung, auf der Chromes Heuristik aufsetzt — und die liegt
// im DOM.
// ════════════════════════════════════════════════════════════════════════
const { test, expect } = require('@playwright/test');
const { openApp, warteAufAppBereit } = require('./helpers');

/** Alle Formularfelder ohne form-Eigentümer — Chromes synthetische Form. */
async function herrenloserPool(page) {
  return page.evaluate(() => {
    const alle = Array.from(document.querySelectorAll('input, select, textarea'));
    const herrenlos = alle.filter((el) => el.form === null);
    return {
      felderGesamt: alle.length,
      gesamt: herrenlos.length,
      passwoerter: herrenlos.filter((el) => el.type === 'password').map((el) => el.id || '(ohne id)'),
      textfelder: herrenlos
        .filter((el) => ['text', 'search', 'email', 'tel'].includes(el.type))
        .map((el) => el.id || '(ohne id)'),
    };
  });
}

test.describe('Passwortmanager im Suchfeld', () => {
  test('kein Passwortfeld liegt im herrenlosen Pool', async ({ page }) => {
    const errors = await openApp(page);
    await warteAufAppBereit(page);
    const pool = await herrenloserPool(page);

    expect(
      pool.passwoerter,
      `Diese Passwortfelder haben keinen <form>-Eigentümer und teilen sich damit ` +
        `Chromes synthetische Form mit ${pool.textfelder.length} Textfeldern ` +
        `(u. a. ${pool.textfelder.slice(0, 3).join(', ')}). Chrome bietet dort ` +
        `gespeicherte Zugangsdaten an und ignoriert dabei autocomplete="off". ` +
        `Jedes Passwortfeld gehört in ein <form>.`
    ).toEqual([]);

    expect(errors).toEqual([]);
  });

  // GEGENPROBE. Ohne sie wäre die Regel oben auch auf einer Seite ohne
  // Formularfelder erfüllt — ein Prüfer ohne Subjekt. Der Pool MUSS
  // Textfelder enthalten, sonst misst der Test nichts.
  test('der Pool wird überhaupt gemessen', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const pool = await herrenloserPool(page);
    expect(pool.felderGesamt).toBeGreaterThan(50);
    expect(pool.textfelder.length).toBeGreaterThan(5);
    // Das gemeldete Feld selbst ist dabei — wandert es je in ein <form>,
    // soll das auffallen und nicht stillschweigend die Messung entwerten.
    expect(pool.textfelder).toContain('browseSearch');
  });

  test('die drei Passwortfelder gehören wirklich dem Passwort-Formular', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    const eigentuemer = await page.evaluate(() =>
      ['settingsCurrentPw', 'settingsNewPw', 'settingsConfirmPw'].map((id) => ({
        id,
        form: document.getElementById(id) ? (document.getElementById(id).form || {}).id || null : 'FEHLT',
      }))
    );
    for (const e of eigentuemer) {
      expect(e.form, `${e.id} hat keinen oder den falschen form-Eigentümer`).toBe('settingsPasswordForm');
    }
  });

  // Das <form> ist der Preis der Behebung — es darf die SPA nicht neu laden.
  // Ein Formular ohne `action` sendet an die eigene Adresse; der Besucher
  // stünde danach auf der Startseite, und seine Eingabe wäre weg.
  //
  // GEKLICKT WIRD DER ECHTE KNOPF, nicht `requestSubmit()`. Letzteres sendet
  // das Formular an jedem Knopf vorbei — die Mutation „der Knopf trägt
  // type='button'" (und tut damit nichts mehr) überlebte das klaglos. Ein
  // Prüfer, der die Kette hinter dem Knopf misst und den Knopf überspringt,
  // deckt genau den Fall nicht, der hier eintreten kann.
  test('ein Klick auf „Passwort ändern" lädt nicht neu und ruft den Handler', async ({ page }) => {
    await openApp(page);
    await warteAufAppBereit(page);
    await page.evaluate(() => {
      document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
      const s = document.getElementById('page-settings');
      s.classList.add('active');
      s.style.display = 'block';
      window.__spsAufrufe = 0;
      window.savePasswordSettings = () => { window.__spsAufrufe++; };
    });
    const knopf = page.locator('#settingsPasswordForm button[type="submit"], #settingsPasswordForm .settings-save-btn');
    await expect(knopf.first()).toBeVisible();

    const vorher = page.url();
    await knopf.first().click();
    await page.waitForTimeout(400);

    expect(page.url(), 'der Klick hat navigiert — das Formular lädt die SPA neu').toBe(vorher);
    expect(
      await page.evaluate(() => window.__spsAufrufe),
      'der Knopf hat den Handler nicht erreicht — er sieht heil aus und tut nichts'
    ).toBe(1);
  });

  // Die Karte ist durch den Tagwechsel optisch unverändert (gemessen:
  // identische Box, identisches Padding). Ein `div.settings-card`-Selektor
  // würde das brechen, ohne dass es jemandem auffällt.
  test('kein Stylesheet bindet settings-card an ein div', async ({ page }) => {
    await openApp(page);
    const treffer = await page.evaluate(() => {
      const funde = [];
      for (const blatt of Array.from(document.styleSheets)) {
        let regeln;
        try { regeln = blatt.cssRules; } catch (e) { continue; } // fremde Herkunft
        const lauf = (liste) => {
          for (const r of Array.from(liste || [])) {
            if (r.cssRules) lauf(r.cssRules);
            if (r.selectorText && /\bdiv\.settings-card\b/.test(r.selectorText)) funde.push(r.selectorText);
          }
        };
        lauf(regeln);
      }
      return funde;
    });
    expect(treffer, 'settings-card ist jetzt ein <form> — ein div-gebundener Selektor greift nicht mehr').toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Und dieselbe Lage im HQ
//
// Eine Fundstelle zu beheben verhindert die nächste nicht, solange jede
// Oberfläche ihre eigene hat. `hq.html` trug ein Passwortfeld (`#pat-input`,
// der GitHub-Token) ohne form-Eigentümer — zusammen mit `#zugang-mail` und
// `#recht-suche` im selben herrenlosen Pool. Dort ist es doppelt teuer: der
// Manager bietet in der Rechtsuche Zugangsdaten an UND will den Token als
// Passwort der Domain speichern.
//
// Gemessen wird am QUELLTEXT, nicht im Browser: das HQ liefert
// `eb_serve_hq()` nur an Berechtigte aus, ein ungeprüfter Aufruf bekommt 404.
// Die Bedingung ist hier strukturell und ohne Laufzeit prüfbar.
// ────────────────────────────────────────────────────────────────────────
test.describe('Passwortmanager im HQ', () => {
  // GEMESSEN WIRD IM BROWSER, NICHT IM QUELLTEXT — und das ist die Lehre
  // dieses Abschnitts, zweifach bezahlt.
  //
  // Der erste Prüfer zählte `<form\b` gegen `</form>` im rohen Text. Er fiel
  // zuerst auf meinen eigenen erklärenden Kommentar herein, der „<form>"
  // wörtlich nennt — Kommentarabzug half. Danach überlebte dieselbe Mutation
  // ein zweites Mal, und zwar aus einem Grund, den kein Kommentarabzug
  // deckt: `hq.html` trägt ein `<form id="zugang-form">`, dessen Verhältnis
  // von öffnenden zu schliessenden Tags im Quelltext nicht aufgeht. Eine
  // Klammerzählung über HTML ist kein Parser; sie sagt „im Formular", wo der
  // Browser etwas anderes aufbaut.
  //
  // Der Browser IST der Parser. `el.form` ist genau die Zuordnung, auf die
  // Chromes Passwortmanager aufsetzt — alles andere ist eine Nachbildung
  // davon, und eine Nachbildung driftet.
  const oeffneHq = async (page) => {
    await page.goto('/hq.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
  };

  test('kein Passwortfeld des HQ liegt im herrenlosen Pool', async ({ page }) => {
    await oeffneHq(page);
    const pool = await page.evaluate(() => {
      const herrenlos = Array.from(document.querySelectorAll('input, select, textarea'))
        .filter((el) => el.form === null);
      return {
        passwoerter: herrenlos.filter((el) => el.type === 'password').map((el) => el.id || '(ohne id)'),
        textfelder: herrenlos.filter((el) => ['text', 'search', 'email', 'tel'].includes(el.type)).length,
      };
    });
    expect(
      pool.passwoerter,
      `Diese HQ-Passwortfelder haben keinen form-Eigentümer und teilen sich ` +
        `Chromes synthetische Form mit ${pool.textfelder} Textfeldern des HQ. ` +
        `Dort liegt der GitHub-Token: der Manager böte ihn in der Rechtsuche an ` +
        `und wollte ihn als Passwort der Domain speichern.`
    ).toEqual([]);
  });

  // GEGENPROBE, und sie fehlte zuerst. Die Mutation „die HQ-Pool-Messung
  // liefert nichts mehr" überlebte die Regel oben klaglos: eine leere Liste
  // hat keine Passwortfelder. Der Website-Seite hatte ich diese Probe
  // gegeben, der HQ-Seite nicht — derselbe Prüfer ohne Subjekt, eine Datei
  // tiefer.
  test('der HQ-Pool wird überhaupt gemessen', async ({ page }) => {
    await oeffneHq(page);
    const zahlen = await page.evaluate(() => {
      const alle = Array.from(document.querySelectorAll('input, select, textarea'));
      const herrenlos = alle.filter((el) => el.form === null);
      return { alle: alle.length, herrenlos: herrenlos.length };
    });
    expect(zahlen.alle).toBeGreaterThan(5);
    expect(zahlen.herrenlos).toBeGreaterThan(0);
  });

  test('das PAT-Feld gehört wirklich dem PAT-Formular', async ({ page }) => {
    await oeffneHq(page);
    const eigentuemer = await page.evaluate(() => {
      const el = document.getElementById('pat-input');
      if (!el) return 'FEHLT';
      return el.form ? el.form.id || '(form ohne id)' : null;
    });
    // Ein `<form>`-Starttag INNERHALB eines offenen Formulars wird vom Parser
    // verworfen; die Reparatur wäre dann im Markup sichtbar und wirkungslos.
    // Genau deshalb steht hier der Eigentümer und nicht „es gibt ein <form>".
    expect(eigentuemer, '#pat-input hat keinen oder den falschen form-Eigentümer').toBe('pat-form');
  });

  // ZWEI WACHEN FÜR ZWEI WEGE, und nur als PAAR belegbar.
  //
  //   type="button"            → der KLICK sendet nicht ab
  //   onsubmit="return false"  → ENTER im Feld navigiert nicht
  //
  // Solange `onsubmit` steht, ändert das Entfernen von `type="button"` am
  // Verhalten nichts — die Mutation überlebt, zu Recht. Erst wenn BEIDE
  // fallen, lädt das HQ beim Speichern neu und der eingegebene Token ist
  // weg. Dieselbe Lage wie bei den zwei Leer-Wachen der Erstattungsregel:
  // die Zusicherung gilt dem Paar, nicht der einzelnen Zeile.
  test('Enter im PAT-Feld lädt das HQ nicht neu', async ({ page }) => {
    await oeffneHq(page);
    const vorher = page.url();
    await page.evaluate(() => { document.getElementById('pat-notice').style.display = ''; });
    await page.locator('#pat-input').fill('ghp_pruefstein');
    await page.locator('#pat-input').press('Enter');
    await page.waitForTimeout(400);
    expect(page.url(), 'Enter hat das Formular abgesendet — onsubmit fehlt').toBe(vorher);
  });

  test('ein Klick auf „Speichern" lädt das HQ nicht neu', async ({ page }) => {
    await oeffneHq(page);
    const vorher = page.url();
    await page.evaluate(() => {
      document.getElementById('pat-notice').style.display = '';
      window.__patAufrufe = 0;
      const k = document.getElementById('pat-save');
      const frisch = k.cloneNode(true); // alte Listener abstreifen
      k.replaceWith(frisch);
      frisch.addEventListener('click', () => { window.__patAufrufe++; });
    });
    await page.locator('#pat-save').click();
    await page.waitForTimeout(400);
    expect(page.url(), 'der Klick hat navigiert — der Knopf sendet das Formular ab').toBe(vorher);
    expect(await page.evaluate(() => window.__patAufrufe)).toBe(1);
  });
});
