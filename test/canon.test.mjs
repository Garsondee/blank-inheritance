// The canon tree (design/story-data-refactor.md, canon/README.md), 2026-09-27.
//
// Two layers. First, the real tree passes every rule. Second, each rule is proven to fire on a small synthetic
// model, so a rule that quietly stops working fails here rather than letting old or unapproved material through.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadModel, openDecisionsFile, checkModel, parseMeta, parseWorld, parseDecision, parsePlan, sceneHash, citations, TIMES, quarterForTime, syncQuarters, ROOT, STATUSES, VERBS, DECISION_KINDS } from "../tools/story/lib.mjs";
import { resolveAlias } from "../tools/story/merges.mjs";

test("the real canon tree passes every rule", () => {
  const errors = checkModel(loadModel()).filter((p) => p.level === "error");
  assert.deepEqual(errors.map((p) => `${p.where}: ${p.message}`), []);
});

test("every decision from the old log has its own file, and new ones carry Ingram's words", () => {
  const m = loadModel();
  const ids = m.decisions.map((d) => d.id);
  for (let n = 1; n <= 49; n++) assert.ok(ids.includes("D" + String(n).padStart(3, "0")), `D${n} is missing`);
  // An import record and a merge record are Claude's, so they carry none of her words (and are never authority for ink).
  for (const d of m.decisions.filter((x) => !x.split && x.kind !== "import" && x.kind !== "merge")) assert.ok(d.quotes > 0, `${d.id} has no quoted words from Ingram`);
});

test("Scene 0 is the first scene in the plan, and it is in canon", () => {
  const m = loadModel();
  assert.equal(m.plan[0].scene, "episode-c1e1--from-up-here");
  assert.ok(m.scenes.some((s) => s.id === "episode-c1e1--from-up-here"));
});

test("every scene in both episodes has a rough time of day in the plan", () => {
  const m = loadModel();
  // Episode One is the twelve scenes it was, with the Road In split into the letter, six Ways In and the gate, and the Errand
  // split into its hub, three optional stops, the tea house and the hearing (D085): 24 rows. Episode Two gained one scene.
  assert.equal(m.plan.filter((r) => r.scene.startsWith("episode-c1e1--")).length, 24);
  assert.equal(m.plan.filter((r) => r.scene.startsWith("episode-c1e2--")).length, 16);
});

