// Tier 1 — the notice queue behind the scene banners.
//
// One plate visible at a time; everything worth testing is what happens to
// the second, third and fourth. These run with an injected clock and no
// timers, which is the whole point of keeping the queue out of the page.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  NoticeQueue,
  NOTICE_DWELL,
  NOTICE_RANK,
  NOTICE_CAP,
  NOTICE_KINDS,
  weightedPick
} from "../module/blank-inheritance/scripts/core/notices.mjs";

test("every kind has a dwell, a rank and a cap word", () => {
  for (const k of NOTICE_KINDS) {
    assert.ok(NOTICE_DWELL[k] > 0, `${k} has no dwell`);
    assert.ok(Number.isInteger(NOTICE_RANK[k]), `${k} has no rank`);
    assert.ok(NOTICE_CAP[k], `${k} has no cap word`);
  }
  assert.ok(NOTICE_DWELL.alert > NOTICE_DWELL.info, "an alarm must outlast an advisory");
});

test("an unknown kind throws rather than quietly showing as info", () => {
  const q = new NoticeQueue();
  assert.throws(() => q.push({ kind: "urgent", text: "x" }), /unknown notice kind/);
});

test("the first notice shows; a second queues; dismiss promotes it", () => {
  const q = new NoticeQueue();
  assert.equal(q.push({ kind: "info", text: "A" }).action, "show");
  assert.equal(q.push({ kind: "info", text: "B" }).action, "queue");
  assert.equal(q.pending, 1);
  const next = q.dismiss();
  assert.equal(next.text, "B");
  assert.equal(q.pending, 0);
  assert.equal(q.dismiss(), null);
});

test("an alarm pre-empts an advisory, and the advisory is not lost", () => {
  const q = new NoticeQueue();
  q.push({ kind: "info", text: "A" });
  const r = q.push({ kind: "alert", text: "CONTACT" });
  assert.equal(r.action, "preempt");
  assert.equal(q.current.text, "CONTACT");
  assert.equal(q.dismiss().text, "A", "the interrupted advisory should come back next");
});

test("a lower-ranked notice never pre-empts", () => {
  const q = new NoticeQueue();
  q.push({ kind: "alert", text: "CONTACT" });
  assert.equal(q.push({ kind: "caution", text: "x" }).action, "queue");
  assert.equal(q.push({ kind: "alert", text: "y" }).action, "queue", "equal rank queues, it does not pre-empt");
});

test("a sticky plate is not pre-empted", () => {
  const q = new NoticeQueue();
  q.push({ kind: "info", text: "HOLD", sticky: true });
  assert.equal(q.push({ kind: "alert", text: "x" }).action, "queue");
});

test("the same text within the merge window merges and counts", () => {
  const q = new NoticeQueue({ mergeWindow: 2000 });
  q.push({ kind: "info", text: "SAME" }, 0);
  const r = q.push({ kind: "info", text: "SAME" }, 1500);
  assert.equal(r.action, "merge");
  assert.equal(q.current.count, 2);
  assert.equal(q.pending, 0);
  assert.equal(q.push({ kind: "info", text: "SAME" }, 9000).action, "queue", "outside the window it is a new notice");
});

test("over the cap, the lowest-ranked oldest notice is dropped and an alert never is", () => {
  const q = new NoticeQueue({ cap: 2 });
  q.push({ kind: "info", text: "showing" });
  q.push({ kind: "alert", text: "A1" });          // pre-empts; "showing" back to queue
  q.push({ kind: "info", text: "i1" });
  q.push({ kind: "caution", text: "c1" });         // queue now over cap
  q.push({ kind: "alert", text: "A2" });
  const texts = q.queue.map((n) => n.text);
  assert.equal(q.queue.length, 2);
  assert.ok(texts.includes("A2"), "the alert was dropped");
  assert.ok(!texts.includes("showing") && !texts.includes("i1"), "an info survived while an alert was at risk");
});

test("weightedPick honours the weights and is deterministic under an injected random", () => {
  const pool = [{ id: "a", weight: 1 }, { id: "b", weight: 3 }];
  assert.equal(weightedPick(pool, () => 0.1).id, "a");
  assert.equal(weightedPick(pool, () => 0.5).id, "b");
  assert.equal(weightedPick(pool, () => 0.999).id, "b");
  const counts = { a: 0, b: 0 };
  let seed = 7;
  const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 4000; i++) counts[weightedPick(pool, rng).id]++;
  assert.ok(counts.b > counts.a * 2, `b should be picked ~3x as often: ${JSON.stringify(counts)}`);
});
