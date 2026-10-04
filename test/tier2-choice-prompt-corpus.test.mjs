// Tier 2 — every group choice in canon uses the choice prompt, the same way.
//
// Ingram, 2026-10-04, after the "Ask the players" button was built for the
// Local Studies / Workshop Induction split: every place the group is offered a
// choice, above all where it splits and comes back together, must use it, and
// it is "a feature of the system which needs to be used going forwards".
//
// Two guards, both over canon/scenes (the only scenes being written going
// forward; everything outside canon/ is old):
//
//   1. A beat that tells the GM to have each player pick (take a job, choose a
//      room, say where they work) carries a `choicePoint`. Found by phrasing,
//      so a new scene that splits the party in prose fails here, not at the
//      table. The audit that set this up found canon clean except the three
//      beats now fixed (Flood Tunnel's split, the Night Shift's three jobs,
//      the Magic Show's finale).
//
//   2. Every option of every choicePoint carries a `blurb`, the one line a
//      player sees on their button. The audit found authored `consequence`
//      lines that name the right answer or a hidden reaction; those are GM-only
//      and the player window never shows them, so the blurb must be written, be
//      short, and say nothing a player should not know yet.
//
// What is deliberately NOT here: haunt event cards (dilemma / danger) cannot
// carry a choicePoint, because the schema allows it on beats only. They are a
// recorded gap (see the audit notes in design/scene-triggers-and-depth.md).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ELSE_ID } from "../module/blank-inheritance/scripts/core/choice-prompt.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(repoRoot, "canon", "scenes");

const scenes = readdirSync(dir)
  .filter((n) => n.endsWith(".json"))
  .map((name) => ({ name, brief: JSON.parse(readFileSync(path.join(dir, name), "utf8")) }));

const beats = () => scenes.flatMap(({ name, brief }) => (brief.beats ?? []).map((beat) => ({ key: `${name.replace(/\.json$/, "")}/${beat.id}`, beat })));

// Phrasings that mean "every player picks one of these". Narrow on purpose: it
// must claim the group is being asked to choose, not merely mention a choice.
const ASKS_EACH_TO_PICK =
  /\beach (?:player|character) (?:picks|chooses|decides|takes one|says where)\b|\bwhich (?:one|job|room|end) (?:does|do) (?:your|their) (?:character|they)\b|\bpicks? a room\b/i;

// Beats that match and are correctly not a choice. Empty today; every entry
// needs a real reason, and the list is checked for rot below.
const NOT_A_CHOICE = new Map();

test("a canon beat that has each player pick carries a choicePoint", () => {
  const missing = beats()
    .filter(({ key, beat }) => !beat.choicePoint && !NOT_A_CHOICE.has(key) && ASKS_EACH_TO_PICK.test([beat.text, beat.direction, beat.note].filter(Boolean).join(" ")))
    .map((b) => b.key);
  assert.deepEqual(
    missing,
    [],
    "beats that ask each player to pick but carry no choicePoint. Give them one (the GM presses Ask the players, every player picks), or add them to NOT_A_CHOICE with the reason."
  );
});

test("the not-a-choice list does not rot", () => {
  const keys = new Set(beats().map((b) => b.key));
  for (const [key, reason] of NOT_A_CHOICE) {
    assert.ok(keys.has(key), `${key} is listed as not-a-choice but no longer exists`);
    assert.ok(reason.length > 60, `${key} needs a real reason, not a label`);
  }
});

test("the detector still finds the beats it was written for", () => {
  const found = beats().filter(({ beat }) => beat.choicePoint && ASKS_EACH_TO_PICK.test([beat.text, beat.direction, beat.note].filter(Boolean).join(" "))).map((b) => b.key);
  for (const key of ["episode-c1e1--school-second-period/which-room-again", "episode-c1e1--flood-tunnel/split-the-job", "rest--night-shift/your-hands"]) {
    assert.ok(found.includes(key), `the detector no longer recognises ${key}`);
  }
});

test("every canon choicePoint option has a short, player-safe blurb distinct from its GM consequence", () => {
  const problems = [];
  let count = 0;
  for (const { key, beat } of beats()) {
    for (const option of beat.choicePoint?.options ?? []) {
      count++;
      const where = `${key}/${option.id}`;
      if (option.id === ELSE_ID) problems.push(`${where}: uses the reserved id (the prompt appends "Something else" itself)`);
      const blurb = String(option.blurb ?? "").trim();
      if (!blurb) problems.push(`${where}: no blurb, so the player's button would show only its label`);
      else {
        if (blurb.length > 90) problems.push(`${where}: blurb is ${blurb.length} characters, over the 90 a button holds`);
        if (blurb === String(option.consequence ?? "").trim()) problems.push(`${where}: blurb is the GM's consequence copied; write the player's line`);
        if (/\bDC\b|\b\d+d\d+\b|critical|\+\d/i.test(blurb)) problems.push(`${where}: blurb names a check or a number, which is the GM's to hold back`);
      }
    }
  }
  assert.ok(count >= 15, `expected to find the canon choicePoint options, found ${count}`);
  assert.deepEqual(problems, []);
});
