// Tier 1 — scene edits, the rules (module/blank-inheritance/scripts/core/scene-edits.mjs).
// design/scene-edits.md.
//
// The load-bearing tests in this file are the ones for Ingram's critical
// requirement, 2026-09-27: "things I rewrite don't get overwritten by the old
// content." In the Runner, a pending edit of hers always shows, and a merged
// one comes back the moment the server shows the older words again. In the
// repo, a merge never writes over words she did not see, and the guard names
// every place the repo has gone back to older words.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyRecord,
  changeShare,
  cloneDoc,
  describeRecord,
  diffToText,
  fieldKey,
  findReversions,
  isBehind,
  LEDGER_STATES,
  makeRecord,
  markKey,
  mergeRecord,
  newItemId,
  normalizeText,
  overlayDocs,
  parseFieldKey,
  parsePath,
  pathToString,
  recordFilename,
  recordIdFor,
  recordIdFromFilename,
  resolvePath,
  sameValue,
  sortRecords,
  validateRecord,
  wordDiff
} from "../module/blank-inheritance/scripts/core/scene-edits.mjs";

const FILE = "scene-briefs/episode-t1--scene";
const CHECKS = "challenges/t1-checks";

function brief() {
  return {
    id: "episode-t1--scene",
    title: "A Scene",
    runsAbout: "6 minutes",
    intro: { where: "A room", readAloud: null, carriesIn: [{ when: "always", then: "nothing" }] },
    beats: [
      { id: "one", kind: "action", text: "First", readAloud: "Say the first thing." },
      { id: "two", kind: "action", text: "Second" },
      { id: "three", kind: "action", text: "Third" }
    ],
    outro: { endsWhen: "When it ends", writeDown: ["Line A", "Line B"] },
    temptations: [{ id: "tempt-a", text: "Tempt them" }]
  };
}

let tick = 0;
/** A record with a fresh, increasing time -- the order records are made in. */
function rec(spec) {
  tick += 1;
  const at = new Date(Date.UTC(2026, 8, 27, 18, 0, 0, tick)).toISOString();
  return makeRecord({ file: FILE, briefId: "episode-t1--scene", by: "Ingram", rand: `r${String(tick).padStart(4, "0")}`, at, ...spec });
}

/* --- paths ------------------------------------------------------------- */

test("a path names beats by id and plain lines by position, and round-trips through its string form", () => {
  const cases = [
    ["title", ["title"]],
    ["beats[come-east].readAloud", ["beats", { id: "come-east" }, "readAloud"]],
    ["intro.carriesIn#0.when", ["intro", "carriesIn", { index: 0 }, "when"]],
    ["beats[a].choicePoint.options[opt-1].label", ["beats", { id: "a" }, "choicePoint", "options", { id: "opt-1" }, "label"]],
    ["outro.writeDown#2", ["outro", "writeDown", { index: 2 }]]
  ];
  for (const [text, path] of cases) {
    assert.deepEqual(parsePath(text), path, text);
    assert.equal(pathToString(path), text);
  }
  assert.throws(() => parsePath("beats[BAD ID].text"));
  const key = fieldKey(FILE, ["beats", { id: "one" }, "text"]);
  assert.equal(key, `${FILE}::beats[one].text`);
  assert.deepEqual(parseFieldKey(key), { file: FILE, path: ["beats", { id: "one" }, "text"] });
  assert.deepEqual(parseFieldKey(`${FILE}::`).path, []);
});

test("resolvePath finds a field by id even after the list around it changes, and says plainly when it cannot", () => {
  const doc = brief();
  doc.beats.unshift({ id: "zero", text: "Inserted by someone else" });
  const found = resolvePath(doc, ["beats", { id: "two" }, "text"]);
  assert.equal(found.ok, true);
  assert.equal(found.value, "Second");
  assert.equal(resolvePath(doc, ["beats", { id: "one" }, "direction"]).ok, true, "a field never written is still a place to write");
  const gone = resolvePath(doc, ["beats", { id: "nope" }, "text"]);
  assert.equal(gone.ok, false);
  assert.match(gone.reason, /nope/);
});

/* --- records ----------------------------------------------------------- */

