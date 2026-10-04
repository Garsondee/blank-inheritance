// Tier 1 — core/runner-party.mjs: each character's own result, whom a carry-in
// applies to, and the party strip (2026-10-04, D059).
//
// Found running the Flood Tunnel's opening in the live Runner: seven carry-ins
// asked the GM to remember who passed natural history, whom Taka warned, who
// has no handlamp, who is Fatigued. Every answer is already recorded somewhere
// -- a roll, a pick, a sheet -- so the Runner looks it up. These tests pin the
// lookup, in plain Node.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PASSING,
  carryInsWithNames,
  degreesOnBeat,
  partyStrip,
  perPlayerRows,
  resolveWho,
  withResult
} from "../module/blank-inheritance/scripts/core/runner-party.mjs";

const S2 = "episode-c1e1--school-second-period";
const members = [
  { actorId: "a1", userId: "u1", name: "Aiko", conditions: [], itemNames: ["Directorate Handlamp, Pattern 1"] },
  { actorId: "a2", userId: "u2", name: "Ben", conditions: [{ slug: "fatigued", label: "Fatigued" }], itemNames: [] },
  { actorId: "a3", userId: "u3", name: "Cho", conditions: [], itemNames: ["Flashlight (Commercial)", "Tram map"] }
];

/* ---------------------------------------------------------------- */
/*  Each character's own result                                      */
/* ---------------------------------------------------------------- */

test("withResult writes one character's result on one beat, and clears it with null, never mutating", () => {
  const empty = {};
  const one = withResult(empty, "natural-history", "a1", { degree: "success", name: "Aiko" });
  assert.deepEqual(empty, {}, "the input is untouched");
  assert.equal(one["natural-history"].a1.degree, "success");
  const two = withResult(one, "natural-history", "a2", { degree: "criticalFailure", name: "Ben" });
  assert.equal(Object.keys(two["natural-history"]).length, 2);
  const cleared = withResult(two, "natural-history", "a1", null);
  assert.deepEqual(Object.keys(cleared["natural-history"]), ["a2"]);
  assert.deepEqual(withResult(cleared, "natural-history", "a2", null), {}, "the last one cleared leaves no empty beat behind");
  assert.deepEqual(withResult({}, "x", "a1", { degree: "nonsense" }), {}, "a degree SF2E does not have is never written");
});

test("degreesOnBeat reads every character's result, and the one a roll stamped on the beat itself", () => {
  const runState = {
    ticked: { workshop: { degree: "success", actorId: "a1", via: "roll" } },
    results: { workshop: { a3: { degree: "failure" } } }
  };
  const byActor = degreesOnBeat(runState, "workshop");
  assert.equal(byActor.get("a1"), "success", "a beat recorded by the roll that recorded itself still names who");
  assert.equal(byActor.get("a3"), "failure");
  assert.equal(byActor.size, 2);
  assert.equal(degreesOnBeat(null, "workshop").size, 0);
});

/* ---------------------------------------------------------------- */
/*  Whom an earlier outcome applies to                               */
/* ---------------------------------------------------------------- */

test("a carry-in from a beat names the characters whose own result passed it", () => {
  const runs = { [S2]: { ticked: { "natural-history": { at: "t" } }, results: { "natural-history": { a1: { degree: "success" }, a2: { degree: "failure" }, a3: { degree: "criticalSuccess" } } } } };
  const passed = resolveWho({ briefRef: S2, beatRef: "natural-history", degrees: PASSING }, { runs, members });
  assert.deepEqual([...passed.actorIds].sort(), ["a1", "a3"]);
  assert.equal(passed.known, true);
  const crit = resolveWho({ briefRef: S2, beatRef: "natural-history", degrees: ["criticalSuccess"] }, { runs, members });
  assert.deepEqual([...crit.actorIds], ["a3"]);
  const defaulted = resolveWho({ briefRef: S2, beatRef: "natural-history" }, { runs, members });
  assert.deepEqual([...defaulted.actorIds].sort(), ["a1", "a3"], "no degrees means a pass");
});

test("a beat nobody has run cannot answer, and says so rather than 'nobody'", () => {
  const unknown = resolveWho({ briefRef: S2, beatRef: "the-range" }, { runs: {}, members });
  assert.equal(unknown.known, false);
  assert.equal(unknown.actorIds.size, 0);
});

test("a degree recorded by hand, with no name on it, answers for the table as a whole", () => {
  const runs = { [S2]: { ticked: { workshop: { degree: "success" } } } };
  const r = resolveWho({ briefRef: S2, beatRef: "workshop" }, { runs, members });
  assert.equal(r.known, true);
  assert.equal(r.whole, true);
  assert.equal(r.actorIds.size, 0);
});

test("a choice names each player's own pick, or answers for the table when the GM decided it", () => {
  const ERRAND = "episode-c1e1--the-errand";
  const picked = { [ERRAND]: { ticked: { "how-to-file-it": { choice: "loudly", picks: { u1: "loudly", u2: "quietly" } } } } };
  const loud = resolveWho({ briefRef: ERRAND, beatRef: "how-to-file-it", options: ["loudly"] }, { runs: picked, members });
  assert.deepEqual([...loud.actorIds], ["a1"]);
  assert.equal(loud.whole, true, "the table's choice was loudly");
  const byHand = { [ERRAND]: { ticked: { "how-to-file-it": { choice: "quietly" } } } };
  const quiet = resolveWho({ briefRef: ERRAND, beatRef: "how-to-file-it", options: ["loudly"] }, { runs: byHand, members });
  assert.equal(quiet.whole, false, "decided by hand the other way: it does not apply");
});

