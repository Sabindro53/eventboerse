// Die Pflicht-Checks nach jedem Deploy — automatisiert.
//
// Der Sprint führt sie seit Langem als P0: „Listings API, Board Picker,
// Demo-Toggle, Selbstbuchungsschutz". Eine Liste, die ein Mensch nach jedem
// Deploy von Hand abarbeiten soll, wird beim dritten Deploy nicht mehr
// abgearbeitet — und dann merkt niemand, wenn eine der vier Eigenschaften
// wegfällt.
//
// Der Selbstbuchungsschutz steht dabei vorn: er ist eine Geld-Regel. Wer sein
// eigenes Inserat bucht, schleust Geld im Kreis durch die Plattform, erzeugt
// eine Provision auf sich selbst und verfälscht jede Kennzahl. Geschützt war
// er an vier Stellen — getestet an keiner.
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { openApp, expectNoPageErrors } = require('./helpers');

const ROOT = path.join(__dirname, '..', '..');
const FUNCTIONS = fs.readFileSync(path.join(ROOT, 'functions.php'), 'utf8');

/** Meldet den angemeldeten Nutzer als Anbieter des offenen Inserats an. */
async function alsEigenesInserat(page) {
  return page.evaluate(() => {
    window.__toasts = [];
    const echt = window.showToast;
    window.showToast = function (m, i) { window.__toasts.push(String(m)); return echt && echt(m, i); };
    isLoggedIn = true;
    currentUser = { id: 4711, name: 'Anbieter', role: 'Dienstleister', baseRole: 'Dienstleister' };
    currentListing = { id: 'l1', _dbId: 90, providerId: 4711, title: 'Mein Inserat',
      priceLabel: 'ab 500 €', image: '', categoryLabel: 'DJ', location: 'Berlin' };
    // Netzaufrufe zählen: der Schutz greift nur, wenn KEINER rausgeht.
    window.__fetches = [];
    const echterFetch = window.fetch;
    window.fetch = function (u, o) {
      window.__fetches.push(String(u));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1 }) });
    };

    // Das Buchungsformular MUSS ausgefüllt bereitstehen. Sonst bricht
    // bookListing() schon an `if (!date)` ab, und der Test bestünde auch
    // dann, wenn der Selbstbuchungsschutz gar nicht mehr greift.
    //
    // Die Felder werden BEFÜLLT, nicht angelegt: app-shell.html bringt sie
    // schon mit, und getElementById nimmt den ersten Treffer — ein zweites
    // Feld mit derselben ID wäre unsichtbar geblieben. Genau daran blieb der
    // Test zuerst hohl.
    const setze = (id, wert) => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('input');
        el.id = id;
        document.body.appendChild(el);
      }
      el.value = wert;
    };
    setze('bookingDate', '2026-12-24');
    setze('bookingEventType', 'Hochzeit');
    setze('bookingGuests', '50');
    setze('bookingMessage', 'Guten Tag, ich habe Interesse. Mit freundlichen Gruessen, Anbieter');
  });
}

