// Tier 3 — the contract between the first-login guard and Foundry itself (core/first-login.mjs,
// foundry/first-login.mjs).
//
// The guard rests on four things inside Foundry's own client code, which is not ours: that Foundry opens a
// player's User Configuration window itself, before it announces `ready`, on the condition "not a GM and no
// character"; that an Application is asked `_canRender` before it renders and a `false` stops it; that the
// window's class is `foundry.applications.sheets.UserConfig`; and that the adventure's own terminal opens on
// the same condition, so that one stands in for the other. A Foundry upgrade that moves any of them fails
// here, loudly, instead of at a new player's first login.
//
// Skips loudly when the gitignored foundryvtt/ tree is absent (design/testing-strategy.md §3).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const client = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app", "client");

function read(t, ...parts) {
  const file = path.join(client, ...parts);
  if (!existsSync(file)) {
    t.skip("foundryvtt/ not present locally (gitignored): the first-login contract needs its client source, skipping loudly rather than failing or silently passing.");
    return null;
  }
  return readFileSync(file, "utf8");
}

test("Foundry opens the player's own User Configuration window itself, before ready, for a player with no character", (t) => {
  const game = read(t, "game.mjs");
  if (!game) return;
  const prompt = /if \( !this\.user\.isGM && !this\.user\.character \) \{\s*this\.user\.sheet\.render\(\{force: true\}\);\s*\}/.exec(game);
  assert.ok(prompt, "client/game.mjs no longer opens `this.user.sheet` for a player with no character in that form: re-read it before trusting the guard");
  const ready = game.indexOf("this.ready = true;", prompt.index);
  assert.ok(ready > prompt.index, "Foundry now sets `ready` before it opens that window, so `game.ready === false` no longer identifies its automatic prompt");
});

test("an Application is asked _canRender before it renders, and false stops the render", (t) => {
  const application = read(t, "applications", "api", "application.mjs");
  if (!application) return;
  assert.match(application, /const canRender = this\._canRender\(options\);\s*if \( canRender === false \) return this;/, "ApplicationV2 no longer stops a render when _canRender answers false");
  assert.match(application, /_canRender\(options\) \{\}/, "ApplicationV2#_canRender is no longer an empty hook the guard can wrap");
});

test("the window is foundry.applications.sheets.UserConfig and does not decide _canRender for itself", (t) => {
  const userConfig = read(t, "applications", "sheets", "user-config.mjs");
  const sheets = read(t, "applications", "sheets", "_module.mjs");
  if (!userConfig || !sheets) return;
  assert.match(userConfig, /export default class UserConfig extends HandlebarsApplicationMixin\(DocumentSheetV2\)/);
  assert.doesNotMatch(userConfig, /_canRender/, "UserConfig now has its own _canRender: wrap it, do not replace it, and re-read the guard");
  assert.match(sheets, /import UserConfig from "\.\/user-config\.mjs";/);
  assert.match(sheets, /^\s*UserConfig,$/m, "the sheets module no longer exports UserConfig");
});

test("the adventure's terminal opens for the same player on the same condition, so it stands in for the window it replaces", () => {
  const main = readFileSync(path.join(repoRoot, "module", "blank-inheritance", "scripts", "blank-inheritance.mjs"), "utf8");
  assert.match(main, /if \(!game\.user\.isGM && !game\.user\.character\) \{\s*try \{\s*openInductionTerminal\(\);/, "the terminal no longer opens on `not a GM and no character`: the guard would leave a new player with neither window");
  assert.match(main, /suppressFirstLoginUserConfig\(\);/, "the guard is no longer switched on in `init`");
});
