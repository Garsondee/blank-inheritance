/**
 * Loads the five non-piloting kid test fixtures (see
 * tools/character-builder/generate-fixtures.mjs for how they're built).
 * The sixth (test-fixture-frame-pilot) is excluded on purpose — that kid
 * is piloting the Frame this Contact, not working a ground role, and the
 * Frame's own combat stats are already a fully independent Frame-scale
 * fixture (data/combatants.mjs's makeReferenceFrame) that doesn't read
 * anything from whichever kid is nominally in the seat.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(here, "..", "data", "kid-fixtures");

export function loadGroundTeam() {
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json") && f !== "test-fixture-frame-pilot.json")
    .map((f) => JSON.parse(readFileSync(path.join(fixturesDir, f), "utf8")));
}
