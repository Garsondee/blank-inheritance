/**
 * The deck — the command bar rebuilt as ONE mounted instrument panel, after
 * the UI north star (design/visual-identity.md, "The deck"). This is the pure
 * half: how big the panel is allowed to be, and how bounded content is cut to
 * fit fixed hardware slots. foundry/deck.mjs measures the real window and
 * passes plain numbers in; nothing here touches a Foundry global or the DOM.
 *
 * The rule every function here serves: NOTHING ON THE DECK SCROLLS. A module
 * is a fixed physical face with a fixed number of keys, so anything unbounded
 * (lores, downtime offers, strikes, a scene's cast) is either paged with
 * hardware buttons or stepped through with a rotary selector — never a
 * scrollbar.
 */

/**
 * The panel's authored size, in unscaled CSS pixels. bi-tokens.css mirrors
 * every number here (--bi-deck-width, --bi-deck-height, --bi-deck-crown) and
 * test/tier3-theme-contract.test.mjs fails if the two ever disagree, because
 * a scale computed from one size and applied to a panel drawn at another is a
 * panel that either clips or floats.
 *
 * `crown` is how far the central instrument's collar rises above the
 * faceplate's top edge — the one part of the deck that breaks its own line.
 */
export const DECK_REFERENCE = Object.freeze({
  width: 1440,
  faceplate: 196,
  crown: 120
});

const round = (n, places = 2) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * How large the deck may be drawn, and where.
 *
 * The panel scales as ONE object (uniformly, like a photograph of hardware)
 * rather than reflowing, because reflow is exactly what broke symmetry and
 * forced scrollbars on the old bar. Two limits, whichever bites first:
 *   - width: it must fit between whatever Foundry has claimed on the left
 *     (the roster, the scene runner) and the right (an open sidebar);
 *   - height: the panel plus its rising instrument may take at most
 *     `heightBudget` of the window, so the scene stays the scene.
 *
 * `crownHeight` is the full vertical footprint including the rising
 * instrument, which is what everything positioned above the deck (Foundry's
 * hotbar, the stage, the scene runner) has to clear.
 */
export function deckFit({
  viewportWidth,
  viewportHeight,
  leftReserve = 0,
  rightReserve = 0,
  margin = 16,
  heightBudget = 0.3,
  minScale = 0.5,
  maxScale = 2,
  reference = DECK_REFERENCE
} = {}) {
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) {
    throw new Error(`deckFit: viewport must be positive, got ${viewportWidth}x${viewportHeight}`);
  }
  const available = Math.max(0, viewportWidth - Math.max(0, leftReserve) - Math.max(0, rightReserve) - 2 * margin);
  const byWidth = available / reference.width;
  const byHeight = (viewportHeight * heightBudget) / (reference.faceplate + reference.crown);
  const scale = clamp(Math.min(byWidth, byHeight), minScale, maxScale);
  const width = reference.width * scale;
  const centre = Math.max(0, leftReserve) + margin + available / 2;
  return {
    scale: round(scale, 4),
    width: round(width),
    left: round(Math.max(0, centre - width / 2)),
    faceplateHeight: round(reference.faceplate * scale),
    crownHeight: round((reference.faceplate + reference.crown) * scale)
  };
}

/**
 * A point on a dial face, for a viewBox of `size` units: degrees measured
 * from straight up, clockwise — the same convention core/day-ring.mjs's arc
 * slices and core/vu-meter.mjs's scale already use, so a glyph placed with
 * this lands on the arc it labels.
 */
export function dialPoint(deg, radius, size = 100) {
  const c = size / 2;
  const rad = (Number(deg) * Math.PI) / 180;
  return { x: round(c + radius * Math.sin(rad)), y: round(c - radius * Math.cos(rad)) };
}

/**
 * An open circular arc as SVG path data, for text engraved along a curve.
 * Clockwise from `fromDeg` to `toDeg` (same angle convention as dialPoint), so
 * text on an arc across the top reads left to right. A sweep of 180 degrees or
 * more sets the large-arc flag; a zero or negative sweep is refused, because
 * it would draw nothing and the text on it would silently vanish.
 */
export function arcPath(radius, fromDeg, toDeg, size = 100) {
  if (!(radius > 0)) throw new Error(`arcPath: radius must be positive, got ${radius}`);
  if (!(toDeg > fromDeg)) throw new Error(`arcPath: toDeg must be greater than fromDeg, got ${fromDeg}..${toDeg}`);
  const a = dialPoint(fromDeg, radius, size);
  const b = dialPoint(toDeg, radius, size);
  const large = toDeg - fromDeg >= 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
}

/**
 * The leading modifier of an sf2e strike variant label, for a key too small
 * to hold the whole thing: "+1 (MAP -4)" reads "+1". The full label still
 * goes to the central instrument's readout, so nothing is lost — it is only
 * moved to where there is room for it.
 */
export function variantShort(label) {
  const match = /^\s*([+\-−–]\s*\d+)/.exec(String(label ?? ""));
  return match ? match[1].replace(/[−–]/, "-").replace(/\s+/g, "") : String(label ?? "").trim().slice(0, 4);
}

