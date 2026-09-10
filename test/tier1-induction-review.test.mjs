// Tier 1 — the induction terminal's Page 9 review-completeness gate.
//
// Pure logic only: whether every required prior choice exists. No Foundry
// -- the actual Actor-creation sequence (embedding real ancestry/
// background/class Items, resolving boost selections, setting free boosts)
// necessarily lives in the adapter and isn't unit-testable here; it was
// validated live against the local Foundry instance instead (see
// design/induction-terminal.md's Page 9 build-status paragraph for the
// full verified recipe and what it produced on a real test character).

import { test } from "node:test";
import assert from "node:assert/strict";

import { isReviewComplete, stripGrantItemRules } from "../module/blank-inheritance/scripts/core/induction-review.mjs";

const COMPLETE_STATE = {
  ancestry: { id: "human" },
  background: { id: "smuggler" },
  class: { id: "soldier" },
  finishing: { name: "Ren" },
  attributes: { freeBoostPicks: ["str", "dex", "int", "wis"] }
};

test("isReviewComplete: true when ancestry, background, class, name and all four free boosts are set", () => {
  assert.equal(isReviewComplete(COMPLETE_STATE), true);
});

test("isReviewComplete: false with any single piece missing", () => {
  assert.equal(isReviewComplete({ ...COMPLETE_STATE, ancestry: { id: null } }), false, "no ancestry");
  assert.equal(isReviewComplete({ ...COMPLETE_STATE, background: { id: null } }), false, "no background");
  assert.equal(isReviewComplete({ ...COMPLETE_STATE, class: { id: null } }), false, "no class");
  assert.equal(isReviewComplete({ ...COMPLETE_STATE, finishing: { name: "" } }), false, "no name");
  assert.equal(isReviewComplete({ ...COMPLETE_STATE, finishing: { name: "   " } }), false, "whitespace-only name");
  assert.equal(isReviewComplete({ ...COMPLETE_STATE, attributes: { freeBoostPicks: ["str"] } }), false, "free boosts incomplete");
});

test("isReviewComplete: false on a completely empty/fresh state, and never throws on missing sub-objects", () => {
  assert.equal(isReviewComplete({}), false);
  assert.equal(isReviewComplete(undefined), false);
});

test("stripGrantItemRules: removes a GrantItem rule element, real shape (Escaped Experiment's own 'Canny Acumen' grant)", () => {
  // Found live 2026-09-10: embedding this background WITHOUT stripping its
  // GrantItem rule auto-granted "Canny Acumen", which itself popped a real
  // interactive ChoiceSet dialog mid-embed and hung the whole confirm flow
  // until someone clicked it. system.items = {} alone does nothing against
  // this -- it's a completely separate grant mechanism.
  const rules = [{ key: "GrantItem", uuid: "Compendium.sf2e.feats.Item.i4yRvVwvXbGZDsD1" }];
  assert.deepEqual(stripGrantItemRules(rules), []);
});

test("stripGrantItemRules: leaves unrelated rules alone (real shape: Human's own ActiveEffectLike flag)", () => {
  const rules = [{
    key: "ActiveEffectLike", mode: "override", path: "flags.system.standardizedAncestryFeats",
    priority: 10, value: { ancestralSkills: { skillOne: "diplomacy", skillTwo: "society" } }
  }];
  assert.deepEqual(stripGrantItemRules(rules), rules);
});

test("stripGrantItemRules: removes ONLY the GrantItem entries out of a mixed list", () => {
  const grantRule = { key: "GrantItem", uuid: "Compendium.sf2e.feats.Item.someId" };
  const otherRule = { key: "ActiveEffectLike", path: "some.flag" };
  assert.deepEqual(stripGrantItemRules([grantRule, otherRule]), [otherRule]);
});

test("stripGrantItemRules: handles an empty or missing rules array without throwing", () => {
  assert.deepEqual(stripGrantItemRules([]), []);
  assert.deepEqual(stripGrantItemRules(undefined), []);
  assert.deepEqual(stripGrantItemRules(null), []);
});

test("isReviewComplete: does NOT require optional fields (pronouns, languages, backstory answers) to be set", () => {
  // A minimal-but-legal build: only the four required pieces present, everything
  // optional left at its default empty state -- must still pass.
  const minimal = {
    ancestry: { id: "human" },
    background: { id: "smuggler" },
    class: { id: "soldier" },
    finishing: { name: "Ren", pronouns: "", genderIdentity: "", appearance: "", languages: [], banalAnswers: {} },
    attributes: { freeBoostPicks: ["str", "dex", "int", "wis"] },
    intake: { questions: {} }
  };
  assert.equal(isReviewComplete(minimal), true);
});
