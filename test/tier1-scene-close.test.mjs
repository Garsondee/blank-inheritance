// Tier 1 — pure logic for the scene-close dialogue (core/scene-close.mjs).
// Milliseconds, no Foundry, no network.
//
// Rewritten 2026-09-22 with the dialogue itself. Read that file's header for
// the live failure behind the rebuild (a close dialogue too tall to reach its
// own accept button, mid-session) and for what was cut: the cost picker, the
// 0-10 rating grid, the two mocked counters, and — the big one — the rule
// that a complete scene was FORCED to fill two dropdowns before it could
// close at all. The tests below pin the replacement invariant, which is the
// one that matters: ONE PRESS CLOSES A SCENE, and nothing optional can ever
// stand in the way of it.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ENDING_OPTIONS,
  VERDICT_OPTIONS,
  verdictFor,
  canCloseScene,
  summarizeClosure,
  openSetups,
  sceneHighlights,
  reviewAgenda
} from "../module/blank-inheritance/scripts/core/scene-close.mjs";

test("every option list: every id is unique, every entry has both a plain label and a real localisation key", () => {
  for (const options of [ENDING_OPTIONS, VERDICT_OPTIONS]) {
    const ids = options.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, "ids must be unique within a list");
    for (const o of options) {
      assert.equal(typeof o.label, "string");
      assert.ok(o.label.length > 0);
      assert.match(o.labelKey, /^BLANKINHERITANCE\.SceneClose\./);
    }
  }
});

test("VERDICT_OPTIONS is exactly Ingram's own three, in her own order -- a fourth would reintroduce the barrage this rebuild removed", () => {
  assert.deepEqual(VERDICT_OPTIONS.map((v) => v.id), ["panic", "note", "positive"]);
  for (const v of VERDICT_OPTIONS) {
    assert.equal(typeof v.logPhrase, "string");
    assert.ok(v.logPhrase.length > 0, "every verdict needs plain-English text for the session log");
    assert.match(v.subLabelKey, /^BLANKINHERITANCE\.SceneClose\.Verdict\./, "each button needs its own one-line explanation key");
    assert.equal(typeof v.flagsReview, "boolean");
    assert.equal(typeof v.advances, "boolean");
  }
});

test("the three verdicts differ in exactly the two ways Ingram described them: Panic flags and stays put, Note flags and moves on, Positive does neither", () => {
  assert.deepEqual(verdictFor("panic"), { ...verdictFor("panic"), flagsReview: true, advances: false });
  assert.deepEqual(verdictFor("note"), { ...verdictFor("note"), flagsReview: true, advances: true });
  assert.deepEqual(verdictFor("positive"), { ...verdictFor("positive"), flagsReview: false, advances: true });
});

test("verdictFor: an unrecognised id resolves to null rather than a plausible-looking default", () => {
  assert.equal(verdictFor("made-up"), null);
  assert.equal(verdictFor(null), null);
  assert.equal(verdictFor(undefined), null);
  assert.equal(verdictFor(""), null);
});

test("canCloseScene: a verdict is the ONLY requirement -- this is the reversal of §10.3a's forced dropdowns, and the point of the rebuild", () => {
  assert.deepEqual(canCloseScene({ verdict: "positive" }), { ok: true, reason: null });
  assert.deepEqual(canCloseScene({ verdict: "note" }), { ok: true, reason: null });
  assert.deepEqual(canCloseScene({ verdict: "panic" }), { ok: true, reason: null });
});

test("canCloseScene: no verdict is the one illegal state, and an unrecognised one is treated as none rather than silently accepted", () => {
  assert.equal(canCloseScene({}).reason, "verdict-required");
  assert.equal(canCloseScene({ verdict: null }).reason, "verdict-required");
  assert.equal(canCloseScene({ verdict: "made-up" }).reason, "verdict-required");
  assert.equal(canCloseScene().reason, "verdict-required", "called with nothing at all must refuse, not throw");
});

test("canCloseScene: the optional fields can NEVER make a closure illegal -- a GM must always be able to get out of this dialogue", () => {
  for (const ending of [null, "resolved", "made-up-ending"]) {
    for (const carriesForward of [true, false]) {
      assert.equal(
        canCloseScene({ verdict: "positive", ending, carriesForward }).ok,
        true,
        `ending=${ending} carriesForward=${carriesForward} must still close`
      );
    }
  }
});

test("summarizeClosure: one press and nothing else is a complete, valid closure", () => {
  const result = summarizeClosure({ verdict: "positive" });
  assert.equal(result.ok, true);
  assert.equal(result.verdict, "positive");
  assert.equal(result.complete, true, "finished is the default -- carriesForward has to be asked for");
  assert.equal(result.advances, true);
  assert.equal(result.flaggedForReview, false);
  assert.equal(result.review, null);
  assert.deepEqual(result.delta, { reviewFlags: 0 });
  assert.match(result.logLine, /^Scene closed -- went well\.$/);
});

