// Tier 1 — the check console's rules (core/check-console.mjs, 2026-10-05).
//
// Ingram: "a dedicated UI that opens up when a skill check is required, we can use it to alter the DC, change the
// skills that could be asked for, create new random rolls up on the fly and ... gem LED lights which represent the
// players rolls and as they come in the LED changes to different colors for the result". And: "the dialogue is per
// challenge, but allows a range of different solutions to that challenge."
//
// Pure: no Foundry. What the GM's and players' windows draw comes from these.

import { test } from "node:test";
import assert from "node:assert/strict";

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BANK_SIZE,
  DC_RANGE,
  DEGREES,
  DIFFICULTIES,
  FRESH_MS,
  LEVEL_DC,
  STANDARD_DC,
  allIn,
  bankSlots,
  clearRoll,
  dcBandArcs,
  difficultyBands,
  difficultyOf,
  hasPerDegreeWays,
  hasWayResults,
  levelDc,
  resultFor,
  consoleRollOptions,
  consoleTagFrom,
  dcAngle,
  dcDial,
  emptyConsoleState,
  isFresh,
  ledState,
  newSession,
  dcFor,
  hasWayDcs,
  outcomeRows,
  recordRoll,
  ringAgain,
  rolledCount,
  setBlind,
  setDc,
  setShowDc,
  stepDc,
  summaryLine,
  toggleAsked,
  toggleSkill
} from "../module/blank-inheritance/scripts/core/check-console.mjs";

const open = (over = {}) =>
  newSession({ id: "abc123", briefId: "brief", key: "beat-1", source: { kind: "beat", briefId: "brief", beatId: "beat-1" }, skills: ["deception", "intimidation"], dc: 17, asked: ["u1", "u2"], now: 1000, ...over });

test("the empty record holds no check", () => {
  assert.deepEqual(emptyConsoleState(), { session: null });
});

test("a check put to the table keeps its ways, its DC and who is asked, and remembers what the scene wrote", () => {
  const s = open();
  assert.deepEqual(s.skills, ["deception", "intimidation"]);
  assert.deepEqual(s.authoredSkills, ["deception", "intimidation"]);
  assert.equal(s.dc, 17);
  assert.equal(s.authoredDc, 17);
  assert.deepEqual(s.asked, ["u1", "u2"]);
  assert.deepEqual(s.rolls, {});
  assert.equal(s.ring, 0);
  assert.equal(s.blind, false);
});

test("an unsafe way, a duplicate and an empty user are dropped; no DC stays no DC; a made-up check is ad hoc", () => {
  const s = newSession({ id: "x1", key: null, skills: ["athletics", "athletics", "Bad Slug", "x]y"], dc: null, asked: ["u1", "", "u1"] });
  assert.deepEqual(s.skills, ["athletics"]);
  assert.deepEqual(s.asked, ["u1"]);
  assert.equal(s.dc, null);
  assert.deepEqual(s.source, { kind: "adhoc" });
  assert.equal(newSession({ id: "x2", dc: "" }).dc, null);
  assert.equal(newSession({ id: "x3", dc: 0 }).dc, DC_RANGE.min, "a DC of 0 is a number, clamped up to the dial's lowest");
});

test("the DC dial steps, clamps to 5..40, starts a check with no DC from 15, and goes back to the scene's own", () => {
  assert.equal(stepDc(open(), 1).dc, 18);
  assert.equal(stepDc(open(), -5).dc, 12);
  assert.equal(stepDc(open({ dc: 39 }), 5).dc, DC_RANGE.max);
  assert.equal(stepDc(open({ dc: 6 }), -5).dc, DC_RANGE.min);
  assert.equal(stepDc(open({ dc: null }), 1).dc, STANDARD_DC + 1);
  const moved = setDc(open(), 25);
  assert.equal(moved.dc, 25);
  assert.equal(setDc(moved, null).dc, 17, "null is back to what the scene wrote");
  assert.equal(stepDc(null, 1), null);
});

