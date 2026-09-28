const fs = require("fs");
const path = require("path");

const pob = path.join(__dirname, "..", "poe2 builder", "src", "Data");
const outPath = path.join(__dirname, "..", "affix-ladders.js");

function foldStat(text) {
  return String(text || "")
    .replace(/[\r\n]+/g, " ")
    .toLowerCase()
    .replace(/\((?:augmented|unmet|implicit|enchant|rune)\)/gi, " ")
    .replace(/\(\s*-?\d+(?:\.\d+)?\s*[-–—]\s*-?\d+(?:\.\d+)?\s*\)/g, " # ")
    .replace(/[+-]?\d+(?:\.\d+)?/g, "#")
    .replace(/#to /g, "# to ")
    .replace(/#\s*%/g, "#%")
    .replace(/%(\S)/g, "% $1")
    .replace(/\s+/g, " ")
    .replace(/^\+/, "")
    .trim();
}

function statRanges(text) {
  const hits = [];
  const re = /\((-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)\)|([+-]?\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(String(text || "")))) {
    if (m[1] != null) {
      let lo = Number(m[1]);
      let hi = Number(m[2]);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue;
      if (lo > hi) {
        const s = lo;
        lo = hi;
        hi = s;
      }
      hits.push([lo, hi]);
    } else {
      const n = Number(m[3]);
      if (Number.isFinite(n)) hits.push([n, n]);
    }
  }
  return hits;
}

function parseList(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""))
    .filter((s) => s !== "");
}

function lockKeys(keys, vals, lock) {
  const k = keys.slice();
  const w = vals.slice();
  const i = k.indexOf("default");
  if (i >= 0 && Number(w[i]) > 0 && k.length <= 2) {
    return { k: lock, w: lock.map(() => 1) };
  }
  return { k, w };
}

function parseMods(lua, source) {
  const re =
    /\["([^"]+)"\] = \{ type = "(Prefix|Suffix)", affix = "([^"]*)", ([\s\S]*?), statOrder = \{[^}]*\}, level = (\d+), group = "([^"]*)", weightKey = \{ ([^}]*) \}, weightVal = \{ ([^}]*) \}/g;
  const rows = [];
  let m;
  while ((m = re.exec(lua))) {
    const stats = [...m[4].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((x) => x[1].replace(/\\"/g, '"'));
    if (!stats.length) continue;
    const folds = [];
    const counts = [];
    const flat = [];
    for (const stat of stats) {
      const ranges = statRanges(stat);
      if (!ranges.length) continue;
      folds.push(foldStat(stat));
      counts.push(ranges.length);
      for (const r of ranges) flat.push(r[0], r[1]);
    }
    if (!folds.length) continue;
    let keys = parseList(m[7]);
    let vals = parseList(m[8]).map(Number);
    if (source === "Flask") ({ k: keys, w: vals } = lockKeys(keys, vals, ["life_flask", "mana_flask"]));
    if (source === "Charm") ({ k: keys, w: vals } = lockKeys(keys, vals, ["utility_flask"]));
    rows.push({
      source,
      group: m[6],
      folds,
      counts,
      keys,
      vals,
      flat,
      level: Number(m[5]) || 0,
    });
  }
  return rows;
}

function parseBases() {
  const dir = path.join(pob, "Bases");
  const tags = {};
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".lua")) continue;
    const lua = fs.readFileSync(path.join(dir, name), "utf8");
    const re = /itemBases\["((?:\\.|[^"\\])*)"\] = \{[\s\S]*?tags = \{ ([^}]*) \}/g;
    let m;
    while ((m = re.exec(lua))) {
      const base = m[1].replace(/\\"/g, '"');
      const list = parseList(m[2].replace(/=\s*true/g, "").replace(/=\s*false/g, ""));
      const clean = list.map((t) => t.replace(/\s*=\s*$/, "").trim()).filter((t) => t && t !== "true" && t !== "false");
      tags[base] = clean;
      tags[base.toLowerCase()] = clean;
    }
  }
  return tags;
}

function spawnWeight(keys, vals, tags) {
  const have = new Set(tags || []);
  const k = keys || [];
  const w = vals || [];
  for (let i = 0; i < k.length; i++) {
    if (have.has(k[i])) return Number(w[i]) || 0;
  }
  return 0;
}

