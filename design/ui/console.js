/* Blank Inheritance — console prototype behaviour.
 *
 * Prototype-only. None of this is the module's real data layer; it exists so
 * the visual identity can be judged in motion rather than as a still, and so
 * the interactions the design promises can actually be tried. Anything here
 * that survives review moves into scripts/core/ as a pure function with tests.
 *
 * The content, though, is real: the ground roles are the five in
 * data/campaign/ground-roles.json, and the map pins are the locations
 * campaign-arc.md describes on the reference art this scene is cropped from.
 */
"use strict";

/* ------------------------------------------------------------------ *
 * Data — real campaign content, prototype-only shape.
 * ------------------------------------------------------------------ */

// data/campaign/ground-roles.json, in its stated order.
const ROLES = [
  { id: "sensor-operator",     name: "Sensor Op",   jp: "探知",  who: "—", lamp: "cyan" },
  { id: "umbilical-control",   name: "Umbilical",   jp: "臍帯",  who: "—", lamp: "amber" },
  { id: "evacuation-marshal",  name: "Evac Marshal", jp: "避難", who: "—", lamp: "" },
  { id: "structural-command",  name: "Structural",  jp: "構造",  who: "—", lamp: "red" },
  { id: "signals-liaison",     name: "Signals",     jp: "通信",  who: "—", lamp: "resonance" }
];

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

const PINS = {
  fort:     { label: "Directorate HQ",   jp: "統制局 本部",   note: "Sea fort, mid-channel. Causeway is the only approach." },
  causeway: { label: "Causeway Check",   jp: "堤道 検問所",   note: "Standing Order 14: no Frame passes under its own power." },
  contact:  { label: "Contact",          jp: "接触 発生",     note: "Claimant, old town. Civilian density high." },
  shelter:  { label: "Shelter 4",        jp: "第四避難所",    note: "1,240 of 2,000 clear. Evacuation Marshal has the track." },
  pier:     { label: "Pier 3 — Sortie",  jp: "第三埠頭 発進", note: "Launch cradle. Umbilical still engaged." },
  mast:     { label: "Sensor Mast",      jp: "探知塔",        note: "Sensor Operator station. Recall Knowledge from here." }
};

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

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Map a 0..1 value onto the analog dials' -130°..+130° sweep. */
const needleAngle = (v) => (clamp(v, 0, 1) * 260 - 130).toFixed(1) + "deg";

/* ------------------------------------------------------------------ *
 * Render: rails
 * ------------------------------------------------------------------ */
$("#roles").innerHTML = ROLES.map((r, i) => `
  <button class="bi-role" data-role="${r.id}" aria-pressed="${i === 0}">
    <span class="bi-lamp ${r.lamp ? "bi-lamp--" + r.lamp : ""} ${i === 0 ? "bi-lamp--lit" : ""}"></span>
    <span class="bi-role__text">
      <span class="bi-role__name">${r.name}</span>
      <span class="bi-role__jp">${r.jp}</span>
    </span>
    <span class="bi-role__who">${r.who}</span>
  </button>`).join("");

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
const state = { res: 6.2, hp: 148, hpMax: 210, locked: false, target: UNITS[0], round: 3, prob: 0.18 };

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

/* ------------------------------------------------------------------ *
 * Map pins — clicking one targets it and writes it into the marquee.
 * ------------------------------------------------------------------ */
