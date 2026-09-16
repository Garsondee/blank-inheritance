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

import { buildCreatureActorData } from "../module/blank-inheritance/scripts/core/generators/creature.mjs";
import { buildNpcActorData } from "../module/blank-inheritance/scripts/core/generators/npc.mjs";
import { buildCharacterActorData } from "../module/blank-inheritance/scripts/core/generators/character.mjs";
import { buildJournalEntryData } from "../module/blank-inheritance/scripts/core/generators/journal.mjs";
import { resolveActorTemplate, hasPath, flattenPaths, findInvalidActorFieldPaths } from "./support/sf2e-template.mjs";

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

test("buildNpcActorData: every field path it writes exists on sf2e's real npc Actor template, for BOTH the statblock and statblock-less branches", async (t) => {
  if (!existsSync(templateJsonPath)) {
    t.skip("gamesystems/sf2e/template.json not present locally (gitignored) — skipping loudly rather than failing or silently passing.");
    return;
  }
  const templateJson = JSON.parse(readFileSync(templateJsonPath, "utf8"));

  // Branch 1: a real combatStatblock, same shape the creature contract test
  // above already verifies -- buildNpcActorData must write the identical
  // field set via the shared combat-statblock.mjs mapping.
  const withStatblock = await buildNpcActorData({
    id: "contract-check-npc-statblock",
    name: "Contract Check NPC (statblock)",
    description: "Has a description too, but a statblock branch never reads it for blurb/publicNotes.",
    statblock: {
      abilityModifiers: { str: 1 },
      ac: 10,
      hitPoints: { max: 1 },
      speed: { land: 1 },
      perception: { proficiency: { modifier: 1 } },
      savingThrows: { fortitude: { modifier: 1 }, reflex: { modifier: 1 }, will: { modifier: 1 } },
      traits: ["x"],
      size: "medium",
      skills: { athletics: { modifier: 1 } }
    }
  });
  const invalidWithStatblock = findInvalidActorFieldPaths(templateJson, "npc", withStatblock.system);
  assert.deepEqual(
    invalidWithStatblock,
    [],
    "buildNpcActorData's statblock branch writes system.* paths that don't exist on sf2e's real npc Actor template."
  );

  // Branch 2: no statblock at all -- most Directorate NPCs (npc.schema.json's
  // own doc comment). The "minimal but real" defaults must be just as valid
  // as a fully-authored statblock, not a special case the template doesn't recognize.
  const withoutStatblock = await buildNpcActorData({
    id: "contract-check-npc-bare",
    name: "Contract Check NPC (no statblock)",
    description: "A purely social NPC with no combat stats at all."
  });
  const invalidWithoutStatblock = findInvalidActorFieldPaths(templateJson, "npc", withoutStatblock.system);
  assert.deepEqual(
    invalidWithoutStatblock,
    [],
    "buildNpcActorData's statblock-less branch writes system.* paths that don't exist on sf2e's real npc Actor template."
  );
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

// JournalEntry/JournalEntryPage are core Foundry documents, not sf2e-specific
// — there's no template.json equivalent to parse, since defineSchema() lives
// in real (unminified) JS source, not data. Hand-extracted from
// foundryvtt/.../common/documents/journal-entry.mjs:44-52 (JournalEntry) and
// journal-entry-page.mjs:44-79 (JournalEntryPage), read directly, cited here
// instead of machine-checked — same discipline as the version pin above:
// if verifiedVersions.foundry bumps, re-read those two files by hand and
// update this shape before trusting this test again.
const JOURNAL_ENTRY_SCHEMA = {
  _id: true, name: true, pages: true, folder: true, categories: true, sort: true, ownership: true, flags: true
};
const JOURNAL_ENTRY_PAGE_SCHEMA = {
  _id: true, name: true, type: true, system: true,
  title: { show: true, level: true },
  image: { caption: true },
  text: { content: true, markdown: true, format: true },
  video: { controls: true, loop: true, autoplay: true, volume: true, timestamp: true, width: true, height: true },
  src: true, category: true, sort: true, ownership: true, flags: true
};

test("buildJournalEntryData: every field path it writes exists on Foundry's real JournalEntry/JournalEntryPage schema", async (t) => {
  if (!existsSync(foundryPackageJsonPath)) {
    t.skip("foundryvtt/ not present locally (gitignored) — skipping loudly rather than failing or silently passing.");
    return;
  }

  const data = await buildJournalEntryData({
    id: "contract-check",
    name: "Contract Check",
    pages: [{ id: "p1", name: "Page One", content: "<p>hi</p>", titleLevel: 2 }]
  });

  const { pages, ...topLevel } = data;
  const invalidTop = flattenPaths(topLevel).filter((p) => !hasPath(JOURNAL_ENTRY_SCHEMA, p));
  assert.deepEqual(
    invalidTop,
    [],
    "these JournalEntry top-level paths don't exist on Foundry's real schema (foundryvtt/.../common/documents/journal-entry.mjs)"
  );

  for (const page of pages) {
    const invalidPage = flattenPaths(page).filter((p) => !hasPath(JOURNAL_ENTRY_PAGE_SCHEMA, p));
    assert.deepEqual(
      invalidPage,
      [],
      `these JournalEntryPage paths don't exist on Foundry's real schema for page "${page.name}" (foundryvtt/.../common/documents/journal-entry-page.mjs)`
    );
  }
});

test("the undocumented Canvas internals the stage camera depends on still exist", (t) => {
  // foundry/stage-camera.mjs replaces Canvas#_constrainView, which is marked
  // `@internal`. That is a deliberate, load-bearing choice — it is the ONE
  // choke point every pan and zoom in the application routes through, and the
  // alternatives (a hook that cannot cancel and fires a frame late; overriding
  // seven separate input handlers) are worse. But undocumented API can move.
  //
  // The failure mode without this test is silent and awful: the override
  // simply never gets called, the camera comes unstuck, and players start
  // dragging a theatre-of-the-mind scene around with nothing anywhere saying
  // why. This is the canary.
  if (!existsSync(foundryAppRoot)) {
    t.skip("foundryvtt/ not present locally (gitignored) — skipping loudly rather than failing or silently passing.");
    return;
  }

  const board = path.join(foundryAppRoot, "client", "canvas", "board.mjs");
  assert.ok(existsSync(board), "client/canvas/board.mjs has moved — Canvas is no longer where we think it is");
  const source = readFileSync(board, "utf8");

  assert.match(
    source, /_constrainView\(\{\s*x,\s*y,\s*scale\s*\}\)/,
    "Canvas#_constrainView is gone or has a different signature — foundry/stage-camera.mjs replaces it " +
      "to pin the camera, and a renamed method means the override silently never runs"
  );
  assert.match(
    source, /this\.stage\.pivot\.set\(/,
    "Canvas#pan no longer sets stage.pivot directly — re-check that _constrainView is still the choke point"
  );
  assert.match(
    source, /const constrained = this\._constrainView\(/,
    "Canvas#pan no longer routes through _constrainView — the override would no longer catch anything"
  );

  // CONFIG.Canvas.minZoom/maxZoom are deliberately NOT used and deliberately
  // not asserted: pinning them baked the stage cover scale into the NEXT
  // scene's dimensions, because those are computed at board.mjs:1157 before
  // any hook a module can listen on. See foundry/stage-camera.mjs.

  // The other half of the staged scene: the background lives on the embedded
  // Level document, not on the Scene. Getting this wrong renders no picture
  // and reports nothing at all.
  const level = path.join(foundryAppRoot, "common", "documents", "level.mjs");
  assert.ok(existsSync(level), "common/documents/level.mjs is gone — Scene backgrounds may have moved again");
  const levelSource = readFileSync(level, "utf8");
  assert.match(
    levelSource, /background:\s*new fields\.SchemaField/,
    "Level#background is no longer a SchemaField — core/generators/stage-scene.mjs writes background.src there"
  );
  assert.match(
    levelSource, /src:\s*new fields\.FilePathField/,
    "Level#background.src is gone — a staged scene would render with no picture and no error"
  );
});
