/**
 * Occlusion hits are filed once per cause (tools/playtest/core/detector-keys.mjs). The cases are the first agent run's real hits
 * (runs/main-1, F-0002 to F-0109), forty findings that collapse to a handful of causes.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { componentOf, occlusionCause } from "../../tools/playtest/core/detector-keys.mjs";

test("a selector's component is its BEM block, else its id's, else its class, else its tag", () => {
  assert.equal(componentOf("span.bi-deck-key__plate"), "bi-deck");
  assert.equal(componentOf("div.bi-deck-bank"), "bi-deck");
  assert.equal(componentOf("div.bi-orb-deck"), "bi-orb");
  assert.equal(componentOf("input#bi-prompt-age.bi-prompt-field__control"), "bi-prompt");
  assert.equal(componentOf("li.slot.open"), "slot");
  assert.equal(componentOf("button.ui-control.plain.icon"), "ui-control");
  assert.equal(componentOf("circle"), "circle");
  assert.equal(componentOf(""), "unknown");
});

test("main-1's forty covered-control findings come down to a handful of causes", () => {
  const hits = [
    ["button.bi-induction__ancestry-item", "div.bi-deck__well.bi-deck-ident__well", "bi-induction-terminal"],
    ["button.bi-induction__ancestry-item", "span.bi-deck-key__plate", "bi-induction-terminal"],
    ["summary", "span.bi-deck-key.bi-deck-key--blank", "bi-induction-terminal"],
    ["button.bi-induction__class-card", "div.bi-deck-bank", "bi-induction-terminal"],
    ["button.bi-induction__option", "div.bi-orb-deck", "bi-induction-terminal"],
    ["button.bi-induction__option", "div.bi-orb", "bi-induction-terminal"],
    ["button.bi-induction__option", "button.bi-deck-pill__cap", "bi-induction-terminal"],
    ["li.slot.open", "input#bi-prompt-age.bi-prompt-field__control", "page"],
    ["li.slot.open", "textarea#bi-prompt-enemies.bi-prompt-field__control", "page"],
    ["button.ui-control.icon.fa-solid", "button.ui-control.plain.icon", "page"],
    ["button.ui-control.icon.fa-solid", "menu.flexcol", "page"]
  ].map(([element, coveredBy, window]) => ({ element, coveredBy, window }));
  const keys = new Set(hits.map((h) => occlusionCause(h).key));
  assert.deepEqual([...keys].sort(), [
    "detector:occlusion|bi-induction-terminal|bi-deck",
    "detector:occlusion|bi-induction-terminal|bi-orb",
    "detector:occlusion|page|bi-prompt",
    "detector:occlusion|page|flexcol",
    "detector:occlusion|page|ui-control"
  ]);
  const s = occlusionCause(hits[0]).summary;
  assert.match(s, /^Controls in bi-induction-terminal are covered by bi-deck \(first seen: button\.bi-induction__ancestry-item under div\.bi-deck__well/);
});

test("the scene canvas is named as itself, whatever its selector", () => {
  assert.equal(occlusionCause({ element: "button.x", coveredBy: "canvas#board", coveredByKind: "the scene canvas", window: "page" }).key, "detector:occlusion|page|the scene canvas");
});
