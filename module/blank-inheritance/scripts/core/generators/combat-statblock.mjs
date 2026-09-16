const SIZE_MAP = { tiny: "tiny", small: "sm", medium: "med", large: "lg", huge: "huge", gargantuan: "grg" };

/**
 * common/sf2e-common.schema.json#/$defs/combatStatblock -> the {system, items}
 * halves of an sf2e "npc"-type Actor's data.
 *
 * Extracted 2026-09-16 out of creature.mjs, which used to be the only caller.
 * npc.mjs's statblock branch needed the exact same mapping: npc.schema.json's
 * optional `statblock` field and creature.schema.json both `$ref` the literal
 * same combatStatblock def (see sf2e-common.schema.json's own header comment
 * on why the two entity schemas share this shape), so the two generators must
 * produce the exact same Actor shape from the same input. Duplicating the
 * mapping a second time was the real risk CLAUDE.md's schema-architecture
 * note warns about one layer down ("keep new fields flowing back into
 * sf2e-common when two entity schemas would otherwise duplicate the same
 * shape") -- this is that same discipline applied to the generators.
 *
 * Pure: no Foundry globals. Every field path this writes is checked against
 * gamesystems/sf2e/template.json by test/tier3-contract.test.mjs.
 */
export function buildCombatStatblockSystemData(source) {
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

  const system = {
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
  };

  return { system, items };
}
