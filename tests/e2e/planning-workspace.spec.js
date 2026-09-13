const { test, expect } = require('@playwright/test');
const { openApp, expectNoPageErrors, warteAufAppBereit } = require('./helpers');

async function planningApp(page) {
  let projects = [];
  await page.route('**/board-projects*', async route => {
    if (route.request().method() === 'POST') projects = route.request().postDataJSON().projects || [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects, deleted: [], success: true }) });
  });
  const errors = await openApp(page);
  await warteAufAppBereit(page);
  await page.evaluate(() => {
    currentUser = { id: 9301, name: 'Planerin', role: 'Eventplaner', baseRole: 'Eventplaner' };
    isLoggedIn = true;
    localStorage.setItem('eb_cookie_consent', JSON.stringify({essenziell:true,funktional:true,profil:false,ts:Date.now()}));
  });
  return errors;
}

async function createWedding(page) {
  await page.evaluate(() => startPlanningBoard({ template: 'wedding', name: 'Hochzeit Anna & Ben', date: '2027-06-12', budget: 12000, guests: 80 }));
  await page.locator('#createBoardModal button[type="submit"]').click();
  await expect(page.locator('#boardPlanningOverview')).toBeVisible();
}

test('Board opens with projects and has an explicit optional assistant', async ({ page }) => {
  const errors = await planningApp(page);
  await page.evaluate(() => navigateTo('board'));
  await expect(page.locator('.planning-starts')).toBeVisible();
  await expect(page.locator('#baiInput')).toHaveCount(0);
  await page.locator('[data-planning-action="assistant"]').click();
  await expect(page.locator('#baiInput')).toBeVisible();
  await page.locator('[data-planning-action="projects"]').click();
  await expect(page.locator('.planning-starts')).toBeVisible();
  expectNoPageErrors(errors, 'planning home and assistant');
});

test('Wedding creates real editable fragments and tasks without fake bookings', async ({ page }) => {
  const errors = await planningApp(page);
  await createWedding(page);
  await expect(page.locator('#boardEventName')).toHaveText('Hochzeit Anna & Ben');
  await expect(page.locator('#boardEventDate')).toContainText('12. Juni 2027');
  await expect(page.locator('.planning-fragment')).toHaveCount(18);
  await expect(page.locator('[data-fragment="venue"]')).toContainText('Location & Feier');
  await page.locator('[data-fragment="flowers"] [data-planning-field="enabled"]').uncheck();
  await expect(page.locator('[data-fragment="flowers"] .planning-fragment-fields')).toBeHidden();
  await page.locator('[data-fragment="venue"] [data-planning-field="budget"]').fill('3500');
  await page.locator('[data-fragment="venue"] [data-planning-field="budget"]').press('Tab');
  await page.locator('#planningFragmentName').fill('Hundebetreuung');
  await page.locator('#planningAddFragment button').click();
  const state = await page.evaluate(() => {
    const p = _boardProjects.find(p => p.id === _activeBoardId);
    return { p, persisted: JSON.parse(localStorage.getItem(_boardStorageKey())).find(x => x.id === p.id) };
  });
  expect(state.p.cards).toEqual([]);
  expect(state.p.checklist.length).toBeGreaterThan(10);
  expect(state.p.fragments.find(f => f.id === 'venue').budget).toBe(3500);
  expect(state.persisted.fragments.find(f => f.id === 'flowers').enabled).toBe(false);
  expect(state.persisted.fragments.some(f => f.title === 'Hundebetreuung')).toBe(true);
  await expect(page.locator('.planning-summary')).toContainText('3.500');
  expectNoPageErrors(errors, 'editable wedding planning');
});

test('Listing survives creation from the detail picker and Kanban renders it', async ({ page }) => {
  const errors = await planningApp(page);
  await page.evaluate(() => {
    _boardProjects = [];
    window._pendingAddListing = { id: 77001, title: 'Festsaal am See', providerName: 'Mara', providerId: 77002, category: 'location', price: 1500 };
    openCreateBoardModal({ template: 'wedding', name: 'Unsere Feier' });
  });
  await page.locator('#createBoardModal button[type="submit"]').click();
  await page.locator('#btnKanbanView').click();
  await expect(page.locator('#cardsGeplant')).toContainText('Mara');
  const data = await page.evaluate(() => {
    const p = _boardProjects.find(p => p.id === _activeBoardId);
    _addListingToBoardProject({ id: 77001, title: 'Festsaal am See' }, p.id);
    return { cards: p.cards, pending: window._pendingAddListing };
  });
  expect(data.cards).toHaveLength(1);
  expect(data.cards[0].providerId).toBe(77002);
  expect(data.cards[0].listingTitle).toBe('Festsaal am See');
  expect(data.pending).toBeNull();
  expectNoPageErrors(errors, 'detail to planning to Kanban');
});

test('Friends intent forwards activity context to shared planning without an AI detour', async ({ page }) => {
  const errors = await planningApp(page);
  const result = await page.evaluate(() => {
    window.startGroupPlanning = options => { window.receivedGroupIntent = options; };
    startPlanningBoard({ title: 'FC Spiel', intent: 'friends', date: '2026-10-01', activity: { id: 'fc-1', title: 'FC Spiel', sourceUrl: 'https://example.org/tickets' } });
    return { intent: window.receivedGroupIntent, aiVisible: !!document.querySelector('#boardProjects #baiInput') };
  });
  expect(result.intent.title).toBe('FC Spiel');
  expect(result.intent.activity.id).toBe('fc-1');
  expect(result.aiVisible).toBe(false);
  expectNoPageErrors(errors, 'shared planning routing');
});

test('Date input rejects impossible dates and accepts German and ISO forms', async ({ page }) => {
  await planningApp(page);
  const dates = await page.evaluate(() => ['31.02.2027', '2027-02-29', '29.02.2028', '12.6.2027', '2027-06-12'].map(planningNormalizeDate));
  expect(dates).toEqual(['', '', '2028-02-29', '2027-06-12', '2027-06-12']);
});

test('Booked project cannot disappear through either delete entry', async ({ page }) => {
  await planningApp(page);
  const state = await page.evaluate(() => {
    _boardProjects = [{ id: 'retained', name: 'Booked event', cards: [{ id: 'paid', stage: 'angebot', providerAcceptedAt: '2026-09-12' }] }];
    _activeBoardId = 'retained';
    window.confirm = () => true;
    deleteBoardProjectById('retained');
    _deleteFlowProject();
    return { ids: _boardProjects.map(p => p.id), tombstones: _boardTombstones };
  });
  expect(state.ids).toEqual(['retained']);
  expect(state.tombstones.some(t => t.id === 'retained')).toBe(false);
});
