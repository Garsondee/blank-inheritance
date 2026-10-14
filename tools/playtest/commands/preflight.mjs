/**
 * pt preflight [--no-gpu]
 *
 * Everything that must be true before a run starts, as one list of PASS / WARN / FAIL (design/playtest-process.md, Phase 0). Reads and
 * measures; changes nothing. Exit 1 on any FAIL.
 */

import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statfsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { parseArgs } from "../core/args.mjs";
import { buildLocal } from "../foundry/build.mjs";
import { foundryStatus } from "../foundry/launch.mjs";
import { listSnapshots } from "../foundry/snapshots.mjs";
import { plantedNow } from "../foundry/seeds.mjs";
import { worldExists } from "../foundry/bootstrap.mjs";
import { CHROME, FOUNDRY_APP, FOUNDRY_ROOT, HUB_URL, PT_DIR, REPO } from "../paths.mjs";

const execFileAsync = promisify(execFile);

/**
 * The row for "is the playtest copy the working tree?". While seeded defects are planted it cannot be (that is what planting does), so a
 * difference then is a warning that says why, not a failure that stops the shakedown the defects are for.
 */
export function copyCurrentRow({ current, planted = [], stampId = null }) {
  if (current) return { level: "PASS", detail: `build ${stampId ?? "?"}` };
  if (planted.length) return { level: "WARN", detail: "differs from the tree, as it must while defects are planted (pt seed restore puts it back; check again then)" };
  return { level: "FAIL", detail: "BEHIND: run pt build" };
}

/** A settings file that lets the playtest CLI run without a permission prompt for each of seven agents. */
export function allowlistPresent(settingsText) {
  try {
    const allow = JSON.parse(settingsText)?.permissions?.allow ?? [];
    return allow.some((rule) => /tools\/playtest\/pt\.mjs/.test(rule));
  } catch {
    return false;
  }
}

async function gpuLoad() {
  try {
    const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", "$s=(Get-Counter '\\GPU Engine(*engtype_3D)\\Utilization Percentage' -SampleInterval 1 -MaxSamples 2).CounterSamples; ($s | Measure-Object CookedValue -Sum).Sum / 2"], { timeout: 20000 });
    return Number(stdout.trim());
  } catch {
    return null;
  }
}

