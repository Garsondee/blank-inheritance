// Tier 1 — the scene runner's arithmetic.
//
// The panel is a GM's script, read while improvising, and every failure here
// is silent at the table rather than loud:
//
//   a branch hidden before its roll lands   -> the GM cannot prep the fork
//   a branch still shown after it lands     -> the GM runs the road not taken
//   a tick lost when a gate is re-authored  -> the scene un-happens
//   a clock that infers its own sign        -> spending time ADDS time
//   a hidden modifier applied to the roll   -> the player sees the secret
//
// None of those throw. All of them are wrong in front of six people.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

import {
  BEAT_STATES,
  BEAT_KINDS,
  DELIVERY,
  DEGREES,
  beatProgress,
  beatState,
  artefactsWithState,
  beatsWithState,
  castFor,
  clockState,
  displayName,
  emptyRunState,
  hiddenAdjustment,
  normalizeBeat,
  postedDc,
  redactionChains,
  sceneRunnerState,
  spendsFor
} from "../module/blank-inheritance/scripts/core/scene-brief.mjs";

const BRIEF = {
  id: "head-height--noon-the-hall",
  title: "Noon — The Hall",
  cast: [
    { id: "kudo", label: "Kudo", role: "the Lawyer", arrival: "splash", brief: { wants: "An answer, on record" } },
    { id: "rika", label: "Doctor Rika", role: "the Sceptic", arrival: "quiet", walkOn: false, brief: {} }
  ],
  beats: [
    { id: "satoru-brief", text: "Satoru gives the Directorate line", mandatory: true },
    { id: "kudo-question", text: "Kudo asks what is wrong with his daughter", mandatory: true, npcRef: "kudo" },
    {
      id: "kudo-gives-name",
      text: "He gives them ten minutes, and her name",
      challengeRef: "engage-kudo",
      when: { beatRef: "engage-kudo-attempt", degrees: ["success", "criticalSuccess"] }
    },
    {
      id: "kudo-brushoff",
      text: "\"You're children in a uniform.\"",
      when: { beatRef: "engage-kudo-attempt", degrees: ["failure", "criticalFailure"] }
    },
    { id: "engage-kudo-attempt", kind: "check", text: "A PC tries to reach him", challengeRef: "engage-kudo" },
    {
      id: "rika-side-door",
      text: "She leaves by the side door",
      mandatory: false,
      delivery: "passive",
      when: { condition: "only if somebody is watching her rather than Kudo" }
    }
  ]
};

const WALLS = {
  id: "head-height-docket",
  pools: [{ id: "walls", name: "Walls owed", mode: "diminishing", start: 12, floor: 0, thresholds: [{ atValue: 4, effect: "Ihara would notice, if Ihara cared" }] }],
  spends: [
    { id: "map-the-tags", label: "Map the tag distribution", poolRef: "walls", delta: -2 },
    { id: "interview", label: "Interview a shopkeeper properly", poolRef: "walls", delta: -1 },
    { id: "chase-supplier", label: "Chase the paint supplier", poolRef: "walls", delta: -3 },
    { id: "help-arrives", label: "Somebody lends a hand", poolRef: "walls", delta: 2 }
  ]
};

const tickedWith = (id, degree = null) => ({ ...emptyRunState(), ticked: { [id]: degree ? { degree } : {} } });

test("an authored beat is sparse; the defaults are applied here, not in the template", () => {
  const beat = normalizeBeat({ id: "x", text: "something happens" });
  assert.equal(beat.kind, BEAT_KINDS.ACTION);
  assert.equal(beat.delivery, DELIVERY.TABLE);
  assert.equal(beat.mandatory, false, "a beat has to opt IN to being required");
});

test("mandatory is opt-in, so a missing flag can never silently block a scene from closing", () => {
  assert.equal(normalizeBeat({ id: "x", mandatory: "yes" }).mandatory, false, "only a real boolean true counts");
  assert.equal(normalizeBeat({ id: "x", mandatory: true }).mandatory, true);
});

test("an ungated beat is active from the start", () => {
  assert.equal(beatState({ id: "satoru-brief" }, emptyRunState()), BEAT_STATES.ACTIVE);
});

test("emptyRunState carries a topics bag, separate from ticked -- a coercible topic's recorded degree (scene-runner.mjs#onRecordTopicOutcome) must never share storage with beat-branch state", () => {
  const state = emptyRunState();
  assert.deepEqual(state.topics, {});
  assert.notEqual(state.topics, state.ticked, "topics must be its own object, not an alias of ticked");
});

