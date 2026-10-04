// Tier 1 — choice prompts: the GM presses one button, every player picks, and
// "Something else" is always the last option (core/choice-prompt.mjs).
//
// Ingram, 2026-10-04: the Local Studies / Workshop Induction split "needs to be
// a single button the GM presses which brings up the choices for players to
// pick something. We always include a third choice button that players can opt
// for which covers things that went unexpectedly."

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ELSE_ID,
  applyPromptPick,
  emptyPromptState,
  openPrompt,
  promptOptions,
  promptTally,
  recordedChoiceLabel,
  settlePrompt
} from "../module/blank-inheritance/scripts/core/choice-prompt.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const LOCAL_AND_WORKSHOP = {
  label: "First period. Which end of the corridor?",
  options: [
    { id: "local-studies", label: "Local studies: the city on a wall map.", consequence: "Where everything is." },
    { id: "workshop", label: "Workshop induction: the machine shop.", consequence: "Tools, hands, and a very loud woman." }
  ],
  allowsInventedOption: true
};

const roster = [
  { userId: "u1", name: "Ana", characterName: "Mika", active: true },
  { userId: "u2", name: "Ben", characterName: null, active: true },
  { userId: "u3", name: "Cy", characterName: "Ren", active: false }
];

const open = () => openPrompt({ id: "p1", briefId: "b", beatId: "which-room", choicePoint: LOCAL_AND_WORKSHOP, openedAt: 1 });

test("every prompt ends in 'Something else', exactly once, after the authored options", () => {
  const options = promptOptions(LOCAL_AND_WORKSHOP);
  assert.deepEqual(options.map((o) => o.id), ["local-studies", "workshop", ELSE_ID]);
  assert.equal(options.at(-1).isElse, true);
  assert.equal(options.filter((o) => o.isElse).length, 1);
});

test("'Something else' is offered whether or not the choicePoint allows an invented option", () => {
  const { allowsInventedOption, ...plain } = LOCAL_AND_WORKSHOP;
  assert.equal(allowsInventedOption, true);
  assert.equal(promptOptions(plain).at(-1).id, ELSE_ID);
  assert.equal(promptOptions({ ...plain, allowsInventedOption: false }).at(-1).id, ELSE_ID);
});

test("an authored option cannot take the 'Something else' id, and a choicePoint with no options still gets the one button", () => {
  const sneaky = { options: [{ id: ELSE_ID, label: "Hijacked" }, { id: "a", label: "A" }] };
  const options = promptOptions(sneaky, { elseLabel: "Something else" });
  assert.deepEqual(options.map((o) => o.id), ["a", ELSE_ID]);
  assert.equal(options.at(-1).label, "Something else");
  assert.deepEqual(promptOptions(undefined).map((o) => o.id), [ELSE_ID]);
  assert.deepEqual(promptOptions({ options: "nonsense" }).map((o) => o.id), [ELSE_ID]);
});

test("the labels the GM's client passes in are the ones the table sees", () => {
  const [, , other] = promptOptions(LOCAL_AND_WORKSHOP, { elseLabel: "Anything else", elseBlurb: "Say what.", elseConsequence: "Adjudicate it." });
  assert.equal(other.label, "Anything else");
  assert.equal(other.blurb, "Say what.");
  assert.equal(other.consequence, "Adjudicate it.");
});

test("an option carries a player-facing blurb apart from the GM's consequence", () => {
  const options = promptOptions({ options: [{ id: "a", label: "A", blurb: "A plain line.", consequence: "The GM-only truth, which names the right answer." }] });
  assert.equal(options[0].blurb, "A plain line.");
  assert.equal(options[0].consequence, "The GM-only truth, which names the right answer.");
  assert.equal(promptOptions({ options: [{ id: "a", label: "A" }] })[0].blurb, null);
});

test("the shared record never carries GM text: a prompt's options hold id, label and blurb, and no consequence", () => {
  const prompt = openPrompt({
    id: "p",
    briefId: "b",
    beatId: "x",
    choicePoint: { label: "Q?", options: [{ id: "a", label: "A", blurb: "Shown.", consequence: "SECRET: the correct answer is A and nothing may signal it." }] },
    elseBlurb: "Tell the table."
  });
  assert.deepEqual(prompt.options.map((o) => Object.keys(o).sort()), [["blurb", "id", "isElse", "label"], ["blurb", "id", "isElse", "label"]]);
  assert.equal(JSON.stringify(prompt).includes("SECRET"), false, "GM-only consequence text reached the shared record");
});

test("a prompt opens with the question, the three options, and nobody picked", () => {
  const prompt = open();
  assert.equal(prompt.question, LOCAL_AND_WORKSHOP.label);
  assert.equal(prompt.options.length, 3);
  assert.deepEqual(prompt.picks, {});
  assert.equal(prompt.beatId, "which-room");
  assert.deepEqual(emptyPromptState(), { version: 1, prompt: null });
});

test("a pick lands, a repeat replaces it, and null takes it back; the old record is never mutated", () => {
  const prompt = open();
  const one = applyPromptPick(prompt, { userId: "u1", optionId: "workshop" });
  assert.equal(one.ok, true);
  assert.deepEqual(one.prompt.picks, { u1: "workshop" });
  assert.deepEqual(prompt.picks, {}, "the record handed in was changed");
  const two = applyPromptPick(one.prompt, { userId: "u1", optionId: ELSE_ID });
  assert.deepEqual(two.prompt.picks, { u1: ELSE_ID });
  const back = applyPromptPick(two.prompt, { userId: "u1", optionId: null });
  assert.deepEqual(back.prompt.picks, {});
});

