// Tier 1 — the Sign-Off's pure logic (design/scene-signoff.md).
//
// Three things worth holding still, in order of how expensive the failure is:
//
//   1. seal() cannot be talked into sealing a scene that has not been through
//      the four passes. This is the whole enforcement-by-construction claim in
//      §3; if it can be bypassed, the process is a comment again.
//   2. The checklist data and its evaluators cannot drift apart. A check naming
//      an evaluator that does not exist would silently stop being checked.
//   3. Staleness is computed the way §5 says, because that mechanism is the only
//      reason the checklist is allowed to grow.
//
// All against fixtures, not the real corpus — test/tier2-signoff-board.test.mjs
// is where the real files get walked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  seal,
  assertNotPromotedStatus,
  SEALABLE_STATUSES,
  GUARDED_STATUSES,
  SIGNOFF_PASSES
} from "../module/blank-inheritance/scripts/core/promote.mjs";
import { EVALUATORS, APPLICABILITY, runAutoChecks, summariseChecks, horizonsOf, deliberateMention } from "../tools/scene-signoff/checklist.mjs";
import { md, renderReport, reportPath, reviewPath } from "../tools/scene-signoff/report.mjs";
import { buildBoard, checksAddedSince, headline } from "../tools/scene-signoff/board.mjs";
import { cutFires, metresBetween, positionAt, travelLegs, travelSummary } from "../tools/scene-signoff/travel.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const checklist = JSON.parse(
  readFileSync(path.join(repoRoot, "data", "campaign", "signoff-checklist.json"), "utf8")
);

const allClear = (extra = {}) => ({
  checklistVersion: 1,
  passes: Object.fromEntries(SIGNOFF_PASSES.map((p) => [p, { verdict: "CLEAR", date: "2026-09-22", rounds: 1 }])),
  waived: [],
  ...extra
});

const scene = (authoring = { status: "drafted" }) => ({ id: "a-scene", title: "A Scene", authoring });

// ---------------------------------------------------------------- seal() ----

test("seal(): raises a scene to live, stamping who and when", () => {
  const out = seal(scene(), { sealedBy: "Ingram", review: allClear() });
  assert.equal(out.authoring.status, "live");
  assert.equal(out.authoring.gradedBy, "Ingram");
  assert.match(out.authoring.gradedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(out.authoring.review.checklistVersion, 1);
});

test("seal(): refuses unless EVERY pass is CLEAR -- the enforcement-by-construction claim", () => {
  for (const missing of SIGNOFF_PASSES) {
    const review = allClear();
    delete review.passes[missing];
    assert.throws(
      () => seal(scene(), { sealedBy: "Ingram", review }),
      new RegExp(`${missing}=unrun`),
      `a seal with ${missing} unrun must be refused`
    );
  }
});

test("seal(): FIX, STOP and BLOCKED are all too weak to seal on", () => {
  for (const verdict of ["FIX", "STOP", "BLOCKED"]) {
    const review = allClear();
    review.passes.place = { verdict, date: "2026-09-22" };
    assert.throws(() => seal(scene(), { sealedBy: "Ingram", review }), /not CLEAR/);
  }
});

test("seal(): BLOCKED specifically cannot seal -- that is the no-location case the Place pass exists to stop", () => {
  const review = allClear();
  review.passes.place = { verdict: "BLOCKED", date: "2026-09-22", note: "waiting on Ingram to draw the hangar" };
  assert.throws(() => seal(scene(), { sealedBy: "Ingram", review }), /place=BLOCKED/);
});

test("seal(): requires a named sealer and a checklist version", () => {
  assert.throws(() => seal(scene(), { review: allClear() }), /sealedBy/);
  assert.throws(() => seal(scene(), { sealedBy: "Ingram" }), /requires the review record/);
  assert.throws(
    () => seal(scene(), { sealedBy: "Ingram", review: { ...allClear(), checklistVersion: undefined } }),
    /checklistVersion/
  );
  assert.throws(
    () => seal(scene(), { sealedBy: "Ingram", review: { ...allClear(), checklistVersion: "1" } }),
    /checklistVersion/,
    "a version as a string is not an integer and must not pass"
  );
});

test("seal(): is pure -- the input scene is not mutated", () => {
  const input = scene();
  seal(input, { sealedBy: "Ingram", review: allClear() });
  assert.equal(input.authoring.status, "drafted");
  assert.equal(input.authoring.review, undefined);
});

test('assertNotPromotedStatus(): "live" is guarded exactly like sound/final, and names seal() in the error', () => {
  assert.deepEqual(SEALABLE_STATUSES, ["live"]);
  assert.deepEqual([...GUARDED_STATUSES].sort(), ["final", "live", "sound"]);
  assert.throws(() => assertNotPromotedStatus("live", { source: "a generator" }), /a generator attempted to write authoring\.status "live"/);
  assert.throws(() => assertNotPromotedStatus("live"), /seal\(\)/);
  assert.throws(() => assertNotPromotedStatus("sound"), /promote\(\)/, "sound must still point at promote(), not seal()");
  assert.doesNotThrow(() => assertNotPromotedStatus("drafted"));
  assert.doesNotThrow(() => assertNotPromotedStatus("cut"));
});

// ----------------------------------------------------- checklist integrity ----

test("checklist: every `auto` names an evaluator that actually exists", () => {
  const named = checklist.checks.filter((c) => c.auto).map((c) => c.auto);
  assert.ok(named.length > 0, "an all-manual checklist would make the console vacuous");
  for (const name of named) {
    assert.equal(typeof EVALUATORS[name], "function", `check names auto:"${name}" but no such evaluator exists`);
  }
});

test("checklist: no evaluator is orphaned -- every function here is wired to a check", () => {
  const named = new Set(checklist.checks.filter((c) => c.auto).map((c) => c.auto));
  for (const name of Object.keys(EVALUATORS)) {
    assert.ok(named.has(name), `EVALUATORS.${name} is not named by any check -- wire it up or delete it`);
  }
});

test("checklist: ids are unique, and their letter matches their pass", () => {
  const seen = new Set();
  const letter = { comprehension: "C", completeness: "M", place: "P", seam: "S", quality: "Q" };
  for (const c of checklist.checks) {
    assert.ok(!seen.has(c.id), `duplicate check id ${c.id} -- ids are never reused, waivers point at them`);
    seen.add(c.id);
    assert.equal(c.id[0], letter[c.pass], `${c.id} is a ${c.pass} check but its id starts with ${c.id[0]}`);
  }
});

test("checklist: every dependsOnCheck points at a real check in the same pass", () => {
  const byId = new Map(checklist.checks.map((c) => [c.id, c]));
  for (const c of checklist.checks.filter((x) => x.dependsOnCheck)) {
    const prereq = byId.get(c.dependsOnCheck);
    assert.ok(prereq, `${c.id} depends on ${c.dependsOnCheck}, which does not exist`);
    assert.equal(prereq.pass, c.pass, `${c.id} depends on a check in a different pass`);
  }
});

test("the authoring schema knows about every pass -- an omission makes a real verdict unwritable", () => {
  const authoring = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "common", "authoring.schema.json"), "utf8"));
  const declared = Object.keys(authoring.$defs.authoring.properties.review.properties.passes.properties);
  assert.deepEqual(declared, [...SIGNOFF_PASSES], "additionalProperties is false on review.passes, so a missing pass fails validation rather than being ignored");
});

