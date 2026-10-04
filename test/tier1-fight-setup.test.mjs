// Tier 1 — core/fight-setup.mjs: one key sets up a fight, and the scene's
// clock rises as rounds end (2026-10-04, D059).
//
// Found at Episode One's climax in the live Runner: six centipede cards on the
// stage and nothing to fight -- no Actor, an empty combat tracker, a card
// that said only "6x Giant Centipede L-1".

import { test } from "node:test";
import assert from "node:assert/strict";

import { clockStepOnRound, creatureLines, fightRoster, roundEnded } from "../module/blank-inheritance/scripts/core/fight-setup.mjs";

test("the roster is one actor per creature, numbered when there are several", () => {
  const { roster, missing } = fightRoster({
    creatures: [
      { name: "Giant Centipede", count: 3, compendium: "Compendium.sf2e.pack.Actor.x" },
      { name: "Boss", count: 1, compendium: "Compendium.sf2e.pack.Actor.y" },
      { name: "Homebrew", count: 2, compendium: null }
    ]
  });
  assert.deepEqual(roster.map((r) => r.name), ["Giant Centipede 1", "Giant Centipede 2", "Giant Centipede 3", "Boss"]);
  assert.equal(roster[0].uuid, "Compendium.sf2e.pack.Actor.x");
  assert.deepEqual(missing, ["Homebrew"], "a creature with no compendium entry is named, never half-built");
  assert.deepEqual(fightRoster(null), { roster: [], missing: [] });
});

test("a round ends when the round number goes forward to 2 or more; starting the fight and going back do not count", () => {
  assert.equal(roundEnded(1), false, "round 0 to 1 is the fight starting");
  assert.equal(roundEnded(2), true);
  assert.equal(roundEnded(5, { direction: 1 }), true);
  assert.equal(roundEnded(3, { direction: -1 }), false, "Foundry's previousRound: the GM correcting a mistake");
  assert.equal(roundEnded(undefined), false);
});

test("the clock rises one a round, and stops at its ceiling", () => {
  assert.equal(clockStepOnRound({ canRaise: true }), 1);
  assert.equal(clockStepOnRound({ canRaise: false }), null, "full compaction: nothing more to raise");
  assert.equal(clockStepOnRound(null), null);
});

test("the fight card's lines carry each creature's stat line and whether it can be set up", () => {
  const lines = creatureLines({ creatures: [{ name: "Giant Centipede", level: -1, count: 6, compendium: "x", statline: "AC 15 · HP 8" }, { name: "Odd", count: 1 }] });
  assert.deepEqual(lines[0], { count: 6, name: "Giant Centipede", level: -1, statline: "AC 15 · HP 8", canSetUp: true });
  assert.equal(lines[1].canSetUp, false);
  assert.equal(lines[1].statline, null);
});
