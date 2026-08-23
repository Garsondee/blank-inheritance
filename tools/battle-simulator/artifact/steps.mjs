/**
 * Flattens one run's battle log into a linear step sequence for the replay
 * scrubber: deployment, then one step per turn, then the outcome. Extracted
 * out of template.html's inline script (design doc §15m) so this real,
 * non-trivial logic is covered by node:test instead of only ever being
 * exercised by clicking through the UI — the same pattern geometry.mjs
 * already established for this file.
 */

/** One step per turn (never per action) — deployment first, outcome last. */
export function buildSteps(run) {
  const deploymentSnapshot = run.log.deployment?.snapshot ?? {};
  const out = [{ kind: "deployment", round: 0, snapshot: deploymentSnapshot, scriptedEvents: [] }];
  for (const round of run.log.rounds) {
    round.turns.forEach((turn, i) => {
      out.push({
        kind: "turn",
        round: round.round,
        combatantId: turn.combatantId,
        stunned: !!turn.stunned,
        actions: turn.actions || [],
        actionAccounting: turn.actionAccounting || null,
        effectiveStats: turn.effectiveStats || null,
        snapshot: turn.snapshot,
        scriptedEvents: i === 0 ? round.scriptedEvents : []
      });
    });
  }
  const last = out[out.length - 1];
  out.push({ kind: "outcome", round: last.round, snapshot: last.snapshot, outcome: run.log.outcome });
  return out;
}
