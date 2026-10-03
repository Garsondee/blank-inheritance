/**
 * How smooth chalk is to paint with (Ingram, 2026-10-03: "Chalk is really good but very laggy"): the module's real host,
 * kit and wall on the bench (host.html), in headless Chrome with a real graphics card, at her GM window's size and pixel
 * density (2560 x 1271 at 1.5), with real mouse strokes sent as fast as Chrome takes them (a fast mouse). It measures the
 * frames while the pointer only moves (the ring round it) and while each tool paints, and the time the chalk's own code
 * takes, part by part.
 *
 *   node tools/stagecraft/bench/chalk-perf.mjs [--cpu=4] [--tools=chalk,brush] [--moves=500]
 *
 * --cpu slows the processor down by that factor, for a weaker machine than this one. It prints a table; nothing fails.
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const PORT = 4197;
const CPU = Number(args.get("cpu") ?? 1);
const MOVES = Number(args.get("moves") ?? 500);
const TOOLS = String(args.get("tools") ?? "chalk,magic,pencil,brush,spray,smudge,eraser").split(",");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn("py", [path.join(repo, "tools", "induction-terminal", "serve.py"), String(PORT)], { stdio: "ignore" });
const up = async () => { try { return (await fetch(`http://127.0.0.1:${PORT}/`)).ok; } catch { return false; } };
for (let i = 0; i < 50 && !(await up()); i++) await sleep(200);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--window-size=2560,1271"],
  defaultViewport: { width: 2560, height: 1271, deviceScaleFactor: 1.5 }
});

/** Probes in the page: frame intervals, long tasks, and time spent in the chalk's own calls. */
const PROBES = () => {
  const P = (window.__perf = { on: false, frames: [], long: [], spent: {}, calls: {} });
  let last = performance.now();
  const loop = (t) => { if (P.on) P.frames.push(t - last); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try { new PerformanceObserver((list) => { if (P.on) for (const e of list.getEntries()) P.long.push(e.duration); }).observe({ entryTypes: ["longtask"] }); } catch { /* no long tasks here */ }
  const wrap = (obj, name, label = name) => {
    const fn = obj[name];
    if (typeof fn !== "function") return;
    obj[name] = function (...a) {
      const t0 = performance.now();
      const out = fn.apply(this, a);
      if (P.on) { P.spent[label] = (P.spent[label] ?? 0) + performance.now() - t0; P.calls[label] = (P.calls[label] ?? 0) + 1; }
      return out;
    };
  };
  const h = window.bench.host;
  wrap(h.chalk, "extend");
  wrap(h.chalk, "hover");
  wrap(h.chalk, "begin");
  wrap(h.chalk, "end", "end (sync part)");
  // a stroke that never began is a measurement of nothing: count the strokes
  const begin = h.chalk.begin;
  h.chalk.begin = function (...a) { const ok = begin.apply(this, a); if (P.on && ok) P.strokes = (P.strokes ?? 0) + 1; return ok; };
  wrap(h.chalk.wall, "paint", "wall.paint");
  wrap(h.chalk.wall, "flush", "wall.flush");
  wrap(h.chalk.wall, "commit", "wall.commit");
  wrap(h.chalk, "encode", "encode (sync part)");
  wrap(h.backend, "draw", "backend.draw");
  wrap(h.backend, "setChalkTiles", "backend.setChalkTiles");
};

const stats = (xs) => {
  if (!xs.length) return { n: 0, p50: 0, p95: 0, max: 0 };
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, p50: q(0.5), p95: q(0.95), max: s[s.length - 1] };
};

async function measure(page, label, act) {
  await page.evaluate(() => { const P = window.__perf; P.frames = []; P.long = []; P.spent = {}; P.calls = {}; P.strokes = 0; P.on = true; });
  const t0 = Date.now();
  await act();
  await sleep(300);
  const wall = Date.now() - t0;
  const r = await page.evaluate(() => { const P = window.__perf; P.on = false; return { frames: P.frames, long: P.long, spent: P.spent, calls: P.calls, strokes: P.strokes }; });
  const f = stats(r.frames);
  const slow = r.frames.filter((x) => x > 34).length;
  const spent = Object.entries(r.spent).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(0)}ms/${r.calls[k]}`).join(", ");
  console.log(`${label.padEnd(14)} ${String(wall).padStart(6)}ms  strokes ${r.strokes}  frames ${String(f.n).padStart(4)}  p50 ${f.p50.toFixed(1).padStart(5)}  p95 ${f.p95.toFixed(1).padStart(6)}  max ${f.max.toFixed(0).padStart(5)}  >34ms ${String(slow).padStart(3)}  long tasks ${r.long.length} (${r.long.reduce((a, b) => a + b, 0).toFixed(0)}ms)`);
  console.log(`${"".padEnd(14)} ${spent}`);
}

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  if (CPU > 1) { const cdp = await page.createCDPSession(); await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU }); }
  await page.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern`);
  await page.waitForFunction(() => window.bench?.ready === true, { timeout: 60000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* fine */ } });
  await sleep(1500);
  await page.evaluate(PROBES);
  const at = (fx, fy) => page.evaluate(([x, y]) => { const b = window.bench.host.backend; return { x: (b.rig.map.x(x) - b.view.ox) * b.view.s, y: (b.rig.map.y(y) - b.view.oy) * b.view.s }; }, [fx, fy]);
  // take a stick of chalk from the box with a real click
  const stick = await page.evaluate(() => { const b = window.bench.host.backend; const t = b.chalkBox.sticks.find((s) => s.userData.chalk); const v = t.getWorldPosition(t.position.clone()); return b.project({ X: v.x, Y: v.y, Z: v.z }); });
  await page.mouse.click(stick.x, stick.y);
  await sleep(300);
  console.log(`CPU x${CPU}, ${MOVES} moves a stroke, 2560 x 1271 at 1.5; in hand: ${await page.evaluate(() => window.bench.host.chalk.inHand)}`);
  const a = await at(0.12, 0.3);
  const b = await at(0.42, 0.42);
  // the pointer only moves: the ring round it
  await measure(page, "hover", async () => {
    for (let i = 0; i <= MOVES; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / MOVES, a.y + ((b.y - a.y) * i) / MOVES);
  });
  let row = 0;
  for (const tool of TOOLS) {
    await page.evaluate((t) => window.bench.host.chalk.choose(t), tool);
    const y0 = 0.34 + (row++ % 6) * 0.06;                  // on the screen: the painting's top is raised off it
    const p = await at(0.24, y0);                          // clear of the kit, which stands high on the left
    const q = await at(0.74, y0 + 0.04);
    await measure(page, tool, async () => {
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      for (let i = 1; i <= MOVES; i++) {
        const u = i / MOVES;
        await page.mouse.move(p.x + (q.x - p.x) * u, p.y + (q.y - p.y) * u + Math.sin(u * 18) * 30);
      }
      await page.mouse.up();
    });
  }
  if (errors.length) console.log("page errors:", errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