test("BOTH sides of a fork are pending before the roll lands — this is the whole point", () => {
  // A boolean "visible" implementation cannot express this: it would have to
  // hide both branches until the check resolves, which removes the fork from
  // the GM's view at exactly the moment they need to have read it.
  const beats = beatsWithState(BRIEF, emptyRunState());
  const byId = Object.fromEntries(beats.map((b) => [b.id, b]));
  assert.equal(byId["kudo-gives-name"].state, BEAT_STATES.PENDING);
  assert.equal(byId["kudo-brushoff"].state, BEAT_STATES.PENDING);
  assert.notEqual(BEAT_STATES.PENDING, BEAT_STATES.NOT_TAKEN, "pending and not-taken must be distinguishable");
});

test("once the roll lands, one path opens and the other is marked not taken rather than deleted", () => {
  const beats = beatsWithState(BRIEF, tickedWith("engage-kudo-attempt", "success"));
  const byId = Object.fromEntries(beats.map((b) => [b.id, b]));
  assert.equal(byId["kudo-gives-name"].state, BEAT_STATES.ACTIVE);
  assert.equal(byId["kudo-brushoff"].state, BEAT_STATES.NOT_TAKEN, "what didn't happen is part of what happened");
});

test("a critical success satisfies a gate that lists it, and a failure does not", () => {
  const crit = beatsWithState(BRIEF, tickedWith("engage-kudo-attempt", "criticalSuccess"));
  assert.equal(crit.find((b) => b.id === "kudo-gives-name").state, BEAT_STATES.ACTIVE);

  const fail = beatsWithState(BRIEF, tickedWith("engage-kudo-attempt", "criticalFailure"));
  assert.equal(fail.find((b) => b.id === "kudo-gives-name").state, BEAT_STATES.NOT_TAKEN);
  assert.equal(fail.find((b) => b.id === "kudo-brushoff").state, BEAT_STATES.ACTIVE);
});

test("there are four degrees, not five", () => {
  // ideas/entries/dialogue-management-panel.json originally listed a fifth
  // "neutral" rung; SF2E has no such outcome. A plain Failure with no listed
  // effect is what reads as neutral in play.
  assert.equal(DEGREES.length, 4);
  assert.deepEqual([...DEGREES].sort(), ["criticalFailure", "criticalSuccess", "failure", "success"]);
});

test("a gate with no degrees just means 'once that has happened'", () => {
  const beat = { id: "after-it", when: { beatRef: "satoru-brief" } };
  assert.equal(beatState(beat, emptyRunState()), BEAT_STATES.PENDING);
  assert.equal(beatState(beat, tickedWith("satoru-brief")), BEAT_STATES.ACTIVE);
});

test("a GM-judged condition is SHOWN, not hidden — you cannot spot a trigger you were never told about", () => {
  const beats = beatsWithState(BRIEF, emptyRunState());
  const rika = beats.find((b) => b.id === "rika-side-door");
  assert.equal(rika.state, BEAT_STATES.CONDITIONAL);
  assert.notEqual(rika.state, BEAT_STATES.PENDING, "a condition is not a pending gate; the GM opens it by hand");
});

test("opening a conditional beat by hand makes it active", () => {
  const opened = { ...emptyRunState(), opened: ["rika-side-door"] };
  const rika = beatsWithState(BRIEF, opened).find((b) => b.id === "rika-side-door");
  assert.equal(rika.state, BEAT_STATES.ACTIVE);
});

test("a beat that actually happened stays done even if its gate would now say otherwise", () => {
  // The scene un-happening because somebody edited a `when` clause between
  // sessions is the worst available failure: it silently rewrites the record
  // of what the table did.
  const state = {
    ...emptyRunState(),
    ticked: { "engage-kudo-attempt": { degree: "failure" }, "kudo-gives-name": {} }
  };
  const beat = beatsWithState(BRIEF, state).find((b) => b.id === "kudo-gives-name");
  assert.equal(beat.state, BEAT_STATES.DONE, "done outranks every gate");
});

test("progress counts mandatory beats separately from everything else", () => {
  const progress = beatProgress(BRIEF, tickedWith("satoru-brief"));
  assert.equal(progress.mandatory, 2, "two beats are marked mandatory");
  assert.equal(progress.mandatoryDone, 1);
  assert.equal(progress.complete, false);
  assert.deepEqual(progress.outstanding, ["kudo-question"]);
});

