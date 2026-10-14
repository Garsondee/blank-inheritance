// Tier 3 — the deck's skill keys: wider, a nameplate for the name, tinted by attribute (D063, 2026-10-05).
//
// Ingram: "Skill roll buttons could do with having a wider ratio, a plate to show the text on (lots of text is cut
// off currently) and we should recolour them in a subtle way that indicates which main stat they are effected by",
// then: "No need to physically group them, no need to have a colour legend, avoid gaps or empty spaces since that's
// wasteful ... there is no point physically grouping buttons thus causing some buttons to be blank".
//
// What this holds: the banks stay nine keys each, three by three, in alphabetical order, with no legend but "Skills";
// every key carries its attribute, a recessed nameplate with the skill's name, and its number beside its pips between
// two ribbed grips in the attribute's colour; the player's check window uses the same keys; and, worked out from the
// stylesheet's own numbers, a key is over twice as wide as it is tall and its nameplate holds the longest skill name
// with room to spare (tools/deck-keys/live-check.mjs measures the same in a real Foundry).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DECK_REFERENCE } from "../module/blank-inheritance/scripts/core/deck-layout.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.join(here, "..", "module", "blank-inheritance");
const read = (...parts) => readFileSync(path.join(moduleRoot, ...parts), "utf8");
const bankHbs = read("templates", "console", "deck", "deck-checks.hbs");
const playerHbs = read("templates", "check-console", "player.hbs");
const components = read("styles", "bi-components.css");
const tokens = read("styles", "bi-tokens.css");
const checkCss = read("styles", "bi-check.css");
const deckSrc = read("scripts", "foundry", "deck.mjs");
const commandBar = read("scripts", "foundry", "command-bar.mjs");
const consoleSrc = read("scripts", "foundry", "check-console.mjs");

/** A rule's own text, selector to its closing brace, whether it is written on one line or many. */
const rule = (css, selector) => {
  const at = css.indexOf(`\n${selector} {`);
  assert.ok(at >= 0, `no "${selector}" rule`);
  return css.slice(at, css.indexOf("}", css.indexOf("{", at)) + 1);
};
const px = (block, property) => {
  const m = block.match(new RegExp(`[\\s;{]${property}: ([^;]+);`));
  assert.ok(m, `no ${property} in ${block.trim().split("\n")[0]}`);
  return m[1].split(/\s+/).map((v) => parseFloat(v));
};
const ATTRIBUTES = ["str", "dex", "con", "int", "wis", "cha"];

