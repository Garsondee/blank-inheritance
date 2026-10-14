/**
 * The GM walker's pure halves (tools/playtest/core/walk-plan.mjs): the plan read from the shipped episode, and the judgement that turns
 * what the walker saw into findings. The browser half (bots/gm-walker.mjs) is proved by a live walk on the playtest Foundry
 * (design/playtest-process.md section 13), never by calling its handlers.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildWalkPlan, emptyBeatObservation, emptyObservation, judgeScene, summarizeWalk } from "../../tools/playtest/core/walk-plan.mjs";

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const readJson = (...p) => JSON.parse(readFileSync(path.join(repo, ...p), "utf8"));

function realEpisodeOne() {
  const episode = readJson("data", "episodes", "episode-c1e1-mothers-maiden-name.json");
  const briefs = {};
  for (const f of readdirSync(path.join(repo, "data", "scene-briefs"))) if (f.endsWith(".json")) briefs[f.slice(0, -5)] = readJson("data", "scene-briefs", f);
  return { episode, briefs };
}

test("the plan for Episode One is every scene in play order, with what each beat asks the GM to press", () => {
  const { episode, briefs } = realEpisodeOne();
  const plan = buildWalkPlan(episode, briefs);
  assert.deepEqual(plan.missing, [], "every scene of the episode has a shipped brief");
  assert.equal(plan.scenes.length, episode.scenes.length);
  assert.deepEqual(plan.scenes.map((s) => s.order), [...plan.scenes.map((s) => s.order)].sort((a, b) => a - b), "in play order");
  const beats = plan.scenes.flatMap((s) => s.beats);
  const authored = episode.scenes.flatMap((s) => briefs[s.briefRef].beats ?? []);
  assert.equal(beats.length, authored.length);
  assert.equal(beats.filter((b) => b.check).length, authored.filter((b) => b.checkRef).length);
  assert.equal(beats.filter((b) => b.choice).length, authored.filter((b) => b.choicePoint).length);
  assert.ok(beats.some((b) => b.fight), "the fight is in the plan");
  assert.ok(plan.scenes.some((s) => s.handouts.length), "the handouts are in the plan");
});

test("the plan can be cut to a few scenes by brief id or short id, still in play order", () => {
  const { episode, briefs } = realEpisodeOne();
  const plan = buildWalkPlan(episode, briefs, { scenes: ["flood-tunnel", "episode-c1e1--the-road-in"] });
  assert.deepEqual(plan.scenes.map((s) => s.shortId), ["the-road-in", "flood-tunnel"]);
});

test("a scene whose brief is not shipped is named, not walked", () => {
  const plan = buildWalkPlan({ id: "ep", scenes: [{ order: 0, id: "a", briefRef: "brief-a" }] }, {});
  assert.deepEqual(plan.missing, ["brief-a"]);
  assert.equal(plan.scenes.length, 0);
});

const scene = {
  briefId: "b",
  shortId: "b",
  title: "A Scene",
  order: 1,
  handouts: ["letter"],
  beats: [
    { id: "talk", mandatory: true, conditional: false, check: true, choice: null, handout: null, fight: false, triggers: ["enter"] },
    { id: "pick", mandatory: true, conditional: false, check: false, choice: ["x", "y"], handout: null, fight: false, triggers: [] },
    { id: "later", mandatory: false, conditional: true, check: false, choice: null, handout: null, fight: false, triggers: [] },
    { id: "brawl", mandatory: true, conditional: false, check: false, choice: null, handout: null, fight: true, triggers: [] }
  ]
};

function cleanWalk() {
  const seen = emptyObservation();
  seen.reached = true;
  seen.beatsShown = ["talk", "pick", "later", "brawl"];
  seen.handoutsShown = ["letter"];
  seen.handoutsRevealed = ["letter"];
  seen.beats.talk = { ...emptyBeatObservation(), ticked: true, pills: 1, checksOpened: 1, checksClosed: 1, asked: 6, rolled: 6, triggersShown: ["enter"], triggersFired: ["enter"] };
  seen.beats.pick = { ...emptyBeatObservation(), ticked: true, choiceAsked: true, choiceSettled: true, picks: 1 };
  seen.beats.later = { ...emptyBeatObservation(), ticked: true };
  seen.beats.brawl = { ...emptyBeatObservation(), ticked: true, fightSetUp: true };
  return seen;
}

test("a clean walk finds nothing", () => {
  assert.deepEqual(judgeScene(scene, cleanWalk()), []);
});

test("a scene the walk could not reach is one S1, and nothing else is judged", () => {
  const seen = emptyObservation();
  seen.error = "the Runner never showed its beats";
  const out = judgeScene(scene, seen);
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, "S1");
  assert.match(out[0].summary, /could not reach "A Scene": the Runner never showed its beats/);
  assert.equal(out[0].channel, "walker");
});

test("every way a beat can fail is named, at the right severity", () => {
  const seen = cleanWalk();
  seen.beatsShown = ["talk", "pick", "brawl"]; // the conditional beat is not shown: S3, not a bug
  seen.beats.talk = { ...seen.beats.talk, rolled: 2, triggersFired: [] };
  seen.beats.pick = { ...seen.beats.pick, choiceSettled: false, picks: 0 };
  seen.beats.brawl = { ...seen.beats.brawl, fightSetUp: false, ticked: false };
  seen.handoutsRevealed = [];
  seen.errors = ["TypeError: x is undefined"];
  const out = judgeScene(scene, seen);
  const by = (re) => out.find((f) => re.test(f.summary));
  assert.equal(by(/waits on a condition/).severity, "S3");
  assert.equal(by(/Only 2 of 6/).severity, "S2");
  assert.equal(by(/never showed as fired/).severity, "S2");
  assert.equal(by(/never settled/).severity, "S1");
  assert.equal(by(/fight .* could not be set up/).severity, "S1");
  assert.equal(by(/could not be ticked/).beat, "brawl");
  assert.match(by(/Handout "letter"/).summary, /did not show the handout/);
  assert.match(by(/TypeError/).summary, /In "A Scene"/);
  assert.equal(new Set(out.map((f) => f.key)).size, out.length, "each finding has its own key, so a re-walk files it once");
});

test("a missing pill, a console that never opened, and no rolls at all are each S1", () => {
  const base = cleanWalk();
  const noPill = { ...base, beats: { ...base.beats, talk: { ...base.beats.talk, pills: 0 } } };
  assert.match(judgeScene(scene, noPill).map((f) => f.summary).join("|"), /no check pill was drawn/);
  const noConsole = { ...base, beats: { ...base.beats, talk: { ...base.beats.talk, checksOpened: 0 } } };
  assert.match(judgeScene(scene, noConsole).map((f) => f.summary).join("|"), /did not open the check console/);
  const noRolls = { ...base, beats: { ...base.beats, talk: { ...base.beats.talk, rolled: 0 } } };
  assert.equal(judgeScene(scene, noRolls).find((f) => /nobody's roll arrived/.test(f.summary)).severity, "S1");
});

test("an authored beat the Runner never drew is S1", () => {
  const seen = cleanWalk();
  seen.beatsShown = ["pick", "later", "brawl"];
  assert.equal(judgeScene(scene, seen).find((f) => f.beat === "talk").severity, "S1");
});

test("the summary is one line per scene and a total", () => {
  const plan = { episodeId: "ep", scenes: [scene] };
  const text = summarizeWalk(plan, { b: cleanWalk() });
  assert.match(text, /walked +A Scene +beats 4\/4 +checks 1\/1/);
  assert.match(text, /total: 4\/4 beats shown across 1 scenes/);
  assert.match(summarizeWalk(plan, {}), /MISSED/);
});
