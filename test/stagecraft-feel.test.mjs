// The feel of Stagecraft's puppets (the stick, the wiggle and the bang) is a requirement, not a feature
// (design/stagecraft/feel.md). These checks pin it three ways:
//   1. the numbers written in feel.md are the numbers the code produces, so the document cannot drift;
//   2. the invariants that make it safe (one bonk per meeting, a jolt never moves a card, the same inputs give
//      the same trajectory);
//   3. the scripted scene of plate 38 (the three.js spike), whose numbers renderer.md quotes.
// The model under test is the module's own scripts/core/puppets.mjs (it began in the lab and moved on 2026-10-01).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const lab = path.join(here, "..", "design", "stagecraft", "lab");
const core = path.join(here, "..", "module", "stagecraft", "scripts", "core");
const { createPuppet, stepPuppet, collide, FEEL } = await import(pathToFileURL(path.join(core, "puppets.mjs")).href);
const { runScript } = await import(pathToFileURL(path.join(lab, "spike-script.mjs")).href);
const feelDoc = readFileSync(path.join(here, "..", "design", "stagecraft", "feel.md"), "utf8");

const DT = 1 / 120;
const near = (actual, expected, tol, what) => assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual} is not within ${tol} of ${expected}`);

/* The three measurements feel.md tabulates ---------------------------------------------------------------------- */

/** A hand moving steadily for 0.4 s and stopping dead: the peak lean, and the time to settle after the stop. */
function stopTest(v) {
  const p = createPuppet({ id: "a", x: 0, y: 0, rod: 0, w: 196, h: 330 });
  p.heldBy = "u";
  let hand = 0; let peak = 0; let settle = null; let stopT = null;
  for (let t = 0; t < 4; t += DT) {
    if (t < 0.4) hand += v * DT; else if (stopT === null) stopT = t;
    p.target = { x: hand, y: 0 };
    stepPuppet(p, DT);
    peak = Math.max(peak, Math.abs(p.lean));
    if (stopT !== null && t > stopT + 0.1 && Math.abs(p.lean) < 0.5 && Math.abs(p.leanV) < 2 && settle === null) settle = t - stopT;
  }
  return { peak, settle };
}

/** A hand swinging side to side, steadily: the peak lean once it is up to speed. */
function wiggle(freq, amp) {
  const p = createPuppet({ id: "a", x: 0, y: 0, rod: 0, w: 196, h: 330 });
  p.heldBy = "u";
  let peak = 0;
  for (let t = 0; t < 3; t += DT) {
    p.target = { x: amp * Math.min(1, t / 0.35) * Math.sin(2 * Math.PI * freq * t), y: 0 };
    stepPuppet(p, DT);
    if (t > 1) peak = Math.max(peak, Math.abs(p.lean));
  }
  return { peak, top: Math.round(2 * Math.PI * freq * amp) };
}

/** A held card closing on a standing one: what the standing one does. */
function bang(closing) {
  const a = createPuppet({ id: "a", x: 0, y: 0, rod: 0, w: 196, h: 330 });
  const b = createPuppet({ id: "b", x: 400, y: 0, rod: 0, w: 196, h: 330 });
  a.heldBy = "u";
  const touching = new Set();
  let contacts = 0; let lean = 0; let jolt = 0; let settle = null; let hand = 0; let tContact = null;
  for (let t = 0; t < 4; t += DT) {
    hand += closing * DT;
    a.target = tContact === null ? { x: hand, y: 0 } : { x: a.x, y: 0 };
    stepPuppet(a, DT); stepPuppet(b, DT);
    const c = collide([a, b], touching);
    if (c.length) { contacts += c.length; if (tContact === null) tContact = t; }
    lean = Math.max(lean, Math.abs(b.lean));
    jolt = Math.max(jolt, Math.abs(b.jx));
    if (tContact !== null && t > tContact + 0.1 && Math.abs(b.lean) < 0.5 && Math.abs(b.jx) < 1 && settle === null) settle = t - tContact;
  }
  return { contacts, lean, jolt, settle, b };
}

/** The rows of a markdown table whose first cell starts with a number: [[cell, cell, ...], ...]. */
function numericRows(heading, nextHeading) {
  const from = feelDoc.indexOf(heading);
  assert.ok(from >= 0, `feel.md has no "${heading}"`);
  const to = nextHeading ? feelDoc.indexOf(nextHeading, from) : feelDoc.length;
  return feelDoc.slice(from, to).split("\n").filter((l) => /^\| [\d,.]+ \|/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
}
const num = (cell) => Number(cell.replace(/[^\d.-]/g, ""));

/* 1. The document is the code ------------------------------------------------------------------------------------ */

test("the constants table in feel.md is FEEL in puppets.mjs", () => {
  const rows = feelDoc.split("\n").filter((l) => /^\| `[a-zA-Z]+` \| [\d.]+ \|/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  assert.ok(rows.length >= 11, `expected the eleven constants, found ${rows.length}`);
  for (const [name, value] of rows) {
    const key = name.replaceAll("`", "");
    assert.ok(key in FEEL, `${key} is documented but is not in FEEL`);
    assert.equal(FEEL[key], Number(value), `${key}: feel.md says ${value}, FEEL says ${FEEL[key]}`);
  }
});

test("the stop table in feel.md is what a hand that stops dead does", () => {
  const rows = numericRows("**What it does, measured** (a hand moving steadily", "**A furious wiggle**");
  assert.equal(rows.length, 6);
  for (const [speed, lean, settle] of rows) {
    const r = stopTest(num(speed));
    near(r.peak, num(lean), 0.06, `lean at ${speed} px/s`);
    near(r.settle, num(settle), 0.02, `settle at ${speed} px/s`);
  }
});

