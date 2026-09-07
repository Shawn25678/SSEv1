const STORAGE_KEY = "poe2-exile-ledger-v1";
const APP_VERSION = "1.0.5";
const FEEDBACK_ISSUE_URL = "https://github.com/Shawn25678/SSEv1/issues/new";

const FILTERS = [
  ["all", "All"],
  ["pinnacle", "Pinnacle"],
  ["citadel", "Citadels"],
  ["custom", "Custom"],
];

const ui = {
  view: "title",
  filter: "all",
  search: "",
  selectedId: null,
  logBossId: null,
  editLogId: null,
  dashRollId: null,
  inspect: null,
  hotkeyCapture: "",
  econType: "Currency",
  econTypes: ["Currency"],
  econAll: false,
  econSearch: "",
  econMode: "browse",
  econChart: null,
  bossId: "",
};

let liveKill = { logId: null, bossId: null };
const dropUndo = [];

const backupInfo = { folder: "", downloads: "" };

const sessionStarted = Date.now();
let toastTimer = 0;
const ninjaWait = new Map();
const tradeRate = { readyAt: 0, waitMs: 0, hits: 0, max: 7, window: 15, limited: false };
let rateBarTimer = 0;
const prices = {
  status: "idle",
  error: "",
  league: "",
  fetchedAt: 0,
  primary: "divine",
  exaltedPerDivine: 0,
  chaosPerDivine: 0,
  byName: new Map(),
  tables: {},
  history: {},
  nextAt: 0,
  cached: false,
  looking: new Set(),
  checkedEmpty: new Set(),
  filling: false,
  gapDone: 0,
  gapTotal: 0,
};

const NINJA_EXCHANGE = [
  "Currency",
  "Fragments",
  "LineageSupportGems",
  "Ritual",
  "Expedition",
  "Abyss",
  "UncutGems",
  "Essences",
  "SoulCores",
  "Idols",
  "Runes",
  "Delirium",
  "Breach",
  "Verisium",
];
const NINJA_LABELS = {
  Currency: "Currency",
  Fragments: "Fragments",
  LineageSupportGems: "Lineage gems",
  Ritual: "Ritual",
  Expedition: "Expedition",
  Abyss: "Abyss",
  UncutGems: "Uncut gems",
  Essences: "Essences",
  SoulCores: "Soul cores",
  Idols: "Idols",
  Runes: "Runes",
  Delirium: "Delirium",
  Breach: "Breach",
  Verisium: "Verisium",
  UniqueWeapons: "Unique weapons",
  UniqueArmours: "Unique armour",
  UniqueAccessories: "Unique accessories",
  UniqueFlasks: "Unique flasks",
  UniqueCharms: "Unique charms",
  UniqueJewels: "Unique jewels",
  UniqueSanctumRelics: "Sanctum relics",
  UniqueTablets: "Tablets",
  PrecursorTablets: "Precursor tablets",
};
const NINJA_ITEMS = [
  "UniqueWeapons",
  "UniqueArmours",
  "UniqueAccessories",
  "UniqueFlasks",
  "UniqueCharms",
  "UniqueJewels",
  "UniqueSanctumRelics",
  "UniqueTablets",
  "PrecursorTablets",
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      notes: parsed.notes || {},
      customBosses: parsed.customBosses || [],
      hunted: parsed.hunted || [],
      claimed: parsed.claimed || {},
      farmBossId: parsed.farmBossId || "",
      quickLog: parsed.quickLog !== false,
      convertMain: parsed.convertMain || "divine",
      convertView: parsed.convertView || parsed.convertMain || "divine",
      hotkeyLog: parsed.hotkeyLog || "F8",
      hotkeyNext: parsed.hotkeyNext || "F9",
      hotkeyPrice: parsed.hotkeyPrice || "F7",
      theme: { ...themeDefaults(), ...(parsed.theme || {}) },
    };
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return {
    version: 1,
    league: "",
    logs: [],
    notes: {},
    customBosses: [],
    hunted: [],
    claimed: {},
    farmBossId: "",
    quickLog: true,
    convertMain: "divine",
    convertView: "divine",
    hotkeyLog: "F8",
    hotkeyNext: "F9",
    hotkeyPrice: "F7",
    theme: themeDefaults(),
  };
}

const THEME_PRESETS = {
  exile: {
    label: "Exile gold",
    gold: "#d4b24a",
    gold2: "#f0d78a",
    crimson: "#a33b32",
    bg: "#0c0a08",
    panel: "#14110d",
    ink: "#f3ead8",
    muted: "#9a8c76",
    unique: "#af6025",
    danger: "#c45a4c",
    ok: "#7d9a5a",
    citadel: "#6e8ea8",
    display: "Georgia",
  },
  crimson: {
    label: "Vaal red",
    gold: "#c45a4c",
    gold2: "#e7b1ab",
    crimson: "#8c2a24",
    bg: "#12090a",
    panel: "#1c1010",
    ink: "#f4e4e0",
    muted: "#b08a84",
    unique: "#d4784a",
    danger: "#e7b1ab",
    ok: "#c45a4c",
    citadel: "#a33b32",
    display: "Georgia",
  },
  oriath: {
    label: "Oriath",
    gold: "#c4b48a",
    gold2: "#efe6c8",
    crimson: "#8a6a48",
    bg: "#161410",
    panel: "#221e18",
    ink: "#f4eee0",
    muted: "#a89a80",
    unique: "#c4a46a",
    danger: "#b45a48",
    ok: "#8a9a6a",
    citadel: "#8a9aaa",
    display: "Palatino Linotype",
  },
  wraeclast: {
    label: "Wraeclast",
    gold: "#9a8a4a",
    gold2: "#c8c090",
    crimson: "#6a8a48",
    bg: "#0a0c08",
    panel: "#121610",
    ink: "#e4ead8",
    muted: "#8a9478",
    unique: "#8a9a4a",
    danger: "#c45a4c",
    ok: "#7d9a5a",
    citadel: "#6a8a70",
    display: "Georgia",
  },
  breach: {
    label: "Breach",
    gold: "#b48ad4",
    gold2: "#e0c8f0",
    crimson: "#6a3a8a",
    bg: "#0e0814",
    panel: "#1a1222",
    ink: "#f0e6f6",
    muted: "#9a88aa",
    unique: "#c49ae0",
    danger: "#c45a8a",
    ok: "#7a9a8a",
    citadel: "#6a5aa8",
    display: "Georgia",
  },
  kalguur: {
    label: "Kalguur",
    gold: "#7aa2c8",
    gold2: "#c5d8ea",
    crimson: "#4a6a88",
    bg: "#0a0d12",
    panel: "#12161c",
    ink: "#e6eef6",
    muted: "#8a97a8",
    unique: "#8eb4d4",
    danger: "#c45a4c",
    ok: "#7d9a5a",
    citadel: "#5b6ea8",
    display: "Cambria",
  },
  sanctum: {
    label: "Sanctum",
    gold: "#e0c06a",
    gold2: "#f4e4b0",
    crimson: "#8a2840",
    bg: "#14080c",
    panel: "#1e1016",
    ink: "#f6ead8",
    muted: "#b09088",
    unique: "#e0a05a",
    danger: "#d45a6a",
    ok: "#c4a46a",
    citadel: "#a06070",
    display: "Times New Roman",
  },
  highgate: {
    label: "Highgate",
    gold: "#c48a3a",
    gold2: "#e8c888",
    crimson: "#8a4a28",
    bg: "#120e0a",
    panel: "#1c1610",
    ink: "#f2e6cc",
    muted: "#a89878",
    unique: "#d49a4a",
    danger: "#c45a4c",
    ok: "#8a9a5a",
    citadel: "#8a6a42",
    display: "Georgia",
  },
  verdant: {
    label: "Azmeri",
    gold: "#7d9a5a",
    gold2: "#c5d4a8",
    crimson: "#6e8ea8",
    bg: "#0b100c",
    panel: "#121812",
    ink: "#e7f0dc",
    muted: "#8a9a7a",
    unique: "#c5d4a8",
    danger: "#c45a4c",
    ok: "#7d9a5a",
    citadel: "#6e8ea8",
    display: "Georgia",
  },
  abyss: {
    label: "Abyss",
    gold: "#3a9a8a",
    gold2: "#8ad4c4",
    crimson: "#1a4a48",
    bg: "#060a0a",
    panel: "#0e1616",
    ink: "#dceae8",
    muted: "#6a8a86",
    unique: "#4ab4a0",
    danger: "#c45a4c",
    ok: "#3a9a6a",
    citadel: "#2a6a68",
    display: "Georgia",
  },
};

const FONT_DISPLAY = [
  "Segoe UI",
  "Calibri",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Cambria",
  "Palatino Linotype",
  "Tahoma",
  "Verdana",
  "Trebuchet MS",
  "Consolas",
  "Courier New",
  "Lucida Console",
  "Lucida Sans Unicode",
  "Candara",
  "Constantia",
  "Corbel",
  "Sitka Text",
  "Cascadia Mono",
  "Microsoft Sans Serif",
  "Impact",
];
const FONT_SERIF = new Set(["Georgia", "Times New Roman", "Cambria", "Palatino Linotype", "Constantia", "Sitka Text"]);
const FONT_MONO = new Set(["Consolas", "Courier New", "Lucida Console", "Cascadia Mono"]);

function themeDefaults() {
  const exile = THEME_PRESETS.exile;
  return {
    preset: "exile",
    gold: exile.gold,
    gold2: exile.gold2,
    crimson: exile.crimson,
    bg: exile.bg,
    panel: exile.panel,
    ink: exile.ink,
    muted: exile.muted,
    unique: exile.unique,
    danger: exile.danger,
    ok: exile.ok,
    citadel: exile.citadel,
    display: exile.display,
    ui: "Segoe UI",
  };
}

function currentTheme() {
  return { ...themeDefaults(), ...(state.theme || {}) };
}

function pickTitleFont(name) {
  return FONT_DISPLAY.includes(name) ? name : "Georgia";
}

function fontStack(name) {
  const picked = pickTitleFont(name);
  if (FONT_MONO.has(picked)) return `"${picked}", Consolas, "Courier New", monospace`;
  if (FONT_SERIF.has(picked)) return `"${picked}", Georgia, "Times New Roman", serif`;
  return `"${picked}", "Segoe UI", system-ui, sans-serif`;
}

function applyTheme() {
  const t = currentTheme();
  const root = document.documentElement;
  root.style.setProperty("--gold", t.gold);
  root.style.setProperty("--crimson", t.crimson);
  root.style.setProperty("--crimson-2", t.danger);
  root.style.setProperty("--bg", t.bg);
  root.style.setProperty("--panel", t.panel);
  root.style.setProperty("--ink", t.ink);
  root.style.setProperty("--unique", t.unique);
  root.style.setProperty("--danger", t.danger);
  root.style.setProperty("--ok", t.ok);
  root.style.setProperty("--citadel", t.citadel);
  root.style.setProperty("--font-display", fontStack(t.display));
  root.style.setProperty("--font-ui", `"Segoe UI", system-ui, sans-serif`);
  const link = document.getElementById("theme-fonts");
  if (link) {
    link.removeAttribute("href");
    link.disabled = true;
  }
}

function setTheme(partial, preset = "custom") {
  state.theme = { ...currentTheme(), ...partial, preset };
  save();
  applyTheme();
}

let state = loadState();
applyTheme();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function allBosses() {
  return BOSSES.concat(state.customBosses);
}

function getBoss(id) {
  return allBosses().find((boss) => boss.id === id);
}

function wikiArtUrl(file) {
  const name = String(file || "").trim();
  if (!name) return "";
  if (/^https?:\/\//i.test(name)) return name;
  return "https://www.poe2wiki.net/wiki/Special:FilePath/" + encodeURIComponent(name.replace(/ /g, "_"));
}

function bossArtUrls(boss) {
  const urls = [];
  if (boss?.id) {
    for (const ext of ["png", "jpg", "jpeg", "gif", "webp"]) {
      urls.push("art/" + encodeURIComponent(boss.id) + "." + ext);
    }
  }
  for (const file of boss.art || []) urls.push(wikiArtUrl(file));
  return [...new Set(urls.filter(Boolean))];
}

function bossArtHtml(boss, className) {
  const urls = bossArtUrls(boss);
  const cls = className || "boss-art";
  if (!urls.length) return `<div class="${cls} is-fallback" aria-hidden="true"></div>`;
  return `<img class="${cls}" alt="" src="${esc(urls[0])}" data-art-rest="${esc(urls.slice(1).join("|"))}" onerror="window.__bossArtFail && window.__bossArtFail(this)">`;
}

window.__bossArtFail = function (img) {
  const rest = (img.getAttribute("data-art-rest") || "").split("|").filter(Boolean);
  if (rest.length) {
    img.setAttribute("data-art-rest", rest.slice(1).join("|"));
    img.src = rest[0];
    return;
  }
  img.onerror = null;
  img.removeAttribute("src");
  img.classList.add("is-fallback");
};

function quitApp() {
  if (window.chrome?.webview) chrome.webview.postMessage({ type: "quit" });
  else window.close();
}

function paintTitleScreen() {
  const farm = getBoss(farmBossId());
  const art = document.getElementById("title-art");
  if (art) art.innerHTML = bossArtHtml(farm, "title-art-img");
  const hasSave = !!(state.logs.length || state.farmBossId);
  const label = document.getElementById("title-continue-label");
  const note = document.getElementById("title-continue-note");
  if (label) label.textContent = hasSave ? "Continue" : "Begin hunt";
  if (note) {
    note.textContent = farm && hasSave ? `${farm.name} · ${killCount(farm.id)} kills` : "Log kills and drops from the farm pad";
  }
  const league = document.getElementById("title-league");
  if (league) league.textContent = leagueId() || "Forbidden Rites";
}

function logsFor(bossId) {
  return state.logs.filter((log) => log.bossId === bossId);
}

function killCount(bossId) {
  return logsFor(bossId).length;
}

function dropCounts(bossId) {
  const counts = {};
  for (const log of logsFor(bossId)) {
    for (const drop of log.drops || []) {
      const key = drop.uniqueId || drop.name;
      counts[key] = (counts[key] || 0) + (drop.qty || 1);
    }
  }
  return counts;
}

function dropHits(bossId) {
  const hits = {};
  for (const log of logsFor(bossId)) {
    const seen = new Set();
    for (const drop of log.drops || []) {
      const key = drop.uniqueId || drop.name;
      if (seen.has(key)) continue;
      seen.add(key);
      hits[key] = (hits[key] || 0) + 1;
    }
  }
  return hits;
}

function uniqueProgress(boss) {
  if (!boss.uniques?.length) return { have: 0, total: 0 };
  const counts = dropCounts(boss.id);
  const have = boss.uniques.filter((item) => counts[item.id] > 0).length;
  return { have, total: boss.uniques.length };
}

function extraDrops(boss) {
  const catalog = new Set((boss.uniques || []).map((item) => item.id));
  const counts = dropCounts(boss.id);
  const hits = dropHits(boss.id);
  return Object.entries(counts)
    .filter(([key]) => !catalog.has(key))
    .map(([name, qty]) => ({ name, qty, hits: hits[name] || 0 }))
    .sort((a, b) => b.qty - a.qty);
}

function lootHit(bossId) {
  const logs = logsFor(bossId);
  return logs.filter((log) => (log.drops || []).length > 0).length;
}

function formatPct(part, whole) {
  if (!whole) return "—";
  const n = (part / whole) * 100;
  if (n === 0) return "0%";
  if (n > 0 && n < 0.1) return "<0.1%";
  if (Math.abs(n - 100) < 0.05) return "100%";
  const rounded = Math.round(n * 10) / 10;
  return (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)) + "%";
}

function rateHtml(qty, hits, kills) {
  return `<span class="rate-count" title="Copies logged">${qty}</span><span class="pct" title="Kills that dropped it">${esc(formatPct(hits, kills))}</span>`;
}

function matchesFilter(boss) {
  if (ui.filter === "all") return true;
  if (ui.filter === "pinnacle") return boss.category === "pinnacle";
  if (ui.filter === "citadel") return boss.category === "citadel";
  if (ui.filter === "custom") return boss.category === "custom";
  return true;
}

