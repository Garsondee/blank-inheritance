/**
 * Pure logic for the per-simulation log store (design doc §15m).
 *
 * WHY THIS EXISTS. The old run-scenario.mjs wrote one file, battle-log.json,
 * with `output.runs[scenarioKey]` keyed by scenario name ALONE. Re-running the
 * same scenario at a different seed silently overwrote the previous run rather
 * than accumulating — there was no way to build a library of many simulations,
 * because the store could only ever hold one run per scenario at a time.
 *
 * Keeping the pure indexing logic here, separate from the file-I/O wrapper in
 * run-scenario.mjs, is what makes the fix itself testable: the regression test
 * for "two different seeds of one scenario must both survive" needs no
 * filesystem at all.
 */
import { collectRunMetrics } from "./metrics.mjs";

/** Deterministic, collision-free filename for one (scenario, seed) run. Re-running the SAME pair overwrites its own file on purpose — that's "update this benchmark," not the bug being fixed. */
export function runFileName({ scenario, seed }) {
  return `${scenario}--seed-${seed}.json`;
}

/** The stable identity of a run — scenario + seed together, never scenario alone. */
export function runId({ scenario, seed }) {
  return `${scenario}@${seed}`;
}

/**
 * Build the lightweight index-entry summary for one run, WITHOUT the full
 * battle log — this is what the reader's library view sorts/filters over, kept
 * small on purpose so index.json stays cheap to read even with many runs.
 */
export function buildIndexEntry({ scenario, label, seed, roundLimit, generatedAt, log }) {
  const metrics = collectRunMetrics(log);
  return {
    id: runId({ scenario, seed }),
    scenario,
    label,
    seed,
    roundLimit,
    generatedAt,
    file: runFileName({ scenario, seed }),
    outcome: log.outcome?.result ?? "timeout",
    outcomeDetail: log.outcome?.detail ?? null,
    rounds: (log.rounds ?? []).length,
    utilization: Number(metrics.utilization.toFixed(4)),
    idleTurnRate: Number(metrics.idleTurnRate.toFixed(4)),
    verbDiversity: metrics.verbDiversity,
    illegalProposals: metrics.illegalProposals
  };
}

/**
 * Merge one new entry into an existing index, replacing any prior entry with
 * the SAME id (same scenario+seed — a deliberate re-run updating its own
 * record) and leaving every other id untouched. This one function is the fix:
 * the old scheme had no id narrower than "scenario," so every re-run at a new
 * seed replaced the last one. Sorted newest-first for a merge that is also a
 * stable read order.
 */
export function mergeIndexEntry(index, entry) {
  const withoutOld = index.filter((e) => e.id !== entry.id);
  return [...withoutOld, entry].sort((a, b) => (b.generatedAt || "").localeCompare(a.generatedAt || "") || b.id.localeCompare(a.id));
}

/**
 * Strip fields from a full run record that are pure duplication before it's
 * written to disk / embedded in the artifact — the payload-diet pass (design
 * doc §15m). `initialSnapshot` is byte-identical to `deployment.snapshot`
 * (verified) and `groundLayerLog` is never read by the artifact UI.
 */
export function trimRunPayload(log) {
  // eslint-disable-next-line no-unused-vars
  const { initialSnapshot, ...rest } = log;
  return rest;
}
