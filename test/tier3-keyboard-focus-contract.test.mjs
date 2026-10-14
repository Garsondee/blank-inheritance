// Tier 3 — the contract between foundry/keyboard-focus.mjs and Foundry's own keyboard manager.
//
// The adventure's induction terminal marks the element that has focus with `data-keyboard-focus="true"` so Foundry leaves the keys alone. That
// rests on four things in Foundry's client, which is not ours: that Tab is bound (so the hazard is real), that the manager listens on `window`
// and consumes what it binds, that it skips a key when `hasFocus` is true, and that `data-keyboard-focus` is one of the ways `hasFocus` becomes
// true. A Foundry upgrade that moves any of them fails here, not at a keyboard-only player's first page.
//
// Skips loudly when the gitignored foundryvtt/ tree is absent (design/testing-strategy.md §3).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const client = path.join(here, "..", "foundryvtt", "Foundry Virtual Tabletop", "resources", "app", "client", "helpers", "interaction");

function read(t, name) {
  const file = path.join(client, name);
  if (!existsSync(file)) {
    t.skip("foundryvtt/ not present locally (gitignored): the keyboard-focus contract needs its client source, skipping loudly rather than failing or silently passing.");
    return null;
  }
  return readFileSync(file, "utf8");
}

test("Tab is a Foundry binding in the game view, which is why a form of buttons could not be tabbed through", (t) => {
  const bindings = read(t, "client-keybindings.mjs");
  if (!bindings) return;
  assert.match(bindings, /game\.keybindings\.register\("core", "cycleView", \{\s*name: "KEYBINDINGS\.CycleView",\s*editable: \[\s*\{key: "Tab"\}\s*\],\s*onDown: ClientKeybindings\.#onCycleView/);
});

test("the manager listens on window and consumes a key it handled", (t) => {
  const manager = read(t, "keyboard-manager.mjs");
  if (!manager) return;
  assert.match(manager, /win\.addEventListener\("keydown", event => this\.#handleKeyboardEvent\(event, false\)\);/);
  assert.match(manager, /if \( handled && context\.event \) \{[\s\S]*?context\.event\?\.preventDefault\(\);\s*context\.event\?\.stopPropagation\(\);/);
});

test("a key is skipped when the focused element has the keyboard, and data-keyboard-focus is an explicit way to say so", (t) => {
  const manager = read(t, "keyboard-manager.mjs");
  if (!manager) return;
  assert.match(manager, /if \( this\.hasFocus && !force \) return;/, "the manager no longer skips keys while an element has focus");
  assert.match(manager, /if \( \["", "true"\]\.includes\(focused\.dataset\.keyboardFocus\) \) return true;\s*\/\/ Explicit true/, "data-keyboard-focus is no longer an explicit way to claim the keys");
  assert.match(manager, /const focused = doc\.activeElement;/, "hasFocus no longer reads the focused element: the claim has to be on that element");
});

test("the terminal claims the keyboard, and does so before it moves focus to a page's title", () => {
  const terminal = readFileSync(path.join(here, "..", "module", "blank-inheritance", "scripts", "foundry", "induction-terminal.mjs"), "utf8");
  const claim = terminal.indexOf("claimKeyboardFor(this.element);");
  const arrive = terminal.indexOf("this.#arriveOnPage();", claim);
  assert.ok(claim > 0, "the terminal no longer claims the keyboard for its window");
  assert.ok(arrive > claim, "the title takes focus before the keyboard is claimed, so the first focus is never marked");
});
