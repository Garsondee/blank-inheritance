// Emotes (core/emotes.mjs): the cards' own symbols. That the set is whole and in order, that every picture is one an image
// can draw (no type, since no web font reaches an SVG drawn as an image; nothing fetched), that every colour is one of the
// card's own, that nothing is drawn outside the box the renderers show, and that every motion is one the pose knows.

import { test } from "node:test";
import assert from "node:assert/strict";
import { EMOTES, EMOTE_ORDER, WHEEL, EMOTE_PALETTE, emotePose } from "../scripts/core/emotes.mjs";

const KINDS = ["face", "balloon", "mark"];
const MOTIONS = ["drip", "pulse", "float", "twinkle", "fall", "flicker", "rise", "spin", "bob", "shake", "tilt", "wave", "still"];

test("the set is whole: every emote is offered once, and the default wheel is drawn from it", () => {
  assert.equal(new Set(EMOTE_ORDER).size, EMOTE_ORDER.length, "an emote is offered twice");
  assert.deepEqual([...EMOTE_ORDER].sort(), Object.keys(EMOTES).sort(), "the order and the set differ");
  assert.equal(WHEEL.length, 8);
  for (const id of WHEEL) assert.ok(EMOTES[id], `the wheel offers ${id}, which is not an emote`);
  for (const [id, e] of Object.entries(EMOTES)) {
    assert.ok(KINDS.includes(e.kind), `${id}: kind "${e.kind}"`);
    assert.ok(typeof e.label === "string" && e.label.length > 0 && e.label.length <= 14, `${id}: a short label`);
  }
});

test("the set has the manga faces as well as the marks", () => {
  const kinds = (k) => EMOTE_ORDER.filter((id) => EMOTES[id].kind === k);
  assert.ok(kinds("face").length >= 8, "faces");
  assert.ok(kinds("mark").length >= 12, "marks");
  // offered faces first, then balloons, then marks
  const rank = EMOTE_ORDER.map((id) => KINDS.indexOf(EMOTES[id].kind));
  assert.deepEqual(rank, [...rank].sort((a, b) => a - b));
});

