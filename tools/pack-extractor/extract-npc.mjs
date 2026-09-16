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
 *
 * EXTENDED AGAIN (design doc §38, first NPC area/burst attack — Tough's Frag Grenade): every real
 * grenade this project has ever extracted (Lunar-17, Tapkey, Bennit's, now Tough's) was flagged as
 * "not wired — no area-effect mechanism exists." deriveAreaAttack() below is that mechanism's real
 * extraction half — see its own header for exactly what's structural vs. hand-supplied.
 */
import { readPackDocuments } from "./read-pack.mjs";

/**
 * An actor's own embedded items, in Foundry's real authored display order — never the order they
 * happened to come out of the pack read. `documents` (read-pack.mjs) comes back in raw LevelDB
 * storage order: ascending internal-key order once a pack is compacted into an SSTable (which sorts
 * by embedded-item `_id`, an opaque random string with no relationship to authoring order), or
 * write order while entries still live in the write-ahead log — two DIFFERENT orderings with nothing
 * to do with each other, and which one applies to a given item is a fact about when Foundry last
 * compacted, not about the item itself. Confirmed live: re-running this project's own fixture
 * generator after gamesystems/sf2e's packs had compacted from WAL to a single SSTable silently
 * reordered erabryth.json's actions/lore and kuriaku.json's actions arrays — every item byte-
 * identical, only array order changed — even though nothing about the campaign data had changed.
 * Foundry itself never relies on storage order for this: every embedded Item document carries its
 * own real `sort` field (confirmed present on every item in every pack checked), the exact number
 * Foundry's own sheet UI persists and reads back to keep an actor's item list stable regardless of
 * how the database happens to store it. Sorting by it here reproduces the pre-compaction order
 * exactly (cross-checked against the committed fixtures). The idPart tiebreak only matters if two
 * items ever shared a `sort` value; it exists so the order stays a pure function of document content
 * even then, never of storage layout.
 */
function itemsFor(documents, actorIdPart) {
  return documents
    .filter((e) => e.embedded && e.collection === "actors.items" && e.idPart.startsWith(actorIdPart + "."))
    .sort((a, b) => (a.doc.sort ?? 0) - (b.doc.sort ?? 0) || (a.idPart < b.idPart ? -1 : a.idPart > b.idPart ? 1 : 0));
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

/**
 * Shared use-limit derivation for an NPC spell (design doc §76.9, GH #69/#55). A DELIBERATELY
 * SEPARATE copy from build-combat-pregen.mjs's own identically-named helper, not a cross-tool import
 * — this project's own established convention (personnel-engine/world/pathfind.mjs's duplicated
 * MinHeap over a cross-tree coupling) keeps tools/pack-extractor and tools/character-builder
 * independently self-contained. Same rule, same reasoning either side: a cantrip is castable "at
 * will, any number of times per day" (Player Core pg. 283) — never slot-limited. This file's own only
 * real spell, Gouging Claw, IS a cantrip — an earlier, unguarded version of this file's own
 * deriveSpellAttacks would have silently produced no usesRemaining for it only by accident (its own
 * spellcastingEntry happens to carry empty slots), not because anything checked; a future NPC (#64)
 * whose cantrip DOES share a populated slots entry with a real leveled spell would have silently
 * capped an at-will attack, the exact regression GH #69 found and fixed on the PC side.
 */
function deriveSpellUsesRemaining(spell, entry) {
  if ((spell.system.traits?.value ?? []).includes("cantrip")) return { atWill: true };
  return { usesRemaining: entry.system.slots?.slot1?.max ?? null };
}

/**
 * Foundry's real, complete frequency-scope enum (`CONFIG.PF2E.frequencies`, gamesystems/sf2e/sf2e.mjs)
 * mapped to an approximate real round count — Player Core: 6 seconds per round
 * (reference/srd/player-core/470-encounter-mode.json). Used to decide whether a `system.frequency`
 * value is safe to flatten into a single, never-refreshing `usesRemaining` count (design doc §76.9).
 */
const FREQUENCY_ROUNDS = {
  turn: 1, round: 1, PT1M: 10, PT10M: 100, PT1H: 600, PT24H: 8640, day: 8640,
  P1W: 60480, P1M: 259200, P1Y: 3153600
};

/**
 * Safe to derive `usesRemaining = frequency.max` only when the frequency's own real scope is
 * comfortably longer than this project's own longest real scenario — confirmed 60 rounds (not just
 * the 30-40 an individual scenario file's own default suggests: run-personnel-scenario.mjs's CLI
 * layer overrides several entries to 60, and real logged runs in logs/index.json have genuinely
 * reached it). 100 rounds clears that with real margin. Below it (`turn`/`round`/`PT1M` — 1-10 real
 * rounds), an ability would recharge mid-battle for real, and flattening it to "N uses, ever, never
 * refreshing" would be WRONG, not just imprecise — this project's usesRemaining model has no
 * refresh-on-a-timer mechanism to express the real rule correctly. Throws rather than silently
 * guessing, matching deriveTransferVitality's own established precedent of refusing to proceed rather
 * than inventing a number — a real, live case: this project's own packs already contain 64 real
 * `action`-type items with a round/PT1M-scoped frequency (GH #69's own investigation), any of which
 * #64's future NPC imports could hit.
 */
function deriveUsesFromFrequency(name, frequency) {
  if (!frequency) return null;
  const rounds = FREQUENCY_ROUNDS[frequency.per];
  if (rounds == null) {
    throw new Error(`"${name}": unrecognized frequency.per "${frequency.per}" — not one of CONFIG.PF2E.frequencies' real values, needs a human look rather than a guess.`);
  }
  if (rounds < 100) {
    throw new Error(`"${name}": frequency "${frequency.max} per ${frequency.per}" (~${rounds} real rounds) would recharge mid-battle — flattening it to a single never-refreshing usesRemaining count would be wrong, not just imprecise. This ability's real limit needs a genuine decision (a refresh mechanism, or accepting the imprecision explicitly), not a silent guess.`);
  }
  return frequency.max;
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

  // GH #63: initiative is Player Core pg. 427's "roll a Perception check," and every real NPC's own
  // raw data confirms this explicitly rather than assuming it — system.initiative.statistic names
  // the actual statistic this creature uses (checked directly across every current fixture: always
  // "perception", but the field exists precisely because it need not be). Throwing on anything else
  // matches this project's own established "safe cases derive a real number, unsafe ones throw
  // rather than silently mismodel" discipline (GH #69's own conditionSave frequency gate) — better
  // to notice a future NPC with a different initiative statistic than to silently derive it wrong.
  if (npc.actor.system.initiative.statistic !== "perception") {
    throw new Error(`${npc.name}: initiative uses "${npc.actor.system.initiative.statistic}", not Perception — toCombatant only knows how to derive initiativeModifier from Perception today.`);
  }

  const strikes = strikeNames.map((wantedName) => {
    const melee = meleeItems.find((m) => m.name === wantedName);
    if (!melee) throw new Error(`No melee/strike item named "${wantedName}" on ${npc.name}.`);
    // GH #148 — found investigating Scrap Rat's real Frag Grenade, which GH #64's own closing comment
    // mischaracterized as "a genuine single-target thrown Strike, not a burst/area effect" without
    // actually checking this field: its real system.action is "area-fire" (a genuine burst effect,
    // same shape as Tough's already-wired Frag Grenade — see deriveAreaAttack below), and a repeat
    // sweep of every melee-type item across this project's three available bestiary packs found 22
    // more area-fire items and 5 auto-fire items, none of them ever a genuine Strike. Blocked here
    // rather than left to silently produce a strike with a meaningless "attackBonus" (really a
    // basic-save DC's own 10+bonus basis) and zero friendly-fire risk from its own burst radius —
    // exactly the mistake deriveAreaAttack's own header says this project used to make before it
    // existed. Route an area-fire item through deriveAreaAttack, and an auto-fire one stays
    // unwired entirely (this project's own established "out-of-scope multi-target category," e.g.
    // Tough's Scattergun) — never through here.
    if (melee.system.action === "area-fire" || melee.system.action === "auto-fire") {
      throw new Error(`"${wantedName}" on ${npc.name} has system.action "${melee.system.action}", not "strike" — never wire a burst/multi-target effect as a single-target Strike. Use deriveAreaAttack for a real area-fire burst, or leave an auto-fire weapon unwired (this project's established out-of-scope category).`);
    }
    const isRanged = melee.system.range != null;
    const [damageEntry] = Object.values(melee.system.damageRolls ?? {});
    if (!damageEntry) throw new Error(`"${wantedName}" on ${npc.name} has no damageRolls entry to derive damage from.`);
    const { dice, bonus } = parseDamageString(damageEntry.damage);
    // GH #148: a real ranged Strike's range is EITHER a firearm-style increment (Player Core pg. 254:
    // -2 penalty per increment beyond the first, illegal past the 6th) OR — a real, if so-far
    // unpopulated in this project's own data, shape — a flat maximum with no increment scaling at all
    // (legality.mjs's checkStrikeRange/rangeIncrementPenalty, personnel-engine/evaluate/state-value.mjs's
    // usefulRangeFeet/maxLegalRangeFeet all understand both). Never both at once in the raw data seen
    // so far — reading whichever one is actually present rather than assuming increment.
    const rangeShape = isRanged
      ? (melee.system.range.increment != null ? { rangeIncrement: melee.system.range.increment } : { rangeMax: melee.system.range.max })
      : {};

    return {
      name: melee.name,
      strikeType: isRanged ? "ranged" : "melee",
      attackBonus: melee.system.bonus.value,
      ...rangeShape,
      traits: melee.system.traits?.value ?? [],
      damage: [{ dice, bonus, damageType: damageEntry.damageType }]
    };
  });

  return {
    name: npc.name,
    side,
    level: npc.actor.system.details.level.value, // GH #63 — real, final; NPCs store this directly, no derivation needed
    initiativeModifier: npc.actor.system.perception.mod, // GH #63 — real, final Perception modifier (see the statistic guard above)
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
      ...(damageEntry ? { damage: [{ dice: damageEntry.formula, bonus: 0, damageType: damageEntry.type }] } : {}),
      ...deriveSpellUsesRemaining(spell, entry)
    };
  });
}

