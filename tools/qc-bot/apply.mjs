/**
 * Apply a report's patches to the repo. Two uses, one engine:
 *
 *  - THE BOT, on its own branch: `qc apply <report> --all --commit-each`. Each proposal's patch is applied, the canon
 *    build and the story check are run, and a proposal that makes the check worse is rolled back and reported. Each
 *    one that stays is one commit, named for its proposal, so the branch reads as a list of separate changes.
 *  - ME, with Ingram, after she has decided: `qc apply <report> --accepted --reread`. Only the proposals she accepted
 *    are applied, against the files as they are NOW (her Scene Runner edits have come home first), so a line she has
 *    changed since the bot looked is reported as a clash instead of being overwritten. Nothing is committed; the
 *    changes are left for review and for the tests, and a "Revision" entry is added to the scene's re-read record.
 *
 * A patch that does not apply cleanly is never forced. That is the whole safety of working on a copy of the repo.
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { ROOT, WRITE_RULES, fullPath, readJson, shortName, writeJson } from "./lib.mjs";
import { applyOps } from "./patch.mjs";
import { PATCH_KINDS } from "./proposals.mjs";
import { markApplied, readDecisions } from "./decisions.mjs";

const run = (root, cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** `node tools/story/story.mjs check`, reduced to its two numbers. */
export function storyCheck(root = ROOT) {
  const r = run(root, process.execPath, ["tools/story/story.mjs", "check"]);
  const m = /(\d+) error\(s\), (\d+) note\(s\)/.exec(r.stdout ?? "");
  return { errors: m ? Number(m[1]) : Infinity, notes: m ? Number(m[2]) : null, output: r.stdout ?? "" };
}

function storyBuild(root) {
  const r = run(root, process.execPath, ["tools/story/story.mjs", "build"]);
  if (r.status !== 0) throw new Error(`story build failed: ${(r.stderr || r.stdout || "").slice(0, 400)}`);
}

function npcGenerator(root) {
  const r = run(root, process.execPath, ["tools/npc-generator/apply.mjs"]);
  if (r.status !== 0) throw new Error(`the NPC generator failed: ${(r.stderr || r.stdout || "").slice(0, 400)}`);
}

const git = (root, args) => run(root, "git", args);

function currentBranch(root) {
  return git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
}

/** Paths git sees as changed or new, limited to what the bot may write (reports are committed separately). */
function changedWritable(root) {
  const out = git(root, ["status", "--porcelain", "--untracked-files=all"]).stdout.split("\n").filter(Boolean);
  return out
    .map((l) => l.slice(3).replace(/^"|"$/g, ""))
    .filter((f) => !f.startsWith("reviews/qc/reports/") && WRITE_RULES.some((r) => r.pattern.test(f)));
}

function commit(root, message) {
  const files = changedWritable(root);
  if (!files.length) return null;
  git(root, ["add", "--", ...files]);
  const r = git(root, ["-c", "user.name=QC Bot", "-c", "user.email=qc-bot@users.noreply.github.com", "commit", "-m", message]);
  if (r.status !== 0) throw new Error(`git commit failed: ${(r.stderr || r.stdout || "").slice(0, 300)}`);
  return git(root, ["rev-parse", "HEAD"]).stdout.trim();
}

const rereadVersion = (root) => /version (\d+)/.exec(fs.readFileSync(fullPath(root, "canon/reread.md"), "utf8"))?.[1] ?? "?";

/** The "Revision" entry added to a scene's re-read record when accepted proposals are merged. */
export function rereadRevision({ report, applied, declined = [], discussing = [], date, version, notes = new Map() }) {
  const lines = [];
  lines.push("", `## Revision ${date}: changes from the QC bot's review (${report.id})`, "");
  lines.push(`Re-read against \`canon/reread.md\` version ${version} · proposed by the QC bot, accepted by Ingram, merged by Claude · state: awaiting Ingram's read`, "");
  for (const p of applied) {
    const note = notes.get(p.id);
    lines.push(`- **${p.title}.** ${p.change.trim()}${note ? ` Ingram: "${note}"` : ""}`);
  }
  if (declined.length) lines.push(`- Declined (the bot will not raise these again): ${declined.map((p) => p.title).join("; ")}.`);
  if (discussing.length) lines.push(`- Still to discuss: ${discussing.map((p) => p.title).join("; ")}.`);
  return lines.join("\n") + "\n";
}

/**
 * @param {object} o
 * @param {string} o.root
 * @param {object} o.report  the parsed report
 * @param {string} [o.reportFile]  its repo path, where the result is written back in bot mode
 * @param {string[]|null} [o.ids]  apply these proposals
 * @param {boolean} [o.all]  or all of them
 * @param {boolean} [o.dryRun]
 * @param {boolean} [o.commitEach]  bot mode: one commit per proposal; refuses to run off a qc/ branch
 * @param {boolean} [o.build]  run story build after each proposal
 * @param {boolean} [o.check]  run story check and roll back a proposal that adds an error
 * @param {boolean} [o.reread]  append the Revision entry to the scene's re-read record (merge mode only)
 * @param {(sceneId:string)=>string|null} [o.hashOf]
 */
