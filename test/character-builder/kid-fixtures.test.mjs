/**
 * End-to-end correctness for the six kid test fixtures
 * (tools/battle-simulator/data/kid-fixtures/*.json): the derivation engine
 * reproduces Paizo's own published pregen HP totals exactly, and the
 * generated files are schema-valid and internally self-consistent (would
 * catch drift if a fixture were hand-edited without re-running
 * tools/character-builder/generate-fixtures.mjs).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listLevel1Pregens, toIngredients } from "../../tools/character-builder/extract-pregen.mjs";
import { deriveAbilityModifiers, deriveHP } from "../../tools/character-builder/derive.mjs";
import { buildKidFixture } from "../../tools/character-builder/build-kid-fixture.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
const fixturesDir = path.join(repoRoot, "tools", "battle-simulator", "data", "kid-fixtures");

// Mirrors tools/character-builder/generate-fixtures.mjs's ASSIGNMENTS — kept
// separate (not imported) so this test can't be silently satisfied by a bug
// shared between the generator and the test.
const JAEDANA_OVERRIDE = { ancestry: [null, null, "int"], background: ["dex", "str"] };

test("derivation engine reproduces every level-1 Adventure Pregen's own published HP total exactly", () => {
  const pregens = listLevel1Pregens(packDir);
  assert.ok(pregens.length >= 6, "expected at least the 6 Player Core classes among level-1 pregens");

  let checked = 0;
  for (const pregen of pregens) {
    const overrides = pregen.name === "Jaedana" ? JAEDANA_OVERRIDE : {};
    const ingredients = toIngredients(pregen, overrides);
    const mods = deriveAbilityModifiers(ingredients);
    const hp = deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con });
    assert.equal(hp.max, ingredients.referenceHP, `${pregen.name} (${ingredients.className}): computed HP ${hp.max} != Paizo's published ${ingredients.referenceHP}`);
    checked += 1;
  }
  assert.equal(checked, pregens.length);
});

test("kid-fixtures: exactly 6 files, one per Player Core class, every name flagged as a synthetic test fixture", () => {
  const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));
  assert.equal(files.length, 6);

  const classes = new Set();
  const ids = new Set();
  for (const file of files) {
    const content = JSON.parse(readFileSync(path.join(fixturesDir, file), "utf8"));
    assert.equal(content.type, "kid");
    assert.match(content.name, /^TEST FIXTURE — .+\(.+synthetic, not one of the six real kids\)$/, `${file}: name must follow the established synthetic-fixture convention`);
    classes.add(content.class);
    ids.add(content.id);
  }
  assert.equal(classes.size, 6, "expected 6 distinct classes, one per fixture");
  assert.equal(ids.size, 6, "expected 6 distinct ids");
});

test("kid-fixtures: every file validates against kid.schema.json", async (t) => {
  let Ajv2020;
  try {
    ({ default: Ajv2020 } = await import("ajv/dist/2020.js"));
  } catch {
    t.skip("ajv is not installed (npm install) — schema validation skipped, not silently passed");
    return;
  }

  const ajv = new Ajv2020({ strict: false, allErrors: true });
  ajv.addSchema(JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "common", "sf2e-common.schema.json"), "utf8")));
  const validate = ajv.compile(JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "kid.schema.json"), "utf8")));

  for (const file of readdirSync(fixturesDir).filter((f) => f.endsWith(".json"))) {
    const content = JSON.parse(readFileSync(path.join(fixturesDir, file), "utf8"));
    const valid = validate(content);
    assert.equal(valid, true, `${file} does not validate against kid.schema.json:\n${JSON.stringify(validate.errors, null, 2)}`);
  }
});

test("kid-fixtures: on-disk HP matches what buildKidFixture would produce right now (catches stale/hand-edited files)", () => {
  const pregens = listLevel1Pregens(packDir);
  const byClass = Object.fromEntries(pregens.map((p) => [p.name, p]));
  const NAME_TO_PREGEN = {
    "test-fixture-sensor-operator": "“Nitpick” Bennit",
    "test-fixture-structural-command": "Jaedana",
    "test-fixture-evacuation-marshal": "Vorza Moonshot",
    "test-fixture-signals-liaison": "Old-Growth Wildfire",
    "test-fixture-umbilical-control": "Lunar-17",
    "test-fixture-frame-pilot": "Tapkey"
  };

  for (const file of readdirSync(fixturesDir).filter((f) => f.endsWith(".json"))) {
    const onDisk = JSON.parse(readFileSync(path.join(fixturesDir, file), "utf8"));
    const pregenName = NAME_TO_PREGEN[onDisk.id];
    assert.ok(pregenName, `${file}: id "${onDisk.id}" isn't in this test's NAME_TO_PREGEN map — update the test alongside generate-fixtures.mjs's ASSIGNMENTS`);

    const overrides = pregenName === "Jaedana" ? JAEDANA_OVERRIDE : {};
    const ingredients = toIngredients(byClass[pregenName], overrides);
    const rebuilt = buildKidFixture(ingredients, { id: onDisk.id, groundRole: "x", conceptNote: "x" });

    assert.deepEqual(onDisk.hitPoints, rebuilt.hitPoints, `${file}: on-disk HP drifted from what the generator produces now — re-run tools/character-builder/generate-fixtures.mjs`);
    assert.deepEqual(onDisk.abilityModifiers, rebuilt.abilityModifiers, `${file}: on-disk ability modifiers drifted from the generator`);
    assert.deepEqual(onDisk.skills, rebuilt.skills, `${file}: on-disk skills drifted from the generator`);
  }
});
