#!/usr/bin/env node
/**
 * Layer 1 of the episode confidence run (design/playtest-process.md section 13): every machine check this repo already has, run once
 * and read into findings, so the LLM reviewers that follow are told what is already known and spend their judgement elsewhere.
 *
 *   node tools/episode-confidence/gate.mjs [--episode <id>] [--out <dir>] [--no-tests]
 *   npm run confidence:gate -- --out design/playtests/2026-10-07-c1e1
 *
 * Writes <out>/gate.json ({ episode, ranAt, tools: [{ name, command, exit, ms, summary }], findings }) and prints one line per tool.
 * Always exits 0 when the checks ran: the gate never stops a run, it informs it.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseJourneys, parseNpcCheck, parseSceneAudit, parseSignoffBoard, parseStoryCheck, parseTestRun } from "./core/gate-parse.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function episodeFacts(episodeId, repo = REPO) {
  const episode = JSON.parse(readFileSync(path.join(repo, "data", "episodes", `${episodeId}.json`), "utf8"));
  const scenes = [...episode.scenes].sort((a, b) => a.order - b.order);
  return { episode, briefIds: scenes.map((s) => s.briefRef), titleToBrief: Object.fromEntries(scenes.map((s) => [s.title, s.briefRef])) };
}

function runNode(args, { timeout = 600000 } = {}) {
  const started = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  return { exit: r.status ?? 1, stdout: `${r.stdout ?? ""}${r.stderr ?? ""}`, ms: Date.now() - started };
}

export function runGate({ episodeId = "episode-c1e1-mothers-maiden-name", tests = true } = {}) {
  const { briefIds, titleToBrief } = episodeFacts(episodeId);
  const steps = [
    { name: "story check", args: ["tools/story/story.mjs", "check"], parse: (o, e) => parseStoryCheck(o, e, { briefIds }) },
    { name: "scene audit", args: ["tools/scene-audit/audit.mjs", "--episode", episodeId], parse: (o, e) => parseSceneAudit(o, e, { titleToBrief }) },
    { name: "journeys", args: ["tools/location-sync/journeys.mjs", "--episode", episodeId], parse: (o, e) => parseJourneys(o, e, { titleToBrief }) },
    { name: "npc check", args: ["tools/npc-generator/apply.mjs", "--check", "--quiet"], parse: parseNpcCheck },
    { name: "sign-off board", args: ["tools/scene-signoff/console.mjs", "--json"], parse: (o) => parseSignoffBoard(o.slice(o.indexOf("{")), { episodeId }) },
    ...(tests ? [{ name: "npm test", args: ["test/support/run-tests.mjs"], parse: parseTestRun }] : [])
  ];
  const tools = [];
  const findings = [];
  for (const step of steps) {
    const r = runNode(step.args);
    let parsed;
    try {
      parsed = step.parse(r.stdout, r.exit);
    } catch (error) {
      parsed = { findings: [{ channel: "gate", source: step.name, kind: "bug", severity: "S2", summary: `the gate could not read ${step.name}'s output: ${error.message}`, scene: null, beat: null, quote: null, file: null, expected: "", actual: r.stdout.slice(0, 400), proposal: null }], summary: "unreadable" };
    }
    tools.push({ name: step.name, command: `node ${step.args.join(" ")}`, exit: r.exit, ms: r.ms, summary: parsed.summary });
    findings.push(...parsed.findings);
  }
  return { episode: episodeId, ranAt: new Date().toISOString(), tools, findings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const value = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const episodeId = value("--episode") ?? "episode-c1e1-mothers-maiden-name";
  const out = value("--out");
  const result = runGate({ episodeId, tests: !argv.includes("--no-tests") });
  for (const t of result.tools) console.log(`${t.name.padEnd(16)} exit ${t.exit}  ${String(Math.round(t.ms / 1000)).padStart(3)}s  ${t.summary}`);
  const bySev = result.findings.reduce((m, f) => ((m[f.severity] = (m[f.severity] ?? 0) + 1), m), {});
  console.log(`\n${result.findings.length} gate finding(s): ${JSON.stringify(bySev)}`);
  if (out) {
    mkdirSync(path.resolve(REPO, out), { recursive: true });
    writeFileSync(path.resolve(REPO, out, "gate.json"), JSON.stringify(result, null, 2));
    console.log(`wrote ${path.join(out, "gate.json")}`);
  }
}
