// The canon tree (design/story-data-refactor.md, canon/README.md), 2026-09-27.
//
// Two layers. First, the real tree passes every rule. Second, each rule is proven to fire on a small synthetic
// model, so a rule that quietly stops working fails here rather than letting old or unapproved material through.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadModel, checkModel, parseMeta, parseWorld, parseDecision, parsePlan, sceneHash, citations, TIMES, quarterForTime, syncQuarters, ROOT } from "../tools/story/lib.mjs";

test("the real canon tree passes every rule", () => {
  const errors = checkModel(loadModel()).filter((p) => p.level === "error");
  assert.deepEqual(errors.map((p) => `${p.where}: ${p.message}`), []);
});

test("every decision from the old log has its own file, and new ones carry Ingram's words", () => {
  const m = loadModel();
  const ids = m.decisions.map((d) => d.id);
  for (let n = 1; n <= 49; n++) assert.ok(ids.includes("D" + String(n).padStart(3, "0")), `D${n} is missing`);
  for (const d of m.decisions.filter((x) => !x.split)) assert.ok(d.quotes > 0, `${d.id} has no quoted words from Ingram`);
});

test("Scene 0 is the first scene in the plan, and it is in canon", () => {
  const m = loadModel();
  assert.equal(m.plan[0].scene, "episode-c1e1--from-up-here");
  assert.ok(m.scenes.some((s) => s.id === "episode-c1e1--from-up-here"));
});

test("every scene in both episodes has a rough time of day in the plan", () => {
  const m = loadModel();
  assert.equal(m.plan.filter((r) => r.scene.startsWith("episode-c1e1--")).length, 12);
  assert.equal(m.plan.filter((r) => r.scene.startsWith("episode-c1e2--")).length, 15);
});

// The plan's rough time of day, down to the campaign's own four-quarter day ring (design/ux-doctrine.md §3/§7a),
// asked for 2026-09-28: "it makes more sense for this to be an automatic thing that happens once players start a
// new scene." module/blank-inheritance/scripts/foundry/scene-runner.mjs#advanceMomentTo reads what this writes.
test("every one of the plan's own times maps to a quarter, or deliberately to none", () => {
  for (const t of TIMES) assert.doesNotThrow(() => quarterForTime(t), t);
  assert.equal(quarterForTime("early morning"), "morning");
  assert.equal(quarterForTime("late morning"), "morning");
  assert.equal(quarterForTime("midday"), "afternoon");
  assert.equal(quarterForTime("evening"), "evening");
  assert.equal(quarterForTime("night"), "night");
  assert.equal(quarterForTime("flexible"), null, "a scene with no fixed time must never force the clock");
  assert.equal(quarterForTime("unknown"), null);
  assert.throws(() => quarterForTime("teatime"), /not one of TIMES/);
});

test("REAL DATA: data/episodes/*.json already matches the plan's day and quarter for every scene", () => {
  const model = loadModel();
  assert.deepEqual(syncQuarters(model, ROOT), [], "run `node tools/story/story.mjs quarters` and commit the result");
});

test("REAL DATA: From Up Here (Scene 0) has no day or quarter -- nothing ever closes into it, so it must never force the clock", () => {
  const episode = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "episodes", "episode-c1e1-mothers-maiden-name.json"), "utf8"));
  const scene0 = episode.scenes.find((s) => s.id === "from-up-here");
  assert.ok(scene0);
  assert.equal("day" in scene0, false);
  assert.equal("quarter" in scene0, false);
});

test("REAL DATA: every other Episode One scene has a real day and quarter the ring understands", () => {
  const episode = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "episodes", "episode-c1e1-mothers-maiden-name.json"), "utf8"));
  const missing = episode.scenes.filter((s) => s.id !== "from-up-here" && s.briefRef && !(Number.isInteger(s.day) && ["morning", "afternoon", "evening", "night"].includes(s.quarter)));
  assert.deepEqual(missing.map((s) => s.id), []);
});

// ---- parsers

test("a fact's detail line splits into its parts", () => {
  assert.deepEqual(parseMeta("status: decided · source: D024, D025 · known: everyone · told: start"), { status: "decided", source: "D024, D025", known: "everyone", told: "start" });
});

test("Ingram's source records load beside the decisions", () => {
  const m = loadModel();
  assert.ok(m.sources.some((s) => s.id === "S001"), "S001, the First Impact dossier as first filed");
});

