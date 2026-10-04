// Tier 1 — core/runner-view.mjs, the Scene Runner's view logic (2026-09-24).
//
// Ingram: "Reconsider it carefully... it needs to be wider to get more
// contents on screen." The rebuilt runner shows every beat as one line and
// opens the beat the GM is running; it follows the GM when they run things
// out of order; it keeps a just-recorded beat open on its consequence; it
// opens the opening and the ending at their own moments; it names the
// episode's steps and the rooms for a button; and it recognises the result
// of a check it posted when a player rolls it. All of that is decided here,
// in plain Node, so it is pinned here.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  beatDetailOpen,
  checkResultFrom,
  episodeSteps,
  isTopicKey,
  nowBeatId,
  resultsByKey,
  roomLabel,
  rollTagFromOptions,
  runnerPhase,
  runnerRollOption,
  runnerWidthCss,
  sceneStartedAt,
  shouldAutoRecord,
  toggleDetail,
  widthFractionFrom,
  RUNNER_WIDTH_RANGE
} from "../module/blank-inheritance/scripts/core/runner-view.mjs";
import { beatsWithState, beatProgress } from "../module/blank-inheritance/scripts/core/scene-brief.mjs";

const beat = (id, state) => ({ id, state });

/* ---------------------------------------------------------------- */
/*  Where the GM is                                                  */
/* ---------------------------------------------------------------- */

test("with nothing done, the first live beat is the one being run", () => {
  const beats = [beat("a", "active"), beat("b", "active")];
  assert.equal(nowBeatId(beats), "a");
});

test("a beat that is not live -- done, a fork still waiting, a road not taken, an unopened trigger -- is never 'now'", () => {
  const beats = [beat("a", "done"), beat("b", "pending"), beat("c", "notTaken"), beat("d", "conditional"), beat("e", "active")];
  assert.equal(nowBeatId(beats), "e");
});

test("ticking a beat moves 'now' to the next live beat after it, like a teleprompter", () => {
  const beats = [beat("a", "done"), beat("b", "active"), beat("c", "done"), beat("d", "active")];
  assert.equal(nowBeatId(beats, { lastTickedId: "c" }), "d", "after the most recently ticked beat, not the first gap");
  assert.equal(nowBeatId(beats, { lastTickedId: "a" }), "b");
});

test("ticking the LAST live beat in the order wraps back to the first one still open", () => {
  const beats = [beat("a", "active"), beat("b", "done")];
  assert.equal(nowBeatId(beats, { lastTickedId: "b" }), "a");
});

test("the beat the GM acted on (posted its check, fired its trigger) wins while it is still live", () => {
  const beats = [beat("a", "active"), beat("b", "active"), beat("c", "active")];
  assert.equal(nowBeatId(beats, { focusId: "c", lastTickedId: "a" }), "c");
  const later = [beat("a", "active"), beat("b", "active"), beat("c", "done")];
  assert.equal(nowBeatId(later, { focusId: "c", lastTickedId: "c" }), "a", "once it is done, the focus no longer holds");
});

test("REGRESSION (found live, Intake Medicals): resolving a side beat DURING the beat being run does not move the marker off it", () => {
  // "one-at-a-time" was now; a player looked closely at Shucks, "the-hand"
  // (a GM-judged side check, later in the authored order) was rolled and
  // recorded -- and the marker jumped past one-at-a-time to "the-flag",
  // though one-at-a-time was still going on.
  const beats = [beat("the-queue", "done"), beat("one-at-a-time", "active"), beat("the-hand", "done"), beat("the-flag", "active")];
  assert.equal(nowBeatId(beats, { previousId: "one-at-a-time", lastTickedId: "the-hand" }), "one-at-a-time");
});

test("once the beat being run is itself finished, the marker moves on past it", () => {
  const beats = [beat("a", "done"), beat("b", "active"), beat("c", "active")];
  assert.equal(nowBeatId(beats, { previousId: "a", lastTickedId: "a" }), "b");
});

