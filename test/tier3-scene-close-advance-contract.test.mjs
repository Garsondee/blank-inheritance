// Tier 3 — closing a scene actually carries the table onward.
//
// Found live 2026-09-18: Ingram closed "Kit Issue" and nothing happened
// beyond the bookkeeping dialogue -- no fade, no map, no token animation.
// #onCutTo already drove the whole SCENE -> MAP -> SCENE ritual, but only
// for a backdrop belonging to whichever brief happened to be loaded; there
// was no path from "I just confirmed this scene is done" to "take the table
// to whatever comes next." This is that path.
//
// scene-runner.mjs destructures `foundry.applications.api` at module scope,
// so — matching every other tier3-*-contract.test.mjs in this project — this
// reads the real source rather than mounting the class.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const src = readFileSync(path.join(repoRoot, "module", "blank-inheritance", "scripts", "foundry", "scene-runner.mjs"), "utf8");

test("a CLEAN scene closure advances the table to the next scene, using the same travel ritual #onCutTo already uses", () => {
  const fn = src.match(/async function advanceAfterClose\(closedBriefId\) \{[\s\S]*?\n\}/);
  assert.ok(fn, "advanceAfterClose is missing from scene-runner.mjs");
  assert.match(fn[0], /needsTravel\(fromRef, toRef\)/, "does not check whether the crossing needs the map ritual");
  assert.match(fn[0], /runTravelSequence\(fromRef, toRef, targetSceneId\)/, "does not drive the real SCENE -> MAP -> SCENE sequence");
  assert.match(fn[0], /cueScene\(targetSceneId\)/, "does not fall back to a plain cut when travel is not needed");

  const hook = src.match(/Hooks\.on\("blank-inheritance\.sceneClosed", \(\{ briefRef, advances \} = \{\}\) => \{[\s\S]*?\n\}\);/);
  assert.ok(hook, "the sceneClosed listener no longer destructures `advances`");
  assert.match(hook[0], /advances \? advanceAfterClose\(briefRef\) : null/, "advancing is no longer gated on the closure\'s own `advances`");
});

test("a closure that should NOT advance (unfinished, or a PANIC verdict) never calls advanceAfterClose — leaving mid-scene must not silently travel the table away", () => {
  const hook = src.match(/Hooks\.on\("blank-inheritance\.sceneClosed", \(\{ briefRef, advances \} = \{\}\) => \{[\s\S]*?\n\}\);/);
  assert.ok(hook);
  // The ternary above IS the gate; this just pins the shape so a future edit
  // cannot quietly drop the condition and call advanceAfterClose unconditionally.
  assert.doesNotMatch(hook[0], /\.then\(\(\) => advanceAfterClose\(briefRef\)\)/, "advanceAfterClose is called unconditionally, not gated on `advances`");
  // And the listener must not rebuild the rule itself out of the raw parts,
  // which is exactly how the panic case would get lost. `advances` rather than
  // `complete` as of the 2026-09-22 Close Scene rebuild: core/scene-close.mjs
  // folds BOTH reasons to stay put into that one field -- an unfinished scene
  // ("carries forward", the original reason) and a PANIC verdict, which means
  // the GM is in trouble right now and is the last person who should have the
  // table teleported out from under them.
  assert.doesNotMatch(hook[0], /\bcomplete\b/, "the listener reads `complete` again instead of the single `advances` decision core already made");
});

