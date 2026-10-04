// A card's menu (core/card-menu.mjs, foundry/card-menu.mjs) and the emotes chosen from it (core/emotes.mjs `chosenEmote`,
// foundry/blocking.mjs `setEmote`): who is offered what, where it opens, how a chosen emote is shown, and how it is written.
// The menu as a person meets it (a real right-click on a real card) is checked on the bench: tools/stagecraft/bench/menu-check.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { cardMenu, menuPlace, EMOTE_GROUPS, CARD_ACTIONS } from "../scripts/core/card-menu.mjs";
import { EMOTES, EMOTE_ORDER, EMOTE_SHOWN, chosenEmote } from "../scripts/core/emotes.mjs";
import { Stage } from "../scripts/core/stage.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);

test("the menu offers a player the emotes on a card of theirs, and nothing on anyone else's", () => {
  const mine = cardMenu({ mayEmote: true, person: { id: "ana" } });
  assert.deepEqual(mine, { emotes: true, kept: null, actions: [] });
  assert.equal(cardMenu({ mayEmote: false, person: { id: "nobu" } }), null, "nothing to offer: no menu at all");
});

test("the menu offers the GM the emotes and the floor, a knock-down and a formation, each saying what it would do now", () => {
  const menu = cardMenu({ isGM: true, mayEmote: true, person: { id: "nobu" }, speaker: true, down: false, chosen: true });
  assert.equal(menu.emotes, true);
  assert.deepEqual(menu.actions, [{ id: "floor", on: true }, { id: "down", on: false }, { id: "choose", on: true }]);
  assert.deepEqual(cardMenu({ isGM: true, mayEmote: true, person: {}, sheet: true }).actions.map((a) => a.id), CARD_ACTIONS, "and the sheet, last, when there is one");
  assert.deepEqual(cardMenu({ mayEmote: false, sheet: true }).actions, [{ id: "sheet", on: false }], "a player sees a sheet they may see, even on a card not theirs");
});

test("Clear is offered for an emote the card keeps showing (a habit, or one kept), not for one shown once", () => {
  assert.equal(cardMenu({ mayEmote: true, person: { emote: { id: "music", t0: 2 } } }).kept, "music", "a scene's habit");
  assert.equal(cardMenu({ mayEmote: true, person: { emote: chosenEmote("hand", { keep: true, t0: 5 }) } }).kept, "hand");
  assert.equal(cardMenu({ mayEmote: true, person: { emote: chosenEmote("laugh", { t0: 5 }) } }).kept, null);
  assert.equal(cardMenu({ mayEmote: true, person: { emote: chosenEmote(null) } }).kept, null);
  assert.equal(cardMenu({ mayEmote: true, person: { emote: { id: "nonesuch" } } }).kept, null);
});

test("the menu lays every emote out once, faces then balloons then marks", () => {
  assert.deepEqual(EMOTE_GROUPS.map((g) => g.kind), ["face", "balloon", "mark"]);
  assert.deepEqual(EMOTE_GROUPS.flatMap((g) => g.ids), [...EMOTE_ORDER]);
  for (const g of EMOTE_GROUPS) for (const id of g.ids) assert.equal(EMOTES[id].kind, g.kind);
});

test("the menu opens beside the pointer and turns back inside the window", () => {
  assert.deepEqual(menuPlace(100, 100, 300, 400, 1366, 768), { left: 106, top: 106 });
  assert.deepEqual(menuPlace(1300, 100, 300, 400, 1366, 768), { left: 994, top: 106 }, "too near the right: it opens to the left of the pointer");
  assert.deepEqual(menuPlace(100, 700, 300, 400, 1366, 768), { left: 106, top: 360 }, "too low: it is lifted to fit");
  assert.deepEqual(menuPlace(5, 5, 900, 900, 600, 500), { left: 8, top: 8 }, "bigger than the window: it starts at the corner");
});

test("a chosen emote: once or kept, stamped, marked as chosen; null clears; anything else is nothing", () => {
  assert.deepEqual(chosenEmote("laugh", { t0: 1790995001.2345 }), { id: "laugh", t0: 1790995001.235, chosen: true, once: true });
  assert.deepEqual(chosenEmote("hand", { keep: true, t0: 3 }), { id: "hand", t0: 3, chosen: true });
  assert.deepEqual(chosenEmote(null), { id: null, chosen: true });
  assert.equal(chosenEmote("nonesuch"), null);
  assert.equal(chosenEmote(undefined), null);
  assert.equal(chosenEmote(7), null);
});

