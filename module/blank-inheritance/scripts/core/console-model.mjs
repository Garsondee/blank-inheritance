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
 *      REFINED 2026-09-06, after the rule was read too strictly: that is
 *      about layout and information density, NOT about capability. Both
 *      seats carry `checks`, because a GM rolls constantly. What differs
 *      is WHOSE checks they are -- a player's are their own character's,
 *      a GM's belong to whatever is selected on the board. Same zone,
 *      board logic. See scripts/foundry/rolls.mjs#actorForSeat.
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

/**
 * The three render parts of the deck, left to right. Each side track holds
 * two modules (outer then inner on the left, inner then outer on the right),
 * so the five physical modules read symmetrically around the instrument.
 */
export const TRACKS = Object.freeze(["left", "instrument", "right"]);

export const SEAT_LIST = Object.freeze(Object.values(SEATS));
export const MODE_LIST = Object.freeze(Object.values(MODES));

/**
 * The zones, per seat, in render order within their track — and, since the
 * 2026-09-17 rebuild into one mounted panel (design/visual-identity.md, "The
 * deck"), in PHYSICAL order: the left track is [outer module, inner module],
 * the right track is [inner module, outer module], so the five modules read
 * outer | inner | instrument | inner | outer and every seat is symmetric in
 * its ratios by construction.
 *
 * `partials` maps each mode to a content variant. A mode may swap what a
 * module shows (the player's selectors read downtime offers in theatre of the
 * mind and strikes in a fight — downtime is not a fourth mode, it is theatre
 * of the mind at city scale, and time in a fight is rounds), but it never
 * moves a module or removes one: a panel whose keys change places between
 * scenes is a panel nobody can learn by hand. A `null` variant sheds the
 * module's face while its slot stays.
 *
 * The two seats share the checks banks and the instrument (a GM rolls
 * constantly — for whatever is selected on the board) and differ on the
 * outer modules: a player's are a sheet (who I am, what I can choose), a
 * GM's are a board (who is here, what just happened).
 */
const EVERY_MODE = (partial) => Object.freeze({ theatre: partial, personnel: partial, frame: partial });

const ZONE_TABLE = Object.freeze({
  [SEATS.PLAYER]: Object.freeze([
    Object.freeze({ id: "ident", track: "left", slot: "outer", partials: EVERY_MODE("ident"), labelKey: "BLANKINHERITANCE.Console.Zone.Ident" }),
    Object.freeze({ id: "checks-left", track: "left", slot: "inner", partials: EVERY_MODE("checks"), labelKey: "BLANKINHERITANCE.Console.Zone.Checks" }),
    Object.freeze({ id: "orb", track: "instrument", slot: "spine", partials: EVERY_MODE("orb"), labelKey: "BLANKINHERITANCE.Console.Zone.Orb" }),
    Object.freeze({ id: "checks-right", track: "right", slot: "inner", partials: EVERY_MODE("checks"), labelKey: "BLANKINHERITANCE.Console.Zone.Checks" }),
    Object.freeze({
      id: "selectors",
      track: "right",
      slot: "outer",
      partials: Object.freeze({ theatre: "downtime", personnel: "strikes", frame: "strikes" }),
      labelKey: "BLANKINHERITANCE.Console.Zone.Selectors"
    })
  ]),
  [SEATS.DIRECTOR]: Object.freeze([
    Object.freeze({ id: "cast", track: "left", slot: "outer", partials: EVERY_MODE("cast"), labelKey: "BLANKINHERITANCE.Console.Zone.Cast" }),
    Object.freeze({ id: "checks-left", track: "left", slot: "inner", partials: EVERY_MODE("checks"), labelKey: "BLANKINHERITANCE.Console.Zone.Checks" }),
    Object.freeze({ id: "orb", track: "instrument", slot: "spine", partials: EVERY_MODE("orb"), labelKey: "BLANKINHERITANCE.Console.Zone.Orb" }),
    Object.freeze({ id: "checks-right", track: "right", slot: "inner", partials: EVERY_MODE("checks"), labelKey: "BLANKINHERITANCE.Console.Zone.Checks" }),
    Object.freeze({ id: "director", track: "right", slot: "outer", partials: EVERY_MODE("director"), labelKey: "BLANKINHERITANCE.Console.Zone.Director" })
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

  return rows.map(({ id, track, slot, partials, labelKey }) => {
    const partial = partials[mode] ?? null;
    return { id, track, slot, labelKey, partial, hidden: partial === null };
  });
}

/**
 * The full render context for the deck: zones grouped into their tracks,
 * each track knowing whether it is entirely empty.
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
