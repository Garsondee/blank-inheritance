// How much of each card can be seen (core/visibility.mjs), and that the formations place people so that no card is hidden
// by more than the rule allows (Ingram, 2026-10-03: a huddle round the notebook was "a complete collision"; people should
// stand "fully in view").

import { test } from "node:test";
import assert from "node:assert/strict";
import { describeScene } from "../scripts/core/scene.mjs";
import { Stage } from "../scripts/core/stage.mjs";
import { cardRect, hiddenShares, coveredShare, HIDDEN_AT_MOST } from "../scripts/core/visibility.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);

/** Where everyone stands once a formation's moves are made, as cards the visibility check reads. */
function placed(s, moves) {
  const by = new Map(moves.map((m) => [m.id, m]));
  return [...s.cards.values()].map((c) => {
    const m = by.get(c.id);
    const p = m ? s.rig.standing(m.at) : { X: c.puppet.x, Z: c.Z };
    const g = s.grow(p.Z);
    return { id: c.id, X: p.X, Z: p.Z, w: c.w * g, h: c.h * g, lift: s.riserFor(p.X, p.Z, c.w * g, c.h * g) };
  });
}

test("a card further back fills a smaller rectangle, higher up the page", () => {
  const s = new Stage(scene, []);
  const front = cardRect(s.rig, { X: 0, Z: 0, w: 280, h: 468 });
  const back = cardRect(s.rig, { X: 0, Z: -900, w: 280, h: 468 });
  assert.ok(front.x1 - front.x0 > back.x1 - back.x0);
  assert.ok(front.y1 > back.y1, "its feet are higher up the page");
});

test("a card squarely behind another is hidden; one beside it is not; one a little to the side shows most of itself", () => {
  const s = new Stage(scene, []);
  const at = (id, X, Z) => ({ id, X, Z, w: 280, h: 468 });
  const shares = hiddenShares(s.rig, [at("front", 0, -100), at("behind", 0, -160), at("beside", 900, -160), at("aside", -270, -200)]);
  assert.ok(shares.get("behind").hidden > 0.9);
  assert.deepEqual(shares.get("behind").by, ["front"]);
  assert.equal(shares.get("beside").hidden, 0);
  assert.equal(shares.get("front").hidden, 0, "nothing is in front of the front card");
  assert.ok(shares.get("aside").hidden < 0.25);
});

test("what covers the bottom of the screen covers a card by the share of it that lies under a band or a dial", () => {
  const card = { x0: 100, y0: 100, x1: 300, y1: 500 };
  assert.equal(coveredShare(card, []), 0);
  assert.equal(coveredShare(card, [{ rect: [0, 0, 1000, 1000] }]), 1);
  assert.ok(Math.abs(coveredShare(card, [{ rect: [0, 400, 1000, 1000] }]) - 0.25) < 0.03, "a band over its bottom quarter");
  const dial = coveredShare(card, [{ circle: [200, 600, 200] }]);
  assert.ok(dial > 0.1 && dial < 0.3, `a dial rising under it covers some of its middle (${dial})`);
  assert.equal(coveredShare(card, [{ circle: [900, 900, 100] }]), 0, "one elsewhere covers nothing");
});

test("every formation of three to six people leaves every face in view: none hidden more than the rule allows", () => {
  const kinds = ["huddle", "talk", "gangup", "panel", "standoff", "circle", "audience", "scatter", "line"];
  const problems = [];
  for (const n of [3, 4, 5, 6]) {
    const people = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, at: [0.15 + (0.7 * i) / (n - 1), 0.88] }));
    for (const kind of kinds) {
      const s = new Stage(scene, people);
      const moves = s.formationMoves(kind, { focus: [0.5, 0.82], target: "p1", speakers: ["p0", "p1"] });
      for (const [id, v] of hiddenShares(s.rig, placed(s, moves))) {
        if (v.hidden > HIDDEN_AT_MOST + 0.001) problems.push(`${kind} of ${n}: ${id} is ${Math.round(v.hidden * 100)}% hidden by ${v.by.join(", ")}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
