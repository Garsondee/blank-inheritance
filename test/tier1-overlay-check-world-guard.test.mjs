// Tier 1 — the live overlay check's guard against another session moving the world under it.
//
// tools/overlay-check/click-through.mjs drives a real Foundry from headless Chrome and cannot run here, but its decision about whether
// the world is still as it left it is pure (a snapshot in, a message or nothing out), so it is tested here. Found 2026-10-01 while
// repeating the check: with the Stagecraft session running its own check in the same world, one run was pulled onto that session's
// stage scene mid-way (Foundry moves every connected client when a scene is activated), another was bumped by a second login as the
// same user, and each reported a confusing cascade of failures that were not the overlay's.

import { test } from "node:test";
import assert from "node:assert/strict";

import { worldChange } from "../tools/overlay-check/world-guard.mjs";

test("a connected page still looking at the chosen scene is left alone", () => {
  assert.equal(worldChange({ connected: true, scene: "abc", name: "01. As Discussed" }, "abc"), null);
});

test("another scene on screen is named, and the likely cause is said plainly", () => {
  const msg = worldChange({ connected: true, scene: "zzz", name: "Stagecraft test: Paper Lantern" }, "abc", "Gamemaster");
  assert.match(msg, /the world switched to "Stagecraft test: Paper Lantern"/);
  assert.match(msg, /Another session is probably using this world \(as Gamemaster, or by activating a scene\)/);
});

test("a dropped connection is reported as such, even when the scene is the same", () => {
  assert.match(worldChange({ connected: false, scene: "abc", name: "x" }, "abc"), /^the connection to Foundry dropped\./);
});

test("a page that is gone is reported as gone", () => {
  assert.match(worldChange(null, "abc"), /^the page is gone\./);
});

test("with no scene chosen yet nothing can be said to be as it was left (null never matches null)", () => {
  assert.notEqual(worldChange({ connected: true, scene: null, name: null }, null), null);
});

test("an unsent or odd connected value does not pass for connected", () => {
  assert.notEqual(worldChange({ connected: undefined, scene: "abc", name: "x" }, "abc"), null);
  assert.notEqual(worldChange({ connected: "yes", scene: "abc", name: "x" }, "abc"), null);
});
