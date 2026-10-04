// The box of chalk at a table: the controller joins the rules, the brush, the journal-backed store, the wall's pixels and
// the pointer. Run here against the real store on a stand-in journal, the real brush, and a stand-in wall whose "pictures"
// are the names of the strokes that painted them (fake-wall.mjs); the real pixels, the real pointer and two real browsers
// are exercised by tools/stagecraft/bench/chalk-check.mjs and tools/stagecraft/foundry-check.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { installFoundry, settle, OWNER } from "./fake-foundry.mjs";
import { FakeWall, fakeEncode } from "./fake-wall.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { ChalkStore, ENTRY_NAME } = await import("../scripts/foundry/chalk-store.mjs");
const { ChalkController } = await import("../scripts/foundry/chalk.mjs");
const { describeScene } = await import("../scripts/core/scene.mjs");
const { PALETTE, stepId } = await import("../scripts/core/chalk.mjs");
const { TOOLS } = await import("../scripts/core/brush.mjs");
const { Quiet } = await import("../scripts/core/quiet.mjs");

/** No waiting for the hand to pause: most of these tests are about what is kept, not when (the pause has tests of its own below). */
const impatient = () => ({ note() {}, whenQuiet: () => Promise.resolve(), release() {}, get pending() { return 0; } });

/** A stand-in for the wet ink (render/paint/wet.mjs) that writes down what it is asked. */
function fakeWet() {
  const w = { calls: [], wet: true, release() { w.calls.push(["release"]); }, warm() { w.calls.push(["warm"]); }, dispose() {} };
  w.begin = (stroke) => { w.calls.push(["begin", stroke.tool]); return w.accept !== false; };
  w.add = (dabs) => { w.calls.push(["add", dabs.length]); };
  w.tail = (to) => { w.calls.push(["tail", Math.round(to.x), Math.round(to.y)]); };
  w.end = () => { w.calls.push(["end"]); };
  w.names = () => w.calls.map((c) => c[0]);
  return w;
}

// the stage is 1000 x 500 px and shows the whole painting; the back wall (the only chalk zone) is x 0.05..0.45, y 0.2..0.62.
// The wall is 2880 x 1440 pixels in tiles of 240: 12 columns, 6 rows.
let clock = 0;
const at = (x, y, extra = {}) => ({ x: x * 1000, y: y * 500, pressure: 0.5, pointerType: "mouse", t: (clock += 16), ...extra });

function recordingBackend() {
  const b = {
    box: null, hidden: null, shown: [], fulls: 0,
    setChalkBox(on) { b.box = on; },
    setChalkHidden(on) { b.hidden = on; },
    setChalkTiles(wall, keys, full = false) { b.shown.push([...keys]); if (full) b.fulls++; },
    paintingAt(x, y) { return x >= 0 && x <= 1000 && y >= 0 && y <= 500 ? { x: x / 1000, y: y / 500 } : null; },
    paintingColour: () => "#405060"
  };
  return b;
}

let world;
let hookLog;
let sent;

/** A fresh world, journal and stage for each table (never two alive at once: the globals are the latest one's). */
async function table({ chalk = { mode: "zones" }, live = null, journal = true, gm = false, wet = null, quiet = impatient() } = {}) {
  world = installFoundry({ user: { id: "me", name: "Me", isGM: gm } });
  hookLog = [];
  sent = [];
  world.hooks.on("stagecraft.chalk", (e) => hookLog.push(e));
  const { scene: description } = describeScene({ ...RAW_SCENE, chalk });
  const store = new ChalkStore();
  const entry = journal ? await JournalEntry.create({ name: ENTRY_NAME, flags: { stagecraft: { chalk: true } }, ownership: { default: OWNER } }) : null;
  const classes = new Set();
  const host = {
    scene: { id: "sc", flags: live ? { stagecraft: { live } } : {} },
    description,
    backend: recordingBackend(),
    root: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } }
  };
  const controller = new ChalkController({ host, store, makeWall: (o) => new FakeWall(o), encode: (canvas, sure, ready) => (ready ? ready.then(() => fakeEncode(canvas)) : fakeEncode(canvas)), send: (m) => sent.push(structuredClone(m)), makeWet: () => wet, quiet });
  controller.sync();
  controller.refresh();
  return { controller, store, entry, host, classes, wall: controller.wall };
}

