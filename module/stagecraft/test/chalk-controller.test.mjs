// The box of chalk at a table: the controller joins the rules, the journal-backed store, the wall the backend draws and
// the pointer. Run here against the real store on a stand-in journal and a recording backend; the real pointer, the
// real wall and the real server are exercised by tools/stagecraft/foundry-check.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { installFoundry, settle, OWNER } from "./fake-foundry.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { ChalkStore, ENTRY_NAME } = await import("../scripts/foundry/chalk-store.mjs");
const { ChalkController } = await import("../scripts/foundry/chalk.mjs");
const { describeScene } = await import("../scripts/core/scene.mjs");
const { makeStroke, LIMITS } = await import("../scripts/core/chalk.mjs");

// the stage is 1000 x 500 px; the back wall (the only chalk zone) is x 0.05..0.45, y 0.2..0.62 of the painting
const px = (x, y) => ({ x: x * 1000, y: y * 500 });

function recordingBackend() {
  const b = {
    wall: new Map(), calls: [], box: null, hidden: null, cursor: null, preview: null,
    setChalkBox(on) { b.box = on; },
    setChalkHidden(on) { b.hidden = on; },
    setChalkCursor(p, tool, drawing) { b.cursor = p ? { p, tool, drawing } : null; },
    setChalkPreview(points, colour, size) { b.preview = points?.length ? { points, colour, size } : null; },
    addChalkStroke(s) { b.wall.set(s.id, s); b.calls.push(["add", s.id]); },
    removeChalkStrokes(ids) { for (const id of ids) b.wall.delete(id); b.calls.push(["remove", ...ids]); },
    paintingAt(x, y) { return { x: x / 1000, y: y / 500 }; }
  };
  return b;
}

let world;
let hookLog;

/** A fresh world, journal and stage for each table (never two alive at once: the globals are the latest one's). */
async function table({ chalk = { mode: "zones" }, live = null, journal = true } = {}) {
  world = installFoundry();
  hookLog = [];
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
  const controller = new ChalkController({ host, store });
  controller.sync();
  controller.refresh();
  return { controller, store, entry, host, classes };
}

/** Draw a line with the pointer: down at the first point, move through the rest, up at the last. */
async function draw(controller, points) {
  const [first, ...rest] = points;
  assert.equal(controller.begin(px(...first)), true, "the chalk begins");
  for (const p of rest) controller.hover(px(...p));
  await controller.end();
  await settle();
}
const across = (x0, x1, y, n = 24) => Array.from({ length: n }, (_, i) => [x0 + ((x1 - x0) * i) / (n - 1), y]);

test("the box shows only where chalk may be used: a chalk zone, anywhere, never when off or frozen, never without the journal", async () => {
  assert.equal((await table({ chalk: { mode: "zones" } })).host.backend.box, true);
  assert.equal((await table({ chalk: { mode: "anywhere" } })).host.backend.box, true);
  assert.equal((await table({ chalk: { mode: "off" } })).host.backend.box, false, "a serious scene has no box");
  assert.equal((await table({ chalk: { mode: "anywhere", lock: true } })).host.backend.box, false, "a frozen wall has no box");
  assert.equal((await table({ journal: false })).host.backend.box, false, "no journal yet (a GM has not logged in): nothing to keep chalk in");
});

test("the GM's live override opens a closed scene and closes an open one, at once", async () => {
  const t = await table({ chalk: { mode: "off" } });
  assert.equal(t.host.backend.box, false);
  t.host.scene.flags = { stagecraft: { live: { chalk: { mode: "anywhere" } } } };
  t.controller.refresh();
  assert.equal(t.host.backend.box, true, "opened");
  t.controller.take("pink");
  assert.equal(t.controller.inHand, "pink");
  t.host.scene.flags = { stagecraft: { live: { chalk: { mode: "off" } } } };
  t.controller.refresh();
  assert.equal(t.host.backend.box, false, "closed again");
  assert.equal(t.controller.inHand, null, "and the chalk in hand is put back");
  assert.equal(t.host.backend.cursor, null);
});

