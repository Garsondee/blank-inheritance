// Tier 2 — data corpus validation. Fast, runs over every real file in
// data/ (not fixtures). Two checks: (1) every file validates against its
// own declared $schema, and (2) every file whose type maps to a generator
// runs through that generator without throwing. See design/testing-strategy.md §3.
//
// Prerequisite this tier depends on: sf2e-common.schema.json's $id used to
// not match how every other schema referenced it ("common/sf2e-common.schema.json"
// vs. the bare "sf2e-common.schema.json"), which made ajv unable to resolve
// $refs — fixed 2026-08-22 (see ideas/entries/schema-ref-ajv-compatibility.json).

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCreatureActorData } from "../module/mythica-machina-blank-inheritance-adventure-module/scripts/core/generators/creature.mjs";
import { buildCharacterActorData } from "../module/mythica-machina-blank-inheritance-adventure-module/scripts/core/generators/character.mjs";
import { ALL_PROFILES } from "../tools/battle-simulator/personnel-engine/archetypes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const dataRoot = path.join(repoRoot, "data");

function walkJson(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walkJson(full, out);
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out;
}

// data/schema/ holds the schema *definitions* themselves (their own $schema
// points at the draft 2020-12 meta-schema, not at one of our entity schemas)
// — not part of the corpus this tier validates. data/map/editor-submissions/
// is gitignored (see .gitignore) and CLAUDE.md's own documented ephemeral
// pre-processing input from the city-map editor's "submit" flow — raw drafts
// awaiting hand-conversion into real ops, never a schema'd entity themselves
// — so a real submission left on disk from actually using the editor must
// not fail this tier the way one did on 2026-08-25 (found while verifying
// unrelated map-editor-rearchitecture work; walkJson does a plain filesystem
// walk and does not consult .gitignore, so an explicit skip is required here
// exactly like the schema/ one just above, not something git alone fixes).
const EXCLUDED_PATH_SEGMENTS = [
  `${path.sep}schema${path.sep}`,
  `${path.sep}map${path.sep}editor-submissions${path.sep}`,
];

function isCorpusFile(absPath) {
  return !EXCLUDED_PATH_SEGMENTS.some((segment) => absPath.includes(segment));
}

const dataFiles = walkJson(dataRoot).filter(isCorpusFile);

test("isCorpusFile: excludes schema definitions and gitignored editor-submissions, includes real entity data", () => {
  assert.equal(isCorpusFile(path.join(dataRoot, "schema", "kid.schema.json")), false);
  assert.equal(
    isCorpusFile(path.join(dataRoot, "map", "editor-submissions", "submission-20260823-202227-731688.json")),
    false
  );
  assert.equal(isCorpusFile(path.join(dataRoot, "npcs", "commander.json")), true);
  assert.equal(isCorpusFile(path.join(dataRoot, "map", "frames", "kurose-12km.json")), true);
});

let ajvAvailable = true;
let Ajv2020;
try {
  ({ default: Ajv2020 } = await import("ajv/dist/2020.js"));
} catch {
  ajvAvailable = false;
}

test("every real data/ file validates against its declared $schema", async (t) => {
  if (!ajvAvailable) {
    t.skip("ajv is not installed (npm install) — schema validation skipped, not silently passed");
    return;
  }

  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const commonSchema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "common", "sf2e-common.schema.json"), "utf8"));
  ajv.addSchema(commonSchema);

  const validatorCache = new Map();
  function getValidator(schemaAbsPath) {
    if (!validatorCache.has(schemaAbsPath)) {
      const schema = JSON.parse(readFileSync(schemaAbsPath, "utf8"));
      validatorCache.set(schemaAbsPath, ajv.compile(schema));
    }
    return validatorCache.get(schemaAbsPath);
  }

  assert.ok(dataFiles.length > 0, "expected at least one real data file under data/");

  for (const file of dataFiles) {
    const content = JSON.parse(readFileSync(file, "utf8"));
    const schemaRef = content.$schema;
    assert.ok(schemaRef, `${path.relative(repoRoot, file)} has no "$schema" field — every data file must declare one (see CLAUDE.md conventions)`);

    const schemaAbsPath = path.resolve(path.dirname(file), schemaRef);
    const validate = getValidator(schemaAbsPath);
    const valid = validate(content);
    assert.equal(
      valid,
      true,
      `${path.relative(repoRoot, file)} does not validate against ${path.relative(repoRoot, schemaAbsPath)}:\n${JSON.stringify(validate.errors, null, 2)}`
    );
  }
});

test("combatStatblock's new profileRef field (design doc §50, Archetype Ladder Stage E) accepts every real id currently in the battle-simulator's own ALL_PROFILES registry, plus null/omitted, and rejects a non-string/non-null value", async (t) => {
  if (!ajvAvailable) {
    t.skip("ajv is not installed (npm install) — schema validation skipped, not silently passed");
    return;
  }

  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const commonSchema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "common", "sf2e-common.schema.json"), "utf8"));
  ajv.addSchema(commonSchema);
  const validate = ajv.compile({ $ref: "common/sf2e-common.schema.json#/$defs/combatStatblock" });

  const minimalStatblock = { level: 1 };

  const realProfileIds = Object.keys(ALL_PROFILES);
  assert.ok(realProfileIds.length > 0, "ALL_PROFILES must actually contain real profiles for this check to mean anything");
  for (const profileRef of realProfileIds) {
    assert.equal(validate({ ...minimalStatblock, profileRef }), true, `profileRef "${profileRef}" (a REAL id from ALL_PROFILES) must validate:\n${JSON.stringify(validate.errors, null, 2)}`);
  }

  assert.equal(validate({ ...minimalStatblock, profileRef: null }), true, "profileRef: null must validate — the field is optional");
  assert.equal(validate(minimalStatblock), true, "an omitted profileRef must validate — the field is optional");
  assert.equal(validate({ ...minimalStatblock, profileRef: 42 }), false, "a non-string, non-null profileRef must be REJECTED — the type constraint must be real, not decorative");
});

const GENERATORS_BY_TYPE = {
  creature: buildCreatureActorData,
  kid: buildCharacterActorData,
  frame: buildCharacterActorData
};

test("every data/ file with a generator-applicable type runs through its generator without throwing", async () => {
  const applicable = dataFiles
    .map((file) => ({ file, content: JSON.parse(readFileSync(file, "utf8")) }))
    .filter(({ content }) => {
      if (GENERATORS_BY_TYPE[content.type]) return true;
      // npc.schema.json's statblock is optional (most NPCs are narrative-only,
      // see npc.schema.json) — only the ones with real combat stats are generator-applicable.
      if (content.type === "npc" && content.statblock) return true;
      return false;
    });

  // Currently expected to be empty: no real Claimant instances, no kid/Frame
  // files exist yet (character creation hasn't happened), and none of the
  // three current NPCs carry a statblock. This assertion documents that as
  // a known, current state rather than a silent zero-test pass — it must be
  // updated (not just left green) the day the first real kid/Frame/Claimant
  // file is added, per design/testing-strategy.md's "no silent caps" rule.
  console.log(`Blank Inheritance test | ${applicable.length} generator-applicable real data file(s) found.`);

  for (const { file, content } of applicable) {
    const generator = GENERATORS_BY_TYPE[content.type] ?? buildCreatureActorData;
    const source = content.type === "npc" ? content.statblock : content;
    await assert.doesNotReject(
      () => generator({ ...source, id: content.id, name: content.name }),
      `${path.relative(repoRoot, file)} (type "${content.type}") threw when run through its generator`
    );
  }
});
