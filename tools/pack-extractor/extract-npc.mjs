/**
 * NPC extraction (design doc §19 Phase 2) — a read-and-rename job, not derivation. Unlike a
 * `character`-type pregen (system.abilities is null, everything is boost CHOICES to resolve — see
 * extract-pregen.mjs), an `npc`-type actor already stores every combat number final and
 * precomputed: system.attributes.ac.value, system.saves.*.value, and — critically — each Strike's
 * real attack bonus/damage live on a paired `melee`-type item (system.bonus.value,
 * system.damageRolls), NOT on the `weapon`-type item of the same name (that one carries only
 * flavor/traits/category, confirmed empirically against Security Goon's own real raw data: her
 * "Arc Pistol" exists as BOTH a `melee` item with the real numbers and a `weapon` item with none,
 * linked by `flags.sf2e.linkedWeapon`).
 *
 * SCOPE, matching build-combat-pregen.mjs's own explicit line: only attack-roll Strikes are
 * derived. A save-based special action (Security Goon's own "License to Break Bones" — Fortitude
 * DC 16, four distinct outcomes) is skipped for the same reason a save-based grenade is skipped on
 * the PC side — personnel-engine has no saving-throw-based action mechanism at all, and nothing in
 * the raw data distinguishes "attack roll" from "target saves" without reading free-text prose.
 * Reactions and other actions stay on the combatant as real, cited, DESCRIPTIVE data (name,
 * verbatim trigger/effect text) — not mechanically wired, matching personnel-engine/engine.mjs's
 * own stated stance on reactions until a real trigger condition is worth building.
 */
import { readPackDocuments } from "./read-pack.mjs";

function itemsFor(documents, actorIdPart) {
  return documents.filter((e) => e.embedded && e.collection === "actors.items" && e.idPart.startsWith(actorIdPart + "."));
}

/** Find one `npc`-type actor by exact name in a pack, with every embedded item attached. */
export function findNPC(packDir, name) {
  const { documents } = readPackDocuments(packDir);
  const actorDoc = documents.find((d) => !d.embedded && d.doc.type === "npc" && d.doc.name === name);
  if (!actorDoc) return null;
  return { name: actorDoc.doc.name, actor: actorDoc.doc, items: itemsFor(documents, actorDoc.idPart).map((i) => i.doc) };
}

/** An NPC melee/weapon item's `system.damageRolls` formula is a combined string ("1d4+2"), not the PC side's {dice,die} split — parse it into personnel-engine's {dice,bonus} shape. */
function parseDamageString(formula) {
  const m = formula.match(/^(\d+d\d+)([+-]\d+)?$/);
  if (!m) throw new Error(`Cannot parse damage formula "${formula}" — expected e.g. "1d4+2" or "1d6".`);
  return { dice: m[1], bonus: m[2] ? parseInt(m[2], 10) : 0 };
}

function describeAction(item) {
  return {
    name: item.name,
    actionType: item.system.actionType.value,
    actionsCost: item.system.actions?.value ?? null,
    description: item.system.description.value // verbatim HTML, real trigger/effect text — never paraphrased
  };
}

/**
 * @param {object} npc - from findNPC()
 * @param {string[]} strikeNames - explicit inclusion list of `melee`-type item names to derive as
 *   real attack-roll Strikes — never "every melee item present", so a save-based special action
 *   sharing the same item type never silently becomes a Strike.
 */
export function toCombatant(npc, { strikeNames, side = "opposition" } = {}) {
  const meleeItems = npc.items.filter((i) => i.type === "melee");
  const actionItems = npc.items.filter((i) => i.type === "action");
  const loreItems = npc.items.filter((i) => i.type === "lore");

  const strikes = strikeNames.map((wantedName) => {
    const melee = meleeItems.find((m) => m.name === wantedName);
    if (!melee) throw new Error(`No melee/strike item named "${wantedName}" on ${npc.name}.`);
    const isRanged = melee.system.range != null;
    const [damageEntry] = Object.values(melee.system.damageRolls ?? {});
    if (!damageEntry) throw new Error(`"${wantedName}" on ${npc.name} has no damageRolls entry to derive damage from.`);
    const { dice, bonus } = parseDamageString(damageEntry.damage);

    return {
      name: melee.name,
      strikeType: isRanged ? "ranged" : "melee",
      attackBonus: melee.system.bonus.value,
      ...(isRanged ? { rangeIncrement: melee.system.range.increment } : {}),
      traits: melee.system.traits?.value ?? [],
      damage: [{ dice, bonus, damageType: damageEntry.damageType }]
    };
  });

  return {
    name: npc.name,
    side,
    maxHP: npc.actor.system.attributes.hp.max,
    currentHP: npc.actor.system.attributes.hp.value,
    ac: npc.actor.system.attributes.ac.value,
    saves: {
      fort: npc.actor.system.saves.fortitude.value,
      ref: npc.actor.system.saves.reflex.value,
      will: npc.actor.system.saves.will.value
    },
    speed: npc.actor.system.attributes.speed.value,
    strikes,
    reactions: actionItems.filter((a) => a.system.actionType.value === "reaction").map(describeAction),
    actions: actionItems.filter((a) => a.system.actionType.value !== "reaction").map(describeAction),
    lore: loreItems.map((l) => ({ name: l.name, modifier: l.system.mod.value })),
    // Real, final skill modifiers — an NPC's system.skills only lists the skills it's actually
    // trained in (design doc §19's skill-actions-in-combat expansion); every other of the 18 real
    // skills is implicitly untrained with no listed bonus, so this is deliberately NOT padded out
    // to all 18 with a guessed untrained-plus-ability-mod number this file has no ability score to
    // compute from anyway (NPC system.abilities.*.mod exists but deriving "untrained skill X" from
    // it for a skill nobody bothered to list is inventing a number nothing in the raw data asked for).
    skills: Object.fromEntries(Object.entries(npc.actor.system.skills ?? {}).map(([name, s]) => [name, s.base]))
  };
}