test("optional colour left unticked never blocks a scene from being complete", () => {
  const state = { ...emptyRunState(), ticked: { "satoru-brief": {}, "kudo-question": {} } };
  const progress = beatProgress(BRIEF, state);
  assert.equal(progress.complete, true, "both mandatory beats are done");
  assert.ok(progress.done < progress.total, "and plenty of optional beats are not");
});

test("a mandatory beat on a path that was not taken does not hold the scene open forever", () => {
  const brief = {
    beats: [
      { id: "roll", kind: "check" },
      { id: "good-path", mandatory: true, when: { beatRef: "roll", degrees: ["success"] } },
      { id: "bad-path", mandatory: true, when: { beatRef: "roll", degrees: ["failure"] } }
    ]
  };
  const progress = beatProgress(brief, { ...tickedWith("roll", "failure"), ticked: { roll: { degree: "failure" }, "bad-path": {} } });
  assert.equal(progress.complete, true, "the success branch is unreachable and must not count as outstanding");
});

test("the clock starts where the pool says and falls as it is spent", () => {
  assert.equal(clockState(WALLS, emptyRunState()).current, 12);
  const state = { ...emptyRunState(), spent: ["map-the-tags", "chase-supplier"] };
  assert.equal(clockState(WALLS, state).current, 7, "12 - 2 - 3");
  assert.equal(clockState(WALLS, state).spent, 5, "reported as an amount spent, for the GM's readout");
});

test("the same spend can be taken more than once", () => {
  // Interviewing a second shopkeeper costs another wall. A Set would silently
  // make every repeat free.
  const state = { ...emptyRunState(), spent: ["interview", "interview", "interview"] };
  assert.equal(clockState(WALLS, state).current, 9);
});

test("a spend's sign is authored, never inferred from the pool's mode", () => {
  // A diminishing pool can still be given time back. Inferring "diminishing
  // means subtract" would make `help-arrives` unauthorable.
  const state = { ...emptyRunState(), spent: ["chase-supplier", "help-arrives"] };
  assert.equal(clockState(WALLS, state).current, 11, "12 - 3 + 2");
});

test("the clock clamps to its floor and reports being exhausted", () => {
  const state = { ...emptyRunState(), spent: ["chase-supplier", "chase-supplier", "chase-supplier", "chase-supplier", "chase-supplier"] };
  const clock = clockState(WALLS, state);
  assert.equal(clock.current, 0, "-15 against a start of 12, floored at 0");
  assert.equal(clock.exhausted, true);
});

test("a diminishing pool crosses a threshold on the way DOWN", () => {
  assert.deepEqual(clockState(WALLS, emptyRunState()).crossed, [], "nothing crossed at 12");
  const state = { ...emptyRunState(), spent: ["chase-supplier", "chase-supplier", "chase-supplier"] };
  const clock = clockState(WALLS, state);
  assert.equal(clock.current, 3);
  assert.equal(clock.crossed.length, 1, "3 is at or past the threshold at 4");
});

test("an accumulating pool crosses on the way up instead", () => {
  const rising = {
    pools: [{ id: "vp", name: "Victory Points", mode: "accumulating", start: 0, thresholds: [{ atValue: 3, effect: "they notice" }] }],
    spends: [{ id: "push", poolRef: "vp", delta: 1 }]
  };
  assert.equal(clockState(rising, { ...emptyRunState(), spent: ["push", "push"] }).crossed.length, 0);
  assert.equal(clockState(rising, { ...emptyRunState(), spent: ["push", "push", "push"] }).crossed.length, 1);
});

// A setup check resolved BEFORE this subsystem starts, seeding the pool's
// actual starting value -- Flood Tunnel's clear-the-jam beat shifting the
// Compactor Cycle's Encroachment, the first real use of startModifiers.
const SEEDED = {
  id: "compactor-fixture",
  pools: [{
    id: "encroachment", name: "Encroachment", mode: "accumulating", start: 0, floor: 0, ceiling: 5,
    startModifiers: [{ poolRef: "encroachment", beatRef: "clear-the-jam", failure: 1, criticalFailure: 1 }]
  }]
};

test("startModifiers: a beat's recorded failure shifts the pool's effective start", () => {
  const clock = clockState(SEEDED, tickedWith("clear-the-jam", "failure"));
  assert.equal(clock.start, 1, "0 authored + 1 from the failed clear-the-jam");
  assert.equal(clock.current, 1);
});

