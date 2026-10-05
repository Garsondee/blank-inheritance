/**
 * The NPC Generator: an archetype, a level and a few choices in; a `combatStatblock` out (data/schema/common/sf2e-common.schema.json),
 * built the way GM Core says to build a creature (Building Creatures, GM Core pp. 118-124): every statistic is a BAND (extreme, high,
 * moderate, low, terrible) read off the table for the creature's level, never a number invented here. Pure SF2E, no campaign overlay
 * (design/design-layers.md), and pure code: no Foundry globals, no file reads. The caller hands it the tables
 * (tools/reference-extract/output/creature-building-math.json, made by tools/reference-extract/creature-building.mjs) and the archetype catalogue
 * (data/campaign/npc-archetypes.json); tools/npc-generator/apply.mjs is the caller that writes the results into data/npcs/.
 *
 * Decisions this file makes, so they are in one place:
 *  - A table cell that is a range (hit points, a low skill) takes the LOWER end of a two-value range and the middle of a wider one:
 *    a weaker NPC, never a stronger one than the book allows.
 *  - An extreme attribute modifier at levels -1 and 0 does not exist in the book; it falls back to high.
 *  - Non-combat NPCs get no abilities, features, spells or resistances (D047 item 5): only the numbers the Actor generator carries
 *    (level, attribute modifiers, Perception, skills, AC, saves, HP, Speed, strikes).
 *  - A skill is trained at the level the NPC fights at, or at their non-combat level if the roster says `"at": "nonCombat"`
 *    (GM Core, Non-Combat Level: use the skill numbers for that level).
 *  - The proficiency rank written beside a modifier is descriptive (the Actor generator reads only the modifier): it is the lowest rank
 *    whose bonus could account for the band at that level.
 */

export const BANDS = Object.freeze(["extreme", "high", "moderate", "low", "terrible"]);
export const SKILLS = Object.freeze(["acrobatics", "arcana", "athletics", "computers", "crafting", "deception", "diplomacy", "intimidation", "medicine", "nature", "occultism", "performance", "piloting", "religion", "society", "stealth", "survival", "thievery"]);
export const ABILITIES = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);
export const SAVES = Object.freeze(["fortitude", "reflex", "will"]);

/** One cell of a table: a number, or the lower end of a short range, or the middle of a long one. */
export function cellValue(cell) {
  if (typeof cell === "number") return cell;
  if (cell && typeof cell === "object" && Number.isFinite(cell.min) && Number.isFinite(cell.max)) {
    return cell.max - cell.min <= 1 ? cell.min : Math.floor((cell.min + cell.max) / 2);
  }
  return null;
}

/** The number for a table, a level and a band. `tables` is creature-building-math.json. */
export function statAt(tables, table, level, band) {
  const t = tables?.[table];
  if (!t?.byLevel) throw new Error(`no table "${table}"`);
  const row = t.byLevel[String(level)];
  if (!row) throw new Error(`the ${table} table has no level ${level} (it runs ${tables.levels?.min} to ${tables.levels?.max})`);
  let key = band;
  // the book has no extreme attribute modifier below level 1
  if (table === "attributeModifier" && band === "extreme" && row.extreme == null) key = "high";
  if (!(key in row)) throw new Error(`the ${table} table has no "${band}" band`);
  const v = cellValue(row[key]);
  if (v === null) throw new Error(`the ${table} table has no value at level ${level} for "${band}"`);
  return v;
}

/** "1d6+3" -> { dice: "1d6", bonus: 3 }; "1d4" -> { dice: "1d4" }. */
export function parseDamage(text) {
  const m = /^(\d+d\d+)(?:([+-])(\d+))?$/.exec(String(text).trim());
  if (!m) throw new Error(`cannot read the damage "${text}"`);
  return m[2] ? { dice: m[1], bonus: (m[2] === "-" ? -1 : 1) * Number(m[3]) } : { dice: m[1] };
}

/** The lowest proficiency rank whose bonus (level + 2/4/6/8) could account for a modifier of `band` at `level`. Descriptive only. */
function rankFor(band, level) {
  if (band === "terrible") return "untrained";
  if (band === "low") return "trained";
  if (band === "moderate") return level >= 1 ? "expert" : "trained";
  if (band === "high") return level >= 7 ? "master" : "expert";
  return level >= 15 ? "legendary" : level >= 7 ? "master" : "expert";
}