function spanFor(ladders, fold, tags) {
  for (const group of ladders) {
    if (!group.f || group.f[0] !== fold) continue;
    const eligible = (group.r || []).filter((tier) => spawnWeight(tier.k, tier.w, tags) > 0);
    if (!eligible.length) continue;
    const pairs = Number(group.n?.[0]) || 1;
    const spans = [];
    for (let p = 0; p < pairs; p++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const tier of eligible) {
        const a = tier.a || [];
        const tLo = a[p * 2];
        const tHi = a[p * 2 + 1];
        if (!Number.isFinite(tLo) || !Number.isFinite(tHi)) continue;
        lo = Math.min(lo, tLo);
        hi = Math.max(hi, tHi);
      }
      if (Number.isFinite(lo)) spans.push(lo + "-" + hi);
    }
    if (spans.length) return { text: spans.join(" to "), tiers: eligible.length, folds: group.f.length, pairs };
  }
  return null;
}

function main() {
  const files = [
    ["ModItem.lua", "Item"],
    ["ModJewel.lua", "Jewel"],
    ["ModFlask.lua", "Flask"],
    ["ModCharm.lua", "Charm"],
  ];
  const groups = new Map();
  let n = 0;
  for (const [file, source] of files) {
    const lua = fs.readFileSync(path.join(pob, file), "utf8");
    const listed = [...lua.matchAll(/\["[^"]+"\] = \{ type = "(?:Prefix|Suffix)"/g)].length;
    const rows = parseMods(lua, source);
    n += rows.length;
    if (rows.length !== listed) console.warn(source, "parsed", rows.length, "listed", listed);
    for (const row of rows) {
      const key = source + "|" + row.group + "|" + row.folds.join("||");
      const g = groups.get(key) || { f: row.folds, n: row.counts.slice(), r: [] };
      if (g.f.length < row.folds.length) g.f = row.folds;
      g.n = row.counts.map((c, i) => Math.max(Number(c) || 0, Number(g.n[i]) || 0));
      if (g.n.length < row.counts.length) g.n = row.counts.slice();
      g.r.push({ k: row.keys, w: row.vals, a: row.flat, lv: row.level });
      groups.set(key, g);
    }
    console.log(source, rows.length);
  }
  const ladders = [...groups.values()].map((g) => {
    g.r.sort((a, b) => (b.lv || 0) - (a.lv || 0));
    g.r = g.r.map((t) => ({ k: t.k, w: t.w, a: t.a }));
    return g;
  });
  const bases = parseBases();
  const js =
    "window.AFFIX_LADDERS=" +
    JSON.stringify(ladders).replace(/</g, "\\u003c") +
    ";\nwindow.AFFIX_BASE_TAGS=" +
    JSON.stringify(bases).replace(/</g, "\\u003c") +
    ";\n";
  fs.writeFileSync(outPath, js);
  console.log("mods", n, "groups", ladders.length, "bases", Object.keys(bases).length / 2, "bytes", js.length);
  const checks = [
    ["Iron Cuirass", "#% increased armour"],
    ["Stocky Mitts", "#% increased armour"],
    ["Wooden Club", "adds # to # physical damage"],
    ["Crescent Quarterstaff", "adds # to # physical damage"],
    ["Iron Cuirass", "# to strength"],
    ["Heavy Belt", "# to strength"],
    ["Pilgrim Vestments", "#% increased armour and energy shield"],
    ["Iron Cuirass", "#% increased armour and energy shield"],
    ["Lesser Life Flask", "#% increased charges gained"],
    ["Iron Cuirass", "#% increased charges gained"],
    ["Thawing Charm", "#% increased duration"],
    ["Crescent Quarterstaff", "adds # to # lightning damage"],
    ["Wooden Club", "adds # to # lightning damage"],
  ];
  for (const [base, fold] of checks) {
    const tags = bases[base] || bases[base.toLowerCase()];
    const hit = tags ? spanFor(ladders, fold, tags) : null;
    console.log(base, fold, hit ? hit.text + " x" + hit.tiers : "MISS", (tags || []).join(","));
  }
}

main();