test("startModifiers: success (a degree with no authored modifier) contributes nothing", () => {
  const clock = clockState(SEEDED, tickedWith("clear-the-jam", "success"));
  assert.equal(clock.start, 0);
});

test("startModifiers: a beat that hasn't been ticked yet contributes nothing", () => {
  // The GM opens the subsystem before recording the setup check's outcome --
  // must read as "not seeded yet", not throw or silently assume a degree.
  const clock = clockState(SEEDED, emptyRunState());
  assert.equal(clock.start, 0);
});

test("startModifiers: criticalFailure carries its own modifier, same as failure here", () => {
  const clock = clockState(SEEDED, tickedWith("clear-the-jam", "criticalFailure"));
  assert.equal(clock.start, 1);
});

test("startModifiers stacks with spends against the same seeded start", () => {
  const withSpend = {
    ...SEEDED,
    spends: [{ id: "override", poolRef: "encroachment", delta: -1 }]
  };
  const state = { ...tickedWith("clear-the-jam", "failure"), spent: ["override"] };
  assert.equal(clockState(withSpend, state).current, 0, "1 seeded - 1 spent, floored at 0 either way");
});

test("the real Compactor Cycle subsystem and Flood Tunnel brief agree on the beat id", () => {
  // Not a fixture -- the actual authored files. Catches the beatRef and the
  // scene-brief's own beat id drifting apart from each other silently.
  const subsystem = readJson(new URL("c1e1-compactor-cycle.json", new URL("../data/subsystems/", import.meta.url)));
  const brief = realBrief("episode-c1e1--flood-tunnel");
  const pool = subsystem.pools.find((p) => p.id === "encroachment");
  const beatRef = pool.startModifiers[0].beatRef;
  assert.ok(brief.beats.some((b) => b.id === beatRef), `flood-tunnel has no beat "${beatRef}" for the subsystem to read`);
});

test("a scene with no clock says so rather than inventing one", () => {
  assert.equal(clockState({ pools: [] }, emptyRunState()), null);
  assert.equal(sceneRunnerState({ brief: BRIEF }).clock, null);
});

test("only spends belonging to the pool are offered", () => {
  const two = { pools: [{ id: "a" }, { id: "b" }], spends: [{ id: "x", poolRef: "a" }, { id: "y", poolRef: "b" }] };
  assert.deepEqual(spendsFor(two, "a").map((s) => s.id), ["x"]);
  assert.deepEqual(spendsFor(two).map((s) => s.id), ["x"], "no pool named falls back to the first");
});

test("a hidden modifier only touches the check it names", () => {
  const mods = [{ id: "lens", label: "The lens", appliesTo: ["lens-look"], value: 2 }];
  assert.equal(hiddenAdjustment(mods, { challengeRef: "lens-look" }), 2);
  assert.equal(hiddenAdjustment(mods, { challengeRef: "spot-the-tags" }), 0);
});

test("a location's own value wins over the flat one, including when it is zero", () => {
  // Almost everywhere is +0 to +2 and one square is +8. A `||` fallback would
  // silently promote every 0 to the flat default and destroy the pattern the
  // players are supposed to fail to spot.
  const mods = [{ id: "lens", appliesTo: ["lens-look"], value: 5, byLocation: { "cannery-row": 3, "the-hall": 0 } }];
  assert.equal(hiddenAdjustment(mods, { challengeRef: "lens-look", locationKey: "cannery-row" }), 3);
  assert.equal(hiddenAdjustment(mods, { challengeRef: "lens-look", locationKey: "the-hall" }), 0, "an authored zero is not a missing value");
  assert.equal(hiddenAdjustment(mods, { challengeRef: "lens-look", locationKey: "nowhere" }), 5, "unlisted falls back to the flat value");
});

test("a bonus to the character is spent on the DC, because we never touch their sheet", () => {
  // +3 to the roller and a DC 3 lower are the same arithmetic; only one of
  // them is ours to do (Law 18 — never recompute what sf2e computes).
  assert.equal(postedDc(20, 3), 17);
  assert.equal(postedDc(20, 0), 20);
  assert.equal(postedDc(18, -2), 20, "a penalty raises the posted DC");
  assert.equal(postedDc(null, 3), null, "a challenge with no integer DC posts nothing");
});

test("a beat resolves to its cast member, and a nameless NPC falls back honestly", () => {
  assert.equal(castFor(BRIEF, "kudo").role, "the Lawyer");
  assert.equal(castFor(BRIEF, "nobody"), null);
  assert.equal(castFor(BRIEF, null), null);
  // Three real NPCs carry `"name": null` behind a naming placeholder. The
  // brief must never restate a name the naming system owns.
  assert.equal(displayName({ id: "commander", role: "The Commander" }), "The Commander");
  assert.equal(displayName({ id: "commander" }), "commander");
});

