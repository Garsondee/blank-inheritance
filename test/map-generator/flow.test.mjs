/**
 * Tests for the hydrology layer: depression filling, D8 routing, drainage
 * accumulation.
 *
 * These are pure INVARIANTS rather than golden values, which is the right shape
 * of test for a generator — the exact terrain is free to change as parameters
 * are tuned, but water must always reach the sea, no cell may drain into
 * itself, and drainage area must be conserved. If any of those break, every
 * landform above them is meaningless.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Field } from '../../tools/map-generator/core/field.mjs';
import { makeRng, gaussian } from '../../tools/map-generator/core/rng.mjs';
import {
  fillDepressions,
  computeReceivers,
  computeStack,
  drainageArea,
  routeFlow,
  channelCells,
} from '../../tools/map-generator/terrain/flow.mjs';

/** A tilted, noisy surface with a guaranteed pit dug into it. */
function testSurface(W = 40, H = 40, { pit = true } = {}) {
  const rng = makeRng(99);
  const f = Field.from(W, H, (x) => x * 5 + gaussian(rng) * 2);
  if (pit) {
    for (let y = 18; y < 23; y++) for (let x = 18; x < 23; x++) f.set(x, y, -500);
  }
  return f;
}

test('fillDepressions removes every pit: after filling, every non-outlet cell has a strictly lower neighbour', () => {
  const elev = testSurface();
  const filled = fillDepressions(elev);
  const { width, height } = filled;
  const h = filled.data;
  for (let y = 0; y < height; y++) {
    for (let x = 1; x < width; x++) {
      // x === 0 is the default outlet column.
      let hasLower = false;
      for (let dy = -1; dy <= 1 && !hasLower; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (h[ny * width + nx] < h[y * width + x]) {
            hasLower = true;
            break;
          }
        }
      }
      assert.ok(hasLower, `cell (${x},${y}) has no downhill neighbour after filling`);
    }
  }
});

test('fillDepressions never LOWERS the surface, and it does raise the pit it was given', () => {
  const elev = testSurface();
  const filled = fillDepressions(elev);
  for (let i = 0; i < elev.length; i++) {
    assert.ok(filled.data[i] >= elev.data[i] - 1e-9, `cell ${i} was lowered by filling`);
  }
  assert.ok(filled.get(20, 20) > elev.get(20, 20) + 100, 'the -500 pit should have been filled substantially');
});

test('fillDepressions leaves the original field untouched', () => {
  const elev = testSurface();
  const before = Float64Array.from(elev.data);
  fillDepressions(elev);
  assert.deepEqual(Array.from(elev.data), Array.from(before));
});

test('receivers form a forest: following them from any cell always terminates at an outlet, never a cycle', () => {
  const elev = testSurface();
  const filled = fillDepressions(elev);
  const { receivers } = computeReceivers(filled);
  const n = filled.length;
  for (let start = 0; start < n; start++) {
    let i = start;
    let steps = 0;
    while (receivers[i] !== i) {
      i = receivers[i];
      if (++steps > n) {
        assert.fail(`flow path from cell ${start} did not terminate within ${n} steps — there is a cycle`);
      }
    }
    assert.equal(i % filled.width, 0, `flow from ${start} terminated at ${i}, which is not on the outlet column`);
  }
});

test('every cell drains strictly downhill on the filled surface', () => {
  const elev = testSurface();
  const filled = fillDepressions(elev);
  const { receivers } = computeReceivers(filled);
  const h = filled.data;
  for (let i = 0; i < h.length; i++) {
    const r = receivers[i];
    if (r === i) continue;
    assert.ok(h[r] < h[i], `cell ${i} (h=${h[i]}) drains to ${r} (h=${h[r]}), which is not lower`);
  }
});

test('computeStack orders cells so that every receiver is visited before its donors (the precondition the implicit erosion solver relies on)', () => {
  const elev = testSurface();
  const filled = fillDepressions(elev);
  const { receivers } = computeReceivers(filled);
  const stack = computeStack(receivers);
  const position = new Int32Array(filled.length);
  for (let s = 0; s < stack.length; s++) position[stack[s]] = s;
  for (let i = 0; i < filled.length; i++) {
    const r = receivers[i];
    if (r === i) continue;
    assert.ok(position[r] < position[i], `receiver ${r} is ordered after its donor ${i}`);
  }
});

test('drainage area is CONSERVED: the total area arriving at all outlets equals the whole map', () => {
  const elev = testSurface();
  const { filled, receivers, area } = routeFlow(elev, { cellArea: 1 });
  let atOutlets = 0;
  for (let i = 0; i < area.length; i++) if (receivers[i] === i) atOutlets += area[i];
  assert.ok(
    Math.abs(atOutlets - filled.length) < 1e-6,
    `outlets received ${atOutlets} of an expected ${filled.length} cells of catchment`
  );
});