test("checklist: every pass exists, in order, each with a stopping rule and a verdict set", () => {
  assert.deepEqual(checklist.passes.map((p) => p.id), SIGNOFF_PASSES);
  assert.equal(SIGNOFF_PASSES.length, 5, "the Seam pass made five; a drop back to four would silently stop gating a join");
  for (const p of checklist.passes) {
    assert.ok(p.stoppingRule?.length > 20, `${p.id} has no real stopping rule -- "when the job is done" must be written down`);
    assert.ok(p.verdicts.includes("CLEAR"), `${p.id} must be able to clear`);
    assert.ok(p.verdicts.every((v) => ["CLEAR", "FIX", "STOP", "BLOCKED"].includes(v)));
  }
  assert.ok(checklist.passes.find((p) => p.id === "place").verdicts.includes("BLOCKED"));
  for (const id of ["comprehension", "completeness", "quality"]) {
    assert.equal(
      checklist.passes.find((p) => p.id === id).verdicts.includes("BLOCKED"),
      false,
      "BLOCKED is a Place verdict only -- it is the one pass that can legitimately wait on Ingram"
    );
  }
});

test("checklist: every check carries a why and a source", () => {
  for (const c of checklist.checks) {
    assert.ok(c.why?.length > 10, `${c.id} has no why -- a check that cannot be argued with cannot be removed`);
    assert.ok(c.source?.length > 3, `${c.id} has no source`);
  }
});

// --------------------------------------------------------- the evaluators ----

const fixtureScene = (overrides = {}) => ({
  episode: { id: "ep", title: "An Episode", scenes: [] },
  scene: { id: "s", title: "S", authoring: { status: "drafted" }, challengeRefs: [], ...overrides.scene },
  brief: {
    goal: "g", howToPlay: "h", runsAbout: "10 minutes", mode: "social",
    intro: { where: "w", firstThing: "f", readAloud: "r" },
    outro: { endsWhen: "e", transition: { line: "t" }, onwards: "o", writeDown: ["x"] },
    beats: [{ id: "b1", kind: "action", mandatory: true, delivery: "table", text: "do a thing" }],
    cast: [], reactionPrompts: [{ id: "p", text: "t" }], temptations: [{ id: "t", text: "t" }],
    carryForward: [], artefacts: [], offers: [], gmModifiers: [],
    ...overrides.brief
  },
  setEntry: { locationRef: "somewhere", ...overrides.setEntry },
  briefRef: "a-brief",
  key: "ep#s"
});

