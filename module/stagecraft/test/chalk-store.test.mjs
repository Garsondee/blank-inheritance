// Where chalk is kept (second edition, raster): one journal entry every player owns, a page per scene and painter holding
// that painter's layer as tiles of pixels (small pictures) and a short history to take strokes back. Run against a
// stand-in for Foundry's journal (test/fake-foundry.mjs).

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installFoundry, settle, OWNER, DEL } from "./fake-foundry.mjs";

const { ChalkStore, ENTRY_NAME, FORMAT } = await import("../scripts/foundry/chalk-store.mjs");
const { HISTORY, stepId, wallGrid } = await import("../scripts/core/chalk.mjs");

let world;
beforeEach(() => { world = installFoundry(); });

const pic = (n) => `data:image/webp;base64,PIC${n}`;
let clock = 1000;
const step = () => { clock += 10; return { id: stepId(clock, "me"), at: clock }; };
const flags = (page) => page.getFlag("stagecraft", "chalk");

async function withEntry() {
  return JournalEntry.create({ name: ENTRY_NAME, flags: { stagecraft: { chalk: true } }, ownership: { default: OWNER } });
}

/** Someone else's layer, as their own client would have kept it. */
function theirLayer(entry, by, scene, tiles, history = {}, since = 1) {
  return world.page(entry, { name: `chalk ${scene} ${by}`, flags: { stagecraft: { chalk: { v: FORMAT, scene, by, since, tiles, history } } } });
}

test("a GM makes the chalk journal once, owned by everyone; a player cannot make it", async () => {
  world.user.isGM = true;
  const first = await ChalkStore.ensure();
  const second = await ChalkStore.ensure();
  assert.equal(first.id, second.id, "there is only ever one");
  assert.equal(world.entries.length, 1);
  assert.equal(first.ownership.default, OWNER, "every player owns it, so every player can write their own pages");
  assert.equal(first.name, ENTRY_NAME);
  world.entries[0].ownership.default = 1;                       // someone lowered it
  await ChalkStore.ensure();
  assert.equal(world.entries[0].ownership.default, OWNER, "repaired at the next GM login");
  world = installFoundry({ user: { id: "p", name: "P", isGM: false } });
  assert.equal(await ChalkStore.ensure(), null);
  assert.equal(world.entries.length, 0);
});

const stageScene = (id, chalk, live) => ({ id, flags: { stagecraft: { stage: { painting: { src: "p.png", size: [10, 10] }, ...(chalk ? { chalk } : {}) }, ...(live ? { live: { chalk: live } } : {}) } } });

test("chalk is wanted only where a stage scene allows it, as written or as the GM has overridden it", () => {
  assert.equal(ChalkStore.wanted(), false, "no scenes at all");
  world.scenes.push({ id: "plain", flags: {} });
  world.scenes.push(stageScene("serious", { mode: "off" }));
  world.scenes.push(stageScene("silent"));
  assert.equal(ChalkStore.wanted(), false);
  world.scenes.push(stageScene("lively", { mode: "zones" }));
  assert.equal(ChalkStore.wanted(), true);
  world.scenes.pop();
  world.scenes.push(stageScene("opened", { mode: "off" }, { mode: "anywhere" }));
  assert.equal(ChalkStore.wanted(), true, "the GM's strip can open a serious scene");
  world.scenes.pop();
  world.scenes.push(stageScene("closed", { mode: "anywhere" }, { mode: "off" }));
  assert.equal(ChalkStore.wanted(), false, "and close an open one");
});

test("a world that never uses chalk never gets the journal, and flagging a scene for chalk makes it", async () => {
  world.user.isGM = true;
  const store = new ChalkStore();
  world.scenes.push({ id: "plain", flags: {} });
  world.hooks.callAll("updateScene", world.scenes[0]);
  await settle();
  assert.equal(world.entries.length, 0, "nothing wanted, nothing made");
  world.scenes.push(stageScene("lively", { mode: "zones" }));
  world.hooks.callAll("updateScene", world.scenes[1]);
  await settle();
  assert.equal(world.entries.length, 1, "wanted now");
  world.hooks.callAll("updateScene", world.scenes[1]);
  await settle();
  assert.equal(world.entries.length, 1, "and not made twice");
  store.dispose();
});