test("a way is offered or taken away, but the last one stays", () => {
  const s = toggleSkill(open(), "society");
  assert.deepEqual(s.skills, ["deception", "intimidation", "society"]);
  const fewer = toggleSkill(toggleSkill(s, "deception"), "intimidation");
  assert.deepEqual(fewer.skills, ["society"]);
  assert.equal(toggleSkill(fewer, "society"), fewer, "the last way cannot be taken away");
  assert.equal(toggleSkill(s, "Not A Slug"), s);
});

test("who is asked can change, but a player who has rolled stays asked", () => {
  let s = toggleAsked(open(), "u3");
  assert.deepEqual(s.asked, ["u1", "u2", "u3"]);
  s = toggleAsked(s, "u2");
  assert.deepEqual(s.asked, ["u1", "u3"]);
  s = recordRoll(s, { userId: "u1", skill: "deception", degree: "success", total: 19, at: 5 });
  assert.equal(toggleAsked(s, "u1"), s);
});

test("blind and show-DC are switches; asking again rings the players' windows once more", () => {
  assert.equal(setBlind(open(), true).blind, true);
  assert.equal(setShowDc(open(), true).showDc, true);
  assert.equal(ringAgain(ringAgain(open())).ring, 2);
});

test("a roll lands: an open check keeps its degree and number, a blind one keeps only that it was rolled", () => {
  const s = recordRoll(open(), { userId: "u1", actorId: "a1", skill: "deception", degree: "criticalSuccess", total: 27, messageId: "m1", at: 50 });
  assert.deepEqual(s.rolls.u1, { skill: "deception", via: "roll", at: 50, actorId: "a1", messageId: "m1", degree: "criticalSuccess", total: 27 });
  const blind = recordRoll(open({ blind: true }), { userId: "u1", skill: "deception", degree: "failure", total: 9, messageId: "m2", at: 60 });
  assert.equal(blind.rolls.u1.rolled, true);
  assert.equal("degree" in blind.rolls.u1, false, "a blind check's degree must never reach the shared record");
  assert.equal("total" in blind.rolls.u1, false, "nor its number");
  assert.equal(blind.rolls.u1.messageId, "m2", "the GM's screen reads it from the roll's own message");
});

test("a roll with no DC is in, with its number but no degree", () => {
  const s = recordRoll(open({ dc: null }), { userId: "u2", skill: "intimidation", degree: null, total: 14, at: 70 });
  assert.equal(s.rolls.u2.rolled, true);
  assert.equal(s.rolls.u2.total, 14);
  assert.equal(ledState(s.rolls.u2), "rolled");
});

test("someone who rolls without being asked is asked now; a result set by hand says so; taking it back clears it", () => {
  let s = recordRoll(open(), { userId: "u9", degree: "failure", via: "gm", at: 80 });
  assert.ok(s.asked.includes("u9"));
  assert.equal(s.rolls.u9.via, "gm");
  s = clearRoll(s, "u9");
  assert.equal(s.rolls.u9, undefined);
  assert.equal(clearRoll(s, "nobody"), s);
});

test("a gem waits, shows pearl for a blind roll on a player's screen, and its degree on the GM's when known", () => {
  assert.equal(ledState(null), "waiting");
  assert.equal(ledState({ degree: "success" }), "success");
  assert.equal(ledState({ rolled: true }), "rolled");
  assert.equal(ledState({ rolled: true }, { gm: true, known: "criticalFailure" }), "criticalFailure");
  assert.equal(ledState({ rolled: true }, { gm: false, known: "criticalFailure" }), "rolled", "a player's screen never learns a blind degree");
  assert.equal(ledState({ rolled: true }, { gm: true, known: "nonsense" }), "rolled");
});

