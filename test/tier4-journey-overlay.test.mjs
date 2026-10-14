// Tier 4 -- the journey overlay, EXECUTED against a recording stand-in for PIXI and a fake canvas ticker (foundry/journey-overlay.mjs).
//
// What is held here: routes are drawn in the way each is travelled, a journey with a problem glows, a highlighted one carries arrows, the token is where the
// game's token would be at the same moment (core/journey-timeline.mjs), the covered ground is bright behind it, the camera frames each step once, pausing really
// stops the clock, a second destroy never happens, and a scene change (the container going) cannot leave a ticker running.

import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { installPixi, Container, Graphics } from "./support/mock-pixi.mjs";
import { JourneyOverlay } from "../module/blank-inheritance/scripts/foundry/journey-overlay.mjs";
import { buildSteps, buildTimeline, timelineAt } from "../module/blank-inheritance/scripts/core/journey-timeline.mjs";
import { MODE_STYLE, PROBLEM_COLORS } from "../module/blank-inheritance/scripts/core/journey-draw.mjs";
import { analyseDeparture } from "./support/journey-fixture-world.mjs";

let restore;
let host;
let overlay;
let container;
let clock;
let tickers;
let frames;
let scale;

beforeEach(() => {
  restore = installPixi();
  clock = 0;
  tickers = new Set();
  frames = [];
  scale = 0.5;
  host = {
    px: (n) => n / scale,
    scale: () => scale,
    toScene: (p) => ({ x: p.x * 2 + 100, y: p.y * 2 + 50 }),
    frame: (box, opts) => frames.push({ box, opts }),
    ticker: { add: (fn) => tickers.add(fn), remove: (fn) => tickers.delete(fn) },
    now: () => clock
  };
  overlay = new JourneyOverlay(host);
  container = new Container();
  overlay.attach(container);
});
afterEach(() => restore());

/** Run the canvas ticker for `ms`, in frames of 16 ms. */
const run = (ms) => { for (let left = ms; left > 0; left -= 16) { clock += Math.min(16, left); for (const fn of [...tickers]) fn(Math.min(16, left)); } };

const world = analyseDeparture();
const asLeg = (leg) => { const r = world.analysis.legs.get(leg.id); return { id: leg.id, kind: leg.kind, label: leg.label, runs: r.runs, worst: r.issues.reduce((w, i) => (i.severity === "error" ? "error" : w), null) }; };
const legs = world.model.legs.map(asLeg);
const layersOf = () => container.children.filter((c) => c instanceof Graphics);
const routes = () => layersOf()[1];
const focus = () => layersOf()[2];
const trail = () => layersOf()[3];
const stopsLayer = () => layersOf()[4];
const tokens = () => layersOf()[5];
const timelineOf = (steps = buildSteps(world.model, "ep")) => buildTimeline(steps, world.analysis);

test("attaching makes the drawing layers once; every route is drawn in the colour of the way it is travelled, by screen-pixel weight at the current zoom", () => {
  overlay.setJourneys({ legs, stops: [] });
  const strokes = routes().strokes();
  assert.ok(strokes.length > 0);
  const colours = new Set(strokes.map((s) => s.color));
  assert.ok(colours.has(MODE_STYLE.car.color), "a ride by car");
  assert.ok(colours.has(MODE_STYLE.walk.color), "the walk at each end");
  const car = strokes.find((s) => s.color === MODE_STYLE.car.color);
  assert.equal(car.width, MODE_STYLE.car.weight / scale, "a screen weight converted at the current zoom");
  assert.equal(layersOf().length, 6);
});

test("walking is dotted and riding is solid", () => {
  overlay.setJourneys({ legs, stops: [] });
  const walk = routes().strokes().filter((s) => s.color === MODE_STYLE.walk.color);
  const car = routes().strokes().filter((s) => s.color === MODE_STYLE.car.color);
  assert.ok(walk.every((s) => s.segments.length >= 1));
  // a solid ride is one polyline: a moveTo then many lineTo from a single pen position; a dotted walk is many short disconnected segments
  const carSegments = car.reduce((n, s) => n + s.segments.length, 0);
  assert.ok(carSegments >= 4, "the ride follows the road's nodes");
  const walkLengths = walk.flatMap((s) => s.segments.map(([a, b]) => Math.hypot(b.x - a.x, b.y - a.y)));
  assert.ok(walkLengths.every((l) => l <= MODE_STYLE.walk.dash[0] / scale + 1e-6), "no dash is longer than the dash length");
});