test("the store is not ready until the journal exists, and says so when it arrives", async () => {
  const store = new ChalkStore();
  const heard = [];
  store.onChange((scene, by) => heard.push([scene, by]));
  assert.equal(store.ready, false);
  assert.equal(await store.save("sc", { tiles: { c0r0: pic(1) } }), false, "paint with nowhere to go is reported, not thrown");
  await withEntry();
  assert.equal(store.ready, true);
  assert.deepEqual(heard, [[null, null]], "every scene is told to look again");
  store.dispose();
});

test("a painter's first paint makes their own page for that scene, a layer of tiles; later paint goes on it", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  await store.save("sc", { tiles: { c1r1: pic(1), c2r1: pic(2) }, step: step() });
  await store.save("sc", { tiles: { c2r1: pic(3), c3r1: pic(4) }, step: step() });
  assert.equal(entry.pages.length, 1);
  const data = flags(entry.pages[0]);
  assert.deepEqual([data.v, data.scene, data.by], [FORMAT, "sc", "me"]);
  assert.deepEqual(data.tiles, { c1r1: pic(1), c2r1: pic(3), c3r1: pic(4) });
  const [layer] = store.layers("sc");
  assert.equal(layer.by, "me");
  assert.ok(layer.since > 0, "a layer knows when its painter first painted, which is its place in the stack");
  assert.deepEqual(store.layers("elsewhere"), [], "another scene has its own wall");
  store.dispose();
});

test("a tile is written on its own: changing one leaves the others alone, and an empty tile is taken away", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  await store.save("sc", { tiles: { c0r0: pic(1), c1r0: pic(2) } });
  await store.save("sc", { tiles: { c0r0: null } });
  assert.deepEqual(world.lastUpdate, { "flags.stagecraft.chalk.tiles.c0r0": DEL }, "one key deleted with Foundry 14's _del, nothing else rewritten");
  assert.deepEqual(flags(entry.pages[0]).tiles, { c1r0: pic(2) });
  await store.save("sc", { tiles: { c9r9: pic(3) }, grid: wallGrid({ size: [1920, 960] }) });
  assert.deepEqual(Object.keys(flags(entry.pages[0]).tiles), ["c1r0"], "a key off the wall is never kept");
  store.dispose();
});

test("on a Foundry older than 14 (no _del) a key is taken away the older way, with -=", async () => {
  world = installFoundry({ del: false });
  const store = new ChalkStore();
  const entry = await withEntry();
  await store.save("sc", { tiles: { c0r0: pic(1), c1r0: pic(2) } });
  await store.save("sc", { tiles: { c0r0: null } });
  assert.deepEqual(world.lastUpdate, { "flags.stagecraft.chalk.tiles.-=c0r0": null });
  assert.deepEqual(flags(entry.pages[0]).tiles, { c1r0: pic(2) });
  store.dispose();
});

test("each stroke keeps what its tiles held before, and only the newest steps are kept", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  const first = step();
  await store.save("sc", { tiles: { c0r0: pic(1) }, step: first });
  const second = step();
  await store.save("sc", { tiles: { c0r0: pic(2), c1r0: pic(3) }, step: second });
  const history = flags(entry.pages[0]).history;
  assert.deepEqual(history[first.id].tiles, { c0r0: null }, "before the first stroke the tile was empty");
  assert.deepEqual(history[second.id].tiles, { c0r0: pic(1), c1r0: null });
  assert.equal(history[second.id].who, "me");
  for (let i = 0; i < HISTORY + 4; i++) await store.save("sc", { tiles: { c0r0: pic(10 + i) }, step: step() });
  const kept = flags(entry.pages[0]).history;
  assert.equal(Object.keys(kept).length, HISTORY, "a page keeps only the newest steps, so it never grows without bound");
  assert.equal(kept[first.id], undefined, "the oldest went first");
  store.dispose();
});

