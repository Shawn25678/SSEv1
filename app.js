const STORAGE_KEY = "poe2-exile-ledger-v1";

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
  econType: "Currency",
  econTypes: ["Currency"],
  econAll: false,
  econSearch: "",
  econMode: "browse",
  econChart: null,
  bossId: "",
};

let liveKill = { logId: null, bossId: null };

const backupInfo = { folder: "", downloads: "" };

const sessionStarted = Date.now();
let toastTimer = 0;
const ninjaWait = new Map();
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
    display: "Cinzel",
    ui: "Outfit",
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
    display: "Cinzel",
    ui: "Outfit",
  },
  midnight: {
    label: "Midnight",
    gold: "#7aa2c8",
    gold2: "#c5d8ea",
    crimson: "#5b6ea8",
    bg: "#0a0d12",
    panel: "#12161c",
    ink: "#e6eef6",
    muted: "#8a97a8",
    unique: "#8eb4d4",
    danger: "#c45a4c",
    ok: "#7d9a5a",
    citadel: "#5b6ea8",
    display: "Playfair Display",
    ui: "Inter",
  },
  parchment: {
    label: "Parchment",
    gold: "#8a6a32",
    gold2: "#c4a46a",
    crimson: "#8c4a32",
    bg: "#1a1610",
    panel: "#241e16",
    ink: "#f2e6cc",
    muted: "#a89878",
    unique: "#c4a46a",
    danger: "#c45a4c",
    ok: "#7d9a5a",
    citadel: "#8a6a32",
    display: "Cinzel Decorative",
    ui: "Literata",
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
    display: "Caudex",
    ui: "Nunito Sans",
  },
};

const FONT_DISPLAY = [
  "Cinzel",
  "Cinzel Decorative",
  "Playfair Display",
  "Spectral",
  "Caudex",
  "Uncial Antiqua",
  "EB Garamond",
  "Cormorant Garamond",
  "Libre Baskerville",
  "IM Fell English",
  "Marcellus",
  "Forum",
  "Aboreto",
  "MedievalSharp",
  "Almendra",
  "Metamorphous",
  "Pirata One",
  "Cardo",
  "Crimson Pro",
  "Old Standard TT",
  "UnifrakturMaguntia",
  "Bellefair",
];
const FONT_UI = [
  "Outfit",
  "Inter",
  "Source Sans 3",
  "Nunito Sans",
  "Literata",
  "Atkinson Hyperlegible",
  "Roboto",
  "Open Sans",
  "Lato",
  "Karla",
  "IBM Plex Sans",
  "Figtree",
  "Manrope",
  "DM Sans",
  "Work Sans",
  "Barlow",
  "Rubik",
  "Cabin",
  "Mulish",
  "Jost",
  "Plus Jakarta Sans",
  "Sora",
  "Albert Sans",
  "Source Serif 4",
  "Newsreader",
];

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
    ui: exile.ui,
  };
}

function currentTheme() {
  return { ...themeDefaults(), ...(state.theme || {}) };
}

