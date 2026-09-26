/**
 * Pure geometry helpers for the artifact's decision overlay (design doc
 * §14h) — the feet<->pixel conversion and weapon-reach extraction behind
 * the move/strike lines and range rings drawn on the map. Pulled out as a
 * real, independently-tested module (rather than left as inline <script>
 * logic, like most of template.html's rendering functions) specifically
 * because this is the one part of the overlay where a silent scale bug
 * would defeat the whole point of building it: Ingram's ask was to
 * visually CONFIRM a distance is real, so the distance math itself needs
 * its own proof, not just a glance at a rendered image.
 *
 * build.mjs splices this file's source directly into template.html's
 * inline script (stripping the `export` keywords, since a published
 * artifact must stay a single self-contained HTML file with no external
 * script references) — this file is the source of truth either way.
 */

// MUTABLE on purpose (design doc §19): the reader's "Simulation Library" can hold BOTH Frame-scale
// runs (50ft/square, the 44x44 city-district map) and personnel-scale runs (5ft/square, a small
// synthetic building, non-square grids) side by side, and a viewer scrubs between them freely — so
// these can no longer be baked-in constants fixed at page-parse time. setMapScale() recomputes them
// whenever selectRun() switches to a run at a different scale/size; CELL itself stays fixed (every
// grid square always renders at the same pixel size) so only the map's overall canvas grows/shrinks
// per run, never the per-square zoom level.
export let CELL = 30;
export let COLS = 44;
export let ROWS = 44;
export let MAP_PX_W = COLS * CELL;
export let MAP_PX_H = ROWS * CELL;
export let FEET_PER_SQUARE = 50; // the frame-scale backward-compat default explained below (line ~34) -- frame-scale itself was removed 2026-09-19, but old logs using this default may still exist

/**
 * Recompute every geometry constant for the run about to be rendered. `feetPerSquare` defaults to
 * 50 when absent (every Frame-scale log written before this field existed) — real backward
 * compatibility for the run library's existing pre-§19 files, not a guess.
 */
export function setMapScale({ cols, rows, feetPerSquare }) {
  COLS = cols; ROWS = rows;
  MAP_PX_W = COLS * CELL; MAP_PX_H = ROWS * CELL;
  FEET_PER_SQUARE = feetPerSquare ?? 50;
}

/** Grid cell {col,row} -> pixel {x,y} at the center of that cell. */
export function posToPx(pos) {
  return { x: (pos.col + 0.5) * CELL, y: (pos.row + 0.5) * CELL };
}

/**
 * A wall's grid-VERTEX coordinate (a cell CORNER, e.g. Foundry Wall schema's `c:[x0,y0,x1,y1]` —
 * design doc §19 Phase 1b) -> pixel {x,y}. Deliberately NOT posToPx's +0.5 cell-center offset —
 * vertex (c,r) sits at the shared corner of up to four cells, exactly at pixel (c*CELL, r*CELL).
 */
export function vertexToPx(v) {
  return { x: v[0] * CELL, y: v[1] * CELL };
}

/** A real-world feet distance -> the equivalent pixel length on the map, at this map's scale. */
export function feetToPx(feet) {
  return (feet / FEET_PER_SQUARE) * CELL;
}

/**
 * Mirrors engine/grid.mjs's reachFeetForStrike exactly for a melee Strike
 * (a reach-N trait, or one square/adjacent-only if none) — kept as a
 * parallel implementation rather than an import because the artifact is
 * plain inline JS with no module loader once published, not because the
 * logic is meant to diverge; the cross-check test below guards against drift.
 */
export function reachFeetForStrikeLocal(strike) {
  if (strike.strikeType === "melee") {
    const reachTrait = (strike.traits || []).find((t) => /^reach-\d+$/.test(t));
    return reachTrait ? Number(reachTrait.split("-")[1]) : FEET_PER_SQUARE;
  }
  return strike.rangeIncrement ?? null;
}

/**
 * The range-ring radius for ANY attack/heal option — a ranged Strike's
 * rangeIncrement (via reachFeetForStrikeLocal above), a melee Strike's
 * reach, or a spell/ability's own flat `.range` (design doc §14k — checked
 * FIRST, since a spell has no strikeType at all and would otherwise fall
 * through to rangeIncrement and read as null). Mirrors the same
 * range-then-reach logic ai/evaluate/state-value.mjs's usefulRangeFeet
 * uses for the AI's own candidate generation, for the same "don't let the
 * visual silently drift from what the AI actually reasoned about" reason
 * the rest of this module exists.
 */
