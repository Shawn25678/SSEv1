const fs = require("fs");
const https = require("https");
const path = require("path");

const cacheDir = path.join(__dirname, "_poe2db_cache");
const outPath = path.join(__dirname, "..", "affix-ladders.js");
const UA = "StillSaneExile/1.0 (local overlay rebuild; github.com/Shawn25678)";

const POOLS = ["str", "dex", "int", "str_dex", "str_int", "dex_int", "str_dex_int"];
const PAGES = [
  ...["Body_Armours", "Helmets", "Gloves", "Boots"].flatMap((slot) => POOLS.map((p) => `${slot}_${p}`)),
  ...["str", "str_dex", "str_int"].map((p) => `Shields_${p}`),
  "Bucklers",
  "Foci",
  "Quivers",
  "Amulets",
  "Rings",
  "Belts",
  "Claws",
  "Daggers",
  "Wands",
  "One_Hand_Swords",
  "One_Hand_Axes",
  "One_Hand_Maces",
  "Sceptres",
  "Spears",
  "Flails",
  "Bows",
  "Staves",
  "Two_Hand_Swords",
  "Two_Hand_Axes",
  "Two_Hand_Maces",
  "Quarterstaves",
  "Crossbows",
  "Traps",
  "Talismans",
  "Ruby",
  "Emerald",
  "Sapphire",
  "Diamond",
  "Time-Lost_Ruby",
  "Time-Lost_Emerald",
  "Time-Lost_Sapphire",
  "Time-Lost_Diamond",
  "Life_Flasks",
  "Mana_Flasks",
  "Charms",
  "Relics",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": UA, Accept: "text/html" } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          fetchText(new URL(res.headers.location, url).href).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(res.statusCode + " " + url));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.setTimeout(45000, () => {
      req.destroy();
      reject(new Error("timeout " + url));
    });
    req.on("error", reject);
  });
}

function extractModsView(html) {
  const start = html.indexOf("new ModsView(");
  if (start < 0) return null;
  let i = start + "new ModsView(".length;
  while (i < html.length && html[i] !== "{") i++;
  if (html[i] !== "{") return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let quote = "";
  const from = i;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(html.slice(from, i + 1));
      }
    }
  }
  return null;
}

function stripHtml(raw) {
  return String(raw || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<span class="ndash">[^<]*<\/span>/gi, "—")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

function pageTag(slug) {
  return String(slug || "").toLowerCase();
}

async function loadPage(slug) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cache = path.join(cacheDir, slug.replace(/[^\w.-]+/g, "_") + ".html");
  if (fs.existsSync(cache) && fs.statSync(cache).size > 20000) {
    return fs.readFileSync(cache, "utf8");
  }
  const html = await fetchText("https://poe2db.tw/us/" + slug);
  fs.writeFileSync(cache, html);
  return html;
}

function modsFromPage(obj, slug) {
  const tag = pageTag(slug);
  const rows = [];
  for (const mod of obj.normal || []) {
    const type = String(mod.ModGenerationTypeID || "");
    if (type !== "1" && type !== "2") continue;
    const raw = String(mod.str || "");
    const lines = raw
      .split(/<br\s*\/?>/i)
      .map(stripHtml)
      .filter(Boolean);
    if (!lines.length) continue;
    const folds = [];
    const counts = [];
    const flat = [];
    for (const line of lines) {
      const ranges = statRanges(line);
      if (!ranges.length) continue;
      folds.push(foldStat(line));
      counts.push(ranges.length);
      for (const r of ranges) flat.push(r[0], r[1]);
    }
    if (!folds.length) continue;
    const family = String((mod.ModFamilyList && mod.ModFamilyList[0]) || mod.Name || "mod");
    rows.push({
      family,
      type,
      folds,
      counts,
      flat,
      level: Number(mod.Level) || 0,
      tag,
    });
  }
  return rows;
}

function groupKey(row) {
  return row.type + "|" + row.family + "|" + row.folds.join("||");
}

async function main() {
  const groups = new Map();
  const ok = [];
  const fail = [];
  for (const slug of PAGES) {
    try {
      const html = await loadPage(slug);
      const obj = extractModsView(html);
      if (!obj) throw new Error("no ModsView");
      const rows = modsFromPage(obj, slug);
      if (!rows.length) throw new Error("no normal mods");
      for (const row of rows) {
        const key = groupKey(row);
        const g = groups.get(key) || { f: row.folds, n: row.counts, r: [] };
        g.r.push({ k: [row.tag], w: [1], a: row.flat, lv: row.level });
        groups.set(key, g);
      }
      ok.push(slug + " " + rows.length);
      process.stdout.write("ok " + slug + " " + rows.length + "\n");
    } catch (err) {
      fail.push(slug + " " + err.message);
      process.stdout.write("fail " + slug + " " + err.message + "\n");
    }
    await sleep(220);
  }
  const ladders = [...groups.values()].map((g) => {
    g.r.sort((a, b) => (b.lv || 0) - (a.lv || 0));
    g.r = g.r.map((t) => ({ k: t.k, w: t.w, a: t.a }));
    return g;
  });
  const js = "window.AFFIX_LADDERS=" + JSON.stringify(ladders).replace(/</g, "\\u003c") + ";\n";
  fs.writeFileSync(outPath, js);
  console.log("ok", ok.length, "fail", fail.length, "groups", ladders.length, "bytes", js.length);
  if (fail.length) console.log(fail.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