test("freezing keeps the wall and takes the chalk away; the wall can also be hidden without losing it", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("white");
  await draw(t.controller, across(0.2, 0.3, 0.3));
  assert.equal(t.host.backend.wall.size, 1);
  t.host.scene.flags = { stagecraft: { live: { chalk: { locked: true } } } };
  t.controller.refresh();
  assert.equal(t.host.backend.box, false);
  assert.equal(t.host.backend.wall.size, 1, "what was drawn is still on the wall");
  t.host.scene.flags = { stagecraft: { live: { chalk: { locked: true }, chalkHidden: true } } };
  t.controller.refresh();
  assert.equal(t.host.backend.hidden, true);
  assert.equal(t.store.strokes("sc").length, 1, "hidden is not gone");
});

test("taking and putting away: a stick is taken from the box, the same stick again puts it back, and a closed box gives nothing", async () => {
  const t = await table();
  t.controller.take("yellow");
  assert.equal(t.controller.inHand, "yellow");
  assert.ok(t.classes.has("stagecraft-chalk"), "the stage knows chalk is in hand");
  t.controller.take("yellow");
  assert.equal(t.controller.inHand, null);
  assert.ok(!t.classes.has("stagecraft-chalk"));
  t.controller.take("blue");
  t.controller.take("rub");
  assert.equal(t.controller.inHand, "rub", "switching tools is one press");
  t.controller.putAway();
  assert.equal(t.host.backend.cursor, null);

  const closed = await table({ chalk: { mode: "off" } });
  closed.controller.take("white");
  assert.equal(closed.controller.inHand, null);
});

test("a line drawn with chalk in hand is on the wall at once and in the journal a moment later, with who drew it", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("yellow");
  assert.equal(t.controller.begin(px(0.2, 0.3)), true);
  assert.ok(t.host.backend.preview, "the line being drawn shows before it is a stroke");
  t.controller.hover(px(0.25, 0.32));
  t.controller.hover(px(0.3, 0.3));
  assert.equal(t.host.backend.cursor.drawing, true);
  const finishing = t.controller.end();
  assert.equal(t.host.backend.preview, null, "the preview goes the moment the pointer comes up");
  assert.equal(t.host.backend.wall.size, 1, "the stroke is already on the wall, before the journal has it");
  assert.equal(t.store.strokes("sc").length, 0);
  await finishing;
  await settle();

  const [saved] = t.store.strokes("sc");
  assert.ok(saved, "kept in the journal");
  assert.deepEqual([saved.by, saved.scene, saved.colour], ["me", "sc", "yellow"]);
  assert.equal(t.host.backend.wall.size, 1, "and still exactly one on the wall");
  assert.equal(t.controller.pending.size, 0, "nothing left waiting");
  assert.equal(hookLog.length, 1, "the adventure is told, once");
  assert.equal(hookLog[0].stroke.id, saved.id);
  assert.equal(hookLog[0].by, "me");
});

test("in zones mode a line that leaves the chalk zone stops at its edge; anywhere does not stop it", async () => {
  const zones = await table({ chalk: { mode: "zones" } });
  zones.controller.take("white");
  await draw(zones.controller, across(0.3, 0.7, 0.4, 40));         // the back wall ends at x 0.45
  const strokes = zones.store.strokes("sc");
  assert.equal(strokes.length, 1);
  const xs = strokes[0].p.filter((_, i) => i % 2 === 0);
  assert.ok(Math.max(...xs) <= 450 + 1, `the stroke ends at the zone edge (to a thousandth): ${Math.max(...xs)}`);

  const outside = await table({ chalk: { mode: "zones" } });
  outside.controller.take("white");
  await draw(outside.controller, across(0.6, 0.9, 0.4));
  assert.equal(outside.store.strokes("sc").length, 0, "nothing outside the zone is kept");

  const free = await table({ chalk: { mode: "anywhere" } });
  free.controller.take("white");
  await draw(free.controller, across(0.3, 0.7, 0.4, 40));
  const xsFree = free.store.strokes("sc")[0].p.filter((_, i) => i % 2 === 0);
  assert.ok(Math.max(...xsFree) >= 699, "anywhere is anywhere");
});

