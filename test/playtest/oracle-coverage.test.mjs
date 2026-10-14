/**
 * The chargen oracle, the coverage ledger and the canaries (tools/playtest/core/oracle.mjs, coverage.mjs, canaries.mjs).
 * The coverage and canary tests run against the real Episode One files, so they also notice when the authored material grows a shape the
 * ledger cannot read.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkCharacter, checkChoices, checkPlacement, judgeCharacters, live, resolved, skillOfSelection } from "../../tools/playtest/core/oracle.mjs";
import { applyEvents, authoredItems, eventsFromRuns, eventsFromTape, summarize } from "../../tools/playtest/core/coverage.mjs";
import { canaryStrings, judgeLeaks, secretLines } from "../../tools/playtest/core/canaries.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const json = (...p) => JSON.parse(readFileSync(path.join(root, ...p), "utf8"));
const episode = json("data", "episodes", "episode-c1e1-mothers-maiden-name.json");
const briefs = [...episode.scenes].sort((a, b) => a.order - b.order).map((s) => json("data", "scene-briefs", `${s.briefRef}.json`));
const challenges = Object.fromEntries(readdirSync(path.join(root, "data", "challenges")).filter((f) => f.endsWith(".json")).map((f) => [f.replace(/\.json$/, ""), json("data", "challenges", f)]));

// A gnome / escaped experiment / operative, exactly as the first real smoke run made it and sf2e computed it.
const dax = () => ({
  name: "PT-Dax Merrow",
  hp: 17,
  ac: 17,
  mods: { str: -1, dex: 4, con: 1, int: 2, wis: 1, cha: 3 },
  free: ["dex", "int", "cha", "wis"],
  ancestry: { slug: "gnome", hp: 8, boosts: [{ value: ["con"], selected: "con" }, { value: ["cha"], selected: "cha" }, { value: ["str", "dex", "con", "int", "wis", "cha"], selected: "dex" }], flaws: [{ value: ["str"], selected: "str" }] },
  background: { slug: "escaped-experiment", boosts: [{ value: ["cha", "con", "dex", "int", "str", "wis"], selected: "dex" }, { value: ["cha", "con", "dex", "int", "str", "wis"], selected: "int" }, { value: ["cha", "con", "dex", "int", "str", "wis"], selected: "cha" }] },
  class: { slug: "operative", hp: 8, key: { value: ["dex"], selected: "dex" } },
  owners: ["Gamemaster", "PT Player 4"],
  assignedTo: ["PT Player 4"],
  tokens: [{ scene: "00. From Up Here", n: 1 }],
  hasAnswers: false,
  intakeWhispers: 0
});

test("a character that is what its picks say passes, including the level-one cap at +4 and a flaw", () => {
  const verdict = checkCharacter(dax());
  assert.equal(verdict.ok, true, verdict.problems.join("; "));
  assert.deepEqual(verdict.expected.mods, { str: -1, dex: 4, con: 1, int: 2, wis: 1, cha: 3 });
  assert.equal(verdict.expected.hp, 17);
});

test("a wrong number on the sheet, or HP that disagrees with the picks, is a failure that says which", () => {
  const wrong = dax();
  wrong.mods.dex = 3;
  wrong.hp = 20;
  const verdict = checkCharacter(wrong);
  assert.equal(verdict.ok, false);
  assert.match(verdict.problems.join(" | "), /dex is 3 on the sheet; the picks give 4/);
  assert.match(verdict.problems.join(" | "), /HP is 20 on the sheet; ancestry 8 \+ class 8 \+ Con 1 gives 17/);
});

test("a question the background or class asked must be answered in the item and the skill trained on the sheet", () => {
  const brann = () => ({ ...dax(), choices: { background: [{ flag: "skill", selection: "piloting" }], class: [] }, skillRanks: { piloting: 1, crafting: 0, athletics: 1 } });
  assert.deepEqual(checkChoices(brann()), []);
  assert.equal(checkCharacter({ ...dax(), ...brann() }).ok, true, "and a character with no questions at all (dax) is judged as before");
  const open = brann();
  open.choices.background[0].selection = null;
  assert.match(checkChoices(open).join(), /the background's question "skill" was never answered in the item, so Foundry had to ask it/);
  assert.match(checkCharacter({ ...dax(), ...open }).problems.join(), /never answered/);
  const untrained = brann();
  untrained.skillRanks.piloting = 0;
  assert.match(checkChoices(untrained).join(), /piloting was chosen for the background but is not trained on the sheet \(rank 0\)/);
  const envoy = { ...dax(), choices: { background: [], class: [{ flag: "skill", selection: "intimidation" }] }, skillRanks: { intimidation: 1 } };
  assert.deepEqual(checkChoices(envoy), []);
  const advocate = { choices: { background: [{ flag: "advocate", selection: { feat: "Compendium.sf2e.feats.Item.6ON8DjFXSMITZleX", skill: "diplomacy" } }], class: [] }, skillRanks: { diplomacy: 0 } };
  assert.match(checkChoices(advocate).join(), /diplomacy was chosen for the background but is not trained/, "an object answer names its skill too");
  assert.equal(skillOfSelection({ rank: 1, slug: "arcana" }), "arcana");
  assert.equal(skillOfSelection("stealth"), "stealth");
  assert.equal(skillOfSelection(7), null);
  assert.equal(skillOfSelection(null), null);
  assert.deepEqual(checkChoices({}), [], "a probe entry from before the field existed is not a failure");
  assert.deepEqual(checkChoices({ choices: { background: [{ flag: "x", selection: "not-a-skill" }] }, skillRanks: { stealth: 1 } }), [], "an answer that is not one of the sheet's skills cannot be checked and is left alone");
});

test("a slot nobody chose is a failure, but sf2e's empty placeholder slots are not slots", () => {
  const open = dax();
  open.background.boosts[2] = { value: ["cha", "con", "dex", "int", "str", "wis"], selected: null };
  assert.match(checkCharacter(open).problems.join(), /background boost 3 was never chosen/);
  const placeholder = dax();
  placeholder.ancestry.flaws.push({ value: [], selected: null });
  placeholder.ancestry.boosts.push({ value: [], selected: null });
  assert.equal(checkCharacter(placeholder).ok, true);
  assert.equal(live(placeholder.ancestry.flaws).length, 1);
  assert.equal(resolved({ value: ["con"], selected: null }), "con", "a one-option slot is chosen for you");
  assert.equal(resolved({ value: ["a", "b"], selected: null }), null);
  const none = dax();
  none.class = null;
  assert.match(checkCharacter(none).problems.join(), /no class item/);
});

test("placement: the right owner, the character set on its player, a token, and a whisper when answers were written", () => {
  assert.equal(checkPlacement(dax(), { expectOwner: "PT Player 4", landingScene: "00. From Up Here" }).ok, true);
  assert.match(checkPlacement(dax(), { expectOwner: "PT Player 2" }).problems.join(), /not an owner/);
  const lost = { ...dax(), assignedTo: [], tokens: [] };
  const p = checkPlacement(lost, { expectOwner: "PT Player 4" }).problems.join(" | ");
  assert.match(p, /set to/);
  assert.match(p, /no token/);
  assert.match(checkPlacement({ ...dax(), tokens: [{ scene: "Elsewhere", n: 1 }] }, { landingScene: "00. From Up Here" }).problems.join(), /landing scene/);
  assert.match(checkPlacement({ ...dax(), hasAnswers: true }, {}).problems.join(), /no whispered intake message/);
  assert.equal(checkPlacement({ ...dax(), hasAnswers: true, intakeWhispers: 1 }, {}).ok, true);
  const v = judgeCharacters([dax(), { ...dax(), name: "Broken", hp: 1 }], { ownerOf: () => null });
  assert.equal(v.ok, false);
  assert.equal(v.failures.length, 1);
  assert.ok(v.failures[0].sheetProblems);
});

test("the ledger offers every beat, every degree of every check, every choice option and every handout, from the real episode", () => {
  const items = authoredItems(briefs, challenges);
  const count = (type) => items.filter((i) => i.type === type).length;
  const beats = briefs.flatMap((b) => b.beats);
  assert.equal(count("scene"), briefs.length);
  assert.equal(count("beat"), beats.length);
  assert.equal(count("degree"), beats.filter((b) => b.challengeRef).length * 4);
  const options = beats.filter((b) => b.choicePoint).reduce((n, b) => n + b.choicePoint.options.length + (b.choicePoint.allowsInventedOption ? 1 : 0), 0);
  assert.equal(count("choice"), options);
  assert.equal(count("handout"), briefs.reduce((n, b) => n + (b.handouts ?? []).length, 0));
  assert.ok(new Set(items.map((i) => i.id)).size === items.length, "item ids are unique");
  assert.ok(items.filter((i) => i.type === "degree").every((d) => d.dc === null || Number.isFinite(d.dc)), "a check's DC is read from its challenge file");
});

test("events from the Runner's run state mark what happened, and an unknown field is reported, not guessed", () => {
  const items = authoredItems(briefs, challenges);
  const scene = briefs[1].id;
  const beat = briefs[1].beats[0].id;
  const runs = { [scene]: { ticked: { [beat]: { at: "t", degree: "success" } }, results: { [beat]: { actor1: { degree: "failure" } } }, granted: ["h"], topics: {}, mystery: 1 } };
  const { events, unread } = eventsFromRuns(runs);
  assert.deepEqual(unread, [`${scene}: unread field "mystery"`]);
  const marked = applyEvents(items, events);
  assert.equal(marked.find((i) => i.id === `${scene}#beat:${beat}`).seen, 1);
  assert.equal(marked.find((i) => i.id === scene).seen, 1, "a scene is entered when any beat of it is ticked");
  const withCheck = briefs.flatMap((b) => b.beats.filter((x) => x.challengeRef).map((x) => ({ scene: b.id, beat: x.id })))[0];
  const tapeEvents = eventsFromTape([{ check: `beat:${withCheck.beat}`, degree: 2, forced: true }, { check: "beat:x", degree: null }], { briefOf: () => withCheck.scene });
  const m2 = applyEvents(items, tapeEvents);
  const hit = m2.find((i) => i.id === `${withCheck.scene}#check:${withCheck.beat}:success`);
  assert.equal(hit.seen, 1);
  assert.equal(hit.forced, 1, "a forced roll is counted as seen and as forced");
  assert.deepEqual(eventsFromRuns({ x: 5 }).unread, ["x: run state is not an object"]);
});

test("summarize says what was seen, which mandatory beats were not, and which checks went both ways", () => {
  const items = authoredItems(briefs, challenges);
  const empty = summarize(applyEvents(items, []));
  assert.equal(empty.beats.seen, 0);
  assert.equal(empty.gaps.mandatoryBeats.length, empty.mandatoryBeats.total);
  const withCheck = briefs.flatMap((b) => b.beats.filter((x) => x.challengeRef).map((x) => ({ scene: b.id, beat: x.id })))[0];
  const both = summarize(applyEvents(items, [{ kind: "degree", ...withCheck, degree: "success" }, { kind: "degree", ...withCheck, degree: "failure" }]));
  assert.equal(both.checks.seenBothWays, 1);
  assert.ok(!both.gaps.checksNotSeenBothWays.includes(`${withCheck.scene}#${withCheck.beat}`));
  const one = summarize(applyEvents(items, [{ kind: "degree", ...withCheck, degree: "success" }]));
  assert.equal(one.checks.seenBothWays, 0);
});

test("the GM-only lines are found in the real scenes, and a leak is judged by where it is found", () => {
  const lines = secretLines(briefs);
  assert.ok(lines.length >= 5, `the briefs carry GM-only 'Secret:' lines (${lines.length})`);
  assert.ok(lines.some((l) => /maiden names/.test(l.text)), "Shucks's reason for form 12-B is among them");
  const canaries = canaryStrings(briefs);
  assert.ok(canaries.every((c) => c.length >= 12 && c.length <= 90));
  assert.deepEqual(canaryStrings([{ id: "s", beats: [{ id: "b", note: "Secret: short" }] }]), [], "a short phrase is not distinctive enough to be a canary");
  assert.equal(judgeLeaks({ ui: [{ canary: "x" }], documents: [] }).severity, "S0");
  assert.equal(judgeLeaks({ ui: [], documents: [{ canary: "x" }] }).severity, "S3");
  assert.equal(judgeLeaks({ ui: [], documents: [] }).severity, null);
  assert.equal(judgeLeaks(undefined).leak, false);
});