test("a gem plays its arrival only just after it lit", () => {
  assert.equal(isFresh({ at: 1000 }, 1000 + FRESH_MS - 1), true);
  assert.equal(isFresh({ at: 1000 }, 1000 + FRESH_MS), false);
  assert.equal(isFresh({ at: 1000 }, 900), false);
  assert.equal(isFresh({}, 1000), false);
});

test("everyone in: counted against those asked", () => {
  let s = open();
  assert.equal(allIn(s), false);
  s = recordRoll(s, { userId: "u1", degree: "success", at: 1 });
  assert.equal(rolledCount(s), 1);
  s = recordRoll(s, { userId: "u2", degree: "failure", at: 2 });
  assert.equal(allIn(s), true);
  assert.equal(allIn(open({ asked: [] })), false, "nobody asked is never all in");
});

test("what each degree means reads best first, with who it landed on", () => {
  const rows = outcomeRows(
    { criticalSuccess: "They see the stamp.", failure: "Nothing." },
    [{ name: "Aiko", degree: "success" }, { name: "Ren", degree: "failure" }, { name: "Mio", degree: "failure" }],
    { criticalSuccess: "Crit success", success: "Success", failure: "Failure", criticalFailure: "Crit failure" }
  );
  assert.deepEqual(rows.map((r) => r.degree), [...DEGREES].reverse());
  assert.equal(rows[0].text, "They see the stamp.");
  assert.deepEqual(rows[2].who, ["Ren", "Mio"]);
  assert.equal(rows[2].hit, true);
  assert.equal(rows[3].hit, false);
  assert.equal(rows[3].text, null);
});

test("the log's line says the check, the DC and how each player did", () => {
  assert.equal(
    summaryLine("Overhear the staff", 17, [
      { name: "Aiko", skillLabel: "Perception", degreeLabel: "Success", total: 19 },
      { name: "Ren", skillLabel: null, degreeLabel: "Failure", total: null }
    ]),
    "Overhear the staff (DC 17): Aiko Success (Perception 19), Ren Failure."
  );
  assert.equal(summaryLine(null, null, []), "Check: nobody rolled.");
});

test("a console roll carries its check and its way as roll options, and they read back; anything unsafe is left out", () => {
  const options = consoleRollOptions("abc123", "deception");
  assert.deepEqual(options, ["bi-check:abc123", "bi-way:deception"]);
  assert.deepEqual(consoleTagFrom(["foo", ...options]), { sessionId: "abc123", skill: "deception" });
  assert.deepEqual(consoleRollOptions("ABC|1", "Bad Slug"), []);
  assert.equal(consoleTagFrom(["bi-way:deception"]), null, "a way with no check is not a console roll");
  assert.equal(consoleTagFrom(null), null);
  // Every option rides inside sf2e's own enricher syntax when posted to chat: no |, ], or comma.
  for (const option of options) assert.match(option, /^[a-z0-9][a-z0-9:_-]*$/);
});

test("the dial's face: a tick for every DC, a numeral every five, the set one lit, the knob's frame from end to end", () => {
  const face = dcDial(17);
  assert.equal(face.ticks.length, DC_RANGE.max - DC_RANGE.min + 1);
  assert.deepEqual(face.numerals.map((n) => n.text), ["5", "10", "15", "20", "25", "30", "35", "40"]);
  assert.equal(face.ticks.filter((t) => t.active).length, 1);
  assert.equal(dcDial(DC_RANGE.min).frame, 0);
  assert.equal(dcDial(DC_RANGE.max).frame, 127);
  assert.equal(dcDial(null).value, null);
  assert.equal(dcDial(null).ticks.some((t) => t.active), false);
  assert.equal(dcAngle(DC_RANGE.min), -135);
  assert.equal(dcAngle(DC_RANGE.max), 135);
  for (const tick of face.ticks) for (const v of [tick.x1, tick.y1, tick.x2, tick.y2]) assert.ok(v >= 0 && v <= 100);
});

