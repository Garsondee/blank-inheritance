/**
 * Tests for raw perception (design doc §15r). The single most important
 * property, exactly like walls: a combatant with no `vision` field must
 * perceive identically to how the engine already behaves everywhere today
 * — every existing fixture has no `vision` field, so this must be a
 * complete no-op for all of them.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { canPerceive, anyoneOnSideCanPerceive } from "../../tools/battle-simulator/engine/vision.mjs";
import { EDGE_SENSE } from "../../tools/battle-simulator/engine/terrain.mjs";

function mk(overrides = {}) {
  return { id: "x", name: "X", side: "party", size: "huge", currentHP: 100, scaleBlind: false, ...overrides };
}

test("canPerceive: no `vision` field means unlimited range — the required no-op for every existing fixture", () => {
  const observer = mk();
  const target = mk({ id: "y", side: "opposition" });
  assert.equal(canPerceive(observer, { col: 0, row: 0 }, target, { col: 1000, row: 1000 }, []), true);
});

test("canPerceive: a defined vision.range rejects a target beyond it", () => {
  const observer = mk({ vision: { range: 500 } });
  const target = mk({ id: "y", side: "opposition" });
  assert.equal(canPerceive(observer, { col: 0, row: 0 }, target, { col: 5, row: 0 }, []), true, "5 squares = 250ft, within 500ft range");
  assert.equal(canPerceive(observer, { col: 0, row: 0 }, target, { col: 20, row: 0 }, []), false, "20 squares = 1000ft, beyond 500ft range");
});

test("canPerceive: Scale-Blind blocks perceiving Medium-or-smaller, exactly matching checkScaleTargeting's existing rule", () => {
  const observer = mk({ scaleBlind: true });
  const small = mk({ id: "y", side: "opposition", size: "medium" });
  const large = mk({ id: "z", side: "opposition", size: "huge" });
  assert.equal(canPerceive(observer, { col: 0, row: 0 }, small, { col: 1, row: 0 }, []), false);
  assert.equal(canPerceive(observer, { col: 0, row: 0 }, large, { col: 1, row: 0 }, []), true);
});

test("canPerceive: a wall blocking Line of Effect also blocks perception — reuses the same terrain model", () => {
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
  const blind = mk({ id: "blind", vision: { range: 50 } });
  const spotter = mk({ id: "spotter", vision: { range: 5000 } });
  const target = mk({ id: "enemy", side: "opposition" });
  const state = {
    combatants: new Map([["blind", blind], ["spotter", spotter], ["enemy", target]]),
    positions: new Map([["blind", { col: 0, row: 0 }], ["spotter", { col: 0, row: 0 }], ["enemy", { col: 10, row: 0 }]]),
    walls: []
  };
  assert.equal(anyoneOnSideCanPerceive("party", state, "enemy"), true, "the spotter's long range should cover for the near-blind unit");
});

test("anyoneOnSideCanPerceive: false if NO living member of the side can see the target", () => {
  const blind1 = mk({ id: "blind1", vision: { range: 50 } });
  const blind2 = mk({ id: "blind2", vision: { range: 50 } });
  const target = mk({ id: "enemy", side: "opposition" });
  const state = {
    combatants: new Map([["blind1", blind1], ["blind2", blind2], ["enemy", target]]),
    positions: new Map([["blind1", { col: 0, row: 0 }], ["blind2", { col: 0, row: 0 }], ["enemy", { col: 100, row: 0 }]]),
    walls: []
  };
  assert.equal(anyoneOnSideCanPerceive("party", state, "enemy"), false);
});

test("anyoneOnSideCanPerceive: a DEAD ally's vision does not count", () => {
  const deadSpotter = mk({ id: "dead", vision: { range: 5000 }, currentHP: 0 });
  const target = mk({ id: "enemy", side: "opposition" });
  const state = {
    combatants: new Map([["dead", deadSpotter], ["enemy", target]]),
    positions: new Map([["dead", { col: 0, row: 0 }], ["enemy", { col: 10, row: 0 }]]),
    walls: []
  };
  assert.equal(anyoneOnSideCanPerceive("party", state, "enemy"), false, "a dead spotter's sensors don't work");
});
