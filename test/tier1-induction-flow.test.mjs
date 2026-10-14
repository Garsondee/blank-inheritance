// Tier 1 — the induction terminal's navigation and saved forms (UI pass, 2026-09-25).
//
// Pure logic only, no Foundry: core/induction-flow.mjs (the step order, which steps the tracker may
// jump to, what's left to pick) and core/induction-draft.mjs (what a saved form keeps, what it drops,
// and where a resumed form reopens). The terminal wires both in; test/tier3-induction-ui-wiring.test.mjs
// checks that wiring.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  STEPS, stepOrder, canJumpTo, trackerSteps, laterStep, remainingPicks
} from "../module/blank-inheritance/scripts/core/induction-flow.mjs";
import {
  DRAFT_VERSION, draftKey, hasProgress, serializeDraft, restoreDraft, resumeStep
} from "../module/blank-inheritance/scripts/core/induction-draft.mjs";
import { ABILITIES } from "../module/blank-inheritance/scripts/core/boost-slots.mjs";

const ids = (order) => order.map(([id]) => id);
const done = (...finished) => (id) => finished.includes(id);
const allDone = () => true;

// --- The step order ----------------------------------------------------------------------------------

test("stepOrder: nine numbered pages, the player's page just before Review, and the agreement second only when the world setting shows it", () => {
  assert.deepEqual(ids(stepOrder()), [1, 2, 3, 4, 5, 6, 7, 8, "player", 9]);
  assert.deepEqual(ids(stepOrder({ agreement: true })), [1, "agreement", 2, 3, 4, 5, 6, 7, 8, "player", 9]);
  assert.equal(STEPS.length, 11);
});

test("the player's page (Ingram, 2026-10-01) sits between Questions and Review, and is labelled for the player", () => {
  const order = ids(stepOrder());
  assert.equal(order.indexOf("player"), order.indexOf(8) + 1);
  assert.equal(order.indexOf(9), order.indexOf("player") + 1, "Review stays last: 'just before the end of the form'");
  assert.equal(STEPS.find(([id]) => id === "player")[1], "For the Player");
});

test("canJumpTo: the player's page is a normal step -- reachable once passed, never the agreement's 'seen once' rule", () => {
  const order = stepOrder();
  assert.equal(canJumpTo("player", { order, current: 9, furthest: 9, isComplete: allDone }), true, "Review's Change link");
  assert.equal(canJumpTo("player", { order, current: 3, furthest: 5, isComplete: allDone }), false, "not before you've been there");
  assert.equal(canJumpTo(9, { order, current: 3, furthest: 9, isComplete: allDone }), true);
});

// --- Jumping -------------------------------------------------------------------------------------------

test("canJumpTo: back to any finished step, never to the page already open", () => {
  const order = stepOrder();
  assert.equal(canJumpTo(2, { order, current: 5, furthest: 5, isComplete: allDone }), true);
  assert.equal(canJumpTo(5, { order, current: 5, furthest: 5, isComplete: allDone }), false);
});

test("canJumpTo: forward only as far as the player has already been", () => {
  const order = stepOrder();
  assert.equal(canJumpTo(7, { order, current: 3, furthest: 7, isComplete: allDone }), true);
  assert.equal(canJumpTo(8, { order, current: 3, furthest: 7, isComplete: allDone }), false);
});

test("canJumpTo: never past an unfinished step, so Review can't be reached over a half-done page", () => {
  const order = stepOrder();
  const isComplete = done(1, 2, 4, 5, 6, 7, 8); // Background (3) was left half-done
  assert.equal(canJumpTo(3, { order, current: 9, furthest: 9, isComplete }), true, "the unfinished step itself is reachable");
  assert.equal(canJumpTo(9, { order, current: 3, furthest: 9, isComplete }), false);
  assert.equal(canJumpTo(4, { order, current: 3, furthest: 9, isComplete }), false);
});

test("canJumpTo: the agreement is never a link -- it's seen once, at signing", () => {
  const order = stepOrder({ agreement: true });
  assert.equal(canJumpTo("agreement", { order, current: 5, furthest: 9, isComplete: allDone }), false);
  assert.equal(canJumpTo(2, { order, current: 5, furthest: 9, isComplete: allDone }), true);
});