test("a record id sorts by time and its file name carries it back", () => {
  const id = recordIdFor("2026-09-27T15:52:17.978Z", "Lqwcmr");
  assert.equal(id, "20260927T155217978Z-Lqwcmr");
  const record = rec({ op: "set", path: ["title"], before: "A Scene", after: "B" });
  assert.equal(recordIdFromFilename(recordFilename(record)), record.id);
  assert.equal(recordIdFromFilename("chat-2026-09-27.json"), null);
  assert.equal(recordIdFromFilename("storage/scene-edit-20260927T155217978Z-Lqwcmr.json"), "20260927T155217978Z-Lqwcmr");
});

test("an edit may never touch identity, wiring, or the lifecycle fields other systems own", () => {
  for (const path of [["id"], ["beats", { id: "one" }, "id"], ["beats", { id: "one" }, "challengeRef"], ["authoring", "status"], ["$schema"], ["episodeRef"]]) {
    assert.throws(() => rec({ op: "set", path, before: null, after: "x" }), /not something an edit may change/, pathToString(path));
  }
  assert.throws(() => rec({ op: "set", path: ["beats", { id: "one" }], before: null, after: "x" }), /not a whole item/);
  assert.throws(() => rec({ op: "insert", path: ["beats"], afterId: null, item: { id: "new", text: "", challengeRef: "c" } }), /wiring/);
  assert.throws(() => makeRecord({ op: "set", file: "npcs/nobu", briefId: "x", path: ["name"], at: "2026-09-27T00:00:00.000Z", rand: "abcd", before: null, after: "N" }), /scene brief or a check file/);
  assert.deepEqual(validateRecord({}).length > 0, true);
});

test("normalizeText only takes off what a text box adds -- line endings and a trailing blank run -- never her words", () => {
  assert.equal(normalizeText("One.\r\nTwo.  \r\n\r\n"), "One.\nTwo.");
  assert.equal(normalizeText("  Leading space kept."), "  Leading space kept.");
});

test("missing, null and empty are one value, so clearing an empty field is not a clash", () => {
  assert.equal(sameValue(undefined, null), true);
  assert.equal(sameValue("", null), true);
  assert.equal(sameValue("a", "a"), true);
  assert.equal(sameValue({ b: 1, a: 2 }, { a: 2, b: 1 }), true);
  assert.equal(sameValue(0, null), false);
});

/* --- applying: the Runner's view ------------------------------------- */

test("set, insert (after a beat, or at the top), move and remove each land where she put them", () => {
  const doc = brief();
  assert.equal(applyRecord(doc, rec({ op: "set", path: ["beats", { id: "two" }, "text"], before: "Second", after: "Second, rewritten" })).status, "applied");
  assert.equal(doc.beats[1].text, "Second, rewritten");

  applyRecord(doc, rec({ op: "insert", path: ["beats"], afterId: "one", item: { id: "new-a", kind: "action", text: "" } }));
  assert.deepEqual(doc.beats.map((b) => b.id), ["one", "new-a", "two", "three"]);
  applyRecord(doc, rec({ op: "insert", path: ["beats"], afterId: null, item: { id: "new-top", kind: "action", text: "" } }));
  assert.equal(doc.beats[0].id, "new-top");

  applyRecord(doc, rec({ op: "move", path: ["beats"], itemId: "three", afterId: null }));
  assert.equal(doc.beats[0].id, "three");
  applyRecord(doc, rec({ op: "move", path: ["beats"], itemId: "three", afterId: "two" }));
  assert.deepEqual(doc.beats.map((b) => b.id), ["new-top", "one", "new-a", "two", "three"]);

  applyRecord(doc, rec({ op: "remove", path: ["beats"], itemId: "new-top", item: doc.beats[0] }));
  assert.deepEqual(doc.beats.map((b) => b.id), ["one", "new-a", "two", "three"]);

  // Plain lines: appended, and removed by the words she saw, even if they moved.
  applyRecord(doc, rec({ op: "insert", path: ["outro", "writeDown"], atIndex: 2, item: "Line C" }));
  doc.outro.writeDown.unshift("Someone else's line");
  applyRecord(doc, rec({ op: "remove", path: ["outro", "writeDown"], atIndex: 1, item: "Line B" }));
  assert.deepEqual(doc.outro.writeDown, ["Someone else's line", "Line A", "Line C"]);

  // A list nobody had started yet is somewhere to add the first item.
  applyRecord(doc, rec({ op: "insert", path: ["reactionPrompts"], afterId: null, item: { id: "reaction-x", text: "Did it land?" } }));
  assert.equal(doc.reactionPrompts.length, 1);
});