test("an explicit act on another beat still beats the previous marker", () => {
  const beats = [beat("a", "active"), beat("b", "active")];
  assert.equal(nowBeatId(beats, { focusId: "b", previousId: "a" }), "b");
});

test("nothing live means null -- the scene is ready to end, or waiting on a roll", () => {
  assert.equal(nowBeatId([beat("a", "done"), beat("b", "pending")]), null);
  assert.equal(nowBeatId([]), null);
});

test("works on real beat state from core/scene-brief.mjs, not just hand-built rows", () => {
  const brief = {
    beats: [
      { id: "roll", challengeRef: "c" },
      { id: "win", when: { beatRef: "roll", degrees: ["success", "criticalSuccess"] } },
      { id: "lose", when: { beatRef: "roll", degrees: ["failure", "criticalFailure"] } },
      { id: "after" }
    ]
  };
  const before = beatsWithState(brief, { ticked: {} });
  assert.equal(nowBeatId(before), "roll", "both sides of the fork are pending, so the roll is what is being run");
  const run = { ticked: { roll: { at: "2026-09-24T10:00:00Z", degree: "failure" } } };
  const after = beatsWithState(brief, run);
  assert.equal(nowBeatId(after, { lastTickedId: "roll" }), "lose", "the road taken, not the road not taken");
});

test("a beat's detail: the 'now' beat is open, everything else is one line", () => {
  assert.equal(beatDetailOpen("a", { nowId: "a" }), true);
  assert.equal(beatDetailOpen("b", { nowId: "a" }), false);
});

test("the GM's own press wins in both directions, even over 'now'", () => {
  assert.equal(beatDetailOpen("a", { nowId: "a", closed: ["a"] }), false, "a GM may fold the beat they are on");
  assert.equal(beatDetailOpen("b", { nowId: "a", opened: ["b"] }), true, "and open any other to read ahead");
  assert.equal(beatDetailOpen("b", { showAll: true, closed: ["b"] }), false, "a fold beats 'show everything' too");
});

test("'every beat in full' opens everything the GM has not folded", () => {
  assert.equal(beatDetailOpen("x", { showAll: true, done: true }), true);
});

test("a done beat does not open by itself -- except the one whose outcome was JUST recorded", () => {
  assert.equal(beatDetailOpen("a", { nowId: "a", done: true }), false);
  assert.equal(beatDetailOpen("a", { resolvedId: "a", done: true }), true, "the GM is about to say its consequence");
  assert.equal(beatDetailOpen("a", { resolvedId: "a", done: true, closed: ["a"] }), false, "unless they fold it");
});

test("toggleDetail flips one row and never mutates the lists it was given", () => {
  const opened = ["x"];
  const closed = [];
  const shut = toggleDetail("x", true, { opened, closed });
  assert.deepEqual(shut, { opened: [], closed: ["x"] });
  assert.deepEqual(opened, ["x"], "input untouched");
  assert.deepEqual(toggleDetail("x", false, shut), { opened: ["x"], closed: [] });
});

test("the phase: opening until something happens, ending once every required beat is done", () => {
  const brief = { beats: [{ id: "a", mandatory: true }, { id: "b" }] };
  const none = { ticked: {} };
  const some = { ticked: { b: { at: "t" } } };
  const all = { ticked: { a: { at: "t" } } };
  assert.equal(runnerPhase(beatProgress(brief, none), none), "opening");
  assert.equal(runnerPhase(beatProgress(brief, some), some), "running");
  assert.equal(runnerPhase(beatProgress(brief, all), all), "ending");
});

