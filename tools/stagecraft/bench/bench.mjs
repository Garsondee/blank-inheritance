/**
 * The Stagecraft bench: the real engine (module/stagecraft/scripts/core/stage.mjs), the real three.js renderer and the
 * adventure's real stage entries (module/blank-inheritance/stagecraft/stages.json), in a plain browser page with no
 * Foundry. It exists to see blocking, routines, entrances, moments and the fight board working quickly, and to take
 * pictures of them; the live checks (foundry-check.mjs, episode-check.mjs) remain the proof that it works inside Foundry.
 *
 *   py tools/induction-terminal/serve.py 4191
 *   http://localhost:4191/tools/stagecraft/bench/?stage=haunt-the-paper-lantern&party=4
 *
 * The cast is the entry's own people (by their ids, with their portraits from assets/stage) plus a stand-in party.
 * `window.bench` is there for scripted pictures.
 */

import { describeScene } from "/module/stagecraft/scripts/core/scene.mjs";
import { Stage } from "/module/stagecraft/scripts/core/stage.mjs";
import { FORMATIONS } from "/module/stagecraft/scripts/core/formations.mjs";
import { ThreeBackend } from "/module/stagecraft/scripts/render/three/backend.mjs";
import { ImageCache } from "/module/stagecraft/scripts/render/images.mjs";
import { mirrorCards, descriptionFor, momentMoves, momentsOf, summonsForTrigger, formationRequest, ORB_COLLAR, DECK_MAX_SCALE } from "/module/blank-inheritance/scripts/core/stagecraft-bridge.mjs";
import { deckFit } from "/module/blank-inheritance/scripts/core/deck-layout.mjs";
import { coverOnPage } from "/module/stagecraft/scripts/foundry/blocking.mjs";
import { brass } from "/module/blank-inheritance/scripts/foundry/stagecraft-brass-skin.mjs";

const params = new URLSearchParams(location.search);
const route = (p) => (typeof p === "string" && p.startsWith("modules/") ? `/module/${p.slice("modules/".length)}` : p);
const title = (key) => key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ (\d)$/, " $1");
const PARTY = [
  ["sato-hiroshi", "Hiroshi", "#e3c45a"], ["kaneda-masaru", "Masaru", "#e06a5a"], ["kimura-etsuko", "Etsuko", "#5fb3d9"],
  ["watanabe-yumiko", "Yumiko", "#c99be0"], ["nakamura-ren", "Ren", "#86c76a"], ["technical-track-student", "Kenji", "#f0a35e"]
];

// the fonts the brass skin writes with, as the adventure's own stylesheet would load them
for (const [family, file, weight] of [["Chakra Petch", "chakra-petch-700", 700], ["Chakra Petch", "chakra-petch-400", 400], ["Special Elite", "special-elite-400", 400], ["Shippori Mincho", "shippori-mincho-700", 600]]) {
  const face = new FontFace(family, `url(/module/blank-inheritance/assets/fonts/${file}.woff2)`, { weight: String(weight) });
  document.fonts.add(face);
  face.load().catch(() => {});
}

const stages = await (await fetch("/module/blank-inheritance/stagecraft/stages.json", { cache: "no-store" })).json();
const ids = Object.keys(stages.stages);
const which = ids.includes(params.get("stage")) ? params.get("stage") : ids[0];
const entry = stages.stages[which];
const pick = document.getElementById("pick");
pick.innerHTML = ids.map((id) => `<option value="${id}" ${id === which ? "selected" : ""}>${id}</option>`).join("");
pick.addEventListener("change", () => { params.set("stage", pick.value); location.search = params.toString(); });

const raw = descriptionFor(stages, entry);
const { scene, problems } = describeScene({ ...raw, painting: { ...raw.painting, src: route(raw.painting.src) } });
if (problems.length) console.warn("bench | the description has notes:", problems);

// the shared clock: seconds since 1970, as Foundry's server time is, so routines run on the numbers they run on for real
const base = Date.now() / 1000 - performance.now() / 1000;
const clock = () => base + performance.now() / 1000;

/* ---------------------------------------------------------------- the cast */

