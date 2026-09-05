/* Blank Inheritance — console prototype behaviour.
 *
 * Prototype-only. None of this is the module's real data layer; it exists so
 * the visual identity can be judged in motion rather than as a still, and so
 * the interactions the design promises can actually be tried. Anything here
 * that survives review moves into scripts/core/ as a pure function with tests
 * — the marker placement geometry and the notice queue already have, and this
 * file imports them back rather than keeping a second copy.
 *
 * The content, though, is real: the ground roles are the five in
 * data/campaign/ground-roles.json, and the map markers are the locations
 * campaign-arc.md describes on the reference art this scene is cropped from.
 */

import {
  layoutMarkers,
  visibleBand,
  fixFrom
} from "../../module/blank-inheritance/scripts/core/marker-layout.mjs";
import {
  NoticeQueue,
  NOTICE_DWELL,
  NOTICE_CAP,
  weightedPick
} from "../../module/blank-inheritance/scripts/core/notices.mjs";

/* ------------------------------------------------------------------ *
 * Data — real campaign content, prototype-only shape.
 * ------------------------------------------------------------------ */

// data/campaign/ground-roles.json, in its stated order. The lamp colour is
// the ONE place a role's colour is decided: the Ground Stations rail and the
// marker berths both read it from here, so they can never disagree. Signals
// is violet on purpose — the role "reduces Bleed, or holds a slipping
// Resonance band", the same justification as the Anchor key.
const ROLES = [
  { id: "sensor-operator",    name: "Sensor Op",    code: "SEN", jp: "探知", lamp: "cyan" },
  { id: "umbilical-control",  name: "Umbilical",    code: "UMB", jp: "臍帯", lamp: "amber" },
  { id: "evacuation-marshal", name: "Evac Marshal", code: "EVA", jp: "避難", lamp: "" },
  { id: "structural-command", name: "Structural",   code: "STR", jp: "構造", lamp: "red" },
  { id: "signals-liaison",    name: "Signals",      code: "SIG", jp: "通信", lamp: "resonance" }
];
// The pilot is not a ground station; their lamp is incandescent bone.
const PILOT_ROLE = { id: "pilot", name: "Pilot", code: "PLT", lamp: "bone" };
const ROLE_BY_ID = Object.fromEntries([...ROLES, PILOT_ROLE].map((r) => [r.id, r]));

// Six candidates, six roles. Placeholder assignments — the six real kids are
// the user's to create, not ours to invent. The candidate NUMBER is the
// identity the console uses everywhere (the ident instrument reads "04").
const CANDIDATES = [
  { no: "01", role: "sensor-operator" },
  { no: "02", role: "umbilical-control" },
  { no: "03", role: "evacuation-marshal" },
  { no: "04", role: "pilot" },
  { no: "05", role: "structural-command" },
  { no: "06", role: "signals-liaison" }
];
const candidateRole = (no) => ROLE_BY_ID[CANDIDATES.find((c) => c.no === no).role];

const UNITS = [
  { id: "claimant", name: "Claimant", jp: "占有者", init: 24, hp: 0.53, kind: "danger", ac: 34, hpText: "96/180", lvl: 13 },
  { id: "frame04",  name: "Frame 04", jp: "四号機", init: 19, hp: 0.70, kind: "ok",     ac: 32, hpText: "148/210", lvl: 12 },
  { id: "runabout", name: "Runabout", jp: "連絡艇", init: 15, hp: 0.88, kind: "warn",   ac: 24, hpText: "44/50",   lvl: 8 },
  { id: "ground",   name: "Ground Team", jp: "地上班", init: 11, hp: 1.0, kind: "ok",   ac: 18, hpText: "—",       lvl: 1 }
];

// Facts a Sensor Operator has turned up. Per phone-app-suite idea #2, a
// successful Recall Knowledge should become a permanent, browsable entry
// rather than a fact spoken once and forgotten.
const FACTS = [
  { text: "Weak to sonic", tone: "ok" },
  { text: "Resists physical 10", tone: "warn" },
  { text: "Reaction on approach", tone: "danger" }
];

// SF2E's five threat bands (reference/tables/encounter-and-rewards-math.json).
const RISK_BANDS = ["", "Trivial", "Low", "Moderate", "Severe", "Extreme"];

// The stations on the scene. x/y are fractions of the scene box — the DOT
// goes exactly there; the CARD is placed by marker-layout.mjs. `kind` is the
// marker's own colour: resonance is for the Claimant contact ONLY. `jp` is
// for the marquee, which keeps its Japanese; the boards carry none.
const MARKERS = [
  { id: "fort",     x: 0.76, y: 0.27, delay: 0,   kind: "info",      code: "ST-01", name: "Directorate HQ",     status: "Sealed",    risk: 2, detail: "SO-14 · CAUSEWAY ONLY",        jp: "統制局 本部",   note: "Sea fort, mid-channel. Causeway is the only approach.", crew: [] },
  { id: "causeway", x: 0.59, y: 0.39, delay: 0.5, kind: "warn",      code: "ST-02", name: "Causeway Check",     status: "Held",      risk: 3, detail: "DC 22 · SO-14 IN FORCE",       jp: "堤道 検問所",   note: "Standing Order 14: no Frame passes under its own power.", crew: ["05"] },
  { id: "contact",  x: 0.40, y: 0.55, delay: 1.1, kind: "resonance", code: "ST-03", name: "Contact — Old Town", status: "Contact",   risk: 5, detail: "CLAIMANT · CIVILIANS 1,200",   jp: "接触 発生",     note: "Claimant, old town. Civilian density high.", crew: ["04"] },
  { id: "shelter",  x: 0.20, y: 0.69, delay: 1.7, kind: "ok",        code: "ST-04", name: "Shelter 4",          status: "62% clear", risk: 2, detail: "1,240 / 2,000 · TRACK HELD",   jp: "第四避難所",    note: "1,240 of 2,000 clear. Evacuation Marshal has the track.", crew: ["03"] },
  { id: "pier",     x: 0.50, y: 0.79, delay: 2.2, kind: "warn",      code: "ST-05", name: "Pier 3 — Sortie",    status: "Cradle",    risk: 3, detail: "UMBILICAL · 2R BANKED",        jp: "第三埠頭 発進", note: "Launch cradle. Umbilical still engaged.", crew: ["02", "06"] },
  { id: "mast",     x: 0.27, y: 0.21, delay: 2.6, kind: "info",      code: "ST-06", name: "Sensor Mast",        status: "Open",      risk: 1, detail: "RECALL KNOWLEDGE FROM HERE",   jp: "探知塔",        note: "Sensor Operator station. Recall Knowledge from here.", crew: ["01"] }
];
const FRAME_AT = MARKERS.find((m) => m.id === "pier");   // the Frame is in its cradle

