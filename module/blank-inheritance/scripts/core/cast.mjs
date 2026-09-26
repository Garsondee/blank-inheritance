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
  const rows = entries.map(castRow);

  return rows.sort((a, b) => {
    if (a.isPC !== b.isPC) return a.isPC ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * A creature's hit points as the board's hairline gauge reads them: how full,
 * and which of four bands. Same thresholds as core/sheet-model.mjs#hpStatus,
 * so the board, the Console and the central instrument never disagree about
 * who is hurt. A creature with no hit points to speak of (a hazard, a prop
 * actor) gets no gauge rather than an empty one that reads as dead.
 */
export function castHp(hp) {
  const max = Number(hp?.max ?? 0);
  if (!(max > 0)) return null;
  const value = Number(hp?.value ?? 0);
  const pct = Math.max(0, Math.min(1, value / max));
  let tier = "ok";
  if (value <= 0) tier = "down";
  else if (pct <= 0.25) tier = "critical";
  else if (pct <= 0.5) tier = "hurt";
  return { pct: Math.round(pct * 100), tier };
}

function castRow(entry) {
  return {
    id: entry.id,
    // The token is what gets selected; the ACTOR is what the Character Card
    // is about. A token is a placement, and social intel belongs to the
    // person, not to where they happen to be standing.
    actorId: entry.actorId ?? null,
    name: entry.name || "—",
    isPC: !!entry.isPC,
    hidden: !!entry.hidden,
    selected: !!entry.selected,
    disposition: dispositionName(entry.disposition),
    hasActor: !!entry.hasActor,
    hp: castHp(entry.hp)
  };
}

/**
 * The board in a fight: the turn order, exactly as the encounter has it.
 *
 * buildCast's own rule — never let a row move on its own — is suspended here
 * on purpose, because in a fight the order IS the information: whose turn it
 * is and who is next is the one thing a GM reads the board for, and it only
 * changes when initiative is rolled. The current combatant is flagged, and
 * each row carries its initiative (null until rolled) and whether it is
 * defeated. `combatants` must already be in turn order (Foundry's own
 * `combat.turns`), which this does not second-guess.
 */
export function buildTurnOrder(combatants = [], currentIndex = -1) {
  return combatants.map((entry, i) => ({
    ...castRow(entry),
    combatantId: entry.combatantId ?? null,
    initiative: Number.isFinite(entry.initiative) ? entry.initiative : null,
    // A string, so a rolled 0 still prints — a template's #if reads 0 as unrolled.
    initiativeLabel: Number.isFinite(entry.initiative) ? String(entry.initiative) : null,
    defeated: !!entry.defeated,
    current: i === currentIndex
  }));
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
