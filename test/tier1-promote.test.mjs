// Tier 1 — Approvals Desk #167: the one guarded promotion path.
// design/approvals-desk.md §3: "every other write path refuses sound/final
// loudly ... rather than silently downgrading." This file proves the path
// itself works; test/tier1-writer-audit.test.mjs proves nothing else can.

import { test } from "node:test";
import assert from "node:assert/strict";
import { promote, assertNotPromotedStatus, PROMOTABLE_STATUSES, BASELINE_STATUSES } from "../module/blank-inheritance/scripts/core/promote.mjs";

test("promote(): raises status, stamps gradedAt/gradedBy, leaves the rest of the block alone", () => {
  const entity = { id: "the-drain-head", type: "location", authoring: { status: "drafted", note: "a rough note" } };
  const result = promote(entity, "sound", { gradedBy: "Ingram" });

  assert.equal(result.authoring.status, "sound");
  assert.equal(result.authoring.gradedBy, "Ingram");
  assert.match(result.authoring.gradedAt, /^\d{4}-\d{2}-\d{2}$/, "gradedAt must be an ISO date");
  assert.equal(result.authoring.note, "a rough note", "an untouched field must survive promotion unchanged");
  assert.equal(entity.authoring.status, "drafted", "promote() must not mutate its input");
});

test("promote(): accepts an optional grading note and batchId", () => {
  const entity = { id: "x", authoring: { status: "drafted" } };
  const result = promote(entity, "final", { gradedBy: "Ingram", note: "reads well aloud", batchId: "sweep-2026-09-19" });
  assert.equal(result.authoring.note, "reads well aloud");
  assert.equal(result.authoring.batchId, "sweep-2026-09-19");
});

test("promote(): refuses a target status outside sound/final", () => {
  const entity = { id: "x", authoring: { status: "drafted" } };
  for (const badStatus of ["drafted", "needs-lore", "approved", "cut", "changes", "", null, undefined]) {
    assert.throws(() => promote(entity, badStatus, { gradedBy: "Ingram" }), /can only raise status to sound or final/);
  }
});

test("promote(): refuses an entity with no authoring block at all", () => {
  assert.throws(() => promote({ id: "x" }, "sound", { gradedBy: "Ingram" }), /has no authoring block/);
});

test("promote(): refuses a missing gradedBy rather than assuming one", () => {
  const entity = { id: "x", authoring: { status: "drafted" } };
  assert.throws(() => promote(entity, "sound", {}), /requires gradedBy/);
  assert.throws(() => promote(entity, "sound"), /requires gradedBy/);
});

test("promote(): refuses a bare id, a path string, or an array -- it needs the loaded entity object", () => {
  for (const badEntity of ["the-drain-head", ["not", "an", "entity"], null, undefined, 42]) {
    assert.throws(() => promote(badEntity, "sound", { gradedBy: "Ingram" }), /needs the entity object itself/);
  }
});

test("PROMOTABLE_STATUSES and BASELINE_STATUSES together are exactly the four-state ladder, with no overlap", () => {
  assert.deepEqual([...PROMOTABLE_STATUSES], ["sound", "final"]);
  assert.deepEqual([...BASELINE_STATUSES], ["needs-lore", "drafted"]);
  const overlap = PROMOTABLE_STATUSES.filter((s) => BASELINE_STATUSES.includes(s));
  assert.deepEqual(overlap, []);
});

// Issue #168's escape hatch: "nothing may reach sound on top of a drafted
// foundation." dependencyStatuses is the caller-supplied lookup, since a
// pure function cannot resolve other entities' statuses itself.

test("promote(): refuses to promote when a dependency is still drafted", () => {
  const entity = { id: "x", authoring: { status: "drafted", dependsOn: ["the-foundation"] } };
  assert.throws(
    () => promote(entity, "sound", { gradedBy: "Ingram", dependencyStatuses: { "the-foundation": "drafted" } }),
    /"x" depends on the-foundation, which is not sound\/final/
  );
});

test("promote(): refuses when a dependency's status is simply missing from dependencyStatuses -- missing information must block, never silently pass", () => {
  const entity = { id: "x", authoring: { status: "drafted", dependsOn: ["untracked-dependency"] } };
  assert.throws(() => promote(entity, "sound", { gradedBy: "Ingram" }), /depends on untracked-dependency/);
});

test("promote(): succeeds once every dependency is itself sound or final", () => {
  const entity = { id: "x", authoring: { status: "drafted", dependsOn: ["a", "b"] } };
  const result = promote(entity, "sound", { gradedBy: "Ingram", dependencyStatuses: { a: "sound", b: "final" } });
  assert.equal(result.authoring.status, "sound");
});

test("promote(): names every unresolved dependency at once, not just the first", () => {
  const entity = { id: "x", authoring: { status: "drafted", dependsOn: ["a", "b", "c"] } };
  assert.throws(
    () => promote(entity, "sound", { gradedBy: "Ingram", dependencyStatuses: { b: "sound" } }),
    /depends on a, c, which are not sound\/final/
  );
});

test("promote(): an entity with no dependsOn at all has nothing to check -- promotion is unaffected", () => {
  const entity = { id: "x", authoring: { status: "drafted" } };
  const result = promote(entity, "sound", { gradedBy: "Ingram" });
  assert.equal(result.authoring.status, "sound");
});

test("assertNotPromotedStatus(): throws on a promoted value, is silent on a baseline one", () => {
  assert.throws(() => assertNotPromotedStatus("sound", { source: "a generator" }), /a generator attempted to write authoring\.status "sound"/);
  assert.throws(() => assertNotPromotedStatus("final"));
  assert.doesNotThrow(() => assertNotPromotedStatus("drafted"));
  assert.doesNotThrow(() => assertNotPromotedStatus("needs-lore"));
  assert.doesNotThrow(() => assertNotPromotedStatus(undefined));
});
