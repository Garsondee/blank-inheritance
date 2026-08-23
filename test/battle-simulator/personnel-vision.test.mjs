/**
 * Raw perception for the PERSONNEL-SCALE engine (design doc §19). Same shape as vision.test.mjs,
 * MINUS Scale-Blind coverage — personnel-engine/vision.mjs never ported that check at all (see its
 * own header: nothing here has a "scale" axis to be disparate across). This is also the direct
 * test design doc §19's own plan calls for by name: "no LOS to the only enemy -> zero attack
 * proposals" starts here, at the canPerceive primitive itself.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { canPerceive, anyoneOnSideCanPerceive } from "../../tools/battle-simulator/personnel-engine/vision.mjs";
import { EDGE_SENSE } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";

function mk(overrides = {}) {
  return { id: "x", name: "X", side: "party", currentHP: 10, ...overrides };
}

test("canPerceive: no `vision` field means unlimited range — the required no-op for every fixture that doesn't opt in", () => {
  const observer = mk();
  const target = mk({ id: "y", side: "opposition" });
  assert.equal(canPerceive(observer, { col: 0, row: 0 }, target, { col: 1000, row: 1000 }, []), true);
});

test("canPerceive: a defined vision.range rejects a target beyond it (real feet, 5ft grid)", () => {
  const observer = mk({ vision: { range: 50 } });
  const target = mk({ id: "y", side: "opposition" });
  assert.equal(canPerceive(observer, { col: 0, row: 0 }, target, { col: 5, row: 0 }, []), true, "5 squares = 25ft, within 50ft range");
  assert.equal(canPerceive(observer, { col: 0, row: 0 }, target, { col: 20, row: 0 }, []), false, "20 squares = 100ft, beyond 50ft range");
});

test("canPerceive: a wall blocking Line of Effect also blocks perception — the exact mechanism Phase 1b's building depends on", () => {
  const observer = mk();
  const target = mk({ id: "y", side: "opposition" });
  const wall = [{ c: [4, 4, 4, 6], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }];
  assert.equal(canPerceive(observer, { col: 2, row: 5 }, target, { col: 7, row: 5 }, wall), false);
});

test("canPerceive: a move-blocking-only wall (sight: NONE) does not block perception", () => {
  const observer = mk();
  const target = mk({ id: "y", side: "opposition" });
  const wall = [{ c: [4, 4, 4, 6], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NONE }];
  assert.equal(canPerceive(observer, { col: 2, row: 5 }, target, { col: 7, row: 5 }, wall), true);
});

test("anyoneOnSideCanPerceive: true if ANY living ally can see the target, even if the specific unit asking cannot", () => {
  const nearsighted = mk({ id: "nearsighted", vision: { range: 10 } });
  const spotter = mk({ id: "spotter", vision: { range: 500 } });
  const target = mk({ id: "enemy", side: "opposition" });
  const state = {
    combatants: new Map([["nearsighted", nearsighted], ["spotter", spotter], ["enemy", target]]),
    positions: new Map([["nearsighted", { col: 0, row: 0 }], ["spotter", { col: 0, row: 0 }], ["enemy", { col: 10, row: 0 }]]),
    walls: []
  };
  assert.equal(anyoneOnSideCanPerceive("party", state, "enemy"), true);
});

test("anyoneOnSideCanPerceive: false if NO living member of the side can see the target — the case that must produce zero attack proposals", () => {
  const blind1 = mk({ id: "blind1", vision: { range: 5 } });
  const blind2 = mk({ id: "blind2", vision: { range: 5 } });
  const target = mk({ id: "enemy", side: "opposition" });
  const state = {
    combatants: new Map([["blind1", blind1], ["blind2", blind2], ["enemy", target]]),
    positions: new Map([["blind1", { col: 0, row: 0 }], ["blind2", { col: 0, row: 0 }], ["enemy", { col: 100, row: 0 }]]),
    walls: []
  };
  assert.equal(anyoneOnSideCanPerceive("party", state, "enemy"), false);
});

test("anyoneOnSideCanPerceive: a DEAD ally's vision does not count", () => {
  const deadSpotter = mk({ id: "dead", vision: { range: 500 }, currentHP: 0 });
  const target = mk({ id: "enemy", side: "opposition" });
  const state = {
    combatants: new Map([["dead", deadSpotter], ["enemy", target]]),
    positions: new Map([["dead", { col: 0, row: 0 }], ["enemy", { col: 10, row: 0 }]]),
    walls: []
  };
  assert.equal(anyoneOnSideCanPerceive("party", state, "enemy"), false, "a dead spotter's senses don't work");
});

test("anyoneOnSideCanPerceive: a wall separating an entire room blocks perception even at close range — the exact building scenario design doc §19 Phase 1b/3 exercises", () => {
  const observer = mk({ id: "observer" });
  const target = mk({ id: "enemy", side: "opposition" });
  // A closed wall run directly between two adjacent squares in different rooms.
  const wall = [{ c: [5, 0, 5, 10], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }];
  const state = {
    combatants: new Map([["observer", observer], ["enemy", target]]),
    positions: new Map([["observer", { col: 4, row: 5 }], ["enemy", { col: 6, row: 5 }]]), // 10ft apart, opposite sides of the wall
    walls: wall
  };
  assert.equal(anyoneOnSideCanPerceive("party", state, "enemy"), false, "close range must not bypass a real wall between two rooms");
});
