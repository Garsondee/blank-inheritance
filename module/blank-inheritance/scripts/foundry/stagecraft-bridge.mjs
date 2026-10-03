/**
 * The adventure's one bridge to Stagecraft: Puppet Show (design/stagecraft/module.md §3), the Foundry-touching half.
 *
 * Stagecraft is a separate module that draws a scene as a puppet stage. This file is everything the adventure does with it,
 * and it is automatic: nobody presses anything.
 *
 *   - the brass skin is handed to Stagecraft before the first scene is drawn (`stagecraft.init`);
 *   - a GM's screen switches the module on in the world if it is installed but off;
 *   - every built scene that has an entry in stagecraft/stages.json is given its stage description (scene flags), so it is
 *     drawn by Stagecraft from then on, and a deploy that changes the entry changes the scene;
 *   - who stands on the stage is the theatre-of-the-mind stage's published cast, mirrored into cards (core/stagecraft-
 *     bridge.mjs), so reveals, concealment and the names the table has not been told all keep working as they did;
 *   - the party's characters are given cards, held by their players;
 *   - a fired trigger can summon more people (the nest wakes: six centipedes);
 *   - on a scene Stagecraft draws, the older overlay of portrait frames is not mounted (stage.mjs asks `stagecraftDraws`).
 *
 * Players' screens need only the first and the last of these; the rest is the acting GM's.
 */

import { MODULE_ID } from "./stage-store.mjs";
import { readAuthoredCast, summonToStage } from "./stage.mjs";
import { brass } from "./stagecraft-brass-skin.mjs";
import { stagecraftActive, stagecraftDraws, stagecraftInstalled } from "./stagecraft-gate.mjs";
import { STAGECRAFT_ID as NS, STAGES_PATH, descriptionFor, entryFor, mirrorCards, sameCards, summonsForTrigger, rawKeyOf, momentMoves, momentsOf, formationRequest } from "../core/stagecraft-bridge.mjs";

// Registered when this file loads, which is before Foundry's init, so Stagecraft finds the skin waiting.
Hooks.once("stagecraft.init", ({ registerSkin }) => registerSkin(brass));

// The scene's authored moments become buttons on the GM's blocking strip (stage.md §7).
Hooks.once("stagecraft.ready", (api) => {
  api?.blocking?.registerMoments?.((scene) => momentButtons(scene));
});

const LOG = "Blank Inheritance | Stagecraft bridge";
let stagesPromise = null;
let stagesLoaded = null;

/** The file that says which scenes are stages and how. Read once per page; null if it cannot be. */
export function loadStages() {
  stagesPromise ??= fetch(foundry.utils.getRoute(STAGES_PATH)).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((s) => (stagesLoaded = s));
  return stagesPromise;
}

/** The time every screen shares, in seconds (Stagecraft's walks and entrances run on it). */
const sharedNow = () => game.time.serverTime / 1000;

/* ---------------------------------------------------------------- moments */

/** The moments a scene's entry offers, as the GM's strip wants them. Synchronous: the stages file is read at start. */
function momentButtons(scene) {
  if (!game.user?.isGM || !stagesLoaded) return [];
  const entry = entryFor(stagesLoaded, scene?.getFlag?.(MODULE_ID, "sourceId"));
  return momentsOf(entry).map((m) => ({ id: m.id, label: m.label ?? m.id, tip: m.tip ?? "", run: (s) => playMoment(s, m.id) }));
}

/**
 * Play one of a scene's authored moments: everyone it names walks to their place (looked up by their real id here on the
 * GM's side, never sent), and, if it says so, everyone else goes home.
 */
export async function playMoment(scene, momentId) {
  const api = game.modules.get(NS)?.api;
  if (!api?.blocking || !scene?.flags?.[NS]?.stage || !actingGM()) return [];
  const entry = entryFor(await loadStages(), scene.getFlag(MODULE_ID, "sourceId"));
  const moment = entry?.moments?.[momentId];
  if (!moment) return [];
  const authored = await readAuthoredCast(scene.id);
  const real = new Map(authored.map((m) => [m.portraitId, m]));
  const published = new Map((scene.getFlag(MODULE_ID, "stage")?.cast ?? []).map((m) => [m.portraitId, m]));
  const keyOf = (id) => { const member = published.get(id); return member ? rawKeyOf(member, real.get(id)) : null; };
  const cards = scene.flags?.[NS]?.published?.cards ?? [];
  const moves = momentMoves(moment, cards, keyOf);
  if (moves.length) await api.blocking.move(scene, moves);
  const request = formationRequest(moment.formation, cards, keyOf);
  if (request) await api.blocking.arrange(scene, request.kind, request.opts);
  if (typeof moment.board === "boolean") await api.blocking.setBoard(scene, moment.board);
  if (typeof moment.life === "boolean") await api.blocking.setLife(scene, moment.life);
  return moves;
}

export { stagecraftInstalled, stagecraftActive, stagecraftDraws };

/** Only one GM screen does the writing, so two connected GMs never both do it. */
const actingGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);

/* ---------------------------------------------------------------- switching it on */

/**
 * If Stagecraft is installed on this server but not switched on in this world, switch it on and reload this page (Foundry
 * reads the module list only when a page loads). Returns true when it is already on.
 */
async function ensureEnabled() {
  if (!stagecraftInstalled()) return false;
  if (stagecraftActive()) return true;
  const config = foundry.utils.deepClone(game.settings.get("core", "moduleConfiguration"));
  config[NS] = true;
  await game.settings.set("core", "moduleConfiguration", config);
  ui.notifications?.info("Stagecraft is being switched on for this world; the page will reload.");
  setTimeout(() => window.location.reload(), 1800);
  return false;
}

