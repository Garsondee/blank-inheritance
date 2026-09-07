/**
 * The day ring — the pure half.
 *
 * Downtime in this campaign is a SCHEDULING GAME (design/ux-doctrine.md §3,
 * §7a): the in-fiction day has four quarters, each carrying one discretionary
 * slice, and more things are on offer than there are slices to spend on them.
 * That gap is the entire engine of downtime play, so the instrument that shows
 * it sits at the centre of the console in theatre of the mind.
 *
 * Ingram's ruling, and the reason this is not a fourth mode: *"Downtime
 * scheduling is part of 'theatre of the mind' just done from an overview map
 * of the whole city. It's not a fourth mode but the time segment display
 * should only be visible in theatre of the mind mode."* In a fight, time is
 * rounds, and a quarter-of-the-day dial there would be noise. That shedding is
 * already encoded in core/console-model.mjs's `theatreOnly` flag; this file is
 * only what the instrument knows.
 *
 * Everything here is arithmetic and geometry with no Foundry and no DOM, so
 * the ring's shape is unit-testable rather than something only a browser can
 * check (design/testing-strategy.md §1).
 */

/**
 * The four quarters, in order, starting at dawn.
 *
 * `school` is not decoration: data/campaign/config.json's timeEconomy says
 * school occupies "morning + afternoon only", which makes the back half of the
 * day the part that is actually contested. The ring should be able to show
 * that difference without every caller re-deriving it.
 */
export const QUARTERS = Object.freeze([
  Object.freeze({ id: "morning", school: true, labelKey: "BLANKINHERITANCE.Console.Quarter.Morning" }),
  Object.freeze({ id: "afternoon", school: true, labelKey: "BLANKINHERITANCE.Console.Quarter.Afternoon" }),
  Object.freeze({ id: "evening", school: false, labelKey: "BLANKINHERITANCE.Console.Quarter.Evening" }),
  Object.freeze({ id: "night", school: false, labelKey: "BLANKINHERITANCE.Console.Quarter.Night" })
]);

export const QUARTER_IDS = Object.freeze(QUARTERS.map((q) => q.id));

/** One discretionary slice per quarter — config.json's `discretionarySlicesPerDay: 4`. */
export const SLICES_PER_QUARTER = 1;

/** -1 for anything unrecognised, so a caller can tell "not a quarter" from "the first one". */
export function quarterIndex(id) {
  return QUARTER_IDS.indexOf(id);
}

export function quarterAt(index) {
  return QUARTERS[((index % QUARTERS.length) + QUARTERS.length) % QUARTERS.length];
}

/**
 * A stored moment, made safe to render.
 *
 * Anything unrecognised degrades to Day 1, morning, rather than throwing: this
 * reads a world setting a GM can edit by hand and that an older module version
 * may have written, and a console refusing to draw because the clock is
 * malformed is worse than one showing the start of the campaign.
 */
export function normalizeMoment(moment) {
  const rawDay = Number(moment?.day);
  const day = Number.isFinite(rawDay) ? Math.max(1, Math.floor(rawDay)) : 1;
  const quarter = QUARTER_IDS.includes(moment?.quarter) ? moment.quarter : QUARTER_IDS[0];
  return { day, quarter };
}

/**
 * Move the clock forward. Night rolls over into the next day's morning.
 *
 * `steps` may exceed four — advancing six quarters from Day 2 evening is a
 * legitimate thing to do when a stretch of days passes off-screen, and it
 * should land on Day 4 afternoon rather than needing six separate calls.
 *
 * Negative steps are REJECTED rather than silently reversed: the ceremony this
 * drives (the transition banner, expiring offers, spent slices) is not
 * reversible, so a caller asking to rewind has a bug, not an intention.
 */
export function advance(moment, steps = 1) {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new Error(`advance: steps must be a non-negative integer, got ${steps}`);
  }
  const { day, quarter } = normalizeMoment(moment);
  const absolute = (day - 1) * QUARTERS.length + quarterIndex(quarter) + steps;
  return {
    day: Math.floor(absolute / QUARTERS.length) + 1,
    quarter: QUARTER_IDS[absolute % QUARTERS.length]
  };
}