/** Paint with the pointer: down at the first point, through the rest, up at the last. */
async function paint(controller, points, extra = {}) {
  const [first, ...rest] = points;
  assert.equal(controller.begin(at(...first, extra)), true, "the paint begins");
  for (const p of rest) controller.extend(at(...p, extra));
  await controller.end();
  await settle();
}
const across = (x0, x1, y, n = 24) => Array.from({ length: n }, (_, i) => [x0 + ((x1 - x0) * i) / (n - 1), y]);
const mine = (t) => t.store.layers("sc").find((l) => l.by === "me");

test("the box shows only where chalk may be used: a chalk zone, anywhere, never when off or frozen, never without the journal", async () => {
  assert.equal((await table({ chalk: { mode: "zones" } })).host.backend.box, true);
  assert.equal((await table({ chalk: { mode: "anywhere" } })).host.backend.box, true);
  assert.equal((await table({ chalk: { mode: "off" } })).host.backend.box, false, "a serious scene has no box");
  assert.equal((await table({ chalk: { mode: "anywhere", lock: true } })).host.backend.box, false, "a frozen wall has no box");
  assert.equal((await table({ journal: false })).host.backend.box, false, "no journal yet (a GM has not logged in): nothing to keep chalk in");
});

test("taking from the box: a stick is chalk of its colour, the magic stick is magic chalk, the felt is the eraser; the same again puts it back", async () => {
  const t = await table();
  t.controller.take("yellow");
  assert.equal(t.controller.inHand, "chalk");
  assert.equal(t.controller.colour, PALETTE.yellow);
  assert.ok(t.classes.has("stagecraft-chalk"), "the stage knows chalk is in hand");
  t.controller.take("yellow");
  assert.equal(t.controller.inHand, null, "the same stick again puts it back");
  assert.ok(!t.classes.has("stagecraft-chalk"));
  t.controller.take("blue");
  t.controller.take("pink");
  assert.deepEqual([t.controller.inHand, t.controller.colour], ["chalk", PALETTE.pink], "another stick changes the colour, one press");
  t.controller.take("magic");
  assert.equal(t.controller.inHand, "magic");
  assert.equal(t.controller.colour, PALETTE.pink, "magic chalk keeps the colour in hand, which can be any colour at all");
  t.controller.take("rub");
  assert.equal(t.controller.inHand, "eraser");
  t.controller.choose("spray");
  assert.equal(t.controller.inHand, "spray", "the kit changes tools");
  t.controller.choose("no such tool");
  assert.equal(t.controller.inHand, "spray");
  t.controller.putAway();
  assert.equal(t.controller.inHand, null);

  const closed = await table({ chalk: { mode: "off" } });
  closed.controller.take("white");
  assert.equal(closed.controller.inHand, null, "a closed box gives nothing");
});

test("the GM's live override opens a closed scene and closes an open one, putting the chalk in hand away", async () => {
  const t = await table({ chalk: { mode: "off" } });
  t.host.scene.flags = { stagecraft: { live: { chalk: { mode: "anywhere" } } } };
  t.controller.refresh();
  assert.equal(t.host.backend.box, true, "opened");
  t.controller.take("pink");
  t.host.scene.flags = { stagecraft: { live: { chalk: { mode: "off" } } } };
  t.controller.refresh();
  assert.equal(t.host.backend.box, false, "closed again");
  assert.equal(t.controller.inHand, null, "and the chalk in hand is put back");
});

