#!/usr/bin/env node
/**
 * The audio pipeline: intake -> analyse -> process -> verify -> upload.
 * See tools/audio-pipeline/README.md and design/audio-system.md §2.
 *
 *   node tools/audio-pipeline/audio-pipeline.mjs analyse [--only text] [--jobs N]
 *   node tools/audio-pipeline/audio-pipeline.mjs process [--only text] [--jobs N]
 *   node tools/audio-pipeline/audio-pipeline.mjs verify  [--only text] [--jobs N]
 *   node tools/audio-pipeline/audio-pipeline.mjs upload  [--dry-run]
 *   node tools/audio-pipeline/audio-pipeline.mjs status
 *
 * Nothing in audio/in-tray/ is ever modified, moved or deleted. Processed
 * files go to audio/library/ (gitignored); what they are is recorded in
 * data/audio/library.json (tracked).
 */

import { existsSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AUDIO_ROOT, effectiveAsset } from "../../module/blank-inheritance/scripts/core/audio-library.mjs";
import { proposeClassification } from "./core/classify.mjs";
import { planEncode, secondPassCorrection } from "./core/encode-plan.mjs";
import { assignIds, libraryDocument, libraryEntry, needsEncode, summariseRun } from "./core/library-build.mjs";
import { verifyEntry, summariseVerification } from "./core/verify.mjs";
import { analyseFile, decodeCheck, encodeFile, locateFfmpeg, probeFile } from "./adapters/ffmpeg.mjs";
import { cachedSha256, listAudioFiles, mapLimit, openCache, readJson, sha256File, writeJson } from "./adapters/files.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "..", "..");
export const PATHS = Object.freeze({
  inTray: path.join(REPO_ROOT, "audio", "in-tray"),
  library: path.join(REPO_ROOT, "audio", "library"),
  cache: path.join(REPO_ROOT, "audio", ".pipeline-cache"),
  libraryJson: path.join(REPO_ROOT, "data", "audio", "library.json"),
  reviewJson: path.join(REPO_ROOT, "data", "audio", "review.json"),
  verifyReport: path.join(REPO_ROOT, "audio", ".pipeline-cache", "verify-report.json")
});

function parseArgs(argv) {
  const [command = "status", ...rest] = argv;
  const opts = { command, only: null, jobs: Math.max(2, Math.min(8, Math.floor(os.cpus().length / 2))), dryRun: false };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--only") opts.only = rest[++i];
    else if (a === "--jobs") opts.jobs = Math.max(1, Number(rest[++i]) || opts.jobs);
    else if (a === "--dry-run") opts.dryRun = true;
    else throw new Error(`Unknown option ${a}`);
  }
  return opts;
}

const log = (...args) => console.log(...args);

/** Scan, hash, probe and measure every source; propose a classification for each. */
async function analyse({ only, jobs }, tools) {
  const previous = readJson(PATHS.libraryJson, null);
  const hashCache = openCache(PATHS.cache, "hashes");
  const analysisCache = openCache(PATHS.cache, "analysis");

  const files = listAudioFiles(PATHS.inTray);
  log(`Found ${files.length} source files under audio/in-tray/.`);

  let hashed = 0;
  const sources = await mapLimit(files, 4, async (file) => {
    const sha256 = await cachedSha256(hashCache, file);
    if (++hashed % 50 === 0) {
      log(`  hashed ${hashed}/${files.length}`);
      hashCache.flush();
    }
    return { ...file, sha256 };
  });
  hashCache.flush();

  const ids = assignIds(sources, previous);
  const previousById = new Map((previous?.assets ?? []).map((e) => [e.id, e]));
  const selected = only ? sources.filter((s) => s.relPath.toLowerCase().includes(only.toLowerCase())) : sources;

  let done = 0;
  const started = Date.now();
  const entries = await mapLimit(sources, jobs, async (src) => {
    const id = ids.get(src.relPath);
    let cached = analysisCache.get(src.sha256);
    // A cached measurement from before a field existed is stale, not a hit:
    // decodedDurationSec was added after the first full run, and without it
    // verification would compare against a header some files get wrong.
    if (cached && cached.analysis?.decodedDurationSec === undefined) cached = null;
    const wanted = selected.includes(src);
    if (!cached && wanted) {
      const probe = await probeFile(tools, src.full);
      const analysis = await analyseFile(tools, src.full, probe.durationSec);
      cached = { probe, analysis, ffmpeg: tools.version, analysedAt: new Date().toISOString() };
      analysisCache.set(src.sha256, cached);
      done += 1;
      if (done % 10 === 0) {
        analysisCache.flush();
        const rate = done / ((Date.now() - started) / 1000);
        log(`  measured ${done} (${rate.toFixed(1)} files/s) — latest: ${src.relPath}`);
      }
    }
    if (!cached) {
      // Outside --only and never measured: carry the previous entry forward untouched.
      return previousById.get(id) ?? null;
    }
    const proposal = proposeClassification({ relPath: src.relPath, probe: cached.probe, analysis: cached.analysis });
    const prior = previousById.get(id);
    const sameBytes = prior?.source?.sha256 === src.sha256;
    return libraryEntry({
      id,
      relPath: src.relPath,
      sha256: src.sha256,
      bytes: src.size,
      probe: cached.probe,
      analysis: cached.analysis,
      proposal,
      encode: sameBytes ? prior.encode ?? null : null,
      output: sameBytes ? prior.output ?? null : null
    });
  });
  analysisCache.flush();

  const doc = libraryDocument({
    entries: entries.filter(Boolean),
    ffmpegVersion: tools.version,
    generatedAt: new Date().toISOString(),
    root: AUDIO_ROOT
  });
  writeJson(PATHS.libraryJson, doc);
  log(`Measured ${done} new file(s). Wrote ${path.relative(REPO_ROOT, PATHS.libraryJson)} (${doc.assets.length} assets).`);
  return { doc, sources, ids };
}