function fontHref(display, ui) {
  function fam(name) {
    return "family=" + encodeURIComponent(name).replace(/%20/g, "+") + ":wght@400;500;600;700";
  }
  return "https://fonts.googleapis.com/css2?" + fam(display) + "&" + fam(ui) + "&display=swap";
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
  root.style.setProperty("--font-display", `"${t.display}", serif`);
  root.style.setProperty("--font-ui", `"${t.ui}", system-ui, sans-serif`);
  const link = document.getElementById("theme-fonts");
  if (link) link.href = fontHref(t.display, t.ui);
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

function tradeFetch(name, league, bust = false, thorough = false) {
  if (!window.chrome?.webview) return Promise.reject(new Error("trade needs the desktop app"));
  return webviewJson({ type: "trade", name, league, bust: !!bust, thorough: !!thorough }, 45000, "PoE 2 trade timed out");
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

function rememberPrice(name, divine, listings, icon, amount, unit, source) {
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

function convertView() {
  const units = allConvertUnits();
  const unit = state.convertView || convertMain();
  return units.includes(unit) ? unit : convertMain();
}

function convertQuote() {
  return nextConvertUnit(convertView(), 1);
}

function setConvertMain(unit) {
  if (!allConvertUnits().includes(unit)) return;
  state.convertMain = unit;
  state.convertView = unit;
  save();
  render();
}

function swapConvert() {
  state.convertView = nextConvertUnit(convertView(), 1);
  save();
  renderDivineTape();
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
    checked ? "Checked just now — click to try poe.ninja and PoE 2 trade again" : "Click to check poe.ninja and PoE 2 trade"
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
  return (state.league || "Forbidden Rites").trim();
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

const PRICE_REFRESH_MS = 20 * 60 * 1000;
const PRICE_RETRY_MS = 3 * 60 * 1000;
const PRICE_CACHE_KEY = "poe2-exile-ledger-prices-v1";
const PRICE_CACHE_FRESH_MS = 5 * 60 * 1000;

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

function compactPriceTables(tables = prices.tables) {
  const out = {};
  for (const [type, rows] of Object.entries(tables || {})) {
    if (!Array.isArray(rows) || !rows.length) continue;
    out[type] = rows.map((row) => ({
      name: row.name,
      divine: row.divine,
      amount: row.amount,
      unit: row.unit,
      listings: row.listings || 0,
      icon: row.icon || "",
      baseType: row.baseType || "",
      ninjaId: row.ninjaId,
      kind: row.kind,
      type: row.type || type,
      spark: row.spark,
      corrupted: row.corrupted,
    }));
  }
  return out;
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
  const entry = {
    league,
    fetchedAt: prices.fetchedAt || 0,
    nextAt: prices.nextAt || 0,
    primary: prices.primary,
    exaltedPerDivine: prices.exaltedPerDivine,
    chaosPerDivine: prices.chaosPerDivine,
    items: uniquePricedHits(),
    tables: compactPriceTables(),
  };
  const store = readPriceStore();
  store.leagues[league] = entry;
  const ranked = Object.entries(store.leagues).sort((a, b) => (b[1]?.fetchedAt || 0) - (a[1]?.fetchedAt || 0));
  store.leagues = Object.fromEntries(ranked.slice(0, 3));
  try {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ version: 2, leagues: store.leagues }));
  } catch {
    try {
      entry.tables = {};
      store.leagues[league] = entry;
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ version: 2, leagues: store.leagues }));
    } catch {
      /* quota */
    }
  }
}

function persistPricesSoon() {
  clearTimeout(persistPricesSoon.timer);
  persistPricesSoon.timer = setTimeout(persistPrices, 400);
}

function hydratePriceCache() {
  try {
    const dump = readPriceStore().leagues[leagueId()];
    if (!dump || !Array.isArray(dump.items) || !dump.items.length) return false;
    prices.byName = new Map();
    prices.tables = dump.tables && typeof dump.tables === "object" ? dump.tables : {};
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
    for (const row of dump.items) applyPriceRow(row, { cached: true });
    return true;
  } catch {
    return false;
  }
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
    clock.title = "Click to check poe.ninja, then auto-check every drop on the dashboard from PoE 2 trade.";
  }
  if (!el) return;
  let text = "Check prices";
  if (prices.status === "loading") text = "Checking…";
  else if (prices.filling || prices.looking.size) text = prices.looking.size ? `Listings ${prices.looking.size}…` : "Checking listings…";
  else if (prices.fetchedAt) text = (prices.cached ? "Last recorded " : "Checked ") + formatWhen(prices.fetchedAt);
  else if (prices.byName.size) text = "Last recorded";
  if (el.textContent !== text) el.textContent = text;
}

function startPriceClock() {
  if (startPriceClock.started) return;
  startPriceClock.started = true;
  paintPriceClock();
  setInterval(paintPriceClock, 1000);
}