test("a pick is refused, with a reason, when there is no question, no one asking, or no such option", () => {
  assert.deepEqual(applyPromptPick(null, { userId: "u1", optionId: "workshop" }), { ok: false, reason: "nothing-to-pick" });
  assert.deepEqual(applyPromptPick(open(), { optionId: "workshop" }), { ok: false, reason: "no-user" });
  assert.deepEqual(applyPromptPick(open(), { userId: "u1", optionId: "the-roof" }), { ok: false, reason: "unknown-option" });
});

test("the tally says who is waiting and what each option has collected, by character name where there is one", () => {
  let prompt = open();
  prompt = applyPromptPick(prompt, { userId: "u1", optionId: "local-studies" }).prompt;
  prompt = applyPromptPick(prompt, { userId: "u2", optionId: "local-studies" }).prompt;
  const tally = promptTally(prompt, roster);
  assert.equal(tally.done, 2);
  assert.equal(tally.total, 3);
  assert.equal(tally.complete, false);
  assert.deepEqual(tally.byOption.find((o) => o.id === "local-studies").takers, ["Mika", "Ben"]);
  assert.equal(tally.byOption.find((o) => o.id === "local-studies").count, 2);
  const waiting = tally.rows.find((r) => r.userId === "u3");
  assert.equal(waiting.done, false);
  assert.equal(waiting.label, null);
  assert.equal(waiting.active, false);
});

test("the tally is complete only when everyone on the roster has picked; an empty roster is never complete", () => {
  let prompt = open();
  for (const m of roster) prompt = applyPromptPick(prompt, { userId: m.userId, optionId: ELSE_ID }).prompt;
  assert.equal(promptTally(prompt, roster).complete, true);
  assert.equal(promptTally(open(), []).complete, false);
});

test("a pick by someone who left the roster still counts toward the option's head-count", () => {
  const prompt = applyPromptPick(open(), { userId: "gone", optionId: "workshop" }).prompt;
  const tally = promptTally(prompt, roster);
  assert.equal(tally.byOption.find((o) => o.id === "workshop").count, 1);
  assert.equal(tally.done, 0);
});

test("settling picks the most-picked option as the choice and keeps the whole split; a tie goes to the one written first", () => {
  let prompt = open();
  prompt = applyPromptPick(prompt, { userId: "u1", optionId: "workshop" }).prompt;
  prompt = applyPromptPick(prompt, { userId: "u2", optionId: "workshop" }).prompt;
  prompt = applyPromptPick(prompt, { userId: "u3", optionId: "local-studies" }).prompt;
  assert.deepEqual(settlePrompt(prompt), { choice: "workshop", picks: { u1: "workshop", u2: "workshop", u3: "local-studies" } });

  const tie = applyPromptPick(applyPromptPick(open(), { userId: "u1", optionId: "workshop" }).prompt, { userId: "u2", optionId: "local-studies" }).prompt;
  assert.equal(settlePrompt(tie).choice, "local-studies");

  const else_ = applyPromptPick(open(), { userId: "u1", optionId: ELSE_ID }).prompt;
  assert.equal(settlePrompt(else_).choice, ELSE_ID);
});

test("settling with nobody picked records nothing; a stale pick for a vanished option is dropped", () => {
  assert.equal(settlePrompt(open()), null);
  assert.equal(settlePrompt(null), null);
  const stale = { ...open(), picks: { u1: "the-roof" } };
  assert.equal(settlePrompt(stale), null);
});

test("the recorded line names every option the table took, with head-counts only when it split", () => {
  const options = promptOptions(LOCAL_AND_WORKSHOP);
  assert.equal(recordedChoiceLabel(options, { choice: "workshop", picks: { u1: "workshop", u2: "workshop" } }), options[1].label);
  assert.equal(
    recordedChoiceLabel(options, { choice: "workshop", picks: { u1: "workshop", u2: "workshop", u3: "local-studies" } }),
    `${options[0].label} ×1 · ${options[1].label} ×2`
  );
  // A choice the GM recorded by hand has no picks: the plain label, as before.
  assert.equal(recordedChoiceLabel(options, { choice: ELSE_ID }), "Something else");
  assert.equal(recordedChoiceLabel(options, { choice: "retired-option" }), "retired-option");
  assert.equal(recordedChoiceLabel(options, null), null);
});

test("REAL DATA: the school scene's room split opens as Local studies, Workshop induction and Something else", () => {
  const brief = JSON.parse(readFileSync(path.join(repoRoot, "data", "scene-briefs", "episode-c1e1--school-first-period.json"), "utf8"));
  const beat = brief.beats.find((b) => b.id === "which-room");
  assert.ok(beat?.choicePoint, "the room split is no longer a choicePoint");
  const prompt = openPrompt({ id: "p", briefId: brief.id, beatId: beat.id, choicePoint: beat.choicePoint });
  assert.deepEqual(prompt.options.map((o) => o.id), ["local-studies", "workshop", ELSE_ID]);
});

test("REAL DATA: no authored choicePoint anywhere uses the reserved 'something-else' id (it would be silently dropped)", () => {
  const dir = path.join(repoRoot, "data", "scene-briefs");
  const clashes = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
    const brief = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
    for (const beat of brief.beats ?? []) {
      for (const option of beat.choicePoint?.options ?? []) if (option.id === ELSE_ID) clashes.push(`${name}/${beat.id}`);
    }
  }
  assert.deepEqual(clashes, []);
});
