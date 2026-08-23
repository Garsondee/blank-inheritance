/**
 * Tests for persistent per-side belief state (design doc §15s). The
 * headline scenario, matching the accepted vision-as-chassis-axis idea
 * directly: an otherwise-blind unit still benefits from a sighted ally's
 * belief refresh, because refreshBelief checks the WHOLE side's combined
 * vision, not just whoever is about to act.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshBelief, believedEnemies } from "../../tools/battle-simulator/ai/knowledge/belief.mjs";

function mk(overrides = {}) {
  return { id: "x", name: "X", side: "party", size: "huge", currentHP: 100, scaleBlind: false, ...overrides };
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

test("refreshBelief: the FIRST refresh of a battle seeds every living enemy at its deployment position, even beyond vision range — matches how tabletop combat actually starts (everyone sees the battlefield lineup) rather than beginning fog-of-war with zero knowledge, which would leave two sides split by a wall from round 1 with no way to ever find each other", () => {
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

test("REGRESSION: an enemy that did not exist during the side's first-ever refresh (e.g. a later reinforcement) and is never perceived after arriving has NO belief entry — deployment-seeding is a one-time event, not repeated for newcomers", () => {
  const me = mk({ id: "me", vision: { range: 10 } });
  const enemy1 = mk({ id: "enemy1", side: "opposition" });
  const state = makeState({ combatants: [me, enemy1], positions: { me: { col: 0, row: 0 }, enemy1: { col: 0, row: 1 } } });
  refreshBelief(state, "party"); // first-ever refresh — seeds enemy1 only, since that's everyone present

  const enemy2 = mk({ id: "enemy2", side: "opposition" });
  state.combatants.set("enemy2", enemy2);
  state.positions.set("enemy2", { col: 500, row: 500 }); // far outside vision range, never perceived
  refreshBelief(state, "party");

  const belief = believedEnemies(state, "party");
  assert.ok(belief.some((b) => b.id === "enemy1"), "the originally-deployed enemy stays tracked");
  assert.ok(!belief.some((b) => b.id === "enemy2"), "the later-arriving, never-perceived enemy must have no entry at all");
});

test("REGRESSION target: an enemy last seen at round N keeps that STALE position after moving out of sight, marked not-visible — this IS the fog-of-war memory mechanism, not a bug", () => {
  const me = mk({ id: "me", vision: { range: 300 } });
  const enemy = mk({ id: "enemy", side: "opposition" });
  const state = makeState({ round: 3, combatants: [me, enemy], positions: { me: { col: 0, row: 0 }, enemy: { col: 5, row: 0 } } });
  refreshBelief(state, "party");
  assert.equal(believedEnemies(state, "party")[0].visible, true);

  // Enemy moves far out of the 300ft (6-square) vision range.
  state.round = 4;
  state.positions.set("enemy", { col: 100, row: 100 });
  refreshBelief(state, "party");
  const belief = believedEnemies(state, "party")[0];
  assert.equal(belief.visible, false, "no longer visible");
  assert.deepEqual(belief.position, { col: 5, row: 0 }, "position must stay at the STALE last-seen location, not silently update to the new real one");
  assert.equal(belief.lastSeenRound, 3, "must record WHEN it was last actually seen, not the current round");
});

test("HEADLINE (vision-as-chassis-axis): a blind unit still benefits from a sighted ALLY's vision — refreshBelief checks the whole side's combined sight, not just one combatant", () => {
  const blindFrame = mk({ id: "frame", vision: { range: 50 } }); // nearly blind
  const spotterVehicle = mk({ id: "spotter", vision: { range: 5000 } }); // excellent sensors
  const enemy = mk({ id: "enemy", side: "opposition" });
  const state = makeState({
    combatants: [blindFrame, spotterVehicle, enemy],
    positions: { frame: { col: 0, row: 0 }, spotter: { col: 0, row: 0 }, enemy: { col: 50, row: 0 } } // 2500ft — beyond the Frame's own 50ft, well within the spotter's 5000ft
  });
  refreshBelief(state, "party");
  const belief = believedEnemies(state, "party");
  assert.equal(belief.length, 1, "the whole PARTY side believes the enemy exists, because the spotter can see them");
  assert.equal(belief[0].visible, true);
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