async function refreshPrices(force = false) {
  if (prices.status === "loading" || prices.filling) return;
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
    prices.byName = new Map();
    prices.tables = {};
    prices.history = {};
    bustPriceLookup();
    prices.primary = "divine";
    prices.exaltedPerDivine = 0;
    prices.chaosPerDivine = 0;
    ingestExchange(currency, "Currency");
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
    rest.filter(Boolean).forEach((pack) => {
      if (!pack.data) return;
      if (pack.items) ingestItems(pack.data, pack.type);
      else ingestExchange(pack.data, pack.type);
    });
    if (!prices.byName.size) throw new Error("No poe.ninja prices returned");
    restoreCachedMisses(snapshotMap);
    restoreCachedTables(snapshotTables);
    linkCatalogPrices();
    prices.league = league;
    prices.fetchedAt = Date.now();
    prices.nextAt = 0;
    prices.cached = false;
    prices.status = "ready";
    prices.checkedEmpty = new Set();
    persistPrices();
    render();
    await fillGapPrices();
    prefetchMissingIcons();
  } catch (err) {
    prices.error = err.message || "Could not reach poe.ninja";
    prices.nextAt = 0;
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
      await fillGapPrices();
    } else if (prices.byName.size) {
      prices.cached = true;
      prices.status = "ready";
      persistPricesSoon();
      render();
      await fillGapPrices();
    } else {
      prices.status = "error";
    }
  }
  paintPriceClock();
  render();
}

async function fillGapPrices() {
  if (!window.chrome?.webview) return;
  try {
    await fillScoutPrices();
  } catch {
    /* ninja still stands */
  }
  try {
    await fillTradePrices();
  } catch {
    /* keep whatever we have */
  }
  persistPrices();
}

