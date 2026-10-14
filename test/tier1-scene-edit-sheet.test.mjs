// Tier 1 — the edit sheet's model (module/blank-inheritance/scripts/core/scene-edit-sheet.mjs).
// design/scene-edits.md §3.
//
// Ingram, 2026-09-27: "Ideally I would go into Scene 0 'From Up Here' and edit
// the whole scene to fit what I want to say." So the tests hold the sheet to
// the whole scene: every field, empty ones included, in running order, keyed
// so each box saves to exactly the field it shows.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_LABEL_KEYS, DELIVERY_OPTIONS, editSheet, FIELD_KINDS, rowsFor } from "../module/blank-inheritance/scripts/core/scene-edit-sheet.mjs";
import { parseFieldKey, resolvePath } from "../module/blank-inheritance/scripts/core/scene-edits.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const readJson = (relative) => JSON.parse(readFileSync(path.join(repoRoot, relative), "utf8"));

const allFields = (sheet) =>
  sheet.sections.flatMap((section) =>
    section.blocks.flatMap((block) => [
      ...(block.fields ?? []),
      ...(block.settings ?? []),
      ...(block.check?.fields ?? []),
      ...(block.choice?.fields ?? []),
      ...(block.lists ?? []).flatMap((list) => list.items)
    ])
  );

test("Scene 0 as a sheet: every section in running order, every beat, and the empty read-aloud there to be written", () => {
  const brief = readJson("data/scene-briefs/episode-c1e1--from-up-here.json");
  const sheet = editSheet({ brief });
  assert.deepEqual(sheet.sections.map((s) => s.id), ["scene", "opening", "beats", "ending", "extras"]);
  const beats = sheet.sections.find((s) => s.id === "beats");
  assert.deepEqual(beats.blocks.map((b) => b.beatId), brief.beats.map((b) => b.id));

  const introRead = allFields(sheet).find((f) => f.key.endsWith("::intro.readAloud"));
  assert.ok(introRead, "the opening's read-aloud is offered even though Scene 0 has none yet");
  assert.equal(introRead.value, "");
  assert.equal(introRead.isRead, true);

  // Every box names a field that resolves in the file it came from.
  for (const field of allFields(sheet)) {
    const { file, path: fieldPath } = parseFieldKey(field.key);
    assert.equal(file, `scene-briefs/${brief.id}`);
    assert.equal(resolvePath(brief, fieldPath).ok, true, field.key);
  }
});

test("a box holds exactly the stored words, bold markers and trigger tokens included", () => {
  // Scene 0's own wording changes as Ingram edits it, so the stored words here are set by the test.
  const brief = { ...readJson("data/scene-briefs/episode-c1e1--from-up-here.json"), howToPlay: "One speech. **No questions** to the table." };
  const sheet = editSheet({ brief });
  const howTo = allFields(sheet).find((f) => f.key.endsWith("::howToPlay"));
  assert.equal(howTo.value, brief.howToPlay);
  assert.match(howTo.value, /\*\*No questions\*\*/);
});

function fixture() {
  return {
    brief: {
      id: "episode-t1--kit",
      title: "Kit",
      intro: { where: "A counter" },
      cast: [{ id: "nobu", npcRef: "nobu", role: "Quartermaster", brief: { wants: "Paperwork", voice: { register: "Brisk", samples: ["Sign there."] } } }],
      beats: [
        { id: "ask", kind: "check", text: "Ask for more", challengeRef: "t1-kit", checkRef: "haggle", npcRef: "nobu", mandatory: true, delivery: "solo" },
        { id: "choose", kind: "action", text: "Choose", choicePoint: { label: "Which kit?", options: [{ id: "light", label: "Light", consequence: "Faster" }] } },
        { id: "leave", kind: "action", text: "Leave" }
      ],
      handouts: [{ id: "form", title: "The form", body: "<p>Sign</p>", catchables: ["A typo"] }],
      temptations: [{ id: "t-a", text: "Offer a bribe" }],
      outro: { endsWhen: "Kit issued", transition: { mechanism: "ordered", line: "Next!" }, writeDown: [] }
    },
    challenges: {
      "t1-kit": {
        id: "t1-kit",
        relatedRefs: ["episode-t1--kit", "episode-t1--other-scene"],
        checks: [{ id: "haggle", name: "Haggle", dc: { value: 15 }, outcomes: { success: "More kit." }, bySkill: { deception: "He believes it." } }]
      }
    }
  };
}

test("a beat's check is edited in its own check file, with the DC as a number and a warning when other scenes share it", () => {
  const { brief, challenges } = fixture();
  const sheet = editSheet({ brief, challenges, npcNames: { nobu: "Nobu" } });
  const ask = sheet.sections.find((s) => s.id === "beats").blocks[0];
  assert.equal(ask.npcName, "Nobu");
  assert.equal(ask.check.file, "challenges/t1-kit");
  const dc = ask.check.fields.find((f) => f.key.endsWith("dc.value"));
  assert.equal(dc.kind, FIELD_KINDS.NUMBER);
  assert.equal(dc.value, 15);
  assert.equal(parseFieldKey(dc.key).file, "challenges/t1-kit");
  assert.equal(ask.check.fields.filter((f) => /outcomes\./.test(f.key)).length, 4, "all four degrees, even the unwritten ones");
  assert.ok(ask.check.fields.some((f) => f.key.endsWith("bySkill.deception") && f.labelData === "deception"));
  assert.equal(ask.check.sharedWith, "episode-t1--other-scene");

  const settings = Object.fromEntries(ask.settings.map((f) => [f.kind, f]));
  assert.equal(settings.flag.value, true);
  assert.equal(settings.choice.options.find((o) => o.selected).value, "solo");
  assert.deepEqual(settings.choice.options.map((o) => o.value), [...DELIVERY_OPTIONS]);
});

