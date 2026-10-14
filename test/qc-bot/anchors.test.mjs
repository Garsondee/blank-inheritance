// The direction lock (tools/qc-bot/anchors.mjs): a patch may widen a scene's options, never move its direction.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { anchorViolations, challengeAnchors, sceneAnchors } from "../../tools/qc-bot/anchors.mjs";
import { ROOT } from "../../tools/qc-bot/lib.mjs";
import { challengeDoc, sceneDoc } from "./fixture.mjs";

const changed = (mutate, make = sceneDoc, kind = "scene") => {
  const before = make();
  const after = make();
  mutate(after);
  return anchorViolations(kind, before, after).map((v) => v.path);
};

test("wording and options are free: read-aloud, beat text, notes, twists, reaction prompts, a cast brief", () => {
  assert.deepEqual(changed((s) => { s.intro.readAloud = "Different words."; }), []);
  assert.deepEqual(changed((s) => { s.beats[0].text = "Ask for the form, politely."; s.beats[1].direction = "Say it slowly."; }), []);
  assert.deepEqual(changed((s) => { s.notes = "More prep."; s.summary = "Rewritten."; }), []);
  assert.deepEqual(changed((s) => { s.temptations.push({ id: "t2", text: "Another twist." }); s.reactionPrompts[0].text = "Did it land?"; }), []);
  assert.deepEqual(changed((s) => { s.cast[0].brief.wants = "To go home."; s.cast[0].brief.voice = "Tired."; }), []);
});

test("the shape of the scene is locked: what it is for, who is there, which beats and in what order", () => {
  assert.deepEqual(changed((s) => { s.goal = "They leave angry."; }), ["goal"]);
  assert.deepEqual(changed((s) => { s.howToPlay = "Loud."; }), ["howToPlay"]);
  assert.deepEqual(changed((s) => { s.beats[1].mandatory = true; }), ["beats[the-exit].mandatory"]);
  assert.deepEqual(changed((s) => { s.beats[0].facts = ["clerk.secret"]; }), ["beats[the-form].facts"]);
  assert.deepEqual(changed((s) => { s.beats[0].checkRef = "other"; }), ["beats[the-form].checkRef"]);
  assert.deepEqual(changed((s) => { s.beats.reverse(); }).length > 0, true);
  assert.deepEqual(changed((s) => { s.beats.pop(); }), ["beats"]);
  assert.deepEqual(changed((s) => { s.cast.push({ id: "guard", npcRef: "guard", role: "Guard", arrival: "start" }); }), ["cast"]);
  assert.deepEqual(changed((s) => { s.cast[0].role = "Boss"; }), ["cast[clerk].role"]);
  assert.deepEqual(changed((s) => { s.intro.position.state = "elsewhere"; }), ["intro.position.state"]);
});

test("how it ends and where it leads are locked", () => {
  assert.deepEqual(changed((s) => { s.outro.endsWhen = "They stay."; }), ["outro.endsWhen"]);
  assert.deepEqual(changed((s) => { s.outro.onwards = "The harbour."; }), ["outro.onwards"]);
  assert.deepEqual(changed((s) => { s.outro.writeDown = []; }), ["outro.writeDown"]);
  assert.deepEqual(changed((s) => { s.carryForward = [{ id: "x" }]; }), ["carryForward"]);
});

test("a check may gain routes and lines, and may reword its results; its difficulty and identity are locked", () => {
  const mk = challengeDoc;
  assert.deepEqual(changed((c) => { c.checks[0].skillOptions.push("society"); c.checks[0].bySkill.society = "New."; }, mk, "challenge"), []);
  assert.deepEqual(changed((c) => { c.checks[0].outcomes.success = "Rewritten."; c.checks[0].bySkill.crafting = "Reworded."; c.checks[0].name = "Renamed"; }, mk, "challenge"), []);
  assert.deepEqual(changed((c) => { c.checks[0].dc.value = 20; }, mk, "challenge"), ["checks[read-the-form].dc.value"]);
  assert.deepEqual(changed((c) => { c.checks[0].secret = false; }, mk, "challenge"), ["checks[read-the-form].secret"]);
  assert.deepEqual(changed((c) => { c.checks[0].repeatable = true; }, mk, "challenge"), ["checks[read-the-form].repeatable"]);
  assert.deepEqual(changed((c) => { c.checks.pop(); }, mk, "challenge"), ["checks"]);
});

test("routes can only be added to: taking one away is a violation", () => {
  const take = anchorViolations("challenge", challengeDoc(), (() => { const c = challengeDoc(); c.checks[0].skillOptions = ["crafting"]; return c; })());
  assert.equal(take.length, 1);
  assert.match(take[0].why, /perception/);
  const lines = anchorViolations("challenge", challengeDoc(), (() => { const c = challengeDoc(); delete c.checks[0].bySkill.perception; return c; })());
  assert.equal(lines.length, 1);
  assert.match(lines[0].why, /perception/);
});

test("every real canon scene and check file has anchors, and a copy of it has none changed", () => {
  for (const [dir, kind] of [["scenes", "scene"], ["challenges", "challenge"]]) {
    for (const f of fs.readdirSync(path.join(ROOT, "canon", dir)).filter((x) => x.endsWith(".json"))) {
      const doc = JSON.parse(fs.readFileSync(path.join(ROOT, "canon", dir, f), "utf8"));
      assert.ok(Object.keys(kind === "scene" ? sceneAnchors(doc) : challengeAnchors(doc)).length > 0, f);
      assert.deepEqual(anchorViolations(kind, doc, JSON.parse(JSON.stringify(doc))), [], f);
    }
  }
});