test("chalk drawn by someone else shows up on the wall, and goes when they rub it out or the GM wipes it", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  world.page(t.entry, { name: "p", flags: { stagecraft: { chalk: { scene: "sc", by: "ana", strokes: [makeStroke({ id: "a1", scene: "sc", by: "ana", at: 5, colour: "blue", size: "medium", points: [[0.1, 0.1], [0.3, 0.3]] }).stroke] } } } });
  world.hooks.callAll("createJournalEntryPage", t.entry.pages[0]);
  assert.deepEqual([...t.host.backend.wall.keys()], ["a1"]);
  t.entry.pages[0].flags.stagecraft.chalk.strokes = [];
  world.hooks.callAll("updateJournalEntryPage", t.entry.pages[0]);
  assert.equal(t.host.backend.wall.size, 0);
});

test("another person's chalk arriving while mine is still being saved does not make mine flicker out", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("pink");
  t.controller.begin(px(0.2, 0.3));
  t.controller.hover(px(0.3, 0.35));
  const saving = t.controller.end();                  // the save is under way
  const mine = [...t.host.backend.wall.keys()];
  assert.equal(mine.length, 1);

  // meanwhile someone else's page changes, which makes everyone re-read the wall
  world.page(t.entry, { name: "p", flags: { stagecraft: { chalk: { scene: "sc", by: "ana", strokes: [makeStroke({ id: "a1", scene: "sc", by: "ana", at: 5, colour: "blue", size: "medium", points: [[0.5, 0.5], [0.6, 0.6]] }).stroke] } } } });
  world.hooks.callAll("createJournalEntryPage", t.entry.pages.at(-1));
  assert.ok(t.host.backend.wall.has(mine[0]), "my line is still there");
  assert.ok(t.host.backend.wall.has("a1"), "and theirs arrived");
  assert.ok(!t.host.backend.calls.some((c) => c[0] === "remove" && c.includes(mine[0])), "mine was never taken off and put back");

  await saving;
  await settle();
  assert.deepEqual([...t.host.backend.wall.keys()].sort(), [mine[0], "a1"].sort());
});

test("rubbing out: a player takes away only their own chalk; a line is cut where the eraser passed", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  world.page(t.entry, { name: "p", flags: { stagecraft: { chalk: { scene: "sc", by: "ana", strokes: [makeStroke({ id: "a1", scene: "sc", by: "ana", at: 5, colour: "blue", size: "medium", points: across(0.1, 0.5, 0.32) }).stroke] } } } });
  t.controller.sync();
  t.controller.take("white");
  await draw(t.controller, across(0.1, 0.5, 0.3));            // mine, 0.02 above theirs
  const mineId = t.store.strokes("sc").find((s) => s.by === "me").id;
  assert.equal(t.host.backend.wall.size, 2);

  t.controller.take("rub");
  await draw(t.controller, [[0.3, 0.2], [0.3, 0.45]]);         // a vertical swipe through both
  const left = t.store.strokes("sc");
  assert.ok(!left.some((s) => s.id === mineId), "my line is cut");
  assert.ok(left.some((s) => s.id === "a1"), "hers is not mine to rub");
  assert.equal(left.filter((s) => s.id.startsWith(`${mineId}.`)).length, 2, "mine is left as two pieces either side of the swipe");
  assert.deepEqual([...t.host.backend.wall.keys()].sort(), left.map((s) => s.id).sort(), "the wall shows exactly what is kept");

  world.user.isGM = true;                                       // the eraser is still in hand
  await draw(t.controller, [[0.3, 0.2], [0.3, 0.45]]);
  assert.ok(!t.store.strokes("sc").some((s) => s.id === "a1"), "a GM can rub out anyone's");
});