test("a stroke is on the wall the moment it is painted, and kept a moment later as tiles with the step that takes it back", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("yellow");
  assert.equal(t.controller.begin(at(0.2, 0.3)), true);
  for (const [x, y] of across(0.2, 0.3, 0.3).slice(1)) t.controller.extend(at(x, y));
  const [live] = [...t.wall.strokes.values()];
  assert.ok(live && live.touched.size > 0, "paint shows while the hand is still down");
  assert.ok(t.host.backend.shown.length > 0, "and the picture was told which tiles changed");
  const finishing = t.controller.end();
  assert.equal(t.wall.strokes.size, 0, "the stroke is in the layer the moment the pointer comes up");
  assert.ok(Object.keys(t.wall.tilesOf("me")).length > 0);
  await finishing;
  await settle();

  const layer = mine(t);
  assert.ok(layer, "my layer is kept in the journal");
  assert.deepEqual(Object.keys(layer.tiles).sort(), Object.keys(t.wall.tilesOf("me")).sort(), "the tiles it touched, exactly");
  // the wall at y 0.3 is pixel 432: row 1; x 0.2..0.3 is pixels 576..864: columns 2 and 3
  assert.deepEqual(Object.keys(layer.tiles).sort(), ["c2r1", "c3r1"]);
  const steps = Object.entries(layer.history);
  assert.equal(steps.length, 1);
  assert.equal(steps[0][1].who, "me");
  assert.deepEqual(steps[0][1].tiles, { c2r1: null, c3r1: null }, "before the stroke those tiles were bare");
  assert.ok(steps[0][0].endsWith(`-${live.id}`), "the step is named after the stroke, so other screens know it is kept");

  assert.equal(hookLog.length, 1, "the adventure is told, once");
  const e = hookLog[0];
  assert.deepEqual([e.type, e.scene, e.by, e.tool, e.colour], ["chalk", "sc", "me", "chalk", PALETTE.yellow]);
  assert.ok(e.bounds.x0 > 0.18 && e.bounds.x1 < 0.32 && e.bounds.y0 > 0.27 && e.bounds.y1 < 0.33, `where it lies, in fractions: ${JSON.stringify(e.bounds)}`);

  const ops = sent.map((m) => m.op);
  assert.equal(ops[0], "begin");
  assert.ok(ops.includes("more"), "the samples go across while it is painted");
  assert.equal(ops.at(-1), "end");
  assert.deepEqual(sent.at(-1).layers, ["me"], "and the end says which layers to wait for");
  assert.equal(sent[0].tool, "chalk");
  assert.ok(!("by" in sent[0]), "who sent it is the server's word, never the message's");
  t.controller.stop();
});

test("in zones only, paint is held to the chalk zones by the wall's mask; a stroke may start outside and still mark inside", async () => {
  const zones = await table({ chalk: { mode: "zones" } });
  assert.deepEqual(zones.wall.mask, [RAW_SCENE.zones[0].shape], "the back wall is the mask");
  zones.controller.take("white");
  zones.controller.hover(at(0.7, 0.3));
  assert.equal(zones.controller.blocked, true, "outside the zone the chalk shows it would leave no mark");
  zones.controller.hover(at(0.3, 0.3));
  assert.equal(zones.controller.blocked, false);
  zones.controller.choose("eraser");
  zones.controller.hover(at(0.7, 0.3));
  assert.equal(zones.controller.blocked, false, "an eraser goes anywhere");
  const free = await table({ chalk: { mode: "anywhere" } });
  assert.equal(free.wall.mask, null, "anywhere is anywhere");
});

test("a stroke that leaves nothing keeps nothing: no page, no step, no hook, and nobody waits for it (found live)", async () => {
  const t = await table({ chalk: { mode: "zones" } });
  t.controller.take("white");
  t.wall.masked = true;                                         // painted outside the chalk zone: masked away to nothing
  await paint(t.controller, across(0.6, 0.8, 0.3));
  assert.deepEqual(t.store.layers("sc"), [], "no page was made");
  assert.equal(hookLog.length, 0, "the adventure is not told of paint that is not there");
  assert.deepEqual(sent.at(-1).layers, [], "and other screens are told to wait for nothing");
  t.wall.masked = false;
  await paint(t.controller, across(0.2, 0.3, 0.3));
  assert.equal(Object.keys(mine(t).history).length, 1, "a stroke that does leave paint is kept as one step");
  t.controller.stop();
});

