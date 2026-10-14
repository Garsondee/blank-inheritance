/**
 * pt audit --transcript <file.jsonl> --seat P2 [--run name]
 *
 * The contamination audit (core/audit.mjs) over one agent's transcript: did it touch anything its person could not? A seat that did is
 * TAINTED in the report. The transcript is Claude Code's own JSONL for that agent.
 */

import { readFileSync } from "node:fs";

import { parseArgs } from "../core/args.mjs";
import { auditTranscript, summarizeAudits } from "../core/audit.mjs";

export async function run(argv) {
  const { flags } = parseArgs(argv, { valued: ["transcript", "seat", "run"] });
  if (typeof flags.transcript !== "string" || typeof flags.seat !== "string") {
    console.log("usage: pt audit --transcript <file.jsonl> --seat P2 [--run name]");
    return 2;
  }
  const entries = readFileSync(flags.transcript, "utf8").split("\n").filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
  const audit = auditTranscript(entries, { seat: flags.seat, ...(typeof flags.run === "string" ? { ownEvidence: `runs/${flags.run}/seats/${flags.seat}/evidence` } : {}) });
  console.log(summarizeAudits([audit]).join("\n"));
  for (const v of audit.violations.slice(0, 20)) console.log(`  ${v.kind}: ${v.tool} ${v.detail}`);
  return audit.tainted || audit.unreadable ? 1 : 0;
}