test("canJumpTo: a step that isn't in this order (the agreement, switched off) is refused", () => {
  assert.equal(canJumpTo("agreement", { order: stepOrder(), current: 2, furthest: 9, isComplete: allDone }), false);
  assert.equal(canJumpTo(42, { order: stepOrder(), current: 2, furthest: 9, isComplete: allDone }), false);
});

test("trackerSteps: display numbers follow the visible order, so the agreement renumbers the rest", () => {
  const withAgreement = trackerSteps({ order: stepOrder({ agreement: true }), current: 2, furthest: 2, isComplete: allDone });
  assert.deepEqual(withAgreement.map((s) => s.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(withAgreement.find((s) => s.id === 2).number, 3);
  const without = trackerSteps({ order: stepOrder(), current: 2, furthest: 2, isComplete: allDone });
  assert.equal(without.find((s) => s.id === 2).number, 2);
});

test("trackerSteps: done / current / upcoming, and only reachable steps are links", () => {
  const steps = trackerSteps({ order: stepOrder(), current: 4, furthest: 6, isComplete: allDone });
  const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
  assert.equal(byId[3].isDone, true);
  assert.equal(byId[4].isCurrent, true);
  assert.equal(byId[4].canJump, false);
  assert.equal(byId[6].isUpcoming, true);
  assert.equal(byId[6].canJump, true, "been there already");
  assert.equal(byId[7].canJump, false, "not yet reached");
  assert.equal(byId[5].label, "Attributes");
});

test("laterStep: the further of two steps in display order", () => {
  const order = stepOrder({ agreement: true });
  assert.equal(laterStep(1, "agreement", order), "agreement");
  assert.equal(laterStep("agreement", 2, order), 2);
  assert.equal(laterStep(7, 3, order), 7);
});

test("remainingPicks: counts only the free slots still open; fixed slots never count", () => {
  const fixedThenFree = [["con"], ["str"], ABILITIES];
  assert.equal(remainingPicks(fixedThenFree, []), 1);
  assert.equal(remainingPicks(fixedThenFree, ["dex"]), 0);
  assert.equal(remainingPicks([ABILITIES, ABILITIES], ["str"]), 1);
  assert.equal(remainingPicks(), 0);
});

// --- Saved forms ----------------------------------------------------------------------------------------

function fresh() {
  return {
    page: 1,
    furthest: 1,
    agreement: { signed: false, signedAt: null, secondsOnPage: null, furthestRead: null },
    ancestry: { id: null, filter: "", boostPicks: [], flawPicks: [] },
    background: { id: null, filter: "", boostPicks: [], choices: {} },
    class: { id: null, keyAbilityPicks: [], choices: {} },
    attributes: { freeBoostPicks: [] },
    portrait: { path: null, uploading: false, error: null },
    finishing: { name: "", pronouns: "", genderIdentity: "", appearance: "", languages: [], personalFile: {}, personality: {} },
    intake: { questions: {}, freeform: "" },
    review: { confirming: false, error: null, createdActorId: null }
  };
}

function midway() {
  const s = fresh();
  s.page = 5;
  s.furthest = 5;
  s.ancestry = { id: "vesk", filter: "ves", boostPicks: ["dex"], flawPicks: [] };
  s.background = { id: "smuggler", filter: "", boostPicks: ["dex", "con"], choices: {} };
  s.class = { id: "soldier", keyAbilityPicks: [] };
  s.attributes.freeBoostPicks = ["str", "dex"];
  s.portrait = { path: "modules/blank-inheritance/storage/portraits/x.webp", uploading: true, error: "boom" };
  s.finishing.name = "Kestrel";
  s.finishing.personality = { likes: "Cold tea." };
  s.review = { confirming: true, error: "boom", createdActorId: null };
  return s;
}

test("draftKey: one saved form per world and user", () => {
  assert.equal(draftKey("w1", "u1"), "w1/u1");
  assert.notEqual(draftKey("w1", "u1"), draftKey("w2", "u1"));
  assert.notEqual(draftKey("w1", "u1"), draftKey("w1", "u2"));
});

test("hasProgress: opening the form and reading Page 1 isn't a form in progress", () => {
  assert.equal(hasProgress(fresh()), false);
  const moved = fresh();
  moved.page = 2; // turning the page is not a choice
  assert.equal(hasProgress(moved), false);
  assert.equal(hasProgress(null), false);
});

test("hasProgress: any choice or any written answer is", () => {
  const cases = [
    (s) => { s.agreement.signed = true; },
    (s) => { s.ancestry.id = "human"; },
    (s) => { s.attributes.freeBoostPicks = ["str"]; },
    (s) => { s.portrait.path = "p.webp"; },
    (s) => { s.finishing.name = "A"; },
    (s) => { s.finishing.languages = ["Common"]; },
    (s) => { s.finishing.personalFile = { age: "19" }; },
    (s) => { s.intake.questions = { allies: "Some." }; },
    (s) => { s.intake.questions = { enjoy: "Working things out." }; }, // the player's page shares the same answer map
    (s) => { s.intake.freeform = "Anything."; }
  ];
  for (const mutate of cases) {
    const s = fresh();
    mutate(s);
    assert.equal(hasProgress(s), true, String(mutate));
  }
  const blankAnswer = fresh();
  blankAnswer.finishing.name = "   ";
  assert.equal(hasProgress(blankAnswer), false, "whitespace is not an answer");
});

test("serializeDraft: keeps every choice, drops what was only true for a moment", () => {
  const saved = serializeDraft(midway(), "2026-09-25T12:00:00.000Z");
  assert.equal(saved.version, DRAFT_VERSION);
  assert.equal(saved.savedAt, "2026-09-25T12:00:00.000Z");
  assert.equal(saved.state.ancestry.id, "vesk");
  assert.equal(saved.state.portrait.path, "modules/blank-inheritance/storage/portraits/x.webp");
  assert.equal("filter" in saved.state.ancestry, false, "a typed filter is not a choice");
  assert.equal("uploading" in saved.state.portrait, false, "an upload in flight can't be resumed");
  assert.equal("error" in saved.state.portrait, false);
  assert.equal("confirming" in saved.state.review, false);
  assert.equal("createdActorId" in saved.state.review, false);
});

test("serializeDraft: never touches the live state it was given", () => {
  const live = midway();
  serializeDraft(live);
  assert.equal(live.portrait.uploading, true);
  assert.equal(live.ancestry.filter, "ves");
});

test("restoreDraft: a saved form comes back laid over a blank one, transient fields at their defaults", () => {
  const restored = restoreDraft(JSON.parse(JSON.stringify(serializeDraft(midway(), "t"))), fresh());
  assert.ok(restored);
  assert.equal(restored.savedAt, "t");
  const s = restored.state;
  assert.equal(s.page, 5);
  assert.deepEqual(s.background, { id: "smuggler", filter: "", boostPicks: ["dex", "con"], choices: {} });
  assert.deepEqual(s.portrait, { path: "modules/blank-inheritance/storage/portraits/x.webp", uploading: false, error: null });
  assert.deepEqual(s.review, { confirming: false, error: null, createdActorId: null });
  assert.deepEqual(s.finishing.personality, { likes: "Cold tea." });
});

test("restoreDraft: the answers to a background's or class's questions come back whole, and a form saved before they existed gets none", () => {
  const withAnswers = midway();
  withAnswers.background = { id: "starship-dweller", filter: "", boostPicks: ["dex", "con"], choices: { skill: "piloting" } };
  withAnswers.class = { id: "envoy", keyAbilityPicks: [], choices: { skill: "intimidation" } };
  const back = restoreDraft(JSON.parse(JSON.stringify(serializeDraft(withAnswers, "t"))), fresh()).state;
  assert.deepEqual(back.background.choices, { skill: "piloting" });
  assert.deepEqual(back.class.choices, { skill: "intimidation" });

  const old = JSON.parse(JSON.stringify(serializeDraft(midway(), "t")));
  delete old.state.background.choices;
  delete old.state.class.choices;
  const restored = restoreDraft(old, fresh()).state;
  assert.deepEqual(restored.background.choices, {}, "a draft saved before the field existed lays over a blank one that has it");
  assert.deepEqual(restored.class.choices, {});

  const hostile = JSON.parse(JSON.stringify(serializeDraft(withAnswers, "t")));
  hostile.state.background.choices = { skill: "piloting", sneaky: { nested: true }, n: 4 };
  assert.deepEqual(restoreDraft(hostile, fresh()).state.background.choices, { skill: "piloting" }, "only text answers are kept");
});

test("restoreDraft: a field added since the save keeps its default; one removed since is dropped", () => {
  const saved = serializeDraft(midway());
  delete saved.state.intake; // saved before intake existed
  saved.state.retiredField = { anything: 1 }; // removed from the form since
  const base = { ...fresh(), newSection: { enabled: false } };
  const s = restoreDraft(saved, base).state;
  assert.deepEqual(s.intake, { questions: {}, freeform: "" });
  assert.deepEqual(s.newSection, { enabled: false });
  assert.equal("retiredField" in s, false);
});

test("restoreDraft: answer maps keep strings only; nothing structured sneaks into a plain field", () => {
  const saved = serializeDraft(midway());
  saved.state.intake.questions = { allies: "Some.", evil: { nested: true }, n: 3 };
  saved.state.finishing.name = { not: "a string" };
  const s = restoreDraft(saved, fresh()).state;
  assert.deepEqual(s.intake.questions, { allies: "Some." });
  assert.equal(s.finishing.name, "", "an object where a string belongs falls back to the default");
});

test("restoreDraft: an old version, a broken entry or an empty form is not offered at all", () => {
  assert.equal(restoreDraft({ ...serializeDraft(midway()), version: DRAFT_VERSION + 1 }, fresh()), null);
  assert.equal(restoreDraft(null, fresh()), null);
  assert.equal(restoreDraft("garbage", fresh()), null);
  assert.equal(restoreDraft({ version: DRAFT_VERSION, state: "x" }, fresh()), null);
  assert.equal(restoreDraft(serializeDraft(fresh()), fresh()), null, "nothing chosen, nothing to offer");
});

test("resumeStep: reopens where the form stopped when everything before it is finished", () => {
  assert.equal(resumeStep(7, { order: stepOrder(), isComplete: allDone }), 7);
});

test("resumeStep: stops at the first unfinished step before it instead", () => {
  assert.equal(resumeStep(7, { order: stepOrder(), isComplete: done(1, 2, 4, 5, 6) }), 3);
});

test("resumeStep: a form saved before the agreement was switched on reopens on the agreement", () => {
  assert.equal(resumeStep(6, { order: stepOrder({ agreement: true }), isComplete: done(1, 2, 3, 4, 5) }), "agreement");
});

test("resumeStep: a form saved on the agreement, now switched off, reopens on the step after it", () => {
  assert.equal(resumeStep("agreement", { order: stepOrder(), isComplete: allDone }), 2);
});

test("resumeStep: a page that doesn't exist reopens at the start", () => {
  assert.equal(resumeStep("nonsense", { order: stepOrder(), isComplete: allDone }), 1);
});

test("resumeStep: a form saved on the player's page reopens there, and a form saved on Review before it existed still opens on Review", () => {
  assert.equal(resumeStep("player", { order: stepOrder(), isComplete: allDone }), "player");
  assert.equal(resumeStep(9, { order: stepOrder(), isComplete: allDone }), 9);
});

test("restoreDraft: answers to the player's questions come back with the rest of the form", () => {
  const s = midway();
  s.page = "player";
  s.furthest = "player";
  s.intake.questions = { enjoy: "A plan that came together.", gently: "Ask me first." };
  const restored = restoreDraft(JSON.parse(JSON.stringify(serializeDraft(s, "t"))), fresh());
  assert.equal(restored.state.page, "player", "a keyed page id survives a save");
  assert.equal(restored.state.furthest, "player");
  assert.deepEqual(restored.state.intake.questions, { enjoy: "A plan that came together.", gently: "Ask me first." });
});
