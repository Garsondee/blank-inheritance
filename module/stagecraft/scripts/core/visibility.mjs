/**
 * How much of each card on a stage can be seen. Pure.
 *
 * People are placed to be seen: fully in view, and anything in front of a card hides no more than the bottom 15% of it
 * (Ingram, 2026-10-03, of the cut-outs: "only effect the bottom 15% of a card so that the majority stays in view"; and of
 * a huddle whose cards landed on top of each other: "a complete collision"). The same rule holds between cards, and this
 * is how it is checked.
 *
 * A card is the rectangle it fills on the reference page, standing face-on: a card turned away is narrower, so this is the
 * most it could cover or be covered. The share of it that is hidden is sampled on a grid; a sample is hidden when a card
 * nearer the viewer covers it.
 */

/** The share of a card the rule allows to be hidden by anything in front of it. */
export const HIDDEN_AT_MOST = 0.15;

/**
 * The rectangle a card fills on the reference page: `X`, `Z` where it stands, `w`, `h` as drawn (its depth's growth
 * included), `lift` how far it is raised. `rig` is the stage's rig (rigspace.mjs).
 */
export function cardRect(rig, { X, Z, w, h, lift = 0 }) {
  const a = rig.screenOf(X - w / 2, lift, Z);
  const b = rig.screenOf(X + w / 2, lift + h, Z);
  return { x0: a.x, x1: b.x, y0: b.y, y1: a.y };
}

/**
 * For each card ({ id, X, Z, w, h, lift? }), the share of it hidden by cards in front of it, and which: a Map of id to
 * { hidden, by }. Two cards at the same depth are ordered by id, as some order must be drawn.
 */
export function hiddenShares(rig, cards, { across = 12, down = 20 } = {}) {
  const rects = cards.map((c) => ({ id: c.id, Z: c.Z, ...cardRect(rig, c) }));
  const out = new Map();
  for (const r of rects) {
    const front = rects.filter((o) => o !== r && (o.Z > r.Z || (o.Z === r.Z && o.id > r.id)) && o.x0 < r.x1 && o.x1 > r.x0 && o.y0 < r.y1 && o.y1 > r.y0);
    let hidden = 0;
    const by = new Set();
    for (let i = 0; i < across; i++) {
      for (let j = 0; j < down; j++) {
        const x = r.x0 + ((i + 0.5) / across) * (r.x1 - r.x0);
        const y = r.y0 + ((j + 0.5) / down) * (r.y1 - r.y0);
        const over = front.find((o) => x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1);
        if (over) { hidden++; by.add(over.id); }
      }
    }
    out.set(r.id, { hidden: hidden / (across * down), by: [...by] });
  }
  return out;
}

/**
 * Spread cards apart across the floor until none is hidden more than `most`: each card covered too much and whatever
 * covers it are pushed away from each other, a little at a time, so everyone keeps their order left to right and a
 * formation keeps its shape, only looser. Only the cards in `movable` (a Set of ids) move; the rest (the party, people
 * not in the formation) are in the way like anything else but stay where they are. `limits` keeps X on the floor.
 * Returns the cards with their new X. A crowd too big for the room stops spreading after `iterations` pushes.
 */
export function spreadApart(rig, cards, movable, { most = HIDDEN_AT_MOST, iterations = 80, limits = null } = {}) {
  const out = cards.map((c) => ({ ...c }));
  const byId = new Map(out.map((c) => [c.id, c]));
  for (let it = 0; it < iterations; it++) {
    const shares = hiddenShares(rig, out);
    let moved = false;
    for (const c of out) {
      const v = shares.get(c.id);
      if (v.hidden <= most - 0.01) continue;
      for (const id of v.by) {
        const o = byId.get(id);
        const cm = movable.has(c.id);
        const om = movable.has(o.id);
        if (!cm && !om) continue;
        const dir = c.X !== o.X ? Math.sign(c.X - o.X) : c.id < o.id ? -1 : 1;
        const step = Math.max(c.w, o.w) * 0.05;
        if (cm && om) { c.X += (dir * step) / 2; o.X -= (dir * step) / 2; }
        else if (cm) c.X += dir * step;
        else o.X -= dir * step;
        moved = true;
      }
    }
    if (limits) for (const c of out) if (movable.has(c.id)) c.X = Math.max(limits[0], Math.min(limits[1], c.X));
    if (!moved) break;
  }
  return out;
}
