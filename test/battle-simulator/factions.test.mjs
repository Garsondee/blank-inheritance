/**
 * engine/factions.mjs (design doc §16) — the relation rules a "neutral" side needs that a plain
 * `side !== me.side` check gets backwards. Written the same day the stress-test mission that first
 * needed a third side was built, per the project's "every feature ships with a test in the same
 * commit" rule.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isHostileTo, isAlliedWith, splitByRelation } from "../../tools/battle-simulator/engine/factions.mjs";

const party = { id: "p1", side: "party" };
const partyAlt = { id: "p2", side: "party" };
const opposition = { id: "o1", side: "opposition" };
const neutral = { id: "n1", side: "neutral" };

test("isHostileTo: party is hostile to opposition, and only opposition", () => {
  assert.equal(isHostileTo(party, opposition), true);
  assert.equal(isHostileTo(party, neutral), false);
  assert.equal(isHostileTo(party, partyAlt), false);
});

test("isHostileTo: opposition's hostility WIDENS to include neutral — the whole point of the raider sub-faction", () => {
  assert.equal(isHostileTo(opposition, party), true);
  assert.equal(isHostileTo(opposition, neutral), true);
});

test("isHostileTo: neutral treats nobody as hostile", () => {
  assert.equal(isHostileTo(neutral, party), false);
  assert.equal(isHostileTo(neutral, opposition), false);
});

test("isAlliedWith: party treats neutral as one of its own to protect (the civilian-convoy carve-out)", () => {
  assert.equal(isAlliedWith(party, neutral), true);
});

test("isAlliedWith: the carve-out is NOT symmetric — a neutral unit does not itself read the party as an ally", () => {
  // Deliberate: a neutral combatant never runs the general evaluator at all (ai/neutral-ai.mjs),
  // so this direction is never actually consulted — asserted anyway so the relation stays
  // explicit rather than silently depending on that one caller's behaviour.
  assert.equal(isAlliedWith(neutral, party), false);
});

test("isAlliedWith: opposition does not treat neutral as an ally — it's prey, not a teammate", () => {
  assert.equal(isAlliedWith(opposition, neutral), false);
});

test("REGRESSION: a plain `side !== me.side` check (the pre-§16 behaviour) would have priced this backwards", () => {
  // The bug this whole module exists to prevent, made concrete: under naive inequality, a neutral
  // unit reads as "enemy" to BOTH sides at once, which would make protecting a civilian convoy
  // score as a THREAT the party should reduce.
  assert.notEqual(neutral.side !== party.side, isHostileTo(party, neutral));
});

test("splitByRelation: excludes self, and puts a neutral combatant in the party's allies (not enemies)", () => {
  const combatants = [party, partyAlt, opposition, neutral];
  const { allies, enemies } = splitByRelation(party, combatants);
  assert.deepEqual(allies.map((c) => c.id).sort(), ["n1", "p2"]);
  assert.deepEqual(enemies.map((c) => c.id), ["o1"]);
});

test("splitByRelation: from opposition's side, both party and neutral land in enemies", () => {
  const combatants = [party, partyAlt, opposition, neutral];
  const { allies, enemies } = splitByRelation(opposition, combatants);
  assert.deepEqual(allies, []);
  assert.deepEqual(enemies.map((c) => c.id).sort(), ["n1", "p1", "p2"]);
});
