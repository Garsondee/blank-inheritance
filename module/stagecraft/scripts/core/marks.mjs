/**
 * Marks: resting places on the floor (stage.md §8.10). Pure.
 *
 * A mark is a place a card likes to rest and a way of standing there, like the tape marks of a theatre floor. Nothing
 * is shown until a card is picked up; then the free marks near it fade in, the nearest lights, and letting go within
 * reach sends the card to it. These functions decide which marks are shown, how strongly, and where a drop lands.
 */

import { yawTo, cheatOut } from "./diorama.mjs";
import { centroid } from "./zones.mjs";

/** Marks from a scene description, placed on the floor. A mark above the horizon cannot be stood on and is dropped. */
export function resolveMarks(marks, rig) {
  const out = [];
  const dropped = [];
  for (const m of marks) {
    const at = rig.standing(m.at);
    if (!at) { dropped.push(m.id); continue; }
    out.push({ ...m, X: at.X, Z: at.Z });
  }
  return { marks: out, dropped };
}

/** The ids of marks with room left, given who is resting where (`resting` maps a mark id to the cards on it). */
export function freeMarks(marks, resting) {
  return marks.filter((m) => (resting.get(m.id)?.size ?? 0) < m.capacity);
}

/** Distance on the floor from a card to a mark. Depth counts for a little less than width: the eye forgives it. */
export function floorDistance(x, z, mark) {
  return Math.hypot(x - mark.X, (z - mark.Z) * 0.75);
}

/** The nearest free mark within `reach`, or null. */
export function nearestFree(marks, resting, x, z, reach) {
  let best = null;
  let bestD = Infinity;
  for (const m of freeMarks(marks, resting)) {
    const d = floorDistance(x, z, m);
    if (d < bestD && d <= reach) { best = m; bestD = d; }
  }
  return best;
}

/**
 * What to draw while a card is in a hand: the free marks within `show`, nearest first, at most `max`, each with how
 * strongly (0 to 1) and whether it is the one the card would go to. `own` is the mark the card was lifted from, which
 * is free again the moment it is picked up.
 */
export function visibleMarks(marks, resting, x, z, { show = 700, snap = 170, max = 5 } = {}) {
  const ranked = freeMarks(marks, resting)
    .map((m) => ({ mark: m, d: floorDistance(x, z, m) }))
    .filter((r) => r.d <= show)
    .sort((a, b) => a.d - b.d)
    .slice(0, max);
  const target = ranked.length && ranked[0].d <= snap ? ranked[0].mark.id : null;
  return ranked.map((r) => {
    const fade = 1 - Math.min(1, Math.max(0, (r.d - snap) / (show - snap)));
    const alpha = r.mark.id === target ? 1 : 0.18 + 0.5 * fade * fade;
    return { id: r.mark.id, mark: r.mark, distance: r.d, alpha, target: r.mark.id === target };
  });
}

/**
 * How a card stands on a mark: yaw, lean, pitch and lift. A mark that faces something turns the card towards it and
 * cheats it out to the audience, as the blocking of diorama.mjs does everywhere. `ctx` supplies what a mark may face:
 * `zones` (resolved), `cardAt(id)` giving { X, Z }, and `pointOnFloor(fraction)` giving { X, Z }.
 */
export function markPose(mark, ctx = {}) {
  let yaw = mark.yaw;
  const f = mark.faces;
  if (f) {
    let target = null;
    if (f.point && ctx.pointOnFloor) target = ctx.pointOnFloor(f.point);
    else if (f.zone && ctx.zones && ctx.pointOnFloor) {
      const z = ctx.zones.find((q) => q.id === f.zone);
      if (z) target = ctx.pointOnFloor(centroid(z.shape));
    } else if (f.card && ctx.cardAt) target = ctx.cardAt(f.card);
    if (target) yaw = cheatOut(yawTo(mark.X, mark.Z, target.X, target.Z));
  }
  return { yaw, lean: mark.lean, pitch: mark.pitch, lift: mark.lift };
}

/** Tidy: every card to the nearest free mark, one after another, nearest pair first. Returns [{ card, mark }]. */
export function tidy(marks, cards) {
  const taken = new Map();
  const pairs = [];
  const left = new Set(cards.map((c) => c.id));
  const byId = new Map(cards.map((c) => [c.id, c]));
  for (;;) {
    let best = null;
    for (const id of left) {
      const c = byId.get(id);
      for (const m of marks) {
        if ((taken.get(m.id) ?? 0) >= m.capacity) continue;
        const d = floorDistance(c.X, c.Z, m);
        if (!best || d < best.d) best = { d, c, m };
      }
    }
    if (!best) break;
    taken.set(best.m.id, (taken.get(best.m.id) ?? 0) + 1);
    left.delete(best.c.id);
    pairs.push({ card: best.c.id, mark: best.m.id });
  }
  return pairs;
}