export async function run(argv) {
  const { flags } = parseArgs(argv);
  const rows = [];
  const add = (level, name, detail = "") => rows.push({ level, name, detail });

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  add(nodeMajor >= 20 ? "PASS" : "FAIL", "Node 20 or newer", process.versions.node);
  add(existsSync(CHROME) ? "PASS" : "FAIL", "Chrome", CHROME);
  add(existsSync(path.join(FOUNDRY_APP, "main.js")) ? "PASS" : "FAIL", "Foundry application", FOUNDRY_APP);
  add(existsSync(path.join(FOUNDRY_ROOT, "Config", "license.json")) ? "PASS" : "FAIL", "Foundry licence in the playtest data root");
  const free = statfsSync(REPO);
  const freeGb = (free.bavail * free.bsize) / 1024 ** 3;
  add(freeGb >= 10 ? "PASS" : "FAIL", "Disk space", `${freeGb.toFixed(0)} GB free`);
  const ramGb = os.freemem() / 1024 ** 3;
  add(ramGb >= 14 ? "PASS" : ramGb >= 8 ? "WARN" : "FAIL", "Memory free (seven browsers take about 9 GB)", `${ramGb.toFixed(1)} GB free`);
  if (!flags["no-gpu"]) {
    const gpu = await gpuLoad();
    add(gpu === null ? "WARN" : gpu < 25 ? "PASS" : gpu < 60 ? "WARN" : "FAIL", "GPU not busy (she games on this machine; seven seats take about 45% of it)", gpu === null ? "could not read the counter" : `${gpu.toFixed(0)}% in use now`);
  }

  add(worldExists() ? "PASS" : "FAIL", "Playtest world manifest");
  const snaps = await listSnapshots();
  add(snaps.some((s) => s.name === "provisioned") ? "PASS" : "FAIL", "A 'provisioned' snapshot (the clean start of every run)", snaps.length ? snaps.map((s) => s.name).join(", ") : "none: provision the world and snapshot it");
  const planted = plantedNow();
  add(planted.length ? "WARN" : "PASS", "No seeded defects planted", planted.length ? `PLANTED: ${planted.join(", ")} (pt seed restore, or pt build)` : "clean");

  try {
    const built = await buildLocal({ dryRun: true, art: false, log: () => {} });
    const row = copyCurrentRow({ current: built.current, planted, stampId: built.stamp?.id });
    add(row.level, "The playtest copy is current with this working tree", row.detail);
  } catch (error) {
    add("FAIL", "The playtest copy can be compared with the tree", error.message);
  }

  const foundry = await foundryStatus();
  add(foundry.up && foundry.active ? "PASS" : "FAIL", "Foundry (playtest) running with its world", foundry.up ? `world ${foundry.world}, ${foundry.usersActive ?? "?"} user(s) connected` : "not running (the app's foundry-playtest preview, or pt foundry start)");
  if (foundry.up && Number(foundry.users ?? foundry.usersActive ?? 0) > 0) add("WARN", "Nobody is connected to the world yet", `${foundry.users ?? foundry.usersActive} connected: a second login as the same user bumps the first off`);
  try {
    const response = await fetch(`${HUB_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
    const hub = await response.json();
    add("PASS", "The hub is answering (control room)", hub.run ? `a run is in progress: ${hub.run.name}` : HUB_URL);
  } catch {
    add("FAIL", "The hub is answering (control room)", `not at ${HUB_URL}: start the app's playtest-hub preview`);
  }

  const personas = path.join(PT_DIR, "personas");
  const need = ["personas.json", "_rules.md", "_rules-gm.md", "gm.md", "caster.md", "brute.md", "rules-lawyer.md", "lateral-thinker.md", "quiet-one.md", "chaos-agent.md"];
  const missing = need.filter((f) => !existsSync(path.join(personas, f)));
  add(missing.length ? "FAIL" : "PASS", "Persona briefs and table rules", missing.length ? `missing: ${missing.join(", ")}` : `${need.length} files`);
  const agents = ["playtest-player.md", "playtest-gm.md", "playtest-scribe.md"].filter((f) => !existsSync(path.join(REPO, ".claude", "agents", f)));
  add(agents.length ? "FAIL" : "PASS", "Agent definitions (.claude/agents)", agents.length ? `missing: ${agents.join(", ")}` : "player, gm, scribe");
  const assets = existsSync(path.join(PT_DIR, "assets")) ? readdirSync(path.join(PT_DIR, "assets")).filter((f) => /\.(png|txt)$/.test(f)) : [];
  add(assets.includes("portrait-1.png") ? "PASS" : "FAIL", "Test files for the upload verb", assets.join(", ") || "none: pt init");

  const settingsFile = path.join(REPO, ".claude", "settings.json");
  const allowed = existsSync(settingsFile) && allowlistPresent(readFileSync(settingsFile, "utf8"));
  add(allowed ? "PASS" : "WARN", "The playtest CLI is pre-approved for agents (no permission prompt per command)", allowed ? "allow rule present" : `no allow rule for \`node tools/playtest/pt.mjs\` in .claude/settings.json: unattended agents would stall on prompts (see tools/playtest/README.md)`);

  for (const r of rows) console.log(`${r.level.padEnd(5)} ${r.name}${r.detail ? `  -  ${r.detail}` : ""}`);
  const fails = rows.filter((r) => r.level === "FAIL").length;
  const warns = rows.filter((r) => r.level === "WARN").length;
  console.log(`\n${fails ? `NOT READY: ${fails} failure(s)` : "READY"}${warns ? `, ${warns} warning(s)` : ""}.`);
  return fails ? 1 : 0;
}