/* --- D062: how hard a DC is, results per way, the bank of lights ---------------------------------------- */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULES = JSON.parse(readFileSync(path.join(ROOT, "reference", "tables", "dc-and-check-math.json"), "utf8")).dcTables;

test("the DC by level and the difficulty steps are GM Core's own, as the local rules mirror has them", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(LEVEL_DC).map(([k, v]) => [k, v])), Object.fromEntries(Object.entries(RULES.dcByLevel).map(([k, v]) => [k, v])));
  const steps = Object.fromEntries(DIFFICULTIES.map((d) => [d.key, d.delta]));
  const adj = RULES.difficultyAdjustments;
  assert.equal(steps.incrediblyEasy, adj.incrediblyEasy);
  assert.equal(steps.veryEasy, adj.veryEasy);
  assert.equal(steps.easy, adj.easy);
  assert.equal(steps.hard, adj.hard.value);
  assert.equal(steps.veryHard, adj.veryHard.value);
  assert.equal(steps.incrediblyHard, adj.incrediblyHard.value);
  assert.equal(levelDc(1), 15, "a level-1 party's standard DC");
  assert.equal(levelDc(1), STANDARD_DC);
  assert.equal(levelDc("nonsense"), 15);
  assert.equal(levelDc(40), 50, "clamped to the table's top");
});

test("how hard a DC is for the party: the nearest step to how far it sits from the level's standard DC", () => {
  const at = (dc, level = 1) => difficultyOf(dc, level).key;
  assert.equal(at(15), "standard");
  assert.equal(at(14), "standard", "one under is still standard (nearer than easy, and ties go towards standard)");
  assert.equal(at(16), "standard");
  assert.equal(at(13), "easy");
  assert.equal(at(12), "easy");
  assert.equal(at(11), "veryEasy");
  assert.equal(at(10), "veryEasy");
  assert.equal(at(5), "incrediblyEasy");
  assert.equal(at(17), "hard");
  assert.equal(at(18), "hard");
  assert.equal(at(19), "veryHard");
  assert.equal(at(22), "veryHard");
  assert.equal(at(23), "incrediblyHard");
  assert.equal(at(25), "incrediblyHard");
  // The same DC is easier for a higher-level party.
  assert.equal(at(17, 5), "easy", "DC 17 against level 5's standard 20");
  assert.equal(difficultyOf(18, 1).delta, 3);
  assert.equal(difficultyOf(null, 1).key, null);
});

test("the dial's bands run end to end over the whole dial, each step once, in order, with the standard DC's notch", () => {
  const bands = difficultyBands(1);
  assert.equal(bands[0].from, DC_RANGE.min);
  assert.equal(bands[bands.length - 1].to, DC_RANGE.max);
  for (let i = 1; i < bands.length; i++) assert.equal(bands[i].from, bands[i - 1].to + 1, "a gap or overlap between bands");
  const order = DIFFICULTIES.map((d) => d.key);
  const seen = bands.map((b) => b.key);
  assert.deepEqual(seen, order.filter((k) => seen.includes(k)), "bands out of difficulty order");
  assert.ok(bands.find((b) => b.key === "standard").from <= 15 && bands.find((b) => b.key === "standard").to >= 15);
  const { arcs, notch } = dcBandArcs(1);
  assert.equal(arcs.length, bands.length);
  for (const arc of arcs) assert.match(arc.d, /^M [\d.]+ [\d.]+ A [\d.]+ [\d.]+ 0 [01] 1 [\d.]+ [\d.]+$/);
  assert.equal(notch.dc, 15);
  assert.equal(dcBandArcs(25).notch, null, "level 25's standard DC (50) is off the dial");
});

