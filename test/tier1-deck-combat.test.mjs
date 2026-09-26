// Tier 1 — the two keys under the central instrument's flanks, Initiative and
// Turn, and the collar's turn caption (scripts/core/deck-combat.mjs).
// Added 2026-09-23.

import { test } from "node:test";
import assert from "node:assert/strict";

import { initiativeKeyState, pageForIndex, turnCaptionName, turnKeyState } from "../module/blank-inheritance/scripts/core/deck-combat.mjs";

test("the Director's Turn key builds, begins, then drives the encounter", () => {
  assert.equal(turnKeyState({ seat: "director" }).action, "joinCombat");
  assert.equal(turnKeyState({ seat: "director" }).disabled, true, "nothing selected: nothing to put into a fight");
  assert.equal(turnKeyState({ seat: "director", hasSelection: true }).disabled, false);
  assert.equal(turnKeyState({ seat: "director", hasCombat: true }).action, "startCombat");
  const running = turnKeyState({ seat: "director", hasCombat: true, started: true });
  assert.equal(running.action, "nextTurn");
  assert.equal(running.disabled, false);
});

test("a player's Turn key only ever ends their OWN turn — Foundry refuses anything else, so the key does too", () => {
  assert.equal(turnKeyState({ seat: "player" }).action, "endTurn");
  assert.equal(turnKeyState({ seat: "player", hasCombat: true, started: true, isMyTurn: false }).disabled, true);
  assert.equal(turnKeyState({ seat: "player", hasCombat: true, started: false, isMyTurn: true }).disabled, true);
  const mine = turnKeyState({ seat: "player", hasCombat: true, started: true, isMyTurn: true });
  assert.equal(mine.disabled, false);
  assert.equal(mine.hintKey, "BLANKINHERITANCE.Deck.Turn.EndHint");
  for (const state of [turnKeyState({ seat: "player" }), turnKeyState({ seat: "player", hasCombat: true, started: true, isMyTurn: true })]) {
    assert.notEqual(state.action, "nextTurn", "a player's deck must never carry the Director's turn control");
  }
});

test("the Initiative key prints the number it will roll, and is live only when there is something to roll into", () => {
  assert.equal(initiativeKeyState({ hasSubject: true, hasCombat: true, mod: 4 }).modLabel, "+4");
  assert.equal(initiativeKeyState({ hasSubject: true, hasCombat: true, mod: -1 }).modLabel, "-1");
  assert.equal(initiativeKeyState({ hasSubject: true, hasCombat: true, mod: null }).modLabel, "");
  assert.equal(initiativeKeyState({ hasSubject: true, hasCombat: true, mod: 4 }).disabled, false);
  assert.equal(initiativeKeyState({ hasSubject: true, hasCombat: false, mod: 4 }).disabled, true, "no encounter");
  assert.equal(initiativeKeyState({ hasSubject: false, hasCombat: true }).disabled, true, "no creature");
  assert.equal(initiativeKeyState({ hasSubject: true, hasCombat: true, rolled: true }).disabled, true, "already rolled");
});

test("the collar names whose turn it is only to someone who may know (Law 11)", () => {
  const base = { started: true, name: "The Watcher's Hand" };
  assert.equal(turnCaptionName({ ...base, isGM: true, hidden: true }), "The Watcher's Hand", "the Director always knows");
  assert.equal(turnCaptionName({ ...base, hidden: true, playersCanSeeName: true }), null, "a hidden combatant is never named to a player");
  assert.equal(turnCaptionName({ ...base, playersCanSeeName: false, hasPlayerOwner: true }), null, "sf2e's own name visibility wins");
  assert.equal(turnCaptionName({ ...base, playersCanSeeName: true }), "The Watcher's Hand");
  assert.equal(turnCaptionName({ ...base, hasPlayerOwner: true }), "The Watcher's Hand", "a PC's own name is never secret");
  assert.equal(turnCaptionName({ ...base }), null, "an NPC with no visibility flag defaults to unnamed");
  assert.equal(turnCaptionName({ name: "X", isGM: true }), null, "no running encounter, no caption");
});

test("the board follows the turn to the page it is on", () => {
  assert.equal(pageForIndex(0, 6), 0);
  assert.equal(pageForIndex(5, 6), 0);
  assert.equal(pageForIndex(6, 6), 1);
  assert.equal(pageForIndex(-1, 6), -1, "no current combatant keeps the GM's own page");
});