test("taking back my newest stroke puts its tiles back as they were, a new tile taken away", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  await store.save("sc", { tiles: { c0r0: pic(1) }, step: step() });
  await store.save("sc", { tiles: { c0r0: pic(2), c1r0: pic(3) }, step: step() });
  const back = await store.undo("sc", { by: "me" });
  assert.deepEqual(back.layers, { me: { c0r0: pic(2), c1r0: pic(3) } }, "what each tile held before it was taken back, so it can be put back");
  assert.deepEqual(flags(entry.pages[0]).tiles, { c0r0: pic(1) });
  await store.undo("sc", { by: "me" });
  assert.deepEqual(flags(entry.pages[0]).tiles, {});
  assert.equal(await store.undo("sc", { by: "me" }), null, "nothing left to take back");
  store.dispose();
});

test("a painter cannot take back what a GM did to their layer; the GM's Undo takes back the newest on the whole wall", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  const ana = theirLayer(entry, "ana", "sc", { c0r0: pic(1) }, { [stepId(5, "ana")]: { at: 5, who: "ana", tiles: { c0r0: null } } });
  await store.save("sc", { tiles: { c2r2: pic(7) }, step: { id: stepId(8, "me"), at: 8 } });
  // a GM rubs out across everyone's layers in one stroke: one step, kept on each layer it touched
  world.user.isGM = true;
  const gm = { id: stepId(20, "gm"), at: 20 };
  await store.save("sc", { by: "ana", tiles: { c0r0: null }, step: gm });
  await store.save("sc", { by: "me", tiles: { c2r2: null }, step: gm });
  world.user.isGM = false;
  world.user.id = "ana";
  assert.equal((await store.undo("sc", { by: "ana" })).id, stepId(5, "ana"), "Ana's own undo skips the GM's step and takes back her own");
  world.user.id = "me";
  world.user.isGM = true;
  // reset Ana's page to after the GM's rub-out, then let the GM undo
  await ana.update({ "flags.stagecraft.chalk.tiles.-=c0r0": null, [`flags.stagecraft.chalk.history.${gm.id}`]: { at: 20, who: "me", tiles: { c0r0: pic(1) } } });
  const undone = await store.undo("sc");
  assert.equal(undone.id, gm.id, "the newest on the whole wall");
  assert.deepEqual(undone.layers, { ana: { c0r0: null }, me: { c2r2: null } }, "taken back from every layer the stroke touched");
  assert.deepEqual(flags(ana).tiles, { c0r0: pic(1) }, "Ana's paint is back");
  assert.deepEqual(flags(entry.pages.find((p) => flags(p).by === "me")).tiles, { c2r2: pic(7) }, "and mine, from the same stroke");
  store.dispose();
});

test("paint saved a moment apart is all kept: writes go one after another, and a first save makes one page", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  await Promise.all([1, 2, 3].map((i) => store.save("sc", { tiles: { [`c${i}r0`]: pic(i) }, step: step() })));
  assert.equal(entry.pages.length, 1, "one first page, not three");
  assert.deepEqual(Object.keys(flags(entry.pages[0]).tiles).sort(), ["c1r0", "c2r0", "c3r0"]);
  store.dispose();
});

test("a failed write does not stop the ones after it", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  await store.save("sc", { tiles: { c0r0: pic(1) } });
  const page = entry.pages[0];
  const original = page.update.bind(page);
  let fail = true;
  page.update = async (changes) => { if (fail) { fail = false; throw new Error("the server said no"); } return original(changes); };
  await assert.rejects(store.save("sc", { tiles: { c1r0: pic(2) } }), /server said no/);
  await store.save("sc", { tiles: { c2r0: pic(3) } });
  assert.deepEqual(Object.keys(flags(page).tiles).sort(), ["c0r0", "c2r0"]);
  store.dispose();
});

test("a player cannot start someone else's layer; a GM can write any layer that is there", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  assert.equal(await store.save("sc", { by: "ana", tiles: { c0r0: pic(1) } }), false);
  assert.equal(entry.pages.length, 0);
  theirLayer(entry, "ana", "sc", { c0r0: pic(1) });
  world.user.isGM = true;
  await store.save("sc", { by: "ana", tiles: { c0r0: null } });
  assert.deepEqual(flags(entry.pages[0]).tiles, {});
  store.dispose();
});

