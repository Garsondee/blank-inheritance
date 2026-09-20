/**
 * The Approvals Desk's own queue/grading state machine (design/
 * approvals-desk.md §4/§5, issue #170). Pure: takes the play-sequence set
 * (issue #169) plus a corpus-wide authoring lookup, and manages navigation,
 * grading, undo and batch proposals as plain data -- zero Foundry globals,
 * zero I/O. The Foundry adapter (scripts/foundry/approvals-desk.mjs) owns
 * rendering "in costume" and actually calling promote()/writing files;
 * `sound`/`final` grading here is the real, complete action (this file
 * records intent, the adapter carries it out via promote.mjs). `changes`/
 * `cut` are recorded the same way but their actual file-side consequence
 * (filing a lore-instructions.json entry, etc.) is issue #171's bounce loop
 * -- flagged rather than half-built here.
 */

import { flattenPlaySequenceSet } from "./play-sequence.mjs";

const GRADE_ACTIONS = Object.freeze(["sound", "final", "changes", "cut"]);

/**
 * Flattens play-sequence shifts into the Desk's own navigable queue, adding
 * two annotations design/approvals-desk.md §4 asks every card to carry:
 *
 * - `unblocks`: ids of OTHER queue items whose own `dependsOn` names this
 *   one -- the reverse edge. This is display-only, computed from the same
 *   `dependsOn` data promote() already enforces (issue #168); it is never a
 *   reason something entered the queue (issue #169's own rule).
 * - `blockedBy`: this item's own `dependsOn`, resolved against the full
 *   corpus's current status (not just what's in the queue -- a dependency
 *   might already be sound and simply absent from here).
 */
export function buildDeskQueue(shifts, { allEntitiesById = {} } = {}) {
  const flat = flattenPlaySequenceSet(shifts);

  const unblocksIndex = new Map();
  for (const item of flat) {
    for (const depId of item.authoring?.dependsOn ?? []) {
      if (!unblocksIndex.has(depId)) unblocksIndex.set(depId, []);
      unblocksIndex.get(depId).push(item.id);
    }
  }

  return flat.map((item) => ({
    ...item,
    unblocks: unblocksIndex.get(item.id) ?? [],
    blockedBy: (item.authoring?.dependsOn ?? []).map((depId) => ({
      id: depId,
      status: allEntitiesById[depId]?.authoring?.status ?? "unknown"
    }))
  }));
}

export function createDeskState(items) {
  return { items, index: 0, history: [] };
}

export function deskCurrentItem(state) {
  return state.items[state.index] ?? null;
}

/** J. Clamped, not wrapped -- running off the end of a real queue should feel like finishing it, not looping. */
export function deskNext(state) {
  if (state.items.length === 0) return state;
  return { ...state, index: Math.min(state.index + 1, state.items.length - 1) };
}

/** K. */
export function deskPrev(state) {
  return { ...state, index: Math.max(state.index - 1, 0) };
}

/**
 * S/F/C/X. Grades the CURRENT item and removes it from the queue -- the
 * next item slides into view under the same index, which is the whole point
 * of "one item on screen" (§5): clearing one is what advances you, not a
 * separate navigation step. `note` is required for `changes` (a bounce with
 * no reason isn't a loop, it's a shrug); optional elsewhere.
 */
export function deskGrade(state, action, { note = null, batchId = null, gradedBy } = {}) {
  if (!GRADE_ACTIONS.includes(action)) {
    throw new Error(`deskGrade: "${action}" must be one of ${GRADE_ACTIONS.join("/")}`);
  }
  if (action === "changes" && !note) {
    throw new Error("deskGrade('changes') requires a note -- that's what makes the bounce loop a loop, not just a rejection");
  }
  const item = deskCurrentItem(state);
  if (!item) return state;

  const remaining = state.items.filter((_, i) => i !== state.index);
  const historyEntry = { kind: "single", item, index: state.index, action, note, batchId, gradedBy };
  return {
    items: remaining,
    index: Math.min(state.index, Math.max(remaining.length - 1, 0)),
    history: [...state.history, historyEntry]
  };
}

/**
 * A machine-proposed batch, approved as one gesture (§5: "recorded as a
 * batch," not indistinguishable from N individual reads). `itemIds` must
 * all still be present in the queue; grading a batch that includes an item
 * someone already actioned individually is refused rather than silently
 * partially applied.
 */
export function deskGradeBatch(state, itemIds, action, { note = null, gradedBy, batchId } = {}) {
  if (!GRADE_ACTIONS.includes(action)) {
    throw new Error(`deskGradeBatch: "${action}" must be one of ${GRADE_ACTIONS.join("/")}`);
  }
  if (itemIds.length === 0) throw new Error("deskGradeBatch: itemIds must not be empty");
  const idSet = new Set(itemIds);
  const indices = [];
  const graded = [];
  state.items.forEach((it, i) => {
    if (idSet.has(it.id)) {
      indices.push(i);
      graded.push(it);
    }
  });
  if (graded.length !== itemIds.length) {
    throw new Error("deskGradeBatch: one or more ids are not currently in the queue");
  }

  const remaining = state.items.filter((it) => !idSet.has(it.id));
  const resolvedBatchId = batchId ?? `batch-${new Date().toISOString()}`;
  const historyEntry = { kind: "batch", items: graded, indices, action, note, batchId: resolvedBatchId, gradedBy };
  return {
    items: remaining,
    index: Math.min(state.index, Math.max(remaining.length - 1, 0)),
    history: [...state.history, historyEntry]
  };
}

/** U. Reverses the single most recent grade or batch grade, restoring every item to its exact original position. */
export function deskUndo(state) {
  if (state.history.length === 0) return state;
  const last = state.history[state.history.length - 1];
  const items = [...state.items];

  if (last.kind === "batch") {
    const pairs = last.items.map((item, k) => ({ item, index: last.indices[k] })).sort((a, b) => a.index - b.index);
    for (const { item, index } of pairs) items.splice(index, 0, item);
    return { items, index: pairs[0]?.index ?? 0, history: state.history.slice(0, -1) };
  }

  items.splice(last.index, 0, last.item);
  return { items, index: last.index, history: state.history.slice(0, -1) };
}

/**
 * Groups CONSECUTIVE queue items sharing a defensible, caller-supplied
 * property into candidate batches -- never a blind select-all (§5). Each
 * `rule` is `{label, predicate(item) -> boolean}`, checked in order; an item
 * matching no rule starts its own group of one, which the caller should
 * render as "review individually," not force into a batch. Consecutive-only
 * on purpose: a batch is a defensible claim about a run of similar items in
 * the actual review order, not an arbitrary scatter across the queue.
 */
export function proposeBatches(items, rules) {
  const batches = [];
  let current = null;
  for (const item of items) {
    const matchedRule = rules.find((r) => r.predicate(item));
    const label = matchedRule?.label ?? null;
    if (current && current.ruleLabel === label && label !== null) {
      current.items.push(item);
    } else {
      current = { ruleLabel: label, items: [item] };
      batches.push(current);
    }
  }
  return batches;
}
