// tools/scene-edits -- pulling Ingram's edits home, merging them, and keeping
// them (design/scene-edits.md §4-§5). Offline: every test builds a scratch
// repo and a scratch "storage/" folder, and the two hooks are run as real
// subprocesses pointed at them (BI_SCENE_EDITS_ROOT / _FROM / _STATE), so
// nothing here touches the live server or this repo's own data.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { makeRecord, recordFilename } from "../../module/blank-inheritance/scripts/core/scene-edits.mjs";
import { acquireLock, formatJson, listHarvested, readJsonFile, readLedger, saveHarvested, sha256, writeLedger } from "../../tools/scene-edits/store.mjs";
import { folderInbox, pullNew } from "../../tools/scene-edits/inbox.mjs";
import { answerNote, documentCache, mergePending, previewMerge, resolveClash, restoreReversions, supersede } from "../../tools/scene-edits/merge.mjs";
import { describeEdit, pullReport } from "../../tools/scene-edits/report.mjs";
import { checkReversions, editLog, pathsFor, runPull, sceneEditsForDeploy, status } from "../../tools/scene-edits/edits.mjs";
import { repoRelative } from "../../tools/scene-edits/pre-edit.mjs";
import { parseFramedFiles } from "../../tools/module-sync/remote.mjs";

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const toolsDir = path.resolve(here, "..", "..", "tools", "scene-edits");

const BRIEF_ID = "episode-t9--speech";
const FILE = `scene-briefs/${BRIEF_ID}`;

function sceneBrief() {
  return {
    $schema: "../schema/scene-brief.schema.json",
    id: BRIEF_ID,
    type: "scene-brief",
    episodeRef: "episode-t9",
    sceneRef: "speech",
    title: "The Speech",
    runsAbout: "6 minutes",
    beats: [
      { id: "open", kind: "action", text: "Open", readAloud: "Start high." },
      { id: "close", kind: "action", text: "Close" }
    ]
  };
}

