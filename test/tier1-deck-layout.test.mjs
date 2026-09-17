// Tier 1 — the deck's pure layout: how big the one mounted panel may be drawn,
// and how unbounded content is cut into fixed hardware slots so that nothing
// on it ever scrolls (module/blank-inheritance/scripts/core/deck-layout.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DECK_REFERENCE,
  MAX_LAMPS,
  SKILL_SLOTS_PER_SIDE,
  arcPath,
  deckFit,
  dialPoint,
  lampRow,
  loreDisplayName,
  pageOf,
  selectorState,
  splitChecks,
  variantShort
} from "../module/blank-inheritance/scripts/core/deck-layout.mjs";

/* ---------------------------------------------------------------- */
/*  dialPoint / variantShort                                         */
/* ---------------------------------------------------------------- */

test("dialPoint measures from straight up, clockwise, on the same convention as the day ring and VU scale", () => {
  assert.deepEqual(dialPoint(0, 40), { x: 50, y: 10 }, "0 degrees is twelve o'clock");
  assert.deepEqual(dialPoint(90, 40), { x: 90, y: 50 }, "90 degrees is three o'clock");
  assert.deepEqual(dialPoint(180, 40), { x: 50, y: 90 });
  assert.deepEqual(dialPoint(-90, 40), { x: 10, y: 50 });
});

test("arcPath draws a clockwise arc between two dial angles, for text engraved along a curve", () => {
  assert.equal(arcPath(40, -90, 90), "M 10 50 A 40 40 0 1 1 90 50", "a half circle over the top sets the large-arc flag");
  assert.equal(arcPath(40, -45, 45), "M 21.72 21.72 A 40 40 0 0 1 78.28 21.72");
  assert.throws(() => arcPath(40, 30, 30), /toDeg must be greater/);
  assert.throws(() => arcPath(0, -10, 10), /radius must be positive/);
});

test("variantShort keeps only the leading modifier of an sf2e strike variant label", () => {
  assert.equal(variantShort("+5"), "+5");
  assert.equal(variantShort("+1 (MAP -4)"), "+1");
  assert.equal(variantShort("-3 (MAP -8)"), "-3");
  assert.equal(variantShort("−2 (MAP −10)"), "-2", "a typographic minus normalises to a hyphen-minus");
  assert.equal(variantShort("Throw"), "Thro", "a label with no modifier is truncated rather than dropped");
  assert.equal(variantShort(null), "");
});

test("loreDisplayName drops the trailing 'Lore' the selector's legend already prints, and nothing else", () => {
  assert.equal(loreDisplayName("Zon-Shelyn Lore"), "Zon-Shelyn");
  assert.equal(loreDisplayName("Underworld lore"), "Underworld", "case-insensitive, as sf2e labels vary");
  assert.equal(loreDisplayName("Lorekeeping"), "Lorekeeping", "only a whole trailing word is dropped");
  assert.equal(loreDisplayName("Lore"), "Lore", "a label that is nothing but the word keeps it rather than going blank");
  assert.equal(loreDisplayName(null), "");
});

test("lampRow lights the first N of a fixed row, clamped so a bad count still draws a sane row", () => {
  assert.deepEqual(lampRow(1, 3), [true, false, false]);
  assert.deepEqual(lampRow(0, 1), [false]);
  assert.deepEqual(lampRow(5, 2), [true, true], "more lit than exist lights them all");
  assert.deepEqual(lampRow(-1, 2), [false, false]);
  assert.deepEqual(lampRow(1, 0), []);
  assert.equal(lampRow(3, 9999).length, MAX_LAMPS, "a corrupt total cannot draw a thousand lamps");
  assert.deepEqual(lampRow("2", "3"), [true, true, false], "string counts from a document are read as numbers");
});

/* ---------------------------------------------------------------- */
/*  deckFit                                                          */
/* ---------------------------------------------------------------- */

