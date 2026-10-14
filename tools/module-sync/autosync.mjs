#!/usr/bin/env node
/**
 * The auto-sync watcher: local changes reach the live Foundry server without
 * anyone running a deploy. Ingram, 2026-10-07: "I ALWAYS want changes in the
 * local folders to be reflected in the remote server automatically and every
 * time ... I'm talking about the Foundry module and anything which is required
 * to run the adventure."
 *
 * This file is the adapter: file watchers, child processes, a lock and a status
 * file. Every decision (what counts as a change, when a burst has settled, what
 * a failure waits, which deploy flags) lives in autosync-plan.mjs and is tested
 * offline. Like remote.mjs, this half is exercised by running it against the
 * real server, not by CI.
 *
 * What it runs is the SAME verified `deploy.mjs` -- preflight, the scene-edits
 * guard, checksums on both sides, the build stamp -- so it can send nothing a
 * hand-run deploy would refuse. Around it, it does the two preparation steps a
 * person used to remember:
 *
 *   canon -> data   `node tools/story/story.mjs build` (idempotent copy)
 *   stagecraft      `node module/stagecraft/tools/build.mjs` when the bundle is
 *                   older than its sources, or is a dev build (a deploy refuses
 *                   both)
 *
 * and a second lane for audio: `audio-pipeline.mjs upload`, incremental and
 * verified, when the processed library changes.
 *
 *   node tools/module-sync/autosync.mjs start    make sure it is running (one line; the SessionStart hook)
 *   node tools/module-sync/autosync.mjs status   what it is doing and what it did last
 *   node tools/module-sync/autosync.mjs pause    hold every push (changes stay queued); `resume` lets them go
 *   node tools/module-sync/autosync.mjs log      the last lines of its log
 *   node tools/module-sync/autosync.mjs stop
 *   node tools/module-sync/autosync.mjs run      the daemon itself, in the foreground (what `start` launches)
 *
 * It never prunes (a file deleted locally stays on the server until someone
 * runs `npm run deploy -- --prune` on purpose), never touches storage/, and
 * never writes anywhere but the files `deploy.mjs` and the audio upload write.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, watch, writeFileSync, writeSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyPath, createChangeFilter, createScheduler, daemonAlive, deployFlags, kindsFromDiff, statusLine, summariseDeployOutput, WATCH_ROOTS } from "./autosync-plan.mjs";
import { compareToRecord, currentLocalState, readRecord } from "./deploy-status.mjs";
import { REPO_ROOT, staleStagecraftBundle } from "./deploy.mjs";

const SELF = fileURLToPath(import.meta.url);
export const AUTOSYNC_DIR = path.join(path.dirname(SELF), ".autosync");
const LOCK = path.join(AUTOSYNC_DIR, "lock");
const STATE = path.join(AUTOSYNC_DIR, "state.json");
const PAUSED = path.join(AUTOSYNC_DIR, "paused");
const LOG = path.join(AUTOSYNC_DIR, "autosync.log");

const TICK_MS = 2000;
const HEARTBEAT_MS = 10_000;
/** The safety net for dropped events (a git checkout, a watcher buffer overflow) and for a watch root that did not exist yet. */
const POLL_MS = 10 * 60_000;
const DEPLOY_TIMEOUT_MS = 90 * 60_000;
const BUILD_TIMEOUT_MS = 10 * 60_000;
const MAX_LOG_BYTES = 5 * 1024 * 1024;

const stamp = () => new Date().toISOString().replace("T", " ").slice(0, 19);
const log = (message) => console.log(`${stamp()}  ${message}`);

const pidAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
};

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// -- the lock ----------------------------------------------------------------

/** One daemon at a time, however many sessions start at once: exclusive-create decides. */
function acquireLock() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(LOCK, "wx");
      writeSync(fd, String(process.pid));
      closeSync(fd);
      return true;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      if (lockHolderAlive()) return false;
      try {
        unlinkSync(LOCK);
      } catch {
        // someone else cleared it first; the next attempt creates it or finds the new holder
      }
    }
  }
  return false;
}

