// Tier 1 — the downtime board's model.
//
// The assertion this file exists for is the LEAK TEST near the bottom: a
// player's projection must not CONTAIN another player's private mission text.
// Not hidden behind a class, not skipped by the template — absent from the
// object, so there is nothing in the DOM and nothing in a socket payload to go
// looking for. That is doctrine Law 11 (redaction is removal, not hiding), and
// it is exactly the kind of rule that is trivially true on the day it is
// written and quietly false six months later when somebody adds a field and
// reaches for a spread operator.
//
// The leak detector is itself checked against a deliberately broken projector,
// so it cannot pass vacuously.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  OPAQUE_ACTIVITY,
  VISIBILITY,
  budgetFor,
  clusterByActivity,
  normalizeOffers,
  offersAt,
  projectForUser,
  segmentState
} from "../module/blank-inheritance/scripts/core/commitments.mjs";
import { SLICES_PER_QUARTER, momentKey } from "../module/blank-inheritance/scripts/core/day-ring.mjs";

const MOMENT = { day: 2, quarter: "evening" };
const HERE = momentKey(MOMENT);

const OFFERS = normalizeOffers([
  { id: "sync-training", name: "Sync Training", effect: "Nudges baseline Resonance upward.", cost: "1 slice" },
  { id: "rest", name: "Rest", effect: "Recover.", cost: "1 slice" },
  { id: "investigation", name: "Investigation", effect: "Pull a thread.", cost: "1+ slices" }
]);

const SECRET = "Meeting the Transparency Advocate, alone, off the record";

const COMMITMENTS = [
  { userId: "u1", userName: "Aya", momentKey: HERE, activityId: "sync-training", visibility: VISIBILITY.PUBLIC },
  { userId: "u2", userName: "Ken", momentKey: HERE, activityId: "sync-training", visibility: VISIBILITY.PUBLIC },
  { userId: "u3", userName: "Rei", momentKey: HERE, activityId: "sync-training", visibility: VISIBILITY.PUBLIC },
  { userId: "u4", userName: "Sora", momentKey: HERE, activityId: "rest", visibility: VISIBILITY.PUBLIC },
  {
    userId: "u5",
    userName: "Mika",
    momentKey: HERE,
    activityId: "investigation",
    visibility: VISIBILITY.PRIVATE,
    note: SECRET
  }
];

/* ------------------------------------------------------------------ */
/*  Offers                                                             */
/* ------------------------------------------------------------------ */

test("config options become offers, and every one of them is standing today", () => {
  assert.equal(OFFERS.length, 3);
  assert.ok(OFFERS.every((o) => o.standing), "nothing in config.json expires yet");
  assert.equal(OFFERS[0].name, "Sync Training");
});

test("an option with no id is dropped rather than becoming an offer called undefined", () => {
  assert.deepEqual(normalizeOffers([{ name: "Nameless" }, null, undefined]), []);
});

test("a dated offer is still takeable during the quarter it expires in", () => {
  // "Expires tonight" has to mean you can still do it tonight, or the warning
  // arrives after it is useful.
  const dated = normalizeOffers([{ id: "raid", name: "Raid", expiresOn: HERE }]);
  assert.equal(offersAt(MOMENT, dated).length, 1);
  assert.equal(offersAt({ day: 2, quarter: "night" }, dated).length, 0);
});

test("offer expiry compares chronologically, not as strings — day 10 is after day 9", () => {
  const dated = normalizeOffers([{ id: "late", name: "Late", expiresOn: momentKey({ day: 10, quarter: "morning" }) }]);
  assert.equal(offersAt({ day: 9, quarter: "night" }, dated).length, 1, "d10 sorted before d9 as a string");
});

/* ------------------------------------------------------------------ */
/*  Budget                                                             */
/* ------------------------------------------------------------------ */

