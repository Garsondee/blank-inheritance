/**
 * "Set up the fight" -- the Foundry half (2026-10-04). Read
 * core/fight-setup.mjs's header first for why it exists.
 *
 * One press, from a fight card in the Scene Runner:
 *
 *   1. the creatures, brought in from the compendium entry the encounter
 *      names, one Actor each (six centipedes have six hit-point totals), in a
 *      folder named for the fight, and reused -- healed to full -- if this
 *      fight was set up before;
 *   2. a combat with the party and the creatures in it. Token-free on
 *      purpose: Episode One's fight is staged on Stagecraft's cards, not on a
 *      grid, and a Combatant needs only an actor (Foundry v14's Combatant
 *      schema, common/documents/combatant.mjs: actorId, tokenId and sceneId
 *      are all optional); a party member whose token IS on the scene goes in
 *      by token;
 *   3. the creatures' initiative, rolled for the GM's eyes only, through
 *      sf2e's own `rollInitiative` (no dialog), and the combat tracker opened.
 *
 * Players roll their own initiative, from the tracker or their sheets: the
 * button never rolls for a player character.
 *
 * The combat carries a flag naming the brief, the beat and the encounter, so
 * the Scene Runner can raise the scene's clock as rounds end
 * (foundry/scene-runner.mjs, the updateCombat hook) and a second press finds
 * this combat instead of building another.
 */

import { fightRoster } from "../core/fight-setup.mjs";

const MODULE_ID = "blank-inheritance";
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

/** The party: sf2e's own Party actor's members, falling back to every player-owned character. */
export function partyActors() {
  const members = Array.from(game.actors?.party?.members ?? []);
  return members.length ? members : game.actors.contents.filter((a) => a.type === "character" && a.hasPlayerOwner);
}

/** This fight's combat, if it was set up before and has not been ended. */
export function combatForFight(encounterId) {
  return game.combats?.contents.find((c) => c.getFlag(MODULE_ID, "fight")?.encounterId === encounterId) ?? null;
}

async function fightFolder(encounter) {
  const name = L("BLANKINHERITANCE.Runner.FightSetup.Folder", { name: encounter.name ?? encounter.id });
  const existing = game.folders?.find((f) => f.type === "Actor" && f.getFlag(MODULE_ID, "fight") === encounter.id);
  if (existing) return existing;
  return Folder.create({ name, type: "Actor", color: "#7a2f22", flags: { [MODULE_ID]: { fight: encounter.id } } });
}

/** One creature's Actor: the one made last time (healed), or a fresh copy of the compendium entry. */
async function creatureActor(entry, encounter, folder, sources) {
  const existing = game.actors.contents.find((a) => {
    const flag = a.getFlag(MODULE_ID, "fight");
    return flag?.encounterId === encounter.id && flag?.name === entry.name;
  });
  if (existing) {
    const max = existing.system?.attributes?.hp?.max;
    if (Number.isFinite(max)) await existing.update({ "system.attributes.hp.value": max });
    return existing;
  }
  if (!sources.has(entry.uuid)) sources.set(entry.uuid, await fromUuid(entry.uuid));
  const source = sources.get(entry.uuid);
  if (!source) throw new Error(L("BLANKINHERITANCE.Runner.FightSetup.NoSource", { name: entry.baseName, uuid: entry.uuid }));
  const data = source.toObject();
  delete data._id;
  data.name = entry.name;
  data.folder = folder?.id ?? null;
  data.flags = { ...(data.flags ?? {}), [MODULE_ID]: { ...(data.flags?.[MODULE_ID] ?? {}), fight: { encounterId: encounter.id, name: entry.name } } };
  if (data.prototypeToken) data.prototypeToken.name = entry.name;
  return Actor.implementation.create(data);
}

/**
 * Set up one encounter's fight. `briefId`/`beatId` say which beat asked, for
 * the clock. Returns the combat, or null when nothing could be set up.
 */
export async function setUpFight(encounter, { briefId = null, beatId = null, clockAuto = true } = {}) {
  if (!game.user?.isGM || !encounter?.id) return null;
  const { roster, missing } = fightRoster(encounter);
  if (!roster.length) {
    ui.notifications.warn(L("BLANKINHERITANCE.Runner.FightSetup.Nothing", { missing: missing.join(", ") || "?" }));
    return null;
  }

  const folder = await fightFolder(encounter);
  const sources = new Map();
  const creatures = [];
  for (const entry of roster) creatures.push(await creatureActor(entry, encounter, folder, sources));

  const scene = canvas?.scene ?? null;
  let combat = combatForFight(encounter.id);
  if (!combat) {
    combat = await Combat.implementation.create({
      scene: scene?.id ?? null,
      active: true,
      flags: { [MODULE_ID]: { fight: { encounterId: encounter.id, briefId, beatId, clockAuto } } }
    });
  } else {
    await combat.update({ active: true, [`flags.${MODULE_ID}.fight.clockAuto`]: clockAuto });
  }

  // Everyone not already in it: the party (by token where they have one on
  // this scene), then the creatures.
  const inCombat = new Set(combat.combatants.map((c) => c.actorId));
  const rows = [];
  for (const actor of partyActors()) {
    if (inCombat.has(actor.id)) continue;
    const token = scene?.tokens?.find((t) => t.actorId === actor.id) ?? null;
    rows.push(token ? { tokenId: token.id, sceneId: scene.id, actorId: actor.id } : { actorId: actor.id });
  }
  for (const actor of creatures) {
    if (!inCombat.has(actor.id)) rows.push({ actorId: actor.id, hidden: false });
  }
  if (rows.length) await combat.createEmbeddedDocuments("Combatant", rows);

  // The creatures' initiative, for the GM's eyes only, no dialog.
  const creatureIds = new Set(creatures.map((a) => a.id));
  const toRoll = combat.combatants.filter((c) => creatureIds.has(c.actorId) && c.initiative === null).map((c) => c.id);
  if (toRoll.length) {
    try {
      await combat.rollInitiative(toRoll, { skipDialog: true, messageMode: "gm", updateTurn: false });
    } catch (err) {
      console.error("Blank Inheritance | Could not roll the creatures' initiative:", err);
      ui.notifications.warn(L("BLANKINHERITANCE.Runner.FightSetup.InitiativeFailed"));
    }
  }

  try {
    ui.sidebar?.changeTab?.("combat", "primary");
  } catch {
    /* the tracker is one click away regardless */
  }
  ui.notifications.info(L("BLANKINHERITANCE.Runner.FightSetup.Done", { name: encounter.name ?? encounter.id, count: creatures.length }));
  if (missing.length) ui.notifications.warn(L("BLANKINHERITANCE.Runner.FightSetup.Missing", { missing: missing.join(", ") }));
  return combat;
}
