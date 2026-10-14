#!/usr/bin/env node
// The re-mark (D070, 2026-10-07): "The only content you should treat as 'ink' is the Episode 1 stuff and the induction
// stuff. Treat everything else as 'Pencil' until I have a chance to go through it."
//
// A fact stays ink when Episode One tells it or relies on it: a canon scene's beat cites it (said aloud or in the GM's
// notes), an objective cites it, it is told from the start or in an Episode One scene, it is the truth behind an ink
// belief, or it is on one of the two short lists below (play material outside the beats, and the induction). Every
// other fact becomes pencil: `by: ingram` when it came from her decided words, `by: claude` when it was Claude's. Open
// questions stay open and move below the "## Pencil" line with the rest of what isn't Episode One.
//
//   node tools/story/remark.mjs          show what would move
//   node tools/story/remark.mjs --write  move it, and list every pencilled fact in D070's Changes
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadModel } from "./lib.mjs";
import { pencil, moveBelowPencil, applyToFile, addChanges } from "./edit.mjs";

export const DECISION = "D070";

/** Episode One's play material outside the beats relies on these (D070, Claude's readings). */
export const EPISODE_ONE_EXTRA = Object.freeze({
  "founders.level": "Shucks's level-15 stat block in Intake Medicals and Assembly is built on it (D047 item 5)",
  "directorate.island-ways-in": "from Ingram's grading of The Road In (D065): how every character gets onto the island",
  "directorate.island-air-and-sea": "from Ingram's grading of The Road In (D065)",
  "directorate.island-security": "from Ingram's grading of The Road In (D065)",
});

/** The induction's own facts: what the backgrounds proposed for it (D066) rest on. Scene 0 tells all of them. */
export const INDUCTION_FACTS = Object.freeze({
  "kurose.locals-and-newcomers": "Directorate Neighbour",
  "directorate.public-view": "Directorate Neighbour",
  "kurose.first-families-stayed": "Old Town Family",
  "directorate.newcomers": "Newcomer's Child",
  "kurose.winners-and-losers": "Left-Behind Family",
  "kurose.old-town": "Harbour Hand",
  "kurose.fishing-village": "Net-Mender",
  "kurose.everyday": "Night-Shift Hand, Tram Brat, Radio Kid",
  "directorate.who-joins": "Streamed from School",
  "kurose.isolationists": "Isolationist's Child",
  "kurose.organised-crime": "Back-Street Runner",
  "directorate.how-trainees-come": "the Review page's question of why a trainee came",
});

/** Which facts are ink by D070's rule, and why each one is. */
export function inkSet(model) {
  const why = new Map();
  const mark = (id, reason) => { if (!why.has(id)) why.set(id, reason); };
  const episodeOne = new Set(model.scenes.map((s) => s.id));
  for (const s of model.scenes) for (const b of s.json.beats || []) {
    for (const id of b.facts || []) mark(id, `told in ${s.id}`);
    for (const id of b.gmFacts || []) mark(id, `relied on in ${s.id}`);
  }
  for (const o of model.objectives || []) for (const id of o.json?.facts || []) mark(id, `cited by objective ${o.id}`);
  for (const e of model.world) for (const f of e.facts) {
    if (f.told === "start") mark(f.id, "told from Scene 0");
    else if (/^in:/.test(f.told || "") && episodeOne.has(f.told.slice(3))) mark(f.id, `told in ${f.told.slice(3)}`);
  }
  for (const [id, reason] of Object.entries(EPISODE_ONE_EXTRA)) mark(id, reason);
  for (const [id, background] of Object.entries(INDUCTION_FACTS)) mark(id, `the induction: ${background}`);
  // What she decides from D070 on is ink: stating it is going through it (D070, Claude's readings).
  const kindOf = new Map(model.decisions.map((d) => [d.id, d.kind || "decision"]));
  for (const e of model.world) for (const f of e.facts) {
    if (f.status === "decided" && f.source.some((s) => /^D\d{3}$/.test(s) && s >= DECISION && kindOf.get(s) !== "import")) mark(f.id, "decided by Ingram from D070 on");
  }
  // The truth behind an ink belief is relied on too.
  const byId = new Map(model.world.flatMap((e) => e.facts.map((f) => [f.id, f])));
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...why.keys()]) {
      const t = byId.get(id)?.truth;
      if (t && !why.has(t)) { why.set(t, `the truth behind ${id}`); grew = true; }
    }
  }
  return why;
}

/** Every fact that is not ink, in file order, with what happens to it. */
export function plan(model) {
  const ink = inkSet(model);
  const moves = [];
  for (const e of model.world) for (const f of e.facts) {
    if (ink.has(f.id)) continue;
    if (f.status === "sketch" || f.status === "cut") continue;
    if (f.status === "open") { if (f.zone !== "pencil") moves.push({ file: `canon/world/${e.id}.md`, id: f.id, from: "open", to: "open", by: null }); continue; }
    const by = f.status === "decided" ? "ingram" : "claude";
    moves.push({ file: `canon/world/${e.id}.md`, id: f.id, from: f.status, to: "sketch", by });
  }
  return { ink, moves };
}

function main() {
  const write = process.argv.includes("--write");
  const model = loadModel();
  // Every canon scene must be Episode One's for this rule to read it as Episode One (true on 2026-10-07).
  const episodeTwo = model.plan.filter((r) => /Episode Two/.test(r.episode || "")).map((r) => r.scene);
  const strays = model.scenes.filter((s) => episodeTwo.includes(s.id));
  if (strays.length) { console.error(`These canon scenes are not Episode One's: ${strays.map((s) => s.id).join(", ")}. The re-mark reads every canon scene as Episode One; stop.`); process.exit(1); }

  const { ink, moves } = plan(model);
  const toPencil = moves.filter((m) => m.to === "sketch");
  const openMoved = moves.filter((m) => m.to === "open");
  console.log(`Ink (Episode One and the induction): ${ink.size} facts. To pencil: ${toPencil.length}. Open questions moved below the Pencil line: ${openMoved.length}.\n`);
  let file = null;
  for (const m of moves) {
    if (m.file !== file) { file = m.file; console.log(file); }
    console.log(`  ${m.id.padEnd(40)} ${m.from === m.to ? "open, stays open" : `${m.from} -> pencil, by ${m.by}`}`);
  }
  if (!write) { console.log("\nDry run. Run again with --write to apply."); return; }

  const byFile = new Map();
  for (const m of moves) { if (!byFile.has(m.file)) byFile.set(m.file, []); byFile.get(m.file).push(m); }
  for (const [rel, list] of byFile) {
    applyToFile(rel, list.map((m) => (raw) => (m.to === "sketch" ? pencil(raw, m.id, { decision: DECISION, by: m.by, world: true }) : moveBelowPencil(raw, m.id))));
  }
  applyToFile(`canon/decisions/${DECISION}.md`, [(raw) => addChanges(raw, toPencil.map((m) => `- pencil \`${m.id}\``))]);
  console.log(`\nWrote ${byFile.size} world files and ${DECISION}'s Changes. Run: node tools/story/story.mjs check`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