function lockHolderAlive() {
  let pid;
  try {
    pid = Number.parseInt(readFileSync(LOCK, "utf8"), 10);
  } catch {
    return false; // released between the failed create and this read
  }
  const state = readJson(STATE);
  if (state?.pid === pid) return daemonAlive(state, Date.now(), pidAlive);
  // A lock with no state behind it yet is a daemon that is still starting.
  try {
    return pidAlive(pid) && Date.now() - statSync(LOCK).mtimeMs < 20_000;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    if (Number.parseInt(readFileSync(LOCK, "utf8"), 10) === process.pid) unlinkSync(LOCK);
  } catch {
    // already gone
  }
}

// -- child processes ---------------------------------------------------------

/** Runs `node <args>`, writing its output into the log as it arrives; resolves with the exit code and everything it printed. */
function runNode(label, args, { cwd = REPO_ROOT, timeoutMs = BUILD_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    log(`${label}: node ${args.map((a) => path.relative(REPO_ROOT, a) || a).join(" ")}`);
    const child = spawn(process.execPath, args, { cwd, windowsHide: true, timeout: timeoutMs });
    let output = "";
    let pending = "";
    const take = (chunk) => {
      const text = chunk.toString();
      output += text;
      pending += text;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) if (line.trim()) console.log(`    | ${line}`);
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    child.on("error", (err) => {
      log(`${label}: could not start (${err.message})`);
      resolve({ code: -1, output });
    });
    child.on("close", (code, signal) => {
      if (pending.trim()) console.log(`    | ${pending}`);
      if (signal) log(`${label}: stopped by ${signal} (timeout ${Math.round(timeoutMs / 60000)} min)`);
      resolve({ code: code ?? -1, output });
    });
  });
}

// -- the daemon --------------------------------------------------------------

/** Size-and-time fingerprint of the processed audio library: cheap to compute, and any re-encode changes it. */
async function audioFingerprint() {
  const dir = path.join(REPO_ROOT, "audio", "library");
  if (!existsSync(dir)) return null;
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const h = createHash("sha1");
  const files = entries.filter((e) => e.isFile()).map((e) => path.join(e.parentPath ?? e.path, e.name)).sort();
  for (const file of files) {
    const s = await stat(file);
    h.update(`${path.relative(dir, file)}:${s.size}:${Math.round(s.mtimeMs)}\n`);
  }
  return `${files.length}:${h.digest("hex")}`;
}