test("a world file yields its facts, beliefs and notes", () => {
  const w = parseWorld([
    "# The four founders", "kind: group", "",
    "## founders.names", "The four are Hyuck, Rupiah, Anabala and Shucks Mordant.", "status: decided · source: D024 · known: everyone", "",
    "## founders.painting-true-to-life", "The painting is true to life.", "status: proposal · source: s0 · known: everyone · held-by: most of Kurose · true: no · truth: founders.names", "",
    "## Notes", "How to play them.",
  ].join("\n"), "founders");
  assert.equal(w.title, "The four founders");
  assert.equal(w.kind, "group");
  assert.equal(w.facts.length, 2);
  assert.deepEqual(w.facts[0].source, ["D024"]);
  assert.equal(w.facts[1].heldBy, "most of Kurose");
  assert.equal(w.facts[1].truth, "founders.names");
  assert.equal(w.notes.Notes, "How to play them.");
});

test("a new decision yields its changes and counts Ingram's quoted lines", () => {
  const d = parseDecision(["# D099 · 2026-10-01 · A test", "", "## Ingram", "", "> \"Yes.\"", "", "## Changes", "", "- add `founders.level`", "- approve s0 hash 0123456789abcdef"].join("\n"), "D099.md");
  assert.equal(d.id, "D099");
  assert.equal(d.split, false);
  assert.equal(d.quotes, 1);
  assert.deepEqual(d.changes.map((c) => [c.verb, c.target]), [["add", "founders.level"], ["approve", "s0"]]);
});

test("the plan yields one row per scene with its day, time and state", () => {
  const rows = parsePlan(["## Episode One", "| # | Scene | Id | Day | Time | State | Note |", "|---|---|---|---|---|---|---|", "| 0 | From Up Here | `s0` | — | early morning | awaiting-read | x |", "| 1 | The Road In | `s1` | 0 | morning | old-draft |  |"].join("\n"), "chapter-01.md");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].day, null);
  assert.equal(rows[1].day, 0);
  assert.equal(rows[0].time, "early morning");
  assert.equal(rows[0].episode, "Episode One");
});

// ---- rules, proven on a synthetic model

const fact = (id, extra = {}) => ({ id, entity: id.split(".")[0], text: "Some text.", status: "decided", source: ["D001"], known: "everyone", told: "start", heldBy: null, isTrue: null, truth: null, when: null, retire: [], candidates: [], decideBy: null, ...extra });
function model({ facts = [], beats = [], decisions = [], sources = [], plan, extraScenes = [], liveText = {}, sceneRaw } = {}) {
  const scene = { file: "s0.json", id: "s0", json: { beats }, raw: sceneRaw ?? JSON.stringify({ beats }) };
  const byEntity = {};
  for (const f of facts) (byEntity[f.entity] ||= []).push(f);
  return {
    decisions: [{ id: "D001", file: "D001.md", split: true, quotes: 0, changes: [] }, ...decisions],
    sources,
    world: Object.entries(byEntity).map(([id, fs]) => ({ id, title: id, kind: "thing", facts: fs, notes: {}, raw: "" })),
    plan: plan ?? [{ file: "p.md", scene: "s0", order: 0, day: 1, dayRaw: "1", time: "morning", state: "awaiting-read" }, ...extraScenes.map((s, i) => ({ file: "p.md", scene: s.id, order: i + 1, day: 1, dayRaw: "1", time: "morning", state: "awaiting-read" }))],
    scenes: [scene, ...extraScenes],
    challenges: [],
    built: {},
    liveText,
    oldScenes: new Set(),
  };
}
const errors = (m) => checkModel(m).filter((p) => p.level === "error").map((p) => p.message);