/**
 * A lore's name as its selector's screen shows it: without the trailing
 * "Lore", which the cell's own legend already says. "Zon-Shelyn Lore" reads
 * "Zon-Shelyn". The full name still goes to the central instrument's readout.
 */
export function loreDisplayName(label) {
  const text = String(label ?? "").trim();
  const trimmed = text.replace(/\s+Lore$/i, "").trim();
  return trimmed || text;
}

/**
 * A row of indicator lamps: `total` of them, the first `lit` lit. Hero points,
 * slices left in a quarter — anything counted in whole units small enough to
 * see at a glance. Clamped both ways, so a bad count draws a sane row rather
 * than an exception or a thousand lamps.
 */
export const MAX_LAMPS = 10;

export function lampRow(lit, total) {
  const count = Math.max(0, Math.min(MAX_LAMPS, Math.floor(Number(total) || 0)));
  const on = Math.max(0, Math.min(count, Math.floor(Number(lit) || 0)));
  return Array.from({ length: count }, (_, i) => i < on);
}

/** The fixed number of skill keys on each inner module — three rows of three. */
export const SKILL_SLOTS_PER_SIDE = 9;

/**
 * Cut a character's checks onto the deck's two symmetric key banks.
 *
 * Input is foundry/sheet-data.mjs#sheetSkillGroups's output (checkGroupsFor's
 * own grouping, enriched with the real modifier), which already sorts the
 * eighteen fixed skills by label — so an even split lands A–M on the left and
 * N–T on the right, a boundary a player learns once. Defences flank the
 * central instrument, Perception and Fortitude on the left, Reflex and Will on
 * the right. Lores are unbounded, so they never get keys at all: they go to a
 * rotary selector (see selectorState).
 *
 * Each bank is padded to exactly SKILL_SLOTS_PER_SIDE with nulls, so a
 * creature with fewer skills renders blank caps in the same places rather
 * than a bank that changes shape per token.
 */
export function splitChecks(groups = []) {
  const skills = groups.find((g) => g.id === "skills")?.entries ?? [];
  const defences = groups.find((g) => g.id === "defences")?.entries ?? [];
  const fixed = skills.filter((entry) => !entry.lore);
  const lores = skills.filter((entry) => entry.lore);
  const half = Math.ceil(fixed.length / 2);
  const pad = (list) => {
    const trimmed = list.slice(0, SKILL_SLOTS_PER_SIDE);
    return [...trimmed, ...Array(SKILL_SLOTS_PER_SIDE - trimmed.length).fill(null)];
  };
  const defence = (slug) => defences.find((d) => d.slug === slug) ?? null;
  return {
    left: { skills: pad(fixed.slice(0, half)), defences: [defence("perception"), defence("fortitude")] },
    right: { skills: pad(fixed.slice(half)), defences: [defence("reflex"), defence("will")] },
    lores
  };
}

/**
 * One page of a bounded list, for modules that page with hardware keys
 * instead of scrolling. `slots` is always exactly `perPage` long (nulls
 * pad the last page) so a module keeps its physical rows whether the page
 * is full or not. An out-of-range page clamps rather than throwing — a
 * stale page index after the list shrinks is a nuisance, not an error.
 */
export function pageOf(items = [], page = 0, perPage = 5) {
  if (!Number.isInteger(perPage) || perPage < 1) {
    throw new Error(`pageOf: perPage must be a positive integer, got ${perPage}`);
  }
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = clamp(Number.isInteger(page) ? page : 0, 0, pages - 1);
  const slice = items.slice(current * perPage, (current + 1) * perPage);
  return {
    page: current,
    pages,
    items: slice,
    slots: [...slice, ...Array(perPage - slice.length).fill(null)],
    hasPrev: current > 0,
    hasNext: current < pages - 1,
    label: `${current + 1}/${pages}`
  };
}

/**
 * A rotary selector: a detented knob stepping through a bounded list.
 *
 * Detents are spread evenly across the knob art's own sweep (the Kit 1
 * filmstrips turn 270 degrees, frame 0 at seven-thirty to frame 127 at
 * four-thirty), and the pointer's filmstrip frame is computed from the SAME
 * detent so the printed position dots and the rendered pointer can never
 * disagree. End stops clamp, like a real selector — no wrap from the last
 * position back to the first.
 */
export function selectorState(options = [], index = 0, { sweep = 270, frames = 128 } = {}) {
  const count = options.length;
  if (count === 0) {
    return { count: 0, index: 0, selected: null, frame: Math.round((frames - 1) / 2), deg: 0, positions: [], atStart: true, atEnd: true };
  }
  const i = clamp(Number.isInteger(index) ? index : 0, 0, count - 1);
  const start = -sweep / 2;
  const step = count > 1 ? sweep / (count - 1) : 0;
  const positions = options.map((_, n) => ({ n, deg: round(count > 1 ? start + n * step : 0), active: n === i }));
  const frame = count > 1 ? Math.round((i / (count - 1)) * (frames - 1)) : Math.round((frames - 1) / 2);
  return {
    count,
    index: i,
    selected: options[i],
    frame,
    deg: positions[i].deg,
    positions,
    atStart: i === 0,
    atEnd: i === count - 1
  };
}