/** Whether moving from `before` to `after` crossed midnight. Drives the louder ceremony. */
export function isNewDay(before, after) {
  return normalizeMoment(after).day > normalizeMoment(before).day;
}

/** A stable key for one quarter of one day — the address commitments are filed under. */
export function momentKey(moment) {
  const { day, quarter } = normalizeMoment(moment);
  return `d${day}:${quarter}`;
}

/* ---------------------------------------------------------------------- */
/*  Geometry                                                               */
/* ---------------------------------------------------------------------- */

/** Polar to cartesian with 0° at twelve o'clock, increasing clockwise. */
function pointOn(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const round = (n) => Math.round(n * 100) / 100;

/**
 * The ring's arc segments, as SVG path data.
 *
 * Computed here rather than hand-written into the template for two reasons: a
 * template cannot be unit-tested, and the ring has to survive changes to its
 * own size. The instrument berth is content-sized now (see bi-components.css),
 * which means the ring DECLARES the width of the centre track — a hardcoded
 * path would silently stop matching its own box the first time that size moved.
 *
 * Morning starts at twelve o'clock and the day runs clockwise, which is the
 * only arrangement a table reads without being told.
 *
 * @returns {Array<{id: string, index: number, d: string, midDeg: number, school: boolean}>}
 */
export function ringSlices({ size = 100, thickness = 18, gapDeg = 5 } = {}) {
  if (!(size > 0)) throw new Error(`ringSlices: size must be positive, got ${size}`);
  if (!(thickness > 0 && thickness < size / 2)) {
    throw new Error(`ringSlices: thickness must be above 0 and below half of size (${size / 2}), got ${thickness}`);
  }
  const span = 360 / QUARTERS.length;
  if (!(gapDeg >= 0 && gapDeg < span)) {
    throw new Error(`ringSlices: gapDeg must be at least 0 and below ${span}, got ${gapDeg}`);
  }

  const c = size / 2;
  const rOuter = c;
  const rInner = c - thickness;

  return QUARTERS.map((quarter, index) => {
    const start = index * span + gapDeg / 2;
    const end = (index + 1) * span - gapDeg / 2;
    const o1 = pointOn(c, c, rOuter, start);
    const o2 = pointOn(c, c, rOuter, end);
    const i2 = pointOn(c, c, rInner, end);
    const i1 = pointOn(c, c, rInner, start);
    // A four-quarter ring always sweeps the short way round, so large-arc is
    // always 0 — but it is computed rather than hardcoded, because a ring with
    // two segments would need it and the failure mode (an arc bulging the
    // wrong way round the circle) is baffling to debug from the rendered SVG.
    const large = end - start > 180 ? 1 : 0;
    const d = [
      `M ${round(o1.x)} ${round(o1.y)}`,
      `A ${round(rOuter)} ${round(rOuter)} 0 ${large} 1 ${round(o2.x)} ${round(o2.y)}`,
      `L ${round(i2.x)} ${round(i2.y)}`,
      `A ${round(rInner)} ${round(rInner)} 0 ${large} 0 ${round(i1.x)} ${round(i1.y)}`,
      "Z"
    ].join(" ");
    return { id: quarter.id, index, d, midDeg: (start + end) / 2, school: quarter.school };
  });
}

/**
 * Everything the ring template needs for one moment: the slices, each already
 * marked past / current / future, plus the readout for the middle.
 *
 * "Past" is only ever within the current day. The ring is a day, not a
 * timeline — yesterday's evening is not shown as spent, it is simply gone.
 */
export function ringState(moment, geometry = undefined) {
  const { day, quarter } = normalizeMoment(moment);
  const current = quarterIndex(quarter);
  const slices = ringSlices(geometry).map((slice) => ({
    ...slice,
    state: slice.index < current ? "past" : slice.index === current ? "current" : "future"
  }));
  return {
    day,
    quarter,
    currentIndex: current,
    slices,
    quarterLabelKey: quarterAt(current).labelKey,
    school: quarterAt(current).school
  };
}
