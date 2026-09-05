/* Blank Inheritance — the personal comm device.
 *
 * Prototype-only, same rules as console.js: this is the framework and the
 * first pass at the eight confirmed apps from ideas/entries/phone-app-
 * suite.json ("I love all of them"), built to be judged and played with,
 * not treated as finished. Pure logic (dice, the staggered-alert delays,
 * the fortune picker, the pet's tiny state machine, the Resonance band
 * lookup) lives in scripts/core/phone.mjs and is unit-tested there; this
 * file is the thin DOM adapter on top of it, plus the eight app pages
 * themselves, which are deliberately light — "lay the groundwork, tackle
 * the complex ones one at a time," not nine finished features in one pass.
 *
 * Self-contained on purpose: it owns its own small copy of the roster
 * roles (Contacts) rather than importing console.js's, so the two
 * prototype files can be read and changed independently for now. The
 * moment either the marker roster or the phone's contact list needs to be
 * the SAME live data (a player's actual sign-up state, say), that's the
 * point to factor it out — not before, per this project's own "don't
 * abstract until two real call sites actually need to agree" instinct.
 */

import {
  resonanceBand,
  rollDice,
  staggeredAlertDelays,
  drawFortune,
  petMood,
  feedPet,
  playWithPet,
  decayPet
} from "../../module/blank-inheritance/scripts/core/phone.mjs";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, className, html) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

/* ------------------------------------------------------------------ *
 * Real campaign content, lightly held. The six candidates/roles are the
 * same shape console.js's own CANDIDATES/ROLES use (data/campaign/
 * ground-roles.json); the three Directorate contacts are data/npcs/*.json
 * verbatim, one line each. Nothing here invents an identity for the six
 * real kids -- candidate NUMBER is still the only name a contact card uses.
 * ------------------------------------------------------------------ */
const ROSTER = [
  { no: "01", role: "Sensor Op", jp: "探知" },
  { no: "02", role: "Umbilical", jp: "臍帯" },
  { no: "03", role: "Evac Marshal", jp: "避難" },
  { no: "04", role: "Pilot", jp: "機体" },
  { no: "05", role: "Structural", jp: "構造" },
  { no: "06", role: "Signals", jp: "通信" }
];
const DIRECTORATE_CONTACTS = [
  { name: "The Commander", blurb: "Puts the mission above the individuals carrying it out." },
  { name: "The Caretaker", blurb: "Tries, misguidedly, to give the kids something like a normal adolescence." },
  { name: "Transparency Advocate", blurb: "Believes the kids should be told everything, immediately." }
];

// Field Guide: the one entry Recall Knowledge has actually filled in so
// far (data/antagonists/claimants/contact-unclassified.json), plus two
// still-locked slots to show the "auto-fills itself" mechanic in motion.
const FIELD_GUIDE = {
  known: {
    name: "Contact, Unclassified",
    level: 12,
    traits: ["aberration", "claimant"],
    flavor: "It does not hunt and it does not posture. It walks a straight line toward something it has apparently already decided belongs to it.",
    facts: ["Weak to sonic", "Resists physical 10", "Reaction on approach"]
  },
  lockedCount: 2
};

const BULLETIN_ITEMS = [
  { text: "Runabout Pilot — Ens. K.", status: "on duty" },
  { text: "Sensor Mast Watch", status: "on duty" },
  { text: "Frame 04, previous pilot", status: "reassigned · Day 2", gone: true },
  { text: "Pier 3 ground crew", status: "on duty" }
];

const FORTUNE_POOL = [
  { text: "A quiet day is still a day.", weight: 3 },
  { text: "Do not trust anything that thanks you for your patience.", weight: 3 },
  { text: "Today favors the cautious. Tomorrow will not.", weight: 3 },
  { text: "The Directorate cannot see everything. Neither can you.", weight: 3 },
  { text: "Something you filed as unimportant is not.", real: true, weight: 1 },
  { text: "You will be asked a question you already know the answer to.", weight: 3 }
];

const DICE = [4, 6, 8, 10, 12, 20, 100];

/* ------------------------------------------------------------------ *
 * Persisted, per-viewer, purely textural state (the Pet). localStorage
 * is the right tool here -- nothing about a phone toy needs to survive a
 * cleared browser or sync anywhere; it only needs to still be there next
 * time the SAME person opens the SAME browser.
 * ------------------------------------------------------------------ */