test("taking back and putting back: Ctrl+Z takes back my newest stroke, Ctrl+Shift+Z puts it back, a new stroke ends the redo", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("white");
  await paint(t.controller, across(0.2, 0.22, 0.3));
  const first = { ...mine(t).tiles };
  await paint(t.controller, across(0.2, 0.22, 0.3));
  const both = { ...mine(t).tiles };
  assert.notDeepEqual(both, first);
  assert.equal(await t.controller.undo(), true);
  await settle();
  assert.deepEqual(mine(t).tiles, first, "the second stroke is gone");
  assert.deepEqual(t.wall.tilesOf("me"), first, "and gone from the wall too");
  assert.equal(await t.controller.redo(), true);
  await settle();
  assert.deepEqual(mine(t).tiles, both, "and back");
  assert.equal(await t.controller.undo(), true);
  await paint(t.controller, across(0.6, 0.62, 0.6));
  assert.equal(await t.controller.redo(), false, "a new stroke ends what could be put back");
  await t.controller.undo();
  await t.controller.undo();
  await settle();
  assert.deepEqual(mine(t).tiles, {}, "back to a bare wall");
  assert.equal(await t.controller.undo(), false, "and nothing more to take back");
  t.controller.stop();
});

test("someone else's stroke shows live as they paint it, and gives way to their kept paint when it arrives", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.receive({ type: "chalk", op: "begin", scene: "sc", id: "ana1", tool: "chalk", colour: "#ff0000", size: 9, steady: 5, seed: 7 }, "ana");
  t.controller.receive({ type: "chalk", op: "more", scene: "sc", id: "ana1", s: [600, 500, 0.7, 700, 500, 0.7, 800, 520, 0.7] }, "ana");
  const live = t.wall.strokes.get("ana1");
  assert.ok(live, "it is on my wall");
  assert.deepEqual([live.by, live.live, live.colour], ["ana", true, "#ff0000"], "on Ana's layer, as she sent it");
  t.controller.receive({ type: "chalk", op: "end", scene: "sc", id: "ana1", layers: ["ana"] }, "ana");
  assert.ok(t.wall.strokes.has("ana1"), "it stays until her paint is here");
  // her page arrives with the tiles and the step named after her stroke
  world.page(t.entry, { name: "p", flags: { stagecraft: { chalk: { v: 2, scene: "sc", by: "ana", since: 5, tiles: { c2r2: "ana1", c3r2: "ana1" }, history: { [stepId(5, "ana1")]: { at: 5, who: "ana", tiles: { c2r2: null, c3r2: null } } } } } } });
  world.hooks.callAll("createJournalEntryPage", t.entry.pages.at(-1));
  await settle();
  assert.equal(t.wall.strokes.has("ana1"), false, "the live copy is gone");
  assert.deepEqual(t.wall.tilesOf("ana"), { c2r2: "ana1", c3r2: "ana1" }, "and her kept paint shows");

  // messages for another scene, or that claim to be mine, are not painted
  t.controller.receive({ type: "chalk", op: "begin", scene: "elsewhere", id: "x", tool: "chalk" }, "ana");
  t.controller.receive({ type: "chalk", op: "begin", scene: "sc", id: "y", tool: "chalk" }, "me");
  t.controller.receive({ type: "chalk", op: "begin", scene: "sc", id: "z", tool: "smudge" }, "ana");
  assert.equal(t.wall.strokes.size, 0);
  t.controller.stop();
});

test("a live stroke whose paint arrives before its end still gives way, and one whose paint never comes goes after a while", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.receive({ type: "chalk", op: "begin", scene: "sc", id: "bo1", tool: "pencil", colour: "#00ff00", size: 3, steady: 0, seed: 1 }, "bo");
  world.page(t.entry, { name: "p", flags: { stagecraft: { chalk: { v: 2, scene: "sc", by: "bo", since: 5, tiles: { c0r0: "bo1" }, history: { [stepId(5, "bo1")]: { at: 5, who: "bo", tiles: { c0r0: null } } } } } } });
  world.hooks.callAll("createJournalEntryPage", t.entry.pages.at(-1));
  await settle();
  assert.ok(t.wall.strokes.has("bo1"), "not ended yet: kept");
  t.controller.receive({ type: "chalk", op: "end", scene: "sc", id: "bo1", layers: ["bo"] }, "bo");
  assert.equal(t.wall.strokes.has("bo1"), false, "ended, and already kept: gone at once");

  t.controller.receive({ type: "chalk", op: "begin", scene: "sc", id: "cy1", tool: "chalk", colour: "#0000ff", size: 7, steady: 0, seed: 2 }, "cy");
  t.controller.receive({ type: "chalk", op: "cancel", scene: "sc", id: "cy1" }, "cy");
  assert.equal(t.wall.strokes.has("cy1"), false, "a stroke thrown away (Escape) goes at once");
  t.controller.stop();
});

