const STORAGE_KEY = "poe2-exile-ledger-v1";
const APP_VERSION = "1.0.18";
const FEEDBACK_ISSUE_URL = "https://github.com/Shawn25678/SSEv1/issues/new";

const FILTERS = [
  ["all", "All"],
  ["pinnacle", "Pinnacle"],
  ["citadel", "Citadels"],
];

const ui = {
  view: "dash",
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
const UNIQUE_BY_BASE = {
  "amber amulet": ["Carnage Heart", "Revered Resin", "Xoph's Blood"],
  "amethyst ring": ["Blackflame", "Ming's Heart", "Original Sin", "Veilpiercer"],
  "azure amulet": ["The Everlasting Gaze", "Ungil's Harmony"],
  "bloodstone amulet": ["The Anvil", "Yoke of Suffering"],
  "chain tiara": ["Forbidden Gaze", "Sandstorm Visage"],
  "chiming staff": ["Sire of Shards", "The Burden of Shadows"],
  "crimson amulet": ["Idol of Uldurn", "Igniferis"],
  diamond: ["Controlled Metamorphosis", "Flesh Crucible", "From Nothing", "Heart of the Well", "Megalomaniac", "Prism of Belief", "The Adorned"],
  "emerald ring": ["Death Rush", "Thief's Torment", "Vigilant View"],
  "explorer armour": ["Belly of the Beast", "Pragmatism"],
  "fine belt": ["Darkness Enthroned", "Shavronne's Satchel"],
  "furtive wraps": ["Essentia Sanguis", "Hand of Wisdom and Action"],
  garment: ["Skin of the Loyal", "Tabula Rasa"],
  "gold amulet": ["Eye of Chayula", "Serpent's Egg"],
  "gold ring": ["Andvarius", "Perandus Seal", "Ventor's Gamble"],
  "heavy belt": ["Headhunter", "Waistgate", "Zerphi's Genesis"],
  "iron ring": ["Blackheart", "Icefang Orbit", "Prized Pain", "Venopuncture"],
  "irradiated tablet": ["Mastered Domain", "The Grand Project", "Visions of Paradise"],
  "jade amulet": ["Choir of the Storm", "Defiance of Destiny", "Surefooted Sigil"],
  "knight armour": ["Perfidy", "The Sunken Vessel", "Widow's Reign"],
  "lapis amulet": ["Ligurium Talisman", "Stone of Lazhwar", "The Pandemonius"],
  "lazuli ring": ["Doedre's Damning", "Glowswarm", "Seed of Cataclysm"],
  "linen belt": ["Keelhaul", "Umbilicus Immortalis"],
  "linen wraps": ["Blessed Bonds", "Killjoy"],
  "moulded mitts": ["Atziri's Acuity", "Hateforge"],
  "omen crest shield": ["Mahuxotl's Machination", "Rise of the Phoenix"],
  "overseer tablet": ["Cruel Hegemony", "Season of the Hunt"],
  "pearl ring": ["Evergrasping Ring", "Heartbound Loop", "Snakepit"],
  "plate belt": ["Goregirdle", "Infernoclasp"],
  "prismatic ring": ["Gifts from Above", "The Taming"],
  "rawhide belt": ["Meginord's Girdle", "Midnight Braid"],
  "revered vestments": ["Geofri's Sanctuary", "The Unleashed"],
  ruby: ["Grand Spectrum", "Split Personality"],
  "ruby ring": ["Blistering Bond", "Cracklecreep"],
  "runeforged garment": ["Skin of the Loyal", "Tabula Rasa"],
  "runemastered explorer armour": ["Belly of the Beast", "Pragmatism"],
  "runemastered knight armour": ["Perfidy", "The Sunken Vessel", "Widow's Reign"],
  "runemastered moulded mitts": ["Atziri's Acuity", "Hateforge"],
  "runemastered rusted greathelm": ["Horns of Bynden", "Wings of Caelyn"],
  "runemastered silk robe": ["Cloak of Flame", "Temporalis"],
  "runemastered torment club": ["Mjölner", "Olrovasara"],
  "runemastered tribal mask": ["Glimpse of Chaos", "The Vertex"],
  "rusted greathelm": ["Horns of Bynden", "Wings of Caelyn"],
  sapphire: ["Grand Spectrum", "Voices"],
  "sapphire ring": ["Dream Fragments", "Polcirkeln", "Whisper of the Brotherhood"],
  shortsword: ["Bluetongue", "Redbeak"],
  "shrine sceptre": ["Guiding Palm", "Guiding Palm of the Eye", "Guiding Palm of the Heart", "Guiding Palm of the Mind", "Palm of the Dreamer", "Sacred Flame"],
  "silk robe": ["Cloak of Flame", "Temporalis"],
  "solar amulet": ["Beacon of Azis", "Fireflower", "Immaculate Adherence"],
  "spiritbone crown": ["Keeper of the Arc", "The Deepest Tower"],
  "stellar amulet": ["Astramentis", "Fixation of Yix", "Hinekora's Sight", "Strugglescream"],
  "timeless jewel": ["Heroic Tragedy", "Undying Hate"],
  "topaz ring": ["Call of the Brotherhood", "Levinstone", "The Burrower"],
  "torment club": ["Mjölner", "Olrovasara"],
  "tribal mask": ["Glimpse of Chaos", "The Vertex"],
  "two-stone ring": ["Berek's Grip", "Berek's Pass", "Berek's Respite"],
  "ultimate life flask": ["Olroth's Resolve", "Opportunity"],
  "utility belt": ["Cat O' Nine Tails", "Ingenuity", "Mageblood"],
  "wide belt": ["Birthright Buckle", "Brynabas", "The Gnashing Sash"],
};

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

let updateCache = { at: 0, newer: false, latest: "" };
let affixTried = false;
let affixLoading = null;
let decksLoading = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const ready = [...document.scripts].some((el) => (el.getAttribute("src") || "").split("?")[0].endsWith(src));
    if (ready) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(src));
    document.head.appendChild(el);
  });
}

function ensureAffixLadders() {
  if (window.AFFIX_LADDERS) return Promise.resolve();
  if (affixLoading) return affixLoading;
  affixLoading = loadScript("affix-ladders.js").catch(() => {
    affixLoading = null;
  });
  return affixLoading;
}

function ensureDecks() {
  if (window.DeckGame) return Promise.resolve();
  if (decksLoading) return decksLoading;
  decksLoading = loadScript("decks.js")
    .then(() => loadScript("deck-game.js"))
    .catch(() => {
      decksLoading = null;
    });
  return decksLoading;
}

function paintUpdatePanel() {
  const status = document.getElementById("update-status");
  const btn = document.getElementById("settings-update-btn");
  const check = document.getElementById("settings-check-btn");
  if (status) status.textContent = updateCache.newer ? "v" + APP_VERSION + " → v" + updateCache.latest : "v" + APP_VERSION;
  if (btn) btn.hidden = !updateCache.newer;
  if (check) check.hidden = !window.chrome?.webview;
}

function checkAppUpdate(force) {
  if (!window.chrome?.webview) return Promise.resolve(updateCache);
  paintUpdatePanel();
  if (!force && updateCache.at && Date.now() - updateCache.at < 5 * 60 * 1000) return Promise.resolve(updateCache);
  return webviewJson({ type: "update-check" }, 15000, "update check timed out")
    .then((data) => {
      updateCache = { at: Date.now(), newer: !!data?.newer, latest: String(data?.latest || "") };
      paintUpdatePanel();
      return updateCache;
    })
    .catch(() => {
      updateCache.at = Date.now();
      paintUpdatePanel();
      return updateCache;
    });
}

function startAppUpdate() {
  if (!window.chrome?.webview) return;
  showToast("Updating…");
  webviewJson({ type: "update-install" }, 5 * 60 * 1000, "update timed out").catch(() => showToast("Update failed."));
}

function quitApp() {
  if (window.chrome?.webview) chrome.webview.postMessage({ type: "quit" });
  else window.close();
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
  const slot = document.querySelector(".boss-stage-slot");
  const w = slot?.clientWidth || root.clientWidth || window.innerWidth || 1280;
  const h = slot?.clientHeight || root.clientHeight || window.innerHeight || 800;
  const scale = Math.max(0.78, Math.min(1.12, w / 1180, h / 760));
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

function hourStamp(ts = Date.now()) {
  const d = new Date(ts);
  d.setMinutes(0, 0, 0);
  d.setMilliseconds(0);
  return d.getTime();
}

function formatHour(ts) {
  return new Date(hourStamp(ts)).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
}

function ninjaNextAt(fetchedAt = prices.fetchedAt) {
  if (!fetchedAt) return Date.now();
  if (hourStamp(fetchedAt) < hourStamp()) return Date.now();
  return hourStamp(fetchedAt) + 60 * 60 * 1000;
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

function clearBossLogs(bossId) {
  if (!bossId) return;
  const ids = new Set(logsFor(bossId).map((log) => log.id));
  if (!ids.size) return;
  if (ids.has(liveKill.logId)) clearLiveKill();
  state.logs = state.logs.filter((log) => log.bossId !== bossId);
  for (let i = dropUndo.length - 1; i >= 0; i--) {
    if (ids.has(dropUndo[i].logId)) dropUndo.splice(i, 1);
  }
  closeInspect();
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
      category: extra.category || "",
      exactBase: extra.exactBase !== false,
      ilvlMin: Number.isFinite(extra.ilvlMin) ? extra.ilvlMin : undefined,
      qualityMin: Number.isFinite(extra.qualityMin) ? extra.qualityMin : undefined,
      rolls: extra.rolls || [],
      rollsJson: JSON.stringify(extra.rolls || []),
      filters,
      filtersJson: JSON.stringify(filters),
      corrupted: extra.corrupted === true ? true : extra.corrupted === false ? false : undefined,
      unidentified: extra.unidentified === true ? true : extra.unidentified === false ? false : undefined,
      unidentifiedTier: Number.isInteger(extra.unidentifiedTier) && extra.unidentifiedTier > 0 ? extra.unidentifiedTier : undefined,
      ravenTouched: extra.ravenTouched === true,
      runeSockets: Number.isInteger(extra.runeSockets) ? extra.runeSockets : undefined,
      exchange: extra.exchange === true,
      have: extra.have || "",
    },
    extra.rolls?.length || filters.length ? 90000 : 45000,
    "PoE 2 trade timed out"
  );
}

function stripItemQualityPrefix(text) {
  return String(text || "").replace(/^(Superior|Exceptional)\s+/i, "").trim();
}

function tradeCategory(className) {
  const t = String(className || "").trim();
  if (!t || /^(currency|stackable currency|socketable|omen|divination cards?)$/i.test(t)) return "";
  const rows = [
    [/body\s*armours?/i, "armour.chest"],
    [/helmets?/i, "armour.helmet"],
    [/gloves/i, "armour.gloves"],
    [/boots/i, "armour.boots"],
    [/bucklers?/i, "armour.buckler"],
    [/shields?/i, "armour.shield"],
    [/foci|focus/i, "armour.focus"],
    [/quivers?/i, "armour.quiver"],
    [/amulets?/i, "accessory.amulet"],
    [/belts?/i, "accessory.belt"],
    [/rings?/i, "accessory.ring"],
    [/crossbows?/i, "weapon.crossbow"],
    [/quarterstaves|quarterstaff|warstaves|warstaff/i, "weapon.warstaff"],
    [/staves|staff/i, "weapon.staff"],
    [/bows?/i, "weapon.bow"],
    [/wands?/i, "weapon.wand"],
    [/spears?/i, "weapon.spear"],
    [/flails?/i, "weapon.flail"],
    [/two\s*-?\s*hand(?:ed)?\s*maces?/i, "weapon.twomace"],
    [/one\s*-?\s*hand(?:ed)?\s*maces?/i, "weapon.onemace"],
    [/two\s*-?\s*hand(?:ed)?\s*swords?/i, "weapon.twosword"],
    [/one\s*-?\s*hand(?:ed)?\s*swords?/i, "weapon.onesword"],
    [/two\s*-?\s*hand(?:ed)?\s*axes?/i, "weapon.twoaxe"],
    [/one\s*-?\s*hand(?:ed)?\s*axes?/i, "weapon.oneaxe"],
    [/claws?/i, "weapon.claw"],
    [/daggers?/i, "weapon.dagger"],
    [/sceptres?/i, "weapon.sceptre"],
    [/talismans?/i, "weapon.talisman"],
    [/charms?/i, "flask.charm"],
    [/flasks?/i, "flask"],
    [/jewels?/i, "jewel"],
    [/waystones?/i, "map.waystone"],
    [/tablets?|precursor/i, "map.tablet"],
    [/relics?/i, "sanctum.relic"],
    [/map fragments?/i, "map.fragment"],
    [/uncut support/i, "gem.supportgem"],
    [/support gems?/i, "gem.supportgem"],
    [/meta gems?/i, "gem.metagem"],
    [/uncut skill|uncut spirit|skill gems?/i, "gem.activegem"],
  ];
  for (const [re, id] of rows) if (re.test(t)) return id;
  return "";
}

function tradeBaseType(drop) {
  const rarity = String(drop?.rarity || "").toLowerCase();
  const name = isUnidentifiedLine(drop?.name) ? "" : stripItemQualityPrefix(drop?.name);
  const base = isUnidentifiedLine(drop?.baseType) ? "" : stripItemQualityPrefix(drop?.baseType);
  const className = drop?.className || "";
  if (/currency|gem|divination/i.test(rarity) || /currency|gem|divination/i.test(className)) return name || base;
  if (rarity === "magic") {
    if (base && base.toLowerCase() !== String(drop?.name || "").toLowerCase()) return base;
    return "";
  }
  if (rarity === "unique" || rarity === "rare") {
    if (base && base.toLowerCase() !== String(drop?.name || "").toLowerCase()) return base;
    if (drop?.unidentified && (base || name)) return base || name;
    return "";
  }
  return base || name;
}

// Matcher fold follows Exiled Exchange 2 (MIT): unwrap tags, # placeholders, map to trade ids.
function foldTradeMatcher(text) {
  return stripAdvancedRanges(parseAffixStrings(String(text || "")))
    .replace(/[\r\n]+/g, " ")
    .toLowerCase()
    .replace(/\((?:augmented|unmet|implicit|enchant|rune)\)/gi, " ")
    .replace(/\((?!local\b)[^)]*\)/g, " ")
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
  if (/magic utility flasks you use apply/.test(fold || "")) return "magic utility flasks you use apply";
  if (/utility flasks cannot be used/.test(fold || "")) return "magic utility flasks cannot be used";
  return "";
}

function pickTradeStat(list, kind) {
  if (!list?.length) return null;
  const order =
    kind === "rune"
      ? ["rune", "enchant", "implicit", "explicit"]
      : kind === "implicit" || kind === "corrupt" || kind === "skill"
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

function propLineTail(raw, label) {
  const base = String(label || "").replace(/:$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!base) return "";
  const m = String(raw || "").match(new RegExp("^" + base + "\\s*:\\s*(.+)$", "im"));
  return m ? m[1] : "";
}

function parseDamageRange(text) {
  const clean = String(text || "").replace(/\([^)]*\)/g, " ");
  const pairs = [...clean.matchAll(/(\d+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)/gi)];
  if (pairs.length) {
    let lo = 0;
    let hi = 0;
    for (const pair of pairs) {
      const a = Number(pair[1]);
      const b = Number(pair[2]);
      lo += Math.min(a, b);
      hi += Math.max(a, b);
    }
    return { lo, hi, avg: (lo + hi) / 2 };
  }
  const n = clean.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!n) return null;
  const v = Number(n[1]);
  return { lo: v, hi: v, avg: v };
}

function parseAvgDamage(text) {
  const range = parseDamageRange(text);
  return range ? range.avg : NaN;
}

function scaleDamageByQuality(value, fromQ, toQ) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  const from = Number.isFinite(Number(fromQ)) ? Number(fromQ) : 0;
  const to = Number.isFinite(Number(toQ)) ? Number(toQ) : from;
  if (from === to) return n;
  // EE2 / PoB tooltip DPS: float more-multiplier on the shown local damage.
  return (n / (1 + from / 100)) * (1 + to / 100);
}

