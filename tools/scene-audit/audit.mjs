#!/usr/bin/env node
/**
 * Per-scene audit: the mechanical half of design/scene-audit.md, run against
 * one scene or a whole episode.
 *
 *   node tools/scene-audit/audit.mjs episode-c1e2--the-board
 *   node tools/scene-audit/audit.mjs --episode episode-c1e2-scheduled-exercise
 *
 * This is a CRITIQUE tool, not a lint. `test/tier2-scene-prose-style.test.mjs`
 * holds the rules that are safe to fail a build on -- the ones with no false
 * positives. This holds the rest: everything worth a human look, including
 * checks that will sometimes be wrong. A finding here is a question, not a
 * defect, and `design/gm-facing-prose-style.md` §8c explains why that split
 * exists (a rule that blocks correct writing gets switched off).
 *
 * Grouped by the categories in design/scene-audit.md so a finding can be
 * traced back to the craft document that motivated it.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const dataRoot = path.join(repoRoot, "data");

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const briefPath = (id) => path.join(dataRoot, "scene-briefs", `${id}.json`);

const sentences = (s) =>
  String(s ?? "")
    .split(/(?<=[.!?"])\s+/)
    .filter((x) => x.trim().length > 3).length;

const words = (s) =>
  new Set(
    String(s ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4)
  );

const overlap = (a, b) => {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  return [...B].filter((w) => A.has(w)).length / B.size;
};

/** Load every challenge once, indexed by id. */
/**
 * Every authored scene title across every episode, so a payoff claim that names
 * a real scene ("pays off in The Hammer") is recognised. This used to be a
 * hardcoded list and went stale the moment a scene was added -- deriving it
 * means writing a new scene never makes a correct claim look broken.
 */