const MARQUEE_ITEMS = [
  { t: "同調率 6.2 — 帯域 安定", c: "jp" },
  { t: "CONTACT PROBABILITY 18% AND RISING", c: "warn" },
  { t: "STANDING ORDER 14 IN FORCE — NO FRAME PAST THE CAUSEWAY UNDER ITS OWN POWER" },
  { t: "SHELTER 4 AT 62% — EVACUATION MARSHAL HOLDS THE TRACK" },
  { t: "接触 発生 — 旧市街", c: "alert" },
  { t: "UMBILICAL ENGAGED — 2 INTERNAL ROUNDS BANKED" },
  { t: "PILOT CANDIDATE 04 CLEARED FOR SORTIE — MEDICAL DEFERRED", c: "warn" },
  { t: "SEA STATE 3 — WIND 14KT NORTHEAST — TIDE FALLING" }
];

// The test bed's random notices, weighted 5 info : 3 caution : 1 alert : 1
// resonance. Resonance lines are Resonance/Bleed/Anchor/Claimant events and
// nothing else — a test greps this pool for that.
const NOTICE_POOL = [
  { kind: "info",      weight: 1.2, text: "Sea state 3 — wind 14kt northeast — tide falling" },
  { kind: "info",      weight: 1.2, text: "Runabout departed Pier 3 — ETA causeway 4 min" },
  { kind: "info",      weight: 1.2, text: "Sensor mast sweep complete — no new returns" },
  { kind: "info",      weight: 1.2, text: "Shelter 4 headcount updated — 1,240 clear" },
  { kind: "info",      weight: 1.2, text: "Directorate courier inbound — clearance pending" },
  { kind: "caution",   weight: 1,   text: "Contact probability 24% and rising" },
  { kind: "caution",   weight: 1,   text: "Umbilical pressure drift — check the cradle clamps" },
  { kind: "caution",   weight: 1,   text: "Standing Order 14 in force — hold at the causeway" },
  { kind: "alert",     weight: 1,   text: "Structural failure — old town waterfront", jp: "構造 崩壊 — 旧市街" },
  { kind: "resonance", weight: 1,   text: "Resonance band slipping — Signals, talk the pilot down" }
];

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const lampClass = (lamp) => (lamp ? "bi-lamp--" + lamp : "");

/** Map a 0..1 value onto the analog dials' -130°..+130° sweep. */
const needleAngle = (v) => (clamp(v, 0, 1) * 260 - 130).toFixed(1) + "deg";

const consoleEl = $("#console");
const sceneEl = $("#scene");

/* ------------------------------------------------------------------ *
 * Render: rails
 * ------------------------------------------------------------------ */
$("#roles").innerHTML = ROLES.map((r, i) => {
  const holder = CANDIDATES.find((c) => c.role === r.id);
  return `
  <button class="bi-role" data-role="${r.id}" aria-pressed="${i === 0}">
    <span class="bi-lamp ${lampClass(r.lamp)} ${i === 0 ? "bi-lamp--lit" : ""}"></span>
    <span class="bi-role__text">
      <span class="bi-role__name">${r.name}</span>
      <span class="bi-role__jp">${r.jp}</span>
    </span>
    <span class="bi-role__who">${holder ? holder.no : "—"}</span>
  </button>`;
}).join("");

$("#units").innerHTML = UNITS.map((u, i) => `
  <button class="bi-unit" data-unit="${u.id}" aria-pressed="${i === 0}">
    <span class="bi-lamp ${u.kind === "danger" ? "bi-lamp--red" : u.kind === "warn" ? "bi-lamp--amber" : ""} bi-lamp--lit" style="width:11px;height:11px"></span>
    <span class="bi-unit__body">
      <span class="bi-unit__name">${u.name}</span>
      <span class="bi-unit__jp">${u.jp}</span>
      <span class="bi-meter ${u.kind === "danger" ? "bi-meter--danger" : u.kind === "warn" ? "bi-meter--warn" : ""}" style="--v:${u.hp}"></span>
    </span>
    <span class="bi-unit__init">${u.init}</span>
  </button>`).join("");