test("a journey with an error glows in the problem colour, wider than the line itself, under it", () => {
  const broken = legs.map((l, i) => (i === 0 ? { ...l, worst: "error" } : l));
  overlay.setJourneys({ legs: broken, stops: [] });
  const strokes = routes().strokes();
  const glow = strokes.filter((s) => s.color === PROBLEM_COLORS.error);
  assert.ok(glow.length > 0);
  assert.ok(glow[0].width > MODE_STYLE.car.weight / scale, "wider than the line");
  assert.ok(glow[0].alpha < 1);
  const firstGlow = strokes.findIndex((s) => s.color === PROBLEM_COLORS.error);
  const firstCar = strokes.findIndex((s) => s.color === MODE_STYLE.car.color);
  assert.ok(firstGlow >= 0 && firstGlow < firstCar, "the glow is drawn with its own journey, beneath its line");
  overlay.setJourneys({ legs: legs.map((l) => ({ ...l, worst: "warn" })), stops: [] });
  assert.ok(routes().strokes().some((s) => s.color === PROBLEM_COLORS.warn));
});

test("a highlighted journey is drawn bold on the focus layer with arrows along it; the others fade", () => {
  overlay.setJourneys({ legs, stops: [] });
  const before = routes().strokes().filter((s) => s.color === MODE_STYLE.car.color)[0].alpha;
  overlay.setHighlight([legs[0].id]);
  assert.ok(focus().strokes().length > 0, "the highlighted journey is on the focus layer");
  const arrows = focus().strokes().filter((s) => s.color === 0xffffff);
  assert.ok(arrows.length > 0 && arrows[0].segments.length >= 2, "white chevrons point the way it goes");
  const faded = routes().strokes().filter((s) => s.color === MODE_STYLE.car.color)[0].alpha;
  assert.ok(faded < before, "everything else steps back");
  const withoutRest = new Set(focus().strokes().map((s) => s.width));
  assert.ok([...withoutRest].some((w) => w > MODE_STYLE.car.weight / scale), "bolder than a plain route");
  overlay.setHighlight([legs[0].id], { showAll: false });
  assert.equal(routes().strokes().length, 0, "or not drawn at all");
  assert.ok(focus().strokes().length > 0);
});

test("zoomed out, a stop is named only where it is an end of a journey being looked at; zoomed in, every stop is named", () => {
  const stops = [{ n: 1, point: { x: 0, y: 160 }, title: "One", slotKey: "a" }, { n: 2, point: { x: 3900, y: 160 }, title: "Two", slotKey: "b" }, { n: 3, point: { x: 1000, y: 160 }, title: "Three", slotKey: "c" }];
  const names = () => container.children.filter((c) => c.text !== undefined && !/^\d+$/.test(c.text)).map((t) => t.text).sort();
  scale = 0.1;
  overlay.setJourneys({ legs: legs.map((l, i) => (i === 0 ? { ...l, ends: ["a", "b"] } : { ...l, ends: ["x", "y"] })), stops });
  assert.deepEqual(names(), [], "nothing is being looked at: numbers only");
  overlay.setHighlight([legs[0].id]);
  assert.deepEqual(names(), ["One", "Two"], "the two ends of the journey being looked at");
  scale = 0.6;
  overlay.redraw();
  assert.deepEqual(names(), ["One", "Three", "Two"], "close enough to read them, all of them");
});

