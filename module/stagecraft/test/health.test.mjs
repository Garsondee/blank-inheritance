// How each screen at the table is coping (core/health.mjs): what a screen reports, what an incoming report is trusted to be,
// and what the GM's board says about it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { HEALTH, frameStats, pictureOf, shortGpu, makeReport, readReport, levelOf, chipOf, board } from "../scripts/core/health.mjs";

const sample = (over = {}) => ({ backend: "three", tier: "high", stats: { fps: 58, worst: 24 }, probe: 7.2, gpu: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)", dpr: 1.5, size: [2560, 1271], losses: 0, failures: 0, hidden: false, scene: "The Rumour Mill", ...over });
const now = 1_000_000;

test("the frame rate is the median of the last frames, and a stall or a hidden tab is not a frame", () => {
  assert.deepEqual(frameStats(Array(60).fill(16.7)), { fps: 60, worst: 17, n: 60 });
  const mixed = [...Array(50).fill(16.7), 90, 30000, 12000, 250];                  // a stall, a hidden tab, and more of them
  const s = frameStats(mixed);
  assert.equal(s.fps, 60);
  assert.equal(s.worst, 250, "the longest honest frame: one under the gap");
  assert.equal(s.n, 52, "the hidden tab's two long gaps are not frames");
  assert.deepEqual(frameStats([16, 16, 16]), { fps: null, worst: null, n: 3 }, "three frames say nothing");
  assert.equal(frameStats([]).fps, null);
  assert.equal(frameStats([NaN, -4, 0, ...Array(12).fill(33.3)]).fps, 30, "junk is ignored");
  assert.equal(frameStats(Array(20).fill(8.3)).fps, 120, "a fast display");
});

test("what a screen draws with: lit, low or plain, whichever way it got there", () => {
  assert.equal(pictureOf("three", "high"), "lit");
  assert.equal(pictureOf("three", "low"), "low");
  assert.equal(pictureOf("flat", "high"), "plain", "a browser with no graphics card is on the plain stage whatever its tier was");
  assert.equal(pictureOf("three", "flat"), "plain");
});

test("a graphics card's name is shortened out of the browser's wrapping", () => {
  assert.equal(shortGpu("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"), "NVIDIA GeForce RTX 3060");
  assert.equal(shortGpu("ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)"), "Intel(R) UHD Graphics 620");
  assert.equal(shortGpu("Apple M2"), "Apple M2");
  assert.equal(shortGpu("Google SwiftShader"), "Google SwiftShader");
  assert.equal(shortGpu(""), "");
  assert.equal(shortGpu(null), "");
  assert.ok(shortGpu("X".repeat(100)).length <= 34, "and never long");
});

test("a report holds only the picture, never anything else, and is trimmed to what a board can use", () => {
  const r = makeReport(sample());
  assert.deepEqual(r, { v: 1, picture: "lit", fps: 58, worst: 24, probe: 7.2, gpu: "NVIDIA GeForce RTX 3060", dpr: 1.5, size: [2560, 1271], losses: 0, failures: 0, hidden: false, scene: "The Rumour Mill" });
  assert.deepEqual(Object.keys(makeReport({ ...sample(), name: "Ingram", token: "secret", extra: 1 })).sort(), Object.keys(r).sort(), "nothing else gets through");
  const odd = makeReport({ backend: "flat", stats: {}, probe: null, gpu: 5, dpr: "x", size: [1e9, -4], losses: 1e9, failures: "z", scene: { a: 1 } });
  assert.deepEqual([odd.picture, odd.fps, odd.probe, odd.gpu, odd.dpr, odd.size, odd.losses, odd.failures, odd.scene], ["plain", null, null, "", 1, [20000, 0], 99, 0, ""]);
});

test("an incoming message is a report only if it says so and holds the right things; anything else is nothing", () => {
  const good = { type: "health", ...makeReport(sample()) };
  assert.deepEqual(readReport(good), makeReport(sample()));
  assert.equal(readReport({ ...good, v: 2 }), null, "a version it does not know");
  assert.equal(readReport({ ...good, picture: "holographic" }), null);
  assert.equal(readReport({ ...good, type: "chalk" }), null);
  assert.equal(readReport({ ...good, op: "ask" }), null, "a request for reports is not a report");
  assert.equal(readReport(null), null);
  assert.equal(readReport("health"), null);
  const trimmed = readReport({ ...good, fps: 1e9, gpu: "Y".repeat(500), scene: "S".repeat(500), hidden: "yes" });
  assert.equal(trimmed.fps, 1000);
  assert.ok(trimmed.gpu.length <= 34 && trimmed.scene.length <= 60);
  assert.equal(trimmed.hidden, false, "only a true is a true");
  assert.equal(readReport({ ...good, picture: "plain" }).picture, "plain");
  assert.equal(readReport({ ...good, picture: "low" }).picture, "low");
});

test("how a screen is doing: fine, plain, slow, struggling, away, or not heard from", () => {
  const at = now - 5000;
  const r = (over) => makeReport(sample(over));
  assert.equal(levelOf(r(), at, now), "ok");
  assert.equal(levelOf(r({ stats: { fps: HEALTH.fine - 1 } }), at, now), "warn");
  assert.equal(levelOf(r({ stats: { fps: HEALTH.poor - 1 } }), at, now), "bad");
  assert.equal(levelOf(r({ stats: { fps: HEALTH.fine } }), at, now), "ok", "forty is fine");
  assert.equal(levelOf(r({ backend: "flat", stats: { fps: 30 } }), at, now), "warn", "the plain stage at thirty is slow too");
  assert.equal(levelOf(r({ backend: "flat", stats: { fps: 60 } }), at, now), "plain", "plain and fast is just plain");
  assert.equal(levelOf(r({ losses: 2 }), at, now), "bad", "a graphics card lost twice");
  assert.equal(levelOf(r({ losses: 1 }), at, now), "ok", "once is recovered from");
  assert.equal(levelOf(r({ failures: 1 }), at, now), "bad");
  assert.equal(levelOf(r({ hidden: true, stats: { fps: 2 } }), at, now), "idle", "a background tab is not a slow computer");
  assert.equal(levelOf(r({ stats: { fps: null } }), at, now), "ok", "no frame rate yet is no complaint");
  assert.equal(levelOf(r(), now - HEALTH.stale - 1, now), "stale");
  assert.equal(levelOf(null, at, now), "stale");
});

test("a line for the board names the picture, the frame rate and, on hover, the card, the window and the trouble", () => {
  const entry = { report: makeReport(sample({ losses: 1, probe: 9.5 })), at: now - 3000 };
  const c = chipOf({ id: "u1", name: "Anne" }, entry, now);
  assert.deepEqual([c.id, c.name, c.level, c.text], ["u1", "Anne", "ok", "lit · 58 fps"]);
  for (const part of ["Anne: the lit stage at 58 fps, longest frame 24 ms", "Graphics: NVIDIA GeForce RTX 3060", "Window: 2560 × 1271 at 1.5x", "Start-up test: a frame costs 9.5 ms", "Lost its graphics context 1 time"]) assert.ok(c.tip.includes(part), part);
  const away = chipOf({ id: "u2", name: "Bo" }, { report: makeReport(sample({ hidden: true })), at: now }, now);
  assert.equal(away.text, "lit · away");
  const none = chipOf({ id: "u3", name: "Cy" }, undefined, now);
  assert.deepEqual([none.level, none.text], ["stale", "no stage"]);
  const flat = chipOf({ id: "u4", name: "Di" }, { report: makeReport(sample({ backend: "flat", stats: { fps: 30 } })), at: now }, now);
  assert.equal(flat.text, "plain · 30 fps");
  const unmeasured = chipOf({ id: "u5", name: "Ed" }, { report: makeReport(sample({ stats: { fps: null } })), at: now }, now);
  assert.equal(unmeasured.text, "lit · …", "no rate yet");
  assert.ok(unmeasured.tip.includes("not measured yet"));
  assert.equal(unmeasured.level, "ok");
});

test("the board puts the trouble first, counts the table, and its level is the worst there", () => {
  const people = [{ id: "a", name: "Anne" }, { id: "b", name: "Bo" }, { id: "c", name: "Cy" }, { id: "d", name: "Di" }, { id: "e", name: "Ed" }];
  const table = new Map([
    ["a", { report: makeReport(sample()), at: now }],
    ["b", { report: makeReport(sample({ stats: { fps: 31 } })), at: now }],
    ["c", { report: makeReport(sample({ backend: "flat", stats: { fps: 60 } })), at: now }],
    ["d", { report: makeReport(sample({ stats: { fps: 12 } })), at: now }]
  ]);
  const b = board(people, table, now);
  assert.deepEqual(b.chips.map((c) => c.name), ["Di", "Bo", "Cy", "Anne", "Ed"], "struggling, slow, plain, fine, then the one with no stage");
  assert.deepEqual(b.counts, { ok: 1, plain: 1, warn: 1, bad: 1, idle: 0, stale: 1 });
  assert.equal(b.level, "bad");
  assert.equal(b.line, "4 of 5 on a stage · 1 struggling · 1 slow · 1 on the plain stage");
  const calm = board(people.slice(0, 1), new Map([["a", { report: makeReport(sample()), at: now }]]), now);
  assert.equal(calm.level, "ok");
  assert.equal(calm.line, "1 of 1 on a stage");
  assert.equal(board([], new Map(), now).level, "stale", "an empty table has nothing to say");
  assert.equal(board(people, new Map(), now).line, "0 of 5 on a stage");
});