const fixtureCorpus = (overrides = {}) => ({
  checklist,
  challenges: {}, encounters: {}, subsystems: {}, npcs: {}, creatures: {},
  locations: { somewhere: { id: "somewhere", name: "Somewhere", depth: "detailed", lore: { summary: "a real place" } } },
  ...overrides
});

test("evaluators: a complete fixture passes every required completeness check it can", () => {
  const results = runAutoChecks(fixtureScene(), fixtureCorpus(), { only: "completeness" });
  const failing = results.filter((r) => r.severity === "required" && r.state === "fail").map((r) => r.id);
  // Both fail on purpose: the fixture has no challenge at all (M8) and an empty
  // cast with no note saying that is deliberate (M5).
  assert.deepEqual(failing, ["M5", "M8"]);
});

test("evaluators: M5 accepts an empty cast only when the notes say so, and only near the word", () => {
  const bare = fixtureScene();
  assert.equal(EVALUATORS.castBriefs(bare).ok, false, "an empty cast with no explanation must fail");

  const declared = fixtureScene({ brief: { notes: "NO CAST, DELIBERATELY: this is a montage with no NPCs in it." } });
  assert.equal(EVALUATORS.castBriefs(declared).ok, true);

  // The regression that forced proximity: The Road In's notes contain "...built
  // that way on purpose: nobody should learn what a bad roll feels like", which
  // satisfied a same-sentence keyword+marker test for a check about the CAST.
  const unrelated = fixtureScene({
    brief: { notes: "Every check here costs nothing, and it is built that way on purpose: nobody should learn what a bad roll feels like." }
  });
  assert.equal(
    EVALUATORS.castBriefs(unrelated).ok,
    false,
    "a deliberateness marker elsewhere in the sentence must not exempt the cast check"
  );

  const walkOnsOnly = fixtureScene({ brief: { cast: [{ id: "x", walkOn: true }] } });
  assert.equal(EVALUATORS.castBriefs(walkOnsOnly).ok, true, "walk-ons are a real cast and are exempt from the brief fields");
});

test("deliberateMention(): requires the marker within 40 characters of the keyword", () => {
  assert.ok(deliberateMention("NO LANDMARK AND NO TRACK MOVEMENT, BOTH CORRECT.", /\blandmark\b/i));
  assert.equal(deliberateMention("We should add a landmark here at some point.", /\blandmark\b/i), null);
  const far = `The landmark question is interesting${" and worth noting".repeat(4)}, and this is deliberate.`;
  assert.equal(deliberateMention(far, /\blandmark\b/i), null, "a marker 60+ characters away is not about the keyword");
});

test("evaluators: a recommended check the notes exempt reports as exempt, not as a pass or a failure", () => {
  const scene = fixtureScene({
    brief: { notes: "NO LANDMARK AND NO TRACK MOVEMENT, BOTH CORRECT -- six towns have nothing shared to orbit." }
  });
  const results = runAutoChecks(scene, fixtureCorpus(), { only: "completeness" });
  const landmark = results.find((r) => r.id === "M14");
  assert.equal(landmark.state, "exempt");
  assert.match(landmark.detail, /notes say it is deliberate/);
  assert.equal(summariseChecks([landmark]).recommendedFail, 0);
  assert.equal(summariseChecks([landmark]).recommendedPass, 0, "an exemption is a recorded reason, not a pass");
  assert.equal(summariseChecks([landmark]).recommendedExempt, 1);
});

test("evaluators: a REQUIRED check is never exempted by notes -- it needs an explicit waiver", () => {
  const scene = fixtureScene({
    scene: { challengeRefs: [] },
    brief: { notes: "Only one skill route here, deliberately, and that is correct for this scene." }
  });
  const m8 = runAutoChecks(scene, fixtureCorpus(), { only: "completeness" }).find((r) => r.id === "M8");
  assert.equal(m8.state, "fail", "prose must not clear a required check; that is what waive is for");
});

test("evaluators: M23 fails a numbered Ledger reference with no Node, and a payoff chapter named in prose", () => {
  const numbered = fixtureScene({
    brief: { beats: [{ id: "b", kind: "action", mandatory: true, delivery: "table", text: "x", note: "Advances Mystery Ledger plant #1 one step." }] }
  });
  assert.equal(EVALUATORS.longPlantsHaveNodes(numbered).ok, false);

  const withNode = fixtureScene({
    brief: { beats: [{ id: "b", kind: "action", mandatory: true, delivery: "table", text: "x", note: "Advances Mystery Ledger plant #1 one step.", nodeRefs: ["mystery-ledger-1"] }] }
  });
  assert.equal(EVALUATORS.longPlantsHaveNodes(withNode).ok, true, "a nodeRef is the whole point -- it must clear the check");

  const chapter = fixtureScene({
    brief: { beats: [{ id: "b", kind: "action", mandatory: true, delivery: "table", text: "x", note: "This pays off in Ch5.", nodeRefs: ["mystery-ledger-6"] }] }
  });
  assert.equal(EVALUATORS.longPlantsHaveNodes(chapter).ok, false, "a payoff chapter in prose is a duplicate even when a nodeRef exists");
});

