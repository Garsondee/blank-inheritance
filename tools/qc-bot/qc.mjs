#!/usr/bin/env node
/**
 * The QC bot's command line (design/qc-bot.md). One front door, for the bot in the cloud and for Claude locally:
 *
 *   node tools/qc-bot/qc.mjs queue [--limit N] [--json] [--all]       which scenes to look at next, and why not the others
 *   node tools/qc-bot/qc.mjs npcs <scene>                              the people a scene casts: file, stat block, roster, portrait
 *   node tools/qc-bot/qc.mjs lint <report.json> [--write]              check a report before it is pushed; --write fills the computed fields
 *   node tools/qc-bot/qc.mjs render <report.json>                      write the Markdown beside the JSON
 *   node tools/qc-bot/qc.mjs apply <report.json> --all --commit-each   (the bot) apply every patch on its qc/ branch, one commit each
 *   node tools/qc-bot/qc.mjs apply <report.json> --accepted [--reread] (Claude, after Ingram decides) apply what she accepted
 *   node tools/qc-bot/qc.mjs guard [--base origin/master] [--head ref] did the branch change only what the bot may change? (name a remote branch to check it without checking it out)
 *   node tools/qc-bot/qc.mjs decide <proposal> accept|decline|discuss [--note "..."]
 *   node tools/qc-bot/qc.mjs decisions import <file.json | folder>     take in what the review page collected (a folder of <proposal id>.json, as the store exports)
 *   node tools/qc-bot/qc.mjs status                                    what is waiting on Ingram, and what is waiting to be applied
 *   node tools/qc-bot/qc.mjs page [--out file]                         build the review page (Accept / Decline / Discuss)
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, fullPath, lf, readJson, writeJson } from "./lib.mjs";
import { loadModel, queueFor } from "./model.mjs";
import { printQueue } from "./queue.mjs";
import { npcChain } from "./npcs.mjs";
import { finalizeReport, lintReport, otherReportIds } from "./proposals.mjs";
import { renderReport } from "./report.mjs";
import { applyReport } from "./apply.mjs";
import { guardBranch } from "./guard.mjs";
import { importDecisions, pending, readDecisions, recordDecision } from "./decisions.mjs";

const args = process.argv.slice(2);
const cmd = args.shift();
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const positional = () => args.filter((a, i) => !a.startsWith("--") && !(i > 0 && ["--limit", "--note", "--out", "--base", "--head", "--accept", "--episode", "--via"].includes(args[i - 1])));

const die = (m) => {
  console.error(m);
  process.exit(1);
};

const reportArg = () => {
  const file = positional()[0];
  if (!file) die("Name the report file.");
  const rel = path.relative(ROOT, path.resolve(file)).split(path.sep).join("/");
  if (!fs.existsSync(fullPath(ROOT, rel))) die(`No such report: ${rel}`);
  return { rel, report: readJson(ROOT, rel) };
};

switch (cmd) {
  case "queue": {
    const model = loadModel();
    const focus = value("--episode") ? { episodes: [value("--episode")] } : undefined;
    const queue = queueFor(model, { includeAll: flag("--all"), focus });
    const limit = value("--limit") ? Number(value("--limit")) : null;
    if (limit) queue.next = queue.next.slice(0, limit);
    if (flag("--json")) console.log(JSON.stringify(queue, null, 2));
    else console.log(printQueue(queue, { limit }));
    break;
  }
  case "npcs": {
    const id = positional()[0];
    const scene = id && fs.existsSync(fullPath(ROOT, `canon/scenes/${id}.json`)) ? readJson(ROOT, `canon/scenes/${id}.json`) : null;
    if (!scene) die(`No canon scene called ${id}.`);
    for (const p of npcChain(ROOT, scene)) console.log(`${p.id.padEnd(28)} file:${p.hasFile ? "yes" : "NO "} stats:${p.hasStatblock ? "yes" : "NO "} roster:${p.inRoster ? "yes" : p.existing ? "n/a" : "NO "} portrait:${p.portrait ? "yes" : "no"}`);
    break;
  }
  case "lint": {
    const { rel, report } = reportArg();
    const model = loadModel();
    const hash = model.sceneHashOf(report.scene);
    let working = report;
    if (flag("--write")) {
      working = finalizeReport(report, { hash });
      writeJson(ROOT, rel, working);
      console.log(`Wrote the computed fields into ${rel}.`);
    }
    const planState = model.plan.find((r) => r.scene === working.scene)?.state ?? null;
    const { errors, warnings } = lintReport(working, { root: ROOT, planState, otherIds: otherReportIds(ROOT, working.id), file: rel, applyCheck: !flag("--no-apply-check") });
    for (const w of warnings) console.log(`warn   ${w}`);
    for (const e of errors) console.log(`ERROR  ${e}`);
    console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
    process.exit(errors.length ? 1 : 0);
    break;
  }
  case "render": {
    const { rel, report } = reportArg();
    const out = rel.replace(/\.json$/, ".md");
    fs.writeFileSync(fullPath(ROOT, out), renderReport(report));
    console.log(`Wrote ${out}`);
    break;
  }
  case "apply": {
    const { rel, report } = reportArg();
    const model = loadModel();
    let ids = null;
    if (flag("--accepted")) {
      const decisions = readDecisions(ROOT);
      ids = (report.proposals ?? []).filter((p) => decisions.get(p.id)?.decision === "accept" && !decisions.get(p.id)?.applied).map((p) => p.id);
      if (!ids.length) die("Nothing accepted and still unapplied in that report.");
    } else if (value("--accept")) ids = value("--accept").split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids && !flag("--all")) die("Say which proposals: --all (the bot), --accepted, or --accept id,id.");
    const out = applyReport({
      root: ROOT, report, reportFile: rel, ids, all: flag("--all"), dryRun: flag("--dry-run"), commitEach: flag("--commit-each"),
      build: !flag("--no-build"), check: !flag("--no-check"), reread: flag("--reread"), hashOf: (scene) => model.freshHash(scene),
    });
    for (const a of out.applied) console.log(`${out.dryRun ? "would apply" : "applied"}   ${a.id}${a.commit ? `  ${a.commit.slice(0, 8)}` : ""}  ${a.title}`);
    for (const f of out.failed) {
      console.log(`NOT applied ${f.id}: ${f.why === "check" ? f.message : f.results.map((r) => `${r.status}${r.reason ? " (" + r.reason + ")" : ""}${r.current !== undefined ? ", now: " + JSON.stringify(r.current).slice(0, 100) : ""} at ${r.path ?? r.file}`).join("; ")}`);
    }
    for (const u of out.unknown) console.log(`no such proposal: ${u}`);
    if (out.storyCheck) console.log(`\nStory check: ${out.storyCheck.before} → ${out.storyCheck.after} error(s).`);
    if (out.rereadMissing) console.log("There is no re-read record to add the revision to.");
    process.exit(out.failed.length || out.unknown.length ? 2 : 0);
    break;
  }
  case "guard": {
    const { entries, problems } = guardBranch(ROOT, value("--base") ?? "origin/master", value("--head") ?? "HEAD");
    for (const e of entries) console.log(`${e.status}  ${e.path}`);
    for (const p of problems) console.log(`VIOLATION  ${p}`);
    console.log(`\n${entries.length} file(s) changed, ${problems.length} violation(s).`);
    process.exit(problems.length ? 1 : 0);
    break;
  }
  case "decide": {
    const [id, decision] = positional();
    if (!id || !decision) die('Usage: qc decide <proposal> accept|decline|discuss [--note "..."]');
    const { record, changed } = recordDecision(ROOT, { proposalId: id, decision, note: value("--note") ?? "", via: value("--via") ?? "chat" });
    console.log(`${changed ? "Recorded" : "Already recorded"}: ${record.proposalId} → ${record.decision}${record.note ? ` ("${record.note}")` : ""}`);
    break;
  }
  case "decisions": {
    const sub = args.shift();
    if (sub !== "import") die("Usage: qc decisions import <file.json>");
    const file = positional()[0];
    if (!file) die("Name the file or folder the review page's decisions were saved to.");
    const target = path.resolve(file);
    // A folder is what the shared store exports: one <proposal id>.json per decision, holding the decision itself.
    const input = fs.statSync(target).isDirectory()
      ? Object.fromEntries(fs.readdirSync(target).filter((f) => f.endsWith(".json")).map((f) => [f.replace(/\.json$/, ""), JSON.parse(lf(fs.readFileSync(path.join(target, f), "utf8")))]))
      : JSON.parse(lf(fs.readFileSync(target, "utf8")));
    const summary = importDecisions(ROOT, input);
    console.log(`Recorded ${summary.recorded.length}, unchanged ${summary.unchanged.length}, not in any report ${summary.unknown.length}, skipped ${summary.skipped.length}.`);
    if (summary.unknown.length) console.log(`Unknown: ${summary.unknown.join(", ")}`);
    break;
  }
  case "status": {
    const p = pending(ROOT);
    const model = loadModel();
    const queue = queueFor(model, {});
    const line = (rows) => rows.map((r) => `  ${r.id}  (${r.scene}) ${r.title}`).join("\n") || "  none";
    console.log(`Waiting on Ingram (${p.undecided.length}):\n${line(p.undecided)}\n\nFlagged to discuss (${p.discuss.length}):\n${p.discuss.map((r) => `  ${r.id}  ${r.title}${r.note ? `\n      her note: ${r.note}` : ""}`).join("\n") || "  none"}\n\nAccepted, not yet applied (${p.acceptedNotApplied.length}):\n${line(p.acceptedNotApplied)}\n\nScenes ready for the bot (${queue.next.length}): ${queue.next.join(", ") || "none"}`);
    break;
  }
  case "page": {
    const { buildPage } = await import("./page.mjs");
    const out = value("--out") ?? "reviews/qc/inbox.html";
    const html = buildPage({ root: ROOT });
    fs.mkdirSync(path.dirname(fullPath(ROOT, out)), { recursive: true });
    fs.writeFileSync(fullPath(ROOT, out), html);
    console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
    break;
  }
  default:
    console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith(" *")).map((l) => l.slice(3)).join("\n"));
    process.exit(cmd ? 1 : 0);
}