function renderFacts() {
  $("#facts").innerHTML = FACTS.map((f) => `
    <div style="display:flex;align-items:center;gap:7px;padding:2px 0">
      <span class="bi-lamp ${f.tone === "danger" ? "bi-lamp--red" : f.tone === "warn" ? "bi-lamp--amber" : ""} bi-lamp--lit" style="width:8px;height:8px"></span>
      <span style="font-family:var(--bi-font-condensed);font-size:13px;font-weight:600;letter-spacing:.02em;line-height:1.35;color:var(--bi-bone);white-space:normal">${f.text}</span>
    </div>`).join("");
}
renderFacts();

$("#marquee").innerHTML = MARQUEE_ITEMS
  .map((m) => `<span class="bi-marquee__item ${m.c ? "bi-marquee__item--" + m.c : ""}">${m.t}</span>`)
  .join('<span class="bi-marquee__sep">&#9670;</span>');

/* Macro bank — ten slots and page controls, matching Foundry's own
   capacity, because the chassis covers the hotbar we displaced. */
const MACRO_GLYPHS = ["⚔", "⚡", "⚙", "◈", "✦", "", "", "", "", ""];
$("#macro-bank").innerHTML = MACRO_GLYPHS.map((g, i) => `
  <button class="bi-macro ${g ? "bi-macro--filled" : "bi-macro--empty"}"
          aria-label="Macro slot ${i + 1}${g ? "" : " (empty)"}">${g}
    <span class="bi-macro__key">${(i + 1) % 10}</span>
  </button>`).join("");

/* ------------------------------------------------------------------ *
 * Instruments
 * ------------------------------------------------------------------ */
const dome = $("#dome");
const state = { res: 6.2, hp: 148, hpMax: 210, locked: false, target: UNITS[0], round: 3, prob: 0.18, gm: false, me: "04" };

function paintInstruments() {
  $("#res-out").textContent = state.res.toFixed(1);   // .bi-subdome__value
  $("#hud-res").textContent = state.res.toFixed(1);
  $("#hp-out").textContent = String(state.hp);
  $("#hud-hp").textContent = String(state.hp);
  $("#needle-res").style.setProperty("--angle", needleAngle(state.res / 10));
  $("#needle-pwr").style.setProperty("--angle", needleAngle(state.hp / state.hpMax));
}
paintInstruments();

function setLock(on, unit) {
  state.locked = on;
  if (unit) state.target = unit;
  dome.dataset.mode = on ? "target" : "vitals";
  $("#hud-mode").textContent = on ? "LOCK" : "SYNC";
  $("#hud-mode-jp").textContent = on ? "捕捉" : "同調";
  if (on && state.target) {
    $("#hud-tgt-ac").textContent = "AC " + state.target.ac;
    $("#hud-tgt-hp").textContent = state.target.hpText;
  }
}

$("[data-lock]").addEventListener("click", () => setLock(!state.locked));

/* Frame generation — the instrument gets more capable as the pilot does. */
for (const btn of $$("[data-tier-btn]")) {
  btn.addEventListener("click", () => {
    dome.dataset.hudTier = btn.dataset.tierBtn;
    for (const b of $$("[data-tier-btn]")) b.setAttribute("aria-pressed", String(b === btn));
  });
}

/** Push a line to the front of the marquee and restart its run. */
function announce(text, tone) {
  const run = $("#marquee");
  const item = document.createElement("span");
  item.className = "bi-marquee__item" + (tone ? " bi-marquee__item--" + tone : "");
  item.textContent = text;
  const sep = document.createElement("span");
  sep.className = "bi-marquee__sep";
  sep.innerHTML = "&#9670;";
  run.prepend(sep);
  run.prepend(item);
  run.style.animation = "none";
  void run.offsetWidth;         // force reflow so the restart takes
  run.style.animation = "";
}

/* ------------------------------------------------------------------ *
 * Map markers — muster boards. Rendered from MARKERS, placed by the
 * core geometry, re-placed on every resize.
 * ------------------------------------------------------------------ */
const markerEls = new Map();
let selectedMarker = null;

function berthMarkup(m) {
  return CANDIDATES.map((c) => {
    const role = ROLE_BY_ID[c.role];
    const on = m.crew.includes(c.no);
    const me = state.me === c.no;
    return `
      <li class="bi-berth ${on ? "bi-berth--on" : ""} ${me ? "bi-berth--me" : ""}" data-candidate="${c.no}" title="Candidate ${c.no} — ${role.name}${on ? ", mustered" : ""}">
        <span class="bi-lamp ${lampClass(role.lamp)} ${on ? "bi-lamp--lit" : ""}"></span>
        <span class="bi-berth__num">${c.no}</span>
        <span class="bi-berth__role">${role.code}</span>
      </li>`;
  }).join("");
}

function fixLine(m) {
  const scene = consoleEl.getBoundingClientRect();
  const f = fixFrom({ x: FRAME_AT.x, y: FRAME_AT.y }, { x: m.x, y: m.y }, { scale: 6, aspect: scene.height / Math.max(1, scene.width) });
  if (m === FRAME_AT) return "CRADLE · 0.0 KM";
  return `BRG ${String(f.bearing).padStart(3, "0")}° · ${f.range.toFixed(1)} KM`;
}

