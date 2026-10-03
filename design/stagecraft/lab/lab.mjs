/**
 * Stagecraft lab: renders the plates for design/stagecraft/stage.md.
 *
 * NOT the module. A sketchbook that draws the real .bi-frame (module CSS,
 * module portraits) plus the proposed parts, so the plan can be judged on
 * screenshots. The pure halves (flourish.mjs, blocking.mjs, blueprint.mjs)
 * are written to move into scripts/core/ when the work is approved.
 *
 *   ?plate=debut|variety|ensemble|minis|conversation|gangup|arrange|zones|plan
 *   &t=<ms>     freeze every animation at that moment (screenshots)
 *   &seed=<n>   a different performance
 *   &shot       hide the live controls
 */

import { composeDebut, scheduleEnsemble, hashString, familyFor, dice } from "./flourish.mjs";
import { stageGeometry, formation, settle, nearestSlot, dropInto, npcHeight } from "./blocking.mjs";
import { blueprintSVG } from "./blueprint.mjs";
import { FEEL, createPuppet, stepPuppet, perform, verbPose, box, collide, shouldSend, GripBuffer, arbitrate } from "./puppets.mjs";

export const ROOT = "../../../";
export const STAGE_ART = `${ROOT}module/blank-inheritance/assets/stage/`;
export const SCENE_ART = `${ROOT}module/blank-inheritance/assets/scenes/`;
export const PLACE_ART = `${ROOT}artwork/locations/`;
export const ENEMY_ART = `${ROOT}artwork/in-tray/enemies/`;

export const params = new URLSearchParams(location.search);
const PLATE = params.get("plate") ?? "debut";
export const FREEZE = params.has("t") ? Number(params.get("t")) : null;
export const SEED = Number(params.get("seed") ?? 7);
if (params.has("shot")) document.body.classList.add("is-shot");

/* ------------------------------------------------------------------ */
/*  People (portraits are the module's; lines are illustrative)         */
/* ------------------------------------------------------------------ */

export const NPC = {
  kazue: { name: "Kazue Tsurumi", line: "Bath attendant", kicker: "The Bathhouse" },
  hachi: { name: "Hachirō Mase", line: "Retired Frame fitter", kicker: "The Bathhouse" },
  sigrun: { name: "Sigrun Halvard", line: "Crane driver", kicker: "The Bathhouse" },
  kiku: { name: "Kiku Enomoto", line: "Keeper of the Paper Lantern", kicker: "The Paper Lantern" },
  sanzo: { name: "Sanzo", line: "Musician", kicker: "The Paper Lantern" },
  tama: { name: "Tama", line: "Waitress", kicker: "The Paper Lantern" },
  tomoe: { name: "Tomoe Hashida", line: "Chief, Refit Crew Three", kicker: "The Crew Mess" },
  petr: { name: "Petr Vasko", line: "Welder", kicker: "The Crew Mess" },
  ren: { name: "Ren Saeki", line: "Apprentice fitter", kicker: "The Crew Mess" },
  michiru: { name: "Michiru Arai", line: "Dealer", kicker: "The Card Game" },
  lucan: { name: "Lucan Farrow", line: "Card player", kicker: "The Card Game" },
  chiyo: { name: "Chiyo Nakamura", line: "Card player", kicker: "The Card Game" },
  tsubaki: { name: "Nurse Haruko Tsubaki", line: "Night sister, Ward Four", kicker: "General Hospital" },
  imai: { name: "Mrs Setsuko Imai", line: "Patient", kicker: "Ward Four" },
  aucourt: { name: "Mr Basile Aucourt", line: "Patient", kicker: "Ward Four" },
  gennai: { name: "The night porter", line: "", kicker: "General Hospital", called: true },
  kuroki: { name: "The soldier in bed eight", line: "", kicker: "Ward Four", called: true },
  mori: { name: "The cleaner", line: "", kicker: "General Hospital", called: true },
  "section-officer": { name: "The Section Officer", line: "Your section's officer", kicker: "Directorate", faction: "directorate" },
  genzo: { name: "Genzō Amemiya", line: "Night observer", kicker: "The Met Office" },
  tokuji: { name: "Tokuji Tsuruta", line: "Keeper of the shrine", kicker: "The Shrine Gate" },
  centipede: { name: "Giant centipede", line: "", kicker: "", src: `${ENEMY_ART}giant_centipede.png`, situation: "hostile" },
  taka: { name: "Taka", line: "Older student", kicker: "The Canteen" },
  "the-young-one": { name: "Pilot-track student", line: "", kicker: "The Canteen" },
  "technical-track-student": { name: "Technical student", line: "", kicker: "The Canteen" },
  hana: { name: "Hana Kurogane", line: "Second-termer", kicker: "The Rumour Mill" },
  obi: { name: "Obiajulu Eze", line: "Second-termer", kicker: "The Rumour Mill" },
  "mrs-ueda": { name: "Mrs. Ueda", line: "Night warden", kicker: "The Rumour Mill" }
};
for (const [id, p] of Object.entries(NPC)) { p.id = id; p.src ??= `${STAGE_ART}${id}.webp`; p.kind = "npc"; }

/** The six TEST-ONLY characters (data/characters/kids/), standing in for the real party. */
export const PCS = [
  { id: "etsuko", name: "Etsuko", img: "kimura-etsuko", who: "#5fb3d9", hp: 0.92 },
  { id: "masaru", name: "Masaru", img: "kaneda-masaru", who: "#e06a5a", hp: 0.64 },
  { id: "nren", name: "Ren", img: "nakamura-ren", who: "#86c76a", hp: 1 },
  { id: "hiroshi", name: "Hiroshi", img: "sato-hiroshi", who: "#e3c45a", hp: 0.38 },
  { id: "yumiko", name: "Yumiko", img: "watanabe-yumiko", who: "#c99be0", hp: 0.81 },
  { id: "susumu", name: "Susumu", img: "ishikawa-susumu", who: "#5fd0c0", hp: 1 }
].map((p) => ({ ...p, kind: "pc", src: `${STAGE_ART}${p.img}.webp` }));
export const pc = (id) => PCS.find((p) => p.id === id);

/* ------------------------------------------------------------------ */
/*  DOM helpers                                                         */
/* ------------------------------------------------------------------ */

export const el = (tag, cls = "", html = null) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== null) node.innerHTML = html;
  return node;
};
// A fixed-size screen: headless Chrome changes the viewport height between
// layout and capture, which would split top- and bottom-anchored positions.
export const VW = Number(params.get("w")) || window.innerWidth;
export const VH = Number(params.get("h")) || window.innerHeight;
export const W = () => VW;
export const H = () => VH;
export const EASE = {
  servo: "cubic-bezier(0.22, 0.85, 0.28, 1)",
  back: "cubic-bezier(0.34, 1.45, 0.64, 1)",
  spring: "cubic-bezier(0.2, 0.9, 0.3, 1.18)",
  slam: "cubic-bezier(0.55, 0, 0.9, 0.45)",
  out: "cubic-bezier(0.2, 0.7, 0.3, 1)",
  in: "cubic-bezier(0.6, 0, 0.8, 0.4)"
};
export const anim = (node, frames, { delay = 0, duration = 300, easing = "linear", fill = "both" } = {}) =>
  node.animate(frames, { delay: Math.max(0, delay), duration: Math.max(1, duration), easing, fill });

/** A damped oscillation, sampled: the one curve behind every wiggle and swing. */
export function damped(amplitude, { cycles = 2.5, decay = 4, samples = 12, rest = 0 } = {}) {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const u = i / samples;
    return { offset: u, value: rest + amplitude * Math.exp(-decay * u) * Math.cos(cycles * 2 * Math.PI * u) * (u === 1 ? 0 : 1) };
  });
}

export function screen(bg, { plain = false, dim = 1 } = {}) {
  const root = el("div", "lab-screen");
  root.style.width = `${VW}px`;
  root.style.height = `${VH}px`;
  const back = el("div", `lab-bg${plain ? " lab-plain" : ""}`);
  if (bg) back.style.backgroundImage = `url("${bg}")`;
  if (dim !== 1) back.style.filter = `saturate(0.9) brightness(${0.86 * dim})`;
  root.append(back);
  document.body.append(root);
  return root;
}
export function title(root, num, name, sub = null) {
  root.append(el("div", "lab-title", `<span>Stagecraft lab · ${num}</span><b>${name}</b>`));
  if (sub) root.append(el("div", "lab-sub", sub));
}
export function deck(root) {
  root.append(el("div", "lab-deck", "<span>The deck</span>"));
}
export function note(root, n, text, x, y, { right = false } = {}) {
  const node = el("div", "lab-note", `<i>${n}</i><span>${text}</span>`);
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  if (right) { node.style.flexDirection = "row-reverse"; node.style.textAlign = "right"; }
  root.append(node);
  return node;
}

/* ------------------------------------------------------------------ */
/*  Frames                                                              */
/* ------------------------------------------------------------------ */

const KEY = {
  reveal: ["&#9673;", "Conceal"], check: ["&#9636;", "Ask for a check"], splash: ["&#10022;", "Splash"], card: ["&#9635;", "Character Card"],
  hand: ['<i class="fa-solid fa-hand"></i>', "Raise your hand"],
  activity: ['<i class="fa-solid fa-compass"></i>', "What I'm doing"],
  notes: ['<i class="fa-solid fa-pen-nib"></i>', "Notes"],
  follow: ['<i class="fa-solid fa-shoe-prints"></i>', "Follow them"],
  hero: ['<i class="fa-solid fa-star"></i>', "Hero Point"],
  roll: ['<i class="fa-solid fa-dice-d20"></i>', "Ask them to roll"],
  floor: ['<i class="fa-solid fa-microphone-lines"></i>', "Give them the floor"]
};
export function keyButton(kind, extra = "") {
  const [glyph, label] = KEY[kind];
  const b = el("button", `bi-frame__key ${extra}`, glyph);
  b.type = "button";
  b.title = label;
  return b;
}

export function npcFrame(p, { w, seat = "player", label = null } = {}) {
  const fig = el("figure", "bi-frame");
  fig.style.setProperty("--bi-frame-width", `${w}px`);
  const scope = el("button", "bi-frame__scope");
  scope.type = "button";
  const art = el("span", "bi-frame__art");
  const img = new Image();
  img.alt = "";
  img.src = p.src;
  art.append(img);
  scope.append(art, el("span", "bi-frame__lamp"), el("span", "bi-frame__plate", label ?? p.name));
  const keys = el("div", "bi-frame__keys");
  const set = seat === "gm" ? ["reveal", "check", "splash", "card"] : ["card"];
  for (const k of set) keys.append(keyButton(k));
  fig.append(scope, keys);
  return fig;
}

/**
 * The PC mini frame: the same moulding, half as tall, the face only.
 * `seat` is who is LOOKING; `own` is whether it is the looker's character.
 */
export function miniFrame(p, { w, seat = "player", own = false, hand = null, activity = null, heroes = null, where = null, showHp = false } = {}) {
  const fig = el("figure", `bi-frame bi-frame--mini${own ? " is-own" : ""}`);
  fig.style.setProperty("--bi-frame-width", `${w}px`);
  fig.style.setProperty("--who", p.who);
  const scope = el("button", "bi-frame__scope");
  scope.type = "button";
  const art = el("span", "bi-frame__art");
  const img = new Image();
  img.alt = "";
  img.src = p.src;
  art.append(img);
  scope.append(art, el("span", "bi-frame__lamp"), el("span", "bi-mini__who"));
  if (showHp) {
    const hp = el("span", `bi-mini__hp${p.hp < 0.5 ? " is-low" : ""}`, `<i style="width:${Math.round(p.hp * 100)}%"></i>`);
    scope.append(hp);
  }
  if (activity) scope.append(el("span", "bi-mini__badge bi-mini__activity", activity));
  if (where) scope.append(el("span", "bi-mini__badge bi-mini__where", where));
  if (heroes !== null) scope.append(el("span", "bi-mini__heroes", [0, 1, 2].map((i) => `<i class="${i < heroes ? "is-on" : ""}"></i>`).join("")));
  scope.append(el("span", "bi-frame__plate", p.name));
  const keys = el("div", "bi-frame__keys");
  const set = seat === "gm" ? ["hero", "roll", "floor"] : own ? ["hand", "activity", "notes"] : ["follow", "notes"];
  for (const k of set) keys.append(keyButton(k, seat === "gm" ? "is-gm" : own ? "is-mine" : ""));
  fig.append(scope, keys);
  if (hand) fig.append(el("span", "bi-mini__badge bi-mini__hand", `<i class="fa-solid fa-hand"></i> ${hand}`));
  return fig;
}

/** A PC at full height (the puppet version): the person's frame, the player's colour, PC keys. */
export function pcFrame(p, { w, seat = "player", own = false } = {}) {
  const fig = el("figure", "bi-frame");
  fig.style.setProperty("--bi-frame-width", `${w}px`);
  fig.style.setProperty("--who", p.who);
  if (own) fig.style.boxShadow = `var(--bi-bevel-up), 0 0 0 2px ${p.who}, 0 2px 5px rgb(0 0 0 / 45%)`;
  const scope = el("button", "bi-frame__scope");
  scope.type = "button";
  const art = el("span", "bi-frame__art");
  const img = new Image();
  img.alt = "";
  img.src = p.src;
  art.append(img);
  scope.append(art, el("span", "bi-frame__lamp"), el("span", "bi-mini__who"), el("span", "bi-frame__plate", p.name));
  const keys = el("div", "bi-frame__keys");
  const set = seat === "gm" ? ["hero", "roll", "floor"] : own ? ["hand", "activity", "notes"] : ["follow", "notes"];
  for (const k of set) keys.append(keyButton(k, seat === "gm" ? "is-gm" : own ? "is-mine" : ""));
  fig.append(scope, keys);
  return fig;
}

