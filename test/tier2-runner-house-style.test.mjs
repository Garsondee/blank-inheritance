// Tier 2 — the Scene Runner's house style, measured by shape (D056, 2026-10-01).
//
// WHY THIS EXISTS. Ingram read The Road In's old Frame-beat note in the Runner: 308 words in one block, its
// instruction in the third sentence and its fallback in the last, contradicting its own first line. The older
// checks (tier2-scene-prose-style, tier2-no-provenance-in-play-text) hunt for tells such as date stamps and memory
// keys; the habit moved into plain words they can't see ("NO LONGER GUARANTEED", "Ingram asked for exactly this").
// So this test measures shape instead: how long each field is, whether a note is made of the five labelled lines,
// and the few words that only ever mean "this is about how the file was made".
//
// The house style is design/gm-facing-prose-style.md §0. Budgets live there; the numbers below must match it.
//
// SCOPE. Episode One's scenes once rebuilt in canon/ (canon/scenes/episode-c1e1--*.json) and the canon challenges
// they use. Old drafts are out of scope: they are rebuilt, not patched. Read-aloud, cast cards and the scene's own
// prep `notes` are not budgeted here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sceneDir = path.join(repoRoot, "canon", "scenes");
const challengeDir = path.join(repoRoot, "canon", "challenges");

export const BUDGET = Object.freeze({
  text: 25,
  direction: 40,
  note: 80,
  noteLine: 25,
  result: 40,
  goal: 30,
  howToPlay: 40,
  endsWhen: 15,
  transition: 20,
  writeDown: 3,
  handoutLine: 25,
  reactionPrompts: 3,
  scene: 900,
});

