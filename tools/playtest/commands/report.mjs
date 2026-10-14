/**
 * pt report [--run name] [--out file]
 *
 * The report skeleton for a finished (or stopped) run, built only from the run's own files: findings, improvisation, dice, coverage,
 * actions, telemetry, predictions. Everything that is data is filled in; what is the orchestrator's to write is marked <<WRITE: ...>>
 * and listed at the end. Default output: design/playtests/<run>.md.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseArgs } from "../core/args.mjs";
import { summarizeTape } from "../core/dice.mjs";
import { buildReport, unfilled } from "../core/report.mjs";
import { summarizeEvents } from "../core/telemetry.mjs";
import { REPO, RUNS_DIR } from "../paths.mjs";

const jsonl = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);

/** Prediction lines the orchestrator wrote before each scene ("- [time] **scene**: text"). */
export function parsePredictions(text) {
  return text.split("\n").map((line) => /^- \[[^\]]*\] \*\*([^*]+)\*\*: (.*)$/.exec(line)).filter(Boolean).map((m) => ({ scene: m[1], text: m[2] }));
}

export function runData(dir) {
  const run = existsSync(path.join(dir, "run.json")) ? JSON.parse(readFileSync(path.join(dir, "run.json"), "utf8")) : { name: path.basename(dir) };
  const summary = existsSync(path.join(dir, "summary.json")) ? JSON.parse(readFileSync(path.join(dir, "summary.json"), "utf8")) : {};
  const actions = jsonl(path.join(dir, "actions.jsonl"));
  const bySeat = {};
  for (const a of actions) bySeat[a.seat] = (bySeat[a.seat] ?? 0) + 1;
  const events = [];
  const seatsDir = path.join(dir, "seats");
  if (existsSync(seatsDir)) for (const seat of readdirSync(seatsDir)) events.push(...jsonl(path.join(seatsDir, seat, "telemetry.jsonl")));
  const predictions = existsSync(path.join(dir, "predictions.md")) ? parsePredictions(readFileSync(path.join(dir, "predictions.md"), "utf8")) : [];
  return {
    run: { name: run.name, build: run.build, seed: run.seed, startedAt: run.startedAt, endedAt: summary.endedAt },
    roster: run.roster,
    findings: jsonl(path.join(dir, "findings.jsonl")),
    improv: jsonl(path.join(dir, "improv.jsonl")),
    coverage: existsSync(path.join(dir, "coverage.json")) ? JSON.parse(readFileSync(path.join(dir, "coverage.json"), "utf8")) : null,
    telemetry: events.length ? summarizeEvents(events) : null,
    dice: summarizeTape(jsonl(path.join(dir, "dice.jsonl"))),
    actions: { bySeat },
    predictions
  };
}

export async function run(argv) {
  const { flags } = parseArgs(argv, { valued: ["run", "out"] });
  const name = typeof flags.run === "string" ? flags.run : (existsSync(RUNS_DIR) ? readdirSync(RUNS_DIR) : []).filter((n) => existsSync(path.join(RUNS_DIR, n, "run.json"))).sort().pop();
  if (!name) {
    console.log("No run folder found.");
    return 1;
  }
  const dir = path.join(RUNS_DIR, name);
  const markdown = buildReport(runData(dir));
  const out = typeof flags.out === "string" ? flags.out : path.join(REPO, "design", "playtests", `${name}.md`);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, markdown);
  const todo = unfilled(markdown);
  console.log(`Report skeleton for ${name} written to ${out}.\n${todo.length ? `${todo.length} place(s) still to write: ${[...new Set(todo)].length} kind(s).` : "Nothing left to write."}`);
  return 0;
}
