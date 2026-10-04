// Tier 1 — objectives, the pure rules (design/objectives.md, D057).
//
// What these protect: a page never holds what the table hasn't been told (a hidden part is added only when revealed,
// and the giver's real want is never copied); a second press of a chip changes nothing; only required parts count,
// and a struck one stops counting; the tracker shows the section's and this player's own, leads with the soonest
// deadline, and folds itself in a fight; deadlines read the world's clock; a player's own objective cannot be filed
// without a giver, a reason and one required part; and "only me" means exactly what its label says.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  LEVELS,
  OBJECTIVE_FLAG,
  OBJECTIVES_SOURCE_ID,
  PART,
  SIZES,
  STATUS,
  applyAct,
  canEdit,
  canSee,
  changesSince,
  deadlineState,
  defaultTracked,
  draftToState,
  entryOwnershipRepair,
  exportPayload,
  fromAuthored,
  isMine,
  journalModel,
  nextSize,
  objectivesEntryData,
  pageCreateData,
  pageHtml,
  pageOwnership,
  progress,
  recordModel,
  shownSize,
  trackerModel,
  validateDraft
} from "../module/blank-inheritance/scripts/core/objectives.mjs";

const read = (id) => JSON.parse(fs.readFileSync(new URL(`../data/objectives/${id}.json`, import.meta.url), "utf8"));
const DOCKET = read("c1e1-the-docket");
const DRAINS = read("c1e1-storm-drains");
const ENROL = read("c1e1-report-for-enrolment");
const T0 = "2026-10-04T10:00:00.000Z";
const T1 = "2026-10-04T11:00:00.000Z";
const T2 = "2026-10-04T12:00:00.000Z";

test("a given objective holds only what the table has been told", () => {
  const s = fromAuthored(DOCKET, { nowIso: T0, scene: "Kit Issue" });
  assert.deepEqual(s.parts.map((p) => p.id), ["second-period", "collect", "back-by-1900"], "hidden parts are not on the page");
  const json = JSON.stringify(s);
  assert.ok(!json.includes(DOCKET.want.gm), "the giver's real want never reaches the page");
  assert.ok(!json.includes("Manako"), "nothing about the hidden parts leaks");
  assert.equal(s.giver.name, "Section Officer Vetch");
  assert.equal(s.direct, true);
  assert.equal(s.deadline.label, "19:00");
  assert.equal(s.status, STATUS.ACTIVE);
});

test("revealing adds a hidden part in its authored place; striking uses the authored note", () => {
  let s = fromAuthored(DOCKET, { nowIso: T0 });
  s = applyAct(s, "strike", { partId: "collect", authored: DOCKET, nowIso: T1 }).state;
  assert.equal(s.parts.find((p) => p.id === "collect").state, PART.STRUCK);
  assert.match(s.parts.find((p) => p.id === "collect").strikeNote, /nothing in the bubble/);
  s = applyAct(s, "reveal", { partId: "requisition", authored: DOCKET, nowIso: T1 }).state;
  assert.deepEqual(s.parts.map((p) => p.id), ["second-period", "collect", "requisition", "back-by-1900"]);
  assert.equal(s.parts.find((p) => p.id === "requisition").by, "Manako's idea");
});

test("a second press of the same chip changes nothing", () => {
  const s = fromAuthored(DOCKET, { nowIso: T0 });
  const once = applyAct(s, "tick", { partId: "second-period", nowIso: T1 });
  assert.equal(once.changed, true);
  const twice = applyAct(once.state, "tick", { partId: "second-period", nowIso: T2 });
  assert.equal(twice.changed, false);
  assert.equal(twice.state, once.state);
  const reveal = applyAct(applyAct(s, "reveal", { partId: "requisition", authored: DOCKET, nowIso: T1 }).state, "reveal", { partId: "requisition", authored: DOCKET, nowIso: T2 });
  assert.equal(reveal.changed, false);
});

test("acts never mutate the state they were given", () => {
  const s = fromAuthored(DOCKET, { nowIso: T0 });
  const frozen = JSON.stringify(s);
  applyAct(s, "tick", { partId: "collect", nowIso: T1 });
  applyAct(s, "close", { nowIso: T1, record: "x" });
  assert.equal(JSON.stringify(s), frozen);
});

test("only required parts count, and a struck one stops counting", () => {
  let s = fromAuthored(DOCKET, { nowIso: T0 });
  assert.deepEqual(progress(s), { done: 0, total: 3 });
  s = applyAct(s, "strike", { partId: "collect", authored: DOCKET, nowIso: T1 }).state;
  s = applyAct(s, "reveal", { partId: "tell-manako", authored: DOCKET, nowIso: T1 }).state;
  assert.deepEqual(progress(s), { done: 0, total: 2 }, "the struck part goes, the optional one never counted");
  s = applyAct(s, "tick", { partId: "second-period", nowIso: T1 }).state;
  assert.deepEqual(progress(s), { done: 1, total: 2 });
});

