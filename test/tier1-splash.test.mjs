// Tier 1 — the Splash tier's model.
//
// The assertion that matters most is `splashArrivals`' STINGSEQ gate: a
// repeat splash on someone already `sting: "splash"` is a real, deliberate
// GM action (the "re-spotlight for drama" case the user explicitly asked
// for) that produces a data write byte-identical to the one before it in
// every field EXCEPT `stingSeq`. Comparing `sting` alone would silently swallow
// every repeat splash — this file proves the nonce is load-bearing, not
// decorative, via a mutation test against the exact wrong-but-plausible
// implementation someone would write without reading the comment.
//
// The second assertion that matters: `kind !== "npc"` is refused even when
// every other condition says "splash this". The user was explicit — NPCs
// only, PCs never — and the frame template is meant to be the only path in,
// but this function does not trust that; it refuses PC data on its own.

import { test } from "node:test";
import assert from "node:assert/strict";

import { STING_TIERS } from "../module/blank-inheritance/scripts/core/sting.mjs";
import {
  FACTION_ACCENTS,
  affiliationLabel,
  factionAccent,
  isFirstSplash,
  splashArrivals,
  splashContentFor
} from "../module/blank-inheritance/scripts/core/splash.mjs";

const advocate = {
  portraitId: "transparency-advocate",
  label: "The Transparency Advocate",
  img: "modules/blank-inheritance/assets/stage/transparency-advocate.webp",
  kind: "npc",
  faction: "directorate",
  sting: STING_TIERS.SPLASH,
  stingSeq: 1000
};

const barRegular = {
  portraitId: "bar-regular",
  label: "A Bar Regular",
  img: "modules/blank-inheritance/assets/stage/bar-regular.webp",
  kind: "npc",
  faction: null,
  sting: STING_TIERS.SPLASH,
  stingSeq: 2000
};

const satoPC = {
  portraitId: "sato-hiroshi",
  label: "Sato Hiroshi",
  img: "modules/blank-inheritance/assets/stage/sato-hiroshi.webp",
  kind: "pc",
  faction: null,
  sting: STING_TIERS.SPLASH,
  stingSeq: 3000
};

/* ------------------------------------------------------------------ */
/*  factionAccent / affiliationLabel                                   */
/* ------------------------------------------------------------------ */

test("a known faction resolves to its accent token", () => {
  assert.equal(factionAccent("directorate"), "--bi-vermilion");
  assert.equal(FACTION_ACCENTS.directorate, "--bi-vermilion");
});

test("an unknown, null or missing faction stays monochrome", () => {
  assert.equal(factionAccent("the-watcher"), null, "no faction file with this id exists yet — must not guess a colour");
  assert.equal(factionAccent(null), null);
  assert.equal(factionAccent(undefined), null);
  assert.equal(factionAccent(""), null);
});

test("affiliationLabel titlecases a faction id as a working placeholder", () => {
  assert.equal(affiliationLabel("directorate"), "Directorate");
});

test("affiliationLabel handles multi-word and hyphenated ids", () => {
  assert.equal(affiliationLabel("the-watcher"), "The Watcher");
  assert.equal(affiliationLabel("some_faction-id"), "Some Faction Id");
});

test("affiliationLabel returns null rather than a label for nothing", () => {
  assert.equal(affiliationLabel(null), null);
  assert.equal(affiliationLabel(undefined), null);
  assert.equal(affiliationLabel(""), null);
});

/* ------------------------------------------------------------------ */
/*  isFirstSplash                                                      */
/* ------------------------------------------------------------------ */

test("a portrait absent from the ever-splashed list is a first appearance", () => {
  assert.equal(isFirstSplash("bar-regular", []), true);
  assert.equal(isFirstSplash("bar-regular", ["someone-else"]), true);
});

test("a portrait present in the ever-splashed list is not a first appearance", () => {
  assert.equal(isFirstSplash("bar-regular", ["bar-regular"]), false);
  assert.equal(isFirstSplash("bar-regular", ["someone-else", "bar-regular"]), false);
});

test("an empty or missing list means everyone is a first appearance", () => {
  assert.equal(isFirstSplash("bar-regular", []), true);
  assert.equal(isFirstSplash("bar-regular", undefined), true);
});

/* ------------------------------------------------------------------ */
/*  splashArrivals                                                     */
/* ------------------------------------------------------------------ */

test("a member with sting:splash absent from the previous cast arrives — the first-ever case", () => {
  const arrivals = splashArrivals([], [advocate]);
  assert.deepEqual(arrivals, [advocate]);
});

test("a member with sting:quiet or sting:announced never triggers a splash", () => {
  const quiet = { ...advocate, sting: STING_TIERS.QUIET };
  const announced = { ...advocate, sting: STING_TIERS.ANNOUNCED };
  assert.deepEqual(splashArrivals([], [quiet]), []);
  assert.deepEqual(splashArrivals([], [announced]), []);
});

test("THE STINGSEQ GATE: an unchanged splash (same stingSeq) does not re-arrive", () => {
  // This is the ordinary re-render case -- the cast gets re-published for an
  // unrelated reason (someone else's reveal) and this member's own row is
  // untouched. Must not replay.
  const arrivals = splashArrivals([advocate], [advocate]);
  assert.deepEqual(arrivals, [], "an untouched member re-triggered its own splash");
});