// ---------------------------------------------------------------------------
// The real authored session, run through the real code.
//
// Everything above this line is fixtures agreeing with themselves. This is the
// only part that catches the schema and the renderer drifting apart — a field
// renamed in one and not the other passes every unit test and produces a blank
// panel at the table.
// ---------------------------------------------------------------------------

const BRIEF_DIR = new URL("../data/scene-briefs/", import.meta.url);
const readJson = (url) => JSON.parse(readFileSync(url, "utf8"));
const realBrief = (name) => readJson(new URL(`${name}.json`, BRIEF_DIR));

test("every authored Head Height brief assembles without throwing", () => {
  const names = readdirSync(BRIEF_DIR).filter((f) => f.endsWith(".json"));
  assert.ok(names.length >= 4, "the drill session authored four scenes");
  for (const name of names) {
    const brief = readJson(new URL(name, BRIEF_DIR));
    const state = sceneRunnerState({ brief, runState: emptyRunState() });
    assert.ok(state, `${name} produced no state`);
    assert.ok(state.title, `${name} has no title to render`);
    for (const beat of state.beats) {
      assert.ok(beat.id, `${name} has a beat with no id — tick state would have nothing to key on`);
      assert.ok(Object.values(BEAT_STATES).includes(beat.state), `${name}/${beat.id} resolved to a state the panel cannot render`);
    }
  }
});

test("every beat's npcRef resolves to a real cast member in its own brief", () => {
  // A dangling npcRef renders a beat with no brief beside it — silently, and
  // exactly when the GM reaches for the thing they needed.
  for (const name of readdirSync(BRIEF_DIR).filter((f) => f.endsWith(".json"))) {
    const brief = readJson(new URL(name, BRIEF_DIR));
    for (const beat of brief.beats ?? []) {
      if (!beat.npcRef) continue;
      assert.ok(castFor(brief, beat.npcRef), `${name}/${beat.id} points at cast member "${beat.npcRef}", which that brief does not define`);
    }
  }
});

test("every beat's `when.beatRef` and `after` point at a beat that exists", () => {
  // A gate on a beat id that does not exist is permanently pending: the beat
  // never appears, and nothing anywhere says why.
  for (const name of readdirSync(BRIEF_DIR).filter((f) => f.endsWith(".json"))) {
    const brief = readJson(new URL(name, BRIEF_DIR));
    const ids = new Set((brief.beats ?? []).map((b) => b.id));
    for (const beat of brief.beats ?? []) {
      if (beat.after) assert.ok(ids.has(beat.after), `${name}/${beat.id} is ordered after "${beat.after}", which does not exist`);
      const gate = beat.when?.beatRef;
      if (gate) assert.ok(ids.has(gate), `${name}/${beat.id} is gated on "${gate}", which does not exist`);
    }
  }
});

test("every handoutRef resolves, so a reveal control is never wired to nothing", () => {
  for (const name of readdirSync(BRIEF_DIR).filter((f) => f.endsWith(".json"))) {
    const brief = readJson(new URL(name, BRIEF_DIR));
    const ids = new Set((brief.handouts ?? []).map((h) => h.id));
    for (const beat of brief.beats ?? []) {
      if (beat.handoutRef) assert.ok(ids.has(beat.handoutRef), `${name}/${beat.id} reveals "${beat.handoutRef}", which that brief does not define`);
    }
  }
});

// Four tests were removed here on 2026-09-13: the morning docket's clock, the
// hall's authored fork, the lens's per-location hidden modifier, and the drift
// guard between the two copies of that lens table. All four asserted against
// the Session Five "Head Height" scene briefs, which were deleted along with
// every other drafted beat beyond Session 0/1. The engine behaviour each one
// exercised is still covered above by the inline-fixture tests -- clocks and
// thresholds, fork resolution, and hiddenAdjustment's per-location precedence.
// What was lost with them is real-data coverage, and it comes back the moment
// there is real data again to point at.