test("the journeys the players choose between are drawn lighter than the main road", () => {
  const cut = { ...legs[0], kind: "cut" };
  const option = { ...legs[0], id: "leg:option", kind: "option" };
  overlay.setJourneys({ legs: [cut, option], stops: [] });
  const alphas = routes().strokes().filter((s) => s.color === MODE_STYLE.car.color).map((s) => s.alpha);
  assert.equal(alphas.length, 2);
  assert.ok(alphas[1] < alphas[0], `${alphas}`);
});

test("a highlight on a journey that is no longer there is dropped, not drawn", () => {
  overlay.setJourneys({ legs, stops: [] });
  overlay.setHighlight(["leg:nothing", legs[0].id]);
  overlay.setJourneys({ legs: legs.slice(1), stops: [] });
  assert.equal(focus().strokes().length, 0);
});

test("stops are numbered discs where the scenes are, labelled when asked, converted to the scene by the calibration", () => {
  overlay.setJourneys({ legs: [], stops: [{ n: 1, point: { x: 0, y: 160 }, title: "One" }, { n: 2, point: { x: 3900, y: 160 }, title: "Two" }] });
  const discs = stopsLayer().circles();
  assert.equal(discs.length, 2);
  assert.deepEqual([discs[0].x, discs[0].y], [100, 370], "image (0,160) is scene (100,370)");
  assert.equal(discs[0].r, 11 / scale);
  const texts = container.children.filter((c) => c.text !== undefined).map((t) => t.text);
  assert.deepEqual(texts.sort(), ["1", "2", "One", "Two"].sort());
  overlay.setStopLabels(false);
  assert.deepEqual(container.children.filter((c) => c.text !== undefined).map((t) => t.text).sort(), ["1", "2"]);
});

test("redrawing at a new zoom redraws at the new size, and leaves no text behind", () => {
  overlay.setJourneys({ legs, stops: [{ n: 1, point: { x: 0, y: 160 }, title: "One" }] });
  const w1 = routes().strokes().find((s) => s.color === MODE_STYLE.car.color).width;
  const textsBefore = container.children.filter((c) => c.text !== undefined).length;
  scale = 0.25;
  overlay.redraw();
  const w2 = routes().strokes().find((s) => s.color === MODE_STYLE.car.color).width;
  assert.equal(w2, w1 * 2);
  assert.equal(textsBefore, 2, "zoomed in, a stop's number and its name");
  assert.equal(container.children.filter((c) => c.text !== undefined).length, 1, "zoomed out, only the number: the old text is destroyed and the new text replaces it");
  assert.equal(container.children.filter((c) => c.destroyed).length, 0, "nothing destroyed is left attached");
});

/* ---------------------------------------------------------------- playing */

test("playing puts the token where the game's token would be at that moment, and the ground it has covered bright behind it", () => {
  const timeline = timelineOf();
  const ticks = [];
  assert.equal(overlay.play(timeline, { onTick: (i) => ticks.push(i) }), true);
  overlay.setJourneys({ legs, stops: [] });
  assert.equal(tickers.size, 1, "one ticker callback while playing");
  run(2000);
  const expected = timelineAt(timeline, 2000).tokens[0];
  const circles = tokens().circles();
  assert.equal(circles.length, 1);
  assert.ok(Math.abs(circles[0].x - (expected.x * 2 + 100)) < 1 && Math.abs(circles[0].y - (expected.y * 2 + 50)) < 1, "converted from the map image to the scene");
  assert.equal(circles[0].r, 12 / scale);
  const covered = trail().strokes();
  assert.ok(covered.length > 0 && covered.every((s) => s.alpha === 1), "bright");
  assert.ok(ticks.length > 0 && ticks.every((i) => i.stepIndex === 0));
  assert.ok(ticks[ticks.length - 1].t > 1500, "the panel hears of progress");
});

test("the panel hears of progress at most every 66 ms, however fast the ticker runs", () => {
  const timeline = timelineOf();
  const ticks = [];
  overlay.play(timeline, { onTick: (i) => ticks.push(i.t) });
  const initial = ticks.length;
  run(1000);
  const heard = ticks.length - initial;
  assert.ok(heard <= Math.ceil(1000 / 66) + 1 && heard >= 10, `${heard} ticks in a second of 16 ms frames`);
});