test("deckFit scales the panel as one object, limited by whichever of width or height bites first", () => {
  // 1920x1080 with Foundry's roster reserved on the left: height is the limit.
  const hd = deckFit({ viewportWidth: 1920, viewportHeight: 1080, leftReserve: 234, rightReserve: 18 });
  const byHeight = (1080 * 0.3) / (DECK_REFERENCE.faceplate + DECK_REFERENCE.crown);
  assert.equal(hd.scale, Math.round(byHeight * 10000) / 10000);

  // A narrow window: width is the limit, and the panel never exceeds the room it has.
  const narrow = deckFit({ viewportWidth: 1280, viewportHeight: 1080, leftReserve: 234, rightReserve: 18 });
  assert.ok(narrow.scale < hd.scale, "a narrower window must draw a smaller panel");
  assert.ok(narrow.left >= 234, "the panel must never slide under Foundry's roster");
  assert.ok(narrow.left + narrow.width <= 1280 - 18 + 0.01, "the panel must never run past the right reserve");
});

test("deckFit centres the panel in the space between the reserves, not on the window", () => {
  const fit = deckFit({ viewportWidth: 2000, viewportHeight: 800, leftReserve: 400, rightReserve: 0, margin: 0 });
  const centre = fit.left + fit.width / 2;
  assert.ok(Math.abs(centre - (400 + (2000 - 400) / 2)) < 0.05, `centre ${centre} is not midway between the reserves`);
});

test("deckFit reports the full crown height — the faceplate plus the rising instrument — for everything that must clear it", () => {
  const fit = deckFit({ viewportWidth: 3000, viewportHeight: 1000 });
  assert.ok(Math.abs(fit.faceplateHeight - DECK_REFERENCE.faceplate * fit.scale) < 0.02);
  assert.ok(Math.abs(fit.crownHeight - (DECK_REFERENCE.faceplate + DECK_REFERENCE.crown) * fit.scale) < 0.02);
  assert.ok(fit.crownHeight > fit.faceplateHeight);
});

test("deckFit clamps to its stated scale floor and ceiling rather than drawing an unusable or absurd panel", () => {
  assert.equal(deckFit({ viewportWidth: 400, viewportHeight: 300 }).scale, 0.5);
  assert.equal(deckFit({ viewportWidth: 20000, viewportHeight: 20000 }).scale, 2);
});

test("deckFit refuses a non-positive viewport instead of returning NaN geometry", () => {
  assert.throws(() => deckFit({ viewportWidth: 0, viewportHeight: 900 }), /viewport must be positive/);
  assert.throws(() => deckFit({ viewportWidth: 1200 }), /viewport must be positive/);
});

/* ---------------------------------------------------------------- */
/*  splitChecks                                                      */
/* ---------------------------------------------------------------- */

const SKILL_LABELS = [
  "Acrobatics", "Arcana", "Athletics", "Computers", "Crafting", "Deception", "Diplomacy", "Intimidation", "Medicine",
  "Nature", "Occultism", "Performance", "Piloting", "Religion", "Society", "Stealth", "Survival", "Thievery"
];
const entry = (label, extra = {}) => ({ slug: label.toLowerCase().replace(/\s+/g, "-"), label, lore: false, ...extra });

function sf2eGroups({ lores = [] } = {}) {
  return [
    { id: "skills", entries: [...SKILL_LABELS.map((l) => entry(l)), ...lores.map((l) => entry(l, { lore: true }))] },
    { id: "defences", entries: [entry("Fortitude"), entry("Reflex"), entry("Will"), entry("Perception")] }
  ];
}

test("splitChecks puts A–M on the left bank and N–T on the right, nine and nine", () => {
  const { left, right } = splitChecks(sf2eGroups());
  assert.deepEqual(left.skills.map((s) => s.label), SKILL_LABELS.slice(0, 9));
  assert.deepEqual(right.skills.map((s) => s.label), SKILL_LABELS.slice(9));
  assert.equal(left.skills.length, SKILL_SLOTS_PER_SIDE);
  assert.equal(right.skills.length, SKILL_SLOTS_PER_SIDE);
});