test("evaluators: M23/M26 do not fire on prose that DENIES a plant", () => {
  for (const note of [
    "The primary reading is practical, not a planted clue (ratified, LEDGER #9): pack light.",
    "Nothing in this scene foreshadows anything.",
    "This is never a seed for anything later."
  ]) {
    const scene = fixtureScene({ brief: { beats: [{ id: "b", kind: "action", mandatory: true, delivery: "table", text: "x", note }] } });
    assert.equal(EVALUATORS.longPlantsHaveNodes(scene).ok, true, `M23 must not fire on: ${note}`);
    assert.equal(EVALUATORS.plantsWithoutNodes(scene).ok, true, `M26 must not fire on: ${note}`);
  }
  // ...but denying the RESOLUTION is not denying the plant.
  const stillAPlant = fixtureScene({
    brief: { beats: [{ id: "b", kind: "action", mandatory: true, delivery: "table", text: "x", note: "PLANT, do not resolve." }] }
  });
  assert.equal(EVALUATORS.plantsWithoutNodes(stillAPlant).ok, false, '"do not resolve" asserts a plant and denies only its payoff');
});

test("horizonsOf(): reads short from writeDown, medium from offers/tracks/carryForward, long from nodeRefs", () => {
  const scene = fixtureScene({
    brief: {
      outro: { endsWhen: "e", transition: { line: "t" }, onwards: "o", writeDown: ["a", "b"], tracks: [{ track: "bonds", delta: 1, why: "w" }, { track: "mass", delta: null, why: "w" }] },
      carryForward: ["q"],
      offers: [{ id: "o", name: "n" }],
      nodeRefs: ["arc-one"],
      beats: [{ id: "b", kind: "action", mandatory: true, delivery: "table", text: "x", nodeRefs: ["arc-two", "arc-one"] }]
    }
  });
  const h = horizonsOf(scene);
  assert.equal(h.short, 2);
  assert.equal(h.medium, 3, "one offer + one track WITH a delta + one carryForward; a null delta is not a movement");
  assert.deepEqual(h.long.sort(), ["arc-one", "arc-two"], "node ids are deduplicated across scene and beats");
  assert.equal(EVALUATORS.consequenceRadar(scene).ok, true);
});

test("consequenceRadar(): flags a scene registering at one horizon only, and says which", () => {
  const shortOnly = fixtureScene();
  const out = EVALUATORS.consequenceRadar(shortOnly);
  assert.equal(out.ok, false);
  assert.match(out.detail, /S:1 M:0 L:0/);
  assert.match(out.detail, /short horizon only/);
});

test("evaluators: noCutSystems ignores a mention that disclaims the system, and catches one that uses it", () => {
  const clean = fixtureScene({ brief: { howToPlay: "No ground roles here; Resonance is cut and Anchors are dead text." } });
  assert.equal(EVALUATORS.noCutSystems(clean).ok, true);

  const literal = fixtureScene({ brief: { howToPlay: "A player who sits through it can stop bleeding." } });
  assert.equal(EVALUATORS.noCutSystems(literal).ok, true, "lowercase bleeding is first aid, not the Bleed track");

  const real = fixtureScene({ brief: { howToPlay: "The pilot spends a Resonance point to act twice." } });
  assert.equal(EVALUATORS.noCutSystems(real).ok, false);
});

test("evaluators: prosePatterns needs a real repeat, not a single use", () => {
  const once = fixtureScene({ brief: { goal: "It is not a drill so much as a rehearsal." } });
  assert.equal(EVALUATORS.prosePatterns(once, fixtureCorpus(), { neighbours: [] }).ok, true,
    "one use of a construction is a choice; the double-count bug made every single use look like a repeat");

  const twice = fixtureScene({
    brief: { goal: "Not a drill so much as a rehearsal.", howToPlay: "Not a test so much as a warning." }
  });
  assert.equal(EVALUATORS.prosePatterns(twice, fixtureCorpus(), { neighbours: [] }).ok, false);

  const neighbourHas = fixtureScene({ brief: { goal: "Not a drill so much as a rehearsal." } });
  const neighbour = fixtureScene({ brief: { goal: "Not a march so much as a walk." } });
  assert.equal(
    EVALUATORS.prosePatterns(neighbourHas, fixtureCorpus(), { neighbours: [neighbour] }).ok,
    false,
    "two is where a construction stops being a choice and becomes a habit"
  );
});

test("evaluators: a dependent Place check reports n/a rather than a second failure for one fault", () => {
  const unsited = fixtureScene({ setEntry: { locationRef: null } });
  const results = runAutoChecks(unsited, fixtureCorpus(), { only: "place" });
  assert.equal(results.find((r) => r.id === "P1").state, "fail");
  for (const id of ["P2", "P4", "P6"]) {
    assert.equal(results.find((r) => r.id === id).state, "n/a", `${id} is unanswerable without a location`);
  }
  assert.equal(summariseChecks(results).requiredFail, 1, "one missing location is one fault, not three");
});

