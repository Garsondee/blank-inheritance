// The brush (core/brush.mjs): how a hand's movement becomes dabs of paint. Smoothness, steadiness, pressure, spacing and
// the shape of each tip are numbers, held here to what was asked for (Ingram, 2026-10-03: "a smooth art experience ...
// more precise ... less clunky"). The pixels themselves are checked in the browser (bench/chalk-check.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TOOLS, TOOL_NAMES, STEADY, Steady, Feel, Stroke, lineDabs, dabBounds, tipAlpha, TIP_CORE, rng, hashSeed,
  hexToHsv, hsvToHex, rainbowAt, cleanHex
} from "../scripts/core/brush.mjs";

/** Samples along a path, one per `step` pixels, with a little hand tremor if asked. */
function samples(path, { step = 2, tremor = 0, seed = 7 } = {}) {
  const r = rng(seed);
  const out = [];
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1];
    const [bx, by] = path[i];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      out.push({ x: ax + ((bx - ax) * k) / n + (r() * 2 - 1) * tremor, y: ay + ((by - ay) * k) / n + (r() * 2 - 1) * tremor, p: 0.8 });
    }
  }
  return out;
}

function paint(path, opts = {}, sampling = {}) {
  const s = new Stroke({ seed: 42, ...opts });
  const dabs = [];
  for (const x of samples(path, sampling)) dabs.push(...s.add(x));
  dabs.push(...s.finish());
  return dabs;
}

test("every tool is described, with sizes that make sense and a kind the painter knows", () => {
  assert.deepEqual(TOOL_NAMES, ["chalk", "magic", "pencil", "brush", "spray", "smudge", "eraser", "fill"]);
  for (const [name, t] of Object.entries(TOOLS)) {
    assert.ok(["paint", "spray", "erase", "smudge", "fill"].includes(t.kind), name);
    if (t.kind === "fill") continue;
    assert.ok(t.size.min > 0 && t.size.min <= t.size.initial && t.size.initial <= t.size.max, `${name}: sizes`);
    assert.ok(t.spacing > 0 && t.spacing <= 0.2, `${name}: dabs close enough to make a line`);
    assert.ok(t.flow > 0 && t.flow <= 1 && t.opacity > 0 && t.opacity <= 1, `${name}: flow and opacity`);
  }
  assert.ok(TOOLS.pencil.size.min <= 1, "the pencil goes down to a single pixel, for writing small");
  assert.ok(TOOLS.chalk.size.initial <= 8, "chalk stays small by default (her call: 35% smaller than it first was)");
  assert.equal(TOOLS.magic.magic, true);
  assert.deepEqual(STEADY.slice(0, 1), [0], "steady hand can be off");
});

test("a straight stroke lays its dabs evenly, the tool's spacing apart, from end to end", () => {
  const dabs = paint([[100, 100], [500, 100]], { tool: "pencil", size: 10 });
  assert.ok(dabs.length > 20);
  const gaps = dabs.slice(1).map((d, i) => Math.hypot(d.x - dabs[i].x, d.y - dabs[i].y));
  const want = TOOLS.pencil.spacing * 10;
  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  assert.ok(Math.abs(mean - want) < want * 0.5, `dabs ${mean.toFixed(2)} apart, the spacing says ${want}`);
  assert.ok(Math.max(...gaps) < want * 2.2, "no gap in the line");
  assert.ok(Math.abs(dabs[0].x - 100) < 3 && Math.abs(dabs.at(-1).x - 500) < 3, "it runs the whole way");
  for (const d of dabs) assert.ok(Math.abs(d.y - 100) < 0.5, "and stays on the line");
});

test("a curve comes out round, not as straight pieces joined at corners", () => {
  const circle = Array.from({ length: 25 }, (_, i) => [400 + 200 * Math.cos((i / 24) * Math.PI * 2), 400 + 200 * Math.sin((i / 24) * Math.PI * 2)]);
  const dabs = paint(circle, { tool: "pencil", size: 4 }, { step: 40 });         // only a few samples per side of the polygon
  const off = dabs.map((d) => Math.abs(Math.hypot(d.x - 400, d.y - 400) - 200));
  assert.ok(Math.max(...off) < 4, `every dab lies close to the circle (worst ${Math.max(...off).toFixed(2)} away), not on the polygon's chords`);
});

test("steady hand: a trembling hand draws a smoother line, and still ends where the hand stopped", () => {
  const path = [[100, 300], [700, 300]];
  // how far the line wanders from straight along its body, on average (both start on the same trembling first sample)
  const wobble = (dabs) => { const body = dabs.slice(Math.floor(dabs.length * 0.1), Math.floor(dabs.length * 0.9)); return body.reduce((s, d) => s + Math.abs(d.y - 300), 0) / body.length; };
  const shaky = paint(path, { tool: "pencil", size: 4, steady: 0 }, { tremor: 6 });
  const steadied = paint(path, { tool: "pencil", size: 4, steady: STEADY[3] }, { tremor: 6 });
  assert.ok(wobble(steadied) < wobble(shaky) * 0.6, `steadied ${wobble(steadied).toFixed(1)} against ${wobble(shaky).toFixed(1)}`);
  assert.ok(Math.abs(steadied.at(-1).x - 700) < 12, `it catches up to the end (${steadied.at(-1).x.toFixed(1)})`);
  const s = new Steady(10);
  assert.equal(s.push({ x: 0, y: 0 }).length, 1, "the first touch paints");
  assert.equal(s.push({ x: 5, y: 0 }).length, 0, "within the string, the brush waits");
  assert.equal(s.push({ x: 25, y: 0 })[0].x, 15, "past it, the brush follows by the difference");
});