/** A scratch repo with one scene (in CRLF, to prove line endings survive), its episode, and a scratch storage/. */
function scratch() {
  const root = mkdtempSync(path.join(os.tmpdir(), "bi-scene-edits-"));
  const storage = path.join(root, "server-storage");
  mkdirSync(path.join(root, "data", "scene-briefs"), { recursive: true });
  mkdirSync(path.join(root, "data", "episodes"), { recursive: true });
  mkdirSync(path.join(root, "data", "campaign"), { recursive: true });
  mkdirSync(storage, { recursive: true });
  writeFileSync(path.join(root, "data", "scene-briefs", `${BRIEF_ID}.json`), formatJson(sceneBrief(), "\r\n"));
  writeFileSync(
    path.join(root, "data", "episodes", "episode-t9.json"),
    formatJson({ id: "episode-t9", scenes: [{ order: 0, id: "speech", title: "The Speech", briefRef: BRIEF_ID }] })
  );
  let tick = 0;
  const edit = (spec) => {
    tick += 1;
    const record = makeRecord({
      file: FILE,
      briefId: BRIEF_ID,
      by: "Ingram",
      at: new Date(Date.UTC(2026, 8, 27, 20, 0, tick)).toISOString(),
      rand: `t${String(tick).padStart(4, "0")}`,
      ...spec
    });
    // Exactly how foundry/io.mjs#writeStorageJson writes one: no final newline.
    writeFileSync(path.join(storage, recordFilename(record)), JSON.stringify(record, null, 2));
    return record;
  };
  const brief = () => readJsonFile(path.join(root, "data", "scene-briefs", `${BRIEF_ID}.json`));
  return { root, storage, paths: pathsFor(root), edit, brief, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/* --- the store --------------------------------------------------------- */

test("a data file is written back in the repo's own layout and keeps its own line endings", async () => {
  const s = scratch();
  try {
    const before = readFileSync(path.join(s.root, "data", "scene-briefs", `${BRIEF_ID}.json`), "utf8");
    assert.ok(before.includes("\r\n"));
    s.edit({ op: "set", path: ["runsAbout"], before: "6 minutes", after: "7 minutes" });
    await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    const after = readFileSync(path.join(s.root, "data", "scene-briefs", `${BRIEF_ID}.json`), "utf8");
    assert.equal(after, before.replace('"6 minutes"', '"7 minutes"'), "only her change, byte for byte, CRLF kept");
  } finally {
    s.cleanup();
  }
});

test("the ledger is written in time order, and a missing one reads as empty", () => {
  const s = scratch();
  try {
    assert.deepEqual(readLedger(s.paths.ledgerPath).entries, {});
    writeLedger({ entries: { "20260927T200002000Z-bbbb": { state: "merged", at: "x" }, "20260927T200001000Z-aaaa": { state: "merged", at: "x" } } }, s.paths.ledgerPath);
    const written = JSON.parse(readFileSync(s.paths.ledgerPath, "utf8"));
    assert.deepEqual(Object.keys(written.entries), ["20260927T200001000Z-aaaa", "20260927T200002000Z-bbbb"]);
    assert.equal(written.$schema, "../schema/scene-edits.schema.json");
  } finally {
    s.cleanup();
  }
});

test("only one merge at a time: a second run is locked out until the first finishes, and a dead run's lock is broken", () => {
  const s = scratch();
  try {
    const release = acquireLock(s.paths.harvestDir);
    assert.ok(release);
    assert.equal(acquireLock(s.paths.harvestDir), null);
    release();
    const again = acquireLock(s.paths.harvestDir);
    assert.ok(again);
    again();
    writeFileSync(path.join(s.paths.harvestDir, ".merge.lock"), "old");
    assert.ok(acquireLock(s.paths.harvestDir, { staleMs: -1 }), "a stale lock is broken");
  } finally {
    s.cleanup();
  }
});

test("a harvested file must be a record by name", () => {
  const s = scratch();
  try {
    assert.throws(() => saveHarvested(s.paths.harvestDir, "notes.json", "{}"));
    assert.deepEqual([...listHarvested(s.paths.harvestDir).keys()], []);
  } finally {
    s.cleanup();
  }
});

/* --- the inbox --------------------------------------------------------- */

test("a pull keeps only what arrived intact, is a real record, and is named for its own id", async () => {
  const s = scratch();
  try {
    const good = s.edit({ op: "set", path: ["title"], before: "The Speech", after: "From Up Here" });
    const renamed = s.edit({ op: "set", path: ["runsAbout"], before: "6 minutes", after: "5 minutes" });
    writeFileSync(path.join(s.storage, "scene-edit-20260927T200099000Z-zzzz.json"), readFileSync(path.join(s.storage, recordFilename(renamed))));
    writeFileSync(path.join(s.storage, "scene-edit-20260927T200098000Z-yyyy.json"), JSON.stringify({ kind: "scene-edit", nonsense: true }));
    const inbox = folderInbox(s.storage);
    const corrupting = { ...inbox, read: async (names) => new Map([...(await inbox.read(names))].map(([n, t]) => [n, n === recordFilename(good) ? `${t} ` : t])) };

    const { fetched, problems } = await pullNew({ inbox: corrupting, harvested: new Map() });
    assert.deepEqual(fetched.map((f) => f.record.id), [renamed.id]);
    assert.equal(problems.length, 3);
    assert.ok(problems.some((p) => /did not arrive intact/.test(p)));
    assert.ok(problems.some((p) => /not a usable edit/.test(p)));
    assert.ok(problems.some((p) => /does not match its name/.test(p)));
  } finally {
    s.cleanup();
  }
});

test("the server framing gives each file back byte for byte, with or without a final newline", () => {
  const stdout = "junk\n@@BI-FILE a.json\n{\n  \"x\": 1\n}\n@@BI-END\n@@BI-FILE b.json\nline\n\n@@BI-END\r\n";
  const files = parseFramedFiles(stdout);
  assert.equal(files.get("a.json"), '{\n  "x": 1\n}');
  assert.equal(files.get("b.json"), "line\n");
  assert.equal(sha256(files.get("a.json")), sha256('{\n  "x": 1\n}'));
});

/* --- merging ----------------------------------------------------------- */

test("a full pull: new edits home, merged, ledgered, noted, and a second pull quiet", async () => {
  const s = scratch();
  try {
    s.edit({ op: "set", path: ["beats", { id: "open" }, "readAloud"], before: "Start high.", after: "Start high. Higher than that." });
    s.edit({ op: "insert", path: ["beats"], afterId: "open", item: { id: "beat-mid", kind: "action", text: "The middle" } });
    const note = s.edit({ op: "note", path: ["beats", { id: "close" }], text: "Make this land harder" });

    const first = await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    assert.equal(first.fetched.length, 3);
    assert.deepEqual(first.touched, [FILE]);
    assert.deepEqual(s.brief().doc.beats.map((b) => b.id), ["open", "beat-mid", "close"]);
    assert.equal(s.brief().doc.beats[0].readAloud, "Start high. Higher than that.");
    assert.deepEqual(first.notes.map((n) => n.id), [note.id]);
    assert.match(first.report, /Higher than that/);
    assert.match(first.report, /NOTES FOR YOU/);
    assert.equal(Object.keys(readLedger(s.paths.ledgerPath).entries).length, 2, "the note waits with no entry");
    assert.equal(listHarvested(s.paths.harvestDir).size, 3);

    const second = await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    assert.equal(second.fetched.length, 0);
    assert.equal(second.touched.length, 0);
  } finally {
    s.cleanup();
  }
});

test("renaming a scene renames it in the episode's running order too, but only where it still said the old title", async () => {
  const s = scratch();
  try {
    s.edit({ op: "set", path: ["title"], before: "The Speech", after: "From Up Here" });
    const result = await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    const episode = JSON.parse(readFileSync(path.join(s.root, "data", "episodes", "episode-t9.json"), "utf8"));
    assert.equal(episode.scenes[0].title, "From Up Here");
    assert.ok(result.touched.includes("episodes/episode-t9"));
  } finally {
    s.cleanup();
  }
});

test("a clash is never settled by a machine: nothing written, both versions reported, hers still pending", async () => {
  const s = scratch();
  try {
    const file = path.join(s.root, "data", "scene-briefs", `${BRIEF_ID}.json`);
    const doc = s.brief().doc;
    doc.beats[1].text = "Close, as Claude rewrote it";
    writeFileSync(file, formatJson(doc, "\r\n"));
    const clash = s.edit({ op: "set", path: ["beats", { id: "close" }, "text"], before: "Close", after: "Close, as she wrote it" });

    const result = await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    assert.equal(result.results[0].result, "clash");
    assert.equal(s.brief().doc.beats[1].text, "Close, as Claude rewrote it");
    assert.equal(readLedger(s.paths.ledgerPath).entries[clash.id], undefined);
    assert.match(result.report, /she wrote: +Close, as she wrote it/);
    assert.match(result.report, /repo says: +Close, as Claude rewrote it/);
    assert.equal(status(s.paths).unsettled.length, 1);
  } finally {
    s.cleanup();
  }
});

test("settling a clash: hers goes in and the chain is closed; keeping the repo's needs a reason on record", () => {
  const records = [];
  let n = 0;
  const make = (spec) => {
    n += 1;
    const r = makeRecord({ file: FILE, briefId: BRIEF_ID, at: new Date(Date.UTC(2026, 8, 27, 21, 0, n)).toISOString(), rand: `c${String(n).padStart(4, "0")}`, ...spec });
    records.push(r);
    return r;
  };
  make({ op: "set", path: ["title"], before: "The Speech", after: "Draft one" });
  const latest = make({ op: "set", path: ["title"], before: "Draft one", after: "Draft two" });
  const doc = { ...sceneBrief(), title: "Claude's title" };
  const docs = documentCache(() => doc);

  const hers = resolveClash({ recordId: latest.id, keep: "hers", records, ledger: { entries: {} }, docs });
  assert.equal(doc.title, "Draft two");
  assert.equal(hers.ledger.entries[latest.id].state, "merged");
  assert.equal(hers.ledger.entries[latest.id].replaced, "Claude's title");
  assert.equal(hers.ledger.entries[records[0].id].state, "superseded");

  assert.throws(() => resolveClash({ recordId: latest.id, keep: "mine", records, ledger: { entries: {} }, docs }), /reason/);
  const mine = resolveClash({ recordId: latest.id, keep: "mine", reason: "She chose Claude's title in chat, 2026-09-27", records, ledger: { entries: {} }, docs: documentCache(() => ({ ...sceneBrief() })) });
  assert.equal(mine.ledger.entries[latest.id].state, "superseded");
  assert.match(mine.ledger.entries[latest.id].reason, /chose/);
});

test("CRITICAL: an old copy written over her merged words is caught, refused by the deploy step, and put right by restore", async () => {
  const s = scratch();
  try {
    s.edit({ op: "set", path: ["beats", { id: "open" }, "readAloud"], before: "Start high.", after: "Her opening." });
    await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    assert.deepEqual(checkReversions(s.paths), []);

    // Something writes an old copy of the scene back: the words she replaced return.
    writeFileSync(path.join(s.root, "data", "scene-briefs", `${BRIEF_ID}.json`), formatJson(sceneBrief(), "\r\n"));
    const reversions = checkReversions(s.paths);
    assert.equal(reversions.length, 1);
    assert.equal(reversions[0].path, "beats[open].readAloud");

    const deployStep = await sceneEditsForDeploy({ repoRoot: s.root, inbox: folderInbox(s.storage), log: () => {} });
    assert.equal(deployStep.reversions.length, 1, "the deploy's first step reports it, and the deploy refuses on it");

    const { records } = await import("../../tools/scene-edits/store.mjs").then((m) => m.readHarvestedRecords(s.paths.harvestDir));
    const found = readJsonFile(path.join(s.root, "data", "scene-briefs", `${BRIEF_ID}.json`));
    const docs = documentCache(() => found.doc);
    const restored = restoreReversions({ records, ledger: readLedger(s.paths.ledgerPath), docs });
    assert.equal(restored.reversions.length, 1);
    assert.equal(found.doc.beats[0].readAloud, "Her opening.");
  } finally {
    s.cleanup();
  }
});

test("notes: answered with a reply the Runner shows; supersede needs a reason; a preview never writes", () => {
  const note = makeRecord({ op: "note", file: FILE, briefId: BRIEF_ID, path: [], text: "Shorter?", at: "2026-09-27T22:00:00.000Z", rand: "note" });
  const set = makeRecord({ op: "set", file: FILE, briefId: BRIEF_ID, path: ["title"], before: "The Speech", after: "X", at: "2026-09-27T22:00:01.000Z", rand: "sett" });
  const answered = answerNote({ noteId: note.id, reply: "Cut to four minutes.", records: [note], ledger: { entries: {} } });
  assert.deepEqual(answered.entries[note.id].state, "done");
  assert.throws(() => answerNote({ noteId: note.id, reply: "", records: [note], ledger: { entries: {} } }));
  assert.throws(() => supersede({ recordId: set.id, reason: "", records: [set], ledger: { entries: {} } }));

  const doc = sceneBrief();
  const preview = previewMerge({ records: [set], ledger: { entries: {} }, docs: documentCache(() => doc) });
  assert.equal(preview.results[0].result, "merged");
  assert.equal(doc.title, "The Speech", "the preview worked on a copy");
});

test("mergePending: a withdrawn note is closed, and an edit to a file not in the repo is reported, not lost", () => {
  const note = makeRecord({ op: "note", file: FILE, briefId: BRIEF_ID, path: [], text: "Hmm", at: "2026-09-27T22:10:00.000Z", rand: "nnnn" });
  const withdraw = makeRecord({ op: "withdraw", file: FILE, briefId: BRIEF_ID, path: [], noteId: note.id, at: "2026-09-27T22:10:01.000Z", rand: "wwww" });
  const orphan = makeRecord({ op: "set", file: "scene-briefs/episode-nowhere--x", briefId: "episode-nowhere--x", path: ["title"], before: "a", after: "b", at: "2026-09-27T22:10:02.000Z", rand: "oooo" });
  const out = mergePending({ records: [note, withdraw, orphan], ledger: { entries: {} }, docs: documentCache(() => null) });
  assert.equal(out.ledger.entries[note.id].state, "withdrawn");
  assert.equal(out.results.find((r) => r.record.id === orphan.id).result, "unplaceable");
});

test("the report shows a heavy rewrite as old and new text in full, and a light one as a word diff", () => {
  const heavy = makeRecord({ op: "set", file: FILE, briefId: BRIEF_ID, path: ["goal"], before: "One two three four", after: "Something else entirely now", at: "2026-09-27T22:20:00.000Z", rand: "hvhv" });
  const light = makeRecord({ op: "set", file: FILE, briefId: BRIEF_ID, path: ["goal"], before: "The quick brown fox jumps over the dog", after: "The quick brown fox leaps over the dog", at: "2026-09-27T22:20:01.000Z", rand: "lglg" });
  assert.match(describeEdit(heavy), /was: One two three four\n +now: Something else entirely now/);
  assert.match(describeEdit(light), /\[-jumps-\]\{\+leaps\+\}/);
  assert.match(pullReport({ reversions: [{ file: FILE, path: "goal", kind: "field", recordId: "x" }] }), /CRITICAL/);
});

test("the log replays every edit of hers, oldest first, grouped by scene", async () => {
  const s = scratch();
  try {
    s.edit({ op: "set", path: ["runsAbout"], before: "6 minutes", after: "4 minutes" });
    s.edit({ op: "set", path: ["title"], before: "The Speech", after: "From Up Here" });
    await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    const log = editLog({ paths: s.paths });
    assert.equal(log.count, 2);
    assert.ok(log.text.indexOf("runsAbout") < log.text.indexOf("rewrote title"));
    assert.match(log.text, new RegExp(`== ${BRIEF_ID} ==`));
  } finally {
    s.cleanup();
  }
});

/* --- the hooks, run for real ----------------------------------------- */

function hookEnv(s) {
  return { ...process.env, BI_SCENE_EDITS_ROOT: s.root, BI_SCENE_EDITS_FROM: s.storage, BI_SCENE_EDITS_STATE: path.join(s.root, ".state.json") };
}

async function runHook(script, s, stdin = "") {
  const child = execFileAsync(process.execPath, [path.join(toolsDir, script)], { env: hookEnv(s), timeout: 30_000 });
  child.child.stdin.end(stdin);
  const { stdout } = await child;
  return stdout;
}

test("repoRelative: a path inside the repo, forward-slashed; anything outside it, nothing", () => {
  const root = path.resolve(os.tmpdir(), "repo");
  assert.equal(repoRelative(path.join(root, "data", "scene-briefs", "x.json"), root), "data/scene-briefs/x.json");
  assert.equal(repoRelative("data/challenges/y.json", root), "data/challenges/y.json");
  assert.equal(repoRelative(path.resolve(os.tmpdir(), "elsewhere.json"), root), null);
  assert.equal(repoRelative(null, root), null);
});

test("the session-start hook brings edits home and prints what she changed", async () => {
  const s = scratch();
  try {
    s.edit({ op: "set", path: ["beats", { id: "close" }, "text"], before: "Close", after: "Close on the gate" });
    const out = await runHook("session-start.mjs", s);
    assert.match(out, /1 new from Ingram/);
    assert.match(out, /Close on the gate/);
    assert.equal(s.brief().doc.beats[1].text, "Close on the gate");
    assert.ok(existsSync(path.join(s.root, ".state.json")));
  } finally {
    s.cleanup();
  }
});

test("the pre-edit hook stops an edit of a scene she has just changed, lets an untouched one through, and refuses the ledger", async () => {
  const s = scratch();
  try {
    const scenePath = path.join(s.root, "data", "scene-briefs", `${BRIEF_ID}.json`);
    const input = (file) => JSON.stringify({ tool_name: "Edit", tool_input: { file_path: file } });

    s.edit({ op: "set", path: ["runsAbout"], before: "6 minutes", after: "5 minutes" });
    const denied = JSON.parse(await runHook("pre-edit.mjs", s, input(scenePath)));
    assert.equal(denied.hookSpecificOutput.permissionDecision, "deny");
    assert.match(denied.hookSpecificOutput.permissionDecisionReason, /re-read the file/);
    assert.equal(s.brief().doc.runsAbout, "5 minutes", "her change is already on disk when the edit is stopped");

    rmSync(path.join(s.root, ".state.json"));
    assert.equal(await runHook("pre-edit.mjs", s, input(scenePath)), "", "nothing new: the edit goes ahead");

    assert.equal(await runHook("pre-edit.mjs", s, input(path.join(s.root, "README.md"))), "", "other files pass straight through");

    const ledger = JSON.parse(await runHook("pre-edit.mjs", s, input(path.join(s.root, "data", "campaign", "scene-edits.json"))));
    assert.equal(ledger.hookSpecificOutput.permissionDecision, "deny");
  } finally {
    s.cleanup();
  }
});

test("the pre-edit hook stops an edit of a scene with an unsettled clash of hers", async () => {
  const s = scratch();
  try {
    const scenePath = path.join(s.root, "data", "scene-briefs", `${BRIEF_ID}.json`);
    const doc = s.brief().doc;
    doc.title = "Claude's title";
    writeFileSync(scenePath, formatJson(doc, "\r\n"));
    s.edit({ op: "set", path: ["title"], before: "The Speech", after: "Her title" });
    const out = JSON.parse(await runHook("pre-edit.mjs", s, JSON.stringify({ tool_name: "Write", tool_input: { file_path: scenePath } })));
    assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /clash/);
  } finally {
    s.cleanup();
  }
});

test("a document she edited directly in Foundry comes home once, is reported for folding in, and again only when she edits it again", async () => {
  const s = scratch();
  try {
    const snapshot = (content) =>
      JSON.stringify({ kind: "foundry-document-edit", version: 1, document: "journal", sourceId: "episode-t9", source: "data/episodes/episode-t9.json", name: "Episode T9", words: [{ name: "Overview", content }], at: "2026-09-27T23:00:00.000Z" }, null, 2);
    writeFileSync(path.join(s.storage, "foundry-edit-journal-episode-t9.json"), snapshot("<p>Her overview.</p>"));

    const first = await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    assert.equal(first.documentEdits.length, 1);
    assert.match(first.report, /EDITED IN FOUNDRY/);
    assert.match(first.report, /Her overview/);
    assert.ok(existsSync(path.join(s.root, "harvest", "foundry-edits", "foundry-edit-journal-episode-t9.json")));

    const second = await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    assert.equal(second.documentEdits.length, 0, "an unchanged copy is not reported twice");

    writeFileSync(path.join(s.storage, "foundry-edit-journal-episode-t9.json"), snapshot("<p>Her overview, rewritten again.</p>"));
    const third = await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    assert.equal(third.documentEdits.length, 1);
    assert.match(third.report, /rewritten again/);
  } finally {
    s.cleanup();
  }
});

test("CRITICAL: a deploy that finds another merge running still checks the repo holds her words", async () => {
  const s = scratch();
  try {
    s.edit({ op: "set", path: ["title"], before: "The Speech", after: "From Up Here" });
    await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    writeFileSync(path.join(s.root, "data", "scene-briefs", `${BRIEF_ID}.json`), formatJson(sceneBrief(), "\r\n")); // an old copy comes back
    const release = acquireLock(s.paths.harvestDir); // another conversation is mid-merge
    try {
      const step = await sceneEditsForDeploy({ repoRoot: s.root, inbox: folderInbox(s.storage), log: () => {} });
      assert.equal(step.reversions.length, 1);
    } finally {
      release();
    }
  } finally {
    s.cleanup();
  }
});