function sceneTitleRegex() {
  const titles = new Set();
  for (const f of readdirSync(path.join(dataRoot, "episodes")).filter((x) => x.endsWith(".json"))) {
    for (const s of read(path.join(dataRoot, "episodes", f)).scenes ?? []) {
      if (s.title) titles.add(s.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
  }
  return new RegExp(`\\b(?:${[...titles].join("|")})\\b`, "i");
}
const SCENE_TITLE_RX = sceneTitleRegex();

// Places a payoff legitimately names instead of a scene title.
const PLACE_RX = /\b(?:the tram|the flood tunnel|the hangar|the harbour|the sea wall|the Deputy Director's office|the proving ground)\b/i;

const CHALLENGES = {};
for (const f of readdirSync(path.join(dataRoot, "challenges")).filter((x) => x.endsWith(".json"))) {
  const d = read(path.join(dataRoot, "challenges", f));
  CHALLENGES[d.id] = d;
}

export function auditScene(briefId) {
  const p = briefPath(briefId);
  if (!existsSync(p)) return { briefId, findings: [{ cat: "FATAL", msg: "no such scene brief" }] };
  const b = read(p);
  const f = [];

  // A scene may be correctly missing something this tool looks for -- a montage
  // across six towns has no shared landmark to orbit, and a scene set before the
  // institution exists has nothing on the strategy layer to move. Where that is
  // true, the file says so in its own `notes`, and the audit stops there instead
  // of re-raising it every pass. `design/gm-facing-prose-style.md` §8c.
  // A justification may live in the brief OR in the challenge it points at --
  // a "why these checks are single-skill" argument belongs with the checks.
  const linkedChallengeNotes = [...new Set((b.beats ?? []).map((x) => x.challengeRef).filter(Boolean))]
    .map((r) => String(CHALLENGES[r]?.notes ?? ""))
    .join(" ");
  const justification = (String(b.notes ?? "") + " " + linkedChallengeNotes).toLowerCase();
  const EXEMPT_WORDS = {
    "no landmark": "landmark",
    "no holdInReserve": "holdinreserve",
    "outro.tracks empty": "track",
    "no temptations": "temptation",
    "no carriesIn": "carriesin",
    "no optional beats": "optional beat",
    "fewer than 2 skill routes": "skill route",
  };
  const add = (cat, msg) => {
    for (const [pattern, word] of Object.entries(EXEMPT_WORDS)) {
      if (msg.includes(pattern) && justification.includes(word)) return;
    }
    f.push({ cat, msg });
  };

  // ---- WIRING (narrative-theory-foundations: importance is a property of wiring)
  if (!b.intro?.carriesIn?.length) add("wiring", "no carriesIn -- nothing from an earlier scene changes how this one opens");
  if (!b.outro?.onwards) add("wiring", "no outro.onwards -- the scene does not say what it leads to");
  if (!(b.outro?.writeDown ?? []).length) add("wiring", "no outro.writeDown -- nothing is captured for later");

  // ---- NPC WANT AND VOICE (quests-objectives-and-threads: depth is free, wants are not)
  for (const c of b.cast ?? []) {
    const label = c.label ?? c.id;
    if (c.walkOn === true) continue;
    const w = c.brief?.wants ?? "";
    if (!w) add("npc", `${label}: no wants`);
    if (!(c.brief?.willNotDiscuss ?? []).length) add("npc", `${label}: no hard line (willNotDiscuss empty)`);
    if ((c.brief?.voice?.samples ?? []).length < 3) add("npc", `${label}: fewer than 3 voice samples -- thin generator`);
    if (!(c.brief?.willDiscuss ?? []).length) add("npc", `${label}: no willDiscuss topics`);
    if (c.brief?.opensWith && (c.brief?.voice?.samples ?? []).includes(c.brief.opensWith))
      add("npc", `${label}: opensWith duplicates a voice sample -- two fields doing one job`);
  }

  // ---- AGENCY (agency-and-player-choice)
  const choicePoints = (b.beats ?? []).filter((x) => x.choicePoint);
  for (const cp of choicePoints) {
    if (cp.choicePoint.allowsInventedOption && !/invent/i.test(String(cp.note) + String(cp.direction)))
      add("agency", `beat ${cp.id}: allowsInventedOption with no authored guidance for one`);
    if ((cp.choicePoint.options ?? []).some((o) => !o.consequence))
      add("agency", `beat ${cp.id}: a choicePoint option has no stated consequence`);
  }
  // A refusal floor is only owed where the beat ASKS the players for something.
  // A mandatory action beat -- the tide comes back, he reads the order out -- is
  // a thing that happens, and demanding permission-to-decline on those flagged
  // every scene in the episode and taught me to ignore the category.
  const asksSomething = (b.beats ?? []).filter(
    (x) => x.mandatory === true && (x.kind === "check" || x.choicePoint)
  );
  for (const m of asksSomething) {
    const t = String(m.note) + String(m.direction);
    // Widened after a pass where two genuinely good, naturally-written floors
    // went unrecognised ("the default is that...", "may do nothing", "offer no
    // roll"). A detector that does not recognise correct writing is the defect.
    if (
      !/declin|refus|silence|skip|has to roll|not to roll|say nothing|costs (them )?nothing|allowed|can sit|walk away|the default is|may do nothing|do nothing|offer no roll|will not decide|legitimate|does not have to|need not/i.test(
        t
      )
    )
      add("agency", `beat ${m.id} is a mandatory ${m.choicePoint ? "choice" : "check"} with no refusal floor`);
  }

  // ---- PLACE AND READ-ALOUD (environmental-storytelling, prose-craft §4)
  const ra = b.intro?.readAloud ?? "";
  if (ra) {
    const units = ra.split("\n\n").filter((u) => u.trim()).length;
    if (sentences(ra) > 3 && units < 3) add("place", `intro readAloud ${sentences(ra)} sentences in ${units} unit(s)`);
  }
  if (!b.intro?.landmark) add("place", "no landmark -- theatre of mind has nothing to orbit");
  if (!b.intro?.holdInReserve) add("place", "no holdInReserve -- no fourth detail for a player who leans in");
  if (b.intro?.firstThing && overlap(b.intro.firstThing, ra) > 0.55)
    add("place", "firstThing largely restates readAloud");
  for (const bt of b.beats ?? []) {
    if (bt.readAloud && sentences(bt.readAloud) > 4 && !bt.readAloud.includes("\n\n"))
      add("place", `beat ${bt.id}: readAloud ${sentences(bt.readAloud)} sentences, single block`);
  }

  // ---- VARIETY (pacing-and-the-responsive-campaign §3)
  const kinds = (b.beats ?? []).map((x) => x.kind);
  if (kinds.length > 3 && new Set(kinds).size === 1) add("variety", `every beat is kind "${kinds[0]}"`);
  const optional = (b.beats ?? []).filter((x) => x.mandatory === false);
  if ((b.beats ?? []).length > 3 && !optional.length) add("variety", "no optional beats -- nothing rewards curiosity");

  // ---- MECHANICS (rpg-systems-design; SF2E grounding)
  const refs = new Set((b.beats ?? []).map((x) => x.challengeRef).filter(Boolean));
  for (const r of refs) {
    const ch = CHALLENGES[r];
    if (!ch) { add("mechanics", `challengeRef ${r} does not resolve`); continue; }
    for (const bt of (b.beats ?? []).filter((x) => x.challengeRef === r && x.checkRef)) {
      if (!(ch.checks ?? []).some((c) => c.id === bt.checkRef))
        add("mechanics", `beat ${bt.id} points at checkRef ${bt.checkRef}, absent from ${r}`);
    }
    for (const c of ch.checks ?? []) {
      const o = c.outcomes ?? {};
      const missing = ["criticalSuccess", "success", "failure", "criticalFailure"].filter((k) => !o[k]);
      if (missing.length) add("mechanics", `${r}/${c.id}: missing ${missing.join(", ")}`);
      if (![13, 15, 17, 20].includes(c.dc?.value)) add("mechanics", `${r}/${c.id}: DC ${c.dc?.value} is off the Chapter One ladder (13/15/17/20)`);
      // anySkill: the player names the skill, so every route is open by definition.
      if (!c.anySkill && (c.skillOptions ?? []).length < 2) add("mechanics", `${r}/${c.id}: fewer than 2 skill routes in`);
    }
  }

  // ---- PAYOFF INTEGRITY (the defect a red-team pass found four times)
  // A payoff claim has to be checkable, which means the paragraph making it
  // must name the thing it pays into. Scan per-paragraph, not per-160-chars:
  // the id is often the last clause of a long note, and a fixed window made
  // correctly-wired notes look broken.
  const paragraphs = [];
  const collect = (node) => {
    if (typeof node === "string") paragraphs.push(...node.split("\n\n"));
    else if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === "object") Object.values(node).forEach(collect);
  };
  collect(b);
  [...refs].forEach((r) => collect(CHALLENGES[r] ?? {}));
  for (const para of paragraphs) {
    if (!/\bPAYS (?:OFF|BACK|AT|IN)\b/i.test(para)) continue;
    const namesAnId = /`[a-z][a-z0-9-]+`/.test(para);
    const namesAScene = SCENE_TITLE_RX.test(para) || PLACE_RX.test(para);
    if (!namesAnId && !namesAScene)
      add("payoff", `payoff claim names neither an id nor a scene: "${para.slice(0, 110).replace(/\n/g, " ")}..."`);
  }

  // ---- STRATEGY LAYER
  if (!(b.outro?.tracks ?? []).length) add("tracks", "outro.tracks empty -- nothing on the strategy layer moves");
  if (!(b.temptations ?? []).length) add("tracks", "no temptations -- nothing always-visible to reach for");
  if (!(b.reactionPrompts ?? []).length) add("tracks", "no reactionPrompts -- no feedback captured after play");

  return { briefId, title: b.title, findings: f };
}

// ---------------------------------------------------------------- CLI
const args = process.argv.slice(2);
if (args.length) {
  let ids = [];
  if (args[0] === "--episode") {
    const ep = read(path.join(dataRoot, "episodes", `${args[1]}.json`));
    ids = [...ep.scenes].sort((a, b) => a.order - b.order).map((s) => s.briefRef).filter(Boolean);
  } else {
    ids = args;
  }
  let total = 0;
  for (const id of ids) {
    const r = auditScene(id);
    total += r.findings.length;
    const head = `${r.title ?? id} — ${r.findings.length} finding${r.findings.length === 1 ? "" : "s"}`;
    console.log(`\n${head}\n${"-".repeat(head.length)}`);
    const byCat = {};
    for (const f of r.findings) (byCat[f.cat] ??= []).push(f.msg);
    for (const [cat, msgs] of Object.entries(byCat)) for (const m of msgs) console.log(`  [${cat}] ${m}`);
    if (!r.findings.length) console.log("  clean");
  }
  console.log(`\n=== ${total} findings across ${ids.length} scenes ===`);
}
