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
 *
 * EXTENDED (design doc §21's "bigger battlefield" follow-up, first spellcasting NPC — Xenowarden
 * Greenhorn): deriveSpellAttacks() below reads attack-roll spells the same read-and-rename way as
 * everything else in this file. Unlike a PC's spell (build-combat-pregen.mjs's deriveSpells, which
 * derives an attack bonus from proficiency rank + ability modifier), an NPC's spellcastingEntry
 * already carries a FINAL, precomputed `system.spelldc.{value,dc}` pair — confirmed directly against
 * Xenowarden Greenhorn's own raw data (`{"dc":14,"value":6}`) — so no ability-modifier math is
 * needed at all, exactly the same "NPCs store final numbers" shape this file's header already
 * documents for Strikes/AC/saves.
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

/**
 * Derive real attack-roll spells for an NPC, by explicit name (same "hand-identified, not
 * auto-detected" discipline as build-combat-pregen.mjs's deriveSaveAttacks — nothing structurally
 * marks a spell as combat-relevant vs. exploration/utility besides its own "attack" trait, which
 * this function DOES check, but a caller must still choose which attack-roll spells are worth
 * wiring in). Output shape matches the PC side's derived spell exactly ({name, attackBonus, range,
 * actions, traits, damage?}) so personnel-engine/engine.mjs's spellAttack action — which only ever
 * reads `combatant.spells`, never anything PC-specific — needs zero changes to accept it.
 *
 * Two real gaps handled here, both found by running this against Xenowarden Greenhorn's own raw
 * data rather than assumed:
 *  - RANGE: Gouging Claw's raw range is the string "touch", not a number of feet. A naive
 *    `parseInt("touch", 10)` silently produces NaN, and personnel-engine/legality.mjs's
 *    `checkSpellRange` computes `maxRange = spell.range ?? FEET_PER_SQUARE` — since `??` only falls
 *    back on null/undefined, NOT NaN, a NaN range would silently survive into `dist > maxRange`,
 *    which is ALWAYS false for any finite dist (NaN comparisons are always false) — meaning the
 *    spell would be legally castable from literally anywhere on the map, the opposite of "touch".
 *    Fixed here by mapping any non-numeric range string to `null`, matching checkSpellRange's own
 *    documented convention ("no range field means touch/adjacent-only").
 *  - PERSISTENT DAMAGE: Gouging Claw's real damage is TWO entries (2d6 untyped instant + 2
 *    persistent bleed) — only the first (instant) entry is taken, same scope limit already
 *    documented for the PC side's firstSpellDamage, and for the same reason: personnel-engine has
 *    no persistent-damage-over-time mechanism to apply the second entry to. Not silently dropped
 *    without a record — flagged here in code, same as every other honest gap in this project.
 */
export function deriveSpellAttacks(npc, spellNames) {
  return spellNames.map((wantedName) => {
    const spell = npc.items.find((i) => i.type === "spell" && i.name === wantedName);
    if (!spell) throw new Error(`No spell named "${wantedName}" on ${npc.name}.`);
    if (!(spell.system.traits?.value ?? []).includes("attack")) {
      throw new Error(`"${wantedName}" is not an attack-roll spell (no "attack" trait) — deriveSpellAttacks only supports attack-roll spells, same as the PC side.`);
    }
    const entry = npc.items.find((i) => i.type === "spellcastingEntry" && i._id === spell.system.location.value);
    if (!entry) throw new Error(`"${wantedName}" on ${npc.name}: no spellcastingEntry found matching its own system.location.value.`);

    const parsedRange = parseInt(spell.system.range?.value, 10);
    const [damageEntry] = Object.values(spell.system.damage ?? {}); // integer-like keys iterate first — always the instant entry, never a persistent one

    return {
      name: spell.name,
      attackBonus: entry.system.spelldc.value,
      range: Number.isFinite(parsedRange) ? parsedRange : null,
      actions: parseInt(spell.system.time.value, 10),
      traits: spell.system.traits.value,
      ...(damageEntry ? { damage: [{ dice: damageEntry.formula, bonus: 0, damageType: damageEntry.type }] } : {})
    };
  });
}