test("closing keeps the record, and the optional parts left open become loose ends", () => {
  let s = fromAuthored(DOCKET, { nowIso: T0 });
  s = applyAct(s, "reveal", { partId: "tell-manako", authored: DOCKET, nowIso: T1 }).state;
  s = applyAct(s, "close", { nowIso: T2, scene: "The Tram Back", record: "It went in before nineteen hundred." }).state;
  assert.equal(s.status, STATUS.DONE);
  const rec = recordModel([s]);
  assert.equal(rec.entries[0].record, "It went in before nineteen hundred.");
  assert.deepEqual(rec.looseEnds, [{ text: "Go back and tell Manako how it went", by: "Manako asked", from: "Collect the levelling bubble" }]);
  assert.equal(trackerModel([s]).count, 0, "a closed objective leaves the tracker");
});

test("the more-to-this line appears only where the author asked for it, and goes when nothing is hidden", () => {
  assert.equal(fromAuthored(DOCKET, { nowIso: T0 }).more, false, "the docket's twist must not be hinted");
  let d = fromAuthored(DRAINS, { nowIso: T0 });
  assert.equal(d.more, true);
  for (const id of ["wear-them", "power", "feed", "report"]) d = applyAct(d, "reveal", { partId: id, authored: DRAINS, nowIso: T1 }).state;
  assert.equal(d.more, false);
});

test("deadlines read the world's clock, in quarters", () => {
  const dl = { day: 1, quarter: "evening" };
  assert.equal(deadlineState(dl, { day: 1, quarter: "afternoon" }), "ahead");
  assert.equal(deadlineState(dl, { day: 1, quarter: "evening" }), "due");
  assert.equal(deadlineState(dl, { day: 1, quarter: "night" }), "past");
  assert.equal(deadlineState(dl, { day: 2, quarter: "morning" }), "past");
  assert.equal(deadlineState(null, { day: 1, quarter: "night" }), "none");
});

test("the tracker leads with the section's soonest deadline, then the player's own", () => {
  const a = fromAuthored(ENROL, { nowIso: T0 });
  const b = fromAuthored(DOCKET, { nowIso: T1 });
  assert.equal(defaultTracked([a, b]).id, ENROL.id, "Monday morning comes before 19:00 that evening");
  const mine = { ...fromAuthored({ ...DOCKET, id: "x", scope: "character" }, { nowIso: T2, owner: { userId: "u1", name: "Ren" } }) };
  assert.equal(defaultTracked([mine, { ...b, deadline: null }]).id, "x");
  const model = trackerModel([b, a], { userId: "u1", trackedId: DOCKET.id, size: "lines" });
  assert.equal(model.items[0].id, DOCKET.id, "a player's own choice comes first");
  assert.equal(model.tracked.id, DOCKET.id);
});

test("the tracker shows the section's and this player's own, never another character's", () => {
  const section = fromAuthored(ENROL, { nowIso: T0 });
  const ren = fromAuthored({ ...DOCKET, id: "ren", scope: "character" }, { nowIso: T0, owner: { userId: "u1", name: "Ren" } });
  const etsuko = fromAuthored({ ...DOCKET, id: "etsuko", scope: "character" }, { nowIso: T0, owner: { userId: "u2", name: "Etsuko" } });
  const ids = trackerModel([section, ren, etsuko], { userId: "u1" }).items.map((i) => i.id);
  assert.deepEqual(ids.sort(), [ENROL.id, "ren"].sort());
  const journal = journalModel([section, ren, etsuko], { userId: "u1" });
  assert.deepEqual(journal.groups.map((g) => g.key), ["section", "mine", "others"], "the Journal shows everyone's, grouped");
});

test("a fight folds the tracker to its tab, and the chosen size comes back after", () => {
  assert.equal(shownSize("explained", { inCombat: true }), "folded");
  assert.equal(shownSize("explained", { inCombat: false }), "explained");
  assert.equal(shownSize("nonsense"), "lines");
  assert.deepEqual(SIZES, ["folded", "lines", "explained"]);
  assert.equal(nextSize("folded"), "lines");
  assert.equal(nextSize("explained"), "folded");
});

test("what changed since the player last looked lights the lamp, newest first, two at most", () => {
  const a = fromAuthored(ENROL, { nowIso: T0 });
  const closed = applyAct(a, "close", { nowIso: T2 }).state;
  const b = fromAuthored(DOCKET, { nowIso: T2 });
  const c = changesSince([closed, b], T1);
  assert.deepEqual(c.map((x) => x.kind).sort(), ["done", "new"]);
  assert.equal(changesSince([a], T1).length, 0, "nothing new since the last look");
  const model = trackerModel([closed, b], { lastSeenIso: T1 });
  assert.equal(model.lit, true);
  assert.equal(model.ribbons.length, 2);
});

test("a player's own objective is not filed without a giver, a reason and one required part", () => {
  assert.deepEqual(validateDraft({}), ["giver", "why", "required"]);
  assert.deepEqual(validateDraft({ giverName: "Ren", why: "Trouble", required: ["", "  "] }), ["required"]);
  assert.deepEqual(validateDraft({ giverName: "Ren", why: "Trouble", required: ["Find out who Rand is"] }), []);
});