test("evaluators: a waiver reports as waived, carrying its reason, and never as a silent pass", () => {
  const waived = fixtureScene({
    scene: { authoring: { status: "drafted", review: { checklistVersion: 1, passes: {}, waived: [{ check: "M8", why: "deliberate relax beat" }] } } }
  });
  const result = runAutoChecks(waived, fixtureCorpus(), { only: "completeness" }).find((r) => r.id === "M8");
  assert.equal(result.state, "waived");
  assert.equal(result.detail, "deliberate relax beat");
  assert.equal(summariseChecks([result]).requiredFail, 0);
  assert.equal(summariseChecks([result]).requiredPass, 0, "a waiver is not a pass -- it stays visible as a decision");
});

test("evaluators: refsResolve catches a dangling npcRef", () => {
  const dangling = fixtureScene({ brief: { cast: [{ id: "x", npcRef: "nobody", brief: {} }] } });
  const out = EVALUATORS.refsResolve(dangling, fixtureCorpus());
  assert.equal(out.ok, false);
  assert.match(out.detail, /npc:nobody/);
});

// ------------------------------------------------------------- the board ----

function boardFor(scenes) {
  return buildBoard({
    ...fixtureCorpus(),
    episodes: [{ id: "ep", title: "An Episode", dayRange: { start: 1 }, scenes }],
    sceneBriefs: { "a-brief": fixtureScene().brief },
    sceneSetByBriefRef: { "a-brief": { locationRef: "somewhere" } },
    sceneSet: { scenes: [] }
  });
}

test("board: counts drafted, in-review and live separately", () => {
  const board = boardFor([
    { order: 1, id: "one", title: "One", briefRef: "a-brief", authoring: { status: "drafted" } },
    { order: 2, id: "two", title: "Two", briefRef: "a-brief", authoring: { status: "drafted", review: { checklistVersion: 1, passes: { comprehension: { verdict: "CLEAR", date: "d" } } } } },
    { order: 3, id: "three", title: "Three", briefRef: "a-brief", authoring: { status: "live", review: allClear() } }
  ]);
  assert.equal(board.totals.scenes, 3);
  assert.equal(board.totals.drafted, 1);
  assert.equal(board.totals.inReview, 1);
  assert.equal(board.totals.live, 1);
  assert.equal(board.next.sceneId, "one", "next up is the first unsealed scene in play order");
});

test("board: a scene sealed against an older checklist is stale, and says against which checks", () => {
  // Derived from the real version rather than hardcoded: the checklist genuinely
  // grows, and a hardcoded "3" silently stopped testing anything the day the
  // real file reached v3.
  const next = checklist.version + 1;
  const grown = { ...checklist, version: next, checks: [...checklist.checks, { id: "Q99", pass: "quality", severity: "required", question: "q", why: "w", source: "s", auto: null, addedIn: next }] };
  const board = buildBoard({
    ...fixtureCorpus({ checklist: grown }),
    episodes: [{ id: "ep", title: "E", dayRange: { start: 1 }, scenes: [
      // Sealed against the checklist's real current version, so the ONLY thing
      // newer than it is the Q99 this test adds at version 3.
      { order: 1, id: "old", title: "Old", briefRef: "a-brief", authoring: { status: "live", review: allClear({ checklistVersion: checklist.version }) } },
      { order: 2, id: "new", title: "New", briefRef: "a-brief", authoring: { status: "live", review: allClear({ checklistVersion: next }) } }
    ] }],
    sceneBriefs: { "a-brief": fixtureScene().brief },
    sceneSetByBriefRef: { "a-brief": { locationRef: "somewhere" } },
    sceneSet: { scenes: [] }
  });
  const [older, newer] = board.rows;
  assert.equal(older.stale, true);
  assert.deepEqual(older.staleAgainst, ["Q99"], "stale against the new check only, not the whole checklist");
  assert.equal(newer.stale, false);
  assert.equal(board.totals.stale, 1);
});

test("checksAddedSince(): only checks added LATER than a sealed version make a scene stale", () => {
  assert.deepEqual(checksAddedSince(checklist, checklist.version), [], "nothing is stale against the current version");
  const sinceV1 = checksAddedSince(checklist, 1).map((c) => c.id);
  assert.ok(sinceV1.length > 0, "v2 added real checks, so v1 must now be stale against something");
  for (const c of checksAddedSince(checklist, 1)) {
    assert.ok((c.addedIn ?? 1) > 1, );
  }
  assert.equal(checksAddedSince(checklist, 0).length, checklist.checks.length, "a check with no addedIn counts as the founding set");
});

test("headline(): says what to do next, not how much is left", () => {
  const board = boardFor([{ order: 1, id: "one", title: "One", briefRef: "a-brief", authoring: { status: "drafted" } }]);
  const line = headline(board);
  assert.match(line, /0\/1 scenes live/);
  assert.match(line, /Next: a-brief/);
});

