/**
 * Extracts a plain-data snapshot from a live sf2e Actor (PC or NPC/creature
 * token alike — both expose this same top-level shape) and hands it to
 * core/sheet-model.mjs for shaping. This file is the ONLY place that reads
 * actor internals for the console's full-sheet surface, so a system update
 * that renames a field breaks one file, not every template.
 *
 * Every field path here was read off a real, live level-1 sf2e pregen
 * (Foundry v14.367 / sf2e system, 2026-09-17) rather than assumed —
 * `system.attributes.speed` does not exist in this system (that's the PF2e
 * shape); real speed lives at `system.movement.speeds`, found only by
 * checking live after a first guess came back MISSING. See
 * design/testing-strategy.md's "verify against the real tree" doctrine.
 */

import {
  overviewModel,
  formatMod,
  proficiencyDots,
  strikeRows as shapeStrikeRows,
  spellcastingBlocks as shapeSpellcastingBlocks,
  inventoryGroups as shapeInventoryGroups,
  featGroups as shapeFeatGroups
} from "../core/sheet-model.mjs";
import { checkGroupsFor } from "./rolls.mjs";

const PHYSICAL_TYPES = new Set(["weapon", "armor", "equipment", "consumable", "ammo", "treasure", "backpack"]);

function extractSpeeds(actor) {
  const speeds = actor.system.movement?.speeds ?? {};
  const land = speeds.land?.value ?? 0;
  const otherSpeeds = Object.entries(speeds)
    .filter(([type, s]) => type !== "land" && type !== "travel" && type !== "terrain" && s)
    .map(([type, s]) => ({ label: s.label ?? type, value: s.value ?? 0 }));
  return { value: land, otherSpeeds };
}

function extractConditions(actor) {
  const active = actor.conditions?.active ?? [];
  return active.map((c) => ({
    slug: c.slug,
    label: c.name,
    value: c.system?.value?.value ?? (typeof c.system?.value === "number" ? c.system.value : null)
  }));
}

/** Raw snapshot shared by Overview, Skills(reuses checkGroupsFor separately) and every other tab. */
function baseSnapshot(actor) {
  const sys = actor.system;
  return {
    name: actor.name,
    img: actor.img,
    level: sys.details?.level?.value ?? null,
    ancestryName: actor.ancestry?.name ?? null,
    backgroundName: actor.background?.name ?? null,
    className: actor.class?.name ?? null,
    abilities: sys.abilities ?? {},
    hp: sys.attributes?.hp ?? { value: 0, max: 0 },
    ac: sys.attributes?.ac ?? { value: 10 },
    perception: sys.perception ?? { value: 0, dc: 10 },
    speed: extractSpeeds(actor),
    saves: sys.saves ?? {},
    heroPoints: sys.resources?.heroPoints ?? null,
    focus: sys.resources?.focus ?? null,
    investiture: sys.resources?.investiture ?? null,
    conditions: extractConditions(actor)
  };
}

/** The Overview tab's whole context, for either seat — pass any live actor (PC, NPC, or null). */
export function sheetOverview(actor) {
  if (!actor) return null;
  return overviewModel(baseSnapshot(actor));
}

/**
 * The Skills tab: `checkGroupsFor`'s own grouping/lore-detection, enriched
 * with the actual modifier — `checkGroupsFor` deliberately omits it (the
 * bar's tiny buttons have no room to show one), but design/ux-doctrine.md
 * Law 1 ("show the number that will actually be rolled") means a full-size
 * tab must not repeat that omission. `actor.system.skills`/`.system.saves`
 * carry the flat `{mod, rank}` a live Statistic's own getters would also
 * give, verified live against a real pregen 2026-09-17.
 */
