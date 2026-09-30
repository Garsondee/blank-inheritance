// Applies tools/art-review/catchphrase-edits.json to canon/scenes/*.json and records every
// application in tools/art-review/ledger.json, for the review page (tools/art-review/build.mjs).
// Re-runnable: an edit whose `find` text is already gone is reported as already applied, not an error.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const editsPath = path.join(root, "tools/art-review/catchphrase-edits.json");
const ledgerPath = path.join(root, "tools/art-review/ledger.json");

export function applyToValue(value, edit, trail, hits) {
  if (typeof value === "string") {
    if (value.includes(edit.find)) {
      hits.push({ path: trail.join("."), before: value, after: value.replace(edit.find, edit.replace) });
      return value.replace(edit.find, edit.replace);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v, i) => applyToValue(v, edit, [...trail, i], hits));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = applyToValue(v, edit, [...trail, k], hits);
    return out;
  }
  return value;
}

export function readLedger() {
  return fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : { changes: [] };
}
export function writeLedger(ledger) {
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
}

function main() {
  const { edits } = JSON.parse(fs.readFileSync(editsPath, "utf8"));
  const ledger = readLedger();
  const byScene = new Map();
  for (const e of edits) (byScene.get(e.scene) ?? byScene.set(e.scene, []).get(e.scene)).push(e);
  const report = { applied: 0, already: 0, missing: [] };

  for (const [scene, list] of byScene) {
    const file = path.join(root, "canon/scenes", `${scene}.json`);
    let doc = JSON.parse(fs.readFileSync(file, "utf8"));
    let changed = false;
    for (const e of list) {
      const hits = [];
      doc = applyToValue(doc, e, [], hits);
      if (hits.length) {
        changed = true;
        report.applied += 1;
        for (const h of hits) {
          ledger.changes.push({
            kind: "catchphrase", scene, npc: e.npc, path: h.path,
            find: e.find, replace: e.replace, why: e.why,
          });
        }
      } else if (ledger.changes.some((c) => c.scene === scene && c.find === e.find)) {
        report.already += 1;
      } else {
        report.missing.push(`${scene}/${e.npc}: ${e.find.slice(0, 70)}`);
      }
    }
    if (changed) fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
  }
  writeLedger(ledger);
  console.log(JSON.stringify({ applied: report.applied, alreadyApplied: report.already, missing: report.missing }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