test("a filed draft: own if the giver is the writer's character, a request or an order otherwise", () => {
  const base = { why: "Trouble for the section", required: ["Find out who Rand is"], optional: ["Before Vetch does"] };
  const own = draftToState({ ...base, giverName: "Ren" }, { userId: "u1", ownerName: "Ren", nowIso: T0 });
  assert.equal(own.kind, "own");
  assert.equal(own.source, "player");
  assert.equal(own.title, "Find out who Rand is");
  assert.deepEqual(own.parts.map((p) => p.need), ["required", "optional"]);
  assert.equal(draftToState({ ...base, giverName: "Taka" }, { userId: "u1", ownerName: "Ren", nowIso: T0 }).kind, "request");
  assert.equal(draftToState({ ...base, giverName: "Nobu", wasOrder: true }, { userId: "u1", ownerName: "Ren", nowIso: T0 }).kind, "order");
});

test("ownership: given ones are read-only; Section Nine's own any player may write; only me is not shown", () => {
  assert.deepEqual(pageOwnership(fromAuthored(DOCKET, { nowIso: T0 })), { default: LEVELS.OBSERVER });
  const base = { giverName: "Ren", why: "w", required: ["r"] };
  assert.deepEqual(pageOwnership(draftToState({ ...base, scope: "group" }, { userId: "u1", ownerName: "Ren" })), { default: LEVELS.OWNER });
  assert.deepEqual(pageOwnership(draftToState(base, { userId: "u1", ownerName: "Ren" })), { default: LEVELS.OBSERVER, u1: LEVELS.OWNER });
  const priv = draftToState({ ...base, visibility: "owner" }, { userId: "u1", ownerName: "Ren" });
  assert.deepEqual(pageOwnership(priv), { default: LEVELS.NONE, u1: LEVELS.OWNER });
  assert.equal(canSee(priv, { userId: "u2" }), false);
  assert.equal(canSee(priv, { userId: "u1" }), true);
  assert.equal(canSee(priv, { userId: "gm", isGM: true }), true);
  const group = draftToState({ ...base, scope: "group", visibility: "owner" }, { userId: "u1", ownerName: "Ren" });
  assert.equal(group.visibility, "all", "a section objective cannot be hidden from the section");
});

test("only the GM changes a given objective; players change their own", () => {
  const given = fromAuthored(DOCKET, { nowIso: T0 });
  assert.equal(canEdit(given, { userId: "u1" }), false);
  assert.equal(canEdit(given, { isGM: true }), true);
  const base = { giverName: "Ren", why: "w", required: ["r"] };
  const mine = draftToState(base, { userId: "u1", ownerName: "Ren" });
  assert.equal(canEdit(mine, { userId: "u1" }), true);
  assert.equal(canEdit(mine, { userId: "u2" }), false);
  assert.equal(canEdit(draftToState({ ...base, scope: "group" }, { userId: "u1", ownerName: "Ren" }), { userId: "u2" }), true);
  assert.equal(isMine(mine, { userId: "u1" }), true);
});

test("the entry lets players add pages, and its repair only ever raises levels", () => {
  const data = objectivesEntryData({ id: "abc" });
  assert.equal(data.ownership.default, LEVELS.OWNER);
  assert.equal(data.flags["blank-inheritance"].sourceId, OBJECTIVES_SOURCE_ID);
  assert.equal(entryOwnershipRepair({ default: 3 }), null);
  assert.deepEqual(entryOwnershipRepair({ default: 2, u1: 0, u2: 3 }), { default: 3, u1: 3 });
});

test("the page carries the state and a readable copy with nothing unescaped", () => {
  const s = draftToState({ giverName: "<b>Ren</b>", why: "w", required: ["<script>x</script>"] }, { userId: "u1", ownerName: "Ren" });
  const data = pageCreateData(s, { id: "0123456789abcdef" });
  assert.equal(data.flags["blank-inheritance"][OBJECTIVE_FLAG], s);
  assert.ok(!pageHtml(s).includes("<script>"));
  assert.ok(!pageHtml(s).includes("<b>Ren"));
});

test("the harvest export names writers, keeps closing paragraphs, and is in giving order", () => {
  const a = applyAct(fromAuthored(ENROL, { nowIso: T0 }), "close", { nowIso: T1, record: "Enrolled." }).state;
  const own = draftToState({ giverName: "Ren", why: "w", required: ["r"] }, { userId: "u1", ownerName: "Ren", nowIso: T2 });
  const out = exportPayload([own, a], { users: [{ id: "u1", name: "Kim" }], now: 0 });
  assert.equal(out.kind, "bi-objectives");
  assert.deepEqual(out.objectives.map((o) => o.id), [ENROL.id, own.id]);
  assert.equal(out.objectives[0].record, "Enrolled.");
  assert.equal(out.objectives[1].writer, "Kim");
});
