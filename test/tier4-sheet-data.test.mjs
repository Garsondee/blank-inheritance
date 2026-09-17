// Tier 4 — foundry/sheet-data.mjs against a plain object shaped like a live
// sf2e character. sheet-data.mjs reads only the actor it is handed (no
// Foundry globals at import or call time), so no mock world is needed: the
// fixture below mirrors field paths read off real level-1 pregens in the local
// test world on 2026-09-17, not guessed ones.

import { test } from "node:test";
import assert from "node:assert/strict";

import { sheetSkillGroups } from "../module/blank-inheritance/scripts/foundry/sheet-data.mjs";

/**
 * Navasi (Level 1), as the live document exposes her. What matters here is
 * what was verified live: Perception is a Statistic on `actor.perception`
 * whose flat data lives at `system.perception` ({value, rank}, no `mod`), and
 * it is in NEITHER `system.skills` nor `system.saves`.
 */
function navasi() {
  const statistic = (slug, label, extra = {}) => ({ slug, label, ...extra });
  return {
    skills: {
      athletics: statistic("athletics", "Athletics"),
      diplomacy: statistic("diplomacy", "Diplomacy")
    },
    saves: {
      fortitude: statistic("fortitude", "Fortitude"),
      reflex: statistic("reflex", "Reflex"),
      will: statistic("will", "Will")
    },
    perception: statistic("perception", "Perception"),
    system: {
      skills: { athletics: { mod: 0, rank: 0 }, diplomacy: { mod: 7, rank: 1 } },
      saves: { fortitude: { value: 6, rank: 1 }, reflex: { value: 5, rank: 1 }, will: { value: 7, rank: 2 } },
      perception: { value: 4, rank: 1 }
    }
  };
}

const find = (groups, slug) => groups.flatMap((g) => g.entries).find((e) => e.slug === slug);

test("sheetSkillGroups reads Perception's real modifier and rank (regression: it read +0 Untrained for every creature)", () => {
  // Found live 2026-09-17 on the deck's Perception key: the lookup only
  // consulted system.skills and system.saves, so Perception fell through to
  // an empty object for every actor — on the Dossier's Skills tab too.
  const perception = find(sheetSkillGroups(navasi()), "perception");
  assert.equal(perception.mod, 4);
  assert.equal(perception.modLabel, "+4");
  assert.equal(perception.rank, 1);
  assert.equal(perception.rankLabel, "Trained");
});

test("sheetSkillGroups still reads skills from system.skills and saves from system.saves", () => {
  const groups = sheetSkillGroups(navasi());
  assert.equal(find(groups, "diplomacy").modLabel, "+7");
  assert.equal(find(groups, "athletics").rankLabel, "Untrained");
  assert.equal(find(groups, "will").mod, 7);
  assert.equal(find(groups, "will").rankLabel, "Expert");
});

test("sheetSkillGroups returns nothing for no actor rather than throwing", () => {
  assert.deepEqual(sheetSkillGroups(null), []);
});
