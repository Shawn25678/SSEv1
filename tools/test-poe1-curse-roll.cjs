const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync('app.js', 'utf8');
function fn(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, `Missing ${name}`);
  const end = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, end < 0 ? undefined : end);
}

const context = vm.createContext({
  game: 'poe1',
  activeGame: () => context.game,
  stripAdvancedRanges: text => String(text || ''),
  parseAffixStrings: text => String(text || ''),
  rollLineText: roll => typeof roll === 'string' ? roll : roll.text,
  canonicalRollKind: kind => kind || 'explicit',
  poe1VisceraItem: () => false,
  isTradeableRoll: () => true,
  isOriginatorMemoryLine: () => false,
  localModApplies: () => false,
  findTradeStat: (_index, text) => ({
    id: text.toLowerCase().includes('effect of curses on you') ? 'explicit.curse_effect' : 'explicit.reduced_damage',
    text: context.foldTradeMatcher(text),
  }),
  overlayLiveValue: roll => roll.wantMin,
  snapRollNum: value => value,
});

for (const name of ['foldTradeMatcher', 'invertedTradeRoll', 'firstClipboardRoll', 'pickTradeStat',
  'isClusterGrantEnchant', 'clusterGrantTradeKey', 'tradeStatVariable', 'isPoe1Map', 'isPoe1MapRuleLine', 'mapRollsToTradeFilters']) {
  vm.runInContext(fn(name), context);
}

function mapped(text) {
  return context.mapRollsToTradeFilters([{ text, kind: 'explicit' }], new Map(), true)[0];
}

const curse = mapped('25% reduced Effect of Curses on you');
assert.deepEqual(JSON.parse(JSON.stringify(curse)), { id: 'explicit.curse_effect', min: 25 });

const ordinaryReduced = mapped('25% reduced Damage');
assert.deepEqual(JSON.parse(JSON.stringify(ordinaryReduced)), { id: 'explicit.reduced_damage', max: -25 });

context.game = 'poe2';
const poe2Curse = mapped('25% reduced Effect of Curses on you');
assert.deepEqual(JSON.parse(JSON.stringify(poe2Curse)), { id: 'explicit.curse_effect', max: -25 });

console.log('PoE 1 curse-effect roll mapping and unchanged PoE 2 behavior passed.');
