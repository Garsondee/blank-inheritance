// Tier 2 — no single skill becomes the answer to everything, 2026-09-21.
//
// WHY THIS IS A TEST. On 2026-09-21 both episodes passed the per-scene craft
// audit with zero findings, and the material still had a real defect that no
// per-scene check could see, because it only exists in aggregate: Society was
// offered on 41 of 62 checks (66%), across 22 of the 24 challenge files.
//
// It was never the ONLY option on any check, which is the worse shape rather
// than the better one. A skill that is never required and always available
// teaches the table that whoever has the best modifier in it is the answer to
// everything, and the other nineteen skills compete for what is left. The
// fictional variety of the scenes survives that; the PLAYER-FACING variety
// does not, and player-facing variety is the point (Ingram's standing
// principle: "players enjoy a nice robustly varied set of things to do").
//
// Pruning Society then made Perception the attractor at 48% -- the identical
// failure under a different name -- which is why this is a threshold on
// whichever skill happens to be top, not a rule about one skill.
//
// WHAT THIS DOES NOT CATCH, and what still needs eyes: the same activity
// wearing different skill names. After this fix, "read a person" and "read a
// document" still account for 14 of 62 checks. A histogram of skills cannot
// see that. See design/scene-audit.md §10.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const challengeDir = path.join(repoRoot, "data", "challenges");

// Authored Episode One and Two challenges. Scoped by filename prefix so a
// later episode's material does not silently change this measurement.
const AUTHORED = /^c1e[12]-.*\.json$/;

// The top skill may appear on at most this share of checks. 0.40 is not a
// derived number: it is comfortably above the 35% the material sits at after
// the 2026-09-21 pass, and far below the 66% that prompted it. If a genuine
// design reason ever pushes a skill past it, move the number and say why here
// rather than deleting the test.
const MAX_SHARE = 0.4;

// Nineteen distinct skills are in use. A floor well under that catches a
// collapse without failing on ordinary authoring churn.
const MIN_DISTINCT = 15;

function readChecks() {
  const checks = [];
  for (const name of readdirSync(challengeDir).filter((n) => AUTHORED.test(n))) {
    const ch = JSON.parse(readFileSync(path.join(challengeDir, name), "utf8"));
    for (const check of ch.checks ?? []) {
      const options = (check.skillOptions ?? [check.skill]).filter(Boolean);
      // An anySkill check (the player names the skill -- The Road In's small
      // problem, 2026-09-24) has every route by definition, so it is neither
      // empty nor counted towards any one skill's share.
      checks.push({ file: name, id: check.id, name: check.name, options, any: Boolean(check.anySkill) });
    }
  }
  return checks;
}

function tally(checks) {
  const counts = new Map();
  for (const c of checks) for (const s of new Set(c.options)) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

test("no skill is offered on more than 40% of the authored checks", () => {
  const checks = readChecks();
  assert.ok(checks.length >= 50, `expected the authored corpus, found ${checks.length} checks`);
  const counts = tally(checks);
  const [topSkill, topCount] = counts[0];
  const share = topCount / checks.length;
  assert.ok(
    share <= MAX_SHARE,
    `${topSkill} is offered on ${topCount} of ${checks.length} checks (${Math.round(share * 100)}%), ` +
      `over the ${Math.round(MAX_SHARE * 100)}% ceiling. A skill that is always available and never ` +
      `required becomes the table's default answer. Replace it on the checks where it is standing in ` +
      `for general competence, keeping it where it names what the character is actually doing.\n` +
      `Full spread: ${counts.map(([s, n]) => `${s} ${n}`).join(", ")}`
  );
});

test("the authored checks draw on at least 15 distinct skills", () => {
  const counts = tally(readChecks());
  assert.ok(
    counts.length >= MIN_DISTINCT,
    `only ${counts.length} distinct skills across both episodes: ${counts.map(([s]) => s).join(", ")}`
  );
});

test("every authored check offers at least one skill", () => {
  const empty = readChecks().filter((c) => c.options.length === 0 && !c.any);
  assert.deepEqual(empty.map((c) => `${c.file}/${c.id}`), [], "checks with no skill route at all");
});

test("a check with a single skill route is confined to the per-player medical", () => {
  // Eight single-skill checks in c1e1-the-medical are deliberate: that scene
  // is a menu of eight different things ONE player can do in their own
  // private scene, not eight routes through one obstacle. Anywhere else, a
  // lone skill shuts most of the table out of the check entirely.
  const solos = readChecks().filter((c) => c.options.length === 1 && c.file !== "c1e1-the-medical.json");
  assert.deepEqual(
    solos.map((c) => `${c.file}/${c.id} [${c.options[0]}]`),
    [],
    "single-skill checks outside the per-player medical scene"
  );
});
