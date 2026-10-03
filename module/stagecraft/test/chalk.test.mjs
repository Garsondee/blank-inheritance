import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS, COLOURS, SIZES, LOOK, quantise, dequantise, simplify, densify, makeStroke, pointsOf, strokeBounds,
  effectivePolicy, allowedAt, boxVisible, clipPath, mergePages, eraseAlong, trimToCaps
} from "../scripts/core/chalk.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const zones = scene.zones;           // the back wall is the only chalk zone: x 0.05 to 0.45, y 0.2 to 0.62
const line = (x0, y0, x1, y1, n = 20) => Array.from({ length: n }, (_, i) => [x0 + ((x1 - x0) * i) / (n - 1), y0 + ((y1 - y0) * i) / (n - 1)]);
const base = { id: "s1", scene: "sc", by: "u1", at: 100, colour: "white", size: "medium" };

test("points quantise to a thousandth of the painting and come back within half of that", () => {
  const pts = [[0.1234, 0.5678], [1, 0], [0.0004, 0.9996]];
  const flat = quantise(pts);
  assert.ok(flat.every(Number.isInteger));
  const back = dequantise(flat);
  back.forEach(([x, y], i) => { assert.ok(Math.abs(x - pts[i][0]) <= 0.0005 + 1e-12); assert.ok(Math.abs(y - pts[i][1]) <= 0.0005 + 1e-12); });
});

test("simplify drops the middle of a straight run and keeps a corner", () => {
  const straight = line(0.1, 0.1, 0.5, 0.1, 50);
  assert.deepEqual(simplify(straight), [straight[0], straight[49]]);
  const bent = [...line(0.1, 0.1, 0.5, 0.1, 25), ...line(0.5, 0.1, 0.5, 0.5, 25).slice(1)];
  const s = simplify(bent);
  assert.equal(s.length, 3, "two ends and the corner");
  assert.ok(Math.abs(s[1][0] - 0.5) < 1e-9 && Math.abs(s[1][1] - 0.1) < 1e-9, `the corner is kept: ${s[1]}`);
  assert.deepEqual(simplify([[0, 0]]), [[0, 0]]);
});

test("densify leaves no gap longer than asked", () => {
  const d = densify([[0, 0], [0.5, 0]], 0.1);
  for (let i = 1; i < d.length; i++) assert.ok(d[i][0] - d[i - 1][0] <= 0.1 + 1e-12);
  assert.equal(d[0][0], 0);
  assert.equal(d[d.length - 1][0], 0.5);
});

test("a stroke is small: a long squiggle becomes a few dozen integers, and it never exceeds the caps", () => {
  const squiggle = Array.from({ length: 2000 }, (_, i) => [0.2 + 0.2 * Math.sin(i / 40) * (i / 2000), 0.2 + (0.3 * i) / 2000 + 0.01 * Math.sin(i / 5)]);
  const r = makeStroke({ ...base, points: squiggle });
  assert.equal(r.ok, true, r.problems.join(";"));
  assert.ok(r.stroke.p.length / 2 <= LIMITS.pointsPerStroke);
  assert.ok(JSON.stringify(r.stroke).length < 4000, `a stroke is ${JSON.stringify(r.stroke).length} bytes`);
  assert.deepEqual(Object.keys(r.stroke).sort(), ["at", "by", "colour", "id", "p", "scene", "size"], "a stroke carries exactly these fields and nothing hidden");
  const bounds = strokeBounds(r.stroke);
  assert.ok(bounds.x0 >= 0 && bounds.x1 <= 1 && bounds.y0 >= 0 && bounds.y1 <= 1);
});

test("a tap with the chalk leaves a dot, and a stroke with nothing in it is refused", () => {
  const dot = makeStroke({ ...base, points: [[0.3, 0.3]] });
  assert.equal(dot.ok, true);
  assert.equal(pointsOf(dot.stroke).length, 2);
  assert.equal(makeStroke({ ...base, points: [] }).ok, false);
});

test("a stroke is validated: who, where, which chalk, which size, real numbers", () => {
  assert.equal(makeStroke({ ...base, id: "", points: line(0.1, 0.1, 0.2, 0.2) }).ok, false);
  assert.equal(makeStroke({ ...base, by: "", points: line(0.1, 0.1, 0.2, 0.2) }).ok, false);
  assert.equal(makeStroke({ ...base, colour: "mauve", points: line(0.1, 0.1, 0.2, 0.2) }).ok, false);
  assert.equal(makeStroke({ ...base, size: "huge", points: line(0.1, 0.1, 0.2, 0.2) }).ok, false);
  assert.equal(makeStroke({ ...base, points: [[0.1, NaN], [0.2, 0.2]] }).ok, false);
  assert.ok(COLOURS.includes("white") && "thin" in SIZES);
});

