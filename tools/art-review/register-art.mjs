// Registers filed artwork in data/campaign/asset-registry.json from art-registrations.json.
// The original Midjourney filename (sourceFilename) is found by matching the file's bytes against
// ~/Downloads, so it is never guessed. Re-runnable: an id already in the registry is skipped.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const registryPath = path.join(root, "data/campaign/asset-registry.json");
const downloads = path.join(os.homedir(), "Downloads");
const TODAY = "2026-09-30";

const md5 = (file) => crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex");

function downloadIndex() {
  const index = new Map();
  for (const f of fs.readdirSync(downloads)) {
    if (!f.startsWith("garsondee_") || !f.endsWith(".png")) continue;
    const full = path.join(downloads, f);
    const size = fs.statSync(full).size;
    if (!index.has(size)) index.set(size, []);
    index.get(size).push(full);
  }
  return index;
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const known = new Set(registry.assets.map((a) => a.id));
const { registrations } = JSON.parse(fs.readFileSync(path.join(root, "tools/art-review/art-registrations.json"), "utf8"));
const index = downloadIndex();
const report = { added: 0, skipped: 0, noSource: [] };

for (const r of registrations) {
  if (known.has(r.id)) { report.skipped += 1; continue; }
  const abs = path.join(root, r.path);
  if (!fs.existsSync(abs)) throw new Error(`missing file ${r.path}`);
  const size = fs.statSync(abs).size;
  const hash = md5(abs);
  const match = (index.get(size) ?? []).find((c) => md5(c) === hash);
  if (!match) report.noSource.push(r.id);
  registry.assets.push({
    id: r.id,
    kind: "image",
    category: r.category,
    path: r.path,
    assignedTo: { kind: r.assignedKind, ref: r.ref },
    assignedDate: TODAY,
    sourceFilename: match ? path.basename(match) : "(original filename no longer in Downloads)",
    note: r.note,
  });
  report.added += 1;
}
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
