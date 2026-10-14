/**
 * A report as Markdown, for reading on GitHub when the review page is not to hand.
 *
 * The JSON is the source; this is generated from it (`qc render`) and never edited. It is written the way the bot is
 * asked to talk to Ingram: a colleague walking her through the scene, giving the full context for each decision next to
 * the decision itself (design/qc-bot.md, "How the bot talks").
 */
import { describeOp, opDiff } from "./patch.mjs";
import { diffToText } from "../../module/blank-inheritance/scripts/core/scene-edits.mjs";

const bullet = (label, text) => (text && String(text).trim() ? `- **${label}** ${String(text).trim()}\n` : "");

export function renderProposal(p, n) {
  let out = `### ${n}. ${p.title}\n\n*${p.kind} · I'm ${p.confidence} on this${p.reopensApproval ? " · accepting it reopens this scene's approval" : ""}${p.touchesMeaning ? " · it changes what happens, not only how it reads" : ""}*\n\n`;
  out += bullet("Right now:", p.now);
  out += bullet("The change:", p.change);
  out += bullet("Why:", p.why);
  out += bullet("What else it touches:", p.touches);
  out += bullet("Risk:", p.risk);
  out += bullet("What I'd do:", p.recommendation);
  out += bullet("Your call:", p.decisionAsk);
  if (p.revisits) out += bullet("This revisits a proposal you declined:", `${p.revisits}. ${p.revisitReason}`);
  if (p.options?.length) {
    out += "\nOptions:\n\n";
    for (const o of p.options) out += `- **${o.label}.** ${o.what}\n`;
  }
  if (p.ops?.length) {
    out += "\nThe exact change (`[-removed-]` and `{+added+}`):\n\n";
    for (const op of p.ops) out += `- ${describeOp(op)}\n  \`${diffToText(opDiff(op)).replace(/`/g, "'")}\`\n`;
  }
  if (p.commit) out += `\nCommit: \`${p.commit}\`\n`;
  return out + "\n";
}

export function renderReport(report) {
  const ov = report.overview ?? {};
  let out = `# QC report: ${report.title}\n\n`;
  out += `*${report.id} · ${report.model} · ${String(report.generatedAt).slice(0, 10)} · scene hash \`${report.sceneHash}\`${report.branch ? ` · branch \`${report.branch}\`` : ""}*\n\n`;
  out += `## How this scene works\n\n`;
  out += bullet("Why the players come:", ov.why) + bullet("What happens:", ov.walkthrough) + bullet("Where it leads:", ov.leadsTo);
  if (ov.doesWell) out += bullet("What it already does well:", ov.doesWell);
  if (ov.burden) out += bullet("What the GM has to carry:", ov.burden);
  const proposals = [...(report.proposals ?? [])].sort((a, b) => a.rank - b.rank);
  out += `\n## What I'd change (${proposals.length})\n\n`;
  out += proposals.length ? proposals.map((p, i) => renderProposal(p, i + 1)).join("") : "Nothing worth your time. I read it as a GM would and I would run it as it is.\n\n";
  const npc = report.npcCheck;
  if (npc?.people?.length || npc?.gaps?.length) {
    out += `## The people in this scene\n\n`;
    if (npc.people?.length) {
      out += "| Person | File | Stat block | Roster | Portrait | Note |\n|---|---|---|---|---|---|\n";
      for (const p of npc.people) out += `| ${p.npcRef} | ${p.file ? "yes" : "NO"} | ${p.statblock ? "yes" : "NO"} | ${p.roster ? "yes" : "NO"} | ${p.portrait ?? "?"} | ${p.notes ?? ""} |\n`;
      out += "\n";
    }
    for (const g of npc.gaps ?? []) out += bullet(`${g.what}:`, g.why);
    out += "\n";
  }
  if (report.chores?.length) {
    out += `## Housekeeping\n\n`;
    for (const c of report.chores) out += `- ${c.done ? "Done" : "Needs doing"}: **${c.title}.** ${c.detail ?? ""}\n`;
    out += "\n";
  }
  if (report.leftAlone?.length) {
    out += `## What I left alone, and why\n\n`;
    for (const l of report.leftAlone) out += bullet(`${l.what}:`, l.why);
    out += "\n";
  }
  if (report.changelog?.length) {
    out += `## If you accept everything\n\n`;
    for (const c of report.changelog) out += `- ${c}\n`;
    out += "\n";
  }
  if (report.checks) out += `*Story check: ${report.checks.before ?? "?"} → ${report.checks.after ?? "?"} errors. Direction lock: ${report.checks.anchorsOk === false ? "BROKEN" : "intact"}.*\n`;
  return out;
}