test("only a GM can wipe, and a wipe can be limited to one painter; history goes with it", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  theirLayer(entry, "ana", "sc", { c0r0: pic(1) }, { [stepId(1, "a")]: { at: 1, who: "ana", tiles: { c0r0: null } } });
  theirLayer(entry, "bo", "sc", { c1r0: pic(2) });
  await store.wipe("sc");
  assert.deepEqual(store.painters("sc").sort(), ["ana", "bo"], "a player's wipe does nothing");
  world.user.isGM = true;
  await store.wipe("sc", { by: "ana" });
  assert.deepEqual(store.painters("sc"), ["bo"]);
  assert.deepEqual(flags(entry.pages[0]).history, {}, "and nothing to take back into a wiped wall");
  await store.wipe("sc");
  assert.deepEqual(store.painters("sc"), []);
  store.dispose();
});

test("listeners hear which painter's layer of which scene changed, and about nothing else", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  const heard = [];
  const off = store.onChange((scene, by) => heard.push([scene, by]));
  await store.save("sc", { tiles: { c0r0: pic(1) } });              // makes my page
  await store.save("sc", { tiles: { c0r0: pic(2) } });              // updates it
  assert.deepEqual(heard, [["sc", "me"], ["sc", "me"]]);
  const other = await JournalEntry.create({ name: "Notes", ownership: { default: OWNER } });
  world.hooks.callAll("createJournalEntryPage", world.page(other, { name: "n", flags: { stagecraft: { chalk: { v: FORMAT, scene: "zzz", by: "x" } } } }));
  world.hooks.callAll("updateJournalEntryPage", world.page(entry, { name: "plain", flags: { stagecraft: { chalk: { v: FORMAT } } } }));
  assert.equal(heard.length, 2, "a page of another journal, or one with no scene, is not news");
  off();
  await store.save("sc", { tiles: { c0r0: pic(3) } });
  assert.equal(heard.length, 2, "an unsubscribed listener hears nothing");
  store.dispose();
});

test("pages of the first edition (lines of points) are removed by a GM's client and never read", async () => {
  const entry = await withEntry();
  world.page(entry, { name: "old", flags: { stagecraft: { chalk: { scene: "sc", by: "ana", strokes: [{ id: "x", p: [1, 2, 3, 4] }] } } } });
  const playerStore = new ChalkStore();
  await settle();
  assert.equal(entry.pages.length, 1, "a player's client leaves them for a GM");
  assert.deepEqual(playerStore.layers("sc"), [], "and never shows them");
  playerStore.dispose();
  world.user.isGM = true;
  const gmStore = new ChalkStore();
  await settle();
  assert.equal(entry.pages.length, 0, "a GM's client removes them");
  gmStore.dispose();
});

test("a layer's history is kept to a budget of pictures: the oldest steps go first, the newest stays (chalk.md §11.2)", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  const big = (n) => `data:image/webp;base64,${String(n).repeat(100 * 1024)}`;           // 100 KB a picture
  const ids = [];
  for (let i = 1; i <= 6; i++) {
    const s = step();
    ids.push(s.id);
    await store.save("sc", { tiles: { c0r0: big(i) }, step: s });
  }
  const kept = Object.keys(flags(entry.pages[0]).history);
  assert.ok(kept.length < 6 && kept.length >= 2, `the budget holds only some: ${kept.length}`);
  assert.deepEqual(kept.sort(), ids.slice(-kept.length), "the newest ones, in order");
  assert.ok(kept.includes(ids.at(-1)), "the step just made is always there");
  const weight = Object.values(flags(entry.pages[0]).history).reduce((n, s) => n + s.tiles.c0r0.length, 0);
  assert.ok(weight <= 330 * 1024, `no more than the budget of pictures: ${Math.round(weight / 1024)} KB`);
  store.dispose();
});

