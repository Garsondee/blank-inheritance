// Tier 1 — the theatre-of-the-mind stage's blocking and its redaction boundary.
//
// Two very different things are checked here.
//
// BLOCKING, because staging is meaning: two figures either side of a gap read
// as a conversation and three against one reads as a summons, and a layout bug
// does not throw — it just quietly says something the Director did not mean.
//
// REDACTION, because a stage cast is published onto a Scene document, and a
// Scene reaches EVERY client. A concealed character's name and portrait sitting
// in a scene flag have already crossed the wire by the time any template
// decides not to draw them. publishedCast is that boundary and this file is
// what proves it still holds — including against the field somebody adds next
// year without reading any of this.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LAYOUT_LIST,
  SIDES,
  STAGE_LAYOUTS,
  frameScale,
  leaksConcealed,
  publishedCast,
  stageGroups,
  stageState
} from "../module/blank-inheritance/scripts/core/stage-layout.mjs";

const SECRET_NAME = "The Watcher";
const SECRET_IMG = "modules/blank-inheritance/assets/stage/the-watcher.webp";

const CAST = [
  { portraitId: "sato", label: "Sato Hiroshi", img: "a.webp", side: "left", revealed: true },
  { portraitId: "advocate", label: "The Transparency Advocate", img: "b.webp", side: "right", revealed: true },
  {
    portraitId: "watcher",
    label: SECRET_NAME,
    img: SECRET_IMG,
    side: "right",
    revealed: false,
    directorNote: "Arrives when they mention the reactor"
  }
];

/* ------------------------------------------------------------------ */
/*  Law 11                                                             */
/* ------------------------------------------------------------------ */

test("only revealed members are published at all", () => {
  const published = publishedCast(CAST);
  assert.equal(published.length, 2);
  assert.deepEqual(published.map((m) => m.portraitId), ["sato", "advocate"]);
});

test("LAW 11: a concealed member contributes NOTHING to the published cast", () => {
  const published = publishedCast(CAST);
  const serialized = JSON.stringify(published);
  assert.ok(!serialized.includes(SECRET_NAME), `the concealed name survived: ${serialized}`);
  assert.ok(!serialized.includes(SECRET_IMG), "the concealed portrait path survived");
  assert.ok(!serialized.includes("watcher"), "even the id says somebody is waiting");
});

test("not even a placeholder is published for a concealed member", () => {
  // A frame saying "someone is here but you cannot see who" is worse than no
  // frame: it tells the table a surprise is coming, which is exactly the
  // information the concealment exists to withhold. (Contrast
  // core/commitments.mjs, where an occupancy marker IS published — a teammate
  // being busy is a shared game fact, an unannounced arrival is not.)
  assert.equal(publishedCast([{ portraitId: "x", label: "X", revealed: false }]).length, 0);
});

test("publishing is an allow-list, so a new authored field cannot ride along", () => {
  const published = publishedCast([
    {
      portraitId: "sato",
      label: "Sato Hiroshi",
      img: "a.webp",
      revealed: true,
      directorNote: "knows about the reactor",
      plannedBetrayalOn: "day 6"
    }
  ]);
  const serialized = JSON.stringify(published);
  assert.ok(!serialized.includes("reactor"), "a GM-side note leaked through the publish boundary");
  assert.ok(!serialized.includes("day 6"), "a GM-side note leaked through the publish boundary");
  assert.deepEqual(Object.keys(published[0]).sort(), ["img", "label", "portraitId"]);
});

test("leaksConcealed reports the exact strings that escaped", () => {
  assert.deepEqual(leaksConcealed(publishedCast(CAST), CAST), []);
  // Mutation: the wrong-but-plausible implementation, publishing everything
  // and marking the concealed ones. The detector must reject it, or this file
  // proves nothing.
  const naive = CAST.map((m) => ({ ...m, hidden: !m.revealed }));
  const leaks = leaksConcealed(naive, CAST);
  assert.ok(leaks.includes(SECRET_NAME), "the detector did not notice a wholesale leak");
  assert.ok(leaks.includes(SECRET_IMG));
});

/* ------------------------------------------------------------------ */
/*  Blocking                                                           */
/* ------------------------------------------------------------------ */

test("stageGroups always returns all three sides, in render order", () => {
  for (const layout of LAYOUT_LIST) {
    const groups = stageGroups([], layout);
    assert.deepEqual(groups.map((g) => g.side), SIDES, `${layout} changed the side order`);
  }
});

