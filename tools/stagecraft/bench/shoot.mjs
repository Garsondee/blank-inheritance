/**
 * Pictures of the Stagecraft bench (tools/stagecraft/bench/), taken in headless Chrome with a real graphics card at
 * 1920 x 1080, after scripted moments: what the GM's strip would do, done through `window.bench`.
 *
 *   py tools/induction-terminal/serve.py 4192        (in another terminal)
 *   node tools/stagecraft/bench/shoot.mjs [--port=4192] [--out=design/stagecraft/lab/shots/bench] [--only=name]
 *
 * Each shot is a stage, a few steps (each a line of script run in the page) and a wait. The pictures land in --out,
 * which is gitignored with the rest of lab/shots (they show Ingram's art).
 */

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const port = args.get("port") ?? 4192;
const out = path.resolve(repo, args.get("out") ?? "design/stagecraft/lab/shots/bench");
const only = args.get("only") ?? null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The shots: [name, stage, party size, [[script, wait ms], ...]]. The picture is taken after the last step. */
export const SHOTS = [
  ["lantern-life", "haunt-the-paper-lantern", 4, [["0", 5000]]],
  ["lantern-moment", "haunt-the-paper-lantern", 4, [["bench.moment('sanzo-takes-the-floor')", 700], ["bench.moment('a-round')", 3200]]],
  ["lantern-huddle", "haunt-the-paper-lantern", 4, [["bench.formation('huddle')", 4200]]],
  ["tunnel-board", "e1-flood-tunnel", 4, [["bench.trigger('nest-wakes')", 3500]]],
  ["tunnel-grate", "e1-flood-tunnel", 4, [["bench.trigger('nest-wakes')", 2500], ["bench.moment('break-for-the-grate')", 3500]]],
  ["kit-queue", "e1-kit-issue", 5, [["bench.moment('line-up')", 4500]]],
  ["kit-nobu", "e1-kit-issue", 4, [["bench.moment('nobu-comes-round')", 4000]]],
  ["canteen-orders", "e1-canteen", 4, [["bench.moment('orders')", 4500]]],
  ["crew-mess", "haunt-crew-mess", 4, [["bench.moment('petr-sings')", 4500]]],
  ["bathhouse", "haunt-bathhouse", 4, [["bench.moment('hachi-tells-one')", 4500]]],
  ["intake-wait", "e1-intake-medicals", 4, [["bench.moment('sit-and-wait')", 1200], ["bench.moment('next-name')", 4000]]],
  ["exam", "e1-intake-medicals-exam", 3, [["bench.moment('shucks-examines')", 4000]]],
  ["errand-street", "e1-the-errand", 4, [["bench.moment('storekeeper-comes-out')", 4000]]],
  ["tea-house", "e1-the-errand-tea-house", 4, [["bench.moment('manako-behind-the-counter')", 4000]]],
  ["alley", "e1-the-errand-alley", 4, [["0", 3000]]],
  ["walk-down", "e1-the-walk-down", 4, [["bench.moment('walk-on')", 5500]]],
  ["assembly", "e1-assembly", 4, [["bench.moment('the-platform')", 2500], ["bench.moment('steps-up')", 3500]]],
  ["classroom", "e1-school-first-period", 4, [["0", 4500]]],
  ["specimen-room", "e1-school-second-period", 4, [["bench.moment('a-specimen')", 4000]]],
  ["hospital", "haunt-general-hospital", 4, [["0", 6000]]],
  ["early-night", "haunt-early-night", 4, [["bench.moment('count-in')", 5000]]],
  ["shrine", "haunt-shrine-gate", 4, [["bench.moment('mira-prays')", 5000]]],
  ["card-game", "haunt-card-game", 4, [["bench.moment('deal-everyone-in')", 5000]]],
  ["card-game-caught", "haunt-card-game", 4, [["bench.moment('lucan-caught')", 5000]]],
  ["rumour-mill", "haunt-rumour-mill", 4, [["bench.moment('round-the-notebook')", 5000]]],
  ["roof", "haunt-the-roof", 4, [["bench.moment('look-out')", 5500]]],
  ["met-office", "haunt-met-office", 4, [["bench.moment('the-reading')", 4500]]],
  ["night-shift", "haunt-night-shift", 4, [["bench.moment('a-lift')", 4500]]],
  ["magic-show", "haunt-the-magic-show", 4, [["bench.moment('the-show-begins')", 5500]]]
];

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
});
mkdirSync(out, { recursive: true });
try {
  for (const [name, stage, party, steps] of SHOTS) {
    if (only && !name.includes(only)) continue;
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(`http://localhost:${port}/tools/stagecraft/bench/?stage=${stage}&party=${party}&panel=0`, { waitUntil: "load" });
    await page.waitForFunction(() => window.bench?.ready, { timeout: 30000 });
    await sleep(1500);
    for (const [script, wait] of steps) {
      await page.evaluate(script);
      await sleep(wait);
    }
    const file = path.join(out, `${name}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 88 });
    console.log(`${errors.length ? "WARN" : "ok  "}  ${file}${errors.length ? `  ${errors.slice(0, 2).join(" | ")}` : ""}`);
    await page.close();
  }
} finally {
  await browser.close();
}