test("pressure: a pen's pressure widens the line; a mouse makes its own from speed, slow pressing harder", () => {
  const soft = paint([[0, 0], [300, 0]].map(([x, y]) => [x, y]), { tool: "brush", size: 40 });
  const s1 = new Stroke({ tool: "brush", size: 40, seed: 1 });
  const s2 = new Stroke({ tool: "brush", size: 40, seed: 1 });
  const light = [];
  const hard = [];
  for (let x = 0; x <= 300; x += 3) { light.push(...s1.add({ x, y: 0, p: 0.2 })); hard.push(...s2.add({ x, y: 0, p: 1 })); }
  const mean = (d) => d.reduce((s, x) => s + x.size, 0) / d.length;
  assert.ok(mean(hard) > mean(light) * 1.4, "pressing harder makes it wider");
  assert.ok(soft.length > 0);
  const f = new Feel();
  f.pressure({ x: 0, y: 0, t: 0 });
  let slow = 0;
  for (let i = 1; i < 20; i++) slow = f.pressure({ x: i * 0.2, y: 0, t: i * 16 });
  const g = new Feel();
  g.pressure({ x: 0, y: 0, t: 0 });
  let fast = 0;
  for (let i = 1; i < 20; i++) fast = g.pressure({ x: i * 60, y: 0, t: i * 16 });
  assert.ok(slow > fast + 0.2, `slow ${slow.toFixed(2)}, quick ${fast.toFixed(2)}`);
  assert.equal(new Feel().pressure({ x: 0, y: 0, t: 0, pressure: 0.3, pointerType: "pen" }), 0.3, "a pen's own pressure");
});

test("the same hand and the same seed give the same dabs, on any screen", () => {
  const path = [[50, 50], [300, 200], [500, 90]];
  assert.deepEqual(paint(path, { tool: "chalk" }), paint(path, { tool: "chalk" }));
  assert.notDeepEqual(paint(path, { tool: "chalk", seed: 1 }), paint(path, { tool: "chalk", seed: 2 }), "another stroke grains differently");
  assert.equal(hashSeed("abc"), hashSeed("abc"));
  assert.notEqual(hashSeed("abc"), hashSeed("abd"));
});

test("a tap leaves a dot; a pencil line grows in from a point; a straight line runs exactly from a to b", () => {
  const tap = new Stroke({ tool: "chalk", seed: 3 });
  const dot = [...tap.add({ x: 10, y: 10, p: 0.7 }), ...tap.finish()];
  assert.equal(dot.length, 1);
  const pencil = paint([[0, 0], [200, 0]], { tool: "pencil", size: 8 });
  assert.ok(pencil[0].size < pencil.at(-1).size * 0.6, "a pencil line starts thin");
  const line = lineDabs({ x: 0, y: 0 }, { x: 300, y: 300 }, { tool: "chalk", size: 6, seed: 9 });
  for (const d of line) assert.ok(Math.abs(d.x - d.y) < TOOLS.chalk.scatter * 6 * 2 + 0.5, "on the diagonal");
  const b = dabBounds(line);
  assert.ok(b.x0 < 5 && b.x1 > 295 && b.y1 > 295);
  assert.equal(dabBounds([]), null);
});

test("the chalk tip has a solid core and only a slightly fuzzy edge, bitten only at the edge; each tip fades to nothing", () => {
  for (let r = 0; r <= TIP_CORE.chalk; r += 0.05) for (const n of [0, 0.5, 1]) assert.ok(tipAlpha("chalk", r, n) >= 0.95, `solid at ${r}`);
  const edge = [0.7, 0.8, 0.9].map((r) => tipAlpha("chalk", r, 1));
  assert.ok(edge[0] > edge[1] && edge[1] > edge[2], "it fades outwards");
  assert.ok(tipAlpha("chalk", 0.9, 0) < tipAlpha("chalk", 0.9, 1) * 0.5, "a bite lets the wall show through at the edge");
  for (const tip of ["chalk", "pencil", "round", "speck", "soft"]) {
    assert.equal(tipAlpha(tip, 1), 0, `${tip} ends at its edge`);
    assert.ok(tipAlpha(tip, 0, 0.5) > 0.85, `${tip} is solid in the middle`);
  }
  assert.ok(tipAlpha("soft", 0.6) < tipAlpha("pencil", 0.6, 0.5), "a brush is softer than a pencil");
});

test("colour: any colour round-trips, magic chalk's rainbow turns as the stroke goes, and only real colours are taken", () => {
  for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#f2ecdc", "#123456"]) assert.equal(hsvToHex(hexToHsv(hex)), hex);
  const a = hexToHsv(rainbowAt("#ff0000", 0));
  const b = hexToHsv(rainbowAt("#ff0000", 450));
  assert.ok(Math.abs(b.h - a.h - 180) < 2, `half the way round in 450 pixels (${a.h} to ${b.h})`);
  assert.equal(cleanHex("AABBCC"), "#aabbcc");
  assert.equal(cleanHex("#abc"), null);
  assert.equal(cleanHex("red"), null);
});
