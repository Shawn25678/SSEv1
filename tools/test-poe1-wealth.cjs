const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const c = vm.createContext({ console, URL, URLSearchParams, Map, Set, Date, performance,
  window: { addEventListener() {} }, localStorage: { getItem() { return null; }, setItem() {} },
  document: { addEventListener() {}, getElementById() { return { dataset: {}, addEventListener() {} }; } },
  setTimeout() {}, clearTimeout() {}, setInterval() {} });
const appSource = fs.readFileSync('app.js', 'utf8');
let source = appSource;
source = source.slice(0, source.indexOf('document.addEventListener("click", onClick)')) +
  source.slice(source.indexOf('function ninjaCurrencyPrice'), source.indexOf('window.chrome?.webview?.addEventListener("message", event =>'));
vm.runInContext(fs.readFileSync('bosses.js', 'utf8'), c);
vm.runInContext(source.replace(/^applyTheme\(.*?\);$/m, ''), c);
const run = text => vm.runInContext(text, c);
run('state.activeGame="poe1"; state.poe1League="Covens"; poe1Prices.league="Covens"; poe1Prices.chaosPerDivine=200;');
const poe2DivineIcon = 'https://web.poecdn.com/image/poe2-divine.png';
c.poe2DivineIcon = poe2DivineIcon;
run('iconCache.set("divine orb", poe2DivineIcon);');
assert.match(c.wealthTotalHtml(2), /ec48896769\/CurrencyModValues\.png/, 'PoE 1 Wealth uses its Divine Orb before prices load');
run('state.activeGame="poe2";');
assert.equal(c.lookupIcon('Divine Orb'), poe2DivineIcon, 'PoE 2 keeps its ordinary icon lookup');
assert.match(c.wealthChart([{at:1,total:2},{at:2,total:3}]), /wealth-replay-clip/);
run('state.activeGame="poe1"; iconCache.delete("divine orb");');
const compact = { items: [
  { id:1, name:'Fireball', category:'gem', mean:40, gemLevel:20, gemQuality:20, gemIsCorrupted:false },
  { id:2, name:'Fireball', category:'gem', mean:80, gemLevel:21, gemQuality:20, gemIsCorrupted:true },
  { id:3, name:'The Test', category:'card', mean:20 },
  { id:4, name:'Bad Price', category:'currency', mean:500, lowConfidence:true },
  { id:5, name:'Missing Price', category:'currency', mean:null },
] };
const exchange = { items: [
  { id:3, name:'The Test', category:'card', price:{chaos:30,lowConfidence:false}, chaos:{volume24H:3}, divine:{volume24H:9} },
] };
const watchRows = c.watchPriceRows(compact, exchange, [], 200);
assert.equal(watchRows.length, 3);
assert.equal(watchRows.find(r=>r.name==='The Test').divine, .15);
c.fixture = [compact, exchange, []];
c.ninjaCards = {
  core: { primary:'chaos' },
  items: [
    {id:'the-test',name:'The Test'},
    {id:'no-sales',name:'No Sales'},
    {id:'the-unexpected-prize',name:'The Unexpected Prize'},
  ],
  lines: [
    {id:'the-test',primaryValue:50,volumePrimaryValue:2.5},
    {id:'no-sales',primaryValue:1,volumePrimaryValue:0},
    {id:'the-unexpected-prize',primaryValue:12.53,volumePrimaryValue:181.7},
  ],
};
run('takePoe1Lines(ninjaCards,"DivinationCard",false); mergePoe1Watch(fixture);');
assert.equal(c.wealthUnit('The Test', {name:'The Test',frameType:6}), .25, 'ninja wins over fallback');
{
  const card = {name:'The Test',frameType:6,count:24};
  const timestamp = Math.floor(Date.now() / 1000);
  const chaos = {value:1,volume:19,timestamp,lowConfidence:false};
  const divine = {value:26,volume:1,timestamp,lowConfidence:true};
  const rates = (chaos, divine) => c.mergePoe1Watch([null, {items:[{name:card.name,category:'card',chaos,divine}]}, []]);
  run('poe1Prices.tables.DivinationCard[0].amount=5200;');
  rates(chaos, divine);
  assert.equal(c.wealthUnit(card.name, card), 1/200, 'uses the direct Chaos quote below one Divine');
  assert.equal(c.wealthValue([card]).total, 24/200);
  assert.equal(c.poe1WealthCardValues([card])[0][2], 24/200, 'saved chart contributions use the same price');
  run('state.activeGame="poe2";');
  assert.equal(c.wealthUnit(card.name, card), null, 'the PoE 2 path does not use PoE 1 exchange pairs');
  run('state.activeGame="poe1";');
  rates({...chaos,value:220}, {...divine,value:1.15,lowConfidence:false});
  assert.equal(c.wealthUnit(card.name, card), 1.15, 'uses the direct Divine quote for a higher-value card');
  rates({...chaos,value:220}, divine);
  assert.equal(c.wealthUnit(card.name, card), 220/200, 'converts Chaos when the Divine pair is low confidence');
  rates({...chaos,timestamp:timestamp-25*3600}, divine);
  assert.equal(c.wealthUnit(card.name, card), 26, 'falls back to the existing quote if both pairs are unusable');
  run('poe1Prices.tables.DivinationCard[0].amount=50;');
  c.mergePoe1Watch([null, {items:[]}, []]);
}
assert.equal(c.wealthUnit('Fireball', {name:'Fireball',frameType:4,gemLevel:20,gemQuality:20,corrupted:false}), .2);
assert.equal(c.wealthUnit('Fireball', {name:'Fireball',frameType:4,gemLevel:21,gemQuality:20,corrupted:true}), .4);
assert.equal(c.wealthUnit('Fireball', {name:'Fireball',frameType:4,gemLevel:1,gemQuality:0}), null);
assert.equal(c.wealthUnit('Fireball'), null, 'unknown variants must not get arbitrary gem prices');
run('state.poe1WealthMinChaos=20;');
assert.equal(c.wealthValue([{name:'Chaos Orb',count:20}]).total,.1,'a stack at the minimum is included');
run('state.poe1WealthMinChaos=21;');
assert.deepEqual({...c.wealthValue([{name:'Chaos Orb',count:20},{name:'Chaos Orb',count:2000},{name:'Divine Orb',count:1}])},{total:11,unpriced:0});
assert.equal(c.wealthHistoryMatches({league:'Covens',poe1Scope:'[21,[],[]]'},'Covens',c.poe1WealthScope()),false,'old per-unit totals do not distort the stack-value chart');
run('state.poe1WealthMinChaos=2;');
run('ui.wealth={league:"Covens", slots:[{name:"The Test",count:1,stash:"1",stashName:"Cards"},{name:"Divine Orb",count:1,stash:"2",stashName:"Currency"}],poe1Tabs:[{index:1,name:"Cards"},{index:2,name:"Currency"}],manageTabs:true};state.poe1StashOn={Covens:{1:false}};');
assert.deepEqual(Array.from(run('trackedWealthSlots(wealthDraft())'),slot=>slot.name),['Divine Orb']);
assert.equal(c.wealthHistoryMatches({league:'Covens'},'Covens',c.poe1WealthScope()),false,'old minimum does not distort the new chart');
run('wealthDraft().hiddenOpen=true;');
assert.match(run('poe1WealthSidebar(wealthDraft(), [], new Map())'), /data-poe1-stash="1"\s+aria-label="Show Cards"/);
run('ui.wealth.stashFilter="2"; applyPoe1StashTabs(wealthDraft(), [{index:1,name:"Old Cards",type:"DivinationCardStash"},{index:2,name:"Crafting supplies",type:"CurrencyStash",colour:"386545"},{index:4,name:"Empty tab",type:"FragmentStash"}]);');
assert.equal(run('wealthDraft().slots[1].stashName'),'Crafting supplies');
assert.equal(run('savedPoe1Tabs("Covens")[1].name'),'Crafting supplies');
assert.equal(run('wealthDraft().stashFilter'),'2','renaming keeps the selected tab');
assert.equal(run('poe1StashOn(1)'),false,'renaming preserves tracked-tab choices');
assert.match(run('poe1WealthSidebar(wealthDraft(), [], new Map())'), /Crafting supplies/);
run('askPoe1Session=()=>{}; queuePoe1Tabs=()=>{}; itemIconHtml=()=>"";');
run('poe1LeagueList=[{id:"Standard",name:"Standard"},{id:"Covens",name:"Covens"}];');
const wealthLayout = c.renderWealth();
assert.match(wealthLayout, /<select id="wealth-poe1-league"[^>]*><option value="Standard">Standard<\/option><option value="Covens" selected>Covens<\/option><\/select>/);
assert.match(wealthLayout, /class="wealth-overview"[\s\S]*?data-wealth-read-tab[\s\S]*?Value over time[\s\S]*?Value breakdown/);
assert.match(wealthLayout, /wealth-items-layout[\s\S]*wealth-stash-sidebar[\s\S]*data-wealth-select-tab="2" aria-pressed="true"[\s\S]*Crafting supplies[\s\S]*wealth-sheet/);
assert.match(wealthLayout, /data-wealth-select-tab="4"[\s\S]*Empty tab/);
assert.match(wealthLayout, /data-wealth-select-tab="2"[^>]*>[\s\S]*?aria-label="Currency tab"[\s\S]*?Crafting supplies/);
assert.match(wealthLayout, /wealth-stash-row" style="--stash-accent:#386545"[^>]*>\s*<input[^>]*data-poe1-stash="2"/);
assert.doesNotMatch(wealthLayout, /id="wealth-stash-filter"/);
assert.doesNotMatch(wealthLayout, /id="wealth-min-card-volume"/);
assert.doesNotMatch(wealthLayout, />Unpriced<|>Included<|>Excluded<|>Filtered cards</);
assert.match(wealthLayout, />Filtered items</);
assert.match(wealthLayout, /value="unit-value"[^>]*>Highest unit value/);
run('poe1Prices.tables.Fragment=[{name:"Simulacrum",icon:"https://web.poecdn.com/image/Simulacrum.png"},{name:"Fragment of Knowledge",icon:"https://web.poecdn.com/image/Knowledge.png"}];');
assert.match(c.poe1StashTabIcon({type:'FragmentStash'}), /Knowledge\.png/);
assert.match(c.poe1StashTabIcon({type:'DeliriumStash'}), /Simulacrum\.png/);
run('poe1Prices.tables.Fragment=[{name:"Simulacrum",type:"Fragment",divine:1,amount:200},{name:"The Test",type:"Fragment",divine:9,amount:1800},{name:"Untracked fragment",type:"Fragment",divine:2,amount:400}]; poe1Prices.wealthIndex=null;');
assert.equal(c.wealthUnit('The Test',{name:'The Test',frameType:6}),.25,'cards cannot use same-name fragment quotes');
assert.equal(c.wealthUnit('Simulacrum',{name:'Simulacrum',frameType:6}),null);
run('ui.wealth.stashFilter=""; ui.wealth.slots.push({name:"Simulacrum",count:1,stash:"2",stashName:"Crafting supplies",frameType:5},{name:"Untracked fragment",count:1,stash:"1",stashName:"Old Cards",frameType:5});');
assert.match(c.renderWealth(), /data-wealth-category="Fragment"[\s\S]*?<b>Fragments<\/b>/);
c.document.querySelector = selector => selector === '.wealth-sheet' ? {
  scrollIntoView() { assert.fail('selecting a breakdown category must not scroll to the item table'); },
} : null;
c.onClick({target:{closest: selector => selector === '[data-wealth-category]' ? {dataset:{wealthCategory:'Fragment'}} : null}});
assert.equal(run('ui.wealth.categoryFilter'), 'Fragment');
const fragmentsTable = c.renderWealth().split('<tbody>')[1].split('</tbody>')[0];
assert.match(fragmentsTable, /Simulacrum[\s\S]*Crafting supplies/);
assert.doesNotMatch(fragmentsTable, /Divine Orb|Untracked fragment/);
const card = {name:'The Test',frameType:6,count:2,stash:'1',stashName:'Old Cards'};
const noVolume = {name:'No Volume',frameType:6,count:1,stash:'1',stashName:'Old Cards'};
const orb = {name:'Divine Orb',frameType:5,count:1,stash:'2',stashName:'Crafting supplies'};
assert.equal(c.poe1WealthCardVolume(card), 2.5, 'use the exchange value per hour directly');
assert.equal(c.poe1WealthCardVolume({name:'The Unexpected Prize',frameType:6}), 181.7);
assert.equal(c.poe1WealthCardVolume({name:'No Sales',frameType:6}), 0);
assert.equal(c.poe1WealthCardVolume(noVolume), null);
assert.equal(c.poe1WealthCardVolume(orb), undefined);
c.volumeSlots = [card, noVolume, orb];
run('state.poe1StashOn={}; ui.wealth.slots=volumeSlots; ui.wealth.categoryFilter="";');
const oldWealthScope = c.poe1WealthScope();
run('state.poe1WealthMinCardVolume=100;');
assert.equal(c.poe1WealthMinCardVolume(), 0, 'the old cards-per-hour threshold cannot become a Chaos threshold');
assert.equal(c.poe1WealthScope(), oldWealthScope);
run('state.poe1WealthMinCardChaosPerHour=2.5;');
assert.equal(c.wealthValue(c.volumeSlots).total, 1.5, 'include cards at the exact threshold');
run('state.poe1WealthMinCardChaosPerHour=2.51;');
assert.equal(c.wealthValue(c.volumeSlots).total, 1, 'low and unavailable volumes only exclude cards');
assert.equal(c.wealthStashTotals(c.volumeSlots)[0].total, 0);
assert.notEqual(c.poe1WealthScope(), oldWealthScope);
const volumeTable = () => c.renderWealth().split('<tbody>')[1].split('</tbody>')[0];
assert.doesNotMatch(volumeTable(), /The Test|No Volume|wealth-card-warning/);
assert.doesNotMatch(c.renderWealth(), />Filtered cards</);
const selectWealthStash = value => c.onClick({target:{closest: selector =>
  selector === '[data-wealth-select-tab]' ? {dataset:{wealthSelectTab:value}} : null}});
selectWealthStash('1');
assert.match(c.renderWealth(), />Filtered cards</);
run('ui.wealth.itemFilter="card-volume";');
assert.match(c.renderWealth(), /aria-label="Divination card options"[\s\S]*?id="wealth-min-card-volume"/);
assert.match(volumeTable(), /The Test[\s\S]*?wealth-card-warning[\s\S]*?Low volume/);
assert.match(volumeTable(), /No Volume[\s\S]*?Volume unavailable/);
assert.doesNotMatch(volumeTable(), /Divine Orb/);
run('state.poe1WealthMinChaos=101;');
assert.match(volumeTable(), /The Test[\s\S]*?Low volume/, 'filtered cards remain visible below the minimum item value');
assert.match(volumeTable(), /No Volume[\s\S]*?Volume unavailable/);
run('ui.wealth.categoryFilter="Fragment";');
c.onChange({target:{dataset:{wealthOption:'itemFilter'},value:'card-volume',matches:()=>false}});
assert.equal(run('ui.wealth.categoryFilter'), '');
assert.match(volumeTable(), /The Test/);
selectWealthStash('2');
assert.equal(run('ui.wealth.itemFilter'), 'all');
assert.doesNotMatch(c.renderWealth(), />Filtered cards</);
assert.doesNotMatch(volumeTable(), /The Test|No Volume/, 'the selected stash still applies');
selectWealthStash('1');
run('state.poe1WealthMinChaos=2; ui.wealth.itemFilter="card-volume";');
const selectFilteredCards = value => c.onClick({target:{closest: selector =>
  selector === '[data-wealth-card-select]' ? {dataset:{wealthCardSelect:value}} : null}});
assert.match(c.renderWealth(), /data-wealth-card-select="all"[^>]*>Select all/);
assert.match(c.renderWealth(), /data-wealth-card-select="none"[^>]*disabled>Deselect all/);
assert.match(volumeTable(), /aria-label="Include The Test" aria-pressed="false"/);
const filteredScope = c.poe1WealthScope();
run('ui.wealth.limit=1;');
assert.doesNotMatch(volumeTable(), /No Volume/, 'the next matching card is beyond the displayed page');
selectFilteredCards('all');
assert.equal(c.wealthValue(c.volumeSlots).total, 1.5);
assert.equal(c.wealthStashTotals(c.volumeSlots)[0].total, .5);
assert.notEqual(c.poe1WealthScope(), filteredScope);
assert.deepEqual(Array.from(run('state.poe1IncludedLowVolumeCards')), ['The Test','No Volume']);
assert.match(volumeTable(), /aria-label="Exclude The Test" aria-pressed="true"[\s\S]*?Low volume/);
run('ui.wealth.itemFilter="all";');
assert.doesNotMatch(volumeTable(), /The Test|No Volume/, 'manual selection keeps low-volume rows in the dedicated view');
run('ui.wealth.itemFilter="card-volume";');
run('ui.wealth.find="the test";');
selectFilteredCards('none');
assert.deepEqual(Array.from(run('state.poe1IgnoredWealth')), ['The Test']);
assert.deepEqual(Array.from(run('state.poe1IncludedLowVolumeCards')), ['No Volume']);
assert.equal(c.wealthValue(c.volumeSlots).total, 1);
run('ui.wealth.find=""; ui.wealth.limit=100;');
selectFilteredCards('none');
assert.deepEqual(Array.from(run('state.poe1IgnoredWealth')), ['The Test','No Volume']);
assert.deepEqual(Array.from(run('state.poe1IncludedLowVolumeCards')), []);
run('state.poe1IgnoredWealth=[];');
selectWealthStash('');
run('ui.wealth.itemFilter="all";');
assert.match(volumeTable(), /Divine Orb/);
assert.doesNotMatch(volumeTable(), /The Test|No Volume/);
run('state.poe1WealthMinCardChaosPerHour=0; ui.wealth.itemFilter="all";');
assert.match(volumeTable(), /The Test[\s\S]*?2[.,]5c\/h/);
assert.doesNotMatch(volumeTable(), /wealth-card-warning/);
assert.doesNotMatch(c.renderWealth(), /data-wealth-card-select/);
assert.doesNotMatch(c.renderWealth(), /id="wealth-min-card-volume"/);
run('ui.wealth.categoryFilter="DivinationCard";');
assert.match(c.renderWealth(), /aria-label="Divination card options"[\s\S]*?id="wealth-min-card-volume"/);
assert.doesNotMatch(c.renderWealth(), /data-wealth-card-select/);
run('ui.wealth.categoryFilter="Fragment";');
assert.doesNotMatch(c.renderWealth(), /id="wealth-min-card-volume"/);
c.sortSlots = [{...card,count:10}, noVolume, orb];
run('ui.wealth.categoryFilter=""; ui.wealth.slots=sortSlots;');
assert.match(volumeTable(), /The Test[\s\S]*?Divine Orb/);
assert.match(volumeTable(), /No Volume[\s\S]*?Unpriced/);
c.onChange({target:{dataset:{wealthOption:'sort'},value:'unit-value',matches:()=>false}});
assert.match(volumeTable(), /Divine Orb[\s\S]*?The Test/);
assert.match(c.renderWealth(), /value="unit-value" selected>Highest unit value/);
run(`poe1Prices.tables.Essence=[
  {name:"Shrieking Essence of Dread",type:"Essence",divine:.01,amount:2},
  {name:"Shrieking Essence of Greed",type:"Essence",divine:.01,amount:2}
]; poe1Prices.wealthIndex=null;
state.poe1WealthMinChaos=5;
ui.wealth.slots=[
  {name:"Shrieking Essence of Dread",frameType:5,count:3,stash:"Ess"},
  {name:"Shrieking Essence of Greed",frameType:5,count:2,stash:"Ess"}
]; ui.wealth.stashFilter="Ess";`);
assert.match(volumeTable(), /Shrieking Essence of Dread/);
assert.doesNotMatch(volumeTable(), /Shrieking Essence of Greed/);
assert.match(c.renderWealth(), /1 below minimum/);
assert.match(c.renderWealth(), /data-wealth-category="Essence"/);
assert.equal(run('wealthValue(ui.wealth.slots).total'), .03);
assert.equal(run('wealthStashTotals(ui.wealth.slots)[0].total'), .03);
assert.doesNotMatch(c.renderWealth(), />Filtered cards</);
const essence = 'Shrieking Essence of Dread';
c.setWealthSelection([essence], false, false);
assert.doesNotMatch(volumeTable(), /Shrieking Essence of Dread/);
assert.equal(run('wealthValue(ui.wealth.slots).total'), 0);
run('state.poe1WealthMinChaos=10; ui.wealth.itemFilter="filtered-items";');
assert.match(volumeTable(), /aria-label="Include Shrieking Essence of Dread" aria-pressed="false"/);
assert.doesNotMatch(volumeTable(), /Shrieking Essence of Greed/);
c.setWealthSelection([essence], true, false);
assert.doesNotMatch(volumeTable(), /Shrieking Essence of Dread/);
run('state.poe1WealthMinChaos=5; ui.wealth.itemFilter="all";');
assert.match(volumeTable(), /Shrieking Essence of Dread/);
c.cardTab = {index:7,type:'PremiumStash'};
c.mixedTab = {index:8,type:'PremiumStash'};
assert.equal(c.poe1WealthCardStash({stashFilter:'7',poe1Tabs:[c.cardTab],slots:[{...card,stash:'7'}]}),true);
assert.equal(c.poe1WealthCardStash({stashFilter:'8',poe1Tabs:[c.mixedTab],slots:[{...card,stash:'8'},{...orb,stash:'8'}]}),false);
run('state.poe1StashOn={}; state.poe1WealthMinChaos=0; ui.wealth=null; poe1Prices.attemptLeague="Covens"; poe1Prices.attemptedAt=1000;');
assert.equal(c.poe1PricesDue('Covens',900999),false);
assert.equal(c.poe1PricesDue('Covens',901000),true);
assert.equal(c.poe1PricesDue('Standard',1001),true);
run('state.poe1IgnoredWealth=["The Test"];');
assert.equal(c.wealthValue([{name:'The Test',count:10}]).total, 0);
run('state.poe1League="Standard";');
assert.equal(c.wealthUnit('The Test'), null, 'league isolation');
run('state.activeGame="poe2"; lookupPrice=()=>({divine:7}); hitDivine=()=>7;');
assert.equal(c.wealthUnit('Fireball', {frameType:4}),7, 'PoE2 retains original lookup');
assert.equal(c.poe1GeneralPriceItem({name:'Chaos Orb',rarity:'Currency',className:'Stackable Currency'}),false);
run('state.activeGame="poe1";');
for (const [base, cls] of [['Fright Claw','Claws'],['Crude Bow','Bows'],['Timeworn Claw','Claws'],['Grinning Fetish','Sceptres'],['Throat Stabber','Claws'],['Sage Wand','Wands']]) {
  const item = c.parsePoeItem(`Item Class: ${cls}\nRarity: Unique\n${base}\n--------\nItem Level: 40\n--------\nUnidentified`);
  assert.ok(item.unidentified,base);
  assert.ok(c.uniqueVariantsForBase(item.baseType,cls).length,base+' choices');
  assert.ok(c.overlayUnidHtml({id:'test'},item).includes('data-pick-unid'),base+' toggle');
  assert.equal(c.resistanceControlsHtml({id:'test'},item),'');
}
const day = 86400000;
const now = Date.now();
const saved = {
  poe1IgnoredWealth: ['Divine Orb', 'Divine Orb', null],
  poe1IncludedLowVolumeCards: ['The Test'],
  poe1StashOn: {Covens:{1:'false',2:'true'}},
  wealthSeries: [
    {league:'Covens',at:now-day,total:5,poe1Scope:'[0,[],[]]'},
    {league:'Covens',at:now-26*day,total:2,poe1Scope:'[10,[],["Divine Orb"]]'},
    {league:'Standard',at:now-day,total:200,poe1Scope:'[0,[],[]]'},
    {league:'Standard',at:now-day,total:12},
  ],
};
c.localStorage.getItem = () => JSON.stringify(saved);
c.upgraded = c.loadState();
c.localStorage.getItem = () => null;
assert.deepEqual(Array.from(c.upgraded.poe1IgnoredWealth), ['Divine Orb']);
assert.deepEqual(Array.from(c.upgraded.poe1IncludedLowVolumeCards), ['The Test']);
assert.equal(c.upgraded.wealthSeries.length,1,'PoE 2 keeps its own history');
assert.equal(c.upgraded.poe1WealthSeries.length,3);
assert.ok(c.upgraded.poe1WealthSeries.every(row=>row.poe1Scope.startsWith('scope:')));
const priorState = run('state');
const priorWealth = run('ui.wealth');
c.priorState = priorState;
c.priorWealth = priorWealth;
run('state=upgraded; state.activeGame="poe1"; state.poe1League="Covens"; ui.wealth=null;');
assert.deepEqual(Array.from(c.wealthSamples(c.wealthDraft()),row=>row.total),[2,5]);
assert.equal(c.poe1StashOn(1),false);
assert.equal(c.poe1StashOn(2),true);
assert.match(c.renderWealth(),/Value over time/,'history is available before reading the stash');
assert.equal(c.poe1WealthPerHour(c.wealthSamples(c.wealthDraft())),null,'different filters do not produce an hourly rate');
run('state.poe1WealthMinChaos=100;');
assert.deepEqual(Array.from(c.wealthSamples(c.wealthDraft()),row=>row.total),[2,5]);
run('state=priorState; ui.wealth=priorWealth;');
{
  const hour = 3600000;
  const beforeHistoryReview = run('state.poe1WealthSeries');
  const beforeReviewDraft = run('ui.wealth');
  const beforeReviewView = run('ui.view');
  const beforeReviewLeague = run('state.poe1League');
  const beforeReviewPaint = c.repaintWealth;
  const beforeReviewPublish = c.publishWealthLive;
  const beforeReviewStorage = c.localStorage.setItem;
  const beforeCardSelection = run('state.poe1IgnoredWealth');
  const beforeCardUnit = c.wealthUnit;
  let savedReview;
  c.localStorage.setItem = (_, value) => { savedReview = JSON.parse(value); };
  c.repaintWealth = () => {};
  c.publishWealthLive = () => {};
  const hunter = "Hunter's Resolve";
  const league = 'Covens';
  const at = now-hour;
  const newer = {league,at,total:645,stashes:[{id:'cd',name:'Cards',total:630},{id:'mats',name:'Currency',total:15}],
    cardValues:[[hunter,'cd',624],['The Watcher','cd',6]]};
  const history = [{league,at:now-4*hour,total:70},{league,at:now-3*hour,total:41},
    {league,at:now-2*hour,total:647,itemChanges:[{name:hunter,unit:26,count:24}]},newer];
  c.cardHistoryUpgrade = {poe1WealthSeries:history,
    poe1WealthItemReadings:[{league,at:now-3*hour,scope:c.poe1WealthScopeId(),items:[{name:hunter,total:17}]}],
    poe1WealthSpikeDecisions:{Covens:{[at]:'false-price'}}};
  assert.equal(c.restorePoe1WealthState(c.cardHistoryUpgrade),undefined);
  assert.equal(c.cardHistoryUpgrade.poe1WealthSpikeDecisions,undefined);
  assert.equal(c.cardHistoryUpgrade.poe1WealthItemReadings,undefined);
  run('state.poe1League="Covens"; state.poe1WealthSeries=cardHistoryUpgrade.poe1WealthSeries; state.poe1IgnoredWealth=[]; ui.wealth=null; ui.view="wealth";');
  const readTotals = () => Array.from(c.wealthSamples(c.wealthDraft()),point=>point.total);
  assert.deepEqual(readTotals(),[70,41,647,645]);
  const checkbox = name => c.onClick({target:{closest:selector=>selector==='[data-wealth-ignore]' ? {
    dataset:{wealthIgnore:name},getAttribute:()=>String(!c.ignoredWealth(name)),hasAttribute:()=>false,
  } : null}});
  checkbox(hunter);
  assert.deepEqual(readTotals(),[70,24,23,21]);
  assert.deepEqual(Array.from(c.wealthSamples(c.wealthDraft()).at(-1).stashes,row=>row.total),[6,15]);
  assert.ok(savedReview.poe1IgnoredWealth.includes(hunter));
  assert.equal(savedReview.poe1WealthSeries[0].total,645);
  const filteredChart = c.renderWealth();
  assert.doesNotMatch(filteredChart,/Review spikes|False price|>600d<\/text>/);
  assert.doesNotMatch(filteredChart,/Older readings without saved card values/);
  const visibleTotals = JSON.parse(decodeURIComponent(filteredChart.match(/data-wealth-pts="([^"]+)"/)[1]));
  assert.deepEqual(visibleTotals.map(point=>point.total),[70,24,23,21]);
  checkbox(hunter);
  assert.deepEqual(readTotals(),[70,41,647,645]);
  c.wealthUnit = (_, slot) => slot.unit;
  const cards = [{name:hunter,frameType:6,stash:'cd',count:24,unit:26},
    {name:hunter,frameType:6,stash:'other',count:1,unit:26},
    {name:'Divine Orb',frameType:5,stash:'mats',count:3,unit:1}];
  assert.deepEqual(Array.from(c.poe1WealthCardValues(cards),row=>Array.from(row)),[[hunter,'cd',624],[hunter,'other',26]]);
  checkbox(hunter);
  const excludedValues = c.poe1WealthCardValues(cards);
  assert.deepEqual(Array.from(excludedValues,row=>Array.from(row)),[[hunter,'cd',-624],[hunter,'other',-26]]);
  c.excludedCardPoint = {league,at:now,total:3,cardValues:excludedValues};
  run('state.poe1WealthSeries=[excludedCardPoint];');
  assert.deepEqual(readTotals(),[3]);
  checkbox(hunter);
  assert.deepEqual(readTotals(),[653]);
  c.wealthUnit = beforeCardUnit;
  c.beforeCardSelection = beforeCardSelection;
  run('state.poe1IgnoredWealth=beforeCardSelection;');
  c.axisFixture = [4.4,5,6,580,8,20,44,280,70,81,82.2].map((total,index)=>({
    at:now-(10-index)*6*hour,total,league:'Covens',
  }));
  run('state.poe1WealthSeries=axisFixture;');
  const fullChart = c.renderWealth();
  assert.equal(c.poe1WealthAxis(580,'divine').max,605);
  assert.equal(c.poe1WealthAxis(.5,'chaos').max,.75*c.poe1WealthChaosRate());
  assert.match(fullChart,/>600d<\/text>/);
  assert.doesNotMatch(fullChart,/>1000d<\/text>|Fit typical values|Show full scale/);
  const fullHover = JSON.parse(decodeURIComponent(fullChart.match(/data-wealth-pts="([^"]+)"/)[1]));
  assert.equal(fullHover.find(point=>point.total===580).y,23.6,'the peak has 25 divines of chart space above it');
  const dates = [...fullChart.matchAll(/y="224" text-anchor="middle">([^<]+)<\/text>/g)].map(match=>match[1]);
  assert.ok(dates.length >= 2);
  assert.equal(new Set(dates).size,dates.length,'daily labels are unique');
  c.periodFixture = [{at:now-60*day,total:4},{at:now-6*day,total:7},{at:now-2*day,total:17},{at:now-6*hour,total:27}]
    .map(point=>({...point,league:'Covens'}));
  const older = { ...c.periodFixture[0], at: Math.floor((now - 60 * day) / day) * day };
  assert.deepEqual(Array.from(c.compactPoe1WealthSeries([
    older, {...older,at:older.at+hour,total:5}, {...older,at:now-181*day,total:1},
  ],now),point=>point.total), [5], 'compact older league history to the latest daily point');
  run('state.poe1WealthSeries=periodFixture;');
  const periodChart = () => c.renderWealth();
  assert.match(periodChart(),/<option value="1" >1 day<\/option><option value="3" >3 days<\/option><option value="7" selected>7 days<\/option>/);
  assert.doesNotMatch(periodChart(),/30 days/);
  for (const [period, expected] of [['1',[27]],['3',[17,27]],['7',[7,17,27]],['league',[4,7,17,27]]]) {
    c.onChange({target:{dataset:{wealthOption:'days'},value:period,matches:()=>false}});
    const samples = JSON.parse(decodeURIComponent(periodChart().match(/data-wealth-pts="([^"]+)"/)[1]));
    assert.deepEqual(samples.map(sample=>sample.total),expected);
    assert.equal(/data-wealth-replay disabled/.test(periodChart()),expected.length < 2);
  }
  const poe2SavedSeries = run('state.wealthSeries');
  c.poe2SavedSeries = poe2SavedSeries;
  run(`state.activeGame="poe2"; ui.wealth=null;
    state.wealthSeries=[
      ...periodFixture.map(point=>({...point,league:wealthLeague()})),
      {...periodFixture[0],league:"other league",total:400},
      {...periodFixture[1],league:wealthLeague(),poe1Scope:"poe1-history",total:700}
    ];`);
  assert.match(periodChart(),/<option value="league" selected>League<\/option>/);
  for (const [period, expected] of [['1',[27]],['3',[17,27]],['7',[7,17,27]],['league',[4,7,17,27]]]) {
    c.onChange({target:{dataset:{wealthOption:'days'},value:period,matches:()=>false}});
    const chart = periodChart();
    const samples = JSON.parse(decodeURIComponent(chart.match(/data-wealth-pts="([^"]+)"/)[1]));
    assert.deepEqual(samples.map(sample=>sample.total),expected,'PoE 2 uses only the current PoE 2 league');
    assert.equal(/data-wealth-replay disabled/.test(chart),expected.length < 2);
    assert.match(chart,/>Read tabs<\/button>/,'PoE 2 keeps its stash workflow');
    assert.doesNotMatch(chart,/data-poe1-login|data-wealth-spike-toggle/);
  }
  run('state.activeGame="poe1"; state.wealthSeries=poe2SavedSeries;');
  c.beforeHistoryReview = beforeHistoryReview;
  c.beforeReviewDraft = beforeReviewDraft;
  c.beforeReviewView = beforeReviewView;
  run('state.poe1WealthSeries=beforeHistoryReview; ui.wealth=beforeReviewDraft; ui.view=beforeReviewView;');
  c.repaintWealth = beforeReviewPaint;
  c.publishWealthLive = beforeReviewPublish;
  c.localStorage.setItem = beforeReviewStorage;

  const hoverStart = appSource.indexOf('const poe1WealthHoverPoints');
  vm.runInContext(appSource.slice(hoverStart, appSource.indexOf('document.addEventListener("pointermove"',hoverStart)),c);
  const frames = [];
  c.requestAnimationFrame = callback => frames.push(callback);
  const hover = {style:{},querySelector:()=>({})};
  const cursor = {querySelector:()=>({style:{}})};
  const wrap = {getBoundingClientRect:()=>({left:0,top:0,width:205,height:150}),
    querySelector:selector=>selector === '.wealth-hover' ? hover : cursor};
  Object.assign(hover,{offsetWidth:140,offsetHeight:44});
  let reads = 0;
  const encoded = encodeURIComponent(JSON.stringify([{x:8,y:112,at:Date.now()-1000,total:2},{x:202,y:112,at:Date.now(),total:3}]));
  const plot = {isConnected:true, closest:selector=>selector === '.wealth-plot' ? plot : wrap,
    dataset:{get wealthPts(){reads++;return encoded;},wealthUnit:'divine'},
    ownerSVGElement:{createSVGPoint:()=>({}),getScreenCTM:()=>null}};
  for (let x=100;x<=200;x++) c.queuePoe1WealthHover(plot,{target:plot,clientX:x,clientY:112});
  assert.equal(frames.length,1);
  frames.shift()();
  assert.equal(hover.style.left,'57px');
  assert.equal(hover.style.top,'56px');
  c.queuePoe1WealthHover(plot,{target:plot,clientX:8,clientY:112});
  frames.shift()();
  assert.equal(hover.style.left,'8px');
  assert.equal(reads,1);
  c.queuePoe1WealthHover(plot,{target:plot,clientX:200,clientY:112});
  c.hideWealthPlotHover(plot);
  frames.shift()();
  assert.equal(hover.hidden,true,'a queued hover cannot reopen after pointer-out');
  const clip = {setAttribute(_, value) { this.width = Number(value); }};
  const lines = {setAttribute(_, value) { this.clip = value; },removeAttribute() { this.clip = ''; }};
  const replayTime = {};
  const replayAmount = {};
  const label = {hidden:true,querySelector:selector=>selector === '[data-wealth-replay-value]' ? replayAmount : replayTime};
  const panel = {classList:new Set(),querySelector:selector=>({
    '.wealth-plot':plot,'#wealth-replay-clip rect':clip,'.wealth-history-lines':lines,'.wealth-replay-label':label,
  })[selector]};
  panel.classList.remove = panel.classList.delete;
  const replayButton = {textContent:'Replay',isConnected:true,closest:()=>panel};
  c.cancelAnimationFrame = () => { frames.length = 0; };
  const clickReplay = () => c.onClick({target:{closest:selector=>selector === '[data-wealth-replay]' ? replayButton : null}});
  clickReplay();
  const replayStart = performance.now();
  assert.equal(label.hidden,false);
  assert.equal(replayButton.textContent,'Stop replay');
  assert.match(replayAmount.innerHTML, />2(?:\.0)?d<\/span>/);
  assert.equal(clip.width,4);
  frames.shift()(replayStart+7000);
  assert.ok(clip.width > 95 && clip.width < 110,'reveal about half the plot halfway through');
  frames.shift()(replayStart+14000);
  assert.match(replayAmount.innerHTML, />3(?:\.0)?d<\/span>/);
  assert.equal(lines.clip,'');
  assert.equal(label.hidden,true);
  run('state.activeGame="poe2";');
  clickReplay();
  assert.equal(replayButton.textContent,'Stop replay','PoE 2 can start the same replay');
  clickReplay();
  assert.equal(replayButton.textContent,'Replay');
  assert.equal(frames.length,0,'stopping cancels the scheduled frame');
  clickReplay();
  run('state.activeGame="poe1";');
  frames.shift()(performance.now()+1000);
  assert.equal(label.hidden,true,'changing games stops old playback');
  run('state').poe1League = beforeReviewLeague;
}
for (const base of ['Ruby Ring','Coral Ring','Two-Stone Ring']) {
  const item = c.parsePoeItem(`Item Class: Rings\nRarity: Rare\nFated ${base}\n--------\nItem Level: 40\n--------\nUnidentified`);
  assert.equal(item.baseType,base);
}
const cluster = c.parsePoeItem('Item Class: Jewels\nRarity: Magic\nAzure Large Cluster Jewel\n--------\n{ Prefix Modifier "Test" (Tier: 1) }\nAdded Small Passive Skills also grant: +8 to Maximum Mana');
assert.ok(cluster.mods.some(r=>r.text.includes('Maximum Mana')));
const clusterAttack = c.parsePoeItem('Item Class: Jewels\nRarity: Magic\nGlimmering Large Cluster Jewel of the Lynx\n--------\nAdds 12 Passive Skills (enchant)\n2 Added Passive Skills are Jewel Sockets (enchant)\nAdded Small Passive Skills grant: 10% increased Attack Damage (enchant)\n--------\nAdded Small Passive Skills also grant: +5 to Dexterity');
const attackGrant = clusterAttack.mods.find(mod=>/^Added Small Passive Skills grant:/i.test(mod.text));
assert.ok(attackGrant);
const clusterAttackId = 'enchant.stat_3948993189|9';
const clusterStats = c.buildTradeStatIndex({result:[{id:'enchant',entries:[{id:clusterAttackId,text:'Added Small Passive Skills grant: 10% increased Attack Damage'}]}]});
const attackFilters = c.mapRollsToTradeFilters([{...attackGrant,wantMin:99}], clusterStats, true);
assert.deepEqual(Array.from(attackFilters,row=>({...row})), [{id:clusterAttackId}], 'cluster enchant sends its exact stat without a numeric roll');
const combinedEnchants = [
  {id:'enchant.stat_3948993189|4',text:'Added Small Passive Skills grant: 12% increased Damage with Bows\nAdded Small Passive Skills grant: 12% increased Damage Over Time with Bow Skills'},
  {id:'enchant.stat_3948993189|2',text:'Added Small Passive Skills grant: Staff Attacks deal 12% increased Damage with Hits and Ailments\nAdded Small Passive Skills grant: Mace or Sceptre Attacks deal 12% increased Damage with Hits and Ailments'},
];
const combinedIndex = c.buildTradeStatIndex({result:[{id:'enchant',entries:combinedEnchants}]});
const paintCluster = c.paintPriceOverlay;
const clusterBar = c.overlayBarHtml;
c.paintPriceOverlay = () => {};
c.overlayBarHtml = () => '';
for (const enchant of combinedEnchants) {
  const copiedLines = enchant.text.split('\n').map(line=>line+' (enchant)').join('\n');
  const item = c.parsePoeItem('Item Class: Jewels\nRarity: Normal\nLarge Cluster Jewel\n--------\nAdds 8 Passive Skills (enchant)\n2 Added Passive Skills are Jewel Sockets (enchant)\n'+copiedLines);
  const drop = {...item,id:'cluster-combined',rolls:item.mods};
  const html = c.priceOverlayHtml({id:''},drop);
  assert.equal((html.match(/price-overlay-q-toggle" data-pick-text="Added Small Passive Skills Grant:/gi)||[]).length,1);
  assert.doesNotMatch(html,/Added Passive Skills are Jewel Sockets/i);
  const visible = c.inspectRolls(drop);
  const grants = visible.filter(c.isClusterGrantEnchant);
  assert.equal(grants.length,2);
  assert.ok(grants[0].affix > 0 && grants[0].affix === grants[1].affix);
  const selected = grants[1];
  c.toggleInspectRoll(null,drop,selected.text,selected.kind,selected.rid,'false');
  const picked = c.pickedRolls(drop);
  assert.equal(picked.length,2);
  assert.deepEqual(Array.from(c.mapRollsToTradeFilters([...picked].reverse(),combinedIndex,true),r=>({...r})),[{id:enchant.id}]);
  assert.equal(c.mapRollsToTradeFilters([picked[0]],combinedIndex,true).length,0,'a partial pair cannot match a different enchant');
  c.toggleInspectRoll(null,drop,selected.text,selected.kind,selected.rid,'true');
  assert.equal(c.pickedRolls(drop).length,0);
}
c.paintPriceOverlay = paintCluster;
c.overlayBarHtml = clusterBar;
const socketRoll = (text) => ({text,kind:'enchant',pick:true});
for (const [baseType,text,expected] of [
  ['Large Cluster Jewel','2 Added Passive Skills are Jewel Sockets',0],
  ['Medium Cluster Jewel','1 Added Passive Skill is a Jewel Socket',0],
  ['Small Cluster Jewel','0 Added Passive Skills are Jewel Sockets',0],
  ['Large Cluster Jewel','3 Added Passive Skills are Jewel Sockets',1],
  ['Large Cluster Jewel','1 Added Passive Skill is a Jewel Socket',1],
]) {
  const drop = {name:expected===1 ? 'Voices' : baseType,baseType,rolls:[socketRoll(text)]};
  assert.equal(c.inspectRolls(drop).length,expected);
  assert.equal(c.pickedRolls(drop).length,expected);
}
run('state.activeGame="poe2";');
assert.equal(c.inspectRolls({baseType:'Large Cluster Jewel',rolls:[socketRoll('2 Added Passive Skills are Jewel Sockets')]}).length,1);
run('state.activeGame="poe1";');
const jewel = c.parsePoeItem('Item Class: Jewels\nRarity: Rare\nTest Eye\nCobalt Jewel\n--------\n{ Implicit Modifier — Corrupted }\n5% increased Damage\n--------\nCorrupted');
assert.ok(jewel.mods.some(r=>r.kind==='corrupt'));
const cobaltCopy = 'Item Class: Jewels\nRarity: Magic\nIncinerating Cobalt Jewel\n--------\nItem Level: 84\n--------\nCorrupted Blood cannot be inflicted on you\n--------\n14% increased Critical Strike Chance with Fire Skills\n--------\nPlace into an allocated Jewel Socket on the Passive Skill Tree. Right click to remove from the Socket.\n--------\nCorrupted';
for (const copy of [cobaltCopy, cobaltCopy.replace('inflicted on you', 'inflicted on you (implicit)')]) {
  const cobalt = c.parsePoeItem(copy);
  const rolls = c.normalizeRolls(cobalt.mods, cobalt);
  assert.deepEqual(Array.from(rolls,r=>[r.text,r.kind]), [
    ['Corrupted Blood cannot be inflicted on you','corrupt'],
    ['14% increased Critical Strike Chance with Fire Skills','explicit'],
  ]);
  const stat = {id:'implicit.stat_1658498488',text:rolls[0].text};
  const index = c.buildTradeStatIndex({result:[{id:'implicit',entries:[stat]}]});
  assert.deepEqual(Array.from(c.mapRollsToTradeFilters([rolls[0]],index,true,{className:cobalt.className}),r=>({...r})), [{id:stat.id}]);
  const explicitOnly = c.buildTradeStatIndex({result:[{id:'explicit',entries:[{...stat,id:'explicit.stat_123'}]}]});
  assert.equal(c.mapRollsToTradeFilters([rolls[0]],explicitOnly,true,{className:cobalt.className}).length,0);
}
const cobaltWithoutImplicit = c.parsePoeItem(cobaltCopy.replace('Corrupted Blood cannot be inflicted on you\n--------\n',''));
assert.deepEqual(Array.from(cobaltWithoutImplicit.mods,r=>r.kind), ['explicit']);
const normalWithImplicit = c.parsePoeItem('Item Class: Jewels\nRarity: Normal\nCobalt Jewel\n--------\nCorrupted Blood cannot be inflicted on you\n--------\nCorrupted');
assert.deepEqual(Array.from(normalWithImplicit.mods,r=>r.kind), ['corrupt']);
const doubleCorrupted = c.parsePoeItem(cobaltCopy.replace('inflicted on you\n--------\n','inflicted on you\n5% increased Damage\n--------\n'));
assert.deepEqual(Array.from(doubleCorrupted.mods,r=>r.kind), ['corrupt','corrupt','explicit']);
run('ui.econMode="trending"; ui.econTypes=["Currency","Fragment"]; pickEconCat("SkillGem");');
assert.equal(run('ui.econTypes.join(",")'),'SkillGem');
for (const className of ['Stackable Currency','Divination Cards','Map Fragments','Wombgifts','Corpses','Tattoos','Incubators']) {
  assert.equal(c.poe1GeneralPriceItem({className}),true,className);
}
assert.equal(c.poe1GeneralPriceItem({name:'Test Thread'}),true);
assert.equal(c.poe1GeneralPriceItem({className:'Viscera',rarity:'Currency'}),false);
assert.equal(c.poe1GeneralPriceItem({name:'Inscribed Ultimatum',className:'Inscribed Ultimatums',rarity:'Currency'}),false);
const ultimatum = c.parsePoeItem('Item Class: Misc Map Items\nRarity: Currency\nInscribed Ultimatum\n--------\nChallenge: Survive\nArea Level: 83\nRequires Sacrifice: Fracturing Orb x1\nReward: Doubles sacrificed Currency');
assert.equal(c.isClipboardCurrency(ultimatum), false);
run('state.poe1League="Covens";');
const ultimatumSlot = {name:'Inscribed Ultimatum', frameType:5, ultimatum:ultimatum.props.ultimatum};
c.ultimatumFeed = [{challenge:'Survive', sacrifice:'Fracturing Orb', sacrifice_amount:'x1', reward:'Doubles sacrificed Currency', reward_amount:'x2', mean:844, active_listing_count:46},
  {challenge:'Survive', sacrifice:'Fracturing Orb', sacrifice_amount:'x4', reward:'Doubles sacrificed Currency', reward_amount:'x2', mean:2500, active_listing_count:2}];
run('mergePoe1Watch([null,null,ultimatumFeed]);');
assert.equal(c.wealthUnit(ultimatumSlot.name, ultimatumSlot), 4.22);
assert.equal(c.wealthUnit(ultimatumSlot.name), null, 'there is no generic Ultimatum price');
assert.equal(c.wealthUnit(ultimatumSlot.name, {...ultimatumSlot, ultimatum:{...ultimatumSlot.ultimatum,sacrificeAmount:'4'}}), null, 'low confidence variant stays unpriced');
assert.equal(c.wealthUnit(ultimatumSlot.name, {...ultimatumSlot, ultimatum:{...ultimatumSlot.ultimatum,challenge:'Protect the Altar'}}), null, 'challenge must match');
assert.equal(c.econRows('InscribedUltimatum'), c.econRows('InscribedUltimatum'), 'PoE 1 reuses prepared category rows');
assert.equal(c.econRows('InscribedUltimatum').length, 1);
run('ui.econShowLowConfidence=true;');
assert.equal(c.econRows('InscribedUltimatum').length, 2);
run('ui.econShowLowConfidence=false;');
c.ultimatumFeed.push({...c.ultimatumFeed[0], challenge:'Defeat waves of enemies'});
run('mergePoe1Watch([null,null,ultimatumFeed]);');
assert.equal(c.econRows('InscribedUltimatum').length, 2, 'market refresh invalidates prepared rows');
run('delete poe1Prices.tables.InscribedUltimatum;');
{
  c.gemFeed = {lines:[
    {id:111947,name:'Scorching Ray of Immolation',gemLevel:21,gemQuality:23,corrupted:true,listingCount:7,chaosValue:3164,divineValue:14},
    {id:110174,name:'Scorching Ray of Immolation',gemLevel:20,gemQuality:20,listingCount:47,chaosValue:205,divineValue:0.91},
    {id:109971,name:'Scorching Ray of Immolation',gemLevel:1,listingCount:98,chaosValue:100,divineValue:0.44},
    {id:99,name:'Sunder',gemLevel:21,gemQuality:23,corrupted:true,listingCount:1,chaosValue:300000},
  ]};
  c.tattooFeed = {core:{primary:'chaos'},items:[{id:'journey-tattoo',name:'Journey Tattoo of the Mind'}],
    lines:[{id:'journey-tattoo',primaryValue:1304,sparkline:{totalChange:0,data:[null,null,null,null,null,null,0]}}]};
  c.marketFallback = [
    {items:[{id:1,category:'gem',name:'Scorching Ray of Immolation',mean:99,gemLevel:1,gemQuality:0,gemIsCorrupted:false}]},
    {items:[{id:2,category:'currency',name:'Journey Tattoo of the Mind',price:{chaos:1453,source:'divine'},
      divine:{history7D:[{date:'2026-11-16',meanPrice:3.6},{date:'2026-11-18',meanPrice:6.7}]}}]},
    [{challenge:'Survive',sacrifice:'Damnation',sacrifice_amount:'x8',reward:'Doubles sacrificed Divination Cards',reward_amount:'x2',
      mean:222417,low_confidence:false,active_listing_count:1}],
  ];
  run('takePoe1Lines(gemFeed,"SkillGem",true); takePoe1Lines(tattooFeed,"Tattoo",false); mergePoe1Watch(marketFallback);');
  assert.deepEqual(Array.from(c.econRows('SkillGem'),row=>row.amount),[3164,205,100]);
  assert.equal(c.econRows('InscribedUltimatum').length,0);
  const tattoo = c.econRows('Tattoo')[0];
  assert.equal(tattoo.amount,1304,'fallback history cannot replace the primary price');
  assert.match(c.sparkSvg(tattoo.spark.data,tattoo.spark.change), /<path d="M[^"]+L/);
  assert.equal(c.econRows('Currency').length,0,'fallback cannot add a second copy under Currency');
  run('ui.econShowLowConfidence=true;');
  assert.equal(c.econRows('SkillGem').find(row=>row.name==='Sunder').lowConfidence,true);
  assert.equal(c.econRows('InscribedUltimatum')[0].lowConfidence,true);
  run('ui.econShowLowConfidence=false;');
}
// A caller without an explicit click cannot send a trade request.
run('window.chrome={webview:{postMessage(){throw Error("Unexpected trade request")}}};');
(async () => {
  c.ensureTradeStats = async () => new Map();
  const queryFor = async (item) => JSON.parse(new URL(await c.tradeSiteUrl(item)).searchParams.get('q')).query;
  const flask = c.parsePoeItem('Item Class: Utility Flasks\nRarity: Magic\nGranite Flask\n--------\nItem Level: 84');
  assert.match(c.overlayPropsHtml({id:''},flask), /Item level[\s\S]*?value="84"/);
  assert.equal((await queryFor(flask)).filters.misc_filters?.filters.ilvl,undefined);
  flask.pickIlvl = true;
  assert.equal((await queryFor(flask)).filters.misc_filters.filters.ilvl.min,84);
  c.setDropIlvlMin(null,flask,'85',true);
  assert.equal((await queryFor(flask)).filters.misc_filters.filters.ilvl.min,85);
  const eclipseStaff = c.parsePoeItem('Item Class: Staves\nRarity: Magic\nEclipse Staff\n--------\nItem Level: 85');
  const paganWand = c.parsePoeItem('Item Class: Wands\nRarity: Normal\nPagan Wand\n--------\nItem Level: 86');
  const cabalistRegalia = c.parsePoeItem('Item Class: Body Armours\nRarity: Rare\nTest Armour\nCabalist Regalia\n--------\nItem Level: 100');
  for (const [item,level] of [[eclipseStaff,85],[paganWand,86],[cabalistRegalia,100]]) {
    assert.match(c.overlayPropsHtml({id:''},item),new RegExp(`Item level[\\s\\S]*?value="${level}"`));
    assert.equal((await queryFor(item)).filters.misc_filters?.filters.ilvl,undefined);
    assert.equal((await queryFor({...item,pickIlvl:true})).filters.misc_filters.filters.ilvl.min,level);
  }
  c.setDropIlvlMin(null,eclipseStaff,'84',true);
  assert.equal((await queryFor(eclipseStaff)).filters.misc_filters.filters.ilvl.min,84);
  assert.equal(c.ilvlFilterState({rarity:'Rare',className:'Jewels',baseType:'Crimson Jewel',props:{ilvl:85}}),null);
  run('state.activeGame="poe2";');
  assert.equal(c.ilvlFilterState(flask).min,82);
  assert.equal(c.ilvlFilterState(eclipseStaff).min,81);
  assert.equal(c.ilvlFilterState(paganWand).value,81);
  assert.equal(c.ilvlFilterState(cabalistRegalia).value,82);
  run('state.activeGame="poe1";');
  const glovesBase = {id:'shagreen-base',name:'Test Gloves',baseType:'Shagreen Gloves',className:'Gloves',rarity:'Rare'};
  const previousBaseInspect = run('ui.inspect');
  const previousBasePaint = c.paintPriceOverlay;
  run('ui').inspect = {dropId:glovesBase.id,drop:glovesBase};
  c.paintPriceOverlay = () => {};
  const baseBanner = () => c.overlayBaseHtml({id:''},glovesBase,false,true);
  assert.match(c.priceOverlayHtml({id:''},glovesBase), /data-pick-base="any"[^>]*><span[^>]*>Shagreen Gloves<\/span><span class="price-overlay-swap-icon"/);
  assert.equal((await queryFor(glovesBase)).type,'Shagreen Gloves');
  c.handleOverlayClick({pickBase:'any',pickDrop:glovesBase.id});
  assert.match(baseBanner(), /data-pick-base="exact"[^>]*><span[^>]*>Any Gloves<\/span><span class="price-overlay-swap-icon"/);
  const anyGloves = await queryFor(glovesBase);
  assert.equal(anyGloves.type,undefined);
  assert.equal(anyGloves.filters.type_filters.filters.category.option,'armour.gloves');
  c.handleOverlayClick({pickBase:'exact',pickDrop:glovesBase.id});
  assert.equal((await queryFor(glovesBase)).type,'Shagreen Gloves');
  run('state.activeGame="poe2";');
  assert.match(baseBanner(), /data-pick-base="any"/);
  assert.doesNotMatch(baseBanner(), /price-overlay-swap/);
  run('state.activeGame="poe1";');
  run('ui').inspect = previousBaseInspect;
  c.paintPriceOverlay = previousBasePaint;
  const auditIndex = c.buildTradeStatIndex({result:[
    {id:'implicit',entries:[{id:'implicit.audit_mana_reservation',text:'#% increased Mana Reservation Efficiency of Skills'}]},
    {id:'imbued',entries:[{id:'imbued.pseudo_built_in_support|3918067187',text:'Supported by Level 1 Lifetap'},
      {id:'imbued.pseudo_built_in_support|4224789409',text:'Supported by Level 1 Less Duration'},
      {id:'imbued.pseudo_built_in_support|48249346',text:'Supported by Level 1 More Duration'}]},
  ]});
  c.ensureTradeStats = async () => auditIndex;
  const imbued = c.parsePoeItem('Item Class: Skill Gems\nRarity: Gem\nFireball\n--------\nLevel: 20\nQuality: +20%\n--------\nSupported by Level 1 Lifetap');
  const gemQuery = await queryFor({...imbued,rolls:imbued.mods});
  assert.deepEqual(gemQuery.stats[0].filters,[{id:'imbued.pseudo_built_in_support|3918067187',disabled:false}]);
  const lessDuration = await queryFor({...imbued,rolls:[{text:'Supported by Level 1 Less Duration',pick:true}]});
  assert.deepEqual(lessDuration.stats[0].filters,[{id:'imbued.pseudo_built_in_support|4224789409',disabled:false}]);
  const kineticClipboard = `Item Class: Skill Gems
Rarity: Gem
Kinetic Blast
--------
Attack, Projectile, AoE
Level: 20 (Max)
Cost: 9 Mana
Attack Speed: 115% of base
Attack Damage: 155% of base
Effectiveness of Added Damage: 155%
Quality: +20% (augmented)
--------
Requirements:
Level: 70
Int: 155
--------
Fires a projectile from a Wand that causes a series of area explosions in a secondary radius around its point of impact, each damaging enemies.
--------
Kinetic Blast creates 4 additional explosions
150% Arcane Might
(Arcane Might causes Increases and Reductions to Spell Damage to also apply to Attack Damage at that percentage of their value)
40% less Area Damage
Base explosion radius is 1.4 metres
Base secondary radius is 2 metres

Additional Effects From Quality:
Kinetic Blast creates 1(0-1) additional explosion
--------
Supported by Level 1 \u200BItem Rarity
--------
Place into an item socket to gain this skill. Right click to remove from a socket.
--------
Corrupted
--------
Imbued`;
  const kineticBlast = c.parsePoeItem(kineticClipboard);
  assert.deepEqual(Array.from(kineticBlast.mods,row=>row.text),['Supported by Level 1 Item Rarity']);
  const kineticDrop = {...kineticBlast,id:'kinetic-blast',rolls:kineticBlast.mods};
  assert.equal(c.overlayBaseHtml({id:''},kineticDrop,false),'');
  assert.doesNotMatch(c.priceOverlayHtml({id:''},kineticDrop), /data-pick-base|price-overlay-swap-icon/);
  const itemRarityId = 'imbued.pseudo_built_in_support|1787283513';
  const previousGem = {inspect:run('ui.inspect'),webview:c.window.chrome,paint:c.paintPriceOverlay,
    live:c.paintLivePrices,trade:c.tradeFetch,stats:c.ensureTradeStats};
  c.ensureTradeStats = async () => { throw new Error('Trade catalog unavailable'); };
  const kineticQuery = await queryFor(kineticDrop);
  assert.equal(kineticQuery.type,'Kinetic Blast');
  assert.equal((await queryFor({...kineticDrop,pickExactBase:false})).type,'Kinetic Blast');
  assert.deepEqual(kineticQuery.stats[0].filters,[{id:itemRarityId,disabled:false}]);
  assert.deepEqual(kineticQuery.filters.misc_filters.filters,
    {gem_level:{min:20},quality:{min:20},corrupted:{option:'true'}});
  assert.deepEqual((await queryFor({...kineticDrop,rolls:kineticDrop.rolls.map(roll=>({...roll,pick:false}))})).stats[0].filters,[]);
  let gemRequest;
  c.window.chrome = {webview:{}};
  c.paintPriceOverlay = () => {};
  c.paintLivePrices = () => {};
  c.tradeFetch = async (...args) => { gemRequest = args[4]; return {amount:1,currency:'chaos',listings:2}; };
  c.hideItemTip = () => {};
  c.ingestClipboardItem(kineticClipboard,'price');
  delete c.hideItemTip;
  const {drop:openedGem} = c.inspectTarget();
  c.handleOverlayClick({quoteDrop:openedGem.id,quoteLog:''});
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(Array.from(gemRequest?.filters || [],row=>({...row})),[{id:itemRarityId}]);
  assert.equal(gemRequest.ilvlMin,20);
  assert.equal(gemRequest.qualityMin,20);
  assert.equal(gemRequest.corrupted,true);
  assert.equal(gemRequest.exactBase,true);
  run('ui').inspect = previousGem.inspect;
  c.window.chrome = previousGem.webview;
  c.paintPriceOverlay = previousGem.paint;
  c.paintLivePrices = previousGem.live;
  c.tradeFetch = previousGem.trade;
  c.ensureTradeStats = previousGem.stats;
  const hiddenSpaceLifetap = await queryFor({...imbued,rolls:[{text:'Supported by Level 1 \u200BLifetap',pick:true}]});
  assert.deepEqual(hiddenSpaceLifetap.stats[0].filters,gemQuery.stats[0].filters);
  run('state.activeGame="poe2";');
  assert.equal(c.parsePoeItem(kineticClipboard).mods.length,0);
  assert.match(c.overlayBaseHtml({id:''},kineticDrop,false), /data-pick-base="any"/);
  run('state.activeGame="poe1";');
  const helmet = c.parsePoeItem(`Item Class: Helmets
Rarity: Rare
Test Helm
Haunted Bascinet
--------
{ Greater Searing Exarch Implicit Modifier }
30% increased Mana Cost Efficiency
{ Eater of Worlds Implicit Modifier (Grand) }
9% increased Mana Reservation Efficiency of Skills
--------
{ Prefix Modifier "of Vitality" }
+141 to maximum Life
Searing Exarch Item
Eater of Worlds Item`);
  assert.deepEqual(Array.from(helmet.props.eldritchSources),['exarch','eater']);
  assert.deepEqual(Array.from(helmet.mods,roll=>[roll.kind,roll.eldritch,roll.eldritchRank]),[
    ['implicit','exarch','greater'],['implicit','eater','grand'],['explicit',undefined,undefined],
  ]);
  const helmetDrop = {...helmet,rolls:helmet.mods,id:'eldritch-helmet'};
  const helmetFlags = c.overlayFlagsHtml({id:''},helmetDrop);
  assert.doesNotMatch(helmetFlags, /Searing Exarch|Eater of Worlds/);
  const helmetHtml = c.priceOverlayHtml({id:''},helmetDrop);
  assert.match(helmetHtml, /data-pick-text="30% increased Mana Cost Efficiency"[^]*?<span class="price-overlay-pill is-implicit is-exarch">Greater Searing</i);
  assert.match(helmetHtml, /data-pick-text="9% increased Mana Reservation Efficiency of Skills"[^]*?<span class="price-overlay-pill is-implicit is-eater">Grand Eater</i);
  const helmetTradeQuery = await queryFor(helmetDrop);
  assert.equal(helmetTradeQuery.stats[0].filters.length,0);
  assert.doesNotMatch(JSON.stringify(helmetTradeQuery.filters), /searing_item|tangled_item/);
  const selectedHelmet = {...helmetDrop,rolls:helmet.mods.map(roll=>({...roll,pick:roll.eldritch === 'eater'}))};
  const selectedHelmetQuery = await queryFor(selectedHelmet);
  assert.deepEqual(selectedHelmetQuery.stats[0].filters,
    [{id:'implicit.audit_mana_reservation',disabled:false,value:{min:9}}]);
  assert.doesNotMatch(JSON.stringify(selectedHelmetQuery.filters), /searing_item|tangled_item/);
  const previousHelmet = {inspect:run('ui.inspect'),webview:c.window.chrome,paint:c.paintPriceOverlay,
    live:c.paintLivePrices,trade:c.tradeFetch};
  let helmetRequest;
  c.window.chrome = {webview:{}};
  c.paintPriceOverlay = () => {};
  c.paintLivePrices = () => {};
  c.tradeFetch = async (...args) => { helmetRequest = args[4]; return {amount:1,currency:'chaos',listings:2}; };
  run('ui').inspect = {dropId:selectedHelmet.id,drop:selectedHelmet};
  await c.quoteRolledDrop(null,{...selectedHelmet,manualQuoteRequested:true});
  assert.deepEqual(Array.from(helmetRequest?.filters || [],row=>[row.id,row.min]),[['implicit.audit_mana_reservation',9]]);
  run('ui').inspect = previousHelmet.inspect;
  c.window.chrome = previousHelmet.webview;
  c.paintPriceOverlay = previousHelmet.paint;
  c.paintLivePrices = previousHelmet.live;
  c.tradeFetch = previousHelmet.trade;
  const gloves = c.parsePoeItem(`Item Class: Gloves
Rarity: Rare
Test Gloves
Slink Gloves
--------
Item Level: 85
--------
25% of Physical Damage Converted to Cold Damage (implicit)
Gain 1 Rage on Attack Hit (implicit)
--------
+40 to maximum Life
--------
Searing Exarch Item
Eater of Worlds Item`);
  assert.deepEqual(Array.from(gloves.mods,roll=>[roll.eldritch,roll.eldritchRank]),[
    ['eater',undefined],['exarch',undefined],[undefined,undefined],
  ]);
  const gloveDrop = {...gloves,rolls:gloves.mods,id:'eldritch-gloves'};
  const gloveHtml = c.priceOverlayHtml({id:''},gloveDrop);
  assert.match(gloveHtml, /data-pick-text="25% of Physical Damage Converted to Cold Damage"[^]*?<span class="price-overlay-pill is-implicit is-eater">Eater</i);
  assert.match(gloveHtml, /data-pick-text="Gain 1 Rage on Attack Hit"[^]*?<span class="price-overlay-pill is-implicit is-exarch">Searing</i);
  assert.doesNotMatch(JSON.stringify(await queryFor(gloveDrop)), /pseudo_(tangled|searing)_implicit_tier/);
  run('state.activeGame="poe2";');
  assert.doesNotMatch(c.priceOverlayHtml({id:''},gloveDrop), /price-overlay-pill is-implicit is-(exarch|eater)/);
  run('state.activeGame="poe1";');
  const previousBeastMarket = run('poe1Prices.tables.Beast');
  const previousBeastNames = run('poe1Prices.beastNames');
  const previousInspect = run('ui.inspect');
  const previousCurrencyPaint = c.paintPriceOverlay;
  const beast = {id:'craicic-croaker',name:'Craicic Croaker',beast:true,qty:1,stackMax:2};
  run('poe1Prices.tables.Beast=[{name:"Craicic Croaker",amount:1.2,unit:"divine"}]; poe1Prices.beastNames=null;');
  run('ui').inspect = {dropId:beast.id,drop:beast};
  let beastOverlay = c.priceOverlayHtml({id:''},beast);
  assert.match(beastOverlay,/You have.*currency-rate-arrow.*1\.2 divine.*Stack.*2\.4 divine/s);
  assert.match(beastOverlay,/currency-rate-arrow[^<]*<\/span><button[^>]*data-currency-unit="chaos"[^>]*>(?:<img[^>]*>)?1\.2 divine<span class="price-overlay-swap-icon" aria-hidden="true">⇄<\/span><\/button>/);
  assert.doesNotMatch(beastOverlay,/currency-summary-footer/);
  assert.doesNotMatch(beastOverlay,/240 chaos/);
  c.paintPriceOverlay = () => { beastOverlay = c.priceOverlayHtml({id:''},beast); };
  c.handleOverlayClick({currencyUnit:'chaos',pickDrop:beast.id});
  assert.match(beastOverlay,/You have.*240 chaos.*Stack.*480 chaos/s);
  assert.match(beastOverlay,/data-currency-unit="divine"[^>]*>(?:<img[^>]*>)?240 chaos<span class="price-overlay-swap-icon"/);
  assert.match(beastOverlay,/data-currency-unit="divine"[^>]*>(?:<img[^>]*>)?480 chaos<span class="price-overlay-swap-icon"/);
  assert.doesNotMatch(beastOverlay,/1\.2 divine/);
  c.handleOverlayClick({currencyUnit:'divine',pickDrop:beast.id});
  assert.match(beastOverlay,/You have.*1\.2 divine.*Stack.*2\.4 divine/s);
  assert.equal(c.currencyLotWorth(1,{amount:1,unit:'chaos'},null,'divine').text,'0.005 divine');
  run('poe1Prices.chaosPerDivine=0;');
  assert.match(c.currencyOverlayHtml(beast),/1\.2 divine/);
  assert.doesNotMatch(c.currencyOverlayHtml(beast),/data-currency-unit/);
  run('poe1Prices.chaosPerDivine=200; state.activeGame="poe2";');
  const poe2Currency = c.currencyRateCell('You have',1,c.currencyLotWorth(1,null,2),'Exalted Orb');
  assert.match(poe2Currency,/currency-rate-arrow.*2 divine/s);
  assert.doesNotMatch(c.currencyOverlayHtml(beast),/data-currency-unit/);
  c.handleOverlayClick({currencyUnit:'chaos',pickDrop:beast.id});
  assert.equal(run('ui.inspect.currencyUnit'),'divine');
  run('state.activeGame="poe1";');
  run('ui').inspect = previousInspect;
  c.paintPriceOverlay = previousCurrencyPaint;
  run('poe1Prices').beastNames = previousBeastNames;
  if (previousBeastMarket) run('poe1Prices.tables').Beast = previousBeastMarket;
  else delete run('poe1Prices.tables').Beast;
  const ultimatumQuery = await queryFor(ultimatum);
  assert.equal(ultimatumQuery.type,'Inscribed Ultimatum');
  assert.deepEqual(ultimatumQuery.filters.ultimatum_filters,{
    disabled:false,
    filters:{ultimatum_reward:{option:'DoubleCurrency'},ultimatum_input:{option:'Fracturing Orb'}},
  });
  assert.equal(ultimatumQuery.filters.type_filters?.filters.category,undefined);
  const cardUltimatum = c.parsePoeItem('Item Class: Misc Map Items\nRarity: Currency\nInscribed Ultimatum\n--------\nRequires Sacrifice: The Rite of Elements x3\nReward: Doubles sacrificed Divination Cards');
  assert.deepEqual((await queryFor(cardUltimatum)).filters.ultimatum_filters.filters,{
    ultimatum_reward:{option:'DoubleDivCards'},ultimatum_input:{option:'The Rite of Elements'},
  });
  const uniqueUltimatum = c.parsePoeItem("Item Class: Misc Map Items\nRarity: Currency\nInscribed Ultimatum\n--------\nChallenge: Survive\nRequires Sacrifice: The Aylardex\nReward: Voll's Vision");
  assert.deepEqual((await queryFor(uniqueUltimatum)).filters.ultimatum_filters.filters,{
    ultimatum_reward:{option:'ExchangeUnique'},ultimatum_input:{option:'The Aylardex'},ultimatum_output:{option:"Voll's Vision"},
  });
  const mirrorUltimatum = c.parsePoeItem('Item Class: Misc Map Items\nRarity: Currency\nInscribed Ultimatum\n--------\nRequires Sacrifice: Mirrorable, Rare Item\nReward: Item and Mirrored Copy');
  assert.deepEqual((await queryFor(mirrorUltimatum)).filters.ultimatum_filters.filters,{ultimatum_reward:{option:'MirrorRare'}});
  let catalogCalls = 0;
  const originalWebviewJson = c.webviewJson;
  c.webviewJson = async message => {
    assert.equal(message.type,'poe1-trade-items');
    catalogCalls++;
    return {result:[
      {id:'gem',entries:[
        {type:'Viper Strike',text:'Viper Strike of the Mamba',disc:'alt_x'},
        {type:'Fireball',text:'Fireball of Radiation',disc:'alt_x'},
        {type:'Vaal Fireball',text:'Vaal Fireball (Fireball of Radiation)',disc:'alt_x'},
      ]},
      {id:'map',entries:[{name:'Twisted Distant Memory',type:'Map',disc:'map'}]},
    ]};
  };
  const unidentifiedMap = c.parsePoeItem('Item Class: Maps\nRarity: Unique\nMap (Tier 16)\n--------\nItem Level: 83\n--------\nMonster Level: 83\n--------\nUnidentified');
  assert.equal(c.unidentifiedUniqueNeedsPick(unidentifiedMap), true);
  const legacyMaps = ['Infused Beachhead', 'The Beachhead', 'The Perandus Manor', 'The Tower of Ordeals', 'Untainted Paradise'];
  const mapChoices = () => Array.from(c.uniqueVariantsForBase(unidentifiedMap.baseType, unidentifiedMap.className), row => row.name);
  const fallbackChoices = mapChoices();
  assert.ok(fallbackChoices.includes('Mao Kun'));
  for (const name of legacyMaps) assert.ok(!fallbackChoices.includes(name), name + ' stays out of the offline picker');
  c.covensMapRows = [{name:'Mao Kun',baseType:'Map (Tier 16)'}, {name:'The Perandus Manor',baseType:'Valdo Map'}];
  c.standardMapRows = [...c.covensMapRows, ...legacyMaps.slice(0, 3).map(name => ({name,baseType:'Map (Tier 16)'}))];
  run('poe1Prices.tables.UniqueMap=covensMapRows;');
  assert.deepEqual(mapChoices(), ['Mao Kun'], 'the picker follows the league market list rather than the global catalog');
  run('state.poe1League="Standard"; poe1Prices.league="Standard"; poe1Prices.tables.UniqueMap=standardMapRows;');
  assert.deepEqual(mapChoices(), ['Infused Beachhead','Mao Kun','The Beachhead','The Perandus Manor']);
  run('state.poe1League="Covens";');
  assert.deepEqual(mapChoices(), fallbackChoices, 'switching leagues does not reuse the previous league’s map choices');
  run('poe1Prices.league="Covens"; delete poe1Prices.tables.UniqueMap;');
  const oldPaint = c.paintPriceOverlay;
  c.paintPriceOverlay = () => {};
  for (const name of ['Mao Kun', 'Twisted Distant Memory', ...legacyMaps]) {
    const selected = {...unidentifiedMap};
    c.applyUniquePick(null, selected, name);
    assert.equal(c.unidentifiedUniqueNeedsPick(selected), false);
    const mapQuery = await queryFor(selected);
    assert.deepEqual(mapQuery.type, {option:'Map',discriminator:'map'});
    assert.deepEqual(mapQuery.name, {option:name,discriminator:'map'});
    assert.equal(mapQuery.filters.misc_filters.filters.identified.option, 'false');
    selected.pickUnid = false;
    assert.equal((await queryFor(selected)).filters.misc_filters.filters.identified.option, 'true');
  }
  assert.equal(catalogCalls, 0, 'known PoE 1 maps need no catalog request');
  c.paintPriceOverlay = oldPaint;
  const viper = c.parsePoeItem('Item Class: Skill Gems\nRarity: Gem\nViper Strike of the Mamba\n--------\nLevel: 21 (Max)\nQuality: +20%\n--------\nCorrupted');
  const viperQuery = await queryFor(viper);
  assert.deepEqual(viperQuery.type,{option:'Viper Strike',discriminator:'alt_x'});
  assert.equal(viperQuery.filters.misc_filters.filters.gem_level.min,21);
  assert.equal(viperQuery.filters.misc_filters.filters.corrupted.option,'true');
  const vaal = c.parsePoeItem('Item Class: Skill Gems\nRarity: Gem\nFireball of Radiation\n--------\nVaal Fireball\n--------\nLevel: 20 (Max)');
  assert.deepEqual((await queryFor(vaal)).type,{option:'Vaal Fireball',discriminator:'alt_x'});
  const twisted = c.parsePoeItem('Item Class: Maps\nRarity: Unique\nTwisted Distant Memory\nMap\n--------\nMap Tier: 16');
  const mapQuery = await queryFor(twisted);
  assert.deepEqual(mapQuery.type,{option:'Map',discriminator:'map'});
  assert.deepEqual(mapQuery.name,{option:'Twisted Distant Memory',discriminator:'map'});
  assert.equal(catalogCalls,1,'PoE 1 catalog is shared across searches');
  const blueprint = c.parsePoeItem('Item Class: Blueprints\nRarity: Normal\nBlueprint: Bunker\n--------\nWings Revealed: 1/4');
  const blueprintQuery = await queryFor(blueprint);
  assert.equal(blueprintQuery.type,'Blueprint: Bunker');
  assert.deepEqual(blueprintQuery.filters.heist_filters.filters,{heist_wings:{min:1},heist_max_wings:{min:4}});
  const magicBlueprint = c.parsePoeItem('Item Class: Blueprints\nRarity: Magic\nFecund Blueprint: Bunker of Giants\n--------\nArea Level: 83\nWings Revealed: 1/4\nEscape Routes Revealed: 1/8\nReward Rooms Revealed: 3/28\nRequires Perception (Level 4)\nItem Rarity: +32% (augmented)');
  assert.equal(magicBlueprint.name,'Fecund Blueprint: Bunker of Giants');
  assert.equal(magicBlueprint.baseType,'Blueprint: Bunker');
  const magicBlueprintQuery = await queryFor(magicBlueprint);
  assert.equal(magicBlueprintQuery.type,'Blueprint: Bunker');
  assert.deepEqual(magicBlueprintQuery.filters.heist_filters.filters,blueprintQuery.filters.heist_filters.filters);
  const namedBlueprint = c.parsePoeItem("Item Class: Blueprints\nRarity: Magic\nFecund Blueprint: Smuggler's Den of Giants\n--------\nWings Revealed: 2/3");
  assert.equal((await queryFor(namedBlueprint)).type,"Blueprint: Smuggler's Den");
  const levelCluster = c.parsePoeItem('Item Class: Jewels\nRarity: Normal\nLarge Cluster Jewel\n--------\nItem Level: 84\n--------\nAdds 8 Passive Skills (enchant)');
  assert.match(c.overlayPropsHtml({id:''}, levelCluster), /Item level[\s\S]*?value="84"/);
  assert.equal((await queryFor(levelCluster)).filters.misc_filters?.filters.ilvl, undefined);
  levelCluster.pickIlvl = true;
  levelCluster.wantIlvl = 86;
  assert.equal((await queryFor(levelCluster)).filters.misc_filters.filters.ilvl.min, 86);
  assert.equal(c.ilvlFilterState({...levelCluster,rarity:'Unique',name:'Voices'}), null);
  run('state.activeGame="poe2"; state.poe1WealthMinCardChaosPerHour=1;');
  assert.equal(c.ilvlFilterState(levelCluster), null);
  assert.equal(c.belowWealthCardVolume(card), false);
  assert.equal(c.socketSearchCount({className:'Expedition Logbooks',pickRunes:3}), 3);
  run('state.activeGame="poe1"; state.poe1WealthMinCardChaosPerHour=0;');
  const logbook = c.parsePoeItem('Item Class: Expedition Logbooks\nRarity: Normal\nExpedition Logbook\n--------\nItem Level: 69\n--------\nBlack Scythe Mercenaries\nDruids of the Broken Circle\nKnights of the Sun\nOrder of the Chalice');
  assert.equal(logbook.props.factions.length,4);
  logbook.pickFaction = 'Order of the Chalice';
  assert.ok((await queryFor(logbook)).stats[0].filters.some(row => row.id === 'pseudo.pseudo_logbook_faction_order'));
  c.logbook = {...logbook,id:'test-logbook',pickRunes:6,pickLinks:6};
  run('ui.inspect={dropId:logbook.id,drop:logbook};');
  c.paintPriceOverlay = () => {};
  c.handleOverlayClick({pickDrop:c.logbook.id,pickFaction:'Druids of the Broken Circle'});
  let bookQuery = await queryFor(c.logbook);
  assert.equal(bookQuery.stats[0].type,'and');
  assert.deepEqual(bookQuery.stats[0].filters.map(row=>row.id),['pseudo.pseudo_logbook_faction_druids','pseudo.pseudo_logbook_faction_order']);
  assert.equal(bookQuery.filters.socket_filters,undefined);
  assert.doesNotMatch(c.overlayPropsHtml({id:''}, c.logbook), /data-pick-(runes|links)-toggle/);
  assert.equal((c.overlayLogbookFactionsHtml({id:''}, c.logbook).match(/aria-pressed="true"/g) || []).length,2);
  c.handleOverlayClick({pickDrop:c.logbook.id,pickFaction:'Order of the Chalice'});
  bookQuery = await queryFor(c.logbook);
  assert.deepEqual(bookQuery.stats[0].filters.map(row=>row.id),['pseudo.pseudo_logbook_faction_druids']);
  c.handleOverlayClick({pickDrop:c.logbook.id,pickFaction:'Order of the Chalice'});
  run('ui.inspect=null;');
  c.paintPriceOverlay = oldPaint;
  const influenced = {name:'Test Plate',baseType:'Glorious Plate',rarity:'Rare',className:'Body Armours',influences:['shaper','elder'],ignoredInfluences:['elder']};
  assert.deepEqual((await queryFor(influenced)).stats[0].filters.map(row=>row.id),['pseudo.pseudo_has_shaper_influence']);
  const timeless = c.parsePoeItem('Item Class: Jewels\nRarity: Unique\nLethal Pride\nTimeless Jewel\n--------\n{ Unique Modifier }\nCommanded leadership over 14671(10000-18000) warriors under Akoya\nPassives in radius are Conquered by the Karui\nHistoric\n--------\nCorrupted');
  const seedId = 'explicit.pseudo_timeless_jewel_akoya';
  const seedStats = c.buildTradeStatIndex({result:[{id:'explicit',entries:[{
    id:seedId,text:'Commanded leadership over # warriors under Akoya',type:'explicit',
  }]}]});
  const seedRoll = timeless.mods.find(roll => roll.text.includes('Akoya'));
  assert.ok(seedRoll, 'the advanced clipboard retains the seed');
  assert.equal(c.mapRollsToTradeFilters([seedRoll],seedStats,true)[0].max,14671);
  run('state.activeGame="poe2";');
  assert.equal(c.mapRollsToTradeFilters([seedRoll],seedStats,true)[0].max,undefined);
  run('state.activeGame="poe1";');
  c.ensureTradeStats = async () => seedStats;
  assert.ok(!(await queryFor(timeless)).stats[0].filters.some(row=>row.id===seedId));
  const pickedTimeless = {...timeless,rolls:[{...seedRoll,pick:true}]};
  assert.deepEqual((await queryFor(pickedTimeless)).stats[0].filters.find(row=>row.id===seedId)?.value,{min:14671,max:14671});
  const mapHeader = 'Item Class: Maps\nRarity: Rare\nMind Nexus\nMap (Tier 16)\n--------\nMonster Level: 83\n--------\nItem Level: 83\n--------\n';
  const mirageMap = c.parsePoeItem(mapHeader + [
    'Area contains a Breach (implicit)',
    '{ Prefix Modifier "Inhabited" (Tier: 1) }\nArea has increased monster variety',
    '{ Suffix Modifier "of the Mirage" (Tier: 1) }\nArea contains a Mirage',
    '{ Suffix Modifier "of Frogs" (Tier: 1) }\nArea contains 3 additional packs of Frog',
  ].join('\n--------\n'));
  const mapStats = c.buildTradeStatIndex({result:[
    {id:'explicit',entries:[
      {id:'explicit.stat_2436559047',text:'Area contains a Mirage'},
      {id:'explicit.stat_3561450806',text:'Area has increased monster variety'},
      {id:'explicit.stat_2752993899',text:'Area contains # additional packs of Frog'},
    ]},
    {id:'implicit',entries:[{id:'implicit.stat_392469782',text:'Area contains a Breach'}]},
    {id:'enchant',entries:[{id:'enchant.stat_2436559047',text:'Area contains a Mirage'}]},
  ]});
  c.ensureTradeStats = async () => mapStats;
  assert.deepEqual((await queryFor({...mirageMap,rolls:mirageMap.mods})).stats[0].filters,[]);
  const pickedMap = {...mirageMap,rolls:mirageMap.mods.map(roll=>({...roll,pick:true}))};
  const mapFilters = [
    {id:'implicit.stat_392469782',disabled:false},
    {id:'explicit.stat_3561450806',disabled:false},
    {id:'explicit.stat_2436559047',disabled:false},
    {id:'explicit.stat_2752993899',disabled:false,value:{min:3}},
  ];
  assert.deepEqual((await queryFor(pickedMap)).stats[0].filters,mapFilters);
  for (const [text,id] of [['Area contains a Mirage','explicit.stat_2436559047'],
    ['Area contains a Mirage (enchant)','enchant.stat_2436559047']]) {
    const map = c.parsePoeItem(mapHeader + text);
    const rolls = map.mods.map(roll=>({...roll,pick:true}));
    assert.deepEqual((await queryFor({...map,rolls})).stats[0].filters,[{id,disabled:false}]);
  }
  run('state.activeGame="poe2";');
  assert.equal(c.parsePoeItem(mapHeader + 'Area contains a Mirage').mods[0]?.kind,'implicit');
  run('state.activeGame="poe1";');
  c.ensureTradeStats = async () => new Map();
  c.webviewJson = originalWebviewJson;
  console.log('Passed: Ultimatum variants and market confidence, Economy cache, transfigured gems, and unique map filters.');
  await c.quoteRolledDrop(null, {name:'Chaos Orb',rarity:'Currency'});
  run('paintPriceOverlay=()=>{}; paintLivePrices=()=>{}; save=()=>{}; state.poe1League="Covens";');
  const requests = [];
  c.tradeFetch = async (...args) => { requests.push(args); return {amount:1,currency:'chaos',listings:2}; };
  run('ui.inspect={dropId:"currency-test",drop:{id:"currency-test",name:"Chaos Orb",rarity:"Currency",className:"Stackable Currency"}};');
  c.handleOverlayClick({quoteDrop:'currency-test',quoteLog:''});
  run('overlayBarHtml=()=>""; dropIconHtml=()=>""; itemIconHtml=()=>"";');
  const resultHtml = c.priceOverlayHtml(null,run('inspectTarget().drop'));
  assert.doesNotMatch(resultHtml,/data-quote-drop|poe\.watch|poe\.ninja/);
  assert.equal(requests.length,0,'general items do not have a trade request path');
  run('ensureTradeStats=async()=>({}); ui.inspect={dropId:"viscera-test",drop:{id:"viscera-test",name:"Skeletal Warrior\'s Leg",rarity:"Rare",className:"Viscera",visceraSlot:"Lower Limb"}};');
  c.handleOverlayClick({quoteDrop:'viscera-test',quoteLog:''});
  c.handleOverlayClick({quoteDrop:'viscera-test',quoteLog:''});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests.length,1,'Viscera still sends one manual trade request');
  assert.equal(requests[0][4].category,'viscera.leg');
  assert.equal(requests[0][4].exchange,undefined);
  assert.equal(run('inspectTarget().drop.quoting'),undefined);
  await c.quoteRolledDrop(null, {...viper, id:'viper-test', manualQuoteRequested:true});
  assert.equal(requests.length,2);
  assert.equal(requests[1][4].typeLine,'Viper Strike');
  assert.ok(requests[1][4].filters.some(row=>row.id==='trade.discriminator' && row.option==='alt_x'));
  await c.quoteRolledDrop(null, {...ultimatum, id:'ultimatum-test', manualQuoteRequested:true});
  assert.equal(requests.length,3);
  assert.ok(requests[2][4].filters.some(row=>row.id==='ultimatum.sacrifice_quantity' && row.min===1));
  assert.ok(requests[2][4].filters.some(row=>row.id==='ultimatum.ultimatum_input' && row.option==='Fracturing Orb'));
  assert.ok(requests[2][4].filters.some(row=>row.id==='ultimatum.ultimatum_reward' && row.option==='DoubleCurrency'));
  assert.ok(!requests[2][4].filters.some(row=>row.id==='ultimatum.ultimatum_challenge'));
  await c.quoteRolledDrop(null, {...magicBlueprint, id:'magic-blueprint-test', manualQuoteRequested:true});
  assert.equal(requests.length,4);
  assert.equal(requests[3][4].typeLine,'Blueprint: Bunker');
  assert.equal(requests[3][4].category,'heistmission.blueprint');
  assert.ok(requests[3][4].filters.some(row=>row.id==='heist.heist_wings' && row.min===1));
  assert.ok(requests[3][4].filters.some(row=>row.id==='heist.heist_max_wings' && row.min===4));
  await c.quoteRolledDrop(null, {...levelCluster,id:'cluster-level-test',manualQuoteRequested:true});
  assert.equal(requests.at(-1)[4].ilvlMin, 86);
  await c.quoteRolledDrop(null, {...c.logbook,manualQuoteRequested:true});
  const logbookRequest = requests.at(-1)[4];
  assert.deepEqual(Array.from(logbookRequest.filters, row=>row.id),['pseudo.pseudo_logbook_faction_druids','pseudo.pseudo_logbook_faction_order']);
  assert.equal(logbookRequest.runeSockets,undefined);
  assert.equal(logbookRequest.links,undefined);
  c.ensureTradeStats = async () => seedStats;
  await c.quoteRolledDrop(null, {...pickedTimeless,id:'timeless-seed-test',manualQuoteRequested:true});
  const seedRequest = requests.at(-1)[4].filters.find(row=>row.id===seedId);
  assert.deepEqual({...seedRequest},{id:seedId,min:14671,max:14671});
  c.ensureTradeStats = async () => mapStats;
  await c.quoteRolledDrop(null, {...pickedMap,id:'mirage-map-test',manualQuoteRequested:true});
  const mapRequest = requests.at(-1)[4];
  assert.equal(mapRequest.game,'poe1');
  assert.deepEqual(Array.from(mapRequest.filters.filter(row=>/^(explicit|implicit)\./.test(row.id)),row=>({...row})),[
    {id:'implicit.stat_392469782'},
    {id:'explicit.stat_3561450806'},
    {id:'explicit.stat_2436559047'},
    {id:'explicit.stat_2752993899',min:3},
  ]);
  c.exaltedFeed = {
    core: {primary:'chaos',rates:{divine:0.004408}},
    items: [{id:'exalted',name:'Exalted Orb',detailsId:'exalted-orb'}],
    lines: [{id:'exalted',primaryValue:0.9024}],
  };
  run('takePoe1Lines(exaltedFeed, "Currency", false);');
  const exalted = {id:'exalted-test',name:'Exalted Orb',rarity:'Currency',qty:10,stackMax:20};
  const rateHtml = c.currencyOverlayHtml(exalted);
  assert.match(rateHtml, /You have.*9\.02 chaos/);
  assert.match(rateHtml, /Stack.*18 chaos/);
  const largeStack = c.currencyOverlayHtml({...exalted,qty:300,stackMax:0});
  assert.match(largeStack, /You have.*1\.19 divine/);
  run('poe1Prices.tables.DivinationCard.push({name:"The Apothecary",amount:10025,unit:"chaos"});');
  const apothecary = c.currencyOverlayHtml({name:'The Apothecary',rarity:'Divination Card'});
  assert.match(apothecary, /You have.*44\.2 divine/);
  assert.match(c.poe1ExchangeValueHtml(0.5,'divine'), /113c/);
  assert.match(c.poe1ExchangeValueHtml(run('poe1Prices.chaosPerDivine'),'chaos'), /1\.0d/);
  run('state.poe1League="Standard";');
  assert.doesNotMatch(c.currencyOverlayHtml(exalted), /9\.02 chaos/);
  run('state.poe1League="Covens"; ui.econChart=poe1Prices.tables.Currency[0];');
  const chart = { innerHTML: '' };
  c.document.getElementById = id => id === 'econ-chart-body' ? chart : null;
  const historyRequests = [];
  c.ninjaFetch = async path => {
    historyRequests.push(path);
    return {pairs:[{id:'chaos',history:[]},{id:'divine',history:[
      {timestamp:'2026-11-18T00:00:00Z',rate:0.004275},
      {timestamp:'2026-11-17T00:00:00Z',rate:null},
      {timestamp:'2026-11-16T00:00:00Z',rate:0.004408},
    ]}]};
  };
  assert.match(c.econTrendHtml({data:[null,0],change:0}), />—</);
  assert.match(c.econTrendHtml({data:[0,0],change:0}), />0%</);
  await Promise.all([c.fillEconChart(),c.fillEconChart()]);
  assert.deepEqual(historyRequests,['/poe1/api/economy/exchange/current/details?league=Covens&type=Currency&id=exalted-orb']);
  assert.match(chart.innerHTML,/Divine Orb exchange history[\s\S]*<path d="M[^"]+L/);
  assert.doesNotMatch(chart.innerHTML,/Chaos Orb exchange history/);
  run('state.activeGame="poe2";');
  await c.fillEconChart();
  assert.equal(historyRequests.length,1,'PoE 2 exchange history keeps its existing behavior');
  run('state.activeGame="poe1"; ui.econChart=null;');
  run('window.chrome=undefined; state.poe1League="Covens"; state.poe1IgnoredWealth=[];');
  let calls = 0;
  c.fetch = async () => { calls++; return {ok:true,json:async()=>({items:[]})}; };
  await Promise.all([c.loadPoe1Watch('Covens'),c.loadPoe1Watch('Covens')]);
  await c.loadPoe1Watch('Covens');
  assert.equal(calls,3,'only one request per feed within cache period');
  c.fetch = async () => { throw Error('offline'); };
  const failed = await c.loadPoe1Watch('Offline');
  assert.equal(failed.partial,true);
  assert.equal(failed.data.filter(Boolean).length,0);
  console.log('Passed: provider precedence, exchange priority, confidence, gem variants, exclusions, league/game isolation, manual-only trade, batch cache and offline handling.');
  console.log('Passed: six unidentified unique bases, Fated rings, magic clusters, corrupted jewel implicit and single-category trending.');
  if (process.argv.includes('--preview')) {
    run('window.chrome=undefined; itemIconHtml=()=>""; publishWealthLive=()=>{}; queuePoe1Tabs=()=>{}; askPoe1Session=()=>{}; poe1Prices.fetchedAt=Date.now(); poe1Prices.status="ready";');
    run('ui.wealth={league:"Covens",slots:[{name:"The Test",count:12,stash:"1",stashName:"Cards",frameType:6},{name:"Fireball",count:2,stash:"2",stashName:"Gems",frameType:4,gemLevel:20,gemQuality:20},{name:"Unknown item",count:1,stash:"3",stashName:"Other"}],poe1Tabs:[],find:"",stashFilter:"",message:"Synthetic layout preview"};');
    const html = c.renderWealth();
    fs.writeFileSync('dist/wealth-layout-preview.html', '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="../styles.css"><body style="padding:24px;background:#101214"><main>'+html+'</main></body>');
  }
  c.requestAnimationFrame = callback => callback();
  c.render = () => c.rememberCompanionView();
  run('state.activeGame="poe1"; ui.view="wealth"; rememberCompanionView(); state.activeGame="poe2"; ui.view="econ"; rememberCompanionView();');
  run('state.activeGame="poe1"; ui.view="econ";');
  c.handleAppHotkey({action:'open-last-view'});
  assert.equal(run('ui.view'),'wealth');
  c.handleAppHotkey({action:'open-settings'});
  assert.equal(run('ui.view'),'settings');
  run('state.activeGame="poe2"; ui.view="dash";');
  c.handleAppHotkey({action:'open-last-view'});
  assert.equal(run('ui.view'),'econ');
  c.publishWealthLive = () => {};
  c.scheduleWealthRefresh = () => {};
  run('state.activeGame="poe1"; ui.view="wealth"; poe1Prices.attemptLeague="Standard";');
  c.onChange({target:{id:'wealth-poe1-league',value:'Standard'}});
  assert.equal(c.wealthDraft().league,'Standard');
  assert.equal(c.poe1PricesDue('Standard'),true);
  c.onChange({target:{id:'league-input',value:'Covens'}});
  assert.equal(c.wealthDraft().league,'Covens');
})().catch(e=>{console.error(e);process.exitCode=1});
