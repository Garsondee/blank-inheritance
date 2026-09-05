/**
 * Map-marker placement — pure geometry, no DOM.
 *
 * A marker has two parts that must never be confused: the DOT, which sits on
 * the true map point and never moves, and the CARD, which floats nearby in a
 * legal berth and is joined to the dot by a stem. This module decides where
 * the card goes. It knows nothing about pixels on a screen — every number in
 * and out is in one coordinate space the caller chooses (the prototype uses
 * scene-local px; Foundry will use canvas-to-screen px). That is what makes
 * it testable without a browser, and it is why the rules live here and not
 * in the prototype page: "does this card end up inside the visible band,
 * clear of the rails and the banner lane, and not on top of its neighbour"
 * is exactly the kind of claim that needs a test, not a screenshot.
 *
 * Coordinates: x grows right, y grows down. A rect is {x0, y0, x1, y1}.
 */

/** @typedef {{x0:number, y0:number, x1:number, y1:number}} Rect */

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Two rects overlap (touching edges do not count). */
export function rectsIntersect(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/**
 * The stem from a point to the nearest point on a rect's perimeter. If the
 * point is inside the rect (which clamping can cause), the stem has zero
 * length — drawn as nothing, which is honest: the card is ON its point.
 */
export function stemTo(anchor, rect) {
  const inside = anchor.x >= rect.x0 && anchor.x <= rect.x1 && anchor.y >= rect.y0 && anchor.y <= rect.y1;
  if (inside) return { x2: anchor.x, y2: anchor.y, length: 0, angle: 0 };
  const x2 = clamp(anchor.x, rect.x0, rect.x1);
  const y2 = clamp(anchor.y, rect.y0, rect.y1);
  const dx = x2 - anchor.x;
  const dy = y2 - anchor.y;
  return { x2, y2, length: Math.hypot(dx, dy), angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/**
 * Move `rect` the shortest distance that takes it out of `blocker`, keeping
 * it inside `bounds` where possible. Returns a new rect.
 */
function pushOut(rect, blocker, bounds) {
  if (!rectsIntersect(rect, blocker)) return rect;
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  const candidates = [
    { dx: blocker.x0 - rect.x1, dy: 0 },   // left
    { dx: blocker.x1 - rect.x0, dy: 0 },   // right
    { dx: 0, dy: blocker.y0 - rect.y1 },   // up
    { dx: 0, dy: blocker.y1 - rect.y0 }    // down
  ].map((c) => {
    const x0 = clamp(rect.x0 + c.dx, bounds.x0, bounds.x1 - w);
    const y0 = clamp(rect.y0 + c.dy, bounds.y0, bounds.y1 - h);
    const moved = { x0, y0, x1: x0 + w, y1: y0 + h };
    const dist = Math.abs(x0 - rect.x0) + Math.abs(y0 - rect.y0);
    // A move that is still inside the blocker after clamping did not work.
    const ok = !rectsIntersect(moved, blocker);
    return { moved, dist, ok };
  });
  const usable = candidates.filter((c) => c.ok);
  if (!usable.length) return rect;
  usable.sort((a, b) => a.dist - b.dist);
  return usable[0].moved;
}

/**
 * Place ONE card next to its anchor.
 *
 * @param {object} spec
 * @param {{x:number,y:number}} spec.anchor    the dot, in the shared space
 * @param {{w:number,h:number}} spec.size      the card's size
 * @param {Rect} spec.bounds                   the legal berth (visible band)
 * @param {Rect[]} [spec.exclusions]           rails, banner lane, dome notch…
 * @param {number} [spec.gap=26]               stem length when unobstructed
 * @param {"left"|"right"} [spec.side]         force a side (else automatic)
 * @returns {{x:number,y:number,side:string,rect:Rect,stem:object}}
 */
export function placeMarker({ anchor, size, bounds, exclusions = [], gap = 26, side }) {
  const { w, h } = size;
  const fitsRight = anchor.x + gap + w <= bounds.x1;
  const fitsLeft = anchor.x - gap - w >= bounds.x0;
  const chosen = side || (fitsRight ? "right" : fitsLeft ? "left" : "right");

  let x = chosen === "right" ? anchor.x + gap : anchor.x - gap - w;
  let y = anchor.y - h / 2;
  x = clamp(x, bounds.x0, bounds.x1 - w);
  y = clamp(y, bounds.y0, bounds.y1 - h);
  let rect = { x0: x, y0: y, x1: x + w, y1: y + h };

  // Push out of every exclusion. A push can land in another exclusion, so
  // iterate; the bound stops a pathological ring of blockers looping forever.
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const ex of exclusions) {
      const next = pushOut(rect, ex, bounds);
      if (next !== rect) { rect = next; moved = true; }
    }
    if (!moved) break;
  }

  return { x: rect.x0, y: rect.y0, side: chosen, rect, stem: stemTo(anchor, rect) };
}

/**
 * Place MANY cards, then separate the ones that collide.
 *
 * Priority (higher first) decides who stays put; the lower card is pushed
 * DOWN first (the eye follows the stem, so a card below its point is easier
 * to read than one beside a stranger's), then AWAY from its anchor's side.
 * Every push is bounded by the berth and re-checked against the exclusions,
 * and the loop is capped — a residual overlap is returned honestly rather
 * than hidden, and the prototype's diagnostics report it.
 *
 * @param {Array<{id:string, anchor:{x,y}, size:{w,h}, priority?:number, side?:string}>} items
 * @param {Rect} bounds
 * @param {Rect[]} [exclusions]
 * @param {{gap?:number, step?:number, maxSteps?:number}} [opts]
 * @returns {Array<{id:string} & ReturnType<typeof placeMarker> & {overlaps:string[]}>}
 */
export function layoutMarkers(items, bounds, exclusions = [], opts = {}) {
  const { gap = 26, step = 8, maxSteps = 60 } = opts;
  const order = [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.anchor.y - b.anchor.y);
  const placed = [];
  const area = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
  const overlapArea = (a, b) => area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
  const cost = (rect) => placed.reduce((s, q) => s + overlapArea(rect, q.rect), 0)
    + exclusions.reduce((s, ex) => s + overlapArea(rect, ex), 0);

  for (const item of order) {
    const { w, h } = item.size;
    const a = item.anchor;
    // Candidate berths around the dot, in order of preference: beside it
    // (centred), then below / above it, then beside it with the card's top
    // or bottom aligned to the dot. The first collision-free one wins; if
    // none is, the least-overlapping one is refined by pushing.
    const raw = [
      ["right", a.x + gap, a.y - h / 2],
      ["left", a.x - gap - w, a.y - h / 2],
      ["below", a.x - w / 2, a.y + gap],
      ["above", a.x - w / 2, a.y - gap - h],
      ["right", a.x + gap, a.y - 24],
      ["right", a.x + gap, a.y - h + 24],
      ["left", a.x - gap - w, a.y - 24],
      ["left", a.x - gap - w, a.y - h + 24],
      ["below", a.x - 24, a.y + gap],
      ["below", a.x - w + 24, a.y + gap],
      ["above", a.x - 24, a.y - gap - h],
      ["above", a.x - w + 24, a.y - gap - h]
    ];
    const ordered = item.side ? raw.filter(([s]) => s === item.side || s === "below" || s === "above") : raw;
    let best = null;
    for (const [side, cx, cy] of ordered) {
      const x0 = clamp(cx, bounds.x0, bounds.x1 - w);
      const y0 = clamp(cy, bounds.y0, bounds.y1 - h);
      let rect = { x0, y0, x1: x0 + w, y1: y0 + h };
      for (let pass = 0; pass < 4; pass++) {
        let moved = false;
        for (const ex of exclusions) {
          const next = pushOut(rect, ex, bounds);
          if (next !== rect) { rect = next; moved = true; }
        }
        if (!moved) break;
      }
      const c = cost(rect);
      if (!best || c < best.cost) best = { side, rect, cost: c };
      if (c === 0) break;
    }

    // Still overlapping something: push away from the worst collider.
    let { rect, side } = best;
    let steps = 0;
    while (cost(rect) > 0 && steps < maxSteps) {
      steps++;
      const hit = placed.map((q) => q.rect).concat(exclusions)
        .filter((r) => rectsIntersect(rect, r))
        .sort((p, q) => overlapArea(rect, q) - overlapArea(rect, p))[0];
      if (!hit) break;
      const moves = [
        { x0: rect.x0, y0: hit.y1 + step },
        { x0: rect.x0, y0: hit.y0 - h - step },
        { x0: hit.x1 + step, y0: rect.y0 },
        { x0: hit.x0 - w - step, y0: rect.y0 }
      ].map((m) => {
        const x0 = clamp(m.x0, bounds.x0, bounds.x1 - w);
        const y0 = clamp(m.y0, bounds.y0, bounds.y1 - h);
        const r = { x0, y0, x1: x0 + w, y1: y0 + h };
        return { r, c: cost(r) };
      }).sort((p, q) => p.c - q.c);
      if (moves[0].c >= cost(rect)) break;   // no move helps; report it honestly
      rect = moves[0].r;
    }

    const stem = stemTo(a, rect);
    placed.push({
      id: item.id, x: rect.x0, y: rect.y0, side, rect, stem,
      overlaps: placed.filter((q) => rectsIntersect(rect, q.rect)).map((q) => q.id)
    });
  }
  return placed;
}

/**
 * The legal berth for cards: the console minus the top rail, the chassis and
 * a margin. Everything in the same space as the anchors (the console box,
 * origin top-left).
 */
export function visibleBand({ width, height, topRail, chassis, margin = 8 }) {
  return { x0: margin, y0: topRail + margin, x1: width - margin, y1: height - chassis - margin };
}

/**
 * Bearing (degrees clockwise from north) and range from one point to
 * another, for the card's fix line. `scale` is the width of the scene in
 * the range unit (e.g. km per full scene width). Positions are fractions of
 * the scene box (0..1); `aspect` is height / width so a vertical fraction
 * covers a proportionate distance.
 */
export function fixFrom(from, to, { scale = 6, aspect = 9 / 16 } = {}) {
  const dx = (to.x - from.x) * scale;
  const dy = (to.y - from.y) * scale * aspect;
  const bearing = (Math.round((Math.atan2(dx, -dy) * 180) / Math.PI) + 360) % 360;
  const range = Math.hypot(dx, dy);
  return { bearing, range };
}