const PET_KEY = "bi-phone-pet-v1";
function loadPet() {
  try {
    const raw = localStorage.getItem(PET_KEY);
    if (!raw) return { fed: 60, played: 60, last: Date.now() };
    return JSON.parse(raw);
  } catch {
    return { fed: 60, played: 60, last: Date.now() };
  }
}
function savePet(state) {
  try { localStorage.setItem(PET_KEY, JSON.stringify(state)); } catch { /* private mode, etc — fine to lose */ }
}

/* ------------------------------------------------------------------ *
 * The eight confirmed apps. Each renders itself into the view container
 * and returns an optional cleanup function (called when navigating away —
 * so intervals/listeners a page starts don't keep running behind it).
 * ------------------------------------------------------------------ */
const APPS = [
  {
    id: "alert", label: "Alert", glyph: "⚠", tile: "var(--bi-vermilion)",
    render(view) {
      view.innerHTML = `
        <div class="bi-phone__card" id="alert-status">
          <b style="color:var(--bi-phosphor)">ALL CLEAR</b><br>
          <span style="opacity:.7">No active Contact.</span>
        </div>
        <p class="bi-phone__body">A Contact reaches candidates on a stagger, not all at once — nobody at this table learns at exactly the same second.</p>
        <button class="bi-phone__key" id="alert-sim">SIMULATE CONTACT</button>
        <div class="bi-phone__row" id="alert-roster" style="flex-direction:column;gap:4px;margin-top:8px"></div>`;
      const roster = $("#alert-roster", view);
      roster.innerHTML = ROSTER.map((c) => `
        <div class="bi-phone__card" style="margin-bottom:0;display:flex;justify-content:space-between" data-no="${c.no}">
          <span>${c.no} · ${c.role}</span><span class="bi-phone__t" style="opacity:.5">—</span>
        </div>`).join("");
      let timers = [];
      $("#alert-sim", view).addEventListener("click", () => {
        timers.forEach(clearTimeout);
        timers = [];
        $("#alert-status", view).innerHTML = `<b style="color:var(--bi-vermilion)">CONTACT</b><br><span style="opacity:.7">Alerting candidates...</span>`;
        $$("[data-no] .bi-phone__t", roster).forEach((t) => { t.textContent = "—"; t.style.opacity = 0.5; t.style.color = ""; });
        const delays = staggeredAlertDelays(ROSTER.length, { minMs: 300, maxMs: 3200 });
        ROSTER.forEach((c, i) => {
          const t = setTimeout(() => {
            const cell = $(`[data-no="${c.no}"] .bi-phone__t`, roster);
            if (cell) { cell.textContent = "ALERTED"; cell.style.opacity = 1; cell.style.color = "var(--bi-vermilion)"; }
          }, delays[i]);
          timers.push(t);
        });
      });
      return () => timers.forEach(clearTimeout);
    }
  },
  {
    id: "field-guide", label: "Field Guide", glyph: "▤", tile: "var(--bi-cyan)",
    render(view) {
      const f = FIELD_GUIDE.known;
      view.innerHTML = `
        <div class="bi-phone__card">
          <b>${f.name}</b> <span style="opacity:.6">· L${f.level}</span><br>
          <span style="opacity:.6;text-transform:uppercase;font-size:6.5px">${f.traits.join(" · ")}</span>
          <p class="bi-phone__body" style="margin:4px 0 6px">${f.flavor}</p>
          ${f.facts.map((x) => `<div style="color:var(--bi-cyan)">▸ ${x}</div>`).join("")}
        </div>
        ${Array.from({ length: FIELD_GUIDE.lockedCount }).map(() => `
          <div class="bi-phone__card" style="opacity:.45">
            <b>??? UNIDENTIFIED</b><br><span style="opacity:.7">Insufficient Recall Knowledge.</span>
          </div>`).join("")}
        <p class="bi-phone__body" style="opacity:.6">Entries fill themselves in from successful Recall Knowledge — nothing to do here but keep looking.</p>`;
    }
  },
  {
    id: "resonance", label: "Resonance", glyph: "≈", tile: "var(--bi-resonance)",
    render(view) {
      view.innerHTML = `
        <div class="bi-phone__card" style="text-align:center">
          <div style="font-size:22px;color:var(--bi-resonance);text-shadow:0 0 8px currentColor" id="res-val">62</div>
          <div id="res-band" style="color:var(--bi-resonance)">HARMONISED</div>
        </div>
        <div class="bi-phone__row" style="flex-direction:column;gap:3px" id="res-bands"></div>`;
      const bandsEl = $("#res-bands", view);
      let value = 62;
      const paint = () => {
        const b = resonanceBand(value);
        $("#res-val", view).textContent = String(Math.round(value));
        $("#res-band", view).textContent = b.name.toUpperCase();
        bandsEl.innerHTML = ["dead-weight", "nominal", "harmonised", "absolute"].map((id) => `
          <div style="display:flex;justify-content:space-between;padding:2px 4px;${id === b.id ? "background:#1a0e2a;color:var(--bi-resonance)" : "opacity:.4"}">
            <span>${id.replace("-", " ")}</span></div>`).join("");
      };
      paint();
      const iv = setInterval(() => {
        value = Math.max(0, Math.min(100, value + (Math.random() - 0.5) * 4));
        paint();
      }, 2200);
      return () => clearInterval(iv);
    }
  },
  {
    id: "bulletin", label: "Bulletin", glyph: "≡", tile: "var(--bi-amber)",
    render(view) {
      view.innerHTML = `<div class="bi-phone__body" style="margin-bottom:6px">GROUND CREW BOARD</div>` +
        BULLETIN_ITEMS.map((b) => `
          <div class="bi-phone__card" style="${b.gone ? "opacity:.4;text-decoration:line-through" : ""}">
            ${b.text}<br><span style="opacity:.6;text-decoration:none;display:inline-block">${b.status}</span>
          </div>`).join("");
    }
  },
  {
    id: "contacts", label: "Contacts", glyph: "☺", tile: "var(--bi-phosphor)",
    render(view) {
      view.innerHTML = `<div id="contacts-list"></div><div id="contacts-msg"></div>`;
      const list = $("#contacts-list", view);
      const msg = $("#contacts-msg", view);
      const card = (title, sub, tag) => `
        <button class="bi-phone__key" data-title="${title}" style="width:100%;text-align:left;margin-bottom:5px;display:flex;justify-content:space-between">
          <span>${title}<br><span style="opacity:.6;font-size:6.5px">${sub}</span></span>
          ${tag ? `<span style="opacity:.5;font-size:6px;align-self:flex-start">${tag}</span>` : ""}
        </button>`;
      list.innerHTML =
        ROSTER.map((c) => card(`${c.no} · ${c.role}`, c.jp, "")).join("") +
        DIRECTORATE_CONTACTS.map((c) => card(c.name, c.blurb, "OFFICIAL")).join("");
      list.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-title]");
        if (!btn) return;
        msg.innerHTML = `<div class="bi-phone__card" style="margin-top:6px">${btn.dataset.title}<br><span style="opacity:.6">No messages yet.</span></div>`;
      });
    }
  },
  {
    id: "fortune", label: "Fortune", glyph: "✦", tile: "var(--bi-brass)",
    render(view) {
      view.innerHTML = `
        <div class="bi-phone__card" style="min-height:40px" id="fortune-card">Tap below for today's reading.</div>
        <button class="bi-phone__key" id="fortune-draw">DRAW A FORTUNE</button>`;
      $("#fortune-draw", view).addEventListener("click", () => {
        const f = drawFortune(FORTUNE_POOL);
        $("#fortune-card", view).textContent = f.text;
      });
    }
  },
  {
    id: "pet", label: "Pet", glyph: "", tile: "color-mix(in srgb, var(--bi-resonance) 40%, var(--bi-amber))",
    render(view) {
      let state = loadPet();
      const elapsedMinutes = (Date.now() - (state.last || Date.now())) / 60000;
      if (elapsedMinutes > 1) state = { ...decayPet(state, Math.min(40, elapsedMinutes)), last: Date.now() };
      view.innerHTML = `
        <div style="text-align:center">
          <div id="pet-sprite" style="margin:4px auto"></div>
          <div id="pet-mood" style="margin:6px 0"></div>
        </div>
        FED<div class="bi-phone__meter"><i id="pet-fed"></i></div>
        PLAYED<div class="bi-phone__meter"><i id="pet-played"></i></div>
        <div class="bi-phone__row">
          <button class="bi-phone__key" id="pet-feed">FEED</button>
          <button class="bi-phone__key" id="pet-play">PLAY</button>
        </div>`;
      renderPetSprite($("#pet-sprite", view));
      const paint = () => {
        $("#pet-fed", view).style.width = state.fed + "%";
        $("#pet-played", view).style.width = state.played + "%";
        $("#pet-mood", view).textContent = petMood(state).toUpperCase();
        savePet({ ...state, last: Date.now() });
      };
      paint();
      $("#pet-feed", view).addEventListener("click", () => { state = feedPet(state); paint(); bounce($("#pet-sprite", view)); });
      $("#pet-play", view).addEventListener("click", () => { state = playWithPet(state); paint(); bounce($("#pet-sprite", view)); });
    }
  },
  {
    id: "roll", label: "Roll", glyph: "⚄", tile: "var(--bi-bone)",
    render(view) {
      view.innerHTML = `
        <div class="bi-phone__card" style="text-align:center;font-size:16px" id="roll-out">—</div>
        <div class="bi-phone__row" id="roll-keys"></div>
        <div class="bi-phone__body" id="roll-log" style="margin-top:6px"></div>`;
      $("#roll-keys", view).innerHTML = DICE.map((d) => `<button class="bi-phone__key" data-d="${d}">d${d}</button>`).join("");
      const log = [];
      $("#roll-keys", view).addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-d]");
        if (!btn) return;
        const r = rollDice(Number(btn.dataset.d), 1);
        $("#roll-out", view).textContent = String(r.total);
        log.unshift(`d${r.sides} → ${r.total}`);
        log.length = 6;
        $("#roll-log", view).innerHTML = log.filter(Boolean).join("<br>");
      });
    }
  }
];

