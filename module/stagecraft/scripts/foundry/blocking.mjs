/**
 * The GM's blocking, in a Foundry scene (stage.md §5, §7): formations, moves, "back to places", tidy, and the two
 * switches (Life, the fight board). Every one of them is a write to the scene's own flags, which Foundry sends to every
 * screen; each screen then walks the cards itself from the same numbers and the same start time (core/walks.mjs), so the
 * whole table watches the same people walk to the same places at the same moment.
 *
 *   flags.stagecraft.published.cards[]   each card's place, pose, `still`, `packed` and `move: { t0, gait }`
 *   flags.stagecraft.live.life           false while the GM has Life switched off (on by default)
 *   flags.stagecraft.live.board          the fight board, on or off (the scene's own `board` until the GM sets it)
 *
 * Only a GM writes. Writes to the published cast go one after another through `serially`, shared with the saving of
 * where a card was put down (host.mjs), so a formation and a drop can never overwrite each other.
 */

import { NS, publishedCards, readStage, readCast } from "./scene-data.mjs";
import { Stage } from "../core/stage.mjs";
import { commitMoves, homeMoves } from "../core/sync.mjs";
import { tidy } from "../core/marks.mjs";
import { cleanBadges, sameBadges } from "../core/badges.mjs";

/** How far ahead a move is stamped to start, in seconds: long enough for every screen to hear of it first. */
export const LEAD = 0.45;

/** The time every screen shares, in seconds. */
export const sharedNow = () => (globalThis.game?.time?.serverTime ?? Date.now()) / 1000;

let queue = Promise.resolve();

/** Run writes to a scene's published cast one after another. */
export function serially(fn) {
  const next = queue.then(fn, fn);
  queue = next.catch((err) => console.warn(`${NS} | a write to the stage failed`, err));
  return next;
}

/**
 * The stage engine to plan with: the one drawing this scene on this screen if there is one (so a formation starts from
 * where people really stand, routines and all), else one built from the scene's flags just for the sum.
 */
export function stageFor(scene, current = null) {
  if (current?.scene?.id === scene.id && current.stage) return current.stage;
  const { usable, scene: description } = readStage(scene);
  if (!usable) return null;
  return new Stage(description, readCast(scene), { clock: sharedNow });
}

/** Publish moves: every screen walks those cards there, starting together. */
export function publishMoves(scene, moves) {
  if (!game.user?.isGM || !moves?.length) return Promise.resolve(false);
  return serially(async () => {
    const cards = publishedCards(scene);
    const next = commitMoves(cards, moves, sharedNow() + LEAD);
    await scene.update({ [`flags.${NS}.published.cards`]: next });
    return true;
  });
}

/**
 * A formation (core/formations.mjs) on the cards `ids` (or every card of the scene's own people, the party left where
 * they are). `focus` is a point of the painting or a card's id. Returns the moves published.
 */
export async function arrange(scene, kind, opts = {}, current = null) {
  const stage = stageFor(scene, current);
  if (!stage) return [];
  const moves = stage.formationMoves(kind, opts);
  await publishMoves(scene, moves);
  return moves;
}

/** Everyone the GM has moved goes back to where the scene put them, and back to what they were doing. */
export async function backToPlaces(scene, { gait = "walk" } = {}) {
  const moves = homeMoves(publishedCards(scene), { gait });
  await publishMoves(scene, moves);
  return moves;
}

/** Every loose card to its nearest free mark (stage.md §8.10), walking. */
export async function tidyUp(scene, current = null) {
  const stage = stageFor(scene, current);
  if (!stage) return [];
  const free = stage.marks.map((m) => ({ ...m, capacity: m.capacity - (stage.resting.get(m.id)?.size ?? 0) })).filter((m) => m.capacity > 0);
  const loose = [...stage.cards.values()].filter((c) => !c.mark && c.holder === null).map((c) => ({ id: c.id, X: c.walk ? c.walk.to.X : c.puppet.x, Z: c.walk ? c.walk.to.Z : c.Z }));
  const moves = tidy(free, loose).map(({ card, mark }) => ({ id: card, mark, gait: "hurry", still: true, packed: false }));
  await publishMoves(scene, moves);
  return moves;
}

/** Life: whether the people of the scene go about their business. */
export const lifeOn = (scene) => scene?.flags?.[NS]?.live?.life !== false;

/** The fight board: the GM's choice if made, else what the scene says. */
export function boardOn(scene) {
  const live = scene?.flags?.[NS]?.live?.board;
  if (typeof live === "boolean") return live;
  return scene?.flags?.[NS]?.stage?.board === true;
}

export const setLife = (scene, on) => scene.update({ [`flags.${NS}.live.life`]: !!on });
export const setBoard = (scene, on) => scene.update({ [`flags.${NS}.live.board`]: !!on });

/**
 * Knock someone down (a foe defeated, someone at 0 HP) or stand them back up: it is written on their card in the published
 * cast, so every screen shows them fall, and a reload finds them still down.
 */
