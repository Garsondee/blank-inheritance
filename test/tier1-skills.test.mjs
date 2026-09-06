// Tier 1 — what a character can roll, and how it is grouped onto the bar.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FALLBACK_SKILL_SLUGS,
  PERCEPTION_SLUG,
  SAVE_SLUGS,
  abbreviate,
  buildCheckGroups,
  isSafeSlug,
  labelForSlug
} from "../module/blank-inheritance/scripts/core/skills.mjs";

/* ---------------------------------------------------------------- */
/*  The fixed list                                                   */
/* ---------------------------------------------------------------- */

test("SF2E's fixed skill list is eighteen, and Lore is not one of them", () => {
  // Read directly out of CONFIG.PF2E.skills in the shipped system, 2026-09-06.
  // design/ux-doctrine.md said nineteen until then by counting Lore, which is
  // per-actor Items rather than a fixed skill.
  assert.equal(FALLBACK_SKILL_SLUGS.length, 18);
  assert.equal(FALLBACK_SKILL_SLUGS.includes("lore"), false);
  assert.equal(new Set(FALLBACK_SKILL_SLUGS).size, 18, "duplicate slug");
});

test("the two Starfinder skills are present — Computers is the one V1 dropped", () => {
  assert.ok(FALLBACK_SKILL_SLUGS.includes("computers"));
  assert.ok(FALLBACK_SKILL_SLUGS.includes("piloting"));
  assert.ok(FALLBACK_SKILL_SLUGS.includes("performance"), "Performance was missing from the doctrine's list too");
});

test("every slug the module ships is safe to put in an enricher", () => {
  for (const slug of [...FALLBACK_SKILL_SLUGS, ...SAVE_SLUGS, PERCEPTION_SLUG]) {
    assert.equal(isSafeSlug(slug), true, `${slug} would be rejected`);
  }
});

test("isSafeSlug rejects anything that could break out of @Check[...]", () => {
  assert.equal(isSafeSlug("x|dc:1]@UUID[Actor.evil]"), false);
  assert.equal(isSafeSlug("has space"), false);
  assert.equal(isSafeSlug("Capitals"), false);
  assert.equal(isSafeSlug("trailing-"), false);
  assert.equal(isSafeSlug(""), false);
  assert.equal(isSafeSlug(null), false);
  assert.equal(isSafeSlug("warfare-lore"), true);
});

/* ---------------------------------------------------------------- */
/*  Labels                                                           */
/* ---------------------------------------------------------------- */

test("labelForSlug title-cases, including hyphenated lores", () => {
  assert.equal(labelForSlug("acrobatics"), "Acrobatics");
  assert.equal(labelForSlug("warfare-lore"), "Warfare Lore");
  assert.equal(labelForSlug(""), "");
  assert.equal(labelForSlug(null), "");
});

test("abbreviate keeps Perception and Performance apart", () => {
  // The entire reason the legend is four characters and not three: these are
  // two different rolls a player might reach for in the same breath, and PER
  // for both is a trap.
  assert.equal(abbreviate("Perception"), "PERC");
  assert.equal(abbreviate("Performance"), "PERF");
});

test("abbreviate drops a trailing Lore so lores are not all identical", () => {
  assert.equal(abbreviate("Underworld Lore"), "UNDE");
  assert.equal(abbreviate("Warfare Lore"), "WARF");

  // A bare "Lore" keeps its legend rather than losing it: the suffix is only
  // stripped when something distinguishing remains. Returning "" here would
  // put a blank key on the bar, which is worse than an unhelpful one.
  assert.equal(abbreviate("Lore"), "LORE");
});

test("abbreviate survives punctuation and short names", () => {
  assert.equal(abbreviate("Sailing (ships)"), "SAIL");
  assert.equal(abbreviate("Law"), "LAW");
  assert.equal(abbreviate(""), "");
  assert.equal(abbreviate(null), "");
});

