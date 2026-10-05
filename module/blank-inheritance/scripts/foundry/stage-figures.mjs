/**
 * The basic actors behind the cards' tokens (design/stagecraft/module.md section 39; core/stagecraft-bridge.mjs says what one is).
 * Stagecraft asks the adventure, through `api.tokens.setActorProvider`, who a card's token stands for; for everyone whose card
 * names no actor of their own the answer is made here, the first time they are wanted. Kept in a file of its own, with few
 * imports, so it can be run without the rest of the adventure.
 */

import { deriveFoundryId } from "../core/ids.mjs";
import { buildNpcActorData } from "../core/generators/npc.mjs";
import { BASIC_FLAG, BASIC_FOLDER_FLAG, basicFace, basicSourceId } from "../core/stagecraft-bridge.mjs";
import { EXISTING_FLAG, existingFor, npcIdFor, stageIdOf } from "../core/npc-generator/cards.mjs";
import { MODULE_ID } from "./stage-store.mjs";

/** Only one GM screen does the writing, so two connected GMs never both do it. */
const actingGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);

/** Basic actors being made now, by id, so two cards (or two screens' passes) do not both make one. */
const making = new Map();

/** The folder the basic actors are kept in: found by its flag, made when there is none. */
async function figuresFolder() {
  const found = game.folders?.find?.((f) => f.type === "Actor" && f.getFlag(MODULE_ID, BASIC_FOLDER_FLAG) === true);
  if (found) return found;
  return Folder.create({ name: "Stage figures", type: "Actor", flags: { [MODULE_ID]: { [BASIC_FOLDER_FLAG]: true } } });
}

/**
 * The basic actor for a card that names no actor (Stagecraft's `api.tokens.setActorProvider`), made the first time it is
 * wanted and kept in step with the card's name and picture after. The acting GM's screen only: nobody else can write the world.
 * Everything on it is the card's own (core/stagecraft-bridge.mjs `basicFace`).
 */
export async function basicActorFor(card) {
  if (!actingGM() || !card?.id) return null;
  const sourceId = basicSourceId(card.id);
  const id = await deriveFoundryId(sourceId);
  if (making.has(id)) return making.get(id);
  const job = (async () => {
    const face = basicFace(card);
    const actor = game.actors.get(id);
    if (actor) {
      const change = {};
      if (actor.name !== face.name) { change.name = face.name; change["prototypeToken.name"] = face.name; }
      if (face.img && actor.img !== face.img) change.img = face.img;
      if (Object.keys(change).length) await actor.update(change);
      return actor;
    }
    const data = await buildNpcActorData({ id: sourceId, name: face.name }, { portraitImage: face.img });
    data.flags = { [MODULE_ID]: { [BASIC_FLAG]: true } };
    data.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
    data.prototypeToken = { ...data.prototypeToken, name: face.name, actorLink: true };
    const folder = await figuresFolder().catch(() => null);
    if (folder) data.folder = folder.id;
    return Actor.create(data, { keepId: true });
  })().finally(() => making.delete(id));
  making.set(id, job);
  return job;
}

/* ---------------------------------------------------------------- who a card's token stands for (the NPC Generator's wiring) */

let rosterPromise = null;
/** The NPC roster, as deployed (data/campaign/npc-roster.json lands at data/campaign/campaign/ in the module): read once per page; null if it cannot be. */
const defaultRoster = () => (rosterPromise ??= import("./io.mjs").then((io) => io.fetchModuleJson("data/campaign/campaign/npc-roster.json")).catch(() => null));
const defaultAuthored = async (sceneId) => (await import("./stage.mjs")).readAuthoredCast(sceneId);

/**
 * An imported copy of a creature that already has a finished statblock (the roster's `existing`: the sf2e compendium's own giant
 * centipede): found by its flag, imported from the compendium the first time it is wanted, kept in the stage figures folder, owned by
 * no player. Nothing is generated: it is exactly the compendium's actor.
 */
async function existingCreatureActor(entry) {
  const key = `existing:${entry.id}`;
  if (making.has(key)) return making.get(key);
  const job = (async () => {
    const found = game.actors.find?.((a) => a.getFlag(MODULE_ID, EXISTING_FLAG) === entry.id);
    if (found) return found;
    const source = await fromUuid(entry.compendium);
    if (!source) return null;
    const data = game.actors.fromCompendium(source, { keepId: false });
    data.flags = { ...(data.flags ?? {}), [MODULE_ID]: { [BASIC_FLAG]: true, [EXISTING_FLAG]: entry.id } };
    data.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
    const folder = await figuresFolder().catch(() => null);
    if (folder) data.folder = folder.id;
    return Actor.create(data);
  })().finally(() => making.delete(key));
  making.set(key, job);
  return job;
}

/**
 * Stagecraft's `api.tokens.setActorProvider`: the actor a card's token stands for. A creature that already has a statblock is its own
 * copy of that actor (`link: false`: each of six centipedes has its own hit points); a person with a data/npcs file is their real
 * synced actor (which carries the statblock tools/npc-generator wrote); anyone else is a basic figure made from the card. The acting
 * GM's screen only. `deps` is for tests.
 */
export async function actorForCard(scene, card, { loadRoster = defaultRoster, loadAuthored = defaultAuthored } = {}) {
  if (!actingGM() || !card?.id) return null;
  const authored = (await Promise.resolve(loadAuthored(scene?.id)).catch(() => [])).find?.((m) => m.portraitId === card.id) ?? null;
  const roster = await Promise.resolve(loadRoster()).catch(() => null);
  const entry = existingFor(stageIdOf(card.id), roster?.existing);
  if (entry) {
    const actor = await existingCreatureActor(entry).catch(() => null);
    if (actor) return { id: actor.id, link: entry.link !== false };
  }
  const real = game.actors.get(await deriveFoundryId(npcIdFor(card, authored)));
  if (real?.type === "npc") return { id: real.id, link: true };
  return basicActorFor(card);
}
