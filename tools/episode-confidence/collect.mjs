#!/usr/bin/env node
/**
 * The episode confidence run's collector (design/playtest-process.md section 13).
 *
 *   node tools/episode-confidence/collect.mjs merge --dir <run dir> [--rig-run <name>]...
 *       gate.json + desk/*.json + the rig runs' findings (walker and table) -> findings.jsonl, dropped.jsonl, stats.json
 *   node tools/episode-confidence/collect.mjs page --dir <run dir>
 *       grading.html: every finding with its evidence and four grade buttons (published as an Artifact by the orchestrator)
 *   node tools/episode-confidence/collect.mjs score --dir <run dir> --grades <grades.json> [--costs <costs.json>]
 *       appends this run's scorecard to design/playtests/copilot-scorecard.md
 *
 * <run dir> is relative to the repo (design/playtests/<date>-<episode short>). A desk reviewer's file is
 * { reviewer, model, scenes: [briefId], verdicts: { briefId: { verdict, why } }, findings: [...] }.
 */

import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { dedupe, normalizeFinding, numberFindings, scorecard, scorecardMarkdown, verifyQuote } from "./core/findings.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERE = path.dirname(fileURLToPath(import.meta.url));

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const readLines = (file) => (existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);
const repoRead = (rel) => {
  const file = path.resolve(REPO, rel);
  if (!file.startsWith(REPO) || !existsSync(file)) return null;
  return readFileSync(file, "utf8");
};

/** A rig finding (tools/playtest/core/findings.mjs) into the confidence run's channels; null for what is not about the game. */
export function fromRig(f) {
  if (f.kind === "rig" || f.kind === "praise") return null;
  const channel = f.channel === "walker" ? "walker" : "table";
  return { raw: { ...f, source: `${f.channel}${f.seat ? ` ${f.seat}` : ""}`, quote: null, file: null }, channel };
}

export function merge({ dir, rigRuns = [], read = repoRead }) {
  const abs = path.resolve(REPO, dir);
  const raw = [];
  const invalid = [];
  const gate = existsSync(path.join(abs, "gate.json")) ? readJson(path.join(abs, "gate.json")) : { findings: [] };
  for (const f of gate.findings) raw.push(normalizeFinding(f, { channel: "gate", source: f.source }));
  const deskDir = path.join(abs, "desk");
  const verdicts = {};
  if (existsSync(deskDir)) {
    for (const name of readdirSync(deskDir).filter((n) => n.endsWith(".json"))) {
      const doc = readJson(path.join(deskDir, name));
      for (const [scene, v] of Object.entries(doc.verdicts ?? {})) (verdicts[scene] ??= []).push({ reviewer: doc.reviewer ?? name, model: doc.model ?? null, ...v });
      for (const f of doc.findings ?? []) raw.push(normalizeFinding(f, { channel: "desk", source: doc.reviewer ?? name.replace(/\.json$/, ""), model: doc.model ?? null }));
    }
  }
  for (const run of rigRuns) {
    for (const f of readLines(path.join(REPO, "tools", "playtest", "runs", run, "findings.jsonl"))) {
      const m = fromRig(f);
      if (m) raw.push(normalizeFinding(m.raw, { channel: m.channel, source: m.raw.source }));
    }
  }
  const valid = [];
  for (const r of raw) (r.ok ? valid : invalid).push(r.ok ? r.finding : { ...r.finding, errors: r.errors });
  for (const f of valid) verifyQuote(f, read);
  const dropped = valid.filter((f) => f.verified === false);
  const kept = valid.filter((f) => f.verified !== false);
  const sceneOrder = existsSync(path.join(abs, "gate.json")) ? episodeOrder(gate.episode) : [];
  const findings = numberFindings(dedupe(kept), sceneOrder);
  const stats = {
    raw: raw.length,
    invalid: invalid.length,
    dropped: dropped.length,
    kept: findings.length,
    byChannel: Object.fromEntries(["gate", "desk", "walker", "table"].map((c) => [c, { raw: valid.filter((f) => f.channel === c).length, dropped: dropped.filter((f) => f.channel === c).length, kept: findings.filter((f) => f.channel === c).length }])),
    verdicts
  };
  writeFileSync(path.join(abs, "findings.jsonl"), findings.map((f) => JSON.stringify(f)).join("\n") + (findings.length ? "\n" : ""));
  writeFileSync(path.join(abs, "dropped.jsonl"), [...dropped, ...invalid].map((f) => JSON.stringify(f)).join("\n") + (dropped.length + invalid.length ? "\n" : ""));
  writeFileSync(path.join(abs, "stats.json"), JSON.stringify(stats, null, 2));
  return { findings, dropped, invalid, stats };
}

