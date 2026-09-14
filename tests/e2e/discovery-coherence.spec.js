const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const nearby = {
  version: 2, stand: new Date().toISOString(),
  mitte: {stadt:'Köln',lat:50.9375,lon:6.9603},
  gebiete:[{stadt:'Köln',lat:50.9375,lon:6.9603,umkreisKm:50}], quellen:[],
  eintraege:[
    {id:'osm:1',art:'ort',titel:'Museum am Rhein',kategorie:'Museum',beginn:null,ort:{stadt:'Köln',lat:50.94,lon:6.96},quelle:{name:'OpenStreetMap',url:'https://www.openstreetmap.org/node/1'}},
    {id:'osm:2',art:'ort',titel:'Kino am Rhein',kategorie:'Kino',beginn:null,ort:{stadt:'Köln',lat:50.95,lon:6.96},quelle:{name:'OpenStreetMap',url:'https://www.openstreetmap.org/node/2'}},
    {id:'sport:3',art:'sport',titel:'Spiel heute',beginn:new Date(Date.now()+3600000).toISOString(),ort:{stadt:'Köln',lat:50.96,lon:6.96},quelle:{name:'OpenLigaDB',url:'https://www.openligadb.de/'}},
    {id:'sport:4',art:'sport',titel:'Spiel nächste Woche',beginn:new Date(Date.now()+7*86400000).toISOString(),ort:{stadt:'Köln',lat:50.96,lon:6.96},quelle:{name:'OpenLigaDB',url:'https://www.openligadb.de/'}},
  ],
};
async function setup(page) {
  await page.route('**/assets/eb-aktivitaeten.json', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(nearby)}));
  const errors = await openApp(page);
  await page.evaluate(() => navigateTo('aktuelles','jetzt'));
  await expect(page.locator('#feedList')).toContainText('Museum am Rhein');
  return errors;
}

test('Jetzt filters dates and categories and carries its activity into real planning', async ({page}) => {
  const errors = await setup(page);
  await page.getByRole('button',{name:'Nächste 4 Stunden',exact:true}).click();
  await expect(page.locator('#feedList')).toContainText('Spiel heute');
  await expect(page.locator('#feedList')).not.toContainText('Spiel nächste Woche');
  await page.locator('#feedJetztCategory').selectOption('Museum');
  await expect(page.locator('#feedList')).toContainText('Museum am Rhein');
  await expect(page.locator('#feedList')).not.toContainText('Kino am Rhein');
  await page.evaluate(() => { window.startPlanningBoard = options => { window.__planning = options; }; });
  await page.locator('.akt-karte').filter({hasText:'Museum am Rhein'}).getByRole('button',{name:'Mit Freunden planen'}).click();
  const plan = await page.evaluate(() => window.__planning);
  expect(plan).toMatchObject({intent:'friends',title:'Museum am Rhein',location:'Köln',activity:{id:'osm:1',sourceName:'OpenStreetMap'}});
  expect(errors).toEqual([]);
});

test('Radar shows the same public activities, respects demo privacy and opens sources', async ({page}) => {
  const errors = await setup(page);
  await page.evaluate(() => { window.EB_HIDE_DEMO = true; navigateTo('aktuelles','radar'); });
  await expect(page.locator('#feedRadarResults')).toContainText('Museum am Rhein');
  expect(await page.evaluate(() => radarUmkreis(radarStand().pos,50).filter(t => t.art === 'event').length)).toBe(0);
  await page.locator('#feedRadarType').selectOption('aktivitaeten');
  await page.locator('#feedJetztCategory').selectOption('Kino');
  await expect(page.locator('#feedRadarResults')).toContainText('Kino am Rhein');
  await expect(page.locator('#feedRadarResults')).not.toContainText('Museum am Rhein');
  await page.evaluate(() => { window.open = (url,target,features) => { window.__external = {url,target,features}; }; });
  await page.locator('.feed-radar-result').filter({hasText:'Kino am Rhein'}).locator('.feed-radar-result-open').click();
  expect(await page.evaluate(() => window.__external)).toMatchObject({url:'https://www.openstreetmap.org/node/2',features:'noopener,noreferrer'});
  expect(errors).toEqual([]);
});

test('Location choice stays coherent between Jetzt, search and map; map search stays on map', async ({page}) => {
  await setup(page);
  await page.locator('#feedJetztCity').selectOption('Berlin');
  await expect(page.locator('#browseLocation')).toHaveValue('Berlin');
  expect(await page.evaluate(() => radarOrtsname(radarStand().pos.lat,radarStand().pos.lng))).toBe('Berlin');
  await page.evaluate(() => toggleMapOverlay());
  await expect(page.locator('#mapOverlay')).toHaveClass(/show/);
  await page.locator('#mapSearchInput').fill('Köln');
  await page.locator('#mapSearchInput').press('Enter');
  await expect(page.locator('#mapOverlay')).toHaveClass(/show/);
  await expect(page.locator('#browseLocation')).toHaveValue('Köln');
});

test('Known ongoing activity remains visible, past/cancelled or invalid coordinates do not', async ({page}) => {
  await setup(page);
  const result = await page.evaluate(() => {
    const now = new Date('2026-09-13T12:00:00Z');
    const mk = (id,extra) => Object.assign({id,art:'sport',titel:id,beginn:'2026-09-13T11:00:00Z',ort:{lat:50.94,lon:6.96}},extra);
    const data = {eintraege:[mk('ongoing',{ende:'2026-09-13T14:00:00Z'}),mk('past',{}),mk('cancelled',{status:'cancelled',ende:'2026-09-13T14:00:00Z'}),mk('bad',{beginn:'2026-09-13T14:00:00Z',ort:{lat:Infinity,lon:6.96}})]};
    return ebAktivitaetenImUmkreis(data,{lat:50.94,lng:6.96},50,now).termine.map(t=>t.daten.id);
  });
  expect(result).toEqual(['ongoing']);
});

test('Concurrent activity consumers both finish after one request', async ({page}) => {
  await setup(page);
  const result = await page.evaluate(async () => {
    _aktZustand='kalt'; _aktBestand=null;
    const done=[];
    await Promise.all([ebAktivitaetenLaden(()=>done.push('feed')),ebAktivitaetenLaden(()=>done.push('map'))]);
    return done.sort();
  });
  expect(result).toEqual(['feed','map']);
});