test("a set over words she did not see still shows hers in the Runner, and says it clashed", () => {
  const doc = brief();
  doc.beats[0].text = "Changed by Claude after she looked";
  const result = applyRecord(doc, rec({ op: "set", path: ["beats", { id: "one" }, "text"], before: "First", after: "Hers" }));
  assert.equal(result.status, "applied");
  assert.equal(result.clash, true);
  assert.equal(doc.beats[0].text, "Hers");
});

test("a beat she added after one that has since gone is kept, at the end, rather than lost", () => {
  const doc = brief();
  const result = applyRecord(doc, rec({ op: "insert", path: ["beats"], afterId: "vanished", item: { id: "kept", text: "Mine" } }));
  assert.equal(result.status, "applied");
  assert.equal(doc.beats.at(-1).id, "kept");
});

/* --- the overlay ------------------------------------------------------ */

test("the overlay: pending edits always show, in the order she made them, and a second edit to a line chains onto the first", () => {
  const deployed = brief();
  const first = rec({ op: "set", path: ["runsAbout"], before: "6 minutes", after: "7 minutes" });
  const second = rec({ op: "set", path: ["runsAbout"], before: "7 minutes", after: "8 minutes" });
  const { docs, marks } = overlayDocs({ [FILE]: deployed }, [second, first], null);
  assert.equal(docs[FILE].runsAbout, "8 minutes");
  assert.equal(marks[`${FILE}::runsAbout`].state, "pending");
  assert.equal(deployed.runsAbout, "6 minutes", "the deployed file itself is never written into");
});

test("CRITICAL: a merged edit is not overlaid once the server has it -- but comes straight back if an old deploy puts the old words back", () => {
  const edit = rec({ op: "set", path: ["beats", { id: "one" }, "readAloud"], before: "Say the first thing.", after: "Her new first thing." });
  const ledger = { entries: { [edit.id]: { state: LEDGER_STATES.MERGED, at: "x" } } };

  const current = brief();
  current.beats[0].readAloud = "Her new first thing.";
  let out = overlayDocs({ [FILE]: current }, [edit], ledger);
  assert.deepEqual(out.marks, {}, "nothing to mark: the server already says hers");

  const later = brief();
  later.beats[0].readAloud = "A deliberate later rewrite, in the repo.";
  out = overlayDocs({ [FILE]: later }, [edit], ledger);
  assert.equal(out.docs[FILE].beats[0].readAloud, "A deliberate later rewrite, in the repo.", "a merged record never undoes a later deliberate change");

  const stale = brief(); // an old deploy: the words she replaced are back
  out = overlayDocs({ [FILE]: stale }, [edit], ledger);
  assert.equal(out.docs[FILE].beats[0].readAloud, "Her new first thing.");
  assert.equal(out.marks[`${FILE}::beats[one].readAloud`].state, "server-behind");
});

test("the overlay puts back a beat she added, and takes out one she removed, when the server is behind a merged edit", () => {
  const added = rec({ op: "insert", path: ["beats"], afterId: "one", item: { id: "hers", kind: "action", text: "Her beat" } });
  const removed = rec({ op: "remove", path: ["beats"], itemId: "three", item: brief().beats[2] });
  const ledger = { entries: { [added.id]: { state: "merged", at: "x" }, [removed.id]: { state: "merged", at: "x" } } };
  const { docs } = overlayDocs({ [FILE]: brief() }, [added, removed], ledger);
  assert.deepEqual(docs[FILE].beats.map((b) => b.id), ["one", "hers", "two"]);
});

test("superseded edits are never overlaid, and an edit whose beat is gone is reported, not dropped silently", () => {
  const superseded = rec({ op: "set", path: ["title"], before: "A Scene", after: "Superseded" });
  const orphan = rec({ op: "set", path: ["beats", { id: "gone" }, "text"], before: "x", after: "y" });
  const { docs, problems } = overlayDocs({ [FILE]: brief() }, [superseded, orphan], { entries: { [superseded.id]: { state: "superseded", at: "x" } } });
  assert.equal(docs[FILE].title, "A Scene");
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /gone/);
});