// ------------------------------------------------- applicability and n/a ----
// Added after the second dry run found 7 of 63 checks unanswerable for a
// six-spotlight montage with no NPCs, and no way for a manual check to say so.

test("checklist: every appliesWhenAuto names a real predicate, and none is orphaned", () => {
  const named = checklist.checks.filter((c) => c.appliesWhenAuto).map((c) => c.appliesWhenAuto);
  assert.ok(named.length > 0, "the applicability mechanism exists to be used");
  for (const name of named) {
    assert.equal(typeof APPLICABILITY[name], "function", `a check names appliesWhenAuto:"${name}" with no such predicate`);
  }
  for (const name of Object.keys(APPLICABILITY)) {
    assert.ok(named.includes(name), `APPLICABILITY.${name} is wired to no check -- use it or delete it`);
  }
});

test("checklist: a check with appliesWhenAuto also states the condition in prose", () => {
  for (const c of checklist.checks.filter((x) => x.appliesWhenAuto)) {
    assert.ok(c.appliesWhen?.length > 10, `${c.id} decides applicability in code but never says so in words`);
  }
});

test("applicability: a montage with no cast marks the NPC and sequence checks n/a, with reasons", () => {
  const montage = fixtureScene({
    brief: {
      cast: [],
      notes: "NO CAST, DELIBERATELY -- there are no NPCs in this scene.",
      beats: [{ id: "spotlights", kind: "action", mandatory: true, delivery: "each", text: "go round the table" }]
    }
  });
  const results = runAutoChecks(montage, fixtureCorpus(), { allScenes: [montage], includeManual: true });
  const state = (id) => results.find((r) => r.id === id)?.state;

  for (const id of ["Q3", "Q4", "Q6"]) assert.equal(state(id), "n/a", `${id} is about a cast this scene does not have`);
  assert.equal(state("C9"), "n/a", "a round-the-table montage runs in parallel, so causal sequence has no answer");
  assert.equal(state("C4"), "n/a", "the scene has no choicePoint");
  assert.equal(state("Q5"), "n/a", "first scene in play order: nobody can return");
  assert.equal(state("Q14"), "n/a", "first scene in play order: no earlier attention to reward");

  for (const r of results.filter((x) => x.state === "n/a")) {
    assert.ok(r.detail?.length > 10, `${r.id} is n/a with no reason given`);
  }
});

test("applicability: the same checks DO apply once the scene has a cast and a predecessor", () => {
  const earlier = fixtureScene({ scene: { id: "earlier" } });
  const later = {
    ...fixtureScene({
      scene: { id: "later" },
      brief: {
        cast: [{ id: "n", npcRef: null, label: "N", brief: { wants: "w", opensWith: "o", voice: { register: "r", samples: ["s"] } } }],
        beats: [{ id: "b", kind: "action", mandatory: true, delivery: "table", text: "t", choicePoint: { id: "c" } }]
      }
    }),
    key: "ep#later"
  };
  const results = runAutoChecks(later, fixtureCorpus(), { allScenes: [earlier, later], includeManual: true });
  for (const id of ["C4", "C9", "Q3", "Q4", "Q5", "Q6", "Q14"]) {
    assert.notEqual(results.find((r) => r.id === id)?.state, "n/a", `${id} must apply to a normal scene`);
  }
});

test("n/a is not a pass, not a failure and not a waiver", () => {
  const scene = fixtureScene({
    scene: {
      authoring: {
        status: "drafted",
        review: { checklistVersion: checklist.version, passes: {}, waived: [], notApplicable: [{ check: "M17", why: "nothing here is takeable" }] }
      }
    }
  });
  const result = runAutoChecks(scene, fixtureCorpus(), { only: "completeness" }).find((r) => r.id === "M17");
  assert.equal(result.state, "n/a");
  assert.equal(result.detail, "nothing here is takeable");
  const summary = summariseChecks([result]);
  assert.equal(summary.recommendedFail, 0);
  assert.equal(summary.recommendedPass, 0);
  assert.equal(summary.recommendedExempt, 0, "n/a and a notes exemption are different facts");
  assert.equal(summary.notApplicable, 1);
});

test("a per-scene n/a overrides even a check the scene would otherwise fail", () => {
  const scene = fixtureScene({
    scene: {
      challengeRefs: [],
      authoring: {
        status: "drafted",
        review: { checklistVersion: checklist.version, passes: {}, notApplicable: [{ check: "M8", why: "no checks at all by design" }] }
      }
    }
  });
  const m8 = runAutoChecks(scene, fixtureCorpus(), { only: "completeness" }).find((r) => r.id === "M8");
  assert.equal(m8.state, "n/a", "applicability is decided before the evaluator runs");
});

test("includeManual: manual checks appear as `manual`, never as a pass", () => {
  const withManual = runAutoChecks(fixtureScene(), fixtureCorpus(), { includeManual: true });
  const manual = withManual.filter((r) => r.state === "manual");
  assert.ok(manual.length > 15, "most of the checklist is read by hand and the report must list all of it");
  for (const r of manual) assert.equal(r.auto, null);

  const autoOnly = runAutoChecks(fixtureScene(), fixtureCorpus());
  assert.equal(autoOnly.some((r) => r.state === "manual"), false, "the console stays mechanical-only");
});

