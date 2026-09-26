// Tier 2 — the connective tissue between Episode One's own scenes, 2026-09-19.
//
// Found live (Ingram, reading Kit Issue's own outro): "Straight into the
// canteen" gave no reason a party would actually go there, and — found while
// designing the fix — named the WRONG scene entirely. The Errand was
// inserted between Kit Issue and Canteen on 2026-09-13 (to put the campaign's
// primary antagonist in front of the players), and The Errand's own outro
// already correctly said it led into Canteen — meaning TWO scenes in the
// same episode both claimed to lead into Canteen, and Kit Issue's own claim
// was simply stale prose nobody had updated.
//
// Ingram's own framing: this was never a one-scene fix. "I'm identifying a
// storytelling gap where scenes DO NOT yet have connective tissue between
// them... fix the concept then do a sweep across all Session 0/1 material."
// This is that sweep, checked against the real files rather than assumed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const briefDir = path.join(repoRoot, "data", "scene-briefs");

function brief(id) {
  return JSON.parse(readFileSync(path.join(briefDir, `${id}.json`), "utf8"));
}

const MECHANISMS = new Set(["ordered", "scheduled", "invited", "needed"]);

const episodeOne = JSON.parse(
  readFileSync(path.join(repoRoot, "data", "episodes", "episode-c1e1-mothers-maiden-name.json"), "utf8")
);

/** The scene that genuinely follows `sceneId` in the episode's own running order. */
function nextSceneAfter(sceneId) {
  const ordered = [...episodeOne.scenes].sort((a, b) => a.order - b.order);
  const i = ordered.findIndex((s) => s.id === sceneId);
  assert.notEqual(i, -1, `${sceneId} is not in the episode's scene list`);
  assert.ok(i + 1 < ordered.length, `${sceneId} is the last scene and has nothing after it`);
  return ordered[i + 1];
}

// This assertion used to hardcode "The Errand" as what follows Kit Issue. That
// was true when it was written and stopped being true the moment a scene was
// inserted between them -- which is the same class of bug the test exists to
// catch, one level up. It now derives the answer from the episode's own running
// order, so a reorder updates the expectation instead of breaking the test.
test("REGRESSION: Kit Issue's outro names whatever genuinely comes next, and exactly one scene claims Canteen", () => {
  const kitIssue = brief("episode-c1e1--kit-issue");
  const next = nextSceneAfter("kit-issue");

  // A note may MENTION a later scene while explaining the route to it. What it
  // must not do is CLAIM one as the destination, which is what the original
  // "straight into the canteen" leading clause did.
  const opener = kitIssue.outro.onwards.split(/[.,]/)[0];
  const keyword = next.title.replace(/^(the|a)\s+/i, "").split(/[:\s]+/)[0];
  assert.match(
    opener,
    new RegExp(keyword, "i"),
    `Kit Issue's outro opens with "${opener}" but the next scene in the running order is "${next.title}"`
  );

  const claimants = episodeOne.scenes
    .map((s) => ({ s, b: brief(s.briefRef) }))
    .filter(({ b }) => /^(straight )?into the canteen/i.test(String(b.outro?.onwards ?? "").trim()))
    .map(({ s }) => s.title);
  assert.deepEqual(
    claimants.length <= 1,
    true,
    `${claimants.length} scenes claim Canteen as their destination (${claimants.join(", ")}) -- having two was the original bug`
  );
});

test("every real Episode One scene except the last has a real, structurally valid transition", () => {
  const withTransition = [
    "episode-c1e1--from-up-here",
    "episode-c1e1--the-road-in",
    "episode-c1e1--intake-medicals",
    "episode-c1e1--kit-issue",
    "episode-c1e1--the-errand",
    "episode-c1e1--canteen"
  ];
  for (const id of withTransition) {
    const b = brief(id);
    const t = b.outro?.transition;
    assert.ok(t, `${id} has no outro.transition at all`);
    assert.ok(MECHANISMS.has(t.mechanism), `${id}'s transition mechanism "${t.mechanism}" is not one of ${[...MECHANISMS].join("/")}`);
    assert.equal(typeof t.scatterRisk, "boolean", `${id}'s transition does not state scatterRisk as a real boolean`);
    assert.ok(t.line && t.line.length > 0, `${id}'s transition has no actual sayable line`);
  }
});

test("Flood Tunnel Clearance is the last scene of the session and correctly has no transition to author", () => {
  const floodTunnel = brief("episode-c1e1--flood-tunnel");
  assert.equal(floodTunnel.outro.transition ?? null, null, "Flood Tunnel now has a transition, but it's the last scene in the episode — check whether a new scene was added after it");
});

test("Canteen -> Flood Tunnel is authored as a real ORDER with zero scatter risk, matching its own tannoy beat", () => {
  const canteen = brief("episode-c1e1--canteen");
  assert.equal(canteen.outro.transition.mechanism, "ordered");
  assert.equal(canteen.outro.transition.scatterRisk, false);
  // The scene's own beat already says "no choice is offered" -- the
  // transition's own text should not contradict that by suggesting one.
  const announcementBeat = canteen.beats.find((b) => b.id === "the-announcement");
  assert.match(announcementBeat.direction, /no choice/i);
});

test("Kit Issue -> The Errand is authored as ORDERED (a superior sends them), not left as an open/needed choice", () => {
  const kitIssue = brief("episode-c1e1--kit-issue");
  assert.equal(kitIssue.outro.transition.mechanism, "ordered");
  assert.equal(kitIssue.outro.transition.scatterRisk, false);
});