test('drainage area increases monotonically downstream', () => {
  const elev = testSurface();
  const { receivers, area } = routeFlow(elev, { cellArea: 1 });
  for (let i = 0; i < area.length; i++) {
    const r = receivers[i];
    if (r === i) continue;
    assert.ok(area[r] >= area[i] - 1e-9, `area fell going downstream: cell ${i} (${area[i]}) -> ${r} (${area[r]})`);
  }
});

test('precipitation weighting scales total discharge but keeps it conserved', () => {
  const elev = testSurface();
  const wet = Field.from(elev.width, elev.height, () => 2);
  const { receivers, area } = routeFlow(elev, { cellArea: 1, precipitation: wet });
  let atOutlets = 0;
  for (let i = 0; i < area.length; i++) if (receivers[i] === i) atOutlets += area[i];
  assert.ok(
    Math.abs(atOutlets - elev.length * 2) < 1e-6,
    `with 2x precipitation, outlets should receive ${elev.length * 2}, got ${atOutlets}`
  );
});

test('a custom outlet set is honoured: flow leaves only through the cells it names (this is what lets phase 2 grade the landscape to the new shoreline instead of the map edge)', () => {
  const W = 30;
  const H = 30;
  // A bowl draining to its centre, with the centre as the only outlet.
  const elev = Field.from(W, H, (x, y) => Math.hypot(x - 15, y - 15));
  const outlets = new Uint8Array(W * H);
  outlets[15 * W + 15] = 1;

  const { receivers, area } = routeFlow(elev, { cellArea: 1, outlets });

  let outletCount = 0;
  for (let i = 0; i < receivers.length; i++) if (receivers[i] === i) outletCount++;
  assert.equal(outletCount, 1, 'exactly the one nominated cell should be an outlet');
  assert.equal(receivers[15 * W + 15], 15 * W + 15);
  assert.ok(
    Math.abs(area[15 * W + 15] - W * H) < 1e-6,
    `the sole outlet should collect the entire map (${W * H}), got ${area[15 * W + 15]}`
  );
});

test('channelCells selects exactly the cells above the threshold', () => {
  const area = new Float64Array([1, 5, 10, 2, 50]);
  assert.deepEqual(channelCells(area, 5), [1, 2, 4]);
  assert.deepEqual(channelCells(area, 100), []);
});

test('drainageArea and routeFlow agree with each other', () => {
  const elev = testSurface();
  const filled = fillDepressions(elev);
  const { receivers } = computeReceivers(filled);
  const direct = drainageArea(filled, receivers, { cellArea: 1 });
  const viaRouteFlow = routeFlow(elev, { cellArea: 1 });
  assert.deepEqual(Array.from(direct.area), Array.from(viaRouteFlow.area));
});

test('computeStack emits every cell exactly once', () => {
  const elev = testSurface();
  const filled = fillDepressions(elev);
  const { receivers } = computeReceivers(filled);
  const stack = computeStack(receivers);
  assert.equal(stack.length, filled.length);
  const seen = new Uint8Array(filled.length);
  for (const i of stack) {
    assert.equal(seen[i], 0, `cell ${i} appears twice in the stack`);
    seen[i] = 1;
  }
  for (let i = 0; i < seen.length; i++) assert.equal(seen[i], 1, `cell ${i} is missing from the stack`);
});

test('computeStack starts from outlets', () => {
  const elev = testSurface();
  const filled = fillDepressions(elev);
  const { receivers } = computeReceivers(filled);
  const stack = computeStack(receivers);
  let outlets = 0;
  for (let i = 0; i < receivers.length; i++) if (receivers[i] === i) outlets++;
  // The first `outlets` entries need not all be outlets (DFS interleaves), but
  // the very first one must be, since nothing precedes an outlet.
  assert.equal(receivers[stack[0]], stack[0], 'the first cell emitted must be an outlet');
  assert.ok(outlets > 0);
});

test('REGRESSION: computeStack is O(n), not a per-iteration comparator sort (found 2026-08-23: the sort dominated the erosion loop and made the whole simulation scale as ~O(n^2.6), which put fine resolutions out of reach entirely)', () => {
  // Compare against the elevation sort it replaced. Both are valid orderings;
  // this asserts the new one is materially cheaper at a size that matters.
  const elev = testSurface(256, 256);
  const filled = fillDepressions(elev);
  const { receivers } = computeReceivers(filled);
  const h = filled.data;

  const t0 = process.hrtime.bigint();
  for (let k = 0; k < 5; k++) computeStack(receivers);
  const fast = Number(process.hrtime.bigint() - t0);

  const t1 = process.hrtime.bigint();
  for (let k = 0; k < 5; k++) {
    const order = new Int32Array(filled.length);
    for (let i = 0; i < order.length; i++) order[i] = i;
    order.sort((a, b) => h[a] - h[b]);
  }
  const slow = Number(process.hrtime.bigint() - t1);

  assert.ok(fast < slow, `the O(n) stack (${(fast / 1e6).toFixed(1)} ms) should beat the sort (${(slow / 1e6).toFixed(1)} ms)`);
});
