/**
 * Stitches the battle log JSON and the base64 map image into
 * template.html, producing the final publishable artifact file. Kept as
 * a real build step (not a one-off manual paste) so re-running the
 * simulation and republishing is a two-command process:
 *   node tools/battle-simulator/run-scenario.mjs
 *   node tools/battle-simulator/artifact/build.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const template = readFileSync(path.join(here, "template.html"), "utf8");
const battleLog = readFileSync(path.join(root, "battle-log.json"), "utf8");
const mapBase64 = readFileSync(path.join(root, "assets", "battle-map.b64.txt"), "utf8").trim();

// geometry.mjs is a real, independently node:test-tested ES module (see
// test/battle-simulator/artifact-geometry.test.mjs) — spliced in here as plain script text
// (export keywords stripped) so the published artifact stays one self-contained HTML file with
// no external script reference, while the geometry math itself still has real test coverage
// instead of living only as untestable inline <script> logic.
const geometryJs = readFileSync(path.join(here, "geometry.mjs"), "utf8").replace(/^export /gm, "");

const output = template
  .replace("__RUNS_JSON__", battleLog)
  .replace("__MAP_BASE64__", mapBase64)
  .replace("__GEOMETRY_JS__", geometryJs);

writeFileSync(path.join(here, "contact-simulation.html"), output);
console.log(`Wrote contact-simulation.html (${(output.length / 1024 / 1024).toFixed(2)} MB)`);
