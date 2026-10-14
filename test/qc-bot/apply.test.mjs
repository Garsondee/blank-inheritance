// Applying a report (tools/qc-bot/apply.mjs), the branch guard (guard.mjs) and the report as Markdown (report.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { REPORTS_DIR, fullPath, readJson, writeJson } from "../../tools/qc-bot/lib.mjs";
import { applyReport, rereadRevision } from "../../tools/qc-bot/apply.mjs";
import { guardBranch, guardEntries } from "../../tools/qc-bot/guard.mjs";
import { renderReport } from "../../tools/qc-bot/report.mjs";
import { markApplied, recordDecision, readDecisions } from "../../tools/qc-bot/decisions.mjs";
import { finalizeReport } from "../../tools/qc-bot/proposals.mjs";
import { CHALLENGE_ID, SCENE_ID, cleanup, gitify, makeReport, makeRepo, routeProposal } from "./fixture.mjs";

const CH = `canon/challenges/${CHALLENGE_ID}.json`;
const SC = `canon/scenes/${SCENE_ID}.json`;
const quiet = { build: false, check: false };

function setup() {
  const root = makeRepo();
  const report = finalizeReport(makeReport());
  const file = `${REPORTS_DIR}/${SCENE_ID}/2026-10-14-1.json`;
  writeJson(root, file, report);
  return { root, report, file };
}

test("applying chosen proposals changes only those files, in the repo's own JSON style", () => {
  const { root, report } = setup();
  const before = fs.readFileSync(fullPath(root, SC), "utf8");
  const out = applyReport({ root, report, ids: [routeProposal().id], ...quiet });
  assert.deepEqual(out.applied.map((a) => a.id), [routeProposal().id]);
  assert.deepEqual(readJson(root, CH).checks[0].skillOptions, ["crafting", "perception", "society"]);
  assert.equal(readJson(root, CH).checks[0].bySkill.society, "Forms like this one are issued by one office.");
  assert.equal(fs.readFileSync(fullPath(root, SC), "utf8"), before, "the other proposal's file is untouched");
  assert.ok(fs.readFileSync(fullPath(root, CH), "utf8").endsWith("}\n"));
  cleanup(root);
});

test("applying twice is harmless: the second time everything is already in place", () => {
  const { root, report } = setup();
  applyReport({ root, report, all: true, ...quiet });
  const again = applyReport({ root, report, all: true, ...quiet });
  assert.equal(again.failed.length, 0);
  assert.equal(again.applied.length, 2);
  cleanup(root);
});

test("a line changed since the bot looked is reported as a clash and the file is left alone", () => {
  const { root, report } = setup();
  const sc = readJson(root, SC);
  sc.beats[1].text = "Ingram rewrote the exit herself.";
  writeJson(root, SC, sc);
  const out = applyReport({ root, report, all: true, ...quiet });
  assert.deepEqual(out.applied.map((a) => a.id), [routeProposal().id]);
  assert.equal(out.failed.length, 1);
  assert.equal(out.failed[0].results[0].status, "clash");
  assert.equal(readJson(root, SC).beats[1].text, "Ingram rewrote the exit herself.");
  cleanup(root);
});

test("a dry run writes nothing", () => {
  const { root, report } = setup();
  const before = fs.readFileSync(fullPath(root, CH), "utf8");
  const out = applyReport({ root, report, all: true, dryRun: true, ...quiet });
  assert.equal(out.applied.length, 2);
  assert.equal(fs.readFileSync(fullPath(root, CH), "utf8"), before);
  cleanup(root);
});

test("asking for a proposal that is not in the report is reported, not ignored", () => {
  const { root, report } = setup();
  assert.deepEqual(applyReport({ root, report, ids: ["nope"], ...quiet }).unknown, ["nope"]);
  cleanup(root);
});

