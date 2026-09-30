// Tier 2 — every scene gives the players enough to do, and the per-player
// go-round stays visible to tooling.
//
// WHY THIS EXISTS. Measuring "how much of this scene do the players drive"
// kept flagging good scenes, three times running, for the same reason: this
// campaign leans hard on a structure where the GM goes round the table and
// gives each character their own version of one beat. Six bespoke questions in
// The Hammer, six crew chiefs in Familiarisation, six physical states in Zero
// Six Hundred. That is six moments of spotlight and every structural measure
// counted it as one beat of narration.
//
// A structure no tool can see is a structure that eventually gets "fixed". So
// `delivery: "each"` was added to the scene-brief schema to name it, the real
// go-rounds were tagged, and this test keeps both halves honest: the measure
// counts them, and a new go-round written in prose but left untagged is
// caught before it drags a scene under the threshold.
//
// The measure is deliberately crude. It asks only whether a beat is something
// the players DO -- it carries a check, it offers a choice, it happens only
// because somebody asked, or it hands each of them their own moment. It says
// nothing about whether the beat is any good.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const briefDir = path.join(repoRoot, "data", "scene-briefs");
const schemaPath = path.join(repoRoot, "data", "schema", "scene-brief.schema.json");

const MIN_AGENCY_SHARE = 0.4;

// Scenes deliberately below the threshold, with the reason. A quiet scene is
// a real tool -- the pacing sawtooth needs troughs (pacing-and-the-responsive-
// campaign.md §3) -- but it has to be a decision somebody made, not a scene
// that drifted there.
const DELIBERATELY_QUIET = new Map([
  [
    "episode-c1e2--the-names-are-still-up",
    "Episode Two's closer. Four beats, ten minutes, and less is fine. Six people in a machine hall after everybody has gone home, reading a chalk board that has not been rubbed out. The arrow pass (design/scene-audit.md §9) closes the episode on this scene deliberately flat."
  ],
  [
    "episode-c1e1--from-up-here",
    "Scene 0 (Ingram, 2026-09-24): the GM's opening speech over one picture of the world, six minutes of narration and nothing for the players to do on purpose. Every player's first turn is the scene straight after it, The Road In, which is long and is all theirs."
  ]
]);

function briefs() {
  return readdirSync(briefDir)
    .filter((n) => n.endsWith(".json"))
    .map((n) => ({ id: n.replace(/\.json$/, ""), brief: JSON.parse(readFileSync(path.join(briefDir, n), "utf8")) }));
}

const isAgency = (b) =>
  Boolean(b.checkRef) || Boolean(b.choicePoint) || b.mandatory === false || b.delivery === "each" || b.delivery === "solo";

// A haunt (design/haunts.md) is a menu, not a script: its few beats frame the
// night, and what the players do lives in its event deck. Every event that asks
// something of a player -- a roll, a prompt to answer in character, a dilemma --
// is a moment they drive, so it counts beside the beats.
const isAgencyEvent = (e) => Boolean(e.check) || Boolean(e.prompt) || e.kind === "dilemma";
const agencyOf = (brief) => {
  const beats = brief.beats ?? [];
  const events = brief.haunt ? brief.events ?? [] : [];
  return { driven: beats.filter(isAgency).length + events.filter(isAgencyEvent).length, total: beats.length + events.length };
};

test('the schema knows about delivery: "each"', () => {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const delivery = schema.properties.beats.items.properties.delivery;
  assert.ok(delivery.enum.includes("each"), "delivery enum lost its per-player go-round value");
  assert.match(delivery.description, /each = every player in turn/i);
});

test("a beat written as a per-player go-round is tagged as one", () => {
  // Phrasings taken from the real directions in both episodes. Deliberately
  // narrow: it must say the GM goes round giving each player their own, not
  // merely mention players.
  const GO_ROUND =
    /go round the table|round the table once|give every player their own|give each player their own|ask each of them|each of them, individually|do this individually/i;
  const missed = [];
  for (const { id, brief } of briefs()) {
    for (const beat of brief.beats ?? []) {
      const text = String(beat.direction ?? "") + String(beat.text ?? "");
      if (GO_ROUND.test(text) && beat.delivery !== "each" && beat.delivery !== "solo") {
        missed.push(`${id}/${beat.id}`);
      }
    }
  }
  assert.deepEqual(
    missed,
    [],
    'beats whose direction is a per-player go-round but whose delivery is not "each" -- ' +
      "tag them, or reword the direction if it is not actually one"
  );
});

test("every scene is at least 40% beats the players drive", () => {
  const thin = [];
  for (const { id, brief } of briefs()) {
    if (!(brief.beats ?? []).length) continue;
    const { driven, total } = agencyOf(brief);
    if (driven / total < MIN_AGENCY_SHARE && !DELIBERATELY_QUIET.has(id)) {
      thin.push(`${id} (${driven}/${total})`);
    }
  }
  assert.deepEqual(
    thin,
    [],
    "scenes where under 40% of beats are something the players do. Either give the scene " +
      "something to do, or add it to DELIBERATELY_QUIET here with the reason it is a trough on purpose."
  );
});

test("the deliberately-quiet list does not rot", () => {
  const ids = new Set(briefs().map((b) => b.id));
  for (const [id, reason] of DELIBERATELY_QUIET) {
    assert.ok(ids.has(id), `${id} is listed as deliberately quiet but no longer exists`);
    assert.ok(reason.length > 40, `${id} needs a real reason, not a label`);
  }
});

test("a haunt's event deck counts as the players' part, and only the events that ask something of them", () => {
  const haunt = {
    haunt: { everyVisit: "x" },
    beats: [{ id: "room" }, { id: "night" }],
    events: [{ id: "a", check: "Diplomacy" }, { id: "b", prompt: "Tell us..." }, { id: "c", kind: "dilemma" }, { id: "d", kind: "plot" }]
  };
  assert.deepEqual(agencyOf(haunt), { driven: 3, total: 6 });
  assert.deepEqual(agencyOf({ ...haunt, haunt: undefined }), { driven: 0, total: 2 }, "an ordinary scene's events are not counted");
});
