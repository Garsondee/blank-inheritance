#!/usr/bin/env node
/**
 * PreToolUse hook (Edit, Write, MultiEdit) for the story's one store: canon/README.md's filing rules, enforced where
 * Claude writes (design/plot-timeline.md §2 and §5, D070).
 *
 *   - canon/: if Ingram changed this file on the timeline page since this conversation was told, the edit stops once:
 *     the file now holds her words and the edit was planned against the old ones, so re-read it first.
 *   - her timeline day records (canon/decisions, kind: timeline) and harvest/timeline/notes.json have one writer each
 *     (the timeline page, `story note`): never edited by hand.
 *   - a merge record (canon/decisions, kind: merge) holds each original it replaced and every line it rewrote: machine
 *     data, written only by tools/story/merge.mjs (check, apply, undo) and the timeline page's Undo, never by hand.
 *   - quarantine/ is read-only, and no new story file starts under ideas/story/ (filing rule 2: one home).
 *   - a write outside canon (design documents, idea entries, NPC/location/episode files, CLAUDE.md, memory) that names
 *     a canon person, place or thing gets a reminder that story belongs in canon, cited by id (never a refusal).
 *
 * Everything else passes straight through: nothing heavier than reading stdin runs for any other file.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// The real repo, unless a test runs this hook against a scratch copy.
const repoRoot = process.env.BI_STORY_ROOT || path.resolve(here, "..", "..");

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

// Places outside canon where story has always crept in (filing rule 2: "Nowhere else"). A write there that names a canon
// person, place or thing gets a reminder, never a refusal: most such writes are mechanics, tooling or a pointer.
const STORY_PRONE = /^(design\/.+\.md|ideas\/entries\/.+\.json|data\/(npcs|locations|episodes|antagonists)\/.+\.json|CLAUDE\.md|ROADMAP\.md)$/;
const MEMORY_FILE = /[\\/]\.claude[\\/]projects[\\/][^\\/]+[\\/]memory[\\/][^\\/]+\.md$/i;
const GENERIC = new Set(["party", "era", "frames", "visual-language", "glamour", "prophecy"]);

/** The names canon's world files go by: each file's "# Title" (without a leading "The"), for the reminder. */
export function canonNames(root = repoRoot) {
  const dir = path.join(root, "canon", "world");
  if (!fs.existsSync(dir)) return [];
  const names = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const id = f.replace(/\.md$/, "");
    if (GENERIC.has(id)) continue;
    const title = (fs.readFileSync(path.join(dir, f), "utf8").match(/^# (.+)$/m) || [])[1];
    const name = (title || "").replace(/^The /, "").trim();
    if (name.length >= 4) names.add(name);
  }
  return [...names];
}

/** Which canon names a piece of text mentions (whole words, as written). */
export function namesIn(text, names) {
  const t = String(text || "");
  return names.filter((n) => new RegExp(`(^|[^A-Za-z])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^A-Za-z])`).test(t));
}

/** A reminder for a write outside canon that names canon's people, places or things; null otherwise. */
export function strayLore({ relative, absolute, text }, root = repoRoot) {
  const memory = MEMORY_FILE.test(absolute || "");
  if (!memory && !(relative && STORY_PRONE.test(relative))) return null;
  const hits = namesIn(text, canonNames(root));
  if (!hits.length) return null;
  const where = memory ? "a memory file" : relative;
  return {
    context: `Story guard: this write to ${where} names ${hits.slice(0, 6).join(", ")}. ${memory ? "Memory never holds story facts: point at a canon id instead." : "It is outside canon/."} If it states anything about the story (a fact, a plan, an idea, a lore answer), that belongs in canon/ (canon/README.md, the filing rules; /lore files it): put it there and cite its id here. Mechanics, tooling, process and pointers to canon ids are fine.`,
  };
}

/** What the hook says about one file: { deny } or null. Pure apart from reading the file and the saves log. */
export async function judge(relative, root = repoRoot) {
  if (!relative) return null;
  if (relative.startsWith("quarantine/")) {
    return { deny: `${relative} is in quarantine/, which is read-only: search the old material for ideas, never edit it. A story fact belongs in canon/ (canon/README.md, the filing rules).` };
  }
  if (relative.startsWith("ideas/story/") && !fs.existsSync(path.join(root, relative))) {
    return { deny: `No new story files under ideas/story/ (canon/README.md, filing rule 2: one home). File it in canon/: a fact in canon/world/, a plan in canon/plan/, an idea or brainstorm in canon/ideas/. Run /lore for the routine.` };
  }
  if (relative === "harvest/timeline/notes.json") {
    return { deny: "harvest/timeline/notes.json has one writer, `node tools/story/story.mjs note <Nn> --reply \"...\" [--done]`." };
  }
  if (!relative.startsWith("canon/")) return null;
  const abs = path.join(root, relative);
  if (/^canon\/decisions\/D\d{3}\.md$/.test(relative) && fs.existsSync(abs)) {
    const { isDayRecord } = await import("./daybook.mjs");
    const text = fs.readFileSync(abs, "utf8");
    if (isDayRecord(text)) {
      return { deny: `${relative} is one of Ingram's timeline day records: her edits, quoted as she set them, written only by the timeline page. Answer a note with \`story note\`; record anything else in a new decision.` };
    }
    const { isMergeRecord } = await import("./merges.mjs");
    if (isMergeRecord(text)) {
      return { deny: `${relative} is one of Claude's merge records: it keeps every original piece and every line the merge rewrote, so the merge can be undone exactly. Only \`node tools/story/merge.mjs\` (check, apply, undo) and the timeline page's Undo change it; record anything else in a new decision.` };
    }
  }
  const { readClaudeState, writeClaudeState, unseenSavesOf } = await import("./timeline-state.mjs");
  const state = readClaudeState(root);
  const unseen = unseenSavesOf(root, relative, state);
  if (!unseen.length) return null;
  state.files = { ...(state.files || {}), [relative]: Math.max(...unseen.map((s) => s.seq)) };
  writeClaudeState(root, state);
  const when = unseen.map((s) => `${s.record} at ${new Date(s.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`).join(", ");
  return {
    deny: `Ingram changed ${relative} on the plot timeline (${when}) since this conversation was told. Your edit was planned against the old text: re-read the file, then make it again on top of hers. Her day record quotes what she changed.`,
  };
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  let toolInput = null;
  try { toolInput = JSON.parse(input)?.tool_input ?? null; } catch { return answer(); }
  const filePath = toolInput?.file_path ?? null;
  const relative = repoRelative(filePath);
  const verdict = await judge(relative);
  if (verdict?.deny) return answer(verdict);
  const text = [toolInput?.content, toolInput?.new_string, ...(toolInput?.edits || []).map((e) => e?.new_string)].filter(Boolean).join("\n");
  const nudge = strayLore({ relative, absolute: typeof filePath === "string" ? path.resolve(filePath) : null, text });
  return answer(nudge || verdict || {});
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err) => answer({ context: `The story guard failed (${err?.message ?? err}); the edit was allowed.` }));
}