/** Stand a frame on the stage at a layout position. */
export function place(stage, fig, pos, w) {
  const wrap = el("div", "lab-place");
  wrap.style.left = `${Math.round(pos.x - w / 2)}px`;
  wrap.style.bottom = `${Math.round(H() - pos.bottom)}px`;
  wrap.style.zIndex = String(pos.z ?? 10);
  const t = [];
  if (pos.scale && pos.scale !== 1) t.push(`scale(${pos.scale})`);
  if (pos.rot) t.push(`rotate(${pos.rot}deg)`);
  if (pos.rotY) t.push(`rotateY(${pos.rotY}deg)`);
  if (t.length) wrap.style.transform = t.join(" ");
  if (pos.dim) wrap.classList.add("is-dim");
  if (pos.speaking) {
    wrap.classList.add("is-speaking");
    wrap.append(el("div", "bi-speaking", "<i></i><i></i><i></i>"));
  }
  if (pos.spotlit) wrap.classList.add("is-spotlit");
  wrap.append(fig);
  stage.append(wrap);
  return wrap;
}

/* ------------------------------------------------------------------ */
/*  The debut, played from a recipe                                     */
/* ------------------------------------------------------------------ */

const T = (x, y, r, s, sy = 1) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)}) scaleY(${sy.toFixed(3)})`;

function entryFrames(e) {
  const f = e.from;
  const o = e.overshoot ?? 0.04;
  if (e.kind === "fade") return [{ opacity: 0 }, { opacity: 1 }];
  if (e.kind === "slam") {
    const k = e.shake;
    return [
      { opacity: 0, transform: T(f.x, f.y, f.rot, f.scale) },
      { opacity: 1, transform: T(0, 0, 0, 1, 0.93), offset: 0.5 },
      { opacity: 1, transform: T(-k * 0.7, -3, -0.8, 1, 1.03), offset: 0.64 },
      { opacity: 1, transform: T(k * 0.45, 0, 0.5, 1, 1), offset: 0.78 },
      { opacity: 1, transform: T(-k * 0.18, 0, -0.15, 1, 1), offset: 0.9 },
      { opacity: 1, transform: T(0, 0, 0, 1) }
    ];
  }
  if (e.kind === "unfold") {
    return [
      { opacity: 0, transform: T(0, 0, 0, 1, 0.02) },
      { opacity: 1, transform: T(0, 0, 0, 1, 1 + o), offset: 0.66 },
      { opacity: 1, transform: T(0, 0, 0, 1, 1 - o * 0.45), offset: 0.84 },
      { opacity: 1, transform: T(0, 0, 0, 1) }
    ];
  }
  const sy = f.scaleY ?? 1;
  return [
    { opacity: 0, transform: T(f.x, f.y, f.rot, f.scale, sy) },
    { opacity: 1, transform: T(f.x * 0.3, f.y * 0.3, f.rot * 0.35, (f.scale + 1) / 2), offset: 0.34 },
    { opacity: 1, transform: T(-f.x * o, -f.y * o, -f.rot * o * 3, 1 + o * 0.22), offset: 0.68 },
    { opacity: 1, transform: T(f.x * o * 0.3, f.y * o * 0.3, f.rot * o, 1), offset: 0.86 },
    { opacity: 1, transform: T(0, 0, 0, 1) }
  ];
}

function playReveal(art, img, r, seed) {
  const d = dice(seed ^ 0x9e3779b9);
  switch (r.kind) {
    case "wipe": {
      const rad = (r.angle * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);
      const m = Math.max(Math.abs(dx), Math.abs(dy));
      const nx = dx / m;
      const ny = dy / m;
      img.style.maskImage = `linear-gradient(${r.angle.toFixed(1)}deg, #000 42%, transparent ${(42 + r.softness).toFixed(1)}%)`;
      img.style.maskSize = "320% 320%";
      img.style.maskRepeat = "no-repeat";
      anim(img, [{ maskPosition: `${50 + 50 * nx}% ${50 + 50 * ny}%` }, { maskPosition: `${50 - 50 * nx}% ${50 - 50 * ny}%` }],
        { delay: r.delay, duration: r.dur, easing: EASE.out });
      break;
    }
    case "blinds": {
      const n = r.slats;
      const order = Array.from({ length: n }, (_, i) => i);
      const rank = r.order === "reverse" ? order.map((i) => n - 1 - i)
        : r.order === "centre" ? order.map((i) => Math.abs(i - (n - 1) / 2))
        : r.order === "scatter" ? order.map(() => d.range(0, n - 1))
        : order;
      const each = Math.max(180, r.dur - (n - 1) * r.stagger * 0.6);
      for (let i = 0; i < n; i++) {
        const slat = el("span", "bi-debut-slat");
        if (r.axis === "h") Object.assign(slat.style, { left: "0", right: "0", top: `${(i * 100) / n}%`, height: `${100 / n + 0.6}%`, transformOrigin: "50% 0" });
        else Object.assign(slat.style, { top: "0", bottom: "0", left: `${(i * 100) / n}%`, width: `${100 / n + 0.6}%`, transformOrigin: "0 50%" });
        slat.style.zIndex = "5";
        art.append(slat);
        const prop = r.axis === "h" ? "scaleY" : "scaleX";
        anim(slat, [{ transform: `${prop}(1)` }, { transform: `${prop}(0)` }], { delay: r.delay + rank[i] * r.stagger, duration: each, easing: EASE.servo });
      }
      break;
    }
    case "iris":
      anim(img, [{ clipPath: `circle(0% at ${r.cx}% ${r.cy}%)` }, { clipPath: `circle(88% at ${r.cx}% ${r.cy}%)` }], { delay: r.delay, duration: r.dur, easing: EASE.servo });
      break;
    case "raster": {
      const fromTop = r.from === "top";
      anim(img, [{ clipPath: fromTop ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)" }, { clipPath: "inset(0 0 0% 0)" }],
        { delay: r.delay, duration: r.dur, easing: `steps(${r.steps}, end)` });
      const head = el("span", "bi-debut-head");
      art.append(head);
      anim(head, [{ top: fromTop ? "0%" : "100%", opacity: 1 }, { top: fromTop ? "100%" : "0%", opacity: 1 }], { delay: r.delay, duration: r.dur, easing: `steps(${r.steps}, end)` });
      anim(head, [{ opacity: 1 }, { opacity: 0 }], { delay: r.delay + r.dur, duration: 120, fill: "forwards" });
      anim(head, [{ opacity: 0 }, { opacity: 0 }], { delay: 0, duration: r.delay, fill: "backwards" });
      break;
    }
    case "develop": {
      const glass = el("span", "bi-debut-mask");
      glass.style.background = r.tint === "safelight" ? "rgb(150 24 10 / 62%)" : "rgb(120 92 40 / 48%)";
      glass.style.mixBlendMode = "multiply";
      art.append(glass);
      anim(img, [
        { opacity: 0, filter: "brightness(3.2) contrast(0.25) sepia(0.7) saturate(0.82)" },
        { opacity: 1, filter: "brightness(1.7) contrast(0.6) sepia(0.45) saturate(0.82)", offset: 0.45 },
        { opacity: 1, filter: "brightness(0.82) contrast(1) sepia(0) saturate(0.82)" }
      ], { delay: r.delay, duration: r.dur, easing: EASE.out });
      anim(glass, [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { delay: r.delay, duration: r.dur + 200, easing: "linear" });
      break;
    }
    case "shutter": {
      const a = el("span", "bi-debut-mask bi-debut-mask--solid");
      const b = el("span", "bi-debut-mask bi-debut-mask--solid");
      if (r.axis === "h") { a.style.bottom = "50%"; b.style.top = "50%"; } else { a.style.right = "50%"; b.style.left = "50%"; }
      a.style.boxShadow = b.style.boxShadow = "0 0 0 1px rgb(230 201 141 / 30%)";
      art.append(a, b);
      const out = r.axis === "h" ? ["translateY(0)", "translateY(-102%)", "translateY(102%)"] : ["translateX(0)", "translateX(-102%)", "translateX(102%)"];
      anim(a, [{ transform: out[0] }, { transform: out[1] }], { delay: r.delay, duration: r.dur, easing: EASE.servo });
      anim(b, [{ transform: out[0] }, { transform: out[2] }], { delay: r.delay, duration: r.dur, easing: EASE.servo });
      break;
    }
    default:
      break;
  }
}

function playStamp(plate, s) {
  switch (s.kind) {
    case "thump":
      anim(plate, [{ opacity: 0, transform: "scale(1.5)", filter: "brightness(1.9)" }, { opacity: 1, transform: "scale(0.95)", filter: "brightness(1.2)", offset: 0.6 }, { opacity: 1, transform: "scale(1)", filter: "brightness(1)" }],
        { delay: s.delay, duration: s.dur, easing: EASE.servo });
      break;
    case "slap":
      anim(plate, [{ opacity: 0, transform: `translateY(-12px) rotate(${(s.tilt * 1.8).toFixed(1)}deg) scale(1.18)` }, { opacity: 1, transform: `translateY(1px) rotate(${(-s.tilt * 0.25).toFixed(1)}deg) scale(0.98)`, offset: 0.55 }, { opacity: 1, transform: "none" }],
        { delay: s.delay, duration: s.dur, easing: EASE.servo });
      break;
    case "type": {
      const n = Math.max(6, plate.textContent.length);
      anim(plate, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }], { delay: s.delay, duration: n * 38, easing: `steps(${n}, end)` });
      break;
    }
    case "press":
      anim(plate, [{ opacity: 0, transform: "translateY(6px)", boxShadow: "0 0 0 0 rgb(232 134 58 / 0)" }, { opacity: 1, transform: "translateY(0)", boxShadow: "0 0 18px 4px rgb(232 134 58 / 55%)", offset: 0.5 }, { opacity: 1, transform: "translateY(0)", boxShadow: "0 0 0 0 rgb(232 134 58 / 0)" }],
        { delay: s.delay, duration: s.dur, easing: EASE.out });
      break;
    default:
      break;
  }
}

function playLamp(lamp, l) {
  if (!l) return;
  const total = l.steps.reduce((sum, s) => sum + s.ms, 0) || 1;
  let at = 0;
  const frames = [{ offset: 0, opacity: 0.12, easing: "step-end" }];
  for (const s of l.steps) {
    frames.push({ offset: Math.min(1, at / total), opacity: s.on ? 1 : 0.12, easing: "step-end" });
    at += s.ms;
  }
  frames.push({ offset: 1, opacity: 1 });
  frames.sort((a, b) => a.offset - b.offset);
  anim(lamp, frames, { delay: l.delay, duration: total });
}

