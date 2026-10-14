#!/usr/bin/env node
// The story's line at the start of a conversation (design/plot-timeline.md §6, D070): what Ingram did on the plot
// timeline since last time, her open notes, anything older that came back over her words, what needs attention before
// the table gets there, and whether the claude.ai copy is behind canon. It also tells the pre-edit hook that this
// conversation starts fresh, so it only stops edits over saves made from now on.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadModel, itemIndex } from "./lib.mjs";
import { snapshot } from "./snapshot.mjs";
import { allEdits, notesOf, readNotesState, findTimelineReversions } from "./daybook.mjs";
import { readSaves, readClaudeState, writeClaudeState } from "./timeline-state.mjs";
import { health } from "../../module/blank-inheritance/scripts/core/timeline-health.mjs";
import { readPublished } from "../timeline/export.mjs";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The summary's lines, and the state to write: pure apart from reading canon. */
export function summary(root) {
  const model = loadModel(root);
  const state = readClaudeState(root);
  const saves = readSaves(root);
  const lastSeq = saves.length ? saves[saves.length - 1].seq : 0;
  const lines = [];

  const fresh = saves.filter((s) => s.seq > (state.seen || 0));
  if (fresh.length) {
    const records = [...new Set(fresh.map((s) => s.record))];
    const edits = allEdits(model).filter((e) => records.includes(e.record));
    lines.push(`Plot timeline: Ingram saved ${plural(fresh.length, "time")} since last time (${records.join(", ")}): ${plural(edits.filter((e) => e.op !== "note").length, "change")}. Read her day records: they are how she writes.`);
  }
  const open = notesOf(model, readNotesState(root)).filter((n) => n.state === "open");
  if (open.length) {
    lines.push(`Plot timeline: ${plural(open.length, "note")} from Ingram waiting for an answer (\`node tools/story/story.mjs note\`):`);
    for (const n of open.slice(0, 3)) lines.push(`  ${n.id} on ${n.on}: "${n.text.replace(/\s+/g, " ").slice(0, 140)}"`);
  }
  const reversions = findTimelineReversions(model, itemIndex(model));
  if (reversions.length) lines.push(`Plot timeline: ${plural(reversions.length, "place")} where older words came back over what Ingram set: \`node tools/story/story.mjs restore\`.`);

  const snap = snapshot(model, { root });
  const merges = (snap.merges || []).filter((m) => m.state === "live");
  const toCheck = merges.filter((m) => !m.accepted);
  if (toCheck.length) lines.push(`Plot timeline: ${plural(toCheck.length, "merge")} of Claude's waiting for Ingram to say it looks right, edit it or undo it (\`node tools/story/merge.mjs list\`); ${merges.length - toCheck.length} passed. Never merge a piece she has acted on, and never reword her own words.`);
  const published = readPublished(path.join(root, "tools/timeline/published.json"));
  const { horizon, findings } = health(snap, { publishedHash: published?.canonHash || null });
  const counts = {};
  for (const f of findings) counts[f.check] = (counts[f.check] || 0) + 1;
  const words = Object.entries(counts).filter(([k]) => k !== "stale-copy").map(([k, n]) => `${n} ${k}`);
  if (words.length) lines.push(`Story health up to chapter ${horizon}: ${words.join(", ")} (\`node tools/story/story.mjs health\`).`);
  if (published && published.canonHash !== snap.canonHash) lines.push(`The claude.ai copy of the timeline is behind canon (published ${String(published.publishedAt).slice(0, 10)}): \`npm run timeline -- export\`, then republish it.`);

  return { lines, state: { ...state, since: lastSeq, seen: lastSeq, files: {} } };
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  const root = process.env.BI_STORY_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  try {
    const { lines, state } = summary(root);
    writeClaudeState(root, state);
    console.log(lines.length ? lines.join("\n") : "Plot timeline: nothing new from Ingram.");
  } catch (e) {
    console.log(`Plot timeline: the summary failed (${e.message}).`);
  }
}
