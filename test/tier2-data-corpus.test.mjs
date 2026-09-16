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

import { buildCreatureActorData } from "../module/blank-inheritance/scripts/core/generators/creature.mjs";
import { buildNpcActorData } from "../module/blank-inheritance/scripts/core/generators/npc.mjs";
import { buildCharacterActorData } from "../module/blank-inheritance/scripts/core/generators/character.mjs";
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
// data/map/gazetteer-drafts/ is the same shape of exclusion for the same
// reason, one tool later: tools/gazetteer's drawing-session dumps are scratch
// (core/session.py's own docstring calls them that explicitly) that becomes a
// real data/locations/*.json entity only once promoted — so a real session
// file left on disk from actually using the tool must not fail this tier
// either (found 2026-09-11, verifying the gazetteer itself, same class of bug).
const EXCLUDED_PATH_SEGMENTS = [
  `${path.sep}schema${path.sep}`,
  `${path.sep}map${path.sep}editor-submissions${path.sep}`,
  `${path.sep}map${path.sep}gazetteer-drafts${path.sep}`,
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
  assert.equal(
    isCorpusFile(path.join(dataRoot, "map", "gazetteer-drafts", "session-20260911-144323.json")),
    false
  );
  assert.equal(isCorpusFile(path.join(dataRoot, "npcs", "commander.json")), true);
  assert.equal(isCorpusFile(path.join(dataRoot, "map", "frames", "kurose-12km.json")), true);
  assert.equal(isCorpusFile(path.join(dataRoot, "map", "groundtruth-overrides.json")), true);
  assert.equal(isCorpusFile(path.join(dataRoot, "map", "campaign-map.json")), true);
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
  // buildNpcActorData (unlike the old inline npc handling below it replaced)
  // takes the WHOLE npc.schema.json object and branches internally on
  // whether `statblock` is present -- so every real data/npcs/*.json file is
  // generator-applicable now, not just the ones with real combat stats.
  npc: buildNpcActorData,
  kid: buildCharacterActorData,
  frame: buildCharacterActorData
};

test("every data/ file with a generator-applicable type runs through its generator without throwing", async () => {
  const applicable = dataFiles
    .map((file) => ({ file, content: JSON.parse(readFileSync(file, "utf8")) }))
    .filter(({ content }) => Boolean(GENERATORS_BY_TYPE[content.type]));

  // Currently expected to cover every real data/npcs/*.json file (29 as of
  // 2026-09-16, most with no statblock at all) plus zero kid/Frame/creature
  // files -- character creation hasn't happened yet and no real Claimant
  // instances exist. This assertion documents that as a known, current state
  // rather than a silent zero-test pass — it must be updated (not just left
  // green) the day the first real kid/Frame/Claimant file is added, per
  // design/testing-strategy.md's "no silent caps" rule.
  console.log(`Blank Inheritance test | ${applicable.length} generator-applicable real data file(s) found.`);

  for (const { file, content } of applicable) {
    const generator = GENERATORS_BY_TYPE[content.type];
    await assert.doesNotReject(
      () => generator(content),
      `${path.relative(repoRoot, file)} (type "${content.type}") threw when run through its generator`
    );
  }
});

// Tier 2's own narrow reference-integrity check for npcRef specifically (not
// a general *Ref/*Refs cross-reference graph -- different ref fields point at
// different collections, and doing that properly for all of them is a
// separate, bigger task). Deliberately scoped to CAST-entry npcRef only:
// scene-brief.schema.json overloads the literal key name "npcRef" for two
// different things — a cast entry's npcRef points at a real data/npcs/*.json
// id (schema's own words: "id of a data/npcs/*.json file"), but a BEAT's
// npcRef points at a scene-LOCAL cast entry id instead ("The `id` of a cast
// entry above"). Confirmed live in the corpus, 2026-09-16: the Intake
// Medicals clerk's cast-local id is "clerk", but her real data/npcs/ id is
// "intake-medicals-clerk" — a beat referencing npcRef: "clerk" is correct
// and must not be flagged, even though "clerk" is not a real npc id. Walking
// every occurrence of the key regardless of position would misreport that
// (and similar cases, e.g. the-errand.json's beat-level npcRef: "storekeeper",
// a cast-local id with no data/npcs/ file at all) as dangling.
test("every non-null CAST-entry npcRef under data/ resolves to a real id in data/npcs/*.json", () => {
  const npcFiles = dataFiles.filter((f) => f.includes(`${path.sep}npcs${path.sep}`));
  const realNpcIds = new Set(npcFiles.map((f) => JSON.parse(readFileSync(f, "utf8")).id));
  assert.ok(realNpcIds.size > 0, "expected at least one real file under data/npcs/ for this check to mean anything");

  const refs = [];
  for (const file of dataFiles) {
    const content = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(content.cast)) continue;
    for (const castEntry of content.cast) {
      if (castEntry && typeof castEntry.npcRef === "string") {
        refs.push({ npcRef: castEntry.npcRef, castId: castEntry.id, file });
      }
    }
  }
  assert.ok(refs.length > 0, "expected at least one real cast-entry npcRef somewhere under data/ for this check to mean anything");

  const dangling = refs.filter((r) => !realNpcIds.has(r.npcRef));
  assert.deepEqual(
    dangling.map((d) => `${path.relative(repoRoot, d.file)}: cast entry "${d.castId}" -> npcRef "${d.npcRef}"`),
    [],
    "every cast-entry npcRef must resolve to a real id in data/npcs/*.json -- a dangling one silently breaks anything " +
      "that resolves it later (e.g. the Character Card system, foundry/social-store.mjs, which needs a real Actor per NPC)."
  );
});
