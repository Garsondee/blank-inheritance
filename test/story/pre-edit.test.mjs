// The story's pre-edit hook and session-start line (tools/story/pre-edit.mjs, tools/story/session-start.mjs;
// design/plot-timeline.md §2, §5 and §6, D070). The hook runs as Claude Code runs it, as a subprocess reading the tool
// call on stdin, against a scratch canon: quarantine/ is read-only, no new story file starts under ideas/story/, her
// day records and the notes file have one writer each, and a canon file she changed on the timeline stops an edit
// once, until it is re-read.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { ROOT } from "../../tools/story/lib.mjs";
import { applyOps } from "../../tools/timeline/ops.mjs";
import { summary } from "../../tools/story/session-start.mjs";
import { writeClaudeState } from "../../tools/story/timeline-state.mjs";

const HOOK = path.join(ROOT, "tools/story/pre-edit.mjs");

function scratch() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "story-hook-"));
  const put = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  put("canon/decisions/D001.md", "# D001 · 2026-10-01 · The start\n\n## Ingram\n\n> \"Yes.\"\n");
  put("canon/world/a.md", "# A\nkind: thing\n\n## a.one\nOne.\nstatus: sketch · by: claude · source: D001 · known: nobody · told: later\n");
  put("ideas/story/old.md", "# Old\n");
  return root;
}

function hook(root, file) {
  const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: path.join(root, file) } }), env: { ...process.env, BI_STORY_ROOT: root }, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : null;
}
const denied = (out) => out?.permissionDecision === "deny";

test("quarantine is read-only, and no new story file starts under ideas/story/", () => {
  const root = scratch();
  try {
    assert.ok(denied(hook(root, "quarantine/ideas/story/v4.md")));
    assert.ok(denied(hook(root, "ideas/story/a-new-dossier.md")));
    assert.equal(hook(root, "ideas/story/old.md"), null, "an old file may still be edited (a status banner, say)");
    assert.equal(hook(root, "design/plot-timeline.md"), null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("her day records and the notes file are never edited by hand", () => {
  const root = scratch();
  try {
    const out = applyOps(root, [{ op: "note", id: "a.one", text: "Look at this." }], { now: new Date(2026, 9, 9) });
    assert.equal(out.ok, true, out.error);
    assert.ok(denied(hook(root, `canon/decisions/${out.record}.md`)));
    assert.ok(denied(hook(root, "harvest/timeline/notes.json")));
    writeClaudeState(root, { since: 99, files: {} });
    assert.equal(hook(root, "canon/decisions/D001.md"), null, "an ordinary decision record is not hers to guard this way");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a canon file she changed on the timeline stops an edit once; after that, and for old saves, it passes", () => {
  const root = scratch();
  try {
    assert.equal(hook(root, "canon/world/a.md"), null);
    const out = applyOps(root, [{ op: "text", id: "a.one", before: "One.", value: "Her one." }], { now: new Date(2026, 9, 9) });
    assert.equal(out.ok, true, out.error);
    const first = hook(root, "canon/world/a.md");
    assert.ok(denied(first));
    assert.match(first.permissionDecisionReason, /re-read the file/);
    assert.equal(hook(root, "canon/world/a.md"), null, "told once: the retry, after a re-read, goes through");
    // A new conversation starts after her saves: it has read nothing yet, so nothing is stopped.
    applyOps(root, [{ op: "text", id: "a.one", before: "Her one.", value: "Her one, again." }], { now: new Date(2026, 9, 9) });
    const s = summary(root);
    writeClaudeState(root, s.state);
    assert.equal(hook(root, "canon/world/a.md"), null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the session-start line says what she did since last time and which notes wait for an answer", () => {
  const root = scratch();
  try {
    assert.ok(!summary(root).lines.some((l) => /Ingram saved/.test(l)));
    applyOps(root, [{ op: "text", id: "a.one", before: "One.", value: "Two." }, { op: "note", id: "a.one", text: "Is this right?" }], { now: new Date(2026, 9, 9) });
    const s = summary(root);
    assert.ok(s.lines.some((l) => /Ingram saved 1 time since last time \(D002\): 1 change/.test(l)), s.lines.join("\n"));
    assert.ok(s.lines.some((l) => /N1 on a\.one: "Is this right\?"/.test(l)), s.lines.join("\n"));
    writeClaudeState(root, s.state);
    assert.ok(!summary(root).lines.some((l) => /Ingram saved/.test(l)), "said once");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

function hookWith(root, file, content) {
  const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: file, content } }), env: { ...process.env, BI_STORY_ROOT: root }, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : null;
}

test("a write outside canon that names a canon person, place or thing is reminded where story belongs; never refused", () => {
  const root = scratch();
  try {
    fs.mkdirSync(path.join(root, "canon/world"), { recursive: true });
    fs.writeFileSync(path.join(root, "canon/world/manako.md"), "# Manako\nkind: person\n");
    fs.writeFileSync(path.join(root, "canon/world/watcher.md"), "# The Watcher\nkind: thing\n");
    const design = hookWith(root, path.join(root, "design/new-idea.md"), "Manako secretly funds the Watcher's cult.");
    assert.equal(design.permissionDecision, undefined, "a reminder, not a refusal");
    assert.match(design.additionalContext, /names Manako, Watcher/);
    assert.match(design.additionalContext, /belongs in canon/);
    const memory = hookWith(root, "C:/Users/someone/.claude/projects/x/memory/note.md", "Manako was a chemist.");
    assert.match(memory.additionalContext, /Memory never holds story facts/);
    assert.equal(hookWith(root, path.join(root, "design/new-idea.md"), "A note about test timing."), null, "no names, no reminder");
    assert.equal(hookWith(root, path.join(root, "tools/x.mjs"), "// Manako"), null, "code is not where story creeps in");
    assert.equal(hookWith(root, path.join(root, "canon/world/manako.md"), "Manako"), null, "canon itself is the right place");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("both hooks are wired in .claude/settings.json", () => {
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude/settings.json"), "utf8"));
  const commands = (event) => settings.hooks[event].flatMap((h) => h.hooks.map((x) => x.command));
  assert.ok(commands("SessionStart").includes("node tools/story/session-start.mjs"));
  assert.ok(commands("PreToolUse").includes("node tools/story/pre-edit.mjs"));
  assert.ok(settings.hooks.PreToolUse.some((h) => /Edit\|Write\|MultiEdit/.test(h.matcher) && h.hooks.some((x) => x.command === "node tools/story/pre-edit.mjs")));
});

test("Claude's merge records hold the originals and the rewritten lines, so only the merge tool and the page's Undo change them", () => {
  const root = scratch();
  try {
    fs.writeFileSync(path.join(root, "canon/decisions/D002.md"), "# D002 · 2026-10-07 · A merge\nkind: merge\n\n## Merges\n\n## Changes\n");
    const out = hook(root, "canon/decisions/D002.md");
    assert.ok(denied(out));
    assert.match(out.permissionDecisionReason, /merge\.mjs/);
    assert.equal(hook(root, "canon/decisions/D001.md"), null, "an ordinary decision is not locked");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
