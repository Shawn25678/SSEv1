const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app.js', 'utf8');
function fn(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, end < 0 ? undefined : end).replace(/\nconst loreCache = new Map\(\);\s*$/, '');
}
const context = vm.createContext({
  loreCache: new Map(), lookupKeys: name => [name], ninjaIcon: x => x || '',
  rememberIcon() {}, catalogNoteFor: () => '', itemIconHtml: () => '',
  namesMatch: (a, b) => a.toLowerCase() === b.toLowerCase(),
  esc: x => String(x).replaceAll('&', '&amp;').replaceAll('<', '&lt;'),
});
for (const name of ['cleanMod', 'hasModRange', 'modFamily', 'uniqMods', 'cleanFlavour',
  'partitionLoreMods', 'rememberLore', 'lookupLore', 'isCurrencyTipKind',
  'isCurrencyTipNoise', 'tipBaseLabel', 'withoutItemUseInstructions', 'itemTipHtml']) {
  vm.runInContext(fn(name), context);
}
context.rememberLore('Test', { rarity: 'Currency', explicits: ['(1–2)% increased Damage'], properties: ['Armour: 1'] });
const complete = { complete: true, rarity: 'Unique', baseType: 'Gloves',
  properties: ['Gloves', 'Quality: +20%', 'Armour: 60', 'Evasion: 54', 'Energy Shield: 17'],
  explicits: ['(30–50)% increased Damage', 'Fixed bonus per Socket', 'One of your skills is empowered',
    'Immobilise enemies at 50% buildup instead of 100%', '[3 Random Socket Modifiers]'] };
context.rememberLore('Test', complete);
context.rememberLore('Test', { rarity: 'Currency', explicits: ['(1–2)% increased Damage', 'Stale stat'] });
const lore = context.lookupLore('Test');
assert.equal(lore.rarity, 'Unique');
assert.equal(lore.properties.length, 5);
assert.equal(lore.explicits.length, 4);
const html = context.itemTipHtml('Test', lore, false);
for (const text of ['Energy Shield: 17', '(30–50)% increased Damage', 'Fixed bonus per Socket',
  'One of your skills is empowered', 'Immobilise enemies', '3 random Socket Modifiers']) assert.ok(html.includes(text), text);
assert.ok(!html.includes('Stale stat'));
const currency = context.itemTipHtml('Omen', { rarity: 'Currency', explicits: [
  'Effect one', 'Effect two', 'Effect three', 'While this item is active, preserve the fourth effect',
  'Applies to level 80 items', 'Requires completing a chamber',
], descr: 'Right click this item to use it. Corrupted items cannot be modified again. Shift click to unstack.' }, false);
for (const text of ['preserve the fourth effect', 'Applies to level 80 items', 'Requires completing a chamber',
  'Corrupted items cannot be modified again.']) assert.ok(currency.includes(text), text);
assert.ok(!currency.includes('Right click'));
assert.ok(!currency.includes('Shift click'));
assert.equal(context.withoutItemUseInstructions('Can only be equipped if you are wielding a Bow.'), '');
assert.equal(context.withoutItemUseInstructions('Place into a Jewel Socket on the Passive Skill Tree.'), '');
// Optional integration input is produced locally by exercising the desktop parser
// against saved public item pages; downloaded pages are never committed.
if (process.argv[2]) {
  const items = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const [name, data] of Object.entries(items)) {
    context.rememberLore(name, data);
    const result = context.itemTipHtml(name, context.lookupLore(name), false);
    for (const mod of data.explicits) {
      const random = mod.match(/\[(\d+)\s+Random\s+([^\]]+)\]/i);
      const expected = random ? `${random[1]} random ${random[2]}` : context.cleanMod(mod);
      assert.ok(result.includes(context.esc(expected)), name + ': ' + expected);
    }
    for (const prop of data.properties) {
      if (context.namesMatch(prop, data.baseType) || context.namesMatch(prop, name)) continue;
      assert.ok(result.includes(context.esc(context.cleanMod(prop))), name + ': ' + prop);
    }
  }
}
console.log('Item tooltip completeness, cache replacement, fixed socket effects and instruction filtering passed.');