async function runDaemon() {
  mkdirSync(AUTOSYNC_DIR, { recursive: true });
  if (!acquireLock()) {
    log("another auto-sync daemon is already running; this one exits");
    return;
  }
  process.on("exit", releaseLock);
  process.on("uncaughtException", (err) => log(`uncaught: ${err.stack ?? err}`));
  process.on("unhandledRejection", (err) => log(`unhandled rejection: ${err?.stack ?? err}`));

  const previous = readJson(STATE) ?? {};
  const scheduler = createScheduler();
  const state = {
    pid: process.pid,
    startedAt: Date.now(),
    heartbeat: Date.now(),
    deploy: { lastAt: previous.deploy?.lastAt ?? null, ok: previous.deploy?.ok ?? null, build: previous.deploy?.build ?? null, summary: previous.deploy?.summary ?? [] },
    audio: { lastAt: previous.audio?.lastAt ?? null, ok: previous.audio?.ok ?? null, summary: previous.audio?.summary ?? [], fingerprint: previous.audio?.fingerprint ?? null }
  };
  const writeState = () => {
    state.heartbeat = Date.now();
    const snap = scheduler.snapshot();
    writeFileSync(STATE, `${JSON.stringify({ ...state, deploy: { ...state.deploy, ...snap.deploy }, audio: { ...state.audio, ...snap.audio } }, null, 2)}\n`);
  };

  // -- watching
  const watchers = new Map();
  let needEvaluate = false;

  // Windows reports a file READ as a change when last-access updates are on (they are, on this machine), so the daemon's own
  // hashing would wake it: see createChangeFilter.
  const signatureOf = (rel) => {
    try {
      const s = statSync(path.join(REPO_ROOT, rel));
      return s.isDirectory() ? "dir" : `${Math.round(s.mtimeMs)}:${s.size}`;
    } catch {
      return null;
    }
  };
  const filter = createChangeFilter(signatureOf);
  async function baseline(root) {
    const abs = path.join(REPO_ROOT, root);
    const entries = await readdir(abs, { recursive: true, withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (!e.isFile()) continue;
      const rel = `${root}/${path.relative(abs, path.join(e.parentPath ?? e.path, e.name))}`.replaceAll("\\", "/");
      if (classifyPath(rel)) filter.know(rel);
    }
  }

  const onChange = (root, name) => {
    if (!name) {
      needEvaluate = true; // the platform did not say which file: let the hash comparison find out
      return;
    }
    const rel = `${root}/${name}`.replaceAll("\\", "/");
    const hit = classifyPath(rel);
    if (hit && filter.changed(rel)) scheduler.noteEvent(hit.lane, hit.kind, Date.now());
  };
  const attach = () => {
    for (const root of WATCH_ROOTS) {
      if (watchers.has(root)) continue;
      const abs = path.join(REPO_ROOT, root);
      if (!existsSync(abs)) continue;
      try {
        const w = watch(abs, { recursive: true }, (_event, name) => onChange(root, name));
        w.on("error", (err) => {
          log(`watcher for ${root} failed (${err.message}); it will be re-attached`);
          w.close();
          watchers.delete(root);
          needEvaluate = true;
        });
        watchers.set(root, w);
      } catch (err) {
        log(`cannot watch ${root}: ${err.message}`);
      }
    }
  };

  // -- comparing the tree with what was last pushed (offline, hash-based)
  async function evaluate(reason, { startup = false } = {}) {
    const record = readRecord();
    const now = Date.now();
    if (!record) {
      scheduler.markStale("deploy", new Set(["module", "data", "video", "registry", "canon", "stagecraft"]), now);
      log(`${reason}: this machine has no deploy record; a full deploy is queued`);
    } else {
      const diff = compareToRecord(record, await currentLocalState());
      const kinds = kindsFromDiff(diff);
      // On startup the preparation steps run once too: canon or Stagecraft sources may have changed while no one was watching.
      if (startup) for (const k of ["canon", "stagecraft"]) kinds.add(k);
      if (kinds.size) {
        scheduler.markStale("deploy", kinds, now);
        const total = diff.changed.length + diff.added.length + diff.removed.length;
        if (total) log(`${reason}: the server is behind by ${total} file(s); a deploy is queued`);
      }
    }
    const fingerprint = await audioFingerprint();
    if (fingerprint && fingerprint !== state.audio.fingerprint) {
      scheduler.markStale("audio", new Set(["audio"]), now);
      log(`${reason}: the audio library has changed since the last upload; an upload is queued`);
    }
  }

  // -- the deploy lane
  async function deployLane(kinds) {
    // 1. preparation: things a deploy cannot do for itself
    if (kinds.has("canon")) {
      const built = await runNode("story build", [path.join(REPO_ROOT, "tools", "story", "story.mjs"), "build"], { timeoutMs: BUILD_TIMEOUT_MS });
      if (built.code !== 0) log("story build failed; deploying the data as it stands");
    }
    if (kinds.has("stagecraft")) {
      const stale = await staleStagecraftBundle(REPO_ROOT);
      if (stale) {
        log(`stagecraft: ${stale}; building it`);
        const built = await runNode("stagecraft build", [path.join(REPO_ROOT, "module", "stagecraft", "tools", "build.mjs")], {
          cwd: path.join(REPO_ROOT, "module", "stagecraft"),
          timeoutMs: BUILD_TIMEOUT_MS
        });
        if (built.code !== 0) return { ok: false, summary: ["stagecraft build failed"], build: null };
      }
    }

    // 2. is there anything to send? Decided by hashes, never by "an event happened".
    const record = readRecord();
    const diff = record ? compareToRecord(record, await currentLocalState()) : null;
    const total = diff ? diff.changed.length + diff.added.length + diff.removed.length : null;
    if (diff && total === 0) {
      log("nothing differs from the last deploy; no push needed");
      return { ok: true, summary: [], build: state.deploy.build, noop: true };
    }
    const flags = record ? deployFlags(kindsFromDiff(diff)) : [];

    // 3. the verified deploy itself
    const result = await runNode("deploy", [path.join(REPO_ROOT, "tools", "module-sync", "deploy.mjs"), ...flags], { timeoutMs: DEPLOY_TIMEOUT_MS });
    const summary = summariseDeployOutput(result.output);
    const build = /(?:DEPLOYED build|already has build) ([0-9a-f]{8,})/.exec(result.output)?.[1] ?? null;
    return { ok: result.code === 0 && summary.some((l) => /^DEPLOYED build|already has build/.test(l)), summary, build };
  }

  // -- the audio lane
  async function audioLane() {
    const fingerprint = await audioFingerprint();
    if (fingerprint && fingerprint === state.audio.fingerprint) {
      log("the audio library is as last uploaded; no upload needed");
      return { ok: true, summary: [], noop: true, fingerprint };
    }
    const result = await runNode("audio upload", [path.join(REPO_ROOT, "tools", "audio-pipeline", "audio-pipeline.mjs"), "upload"], { timeoutMs: DEPLOY_TIMEOUT_MS });
    const ok = result.code === 0 && !/MISMATCH/.test(result.output) && /Verified: all|Everything already matches/.test(result.output);
    const summary = result.output.split(/\r?\n/).filter((l) => /^(Verified|MISMATCH|Everything already|\d+ local files)/.test(l)).slice(0, 3);
    return { ok, summary, fingerprint: ok ? fingerprint : state.audio.fingerprint };
  }

  async function runLane(name) {
    const kinds = scheduler.start(name, Date.now());
    writeState();
    let outcome;
    try {
      outcome = name === "deploy" ? await deployLane(kinds) : await audioLane();
    } catch (err) {
      log(`${name}: crashed: ${err.stack ?? err}`);
      outcome = { ok: false, summary: [String(err.message ?? err)] };
    }
    scheduler.finish(name, outcome.ok, Date.now());
    if (!outcome.noop) state[name].lastAt = Date.now();
    if (!outcome.noop || state[name].ok === null) state[name].ok = outcome.ok;
    if (!outcome.noop) state[name].summary = outcome.summary ?? [];
    if (name === "deploy" && outcome.build) state.deploy.build = outcome.build;
    if (name === "audio" && outcome.ok) state.audio.fingerprint = outcome.fingerprint;
    log(`${name}: ${outcome.ok ? "ok" : "FAILED"}${outcome.summary?.length ? ` -- ${outcome.summary.join(" | ")}` : ""}`);
    writeState();
  }

  // -- go
  log(`auto-sync started (pid ${process.pid}); watching ${WATCH_ROOTS.join(", ")}`);
  attach();
  for (const root of WATCH_ROOTS) await baseline(root);
  await evaluate("startup", { startup: true });
  writeState();

  let busy = false;
  let lastPoll = Date.now();
  let lastBeat = 0;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const now = Date.now();
      const running = scheduler.snapshot();
      if (now - lastPoll >= POLL_MS || (needEvaluate && !running.deploy.running && !running.audio.running)) {
        lastPoll = now;
        needEvaluate = false;
        attach();
        await evaluate("check");
      }
      const { run } = scheduler.next(now, { paused: existsSync(PAUSED) });
      if (run) await runLane(run);
      if (Date.now() - lastBeat >= HEARTBEAT_MS) {
        lastBeat = Date.now();
        writeState();
      }
    } catch (err) {
      log(`tick failed: ${err.stack ?? err}`);
    } finally {
      busy = false;
    }
  }, TICK_MS);
}

