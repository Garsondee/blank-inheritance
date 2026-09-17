/**
 * Pure shaping for the full character-sheet surface (the console's Dossier
 * and the Director's "Selected" tab both read through this — a PC and an
 * NPC/creature token both expose the same top-level sf2e shape:
 * system.abilities / .attributes.hp / .attributes.ac / .perception /
 * .attributes.speed / .saves, verified live against a real level-1 pregen
 * 2026-09-17). Input to every function here is plain, already-extracted
 * data (numbers/strings/plain objects) pulled off a live actor by
 * foundry/sheet-data.mjs — nothing here touches Foundry globals, per
 * design/testing-strategy.md's pure-core/thin-adapter split.
 */

const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };

const RANK_LABELS = ["Untrained", "Trained", "Expert", "Master", "Legendary"];

const INVENTORY_TYPE_ORDER = ["weapon", "armor", "equipment", "consumable", "ammo", "treasure", "backpack"];
const INVENTORY_TYPE_LABELS = {
  weapon: "Weapons",
  armor: "Armor",
  equipment: "Equipment",
  consumable: "Consumables",
  ammo: "Ammunition",
  treasure: "Treasure",
  backpack: "Containers"
};

// "ancestryfeature"/"classfeature" are real, distinct sf2e item.system.category
// values, found live 2026-09-17 (Chk Chk the shirren Mystic's "Limited Telepathy"
// and "Connection"/"Shadow"/etc.) — automatically-granted FEATURES, not the
// player-chosen FEATS ancestry/class already cover. Unmapped, they fell through
// to the raw category string and rendered as a literal "ancestryfeature" bank
// header instead of a real label.
const FEAT_TYPE_ORDER = ["ancestry", "class", "skill", "general", "background", "ancestryfeature", "classfeature", "bonus"];
const FEAT_TYPE_LABELS = {
  ancestry: "Ancestry Feats",
  class: "Class Feats",
  skill: "Skill Feats",
  general: "General Feats",
  background: "Background Feats",
  ancestryfeature: "Ancestry Features",
  classfeature: "Class Features",
  bonus: "Bonus Feats"
};

