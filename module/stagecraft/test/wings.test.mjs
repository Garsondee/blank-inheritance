// The wings (core/wings.mjs, foundry/wings.mjs): who waits, made safe; who still waits once cards arrive; where a faded card
// stands on the screen; when a press becomes a carry; where the tray goes; what `stagecraft.bring` carries; and the
// providers and finders as the api registers them. The tray and the faded cards as a GM meets them (real presses, drags and
// right-clicks) are checked on the bench: tools/stagecraft/bench/wings-check.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { describeWings, describeWays, describeFound, stillWaiting, ghostBox, isDrag, trayTop, bringEvent, WINGS_MOST, FOUND_MOST, DRAG_START } from "../scripts/core/wings.mjs";
import { registerWings, registerFinder, wingsFor, foundFor } from "../scripts/foundry/wings.mjs";

test("who waits is made safe: ids once, names to one line, places kept inside the painting, sizes sane", () => {
  const { people, ways } = describeWings({
    people: [
      { id: "summon-nobu", name: "Nobu\nQuartermaster", portrait: "a.webp", at: [0.6, 0.64], way: "announced", title: "Quartermaster" },
      { id: "summon-nobu", name: "a second Nobu" },
      { id: "", name: "nobody" },
      null,
      { id: "summon-clerk", at: [1.4, -0.2], size: 9 },
      { id: "summon-x", at: ["a", 2], size: -1 }
    ],
    ways: [{ id: "quiet", label: "Walk on" }, { id: "quiet", label: "again" }, { id: "nolabel" }, { label: "no id" }, { id: "splash", label: "Splash" }]
  });
  assert.deepEqual(people.map((p) => p.id), ["summon-nobu", "summon-clerk", "summon-x"]);
  assert.deepEqual(people[0], { id: "summon-nobu", name: "Nobu", title: "Quartermaster", portrait: "a.webp", at: [0.6, 0.64], size: 1, way: "announced", note: "" });
  assert.equal(people[1].name, "summon-clerk", "no name: the id stands in");
  assert.deepEqual(people[1].at, [1, 0], "a place outside the painting is brought inside it");
  assert.equal(people[1].size, 3, "a size is capped");
  assert.equal(people[2].at, null, "a place that is not a point is no place");
  assert.equal(people[2].size, 1);
  assert.deepEqual(ways, [{ id: "quiet", label: "Walk on" }, { id: "splash", label: "Splash" }]);
});

test("several providers are put together: the first to name someone wins, their ways are joined", () => {
  const { people, ways } = describeWings([
    { people: [{ id: "a", name: "First A" }], ways: [{ id: "quiet", label: "Walk on" }] },
    null,
    { people: [{ id: "a", name: "Second A" }, { id: "b", name: "B" }], ways: [{ id: "quiet", label: "Other" }, { id: "splash", label: "Splash" }] }
  ]);
  assert.deepEqual(people.map((p) => p.name), ["First A", "B"]);
  assert.deepEqual(ways.map((w) => w.id), ["quiet", "splash"]);
});