/**
 * Derive a real condition-only save action (design doc §22 — Erabryth's Forced Reflection).
 * Genuinely different shape from every other NPC action derived so far: the target rolls a save,
 * but the effect is a per-degree table of CONDITIONS (Frightened/Stunned), not a flat damage
 * multiplier. Only the DC comes off a real structured field (the NPC's spellcastingEntry, the SAME
 * `spelldc.dc` field deriveSpellAttacks already reads — confirmed directly against Erabryth's own
 * raw data that this matches the `@Check[will|dc:17]` embedded in her action's own free-text
 * description exactly, two independent sources agreeing). Everything else — which save, the range,
 * and above all the per-degree outcome table itself — is HAND-TRANSCRIBED by the caller from the
 * action's real description prose, because nothing in the raw data structures any of that: an
 * `action`-type item has no `defense.save` field the way a spell does, and definitely no per-degree
 * condition table anywhere machine-readable. Same "hand-identify, cite verbatim, never infer"
 * discipline as every other prose-only case in this project.
 */
/**
 * Derive a real area/burst attack (design doc §38 — e.g. Tough's Frag Grenade). Genuinely different
 * from every Strike/spell above: the raw `melee`-type attack-row item has NO attack-roll bonus in
 * the personnel-engine sense at all — `system.action` is `"area-fire"`, not `"strike"` (the same
 * structural field toCombatant's header already names as "a real, citable, structural signal"), and
 * `system.bonus.value` is instead the modifier the system's own UI turns into a basic-save DC via
 * the standard "10 + bonus" convention (there is no separate stored DC field anywhere on the item —
 * confirmed by reading its raw JSON directly, not assumed). Structurally read from the raw data:
 * DC, throw range, burst radius (`system.area.value`), damage. Hand-supplied by the caller, same
 * "hand-identify, don't infer" discipline as deriveConditionSave: `saveType` (Player Core: every
 * area weapon found so far is a basic REFLEX save, but nothing marks that structurally on the item
 * itself) and `actions` (the item carries no action-cost field at all — its own description prose
 * says "Activate 1 Area Fire", which is exactly the kind of free text this project always hand-
 * transcribes rather than parses). `usesRemaining` comes from the real carried quantity on the
 * PAIRED `weapon`-type item of the same name (a grenade you've thrown is a grenade you don't have
 * anymore) — the same weapon/melee-item pairing toCombatant's own header documents for Strikes.
 *
 * GH #148: the raw `system.range` shape for a real area-fire item is genuinely inconsistent ACROSS
 * PACKS, confirmed by a direct sweep of every area-fire item in this project's three available
 * bestiary packs — `rulebook-bestiaries`/`starfinder-society-bestiary` store the flat throw range
 * under `.increment` (Tough's own real `{increment: 70, max: null}`, which is why this function's
 * original `item.system.range?.increment` alone worked for her), while EVERY `alien-core-bestiary`
 * area-fire item stores the identical real number under `.max` instead (`{increment: null, max: 70}`
 * — Scrap Rat's own real shape). Reading only `.increment` silently produced `range: null` for any
 * alien-core-bestiary grenade, which checkAreaAttackLegal's own `?? FEET_PER_SQUARE` convention would
 * then have silently treated as touch-range-only — a real, separate bug from #148's main one, caught
 * here specifically because Scrap Rat is this project's first alien-core-bestiary area-fire wire-up.
 *
 * `carriedWeaponName` (optional, defaults to `name`) exists because the melee attack-row item and its
 * paired weapon-type carried item don't always share an exactly identical name either — Tough's real
 * data has both named "Frag Grenade (Commercial)", but Scrap Rat's melee item is named "Frag Grenade"
 * while her weapon-type sibling is "Frag Grenade (Commercial)". Defaulting to `name` keeps every
 * existing call site (Tough's own) byte-identical; only a real name mismatch needs the override.
 */