function renderPetSprite(host) {
  // A tiny 7x7 pixel grid, drawn as CSS grid cells rather than an image —
  // "bonus points for cute," produced with what this project already has
  // rather than needing a real sprite asset for a first pass.
  const rows = [
    "..XXX..",
    ".XXXXX.",
    "X.X.X.X",
    "XXXXXXX",
    "X.XXX.X",
    ".X...X.",
    "..X.X.."
  ];
  host.style.display = "grid";
  host.style.gridTemplateColumns = "repeat(7, 4px)";
  host.style.gridTemplateRows = "repeat(7, 4px)";
  host.style.gap = "1px";
  // The sprite's own track size (34px) is smaller than a 40px home-screen
  // tile face; without this the browser's default "stretch" grid alignment
  // spreads the tracks to fill the box instead of centering the drawing.
  host.style.justifyContent = "center";
  host.style.alignContent = "center";
  // FOUND LIVE: .bi-phone__tile-face's own `place-items: center` (needed
  // so a bare glyph character centers in its 40px tile) also applies here
  // once this host reuses that class — but `center` sizes a grid ITEM to
  // its own content rather than stretching it to fill the track, and a
  // content-less <span> has no intrinsic size. Every cell rendered at
  // 0x0, fully invisible, even though the colours and grid were correct.
  // Explicit width/height on each cell sidesteps the inherited alignment
  // entirely, rather than depending on overriding a rule owned elsewhere.
  host.innerHTML = rows.flatMap((row) => [...row].map((c) =>
    `<span style="display:block;width:100%;height:100%;background:${c === "X" ? "var(--bi-resonance)" : "transparent"}"></span>`
  )).join("");
}
function bounce(node) {
  node.style.transform = "translateY(-3px)";
  setTimeout(() => { node.style.transform = ""; }, 160);
}