test("a person card's conversation check answers by who rolled it, or for the table", () => {
  const C = "episode-c1e1--canteen";
  const rolled = { [C]: { topics: { "taka:coercible:0": { degree: "success", actorId: "a2" } } } };
  assert.deepEqual([...resolveWho({ briefRef: C, topicKey: "taka:coercible:0" }, { runs: rolled, members }).actorIds], ["a2"]);
  const byHand = { [C]: { topics: { "taka:coercible:0": { degree: "criticalFailure" } } } };
  assert.equal(resolveWho({ briefRef: C, topicKey: "taka:coercible:0" }, { runs: byHand, members }).whole, false);
});

test("a condition, an item and an arrival are read off the live sheets and The City's record", () => {
  assert.deepEqual([...resolveWho({ condition: "fatigued" }, { members }).actorIds], ["a2"]);
  const noLamp = resolveWho({ lacksItem: ["handlamp", "flashlight"] }, { members });
  assert.deepEqual([...noLamp.actorIds], ["a2"], "the handlamp and the commercial flashlight both count as a lamp");
  assert.deepEqual([...resolveWho({ hasItem: ["tram map"] }, { members }).actorIds], ["a3"]);
  const ferry = resolveWho({ arrival: "ferry" }, { members, arrivals: { u1: "train", u3: "ferry" } });
  assert.deepEqual([...ferry.actorIds], ["a3"]);
  assert.equal(resolveWho({ arrival: "ferry" }, { members, arrivals: {} }).known, false, "before The Road In nobody has arrived");
  assert.equal(resolveWho({ condition: "fatigued" }, { members: [] }).known, false, "no party, no answer");
});

test("anyOf unions its sources: Fatigued from the sheet OR from a critical failure today", () => {
  const S1 = "episode-c1e1--school-first-period";
  const runs = { [S1]: { ticked: {}, results: { "local-studies": { a3: { degree: "criticalFailure" } } } } };
  const who = { anyOf: [{ condition: "fatigued" }, { briefRef: S1, beatRef: "local-studies", degrees: ["criticalFailure"] }] };
  assert.deepEqual([...resolveWho(who, { runs, members }).actorIds].sort(), ["a2", "a3"]);
});

test("carryInsWithNames states, for the template, whether a carry-in names people, applies, applies to nobody or is unknown", () => {
  const runs = { [S2]: { ticked: { workshop: { degree: "success" } }, results: { "the-range": { a1: { degree: "failure" } } } } };
  const lines = carryInsWithNames(
    [
      { when: "If anyone has no handlamp", then: "Darkness.", tag: "No lamp", who: { lacksItem: ["handlamp", "flashlight"] } },
      { when: "If anyone passed the workshop", then: "+2.", tag: "+2 on panels", who: { briefRef: S2, beatRef: "workshop" } },
      { when: "If anyone qualified on the range", then: "+1.", tag: "+1 first shot", who: { briefRef: S2, beatRef: "the-range" } },
      { when: "If they came back empty-handed", then: "Laughter." }
    ],
    { runs, members }
  );
  assert.deepEqual(lines.map((l) => l.state), ["names", "applies", "nobody", "unknown"]);
  assert.equal(lines[0].namesText, "Ben");
  assert.equal(lines[0].applies, true);
  assert.equal(lines[2].isNobody, true);
  assert.equal(lines[3].applies, false);
});

/* ---------------------------------------------------------------- */
/*  The party strip                                                  */
/* ---------------------------------------------------------------- */

test("the party strip carries each character's hit points, Hero Points, conditions and this scene's tags", () => {
  const carryIns = carryInsWithNames([{ when: "w", then: "t", tag: "No lamp", who: { lacksItem: ["handlamp", "flashlight"] } }], { members });
  const strip = partyStrip(
    [
      { ...members[0], hp: { value: 14, max: 14 }, heroPoints: 1 },
      { ...members[1], hp: { value: 5, max: 16 }, heroPoints: 0 }
    ],
    carryIns
  );
  assert.equal(strip[0].hp.isLow, false);
  assert.equal(strip[1].hp.isLow, true, "half or less reads low");
  assert.equal(strip[0].heroPoints, 1);
  assert.deepEqual(strip[1].conditions, ["Fatigued"]);
  assert.deepEqual(strip[1].tags, ["No lamp"]);
  assert.deepEqual(strip[0].tags, []);
  assert.equal(strip[0].initial, "A");
  assert.equal(partyStrip([{ ...members[2], hp: { value: 0, max: 0 } }], [])[0].hp, null, "a sheet with no hit points yet shows none, not 0/0");
});

test("the per-player row lists every character with the degree they have on that beat", () => {
  const rows = perPlayerRows(members, { results: { "local-studies": { a2: { degree: "success" } } } }, "local-studies");
  assert.deepEqual(rows.map((r) => [r.name, r.degree]), [["Aiko", null], ["Ben", "success"], ["Cho", null]]);
});
