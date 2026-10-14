// Node Registry -- reference-integrity test. See design/node-registry.md §5.
//
// Every nodeRefs / openQuestionRef / namingPlaceholderRef value anywhere under data/ must resolve to
// a real, currently-known Node: a parsed markdown Arc Node (quarantine/ideas/story/**/*.md), an
// open-questions.json entry, or a naming-placeholders.json entry. A broken reference means a fact was
// renamed or removed and something still points at the old name -- exactly the failure
// design/node-registry.md exists to catch, and the one piece of it that's fully mechanical.

import { test } from "node:test";
import assert from "node:assert/strict";
import { generate } from "../tools/node-registry/generate.mjs";

test("every nodeRefs/openQuestionRef/namingPlaceholderRef value resolves to a real node", () => {
  const index = generate();
  assert.deepEqual(
    index.brokenRefs,
    [],
    `${index.brokenRefs.length} broken node reference(s): ` +
      index.brokenRefs.map((r) => `${r.file}#${r.field} -> "${r.nodeId}"`).join("; ")
  );
});

test("no two nodes share the same id", () => {
  const index = generate();
  assert.deepEqual(index.duplicateIds, [], `duplicate node id(s), must be globally unique: ${index.duplicateIds.join(", ")}`);
});

test("mystery-ledger-6 exists and both Episode One scenes that plant it reference the same node", () => {
  const index = generate();
  const node = index.nodes.find((n) => n.id === "mystery-ledger-6");
  assert.ok(node, "mystery-ledger-6 should be authored in quarantine/ideas/story/blank-inheritance-ch1-v2.md");
  assert.equal(node.status, "open", "the payoff chapter is deliberately unassigned -- status should read open, not resolved");
  assert.ok(
    node.referencedBy.some((r) => r.includes("episode-c1e1--the-road-in")),
    "data/scene-briefs/episode-c1e1--the-road-in.json should reference mystery-ledger-6"
  );
  assert.ok(
    node.referencedBy.some((r) => r.includes("episode-c1e1--the-errand")),
    "data/scene-briefs/episode-c1e1--the-errand.json should reference mystery-ledger-6"
  );
});

test("naming-placeholders.json merge: namingPlaceholderRef still resolves against the combined open-questions.json", () => {
  const index = generate();
  const node = index.nodes.find((n) => n.id === "the-watcher-name");
  assert.ok(node, "the-watcher-name should now be an ordinary entry in data/campaign/open-questions.json");
  assert.equal(node.source.file, "data/campaign/open-questions.json");
  assert.ok(
    node.referencedBy.some((r) => r.includes("the-watcher.json") && r.includes("namingPlaceholderRef")),
    "data/antagonists/the-watcher.json's existing namingPlaceholderRef should still resolve, unchanged"
  );
});

// Closed 2026-09-24 by Ingram's answer to Casebook D13 (LEDGER #34): the Gen 2 core is biomechanical mitflit
// technology, not a living mitflit, so none of the three framings was adopted. This used to assert the Node was
// still open with every candidate live; it now pins the resolution, so a later edit can't quietly reopen it.
test("arc-mitflit-frame-core-link is resolved by LEDGER #34, with none of its three candidates adopted", () => {
  const index = generate();
  const node = index.nodes.find((n) => n.id === "arc-mitflit-frame-core-link");
  assert.ok(node, "arc-mitflit-frame-core-link should be authored in quarantine/ideas/story/bible/species/mitflits.md");
  assert.equal(node.status, "resolved");
  assert.equal(node.candidates.length, 3, `expected 3 candidates, parsed ${node.candidates.length}`);
  assert.ok(
    node.candidates.every((c) => c.status === "rejected"),
    "LEDGER #34 adopted none of the three framings"
  );
  assert.match(node.resolution ?? "", /biomechanical mitflit technology/);
});
