// Tier 3 — contract tests against the local Foundry/sf2e source trees.
// Fast, and the key insight from design/testing-strategy.md §3: verifies our
// generated field paths against the REAL data model without a running
// Foundry, using gamesystems/sf2e/ and foundryvtt/ (both gitignored, so this
// tier must skip loudly — never fail, never skip silently — when absent).
//
// Two techniques, verified independently, because neither alone is enough:
//  (a) template.json, for Actor fields — but it uses template inheritance
//      (Actor.character.details.level is undefined on its own; it's
//      Actor.templates.common.details.level.value that's real), and it's
//      only a PARTIAL contract: only 15 of 25 declared Item.types have
//      template entries, and "melee" (our strike generator's output type)
//      is not among them.
//  (b) a frozen real compendium example, for melee Items — see
//      test/fixtures/sf2e-real-examples/melee-claw.json for provenance.

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCreatureActorData } from "../module/mythica-machina-blank-inheritance-adventure-module/scripts/core/generators/creature.mjs";
import { buildCharacterActorData } from "../module/mythica-machina-blank-inheritance-adventure-module/scripts/core/generators/character.mjs";
import { resolveActorTemplate, hasPath, findInvalidActorFieldPaths } from "./support/sf2e-template.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const sf2eRoot = path.join(repoRoot, "gamesystems", "sf2e");
const foundryAppRoot = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");
const templateJsonPath = path.join(sf2eRoot, "template.json");
const sf2eSystemJsonPath = path.join(sf2eRoot, "system.json");
const foundryPackageJsonPath = path.join(foundryAppRoot, "package.json");

const verifiedVersions = JSON.parse(readFileSync(path.join(here, "fixtures", "verified-versions.json"), "utf8"));

test("local source trees match the versions tier 3 was last verified against", (t) => {
  if (!existsSync(sf2eSystemJsonPath) || !existsSync(foundryPackageJsonPath)) {
    t.skip("gamesystems/sf2e/ and/or foundryvtt/ not present locally (both gitignored) — contract tests need them, skipping loudly rather than failing or silently passing.");
    return;
  }
  const sf2eSystem = JSON.parse(readFileSync(sf2eSystemJsonPath, "utf8"));
  const foundryPackage = JSON.parse(readFileSync(foundryPackageJsonPath, "utf8"));

  assert.equal(
    sf2eSystem.version,
    verifiedVersions.sf2e,
    `Local sf2e is v${sf2eSystem.version}, but tier 3 was last verified against v${verifiedVersions.sf2e}. ` +
      `Re-run this whole tier against the upgraded tree, fix whatever it reports, then bump test/fixtures/verified-versions.json deliberately.`
  );
  assert.equal(
    foundryPackage.version,
    verifiedVersions.foundry,
    `Local Foundry is v${foundryPackage.version}, but tier 3 was last verified against v${verifiedVersions.foundry}. ` +
      `Re-run this whole tier against the upgraded tree, fix whatever it reports, then bump test/fixtures/verified-versions.json deliberately.`
  );
});

test("buildCreatureActorData: every field path it writes exists on sf2e's real npc Actor template", async (t) => {
  if (!existsSync(templateJsonPath)) {
    t.skip("gamesystems/sf2e/template.json not present locally (gitignored) — skipping loudly rather than failing or silently passing.");
    return;
  }
  const templateJson = JSON.parse(readFileSync(templateJsonPath, "utf8"));
  const resolved = resolveActorTemplate(templateJson, "npc");

  const data = await buildCreatureActorData({
    id: "contract-check",
    name: "Contract Check",
    abilityModifiers: { str: 1 },
    ac: 10,
    hitPoints: { max: 1 },
    speed: { land: 1 },
    perception: { proficiency: { modifier: 1 } },
    savingThrows: { fortitude: { modifier: 1 }, reflex: { modifier: 1 }, will: { modifier: 1 } },
    traits: ["x"],
    size: "medium",
    skills: { athletics: { modifier: 1 } }
  });

  // `system.skills` itself is a real field, but template.json declares it as
  // `{}` — an empty placeholder, since individual skill slugs are dynamic at
  // runtime. That means the .base sub-shape our generator writes is NOT
  // independently verifiable via template.json (tier 3a's real limit) — only
  // the container's existence is checked here, honestly, not the shape below
  // it. findInvalidActorFieldPaths (shared with test/support/mock-foundry.mjs,
  // so this exact rule can't silently drift between the two) already excludes
  // skills.* for this reason.
  const invalid = findInvalidActorFieldPaths(templateJson, "npc", data.system);
  assert.deepEqual(
    invalid,
    [],
    `these system.* paths don't exist on sf2e's real npc Actor template (gamesystems/sf2e/template.json, resolved through its "common" template) — ` +
      `either the generator is writing a field sf2e doesn't have, or sf2e renamed/removed it since this was last verified.`
  );
  assert.ok(hasPath(resolved, "skills"), "system.skills container itself must exist on the npc template");
});

test("buildCharacterActorData: the one field it writes (details.level.value) exists only via template inheritance", async (t) => {
  if (!existsSync(templateJsonPath)) {
    t.skip("gamesystems/sf2e/template.json not present locally (gitignored) — skipping loudly rather than failing or silently passing.");
    return;
  }
  const templateJson = JSON.parse(readFileSync(templateJsonPath, "utf8"));

  // Regression guard for the exact gotcha this tier exists to catch: a naive
  // check against the type's OWN declared fields (no template resolution)
  // must report this field missing, because it genuinely is missing there —
  // character.details is entirely inherited from the common template.
  assert.equal(
    hasPath(templateJson.Actor.character, "details.level.value"),
    false,
    "template.json's Actor.character no longer omits details.level.value directly — if sf2e now declares it inline, the inheritance-resolution step in this test may no longer be necessary (but isn't wrong to keep)."
  );

  const data = await buildCharacterActorData({ id: "contract-check", name: "Contract Check", level: 1 });
  const invalid = findInvalidActorFieldPaths(templateJson, "character", data.system);
  assert.deepEqual(
    invalid,
    [],
    "these system.* paths don't exist on sf2e's real character Actor template, even resolved through its \"common\" template."
  );
});

test("buildCreatureActorData: strikes match a real shipped sf2e melee Item's field shape", async () => {
  const realExample = JSON.parse(readFileSync(path.join(here, "fixtures", "sf2e-real-examples", "melee-claw.json"), "utf8"));

  const data = await buildCreatureActorData({
    id: "contract-check",
    name: "Contract Check",
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 6, traits: ["agile"], damage: [{ dice: "1d4", bonus: 1, damageType: "slashing" }] }]
  });
  const [generatedClaw] = data.items;

  assert.equal(generatedClaw.type, realExample.type);
  assert.equal(generatedClaw.system.action, realExample.system.action);
  assert.deepEqual(Object.keys(generatedClaw.system.bonus).sort(), Object.keys(realExample.system.bonus).sort());
  assert.equal(generatedClaw.system.range, realExample.system.range, "melee strikeType must produce range: null, matching a real melee Item");
  assert.deepEqual(Object.keys(generatedClaw.system.traits).sort(), Object.keys(realExample.system.traits).sort());

  const [generatedDamageEntry] = Object.values(generatedClaw.system.damageRolls);
  const [realDamageEntry] = Object.values(realExample.system.damageRolls);
  assert.deepEqual(Object.keys(generatedDamageEntry).sort(), Object.keys(realDamageEntry).sort());
  assert.match(generatedDamageEntry.damage, /^\d+d\d+[+-]\d+$/, "damage string should be a dice formula shaped like the real example's \"1d4+1\"");
});