test("summarizeClosure: no verdict produces no log line at all, rather than a record of something that did not happen", () => {
  const result = summarizeClosure({ ending: "resolved", notes: "lots of detail" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "verdict-required");
  assert.equal(result.logLine, undefined);
});

test("summarizeClosure: Note flags the scene for review and ticks the one real counter", () => {
  const result = summarizeClosure({ verdict: "note" });
  assert.equal(result.flaggedForReview, true);
  assert.deepEqual(result.delta, { reviewFlags: 1 });
  assert.match(result.logLine, /flagged for review/);
  assert.equal(result.review.verdict, "note");
});

test("summarizeClosure: PANIC flags for review but never advances the table -- a GM in trouble must not be teleported to the next location", () => {
  const result = summarizeClosure({ verdict: "panic" });
  assert.equal(result.ok, true);
  assert.equal(result.complete, true, "a panic still closes the record");
  assert.equal(result.advances, false, "a panic must leave the table exactly where it is");
  assert.equal(result.flaggedForReview, true);
  assert.match(result.logLine, /PANIC/);
});

test("summarizeClosure: an unfinished scene never advances either, whichever verdict it closed with", () => {
  for (const verdict of ["panic", "note", "positive"]) {
    const result = summarizeClosure({ verdict, carriesForward: true });
    assert.equal(result.complete, false);
    assert.equal(result.advances, false, `${verdict} + carriesForward must not advance the table`);
    assert.match(result.logLine, /^Scene left open, carries forward --/);
  }
});

test("summarizeClosure: the log line names the verdict, then the ending if one was picked, then the GM's own notes -- in that order, in plain English", () => {
  const result = summarizeClosure({
    verdict: "note",
    ending: "resolved-with-complications",
    notes: "Taka never got his moment."
  });
  assert.equal(
    result.logLine,
    "Scene closed -- flagged for review. Ended: Resolved with complications. Taka never got his moment."
  );
  assert.doesNotMatch(result.logLine, /BLANKINHERITANCE/, "must never leak a raw i18n key into the log");
});

test("summarizeClosure: an unpicked or unrecognised ending is simply absent from the log line, never guessed at as \"Resolved\"", () => {
  assert.doesNotMatch(summarizeClosure({ verdict: "positive" }).logLine, /Ended:/);
  assert.doesNotMatch(summarizeClosure({ verdict: "positive", ending: "made-up" }).logLine, /Ended:/);
  assert.doesNotMatch(summarizeClosure({ verdict: "positive", ending: null }).logLine, /Ended:/);
});

test("summarizeClosure: whitespace-only notes add nothing -- no trailing space, no empty sentence", () => {
  assert.equal(summarizeClosure({ verdict: "positive", notes: "   \n  " }).logLine, "Scene closed -- went well.");
  assert.equal(summarizeClosure({ verdict: "positive", notes: null }).logLine, "Scene closed -- went well.");
  assert.equal(summarizeClosure({ verdict: "positive", notes: 42 }).logLine, "Scene closed -- went well.", "a non-string must not be concatenated in raw");
});

// ---- The review agenda: where the deleted 0-10 grid's content went -------

test("reviewAgenda: the scene's own authored prompts become the questions a later review asks, text intact", () => {
  const prompts = [
    { id: "montage-rhythm", text: "The six-spotlight montage keeping its own promised pace." },
    { id: "the-violet-mark", text: "The violet mark at head height being noticed.", scaleNote: "0 = nobody registered it." }
  ];
  assert.deepEqual(reviewAgenda(prompts), [
    { id: "montage-rhythm", text: "The six-spotlight montage keeping its own promised pace." },
    { id: "the-violet-mark", text: "The violet mark at head height being noticed." }
  ]);
});

test("reviewAgenda: nothing is rated and nothing is scored -- an agenda item carries only its id and its question", () => {
  const [item] = reviewAgenda([{ id: "a", text: "A", scaleNote: "0 = x", score: 9 }]);
  assert.deepEqual(Object.keys(item).sort(), ["id", "text"]);
});

test("reviewAgenda: a malformed prompt is dropped rather than carried into the review as a blank question", () => {
  const agenda = reviewAgenda([
    { id: "good", text: "  A real question.  " },
    { id: "blank", text: "   " },
    { id: "", text: "No id" },
    { text: "No id at all" },
    { id: "nope" },
    null
  ]);
  assert.deepEqual(agenda, [{ id: "good", text: "A real question." }]);
});

test("reviewAgenda: tolerates no prompts, or a non-array, without throwing", () => {
  assert.deepEqual(reviewAgenda([]), []);
  assert.deepEqual(reviewAgenda(), []);
  assert.deepEqual(reviewAgenda(null), []);
  assert.deepEqual(reviewAgenda("nonsense"), []);
});

test("summarizeClosure: a flagged verdict carries the scene's own prompts as the review agenda, so the review opens with real questions", () => {
  const prompts = [{ id: "banter", text: "The storekeeper's banter landing." }];
  const noted = summarizeClosure({ verdict: "note", reactionPrompts: prompts });
  assert.deepEqual(noted.review, { verdict: "note", agenda: [{ id: "banter", text: "The storekeeper's banter landing." }] });

  const panicked = summarizeClosure({ verdict: "panic", reactionPrompts: prompts });
  assert.deepEqual(panicked.review.agenda, [{ id: "banter", text: "The storekeeper's banter landing." }]);
});

test("summarizeClosure: a POSITIVE verdict records no agenda at all -- \"giving feedback feels less important as nothing happened to require strong feedback\"", () => {
  const result = summarizeClosure({ verdict: "positive", reactionPrompts: [{ id: "banter", text: "Banter." }] });
  assert.equal(result.review, null);
  assert.equal(result.flaggedForReview, false);
});

test("summarizeClosure: a flagged close on a scene with no authored prompts still flags -- an empty agenda is not a reason to lose the flag", () => {
  const result = summarizeClosure({ verdict: "note", reactionPrompts: [] });
  assert.equal(result.flaggedForReview, true);
  assert.deepEqual(result.review, { verdict: "note", agenda: [] });
  assert.deepEqual(result.delta, { reviewFlags: 1 });
});

// ---- The recap half, untouched by the rebuild ----------------------------

test("openSetups: only setup-tagged entries, newest first, capped", () => {
  const entries = [
    { tag: "setup", text: "The old man mentioned a brother.", at: "2026-09-19T20:00:00Z", context: { scene: "The Errand" } },
    { tag: "npc", text: "Not a setup.", at: "2026-09-19T20:05:00Z", context: { scene: "The Errand" } },
    { tag: "setup", text: "Someone left a mark on the wall.", at: "2026-09-19T21:00:00Z", context: { scene: "Kit Issue" } }
  ];
  const setups = openSetups(entries);
  assert.deepEqual(setups, [
    { text: "Someone left a mark on the wall.", scene: "Kit Issue" },
    { text: "The old man mentioned a brother.", scene: "The Errand" }
  ]);
  assert.equal(openSetups(entries, { limit: 1 }).length, 1);
});

test("openSetups: an untexted or untagged entry is dropped, and no entries at all is fine", () => {
  assert.deepEqual(openSetups([{ tag: "setup" }, { text: "untagged" }, null]), []);
  assert.deepEqual(openSetups(), []);
});

test("sceneHighlights: this scene's own tagged lines only, chronologically, capped to the most recent", () => {
  const entries = [
    { tag: "decision", text: "They split up.", at: "2026-09-19T20:00:00Z", context: { scene: "Kit Issue" } },
    { tag: "npc", text: "Nobu lied about the boots.", at: "2026-09-19T20:10:00Z", context: { scene: "Kit Issue" } },
    { tag: "decision", text: "Different scene entirely.", at: "2026-09-19T20:20:00Z", context: { scene: "The Errand" } },
    { tag: null, text: "Untagged aside.", at: "2026-09-19T20:30:00Z", context: { scene: "Kit Issue" } },
    { tag: "setup", text: "Setups belong to openSetups.", at: "2026-09-19T20:40:00Z", context: { scene: "Kit Issue" } }
  ];
  assert.deepEqual(sceneHighlights(entries, "Kit Issue"), [
    { tag: "decision", text: "They split up." },
    { tag: "npc", text: "Nobu lied about the boots." }
  ]);
});

test("sceneHighlights: no scene name means no highlights rather than every scene's", () => {
  const entries = [{ tag: "decision", text: "x", at: "2026-09-19T20:00:00Z", context: { scene: "Kit Issue" } }];
  assert.deepEqual(sceneHighlights(entries, null), []);
  assert.deepEqual(sceneHighlights(entries, undefined), []);
  assert.deepEqual(sceneHighlights(), []);
});

test("sceneHighlights: `anchor` is no longer a highlight tag -- Anchors were CUT 2026-09-20 and must not be presented as a live beat", () => {
  const entries = [{ tag: "anchor", text: "An old Anchor line.", at: "2026-09-19T20:00:00Z", context: { scene: "Kit Issue" } }];
  assert.deepEqual(sceneHighlights(entries, "Kit Issue"), []);
});