/** Run the stage on (a twentieth of a second at a time, as it takes it), then read one card's emote. */
const run = (stage, seconds) => { for (let left = seconds; left > 1e-9; left -= 0.05) stage.advance(Math.min(0.05, left)); };
const emoteOf = (stage, id) => stage.snapshot().cards.find((c) => c.id === id).emote;

test("on the stage, an emote chosen once is shown once and is gone; a kept one comes round again; a cleared one is nothing", () => {
  const stage = new Stage(scene, [
    { id: "a", name: "A", at: [0.3, 0.9], emote: chosenEmote("laugh", { t0: 0.5 }) },
    { id: "b", name: "B", at: [0.5, 0.9], emote: chosenEmote("hand", { keep: true, t0: 0.5 }) },
    { id: "c", name: "C", at: [0.7, 0.9], emote: chosenEmote(null) }
  ]);
  run(stage, 0.25);
  assert.equal(emoteOf(stage, "a"), null, "not before it was stamped to start");
  run(stage, 1);
  assert.equal(emoteOf(stage, "a").id, "laugh");
  assert.equal(emoteOf(stage, "a").opacity, 1);
  assert.equal(emoteOf(stage, "b").id, "hand");
  assert.equal(emoteOf(stage, "c"), null);
  run(stage, EMOTE_SHOWN);
  assert.equal(emoteOf(stage, "a"), null, "shown once: gone");
  run(stage, 1.5);
  assert.equal(emoteOf(stage, "a"), null, "and it stays gone");
  assert.ok(emoteOf(stage, "b").opacity > 0.5, "kept: it has come round again");
});

/* ---------------------------------------------------------------- writing it */

const sceneWith = (cards) => {
  const writes = [];
  return {
    writes,
    id: "s1",
    flags: { stagecraft: { published: { cards } } },
    async update(d) { writes.push(d); for (const [k, v] of Object.entries(d)) { const path = k.split("."); let o = this; while (path.length > 1) o = o[path.shift()] ??= {}; o[path[0]] = v; } }
  };
};

test("setEmote: the GM writes a chosen emote on the card, again when picked again, clears with null, and refuses what is not an emote", async () => {
  const { installFoundry } = await import("./fake-foundry.mjs");
  installFoundry({ user: { id: "gm", name: "GM", isGM: true } });
  const { setEmote } = await import("../scripts/foundry/blocking.mjs");
  const s = sceneWith([{ id: "a", name: "A" }, { id: "b", name: "B", down: true }]);
  const before = Date.now() / 1000;
  assert.equal(await setEmote(s, "a", "laugh"), true);
  const first = s.flags.stagecraft.published.cards[0].emote;
  assert.equal(first.id, "laugh");
  assert.equal(first.once, true);
  assert.equal(first.chosen, true);
  assert.ok(first.t0 > before && first.t0 < before + 2, "stamped a moment from now on the shared clock");
  assert.equal(s.flags.stagecraft.published.cards[1].down, true, "the other card is as it was");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(await setEmote(s, "a", "laugh"), true, "the same emote again shows it again");
  assert.ok(s.flags.stagecraft.published.cards[0].emote.t0 > first.t0);
  assert.equal(await setEmote(s, "a", "hand", { keep: true }), true);
  assert.equal(s.flags.stagecraft.published.cards[0].emote.once, undefined, "kept");
  assert.equal(await setEmote(s, "a", null), true);
  assert.deepEqual(s.flags.stagecraft.published.cards[0].emote, { id: null, chosen: true });
  assert.equal(await setEmote(s, "a", "nonesuch"), false);
  assert.equal(await setEmote(s, "nobody", "laugh"), false);
  assert.equal(s.writes.length, 4);
});

test("setEmote: only a GM writes", async () => {
  const { installFoundry } = await import("./fake-foundry.mjs");
  installFoundry({ user: { id: "p1", name: "P", isGM: false } });
  const { setEmote } = await import("../scripts/foundry/blocking.mjs");
  const s = sceneWith([{ id: "a", name: "A", owners: ["p1"] }]);
  assert.equal(await setEmote(s, "a", "laugh"), false);
  assert.equal(s.writes.length, 0);
});