test("every scene of Book I is in the plan with a note that says why the table comes to it and where it leads (D085)", () => {
  const m = loadModel();
  const book = m.plan.filter((r) => /^episode-c[1-4]e\d--/.test(r.scene) && !/^episode-c1e1--(from-up-here)$/.test(r.scene));
  assert.ok(book.length >= 70, `${book.length} Book I scenes planned`);
  const bare = book.filter((r) => !r.note).map((r) => r.scene);
  assert.deepEqual(bare, [], "every Book I scene row carries its note");
  const noNext = book.filter((r) => !/(Next|Leads|Learn):/.test(r.note)).map((r) => r.scene);
  assert.deepEqual(noNext, [], "every note says where the scene leads or what it teaches");
  const chapters = new Set(book.map((r) => r.file));
  assert.deepEqual([...chapters].sort(), ["chapter-01.md", "chapter-02.md", "chapter-03.md", "chapter-04.md"]);
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

test("REAL DATA: Flood Tunnel Clearance's fight and its compactor are rebuilt in canon (D058)", () => {
  const m = loadModel();
  assert.ok(m.encounters.some((e) => e.id === "c1e1-flood-tunnel"), "canon/encounters/c1e1-flood-tunnel.json");
  assert.ok(m.subsystems.some((s) => s.id === "c1e1-compactor-cycle"), "canon/subsystems/c1e1-compactor-cycle.json");
  // The built copies are exact: "the real canon tree passes every rule" fails on any difference.
  assert.ok("data/encounters/c1e1-flood-tunnel.json" in m.built);
  assert.ok("data/subsystems/c1e1-compactor-cycle.json" in m.built);
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

test("a plan row keeps its note: what happens, why the table comes to it, what they choose, where it leads", () => {
  const rows = parsePlan(["## Chapter 2", "| 1 | The Tug Yard | `c2--tug-yard` | — | flexible | unwritten | Arrive: the first request. // Do: raid it. // Next: the report. |", "| 2 | The Report | `c2--report` | — | flexible | unwritten |  |"].join("\n"), "chapter-02.md");
  assert.equal(rows[0].note, "Arrive: the first request. // Do: raid it. // Next: the report.");
  assert.equal(rows[1].note, "");
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
  const m = model({ sceneRaw: JSON.stringify({ note: "see quarantine/ideas/story/dossier-cicada.md" }) });
  assert.ok(errors(m).some((e) => /points at old material/.test(e)));
});

test("a beat's fight and hazard count as canon once rebuilt there; until then they are only a note", () => {
  const beats = [{ id: "b", encounterRef: "e1-fight", subsystemRef: "e1-clock" }];
  const notes = (m) => checkModel(m).filter((p) => p.level === "warn").map((p) => p.message);
  const outside = model({ beats });
  assert.ok(notes(outside).some((n) => /encounterRef e1-fight is not in canon yet/.test(n)));
  assert.ok(notes(outside).some((n) => /subsystemRef e1-clock is not in canon yet/.test(n)));
  const inside = {
    ...model({ beats }),
    encounters: [{ file: "e1-fight.json", id: "e1-fight", json: {}, raw: "{}" }],
    subsystems: [{ file: "e1-clock.json", id: "e1-clock", json: {}, raw: "{}" }],
  };
  assert.deepEqual(notes(inside).filter((n) => /e1-fight|e1-clock/.test(n)), []);
  assert.deepEqual(errors(inside), []);
});

test("a canon encounter or subsystem may not point at old material either", () => {
  const raw = JSON.stringify({ notes: "see quarantine/ideas/story/bible/species/mitflits.md" });
  assert.ok(errors({ ...model(), encounters: [{ file: "e.json", id: "e", json: {}, raw }] }).some((e) => /points at old material/.test(e)));
  assert.ok(errors({ ...model(), subsystems: [{ file: "s.json", id: "s", json: {}, raw }] }).some((e) => /points at old material/.test(e)));
});

test("a scene's approval covers the fight it runs, not only its checks", () => {
  const beats = [{ id: "b", encounterRef: "e1-fight" }];
  const withFight = (raw) => ({ ...model({ beats }), encounters: [{ file: "e1-fight.json", id: "e1-fight", json: {}, raw }] });
  assert.notEqual(sceneHash(withFight('{"count":6}'), "s0"), sceneHash(withFight('{"count":8}'), "s0"));
  // A scene with no fight and no checks hashes exactly as it always has (its own text alone), so no older approval
  // goes stale because fights started being covered.
  const plain = model({ beats: [{ id: "b" }] });
  const before = crypto.createHash("sha256").update(plain.scenes[0].raw).digest("hex").slice(0, 16);
  assert.equal(sceneHash(plain, "s0"), before);
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

// ---- ink and pencil (D070): only Episode One and the induction are ink; everything else is pencil until Ingram has
// gone through it. Pencil never reaches play material, and only a decision in her words raises a status.

const importRecord = { id: "D071", file: "D071.md", split: false, kind: "import", quotes: 0, changes: [] };
const ingram = (id, changes = []) => ({ id, file: `${id}.md`, split: false, kind: "decision", quotes: 1, changes });

test("a world file's Pencil line divides ink from pencil", () => {
  const w = parseWorld(["# Manako", "kind: person", "", "## manako.name", "He is Manako.", "status: decided · source: D034 · known: some · told: start", "", "## Pencil", "", "## manako.sap", "He makes Sap.", "status: sketch · by: claude · source: D071 · known: nobody · told: later", ""].join("\n"), "manako");
  assert.deepEqual(w.facts.map((f) => [f.id, f.zone, f.by]), [["manako.name", "ink", null], ["manako.sap", "pencil", "claude"]]);
  assert.equal(w.pencilLine, 7);
  assert.throws(() => parseWorld("# M\n\n## Pencil\nwords\n", "m"), /stands alone/);
});

test("pencil needs its author and its place below the line", () => {
  const ok = fact("x.y", { status: "sketch", by: "claude", source: ["D071"], zone: "pencil", told: "later" });
  assert.deepEqual(errors(model({ facts: [ok], decisions: [importRecord] })), []);
  assert.ok(errors(model({ facts: [{ ...ok, by: null }], decisions: [importRecord] })).some((e) => /pencil needs "by: ingram" or "by: claude"/.test(e)));
  assert.ok(errors(model({ facts: [{ ...ok, zone: "ink" }], decisions: [importRecord] })).some((e) => /below the file's "## Pencil" line/.test(e)));
  assert.ok(errors(model({ facts: [fact("x.y", { zone: "pencil" })] })).some((e) => /only pencil and open facts go below/.test(e)));
  assert.ok(errors(model({ facts: [fact("x.y", { by: "claude" })] })).some((e) => /only for pencil/.test(e)));
});

test("her words, not Claude's import, are what make anything ink", () => {
  assert.ok(errors(model({ facts: [fact("x.y", { source: ["D071"] })], decisions: [importRecord] })).some((e) => /an import record is not one/.test(e)));
  const hers = fact("x.y", { status: "sketch", by: "ingram", source: ["D071"], zone: "pencil", told: "later" });
  assert.ok(errors(model({ facts: [hers], decisions: [importRecord] })).some((e) => /"by: ingram" must cite/.test(e)));
  assert.ok(errors(model({ decisions: [{ ...importRecord, changes: [{ verb: "decide", target: "x.y", rest: "" }] }], facts: [fact("x.y", { source: ["D071"] })] })).some((e) => /only brings material in as pencil/.test(e)));
});

test("play material never cites pencil: not a scene's beats, not an objective", () => {
  const p = fact("x.y", { status: "sketch", by: "claude", source: ["D071"], zone: "pencil", told: "later" });
  assert.ok(errors(model({ facts: [p], decisions: [importRecord], beats: [{ id: "b", gmFacts: ["x.y"] }] })).some((e) => /which is pencil/.test(e)));
  const withObjective = { ...model({ facts: [p], decisions: [importRecord] }), objectives: [{ file: "o.json", id: "o", json: { facts: ["x.y"] }, raw: "{}" }] };
  assert.ok(checkModel(withObjective).some((x) => x.level === "error" && x.where === "objectives/o.json" && /which is pencil/.test(x.message)));
});

test("a status raised by hand fails: the latest decision about an item sets what it must be", () => {
  const pencilled = ingram("D070", [{ verb: "pencil", target: "x.y", rest: "" }]);
  const sketched = fact("x.y", { status: "sketch", by: "ingram", source: ["D068", "D070"], zone: "pencil", told: "later" });
  const base = [ingram("D068")];
  assert.deepEqual(errors(model({ facts: [sketched], decisions: [...base, pencilled] })), []);
  const handRaised = { ...sketched, status: "decided", by: null, zone: "ink" };
  assert.ok(errors(model({ facts: [handRaised], decisions: [...base, pencilled] })).some((e) => /expected status sketch, found decided: only a decision in Ingram's words/.test(e)));
  const inked = ingram("D073", [{ verb: "decide", target: "x.y", rest: "" }]);
  assert.deepEqual(errors(model({ facts: [{ ...handRaised, source: ["D068", "D070", "D073"] }], decisions: [...base, pencilled, inked] })), []);
  // An import's "add" expects pencil (or an open question), so its items can't be raised by hand either.
  const imported = { ...importRecord, changes: [{ verb: "add", target: "x.y", rest: "" }] };
  const raised = fact("x.y", { source: ["D071", "D068"], told: "later" });
  assert.ok(errors(model({ facts: [raised], decisions: [...base, imported] })).some((e) => /expected status sketch or open/.test(e)));
});

test("a payoff names a real fact, told no earlier than its plant", () => {
  assert.ok(errors(model({ facts: [fact("x.plant", { payoff: "x.nowhere" })] })).some((e) => /payoff x\.nowhere is not a canon fact/.test(e)));
  const warnings = checkModel(model({ facts: [fact("x.plant", { payoff: "x.paid", told: "later" }), fact("x.paid", { told: "start" })] })).filter((p) => p.level === "warn").map((p) => p.message);
  assert.ok(warnings.some((w) => /pays off .* before it is planted/.test(w)));
});

test("every when reads, and anchors resolve", () => {
  assert.ok(errors(model({ facts: [fact("x.y", { when: "in the olden days" })] })).some((e) => /when: .*isn't a when/.test(e)));
  assert.ok(errors(model({ facts: [fact("x.y", { when: "1 year after x.z" })] })).some((e) => /has no when/.test(e)));
  assert.deepEqual(errors(model({ facts: [fact("x.y", { when: "about 10 years after x.z" }), fact("x.z", { when: "about 200 years ago" })] })), []);
});

test("a scene's approval covers the words of every fact it cites (D070)", () => {
  const words = (text) => model({ facts: [fact("x.y", { text })], beats: [{ id: "b", gmFacts: ["x.y"] }] });
  assert.notEqual(sceneHash(words("One."), "s0"), sceneHash(words("Two."), "s0"));
});

test("a decision record may be an import or a timeline day; an import needs no quotes but no other kind exists", () => {
  const d = parseDecision(["# D071 · 2026-10-07 · The Casebook comes into canon as pencil", "kind: import", "", "## Changes", "", "- add `x.y`"].join("\n"), "D071.md");
  assert.equal(d.kind, "import");
  assert.equal(parseDecision("# D099 · 2026-10-01 · A test\n\n## Ingram\n\n> \"Yes.\"\n", "D099.md").kind, "decision");
  assert.deepEqual(errors(model({ decisions: [{ ...importRecord }] })), []);
  assert.ok(errors(model({ decisions: [{ ...importRecord, kind: "rumour" }] })).some((e) => /unknown kind/.test(e)));
});

test("canon/README.md documents every status, verb and decision kind the check knows", () => {
  const readme = fs.readFileSync(path.join(ROOT, "canon", "README.md"), "utf8");
  for (const s of STATUSES) assert.ok(readme.includes(`\`${s}\``), `README is missing status ${s}`);
  for (const v of VERBS) assert.ok(readme.includes(`\`${v}`), `README is missing verb ${v}`);
  for (const k of DECISION_KINDS.filter((k) => k !== "decision")) assert.ok(readme.includes(`kind: ${k}`), `README is missing decision kind ${k}`);
  assert.match(readme, /## The filing rules/);
});

test("open-decisions.json is every open fact in canon, in the shape the Approvals Desk reads, and nothing else (D079)", () => {
  const m = {
    world: [
      { id: "a", title: "Alpha", facts: [
        { id: "a.one", text: "Which is it?", status: "open", candidates: ["x", "y"], decideBy: "before Chapter 3" },
        { id: "a.two", text: "Settled.", status: "decided", candidates: [] },
        { id: "a.three", text: "Pencil.", status: "sketch", candidates: [] },
        { id: "a.four", text: "Cut.", status: "cut", candidates: [] },
      ] },
      { id: "b", title: "The Beta", facts: [{ id: "b.one", text: "When?", status: "open", candidates: [], decideBy: null }] },
    ],
  };
  const doc = JSON.parse(openDecisionsFile(m));
  assert.equal(doc.id, "open-decisions");
  assert.deepEqual(doc.questions, [
    { id: "a.one", question: "Which is it?", status: "open", about: "Alpha", candidates: ["x", "y"], decideBy: "before Chapter 3" },
    { id: "b.one", question: "When?", status: "open", about: "The Beta", candidates: [], decideBy: null },
  ]);
  assert.ok(openDecisionsFile(m).endsWith("\n"));
});

test("REAL DATA: every open fact in canon is in open-decisions.json (story build keeps it so), and no story question is open in two places", () => {
  const model = loadModel();
  const built = model.built["data/campaign/open-decisions.json"];
  assert.ok(built, "story build owns data/campaign/open-decisions.json");
  assert.equal(built.copy?.replace(/\r\n/g, "\n"), built.source, "run: node tools/story/story.mjs build");
  const openFacts = new Set(model.world.flatMap((e) => e.facts).filter((f) => f.status === "open").map((f) => f.id));
  assert.deepEqual(new Set(JSON.parse(built.source).questions.map((q) => q.id)), openFacts);
  // A question that moved to canon is closed in the old file and names facts that exist.
  const old = JSON.parse(fs.readFileSync(path.join(ROOT, "data/campaign/open-questions.json"), "utf8")).questions;
  const known = new Set(model.world.flatMap((e) => e.facts).map((f) => f.id));
  for (const q of old.filter((x) => x.canon)) {
    assert.equal(q.status, "resolved", `${q.id} moved to canon, so it is closed here`);
    // A fact a merge absorbed (D081 on) still resolves: it is named through the item that holds its words now.
    assert.ok(q.canon.length && q.canon.every((id) => known.has(resolveAlias(model.aliases, id))), `${q.id} names canon facts that exist`);
  }
  assert.ok(old.filter((q) => q.status === "open").length < 25, "what stays open in the old file is design and mechanics, not story");
});
