// Tier 1 — the GM's objectives board (design/objectives.md §6), against Episode One's real briefs and objectives.
//
// What these protect: the chips are read from every beat, the intro and the outro, in play order; "up next" names the
// scene whose chip ticks each open part, and shows the GM the hidden parts still to come; "still to give" lists the
// objectives later scenes give; "might go" catches a part no later scene ticks, a passed deadline, the players' own and
// loose ends; and "just happened" is every change, newest first.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { boardModel, chipIndex, justHappened, MIGHT_LABEL_KEYS } from "../module/blank-inheritance/scripts/core/objectives-board.mjs";
import { applyAct, draftToState, fromAuthored } from "../module/blank-inheritance/scripts/core/objectives.mjs";

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../data/${p}.json`, import.meta.url), "utf8"));
const episode = read("episodes/episode-c1e1-mothers-maiden-name");
const briefs = episode.scenes.filter((s) => s.briefRef).map((s, i) => ({ id: s.briefRef, title: s.title, order: s.order ?? i, brief: read(`scene-briefs/${s.briefRef}`) }));
const chips = chipIndex(briefs);
const authored = Object.fromEntries(["c1e1-report-for-enrolment", "c1e1-the-docket", "c1e1-storm-drains"].map((id) => [id, read(`objectives/${id}`)]));
const T = (h) => `2026-10-04T${String(h).padStart(2, "0")}:00:00.000Z`;

test("the chips are read from beats and the intro, in play order", () => {
  const gives = chips.filter((c) => c.act === "give").map((c) => c.objectiveRef);
  assert.deepEqual(gives, ["c1e1-report-for-enrolment", "c1e1-the-docket", "c1e1-storm-drains"]);
  assert.ok(chips.some((c) => c.beatId === "intro" && c.partRef === "report"), "Intake Medicals' intro ticks the gate");
  const orders = chips.map((c) => c.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
});

test("before anything is given: nothing open, all three still to give, nothing quiet", () => {
  const b = boardModel({ chips, authored, currentSceneRef: "episode-c1e1--the-road-in" });
  assert.deepEqual(b.toGive.map((t) => t.objectiveId), ["c1e1-report-for-enrolment", "c1e1-the-docket", "c1e1-storm-drains"]);
  assert.equal(b.toGive[1].scene, "Kit Issue");
  assert.equal(b.upNext.length, 0);
  assert.equal(b.mightGo.length, 0);
});

test("up next names the scene whose chip ticks each open part, and shows the GM the hidden parts to come", () => {
  const docket = fromAuthored(authored["c1e1-the-docket"], { nowIso: T(14), scene: "Kit Issue" });
  const b = boardModel({ states: [docket], chips, authored, currentSceneRef: "episode-c1e1--kit-issue" });
  const row = b.upNext[0];
  const where = Object.fromEntries(row.parts.map((p) => [p.id, p.scene]));
  assert.equal(where["second-period"], "School: Second Period");
  assert.equal(where.collect, "The Errand", "struck there");
  assert.equal(where["back-by-1900"], "The Tram Back");
  const hidden = row.parts.filter((p) => p.hidden).map((p) => p.id);
  assert.deepEqual(hidden, ["requisition", "tell-manako"], "the GM sees what is still hidden, and where it will be revealed");
  assert.equal(b.toGive.map((t) => t.objectiveId).join(), "c1e1-storm-drains", "enrolment was given before Kit Issue's chips, so only the drains are left");
});

test("might go: a part no later scene ticks, a passed deadline, the players' own, and loose ends", () => {
  let docket = fromAuthored(authored["c1e1-the-docket"], { nowIso: T(14) });
  docket = applyAct(docket, "reveal", { partId: "tell-manako", authored: authored["c1e1-the-docket"], nowIso: T(15) }).state;
  // Past every scene that ticks "back-by-1900", at night, still open:
  const b = boardModel({ states: [docket], chips, authored, currentSceneRef: "episode-c1e1--flood-tunnel", moment: { day: 1, quarter: "night" } });
  const kinds = b.mightGo.map((m) => m.kind);
  assert.ok(kinds.includes("overdue"), "19:00 has passed");
  assert.ok(kinds.includes("stalled"), "no later scene ticks its parts");
  assert.equal(kinds[0], "overdue", "the most urgent first");
  for (const m of b.mightGo) assert.equal(m.labelKey, MIGHT_LABEL_KEYS[m.kind]);

  const closed = applyAct(docket, "close", { nowIso: T(18), record: "In." }).state;
  const own = draftToState({ giverName: "Ren", why: "w", required: ["Find out who Rand is"] }, { userId: "u1", ownerName: "Ren", nowIso: T(20) });
  const b2 = boardModel({ states: [closed, own], chips, authored, currentSceneRef: "episode-c1e1--flood-tunnel" });
  assert.deepEqual(b2.mightGo.map((m) => m.kind).filter((k) => k !== "skipped").sort(), ["loose", "players"]);
  assert.equal(b2.mightGo.find((m) => m.kind === "loose").text, "Go back and tell Manako how it went");
});

test("might go: an objective whose giving scene has gone by without it being given", () => {
  const docket = fromAuthored(authored["c1e1-the-docket"], { nowIso: T(14) });
  const b = boardModel({ states: [docket], chips, authored, currentSceneRef: "episode-c1e1--kit-issue" });
  const skipped = b.mightGo.filter((m) => m.kind === "skipped");
  assert.deepEqual(skipped.map((m) => [m.objectiveId, m.text]), [["c1e1-report-for-enrolment", "The Road In"]]);
});

test("just happened: every change, newest first", () => {
  let d = fromAuthored(authored["c1e1-the-docket"], { nowIso: T(10), scene: "Kit Issue" });
  d = applyAct(d, "tick", { partId: "second-period", nowIso: T(11) }).state;
  d = applyAct(d, "strike", { partId: "collect", authored: authored["c1e1-the-docket"], nowIso: T(12) }).state;
  d = applyAct(d, "log", { text: "There is no such part.", scene: "The Errand", nowIso: T(13) }).state;
  d = applyAct(d, "close", { nowIso: T(14), scene: "The Tram Back" }).state;
  assert.deepEqual(justHappened([d]).map((e) => e.kind), ["closed", "learned", "strike", "tick", "given"]);
  assert.equal(justHappened([d], { max: 2 }).length, 2);
});