test("points outside the painting are pulled back onto it", () => {
  const s = makeStroke({ ...base, points: [[-0.5, 0.5], [1.5, 0.5]] }).stroke;
  const b = strokeBounds(s);
  assert.deepEqual([b.x0, b.x1], [0, 1]);
});

test("policy: off means no box and no drawing; anywhere means everywhere; zones means only the chalk zones", () => {
  const off = effectivePolicy({ mode: "off" });
  const zonesOnly = effectivePolicy({ mode: "zones" });
  const anywhere = effectivePolicy({ mode: "anywhere" });
  const inside = [0.2, 0.4];
  const outside = [0.7, 0.4];
  assert.equal(allowedAt(off, zones, ...inside), false);
  assert.equal(boxVisible(off, zones), false);
  assert.equal(allowedAt(zonesOnly, zones, ...inside), true);
  assert.equal(allowedAt(zonesOnly, zones, ...outside), false);
  assert.equal(boxVisible(zonesOnly, zones), true);
  assert.equal(allowedAt(anywhere, zones, ...outside), true);
  assert.equal(boxVisible(zonesOnly, zones.filter((z) => z.kind !== "chalk")), false, "no chalk zone, no box");
});

test("the GM's override replaces the authored mode, and returns to it when lifted", () => {
  const authored = { mode: "off" };
  assert.equal(effectivePolicy(authored, { mode: "anywhere" }).mode, "anywhere");
  assert.equal(effectivePolicy(authored, { mode: "zones" }).mode, "zones");
  assert.equal(effectivePolicy({ mode: "anywhere" }, { mode: "off" }).mode, "off");
  assert.equal(effectivePolicy({ mode: "anywhere" }, null).mode, "anywhere");
  assert.equal(effectivePolicy({ mode: "anywhere" }, { mode: "bogus" }).mode, "anywhere", "a bad override is ignored");
});

test("a locked wall freezes drawing whatever the mode, by the scene or by the GM's live lock", () => {
  assert.equal(effectivePolicy({ mode: "anywhere", lock: true }).locked, true);
  assert.equal(allowedAt(effectivePolicy({ mode: "anywhere", lock: true }), zones, 0.2, 0.4), false);
  assert.equal(effectivePolicy({ mode: "anywhere", lock: true }, { locked: false }).locked, false, "the GM can lift a scene's lock");
  assert.equal(effectivePolicy({ mode: "anywhere" }, { locked: true }).locked, true);
  assert.equal(boxVisible(effectivePolicy({ mode: "anywhere", lock: true }), zones), false);
});

test("a line drawn across a zone's edge stops cleanly at the edge", () => {
  const zonesOnly = effectivePolicy({ mode: "zones" });
  const across = line(0.3, 0.4, 0.7, 0.4, 40);              // starts inside the back wall (x to 0.45), ends outside
  const runs = clipPath(across, zonesOnly, zones);
  assert.equal(runs.length, 1);
  const last = runs[0][runs[0].length - 1];
  assert.ok(last[0] <= 0.45 + 1e-9 && last[0] > 0.43, `the line stops at the edge: ${last[0]}`);
  assert.deepEqual(clipPath(line(0.6, 0.4, 0.9, 0.4), zonesOnly, zones), []);
  assert.deepEqual(clipPath(across, effectivePolicy({ mode: "off" }), zones), []);
  assert.equal(clipPath(across, effectivePolicy({ mode: "anywhere" }), zones)[0].length, 40);
  const out = clipPath([...line(0.1, 0.4, 0.4, 0.4, 10), ...line(0.5, 0.4, 0.55, 0.4, 3), ...line(0.2, 0.3, 0.3, 0.3, 5)], zonesOnly, zones);
  assert.equal(out.length >= 2, true, "leaving and coming back makes two lines");
});

test("several hands, one wall: pages merge in time order, a duplicate collapses, a later copy wins", () => {
  const mk = (id, at, by) => makeStroke({ ...base, id, at, by, points: line(0.1, 0.1, 0.4, 0.4) }).stroke;
  const pageA = { by: "a", strokes: [mk("a2", 30, "a"), mk("a1", 10, "a")] };
  const pageB = { by: "b", strokes: [mk("b1", 20, "b"), { ...mk("a1", 10, "a"), colour: "pink" }] };
  const merged = mergePages([pageA, pageB]);
  assert.deepEqual(merged.map((s) => s.id), ["a1", "b1", "a2"]);
  assert.equal(merged[0].colour, "pink");
  assert.deepEqual(mergePages([pageB, pageA]).map((s) => s.id), merged.map((s) => s.id), "the order does not depend on which page came first");
  assert.deepEqual(mergePages([[mk("z", 1, "a")]]).map((s) => s.id), ["z"], "a bare list works too");
});

