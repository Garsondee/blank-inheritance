/**
 * Real pathfinding (design doc §15q) — the piece that turns "walls exist and
 * are legal to walk into" into "an AI can actually route around one."
 *
 * Without this, decide.mjs's stepToward/stepAway (a greedy single-fixed-
 * direction walk) simply returns null the moment a wall blocks its one path,
 * even when a route exists two squares to the side. generateProposals
 * already tries several directions/standoffs per target, so a walled map
 * degrades to "some candidates silently vanish" rather than a crash or a
 * frozen AI — but it can't discover a route that requires going AROUND
 * something. Dijkstra can.
 *
 * THE ALTERNATING-DIAGONAL COMPLICATION. SF2E's 5-10-5 rule (grid.mjs's
 * distanceFeet) is PATH-DEPENDENT: every second diagonal step in a path
 * costs double, and which diagonal is "second" depends on how many diagonals
 * came before it along THIS path — not a fixed per-edge cost, which is what
 * plain Dijkstra assumes. Reusing distanceFeet(current, next) as an edge
 * weight would silently price every diagonal as "cheap" (each isolated call
 * starts its own alternation fresh at zero), under-costing any multi-
 * diagonal route and steering the AI toward paths real SF2E wouldn't allow
 * that cheaply.
 *
 * Fixed the textbook way: DOUBLE the state space. A search node is not just
 * a cell, it's (cell, diagonalParity) — parity 0 means "the next diagonal
 * step taken from here would be cheap (odd-numbered overall)", parity 1
 * means "the next diagonal would be expensive (even-numbered)". A straight
 * step passes parity through unchanged; a diagonal step flips it and costs
 * 50ft at parity 0 or 100ft at parity 1. This is still just Dijkstra, over
 * twice as many nodes — verified in the test suite to reproduce distanceFeet
 * EXACTLY for the no-obstacle case, which is the trusted reference.
 */
import { isInBounds, isOccupied, FEET_PER_SQUARE } from "../../engine/grid.mjs";
import { moveBlockedBetween } from "../../engine/terrain.mjs";

/**
 * A small dependency-free binary min-heap over (priority, node-index) pairs.
 * Deliberately NOT shared with tools/map-generator's own heap — that tool is
 * developed independently and concurrently; duplicating ~30 lines here is
 * cheaper than a cross-tool coupling that could break under someone else's
 * unrelated change. This project's own directory structure already treats
 * each tools/* subtree as self-contained.
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
 * Dijkstra from `from`, respecting bounds, occupancy (every OTHER
 * combatant's current position blocks a cell, matching isOccupied
 * elsewhere), wall move-blocking, and the real alternating-diagonal cost.
 *
 * Returns a Map keyed by "col,row" (the CHEAPER of the two parity-states
 * reaching that cell) to `{ cost, path }`, where `path` is the full ordered
 * list of cells from `from` to that cell inclusive — for every cell
 * reachable within `maxFeet`. Only cells within `maxFeet` are explored, so
 * this stays cheap even on the full 44x44 grid: it's bounded by a
 * combatant's own Speed, not the whole map.
 */
export function reachableCells({ from, maxFeet, gridSize, occupiedPositions = [], walls = [] }) {
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
      if (isOccupied(next, occupiedPositions)) continue;
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
    const existing = result.get(cellKey);
    if (existing && existing.cost <= cost) continue;
    const path = [{ col, row }];
    let cur = { col, row, parity };
    while (cur.col !== from.col || cur.row !== from.row) {
      const prevKey = key(cur.col, cur.row, cur.parity);
      const prev = cameFrom.get(prevKey);
      if (!prev) break;
      path.unshift({ col: prev.col, row: prev.row });
      cur = prev;
    }
    result.set(cellKey, { cost, path });
  }
  return result;
}

/**
 * Convenience wrapper: the real path cost (or Infinity if unreachable within
 * `maxFeet`, or null if no budget cap is meaningful — pass a large maxFeet
 * for "just tell me if it's reachable at all within X").
 */
export function pathCost(args) {
  const cells = reachableCells(args);
  return cells.get(`${args.to.col},${args.to.row}`)?.cost ?? Infinity;
}
