#!/usr/bin/env node
// Combined SessionStart summary: the Node Registry's own index (open/orphaned/broken Nodes)
// plus the stale absence-claim scan, in one short report. See design/node-registry.md §14
// ("automatically flag issues to the LLM when it starts doing stuff") -- deferred there until
// the generator existed; wired for real 2026-09-19 once it did.
//
// Deliberately silent (prints nothing, exits 0) when there's genuinely nothing to flag, so a
// clean run doesn't add noise to every session start -- only says something when there's
// something worth a look.

import { generate } from "./generate.mjs";
import { detectStaleClaims } from "./detect-stale-claims.mjs";

const index = generate();
const { high: staleClaims } = detectStaleClaims();

const lines = [];

if (index.counts.brokenRefs > 0) {
  lines.push(`${index.counts.brokenRefs} broken Node reference(s) -- run \`node tools/node-registry/generate.mjs\` for details.`);
}
if (index.counts.orphans > 0) {
  lines.push(`${index.counts.orphans} orphaned Node(s) (authored, never referenced): ${index.orphans.join(", ")}.`);
}
if (index.counts.duplicateIds > 0) {
  lines.push(`${index.counts.duplicateIds} duplicate Node id(s): ${index.duplicateIds.join(", ")}.`);
}
if (staleClaims.length > 0) {
  lines.push(`${staleClaims.length} HIGH-confidence stale absence claim(s) -- run \`node tools/node-registry/detect-stale-claims.mjs\` for details.`);
}
if (index.openByAge.length > 0) {
  const oldest = index.openByAge.slice(0, 3).map((n) => `${n.id} (${n.lastTouched})`);
  lines.push(`Oldest open Node(s): ${oldest.join(", ")}${index.openByAge.length > 3 ? `, +${index.openByAge.length - 3} more` : ""}.`);
}

if (lines.length > 0) {
  console.log("Node Registry check (design/node-registry.md):");
  for (const l of lines) console.log(`  - ${l}`);
} else {
  console.log(`Node Registry check: ${index.counts.total} nodes, all clean -- no broken refs, no orphans, no stale absence claims found.`);
}
