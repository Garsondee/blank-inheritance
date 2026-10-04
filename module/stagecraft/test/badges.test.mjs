// Badges (core/badges.mjs, render/badges.mjs) and the turn light: short labels on a card's face, and whose turn it is.

import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanBadges, badgeText, sameBadges, MAX_BADGES, MAX_BADGE_LENGTH } from "../scripts/core/badges.mjs";
import { titleKey } from "../scripts/core/titleblock.mjs";
import { paintBadges, faceOf } from "../scripts/render/badges.mjs";
import { Stage } from "../scripts/core/stage.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { RAW_SCENE } from "./fixture.mjs";
import { recordingContext, calls } from "./fake-canvas.mjs";

/** A recording context that can also measure text (ten units a letter). */
const measuring = () => { const ctx = recordingContext(); return new Proxy(ctx, { get: (t, n) => (n === "measureText" ? (s) => ({ width: [...s].length * 10 }) : t[n]), set: (t, n, v) => { t[n] = v; return true; } }); };

test("badges are kept short, few, plain and in order", () => {
  assert.deepEqual(cleanBadges(["Frightened 2", "  Prone ", "Prone", "", null, 7, { label: "Dying 1" }]), ["Frightened 2", "Prone", "7", "Dying 1"]);
  assert.equal(cleanBadges(["a", "b", "c", "d", "e", "f"]).length, MAX_BADGES);
  assert.deepEqual(cleanBadges("nope"), []);
  const long = badgeText("Frightened of everything in the room");
  assert.equal([...long].length, MAX_BADGE_LENGTH);
  assert.ok(long.endsWith("\u{2026}"), "an ellipsis shows it was cut");
  assert.equal(badgeText("a\n  b"), "a b");
  assert.ok(sameBadges(["x ", "y"], ["x", "y"]));
  assert.ok(!sameBadges(["x"], ["x", "y"]));
});

test("a change of badges changes a card's face key, and nothing else does", () => {
  assert.notEqual(titleKey({ name: "a" }), titleKey({ name: "a", badges: ["Prone"] }));
  assert.equal(titleKey({ name: "a", badges: [" Prone "] }), titleKey({ name: "a", badges: ["Prone"] }));
  assert.equal(titleKey({ name: "a", badges: [] }), titleKey({ name: "a" }));
});

test("badges are drawn over a face down its top-left corner, one pill each, and nothing when there are none", () => {
  const canvas = { width: 360, height: 520, ctx: null, getContext() { this.ctx ??= measuring(); return this.ctx; } };
  paintBadges(canvas, { name: "A" });
  assert.equal(canvas.ctx, null, "no badges: the canvas is not even touched");
  paintBadges(canvas, { name: "A", badges: ["Frightened 2", "Prone"] });
  assert.deepEqual(calls(canvas.ctx, "fillText").map((c) => c.args[0]), ["Frightened 2", "Prone"]);
  const [a, b] = calls(canvas.ctx, "moveTo").map((c) => c.args[1]);
  assert.ok(b > a, "the second pill is below the first");
  assert.ok(calls(canvas.ctx, "moveTo").every((c) => c.args[0] >= 0));
});

test("faceOf asks the skin for the face and puts the badges on it", async () => {
  const canvas = { width: 360, height: 520, getContext() { this.ctx ??= measuring(); return this.ctx; } };
  const skin = { face: async () => canvas };
  const got = await faceOf(skin, { name: "A", badges: ["Prone"] }, {});
  assert.equal(got, canvas);
  assert.equal(calls(canvas.ctx, "fillText").length, 1);
});

test("whose turn it is is lit like the speaker, without anyone turning to look", () => {
  const scene = describeScene(RAW_SCENE).scene;
  const s = new Stage(scene, [{ id: "a", name: "A", X: 0, Z: -500 }, { id: "b", name: "B", X: 400, Z: -500 }]);
  const lit = (id) => s.snapshot().cards.find((c) => c.id === id).speaking;
  assert.equal(lit("a"), false);
  s.setTurn("a");
  assert.equal(lit("a"), true);
  assert.equal(lit("b"), false);
  assert.equal(s.cards.get("b").attention ?? null, null, "nobody turns to look at whoever's turn it is");
  s.setTurn("nobody");
  assert.equal(lit("a"), false, "a card that is not on the stage lights nothing");
  s.setTurn(null);
  s.setSpeaker("b");
  assert.equal(lit("b"), true);
});
test("setBadges writes badges on the published card, once, and takes them off with an empty list; setTurn lights one card", async () => {
  const { installFoundry } = await import("./fake-foundry.mjs");
  installFoundry({ user: { id: "gm", name: "GM", isGM: true } });
  {
    const { setBadges, setTurn, turnOf } = await import("../scripts/foundry/blocking.mjs");
    const writes = [];
    const scene = {
      flags: { stagecraft: { published: { cards: [{ id: "a", name: "A" }, { id: "b", name: "B", down: true }] } } },
      async update(d) { writes.push(d); for (const [k, v] of Object.entries(d)) { const path = k.split("."); let o = this; while (path.length > 1) o = o[path.shift()] ??= {}; o[path[0]] = v; } }
    };
    assert.equal(await setBadges(scene, "a", ["Frightened 2", " Prone ", "Prone"]), true);
    assert.deepEqual(scene.flags.stagecraft.published.cards[0].badges, ["Frightened 2", "Prone"]);
    assert.equal(scene.flags.stagecraft.published.cards[1].down, true, "the other card is as it was");
    assert.equal(await setBadges(scene, "a", ["Frightened 2", "Prone"]), false, "the same badges: nothing is written");
    assert.equal(await setBadges(scene, "nobody", ["x"]), false);
    assert.equal(writes.length, 1);
    assert.equal(await setBadges(scene, "a", []), true);
    assert.equal(scene.flags.stagecraft.published.cards[0].badges, undefined);
    assert.equal(await setTurn(scene, "b"), true);
    assert.equal(turnOf(scene), "b");
    assert.equal(await setTurn(scene, "b"), false);
    assert.equal(await setTurn(scene, null), true);
    assert.equal(turnOf(scene), null);
  }
});

test("setChalkBox writes the box into the scene's description once, refuses a bad point, and says so with a hook", async () => {
  const { installFoundry } = await import("./fake-foundry.mjs");
  const world = installFoundry({ user: { id: "gm", name: "GM", isGM: true } });
  const { setChalkBox } = await import("../scripts/foundry/blocking.mjs");
  const heard = [];
  world.hooks.on?.("stagecraft.keepBox", (e) => heard.push(e));
  const scene = { id: "s1", flags: { stagecraft: { stage: { chalk: { mode: "zones" } } } }, async update(d) { for (const [k, v] of Object.entries(d)) { const path = k.split("."); let o = this; while (path.length > 1) o = o[path.shift()] ??= {}; o[path[0]] = v; } } };
  assert.equal(await setChalkBox(scene, [0.31234, 0.9]), true);
  assert.deepEqual(scene.flags.stagecraft.stage.chalk, { mode: "zones", box: [0.312, 0.9] }, "written beside the rest of the chalk description");
  assert.equal(await setChalkBox(scene, [0.312, 0.9]), false, "the same spot: nothing written");
  assert.equal(await setChalkBox(scene, [1.5, 0.2]), false);
  assert.equal(await setChalkBox(scene, null), false);
  assert.equal(heard.length, 1);
});