function renderMarkers() {
  sceneEl.insertAdjacentHTML("beforeend", MARKERS.map((m) => `
    <article class="bi-marker bi-marker--${m.kind}" data-marker="${m.id}" style="--x:${m.x};--y:${m.y};--delay:${m.delay}s">
      <button class="bi-marker__dot" type="button" aria-label="Target ${m.name}" aria-pressed="false"></button>
      <span class="bi-marker__stem" aria-hidden="true"></span>
      <span class="bi-marker__shadow" aria-hidden="true"></span>
      <div class="bi-marker__card bi-plate-skin">
        <header class="bi-marker__head">
          <span class="bi-plate bi-plate--brass bi-marker__code">${m.code}</span>
          <span class="bi-plate bi-marker__name" title="${m.name}">${m.name}</span>
          <span class="bi-lamp bi-lamp--lit bi-marker__lamp ${m.kind === "warn" ? "bi-lamp--amber" : m.kind === "danger" ? "bi-lamp--red" : m.kind === "resonance" ? "bi-lamp--resonance" : m.kind === "info" ? "bi-lamp--cyan" : ""}"></span>
        </header>
        <figure class="bi-marker__scope">
          <img src="assets/pins/${m.id}.jpg" alt="" width="480" height="320">
          <span class="bi-marker__fix">${fixLine(m)}</span>
          <span class="bi-marker__status">${m.status}</span>
        </figure>
        <div class="bi-marker__risk bi-screen" data-risk="${m.risk}" aria-label="Risk ${RISK_BANDS[m.risk]}">
          <span class="bi-legend">Risk</span>
          <span class="bi-marker__gauge" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
          <span class="bi-marker__band">${RISK_BANDS[m.risk]}</span>
          <span class="bi-marker__detail">${m.detail}</span>
        </div>
        <div class="bi-marker__muster">
          <div class="bi-marker__muster-head">
            <span class="bi-legend">Muster</span>
            <span class="bi-marker__count"><b>${m.crew.length}</b>/6</span>
          </div>
          <ol class="bi-marker__berths" aria-label="Sign-ups, by candidate number">${berthMarkup(m)}</ol>
        </div>
        <footer class="bi-marker__foot">
          <button class="bi-key bi-key--sm bi-key--go bi-marker__commit" type="button">Sign on</button>
        </footer>
      </div>
    </article>`).join(""));

  for (const el of $$(".bi-marker", sceneEl)) {
    const m = MARKERS.find((x) => x.id === el.dataset.marker);
    markerEls.set(m.id, el);
    $(".bi-marker__dot", el).addEventListener("click", () => selectMarker(m.id));
    $(".bi-marker__head", el).addEventListener("click", () => selectMarker(m.id));
    $(".bi-marker__commit", el).addEventListener("click", () => commit(m.id));
  }
  paintMuster();
}

/** Repaint every board's berths, count and key from the crew lists. */
function paintMuster() {
  for (const m of MARKERS) {
    const el = markerEls.get(m.id);
    $(".bi-marker__berths", el).innerHTML = berthMarkup(m);
    $(".bi-marker__count b", el).textContent = String(m.crew.length);
    const mine = state.me !== null && m.crew.includes(state.me);
    const full = m.crew.length >= 6;
    el.classList.toggle("bi-marker--mine", mine);
    el.classList.toggle("bi-marker--full", full);
    const key = $(".bi-marker__commit", el);
    key.classList.remove("bi-key--go", "bi-key--caution");
    key.removeAttribute("aria-disabled");
    if (state.gm) {
      key.textContent = "Clear board";
      key.classList.add("bi-key--caution");
      key.hidden = m.crew.length === 0;
    } else if (mine) {
      key.textContent = "Stand down";
      key.classList.add("bi-key--caution");
      key.hidden = false;
    } else if (full) {
      key.textContent = "Full";
      key.setAttribute("aria-disabled", "true");
      key.hidden = false;
    } else {
      key.textContent = "Sign on";
      key.classList.add("bi-key--go");
      key.hidden = false;
    }
  }
}

/** The one action that changes a sign-up. A candidate is on ONE board. */
function commit(id) {
  const m = MARKERS.find((x) => x.id === id);
  if (state.gm) {
    m.crew = [];
    paintMuster();
    notify("caution", `${m.name} — board cleared by the Director`);
    return;
  }
  const me = state.me;
  if (m.crew.includes(me)) {
    m.crew = m.crew.filter((c) => c !== me);
    paintMuster();
    notify("info", `Candidate ${me} stood down — ${m.name}`);
    return;
  }
  if (m.crew.length >= 6) return;
  for (const other of MARKERS) other.crew = other.crew.filter((c) => c !== me);
  m.crew.push(me);
  paintMuster();
  const role = candidateRole(me);
  notify("info", `Candidate ${me} (${role.name}) mustered — ${m.name}`);
}

function selectMarker(id) {
  const next = selectedMarker === id ? null : id;
  selectedMarker = next;
  for (const [mid, el] of markerEls) {
    const on = mid === next;
    el.classList.toggle("bi-marker--selected", on);
    $(".bi-marker__dot", el).setAttribute("aria-pressed", String(on));
  }
  if (next) {
    const m = MARKERS.find((x) => x.id === next);
    announce(`${m.jp} — ${m.name.toUpperCase()}: ${m.note.toUpperCase()}`, m.kind === "danger" || m.kind === "resonance" ? "alert" : "");
    if (m.id === "contact") setLock(true, UNITS[0]);
  }
  layoutScene();
}

/**
 * Measure the console and place every card. All geometry goes through the
 * core module in console-local CSS px: rects come back scaled by the
 * console's zoom, so they are divided out before anything is compared.
 */
