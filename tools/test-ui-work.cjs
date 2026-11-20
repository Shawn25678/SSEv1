const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function fn(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const declaration = source.slice(start - 6, start) === 'async ' ? start - 6 : start;
  return source.slice(declaration, source.indexOf('\n}', start) + 2);
}
let markup='rank1',destroyed=0,mounted=0,writes=0;const idle=[];
const stats={querySelector:()=>writes?{}:null,set innerHTML(v){writes++;}};
const rank=vm.createContext({document:{getElementById:()=>stats},rankBadgeHtml:()=>markup,destroyRankFx:()=>destroyed++,mountRankFx:()=>mounted++,requestIdleCallback:f=>idle.push(f)});
vm.runInContext(fn('renderStats'),rank);rank.renderStats();
for(let i=0;i<100;i++)rank.renderStats();
assert.equal(writes,1);assert.equal(destroyed,1);assert.equal(idle.length,1);
markup='rank2';rank.renderStats();idle.shift()();assert.equal(mounted,0,'Old deferred mount must be ignored');idle.shift()();assert.equal(mounted,1);
markup='rank3';rank.renderStats();markup='rank4';rank.renderStats();while(idle.length)idle.shift()();assert.equal(mounted,2,'Only latest rank mounts');
let currentStage,loaded=0,loadCallback;const img={complete:false,dataset:{},addEventListener:(type,f)=>loadCallback=f};const stage={isConnected:true,dataset:{element:'ice'},querySelector:s=>s==='canvas.rank-live'?{}:img};currentStage=stage;
const image=vm.createContext({document:{querySelector:()=>currentStage},RANK_ELEMENTAL:{},destroyRankFx(){},mountRankLiveIce:()=>loaded++});
vm.runInContext(fn('mountRankFx'),image);image.mountRankFx();img.naturalWidth=200;stage.isConnected=false;loadCallback();assert.equal(loaded,0,'Detached image cannot restart animation');stage.isConnected=true;currentStage={};loadCallback();assert.equal(loaded,0,'Replaced stage cannot restart animation');currentStage=stage;loadCallback();loadCallback();assert.equal(loaded,1);
let theme='gold',clickAway=false,fail=false;const messages=[];const webview={postMessage:m=>{if(fail)throw Error('bridge');messages.push(m)}};
const overlay=vm.createContext({window:{chrome:{webview}},chrome:{webview},overlayThemeVars:()=>theme,overlayClickAway:()=>clickAway,overlayScaleValue:()=>1});vm.runInContext(fn('pushNativeOverlay'),overlay);
overlay.pushNativeOverlay('item');for(let i=0;i<100;i++)overlay.pushNativeOverlay('item');assert.equal(messages.length,1,'Identical updates cross bridge only once');
overlay.pushNativeOverlay('item','',true);assert.equal(messages.length,2,'Fresh open always reaches app');theme='blue';overlay.pushNativeOverlay('item');clickAway=true;overlay.pushNativeOverlay('item');assert.equal(messages.length,4);
overlay.pushNativeOverlay('');overlay.pushNativeOverlay('item');assert.equal(messages.at(-1).type,'overlay-show','Reopening hidden overlay works');overlay.pushNativeOverlay('','notice');overlay.pushNativeOverlay('item');assert.equal(messages.at(-1).type,'overlay-show');
fail=true;assert.throws(()=>overlay.pushNativeOverlay('changed'));fail=false;overlay.pushNativeOverlay('changed');assert.equal(messages.at(-1).html,'changed','Failed sends remain retryable');
assert.match(source,/overlay-fallback"\) \{\s*delete pushNativeOverlay.last/);
console.log('Passed: unchanged rank reuse, stale deferred/image callbacks, duplicate overlay updates, fresh/reopen/theme changes, and bridge retry.');
console.log('Synthetic repeat check: 100 unchanged renders avoid 100 rank rebuilds; 100 identical overlay updates avoid 100 native sends. Not a startup or FPS measurement.');

let saved=0,repainted=0,synced=0;const size=vm.createContext({state:{},ui:{tradePreviewOpen:true},save:()=>saved++,paintPriceOverlay:()=>repainted++,syncSizeSettings(){},syncTradePreview:()=>synced++});
vm.runInContext(fn('overlayScaleValue')+fn('setOverlayScale'),size);
assert.equal(size.overlayScaleValue(),1);
size.setOverlayScale(1.05);assert.equal(size.state.overlayScale,1.05);assert.equal(saved,1);assert.equal(repainted,1);
assert.equal(synced,1,'Changing the size updates an open preview');
size.setOverlayScale(1.05);assert.equal(saved,1,'Repeated scale request does not save/repaint');
size.setOverlayScale(9);assert.equal(size.overlayScaleValue(),1.25);size.setOverlayScale(-9);assert.equal(size.overlayScaleValue(),0.75);
size.setOverlayScale('invalid');assert.equal(size.overlayScaleValue(),0.75);
size.state.overlayScale=NaN;assert.equal(size.overlayScaleValue(),1);
console.log('Popup size: default, 5% steps, persistence, bounds, invalid values and repeated requests passed.');

let appSaves=0,appSynced=0,settingsSynced=0;const appSize=vm.createContext({state:{},save:()=>appSaves++,syncAppScale:()=>appSynced++,syncSizeSettings:()=>settingsSynced++});
vm.runInContext(fn('appScaleValue')+fn('setAppScale'),appSize);
assert.equal(appSize.appScaleValue(),1);appSize.setAppScale(1.1);assert.equal(appSize.state.appScale,1.1);assert.equal(appSaves,1);assert.equal(appSynced,1);assert.equal(settingsSynced,1);appSize.setAppScale(1.1);assert.equal(appSaves,1);appSize.setAppScale(5);assert.equal(appSize.appScaleValue(),1.25);appSize.setAppScale(0);assert.equal(appSize.appScaleValue(),0.75);
console.log('Independent main-app sizing, bounds, saving, and immediate updates passed.');

async function testPendingRequests() {
  const searches = [];
  const waiting = [];
  let game = 'poe2';
  let league = 'Test league';
  const drop = { id: 'current', name: 'Test item', rarity: 'Rare' };
  const trade = vm.createContext({
    activeGame: () => game,
    leagueId: () => league,
    econLeagueName: () => league,
    window: { chrome: { webview: {} } },
    state: { logs: [] },
    liveLog: () => null,
    inspectTarget: () => ({ log: null, drop }),
    poe1GeneralPriceItem: () => false,
    isClipboardCurrency: () => false,
    unidentifiedUniqueNeedsPick: () => false,
    normalizeRolls: () => [],
    pickedRolls: () => [],
    poe1TradeIdentity: async () => null,
    poe1SearchCategory: () => '',
    tradeBaseType: () => drop.name,
    tradeCategory: () => '',
    searchRarityFilter: item => item.pickRarity || 'nonunique',
    canPickRarity: () => true,
    searchExactBase: item => item.pickExactBase !== false,
    canRelaxBase: () => true,
    overlayUsesExchange: () => true,
    exchangeHavePick: () => [],
    tradeWaiting: () => waiting.enabled === true,
    tradeRate: { readyAt: Date.now() + 60000 },
    setTimeout: callback => waiting.push(callback),
    tradeFetch: (name, league, force, thorough, extra) => new Promise(resolve => searches.push({ extra, resolve })),
    tradeUnit: () => 'divine',
    toDivine: amount => amount,
    poe1Prices: {},
    divineWithRates: amount => amount,
    save() {},
    paintPriceOverlay() {},
    paintLivePrices() {},
  });
  for (const name of ['quoteRolledDrop', 'applyDropRarity', 'applyDropBaseMode', 'overlayLogDrop']) {
    vm.runInContext(fn(name), trade);
  }
  const check = () => {
    drop.quoteTried = false;
    drop.manualQuoteRequested = true;
    return trade.quoteRolledDrop(null, drop);
  };

  await trade.quoteRolledDrop(null, drop);
  assert.equal(searches.length, 0, 'A search needs a manual request');
  assert.equal(trade.overlayLogDrop('', 'stale').drop, null, 'A stale control cannot act on the open item');
  assert.equal(trade.overlayLogDrop('', drop.id).drop, drop);

  waiting.enabled = true;
  const queued = check();
  trade.applyDropRarity(null, drop, 'magic');
  waiting.shift()();
  await queued;
  waiting.enabled = false;
  assert.equal(searches.length, 0, 'Changing a filter cancels a search waiting for the limiter');
  assert.equal(drop.quoting, undefined);

  const first = check();
  assert.equal(searches.length, 1);
  trade.applyDropBaseMode(null, drop, 'any');
  trade.applyDropRarity(null, drop, 'rare');
  const second = check();
  assert.equal(searches.length, 2);
  assert.equal(searches[1].extra.rarityFilter, 'rare');
  searches[0].resolve({ amount: 100 });
  await first;
  assert.equal(drop.quote, undefined, 'Old result cannot populate the new filter state');
  assert.ok(drop.quoting, 'Old result cannot clear the newer request');
  searches[1].resolve({ amount: 2 });
  await second;
  assert.equal(drop.quote.amount, 2);
  assert.equal(drop.quoting, undefined);

  game = 'poe1';
  delete drop.quote;
  const anotherLeague = check();
  await new Promise(resolve => setImmediate(resolve));
  league = 'New league';
  assert.equal(searches[2].extra.game, 'poe1');
  searches[2].resolve({ amount: 10 });
  await anotherLeague;
  assert.equal(drop.quote, undefined, 'PoE 1 cannot show a quote from the previous league');
  assert.equal(drop.quoting, undefined);

  const toasts = [];
  const updates = [];
  const updater = vm.createContext({
    window: { chrome: { webview: {} } },
    updateCache: { at: 0, newer: false, latest: '' },
    updateInstalling: false,
    updateCheckPending: null,
    paintUpdatePanel() {},
    showToast: message => toasts.push(message),
    webviewJson: () => new Promise(resolve => updates.push(resolve)),
  });
  vm.runInContext(fn('checkAppUpdate'), updater);
  const automatic = updater.checkAppUpdate(false);
  const manual = updater.checkAppUpdate(true);
  assert.equal(updates.length, 1, 'An update check already in progress is reused');
  updates[0]({ latest: '', newer: false });
  await Promise.all([automatic, manual]);
  assert.match(toasts.at(-1), /Couldn’t check/);
  const retry = updater.checkAppUpdate(true);
  updates[1]({ latest: '1.0.69', newer: false });
  await retry;
  assert.equal(toasts.at(-1), 'SSE is up to date.');

  console.log('Trade quote ownership, stale controls, league changes, and update feedback passed.');
}

testPendingRequests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
