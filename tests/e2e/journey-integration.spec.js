const {test,expect}=require('@playwright/test');
const {openApp,warteAufAppBereit}=require('./helpers');
const person={id:1,name:'Anna',handle:'anna',photoUrl:''};
const friend={id:2,name:'Ben',handle:'ben',photoUrl:''};
async function socialApp(page){
  const writes=[]; let group=null; const items=[];
  await page.route('**/wp-json/eventboerse/v1/social/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname.replace('/wp-json/eventboerse/v1/','');
    let body={};
    if(req.method()==='POST'){
      const data=req.postDataJSON();writes.push({path,data});
      if(path==='social/gruppen'){group={id:7,name:data.name,eventDate:data.eventDate,eventType:data.eventType,role:'owner',ownerId:1,memberCount:1,members:[{...person,role:'owner'}],inviteCode:'abcdef123456789012'};body={group};}
      else if(path==='social/gruppen/7/plan'){items.push({...data,id:items.length+1,status:'offen',betragCent:data.betragCent||0,rev:1,erstelltVon:person});body={item:items.at(-1)};}
    }else if(path==='social/ich')body={handle:'anna',person};
    else if(path==='social/freunde')body={friends:[friend],incoming:[],outgoing:[],blocked:[]};
    else if(path==='social/gruppen')body={groups:group?[group]:[],invitations:[]};
    else if(path==='social/gruppen/7/plan')body={items,bilanz:{posten:items.length,offen:items.length,summeCent:items.reduce((s,i)=>s+i.betragCent,0)}};
    else if(path.startsWith('social/suche'))body={results:[friend]};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  const errors=await openApp(page);await warteAufAppBereit(page);
  await page.evaluate(()=>{currentUser={id:1,name:'Anna',role:'Event-Planer'};isLoggedIn=true;});
  return {writes,errors};
}
test('Activity -> shared plan -> selected friend invitation preserves source and date',async({page})=>{
  const {writes,errors}=await socialApp(page);
  await page.evaluate(()=>startGroupPlanning({title:'FC Spiel',date:'2027-06-12',friendId:2,activity:{title:'FC Spiel',sourceUrl:'https://www.openligadb.de/'}}));
  await expect(page.locator('#sozGruppeName')).toHaveValue('FC Spiel');
  await expect(page.locator('#sozGruppeDatum')).toHaveValue('2027-06-12');
  await expect(page.locator('#sozPlanFreunde input')).toBeChecked();
  await page.getByRole('button',{name:'Plan erstellen',exact:true}).click();
  await expect(page.locator('#sozPlan7')).toContainText('FC Spiel');
  expect(writes.filter(w=>w.path==='social/gruppen')).toHaveLength(1);
  expect(writes.find(w=>w.path.endsWith('/einladen')).data.userId).toBe(2);
  expect(writes.find(w=>w.path.endsWith('/plan')).data.notiz).toContain('https://www.openligadb.de/');
  expect(errors).toEqual([]);
});
test('Mobile friends navigation and group creation have no horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await socialApp(page);
  await page.getByRole('button',{name:'Freunde & Gruppen',exact:true}).first().click();
  await expect(page.locator('#sozSuche')).toBeVisible();
  await page.getByRole('button',{name:'Zusammen planen',exact:true}).click();
  await expect(page.locator('#sozGruppeName')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
test('Switching accounts discards cached friends and in-flight responses',async({page})=>{
  await socialApp(page);await page.evaluate(()=>navigateTo('freunde'));
  await expect(page.locator('#freundeInhalt')).toContainText('Ben');
  await page.route('**/social/**',route=>route.fulfill({status:503,body:'{}'}));
  await page.evaluate(()=>{currentUser={id:3,name:'Clara'};return navigateTo('freunde');});
  await expect(page.locator('#freundeInhalt')).not.toContainText('Ben');
  await expect(page.locator('#freundeInhalt')).toContainText('konnte nicht geladen werden');
});
test('Group plan preserves cents instead of rounding to whole euros',async({page})=>{
  const {writes}=await socialApp(page);
  await page.evaluate(()=>startGroupPlanning({name:'Geburtstag'}));
  await page.getByRole('button',{name:'Plan erstellen',exact:true}).click();
  await expect(page.locator('#sozPlan7')).toBeVisible();
  await page.locator('#sozPlanTitel7').fill('Torte');await page.locator('#sozPlanEuro7').fill('49.95');
  expect(await page.locator('#sozPlanEuro7').evaluate(el=>el.checkValidity())).toBe(true);
  await page.locator('#sozPlan7').getByRole('button',{name:'add Hinzufügen',exact:true}).click();
  const transferred = await page.evaluate(()=>sozialPlanStartposten({
    fragments:[{title:'Location',budget:100,cardId:'venue',enabled:true},{title:'Musik',budget:49.95,enabled:true},{title:'Aus',enabled:false}],
    cards:[{id:'venue',title:'Saal',price:150,paid:true,paymentIntentId:'private'}]
  }));
  expect(transferred.map(i=>[i.titel,i.betragCent])).toEqual([['Location',15000],['Musik',4995]]);
  expect(JSON.stringify(transferred)).not.toContain('private');
  await expect.poll(()=>writes.filter(w=>w.path.endsWith('/plan')).length).toBe(1);
  expect(writes.find(w=>w.path.endsWith('/plan')).data.betragCent).toBe(4995);
});
test('Refund view respects server permission and pending state',async({page})=>{
  await socialApp(page);
  let canRefund=false;
  await page.route('**/stripe/settlement/pi_test',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,canRefund,refunds:[{status:'pending',amount:10000}],exact:{gross_cents:10000}})}));
  await page.evaluate(()=>bookingPaymentDetails('pi_test'));
  await expect(page.locator('#bookingPaymentDialog')).toContainText('Erstattung in Bearbeitung');
  await expect(page.locator('#bookingRefundForm')).toHaveCount(0);
  canRefund=true;await page.getByRole('button',{name:'Status aktualisieren',exact:true}).click();
  await expect(page.locator('#bookingRefundForm')).toHaveCount(0);
});

test('Shared invitation and provider routes resolve on WordPress without stale rewrite rules',()=>{
  const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
  const source=fs.readFileSync(path.join(__dirname,'../../functions.php'),'utf8');
  const section=source.slice(source.indexOf('function eb_spa_pages()'),source.indexOf('/* eb_spa Query-Var registrieren */'));
  const harness=`$actions=[];function add_action($name,$callback){global $actions;$actions[$name]=$callback;}function add_rewrite_rule($a,$b,$c){}\n${section}\n$out=[];foreach(['freunde','freunde/einladung','freunde/123','business','my-listings','auftraege','wp-admin','wp-json/eventboerse/v1','unknown','freunde/a/b'] as $path){$wp=(object)['request'=>$path,'query_vars'=>['error'=>'404']];$actions['parse_request']($wp);$out[$path]=$wp->query_vars;}echo json_encode($out);`;
  const result=JSON.parse(execFileSync('php',['-r',harness],{encoding:'utf8'}));
  for(const route of ['freunde','freunde/einladung','freunde/123','business','my-listings','auftraege'])expect(result[route]).toEqual({eb_spa:'1'});
  for(const route of ['wp-admin','wp-json/eventboerse/v1','unknown','freunde/a/b'])expect(result[route]).toEqual({error:'404'});
});