test("only a GM's eraser rubs out everyone's: a player's message saying otherwise is not believed", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  world.others.gm1 = { id: "gm1", isGM: true };
  t.controller.receive({ type: "chalk", op: "begin", scene: "sc", id: "e1", tool: "eraser", everyone: true, size: 20 }, "ana");
  assert.equal(t.wall.strokes.get("e1").everyone, false);
  t.controller.receive({ type: "chalk", op: "begin", scene: "sc", id: "e2", tool: "eraser", everyone: true, size: 20 }, "gm1");
  assert.equal(t.wall.strokes.get("e2").everyone, true);
  t.controller.stop();
});

test("rubbing out: a player's eraser takes away only their own paint; a GM's takes anyone's, and the step is kept on each layer", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  world.page(t.entry, { name: "p", flags: { stagecraft: { chalk: { v: 2, scene: "sc", by: "ana", since: 1, tiles: { c2r1: "ana-old" }, history: {} } } } });
  t.controller.sync();
  await settle();
  t.controller.take("white");
  await paint(t.controller, across(0.2, 0.22, 0.3));
  assert.ok(mine(t).tiles.c2r1, "mine is there, on the same tile as hers");
  t.controller.take("rub");
  await paint(t.controller, across(0.2, 0.22, 0.3));
  assert.equal(mine(t).tiles.c2r1, undefined, "mine is rubbed out");
  assert.equal(t.store.layers("sc").find((l) => l.by === "ana").tiles.c2r1, "ana-old", "hers is not mine to rub");

  world.user.isGM = true;                                       // the eraser is still in hand
  await paint(t.controller, across(0.2, 0.22, 0.3));
  const ana = t.store.layers("sc").find((l) => l.by === "ana");
  assert.equal(ana.tiles.c2r1, undefined, "a GM can rub out anyone's");
  const [id, step] = Object.entries(ana.history)[0];
  assert.equal(step.who, "me", "the step on her layer says who did it");
  assert.equal(await t.controller.undo(), true, "and the GM can take it back");
  await settle();
  assert.equal(t.store.layers("sc").find((l) => l.by === "ana").tiles.c2r1, "ana-old");
  assert.ok(id.length > 0);
  t.controller.stop();
});

test("a pen turned round (its eraser end) rubs out for that stroke only", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("white");
  await paint(t.controller, across(0.2, 0.22, 0.3), { pointerType: "pen", pressure: 0.6 });
  assert.ok(mine(t).tiles.c2r1);
  await paint(t.controller, across(0.2, 0.22, 0.3), { pointerType: "pen", pressure: 0.6, flip: true });
  assert.equal(mine(t).tiles.c2r1, undefined, "rubbed out");
  assert.equal(t.controller.inHand, "chalk", "and the chalk is still in hand");
  t.controller.stop();
});

test("Shift-click draws a straight line from where the last stroke ended", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("white");
  t.controller.choose("pencil");
  await paint(t.controller, across(0.1, 0.12, 0.1));
  assert.equal(t.controller.begin(at(0.9, 0.1, { shift: true })), false, "nothing to hold: it is drawn in one go");
  await settle();
  const tiles = Object.keys(mine(t).tiles);
  assert.ok(tiles.includes("c10r0") && tiles.includes("c5r0"), `the line reaches across the wall: ${tiles}`);
  assert.equal(Object.keys(mine(t).history).length, 2, "and is one step, taken back in one go");
  t.controller.stop();
});