test("a save that fails takes the line off the wall again rather than showing chalk that is not kept", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.store.append = async () => { throw new Error("the server said no"); };
  const warnings = [];
  const warn = console.warn;
  console.warn = (...a) => warnings.push(a.join(" "));
  try {
    t.controller.take("green");
    await draw(t.controller, across(0.2, 0.4, 0.3));
  } finally { console.warn = warn; }
  assert.equal(t.host.backend.wall.size, 0);
  assert.equal(t.controller.pending.size, 0);
  assert.ok(warnings.some((w) => /could not keep a chalk stroke/.test(w)), "and it says so in the console");
});

test("a full wall forgets its oldest line when a new one is drawn", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  const make = (i) => makeStroke({ id: `old${String(i).padStart(4, "0")}`, scene: "sc", by: "ana", at: i, colour: "white", size: "thin", points: [[0.1, 0.1 + (i % 50) / 100], [0.2, 0.15 + (i % 50) / 100]] }).stroke;
  const all = Array.from({ length: LIMITS.strokesPerScene }, (_, i) => make(i));
  for (let i = 0; i < all.length; i += 40) world.page(t.entry, { name: `p${i}`, flags: { stagecraft: { chalk: { scene: "sc", by: "ana", n: i / 40, strokes: all.slice(i, i + 40) } } } });
  t.controller.sync();
  assert.equal(t.host.backend.wall.size, LIMITS.strokesPerScene);

  t.controller.take("white");
  await draw(t.controller, across(0.6, 0.8, 0.8));
  const kept = t.store.strokes("sc");
  assert.equal(kept.length, LIMITS.strokesPerScene, "still at the cap, not over it");
  assert.ok(!kept.some((s) => s.id === "old0000"), "the oldest went");
  assert.ok(kept.some((s) => s.by === "me"), "the new one stayed");
  assert.equal(t.host.backend.wall.size, LIMITS.strokesPerScene);
});

test("when the picture is rebuilt, the wall is drawn again from what is kept", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("orange");
  await draw(t.controller, across(0.2, 0.4, 0.3));
  await draw(t.controller, across(0.2, 0.4, 0.5));
  assert.equal(t.host.backend.wall.size, 2);
  t.host.backend = recordingBackend();                 // a new picture with an empty wall
  t.controller.reset();
  t.controller.sync();
  t.controller.refresh();
  assert.equal(t.host.backend.wall.size, 2);
  assert.equal(t.host.backend.box, true);
});

test("the journal arriving after the stage (a GM logging in late) turns the box on by itself", async () => {
  const t = await table({ chalk: { mode: "anywhere" }, journal: false });
  assert.equal(t.host.backend.box, false);
  await JournalEntry.create({ name: ENTRY_NAME, flags: { stagecraft: { chalk: true } }, ownership: { default: OWNER } });
  assert.equal(t.host.backend.box, true);
});

test("stopping unsubscribes, so a scene that has gone never redraws", async () => {
  const t = await table({ chalk: { mode: "anywhere" } });
  t.controller.take("white");
  t.controller.stop();
  assert.equal(t.controller.inHand, null);
  const before = t.host.backend.calls.length;
  world.page(t.entry, { name: "p", flags: { stagecraft: { chalk: { scene: "sc", by: "ana", strokes: [makeStroke({ id: "a1", scene: "sc", by: "ana", at: 5, colour: "blue", size: "medium", points: [[0.1, 0.1], [0.3, 0.3]] }).stroke] } } } });
  world.hooks.callAll("createJournalEntryPage", t.entry.pages[0]);
  assert.equal(t.host.backend.calls.length, before);
});
