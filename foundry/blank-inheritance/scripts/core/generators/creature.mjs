import { deriveFoundryId } from "../ids.mjs";

const SIZE_MAP = { tiny: "tiny", small: "sm", medium: "med", large: "lg", huge: "huge", gargantuan: "grg" };

/**
 * creature.schema.json (combatStatblock) -> sf2e "npc" Actor.
 * NPCs store flat final numbers directly (confirmed against real sf2e
 * compendium data), so this is a straightforward field mapping — the
 * "easy" case relative to PCs, see character.mjs.
 *
 * Pure: no Foundry globals. Every field path this writes is checked
 * against gamesystems/sf2e/template.json by test/tier3-contract.test.mjs.
 */
export async function buildCreatureActorData(source) {
  const id = await deriveFoundryId(source.id);

  const skills = {};
  for (const [slug, entry] of Object.entries(source.skills ?? {})) {
    if (typeof entry?.modifier !== "number") continue;
    skills[slug] = { base: entry.modifier };
  }

  // No _id key here (not even undefined) — embedded-item ids generate normally;
  // only Actor/Scene ids need to be deterministic for this test.
  const items = (source.strikes ?? []).map((strike, index) => ({
    name: strike.name ?? `Strike ${index + 1}`,
    type: "melee",
    system: {
      action: "strike",
      bonus: { value: strike.attackBonus ?? 0 },
      damageRolls: Object.fromEntries(
        (strike.damage ?? []).map((d, i) => {
          const dice = d.dice ?? "";
          const bonus = typeof d.bonus === "number" ? (d.bonus >= 0 ? `+${d.bonus}` : `${d.bonus}`) : "";
          const formula = dice ? `${dice}${bonus}` : `${d.bonus ?? 0}`;
          return [`blankinh${index}${i}`, { damage: formula, damageType: d.damageType ?? "bludgeoning" }];
        })
      ),
      range: strike.strikeType === "ranged" ? { increment: strike.rangeIncrement ?? null, max: null } : null,
      traits: { value: strike.traits ?? [] }
    }
  }));

  return {
    _id: id,
    name: source.name ?? source.id,
    type: "npc",
    system: {
      abilities: Object.fromEntries(
        Object.entries(source.abilityModifiers ?? {}).map(([key, value]) => [key, { mod: value }])
      ),
      attributes: {
        ac: { value: source.ac ?? 10 },
        hp: {
          value: source.hitPoints?.current ?? source.hitPoints?.max ?? 1,
          max: source.hitPoints?.max ?? 1
        },
        speed: { value: source.speed?.land ?? 0 }
      },
      perception: { mod: source.perception?.proficiency?.modifier ?? 0 },
      saves: {
        fortitude: { value: source.savingThrows?.fortitude?.modifier ?? 0 },
        reflex: { value: source.savingThrows?.reflex?.modifier ?? 0 },
        will: { value: source.savingThrows?.will?.modifier ?? 0 }
      },
      skills,
      traits: {
        value: source.traits ?? [],
        size: { value: SIZE_MAP[source.size] ?? "med" }
      },
      details: {
        level: { value: source.level ?? 0 },
        blurb: source.flavorText ?? "",
        publicNotes: source.notes ?? ""
      }
    },
    items
  };
}