/** Encode everything whose plan changed or whose output is missing, then measure the result. */
async function processLibrary({ only, jobs }, tools) {
  const { doc, sources, ids } = await analyse({ only: null, jobs }, tools);
  const review = readJson(PATHS.reviewJson, { decisions: {} });
  const sourceById = new Map(sources.map((s) => [ids.get(s.relPath), s]));
  const encodeCache = openCache(PATHS.cache, "outputs");

  const work = doc.assets.filter((entry) => {
    if (only && !entry.source.path.toLowerCase().includes(only.toLowerCase()) && !entry.id.includes(only.toLowerCase())) return false;
    return effectiveAsset(entry, review.decisions?.[entry.id]).status !== "rejected";
  });

  let encoded = 0;
  let skipped = 0;
  const failed = [];
  let sinceCheckpoint = 0;

  await mapLimit(work, jobs, async (entry) => {
    const asset = effectiveAsset(entry, review.decisions?.[entry.id]);
    const src = sourceById.get(entry.id);
    try {
      let plan = planEncode({ asset, probe: entry.source, analysis: entry.analysis });
      if (entry.encode?.baseHash === plan.baseHash && entry.encode?.gainCorrectionDb) {
        plan = planEncode({ asset, probe: entry.source, analysis: entry.analysis, gainCorrectionDb: entry.encode.gainCorrectionDb });
      }
      const outputPath = path.join(PATHS.library, ...plan.outputRel.split("/"));
      const outputSha256 = existsSync(outputPath) ? await cachedOutputSha(encodeCache, outputPath) : null;
      const verdict = needsEncode({ plan, previousEncode: entry.encode, outputSha256 });
      if (!verdict.needed) {
        skipped += 1;
        return;
      }

      await encodeFile(tools, plan, src.full, outputPath);
      let output = await measureOutput(tools, outputPath);
      const correction = secondPassCorrection(plan, output);
      if (correction !== 0) {
        plan = planEncode({ asset, probe: entry.source, analysis: entry.analysis, gainCorrectionDb: correction });
        await encodeFile(tools, plan, src.full, outputPath);
        output = await measureOutput(tools, outputPath);
      }
      const sha256 = await sha256File(outputPath);
      encodeCache.set(outputPath, { size: statSync(outputPath).size, mtimeMs: Math.floor(statSync(outputPath).mtimeMs), sha256 });
      entry.encode = {
        path: plan.outputRel,
        sha256,
        bytes: statSync(outputPath).size,
        codec: "opus",
        container: "ogg",
        sampleRate: plan.sampleRate,
        channels: plan.channels,
        bitrateK: plan.bitrateK,
        gainDb: plan.gainDb,
        gainCorrectionDb: plan.gainCorrectionDb,
        limitDb: plan.limitDb,
        targetLufs: plan.targetLufs,
        basis: plan.basis,
        shortfallDb: plan.shortfallDb,
        trim: plan.trim,
        loop: plan.loop,
        kind: plan.kind,
        planHash: plan.hash,
        baseHash: plan.baseHash,
        pipelineVersion: plan.version
      };
      entry.output = output;
      encoded += 1;
      if (++sinceCheckpoint >= 10) {
        sinceCheckpoint = 0;
        // Checkpoint so an interrupted run keeps what it has already encoded.
        writeJson(PATHS.libraryJson, doc);
        encodeCache.flush();
        log(`  processed ${encoded} (latest ${entry.id})`);
      }
    } catch (err) {
      failed.push({ id: entry.id, error: err.message });
      // The whole message, not its first line: ffmpeg says WHY on the lines
      // after it, and a truncated "encode failed (exit -22)" is unactionable.
      console.error(`  FAILED ${entry.id}: ${err.message}`);
    }
  });

  encodeCache.flush();
  doc.generatedAt = new Date().toISOString();
  writeJson(PATHS.libraryJson, doc);
  log(summariseRun(doc.assets, { encoded, skipped, failed }));
  if (failed.length) process.exitCode = 1;
  return doc;
}