test("REGRESSION (found reading the handlers): a scene whose first act was a recorded degree still has a start time", () => {
  // startedAt was only ever stamped by a plain tick, so a scene opened with a
  // check -- recorded straight to a degree -- never started its clock.
  assert.equal(sceneStartedAt({ startedAt: "2026-09-24T09:00:00Z", ticked: {} }), "2026-09-24T09:00:00Z");
  assert.equal(
    sceneStartedAt({ ticked: { b: { at: "2026-09-24T10:05:00Z" }, a: { at: "2026-09-24T10:01:00Z", degree: "success" } } }),
    "2026-09-24T10:01:00Z",
    "the earliest thing recorded"
  );
  assert.equal(sceneStartedAt({ ticked: {} }), null);
  assert.equal(sceneStartedAt(null), null);
});

/* ---------------------------------------------------------------- */
/*  The episode and the rooms                                        */
/* ---------------------------------------------------------------- */

test("episode steps: in authored order, this one and the next named, closed ones marked", () => {
  const scenes = [
    { order: 2, title: "Intake Medicals", briefRef: "b2" },
    { order: 1, title: "The Road In", briefRef: "b1" },
    { order: 3, title: "Assembly", briefRef: "b3" },
    { order: 4, title: "School", briefRef: "b4" },
    { order: 5, title: "No brief" }
  ];
  const steps = episodeSteps(scenes, { currentBriefId: "b2", closedIds: ["b1"] });
  assert.deepEqual(steps.map((s) => s.briefRef), ["b1", "b2", "b3", "b4"], "sorted by order, scenes without a brief left out");
  assert.deepEqual(steps.map((s) => s.showTitle), [false, true, true, false]);
  assert.equal(steps[0].isClosed, true);
  assert.equal(steps[1].isCurrent, true);
  assert.equal(steps[2].isNext, true);
});

test("with no scene chosen, nothing is current or next and every step is still there to press", () => {
  const steps = episodeSteps([{ order: 1, briefRef: "a" }, { order: 2, briefRef: "b" }]);
  assert.equal(steps.length, 2);
  assert.ok(steps.every((s) => !s.isCurrent && !s.isNext));
});

test("a room is named for its button, not for the Scene Directory", () => {
  assert.equal(roomLabel("02. Intake Medicals", "Intake Medicals"), "Intake Medicals");
  assert.equal(roomLabel("02a. Intake Medicals — The Examination Room", "Intake Medicals"), "The Examination Room");
  assert.equal(roomLabel("12b. The Errand - Back Room", "The Errand"), "Back Room");
  assert.equal(roomLabel("Somewhere else entirely", "Intake Medicals"), "Somewhere else entirely");
  assert.equal(roomLabel("03. Kit Issue (Stores)", null), "Kit Issue (Stores)");
});

test("a room label never comes back empty, and a title full of regex characters is taken literally", () => {
  assert.equal(roomLabel("01. ", "x"), "01.");
  assert.equal(roomLabel("04. What? (A Scene) — Side", "What? (A Scene)"), "Side");
});

/* ---------------------------------------------------------------- */
/*  Rolls that come back                                             */
/* ---------------------------------------------------------------- */

test("the roll tag carries the brief AND the beat, so a result can never land on a same-named beat in another scene", () => {
  const tag = runnerRollOption("episode-c1e1--flood-tunnel", "the-fight");
  assert.equal(tag, "bi-runner:episode-c1e1--flood-tunnel:the-fight");
  assert.deepEqual(rollTagFromOptions(["check", tag, "skill:athletics"]), { briefId: "episode-c1e1--flood-tunnel", key: "the-fight" });
});

test("a coercible topic's key (which has colons of its own) survives the round trip", () => {
  const tag = runnerRollOption("episode-c1e1--intake-medicals", "shucks-mordant:coercible:0");
  assert.deepEqual(rollTagFromOptions([tag]), { briefId: "episode-c1e1--intake-medicals", key: "shucks-mordant:coercible:0" });
  assert.equal(isTopicKey("shucks-mordant:coercible:0"), true);
  assert.equal(isTopicKey("form-12b"), false);
});

