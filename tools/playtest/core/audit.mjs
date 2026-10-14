/**
 * The contamination auditor: after a run, did any seat do something its person could not? Pure. Reads an agent's transcript (Claude
 * Code's JSONL: each line an object whose `message.content` holds `tool_use` blocks) and reports every tool call outside the
 * seat's vocabulary. (design/playtest-process.md, sections 5 and 6, Phase 6.)
 *
 * The rig can enforce only what the harness lets it (narrow tool lists, a command allowlist), so this is the other half: a transcript
 * is checked for a Bash command that is not the `pt` CLI, a Read of anything but the seat's own screenshots, any write, any tool a
 * seat has no reason to hold, and any reach for the orchestrator's door (`/o/`, the token file, the run's `.state`). A seat that did any
 * of these is marked TAINTED in the report: its findings stay, but what it "knew" cannot be trusted as what a person would have known.
 */

const norm = (p) => String(p ?? "").replace(/\\/g, "/").toLowerCase();

/** The tool_use blocks of a transcript (an array of parsed lines, or of the blocks themselves). */
export function toolCalls(entries) {
  const calls = [];
  entries.forEach((entry, index) => {
    const content = entry?.message?.content ?? entry?.content ?? [];
    if (entry?.type === "tool_use") calls.push({ index, name: entry.name, input: entry.input ?? {} });
    if (!Array.isArray(content)) return;
    for (const block of content) if (block?.type === "tool_use") calls.push({ index, name: block.name, input: block.input ?? {} });
  });
  return calls;
}

const ORCHESTRATOR_DOOR = /\/o\/|orch-token|\.state\/|--as\s+ORCH|ORCH:/i;

/**
 * @param {object[]} entries     parsed transcript lines
 * @param {{seat:string, cliPrefix?:string, ownEvidence?:string}} opts
 *   ownEvidence: a path fragment a Read may touch, e.g. "tools/playtest/runs/<run>/seats/P2/evidence"
 */
export function auditTranscript(entries, { seat, cliPrefix = "node tools/playtest/pt.mjs", ownEvidence = `/seats/${seat.toLowerCase()}/evidence`, ownBrief = `/seats/${seat.toLowerCase()}/brief.md` }) {
  const calls = toolCalls(entries);
  const violations = [];
  const notes = [];
  const flag = (call, kind, detail) => violations.push({ index: call.index, tool: call.name, kind, detail: String(detail).slice(0, 240) });
  for (const call of calls) {
    const name = call.name ?? "";
    const input = call.input ?? {};
    const blob = JSON.stringify(input);
    if (ORCHESTRATOR_DOOR.test(blob)) flag(call, "orchestrator-access", blob);
    if (name === "Bash" || name === "PowerShell") {
      const command = String(input.command ?? "").trim();
      if (!command.startsWith(cliPrefix)) flag(call, "not-the-cli", command);
      else if (/[;&|`]|\$\(|>\s*\S|<\s*\S/.test(command.slice(cliPrefix.length))) notes.push({ index: call.index, kind: "chained-shell", detail: command.slice(0, 200) });
      continue;
    }
    if (["Read", "Glob", "Grep"].includes(name)) {
      const target = norm(input.file_path ?? input.path ?? input.pattern ?? "");
      // Its own screenshots, and the brief that is its whole set of instructions (a seat started from the file is told to read it).
      if (!target.includes(norm(ownEvidence)) && !(name === "Read" && target.endsWith(norm(ownBrief)))) flag(call, "outside-read", input.file_path ?? input.path ?? input.pattern);
      continue;
    }
    if (["Write", "Edit", "NotebookEdit", "MultiEdit"].includes(name)) {
      flag(call, "write", input.file_path ?? "");
      continue;
    }
    // The harness's own way for a subagent to hand its final report back is not a way of reaching the game.
    if (name === "SubagentHandback") continue;
    flag(call, "unexpected-tool", name);
  }
  // A long play with no tool calls in its transcript is the wrong file, not a clean seat: never report that as clean.
  return { seat, toolCalls: calls.length, violations, notes, tainted: violations.length > 0, unreadable: calls.length === 0 };
}

/** One line per seat for the report appendix. */
export function summarizeAudits(audits) {
  return audits.map((a) => a.unreadable ? `${a.seat}: UNREADABLE, no tool call found in this transcript (the wrong file? Claude Code keeps a subagent's at ~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl; the task output file can be empty)` : `${a.seat}: ${a.toolCalls} tool call(s), ${a.violations.length ? `TAINTED (${[...new Set(a.violations.map((v) => v.kind))].join(", ")})` : "clean"}${a.notes.length ? `, ${a.notes.length} chained command(s)` : ""}`);
}
