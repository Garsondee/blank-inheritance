/**
 * The plot timeline's axis (design/plot-timeline.md §4, D070): one horizontal strip of eras, each with its own plain
 * linear scale and a labelled break between them, so twenty thousand years ago and one evening of Episode One both
 * get room. No log scale: within an era, equal distances are equal times.
 *
 * Pure: positions in (from timeline-when.mjs), pixels out, and back again. The page and a Foundry window share it.
 */
import { ERAS, eraOf, chapterOneToDays } from "./timeline-eras.mjs";
import { UNIT_DAYS, PRESENT_YEAR, TIME_OF_DAY } from "./timeline-when.mjs";

const Y = UNIT_DAYS.year;

/** Each era's width at zoom 1, in pixels. Screen layout, not story. */
export const ERA_WIDTHS = Object.freeze({
  "deep-past": 180,
  "old-campaign": 320,
  "living-memory": 380,
  "this-spring": 160,
  episodes: 1100,
  ahead: 19 * 190,
});
/** An era with nothing in it collapses to a labelled sliver. */
export const EMPTY_WIDTH = 56;
/** The gap drawn between eras: the break in time. */
export const BREAK = 28;

// Fixed ends: where an era always starts and stops, whatever is in it. Other eras fit their contents.
const FIXED = Object.freeze({
  episodes: { from: -1.1, to: 3 },
  ahead: { from: 2, to: 21 },
});
const MIN_SPAN = Object.freeze({ "deep-past": 500 * Y, "old-campaign": 30 * Y, "living-memory": 8 * Y, "this-spring": 14 });

/** Days-or-chapters value of a position for a given era (chapter 1 dates fall into the episodes' days). */
function valueIn(era, position) {
  if (era.scale === "chapters") return position.at;
  return position.scale === "chapters" ? chapterOneToDays(position.at) : position.at;
}

/**
 * Lay the eras out along the strip around the positions they must hold.
 * @param {Array<object>} positions  every position on the timeline (candidates flattened into their options)
 * @param {{ zoom?: number, eras?: Array<object> }} opts
 */
export function buildAxis(positions, { zoom = 1, eras = ERAS } = {}) {
  const extents = new Map(eras.map((e) => [e.id, null]));
  for (const p of positions) {
    if (!p || p.scale === "candidates") continue;
    const era = eraOf(p, eras);
    if (!era) continue;
    const lo = valueIn(era, { ...p, at: p.from ?? p.at });
    const hi = valueIn(era, { ...p, at: p.to ?? p.at });
    const cur = extents.get(era.id);
    extents.set(era.id, cur ? [Math.min(cur[0], lo, hi), Math.max(cur[1], lo, hi)] : [Math.min(lo, hi), Math.max(lo, hi)]);
  }
  const segments = [];
  let x = 0;
  for (const era of eras) {
    const fixed = FIXED[era.id];
    let from, to, empty = false;
    if (fixed) ({ from, to } = fixed);
    else {
      const ext = extents.get(era.id);
      if (!ext) { empty = true; from = Number.isFinite(era.from) ? era.from : era.to - (MIN_SPAN[era.id] || Y); to = era.to; }
      else {
        const minSpan = MIN_SPAN[era.id] || 1;
        let [lo, hi] = ext;
        if (hi - lo < minSpan) { const mid = (lo + hi) / 2; lo = mid - minSpan / 2; hi = mid + minSpan / 2; }
        const pad = (hi - lo) * 0.06;
        from = lo - pad;
        to = hi + pad;
        if (Number.isFinite(era.from)) from = Math.max(from, era.from);
        if (Number.isFinite(era.to)) to = Math.min(to, era.to);
        if (to <= from) to = from + minSpan;
      }
    }
    const width = (empty ? EMPTY_WIDTH : ERA_WIDTHS[era.id] || 300) * (empty ? 1 : zoom);
    segments.push({ era, id: era.id, label: era.label, unit: era.unit, scale: era.scale, from, to, x0: x, x1: x + width, empty });
    x += width + BREAK;
  }
  const width = x - BREAK;

  // A position that came from fromX carries its era, so a value on an era's very edge maps back to the same era.
  const segmentFor = (position) => {
    if (position.era) return segments.find((s) => s.id === position.era) || null;
    const era = eraOf(position, eras);
    return era ? segments.find((s) => s.id === era.id) : null;
  };
  /** Pixels from the strip's left edge for a single value position. */
  const toX = (position, which = "at") => {
    const seg = segmentFor(position);
    if (!seg) return null;
    const v = valueIn(seg, { ...position, at: position[which] ?? position.at });
    const t = (v - seg.from) / (seg.to - seg.from);
    return seg.x0 + Math.min(1, Math.max(0, t)) * (seg.x1 - seg.x0);
  };
  /** The position under a pixel, in its era's own scale; null in a break between eras. */
  const fromX = (px) => {
    const seg = segments.find((s) => px >= s.x0 && px <= s.x1);
    if (!seg || seg.empty) return null;
    const at = seg.from + ((px - seg.x0) / (seg.x1 - seg.x0)) * (seg.to - seg.from);
    return { scale: seg.scale, at, era: seg.id };
  };
  return { segments, width, toX, fromX, zoom, ticks: () => segments.flatMap((s) => ticksFor(s)) };
}

const NICE = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
function niceStep(span, px, minGap = 80) {
  const want = (span * minGap) / Math.max(1, px);
  return NICE.find((n) => n >= want) || NICE[NICE.length - 1];
}
const yearsLabel = (days) => {
  const year = PRESENT_YEAR + Math.round(days / Y);
  return year >= 1 ? `${year} AR` : `${Math.round(-days / Y).toLocaleString("en-GB")} years ago`;
};

/** The tick marks and labels for one era: years, weeks, days and times of day, or chapters. */
export function ticksFor(seg) {
  if (seg.empty) return [];
  const px = seg.x1 - seg.x0;
  const out = [];
  const at = (v) => seg.x0 + ((v - seg.from) / (seg.to - seg.from)) * px;
  if (seg.scale === "chapters") {
    for (let c = Math.ceil(seg.from); c < seg.to; c++) out.push({ x: at(c), label: `Ch ${c}`, major: true, value: c });
    return out;
  }
  if (seg.unit === "years") {
    const spanYears = (seg.to - seg.from) / Y;
    const step = niceStep(spanYears, px);
    const first = Math.ceil(seg.from / Y / step) * step;
    for (let yr = first; yr * Y <= seg.to; yr += step) out.push({ x: at(yr * Y), label: yearsLabel(yr * Y), major: true, value: yr * Y });
    return out;
  }
  if (seg.unit === "weeks") {
    for (let d = Math.ceil(seg.from / 7) * 7; d <= seg.to; d += 7) out.push({ x: at(d), label: d === 0 ? "Day 1" : `${Math.round(-d / 7)} wk before`, major: true, value: d });
    return out;
  }
  // days: each day is major, each time of day a minor tick
  for (let d = Math.ceil(seg.from); d < seg.to; d++) {
    out.push({ x: at(d), label: `Day ${d + 1}`, major: true, value: d });
    if (px / (seg.to - seg.from) > 120) {
      for (const [word, frac] of Object.entries(TIME_OF_DAY)) {
        if (d + frac <= seg.to) out.push({ x: at(d + frac), label: word, major: false, value: d + frac });
      }
    }
  }
  return out;
}