// ------------------------------------------------------------ the report ----

test("md(): renders the subset the review JSON is written in, and escapes everything else", () => {
  assert.equal(md("plain line"), "<p>plain line</p>");
  assert.match(md("**bold** and *italic* and `code`"), /<strong>bold<\/strong>.*<em>italic<\/em>.*<code>code<\/code>/);
  assert.match(md("### A heading"), /^<h3>A heading<\/h3>$/);
  assert.match(md(["- one", "- two"].join("\n")), /^<ul><li>one<\/li><li>two<\/li><\/ul>$/);
  assert.match(md("> quoted line"), /^<blockquote><p>quoted line<\/p><\/blockquote>$/);
  assert.equal(md(""), "");
  assert.equal(md(null), "");
});

test("md(): a quote's blank line starts a new paragraph inside the same blockquote", () => {
  const out = md(["> first", ">", "> second"].join("\n"));
  assert.equal((out.match(/<blockquote>/g) ?? []).length, 1);
  assert.equal((out.match(/<p>/g) ?? []).length, 2);
});

test("md(): HTML in the review content is escaped, never executed", () => {
  const out = md('a <script>alert("x")</script> tag & an ampersand');
  assert.equal(out.includes("<script>"), false);
  assert.match(out, /&lt;script&gt;/);
  assert.match(out, /&amp;/);
});

test("renderReport(): fills every template token, and shows a proposed verdict as proposed", () => {
  const bundle = fixtureScene();
  const review = {
    opened: "2026-09-22",
    asks: [{ id: "a", question: "A real question?", detail: "why", blocking: true, status: "open" }],
    passes: {
      comprehension: { proposed: "CLEAR", summary: "holds", body: "narration" },
      completeness: { proposed: "FIX", summary: "one gap", body: "detail", declined: [{ check: "M19", what: "no offer", why: "nobody to offer" }] },
      place: { proposed: "CLEAR", summary: "sited", body: "" },
      quality: {
        proposed: "CLEAR", summary: "one finding",
        findings: [{ title: "The read-aloud", severity: "applied", check: "Q1", body: "b", before: "old words", after: "new words" }],
        judgedFine: [{ check: "Q16", note: "resonance" }]
      }
    },
    applied: [{ title: "a change", why: "asked for", before: "x", after: "y" }]
  };
  const html = renderReport(bundle, fixtureCorpus(), [bundle], review);

  assert.equal(/\{\{[A-Z_]+\}\}/.test(html), false, "an unfilled token would ship a literal {{TOKEN}} to the page");
  assert.match(html, /1 open, 1 blocking the seal/);
  assert.match(html, /A real question\?/);
  assert.match(html, /proposed CLEAR/, "a verdict Ingram has not given must never read as recorded");
  assert.match(html, /old words/);
  assert.match(html, /new words/);
  assert.match(html, /class="diff"/);
  assert.match(html, /nobody to offer/);
  assert.match(html, /resonance/);
});

test("renderReport(): a recorded verdict outranks a proposed one", () => {
  const bundle = fixtureScene({
    scene: {
      authoring: {
        status: "drafted",
        review: { checklistVersion: checklist.version, passes: { place: { verdict: "CLEAR", date: "2026-09-22" } } }
      }
    }
  });
  const html = renderReport(bundle, fixtureCorpus(), [bundle], {
    passes: { place: { proposed: "CLEAR", summary: "s", body: "" } }
  });
  assert.match(html, /recorded 2026-09-22/);
});

test("renderReport(): with no asks, says so rather than leaving the block empty", () => {
  const bundle = fixtureScene();
  const html = renderReport(bundle, fixtureCorpus(), [bundle], { asks: [], passes: {} });
  assert.match(html, /all answered/);
  assert.match(html, /Nothing . every question on this scene is answered/);
});

test("reportPath()/reviewPath(): the build and the source sit side by side, named after the brief", () => {
  const norm = (p) => p.split(path.sep).join("/");
  assert.match(norm(reviewPath("episode-c1e1--the-road-in")), /\/reviews\/episode-c1e1--the-road-in\.json$/);
  assert.match(norm(reportPath("episode-c1e1--the-road-in")), /\/reviews\/episode-c1e1--the-road-in\.html$/);
});

// ------------------------------------------------------- travel legs (v5) ----
// Ingram, 2026-09-22: "I want to literally have a set of coordinates for the
// players to move between and that needs to happen between EVERY scene change."
// The Scene Runner's cut to the world map is already built; it fires on a
// locationRef CHANGE and does nothing at all when either side is null, so a
// missing coordinate is a SILENT hard cut rather than a visible failure.

