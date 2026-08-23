/**
 * Persistent per-side belief state for the PERSONNEL-SCALE engine (design doc §19) — same
 * algorithm as ai/knowledge/belief.mjs (see personnel-engine/knowledge/belief.mjs's own header for
 * why it's a full import-swapped copy rather than a bare re-export), tested at the real 5ft grid.
 * This is also exactly the mechanism design doc §19's own plan calls for by name: pathing toward
 * an enemy's last-known position once contact is lost, on Phase 1b's building.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshBelief, believedEnemies } from "../../tools/battle-simulator/personnel-engine/knowledge/belief.mjs";

function mk(overrides = {}) {
  return { id: "x", name: "X", side: "party", currentHP: 10, ...overrides };
}
function makeState({ round = 1, combatants, positions, walls = [] }) {
  return { round, walls, combatants: new Map(combatants.map((c) => [c.id, c])), positions: new Map(Object.entries(positions)) };
}

test("refreshBelief: an enemy within unlimited (no vision field) range is believed at its real, current position", () => {
  const state = makeState({
    combatants: [mk({ id: "me" }), mk({ id: "enemy", side: "opposition" })],
    positions: { me: { col: 0, row: 0 }, enemy: { col: 10, row: 10 } }
  });
  refreshBelief(state, "party");
  const belief = believedEnemies(state, "party");
  assert.equal(belief.length, 1);
  assert.equal(belief[0].id, "enemy");
  assert.deepEqual(belief[0].position, { col: 10, row: 10 });
  assert.equal(belief[0].visible, true);
});

test("refreshBelief: the FIRST refresh of a battle seeds every living enemy at its deployment position, even beyond vision range", () => {
  const state = makeState({
    combatants: [mk({ id: "me", vision: { range: 10 } }), mk({ id: "enemy", side: "opposition" })],
    positions: { me: { col: 0, row: 0 }, enemy: { col: 500, row: 500 } }
  });
  refreshBelief(state, "party");
  const belief = believedEnemies(state, "party");
  assert.equal(belief.length, 1);
  assert.deepEqual(belief[0].position, { col: 500, row: 500 }, "seeded at the real deployment position");
  assert.equal(belief[0].visible, false, "but NOT currently visible — far outside a 10ft vision range");
});

test("REGRESSION-GUARD: an enemy that did not exist during the side's first-ever refresh and is never perceived after arriving has NO belief entry", () => {
  const me = mk({ id: "me", vision: { range: 10 } });
  const enemy1 = mk({ id: "enemy1", side: "opposition" });
  const state = makeState({ combatants: [me, enemy1], positions: { me: { col: 0, row: 0 }, enemy1: { col: 0, row: 1 } } });
  refreshBelief(state, "party");

  const enemy2 = mk({ id: "enemy2", side: "opposition" });
  state.combatants.set("enemy2", enemy2);
  state.positions.set("enemy2", { col: 500, row: 500 });
  refreshBelief(state, "party");

  const belief = believedEnemies(state, "party");
  assert.ok(belief.some((b) => b.id === "enemy1"));
  assert.ok(!belief.some((b) => b.id === "enemy2"));
});

test("the fog-of-war memory mechanism: an enemy last seen at round N keeps that STALE position after moving out of sight, marked not-visible — exactly what an AI should path toward once contact is lost on Phase 1b's building", () => {
  const me = mk({ id: "me", vision: { range: 30 } }); // 6 squares
  const enemy = mk({ id: "enemy", side: "opposition" });
  const state = makeState({ round: 3, combatants: [me, enemy], positions: { me: { col: 0, row: 0 }, enemy: { col: 5, row: 0 } } });
  refreshBelief(state, "party");
  assert.equal(believedEnemies(state, "party")[0].visible, true);

  // Enemy moves far out of the 30ft (6-square) vision range.
  state.round = 4;
  state.positions.set("enemy", { col: 100, row: 100 });
  refreshBelief(state, "party");
  const belief = believedEnemies(state, "party")[0];
  assert.equal(belief.visible, false, "no longer visible");
  assert.deepEqual(belief.position, { col: 5, row: 0 }, "position must stay at the STALE last-seen location, not silently update to the new real one");
  assert.equal(belief.lastSeenRound, 3, "must record WHEN it was last actually seen, not the current round");
});

test("a closed door (wall with full sight/move block) hides an enemy in the next room, and belief correctly reports not-visible rather than a phantom sighting", () => {
  const me = mk({ id: "me" });
  const enemy = mk({ id: "enemy", side: "opposition" });
  const wall = [{ c: [3, 0, 3, 10], move: 20, sight: 20 }];
  const state = makeState({
    combatants: [me, enemy],
    positions: { me: { col: 1, row: 5 }, enemy: { col: 5, row: 5 } },
    walls: wall
  });
  refreshBelief(state, "party");
  // Deployment-moment seeding still applies (real position known at Round 0), but visible must be false.
  const belief = believedEnemies(state, "party")[0];
  assert.equal(belief.visible, false, "a wall between the two rooms means nobody actually perceives the enemy right now");
});

test("HEADLINE (vision-as-chassis-axis, still applicable at personnel scale): a near-blind unit still benefits from a sighted ALLY's vision", () => {
  const nearsighted = mk({ id: "nearsighted", vision: { range: 5 } });
  const spotter = mk({ id: "spotter", vision: { range: 500 } });
  const enemy = mk({ id: "enemy", side: "opposition" });
  const state = makeState({
    combatants: [nearsighted, spotter, enemy],
    positions: { nearsighted: { col: 0, row: 0 }, spotter: { col: 0, row: 0 }, enemy: { col: 50, row: 0 } } // 250ft — beyond nearsighted's 5ft, well within the spotter's 500ft
  });
  refreshBelief(state, "party");
  const belief = believedEnemies(state, "party");
  assert.equal(belief.length, 1);
  assert.equal(belief[0].visible, true, "the whole side believes the enemy exists because the spotter can see them");
});

test("refreshBelief: a confirmed kill (currentHP <= 0) is removed from belief entirely, not kept as a stale pursuit target", () => {
  const me = mk({ id: "me" });
  const enemy = mk({ id: "enemy", side: "opposition" });
  const state = makeState({ combatants: [me, enemy], positions: { me: { col: 0, row: 0 }, enemy: { col: 5, row: 0 } } });
  refreshBelief(state, "party");
  assert.equal(believedEnemies(state, "party").length, 1);

  enemy.currentHP = 0;
  refreshBelief(state, "party");
  assert.deepEqual(believedEnemies(state, "party"), []);
});

test("refreshBelief: never tracks the side's OWN combatants as 'enemies to believe in'", () => {
  const state = makeState({
    combatants: [mk({ id: "me" }), mk({ id: "ally" })],
    positions: { me: { col: 0, row: 0 }, ally: { col: 5, row: 0 } }
  });
  refreshBelief(state, "party");
  assert.deepEqual(believedEnemies(state, "party"), []);
});

test("refreshBelief: is idempotent — calling it twice in a row with nothing changed produces the same belief", () => {
  const state = makeState({
    combatants: [mk({ id: "me" }), mk({ id: "enemy", side: "opposition" })],
    positions: { me: { col: 0, row: 0 }, enemy: { col: 5, row: 0 } }
  });
  refreshBelief(state, "party");
  const first = believedEnemies(state, "party");
  refreshBelief(state, "party");
  const second = believedEnemies(state, "party");
  assert.deepEqual(first, second);
});