test("the flag is solo, and nothing else in Intake Medicals is", () => {
  // Repointed 2026-09-13 from the deleted Head Height morning brief to Session
  // One, which carries the only solo beat left in the repo -- and a much more
  // load-bearing one. Each kid is told privately that their blood screen came
  // back irregular; the whole session turns on them working out afterwards
  // that it happened to all six. If this beat ever becomes `table`, six people
  // read at once what each of them was supposed to hear alone, and the scene's
  // own climax is spent before it starts.
  const brief = realBrief("episode-c1e1--intake-medicals");
  const solo = brief.beats.filter((b) => b.delivery === DELIVERY.SOLO);
  assert.deepEqual(solo.map((b) => b.id), ["the-flag"]);
});

test("an artefact is not held until it is granted, and granting is one-way", () => {
  const brief = { artefacts: [{ id: "form", title: "Form 12-B" }, { id: "photo", title: "A photograph" }] };
  const fresh = artefactsWithState(brief, emptyRunState());
  assert.deepEqual(fresh.map((a) => a.granted), [false, false]);

  const held = artefactsWithState(brief, { ...emptyRunState(), granted: ["form"] });
  assert.deepEqual(held.map((a) => a.granted), [true, false]);

  // There is deliberately no ungrant anywhere in this module. Un-showing
  // something six people have already read is not a thing software can do.
  assert.equal(typeof globalThis.ungrantArtefact, "undefined");
});

test("artefacts default to clearance 0 rather than undefined", () => {
  // The redaction chain sorts on clearance; an undefined would sort
  // unpredictably against real numbers and scramble a document's versions.
  const [a] = artefactsWithState({ artefacts: [{ id: "x", title: "X" }] }, emptyRunState());
  assert.equal(a.clearance, 0);
});

test("artefacts sharing a documentRef form one chain, ordered low clearance first", () => {
  const brief = {
    artefacts: [
      { id: "memo-c3", documentRef: "memo", clearance: 3, title: "Memo (unredacted)" },
      { id: "memo-c0", documentRef: "memo", clearance: 0, title: "Memo (public)" },
      { id: "photo", title: "A photograph" }
    ]
  };
  const chains = redactionChains(brief);
  assert.equal(chains.size, 2, "the two memo versions are one document, the photo is its own");
  assert.deepEqual(chains.get("memo").map((a) => a.clearance), [0, 3], "lowest clearance first");
  assert.deepEqual(chains.get("photo").map((a) => a.id), ["photo"], "an artefact with no documentRef chains alone");
});

test("the real Act 1 Scene 1 carries an intro, an outro and an earnable artefact", () => {
  const brief = readJson(new URL("episode-c1e1--intake-medicals.json", BRIEF_DIR));
  const state = sceneRunnerState({ brief, runState: emptyRunState() });

  assert.ok(state.goal, "the goal box has to have something in it");
  // The opening can be a read-aloud rather than a separate "first thing" line (2026-10-04, the Runner pass: a first-thing
  // fragment that only repeated the read-aloud's opening image was cut, as The Road In's was in the house-style rewrite).
  assert.ok(state.intro.where && (state.intro.firstThing || state.intro.readAloud), "you cannot open a scene you have not been told the shape of");
  assert.ok(state.outro.endsWhen, "a scene that does not say how it ends will sag past its own finish");
  assert.ok(state.outro.tracks.length, "the outro is the only hook back up to the strategy layer");

  // Every artefact the outro promises must actually exist in the brief.
  const ids = new Set(state.artefacts.map((a) => a.id));
  for (const ref of brief.outro.artefactRefs ?? []) {
    assert.ok(ids.has(ref), `the outro hands over "${ref}", which this brief does not define`);
  }
  assert.equal(state.artefacts[0].granted, false, "nothing is held before it is earned");
});

