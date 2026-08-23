/**
 * Assembles the published artifact from the per-simulation log store
 * (design doc §15m) — every run recorded under logs/, indexed by
 * logs/index.json, embedded as one RUNS object so the artifact stays a
 * single self-contained HTML file (no external fetches; Artifact pages run
 * under a CSP that blocks them). Two commands regenerate everything:
 *   node tools/battle-simulator/run-scenario.mjs [...]
 *   node tools/battle-simulator/artifact/build.mjs
 *
 * REPLACES the old battle-log.json single-file scheme, which embedded
 * whatever three runs run-scenario.mjs's own hardcoded array happened to
 * produce. Now it embeds every run the log store actually holds, so a real
 * sweep (`--seed=1000-1019`) shows up in the reader without the build step
 * needing to know anything about how many runs exist or what they're called.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectRunMetrics } from "../analysis/metrics.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const logsDir = path.join(root, "logs");

const template = readFileSync(path.join(here, "template.html"), "utf8");
const mapBase64 = readFileSync(path.join(root, "assets", "battle-map.b64.txt"), "utf8").trim();

// geometry.mjs / steps.mjs / library.mjs are real, independently node:test-tested ES modules —
// spliced in as plain script text (export keywords stripped) so the published artifact stays one
// self-contained file with no external script reference, while the logic itself is still covered
// by real tests instead of living only as untestable inline <script> code.
function spliceModule(name) {
  return readFileSync(path.join(here, name), "utf8").replace(/^export /gm, "");
}
const geometryJs = spliceModule("geometry.mjs");
const stepsJs = spliceModule("steps.mjs");
const libraryJs = spliceModule("library.mjs");

let index = [];
try {
  index = JSON.parse(readFileSync(path.join(logsDir, "index.json"), "utf8"));
} catch {
  console.warn("No logs/index.json found — run run-scenario.mjs first. Building an artifact with zero runs.");
}

const runs = index.map((entry) => {
  const record = JSON.parse(readFileSync(path.join(logsDir, entry.file), "utf8"));
  // groundLayerLog is kept on the per-run FILE (the complete record) but dropped here — nothing
  // in the artifact UI reads it (verified), and it is the single largest per-run field (~9KB) so
  // leaving it out of the embed matters for the size budget as the run library grows.
  const metrics = collectRunMetrics(record.log);
  // outcome/rounds/utilization are flattened onto the run itself (duplicating what's already in
  // `metrics`) because that's the shape library.mjs's filter/sort and the reader's card rendering
  // are written against — simple property access, no reaching into a nested object every time.
  return {
    id: entry.id, scenario: entry.scenario, label: entry.label, seed: entry.seed,
    roundLimit: entry.roundLimit, generatedAt: entry.generatedAt,
    outcome: metrics.outcome, rounds: metrics.rounds, utilization: metrics.utilization,
    metrics,
    log: record.log
  };
});

const runsJson = JSON.stringify({ runs }); // no indentation — this is a payload, not a document meant to be read

const output = template
  .replace("__RUNS_JSON__", runsJson)
  .replace("__MAP_BASE64__", mapBase64)
  .replace("__GEOMETRY_JS__", geometryJs)
  .replace("__STEPS_JS__", stepsJs)
  .replace("__LIBRARY_JS__", libraryJs);

writeFileSync(path.join(here, "contact-simulation.html"), output);

const mb = (n) => (n / 1024 / 1024).toFixed(2) + " MB";
console.log(`Wrote contact-simulation.html (${mb(output.length)} total, ${mb(runsJson.length)} of runs, ${runs.length} run(s) embedded)`);
if (runs.length === 0) console.warn("Zero runs embedded — the reader will be empty.");