test("the wiggle table in feel.md is what a swinging hand does", () => {
  const rows = numericRows("**A furious wiggle**", "It peaks near two swings");
  assert.equal(rows.length, 6);
  for (const [freq, amp, top, lean] of rows) {
    const r = wiggle(num(freq), num(amp));
    assert.equal(r.top, num(top), `top speed at ${freq} swings`);
    near(r.peak, num(lean), 0.06, `peak lean at ${freq} swings of ${amp} px`);
  }
});

test("the bang table in feel.md is what a held card does to a standing one", () => {
  const rows = numericRows("**What it does, measured** (a held card closing", "**How it is presented.**");
  assert.equal(rows.length, 5);
  for (const [closing, lean, jolt, settle] of rows) {
    const r = bang(num(closing));
    assert.equal(r.contacts, 1, `one bonk at ${closing} px/s`);
    near(r.lean, num(lean), 0.06, `knocked lean at ${closing} px/s`);
    near(r.jolt, num(jolt), 0.06, `jolt at ${closing} px/s`);
    near(r.settle, num(settle), 0.02, `settle at ${closing} px/s`);
  }
});

/* 2. The invariants ----------------------------------------------------------------------------------------------- */

test("K6: no bonk below the bonk speed, one bonk per meeting above it, none when nobody holds a card", () => {
  assert.equal(bang(FEEL.bonkSpeed - 20).contacts, 0, "slower than bonkSpeed the cards slide past");
  assert.equal(bang(FEEL.bonkSpeed + 30).contacts, 1);
  assert.equal(bang(2500).contacts, 1, "a hard hit is still one bonk, not one per step of the overlap");
  const a = createPuppet({ id: "a", x: 0, y: 0, rod: 0, w: 196, h: 330 });
  const b = createPuppet({ id: "b", x: 100, y: 0, rod: 0, w: 196, h: 330 }); // overlapping, nobody holding either
  assert.deepEqual(collide([a, b], new Set()), []);
});

test("K7: a jolt never exceeds maxJolt and a bang never moves where a card stands", () => {
  const r = bang(20000);
  assert.ok(r.jolt <= FEEL.maxJolt + 1e-9, `jolt ${r.jolt} exceeds maxJolt ${FEEL.maxJolt}`);
  assert.ok(Math.abs(r.b.x - 400) < 1e-6, "the knocked card's grip never moved");
  assert.ok(Math.abs(r.b.restX - 400) < 1e-6, "and neither did where it rests");
  assert.ok(Math.abs(r.b.jx) < 0.5, "and its jolt has sprung back");
});

test("K5: after the hand stops, the lean is under 0.5 degrees within a second, up to 3,500 px/s", () => {
  for (const v of [300, 600, 1500, 2500, 3500]) assert.ok(stopTest(v).settle < 1, `${v} px/s settles in ${stopTest(v).settle}`);
});

test("the lean is bounded: however hard the hand is shaken the card never flies apart", () => {
  const p = createPuppet({ id: "a", x: 0, y: 0, rod: 0, w: 196, h: 330 });
  p.heldBy = "u";
  let peak = 0;
  for (let t = 0; t < 5; t += DT) {
    p.target = { x: 400 * Math.sin(2 * Math.PI * 9 * t), y: 0 };       // a frantic nine swings a second, 400 px each way
    stepPuppet(p, DT);
    peak = Math.max(peak, Math.abs(p.lean));
  }
  assert.ok(peak <= FEEL.maxLean * 1.6 + 1e-9, `lean ${peak} passed the hard clamp ${FEEL.maxLean * 1.6}`);
});

test("K8: the same inputs give the same trajectory, every time", () => {
  const run = () => { const r = runScript(); return JSON.stringify({ b: r.bonks, y: [r.yumiko.x, r.yumiko.lean], t: [r.tama.x, r.tama.lean, r.tama.jx] }); };
  assert.equal(run(), run());
});

/* 3. Plate 38's scripted scene ------------------------------------------------------------------------------------ */

test("plate 38: Yumiko is wiggled in the open stretch of bar and bangs into Tama, once, at 2.258 s", () => {
  const r = runScript();
  assert.equal(r.bonks.length, 1, "exactly one bonk in the whole scene");
  const [b] = r.bonks;
  assert.deepEqual([b.a, b.b], ["yumiko", "tama"], "and it is Tama, not Etsuko");
  near(b.t, 2.258, 0.003, "the bonk time renderer.md quotes");
  near(b.speed, 1510, 15, "the closing speed renderer.md quotes");
});

test("plate 38: the leans renderer.md quotes", () => {
  const r = runScript();
  near(r.wigglePeak, 8.5, 0.1, "peak lean through the wiggle");
  near(r.chargePeak, 9.9, 0.1, "peak lean as it charges");
  near(r.tamaPeak, 7.7, 0.1, "the lean of the card it hits");
  near(r.gripTop, 1767, 15, "the grip's top speed");
});

test("plate 38: the three stand in one lane, left to right, with room to wiggle between them", () => {
  const { where } = runScript(0.1);
  assert.ok(where.etsuko.X < where.yumiko.X && where.yumiko.X < where.tama.X);
  const lane = [where.etsuko.Z, where.yumiko.Z, where.tama.Z];
  assert.ok(Math.max(...lane) - Math.min(...lane) < 150, `one lane: ${lane}`);
  assert.equal(where.yumiko.Z, where.tama.Z, "Yumiko and Tama share a depth exactly, so the bang is a fair one");
});