test("the eighteen abbreviate to eighteen distinct legends", () => {
  const shorts = FALLBACK_SKILL_SLUGS.map((slug) => abbreviate(labelForSlug(slug)));
  assert.equal(new Set(shorts).size, shorts.length, `collision in ${shorts.join(",")}`);
});

/* ---------------------------------------------------------------- */
/*  Grouping                                                         */
/* ---------------------------------------------------------------- */

const SKILLS = [
  { slug: "athletics", label: "Athletics" },
  { slug: "computers", label: "Computers" },
  { slug: "acrobatics", label: "Acrobatics" }
];
const SAVES = [
  { slug: "fortitude", label: "Fortitude" },
  { slug: "reflex", label: "Reflex" },
  { slug: "will", label: "Will" }
];

test("skills sort alphabetically and lores always come after them", () => {
  const groups = buildCheckGroups({
    skills: [...SKILLS, { slug: "warfare-lore", label: "Warfare Lore", lore: true }, { slug: "art-lore", label: "Art Lore", lore: true }],
    saves: SAVES,
    hasPerception: true
  });
  const skills = groups.find((g) => g.id === "skills");
  assert.deepEqual(
    skills.entries.map((e) => e.slug),
    ["acrobatics", "athletics", "computers", "art-lore", "warfare-lore"],
    "the fixed eighteen must keep a stable learnable order regardless of what lores exist"
  );
});

test("Perception joins the saves rather than sitting alone in a group of one", () => {
  const groups = buildCheckGroups({ skills: SKILLS, saves: SAVES, hasPerception: true });
  const defences = groups.find((g) => g.id === "defences");
  assert.deepEqual(defences.entries.map((e) => e.slug), ["fortitude", "reflex", "will", "perception"]);
});

test("no Perception means no Perception key, not an empty one", () => {
  const groups = buildCheckGroups({ skills: SKILLS, saves: SAVES, hasPerception: false });
  const defences = groups.find((g) => g.id === "defences");
  assert.equal(defences.entries.some((e) => e.slug === PERCEPTION_SLUG), false);
});

test("an empty group is dropped entirely — no labelled bank with nothing in it", () => {
  const groups = buildCheckGroups({ skills: SKILLS, saves: [], hasPerception: false });
  assert.deepEqual(groups.map((g) => g.id), ["skills"]);

  assert.deepEqual(buildCheckGroups({}), []);
  assert.deepEqual(buildCheckGroups(), []);
});

test("every entry carries what the template renders: slug, label, short, lore", () => {
  const groups = buildCheckGroups({ skills: SKILLS, saves: SAVES, hasPerception: true });
  for (const group of groups) {
    assert.ok(group.labelKey.startsWith("BLANKINHERITANCE."), `${group.id} has no legend key`);
    for (const entry of group.entries) {
      assert.ok(entry.slug, "missing slug");
      assert.ok(entry.label, `${entry.slug} missing label`);
      assert.ok(entry.short, `${entry.slug} missing legend`);
      assert.equal(typeof entry.lore, "boolean", `${entry.slug} lore flag is not a boolean`);
    }
  }
});

test("a missing label falls back to the slug rather than rendering a blank key", () => {
  const groups = buildCheckGroups({ skills: [{ slug: "occultism" }], saves: [] });
  assert.equal(groups[0].entries[0].label, "Occultism");
  assert.equal(groups[0].entries[0].short, "OCCU");
});

test("groups carry no column count — the grid auto-fills instead", () => {
  // A fixed column count would be a guess about how many skills a character
  // has, which is the exact assumption reading actor.skills live exists to
  // avoid. If this comes back, check the CSS did not quietly go back to
  // .bi-keygrid--N.
  for (const group of buildCheckGroups({ skills: SKILLS, saves: SAVES, hasPerception: true })) {
    assert.equal("columns" in group, false, `${group.id} still carries a column count`);
  }
});