/* ------------------------------------------------------------------ *
 * The shell: build once, lazily, on first open.
 * ------------------------------------------------------------------ */
let phoneEl = null;
let cleanupCurrentApp = null;

function buildPhone(mountInto) {
  const phone = el("div", "bi-phone");
  phone.id = "phone";
  phone.hidden = true;
  phone.innerHTML = `
    <button class="bi-phone__close" id="phone-close" aria-label="Close">&times;</button>
    <div class="bi-phone__grip" id="phone-grip"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="bi-phone__ear"></div>
    <div class="bi-phone__screen" id="phone-screen">
      <div class="bi-phone__statusbar">
        <span class="bi-phone__bars"><i class="bi-lit"></i><i class="bi-lit"></i><i class="bi-lit"></i><i></i></span>
        <span class="bi-phone__clock" id="phone-clock">16:42</span>
        <span class="bi-phone__batt"><i></i></span>
      </div>
      <div class="bi-phone__view" id="phone-view"></div>
    </div>
    <span class="bi-phone__screw--bl"></span><span class="bi-phone__screw--br"></span>
    <button class="bi-phone__homebtn" id="phone-home" aria-label="Home" title="Home"></button>`;
  mountInto.appendChild(phone);
  // Idea #4, confirmed: "as a pilot's Bleed climbs, their own phone's
  // pixel UI degrades." The phone is built lazily on first open, so if
  // Bleed was already dragged up before that happened, the ONE existing
  // handler (console.js) never found this screen to corrupt — it did not
  // exist yet. Read the console's own current Bleed value once, here, so
  // a phone opened AFTER the fact still looks the way it should. Every
  // frame after this, console.js's own handler (now also targeting
  // .bi-phone__screen) keeps it in sync — this is a one-time catch-up,
  // not a second source of truth.
  const bleedInput = document.getElementById("bleed");
  const screen = $(".bi-phone__screen", phone);
  if (bleedInput && screen) {
    const v = Number(bleedInput.value) / 100;
    screen.classList.toggle("bi-corrupt", v > 0.02);
    screen.style.setProperty("--bi-bleed", String(v));
  }
  return phone;
}

