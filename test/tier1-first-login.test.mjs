// Tier 1 — Foundry's own User Configuration window at a new player's first login, and the guard that keeps it
// off the induction terminal (core/first-login.mjs decides, foundry/first-login.mjs acts).
//
// Found by the playtest rig, 2026-10-06 (design/playtest-process.md §12.5, F-0002): every scripted new player
// had Foundry's window lying across the terminal's list, because Foundry opens it for any characterless player
// at the moment the terminal opens for the same player.

import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldSuppressUserConfigPrompt } from "../module/blank-inheritance/scripts/core/first-login.mjs";
import { suppressFirstLoginUserConfig } from "../module/blank-inheritance/scripts/foundry/first-login.mjs";

test("the prompt is suppressed only for Foundry's own automatic one: not ready, a player, no character, their own sheet", () => {
  const base = { ready: false, isGM: false, hasCharacter: false, ownSheet: true };
  assert.equal(shouldSuppressUserConfigPrompt(base), true);
  assert.equal(shouldSuppressUserConfigPrompt({ ...base, ready: true }), false, "a player who opens it later, on purpose, is never stopped");
  assert.equal(shouldSuppressUserConfigPrompt({ ...base, isGM: true }), false, "a GM's window is theirs");
  assert.equal(shouldSuppressUserConfigPrompt({ ...base, hasCharacter: true }), false, "a player with a character was never prompted by Foundry");
  assert.equal(shouldSuppressUserConfigPrompt({ ...base, ownSheet: false }), false, "another user's configuration is not the login prompt");
  // Every other combination of the four is a pass-through: exactly one of the sixteen is suppressed.
  let suppressed = 0;
  for (let n = 0; n < 16; n++) {
    const state = { ready: Boolean(n & 1), isGM: Boolean(n & 2), hasCharacter: Boolean(n & 4), ownSheet: Boolean(n & 8) };
    if (shouldSuppressUserConfigPrompt(state)) suppressed++;
  }
  assert.equal(suppressed, 1);
  // Missing information is never read as permission to suppress.
  assert.equal(shouldSuppressUserConfigPrompt({}), false);
  assert.equal(shouldSuppressUserConfigPrompt({ ready: false, isGM: false, hasCharacter: false }), false);
});

function standIn({ original } = {}) {
  class UserConfig {
    constructor(document) {
      this.document = document;
    }
  }
  if (original) UserConfig.prototype._canRender = original;
  return UserConfig;
}

test("the guard answers false for Foundry's login prompt and hands every other render to what was there", () => {
  const me = { isGM: false, character: null };
  const game = { ready: false, user: me };
  const seen = [];
  const UserConfig = standIn({ original(options) { seen.push(options); return undefined; } });
  assert.equal(suppressFirstLoginUserConfig({ UserConfig, getGame: () => game }), true);

  assert.equal(new UserConfig(me)._canRender({ force: true }), false, "the automatic prompt is stopped");
  assert.equal(seen.length, 0, "and the original is not even asked");

  game.ready = true;
  assert.equal(new UserConfig(me)._canRender({ force: true }), undefined, "after ready the player's own window opens as before");
  assert.equal(seen.length, 1);

  game.ready = false;
  assert.equal(new UserConfig({ id: "someone-else" })._canRender({}), undefined, "another user's configuration is not the prompt");

  me.character = { id: "actor" };
  assert.equal(new UserConfig(me)._canRender({}), undefined, "a player who already has a character is not prompted by Foundry, so nothing to stop");

  me.character = null;
  me.isGM = true;
  assert.equal(new UserConfig(me)._canRender({}), undefined, "a GM's own window is left alone");
});

test("what the original answered is passed on, and the guard is put in once however often it is asked", () => {
  const me = { isGM: false, character: { id: "a" } };
  const game = { ready: true, user: me };
  const UserConfig = standIn({ original: () => false });
  assert.equal(suppressFirstLoginUserConfig({ UserConfig, getGame: () => game }), true);
  const once = UserConfig.prototype._canRender;
  assert.equal(suppressFirstLoginUserConfig({ UserConfig, getGame: () => game }), true);
  assert.equal(UserConfig.prototype._canRender, once, "a second call does not wrap the wrapper");
  assert.equal(new UserConfig(me)._canRender({}), false, "a refusal by the original still refuses");
});

test("a class with no method of its own to wrap is guarded all the same, and a missing class is reported, not thrown", () => {
  const me = { isGM: false, character: null };
  const game = { ready: false, user: me };
  const UserConfig = standIn();
  assert.equal(suppressFirstLoginUserConfig({ UserConfig, getGame: () => game }), true);
  assert.equal(new UserConfig(me)._canRender({}), false);
  game.ready = true;
  assert.equal(new UserConfig(me)._canRender({}), undefined);

  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    assert.equal(suppressFirstLoginUserConfig({ UserConfig: undefined, getGame: () => game }), false);
  } finally {
    console.warn = warn;
  }
  assert.match(warnings.join(), /User Configuration window was not found/);
});

test("with no game or no user yet, the guard passes the render through", () => {
  const noGame = standIn({ original: () => "original" });
  suppressFirstLoginUserConfig({ UserConfig: noGame, getGame: () => undefined });
  assert.equal(new noGame({})._canRender({}), "original");
  const noUser = standIn({ original: () => "original" });
  suppressFirstLoginUserConfig({ UserConfig: noUser, getGame: () => ({ ready: false }) });
  assert.equal(new noUser({})._canRender({}), "original");
});