test("merging what she accepted stamps it applied and adds a revision to the re-read record, with her words", () => {
  const { root, report } = setup();
  fs.writeFileSync(fullPath(root, `canon/scenes/${SCENE_ID}.reread.md`), "# Re-read: Test\n");
  fs.writeFileSync(fullPath(root, "canon/reread.md"), "# The re-read\n\nversion 4 · 2026-10-12\n");
  recordDecision(root, { proposalId: report.proposals[0].id, decision: "accept", note: "Yes, but keep it short." });
  recordDecision(root, { proposalId: report.proposals[1].id, decision: "decline", note: "I prefer the short one." });
  const out = applyReport({ root, report, ids: [report.proposals[0].id], reread: true, hashOf: () => "after-hash", today: "2026-10-20", ...quiet });
  assert.equal(out.applied.length, 1);
  assert.equal(readDecisions(root).get(report.proposals[0].id).applied.hashAfter, "after-hash");
  const text = fs.readFileSync(fullPath(root, `canon/scenes/${SCENE_ID}.reread.md`), "utf8");
  assert.match(text, /## Revision 2026-10-20: changes from the QC bot's review \(qc-test-scene-2026-10-14-1\)/);
  assert.match(text, /version 4/);
  assert.match(text, /\*\*A third way to read the form\.\*\*/);
  assert.match(text, /Ingram: "Yes, but keep it short\."/);
  assert.match(text, /Declined \(the bot will not raise these again\): Say how they leave/);
  cleanup(root);
});

test("the revision entry reads as the other revision entries do", () => {
  const r = makeReport();
  const entry = rereadRevision({ report: r, applied: [r.proposals[0]], date: "2026-10-20", version: 4 });
  assert.match(entry, /^\n## Revision 2026-10-20/);
  assert.match(entry, /state: awaiting Ingram's read/);
});

test("the bot commits one proposal per commit, only on a qc/ branch", { skip: false }, () => {
  const { root, report, file } = setup();
  if (!gitify(root, null)) return; // no git here: nothing to prove
  assert.throws(() => applyReport({ root, report, reportFile: file, all: true, commitEach: true, ...quiet }), /Refusing to commit on "master"/);
  spawnSync("git", ["checkout", "-q", "-b", "qc/2026-10-14-test"], { cwd: root });
  const out = applyReport({ root, report, reportFile: file, all: true, commitEach: true, hashOf: () => "h2", ...quiet });
  assert.equal(out.applied.length, 2);
  assert.ok(out.applied.every((a) => /^[0-9a-f]{40}$/.test(a.commit)));
  const log = spawnSync("git", ["log", "--format=%an|%s", "-3"], { cwd: root, encoding: "utf8" }).stdout.trim().split("\n");
  assert.match(log[0], /^QC Bot\|qc\(test-scene\): Say how they leave \[test-scene-1014-2-exit\]$/);
  assert.match(log[1], /^QC Bot\|qc\(test-scene\): A third way to read the form/);
  const saved = readJson(root, file);
  assert.deepEqual(saved.result.applied, [routeProposal().id, "test-scene-1014-2-exit"]);
  assert.equal(saved.result.hashAfter, "h2");
  assert.ok(saved.proposals[0].commit, "each proposal records its commit");
  cleanup(root);
});

test("the branch guard allows reports, scenes and their checks, built copies, new people and the roster; nothing else", () => {
  const ok = [
    ["A", "reviews/qc/reports/kit-issue/2026-10-14-1.json"],
    ["M", "canon/scenes/episode-c1e1--kit-issue.json"],
    ["M", "canon/challenges/c1e1-kit-issue.json"],
    ["M", "data/scene-briefs/episode-c1e1--kit-issue.json"],
    ["M", "data/challenges/c1e1-kit-issue.json"],
    ["A", "data/npcs/kiku.json"],
    ["M", "data/campaign/npc-roster.json"],
    ["M", "data/campaign/told-facts.json"],
  ];
  assert.deepEqual(guardEntries(ok.map(([status, path]) => ({ status, path }))), []);
  const bad = [
    ["A", "canon/scenes/a-brand-new-scene.json"],
    ["D", "canon/scenes/episode-c1e1--kit-issue.json"],
    ["M", "canon/scenes/episode-c1e1--kit-issue.reread.md"],
    ["M", "canon/world/nobu.md"],
    ["M", "canon/decisions/D087-x.md"],
    ["M", "canon/plan/chapter-01.md"],
    ["M", "data/npcs/nobu.json"],
    ["M", "tools/story/lib.mjs"],
    ["M", "module/blank-inheritance/module.json"],
    ["M", "reviews/qc/decisions/anything.json"],
    ["M", "CLAUDE.md"],
  ];
  const problems = guardEntries(bad.map(([status, path]) => ({ status, path })));
  assert.equal(problems.length, bad.length, problems.join("\n"));
});

test("the guard can look at a branch without checking it out, so its changes never reach the working tree", () => {
  const root = makeRepo();
  if (!gitify(root, null)) return;
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  git("checkout", "-q", "-b", "qc/x");
  const sc = readJson(root, SC);
  sc.notes = "More prep.";
  writeJson(root, SC, sc);
  fs.mkdirSync(fullPath(root, "tools"), { recursive: true });
  fs.writeFileSync(fullPath(root, "tools/evil.mjs"), "x");
  git("add", "-A");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "x");
  git("checkout", "-q", "master");
  const { entries, problems } = guardBranch(root, "master", "qc/x");
  assert.deepEqual(entries.map((e) => e.status + " " + e.path).sort(), ["A tools/evil.mjs", "M canon/scenes/test-scene.json"]);
  assert.equal(problems.length, 1);
  assert.ok(problems[0].includes("tools/evil.mjs"), problems[0]);
  assert.equal(fs.existsSync(fullPath(root, "tools/evil.mjs")), false, "master's working tree was never changed");
  cleanup(root);
});

test("the Markdown report gives the full context for each decision and shows the exact words that change", () => {
  const md = renderReport(makeReport({ npcCheck: { people: [{ npcRef: "clerk", file: true, statblock: true, roster: true, portrait: "registered", notes: "" }], gaps: [] }, chores: [{ title: "Tidy", done: true, detail: "Done." }], leftAlone: [{ what: "The ending", why: "It is the scene's direction." }], changelog: ["Society added to the form check"] }));
  for (const must of ["# QC report: Test Scene", "## How this scene works", "Why the players come:", "### 1. A third way to read the form", "**Right now:**", "**What I'd do:**", "**Your call:**", "{+society+}", "They [-leave.-]{+head out into the yard with the form.+}", "## The people in this scene", "| clerk | yes |", "## What I left alone, and why", "## If you accept everything"]) {
    assert.ok(md.includes(must), `missing: ${must}\n${md}`);
  }
  assert.match(renderReport(makeReport({ proposals: [] })), /I would run it as it is/);
});
