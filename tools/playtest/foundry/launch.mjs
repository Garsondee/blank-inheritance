/**
 * Start, stop and ask about the playtest's Foundry server. It is a plain `node main.js --headless` aimed at the rig's own data root
 * (the same way `.claude/launch.json`'s foundry-local launches the other local world), on its own port, so it can never be mistaken
 * for, or collide with, the other one.
 *
 * A server started any other way (the app's preview, a terminal) is still found, by port, and stopped only if its command line
 * names this rig's data root: a Foundry that is not ours is never killed.
 */

import { execFile, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { FOUNDRY_MAIN, FOUNDRY_PORT, FOUNDRY_ROOT, FOUNDRY_URL, STATE_DIR, WORLD_ID } from "../paths.mjs";

const execFileAsync = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PID_FILE = path.join(STATE_DIR, "foundry.pid");
export const FOUNDRY_LOG = path.join(STATE_DIR, "foundry.log");

/** The arguments `node` is given. dataPath is absolute, with forward slashes, as Foundry's own options file writes it. */
export function foundryArgs({ world = WORLD_ID, port = FOUNDRY_PORT } = {}) {
  return [FOUNDRY_MAIN, `--dataPath=${FOUNDRY_ROOT.replace(/\\/g, "/")}`, `--port=${port}`, "--noupnp", "--headless", ...(world ? [`--world=${world}`] : [])];
}

/** What /api/status says, or {up:false}. A world is running when `active` is true. */
export async function foundryStatus(url = FOUNDRY_URL, timeoutMs = 3000) {
  try {
    const response = await fetch(`${url}/api/status`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { up: true, active: false, httpStatus: response.status };
    return { up: true, ...(await response.json()) };
  } catch {
    return { up: false, active: false };
  }
}

/** Wait until the server answers and (when `world` is true) has a world running. */
export async function waitForFoundry({ url = FOUNDRY_URL, world = true, timeoutMs = 180000, log = () => {} } = {}) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    const status = await foundryStatus(url);
    if (status.up && (!world || status.active)) return status;
    if (status.up !== last) log(status.up ? "  Foundry is answering; waiting for the world..." : "  waiting for Foundry...");
    last = status.up;
    await sleep(2000);
  }
  throw new Error(`Foundry did not come up${world ? " with a world" : ""} within ${Math.round(timeoutMs / 1000)}s (see ${FOUNDRY_LOG})`);
}

/** The process listening on a TCP port, from netstat, or null. */
export async function pidOnPort(port = FOUNDRY_PORT) {
  try {
    const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"], { maxBuffer: 16 * 1024 * 1024 });
    for (const line of stdout.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === "TCP" && parts[3] === "LISTENING" && parts[1].endsWith(`:${port}`)) return Number(parts[4]);
    }
  } catch {
    /* netstat unavailable: treated as "no process" */
  }
  return null;
}

/** The command line of a process (PowerShell's CIM), or "". */
export async function commandLineOf(pid) {
  try {
    const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}").CommandLine`], { maxBuffer: 1024 * 1024 });
    return stdout.trim();
  } catch {
    return "";
  }
}

/** Is this command line one of the rig's own Foundry servers? */
export const isOurFoundry = (commandLine) => commandLine.replace(/\\/g, "/").toLowerCase().includes(FOUNDRY_ROOT.replace(/\\/g, "/").toLowerCase());

/** Start the server detached, logging to .state/foundry.log, and wait for it. Refuses when the port is already answering. */
export async function startFoundry({ world = WORLD_ID, port = FOUNDRY_PORT, wait = true, log = () => {} } = {}) {
  if ((await foundryStatus(`http://localhost:${port}`)).up) throw new Error(`Something already answers on port ${port}. Stop it first (pt foundry stop).`);
  mkdirSync(STATE_DIR, { recursive: true });
  const out = openSync(FOUNDRY_LOG, "a");
  const child = spawn(process.execPath, foundryArgs({ world, port }), { detached: true, stdio: ["ignore", out, out], windowsHide: true });
  child.unref();
  closeSync(out);
  writeFileSync(PID_FILE, String(child.pid));
  log(`  started Foundry (pid ${child.pid}) on port ${port}${world ? `, world ${world}` : ""}`);
  return wait ? waitForFoundry({ url: `http://localhost:${port}`, world: Boolean(world), log }) : { up: false, pid: child.pid };
}

/** Stop the rig's own Foundry, however it was started. Returns what it did. */
export async function stopFoundry({ port = FOUNDRY_PORT, log = () => {} } = {}) {
  let pid = null;
  if (existsSync(PID_FILE)) pid = Number(readFileSync(PID_FILE, "utf8")) || null;
  const onPort = await pidOnPort(port);
  if (onPort) pid = onPort;
  if (!pid || !(await foundryStatus(`http://localhost:${port}`)).up) {
    rmSync(PID_FILE, { force: true });
    return { stopped: false, why: "nothing was running" };
  }
  const commandLine = await commandLineOf(pid);
  if (commandLine && !isOurFoundry(commandLine)) throw new Error(`Port ${port} belongs to a Foundry that is not the playtest's (${commandLine.slice(0, 120)}...). Not stopping it.`);
  try {
    process.kill(pid);
  } catch {
    /* already gone */
  }
  for (let i = 0; i < 30; i++) {
    if (!(await foundryStatus(`http://localhost:${port}`, 1000)).up) break;
    await sleep(500);
  }
  if ((await foundryStatus(`http://localhost:${port}`, 1000)).up) await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"]).catch(() => {});
  for (let i = 0; i < 20 && (await foundryStatus(`http://localhost:${port}`, 1000)).up; i++) await sleep(500);
  if ((await foundryStatus(`http://localhost:${port}`, 1000)).up) throw new Error(`Foundry (pid ${pid}) is still answering on port ${port}`);
  rmSync(PID_FILE, { force: true });
  log(`  stopped Foundry (pid ${pid})`);
  // LevelDB releases its lock a moment after the process ends.
  await sleep(1500);
  return { stopped: true, pid };
}
