(() => {
  const COLS = 12;
  const ROWS = 5;
  const SLOTS = COLS * ROWS;
  const STACKED_DECK_ICON =
    "https://web.poecdn.com/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvRGl2aW5hdGlvbi9EZWNrIiwic2NhbGUiOjF9XQ/8e83aea79a/Deck.png";
  const CARD_ART = "https://cdn.jsdelivr.net/npm/@navali/poe1-divination-cards@3.29.1/data/images/";
  const WIKI_ART = "https://www.poewiki.net/wiki/Special:FilePath/";

  const state = {
    slots: Array.from({ length: SLOTS }, () => null),
    drops: [],
    dragging: null,
    hover: null,
    ignoreClickUntil: 0,
  };
  state.slots[0] = { type: "deck", qty: 40 };

  function cards() {
    return Array.isArray(typeof DIV_CARDS !== "undefined" ? DIV_CARDS : null) ? DIV_CARDS : [];
  }

  function pool() {
    return cards().filter((card) => (card.weight || 0) > 0);
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function rewardText(text) {
    return String(text || "")
      .replace(/([a-z0-9%])([A-Z])/g, "$1 $2")
      .replace(/Item Item/g, "Item");
  }

  function artUrl(card, kind) {
    if (!card?.art) return STACKED_DECK_ICON;
    if (kind === "wiki") return WIKI_ART + encodeURIComponent(card.art);
    return CARD_ART + encodeURIComponent(card.art);
  }

  function drawCard() {
    const list = pool();
    let total = 0;
    for (const card of list) total += card.weight;
    if (!total) return null;
    let roll = Math.random() * total;
    for (const card of list) {
      roll -= card.weight;
      if (roll <= 0) return card;
    }
    return list[list.length - 1];
  }

  function emptySlot() {
    return state.slots.findIndex((slot) => !slot);
  }

  function deckCount() {
    return state.slots.reduce((n, slot) => n + (slot?.type === "deck" ? slot.qty : 0), 0);
  }

  function takeDeck() {
    const i = state.slots.findIndex((slot) => slot?.type === "deck" && slot.qty > 0);
    if (i < 0) return false;
    state.slots[i].qty -= 1;
    if (state.slots[i].qty <= 0) state.slots[i] = null;
    return true;
  }

  function addDecks(qty) {
    const have = state.slots.findIndex((slot) => slot?.type === "deck");
    if (have >= 0) {
      state.slots[have].qty += qty;
      return true;
    }
    const free = emptySlot();
    if (free < 0) return false;
    state.slots[free] = { type: "deck", qty };
    return true;
  }

  function lootCard(card) {
    const same = state.slots.findIndex((slot) => slot?.type === "card" && slot.card?.name === card.name);
    if (same >= 0) {
      state.slots[same].qty += 1;
      return true;
    }
    const free = emptySlot();
    if (free < 0) return false;
    state.slots[free] = { type: "card", card, qty: 1 };
    return true;
  }

  function cardFace(card, className) {
    return `<div class="${className}">
      <img src="${esc(artUrl(card))}" alt="" draggable="false" data-art="${esc(card.art || "")}">
      <div class="poe-card-copy">
        <strong>${esc(card.name)}</strong>
        <span>Stack Size: ${card.stack || 1}</span>
        <b>${esc(rewardText(card.reward))}</b>
        ${card.flavour ? `<em>${esc(card.flavour)}</em>` : ""}
      </div>
    </div>`;
  }

  function dropHtml(drop) {
    return `<button class="poe-drop" type="button" data-drop="${esc(drop.id)}" style="left:${drop.x}%;top:${drop.y}%">
      ${cardFace(drop.card, "poe-card")}
    </button>`;
  }

  function cellHtml(slot, i) {
    if (!slot) return `<div class="poe-cell" data-slot="${i}"></div>`;
    if (slot.type === "deck") {
      return `<button class="poe-cell has-item is-deck" type="button" data-slot="${i}" title="Stacked Deck">
        <img src="${STACKED_DECK_ICON}" alt="" draggable="false">
        ${slot.qty > 1 ? `<em>${slot.qty}</em>` : ""}
      </button>`;
    }
    return `<button class="poe-cell has-item is-card" type="button" data-slot="${i}" data-inv-card="${esc(slot.card.name)}" title="${esc(slot.card.name)}">
      <img src="${esc(artUrl(slot.card))}" alt="" draggable="false" data-art="${esc(slot.card.art || "")}">
      ${slot.qty > 1 ? `<em>${slot.qty}</em>` : ""}
    </button>`;
  }

  function paint(root) {
    const ground = root.querySelector(".poe-ground");
    const grid = root.querySelector(".poe-inv-grid");
    const count = root.querySelector("[data-deck-count]");
    if (ground) ground.innerHTML = state.drops.map(dropHtml).join("");
    if (grid) grid.innerHTML = state.slots.map(cellHtml).join("");
    if (count) count.textContent = String(deckCount());
  }

  function hideTip(root) {
    const tip = root.querySelector(".poe-card-tip");
    if (tip) {
      tip.hidden = true;
      tip.innerHTML = "";
    }
    state.hover = null;
  }

  function showTip(root, card, x, y) {
    const tip = root.querySelector(".poe-card-tip");
    if (!tip || !card) return;
    state.hover = card.name;
    tip.hidden = false;
    tip.innerHTML = cardFace(card, "poe-card poe-card-lg");
    const box = root.getBoundingClientRect();
    const w = 280;
    const h = 420;
    let left = x - box.left - w - 16;
    if (left < 8) left = x - box.left + 24;
    let top = y - box.top - 40;
    if (top + h > box.height - 8) top = box.height - h - 8;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  }

  function spawnAt(root, clientX, clientY) {
    const ground = root.querySelector(".poe-ground");
    const card = drawCard();
    if (!ground || !card) return;
    const box = ground.getBoundingClientRect();
    const x = ((clientX - box.left) / box.width) * 100;
    const y = ((clientY - box.top) / box.height) * 100;
    state.drops.push({
      id: "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      card,
      x: Math.max(12, Math.min(88, x)),
      y: Math.max(16, Math.min(82, y)),
    });
    state.ignoreClickUntil = Date.now() + 280;
    paint(root);
  }

  function setGhost(root, on, x, y) {
    const ghost = root.querySelector(".poe-ghost");
    if (!ghost) return;
    ghost.hidden = !on;
    if (on) {
      ghost.style.left = x + "px";
      ghost.style.top = y + "px";
    }
  }

  function bind(root) {
    const ground = root.querySelector(".poe-ground");
    const grid = root.querySelector(".poe-inv-grid");
    if (!ground || !grid) return;

    const onMove = (event) => {
      if (!state.dragging) return;
      setGhost(root, true, event.clientX, event.clientY);
    };

    const onUp = (event) => {
      if (!state.dragging) return;
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const overGround = under?.closest?.(".poe-ground");
      setGhost(root, false);
      root.classList.remove("is-dragging");
      grid.querySelectorAll(".is-held").forEach((el) => el.classList.remove("is-held"));
      if (overGround && takeDeck()) spawnAt(root, event.clientX, event.clientY);
      else paint(root);
      state.dragging = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    grid.addEventListener("pointerdown", (event) => {
      const cell = event.target.closest(".poe-cell.is-deck");
      if (!cell || event.button !== 0) return;
      const slot = state.slots[Number(cell.dataset.slot)];
      if (!slot || slot.type !== "deck" || slot.qty < 1) return;
      event.preventDefault();
      state.dragging = "deck";
      cell.classList.add("is-held");
      root.classList.add("is-dragging");
      hideTip(root);
      setGhost(root, true, event.clientX, event.clientY);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });

    const hoverCard = (event) => {
      if (state.dragging) return;
      const dropEl = event.target.closest("[data-drop]");
      const inv = event.target.closest("[data-inv-card]");
      if (dropEl) {
        const drop = state.drops.find((row) => row.id === dropEl.dataset.drop);
        if (drop) showTip(root, drop.card, event.clientX, event.clientY);
        return;
      }
      if (inv) {
        const slot = state.slots[Number(inv.dataset.slot)];
        if (slot?.type === "card") showTip(root, slot.card, event.clientX, event.clientY);
        return;
      }
      hideTip(root);
    };

    ground.addEventListener("pointermove", hoverCard);
    grid.addEventListener("pointermove", hoverCard);
    ground.addEventListener("pointerleave", () => hideTip(root));
    grid.addEventListener("pointerleave", () => hideTip(root));

    ground.addEventListener("click", (event) => {
      if (Date.now() < state.ignoreClickUntil) return;
      const dropEl = event.target.closest("[data-drop]");
      if (!dropEl) return;
      const drop = state.drops.find((row) => row.id === dropEl.dataset.drop);
      if (!drop) return;
      if (!lootCard(drop.card)) return;
      state.drops = state.drops.filter((row) => row.id !== drop.id);
      hideTip(root);
      paint(root);
    });

    root.querySelector("[data-deck-clear]")?.addEventListener("click", () => {
      state.drops = [];
      hideTip(root);
      paint(root);
    });
    root.querySelector("[data-deck-fill]")?.addEventListener("click", () => {
      addDecks(20);
      paint(root);
    });
  }

  function mount(el) {
    if (!el) return;
    const patch = typeof DECK_PATCH !== "undefined" ? DECK_PATCH : "3.29";
    const league = typeof DECK_LEAGUE_NAME !== "undefined" ? DECK_LEAGUE_NAME : "Allflame";
    el.innerHTML = `
      <section class="poe-deck">
        <header class="poe-deck-head">
          <div>
            <h2>Stacked Deck</h2>
            <p>PoE 1 · ${esc(patch)} ${esc(league)}</p>
          </div>
          <div class="poe-deck-actions">
            <button class="btn ghost" data-deck-fill type="button">Take 20 decks</button>
            <button class="btn ghost" data-deck-clear type="button">Clear ground</button>
          </div>
        </header>
        <div class="poe-play">
          <div class="poe-ground"></div>
          <aside class="poe-inv-panel">
            <div class="poe-inv-label">Inventory <span data-deck-count>0</span> decks</div>
            <div class="poe-inv-grid"></div>
          </aside>
        </div>
        <div class="poe-ghost" hidden>
          <img src="${STACKED_DECK_ICON}" alt="" draggable="false">
        </div>
        <div class="poe-card-tip" hidden></div>
      </section>`;
    paint(el.firstElementChild);
    bind(el.firstElementChild);
  }

  window.DeckGame = {
    mount,
    iconFail(img) {
      const art = img.getAttribute("data-art") || "";
      const tried = img.getAttribute("data-try") || "";
      if (art && tried !== "wiki") {
        img.setAttribute("data-try", "wiki");
        img.src = WIKI_ART + encodeURIComponent(art);
        return;
      }
      if (tried !== "deck") {
        img.setAttribute("data-try", "deck");
        img.src = STACKED_DECK_ICON;
        return;
      }
      img.style.visibility = "hidden";
    },
  };

  document.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (img && img.getAttribute && img.getAttribute("data-art") != null) window.DeckGame.iconFail(img);
    },
    true
  );
})();
