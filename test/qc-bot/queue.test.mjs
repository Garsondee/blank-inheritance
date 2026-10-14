// The QC bot's work queue (tools/qc-bot/queue.mjs): the scenes about to be run, in play order; never the ones waiting on Ingram.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOT, writeJson, REPORTS_DIR } from "../../tools/qc-bot/lib.mjs";
import { buildQueue, reviewStatus, routeStats } from "../../tools/qc-bot/queue.mjs";
import { loadModel } from "../../tools/qc-bot/model.mjs";
import { recordDecision } from "../../tools/qc-bot/decisions.mjs";
import { cleanup, makeRepo } from "./fixture.mjs";

const EP = "Episode One: Test";
const row = (order, scene, state = "awaiting-read", episode = EP) => ({ file: "chapter-01.md", episode, order, title: scene, scene, day: 1, dayRaw: "1", time: "morning", state, note: "" });
const scene = (id, extra = {}) => ({ id, raw: JSON.stringify({ id, ...extra }), json: { id, title: id, beats: [], cast: [], ...extra } });

function stubModel(root) {
  return {
    root,
    plan: [row(0, "scene-a"), row(1, "scene-b", "approved"), row(2, "scene-c"), row(3, "scene-d", "awaiting-read", "Somewhere Else"), row(4, "scene-e", "old-draft")],
    scenes: [scene("scene-a"), scene("scene-b"), scene("scene-d"), scene("scene-e")],
    challenges: [],
    world: [],
    chapters: [],
  };
}

const focus = { episodes: [EP] };

test("only the in-focus scenes that are written and ready to read are in the queue, in play order", () => {
  const root = makeRepo();
  const q = buildQueue(stubModel(root), { root, focus });
  assert.deepEqual(q.scenes.map((s) => s.id), ["scene-a", "scene-b"]);
  assert.deepEqual(q.next, ["scene-a", "scene-b"]);
  assert.equal(q.scenes[1].lane, "review-approved", "an approved scene is reviewed but flagged");
  assert.deepEqual(q.unwritten.map((u) => u.id), ["scene-c"], "planned but not written is listed, never written by the bot");
  assert.equal(q.skipped, 2);
  cleanup(root);
});

test("everything skipped says why", () => {
  const root = makeRepo();
  const q = buildQueue(stubModel(root), { root, focus, includeAll: true });
  const by = Object.fromEntries(q.scenes.map((s) => [s.id, s.skip]));
  assert.match(by["scene-d"], /outside focus \(Somewhere Else\)/);
  assert.match(by["scene-e"], /plan says old-draft/);
  assert.equal(by["scene-a"], null);
  cleanup(root);
});

test("a scene's status follows its reports and what Ingram decided", () => {
  const status = (reports, decisions, hash, reviewed) => reviewStatus({ sceneId: "s", hash, reports: reports.map((r) => ({ report: { scene: "s", ...r } })), decisions: new Map(decisions), reviewed: new Set(reviewed) });
  const props = [{ id: "p1", kind: "route" }, { id: "p2", kind: "prose" }];
  assert.equal(status([], [], "h1", []), "never-reviewed");
  assert.equal(status([{ proposals: props }], [], "h1", ["h1"]), "waiting-on-ingram", "undecided proposals");
  assert.equal(status([{ proposals: props }], [["p1", { decision: "accept" }], ["p2", { decision: "discuss" }]], "h1", ["h1"]), "waiting-on-ingram", "flagged to discuss");
  assert.equal(status([{ proposals: props }], [["p1", { decision: "accept" }], ["p2", { decision: "decline" }]], "h1", ["h1"]), "reviewed");
  assert.equal(status([{ proposals: props }], [["p1", { decision: "accept" }], ["p2", { decision: "decline" }]], "h2", ["h1"]), "changed-since-review");
  assert.equal(status([{ proposals: [{ id: "n", kind: "note" }] }], [], "h1", ["h1"]), "reviewed", "a note needs no decision");
});

