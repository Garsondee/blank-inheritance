// Tier 1 — Approvals Desk #171: the bounce loop (changes/cut) and the
// out-tray. core/bounce.mjs is pure -- no Foundry, no filesystem.

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileChangesInstruction, cutItem, computeOutTray, isInstructionOpen } from "../module/blank-inheritance/scripts/core/bounce.mjs";

const emptyLoreInstructions = { $schema: "../schema/lore-instructions.schema.json", id: "lore-instructions", type: "lore-instructions", instructions: [] };

test("fileChangesInstruction: writes exactly one new entry, touching nothing else in the document", () => {
  const { document, entry } = fileChangesInstruction(emptyLoreInstructions, {
    entityId: "shucks-mordant", entityType: "npc", text: "Surname needs fixing.", gradedBy: "Ingram", now: "2026-09-20T00:00:00"
  });
  assert.equal(document.instructions.length, 1);
  assert.equal(document.id, "lore-instructions", "the rest of the document must survive untouched");
  assert.deepEqual(entry, {
    id: "instr-1",
    documentId: "shucks-mordant",
    entityType: "npc",
    text: "Surname needs fixing.",
    status: "pending",
    raisedAt: "2026-09-20T00:00:00",
    resolvedAt: null,
    resolution: null,
    raisedBy: "Ingram",
    source: "approvals-desk"
  });
});

test("fileChangesInstruction: does not create a new store -- it's the same document shape lore-instructions.json already has, plus 3 new optional fields", () => {
  const { document } = fileChangesInstruction(emptyLoreInstructions, { entityId: "x", text: "t", gradedBy: "Ingram" });
  assert.deepEqual(Object.keys(document).sort(), ["$schema", "id", "instructions", "type"].sort());
});

test("fileChangesInstruction: ids are monotonic and never recycled, matching lore_library.py's own numbering, even alongside pre-existing lore-library instructions", () => {
  const withExisting = { ...emptyLoreInstructions, instructions: [{ id: "instr-7", documentId: "open-questions", text: "old", status: "done", raisedAt: "x", resolvedAt: "y", resolution: "z" }] };
  const { entry } = fileChangesInstruction(withExisting, { entityId: "new-item", text: "t", gradedBy: "Ingram" });
  assert.equal(entry.id, "instr-8");
});

test("fileChangesInstruction: refuses without entityId or text -- a bounce with no reason isn't a loop, it's a shrug", () => {
  assert.throws(() => fileChangesInstruction(emptyLoreInstructions, { text: "t", gradedBy: "Ingram" }), /requires entityId/);
  assert.throws(() => fileChangesInstruction(emptyLoreInstructions, { entityId: "x", gradedBy: "Ingram" }), /requires text/);
});

test("fileChangesInstruction: entityType defaults to null for a caller that doesn't supply one (the pre-#171 lore-library shape)", () => {
  const { entry } = fileChangesInstruction(emptyLoreInstructions, { entityId: "open-questions", text: "t", gradedBy: "Ingram" });
  assert.equal(entry.entityType, null);
});

