// Tier 2 — the Sign-Off against the real corpus (design/scene-signoff.md §6).
//
// Tier 1 proves the logic on fixtures. This proves it survives contact with the
// actual files, and holds two invariants that only a real-corpus test can:
//
//   - No scene is `live` without a complete review record. seal() cannot produce
//     one, so a violation means somebody hand-edited an episode file, which is
//     exactly the drift design/data-ownership.md exists to catch.
//   - Every evaluator survives every real scene without throwing. An evaluator
//     that crashes on one scene would otherwise report as that scene's finding
//     and quietly go uninvestigated.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCorpus, scenesInPlayOrder, findScene } from "../tools/scene-signoff/corpus.mjs";
import { buildBoard, headline } from "../tools/scene-signoff/board.mjs";
import { runAutoChecks } from "../tools/scene-signoff/checklist.mjs";
import { SIGNOFF_PASSES } from "../module/blank-inheritance/scripts/core/promote.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const corpus = loadCorpus();
const board = buildBoard(corpus);

test("the real corpus loads and produces a board with every authored scene on it", () => {
  const scenes = scenesInPlayOrder(corpus);
  assert.ok(scenes.length >= 26, `expected at least the 26 authored scenes, got ${scenes.length}`);
  assert.equal(board.rows.length, scenes.length);
  assert.equal(board.episodes.length, corpus.episodes.length);
});

test("every scene in an episode has a brief file -- a scene with no brief cannot be reviewed", () => {
  const orphans = board.rows.filter((r) => !r.hasBrief).map((r) => `${r.episodeId}#${r.sceneId}`);
  assert.deepEqual(orphans, [], `scenes with a briefRef that does not resolve: ${orphans.join(", ")}`);
});

test("no evaluator throws on any real scene", () => {
  const allScenes = scenesInPlayOrder(corpus);
  const thrown = [];
  for (const bundle of allScenes) {
    for (const result of runAutoChecks(bundle, corpus, { allScenes })) {
      if (result.detail?.startsWith("evaluator threw")) thrown.push(`${bundle.key} ${result.id}: ${result.detail}`);
      if (result.state === "broken") thrown.push(`${bundle.key} ${result.id}: ${result.detail}`);
    }
  }
  assert.deepEqual(thrown, [], thrown.join("\n"));
  assert.equal(board.totals.brokenEvaluators, 0);
});

test("INVARIANT: no scene is live without a complete review record", () => {
  for (const row of board.rows.filter((r) => r.live)) {
    assert.ok(row.sealedVersion, `${row.sceneId} is live with no checklistVersion -- hand-edited?`);
    assert.ok(row.sealedBy, `${row.sceneId} is live with no gradedBy`);
    assert.equal(
      row.passesClear,
      SIGNOFF_PASSES.length,
      `${row.sceneId} is live with only ${row.passesClear}/4 passes clear -- seal() cannot produce this, so it was written by hand`
    );
  }
});

test("INVARIANT: no scene carries a status outside the schema's enum", () => {
  const legal = new Set(["needs-lore", "drafted", "sound", "final", "live", "cut"]);
  for (const row of board.rows) {
    assert.ok(legal.has(row.status), `${row.sceneId} has status "${row.status}"`);
  }
});

test("INVARIANT: a scene's review, if present, only names real checks and real passes", () => {
  const checkIds = new Set(corpus.checklist.checks.map((c) => c.id));
  for (const bundle of scenesInPlayOrder(corpus)) {
    const review = bundle.scene.authoring?.review;
    if (!review) continue;
    for (const name of Object.keys(review.passes ?? {})) {
      assert.ok(SIGNOFF_PASSES.includes(name), `${bundle.key} records a pass called "${name}"`);
    }
    for (const w of review.waived ?? []) {
      assert.ok(checkIds.has(w.check), `${bundle.key} waives "${w.check}", which is not in checklist v${corpus.checklist.version}`);
      assert.ok(w.why?.length > 3, `${bundle.key}'s waiver of ${w.check} has no reason`);
    }
  }
});

test("findScene() resolves a scene by brief id, by scene id, and by episode#scene", () => {
  const first = scenesInPlayOrder(corpus)[0];
  assert.equal(findScene(corpus, first.briefRef)?.key, first.key);
  assert.equal(findScene(corpus, first.scene.id)?.key, first.key);
  assert.equal(findScene(corpus, first.key)?.key, first.key);
  assert.equal(findScene(corpus, "no-such-scene"), null);
});

test("the Place link is read from scene-set.json, the same place play-sequence.mjs reads it", () => {
  const sited = board.rows.filter((r) => r.sited && !r.locationWaived);
  assert.ok(sited.length > 0, "at least some scenes should resolve to a real location");
  for (const row of sited) {
    assert.ok(corpus.locations[row.locationRef], `${row.sceneId} claims location ${row.locationRef}`);
    assert.ok(row.locationName, `${row.sceneId}'s location has no name`);
  }
});

test("INVARIANT: a row is only sited-without-a-location when P1 was actually waived on its own review record, never by a bare note", () => {
  // A locationNote in scene-set.json (e.g. From Up Here's) explains a case
  // FOR an exception; it is not itself the exception. Only a recorded waiver,
  // made at an actual Place pass, may excuse P1 -- design/scene-signoff.md's
  // own rule that Place's verdict is "genuinely hers rather than mine".
  for (const row of board.rows) {
    if (row.locationRef || !row.sited) continue;
    assert.ok(row.locationWaived, `${row.sceneId} counts as sited with no locationRef but P1 was not waived on its review record`);
  }
});

test("the console CLI runs, and --line produces one usable line", () => {
  const out = execFileSync(process.execPath, [path.join(repoRoot, "tools", "scene-signoff", "console.mjs"), "--line"], {
    encoding: "utf8",
    cwd: repoRoot
  }).trim();
  assert.match(out, /^Sign-Off:/);
  assert.equal(out.split("\n").length, 1);
  assert.equal(out, headline(board));
});

test("the console CLI's board mode runs and mentions every episode", () => {
  const out = execFileSync(process.execPath, [path.join(repoRoot, "tools", "scene-signoff", "console.mjs")], {
    encoding: "utf8",
    cwd: repoRoot
  });
  assert.match(out, /SIGN-OFF BOARD/);
  for (const ep of corpus.episodes) assert.ok(out.includes(ep.id), `board does not mention ${ep.id}`);
  assert.match(out, /Place:/);
});

test("the seal CLI refuses to seal a scene with no review record, and changes nothing", () => {
  const target = board.rows.find((r) => !r.live && !r.inReview);
  assert.ok(target, "expected at least one un-reviewed scene to try this against");
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [path.join(repoRoot, "tools", "scene-signoff", "seal.mjs"), "seal", target.briefRef, "--by", "Ingram"],
        { encoding: "utf8", cwd: repoRoot, stdio: "pipe" }
      ),
    /./
  );
  // Re-read from disk: the refusal must not have written anything.
  const after = buildBoard(loadCorpus()).rows.find((r) => r.sceneId === target.sceneId);
  assert.equal(after.live, false);
  assert.equal(after.sealedVersion, null);
});

test("the checklist's own auto-check coverage is worth having -- at least a quarter of checks are mechanised", () => {
  const total = corpus.checklist.checks.length;
  const auto = corpus.checklist.checks.filter((c) => c.auto).length;
  assert.ok(auto / total >= 0.25, `only ${auto}/${total} checks are mechanised; the console would be mostly decoration`);
});