export function setDown(scene, id, down) {
  if (!game.user?.isGM) return Promise.resolve(false);
  return serially(async () => {
    const cards = publishedCards(scene);
    if (!cards.some((c) => c.id === id)) return false;
    const next = cards.map((c) => {
      if (c.id !== id) return c;
      const card = { ...c };
      if (down) card.down = true; else delete card.down;
      return card;
    });
    await scene.update({ [`flags.${NS}.published.cards`]: next });
    return true;
  });
}

/** Who has the floor in a scene: a card's id, or null. */
export const speakerOf = (scene) => scene?.flags?.[NS]?.live?.speaker ?? null;

/** Give someone the floor (they are lit and everyone turns to them), or take it back with null. */
export const setSpeaker = (scene, id) => scene.update({ [`flags.${NS}.live.speaker`]: typeof id === "string" ? id : null });

/** Whose turn it is in a scene: a card's id, or null. */
export const turnOf = (scene) => scene?.flags?.[NS]?.live?.turn ?? null;

/** Light a card as the one whose turn it is (a fight's initiative), or put the light out with null. Nobody turns to look. */
export function setTurn(scene, id) {
  if (!game.user?.isGM) return Promise.resolve(false);
  const to = typeof id === "string" ? id : null;
  if (turnOf(scene) === to) return Promise.resolve(false);
  return scene.update({ [`flags.${NS}.live.turn`]: to }).then(() => true);
}

/**
 * Put badges on a card (core/badges.mjs: a few short labels, shown on its face on every screen): written on its card in the
 * published cast, like `down`, so a reload finds them. An empty list takes them off. Nothing is written when nothing changed.
 */
export function setBadges(scene, id, badges) {
  if (!game.user?.isGM) return Promise.resolve(false);
  const clean = cleanBadges(badges);
  return serially(async () => {
    const cards = publishedCards(scene);
    const card = cards.find((c) => c.id === id);
    if (!card || sameBadges(card.badges, clean)) return false;
    const next = cards.map((c) => {
      if (c.id !== id) return c;
      const out = { ...c };
      if (clean.length) out.badges = clean; else delete out.badges;
      return out;
    });
    await scene.update({ [`flags.${NS}.published.cards`]: next });
    return true;
  });
}

/* ---------------------------------------------------------------- authored moments */

const providers = new Set();

/**
 * Let another module offer the GM a scene's authored blocking ("the shopkeeper comes round the counter", "the band starts") as
 * buttons on the strip. `provider(scene)` returns [{ id, label, tip?, run(scene) }] for that scene, or []. Returns a
 * function that takes the provider away again.
 */
export function registerMoments(provider) {
  if (typeof provider !== "function") throw new TypeError("a moments provider must be a function of the scene");
  providers.add(provider);
  return () => providers.delete(provider);
}

/* ---------------------------------------------------------------- what the screen's own furniture covers */

const covers = new Set();

/**
 * Let another module say what its own interface covers over the stage: a deck of controls along the bottom of the screen,
 * a dial rising out of it. `provider()` returns shapes in window pixels, `{ rect: [x0, y0, x1, y1] }` or
 * `{ circle: [cx, cy, r] }`, as they are right now; it is asked whenever a formation is placed. Formations then keep
 * everyone clear of it, as they do of a counter: no more than the bottom 15% of a card under it. Returns a function that
 * takes the provider away again.
 */
export function registerCover(provider) {
  if (typeof provider !== "function") throw new TypeError("a cover provider must be a function");
  covers.add(provider);
  return () => covers.delete(provider);
}

/** Every shape the screen's furniture covers right now, in window pixels; a provider that throws covers nothing. */
export function coverShapes() {
  const out = [];
  for (const provider of covers) {
    try {
      const list = provider();
      if (Array.isArray(list)) out.push(...list.filter((s) => Array.isArray(s?.rect) || Array.isArray(s?.circle)));
    } catch (err) {
      console.warn(`${NS} | a cover provider failed`, err);
    }
  }
  return out;
}

/**
 * Window shapes as reference-page shapes, for a stage drawn into `box` (its element's rect on the window) with `view`
 * (rigspace.mjs `viewFor`: the page covers the box).
 */
export function coverOnPage(shapes, box, view) {
  const x = (px) => view.ox + (px - box.left) / view.s;
  const y = (py) => view.oy + (py - box.top) / view.s;
  return shapes.map((s) => (s.rect ? { rect: [x(s.rect[0]), y(s.rect[1]), x(s.rect[2]), y(s.rect[3])] } : { circle: [x(s.circle[0]), y(s.circle[1]), s.circle[2] / view.s] }));
}

/** Every moment offered for a scene, from every provider; one that throws offers nothing. */
export function momentsFor(scene) {
  const out = [];
  for (const provider of providers) {
    try {
      const list = provider(scene);
      if (Array.isArray(list)) out.push(...list.filter((m) => m && typeof m.label === "string" && typeof m.run === "function"));
    } catch (err) {
      console.warn(`${NS} | a moments provider failed`, err);
    }
  }
  return out;
}