export function sheetSkillGroups(actor) {
  if (!actor) return [];
  const skillData = actor.system.skills ?? {};
  const saveData = actor.system.saves ?? {};
  // Perception is neither a skill nor a save, so it is in neither map above;
  // without this it silently read +0 Untrained for every creature.
  const perceptionData = actor.system.perception ?? {};
  return checkGroupsFor(actor).map((group) => ({
    ...group,
    entries: group.entries.map((entry) => {
      const flat = entry.slug === "perception" ? perceptionData : skillData[entry.slug] ?? saveData[entry.slug] ?? {};
      const mod = Number(flat.mod ?? flat.value ?? 0);
      return { ...entry, mod, modLabel: formatMod(mod), ...proficiencyDots(flat.rank ?? 0) };
    })
  }));
}

/** The Strikes tab. Sf2e stores strikes as `system.actions`, verified live: {label,slug,ready,traits,variants:[{label}]}. */
export function sheetStrikes(actor) {
  if (!actor) return [];
  return shapeStrikeRows(actor.system.actions ?? []);
}

/**
 * The Spells tab. `actor.spellcasting` is a live Collection of casting
 * entries; each entry's own `getSheetData()` (verified live) does the same
 * slot/prepared-list bookkeeping the real character sheet uses, so this
 * never recomputes what sf2e already computed (design/ux-doctrine.md Law 18).
 */
export async function sheetSpellcasting(actor) {
  if (!actor?.spellcasting?.contents?.length) return [];
  const entries = await Promise.all(
    actor.spellcasting.contents.map(async (entry) => {
      const sheetData = await entry.getSheetData();
      return {
        name: entry.name,
        tradition: sheetData.tradition,
        category: sheetData.category,
        dc: sheetData.statistic?.dc?.value ?? null,
        attackBonus: sheetData.statistic?.check?.mod ?? null,
        groups: (sheetData.groups ?? []).map((g) => ({
          id: g.id,
          label: typeof g.label === "string" && !g.label.includes(".") ? g.label : (g.id === "cantrips" ? "Cantrips" : `Rank ${g.id}`),
          uses: g.uses ?? null,
          active: (g.active ?? []).filter(Boolean).map((a) => ({ name: a.spell?.name, expended: !!a.expended }))
        }))
      };
    })
  );
  return shapeSpellcastingBlocks(entries);
}

/** The Gear tab's inventory half — every physical item, grouped by type. */
export function sheetInventory(actor) {
  if (!actor) return [];
  const items = actor.items.contents
    .filter((i) => PHYSICAL_TYPES.has(i.type))
    .map((i) => ({
      id: i.id,
      name: i.name,
      img: i.img,
      type: i.type,
      quantity: i.system?.quantity ?? 1,
      bulk: i.system?.bulk?.value ?? null,
      equipped: i.system?.equipped?.carryType === "worn" || i.system?.equipped?.carryType === "held",
      identified: i.system?.identification?.status !== "unidentified"
    }));
  return shapeInventoryGroups(items);
}

/** The Gear tab's feats-and-features half. */
export function sheetFeats(actor) {
  if (!actor) return [];
  const items = actor.items.contents
    .filter((i) => i.type === "feat")
    .map((i) => ({ id: i.id, name: i.name, img: i.img, featType: i.system?.category ?? "bonus", traits: i.system?.traits?.value ?? [] }));
  return shapeFeatGroups(items);
}

/** The slice of a member's data the Director's Party tab needs — cheaper than a full sheetOverview per row on a six-PC roster. */
export function partyMemberSnapshot(actor) {
  return {
    id: actor.id,
    name: actor.name,
    img: actor.img,
    level: actor.system.details?.level?.value ?? null,
    hp: actor.system.attributes?.hp ?? { value: 0, max: 0 },
    ac: actor.system.attributes?.ac?.value ?? 10,
    perception: actor.system.perception?.value ?? 0,
    conditions: extractConditions(actor)
  };
}

/** Total credits on hand — the one SF2E-specific currency worth a headline number, summed off every treasure/price-bearing item's own credits value. */
export function creditsOnHand(actor) {
  if (!actor) return 0;
  return actor.items.contents
    .filter((i) => i.type === "treasure")
    .reduce((sum, i) => sum + (i.system?.price?.value?.credits ?? 0) * (i.system?.quantity ?? 1), 0);
}