test("an unsafe brief or key is refused before it can reach an enricher", () => {
  assert.throws(() => runnerRollOption("a:b", "k"), /unsafe brief id/);
  assert.throws(() => runnerRollOption("brief", "k|dc:1"), /unsafe key/);
  assert.throws(() => runnerRollOption("brief", "k]@UUID"), /unsafe key/);
  assert.throws(() => runnerRollOption("", "k"), /unsafe brief id/);
});

test("no tag, a malformed tag, or no options at all reads as 'not ours'", () => {
  assert.equal(rollTagFromOptions([]), null);
  assert.equal(rollTagFromOptions(["bi-runner:"]), null);
  assert.equal(rollTagFromOptions(["bi-runner:only-a-brief"]), null);
  assert.equal(rollTagFromOptions(null), null);
});

/** The shape sf2e writes: flags.sf2e.context, read 2026-09-24 from gamesystems/sf2e/sf2e.mjs's check roll. */
function sf2eFlags({ outcome = "success", options = ["bi-runner:brief:beat"], dc = 16, actor = "act1", isReroll = false } = {}) {
  return { sf2e: { context: { type: "skill-check", outcome, options, dc: { value: dc }, actor, isReroll } } };
}

test("a tagged, degree-of-success check reads back as a result for its brief and beat", () => {
  const result = checkResultFrom({ flags: sf2eFlags(), speakerAlias: "Aiko", messageId: "m1", timestamp: 100, total: 21 });
  assert.deepEqual(result, { briefId: "brief", key: "beat", degree: "success", name: "Aiko", actorId: "act1", dc: 16, total: 21, isReroll: false, messageId: "m1", at: 100 });
});

test("the pf2e flag namespace reads the same, for a world run on the parent system", () => {
  const flags = { pf2e: sf2eFlags().sf2e };
  assert.equal(checkResultFrom({ flags })?.key, "beat");
});

test("anything that is not a tagged degree-of-success check is ignored", () => {
  assert.equal(checkResultFrom({ flags: sf2eFlags({ options: ["check"] }) }), null, "untagged: somebody else's roll");
  assert.equal(checkResultFrom({ flags: sf2eFlags({ outcome: null }) }), null, "no DC, no degree");
  assert.equal(checkResultFrom({ flags: sf2eFlags({ outcome: "neutral" }) }), null, "four degrees, never five");
  assert.equal(checkResultFrom({ flags: {} }), null);
  assert.equal(checkResultFrom({}), null);
});

test("results are grouped by beat, oldest first", () => {
  const r = (key, at) => ({ key, at });
  const grouped = resultsByKey([r("a", 3), r("b", 1), r("a", 1), null, { at: 5 }]);
  assert.deepEqual(grouped.get("a").map((x) => x.at), [1, 3]);
  assert.equal(grouped.get("b").length, 1);
  assert.equal(grouped.size, 2);
});

test("a result records itself only into a gap -- never over the GM's own call", () => {
  const result = { degree: "success", actorId: "a1", isReroll: false };
  assert.equal(shouldAutoRecord(result, null), true, "nothing recorded yet");
  assert.equal(shouldAutoRecord(result, { degree: "failure" }), false, "the GM already recorded something");
  assert.equal(shouldAutoRecord(result, { choice: "x" }), false);
  assert.equal(shouldAutoRecord(null, null), false);
});

test("a hero-point reroll by the character whose roll was recorded replaces it; anyone else's does not", () => {
  const recorded = { degree: "failure", via: "roll", actorId: "a1" };
  assert.equal(shouldAutoRecord({ degree: "success", actorId: "a1", isReroll: true }, recorded), true);
  assert.equal(shouldAutoRecord({ degree: "success", actorId: "a2", isReroll: true }, recorded), false);
  assert.equal(shouldAutoRecord({ degree: "success", actorId: "a1", isReroll: true }, { degree: "failure" }), false, "a GM-recorded degree is never overwritten");
});

/* ---------------------------------------------------------------- */
/*  Width                                                            */
/* ---------------------------------------------------------------- */

