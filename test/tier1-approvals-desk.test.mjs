// Tier 1 — Approvals Desk #170: the queue/grading state machine.
// core/approvals-desk.mjs is pure -- no Foundry, no I/O. The adapter
// (rendering "in costume", actually calling promote.mjs, writing files) is
// untested here on purpose, same boundary as everywhere else in this project.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDeskQueue, createDeskState, deskCurrentItem, deskNext, deskPrev,
  deskGrade, deskGradeBatch, deskUndo, proposeBatches
} from "../module/blank-inheritance/scripts/core/approvals-desk.mjs";

function shift(sceneId, items) {
  return { order: 1, episodeId: "ep", sceneId, items };
}
function item(id, extra = {}) {
  return { type: "npc", id, authoring: { status: "drafted" }, ...extra };
}

test("buildDeskQueue: flattens shifts and annotates unblocks (reverse dependsOn) and blockedBy (forward, resolved against the full corpus)", () => {
  const shifts = [shift("s1", [
    item("foundation"),
    item("built-on-it", { authoring: { status: "drafted", dependsOn: ["foundation"] } })
  ])];
  const queue = buildDeskQueue(shifts, { allEntitiesById: { foundation: { authoring: { status: "drafted" } } } });

  const foundation = queue.find((q) => q.id === "foundation");
  assert.deepEqual(foundation.unblocks, ["built-on-it"], "foundation unblocks the thing that names it in dependsOn");

  const builtOnIt = queue.find((q) => q.id === "built-on-it");
  assert.deepEqual(builtOnIt.blockedBy, [{ id: "foundation", status: "drafted" }]);
});

test("buildDeskQueue: blockedBy resolves against the FULL corpus, not just the queue -- a dependency already sound and absent from the queue still resolves correctly", () => {
  const shifts = [shift("s1", [item("x", { authoring: { status: "drafted", dependsOn: ["already-sound-elsewhere"] } })])];
  const queue = buildDeskQueue(shifts, { allEntitiesById: { "already-sound-elsewhere": { authoring: { status: "sound" } } } });
  assert.deepEqual(queue[0].blockedBy, [{ id: "already-sound-elsewhere", status: "sound" }]);
});

test("buildDeskQueue: a dependsOn id with no corpus entry at all resolves to status \"unknown\", not a thrown error", () => {
  const shifts = [shift("s1", [item("x", { authoring: { status: "drafted", dependsOn: ["nobody-knows-this-id"] } })])];
  const queue = buildDeskQueue(shifts, {});
  assert.deepEqual(queue[0].blockedBy, [{ id: "nobody-knows-this-id", status: "unknown" }]);
});

test("deskNext/deskPrev: clamp at both ends, never wrap", () => {
  let state = createDeskState([item("a"), item("b"), item("c")]);
  state = deskPrev(state);
  assert.equal(state.index, 0, "prev from the start stays at the start");
  state = deskNext(deskNext(deskNext(state)));
  assert.equal(state.index, 2, "next past the end clamps at the last item, never wraps to 0");
});

test("deskCurrentItem: null on an empty queue, the right item otherwise", () => {
  assert.equal(deskCurrentItem(createDeskState([])), null);
  assert.equal(deskCurrentItem(createDeskState([item("a")])).id, "a");
});

test("deskGrade: removes the current item, records history, and the SAME index now shows the next item -- clearing one advances you", () => {
  let state = createDeskState([item("a"), item("b"), item("c")]);
  state = deskGrade(state, "sound", { gradedBy: "Ingram" });
  assert.equal(state.items.length, 2);
  assert.equal(deskCurrentItem(state).id, "b", "index 0 now shows what used to be second");
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].item.id, "a");
  assert.equal(state.history[0].action, "sound");
});

test("deskGrade: grading the LAST item in the queue clamps the index down rather than pointing past the end", () => {
  let state = createDeskState([item("a"), item("b")]);
  state = deskNext(state); // now at "b", index 1
  state = deskGrade(state, "final", { gradedBy: "Ingram" });
  assert.equal(state.items.length, 1);
  assert.equal(state.index, 0);
  assert.equal(deskCurrentItem(state).id, "a");
});

test("deskGrade: an empty queue is a safe no-op", () => {
  const state = createDeskState([]);
  assert.deepEqual(deskGrade(state, "sound", { gradedBy: "Ingram" }), state);
});

test("deskGrade: rejects an action outside sound/final/changes/cut", () => {
  const state = createDeskState([item("a")]);
  assert.throws(() => deskGrade(state, "approved", { gradedBy: "Ingram" }), /must be one of sound\/final\/changes\/cut/);
});

test("deskGrade: 'changes' requires a note -- a bounce with no reason isn't a loop", () => {
  const state = createDeskState([item("a")]);
  assert.throws(() => deskGrade(state, "changes", { gradedBy: "Ingram" }), /requires a note/);
  assert.doesNotThrow(() => deskGrade(state, "changes", { note: "surname needs fixing", gradedBy: "Ingram" }));
});