function layoutScene() {
  const z = Number(getComputedStyle(consoleEl).zoom) || 1;
  const con = consoleEl.getBoundingClientRect();
  const W = con.width / z;
  const H = con.height / z;
  const local = (el) => {
    const r = el.getBoundingClientRect();
    return { x0: (r.left - con.left) / z, y0: (r.top - con.top) / z, x1: (r.right - con.left) / z, y1: (r.bottom - con.top) / z };
  };
  const topRail = local($(".bi-console__top", consoleEl));
  const chassis = local($(".bi-console__bar", consoleEl));
  const band = visibleBand({ width: W, height: H, topRail: topRail.y1, chassis: H - chassis.y0 });

  const exclusions = [];
  let railsW = 0;
  for (const rail of $$(".bi-console__left, .bi-console__right", consoleEl)) {
    const r = local(rail);
    railsW += r.x1 - r.x0 + 16;
    exclusions.push({ x0: r.x0 - 8, y0: r.y0 - 8, x1: r.x1 + 8, y1: r.y1 + 8 });
  }

  // Density ladder. The photograph only earns its 197px when the band is
  // tall; below that, six compact boards (320x295) need ~570k px of scene
  // plus room to move, or they cannot help but overlap — measured, not
  // assumed: usable area is what is left after the rails.
  const bandH = band.y1 - band.y0;
  const usable = (band.x1 - band.x0 - railsW) * bandH;
  const compactArea = MARKERS.length * 320 * 300;
  sceneEl.dataset.markerDensity =
    (bandH >= 1000 && W >= 2000) ? "full" :
    (usable >= compactArea * 1.6) ? "compact" : "docket";
  const lane = $("#banner-lane");
  if (lane) {
    const r = local(lane);
    exclusions.push({ x0: r.x0 - 8, y0: r.y0, x1: r.x1 + 8, y1: r.y1 + 8 });
  }
  const domeTop = local($(".bi-dome", consoleEl));
  exclusions.push({ x0: domeTop.x0 - 8, y0: domeTop.y0 - 8, x1: domeTop.x1 + 8, y1: H });

  const items = MARKERS.map((m) => {
    const el = markerEls.get(m.id);
    const card = $(".bi-marker__card", el);
    const r = card.getBoundingClientRect();
    return {
      id: m.id,
      anchor: { x: m.x * W, y: m.y * H },
      size: { w: r.width / z, h: r.height / z },
      priority: (m.id === selectedMarker ? 100 : 0) + m.risk
    };
  });
  const placed = layoutMarkers(items, band, exclusions);
  for (const p of placed) {
    const m = MARKERS.find((x) => x.id === p.id);
    const el = markerEls.get(p.id);
    const ax = m.x * W;
    const ay = m.y * H;
    el.style.setProperty("--dx", (p.x - ax).toFixed(1) + "px");
    el.style.setProperty("--dy", (p.y - ay).toFixed(1) + "px");
    el.style.setProperty("--card-h", (p.rect.y1 - p.rect.y0).toFixed(1) + "px");
    el.style.setProperty("--len", p.stem.length.toFixed(1) + "px");
    el.style.setProperty("--angle", p.stem.angle.toFixed(2) + "deg");
    el.dataset.side = p.side;
    el.dataset.overlaps = p.overlaps.join(" ");
  }
  runDiagnostics();
}

renderMarkers();

/* ------------------------------------------------------------------ *
 * Scene banners — the queue decides, this owns the timers.
 * ------------------------------------------------------------------ */
const laneEl = $("#banner-lane");
const notices = new NoticeQueue();
let bannerEl = null;
let dwellTimer = null;
let dwellEndsAt = 0;

function clockStamp() { return $("#clock-out").textContent; }

function buildBanner(n) {
  const wrap = document.createElement("div");
  wrap.className = "bi-banner__wrap";
  wrap.innerHTML = `
    <div class="bi-banner bi-banner--${n.kind}" role="${n.kind === "alert" ? "alert" : "status"}">
      <div class="bi-banner__face">
        <span class="bi-banner__cap"><span class="bi-banner__kind">${NOTICE_CAP[n.kind]}</span></span>
        <span class="bi-banner__chev" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="bi-banner__glass">
          <span class="bi-banner__text">${n.text}</span>
          <span class="bi-banner__count" ${n.count > 1 ? "" : "hidden"}>×${n.count}</span>
        </span>
        <span class="bi-banner__cap bi-banner__cap--right"><span class="bi-banner__time">${clockStamp()}</span></span>
      </div>
    </div>`;
  return wrap;
}

function startDwell(ms) {
  clearTimeout(dwellTimer);
  dwellEndsAt = performance.now() + ms;
  dwellTimer = setTimeout(endDwell, ms);
}

function showBanner(n) {
  bannerEl = buildBanner(n);
  laneEl.replaceChildren(bannerEl);
  const plate = $(".bi-banner", bannerEl);
  // Hover holds the timer — the marquee's rule: a strip you cannot stop is a
  // strip you cannot finish reading. Click dismisses.
  plate.addEventListener("mouseenter", () => clearTimeout(dwellTimer));
  plate.addEventListener("mouseleave", () => startDwell(Math.max(1500, dwellEndsAt - performance.now())));
  plate.addEventListener("click", endDwell);
  startDwell(NOTICE_DWELL[n.kind]);
  announce(n.jp ? `${n.jp} — ${n.text.toUpperCase()}` : n.text.toUpperCase(),
           n.kind === "alert" ? "alert" : n.kind === "caution" ? "warn" : "");
  layoutScene();
}

function retireBanner(done) {
  clearTimeout(dwellTimer);
  const plate = bannerEl && $(".bi-banner", bannerEl);
  if (!plate) { done(); return; }
  plate.classList.add("bi-banner--out");
  const el = bannerEl;
  bannerEl = null;
  setTimeout(() => { el.remove(); done(); }, 320);
}

function endDwell() {
  retireBanner(() => {
    const next = notices.dismiss();
    if (next) setTimeout(() => showBanner(next), 600);
  });
}

