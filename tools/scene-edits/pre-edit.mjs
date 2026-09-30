#!/usr/bin/env node
/**
 * PreToolUse hook (Edit, Write, MultiEdit): before I change a scene file,
 * make sure I am changing HER latest version of it. design/scene-edits.md §5.
 *
 * Ingram, 2026-09-27: "you'd have a process to make sure you check for any
 * changes on the remote server first... something that works smoothly with
 * your editing process." A conversation can run for hours while she rewrites
 * scenes on the server, so the check at the start of it is not enough on its
 * own. Before an edit to data/scene-briefs/, data/challenges/ or
 * data/episodes/, this pulls her new edits (at most once a minute) and:
 *
 *   - if any of them just landed in the file I am about to edit, stops the
 *     edit and says so -- the file on disk now holds her words, and my edit
 *     was planned against the old ones, so I re-read it first;
 *   - if one of hers is waiting on a clash in that file, stops the edit
 *     until the clash is settled (npm run edits -- resolve);
 *   - otherwise lets the edit through, adding anything new from her to what I
 *     can see.
 *
 * It also refuses outright any hand edit of the ledger or of a harvested
 * record: both have exactly one writer, tools/scene-edits.
 *
 * Everything else passes straight through, cheaply: nothing heavier than
 * reading stdin runs for a file that is not one of these.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// The real repo, unless a test runs this hook against a scratch copy
// (BI_SCENE_EDITS_ROOT -- see edits.mjs#hookTargets).
const repoRoot = process.env.BI_SCENE_EDITS_ROOT || path.resolve(here, "..", "..");
const THROTTLE_MS = 60_000;
const TIMEOUT_MS = 20_000;

const SCENE_FILE = /^data\/(scene-briefs|challenges|episodes)\/([a-z0-9][a-z0-9-]*)\.json$/;
const OWNED_FILE = /^(data\/campaign\/scene-edits\.json|harvest\/scene-edits\/.+|harvest\/foundry-edits\/.+)$/;

/** The decision, in the shape Claude Code reads from a PreToolUse hook. */
function answer({ deny = null, context = null } = {}) {
  if (!deny && !context) return process.exit(0);
  const output = { hookSpecificOutput: { hookEventName: "PreToolUse" } };
  if (deny) {
    output.hookSpecificOutput.permissionDecision = "deny";
    output.hookSpecificOutput.permissionDecisionReason = deny;
  }
  if (context) output.hookSpecificOutput.additionalContext = context;
  process.stdout.write(JSON.stringify(output), () => process.exit(0));
}

/** The repo-relative, forward-slashed path of the file an Edit/Write names, or null. */
export function repoRelative(filePath, root = repoRoot) {
  if (typeof filePath !== "string" || !filePath) return null;
  const relative = path.relative(root, path.resolve(root, filePath));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join("/");
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  let filePath = null;
  try {
    filePath = JSON.parse(input)?.tool_input?.file_path ?? null;
  } catch {
    return answer();
  }
  const relative = repoRelative(filePath);
  if (!relative) return answer();

  if (OWNED_FILE.test(relative)) {
    return answer({
      deny:
        `${relative} has exactly one writer, tools/scene-edits (design/scene-edits.md). ` +
        "Use `npm run edits -- done|resolve|supersede|restore` instead of editing it by hand."
    });
  }

  const match = SCENE_FILE.exec(relative);
  if (!match) return answer();
  const file = `${match[1]}/${match[2]}`;

  const { pulledRecently, recordPull } = await import("./state.mjs");
  if (pulledRecently(THROTTLE_MS)) return answer();

  const { hookTargets, runPull, status } = await import("./edits.mjs");
  const { paths, inbox } = hookTargets();
  let result;
  try {
    result = await Promise.race([
      runPull({ paths, inbox, max: 900 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`the server did not answer in ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS))
    ]);
    recordPull({ ok: !result.lockedOut });
  } catch (err) {
    return answer({
      context:
        `Scene edits: could not check the server for Ingram's edits before this edit of ${relative} (${err?.message ?? err}). ` +
        "If she may be rewriting this scene right now, run `npm run edits` and re-read the file first."
    });
  }

  if (result.touched?.includes(file)) {
    return answer({
      deny:
        `Ingram has edited this on the server, and her changes were just merged into ${relative}. ` +
        "Your edit was planned against the old text: re-read the file, then make it again on top of hers.\n\n" +
        result.report
    });
  }

  const now = status(paths);
  const blocking = now.unsettled.filter((r) => r.record.file === file);
  if (blocking.length) {
    return answer({
      deny:
        `${relative} has ${blocking.length} edit(s) of Ingram's that clash with the repo and are not settled yet ` +
        `(${blocking.map((r) => r.record.id).join(", ")}). Settle them first: \`npm run edits -- resolve <id> --hers\`, ` +
        "or ask her before keeping the repo's version.\n\n" +
        (result.report || now.report)
    });
  }

  return answer({ context: result.fetched?.length || result.reversions?.length ? result.report : null });
}

// Only when run as the hook, never when a test imports repoRelative.
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err) => answer({ context: `Scene edits guard failed (${err?.message ?? err}); the edit was allowed.` }));
}
