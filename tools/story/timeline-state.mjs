// What this checkout's Claude has seen of Ingram's saves on the plot timeline (design/plot-timeline.md §5 and §6).
//
// The timeline server logs each save it makes (tools/timeline/ops.mjs → tools/timeline/.state/saves.jsonl: which day
// record, which files). The pre-edit hook (tools/story/pre-edit.mjs) reads it so Claude never edits a canon file over
// words she has just changed there without re-reading it first, and the session-start summary
// (tools/story/session-start.mjs) reads it to say what she did since last time. Both are local and gitignored: they
// are about this checkout, not the campaign. Kept free of lib.mjs, so the hook stays cheap on every edit.
import fs from "node:fs";
import path from "node:path";

export const SAVES_LOG = "tools/timeline/.state/saves.jsonl";
export const CLAUDE_STATE = "tools/timeline/.state/claude.json";

/** Every save the timeline has made, oldest first: { seq, at, record, files }. */
export function readSaves(root) {
  try {
    return fs.readFileSync(path.join(root, SAVES_LOG), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}

/** { since: the last save this conversation started after, files: { [file]: the last save announced for it } } */
export function readClaudeState(root) {
  try { return { since: 0, files: {}, ...JSON.parse(fs.readFileSync(path.join(root, CLAUDE_STATE), "utf8")) }; } catch { return { since: 0, files: {} }; }
}

export function writeClaudeState(root, state) {
  try {
    const file = path.join(root, CLAUDE_STATE);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`);
  } catch { /* a lost state file costs one extra re-read at most */ }
}

/** Her saves touching `file` that this conversation hasn't been told about. */
export function unseenSavesOf(root, file, state = readClaudeState(root)) {
  const since = Math.max(state.since || 0, state.files?.[file] || 0);
  return readSaves(root).filter((s) => s.seq > since && (s.files || []).includes(file));
}
