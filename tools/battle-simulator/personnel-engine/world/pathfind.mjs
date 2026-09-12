/**
 * Real pathfinding for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../../ai/world/pathfind.mjs verbatim, with only the grid/terrain imports swapped to this tree's
 * own 5ft-square versions. The Dijkstra-over-doubled-state-space algorithm itself never references
 * FEET_PER_SQUARE's *value* — it reads the constant as a step cost, which is exactly as correct at
 * 5ft as it was at 50ft — so nothing else about this file changes. See the original file's own
 * header comment (preserved below) for why the state space is doubled at all: SF2E's 5-10-5
 * diagonal rule is path-dependent, and plain Dijkstra assumes a fixed per-edge cost.
 *
 * THE ALTERNATING-DIAGONAL COMPLICATION. SF2E's 5-10-5 rule (grid.mjs's distanceFeet) is
 * PATH-DEPENDENT: every second diagonal step in a path costs double, and which diagonal is
 * "second" depends on how many diagonals came before it along THIS path — not a fixed per-edge
 * cost, which is what plain Dijkstra assumes. Reusing distanceFeet(current, next) as an edge
 * weight would silently price every diagonal as "cheap" (each isolated call starts its own
 * alternation fresh at zero), under-costing any multi-diagonal route and steering the AI toward
 * paths real SF2E wouldn't allow that cheaply.
 *
 * Fixed the textbook way: DOUBLE the state space. A search node is not just a cell, it's
 * (cell, diagonalParity) — parity 0 means "the next diagonal step taken from here would be cheap
 * (odd-numbered overall)", parity 1 means "the next diagonal would be expensive (even-numbered)".
 * A straight step passes parity through unchanged; a diagonal step flips it and costs one square
 * at parity 0 or two squares' worth at parity 1. This is still just Dijkstra, over twice as many
 * nodes — verified in the test suite to reproduce distanceFeet EXACTLY for the no-obstacle case,
 * which is the trusted reference.
 */
import { isInBounds, isOccupied, blocksPassage, FEET_PER_SQUARE } from "../grid.mjs";
import { moveBlockedBetween } from "../terrain.mjs";

/**
 * A small dependency-free binary min-heap over (priority, node-index) pairs. Deliberately NOT
 * shared with the Frame-scale file's own copy, or tools/map-generator's — duplicating ~30 lines
 * here is cheaper than a cross-tree coupling that could break under someone else's unrelated
 * change, matching this project's existing self-contained-subtree convention.
 */
class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(priority, node) {
    this.items.push([priority, node]);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent][0] <= this.items[i][0]) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }
  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let smallest = i;
        if (l < this.items.length && this.items[l][0] < this.items[smallest][0]) smallest = l;
        if (r < this.items.length && this.items[r][0] < this.items[smallest][0]) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

const DIRECTIONS = [
  { dc: 1, dr: 0 }, { dc: -1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 0, dr: -1 },
  { dc: 1, dr: 1 }, { dc: 1, dr: -1 }, { dc: -1, dr: 1 }, { dc: -1, dr: -1 }
];

function key(col, row, parity) { return `${col},${row},${parity}`; }

/**
 * Dijkstra from `from`, respecting bounds, occupancy, wall move-blocking, and the real alternating-
 * diagonal cost.
 *
 * Occupancy is faction-aware (design doc §24): a DIFFERENT-side occupant fully blocks a cell, same
 * as ever, but a SAME-side occupant (`moverSide`, matched against each `occupiedPositions` entry's
 * own `.side`) only blocks STOPPING there — the search still explores past/through it, since real
 * SF2E lets you move through an ally's space, you just can't end your turn on it. `moverSide ==
 * null` (no side info supplied) falls back to the original any-occupant-blocks-everything rule.
 *
 * Returns a Map keyed by "col,row" (the CHEAPER of the two parity-states reaching that cell) to
 * `{ cost, path }`, where `path` is the full ordered list of cells from `from` to that cell
 * inclusive — for every cell reachable within `maxFeet` THAT ISN'T ITSELF OCCUPIED (an ally's own
 * square is a real waypoint on the way to somewhere else, never a valid destination in its own
 * right). Only cells within `maxFeet` are explored, so this stays cheap even on a large grid: it's
 * bounded by a combatant's own Speed, not the whole map — EXCEPT `decide.mjs`'s own
 * `trueDistanceField`, which deliberately sets `maxFeet` to 4x the map diagonal specifically to
 * flood the whole grid (design doc §76.4/GH #62): profiled directly, that shape and `pathCost`'s own
 * `maxFeet: 100000` account for ~58% of a real walled battle's own wall-clock time, and NEITHER
 * caller ever reads `.path` off the result (both read only `.cost` — confirmed by reading every call
 * site, not assumed) — `path` reconstruction alone is 32-76% of a full-grid flood's own cost,
 * scaling with path length as `unshift`'s own O(n) cost compounds. `includePath = false` skips it:
 * `path` comes back `null` on every returned cell instead. Every Speed-bounded caller (destination
 * search, cover search, blind exploration, determinization) keeps the default and is byte-for-byte
 * unaffected — this is an additive, opt-in parameter, not a behavior change to any existing shape.
 */