// -- the commands ------------------------------------------------------------

function readStatus() {
  const state = readJson(STATE);
  const alive = daemonAlive(state, Date.now(), pidAlive);
  return { state, alive, paused: existsSync(PAUSED) };
}

async function start() {
  mkdirSync(AUTOSYNC_DIR, { recursive: true });
  let { state, alive, paused } = readStatus();
  if (!alive) {
    try {
      if (existsSync(LOG) && statSync(LOG).size > MAX_LOG_BYTES) renameSync(LOG, `${LOG}.1`);
      const out = openSync(LOG, "a");
      const child = spawn(process.execPath, [SELF, "run"], { cwd: REPO_ROOT, detached: true, stdio: ["ignore", out, out], windowsHide: true });
      child.unref();
      // Wait for the new daemon to claim the lock and write its first state, so the line printed is the truth.
      for (let i = 0; i < 20 && !alive; i++) {
        await new Promise((r) => setTimeout(r, 250));
        ({ state, alive, paused } = readStatus());
      }
    } catch (err) {
      console.log(`Auto-sync: could not start (${err.message}).`);
      return;
    }
  }
  console.log(statusLine(state, { alive, paused, now: Date.now() }));
}

function status() {
  const { state, alive, paused } = readStatus();
  console.log(statusLine(state, { alive, paused, now: Date.now() }));
  if (!alive) return;
  for (const lane of ["deploy", "audio"]) {
    const l = state[lane] ?? {};
    const bits = [];
    if (l.kinds?.length) bits.push(`waiting on: ${l.kinds.join(", ")}`);
    if (l.failures) bits.push(`${l.failures} failure(s) in a row`);
    if (l.summary?.length) bits.push(`last: ${l.summary.join(" | ")}`);
    if (bits.length) console.log(`  ${lane}: ${bits.join("; ")}`);
  }
  console.log(`  log: ${path.relative(REPO_ROOT, LOG)}`);
}