const proficiency = (tables, table, level, band, rankLevel = level) => ({ rank: rankFor(band, rankLevel), modifier: statAt(tables, table, level, band) });

/**
 * Build a statblock.
 *
 * @param spec  { archetype, level, nonCombatLevel?, traits?, size?, speed?, skills?: [{ skill, band, at? }],
 *                bands?: { ac?, hp?, perception?, fortitude?, reflex?, will?, attributes?: { str?, ... } },
 *                strike?: false | { name, strikeType?, attack, damage, damageType?, traits? } }
 *              (`bands` overrides the archetype's own; `strike: false` removes the archetype's strike)
 * @param deps  { tables, archetypes }  creature-building-math.json and the `archetypes` map of npc-archetypes.json
 */
export function buildStatblock(spec, { tables, archetypes }) {
  const arch = archetypes?.[spec.archetype];
  if (!arch) throw new Error(`no archetype "${spec.archetype}"`);
  const level = spec.level;
  if (!Number.isInteger(level)) throw new Error(`a level is a whole number, not ${level}`);
  const b = spec.bands ?? {};
  const pick = (own, theirs) => b[own] ?? theirs;

  const attributeBands = { ...arch.attributes, ...(b.attributes ?? {}) };
  const abilityModifiers = Object.fromEntries(ABILITIES.map((a) => {
    const band = attributeBands[a];
    if (!band) throw new Error(`archetype "${spec.archetype}" says nothing of ${a}`);
    return [a, statAt(tables, "attributeModifier", level, band)];
  }));

  const skills = {};
  for (const s of [...(spec.skills ?? [])].sort((x, y) => SKILLS.indexOf(x.skill) - SKILLS.indexOf(y.skill))) {
    if (!SKILLS.includes(s.skill)) throw new Error(`"${s.skill}" is not one of the 18 skills`);
    if (!BANDS.includes(s.band) || s.band === "terrible") throw new Error(`a skill is extreme, high, moderate or low, not "${s.band}"`);
    const at = s.at === "nonCombat" ? spec.nonCombatLevel : level;
    if (!Number.isInteger(at)) throw new Error(`${s.skill} is at the non-combat level, which ${spec.archetype} here does not have`);
    skills[s.skill] = proficiency(tables, "skills", at, s.band);
  }

  const hp = statAt(tables, "hitPoints", level, pick("hp", arch.hp));
  const out = {
    level,
    ...(Number.isInteger(spec.nonCombatLevel) ? { nonCombatLevel: spec.nonCombatLevel } : {}),
    traits: spec.traits ?? arch.traits ?? ["humanoid"],
    size: spec.size ?? arch.size ?? "medium",
    adjustment: "none",
    abilityModifiers,
    perception: { proficiency: proficiency(tables, "perception", level, pick("perception", arch.perception)) },
    skills,
    ac: statAt(tables, "armorClass", level, pick("ac", arch.ac)),
    savingThrows: Object.fromEntries(SAVES.map((save) => [save, proficiency(tables, "savingThrows", level, pick(save, arch.saves[save]))])),
    hitPoints: { max: hp, current: hp },
    speed: { land: spec.speed ?? arch.speed ?? 25 }
  };

  const strike = spec.strike === false ? null : spec.strike ?? arch.strike ?? null;
  if (strike) {
    const dmg = parseDamage(statAtDamage(tables, level, strike.damage));
    out.strikes = [{
      name: strike.name,
      strikeType: strike.strikeType ?? "melee",
      attackBonus: statAt(tables, "strikeAttackBonus", level, strike.attack),
      traits: strike.traits ?? [],
      damage: [{ ...dmg, damageType: strike.damageType ?? "bludgeoning" }]
    }];
  }
  return out;
}

/** The damage expression of a band at a level, e.g. "1d4+2". */
function statAtDamage(tables, level, band) {
  const row = tables?.strikeDamage?.byLevel?.[String(level)];
  if (!row?.[band]?.dice) throw new Error(`the strikeDamage table has no "${band}" at level ${level}`);
  return row[band].dice;
}

/** What a statblock's own numbers say, as the DC a player rolls against (10 + modifier): for checking against what a scene already tells the GM. */
export const dcOf = (modifier) => 10 + modifier;