/* ---------------------------------------------------------------- scenes */

/** Give every built scene that has an entry its stage description (and take it off a scene that no longer has one). */
export async function applyStages() {
  const stages = await loadStages();
  if (!stages || !actingGM()) return [];
  const touched = [];
  for (const scene of game.scenes) {
    const entry = entryFor(stages, scene.getFlag(MODULE_ID, "sourceId"));
    if (!entry) continue;
    const description = descriptionFor(stages, entry);
    if (JSON.stringify(scene.flags?.[NS]?.stage ?? null) === JSON.stringify(description)) continue;
    try {
      await scene.update({ [`flags.${NS}.stage`]: description });
      touched.push(scene.name);
    } catch (err) {
      console.warn(`${LOG} | could not give "${scene.name}" its stage`, err);
    }
  }
  if (touched.length) console.info(`${LOG} | stage descriptions written: ${touched.join(", ")}`);
  return touched;
}

/** The users who hold a player's card: the players who own the character. */
function ownersOf(actorId) {
  const actor = actorId ? game.actors.get(actorId) : null;
  if (!actor) return [];
  return game.users.filter((u) => !u.isGM && actor.testUserPermission(u, "OWNER")).map((u) => u.id);
}

/** Make a scene's cards agree with the theatre-of-the-mind stage's published cast. */
export async function mirrorScene(scene) {
  if (!scene?.flags?.[NS]?.stage || !actingGM()) return false;
  const stages = await loadStages();
  const entry = entryFor(stages, scene.getFlag(MODULE_ID, "sourceId")) ?? {};
  const authored = await readAuthoredCast(scene.id);
  // read what is on the scene only now, after the waiting: Stagecraft writes where a card was put down into the same list
  const published = scene.getFlag(MODULE_ID, "stage")?.cast ?? [];
  const existing = scene.flags?.[NS]?.published?.cards ?? [];
  const cards = mirrorCards({ published, authored, existing, def: entry, ownersOf, npcOwners: game.users.filter((u) => u.isGM).map((u) => u.id), now: sharedNow() + 0.4 });
  if (sameCards(cards, existing)) return false;
  await scene.update({ [`flags.${NS}.published`]: { cards, rev: (scene.flags?.[NS]?.published?.rev ?? 0) + 1 } });
  return true;
}

/** The party's characters are on the stage: one card each, held by their player. */
export async function ensureParty(scene) {
  if (!scene?.flags?.[NS]?.stage || !actingGM()) return;
  const present = new Set((scene.getFlag(MODULE_ID, "stage")?.cast ?? []).map((m) => m.actorId).filter(Boolean));
  for (const user of game.users) {
    const actor = !user.isGM ? user.character : null;
    if (!actor || present.has(actor.id)) continue;
    await summonToStage(scene, { id: actor.id, name: actor.name, img: actor.img, actorId: actor.id, isPc: true });
  }
}

/** A fired trigger may call people onto the stage (the nest wakes). */
async function onTrigger({ trigger }) {
  const scene = canvas?.scene;
  if (!scene?.flags?.[NS]?.stage || !actingGM() || !trigger?.id) return;
  const entry = entryFor(await loadStages(), scene.getFlag(MODULE_ID, "sourceId"));
  for (const who of summonsForTrigger(entry, trigger.id)) {
    await summonToStage(scene, { id: who.id, name: who.name, img: who.img, isPc: false, sting: who.sting ?? "quiet" });
  }
  // a trigger can also play one of the scene's moments (the fight board goes up, everyone takes their places)
  const moment = entry?.onTrigger?.[trigger.id]?.moment;
  if (moment) {
    // the summoned arrive first: let their cards reach the stage before anyone is sent anywhere
    await new Promise((resolve) => setTimeout(resolve, 600));
    await playMoment(scene, moment);
  }
}

/* ---------------------------------------------------------------- start */

/** Called once the world is ready. */
export async function startStagecraftBridge() {
  if (!game.user.isGM) return;
  if (!(await ensureEnabled())) return;
  await loadStages();
  await applyStages();
  const sync = (scene) => mirrorScene(scene).catch((err) => console.warn(`${LOG} | could not mirror the cast`, err));
  // the theatre-of-the-mind stage's cast changed: the cards follow
  Hooks.on("updateScene", (scene, changes) => {
    if (changes?.flags?.[MODULE_ID]?.stage !== undefined) sync(scene);
  });
  // a scene came into the world (the sync built it) or is opened: it gets its stage, its party and its cards
  Hooks.on("createScene", () => { applyStages().catch(() => {}); });
  Hooks.on("canvasReady", async (c) => {
    const scene = c?.scene ?? canvas?.scene;
    if (!scene) return;
    await applyStages().catch(() => {});
    await ensureParty(game.scenes.get(scene.id)).catch((err) => console.warn(`${LOG} | could not put the party on the stage`, err));
    await sync(game.scenes.get(scene.id));
  });
  // somebody was given a character: their card
  Hooks.on("updateUser", (user, changes) => {
    if (changes.character === undefined) return;
    ensureParty(canvas?.scene).then(() => sync(canvas?.scene)).catch(() => {});
  });
  Hooks.on("blankInheritance.triggerFired", (event) => { onTrigger(event).catch((err) => console.warn(`${LOG} | a trigger could not call anyone`, err)); });
  if (canvas?.scene) {
    await ensureParty(canvas.scene).catch(() => {});
    await sync(canvas.scene);
  }
}