for (const pin of $$(".bi-pin")) {
  pin.addEventListener("click", () => {
    const info = PINS[pin.dataset.pin];
    if (!info) return;
    for (const p of $$(".bi-pin")) p.style.filter = "";
    pin.style.filter = "drop-shadow(0 0 10px currentColor)";
    announce(`${info.jp} — ${info.label.toUpperCase()}: ${info.note.toUpperCase()}`,
             pin.classList.contains("bi-pin--danger") ? "alert" : "");
    if (pin.dataset.pin === "contact") setLock(true, UNITS[0]);
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
  announce(`RECALL KNOWLEDGE — ${next.text.toUpperCase()}`, "warn");
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
  gmPod.hidden = !gm;
  // The Direction module needs ~150px the chassis does not have spare. A GM is
  // not flying a Frame, so the pilot ident plate is what pays for it — trading
  // one module for another rather than letting them crowd each other.
  if (identPod) identPod.style.display = gm ? "none" : "";
  $("#mode-gm").setAttribute("aria-pressed", String(gm));
  $("#mode-player").setAttribute("aria-pressed", String(!gm));
  requestAnimationFrame(runDiagnostics);
}
$("#mode-player").addEventListener("click", () => setMode(false));
$("#mode-gm").addEventListener("click", () => setMode(true));

/* ------------------------------------------------------------------ *
 * Klaxon — a whole-frame state, not a widget. A real alarm changes the
 * room, so the frame changes: the strip pulses, the scene goes red, the
 * marquee leads with it.
 * ------------------------------------------------------------------ */
const consoleEl = $("#console");
$("#klaxon").addEventListener("click", () => {
  const on = consoleEl.classList.toggle("bi-console--alert");
  $("#lamp-alert").classList.toggle("bi-lamp--lit", on);
  $("#lamp-alert").classList.toggle("bi-lamp--pulse", on);
  $("#alert-plate").hidden = !on;
  if (on) {
    announce("接触 発生 — ALL PILOTS TO STATIONS — 全機 発進", "alert");
    state.prob = 1;
  } else {
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
bleed.addEventListener("input", () => {
  const v = Number(bleed.value) / 100;
  $("#bleed-out").textContent = String(bleed.value).padStart(2, "0") + "%";
  for (const el of $$(".bi-dome__glass, .bi-subdome__glass, .bi-screen, .bi-marquee__glass")) {
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
  const c = document.getElementById("console").getBoundingClientRect();
  const mode = demoWrap.classList.contains("demo-fill") ? "fill — your window" : "16:9 demo";
  demoSize.textContent =
    `viewport ${innerWidth}\u00d7${innerHeight}  \u00b7  console ${Math.round(c.width)}\u00d7${Math.round(c.height)} (${mode})`;
}

function setFrameMode(fill) {
  demoWrap.classList.toggle("demo-fill", fill);
  demoWrap.classList.toggle("demo-frame", !fill);
  document.body.classList.toggle("demo-fullscreen", fill);
  frameToggle.setAttribute("aria-pressed", String(fill));
  frameToggle.textContent = fill ? "Frame: fill window" : "Frame: 16\u2060:\u20609";
  measureToolbarHeight();
  // Two rAFs: one for the class/layout change to land, one for the browser
  // to have actually reflowed before we read sizes back out of it.
  requestAnimationFrame(() => requestAnimationFrame(paintDemoSize));
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
  requestAnimationFrame(() => requestAnimationFrame(() => { paintDemoSize(); runDiagnostics(); }));
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
 * neighbouring pod, and every map marker against the visible band (between
 * the top rail and the chassis) and the frame edges. Red means "fix the
 * CSS", not "resize the window". Also console.warn()ed, for devtools.
 * ------------------------------------------------------------------ */
function runDiagnostics() {
  const out = $("#demo-diag");
  if (!out) return;
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => el && !el.hidden && getComputedStyle(el).display !== "none";
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
  for (const m of $$(".bi-marker, .bi-pin", consoleEl)) {
    if (!visible(m)) continue;
    const r = rect(m);
    const id = m.dataset.marker || m.dataset.pin || "?";
    if (r.top < top.bottom) problems.push(`marker ${id} under top rail`);
    if (r.bottom > chassis.top) problems.push(`marker ${id} under chassis`);
    if (r.left < c.left || r.right > c.right) problems.push(`marker ${id} off the frame`);
  }

  const bad = problems.length > 0;
  out.classList.toggle("is-bad", bad);
  out.textContent = bad ? `LAYOUT: ${problems.join(" · ")}` : "LAYOUT: clean";
  if (bad) console.warn("[bi-console diagnostics]", problems);
  return problems;
}
window.biDiagnostics = runDiagnostics;   // reachable from devtools / automation

new ResizeObserver(() => requestAnimationFrame(runDiagnostics)).observe(consoleEl);
document.fonts?.ready.then(runDiagnostics);
runDiagnostics();
