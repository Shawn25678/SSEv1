const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);const end=source.indexOf('\nfunction ',start+1);return source.slice(start,end<0?undefined:end);}
let markup='rank1',destroyed=0,mounted=0,writes=0;const frames=[],idle=[];
const stats={querySelector:()=>writes?{}:null,set innerHTML(v){writes++;}};
const rank=vm.createContext({document:{getElementById:()=>stats},rankBadgeHtml:()=>markup,destroyRankFx:()=>destroyed++,mountRankFx:()=>mounted++,requestAnimationFrame:f=>frames.push(f),requestIdleCallback:f=>idle.push(f)});
vm.runInContext(fn('renderStats'),rank);rank.renderStats();frames.shift()();
for(let i=0;i<100;i++)rank.renderStats();
assert.equal(writes,1);assert.equal(destroyed,1);assert.equal(frames.length,0);
markup='rank2';rank.renderStats();idle.shift()();assert.equal(mounted,0,'Old deferred mount must be ignored');frames.shift()();idle.shift()();assert.equal(mounted,1);
markup='rank3';rank.renderStats();markup='rank4';rank.renderStats();while(frames.length)frames.shift()();while(idle.length)idle.shift()();assert.equal(mounted,2,'Only latest rank mounts');
let currentStage,loaded=0,loadCallback;const img={complete:false,dataset:{},addEventListener:(type,f)=>loadCallback=f};const stage={isConnected:true,dataset:{element:'ice'},querySelector:s=>s==='canvas.rank-live'?{}:img};currentStage=stage;
const image=vm.createContext({document:{querySelector:()=>currentStage},RANK_ELEMENTAL:{},destroyRankFx(){},mountRankLiveIce:()=>loaded++});
vm.runInContext(fn('mountRankFx'),image);image.mountRankFx();stage.isConnected=false;loadCallback();assert.equal(loaded,0,'Detached image cannot restart animation');stage.isConnected=true;currentStage={};loadCallback();assert.equal(loaded,0,'Replaced stage cannot restart animation');currentStage=stage;loadCallback();assert.equal(loaded,1);
let theme='gold',clickAway=false,fail=false;const messages=[];const webview={postMessage:m=>{if(fail)throw Error('bridge');messages.push(m)}};
const overlay=vm.createContext({window:{chrome:{webview}},chrome:{webview},overlayThemeVars:()=>theme,overlayClickAway:()=>clickAway,overlayScaleValue:()=>1});vm.runInContext(fn('pushNativeOverlay'),overlay);
overlay.pushNativeOverlay('item');for(let i=0;i<100;i++)overlay.pushNativeOverlay('item');assert.equal(messages.length,1,'Identical updates cross bridge only once');
overlay.pushNativeOverlay('item','',true);assert.equal(messages.length,2,'Fresh open always reaches app');theme='blue';overlay.pushNativeOverlay('item');clickAway=true;overlay.pushNativeOverlay('item');assert.equal(messages.length,4);
overlay.pushNativeOverlay('');overlay.pushNativeOverlay('item');assert.equal(messages.at(-1).type,'overlay-show','Reopening hidden overlay works');overlay.pushNativeOverlay('','notice');overlay.pushNativeOverlay('item');assert.equal(messages.at(-1).type,'overlay-show');
fail=true;assert.throws(()=>overlay.pushNativeOverlay('changed'));fail=false;overlay.pushNativeOverlay('changed');assert.equal(messages.at(-1).html,'changed','Failed sends remain retryable');
assert.match(source,/overlay-fallback"\) \{\s*delete pushNativeOverlay.last/);
console.log('Passed: unchanged rank reuse, stale deferred/image callbacks, duplicate overlay updates, fresh/reopen/theme changes, and bridge retry.');
console.log('Synthetic repeat check: 100 unchanged renders avoid 100 rank rebuilds; 100 identical overlay updates avoid 100 native sends. Not a startup or FPS measurement.');

let saved=0,repainted=0;const size=vm.createContext({state:{},ui:{tradePreviewOpen:false},save:()=>saved++,paintPriceOverlay:()=>repainted++,syncSizeSettings(){},syncTradeSizePreview(){}});
vm.runInContext(fn('overlayScaleValue')+fn('setOverlayScale'),size);
assert.equal(size.overlayScaleValue(),1);
size.setOverlayScale(1.05);assert.equal(size.state.overlayScale,1.05);assert.equal(saved,1);assert.equal(repainted,1);
size.setOverlayScale(1.05);assert.equal(saved,1,'Repeated scale request does not save/repaint');
size.setOverlayScale(9);assert.equal(size.overlayScaleValue(),1.25);size.setOverlayScale(-9);assert.equal(size.overlayScaleValue(),0.75);
size.setOverlayScale('invalid');assert.equal(size.overlayScaleValue(),0.75);
size.state.overlayScale=NaN;assert.equal(size.overlayScaleValue(),1);
console.log('Popup size: default, 5% steps, persistence, bounds, invalid values and repeated requests passed.');

let appSaves=0,appSynced=0,settingsSynced=0;const appSize=vm.createContext({state:{},save:()=>appSaves++,syncAppScale:()=>appSynced++,syncSizeSettings:()=>settingsSynced++});
vm.runInContext(fn('appScaleValue')+fn('setAppScale'),appSize);
assert.equal(appSize.appScaleValue(),1);appSize.setAppScale(1.1);assert.equal(appSize.state.appScale,1.1);assert.equal(appSaves,1);assert.equal(appSynced,1);assert.equal(settingsSynced,1);appSize.setAppScale(1.1);assert.equal(appSaves,1);appSize.setAppScale(5);assert.equal(appSize.appScaleValue(),1.25);appSize.setAppScale(0);assert.equal(appSize.appScaleValue(),0.75);
console.log('Independent main-app sizing, bounds, saving, and immediate updates passed.');