test("the tray holds at most so many, and the finder offers at most so many", () => {
  const many = Array.from({ length: WINGS_MOST + 5 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  assert.equal(describeWings({ people: many }).people.length, WINGS_MOST);
  assert.equal(describeFound(many).length, FOUND_MOST);
  assert.deepEqual(describeFound([{ id: "x", name: "X\nline two", note: "Episode Two", portrait: "" }, { id: "x" }, {}]), [{ id: "x", name: "X", portrait: null, note: "Episode Two" }]);
  assert.deepEqual(describeWays("nonsense"), []);
});

test("someone with a card on the stage no longer waits: the card is them", () => {
  const people = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(stillWaiting(people, ["b", "pc-1"]).map((p) => p.id), ["a", "c"]);
  assert.deepEqual(stillWaiting(people, null).map((p) => p.id), ["a", "b", "c"]);
});

test("a faded card's box is where its foot, head and edges fall; nothing when it would not show", () => {
  const box = ghostBox({ foot: { x: 500, y: 700 }, head: { x: 500, y: 400 }, left: { x: 410, y: 700 }, right: { x: 590, y: 700 } });
  assert.deepEqual(box, { x: 410, y: 400, w: 180, h: 300 });
  assert.equal(ghostBox({ foot: { x: 0, y: 10 }, head: { x: 0, y: 20 }, left: { x: 0, y: 0 }, right: { x: 9, y: 0 } }), null, "upside down: behind the eye");
  assert.equal(ghostBox({ foot: { x: 0, y: 10 }, head: { x: 0, y: 8 }, left: { x: 0, y: 0 }, right: { x: 9, y: 0 } }), null, "too small to see");
  assert.equal(ghostBox({ foot: null, head: { x: 0, y: 0 }, left: { x: 0, y: 0 }, right: { x: 0, y: 0 } }), null);
  assert.equal(ghostBox({ foot: { x: NaN, y: 1 }, head: { x: 0, y: 0 }, left: { x: 0, y: 0 }, right: { x: 0, y: 0 } }), null);
});

test("a press is a click until it has moved far enough to be a carry", () => {
  assert.equal(isDrag({ x: 10, y: 10 }, { x: 13, y: 12 }), false);
  assert.equal(isDrag({ x: 10, y: 10 }, { x: 10 + DRAG_START, y: 10 }), true);
});

test("the tray stands under whatever strips are showing, never above its own line", () => {
  assert.equal(trayTop([]), 84);
  assert.equal(trayTop([76]), 84, "the Stage key alone: the tray's own line");
  assert.equal(trayTop([76, 114, 181.6]), 190, "both strips open: under the lower one");
  assert.equal(trayTop([NaN, undefined, 120], 84, 10), 130);
});

test("stagecraft.bring carries the scene, who, how and where, and nothing that is not one of those", () => {
  const scene = { id: "s" };
  assert.deepEqual(bringEvent({ scene, id: "summon-nobu" }), { scene, id: "summon-nobu", way: null, at: null, found: false });
  assert.deepEqual(bringEvent({ scene, id: "x", way: "splash", at: [0.25, 1.2], found: true }), { scene, id: "x", way: "splash", at: [0.25, 1], found: true });
  assert.deepEqual(bringEvent({ scene, id: "x", way: "", at: "nowhere", found: "yes" }), { scene, id: "x", way: null, at: null, found: false });
});

test("providers and finders as the api registers them: asked with the scene, one that fails says nothing, each can be taken away", async () => {
  const scene = { id: "s" };
  const seen = [];
  const offA = registerWings((s) => { seen.push(s.id); return { people: [{ id: "a", name: "A" }], ways: [{ id: "quiet", label: "Walk on" }] }; });
  const offB = registerWings(async () => ({ people: [{ id: "b", name: "B", at: [0.5, 0.8] }] }));
  const offBad = registerWings(() => { throw new Error("broken provider"); });
  const warn = console.warn;
  console.warn = () => {};
  try {
    const all = await wingsFor(scene);
    assert.deepEqual(all.people.map((p) => p.id), ["a", "b"]);
    assert.deepEqual(all.ways, [{ id: "quiet", label: "Walk on" }]);
    assert.deepEqual(seen, ["s"]);
    const offF = registerFinder((s, q) => [{ id: `found-${q}`, name: q.toUpperCase() }]);
    const offFBad = registerFinder(async () => { throw new Error("broken finder"); });
    assert.deepEqual(await foundFor(scene, "taka"), [{ id: "found-taka", name: "TAKA", portrait: null, note: "" }]);
    offF();
    offFBad();
    assert.deepEqual(await foundFor(scene, "taka"), []);
  } finally {
    console.warn = warn;
    offA(); offB(); offBad();
  }
  assert.deepEqual((await wingsFor(scene)).people, [], "taken away: nobody waits");
  assert.throws(() => registerWings("not a function"), TypeError);
  assert.throws(() => registerFinder(null), TypeError);
});