async function cachedOutputSha(cache, outputPath) {
  const st = statSync(outputPath);
  const hit = cache.get(outputPath);
  if (hit && hit.size === st.size && hit.mtimeMs === Math.floor(st.mtimeMs)) return hit.sha256;
  const sha256 = await sha256File(outputPath);
  cache.set(outputPath, { size: st.size, mtimeMs: Math.floor(st.mtimeMs), sha256 });
  return sha256;
}

async function measureOutput(tools, file) {
  const probe = await probeFile(tools, file);
  const loud = await analyseFile(tools, file, probe.durationSec);
  return {
    durationSec: probe.durationSec,
    channels: probe.channels,
    sampleRate: probe.sampleRate,
    integratedLufs: loud.integratedLufs,
    maxShortTermLufs: loud.maxShortTermLufs,
    maxMomentaryLufs: loud.maxMomentaryLufs,
    truePeakDbtp: loud.truePeakDbtp,
    lraLu: loud.lraLu
  };
}

/** Re-check every processed file from scratch: present, unchanged, decodable, on target. */
async function verify({ only, jobs }, tools) {
  const doc = readJson(PATHS.libraryJson, null);
  if (!doc) throw new Error("No data/audio/library.json yet — run `process` first.");
  const review = readJson(PATHS.reviewJson, { decisions: {} });
  const entries = doc.assets.filter((e) => !only || e.id.includes(only.toLowerCase()));
  const results = await mapLimit(entries, jobs, async (entry) => {
    const asset = effectiveAsset(entry, review.decisions?.[entry.id]);
    if (asset.status === "rejected") return { id: entry.id, status: "skipped", problems: [] };
    const file = entry.encode?.path ? path.join(PATHS.library, ...entry.encode.path.split("/")) : null;
    const exists = !!file && existsSync(file);
    const sha256 = exists ? await sha256File(file) : null;
    const decode = exists ? await decodeCheck(tools, file) : null;
    return verifyEntry({ entry, asset, exists, sha256, decode });
  });
  const report = { generatedAt: new Date().toISOString(), results };
  writeJson(PATHS.verifyReport, report);
  log(summariseVerification(results));
  if (results.some((r) => r.status === "fail")) process.exitCode = 1;
  return report;
}

async function status() {
  const doc = readJson(PATHS.libraryJson, null);
  if (!doc) {
    log("No library yet. Run: node tools/audio-pipeline/audio-pipeline.mjs process");
    return;
  }
  log(summariseRun(doc.assets));
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.command === "status") return status();
  if (opts.command === "upload") {
    const { upload } = await import("./upload.mjs");
    return upload({ dryRun: opts.dryRun, paths: PATHS });
  }
  const tools = await locateFfmpeg();
  log(`Using ffmpeg ${tools.version}`);
  if (opts.command === "analyse" || opts.command === "analyze") return analyse(opts, tools);
  if (opts.command === "process") return processLibrary(opts, tools);
  if (opts.command === "verify") return verify(opts, tools);
  throw new Error(`Unknown command "${opts.command}". Try: analyse, process, verify, upload, status.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exitCode = 1;
  });
}