test("the fill fills a closed shape, and says so when it cannot", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("green");
  t.controller.choose("fill");
  t.wall.fillAnswer = { ok: true, changed: new Map([["c4r2", { content: "filled" }]]), area: 900 };
  assert.equal(t.controller.begin(at(0.4, 0.4)), false, "a fill is one click");
  await settle();
  assert.equal(t.wall.fills[0].colour, PALETTE.green);
  assert.equal(mine(t).tiles.c4r2, "filled", "kept like any stroke");
  t.wall.fillAnswer = { ok: false, reason: "open", changed: new Map() };
  t.controller.begin(at(0.6, 0.4));
  await settle();
  assert.equal(Object.keys(mine(t).history).length, 1, "a fill that found no shape keeps nothing");
  t.controller.stop();
});

test("Alt-click takes a colour: from the chalk on the wall, else from the painting", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("white");
  t.wall.pickAnswer = "#123456";
  assert.equal(t.controller.begin(at(0.3, 0.3, { alt: true })), false);
  assert.equal(t.controller.colour, "#123456");
  t.wall.pickAnswer = null;
  t.controller.pickColour(at(0.3, 0.3));
  assert.equal(t.controller.colour, "#405060", "the painting's own colour where there is no chalk");
  assert.equal(t.controller.recent[0], "#405060", "and it is among the recent colours");
  t.controller.stop();
});

test("the hand is this player's own and remembered on this machine: colour, recent colours, each tool's size, steady hand", async () => {
  const kept = new Map();
  globalThis.localStorage = { getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => kept.set(k, String(v)) };
  try {
    const t = await table({ chalk: { mode: "anywhere" } });
    t.controller.take("white");
    t.controller.setColour("#aa00aa", { remember: false });
    assert.notEqual(t.controller.recent[0], "#aa00aa", "a colour passed over while dragging the picker is not remembered");
    t.controller.setColour("#bb11bb");
    t.controller.setSize(999);
    assert.equal(t.controller.sizes.chalk, TOOLS.chalk.size.max, "a size is held to the tool's own range");
    t.controller.setSize(10);
    t.controller.nudgeSize(1);
    assert.ok(t.controller.sizes.chalk > 10);
    t.controller.setSteady(3);
    t.controller.stop();

    const again = await table({ chalk: { mode: "anywhere" } });
    assert.equal(again.controller.colour, "#bb11bb");
    assert.equal(again.controller.recent[0], "#bb11bb");
    assert.ok(again.controller.sizes.chalk > 10);
    assert.equal(again.controller.steady, 3);
    again.controller.stop();
  } finally {
    delete globalThis.localStorage;
  }
});

test("a save that fails takes the paint off the wall again rather than showing chalk that is not kept", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.store.save = async () => { throw new Error("the server said no"); };
  const warnings = [];
  const warn = console.warn;
  console.warn = (...a) => warnings.push(a.join(" "));
  try {
    t.controller.take("green");
    await paint(t.controller, across(0.2, 0.4, 0.3));
  } finally { console.warn = warn; }
  assert.deepEqual(t.wall.tilesOf("me"), {});
  assert.ok(warnings.some((w) => /chalk could not be kept/.test(w)), "and it says so in the console");
  t.controller.stop();
});

test("when the picture is rebuilt, the whole wall is shown again, from what the wall already holds", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("orange");
  await paint(t.controller, across(0.2, 0.4, 0.3));
  t.host.backend = recordingBackend();                 // a new picture with nothing on it
  t.controller.reset();
  t.controller.sync();
  t.controller.refresh();
  assert.equal(t.host.backend.fulls, 1, "told to show everything");
  assert.ok(t.host.backend.shown[0].length >= 2);
  assert.equal(t.host.backend.box, true);
  t.controller.stop();
});

test("the journal arriving after the stage (a GM logging in late) turns the box on by itself", async () => {
  const t = await table({ chalk: { mode: "anywhere" }, journal: false });
  assert.equal(t.host.backend.box, false);
  await JournalEntry.create({ name: ENTRY_NAME, flags: { stagecraft: { chalk: true } }, ownership: { default: OWNER } });
  assert.equal(t.host.backend.box, true);
  t.controller.stop();
});

test("stopping unsubscribes, so a scene that has gone never paints again", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("white");
  t.controller.stop();
  assert.equal(t.controller.inHand, null);
  const before = t.host.backend.shown.length;
  world.page(t.entry, { name: "p", flags: { stagecraft: { chalk: { v: 2, scene: "sc", by: "ana", since: 1, tiles: { c0r0: "a" }, history: {} } } } });
  world.hooks.callAll("createJournalEntryPage", t.entry.pages[0]);
  await settle();
  assert.equal(t.host.backend.shown.length, before);
});