function stop() {
  const { state, alive } = readStatus();
  if (!alive) {
    console.log("Auto-sync was not running.");
    return;
  }
  process.kill(state.pid);
  try {
    unlinkSync(LOCK);
  } catch {
    // the daemon's own exit handler may have removed it
  }
  console.log(`Auto-sync stopped (pid ${state.pid}). It starts again with the next session, or \`npm run autosync -- start\`.`);
}

function tailLog(lines = 40) {
  if (!existsSync(LOG)) return console.log("No log yet.");
  console.log(readFileSync(LOG, "utf8").split(/\r?\n/).slice(-lines - 1).join("\n"));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === SELF;
if (isMain) {
  const command = process.argv[2] ?? "status";
  try {
    if (command === "run") await runDaemon();
    else if (command === "start") await start();
    else if (command === "status") status();
    else if (command === "stop") stop();
    else if (command === "log") tailLog(Number.parseInt(process.argv[3] ?? "40", 10));
    else if (command === "pause") {
      mkdirSync(AUTOSYNC_DIR, { recursive: true });
      writeFileSync(PAUSED, `${new Date().toISOString()}\n`);
      console.log("Auto-sync paused: changes stay queued and nothing is pushed until `npm run autosync -- resume`.");
    } else if (command === "resume") {
      try {
        unlinkSync(PAUSED);
      } catch {
        // was not paused
      }
      console.log("Auto-sync resumed: queued changes go once edits settle.");
    } else {
      console.log("Usage: autosync.mjs start | status | pause | resume | log [n] | stop | run");
      process.exitCode = 1;
    }
  } catch (err) {
    // A session start must never fail on this.
    console.log(`Auto-sync: ${command} failed (${err.message}).`);
  }
}
