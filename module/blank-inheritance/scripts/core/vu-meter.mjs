/**
 * The printed scale of an orange VU meter — pure geometry.
 *
 * The north star's centrepiece is an amber-lit VU meter: a black arc of ticks
 * and numbers, a red overload zone at one end, a black needle swinging from a
 * chrome pivot below the arc. The deck's central instrument is a round version
 * of that meter, and every coordinate on its face is computed here against a
 * fixed viewBox — the same discipline as core/day-ring.mjs, for the same
 * reason: a malformed SVG path renders as NOTHING, silently, and a
 * computed-and-tested path cannot be malformed.
 *
 * Angles are degrees measured from straight up (0 = needle vertical),
 * positive clockwise, so a symmetric sweep runs from -sweep/2 to +sweep/2.
 */

const round = (n) => Math.round(n * 100) / 100;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function pointAt(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: round(cx + r * Math.sin(rad)), y: round(cy - r * Math.cos(rad)) };
}

/** Where along the sweep a value sits, clamped to the scale's own ends. */
export function valueToDeg(value, { min = 0, max = 1, sweep = 96 } = {}) {
  if (!(max > min)) return -sweep / 2;
  const t = clamp((Number(value) - min) / (max - min), 0, 1);
  return round(-sweep / 2 + t * sweep);
}

/** An annular band between two radii across an angle range — the red zone. */
function bandPath(cx, cy, rInner, rOuter, fromDeg, toDeg) {
  const a = pointAt(cx, cy, rOuter, fromDeg);
  const b = pointAt(cx, cy, rOuter, toDeg);
  const c = pointAt(cx, cy, rInner, toDeg);
  const d = pointAt(cx, cy, rInner, fromDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  const sweepFlag = toDeg > fromDeg ? 1 : 0;
  return [
    `M ${a.x} ${a.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} ${sweepFlag} ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${rInner} ${rInner} 0 ${large} ${sweepFlag ? 0 : 1} ${d.x} ${d.y}`,
    "Z"
  ].join(" ");
}

/**
 * Evenly spaced printed labels between min and max, rounded to whole numbers
 * — the real numbers a player reads (design/ux-doctrine.md Law 1), not
 * percentages. Duplicates collapse (a max of 2 cannot print five distinct
 * integers), so a tiny range prints fewer labels rather than repeating one.
 */
export function scaleLabels(min, max, count = 5) {
  if (!(max > min) || count < 2) return [{ value: min, text: String(Math.round(min)) }];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < count; i++) {
    const value = Math.round(min + ((max - min) * i) / (count - 1));
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ value, text: String(value) });
  }
  return out;
}

/**
 * The whole printed face of one meter.
 *
 * `danger` is a value range printed as the red zone ({from, to}); null prints
 * none. For HP the danger zone sits at the LOW end (a fuel gauge), where a
 * broadcast VU puts it at the high end — both are honest, because the red
 * band marks where the reading becomes a problem, and for HP that is empty.
 */
export function vuFace({
  min = 0,
  max = 1,
  size = 200,
  pivotX = 100,
  pivotY = 124,
  radius = 86,
  sweep = 96,
  labelCount = 5,
  minorPerGap = 3,
  majorTick = 9,
  minorTick = 5,
  labelGap = 11,
  bandWidth = 5,
  danger = null
} = {}) {
  const cx = pivotX;
  const cy = pivotY;
  const labels = scaleLabels(min, max, labelCount);
  const degOf = (v) => valueToDeg(v, { min, max, sweep });

  const ticks = [];
  const majors = labels.map((l) => degOf(l.value));
  majors.forEach((deg, i) => {
    const a = pointAt(cx, cy, radius, deg);
    const b = pointAt(cx, cy, radius + majorTick, deg);
    ticks.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major: true });
    const next = majors[i + 1];
    if (next === undefined) return;
    for (let m = 1; m <= minorPerGap; m++) {
      const d = deg + ((next - deg) * m) / (minorPerGap + 1);
      const p = pointAt(cx, cy, radius, d);
      const q = pointAt(cx, cy, radius + minorTick, d);
      ticks.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, major: false });
    }
  });

  const arcStart = pointAt(cx, cy, radius, -sweep / 2);
  const arcEnd = pointAt(cx, cy, radius, sweep / 2);
  const arc = `M ${arcStart.x} ${arcStart.y} A ${radius} ${radius} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;

  let dangerBand = null;
  if (danger && Number.isFinite(danger.from) && Number.isFinite(danger.to) && danger.to > danger.from) {
    const from = degOf(clamp(danger.from, min, max));
    const to = degOf(clamp(danger.to, min, max));
    if (to > from) dangerBand = bandPath(cx, cy, radius - bandWidth, radius, from, to);
  }

  return {
    viewBox: `0 0 ${size} ${size}`,
    pivot: { x: cx, y: cy },
    radius,
    arc,
    ticks,
    labels: labels.map((l) => ({ ...pointAt(cx, cy, radius + majorTick + labelGap, degOf(l.value)), text: l.text })),
    // The printed "−" and "+" a VU face carries just inside either end of its arc.
    minus: pointAt(cx, cy, radius - 14, -sweep / 2 + 5),
    plus: pointAt(cx, cy, radius - 14, sweep / 2 - 5),
    dangerBand
  };
}