test("a malformed record in storage is reported by the overlay, never applied", () => {
  const { problems } = overlayDocs({ [FILE]: brief() }, [{ kind: "scene-edit", id: "bad" }], null);
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /unreadable edit/);
});

test("notes are collected with their state and my reply; a note she took back disappears", () => {
  const note = rec({ op: "note", path: ["beats", { id: "one" }], text: "Cut this beat?" });
  const kept = rec({ op: "note", path: [], text: "The whole scene is too long" });
  const withdraw = rec({ op: "withdraw", path: [], noteId: kept.id });
  const ledger = { entries: { [note.id]: { state: "done", at: "x", reply: "Cut, as asked." } } };
  const { notes } = overlayDocs({ [FILE]: brief() }, [note, kept, withdraw], ledger);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].state, "done");
  assert.equal(notes[0].reply, "Cut, as asked.");
});

test("marks: a field's key for a set, the item's key for an add, a remove or a move", () => {
  const set = rec({ op: "set", path: ["beats", { id: "one" }, "text"], before: "First", after: "x" });
  const insert = rec({ op: "insert", path: ["beats"], afterId: "one", item: { id: "b-new", text: "" } });
  assert.equal(markKey(set), `${FILE}::beats[one].text`);
  assert.equal(markKey(insert), `${FILE}::beats[b-new]`);
});

/* --- merging: the repo ----------------------------------------------- */

test("a merge writes her words only where the repo still says what she saw", () => {
  const repo = brief();
  const clean = rec({ op: "set", path: ["beats", { id: "one" }, "text"], before: "First", after: "Hers" });
  assert.deepEqual(mergeRecord(repo, clean), { result: "merged", replaced: "First" });
  assert.equal(repo.beats[0].text, "Hers");
  assert.equal(mergeRecord(repo, clean).result, "already");

  repo.beats[1].text = "Rewritten by Claude after she looked";
  const clash = rec({ op: "set", path: ["beats", { id: "two" }, "text"], before: "Second", after: "Also hers" });
  const out = mergeRecord(repo, clash);
  assert.equal(out.result, "clash");
  assert.equal(out.current, "Rewritten by Claude after she looked");
  assert.equal(repo.beats[1].text, "Rewritten by Claude after she looked", "a clash writes nothing");

  assert.equal(mergeRecord(repo, rec({ op: "set", path: ["beats", { id: "gone" }, "text"], before: "", after: "x" })).result, "unplaceable");
});

test("a removal merges only if the beat is still the one she removed, and a move whose anchor is gone is a clash", () => {
  const repo = brief();
  const removeTwo = rec({ op: "remove", path: ["beats"], itemId: "two", item: cloneDoc(repo.beats[1]) });
  repo.beats[1].text = "Edited since";
  assert.equal(mergeRecord(repo, removeTwo).result, "clash");

  const clean = brief();
  assert.equal(mergeRecord(clean, rec({ op: "remove", path: ["beats"], itemId: "two", item: cloneDoc(clean.beats[1]) })).result, "merged");
  assert.equal(mergeRecord(clean, rec({ op: "move", path: ["beats"], itemId: "three", afterId: "two" })).result, "clash");
  assert.equal(mergeRecord(clean, rec({ op: "move", path: ["beats"], itemId: "nope", afterId: null })).result, "unplaceable");
  assert.equal(mergeRecord(clean, rec({ op: "note", text: "hi" })).result, "note");
});

/* --- the guard -------------------------------------------------------- */

test("CRITICAL: the guard names every place the repo holds older words than hers -- and allows a later, new rewrite", () => {
  const first = rec({ op: "set", path: ["title"], before: "A Scene", after: "Her Title" });
  const second = rec({ op: "set", path: ["title"], before: "Her Title", after: "Her Better Title" });
  const ledger = { entries: { [first.id]: { state: "merged", at: "x" }, [second.id]: { state: "merged", at: "x" } } };

  const good = brief();
  good.title = "Her Better Title";
  assert.deepEqual(findReversions({ [FILE]: good }, [first, second], ledger), []);

  for (const old of ["A Scene", "Her Title"]) {
    const reverted = brief();
    reverted.title = old;
    const found = findReversions({ [FILE]: reverted }, [first, second], ledger);
    assert.equal(found.length, 1, `reverted to "${old}"`);
    assert.equal(found[0].expected, "Her Better Title");
    assert.equal(found[0].recordId, second.id);
  }

  const rewritten = brief();
  rewritten.title = "A new title, decided in chat";
  assert.deepEqual(findReversions({ [FILE]: rewritten }, [first, second], ledger), [], "new words are not old words");
});

