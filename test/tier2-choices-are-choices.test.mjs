// Tier 2 — a beat whose own direction says it is the scene's real decision
// carries a choicePoint, 2026-09-21.
//
// WHY THIS EXISTS. `choicePoint` was added to the scene-brief schema at
// Ingram's request, so the Scene Runner could show the GM a fork visibly
// rather than burying it in prose: "You should probably clearly mark in the
// scene runner when I'm offering the group a chance to make a choice."
//
// Four beats then got written that describe themselves, in their own GM
// direction, as exactly that -- "this is a real decision, not a test", "a
// real, cheap, consequential choice and it belongs to the players entirely",
// "the largest decision the party has made in the campaign so far" -- and
// carried no choicePoint at all. Two of them are the biggest decisions in
// either episode: which machine each character takes for the rest of the
// campaign, and whether six fifteen-year-olds disobey a direct order to go
// and get forty people off a road.
//
// The prose was never wrong. The data just did not agree with it, and the
// panel renders the data.
//
// WHAT THIS DOES NOT DO: decide that every beat mentioning a choice needs
// one. Three of the seven the first sweep found are correctly plain -- a
// teacher describing an institution's choice, an optional beat about sitting
// in a dark cab. Those are listed below with the reason, and the list is
// checked for rot so it cannot quietly become a place to dump findings.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const briefDir = path.join(repoRoot, "data", "scene-briefs");

// Phrasings taken from the real directions. Deliberately narrow: it must
// claim the beat IS a decision belonging to the players, not merely mention
// that somebody somewhere chose something.
const CLAIMS_TO_BE_A_CHOICE =
  /\b(?:is|as) a real (?:decision|choice)\b|\bthe largest decision\b|belongs (?:entirely )?to the players\b|\bis a real, cheap, consequential choice\b/i;

// Beats that say something choice-shaped and are correctly plain prose.
const NOT_A_FORK = new Map([
  [
    "episode-c1e1--school-second-period/signals",
    "The signals teacher is explaining that the Directorate chooses not to listen to the island's calls. That is an institution's choice being described to the party, not one of theirs to make."
  ],
  [
    "episode-c1e2--the-night-off/the-unlocked-hangar",
    "An optional beat about sitting alone in a cold, dark, much-too-big cab with no power. There is no fork -- whoever goes in, sits, and the scene lets them sit for as long as they want."
  ],
  [
    "episode-c1e2--slack-water/the-wall",
    "How six people spend a window that is too short is the spine of a forty-minute scene, not a fork at one moment. The decision it feeds surfaces later, at the-inspection, where what the Section Officer finds depends on how they spent it."
  ]
]);

function beats() {
  const out = [];
  for (const name of readdirSync(briefDir).filter((n) => n.startsWith("episode-c1e") && n.endsWith(".json"))) {
    const brief = JSON.parse(readFileSync(path.join(briefDir, name), "utf8"));
    for (const beat of brief.beats ?? []) {
      out.push({ key: `${name.replace(/\.json$/, "")}/${beat.id}`, beat, title: brief.title });
    }
  }
  return out;
}

test("a beat that calls itself the scene's real decision carries a choicePoint", () => {
  const missing = beats()
    .filter(({ key, beat }) => {
      if (beat.choicePoint) return false;
      if (NOT_A_FORK.has(key)) return false;
      return CLAIMS_TO_BE_A_CHOICE.test(String(beat.direction ?? "") + " " + String(beat.text ?? ""));
    })
    .map((x) => x.key);
  assert.deepEqual(
    missing,
    [],
    "beats whose direction says they are the players' real decision but which carry no choicePoint. " +
      "Give them one with its options and consequences, or add them to NOT_A_FORK with the reason."
  );
});

test("every choicePoint option states what it actually does", () => {
  const bare = [];
  for (const { key, beat } of beats()) {
    if (!beat.choicePoint) continue;
    for (const opt of beat.choicePoint.options ?? []) {
      if (!opt.consequence || opt.consequence.length < 40) bare.push(`${key}/${opt.id}`);
    }
  }
  assert.deepEqual(bare, [], "choicePoint options with no real stated consequence");
});

test("the not-a-fork list does not rot", () => {
  const keys = new Set(beats().map((b) => b.key));
  for (const [key, reason] of NOT_A_FORK) {
    assert.ok(keys.has(key), `${key} is listed as not-a-fork but no longer exists`);
    assert.ok(reason.length > 60, `${key} needs a real reason, not a label`);
  }
});