test("a bank is nine keys, three by three, under one legend: no sections, no colour legend, no spare slots", () => {
  assert.match(bankHbs, /<span class="bi-deck__legend">\{\{localize "BLANKINHERITANCE\.Deck\.Skills"\}\}<\/span>\s*\n\s*<div class="bi-deck-bank__keys">\s*\n\s*\{\{#each bank\.keys\}\}/);
  assert.doesNotMatch(bankHbs, /bi-deck-bank__section|bi-deck-bank__swatch|bank\.sections/, "keys are not grouped by attribute");
  const grid = rule(components, ".bi-deck-bank__keys");
  assert.match(grid, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(grid, /grid-template-rows: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(commandBar, /zone\.bank = deckBankFor\(checks, side\);/);
  const bankFor = deckSrc.match(/export function deckBankFor\(checks, side\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(bankFor, /keys: \(checks\?\.\[side\]\?\.skills \?\? \[\]\)\.map/);
  assert.match(bankFor, /previewSub: \[key\.rankLabel, attributeName\(key\.attribute\)\]\.filter\(Boolean\)\.join\(" · "\)/, "a key says on hover which attribute it adds");
});

test("every key carries its attribute, a nameplate with the skill's name, and its number beside its pips; a blank cap keeps an empty plate", () => {
  for (const [name, hbs] of [["deck", bankHbs], ["player window", playerHbs]]) {
    assert.match(hbs, /class="bi-deck-key[^"]*" data-attribute="\{\{this\.attribute\}\}"/, `${name}: a key without its attribute`);
    assert.match(hbs, /<span class="bi-deck-key__plate"><span class="bi-deck-key__label">\{\{this\.label\}\}<\/span><\/span>/, `${name}: the name is not on a plate`);
    assert.match(hbs, /<span class="bi-deck-key__read">\s*\n\s*<span class="bi-deck-key__mod">/, `${name}: the number is not in its row`);
  }
  assert.match(bankHbs, /<span class="bi-deck-key__read"><span class="bi-deck-key__ask">/, "an asking key says Ask in the number's row");
  assert.match(bankHbs, /<span class="bi-deck-key bi-deck-key--blank" aria-hidden="true"><span class="bi-deck-key__plate"><\/span><\/span>/);
  assert.match(consoleSrc, /attribute: attributeOf\(slug\),/, "the player window's keys are tinted by the attribute they add");
});

test("the key's stylesheet: a plate row over a number row, ribbed grips and a washed plate in the attribute's colour", () => {
  const key = rule(components, ".bi-deck-key");
  assert.match(key, /grid-template-rows: auto minmax\(0, 1fr\);/, "the nameplate sits over the number");
  // Regression, found live 2026-10-05: Foundry's own button style centres a grid's tracks, which shrank every
  // nameplate to its text. One explicit full-width column, stretched.
  assert.match(key, /grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(key, /justify-content: stretch;/);
  const grips = rule(components, ".bi-deck-key::before,\n.bi-deck-key::after");
  assert.match(grips, /repeating-linear-gradient\(90deg/, "the grips are ribbed");
  assert.match(grips, /var\(--attr, #5a5e62\)/, "the grips are in the attribute's colour");
  assert.match(grips, /pointer-events: none;/, "a grip never takes a press");
  assert.match(components, /\n\.bi-deck-key::before \{ left: 6px; \}\n\.bi-deck-key::after \{ right: 6px; \}/, "one grip at each end of the number's row");
  assert.match(rule(components, ".bi-deck-key__plate"), /color-mix\(in srgb, var\(--attr, #3a3d41\) 26%, transparent\)/, "the plate's wash is subtle");
  assert.match(checkCss, /\.bi-check__keybank \.bi-deck-key \{[^}]*min-height: 42px;/, "the player window's keys have room for both rows");
});

test("six attribute colours, each its own, reach the keys", () => {
  const values = ATTRIBUTES.map((a) => tokens.match(new RegExp(`--bi-attr-${a}: (#[0-9a-f]{6});`))?.[1]);
  assert.ok(values.every(Boolean), "an attribute colour is missing from bi-tokens.css");
  assert.equal(new Set(values).size, 6, "two attributes share a colour");
  for (const a of ATTRIBUTES) {
    assert.ok(components.includes(`.bi-deck-key[data-attribute="${a}"] { --attr: var(--bi-attr-${a}); }`), `the ${a} keys are not given their colour`);
  }
});

test("at the deck's authored size a key is over twice as wide as it is tall, and its nameplate holds the longest name with room to spare", () => {
  // Signika at 11px, measured in the browser (2026-10-05): "Performance" is the widest of the eighteen at 60.1px.
  const LONGEST = 60.1;
  const SPARE = 5;
  const inner = parseFloat(tokens.match(/--bi-deck-inner: ([\d.]+)px;/)[1]);
  const [bankTop, bankX, bankBottom] = px(rule(components, ".bi-deck-bank"), "padding");
  const [cellTop, cellX, cellBottom] = px(rule(components, ".bi-deck-bank__cell"), "padding");
  const [gap] = px(rule(components, ".bi-deck-bank__keys"), "gap");
  const border = parseFloat(rule(components, ".bi-deck__cell").match(/border: ([\d.]+)px solid/)[1]);
  const key = rule(components, ".bi-deck-key");
  const [, keyX] = px(key, "padding");
  const keyBorder = parseFloat(key.match(/border: ([\d.]+)px solid/)[1]);
  const [, , skirt] = px(key, "margin");
  const [, plateX] = px(rule(components, ".bi-deck-key__plate"), "padding");
  const width = (inner - 2 * bankX - 2 * border - 2 * cellX - 2 * gap) / 3;
  const height = (DECK_REFERENCE.faceplate - bankTop - bankBottom - 2 * border - cellTop - cellBottom - 2 * gap) / 3 - skirt;
  const room = width - 2 * keyBorder - 2 * keyX - 2 * plateX;
  assert.ok(width / height > 2.1, `a key ${width.toFixed(1)} x ${height.toFixed(1)} is not wider than before (${(width / height).toFixed(2)}:1)`);
  assert.ok(room >= LONGEST + SPARE, `the nameplate leaves ${room.toFixed(1)}px for a name, short of ${LONGEST}px plus ${SPARE}px to spare`);
});
