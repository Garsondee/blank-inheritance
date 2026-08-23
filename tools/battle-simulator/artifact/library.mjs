/**
 * Filter/sort logic for the simulation library panel (design doc §15m) —
 * "we need to start organising the simulations into the reader so that we
 * can read them back." Extracted as a real, independently-tested module for
 * the same reason geometry.mjs and steps.mjs are: this is genuine logic
 * (not DOM glue), so it gets real test coverage rather than only ever being
 * exercised by clicking through the UI.
 */

/** Every distinct scenario key present, in first-seen order. */
export function scenarioOptions(runs) {
  const seen = [];
  for (const r of runs) if (!seen.includes(r.scenario)) seen.push(r.scenario);
  return seen;
}

/** Every distinct outcome present, in first-seen order. */
export function outcomeOptions(runs) {
  const seen = [];
  for (const r of runs) if (!seen.includes(r.outcome)) seen.push(r.outcome);
  return seen;
}

/** `scenario`/`outcome` of "" or "all" (or omitted) mean "no filter on this dimension". */
export function filterRuns(runs, { scenario, outcome } = {}) {
  return runs.filter((r) =>
    (!scenario || scenario === "all" || r.scenario === scenario) &&
    (!outcome || outcome === "all" || r.outcome === outcome)
  );
}

export const SORTS = {
  newest: (a, b) => (b.generatedAt || "").localeCompare(a.generatedAt || "") || b.id.localeCompare(a.id),
  oldest: (a, b) => (a.generatedAt || "").localeCompare(b.generatedAt || "") || a.id.localeCompare(b.id),
  scenario: (a, b) => a.scenario.localeCompare(b.scenario) || a.seed - b.seed,
  seed: (a, b) => a.seed - b.seed || a.scenario.localeCompare(b.scenario),
  utilization: (a, b) => (b.utilization ?? 0) - (a.utilization ?? 0),
  rounds: (a, b) => (b.rounds ?? 0) - (a.rounds ?? 0)
};

export function sortRuns(runs, sortKey = "newest") {
  const cmp = SORTS[sortKey] ?? SORTS.newest;
  return [...runs].sort(cmp);
}

/** The one entry point the UI actually calls: filter, then sort. */
export function applyLibraryView(runs, { scenario, outcome, sortKey } = {}) {
  return sortRuns(filterRuns(runs, { scenario, outcome }), sortKey);
}