function cardFor(p, recipe, pos, w, h, stage, { offset = 0, accent = null, containerW = W() } = {}) {
  const c = recipe.card;
  const kind = c.kind;
  const card = el("div", `bi-debut-card bi-debut-card--${kind}${c.side === "left" ? " is-left" : ""}`);
  card.style.setProperty("--card-accent", accent ?? (p.faction === "directorate" || p.situation === "hostile" ? "var(--bi-vermilion)" : "var(--bi-life)"));
  const name = p.name;
  const kicker = p.kicker ?? "";
  const line = p.line ?? "";
  if (kind === "spine") card.innerHTML = `<span class="bi-debut-card__name">${name}</span>${line ? `<span class="bi-debut-card__line">${line}</span>` : ""}`;
  else if (kind === "stamp") card.innerHTML = `<span class="bi-debut-stampface" style="--stamp-tilt:${(c.tilt - 4).toFixed(1)}deg">${kicker ? `<span class="bi-debut-card__kicker">${kicker}</span>` : ""}<span class="bi-debut-card__name">${name}</span></span>${line ? `<span class="bi-debut-card__line">${line}</span>` : ""}`;
  else card.innerHTML = `<span class="bi-debut-card__body">${kicker ? `<span class="bi-debut-card__kicker">${kicker}</span>` : ""}<span class="bi-debut-card__name">${name}</span>${line ? `<span class="bi-debut-card__line">${line}</span>` : ""}</span>`;

  const frameTop = pos.bottom - h * (pos.scale ?? 1);
  const gapX = kind === "spine" ? 10 : 22;
  const top = frameTop + h * (kind === "spine" ? 0.06 : kind === "tag" ? 0.2 : 0.16) + (kind === "spine" ? 0 : c.rise);
  if (c.side === "above") {
    // Above the row, centred on the frame: where a card goes when either side
    // would cover somebody else's face. `translate` is its own property, so
    // the entrance animation's `transform` never fights it.
    card.classList.add("is-above");
    card.style.left = `${Math.round(pos.x)}px`;
    card.style.top = `${Math.round(frameTop - 20)}px`;
    card.style.translate = "-50% -100%";
  } else {
    if (c.side === "right") card.style.left = `${Math.round(pos.x + (w / 2) * (pos.scale ?? 1) + gapX)}px`;
    else card.style.right = `${Math.round(containerW - (pos.x - (w / 2) * (pos.scale ?? 1) - gapX))}px`;
    card.style.top = `${Math.round(top)}px`;
  }
  stage.append(card);

  const dir = c.side === "right" ? 1 : c.side === "above" ? 0 : -1;
  const delay = c.delay + offset;
  if (kind === "ribbon") {
    const from = dir > 0 ? "inset(0 100% 0 0)" : dir < 0 ? "inset(0 0 0 100%)" : "inset(0 50% 0 50%)";
    anim(card, [{ opacity: 0, clipPath: from, transform: dir ? `translateX(${-dir * 28}px)` : "translateY(14px)" }, { opacity: 1, clipPath: "inset(-20px -20px -20px -20px)", transform: "none" }],
      { delay, duration: 460, easing: EASE.servo });
  } else if (kind === "spine") {
    anim(card, [{ opacity: 0, transform: `translateY(-46px) rotate(${dir * -7}deg)` }, { opacity: 1, transform: `translateY(5px) rotate(${dir * 1.2}deg)`, offset: 0.62 }, { opacity: 1, transform: "none" }],
      { delay, duration: 520, easing: EASE.servo });
  } else if (kind === "tag") {
    card.style.transformOrigin = dir > 0 ? "6% 50%" : "94% 50%";
    if (dir < 0) card.style.clipPath = "polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)";
    const swing = damped(dir * 34, { cycles: 2.2, decay: 4.2, samples: 14, rest: c.tilt });
    anim(card, swing.map((k) => ({ offset: k.offset, opacity: k.offset < 0.08 ? k.offset / 0.08 : 1, transform: `rotate(${k.value.toFixed(2)}deg)` })), { delay, duration: 1300, easing: "linear" });
    // The string, from the frame's corner to the tag's hole.
    const string = el("span", "bi-debut-string");
    const x0 = pos.x + dir * (w / 2) * (pos.scale ?? 1) - dir * 6;
    const y0 = frameTop + 14;
    string.style.left = `${x0}px`;
    string.style.top = `${y0}px`;
    const len = Math.hypot(gapX + 14, top - y0 + 22);
    const ang = (Math.atan2(top - y0 + 22, dir * (gapX + 14)) * 180) / Math.PI;
    string.style.width = `${len}px`;
    string.style.transform = `rotate(${ang}deg)`;
    stage.append(string);
    anim(string, [{ opacity: 0 }, { opacity: 1 }], { delay, duration: 160 });
    anim(string, [{ opacity: 1 }, { opacity: 0 }], { delay: delay + c.hold, duration: 300, fill: "forwards" });
  } else if (kind === "stamp") {
    anim(card, [{ opacity: 0, transform: `translateX(${-dir * 56}px)` }, { opacity: 1, transform: "none" }], { delay, duration: 320, easing: EASE.servo });
    const face = card.querySelector(".bi-debut-stampface");
    anim(face, [{ opacity: 0, transform: `scale(1.75) rotate(${(c.tilt - 16).toFixed(1)}deg)` }, { opacity: 0.95, transform: `scale(0.96) rotate(${(c.tilt - 4).toFixed(1)}deg)`, offset: 0.6 }, { opacity: 0.92, transform: `rotate(${(c.tilt - 4).toFixed(1)}deg)` }],
      { delay: delay + 230, duration: 300, easing: EASE.slam });
  }
  // The card folds away towards the plate it now belongs to.
  anim(card, [{ opacity: 1 }, { opacity: 0, transform: `translate(${-dir * 40}px, ${dir ? 30 : 60}px) scale(0.6)` }], { delay: delay + c.hold, duration: 420, easing: EASE.in, fill: "forwards" });
  return card;
}

/**
 * Play one debut on a placed frame. `offset` shifts everything (ensembles).
 * Returns the recipe so the plate can label it.
 */