test("cutItem: sets status to cut and stamps provenance, leaving the rest of the block alone", () => {
  const entity = { id: "x", authoring: { status: "drafted", note: "a note" } };
  const result = cutItem(entity, { gradedBy: "Ingram" });
  assert.equal(result.authoring.status, "cut");
  assert.equal(result.authoring.gradedBy, "Ingram");
  assert.match(result.authoring.gradedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(result.authoring.note, "a note", "untouched fields survive");
  assert.equal(entity.authoring.status, "drafted", "cutItem() must not mutate its input");
});

test("cutItem: accepts an optional note explaining the decision", () => {
  const entity = { id: "x", authoring: { status: "drafted" } };
  const result = cutItem(entity, { gradedBy: "Ingram", note: "superseded by the rebuilt scene" });
  assert.equal(result.authoring.note, "superseded by the rebuilt scene");
});

test("cutItem: refuses to cut something already sound or final -- that would be a silent demotion, a different action", () => {
  for (const status of ["sound", "final"]) {
    const entity = { id: "x", authoring: { status } };
    assert.throws(() => cutItem(entity, { gradedBy: "Ingram" }), /already "[a-z]+" -- demoting reviewed content/);
  }
});

test("cutItem: cutting an already-cut item is idempotent, not refused -- re-recording the same decision is not a demotion", () => {
  const entity = { id: "x", authoring: { status: "cut" } };
  assert.doesNotThrow(() => cutItem(entity, { gradedBy: "Ingram" }));
});

test("cutItem: refuses an entity with no authoring block, or a missing gradedBy", () => {
  assert.throws(() => cutItem({ id: "x" }, { gradedBy: "Ingram" }), /has no authoring block/);
  assert.throws(() => cutItem({ id: "x", authoring: { status: "drafted" } }, {}), /requires gradedBy/);
});

test("cutItem: refuses a bare id, path, or array -- it needs the loaded entity object", () => {
  for (const bad of ["x", ["a"], null, undefined, 42]) {
    assert.throws(() => cutItem(bad, { gradedBy: "Ingram" }), /needs the entity object itself/);
  }
});

test("computeOutTray: counts pending instructions, open gazetteer requests, and needs-lore items -- three real sources, one number", () => {
  const outTray = computeOutTray({
    loreInstructions: { instructions: [{ id: "instr-1", status: "pending" }, { id: "instr-2", status: "done" }] },
    gazetteerRequests: { requests: [{ id: "req-1", status: "open" }, { id: "req-2", status: "resolved" }] },
    allEntitiesById: {
      a: { id: "a", authoring: { status: "needs-lore" } },
      b: { id: "b", authoring: { status: "drafted" } },
      c: { id: "c", authoring: { status: "needs-lore" } }
    }
  });
  assert.equal(outTray.pendingInstructions.length, 1);
  assert.equal(outTray.openGazetteerRequests.length, 1);
  assert.equal(outTray.needsLoreItems.length, 2);
  assert.equal(outTray.total, 4);
});

test("computeOutTray: a changes bounce is not a fifth category -- it's already counted as a pending instruction, since fileChangesInstruction writes into the same store", () => {
  const { document } = fileChangesInstruction(emptyLoreInstructions, { entityId: "x", text: "t", gradedBy: "Ingram" });
  const outTray = computeOutTray({ loreInstructions: document });
  assert.equal(outTray.pendingInstructions.length, 1);
  assert.equal(outTray.pendingInstructions[0].source, "approvals-desk");
});

test("computeOutTray: empty/missing sources are safe and count as zero, not a throw", () => {
  const expected = { pendingInstructions: [], openGazetteerRequests: [], needsLoreItems: [], total: 0, openCreativeQuestions: [], unreviewedAudio: [] };
  assert.deepEqual(computeOutTray(), expected);
  assert.deepEqual(computeOutTray({}), expected);
});

test("isInstructionOpen / the regression issue #171 asks for by name: resolving an instruction clears it from the out-tray", () => {
  const { document, entry } = fileChangesInstruction(emptyLoreInstructions, { entityId: "x", text: "t", gradedBy: "Ingram" });
  assert.equal(isInstructionOpen(entry), true);
  assert.equal(computeOutTray({ loreInstructions: document }).total, 1);

  // Resolving is lore_library.py's own job (this project's existing resolve()
  // function) -- simulated here as the same shape it produces, to prove the
  // OUT-TRAY computation correctly responds to it, not to re-test resolve()
  // itself.
  const resolved = { ...document, instructions: document.instructions.map((i) => (i.id === entry.id ? { ...i, status: "done", resolvedAt: "2026-09-20T01:00:00", resolution: "fixed the surname" } : i)) };
  assert.equal(isInstructionOpen(resolved.instructions[0]), false);
  assert.equal(computeOutTray({ loreInstructions: resolved }).total, 0);
});

// --- issue #172: open questions and audio review, a DIFFERENT direction ---

test("computeOutTray: open questions are counted separately from the out-tray total -- they wait on INGRAM, not Claude (design/approvals-desk.md §6)", () => {
  const result = computeOutTray({
    openQuestions: { questions: [{ id: "q1", status: "open" }, { id: "q2", status: "resolved" }, { id: "q3", status: "open" }] }
  });
  assert.equal(result.openCreativeQuestions.length, 2);
  assert.equal(result.total, 0, "open questions must never inflate the out-tray's own 'waiting on Claude' total");
});

test("computeOutTray: audio review counts against the FULL library, not just review.json's own decisions map -- an asset with no entry is still 'proposed' per audio-review.schema.json's own rule", () => {
  const result = computeOutTray({
    audioLibrary: { assets: [{ id: "a" }, { id: "b" }, { id: "c" }] },
    audioReview: { decisions: { a: { status: "confirmed" }, b: { status: "proposed" } } }
    // "c" has no entry at all -- must still count as unreviewed.
  });
  assert.deepEqual(result.unreviewedAudio.map((a) => a.id).sort(), ["b", "c"]);
});

test("computeOutTray: a rejected audio decision does not count as needing review -- rejected is a real, durable decision (design/audio-system.md), not a pending one", () => {
  const result = computeOutTray({
    audioLibrary: { assets: [{ id: "a" }] },
    audioReview: { decisions: { a: { status: "rejected" } } }
  });
  assert.deepEqual(result.unreviewedAudio, []);
});

test("computeOutTray: missing openQuestions/audioLibrary/audioReview are safe, not a throw", () => {
  const result = computeOutTray({});
  assert.deepEqual(result.openCreativeQuestions, []);
  assert.deepEqual(result.unreviewedAudio, []);
});