function showHome(view) {
  if (cleanupCurrentApp) { cleanupCurrentApp(); cleanupCurrentApp = null; }
  view.innerHTML = `<div class="bi-phone__home" id="phone-home-grid"></div>`;
  const grid = $("#phone-home-grid", view);
  grid.innerHTML = APPS.map((a) => `
    <button class="bi-phone__tile" style="--tile:${a.tile}" data-app="${a.id}">
      <span class="bi-phone__tile-face">${a.id === "pet" ? "" : a.glyph}
        <span class="bi-phone__tile-badge" ${a.id === "alert" ? "" : "hidden"}>!</span>
      </span>
      <span class="bi-phone__tile-label">${a.label}</span>
    </button>`).join("");
  if (grid.querySelector('[data-app="pet"] .bi-phone__tile-face')) {
    renderPetSprite(grid.querySelector('[data-app="pet"] .bi-phone__tile-face'));
  }
  grid.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-app]");
    if (!btn) return;
    openApp(view, btn.dataset.app);
  }, { once: true });
}

function openApp(view, id) {
  const app = APPS.find((a) => a.id === id);
  if (!app) return;
  if (cleanupCurrentApp) { cleanupCurrentApp(); cleanupCurrentApp = null; }
  view.innerHTML = `
    <div class="bi-phone__appbar">
      <button class="bi-phone__back" id="phone-back">&lt; BACK</button>
      <span class="bi-phone__title">${app.label.toUpperCase()}</span>
    </div>
    <div id="phone-app-body"></div>`;
  $("#phone-back", view).addEventListener("click", () => showHome(view));
  const cleanup = app.render($("#phone-app-body", view));
  if (typeof cleanup === "function") cleanupCurrentApp = cleanup;
}

/* ------------------------------------------------------------------ *
 * Dragging. Confined to the console's own box, per the idea entry's
 * "draggable — a floating window, not a fixed dock like the control bar."
 * ------------------------------------------------------------------ */
function makeDraggable(phone, grip, container) {
  let dragging = false;
  let startX = 0, startY = 0, baseX = 0, baseY = 0;
  grip.addEventListener("pointerdown", (ev) => {
    dragging = true;
    grip.setPointerCapture(ev.pointerId);
    const r = phone.getBoundingClientRect();
    const b = container.getBoundingClientRect();
    startX = ev.clientX; startY = ev.clientY;
    baseX = r.left - b.left; baseY = r.top - b.top;
  });
  grip.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const b = container.getBoundingClientRect();
    const w = phone.offsetWidth, h = phone.offsetHeight;
    const x = Math.max(4, Math.min(b.width - w - 4, baseX + (ev.clientX - startX)));
    const y = Math.max(4, Math.min(b.height - h - 4, baseY + (ev.clientY - startY)));
    phone.style.setProperty("--phone-x", x + "px");
    phone.style.setProperty("--phone-y", y + "px");
  });
  grip.addEventListener("pointerup", () => { dragging = false; });
}

/* ------------------------------------------------------------------ *
 * Wire the toolbar button up.
 * ------------------------------------------------------------------ */
export function initPhone({ mountInto, badgeCount = 3 }) {
  const btn = $("#phone-btn");
  const badge = $("#phone-badge");
  if (badge) { badge.textContent = String(badgeCount); badge.hidden = badgeCount <= 0; }
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!phoneEl) {
      phoneEl = buildPhone(mountInto);
      makeDraggable(phoneEl, $("#phone-grip", phoneEl), mountInto);
      $("#phone-close", phoneEl).addEventListener("click", () => setOpen(false));
      $("#phone-home", phoneEl).addEventListener("click", () => showHome($("#phone-view", phoneEl)));
      showHome($("#phone-view", phoneEl));
      const tick = () => {
        const clock = $("#phone-clock", phoneEl);
        const src = $("#clock-out");
        if (clock && src) clock.textContent = src.textContent;
      };
      tick();
      setInterval(tick, 4000);
    }
    setOpen(phoneEl.hidden);
  });

  function setOpen(open) {
    phoneEl.hidden = !open;
    btn.setAttribute("aria-pressed", String(open));
    if (open && badge) badge.hidden = true;   // opening the phone reads the "mail"
  }
}