test("cutFires(): mirrors core/travel-trigger.mjs exactly -- both ends present and different", () => {
  assert.equal(cutFires("a", "b"), true);
  assert.equal(cutFires("a", "a"), false, "same location is a cut within one place, not a journey");
  assert.equal(cutFires(null, "b"), false, "nowhere to leave from");
  assert.equal(cutFires("a", null), false, "nowhere to arrive at");
  assert.equal(cutFires(null, null), false);
});

test("metresBetween(): 1px = 1m on the campaign sheet, and null when either end is unplaced", () => {
  const a = { derived: { centroidPx: [100, 100] } };
  const b = { derived: { centroidPx: [400, 500] } };
  assert.equal(metresBetween(a, b), 500, "3-4-5 triangle: 300 and 400 make 500");
  assert.equal(metresBetween(a, undefined), null);
  assert.equal(metresBetween(a, {}), null);
});

test("positionAt(): prefers a declared position, falls back to the scene-set link", () => {
  const declared = { brief: { intro: { position: { locationRef: "here", state: "together" } } }, setEntry: { locationRef: "elsewhere" } };
  assert.deepEqual(positionAt(declared, "intro"), { locationRef: "here", state: "together", note: null, declared: true });

  const fallback = { brief: { intro: {} }, setEntry: { locationRef: "elsewhere" } };
  const out = positionAt(fallback, "intro");
  assert.equal(out.locationRef, "elsewhere", "the scene-set link is the same fact from another field");
  assert.equal(out.declared, false, "but it is not a declared position, and the report says so");
});

test("travelLegs(): one leg per scene change, each saying whether the map cut fires", () => {
  const loc = (id, x, y) => [id, { id, derived: { centroidPx: [x, y] } }];
  const corpus = {
    ...fixtureCorpus(),
    locations: Object.fromEntries([loc("gate", 0, 0), loc("hall", 300, 400)]),
    episodes: [{ id: "ep", title: "E", dayRange: { start: 1 }, scenes: [
      { order: 1, id: "one", title: "One", briefRef: "b1", authoring: { status: "drafted" } },
      { order: 2, id: "two", title: "Two", briefRef: "b2", authoring: { status: "drafted" } },
      { order: 3, id: "three", title: "Three", briefRef: "b3", authoring: { status: "drafted" } },
      { order: 4, id: "four", title: "Four", briefRef: "b4", authoring: { status: "drafted" } }
    ] }],
    sceneBriefs: {
      b1: { intro: { position: { locationRef: null, state: "scattered" } }, outro: { position: { locationRef: "gate", state: "converging" } } },
      b2: { intro: { position: { locationRef: "hall", state: "together" } }, outro: { position: { locationRef: "hall", state: "together" } } },
      b3: { intro: { position: { locationRef: "hall", state: "together" } }, outro: { position: { locationRef: null, state: "together" } } },
      // b4 DOES have a coordinate, so leg 3 isolates the "nowhere to leave
      // from" case rather than the easier "neither end has one".
      b4: { intro: { position: { locationRef: "gate", state: "together" } }, outro: { position: { locationRef: "gate", state: "together" } } }
    },
    sceneSetByBriefRef: {},
    sceneSet: { scenes: [] }
  };

  const legs = travelLegs(corpus);
  assert.equal(legs.length, 3, "four scenes make three changes");

  assert.equal(legs[0].cutFires, true, "gate -> hall is a real journey");
  assert.equal(legs[0].metres, 500);

  assert.equal(legs[1].cutFires, false);
  assert.equal(legs[1].legitimate, true, "hall -> hall is a cut within one place, correct and not a fault");
  assert.match(legs[1].reason, /same location/);

  assert.equal(legs[2].cutFires, false);
  assert.equal(legs[2].legitimate, false, "a missing coordinate is a silent hard cut and must count as broken");
  assert.match(legs[2].reason, /no location to leave from/);

  const summary = travelSummary(corpus);
  assert.equal(summary.firing, 1);
  assert.equal(summary.broken, 1);
  assert.equal(summary.sameLocation, 1);
});

test("travelLegs(): `scattered` is the one legitimate no-coordinate edge", () => {
  const corpus = {
    ...fixtureCorpus(),
    locations: { gate: { id: "gate", derived: { centroidPx: [0, 0] } } },
    episodes: [{ id: "ep", title: "E", dayRange: { start: 1 }, scenes: [
      { order: 1, id: "one", title: "One", briefRef: "b1", authoring: { status: "drafted" } },
      { order: 2, id: "two", title: "Two", briefRef: "b2", authoring: { status: "drafted" } }
    ] }],
    sceneBriefs: {
      b1: { intro: { position: { locationRef: null, state: "scattered" } }, outro: { position: { locationRef: null, state: "scattered" } } },
      b2: { intro: { position: { locationRef: "gate", state: "together" } }, outro: { position: { locationRef: "gate", state: "together" } } }
    },
    sceneSetByBriefRef: {},
    sceneSet: { scenes: [] }
  };
  const [leg] = travelLegs(corpus);
  assert.equal(leg.cutFires, false);
  assert.equal(leg.legitimate, true, "off-map by design is not a broken cut");
  assert.equal(travelSummary(corpus).broken, 0);
});