test("one slice per quarter, spent or not", () => {
  assert.deepEqual(budgetFor({ moment: MOMENT, commitments: COMMITMENTS, userId: "u1" }), {
    total: SLICES_PER_QUARTER,
    spent: 1,
    remaining: 0,
    over: false
  });
  assert.deepEqual(budgetFor({ moment: MOMENT, commitments: COMMITMENTS, userId: "nobody" }), {
    total: SLICES_PER_QUARTER,
    spent: 0,
    remaining: 1,
    over: false
  });
});

test("a commitment in another quarter does not spend this quarter's slice", () => {
  const elsewhere = [{ userId: "u1", momentKey: momentKey({ day: 2, quarter: "night" }), activityId: "rest" }];
  assert.equal(budgetFor({ moment: MOMENT, commitments: elsewhere, userId: "u1" }).remaining, 1);
});

test("a double-booking is reported rather than clamped away silently", () => {
  const doubled = [
    { userId: "u1", momentKey: HERE, activityId: "rest" },
    { userId: "u1", momentKey: HERE, activityId: "sync-training" }
  ];
  const budget = budgetFor({ moment: MOMENT, commitments: doubled, userId: "u1" });
  assert.equal(budget.remaining, 0);
  assert.equal(budget.over, true, "the board must be able to say the numbers do not add up");
});

/* ------------------------------------------------------------------ */
/*  Clustering                                                         */
/* ------------------------------------------------------------------ */

test("three players on one lesson is ONE row with three names, not three rows", () => {
  const rows = clusterByActivity(COMMITMENTS, OFFERS);
  const training = rows.find((r) => r.activityId === "sync-training");
  assert.equal(training.participants.length, 3);
  assert.deepEqual(training.participants.map((p) => p.name), ["Aya", "Ken", "Rei"]);
  assert.equal(rows.filter((r) => r.activityId === "sync-training").length, 1);
});

test("rows follow the order the offers were declared, so the board does not reshuffle", () => {
  const rows = clusterByActivity(COMMITMENTS, OFFERS);
  assert.deepEqual(rows.map((r) => r.activityId), ["sync-training", "rest", "investigation"]);
});

test("commitments with no activity cluster into one opaque row, and it sorts last", () => {
  const mixed = [
    { userId: "x", momentKey: HERE, activityId: null },
    { userId: "y", momentKey: HERE, activityId: "rest" },
    { userId: "z", momentKey: HERE, activityId: null }
  ];
  const rows = clusterByActivity(mixed, OFFERS);
  assert.equal(rows.length, 2);
  assert.equal(rows.at(-1).opaque, true, "the footnote must not sort above real entries");
  assert.equal(rows.at(-1).participants.length, 2, "the count of spoken-for slices must still add up");
  assert.equal(rows.at(-1).activityId, OPAQUE_ACTIVITY);
});

/* ------------------------------------------------------------------ */
/*  Law 11                                                             */
/* ------------------------------------------------------------------ */

test("the GM sees everything, including the note", () => {
  const projected = projectForUser(COMMITMENTS, { userId: "gm", isGM: true });
  assert.ok(JSON.stringify(projected).includes(SECRET), "the GM's own board lost the content it exists to show");
});

test("the owner of a private commitment still sees their own", () => {
  const projected = projectForUser(COMMITMENTS, { userId: "u5" });
  const mine = projected.find((c) => c.userId === "u5");
  assert.equal(mine.activityId, "investigation");
  assert.equal(mine.note, SECRET);
  assert.equal(mine.own, true);
});

test("LAW 11: another player's private mission is ABSENT from the projection, not hidden in it", () => {
  const projected = projectForUser(COMMITMENTS, { userId: "u1" });
  const serialized = JSON.stringify(projected);
  assert.ok(!serialized.includes(SECRET), `the secret survived into a player's projection: ${serialized}`);
  assert.ok(!serialized.includes("investigation"), "even the activity id leaks what they are doing");
});

