/**
 * Regenerates the six kid test fixtures in
 * tools/battle-simulator/data/kid-fixtures/ from the real SF2E "Adventure
 * Pregens" compendium (gamesystems/sf2e/packs/paizo-pregens) — one pregen
 * per Player Core class, reflavoured as a placeholder for each of the five
 * ground roles (data/campaign/ground-roles.json) plus one Frame pilot.
 * Re-run this after a gamesystems/sf2e upgrade if the pack's internal
 * shape ever changes; nothing here is meant to be hand-edited afterward —
 * edit this script and regenerate instead.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listLevel1Pregens, toIngredients } from "./extract-pregen.mjs";
import { buildKidFixture } from "./build-kid-fixture.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
const outDir = path.join(repoRoot, "tools", "battle-simulator", "data", "kid-fixtures");
const schemaPath = path.join(repoRoot, "data", "schema", "kid.schema.json");

// pregenName -> { id, groundRole, conceptNote, framePilotedRef, boostOverrides }
// Assignment is by class-concept fit to the five named ground roles plus one
// pilot slot (data/campaign/ground-roles.json) — not mechanically required
// (any kid may attempt any obstacle, per that file's own participants rule),
// just a reasonable, documented pick so each fixture reads as a character
// rather than an arbitrary label.
const ASSIGNMENTS = {
  "“Nitpick” Bennit": {
    id: "test-fixture-sensor-operator", groundRole: "Sensor Operator",
    conceptNote: "Synthetic test fixture — a reflavoured SF2E Adventure Pregen (Witchwarper) standing in for the Sensor Operator ground-role slot. Arcana training lines up directly with the Spot obstacle's skill options.",
  },
  "Jaedana": {
    id: "test-fixture-structural-command", groundRole: "Structural Command",
    conceptNote: "Synthetic test fixture — a reflavoured SF2E Adventure Pregen (Operative) standing in for the Structural Command ground-role slot. Precise, tactical build fits demolitions/collapse work.",
    boostOverrides: { ancestry: [null, null, "int"], background: ["dex", "str"] } // see extract-pregen.mjs's resolve() — this pregen's data doesn't record which ability two of its boosts resolved to; chosen to reproduce the pregen's own published HP total (17) as a correctness check, and to respect "different ability per simultaneous boost."
  },
  "Vorza Moonshot": {
    id: "test-fixture-evacuation-marshal", groundRole: "Evacuation Marshal",
    conceptNote: "Synthetic test fixture — a reflavoured SF2E Adventure Pregen (Solarian) standing in for the Evacuation Marshal ground-role slot. High Strength, built for physically moving people clear.",
  },
  "Old-Growth Wildfire": {
    id: "test-fixture-signals-liaison", groundRole: "Signals Liaison",
    conceptNote: "Synthetic test fixture — a reflavoured SF2E Adventure Pregen (Soldier) standing in for the Signals Liaison ground-role slot. Steady under fire — the one who talks a slipping pilot down.",
  },
  "Lunar-17": {
    id: "test-fixture-umbilical-control", groundRole: "Umbilical Control",
    conceptNote: "Synthetic test fixture — a reflavoured SF2E Adventure Pregen (Mystic) standing in for the Umbilical Control ground-role slot. A spiritual-bond class reflavoured as a technical bond to the Frame's systems.",
  },
  "Tapkey": {
    id: "test-fixture-frame-pilot", groundRole: "Frame Pilot",
    conceptNote: "Synthetic test fixture — a reflavoured SF2E Adventure Pregen (Envoy) standing in for the sixth kid, the one piloting the Frame this Contact rather than working a ground role.",
    framePilotedRef: "frame-reference"
  }
};

const pregens = listLevel1Pregens(packDir);
const schemaRelPath = (outFile) => path.relative(path.dirname(outFile), schemaPath).split(path.sep).join("/");

let written = 0;
for (const pregen of pregens) {
  const assignment = ASSIGNMENTS[pregen.name];
  if (!assignment) continue; // this pack also has non-target level-1 pregens (other classes' alternates) we're not using

  const ingredients = toIngredients(pregen, assignment.boostOverrides ?? {});
  const fixture = buildKidFixture(ingredients, assignment);
  const outFile = path.join(outDir, `${assignment.id}.json`);
  fixture.$schema = schemaRelPath(outFile);

  writeFileSync(outFile, JSON.stringify(fixture, null, 2) + "\n");
  written += 1;
  console.log(`wrote ${path.relative(repoRoot, outFile)} (${ingredients.className}, HP ${fixture.hitPoints.max})`);
}

if (written !== Object.keys(ASSIGNMENTS).length) {
  throw new Error(`Expected to write ${Object.keys(ASSIGNMENTS).length} fixtures, wrote ${written} — a pregen name in ASSIGNMENTS didn't match anything in the pack (Paizo may have renamed one).`);
}
