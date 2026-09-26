/**
 * The demo mode — pure logic only.
 *
 * Per ideas/entries/ui-demo-walkthrough-system.json: a demo is a named,
 * ordered list of steps, each pairing a narrated line (what a GM or player is
 * doing and why) with a real action against the real live module — never
 * mocked. "Anything which breaks should break during the demo, because we
 * always run real commands on the real server to prove our process is a good
 * one that works" (Ingram, verbatim).
 *
 * This file owns only the SHAPE of that walk — which step is current, can it
 * advance, can it go back — never the actions themselves. A step's `run()`
 * touches Foundry; nothing here does, so the walk itself is testable without
 * a browser the same way every other core/ file in this module is.
 */

/**
 * Where one demo run currently stands. GM-paced (design/ux-doctrine.md's own
 * "artistic judgement is never automated" reasoning, and the idea entry's
 * own open question leaned this way): advancing is always a deliberate call,
 * never a timer.
 */
export function demoState(steps = [], index = 0) {
  const count = steps.length;
  const clamped = Math.max(0, Math.min(count - 1, Number.isInteger(index) ? index : 0));
  return {
    index: clamped,
    count,
    step: steps[clamped] ?? null,
    isFirst: clamped === 0,
    isLast: clamped >= count - 1,
    progress: count > 0 ? `${clamped + 1}/${count}` : "0/0"
  };
}

/** One step forward, clamped at the last step — a demo does not wrap. */
export function advanceDemo(steps, index) {
  return demoState(steps, index + 1).index;
}

/** One step back, clamped at the first — never negative. */
export function retreatDemo(steps, index) {
  return demoState(steps, index - 1).index;
}

/**
 * Every demo definition must have this shape. Not enforced by a schema (this
 * project's data/schema/ convention is for campaign content, not UI code),
 * but checked here so a malformed demo fails at registration instead of
 * halfway through a run in front of the table.
 */
export function validateDemo(demo) {
  const problems = [];
  if (!demo?.id) problems.push("missing id");
  if (!demo?.titleKey) problems.push("missing titleKey");
  if (!demo?.seat) problems.push("missing seat");
  if (!Array.isArray(demo?.steps) || demo.steps.length === 0) problems.push("no steps");
  for (const [i, step] of (demo?.steps ?? []).entries()) {
    if (!step?.id) problems.push(`step ${i}: missing id`);
    if (!step?.narrationKey) problems.push(`step ${i}: missing narrationKey`);
    if (typeof step?.run !== "function") problems.push(`step ${i} (${step?.id ?? i}): missing run()`);
  }
  return problems;
}
