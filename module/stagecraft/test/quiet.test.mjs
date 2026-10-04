// A moment of quiet (core/quiet.mjs): work that stalls the graphics card waits for the hand to pause.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Quiet } from "../scripts/core/quiet.mjs";

function clock(options = {}) {
  const c = { t: 0, timers: [] };
  c.q = new Quiet({ rest: 450, most: 2500, ...options, now: () => c.t, later: (fn, ms) => { const id = { fn, at: c.t + ms }; c.timers.push(id); return id; }, cancel: (id) => { c.timers = c.timers.filter((x) => x !== id); } });
  c.advance = (ms) => {
    const to = c.t + ms;
    for (;;) {
      const next = c.timers.filter((x) => x.at <= to).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      c.timers = c.timers.filter((x) => x !== next);
      c.t = Math.max(c.t, next.at);
      next.fn();
    }
    c.t = to;
  };
  return c;
}
const flush = () => new Promise((r) => setImmediate(r));

test("it resolves once nothing has been painted for the rest, and not before", async () => {
  const c = clock();
  c.q.note();
  let done = false;
  c.q.whenQuiet().then(() => { done = true; });
  c.advance(449);
  await flush();
  assert.equal(done, false, "449 ms after the last stroke is not a pause");
  c.advance(2);
  await flush();
  assert.equal(done, true);
  assert.equal(c.timers.length, 0, "and nothing is left ticking");
});

test("every stroke starts the pause again", async () => {
  const c = clock();
  c.q.note();
  let done = false;
  c.q.whenQuiet().then(() => { done = true; });
  for (let i = 0; i < 5; i++) { c.advance(300); c.q.note(); }
  await flush();
  assert.equal(done, false, "a stroke every 300 ms is not a pause");
  c.advance(450);
  await flush();
  assert.equal(done, true);
});

test("a hand that never rests still gets its work done after the most", async () => {
  const c = clock();
  c.q.note();
  let done = false;
  c.q.whenQuiet().then(() => { done = true; });
  for (let i = 0; i < 20; i++) { c.advance(200); c.q.note(); }       // 4 s of strokes
  await flush();
  assert.equal(done, true, "2.5 s is the longest anything waits");
  assert.ok(c.t >= 2500);
});

test("several waiting at once all go together; ones asked for later wait their own turn for the longest", async () => {
  const c = clock();
  const order = [];
  c.q.note();
  c.q.whenQuiet().then(() => order.push("a"));
  c.advance(100);
  c.q.note();
  c.q.whenQuiet().then(() => order.push("b"));
  c.advance(449);
  await flush();
  assert.deepEqual(order, [], "the second stroke moved the pause for both");
  c.advance(10);
  await flush();
  assert.deepEqual(order, ["a", "b"]);
});

test("release lets everything go at once, and leaves nothing ticking", async () => {
  const c = clock();
  c.q.note();
  const got = [];
  c.q.whenQuiet().then(() => got.push(1));
  c.q.whenQuiet().then(() => got.push(2));
  assert.equal(c.q.pending, 2);
  c.q.release();
  await flush();
  assert.deepEqual(got, [1, 2]);
  assert.equal(c.q.pending, 0);
  assert.equal(c.timers.length, 0);
});

test("with nothing painted for a long time it resolves at once, next turn", async () => {
  const c = clock();
  c.t = 100000;
  let done = false;
  c.q.whenQuiet().then(() => { done = true; });
  c.advance(0);
  await flush();
  assert.equal(done, true);
});
