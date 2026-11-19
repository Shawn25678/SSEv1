const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('app.js', 'utf8');
const fn = source.slice(source.indexOf('function applyImportedState(next) {'), source.indexOf('function samePath(a, b) {'));
const original = { logs: [{ id: 'keep-me' }] };
let stored = 'original';
let failSave = false;
const context = vm.createContext({
  state: original, STORAGE_KEY: 'test', defaultState: () => ({ logs: [], hunted: [], customBosses: [] }),
  migrateTheme: t => t || {}, applyTheme() {}, render() {},
  localStorage: { setItem(key, value) { if (failSave) throw Error('quota'); stored = value; } }
});
vm.runInContext(fn, context);
for (const invalid of [null, [], {}, { logs: {} }, { logs: [null] }, { logs: [{ drops: {} }] }, { logs: [{ drops: [null] }] }, { logs: [], hunted: {} }, { logs: [], customBosses: [null] }, { logs: [], theme: [] }]) {
  assert.throws(() => context.applyImportedState(invalid));
  assert.equal(context.state, original);
  assert.equal(stored, 'original');
}
failSave = true;
assert.throws(() => context.applyImportedState({ logs: [] }));
assert.equal(context.state, original);
failSave = false;
context.applyImportedState({ logs: [{ id: 'imported', drops: [{ name: 'Divine Orb', qty: 1 }] }], customBosses: null });
assert.equal(context.state.logs[0].id, 'imported');
assert.equal(context.state.customBosses.length, 0);
assert.equal(JSON.parse(stored).logs[0].id, 'imported');
console.log('Backup import: invalid inputs preserve data; storage failure preserves session; valid import succeeds.');