function wantsGapPrice(name) {
  return !pricedHit(lookupPrice(name));
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

function missingCatalogNames() {
  const farmId = farmBossId();
  const dash = new Set(dashboardPriceNames());
  const ranked = [];
  const seen = new Set();
  allBosses().forEach((boss) => {
    (boss.uniques || []).forEach((item) => {
      if (!item?.name || seen.has(item.name) || !wantsGapPrice(item.name)) return;
      seen.add(item.name);
      let rank = 3;
      if (dash.has(item.name)) rank = -1;
      else if (boss.id === farmId) rank = 0;
      else if (item.rarity === "extremely-rare") rank = 1;
      else if (item.rarity === "very-rare") rank = 2;
      ranked.push({ name: item.name, rank });
    });
  });
  dashboardPriceNames().forEach((name) => {
    if (seen.has(name) || !wantsGapPrice(name)) return;
    seen.add(name);
    ranked.push({ name, rank: -1 });
  });
  return ranked.sort((a, b) => a.rank - b.rank).map((row) => row.name);
}

async function fillScoutPrices() {
  const data = await scoutFetch(leagueId());
  const rows = Array.isArray(data) ? data : [];
  let added = 0;
  for (const item of rows) {
    const name = item.Name || item.name || "";
    const amount = Number(item.CurrentPrice ?? item.currentPrice);
    if (!name || !(amount > 0)) continue;
    const hit = lookupPrice(name);
    if (pricedHit(hit) && !hit.cached) continue;
    const divine = toDivine(amount, "exalted");
    rememberPrice(name, divine, 0, item.IconUrl || item.iconUrl, amount, "exalted", "scout");
    added++;
  }
  if (added) {
    persistPricesSoon();
    paintLivePrices();
  }
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
  rememberPrice(name, divine, row.listings || 0, "", amount, unit, "trade");
  if (row.name && row.name !== name) rememberPrice(row.name, divine, row.listings || 0, "", amount, unit, "trade");
  prices.checkedEmpty.delete(name);
  return true;
}

async function probeTradePrice(name) {
  linkCatalogPrices();
  if (pricedHit(lookupPrice(name))) {
    prices.checkedEmpty.delete(name);
    return true;
  }
  const tableHit = hitFromTables(name);
  if (tableHit) {
    rememberPrice(name, tableHit.divine, tableHit.listings, tableHit.icon, tableHit.amount, tableHit.unit, tableHit.source || "ninja");
    prices.checkedEmpty.delete(name);
    persistPrices();
    return true;
  }
  if (!window.chrome?.webview) return false;
  for (const alias of tradeAliases(name)) {
    try {
      const row = await tradeFetch(alias, leagueId(), true, true);
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

async function fillTradePrices() {
  if (!window.chrome?.webview) return;
  const queue = dashboardPriceNames().filter((name) => wantsGapPrice(name));
  if (!queue.length) return;
  prices.filling = true;
  queue.forEach((name) => prices.looking.add(name));
  paintPriceClock();
  render();
  try {
    for (const name of queue) {
      try {
        await probeTradePrice(name);
      } catch (err) {
        if (tradeRateError(err)) {
          showToast("PoE 2 trade hit a rate limit. Wait a minute, then Check prices again for the rest.");
          break;
        }
        if (tradeBlockedError(err)) {
          showToast("PoE 2 trade blocked the request. Wait and try Check prices again.");
          break;
        }
        prices.checkedEmpty.add(name);
      } finally {
        prices.looking.delete(name);
        paintLivePrices();
      }
      await sleep(1600);
    }
  } finally {
    queue.forEach((name) => prices.looking.delete(name));
    prices.filling = false;
    persistPrices();
    paintPriceClock();
    render();
  }
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
  const existing = log.drops.find((item) => (item.uniqueId || item.name) === (drop.uniqueId || drop.name));
  if (existing) {
    existing.qty = (existing.qty || 1) + (drop.qty || 1);
    if (drop.rolls?.length) existing.rolls = (existing.rolls || []).concat(drop.rolls);
    return;
  }
  log.drops.push(drop);
}

function toastKill(boss, log) {
  const names = (log.drops || []).map((drop) => drop.name + (drop.qty > 1 ? " ×" + drop.qty : "")).join(", ") || "nothing dropped";
  showToast(boss.name + " · " + names + " · tap more drops from this kill, or Next kill", [
    { id: "undo", label: "Undo", logId: log.id },
  ]);
}

function farmLogDrop(bossId, drop) {
  const boss = getBoss(bossId);
  if (!boss || !drop) return;
  ui.dashRollId = null;
  const open = liveLog();
  if (open && open.bossId === bossId) {
    mergeDrop(open, drop);
    save();
    render();
    toastKill(boss, open);
    return;
  }
  const log = {
    id: uid(),
    bossId,
    at: Date.now(),
    drops: [drop],
  };
  state.logs.unshift(log);
  state.farmBossId = bossId;
  liveKill = { logId: log.id, bossId };
  save();
  render();
  toastKill(boss, log);
}

function finishFarmKill() {
  if (!liveLog()) return;
  clearLiveKill();
  render();
}

function farmPickItem(bossId, item) {
  if (!item?.name) return;
  if (item.rolls) {
    ui.dashRollId = item.id;
    render();
    return;
  }
  farmLogDrop(bossId, { uniqueId: item.id, name: item.name, qty: 1 });
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
  const session = sessionLogs();
  const sessionValue = totalLootValue(session);
  const allValue = totalLootValue();
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
      if (ui.dashRollId === item.id) {
        return `<div class="drop-tile is-open" ${itemHoverAttr(item.name)}>
          ${itemIconHtml(item.name, "lg")}
          <div class="drop-copy">
            <div class="unique-name">${esc(item.name)} ${priceChip(item.name)}</div>
            ${rollCaptureHtml(item, false)}
            <div class="farm-actions">
              <button class="btn ghost" data-farm-roll-cancel type="button">Cancel</button>
              <button class="btn gold" data-farm-roll-save="${esc(item.id)}" type="button">Log it</button>
            </div>
          </div>
        </div>`;
      }
      return `<button class="drop-tile${onKill.has(item.id) ? " is-on-kill" : ""}" data-farm-drop="${esc(item.id)}" ${itemHoverAttr(item.name)} type="button">
        ${itemIconHtml(item.name, "lg")}
        <span class="drop-copy">
          <span class="unique-name">${esc(item.name)}</span>
          <span class="drop-meta">${qty} · ${esc(formatPct(hits[item.id] || 0, kills))}${item.rolls ? " · needs rolls" : ""} ${priceChip(item.name)}</span>
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
            <div class="muted">Tap every drop from this fight. It stays one kill until you hit Next kill.</div>
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
                  ${dropPills(liveForFarm.drops)}
                </div>
                <button class="btn gold" data-farm-next type="button">Next kill</button>
              </div>`
            : ""
        }
        <div class="drop-grid">
          ${dropTiles || `<p class="muted" style="grid-column:1/-1">No catalog drops for this boss. Use Something else.</p>`}
          ${
            ui.dashRollId && !(farm?.uniques || []).some((item) => item.id === ui.dashRollId)
              ? (() => {
                  const item = uniqueById(ui.dashRollId);
                  if (!item) return "";
                  return `<div class="drop-tile is-open" ${itemHoverAttr(item.name)}>
                    ${itemIconHtml(item.name, "lg")}
                    <div class="drop-copy">
                      <div class="unique-name">${esc(item.name)} ${priceChip(item.name)}</div>
                      ${rollCaptureHtml(item, false)}
                      <div class="farm-actions">
                        <button class="btn ghost" data-farm-roll-cancel type="button">Cancel</button>
                        <button class="btn gold" data-farm-roll-save="${esc(item.id)}" type="button">Log it</button>
                      </div>
                    </div>
                  </div>`;
                })()
              : ""
          }
        </div>
        <div class="farm-foot">
          <div class="suggest-wrap farm-extra">
            <input id="farm-extra" type="text" autocomplete="off" spellcheck="false" placeholder="Something else — divine, mirror, unique…" />
            <div class="suggest-list" id="farm-extra-suggest" hidden></div>
          </div>
          <button class="btn ghost" data-minus="${esc(farmId)}" ${kills ? "" : "disabled"} type="button">Undo</button>
        </div>
      </article>
      <div class="dash-stats">
        <article class="stat"><span>This session</span><b>${session.length}</b></article>
        <article class="stat"><span>Session value</span><b>${valueHtml(sessionValue)}</b></article>
        <article class="stat"><span>Logged value</span><b>${valueHtml(allValue)}</b></article>
        <article class="stat"><span>Prices</span><b class="stat-note">${prices.status === "ready" ? valueHtml(lookupPrice("Divine Orb")?.divine || 1) : "—"}</b></article>
      </div>
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
                    ${dropPills(log.drops)}
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
  const types = selectedEconTypes();
  const rows = gatherEconRows();
  const single = !ui.econAll && types.length === 1;
  const byAbs = (a, b) => Math.abs(trendChange(b)) - Math.abs(trendChange(a)) || a.name.localeCompare(b.name);
  const up = rows.filter((row) => trendChange(row) >= 0.05).sort(byAbs);
  const down = rows.filter((row) => trendChange(row) <= -0.05).sort(byAbs);
  const flat = single
    ? rows
        .filter((row) => Math.abs(trendChange(row)) < 0.05)
        .sort(
          (a, b) =>
            (Number.isFinite(b.divine) ? b.divine : -1) - (Number.isFinite(a.divine) ? a.divine : -1) ||
            a.name.localeCompare(b.name)
        )
    : [];
  if (!single) return { up: up.slice(0, 16), down: down.slice(0, 16), flat: [] };
  return { up, down, flat };
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
      const scopeLabel = ui.econAll ? "all items" : NINJA_LABELS[ui.econType] || "this category";
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
  const view = convertView();
  const quote = convertQuote();
  const checks = `<p class="muted rate-card-note">Item prices use this currency. The ⇄ button only flips the rate next to Convert.</p>
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
  const oneView = amountFromDivine(amountInDivine(1, view), quote);
  btn.innerHTML = `${itemIconHtml(currencyNameForUnit(view), "xs")}1${unitShort(view)} = ${itemIconHtml(
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
  let uniqueDrops = 0;
  for (const log of state.logs) {
    for (const drop of log.drops || []) uniqueDrops += drop.qty || 1;
  }
  const killsWithLoot = state.logs.filter((log) => (log.drops || []).length > 0).length;
  document.getElementById("stats").innerHTML = `
    <article class="stat"><span>Total kills</span><b>${totalKills}</b></article>
    <article class="stat"><span>Logged drops</span><b>${uniqueDrops}</b></article>
    <article class="stat"><span>Loot value</span><b>${valueHtml(totalLootValue())}</b></article>
    <article class="stat"><span>Loot rate</span><b>${esc(formatPct(killsWithLoot, totalKills))}</b></article>
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
          ${dropPills(log.drops)}
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
        <h3>Fonts</h3>
        <div class="settings-grid" style="margin-top:12px">
          <label class="league-field">
            <span>Titles</span>
            <select data-theme-font="display">${fontOptions(FONT_DISPLAY, t.display)}</select>
          </label>
          <label class="league-field">
            <span>Body</span>
            <select data-theme-font="ui">${fontOptions(FONT_UI, t.ui)}</select>
          </label>
        </div>
        <p class="muted" style="margin-top:12px">Titles use ${esc(t.display)}. Everything else uses ${esc(t.ui)}.</p>
        <div class="font-preview">
          <h3>The King in the Mists</h3>
          <p>Divine Orb · Exalted Orb · ${esc(t.ui)} on body text</p>
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
      const id = drop.uniqueId || slug(drop.name);
      if (!copiesByUnique.has(id)) copiesByUnique.set(id, { name: drop.name, copies: [] });
      copiesByUnique.get(id).copies.push({ at: log.at, rolls: drop.rolls });
    }
  }
  const rollHistory = [...copiesByUnique.values()]
    .map(
      (group) => `<div>
        <h3>${esc(group.name)} rolls</h3>
        <p class="muted">Each copy you logged, with the mods that actually matter for price.</p>
        <div class="log-list" style="margin-top:10px">${group.copies
          .map(
            (copy) => `<div class="log-item"><div class="when">${esc(formatWhen(copy.at))}</div><div class="roll-lines">${copy.rolls
              .map((roll) => `<div>${esc(roll)}</div>`)
              .join("")}</div></div>`
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
                  return `<div class="log-item"><div class="when">${esc(formatWhen(log.at))}</div>${dropPills(log.drops)}</div>`;
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

function rollCaptureHtml(item, hidden = true) {
  if (!item?.rolls) return "";
  const pool = ROLL_POOLS[item.rolls.pool] || [];
  const slots = item.rolls.slots || (pool.length ? 4 : 1);
  const hint = item.rolls.hint || "Log the rolls. That's what the price hangs on.";
  const picker = pool.length
    ? `<div class="chips" data-roll-chips></div>
        <div class="suggest-wrap">
          <input data-roll-input autocomplete="off" spellcheck="false" placeholder="Type a mod, e.g. wasting, spirit, armour…" data-roll-pool="${esc(item.rolls.pool)}" data-roll-slots="${slots}" />
          <div class="suggest-list" data-roll-suggest hidden></div>
        </div>`
    : "";
  return `
    <div class="roll-capture" data-rolls-for="${esc(item.id)}" ${hidden ? "hidden" : ""}>
      <p class="muted">${esc(hint)}</p>
      ${picker}
      <textarea data-roll-paste rows="3" placeholder="Or paste the mods from the tooltip, one per line"></textarea>
    </div>`;
}

function collectRolls(panel) {
  if (!panel) return [];
  const chips = [...panel.querySelectorAll("[data-roll-chip]")].map((el) => el.dataset.rollText).filter(Boolean);
  const paste = panel.querySelector("[data-roll-paste]")?.value || "";
  const lines = paste
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const merged = [];
  const seen = new Set();
  for (const text of chips.concat(lines)) {
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(text);
  }
  return merged;
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

function wireRollCapture(panel) {
  if (!panel || panel.dataset.wired) return;
  panel.dataset.wired = "1";
  const input = panel.querySelector("[data-roll-input]");
  const list = panel.querySelector("[data-roll-suggest]");
  const chips = panel.querySelector("[data-roll-chips]");
  if (!input || !list || !chips) return;
  const pool = ROLL_POOLS[input.dataset.rollPool] || [];
  const slots = Number(input.dataset.rollSlots || 4);
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
        (name, i) =>
          `<button type="button" class="suggest-item ${i === active ? "is-active" : ""}" data-roll-pick="${esc(name)}">${esc(name)}</button>`
      )
      .join("");
  }

  function addMod(name) {
    if (!name) return;
    if (chips.querySelectorAll("[data-roll-chip]").length >= slots) return;
    const exists = [...chips.querySelectorAll("[data-roll-chip]")].some(
      (el) => el.dataset.rollText.toLowerCase() === name.toLowerCase()
    );
    if (exists) return;
      chips.insertAdjacentHTML(
        "beforeend",
        `<span class="roll-chip" data-roll-chip data-roll-text="${esc(name)}">
        ${esc(name)}
        <button type="button" class="chip-x" data-remove-roll aria-label="Remove">×</button>
      </span>`
      );
    input.value = "";
    input.focus();
    hide();
  }

  input.addEventListener("input", () => {
    const matches = matchFrom(pool, input.value);
    active = matches.length ? 0 : -1;
    show(matches);
  });
  input.addEventListener("keydown", (event) => {
    const matches = matchFrom(pool, input.value);
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
      if (matches[active] || matches[0]) addMod(matches[active] ?? matches[0]);
      else if (input.value.trim()) addMod(input.value.trim());
    }
  });
  input.addEventListener("blur", () => setTimeout(hide, 120));
  panel.addEventListener("click", (event) => {
    const pick = event.target.closest("[data-roll-pick]");
    if (pick) addMod(pick.dataset.rollPick);
    if (event.target.closest("[data-remove-roll]")) event.target.closest("[data-roll-chip]")?.remove();
  });
}

function dropPills(drops) {
  if (!drops?.length) return `<div class="muted" style="margin-top:8px">Nothing dropped</div>`;
  return `<div class="drop-pills">${drops
    .map((drop) => {
      const rolls = (drop.rolls || []).map((roll) => `<div>${esc(roll)}</div>`).join("");
      return `<div class="pill-block"><span class="pill">${itemNameHtml(drop.name, "xs")}${drop.qty > 1 ? " ×" + drop.qty : ""}</span>${priceChip(drop.name)}${
        rolls ? `<div class="roll-lines">${rolls}</div>` : ""
      }</div>`;
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
      ${rollCaptureHtml(item)}
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
        <div id="extra-roll-mounts"></div>
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
      const panel = form.querySelector(`[data-rolls-for="${CSS.escape(id)}"]`);
      if (panel) {
        panel.hidden = false;
        wireRollCapture(panel);
      }
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
    const rolled = uniqueById(id);
    if (rolled?.rolls) {
      let panel = form.querySelector(`[data-rolls-for="${CSS.escape(id)}"]`);
      if (!panel) {
        const mount = form.querySelector("#extra-roll-mounts");
        mount?.insertAdjacentHTML("beforeend", rollCaptureHtml(rolled, false));
        panel = form.querySelector(`[data-rolls-for="${CSS.escape(id)}"]`);
      }
      if (panel) {
        panel.hidden = false;
        wireRollCapture(panel);
      }
    }
  }

  form.addEventListener("change", (event) => {
    if (event.target.matches("[data-drop-id]")) {
      const panel = form.querySelector(`[data-rolls-for="${CSS.escape(event.target.dataset.dropId)}"]`);
      if (panel) {
        panel.hidden = !event.target.checked;
        if (event.target.checked) wireRollCapture(panel);
      }
    }
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
      if (id && !form.querySelector(`[data-drop-id="${CSS.escape(id)}"]`)) {
        form.querySelector(`#extra-roll-mounts [data-rolls-for="${CSS.escape(id)}"]`)?.remove();
      }
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
  const panel = document.querySelector(".farm-pad [data-rolls-for]");
  if (panel) wireRollCapture(panel);
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
    if (item) farmPickItem(farmBossId(), { ...item, rolls: uniqueById(item.id)?.rolls });
    else if (input.value.trim()) {
      const name = input.value.trim();
      farmPickItem(farmBossId(), { id: slug(name), name, rolls: uniqueById(slug(name))?.rolls });
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
    ui.view === "dash" || ui.view === "settings" || ui.view === "econ" || ui.view === "bosses" || onTitle ? "none" : "grid";

  if (onTitle) {
    if (shown) hideItemTip();
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
    return;
  }
  if (event.target.closest("[data-title-quit]")) {
    quitApp();
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
    if (toastAct.dataset.toast === "undo") deleteLog(toastAct.dataset.log);
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
  if (event.target.closest("[data-convert-swap]")) {
    event.preventDefault();
    event.stopPropagation();
    swapConvert();
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
  if (event.target.closest("[data-farm-roll-cancel]")) {
    ui.dashRollId = null;
    render();
    return;
  }
  const rollSave = event.target.closest("[data-farm-roll-save]");
  if (rollSave) {
    const boss = getBoss(farmBossId());
    const item = (boss?.uniques || []).find((unique) => unique.id === rollSave.dataset.farmRollSave) || uniqueById(rollSave.dataset.farmRollSave);
    const panel = document.querySelector(`[data-rolls-for="${CSS.escape(rollSave.dataset.farmRollSave)}"]`);
    if (item) {
      const entry = { uniqueId: item.id, name: item.name, qty: 1 };
      const rolls = collectRolls(panel);
      if (rolls.length) entry.rolls = rolls;
      farmLogDrop(boss?.id || farmBossId(), entry);
    }
    return;
  }
  const farmSuggest = event.target.closest("[data-farm-suggest-id]");
  if (farmSuggest) {
    farmPickItem(farmBossId(), { id: farmSuggest.dataset.farmSuggestId, name: farmSuggest.dataset.farmSuggestName, rolls: uniqueById(farmSuggest.dataset.farmSuggestId)?.rolls });
    return;
  }
  const farm = event.target.closest("[data-farm]");
  if (farm) {
    state.farmBossId = farm.dataset.farm;
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
    removeLastKill(minus.dataset.minus);
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
    state.league = event.target.value;
    save();
    if (!hydratePriceCache()) {
      prices.byName = new Map();
      prices.tables = {};
      bustPriceLookup();
      prices.cached = false;
      prices.status = "idle";
      prices.fetchedAt = 0;
      prices.nextAt = 0;
    }
    render();
    return;
  }
  if (event.target.id === "farm-boss") {
    state.farmBossId = event.target.value;
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
document.addEventListener("change", onChange);
document.addEventListener("input", (event) => {
  const theme = event.target.closest("[data-theme]");
  if (theme) {
    setTheme({ [theme.dataset.theme]: theme.value });
    return;
  }
  if (event.target.id === "search" || event.target.id === "league-input" || event.target.id === "econ-search") {
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
      const panel = form.querySelector(`[data-rolls-for="${CSS.escape(box.dataset.dropId)}"]`);
      const entry = {
        uniqueId: box.dataset.dropId,
        name: box.dataset.dropName,
        qty: Math.max(1, Number(qtyInput?.value || 1)),
      };
      const rolls = collectRolls(panel);
      if (rolls.length) entry.rolls = rolls;
      drops.push(entry);
    });
    form.querySelectorAll("[data-extra-id]").forEach((chip) => {
      const qty = Math.max(1, Number(chip.querySelector("[data-extra-qty]")?.value || 1));
      const panel = form.querySelector(`[data-rolls-for="${CSS.escape(chip.dataset.extraId)}"]`);
      const entry = {
        uniqueId: chip.dataset.extraId,
        name: chip.dataset.extraName,
        qty,
      };
      const rolls = collectRolls(panel);
      if (rolls.length) entry.rolls = rolls;
      drops.push(entry);
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
});

document.getElementById("import-file").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importData(file);
  event.target.value = "";
});

document.addEventListener("keydown", (event) => {
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
  const rolls = hoverVariants(name, lore);
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
  const rollFamilies = new Set((rolls.lines || []).map(modFamily));
  const explicits = renderLines(
    (lore?.explicits || []).filter((text) => !isRollMod(text) && !rollFamilies.has(modFamily(text))),
    "item-tip-mod"
  );
  const variants = renderLines(rolls.lines, "item-tip-mod variant");
  const kind = (lore?.rarity || "Unique").toLowerCase();
  const flavour = lore?.flavour || "";
  const descr = lore?.descr && flavour && lore.descr.toLowerCase() === flavour.toLowerCase() ? "" : lore?.descr || "";
  const empty = !implicits && !explicits && !variants && !descr && !flavour && !props;
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
    ${rolls.note || variants ? `<div class="item-tip-variant-head">${esc(rolls.note || "Possible rolls")}</div>${variants}` : ""}
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
  const rolls = hoverVariants(name, lore);
  tip.hidden = false;
  tip.dataset.for = name;
  tip.innerHTML = itemTipHtml(name, lore, !loreIsRich(lore) && !rolls.lines.length && !rolls.note);
  placeItemTip(anchor, tip);
  const needDb = !lore?.flavour && !lore?.descr;
  if (loreIsRich(lore) && !needDb && (lore.variants?.length || !catalogUnique(name)?.rolls?.pool)) return;
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
loadLeagues().then(() => {
  if (!prices.byName.size) hydratePriceCache();
  paintPriceClock();
  render();
});
