/**
 * How does the stage run on a weak machine? Drives the local Foundry (http://localhost:30000) from headless Chrome with the
 * graphics card taken away (software rendering, SwiftShader) and the processor slowed down, draws the test stage at each
 * quality tier (Automatic too: on a machine with no graphics card it should pick the flat stage by itself), and measures the time it takes to start and the frame rate it holds. It answers renderer.md §11's open
 * question about what the six players will play on, with numbers instead of a guess.
 *
 *   node tools/stagecraft/weak-machine.mjs               software rendering at 1280 x 720, the processor at full speed and at a quarter
 *   node tools/stagecraft/weak-machine.mjs --hardware    the same table with the real graphics card, for comparison
 *   node tools/stagecraft/weak-machine.mjs --slow=6      slow the processor by this factor as the second row (default 4)
 *
 * It needs the scene "Stagecraft test: Paper Lantern", which tools/stagecraft/foundry-check.mjs leaves in the world, and
 * puppeteer-core (installed in module/stagecraft). It makes one scene of its own and deletes it again.
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "..", "..", "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");

const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hardware = !!args.get("hardware");
const slow = Number(args.get("slow") ?? 4);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new",
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1280,720", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
    ...(hardware ? ["--use-angle=d3d11", "--ignore-gpu-blocklist"] : ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])]
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const cdp = await page.createCDPSession();

try {
  await page.goto("http://localhost:30000/join", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 30000 });
  await page.type('input[name="username"]', "Gamemaster");
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), page.$eval('button[name="join"]', (b) => b.click())]);
  await page.waitForFunction(() => globalThis.game?.ready === true, { timeout: 180000 });
  await sleep(2000);

  const ids = await page.evaluate(async () => {
    const stage = game.scenes.find((s) => s.name === "Stagecraft test: Paper Lantern");
    if (!stage) return null;
    const idle = async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); };
    await idle();
    const plain = await Scene.create({ name: "Stagecraft weak machine: plain" });
    await plain.view();
    await idle();
    return { stage: stage.id, plain: plain.id };
  });
  if (!ids) throw new Error('the scene "Stagecraft test: Paper Lantern" is not in the world: run tools/stagecraft/foundry-check.mjs --keep first');

  const away = async () => {
    await page.evaluate((id) => game.scenes.get(id).view(), ids.plain);
    await page.waitForFunction(() => !document.getElementById("stagecraft-stage") && canvas.ready && !canvas.loading, { timeout: 180000, polling: 250 });
  };

  const rows = [];
  for (const rate of [1, slow]) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    for (const tier of ["auto", "high", "low", "flat"]) {
      await page.evaluate((t) => game.settings.set("stagecraft", "tier", t), tier);
      await away();
      const t0 = Date.now();
      await page.evaluate((id) => game.scenes.get(id).view(), ids.stage);
      await page.waitForFunction(() => game.modules.get("stagecraft").api.stage()?.backend?.ready === true, { timeout: 240000, polling: 200 });
      const loadMs = Date.now() - t0;
      await sleep(2500);
      const m = await page.evaluate(() => new Promise((resolve) => {
        const deltas = [];
        let last = performance.now();
        const stop = last + 4000;
        const f = (now) => {
          deltas.push(now - last); last = now;
          if (now < stop) requestAnimationFrame(f);
          else {
            const sorted = deltas.slice(1).sort((a, b) => a - b);
            const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
            resolve({ backend: game.modules.get("stagecraft").api.stage().backend.name, frames: sorted.length, fps: Math.round(sorted.length / ((now - (stop - 4000)) / 1000)), median: +at(0.5).toFixed(1), p95: +at(0.95).toFixed(1), worst: +sorted[sorted.length - 1].toFixed(1) });
          }
        };
        requestAnimationFrame(f);
      }));
      rows.push({ cpu: rate === 1 ? "full speed" : `${rate}x slower`, tier, ...m, loadSeconds: +(loadMs / 1000).toFixed(1) });
      console.log(JSON.stringify(rows[rows.length - 1]));
    }
  }
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  console.log(`\n${hardware ? "Real graphics card" : "Software rendering (no graphics card)"}, 1280 x 720\n`);
  console.log("| Processor | Tier | Drawn by | Frames a second | Median frame (ms) | Slowest 5% (ms) | Worst (ms) | Time to start (s) |");
  console.log("|---|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.cpu} | ${r.tier} | ${r.backend} | ${r.fps} | ${r.median} | ${r.p95} | ${r.worst} | ${r.loadSeconds} |`);
  if (errors.length) console.log("\npage errors:", errors.slice(0, 5).join(" | "));

  // put things back
  await page.evaluate((t) => game.settings.set("stagecraft", "tier", t), "auto");
  await away();
  await page.evaluate(async (id) => { await game.scenes.get(id)?.delete(); }, ids.plain);
} finally {
  await browser.close();
}
