// Tier 1 — the admin panel's pure rules (module/blank-inheritance/scripts/core/admin.mjs).
//
// What "the start" is, what a reset does and in what order, how the snapshot
// undo reads is checked, which characters get lent to which accounts, and how
// a stand-in player picks, rolls and books. The wiring into Foundry is pinned
// in tier3-admin-contract.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUTOPILOT_DEFAULTS,
  KEPT_SETTINGS,
  RESET_DEFAULTS,
  RESET_SETTINGS,
  SNAPSHOT_KIND,
  SNAPSHOT_VERSION,
  autoCommitChoice,
  autopickChoice,
  autopilotOn,
  bestSlug,
  episodeStart,
  normalizeAutopilot,
  normalizeResetOptions,
  postedChecks,
  resetPlan,
  resetValues,
  snapshotFilename,
  snapshotProblems,
  testPartyPlan,
  unbookedUsers,
  unpickedUsers
} from "../module/blank-inheritance/scripts/core/admin.mjs";
import { normalizeDeparture, openDeparture } from "../module/blank-inheritance/scripts/core/departures.mjs";
import { enrichersFor, checkSkills } from "../module/blank-inheritance/scripts/core/roll-intent.mjs";
import { runnerRollOption } from "../module/blank-inheritance/scripts/core/runner-view.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));

/* ------------------------------------------------------------------ */
/*  The start                                                          */
/* ------------------------------------------------------------------ */

test("REAL DATA: the start is Episode One's first scene, at the first moment any scene is dated to", () => {
  const episode = readJson("data/episodes/episode-c1e1-mothers-maiden-name.json");
  const start = episodeStart(episode);
  assert.equal(start.episodeId, "episode-c1e1-mothers-maiden-name");
  const first = [...episode.scenes].sort((a, b) => a.order - b.order)[0];
  assert.equal(start.briefId, first.briefRef, "the reset lands on the opening scene in play order");
  assert.equal(start.briefId, "episode-c1e1--from-up-here");
  assert.equal(start.moment.day, 1, "day 0 is clamped to the day ring's first day, never below it");
  assert.equal(start.moment.quarter, "morning");
});

test("the start follows the data: an undated episode starts on day 1's first quarter", () => {
  const start = episodeStart({ id: "ep", scenes: [{ order: 2, briefRef: "b" }, { order: 1, briefRef: "a" }] });
  assert.deepEqual(start, { episodeId: "ep", briefId: "a", moment: { day: 1, quarter: "morning" } });
  const dated = episodeStart({ id: "ep", scenes: [{ order: 0, briefRef: "a" }, { order: 1, briefRef: "b", day: 3, quarter: "evening" }] });
  assert.deepEqual(dated.moment, { day: 3, quarter: "evening" });
});

test("reset values cover every reset setting exactly, and none of them is left over from play", () => {
  const values = resetValues({ episodeId: "ep", briefId: "a", moment: { day: 1, quarter: "morning" } });
  assert.deepEqual(Object.keys(values).sort(), [...RESET_SETTINGS].sort());
  assert.deepEqual(values.commitments, []);
  assert.deepEqual(values.runnerRuns, {});
  assert.equal(values.cityState.departure, null);
  assert.deepEqual(values.cityState.pawns, {});
  assert.equal(values.runnerBrief, "a");
  assert.equal(values.audioScape.soundscapeId, null);
});

test("no setting is both reset and kept", () => {
  for (const key of RESET_SETTINGS) assert.ok(!(key in KEPT_SETTINGS), `${key} is on both lists`);
});

/* ------------------------------------------------------------------ */
/*  The plan                                                           */
/* ------------------------------------------------------------------ */

test("a reset always snapshots first and logs last; optional steps appear only when chosen", () => {
  const all = resetPlan({ clearChat: true, endCombats: true, cutToStart: true, deleteInductionCharacters: true, clearNotebook: true });
  assert.equal(all[0].id, "snapshot");
  assert.equal(all.at(-1).id, "log");
  for (const id of ["chat", "combats", "induction", "scene", "notebook"]) assert.ok(all.some((s) => s.id === id), `${id} missing`);

  const bare = resetPlan({ clearChat: false, endCombats: false, cutToStart: false, deleteInductionCharacters: false, clearNotebook: false });
  for (const id of ["chat", "combats", "induction", "scene", "notebook"]) assert.ok(!bare.some((s) => s.id === id), `${id} ran unchosen`);
  assert.equal(bare[0].id, "snapshot");
});

