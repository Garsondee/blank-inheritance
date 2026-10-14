// The read-only copy of the timeline (design/plot-timeline.md §6, D070): the same page with canon baked in as a
// snapshot file, for claude.ai. It has no way to write: no server, no POST, no live feed. It carries the canon hash it
// was made from, so a stale copy can be spotted (`published.json`, written when a copy is published).
import fs from "node:fs";
import path from "node:path";

import { ROOT, loadModel } from "../story/lib.mjs";
import { snapshot } from "../story/snapshot.mjs";
import { CORE_FILES, PAGE_FILES } from "./server.mjs";

export const OUT = path.join(ROOT, "tools/timeline/out");
export const PUBLISHED = path.join(ROOT, "tools/timeline/published.json");

/** Write the copy. Returns the canon hash it was made from and the files, as the Artifact tool wants them. */
export function exportCopy({ root = ROOT, out = OUT } = {}) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "core"), { recursive: true });
  const snap = snapshot(loadModel(root), { root });
  const page = fs.readFileSync(path.join(root, "tools/timeline/page/index.html"), "utf8").replace("{{SOURCE}}", "snapshot.json");
  fs.writeFileSync(path.join(out, "index.html"), page);
  for (const f of PAGE_FILES) fs.copyFileSync(path.join(root, "tools/timeline/page", f), path.join(out, f));
  for (const f of CORE_FILES) fs.copyFileSync(path.join(root, "module/blank-inheritance/scripts/core", f), path.join(out, "core", f));
  fs.writeFileSync(path.join(out, "snapshot.json"), JSON.stringify(snap));
  const files = { "snapshot.json": path.join(out, "snapshot.json") };
  for (const f of PAGE_FILES) files[f] = path.join(out, f);
  for (const f of CORE_FILES) files[`core/${f}`] = { from: path.join(out, "core", f), contentType: "text/javascript" };
  return { canonHash: snap.canonHash, page: path.join(out, "index.html"), files };
}

/** Record what was published, so the session start can say how far behind the copy is. */
export function recordPublished({ url, canonHash, at = new Date().toISOString() }, file = PUBLISHED) {
  fs.writeFileSync(file, `${JSON.stringify({ url, canonHash, publishedAt: at }, null, 2)}\n`);
}

export function readPublished(file = PUBLISHED) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}