export function cleanRangeFeetLocal(item) {
  if (item.range != null) return item.range;
  return reachFeetForStrikeLocal(item);
}

/**
 * Which CSS class a Foundry Wall schema segment (design doc §22) renders with — three real flavors
 * now exist, each drawn distinctly rather than as one undifferentiated dark line. Checked here
 * rather than only inline in template.html because getting this classification backwards (e.g.
 * treating a window as a plain wall) would silently make a real mechanical difference invisible on
 * the map — the same "a visual confirmation tool is only trustworthy if it can't silently drift"
 * reasoning this whole module already exists for.
 */
export function wallLineClass(wall) {
  if (wall.cover) return "cover-line";
  if (wall.sight === 0) return "window-line";
  return "wall-line";
}

/**
 * Degree-of-success -> decision-line class, for an ATTACK ROLL (strike, spellAttack) — the
 * ATTACKER rolls, so criticalSuccess is their best outcome. `prefix` is "strike" or "spell" so the
 * same 3-tier shape serves both action types while keeping their colors distinct (design doc §22 —
 * "shot" vs. "spell").
 */
export function attackRollClass(prefix, degree) {
  if (degree === "criticalSuccess") return `${prefix}-crit`;
  if (degree === "success") return `${prefix}-hit`;
  return `${prefix}-miss`;
}

/**
 * Degree-of-success -> decision-line class, for a SAVE (saveAttack, conditionSave) — the TARGET
 * rolls, so the polarity INVERTS relative to attackRollClass: the target's criticalFailure is the
 * best outcome for the attacker's effect (double damage, Player Core's basic-save table), not their
 * worst. Getting this inversion backwards would make a critically-failed save render as a miss.
 */
export function saveRollClass(prefix, degree) {
  if (degree === "criticalFailure") return `${prefix}-crit`;
  if (degree === "failure") return `${prefix}-hit`;
  return `${prefix}-miss`;
}

/**
 * Degree-of-success -> decision-line class, for Demoralize specifically — an Intimidation check,
 * not an attack or a save. Only 2 real outcome tiers exist (REAL_OUTCOMES.demoralize's own
 * appliedFrightened table gives criticalSuccess/success some real frightened value, failure/
 * criticalFailure exactly 0), so this stays a plain hit/miss rather than borrowing a 3-tier scale
 * that would imply a distinction (a "critical" Demoralize) the mechanic doesn't actually have.
 */
export function demoralizeClass(degree) {
  return (degree === "criticalSuccess" || degree === "success") ? "demoralize-hit" : "demoralize-miss";
}

/**
 * Design doc §28 — Ingram's own ask: "a very simple animation to show attacks, their result (hit,
 * miss, crits etc above the target)... spells, grenades, AoE... lots of these things could be
 * communicated on the map visually." One real action -> the floating result label the artifact
 * viewer shows above its target (text + a CSS class reused DIRECTLY from this file's own
 * attackRollClass/saveRollClass/demoralizeClass — same color language as the decision-line the
 * action already draws, not a second, parallel taxonomy that could drift from it). Returns null for
 * action types with no real "result" to show (move/step/advance).
 */
export function combatLabelFor(action) {
  if (action.type === "strike" || action.type === "spellAttack") {
    const dmg = action.damageApplied ?? 0;
    const cls = attackRollClass(action.type === "spellAttack" ? "spell" : "strike", action.roll?.degree);
    if (cls.endsWith("-crit")) return { text: `CRIT! -${dmg}`, cls };
    if (cls.endsWith("-hit")) return { text: `-${dmg}`, cls };
    return { text: "MISS", cls };
  }
  if (action.type === "saveAttack") {
    // The TARGET rolls (Player Core's basic-save shape) — saveRollClass already inverts the
    // polarity correctly. Label text: criticalFailure gets the same "CRIT!" marker a criticalSuccess
    // attack roll does (a consistent "worst roll for the target" signal regardless of action type),
    // success (half damage, still a real hit) is distinguished by TEXT from criticalSuccess (0
    // damage, "SAVED") even though both share the de-emphasized spell-miss styling.
    const dmg = action.damageApplied ?? 0;
    const degree = action.roll?.degree;
    const cls = saveRollClass("spell", degree);
    if (degree === "criticalFailure") return { text: `CRIT! -${dmg}`, cls };
    return { text: dmg > 0 ? `-${dmg}` : "SAVED", cls };
  }
  if (action.type === "conditionSave") {
    const degree = action.roll?.degree;
    const parts = [];
    if (action.applied?.frightened) parts.push(`Frightened ${action.applied.frightened}`);
    if (action.applied?.stunnedValue) parts.push(`Stunned ${action.applied.stunnedValue}`);
    if (!parts.length) return { text: "SAVED", cls: "spell-miss" };
    const prefix = degree === "criticalFailure" ? "CRIT! " : ""; // same consistent marker as strike/spellAttack/saveAttack above
    return { text: `${prefix}${parts.join(", ")}`, cls: saveRollClass("spell", degree) };
  }
  if (action.type === "demoralize") {
    const applied = action.frightenedApplied ?? 0;
    return applied ? { text: `Frightened ${applied}`, cls: "demoralize-hit" } : { text: "RESISTED", cls: "demoralize-miss" };
  }
  if (action.type === "healAbility") {
    return { text: `+${action.healing ?? 0}`, cls: "heal" };
  }
  return null;
}