test("an empty side is kept, because the gap IS the composition", () => {
  const groups = stageGroups([{ portraitId: "a", side: "left" }], STAGE_LAYOUTS.CONVERSATION);
  assert.equal(groups.find((g) => g.side === "right").members.length, 0);
  assert.equal(groups.length, 3);
});

test("an explicitly placed member always stays where the Director put them", () => {
  // A layout rule silently moving someone would be the console overruling the
  // person running the game.
  for (const layout of LAYOUT_LIST) {
    const groups = stageGroups([{ portraitId: "a", side: "right" }], layout);
    assert.equal(groups.find((g) => g.side === "right").members.length, 1, `${layout} moved a placed member`);
  }
});

test("conversation alternates the unplaced, so a pair ends up facing each other", () => {
  const groups = stageGroups(
    [{ portraitId: "a" }, { portraitId: "b" }],
    STAGE_LAYOUTS.CONVERSATION
  );
  assert.deepEqual(groups.find((g) => g.side === "left").members.map((m) => m.portraitId), ["a"]);
  assert.deepEqual(groups.find((g) => g.side === "right").members.map((m) => m.portraitId), ["b"]);
});

test("line and pair put everyone in the middle", () => {
  for (const layout of [STAGE_LAYOUTS.LINE, STAGE_LAYOUTS.PAIR]) {
    const groups = stageGroups([{ portraitId: "a" }, { portraitId: "b" }], layout);
    assert.equal(groups.find((g) => g.side === "centre").members.length, 2, layout);
  }
});

test("a group layout piles the unplaced onto its own side", () => {
  const three = [{ portraitId: "a" }, { portraitId: "b" }, { portraitId: "c" }];
  assert.equal(stageGroups(three, STAGE_LAYOUTS.GROUP_LEFT).find((g) => g.side === "left").members.length, 3);
  assert.equal(stageGroups(three, STAGE_LAYOUTS.GROUP_RIGHT).find((g) => g.side === "right").members.length, 3);
});

test("group-left plus one placed opposite is the summons shape", () => {
  const groups = stageGroups(
    [{ portraitId: "a" }, { portraitId: "b" }, { portraitId: "c" }, { portraitId: "boss", side: "right" }],
    STAGE_LAYOUTS.GROUP_LEFT
  );
  assert.equal(groups.find((g) => g.side === "left").members.length, 3);
  assert.equal(groups.find((g) => g.side === "right").members.length, 1);
  assert.equal(groups.find((g) => g.side === "centre").members.length, 0, "the gap closed");
});

test("an unknown layout is refused rather than silently becoming a row", () => {
  assert.throws(() => stageGroups([], "wedge"), /unknown layout/);
});

test("a member placed on a side that does not exist falls through to the layout", () => {
  const groups = stageGroups([{ portraitId: "a", side: "above" }], STAGE_LAYOUTS.LINE);
  assert.equal(groups.find((g) => g.side === "centre").members.length, 1);
});

/* ------------------------------------------------------------------ */
/*  Density                                                            */
/* ------------------------------------------------------------------ */

test("frames shrink as the room fills, monotonically", () => {
  const order = ["lg", "md", "sm", "xs"];
  let previous = 0;
  for (let count = 1; count <= 12; count++) {
    const index = order.indexOf(frameScale(count));
    assert.ok(index >= 0, `frameScale(${count}) returned something unknown`);
    assert.ok(index >= previous, `frameScale went back UP at ${count}`);
    previous = index;
  }
});

test("the real cases land where they should", () => {
  assert.equal(frameScale(2), "lg", "a conversation");
  assert.equal(frameScale(6), "sm", "the full party");
  assert.equal(frameScale(10), "xs", "the party plus a Directorate delegation");
});

/* ------------------------------------------------------------------ */
/*  stageState                                                         */
/* ------------------------------------------------------------------ */

test("stageState hands the template everything and decides nothing twice", () => {
  const state = stageState({ cast: CAST, layout: STAGE_LAYOUTS.CONVERSATION, canDirect: true });
  assert.equal(state.count, 3);
  assert.equal(state.scale, frameScale(3));
  assert.equal(state.canDirect, true);
  assert.equal(state.empty, false);
  assert.deepEqual(state.groups.map((g) => g.side), SIDES);
});

test("stageState does not know what a GM is — the caller says", () => {
  assert.equal(stageState({ cast: CAST }).canDirect, false);
});

test("an empty cast is a real state, not a crash", () => {
  const state = stageState({});
  assert.equal(state.empty, true);
  assert.equal(state.count, 0);
  assert.equal(state.groups.length, 3);
});