test("wet ink: the stroke is shown at once on the wet layer and reaches the wall only when the pointer comes up", async () => {
  const wet = fakeWet();
  const t = await table({ chalk: { mode: "anywhere" }, wet });
  t.controller.take("yellow");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(wet.calls.at(0)?.[0], "warm", "made ready when the chalk is taken, so the first stroke is not the first time the card draws it");
  assert.equal(t.controller.begin(at(0.2, 0.3)), true);
  const live = [...t.wall.strokes.values()][0];
  assert.equal(live.wet, true, "the wall holds a wet stroke back from the picture while it is being painted");
  for (const [x, y] of across(0.2, 0.3, 0.3).slice(1)) t.controller.extend(at(x, y));
  t.controller.finishMove();
  assert.ok(wet.names().includes("begin") && wet.names().filter((n) => n === "add").length > 3, "every sample's dabs go to the wet ink");
  assert.deepEqual(wet.calls.at(-1), ["tail", 864, 432], "and its tail reaches to the pointer (wall pixels)");
  const finishing = t.controller.end();
  assert.deepEqual(wet.names().slice(-2), ["add", "end"], "the last of the paint, then the end");
  assert.equal(t.wall.strokes.size, 0, "the stroke is laid in the wall at once");
  assert.ok(!wet.names().includes("release"), "the wet ink stays up until the wall's tiles have been drawn");
  t.controller.afterDraw();
  assert.equal(wet.names().at(-1), "release", "the frame that shows the wall's paint takes the wet ink away");
  await finishing;
  await settle();
  assert.ok(mine(t), "and it is kept all the same");
  t.controller.stop();
});

test("wet ink: a new stroke does not wait for the last one's wet ink to go; Escape throws the wet ink away; nowhere to show it means the wall shows it", async () => {
  const wet = fakeWet();
  const t = await table({ chalk: { mode: "anywhere" }, wet });
  t.controller.take("white");
  await paint(t.controller, across(0.2, 0.3, 0.3));
  const before = wet.names().filter((n) => n === "release").length;
  assert.equal(t.controller.begin(at(0.5, 0.5)), true);
  assert.equal(wet.names().filter((n) => n === "release").length, before + 1, "the earlier stroke's wet ink goes when the next begins (the wall shows it by now)");
  t.controller.cancel();
  assert.equal(wet.names().at(-1), "release", "Escape in the middle of a stroke clears it");
  wet.accept = false;
  assert.equal(t.controller.begin(at(0.6, 0.6)), true);
  assert.equal([...t.wall.strokes.values()][0].wet, false, "no wet layer to show it on: the wall shows the stroke as it goes");
  t.controller.cancel();
  // the eraser, the smudge and the fill are the wall's business
  t.controller.choose("eraser");
  const calls = wet.calls.length;
  assert.equal(t.controller.begin(at(0.5, 0.5)), true);
  assert.equal(wet.calls.length, calls, "an eraser is never wet");
  t.controller.cancel();
  t.controller.stop();
});

test("no wet ink where the picture cannot place it (the plain 2D one, a bench): the wall shows paint as it always did", async () => {
  const t = await table({ chalk: { mode: "anywhere" }, wet: null });
  t.controller.take("white");
  assert.equal(t.controller.begin(at(0.2, 0.3)), true);
  assert.notEqual([...t.wall.strokes.values()][0].wet, true);
  t.controller.extend(at(0.25, 0.3));
  t.controller.finishMove();
  t.controller.afterDraw();
  await t.controller.end();
  await settle();
  assert.ok(mine(t));
  t.controller.stop();
});

/** A clock that only moves when told, for a Quiet. */
function stillness() {
  const c = { t: 1000, timers: [] };
  c.quiet = new Quiet({ rest: 450, most: 2500, now: () => c.t, later: (fn, ms) => { const id = { fn, at: c.t + ms }; c.timers.push(id); return id; }, cancel: (id) => { c.timers = c.timers.filter((x) => x !== id); } });
  c.advance = async (ms) => {
    const to = c.t + ms;
    for (;;) {
      const next = c.timers.filter((x) => x.at <= to).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      c.timers = c.timers.filter((x) => x !== next);
      c.t = Math.max(c.t, next.at);
      next.fn();
      await settle();
    }
    c.t = to;
    await settle();
  };
  return c;
}