function debut(stage, wrap, fig, p, recipe, pos, w, { offset = 0, card = true } = {}) {
  const h = npcHeight(w);
  const o = offset;
  const at = (ms) => ms + o;

  if (recipe.marks) {
    const marks = el("div", "bi-debut-marks", "<i></i><i></i><i></i><i></i>");
    marks.style.inset = `-${recipe.marks.inset.toFixed(0)}px`;
    wrap.append(marks);
    anim(marks, [{ opacity: 0, transform: "scale(1.32)" }, { opacity: 1, transform: "scale(1)" }], { delay: at(0), duration: recipe.marks.dur, easing: EASE.servo });
    anim(marks, [{ opacity: 1 }, { opacity: 0 }], { delay: at(recipe.land + 140), duration: 380, fill: "forwards" });
  }
  if (recipe.pool) {
    const pool = el("div", "bi-debut-pool");
    pool.style.width = `${Math.round(recipe.pool.width * 100)}%`;
    wrap.prepend(pool);
    anim(pool, [{ opacity: 0, transform: "translateX(-50%) scaleX(0.2)" }, { opacity: 1, transform: "translateX(-50%) scaleX(1)", offset: 0.45 }, { opacity: 0.4, transform: "translateX(-50%) scaleX(1)" }],
      { delay: at(recipe.pool.delay), duration: recipe.pool.dur + 400 });
    anim(pool, [{ opacity: 0.4 }, { opacity: 0 }], { delay: at(recipe.land + 1500), duration: 900, fill: "forwards" });
  }

  if (recipe.entry.origin === "top") fig.style.transformOrigin = "50% 0";
  anim(fig, entryFrames(recipe.entry), { delay: at(recipe.entry.delay), duration: recipe.entry.dur, easing: recipe.entry.kind === "slam" ? "linear" : EASE.servo });

  const art = fig.querySelector(".bi-frame__art");
  const img = art.querySelector("img");
  playReveal(art, img, { ...recipe.reveal, delay: at(recipe.reveal.delay) }, recipe.seed ?? 1);

  const plate = fig.querySelector(".bi-frame__plate");
  playStamp(plate, { ...recipe.stamp, delay: at(recipe.stamp.delay) });
  playLamp(fig.querySelector(".bi-frame__lamp"), recipe.lamp && { ...recipe.lamp, delay: at(recipe.lamp.delay) });
  [...fig.querySelectorAll(".bi-frame__key")].forEach((k, i) =>
    anim(k, [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1.18)", offset: 0.6 }, { opacity: 1, transform: "scale(1)" }], { delay: at(recipe.keys.delay + i * recipe.keys.stagger), duration: 260, easing: EASE.out }));

  if (recipe.glint) {
    const glint = el("span", "bi-debut-glint");
    fig.querySelector(".bi-frame__scope").append(glint);
    const a = recipe.glint.angle.toFixed(1);
    anim(glint, [{ opacity: 0, transform: `rotate(${a}deg) translateX(-60%)` }, { opacity: 1, transform: `rotate(${a}deg) translateX(-10%)`, offset: 0.4 }, { opacity: 0, transform: `rotate(${a}deg) translateX(60%)` }],
      { delay: at(recipe.glint.delay), duration: recipe.glint.dur, easing: EASE.out });
  }

  for (const m of recipe.motes) {
    const mote = el("span", `bi-debut-mote${m.warm ? "" : " is-cool"}`);
    mote.style.width = mote.style.height = `${m.size.toFixed(1)}px`;
    mote.style[m.origin === "left" ? "left" : "right"] = "6px";
    wrap.append(mote);
    const rad = (m.angle * Math.PI) / 180;
    const dx = Math.cos(rad) * m.dist * (m.origin === "left" ? 1 : -1) * -1;
    const dy = Math.sin(rad) * m.dist;
    anim(mote, [{ opacity: 0, transform: "translate(0,0) scale(1)" }, { opacity: 1, transform: `translate(${(dx * 0.35).toFixed(1)}px, ${(dy * 0.35).toFixed(1)}px) scale(1)`, offset: 0.25 }, { opacity: 0, transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(0.4)` }],
      { delay: at(m.delay), duration: m.dur, easing: EASE.out });
  }

  if (card) cardFor(p, recipe, pos, w, h, stage, { offset: o });
  return recipe;
}

/* ------------------------------------------------------------------ */
/*  Freeze and replay                                                   */
/* ------------------------------------------------------------------ */

export async function settleAssets() {
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
  await Promise.all([...document.images].map((img) => img.decode?.().catch(() => null)));
}

export async function freeze() {
  await settleAssets();
  for (const a of document.getAnimations()) {
    const target = a.effect?.target;
    const cell = target?.closest?.("[data-t]");
    const t = cell ? Number(cell.dataset.t) : FREEZE;
    if (t === null || Number.isNaN(t)) continue;
    a.pause();
    a.currentTime = t;
  }
  document.body.dataset.ready = "1";
}

function controls(extra = []) {
  const bar = el("div", "lab-controls");
  const replay = el("button", "", "Replay");
  replay.onclick = () => { params.set("seed", String(SEED)); location.search = params.toString(); };
  const next = el("button", "", "Next performance");
  next.onclick = () => { params.set("seed", String(SEED + 1)); location.search = params.toString(); };
  bar.append(replay, next, ...extra);
  document.body.append(bar);
}

/* ------------------------------------------------------------------ */
/*  The plates                                                          */
/* ------------------------------------------------------------------ */

const PLATES = {};

/** 1. One debut, start to finish, as a filmstrip. */
PLATES.debut = () => {
  const root = screen(null, { plain: true });
  title(root, "01", "A first appearance, frame by frame",
    "Kazue Tsurumi is seen by the table for the first time. Nobody pressed anything: the debut plays because she has never been met. This is one performance; the next debut draws a different one.");
  const cells = el("div", "lab-cells");
  cells.style.gridTemplateColumns = "repeat(4, 1fr)";
  cells.style.gridTemplateRows = "repeat(2, 1fr)";
  root.append(cells);
  const p = NPC.kazue;
  const recipe = composeDebut({ seed: SEED, family: familyFor(p), side: "left", force: params.get("force") ?? "entry:slide,reveal:blinds,card:ribbon" });
  const times = [150, 330, 520, 760, 1050, 1500, 2300, 4200];
  const labels = times.map((t, i) => `${(t / 1000).toFixed(2)} s · ${["marks", "arrives", "develops", "lands", "card", "holds", "holds", "settled"][i]}`);
  times.forEach((t, i) => {
    const cell = el("div", "lab-cell");
    cell.dataset.t = String(FREEZE ?? t);
    const bg = el("div", "lab-cell__bg");
    bg.style.backgroundImage = `url("${PLACE_ART}the-bathhouse-447--pool.png")`;
    cell.append(bg, el("div", "lab-cell__t", labels[i]));
    cells.append(cell);
  });
  requestAnimationFrame(() => {
    [...cells.children].forEach((cell) => {
      const rect = cell.getBoundingClientRect();
      const w = 210;
      const stage = el("div", "lab-stage");
      cell.append(stage);
      // Cell coordinates: x across the cell, bottom = the feet, from the cell's top.
      const pos = { x: rect.width * 0.26, bottom: rect.height - 46, z: 10 };
      const fig = npcFrame(p, { w });
      const wrap = place(stage, fig, pos, w);
      wrap.style.bottom = "46px";
      debutInCell(stage, wrap, fig, p, recipe, pos, w, rect);
    });
    const sig = el("div", "lab-sub", `<b style="font-family:var(--bi-font-legend);letter-spacing:.18em;color:var(--bi-brass-lit)">THIS PERFORMANCE</b> &nbsp; ${recipe.signature} &nbsp;·&nbsp; seed ${SEED} &nbsp;·&nbsp; ${recipe.total} ms`);
    sig.style.top = "auto";
    sig.style.bottom = "6px";
    root.append(sig);
    freeze();
  });
  controls();
};

/** Debuts inside a cell: the same player, with the card anchored to the cell. */
function debutInCell(stage, wrap, fig, p, recipe, pos, w, rect) {
  debut(stage, wrap, fig, p, recipe, pos, w, { card: false });
  return cardFor(p, recipe, pos, w, npcHeight(w), stage, { containerW: rect.width });
}

/** 2. The same moment, twelve performances. */
PLATES.variety = () => {
  const root = screen(null, { plain: true });
  title(root, "02", "Same moment, twelve performances",
    "The first six: Kazue's debut drawn six times, frozen as the portrait develops. The last six: six different people, frozen as their name caption lands. Variety comes from small modules and seeded numbers, never from a new effect per character.");
  const cells = el("div", "lab-cells");
  cells.style.gridTemplateColumns = "repeat(4, 1fr)";
  cells.style.gridTemplateRows = "repeat(3, 1fr)";
  root.append(cells);
  const reveals = ["blinds", "iris", "raster", "develop", "wipe", "shutter"];
  const people = [NPC.kiku, NPC["section-officer"], NPC.tomoe, NPC.gennai, NPC.michiru, NPC.genzo];
  const cardKinds = ["ribbon", "stamp", "tag", "spine", "ribbon", "tag"];
  const specs = [
    ...reveals.map((r, i) => ({ p: NPC.kazue, force: { reveal: r }, seed: SEED * 31 + i, freezeAt: "reveal" })),
    ...people.map((p, i) => ({ p, force: { card: cardKinds[i] }, seed: SEED * 57 + i, freezeAt: "card" }))
  ];
  specs.forEach(() => cells.append(el("div", "lab-cell")));
  requestAnimationFrame(() => {
    [...cells.children].forEach((cell, i) => {
      const spec = specs[i];
      const rect = cell.getBoundingClientRect();
      const w = 150;
      const recipe = composeDebut({ seed: spec.seed, family: familyFor(spec.p), side: spec.freezeAt === "card" ? "left" : "centre", force: spec.force });
      const t = spec.freezeAt === "reveal" ? recipe.reveal.delay + recipe.reveal.dur * 0.3 : recipe.card.delay + 620;
      cell.dataset.t = String(Math.round(t));
      const bg = el("div", "lab-cell__bg");
      bg.style.backgroundImage = `url("${PLACE_ART}${["the-bathhouse-447--pool", "the-paper-lantern", "directorate-headquarters--lobby", "the-crew-mess--bar", "general-hospital--ward", "row-f-block-5--common-room", "the-met-office--roof"][spec.freezeAt === "reveal" ? 0 : (i - 5)]}.png")`;
      cell.append(bg);
      const stage = el("div", "lab-stage");
      cell.append(stage);
      const x = spec.freezeAt === "reveal" ? rect.width / 2 : rect.width * 0.2;
      const pos = { x, bottom: rect.height - 40, z: 10 };
      const fig = npcFrame(spec.p, { w, label: spec.p.name });
      const wrap = place(stage, fig, pos, w);
      wrap.style.bottom = "40px";
      debutInCell(stage, wrap, fig, spec.p, recipe, pos, w, rect);
      cell.append(el("div", "lab-cell__t", spec.freezeAt === "reveal" ? recipe.reveal.kind : recipe.card.kind));
      cell.append(el("div", "lab-cell__sig", recipe.signature));
    });
    freeze();
  });
  controls();
};

/** 3. Three newcomers at once, one ensemble. */
PLATES.ensemble = () => {
  const root = screen(`${PLACE_ART}the-paper-lantern.png`);
  title(root, "03", "Three new faces at once");
  deck(root);
  const stage = el("div", "lab-stage");
  root.append(stage);
  const npcs = [NPC.sanzo, NPC.kiku, NPC.tama];
  const geo = stageGeometry({ width: W(), height: H(), deck: 262, headcount: 9 });
  const pos = formation("line", { geo, npcs, pcs: PCS });
  const byId = new Map(pos.map((p) => [p.id, p]));
  const plan = scheduleEnsemble(npcs.map((m) => ({ id: m.id, x: byId.get(m.id).x, lead: m.id === "kiku" })), { seed: SEED });
  for (const m of PCS) place(stage, miniFrame(m, { w: geo.frameW }), byId.get(m.id), geo.frameW);
  const group = el("div", "bi-debut-group", `<span class="bi-debut-group__kicker">New faces · The Paper Lantern</span><div class="bi-debut-group__names"></div>`);
  root.append(group);
  const names = group.querySelector(".bi-debut-group__names");
  for (const slot of plan.order) {
    const m = NPC[slot.id];
    const p = byId.get(m.id);
    const fig = npcFrame(m, { w: geo.frameW });
    const wrap = place(stage, fig, p, geo.frameW);
    const recipe = composeDebut({ seed: hashString(m.id) ^ SEED, family: familyFor(m), side: p.x < W() / 2 - 50 ? "left" : p.x > W() / 2 + 50 ? "right" : "centre", force: slot.lead ? { card: "ribbon" } : {} });
    // Either side of the headliner is somebody's face, so their card goes above the row.
    if (slot.lead) recipe.card.side = "above";
    debut(stage, wrap, fig, m, recipe, p, geo.frameW, { offset: slot.offset, card: slot.card });
    const span = el("span", "", m.name);
    names.append(span);
    anim(span, [{ opacity: 0.16, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { delay: slot.offset + recipe.land, duration: 260, easing: EASE.out });
  }
  anim(group, [{ opacity: 0, transform: "translateX(-50%) scaleX(0.6)" }, { opacity: 1, transform: "translateX(-50%) scaleX(1)" }], { delay: 0, duration: 380, easing: EASE.servo });
  note(root, 1, "Left to right, a beat apart; the headliner lands last. Four newcomers take barely longer than two.", 40, 360);
  note(root, 2, "Three or more: one caption names them as they land. Only the headliner gets a caption of their own.", W() / 2 + 330, 150);
  note(root, 3, "The party is already here, so their cards do nothing. A debut only plays the first time someone is met.", 60, H() - 440);
  freeze();
  controls();
};

/** 4. The PC mini frame, both seats. */
PLATES.minis = () => {
  const root = screen(`${PLACE_ART}the-paper-lantern.png`, { dim: 0.45 });
  title(root, "04", "The party's mini frames",
    "Half as tall as a person's frame, the same width, so everyone lines up on one grid. Three keys at most. What the keys do depends on who is looking.");
  const stage = el("div", "lab-stage");
  root.append(stage);
  const w = 232;
  const pitch = w + 36;
  const startX = W() / 2 - (2.5 * pitch);
  const rowA = 640;
  const rowB = 1150;
  root.append(Object.assign(el("div", "lab-title"), { innerHTML: "<span>What Etsuko's player sees</span>", style: `top:${rowA - 330}px;left:${startX - w / 2}px` }));
  root.append(Object.assign(el("div", "lab-title"), { innerHTML: "<span>What the GM sees</span>", style: `top:${rowB - 300}px;left:${startX - w / 2}px` }));
  const states = {
    etsuko: { own: true, hand: "1", activity: "Searching" },
    masaru: { hand: "2" },
    nren: { activity: "Following Etsuko" },
    hiroshi: { where: "In the alley" },
    yumiko: {},
    susumu: { activity: "Scouting" }
  };
  PCS.forEach((m, i) => {
    const s = states[m.id];
    const x = startX + i * pitch;
    place(stage, miniFrame(m, { w, seat: "player", own: Boolean(s.own), hand: s.hand, activity: s.activity, where: s.where, showHp: Boolean(s.own) }), { x, bottom: rowA, z: 10 }, w);
    place(stage, miniFrame(m, { w, seat: "gm", hand: s.hand, activity: s.activity, where: s.where, heroes: [1, 0, 2, 1, 3, 0][i], showHp: true }),
      { x, bottom: rowB, z: 10, spotlit: m.id === "yumiko" }, w);
  });
  note(root, 1, "Your own card: raise your hand, say what you're doing (Search, Scout, Avoid Notice…), open your notes.", startX - w / 2 - 10, rowA + 26);
  note(root, 2, "A teammate's card: follow them (SF2E's Follow the Expert) or open their page.", startX + pitch - w / 2 + 40, rowA + 26);
  note(root, 3, "Hands are numbered in the order they went up. Everyone sees them.", startX + 3 * pitch - w / 2 - 40, rowA + 26);
  note(root, 4, "GM: award a Hero Point (diamonds show how many), ask this player to roll, give them the floor.", startX - w / 2 - 10, rowB + 26);
  note(root, 5, "The floor: a lit card, and a quiet tally of who has had a moment tonight.", startX + 4 * pitch - w / 2 - 20, rowB + 26);
  freeze();
};

/** 5. Two people talking, the party part of it. */
PLATES.conversation = () => {
  const root = screen(`${PLACE_ART}the-crew-mess--bar.png`);
  title(root, "05", "Formation: a conversation");
  deck(root);
  const stage = el("div", "lab-stage");
  root.append(stage);
  const npcs = [NPC.tomoe, NPC.petr, NPC.ren];
  const geo = stageGeometry({ width: W(), height: H(), deck: 262, headcount: 9 });
  const pos = settle(formation("conversation", { geo, npcs, pcs: PCS, speakers: ["tomoe", "petr"] }), { geo });
  for (const p of pos) {
    const m = NPC[p.id] ?? pc(p.id);
    const fig = m.kind === "pc" ? miniFrame(m, { w: geo.frameW, hand: m.id === "susumu" ? "1" : null }) : npcFrame(m, { w: geo.frameW });
    place(stage, fig, p, geo.frameW);
  }
  note(root, 1, "The two talking turn towards each other across a gap. Whoever is speaking lights up; the Runner already knows who that is.", W() / 2 - 160, 300);
  note(root, 2, "Anyone listening stands a row back, dimmed.", W() / 2 + 560, 480);
  note(root, 3, "The party's arc faces them, so the table reads as part of it, not watching from outside.", 70, H() - 520);
  freeze();
};

/** 6. Ganging up on one person. */
PLATES.gangup = () => {
  const root = screen(`${PLACE_ART}row-f-block-5--common-room.png`);
  title(root, "06", "Formation: ganging up");
  deck(root);
  const stage = el("div", "lab-stage");
  root.append(stage);
  root.querySelector(".lab-bg").style.filter = "saturate(0.8) brightness(0.62)";
  const npcs = [NPC.lucan, NPC.michiru, NPC.chiyo];
  const geo = stageGeometry({ width: W(), height: H(), deck: 262, headcount: 9 });
  const raw = formation("gangup", { geo, npcs, pcs: PCS, target: "masaru" });
  const pos = settle(raw, { geo });
  for (const p of pos) {
    const m = NPC[p.id] ?? pc(p.id);
    const fig = m.kind === "pc" ? miniFrame(m, { w: geo.frameW }) : npcFrame(m, { w: geo.frameW });
    const wrap = place(stage, fig, p, geo.frameW);
    if (p.targeted) wrap.classList.add("is-spotlit");
  }
  const vignette = el("div");
  Object.assign(vignette.style, { position: "absolute", inset: "0", zIndex: "3", pointerEvents: "none", background: "radial-gradient(ellipse 60% 70% at 50% 62%, transparent 40%, rgb(0 0 0 / 70%) 100%)" });
  root.append(vignette);
  note(root, 1, "One press: the crowd closes round the target, leaning in, allowed to overlap.", W() / 2 + 420, 360);
  note(root, 2, "Everyone else is pushed to the ends of the row, dimmed: present, not in it.", 70, H() - 520);
  freeze();
};

/** 7. The GM arranging a crowded stage. */
PLATES.arrange = () => {
  const root = screen(`${PLACE_ART}general-hospital--ward.png`);
  title(root, "07", "Arranging a crowded stage (GM)");
  deck(root);
  const stage = el("div", "lab-stage");
  root.append(stage);
  const bar = el("div", "bi-stagebar", `
    <span class="bi-stagebar__legend">Stage</span>
    <button class="is-on"><i class="fa-solid fa-grip-lines"></i>Line</button>
    <button><i class="fa-solid fa-comments"></i>Talk</button>
    <button><i class="fa-solid fa-people-group"></i>Gang-up</button>
    <button><i class="fa-solid fa-landmark"></i>Panel</button>
    <button><i class="fa-solid fa-code-branch"></i>Split</button>
    <button><i class="fa-solid fa-layer-group"></i>Stack</button>
    <button><i class="fa-solid fa-broom"></i>Tidy</button>
    <button><i class="fa-solid fa-lock"></i>Lock</button>
    <span class="bi-stagebar__crowd">+3 stacked</span>`);
  root.append(bar);
  const shown = [NPC.tsubaki, NPC.gennai, NPC.mori];
  const stacked = [NPC.imai, NPC.aucourt, NPC.kuroki];
  const geo = stageGeometry({ width: W(), height: H(), deck: 262, headcount: 9 });
  // Grid dots: shown while anything is being dragged.
  for (const row of ["front", "mid"]) for (const x of geo.columns) {
    const dot = el("span", "bi-grid-dot");
    dot.style.left = `${x}px`;
    dot.style.top = `${geo.rows[row].bottom + 8}px`;
    root.append(dot);
  }
  const occupied = { tsubaki: 3, gennai: 4, mori: 6 };
  const placed = {};
  for (const m of shown) {
    const col = occupied[m.id];
    placed[m.id] = place(stage, npcFrame(m, { w: geo.frameW, seat: "gm" }), { x: geo.columns[col], bottom: geo.rows.mid.bottom, z: 10 }, geo.frameW);
  }
  // The stack: three patients folded into one.
  const crowd = el("div", "bi-crowd");
  const cx = geo.columns[1];
  crowd.style.left = `${cx - geo.frameW / 2}px`;
  crowd.style.bottom = `${H() - geo.rows.mid.bottom}px`;
  crowd.style.width = `${geo.frameW}px`;
  crowd.style.height = `${geo.npcH}px`;
  stacked.forEach((m, i) => {
    const fig = npcFrame(m, { w: geo.frameW, seat: "gm" });
    fig.style.transform = `translate(${(i - 1) * 14}px, ${-i * 6}px) rotate(${(i - 1) * 3.2}deg)`;
    fig.style.zIndex = String(i);
    if (i < 2) fig.style.filter = "brightness(0.7)";
    crowd.append(fig);
  });
  crowd.append(el("span", "bi-crowd__count", "×3"), el("span", "bi-crowd__label", "Ward Four patients"));
  root.querySelector(".lab-stage").append(crowd);
  // Mid-drag: the porter, lifted, heading for the cleaner's place (column 6).
  const dragTo = 6;
  const slot = (col, cls) => {
    const g = el("div", cls);
    Object.assign(g.style, { left: `${geo.columns[col] - geo.frameW / 2 - 6}px`, width: `${geo.frameW + 12}px`, top: `${geo.rows.mid.bottom - geo.npcH - 6}px`, height: `${geo.npcH + 12}px` });
    root.append(g);
    return g;
  };
  slot(dragTo, "bi-slot-ghost");
  const porter = placed.gennai;
  porter.classList.add("is-dragging");
  porter.style.left = `${geo.columns[5] - geo.frameW / 2 + 40}px`;
  porter.style.bottom = `${H() - geo.rows.mid.bottom + 46}px`;
  porter.style.setProperty("--tilt", "6deg");
  // Magnets: the cleaner is already sliding one place right to make room.
  const make = slot(dragTo + 1, "bi-slot-ghost");
  make.style.borderColor = "rgb(79 200 216 / 80%)";
  make.style.background = "rgb(79 200 216 / 8%)";
  make.style.boxShadow = "0 0 24px rgb(79 200 216 / 20%) inset";
  placed.mori.style.left = `${geo.columns[dragTo] - geo.frameW / 2 + 74}px`;
  const mag = el("div", "bi-magnet");
  Object.assign(mag.style, { left: `${geo.columns[dragTo] + geo.frameW / 2 + 84}px`, top: `${geo.rows.mid.bottom - geo.npcH - 30}px`, width: "120px" });
  root.append(mag);
  for (const [i, m] of PCS.entries()) place(stage, miniFrame(m, { w: geo.frameW, seat: "gm", heroes: [1, 0, 2, 1, 3, 0][i], showHp: true }), { x: geo.columns[i + 2], bottom: geo.rows.front.bottom, z: 30 }, geo.frameW);
  note(root, 1, "Formations are one press each; cards glide to their places.", W() / 2 + 560, 40);
  note(root, 2, "Picked up: lifted, tilting with the speed of the hand, with a small wiggle. It lands in the dashed slot.", geo.columns[3] - 140, geo.rows.mid.bottom - geo.npcH - 130);
  note(root, 3, "Magnets: whoever is in the way slides one place over, so two cards never sit on top of each other.", geo.columns[dragTo + 1] + geo.frameW / 2 + 30, geo.rows.mid.bottom - geo.npcH + 20);
  note(root, 4, "Too many people: the least recent fold into a stack with a count. One press fans them out again.", 40, geo.rows.mid.bottom - geo.npcH - 130);
  note(root, 5, "Grid dots appear while dragging, so everything lands in line.", 40, geo.rows.front.bottom - 120);
  freeze();
};

/** 8. Zones: places in the picture you can move into. */
PLATES.zones = () => {
  const root = screen(`${SCENE_ART}episode-c1e1--the-errand.webp`);
  title(root, "08", "Zones: go in, go round, split up");
  deck(root);
  const stage = el("div", "lab-stage");
  root.append(stage);
  const geo = stageGeometry({ width: W(), height: H(), deck: 262, headcount: 6 });
  const map = (xi, yi) => [xi * (W() * 1.125) - W() * 0.0625, yi * H()];
  const zones = [
    { id: "tea", name: "The Tea House", hint: '<i class="fa-solid fa-door-open"></i> Go in · 2 waiting', pts: [[0.672, 0.6], [0.79, 0.6], [0.8, 0.79], [0.66, 0.79]], target: true, label: [0.66, 0.5] },
    { id: "window", name: "The Shop Window", hint: '<i class="fa-solid fa-magnifying-glass"></i> Look closer', pts: [[0.33, 0.52], [0.6, 0.52], [0.6, 0.74], [0.33, 0.74]], label: [0.36, 0.45] },
    { id: "alley", name: "The Alley", hint: '<i class="fa-solid fa-door-open"></i> Round the side', pts: [[0.86, 0.55], [1.02, 0.55], [1.02, 0.82], [0.86, 0.82]], label: [0.84, 0.47] }
  ];
  const holder = el("div", "bi-zones");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  holder.append(svg);
  for (const z of zones) {
    const pts = z.pts.map(([x, y]) => map(x, y));
    const d = roundedPath(pts, 18);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", `bi-zone${z.target ? " is-target" : ""}`);
    g.innerHTML = `<path class="bi-zone__halo" d="${d}"/><path class="bi-zone__shape" d="${d}"/>`;
    svg.append(g);
    const [lx, ly] = map(...z.label);
    const label = el("div", `bi-zone__label bi-zone${z.target ? " is-target" : ""}`, `<span class="bi-zone__name">${z.name}</span><span class="bi-zone__hint">${z.hint}</span>`);
    label.style.left = `${lx}px`;
    label.style.top = `${ly}px`;
    holder.append(label);
    if (z.target) anim(g.querySelector(".bi-zone__shape"), [{ strokeDashoffset: 0 }, { strokeDashoffset: -42 }], { duration: 900, easing: "linear" });
  }
  root.append(holder);
  const w = Math.round(geo.frameW * 0.82);
  // Two already waiting at the tea-house door; one being dragged in; three on the street.
  const [tx, ty] = map(0.73, 0.79);
  place(stage, miniFrame(pc("etsuko"), { w, own: true, activity: "Searching" }), { x: tx - w * 0.55, bottom: ty - 6, z: 30 }, w);
  place(stage, miniFrame(pc("yumiko"), { w }), { x: tx + w * 0.55, bottom: ty - 6, z: 30 }, w);
  const dragged = place(stage, miniFrame(pc("masaru"), { w }), { x: map(0.645, 0)[0], bottom: ty + 34, z: 60 }, w);
  dragged.classList.add("is-dragging");
  dragged.style.setProperty("--tilt", "-6deg");
  const rest = ["nren", "hiroshi", "susumu"];
  rest.forEach((id, i) => place(stage, miniFrame(pc(id), { w, activity: id === "hiroshi" ? "Following Ren" : null }), { x: geo.columns[1] + i * (w + 26), bottom: geo.rows.front.bottom, z: 30 }, w));
  note(root, 1, "A zone is a place in the picture: a dashed outline and its name. The GM draws them, or the scene brings them.", map(0.33, 0)[0], 300);
  note(root, 2, "Drag your card onto a door and it waits there. When the GM says yes (or the door is open), you go in.", map(0.69, 0)[0] - 60, 640);
  note(root, 3, "Look-closer zones are points of interest: moving there is how you say \"I'm looking at the window.\"", 60, 560);
  note(root, 4, "Whoever stays outside stays on the street. The party can split; the camera cuts between them.", 60, H() - 470);
  freeze();
};

export function roundedPath(pts, r) {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const v1 = [p0[0] - p1[0], p0[1] - p1[1]];
    const v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(...v1);
    const l2 = Math.hypot(...v2);
    const a = [p1[0] + (v1[0] / l1) * Math.min(r, l1 / 2), p1[1] + (v1[1] / l1) * Math.min(r, l1 / 2)];
    const b = [p1[0] + (v2[0] / l2) * Math.min(r, l2 / 2), p1[1] + (v2[1] / l2) * Math.min(r, l2 / 2)];
    d += `${i ? "L" : "M"}${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)} `;
  }
  return `${d}Z`;
}

/** The flood tunnel's blueprint: what the party has seen of the building. */
export function floodPlan() {
  const plan = {
    sheet: "FLOOD TUNNEL · LOWER LEVEL · SHEET 1",
    current: "chamber",
    shell: [[-1, -1], [39, -1], [39, 22], [22, 22], [22, 31], [12, 31], [12, 22], [-1, 22]],
    rooms: [
      { id: "stair", name: "Stair", x: 0, y: 0, w: 6, h: 9, state: "visited" },
      { id: "walk", name: "Service Walk", x: 6, y: 2, w: 16, h: 4, state: "visited" },
      { id: "chamber", name: "Compactor Chamber", x: 8, y: 6, w: 20, h: 15, state: "visited", labelUp: 2.5 },
      { id: "gen", name: "Generator Room", x: 28, y: 6, w: 10, h: 7, state: "visited" },
      { id: "machine", name: "Machine Room", x: 28, y: 13, w: 10, h: 8, state: "glimpsed" },
      { id: "drain", name: "Drain Line", x: 14, y: 21, w: 6, h: 9, state: "glimpsed", named: true },
      { id: "sump", name: "Sump", x: 30, y: 21, w: 8, h: 8, state: "unknown" }
    ],
    doors: [
      { rooms: ["stair", "walk"], x: 6, y: 4, w: 1.6, axis: "v", swing: 1 },
      { rooms: ["walk", "chamber"], x: 12, y: 6, w: 1.8, axis: "h", swing: 1 },
      { rooms: ["chamber", "gen"], x: 28, y: 9, w: 1.6, axis: "v", swing: 1 },
      { rooms: ["chamber", "machine"], x: 28, y: 17, w: 1.6, axis: "v", swing: -1 },
      { rooms: ["chamber", "drain"], x: 17, y: 21, w: 1.6, axis: "h", swing: 1 }
    ],
    stairs: [{ room: "stair", x: 1, y: 1.5, w: 4, h: 6 }],
    exits: [{ x: 3, y: -1.6, label: "UP TO THE YARD" }],
    party: [
      { room: "chamber", members: [{ initial: "E", color: pc("etsuko").who }, { initial: "S", color: pc("susumu").who }, { initial: "M", color: pc("masaru").who }, { initial: "R", color: pc("nren").who }], here: true, at: 0.64 },
      { room: "gen", members: [{ initial: "H", color: pc("hiroshi").who }, { initial: "Y", color: pc("yumiko").who }], at: 0.78 }
    ]
  };
  return plan;
}

/** The blueprint panel the players see, top right (collapsible to a compass). */
export function planPanel(plan, { right = 40, top = 40, width = 540, height = 360 } = {}) {
  const panel = el("div", "bi-plan", `<div class="bi-plan__head"><span class="bi-plan__title">Where you are</span><span class="bi-plan__keys"><i class="fa-solid fa-expand"></i><i class="fa-solid fa-minus"></i></span></div>${blueprintSVG(plan, { width, height, seat: "player" })}`);
  Object.assign(panel.style, { right: `${right}px`, top: `${top}px` });
  return panel;
}

/** 9. The blueprint, and a theatre-of-the-mind fight in zones. */
PLATES.plan = () => {
  const root = screen(`${SCENE_ART}episode-c1e1--flood-tunnel.webp`);
  title(root, "09", "The blueprint, and a fight in zones");
  deck(root);
  const stage = el("div", "lab-stage");
  root.append(stage);
  const map = (xi, yi) => [xi * (W() * 1.125) - W() * 0.0625, yi * H()];
  const zones = [
    { name: "The Panels", hint: "Cover · the controls", pts: [[0.585, 0.43], [0.72, 0.43], [0.72, 0.6], [0.585, 0.6]], label: [0.6, 0.355] },
    { name: "The Compactor", hint: "Cover", pts: [[0.3, 0.32], [0.44, 0.32], [0.44, 0.6], [0.3, 0.6]], label: [0.24, 0.255] },
    { name: "The Sludge", hint: "Difficult terrain", pts: [[0.12, 0.63], [0.88, 0.63], [0.84, 0.84], [0.16, 0.84]], label: [0.43, 0.655] },
    { name: "The Stair", hint: "Way out", pts: [[0.8, 0.4], [0.93, 0.4], [0.93, 0.62], [0.8, 0.62]], label: [0.79, 0.33] }
  ];
  const holder = el("div", "bi-zones");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  holder.append(svg);
  for (const z of zones) {
    const d = roundedPath(z.pts.map(([x, y]) => map(x, y)), 20);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "bi-zone");
    g.innerHTML = `<path class="bi-zone__halo" d="${d}"/><path class="bi-zone__shape" d="${d}"/>`;
    svg.append(g);
    const [lx, ly] = map(...z.label);
    const label = el("div", "bi-zone__label", `<span class="bi-zone__name">${z.name}</span><span class="bi-zone__hint">${z.hint}</span>`);
    label.style.left = `${lx}px`;
    label.style.top = `${ly}px`;
    holder.append(label);
  }
  root.append(holder);
  // Range links between zones: near and far.
  const link = (a, b, text) => {
    const [x1, y1] = map(...a);
    const [x2, y2] = map(...b);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const ln = el("div", "bi-link", `<b>${text}</b>`);
    Object.assign(ln.style, { left: `${x1}px`, top: `${y1}px`, width: `${Math.hypot(x2 - x1, y2 - y1)}px`, transform: `rotate(${angle}rad)` });
    // The label stays upright whatever the line's angle.
    ln.querySelector("b").style.transform = `translateX(-50%) rotate(${-angle}rad)`;
    root.append(ln);
  };
  link([0.44, 0.47], [0.585, 0.5], "NEAR");
  link([0.72, 0.52], [0.8, 0.52], "NEAR");
  link([0.37, 0.6], [0.37, 0.7], "ENGAGED");
  const w = 150;
  const mini = (id, x, y, opts = {}) => place(stage, miniFrame(pc(id), { w, ...opts }), { x: map(x, 0)[0], bottom: map(0, y)[1], z: 30 }, w);
  mini("etsuko", 0.625, 0.6, { own: true, activity: "At the panel" });
  mini("susumu", 0.685, 0.6);
  mini("masaru", 0.34, 0.6);
  mini("nren", 0.405, 0.6);
  // The centipedes, folded into two stacks in the sludge.
  const stack = (x, y, n, label) => {
    const crowd = el("div", "bi-crowd");
    const cw = 150;
    const ch = npcHeight(cw);
    const [px, py] = map(x, y);
    Object.assign(crowd.style, { left: `${px - cw / 2}px`, bottom: `${H() - py}px`, width: `${cw}px`, height: `${ch}px`, zIndex: "25" });
    for (let i = 0; i < 3; i++) {
      const fig = npcFrame(NPC.centipede, { w: cw, label: "Giant centipede" });
      fig.style.transform = `translate(${(i - 1) * 12}px, ${-i * 5}px) rotate(${(i - 1) * 3}deg)`;
      if (i < 2) fig.style.filter = "brightness(0.65)";
      crowd.append(fig);
    }
    crowd.append(el("span", "bi-crowd__count", `×${n}`), el("span", "bi-crowd__label", label));
    stage.append(crowd);
  };
  stack(0.3, 0.8, 4, "In the sludge");
  stack(0.56, 0.8, 2, "At the grate");
  // Elsewhere: two who went on to the generator room.
  const away = el("div", "bi-elsewhere", `<div class="bi-elsewhere__title">Elsewhere in this scene</div>
    <div class="bi-elsewhere__row"><img src="${pc("hiroshi").src}" style="--who:${pc("hiroshi").who}"><img src="${pc("yumiko").src}" style="--who:${pc("yumiko").who}"><span>Hiroshi, Yumiko <em>· Generator Room</em></span></div>`);
  root.append(away);
  const bands = el("div", "bi-bands", `<span style="--band:#f4eedc">Engaged</span><span class="is-dash" style="--band:#f4eedc">Near · one Stride</span><span class="is-dash" style="--band:rgb(244 238 220 / 50%)">Far · two</span>`);
  Object.assign(bands.style, { left: "40px", top: "120px" });
  root.append(bands);
  // The blueprint, top right.
  root.append(planPanel(floodPlan()));
  note(root, 1, "Fight zones are positions. Moving between near zones is a Stride; SF2E's cover and difficult terrain apply as written.", 60, 190);
  note(root, 2, "A crowd of foes stacks. The count drops as they fall.", map(0.62, 0)[0], 1000);
  note(root, 3, "The blueprint: solid where you've been, dashed where you've glimpsed, nothing where you haven't. Orange is you.", W() - 940, 60);
  note(root, 4, "Split up and the others are still on screen: where they are, one press to cut to them.", 40, H() - 430);
  freeze();
};

/** 10. Running a situation scene (GM): the Runner's map-first view. */
PLATES.runner = () => {
  const root = screen(null, { plain: true });
  const drawerW = Math.round(W() * 0.46);
  // The stage, still fully visible beside the drawer: The Errand's street.
  const artW = H() * 2; // the art is 2:1, height-bound here
  const shift = artW * 0.4;
  const view = el("div", "lab-bg");
  Object.assign(view.style, { left: `${drawerW}px`, backgroundImage: `url("${SCENE_ART}episode-c1e1--the-errand.webp")`, backgroundSize: `${artW}px ${H()}px`, backgroundPosition: `${-shift}px 0` });
  root.append(view);
  deck(root);
  root.querySelector(".lab-deck").style.left = `${drawerW + (W() - drawerW) / 2}px`;
  root.querySelector(".lab-deck").style.width = `${Math.round((W() - drawerW) * 0.86)}px`;
  const stage = el("div", "lab-stage");
  root.append(stage);
  const map = (xi, yi) => [drawerW + xi * artW - shift, yi * H()];
  const holder = el("div", "bi-zones");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  holder.append(svg);
  for (const z of [
    { name: "The Shop Window", hint: '<i class="fa-solid fa-magnifying-glass"></i> Look closer', pts: [[0.43, 0.52], [0.6, 0.52], [0.6, 0.74], [0.43, 0.74]], label: [0.44, 0.45] },
    { name: "The Tea House", hint: '<i class="fa-solid fa-door-open"></i> 2 waiting', pts: [[0.665, 0.6], [0.8, 0.6], [0.8, 0.79], [0.665, 0.79]], label: [0.665, 0.5], target: true }
  ]) {
    const d = roundedPath(z.pts.map(([x, y]) => map(x, y)), 18);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", `bi-zone${z.target ? " is-target" : ""}`);
    g.innerHTML = `<path class="bi-zone__halo" d="${d}"/><path class="bi-zone__shape" d="${d}"/>`;
    svg.append(g);
    const [lx, ly] = map(...z.label);
    const label = el("div", `bi-zone__label bi-zone${z.target ? " is-target" : ""}`, `<span class="bi-zone__name">${z.name}</span><span class="bi-zone__hint">${z.hint}</span>`);
    Object.assign(label.style, { left: `${lx}px`, top: `${ly}px` });
    holder.append(label);
  }
  root.append(holder);
  const w = 150;
  const [tx, ty] = map(0.732, 0.79);
  place(stage, miniFrame(pc("etsuko"), { w, seat: "gm", heroes: 1, showHp: true }), { x: tx - w * 0.54, bottom: ty - 6, z: 30 }, w);
  place(stage, miniFrame(pc("yumiko"), { w, seat: "gm", heroes: 3, showHp: true }), { x: tx + w * 0.54, bottom: ty - 6, z: 30 }, w);
  ["masaru", "nren", "hiroshi", "susumu"].forEach((id, i) =>
    place(stage, miniFrame(pc(id), { w, seat: "gm", heroes: [0, 2, 1, 0][i], showHp: true, hand: id === "masaru" ? "1" : null }), { x: drawerW + 140 + i * (w + 18), bottom: H() - 290, z: 30 }, w));

  const dot = (id) => `<span class="lr-dot" style="background:${pc(id).who}"></span>`;
  const drawer = el("div", "lab-runner", `
    <div class="lr-head">
      <span class="lr-title">The Errand</span>
      <span class="lr-chip lr-chip--shape">Situation</span><span class="lr-chip lr-chip--mode">Social</span>
      <span class="lr-clock">Due back by <b>1900</b><span class="lr-pips"><i class="is-spent"></i><i class="is-spent"></i><i></i><i></i><i></i><i></i></span></span>
      <button class="lr-key">Floor</button>
      <button class="lr-key lr-key--loud"><i class="fa-solid fa-bolt"></i>&nbsp; Not prepared</button>
    </div>
    <div class="lr-body">
      <div class="lr-col">
        <span class="lr-legend">Where they are</span>
        <div class="lr-places">
          <div class="lr-place">The street<span class="lr-dots">${dot("masaru")}${dot("nren")}${dot("hiroshi")}${dot("susumu")}</span><em>4</em></div>
          <div class="lr-place is-here">The instrument workshop<em>looking now</em></div>
          <div class="lr-place">The tea house<span class="lr-dots">${dot("etsuko")}${dot("yumiko")}</span><em>2 waiting</em></div>
          <div class="lr-place">The shop window<em>spot</em></div>
          <div class="lr-place">The alley<em>door · ask</em></div>
        </div>
        <div class="lr-card">
          <h4>The instrument workshop</h4>
          <div class="lr-read">Brass and machine oil, and a radio playing low behind the counter. Every wall is drawers, every drawer labelled in a hand nobody has used for forty years.</div>
          <div class="lr-row"><b>Here:</b> the storekeeper, at the front bench (indifferent)</div>
          <div class="lr-row"><b>Things:</b> the bench, the drawer wall, a tray of gauges waiting for collection</div>
          <span class="lr-legend">Look closer</span>
          <div class="lr-checks"><span class="lr-check">Seek <b>15</b></span><span class="lr-check">Investigate <b>16</b></span><span class="lr-check">Society <b>15</b></span><span class="lr-check">Crafting lore <b>14</b></span></div>
        </div>
      </div>
      <div class="lr-col">
        <span class="lr-legend">Prepared moves · the instrument workshop</span>
        <div class="lr-families">
          <span class="lr-family is-on"><i class="fa-solid fa-comments"></i>Talk<em>4</em></span>
          <span class="lr-family"><i class="fa-solid fa-magnifying-glass"></i>Look<em>3</em></span>
          <span class="lr-family"><i class="fa-solid fa-book-open"></i>Know<em>2</em></span>
          <span class="lr-family"><i class="fa-solid fa-person-walking"></i>Go<em>3</em></span>
          <span class="lr-family"><i class="fa-solid fa-user-secret"></i>Sneak<em>1</em></span>
          <span class="lr-family"><i class="fa-solid fa-masks-theater"></i>Trick<em>2</em></span>
          <span class="lr-family"><i class="fa-solid fa-hand-fist"></i>Force<em>2</em></span>
          <span class="lr-family"><i class="fa-solid fa-screwdriver-wrench"></i>Fix<em>1</em></span>
          <span class="lr-family"><i class="fa-solid fa-hourglass-half"></i>Wait<em>1</em></span>
          <span class="lr-family"><i class="fa-solid fa-code-branch"></i>Split<em>1</em></span>
          <span class="lr-family"><i class="fa-solid fa-handshake-angle"></i>Help<em>1</em></span>
          <span class="lr-family"><i class="fa-solid fa-door-open"></i>Leave<em>1</em></span>
        </div>
        <div class="lr-search"><i class="fa-solid fa-magnifying-glass"></i>Search what they said… (try "bribe")</div>
        <div class="lr-move is-open">
          <div class="lr-move__top"><span class="lr-move__if">If they ask him straight what the docket means</span><span class="lr-move__roll">Request · Diplomacy 15</span></div>
          <span class="lr-move__tag">Common</span>
          <div class="lr-degrees">
            <b class="cs">CRIT</b><span>He reads it aloud, laughs once, and names the one person who could fill it, and where he sits.</span>
            <b class="s">SUCCESS</b><span>"Not me. Try the tea house; ask for the old man at the corner table."</span>
            <b class="f">FAIL</b><span>A shrug, and "try the stores". They learn nothing, and lose nothing.</span>
            <b class="cf">CRIT FAIL</b><span>He takes it as a joke at his expense and sends them to the wrong shop.</span>
          </div>
          <div class="lr-changes">Changes: success finds <b>who can read it</b> · crit fail ticks the clock</div>
        </div>
        <div class="lr-move"><div class="lr-move__top"><span class="lr-move__if">If they lean on him to fill it as written</span><span class="lr-move__roll">Coerce · Intimidation 17</span></div><span class="lr-move__tag">Plausible</span></div>
        <div class="lr-move"><div class="lr-move__top"><span class="lr-move__if">If they offer him something for his trouble</span><span class="lr-move__roll">Make an Impression · 15</span></div><span class="lr-move__tag">Plausible</span></div>
        <div class="lr-move"><div class="lr-move__top"><span class="lr-move__if">If they ask what he makes of the people who sent them</span><span class="lr-move__roll">free</span></div><span class="lr-move__tag">Long shot</span></div>
      </div>
      <div class="lr-col">
        <span class="lr-legend">Discoveries</span>
        <div class="lr-disc is-found">What's wrong with the docket<span class="lr-routes">found by Society, crit</span></div>
        <div class="lr-disc is-thin">Who can read it<span class="lr-routes"><i></i><i class="is-gone"></i><i class="is-gone"></i> 1 route left: the storekeeper</span></div>
        <div class="lr-disc">A friend in the city (optional)<span class="lr-routes"><i></i><i></i> 2 routes</span></div>
        <span class="lr-legend">The floor tonight</span>
        <div class="lr-floor">
          ${dot("etsuko")}<span>Etsuko</span><em>2</em>
          ${dot("masaru")}<span>Masaru</span><em>1</em>
          ${dot("nren")}<span>Ren</span><em class="is-none">none yet</em>
          ${dot("hiroshi")}<span>Hiroshi</span><em>1</em>
          ${dot("yumiko")}<span>Yumiko</span><em>2</em>
          ${dot("susumu")}<span>Susumu</span><em class="is-none">none yet</em>
        </div>
        <span class="lr-legend">Not prepared, tonight</span>
        <div class="lr-log">Tried to post the docket back to the office with a forged stamp · Trick · hard · failure</div>
      </div>
    </div>`);
  drawer.style.width = `${drawerW}px`;
  root.append(drawer);
  title(root, "10", "Running a situation scene (GM)");
  root.querySelector(".lab-title").style.left = `${drawerW + 36}px`;
  const sub = el("div", "lab-sub", "Illustration: The Errand reshaped as a situation scene. An old draft, not canon; every line here is invented to show the shape.");
  Object.assign(sub.style, { left: `${drawerW + 38}px` });
  root.append(sub);
  note(root, 1, "Tap the kind of move a player describes; the prepared answers for where they are appear, likeliest first.", drawerW + 40, 180);
  note(root, 2, "A needed discovery down to its last route turns amber: time for a valve.", drawerW + 40, 250);
  note(root, 3, "Something nobody prepared for: three presses, logged, and Claude writes it in afterwards.", drawerW + 40, 320);
  freeze();
};

/**
 * 11. Puppets. The party's frames stand small in the wings; grab one by its
 * handle and it grows to full size and comes with your hand. Swing it and it
 * leans; stop and it wobbles; bump someone and they jolt and spring back.
 * Space hop, N nod, B bow, S shake, T turn your back. Drop it in the wings to
 * put it away; drop it on the stage and it lands in line.
 *
 * Live sync between tabs (BroadcastChannel) stands in for Foundry's module
 * socket, with simulated lag: ?user=gm|etsuko|masaru|... &lat=70&jitter=30.
 * ?script=1|2&t=<ms> plays a scripted performance for screenshots instead.
 */
// Not Taka: test character Kaneda Masaru was staged with the same portrait file (stage-demo.json), so
// the two would show one face twice.
PLATES.puppets = () => buildPuppetStage({ art: `${SCENE_ART}episode-c1e1--canteen.webp`, npcs: [["technical-track-student", 2], ["the-young-one", 6]], label: "The Canteen" });
PLATES.sockplay = () => buildPuppetStage({ art: `${PLACE_ART}row-b-block-8--common-room.png`, npcs: [["mrs-ueda", 1], ["hana", 7]], label: "The Rumour Mill" });

function buildPuppetStage({ art, npcs: npcPlan, label }) {
  const root = screen(art);
  deck(root);
  root.querySelector(".lab-deck").style.zIndex = "250"; // the deck is the booth's front edge: rods go behind it
  const shadowLayer = el("div", "lab-puppets");
  const layer = el("div", "lab-puppets");
  root.append(shadowLayer, layer);
  const script = Number(params.get("script") ?? 0);
  const me = params.get("user") ?? (script ? "etsuko" : "gm");
  const TAB = Math.random().toString(36).slice(2, 8);

  const FW = 220;
  const FH = npcHeight(FW);
  const ROD = 112;
  const floor = H() - 262 - 14;          // where frame bottoms stand on the stage
  const gripOnFloor = floor + ROD;       // ...so the grip is below the booth's edge, hidden
  const rackTop = H() - 78;
  const rackGrip = H() - 22;
  const geo = stageGeometry({ width: W(), height: H(), deck: 262, headcount: 6 });
  const cols = geo.columns;
  const wingSlots = { etsuko: 92, masaru: 222, nren: 352, hiroshi: W() - 352, yumiko: W() - 222, susumu: W() - 92 };
  const colourOf = (user) => (user === "gm" ? "#f3e7c4" : pc(user)?.who ?? "#ffffff");
  const nameOf = (user) => (user === "gm" ? "GM" : pc(user)?.name ?? user);

  // The wings: two racks the rods slot into.
  for (const side of ["left", "right"]) {
    const rack = el("div", "lab-rack", `<span class="lab-rack__plate">Wings</span>`);
    Object.assign(rack.style, side === "left" ? { left: "22px", width: "400px" } : { right: "22px", width: "400px" });
    const xs = side === "left" ? [wingSlots.etsuko, wingSlots.masaru, wingSlots.nren] : [wingSlots.hiroshi, wingSlots.yumiko, wingSlots.susumu];
    for (const x of xs) {
      const slot = el("span", "lab-rack__slot");
      slot.style.left = `${side === "left" ? x - 22 : x - (W() - 422)}px`;
      rack.append(slot);
    }
    root.append(rack);
  }

  const puppets = [];
  const views = new Map();
  const add = (person, kind, state) => {
    const p = createPuppet({ id: person.id, rod: ROD, w: FW, h: FH, ...state });
    p.kind = kind;
    p.owner = kind === "pc" ? person.id : "gm";
    puppets.push(p);
    const v = { root: el("div", "lab-puppet"), pivot: el("div", "lab-puppet__pivot"), turn: el("div", "lab-puppet__turn"), shadow: el("div", "lab-shadow") };
    const body = el("div", "lab-puppet__body");
    Object.assign(body.style, { width: `${FW}px`, left: `${-FW / 2}px` });
    const fig = kind === "pc" ? pcFrame(person, { w: FW, seat: me === "gm" ? "gm" : "player", own: me === person.id }) : npcFrame(person, { w: FW, seat: me === "gm" ? "gm" : "player" });
    const back = el("div", "lab-puppet__back", `<span class="lab-puppet__label">${person.name}</span>`);
    back.style.setProperty("--back-w", `${FW}px`);
    v.turn.append(fig, back);
    const rod = el("div", "lab-puppet__rod", "<i></i>");
    rod.style.height = `${ROD}px`;
    body.append(v.turn, rod);
    v.pivot.append(body);
    v.who = el("div", "lab-puppet__who");
    v.root.append(v.pivot, el("div", "lab-puppet__hand", '<i class="fa-solid fa-hand"></i>'), v.who);
    layer.append(v.root);
    shadowLayer.append(v.shadow);
    views.set(p.id, v);
    return p;
  };
  for (const m of PCS) add(m, "pc", { x: wingSlots[m.id], y: rackGrip, scale: FEEL.parked, home: "wings" });
  for (const [id, col] of npcPlan) add(NPC[id], "npc", { x: cols[col], y: gripOnFloor, scale: 1, home: "stage" });
  const P = (id) => puppets.find((p) => p.id === id);

  const paint = (p) => {
    const v = views.get(p.id);
    const pose = verbPose(p);
    const x = p.x + p.jx;
    const y = p.y - pose.lift + pose.dip;
    v.root.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    v.pivot.style.transform = `rotate(${p.lean.toFixed(2)}deg) scale(${p.scale.toFixed(3)})`;
    v.turn.style.transform = `rotateX(${pose.tipX.toFixed(1)}deg) rotateY(${(p.turn + pose.shakeY).toFixed(1)}deg) scale(${(2 - pose.squash).toFixed(3)}, ${pose.squash.toFixed(3)})`;
    v.root.classList.toggle("is-held", Boolean(p.heldBy));
    v.root.classList.toggle("is-remote", Boolean(p.heldBy) && p.heldBy !== me);
    v.root.classList.toggle("is-resting", !p.heldBy && p.home === "stage");
    v.root.style.zIndex = String(p.heldBy ? 220 : p.home === "wings" ? 20 : 100 + Math.round(p.restY / 20));
    v.root.style.setProperty("--holder", colourOf(p.heldBy));
    v.who.textContent = p.heldBy ? nameOf(p.heldBy) : "";
    const ground = !p.heldBy && p.home === "wings" ? rackTop : floor;
    const feet = y - p.rod * p.scale;
    const height = Math.max(0, ground - feet);
    const sw = FW * p.scale * (0.9 + height / 700);
    v.shadow.style.width = `${sw.toFixed(0)}px`;
    v.shadow.style.transform = `translate(${(x - sw / 2).toFixed(1)}px, ${ground}px)`;
    v.shadow.style.opacity = (Math.max(0, 0.85 - height / 520)).toFixed(2);
  };

  const touching = new Set();
  const impacts = [];
  let clock = 0;
  const buffers = new Map();
  const tick = (dt) => {
    clock += dt;
    const wall = Date.now();
    for (const p of puppets) {
      if (p.heldBy && p.heldBy !== me && buffers.has(p.id)) {
        const g = buffers.get(p.id).at(wall);
        if (g) p.target = g;
      }
      stepPuppet(p, dt);
    }
    for (const hit of collide(puppets, touching)) impacts.push({ ...hit, at: clock });
  };
  const impact = (hit, age) => {
    const node = el("div", "lab-impact");
    Object.assign(node.style, { left: `${hit.x}px`, top: `${hit.y}px`, opacity: String(Math.max(0, 1 - age / 0.35)) });
    for (let i = 0; i < 9; i++) {
      const ray = el("i");
      ray.style.transform = `rotate(${i * 40 + 10}deg) translateY(${14 + age * 60}px)`;
      node.append(ray);
    }
    root.append(node);
  };

  // The column a frame lands in: the nearest one nobody else is standing in.
  const landingX = (p, x) => {
    const taken = puppets.filter((q) => q !== p && !q.heldBy && q.home === "stage").map((q) => q.restX);
    const free = cols.filter((c) => taken.every((t) => Math.abs(t - c) > geo.pitch / 2));
    return (free.length ? free : cols).reduce((best, c) => (Math.abs(c - x) < Math.abs(best - x) ? c : best));
  };
  const inWings = (p) => {
    const b = box(p);
    const cx = (b.left + b.right) / 2;
    return b.bottom > H() - 360 && (cx < 450 || cx > W() - 450);
  };
  const land = (p) => {
    if (p.kind === "pc" && inWings(p)) {
      p.home = "wings"; p.restX = wingSlots[p.id]; p.restY = rackGrip; p.scaleTo = FEEL.parked;
    } else {
      p.home = "stage"; p.restX = landingX(p, p.x); p.restY = gripOnFloor; p.scaleTo = FEEL.held;
    }
    p.heldBy = null;
    p.target = null;
  };

  // --- Scripted performances (screenshots) -------------------------------
  if (script) {
    const T = (FREEZE ?? 1400) / 1000;
    const dt = 1 / 120;
    // &anim=1: frames for an animation, so cues sit at fixed times and the
    // still-only extras (motion trail, notes) are left out.
    const anim = params.has("anim");
    const hopAt = anim ? 1.0 : T - 0.3;
    const path = (keys, t) => {
      if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
      for (let i = 1; i < keys.length; i++) {
        if (t <= keys[i][0]) {
          const [t0, x0, y0] = keys[i - 1];
          const [t1, x1, y1] = keys[i];
          const u = (t - t0) / (t1 - t0);
          const e = u * u * (3 - 2 * u);
          return { x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e };
        }
      }
      const last = keys[keys.length - 1];
      return { x: last[1], y: last[2] };
    };
    const history = [];
    if (script === 1) {
      // Masaru already stands on stage; Yumiko's player is holding hers up, about to hop.
      const masaru = P("masaru");
      Object.assign(masaru, { home: "stage", x: cols[4], y: gripOnFloor, restX: cols[4], restY: gripOnFloor, scale: 1, scaleTo: 1 });
      const yumiko = P("yumiko");
      Object.assign(yumiko, { home: "stage", heldBy: "yumiko", x: cols[5] + 60, y: floor - 40, scale: 1, scaleTo: 1 });
      yumiko.target = { x: cols[5] + 60, y: floor - 40 };
      // Out of the wings, up, and a swing into the technical student.
      const etsukoPath = [[0.1, wingSlots.etsuko, rackGrip], [0.6, 380, floor + 15], [0.9, 602, floor - 25], [1.35, 470, floor - 45]];
      for (let t = 0; t < T; t += dt) {
        const e = P("etsuko");
        if (t >= 0.1 && !e.heldBy) { e.heldBy = "etsuko"; e.home = "stage"; e.scaleTo = FEEL.held; }
        if (e.heldBy) e.target = path(etsukoPath, t);
        if (Math.abs(t - hopAt) < dt / 2) perform(yumiko, "hop");
        if (anim && Math.abs(t - 1.62) < dt / 2) perform(e, "nod");
        tick(dt);
        history.push({ t, x: e.x + e.jx, y: e.y, lean: e.lean, scale: e.scale });
      }
    } else {
      // A sock play at the Rumour Mill: four of the party on stage, mid-performance.
      const on = { etsuko: [2, "bow", 0.55], masaru: [3, "turn", 0], nren: [4, "shake", 0.6], hiroshi: [5, "hop", 0.7] };
      for (const [id, [col, verb, at]] of Object.entries(on)) {
        const p = P(id);
        Object.assign(p, { home: "stage", x: cols[col], y: gripOnFloor - 30, restX: cols[col], restY: gripOnFloor, scale: 1, scaleTo: 1, heldBy: id });
        p.target = { x: cols[col], y: gripOnFloor - 30 };
        p.cue = { verb, at };
      }
      for (let t = 0; t < T; t += dt) {
        for (const p of puppets) if (p.cue && Math.abs(t - p.cue.at) < dt / 2) perform(p, p.cue.verb);
        tick(dt);
      }
    }
    for (const p of puppets) paint(p);
    // A motion trail behind the frame being swung, for the still picture only.
    if (script === 1 && !anim) {
      const e = P("etsuko");
      const v = views.get("etsuko");
      for (const back of [0.045, 0.09, 0.135]) {
        const h = history.reduce((best, s) => (Math.abs(s.t - (T - back)) < Math.abs(best.t - (T - back)) ? s : best), history[0]);
        const ghost = v.root.cloneNode(true);
        ghost.classList.add("lab-ghost");
        ghost.style.transform = `translate(${h.x.toFixed(1)}px, ${h.y.toFixed(1)}px)`;
        ghost.querySelector(".lab-puppet__pivot").style.transform = `rotate(${h.lean.toFixed(2)}deg) scale(${h.scale.toFixed(3)})`;
        ghost.style.zIndex = "210";
        layer.append(ghost);
      }
      void e;
    }
    for (const hit of impacts) if (clock - hit.at < 0.35) impact(hit, clock - hit.at);
    title(root, script === 1 ? "11" : "12", script === 1 ? "Puppets: pick your frame up by its handle" : `A sock play at ${label}`);
    if (anim) {
      freeze();
      return;
    }
    if (script === 1) {
      const e = P("etsuko");
      note(root, 1, "The wings: everyone's card stands here, small, until its player picks it up by the handle.", 36, 900);
      note(root, 2, "Picked up, it grows to full size and comes with your hand. Swing it and it leans; stop and it wobbles, a little.", e.x - 520, 360);
      note(root, 3, "Bump into someone and they jolt and spring back to their place. Nobody can move your card but you.", P("masaru").x + 150, 420);
      note(root, 4, "Another player's puppet, on every screen as they move it: only the hand's position is sent, 30 times a second.", P("yumiko").x + 140, 560);
    } else {
      note(root, 1, "Bow (B): a slow tip towards the table.", P("etsuko").x - 300, 380);
      note(root, 2, "Turn your back (T): the brass back of the card, with your name on a label.", P("masaru").x - 180, 330);
      note(root, 3, "Shake (S): no.", P("nren").x + 40, 440);
      note(root, 4, "Hop (Space).", P("hiroshi").x + 60, 340);
    }
    freeze();
    return;
  }

  // --- Live -----------------------------------------------------------------
  const net = new BroadcastChannel("bi-puppets-lab");
  const LAT = Number(params.get("lat") ?? 70);
  const JIT = Number(params.get("jitter") ?? 30);
  const send = (msg) => net.postMessage({ ...msg, from: me, tab: TAB });
  const lastSent = new Map();
  net.onmessage = (ev) => {
    const msg = ev.data;
    if (msg.tab === TAB) return;
    setTimeout(() => receive(msg), LAT + Math.random() * JIT);
  };
  let held = null;
  let receivedCount = 0;
  const receive = (msg) => {
    const p = P(msg.id);
    if (!p) return;
    receivedCount += 1;
    if (msg.type === "grab") {
      const winner = arbitrate(p.grab, { user: msg.from, t: msg.t });
      if (winner.user !== msg.from) return;
      if (held?.p === p) held = null;
      p.grab = winner;
      p.heldBy = msg.from; p.home = "stage"; p.scaleTo = FEEL.held;
      buffers.set(p.id, new GripBuffer({ delay: 100 }));
    } else if (msg.type === "move") {
      buffers.get(p.id)?.push({ x: msg.x, y: msg.y, t: msg.t });
    } else if (msg.type === "release") {
      Object.assign(p, { heldBy: null, target: null, home: msg.home, restX: msg.restX, restY: msg.restY, scaleTo: msg.home === "wings" ? FEEL.parked : FEEL.held, grab: null });
      buffers.delete(p.id);
    } else if (msg.type === "verb") {
      perform(p, msg.verb);
    }
  };
  const local = (e) => {
    const r = root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const canGrab = (p) => me === "gm" || p.owner === me;
  layer.addEventListener("pointerdown", (e) => {
    const node = e.target.closest(".lab-puppet");
    const p = node && puppets.find((q) => views.get(q.id).root === node);
    if (!p || !canGrab(p) || (p.heldBy && p.heldBy !== me)) return;
    e.preventDefault();
    const pt = local(e);
    const onRod = Boolean(e.target.closest(".lab-puppet__rod"));
    held = { p, ox: 0, oy: onRod ? pt.y - p.y : -ROD * 0.85 };
    p.grab = { user: me, t: Date.now() };
    p.heldBy = me; p.home = "stage"; p.scaleTo = FEEL.held;
    p.target = { x: pt.x - held.ox, y: pt.y - held.oy };
    send({ type: "grab", id: p.id, t: p.grab.t });
  });
  window.addEventListener("pointermove", (e) => {
    if (!held) return;
    const pt = local(e);
    held.p.target = { x: pt.x - held.ox, y: pt.y - held.oy };
    const now = Date.now();
    const t = held.p.target;
    if (shouldSend(lastSent.get(held.p.id), t.x, t.y, now)) {
      send({ type: "move", id: held.p.id, x: t.x, y: t.y, t: now });
      lastSent.set(held.p.id, { x: t.x, y: t.y, t: now });
    }
  });
  window.addEventListener("pointerup", () => {
    if (!held) return;
    const p = held.p;
    held = null;
    land(p);
    p.grab = null;
    send({ type: "release", id: p.id, home: p.home, restX: p.restX, restY: p.restY });
  });
  const KEYS = { " ": "hop", n: "nod", b: "bow", s: "shake", t: "turn" };
  window.addEventListener("keydown", (e) => {
    const verb = KEYS[e.key.toLowerCase()];
    if (!held || !verb) return;
    e.preventDefault();
    perform(held.p, verb);
    send({ type: "verb", id: held.p.id, verb });
  });
  const hint = el("div", "lab-verbs", `<b>HOLD</b> the handle (or the frame) to pick it up<br>
    <b>SPACE</b> hop &nbsp; <b>N</b> nod &nbsp; <b>B</b> bow &nbsp; <b>S</b> shake &nbsp; <b>T</b> turn your back<br>
    <b>DROP</b> on the stage to stand there, in the wings to put it away
    <div class="lab-net">You are <b style="color:${colourOf(me)}">${nameOf(me)}</b>. Open this page in another tab with <code>&amp;user=yumiko</code> to play together. Sync: 30 a second, drawn 100 ms behind, simulated lag ${LAT}±${JIT} ms.</div>`);
  root.append(hint);
  title(root, "Live", `Puppets at ${label}`);
  const DT = 1 / 120;
  let acc = 0;
  let last = performance.now();
  const loop = (now) => {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= DT) { tick(DT); acc -= DT; }
    for (const p of puppets) paint(p);
    root.querySelectorAll(".lab-impact").forEach((n) => n.remove());
    for (const hit of impacts) if (clock - hit.at < 0.35) impact(hit, clock - hit.at);
    while (impacts.length && clock - impacts[0].at > 0.5) impacts.shift();
    requestAnimationFrame(loop);
  };
  for (const p of puppets) paint(p);
  requestAnimationFrame(loop);
  // For checking sync from devtools: the live state, read-only by convention.
  window.__puppets = { puppets, buffers, me, received: () => receivedCount, tick };
}

/** Live: one debut after another, a new performance each time. */
PLATES.live = () => {
  const root = screen(`${PLACE_ART}the-bathhouse-447--pool.png`);
  title(root, "Live", "A new performance every few seconds");
  deck(root);
  const stage = el("div", "lab-stage");
  root.append(stage);
  const sig = el("div", "lab-sub");
  sig.style.top = "80px";
  root.append(sig);
  const geo = stageGeometry({ width: W(), height: H(), deck: 262, headcount: 6 });
  const people = [NPC.kazue, NPC.hachi, NPC.sigrun, NPC["section-officer"], NPC.tokuji, NPC.genzo];
  let seed = SEED;
  const one = () => {
    stage.replaceChildren();
    const p = people[seed % people.length];
    const side = ["left", "centre", "right"][seed % 3];
    const x = side === "left" ? W() * 0.3 : side === "right" ? W() * 0.68 : W() / 2;
    const pos = { x, bottom: geo.rows.mid.bottom, z: 10 };
    const fig = npcFrame(p, { w: geo.frameW });
    const wrap = place(stage, fig, pos, geo.frameW);
    const recipe = composeDebut({ seed: hashString(`${p.id}:${seed}`), family: familyFor(p), side });
    debut(stage, wrap, fig, p, recipe, pos, geo.frameW);
    sig.innerHTML = `<b style="font-family:var(--bi-font-legend);letter-spacing:.18em;color:var(--bi-brass-lit)">${p.name.toUpperCase()}</b> &nbsp; ${recipe.family} · ${recipe.signature} · ${recipe.total} ms`;
    seed += 1;
  };
  one();
  setInterval(one, 4600);
};

/**
 * Live: drag a mini frame. Pick-up wiggle, tilt with the hand's speed,
 * a ghost slot on the grid, magnets moving whoever is in the way, and a
 * spring landing. Everything here is the client-side feel only; the real
 * move travels to the GM as a query and comes back as stage data.
 */
PLATES.drag = () => {
  const root = screen(`${PLACE_ART}the-crew-mess--bar.png`);
  title(root, "Live", "Pick a frame up and put it down", "Drag any of the party's frames. It lifts with a wiggle, tilts as you move it, shows where it will land, and lands in line. Whoever is in the way slides aside.");
  deck(root);
  const stage = el("div", "lab-stage");
  root.append(stage);
  const geo = stageGeometry({ width: W(), height: H(), deck: 262, headcount: 6 });
  const rows = ["front", "mid"];
  for (const row of rows) for (const x of geo.columns) {
    const dot = el("span", "bi-grid-dot");
    dot.style.left = `${x}px`;
    dot.style.top = `${geo.rows[row].bottom + 8}px`;
    dot.style.opacity = "0";
    dot.dataset.grid = "1";
    root.append(dot);
  }
  const w = geo.frameW;
  const hMini = Math.round((w - 12) * 0.62 + 62);
  const occupancy = new Map(PCS.map((m, i) => [m.id, { row: "front", col: i + 1 }]));
  const wraps = new Map();
  const at = (slot) => ({ x: geo.columns[slot.col], bottom: geo.rows[slot.row].bottom });
  const put = (id, animate = true) => {
    const wrap = wraps.get(id);
    const p = at(occupancy.get(id));
    const left = p.x - w / 2;
    const bottom = H() - p.bottom;
    if (!animate) { wrap.style.left = `${left}px`; wrap.style.bottom = `${bottom}px`; return; }
    const from = wrap.getBoundingClientRect();
    wrap.style.left = `${left}px`;
    wrap.style.bottom = `${bottom}px`;
    const to = wrap.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    // A spring, sampled: the overshoot and settle that reads as "magnetic".
    const frames = damped(1, { cycles: 1.4, decay: 5.5, samples: 16 }).map((k) => ({ offset: k.offset, transform: `translate(${(dx * k.value).toFixed(1)}px, ${(dy * k.value).toFixed(1)}px)` }));
    frames[0].transform = `translate(${dx}px, ${dy}px)`;
    wrap.animate(frames, { duration: 620, easing: "linear" });
  };
  for (const m of PCS) {
    const wrap = place(stage, miniFrame(m, { w }), { x: 0, bottom: 0, z: 30 }, w);
    wraps.set(m.id, wrap);
    wrap.style.transition = "none";
    wrap.style.cursor = "grab";
    put(m.id, false);
  }
  const ghost = el("div", "bi-slot-ghost");
  ghost.style.display = "none";
  root.append(ghost);

  let drag = null;
  stage.addEventListener("pointerdown", (event) => {
    const wrap = event.target.closest(".lab-place");
    if (!wrap) return;
    event.preventDefault();
    const id = [...wraps].find(([, v]) => v === wrap)[0];
    const rect = wrap.getBoundingClientRect();
    drag = { id, wrap, dx: event.clientX - rect.left, dy: event.clientY - rect.top, lastX: event.clientX, vx: 0, slot: occupancy.get(id) };
    try { wrap.setPointerCapture(event.pointerId); } catch { /* a synthetic pointer has nothing to capture */ }
    wrap.classList.add("is-dragging");
    wrap.style.zIndex = "400";
    root.querySelectorAll("[data-grid]").forEach((d) => (d.style.opacity = "1"));
    // The pick-up wiggle: a quick damped rotation, as if it came off a magnet.
    const fig = wrap.firstElementChild;
    fig.animate(damped(7, { cycles: 2.6, decay: 5, samples: 14 }).map((k) => ({ offset: k.offset, rotate: `${k.value.toFixed(2)}deg` })), { duration: 520, easing: "linear" });
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const vx = event.clientX - drag.lastX;
    drag.vx = drag.vx * 0.7 + vx * 0.3;
    drag.lastX = event.clientX;
    const rootRect = root.getBoundingClientRect();
    const left = event.clientX - rootRect.left - drag.dx;
    const top = event.clientY - rootRect.top - drag.dy;
    drag.wrap.style.left = `${left}px`;
    drag.wrap.style.bottom = `${H() - top - hMini}px`;
    drag.wrap.style.setProperty("--tilt", `${Math.max(-10, Math.min(10, drag.vx * 0.9)).toFixed(1)}deg`);
    const slot = nearestSlot(geo, left + w / 2, top + hMini, "pc");
    drag.target = slot;
    const p = at(slot);
    Object.assign(ghost.style, { display: "block", left: `${p.x - w / 2 - 6}px`, width: `${w + 12}px`, top: `${p.bottom - hMini - 6}px`, height: `${hMini + 12}px` });
  });
  const drop = () => {
    if (!drag) return;
    const { id, wrap, target } = drag;
    wrap.classList.remove("is-dragging");
    wrap.style.zIndex = "30";
    ghost.style.display = "none";
    root.querySelectorAll("[data-grid]").forEach((d) => (d.style.opacity = "0"));
    if (target) {
      const before = new Map(occupancy);
      const next = dropInto(occupancy, id, { row: target.row, col: target.col }, { columns: geo.columns.length });
      occupancy.clear();
      for (const [k, v] of next) occupancy.set(k, v);
      for (const [k, v] of occupancy) if (k === id || before.get(k)?.col !== v.col || before.get(k)?.row !== v.row) put(k, true);
      // The landing: a small squash, as if it clicked into place.
      wrap.firstElementChild.animate([{ scale: "1.06 0.94" }, { scale: "0.98 1.03", offset: 0.5 }, { scale: "1 1" }], { duration: 260, delay: 240, easing: "ease-out" });
    }
    drag = null;
  };
  stage.addEventListener("pointerup", drop);
  stage.addEventListener("pointercancel", drop);
};

/* ------------------------------------------------------------------ */

if (PLATES[PLATE]) PLATES[PLATE]();
else Promise.all([import("./dio-lab.mjs"), import("./dio-stage.mjs")]).then(([a, b]) => ({ ...a.DIO_PLATES, ...b.STAGE_PLATES })[PLATE] ?? PLATES.debut).then((f) => f()).catch((e) => {
  // Say so on the page: a broken plate must never screenshot as a black frame.
  const box = el("pre", "lab-error", `${e.name}: ${e.message}\n${e.stack ?? ""}`);
  document.body.append(box);
  throw e;
});
