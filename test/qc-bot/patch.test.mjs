// The QC bot's patches (tools/qc-bot/patch.mjs): the same merge Ingram's own Scene Runner edits use, so a changed line is a clash and never an overwrite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyOps, opDiff, opProblem, parseOpPath, pathText, pathsOverlap, show } from "../../tools/qc-bot/patch.mjs";
import { challengeDoc, sceneDoc } from "./fixture.mjs";

const CH = "canon/challenges/c1-test.json";
const SC = "canon/scenes/test-scene.json";
const docs = () => ({ [CH]: challengeDoc(), [SC]: sceneDoc() });

test("paths: names, list items by id, positions, and hyphenated keys", () => {
  assert.deepEqual(parseOpPath("checks[read-the-form].bySkill.society"), ["checks", { id: "read-the-form" }, "bySkill", "society"]);
  assert.deepEqual(parseOpPath("intro.carriesIn#0.when"), ["intro", "carriesIn", { index: 0 }, "when"]);
  assert.deepEqual(parseOpPath("checks[a].bySkill.academia-lore"), ["checks", { id: "a" }, "bySkill", "academia-lore"]);
  assert.deepEqual(parseOpPath(["bySkill", "academia-lore", { id: "x" }]), ["bySkill", "academia-lore", { id: "x" }]);
  assert.equal(pathText("checks[read-the-form].skillOptions"), "checks[read-the-form].skillOptions");
  for (const bad of ["", ".a", "a..b", "a[", 5, null, []]) assert.throws(() => parseOpPath(bad), undefined, JSON.stringify(bad));
});

test("paths overlap when one is the same place as, or inside, the other", () => {
  assert.ok(pathsOverlap("checks[a].bySkill", "checks[a].bySkill.society"));
  assert.ok(pathsOverlap("checks[a].bySkill.society", "checks[a].bySkill"));
  assert.ok(!pathsOverlap("checks[a].skillOptions", "checks[a].bySkill.society"));
  assert.ok(!pathsOverlap("checks[a].dc", "checks[b].dc"));
});

test("set: merged, then already, and nothing in the input is touched", () => {
  const input = docs();
  const op = { op: "set", file: SC, path: "beats[the-exit].text", before: "They leave.", after: "They go." };
  const first = applyOps(input, [op]);
  assert.equal(first.results[0].status, "merged");
  assert.equal(first.docs[SC].beats[1].text, "They go.");
  assert.equal(input[SC].beats[1].text, "They leave.", "the caller's document must not change");
  const again = applyOps(first.docs, [op]);
  assert.equal(again.results[0].status, "already");
  assert.ok(again.ok);
});

test("set: a line that has changed since the bot looked is a clash and is not overwritten", () => {
  const input = docs();
  input[SC].beats[1].text = "Ingram rewrote this.";
  const r = applyOps(input, [{ op: "set", file: SC, path: "beats[the-exit].text", before: "They leave.", after: "They go." }]);
  assert.equal(r.results[0].status, "clash");
  assert.equal(r.results[0].current, "Ingram rewrote this.");
  assert.equal(r.docs[SC].beats[1].text, "Ingram rewrote this.");
  assert.ok(!r.ok);
});

test("set: a key that does not exist yet can be added with before: null, including a hyphenated one", () => {
  const r = applyOps(docs(), [
    { op: "set", file: CH, path: "checks[read-the-form].bySkill.society", before: null, after: "Society line." },
    { op: "set", file: CH, path: ["checks", { id: "read-the-form" }, "bySkill", "academia-lore"], before: null, after: "Lore line." },
  ]);
  assert.ok(r.ok);
  assert.equal(r.docs[CH].checks[0].bySkill.society, "Society line.");
  assert.equal(r.docs[CH].checks[0].bySkill["academia-lore"], "Lore line.");
});

test("set: a parent that is not there cannot be placed", () => {
  const r = applyOps(docs(), [{ op: "set", file: SC, path: "beats[no-such-beat].text", before: "x", after: "y" }]);
  assert.equal(r.results[0].status, "unplaceable");
  assert.match(r.results[0].reason, /no-such-beat/);
});

test("set: a whole list compares by value", () => {
  const ok = applyOps(docs(), [{ op: "set", file: CH, path: "checks[read-the-form].skillOptions", before: ["crafting", "perception"], after: ["crafting", "perception", "society"] }]);
  assert.equal(ok.results[0].status, "merged");
  const stale = applyOps(docs(), [{ op: "set", file: CH, path: "checks[read-the-form].skillOptions", before: ["crafting"], after: ["crafting", "society"] }]);
  assert.equal(stale.results[0].status, "clash");
});