test("results per way and per degree: a way's own result, else the check's; a way's one line comes back as a note", () => {
  const check = {
    outcomes: { success: "She sends them on.", failure: "Nothing." },
    bySkill: {
      deception: "She sees straight through it.",
      intimidation: { success: "She gives the name, cold.", criticalFailure: "She calls the duty officer." }
    }
  };
  assert.deepEqual(resultFor(check, "intimidation", "success"), { text: "She gives the name, cold.", own: true, note: null });
  assert.deepEqual(resultFor(check, "intimidation", "failure"), { text: "Nothing.", own: false, note: null }, "a degree a way leaves out falls back");
  assert.deepEqual(resultFor(check, "intimidation", "criticalFailure"), { text: "She calls the duty officer.", own: true, note: null });
  assert.deepEqual(resultFor(check, "deception", "success"), { text: "She sends them on.", own: false, note: "She sees straight through it." });
  assert.deepEqual(resultFor(check, "diplomacy", "criticalSuccess"), { text: null, own: false, note: null });
  assert.equal(hasWayResults(check), true);
  assert.equal(hasWayResults({ outcomes: check.outcomes }), false);
  assert.equal(hasWayResults({ bySkill: { deception: "  ", intimidation: {} } }), false, "empty entries say nothing");
  assert.equal(hasWayResults({ bySkill: { intimidation: { success: " " } } }), false, "a degree left blank says nothing");
  // Only a way with results of its own per degree sets the other degrees apart as the same for every way; a check
  // whose ways each have one line has nothing per degree to compare with.
  assert.equal(hasPerDegreeWays(check), true);
  assert.equal(hasPerDegreeWays({ bySkill: { deception: "She sees straight through it." } }), false);
  assert.equal(hasPerDegreeWays({ bySkill: { intimidation: { success: "" } } }), false);
});

test("the bank of lights has six slots: the first six people, then empty slots", () => {
  assert.equal(BANK_SIZE, 6);
  assert.deepEqual(bankSlots(["a", "b"]), ["a", "b", null, null, null, null]);
  assert.deepEqual(bankSlots(["a", "b", "c", "d", "e", "f", "g"]), ["a", "b", "c", "d", "e", "f"]);
  assert.deepEqual(bankSlots(), [null, null, null, null, null, null]);
});

test("a way can have a DC of its own: the dial turns that way alone, the rest follow the check (2026-10-05)", () => {
  const s = open({ skills: ["nature", "perception"], dc: 15 });
  assert.equal(dcFor(s, "nature"), 15);
  assert.equal(hasWayDcs(s), false);
  const up = stepDc(s, 2, "perception");
  assert.equal(dcFor(up, "perception"), 17);
  assert.equal(dcFor(up, "nature"), 15, "the other way still follows the check");
  assert.equal(up.dc, 15, "the check's own DC did not move");
  assert.equal(hasWayDcs(up), true);
  assert.equal(dcFor(stepDc(up, 3), "nature"), 18, "moving the check's DC moves ways without their own");
  assert.equal(dcFor(stepDc(up, 3), "perception"), 17, "...and leaves a way with its own");
  assert.equal(dcFor(setDc(up, null, "perception"), "perception"), 15, "reset: back to the check's DC");
});

test("a scene's own DC for a way is what reset brings back, and an old session without ways reads as none (2026-10-05)", () => {
  const s = newSession({ id: "w1", skills: ["nature", "perception"], dc: 15, wayDcs: { perception: 18, "Bad Slug": 9, nature: "x" } });
  assert.deepEqual(s.wayDcs, { perception: 18 });
  assert.equal(dcFor(setDc(stepDc(s, 4, "perception"), null, "perception"), "perception"), 18);
  const old = { ...s };
  delete old.wayDcs;
  assert.equal(dcFor(old, "perception"), 15);
  assert.equal(hasWayDcs(old), false);
  assert.match(summaryLine("Hide", 15, [], [{ label: "Nature", dc: 15 }, { label: "Perception", dc: 18 }]), /Hide \(Nature DC 15, Perception DC 18\): nobody rolled\./);
});