test("a dragged width is kept as a share of the window, clamped to a readable column and a usable canvas", () => {
  assert.equal(runnerWidthCss(0.43), "clamp(400px, 43vw, calc(100vw - 880px))");
  assert.equal(runnerWidthCss(0.05), `clamp(400px, ${RUNNER_WIDTH_RANGE.min * 100}vw, calc(100vw - 880px))`);
  assert.equal(runnerWidthCss(0.99), `clamp(400px, ${RUNNER_WIDTH_RANGE.max * 100}vw, calc(100vw - 880px))`);
});

test("no stored width means 'use the stylesheet's default'", () => {
  for (const nothing of [0, null, undefined, NaN, -1, "wide"]) assert.equal(runnerWidthCss(nothing), null, String(nothing));
});

test("the pointer's position becomes that share, clamped the same way", () => {
  assert.equal(widthFractionFrom(1100, 2560), 1100 / 2560);
  assert.equal(widthFractionFrom(10, 2560), RUNNER_WIDTH_RANGE.min);
  assert.equal(widthFractionFrom(2500, 2560), RUNNER_WIDTH_RANGE.max);
  assert.equal(widthFractionFrom(100, 0), null);
});

/* ---------------------------------------------------------------- */
/*  2026-10-04 (D059): what a GM needs while listening               */
/* ---------------------------------------------------------------- */

import { conditionLabelShown, goalOpen, scenePosition, statDcs } from "../module/blank-inheritance/scripts/core/runner-view.mjs";

test("the goal box is full before the scene starts and one line once it runs; the GM's press wins", () => {
  assert.equal(goalOpen("opening"), true);
  assert.equal(goalOpen("running"), false);
  assert.equal(goalOpen("ending"), false);
  assert.equal(goalOpen("running", true), true, "opened by hand stays open");
  assert.equal(goalOpen("opening", false), false, "folded by hand stays folded");
});

test("a condition label is shown only when the beat's own line does not already say it", () => {
  assert.equal(conditionLabelShown("someone studies the water first", "If anyone studies the water before touching anything, offer the check."), false, "a line opening on If carries its own condition");
  assert.equal(conditionLabelShown("there's time", "If there's time, Nobu logs personal effects."), false);
  assert.equal(conditionLabelShown("the compactor is running", "The compactor is running, so say it out loud."), false, "a line containing the label says it");
  assert.equal(conditionLabelShown("someone asks Nobu for something extra", "Offer the check to whoever asks properly."), true);
  assert.equal(conditionLabelShown(null, "anything"), false);
  assert.equal(conditionLabelShown("x", 'If x <trig id="a"/>'), false, "a chip in the line does not hide its If");
});

test("a cast member's stopgap DCs are read out of their stat line, with the level", () => {
  const vetch = statDcs("Proposed: level 3, an officer, non-combat. Perception DC 19, Will DC 19, Deception DC 19. Striking him ends in a hearing, not a fight.");
  assert.equal(vetch.level, 3);
  assert.deepEqual(vetch.dcs, [{ label: "Perception", dc: 19 }, { label: "Will", dc: 19 }, { label: "Deception", dc: 19 }]);
  assert.deepEqual(statDcs(null), { level: null, dcs: [] });
  assert.deepEqual(statDcs("Perception DC 18, Perception DC 20").dcs.length, 1, "each DC once");
});

test("the header numbers the scene the way the running order's buttons do (Episode One counts from 0)", () => {
  const steps = episodeSteps(
    [
      { order: 0, title: "From Up Here", briefRef: "a" },
      { order: 1, title: "The Road In", briefRef: "b" },
      { order: 2, title: "Intake Medicals", briefRef: "c" },
      { order: 11, title: "Flood Tunnel", briefRef: "d" }
    ],
    { currentBriefId: "c" }
  );
  assert.deepEqual(scenePosition(steps), { n: 2, total: 11 }, "the button says 2, and so does the header");
  assert.equal(scenePosition(episodeSteps([{ order: 1, briefRef: "x" }], { currentBriefId: "nowhere" })), null);
});
