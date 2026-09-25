/**
 * The induction terminal's step order and navigation rules (design/induction-terminal.md §4). Pure: no
 * Foundry globals. The terminal passes in its own `isComplete(stepId)`, so this file decides only what a
 * player may jump to, never how a page decides it's finished.
 *
 * The rules, from the UI pass of 2026-09-25:
 * - The tracker's numbers are display positions; page ids stay as they were (1-9, plus "agreement").
 * - A step is a link only if the player has already been that far, and every step before it is complete.
 *   So Back is always possible, forward is possible only over finished ground, and nobody can reach
 *   Review past a page they left half-done.
 * - The Service Agreement is never a link: it is seen once, at signing (Ingram, 2026-09-25).
 */
import { resolveSlots } from "./boost-slots.mjs";

export const STEPS = [
  [1, "Orientation"], ["agreement", "Agreement"], [2, "Ancestry"], [3, "Background"], [4, "Class"],
  [5, "Attributes"], [6, "Portrait"], [7, "Finishing"], [8, "Questions"], [9, "Review"]
];

/** The steps a player will actually see, in order: the agreement only when the world setting shows it. */
export function stepOrder({ agreement = false } = {}) {
  return STEPS.filter(([id]) => id !== "agreement" || agreement);
}

/** Whether `target` may be opened directly from `current`, given the furthest step reached so far. */
export function canJumpTo(target, { order, current, furthest, isComplete }) {
  const ids = order.map(([id]) => id);
  const index = ids.indexOf(target);
  const at = ids.indexOf(current);
  const reach = Math.max(at, ids.indexOf(furthest));
  if (index < 0 || index === at || target === "agreement") return false;
  if (index > reach) return false;
  for (let i = 0; i < index; i++) if (!isComplete(ids[i])) return false;
  return true;
}

/** The tracker's view model: one entry per visible step, with display numbers and link state. */
export function trackerSteps({ order, current, furthest, isComplete }) {
  const at = order.findIndex(([id]) => id === current);
  return order.map(([id, label], index) => {
    const isDone = index < at;
    const isCurrent = index === at;
    return {
      id, label, number: index + 1, isDone, isCurrent, isUpcoming: !isDone && !isCurrent,
      canJump: canJumpTo(id, { order, current, furthest, isComplete })
    };
  });
}

/** The later of two steps in display order (for tracking how far a player has got). */
export function laterStep(a, b, order) {
  const ids = order.map(([id]) => id);
  return ids.indexOf(b) > ids.indexOf(a) ? b : a;
}

/** How many free (multi-option) slots are still unpicked. Fixed single-option slots never count. */
export function remainingPicks(slots = [], picks = []) {
  try {
    return resolveSlots(slots, picks).missing.length;
  } catch {
    // An illegal stored pick (a forged value) counts every free slot as still to do.
    return slots.filter((slot) => slot.length > 1).length;
  }
}