test("a scene reviewed twice with nothing accepted goes quiet until it changes", () => {
  const r = (n) => ({ report: { scene: "s", id: `r${n}`, proposals: [{ id: `p${n}`, kind: "route" }] } });
  const declined = new Map([["p1", { decision: "decline" }], ["p2", { decision: "decline" }]]);
  assert.equal(reviewStatus({ sceneId: "s", hash: "h", reports: [r(1), r(2)], decisions: declined, reviewed: new Set(["h"]) }), "stable");
  assert.equal(reviewStatus({ sceneId: "s", hash: "h2", reports: [r(1), r(2)], decisions: declined, reviewed: new Set(["h"]) }), "changed-since-review");
  const one = new Map([["p1", { decision: "decline" }], ["p2", { decision: "accept" }]]);
  assert.equal(reviewStatus({ sceneId: "s", hash: "h", reports: [r(1), r(2)], decisions: one, reviewed: new Set(["h"]) }), "reviewed");
});

test("the queue moves a scene out of the bot's hands while a report waits, and back when the scene changes", () => {
  const root = makeRepo();
  const model = stubModel(root);
  const hash = buildQueue(model, { root, focus }).scenes[0].hash;
  writeJson(root, `${REPORTS_DIR}/scene-a/2026-10-14-1.json`, { kind: "qc-report", id: "qc-scene-a-2026-10-14-1", scene: "scene-a", generatedAt: "2026-10-14T10:00:00Z", sceneHash: hash, proposals: [{ id: "scene-a-1", kind: "prose", title: "t", fingerprint: "f" }] });
  let q = buildQueue(model, { root, focus });
  assert.equal(q.scenes[0].status, "waiting-on-ingram");
  assert.deepEqual(q.next, ["scene-b"], "the bot moves on to the next scene");
  recordDecision(root, { proposalId: "scene-a-1", decision: "decline", note: "No thanks." });
  q = buildQueue(model, { root, focus });
  assert.equal(q.scenes[0].status, "reviewed");
  assert.deepEqual(q.next, ["scene-b"]);
  model.scenes[0] = scene("scene-a", { goal: "Changed since the review." });
  q = buildQueue(model, { root, focus });
  assert.equal(q.scenes[0].status, "changed-since-review");
  assert.deepEqual(q.next, ["scene-a", "scene-b"]);
  cleanup(root);
});

test("routes: checks that take any skill are counted apart, and thin means two routes or fewer", () => {
  const model = {
    challenges: [{ id: "c", json: { checks: [{ id: "a", skillOptions: ["x"] }, { id: "b", skillOptions: ["x", "y", "z"] }, { id: "c", anySkill: true, skillOptions: [] }, { id: "d", skillOptions: ["x", "y"] }] } }],
  };
  assert.deepEqual(routeStats(model, { json: { beats: [{ challengeRef: "c" }, { challengeRef: "c" }, { text: "no check" }] } }), { closedChecks: 3, openChecks: 1, thinChecks: 2, minRoutes: 1 });
  assert.deepEqual(routeStats(model, { json: { beats: [] } }), { closedChecks: 0, openChecks: 0, thinChecks: 0, minRoutes: null });
});

test("the real repo: the queue is Episode One's written scenes in play order, and no haunt is in it", () => {
  const model = loadModel(ROOT);
  const q = buildQueue(model, { root: ROOT });
  assert.ok(q.scenes.length >= 1, "something to review");
  const orders = q.scenes.map((s) => s.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  for (const s of q.scenes) {
    assert.equal(s.episode, q.focus.episodes[0]);
    assert.ok(!/^(rest|discovery)--/.test(s.id), `${s.id} is a haunt, which is outside the focus`);
    assert.match(s.hash, /^[0-9a-f]{16}$/);
  }
  const all = buildQueue(model, { root: ROOT, includeAll: true });
  assert.ok(all.scenes.length > q.scenes.length, "the haunts and later episodes exist, and are skipped for a reason");
  assert.ok(all.scenes.filter((s) => s.skip).every((s) => s.skip.length > 3));
});