/**
 * Which of combatLabelFor's action types get the burst-ring treatment alongside their floating
 * label — reserved for the save-based, explosive/area-flavored abilities (a thrown grenade, a
 * Thunderstrike-style spell, a Forced-Reflection-style condition effect) that narratively read as
 * "something went off here," distinct from an ordinary weapon Strike or a vocal Demoralize check.
 */
export function isBurstAction(action) {
  return action.type === "saveAttack" || action.type === "conditionSave";
}

/**
 * Design doc §36 — Ingram's own ask: render the acting token's real Line of Effect during its own
 * turn, muting anyone it can't currently see. A parallel port of engine/terrain.mjs's own
 * `lineOfEffect`/`wallBlocksSight`/`segmentsIntersect` (real 2D line-segment intersection against
 * every sight-blocking wall, a wall's tip merely touching the line doesn't count, an edge-on
 * collinear wall doesn't occlude) — the artifact is plain inline JS with no module loader once
 * published, so this can't import the engine directly, same reasoning as reachFeetForStrikeLocal
 * above. Cross-checked in the test suite against the real engine function so this can never
 * silently drift from what the AI itself actually reasoned about.
 */
const EDGE_SENSE_NORMAL = 20; // engine/terrain.mjs's own EDGE_SENSE.NORMAL — a wall blocks sight/movement at this sense or higher
function wallBlocksSightLocal(wall) {
  return (wall.sight ?? 0) >= EDGE_SENSE_NORMAL;
}
function orientationLocal(ax, ay, bx, by, cx, cy) {
  const v = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}
function onSegmentLocal(ax, ay, bx, by, px, py) {
  return Math.min(ax, bx) <= px && px <= Math.max(ax, bx) && Math.min(ay, by) <= py && py <= Math.max(ay, by);
}
export function segmentsIntersectLocal([ax1, ay1, ax2, ay2], [bx1, by1, bx2, by2]) {
  const o1 = orientationLocal(ax1, ay1, ax2, ay2, bx1, by1);
  const o2 = orientationLocal(ax1, ay1, ax2, ay2, bx2, by2);
  const o3 = orientationLocal(bx1, by1, bx2, by2, ax1, ay1);
  const o4 = orientationLocal(bx1, by1, bx2, by2, ax2, ay2);
  if (o1 !== o2 && o3 !== o4) {
    const touchesEndpoint =
      (ax1 === bx1 && ay1 === by1) || (ax1 === bx2 && ay1 === by2) ||
      (ax2 === bx1 && ay2 === by1) || (ax2 === bx2 && ay2 === by2);
    return !touchesEndpoint;
  }
  if (o1 === 0 && onSegmentLocal(ax1, ay1, ax2, ay2, bx1, by1)) return false;
  if (o2 === 0 && onSegmentLocal(ax1, ay1, ax2, ay2, bx2, by2)) return false;
  if (o3 === 0 && onSegmentLocal(bx1, by1, bx2, by2, ax1, ay1)) return false;
  if (o4 === 0 && onSegmentLocal(bx1, by1, bx2, by2, ax2, ay2)) return false;
  return false;
}
export function lineOfEffectLocal(a, b, walls) {
  if (!walls?.length) return true;
  const line = [a.col + 0.5, a.row + 0.5, b.col + 0.5, b.row + 0.5];
  return !walls.some((w) => wallBlocksSightLocal(w) && segmentsIntersectLocal(line, w.c));
}
