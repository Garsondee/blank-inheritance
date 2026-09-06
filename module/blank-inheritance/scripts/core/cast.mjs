/**
 * The cast board — the pure half.
 *
 * The GM's shape is a BOARD: many creatures, one row each, as shallow as a row
 * can be. That is the whole difference from a player's sheet, which is one
 * character deep. Everything here is about ordering and labelling rows; what a
 * row DOES (select the token, roll for it) lives in the adapter.
 */

/** Foundry's own token disposition values. */
export const DISPOSITIONS = Object.freeze({
  SECRET: -2,
  HOSTILE: -1,
  NEUTRAL: 0,
  FRIENDLY: 1
});

const DISPOSITION_NAMES = Object.freeze({
  [DISPOSITIONS.SECRET]: "secret",
  [DISPOSITIONS.HOSTILE]: "hostile",
  [DISPOSITIONS.NEUTRAL]: "neutral",
  [DISPOSITIONS.FRIENDLY]: "friendly"
});

/**
 * A disposition's name, for a CSS hook and a tooltip.
 *
 * Unknown values fall back to neutral rather than throwing: disposition is a
 * number on a document a GM can edit by hand, and a board that refuses to
 * render because one token has a strange value is worse than one that shows it
 * plainly.
 */
export function dispositionName(value) {
  return DISPOSITION_NAMES[value] ?? "neutral";
}

/**
 * Order the board: player characters first, then everyone else by name.
 *
 * PCs first because they are the fixed points of a scene — the GM looks for
 * them by position, not by reading. Within each group, name order, because any
 * ordering that changes on its own (initiative, HP, recency) makes the row you
 * want move while you are reaching for it.
 *
 * `hidden` rows are kept, not dropped: this board is GM-only, and a hidden
 * token the GM cannot see on their own board is a trap. It is flagged instead.
 */
export function buildCast(entries = []) {
  const rows = entries.map((entry) => ({
    id: entry.id,
    name: entry.name || "—",
    isPC: !!entry.isPC,
    hidden: !!entry.hidden,
    selected: !!entry.selected,
    disposition: dispositionName(entry.disposition),
    hasActor: !!entry.hasActor
  }));

  return rows.sort((a, b) => {
    if (a.isPC !== b.isPC) return a.isPC ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * A one-line summary for the zone's legend: how many, and how many are the
 * party. Counting is the kind of thing a GM does constantly and a computer
 * should never make them do.
 */
export function castSummary(rows = []) {
  const players = rows.filter((row) => row.isPC).length;
  return { total: rows.length, players, others: rows.length - players };
}