function parsePropNumber(raw, label) {
  const tail = stripAdvancedRanges(propLineTail(raw, label));
  const n = parseFloat(String(tail).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function parseItemQuality(raw) {
  const t = stripClipboardMarkup(String(raw || ""));
  const line = t.match(/^Quality\s*:\s*(.+)$/im);
  if (line) {
    const n = parseInt(String(line[1]).replace(/^\s*\+/, ""), 10);
    if (Number.isFinite(n)) return n;
  }
  const n = parsePropNumber(t, "Quality:");
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function parseTooltipDps(text) {
  const m = String(text || "").match(/\(([\d.]+)\s*DPS\)/i);
  if (!m) return NaN;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

function parseLocalProps(raw) {
  const t = parseAffixStrings(stripClipboardMarkup(String(raw || "")));
  function num(label) {
    return parsePropNumber(t, label);
  }
  function dmg(label) {
    const v = parseAvgDamage(propLineTail(t, label));
    return Number.isFinite(v) && v > 0 ? v : NaN;
  }
  function dmgRange(label) {
    const range = parseDamageRange(propLineTail(t, label));
    if (!range || !(range.avg > 0)) return null;
    return range;
  }
  const quality = parseItemQuality(t);
  const ilvl = num("Item Level:");
  const ar = num("Armour:");
  const ev = num("Evasion Rating:");
  const es = num("Energy Shield:");
  const wardHit = num("Runic Ward:");
  const ward = Number.isFinite(wardHit) ? wardHit : num("Ward:");
  const blockHit = num("Block chance:");
  const block = Number.isFinite(blockHit) ? blockHit : num("Block Chance:") || num("Chance to Block:");
  const physLine = propLineTail(t, "Physical Damage:");
  const physRange = dmgRange("Physical Damage:");
  const phys = physRange ? physRange.avg : NaN;
  const physDps = parseTooltipDps(physLine);
  const eleCombined = dmg("Elemental Damage:");
  let eleDps = parseTooltipDps(propLineTail(t, "Elemental Damage:"));
  if (!Number.isFinite(eleDps) || eleDps <= 0) eleDps = num("Elemental DPS:");
  const totalDps = num("Total DPS:");
  const fire = dmg("Fire Damage:");
  const cold = dmg("Cold Damage:");
  const lightning = dmg("Lightning Damage:");
  const eleParts = [fire, cold, lightning].filter(Number.isFinite);
  const eleSum = eleParts.length ? eleParts.reduce((a, b) => a + b, 0) : NaN;
  let ele = NaN;
  if (Number.isFinite(eleCombined) && Number.isFinite(eleSum)) ele = Math.max(eleCombined, eleSum);
  else if (Number.isFinite(eleCombined)) ele = eleCombined;
  else if (Number.isFinite(eleSum)) ele = eleSum;
  const chaos = dmg("Chaos Damage:");
  const critHit = num("Critical Hit Chance:");
  const crit = Number.isFinite(critHit) ? critHit : num("Critical Strike Chance:");
  const apsLine = propLineTail(t, "Attacks per Second:");
  let aps = parseFloat(String(apsLine).replace(/,/g, ""));
  if (!Number.isFinite(aps)) aps = num("Attacks per Second:");
  const apsTail = stripAdvancedRanges(apsLine);
  const apsRange = String(apsTail).match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (apsRange && Number(apsRange[2]) > Number(apsRange[1]) && Math.abs(aps - Number(apsRange[1])) < 1e-9) {
    aps = (Number(apsRange[1]) + Number(apsRange[2])) / 2;
  }
  if (Number.isFinite(aps) && aps > 0) aps = Math.round(aps * 100) / 100;
  const spirit = num("Spirit:");
  const reload = num("Reload Time:");
  return {
    armour: Number.isFinite(ar),
    evasion: Number.isFinite(ev),
    energyShield: Number.isFinite(es),
    block: Number.isFinite(block),
    physicalDamage: Number.isFinite(phys),
    crit: Number.isFinite(crit),
    aps: Number.isFinite(aps),
    accuracy: /^Accuracy Rating:/im.test(t),
    quality: Number.isFinite(quality) ? quality : undefined,
    ilvl: Number.isFinite(ilvl) && ilvl > 0 ? ilvl : undefined,
    ar: Number.isFinite(ar) ? ar : undefined,
    ev: Number.isFinite(ev) ? ev : undefined,
    es: Number.isFinite(es) ? es : undefined,
    ward: Number.isFinite(ward) ? ward : undefined,
    blockChance: Number.isFinite(block) ? block : undefined,
    phys: Number.isFinite(phys) ? phys : undefined,
    physLo: physRange && Number.isFinite(physRange.lo) ? physRange.lo : undefined,
    physHi: physRange && Number.isFinite(physRange.hi) ? physRange.hi : undefined,
    physDps: Number.isFinite(physDps) ? physDps : undefined,
    ele: Number.isFinite(ele) ? ele : undefined,
    eleDps: Number.isFinite(eleDps) && eleDps > 0 ? eleDps : undefined,
    totalDps: Number.isFinite(totalDps) && totalDps > 0 ? totalDps : undefined,
    fire: Number.isFinite(fire) ? fire : undefined,
    cold: Number.isFinite(cold) ? cold : undefined,
    lightning: Number.isFinite(lightning) ? lightning : undefined,
    chaos: Number.isFinite(chaos) ? chaos : undefined,
    apsVal: Number.isFinite(aps) ? aps : undefined,
    critVal: Number.isFinite(crit) ? crit : undefined,
    spirit: Number.isFinite(spirit) ? spirit : undefined,
    reload: Number.isFinite(reload) ? reload : undefined,
  };
}

function localModApplies(fold, extra) {
  const f = String(fold || "");
  if (!f || /recharge|from equipped|recovery|break|global|spell/.test(f)) return false;
  const props = extra?.props;
  if (props && (props.armour || props.evasion || props.energyShield || props.block || props.physicalDamage || props.crit || props.aps || props.accuracy)) {
    if (/armour and energy shield|armour, evasion and energy shield|armour and evasion|evasion and energy shield/.test(f)) {
      return !!(props.armour || props.evasion || props.energyShield);
    }
    if (/energy shield/.test(f)) return !!props.energyShield;
    if (/\barmour\b/.test(f)) return !!props.armour;
    if (/evasion/.test(f)) return !!props.evasion;
    if (/block chance/.test(f)) return !!props.block;
    if (/attack speed/.test(f)) return !!props.aps;
    if (/accuracy/.test(f)) return !!props.accuracy;
    if (/culling strike/.test(f)) return !!(props.physicalDamage || props.aps);
    if (/physical damage/.test(f)) return !!props.physicalDamage;
    if (/critical/.test(f)) return !!props.crit;
    return false;
  }
  const cat = tradeCategory(extra?.className);
  if (/energy shield/.test(f)) return /^(armour\.(chest|helmet|gloves|boots|shield|focus|buckler))$/.test(cat);
  if (/\barmour\b/.test(f) || /evasion/.test(f)) return /^(armour\.(chest|helmet|gloves|boots|shield|buckler))$/.test(cat);
  if (/block chance/.test(f)) return /^(armour\.(shield|buckler))$/.test(cat);
  if (/attack speed|culling strike|physical damage|critical/.test(f)) return /^weapon\./.test(cat);
  if (/accuracy/.test(f)) return /^weapon\.|^armour\.quiver$/.test(cat);
  return false;
}

function localTradeFold(key) {
  const base = String(key || "")
    .replace(/\s*\(local\)\s*$/i, "")
    .trim();
  return base ? base + " (local)" : "";
}

function findTradeStat(index, text, kind, extra) {
  if (!index?.size) return null;
  const preferLocal = extra?.preferLocal === true;
  const keys = foldKeyVariants(foldTradeMatcher(text));
  if (preferLocal) {
    for (const key of keys) {
      const hit = pickTradeStat(index.get(localTradeFold(key)), kind);
      if (hit) return hit;
    }
  }
  for (const key of keys) {
    const hit = pickTradeStat(index.get(key), kind);
    if (hit) return hit;
  }
  const needle = distinctiveTradePhrase(keys[0]);
  let best = null;
  let bestLen = 0;
  let bestLocal = false;
  for (const [fold, list] of index) {
    const local = /\(local\)\s*$/i.test(fold);
    if (keys.some((key) => fold === key || (key.length >= 12 && (fold.startsWith(key + " ") || key.startsWith(fold + " "))))) {
      const hit = pickTradeStat(list, kind);
      if (hit && (fold.length > bestLen || (fold.length === bestLen && preferLocal && local && !bestLocal))) {
        best = hit;
        bestLen = fold.length;
        bestLocal = local;
      }
    }
    if (needle && fold.includes(needle)) {
      const hit = pickTradeStat(list, kind);
      if (hit && (fold.length > bestLen || (fold.length === bestLen && preferLocal && local && !bestLocal))) {
        best = hit;
        bestLen = fold.length;
        bestLocal = local;
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

function isTradeableRoll(text, kind, extra) {
  const t = stripAdvancedRanges(parseAffixStrings(String(text || ""))).trim();
  if (/^\d+\s+uses? remaining$/i.test(t)) return false;
  if (/^adds .+\s+to a map$/i.test(t)) return false;
  if (/^empowers the map boss/i.test(t)) return false;
  return isUsefulRoll(text, kind, extra);
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

function parseRollHit(hit) {
  const value = Number(hit?.[1]);
  let lo = Number(hit?.[2]);
  let hi = Number(hit?.[3]);
  if (!Number.isFinite(value) || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (lo > hi) {
    const swap = lo;
    lo = hi;
    hi = swap;
  }
  return { value, lo, hi };
}

function parseRollSpan(raw) {
  const t = parseAffixStrings(String(raw || ""));
  const hits = [...t.matchAll(/(-?\d+(?:\.\d+)?)\s*\(\s*(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)\s*\)/g)];
  const first = parseRollHit(hits[0]);
  if (!first) return null;
  let spanLo = first.lo;
  let spanHi = first.hi;
  const extras = [];
  for (let i = 1; i < hits.length; i++) {
    const extra = parseRollHit(hits[i]);
    if (extra) extras.push(extra);
  }
  const bracket = t.match(/\[\s*(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)\s*\]/);
  if (bracket) {
    let a = Number(bracket[1]);
    let b = Number(bracket[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (a > b) {
        const swap = a;
        a = b;
        b = swap;
      }
      spanLo = Math.min(spanLo, a);
      spanHi = Math.max(spanHi, b);
    }
  }
  return { value: first.value, lo: first.lo, hi: first.hi, spanLo, spanHi, extras };
}

function foldAffixRange(text) {
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

function defencePoolKey(drop) {
  const props = drop?.props || {};
  const ar = !!props.armour;
  const ev = !!props.evasion;
  const es = !!props.energyShield;
  if (ar && ev && es) return "str_dex_int";
  if (ar && es) return "str_int";
  if (ar && ev) return "str_dex";
  if (ev && es) return "dex_int";
  if (ar) return "str";
  if (ev) return "dex";
  if (es) return "int";
  return "";
}

function affixBaseTags(drop) {
  const map = typeof window !== "undefined" ? window.AFFIX_BASE_TAGS : null;
  if (!map) return null;
  const names = [drop?.baseType, drop?.name].map((s) => String(s || "").trim()).filter(Boolean);
  for (const name of names) {
    const hit = map[name] || map[name.toLowerCase()];
    if (Array.isArray(hit) && hit.length) return hit.slice();
  }
  const hay = String(drop?.name || drop?.baseType || "")
    .trim()
    .toLowerCase();
  if (!hay) return null;
  let best = "";
  for (const key of Object.keys(map)) {
    if (key !== key.toLowerCase()) continue;
    if (hay === key || hay.endsWith(" " + key)) {
      if (key.length > best.length) best = key;
    }
  }
  return best && Array.isArray(map[best]) ? map[best].slice() : null;
}

function itemPoolTags(drop) {
  const fromBase = affixBaseTags(drop);
  if (fromBase) return fromBase;
  const cls = String(drop?.className || "").toLowerCase();
  const tags = [];
  function add(tag) {
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  if (/body\s*armours?/.test(cls)) add("body_armour");
  if (/helmets?/.test(cls)) add("helmet");
  if (/gloves/.test(cls)) add("gloves");
  if (/boots/.test(cls)) add("boots");
  if (/bucklers?/.test(cls)) {
    add("buckler");
    add("shield");
  } else if (/shields?/.test(cls)) add("shield");
  if (/\bfoci\b|\bfocus\b/.test(cls)) add("focus");
  if (/quivers?/.test(cls)) add("quiver");
  if (/amulets?/.test(cls)) add("amulet");
  if (/belts?/.test(cls)) add("belt");
  if (/rings?/.test(cls)) add("ring");
  if (/crossbows?/.test(cls)) add("crossbow");
  if (/quarterstaves|quarterstaff|warstaves|warstaff/.test(cls)) add("warstaff");
  else if (/staves|\bstaff\b/.test(cls)) add("staff");
  if (/\bbows?\b/.test(cls)) add("bow");
  if (/wands?/.test(cls)) add("wand");
  if (/spears?/.test(cls)) add("spear");
  if (/flails?/.test(cls)) add("flail");
  if (/maces?/.test(cls)) add("mace");
  if (/swords?/.test(cls)) add("sword");
  if (/axes?/.test(cls)) add("axe");
  if (/claws?/.test(cls)) add("claw");
  if (/daggers?/.test(cls)) add("dagger");
  if (/sceptres?/.test(cls)) add("sceptre");
  if (/talismans?/.test(cls)) add("talisman");
  if (/traps?/.test(cls)) add("trap");
  const weapon = ["bow", "wand", "staff", "warstaff", "mace", "axe", "sword", "spear", "flail", "claw", "dagger", "sceptre", "talisman", "crossbow", "trap"].some((tag) => tags.includes(tag));
  if (weapon) add("weapon");
  if (tags.includes("bow") || tags.includes("crossbow") || tags.includes("wand")) add("ranged");
  const two = /two\s*-?\s*hand/.test(cls) || tags.includes("bow") || tags.includes("crossbow") || tags.includes("staff") || tags.includes("warstaff");
  const one =
    /one\s*-?\s*hand/.test(cls) ||
    tags.includes("wand") ||
    tags.includes("claw") ||
    tags.includes("dagger") ||
    tags.includes("sceptre") ||
    tags.includes("spear") ||
    tags.includes("flail") ||
    tags.includes("talisman");
  if (two) {
    add("two_hand_weapon");
    add("twohand");
  }
  if (one || (weapon && !two)) {
    add("one_hand_weapon");
    add("onehand");
  }
  if (/life\s*flasks?/.test(cls)) add("life_flask");
  if (/mana\s*flasks?/.test(cls)) add("mana_flask");
  if (/charms?/.test(cls)) add("utility_flask");
  if (tags.includes("life_flask") || tags.includes("mana_flask") || tags.includes("utility_flask")) add("flask");
  if (/jewels?/.test(cls)) {
    add("jewel");
    const jewel = String(drop?.baseType || drop?.name || "").toLowerCase();
    if (/time-?lost/.test(jewel)) add("radius_jewel");
    if (/ruby/.test(jewel)) add(/time-?lost/.test(jewel) ? "str_radius_jewel" : "strjewel");
    if (/emerald/.test(jewel)) add(/time-?lost/.test(jewel) ? "dex_radius_jewel" : "dexjewel");
    if (/sapphire/.test(jewel)) add(/time-?lost/.test(jewel) ? "int_radius_jewel" : "intjewel");
    if (/\bdiamond\b/.test(jewel) && !/time-?lost/.test(jewel)) {
      add("strjewel");
      add("dexjewel");
      add("intjewel");
    }
  }
  if (tags.includes("body_armour") || tags.includes("helmet") || tags.includes("gloves") || tags.includes("boots") || tags.includes("shield") || tags.includes("focus")) add("armour");
  const props = drop?.props || {};
  const ar = !!props.armour;
  const ev = !!props.evasion;
  const es = !!props.energyShield;
  if (ar && ev && es) add("str_dex_int_armour");
  else if (ar && es) add("str_int_armour");
  else if (ar && ev) add("str_dex_armour");
  else if (ev && es) add("dex_int_armour");
  else if (ar) add("str_armour");
  else if (ev) add("dex_armour");
  else if (es) add("int_armour");
  if (tags.includes("shield")) {
    if (ar && ev) add("str_dex_shield");
    else if (ar && es) add("str_int_shield");
    else if (ar) add("str_shield");
  }
  add("default");
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

function foldListIndex(list, fold) {
  const want = foldKeyVariants(fold);
  for (let i = 0; i < (list || []).length; i++) {
    if (want.includes(list[i]) || foldKeyVariants(list[i]).some((v) => want.includes(v))) return i;
  }
  return -1;
}

function encodeSpanTiers(tiers) {
  return (tiers || [])
    .map((t) => Number(t.lo) + "," + Number(t.hi))
    .filter((s) => /^-?\d/.test(s))
    .join(";");
}

function parseSpanTiers(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((t) => {
        const lo = Number(t?.lo);
        const hi = Number(t?.hi);
        if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
        return { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
      })
      .filter(Boolean);
  }
  return String(raw || "")
    .split(";")
    .map((part) => {
      const bits = part.split(",");
      const lo = Number(bits[0]);
      const hi = Number(bits[1]);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
      return { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
    })
    .filter(Boolean);
}

function tierPos(tiers, value) {
  const list = parseSpanTiers(tiers);
  if (!list.length || !Number.isFinite(value)) return null;
  for (let i = 0; i < list.length; i++) {
    const lo = list[i].lo;
    const hi = list[i].hi;
    if (value + 0.01 >= lo && value - 0.01 <= hi) return { i, u: hi > lo ? (value - lo) / (hi - lo) : 1 };
  }
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < list.length; i++) {
    const d = value > list[i].hi ? value - list[i].hi : list[i].lo - value;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return { i: best, u: value < list[best].lo ? 0 : 1 };
}

function mapByTier(fromTiers, value, toTiers) {
  const to = parseSpanTiers(toTiers);
  const pos = tierPos(fromTiers, value);
  if (!pos || !to[pos.i]) return NaN;
  const t = to[pos.i];
  return t.lo + pos.u * (t.hi - t.lo);
}

function rollUsesDecimals(roll) {
  const nums = [roll?.lo, roll?.hi, roll?.spanLo, roll?.spanHi];
  for (const t of parseSpanTiers(roll?.spanTiers)) nums.push(t.lo, t.hi);
  return nums.some((n) => Number.isFinite(n) && Math.abs(n - Math.round(n)) > 0.001);
}

function snapRollNum(n, roll) {
  if (!Number.isFinite(n)) return n;
  return rollUsesDecimals(roll) ? Math.round(n * 10) / 10 : Math.round(n);
}

function rollPairValues(row) {
  const out = [];
  const lo = Number(row?.lo);
  const hi = Number(row?.hi);
  const value = Number(row?.value);
  if (Number.isFinite(lo) && Number.isFinite(hi)) out.push({ lo, hi, value: Number.isFinite(value) ? value : (lo + hi) / 2 });
  else if (Number.isFinite(value)) out.push({ lo: value, hi: value, value });
  for (const ex of row?.extra || []) {
    const elo = Number(ex?.lo);
    const ehi = Number(ex?.hi);
    const ev = Number(ex?.value);
    if (Number.isFinite(elo) && Number.isFinite(ehi)) out.push({ lo: elo, hi: ehi, value: Number.isFinite(ev) ? ev : (elo + ehi) / 2 });
    else if (Number.isFinite(ev)) out.push({ lo: ev, hi: ev, value: ev });
  }
  return out;
}

function pairExactFit(tLo, tHi, cur) {
  if (!cur || !Number.isFinite(tLo) || !Number.isFinite(tHi)) return false;
  const lo = Math.min(tLo, tHi);
  const hi = Math.max(tLo, tHi);
  return Math.abs(Number(cur.lo) - lo) < 0.02 && Math.abs(Number(cur.hi) - hi) < 0.02;
}

function pairValueFit(tLo, tHi, cur) {
  if (!cur || !Number.isFinite(tLo) || !Number.isFinite(tHi)) return false;
  const lo = Math.min(tLo, tHi);
  const hi = Math.max(tLo, tHi);
  if (Number.isFinite(cur.lo) && Number.isFinite(cur.hi) && cur.hi - cur.lo > 0.02) {
    if (cur.lo + 0.01 >= lo && cur.hi - 0.01 <= hi) return true;
  }
  const v = Number.isFinite(cur.value) ? cur.value : cur.lo;
  return Number.isFinite(v) && v + 0.01 >= lo && v - 0.01 <= hi;
}

function lookupAffixLadder(row, ctx, siblings) {
  const ladders = typeof window !== "undefined" ? window.AFFIX_LADDERS : null;
  if (!Array.isArray(ladders) || !ladders.length) return null;
  const fold = foldAffixRange(row?.text);
  if (!fold) return null;
  const sibs = (siblings && siblings.length ? siblings : [row]).map((line) => foldAffixRange(line?.text)).filter(Boolean);
  const hybrid = sibs.length > 1;
  const tags = itemPoolTags(ctx);
  const currents = rollPairValues(row);
  let best = null;
  let bestScore = -1;
  for (const group of ladders) {
    const folds = group?.f || [];
    if (hybrid) {
      if (folds.length !== sibs.length) continue;
      if (!sibs.every((line) => foldListIndex(folds, line) >= 0)) continue;
    } else if (folds.length !== 1 || foldListIndex(folds, fold) < 0) continue;
    const line = foldListIndex(folds, fold);
    if (line < 0) continue;
    const counts = group.n || [];
    let offset = 0;
    for (let i = 0; i < line; i++) offset += 2 * (Number(counts[i]) || 1);
    const pairs = Math.max(Number(counts[line]) || 1, currents.length || 1);
    const eligible = (group.r || []).filter((tier) => spawnWeight(tier.k, tier.w, tags) > 0);
    if (!eligible.length) continue;
    const parsed = [];
    for (const tier of eligible) {
      const a = tier.a || [];
      const slots = [];
      for (let p = 0; p < pairs; p++) {
        const tLo = a[offset + p * 2];
        const tHi = a[offset + p * 2 + 1];
        if (!Number.isFinite(tLo) || !Number.isFinite(tHi)) break;
        slots.push({ lo: Math.min(tLo, tHi), hi: Math.max(tLo, tHi) });
      }
      if (!slots.length) continue;
      parsed.push(slots);
    }
    if (!parsed.length) continue;
    const checkPairs = Math.min(pairs, Math.max(currents.length, 1), parsed.reduce((n, slots) => Math.max(n, slots.length), 0));
    function fitsAll(slots, fn) {
      for (let p = 0; p < checkPairs; p++) {
        const slot = slots[p];
        if (!slot) return false;
        if (!fn(slot.lo, slot.hi, currents[p] || currents[0])) return false;
      }
      return checkPairs > 0;
    }
    const exact = parsed.filter((slots) => fitsAll(slots, pairExactFit));
    const loose = exact.length ? exact : parsed.filter((slots) => fitsAll(slots, pairValueFit));
    if (!loose.length) continue;
    const pairCount = parsed.reduce((n, slots) => Math.max(n, slots.length), 0);
    const span = [];
    for (let p = 0; p < pairCount; p++) {
      let spanLo = Infinity;
      let spanHi = -Infinity;
      for (const slots of parsed) {
        const slot = slots[p];
        if (!slot) continue;
        spanLo = Math.min(spanLo, slot.lo);
        spanHi = Math.max(spanHi, slot.hi);
      }
      span.push({ lo: spanLo, hi: spanHi, tiers: [] });
    }
    const driveAt = span.reduce((bestI, s, i) => (s.hi - s.lo > span[bestI].hi - span[bestI].lo ? i : bestI), 0);
    const ranked = parsed
      .slice()
      .sort((a, b) => {
        const da = a[driveAt] || a[a.length - 1];
        const db = b[driveAt] || b[b.length - 1];
        return da.hi - db.hi || da.lo - db.lo;
      });
    for (let p = 0; p < span.length; p++) {
      span[p].tiers = ranked.map((slots) => slots[p]).filter(Boolean);
    }
    const first = span[0];
    const score = 4 + (folds.length === sibs.length ? 2 : 0) + (checkPairs > 1 ? 1 : 0) + (exact.length ? 1 : 0);
    if (score < bestScore) continue;
    bestScore = score;
    best = {
      spanLo: first.lo,
      spanHi: first.hi,
      extra: span.slice(1).map((s) => ({ lo: s.lo, hi: s.hi, tiers: s.tiers })),
      steps: first.tiers.length,
      tiers: first.tiers,
      extraTiers: span.slice(1).map((s) => s.tiers),
      contained: true,
    };
  }
  return best;
}

function siblingRolls(rows, row) {
  if (!row?.hybrid || !row.affix) return [row];
  return (rows || []).filter((line) => line.affix === row.affix);
}

function expandRollSpan(row, ctx, siblings) {
  const lo = Number(row.lo);
  const hi = Number(row.hi);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return row;
  function clipExtra() {
    if (!Array.isArray(row.extra)) return;
    row.extra = row.extra
      .map((ex) => {
        const elo = Number(ex?.lo);
        const ehi = Number(ex?.hi);
        if (!Number.isFinite(elo) || !Number.isFinite(ehi)) return null;
        const next = {
          value: Number.isFinite(ex.value) ? Number(ex.value) : elo,
          lo: elo,
          hi: ehi,
          spanLo: Number.isFinite(ex.spanLo) ? Number(ex.spanLo) : elo,
          spanHi: Number.isFinite(ex.spanHi) ? Number(ex.spanHi) : ehi,
        };
        const extraTiers = parseSpanTiers(ex.spanTiers);
        if (extraTiers.length) next.spanTiers = extraTiers;
        return next;
      })
      .filter(Boolean);
  }
  if (!rollHasAffixTiers(row)) {
    row.spanLo = lo;
    row.spanHi = hi;
    delete row.spanSteps;
    delete row.spanTiers;
    clipExtra();
    return flattenFlatDamageRoll(row);
  }
  const hit = lookupAffixLadder(row, ctx, siblings);
  if (hit && Number.isFinite(hit.spanLo) && Number.isFinite(hit.spanHi)) {
    row.spanLo = Math.min(hit.spanLo, lo);
    row.spanHi = Math.max(hit.spanHi, hi);
    if (hit.steps > 1) row.spanSteps = hit.steps;
    else delete row.spanSteps;
    if (Array.isArray(hit.tiers) && hit.tiers.length) row.spanTiers = hit.tiers;
    else delete row.spanTiers;
    const prev = Array.isArray(row.extra) ? row.extra : [];
    if (Array.isArray(hit.extra) && hit.extra.length) {
      row.extra = hit.extra
        .map((span, i) => {
          const ex = prev[i] || {};
          const elo = Number(ex.lo);
          const ehi = Number(ex.hi);
          const ev = Number(ex.value);
          if (!Number.isFinite(span.lo) || !Number.isFinite(span.hi)) return null;
          const next = {
            value: Number.isFinite(ev) ? ev : Number.isFinite(elo) ? elo : span.lo,
            lo: Number.isFinite(elo) ? elo : span.lo,
            hi: Number.isFinite(ehi) ? ehi : span.hi,
            spanLo: span.lo,
            spanHi: span.hi,
          };
          if (Array.isArray(span.tiers) && span.tiers.length) next.spanTiers = span.tiers;
          return next;
        })
        .filter(Boolean);
    }
    return flattenFlatDamageRoll(row);
  }
  row.spanLo = lo;
  row.spanHi = hi;
  delete row.spanSteps;
  delete row.spanTiers;
  clipExtra();
  return flattenFlatDamageRoll(row);
}

function expandRollSpans(rows, ctx) {
  for (const row of rows || []) expandRollSpan(row, ctx, siblingRolls(rows, row));
  return rows;
}

function applyRollSpan(row, raw) {
  const span = parseRollSpan(raw);
  if (span) {
    if (!Number.isFinite(row.lo) || !Number.isFinite(row.hi) || row.lo === row.hi) {
      row.value = span.value;
      row.lo = span.lo;
      row.hi = span.hi;
      row.spanLo = span.spanLo;
      row.spanHi = span.spanHi;
    } else {
      if (!Number.isFinite(row.value)) row.value = span.value;
      if (!Number.isFinite(row.spanLo)) row.spanLo = span.spanLo;
      if (!Number.isFinite(row.spanHi)) row.spanHi = span.spanHi;
    }
    if (span.extras?.length) {
      row.extra = span.extras.map((ex) => ({ value: ex.value, lo: ex.lo, hi: ex.hi }));
    }
  }
  const nums = [...stripAdvancedRanges(parseAffixStrings(String(raw || row?.text || ""))).matchAll(/([+-]?\d+(?:\.\d+)?)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));
  if (nums.length >= 2 && !row.extra) {
    row.extra = [{ value: nums[1], lo: nums[1], hi: nums[1] }];
  }
  if (!Number.isFinite(row.lo) && Number.isFinite(nums[0])) {
    row.value = nums[0];
    row.lo = nums[0];
    row.hi = nums.length > 1 ? nums[0] : nums[0];
  }
  if (!Number.isFinite(row.value)) row.value = firstClipboardRoll(row.text);
  if (!Number.isFinite(row.wantMin)) row.wantMin = Number.isFinite(row.value) ? row.value : row.lo;
  return row;
}

function mapRollsToTradeFilters(rolls, index, exact = false, extra = {}) {
  const grouped = new Map();
  for (const roll of rolls || []) {
    const raw = rollLineText(roll);
    const kind = canonicalRollKind(roll && typeof roll === "object" ? roll.kind : "");
    const text = stripAdvancedRanges(parseAffixStrings(raw));
    if (!isTradeableRoll(text, kind, roll)) continue;
    const hit = findTradeStat(index, text, kind, { preferLocal: localModApplies(foldTradeMatcher(text), extra) });
    if (!hit?.id) continue;
    const inverted = invertedTradeRoll(raw);
    const row = grouped.get(hit.id) || { id: hit.id, text, n: 0, option: String(hit.id).includes("|") };
    row.n += 1;
    const amount = Number.isFinite(roll?.wantMin)
      ? overlayLiveValue(roll)
      : firstClipboardRoll(raw, inverted);
    if (Number.isFinite(amount)) {
      if (inverted) {
        if (!Number.isFinite(row.max) || amount > row.max) row.max = amount;
      } else if (!Number.isFinite(row.min) || amount < row.min) row.min = amount;
    }
    grouped.set(hit.id, row);
    if (grouped.size >= 12) break;
  }
  let rows = [...grouped.values()];
  if (!exact) {
    const rings = rows.filter((row) => /bonuses gained from .*ring/i.test(row.text || ""));
    if (rings.length) rows = rings;
  }
  return rows.map((row) => {
    const next = { id: row.id };
    if (row.option && row.n > 1) next.min = row.n;
    else {
      if (Number.isFinite(row.min)) next.min = row.min;
      if (Number.isFinite(row.max)) next.max = row.max;
    }
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
  "sekhemas resolve": "Safrin's Resolve",
  "safrins resolve": "Safrin's Resolve",
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

let iconFolds = null;

function iconFoldMap() {
  if (iconFolds) return iconFolds;
  iconFolds = new Map();
  if (typeof ITEM_ICONS !== "undefined") {
    for (const [key, url] of Object.entries(ITEM_ICONS)) {
      const folded = foldKey(key);
      if (folded && !iconFolds.has(folded)) iconFolds.set(folded, url);
    }
  }
  return iconFolds;
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
  const byFold = iconFoldMap().get(folded);
  if (byFold) return byFold;
  for (const hit of prices.byName.values()) {
    if (hit?.icon && foldKey(hit.name) === folded) return hit.icon;
  }
  const bare = String(name).replace(/^(Superior|Exceptional|Advanced|Expert)\s+/i, "").trim();
  if (bare && bare !== name) return lookupIcon(bare);
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
  const unit = tradeUnit(primary);
  if (!unit || unit === "divine") return value;
  if (unit === "exalted") return prices.exaltedPerDivine ? value / prices.exaltedPerDivine : NaN;
  if (unit === "chaos") return prices.chaosPerDivine ? value / prices.chaosPerDivine : NaN;
  return NaN;
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
  return formatNum(value) + unitShort(unit);
}

function unitShort(unit) {
  const hit = tradeCurrency(unit);
  if (hit?.short === "d" || hit?.short === "ex" || hit?.short === "c") return hit.short;
  if (hit?.short) return " " + hit.short;
  if (!unit) return "d";
  return " " + String(unit).replace(/-/g, " ");
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
  paintLivePrices();
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

function priceDisplay(divine) {
  if (!Number.isFinite(divine)) return { label: "—", unit: "divine", amount: NaN };
  const main = convertMain();
  let unit = main;
  let amount = amountFromDivine(divine, unit);
  if (unit === "divine" && divine > 0 && divine < 1) {
    const ex = amountFromDivine(divine, "exalted");
    const chaos = amountFromDivine(divine, "chaos");
    if (Number.isFinite(ex) && ex >= 1) {
      unit = "exalted";
      amount = ex;
    } else if (Number.isFinite(chaos) && chaos >= 1) {
      unit = "chaos";
      amount = chaos;
    } else if (Number.isFinite(ex)) {
      unit = "exalted";
      amount = ex;
    } else if (Number.isFinite(chaos)) {
      unit = "chaos";
      amount = chaos;
    }
  }
  if (!Number.isFinite(amount)) {
    if (unit !== "exalted" && prices.exaltedPerDivine) {
      unit = "exalted";
      amount = amountFromDivine(divine, "exalted");
    } else if (unit !== "chaos" && prices.chaosPerDivine) {
      unit = "chaos";
      amount = amountFromDivine(divine, "chaos");
    } else {
      unit = "divine";
      amount = divine;
    }
  }
  return { label: formatAmount(amount, unit), unit, amount };
}

function formatDivine(divine) {
  return priceDisplay(divine).label;
}

function currencyNameForUnit(unit) {
  return tradeCurrency(unit).name;
}

function valueFromAmount(amount, unit) {
  const name = currencyNameForUnit(unit);
  return `<span class="value-with-icon" ${itemHoverAttr(name)}>${itemIconHtml(name)}${esc(formatAmount(amount, unit))}</span>`;
}

function rowValueHtml(row) {
  const divine = Number.isFinite(row?.divine) ? row.divine : toDivine(row?.amount, row?.unit);
  return valueHtml(divine);
}

function itemHoverAttr(name) {
  return `data-tip="${esc(name)}"`;
}

function itemIconHtml(name, size = "", slot = false) {
  const src = lookupIcon(name);
  const cls = "item-icon" + (size ? " " + size : "");
  if (!src) return size === "lg" || slot ? `<span class="${cls} missing" aria-hidden="true"></span>` : "";
  const fail = slot ? "this.classList.add('missing')" : "this.remove()";
  return `<img class="${cls}" src="${esc(src)}" alt="" draggable="false" onerror="${fail}" />`;
}

function itemNameHtml(name, size) {
  return `<span class="tip-source" ${itemHoverAttr(name)}>${itemIconHtml(name, size)}<span>${esc(name)}</span></span>`;
}

function dropIconNames(drop) {
  const unique = /^unique$/i.test(String(drop?.rarity || ""));
  const name = isUnidentifiedLine(drop?.name) ? "" : stripItemQualityPrefix(drop?.name);
  const base = isUnidentifiedLine(drop?.baseType) ? "" : stripItemQualityPrefix(drop?.baseType);
  return [...new Set((unique ? [name, base] : [base, name]).filter(Boolean))];
}

function dropIcon(drop) {
  for (const name of dropIconNames(drop)) {
    const src = lookupIcon(name);
    if (src) return src;
  }
  return "";
}

function dropIconHtml(drop, size = "") {
  const names = dropIconNames(drop);
  return itemIconHtml(names.find((name) => lookupIcon(name)) || names[0] || "", size, true);
}

const dropIconTried = new Set();

function ensureDropIcon(drop) {
  const names = dropIconNames(drop);
  if (!names.length || dropIcon(drop)) return;
  const key = names.join("|");
  if (dropIconTried.has(key)) return;
  dropIconTried.add(key);
  Promise.all(names.map((name) => fetchDbIcon(name))).then((urls) => {
    if (urls.some(Boolean)) paintPriceOverlay();
  });
}

function currencyForAmount(divine) {
  return currencyNameForUnit(priceDisplay(divine).unit);
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
  const n = Math.round(Number(prices.exaltedPerDivine) || 0);
  if (ui.inspect && n !== overlayRateShown) paintPriceOverlay();
}

function valueHtml(divine) {
  const shown = priceDisplay(divine);
  const name = currencyNameForUnit(shown.unit);
  return `<span class="value-with-icon" ${itemHoverAttr(name)}>${itemIconHtml(name)}${esc(shown.label)}</span>`;
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

function leagueName() {
  const select = document.getElementById("league-input");
  const text = String(select?.selectedOptions?.[0]?.textContent || "").trim();
  if (text) return text;
  return leagueId() || "Forbidden Rites";
}

let overlayRateShown = 0;
let overlayRateOpen = false;

function overlayRateCardHtml() {
  if (prices.status !== "ready" || !prices.exaltedPerDivine) {
    return `<div class="price-overlay-rate-card"><p class="muted">${
      prices.status === "loading" ? "Checking prices…" : "Check prices in the header to fill conversions."
    }</p></div>`;
  }
  const cols = allConvertUnits();
  const rows = convertSteps("divine")
    .map(
      (amount) =>
        `<tr>${cols.map((unit) => `<td>${esc(formatAmount(amountFromDivine(amount, unit), unit))}</td>`).join("")}</tr>`
    )
    .join("");
  return `<div class="price-overlay-rate-card"><table class="rate-table"><thead><tr>${cols
    .map((unit) => `<th>${esc(unitLabel(unit))}</th>`)
    .join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function overlayBarHtml() {
  const n = Math.round(Number(prices.exaltedPerDivine) || 0);
  overlayRateShown = n;
  const title = n > 0 ? "1 divine → " + n + " exalted" : "Conversions";
  const rate = `<span class="price-overlay-rate-wrap"><button type="button" class="price-overlay-rate${n > 0 ? "" : " is-empty"}" data-overlay-rate title="${esc(title)}"><svg class="price-overlay-swap" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 5h9.6L9.8 3.2 11 2l4 4-4 4-1.2-1.2L11.6 7H2V5zm12 6H4.4l1.8 1.8L5 14l-4-4 4-4 1.2 1.2L4.4 9H14v2z"/></svg>${n > 0 ? n : ""}</button>${overlayRateCardHtml()}</span>`;
  return `<div class="price-overlay-bar">${rate}<span class="price-overlay-league">${esc(leagueName())}</span><button type="button" class="price-overlay-x" data-close-inspect aria-label="Close">×</button></div>`;
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

function sparkLen(spark) {
  return sparkPoints(spark?.data).length;
}

function mergeSpark(a, b) {
  if (!a) return b;
  if (!b) return a;
  const pick = sparkLen(b) > sparkLen(a) ? b : a;
  const change = Number.isFinite(Number(b?.change)) ? Number(b.change) : Number(a?.change);
  return {
    change: Number.isFinite(change) ? change : 0,
    data: Array.isArray(pick?.data) ? pick.data : [],
  };
}

function mergeTableRows(oldRows, newRows) {
  const map = new Map();
  const keyOf = (row) => `${row?.type || ""}::${row?.ninjaId ?? ""}::${priceKey(row?.name || "")}`;
  for (const row of oldRows || []) {
    if (!row?.name) continue;
    map.set(keyOf(row), row);
  }
  for (const row of newRows || []) {
    if (!row?.name) continue;
    const key = keyOf(row);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      continue;
    }
    map.set(key, { ...prev, ...row, spark: mergeSpark(prev.spark, row.spark) });
  }
  return [...map.values()];
}

function mergeTables(prev, next) {
  if (!next || !Object.keys(next).length) return prev && typeof prev === "object" ? prev : {};
  if (!prev || !Object.keys(prev).length) return next;
  const out = { ...prev };
  for (const [type, rows] of Object.entries(next)) {
    out[type] = mergeTableRows(prev[type], rows);
  }
  return out;
}

function compactSpark(spark, mode = "short") {
  const change = Number(spark?.change);
  const compactChange = Number.isFinite(change) ? Number(change.toFixed(4)) : 0;
  if (mode === "bare" || mode === "change") return { change: compactChange, data: [] };
  const data = Array.isArray(spark?.data) ? spark.data.slice(-14) : [];
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
    tables: mergeTables(prev.tables, next.tables),
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

function persistEconomyDisk(entry) {
  if (!entry?.tables || !Object.keys(entry.tables).length) return;
  const local = readBossPriceStore();
  const diskLeagues = catalogDiskStore?.leagues && typeof catalogDiskStore.leagues === "object" ? catalogDiskStore.leagues : {};
  const prev = local.leagues?.[entry.league] || diskLeagues[entry.league];
  const merged = mergeLeagueEntry(prev, entry);
  if (!priceStoreHasData(merged)) return;
  writePriceDisk({ version: 3, leagues: prunePriceLeagues({ ...local.leagues, ...diskLeagues, [entry.league]: merged }) });
}

function hydrateFromDump(dump, cached = true) {
  if (!dump) return false;
  const items = Array.isArray(dump.items) ? dump.items : [];
  const tables = dump.tables && typeof dump.tables === "object" ? dump.tables : {};
  const tableRows = Object.values(tables).flatMap((rows) => (Array.isArray(rows) ? rows : []));
  const hasItems = items.length > 0 || tableRows.some((row) => pricedHit(row));
  if (!hasItems && !(Number(dump.exaltedPerDivine) > 0) && !Object.keys(tables).length) return false;
  if (Object.keys(tables).length) prices.tables = mergeTables(prices.tables, tables);
  if (dump.primary) prices.primary = dump.primary;
  if (Number(dump.exaltedPerDivine) > 0) prices.exaltedPerDivine = Number(dump.exaltedPerDivine);
  if (Number(dump.chaosPerDivine) > 0) prices.chaosPerDivine = Number(dump.chaosPerDivine);
  if (dump.league) prices.league = dump.league;
  if (Number(dump.fetchedAt) > (prices.fetchedAt || 0)) prices.fetchedAt = Number(dump.fetchedAt);
  prices.nextAt = ninjaNextAt(prices.fetchedAt);
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
  let sparkEntry = null;
  for (const attempt of attempts) {
    const entry = {
      ...base,
      items: attempt.items,
      tables: attempt.sparkMode === "none" ? {} : compactPriceTables(prices.tables, attempt.sparkMode),
    };
    if (attempt.sparkMode === "short") sparkEntry = entry;
    const leagues = prunePriceLeagues({ ...store.leagues, [league]: mergeLeagueEntry(store.leagues[league], entry) });
    try {
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ version: 2, leagues }));
      if (sparkEntry) persistEconomyDisk(sparkEntry);
      persistCatalogCache();
      return;
    } catch {
      /* quota — try a smaller payload */
    }
  }
  if (sparkEntry) persistEconomyDisk(sparkEntry);
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
        prices.tables = mergeTables(prices.tables, tables);
        bustPriceLookup();
        prices.primary = dump.primary || "divine";
        prices.exaltedPerDivine = Number(dump.exaltedPerDivine) || 0;
        prices.chaosPerDivine = Number(dump.chaosPerDivine) || 0;
        prices.league = dump.league || leagueId();
        prices.fetchedAt = Number(dump.fetchedAt) || 0;
        prices.nextAt = ninjaNextAt(prices.fetchedAt);
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
  prices.tables = mergeTables(oldTables, prices.tables);
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function ninjaLiveLabel() {
  if (prices.status === "loading") return "live check";
  const due = prices.nextAt || ninjaNextAt();
  if (!due) return "live on the hour";
  const ms = due - Date.now();
  if (ms <= 0) return "live · next soon";
  return "live · next " + formatCountdown(ms);
}

function paintPriceClock() {
  const el = document.getElementById("price-clock-time");
  const clock = document.getElementById("price-clock");
  if (clock) {
    clock.title = "poe.ninja updates on the hour. Click to refresh now. F7 overlay uses PoE 2 trade only.";
  }
  const live = document.getElementById("econ-live");
  if (live) {
    const label = ninjaLiveLabel();
    if (live.textContent !== label) live.textContent = label;
  }
  maybeRefreshNinja();
  if (!el) return;
  let text = "Check prices";
  if (prices.status === "loading") text = "Checking…";
  else if (prices.filling) {
    const total = prices.gapTotal || 0;
    const done = Math.min(prices.gapDone || 0, total);
    text = total ? `Boss prices ${done}/${total}` : "Checking listings…";
    if (tradeWaiting()) text += " · waiting";
  } else if (prices.looking.size) text = prices.looking.size ? `Listings ${prices.looking.size}…` : "Checking listings…";
  else if (prices.fetchedAt) text = (prices.cached ? "Last recorded " : "As of ") + formatHour(prices.fetchedAt);
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
    prices.nextAt = ninjaNextAt(prices.fetchedAt);
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
  return hourStamp(prices.fetchedAt) < hourStamp();
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
  if (!ninjaPricesDue()) {
    prices.nextAt = ninjaNextAt();
    paintPriceClock();
    return;
  }
  refreshPrices(false);
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

function tradeCurrency(unit) {
  const c = String(unit || "")
    .toLowerCase()
    .replace(/_/g, "-")
    .trim();
  const rows = {
    divine: { name: "Divine Orb", short: "d" },
    exalted: { name: "Exalted Orb", short: "ex" },
    chaos: { name: "Chaos Orb", short: "c" },
    regal: { name: "Regal Orb", short: "regal" },
    alchemy: { name: "Orb of Alchemy", short: "alch" },
    transmutation: { name: "Orb of Transmutation", short: "transmute" },
    augmentation: { name: "Orb of Augmentation", short: "aug" },
    chance: { name: "Orb of Chance", short: "chance" },
    vaal: { name: "Vaal Orb", short: "vaal" },
    annul: { name: "Annulment Orb", short: "annul" },
    annulment: { name: "Annulment Orb", short: "annul" },
    mirror: { name: "Mirror of Kalandra", short: "mirror" },
    blessed: { name: "Blessed Orb", short: "blessed" },
    jewellers: { name: "Jeweller's Orb", short: "jeweller" },
    gcp: { name: "Gemcutter's Prism", short: "gcp" },
    gemcutter: { name: "Gemcutter's Prism", short: "gcp" },
    "gemcutters-prism": { name: "Gemcutter's Prism", short: "gcp" },
    bauble: { name: "Glassblower's Bauble", short: "bauble" },
    "glassblowers-bauble": { name: "Glassblower's Bauble", short: "bauble" },
    artificers: { name: "Artificer's Orb", short: "artificer" },
    "artificers-orb": { name: "Artificer's Orb", short: "artificer" },
    whetstone: { name: "Blacksmith's Whetstone", short: "whetstone" },
    "blacksmiths-whetstone": { name: "Blacksmith's Whetstone", short: "whetstone" },
    armourers: { name: "Armourer's Scrap", short: "scrap" },
    "armourers-scrap": { name: "Armourer's Scrap", short: "scrap" },
    etcher: { name: "Arcanist's Etcher", short: "etcher" },
    "arcanists-etcher": { name: "Arcanist's Etcher", short: "etcher" },
    wisdom: { name: "Scroll of Wisdom", short: "wisdom" },
    "scroll-of-wisdom": { name: "Scroll of Wisdom", short: "wisdom" },
  };
  if (rows[c]) return rows[c];
  if (c.startsWith("divine")) return rows.divine;
  if (c.startsWith("exalt")) return rows.exalted;
  if (c.startsWith("chaos")) return rows.chaos;
  if (c.includes("regal")) return rows.regal;
  if (c.includes("alch")) return rows.alchemy;
  if (c.includes("transmute") || c.includes("transmutation")) return rows.transmutation;
  if (c.includes("augment")) return rows.augmentation;
  if (c.includes("annul")) return rows.annul;
  if (c.includes("vaal")) return rows.vaal;
  if (c.includes("mirror")) return rows.mirror;
  if (c.includes("jeweller")) return rows.jewellers;
  if (!c) return rows.divine;
  const label = c
    .replace(/-orb$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
  const name = /orb|mirror|omen|prism|scrap|bauble|etcher|whetstone|wisdom/i.test(label) ? label : label + " Orb";
  return { name, short: c.replace(/-orb$/, "").replace(/-/g, " ") };
}

function tradeUnit(currency) {
  const c = String(currency || "").toLowerCase();
  if (!c) return "";
  if (c === "divine" || c.startsWith("divine")) return "divine";
  if (c.startsWith("exalt")) return "exalted";
  if (c.startsWith("chaos")) return "chaos";
  return c;
}

function quoteCurrencyName(quote) {
  if (quote?.unit) return tradeCurrency(quote.unit).name;
  return currencyForAmount(quote?.divine);
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
  }, actions.some((action) => action.id === "update") ? 15000 : 6000);
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

function stripClipboardMarkup(text) {
  return String(text || "")
    .replace(/<<set:.+?>>/g, "")
    .replace(/<(if:.+?|elif:.+?|else)>{(.+?)}/g, (_, type, body) => (String(type).startsWith("if:") ? body : ""));
}

function cleanItemTitleLine(line) {
  return stripItemQualityPrefix(stripClipboardMarkup(parseAffixStrings(String(line || ""))))
    .replace(/\s+/g, " ")
    .trim();
}

function isItemTitleLine(line) {
  const t = cleanItemTitleLine(line);
  if (!t) return false;
  if (isItemJunkLine(t) || isUnidentifiedLine(t) || isCorruptedLine(t) || isRavenTouchedLine(t) || isSanctifiedLine(t)) return false;
  if (/^(mirrored|split|fractured item|synthesised item|foil unique)$/i.test(t)) return false;
  if (/:/.test(t) && !/^[+\-\d({]/.test(t)) return false;
  return true;
}

function isItemJunkLine(line) {
  const t = String(line || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return true;
  if (isUnidentifiedLine(t)) return true;
  if (/^you cannot use this item/i.test(t)) return true;
  if (/stats will be ignored/i.test(t)) return true;
  if (/^right click to/i.test(t)) return true;
  if (/^shift-?click/i.test(t)) return true;
  if (/^place into an item socket/i.test(t)) return true;
  return false;
}

function isFlavourLine(raw) {
  const t = stripAdvancedRanges(parseAffixStrings(String(raw || ""))).trim();
  if (!t) return false;
  if (/[.!?]/.test(t) && !/[\d%]/.test(t)) return true;
  if (/[\d%+]/.test(t) || /^allocates /i.test(t) || /^grants skill/i.test(t)) return false;
  if (/^(you|your|gain|grants|adds|cannot|always|enemies|allies|magic utility|socketed|hits against|culling)\b/i.test(t)) {
    return false;
  }
  return /^(the|a |an |once |when |in |from |they |there )/i.test(t) && t.length >= 20;
}

function foldItemFlagLine(line) {
  return stripAdvancedRanges(parseAffixStrings(String(line || "")))
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isRavenTouchedLine(line) {
  return /^raven-?touched$/i.test(foldItemFlagLine(line));
}

function isCorruptedLine(line) {
  return /^(corrupted|twice corrupted|double corrupted|unmodifiable)$/i.test(foldItemFlagLine(line));
}

function isMirroredLine(line) {
  return /^mirrored$/i.test(foldItemFlagLine(line));
}

function isSanctifiedLine(line) {
  return /^sanctified$/i.test(foldItemFlagLine(line));
}

function isAllocatesRoll(text) {
  return /^allocates /i.test(stripAdvancedRanges(parseAffixStrings(String(text || ""))).trim());
}

function isGrantedSkillRoll(text) {
  return /^grants skill/i.test(stripAdvancedRanges(parseAffixStrings(String(text || ""))).trim());
}

function wantsRavenTouched(drop) {
  return !!(drop?.ravenTouched && drop.pickRaven !== false);
}

function searchCorrupted(drop) {
  if (typeof drop?.corrupted !== "boolean") return undefined;
  if (typeof drop.pickCorrupt === "boolean") return drop.pickCorrupt;
  return drop.corrupted;
}

function parseUnidentifiedFlag(raw) {
  const m = String(raw || "").match(/^Unidentified(?:\s*\(Tier\s*(\d+)\))?\s*$/im);
  if (!m) return { unidentified: false, unidentifiedTier: 0 };
  return { unidentified: true, unidentifiedTier: m[1] ? Math.max(0, Number(m[1]) || 0) : 0 };
}

function isUnidentifiedLine(line) {
  return /^unidentified(?:\s*\(tier\s*\d+\))?\s*$/i.test(String(line || "").trim());
}

function searchUnidentified(drop) {
  if (!drop?.unidentified) return undefined;
  if (typeof drop.pickUnid === "boolean") return drop.pickUnid;
  return true;
}

function uniqueBaseKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function ninjaUniqueType(className) {
  const t = String(className || "");
  if (/jewels?/i.test(t)) return "UniqueJewels";
  if (/flasks?/i.test(t)) return "UniqueFlasks";
  if (/charms?/i.test(t)) return "UniqueCharms";
  if (/relics?/i.test(t)) return "UniqueSanctumRelics";
  if (/tablets?|precursor/i.test(t)) return "UniqueTablets";
  if (/body|helmet|glove|boot|shield|buckler|foci|focus|quiver/i.test(t)) return "UniqueArmours";
  if (/amulet|belt|ring/i.test(t)) return "UniqueAccessories";
  if (/wand|mace|sword|axe|bow|staff|spear|claw|dagger|crossbow|flail|sceptre|quarter/i.test(t)) return "UniqueWeapons";
  return "";
}

function uniqueVariantsForBase(base, className) {
  const want = uniqueBaseKey(stripItemQualityPrefix(base));
  if (!want) return [];
  const seen = new Set();
  const out = [];
  function add(name, icon) {
    const n = String(name || "").trim();
    if (!n || /^incomplete$/i.test(n) || namesMatch(n, base)) return;
    const id = uniqueBaseKey(n);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ name: n, icon: icon || lookupIcon(n) || "" });
  }
  for (const name of UNIQUE_BY_BASE[want] || []) add(name);
  const type = ninjaUniqueType(className);
  const tables = type ? [prices.tables[type] || []] : Object.values(prices.tables || {});
  for (const rows of tables) {
    for (const row of rows || []) {
      if (uniqueBaseKey(row.baseType || "") === want) add(row.name, row.icon);
    }
  }
  for (const lore of loreCache.values()) {
    if (uniqueBaseKey(lore.baseType || "") === want) add(lore.name, lore.icon);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function unidentifiedUniqueNeedsPick(drop) {
  if (!drop?.unidentified || !/^unique$/i.test(drop.rarity || "") || drop.uniquePicked) return false;
  const name = drop.name || "";
  const base = drop.baseType || name;
  return !name || namesMatch(name, base);
}

function applyUniquePick(log, drop, name) {
  if (!drop || !name) return;
  drop.name = name;
  drop.uniqueId = slug(name);
  drop.uniquePicked = true;
  drop.quoteTried = false;
  delete drop.quote;
  if (log?.id) save();
  paintPriceOverlay();
}

async function ensureUniqueVariants(log, drop) {
  if (!unidentifiedUniqueNeedsPick(drop)) return;
  const type = ninjaUniqueType(drop.className);
  if (!type || (prices.tables[type] || []).length) return;
  try {
    const q = encodeURIComponent(leagueId());
    const data = await ninjaFetch(`/poe2/api/economy/stash/current/item/overview?league=${q}&type=${type}`);
    ingestItems(data, type);
  } catch {
    /* keep the local unique list */
  }
}

function isFlavourBlock(block) {
  const lines = String(block || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return false;
  if (lines.some((line) => /^\{/.test(line) || kindFromLineTag(line))) return false;
  const body = lines.filter(
    (line) =>
      !isItemJunkLine(line) &&
      !isRavenTouchedLine(line) &&
      !isCorruptedLine(line) &&
      !isUnidentifiedLine(line) &&
      !isSanctifiedLine(line) &&
      !/^(mirrored|split|fractured item|synthesised item)$/i.test(line)
  );
  if (!body.length) return false;
  if (body.some((line) => /[\d%+]/.test(line) || /^allocates /i.test(line))) return false;
  return body.some((line) => isFlavourLine(line));
}

function identityFromBlocks(blocks, rarity) {
  for (const block of blocks || []) {
    const lines = String(block || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    if (lines.some((line) => /^\{/.test(line) || /^(requirements|sockets|item level|quality)\b/i.test(line))) continue;
    if (isFlavourBlock(lines.join("\n"))) continue;
    const clean = lines.map((line) => cleanItemTitleLine(line)).filter((line) => isItemTitleLine(line) && !/^\{/.test(line));
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
  const titleLines = rest.filter((line) => isItemTitleLine(line)).map((line) => cleanItemTitleLine(line));
  let name = titleLines[0] || "";
  let baseType = titleLines[1] || "";
  if (!name || (!baseType && /^(rare|unique)$/i.test(rarity))) {
    const extra = identityFromBlocks(blocks.slice(1), rarity);
    if (!name) name = cleanItemTitleLine(extra.name);
    if (!baseType) baseType = cleanItemTitleLine(extra.baseType);
  }
  if (isUnidentifiedLine(name)) name = "";
  if (isUnidentifiedLine(baseType)) baseType = "";
  if (/^(currency|gem|divination card)$/i.test(rarity)) baseType = name || baseType;
  else if (/^normal$/i.test(rarity)) baseType = name || baseType;
  else if (/^magic$/i.test(rarity) && (!baseType || namesMatch(baseType, name))) baseType = "";
  if (!baseType && /^(rare|unique|normal)$/i.test(rarity)) baseType = name;
  if (!name) return null;
  const { unidentified, unidentifiedTier } = parseUnidentifiedFlag(raw);
  let qty = 1;
  const stack = raw.match(/Stack Size:\s*([\d,]+)/i);
  if (stack) qty = Math.max(1, Number(stack[1].replace(/,/g, "")) || 1);
  const corrupted =
    /^\s*(Corrupted|Twice Corrupted|Double Corrupted|Unmodifiable)\s*$/im.test(raw) ||
    /\{[^}]*Corruption Enhancement/i.test(raw);
  const flagLines = String(raw).split("\n");
  const mirrored = flagLines.some((line) => isMirroredLine(line));
  const sanctified = flagLines.some((line) => isSanctifiedLine(line));
  const props = parseLocalProps(raw);
  const parsedMods = parseClipboardMods(blocks.slice(1), rarity, corrupted, name, baseType, className, props);
  const mods = parsedMods.mods;
  const ravenTouched =
    parsedMods.ravenTouched || /raven-?touched/i.test(parseAffixStrings(raw).replace(/[\u2010-\u2015]/g, "-"));
  const useHit = raw.match(/(\d+)\s+uses? remaining/i);
  const usesRemaining = useHit ? Math.max(0, Number(String(useHit[1]).replace(/,/g, "")) || 0) : 0;
  const runeMods = mods.filter((mod) => canonicalRollKind(mod.kind) === "rune").length;
  let runeSockets = 0;
  const sock = raw.match(/^Sockets:\s*(.+)$/im);
  if (sock) runeSockets = (sock[1].match(/S/gi) || []).length;
  runeSockets = Math.max(runeSockets, runeMods);
  const charmHit = raw.match(/^Charm Slots:\s*(\d+)/im);
  const charmSlots = charmHit ? Math.max(0, Number(charmHit[1]) || 0) : 0;
  const isCorrupted = corrupted || mods.some((mod) => canonicalRollKind(mod.kind) === "corrupt");
  return { name, baseType, rarity, className, qty, corrupted: isCorrupted, mirrored, sanctified, unidentified, unidentifiedTier, ravenTouched, mods, usesRemaining, runeSockets, charmSlots, props };
}

function canonicalRollKind(kind) {
  const k = String(kind || "").toLowerCase();
  if (k === "implicit" || k === "enchant" || k === "rune" || k === "corrupt" || k === "skill") return k;
  return "explicit";
}

function isBaseModKind(kind) {
  return canonicalRollKind(kind) !== "explicit";
}

function rollSlot(roll) {
  const s = String(roll && typeof roll === "object" ? roll.slot : "").toLowerCase();
  return s === "prefix" || s === "suffix" ? s : "";
}

function rollHasAffixTiers(roll) {
  if (roll?.unique || roll?.ghost) return false;
  const kind = canonicalRollKind(roll?.kind);
  if (kind === "corrupt" || kind === "implicit" || kind === "enchant" || kind === "rune" || kind === "skill") return false;
  return !!rollSlot(roll);
}

function parseModInfoLine(rawLine) {
  const inner = String(rawLine || "")
    .replace(/^\{|\}$/g, "")
    .trim();
  const tierHit = inner.match(/\(tier:\s*(\d+)\)/i);
  const tier = tierHit ? Number(tierHit[1]) || 0 : 0;
  if (/corruption enhancement/i.test(inner) || /corrupted implicit/i.test(inner)) return { kind: "corrupt", slot: "", tier, unique: false };
  if (/\bprefix modifier\b/i.test(inner) || /^prefix\b/i.test(inner)) return { kind: "explicit", slot: "prefix", tier, unique: false };
  if (/\bsuffix modifier\b/i.test(inner) || /^suffix\b/i.test(inner)) return { kind: "explicit", slot: "suffix", tier, unique: false };
  if (
    /\benchant modifier\b/i.test(inner) ||
    /^enchant\b/i.test(inner) ||
    /^enhancement\b/i.test(inner)
  ) {
    return { kind: "enchant", slot: "", tier, unique: false };
  }
  if (/\bimplicit modifier\b/i.test(inner) || /^implicit\b/i.test(inner)) return { kind: "implicit", slot: "", tier, unique: false };
  if (/\b(?:added )?augment modifier\b/i.test(inner) || /\brune modifier\b/i.test(inner) || /^(?:rune|augment|added augment)\b/i.test(inner)) {
    return { kind: "rune", slot: "", tier, unique: false };
  }
  if (/\b(?:vaal )?unique modifier\b/i.test(inner)) return { kind: "explicit", slot: "", tier: 0, unique: true };
  if (/\bexplicit modifier\b/i.test(inner) || /^explicit\b/i.test(inner)) return { kind: "explicit", slot: "", tier, unique: false };
  return { kind: "explicit", slot: "", tier, unique: false };
}

function kindFromLineTag(rawLine) {
  const t = String(rawLine || "");
  if (/\((?:added )?(?:rune|augment)\)\s*$/i.test(t) || /\((?:added )?(?:rune|augment)\)/i.test(t)) return "rune";
  if (/\(enchant\)\s*$/i.test(t) || /\(enchant\)/i.test(t)) return "enchant";
  if (/\(implicit\)\s*$/i.test(t) || /\(implicit\)/i.test(t)) return "implicit";
  return "";
}

function parseClipboardMods(blocks, rarity, corrupted, itemName = "", itemBase = "", className = "", props = null) {
  if (/^(currency|gem|divination card)$/i.test(rarity)) return { mods: [], ravenTouched: false };
  const charm = /charm/i.test(className);
  const uniqueItem = /unique/i.test(String(rarity || ""));
  const groups = [];
  let affix = 0;
  let afterFooter = false;
  let ravenTouched = false;
  for (const block of blocks || []) {
    if (afterFooter) break;
    if (isFlavourBlock(block)) continue;
    let sectionKind = "explicit";
    let sectionSlot = "";
    let sectionTier = 0;
    let sectionUnique = false;
    let headerAffix = 0;
    let sawHeader = false;
    const collected = [];
    for (const line of String(block || "").split("\n")) {
      const rawLine = line.trim();
      if (!rawLine) continue;
      if (isItemJunkLine(rawLine)) continue;
      if (itemName && namesMatch(rawLine, itemName)) continue;
      if (itemBase && namesMatch(rawLine, itemBase)) continue;
      if (/^\{/.test(rawLine)) {
        if (isRavenTouchedLine(rawLine) || /raven-?touched/i.test(rawLine)) ravenTouched = true;
        const info = parseModInfoLine(rawLine);
        sectionKind = info.kind;
        sectionSlot = info.slot;
        sectionTier = info.tier || 0;
        sectionUnique = !!info.unique;
        affix += 1;
        headerAffix = affix;
        sawHeader = true;
        continue;
      }
      if (/^(requirements|sockets|item level|quality|armour|evasion rating|energy shield|ward|stack size|level:|str:|dex:|int:|note:|requires:)/i.test(rawLine)) continue;
      if (isRavenTouchedLine(rawLine)) {
        ravenTouched = true;
        continue;
      }
      if (
        isCorruptedLine(rawLine) ||
        isUnidentifiedLine(rawLine) ||
        isSanctifiedLine(rawLine) ||
        /^(mirrored|split|fractured item|synthesised item)$/i.test(rawLine)
      ) {
        if (isCorruptedLine(rawLine) || isMirroredLine(rawLine)) afterFooter = true;
        continue;
      }
      if (isFlavourLine(rawLine)) continue;
      const tagged = kindFromLineTag(rawLine);
      if (!tagged && /:\s/.test(rawLine) && !/^[+\-\d({]/.test(rawLine) && !isGrantedSkillRoll(rawLine)) continue;
      if (rawLine.length > 160) continue;
      const kind = tagged || sectionKind;
      collected.push({
        text: parseAffixStrings(rawLine),
        kind,
        slot: tagged ? "" : sectionSlot,
        affix: sawHeader ? headerAffix : 0,
        tier: sawHeader ? sectionTier : 0,
        unique: sawHeader ? sectionUnique : false,
        charm,
      });
    }
    let seenSlot = false;
    for (const mod of collected) {
      if (rollSlot(mod)) seenSlot = true;
      else if (
        !seenSlot &&
        !mod.unique &&
        !uniqueItem &&
        canonicalRollKind(mod.kind) === "explicit" &&
        !rollSlot(mod) &&
        !isAllocatesRoll(mod.text) &&
        !isGrantedSkillRoll(mod.text)
      ) {
        mod.kind = corrupted ? "corrupt" : "implicit";
      }
    }
    if (collected.some((mod) => canonicalRollKind(mod.kind) === "rune")) {
      for (const mod of collected) {
        if (canonicalRollKind(mod.kind) !== "explicit" || rollSlot(mod) || mod.unique) continue;
        if (isAllocatesRoll(mod.text) || isGrantedSkillRoll(mod.text)) continue;
        mod.kind = "rune";
      }
    }
    if (collected.length) groups.push(collected);
  }
  const runeAt = groups.findIndex((group) => group.some((mod) => canonicalRollKind(mod.kind) === "rune"));
  const affixAt = groups.findIndex((group) => group.some((mod) => rollSlot(mod)));
  const cut = [runeAt, affixAt].filter((n) => n > 0).sort((a, b) => a - b)[0];
  if (cut > 0) {
    for (let i = 0; i < cut; i++) {
      for (const mod of groups[i]) {
        if (uniqueItem || mod.unique || canonicalRollKind(mod.kind) !== "explicit" || rollSlot(mod)) continue;
        if (isAllocatesRoll(mod.text) || isGrantedSkillRoll(mod.text)) continue;
        mod.kind = corrupted ? "corrupt" : "implicit";
      }
    }
  }
  const tagged = groups.some((group) => group.some((mod) => isBaseModKind(mod.kind) || rollSlot(mod)));
  const modGroups = groups.filter((group) => group.some((mod) => isUsefulRoll(mod.text, mod.kind, mod) || /[\d%+]/.test(mod.text)));
  if (!tagged && modGroups.length >= 2) {
    const last = modGroups[modGroups.length - 1];
    for (const group of modGroups) {
      if (group === last) continue;
      if (!corrupted && group !== modGroups[0]) continue;
      for (const mod of group) {
        if (uniqueItem || mod.unique || isAllocatesRoll(mod.text) || isGrantedSkillRoll(mod.text)) continue;
        mod.kind = "implicit";
      }
    }
  }
  const flat = groups.flat();
  for (const mod of flat) {
    if (isGrantedSkillRoll(mod.text)) mod.kind = "skill";
    if (isAllocatesRoll(mod.text) && !rollSlot(mod)) mod.kind = "enchant";
    if (uniqueItem && canonicalRollKind(mod.kind) === "explicit" && !rollSlot(mod)) {
      mod.unique = true;
      mod.tier = 0;
    }
  }
  return { mods: cleanClipboardRolls(flat, { className, props }), ravenTouched };
}

function parseAffixStrings(text) {
  return String(text || "").replace(/\[([^\]|]+)\|?([^\]]*)\]/g, (_, a, b) => b || a);
}

function stripAdvancedRanges(text) {
  return String(text || "")
    .replace(/\s*[—–]\s*Unscalable Value/gi, "")
    .replace(/\s*\((?:augmented|unmet|implicit|enchant|rune|unscalable(?: value)?)\)/gi, "")
    .replace(/([+-]?)(-?\d+(?:\.\d+)?)\((?:[^)]*)\)/g, (_, sign, n) => (sign || "") + n)
    .replace(/\(([-+]?\d[\d.\s,|/~—–-]*[-+]?\d)\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulRoll(text, kind, extra) {
  const t = stripAdvancedRanges(parseAffixStrings(String(text || ""))).trim();
  if (!t || t.length > 160) return false;
  if (isFlavourLine(t)) return false;
  if (isRavenTouchedLine(t)) return false;
  if (/^you cannot use this item/i.test(t)) return false;
  if (/stats will be ignored/i.test(t)) return false;
  if (/^place into an item socket/i.test(t)) return false;
  if (/^used when you/i.test(t) && !extra?.charm) return false;
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
  if (extra?.unique && t.length >= 8 && !/[.!?]$/.test(t)) return true;
  if (/\bflasks?\b/i.test(t) && t.length >= 12 && !/[.!?]$/.test(t)) return true;
  if (/^(you|your|gain|grants|adds|cannot|always|enemies|allies|magic utility)\b/i.test(t) && t.length >= 16) return true;
  return false;
}

function keepRollMeta(roll, text, kind, slot, pick) {
  const row = { text, kind, slot, pick };
  if (Number.isInteger(roll?.affix) && roll.affix > 0) row.affix = roll.affix;
  if (Number(roll?.tier) > 0) row.tier = Number(roll.tier);
  if (roll?.unique) row.unique = true;
  if (roll?.charm) row.charm = true;
  if (Number.isInteger(roll?.rid) && roll.rid > 0) row.rid = roll.rid;
  if (Number.isFinite(roll?.lo) && Number.isFinite(roll?.hi)) {
    row.lo = Number(roll.lo);
    row.hi = Number(roll.hi);
    row.value = Number.isFinite(roll.value) ? Number(roll.value) : firstClipboardRoll(text);
    row.wantMin = Number.isFinite(roll.wantMin) ? Number(roll.wantMin) : row.value;
    if (Number.isFinite(roll.wantMax)) row.wantMax = Number(roll.wantMax);
    if (roll.flatAvg) {
      row.flatAvg = true;
      if (Number.isFinite(roll.flatA)) row.flatA = Number(roll.flatA);
      if (Number.isFinite(roll.flatB)) row.flatB = Number(roll.flatB);
    }
    if (Number.isFinite(roll.spanLo)) row.spanLo = Number(roll.spanLo);
    if (Number.isFinite(roll.spanHi)) row.spanHi = Number(roll.spanHi);
    if (Number(roll.spanSteps) > 1) row.spanSteps = Number(roll.spanSteps);
    const tiers = parseSpanTiers(roll.spanTiers);
    if (tiers.length) row.spanTiers = tiers;
    if (Array.isArray(roll.extra) && roll.extra.length) {
      row.extra = roll.extra
        .map((ex) => {
          const lo = Number(ex?.lo);
          const hi = Number(ex?.hi);
          const value = Number.isFinite(ex.value) ? Number(ex.value) : lo;
          if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
          const next = { lo, hi, value: Number.isFinite(value) ? value : lo };
          if (Number.isFinite(ex.spanLo)) next.spanLo = Number(ex.spanLo);
          if (Number.isFinite(ex.spanHi)) next.spanHi = Number(ex.spanHi);
          if (Number.isFinite(ex.wantMin)) next.wantMin = Number(ex.wantMin);
          if (Number.isFinite(ex.wantMax)) next.wantMax = Number(ex.wantMax);
          const extraTiers = parseSpanTiers(ex.spanTiers);
          if (extraTiers.length) next.spanTiers = extraTiers;
          return next;
        })
        .filter(Boolean);
    }
  }
  return row;
}

function markHybridRolls(rows) {
  const counts = new Map();
  for (const row of rows || []) {
    if (!row.affix || !rollSlot(row)) continue;
    counts.set(row.affix, (counts.get(row.affix) || 0) + 1);
  }
  for (const row of rows || []) {
    if (row.affix && rollSlot(row) && counts.get(row.affix) > 1) row.hybrid = true;
    else delete row.hybrid;
  }
  return rows;
}

function cleanClipboardRolls(mods, ctx) {
  const out = [];
  let rid = 0;
  for (const mod of mods || []) {
    const kind = canonicalRollKind(mod && typeof mod === "object" ? mod.kind : "");
    const slot = rollSlot(mod);
    const raw = rollLineText(mod) || String(mod || "");
    const text = stripAdvancedRanges(
      parseAffixStrings(raw)
        .replace(/\s*\((?:augmented|unmet|implicit|enchant|rune)\)/gi, "")
        .replace(/\s+/g, " ")
        .trim()
    );
    if (!isUsefulRoll(text, kind, mod)) continue;
    const row = keepRollMeta(mod, text, kind, slot, false);
    if (isWeaponEleFlatRoll(row, ctx)) row.pick = false;
    row.rid = ++rid;
    applyRollSpan(row, raw);
    out.push(row);
    if (out.length >= 32) break;
  }
  return expandRollSpans(markHybridRolls(out), ctx);
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

function normalizeRolls(rolls, ctx) {
  const out = [];
  let rid = 0;
  for (const roll of rolls || []) {
    if (Number.isInteger(roll?.rid) && roll.rid > rid) rid = roll.rid;
  }
  for (const roll of rolls || []) {
    const kind = canonicalRollKind(roll && typeof roll === "object" ? roll.kind : "");
    const slot = rollSlot(roll);
    const raw = rollLineText(roll);
    const text = stripAdvancedRanges(parseAffixStrings(raw));
    if (!isUsefulRoll(text, kind, roll)) continue;
    const row = keepRollMeta(roll, text, kind, slot, !!(roll && typeof roll === "object" && roll.pick));
    if (isWeaponEleFlatRoll(row, ctx)) row.pick = false;
    if (!Number.isInteger(row.rid) || row.rid < 1) row.rid = ++rid;
    else if (row.rid > rid) rid = row.rid;
    applyRollSpan(row, raw);
    out.push(row);
    if (out.length >= 32) break;
  }
  return expandRollSpans(markHybridRolls(out), ctx);
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
  const rolls = withTabletUsesRoll(drop, normalizeRolls(drop?.rolls, drop)).filter((roll) => roll.pick);
  return rolls;
}

function inspectRolls(drop) {
  const rolls = normalizeRolls(drop?.rolls, drop);
  let list = rolls;
  if (!rolls.some((roll) => {
    const kind = canonicalRollKind(roll.kind);
    return kind === "implicit" || kind === "corrupt" || kind === "skill";
  })) {
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
  if (msg.overlayRate != null) {
    return;
  }
  if (msg.pickBase) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    applyDropBaseMode(log, drop, msg.pickBase);
    return;
  }
  if (msg.pickUnique) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    applyUniquePick(log, drop, msg.pickUnique);
    return;
  }
  if (msg.pickCorrupt) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickCorrupt);
    if (!drop) return;
    drop.pickCorrupt = searchCorrupted(drop) === false;
    drop.quoteTried = false;
    delete drop.quote;
    if (log?.id) save();
    paintPriceOverlay();
    return;
  }
  if (msg.pickUnid) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickUnid);
    if (!drop) return;
    drop.pickUnid = searchUnidentified(drop) === false;
    drop.quoteTried = false;
    delete drop.quote;
    if (log?.id) save();
    paintPriceOverlay();
    return;
  }
  if (msg.pickRaven) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickRaven);
    if (!drop) return;
    drop.pickRaven = drop.pickRaven === false;
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
  if (msg.pickRunesToggle != null) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    toggleDropRunePick(log, drop);
    return;
  }
  if (msg.pickProp) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    togglePickProp(log, drop, msg.pickProp);
    return;
  }
  if (msg.pickDpsType) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    setDropDpsType(log, drop, msg.pickDpsType);
    return;
  }
  if (msg.pickSearch) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    applyDropSearchToggle(log, drop, msg.pickSearch);
    return;
  }
  if (msg.qStep != null) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    if (String(msg.spanRid || "") === "ilvl") stepDropIlvl(log, drop, msg.qStep, false);
    else stepDropQuality(log, drop, msg.qStep, false);
    return;
  }
  if (msg.pickHave) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    setExchangeHave(log, drop, msg.pickHave);
    return;
  }
  if (msg.spanRid) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    const live = msg.spanLive === true || msg.spanLive === "true";
    setRollWantMin(log, drop, msg.spanRid, msg.spanMin, live);
    return;
  }
  if (msg.pickRid || msg.pickText || msg.pickAffix) {
    const { log, drop } = overlayLogDrop(msg.pickLog, msg.pickDrop);
    if (msg.pickRid) {
      toggleInspectRoll(log, drop, msg.pickText, msg.pickKind, msg.pickRid);
      return;
    }
    if (msg.pickText) {
      toggleInspectRoll(log, drop, msg.pickText, msg.pickKind);
      return;
    }
    if (!drop) return;
    drop.rolls = normalizeRolls(drop.rolls, drop);
    const row = drop.rolls.find((roll) => String(roll.affix) === String(msg.pickAffix));
    if (row) toggleInspectRoll(log, drop, row.text, row.kind, row.rid);
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
  if (msg.openTradeSite) {
    const { drop } = overlayLogDrop(msg.openTradeLog, msg.openTradeSite);
    openTradeWebsite(drop);
    return;
  }
  if (msg.priceLookup) lookupOnePrice(msg.priceLookup);
}

function closeInspect() {
  ui.inspect = null;
  ui.dashRollId = null;
  overlayRateOpen = false;
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

function rollKindLabel(roll, tierOverride) {
  if (roll?.ghost) return "Typical";
  const kind = canonicalRollKind(roll?.kind);
  let tag = "";
  if (kind === "skill" || isGrantedSkillRoll(roll?.text)) tag = "Skill";
  else if (kind === "implicit") tag = "Implicit";
  else if (kind === "corrupt") tag = "Corrupted";
  else if (kind === "enchant") tag = "Enchant";
  else if (kind === "rune") tag = "Rune";
  else {
    const slot = rollSlot(roll);
    if (slot === "prefix") tag = "Prefix";
    else if (slot === "suffix") tag = "Suffix";
  }
  const tier = Number.isInteger(tierOverride) && tierOverride > 0 ? tierOverride : Number(roll?.tier);
  if (tag && tier > 0 && !roll?.unique && (rollHasAffixTiers(roll) || kind === "corrupt")) tag += " T" + tier;
  if (tag && roll?.hybrid) tag += " · hyb";
  return tag;
}

function rollKindClass(roll) {
  const kind = canonicalRollKind(roll?.kind);
  if (kind === "skill" || isGrantedSkillRoll(roll?.text)) return " is-skill";
  if (kind === "implicit") return " is-implicit";
  if (kind === "corrupt") return " is-corrupt";
  if (kind === "enchant") return " is-enchant";
  if (kind === "rune") return " is-rune";
  const slot = rollSlot(roll);
  if (slot === "prefix") return " is-prefix";
  if (slot === "suffix") return " is-suffix";
  return "";
}

function overlayModText(roll) {
  const text = String(roll?.text || "");
  if (isGrantedSkillRoll(text)) return text.replace(/^grants skill:\s*/i, "").trim();
  return text;
}

function formatRollNum(n, step) {
  if (!Number.isFinite(n)) return "";
  if (step === "0.1") return String(Math.round(n * 10) / 10);
  return String(Math.round(n));
}

function sliderDriver(roll) {
  const selfLo = Number.isFinite(roll?.spanLo) ? Number(roll.spanLo) : Number(roll?.lo);
  const selfHi = Number.isFinite(roll?.spanHi) ? Number(roll.spanHi) : Number(roll?.hi);
  let best = { extra: null, lo: selfLo, hi: selfHi, tiers: parseSpanTiers(roll?.spanTiers) };
  let width = Number.isFinite(selfHi) && Number.isFinite(selfLo) ? selfHi - selfLo : -1;
  for (const ex of roll?.extra || []) {
    const lo = Number.isFinite(ex.spanLo) ? Number(ex.spanLo) : Number(ex.lo);
    const hi = Number.isFinite(ex.spanHi) ? Number(ex.spanHi) : Number(ex.hi);
    if (!(hi > lo)) continue;
    if (hi - lo > width + 0.01) {
      width = hi - lo;
      best = { extra: ex, lo, hi, tiers: parseSpanTiers(ex.spanTiers) };
    }
  }
  return best;
}

function overlayDivSlot(n, pos) {
  if (!(n > 0) || !Number.isFinite(pos)) return null;
  if (pos <= 0) return { i: 0, u: 0 };
  if (pos >= n) return { i: n - 1, u: 1 };
  const i = Math.min(n - 1, Math.max(0, Math.ceil(pos) - 1));
  return { i, u: Math.min(1, Math.max(0, pos - i)) };
}

function tiersAreFlat(tiers) {
  const list = parseSpanTiers(tiers);
  return list.length > 1 && list.every((t) => !(Number(t.hi) > Number(t.lo)));
}

function applyDivRange(lo, hi, u) {
  if (u <= 0) return lo;
  if (u >= 1) return hi;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return lo;
  if (String(lo).includes(".") || String(hi).includes(".")) return lo + u * (hi - lo);
  const span = hi - lo;
  if (!(span > 0)) return lo;
  // First/last tenth of each tier stick to lo/hi so endpoints are easy to hit while dragging.
  const edge = 0.1;
  if (u <= edge) return lo;
  if (u >= 1 - edge) return hi;
  return lo + Math.round(((u - edge) / (1 - 2 * edge)) * span);
}

function damageToDiv(tiers, dmg) {
  const list = parseSpanTiers(tiers);
  if (!list.length || !Number.isFinite(dmg)) return 0;
  if (tiersAreFlat(list)) {
    for (let i = 0; i < list.length; i++) {
      if (Math.abs(dmg - list[i].lo) < 0.02) return i;
    }
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < list.length; i++) {
      const d = Math.abs(dmg - list[i].lo);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }
  const pos = tierPos(list, dmg);
  if (!pos) return 0;
  if (pos.u <= 0 && pos.i > 0) return pos.i + 0.0001;
  return pos.i + pos.u;
}

function divToDamage(tiers, pos) {
  const list = parseSpanTiers(tiers);
  if (!list.length || !Number.isFinite(pos)) return NaN;
  if (tiersAreFlat(list)) {
    const i = Math.min(list.length - 1, Math.max(0, Math.round(pos)));
    return list[i].lo;
  }
  const slot = overlayDivSlot(list.length, pos);
  if (!slot) return NaN;
  const t = list[slot.i];
  return applyDivRange(t.lo, t.hi, slot.u);
}

function overlayDivPos(roll) {
  const d = sliderDriver(roll);
  const n = d.tiers.length;
  if (!(n > 1) || !(Number(d.hi) > Number(d.lo))) return NaN;
  const w = Number(roll?.wantMin);
  let dmg;
  if (d.extra) {
    dmg = Number.isFinite(w) && w + 0.01 >= d.lo && w - 0.01 <= d.hi ? w : Number(d.extra.value);
  } else {
    dmg = Number.isFinite(w) && w + 0.01 >= d.lo && w - 0.01 <= d.hi ? w : Number.isFinite(roll?.value) ? Number(roll.value) : d.lo;
  }
  if (!Number.isFinite(dmg)) dmg = d.lo;
  if (sliderIsTierStep(d.tiers, roll)) {
    if (Number.isFinite(roll?.wantMax)) {
      for (let i = 0; i < d.tiers.length; i++) {
        if (Math.abs(d.tiers[i].lo - dmg) < 0.02 && Math.abs(d.tiers[i].hi - Number(roll.wantMax)) < 0.02) return i;
      }
    }
    const hit = tierPos(d.tiers, dmg);
    return hit ? hit.i : 0;
  }
  return damageToDiv(d.tiers, dmg);
}
function overlaySliderValue(roll) {
  const pos = overlayDivPos(roll);
  if (Number.isFinite(pos)) return pos;
  const d = sliderDriver(roll);
  const w = Number(roll?.wantMin);
  if (d.extra) {
    if (Number.isFinite(w) && w + 0.01 >= d.lo && w - 0.01 <= d.hi) return snapRollNum(w, roll);
    const ev = Number(d.extra.value);
    if (Number.isFinite(ev)) return snapRollNum(Math.min(d.hi, Math.max(d.lo, ev)), roll);
  }
  const lo = Number.isFinite(roll?.spanLo) ? Number(roll.spanLo) : Number(roll?.lo);
  const hi = Number.isFinite(roll?.spanHi) ? Number(roll.spanHi) : Number(roll?.hi);
  const v = Number.isFinite(w) ? w : Number.isFinite(roll?.value) ? Number(roll.value) : lo;
  if (!Number.isFinite(v)) return NaN;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return snapRollNum(v, roll);
  return snapRollNum(Math.min(hi, Math.max(lo, v)), roll);
}

function extraLiveValue(roll, extra) {
  if (roll?.flatAvg) return overlayLiveValue(roll);
  const extraTiers = parseSpanTiers(extra?.spanTiers);
  const pos = overlayDivPos(roll);
  if (Number.isFinite(pos) && extraTiers.length) {
    const n = divToDamage(extraTiers, pos);
    if (Number.isFinite(n)) return rollUsesDecimals(roll) ? Math.round(n * 10) / 10 : Math.round(n);
  }
  const d = sliderDriver(roll);
  const slide = overlaySliderValue(roll);
  const from = d.tiers.length ? d.tiers : parseSpanTiers(roll?.spanTiers);
  const to = extraTiers.length ? extraTiers : from;
  const mapped = mapByTier(from, slide, to);
  if (Number.isFinite(mapped)) return rollUsesDecimals(roll) ? Math.round(mapped * 10) / 10 : Math.round(mapped);
  const elo = Number.isFinite(extra?.spanLo) ? Number(extra.spanLo) : Number(extra?.lo);
  const ehi = Number.isFinite(extra?.spanHi) ? Number(extra.spanHi) : Number(extra?.hi);
  if (Number.isFinite(extra?.value) && !(ehi > elo)) return Number(extra.value);
  const lo = Number.isFinite(roll?.spanLo) ? Number(roll.spanLo) : Number(roll?.lo);
  const hi = Number.isFinite(roll?.spanHi) ? Number(roll.spanHi) : Number(roll?.hi);
  const v = overlayLiveValue(roll);
  if (!Number.isFinite(v) || !(hi > lo) || !(ehi > elo)) return Number.isFinite(extra?.value) ? Number(extra.value) : elo;
  const n = elo + ((v - lo) / (hi - lo)) * (ehi - elo);
  if (String(elo).includes(".") || String(ehi).includes(".")) return Math.round(n * 10) / 10;
  return Math.round(n);
}

function overlayLiveValue(roll) {
  if (roll?.flatAvg) {
    const w = Number(roll.wantMin);
    if (Number.isFinite(w)) return snapRollNum(w, roll);
    return snapRollNum(Number(roll.value), roll);
  }
  const pos = overlayDivPos(roll);
  const first = parseSpanTiers(roll?.spanTiers);
  if (Number.isFinite(pos) && first.length) {
    const n = divToDamage(first, pos);
    if (Number.isFinite(n)) return snapRollNum(n, roll);
  }
  const d = sliderDriver(roll);
  const slide = overlaySliderValue(roll);
  if (d.extra && d.tiers.length) {
    const n = mapByTier(d.tiers, slide, roll.spanTiers);
    if (Number.isFinite(n)) return snapRollNum(n, roll);
  }
  const lo = Number.isFinite(roll?.spanLo) ? Number(roll.spanLo) : Number(roll?.lo);
  const hi = Number.isFinite(roll?.spanHi) ? Number(roll.spanHi) : Number(roll?.hi);
  const v = Number.isFinite(slide) ? slide : Number.isFinite(roll?.value) ? Number(roll.value) : lo;
  if (!Number.isFinite(v)) return NaN;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return snapRollNum(v, roll);
  return snapRollNum(Math.min(hi, Math.max(lo, v)), roll);
}

function overlayModTextHtml(roll) {
  const text = overlayModText(roll);
  if (roll?.flatAvg) {
    const n = overlayLiveValue(roll);
    if (!Number.isFinite(n)) return esc(text);
    const rid = Number.isInteger(roll.rid) && roll.rid > 0 ? String(roll.rid) : "";
    const shown = formatRollNum(n, rollUsesDecimals(roll) ? "0.1" : "1");
    const re = /\d+(?:\.\d+)?/g;
    let out = "";
    let last = 0;
    let i = 0;
    let hit;
    while (i < 2 && (hit = re.exec(text))) {
      out += esc(text.slice(last, hit.index));
      out += "<b data-roll-live=\"" + esc(rid) + "\">" + esc(shown) + "</b>";
      last = hit.index + hit[0].length;
      i += 1;
    }
    return out + esc(text.slice(last));
  }
  const n = overlayLiveValue(roll);
  const d = sliderDriver(roll);
  if (!Number.isFinite(n) || (!(Number(d.hi) > Number(d.lo)) && (!Number.isFinite(roll?.lo) || roll.lo === roll.hi))) return esc(text);
  const extras = Array.isArray(roll.extra) ? roll.extra : [];
  const values = [n, ...extras.map((ex) => extraLiveValue(roll, ex))];
  const rid = Number.isInteger(roll.rid) && roll.rid > 0 ? String(roll.rid) : "";
  const re = /([+-]?)(\d+(?:\.\d+)?)/g;
  let out = "";
  let last = 0;
  let i = 0;
  let hit;
  while (i < values.length && (hit = re.exec(text))) {
    const shown = formatRollNum(values[i], rollUsesDecimals(roll) ? "0.1" : "1");
    out += esc(text.slice(last, hit.index)) + esc(hit[1] || "");
    if (i === 0) {
      const lo = Number.isFinite(roll.spanLo) ? Number(roll.spanLo) : Number(roll.lo);
      const hi = Number.isFinite(roll.spanHi) ? Number(roll.spanHi) : Number(roll.hi);
      const tiers = encodeSpanTiers(parseSpanTiers(roll.spanTiers));
      const tierAttr = tiers ? ` data-span-tiers="${esc(tiers)}"` : "";
      out += `<b data-roll-live="${esc(rid)}" data-span-lo="${lo}" data-span-hi="${hi}"${tierAttr}>${esc(shown)}</b>`;
    } else {
      const ex = extras[i - 1];
      const elo = Number.isFinite(ex?.spanLo) ? Number(ex.spanLo) : Number(ex?.lo);
      const ehi = Number.isFinite(ex?.spanHi) ? Number(ex.spanHi) : Number(ex?.hi);
      const tiers = encodeSpanTiers(parseSpanTiers(ex?.spanTiers));
      const tierAttr = tiers ? ` data-span-tiers="${esc(tiers)}"` : "";
      out += `<b data-roll-extra="${esc(rid)}" data-extra-lo="${elo}" data-extra-hi="${ehi}"${tierAttr}>${esc(shown)}</b>`;
    }
    last = hit.index + hit[0].length;
    i += 1;
  }
  if (!i) return esc(text);
  return out + esc(text.slice(last));
}

function rollTierWidth(roll) {
  const w = Number(roll?.hi) - Number(roll?.lo);
  return Number.isFinite(w) && w > 0 ? w : 1;
}

function rollTierAtValue(roll, value) {
  const d = sliderDriver(roll);
  const tiers = d.tiers.length ? d.tiers : parseSpanTiers(roll?.spanTiers);
  const n = tiers.length;
  if (n > 1) {
    let pos = Number.isFinite(value) ? value : overlayDivPos(roll);
    if (Number.isFinite(pos)) {
      if (tiersAreFlat(tiers)) {
        const i = Math.min(n - 1, Math.max(0, Math.round(pos)));
        return n - i;
      }
      if (pos >= 0 && pos <= n + 0.001) {
        const slot = overlayDivSlot(n, pos);
        if (slot) return n - slot.i;
      }
      const hit = tierPos(tiers, pos);
      if (hit) return n - hit.i;
    }
  }
  const t0 = Number(roll?.tier);
  if (!(t0 > 0) || !Number.isFinite(value)) return 0;
  const v0 = Number.isFinite(roll.value) ? Number(roll.value) : Number(roll.lo);
  return Math.max(1, Math.round(t0 - (value - v0) / rollTierWidth(roll)));
}

function canHaveRunes(drop) {
  if (/currency|gem|divination|charm|flask|jewel|belt|amulet|ring|waystone|tablet|relic|map/i.test(drop?.rarity || "")) return false;
  if (/currency|gem|divination|charm|flask|jewel|belt|amulet|ring|waystone|tablet|relic|map|socketable|omen/i.test(drop?.className || "")) return false;
  return true;
}

function isCharmItem(drop) {
  return /charm/i.test(drop?.className || "");
}

function isBeltItem(drop) {
  return /belt/i.test(drop?.className || "");
}

function isCharmSlotRoll(roll) {
  return /^has\b.+\bcharm slots?\b/i.test(String(roll?.text || ""));
}

function charmSlotBounds(drop) {
  const roll = (drop?.rolls || []).find(isCharmSlotRoll);
  const value = Number.isFinite(roll?.value)
    ? Number(roll.value)
    : Number.isInteger(drop?.charmSlots) && drop.charmSlots > 0
      ? drop.charmSlots
      : 0;
  const lo = Number.isFinite(roll?.spanLo) ? Number(roll.spanLo) : Number.isFinite(roll?.lo) ? Number(roll.lo) : 1;
  const hi = Number.isFinite(roll?.spanHi) ? Number(roll.spanHi) : Number.isFinite(roll?.hi) ? Number(roll.hi) : 3;
  return { roll, value, lo: Math.max(1, lo), hi: Math.max(Math.max(1, lo), hi) };
}

function setDropRunePick(log, drop, value, live) {
  if (!drop) return;
  if (value == null || value === "" || value === "any" || value === "off") drop.pickRunes = null;
  else {
    drop.pickRunes = Math.max(0, Math.min(6, Math.round(Number(value) || 0)));
    drop.wantRunes = drop.pickRunes;
  }
  if (live) return;
  drop.quoteTried = false;
  delete drop.quote;
  if (log?.id) save();
  if (ui.inspect) paintPriceOverlay();
  else render();
}

function toggleDropRunePick(log, drop) {
  if (!drop) return;
  if (Number.isInteger(drop.pickRunes)) {
    setDropRunePick(log, drop, null);
    return;
  }
  const n = Number.isInteger(drop.runeSockets) ? drop.runeSockets : 0;
  setDropRunePick(log, drop, Math.max(0, Math.min(6, n)));
}

function overlayRuneHtml(log, drop) {
  if (!canHaveRunes(drop)) return "";
  const on = Number.isInteger(drop.pickRunes);
  const itemN = Number.isInteger(drop.runeSockets) ? drop.runeSockets : 0;
  const shown = on ? drop.pickRunes : itemN;
  const mark = `data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}"`;
  return `<div class="price-overlay-prop price-overlay-prop-num is-meta is-sockets${on ? " is-on" : ""}"><button type="button" class="price-overlay-q-toggle" data-pick-runes-toggle ${mark}><i class="price-overlay-dps-box" aria-hidden="true"></i><span>Sockets</span></button><span class="price-overlay-q-edit"><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" spellcheck="false" class="price-overlay-q-input" min="0" max="6" value="${esc(String(shown))}" data-span-rid="runes" ${mark} /></span></div>`;
}

function overlayCharmHtml(log, drop) {
  if (!isBeltItem(drop) && !charmSlotBounds(drop).roll) return "";
  const { roll, value, lo, hi } = charmSlotBounds(drop);
  if (!roll && !(value > 0) && !isBeltItem(drop)) return "";
  const want = Number.isFinite(roll?.wantMin) ? Number(roll.wantMin) : value || lo;
  const clamped = Math.min(hi, Math.max(lo, want));
  const pct = hi > lo ? (((clamped - lo) / (hi - lo)) * 100).toFixed(2) : "0";
  const rid = roll?.rid || "charm";
  return `<div class="price-overlay-rune price-overlay-charms"><span>Charm slots</span><div class="price-overlay-span"><span>${esc(String(lo))}</span><div class="price-overlay-span-bar"><input type="range" min="${lo}" max="${hi}" step="1" value="${clamped}" style="--fill:${pct}" data-span-rid="${rid}" data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}" /></div><span>${esc(String(hi))}</span></div><em>${esc(String(clamped))}</em></div>`;
}

function overlayCorruptHtml(log, drop) {
  if (/currency|gem|divination/i.test(drop?.rarity || "") || /currency|gem|divination/i.test(drop?.className || "")) return "";
  if (drop.corrupted !== true) return "";
  const on = searchCorrupted(drop) !== false;
  return `<button type="button" class="price-overlay-corrupt${on ? " is-on" : ""}" data-pick-corrupt="${esc(drop.id)}" data-pick-log="${esc(log.id)}">Corrupted</button>`;
}

function overlayUnidHtml(log, drop) {
  if (!drop?.unidentified) return "";
  const on = searchUnidentified(drop) !== false;
  const tier = Number(drop.unidentifiedTier) > 0 ? " T" + drop.unidentifiedTier : "";
  return `<button type="button" class="price-overlay-unid${on ? " is-on" : ""}" data-pick-unid="${esc(drop.id)}" data-pick-log="${esc(log.id)}">${on ? "Unidentified" + tier : "Identified"}</button>`;
}

function overlayRavenHtml(log, drop) {
  if (!drop?.ravenTouched) return "";
  const on = drop.pickRaven !== false;
  return `<button type="button" class="price-overlay-raven${on ? " is-on" : ""}" data-pick-raven="${esc(drop.id)}" data-pick-log="${esc(log.id)}">${on ? "Raven-Touched" : "Not Raven-Touched"}</button>`;
}

function overlayFlagsHtml(log, drop) {
  const raven = overlayRavenHtml(log, drop);
  const corrupt = overlayCorruptHtml(log, drop);
  const unid = overlayUnidHtml(log, drop);
  if (!raven && !corrupt && !unid) return "";
  return `<div class="price-overlay-flags">${raven}${corrupt}${unid}</div>`;
}

function equipTradeKey(id) {
  return (
    {
      "item.armour": "ar",
      "item.evasion_rating": "ev",
      "item.energy_shield": "es",
      "item.runic_ward": "ward",
      "item.block": "block",
      "item.total_dps": "dps",
      "item.physical_dps": "pdps",
      "item.elemental_dps": "edps",
      "item.crit": "crit",
      "item.aps": "aps",
      "item.spirit": "spirit",
    }[id] || ""
  );
}

// Base on/off, ilvl caps and Q20 damage follow Exiled Exchange 2 (MIT).
function canRelaxBase(drop) {
  if (/^unique$/i.test(String(drop?.rarity || ""))) return false;
  return !!tradeBaseType(drop) && !!tradeCategory(drop?.className);
}

function searchExactBase(drop) {
  if (!canRelaxBase(drop)) return true;
  return drop?.pickExactBase !== false;
}

function maxUsefulItemLevel(category) {
  return (
    {
      "weapon.wand": 81,
      "weapon.staff": 81,
      "sanctum.relic": 80,
      "map.tablet": 1,
      "map.waystone": 1,
      "map.fragment": 1,
      jewel: 1,
    }[category] || 82
  );
}

function ilvlFilterState(drop) {
  const raw = Number(drop?.props?.ilvl);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  if (/^unique$/i.test(String(drop?.rarity || ""))) return null;
  const cap = maxUsefulItemLevel(tradeCategory(drop?.className));
  if (cap <= 1) return null;
  const value = Math.min(raw, cap);
  const want = Number(drop?.wantIlvl);
  return { value, cap, min: Number.isFinite(want) ? Math.min(cap, Math.max(1, want)) : value, on: drop?.pickIlvl === true };
}

function qualityCap(drop) {
  const q = Math.round(Number(drop?.props?.quality) || 0);
  return Math.max(30, q);
}

function hasWantQuality(drop) {
  return drop != null && Object.prototype.hasOwnProperty.call(drop, "wantQuality") && Number.isFinite(Number(drop.wantQuality));
}

function qualityFilterState(drop) {
  const cat = tradeCategory(drop?.className);
  if (!/^weapon\.|^armour\.|^flask$|^flask\./.test(String(cat || ""))) return null;
  const q = Number.isFinite(Number(drop?.props?.quality)) ? Math.round(Number(drop.props.quality)) : 0;
  const cap = qualityCap(drop);
  let on = false;
  if (cat === "flask.charm") on = q >= 10;
  else if (cat === "flask") on = q > 20;
  else if (q > 20) on = !/^rare$/i.test(String(drop?.rarity || ""));
  else if (q >= 20 && /^(rare|magic)$/i.test(String(drop?.rarity || ""))) on = true;
  if (typeof drop?.pickQuality === "boolean") on = drop.pickQuality;
  const min = hasWantQuality(drop) ? Math.min(cap, Math.max(0, Math.round(Number(drop.wantQuality)))) : q;
  return { value: q, cap, min, on };
}

function qualityForDps(drop) {
  const quality = qualityFilterState(drop);
  if (quality?.on) return quality.min;
  return dpsDisplayQuality(drop);
}

function physAtQuality(drop, qAt) {
  const itemQ = Number.isFinite(Number(drop?.props?.quality)) ? Number(drop.props.quality) : 0;
  const want = Number.isFinite(Number(qAt)) ? Number(qAt) : itemQ;
  const lo = Number(drop?.props?.physLo);
  const hi = Number(drop?.props?.physHi);
  const phys = Number(drop?.props?.phys);
  if (Number.isFinite(lo) && Number.isFinite(hi) && hi > 0) {
    if (itemQ === want) return (lo + hi) / 2;
    return (scaleDamageByQuality(lo, itemQ, want) + scaleDamageByQuality(hi, itemQ, want)) / 2;
  }
  if (!Number.isFinite(phys) || phys <= 0) return NaN;
  if (itemQ === want) return phys;
  return scaleDamageByQuality(phys, itemQ, want);
}

function overlayAps(drop) {
  const aps = Number(drop?.props?.apsVal);
  if (!Number.isFinite(aps) || aps <= 0) return NaN;
  return Math.round(aps * 100) / 100;
}

function overlayPhysDps(drop, qAt) {
  const q = Number.isFinite(Number(drop?.props?.quality)) ? Number(drop.props.quality) : 0;
  const clip = Number(drop?.props?.physDps);
  const want = Number.isFinite(Number(qAt)) ? Number(qAt) : q;
  if (Number.isFinite(clip) && clip > 0 && want === q) return clip;
  const physAt = physAtQuality(drop, want);
  const aps = overlayAps(drop);
  if (!Number.isFinite(physAt) || !Number.isFinite(aps)) return NaN;
  return physAt * aps;
}

function isSliderPropId(id) {
  return ["item.armour", "item.evasion_rating", "item.energy_shield", "item.runic_ward"].includes(String(id || ""));
}

function propSliderState(drop, id, value) {
  if (!isSliderPropId(id)) return null;
  const hi = Math.round(Number(value));
  if (!Number.isFinite(hi) || hi <= 1) return null;
  const want = Number(drop?.wantProps?.[id]);
  return { lo: 1, hi, min: Number.isFinite(want) ? Math.min(hi, Math.max(1, Math.round(want))) : hi, on: !!drop?.pickProps?.[id] };
}

function isDpsPropId(id) {
  return ["item.total_dps", "item.physical_dps", "item.elemental_dps"].includes(String(id || ""));
}

function isTypedPropId(id) {
  return (
    isDpsPropId(id) ||
    [
      "item.aps",
      "item.crit",
      "item.spirit",
      "item.armour",
      "item.evasion_rating",
      "item.energy_shield",
      "item.runic_ward",
      "item.block",
    ].includes(String(id || ""))
  );
}

function dpsDisplayQuality(drop) {
  const itemQ = Number.isFinite(Number(drop?.props?.quality)) ? Number(drop.props.quality) : 0;
  if (!dropIsModifiable(drop)) return itemQ;
  return Math.max(20, itemQ);
}

function dpsSearchSlack(drop) {
  return /^unique$/i.test(String(drop?.rarity || "")) ? 2 : 10;
}

function percentRollMin(value, pct) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n - (Math.abs(n) * pct) / 100 + Number.EPSILON);
}

function snapTypedProp(id, n) {
  if (id === "item.aps" || id === "item.crit") return Math.round(n * 100) / 100;
  return Math.round(n);
}

function propNumState(drop, id, value) {
  if (!isTypedPropId(id)) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  let hi = 99999;
  if (id === "item.aps") hi = 99;
  else if (id === "item.crit") hi = 100;
  else if (!isDpsPropId(id)) hi = Math.max(1, Math.round(n));
  const want = Number(drop?.wantProps?.[id]);
  const slack = n - (Math.abs(n) * dpsSearchSlack(drop)) / 100;
  const raw = id === "item.aps" || id === "item.crit" ? n : slack;
  const seed = Number.isFinite(want) ? snapTypedProp(id, want) : snapTypedProp(id, raw);
  return { lo: 0, hi, value: Math.min(hi, Math.max(0, seed)) };
}

function dpsDefaultOn() {
  return false;
}

function propPicked(drop, id, fallback) {
  if (drop?.pickProps && Object.prototype.hasOwnProperty.call(drop.pickProps, id)) return !!drop.pickProps[id];
  return !!fallback;
}

function dpsTypeLabel(tag) {
  return { physical: "Physical", any: "Any", fire: "Fire", cold: "Cold", lightning: "Lightning" }[String(tag || "")] || "";
}

function dpsTypeRowLabel(tag) {
  if (tag === "physical") return "Physical DPS";
  if (tag === "fire") return "Fire DPS";
  if (tag === "cold") return "Cold DPS";
  if (tag === "lightning") return "Lightning DPS";
  return "Elemental DPS";
}

function dpsTypeTradeId(tag) {
  return tag === "physical" ? "item.physical_dps" : "item.elemental_dps";
}

function pickedDpsType(drop, tags) {
  const want = String(drop?.dpsType || "");
  if (tags.includes(want)) return want;
  return tags.includes("any") ? "any" : tags[0] || "";
}

function dropIsModifiable(drop) {
  return drop?.corrupted !== true && drop?.mirrored !== true && drop?.sanctified !== true;
}

function formatDpsShown(n) {
  if (!Number.isFinite(n)) return "";
  // One decimal; banker's round-half-to-even (198.25→198.2, 44.25→44.2, 94.08→94.1).
  const x = n * 10;
  const floored = Math.floor(x + 1e-12);
  const frac = x - floored;
  const snapped = Math.abs(frac - 0.5) < 1e-6 ? (floored % 2 === 0 ? floored : floored + 1) : Math.round(x);
  return (snapped / 10).toFixed(1);
}

function weaponHitAverages(drop) {
  const p = drop?.props || {};
  const phys =
    Number.isFinite(Number(p.physLo)) && Number.isFinite(Number(p.physHi)) && Number(p.physHi) > 0
      ? (Number(p.physLo) + Number(p.physHi)) / 2
      : Number(p.phys);
  let ele = Number(p.ele);
  const fromAdds = eleAvgFromLocalAdds(drop);
  if (Number.isFinite(fromAdds) && fromAdds > 0) {
    ele = Number.isFinite(ele) && ele > 0 ? Math.max(ele, fromAdds) : fromAdds;
  }
  const chaos = Number(p.chaos);
  return {
    phys: Number.isFinite(phys) && phys > 0 ? phys : NaN,
    ele: Number.isFinite(ele) && ele > 0 ? ele : NaN,
    chaos: Number.isFinite(chaos) && chaos > 0 ? chaos : NaN,
  };
}

function weaponDpsRollNatural(roll) {
  const t = String(roll?.text || "")
    .replace(/\s*\((?:augmented|unmet|implicit|enchant|rune|unscalable(?: value)?)\)/gi, "")
    .replace(/\s+/g, " ");
  const nums = t.match(/\d+(?:\.\d+)?/g) || [];
  return { a: Number(nums[0]), b: Number(nums[1]) };
}

function weaponDpsRollsTouched(drop) {
  // True only if the user moved a slidable phys/%phys/AS roll off the clipboard value.
  // flatAvg phys rows store wantMin as the pair average (trade), not the lo end — compare to that.
  for (const roll of inspectRolls(drop) || []) {
    const kind = weaponDpsRollKind(roll);
    if (!kind || kind === "eflat") continue;
    const { a, b } = weaponDpsRollNatural(roll);
    const w = Number(roll.wantMin);
    if (kind === "pincr" || kind === "asincr") {
      if (Number.isFinite(w) && Number.isFinite(a) && Math.abs(w - a) > 0.02) return true;
      continue;
    }
    if (kind === "pflat") {
      if (roll.flatAvg) {
        const avg = Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : NaN;
        const nat =
          Number.isFinite(avg) && Number.isInteger(a) && Number.isInteger(b)
            ? Math.round(avg)
            : Number.isFinite(avg)
              ? Math.round(avg * 10) / 10
              : NaN;
        if (Number.isFinite(w) && Number.isFinite(nat) && Math.abs(w - nat) > 0.02) return true;
        continue;
      }
      if (Number.isFinite(w) && Number.isFinite(a) && Math.abs(w - a) > 0.02) return true;
      const ew = Number(Array.isArray(roll.extra) ? roll.extra[0]?.wantMin : NaN);
      if (Number.isFinite(ew) && Number.isFinite(b) && Math.abs(ew - b) > 0.02) return true;
    }
  }
  return false;
}

function formatOverlayProp(value, kind) {
  if (!Number.isFinite(value)) return "";
  if (kind === "pct") return "+" + Math.round(value) + "%";
  if (kind === "aps") return (Math.round(value * 100) / 100).toFixed(2);
  if (kind === "crit") return (Math.round(value * 100) / 100).toFixed(2) + "%";
  if (kind === "block") return Math.round(value) + "%";
  if (kind === "dps") return formatDpsShown(value);
  return String(Math.round(value));
}

function eleAvgByTypeFromLocalAdds(drop) {
  const out = { fire: 0, cold: 0, lightning: 0 };
  let hit = false;
  const rows = Array.isArray(drop?.rolls) ? drop.rolls : Array.isArray(drop?.mods) ? drop.mods : [];
  for (const row of rows) {
    const text = String(row?.text || row?.name || row?.fold || "");
    if (/spell/i.test(text)) continue;
    const m = text.match(/adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+(fire|cold|lightning)\s+damage/i);
    if (!m) continue;
    out[m[3].toLowerCase()] += (Number(m[1]) + Number(m[2])) / 2;
    hit = true;
  }
  return hit ? out : null;
}

function eleAvgFromLocalAdds(drop) {
  const parts = eleAvgByTypeFromLocalAdds(drop);
  return parts ? parts.fire + parts.cold + parts.lightning : NaN;
}

function weaponDpsRollKind(roll) {
  if (!roll || roll.ghost) return "";
  const t = String(roll.text || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\((?:augmented|unmet|implicit|enchant|rune|unscalable(?: value)?)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || /spell/.test(t)) return "";
  if (/^adds \d+(?:\.\d+)? to \d+(?:\.\d+)? physical damage$/.test(t)) return "pflat";
  if (/^adds \d+(?:\.\d+)? to \d+(?:\.\d+)? (?:fire|cold|lightning) damage$/.test(t)) return "eflat";
  if (/^\d+(?:\.\d+)?% increased physical damage$/.test(t)) return "pincr";
  if (/^\d+(?:\.\d+)?% increased attack speed$/.test(t)) return "asincr";
  return "";
}

function isWeaponItem(drop) {
  const cls = String(drop?.className || "").toLowerCase();
  if (/weapon|sword|axe|mace|bow|wand|staff|warstaff|quarterstaff|spear|flail|claw|dagger|sceptre|talisman|crossbow|trap/.test(cls)) return true;
  return itemPoolTags(drop).includes("weapon");
}

function isWeaponEleFlatRoll(roll, drop) {
  if (drop && !isWeaponItem(drop)) return false;
  return weaponDpsRollKind(roll) === "eflat";
}

function isFlatDamageRoll(roll) {
  const t = String(roll?.text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return /^adds -?\d+(?:\.\d+)? to -?\d+(?:\.\d+)? (?:physical|fire|cold|lightning|chaos) damage(?: to (?:attacks|spells(?: and attacks)?))?$/.test(
    stripAdvancedRanges(parseAffixStrings(t))
  );
}

function flatDamagePairFromText(text) {
  const t = stripAdvancedRanges(parseAffixStrings(String(text || "")))
    .trim()
    .replace(/\s+/g, " ");
  const m = t.match(
    /^adds\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)\s+(?:physical|fire|cold|lightning|chaos)\s+damage(?:\s+to\s+(?:attacks|spells(?:\s+and\s+attacks)?))?$/i
  );
  if (!m) return null;
  return { a: Number(m[1]), b: Number(m[2]) };
}

function flatDamageAvg(roll) {
  const pair = flatDamagePairFromText(roll?.text);
  if (pair && Number.isFinite(pair.a) && Number.isFinite(pair.b)) {
    const avg = (pair.a + pair.b) / 2;
    return Number.isInteger(pair.a) && Number.isInteger(pair.b) ? Math.round(avg) : Math.round(avg * 10) / 10;
  }
  const a = Number.isFinite(Number(roll?.value))
    ? Number(roll.value)
    : Number.isFinite(Number(roll?.lo))
      ? Number(roll.lo)
      : NaN;
  const ex = Array.isArray(roll?.extra) ? roll.extra[0] : null;
  const b = Number.isFinite(Number(ex?.value))
    ? Number(ex.value)
    : Number.isFinite(Number(ex?.lo))
      ? Number(ex.lo)
      : Number(roll?.hi);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  const avg = (a + b) / 2;
  return Number.isInteger(a) && Number.isInteger(b) ? Math.round(avg) : Math.round(avg * 10) / 10;
}

// EE2: trade filters flat "# to #" damage as the average of the two rolls.
function flattenFlatDamageRoll(row) {
  if (!row || !isFlatDamageRoll(row) || isWeaponEleFlatRoll(row)) return row;
  const pair = flatDamagePairFromText(row.text);
  if (!pair || !Number.isFinite(pair.a) || !Number.isFinite(pair.b)) return row;
  const a = pair.a;
  const b = pair.b;
  const avg = (a + b) / 2;
  const snapped = Number.isInteger(a) && Number.isInteger(b) ? Math.round(avg) : Math.round(avg * 10) / 10;
  const prevWant = Number(row.wantMin);
  const firstPass = !row.flatAvg;
  row.flatAvg = true;
  row.flatA = a;
  row.flatB = b;
  row.value = snapped;
  row.lo = snapped;
  row.hi = snapped;
  row.spanLo = snapped;
  row.spanHi = snapped;
  delete row.spanSteps;
  delete row.spanTiers;
  row.extra = [{ value: snapped, lo: snapped, hi: snapped }];
  if (
    firstPass ||
    !Number.isFinite(prevWant) ||
    Math.abs(prevWant - a) < 0.02 ||
    Math.abs(prevWant - b) < 0.02
  ) {
    row.wantMin = snapped;
  }
  return row;
}

function rollUsesTierSnap(roll, drop) {
  if (!isWeaponEleFlatRoll(roll, drop)) return false;
  const tiers = sliderDriver(roll).tiers;
  return parseSpanTiers(tiers).length > 1;
}

function sliderIsTierStep(tiers) {
  return tiersAreFlat(tiers);
}

function selectedTierIndex(roll) {
  const d = sliderDriver(roll);
  const list = d.tiers.length ? d.tiers : parseSpanTiers(roll?.spanTiers);
  if (!list.length) return 0;
  if (sliderIsTierStep(list, roll)) {
    const pos = overlayDivPos(roll);
    if (Number.isFinite(pos)) return Math.min(list.length - 1, Math.max(0, Math.round(pos)));
  }
  const pos = overlayDivPos(roll);
  if (Number.isFinite(pos)) {
    const slot = overlayDivSlot(list.length, pos);
    if (slot) return slot.i;
  }
  const hit = tierPos(list, Number(roll?.wantMin));
  return hit ? hit.i : 0;
}

function formatTierRange(lo, hi) {
  if (!(Number(hi) > Number(lo))) return String(lo);
  return lo + "—" + hi;
}

function overlayTierSnapText(roll) {
  const d = sliderDriver(roll);
  const i = selectedTierIndex(roll);
  const minTiers = parseSpanTiers(roll?.spanTiers);
  const maxTiers = d.extra ? parseSpanTiers(d.extra.spanTiers) : parseSpanTiers(roll?.extra?.[0]?.spanTiers);
  const a = minTiers[i] || minTiers[0];
  const b = maxTiers[i] || d.tiers[i] || a;
  const type = weaponDpsRollEle(roll) || "Elemental";
  if (!a || !b) return overlayModText(roll);
  const n = Math.max(minTiers.length, maxTiers.length, d.tiers.length);
  const t = n > 0 ? "T" + (n - i) + " " : "";
  return (
    t +
    "Adds (" +
    formatTierRange(a.lo, a.hi) +
    ") to (" +
    formatTierRange(b.lo, b.hi) +
    ") " +
    type.charAt(0).toUpperCase() +
    type.slice(1) +
    " Damage"
  );
}

function applyTierSnapWant(row, pos) {
  const d = sliderDriver(row);
  const list = d.tiers;
  if (!list.length) return;
  const i = Math.min(list.length - 1, Math.max(0, Math.round(Number(pos))));
  const t = list[i];
  row.wantMin = t.lo;
  row.wantMax = t.hi;
  if (d.extra) {
    d.extra.wantMin = t.lo;
    d.extra.wantMax = t.hi;
  }
}

function ensureTierSnapWant(row) {
  if (!rollUsesTierSnap(row)) return;
  const d = sliderDriver(row);
  if (!d.tiers.length) return;
  if (Number.isFinite(row.wantMin) && Number.isFinite(row.wantMax)) {
    for (let i = 0; i < d.tiers.length; i++) {
      if (Math.abs(d.tiers[i].lo - row.wantMin) < 0.02 && Math.abs(d.tiers[i].hi - row.wantMax) < 0.02) return;
    }
  }
  const pos = overlayDivPos(row);
  applyTierSnapWant(row, Number.isFinite(pos) ? pos : 0);
}


// Baseline = clipboard numbers from the mod text. Live = slider-mapped.
function weaponDpsRollNums(roll, live) {
  const nums = String(roll?.text || "")
    .replace(/\s*\((?:augmented|unmet|implicit|enchant|rune|unscalable(?: value)?)\)/gi, "")
    .match(/\d+(?:\.\d+)?/g) || [];
  const a0 = Number(nums[0]);
  const b0 = Number(nums[1]);
  const extra = Array.isArray(roll?.extra) ? roll.extra[0] : null;
  if (!live) {
    // Always prefer the numbers in the mod text for the item as-is.
    if (Number.isFinite(a0) && Number.isFinite(b0)) return { a: a0, b: b0 };
    const a = Number.isFinite(Number(roll?.value)) ? Number(roll.value) : a0;
    const b = extra && Number.isFinite(Number(extra.value)) ? Number(extra.value) : b0;
    return { a, b };
  }
  if (!Number.isFinite(Number(roll?.lo)) || !Number.isFinite(Number(roll?.hi)) || roll.lo === roll.hi) {
    return { a: a0, b: b0 };
  }
  const a = overlayLiveValue(roll);
  return {
    a: Number.isFinite(a) ? a : a0,
    b: extra ? extraLiveValue(roll, extra) : b0,
  };
}

function weaponDpsRollEle(roll) {
  const t = String(roll?.text || "")
    .trim()
    .toLowerCase()
    .replace(/\s*\((?:augmented|unmet|implicit|enchant|rune|unscalable(?: value)?)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const m = t.match(/^adds \d+(?:\.\d+)? to \d+(?:\.\d+)? (fire|cold|lightning) damage$/i);
  return m ? m[1].toLowerCase() : "";
}

function weaponDpsSums(rolls, live) {
  const out = { flatLo: 0, flatHi: 0, incr: 0, asIncr: 0, ele: 0, fire: 0, cold: 0, lightning: 0 };
  for (const roll of rolls || []) {
    const kind = weaponDpsRollKind(roll);
    if (!kind) continue;
    const { a, b } = weaponDpsRollNums(roll, live);
    if (kind === "pincr" || kind === "asincr") {
      if (Number.isFinite(a)) {
        if (kind === "pincr") out.incr += a;
        else out.asIncr += a;
      }
      continue;
    }
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (kind === "pflat") {
      out.flatLo += a;
      out.flatHi += b;
    } else {
      const avg = (a + b) / 2;
      out.ele += avg;
      const type = weaponDpsRollEle(roll);
      if (type) out[type] += avg;
    }
  }
  return out;
}

function weaponDpsModel(drop) {
  const p = drop?.props || {};
  const aps = Number(p.apsVal);
  if (!Number.isFinite(aps) || aps <= 0) return null;
  const rolls = inspectRolls(drop);
  const base = weaponDpsSums(rolls, false);
  function shownEle(clip, added) {
    const n = Number(clip);
    if (Number.isFinite(n) && n > 0) return n;
    return added > 0 ? added : NaN;
  }
  return {
    aps,
    itemQ: Number.isFinite(Number(p.quality)) ? Number(p.quality) : 0,
    qAt: qualityForDps(drop),
    physLo: Number(p.physLo),
    physHi: Number(p.physHi),
    phys: Number(p.phys),
    chaos: Number(p.chaos),
    ele: shownEle(p.ele, base.ele),
    fire: shownEle(p.fire, base.fire),
    cold: shownEle(p.cold, base.cold),
    lightning: shownEle(p.lightning, base.lightning),
    physDps: Number(p.physDps),
    eleDps: Number(p.eleDps),
    totalDps: Number(p.totalDps),
    base,
    now: weaponDpsSums(rolls, true),
  };
}

// EE2 calc-q20: strip the item's own flat/increased/quality off the shown damage, then reapply the slider's.
// Rune locals are in the roll list (and already baked into clipboard phys/ele/aps when untouched).
function weaponDamageAt(m, sums, qAt) {
  const q = Number.isFinite(Number(qAt)) ? Number(qAt) : m.itemQ;
  const inc0 = 1 + m.base.incr / 100;
  const inc1 = 1 + sums.incr / 100;
  const more = 1 + q / 100;
  function at(shown, f0, f1) {
    if (f0 === f1 && inc0 === inc1) return scaleDamageByQuality(shown, m.itemQ, q);
    const base = Math.max(0, shown / (1 + m.itemQ / 100) / inc0 - f0);
    return (base + f1) * inc1 * more;
  }
  let physAvg = NaN;
  if (Number.isFinite(m.physLo) && Number.isFinite(m.physHi) && m.physHi > 0) {
    physAvg = (at(m.physLo, m.base.flatLo, sums.flatLo) + at(m.physHi, m.base.flatHi, sums.flatHi)) / 2;
  } else if (Number.isFinite(m.phys) && m.phys > 0) {
    const raw = Math.max(0, m.phys / (1 + m.itemQ / 100) / inc0 - (m.base.flatLo + m.base.flatHi) / 2);
    physAvg = (raw + (sums.flatLo + sums.flatHi) / 2) * inc1 * more;
  }
  function eleAt(type) {
    return Number.isFinite(m[type]) ? Math.max(0, m[type] - m.base[type] + sums[type]) : NaN;
  }
  const as0 = 1 + (m.base.asIncr || 0) / 100;
  const as1 = 1 + (sums.asIncr || 0) / 100;
  let aps = m.aps;
  if (as0 > 0 && Number.isFinite(aps)) {
    if (as0 !== as1) aps = (aps / as0) * as1;
    aps = Math.round(aps * 100) / 100;
  }
  return { physAvg, ele: eleAt("ele"), fire: eleAt("fire"), cold: eleAt("cold"), lightning: eleAt("lightning"), aps };
}

function weaponDpsCardAttrs(drop) {
  const m = weaponDpsModel(drop);
  if (!m) return "";
  function attr(name, value) {
    return Number.isFinite(value) ? ` data-dps-${name}="${value}"` : "";
  }
  const qAt = qualityForDps(drop);
  return (
    attr("aps", m.aps) +
    attr("item-q", m.itemQ) +
    attr("q", qAt) +
    attr("show-q", qAt) +
    attr("phys-lo", m.physLo) +
    attr("phys-hi", m.physHi) +
    attr("phys", m.phys) +
    attr("chaos", m.chaos) +
    attr("ele", m.ele) +
    attr("fire", m.fire) +
    attr("cold", m.cold) +
    attr("lightning", m.lightning) +
    attr("phys-dps", m.physDps) +
    attr("ele-dps", m.eleDps) +
    attr("total-dps", m.totalDps) +
    attr("flat-lo", m.base.flatLo) +
    attr("flat-hi", m.base.flatHi) +
    attr("incr", m.base.incr) +
    attr("as-incr", m.base.asIncr) +
    attr("ele-add", m.base.ele) +
    attr("fire-add", m.base.fire) +
    attr("cold-add", m.base.cold) +
    attr("lightning-add", m.base.lightning)
  );
}

function weaponDpsLineAttrs(roll) {
  const kind = weaponDpsRollKind(roll);
  if (!kind) return "";
  const { a, b } = weaponDpsRollNums(roll, false);
  const first = Number.isFinite(a) ? ` data-dps-a="${a}"` : "";
  const second = kind === "pincr" || kind === "asincr" ? "" : Number.isFinite(b) ? ` data-dps-b="${b}"` : "";
  const type = weaponDpsRollEle(roll);
  return ` data-dps-kind="${kind}"${type ? ` data-dps-ele="${type}"` : ""}${first}${second}`;
}

function dropPropRows(drop) {
  const p = drop?.props || {};
  const q = Number.isFinite(Number(p.quality)) ? Math.round(Number(p.quality)) : 0;
  const qAt = Math.round(Number(qualityForDps(drop)) || 0);
  const atItemQ = qAt === q;
  const rollsLive = weaponDpsRollsTouched(drop);
  const hits = weaponHitAverages(drop);
  const apsClip = Number.isFinite(overlayAps(drop)) ? overlayAps(drop) : Number(p.apsVal);
  const m = weaponDpsModel(drop);
  const live = m && rollsLive ? weaponDamageAt(m, m.now, qAt) : null;
  const aps = rollsLive && live && Number.isFinite(live.aps) ? live.aps : apsClip;

  // Canonical: avg(hit) × APS. Clipboard already includes quality/runes. Only rebuild phys if Q or a phys roll moved.
  let physAvg = hits.phys;
  if (rollsLive && live && Number.isFinite(live.physAvg)) physAvg = live.physAvg;
  else if (!atItemQ) physAvg = physAtQuality(drop, qAt);

  let pdps = NaN;
  if (atItemQ && !rollsLive && Number.isFinite(Number(p.physDps)) && Number(p.physDps) > 0) pdps = Number(p.physDps);
  else if (Number.isFinite(physAvg) && Number.isFinite(aps) && physAvg > 0) pdps = physAvg * aps;

  const ele = hits.ele;
  let edps = NaN;
  if (Number.isFinite(Number(p.eleDps)) && Number(p.eleDps) > 0) edps = Number(p.eleDps);
  else if (Number.isFinite(ele) && Number.isFinite(apsClip) && ele > 0) edps = apsClip * ele;

  const localAdds = eleAvgByTypeFromLocalAdds(drop);
  const eleDps = {};
  for (const type of ["fire", "cold", "lightning"]) {
    let avg = Number(p[type]);
    if (!Number.isFinite(avg) || avg <= 0) avg = localAdds ? localAdds[type] : NaN;
    eleDps[type] = Number.isFinite(apsClip) && Number.isFinite(avg) && avg > 0 ? apsClip * avg : NaN;
  }
  const chaos = hits.chaos;
  const cdps = Number.isFinite(apsClip) && Number.isFinite(chaos) && chaos > 0 ? apsClip * chaos : NaN;
  const hasPhys = Number.isFinite(pdps) && pdps > 0;
  const hasEle = Number.isFinite(edps) && edps > 0;
  const hasChaos = Number.isFinite(cdps) && cdps > 0;

  // Prefer clipboard Total (427.1) over avg×APS / sum of rounded PDPS+EDPS (both → 427.0).
  let dps = NaN;
  if (atItemQ && !rollsLive && Number.isFinite(Number(p.totalDps)) && Number(p.totalDps) > 0) dps = Number(p.totalDps);
  else {
    const hitSum = [physAvg, ele, chaos].filter((n) => Number.isFinite(n) && n > 0).reduce((a, b) => a + b, 0);
    if (hitSum > 0 && Number.isFinite(apsClip)) dps = hitSum * (rollsLive && Number.isFinite(aps) ? aps : apsClip);
    else dps = [pdps, edps, cdps].filter((n) => Number.isFinite(n) && n > 0).reduce((a, b) => a + b, 0);
  }
  const rows = [];
  function add(id, label, value, kind, tag) {
    if (!Number.isFinite(value) || value <= 0) return null;
    const row = { id: id || "", label, value, kind: kind || "", tag: tag || "", shown: formatOverlayProp(value, kind) };
    const num = propNumState(drop, row.id, value);
    if (num) row.numInput = num;
    rows.push(row);
    return row;
  }
  const quality = qualityFilterState(drop);
  if (quality) {
    rows.push({
      id: "",
      pick: "quality",
      label: "Quality",
      value: quality.value,
      kind: "pct",
      tag: "",
      on: quality.on,
      shown: String(quality.value),
      qInput: { lo: 0, hi: quality.cap, value: quality.min, rid: "quality", steps: false },
    });
  } else if (q > 0) add("", "Quality", q, "pct");
  const ilvl = ilvlFilterState(drop);
  if (ilvl) {
    rows.push({
      id: "",
      pick: "ilvl",
      label: "Item level",
      value: ilvl.value,
      kind: "",
      tag: "",
      on: ilvl.on,
      shown: String(ilvl.value),
      qInput: { lo: 1, hi: ilvl.cap, value: ilvl.min, rid: "ilvl", steps: false },
    });
  }
  // EE2: Total, Elemental DPS (+ type tags), Physical DPS below
  if (hasEle || (hasPhys && hasChaos)) add("item.total_dps", "Total DPS", dps, "dps");
  if (hasEle) {
    const eleTags = ["any"];
    for (const type of ["fire", "cold", "lightning"]) if (Number.isFinite(eleDps[type]) && eleDps[type] > 0) eleTags.push(type);
    const type = pickedDpsType(drop, eleTags);
    const value = type === "any" ? edps : eleDps[type];
    const row = add(dpsTypeTradeId(type), dpsTypeRowLabel(type), value, "dps");
    if (row) {
      row.dpsType = type;
      if (eleTags.length > 1) row.dpsTags = eleTags;
    }
  }
  if (hasPhys) {
    const row = add("item.physical_dps", "Physical DPS", pdps, "dps");
    if (row) {
      row.q20 = dropIsModifiable(drop) && qAt !== q && qAt >= 20;
      if (row.q20) row.q20Label = "Q " + Math.round(qAt) + "%";
    }
  }
  if (hasChaos && !hasPhys && !hasEle) add("item.total_dps", "Total DPS", dps, "dps");
  const totalRow = rows.find((row) => row.id === "item.total_dps");
  if (totalRow) {
    totalRow.q20 = dropIsModifiable(drop) && qAt !== q && qAt >= 20;
    if (totalRow.q20) totalRow.q20Label = "Q " + Math.round(qAt) + "%";
  }
  add("item.aps", "APS", Number.isFinite(aps) ? aps : Number(p.apsVal), "aps");
  add("item.crit", "Crit", Number(p.critVal), "crit");
  add("", "Reload", Number(p.reload), "aps");
  add("item.spirit", "Spirit", Number(p.spirit));
  add("item.armour", "Armour", Number(p.ar));
  add("item.evasion_rating", "Evasion", Number(p.ev));
  add("item.energy_shield", "Energy Shield", Number(p.es));
  add("item.runic_ward", "Ward", Number(p.ward));
  add("item.block", "Block", Number(p.blockChance), "block");
  for (const row of rows) {
    if (!isTypedPropId(row.id)) continue;
    row.dpsDefaultOn = dpsDefaultOn(drop, row.id, row.value, dps);
    row.on = propPicked(drop, row.id, row.dpsDefaultOn);
  }
  return rows;
}

function pickedPropFilters(drop) {
  return dropPropRows(drop)
    .filter((row) => row.id && propPicked(drop, row.id, row.dpsDefaultOn))
    .map((row) => {
      const next = { id: row.id };
      const min = row.numInput ? row.numInput.value : row.slider ? row.slider.min : row.value;
      if (Number.isFinite(min)) next.min = min;
      return next;
    });
}

function togglePickProp(log, drop, id) {
  if (!drop || !id || !equipTradeKey(id)) return;
  drop.pickProps = drop.pickProps && typeof drop.pickProps === "object" ? drop.pickProps : {};
  const row = dropPropRows(drop).find((item) => item.id === id);
  const on = propPicked(drop, id, row?.dpsDefaultOn);
  drop.pickProps[id] = !on;
  drop.quoteTried = false;
  delete drop.quote;
  if (log?.id) save();
  paintPriceOverlay();
  if (isTypedPropId(id)) quoteRolledDrop(log, drop, true);
}

function applyDropSearchToggle(log, drop, what) {
  if (!drop) return;
  if (what === "exact") drop.pickExactBase = !searchExactBase(drop);
  else if (what === "ilvl") {
    const next = !ilvlFilterState(drop)?.on;
    drop.pickIlvl = next;
    if (next && !Number.isFinite(Number(drop.wantIlvl))) {
      const raw = Number(drop?.props?.ilvl);
      if (Number.isFinite(raw) && raw > 0) drop.wantIlvl = Math.round(raw);
    }
  } else if (what === "quality") {
    const next = !qualityFilterState(drop)?.on;
    drop.pickQuality = next;
    if (next && !hasWantQuality(drop)) {
      drop.wantQuality = Math.round(Number(drop.props?.quality) || 0);
    }
  } else return;
  drop.quoteTried = false;
  delete drop.quote;
  delete drop.quoting;
  if (log?.id) save();
  if (ui.inspect) paintPriceOverlay();
  else render();
  quoteRolledDrop(log, drop, true);
}

function applyDropBaseMode(log, drop, mode) {
  if (!drop || !canRelaxBase(drop)) return;
  const exact = String(mode || "") !== "any";
  if (searchExactBase(drop) === exact) return;
  drop.pickExactBase = exact;
  drop.quoteTried = false;
  delete drop.quote;
  delete drop.quoting;
  if (log?.id) save();
  paintPriceOverlay();
  quoteRolledDrop(log, drop, true);
}

function commitDropSliderMin(log, drop) {
  drop.quoteTried = false;
  delete drop.quote;
  delete drop.quoting;
  if (log?.id) save();
  paintPriceOverlay();
  quoteRolledDrop(log, drop, true);
}

function setDropIlvlMin(log, drop, raw, live) {
  const state = ilvlFilterState(drop);
  if (!drop || !state) return;
  if (String(raw).trim() === "") return;
  const n = Number(raw);
  if (!Number.isFinite(n)) return;
  drop.wantIlvl = Math.min(state.cap, Math.max(1, Math.round(n)));
  drop.pickIlvl = true;
  if (live) return;
  commitDropSliderMin(log, drop);
}

function setDropQualityMin(log, drop, raw, live) {
  const state = qualityFilterState(drop);
  if (!drop || !state) return;
  if (String(raw).trim() === "") return;
  const n = Number(raw);
  if (!Number.isFinite(n)) return;
  drop.wantQuality = Math.min(state.cap, Math.max(0, Math.round(n)));
  drop.pickQuality = true;
  if (live) return;
  if (log?.id) save();
  paintPriceOverlay();
  quoteRolledDrop(log, drop, true);
}

function stepDropQuality(log, drop, delta, live) {
  const state = qualityFilterState(drop);
  if (!drop || !state) return;
  const cur = hasWantQuality(drop) ? Number(drop.wantQuality) : state.value;
  setDropQualityMin(log, drop, cur + Number(delta || 0), live);
}

function stepDropIlvl(log, drop, delta, live) {
  const state = ilvlFilterState(drop);
  if (!drop || !state) return;
  const cur = Number.isFinite(Number(drop.wantIlvl)) ? Number(drop.wantIlvl) : state.value;
  setDropIlvlMin(log, drop, cur + Number(delta || 0), live);
}

function setDropPropMin(log, drop, id, raw, live) {
  if (!drop || !isTypedPropId(id) && !isSliderPropId(id)) return;
  if (String(raw).trim() === "") return;
  const n = Number(raw);
  if (!Number.isFinite(n)) return;
  const row = dropPropRows(drop).find((item) => item.id === id);
  const bounds = row?.slider || row?.numInput;
  if (!bounds) return;
  drop.wantProps = drop.wantProps && typeof drop.wantProps === "object" ? drop.wantProps : {};
  drop.wantProps[id] = Math.min(bounds.hi, Math.max(bounds.lo, snapTypedProp(id, n)));
  drop.pickProps = drop.pickProps && typeof drop.pickProps === "object" ? drop.pickProps : {};
  drop.pickProps[id] = true;
  if (live) return;
  commitDropSliderMin(log, drop);
}

function setDropDpsType(log, drop, tag) {
  const next = String(tag || "").toLowerCase();
  if (!drop || !dpsTypeLabel(next) || next === "physical") return;
  const rows = dropPropRows(drop);
  const prev = rows.find((row) => row.dpsType);
  if ((prev?.dpsType || "") === next) return;
  const wasOn = propPicked(drop, "item.elemental_dps", prev?.dpsDefaultOn);
  drop.dpsType = next;
  if (drop.wantProps) delete drop.wantProps["item.elemental_dps"];
  drop.pickProps = drop.pickProps && typeof drop.pickProps === "object" ? drop.pickProps : {};
  drop.pickProps["item.elemental_dps"] = wasOn;
  drop.quoteTried = false;
  delete drop.quote;
  delete drop.quoting;
  if (log?.id) save();
  if (ui.inspect) paintPriceOverlay();
  else render();
  if (wasOn) quoteRolledDrop(log, drop, true);
}

function overlayBaseHtml(log, drop) {
  const base = drop.baseType || drop.className || "";
  if (!canRelaxBase(drop)) return `<div class="item-tip-base">${esc(base)}</div>`;
  const on = searchExactBase(drop);
  const mark = `data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}"`;
  return `<div class="price-overlay-base-row"><div class="item-tip-base">${esc(base)}</div><span class="price-overlay-base-modes"><button type="button" class="price-overlay-base-mode${on ? " is-on" : ""}" data-pick-base="exact" ${mark}>Base</button><button type="button" class="price-overlay-base-mode${on ? "" : " is-on"}" data-pick-base="any" ${mark}>Any</button></span></div>`;
}

function overlayPropSliderHtml(log, drop, opt) {
  const lo = Math.round(Number(opt?.lo));
  const hi = Math.round(Number(opt?.hi));
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return "";
  const clamped = Math.min(hi, Math.max(lo, Math.round(Number(opt.value))));
  const pct = hi > lo ? (((clamped - lo) / (hi - lo)) * 100).toFixed(2) : "0";
  return `<div class="price-overlay-rune price-overlay-charms"><span>${esc(opt.label)}</span><div class="price-overlay-span"><span>${lo}</span><div class="price-overlay-span-bar"><input type="range" min="${lo}" max="${hi}" step="1" value="${clamped}" style="--fill:${pct}" data-span-rid="${esc(opt.rid)}" data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}" /></div><span>${hi}</span></div><em>${clamped}</em></div>`;
}

function overlayPropSlidersHtml(log, drop, rows) {
  const out = [];
  for (const row of rows) {
    if (!row.slider?.on) continue;
    out.push(overlayPropSliderHtml(log, drop, { rid: row.id, label: row.label, lo: row.slider.lo, hi: row.slider.hi, value: row.slider.min }));
  }
  return out.join("");
}

function sanitizeOverlayMinInput(el) {
  if (!el) return;
  const raw = String(el.value || "");
  let next = raw;
  if (el.dataset.spanDec) {
    next = raw.replace(/[^\d.]/g, "");
    const i = next.indexOf(".");
    if (i >= 0) next = next.slice(0, i + 1) + next.slice(i + 1).replace(/\./g, "");
  } else {
    next = raw.replace(/\D/g, "");
  }
  if (next !== raw) el.value = next;
}

function overlayMinFilterHtml(log, drop, row, compact = false) {
  const q = row.qInput;
  if (!q) return "";
  const mark = `data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}"`;
  const rid = q.rid || row.pick;
  const minus = q.steps ? `<button type="button" class="price-overlay-q-step" data-q-step="-1" data-span-rid="${esc(rid)}" ${mark} aria-label="Decrease">−</button>` : "";
  const plus = q.steps ? `<button type="button" class="price-overlay-q-step" data-q-step="1" data-span-rid="${esc(rid)}" ${mark} aria-label="Increase">+</button>` : "";
  const label = compact
    ? row.pick === "quality"
      ? "Quality"
      : row.pick === "ilvl"
        ? "Item level"
        : row.label
    : row.label;
  return `<div class="price-overlay-prop price-overlay-prop-num${compact ? " is-meta" : ""}${row.pick === "quality" ? " is-quality" : ""}${row.pick === "ilvl" ? " is-ilvl" : ""}${row.on ? " is-on" : ""}"><button type="button" class="price-overlay-q-toggle" data-pick-search="${esc(row.pick)}" ${mark}><i class="price-overlay-dps-box" aria-hidden="true"></i><span>${esc(label)}</span>${compact ? "" : `<b>${esc(row.shown)}</b>`}</button><span class="price-overlay-q-edit">${minus}<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" spellcheck="false" class="price-overlay-q-input" min="${q.lo}" max="${q.hi}" value="${q.value}" data-span-rid="${esc(rid)}" ${mark} />${plus}</span></div>`;
}

function overlayPropsHtml(log, drop) {
  const rows = dropPropRows(drop);
  const quality = rows.find((row) => row.qInput && row.pick === "quality");
  const ilvl = rows.find((row) => row.qInput && row.pick === "ilvl");
  const rest = rows.filter((row) => row !== quality && row !== ilvl);
  const rune = overlayRuneHtml(log, drop);
  const metaBits = [
    quality ? overlayMinFilterHtml(log, drop, quality, true) : "",
    ilvl ? overlayMinFilterHtml(log, drop, ilvl, true) : "",
    rune,
  ].filter(Boolean);
  const meta = metaBits.length ? `<div class="price-overlay-meta">${metaBits.join("")}</div>` : "";
  if (!rest.length) return meta;
  return `${meta}<div class="price-overlay-props">${rest
    .map((row) => {
      const mark = `data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}"`;
      if (row.qInput) return overlayMinFilterHtml(log, drop, row);
      const live =
        row.dpsType
          ? ` data-live-typed-dps="${esc(row.dpsType)}"`
          : row.id === "item.physical_dps"
            ? " data-live-pdps"
            : row.id === "item.elemental_dps"
              ? " data-live-edps"
              : row.id === "item.total_dps"
                ? " data-live-dps"
                : "";
      if (row.numInput) {
        const n = row.numInput;
        const on = row.on ? " is-on" : "";
        const tags = (row.dpsTags || [])
          .map((tag) => `<button type="button" class="price-overlay-dps-tag is-${esc(tag)}${tag === row.dpsType ? " is-on" : ""}" data-pick-dps-type="${esc(tag)}" ${mark}>${esc(dpsTypeLabel(tag))}</button>`)
          .join("");
        const dec = row.kind === "aps" || row.kind === "crit" ? ` data-span-dec="1" step="0.1"` : "";
        const typed = row.kind === "aps" || row.kind === "crit" ? Number(n.value).toFixed(2) : n.value;
        return `<div class="price-overlay-prop price-overlay-prop-num${on}"><button type="button" class="price-overlay-q-toggle" data-pick-prop="${esc(row.id)}" ${mark}><i class="price-overlay-dps-box" aria-hidden="true"></i><span>${esc(row.label)}: </span><b${live}>${esc(row.shown)}</b>${row.q20 ? `<em class="price-overlay-q20">${esc(row.q20Label || "Q 20%")}</em>` : ""}</button><span class="price-overlay-q-edit"><input type="text" inputmode="decimal" pattern="[0-9.]*" autocomplete="off" spellcheck="false" class="price-overlay-q-input" min="${n.lo}" max="${n.hi}" value="${typed}" data-span-rid="${esc(row.id)}"${dec} ${mark} /></span></div>${tags ? `<div class="price-overlay-dps-tags">${tags}</div>` : ""}`;
      }
      const shown = `<span>${esc(row.label)}</span><b${live}>${esc(row.shown)}</b>`;
      if (row.pick) return `<button type="button" class="price-overlay-prop${row.on ? " is-on" : ""}" data-pick-search="${esc(row.pick)}" ${mark}>${shown}</button>`;
      if (!row.id) return `<div class="price-overlay-prop is-static">${shown}</div>`;
      const on = drop.pickProps?.[row.id] ? " is-on" : "";
      return `<button type="button" class="price-overlay-prop${on}" data-pick-prop="${esc(row.id)}" ${mark}>${shown}</button>`;
    })
    .join("")}</div>`;
}

function overlayUsesExchange(drop) {
  const rarity = String(drop?.rarity || "");
  const cls = String(drop?.className || "");
  if (/gem/i.test(rarity) || /gem/i.test(cls)) return false;
  return /currency|omen/i.test(rarity) || /currency|stackable currency|^omen$/i.test(cls);
}

function exchangeWantTag(drop) {
  if (drop?.quote?.tag) return String(drop.quote.tag);
  const folded = String(drop?.name || drop?.baseType || "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const aliases = {
    "scroll of wisdom": "wisdom",
    "orb of transmutation": "transmute",
    "orb of augmentation": "aug",
    "orb of chance": "chance",
    "orb of alchemy": "alch",
    "chaos orb": "chaos",
    "vaal orb": "vaal",
    "regal orb": "regal",
    "exalted orb": "exalted",
    "divine orb": "divine",
    "orb of annulment": "annul",
    "artificers orb": "artificers",
    "mirror of kalandra": "mirror",
    "armourers scrap": "scrap",
    "blacksmiths whetstone": "whetstone",
    "arcanists etcher": "etcher",
    "glassblowers bauble": "bauble",
    "gemcutters prism": "gcp",
  };
  if (aliases[folded]) return aliases[folded];
  return folded.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function exchangeHaveOptions(drop) {
  const want = exchangeWantTag(drop);
  return ["exalted", "chaos", "divine"].filter((tag) => tag !== want);
}

function exchangeHavePick(drop) {
  const options = exchangeHaveOptions(drop);
  if (!options.length) return convertMain() || "exalted";
  const picked = String(drop?.exchangeHave || "").toLowerCase();
  if (options.includes(picked)) return picked;
  const main = convertMain();
  if (options.includes(main)) return main;
  return options[0];
}

function exchangeHaveCurrencies(drop) {
  return [exchangeHavePick(drop)];
}

function setExchangeHave(log, drop, tag) {
  if (!drop) return;
  const next = String(tag || "").toLowerCase();
  if (!exchangeHaveOptions(drop).includes(next)) return;
  drop.exchangeHave = next;
  drop.quoteTried = false;
  delete drop.quote;
  delete drop.quoting;
  if (log?.id) save();
  paintPriceOverlay();
  quoteRolledDrop(log, drop, true);
}

function overlayExchangeHaveHtml(log, drop) {
  if (!overlayUsesExchange(drop)) return "";
  const picked = exchangeHavePick(drop);
  const chips = exchangeHaveOptions(drop)
    .map((tag) => {
      const label = tag === "exalted" ? "Exalt" : tag === "divine" ? "Divine" : "Chaos";
      return `<button type="button" class="price-overlay-prop${picked === tag ? " is-on" : ""}" data-pick-have="${esc(tag)}" data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}">${esc(label)}</button>`;
    })
    .join("");
  if (!chips) return "";
  return `<div class="price-overlay-flags"><span class="price-overlay-sec-label">Pay with</span>${chips}</div>`;
}

function tradeSiteQuery(drop, filters) {
  const rarity = String(drop?.rarity || "");
  const unique = /^unique$/i.test(rarity);
  const typeLine = tradeBaseType(drop);
  const category = tradeCategory(drop.className);
  const statsRows = (filters || [])
    .filter((row) => !equipTradeKey(row.id))
    .map((row) => {
      const next = { id: row.id, disabled: false };
      if (Number.isFinite(row.min) || Number.isFinite(row.max)) {
        next.value = {};
        if (Number.isFinite(row.min)) next.value.min = row.min;
        if (Number.isFinite(row.max)) next.value.max = row.max;
      }
      return next;
    });
  const stats = [{ type: "and", filters: statsRows }];
  if (wantsRavenTouched(drop)) {
    stats.push({
      type: "count",
      value: { min: 1 },
      filters: [
        { id: "explicit.stat_3198163869", disabled: false },
        { id: "rune.stat_3198163869", disabled: false },
      ],
    });
  }
  const query = {
    status: { option: "available" },
    stats,
    filters: {},
  };
  if (unique && drop?.name && !isUnidentifiedLine(drop.name) && !(searchUnidentified(drop) && namesMatch(drop.name, typeLine))) query.name = drop.name;
  if (typeLine && searchExactBase(drop)) query.type = typeLine;
  const typeBag = {};
  if (category) typeBag.category = { option: category };
  if (unique) typeBag.rarity = { option: "unique" };
  else if (/^(rare|magic|normal)$/i.test(rarity)) typeBag.rarity = { option: "nonunique" };
  const ilvl = ilvlFilterState(drop);
  if (ilvl?.on) typeBag.ilvl = { min: ilvl.min };
  const quality = qualityFilterState(drop);
  if (quality?.on) typeBag.quality = { min: quality.min };
  if (Object.keys(typeBag).length) query.filters.type_filters = { filters: typeBag };
  const misc = {};
  if (typeof searchCorrupted(drop) === "boolean") misc.corrupted = { option: searchCorrupted(drop) ? "true" : "false" };
  if (searchUnidentified(drop)) {
    misc.identified = { option: "false" };
    if (Number(drop.unidentifiedTier) > 0) misc.unidentified_tier = { min: Number(drop.unidentifiedTier) };
  }
  if (Object.keys(misc).length) query.filters.misc_filters = { filters: misc };
  const equip = {};
  if (Number.isInteger(drop?.pickRunes)) {
    const n = Math.max(0, Math.min(6, drop.pickRunes));
    equip.rune_sockets = { min: n, max: n };
  }
  for (const row of filters || []) {
    const key = equipTradeKey(row.id);
    if (!key) continue;
    const range = {};
    if (Number.isFinite(row.min)) range.min = row.min;
    if (Number.isFinite(row.max)) range.max = row.max;
    if (Object.keys(range).length) equip[key] = range;
  }
  if (Object.keys(equip).length) query.filters.equipment_filters = { filters: equip };
  return { query, sort: { price: "asc" } };
}

async function tradeSiteUrl(drop) {
  const league = leagueId();
  if (!league) return "";
  // Always build from current toggles — never reuse a stale quote.url.
  if (overlayUsesExchange(drop)) {
    const want = exchangeWantTag(drop);
    if (!want) return "";
    const q = JSON.stringify({
      exchange: {
        status: { option: "online" },
        have: exchangeHaveCurrencies(drop),
        want: [want],
      },
    });
    return "https://www.pathofexile.com/trade2/exchange/poe2/" + encodeURIComponent(league) + "?q=" + encodeURIComponent(q);
  }
  let filters = [];
  try {
    const index = await ensureTradeStats();
    const picked = pickedRolls(drop).filter((roll) => !isTabletUsesRoll(roll.text));
    filters = mergeTabletUseFilter(drop, index, mapRollsToTradeFilters(picked, index, true, { props: drop.props, className: drop.className })).concat(pickedPropFilters(drop));
  } catch {
    filters = [];
  }
  const q = JSON.stringify(tradeSiteQuery(drop, filters));
  return "https://www.pathofexile.com/trade2/search/poe2/" + encodeURIComponent(league) + "?q=" + encodeURIComponent(q);
}

function openTradeWebsite(drop) {
  if (!drop) return;
  tradeSiteUrl(drop).then((url) => {
    if (!url) return;
    if (window.chrome?.webview) chrome.webview.postMessage({ type: "open-url", url });
    else window.open(url, "_blank", "noopener");
  });
}

function overlayTradeSiteHtml(log, drop) {
  return `<button type="button" class="btn ghost price-overlay-web" data-open-trade-site="${esc(drop.id || "")}" data-open-trade-log="${esc(log.id || "")}" title="Open on pathofexile.com">Trade ↗</button>`;
}

function overlayQuoteHtml(drop, logId) {
  if (drop?.quoting) return `<span class="price-overlay-status">Checking trade…</span>`;
  const quote = drop?.quote;
  const n = pickedRolls(drop).length;
  if (quote && !quote.error) {
    const listed = quote.listings ? quote.listings.toLocaleString() + " listings" : "trade";
    if (pricedHit(quote) && Number(quote.amount) > 0) {
      const label = quote.unit && Number.isFinite(quote.amount) ? formatAmount(quote.amount, quote.unit) : formatDivine(quote.divine);
      const currency = quoteCurrencyName(quote);
      return `<span class="btn gold" title="${esc(listed)}">${itemIconHtml(currency)}${esc(label)} · ${esc(listed)}</span>`;
    }
    return `<span class="price-overlay-status">${n ? "No listing with these mods" : "No listings"}</span>`;
  }
  const err = quote?.error ? ` · ${quote.error}` : "";
  const label = n ? "Check this roll" : "Check trade";
  return `<button type="button" class="btn gold" data-quote-drop="${esc(drop.id || "")}" data-quote-log="${esc(logId || "")}">${esc(label)}${esc(err)}</button>`;
}

function overlayOffersHtml(drop) {
  const offers = drop?.quote?.offers;
  if (!Array.isArray(offers) || !offers.length) return "";
  const rows = offers
    .map((offer) => {
      const amount = Number(offer?.amount);
      if (!Number.isFinite(amount) || amount <= 0) return "";
      const unit = tradeUnit(offer.currency);
      const label = formatAmount(amount, unit);
      const currency = tradeCurrency(unit).name;
      const who = String(offer.ign || "seller").trim() || "seller";
      const tag = offer.instant ? "buyout" : "in person";
      return `<div class="price-overlay-offer"><span class="price-overlay-offer-who">${esc(who)}</span><span class="price-overlay-offer-tag">${esc(tag)}</span><span class="price-overlay-offer-price">${itemIconHtml(currency)}${esc(label)}</span></div>`;
    })
    .filter(Boolean)
    .join("");
  if (!rows) return "";
  return `<div class="price-overlay-offers">${rows}</div>`;
}

function spanTickPercents(lo, hi, tiers, steps, equal) {
  const span = Number(hi) - Number(lo);
  if (!(span > 0)) return [];
  const seen = new Set();
  const out = [];
  function add(v) {
    const at = ((Number(v) - Number(lo)) / span) * 100;
    if (!(at > 0.4 && at < 99.6)) return;
    const key = at.toFixed(2);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(key);
  }
  if (equal && Number(steps) > 1) {
    for (let i = 1; i < Number(steps); i++) out.push(((100 * i) / Number(steps)).toFixed(2));
    return out;
  }
  const list = parseSpanTiers(tiers);
  if (list.length > 1) {
    for (const t of list) add(t.lo);
  } else if (Number(steps) > 2) {
    for (let i = 1; i < Number(steps); i++) add(Number(lo) + (span * i) / Number(steps));
  }
  return out;
}

function spanTicksHtml(lo, hi, tiers, steps, equal) {
  const ticks = spanTickPercents(lo, hi, tiers, steps, equal);
  if (!ticks.length) return "";
  return `<div class="price-overlay-span-ticks">${ticks.map((at) => `<i style="--at:${at}"></i>`).join("")}</div>`;
}

function priceOverlayHtml(log, drop) {
  const rolls = inspectRolls(drop);
  const order = ["enchant", "corrupt", "rune", "skill", "implicit", "explicit"];
  const listed = order.flatMap((kind) => rolls.filter((roll) => canonicalRollKind(roll.kind) === kind && !isCharmSlotRoll(roll) && !isWeaponEleFlatRoll(roll, drop)));
  function affixGroups(list) {
    const out = [];
    for (const roll of list) {
      const key = Number.isInteger(roll.affix) && roll.affix > 0 ? "a" + roll.affix : "n" + out.length;
      let g = Number.isInteger(roll.affix) && roll.affix > 0 ? out.find((row) => row.key === key) : null;
      if (!g) {
        g = { key, rolls: [] };
        out.push(g);
      }
      g.rolls.push(roll);
    }
    return out;
  }
  function pickAttrs(roll) {
    const affix = Number.isInteger(roll.affix) && roll.affix > 0 ? ` data-pick-affix="${roll.affix}"` : "";
    const rid = Number.isInteger(roll.rid) && roll.rid > 0 ? ` data-pick-rid="${roll.rid}"` : "";
    return `data-pick-text="${esc(roll.text)}" data-pick-kind="${esc(canonicalRollKind(roll.kind))}" data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}"${affix}${rid}`;
  }
  function pillHtml(tag, kind, roll) {
    if (!tag) return "";
    const live = rollHasAffixTiers(roll) && Number(roll?.tier) > 0
      ? ` data-roll-tier data-pill-base="${esc(String(tag || "").replace(/\s*·\s*hyb/i, "").replace(/\s+T\d+\s*$/i, "").trim())}"`
      : "";
    return `<span class="price-overlay-pill${kind}"${live}>${esc(tag)}</span>`;
  }
  function rollFlatAvgInputHtml(roll) {
    if (!roll?.flatAvg) return "";
    const avg = Number.isFinite(Number(roll.value)) ? Number(roll.value) : flatDamageAvg(roll);
    const want = Number.isFinite(Number(roll.wantMin)) ? Number(roll.wantMin) : avg;
    const mark = `data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}"`;
    const shown = formatRollNum(want, rollUsesDecimals(roll) ? "0.1" : "1");
    return `<span class="price-overlay-q-edit"><input type="text" inputmode="decimal" pattern="[0-9.]*" autocomplete="off" spellcheck="false" class="price-overlay-q-input" min="0" max="99999" value="${esc(shown)}" data-span-rid="${roll.rid}" data-span-dec="${rollUsesDecimals(roll) ? "1" : "0"}" ${mark} /></span>`;
  }
  function rollSpanHtml(roll) {
    if (roll?.flatAvg) return "";
    const d = sliderDriver(roll);
    const lo = d.lo;
    const hi = d.hi;
    if (!(Number(hi) > Number(lo))) return "";
    const tiers = d.tiers;
    const n = tiers.length;
    const divs = n > 1;
    const flat = divs && tiersAreFlat(tiers);
    const clamped = overlaySliderValue(roll);
    const inMin = divs ? 0 : lo;
    const inMax = divs ? (flat ? n - 1 : n) : hi;
    const inVal = Number.isFinite(clamped) ? clamped : divs ? 0 : lo;
    const step = flat ? "1" : divs ? "0.01" : String(lo).includes(".") || String(hi).includes(".") || String(inVal).includes(".") ? "0.1" : "1";
    const w = Number(hi) - Number(lo) > 0 ? Number(hi) - Number(lo) : 1;
    const steps = divs ? inMax - inMin : Number(roll.spanSteps) > 1 ? Number(roll.spanSteps) : 0;
    const ticks = spanTicksHtml(inMin, inMax, divs ? [] : tiers, steps, divs);
    const t0 = rollHasAffixTiers(roll) && Number(roll.tier) > 0 ? Number(roll.tier) : "";
    const v0 = Number.isFinite(inVal) ? inVal : Number.isFinite(roll.value) ? Number(roll.value) : lo;
    const pct = inMax > inMin ? (((inVal - inMin) / (inMax - inMin)) * 100).toFixed(2) : "0";
    const tierAttr = tiers.length ? ` data-span-tiers="${esc(encodeSpanTiers(tiers))}"` : "";
    const divAttr = divs ? ` data-span-divs="${n}"` : "";
    const flatAttr = flat ? ` data-span-flat="1"` : "";
    return `<div class="price-overlay-span"><span>${esc(String(lo))}</span><div class="price-overlay-span-bar">${ticks}<input type="range" min="${inMin}" max="${inMax}" step="${step}" value="${inVal}" style="--fill:${pct}" data-span-rid="${roll.rid}" data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}" data-tier0="${t0}" data-value0="${v0}" data-tier-w="${w}"${tierAttr}${divAttr}${flatAttr} /></div><span>${esc(String(hi))}</span></div>`;
  }
  function oneModButton(roll, tag) {
    const on = roll.pick ? " is-on" : "";
    const kind = rollKindClass(roll);
    const ghost = roll.ghost ? " is-ghost" : "";
    const hint = roll.ghost ? "Typical implicit · F8 this item to capture the real roll · " : tag ? tag + " · " : "";
    const live = rollHasAffixTiers(roll) && Number(roll.tier) > 0
      ? rollKindLabel(roll, rollTierAtValue(roll, overlaySliderValue(roll)))
      : tag;
    return `<div class="price-overlay-mod-wrap${on}${ghost}"><div class="price-overlay-mod-line"><button type="button" class="price-overlay-q-toggle" ${pickAttrs(roll)} title="${esc(hint + roll.text)}"><i class="price-overlay-dps-box" aria-hidden="true"></i></button><div class="price-overlay-mod${kind}"><span class="price-overlay-mod-main"><span class="price-overlay-mod-text"${weaponDpsLineAttrs(roll)}>${overlayModTextHtml(roll)}</span>${pillHtml(live, kind, roll)}</span>${rollFlatAvgInputHtml(roll)}</div></div>${rollSpanHtml(roll)}</div>`;
  }
  function modButtons(list) {
    return affixGroups(list)
      .map((group) => {
        const sample = group.rolls[0];
        const together = group.rolls.length > 1 && Number.isInteger(sample.affix) && sample.affix > 0 && group.rolls.some((roll) => roll.text !== sample.text);
        const tag = rollKindLabel({ ...sample, hybrid: !!(together && sample.hybrid) });
        if (!together) return group.rolls.map((roll) => oneModButton(roll, tag)).join("");
        const on = group.rolls.some((roll) => roll.pick) ? " is-on" : "";
        const kind = rollKindClass(sample);
        const hint = (tag ? tag + " · " : "") + group.rolls.map((roll) => roll.text).join(" / ");
        const liveTag = rollHasAffixTiers(sample) && Number(sample.tier) > 0
          ? rollKindLabel({ ...sample, hybrid: true }, rollTierAtValue(sample, overlaySliderValue(sample)))
          : tag;
        const rows = group.rolls
          .map((roll) => {
            const span = rollSpanHtml(roll);
            return `<div class="price-overlay-hybrid-row" data-hybrid-rid="${esc(String(roll.rid || ""))}"><span class="price-overlay-hybrid-line"${weaponDpsLineAttrs(roll)}>${overlayModTextHtml(roll)}</span>${span}</div>`;
          })
          .join("");
        return `<div class="price-overlay-mod-wrap${on}"><div class="price-overlay-mod-line"><button type="button" class="price-overlay-q-toggle" ${pickAttrs(sample)} title="${esc(hint)}"><i class="price-overlay-dps-box" aria-hidden="true"></i></button><div class="price-overlay-mod is-hybrid${kind}"><span class="price-overlay-mod-main"><div class="price-overlay-hybrid-rows">${rows}</div>${pillHtml(liveTag, kind, sample)}</span></div></div></div>`;
      })
      .join("");
  }
  const charmExtra = overlayCharmHtml(log, drop);
  const kindClass = [
    String(drop.rarity || "unique").toLowerCase().replace(/\s+/g, "-") || "unique",
    isCharmItem(drop) ? "is-charm" : "",
    isBeltItem(drop) ? "is-belt" : "",
  ].filter(Boolean).join(" ");
  const pickHtml = overlayUniquePickHtml(log, drop);
  const mods = pickHtml || (listed.length ? `<div class="price-overlay-mods">${modButtons(listed)}</div>` : "");
  const props = overlayPropsHtml(log, drop);
  const foot = pickHtml
    ? ""
    : `<div class="price-overlay-foot">
        ${charmExtra}
        ${overlayExchangeHaveHtml(log, drop)}
        <div class="price-overlay-row"><span>PoE 2 trade</span><span class="price-overlay-trade-btns">${overlayQuoteHtml(drop, log.id)}${overlayTradeSiteHtml(log, drop)}</span></div>
        ${overlayOffersHtml(drop)}
      </div>`;
  return `
    <article class="price-overlay-card item-tip-card ${esc(kindClass)}"${weaponDpsCardAttrs(drop)}>
      ${overlayBarHtml()}
      <div class="price-overlay-body">
      <div class="item-tip-head">
        ${dropIconHtml(drop, "lg")}
        <div>
          <div class="item-tip-name">${esc(drop.name)}</div>
          ${overlayBaseHtml(log, drop)}
        </div>
        ${overlayFlagsHtml(log, drop)}
      </div>
      ${props}
      ${mods}
      ${foot}
      </div>
    </article>`;
}

function overlayUniquePickHtml(log, drop) {
  if (!unidentifiedUniqueNeedsPick(drop)) return "";
  const base = drop.baseType || drop.name;
  const rows = uniqueVariantsForBase(base, drop.className);
  if (rows.length <= 1) {
    return drop.uniquePickTried ? "" : `<div class="price-overlay-identify"><div class="price-overlay-identify-label">Which ${esc(base)}?</div></div>`;
  }
  const btns = rows
    .map(
      (row) =>
        `<button type="button" class="price-overlay-identify-item" data-pick-unique="${esc(row.name)}" data-pick-drop="${esc(drop.id)}" data-pick-log="${esc(log.id)}">${itemIconHtml(row.name, "lg")}<span>${esc(row.name)}</span></button>`
    )
    .join("");
  return `<div class="price-overlay-identify"><div class="price-overlay-identify-label">Which ${esc(base)}?</div><div class="price-overlay-identify-grid">${btns}</div></div>`;
}

function paintPriceOverlay(forceInApp = false, fresh = false) {
  if (inspectTarget() && !window.AFFIX_LADDERS && !affixTried) {
    affixTried = true;
    ensureAffixLadders().finally(() => paintPriceOverlay(forceInApp, fresh));
    return;
  }
  const pending = inspectTarget();
  if (pending && unidentifiedUniqueNeedsPick(pending.drop)) {
    const rows = uniqueVariantsForBase(pending.drop.baseType || pending.drop.name, pending.drop.className);
    if (rows.length === 1) {
      applyUniquePick(pending.log, pending.drop, rows[0].name);
      return;
    }
    if (rows.length < 2 && !pending.drop.uniquePickTried) {
      pending.drop.uniquePickTried = true;
      ensureUniqueVariants(pending.log, pending.drop).finally(() => paintPriceOverlay(forceInApp, fresh));
    }
  }
  const root = document.getElementById("price-overlay");
  const target = inspectTarget();
  if (target) ensureDropIcon(target.drop);
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

function toggleInspectRoll(log, drop, text, kind, rid) {
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
  drop.rolls = normalizeRolls(drop.rolls, drop);
  const as = canonicalRollKind(kind);
  let row = Number.isInteger(Number(rid)) && Number(rid) > 0
    ? drop.rolls.find((roll) => String(roll.rid) === String(rid))
    : null;
  if (!row) row = drop.rolls.find((roll) => !roll.pick && canonicalRollKind(roll.kind) === as && String(roll.text).toLowerCase() === want.toLowerCase());
  if (!row) row = drop.rolls.find((roll) => canonicalRollKind(roll.kind) === as && String(roll.text).toLowerCase() === want.toLowerCase());
  if (!row) row = drop.rolls.find((roll) => String(roll.text).toLowerCase() === want.toLowerCase());
  if (!row) {
    row = { text: want, kind: as, slot: "", pick: false, rid: drop.rolls.reduce((n, roll) => Math.max(n, Number(roll.rid) || 0), 0) + 1 };
    if (as !== "explicit") drop.rolls.unshift(row);
    else drop.rolls.push(row);
  }
  row.pick = !row.pick;
  if (Number.isInteger(row.affix) && row.affix > 0 && drop.rolls.some((roll) => roll.affix === row.affix && roll.text !== row.text)) {
    const on = row.pick;
    drop.rolls.forEach((roll) => {
      if (roll.affix === row.affix) roll.pick = on;
    });
  }
  drop.quoteTried = false;
  delete drop.quote;
  if (log?.id) save();
  paintPriceOverlay();
}

function ensureCharmSlotRoll(drop) {
  drop.rolls = normalizeRolls(drop.rolls, drop);
  let row = drop.rolls.find(isCharmSlotRoll);
  if (row) return row;
  const n = Number.isInteger(drop.charmSlots) && drop.charmSlots > 0 ? drop.charmSlots : 1;
  row = {
    text: "Has " + n + " Charm Slots",
    kind: "implicit",
    slot: "",
    pick: true,
    rid: drop.rolls.reduce((m, roll) => Math.max(m, Number(roll.rid) || 0), 0) + 1,
    value: n,
    lo: 1,
    hi: 3,
    spanLo: 1,
    spanHi: 3,
    wantMin: n,
  };
  drop.rolls.unshift(row);
  return row;
}

function overlayLiveEl(wrap, rid, extra) {
  if (!wrap) return extra ? [] : null;
  const attr = extra ? "data-roll-extra" : "data-roll-live";
  const nodes = [...wrap.querySelectorAll("[" + attr + "]")];
  const matched = rid ? nodes.filter((el) => el.getAttribute(attr) === rid) : nodes;
  if (extra) return matched;
  return matched[0] || nodes[0] || null;
}

function formatDpsLive(n) {
  return formatDpsShown(n);
}

function paintLiveDps(card) {
  const d = card?.dataset;
  const baseAps = Number(d?.dpsAps);
  if (!Number.isFinite(baseAps) || baseAps <= 0) return;
  const itemQ = Number(d.dpsItemQ) || 0;
  const q = Number.isFinite(Number(d.dpsShowQ)) ? Number(d.dpsShowQ) : Number(d.dpsQ) || 0;
  let flatLo = 0;
  let flatHi = 0;
  let incr = 0;
  let asIncr = 0;
  let eleAdd = 0;
  let hasEflat = false;
  let hasPflat = false;
  let hasPincr = false;
  let hasAsincr = false;
  const eleAddBy = { fire: 0, cold: 0, lightning: 0 };
  for (const el of card.querySelectorAll("[data-dps-kind]")) {
    const liveEl = el.querySelector("[data-roll-live]");
    const extraEl = el.querySelector("[data-roll-extra]");
    const a = liveEl ? Number(liveEl.textContent) : Number(el.dataset.dpsA);
    const b = extraEl ? Number(extraEl.textContent) : Number(el.dataset.dpsB);
    if (el.dataset.dpsKind === "pincr") {
      hasPincr = true;
      if (Number.isFinite(a)) incr += a;
      continue;
    }
    if (el.dataset.dpsKind === "asincr") {
      hasAsincr = true;
      if (Number.isFinite(a)) asIncr += a;
      continue;
    }
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (el.dataset.dpsKind === "pflat") {
      hasPflat = true;
      flatLo += a;
      flatHi += b;
    } else if (el.dataset.dpsKind === "eflat") {
      hasEflat = true;
      const type = el.dataset.dpsEle;
      eleAdd += (a + b) / 2;
      if (type && eleAddBy[type] != null) eleAddBy[type] += (a + b) / 2;
    }
  }
  const baseIncr = Number(d.dpsIncr) || 0;
  const baseAs = Number(d.dpsAsIncr) || 0;
  if (!hasPincr) incr = baseIncr;
  if (!hasAsincr) asIncr = baseAs;
  const as0 = 1 + baseAs / 100;
  const as1 = 1 + asIncr / 100;
  let aps = baseAps;
  if (as0 > 0 && as0 !== as1) aps = Math.round((baseAps / as0) * as1 * 100) / 100;
  const inc0 = 1 + baseIncr / 100;
  const inc1 = 1 + incr / 100;
  const more = 1 + q / 100;
  const f0Lo = Number(d.dpsFlatLo) || 0;
  const f0Hi = Number(d.dpsFlatHi) || 0;
  function at(shown, f0, f1) {
    if (f0 === f1 && inc0 === inc1) return scaleDamageByQuality(shown, itemQ, q);
    const base = Math.max(0, shown / (1 + itemQ / 100) / inc0 - f0);
    return (base + f1) * inc1 * more;
  }
  const physLo = Number(d.dpsPhysLo);
  const physHi = Number(d.dpsPhysHi);
  const phys = Number(d.dpsPhys);
  let physAt = NaN;
  if (Number.isFinite(physLo) && Number.isFinite(physHi) && physHi > 0) {
    // Only strip/reapply flats when those rolls are on the card. Dataset flats alone
    // (with hidden or missing DOM nodes) were zeroing live flats and eating PDPS.
    const useFlat = hasPflat;
    physAt = (at(physLo, useFlat ? f0Lo : 0, useFlat ? flatLo : 0) + at(physHi, useFlat ? f0Hi : 0, useFlat ? flatHi : 0)) / 2;
  } else if (Number.isFinite(phys) && phys > 0) {
    if (hasPflat) {
      physAt = (Math.max(0, phys / (1 + itemQ / 100) / inc0 - (f0Lo + f0Hi) / 2) + (flatLo + flatHi) / 2) * inc1 * more;
    } else if (f0Lo === flatLo && f0Hi === flatHi && inc0 === inc1) {
      physAt = scaleDamageByQuality(phys, itemQ, q);
    } else {
      physAt = (Math.max(0, phys / (1 + itemQ / 100) / inc0 - (f0Lo + f0Hi) / 2) + (flatLo + flatHi) / 2) * inc1 * more;
    }
  }
  const clipEle = Number(d.dpsEle);
  const eleParts = [Number(d.dpsFire), Number(d.dpsCold), Number(d.dpsLightning)].filter((n) => Number.isFinite(n) && n > 0);
  const eleFromParts = eleParts.length ? eleParts.reduce((a, b) => a + b, 0) : NaN;
  const eleBase = Number(d.dpsEleAdd) || 0;
  const eleClip = Number.isFinite(eleFromParts) && eleFromParts > 0 ? eleFromParts : clipEle;
  const eleAt = Number.isFinite(eleClip)
    ? hasEflat
      ? Math.max(0, eleClip - eleBase + eleAdd)
      : eleClip
    : NaN;
  const chaos = Number(d.dpsChaos);
  const physUntouched = incr === baseIncr && asIncr === baseAs && (!hasPflat || (flatLo === f0Lo && flatHi === f0Hi));
  const eflatUntouched = !hasEflat || Math.abs(eleAdd - eleBase) < 1e-9;
  const useClip = itemQ === q && physUntouched && eflatUntouched;
  const clipPdps = Number(d.dpsPhysDps);
  const clipEdps = Number(d.dpsEleDps);
  const clipTdps = Number(d.dpsTotalDps);
  let pdps = Number.isFinite(physAt) ? aps * physAt : NaN;
  let edps = Number.isFinite(eleAt) ? aps * eleAt : NaN;
  const cdps = Number.isFinite(chaos) ? aps * chaos : NaN;
  let dps = [pdps, edps, cdps].filter((n) => Number.isFinite(n) && n > 0).reduce((a, b) => a + b, 0);
  if (useClip) {
    if (Number.isFinite(clipPdps) && clipPdps > 0) pdps = clipPdps;
    if (Number.isFinite(clipEdps) && clipEdps > 0) edps = clipEdps;
    if (Number.isFinite(clipTdps) && clipTdps > 0) dps = clipTdps;
  }
  const pdpsEl = card.querySelector("[data-live-pdps]");
  if (pdpsEl && Number.isFinite(pdps)) pdpsEl.textContent = formatDpsLive(pdps);
  const edpsEl = card.querySelector("[data-live-edps]");
  if (edpsEl && Number.isFinite(edps)) edpsEl.textContent = formatDpsLive(edps);
  const dpsEl = card.querySelector("[data-live-dps]");
  if (dpsEl && dps > 0) dpsEl.textContent = formatDpsLive(dps);
  const typedEl = card.querySelector("[data-live-typed-dps]");
  if (!typedEl) return;
  const type = typedEl.getAttribute("data-live-typed-dps");
  function partDps(name) {
    const clip = Number(name === "fire" ? d.dpsFire : name === "cold" ? d.dpsCold : d.dpsLightning);
    const was = Number(name === "fire" ? d.dpsFireAdd : name === "cold" ? d.dpsColdAdd : d.dpsLightningAdd) || 0;
    if (!Number.isFinite(clip)) return NaN;
    if (!hasEflat) return aps * clip;
    return aps * Math.max(0, clip - was + eleAddBy[name]);
  }
  const typed = type === "physical" ? pdps : type === "any" ? edps : partDps(type);
  if (Number.isFinite(typed) && typed > 0) typedEl.textContent = formatDpsLive(typed);
}

function paintOverlaySpanLive(input) {
  if (!input) return;
  const value = Number(input.value);
  if (!Number.isFinite(value)) return;
  const rid = String(input.dataset.spanRid || "");
  if (rid === "quality" || rid === "ilvl" || rid === "runes") {
    input.closest(".price-overlay-prop-num")?.classList.add("is-on");
    return;
  }
  if (isTypedPropId(rid)) {
    input.closest(".price-overlay-prop-num")?.classList.add("is-on");
    return;
  }
  if (input.classList?.contains("price-overlay-q-input")) {
    const wrap = input.closest(".price-overlay-mod-wrap");
    if (wrap) {
      wrap.classList.add("is-on");
      const shownLive = input.dataset.spanDec === "1" ? String(Math.round(value * 10) / 10) : String(Math.round(value));
      for (const el of wrap.querySelectorAll('[data-roll-live="' + rid.replace(/"/g, "") + '"]')) {
        el.textContent = shownLive;
      }
    }
    return;
  }
  const min = Number(input.min);
  const max = Number(input.max);
  const pct = Number.isFinite(min) && Number.isFinite(max) && max > min ? ((value - min) / (max - min)) * 100 : 0;
  input.style.setProperty("--fill", String(pct));
  const wrap = input.closest(".price-overlay-mod-wrap");
  const host = wrap || input.closest(".price-overlay-charms");
  if (!host) return;
  const hybridRow = input.closest(".price-overlay-hybrid-row");
  if (wrap) {
    for (const row of wrap.querySelectorAll(".price-overlay-hybrid-row.is-sliding")) row.classList.remove("is-sliding");
    if (hybridRow) hybridRow.classList.add("is-sliding");
  }
  const scope = hybridRow || wrap;
  const step = input.step === "0.1" ? "0.1" : "1";
  const shown = step === "0.1" ? String(Math.round(value * 10) / 10) : String(Math.round(value));
  const driverTiers = parseSpanTiers(input.dataset.spanTiers);
  const divs = Number(input.dataset.spanDivs);
  const u = Number.isFinite(min) && Number.isFinite(max) && max > min ? (value - min) / (max - min) : 0;
  function showAt(n, lo, hi) {
    if (String(lo).includes(".") || String(hi).includes(".")) return String(Math.round(n * 10) / 10);
    return String(Math.round(n));
  }
  function mapped(el, elo, ehi) {
    const lineTiers = parseSpanTiers(el.dataset.spanTiers);
    if (divs > 1 && lineTiers.length) {
      const n = divToDamage(lineTiers, value);
      if (Number.isFinite(n)) return showAt(n, elo, ehi);
    }
    const n = mapByTier(driverTiers, value, lineTiers);
    if (Number.isFinite(n)) return showAt(n, elo, ehi);
    if (ehi > elo) return showAt(elo + u * (ehi - elo), elo, ehi);
    return "";
  }
  for (const el of scope ? scope.querySelectorAll("[data-roll-live]") : []) {
    const elo = Number(el.dataset.spanLo);
    const ehi = Number(el.dataset.spanHi);
    const text = mapped(el, elo, ehi);
    if (text) el.textContent = text;
    else if (el.getAttribute("data-roll-live") === rid) el.textContent = shown;
  }
  for (const el of overlayLiveEl(scope, "", true)) {
    const elo = Number(el.dataset.extraLo);
    const ehi = Number(el.dataset.extraHi);
    const text = mapped(el, elo, ehi);
    if (text) el.textContent = text;
    else if (ehi > elo) el.textContent = showAt(elo + u * (ehi - elo), elo, ehi);
  }
  const em = host.querySelector("em");
  if (em) em.textContent = shown;
  const pill = wrap?.querySelector("[data-roll-tier]");
  const t0 = Number(input.dataset.tier0);
  const v0 = Number(input.dataset.value0);
  const base = String(pill?.dataset.pillBase || "").trim();
  if (pill && t0 > 0 && base) {
    const tier = rollTierAtValue({ spanTiers: input.dataset.spanTiers, tier: t0, value: v0, lo: Number(input.min), hi: Number(input.max) }, value);
    const hyb = /hyb/i.test(pill.textContent) ? " · hyb" : "";
    pill.textContent = base + " T" + tier + hyb;
  }
}

function scaleLinkedRolls() {
  // Hybrid lines each have their own slider; do not force-link rolls.
}

function setRollWantMin(log, drop, rid, raw, live) {
  if (!drop) return;
  if (String(rid) === "ilvl") {
    setDropIlvlMin(log, drop, raw, live);
    return;
  }
  if (String(rid) === "quality") {
    setDropQualityMin(log, drop, raw, live);
    return;
  }
  if (String(rid) === "runes") {
    setDropRunePick(log, drop, raw, live);
    return;
  }
  if (isSliderPropId(rid) || isTypedPropId(rid)) {
    setDropPropMin(log, drop, String(rid), raw, live);
    return;
  }
  drop.rolls = normalizeRolls(drop.rolls, drop);
  let row = drop.rolls.find((roll) => String(roll.rid) === String(rid));
  if (!row && (String(rid) === "charm" || isBeltItem(drop))) row = ensureCharmSlotRoll(drop);
  if (!row) return;
  const n0 = Number(raw);
  if (!Number.isFinite(n0)) return;
  const d = sliderDriver(row);
  const lo = Number(d.lo);
  const hi = Number(d.hi);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
  const divs = d.tiers.length;
  let n = n0;
  if (divs > 1 && n0 >= 0 && n0 <= divs + 0.001) n = divToDamage(d.tiers, n0);
  if (!Number.isFinite(n)) n = n0;
  row.wantMin = snapRollNum(Math.min(hi, Math.max(lo, n)), row);
  if (d.extra) d.extra.wantMin = row.wantMin;
  scaleLinkedRolls(drop, row, overlayLiveValue(row));
  if (live) return;
  if (isCharmSlotRoll(row)) row.pick = true;
  drop.quoteTried = false;
  delete drop.quote;
  delete drop.quoting;
  if (log?.id) save();
  paintPriceOverlay();
  if (row.pick) quoteRolledDrop(log, drop, true);
}

function rollChipsHtml(drop, logId) {
  const rolls = normalizeRolls(drop?.rolls || (Array.isArray(drop) ? drop : []), Array.isArray(drop) ? null : drop);
  const dropId = drop?.id || "";
  const canPick = dropId && logId;
  const ravenFlag = drop && !Array.isArray(drop) && drop.ravenTouched
    ? canPick
      ? `<button type="button" class="roll-chip is-flag is-raven${drop.pickRaven !== false ? " is-on" : ""}" data-pick-raven="${esc(dropId)}" data-pick-log="${esc(logId)}" title="${drop.pickRaven !== false ? "Searching Raven-Touched" : "Not searching Raven-Touched"}">${drop.pickRaven !== false ? "Raven-Touched" : "Not Raven-Touched"}</button>`
      : `<span class="roll-chip is-flag is-raven is-on">Raven-Touched</span>`
    : "";
  const unidFlag = drop && !Array.isArray(drop) && drop.unidentified
    ? canPick
      ? `<button type="button" class="roll-chip is-flag is-unid${searchUnidentified(drop) !== false ? " is-on" : ""}" data-pick-unid="${esc(dropId)}" data-pick-log="${esc(logId)}" title="${searchUnidentified(drop) !== false ? "Searching unidentified" : "Searching identified"}">${searchUnidentified(drop) !== false ? "Unidentified" : "Identified"}</button>`
      : `<span class="roll-chip is-flag is-unid is-on">Unidentified</span>`
    : "";
  const showFlag = drop && !Array.isArray(drop) && drop.corrupted === true;
  const flag = showFlag
    ? canPick
      ? `<button type="button" class="roll-chip is-flag${searchCorrupted(drop) !== false ? " is-on" : ""}" data-pick-corrupt="${esc(dropId)}" data-pick-log="${esc(logId)}" title="${searchCorrupted(drop) !== false ? "Searching corrupted" : "Searching not corrupted"}">Corrupted</button>`
      : `<span class="roll-chip is-flag is-on">Corrupted</span>`
    : "";
  if (!rolls.length && !flag && !ravenFlag && !unidFlag) return "";
  return `<div class="roll-chips">${ravenFlag}${unidFlag}${flag}${rolls
    .map((roll, i) => {
      if (isWeaponEleFlatRoll(roll, drop)) return "";
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
  if (unidentifiedUniqueNeedsPick(drop) && uniqueVariantsForBase(drop.baseType || drop.name, drop.className).length > 1) return;
  if (!drop.id) drop.id = uid();
  drop.rolls = normalizeRolls(drop.rolls, drop);
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
    const extra = {
      typeLine: tradeBaseType(drop),
      category: tradeCategory(drop.className),
      rarity: drop.rarity || "",
    };
    if (overlayUsesExchange(drop)) {
      extra.exchange = true;
      extra.have = exchangeHavePick(drop);
    } else {
      const index = await ensureTradeStats();
      const pickedMods = picked.filter((roll) => !isTabletUsesRoll(roll.text));
      const mappedMods = mapRollsToTradeFilters(pickedMods, index, true, { props: drop.props, className: drop.className });
      const filters = mergeTabletUseFilter(drop, index, mappedMods);
      if (pickedMods.length && mappedMods.length < pickedMods.length) {
        const skipped = pickedMods.length - mappedMods.length;
        showToast(filters.length ? skipped + " mod" + (skipped === 1 ? "" : "s") + " aren't on trade — checking the rest." : "Trade has no filter for those mods. Searching the item instead.");
      }
      extra.rolls = picked.map((roll) => roll.text);
      extra.filters = filters.concat(pickedPropFilters(drop));
      extra.exactBase = searchExactBase(drop);
      const ilvl = ilvlFilterState(drop);
      if (ilvl?.on) extra.ilvlMin = ilvl.min;
      const quality = qualityFilterState(drop);
      if (quality?.on) extra.qualityMin = quality.min;
      if (typeof searchCorrupted(drop) === "boolean") extra.corrupted = searchCorrupted(drop);
      if (searchUnidentified(drop)) {
        extra.unidentified = true;
        if (Number(drop.unidentifiedTier) > 0) extra.unidentifiedTier = Number(drop.unidentifiedTier);
      }
      if (wantsRavenTouched(drop)) extra.ravenTouched = true;
      if (Number.isInteger(drop.pickRunes)) extra.runeSockets = drop.pickRunes;
    }
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
      tag: row.tag || "",
      bulk: !!row.bulk,
      league: row.league || league,
      mapped: row.mapped || 0,
      offers: Array.isArray(row.offers) ? row.offers : [],
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
  if (/^Unidentified(?:\s*\(Tier\s*\d+\))?\s*$/im.test(text) && mode !== "price") {
    showToast("Identify it first, then press " + hotkeys().log + ".");
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
    if (parsed.mirrored) drop.mirrored = true;
    if (parsed.sanctified) drop.sanctified = true;
    if (parsed.ravenTouched) {
      drop.ravenTouched = true;
      drop.pickRaven = true;
    }
    if (parsed.unidentified) {
      drop.unidentified = true;
      drop.pickUnid = true;
      if (parsed.unidentifiedTier > 0) drop.unidentifiedTier = parsed.unidentifiedTier;
    }
    if (parsed.props) drop.props = parsed.props;
    if (parsed.usesRemaining > 0) drop.usesRemaining = parsed.usesRemaining;
    if (parsed.runeSockets > 0 && canHaveRunes(parsed)) {
      drop.runeSockets = parsed.runeSockets;
      drop.pickRunes = parsed.runeSockets;
    }
    if (parsed.charmSlots > 0) drop.charmSlots = parsed.charmSlots;
    if (!isClipboardCurrency(parsed) && parsed.mods?.length) drop.rolls = parsed.mods.slice(0, 24);
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
    className: parsed.className || "",
    corrupted: !!parsed.corrupted,
  };
  if (parsed.mirrored) entry.mirrored = true;
  if (parsed.sanctified) entry.sanctified = true;
  if (parsed.ravenTouched) {
    entry.ravenTouched = true;
    entry.pickRaven = true;
  }
  if (parsed.props) entry.props = parsed.props;
  if (parsed.usesRemaining > 0) entry.usesRemaining = parsed.usesRemaining;
  if (parsed.runeSockets > 0 && canHaveRunes(parsed)) {
    entry.runeSockets = parsed.runeSockets;
    entry.pickRunes = parsed.runeSockets;
  }
  if (parsed.charmSlots > 0) entry.charmSlots = parsed.charmSlots;
  if (!isClipboardCurrency(parsed) && parsed.mods?.length) entry.rolls = parsed.mods.slice(0, 24);
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
        }${esc(formatHour(prices.fetchedAt))}`
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
  const progress = uniqueProgress(farm);
  const progressPct = progress.total ? Math.round((progress.have / progress.total) * 100) : 0;
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
  const canClear = !!(kills || (liveForFarm?.drops || []).length);
  const completeTile = `<div class="farm-complete">
        <div class="metrics">
          <div class="metric"><span>Kills</span><strong>${kills}</strong></div>
          <div class="metric"><span>Uniques</span><strong>${progress.total ? `${progress.have}/${progress.total}` : "—"}</strong></div>
          <div class="metric"><span>Complete</span><strong>${progress.total ? esc(formatPct(progress.have, progress.total)) : "—"}</strong></div>
        </div>
        <div class="progress" aria-hidden="true"><i style="width:${progressPct}%"></i></div>
        <button class="btn danger" data-clear-boss="${esc(farmId)}" ${canClear ? "" : "disabled"} type="button">Clear all</button>
      </div>`;
  return `
    <section class="dash">
      <article class="farm-pad">
        <div class="farm-art" aria-hidden="true">${bossArtHtml(farm, "farm-art-img")}</div>
        <div class="farm-head">
          ${bossArtHtml(farm, "farm-portrait")}
          <div>
            <h2>${esc(farm?.name || "Pick a boss")}</h2>
            ${farm?.area ? `<p class="muted">${esc(farm.area)}</p>` : ""}
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
          <div class="farm-foot-end">
            ${completeTile}
            <button class="btn ghost" data-minus="${esc(farmId)}" ${dropUndo.length || (liveForFarm?.drops || []).length || kills ? "" : "disabled"} type="button">Undo</button>
          </div>
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
    ${itemIconHtml(row.name, "", true)}
    <span class="econ-copy">
      <span class="${NINJA_ITEMS.includes(cat) ? "unique-name" : "econ-name"}">${esc(row.name)}</span>
    </span>
    ${sparkSvg(spark.data, spark.change)}
    ${changeHtml(spark.change)}
    <span class="econ-price">${priced ? rowValueHtml(row) : "—"}</span>
  </button>`;
}

function rowPriceLabel(row) {
  const divine = Number.isFinite(row?.divine) ? row.divine : toDivine(row?.amount, row?.unit);
  return formatDivine(divine);
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
            <p class="muted">${esc(prices.league || leagueId())}${prices.fetchedAt ? " · " + (prices.cached ? "last recorded " : "") + esc(formatHour(prices.fetchedAt)) : ""} · <span id="econ-live">${esc(ninjaLiveLabel())}</span>${
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
  const artState = progress.total
    ? `<div class="card-art-state${done ? " is-done" : ""}"><b>${progress.have}/${progress.total}</b><span>${done ? "Complete" : esc(formatPct(progress.have, progress.total))}</span></div>`
    : "";
  return `
    <article class="card ${esc(boss.category)}${done ? " is-complete" : ""}" data-open="${esc(boss.id)}">
      <div class="card-art" aria-hidden="true">${bossArtHtml(boss, "card-art-img")}${artState}</div>
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
      </article>
      <div class="row-actions">
        <button class="btn ghost" data-theme-reset type="button">Reset look</button>
      </div>
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
        <h3>App</h3>
        <p class="muted" id="update-status" style="margin-top:8px">v${esc(APP_VERSION)}</p>
        <div class="row-actions">
          <button class="btn ghost" id="settings-check-btn" type="button"${window.chrome?.webview ? "" : " hidden"}>Check</button>
          <button class="btn gold" id="settings-update-btn" type="button" hidden>Update</button>
        </div>
      </article>
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
      const currency = quoteCurrencyName(quote);
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
  if (ui.view === "hunt" || ui.view === "bosses" || ui.view === "title") ui.view = "dash";
  document.body.classList.toggle("view-bosses", ui.view === "bosses");
  document.body.classList.toggle("view-econ", ui.view === "econ");
  document.body.classList.toggle("view-decks", ui.view === "decks");
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
    ui.view === "dash" || ui.view === "settings" || ui.view === "econ" || ui.view === "bosses" || ui.view === "decks" ? "none" : "grid";

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
  if (ui.view === "decks") {
    if (window.DeckGame) window.DeckGame.mount(main);
    else {
      main.innerHTML = "";
      ensureDecks().then(() => {
        if (ui.view === "decks" && window.DeckGame) window.DeckGame.mount(main);
      });
    }
  }
  if (ui.view === "settings") {
    main.innerHTML = renderSettings();
    checkAppUpdate();
  }

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
  if (ui.view === "bosses") requestAnimationFrame(updateBossScale);
  paintPriceClock();
}

function onClick(event) {
  if (event.target.closest("[data-win-min]")) {
    chrome.webview?.postMessage({ type: "window-min" });
    return;
  }
  if (event.target.closest("[data-win-max]")) {
    chrome.webview?.postMessage({ type: "window-max" });
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
  const toastAct = event.target.closest("[data-toast]");
  if (toastAct) {
    const toast = document.getElementById("toast");
    if (toast) toast.hidden = true;
    if (toastAct.dataset.toast === "undo") undoLastDrop();
    if (toastAct.dataset.toast === "loot") openLoot(toastAct.dataset.boss, toastAct.dataset.log);
    if (toastAct.dataset.toast === "update") startAppUpdate();
    return;
  }
  const priceLookup = event.target.closest("[data-price-lookup]");
  if (priceLookup) {
    event.preventDefault();
    event.stopPropagation();
    lookupOnePrice(priceLookup.dataset.priceLookup);
    return;
  }
  const pickUnique = event.target.closest("[data-pick-unique]");
  if (pickUnique) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickUnique.dataset.pickLog, pickUnique.dataset.pickDrop);
    applyUniquePick(log, drop, pickUnique.dataset.pickUnique);
    return;
  }
  const pickCorrupt = event.target.closest("[data-pick-corrupt]");
  if (pickCorrupt) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickCorrupt.dataset.pickLog, pickCorrupt.dataset.pickCorrupt);
    if (!drop) return;
    drop.pickCorrupt = searchCorrupted(drop) === false;
    drop.quoteTried = false;
    delete drop.quote;
    if (log?.id) save();
    if (ui.inspect) paintPriceOverlay();
    else render();
    return;
  }
  const pickUnid = event.target.closest("[data-pick-unid]");
  if (pickUnid) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickUnid.dataset.pickLog, pickUnid.dataset.pickUnid);
    if (!drop) return;
    drop.pickUnid = searchUnidentified(drop) === false;
    drop.quoteTried = false;
    delete drop.quote;
    if (log?.id) save();
    if (ui.inspect) paintPriceOverlay();
    else render();
    return;
  }
  const pickRaven = event.target.closest("[data-pick-raven]");
  if (pickRaven) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickRaven.dataset.pickLog, pickRaven.dataset.pickRaven);
    if (!drop) return;
    drop.pickRaven = drop.pickRaven === false;
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
  const pickRunesToggle = event.target.closest("[data-pick-runes-toggle]");
  if (pickRunesToggle) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickRunesToggle.dataset.pickLog, pickRunesToggle.dataset.pickDrop);
    toggleDropRunePick(log, drop);
    return;
  }
  const pickProp = event.target.closest("[data-pick-prop]");
  if (pickProp) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickProp.dataset.pickLog, pickProp.dataset.pickDrop);
    togglePickProp(log, drop, pickProp.dataset.pickProp);
    return;
  }
  const pickDpsType = event.target.closest("[data-pick-dps-type]");
  if (pickDpsType) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickDpsType.dataset.pickLog, pickDpsType.dataset.pickDrop);
    setDropDpsType(log, drop, pickDpsType.dataset.pickDpsType);
    return;
  }
  const pickSearch = event.target.closest("[data-pick-search]");
  if (pickSearch) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickSearch.dataset.pickLog, pickSearch.dataset.pickDrop);
    applyDropSearchToggle(log, drop, pickSearch.dataset.pickSearch);
    return;
  }
  const pickBase = event.target.closest("[data-pick-base]");
  if (pickBase) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickBase.dataset.pickLog, pickBase.dataset.pickDrop);
    applyDropBaseMode(log, drop, pickBase.dataset.pickBase);
    return;
  }
  const overlayRate = event.target.closest("[data-overlay-rate]");
  if (overlayRate) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const qStep = event.target.closest("[data-q-step]");
  if (qStep) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(qStep.dataset.pickLog, qStep.dataset.pickDrop);
    if (String(qStep.dataset.spanRid || "") === "ilvl") stepDropIlvl(log, drop, qStep.dataset.qStep, false);
    else stepDropQuality(log, drop, qStep.dataset.qStep, false);
    return;
  }
  const pickHave = event.target.closest("[data-pick-have]");
  if (pickHave) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickHave.dataset.pickLog, pickHave.dataset.pickDrop);
    setExchangeHave(log, drop, pickHave.dataset.pickHave);
    return;
  }
  const pickText = event.target.closest("[data-pick-text]");
  if (pickText) {
    event.preventDefault();
    event.stopPropagation();
    const { log, drop } = overlayLogDrop(pickText.dataset.pickLog, pickText.dataset.pickDrop);
    toggleInspectRoll(log, drop, pickText.dataset.pickText, pickText.dataset.pickKind, pickText.dataset.pickRid);
    return;
  }
  const pickRoll = event.target.closest("[data-pick-roll]");
  if (pickRoll) {
    event.preventDefault();
    event.stopPropagation();
    const log = state.logs.find((item) => item.id === pickRoll.dataset.pickLog) || liveLog();
    const drop = (log?.drops || []).find((item) => item.id === pickRoll.dataset.pickDrop);
    if (!drop) return;
    drop.rolls = normalizeRolls(drop.rolls, drop);
    const i = Number(pickRoll.dataset.pickRoll);
    if (!drop.rolls[i]) return;
    drop.rolls[i].pick = !drop.rolls[i].pick;
    const row = drop.rolls[i];
    if (Number.isInteger(row.affix) && row.affix > 0 && drop.rolls.some((roll) => roll.affix === row.affix && roll.text !== row.text)) {
      const on = row.pick;
      const affix = row.affix;
      drop.rolls.forEach((roll) => {
        if (roll.affix === affix) roll.pick = on;
      });
    }
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
  const openTradeSite = event.target.closest("[data-open-trade-site]");
  if (openTradeSite) {
    event.preventDefault();
    event.stopPropagation();
    const { drop } = overlayLogDrop(openTradeSite.dataset.openTradeLog, openTradeSite.dataset.openTradeSite);
    openTradeWebsite(drop);
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
  const clearBoss = event.target.closest("[data-clear-boss]");
  if (clearBoss) {
    event.stopPropagation();
    if (confirm("Clear all kills for this boss?")) clearBossLogs(clearBoss.dataset.clearBoss);
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
  if (event.target.closest("#settings-check-btn")) {
    checkAppUpdate(true);
    return;
  }
  if (event.target.closest("#settings-update-btn")) {
    startAppUpdate();
    return;
  }
  if (event.target.closest("#export-btn, #settings-export-btn")) {
    exportData();
    return;
  }
  if (event.target.closest("#import-btn, #settings-import-btn")) {
    importBackup();
  }
}

function onChange(event) {
  const span = event.target.closest("[data-span-rid]");
  if (span) {
    const { log, drop } = overlayLogDrop(span.dataset.pickLog, span.dataset.pickDrop);
    setRollWantMin(log, drop, span.dataset.spanRid, span.value);
    return;
  }
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
document.addEventListener("mousedown", (event) => {
  if (!event.target.closest("[data-win-drag]")) return;
  if (event.button !== 0) return;
  event.preventDefault();
  chrome.webview?.postMessage({ type: "window-drag" });
});
document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("change", onChange);
document.addEventListener("input", (event) => {
  const span = event.target.closest("[data-span-rid]");
  if (span) {
    if (span.classList?.contains("price-overlay-q-input")) {
      sanitizeOverlayMinInput(span);
      span.closest(".price-overlay-prop-num")?.classList.add("is-on");
      return;
    }
    paintOverlaySpanLive(span);
    const { log, drop } = overlayLogDrop(span.dataset.pickLog, span.dataset.pickDrop);
    setRollWantMin(log, drop, span.dataset.spanRid, span.value, true);
    return;
  }
  const theme = event.target.closest("[data-theme]");
  if (theme) {
    setTheme({ [theme.dataset.theme]: theme.value });
    return;
  }
  if (event.target.id === "search" || event.target.id === "econ-search") {
    onChange(event);
  }
});

document.addEventListener(
  "wheel",
  (event) => {
    const t = event.target.closest(".price-overlay-q-input, input[data-span-rid='quality']");
    if (!t) return;
    event.preventDefault();
    const min = Number(t.min);
    const max = Number(t.max);
    const cur = Number(t.value);
    if (!Number.isFinite(cur)) return;
    const step = t.dataset.spanDec ? 0.1 : 1;
    const next = Math.min(
      Number.isFinite(max) ? max : cur + step,
      Math.max(Number.isFinite(min) ? min : cur - step, Math.round((cur + (event.deltaY < 0 ? step : -step)) * 100) / 100)
    );
    if (next === cur) return;
    t.value = String(next);
    paintOverlaySpanLive(t);
    const { log, drop } = overlayLogDrop(t.dataset.pickLog, t.dataset.pickDrop);
    setRollWantMin(log, drop, t.dataset.spanRid, t.value, true);
  },
  { passive: false }
);

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
checkAppUpdate();
ensureAffixLadders();
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