test("splitChecks flanks the instrument with the defences: Perception and Fortitude left, Reflex and Will right", () => {
  const { left, right } = splitChecks(sf2eGroups());
  assert.deepEqual(left.defences.map((d) => d.slug), ["perception", "fortitude"]);
  assert.deepEqual(right.defences.map((d) => d.slug), ["reflex", "will"]);
});

test("splitChecks never gives a lore its own key — lores are unbounded, so they go to a selector", () => {
  const { left, right, lores } = splitChecks(sf2eGroups({ lores: ["Absalom Lore", "Underworld Lore", "Mech Lore"] }));
  assert.deepEqual(lores.map((l) => l.label), ["Absalom Lore", "Underworld Lore", "Mech Lore"]);
  assert.ok([...left.skills, ...right.skills].every((s) => !s || !s.lore), "a lore leaked onto a key bank");
});

test("splitChecks pads a creature with fewer skills out to fixed banks, so the panel never changes shape per token", () => {
  const sparse = [{ id: "skills", entries: SKILL_LABELS.slice(0, 5).map((l) => entry(l)) }];
  const { left, right } = splitChecks(sparse);
  assert.equal(left.skills.length, SKILL_SLOTS_PER_SIDE);
  assert.equal(right.skills.length, SKILL_SLOTS_PER_SIDE);
  assert.equal(left.skills.filter(Boolean).length + right.skills.filter(Boolean).length, 5);
  assert.deepEqual(left.defences, [null, null], "a missing defence is an empty slot, not a shifted one");
});

/* ---------------------------------------------------------------- */
/*  pageOf                                                           */
/* ---------------------------------------------------------------- */

test("pageOf always returns exactly perPage slots, padding the last page with nulls", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g"];
  const second = pageOf(items, 1, 5);
  assert.deepEqual(second.items, ["f", "g"]);
  assert.deepEqual(second.slots, ["f", "g", null, null, null]);
  assert.equal(second.label, "2/2");
  assert.equal(second.hasPrev, true);
  assert.equal(second.hasNext, false);
});

test("pageOf clamps a stale page index after the list shrinks, rather than showing an empty page", () => {
  const page = pageOf(["a", "b"], 7, 5);
  assert.equal(page.page, 0);
  assert.deepEqual(page.items, ["a", "b"]);
  assert.equal(pageOf([], 3, 5).label, "1/1", "an empty list is one empty page, not zero pages");
});

test("pageOf rejects a nonsensical page size", () => {
  assert.throws(() => pageOf(["a"], 0, 0), /perPage/);
});

/* ---------------------------------------------------------------- */
/*  selectorState                                                    */
/* ---------------------------------------------------------------- */

test("selectorState spreads detents across the knob art's 270-degree sweep and derives the frame from the same detent", () => {
  const eight = selectorState(["a", "b", "c", "d", "e", "f", "g", "h"], 0);
  assert.equal(eight.positions[0].deg, -135);
  assert.equal(eight.positions[7].deg, 135);
  assert.equal(eight.frame, 0);
  const last = selectorState(["a", "b", "c", "d", "e", "f", "g", "h"], 7);
  assert.equal(last.frame, 127);
  assert.equal(last.selected, "h");
  assert.equal(last.atEnd, true);
});

test("selectorState clamps at its end stops like a real selector — no wrap from last to first", () => {
  assert.equal(selectorState(["a", "b", "c"], 9).index, 2);
  assert.equal(selectorState(["a", "b", "c"], -4).index, 0);
});

test("selectorState with one option points straight up, and with none selects nothing", () => {
  const one = selectorState(["only"], 0);
  assert.equal(one.deg, 0);
  assert.equal(one.frame, 64);
  const none = selectorState([], 3);
  assert.equal(none.selected, null);
  assert.deepEqual(none.positions, []);
});