const summoned = new Set(Object.values(entry.onTrigger ?? {}).flatMap((t) => (t.summon ?? []).map((s) => s.id)));
const member = (key, extra = {}) => ({ portraitId: `summon-${key}`, label: title(key), img: `modules/blank-inheritance/assets/stage/${key}.webp`, revealed: true, ...extra });
const partyCount = Math.max(0, Math.min(6, Number(params.get("party") ?? 4)));
let published = [
  ...Object.keys(entry.places ?? {}).filter((k) => !summoned.has(k)).map((k) => member(k)),
  ...PARTY.slice(0, partyCount).map(([art, name], i) => ({ portraitId: `pc-${i + 1}`, label: name, img: `modules/blank-inheritance/assets/stage/${art}.webp`, kind: "pc", actorId: `pc-${i + 1}` }))
];
let cards = mirrorCards({ published, def: entry, now: params.get("enter") === "1" ? clock() + 0.5 : clock() - 600 });
const colourOf = new Map(PARTY.map(([, name, colour]) => [name, colour]));
const asPerson = (c) => ({ ...c, portrait: route(c.portrait), colour: c.pc ? colourOf.get(c.name) ?? null : c.colour ?? null });
const keyOf = (id) => (id.startsWith("summon-") ? id.slice(7) : null);

/* ---------------------------------------------------------------- the stage */

// The adventure's deck along the bottom of the screen, its orb rising out of the middle, laid out as the adventure lays it
// out (deck-layout.mjs deckFit): drawn as a dark silhouette unless ?deck=0, so a picture shows what the table sees, and
// given to the stage as its cover, as the adventure gives it in Foundry, so formations keep clear of it.
const showDeck = params.get("deck") !== "0";
const deckWindow = () => {
  const fit = deckFit({ viewportWidth: innerWidth, viewportHeight: innerHeight, rightReserve: 48, maxScale: DECK_MAX_SCALE });
  const top = innerHeight - fit.faceplateHeight;
  const r = (ORB_COLLAR * fit.scale) / 2;
  return [{ rect: [fit.left, top, fit.left + fit.width, innerHeight] }, { circle: [fit.left + fit.width / 2, innerHeight - fit.crownHeight + r, r] }];
};
function drawDeck() {
  document.getElementById("bench-deck")?.remove();
  if (!showDeck) return;
  const [plate, orb] = deckWindow();
  const el = document.createElement("div");
  el.id = "bench-deck";
  el.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:5";
  el.innerHTML = `<div style="position:absolute;left:${plate.rect[0]}px;top:${plate.rect[1]}px;width:${plate.rect[2] - plate.rect[0]}px;height:${plate.rect[3] - plate.rect[1]}px;background:rgba(18,18,20,0.92);border-top:2px solid #6d5a36;border-radius:10px 10px 0 0"></div>`
    + `<div style="position:absolute;left:${orb.circle[0] - orb.circle[2]}px;top:${orb.circle[1] - orb.circle[2]}px;width:${orb.circle[2] * 2}px;height:${orb.circle[2] * 2}px;border-radius:50%;background:radial-gradient(circle,#c8782c 0 36%,#2a2a2e 37% 46%,#9a9aa2 47% 100%)"></div>`;
  document.body.append(el);
}

const people = cards.map(asPerson);
const backend = new ThreeBackend({ images: new ImageCache() });
const cover = () => (showDeck && backend.view ? coverOnPage(deckWindow(), { left: 0, top: 0 }, backend.view) : []);
const stage = new Stage(scene, people, { card: brass.size, clock, cover });
const host = document.getElementById("stage");
backend.mount(host, { quality: params.get("tier") ?? "high", pixelRatio: devicePixelRatio, width: innerWidth, height: innerHeight });
await backend.load(scene, brass, people);
drawDeck();
addEventListener("resize", () => { backend.resize(innerWidth, innerHeight, devicePixelRatio); drawDeck(); });