test("pausing stops the clock and the ticker; resuming picks up where it was", () => {
  const timeline = timelineOf();
  overlay.play(timeline);
  run(500);
  const at = overlay.state.t;
  overlay.pause();
  assert.equal(tickers.size, 0, "no callback is left running");
  run(1000);
  assert.equal(overlay.state.t, at, "time stood still");
  assert.equal(overlay.state.playing, false);
  overlay.resume();
  assert.equal(tickers.size, 1);
  run(160);
  assert.ok(overlay.state.t > at);
  overlay.toggle();
  assert.equal(overlay.state.playing, false);
  overlay.toggle();
  assert.equal(overlay.state.playing, true);
});

test("the speed multiplies the clock: twice as fast covers twice the time in the same frames", () => {
  const timeline = timelineOf();
  overlay.play(timeline, { speed: 1 });
  run(800);
  const slow = overlay.state.t;
  overlay.stop();
  overlay.play(timeline, { speed: 2 });
  run(800);
  assert.ok(Math.abs(overlay.state.t - slow * 2) < 40, `${overlay.state.t} vs ${slow * 2}`);
  overlay.setSpeed(8);
  assert.equal(overlay.state.speed, 8);
  overlay.setSpeed(3);
  assert.equal(overlay.state.speed, 8, "a speed not on the list is refused");
});

test("seeking jumps to a time whether playing or paused, and clamps to the ends", () => {
  const timeline = timelineOf();
  overlay.play(timeline);
  overlay.seek(timeline.totalMs / 2);
  assert.equal(overlay.state.t, timeline.totalMs / 2);
  overlay.pause();
  overlay.seek(-100);
  assert.equal(overlay.state.t, 0);
  overlay.seek(timeline.totalMs * 3);
  assert.equal(overlay.state.t, timeline.totalMs);
  const expected = timelineAt(timeline, timeline.totalMs);
  assert.equal(tokens().circles().length, expected.tokens.length * 2, "the tokens are drawn at the end, each with the ring of one that has arrived");
});

test("at the end it stops itself, tells the panel once, and a new Play starts again from the beginning", () => {
  const timeline = timelineOf([buildSteps(world.model, "ep")[0]]);
  let ended = 0;
  const ticks = [];
  overlay.play(timeline, { speed: 8, onEnd: () => ended++, onTick: (i) => ticks.push(i) });
  run(timeline.totalMs / 8 + 400);
  assert.equal(ended, 1);
  assert.equal(overlay.state.playing, false);
  assert.equal(tickers.size, 0, "the ticker is released");
  assert.equal(ticks[ticks.length - 1].finished, true);
  overlay.resume();
  assert.equal(overlay.state.t, 0, "Play after the end is Play from the start");
  assert.equal(overlay.state.playing, true);
});

test("the camera is moved to each step once as it begins, and not at all when told to stay", () => {
  const timeline = timelineOf();
  overlay.setJourneys({ legs, stops: [] });
  overlay.play(timeline, { speed: 8 });
  assert.equal(frames.length, 1, "the first step is framed at once");
  run(timeline.steps[0].endMs / 8 + 200);
  assert.equal(frames.length, 2, "and the next as it begins, not every frame");
  assert.ok(frames[0].box.x1 > frames[0].box.x0);
  assert.equal(frames[0].opts.duration, 700);
  overlay.stop();
  frames.length = 0;
  overlay.play(timeline, { speed: 8, follow: "stay" });
  run(1500);
  assert.equal(frames.length, 0);
  overlay.setFollow("frame");
  overlay.seek(timeline.steps[1].startMs + 10);
  assert.equal(frames.length, 1, "following again frames the step it is in");
});

test("stopping takes the token and its trail off the map and releases the ticker", () => {
  overlay.play(timelineOf());
  run(300);
  assert.ok(tokens().circles().length > 0);
  overlay.stop();
  assert.equal(tokens().circles().length, 0);
  assert.equal(trail().strokes().length, 0);
  assert.equal(tickers.size, 0);
  assert.equal(overlay.state.active, false);
  assert.doesNotThrow(() => overlay.stop(), "stopping twice is fine");
});

