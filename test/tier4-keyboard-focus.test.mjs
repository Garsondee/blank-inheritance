// Tier 4 — foundry/keyboard-focus.mjs: the induction terminal hands the keyboard to whatever has focus inside it, so Foundry's own
// bindings (Tab is "Cycle View"; arrows, + and -, Page keys move the camera) stop eating the keys of a form made of buttons.
//
// Found by the playtest rig, 2026-10-06: its keyboard-only seat could not press Begin (Tab did nothing: Foundry consumed it) and the crop's
// arrow keys panned the scene behind the terminal. Against stand-in elements, as in every tier-4 file: this proves OUR marking (which
// element, when, once), not Foundry's keyboard manager (test/tier3-keyboard-focus-contract.test.mjs reads that).

import { test } from "node:test";
import assert from "node:assert/strict";

import { claimKeyboardFor } from "../module/blank-inheritance/scripts/foundry/keyboard-focus.mjs";

/** An element stand-in: a dataset, an event table, and a tree for `contains`. */
function el(name, children = []) {
  const listeners = new Map();
  const node = {
    name,
    dataset: {},
    children,
    addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    removeEventListener: (type, fn) => listeners.set(type, (listeners.get(type) ?? []).filter((f) => f !== fn)),
    contains: (other) => other === node || node.children.some((c) => c.contains(other)),
    fire: (type, target) => (listeners.get(type) ?? []).forEach((fn) => fn({ type, target })),
    listenerCount: (type) => (listeners.get(type) ?? []).length
  };
  return node;
}

test("whatever takes focus inside the window is marked as owning the keyboard, and only that", () => {
  const begin = el("begin");
  const title = el("title");
  const root = el("root", [title, begin]);
  claimKeyboardFor(root, { getActive: () => null });
  assert.deepEqual(begin.dataset, {}, "nothing is marked before it has focus");

  root.fire("focusin", title);
  assert.equal(title.dataset.keyboardFocus, "true");
  assert.deepEqual(begin.dataset, {});
  root.fire("focusin", begin);
  assert.equal(begin.dataset.keyboardFocus, "true", "and the next thing focused is marked too");
});

test("the element focused when the window first renders counts, if it is inside the window", () => {
  const title = el("title");
  const outside = el("scene canvas");
  const root = el("root", [title]);
  claimKeyboardFor(root, { getActive: () => title });
  assert.equal(title.dataset.keyboardFocus, "true");
  const other = el("root two", []);
  claimKeyboardFor(other, { getActive: () => outside });
  assert.deepEqual(outside.dataset, {}, "an element outside the window is never marked: Foundry keeps its keys there");
});

test("it can be stopped, and a node that cannot be listened to is left alone", () => {
  const begin = el("begin");
  const root = el("root", [begin]);
  const stop = claimKeyboardFor(root, { getActive: () => null });
  assert.equal(root.listenerCount("focusin"), 1);
  stop();
  assert.equal(root.listenerCount("focusin"), 0);
  root.fire("focusin", begin);
  assert.deepEqual(begin.dataset, {}, "after stopping, focus marks nothing");
  assert.equal(typeof claimKeyboardFor(null), "function");
  assert.equal(typeof claimKeyboardFor({}), "function");
  claimKeyboardFor(root, { getActive: () => null });
  root.fire("focusin", { name: "a text node with no dataset" });
  root.fire("focusin", undefined);
});