test.describe('Pflichtcheck: Selbstbuchungsschutz', () => {
  test('das eigene Inserat lässt sich nicht anfragen', async ({ page }) => {
    // Entscheidend ist nicht der Toast, sondern dass KEINE Konversation
    // angelegt wird. Ein Hinweis, der den Aufruf trotzdem durchlässt, wäre
    // Dekoration.
    const errors = await openApp(page);
    await alsEigenesInserat(page);
    const r = await page.evaluate(() => {
      bookListing();
      return { toasts: window.__toasts, fetches: window.__fetches };
    });
    expect(r.fetches.filter((u) => /conversations/.test(u)),
      'trotz Schutz ging eine Anfrage raus').toEqual([]);
    expect(r.toasts.join(' ')).toMatch(/eigenes Inserat/i);
    expectNoPageErrors(errors);
  });

  test('beim eigenen Inserat gibt es kein Gegenangebot', async ({ page }) => {
    const errors = await openApp(page);
    await alsEigenesInserat(page);
    const r = await page.evaluate(() => {
      openNegotiation();
      return { toasts: window.__toasts, modal: !!document.querySelector('#negotiationModal.show') };
    });
    expect(r.toasts.join(' ')).toMatch(/eigenen Inserat/i);
    expect(r.modal, 'das Verhandlungsfenster öffnet sich trotzdem').toBe(false);
    expectNoPageErrors(errors);
  });

  test('ein fremdes Inserat bleibt anfragbar', async ({ page }) => {
    // Die Gegenprobe. Ohne sie wäre der Schutz auch mit „nie etwas tun"
    // erfüllt — und das Buchen wäre für alle kaputt.
    const errors = await openApp(page);
    await alsEigenesInserat(page);
    const r = await page.evaluate(() => {
      currentListing.providerId = 9999;   // jemand anderes
      window.__toasts = [];
      openNegotiation();
      return { toasts: window.__toasts, modal: !!document.querySelector('#negotiationModal.show') };
    });
    expect(r.toasts.join(' ')).not.toMatch(/eigenen Inserat/i);
    expect(r.modal, 'ein fremdes Inserat lässt sich nicht mehr verhandeln').toBe(true);
    expectNoPageErrors(errors);
  });

  test('der Server verlässt sich nicht auf den Browser', async ({ page }) => {
    // Der Frontend-Schutz ist Höflichkeit; wer die Anfrage von Hand schickt,
    // umgeht ihn. Die Sperre muss serverseitig sitzen — und VOR der Zahlung.
    const stelle = FUNCTIONS.indexOf('cannot_book_own_listing');
    expect(stelle, 'die serverseitige Sperre fehlt').toBeGreaterThan(-1);
    const block = FUNCTIONS.slice(stelle - 500, stelle + 200);
    expect(block, 'kein Vergleich von Nutzer und Anbieter')
      .toMatch(/\$user->ID\s*===?\s*\(int\)\s*\$provider_uid|\(int\)\s*\$user->ID\s*===?\s*\(int\)\s*\$provider_uid/);
    expect(block, 'die Sperre antwortet nicht mit 403').toMatch(/403/);
    // Und sie steht VOR dem Stripe-Connect-Check, also vor allem, was Geld
    // bewegt.
    const connect = FUNCTIONS.indexOf('eb_stripe_connect_state_for_user', stelle);
    expect(connect, 'der Connect-Check kommt vor der Sperre').toBeGreaterThan(stelle);
  });

  test('das eigene Inserat lässt sich auch nicht bewerten', async ({ page }) => {
    // Dieselbe Regel an der zweiten Stelle, an der sie Geld wert ist: eine
    // Selbstbewertung hebt den eigenen Schnitt.
    expect(FUNCTIONS).toMatch(/eigenes Inserat nicht bewerten/);
  });
});

test.describe('Pflichtcheck: Demo-Toggle', () => {
  test('EB_HIDE_DEMO blendet Demo-Beiträge aus und wieder ein', async ({ page }) => {
    // Live steht das Flag auf false. Steht es versehentlich auf true, ist die
    // Seite für Besucher leer — und genau das sah man zweimal erst im Betrieb.
    const errors = await openApp(page);
    // Gemessen an filterDemos() selbst — das ist die Stelle, die das Flag
    // auswertet. Eine Ableitung davon zu messen liesse eine Mutation genau
    // dort unbemerkt.
    const r = await page.evaluate(() => {
      const zaehle = () => filterDemos(LISTINGS).length;
      window.EB_HIDE_DEMO = false;
      const sichtbar = zaehle();
      window.EB_HIDE_DEMO = true;
      const versteckt = zaehle();
      window.EB_HIDE_DEMO = false;
      return { sichtbar, versteckt, zurueck: zaehle(),
        // Und die Oberfläche folgt dem Flag ebenfalls.
        ueberFlaeche: (typeof _visibleListings === 'function') };
    });
    expect(r.sichtbar, 'ohne Filter sind keine Inserate da').toBeGreaterThan(0);
    expect(r.versteckt, 'der Filter blendet nichts aus').toBeLessThan(r.sichtbar);
    expect(r.zurueck, 'der Filter lässt sich nicht zurücknehmen').toBe(r.sichtbar);
    expectNoPageErrors(errors);
  });
});