test("The Road In precedes Intake Medicals, and Medicals no longer claims to be the campaign's first scene", () => {
  // Regression guard for a real bug: adding a scene before an existing one
  // left the existing one's own carriesIn note asserting something now false.
  const episode = readJson(new URL("../data/episodes/episode-c1e1-mothers-maiden-name.json", import.meta.url));
  const byId = Object.fromEntries(episode.scenes.map((s) => [s.id, s]));
  assert.ok(byId["the-road-in"].order < byId["intake-medicals"].order, "The Road In must come first");

  const medicals = realBrief("episode-c1e1--intake-medicals");
  const carriesInText = JSON.stringify(medicals.intro.carriesIn);
  assert.doesNotMatch(carriesInText, /campaign's first scene/i, "this claim is false now that The Road In exists");
});

test("The Road In does not stage a shared arrival -- the group forms at the medical, not here", () => {
  // Ingram, 2026-09-09: "The medical waiting room IS the first time that
  // this group of people is a group." Confirmed by absence: no beat here
  // should describe the six of them noticing or meeting each other.
  const brief = realBrief("episode-c1e1--the-road-in");
  const text = JSON.stringify(brief.beats).toLowerCase();
  assert.doesNotMatch(text, /notice each other|see (the |)five other|same queue as (the|each)/, "a shared-arrival beat would spend the group-forming moment early");
});

test("an insight check costs nothing mechanical on any outcome, in the real authored data", () => {
  // The rule from design/encyclopaedia-checks.md, checked against both real
  // instances rather than trusted from the doc alone.
  const files = ["c1e1-the-medical", "c1e1-the-road-in"];
  for (const file of files) {
    const challenge = readJson(new URL(`../data/challenges/${file}.json`, import.meta.url));
    for (const check of challenge.checks.filter((c) => c.insight)) {
      const outcomes = Object.values(check.outcomes ?? {}).join(" ").toLowerCase();
      assert.doesNotMatch(outcomes, /\blose\b|\blost\b|\bspend\b|\bspent\b|cost them|\bslice\b|\bstanding\b/, `${file}/${check.id} is tagged insight but its outcome text reads like a real cost`);
    }
  }
});

test("the assembled state carries everything the panel renders, and nothing it does not", () => {
  const state = sceneRunnerState({ brief: BRIEF, subsystem: WALLS, runState: tickedWith("satoru-brief") });
  assert.equal(state.title, "Noon — The Hall");
  assert.equal(state.beats.length, BRIEF.beats.length);
  assert.equal(state.cast[0].displayName, "Kudo");
  assert.equal(state.clock.current, 12);
  assert.equal(state.progress.mandatoryDone, 1);
  assert.equal(sceneRunnerState({ brief: null }), null, "no brief is a real state, not a crash");
});

/* ---------------------------------------------------------------- */
/*  The GM's own hand on a clock (2026-09-24)                        */
/* ---------------------------------------------------------------- */

const COMPACTOR = {
  pools: [{
    id: "encroachment", name: "Encroachment", mode: "accumulating", start: 0, floor: 0, ceiling: 5,
    thresholds: [{ atValue: 1, effect: "centre grinds" }, { atValue: 3, effect: "half the floor" }, { atValue: 5, effect: "full compaction" }]
  }],
  spends: []
};

test("a rising clock reads against its CEILING, not its start (regression: Flood Tunnel read '0 of 0')", () => {
  const clock = clockState(COMPACTOR, emptyRunState());
  assert.equal(clock.current, 0);
  assert.equal(clock.limit, 5);
  assert.equal(clockState(WALLS, emptyRunState()).limit, 12, "a falling clock still reads against where it started");
});

test("a clock with no authored spends can still be moved by the GM's own hand, one step at a time", () => {
  const up2 = clockState(COMPACTOR, { ...emptyRunState(), adjust: { encroachment: 2 } });
  assert.equal(up2.current, 2);
  assert.equal(up2.adjusted, 2);
  const withSpends = clockState(WALLS, { ...emptyRunState(), spent: ["chase-supplier"], adjust: { [WALLS.pools[0].id]: -1 } });
  assert.equal(withSpends.current, 12 - 3 - 1, "a nudge stacks with authored spends");
});

test("a nudge is clamped to the pool's own floor and ceiling, and says which way it can still move", () => {
  const top = clockState(COMPACTOR, { ...emptyRunState(), adjust: { encroachment: 99 } });
  assert.equal(top.current, 5);
  assert.equal(top.canRaise, false);
  assert.equal(top.canLower, true);
  assert.equal(top.exhausted, true, "a rising clock is spent at its ceiling");
  const bottom = clockState(COMPACTOR, emptyRunState());
  assert.equal(bottom.canLower, false);
  assert.equal(bottom.exhausted, false);
});

test("the clock names the threshold the table is under now and the next one coming (Law 19)", () => {
  const at2 = clockState(COMPACTOR, { ...emptyRunState(), adjust: { encroachment: 2 } });
  assert.equal(at2.latest.effect, "centre grinds");
  assert.equal(at2.next.atValue, 3);
  const at0 = clockState(COMPACTOR, emptyRunState());
  assert.equal(at0.latest, null);
  assert.equal(at0.next.atValue, 1);
  const falling = clockState(WALLS, { ...emptyRunState(), spent: ["chase-supplier", "chase-supplier", "chase-supplier"] });
  assert.ok(falling.latest, "a falling clock's latest is the lowest threshold passed");
});

test("a run stored before nudges existed (no `adjust`) reads exactly as it did", () => {
  const legacy = { ticked: {}, spent: ["chase-supplier"], opened: [], granted: [] };
  assert.equal(clockState(WALLS, legacy).current, 9);
  assert.deepEqual(emptyRunState().adjust, {});
});

// 2026-09-24 (Ingram): a Scene 0 GM speech before The Road In, and The Road
// In rebuilt around each player's own opening -- look, first shot, a small
// problem on the way in, the skill they used, a roll against a normal DC, and
// a few sentences of how it went, told by the player.
// 2026-09-27, after Ingram's full read (canon/decisions/D048.md): Scene 0 is the one scene with no skill rolls and no
// questions, and it builds mystery: the four founders are not named, and the prophecy, where the rift stopped and
// Cicada all come later. The Recall Knowledge answers the first re-read had added are gone.
test("From Up Here is Scene 0: first in the episode, one speech with no cast, no rolls and no questions", () => {
  const episode = readJson(new URL("../data/episodes/episode-c1e1-mothers-maiden-name.json", import.meta.url));
  const sorted = [...episode.scenes].sort((a, b) => a.order - b.order);
  assert.equal(sorted[0].id, "from-up-here");
  assert.equal(sorted[1].id, "the-road-in");
  assert.deepEqual(sorted[0].challengeRefs, []);
  const brief = realBrief("episode-c1e1--from-up-here");
  assert.deepEqual(brief.cast, []);
  assert.ok(brief.beats.length >= 3, "the speech is at least three beats");
  assert.ok(brief.beats.every((b) => b.mandatory && (b.kind ?? "action") === "action" && !b.challengeRef && !b.choicePoint && !b.when), "every beat is part of the speech: no rolls, no questions, nothing optional");
  assert.ok(brief.beats.every((b) => b.readAloud), "every beat of the speech is written out");
  assert.ok(!existsSync(new URL("../data/challenges/c1e1-from-up-here.json", import.meta.url)), "Scene 0 has no challenge");
});

test("From Up Here keeps to the player-facing rules: common knowledge only, nothing GM-only, the four not yet named", () => {
  const spoken = realBrief("episode-c1e1--from-up-here").beats.map((b) => b.readAloud).join("\n");
  for (const name of ["Kurose", "Minkai", "Kortos", "Absalom", "Golarion"]) {
    assert.ok(spoken.includes(name), `the speech should name ${name}`);
  }
  // Held back for later in play (D048): the founders' names, where the rift stopped, the prophecy, Cicada.
  assert.doesNotMatch(spoken, /Hyuck|Rupiah|Anabala|Shucks|Mordant|Pharasma|prophec|the gods|Cicada/i);
  // GM-only material that must never be read to the table (LEDGER #26-#28).
  assert.doesNotMatch(spoken, /Watcher|Observer|hull|starship|Envoy|Manako|mitflit|Gen(eration)? ?2|fumble|dropped|caught/i);
  // Gen 1 Frames are never graceful (Mystery Ledger #11).
  assert.doesNotMatch(spoken, /gracefully|carefully|delicately/i);
});

test("The Road In asks each player for their opening, then rolls their small problem on any skill against DC 15", () => {
  const brief = realBrief("episode-c1e1--the-road-in");
  const ids = brief.beats.map((b) => b.id);
  assert.ok(ids.indexOf("your-opening") > ids.indexOf("the-letter"));
  assert.equal(ids.indexOf("the-small-problem"), ids.indexOf("your-opening") + 1, "the roll follows the questions for the same player");
  assert.ok(!ids.includes("a-flourish") && !ids.includes("six-roads-in"), "the old optional flourish is replaced, not kept alongside");
  for (const id of ["your-opening", "the-small-problem"]) {
    const beat = brief.beats.find((b) => b.id === id);
    assert.equal(beat.mandatory, true);
    assert.equal(beat.delivery, "each");
  }
  const challenge = readJson(new URL("../data/challenges/c1e1-the-road-in.json", import.meta.url));
  const check = challenge.checks.find((c) => c.id === "the-small-problem");
  assert.equal(check.anySkill, true);
  assert.deepEqual(check.skillOptions, []);
  assert.equal(check.dc.value, 15, "a normal level-1 DC");
  const outcomes = Object.values(check.outcomes).join(" ").toLowerCase();
  assert.doesNotMatch(outcomes, /\blose\b|\bspend\b|cost them|\bslice\b/, "a bad roll here is a story, never a cost");
});
