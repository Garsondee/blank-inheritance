/**
 * The QC bot's work queue: which scenes it should look at next, and why the others are left alone.
 *
 * The bot does not choose its own work from a feeling. A script reads the plan, the scenes and Ingram's decisions and
 * says: these scenes are about to be run, in play order; these have never been reviewed; these changed since the last
 * review; these are waiting on you. That keeps the bot on the scenes that matter (Ingram, 2026-10-14: "the bot should
 * focus on the scenes which are about to be run rather than worrying about much later scenes"), keeps it from piling a
 * second report on top of one she has not read, and makes the rule that finished scenes are left alone a line of code
 * rather than a line in a prompt (see "The played label" in design/qc-bot.md: it plugs in here, as one more reason to skip).
 *
 * `reviews/qc/focus.json` says which episodes are in focus, and can be edited by hand to move the focus along.
 */
import { sceneHash, playOrder } from "../story/lib.mjs";
import { FOCUS_FILE, ROOT, readJsonIf, shortName } from "./lib.mjs";
import { listReports, readDecisions, reviewedHashes } from "./decisions.mjs";
import { castWithoutNpc, npcChain, npcGaps } from "./npcs.mjs";

export const DEFAULT_FOCUS = Object.freeze({ episodes: ["Episode One: Mother's Maiden Name"] });

export const readFocus = (root = ROOT) => readJsonIf(root, FOCUS_FILE) ?? DEFAULT_FOCUS;

/** How many routes (skills) the checks a scene's beats use offer. Checks that take any skill are counted apart: they are open by design. */
export function routeStats(model, scene) {
  const refs = [...new Set((scene.json.beats ?? []).map((b) => b.challengeRef).filter(Boolean))];
  const routes = [];
  let open = 0;
  for (const ref of refs) {
    const challenge = model.challenges.find((c) => c.id === ref);
    for (const check of challenge?.json.checks ?? []) {
      if (check.anySkill) open += 1;
      else routes.push((check.skillOptions ?? []).length);
    }
  }
  return {
    closedChecks: routes.length,
    openChecks: open,
    thinChecks: routes.filter((n) => n <= 2).length,
    minRoutes: routes.length ? Math.min(...routes) : null,
  };
}

/** The review status of a scene, from its reports and decisions. */
export function reviewStatus({ sceneId, hash, reports, decisions, reviewed }) {
  const mine = reports.filter((r) => r.report.scene === sceneId);
  if (!mine.length) return "never-reviewed";
  const latest = mine.at(-1).report;
  // Anything she has not decided, or has asked to talk about, means the scene is hers to move, not the bot's.
  const open = (latest.proposals ?? []).filter((p) => (p.kind !== "note" && !decisions.has(p.id)) || decisions.get(p.id)?.decision === "discuss");
  if (open.length) return "waiting-on-ingram";
  if (!reviewed.has(hash)) return "changed-since-review";
  const lastTwo = mine.slice(-2);
  const quiet = lastTwo.length === 2 && lastTwo.every(({ report }) => !(report.proposals ?? []).some((p) => decisions.get(p.id)?.decision === "accept"));
  return quiet ? "stable" : "reviewed";
}

/**
 * @param {object} model  from tools/story/lib.mjs#loadModel
 * @param {{ root?: string, focus?: {episodes: string[]}, includeAll?: boolean }} opts
 */
export function buildQueue(model, { root = ROOT, focus = readFocus(root), includeAll = false } = {}) {
  const { order } = playOrder(model);
  const reports = listReports(root);
  const decisions = readDecisions(root);
  const rows = new Map();
  for (const r of model.plan) if (!rows.has(r.scene)) rows.set(r.scene, r);

  const scenes = [];
  for (const s of model.scenes) {
    const row = rows.get(s.id) ?? null;
    const inFocus = !!row && focus.episodes.includes(row.episode);
    let skip = null;
    if (!row) skip = "not in the plan";
    else if (!inFocus) skip = `outside focus (${row.episode})`;
    else if (!["awaiting-read", "approved"].includes(row.state)) skip = `plan says ${row.state}`;
    const hash = sceneHash(model, s.id);
    const reviewed = reviewedHashes(root, s.id, reports, decisions);
    const status = reviewStatus({ sceneId: s.id, hash, reports, decisions, reviewed });
    const chain = npcChain(root, s.json);
    scenes.push({
      order: order.get(s.id) ?? 9999,
      id: s.id,
      short: shortName(s.id),
      title: s.json.title ?? s.id,
      planState: row?.state ?? null,
      day: row?.dayRaw ?? null,
      time: row?.time ?? null,
      episode: row?.episode ?? null,
      lane: skip ? "skip" : row.state === "approved" ? "review-approved" : "review",
      skip,
      status,
      eligible: !skip && (status === "never-reviewed" || status === "changed-since-review"),
      hash,
      routes: routeStats(model, s),
      cast: (s.json.cast ?? []).length,
      castWithoutNpc: castWithoutNpc(s.json),
      npcGaps: npcGaps(chain).map((p) => p.id),
      noPortrait: chain.filter((p) => !p.portrait && !p.existing).map((p) => p.id),
    });
  }
  scenes.sort((a, b) => a.order - b.order);

  const unwritten = model.plan
    .filter((r) => focus.episodes.includes(r.episode) && !model.scenes.some((s) => s.id === r.scene))
    .map((r) => ({ order: r.order, id: r.scene, title: r.title, planState: r.state }));

  const visible = includeAll ? scenes : scenes.filter((s) => !s.skip);
  return { focus, scenes: visible, skipped: scenes.filter((s) => s.skip).length, unwritten, next: visible.filter((s) => s.eligible).map((s) => s.id) };
}

export function printQueue(queue, { limit } = {}) {
  const lines = [];
  lines.push(`Focus: ${queue.focus.episodes.join("; ")}`);
  lines.push("");
  lines.push("  #   scene                          plan           status                 routes (thin/closed)  cast  gaps");
  for (const s of queue.scenes) {
    const mark = s.eligible ? "→" : " ";
    const thin = s.routes.closedChecks ? `${s.routes.thinChecks}/${s.routes.closedChecks}` : "-";
    const gaps = [s.npcGaps.length ? `${s.npcGaps.length} npc` : "", s.castWithoutNpc.length ? `${s.castWithoutNpc.length} uncast` : ""].filter(Boolean).join(", ") || "-";
    lines.push(`${mark} ${String(s.order).padStart(3)}  ${s.short.padEnd(30)} ${String(s.planState).padEnd(14)} ${s.status.padEnd(21)} ${thin.padEnd(21)} ${String(s.cast).padStart(4)}  ${gaps}`);
  }
  const eligible = queue.next.length;
  const waiting = queue.scenes.filter((s) => s.status === "waiting-on-ingram").length;
  lines.push("");
  lines.push(`${eligible} scene(s) for the bot now${limit ? ` (taking ${Math.min(limit, eligible)})` : ""}; ${waiting} waiting on Ingram; ${queue.skipped} outside the focus or not reviewable.`);
  if (queue.unwritten.length) lines.push(`Planned but not written yet (not for the bot to write): ${queue.unwritten.map((u) => u.id.replace(/^episode-c\d+e\d+--/, "")).join(", ")}`);
  return lines.join("\n");
}