test("every picture is one an image can draw: one svg on the renderers' box, no type, nothing fetched", () => {
  for (const [id, { svg }] of Object.entries(EMOTES)) {
    assert.match(svg, /^<svg viewBox="-8 -8 116 116" xmlns="http:\/\/www\.w3\.org\/2000\/svg">[\s\S]*<\/svg>$/, `${id}: one svg on the box`);
    assert.doesNotMatch(svg, /<text|font-family/, `${id}: set in type, which an image cannot load a font for`);
    assert.doesNotMatch(svg, /href|url\(|<image|<style|<script/, `${id}: reaches for something outside itself`);
    // only paths and groups, every group closed, every path closed on itself
    const tags = [...svg.matchAll(/<\/?([a-z]+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(tags)].filter((t) => !["svg", "g", "path"].includes(t)), [], `${id}: an element the print does not use`);
    assert.equal((svg.match(/<g /g) ?? []).length, (svg.match(/<\/g>/g) ?? []).length, `${id}: a group left open`);
    assert.equal((svg.match(/<path /g) ?? []).length, (svg.match(/\/>/g) ?? []).length, `${id}: a path left open`);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${id}: a number went wrong`);
  }
});

test("every colour is one of the card's own: its ink, its cream, the brass and the few spot colours", () => {
  const palette = new Set(Object.values(EMOTE_PALETTE).map((c) => c.toLowerCase()));
  for (const [id, { svg }] of Object.entries(EMOTES)) {
    const used = [...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1].toLowerCase()).filter((c) => c !== "none");
    const strangers = [...new Set(used)].filter((c) => !palette.has(c));
    assert.deepEqual(strangers, [], `${id} uses colours that are not the card's`);
  }
});

/** The points a path passes through (every command is absolute: M L Q C take pairs; an arc's end is its last pair). */
function pointsOf(d) {
  const tokens = d.match(/[MLQCAZ]|-?\d*\.?\d+(?:e-?\d+)?/g);
  const points = [];
  let cmd = null;
  for (let i = 0; i < tokens.length;) {
    if (/[MLQCAZ]/.test(tokens[i])) { cmd = tokens[i++]; continue; }
    if (cmd === "A") { points.push([Number(tokens[i + 5]), Number(tokens[i + 6])]); i += 7; } else { points.push([Number(tokens[i]), Number(tokens[i + 1])]); i += 2; }
  }
  return points;
}

test("nothing is drawn outside the box the renderers show, keyline included", () => {
  for (const [id, { svg }] of Object.entries(EMOTES)) {
    const out = [...svg.matchAll(/ d="([^"]+)"/g)].flatMap((m) => pointsOf(m[1])).filter(([x, y]) => x < -5 || x > 105 || y < -5 || y > 105);
    assert.deepEqual(out, [], `${id} reaches past the edge`);
  }
});

test("every motion is one the pose knows, and it pops on and fades out", () => {
  for (const [id, e] of Object.entries(EMOTES)) {
    assert.ok(MOTIONS.includes(e.motion), `${id}: motion "${e.motion}"`);
    for (const t of [0, 0.1, 0.5, 1.5, 3]) {
      const p = emotePose(e.motion, t, 7, 3.2);
      for (const k of ["x", "y", "r", "s", "o"]) assert.ok(Number.isFinite(p[k]), `${id} at ${t}s: ${k}`);
    }
    assert.ok(emotePose(e.motion, 0, 7).s < 0.05, `${id} starts small`);
    assert.ok(emotePose(e.motion, 3.2, 7, 3.2).o < 0.01, `${id} is gone at the end of its life`);
  }
});

/* ------------------------------------------------------------------------------------------------ in the game */

import { emoteMotion, EMOTE_PIVOT } from "../scripts/core/emotes.mjs";
import { Stage } from "../scripts/core/stage.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
/** Run the stage on (it takes time in steps of a twentieth of a second at most), then read one card's emote. */
const run = (stage, seconds) => { for (let left = seconds; left > 1e-9; left -= 0.05) stage.advance(Math.min(0.05, left)); };
const emoteAt = (stage, id, seconds) => { run(stage, seconds); return stage.snapshot().cards.find((c) => c.id === id).emote; };

test("every motion keeps its emote beside its card for the whole time it is shown", () => {
  for (const motion of MOTIONS) {
    for (let t = 0; t <= 5; t += 0.05) {
      const m = emoteMotion(motion, t, 1234);
      assert.ok(Math.abs(m.x) <= 12 && Math.abs(m.y) <= 40, `${motion} at ${t.toFixed(2)}s drifts to ${m.x.toFixed(1)}, ${m.y.toFixed(1)}`);
      assert.ok(m.s > 0.8 && m.s < 1.3 && m.o > 0.3 && m.o <= 1, `${motion} at ${t.toFixed(2)}s`);
      if (motion !== "spin") assert.ok(Math.abs(m.r) <= 15, `${motion} turns too far`);
    }
  }
  assert.ok(EMOTE_PIVOT > 0.5 && EMOTE_PIVOT < 1, "an emote turns about a point below its middle");
});

test("on the stage an emote moves as its own motion says: a drip runs down, a wave turns", () => {
  const stage = new Stage(scene, [
    { id: "ana", name: "Ana", at: [0.3, 0.9], emote: { id: "sweat", t0: 0 } },
    { id: "bo", name: "Bo", at: [0.6, 0.9], emote: { id: "hand", t0: 0 } }
  ]);
  const first = emoteAt(stage, "ana", 0.3);
  const later = emoteAt(stage, "ana", 1.2);
  assert.equal(EMOTES.sweat.motion, "drip");
  assert.ok(later.y > first.y + 4, "the sweat drop runs down");
  assert.ok(Math.abs(stage.snapshot().cards.find((c) => c.id === "bo").emote.r) > 1, "the raised hand waves");
});

test("the same emote on two cards moves out of step", () => {
  const stage = new Stage(scene, [
    { id: "ana", name: "Ana", at: [0.3, 0.9], emote: { id: "ellipsis", t0: 0 } },
    { id: "bo", name: "Bo", at: [0.6, 0.9], emote: { id: "ellipsis", t0: 0 } }
  ]);
  run(stage, 1);
  const [a, b] = stage.snapshot().cards.map((c) => c.emote);
  assert.notEqual(a.y.toFixed(3), b.y.toFixed(3));
});

test("in the calm version an emote pops on and fades, and never shakes, drifts, turns or flickers", () => {
  const stage = new Stage(scene, [{ id: "ana", name: "Ana", at: [0.3, 0.9], emote: { id: "idea", t0: 0 } }]);
  stage.setCalm(true);
  for (let i = 0; i < 40; i++) {
    const e = emoteAt(stage, "ana", 0.05);
    assert.deepEqual([e.x, e.y, e.r], [0, 0, 0]);
    if (e.age > 0.3 && e.age < 4.4) assert.equal(e.opacity, 1, "no flicker");
  }
  stage.setCalm(false);
  run(stage, 6 - (stage.time % 6) + 0.1);                   // the next showing begins: the bulb flickers on
  const flickers = Array.from({ length: 12 }, () => emoteAt(stage, "ana", 0.03).opacity);
  assert.ok(flickers.some((o) => o < 0.5), "out of the calm version, the bulb flickers on");
});