test("THE STINGSEQ GATE: a REPEAT splash (new stingSeq, same sting value) DOES re-arrive", () => {
  // The deliberate re-spotlight case the user explicitly asked for: "we also
  // use the same version where it would add drama to a scene... they don't
  // need to use it every time". sting is "splash" in both snapshots; only
  // stingSeq moved. This is the exact case that would have silently broken
  // without the nonce.
  const repeat = { ...advocate, stingSeq: 9999 };
  const arrivals = splashArrivals([advocate], [repeat]);
  assert.deepEqual(arrivals, [repeat]);
});

test("MUTATION CHECK: a stingSeq-blind implementation swallows the repeat-splash case", () => {
  // The exact wrong-but-plausible function someone would write without
  // reading the comment above splashArrivals in core/splash.mjs.
  function naiveSplashArrivals(previous, next) {
    const previousIds = new Set(previous.map((m) => m.portraitId));
    return next.filter((m) => m.sting === STING_TIERS.SPLASH && m.kind === "npc" && !previousIds.has(m.portraitId));
  }
  const repeat = { ...advocate, stingSeq: 9999 };
  const naive = naiveSplashArrivals([advocate], [repeat]);
  assert.deepEqual(naive, [], "the naive implementation did not actually swallow the repeat, so this test proves nothing");
  // And the real implementation must disagree with it on exactly this input.
  assert.notDeepEqual(splashArrivals([advocate], [repeat]), naive);
});

test("a PC is never splashed, even with a valid sting/stingSeq transition", () => {
  assert.deepEqual(splashArrivals([], [satoPC]), [], "a PC entered the arrivals list");
  const repeat = { ...satoPC, stingSeq: 4000 };
  assert.deepEqual(splashArrivals([satoPC], [repeat]), [], "a PC re-splash was not refused");
});

test("MUTATION CHECK: the kind guard is not vacuous — removing it lets a PC through", () => {
  function withoutKindGuard(previous, next) {
    const previousById = new Map(previous.map((m) => [m.portraitId, m]));
    return next.filter((m) => {
      if (m.sting !== STING_TIERS.SPLASH) return false;
      const before = previousById.get(m.portraitId);
      return !before || before.stingSeq !== m.stingSeq;
    });
  }
  const mutant = withoutKindGuard([], [satoPC]);
  assert.deepEqual(mutant, [satoPC], "removing the kind guard did not actually let a PC through, so this test proves nothing");
  assert.deepEqual(splashArrivals([], [satoPC]), [], "the real function still must refuse the PC");
});

test("multiple simultaneous arrivals are all reported — the caller decides pacing, not this function", () => {
  // splashArrivals is a pure diff; the "never barrage" guarantee lives in
  // foundry/splash.mjs's single-slot guard, not here. This function's job
  // is only to be a correct diff.
  const arrivals = splashArrivals([], [advocate, barRegular]);
  assert.equal(arrivals.length, 2);
});

test("empty or missing inputs are handled without special-casing by the caller", () => {
  assert.deepEqual(splashArrivals([], []), []);
  assert.deepEqual(splashArrivals(undefined, undefined), []);
  assert.deepEqual(splashArrivals([advocate], []), [], "a departure must never itself read as a splash arrival");
});

test("order mirrors the next cast, matching diffCast's own convention", () => {
  const arrivals = splashArrivals([], [barRegular, advocate]);
  assert.deepEqual(arrivals.map((m) => m.portraitId), ["bar-regular", "transparency-advocate"]);
});

/* ------------------------------------------------------------------ */
/*  splashContentFor                                                   */
/* ------------------------------------------------------------------ */

test("a faction-affiliated member gets an accent token and an affiliation label", () => {
  const content = splashContentFor(advocate, []);
  assert.equal(content.accentToken, "--bi-vermilion");
  assert.equal(content.affiliationLabel, "Directorate");
  assert.equal(content.label, "The Transparency Advocate");
  assert.equal(content.img, advocate.img);
});

test("an unaffiliated member gets neither — the monochrome path", () => {
  const content = splashContentFor(barRegular, []);
  assert.equal(content.accentToken, null);
  assert.equal(content.affiliationLabel, null);
});

test("firstAppearance reflects the ever-splashed list passed in", () => {
  assert.equal(splashContentFor(advocate, []).firstAppearance, true);
  assert.equal(splashContentFor(advocate, ["transparency-advocate"]).firstAppearance, false);
});

test("a member with no label produces no content — mirrors noticeForArrival's own guard", () => {
  assert.equal(splashContentFor({ portraitId: "x" }, []), null);
  assert.equal(splashContentFor(null, []), null);
  assert.equal(splashContentFor(undefined, []), null);
});

test("splashContentFor does not itself decide who may be splashed — that's splashArrivals' job", () => {
  // A deliberate, narrow scope check: given a PC's data directly, this
  // function still builds content for it (it trusts its caller). The PC
  // refusal lives entirely in splashArrivals, tested above — this test
  // exists so nobody "fixes" a missing guard here under the mistaken belief
  // this function needs one too, duplicating the check in two places.
  const content = splashContentFor(satoPC, []);
  assert.ok(content, "splashContentFor is not the PC gate; splashArrivals already is");
});
