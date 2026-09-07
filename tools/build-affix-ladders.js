const fs = require("fs");
const path = require("path");

const luaPath = path.join(__dirname, "ModItem.lua");
const outPath = path.join(__dirname, "..", "affix-ladders.js");
const lua = fs.readFileSync(luaPath, "utf8");

function foldStat(text) {
  return String(text || "")
    .replace(/[\r\n]+/g, " ")
    .toLowerCase()
    .replace(/\((?:augmented|unmet|implicit|enchant|rune)\)/gi, " ")
    .replace(/\(\s*-?\d+(?:\.\d+)?\s*[-–—]\s*-?\d+(?:\.\d+)?\s*\)/g, " # ")
    .replace(/[+-]?\d+(?:\.\d+)?/g, "#")
    .replace(/#to /g, "# to ")
    .replace(/#%/g, "#%")
    .replace(/%(\S)/g, "% $1")
    .replace(/\s+/g, " ")
    .replace(/^\+/, "")
    .trim();
}

function statRanges(text) {
  const pairs = [...String(text || "").matchAll(/(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)/g)];
  return pairs
    .map((p) => {
      let lo = Number(p[1]);
      let hi = Number(p[2]);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      if (lo > hi) {
        const s = lo;
        lo = hi;
        hi = s;
      }
      return [lo, hi];
    })
    .filter(Boolean);
}

function parseList(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""))
    .filter((s) => s !== "");
}

const re =
  /\["([^"]+)"\] = \{ type = "(Prefix|Suffix)", affix = "([^"]*)", ([\s\S]*?), statOrder = \{[^}]*\}, level = (\d+), group = "([^"]*)", weightKey = \{ ([^}]*) \}, weightVal = \{ ([^}]*) \}/g;

const groups = new Map();
let n = 0;
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
    for (const r of ranges) {
      flat.push(r[0], r[1]);
    }
  }
  if (!folds.length) continue;
  const keys = parseList(m[7]);
  const vals = parseList(m[8]).map(Number);
  const group = m[6];
  const g = groups.get(group) || { f: folds, n: counts, r: [] };
  if (g.f.length < folds.length) {
    g.f = folds;
    g.n = counts;
  }
  g.r.push({ k: keys, w: vals, a: flat });
  groups.set(group, g);
  n += 1;
}

const ladders = [...groups.values()].filter((g) => g.r.length);
const js = "window.AFFIX_LADDERS=" + JSON.stringify(ladders).replace(/</g, "\\u003c") + ";\n";
fs.writeFileSync(outPath, js);
console.log("mods", n, "groups", ladders.length, "bytes", js.length);