// FLOOD COUNTER (GH #62, mirroring engine.mjs's own sandboxForkCount/design doc §59 pattern) — this
// function is the one true seam every Dijkstra flood passes through, no matter how much caching sits
// above it (decide.mjs's own field|/reach| caches skip this call outright on a hit) — so counting AT
// this seam, not derived from a call site, is what can actually prove a cache is being reused rather
// than merely "not wrong." Inert for every existing caller: a plain increment, no control-flow/return
// effect, only meaningful to a caller that explicitly resets and reads it.
let floodCount = 0;
export function resetFloodCount() { floodCount = 0; }
export function getFloodCount() { return floodCount; }

export function reachableCells({ from, maxFeet, gridSize, occupiedPositions = [], walls = [], moverSide = null, includePath = true }) {
  floodCount++;
  const heap = new MinHeap();
  const best = new Map(); // key(col,row,parity) -> cost
  const cameFrom = new Map(); // key -> {col,row,parity} of the predecessor
  const startKey = key(from.col, from.row, 0);
  best.set(startKey, 0);
  heap.push(0, { col: from.col, row: from.row, parity: 0 });

  while (heap.size) {
    const [dist, node] = heap.pop();
    const nodeKey = key(node.col, node.row, node.parity);
    if (dist > (best.get(nodeKey) ?? Infinity)) continue; // stale queue entry

    for (const { dc, dr } of DIRECTIONS) {
      const next = { col: node.col + dc, row: node.row + dr };
      if (!isInBounds(next, gridSize)) continue;
      if (blocksPassage(next, occupiedPositions, moverSide)) continue;
      if (moveBlockedBetween(node, next, walls)) continue;

      const isDiagonal = dc !== 0 && dr !== 0;
      let stepCost, nextParity;
      if (isDiagonal) {
        stepCost = node.parity === 0 ? FEET_PER_SQUARE : FEET_PER_SQUARE * 2;
        nextParity = 1 - node.parity;
      } else {
        stepCost = FEET_PER_SQUARE;
        nextParity = node.parity;
      }

      const newDist = dist + stepCost;
      if (newDist > maxFeet) continue;
      const nextKey = key(next.col, next.row, nextParity);
      if (newDist < (best.get(nextKey) ?? Infinity)) {
        best.set(nextKey, newDist);
        cameFrom.set(nextKey, { col: node.col, row: node.row, parity: node.parity });
        heap.push(newDist, { col: next.col, row: next.row, parity: nextParity });
      }
    }
  }

  // Collapse the two parity-states per cell down to whichever was cheaper, and reconstruct paths.
  const result = new Map();
  for (const [k, cost] of best) {
    const [col, row, parity] = k.split(",").map(Number);
    const cellKey = `${col},${row}`;
    // An ally's own square was legitimately explored/passed through above, but it's still someone
    // else's square right now — never a valid place for THIS combatant to end its own move.
    if (isOccupied({ col, row }, occupiedPositions)) continue;
    const existing = result.get(cellKey);
    if (existing && existing.cost <= cost) continue;
    let path = null;
    if (includePath) {
      path = [{ col, row }];
      let cur = { col, row, parity };
      while (cur.col !== from.col || cur.row !== from.row) {
        const prevKey = key(cur.col, cur.row, cur.parity);
        const prev = cameFrom.get(prevKey);
        if (!prev) break;
        path.unshift({ col: prev.col, row: prev.row });
        cur = prev;
      }
    }
    result.set(cellKey, { cost, path });
  }
  return result;
}

/**
 * Convenience wrapper: the real path cost (or Infinity if unreachable within `maxFeet`) between
 * two specific cells. Returns a bare number — never the route itself — so this always floods with
 * `includePath: false` (GH #62): its one real caller (`evaluate/state-value.mjs`'s `effectiveDistance`,
 * `maxFeet: 100000` — a full-grid flood) only ever reads the number this function already returns.
 */
export function pathCost(args) {
  const cells = reachableCells({ ...args, includePath: false });
  return cells.get(`${args.to.col},${args.to.row}`)?.cost ?? Infinity;
}
