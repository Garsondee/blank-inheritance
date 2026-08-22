import { deriveFoundryId } from "../ids.mjs";

/**
 * kid/frame.schema.json (pcStatblock) -> sf2e "character" Actor.
 *
 * DELIBERATELY MINIMAL for v0. Confirmed against real sf2e compendium data:
 * every shipped character has system.abilities === null and no
 * system.attributes.ac at all — those (and saves, and most proficiencies)
 * are computed at runtime from embedded ancestry/heritage/background/class/
 * feat Items, not stored as flat fields the way NPCs are. Writing computed
 * numbers into those fields would just be wrong per the real data model.
 *
 * So this generator only sets identity + the one field independently
 * confirmed as a real stored field on a character (system.details.level.value,
 * which lives on Actor.templates.common per template.json — see
 * test/tier3-contract.test.mjs for the inheritance-aware check).
 * Everything else (embedded Items, UUID-linked to the sf2e compendia, for
 * ancestry/background/class/feats) is a known, explicitly deferred next step
 * — see ideas/entries and design/foundry-module-design.md §2.
 */
export async function buildCharacterActorData(source) {
  const id = await deriveFoundryId(source.id);
  return {
    _id: id,
    name: source.name ?? source.id,
    type: "character",
    system: {
      details: {
        level: { value: source.level ?? 1 }
      }
    }
  };
}