test("a beat may not tell the table a fact the players hear later", () => {
  const m = model({ facts: [fact("rift.cause", { known: "few", told: "later" })], beats: [{ id: "b", facts: ["rift.cause"] }] });
  assert.ok(errors(m).some((e) => /aren't told by this scene/.test(e)));
});

test("common knowledge in Kurose can still be held back from the table (D048)", () => {
  // The founders' names: everyone in the city knows them, and Scene 0 still may not say them.
  const m = model({ facts: [fact("founders.names", { known: "everyone", told: "later" })], beats: [{ id: "b", facts: ["founders.names"] }] });
  assert.ok(errors(m).some((e) => /aren't told by this scene/.test(e)));
});

test("a fact the players hear later is fine in gmFacts", () => {
  const m = model({ facts: [fact("rift.cause", { known: "few", told: "later" })], beats: [{ id: "b", gmFacts: ["rift.cause"] }] });
  assert.deepEqual(errors(m), []);
});

test("a fact told in an earlier scene may be told; one told in a later scene may not", () => {
  const later = { file: "s1.json", id: "s1", json: { beats: [] }, raw: "{}" };
  const ok = model({ facts: [fact("x.y", { told: "in:s0" })], beats: [{ id: "b", facts: ["x.y"] }] });
  assert.deepEqual(errors(ok), []);
  const early = model({ facts: [fact("x.y", { told: "in:s1" })], beats: [{ id: "b", facts: ["x.y"] }], extraScenes: [later] });
  assert.ok(errors(early).some((e) => /aren't told by this scene/.test(e)));
});

test("known and told only take their listed values, and told names a planned scene", () => {
  assert.ok(errors(model({ facts: [fact("x.y", { known: "gm" })] })).some((e) => /unknown "known" value/.test(e)));
  assert.ok(errors(model({ facts: [fact("x.y", { told: "soon" })] })).some((e) => /"told" must be/.test(e)));
  assert.ok(errors(model({ facts: [fact("x.y", { told: "in:nowhere" })] })).some((e) => /isn't in the plan/.test(e)));
});

test("a fact may cite a source record, but only one that exists", () => {
  const s = [{ id: "S001", file: "S001.md", title: "A dossier" }];
  assert.deepEqual(errors(model({ facts: [fact("x.y", { source: ["S001"] })], sources: s })), []);
  assert.ok(errors(model({ facts: [fact("x.y", { source: ["S002"] })], sources: s })).some((e) => /not a source record/.test(e)));
});

test("citing a missing fact, or a cut one, fails", () => {
  assert.ok(errors(model({ beats: [{ id: "b", facts: ["no.such"] }] })).some((e) => /not a canon fact/.test(e)));
  const cut = model({ facts: [fact("watcher.g1-sorters", { status: "cut", retire: ["Sorters"] })], beats: [{ id: "b", gmFacts: ["watcher.g1-sorters"] }] });
  assert.ok(errors(cut).some((e) => /which is cut/.test(e)));
});

test("cut wording that comes back anywhere in live play data fails", () => {
  const m = model({ facts: [fact("watcher.g1-sorters", { status: "cut", retire: ["Sorters"] })], liveText: { "data/scene-briefs/x.json": "The Sorters arrive." } });
  assert.ok(errors(m).some((e) => /retired with watcher\.g1-sorters/.test(e)));
});

test("canon may not point at old material", () => {
  const m = model({ sceneRaw: JSON.stringify({ note: "see ideas/story/dossier-cicada.md" }) });
  assert.ok(errors(m).some((e) => /points at old material/.test(e)));
});

test("a fact's status must match its source", () => {
  assert.ok(errors(model({ facts: [fact("x.y", { status: "decided", source: ["s0"] })] })).some((e) => /must cite the decision/.test(e)));
  assert.ok(errors(model({ facts: [fact("x.y", { status: "provisional", source: ["D001"] })] })).some((e) => /must cite the scene/.test(e)));
  assert.ok(errors(model({ facts: [fact("x.y", { heldBy: "many", isTrue: "no" })] })).some((e) => /must link to the truth/.test(e)));
});

test("a decision's changes must agree with the facts", () => {
  const d = { id: "D002", file: "D002.md", split: false, quotes: 1, changes: [{ verb: "cut", target: "x.y", rest: "" }] };
  const m = model({ facts: [fact("x.y", { source: ["D002"] })], decisions: [d] });
  assert.ok(errors(m).some((e) => /expected status cut/.test(e)));
});

test("an approval goes stale when the scene changes", () => {
  const base = model({ beats: [{ id: "b" }] });
  const hash = sceneHash(base, "s0");
  const approve = { id: "D002", file: "D002.md", split: false, quotes: 1, changes: [{ verb: "approve", target: "s0", rest: `hash ${hash}` }] };
  assert.deepEqual(errors(model({ beats: [{ id: "b" }], decisions: [approve] })), []);
  const edited = model({ beats: [{ id: "b", readAloud: "changed" }], decisions: [approve] });
  assert.ok(errors(edited).some((e) => /changed since this approval/.test(e)));
});

test("a scene marked approved needs a decision approving it", () => {
  const m = model({ plan: [{ file: "p.md", scene: "s0", order: 0, day: 1, dayRaw: "1", time: "morning", state: "approved" }] });
  assert.ok(errors(m).some((e) => /no decision approves it/.test(e)));
});

test("the plan only takes rough times from the list", () => {
  const m = model({ plan: [{ file: "p.md", scene: "s0", order: 0, day: 1, dayRaw: "1", time: "half past nine", state: "awaiting-read" }] });
  assert.ok(errors(m).some((e) => /unknown time/.test(e)));
});

test("every use of a fact is found", () => {
  const m = model({ facts: [fact("x.y")], beats: [{ id: "b", facts: ["x.y"] }, { id: "c", gmFacts: ["x.y"] }] });
  assert.deepEqual(citations(m).get("x.y").map((w) => `${w.at}:${w.as}`), ["b:facts", "c:gmFacts"]);
});