test("a way with its own result per degree (D062) is edited one box per degree it has, the line form as one box", () => {
  const { brief, challenges } = fixture();
  challenges["t1-kit"].checks[0].bySkill = {
    deception: "He believes it.",
    intimidation: { success: "He hands it over, sulking.", criticalFailure: "He calls the duty officer." }
  };
  const sheet = editSheet({ brief, challenges });
  const fields = sheet.sections.find((s) => s.id === "beats").blocks[0].check.fields;
  const keys = fields.filter((f) => /bySkill\./.test(f.key)).map((f) => [f.key.replace(/^.*bySkill\./, ""), f.labelData, f.value]);
  assert.deepEqual(keys, [
    ["deception", "deception", "He believes it."],
    ["intimidation.success", "intimidation, success", "He hands it over, sulking."],
    ["intimidation.criticalFailure", "intimidation, critical failure", "He calls the duty officer."]
  ]);
  for (const f of fields.filter((f) => /bySkill\./.test(f.key))) assert.equal(f.kind, FIELD_KINDS.PROSE);
});

test("a choice, a person, a handout and the lists are all on the sheet", () => {
  const { brief, challenges } = fixture();
  const sheet = editSheet({ brief, challenges });
  const choose = sheet.sections.find((s) => s.id === "beats").blocks[1];
  assert.deepEqual(choose.choice.fields.map((f) => f.key.split("::")[1]), [
    "beats[choose].choicePoint.label",
    "beats[choose].choicePoint.options[light].label",
    // The line the players see on their button (core/choice-prompt.mjs), then the GM's own.
    "beats[choose].choicePoint.options[light].blurb",
    "beats[choose].choicePoint.options[light].consequence"
  ]);
  const person = sheet.sections.find((s) => s.id === "people").blocks[0];
  assert.ok(person.fields.some((f) => f.key.endsWith("brief.voice.register")));
  assert.deepEqual(person.lists[0].items.map((i) => i.value), ["Sign there."]);
  assert.equal(person.lists[0].isPlain, true);
  const handout = sheet.sections.find((s) => s.id === "kit").blocks[0];
  assert.ok(handout.fields.find((f) => f.key.endsWith("body")).isCode, "a handout's text is shown as the markup the file stores");
  const extras = sheet.sections.find((s) => s.id === "extras").blocks[0];
  const temptations = extras.lists.find((l) => l.key.endsWith("::temptations"));
  assert.equal(temptations.isPlain, false);
  assert.equal(temptations.idPrefix, "temptation");
  assert.equal(temptations.items[0].itemId, "t-a");
  const ending = sheet.sections.find((s) => s.id === "ending").blocks[0];
  assert.ok(ending.fields.some((f) => f.key.endsWith("outro.transition.line")));
});

test("up and down move a beat one place: to after the beat two above (or the top), or after the next one", () => {
  const { brief } = fixture();
  const blocks = editSheet({ brief }).sections.find((s) => s.id === "beats").blocks;
  assert.equal(blocks[0].canUp, false);
  assert.equal(blocks[0].downAfterId, "choose");
  assert.equal(blocks[1].upAfterId, "", "the second beat moves to the top");
  assert.equal(blocks[2].upAfterId, "ask");
  assert.equal(blocks[2].canDown, false);
});

test("her marks reach the right boxes and cards, and the counts add up", () => {
  const { brief, challenges } = fixture();
  const file = `scene-briefs/${brief.id}`;
  const marks = {
    [`${file}::beats[leave].text`]: { state: "pending", op: "set" },
    [`${file}::beats[choose].text`]: { state: "clash", op: "set" },
    [`${file}::beats[leave]`]: { state: "pending", op: "insert" },
    [`challenges/t1-kit::checks[haggle].dc.value`]: { state: "server-behind", op: "set" }
  };
  const notes = [{ id: "n1", file, path: ["beats", { id: "leave" }], text: "Cut?", state: "pending" }];
  const sheet = editSheet({ brief, challenges, marks, notes });
  const fields = allFields(sheet);
  assert.equal(fields.find((f) => f.key === `${file}::beats[leave].text`).isPending, true);
  assert.equal(fields.find((f) => f.key === `${file}::beats[choose].text`).isClash, true);
  assert.equal(fields.find((f) => f.key.endsWith("dc.value")).isServerBehind, true);
  const leave = sheet.sections.find((s) => s.id === "beats").blocks[2];
  assert.equal(leave.isNew, true);
  assert.equal(leave.notes[0].text, "Cut?");
  assert.deepEqual(sheet.counts, { pending: 3, clash: 1, behind: 1, notes: 1 });
});

test("every label the sheet can show is a real string in lang/en.json", () => {
  const lang = readJson("module/blank-inheritance/lang/en.json");
  const resolve = (key) => key.split(".").reduce((node, part) => node?.[part], lang);
  for (const key of ALL_LABEL_KEYS) assert.equal(typeof resolve(key), "string", key);
});

test("a box starts about as tall as its words", () => {
  assert.equal(rowsFor(FIELD_KINDS.LINE, "short"), 1);
  assert.equal(rowsFor(FIELD_KINDS.NUMBER, 15), 1);
  assert.ok(rowsFor(FIELD_KINDS.READ, "x".repeat(900)) >= 10);
  assert.equal(rowsFor(FIELD_KINDS.READ, "x".repeat(90000)), 40);
});