/** "+3" / "-1" / "+0" — every modifier in this UI is signed, never bare. */
export function formatMod(value) {
  const n = Number(value) || 0;
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * A 0-4 proficiency rank as 4 filled/unfilled dots (Untrained draws none
 * filled) plus its own label — the analog "how many ticks on the dial"
 * reading the north star's printed knob scale suggested, applied to
 * proficiency instead of a raw number.
 */
export function proficiencyDots(rank) {
  const clamped = Math.max(0, Math.min(4, Number(rank) || 0));
  return {
    rank: clamped,
    // rankLabel, deliberately not `label` -- both call sites below spread
    // this into an object that ALREADY has its own `label` (the save or
    // skill's own name). A bare `label` here silently overwrote it via
    // spread order and every save row read "Trained" instead of
    // "Fortitude" -- found live, 2026-09-17, not by reading the code.
    rankLabel: RANK_LABELS[clamped] ?? RANK_LABELS[0],
    dots: [1, 2, 3, 4].map((n) => n <= clamped)
  };
}

/**
 * A signed modifier onto the knob filmstrip's 128 frames (0-127). SF2E
 * ability modifiers realistically run about -5 (an 8 stat before any boosts)
 * to +9 (an 18 stat plus a few apex items) across a whole campaign, not the
 * -infinity..+infinity a bare linear map would need to guard — clamped to
 * that range and spread across the full sweep so the knob visibly turns
 * between a below-average and an exceptional score instead of sitting in a
 * narrow sliver of the dial.
 */
const KNOB_MOD_MIN = -5;
const KNOB_MOD_MAX = 9;
export function modToKnobFrame(mod) {
  const clamped = Math.max(KNOB_MOD_MIN, Math.min(KNOB_MOD_MAX, Number(mod) || 0));
  const t = (clamped - KNOB_MOD_MIN) / (KNOB_MOD_MAX - KNOB_MOD_MIN);
  return Math.round(t * 127);
}

/** The six abilities, fixed order, each with a signed modifier and dots would be wrong here — abilities aren't ranked, so no proficiency call. */
export function abilityRows(abilities = {}) {
  return ABILITY_ORDER.map((key) => {
    const entry = abilities[key] ?? {};
    const mod = Number(entry.mod ?? 0);
    return { key, label: ABILITY_LABELS[key], mod, modLabel: formatMod(mod), frame: modToKnobFrame(mod) };
  });
}

/**
 * HP with a status tier for the gauge's colour — `ok`/`hurt`/`critical`/`down`.
 * Deliberately not named after any real SF2E condition (there isn't a
 * "Bloodied" rule in this system) — this is a display affordance only, the
 * same way a fuel gauge going red doesn't claim to be a rule.
 */
export function hpStatus(hp = {}) {
  const value = Number(hp.value ?? 0);
  const max = Math.max(1, Number(hp.max ?? 1));
  const temp = Number(hp.temp ?? 0);
  const pct = Math.max(0, Math.min(1, value / max));
  let tier = "ok";
  if (value <= 0) tier = "down";
  else if (pct <= 0.25) tier = "critical";
  else if (pct <= 0.5) tier = "hurt";
  return { value, max, temp, pct, tier };
}

/** AC/Perception/Speed — thin pass-through with signed-formatted numbers added, so templates never call formatMod themselves. */
export function defenseBlock({ ac, perception, speed } = {}) {
  return {
    ac: { value: Number(ac?.value ?? 10), breakdown: ac?.breakdown ?? "" },
    perception: { value: Number(perception?.value ?? 0), valueLabel: formatMod(perception?.value ?? 0), dc: Number(perception?.dc ?? 10) },
    speed: { value: Number(speed?.value ?? 0), otherSpeeds: (speed?.otherSpeeds ?? []).map((s) => ({ label: s.label, value: Number(s.value) })) }
  };
}

/** The three saves, each with a proficiency-dot readout alongside the modifier. */
export function saveRows(saves = {}) {
  return ["fortitude", "reflex", "will"].map((slug) => {
    const s = saves[slug] ?? {};
    const value = Number(s.value ?? 0);
    return { slug, label: s.label ?? slug, value, valueLabel: formatMod(value), ...proficiencyDots(s.rank ?? 0) };
  });
}

/** Hero Points / Focus / (Investiture only if the actor's class actually uses it) — the resources worth a gauge on Overview. */
export function resourceRows({ heroPoints, focus, investiture } = {}) {
  const row = (id, labelKey, value, max) => {
    const clampedMax = Math.max(1, Number(max));
    const clampedValue = Number(value ?? 0);
    return { id, labelKey, value: clampedValue, max: clampedMax, pct: Math.max(0, Math.min(1, clampedValue / clampedMax)) };
  };
  const rows = [];
  if (heroPoints) rows.push(row("hero-points", "BLANKINHERITANCE.Console.Sheet.HeroPoints", heroPoints.value, heroPoints.max ?? 3));
  if (focus?.max) rows.push(row("focus", "BLANKINHERITANCE.Console.Sheet.Focus", focus.value, focus.max));
  if (investiture?.max) rows.push(row("investiture", "BLANKINHERITANCE.Console.Sheet.Investiture", investiture.value, investiture.max));
  return rows;
}

/** Conditions as a flat lamp list — a numbered condition (e.g. Stunned 2) carries its value, an unnumbered one (e.g. Off-Guard) doesn't. */
export function conditionRows(conditions = []) {
  return conditions.map((c) => ({ slug: c.slug, label: c.label ?? c.slug, value: c.value ?? null }));
}

/**
 * Strikes, each variant given a stable index pair (actionIndex/variantIndex)
 * so the adapter can round-trip a click straight back to
 * `actor.system.actions[actionIndex].variants[variantIndex]` without the
 * template ever handling a slug.
 */
export function strikeRows(actions = []) {
  return actions.map((action, actionIndex) => ({
    actionIndex,
    label: action.label,
    slug: action.slug,
    ready: action.ready !== false,
    traits: (action.traits ?? []).map((t) => (typeof t === "string" ? t : t.name)),
    variants: (action.variants ?? []).map((v, variantIndex) => ({ variantIndex, label: v.label }))
  }));
}

/**
 * Spellcasting groups, straight from sf2e's own `entry.getSheetData()`
 * (verified live 2026-09-17: `{groups:[{id,label,uses,active:[{spell,expended}]}]}`)
 * reshaped so the template only ever sees plain strings/booleans, and each
 * castable spell carries the entry/group/index triple a click needs.
 */
/**
 * Whether a caster's spellcasting blocks are worth showing at all.
 *
 * A PC with no real caster class still carries a "Rituals" entry (sf2e
 * gives every character one) — `blocks.length > 0` alone is true for
 * everyone, and the Spells tab rendered an empty "Rituals" header over
 * nothing for a non-caster instead of the tab's own "no spellcasting"
 * message. Found live 2026-09-17. The honest check is whether any block
 * has any group with any actual spell in it.
 */
export function hasAnySpell(blocks = []) {
  return blocks.some((block) => block.groups?.some((group) => group.spells?.length > 0));
}

/** The same emptiness check, applied per-block — drops a bare "Rituals" entry with nothing in it rather than rendering its header over an empty body. */
export function nonEmptySpellBlocks(blocks = []) {
  return blocks.filter((block) => block.groups?.some((group) => group.spells?.length > 0));
}

export function spellcastingBlocks(entries = []) {
  return entries.map((entry, entryIndex) => ({
    entryIndex,
    name: entry.name,
    tradition: entry.tradition,
    category: entry.category,
    dc: entry.dc,
    attackBonus: entry.attackBonus,
    groups: (entry.groups ?? []).map((group) => ({
      id: group.id,
      label: group.label,
      uses: group.uses ?? null,
      spells: (group.active ?? [])
        .filter(Boolean)
        .map((a, spellIndex) => ({ entryIndex, spellIndex, name: a.name, expended: !!a.expended }))
    }))
  }));
}

/** Physical inventory, grouped by type in a fixed reading order, each item carrying what a player actually needs to decide whether to use it. */
export function inventoryGroups(items = []) {
  const byType = new Map();
  for (const item of items) {
    const type = item.type ?? "equipment";
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(item);
  }
  const order = [...INVENTORY_TYPE_ORDER, ...[...byType.keys()].filter((t) => !INVENTORY_TYPE_ORDER.includes(t))];
  return order
    .filter((type) => byType.has(type))
    .map((type) => ({
      type,
      label: INVENTORY_TYPE_LABELS[type] ?? type,
      items: byType
        .get(type)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({
          id: item.id,
          name: item.name,
          img: item.img,
          quantity: item.quantity ?? 1,
          showQuantity: (item.quantity ?? 1) > 1,
          bulk: item.bulk ?? null,
          equipped: !!item.equipped,
          showEquipped: type === "weapon" || type === "armor",
          identified: item.identified !== false
        }))
    }));
}

