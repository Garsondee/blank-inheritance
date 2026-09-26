// Tier 2 — GM-facing content must never carry design rationale, 2026-09-19.
//
// Found live (Ingram, reading Kit Issue in the Scene Runner): a beat's own
// `note` field read "Never required. Costs nothing on any result -- same
// design rule as The Road In's a-flourish." His own framing: "In the
// description of that you give your LLM reasoning for a decision but this
// content absolutely shouldn't be visible to the GM because at the point of
// reading this stuff your justification for decisions is long past being
// relevant and it's cluttering up the scene. It might be important to note
// somewhere why you did something but not important to tell me during a
// live session why."
//
// The fields this checks (`beats[].note`, `beats[].direction`) are exactly
// the ones templates/runner/beat.hbs renders live in front of the GM —
// confirmed by reading that template, not assumed. A brief's own top-level
// `notes` field is the safe place for this kind of commentary; panel.hbs
// never renders it (also confirmed by reading the template).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const briefDir = path.join(repoRoot, "data", "scene-briefs");

// The specific pattern found live: a cross-reference to WHY a beat was
// authored a certain way (matching another beat's own design, or citing a
// design-doc decision log), as opposed to WHAT the GM needs to run it.
const RATIONALE_PATTERN = /same design rule|design rule as|decision log|full rationale/i;

test("panel.hbs never renders a scene brief's own top-level `notes` field — confirmed, not assumed, since that's what makes it the safe place for authoring rationale", () => {
  const panel = readFileSync(
    path.join(repoRoot, "module", "blank-inheritance", "templates", "runner", "panel.hbs"),
    "utf8"
  );
  assert.doesNotMatch(panel, /\{\{notes\}\}|\{\{brief\.notes\}\}/, "panel.hbs now renders the brief's own top-level notes field live — the whole premise of this test file is now wrong");
});

test("no beat's live-rendered note or direction cites another beat/scene's own design rationale — the exact pattern found live in Kit Issue and Canteen", () => {
  const offenders = [];
  for (const file of readdirSync(briefDir).filter((f) => f.endsWith(".json"))) {
    const brief = JSON.parse(readFileSync(path.join(briefDir, file), "utf8"));
    for (const beat of brief.beats ?? []) {
      for (const field of ["note", "direction"]) {
        if (typeof beat[field] === "string" && RATIONALE_PATTERN.test(beat[field])) {
          offenders.push(`${file}#${beat.id}.${field}: ${beat[field]}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], "a beat's live-rendered note/direction still cites design rationale instead of just what the GM needs to run it");
});

test("REGRESSION: the two real instances found live are actually fixed, not just no-longer-matched by accident", () => {
  const kitIssue = JSON.parse(readFileSync(path.join(briefDir, "episode-c1e1--kit-issue.json"), "utf8"));
  const testTheFit = kitIssue.beats.find((b) => b.id === "test-the-fit");
  assert.equal(testTheFit.note, "Never required. Costs nothing on any result.");

  const pickYourKit = kitIssue.beats.find((b) => b.id === "pick-your-kit");
  assert.match(pickYourKit.note, /curated Directorate menu/);
  assert.doesNotMatch(pickYourKit.note, /decision log/);

  const canteen = JSON.parse(readFileSync(path.join(briefDir, "episode-c1e1--canteen.json"), "utf8"));
  const recallTheDrains = canteen.beats.find((b) => b.id === "recall-the-drains");
  assert.equal(recallTheDrains.note, "The hard Recall Knowledge path. Never required, costs nothing on any result -- an Encyclopaedia check.");
});
