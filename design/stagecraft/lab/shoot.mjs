/**
 * Screenshot every plate at Ingram's screen size (2560x1440 CSS px) with
 * headless Chrome, into shots/ (gitignored: the plates show her art).
 *
 *   python tools/induction-terminal/serve.py 4191     (serves the repo root)
 *   node design/stagecraft/lab/shoot.mjs [plate[:ms] ...]
 *
 * A plate:ms pair freezes every animation at that moment.
 */
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "shots");
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.LAB_URL ?? "http://localhost:4191/design/stagecraft/lab/index.html";
const DEFAULTS = ["debut", "variety", "ensemble:1150", "minis", "conversation", "gangup", "arrange", "zones:400", "plan"];

const run = (args) => new Promise((resolve, reject) =>
  execFile(CHROME, args, { timeout: 90000 }, (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(stdout))));

await mkdir(out, { recursive: true });
for (const spec of process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS) {
  // plate[:ms[:seed | key=value ...]], e.g. ensemble:2300, puppets:1320:script=1
  const [plate, ms, ...rest] = spec.split(":");
  const query = new URLSearchParams({ plate, shot: "1", w: "2560", h: "1440" });
  if (ms) query.set("t", ms);
  const extras = [];
  for (const part of rest) {
    const [k, v] = part.includes("=") ? part.split("=") : ["seed", part];
    query.set(k, v);
    extras.push(k === "seed" ? `s${v}` : `${k}${v}`);
  }
  const file = path.join(out, `${[plate, ms, ...extras].filter(Boolean).join("-")}.png`);
  await run([
    "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1", "--disable-gpu-vsync",
    "--window-size=2560,1440", "--virtual-time-budget=9000", "--run-all-compositor-stages-before-draw",
    `--screenshot=${file}`, `${BASE}?${query}`
  ]);
  console.log(file);
}