test("a player's pick reaches the acting GM's screen, which writes it on a card of theirs and on nobody else's", async () => {
  const { installFoundry } = await import("./fake-foundry.mjs");
  const world = installFoundry({ user: { id: "gm", name: "GM", isGM: true } });
  world.others.p1 = { id: "p1", name: "P", isGM: false };
  const { CardMenu, mayEmote } = await import("../scripts/foundry/card-menu.mjs");
  const s = sceneWith([{ id: "mine", name: "Mine", owners: ["p1"] }, { id: "nobu", name: "Nobu", owners: ["gm"] }, { id: "anyone", name: "Anyone" }]);
  const cards = new Map(s.flags.stagecraft.published.cards.map((p) => [p.id, { person: p }]));
  const menu = new CardMenu({ scene: s, stage: { cards } });
  const settle = () => new Promise((r) => setTimeout(r, 5));
  menu.receive({ type: "emote", scene: "s1", card: "mine", emote: "wince", keep: false }, "p1");
  await settle();
  assert.equal(s.flags.stagecraft.published.cards[0].emote.id, "wince");
  menu.receive({ type: "emote", scene: "s1", card: "nobu", emote: "laugh" }, "p1");
  menu.receive({ type: "emote", scene: "elsewhere", card: "mine", emote: "laugh" }, "p1");
  menu.receive({ type: "emote", scene: "s1", card: "mine", emote: "laugh" }, "stranger");
  await settle();
  assert.equal(s.writes.length, 1, "not someone else's card, not another scene, not a user the world does not know");
  menu.receive({ type: "emote", scene: "s1", card: "anyone", emote: "hand", keep: true }, "p1");
  await settle();
  assert.equal(s.flags.stagecraft.published.cards[2].emote.id, "hand", "a card that names no one is anyone's");
  assert.equal(mayEmote({ owners: ["p1"] }, { id: "p1", isGM: false }), true);
  assert.equal(mayEmote({ owners: ["gm"] }, { id: "p1", isGM: false }), false);
  assert.equal(mayEmote({ owners: ["p1"] }, { id: "gm", isGM: true }), true, "a GM any card");
});

test("a player's screen sends its pick to the GM rather than writing, and says so when no GM is on", async () => {
  const { installFoundry } = await import("./fake-foundry.mjs");
  installFoundry({ user: { id: "p1", name: "P", isGM: false } });
  const { CardMenu } = await import("../scripts/foundry/card-menu.mjs");
  const sent = [];
  const warned = [];
  globalThis.ui = { notifications: { warn: (m) => warned.push(m) } };
  const s = sceneWith([{ id: "mine", name: "Mine", owners: ["p1"] }]);
  const menu = new CardMenu({ scene: s, stage: { cards: new Map() }, channel: { send: (m) => sent.push(m) } });
  game.users.activeGM = { id: "gm" };
  assert.equal(await menu.emote("mine", "blush", true), true);
  assert.deepEqual(sent, [{ type: "emote", scene: "s1", card: "mine", emote: "blush", keep: true }]);
  assert.equal(s.writes.length, 0, "a player never writes the scene");
  game.users.activeGM = null;
  assert.equal(await menu.emote("mine", "blush"), false);
  assert.equal(sent.length, 1);
  assert.deepEqual(warned, ["STAGECRAFT.Menu.NoGM"]);
  delete globalThis.ui;
});

test("an emote is timed on the clock every screen shares, as a move is, not on the stage's own (found 2026-10-04: a chosen emote never showed)", () => {
  let shared = 1790995000;                                   // seconds, as Foundry's server time gives them
  const stage = new Stage(scene, [
    { id: "a", name: "A", at: [0.3, 0.9], emote: chosenEmote("laugh", { t0: shared + 0.25 }) },
    { id: "b", name: "B", at: [0.6, 0.9], emote: { id: "music", t0: 2 } }    // a scene's habit: its t0 is only where in the round it starts
  ], { clock: () => shared });
  run(stage, 0.5);
  shared += 1;
  assert.equal(emoteOf(stage, "a")?.id, "laugh", "stamped on the shared clock, shown on it");
  for (let i = 0; i < 6 && !emoteOf(stage, "b")?.opacity; i++) shared += 1;
  assert.ok(emoteOf(stage, "b")?.opacity > 0, "a habit still comes round");
  shared += EMOTE_SHOWN;
  assert.equal(emoteOf(stage, "a"), null, "and once is once");
});
