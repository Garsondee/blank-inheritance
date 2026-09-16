/**
 * Pure logic for review-harvest.mjs — picking which day to report on, and
 * formatting design/harvest-inference.md's output for a human to actually
 * read. Kept separate from the CLI entry point for the same reason
 * checksums.mjs/local-hash.mjs are separate from the sync scripts that call
 * them: this is real logic, worth testing on its own, with no filesystem or
 * network dependency to fake.
 */

/**
 * Every date this repo's harvest actually has session-log or chat-export
 * data for, newest first — derived from whatever files exist, not assumed.
 * `sessionDates`/`chatDates` are plain YYYY-MM-DD arrays (the CLI layer
 * reads the directory listing; this only merges and sorts).
 */
export function availableDates(sessionDates = [], chatDates = []) {
  return [...new Set([...sessionDates, ...chatDates])].sort().reverse();
}

/** The date review-harvest.mjs should report on when none is given explicitly: the single most recent one with any data at all. */
export function defaultDate(sessionDates = [], chatDates = []) {
  return availableDates(sessionDates, chatDates)[0] ?? null;
}

function formatCandidateLine(candidate, index) {
  const when = candidate.at ? candidate.at.slice(11, 16) : "--:--";
  const prefix = index != null ? `${index}. ` : "";
  return `${prefix}[${when}] ${candidate.summary}`;
}

/**
 * The whole human-readable report for one day's inferSession() result.
 * Two sections on purpose, matching harvest-inference.md's own split:
 * what's already resolved (nothing to do), and the disambiguation batch
 * (a short numbered list, meant to be answerable in one line each).
 */
export function formatReport({ date, highConfidence = [], batch = [] }) {
  const lines = [];
  lines.push(`Harvest inference — ${date ?? "(no date)"}`);
  lines.push("");

  lines.push(`RESOLVED (${highConfidence.length}) — already high-confidence, nothing to do:`);
  if (highConfidence.length === 0) {
    lines.push("  (none)");
  } else {
    for (const candidate of highConfidence) lines.push(`  ${formatCandidateLine(candidate)}`);
  }
  lines.push("");

  lines.push(`NEEDS A LOOK (${batch.length}) — answer in one line each, once, after the session:`);
  if (batch.length === 0) {
    lines.push("  (none -- nothing ambiguous today)");
  } else {
    batch.forEach((candidate, i) => lines.push(`  ${formatCandidateLine(candidate, i + 1)}`));
  }

  return lines.join("\n");
}