export function deriveAreaAttack(npc, { name, saveType, actions, carriedWeaponName = name }) {
  const item = npc.items.find((i) => i.type === "melee" && i.name === name);
  if (!item) throw new Error(`No melee/attack-row item named "${name}" on ${npc.name}.`);
  if (item.system.action !== "area-fire") {
    throw new Error(`"${name}" on ${npc.name} has system.action "${item.system.action}", not "area-fire" — deriveAreaAttack only supports a real area-fire burst effect.`);
  }
  if (item.system.area?.type !== "burst") {
    throw new Error(`"${name}" on ${npc.name}: expected a burst-shaped area, got "${item.system.area?.type}" — a cone/line effect (e.g. a scattergun) needs a different shape entirely, not supported here.`);
  }
  const [damageEntry] = Object.values(item.system.damageRolls ?? {});
  if (!damageEntry) throw new Error(`"${name}" on ${npc.name} has no damageRolls entry to derive damage from.`);
  const { dice, bonus } = parseDamageString(damageEntry.damage);
  const carriedWeapon = npc.items.find((i) => i.type === "weapon" && i.name === carriedWeaponName);

  return {
    name: item.name,
    saveType,
    dc: 10 + item.system.bonus.value,
    range: item.system.range?.increment ?? item.system.range?.max ?? null,
    radius: item.system.area.value,
    actions,
    traits: item.system.traits?.value ?? [],
    damage: [{ dice, bonus, damageType: damageEntry.damageType }],
    usesRemaining: carriedWeapon?.system.quantity ?? null
  };
}

export function deriveConditionSave(npc, { name, saveType, range, outcomes }) {
  const action = npc.items.find((i) => i.type === "action" && i.name === name);
  if (!action) throw new Error(`No action named "${name}" on ${npc.name}.`);
  const entry = npc.items.find((i) => i.type === "spellcastingEntry");
  if (!entry) throw new Error(`"${name}" on ${npc.name}: no spellcastingEntry found to source a DC from.`);

  // design doc §76.9 / GH #69: a real, encounter-scoped-or-longer frequency derives a real limit; an
  // action with no frequency data at all (e.g. Erabryth's own Forced Reflection) stays dormant/
  // unlimited, same honest "nothing to derive" outcome as every other real gap in this project — not
  // silently invented, not hidden.
  const usesRemaining = deriveUsesFromFrequency(name, action.system.frequency);

  return {
    name: action.name,
    saveType,
    dc: entry.system.spelldc.dc,
    range,
    actions: action.system.actions?.value ?? 1,
    traits: action.system.traits?.value ?? [],
    outcomes,
    ...(usesRemaining != null ? { usesRemaining } : {})
  };
}