test("the acting GM's client tidies the journal: old history, layers with nothing left, pages of scenes that are gone", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  const now = 100 * 3600 * 1000;
  const hour = 3600 * 1000;
  world.scenes.push({ id: "sc", flags: {} });
  // ana: paint with an old step and a fresh one; bo: nothing left but old history; cy: a scene that is gone
  const ana = theirLayer(entry, "ana", "sc", { c0r0: pic(1) }, {
    [stepId(now - 20 * hour, "o")]: { at: now - 20 * hour, who: "ana", tiles: { c0r0: null } },
    [stepId(now - 1 * hour, "n")]: { at: now - 1 * hour, who: "ana", tiles: { c0r0: pic(0) } }
  });
  theirLayer(entry, "bo", "sc", {}, { [stepId(now - 30 * hour, "o")]: { at: now - 30 * hour, who: "bo", tiles: { c1r1: pic(5) } } });
  theirLayer(entry, "cy", "gone", { c0r0: pic(2) });
  const player = await store.tidy({ now });
  assert.deepEqual(player, { steps: 0, pages: 0 }, "a player's client tidies nothing");
  assert.equal(entry.pages.length, 3);
  world.user.isGM = true;
  const done = await store.tidy({ now });
  assert.deepEqual(done, { steps: 1, pages: 2 }, "one old step dropped (ana's), two pages deleted whole (bo's, cy's)");
  assert.deepEqual(entry.pages.map((p) => flags(p).by), ["ana"], "bo's emptied layer and cy's lost scene are gone");
  assert.deepEqual(Object.keys(flags(ana).history), [stepId(now - 1 * hour, "n")], "ana's old step is gone, her fresh one stays");
  assert.deepEqual(flags(ana).tiles, { c0r0: pic(1) }, "and what is painted on the wall is never touched");
  assert.deepEqual(await store.tidy({ now }), { steps: 0, pages: 0 }, "tidy again: nothing left to do");
  // the first edition's pages are not ours to keep either
  world.page(entry, { name: "old", flags: { stagecraft: { chalk: { scene: "sc", by: "ana", strokes: [] } } } });
  assert.deepEqual(await store.tidy({ now }), { steps: 0, pages: 1 });
  store.dispose();
});

test("a disposed store leaves no hooks behind", async () => {
  const names = ["createJournalEntryPage", "updateJournalEntryPage", "deleteJournalEntryPage", "createJournalEntry", "updateJournalEntry", "deleteJournalEntry", "deleteScene"];
  const before = names.map((n) => world.hooks.count(n));
  const store = new ChalkStore();
  assert.deepEqual(names.map((n) => world.hooks.count(n)), before.map((n) => n + 1));
  store.dispose();
  assert.deepEqual(names.map((n) => world.hooks.count(n)), before);
  await settle();
});

test("a deleted scene takes its chalk with it, and only a GM's client does the clearing", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  await store.save("doomed", { tiles: { c0r0: pic(1) } });
  await store.save("kept", { tiles: { c0r0: pic(2) } });
  theirLayer(entry, "ana", "doomed", { c1r1: pic(3) });
  world.hooks.callAll("deleteScene", { id: "doomed" });
  await settle();
  assert.equal(store.layers("doomed").length, 2, "a player's client leaves it for a GM");
  world.user.isGM = true;
  world.hooks.callAll("deleteScene", { id: "doomed" });
  await settle();
  assert.deepEqual(store.layers("doomed"), [], "every painter's layer for that scene is gone");
  assert.equal(store.layers("kept").length, 1, "another scene's wall is untouched");
  store.dispose();
});

test("the chalk's journal entry is looked for among the world's journals once, not at every journal page that changes anywhere", async () => {
  // found 2026-10-05 in a performance audit: `entry` was a scan of every journal, asked at every page changed in the world
  // (a note typed in the notebook) and at every page of chalk read
  const entry = await withEntry();
  const store = new ChalkStore();
  let scans = 0;
  const find = world.entries.find.bind(world.entries);
  world.entries.find = (fn) => { scans++; return find(fn); };
  for (let i = 0; i < 20; i++) assert.equal(store.entry.id, entry.id);
  assert.equal(scans, 1, "found once, then remembered by its id");
  // the world's journals change: another entry arrives, and a page of another journal is touched
  world.entries.push({ id: "notebook", flags: {}, getFlag: () => undefined, pages: [] });
  assert.equal(store.entry.id, entry.id);
  assert.equal(scans, 1, "nothing else being added makes it look again");
  // the entry itself goes, then a new one is made: it is looked for again, and found
  world.entries.splice(world.entries.indexOf(entry), 1);
  assert.equal(store.entry, null);
  assert.ok(scans >= 2, "a remembered entry that is gone is looked for afresh");
  const again = await withEntry();
  assert.equal(store.entry.id, again.id);
  store.dispose();
});