test("what survives redaction is occupancy and nothing else", () => {
  // A teammate being busy IS a shared game fact and is not the secret — the
  // board would be useless if a taken quarter looked free. The test is that
  // the row carries the fact and no payload.
  const projected = projectForUser(COMMITMENTS, { userId: "u1" });
  const theirs = projected.find((c) => c.userId === "u5");
  assert.deepEqual(theirs, {
    userId: "u5",
    userName: "Mika",
    momentKey: HERE,
    activityId: OPAQUE_ACTIVITY,
    visibility: VISIBILITY.PRIVATE,
    note: null,
    own: false
  });
});

test("a field added to a private commitment later cannot ride through the boundary", () => {
  // projectForUser rebuilds the object field by field rather than spreading
  // and deleting, precisely so this stays true without anyone remembering to
  // update it. If someone rewrites it as a spread, this test is what catches it.
  const withExtra = [{ ...COMMITMENTS[4], targetNpcId: "the-advocate", coverStory: "studying late" }];
  const serialized = JSON.stringify(projectForUser(withExtra, { userId: "u1" }));
  assert.ok(!serialized.includes("the-advocate"), "a new field leaked through the redaction boundary");
  assert.ok(!serialized.includes("studying late"), "a new field leaked through the redaction boundary");
});

test("the leak detector is not vacuously true — a spread-based projector fails it", () => {
  // Mutation test. This is the exact wrong implementation somebody would write
  // if they were being helpful and quick, and the guard above must reject it.
  const naive = (commitments, userId) =>
    commitments.map((c) => ({ ...c, redacted: c.userId !== userId && c.visibility === VISIBILITY.PRIVATE }));
  const serialized = JSON.stringify(naive(COMMITMENTS, "u1"));
  assert.ok(serialized.includes(SECRET), "the mutant did not actually leak, so this test proves nothing");
});

/* ------------------------------------------------------------------ */
/*  segmentState — what the zone actually renders                      */
/* ------------------------------------------------------------------ */

test("segmentState answers what is left, what is on offer, and who took what", () => {
  const state = segmentState({ moment: MOMENT, offers: OFFERS, commitments: COMMITMENTS, userId: "u1" });
  assert.deepEqual(state.moment, MOMENT);
  assert.equal(state.budget.remaining, 0);
  assert.equal(state.offers.length, 3);
  assert.equal(state.offers.find((o) => o.id === "sync-training").takenByMe, true);
  assert.equal(state.offers.find((o) => o.id === "sync-training").takers, 3);
  assert.equal(state.offers.find((o) => o.id === "rest").takenByMe, false);
});

test("a private commitment counts on the board but is not attributed to an offer", () => {
  const state = segmentState({ moment: MOMENT, offers: OFFERS, commitments: COMMITMENTS, userId: "u1" });
  assert.equal(state.offers.find((o) => o.id === "investigation").takers, 0, "an opaque row must not credit an offer");
  assert.ok(state.board.some((row) => row.opaque), "the spoken-for slice vanished from the board entirely");
});

test("segmentState only ever shows the quarter we are standing in", () => {
  const other = [...COMMITMENTS, { userId: "u9", momentKey: momentKey({ day: 8, quarter: "morning" }), activityId: "rest" }];
  const state = segmentState({ moment: MOMENT, offers: OFFERS, commitments: other, userId: "u1" });
  assert.equal(state.board.reduce((n, row) => n + row.participants.length, 0), COMMITMENTS.length);
});

test("LAW 11 holds through segmentState too, not only through projectForUser", () => {
  // The zone renders segmentState, not projectForUser, so the guard has to
  // survive the composition — the redaction being correct one call deeper is
  // no use if the wrapper reassembles the raw list.
  const state = segmentState({ moment: MOMENT, offers: OFFERS, commitments: COMMITMENTS, userId: "u1" });
  assert.ok(!JSON.stringify(state).includes(SECRET), "the secret reappeared in the assembled zone context");
});
