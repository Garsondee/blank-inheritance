// Where chalk is kept: one journal entry every player owns, a page per scene and drawer. Run against a stand-in for
// Foundry's journal (test/fake-foundry.mjs); the real one is exercised by tools/stagecraft/foundry-check.mjs.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installFoundry, settle, OWNER } from "./fake-foundry.mjs";

const { ChalkStore, ENTRY_NAME, PAGE_CAP } = await import("../scripts/foundry/chalk-store.mjs");
const { makeStroke } = await import("../scripts/core/chalk.mjs");

let world;
beforeEach(() => { world = installFoundry(); });

const stroke = (id, at, by = "me", scene = "sc") =>
  makeStroke({ id, scene, by, at, colour: "white", size: "medium", points: [[0.1, 0.1], [0.4, 0.4]] }).stroke;

async function withEntry() {
  const entry = await JournalEntry.create({ name: ENTRY_NAME, flags: { stagecraft: { chalk: true } }, ownership: { default: OWNER } });
  return entry;
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
  assert.equal(ChalkStore.wanted(), false, "plain scenes, serious scenes and scenes that say nothing do not want it");
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

  world = installFoundry({ user: { id: "p", name: "P", isGM: false } });
  world.scenes.push(stageScene("lively", { mode: "zones" }));
  const playerStore = new ChalkStore();
  world.hooks.callAll("updateScene", world.scenes[0]);
  await settle();
  assert.equal(world.entries.length, 0, "a player's client never makes it");
  store.dispose();
  playerStore.dispose();
});

test("two asks at once make one journal", async () => {
  world.user.isGM = true;
  const [a, b] = await Promise.all([ChalkStore.ensure(), ChalkStore.ensure()]);
  assert.equal(world.entries.length, 1);
  assert.equal(a.id, b.id);
});

test("the store is not ready until the journal exists, and says so when it arrives", async () => {
  const store = new ChalkStore();
  const heard = [];
  store.onChange((scene) => heard.push(scene));
  assert.equal(store.ready, false);
  assert.equal(await store.append("sc", stroke("a", 1)), false, "a stroke with nowhere to go is reported, not thrown");
  await withEntry();
  assert.equal(store.ready, true);
  assert.deepEqual(heard, [null], "every scene is told to look again");
  store.dispose();
});

test("a first stroke makes the drawer's own page for that scene; later ones go on it", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  await store.append("sc", stroke("a", 1));
  await store.append("sc", stroke("b", 2));
  assert.equal(entry.pages.length, 1);
  const page = entry.pages[0];
  assert.deepEqual([page.getFlag("stagecraft", "chalk").scene, page.getFlag("stagecraft", "chalk").by], ["sc", "me"]);
  assert.deepEqual(store.strokes("sc").map((s) => s.id), ["a", "b"]);
  assert.deepEqual(store.strokes("elsewhere"), [], "another scene has its own wall");
  store.dispose();
});

test("a full page starts the next one, so no single update grows without bound", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  for (let i = 0; i < PAGE_CAP + 1; i++) await store.append("sc", stroke(`s${String(i).padStart(3, "0")}`, i));
  assert.equal(entry.pages.length, 2);
  assert.deepEqual(entry.pages.map((p) => p.getFlag("stagecraft", "chalk").strokes.length), [PAGE_CAP, 1]);
  assert.equal(store.strokes("sc").length, PAGE_CAP + 1);
  store.dispose();
});

test("strokes drawn a moment apart are all kept: writes go one after another", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  // no awaiting between them: the second would otherwise read the page as it was before the first landed
  const done = Promise.all([store.append("sc", stroke("a", 1)), store.append("sc", stroke("b", 2)), store.append("sc", stroke("c", 3))]);
  await done;
  assert.equal(entry.pages.length, 1, "one first page, not three");
  assert.deepEqual(store.strokes("sc").map((s) => s.id), ["a", "b", "c"]);
  store.dispose();
});

test("a failed write does not stop the ones after it", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  await store.append("sc", stroke("a", 1));
  const page = entry.pages[0];
  const original = page.update.bind(page);
  let fail = true;
  page.update = async (changes) => { if (fail) { fail = false; throw new Error("the server said no"); } return original(changes); };
  await assert.rejects(store.append("sc", stroke("b", 2)), /server said no/);
  await store.append("sc", stroke("c", 3));
  assert.deepEqual(store.strokes("sc").map((s) => s.id), ["a", "c"]);
  store.dispose();
});

test("everyone's pages merge into one wall, in the order they were drawn", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  world.page(entry, { name: "x", flags: { stagecraft: { chalk: { scene: "sc", by: "ana", strokes: [stroke("a2", 30, "ana"), stroke("a1", 10, "ana")] } } } });
  world.page(entry, { name: "y", flags: { stagecraft: { chalk: { scene: "sc", by: "bo", strokes: [stroke("b1", 20, "bo")] } } } });
  world.page(entry, { name: "z", flags: { stagecraft: { chalk: { scene: "other", by: "bo", strokes: [stroke("o1", 5, "bo", "other")] } } } });
  await store.append("sc", stroke("m1", 25, "me"));
  assert.deepEqual(store.strokes("sc").map((s) => s.id), ["a1", "b1", "m1", "a2"]);
  assert.deepEqual(store.strokes("other").map((s) => s.id), ["o1"]);
  assert.deepEqual(store.strokesBy("sc", "ana").map((s) => s.id), ["a1", "a2"]);
  assert.equal(entry.pages.filter((p) => p.getFlag("stagecraft", "chalk").by === "me").length, 1, "my stroke went on my own page, not on theirs");
  store.dispose();
});