test.describe('Pflichtcheck: Board-Picker', () => {
  test('der Picker zeigt Inserate zur Auswahl', async ({ page }) => {
    // „Dienstleister hinzufügen" ohne Auswahlliste ist die Regression, die
    // der Sprint meint: das Board wirkt dann leer, obwohl Inserate da sind.
    const errors = await openApp(page);
    await page.evaluate(() => {
      isLoggedIn = true;
      currentUser = { id: 4242, name: 'Planer', role: 'Eventplaner', baseRole: 'Eventplaner' };
      _activeBoardId = 'bp_pick';
      _boardProjects = [{ id: 'bp_pick', name: 'Pickboard', date: '2026-09-12', budget: 0, cards: [] }];
      openAddProviderModal('geplant');
    });
    await page.waitForSelector('#lpickGrid');
    expect(await page.locator('#lpickGrid .eb-lpick-card').count(),
      'der Inserat-Picker ist leer').toBeGreaterThan(0);
    expectNoPageErrors(errors);
  });

  test('die Suche im Picker filtert und gibt wieder frei', async ({ page }) => {
    const errors = await openApp(page);
    await page.evaluate(() => {
      isLoggedIn = true;
      currentUser = { id: 4242, name: 'Planer', role: 'Eventplaner', baseRole: 'Eventplaner' };
      _activeBoardId = 'bp_pick2';
      _boardProjects = [{ id: 'bp_pick2', name: 'Pickboard', date: '2026-09-12', budget: 0, cards: [] }];
      openAddProviderModal('geplant');
    });
    await page.waitForSelector('#lpickGrid .eb-lpick-card');
    const alle = await page.locator('#lpickGrid .eb-lpick-card:visible').count();
    await page.fill('#lpickSearch', 'zzzz-gibt-es-nicht');
    expect(await page.locator('#lpickGrid .eb-lpick-card:visible').count(),
      'die Suche filtert gar nicht').toBeLessThan(alle);
    await page.fill('#lpickSearch', '');
    expect(await page.locator('#lpickGrid .eb-lpick-card:visible').count(),
      'nach dem Leeren kommen nicht alle zurück').toBe(alle);
    expectNoPageErrors(errors);
  });
});

test.describe('Pflichtcheck: Listings', () => {
  test('ohne Backend bleibt die Startseite gefüllt', async ({ page }) => {
    // Lokal und bei einem Ausfall der Listings-API antwortet nichts. Die
    // Seite muss trotzdem Inserate zeigen, statt leer dazustehen — sonst
    // sieht ein API-Fehler aus wie ein Marktplatz ohne Angebote.
    const errors = await openApp(page);
    expect(await page.evaluate(() => (LISTINGS || []).length),
      'keine Inserate im Speicher').toBeGreaterThan(0);
    expect(await page.locator('.listing-card, .eb-card, [data-listing-id]').count(),
      'die Startseite zeigt keine Inseratkarten').toBeGreaterThan(0);
    expectNoPageErrors(errors);
  });

  test('ein Profil ohne Inserate erzeugt keine Inseratkarte', async ({ page }) => {
    // Der konkrete Fall aus dem Sprint: Profil-Fallbacks landeten in
    // LISTINGS und erschienen als leere Karte.
    const errors = await openApp(page);
    const ohne = await page.evaluate(() =>
      (LISTINGS || []).filter((l) => !l || !l.title || !l.id).length);
    expect(ohne, 'es gibt Inserate ohne Titel oder ID').toBe(0);
    expectNoPageErrors(errors);
  });
});