export function applyReport({ root = ROOT, report, reportFile = null, ids = null, all = false, dryRun = false, commitEach = false, build = true, check = true, reread = false, hashOf = null, today = new Date().toISOString().slice(0, 10) }) {
  const chosen = (report.proposals ?? []).filter((p) => PATCH_KINDS.has(p.kind) && (all || ids?.includes(p.id))).sort((a, b) => a.rank - b.rank);
  const unknown = (ids ?? []).filter((id) => !(report.proposals ?? []).some((p) => p.id === id));
  const outcome = { applied: [], failed: [], unknown, dryRun, storyCheck: null, hashAfter: null };
  if (commitEach && !dryRun) {
    const branch = currentBranch(root);
    if (!branch.startsWith("qc/")) throw new Error(`Refusing to commit on ${JSON.stringify(branch)}: the bot works on a branch called qc/<something>`);
  }

  const baseline = check && !dryRun ? storyCheck(root) : null;
  for (const p of chosen) {
    const files = [...new Set(p.ops.map((o) => o.file))];
    const docs = Object.fromEntries(files.map((f) => [f, fs.existsSync(fullPath(root, f)) ? readJson(root, f) : undefined]));
    const res = applyOps(docs, p.ops);
    if (!res.ok) {
      outcome.failed.push({ id: p.id, why: "patch", results: res.results.filter((r) => r.status !== "merged" && r.status !== "already") });
      continue;
    }
    if (dryRun) {
      outcome.applied.push({ id: p.id, title: p.title, files: Object.keys(res.docs).filter((f) => stableDiffers(docs[f], res.docs[f])) });
      continue;
    }
    const backups = new Map(files.map((f) => [f, fs.existsSync(fullPath(root, f)) ? fs.readFileSync(fullPath(root, f), "utf8") : null]));
    for (const f of Object.keys(res.docs)) if (stableDiffers(docs[f], res.docs[f])) writeJson(root, f, res.docs[f]);
    try {
      if (build) storyBuild(root);
      if (touchesNpcs(files)) npcGenerator(root);
      if (check) {
        const after = storyCheck(root);
        if (after.errors > baseline.errors) throw new Error(`the story check went from ${baseline.errors} to ${after.errors} error(s):\n${after.output.split("\n").filter((l) => l.startsWith("ERROR")).slice(0, 4).join("\n")}`);
      }
    } catch (e) {
      for (const [f, text] of backups) {
        if (text === null) fs.rmSync(fullPath(root, f), { force: true });
        else fs.writeFileSync(fullPath(root, f), text);
      }
      try {
        if (build) storyBuild(root);
      } catch {
        /* the originals are back; a build failure now would be about something else */
      }
      outcome.failed.push({ id: p.id, why: "check", message: e.message });
      continue;
    }
    const sha = commitEach ? commit(root, `qc(${shortName(report.scene)}): ${p.title} [${p.id}]\n\n${p.why.trim()}\n\nProposed by the QC bot in ${report.id}. Nothing here is merged until Ingram accepts it.`) : null;
    outcome.applied.push({ id: p.id, title: p.title, commit: sha });
    if (sha) p.commit = sha;
  }

  if (!dryRun) {
    if (check) outcome.storyCheck = { before: baseline.errors, after: storyCheck(root).errors };
    if (hashOf) outcome.hashAfter = hashOf(report.scene);
    if (commitEach && reportFile) {
      report.result = { appliedAt: new Date().toISOString(), hashAfter: outcome.hashAfter, applied: outcome.applied.map((a) => a.id), failed: outcome.failed.map((f) => ({ id: f.id, why: f.why })) };
      writeJson(root, reportFile, report);
    }
    if (!commitEach) {
      for (const a of outcome.applied) {
        try {
          markApplied(root, a.id, { hashAfter: outcome.hashAfter });
        } catch {
          /* applied without a recorded decision (a dry experiment): nothing to stamp */
        }
      }
      if (reread && outcome.applied.length) {
        const decisions = readDecisions(root);
        const byId = new Map((report.proposals ?? []).map((p) => [p.id, p]));
        const entry = rereadRevision({
          report,
          applied: outcome.applied.map((a) => byId.get(a.id)),
          declined: (report.proposals ?? []).filter((p) => decisions.get(p.id)?.decision === "decline"),
          discussing: (report.proposals ?? []).filter((p) => decisions.get(p.id)?.decision === "discuss"),
          date: today,
          version: rereadVersion(root),
          notes: new Map([...decisions].filter(([, d]) => d.note).map(([id, d]) => [id, d.note])),
        });
        const file = fullPath(root, `canon/scenes/${report.scene}.reread.md`);
        if (fs.existsSync(file)) fs.appendFileSync(file, entry);
        else outcome.rereadMissing = true;
      }
    }
  }
  return outcome;
}

const touchesNpcs = (files) => files.some((f) => f === "data/campaign/npc-roster.json" || f.startsWith("data/npcs/"));

function stableDiffers(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