/** Raise a notice. kind: info | caution | alert | resonance. */
function notify(kind, text, extra = {}) {
  const r = notices.push({ kind, text, ...extra }, performance.now());
  switch (r.action) {
    case "show":    showBanner(r.notice); break;
    case "merge": {
      const count = bannerEl && $(".bi-banner__count", bannerEl);
      if (count) { count.textContent = "×" + r.notice.count; count.hidden = false; }
      startDwell(NOTICE_DWELL[r.notice.kind]);
      break;
    }
    case "preempt": retireBanner(() => setTimeout(() => showBanner(r.notice), 450)); break;
    default: break;   // queued; endDwell will get to it
  }
  return r;
}
window.biNotify = notify;   // reachable from devtools / automation

// The test bed's random traffic: one notice every 9-20s while the toggle is on.
let bannerAuto = true;
let bannerArm = null;
function armRandomBanner() {
  clearTimeout(bannerArm);
  if (!bannerAuto) return;
  bannerArm = setTimeout(() => {
    const pick = weightedPick(NOTICE_POOL);
    notify(pick.kind, pick.text, pick.jp ? { jp: pick.jp } : {});
    armRandomBanner();
  }, 9000 + Math.random() * 11000);
}
$("#banners-toggle")?.addEventListener("click", (ev) => {
  bannerAuto = !bannerAuto;
  ev.currentTarget.setAttribute("aria-pressed", String(bannerAuto));
  armRandomBanner();
});
$("#fire-alert")?.addEventListener("click", () => {
  const pick = NOTICE_POOL.find((p) => p.kind === "alert");
  notify(pick.kind, pick.text, { jp: pick.jp });
});
armRandomBanner();
// The first plate arrives soon after load so the review does not wait for it.
setTimeout(() => { if (bannerAuto && !bannerEl) notify("info", "Console online — Harbour, Pier 3, Day 04"); }, 2200);

/* ------------------------------------------------------------------ *
 * Rails: roles, units, turn order
 * ------------------------------------------------------------------ */
$("#roles").addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-role]");
  if (!btn) return;
  for (const b of $$("[data-role]")) {
    const on = b === btn;
    b.setAttribute("aria-pressed", String(on));
    b.querySelector(".bi-lamp").classList.toggle("bi-lamp--lit", on);
  }
});

$("#units").addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-unit]");
  if (!btn) return;
  for (const b of $$("[data-unit]")) b.setAttribute("aria-pressed", String(b === btn));
  const unit = UNITS.find((u) => u.id === btn.dataset.unit);
  if (unit && unit.kind === "danger") setLock(true, unit);
});

let turnIndex = 0;
function advanceTurn(step) {
  turnIndex = (turnIndex + step + UNITS.length) % UNITS.length;
  if (turnIndex === 0 && step > 0) {
    state.round += 1;
    $("#round-out").textContent = String(state.round);
  }
  const btns = $$("[data-unit]");
  btns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === turnIndex)));
  // A new turn refills the action economy — the pips are the clearest
  // possible signal that it is now your go.
  for (const pip of $$("#pips .bi-pip")) {
    pip.classList.add("bi-pip--available");
    pip.classList.remove("bi-pip--spent");
  }
}
$("#next-turn").addEventListener("click", () => advanceTurn(1));
$("#prev-turn").addEventListener("click", () => advanceTurn(-1));

/* Recall Knowledge — a success becomes a permanent browsable entry. */
const SPARE_FACTS = [
  { text: "Immune to void", tone: "ok" },
  { text: "Sweep: 2 targets", tone: "danger" },
  { text: "Flees below 1/4", tone: "warn" }
];
$("#recall").addEventListener("click", () => {
  const next = SPARE_FACTS.shift();
  if (!next) { announce("NO FURTHER RECALL AVAILABLE THIS SCENE"); return; }
  FACTS.push(next);
  renderFacts();
  notify("info", `Recall Knowledge — ${next.text}`);
});

/* ------------------------------------------------------------------ *
 * Action economy, conditions, toggles
 * ------------------------------------------------------------------ */
$("#pips").addEventListener("click", (ev) => {
  const pip = ev.target.closest(".bi-pip");
  if (!pip) return;
  const spent = pip.classList.toggle("bi-pip--spent");
  pip.classList.toggle("bi-pip--available", !spent);
});

$("#conditions").addEventListener("click", (ev) => {
  const lamp = ev.target.closest("[data-cond]");
  if (!lamp) return;
  lamp.setAttribute("aria-pressed", String(lamp.classList.toggle("bi-lamp--lit")));
});

for (const t of $$(".bi-toggle")) {
  t.addEventListener("click", () =>
    t.setAttribute("aria-pressed", t.getAttribute("aria-pressed") === "true" ? "false" : "true"));
}

/* ------------------------------------------------------------------ *
 * Audio mixer — faders drive a live level readout.
 * ------------------------------------------------------------------ */
for (const strip of $$(".bi-mixer__strip")) {
  const fader = $("input", strip);
  const lvl = $("[data-lvl]", strip);
  const paint = () => {
    lvl.textContent = String(fader.value).padStart(2, "0");
    lvl.style.color = fader.value > 85 ? "var(--bi-amber)" : "var(--bi-phosphor)";
  };
  fader.addEventListener("input", paint);
  paint();
}

/* ------------------------------------------------------------------ *
 * Pilot / Director
 * ------------------------------------------------------------------ */
