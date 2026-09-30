// A scene rebuilt in canon/ (design/story-data-refactor.md) has two rules that used to fight: canon's own check
// requires data/scene-briefs|challenges/<id>.json to be a byte-identical copy of canon/scenes|challenges/<id>.json,
// and a scene-edits merge (design/scene-edits.md) used to write her words straight into that same data/ file. Left
// alone, a routine `story build` after her edit would have silently put the old canon words back over hers -- the
// one thing this whole system exists to prevent. Found and fixed 2026-09-27, testing this with Scene 0 itself.
//
// The fix: for a file canon has rebuilt, a merge writes into the canon copy, and data/ is resynced from canon in
// the same step (edits.mjs's canonFilePath + repoDocs). Offline, scratch repo, same pattern as
// test/scene-edits/tools.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { makeRecord, recordFilename } from "../../module/blank-inheritance/scripts/core/scene-edits.mjs";
import { formatJson, readJsonFile } from "../../tools/scene-edits/store.mjs";
import { folderInbox } from "../../tools/scene-edits/inbox.mjs";
import { canonFilePath, checkReversions, pathsFor, runPull } from "../../tools/scene-edits/edits.mjs";
import { build, loadModel } from "../../tools/story/lib.mjs";

const BRIEF_ID = "episode-t9--canon-speech";
const FILE = `scene-briefs/${BRIEF_ID}`;

function sceneBrief(readAloud) {
  return {
    $schema: "../schema/scene-brief.schema.json",
    id: BRIEF_ID,
    type: "scene-brief",
    episodeRef: "episode-t9",
    sceneRef: "canon-speech",
    title: "The Canon Speech",
    runsAbout: "6 minutes",
    beats: [{ id: "open", kind: "action", text: "Open", readAloud }]
  };
}

/** A scratch repo where this scene has already been rebuilt in canon: canon/scenes/ and data/scene-briefs/ agree. */
function scratch() {
  const root = mkdtempSync(path.join(os.tmpdir(), "bi-scene-edits-canon-"));
  const storage = path.join(root, "server-storage");
  mkdirSync(path.join(root, "canon", "scenes"), { recursive: true });
  mkdirSync(path.join(root, "data", "scene-briefs"), { recursive: true });
  mkdirSync(path.join(root, "data", "episodes"), { recursive: true });
  mkdirSync(path.join(root, "data", "campaign"), { recursive: true });
  mkdirSync(storage, { recursive: true });
  const brief = sceneBrief("Start high.");
  const text = formatJson(brief, "\n");
  writeFileSync(path.join(root, "canon", "scenes", `${BRIEF_ID}.json`), text);
  writeFileSync(path.join(root, "data", "scene-briefs", `${BRIEF_ID}.json`), text);
  writeFileSync(
    path.join(root, "data", "episodes", "episode-t9.json"),
    formatJson({ id: "episode-t9", scenes: [{ order: 0, id: "canon-speech", title: "The Canon Speech", briefRef: BRIEF_ID }] })
  );
  let tick = 0;
  const edit = (spec) => {
    tick += 1;
    const record = makeRecord({
      file: FILE,
      briefId: BRIEF_ID,
      by: "Ingram",
      at: new Date(Date.UTC(2026, 8, 27, 21, 0, tick)).toISOString(),
      rand: `c${String(tick).padStart(4, "0")}`,
      ...spec
    });
    writeFileSync(path.join(storage, recordFilename(record)), JSON.stringify(record, null, 2));
    return record;
  };
  return { root, storage, paths: pathsFor(root), edit, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("canonFilePath finds the canon copy when one exists, and says so only then", () => {
  const s = scratch();
  try {
    assert.equal(canonFilePath(s.root, FILE), path.join(s.root, "canon", "scenes", `${BRIEF_ID}.json`));
    assert.equal(canonFilePath(s.root, "scene-briefs/no-such-scene"), null);
    assert.equal(canonFilePath(s.root, "episodes/episode-t9"), null, "episodes are not part of the canon tree");
  } finally {
    s.cleanup();
  }
});

test("her edit to a canon-tracked scene lands in canon/, and data/ is resynced to match in the same pull", async () => {
  const s = scratch();
  try {
    s.edit({ op: "set", path: ["beats", { id: "open" }, "readAloud"], before: "Start high.", after: "Start high, high enough to see the world curve." });
    const result = await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    assert.equal(result.results[0]?.result, "merged", JSON.stringify(result.results));

    const canonPath = path.join(s.root, "canon", "scenes", `${BRIEF_ID}.json`);
    const dataPath = path.join(s.root, "data", "scene-briefs", `${BRIEF_ID}.json`);
    const canonDoc = readJsonFile(canonPath).doc;
    assert.equal(canonDoc.beats[0].readAloud, "Start high, high enough to see the world curve.", "her words are in the canon copy");

    const canonText = readFileSync(canonPath, "utf8");
    const dataText = readFileSync(dataPath, "utf8");
    assert.equal(dataText, canonText, "data/ was resynced from canon in the same step, byte for byte");

    // Canon's own invariant (tools/story/lib.mjs#checkModel) holds without a separate `story build` step.
    assert.deepEqual(build(loadModel(s.root), s.root), [], "already in sync: a second build changes nothing");

    assert.deepEqual(checkReversions(s.paths), [], "nothing old crept back in");
  } finally {
    s.cleanup();
  }
});

test("a second edit after the first pull still finds no clash (the merge compares against the canon copy, not a stale data/ one)", async () => {
  const s = scratch();
  try {
    s.edit({ op: "set", path: ["title"], before: "The Canon Speech", after: "The Speech, Rewritten" });
    await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    s.edit({ op: "set", path: ["runsAbout"], before: "6 minutes", after: "9 minutes" });
    const second = await runPull({ paths: s.paths, inbox: folderInbox(s.storage) });
    assert.ok(second.results.every((r) => r.result === "merged"), JSON.stringify(second.results));
    const canonDoc = readJsonFile(path.join(s.root, "canon", "scenes", `${BRIEF_ID}.json`)).doc;
    assert.equal(canonDoc.title, "The Speech, Rewritten");
    assert.equal(canonDoc.runsAbout, "9 minutes");
  } finally {
    s.cleanup();
  }
});