test("CRITICAL: what a settled clash replaced counts as older words too", () => {
  const edit = rec({ op: "set", path: ["goal"], before: "What she saw", after: "What she wrote" });
  const ledger = { entries: { [edit.id]: { state: "merged", at: "x", replaced: "What the repo had instead" } } };
  const doc = { ...brief(), goal: "What the repo had instead" };
  assert.equal(findReversions({ [FILE]: doc }, [edit], ledger).length, 1);
});

test("CRITICAL: a beat she added that has gone, or a beat she removed that is back, is a reversion; superseded edits are not", () => {
  const added = rec({ op: "insert", path: ["beats"], afterId: "one", item: { id: "hers", text: "Her beat" } });
  const removed = rec({ op: "remove", path: ["beats"], itemId: "three", item: brief().beats[2] });
  const ledger = { entries: { [added.id]: { state: "merged", at: "x" }, [removed.id]: { state: "merged", at: "x" } } };
  const kinds = findReversions({ [FILE]: brief() }, [added, removed], ledger).map((r) => r.kind).sort();
  assert.deepEqual(kinds, ["added-item-missing", "removed-item-back"]);

  const superseded = { entries: { [added.id]: { state: "superseded", at: "x" }, [removed.id]: { state: "superseded", at: "x" } } };
  assert.deepEqual(findReversions({ [FILE]: brief() }, [added, removed], superseded), []);
});

test("isBehind is only true for the words she replaced, never for new ones", () => {
  const edit = rec({ op: "set", path: ["runsAbout"], before: "6 minutes", after: "7 minutes" });
  assert.equal(isBehind(brief(), edit), true);
  assert.equal(isBehind({ ...brief(), runsAbout: "7 minutes" }, edit), false);
  assert.equal(isBehind({ ...brief(), runsAbout: "9 minutes" }, edit), false);
});

/* --- reading what she changed ----------------------------------------- */

test("the word diff shows exactly what she cut and what she added", () => {
  const segments = wordDiff("The quick brown fox jumps", "The slow brown fox leaps high");
  assert.equal(diffToText(segments), "The [-quick-]{+slow+} brown fox [-jumps-]{+leaps high+}");
  assert.equal(diffToText(wordDiff("same", "same")), "same");
  assert.equal(changeShare(wordDiff("a b c d", "a b c d")), 0);
  assert.ok(changeShare(wordDiff("one two three", "four five six")) > 0.9);
  const long = Array.from({ length: 3000 }, (_, i) => `w${i}`).join(" ");
  assert.ok(diffToText(wordDiff(long, `${long} end`)).endsWith("{+ end+}"), "a long text is still diffed, from the shared prefix");
});

test("records sort by time, and describeRecord reads as a sentence", () => {
  const a = rec({ op: "set", path: ["title"], before: "A Scene", after: "B" });
  const b = rec({ op: "note", path: ["beats", { id: "one" }], text: "Hi" });
  assert.deepEqual(sortRecords([b, a]).map((r) => r.id), [a.id, b.id]);
  assert.equal(describeRecord(a), "rewrote title");
  assert.equal(describeRecord(b), 'left a note on beats[one]: "Hi"');
});

test("a new item's id is readable, lowercase, and never collides", () => {
  assert.equal(newItemId("beat", [], "AbC12"), "beat-abc12");
  assert.equal(newItemId("beat", ["beat-abc12"], "AbC12"), "beat-abc12-2");
  assert.match(newItemId("beat", [], "Q"), /^[a-z0-9-]+$/);
});

test("a check file is editable too: a DC is a number and survives the round trip", () => {
  const checks = { id: "t1-checks", checks: [{ id: "c1", dc: { value: 15 }, outcomes: { success: "It works." } }] };
  const edit = makeRecord({ op: "set", file: CHECKS, briefId: "episode-t1--scene", path: ["checks", { id: "c1" }, "dc", "value"], before: 15, after: 13, at: "2026-09-27T19:00:00.000Z", rand: "dcdc" });
  assert.equal(mergeRecord(checks, edit).result, "merged");
  assert.equal(checks.checks[0].dc.value, 13);
});