test("a journal entry that is not the chalk journal is never read", async () => {
  const store = new ChalkStore();
  const mine = await withEntry();
  const other = await JournalEntry.create({ name: "Session notes", ownership: { default: OWNER } });
  world.page(other, { name: "n", flags: { stagecraft: { chalk: { scene: "sc", by: "x", strokes: [stroke("nope", 1)] } } } });
  world.page(mine, { name: "c", flags: { stagecraft: { chalk: { scene: "sc", by: "x", strokes: [stroke("yes", 1)] } } } });
  assert.deepEqual(store.strokes("sc").map((s) => s.id), ["yes"]);
  store.dispose();
});

test("removing strokes takes them from whichever page holds them, but not from a page this user may not write", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  const theirs = world.page(entry, { name: "t", flags: { stagecraft: { chalk: { scene: "sc", by: "ana", strokes: [stroke("a1", 1, "ana"), stroke("a2", 2, "ana")] } } } });
  await store.append("sc", stroke("m1", 3));
  await store.append("sc", stroke("m2", 4));
  await store.remove("sc", ["m1", "a1"]);
  assert.deepEqual(store.strokes("sc").map((s) => s.id), ["a2", "m2"], "an owner may remove from any page");

  theirs.ownedBy = ["ana"];                                       // now this page is not ours to write
  await store.remove("sc", ["a2", "m2"]);
  assert.deepEqual(store.strokes("sc").map((s) => s.id), ["a2"], "we took only what we could");
  store.dispose();
});

test("only a GM can wipe, and a wipe can be limited to one drawer", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  world.page(entry, { name: "t", flags: { stagecraft: { chalk: { scene: "sc", by: "ana", strokes: [stroke("a1", 1, "ana")] } } } });
  world.page(entry, { name: "u", flags: { stagecraft: { chalk: { scene: "sc", by: "bo", strokes: [stroke("b1", 2, "bo")] } } } });
  await store.wipe("sc");
  assert.equal(store.strokes("sc").length, 2, "a player's wipe does nothing");

  world.user.isGM = true;
  await store.wipe("sc", { by: "ana" });
  assert.deepEqual(store.strokes("sc").map((s) => s.id), ["b1"]);
  await store.wipe("sc");
  assert.deepEqual(store.strokes("sc"), []);
  store.dispose();
});

test("listeners hear about chalk pages in the journal, for the right scene, and about nothing else", async () => {
  const store = new ChalkStore();
  const entry = await withEntry();
  const heard = [];
  const off = store.onChange((scene) => heard.push(scene));
  await store.append("sc", stroke("a", 1));                       // creates a page
  await store.append("sc", stroke("b", 2));                       // updates it
  assert.deepEqual(heard, ["sc", "sc"]);

  const other = await JournalEntry.create({ name: "Notes", ownership: { default: OWNER } });
  world.hooks.callAll("createJournalEntryPage", world.page(other, { name: "n", flags: { stagecraft: { chalk: { scene: "zzz" } } } }));
  world.hooks.callAll("updateJournalEntryPage", world.page(entry, { name: "plain", flags: {} }));
  assert.deepEqual(heard, ["sc", "sc"], "a page of another journal, or one that holds no chalk, is not news");

  world.hooks.callAll("deleteJournalEntryPage", entry.pages[0]);
  assert.deepEqual(heard, ["sc", "sc", "sc"], "a deleted page is");

  off();
  await store.append("sc", stroke("c", 3));
  assert.equal(heard.length, 3, "an unsubscribed listener hears nothing");
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
  await store.append("doomed", stroke("d1", 1, "me", "doomed"));
  await store.append("kept", stroke("k1", 2, "me", "kept"));
  world.page(entry, { name: "x", flags: { stagecraft: { chalk: { scene: "doomed", by: "ana", strokes: [stroke("d2", 3, "ana", "doomed")] } } } });

  world.hooks.callAll("deleteScene", { id: "doomed" });                 // a player's client: leaves it for a GM
  await settle();
  assert.equal(store.strokes("doomed").length, 2);

  world.user.isGM = true;
  world.hooks.callAll("deleteScene", { id: "doomed" });
  await settle();
  assert.deepEqual(store.strokes("doomed"), [], "every drawer's pages for that scene are gone");
  assert.deepEqual(store.strokes("kept").map((s) => s.id), ["k1"], "another scene's wall is untouched");
  store.dispose();
});

test("deleting a scene that never had chalk does nothing and does not throw", async () => {
  world.user.isGM = true;
  const store = new ChalkStore();
  await withEntry();
  world.hooks.callAll("deleteScene", { id: "nothing-here" });
  world.hooks.callAll("deleteScene", null);
  await settle();
  store.dispose();
});
