/**
 * The review page: every report, each proposal with Accept / Decline / Discuss and a box for why.
 *
 * Built from the reports and decisions in reviews/qc/ into one HTML file (tools/qc-bot/page/template.html), published
 * as a private Artifact with the shared-store capability, so a decision is saved the moment it is pressed and Claude
 * can read it back (design/qc-bot.md, "The inbox"). Opened without the store (a file, or a view that cannot reach it),
 * the page keeps decisions in the browser and offers Copy decisions, so it is never a dead end.
 *
 * The page is data plus one template. All the word-level diffs are computed here, in Node, so the page carries no
 * diff code of its own and the text it shows is exactly the text the patch contains.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./lib.mjs";
import { listReports, readDecisions } from "./decisions.mjs";
import { describeOp, opDiff } from "./patch.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER = "/*__DATA__*/null";

/** The data the page shows, newest report first. */
export function pageData({ root = ROOT, now = new Date().toISOString() } = {}) {
  const decisions = readDecisions(root);
  const reports = listReports(root)
    .map(({ file, report }) => ({
      file,
      id: report.id,
      scene: report.scene,
      title: report.title,
      generatedAt: report.generatedAt,
      model: String(report.model ?? "").split(" (")[0],
      planState: report.planState ?? null,
      lane: report.lane ?? null,
      branch: report.branch ?? null,
      overview: report.overview ?? {},
      npcCheck: report.npcCheck ?? null,
      chores: report.chores ?? [],
      leftAlone: report.leftAlone ?? [],
      changelog: report.changelog ?? [],
      proposals: [...(report.proposals ?? [])]
        .sort((a, b) => a.rank - b.rank)
        .map((p) => {
          const d = decisions.get(p.id);
          return {
            id: p.id,
            reportId: report.id,
            scene: report.scene,
            kind: p.kind,
            title: p.title,
            rank: p.rank,
            confidence: p.confidence,
            now: p.now ?? "",
            change: p.change ?? "",
            why: p.why ?? "",
            touches: p.touches ?? "",
            risk: p.risk ?? "",
            recommendation: p.recommendation ?? "",
            decisionAsk: p.decisionAsk ?? "",
            options: p.options ?? [],
            reopensApproval: !!p.reopensApproval,
            touchesMeaning: !!p.touchesMeaning,
            revisits: p.revisits ?? null,
            revisitReason: p.revisitReason ?? null,
            commit: p.commit ?? null,
            ops: (p.ops ?? []).map((op) => ({ where: describeOp(op), segments: opDiff(op) })),
            decision: d ? { decision: d.decision, note: d.note ?? "", choice: d.choice ?? null, decidedAt: d.decidedAt, reportId: report.id, scene: report.scene } : null,
          };
        }),
    }))
    .reverse();
  return { generatedAt: now, reports };
}

/**
 * Data goes into a script element as JSON, so anything that could end the element or confuse the parser is escaped.
 * The escapes are built from a backslash and digits rather than written out, so no tool in the chain rewrites them.
 */
export function embedJson(value) {
  const slash = String.fromCharCode(92);
  const u = (code) => `${slash}u${code.toString(16).padStart(4, "0")}`;
  return JSON.stringify(value)
    .replace(/</g, u(0x3c))
    .replace(/>/g, u(0x3e))
    .replace(/&/g, u(0x26))
    .replace(new RegExp(`[${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, "g"), (c) => u(c.charCodeAt(0)));
}

export function buildPage({ root = ROOT, now } = {}) {
  const template = fs.readFileSync(path.join(here, "page", "template.html"), "utf8");
  if (!template.includes(PLACEHOLDER)) throw new Error("The page template lost its data placeholder");
  return template.replace(PLACEHOLDER, () => embedJson(pageData({ root, now })));
}