// A <trig id="..."/> token renders as a button in the Runner, not as words the GM reads, so it is not counted.
const words = (s) => (s ? String(s).replace(/<trig\s+id=["'][a-z0-9-]+["']\s*\/>/gi, " ").trim().split(/\s+/).filter(Boolean).length : 0);

const scenes = readdirSync(sceneDir)
  .filter((f) => /^episode-c1e1--.+\.json$/.test(f))
  .map((f) => ({ file: f, id: f.replace(/\.json$/, ""), json: JSON.parse(readFileSync(path.join(sceneDir, f), "utf8")) }));

const challengesFor = (scene) =>
  [...new Set((scene.json.beats || []).map((b) => b.challengeRef).filter(Boolean))]
    .map((ref) => path.join(challengeDir, `${ref}.json`))
    .filter((p) => existsSync(p))
    .map((p) => ({ id: path.basename(p, ".json"), json: JSON.parse(readFileSync(p, "utf8")) }));

// Every GM-facing string the Runner shows for a scene, with where it is. Read-aloud and cast cards excluded.
function gmFields(scene) {
  const s = scene.json;
  const out = [];
  const add = (where, value) => { if (typeof value === "string" && value.trim()) out.push({ where, value }); };
  add("goal", s.goal);
  add("howToPlay", s.howToPlay);
  add("summary", s.summary);
  add("intro.where", s.intro?.where);
  add("intro.firstThing", s.intro?.firstThing);
  add("intro.landmark", s.intro?.landmark);
  add("intro.holdInReserve", s.intro?.holdInReserve);
  for (const [i, c] of (s.intro?.carriesIn || []).entries()) { add(`intro.carriesIn[${i}].when`, c.when); add(`intro.carriesIn[${i}].then`, c.then); }
  for (const b of s.beats || []) {
    add(`beats.${b.id}.text`, b.text);
    add(`beats.${b.id}.when`, b.when?.condition);
    add(`beats.${b.id}.direction`, b.direction);
    add(`beats.${b.id}.note`, b.note);
  }
  add("outro.endsWhen", s.outro?.endsWhen);
  add("outro.transition", s.outro?.transition?.line);
  add("outro.onwards", s.outro?.onwards);
  for (const [i, w] of (s.outro?.writeDown || []).entries()) add(`outro.writeDown[${i}]`, w);
  for (const t of s.temptations || []) add(`temptations.${t.id}`, t.text);
  for (const h of s.handouts || []) {
    add(`handouts.${h.id}.gmNotes`, h.gmNotes);
    for (const [i, c] of (h.catchables || []).entries()) add(`handouts.${h.id}.catchables[${i}]`, c);
  }
  return out;
}

// A note is labelled lines: Do, Plant, Secret, Watch for, or "If <condition>". The label ends at the first colon.
export function noteLineLabel(line) {
  const m = String(line).match(/^([^:]{1,90}):\s+\S/);
  if (!m) return null;
  const label = m[1].trim();
  if (["Do", "Plant", "Secret", "Watch for"].includes(label)) return label;
  if (/^If\s\S/.test(label)) return "If";
  return null;
}

const BANNED = [
  { name: "a file path", re: /\b[\w-]+\.(?:md|json|mjs)\b|\b(?:design|ideas|data|canon)\/[\w./-]+/ },
  { name: "a section sign", re: /§/ },
  { name: "a ledger or decision number", re: /\bLEDGER\b|\bLedger #\d|\bD0\d\d\b|\bS0\d\d\b|mystery-ledger/i },
  { name: "the node registry", re: /\bNodes?\b|nodeRefs/ },
  { name: "history of the file", re: /\bno longer\b|\bnot any more\b|\bused to say\b|\bthe old (?:version|draft|beat)\b|\bIngram asked\b|\bat Ingram's (?:request|direction)\b|\bsign-?off\b|\bfuture audit\b/i },
  { name: "a backticked id", re: /`[a-z0-9-]+`/ },
];

test("house style: there is Episode One canon to check", () => {
  assert.ok(scenes.length >= 2, "expected at least From Up Here and The Road In in canon/scenes");
});

for (const scene of scenes) {
  test(`house style: ${scene.id}: every field is inside its budget`, () => {
    const s = scene.json;
    const over = [];
    const check = (where, value, budget) => { const w = words(value); if (w > budget) over.push(`${where}: ${w} words (budget ${budget})`); };
    check("goal", s.goal, BUDGET.goal);
    check("howToPlay", s.howToPlay, BUDGET.howToPlay);
    for (const b of s.beats || []) {
      check(`beats.${b.id}.text`, b.text, BUDGET.text);
      check(`beats.${b.id}.direction`, b.direction, BUDGET.direction);
      check(`beats.${b.id}.note`, b.note, BUDGET.note);
      for (const line of String(b.note || "").split("\n")) check(`beats.${b.id}.note line "${line.slice(0, 30)}"`, line, BUDGET.noteLine);
    }
    check("outro.endsWhen", s.outro?.endsWhen, BUDGET.endsWhen);
    check("outro.transition", s.outro?.transition?.line, BUDGET.transition);
    if ((s.outro?.writeDown || []).length > BUDGET.writeDown) over.push(`outro.writeDown: ${s.outro.writeDown.length} items (budget ${BUDGET.writeDown})`);
    for (const h of s.handouts || []) for (const c of h.catchables || []) check(`handouts.${h.id} line "${c.slice(0, 30)}"`, c, BUDGET.handoutLine);
    if ((s.reactionPrompts || []).length > BUDGET.reactionPrompts) over.push(`reactionPrompts: ${s.reactionPrompts.length} (budget ${BUDGET.reactionPrompts})`);
    for (const ch of challengesFor(scene)) {
      for (const c of ch.json.checks || []) {
        for (const [k, v] of Object.entries({ ...(c.outcomes || {}), ...(c.bySkill || {}) })) check(`${ch.id}/${c.id}.${k}`, v, BUDGET.result);
      }
    }
    const total = gmFields(scene).reduce((n, f) => n + words(f.value), 0);
    if (total > BUDGET.scene) over.push(`whole scene: ${total} words of GM text (budget ${BUDGET.scene})`);
    assert.deepEqual(over, [], "over budget (design/gm-facing-prose-style.md §0): split it, make it a list, or move it to prep notes");
  });

  test(`house style: ${scene.id}: every note is made of labelled lines`, () => {
    const bad = [];
    for (const b of scene.json.beats || []) {
      for (const line of String(b.note || "").split("\n").filter((l) => l.trim())) {
        if (!noteLineLabel(line)) bad.push(`beats.${b.id}.note: "${line.slice(0, 60)}"`);
      }
    }
    assert.deepEqual(bad, [], "each line of a note starts with Do:, Plant:, Secret:, Watch for: or If <condition>:");
  });

  test(`house style: ${scene.id}: nothing shouts, and nothing talks about how the file was made`, () => {
    const found = [];
    for (const { where, value } of gmFields(scene)) {
      const unquoted = value.replace(/"[^"]*"/g, "");
      const shout = unquoted.match(/\b[A-Z][A-Z'-]+(?:[ ,]+[A-Z][A-Z'-]+){2,}\b/);
      if (shout) found.push(`${where}: shouting "${shout[0]}"`);
      for (const { name, re } of BANNED) { const m = value.match(re); if (m) found.push(`${where}: ${name} ("${m[0]}")`); }
    }
    assert.deepEqual(found, []);
  });

  test(`house style: ${scene.id}: a by-skill result exists only for a skill the check offers`, () => {
    const bad = [];
    for (const ch of challengesFor(scene)) {
      for (const c of ch.json.checks || []) {
        if (c.anySkill || !c.bySkill) continue;
        for (const skill of Object.keys(c.bySkill)) if (!(c.skillOptions || []).includes(skill)) bad.push(`${ch.id}/${c.id}: ${skill}`);
      }
    }
    assert.deepEqual(bad, [], "the Runner prints every by-skill result, so one for a skill nobody can pick is noise");
  });

  test(`house style: ${scene.id}: has its re-read record`, () => {
    assert.ok(existsSync(path.join(sceneDir, `${scene.id}.reread.md`)), `canon/scenes/${scene.id}.reread.md is missing`);
  });
}

test("house style: the note label reader", () => {
  assert.equal(noteLineLabel("Plant: the stamp is for whoever reads closely."), "Plant");
  assert.equal(noteLineLabel("If no arrival fits: put it in a random spotlight."), "If");
  assert.equal(noteLineLabel("Secret: the marks are Cicada's."), "Secret");
  assert.equal(noteLineLabel("Watch for: reading the secret aloud."), "Watch for");
  assert.equal(noteLineLabel("HOW TO PLAY IT. Shucks runs this screen."), null);
  assert.equal(noteLineLabel("GUARANTEED: pick a player at random."), null);
  assert.equal(noteLineLabel("Offer this once for the table."), null);
});