test("rubbing out removes the part under the eraser and splits what is left", () => {
  const s = makeStroke({ ...base, id: "wall", points: line(0.1, 0.3, 0.4, 0.3, 60) }).stroke;
  const { removed, added } = eraseAlong([s], [[0.25, 0.28], [0.25, 0.32]], 0.02);
  assert.deepEqual(removed, ["wall"]);
  assert.equal(added.length, 2, "cut in two");
  assert.deepEqual(added.map((a) => a.id), ["wall.1", "wall.2"]);
  assert.ok(strokeBounds(added[0]).x1 < 0.25 && strokeBounds(added[1]).x0 > 0.25);
  for (const a of added) assert.deepEqual([a.by, a.scene, a.colour, a.at], ["u1", "sc", "white", 100], "the pieces keep who drew them");
  const miss = eraseAlong([s], [[0.25, 0.6], [0.3, 0.6]], 0.02);
  assert.deepEqual([miss.removed, miss.added], [[], []]);
  const whole = eraseAlong([s], [[0.05, 0.3], [0.45, 0.3]], 0.02);
  assert.deepEqual([whole.removed, whole.added.length], [["wall"], 0], "rubbing along the whole line removes it");
});

test("a hand may rub out only what it is allowed to", () => {
  const mine = makeStroke({ ...base, id: "mine", by: "me", points: line(0.1, 0.3, 0.4, 0.3, 30) }).stroke;
  const yours = makeStroke({ ...base, id: "yours", by: "you", points: line(0.1, 0.32, 0.4, 0.32, 30) }).stroke;
  const path = [[0.05, 0.31], [0.45, 0.31]];
  const own = eraseAlong([mine, yours], path, 0.03, (s) => s.by === "me");
  assert.deepEqual(own.removed, ["mine"]);
  const anyone = eraseAlong([mine, yours], path, 0.03, () => true);
  assert.deepEqual(anyone.removed.sort(), ["mine", "yours"]);
});

test("a full wall forgets its oldest strokes, and keeps the newest", () => {
  const strokes = Array.from({ length: 12 }, (_, i) => makeStroke({ ...base, id: `s${String(i).padStart(2, "0")}`, at: i, points: line(0.1, 0.1, 0.4, 0.4) }).stroke);
  const { keep, overflow } = trimToCaps(strokes, 10);
  assert.deepEqual(overflow.map((s) => s.id), ["s00", "s01"]);
  assert.equal(keep.length, 10);
  assert.equal(trimToCaps(strokes, 20).overflow.length, 0);
});

test("a stroke can carry nothing it was not given: it has only the fields above", () => {
  const r = makeStroke({ ...base, points: line(0.1, 0.1, 0.2, 0.2), secret: "x", extra: { y: 1 } });
  assert.equal(r.ok, true);
  assert.equal("secret" in r.stroke, false);
  assert.equal("extra" in r.stroke, false);
});

test("chalk is 35% smaller than it first was, in every width, and the sizes keep their order", () => {
  const first = { thin: 0.0016, medium: 0.003, thick: 0.0055 };
  for (const [name, was] of Object.entries(first)) assert.ok(Math.abs(SIZES[name] / was - 0.65) < 0.005, `${name}: ${SIZES[name]} is not 65% of ${was}`);
  assert.ok(SIZES.thin < SIZES.medium && SIZES.medium < SIZES.thick);
  assert.ok(SIZES.medium * 2048 < 4.1, "on a full size wall a medium line is about four pixels, not six");
});

test("the look is a solid core with only a slight fuzz outside it, and the bites never reach the core", () => {
  const layers = LOOK.layers;
  const core = layers[layers.length - 1];
  assert.equal(core.scale, 1, "the innermost layer is the line's own width");
  assert.ok(core.alpha >= 0.95, `the core is solid: ${core.alpha}`);
  for (let i = 1; i < layers.length; i++) {
    assert.ok(layers[i].scale < layers[i - 1].scale, "layers narrow towards the middle");
    assert.ok(layers[i].alpha > layers[i - 1].alpha, "and get more solid towards the middle");
  }
  assert.ok(layers[0].scale <= 1.6, "the whole fuzz stays within a little over the line's own width");
  assert.ok(layers[0].alpha <= 0.1 && layers[1].alpha <= 0.4, "the fuzz is faint");
  assert.ok(LOOK.bites.from >= core.scale / 2, "a bite is centred outside the core's own edge");
  assert.ok(LOOK.bites.to <= layers[1].scale / 2 + 0.2, "and still within the soft edge");
  assert.ok(LOOK.floor <= 2, "a thin line on a small wall is still smaller than it used to be");
});