function matchesSearch(boss) {
  const q = ui.search.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    boss.name,
    boss.area,
    boss.group,
    boss.access,
    ...(boss.uniques || []).map((item) => item.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function visibleBosses() {
  return allBosses().filter((boss) => matchesFilter(boss) && matchesSearch(boss));
}

const SLIDE_COUNT = 4;
const SLIDE_WINDOW = 0.92;
const SLIDE_UI_SCALE = 1.08;
const SLIDE_ART = "11em";

function slideVars(shown) {
  return `--slide-count:${shown || SLIDE_COUNT};--slide-window:${SLIDE_WINDOW};--ui-scale:${SLIDE_UI_SCALE};--slide-art:${SLIDE_ART}`;
}

function updateBossScale() {
  const root = document.documentElement;
  if (ui.view !== "bosses") {
    root.style.setProperty("--boss-scale", "1");
    return;
  }
  const w = root.clientWidth || window.innerWidth || 1280;
  const h = root.clientHeight || window.innerHeight || 800;
  const scale = Math.max(0.82, Math.min(1.28, w / 1360, h / 980));
  root.style.setProperty("--boss-scale", scale.toFixed(3));
}

window.addEventListener("resize", () => {
  clearTimeout(updateBossScale.timer);
  updateBossScale.timer = setTimeout(updateBossScale, 80);
});

function stagedBoss() {
  const list = visibleBosses();
  if (!list.length) return null;
  return list.find((boss) => boss.id === ui.bossId) || list[0];
}

function slideWindow() {
  const list = visibleBosses();
  if (!list.length) return { list, start: 0, shown: 0, slice: [] };
  const shown = Math.min(SLIDE_COUNT, list.length);
  let start = list.findIndex((boss) => boss.id === ui.bossId);
  if (start < 0) start = 0;
  const slice = [];
  for (let i = 0; i < shown; i++) slice.push(list[(start + i) % list.length]);
  return { list, start, shown, slice };
}

function stepBoss(delta) {
  const list = visibleBosses();
  if (list.length < 2) return;
  const current = stagedBoss();
  const i = Math.max(0, list.findIndex((boss) => boss.id === current.id));
  ui.bossId = list[(i + delta + list.length) % list.length].id;
  render();
}

function formatWhen(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function rarityLabel(rarity) {
  return (rarity || "common").replace("-", " ");
}

function addKill(bossId, extras = {}) {
  const log = {
    id: uid(),
    bossId,
    at: Date.now(),
    drops: extras.drops || [],
  };
  state.logs.unshift(log);
  state.farmBossId = bossId;
  save();
  render();
  return log;
}

function removeLastKill(bossId) {
  const index = state.logs.findIndex((log) => log.bossId === bossId);
  if (index === -1) return;
  const log = state.logs[index];
  if (log.drops?.length && !confirm("Remove the latest kill? It has loot attached.")) return;
  if (liveKill.logId === log.id) clearLiveKill();
  state.logs.splice(index, 1);
  save();
  render();
}

function deleteLog(id) {
  if (liveKill.logId === id) clearLiveKill();
  state.logs = state.logs.filter((log) => log.id !== id);
  save();
  render();
}

function ninjaFetch(path, bust = false) {
  if (window.chrome?.webview) {
    return webviewJson({ type: "ninja", path, bust: !!bust }, 35000, "poe.ninja timed out");
  }
  return fetch("https://poe.ninja" + path).then(async (res) => {
    const body = await res.text();
    if (!res.ok) throw new Error("poe.ninja " + res.status);
    return JSON.parse(body);
  });
}

function webviewJson(payload, timeoutMs, timeoutText) {
  return new Promise((resolve, reject) => {
    const id = uid();
    const timer = setTimeout(() => {
      ninjaWait.delete(id);
      reject(new Error(timeoutText || "timed out"));
    }, timeoutMs);
    ninjaWait.set(id, { resolve, reject, timer });
    chrome.webview.postMessage({ ...payload, id });
  });
}

function scoutFetch(league) {
  if (!window.chrome?.webview) return Promise.resolve([]);
  return webviewJson({ type: "scout", league }, 35000, "poe2scout timed out");
}

function tradeFetch(name, league, bust = false, thorough = false, extra = {}) {
  if (!window.chrome?.webview) return Promise.reject(new Error("trade needs the desktop app"));
  const filters = Array.isArray(extra.filters) ? extra.filters : [];
  return webviewJson(
    {
      type: "trade",
      name,
      league,
      bust: !!bust,
      thorough: !!thorough,
      rarity: extra.rarity || "",
      typeLine: extra.typeLine || "",
      rolls: extra.rolls || [],
      rollsJson: JSON.stringify(extra.rolls || []),
      filters,
      filtersJson: JSON.stringify(filters),
      corrupted: extra.corrupted === true ? true : extra.corrupted === false ? false : undefined,
      runeSockets: Number.isInteger(extra.runeSockets) ? extra.runeSockets : undefined,
    },
    extra.rolls?.length || filters.length ? 60000 : 45000,
    "PoE 2 trade timed out"
  );
}

// Matcher fold follows Exiled Exchange 2 (MIT): unwrap tags, # placeholders, map to trade ids.
function foldTradeMatcher(text) {
  return stripAdvancedRanges(parseAffixStrings(String(text || "")))
    .replace(/[\r\n]+/g, " ")
    .toLowerCase()
    .replace(/\((?:augmented|unmet|implicit|enchant|rune)\)/gi, " ")
    .replace(/\breduced\b/g, "increased")
    .replace(/\bfewer\b/g, "additional")
    .replace(/\bless\b/g, "more")
    .replace(/\brequires\b/g, "require")
    .replace(/\bin area\b/g, "in map")
    .replace(/\bleft equipped ring\b/g, "equipped left ring")
    .replace(/\bright equipped ring\b/g, "equipped right ring")
    .replace(/\bslots\b/g, "slot")
    .replace(/[+-]?\d+(?:\.\d+)?/g, "#")
    .replace(/#to /g, "# to ")
    .replace(/#%/g, "#%")
    .replace(/%(\S)/g, "% $1")
    .replace(/\s+/g, " ")
    .replace(/^\+/, "")
    .trim();
}

function distinctiveTradePhrase(fold) {
  const ring = String(fold || "").match(/bonuses gained from (?:equipped )?(left|right) (?:equipped )?ring/);
  if (ring) return "bonuses gained from equipped " + ring[1] + " ring";
  if (/additional enemies to be surrounded/.test(fold || "")) return "additional enemies to be surrounded";
  return "";
}

function pickTradeStat(list, kind) {
  if (!list?.length) return null;
  const order =
    kind === "rune"
      ? ["rune", "enchant", "implicit", "explicit"]
      : kind === "implicit"
        ? ["implicit", "enchant", "rune", "explicit"]
        : kind === "enchant"
          ? ["enchant", "implicit", "rune", "explicit"]
          : ["explicit", "implicit", "enchant", "rune"];
  for (const want of order) {
    const hit = list.find((row) => row.type === want || String(row.id).startsWith(want + "."));
    if (hit) return hit;
  }
  return list[0];
}

function foldKeyVariants(key) {
  const k = String(key || "");
  return [...new Set([k, k.replace(/#%/g, "# %"), k.replace(/# %/g, "#%"), k.replace(/ to /g, "to "), k.replace(/to /g, " to ")])].filter(Boolean);
}

function findTradeStat(index, text, kind) {
  if (!index?.size) return null;
  const keys = foldKeyVariants(foldTradeMatcher(text));
  for (const key of keys) {
    const hit = pickTradeStat(index.get(key), kind);
    if (hit) return hit;
  }
  const needle = distinctiveTradePhrase(keys[0]);
  let best = null;
  let bestLen = 0;
  for (const [fold, list] of index) {
    if (keys.some((key) => fold === key || (key.length >= 12 && (fold.startsWith(key + " ") || key.startsWith(fold + " "))))) {
      const hit = pickTradeStat(list, kind);
      if (hit && fold.length >= bestLen) {
        best = hit;
        bestLen = fold.length;
      }
    }
    if (needle && fold.includes(needle)) {
      const hit = pickTradeStat(list, kind);
      if (hit && fold.length >= bestLen) {
        best = hit;
        bestLen = fold.length;
      }
    }
  }
  return best;
}

function invertedTradeRoll(text) {
  const t = String(text || "");
  return /\b(reduced|fewer|less)\b/i.test(t) && !/\blesser\b/i.test(t);
}

function firstClipboardRoll(text, inverted) {
  const raw = stripAdvancedRanges(parseAffixStrings(String(text || "")));
  const pct = raw.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  const any = pct || raw.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!any) return null;
  let n = Number(any[1]);
  if (!Number.isFinite(n)) return null;
  if (inverted && n > 0) n = -n;
  return n;
}

let tradeStatIndex = null;
let tradeStatsWait = null;

function buildTradeStatIndex(data) {
  const map = new Map();
  for (const group of data?.result || []) {
    const kind = group?.id || "";
    if (kind === "pseudo" || kind === "skill") continue;
    for (const entry of group.entries || []) {
      const id = entry?.id || "";
      const key = foldTradeMatcher(entry?.text || "");
      if (!id || !key) continue;
      const list = map.get(key) || [];
      list.push({ id, type: entry.type || kind });
      map.set(key, list);
    }
  }
  return map;
}

async function ensureTradeStats() {
  if (tradeStatIndex) return tradeStatIndex;
  if (tradeStatsWait) return tradeStatsWait;
  tradeStatsWait = (async () => {
    try {
      const data = await webviewJson({ type: "trade-stats" }, 25000, "trade stats timed out");
      tradeStatIndex = buildTradeStatIndex(data);
    } catch {
      tradeStatIndex = new Map();
    }
    return tradeStatIndex;
  })();
  return tradeStatsWait;
}

function isTradeableRoll(text, kind) {
  const t = stripAdvancedRanges(parseAffixStrings(String(text || ""))).trim();
  if (/^\d+\s+uses? remaining$/i.test(t)) return false;
  if (/^adds .+\s+to a map$/i.test(t)) return false;
  if (/^empowers the map boss/i.test(t)) return false;
  return isUsefulRoll(text, kind);
}

function mergeTabletUseFilter(drop, index, filters) {
  if (!drop?.pickUses) return filters || [];
  const uses = Number(drop?.usesRemaining);
  if (!(uses > 0) || !index) return filters || [];
  const line =
    inspectRolls(drop).find((roll) => /^adds .+\s+to a map$/i.test(roll.text)) ||
    (drop.rolls || []).find((roll) => /^adds .+\s+to a map$/i.test(roll.text));
  if (!line) return filters || [];
  const hit = findTradeStat(index, line.text, "implicit");
  if (!hit?.id) return filters || [];
  const next = (filters || []).filter((row) => row.id !== hit.id);
  next.unshift({ id: hit.id, min: uses });
  return next;
}

function mapRollsToTradeFilters(rolls, index, exact = false) {
  const out = [];
  const seen = new Set();
  for (const roll of rolls || []) {
    const raw = rollLineText(roll);
    const kind = canonicalRollKind(roll && typeof roll === "object" ? roll.kind : "");
    const text = stripAdvancedRanges(parseAffixStrings(raw));
    if (!isTradeableRoll(text, kind)) continue;
    const hit = findTradeStat(index, text, kind);
    if (!hit?.id || seen.has(hit.id)) continue;
    seen.add(hit.id);
    const inverted = invertedTradeRoll(raw);
    const amount = firstClipboardRoll(raw, inverted);
    const row = { id: hit.id, text };
    if (Number.isFinite(amount)) {
      if (inverted) row.max = amount;
      else row.min = amount;
    }
    out.push(row);
    if (out.length >= 6) break;
  }
  const rows = exact ? out : (() => {
    const rings = out.filter((row) => /bonuses gained from .*ring/i.test(row.text || ""));
    return rings.length ? rings : out;
  })();
  return rows.map((row) => {
    const next = { id: row.id };
    if (Number.isFinite(row.min)) next.min = row.min;
    if (Number.isFinite(row.max)) next.max = row.max;
    return next;
  });
}

const iconPending = new Map();

function fetchDbIcon(name) {
  if (!name) return Promise.resolve("");
  const lore = lookupLore(name);
  const haveArt = lookupIcon(name);
  if (haveArt && loreIsRich(lore) && (lore.flavour || lore.descr) && (lore.variants?.length || !catalogUnique(name)?.rolls?.pool)) {
    return Promise.resolve(haveArt);
  }
  if (iconPending.has(name)) return iconPending.get(name);
  const work = (async () => {
    try {
      if (!window.chrome?.webview) return "";
      const data = await new Promise((resolve, reject) => {
        const id = uid();
        const timer = setTimeout(() => {
          ninjaWait.delete(id);
          reject(new Error("icon timed out"));
        }, 20000);
        ninjaWait.set(id, { resolve, reject, timer });
        chrome.webview.postMessage({ type: "icon", id, name: canonicalName(name) || name });
      });
      if (data?.icon) rememberIcon(name, data.icon);
      if (data && (data.explicits || data.implicits || data.descr || data.flavour || data.icon || data.properties || data.variants)) rememberLore(name, data);
      return ninjaIcon(data?.icon) || lookupIcon(name) || "";
    } catch {
      return "";
    } finally {
      iconPending.delete(name);
    }
  })();
  iconPending.set(name, work);
  return work;
}

async function mapLimit(items, limit, fn) {
  const q = items.slice();
  const n = Math.min(Math.max(1, limit), q.length || 1);
  await Promise.all(
    Array.from({ length: q.length ? n : 0 }, async () => {
      while (q.length) await fn(q.shift());
    })
  );
}

async function prefetchMissingIcons() {
  const names = new Set();
  const farm = getBoss(farmBossId());
  (farm?.uniques || []).forEach((item) => names.add(item.name));
  const first = [...names].filter((name) => name && !lookupIcon(name));
  await mapLimit(first, 3, fetchDbIcon);
  if (first.length) render();
  SEARCH_ITEMS.forEach((item) => names.add(typeof item === "string" ? item : item?.name));
  allBosses().forEach((boss) => (boss.uniques || []).forEach((item) => names.add(item.name)));
  const rest = [...names].filter((name) => name && !lookupIcon(name) && !first.includes(name)).slice(0, 48);
  if (!rest.length) return;
  mapLimit(rest, 2, fetchDbIcon).then(() => {
    if (rest.some((name) => lookupIcon(name))) render();
  });
}

function fillSuggestIcons(matches, redraw) {
  const missing = (matches || []).filter((item) => item?.name && !lookupIcon(item.name)).slice(0, 8);
  if (!missing.length) return;
  Promise.all(missing.map((item) => fetchDbIcon(item.name))).then((urls) => {
    if (urls.some(Boolean)) redraw();
  });
}

if (window.chrome?.webview) {
  chrome.webview.addEventListener("message", (event) => {
    let msg = event.data;
    if (typeof msg === "string") {
      try {
        msg = JSON.parse(msg);
      } catch {
        return;
      }
    }
    if (msg?.type === "hotkey") {
      handleAppHotkey(msg);
      return;
    }
    if (msg?.type === "overlay-click") {
      handleOverlayClick(msg);
      return;
    }
    if (msg?.type === "overlay-fallback") {
      paintPriceOverlay(true);
      return;
    }
    if (msg?.type === "hotkey-status" && msg.error) {
      showToast(msg.error);
      return;
    }
    if (msg?.type === "rate-limit" || msg?.rate) applyTradeRate(msg.rate || msg);
    if (!msg?.id || !ninjaWait.has(msg.id)) return;
    const wait = ninjaWait.get(msg.id);
    ninjaWait.delete(msg.id);
    clearTimeout(wait.timer);
    if (!msg.ok) {
      let errText = typeof msg.body === "string" ? msg.body : "poe.ninja failed";
      try {
        const parsed = typeof msg.body === "string" ? JSON.parse(msg.body) : msg.body;
        if (parsed?.error) errText = parsed.error;
      } catch {
        /* keep raw body */
      }
      wait.reject(new Error(errText));
      return;
    }
    try {
      wait.resolve(typeof msg.body === "string" ? JSON.parse(msg.body) : msg.body);
    } catch (err) {
      wait.reject(err);
    }
  });
}

function applyTradeRate(rate) {
  if (!rate || typeof rate !== "object") return;
  if (Number.isFinite(rate.readyAt) && rate.readyAt > 0) tradeRate.readyAt = rate.readyAt;
  else if (Number.isFinite(rate.waitMs) && rate.waitMs > 0) tradeRate.readyAt = Date.now() + rate.waitMs;
  else if (rate.waitMs === 0 && tradeRate.readyAt <= Date.now()) tradeRate.readyAt = Date.now();
  tradeRate.waitMs = Math.max(0, rate.waitMs || 0);
  tradeRate.hits = Number(rate.hits) || 0;
  tradeRate.max = Number(rate.max) > 0 ? Number(rate.max) : tradeRate.max || 7;
  tradeRate.window = Number(rate.window) > 0 ? Number(rate.window) : tradeRate.window || 15;
  tradeRate.limited = !!rate.limited;
  paintRateBar();
}

function formatRateWait(ms) {
  const sec = Math.max(1, Math.ceil(ms / 1000));
  if (sec < 60) return sec + "s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? m + "m " + s + "s" : m + "m";
}

function rateStatus() {
  const left = Math.max(0, tradeRate.readyAt - Date.now());
  const max = tradeRate.max || 7;
  const hits = tradeRate.hits || 0;
  const window = tradeRate.window || 15;
  const counts = hits + "/" + max + " / " + window + "s";
  if (left > 0) {
    const wait = formatRateWait(left);
    return {
      wait: true,
      limited: !!tradeRate.limited,
      label: tradeRate.limited ? "Rate limited" : "Rate limiting",
      chip: wait,
      line: (tradeRate.limited ? "Rate limited · " : "Rate limiting · ") + wait,
    };
  }
  return {
    wait: false,
    limited: false,
    label: "Rate limiting",
    chip: counts,
    line: "Rate limiting · " + counts,
  };
}

function paintRateBar() {
  const clock = document.getElementById("rate-clock");
  const clockText = document.getElementById("rate-clock-time");
  const clockLabel = document.getElementById("rate-clock-label");
  const desktop = !!window.chrome?.webview;
  const status = rateStatus();
  if (clock) {
    clock.hidden = !desktop;
    clock.classList.toggle("is-wait", status.wait);
    clock.classList.toggle("is-limited", status.wait && status.limited);
  }
  if (clockLabel) clockLabel.textContent = status.label;
  if (clockText) clockText.textContent = status.chip;
}

function startRateBar() {
  paintRateBar();
  if (window.chrome?.webview) {
    try { window.chrome.webview.postMessage({ type: "rate-status" }); } catch { /* native host not ready */ }
  }
  if (rateBarTimer) return;
  rateBarTimer = setInterval(paintRateBar, 250);
}

function priceKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ITEM_CANON = {
  "arbiter reliquary key": "The Arbiter's Reliquary Key",
  "the arbiter reliquary key": "The Arbiter's Reliquary Key",
  "arbiters reliquary key": "The Arbiter's Reliquary Key",
  "the arbiters reliquary key": "The Arbiter's Reliquary Key",
  "olroth reliquary key": "Olroth's Reliquary Key",
  "olroths reliquary key": "Olroth's Reliquary Key",
  "xesht reliquary key": "Xesht's Reliquary Key",
  "xeshts reliquary key": "Xesht's Reliquary Key",
  "tangmazu reliquary key": "Tangmazu's Reliquary Key",
  "tangmazus reliquary key": "Tangmazu's Reliquary Key",
  "ritualistic reliquary key": "Ritualistic Reliquary Key",
  "trialmaster reliquary key": "The Trialmaster's Reliquary Key",
  "the trialmaster reliquary key": "The Trialmaster's Reliquary Key",
  "trialmasters reliquary key": "The Trialmaster's Reliquary Key",
  "the trialmasters reliquary key": "The Trialmaster's Reliquary Key",
  "zarokh reliquary key": "Zarokh's Reliquary Key",
  "zarokhs reliquary key": "Zarokh's Reliquary Key",
  "morrigans insight": "Mórrigan's Insight",
};

function canonicalName(name) {
  if (!name) return "";
  return ITEM_CANON[priceKey(name)] || ITEM_CANON[foldKey(name)] || name;
}

function lookupKeys(name) {
  const keys = new Set();
  function add(n) {
    if (!n) return;
    keys.add(String(n).toLowerCase());
    keys.add(priceKey(n));
    keys.add(foldKey(n));
    if (typeof slug === "function") keys.add(slug(n));
  }
  add(name);
  const canon = ITEM_CANON[priceKey(name)] || ITEM_CANON[foldKey(name)];
  if (canon && canon !== name) add(canon);
  const pk = priceKey(name);
  if (pk.startsWith("the ")) add(pk.slice(4));
  else add("the " + pk);
  if (pk.endsWith(" support")) add(pk.replace(/ support$/, ""));
  else add(pk + " support");
  if (typeof slug === "function") {
    const s = slug(name);
    if (s) add(s.replace(/-/g, " "));
  }
  if (/\b([a-z]+)s reliquary key$/.test(pk)) add(pk.replace(/\b([a-z]+)s reliquary key$/, "$1 reliquary key"));
  if (/\b([a-z]+) reliquary key$/.test(pk) && !/\b([a-z]+)s reliquary key$/.test(pk)) {
    add(pk.replace(/\b([a-z]+) reliquary key$/, "$1s reliquary key"));
  }
  return [...keys].filter(Boolean);
}

function ninjaIcon(src) {
  if (!src || typeof src !== "string") return "";
  let url = src.trim().replace(/\\/g, "");
  if (url.startsWith("//")) url = "https:" + url;
  const gen = url.match(/\/gen\/image\/[^\s"'\\]+/);
  if (gen) return "https://web.poecdn.com" + gen[0];
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return "https://web.poecdn.com" + url;
  return "";
}

function foldKey(name) {
  return priceKey(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0-9]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const iconCache = new Map();
try {
  const saved = JSON.parse(localStorage.getItem("poe2-exile-ledger-icons-v1") || "{}");
  Object.entries(saved).forEach(([key, url]) => {
    if (key && url) iconCache.set(key, url);
  });
} catch {
  /* ignore */
}

function rememberIcon(name, icon) {
  const resolved = ninjaIcon(icon);
  if (!name || !resolved) return;
  for (const key of [name.toLowerCase(), priceKey(name), foldKey(name)]) {
    if (key) iconCache.set(key, resolved);
  }
  try {
    const dump = {};
    iconCache.forEach((url, key) => {
      dump[key] = url;
    });
    localStorage.setItem("poe2-exile-ledger-icons-v1", JSON.stringify(dump));
  } catch {
    /* quota */
  }
}

function cleanMod(text) {
  return String(text || "")
    .replace(/\[([^\]|]+)\|([^\]]+)\]/g, "$2")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasModRange(text) {
  return /\d+\s*[—–-]\s*\d+/.test(text || "");
}

function modFamily(text) {
  return cleanMod(text)
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/\d+(\.\d+)?/g, "#")
    .replace(/\(#(?:\s*-\s*#)?\)/g, "#")
    .replace(/#\s*-\s*#/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqMods(list) {
  const byFamily = new Map();
  for (const raw of list || []) {
    const text = cleanMod(raw);
    if (!text) continue;
    const fam = modFamily(text);
    if (!fam) continue;
    const prev = byFamily.get(fam);
    if (!prev || (hasModRange(text) && !hasModRange(prev))) byFamily.set(fam, text);
  }
  return [...byFamily.values()];
}

function isRollMod(text) {
  return /per socket|per socketed|one of |\[\d+\s+random/i.test(text || "");
}

function cleanFlavour(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  let joined = out.join(" ").replace(/\s+/g, " ").trim();
  const words = joined.split(" ");
  if (words.length >= 6 && words.length % 2 === 0) {
    const half = words.length / 2;
    const left = words.slice(0, half).join(" ");
    const right = words.slice(half).join(" ");
    if (left.toLowerCase() === right.toLowerCase()) joined = left;
  }
  return joined;
}

function partitionLoreMods(explicits, variants, note) {
  const fixed = [];
  const extra = [...(variants || [])];
  let variantNote = note || "";
  for (const mod of explicits || []) {
    const random = String(mod).match(/\[(\d+)\s+Random\s+([^\]]+)\]/i);
    if (random) {
      variantNote = variantNote || `${random[1]} random ${random[2].trim()}`;
      continue;
    }
    if (isRollMod(mod)) extra.push(mod);
    else fixed.push(mod);
  }
  return { fixed: uniqMods(fixed), variants: uniqMods(extra), variantNote };
}

const loreCache = new Map();

function rememberLore(name, lore) {
  if (!name || !lore) return;
  const prev = lookupLore(name) || {};
  const split = partitionLoreMods(
    [...(prev.explicits || []), ...(lore.explicits || [])],
    [...(prev.variants || []), ...(lore.variants || [])],
    lore.variantNote || prev.variantNote || ""
  );
  const flavour = cleanFlavour(lore.flavour) || prev.flavour || "";
  const descr = cleanFlavour(lore.descr) || prev.descr || "";
  const next = {
    name: lore.name || prev.name || name,
    icon: ninjaIcon(lore.icon) || prev.icon || "",
    baseType: cleanMod(lore.baseType) || prev.baseType || "",
    rarity: lore.rarity || prev.rarity || "",
    implicits: uniqMods([...(prev.implicits || []), ...(lore.implicits || [])]),
    explicits: split.fixed,
    variants: split.variants,
    variantNote: split.variantNote,
    flavour,
    descr: descr && flavour && descr.toLowerCase() === flavour.toLowerCase() ? "" : descr,
    properties: uniqMods([...(prev.properties || []), ...(lore.properties || [])]).slice(0, 4),
  };
  for (const key of lookupKeys(name).concat(next.name ? lookupKeys(next.name) : [])) {
    if (key) loreCache.set(key, next);
  }
  if (next.icon) rememberIcon(name, next.icon);
}

function lookupLore(name) {
  if (!name) return null;
  for (const key of lookupKeys(name)) {
    if (loreCache.has(key)) return loreCache.get(key);
  }
  return null;
}

function loreIsRich(lore) {
  return !!(lore && (lore.explicits?.length || lore.implicits?.length || lore.variants?.length || lore.descr || lore.flavour || lore.properties?.length));
}

function catalogUnique(name) {
  if (!name) return null;
  const id = slug(name);
  const canon = canonicalName(name);
  const canonId = slug(canon);
  for (const boss of allBosses()) {
    const hit = (boss.uniques || []).find(
      (item) => item.id === id || item.id === canonId || item.name === name || item.name === canon || priceKey(item.name) === priceKey(canon)
    );
    if (hit) return hit;
  }
  return null;
}

function catalogNoteFor(name) {
  return catalogUnique(name)?.notes || "";
}

function hoverVariants(name, lore) {
  const item = catalogUnique(name);
  if (item?.rolls?.freeform) return { note: item.notes || "Rolls vary", lines: [] };
  const catalogPool = item?.rolls?.pool ? ROLL_POOLS[item.rolls.pool] || [] : [];
  const lines = catalogPool.length ? catalogPool : lore?.variants || [];
  const slots = item?.rolls?.slots;
  let note = lore?.variantNote || "";
  if (slots && lines.length) note = `${slots} random mods from this pool`;
  else if (!note && lines.length) note = "Possible rolls";
  if (lines.length > 14) {
    return { note: slots ? `${slots} random mods · ${lines.length} possible` : `${lines.length} possible rolls`, lines: [] };
  }
  return { note, lines };
}

function lookupIcon(name) {
  if (!name) return "";
  const priced = lookupPrice(name);
  if (priced?.icon) return priced.icon;
  for (const key of lookupKeys(name)) {
    if (iconCache.get(key)) return iconCache.get(key);
    if (typeof ITEM_ICONS !== "undefined" && ITEM_ICONS[key]) return ITEM_ICONS[key];
  }
  const folded = foldKey(canonicalName(name) || name);
  if (typeof ITEM_ICONS !== "undefined") {
    for (const [key, url] of Object.entries(ITEM_ICONS)) {
      if (foldKey(key) === folded) return url;
    }
  }
  for (const hit of prices.byName.values()) {
    if (hit?.icon && foldKey(hit.name) === folded) return hit.icon;
  }
  return "";
}

function rememberPrice(name, divine, listings, icon, amount, unit, source, replace = false) {
  if (!name) return;
  bustPriceLookup();
  const valid = Number.isFinite(divine) && divine >= 0;
  const resolvedIcon = ninjaIcon(icon);
  if (!valid && !resolvedIcon && !Number.isFinite(amount)) return;
    if (resolvedIcon) rememberIcon(name, resolvedIcon);
    const keys = new Set(lookupKeys(name));
    for (const key of keys) {
      if (!key) continue;
      const prev = prices.byName.get(key);
      if (!prev) {
        prices.byName.set(key, {
          name,
          divine: valid ? divine : undefined,
          maxDivine: valid ? divine : undefined,
          amount: Number.isFinite(amount) ? amount : undefined,
          maxAmount: Number.isFinite(amount) ? amount : undefined,
          unit: unit || undefined,
          listings: listings || 0,
          icon: resolvedIcon || "",
          source: source || "ninja",
          at: Date.now(),
          cached: false,
        });
        continue;
      }
      if (replace && valid) {
        prev.divine = divine;
        prev.maxDivine = divine;
        prev.amount = Number.isFinite(amount) ? amount : undefined;
        prev.maxAmount = Number.isFinite(amount) ? amount : undefined;
        prev.unit = unit || prev.unit;
        prev.listings = listings || 0;
        prev.name = name;
        prev.source = source || prev.source;
        prev.cached = false;
        prev.at = Date.now();
        if (resolvedIcon) prev.icon = resolvedIcon;
        continue;
      }
      if (prev.source === "trade" && (source || "ninja") === "ninja" && valid) {
        prev.divine = divine;
        prev.maxDivine = divine;
        prev.amount = Number.isFinite(amount) ? amount : undefined;
        prev.maxAmount = Number.isFinite(amount) ? amount : undefined;
        prev.unit = unit || prev.unit;
        prev.listings = listings || 0;
        prev.name = name;
        prev.source = "ninja";
        prev.cached = false;
        prev.at = Date.now();
        if (resolvedIcon) prev.icon = resolvedIcon;
        continue;
      }
    if (prev.cached && valid) {
      prev.divine = divine;
      prev.maxDivine = divine;
      prev.amount = Number.isFinite(amount) ? amount : undefined;
      prev.maxAmount = Number.isFinite(amount) ? amount : undefined;
      prev.unit = unit || prev.unit;
      prev.listings = listings || 0;
      prev.name = name;
      prev.source = source || prev.source;
      prev.cached = false;
      prev.at = Date.now();
      if (resolvedIcon) prev.icon = resolvedIcon;
      continue;
    }
    if (valid) {
      if (!Number.isFinite(prev.divine) || divine < prev.divine) {
        prev.divine = divine;
        prev.name = name;
        prev.at = Date.now();
        prev.cached = false;
        if (resolvedIcon) prev.icon = resolvedIcon;
        if (source) prev.source = source;
      }
      prev.maxDivine = Number.isFinite(prev.maxDivine) ? Math.max(prev.maxDivine, divine) : divine;
    }
    if (Number.isFinite(amount) && (!unit || !prev.unit || unit === prev.unit)) {
      prev.unit = unit || prev.unit;
      prev.amount = Number.isFinite(prev.amount) ? Math.min(prev.amount, amount) : amount;
      prev.maxAmount = Number.isFinite(prev.maxAmount) ? Math.max(prev.maxAmount, amount) : amount;
    }
    prev.listings = Math.max(prev.listings || 0, listings || 0);
    if (resolvedIcon && !prev.icon) prev.icon = resolvedIcon;
    if (source && !prev.source) prev.source = source;
  }
}

function toDivine(value, primary) {
  if (!Number.isFinite(value)) return NaN;
  if (!primary || primary === "divine") return value;
  if (primary === "exalted") return prices.exaltedPerDivine ? value / prices.exaltedPerDivine : NaN;
  if (primary === "chaos") return prices.chaosPerDivine ? value / prices.chaosPerDivine : NaN;
  return value;
}

function sparkFromLine(line) {
  const s = line?.sparkLine || line?.sparkline || {};
  let raw = s.data;
  if (typeof raw === "string") {
    raw = raw
      .trim()
      .split(/\s+/)
      .map((v) => (v === "" || v == null ? null : Number(v)));
  }
  const data = Array.isArray(raw) ? raw.map((v) => (v == null || v === "" ? null : Number(v))) : [];
  const change = Number(s.totalChange);
  return { data, change: Number.isFinite(change) ? change : 0 };
}

function sparkPoints(data) {
  return (data || [])
    .map((v, i) => (v == null || !Number.isFinite(Number(v)) ? null : { i, v: Number(v) }))
    .filter(Boolean);
}

function sparkSvg(data, change, wide = false) {
  const pts = sparkPoints(data);
  const w = wide ? 420 : 120;
  const h = wide ? 120 : 36;
  if (pts.length < 2) {
    return wide ? `<p class="muted">Not enough history yet this league.</p>` : `<span class="spark empty">—</span>`;
  }
  const min = Math.min(...pts.map((p) => p.v), 0);
  const max = Math.max(...pts.map((p) => p.v), 0);
  const span = max - min || 1;
  const last = (data || []).length - 1 || 1;
  const d = pts
    .map((p, idx) => {
      const x = (p.i / last) * w;
      const y = h - ((p.v - min) / span) * (h - 6) - 3;
      return `${idx ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const cls = change > 0.4 ? "up" : change < -0.4 ? "down" : "flat";
  return `<svg class="spark ${cls}${wide ? " lg" : ""}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" /></svg>`;
}

function historyPoints(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && (data.value != null || data.daysAgo != null)) return [data];
  return [];
}

function historySvg(points, unit) {
  const pts = historyPoints(points)
    .map((p) => ({ x: Number(p.daysAgo), y: Number(p.value) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => b.x - a.x);
  if (pts.length < 2) return "";
  const w = 420;
  const h = 120;
  const min = Math.min(...pts.map((p) => p.y));
  const max = Math.max(...pts.map((p) => p.y));
  const span = max - min || 1;
  const oldest = pts[0].x;
  const newest = pts[pts.length - 1].x;
  const xspan = oldest - newest || 1;
  const d = pts
    .map((p, idx) => {
      const x = ((oldest - p.x) / xspan) * w;
      const y = h - ((p.y - min) / span) * (h - 6) - 3;
      return `${idx ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const first = pts[0].y;
  const last = pts[pts.length - 1].y;
  const cls = last > first * 1.004 ? "up" : last < first * 0.996 ? "down" : "flat";
  const axisUnit = unit || "divine";
  return `<div class="econ-chart-plot">
    <svg class="spark ${cls} lg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" /></svg>
    <div class="econ-chart-axis"><span>${esc(formatAmount(min, axisUnit))}</span><span>${esc(formatAmount(max, axisUnit))}</span></div>
  </div>`;
}

function changeHtml(change) {
  if (!Number.isFinite(change) || Math.abs(change) < 0.05) return `<span class="chg flat">0%</span>`;
  const n = Math.abs(change) >= 10 ? change.toFixed(0) : change.toFixed(1);
  const cls = change > 0 ? "up" : "down";
  return `<span class="chg ${cls}">${change > 0 ? "+" : ""}${n}%</span>`;
}

function ingestExchange(data, type) {
  if (!data) return;
  const rates = data.core?.rates || {};
  if (type === "Currency" || !prices.primary) {
    if (data.core?.primary) prices.primary = data.core.primary;
  }
  if (rates.exalted && (type === "Currency" || !prices.exaltedPerDivine)) prices.exaltedPerDivine = rates.exalted;
  if (rates.chaos && (type === "Currency" || !prices.chaosPerDivine)) prices.chaosPerDivine = rates.chaos;
  const names = new Map();
  for (const item of [...(data.core?.items || []), ...(data.items || [])]) {
    if (!item) continue;
    const meta = { name: item.name, icon: ninjaIcon(item.image || item.icon) };
    if (item.id && item.name) names.set(String(item.id), meta);
    if (item.detailsId && item.name) names.set(String(item.detailsId), meta);
    if (item?.name) rememberIcon(item.name, item.image || item.icon);
  }
  const unit = data.core?.primary || "divine";
  const rows = [];
  for (const line of data.lines || []) {
    const meta = names.get(String(line.id)) || names.get(String(line.detailsId || ""));
    const name = meta?.name || line.name || line.currencyTypeName || "";
    const amount = Number(line.primaryValue ?? line.divineValue ?? line.exaltedValue ?? line.chaosValue);
    const divine = toDivine(amount, unit);
    const icon = ninjaIcon(line.icon || line.image) || meta?.icon || "";
    rememberPrice(name, divine, line.listingCount, icon, amount, unit);
    if (name) {
      rows.push({
        name,
        divine,
        amount,
        unit,
        listings: line.listingCount || 0,
        icon,
        baseType: "",
        spark: sparkFromLine(line),
        ninjaId: line.id,
        kind: "exchange",
        type,
      });
    }
  }
  if (type) prices.tables[type] = rows;
}

function ingestItems(data, type) {
  const unit = data?.core?.primary || "exalted";
  const rows = [];
  for (const line of data?.lines || []) {
    const amount = Number(line.primaryValue ?? line.divineValue ?? line.exaltedValue ?? line.chaosValue);
    const divine = toDivine(amount, unit);
    rememberPrice(line.name, divine, line.listingCount, line.icon || line.image, amount, unit);
    rememberNinjaLore(line);
    if (line?.name) {
      rows.push({
        name: line.name,
        divine,
        amount,
        unit,
        listings: line.listingCount || 0,
        icon: ninjaIcon(line.icon || line.image),
        baseType: line.baseType || "",
        corrupted: !!line.corrupted,
        spark: sparkFromLine(line),
        ninjaId: line.id,
        kind: "item",
        type,
      });
    }
  }
  if (type) prices.tables[type] = rows;
}

function rememberNinjaLore(line) {
  if (!line?.name) return;
  const explicits = [];
  const variants = [];
  for (const mod of line.explicitModifiers || []) {
    const text = cleanMod(mod.text);
    if (!text) continue;
    if (mod.optional || isRollMod(text)) variants.push(text);
    else explicits.push(text);
  }
  rememberLore(line.name, {
    icon: line.icon || line.image,
    baseType: line.baseType || line.category || "",
    rarity: "Unique",
    flavour: Array.isArray(line.flavourText) ? line.flavourText.join("\n") : line.flavourText,
    explicits,
    variants,
  });
}

function pricedHit(hit) {
  return hit && (Number.isFinite(hit.divine) || Number.isFinite(hit.amount));
}

const priceLookupMemo = new Map();
let priceFoldIndex = null;

function bustPriceLookup() {
  priceLookupMemo.clear();
  priceFoldIndex = null;
}

function priceFoldMap() {
  if (priceFoldIndex) return priceFoldIndex;
  priceFoldIndex = new Map();
  for (const hit of prices.byName.values()) {
    if (!pricedHit(hit) || !hit.name) continue;
    const got = foldKey(hit.name).replace(/ support$/, "");
    if (!priceFoldIndex.has(got)) priceFoldIndex.set(got, hit);
    if (typeof slug === "function") {
      const s = slug(hit.name);
      if (s && !priceFoldIndex.has("slug:" + s)) priceFoldIndex.set("slug:" + s, hit);
    }
  }
  return priceFoldIndex;
}

function lookupPrice(name) {
  if (!name) return null;
  if (priceLookupMemo.has(name)) return priceLookupMemo.get(name);
  let found = null;
  for (const key of lookupKeys(name)) {
    const hit = prices.byName.get(key);
    if (pricedHit(hit)) {
      found = hit;
      break;
    }
  }
  if (!found) {
    const want = foldKey(name).replace(/ support$/, "");
    const index = priceFoldMap();
    found = index.get(want) || (typeof slug === "function" ? index.get("slug:" + slug(name)) : null) || null;
  }
  priceLookupMemo.set(name, found);
  return found;
}

function formatNum(n) {
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return String(Number(n.toFixed(1)));
  if (abs >= 1) return n.toFixed(1);
  if (abs >= 0.1) return String(Number(n.toFixed(2)));
  return String(Number(n.toFixed(3)));
}

function formatAmount(value, unit) {
  if (!Number.isFinite(value)) return "—";
  const suffix = unit === "exalted" || unit === "ex" ? "ex" : unit === "chaos" || unit === "c" ? "c" : "d";
  return formatNum(value) + suffix;
}

function allConvertUnits() {
  return ["divine", "exalted", "chaos"];
}

function convertUnits() {
  return allConvertUnits().filter((unit) => unit !== "chaos" || prices.chaosPerDivine);
}

function nextConvertUnit(unit, step = 1) {
  const units = allConvertUnits();
  const i = Math.max(0, units.indexOf(unit));
  return units[(i + step + units.length * 8) % units.length];
}

function convertMain() {
  const units = allConvertUnits();
  const unit = state.convertMain || "divine";
  return units.includes(unit) ? unit : "divine";
}

function convertQuote() {
  return nextConvertUnit(convertMain(), 1);
}

function setConvertMain(unit) {
  if (!allConvertUnits().includes(unit)) return;
  state.convertMain = unit;
  save();
  render();
}

function amountInDivine(amount, unit) {
  if (!Number.isFinite(amount)) return NaN;
  if (!unit || unit === "divine" || unit === "d") return amount;
  if (unit === "exalted" || unit === "ex") return prices.exaltedPerDivine ? amount / prices.exaltedPerDivine : NaN;
  if (unit === "chaos" || unit === "c") return prices.chaosPerDivine ? amount / prices.chaosPerDivine : NaN;
  return amount;
}

function amountFromDivine(divine, unit) {
  if (!Number.isFinite(divine)) return NaN;
  if (!unit || unit === "divine" || unit === "d") return divine;
  if (unit === "exalted" || unit === "ex") return prices.exaltedPerDivine ? divine * prices.exaltedPerDivine : NaN;
  if (unit === "chaos" || unit === "c") return prices.chaosPerDivine ? divine * prices.chaosPerDivine : NaN;
  return divine;
}

function unitShort(unit) {
  if (unit === "exalted" || unit === "ex") return "ex";
  if (unit === "chaos" || unit === "c") return "c";
  return "d";
}

function unitLabel(unit) {
  if (unit === "exalted") return "Exalt";
  if (unit === "chaos") return "Chaos";
  return "Divine";
}

function convertSteps(unit) {
  if (unit === "divine") return [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  if (unit === "exalted") return [1, 5, 10, 20, 50, 100, 200, 500];
  return [1, 10, 20, 50, 100, 200, 500, 1000];
}

function formatDivine(divine) {
  if (!Number.isFinite(divine)) return "—";
  const main = convertMain();
  const converted = amountFromDivine(divine, main);
  if (Number.isFinite(converted)) return formatAmount(converted, main);
  if (main !== "exalted" && prices.exaltedPerDivine) return formatAmount(amountFromDivine(divine, "exalted"), "exalted");
  if (main !== "chaos" && prices.chaosPerDivine) return formatAmount(amountFromDivine(divine, "chaos"), "chaos");
  return formatAmount(divine, "divine");
}

function currencyNameForUnit(unit) {
  if (unit === "exalted" || unit === "ex") return "Exalted Orb";
  if (unit === "chaos" || unit === "c") return "Chaos Orb";
  return "Divine Orb";
}

function valueFromAmount(amount, unit) {
  const name = currencyNameForUnit(unit);
  return `<span class="value-with-icon" ${itemHoverAttr(name)}>${itemIconHtml(name)}${esc(formatAmount(amount, unit))}</span>`;
}

function rowValueHtml(row) {
  if (row?.unit && Number.isFinite(row.amount)) return valueFromAmount(row.amount, row.unit);
  return valueHtml(row?.divine);
}

function itemHoverAttr(name) {
  return `data-tip="${esc(name)}"`;
}

function itemIconHtml(name, size = "") {
  const src = lookupIcon(name);
  const cls = "item-icon" + (size ? " " + size : "");
  if (!src) return size === "lg" ? `<span class="${cls} missing" aria-hidden="true"></span>` : "";
  return `<img class="${cls}" src="${esc(src)}" alt="" draggable="false" onerror="this.remove()" />`;
}

function itemNameHtml(name, size) {
  return `<span class="tip-source" ${itemHoverAttr(name)}>${itemIconHtml(name, size)}<span>${esc(name)}</span></span>`;
}

function currencyForAmount(divine) {
  const label = formatDivine(divine);
  if (label.endsWith("ex")) return "Exalted Orb";
  if (label.endsWith("c")) return "Chaos Orb";
  return "Divine Orb";
}

function hitDivine(hit) {
  if (Number.isFinite(hit?.divine)) return hit.divine;
  if (hit?.unit && Number.isFinite(hit.amount)) return toDivine(hit.amount, hit.unit);
  return NaN;
}

function priceChip(name) {
  const hit = lookupPrice(name);
  const mark = `data-price-for="${esc(name)}"`;
  if (pricedHit(hit)) {
    const low = hitDivine(hit);
    const high = Number.isFinite(hit.maxDivine) ? hit.maxDivine : low;
    const spread = Number.isFinite(low) && Number.isFinite(high) && high > low * 1.2;
    const label = spread ? `${formatDivine(low)}–${formatDivine(high)}` : formatDivine(low);
    const currency = currencyForAmount(spread ? high : low);
    return `<span class="price-chip${hit.cached ? " is-cached" : ""}" ${mark} title="${spread ? srcLabel(hit) + " floor–high" : srcLabel(hit)}" ${itemHoverAttr(currency)}>${itemIconHtml(currency)}${esc(label)}</span>`;
  }
  if (prices.looking.has(name)) {
    return `<span class="price-chip is-empty" ${mark}>checking…</span>`;
  }
  const checked = prices.checkedEmpty.has(name);
  return `<span class="price-chip is-empty is-lookup" ${mark} data-price-lookup="${esc(name)}" title="${
    checked ? "Not on poe.ninja — click to try a single PoE 2 trade lookup" : "No poe.ninja price — click to try PoE 2 trade for this item"
  }">${checked ? "no listing" : "no listing"}</span>`;
}

function paintLivePrices() {
  for (const el of [...document.querySelectorAll("[data-price-for]")]) {
    const html = priceChip(el.dataset.priceFor);
    if (el.outerHTML !== html) el.outerHTML = html;
  }
  paintPriceClock();
}

function valueHtml(divine) {
  const name = currencyForAmount(divine);
  const label = formatDivine(divine);
  return `<span class="value-with-icon" ${itemHoverAttr(name)}>${itemIconHtml(name)}${esc(label)}</span>`;
}

function srcLabel(hit) {
  const when = hit?.at ? " · " + formatWhen(hit.at) : "";
  if (hit?.cached) {
    if (hit.source === "trade") return "Last recorded from PoE 2 trade" + when;
    if (hit.source === "scout") return "Last recorded from poe2scout" + when;
    return "Last recorded from poe.ninja" + when;
  }
  if (hit?.source === "trade") return "PoE 2 trade lowest listing";
  if (hit?.source === "scout") return "poe2scout (from PoE 2 trade)";
  if (hit?.source) return hit.source;
  return "poe.ninja floor";
}

function dropValue(drop) {
  const divine = hitDivine(lookupPrice(drop.name));
  if (!Number.isFinite(divine)) return 0;
  return divine * (drop.qty || 1);
}

function logValue(log) {
  return (log.drops || []).reduce((sum, drop) => sum + dropValue(drop), 0);
}

function totalLootValue(logs = state.logs) {
  return logs.reduce((sum, log) => sum + logValue(log), 0);
}

function leagueId() {
  if (state.league) return String(state.league).trim();
  const fromSelect = document.getElementById("league-input")?.value?.trim();
  if (fromSelect) return fromSelect;
  return "Forbidden Rites";
}

function catalogNames() {
  const names = new Set();
  if (typeof SEARCH_ITEMS !== "undefined") {
    SEARCH_ITEMS.forEach((item) => names.add(typeof item === "string" ? item : item?.name));
  }
  allBosses().forEach((boss) => (boss.uniques || []).forEach((item) => names.add(item.name)));
  return [...names].filter(Boolean);
}

function linkCatalogPrices() {
  const priced = [];
  const seen = new Set();
  for (const hit of prices.byName.values()) {
    if (!pricedHit(hit) || !hit.name || seen.has(hit.name)) continue;
    seen.add(hit.name);
    priced.push(hit);
  }
  for (const name of catalogNames()) {
    if (pricedHit(lookupPrice(name))) continue;
    const want = foldKey(name).replace(/ support$/, "");
    const wantSlug = typeof slug === "function" ? slug(name) : "";
    const hit = priced.find((row) => {
      const got = foldKey(row.name).replace(/ support$/, "");
      return got === want || (wantSlug && typeof slug === "function" && slug(row.name) === wantSlug);
    });
    if (hit) rememberPrice(name, hit.divine, hit.listings, hit.icon, hit.amount, hit.unit);
  }
}

const PRICE_REFRESH_MS = 60 * 60 * 1000;
const PRICE_RETRY_MS = 3 * 60 * 1000;
const PRICE_CACHE_KEY = "poe2-exile-ledger-prices-v1";
const BOSS_PRICE_CACHE_KEY = "poe2-exile-ledger-boss-prices-v1";
const PRICE_CACHE_FRESH_MS = 5 * 60 * 1000;
let catalogDiskStore = { version: 3, leagues: {} };

function clonePriceMap(map) {
  const next = new Map();
  if (!map) return next;
  for (const [key, hit] of map.entries()) next.set(key, { ...hit });
  return next;
}

function uniquePricedHits(map = prices.byName) {
  const rows = [];
  const seen = new Set();
  for (const hit of map.values()) {
    if (!hit?.name || seen.has(hit.name) || !pricedHit(hit)) continue;
    seen.add(hit.name);
    rows.push({
      name: hit.name,
      divine: hit.divine,
      maxDivine: hit.maxDivine,
      amount: hit.amount,
      maxAmount: hit.maxAmount,
      unit: hit.unit,
      listings: hit.listings || 0,
      icon: hit.icon || "",
      source: hit.source || "ninja",
      at: hit.at || 0,
      cached: !!hit.cached,
    });
  }
  return rows;
}

function compactSpark(spark, mode = "short") {
  const change = Number(spark?.change);
  const compactChange = Number.isFinite(change) ? Number(change.toFixed(4)) : 0;
  if (mode === "bare" || mode === "change") return { change: compactChange, data: [] };
  const data = Array.isArray(spark?.data) ? spark.data.slice(-8) : [];
  return {
    change: compactChange,
    data: data.map((v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(Number(v).toFixed(3)))),
  };
}

function compactPriceTables(tables = prices.tables, sparkMode = "short") {
  const out = {};
  for (const [type, rows] of Object.entries(tables || {})) {
    if (!Array.isArray(rows) || !rows.length) continue;
    out[type] = rows.map((row) => {
      const next = {
        name: row.name,
        divine: row.divine,
        amount: row.amount,
        unit: row.unit,
        listings: row.listings || 0,
        baseType: row.baseType || "",
        ninjaId: row.ninjaId,
        kind: row.kind,
        type: row.type || type,
        spark: compactSpark(row.spark, sparkMode),
        corrupted: row.corrupted,
      };
      if (sparkMode !== "bare") next.icon = row.icon || "";
      return next;
    });
  }
  return out;
}

function priceStoreHasData(entry) {
  if (!entry) return false;
  if (Array.isArray(entry.items) && entry.items.length) return true;
  return Object.values(entry.tables || {}).some((rows) => Array.isArray(rows) && rows.length);
}

function prunePriceLeagues(leagues, keep = 6) {
  const entries = Object.entries(leagues || {});
  if (entries.length <= keep) return Object.fromEntries(entries);
  const weight = (entry) => {
    const items = entry[1]?.items?.length || 0;
    const tables = Object.values(entry[1]?.tables || {}).reduce((n, rows) => n + (rows?.length || 0), 0);
    return items + tables;
  };
  entries.sort((a, b) => weight(b) - weight(a) || (b[1]?.fetchedAt || 0) - (a[1]?.fetchedAt || 0));
  return Object.fromEntries(entries.slice(0, keep));
}

function compactPriceHit(hit) {
  return {
    name: hit.name,
    divine: hit.divine,
    maxDivine: hit.maxDivine,
    amount: hit.amount,
    maxAmount: hit.maxAmount,
    unit: hit.unit,
    listings: hit.listings || 0,
    icon: hit.icon || "",
    source: hit.source || "ninja",
    at: hit.at || 0,
    cached: true,
  };
}

function catalogNameSet() {
  const names = new Set();
  for (const name of catalogNames()) names.add(priceKey(name));
  for (const name of dashboardPriceNames()) names.add(priceKey(name));
  return names;
}

function catalogPriceRows() {
  const names = new Set([...catalogNames(), ...dashboardPriceNames()]);
  const rows = [];
  const seen = new Set();
  for (const name of names) {
    const hit = lookupPrice(name);
    if (!pricedHit(hit) || !hit.name || seen.has(hit.name)) continue;
    seen.add(hit.name);
    rows.push(compactPriceHit(hit));
  }
  return rows;
}

function mergePriceRows(oldRows, newRows) {
  const map = new Map();
  const put = (row) => {
    if (!row?.name) return;
    const key = priceKey(row.name);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...row });
      return;
    }
    if (row.source === "ninja" && pricedHit(row)) {
      map.set(key, { ...prev, ...row });
      return;
    }
    if (prev.source === "ninja" && pricedHit(prev) && row.source !== "ninja") {
      if (row.icon && !prev.icon) prev.icon = row.icon;
      return;
    }
    map.set(key, { ...prev, ...row });
  };
  (oldRows || []).forEach(put);
  (newRows || []).forEach(put);
  return [...map.values()];
}

function mergeLeagueEntry(prev, next) {
  if (!prev || !priceStoreHasData(prev)) return next;
  if (!next || !priceStoreHasData(next)) return prev;
  return {
    ...prev,
    ...next,
    items: mergePriceRows(prev.items, next.items),
    tables: { ...(prev.tables || {}), ...(next.tables || {}) },
    empty: [...new Set([...(prev.empty || []), ...(next.empty || [])])],
    fetchedAt: Math.max(Number(prev.fetchedAt) || 0, Number(next.fetchedAt) || 0),
    exaltedPerDivine: Number(next.exaltedPerDivine) || Number(prev.exaltedPerDivine) || 0,
    chaosPerDivine: Number(next.chaosPerDivine) || Number(prev.chaosPerDivine) || 0,
  };
}

function catalogCacheEntry() {
  const league = prices.league || leagueId();
  const items = uniquePricedHits();
  return {
    league,
    fetchedAt: prices.fetchedAt || 0,
    nextAt: prices.nextAt || 0,
    primary: prices.primary,
    exaltedPerDivine: prices.exaltedPerDivine,
    chaosPerDivine: prices.chaosPerDivine,
    items: items.length ? items : catalogPriceRows(),
    tables: compactPriceTables(prices.tables, "bare"),
    empty: [...prices.checkedEmpty],
  };
}

function bestLeagueDump(leagues) {
  return Object.values(leagues || {})
    .filter(priceStoreHasData)
    .sort((a, b) => (b.fetchedAt || 0) - (a.fetchedAt || 0))[0];
}

function applyCatalogRows(rows, extra = {}) {
  for (const row of rows || []) {
    if (!row?.name || !pricedHit(row)) continue;
    const prev = lookupPrice(row.name);
    if (pricedHit(prev) && !prev.cached && extra.cached) continue;
    if (pricedHit(prev) && prev.source === "ninja" && row.source !== "ninja" && extra.cached) continue;
    const replace = !pricedHit(prev) || row.source === "ninja";
    rememberPrice(row.name, row.divine, row.listings, row.icon, row.amount, row.unit, row.source, replace);
    stampPriceHit(row.name, {
      at: row.at || extra.at || 0,
      cached: extra.cached != null ? extra.cached : true,
      maxDivine: row.maxDivine,
      maxAmount: row.maxAmount,
      source: row.source,
    });
  }
}

function restoreCatalogPrices(oldMap) {
  if (!oldMap?.size) return;
  const catalog = catalogNameSet();
  const seen = new Set();
  for (const hit of oldMap.values()) {
    if (!hit?.name || !pricedHit(hit) || seen.has(hit.name)) continue;
    seen.add(hit.name);
    const inCatalog = lookupKeys(hit.name).some((key) => catalog.has(key) || catalog.has(priceKey(key)));
    if (!inCatalog && hit.source !== "trade") continue;
    if (pricedHit(lookupPrice(hit.name))) continue;
    applyCatalogRows([hit], { cached: true, at: hit.at });
  }
}

function readBossPriceStore() {
  try {
    const dump = JSON.parse(localStorage.getItem(BOSS_PRICE_CACHE_KEY) || "null");
    if (dump?.leagues && typeof dump.leagues === "object") return { version: 3, leagues: dump.leagues };
  } catch {
    /* ignore */
  }
  return { version: 3, leagues: {} };
}

function writePriceDisk(store) {
  catalogDiskStore = store;
  try {
    localStorage.setItem(BOSS_PRICE_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* quota — disk still gets a copy */
  }
  if (window.chrome?.webview) {
    try {
      chrome.webview.postMessage({ type: "price-cache-set", id: uid(), json: JSON.stringify(store) });
    } catch {
      /* native host not ready */
    }
  }
}

function persistCatalogCache() {
  const entry = catalogCacheEntry();
  const local = readBossPriceStore();
  const diskLeagues = catalogDiskStore?.leagues && typeof catalogDiskStore.leagues === "object" ? catalogDiskStore.leagues : {};
  const prev = local.leagues?.[entry.league] || diskLeagues[entry.league];
  if (!entry.items.length && !entry.exaltedPerDivine && !prices.fetchedAt) {
    if (priceStoreHasData(prev)) return;
    return;
  }
  const merged = mergeLeagueEntry(prev, entry);
  if (!priceStoreHasData(merged)) return;
  const leagues = prunePriceLeagues({ ...local.leagues, ...diskLeagues, [entry.league]: merged });
  writePriceDisk({ version: 3, leagues });
}

function hydrateFromDump(dump, cached = true) {
  if (!dump) return false;
  const items = Array.isArray(dump.items) ? dump.items : [];
  const tables = dump.tables && typeof dump.tables === "object" ? dump.tables : {};
  const tableRows = Object.values(tables).flatMap((rows) => (Array.isArray(rows) ? rows : []));
  const hasItems = items.length > 0 || tableRows.some((row) => pricedHit(row));
  if (!hasItems && !(Number(dump.exaltedPerDivine) > 0) && !Object.keys(tables).length) return false;
  if (Object.keys(tables).length) prices.tables = { ...prices.tables, ...tables };
  if (dump.primary) prices.primary = dump.primary;
  if (Number(dump.exaltedPerDivine) > 0) prices.exaltedPerDivine = Number(dump.exaltedPerDivine);
  if (Number(dump.chaosPerDivine) > 0) prices.chaosPerDivine = Number(dump.chaosPerDivine);
  if (dump.league) prices.league = dump.league;
  if (Number(dump.fetchedAt) > (prices.fetchedAt || 0)) prices.fetchedAt = Number(dump.fetchedAt);
  if (Number(dump.nextAt) > 0) prices.nextAt = Number(dump.nextAt);
  prices.cached = true;
  prices.status = "ready";
  prices.error = "";
  if (Array.isArray(dump.empty)) dump.empty.forEach((name) => prices.checkedEmpty.add(name));
  applyCatalogRows(items.length ? items : tableRows, { cached });
  return true;
}

function stampPriceHit(name, extra) {
  if (!name) return;
  for (const key of lookupKeys(name)) {
    const hit = prices.byName.get(key);
    if (!hit) continue;
    if (extra.at != null) hit.at = extra.at;
    if (extra.cached != null) hit.cached = extra.cached;
    if (Number.isFinite(extra.maxDivine)) hit.maxDivine = extra.maxDivine;
    if (Number.isFinite(extra.maxAmount)) hit.maxAmount = extra.maxAmount;
    if (extra.source) hit.source = extra.source;
  }
}

function applyPriceRow(row, extra = {}) {
  if (!row?.name) return;
  rememberPrice(row.name, row.divine, row.listings, row.icon, row.amount, row.unit, row.source);
  stampPriceHit(row.name, {
    at: row.at || extra.at || 0,
    cached: extra.cached != null ? extra.cached : !!row.cached,
    maxDivine: row.maxDivine,
    maxAmount: row.maxAmount,
    source: row.source,
  });
}

function readPriceStore() {
  try {
    const dump = JSON.parse(localStorage.getItem(PRICE_CACHE_KEY) || "null");
    if (!dump) return { version: 2, leagues: {} };
    if (Array.isArray(dump.items)) {
      const league = dump.league || leagueId();
      return { version: 2, leagues: { [league]: dump } };
    }
    return { version: 2, leagues: dump.leagues && typeof dump.leagues === "object" ? dump.leagues : {} };
  } catch {
    return { version: 2, leagues: {} };
  }
}

function persistPrices() {
  const league = prices.league || leagueId();
  const items = uniquePricedHits();
  const catalogItems = catalogPriceRows();
  const store = readPriceStore();
  const liveHasTables = Object.values(prices.tables || {}).some((rows) => Array.isArray(rows) && rows.length);
  if (!items.length && !catalogItems.length && !liveHasTables && priceStoreHasData(store.leagues[league])) {
    persistCatalogCache();
    return;
  }
  const base = {
    league,
    fetchedAt: prices.fetchedAt || 0,
    nextAt: prices.nextAt || 0,
    primary: prices.primary,
    exaltedPerDivine: prices.exaltedPerDivine,
    chaosPerDivine: prices.chaosPerDivine,
    empty: [...prices.checkedEmpty],
  };
  const attempts = [
    { items, sparkMode: "short" },
    { items, sparkMode: "change" },
    { items, sparkMode: "bare" },
    { items, sparkMode: "none" },
    { items: catalogItems, sparkMode: "none" },
  ];
  for (const attempt of attempts) {
    const entry = {
      ...base,
      items: attempt.items,
      tables: attempt.sparkMode === "none" ? {} : compactPriceTables(prices.tables, attempt.sparkMode),
    };
    const leagues = prunePriceLeagues({ ...store.leagues, [league]: mergeLeagueEntry(store.leagues[league], entry) });
    try {
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ version: 2, leagues }));
      persistCatalogCache();
      return;
    } catch {
      /* quota — try a smaller payload */
    }
  }
  persistCatalogCache();
}

function persistPricesSoon() {
  clearTimeout(persistPricesSoon.timer);
  persistPricesSoon.timer = setTimeout(persistPrices, 400);
}

function hydrateBossPriceCache() {
  const store = readBossPriceStore();
  const dump = store.leagues[leagueId()] || bestLeagueDump(store.leagues);
  return hydrateFromDump(dump, true);
}

function hydratePriceCache() {
  try {
    const store = readPriceStore();
    const dump = store.leagues[leagueId()] || bestLeagueDump(store.leagues);
    if (priceStoreHasData(dump)) {
      const items = Array.isArray(dump.items) ? dump.items : [];
      const tables = dump.tables && typeof dump.tables === "object" ? dump.tables : {};
      const tableRows = Object.values(tables).flatMap((rows) => (Array.isArray(rows) ? rows : []));
      if (!prices.byName.size) {
        prices.tables = tables;
        prices.history = {};
        bustPriceLookup();
        prices.primary = dump.primary || "divine";
        prices.exaltedPerDivine = Number(dump.exaltedPerDivine) || 0;
        prices.chaosPerDivine = Number(dump.chaosPerDivine) || 0;
        prices.league = dump.league || leagueId();
        prices.fetchedAt = Number(dump.fetchedAt) || 0;
        prices.nextAt = Number(dump.nextAt) || 0;
        prices.cached = true;
        prices.status = "ready";
        prices.error = "";
        prices.checkedEmpty = new Set(Array.isArray(dump.empty) ? dump.empty : []);
        for (const row of items.length ? items : tableRows) applyPriceRow(row, { cached: true });
      } else {
        hydrateFromDump(dump, true);
      }
    }
    hydrateBossPriceCache();
    linkCatalogPrices();
    return prices.byName.size > 0;
  } catch {
    return hydrateBossPriceCache() || prices.byName.size > 0;
  }
}

async function hydratePriceDisk() {
  if (!window.chrome?.webview) return prices.byName.size > 0;
  try {
    const dump = await webviewJson({ type: "price-cache-get" }, 8000, "price cache timed out");
    if (dump?.leagues && typeof dump.leagues === "object") catalogDiskStore = { version: 3, leagues: dump.leagues };
    const entry = dump?.leagues?.[leagueId()] || bestLeagueDump(dump?.leagues);
    if (hydrateFromDump(entry, true)) {
      linkCatalogPrices();
      paintLivePrices();
      return true;
    }
  } catch {
    /* local cache still stands */
  }
  return prices.byName.size > 0;
}

function restoreCachedMisses(oldMap) {
  if (!oldMap?.size) return;
  const fresh = new Set();
  for (const hit of prices.byName.values()) {
    if (hit?.name) fresh.add(priceKey(hit.name));
  }
  const seen = new Set();
  for (const hit of oldMap.values()) {
    if (!hit?.name || seen.has(hit.name) || !pricedHit(hit)) continue;
    seen.add(hit.name);
    if (fresh.has(priceKey(hit.name)) || pricedHit(lookupPrice(hit.name))) continue;
    applyPriceRow(hit, { cached: true, at: hit.at || prices.fetchedAt });
  }
}

function restoreCachedTables(oldTables) {
  if (!oldTables) return;
  for (const [type, rows] of Object.entries(oldTables)) {
    if (!prices.tables[type] && Array.isArray(rows) && rows.length) prices.tables[type] = rows;
  }
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function paintPriceClock() {
  const el = document.getElementById("price-clock-time");
  const clock = document.getElementById("price-clock");
  if (clock) {
    clock.title = "poe.ninja prices load on launch, then every hour. Click to refresh now. F7 overlay uses PoE 2 trade only.";
  }
  if (!el) return;
  let text = "Check prices";
  if (prices.status === "loading") text = "Checking…";
  else if (prices.filling) {
    const total = prices.gapTotal || 0;
    const done = Math.min(prices.gapDone || 0, total);
    text = total ? `Boss prices ${done}/${total}` : "Checking listings…";
    if (tradeWaiting()) text += " · waiting";
  } else if (prices.looking.size) text = prices.looking.size ? `Listings ${prices.looking.size}…` : "Checking listings…";
  else if (prices.fetchedAt) text = (prices.cached ? "Last recorded " : "Checked ") + formatWhen(prices.fetchedAt);
  else if (prices.byName.size) text = "Last recorded";
  if (el.textContent !== text) el.textContent = text;
  maybeRefreshNinja();
}

function startPriceClock() {
  if (startPriceClock.started) return;
  startPriceClock.started = true;
  paintPriceClock();
  setInterval(paintPriceClock, 1000);
}

async function refreshPrices(force = false) {
  if (prices.status === "loading" || prices.filling) {
    if (force) showToast("Already checking poe.ninja prices.");
    return;
  }
  const league = leagueId();
  const snapshotMap = clonePriceMap(prices.byName);
  const snapshotTables = prices.tables;
  const snapshotMeta = {
    primary: prices.primary,
    exaltedPerDivine: prices.exaltedPerDivine,
    chaosPerDivine: prices.chaosPerDivine,
    league: prices.league,
    fetchedAt: prices.fetchedAt,
  };
  prices.status = "loading";
  prices.error = "";
  paintPriceClock();
  render();
  try {
    const q = encodeURIComponent(league);
    const currency = await ninjaFetch(`/poe2/api/economy/exchange/current/overview?league=${q}&type=Currency`, true);
    const exchangeTypes = NINJA_EXCHANGE.filter((type) => type !== "Currency");
    const rest = await Promise.all([
      ...exchangeTypes.map((type) =>
        ninjaFetch(`/poe2/api/economy/exchange/current/overview?league=${q}&type=${type}`, true)
          .then((data) => ({ type, data }))
          .catch(() => null)
      ),
      ...NINJA_ITEMS.map((type) =>
        ninjaFetch(`/poe2/api/economy/stash/current/item/overview?league=${q}&type=${type}`, true)
          .then((data) => ({ type, data, items: true }))
          .catch(() => null)
      ),
    ]);
    prices.byName = new Map();
    prices.tables = {};
    prices.history = {};
    bustPriceLookup();
    prices.primary = "divine";
    prices.exaltedPerDivine = 0;
    prices.chaosPerDivine = 0;
    ingestExchange(currency, "Currency");
    rest.filter(Boolean).forEach((pack) => {
      if (!pack.data) return;
      if (pack.items) ingestItems(pack.data, pack.type);
      else ingestExchange(pack.data, pack.type);
    });
    if (!prices.byName.size) throw new Error("No poe.ninja prices returned");
    restoreCachedMisses(snapshotMap);
    restoreCachedTables(snapshotTables);
    restoreCatalogPrices(snapshotMap);
    linkCatalogPrices();
    prices.league = league;
    prices.fetchedAt = Date.now();
    prices.nextAt = Date.now() + PRICE_REFRESH_MS;
    prices.cached = false;
    prices.status = "ready";
    prices.checkedEmpty = new Set();
    persistPrices();
    render();
    prefetchMissingIcons();
  } catch (err) {
    prices.error = err.message || "Could not reach poe.ninja";
    prices.nextAt = Date.now() + PRICE_RETRY_MS;
    if (snapshotMap.size && snapshotMeta.league === league) {
      prices.byName = snapshotMap;
      prices.tables = snapshotTables;
      bustPriceLookup();
      prices.primary = snapshotMeta.primary || prices.primary;
      prices.exaltedPerDivine = snapshotMeta.exaltedPerDivine || prices.exaltedPerDivine;
      prices.chaosPerDivine = snapshotMeta.chaosPerDivine || prices.chaosPerDivine;
      prices.league = snapshotMeta.league;
      if (snapshotMeta.fetchedAt) prices.fetchedAt = snapshotMeta.fetchedAt;
      prices.cached = true;
      prices.status = "ready";
      render();
    } else if (prices.byName.size) {
      prices.cached = true;
      prices.status = "ready";
      persistPricesSoon();
      render();
    } else {
      prices.status = "error";
    }
  }
  paintPriceClock();
  render();
}

function pricesHaveBeenSeeded() {
  if (prices.fetchedAt || prices.byName.size) return true;
  try {
    if (Object.values(readPriceStore().leagues || {}).some(priceStoreHasData)) return true;
    if (Object.values(readBossPriceStore().leagues || {}).some(priceStoreHasData)) return true;
    if (Object.values(catalogDiskStore.leagues || {}).some(priceStoreHasData)) return true;
  } catch {
    return false;
  }
  return false;
}

function ninjaPricesDue() {
  if (!prices.fetchedAt || !prices.byName.size) return true;
  if (prices.nextAt) return Date.now() >= prices.nextAt;
  return Date.now() - prices.fetchedAt >= PRICE_REFRESH_MS;
}

function maybeRefreshNinja() {
  if (!maybeRefreshNinja.enabled) return;
  if (!window.chrome?.webview) return;
  if (prices.status === "loading" || prices.filling) return;
  if (!ninjaPricesDue()) return;
  refreshPrices(false);
}

function kickFirstPriceCheck() {
  maybeRefreshNinja.enabled = true;
  if (!window.chrome?.webview) return;
  if (prices.status === "loading" || prices.filling) return;
  if (!prices.fetchedAt && prices.byName.size) prices.nextAt = Date.now() + PRICE_RETRY_MS;
  else if (prices.fetchedAt && !prices.nextAt) prices.nextAt = prices.fetchedAt + PRICE_REFRESH_MS;
  if (ninjaPricesDue()) refreshPrices(false);
}

function dashboardPriceNames() {
  const names = [];
  const seen = new Set();
  const add = (name) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  };
  const farm = getBoss(farmBossId());
  (farm?.uniques || []).forEach((item) => add(item.name));
  for (const log of state.logs.slice(0, 50)) {
    for (const drop of log.drops || []) add(drop.name);
  }
  return names;
}

function tradeUnit(currency) {
  const c = String(currency || "").toLowerCase();
  if (c === "divine" || c.startsWith("divine")) return "divine";
  if (c.startsWith("exalt")) return "exalted";
  if (c.startsWith("chaos")) return "chaos";
  return c;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tradeRateError(err) {
  const text = String(err?.message || err || "");
  return /rate|429|too many/i.test(text);
}

function tradeBlockedError(err) {
  return /blocked|403|401/i.test(String(err?.message || err || ""));
}

async function applyTradeRow(name, row) {
  const unit = tradeUnit(row?.currency);
  const amount = Number(row?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const divine = toDivine(amount, unit);
  rememberPrice(name, divine, row.listings || 0, "", amount, unit, "trade", true);
  if (row.name && row.name !== name) rememberPrice(row.name, divine, row.listings || 0, "", amount, unit, "trade", true);
  prices.checkedEmpty.delete(name);
  return true;
}

async function probeTradePrice(name, force = false) {
  linkCatalogPrices();
  if (!force && pricedHit(lookupPrice(name))) {
    prices.checkedEmpty.delete(name);
    return true;
  }
  if (!force) {
    const tableHit = hitFromTables(name);
    if (tableHit) {
      rememberPrice(name, tableHit.divine, tableHit.listings, tableHit.icon, tableHit.amount, tableHit.unit, tableHit.source || "ninja");
      prices.checkedEmpty.delete(name);
      persistPrices();
      return true;
    }
  }
  if (!window.chrome?.webview) return false;
  const aliases = force ? [name, canonicalName(name)].filter((alias, i, all) => alias && all.indexOf(alias) === i) : tradeAliases(name);
  for (const alias of aliases) {
    try {
      const row = await tradeFetch(alias, leagueId(), true, !force);
      if (await applyTradeRow(name, row)) {
        persistPrices();
        return true;
      }
    } catch (err) {
      if (tradeRateError(err) || tradeBlockedError(err)) throw err;
      await sleep(350);
    }
  }
  prices.checkedEmpty.add(name);
  return false;
}

function tradeAliases(name) {
  const aliases = [];
  const add = (n) => {
    if (!n || aliases.some((x) => x.toLowerCase() === n.toLowerCase())) return;
    aliases.push(n);
  };
  add(name);
  const canon = canonicalName(name);
  add(canon);
  if (!/support$/i.test(name)) add(name + " Support");
  if (/^the /i.test(name)) add(name.replace(/^the /i, ""));
  else add("The " + name);
  return aliases;
}

function hitFromTables(name) {
  const want = foldKey(name).replace(/ support$/, "");
  for (const rows of Object.values(prices.tables || {})) {
    for (const row of rows || []) {
      if (!row?.name || !pricedHit(row)) continue;
      if (foldKey(row.name).replace(/ support$/, "") === want) return row;
    }
  }
  return null;
}

async function lookupOnePrice(name) {
  if (!name || prices.looking.has(name)) return;
  prices.looking.add(name);
  paintLivePrices();
  try {
    if (!window.chrome?.webview) {
      showToast("Price checks need the desktop app.");
      return;
    }
    const found = await probeTradePrice(name);
    if (!found) showToast("No listing for " + name);
  } catch (err) {
    if (tradeRateError(err)) showToast("PoE 2 trade hit a rate limit. Wait a minute and try this item again.");
    else if (tradeBlockedError(err)) showToast("PoE 2 trade blocked this request. Wait a bit and try again.");
  } finally {
    prices.looking.delete(name);
    persistPricesSoon();
    paintLivePrices();
  }
}

async function loadLeagues() {
  try {
    const leagues = await ninjaFetch("/poe2/api/economy/leagues");
    const select = document.getElementById("league-input");
    if (!select || !Array.isArray(leagues) || !leagues.length) return;
    const ids = leagues.map((league) => league.id);
    if (!state.league || !ids.includes(state.league)) {
      state.league = leagues[0].id;
      save();
    }
    const current = leagueId();
    select.innerHTML = leagues
      .map((league) => `<option value="${esc(league.id)}" ${league.id === current ? "selected" : ""}>${esc(league.name)}</option>`)
      .join("");
  } catch {
    /* keep the hardcoded option */
  }
}

function showToast(text, actions = []) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.hidden = false;
  el.innerHTML = `<span>${esc(text)}</span>${actions
    .map(
      (action) =>
        `<button type="button" class="btn ghost" data-toast="${esc(action.id)}" data-boss="${esc(action.bossId || "")}" data-log="${esc(action.logId || "")}">${esc(action.label)}</button>`
    )
    .join("")}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 6000);
}

function clearLiveKill() {
  liveKill = { logId: null, bossId: null };
}

function liveLog() {
  if (!liveKill.logId) return null;
  const log = state.logs.find((item) => item.id === liveKill.logId);
  if (!log || log.bossId !== liveKill.bossId) {
    clearLiveKill();
    return null;
  }
  return log;
}

function mergeDrop(log, drop) {
  log.drops = log.drops || [];
  if (drop.rolls?.length) {
    log.drops.push(drop);
    return drop;
  }
  const existing = log.drops.find((item) => (item.uniqueId || item.name) === (drop.uniqueId || drop.name) && !item.rolls?.length);
  if (existing) {
    existing.qty = (existing.qty || 1) + (drop.qty || 1);
    return existing;
  }
  log.drops.push(drop);
  return drop;
}

function pushDropUndo(log, drop) {
  if (!log?.id || !drop) return;
  dropUndo.push({
    logId: log.id,
    key: drop.uniqueId || drop.name,
    qty: drop.qty || 1,
    rolls: (drop.rolls || []).length,
    name: drop.name,
  });
  if (dropUndo.length > 40) dropUndo.shift();
}

function takeDropUndo(bossId) {
  if (!dropUndo.length) return null;
  if (!bossId) return dropUndo.pop();
  for (let i = dropUndo.length - 1; i >= 0; i--) {
    const log = state.logs.find((item) => item.id === dropUndo[i].logId);
    if (log?.bossId === bossId) return dropUndo.splice(i, 1)[0];
  }
  return null;
}

function inferDropUndo(bossId) {
  const live = liveLog();
  const log =
    (live && (!bossId || live.bossId === bossId) && live.drops?.length && live) ||
    state.logs.find((item) => (!bossId || item.bossId === bossId) && item.drops?.length);
  if (!log?.drops?.length) return null;
  const last = log.drops[log.drops.length - 1];
  return { logId: log.id, key: last.uniqueId || last.name, qty: 1, rolls: 0, name: last.name };
}

function undoLastDrop(bossId) {
  const step = takeDropUndo(bossId) || inferDropUndo(bossId);
  if (!step) {
    showToast("Nothing to undo.");
    return;
  }
  const log = state.logs.find((item) => item.id === step.logId);
  if (!log) {
    showToast("Nothing to undo.");
    return;
  }
  const drop = [...(log.drops || [])].reverse().find((item) => (item.uniqueId || item.name) === step.key);
  if (!drop) {
    if (!(log.drops || []).length) deleteLog(log.id);
    else {
      save();
      render();
    }
    showToast("Nothing to undo.");
    return;
  }
  const name = drop.name || "last drop";
  drop.qty = (drop.qty || 1) - (step.qty || 1);
  if (step.rolls && drop.rolls?.length) drop.rolls = drop.rolls.slice(0, Math.max(0, drop.rolls.length - step.rolls));
  if (drop.qty <= 0) log.drops = log.drops.filter((item) => item !== drop);
  if (!(log.drops || []).length) {
    deleteLog(log.id);
    showToast("Removed " + name + ".");
    return;
  }
  save();
  render();
  showToast("Removed " + name + ".");
}

function toastKill(boss, log) {
  const names = (log.drops || []).map((drop) => drop.name + (drop.qty > 1 ? " ×" + drop.qty : "")).join(", ") || "nothing dropped";
  showToast(boss.name + " · " + names + " · " + hotkeys().next + " for Next kill", [
    { id: "undo", label: "Undo", logId: log.id },
  ]);
}

function farmLogDrop(bossId, drop) {
  const boss = getBoss(bossId);
  if (!boss || !drop) return;
  if (!drop.id) drop.id = uid();
  state.farmBossId = bossId;
  const open = liveLog();
  let log;
  let logged;
  if (open && open.bossId === bossId) {
    logged = mergeDrop(open, drop);
    log = open;
    pushDropUndo(open, drop);
  } else {
    log = {
      id: uid(),
      bossId,
      at: Date.now(),
      drops: [drop],
    };
    logged = drop;
    state.logs.unshift(log);
    liveKill = { logId: log.id, bossId };
    pushDropUndo(log, drop);
  }
  save();
  render();
  toastKill(boss, log);
  return log;
}

function finishFarmKill(fromHotkey) {
  if (!liveLog()) {
    if (fromHotkey) showToast("No open kill. Log a drop first.");
    return;
  }
  clearLiveKill();
  render();
  if (fromHotkey) showToast("Next kill.");
}

function farmPickItem(bossId, item) {
  if (!item?.name) return;
  farmLogDrop(bossId, { uniqueId: item.id || slug(item.name), name: item.name, qty: 1 });
}

function hotkeys() {
  return {
    log: state.hotkeyLog || "F8",
    next: state.hotkeyNext || "F9",
    price: state.hotkeyPrice || "F7",
  };
}

function normalizeHotkey(spec) {
  const parts = String(spec || "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/^(ctrl|control)$/i.test(part)) return "Ctrl";
      if (/^f([1-9]|1[0-2])$/i.test(part)) return part.toUpperCase();
      if (part.length === 1) return part.toUpperCase();
      if (/^space$/i.test(part)) return "Space";
      if (/^shift$/i.test(part)) return "Shift";
      if (/^alt$/i.test(part)) return "Alt";
      if (/^(win|meta)$/i.test(part)) return "Win";
      return part;
    });
  const mods = ["Ctrl", "Alt", "Shift", "Win"].filter((mod) => parts.includes(mod));
  const key = parts.find((part) => !["Ctrl", "Alt", "Shift", "Win"].includes(part));
  return key ? mods.concat(key).join("+") : "";
}

function pauseHotkeys() {
  if (!window.chrome?.webview) return;
  chrome.webview.postMessage({ type: "hotkeys-pause" });
}

function syncHotkeys() {
  if (!window.chrome?.webview) return;
  chrome.webview.postMessage({ type: "hotkeys", log: hotkeys().log, next: hotkeys().next, price: hotkeys().price });
}

function assignHotkey(slot, spec) {
  const next = normalizeHotkey(spec);
  if (!next) return false;
  if (next === "Ctrl+C") return false;
  const keys = hotkeys();
  const prev = normalizeHotkey(keys[slot]);
  if (next === prev) return true;
  for (const other of ["log", "price", "next"]) {
    if (other === slot) continue;
    if (normalizeHotkey(keys[other]) === next) keys[other] = prev;
  }
  keys[slot] = next;
  state.hotkeyLog = keys.log;
  state.hotkeyPrice = keys.price;
  state.hotkeyNext = keys.next;
  return true;
}

function formatHotkey(event) {
  if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return "";
  if (event.repeat) return "";
  const fn = /^F([1-9]|1[0-2])$/i.test(event.key);
  const parts = [];
  const leftoverCtrl = fn && event.ctrlKey && !event.altKey && !event.shiftKey;
  if (event.ctrlKey && !leftoverCtrl) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  let name = event.key;
  if (/^F\d{1,2}$/i.test(name)) name = name.toUpperCase();
  else if (name === " ") name = "Space";
  else if (name.length === 1) name = name.toUpperCase();
  parts.push(name);
  return normalizeHotkey(parts.join("+"));
}

function namesMatch(a, b) {
  if (!a || !b) return false;
  return foldKey(a) === foldKey(b) || priceKey(a) === priceKey(b) || slug(a) === slug(b);
}

function isItemJunkLine(line) {
  const t = String(line || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return true;
  if (/^you cannot use this item/i.test(t)) return true;
  if (/stats will be ignored/i.test(t)) return true;
  if (/^right click to/i.test(t)) return true;
  if (/^shift-?click/i.test(t)) return true;
  if (/^place into an item socket/i.test(t)) return true;
  return false;
}

function identityFromBlocks(blocks, rarity) {
  for (const block of blocks || []) {
    const lines = String(block || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    if (lines.some((line) => /^\{/.test(line) || /^(requirements|sockets|item level|quality)\b/i.test(line))) continue;
    if (lines.some((line) => /:\s/.test(line) && !/^[+\-\d({]/.test(line))) continue;
    const clean = lines.filter((line) => !isItemJunkLine(line) && !/^\{/.test(line));
    if (!clean.length) continue;
    if (/^(normal|magic|currency|gem|divination card)$/i.test(rarity)) return { name: clean[0], baseType: clean[0] };
    if (clean.length >= 2) return { name: clean[0], baseType: clean[1] };
    return { name: clean[0], baseType: clean[0] };
  }
  return { name: "", baseType: "" };
}

function parsePoeItem(text) {
  const raw = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!raw || (!/^Item Class:/im.test(raw) && !/^Rarity:/im.test(raw))) return null;
  const blocks = raw.split(/\n-{3,}\n/);
  const head = (blocks[0] || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  let rarity = "";
  let className = "";
  const rest = [];
  for (const line of head) {
    const itemClass = line.match(/^Item Class:\s*(.+)$/i);
    if (itemClass) {
      className = itemClass[1].trim();
      continue;
    }
    const rarityLine = line.match(/^Rarity:\s*(.+)$/i);
    if (rarityLine) {
      rarity = rarityLine[1].trim();
      continue;
    }
    rest.push(line);
  }
  const titleLines = rest.filter((line) => !isItemJunkLine(line));
  let name = titleLines[0] || "";
  let baseType = titleLines[1] || "";
  if (!name || (!baseType && /^(rare|unique)$/i.test(rarity))) {
    const extra = identityFromBlocks(blocks.slice(1), rarity);
    if (!name) name = extra.name;
    if (!baseType) baseType = extra.baseType;
  }
  if (/^(normal|magic|currency|gem|divination card)$/i.test(rarity)) baseType = name || baseType;
  if (!baseType) baseType = name;
  if (!name) return null;
  if (/unidentified/i.test(raw)) name = baseType || name;
  let qty = 1;
  const stack = raw.match(/Stack Size:\s*([\d,]+)/i);
  if (stack) qty = Math.max(1, Number(stack[1].replace(/,/g, "")) || 1);
  const corrupted = /^\s*Corrupted\s*$/im.test(raw);
  const mods = parseClipboardMods(blocks.slice(1), rarity, corrupted, name, baseType);
  const useHit = raw.match(/(\d+)\s+uses? remaining/i);
  const usesRemaining = useHit ? Math.max(0, Number(String(useHit[1]).replace(/,/g, "")) || 0) : 0;
  const runeMods = mods.filter((mod) => canonicalRollKind(mod.kind) === "rune").length;
  let runeSockets = 0;
  const sock = raw.match(/^Sockets:\s*(.+)$/im);
  if (sock) runeSockets = (sock[1].match(/S/gi) || []).length;
  runeSockets = Math.max(runeSockets, runeMods);
  return { name, baseType, rarity, className, qty, corrupted, mods, usesRemaining, runeSockets };
}

function canonicalRollKind(kind) {
  const k = String(kind || "").toLowerCase();
  if (k === "implicit" || k === "enchant" || k === "rune") return k;
  return "explicit";
}

function isBaseModKind(kind) {
  return canonicalRollKind(kind) !== "explicit";
}

function rollSlot(roll) {
  const s = String(roll && typeof roll === "object" ? roll.slot : "").toLowerCase();
  return s === "prefix" || s === "suffix" ? s : "";
}

function parseModInfoLine(rawLine) {
  const inner = String(rawLine || "")
    .replace(/^\{|\}$/g, "")
    .trim();
  if (/\b(rune|augment)\b/i.test(inner)) return { kind: "rune", slot: "" };
  if (/enchant/i.test(inner)) return { kind: "enchant", slot: "" };
  if (/\bimplicit\b/i.test(inner)) return { kind: "implicit", slot: "" };
  if (/\bprefix\b/i.test(inner)) return { kind: "explicit", slot: "prefix" };
  if (/\bsuffix\b/i.test(inner)) return { kind: "explicit", slot: "suffix" };
  if (/explicit/i.test(inner)) return { kind: "explicit", slot: "" };
  return { kind: "explicit", slot: "" };
}

function kindFromLineTag(rawLine) {
  if (/\((?:added )?(?:rune|augment)\)/i.test(rawLine)) return "rune";
  if (/\(enchant\)/i.test(rawLine)) return "enchant";
  if (/\(implicit\)/i.test(rawLine)) return "implicit";
  return "";
}

function parseClipboardMods(blocks, rarity, corrupted, itemName = "", itemBase = "") {
  if (/^(currency|gem|divination card)$/i.test(rarity)) return [];
  let sectionKind = "explicit";
  let sectionSlot = "";
  const groups = [];
  for (const block of blocks || []) {
    const collected = [];
    for (const line of String(block || "").split("\n")) {
      const rawLine = line.trim();
      if (!rawLine) continue;
      if (isItemJunkLine(rawLine)) continue;
      if (itemName && namesMatch(rawLine, itemName)) continue;
      if (itemBase && namesMatch(rawLine, itemBase)) continue;
      if (/^\{/.test(rawLine)) {
        const info = parseModInfoLine(rawLine);
        sectionKind = info.kind;
        sectionSlot = info.slot;
        continue;
      }
      if (/^(requirements|sockets|item level|quality|armour|evasion rating|energy shield|ward|stack size|level:|str:|dex:|int:|note:)/i.test(rawLine)) continue;
      if (/^(unidentified|corrupted|mirrored|split|fractured item|synthesised item)$/i.test(rawLine)) continue;
      if (/:\s/.test(rawLine) && !/^[+\-\d({]/.test(rawLine)) continue;
      if (rawLine.length > 140) continue;
      const tagged = kindFromLineTag(rawLine);
      const kind = tagged || sectionKind;
      collected.push({ text: parseAffixStrings(rawLine), kind, slot: tagged ? "" : sectionSlot });
    }
    if (collected.length) {
      groups.push(collected);
      sectionKind = "explicit";
      sectionSlot = "";
    }
  }
  const tagged = groups.some((group) => group.some((mod) => isBaseModKind(mod.kind) || rollSlot(mod)));
  const modGroups = groups.filter((group) => group.some((mod) => isUsefulRoll(mod.text, mod.kind) || /[\d%+]/.test(mod.text)));
  if (!tagged && modGroups.length >= 2) {
    const last = modGroups[modGroups.length - 1];
    for (const group of modGroups) {
      if (group === last) continue;
      if (!corrupted && group !== modGroups[0]) continue;
      for (const mod of group) mod.kind = "implicit";
    }
  }
  return cleanClipboardRolls(groups.flat());
}

function parseAffixStrings(text) {
  return String(text || "").replace(/\[([^\]|]+)\|?([^\]]*)\]/g, (_, a, b) => b || a);
}

function stripAdvancedRanges(text) {
  return String(text || "")
    .replace(/(-?\d+(?:\.\d+)?)\((?:[^)]*)\)/g, "$1")
    .replace(/\(([-+]?\d[\d.\s,|/~—–-]*[-+]?\d)\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulRoll(text, kind) {
  const t = stripAdvancedRanges(parseAffixStrings(String(text || ""))).trim();
  if (!t || t.length > 140) return false;
  if (/^you cannot use this item/i.test(t)) return false;
  if (/stats will be ignored/i.test(t)) return false;
  if (/^place into an item socket/i.test(t)) return false;
  if (/^used when you/i.test(t)) return false;
  if (/^right click/i.test(t)) return false;
  if (/^this item can be anointed/i.test(t)) return false;
  if (/^can have up to/i.test(t)) return false;
  if (/^\d+\s+uses? remaining$/i.test(t)) return false;
  if (/^\{/.test(t)) return false;
  if (!isBaseModKind(kind)) {
    if (/^has\b.*\b(charm slot|socketable)/i.test(t)) return false;
    if (/socketable/i.test(t) && !/per socket/i.test(t)) return false;
    if (/flask recovery applied instantly/i.test(t)) return false;
    if (/^grants skill/i.test(t)) return false;
  }
  if (/[\d%+]/.test(t) || /^allocates /i.test(t) || /^grants skill/i.test(t)) return true;
  if (/^has\b.*\b(charm slot|socketable)/i.test(t)) return true;
  if (isBaseModKind(kind) && t.length >= 8 && !/[.!?]$/.test(t)) return true;
  return false;
}

function cleanClipboardRolls(mods) {
  const out = [];
  const seen = new Set();
  for (const mod of mods || []) {
    const kind = canonicalRollKind(mod && typeof mod === "object" ? mod.kind : "");
    const slot = rollSlot(mod);
    const text = stripAdvancedRanges(
      parseAffixStrings(rollLineText(mod) || String(mod || ""))
        .replace(/\s*\((?:augmented|unmet|implicit|enchant|rune)\)/gi, "")
        .replace(/\s+/g, " ")
        .trim()
    );
    if (!isUsefulRoll(text, kind)) continue;
    const key = kind + ":" + slot + ":" + text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, kind, slot, pick: false });
    if (out.length >= 12) break;
  }
  return out;
}

function shortRoll(text) {
  return stripAdvancedRanges(String(text || ""))
    .replace(/\s*\((?:augmented|unmet|implicit|enchant|rune)\)/gi, "")
    .replace(/\bmaximum /gi, "")
    .replace(/\bto Fire Resistance/gi, " Fire Res")
    .replace(/\bto Cold Resistance/gi, " Cold Res")
    .replace(/\bto Lightning Resistance/gi, " Lightning Res")
    .replace(/\bto Chaos Resistance/gi, " Chaos Res")
    .replace(/\bto all Elemental Resistances/gi, " all Res")
    .replace(/\ball Elemental Resistances/gi, " all Res")
    .replace(/\bto Spirit/gi, " Spirit")
    .replace(/\bto Strength/gi, " Str")
    .replace(/\bto Dexterity/gi, " Dex")
    .replace(/\bto Intelligence/gi, " Int")
    .replace(/\bto all Attributes/gi, " all Attr")
    .replace(/\bto Accuracy Rating/gi, " Acc")
    .replace(/\bto Life/gi, " Life")
    .replace(/\bto Mana/gi, " Mana")
    .replace(/\bincreased /gi, "")
    .replace(/\badditional /gi, "")
    .replace(/\bGlobal Armour, Evasion and Energy Shield/gi, " defences")
    .replace(/\bEnergy Shield/gi, " ES")
    .replace(/\bEvasion Rating/gi, " Evasion")
    .replace(/\bStun Threshold/gi, " Stun")
    .replace(/\bLife Regeneration per second/gi, " Life regen")
    .replace(/\sper Socket filled/gi, "/sock")
    .replace(/\sper Socketed Item/gi, "/sock")
    .replace(/\sper Socket/gi, "/sock")
    .replace(/\s+/g, " ")
    .trim();
}

function rollLineText(roll) {
  return typeof roll === "string" ? roll : roll?.text || "";
}

function normalizeRolls(rolls) {
  const out = [];
  const seen = new Set();
  for (const roll of rolls || []) {
    const kind = canonicalRollKind(roll && typeof roll === "object" ? roll.kind : "");
    const slot = rollSlot(roll);
    const text = stripAdvancedRanges(parseAffixStrings(rollLineText(roll)));
    if (!isUsefulRoll(text, kind)) continue;
    const key = kind + ":" + slot + ":" + text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, kind, slot, pick: !!(roll && typeof roll === "object" && roll.pick) });
    if (out.length >= 12) break;
  }
  return out;
}

function tabletUsesText(drop) {
  const uses = Number(drop?.usesRemaining);
  if (!(uses > 0)) return "";
  return uses === 1 ? "1 use remaining" : uses + " uses remaining";
}

function isTabletUsesRoll(text) {
  return /^\d+\s+uses? remaining$/i.test(String(text || "").trim());
}

function withTabletUsesRoll(drop, rolls) {
  const text = tabletUsesText(drop);
  if (!text) return rolls;
  if (rolls.some((roll) => isTabletUsesRoll(roll.text))) {
    return rolls.map((roll) => (isTabletUsesRoll(roll.text) ? { ...roll, pick: !!drop.pickUses, kind: "implicit" } : roll));
  }
  const row = { text, kind: "implicit", pick: !!drop.pickUses };
  const list = rolls.slice();
  let at = -1;
  for (let i = 0; i < list.length; i++) {
    if (/^adds .+\s+to a map$/i.test(list[i].text)) at = i + 1;
    else if (at < 0 && list[i].kind === "implicit") at = i + 1;
  }
  if (at < 0) list.unshift(row);
  else list.splice(at, 0, row);
  return list;
}

function pickedRolls(drop) {
  const rolls = withTabletUsesRoll(drop, normalizeRolls(drop?.rolls)).filter((roll) => roll.pick);
  return rolls;
}

function inspectRolls(drop) {
  const rolls = normalizeRolls(drop?.rolls);
  let list = rolls;
  if (!rolls.some((roll) => canonicalRollKind(roll.kind) === "implicit")) {
    const seen = new Set(rolls.map((roll) => roll.text.toLowerCase()));
    const extras = [];
    for (const line of lookupLore(drop?.name)?.implicits || []) {
      const text = parseAffixStrings(line)
        .replace(/\s*\((?:augmented|unmet|implicit|enchant|rune)\)/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!isUsefulRoll(text, "implicit") || seen.has(text.toLowerCase())) continue;
      seen.add(text.toLowerCase());
      extras.push({ text, kind: "implicit", pick: false, ghost: true });
    }
    list = extras.concat(rolls);
  }
  return withTabletUsesRoll(drop, list);
}

function overlayLogDrop(logId, dropId) {
  const target = inspectTarget();
  const log =
    (logId && state.logs.find((item) => item.id === logId)) ||
    target?.log ||
    liveLog() ||
    (target ? { id: target.log?.id || "", drops: [target.drop] } : null);
  const drop =
    (dropId && (log?.drops || []).find((item) => item.id === dropId)) ||
    (dropId && target?.drop?.id === dropId ? target.drop : null) ||
    target?.drop ||
    null;
  return { log, drop };
}

function inspectTarget() {
  if (!ui.inspect?.dropId) return null;
  const held = ui.inspect.drop;
  if (held?.id === ui.inspect.dropId) {
    const log = state.logs.find((item) => item.id === ui.inspect.logId) || ui.inspect.log || { id: ui.inspect.logId || "", drops: [held] };
    const drop = (log.drops || []).find((item) => item.id === ui.inspect.dropId) || held;
    return { log, drop };
  }
  const log = state.logs.find((item) => item.id === ui.inspect.logId);
  const drop = (log?.drops || []).find((item) => item.id === ui.inspect.dropId);
  if (!log || !drop) return null;
  return { log, drop };
}

function openInspect(log, drop) {
  if (!drop) return;
  if (!drop.id) drop.id = uid();
  ui.inspect = { logId: log?.id || "", dropId: drop.id, log, drop };
  ui.dashRollId = drop.id;
  hideItemTip();
  paintPriceOverlay(false, true);
}

function handleOverlayClick(msg) {
  if (!msg) return;
  if (msg.closeInspect != null) {
    closeInspect();
    return;
  }
  if (msg.pickCorrupt) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickCorrupt);
    if (!drop) return;
    drop.corrupted = !drop.corrupted;
    drop.quoteTried = false;
    delete drop.quote;
    if (log?.id) save();
    paintPriceOverlay();
    return;
  }
  if (msg.pickRunes != null) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    setDropRunePick(log, drop, msg.pickRunes);
    return;
  }
  if (msg.pickText) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    toggleInspectRoll(log, drop, msg.pickText, msg.pickKind);
    return;
  }
  if (msg.quoteDrop) {
    const { log, drop } = overlayLogDrop(msg.quoteLog, msg.quoteDrop);
    if (!drop) return;
    delete drop.quoting;
    drop.quoteTried = false;
    quoteRolledDrop(log, drop, true);
    return;
  }
  if (msg.openTrade) {
    if (window.chrome?.webview) chrome.webview.postMessage({ type: "open-url", url: msg.openTrade });
    else window.open(msg.openTrade, "_blank", "noopener");
    return;
  }
  if (msg.priceLookup) lookupOnePrice(msg.priceLookup);
}

function closeInspect() {
  ui.inspect = null;
  ui.dashRollId = null;
  paintPriceOverlay();
}

function overlayThemeVars() {
  const cs = getComputedStyle(document.documentElement);
  return [
    "--bg",
    "--panel",
    "--panel-2",
    "--ink",
    "--gold",
    "--gold-2",
    "--line",
    "--line-strong",
    "--muted",
    "--unique",
    "--unique-2",
    "--font-display",
    "--shadow",
  ]
    .map((key) => key + ":" + cs.getPropertyValue(key).trim())
    .join(";");
}

function pushNativeOverlay(html, notice, fresh) {
  if (!window.chrome?.webview) return false;
  if (notice) {
    chrome.webview.postMessage({ type: "overlay-notice", text: notice, vars: overlayThemeVars() });
    return true;
  }
  if (!html) {
    chrome.webview.postMessage({ type: "overlay-hide" });
    return true;
  }
  chrome.webview.postMessage({ type: "overlay-show", html, vars: overlayThemeVars(), fresh: !!fresh });
  return true;
}

function overlayNotice(text) {
  showToast(text);
  pushNativeOverlay("", text);
}

function openHttps(url) {
  if (window.chrome?.webview) chrome.webview.postMessage({ type: "open-url", url });
  else window.open(url, "_blank", "noopener");
}

function focusFeedback() {
  const el = document.getElementById("feedback-title");
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.focus();
}

function feedbackNote(form) {
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  const details = String(data.get("body") || "").trim().slice(0, 1500);
  if (!title) {
    document.getElementById("feedback-title")?.focus();
    return null;
  }
  const body = [details || "(no details)", "", "---", "App: Still Sane, Exile? " + APP_VERSION, "League: " + leagueId(), "Page: " + (ui.view || "")].join("\n");
  return { title, body, text: title + "\n\n" + body };
}

function copyFeedbackText(text) {
  if (window.chrome?.webview) chrome.webview.postMessage({ type: "copy-text", text });
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
}

function submitFeedback(form, via = "send") {
  const note = feedbackNote(form);
  if (!note) return;
  if (via === "github") {
    openHttps(FEEDBACK_ISSUE_URL + "?title=" + encodeURIComponent(note.title) + "&body=" + encodeURIComponent(note.body));
    showToast("Opened GitHub. You can also send from this PC with Send.");
    return;
  }
  if (via === "copy") {
    copyFeedbackText(note.text);
    showToast("Copied.");
    return;
  }
  if (!window.chrome?.webview) {
    copyFeedbackText(note.text);
    showToast("Desktop app needed to send. Copied instead.");
    return;
  }
  webviewJson(
    {
      type: "feedback-send",
      title: note.title,
      body: note.body,
      version: APP_VERSION,
      league: leagueId(),
      page: ui.view || "",
    },
    8000,
    "send timed out"
  )
    .then(() => {
      form.reset();
      showToast("Sent.");
    })
    .catch(() => {
      copyFeedbackText(note.text);
      showToast("Could not send. Copied instead.");
    });
}

function rollKindLabel(roll) {
  if (roll?.ghost) return "Typical";
  const kind = canonicalRollKind(roll?.kind);
  if (kind === "implicit") return "Implicit";
  if (kind === "enchant") return "Enchant";
  if (kind === "rune") return "Rune";
  const slot = rollSlot(roll);
  if (slot === "prefix") return "Prefix";
  if (slot === "suffix") return "Suffix";
  return "";
}

function rollKindClass(roll) {
  const kind = canonicalRollKind(roll?.kind);
  if (kind === "implicit") return " is-implicit";
  if (kind === "enchant") return " is-enchant";
  if (kind === "rune") return " is-rune";
  const slot = rollSlot(roll);
  if (slot === "prefix") return " is-prefix";
  if (slot === "suffix") return " is-suffix";
  return "";
}

function canHaveRunes(drop) {
  if (/currency|gem|divination/i.test(drop?.rarity || "")) return false;
  if (/currency|gem|divination/i.test(drop?.className || "")) return false;
  return true;
}

function setDropRunePick(log, drop, value) {
  if (!drop) return;
  if (value == null || value === "" || value === "any") drop.pickRunes = null;
  else drop.pickRunes = Math.max(0, Math.min(3, Number(value) || 0));
  drop.quoteTried = false;
  delete drop.quote;
  if (log?.id) save();
  if (ui.inspect) paintPriceOverlay();
  else render();
}

function overlayRuneHtml(log, drop) {
  if (!canHaveRunes(drop)) return "";
  const selected = Number.isInteger(drop.pickRunes) ? drop.pickRunes : null;
  const chips = ["any", 0, 1, 2, 3]
    .map((n) => {
      const on = n === "any" ? (selected == null ? " is-on" : "") : selected === n ? " is-on" : "";
      const label = n === "any" ? "Any" : String(n);
      return `<button type="button" class="price-overlay-flag${on}" data-pick-runes="${n}" data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}">${label}</button>`;
    })
    .join("");
  return `<div class="price-overlay-rune"><span>Runes</span>${chips}</div>`;
}

function overlayQuoteHtml(drop, logId) {
  if (drop?.quoting) return `<span class="price-overlay-status">Checking trade…</span>`;
  const quote = drop?.quote;
  const n = pickedRolls(drop).length;
  if (quote && !quote.error) {
    const listed = quote.listings ? quote.listings.toLocaleString() + " listings" : "trade";
    if (pricedHit(quote) && Number(quote.amount) > 0) {
      const label = quote.unit && Number.isFinite(quote.amount) ? formatAmount(quote.amount, quote.unit) : formatDivine(quote.divine);
      const currency = currencyForAmount(quote.divine);
      const inner = `${itemIconHtml(currency)}${esc(label)} · ${esc(listed)}`;
      if (quote.url) return `<button type="button" class="btn gold" data-open-trade="${esc(quote.url)}" title="${esc(listed)}">${inner}</button>`;
      return `<span class="btn gold">${inner}</span>`;
    }
    if (quote.url) {
      return `<button type="button" class="btn ghost" data-open-trade="${esc(quote.url)}">${n ? "No listing with these mods" : "No listings"}</button>`;
    }
  }
  const err = quote?.error ? ` · ${quote.error}` : "";
  const label = n ? "Check this roll" : "Check trade";
  return `<button type="button" class="btn gold" data-quote-drop="${esc(drop.id || "")}" data-quote-log="${esc(logId || "")}">${esc(label)}${esc(err)}</button>`;
}

function priceOverlayHtml(log, drop) {
  const rolls = inspectRolls(drop);
  const implicits = rolls.filter((roll) => canonicalRollKind(roll.kind) === "implicit");
  const runes = rolls.filter((roll) => {
    const kind = canonicalRollKind(roll.kind);
    return kind === "rune" || kind === "enchant";
  });
  const explicits = rolls.filter((roll) => canonicalRollKind(roll.kind) === "explicit");
  function modButtons(list) {
    return list
      .map((roll) => {
        const on = roll.pick ? " is-on" : "";
        const kind = rollKindClass(roll);
        const ghost = roll.ghost ? " is-ghost" : "";
        const tag = rollKindLabel(roll);
        const hint = roll.ghost ? "Typical implicit · F8 this item to capture the real roll · " : tag ? tag + " · " : "";
        const label = tag ? `<span class="price-overlay-tag">${esc(tag)}</span>` : "";
        return `<button type="button" class="price-overlay-mod${on}${kind}${ghost}" data-pick-text="${esc(roll.text)}" data-pick-kind="${esc(canonicalRollKind(roll.kind))}" data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}" title="${esc(hint + roll.text)}">${label}${esc(roll.text)}</button>`;
      })
      .join("");
  }
  function section(list, before) {
    if (!list.length) return "";
    return `${before ? `<div class="price-overlay-rule"></div>` : ""}<div class="price-overlay-mods">${modButtons(list)}</div>`;
  }
  const flags =
    typeof drop.corrupted === "boolean"
      ? `<div class="price-overlay-flags"><button type="button" class="price-overlay-flag${drop.corrupted ? " is-on" : ""}" data-pick-corrupt="${esc(drop.id)}" data-pick-log="${esc(log.id)}">${drop.corrupted ? "Corrupted" : "Not corrupted"}</button></div>`
      : "";
  const kindClass = String(drop.rarity || "unique").toLowerCase().replace(/\s+/g, "-") || "unique";
  return `
    <article class="price-overlay-card item-tip-card ${esc(kindClass)}">
      <button type="button" class="price-overlay-x" data-close-inspect aria-label="Close">×</button>
      <div class="item-tip-head">
        ${itemIconHtml(drop.name, "lg")}
        <div>
          <div class="item-tip-name">${esc(drop.name)}</div>
          <div class="item-tip-base">${esc(drop.baseType || "")}</div>
        </div>
      </div>
      ${flags}
      ${overlayRuneHtml(log, drop)}
      ${section(implicits, false)}
      ${section(runes, implicits.length)}
      ${section(explicits, implicits.length || runes.length)}
      <div class="price-overlay-foot">
        <div class="price-overlay-row"><span>PoE 2 trade</span>${overlayQuoteHtml(drop, log.id)}</div>
      </div>
    </article>`;
}

function paintPriceOverlay(forceInApp = false, fresh = false) {
  const root = document.getElementById("price-overlay");
  const target = inspectTarget();
  const html = target ? priceOverlayHtml(target.log, target.drop) : "";
  if (!forceInApp && pushNativeOverlay(html, "", fresh)) {
    if (root) {
      root.hidden = true;
      root.innerHTML = "";
    }
    return;
  }
  if (!root) return;
  if (!target) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }
  root.hidden = false;
  root.innerHTML = `<div class="price-overlay-back" data-close-inspect></div>${html}`;
}

function toggleInspectRoll(log, drop, text, kind) {
  if (!drop) return;
  const want = String(text || "").trim();
  if (isTabletUsesRoll(want)) {
    drop.pickUses = !drop.pickUses;
    drop.quoteTried = false;
    delete drop.quote;
    if (log?.id) save();
    paintPriceOverlay();
    return;
  }
  drop.rolls = normalizeRolls(drop.rolls);
  const as = canonicalRollKind(kind);
  let row = drop.rolls.find((roll) => canonicalRollKind(roll.kind) === as && String(roll.text).toLowerCase() === want.toLowerCase());
  if (!row) row = drop.rolls.find((roll) => String(roll.text).toLowerCase() === want.toLowerCase());
  if (!row) {
    row = { text: want, kind: as, slot: "", pick: false };
    if (as !== "explicit") drop.rolls.unshift(row);
    else drop.rolls.push(row);
  }
  row.pick = !row.pick;
  drop.quoteTried = false;
  delete drop.quote;
  if (log?.id) save();
  paintPriceOverlay();
}

function rollChipsHtml(drop, logId) {
  const rolls = normalizeRolls(drop?.rolls || (Array.isArray(drop) ? drop : []));
  const dropId = drop?.id || "";
  const canPick = dropId && logId;
  const showFlag = drop && !Array.isArray(drop) && typeof drop.corrupted === "boolean";
  const flag = showFlag
    ? canPick
      ? `<button type="button" class="roll-chip is-flag${drop.corrupted ? " is-on" : ""}" data-pick-corrupt="${esc(dropId)}" data-pick-log="${esc(logId)}" title="${drop.corrupted ? "Searching corrupted" : "Searching not corrupted"}">${drop.corrupted ? "Corrupted" : "Not corrupted"}</button>`
      : drop.corrupted
        ? `<span class="roll-chip is-flag is-on">Corrupted</span>`
        : `<span class="roll-chip is-flag">Not corrupted</span>`
    : "";
  if (!rolls.length && !flag) return "";
  return `<div class="roll-chips">${flag}${rolls
    .map((roll, i) => {
      const label = shortRoll(roll.text);
      if (!label) return "";
      const kind = rollKindClass(roll);
      const tag = rollKindLabel(roll);
      const title = (tag ? tag + " · " : "") + roll.text;
      if (!canPick) return `<span class="roll-chip${kind}" title="${esc(title)}">${esc(label)}</span>`;
      return `<button type="button" class="roll-chip${roll.pick ? " is-on" : ""}${kind}" data-pick-roll="${i}" data-pick-drop="${esc(dropId)}" data-pick-log="${esc(logId)}" title="${esc(title)}">${esc(label)}</button>`;
    })
    .join("")}</div>`;
}

function findLoggedDrop(logId, dropId) {
  if (!logId || !dropId) return null;
  const log = state.logs.find((item) => item.id === logId);
  return (log?.drops || []).find((item) => item.id === dropId) || null;
}

function tradeWaiting() {
  return Number.isFinite(tradeRate.readyAt) && tradeRate.readyAt > Date.now();
}

async function quoteRolledDrop(log, drop, force = false) {
  if (!window.chrome?.webview) return;
  if (!drop.id) drop.id = uid();
  drop.rolls = normalizeRolls(drop.rolls);
  const picked = pickedRolls(drop);
  if (!inspectTarget()) openInspect(log, drop);
  if (drop.quoting) return;
  if (!force && drop.quoteTried) return;
  if (tradeWaiting() && tradeRate.limited) {
    drop.quote = Object.assign({}, drop.quote, {
      listings: drop.quote?.listings || 0,
      league: drop.quote?.league || leagueId(),
      at: Date.now(),
      error: "rate limited",
    });
    paintPriceOverlay();
    return;
  }
  drop.quoting = true;
  drop.quoteTried = true;
  paintPriceOverlay();
  const league = leagueId();
  try {
    const typeLine = drop.baseType && drop.baseType !== drop.name ? drop.baseType : "";
    const index = await ensureTradeStats();
    const pickedMods = picked.filter((roll) => !isTabletUsesRoll(roll.text));
    const mappedMods = mapRollsToTradeFilters(pickedMods, index, true);
    const filters = mergeTabletUseFilter(drop, index, mappedMods);
    if (pickedMods.length && mappedMods.length < pickedMods.length) {
      const skipped = pickedMods.length - mappedMods.length;
      showToast(filters.length ? skipped + " mod" + (skipped === 1 ? "" : "s") + " aren't on trade — checking the rest." : "Trade has no filter for those mods. Searching the item instead.");
    }
    const rolls = picked.map((roll) => roll.text);
    const extra = {
      typeLine,
      rarity: drop.rarity || "",
      rolls,
      filters,
    };
    if (typeof drop.corrupted === "boolean") extra.corrupted = drop.corrupted;
    if (Number.isInteger(drop.pickRunes)) extra.runeSockets = drop.pickRunes;
    const row = await tradeFetch(drop.name, league, !!force, false, extra);
    const target = findLoggedDrop(log?.id, drop.id) || drop;
    const unit = tradeUnit(row?.currency);
    const amount = Number(row?.amount);
    const priced = Number.isFinite(amount) && amount > 0;
    target.quote = {
      amount: priced ? amount : null,
      unit,
      listings: row.listings || 0,
      divine: priced ? toDivine(amount, unit) : null,
      url: row.url || "",
      league: row.league || league,
      mapped: row.mapped || 0,
      at: Date.now(),
    };
  } catch (err) {
    const target = findLoggedDrop(log?.id, drop.id) || drop;
    const raw = String(err?.message || err || "");
    const error = /element of type|target element has type|json/i.test(raw) ? "trade search failed" : raw;
    target.quote = target.quote || { listings: 0, league, at: Date.now(), error };
    if (/rate limited/i.test(raw)) target.quoteTried = false;
  } finally {
    const target = findLoggedDrop(log?.id, drop.id) || drop;
    delete target.quoting;
    save();
    paintPriceOverlay();
    paintLivePrices();
  }
}

function catalogOwners(name) {
  if (!name) return [];
  const id = slug(name);
  const canon = canonicalName(name);
  const canonId = slug(canon);
  const hits = [];
  for (const boss of allBosses()) {
    const item = (boss.uniques || []).find(
      (row) =>
        row.id === id ||
        row.id === canonId ||
        namesMatch(row.name, name) ||
        namesMatch(row.name, canon)
    );
    if (item) hits.push({ boss, item });
  }
  return hits;
}

function isClipboardCurrency(parsed) {
  return /currency/i.test(parsed?.rarity || "") || /currency/i.test(parsed?.className || "");
}

function matchClipboardDrop(parsed) {
  const candidates = [parsed.name, parsed.baseType, canonicalName(parsed.name), canonicalName(parsed.baseType)].filter(Boolean);
  const owners = [];
  const seen = new Set();
  for (const n of candidates) {
    for (const hit of catalogOwners(n)) {
      const key = hit.boss.id + ":" + hit.item.id;
      if (seen.has(key)) continue;
      seen.add(key);
      owners.push(hit);
    }
  }
  if (owners.length) {
    const live = liveLog();
    return (live && owners.find((hit) => hit.boss.id === live.bossId)) || owners[0];
  }
  if (isClipboardCurrency(parsed)) {
    return { boss: getBoss(farmBossId()), item: { id: slug(parsed.name), name: parsed.name } };
  }
  return null;
}

function ingestClipboardItem(text, mode) {
  const parsed = parsePoeItem(text);
  if (!parsed?.name) {
    const hint = mode === "price" ? hotkeys().price : hotkeys().log;
    if (mode === "price") overlayNotice("No PoE item on the cursor. Hover it and press " + hint + ".");
    else showToast("No PoE item on the clipboard. Hover it in-game and press " + hint + ".");
    return;
  }
  if (/^Unidentified$/im.test(text)) {
    if (mode === "price") overlayNotice("Identify it first, then press " + hotkeys().price + ".");
    else showToast("Identify it first, then press " + hotkeys().log + ".");
    return;
  }
  if (mode === "price") {
    const drop = {
      id: uid(),
      uniqueId: slug(parsed.name),
      name: parsed.name,
      qty: parsed.qty || 1,
      baseType: parsed.baseType || "",
      rarity: parsed.rarity || "",
      className: parsed.className || "",
      corrupted: !!parsed.corrupted,
    };
    if (parsed.usesRemaining > 0) drop.usesRemaining = parsed.usesRemaining;
    if (parsed.runeSockets > 0) {
      drop.runeSockets = parsed.runeSockets;
      drop.pickRunes = parsed.runeSockets;
    }
    if (!isClipboardCurrency(parsed) && parsed.mods?.length) drop.rolls = parsed.mods.slice(0, 12);
    openInspect({ id: "", drops: [drop] }, drop);
    return;
  }
  const matched = matchClipboardDrop(parsed);
  if (!matched) {
    showToast("Skipped " + parsed.name + " — boss uniques and currency only.");
    return;
  }
  const entry = {
    uniqueId: matched.item?.id || slug(parsed.name),
    name: matched.item?.name || parsed.name,
    qty: parsed.qty || 1,
    baseType: parsed.baseType || "",
    rarity: parsed.rarity || "",
    corrupted: !!parsed.corrupted,
  };
  if (parsed.usesRemaining > 0) entry.usesRemaining = parsed.usesRemaining;
  if (parsed.runeSockets > 0) {
    entry.runeSockets = parsed.runeSockets;
    entry.pickRunes = parsed.runeSockets;
  }
  if (!isClipboardCurrency(parsed) && parsed.mods?.length) entry.rolls = parsed.mods.slice(0, 12);
  farmLogDrop(matched.boss?.id || farmBossId(), entry);
}

function handleAppHotkey(msg) {
  if (msg?.action === "next-kill") {
    finishFarmKill(true);
    return;
  }
  if (msg?.action === "log-item") ingestClipboardItem(msg.text || "", "log");
  if (msg?.action === "price-item") ingestClipboardItem(msg.text || "", "price");
}

function farmBossId() {
  return state.farmBossId || state.logs[0]?.bossId || allBosses()[0]?.id || "";
}

function sessionLogs() {
  return state.logs.filter((log) => log.at >= sessionStarted);
}

function renderDash() {
  const farmId = farmBossId();
  const farm = getBoss(farmId);
  const kills = killCount(farmId);
  const counts = dropCounts(farmId);
  const hits = dropHits(farmId);
  const live = liveLog();
  const liveForFarm = live && live.bossId === farmId ? live : null;
  const topBosses = allBosses()
    .map((boss) => ({ boss, kills: killCount(boss.id), value: totalLootValue(logsFor(boss.id)) }))
    .filter((row) => row.kills)
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 6);
  const maxKills = topBosses[0]?.kills || 1;
  const tally = new Map();
  for (const log of state.logs) {
    for (const drop of log.drops || []) {
      const key = drop.name;
      const prev = tally.get(key) || { name: key, qty: 0, divine: 0 };
      prev.qty += drop.qty || 1;
      prev.divine += dropValue(drop);
      tally.set(key, prev);
    }
  }
  const topLoot = [...tally.values()].sort((a, b) => b.divine - a.divine || b.qty - a.qty).slice(0, 8);
  const ninjaNote =
    prices.status === "ready"
      ? `Prices · ${esc(prices.league)} · ${itemIconHtml(currencyNameForUnit(convertMain()), "xs")}1${unitShort(convertMain())} = ${
          itemIconHtml(currencyNameForUnit(nextConvertUnit(convertMain(), 1)), "xs")
        }${esc(
          formatAmount(
            amountFromDivine(amountInDivine(1, convertMain()), nextConvertUnit(convertMain(), 1)),
            nextConvertUnit(convertMain(), 1)
          )
        )} · ${
          prices.cached ? "last recorded " : ""
        }${esc(formatWhen(prices.fetchedAt))}`
      : prices.status === "loading" && prices.byName.size
        ? "Updating last recorded prices…"
        : prices.status === "loading"
          ? "Loading prices…"
          : prices.status === "error"
            ? `Prices unavailable${prices.error ? " — " + prices.error : ""}`
            : prices.byName.size
              ? "Last recorded prices"
              : "Fetching prices…";
  const recent = state.logs.slice(0, 8);
  const onKill = new Set((liveForFarm?.drops || []).map((drop) => drop.uniqueId || drop.name));
  const dropTiles = (farm?.uniques || [])
    .map((item) => {
      const qty = counts[item.id] || 0;
      return `<button class="drop-tile${onKill.has(item.id) ? " is-on-kill" : ""}" data-farm-drop="${esc(item.id)}" ${itemHoverAttr(item.name)} type="button">
        ${itemIconHtml(item.name, "lg")}
        <span class="drop-copy">
          <span class="unique-name">${esc(item.name)}</span>
          <span class="drop-meta">${qty} · ${esc(formatPct(hits[item.id] || 0, kills))} ${priceChip(item.name)}</span>
        </span>
      </button>`;
    })
    .join("");
  return `
    <section class="dash">
      <article class="farm-pad">
        <div class="farm-art" aria-hidden="true">${bossArtHtml(farm, "farm-art-img")}</div>
        <div class="farm-head">
          ${bossArtHtml(farm, "farm-portrait")}
          <div>
            <h2>${esc(farm?.name || "Pick a boss")}</h2>
            <p class="muted">${esc(farm?.area || "")} · ${kills} kills · loot ${esc(formatPct(lootHit(farmId), kills))}</p>
          </div>
          <label class="league-field">
            <span>Boss</span>
            <select id="farm-boss">${allBosses()
              .map((boss) => `<option value="${esc(boss.id)}" ${boss.id === farmId ? "selected" : ""}>${esc(boss.name)}</option>`)
              .join("")}</select>
          </label>
        </div>
        ${
          liveForFarm && (liveForFarm.drops || []).length
            ? `<div class="live-kill">
                <div>
                  <div class="muted">This kill</div>
                  ${dropPills(liveForFarm.drops, liveForFarm.id)}
                </div>
                <button class="btn gold" data-farm-next type="button">Next kill</button>
              </div>`
            : ""
        }
        <div class="drop-grid">
          ${dropTiles || `<p class="muted" style="grid-column:1/-1">No catalog drops for this boss. Use Something else, or ${esc(hotkeys().log)} in-game.</p>`}
        </div>
        <div class="farm-foot">
          <div class="suggest-wrap farm-extra">
            <input id="farm-extra" type="text" autocomplete="off" spellcheck="false" placeholder="Something else — divine, mirror, unique…" />
            <div class="suggest-list" id="farm-extra-suggest" hidden></div>
          </div>
          <button class="btn ghost" data-minus="${esc(farmId)}" ${dropUndo.length || (liveForFarm?.drops || []).length || kills ? "" : "disabled"} type="button">Undo</button>
        </div>
      </article>
      <p class="muted ninja-note">${ninjaNote}</p>
      <div class="dash-grid">
        <article class="panel">
          <h3>Most farmed</h3>
          <div class="bar-list">${
            topBosses.length
              ? topBosses
                  .map(
                    (row) => `<button class="bar-row" data-farm="${esc(row.boss.id)}" type="button">
                      <span>${esc(row.boss.name)}</span>
                      <span class="muted">${row.kills} · ${valueHtml(row.value)}</span>
                      <i style="width:${Math.max(8, (row.kills / maxKills) * 100)}%"></i>
                    </button>`
                  )
                  .join("")
              : `<p class="muted">Log a kill to fill this in.</p>`
          }</div>
        </article>
        <article class="panel">
          <h3>Most valuable drops</h3>
          <div class="bar-list">${
            topLoot.length
              ? topLoot
                  .map(
                    (row) => `<div class="bar-row static">
                      <span class="unique-name">${itemNameHtml(row.name)}</span>
                      <span class="muted">${row.qty} · ${row.divine ? valueHtml(row.divine) : "no price"}</span>
                    </div>`
                  )
                  .join("")
              : `<p class="muted">Loot with a known price will show here.</p>`
          }</div>
        </article>
      </div>
      <article class="panel">
        <h3>Recent kills</h3>
        ${
          recent.length
            ? `<div class="log-list" style="margin-top:10px">${recent
                .map((log) => {
                  const boss = getBoss(log.bossId);
                  const value = logValue(log);
                  return `<div class="log-item">
                    <div class="when">${esc(boss?.name || "Unknown")} · ${esc(formatWhen(log.at))}${value ? " · " + valueHtml(value) : ""}</div>
                    ${dropPills(log.drops, log.id)}
                  </div>`;
                })
                .join("")}</div>`
            : `<p class="muted">Nothing yet. Pick a boss and tap a drop.</p>`
        }
      </article>
    </section>
  `;
}

function ninjaTypes() {
  return [...NINJA_EXCHANGE, ...NINJA_ITEMS];
}

function selectedEconTypes() {
  if (ui.econAll) return ninjaTypes();
  const allowed = new Set(ninjaTypes());
  const types = (ui.econTypes || []).filter((type) => allowed.has(type));
  return types.length ? types : ["Currency"];
}

function gatherEconRows() {
  const rows = [];
  for (const type of selectedEconTypes()) {
    for (const row of econRows(type)) rows.push(row);
  }
  return rows;
}

function pickEconCat(type) {
  if (ui.econMode === "browse") {
    ui.econAll = false;
    ui.econTypes = [type];
    ui.econType = type;
    return;
  }
  if (ui.econAll) {
    ui.econAll = false;
    ui.econTypes = [type];
    ui.econType = type;
    return;
  }
  const next = new Set(ui.econTypes);
  if (next.has(type)) next.delete(type);
  else next.add(type);
  const types = ninjaTypes().filter((item) => next.has(item));
  if (!types.length) {
    ui.econAll = true;
    ui.econType = type;
    return;
  }
  ui.econTypes = types;
  ui.econType = types[0];
}

function pickEconAll() {
  ui.econAll = true;
}

function syncEconMode(mode) {
  ui.econMode = mode;
  if (mode === "browse" && !ui.econAll && selectedEconTypes().length > 1) {
    ui.econTypes = [selectedEconTypes()[0]];
    ui.econType = ui.econTypes[0];
  }
}

function econRows(type) {
  let rows = (prices.tables[type] || []).map((row) => ({ ...row, type: row.type || type }));
  if (!NINJA_ITEMS.includes(type)) {
    const merged = new Map();
    for (const row of rows) {
      const key = (row.name || "").toLowerCase();
      if (!key) continue;
      const prev = merged.get(key);
      if (!prev) {
        merged.set(key, row);
        continue;
      }
      prev.listings = Math.max(prev.listings || 0, row.listings || 0);
      if (Number.isFinite(row.divine) && (!Number.isFinite(prev.divine) || row.divine < prev.divine)) {
        prev.divine = row.divine;
        prev.amount = row.amount;
        prev.unit = row.unit;
        if (row.icon) prev.icon = row.icon;
        if (row.ninjaId != null) prev.ninjaId = row.ninjaId;
        if (row.kind) prev.kind = row.kind;
      }
      const prevSpark = sparkPoints(prev.spark?.data).length;
      const nextSpark = sparkPoints(row.spark?.data).length;
      if (nextSpark > prevSpark) prev.spark = row.spark;
    }
    rows = [...merged.values()];
  }
  const q = ui.econSearch.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => row.name.toLowerCase().includes(q) || (row.baseType || "").toLowerCase().includes(q));
  }
  return rows;
}

function econRowHtml(row, type) {
  const cat = type || row.type || ui.econType;
  const spark = row.spark || { data: [], change: 0 };
  const open = ui.econChart && ui.econChart.name === row.name && String(ui.econChart.ninjaId) === String(row.ninjaId);
  const extra = [row.baseType || NINJA_LABELS[cat] || "", row.corrupted ? "corrupted" : "", row.listings ? row.listings.toLocaleString() + " listed" : ""]
    .filter(Boolean)
    .join(" · ");
  const priced = Number.isFinite(row.amount) || Number.isFinite(row.divine);
  return `<button class="econ-row${open ? " is-open" : ""}" type="button" title="${esc(extra)}" ${itemHoverAttr(row.name)} data-econ-open="${esc(row.name)}" data-econ-id="${esc(String(row.ninjaId ?? ""))}" data-econ-kind="${esc(row.kind || "")}" data-econ-type="${esc(cat)}">
    ${itemIconHtml(row.name)}
    <span class="econ-copy">
      <span class="${NINJA_ITEMS.includes(cat) ? "unique-name" : "econ-name"}">${esc(row.name)}</span>
    </span>
    ${sparkSvg(spark.data, spark.change)}
    ${changeHtml(spark.change)}
    <span class="econ-price">${priced ? rowValueHtml(row) : "—"}</span>
  </button>`;
}

function rowPriceLabel(row) {
  if (row?.unit && Number.isFinite(row.amount)) return formatAmount(row.amount, row.unit);
  return formatDivine(row?.divine);
}

function econChartHtml() {
  const row = ui.econChart;
  if (!row) return "";
  const spark = row.spark || { data: [], change: 0 };
  return `<div class="econ-chart" id="econ-chart">
    <div class="econ-chart-head">
      <div class="econ-chart-title" ${itemHoverAttr(row.name)}>
        ${itemIconHtml(row.name, "lg")}
        <div>
          <h3>${esc(row.name)}</h3>
          <p class="muted">${esc(row.baseType || NINJA_LABELS[row.type] || "")} · 7-day trend ${changeHtml(spark.change)}</p>
        </div>
      </div>
      <button class="btn ghost" data-econ-chart-close type="button">Close</button>
    </div>
    <div id="econ-chart-body">${sparkSvg(spark.data, spark.change, true)}</div>
    <p class="muted">${esc(rowPriceLabel(row))}</p>
  </div>`;
}

async function fillEconChart() {
  const row = ui.econChart;
  const mount = document.getElementById("econ-chart-body");
  if (!row || !mount) return;
  if (row.kind !== "item" || row.ninjaId == null || row.ninjaId === "") return;
  const key = `${row.type}:${row.ninjaId}`;
  const unit = row.unit || "exalted";
  try {
    if (!prices.history[key]) {
      const q = encodeURIComponent(leagueId());
      prices.history[key] = await ninjaFetch(
        `/poe2/api/economy/stash/current/item/history?league=${q}&type=${encodeURIComponent(row.type)}&id=${encodeURIComponent(row.ninjaId)}`
      );
    }
    if (ui.econChart !== row || !document.getElementById("econ-chart-body")) return;
    const plot = historySvg(prices.history[key], unit);
    if (plot) {
      const spark = row.spark || { data: [], change: 0 };
      const unitLabel = unit === "exalted" ? "exalted" : unit === "chaos" ? "chaos" : "divine";
      mount.innerHTML = plot + `<p class="muted">League history in ${unitLabel} · last change ${changeHtml(spark.change)}</p>`;
    }
  } catch {
    /* keep the 7-day sparkline */
  }
}

function trendChange(row) {
  const n = Number(row?.spark?.change);
  return Number.isFinite(n) ? n : 0;
}

function trendingLists() {
  const rows = gatherEconRows();
  const multi = ui.econAll || selectedEconTypes().length !== 1;
  const byAbs = (a, b) => Math.abs(trendChange(b)) - Math.abs(trendChange(a)) || a.name.localeCompare(b.name);
  const up = rows.filter((row) => trendChange(row) >= 0.05).sort(byAbs);
  const down = rows.filter((row) => trendChange(row) <= -0.05).sort(byAbs);
  const flat = rows
    .filter((row) => Math.abs(trendChange(row)) < 0.05)
    .sort(
      (a, b) =>
        (Number.isFinite(b.divine) ? b.divine : -1) - (Number.isFinite(a.divine) ? a.divine : -1) ||
        a.name.localeCompare(b.name)
    );
  if (!multi) return { up, down, flat };
  return { up: up.slice(0, 24), down: down.slice(0, 24), flat: flat.slice(0, 80) };
}

function trendCol(title, rows, empty) {
  return `<article class="econ-trend-col">
    <h3>${esc(title)}${rows.length ? ` · ${rows.length}` : ""}</h3>
    <div class="econ-list">${rows.length ? rows.map((row) => econRowHtml(row, row.type)).join("") : `<p class="muted">${esc(empty)}</p>`}</div>
  </article>`;
}

function renderEcon() {
  const types = selectedEconTypes();
  ui.econType = types[0] || "Currency";
  const picked = new Set(types);
  const showBases = types.some((type) => NINJA_ITEMS.includes(type));
  const chips = [
    `<button class="chip ${ui.econAll ? "is-active" : ""}" data-econ-all type="button">All items</button>`,
    ...ninjaTypes().map(
      (type) =>
        `<button class="chip ${!ui.econAll && picked.has(type) ? "is-active" : ""}" data-econ-cat="${esc(type)}" type="button">${esc(
          NINJA_LABELS[type] || type
        )}</button>`
    ),
  ].join("");
  const modes = `<div class="econ-modes">
    <button class="chip ${ui.econMode === "browse" ? "is-active" : ""}" data-econ-mode="browse" type="button">Browse</button>
    <button class="chip ${ui.econMode === "trend" ? "is-active" : ""}" data-econ-mode="trend" type="button">Trending</button>
  </div>`;
  let body = "";
  const haveEcon = Object.keys(prices.tables || {}).length || prices.byName.size;
  if (prices.status === "loading" && !haveEcon) body = `<p class="muted">Loading prices…</p>`;
  else if (prices.status === "error" && !haveEcon) {
    body = `<p class="muted">Could not load prices${prices.error ? " — " + esc(prices.error) : ""}. Use Check prices in the header.</p>`;
  } else if (ui.econMode === "trend") {
    const { up, down, flat } = trendingLists();
    if (!up.length && !down.length && !flat.length) {
      body = `<p class="muted">${ui.econSearch ? "No matches moving right now." : "No listings in this category yet. Use Check prices in the header."}</p>`;
    } else {
      const movers = up.length || down.length;
      const scopeLabel = ui.econAll
        ? "all items"
        : types.map((type) => NINJA_LABELS[type] || type).join(", ") || "this category";
      body = `${
        movers
          ? `<div class="econ-trend">${trendCol("Rising", up, "Nothing rising.")}${trendCol("Falling", down, "Nothing falling.")}</div>`
          : `<p class="muted">No 7-day price move in ${esc(scopeLabel)} yet. Early-league uniques often sit at 0% until poe.ninja has history.</p>`
      }${
        flat.length
          ? `<div class="econ-trend-flat">
              <h3>Unchanged · ${flat.length}</h3>
              <p class="muted">Still listed — just no 7-day spark yet.</p>
              <div class="econ-list">${flat.map((row) => econRowHtml(row, row.type)).join("")}</div>
            </div>`
          : ""
      }`;
    }
  } else {
    const rows = gatherEconRows().sort(
      (a, b) =>
        (Number.isFinite(b.divine) ? b.divine : -1) - (Number.isFinite(a.divine) ? a.divine : -1) || a.name.localeCompare(b.name)
    );
    if (!rows.length) {
      body = `<p class="muted">${ui.econSearch ? "No matches in this category." : "No listings in this category yet. Use Check prices in the header."}</p>`;
    } else {
      body = `<div class="econ-list">${rows.map((row) => econRowHtml(row, row.type)).join("")}</div>`;
    }
  }
  const searchHint = ui.econMode === "trend" ? "Search trending…" : ui.econAll ? "Search items…" : "Search this category…";
  return `
    <section class="econ">
      <article class="panel">
        <div class="econ-head">
          <div>
            <h2>Economy</h2>
            <p class="muted">${esc(prices.league || leagueId())}${prices.fetchedAt ? " · " + (prices.cached ? "last recorded " : "") + esc(formatWhen(prices.fetchedAt)) : ""}${
              prices.status === "loading" && haveEcon ? " · updating" : ""
            }${
              showBases ? " · bases listed separately" : ""
            }</p>
          </div>
          <div class="econ-tools">
            ${modes}
            <input id="econ-search" type="search" placeholder="${esc(searchHint)}" value="${esc(ui.econSearch)}" />
          </div>
        </div>
        <div class="filters econ-cats">${chips}</div>
        ${econChartHtml()}
        ${body}
      </article>
    </section>
  `;
}

function applyImportedState(next) {
  if (!next || typeof next !== "object" || Array.isArray(next)) throw new Error("Invalid file");
  state = {
    ...defaultState(),
    ...next,
    logs: next.logs || [],
    hunted: next.hunted || [],
    theme: { ...themeDefaults(), ...(next.theme || {}) },
  };
  save();
  applyTheme();
  render();
}

function samePath(a, b) {
  return String(a || "")
    .replace(/[\\/]+$/, "")
    .toLowerCase() === String(b || "")
    .replace(/[\\/]+$/, "")
    .toLowerCase();
}

function applyBackupInfo(res) {
  if (!res || typeof res !== "object") return;
  backupInfo.folder = res.folder || backupInfo.folder || "";
  backupInfo.downloads = res.downloads || backupInfo.downloads || "";
  syncBackupUi();
}

function backupFolderLabel() {
  if (backupInfo.downloads && samePath(backupInfo.folder, backupInfo.downloads)) return "Downloads";
  if (backupInfo.folder) {
    const parts = backupInfo.folder.replace(/[\\/]+$/, "").split(/[\\/]/);
    return parts.at(-1) || backupInfo.folder;
  }
  return "Downloads";
}

function syncBackupUi() {
  const label = backupFolderLabel();
  const exportNote = document.querySelector("#export-btn .menu-link-note");
  if (exportNote) exportNote.textContent = "Saves to " + label;
  const importNote = document.querySelector("#import-btn .menu-link-note");
  if (importNote) importNote.textContent = "Opens " + label;
}

async function refreshBackupInfo() {
  if (!window.chrome?.webview) return;
  try {
    applyBackupInfo(await webviewJson({ type: "backup-info" }, 8000, "backup info timed out"));
    if (ui.view === "settings") render();
  } catch {
    /* keep last known folder */
  }
}

function placeButtons() {
  return `<button class="btn ghost" data-backup-where="browse" type="button">Choose folder…</button>`;
}

let backupBusy = false;

async function withBackupLock(work) {
  if (backupBusy) return;
  backupBusy = true;
  try {
    await work();
  } finally {
    backupBusy = false;
  }
}

async function exportData() {
  const json = JSON.stringify(state, null, 2);
  if (window.chrome?.webview) {
    await withBackupLock(async () => {
      showToast("Saving backup…");
      try {
        const res = await webviewJson({ type: "export", json }, 20000, "save timed out");
        applyBackupInfo(res);
        if (res?.cancelled) {
          showToast("Save cancelled.");
          return;
        }
        showToast(res?.path ? "Backup saved to " + res.path : "Backup saved.");
        if (ui.view === "settings") render();
      } catch (err) {
        showToast("Could not save backup: " + (err.message || "failed"));
      }
    });
    return;
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "still-sane-exile.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup downloaded.");
}

async function setBackupFolder(where) {
  if (!window.chrome?.webview) {
    showToast("Save location is set in the desktop app.");
    return;
  }
  await withBackupLock(async () => {
    try {
      const res = await webviewJson({ type: "backup-set", where }, 30 * 60 * 1000, "folder dialog timed out");
      if (res?.cancelled) return;
      applyBackupInfo(res);
      showToast("Exports will save to " + backupFolderLabel() + ".");
      if (ui.view === "settings") render();
    } catch (err) {
      showToast("Could not set save folder: " + (err.message || "failed"));
    }
  });
}

async function importBackup() {
  if (window.chrome?.webview) {
    await withBackupLock(async () => {
      showToast("Opening backup…");
      try {
        const res = await webviewJson({ type: "import" }, 30 * 60 * 1000, "open dialog timed out");
        applyBackupInfo(res);
        if (res?.cancelled) {
          showToast("Import cancelled.");
          return;
        }
        const next = typeof res.json === "string" ? JSON.parse(res.json) : res.json;
        applyImportedState(next);
        showToast(res?.path ? "Imported from " + res.path : "Backup imported.");
      } catch {
        showToast("Could not import that file.");
      }
    });
    return;
  }
  document.getElementById("import-file")?.click();
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyImportedState(JSON.parse(reader.result));
      showToast("Backup imported.");
    } catch {
      showToast("Could not import that file.");
    }
  };
  reader.readAsText(file);
}

function convertMainChecks() {
  const main = convertMain();
  return allConvertUnits()
    .map(
      (unit) =>
        `<label class="rate-check${unit === main ? " is-on" : ""}" data-convert-main="${esc(unit)}">
          <input type="checkbox" ${unit === main ? "checked" : ""}>
          ${itemIconHtml(currencyNameForUnit(unit), "xs")}
          <span>${esc(unitLabel(unit))}</span>
        </label>`
    )
    .join("");
}

function renderDivineTape() {
  const btn = document.getElementById("rate-pop-btn");
  const card = document.getElementById("rate-pop-card");
  if (!btn || !card) return;
  const main = convertMain();
  const quote = convertQuote();
  const checks = `<p class="muted rate-card-note">Item prices use this currency.</p>
    <div class="rate-checks">${convertMainChecks()}</div>`;
  if (prices.status !== "ready" || !prices.exaltedPerDivine) {
    btn.textContent = prices.status === "loading" ? "Rates…" : "Rates";
    card.innerHTML = `
      <div class="rate-card-head">
        <h3>Convert</h3>
      </div>
      ${checks}
      <p class="muted">${
        prices.status === "loading" ? "Checking prices…" : "Check prices in the header to fill conversions."
      }</p>`;
    return;
  }
  const oneView = amountFromDivine(amountInDivine(1, main), quote);
  btn.innerHTML = `${itemIconHtml(currencyNameForUnit(main), "xs")}1${unitShort(main)} = ${itemIconHtml(
    currencyNameForUnit(quote),
    "xs"
  )}${esc(formatAmount(oneView, quote))}`;
  const cols = allConvertUnits();
  const summary = `<div class="rate-line">${itemIconHtml(currencyNameForUnit("divine"), "xs")}<b>1d</b>${["exalted", "chaos"]
    .map(
      (to) =>
        `<span>=</span>${itemIconHtml(currencyNameForUnit(to), "xs")}<b>${esc(
          formatAmount(amountFromDivine(1, to), to)
        )}</b>`
    )
    .join("")}</div>`;
  const rows = convertSteps("divine")
    .map((amount) => {
      return `<tr>
        ${cols
          .map((unit) => `<td>${esc(formatAmount(amountFromDivine(amount, unit), unit))}</td>`)
          .join("")}
      </tr>`;
    })
    .join("");
  card.innerHTML = `
    <div class="rate-card-head">
      <h3>Convert</h3>
    </div>
    ${checks}
    ${summary}
    <table class="rate-table">
      <thead>
        <tr>${cols.map((unit) => `<th>${esc(unitLabel(unit))}</th>`).join("")}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderStats() {
  const totalKills = state.logs.length;
  document.getElementById("stats").innerHTML = `
    <article class="stat"><span>Total kills</span><b>${totalKills}</b></article>
    <article class="stat"><span>Loot value</span><b>${valueHtml(totalLootValue())}</b></article>
  `;
}

function renderFilters() {
  document.getElementById("filters").innerHTML = FILTERS.map(
    ([id, label]) =>
      `<button class="chip ${ui.filter === id ? "is-active" : ""}" data-filter="${id}">${label}</button>`
  ).join("");
}

function renderBossCard(boss) {
  const kills = killCount(boss.id);
  const progress = uniqueProgress(boss);
  const progressPct = progress.total ? Math.round((progress.have / progress.total) * 100) : 0;
  const done = progress.total > 0 && progress.have === progress.total;
  const counts = dropCounts(boss.id);
  const pips = (boss.uniques || [])
    .map((item) => {
      const got = (counts[item.id] || 0) > 0;
      return `<span class="drop-pip${got ? " got" : ""}">${itemNameHtml(item.name, "xs")}</span>`;
    })
    .join("");
  const badge = done
    ? `<span class="badge complete">All drops</span>`
    : progress.total
      ? `<span class="badge">${progress.have}/${progress.total}</span>`
      : `<span class="badge muted">No drop table</span>`;
  return `
    <article class="card ${esc(boss.category)}${done ? " is-complete" : ""}" data-open="${esc(boss.id)}">
      <div class="card-art" aria-hidden="true">${bossArtHtml(boss, "card-art-img")}</div>
      <div class="card-body">
      <div class="card-top">
        <div class="tags">
          <span class="tag">${esc(boss.group || boss.category)}</span>
          ${boss.optional ? `<span class="tag">Optional</span>` : ""}
        </div>
        ${badge}
      </div>
      <div class="card-copy">
        <h3>${esc(boss.name)}</h3>
        <div class="area">${esc(boss.area || "")}</div>
      </div>
      ${
        progress.total
          ? `<div class="drop-pips">${pips}</div>`
          : `<p class="muted">Custom fight — no unique catalog.</p>`
      }
      <div class="metrics">
        <div class="metric"><span>Kills</span><strong>${kills}</strong></div>
        <div class="metric"><span>Uniques</span><strong>${
          progress.total ? `${progress.have}/${progress.total}` : "—"
        }</strong></div>
        <div class="metric"><span>Complete</span><strong>${progress.total ? esc(formatPct(progress.have, progress.total)) : "—"}</strong></div>
      </div>
      ${progress.total ? `<div class="progress" aria-hidden="true"><i style="width:${progressPct}%"></i></div>` : ""}
      </div>
    </article>
  `;
}

function renderBosses() {
  const { list, start, shown, slice } = slideWindow();
  if (!list.length) {
    return `<div class="empty">No bosses match that search.</div>`;
  }
  const boss = slice[0];
  ui.bossId = boss.id;
  const many = list.length > 1;
  const cards = slice
    .map((item, i) => `<div class="boss-slide${i === 0 ? " is-current" : ""}">${renderBossCard(item)}</div>`)
    .join("");
  return `
    <div class="boss-stage-slot">
    <section class="boss-stage" data-count="${shown}" style="${slideVars(shown)}">
      <button class="boss-arrow" data-boss-step="-1" type="button" aria-label="Previous boss" ${many ? "" : "disabled"}><span>‹</span></button>
      <div class="boss-stage-main">
        <div class="boss-stage-track">${cards}</div>
        <p class="muted boss-stage-count">${start + 1} of ${list.length}</p>
      </div>
      <button class="boss-arrow" data-boss-step="1" type="button" aria-label="Next boss" ${many ? "" : "disabled"}><span>›</span></button>
    </section>
    </div>
  `;
}

function renderLogView() {
  if (!state.logs.length) {
    return `<div class="empty">No kills logged yet. Farm from the dashboard, then this catalog fills in.</div>`;
  }
  const items = state.logs
    .map((log) => {
      const boss = getBoss(log.bossId);
      return `
        <article class="log-item">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
            <div>
              <strong>${esc(boss?.name || "Unknown boss")}</strong>
              <div class="when">${esc(formatWhen(log.at))}</div>
            </div>
            <button class="btn danger" data-delete-log="${esc(log.id)}" type="button">Delete</button>
          </div>
          ${dropPills(log.drops, log.id)}
        </article>`;
    })
    .join("");
  const rates = allBosses()
    .map((boss) => {
      const kills = killCount(boss.id);
      if (!kills) return "";
      const counts = dropCounts(boss.id);
      const hits = dropHits(boss.id);
      const rows = [
        ...(boss.uniques || []).map((item) => ({ name: item.name, qty: counts[item.id] || 0, hits: hits[item.id] || 0 })),
        ...extraDrops(boss),
      ];
      if (!rows.length) return "";
      return `
        <article class="log-item">
          <strong>${esc(boss.name)}</strong>
          <div class="when">${kills} kills · loot ${esc(formatPct(lootHit(boss.id), kills))}</div>
          <div class="unique-list" style="margin-top:10px">
            ${rows
              .map(
                (row) => `
              <div class="unique-row compact">
                <div class="unique-name">${itemNameHtml(row.name)}</div>
                ${rateHtml(row.qty, row.hits || 0, kills)}
              </div>`
              )
              .join("")}
          </div>
        </article>`;
    })
    .join("");
  return `
    <h2 class="section-title">Drop rates</h2>
    <p class="muted">Percent is how often it dropped per kill. Two copies on one kill still count as one drop.</p>
    <div class="log-list" style="margin-top:10px">${rates || `<div class="empty">Log kills from the dashboard to see rates.</div>`}</div>
    <h2 class="section-title" style="margin-top:28px">Kill history</h2>
    <div class="log-list" style="margin-top:10px">${items}</div>
  `;
}

function colorField(key, label, value) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : themeDefaults()[key] || "#000000";
  return `<label class="theme-color">
    <span>${esc(label)}</span>
    <input type="color" data-theme="${esc(key)}" value="${esc(hex)}" />
  </label>`;
}

function renderSettings() {
  const t = currentTheme();
  const presets = Object.entries(THEME_PRESETS)
    .map(
      ([id, preset]) =>
        `<button class="btn ${t.preset === id ? "gold" : "ghost"} preset-swatch" data-theme-preset="${esc(id)}" type="button">
          <i style="background:${esc(preset.gold)}"></i>${esc(preset.label)}
        </button>`
    )
    .join("");
  function fontOptions(list, selected) {
    return list.map((name) => `<option value="${esc(name)}" ${name === selected ? "selected" : ""}>${esc(name)}</option>`).join("");
  }
  return `
    <section class="settings">
      <div>
        <h2 class="section-title">Settings</h2>
        <p class="muted">Tweaks save on this PC. JSON backups go to Downloads unless you pick another folder.</p>
      </div>
      ${
        window.chrome?.webview
          ? `<article class="panel">
        <h3>Hotkeys</h3>
        <p class="muted" style="margin-top:8px">These work while Path of Exile is focused. Log only marks farm drops. Price overlay checks any item and does not add it to the boss log.</p>
        <div class="hotkey-rows">
          <div class="hotkey-row">
            <span>Log copied item</span>
            <button class="hotkey-btn${ui.hotkeyCapture === "log" ? " is-listening" : ""}" data-hotkey-bind="log" type="button">${
              ui.hotkeyCapture === "log" ? "Press a key…" : esc(hotkeys().log)
            }</button>
          </div>
          <div class="hotkey-row">
            <span>Price overlay</span>
            <button class="hotkey-btn${ui.hotkeyCapture === "price" ? " is-listening" : ""}" data-hotkey-bind="price" type="button">${
              ui.hotkeyCapture === "price" ? "Press a key…" : esc(hotkeys().price)
            }</button>
          </div>
          <div class="hotkey-row">
            <span>Next kill</span>
            <button class="hotkey-btn${ui.hotkeyCapture === "next" ? " is-listening" : ""}" data-hotkey-bind="next" type="button">${
              ui.hotkeyCapture === "next" ? "Press a key…" : esc(hotkeys().next)
            }</button>
          </div>
        </div>
        <p class="muted">Escape cancels a rebind. If a key is already used, the two actions swap. Keep this window open on a second screen while you farm.</p>
      </article>`
          : `<article class="panel">
        <h3>Hotkeys</h3>
        <p class="muted" style="margin-top:8px">In-game copy hotkeys need the desktop app.</p>
      </article>`
      }
      <article class="panel">
        <h3>Default save folder</h3>
        ${
          window.chrome?.webview
            ? `<p class="muted" style="margin-top:8px">Export saves here. Import opens this folder.</p>
        <p class="backup-path">${esc(backupInfo.folder || "Downloads")}</p>
        <div class="export-places">${placeButtons()}</div>`
            : `<p class="muted" style="margin-top:8px">Save location is set in the desktop app. Browser export still downloads a JSON file.</p>`
        }
        <div class="row-actions">
          <button class="btn ghost" id="settings-import-btn" type="button">Import</button>
          <button class="btn gold" id="settings-export-btn" type="button">Export</button>
        </div>
      </article>
      <article class="panel" id="feedback">
        <h3>Feedback</h3>
        <form id="feedback-form" class="feedback-form">
          <label>Title
            <input id="feedback-title" name="title" required maxlength="80" />
          </label>
          <textarea name="body" rows="5" maxlength="2000" aria-label="Feedback"></textarea>
          <div class="row-actions">
            <button class="btn ghost" data-feedback-send="copy" type="button">Copy</button>
            <button class="btn gold" type="submit">Send</button>
          </div>
        </form>
      </article>
      <article class="panel">
        <h3>Look</h3>
        <div class="preset-row" style="margin-top:12px">${presets}</div>
      </article>
      <article class="panel">
        <h3>Colors</h3>
        <div class="settings-grid" style="margin-top:12px">
          ${colorField("gold", "Accent", t.gold)}
          ${colorField("bg", "Background", t.bg)}
          ${colorField("panel", "Panels", t.panel)}
          ${colorField("ink", "Text", t.ink)}
        </div>
        <p class="muted" style="margin-top:12px">Accent tints gold lines and buttons. Panels and text cover the rest.</p>
      </article>
      <article class="panel">
        <h3>Font</h3>
        <label class="league-field" style="margin-top:12px">
          <span>Titles</span>
          <select data-theme-font="display">${fontOptions(FONT_DISPLAY, pickTitleFont(t.display))}</select>
        </label>
        <div class="font-preview">
          <h3>The King in the Mists</h3>
          <p>Divine Orb · Exalted Orb</p>
        </div>
      </article>
      <div class="row-actions">
        <button class="btn ghost" data-theme-reset type="button">Reset look</button>
      </div>
    </section>
  `;
}

function renderBossDialog(boss) {
  const kills = killCount(boss.id);
  const counts = dropCounts(boss.id);
  const hits = dropHits(boss.id);
  const progress = uniqueProgress(boss);
  const recent = logsFor(boss.id).slice(0, 8);
  const uniqueRows = (boss.uniques || [])
    .map((item) => {
      const qty = counts[item.id] || 0;
      return `
        <div class="unique-row">
          <div>
            <div class="unique-name">${itemNameHtml(item.name)} ${priceChip(item.name)}</div>
            ${item.notes ? `<div class="muted">${esc(item.notes)}</div>` : ""}
          </div>
          <span class="rarity">${esc(rarityLabel(item.rarity))}</span>
          ${rateHtml(qty, hits[item.id] || 0, kills)}
        </div>`;
    })
    .join("");
  const extraRows = extraDrops(boss)
    .map(
      (item) => `
        <div class="unique-row">
          <div><div class="unique-name">${itemNameHtml(item.name)}</div></div>
          <span class="rarity">logged</span>
          ${rateHtml(item.qty, item.hits || 0, kills)}
        </div>`
    )
    .join("");
  const copiesByUnique = new Map();
  for (const log of logsFor(boss.id)) {
    for (const drop of log.drops || []) {
      if (!drop.rolls?.length) continue;
      if (!drop.id) drop.id = uid();
      const id = drop.uniqueId || slug(drop.name);
      if (!copiesByUnique.has(id)) copiesByUnique.set(id, { name: drop.name, copies: [] });
      copiesByUnique.get(id).copies.push({ at: log.at, log, drop });
    }
  }
  const rollHistory = [...copiesByUnique.values()]
    .map(
      (group) => `<div>
        <h3>${esc(group.name)} rolls</h3>
        <p class="muted">Logged copies of this unique.</p>
        <div class="log-list" style="margin-top:10px">${group.copies
          .map(
            (copy) => `<div class="log-item"><div class="when">${esc(formatWhen(copy.at))}</div><div class="pill-block"><span class="pill">${itemNameHtml(copy.drop.name, "xs")}</span>${priceChip(copy.drop.name)}</div></div>`
          )
          .join("")}</div>
      </div>`
    )
    .join("");

  const rewards = (boss.rewards || [])
    .map((reward) => {
      const claimed = !!state.claimed[boss.id + "::" + reward];
      return `<label class="check">
        <input type="checkbox" data-claim="${esc(boss.id)}" data-reward="${esc(reward)}" ${claimed ? "checked" : ""} />
        <span>${esc(reward)}</span>
      </label>`;
    })
    .join("");

  document.getElementById("boss-dialog-body").innerHTML = `
    <div class="sheet-inner">
      <div class="sheet-art" aria-hidden="true">${bossArtHtml(boss, "sheet-art-img")}</div>
      <header>
        <div>
          <div class="tags">
            <span class="tag">${esc(boss.group || boss.category)}</span>
            ${
              progress.total && progress.have === progress.total
                ? `<span class="badge complete">All drops</span>`
                : progress.total
                  ? `<span class="badge">${progress.have}/${progress.total}</span>`
                  : ""
            }
          </div>
          <h2 style="margin-top:8px">${esc(boss.name)}</h2>
          <p class="muted">${esc(boss.area || "")}${boss.access ? " · " + esc(boss.access) : ""}</p>
        </div>
        <button class="close" data-close="boss-dialog" type="button" aria-label="Close">×</button>
      </header>
      ${
        uniqueRows
          ? `<div><h3>Drop table</h3><p class="muted">Drop % is kills that dropped it, not copies. Two of the same item on one kill is 100%, not 200%.</p><div class="unique-list" style="margin-top:10px">${uniqueRows}</div></div>`
          : `<p class="muted">No exclusive unique table for this fight. Farm it from the dashboard to log whatever dropped.</p>`
      }
      ${
        extraRows
          ? `<div><h3>Other logged drops</h3><div class="unique-list" style="margin-top:10px">${extraRows}</div></div>`
          : ""
      }
      <div class="metrics">
        <div class="metric"><span>Kills</span><strong>${kills}</strong></div>
        <div class="metric"><span>Drops found</span><strong>${
          progress.total ? `${progress.have}/${progress.total}` : "—"
        }</strong></div>
        <div class="metric"><span>Complete</span><strong>${progress.total ? esc(formatPct(progress.have, progress.total)) : "—"}</strong></div>
      </div>
      <div class="card-actions">
        <button class="btn gold" data-farm="${esc(boss.id)}" type="button">Farm this</button>
        ${boss.category === "custom" ? `<button class="btn danger" data-remove-custom="${esc(boss.id)}" type="button">Remove boss</button>` : ""}
      </div>
      ${rollHistory}
      ${rewards ? `<div><h3>First-kill rewards</h3><div class="check-grid" style="margin-top:10px">${rewards}</div></div>` : ""}
      <div>
        <h3>Recent kills</h3>
        ${
          recent.length
            ? `<div class="log-list" style="margin-top:10px">${recent
                .map((log) => {
                  return `<div class="log-item"><div class="when">${esc(formatWhen(log.at))}</div>${dropPills(log.drops, log.id)}</div>`;
                })
                .join("")}</div>`
            : `<p class="muted">No kills yet.</p>`
        }
      </div>
    </div>
  `;
}

function uniqueById(id) {
  if (!id) return null;
  const aliases = new Set([id, slug(canonicalName(String(id).replace(/-/g, " ")))]);
  for (const boss of allBosses()) {
    const hit = (boss.uniques || []).find((item) => aliases.has(item.id) || item.id === id);
    if (hit) return hit;
  }
  return null;
}

function matchFrom(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const name of list) {
    const lower = name.toLowerCase();
    if (lower.startsWith(q)) starts.push(name);
    else if (lower.includes(q)) contains.push(name);
  }
  return starts.concat(contains).slice(0, 10);
}

function dropPriceChip(drop, logId) {
  if (drop?.quoting) return `<span class="price-chip is-empty">this roll…</span>`;
  const quote = drop?.quote;
  const league = quote?.league || leagueId();
  const n = pickedRolls(drop).length;
  const listed = quote?.listings ? quote.listings.toLocaleString() + " with these rolls" : "these rolls";
  const title = `PoE 2 trade · ${league} · ${listed}`;
  const mapped = Number(quote?.mapped) || 0;
  if (quote?.url && mapped > 0 && n) {
    if (pricedHit(quote) && Number(quote.amount) > 0) {
      const label = quote.unit && Number.isFinite(quote.amount) ? formatAmount(quote.amount, quote.unit) : formatDivine(quote.divine);
      const currency = currencyForAmount(quote.divine);
      return `<button type="button" class="price-chip" data-open-trade="${esc(quote.url)}" title="${esc(title)}" ${itemHoverAttr(currency)}>${itemIconHtml(currency)}${esc(label)}</button>`;
    }
    return `<button type="button" class="price-chip is-empty is-lookup" data-open-trade="${esc(quote.url)}" title="${esc(title)}">no listing</button>`;
  }
  if (drop?.rolls?.length) {
    const err = quote?.error ? ` · ${quote.error}` : "";
    const label = n ? "this roll" : "pick mods";
    return `<button type="button" class="price-chip is-empty is-lookup" data-quote-drop="${esc(drop.id || "")}" data-quote-log="${esc(logId || "")}" title="${esc((n ? "Search PoE 2 trade for the mods you tapped" : "Tap the mods you want to check") + err)}">${label}</button>`;
  }
  return priceChip(drop?.name);
}

function dropPills(drops, logId) {
  if (!drops?.length) return `<div class="muted" style="margin-top:8px">Nothing dropped</div>`;
  return `<div class="drop-pills">${drops
    .map((drop) => {
      return `<div class="pill-block"><span class="pill">${itemNameHtml(drop.name, "xs")}${drop.qty > 1 ? " ×" + drop.qty : ""}</span>${priceChip(drop.name)}</div>`;
    })
    .join("")}</div>`;
}

function dropCheckHtml(item, counts, hits, kills, nameClass) {
  const qty = counts[item.id] || 0;
  return `
    <div class="drop-block">
      <label class="check">
        <input type="checkbox" data-drop-id="${esc(item.id)}" data-drop-name="${esc(item.name)}" />
        <span class="${nameClass}">${itemNameHtml(item.name)}</span>
        <span class="pct">${esc(formatPct(hits[item.id] || 0, kills))}</span>
        <input type="number" min="1" value="1" data-qty="${esc(item.id)}" />
      </label>
    </div>`;
}

function suggestCatalog() {
  const seen = new Set();
  const items = [];
  function add(item) {
    if (!item?.name) return;
    const id = item.id || slug(item.name);
    if (seen.has(id)) return;
    seen.add(id);
    items.push({ id, name: item.name });
  }
  SEARCH_ITEMS.forEach((name) => add(typeof name === "string" ? { name } : name));
  allBosses().forEach((boss) => (boss.uniques || []).forEach(add));
  for (const hit of prices.byName.values()) add({ name: hit.name });
  return items;
}

function matchSuggest(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const item of suggestCatalog()) {
    const name = item.name.toLowerCase();
    if (name.startsWith(q)) starts.push(item);
    else if (name.includes(q)) contains.push(item);
  }
  return starts.concat(contains).slice(0, 10);
}

function renderLogDialog(boss) {
  const kills = killCount(boss.id);
  const counts = dropCounts(boss.id);
  const hits = dropHits(boss.id);
  const uniqueChecks = (boss.uniques || [])
    .map((item) => dropCheckHtml(item, counts, hits, kills, "unique-name"))
    .join("");

  document.getElementById("log-dialog-body").innerHTML = `
    <form class="panel-form" id="loot-form" data-boss="${esc(boss.id)}" data-log="${esc(ui.editLogId || "")}">
      <header style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h2>What dropped?</h2>
          <p class="muted">${esc(boss.name)}</p>
        </div>
        <button class="close" data-close="log-dialog" type="button" aria-label="Close">×</button>
      </header>
      <p class="muted">Pick uniques, or type anything else that dropped.</p>
      ${uniqueChecks ? `<div><h3>From this fight</h3><div class="check-grid" style="margin-top:8px">${uniqueChecks}</div></div>` : ""}
      <div>
        <h3>Something else</h3>
        <div class="chips" id="extra-chips"></div>
        <div class="suggest-wrap">
          <input id="extra-input" type="text" autocomplete="off" spellcheck="false" placeholder="Type divine, mirror, unique name…" />
          <div class="suggest-list" id="extra-suggest" hidden></div>
        </div>
      </div>
      <p class="loot-error" id="loot-error" hidden>Pick what dropped.</p>
      <div class="row-actions">
        <button class="btn ghost" data-close="log-dialog" type="button">Cancel</button>
        <button class="btn gold" type="submit">Save kill</button>
      </div>
    </form>
  `;
  wireLootForm(document.getElementById("loot-form"));
}

function openBoss(id) {
  const boss = getBoss(id);
  if (!boss) return;
  ui.selectedId = id;
  renderBossDialog(boss);
  document.getElementById("boss-dialog").showModal();
}

function openLoot(id, logId) {
  const boss = getBoss(id);
  if (!boss) return;
  ui.logBossId = id;
  ui.editLogId = logId || "";
  renderLogDialog(boss);
  document.getElementById("log-dialog").showModal();
}

function wireLootForm(form) {
  if (!form) return;
  const error = form.querySelector("#loot-error");
  const input = form.querySelector("#extra-input");
  const list = form.querySelector("#extra-suggest");
  const chips = form.querySelector("#extra-chips");
  let active = -1;

  function hideSuggest() {
    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }
    active = -1;
  }

  function showSuggest(matches) {
    if (!list) return;
    if (!matches.length) {
      hideSuggest();
      return;
    }
    list.hidden = false;
    list.innerHTML = matches
      .map(
        (item, i) =>
          `<button type="button" class="suggest-item ${i === active ? "is-active" : ""}" data-suggest-id="${esc(item.id)}" data-suggest-name="${esc(item.name)}">${itemNameHtml(item.name)}</button>`
      )
      .join("");
    fillSuggestIcons(matches, () => showSuggest(matchSuggest(input.value)));
  }

  function addExtra(item) {
    if (!item?.name || !chips) return;
    const id = item.id || slug(item.name);
    const catalogBox = form.querySelector(`[data-drop-id="${CSS.escape(id)}"]`);
    if (catalogBox) {
      catalogBox.checked = true;
      if (error) error.hidden = true;
      if (input) {
        input.value = "";
        input.focus();
      }
      hideSuggest();
      return;
    }
    const existing = chips.querySelector(`[data-extra-id="${CSS.escape(id)}"]`);
    if (existing) {
      const qty = existing.querySelector("[data-extra-qty]");
      qty.value = String(Math.max(1, Number(qty.value || 1) + 1));
    } else {
      chips.insertAdjacentHTML(
        "beforeend",
        `<span class="extra-chip" data-extra-id="${esc(id)}" data-extra-name="${esc(item.name)}" ${itemHoverAttr(item.name)}>
          ${itemNameHtml(item.name)}
          <input type="number" min="1" value="1" data-extra-qty />
          <button type="button" class="chip-x" data-remove-chip aria-label="Remove">×</button>
        </span>`
      );
    }
    if (error) error.hidden = true;
    if (input) {
      input.value = "";
      input.focus();
    }
    hideSuggest();
  }

  form.addEventListener("change", () => {
    if (error) error.hidden = true;
  });

  form.addEventListener("click", (event) => {
    const pick = event.target.closest("[data-suggest-id]");
    if (pick) {
      addExtra({ id: pick.dataset.suggestId, name: pick.dataset.suggestName });
      return;
    }
    if (event.target.closest("[data-remove-chip]")) {
      const chip = event.target.closest("[data-extra-id]");
      const id = chip?.dataset.extraId;
      chip?.remove();
    }
  });

  input?.addEventListener("input", () => {
    if (error) error.hidden = true;
    const matches = matchSuggest(input.value);
    active = matches.length ? 0 : -1;
    showSuggest(matches);
  });

  input?.addEventListener("keydown", (event) => {
    const matches = matchSuggest(input.value);
    if (event.key === "ArrowDown" && matches.length) {
      event.preventDefault();
      active = (active + 1) % matches.length;
      showSuggest(matches);
      return;
    }
    if (event.key === "ArrowUp" && matches.length) {
      event.preventDefault();
      active = (active - 1 + matches.length) % matches.length;
      showSuggest(matches);
      return;
    }
    if (event.key === "Escape") {
      hideSuggest();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (matches[active] || matches[0]) addExtra(matches[active] ?? matches[0]);
      else if (input.value.trim()) addExtra({ id: slug(input.value.trim()), name: input.value.trim() });
    }
  });

  input?.addEventListener("blur", () => {
    setTimeout(hideSuggest, 120);
  });
}

function wireFarmPad() {
  const input = document.getElementById("farm-extra");
  const list = document.getElementById("farm-extra-suggest");
  if (!input || !list) return;
  let active = -1;

  function hide() {
    list.hidden = true;
    list.innerHTML = "";
    active = -1;
  }

  function show(matches) {
    if (!matches.length) return hide();
    list.hidden = false;
    list.innerHTML = matches
      .map(
        (item, i) =>
          `<button type="button" class="suggest-item ${i === active ? "is-active" : ""}" data-farm-suggest-id="${esc(item.id)}" data-farm-suggest-name="${esc(item.name)}">${itemNameHtml(item.name)}</button>`
      )
      .join("");
    fillSuggestIcons(matches, () => show(matchSuggest(input.value)));
  }

  function pickTyped() {
    const matches = matchSuggest(input.value);
    const item = matches[active] || matches[0];
    if (item) farmPickItem(farmBossId(), item);
    else if (input.value.trim()) {
      const name = input.value.trim();
      farmPickItem(farmBossId(), { id: slug(name), name });
    }
  }

  input.addEventListener("input", () => {
    const matches = matchSuggest(input.value);
    active = matches.length ? 0 : -1;
    show(matches);
  });
  input.addEventListener("keydown", (event) => {
    const matches = matchSuggest(input.value);
    if (event.key === "ArrowDown" && matches.length) {
      event.preventDefault();
      active = (active + 1) % matches.length;
      show(matches);
    } else if (event.key === "ArrowUp" && matches.length) {
      event.preventDefault();
      active = (active - 1 + matches.length) % matches.length;
      show(matches);
    } else if (event.key === "Escape") hide();
    else if (event.key === "Enter") {
      event.preventDefault();
      pickTyped();
    }
  });
  input.addEventListener("blur", () => setTimeout(hide, 120));
}

function render() {
  const shown = document.getElementById("item-tip")?.dataset.for || "";
  if (ui.view === "hunt") ui.view = "dash";
  const onTitle = ui.view === "title";
  document.body.classList.toggle("on-title", onTitle);
  document.body.classList.toggle("view-bosses", ui.view === "bosses");
  document.body.classList.toggle("view-decks", ui.view === "decks");
  const title = document.getElementById("title-screen");
  if (title) {
    title.hidden = !onTitle;
    if (onTitle) paintTitleScreen();
  }
  if (onTitle) setMenuOpen(false);
  renderStats();
  renderDivineTape();
  renderFilters();
  const leagueSelect = document.getElementById("league-input");
  if (leagueSelect && [...leagueSelect.options].some((opt) => opt.value === leagueId())) {
    leagueSelect.value = leagueId();
  }
  document.querySelectorAll("[data-view]").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === ui.view);
  });
  syncBackupUi();
  document.getElementById("boss-toolbar").style.display = ui.view === "bosses" ? "flex" : "none";
  document.getElementById("stats").style.display =
    ui.view === "dash" || ui.view === "settings" || ui.view === "econ" || ui.view === "bosses" || ui.view === "decks" || onTitle ? "none" : "grid";

  if (onTitle) {
    if (shown) hideItemTip();
    paintPriceOverlay();
    updateBossScale();
    paintPriceClock();
    return;
  }

  const focused = document.activeElement?.id;
  const selStart = document.activeElement?.selectionStart;
  const main = document.getElementById("main");
  if (ui.view === "dash") {
    main.innerHTML = renderDash();
    wireFarmPad();
  }
  if (ui.view === "bosses") main.innerHTML = renderBosses();
  if (ui.view === "log") main.innerHTML = renderLogView();
  if (ui.view === "econ") {
    main.innerHTML = renderEcon();
    fillEconChart();
  }
  if (ui.view === "decks" && window.DeckGame) window.DeckGame.mount(main);
  if (ui.view === "settings") main.innerHTML = renderSettings();

  if (ui.selectedId && document.getElementById("boss-dialog").open) {
    const boss = getBoss(ui.selectedId);
    if (boss) renderBossDialog(boss);
  }
  const econSearch = document.getElementById("econ-search");
  if (econSearch) {
    econSearch.value = ui.econSearch;
    if (focused === "econ-search") {
      econSearch.focus();
      if (typeof selStart === "number") econSearch.setSelectionRange(selStart, selStart);
    }
  }
  if (shown) {
    const el = [...document.querySelectorAll("[data-tip]")].find((node) => node.dataset.tip === shown);
    if (el) showItemTip(el, shown);
    else hideItemTip();
  }
  paintPriceOverlay();
  updateBossScale();
  paintPriceClock();
}

function setMenuOpen(open) {
  const menu = document.getElementById("app-menu");
  const overlay = document.getElementById("menu-overlay");
  const btn = document.getElementById("menu-btn");
  if (!menu || !overlay) return;
  menu.hidden = !open;
  overlay.hidden = !open;
  btn?.setAttribute("aria-expanded", open ? "true" : "false");
}

function onClick(event) {
  const titleGo = event.target.closest("[data-title-go]");
  if (titleGo) {
    ui.view = titleGo.dataset.titleGo;
    setMenuOpen(false);
    render();
    if (titleGo.hasAttribute("data-feedback")) focusFeedback();
    return;
  }
  if (event.target.closest("[data-title-quit]")) {
    quitApp();
    return;
  }
  const feedbackSend = event.target.closest("[data-feedback-send]");
  if (feedbackSend) {
    event.preventDefault();
    const form = feedbackSend.closest("#feedback-form") || document.getElementById("feedback-form");
    if (form) submitFeedback(form, feedbackSend.dataset.feedbackSend);
    return;
  }
  if (event.target.id === "menu-btn" || event.target.closest("#menu-btn")) {
    const open = document.getElementById("app-menu")?.hidden;
    setMenuOpen(!!open);
    return;
  }
  if (event.target.id === "menu-overlay" || event.target.id === "menu-close") {
    setMenuOpen(false);
    return;
  }
  const toastAct = event.target.closest("[data-toast]");
  if (toastAct) {
    const toast = document.getElementById("toast");
    if (toast) toast.hidden = true;
    if (toastAct.dataset.toast === "undo") undoLastDrop();
    if (toastAct.dataset.toast === "loot") openLoot(toastAct.dataset.boss, toastAct.dataset.log);
    return;
  }
  const priceLookup = event.target.closest("[data-price-lookup]");
  if (priceLookup) {
    event.preventDefault();
    event.stopPropagation();
    lookupOnePrice(priceLookup.dataset.priceLookup);
    return;
  }
  const pickCorrupt = event.target.closest("[data-pick-corrupt]");
  if (pickCorrupt) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickCorrupt.dataset.pickLog, pickCorrupt.dataset.pickCorrupt);
    if (!drop) return;
    drop.corrupted = !drop.corrupted;
    drop.quoteTried = false;
    delete drop.quote;
    if (log?.id) save();
    if (ui.inspect) paintPriceOverlay();
    else render();
    return;
  }
  const pickRunes = event.target.closest("[data-pick-runes]");
  if (pickRunes) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickRunes.dataset.pickLog, pickRunes.dataset.pickDrop);
    setDropRunePick(log, drop, pickRunes.dataset.pickRunes);
    return;
  }
  const pickText = event.target.closest("[data-pick-text]");
  if (pickText) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickText.dataset.pickLog, pickText.dataset.pickDrop);
    toggleInspectRoll(log, drop, pickText.dataset.pickText, pickText.dataset.pickKind);
    return;
  }
  const pickRoll = event.target.closest("[data-pick-roll]");
  if (pickRoll) {
    event.preventDefault();
    event.stopPropagation();
    const log = state.logs.find((item) => item.id === pickRoll.dataset.pickLog) || liveLog();
    const drop = (log?.drops || []).find((item) => item.id === pickRoll.dataset.pickDrop);
    if (!drop) return;
    drop.rolls = normalizeRolls(drop.rolls);
    const i = Number(pickRoll.dataset.pickRoll);
    if (!drop.rolls[i]) return;
    drop.rolls[i].pick = !drop.rolls[i].pick;
    drop.quoteTried = false;
    delete drop.quote;
    save();
    if (ui.inspect) paintPriceOverlay();
    else render();
    return;
  }
  const inspectDrop = event.target.closest("[data-inspect-drop]");
  if (inspectDrop) {
    event.preventDefault();
    event.stopPropagation();
    const log = state.logs.find((item) => item.id === inspectDrop.dataset.inspectLog) || liveLog();
    const drop = (log?.drops || []).find((item) => item.id === inspectDrop.dataset.inspectDrop);
    if (drop) openInspect(log, drop);
    return;
  }
  if (event.target.closest("[data-close-inspect]")) {
    event.preventDefault();
    closeInspect();
    return;
  }
  const quoteDrop = event.target.closest("[data-quote-drop]");
  if (quoteDrop) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(quoteDrop.dataset.quoteLog, quoteDrop.dataset.quoteDrop);
    if (!drop) return;
    openInspect(log, drop);
    delete drop.quoting;
    drop.quoteTried = false;
    quoteRolledDrop(log, drop, true);
    return;
  }
  const openTrade = event.target.closest("[data-open-trade]");
  if (openTrade) {
    event.preventDefault();
    event.stopPropagation();
    const url = openTrade.dataset.openTrade;
    if (window.chrome?.webview) chrome.webview.postMessage({ type: "open-url", url });
    else window.open(url, "_blank", "noopener");
    return;
  }
  const convertMainBtn = event.target.closest("[data-convert-main]");
  if (convertMainBtn) {
    event.preventDefault();
    event.stopPropagation();
    setConvertMain(convertMainBtn.dataset.convertMain);
    return;
  }
  if (event.target.closest("[data-check-prices]")) {
    refreshPrices(true);
    return;
  }
  const farmNext = event.target.closest("[data-farm-next]");
  if (farmNext) {
    finishFarmKill();
    return;
  }
  const farmDrop = event.target.closest("[data-farm-drop]");
  if (farmDrop) {
    const boss = getBoss(farmBossId());
    const item = (boss?.uniques || []).find((unique) => unique.id === farmDrop.dataset.farmDrop);
    if (item) farmPickItem(boss.id, item);
    return;
  }
  const farmSuggest = event.target.closest("[data-farm-suggest-id]");
  if (farmSuggest) {
    farmPickItem(farmBossId(), { id: farmSuggest.dataset.farmSuggestId, name: farmSuggest.dataset.farmSuggestName });
    return;
  }
  const farm = event.target.closest("[data-farm]");
  if (farm) {
    state.farmBossId = farm.dataset.farm;
    ui.inspect = null;
    ui.dashRollId = null;
    ui.view = "dash";
    clearLiveKill();
    document.getElementById("boss-dialog")?.close();
    save();
    render();
    return;
  }
  const plus = event.target.closest("[data-plus]");
  if (plus) {
    event.stopPropagation();
    finishFarmKill();
    return;
  }
  const minus = event.target.closest("[data-minus]");
  if (minus) {
    event.stopPropagation();
    undoLastDrop(minus.dataset.minus);
    return;
  }
  const loot = event.target.closest("[data-loot]");
  if (loot) {
    event.stopPropagation();
    openLoot(loot.dataset.loot);
    return;
  }
  const step = event.target.closest("[data-boss-step]");
  if (step) {
    event.stopPropagation();
    stepBoss(Number(step.dataset.bossStep));
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) {
    openBoss(open.dataset.open);
    return;
  }
  const filter = event.target.closest("[data-filter]");
  if (filter) {
    ui.filter = filter.dataset.filter;
    render();
    return;
  }
  const econAll = event.target.closest("[data-econ-all]");
  if (econAll) {
    pickEconAll();
    render();
    return;
  }
  const econCat = event.target.closest("[data-econ-cat]");
  if (econCat) {
    pickEconCat(econCat.dataset.econCat);
    render();
    return;
  }
  const econMode = event.target.closest("[data-econ-mode]");
  if (econMode) {
    syncEconMode(econMode.dataset.econMode);
    render();
    return;
  }
  if (event.target.closest("[data-econ-chart-close]")) {
    ui.econChart = null;
    render();
    return;
  }
  const econOpen = event.target.closest("[data-econ-open]");
  if (econOpen) {
    const type = econOpen.dataset.econType;
    const name = econOpen.dataset.econOpen;
    const ninjaId = econOpen.dataset.econId;
    const same = ui.econChart && ui.econChart.name === name && String(ui.econChart.ninjaId ?? "") === String(ninjaId ?? "");
    if (same) ui.econChart = null;
    else {
      const row = (prices.tables[type] || []).find((item) => item.name === name && String(item.ninjaId ?? "") === String(ninjaId ?? ""))
        || (prices.tables[type] || []).find((item) => item.name === name);
      ui.econChart = row ? { ...row, type: row.type || type } : { name, type, ninjaId, kind: econOpen.dataset.econKind };
    }
    render();
    return;
  }
  const tab = event.target.closest("[data-view]");
  if (tab) {
    ui.view = tab.dataset.view;
    setMenuOpen(false);
    render();
    if (tab.hasAttribute("data-feedback")) focusFeedback();
    return;
  }
  const close = event.target.closest("[data-close]");
  if (close) {
    document.getElementById(close.dataset.close)?.close();
    return;
  }
  const del = event.target.closest("[data-delete-log]");
  if (del) {
    deleteLog(del.dataset.deleteLog);
    return;
  }
  const removeCustom = event.target.closest("[data-remove-custom]");
  if (removeCustom) {
    if (!confirm("Remove this custom boss? Kill history for it stays in the loot log.")) return;
    state.customBosses = state.customBosses.filter((boss) => boss.id !== removeCustom.dataset.removeCustom);
    document.getElementById("boss-dialog").close();
    save();
    render();
    return;
  }
  const bind = event.target.closest("[data-hotkey-bind]");
  if (bind) {
    const slot = bind.dataset.hotkeyBind === "next" ? "next" : bind.dataset.hotkeyBind === "price" ? "price" : "log";
    if (ui.hotkeyCapture === slot) {
      ui.hotkeyCapture = "";
      syncHotkeys();
    } else {
      ui.hotkeyCapture = slot;
      pauseHotkeys();
    }
    render();
    return;
  }
  if (event.target.closest("[data-theme-reset]")) {
    state.theme = themeDefaults();
    save();
    applyTheme();
    render();
    return;
  }
  const backupWhere = event.target.closest("[data-backup-where]");
  if (backupWhere) {
    setBackupFolder(backupWhere.dataset.backupWhere);
    return;
  }
  const preset = event.target.closest("[data-theme-preset]");
  if (preset) {
    const next = THEME_PRESETS[preset.dataset.themePreset];
    if (next) {
      const { label, ...look } = next;
      setTheme(look, preset.dataset.themePreset);
      render();
    }
    return;
  }
  if (event.target.id === "add-boss-btn") {
    document.getElementById("custom-dialog").showModal();
    return;
  }
  if (event.target.id === "custom-cancel") {
    document.getElementById("custom-dialog").close();
    return;
  }
  if (event.target.closest("#export-btn, #settings-export-btn")) {
    setMenuOpen(false);
    exportData();
    return;
  }
  if (event.target.closest("#import-btn, #settings-import-btn")) {
    setMenuOpen(false);
    importBackup();
  }
}

function onChange(event) {
  const convertMainBox = event.target.closest("[data-convert-main]");
  if (convertMainBox) {
    setConvertMain(convertMainBox.dataset.convertMain);
    return;
  }
  if (event.target.id === "league-input") {
    persistPrices();
    clearTimeout(persistPricesSoon.timer);
    const next = event.target.value;
    state.league = next;
    save();
    hydratePriceCache();
    prices.league = next;
    if (prices.byName.size) {
      prices.cached = true;
      prices.status = "ready";
    }
    render();
    hydratePriceDisk().then(() => {
      paintLivePrices();
      render();
      kickFirstPriceCheck();
    });
    return;
  }
  if (event.target.id === "farm-boss") {
    state.farmBossId = event.target.value;
    ui.inspect = null;
    ui.dashRollId = null;
    clearLiveKill();
    save();
    render();
    return;
  }
  if (event.target.id === "search") {
    ui.search = event.target.value;
    render();
    return;
  }
  if (event.target.id === "econ-search") {
    ui.econSearch = event.target.value;
    render();
    return;
  }
  const font = event.target.closest("[data-theme-font]");
  if (font) {
    setTheme({ [font.dataset.themeFont]: font.value });
    render();
    return;
  }
  const claim = event.target.closest("[data-claim]");
  if (claim) {
    const key = claim.dataset.claim + "::" + claim.dataset.reward;
    if (event.target.checked) state.claimed[key] = true;
    else delete state.claimed[key];
    save();
  }
}

document.addEventListener("click", onClick);
document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("change", onChange);
document.addEventListener("input", (event) => {
  const theme = event.target.closest("[data-theme]");
  if (theme) {
    setTheme({ [theme.dataset.theme]: theme.value });
    return;
  }
  if (event.target.id === "search" || event.target.id === "econ-search") {
    onChange(event);
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "loot-form") {
    event.preventDefault();
    const form = event.target;
    const bossId = form.dataset.boss;
    const drops = [];
    form.querySelectorAll("[data-drop-id]").forEach((box) => {
      if (!box.checked) return;
      const qtyInput = form.querySelector(`[data-qty="${box.dataset.dropId}"]`);
      drops.push({
        uniqueId: box.dataset.dropId,
        name: box.dataset.dropName,
        qty: Math.max(1, Number(qtyInput?.value || 1)),
      });
    });
    form.querySelectorAll("[data-extra-id]").forEach((chip) => {
      const qty = Math.max(1, Number(chip.querySelector("[data-extra-qty]")?.value || 1));
      drops.push({
        uniqueId: chip.dataset.extraId,
        name: chip.dataset.extraName,
        qty,
      });
    });
    const typed = form.querySelector("#extra-input")?.value?.trim();
    if (typed) drops.push({ uniqueId: slug(typed), name: typed, qty: 1 });
    if (!drops.length) {
      const error = form.querySelector("#loot-error");
      if (error) error.hidden = false;
      return;
    }
    const logId = form.dataset.log;
    if (logId) {
      const log = state.logs.find((item) => item.id === logId);
      if (log) {
        log.drops = drops;
        log.bossId = bossId;
        save();
        render();
      } else {
        addKill(bossId, { drops });
      }
    } else {
      addKill(bossId, { drops });
    }
    ui.editLogId = "";
    clearLiveKill();
    document.getElementById("log-dialog").close();
    return;
  }
  if (event.target.id === "custom-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    state.customBosses.push({
      id: "custom-" + uid(),
      name,
      category: "custom",
      group: String(data.get("group") || "Custom").trim() || "Custom",
      act: "custom",
      area: String(data.get("area") || "").trim(),
      optional: true,
      uniques: [],
      rewards: [],
    });
    save();
    ui.filter = "custom";
    ui.bossId = state.customBosses.at(-1).id;
    event.target.reset();
    document.getElementById("custom-dialog").close();
    render();
  }
  if (event.target.id === "feedback-form") {
    event.preventDefault();
    submitFeedback(event.target, "send");
  }
});

document.getElementById("import-file").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importData(file);
  event.target.value = "";
});

document.addEventListener("keydown", (event) => {
  if (ui.hotkeyCapture) {
    event.preventDefault();
    if (event.key === "Escape") {
      ui.hotkeyCapture = "";
      syncHotkeys();
      render();
      return;
    }
    const spec = formatHotkey(event);
    if (!spec) return;
    if (!assignHotkey(ui.hotkeyCapture, spec)) return;
    ui.hotkeyCapture = "";
    save();
    syncHotkeys();
    render();
    return;
  }
  if (event.key === "Escape" && ui.inspect) {
    event.preventDefault();
    closeInspect();
    return;
  }
  if (event.key === "Escape" && document.getElementById("app-menu") && !document.getElementById("app-menu").hidden) {
    event.preventDefault();
    setMenuOpen(false);
    return;
  }
  if (event.key === "Escape") hideItemTip();
  if (event.target.closest("input, textarea, select, dialog")) return;
  if (document.querySelector("dialog[open]")) return;
  if (ui.view === "bosses" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
    stepBoss(event.key === "ArrowRight" ? 1 : -1);
    return;
  }
  if (event.key === "k" || event.key === "K" || event.code === "Space") {
    event.preventDefault();
    finishFarmKill();
  }
});

function itemTipHtml(name, lore, loading) {
  const note = catalogNoteFor(name);
  const seen = new Set();
  function renderLines(list, cls) {
    return (list || [])
      .map((text) => cleanMod(text))
      .filter((text) => {
        if (!text) return false;
        const key = modFamily(text);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((text) => `<div class="${cls}">${esc(text)}</div>`)
      .join("");
  }
  const props = renderLines((lore?.properties || []).slice(0, 4), "item-tip-prop");
  const implicits = renderLines(lore?.implicits, "item-tip-mod implicit");
  const explicits = renderLines(lore?.explicits, "item-tip-mod");
  const kind = (lore?.rarity || "Unique").toLowerCase();
  const flavour = lore?.flavour || "";
  const descr = lore?.descr && flavour && lore.descr.toLowerCase() === flavour.toLowerCase() ? "" : lore?.descr || "";
  const empty = !implicits && !explicits && !descr && !flavour && !props;
  return `<div class="item-tip-card ${esc(kind)}">
    <div class="item-tip-head">
      ${itemIconHtml(name, "lg")}
      <div>
        <div class="item-tip-name">${esc(lore?.name || name)}</div>
        <div class="item-tip-base">${esc(lore?.baseType || lore?.rarity || "")}</div>
      </div>
    </div>
    ${props}
    ${implicits}
    ${explicits}
    ${flavour ? `<div class="item-tip-flavour">${esc(flavour)}</div>` : ""}
    ${descr ? `<div class="item-tip-descr">${esc(descr)}</div>` : ""}
    ${empty && loading ? `<div class="item-tip-descr">Looking up what this does…</div>` : ""}
    ${empty && !loading && !note ? `<div class="item-tip-descr">No extra text for this one yet.</div>` : ""}
    ${note ? `<div class="item-tip-note">${esc(note)}</div>` : ""}
  </div>`;
}

function placeItemTip(anchor, tip) {
  const pad = 8;
  const rect = anchor.getBoundingClientRect();
  const box = tip.getBoundingClientRect();
  let left = rect.right + 12;
  let top = rect.top;
  if (left + box.width > window.innerWidth - pad) left = rect.left - box.width - 12;
  if (left < pad) left = pad;
  if (top + box.height > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - box.height - pad);
  if (top < pad) top = pad;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function hideItemTip() {
  const tip = document.getElementById("item-tip");
  if (!tip) return;
  tip.hidden = true;
  tip.dataset.for = "";
  tip.innerHTML = "";
}

function showItemTip(anchor, name) {
  const tip = document.getElementById("item-tip");
  if (!tip || !name) return;
  const lore = lookupLore(name);
  tip.hidden = false;
  tip.dataset.for = name;
  tip.innerHTML = itemTipHtml(name, lore, !loreIsRich(lore));
  placeItemTip(anchor, tip);
  const needDb = !lore?.flavour && !lore?.descr;
  if (loreIsRich(lore) && !needDb) return;
  fetchDbIcon(name).then(() => {
    if (tip.dataset.for !== name || tip.hidden) return;
    tip.innerHTML = itemTipHtml(name, lookupLore(name), false);
    placeItemTip(anchor, tip);
  });
}

let tipTimer = 0;
document.addEventListener("pointerover", (event) => {
  const el = event.target.closest("[data-tip]");
  if (!el?.dataset.tip) return;
  const name = el.dataset.tip;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => showItemTip(el, name), 160);
});
document.addEventListener("pointerout", (event) => {
  const el = event.target.closest("[data-tip]");
  if (!el) return;
  if (event.relatedTarget && el.contains(event.relatedTarget)) return;
  if (event.relatedTarget?.closest?.("[data-tip]")) return;
  clearTimeout(tipTimer);
  hideItemTip();
});
document.addEventListener("scroll", hideItemTip, true);

function seedReliquaryLore() {
  const flavour = "They knew the truth, but had no choice. Generations hence, perhaps, one day, there would be a chance.";
  const descr = "Open a Reliquary portal by using this item at The Reliquary Vault. Can only be used once.";
  for (const boss of allBosses()) {
    for (const item of boss.uniques || []) {
      if (!/reliquary key/i.test(item.name)) continue;
      rememberLore(item.name, {
        name: item.name,
        baseType: "Vault Key",
        rarity: "Currency",
        flavour,
        descr,
      });
    }
  }
}

seedReliquaryLore();
hydratePriceCache();
refreshBackupInfo();
render();
startPriceClock();
startRateBar();
syncHotkeys();
const diskPrices = hydratePriceDisk();
loadLeagues().then(() => diskPrices).then(() => {
  if (!prices.byName.size) hydratePriceCache();
  linkCatalogPrices();
  paintPriceClock();
  paintLivePrices();
  render();
  if (prices.byName.size) persistCatalogCache();
  kickFirstPriceCheck();
});
