/**
 * The gate's parsers (tools/episode-confidence/core/gate-parse.mjs), each against output in the shape its real tool prints (captured
 * 2026-10-07 from story.mjs, audit.mjs, journeys.mjs, apply.mjs --check, console.mjs --json and the test runner), plus one real run of
 * the cheap tools so a change in what they print fails here rather than silently emptying the gate.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseJourneys, parseNpcCheck, parseSceneAudit, parseSignoffBoard, parseStoryCheck, parseTestRun } from "../../tools/episode-confidence/core/gate-parse.mjs";
import { episodeFacts, runGate } from "../../tools/episode-confidence/gate.mjs";

const briefIds = ["episode-c1e1--the-road-in", "episode-c1e1--canteen"];
const titleToBrief = { "The Road In": "episode-c1e1--the-road-in", Canteen: "episode-c1e1--canteen" };

test("story check: errors become S1 findings on their scene; notes are only counted", () => {
  const out = [
    "note   scenes/rest--the-roof.json: cast npcRef faruq is not in canon yet",
    "note   scenes/episode-c1e1--canteen.json: locationRef long-hall is not in canon yet",
    "error  scenes/episode-c1e1--the-road-in.json: fact gate-sergeant is told in c1e2 but this scene states it",
    "",
    "1 error(s), 2 note(s)."
  ].join("\n");
  const r = parseStoryCheck(out, 1, { briefIds });
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, "S1");
  assert.equal(r.findings[0].scene, "episode-c1e1--the-road-in");
  assert.match(r.summary, /1 error\(s\), 2 note\(s\), 1 of them on this episode's scenes/);
  assert.equal(parseStoryCheck("0 error(s), 0 note(s).", 0).findings.length, 0);
  assert.equal(parseStoryCheck("boom", 2).findings.length, 1, "a failing exit with no error line is still reported");
});

test("scene audit: canon scenes are skipped by the audit and the summary says so; listed findings are read", () => {
  const skipped = "\nepisode-c1e1--the-road-in — in canon/: checked by its re-read (canon/scenes/episode-c1e1--the-road-in.reread.md), not this audit\n\n=== 0 findings across 12 scenes ===\n";
  const a = parseSceneAudit(skipped, 0);
  assert.equal(a.findings.length, 0);
  assert.match(a.summary, /0 finding\(s\) across 12 scenes; 1 scene\(s\) are in canon/);
  const listed = "\nCanteen — 2 findings\n--------------------\n  [tracks] no temptations -- nothing always-visible to reach for\n  [voice] Taka has no sample line\n\n=== 2 findings across 1 scenes ===\n";
  const b = parseSceneAudit(listed, 0, { titleToBrief });
  assert.equal(b.findings.length, 2);
  assert.equal(b.findings[0].scene, "episode-c1e1--canteen");
  assert.match(b.findings[1].summary, /^\[voice\] Taka/);
  assert.equal(parseSceneAudit("nothing", 1).findings.length, 1);
});

test("journeys: warnings are S2 and errors S1, each with its scene and its suggested fix; notes are left out", () => {
  const out = [
    "# Journeys: Mother's Maiden Name (Again)",
    "Verdict: needs attention",
    "12 scenes · 29 journeys",
    "",
    "## Errors (1)",
    "- [no-place] The Canteen has no place on the map.",
    "    where: scene \"Canteen\" · slot destination",
    "    try: Pin it on the map.",
    "## Warnings (1)",
    "- [water-stop] Tokens would stand in the water at The North Shore Town, 16 m from land.",
    "    where: scene \"The Road In\" · slot destination:episode-c1e1--the-road-in:coast-road",
    "    try: Drop a pin on the shore, or pick a building.",
    "## Notes (3)",
    "- [area-stop] something minor"
  ].join("\n");
  const r = parseJourneys(out, 1, { titleToBrief });
  assert.deepEqual(r.findings.map((f) => [f.severity, f.scene]), [["S1", "episode-c1e1--canteen"], ["S2", "episode-c1e1--the-road-in"]]);
  assert.equal(r.findings[1].proposal.text, "Drop a pin on the shore, or pick a building.");
  assert.equal(r.summary, "needs attention");
});

test("npc check: clean is nothing, a difference is one S2", () => {
  assert.equal(parseNpcCheck("all 57 statblocks are what the roster generates", 0).findings.length, 0);
  assert.equal(parseNpcCheck("taka: AC 15 -> 16", 1).findings[0].severity, "S2");
});

test("sign-off board: each required failing check on this episode is a finding, and so is a scene with no place", () => {
  const board = {
    checklistVersion: 7,
    rows: [
      { episodeId: "ep", briefRef: "episode-c1e1--the-road-in", title: "The Road In", live: false, sited: false, locationWaived: false, checks: { blockers: [
        { id: "M2", severity: "required", state: "fail", question: "Does intro carry where, firstThing and readAloud?", detail: "intro missing: readAloud", why: "A scene with no authored first thing starts with the GM thinking." },
        { id: "Q9", severity: "recommended", state: "fail", question: "?" },
        { id: "M3", severity: "required", state: "pass", question: "?" }
      ] } },
      { episodeId: "other", briefRef: "x", title: "X", sited: false, checks: { blockers: [{ id: "M2", severity: "required", state: "fail", question: "?" }] } }
    ]
  };
  const r = parseSignoffBoard(board, { episodeId: "ep" });
  assert.deepEqual(r.findings.map((f) => f.summary), ["Sign-Off M2 fails: Does intro carry where, firstThing and readAloud? (intro missing: readAloud)", '"The Road In" has no location on the map']);
  assert.equal(r.checklistVersion, 7);
  assert.match(r.summary, /1 recommended/);
});

test("the test run: failures named, a green run silent", () => {
  const red = "✔ a (1ms)\n✖ b breaks (2ms)\nℹ tests 2\nℹ pass 1\nℹ fail 1\n✖ failing tests:\n\ntest at test/x.test.mjs:1:1\n✖ b breaks (2ms)\n";
  const r = parseTestRun(red, 1);
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].summary, /fails \(1 test\(s\)\): b breaks/);
  assert.equal(parseTestRun("ℹ tests 5\nℹ pass 5\nℹ fail 0\n", 0).findings.length, 0);
});

test("the real gate runs on Episode One and reads every tool (without the slow test suite)", () => {
  const facts = episodeFacts("episode-c1e1-mothers-maiden-name");
  assert.equal(facts.briefIds.length, 12);
  const r = runGate({ tests: false });
  assert.deepEqual(r.tools.map((t) => t.name), ["story check", "scene audit", "journeys", "npc check", "sign-off board"]);
  for (const t of r.tools) assert.notEqual(t.summary, "unreadable", `${t.name}'s output could not be read`);
  for (const f of r.findings) assert.equal(f.channel, "gate");
});