test("the default reset clears the party notebook (it is about the run being thrown away), and undo can put it back", () => {
  assert.equal(RESET_DEFAULTS.clearNotebook, true);
  const step = resetPlan().find((s) => s.id === "notebook");
  assert.ok(step, "the default reset must clear the notebook, or a test NPC's page sits in front of real players");
  assert.equal(step.undoable, true, "the snapshot keeps every page, so this loses nothing");
  assert.equal(resetPlan({ clearNotebook: false }).some((s) => s.id === "notebook"), false, "a GM can choose to keep it");
});

test("the default reset keeps the players' own characters, and says which steps cannot be undone", () => {
  assert.equal(RESET_DEFAULTS.deleteInductionCharacters, false);
  const plan = resetPlan();
  assert.ok(!plan.some((s) => s.id === "induction"));
  assert.equal(plan.find((s) => s.id === "combats").undoable, false, "ended combats are not restored, and the confirmation must say so");
  assert.equal(plan.find((s) => s.id === "log").undoable, null, "a log line loses nothing, so the confirmation does not warn about it");
  assert.deepEqual(plan.filter((s) => s.undoable === false).map((s) => s.id), ["combats"], "only a real loss is flagged");
  assert.deepEqual(normalizeResetOptions({ clearChat: "yes", endCombats: false }), { ...RESET_DEFAULTS, endCombats: false });
});

/* ------------------------------------------------------------------ */
/*  The snapshot                                                       */
/* ------------------------------------------------------------------ */

test("a snapshot filename is safe and sortable; a snapshot is checked before undo trusts it", () => {
  const name = snapshotFilename("2026-09-28T17:30:05.123Z");
  assert.equal(name, "admin-snapshot-20260928T173005123Z.json");
  assert.ok(!name.startsWith("scene-edit"), "never mistaken for one of Ingram's scene-edit records");
  assert.throws(() => snapshotFilename(""));

  const good = { kind: SNAPSHOT_KIND, version: SNAPSHOT_VERSION, takenAt: "x", settings: { campaignMoment: { day: 2 } }, chat: [], actors: [] };
  assert.deepEqual(snapshotProblems(good), []);
  assert.ok(snapshotProblems({ ...good, kind: "other" }).length);
  assert.ok(snapshotProblems({ ...good, settings: { worldSync: {} } }).some((p) => /worldSync/.test(p)), "undo never writes a setting a reset does not own");
  assert.ok(snapshotProblems({ ...good, chat: "no" }).length);
  assert.ok(snapshotProblems({ ...good, notebook: "no" }).length, "the notebook's pages must be a list");
  assert.deepEqual(snapshotProblems({ ...good, notebook: [] }), [], "an empty notebook is fine, and so is a snapshot from before the notebook existed");
  assert.deepEqual(snapshotProblems(null), ["not a snapshot"]);
});

/* ------------------------------------------------------------------ */
/*  The test party                                                     */
/* ------------------------------------------------------------------ */

test("test characters fill only accounts with none, and never take anyone's own character", () => {
  const users = [
    { id: "gm", isGM: true, characterId: null },
    { id: "liam", isGM: false, characterId: null },
    { id: "pippa", isGM: false, characterId: "real" },
    { id: "craig", isGM: false, characterId: null },
    { id: "steve", isGM: false, characterId: null }
  ];
  const actors = [
    { id: "real", name: "Pippa's own", type: "character", assignedTo: "pippa" },
    { id: "npc", name: "Shucks", type: "npc", assignedTo: null },
    { id: "b", name: "TEST FIXTURE — PC 2", type: "character", assignedTo: null },
    { id: "a", name: "TEST FIXTURE — PC 1", type: "character", assignedTo: null },
    { id: "z", name: "Somebody", type: "character", assignedTo: null }
  ];
  assert.deepEqual(testPartyPlan({ users, actors }), [
    { userId: "liam", actorId: "a" },
    { userId: "craig", actorId: "b" },
    { userId: "steve", actorId: "z" }
  ]);
  assert.deepEqual(testPartyPlan({ users: users.slice(0, 2), actors: [] }), [], "no spare characters, nobody filled");
});

/* ------------------------------------------------------------------ */
/*  The stand-ins                                                      */
/* ------------------------------------------------------------------ */

const live = (raw, extra = {}) => ({ ...openDeparture(normalizeDeparture(raw), { id: "d", openedAt: 0 }), ...extra });