// Ingram, 2026-09-28: the day ring should follow the story, not wait for a GM to click "advance" by hand
// (design/ux-doctrine.md §7a: "the ring is the fiction's time of day"). Found while confirming Episode One's
// scenes actually carry a day/quarter: nothing moved the campaign clock when the table moved between authored
// scenes at all, only the Director's own manual control.
test("advancing to the next authored scene also moves the day ring to that scene's own day and quarter", () => {
  const fn = src.match(/async function advanceAfterClose\(closedBriefId\) \{[\s\S]*?\n\}/);
  assert.ok(fn);
  assert.match(fn[0], /await advanceMomentTo\(next\);/, "the next scene's day/quarter never reaches the campaign clock");
  // Before anything about backdrops or travel: the clock reflects the story even when the next scene has no built
  // Scene document yet.
  const momentAt = fn[0].indexOf("advanceMomentTo(next)");
  const backdropAt = fn[0].indexOf("backdropsFor(next.briefRef)");
  assert.ok(momentAt > -1 && backdropAt > momentAt, "the clock is moved after the backdrop lookup, not before it");

  const helper = src.match(/async function advanceMomentTo\(next\) \{[\s\S]*?\n\}/);
  assert.ok(helper, "advanceMomentTo is missing from scene-runner.mjs");
  assert.match(helper[0], /if \(!Number\.isInteger\(next\?\.day\) \|\| !next\?\.quarter \|\| !game\.user\?\.isGM\) return;/, "a scene with no fixed day/quarter (Scene 0, or the plan's flexible/unknown) must never force the clock");
  assert.match(helper[0], /if \(before\.day === next\.day && before\.quarter === next\.quarter\) return;/, "must not call setMoment when the quarter has not actually changed -- every write fires the segment ceremony on every client");
  assert.match(helper[0], /await setMoment\(\{ day: next\.day, quarter: next\.quarter \}\);/);
});

// This used to assert the specific pair Kit Issue (order 3) -> The Errand
// (order 4). That was a snapshot of one running order, and it broke the moment
// a scene was inserted between them -- which is not a bug, it is authoring. The
// contract worth pinning is not WHICH scene comes next but that the episode's
// order and the closing scene's own prose agree about it, because a GM reads the
// prose and the Scene Runner obeys the order. Those disagreeing is the real
// defect, and it survives any reorder.
for (const episodeFile of ["episode-c1e1-mothers-maiden-name", "episode-c1e2-scheduled-exercise"]) {
  test(`REAL DATA: every ${episodeFile} scene's own outro names the scene the running order actually advances to`, () => {
    const episode = JSON.parse(readFileSync(path.join(repoRoot, "data", "episodes", `${episodeFile}.json`), "utf8"));
    const scenes = episode.scenes.filter((s) => s.briefRef).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    assert.ok(scenes.length > 1, `${episodeFile} has fewer than two authored scenes -- this test's premise is stale`);

    const briefDir = path.join(repoRoot, "data", "scene-briefs");
    const disagreements = [];
    for (let i = 0; i < scenes.length - 1; i++) {
      const here = scenes[i];
      const next = scenes[i + 1];
      const brief = JSON.parse(readFileSync(path.join(briefDir, `${here.briefRef}.json`), "utf8"));
      const onwards = String(brief.outro?.onwards ?? "");
      // The distinctive word in the next scene's title, ignoring articles and a
      // "School:" style prefix.
      const keyword = next.title.replace(/^(the|a)\s+/i, "").split(/[:\s]+/).filter(Boolean)[0];
      if (!new RegExp(keyword, "i").test(onwards)) {
        disagreements.push(
          `${here.title} (order ${here.order}) advances to ${next.title}, but its outro.onwards does not name it: "${onwards.slice(0, 90)}..."`
        );
      }
    }
    assert.deepEqual(disagreements, [], `running order and outro prose disagree:\n  ${disagreements.join("\n  ")}`);
  });
}

test("REAL DATA: closing the LAST authored scene (Flood Tunnel Clearance) has nothing to advance to, and must not throw", () => {
  const episode = JSON.parse(
    readFileSync(path.join(repoRoot, "data", "episodes", "episode-c1e1-mothers-maiden-name.json"), "utf8")
  );
  const scenes = episode.scenes.filter((s) => s.briefRef).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const closedIndex = scenes.findIndex((s) => s.briefRef === "episode-c1e1--flood-tunnel");
  assert.ok(closedIndex >= 0, "Flood Tunnel Clearance is not in the real Episode One episode's own scene list");
  assert.equal(closedIndex, scenes.length - 1, "Flood Tunnel Clearance is not actually the last authored scene — this test's premise is stale");
  assert.equal(scenes[closedIndex + 1], undefined, "there should be nothing after the last scene");
});