/** Feats and features, grouped by feat type — read-mostly, so this stays a flat labeled list rather than anything gauge-shaped. */
export function featGroups(items = []) {
  const byType = new Map();
  for (const item of items) {
    const type = item.featType ?? "bonus";
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(item);
  }
  const order = [...FEAT_TYPE_ORDER, ...[...byType.keys()].filter((t) => !FEAT_TYPE_ORDER.includes(t))];
  return order
    .filter((type) => byType.has(type))
    .map((type) => ({
      type,
      label: FEAT_TYPE_LABELS[type] ?? type,
      items: byType
        .get(type)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({ id: item.id, name: item.name, img: item.img, traits: item.traits ?? [] }))
    }));
}

/**
 * The whole Overview tab in one call — identity plus every gauge-shaped
 * block, none of the list-shaped ones (skills/strikes/spells/gear are their
 * own tabs and their own functions above).
 */
export function overviewModel(raw = {}) {
  return {
    identity: {
      name: raw.name ?? "",
      img: raw.img ?? null,
      level: raw.level ?? null,
      ancestryName: raw.ancestryName ?? null,
      backgroundName: raw.backgroundName ?? null,
      className: raw.className ?? null
    },
    hp: hpStatus(raw.hp),
    defenses: defenseBlock(raw),
    abilities: abilityRows(raw.abilities),
    saves: saveRows(raw.saves),
    resources: resourceRows(raw),
    conditions: conditionRows(raw.conditions)
  };
}
