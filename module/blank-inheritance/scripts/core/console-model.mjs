/**
 * The campaign console — the pure half.
 *
 * Decides WHAT is on the bar: which mode we are in, which seat the viewer
 * occupies, and which zones that combination puts on screen. It touches no
 * Foundry global and no DOM, so it runs in plain Node and is unit-tested
 * directly (see design/testing-strategy.md §1). scripts/foundry/command-bar.mjs
 * is the only side that knows any of this ends up in a browser.
 *
 * Two rules from design/ux-doctrine.md are encoded here rather than left to
 * the templates to remember:
 *
 *   1. A player gets a SHEET (one character, deep) and the GM gets a BOARD
 *      (many creatures, one row each). They are different shapes, not the
 *      same shape with more buttons, so they have different zone lists.
 *
 *   2. The zone list for a seat is FIXED. Mode never adds or removes zones,
 *      it only sheds them — because Foundry's ApplicationV2 never REMOVES a
 *      part that disappears from the descriptor set (see the comment on
 *      PARTS in scripts/foundry/command-bar.mjs), so a shed zone has to keep
 *      its slot and render hidden.
 */

/** Who is looking at the bar. There are two shapes and there will not be a third. */
export const SEATS = Object.freeze({
  PLAYER: "player",
  DIRECTOR: "director"
});

/**
 * What kind of scene we are in. Theatre of the mind is everything that is
 * not a fight, from a conversation in one room up to the city overview where
 * players spend their time.
 */
export const MODES = Object.freeze({
  THEATRE: "theatre",
  PERSONNEL: "personnel",
  FRAME: "frame"
});

/** The three grid tracks of .bi-bar, left to right. */
export const TRACKS = Object.freeze(["left", "instrument", "right"]);

export const SEAT_LIST = Object.freeze(Object.values(SEATS));
export const MODE_LIST = Object.freeze(Object.values(MODES));

/**
 * The zones, per seat, in render order within their track.
 *
 * `theatreOnly` is the one mode-dependent property, and it exists because of
 * a specific ruling: downtime scheduling is not a fourth mode, it is theatre
 * of the mind played at city scale — so the day/time instrument and the
 * schedule board belong to that mode and must not appear in a fight, where
 * time is measured in rounds and a quarter-of-the-day dial is noise.
 * Everything else (who I am, what I can roll, the cast, the log) is true in
 * every mode. The log in particular is always on: running the session and
 * recording it are one act.
 */
const ZONE_TABLE = Object.freeze({
  [SEATS.PLAYER]: Object.freeze([
    Object.freeze({ id: "ident", track: "left", partial: "personal", labelKey: "BLANKINHERITANCE.Console.Zone.Ident" }),
    Object.freeze({ id: "dome", track: "instrument", partial: "day-ring", theatreOnly: true, labelKey: "BLANKINHERITANCE.Console.Zone.Dome" }),
    Object.freeze({ id: "checks", track: "right", partial: "skills", labelKey: "BLANKINHERITANCE.Console.Zone.Checks" }),
    Object.freeze({ id: "segment", track: "right", partial: "board", theatreOnly: true, labelKey: "BLANKINHERITANCE.Console.Zone.Segment" })
  ]),
  [SEATS.DIRECTOR]: Object.freeze([
    Object.freeze({ id: "cast", track: "left", partial: "board", labelKey: "BLANKINHERITANCE.Console.Zone.Cast" }),
    Object.freeze({ id: "dome", track: "instrument", partial: "day-ring", theatreOnly: true, labelKey: "BLANKINHERITANCE.Console.Zone.Dome" }),
    Object.freeze({ id: "log", track: "right", partial: "bar", labelKey: "BLANKINHERITANCE.Console.Zone.Log" })
  ])
});

/**
 * Which mode we are in, derived rather than stored.
 *
 * Storing it would mean a second source of truth that can disagree with the
 * combat tracker, and the one thing worse than the wrong mode is a mode that
 * is right on one client and wrong on another. The single exception is the
 * GM override, for "we are technically in initiative but actually talking".
 *
 * An unrecognised scale falls to personnel rather than Frame on purpose:
 * personnel is the pure-SF2E baseline (design/design-layers.md, Layer 0), so
 * an unknown scene degrades toward plain rules rather than toward homebrew.
 */
export function resolveMode({ combatStarted = false, sceneScale = null, gmOverride = null } = {}) {
  if (gmOverride && MODE_LIST.includes(gmOverride)) return gmOverride;
  if (!combatStarted) return MODES.THEATRE;
  return sceneScale === MODES.FRAME ? MODES.FRAME : MODES.PERSONNEL;
}

/** Which seat a viewer occupies. The GM's own characters do not change this. */
export function resolveSeat({ isGM = false } = {}) {
  return isGM ? SEATS.DIRECTOR : SEATS.PLAYER;
}

/**
 * The zones for a mode/seat pair, each already resolved to a content variant
 * or to null. `hidden` and `partial === null` always agree — a zone with
 * nothing to show is a hidden slot, never an empty visible pod.
 */
export function zonesFor(mode, seat) {
  const rows = ZONE_TABLE[seat];
  if (!rows) throw new Error(`Unknown seat "${seat}" — expected one of ${SEAT_LIST.join(", ")}.`);
  if (!MODE_LIST.includes(mode)) throw new Error(`Unknown mode "${mode}" — expected one of ${MODE_LIST.join(", ")}.`);

  return rows.map(({ id, track, partial, labelKey, theatreOnly = false }) => {
    const shed = theatreOnly && mode !== MODES.THEATRE;
    return { id, track, labelKey, partial: shed ? null : partial, hidden: shed };
  });
}

/**
 * The full render context for the bar: zones grouped into their grid tracks,
 * each track knowing whether it is entirely empty.
 *
 * A track that is empty must be hidden rather than merely childless, because
 * the centre track has a fixed width (--bi-dome-size) and would otherwise
 * hold a 252px gap open in the middle of the chassis with nothing in it.
 */
export function consoleLayout(mode, seat) {
  const zones = zonesFor(mode, seat);
  const tracks = {};
  for (const name of TRACKS) {
    const inTrack = zones.filter((zone) => zone.track === name);
    tracks[name] = { zones: inTrack, hidden: inTrack.every((zone) => zone.hidden) };
  }
  return { mode, seat, tracks };
}
