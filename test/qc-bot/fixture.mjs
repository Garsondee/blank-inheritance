// Shared fixtures for the QC bot's tests: a tiny repo in a temp folder (one scene, one check file) and a valid report about it.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { writeJson } from "../../tools/qc-bot/lib.mjs";

export const SCENE_ID = "test-scene";
export const CHALLENGE_ID = "c1-test";

export const sceneDoc = () => ({
  $schema: "../schema/scene-brief.schema.json",
  id: SCENE_ID,
  type: "scene-brief",
  episodeRef: "episode-test",
  sceneRef: "test",
  title: "Test Scene",
  summary: "A clerk, a form, a queue.",
  goal: "They leave with the form.",
  howToPlay: "Short and quiet.",
  runsAbout: "10 minutes",
  mode: "social",
  intro: {
    where: "The counter.",
    readAloud: "A clerk looks up from the ledger.",
    landmark: "A rubber stamp.",
    carriesIn: [],
    position: { locationRef: "somewhere", state: "arrives", note: "from the yard" },
  },
  cast: [{ id: "clerk", npcRef: "clerk", label: "Clerk", role: "Clerk", arrival: "start", brief: { wants: "To close the queue." } }],
  beats: [
    { id: "the-form", kind: "check", mandatory: true, delivery: "say", npcRef: "clerk", text: "Ask for the form.", challengeRef: CHALLENGE_ID, checkRef: "read-the-form", facts: [], gmFacts: [], triggers: [] },
    { id: "the-exit", kind: "action", mandatory: false, delivery: "say", text: "They leave.", facts: [], gmFacts: [], triggers: [] },
  ],
  handouts: [],
  artefacts: [],
  outro: { endsWhen: "They leave.", transition: { mechanism: "walk", line: "Out.", scatterRisk: false }, onwards: "The yard.", writeDown: ["the form"], position: { locationRef: "somewhere", state: "leaves", note: "" }, tracks: [], artefactRefs: [] },
  carryForward: [],
  temptations: [{ id: "t1", text: "The clerk sneezes." }],
  reactionPrompts: [{ id: "r1", text: "Was it funny?" }],
  notes: "Prep notes.",
});

export const challengeDoc = () => ({
  $schema: "../schema/challenge.schema.json",
  id: CHALLENGE_ID,
  type: "challenge",
  authoring: { status: "drafted" },
  name: "Test",
  description: "One check.",
  levelContext: 1,
  checks: [
    {
      id: "read-the-form",
      name: "Read the form",
      skillOptions: ["crafting", "perception"],
      dc: { value: 15, basis: "level 1, no adjustment", adjustment: "none" },
      insight: true,
      secret: true,
      outcomes: { criticalSuccess: "All of it.", success: "Most of it.", failure: "Nothing.", criticalFailure: "The wrong thing." },
      bySkill: { crafting: "The stitching is wrong.", perception: "The ink is fresh." },
      repeatable: false,
    },
  ],
  resolutionMode: "narrative-only",
  participants: ["Any of the six"],
  relatedRefs: [],
  notes: "Nothing costs anything.",
});

/** A temp repo folder holding the scene and its check file. */
export function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qc-bot-"));
  writeJson(root, `canon/scenes/${SCENE_ID}.json`, sceneDoc());
  writeJson(root, `canon/challenges/${CHALLENGE_ID}.json`, challengeDoc());
  return root;
}

export function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

export const routeProposal = (over = {}) => ({
  id: "test-scene-1014-1-society",
  kind: "route",
  title: "A third way to read the form",
  rank: 1,
  confidence: "high",
  now: "Only Crafting or Perception read the form, so anyone with neither just watches.",
  change: "Add Society at the same DC, with a line of its own.",
  why: "It is the only place the table learns what the form means.",
  touches: "Nothing else in the scene.",
  risk: "None that I can see.",
  recommendation: "Add it.",
  decisionAsk: "Add it or leave it?",
  ops: [
    { op: "set", file: `canon/challenges/${CHALLENGE_ID}.json`, path: "checks[read-the-form].skillOptions", before: ["crafting", "perception"], after: ["crafting", "perception", "society"] },
    { op: "set", file: `canon/challenges/${CHALLENGE_ID}.json`, path: "checks[read-the-form].bySkill.society", before: null, after: "Forms like this one are issued by one office." },
  ],
  ...over,
});

export const proseProposal = (over = {}) => ({
  id: "test-scene-1014-2-exit",
  kind: "prose",
  title: "Say how they leave",
  rank: 2,
  confidence: "medium",
  now: "The exit beat is two words.",
  change: "Give the GM a full sentence to say.",
  why: "A beat line should say what happens.",
  touches: "Only this beat's wording.",
  risk: "None.",
  recommendation: "Take it.",
  decisionAsk: "Use the new wording?",
  ops: [{ op: "set", file: `canon/scenes/${SCENE_ID}.json`, path: "beats[the-exit].text", before: "They leave.", after: "They head out into the yard with the form." }],
  ...over,
});

export const makeReport = (over = {}) => ({
  kind: "qc-report",
  version: 1,
  id: `qc-${SCENE_ID}-2026-10-14-1`,
  scene: SCENE_ID,
  title: "Test Scene",
  generatedAt: "2026-10-14T20:00:00Z",
  model: "claude-opus-5-5",
  sceneHash: "abc123",
  overview: { why: "The table comes for the form.", walkthrough: "They ask, they roll, they leave.", leadsTo: "The yard." },
  proposals: [routeProposal(), proseProposal()],
  ...over,
});

/** A git repo in the temp folder with everything committed on master, then a qc/test branch checked out. False when git is missing. */
export function gitify(root, branch = "qc/test") {
  const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
  if (git("--version").status !== 0) return false;
  git("init", "-q", "-b", "master");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "Test");
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  if (branch) git("checkout", "-q", "-b", branch);
  return true;
}
