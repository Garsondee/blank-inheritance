import { test } from "node:test";
import assert from "node:assert/strict";
import { FrameGuard } from "../scripts/core/frame-guard.mjs";

const boom = () => { throw new Error("half a card"); };

test("a frame that works is just run", () => {
  const guard = new FrameGuard();
  let ran = 0;
  assert.equal(guard.run(() => ran++), true);
  assert.equal(ran, 1);
  assert.equal(guard.failures, 0);
});

test("a frame that throws is reported and skipped, and the next one is tried", () => {
  const reports = [];
  const guard = new FrameGuard({ report: (err, n) => reports.push([err.message, n]) });
  assert.equal(guard.run(boom), true, "the show goes on");
  assert.equal(guard.run(() => {}), true);
  assert.deepEqual(reports, [["half a card", 1]]);
  assert.equal(guard.failures, 0, "a good frame clears the count");
  assert.equal(guard.total, 1);
});

test("only the first few failures in a row are reported, then one in a few hundred", () => {
  const reports = [];
  const guard = new FrameGuard({ limit: 10000, report: (_, n) => reports.push(n) });
  for (let i = 0; i < 700; i++) guard.run(boom);
  assert.deepEqual(reports, [1, 2, 3, 300, 600]);
});

test("a stage that fails limit frames in a row gives up, once, and says so", () => {
  const fatal = [];
  const guard = new FrameGuard({ limit: 5, onFatal: (err) => fatal.push(err.message) });
  const results = [];
  for (let i = 0; i < 5; i++) results.push(guard.run(boom));
  assert.deepEqual(results, [true, true, true, true, false]);
  assert.deepEqual(fatal, ["half a card"]);
});

test("failures that are not in a row do not add up", () => {
  const fatal = [];
  const guard = new FrameGuard({ limit: 3, onFatal: () => fatal.push(1) });
  for (let i = 0; i < 20; i++) { guard.run(boom); guard.run(boom); guard.run(() => {}); }
  assert.deepEqual(fatal, []);
  assert.equal(guard.total, 40);
});