test("a stroke is kept once the hand pauses, not at the instant the pointer comes up; the others are told at once what to wait for", async () => {
  const clock = stillness();
  const t = await table({ chalk: { mode: "anywhere" }, quiet: clock.quiet });
  t.controller.take("yellow");
  t.controller.begin(at(0.2, 0.3));
  for (const [x, y] of across(0.2, 0.3, 0.3).slice(1)) t.controller.extend(at(x, y));
  const done = t.controller.end();
  await settle();
  assert.equal(mine(t), undefined, "nothing is written to the world while the hand may paint again");
  assert.deepEqual(sent.at(-1), { type: "chalk", op: "end", scene: "sc", id: sent.at(-1).id, layers: ["me"] }, "but the others hear at once");
  assert.ok(Object.keys(t.wall.tilesOf("me")).length > 0, "and the paint is on the wall");
  // a second stroke a moment later: still no writing, and the pause starts again
  await clock.advance(300);
  t.controller.begin(at(0.5, 0.5));
  t.controller.extend(at(0.55, 0.5));
  const second = t.controller.end();
  await clock.advance(400);
  assert.equal(mine(t), undefined, "the pause begins again after every stroke");
  await clock.advance(100);
  await Promise.all([done, second]);
  await settle();
  assert.equal(Object.keys(mine(t).history).length, 2, "both are kept, as the two steps they were, once the hand rested");
  t.controller.stop();
});

test("the pause never holds a stroke for more than a few seconds, and Ctrl+Z or putting the chalk away does not wait for it", async () => {
  const clock = stillness();
  const t = await table({ chalk: { mode: "anywhere" }, quiet: clock.quiet });
  t.controller.take("white");
  t.controller.begin(at(0.2, 0.3));
  t.controller.extend(at(0.25, 0.3));
  const first = t.controller.end();
  // a hand that never rests: a stroke every 200 ms
  for (let i = 0; i < 14; i++) {
    await clock.advance(200);
    t.controller.begin(at(0.5, 0.2 + i * 0.01));
    t.controller.extend(at(0.55, 0.2 + i * 0.01));
    void t.controller.end();
  }
  await first;
  await settle();
  assert.ok(mine(t), "the first stroke was kept at the latest after the limit, rest or no rest");

  const undo = t.controller.undo();                         // does not wait for a pause
  await undo;
  await settle();
  t.controller.begin(at(0.3, 0.45));
  t.controller.extend(at(0.35, 0.45));
  const last = t.controller.end();
  t.controller.putAway();
  await last;
  await settle();
  assert.ok(Object.keys(mine(t).history).length >= 1, "putting the chalk away keeps what is waiting");
  t.controller.stop();
});

test("a stroke that changed fewer layers than announced is announced again, so other screens do not wait for a layer that will not come", async () => {
  const t = await table({ chalk: { mode: "zones" } });
  t.controller.take("white");
  t.wall.masked = true;
  await paint(t.controller, across(0.6, 0.8, 0.3));
  const ends = sent.filter((m) => m.op === "end");
  assert.deepEqual(ends.map((m) => m.layers), [["me"], []], "first the layers the wall handed back, then the layers that really changed");
  t.controller.receive({ type: "chalk", op: "begin", scene: "sc", id: "ana9", tool: "chalk", colour: "#ff0000", size: 9, steady: 0, seed: 7 }, "ana");
  t.controller.receive({ type: "chalk", op: "end", scene: "sc", id: "ana9", layers: ["ana", "ghost"] }, "ana");
  assert.ok(t.wall.strokes.has("ana9"), "waiting for two layers");
  t.controller.receive({ type: "chalk", op: "end", scene: "sc", id: "ana9", layers: [] }, "ana");
  assert.equal(t.wall.strokes.has("ana9"), false, "told again that nothing changed: the live copy goes");
  t.controller.stop();
});