const selected = new Set();
let last = performance.now();
function frame(now) {
  stage.advance((now - last) / 1000);
  last = now;
  backend.draw(stage.snapshot({ viewer: "me", selected }));
  stage.drain();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------------------------------------------------------------- the hand */

let dragging = null;
const local = (e) => { const r = host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
backend.canvas.addEventListener("pointerdown", (e) => {
  const p = local(e);
  const hit = backend.pick(p.x, p.y);
  if (hit?.kind !== "card") return;
  if (e.shiftKey) { if (selected.has(hit.id)) selected.delete(hit.id); else selected.add(hit.id); return; }
  if (!stage.hold(hit.id, "me")) return;
  const at = backend.floorAt(p.x, p.y, hit.point.y);
  const c = stage.cards.get(hit.id);
  dragging = { id: hit.id, height: hit.point.y, offX: (at?.x ?? c.puppet.x) - c.puppet.x, offZ: (at?.z ?? c.Z) - c.Z };
  backend.canvas.setPointerCapture(e.pointerId);
});
backend.canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = local(e);
  const at = backend.floorAt(p.x, p.y, dragging.height);
  if (at) stage.setHand(dragging.id, { x: at.x - dragging.offX, z: at.z - dragging.offZ });
});
const letGo = () => { if (dragging) stage.release(dragging.id); dragging = null; };
backend.canvas.addEventListener("pointerup", letGo);
backend.canvas.addEventListener("pointercancel", letGo);
addEventListener("keydown", (e) => {
  if (e.code === "KeyH") document.getElementById("panel").classList.toggle("hidden");
  if (!dragging) return;
  if (e.code === "Space") stage.perform(dragging.id, "hop");
  if (e.code === "KeyN") stage.perform(dragging.id, "nod");
  if (e.code === "KeyB") stage.perform(dragging.id, "bow");
});

/* ---------------------------------------------------------------- what the GM's strip does, done here directly */

const LEAD = 0.2;
function walk(moves) {
  const t0 = clock() + LEAD;
  for (const m of moves) {
    stage.walkTo(m.id, m.mark ? { mark: m.mark } : { at: m.at }, { t0, gait: m.gait ?? "walk", yaw: m.yaw ?? null, lean: m.lean ?? 0, pitch: m.pitch ?? 0, still: m.still ?? true, packed: m.packed ?? false });
  }
  return moves;
}
function formation(kind, opts = {}) {
  const chosen = selected.size ? [...selected] : null;
  return walk(stage.formationMoves(kind, { ids: chosen, party: !!chosen, ...opts }));
}
function moment(id) {
  const m = entry.moments?.[id];
  if (!m) return [];
  const moves = walk(momentMoves(m, cards, keyOf));
  const request = formationRequest(m.formation, cards, keyOf);
  if (request) walk(stage.formationMoves(request.kind, request.opts));
  if (typeof m.board === "boolean") stage.setBoard(m.board);
  if (typeof m.life === "boolean") stage.setLife(m.life);
  refresh();
  return moves;
}
async function trigger(id) {
  const summons = summonsForTrigger(entry, id);
  published = [...published, ...summons.filter((s) => !published.some((p) => p.portraitId === `summon-${s.id}`)).map((s) => ({ portraitId: `summon-${s.id}`, label: s.name, img: s.img, revealed: true }))];
  const before = new Set(cards.map((c) => c.id));
  cards = mirrorCards({ published, existing: cards, def: entry, now: clock() + 0.3 });
  for (const c of cards.filter((c) => !before.has(c.id))) {
    const person = asPerson(c);
    stage.addCard(person);
    await backend.addCard(person);
  }
  const m = entry.onTrigger?.[id]?.moment;
  if (m) setTimeout(() => moment(m), 400);
}

/* ---------------------------------------------------------------- the panel */

function button(parent, label, fn, on = null) {
  const b = document.createElement("button");
  b.textContent = label;
  b.addEventListener("click", () => { fn(); refresh(); });
  if (on) b.dataset.on = "1";
  b._on = on;
  parent.append(b);
  return b;
}
const switches = document.getElementById("switches");
button(switches, "Life", () => stage.setLife(!stage.lifeOn), () => stage.lifeOn);
button(switches, "Board", () => stage.setBoard(!stage.board), () => stage.board);
button(switches, "Places", () => walk(cards.filter((c) => Array.isArray(c.home)).map((c) => ({ id: c.id, at: c.home, yaw: c.homeYaw ?? 0, still: false, packed: false }))));
button(switches, "Clear choice", () => selected.clear());
const forms = document.getElementById("formations");
for (const kind of FORMATIONS) button(forms, kind, () => formation(kind));
const moms = document.getElementById("moments");
for (const m of momentsOf(entry)) button(moms, m.label, () => moment(m.id));
const trigs = document.getElementById("triggers");
for (const id of Object.keys(entry.onTrigger ?? {})) button(trigs, id, () => trigger(id));
function refresh() { for (const b of document.querySelectorAll("#panel button")) if (b._on) b.classList.toggle("on", !!b._on()); }
refresh();
if (params.get("panel") === "0") document.getElementById("panel").classList.add("hidden");
if (params.get("board") === "1") { stage.setBoard(true); refresh(); }

window.bench = { stage, backend, entry, cards: () => cards, selected, formation, moment, trigger, walk, clock, ready: true };