function episodeOrder(episodeId) {
  if (!episodeId) return [];
  const file = path.join(REPO, "data", "episodes", `${episodeId}.json`);
  if (!existsSync(file)) return [];
  return [...readJson(file).scenes].sort((a, b) => a.order - b.order).map((s) => s.briefRef);
}

/** The grading page: the template with this run's findings and verdicts put in. */
export function buildPage({ dir, title }) {
  const abs = path.resolve(REPO, dir);
  const findings = readLines(path.join(abs, "findings.jsonl"));
  const stats = existsSync(path.join(abs, "stats.json")) ? readJson(path.join(abs, "stats.json")) : {};
  const template = readFileSync(path.join(HERE, "grading", "template.html"), "utf8");
  const data = { run: path.basename(abs), title: title ?? `Episode confidence run ${path.basename(abs)}`, findings, stats };
  // `<` escaped so no text in a finding can close the script element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  if (!template.includes("/*__DATA__*/null")) throw new Error("grading/template.html has lost its /*__DATA__*/null marker");
  const html = template.replace("/*__DATA__*/null", json).replace(/__RUN__/g, data.run);
  writeFileSync(path.join(abs, "grading.html"), html);
  return path.join(abs, "grading.html");
}

export function score({ dir, grades, costs = {} }) {
  const abs = path.resolve(REPO, dir);
  const findings = readLines(path.join(abs, "findings.jsonl"));
  const dropped = readLines(path.join(abs, "dropped.jsonl")).filter((f) => f.verified === false);
  const rows = scorecard(findings, grades, { dropped, costs });
  const md = scorecardMarkdown(rows, { run: path.basename(abs), date: new Date().toISOString().slice(0, 10) });
  const card = path.join(REPO, "design", "playtests", "copilot-scorecard.md");
  if (!existsSync(card)) writeFileSync(card, "# Copilot scorecard\n\nOne table per episode confidence run (design/playtest-process.md section 13). Precision is the share of graded findings Ingram marked useful; \"only this layer\" counts finds no other layer made; fabricated quotes were dropped before she saw them.\n");
  appendFileSync(card, `\n${md}\n`);
  writeFileSync(path.join(abs, "score.json"), JSON.stringify(rows, null, 2));
  return { rows, md };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...argv] = process.argv.slice(2);
  const values = (flag) => argv.flatMap((a, i) => (a === flag && argv[i + 1] ? [argv[i + 1]] : []));
  const dir = values("--dir")[0];
  if (!dir || !["merge", "page", "score"].includes(cmd)) {
    console.log("usage: collect.mjs merge|page|score --dir design/playtests/<run> [--rig-run <name>]... [--grades g.json] [--costs c.json]");
    process.exit(2);
  }
  if (cmd === "merge") {
    const r = merge({ dir, rigRuns: values("--rig-run") });
    console.log(`${r.stats.raw} raw, ${r.stats.invalid} invalid, ${r.stats.dropped} dropped (quote not in its file), ${r.stats.kept} kept after merging duplicates`);
    for (const [c, s] of Object.entries(r.stats.byChannel)) console.log(`  ${c.padEnd(7)} ${s.raw} raw, ${s.dropped} dropped, ${s.kept} kept`);
  } else if (cmd === "page") {
    console.log(`wrote ${buildPage({ dir })}`);
  } else {
    const grades = readJson(path.resolve(REPO, values("--grades")[0]));
    const costs = values("--costs")[0] ? readJson(path.resolve(REPO, values("--costs")[0])) : {};
    console.log(score({ dir, grades, costs }).md);
  }
}