test("autopilot settings default to off and only accept known strategies", () => {
  assert.deepEqual(normalizeAutopilot({}), AUTOPILOT_DEFAULTS);
  assert.equal(autopilotOn({}), false);
  assert.equal(autopilotOn({ rolls: true }), true);
  assert.equal(normalizeAutopilot({ strategy: "chaos" }).strategy, "random");
  assert.equal(normalizeAutopilot({ strategy: "spread" }).strategy, "spread");
});

test("a stand-in picks only where a real player could: never full, never a place not open to them", () => {
  const d = live(
    {
      kind: "free",
      question: "Where?",
      destinations: [
        { id: "small", placeRef: "p", briefRef: "b", roomFor: 1 },
        { id: "closed", placeRef: "p", briefRef: "b", pickedIn: ["elsewhere"] },
        { id: "open", placeRef: "p", briefRef: "b" }
      ]
    },
    { picks: { someone: "small" } }
  );
  for (let i = 0; i < 20; i++) {
    assert.equal(autopickChoice(d, { userId: "me", random: () => i / 20 }), "open");
  }
});

test("a must-go place nobody has taken is covered first; then the strategy decides", () => {
  const raw = {
    kind: "free",
    question: "Where?",
    destinations: [
      { id: "a", placeRef: "p", briefRef: "b" },
      { id: "b", placeRef: "p", briefRef: "b" },
      { id: "watch", placeRef: "p", briefRef: "b", mustGo: true }
    ]
  };
  assert.equal(autopickChoice(live(raw), { userId: "me", random: () => 0 }), "watch");

  const covered = live(raw, { picks: { x: "watch", y: "a", z: "a" } });
  assert.equal(autopickChoice(covered, { userId: "me", strategy: "spread", random: () => 0 }), "b", "spread goes where fewest are");
  assert.equal(autopickChoice(covered, { userId: "me", strategy: "together", random: () => 0 }), "a", "together follows the crowd");
});

test("unpicked users skip anyone with a public or a private pick; nothing to pick means nobody", () => {
  const d = live({ kind: "together", question: "Q", destinations: [{ id: "a", placeRef: "p", briefRef: "b" }, { id: "b", placeRef: "p", briefRef: "b" }] }, { picks: { one: "a" } });
  const roster = [{ userId: "one" }, { userId: "two" }, { userId: "three" }];
  assert.deepEqual(unpickedUsers(d, roster, { two: "b" }), ["three"]);
  assert.deepEqual(unpickedUsers(null, roster), []);
  assert.deepEqual(unpickedUsers(live({ kind: "sent", briefRef: "x" }), roster), [], "a sent departure has nothing to choose");
});

test("the checks a Runner post offers are read back exactly as the Runner wrote them", () => {
  const tag = runnerRollOption("episode-c1e1--the-road-in", "the-small-problem");
  const content = enrichersFor({ skillOptions: checkSkills({ anySkill: true }), dc: 15, options: [tag] });
  const checks = postedChecks(content);
  assert.equal(checks.length, 18, "an any-skill check offers every skill, one enricher each");
  assert.ok(checks.every((c) => c.dc === 15 && c.options.includes(tag)));
  assert.deepEqual(postedChecks("@Check[athletics|dc:15]"), [], "an untagged check is somebody else's, not the Runner's");
  assert.deepEqual(postedChecks("no checks here"), []);
});

test("a stand-in rolls its best skill of those offered", () => {
  const mods = { athletics: 2, stealth: 5, society: -1 };
  assert.equal(bestSlug(["athletics", "stealth", "society"], (s) => mods[s]), "stealth");
  assert.equal(bestSlug(["lore-x", "athletics"], (s) => mods[s]), "athletics", "a skill the sheet lacks is skipped");
  assert.equal(bestSlug([], () => 1), null);
});

test("a stand-in books one of the quarter's offers, and only those not yet booked are filled", () => {
  const offers = [{ id: "rest", standing: true }, { id: "gone", standing: false, expiresOn: "d1:morning" }];
  assert.equal(autoCommitChoice({ moment: { day: 2, quarter: "morning" }, offers, random: () => 0.99 }), "rest", "an expired offer is not booked");
  assert.equal(autoCommitChoice({ moment: { day: 1, quarter: "morning" }, offers: [] }), null);
  const roster = [{ userId: "a" }, { userId: "b" }];
  assert.deepEqual(unbookedUsers({ roster, commitments: [{ userId: "a", momentKey: "d1:morning" }], momentKey: "d1:morning" }), ["b"]);
});