const gmPod = $("#gm-pod");
const identPod = $("#ident-pod");
function setMode(gm) {
  state.gm = gm;
  state.me = gm ? null : "04";
  gmPod.hidden = !gm;
  // The Direction module needs ~150px the chassis does not have spare. A GM is
  // not flying a Frame, so the pilot ident plate is what pays for it — trading
  // one module for another rather than letting them crowd each other.
  if (identPod) identPod.style.display = gm ? "none" : "";
  $("#mode-gm").setAttribute("aria-pressed", String(gm));
  $("#mode-player").setAttribute("aria-pressed", String(!gm));
  paintMuster();
  requestAnimationFrame(layoutScene);
}
$("#mode-player").addEventListener("click", () => setMode(false));
$("#mode-gm").addEventListener("click", () => setMode(true));

/* ------------------------------------------------------------------ *
 * Klaxon — a whole-frame state, not a widget. A real alarm changes the
 * room, so the frame changes: the strip pulses, the scene goes red, the
 * marquee leads with it.
 * ------------------------------------------------------------------ */
$("#klaxon").addEventListener("click", () => {
  const on = consoleEl.classList.toggle("bi-console--alert");
  $("#lamp-alert").classList.toggle("bi-lamp--lit", on);
  $("#lamp-alert").classList.toggle("bi-lamp--pulse", on);
  $("#alert-plate").hidden = !on;
  if (on) {
    notify("alert", "Contact — all pilots to stations", { jp: "接触 発生 — 全機 発進", sticky: true });
    state.prob = 1;
  } else {
    if (bannerEl && notices.current && notices.current.sticky) endDwell();
    state.prob = 0.18;
  }
  paintProb();
});

function paintProb() {
  $("#prob-meter").style.setProperty("--v", String(state.prob));
  $("#prob-out").textContent = Math.round(state.prob * 100) + "%";
}

/* ------------------------------------------------------------------ *
 * Bleed — the pilot's own interface degrades as it climbs.
 * ------------------------------------------------------------------ */
const bleed = $("#bleed");
const identBleedOut = $("#ident-bleed-out");
const identBleedMeter = $("#ident-bleed-meter");
bleed.addEventListener("input", () => {
  const v = Number(bleed.value) / 100;
  const pct = String(bleed.value).padStart(2, "0") + "%";
  $("#bleed-out").textContent = pct;
  // The pilot ID panel is the pilot's own instrument, so it degrades with
  // everything else on the chassis — the same corruption, the same value,
  // never a second copy of the effect.
  identBleedOut.textContent = pct;
  identBleedMeter.style.setProperty("--v", String(v));
  for (const el of $$(".bi-dome__glass, .bi-subdome__glass, .bi-screen, .bi-marquee__glass, .bi-ident__glass")) {
    el.classList.toggle("bi-corrupt", v > 0.02);
    el.style.setProperty("--bi-bleed", String(v));
  }
});

/* ------------------------------------------------------------------ *
 * Idle life. A console that never moves reads as a screenshot; one that
 * moves constantly is exhausting. These tick slowly on purpose.
 * ------------------------------------------------------------------ */
let minutes = 16 * 60 + 42;
setInterval(() => {
  minutes = (minutes + 1) % (24 * 60);
  $("#clock-out").textContent =
    String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
}, 4000);

// Contact probability creeps up across the day — the Contact Pool's
// front-loaded-quiet / back-loaded-certain curve, made visible.
setInterval(() => {
  if (consoleEl.classList.contains("bi-console--alert")) return;
  state.prob = clamp(state.prob + 0.005, 0, 0.97);
  paintProb();
}, 6000);

// Resonance drifts. It is not a number the pilot controls, and the dial
// should not behave as though it is.
setInterval(() => {
  state.res = clamp(state.res + (Math.random() - 0.48) * 0.3, 0, 10);
  paintInstruments();
}, 3200);

/* ------------------------------------------------------------------ *
 * The document chain (style-guide section below the console)
 * ------------------------------------------------------------------ */
const STAMPS = { 1: ["部外秘", "Internal"], 2: ["秘", "Confidential"], 3: ["機密", "Secret"] };
function showClearance(level) {
  const sample = window.BI_REDACTION_SAMPLE && window.BI_REDACTION_SAMPLE[level];
  const body = $("#doc-body");
  if (!sample || !body) return;
  body.innerHTML = sample.html;

  const [jp, en] = STAMPS[level];
  $(".bi-stamp__jp", $("#doc-stamp")).textContent = jp;
  $(".bi-stamp__en", $("#doc-stamp")).textContent = en;

  $("#clr-count").textContent = sample.redactionCount === 0
    ? "nothing withheld at this clearance"
    : `${sample.redactionCount} passage${sample.redactionCount === 1 ? "" : "s"} withheld`;

  for (const b of $$("[data-clr]")) {
    b.setAttribute("aria-pressed", String(Number(b.dataset.clr) === level));
  }
}
for (const b of $$("[data-clr]")) {
  b.addEventListener("click", () => showClearance(Number(b.dataset.clr)));
}
showClearance(1);

/* ------------------------------------------------------------------ *
 * ANY WIDTH, ANY HEIGHT — a real test, not a claim.
 *
 * .bi-console ships with no size assumption of its own; it fills whatever
 * box contains it. The 16:9 box is a demo convenience (the literal "compare
 * against a fake scene" request), so it lives ONLY here, never in the
 * shared component CSS. This toggle swaps that box for the actual browser
 * viewport, so resizing the real window is a genuine test of the console
 * at any width and height — not something asserted from a screenshot.
 * ------------------------------------------------------------------ */
const demoWrap = $("#demo-wrap");
const frameToggle = $("#frame-toggle");
const demoSize = $("#demo-size");

