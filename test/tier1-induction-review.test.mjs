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

import { isReviewComplete } from "../module/blank-inheritance/scripts/core/induction-review.mjs";

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