test("insert: into a list of objects by id, once, and a different item with the same id is a clash", () => {
  const item = { id: "t2", text: "A pigeon gets in." };
  const op = { op: "insert", file: SC, path: "temptations", item, afterId: "t1" };
  const first = applyOps(docs(), [op]);
  assert.equal(first.results[0].status, "merged");
  assert.deepEqual(first.docs[SC].temptations.map((t) => t.id), ["t1", "t2"]);
  assert.equal(applyOps(first.docs, [op]).results[0].status, "already");
  const clash = applyOps(first.docs, [{ ...op, item: { id: "t2", text: "Something else." } }]);
  assert.equal(clash.results[0].status, "clash");
});

test("insert: starts a list that does not exist yet, and de-duplicates plain values", () => {
  const input = docs();
  delete input[SC].temptations;
  const first = applyOps(input, [{ op: "insert", file: SC, path: "temptations", item: { id: "t1", text: "First." } }]);
  assert.equal(first.docs[SC].temptations.length, 1);
  const strings = applyOps(docs(), [
    { op: "insert", file: CH, path: "checks[read-the-form].skillOptions", item: "society" },
    { op: "insert", file: CH, path: "checks[read-the-form].skillOptions", item: "society" },
  ]);
  assert.deepEqual(strings.results.map((r) => r.status), ["merged", "already"]);
  assert.deepEqual(strings.docs[CH].checks[0].skillOptions, ["crafting", "perception", "society"]);
});

test("insert: a list named by another field (the NPC roster's npcId) is de-duplicated by that field", () => {
  const roster = "data/campaign/npc-roster.json";
  const input = { [roster]: { people: [{ npcId: "nobu", archetype: "skilled-professional" }] } };
  const person = { npcId: "kiku", archetype: "trainee" };
  const op = { op: "insert", file: roster, path: "people", item: person, idKey: "npcId" };
  const first = applyOps(input, [op]);
  assert.equal(first.results[0].status, "merged");
  assert.equal(first.docs[roster].people.length, 2);
  assert.equal(applyOps(first.docs, [op]).results[0].status, "already");
  assert.equal(applyOps(first.docs, [{ ...op, item: { npcId: "kiku", archetype: "veteran-officer" } }]).results[0].status, "clash");
});

test("remove: by id, and gone already is not a failure", () => {
  const op = { op: "remove", file: SC, path: "temptations", itemId: "t1" };
  const first = applyOps(docs(), [op]);
  assert.equal(first.results[0].status, "merged");
  assert.equal(first.docs[SC].temptations.length, 0);
  assert.equal(applyOps(first.docs, [op]).results[0].status, "already");
});

test("create: a new file, the same file again, and a different file in the way", () => {
  const op = { op: "create", file: "data/npcs/kiku.json", content: { id: "kiku", type: "npc" } };
  const first = applyOps({}, [op]);
  assert.equal(first.results[0].status, "merged");
  assert.deepEqual(first.created, ["data/npcs/kiku.json"]);
  assert.equal(applyOps(first.docs, [op]).results[0].status, "already");
  assert.equal(applyOps({ "data/npcs/kiku.json": { id: "kiku", type: "creature" } }, [op]).results[0].status, "clash");
});

test("an operation that is the wrong shape says so before it touches anything", () => {
  assert.match(opProblem({ op: "frobnicate", file: SC }), /unknown operation/);
  assert.match(opProblem({ op: "set", file: SC, path: "goal", after: "x" }), /before/);
  assert.match(opProblem({ op: "set", file: SC, path: "id", before: "a", after: "b" }), /identity/);
  assert.match(opProblem({ op: "set", file: SC, path: "authoring.status", before: "drafted", after: "live" }), /lifecycle/);
  assert.match(opProblem({ op: "insert", file: SC, path: "temptations" }), /item/);
  assert.match(opProblem({ op: "remove", file: SC, path: "temptations" }), /itemId/);
  assert.match(opProblem({ op: "create", file: "x.json", content: [] }), /object/);
  assert.equal(opProblem({ op: "set", file: SC, path: "goal", before: null, after: "x" }), null);
  const r = applyOps(docs(), [{ op: "set", file: SC, path: "authoring.status", before: "drafted", after: "live" }]);
  assert.equal(r.results[0].status, "unplaceable");
});

test("a reader sees the words that change", () => {
  const segs = opDiff({ op: "set", before: "They leave.", after: "They head out." });
  assert.deepEqual(segs.map((s) => s.op), ["same", "del", "add"]);
  assert.equal(show(["crafting", "perception"]), "crafting, perception");
  assert.equal(show(null), "");
  assert.equal(show({ crafting: "A worn bar.", society: "Paperwork." }), "crafting: A worn bar.\nsociety: Paperwork.", "the per-skill lines of a check read as name: line, not as JSON");
  assert.equal(show({ a: 1 }), '{"a":1}');
});