function measureToolbarHeight() {
  const h = Math.ceil($(".controls").getBoundingClientRect().height);
  document.documentElement.style.setProperty("--demo-toolbar-h", h + "px");
}

function paintDemoSize() {
  if (!demoSize) return;
  const c = consoleEl.getBoundingClientRect();
  const mode = demoWrap.classList.contains("demo-fill") ? "fill — your window" : "16:9 demo";
  demoSize.textContent =
    `viewport ${innerWidth}×${innerHeight}  ·  console ${Math.round(c.width)}×${Math.round(c.height)} (${mode})`;
}

function setFrameMode(fill) {
  demoWrap.classList.toggle("demo-fill", fill);
  demoWrap.classList.toggle("demo-frame", !fill);
  document.body.classList.toggle("demo-fullscreen", fill);
  frameToggle.setAttribute("aria-pressed", String(fill));
  frameToggle.textContent = fill ? "Frame: fill window" : "Frame: 16⁠:⁠9";
  measureToolbarHeight();
  // Two rAFs: one for the class/layout change to land, one for the browser
  // to have actually reflowed before we read sizes back out of it.
  requestAnimationFrame(() => requestAnimationFrame(() => { paintDemoSize(); layoutScene(); }));
}

frameToggle?.addEventListener("click", () => setFrameMode(!demoWrap.classList.contains("demo-fill")));

addEventListener("resize", () => {
  measureToolbarHeight();
  paintDemoSize();
});

measureToolbarHeight();
paintDemoSize();

/* ------------------------------------------------------------------ *
 * UI SCALE — the whole console as one unit (see .bi-console's zoom).
 * The scene under it does not scale; only the instrument does.
 * ------------------------------------------------------------------ */
const uiScale = $("#ui-scale");
function setUiScale(pct) {
  const s = (pct / 100).toFixed(2);
  consoleEl.style.setProperty("--bi-ui-scale", s);
  $("#ui-scale-out").textContent = s;
  requestAnimationFrame(() => requestAnimationFrame(() => { paintDemoSize(); layoutScene(); }));
}
uiScale?.addEventListener("input", () => setUiScale(Number(uiScale.value)));

/* ------------------------------------------------------------------ *
 * LAYOUT DIAGNOSTICS — a live overflow detector for the test bed.
 *
 * Every layout bug the user has reported so far was of one kind: something
 * slid under something else and no one noticed until a screenshot. The
 * shedding ladder in bi-components.css is a set of MEASURED numbers, and
 * measured numbers go stale silently. So the prototype now measures itself
 * on every layout change and says so in the toolbar: each side cluster's
 * visible extent against its own track, each subdome against its
 * neighbouring pod, and every marker CARD against the visible band (between
 * the top rail and the chassis), the frame edges, the rails, the banner
 * lane and every other card. Red means "fix the CSS", not "resize the
 * window". Also console.warn()ed, for devtools.
 * ------------------------------------------------------------------ */
function runDiagnostics() {
  const out = $("#demo-diag");
  if (!out) return;
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => el && !el.hidden && getComputedStyle(el).display !== "none";
  const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const problems = [];

  const bar = $("#bar");
  for (const side of ["left", "right"]) {
    const group = $(`.bi-bar__group--${side}`, bar);
    const pods = $$(":scope > .bi-pod", group).filter(visible);
    if (!pods.length) continue;
    const l = Math.min(...pods.map((p) => rect(p).left));
    const r = Math.max(...pods.map((p) => rect(p).right));
    const over = Math.round((r - l) - rect(group).width);
    if (over > 0) problems.push(`${side} cluster +${over}px over its track`);
    const sub = $(`.bi-subdome--${side}`, bar);
    const gap = side === "left" ? rect(sub).left - r : l - rect(sub).right;
    if (gap < 0) problems.push(`${side} subdome overlapped by ${Math.round(-gap)}px`);
  }

  const c = rect(consoleEl);
  const top = rect($(".bi-console__top", consoleEl));
  const chassis = rect($(".bi-console__bar", consoleEl));
  const rails = $$(".bi-console__left, .bi-console__right", consoleEl).map(rect);
  const lane = $("#banner-lane") ? rect($("#banner-lane")) : null;
  const cards = $$(".bi-marker", consoleEl).filter(visible).map((m) => ({ id: m.dataset.marker, r: rect($(".bi-marker__card", m)) }));
  for (const { id, r } of cards) {
    if (r.top < top.bottom) problems.push(`marker ${id} under top rail`);
    if (r.bottom > chassis.top + 0.5) problems.push(`marker ${id} under chassis`);
    if (r.left < c.left || r.right > c.right) problems.push(`marker ${id} off the frame`);
    if (rails.some((rail) => hits(r, rail))) problems.push(`marker ${id} under a rail`);
    if (lane && hits(r, lane)) problems.push(`marker ${id} under the banner lane`);
  }
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (hits(cards[i].r, cards[j].r)) problems.push(`markers ${cards[i].id}+${cards[j].id} overlap`);
    }
  }

  const bad = problems.length > 0;
  out.classList.toggle("is-bad", bad);
  out.textContent = bad ? `LAYOUT: ${problems.join(" · ")}` : "LAYOUT: clean";
  if (bad) console.warn("[bi-console diagnostics]", problems);
  return problems;
}
window.biDiagnostics = runDiagnostics;   // reachable from devtools / automation
window.biLayout = layoutScene;

new ResizeObserver(() => requestAnimationFrame(layoutScene)).observe(consoleEl);
document.fonts?.ready.then(layoutScene);
layoutScene();