test("an empty timeline does not play", () => {
  assert.equal(overlay.play({ steps: [], totalMs: 0 }), false);
  assert.equal(overlay.play(null), false);
  assert.equal(tickers.size, 0);
});

test("hiding the overlay pauses it; clearing it stops everything and draws nothing", () => {
  overlay.setJourneys({ legs, stops: [{ n: 1, point: { x: 0, y: 0 }, title: "x" }] });
  overlay.play(timelineOf());
  overlay.setVisible(false);
  assert.equal(container.visible, false);
  assert.equal(overlay.state.playing, false);
  overlay.setVisible(true);
  overlay.clear();
  assert.equal(overlay.state.active, false);
  assert.equal(routes().strokes().length, 0);
  assert.equal(stopsLayer().circles().length, 0);
  assert.equal(container.children.filter((c) => c.text !== undefined).length, 0);
});

/* ---------------------------------------------------------------- the pin under the cursor */

test("the route a pin would give is drawn on its own layer with a pin at the point, and cleared when the cursor leaves", () => {
  const leg = world.analysis.legs.get(world.model.legs[0].id);
  overlay.setPreview({ point: { x: 1000, y: 160 }, legs: [{ runs: leg.runs, worst: "error" }] });
  const preview = layersOf()[0];
  assert.ok(preview.strokes().some((s) => s.color === PROBLEM_COLORS.error), "an error glows");
  assert.equal(preview.circles().length, 1);
  assert.deepEqual([preview.circles()[0].x, preview.circles()[0].y], [2100, 370]);
  overlay.setPreview(null);
  assert.equal(preview.ops.length, 0);
});

/* ---------------------------------------------------------------- the camera and the scene */

test("a box round some journeys, in scene pixels, and a frame request to the camera", () => {
  overlay.setJourneys({ legs, stops: [] });
  const box = overlay.boxOf([legs[0].id]);
  assert.ok(box.x1 > box.x0, "wider than nothing");
  assert.equal(overlay.boxOf(["nothing"]), null);
  assert.equal(overlay.frameLegs(["nothing"]), false);
  assert.equal(overlay.frameLegs([legs[0].id]), true);
  assert.equal(frames.length, 1);
});

test("with no calibration yet nothing is drawn and nothing throws", () => {
  host.toScene = () => null;
  overlay.setJourneys({ legs, stops: [{ n: 1, point: { x: 0, y: 0 }, title: "x" }] });
  assert.equal(routes().strokes().length, 0);
  assert.equal(stopsLayer().circles().length, 0);
  assert.equal(overlay.frameLegs([legs[0].id]), false);
  assert.doesNotThrow(() => overlay.play(timelineOf()));
  run(100);
});

test("when the scene is torn down the overlay lets go without touching what Foundry destroyed, and attaches to the next container afresh", () => {
  overlay.setJourneys({ legs, stops: [{ n: 1, point: { x: 0, y: 160 }, title: "One" }] });
  overlay.play(timelineOf());
  overlay.detach();
  assert.equal(tickers.size, 0, "no ticker survives a scene change");
  for (const child of container.removeChildren()) child.destroy();
  container.destroy();
  assert.doesNotThrow(() => { overlay.redraw(); overlay.pause(); overlay.stop(); overlay.clear(); });
  const next = new Container();
  overlay.attach(next);
  overlay.setJourneys({ legs, stops: [] });
  assert.equal(next.children.filter((c) => c instanceof Graphics).length, 6, "fresh layers in the new container");
  assert.ok(next.children[1].strokes().length > 0);
});

test("attaching again to a container Foundry already destroyed does not destroy anything twice", () => {
  overlay.setJourneys({ legs, stops: [{ n: 1, point: { x: 0, y: 160 }, title: "One" }] });
  for (const child of container.removeChildren()) child.destroy();
  container.destroy();
  assert.doesNotThrow(() => overlay.attach(new Container()));
});
