/**
 * The host bench: the module's real Foundry-facing host (module/stagecraft/scripts/foundry/host.mjs) and the GM's real
 * blocking strip, running in a plain page against a small stand-in for Foundry, so the strip, selection, formations,
 * published moves and the walking they start can be seen and tried without a licensed Foundry. Scene updates and the
 * module socket travel between this page's tabs (BroadcastChannel), so a second tab opened as a player is a second
 * screen: what the GM does in one, the player sees in the other.
 *
 *   py tools/induction-terminal/serve.py 4192
 *   http://localhost:4192/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern            (the GM)
 *   http://localhost:4192/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern&seat=player (a player)
 *
 * The stand-in is only enough of Foundry for the host: hooks, a scene with flags and update(), users, the clock, the
 * socket, settings, i18n from the module's own language file. The live checks against the real Foundry remain the proof.
 */

const params = new URLSearchParams(location.search);
const seat = params.get("seat") === "player" ? "player" : "gm";
const route = (p) => (typeof p === "string" && p.startsWith("modules/") ? `/module/${p.slice("modules/".length)}` : p);

/* ---------------------------------------------------------------- a small Foundry */

class FakeHooks {
  #map = new Map();
  #n = 0;
  on(name, fn) { const id = ++this.#n; if (!this.#map.has(name)) this.#map.set(name, new Map()); this.#map.get(name).set(id, fn); return id; }
  once(name, fn) { const id = this.on(name, (...a) => { this.off(name, id); fn(...a); }); return id; }
  off(name, id) { this.#map.get(name)?.delete(id); }
  callAll(name, ...args) { for (const fn of [...(this.#map.get(name)?.values() ?? [])]) { try { fn(...args); } catch (err) { console.error(`hook ${name}`, err); } } return true; }
}

const lang = await (await fetch("/module/stagecraft/lang/en.json")).json();
const lookup = (key) => key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), lang) ?? key;
const users = [{ id: "gm", name: "Gamemaster", isGM: true, active: true }, { id: "p1", name: "Player", isGM: false, active: true }];
const me = users.find((u) => (seat === "gm" ? u.isGM : !u.isGM));

const wire = new BroadcastChannel("stagecraft-host-bench");
const socketListeners = new Map();
globalThis.Hooks = new FakeHooks();
globalThis.ui = { notifications: { info: (m) => console.info(m), warn: (m) => console.warn(m), error: (m) => console.error(m) } };
globalThis.CONST = { CANVAS_PERFORMANCE_MODES: { LOW: 1 } };
globalThis.foundry = { utils: { getRoute: route }, applications: { api: { DialogV2: { confirm: async () => true } } } };
globalThis.game = {
  user: me,
  users: Object.assign([...users], { get: (id) => users.find((u) => u.id === id), activeGM: users[0] }),
  i18n: { localize: lookup, format: (key, data) => String(lookup(key)).replace(/\{(\w+)\}/g, (_, k) => data?.[k] ?? "") },
  time: { get serverTime() { return Date.now(); } },
  settings: { get: (ns, key) => ({ tier: params.get("tier") ?? "high", zones: "faint", calm: false, performanceMode: null, photosensitiveMode: false })[key] ?? null },
  socket: {
    on: (channel, fn) => socketListeners.set(fn, channel),
    off: (channel, fn) => socketListeners.delete(fn),
    emit: (channel, message) => wire.postMessage({ kind: "socket", channel, message, from: me.id })
  },
  scenes: []
};

const setByPath = (o, path, value) => { const keys = path.split("."); let at = o; for (const k of keys.slice(0, -1)) at = at[k] ??= {}; at[keys.at(-1)] = value; };
class Scene {
  constructor(id, name, flags) { this.id = id; this.name = name; this.flags = flags; }
  getFlag(ns, key) { return this.flags?.[ns]?.[key]; }
  async update(changes, { remote = false } = {}) {
    await new Promise((r) => setTimeout(r, 30));                     // an update lands a moment later, as Foundry's do
    for (const [path, value] of Object.entries(changes)) setByPath(this, path, structuredClone(value));
    if (!remote) wire.postMessage({ kind: "scene", changes });
    Hooks.callAll("updateScene", this, changes);
    return this;
  }
}
wire.onmessage = ({ data }) => {
  if (data.kind === "socket") for (const [fn, channel] of socketListeners) if (channel === data.channel) fn(data.message, data.from);
  if (data.kind === "scene") scene.update(data.changes, { remote: true });
};

/**
 * Where chalk is kept, in memory: the same shape as the module's ChalkStore (a world journal there), so the real chalk
 * controller draws and keeps strokes here exactly as it does in Foundry. Nothing outlives the page.
 */
class MemoryChalkStore {
  constructor() { this.byScene = new Map(); this.listeners = new Set(); }
  get ready() { return true; }
  strokes(sceneId) { return [...(this.byScene.get(sceneId) ?? [])]; }
  strokesBy(sceneId, userId) { return this.strokes(sceneId).filter((s) => s.by === userId); }
  async append(sceneId, stroke) { this.byScene.set(sceneId, [...this.strokes(sceneId), stroke]); this.#tell(sceneId); }
  async remove(sceneId, ids) { const gone = new Set(ids); this.byScene.set(sceneId, this.strokes(sceneId).filter((s) => !gone.has(s.id))); this.#tell(sceneId); }
  async wipe(sceneId) { this.byScene.set(sceneId, []); this.#tell(sceneId); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #tell(sceneId) { for (const fn of this.listeners) fn(sceneId); }
}

/* ---------------------------------------------------------------- the stage */

const { SkinRegistry } = await import("/module/stagecraft/scripts/skins/registry.mjs");
const { StageHost } = await import("/module/stagecraft/scripts/foundry/host.mjs");
const { registerMoments, publishMoves, arrange } = await import("/module/stagecraft/scripts/foundry/blocking.mjs");
const { brass } = await import("/module/blank-inheritance/scripts/foundry/stagecraft-brass-skin.mjs");
const { mirrorCards, descriptionFor, momentMoves, momentsOf, formationRequest } = await import("/module/blank-inheritance/scripts/core/stagecraft-bridge.mjs");

for (const [family, file, weight] of [["Chakra Petch", "chakra-petch-700", 700], ["Special Elite", "special-elite-400", 400], ["Shippori Mincho", "shippori-mincho-700", 600]]) {
  const face = new FontFace(family, `url(/module/blank-inheritance/assets/fonts/${file}.woff2)`, { weight: String(weight) });
  document.fonts.add(face);
  face.load().catch(() => {});
}

const stages = await (await fetch("/module/blank-inheritance/stagecraft/stages.json", { cache: "no-store" })).json();
const which = stages.stages[params.get("stage")] ? params.get("stage") : Object.keys(stages.stages)[0];
const entry = stages.stages[which];
const summoned = new Set(Object.values(entry.onTrigger ?? {}).flatMap((t) => (t.summon ?? []).map((s) => s.id)));
const title = (key) => key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const PARTY = [["sato-hiroshi", "Hiroshi", "#e3c45a"], ["kaneda-masaru", "Masaru", "#e06a5a"], ["kimura-etsuko", "Etsuko", "#5fb3d9"], ["watanabe-yumiko", "Yumiko", "#c99be0"]];
const published = [
  ...Object.keys(entry.places ?? {}).filter((k) => !summoned.has(k)).map((k) => ({ portraitId: `summon-${k}`, label: title(k), img: `modules/blank-inheritance/assets/stage/${k}.webp`, revealed: true })),
  ...PARTY.map(([art, name], i) => ({ portraitId: `pc-${i + 1}`, label: name, img: `modules/blank-inheritance/assets/stage/${art}.webp`, kind: "pc", actorId: `pc-${i + 1}` }))
];
// the first player holds the first card of the party, as the adventure's bridge would arrange
const cards = mirrorCards({ published, def: entry, now: Date.now() / 1000 - 600, ownersOf: (actorId) => (actorId === "pc-1" ? ["p1"] : []), npcOwners: ["gm"] })
  .map((c) => (c.pc ? { ...c, colour: PARTY.find(([, n]) => n === c.name)?.[2] ?? null } : c));
const scene = new Scene("bench-scene", which, { stagecraft: { stage: descriptionFor(stages, entry), published: { cards, rev: 1 } } });
game.scenes.push(scene);

// the adventure's moments, as its bridge offers them (looked up by the person's id; nothing real is sent)
registerMoments((s) => momentsOf(entry).map((m) => ({
  id: m.id, label: m.label ?? m.id, tip: m.tip ?? "",
  run: async () => {
    const list = s.flags.stagecraft.published.cards;
    const keyOf = (id) => (id.startsWith("summon-") ? id.slice(7) : null);
    const moves = momentMoves(m, list, keyOf);
    if (moves.length) await publishMoves(s, moves);
    const request = formationRequest(m.formation, list, keyOf);
    if (request) await arrange(s, request.kind, request.opts, window.host);
    if (typeof m.board === "boolean") await s.update({ "flags.stagecraft.live.board": m.board });
    if (typeof m.life === "boolean") await s.update({ "flags.stagecraft.live.life": m.life });
  }
})));

const skins = new SkinRegistry();
skins.register(brass);
const host = new StageHost({ scene, skins, anchor: document.getElementById("board"), services: { chalkStore: new MemoryChalkStore() } });
window.host = host;
const starting = host.start();
if (params.get("midbuild")) {
  // a change that lands while the stage is still being built, before it listens (host-check.mjs): someone is sent to the
  // front of the stage, as a deploy's new layout is written while the GM's page loads (found live 2026-10-03)
  const list = scene.flags.stagecraft.published.cards;
  const first = list.find((c) => !c.pc);
  if (first) {
    Object.assign(first, { at: [0.5, 0.95], still: true, move: { t0: Date.now() / 1000 + 0.3, gait: "walk" } });
    Hooks.callAll("updateScene", scene, { flags: { stagecraft: { published: { cards: list } } } });
    window.midbuild = { id: first.id, at: first.at };
  }
}
const ok = await starting;
document.getElementById("seat").textContent = `${seat === "gm" ? "Gamemaster" : "Player"} · ${which}${ok ? "" : " · could not start"}`;
window.bench = { host, scene, ready: ok };