test("deskUndo: reverses a single grade, restoring the item to its EXACT original position", () => {
  let state = createDeskState([item("a"), item("b"), item("c")]);
  state = deskNext(state); // at "b"
  state = deskGrade(state, "sound", { gradedBy: "Ingram" }); // removes b
  assert.deepEqual(state.items.map((i) => i.id), ["a", "c"]);
  state = deskUndo(state);
  assert.deepEqual(state.items.map((i) => i.id), ["a", "b", "c"], "b must land back in the middle, not at the end");
  assert.equal(state.index, 1, "undo restores the view to where the graded item was");
  assert.equal(state.history.length, 0);
});

test("deskUndo: on an empty history is a safe no-op", () => {
  const state = createDeskState([item("a")]);
  assert.deepEqual(deskUndo(state), state);
});

test("deskUndo: undoing twice in a row restores two grades, most recent first", () => {
  let state = createDeskState([item("a"), item("b")]);
  state = deskGrade(state, "sound", { gradedBy: "Ingram" }); // removes a
  state = deskGrade(state, "final", { gradedBy: "Ingram" }); // removes b
  assert.deepEqual(state.items, []);
  state = deskUndo(state);
  assert.deepEqual(state.items.map((i) => i.id), ["b"]);
  state = deskUndo(state);
  assert.deepEqual(state.items.map((i) => i.id), ["a", "b"]);
});

test("deskGradeBatch: grades several items as one gesture, recording ONE history entry tagged with a batchId", () => {
  let state = createDeskState([item("a"), item("b"), item("c"), item("d")]);
  state = deskGradeBatch(state, ["a", "c"], "sound", { gradedBy: "Ingram", batchId: "sweep-1" });
  assert.deepEqual(state.items.map((i) => i.id), ["b", "d"]);
  assert.equal(state.history.length, 1, "a batch is ONE history entry, not one per item");
  assert.equal(state.history[0].kind, "batch");
  assert.equal(state.history[0].batchId, "sweep-1");
  assert.equal(state.history[0].items.length, 2);
});

test("deskGradeBatch: an unknown/already-graded id refuses the whole batch rather than partially applying it", () => {
  const state = createDeskState([item("a"), item("b")]);
  assert.throws(() => deskGradeBatch(state, ["a", "not-in-queue"], "sound", { gradedBy: "Ingram" }), /not currently in the queue/);
});

test("deskGradeBatch: refuses an empty batch", () => {
  const state = createDeskState([item("a")]);
  assert.throws(() => deskGradeBatch(state, [], "sound", { gradedBy: "Ingram" }), /must not be empty/);
});

test("deskGradeBatch: auto-generates a batchId when the caller doesn't supply one", () => {
  let state = createDeskState([item("a")]);
  state = deskGradeBatch(state, ["a"], "sound", { gradedBy: "Ingram" });
  assert.ok(state.history[0].batchId, "a batchId must always exist, even unsupplied -- a bare grade must never look like an individual read that happened to touch one item");
});

test("deskUndo: reverses a batch grade, restoring every item to its exact original position in one step", () => {
  let state = createDeskState([item("a"), item("b"), item("c"), item("d")]);
  state = deskGradeBatch(state, ["a", "c"], "sound", { gradedBy: "Ingram" });
  state = deskUndo(state);
  assert.deepEqual(state.items.map((i) => i.id), ["a", "b", "c", "d"]);
});

test("proposeBatches: groups consecutive items matching the SAME rule; a rule-change or a non-match breaks the group", () => {
  const shortRule = { label: "short-and-shallow", predicate: (i) => i.wordCount < 10 };
  const items = [
    item("a", { wordCount: 5 }), item("b", { wordCount: 8 }), // group 1: both match shortRule
    item("c", { wordCount: 50 }), // group 2: matches nothing, own group of one
    item("d", { wordCount: 3 }), item("e", { wordCount: 1 }) // group 3: both match shortRule again, but NOT merged with group 1 across the break
  ];
  const batches = proposeBatches(items, [shortRule]);
  assert.equal(batches.length, 3);
  assert.deepEqual(batches[0].items.map((i) => i.id), ["a", "b"]);
  assert.equal(batches[0].ruleLabel, "short-and-shallow");
  assert.deepEqual(batches[1].items.map((i) => i.id), ["c"]);
  assert.equal(batches[1].ruleLabel, null, "an item matching no rule must be flagged as not-batchable, not silently grouped");
  assert.deepEqual(batches[2].items.map((i) => i.id), ["d", "e"]);
});

test("proposeBatches: the first matching rule wins when more than one could apply", () => {
  const rules = [
    { label: "rule-a", predicate: (i) => i.tag === "both" },
    { label: "rule-b", predicate: (i) => i.tag === "both" || i.tag === "b-only" }
  ];
  const batches = proposeBatches([item("x", { tag: "both" })], rules);
  assert.equal(batches[0].ruleLabel, "rule-a");
});

test("proposeBatches: empty input is safe", () => {
  assert.deepEqual(proposeBatches([], []), []);
});
