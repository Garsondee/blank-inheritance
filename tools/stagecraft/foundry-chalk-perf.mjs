/**
 * How chalk feels to paint with in the REAL local Foundry (not the bench): the adventure's whole interface on the page,
 * Foundry's hooks and document system running, the journal being written to. The bench (bench/chalk-perf.mjs) measures
 * the module's host on its own and found nothing wrong while Ingram still found chalk laggy (2026-10-04), so this joins
 * the world as the GM, makes a test stage, takes a stick with a real click and paints with real mouse events.
 *
 *   node tools/stagecraft/foundry-chalk-perf.mjs [--tool=chalk] [--moves=400] [--dpr=1.5] [--w=2560 --h=1271]
 *       [--tier=low]       the light picture (no post-processing, no shadows, no multisampling)
 *       [--hideui]         hide everything on the page but the stage (separates the page's own cost from the stage's)
 *       [--cap=none]       let the stage draw at the display's rate, not Foundry's 60 a second
 *       [--trace]          also record a Chrome trace of one stroke and print where the main thread and the GPU spent it
 *       [--cpu=4]          slow the processor down fourfold
 *
 * It measures, per stroke: the frame interval, long tasks, the browser's own Event Timing for the pointer events (input
 * delay + our handlers + the wait until the next frame is shown: the latency a painter feels), the time spent in each of
 * the chalk's own calls, and how much the journal write at the end of a stroke costs. Nothing fails; it prints a table.
 */

import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installProbe, stageHost, boxPoint, viewportOf } from "./chalk-probe.mjs";
import { CAST, DESCRIPTION } from "./check-stage.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(args.get("w") ?? 2560);
const H = Number(args.get("h") ?? 1271);
const DPR = Number(args.get("dpr") ?? 1.5);
const MOVES = Number(args.get("moves") ?? 400);
const TOOLS = String(args.get("tool") ?? "chalk").split(",");
const OUT = path.join(repo, "design", "stagecraft", "lab", "shots");
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new",
  args: ["--hide-scrollbars", `--force-device-scale-factor=${DPR}`, `--window-size=${W},${H}`, "--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
  defaultViewport: { width: W, height: H, deviceScaleFactor: DPR }
});
const page = await browser.newPage();
await installProbe(page);
await page.evaluateOnNewDocument(() => { globalThis.__stagecraftSpeed = { settle: 3600000 }; });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));

let sceneId = null;
try {
  await page.goto("http://localhost:30000/join", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 30000 });
  await page.type('input[name="username"]', "Gamemaster");
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), page.$eval('button[name="join"]', (b) => b.click())]);
  await page.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await sleep(2500);
  if (args.get("tier")) await page.evaluate((t) => game.settings.set("stagecraft", "tier", t), String(args.get("tier")));
  if (args.get("cap") === "none") await page.evaluate(() => { game.settings.set("core", "maxFPS", 60); });

  const world = await page.evaluate(() => ({
    modules: game.modules.filter((m) => m.active).map((m) => m.id), users: game.users.filter((u) => u.active).length,
    dom: document.getElementsByTagName("*").length, fps: game.settings.get("core", "maxFPS"), mode: game.settings.get("core", "performanceMode")
  }));
  console.log(`world: ${world.modules.length} modules on (${world.modules.filter((m) => !["sf2e"].includes(m)).join(", ")}); ${world.users} connected; ${world.dom} DOM elements; Foundry fps cap ${world.fps}, mode ${world.mode}`);

  const description = { ...DESCRIPTION, chalk: { mode: "anywhere", box: DESCRIPTION.chalk.box } };
  sceneId = await page.evaluate(async (d, cast) => {
    const idle = async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); };
    await idle();
    for (const s of game.scenes.filter((x) => x.name === "Stagecraft test: chalk perf")) await s.delete();
    const stage = await Scene.create({ name: "Stagecraft test: chalk perf", flags: { stagecraft: { stage: d, published: { cards: cast, rev: 1 } } } });
    await stage.view();
    await idle();
    return stage.id;
  }, description, CAST);
  await stageHost(page);
  await sleep(3000);
  if (args.get("cap") === "none") await page.evaluate(() => { const p = globalThis.__chalkProbe.current().pace; p.cap = Infinity; });
  if (args.get("hideui")) await page.evaluate(() => { for (const el of document.body.children) if (!el.contains(document.getElementById("stagecraft-stage"))) el.style.display = "none"; for (const el of document.querySelectorAll("#interface, #ui-left, #ui-middle, #ui-right, #ui-top, #ui-bottom, #notifications, #hud")) el.style.display = "none"; });
  if (Number(args.get("cpu") ?? 1) > 1) { const cdp = await page.createCDPSession(); await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(args.get("cpu")) }); }

  const info = await page.evaluate(() => {
    const h = globalThis.__chalkProbe.current();
    const gl = h.backend.renderer?.getContext?.();
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return { backend: h.backend.name, tier: h.backend.tier, canvas: [h.backend.canvas.width, h.backend.canvas.height], gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "?", dpr: devicePixelRatio, cap: h.pace.cap, wall: [h.chalk.grid.w, h.chalk.grid.h] };
  });
  console.log(`stage: ${info.backend}/${info.tier}, canvas ${info.canvas.join("x")}, wall ${info.wall.join("x")}, dpr ${info.dpr}, cap ${info.cap}; ${info.gpu}`);

  /* ---- probes in the page ---- */
  await page.evaluate(() => {
    const P = (globalThis.__perf = { on: false, frames: [], long: [], events: [], spent: {}, calls: {}, saves: [] });
    let last = performance.now();
    P.timeline = []; P.marks = [];
    const loop = (t) => { if (P.on) { P.frames.push(t - last); if (t - last > 20) P.timeline.push({ at: t, gap: t - last, tiles: globalThis.__chalkProbe.current()?.chalk?.wall?.composite?.size ?? 0 }); } last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    try { new PerformanceObserver((list) => { if (P.on) for (const e of list.getEntries()) P.long.push(e.duration); }).observe({ entryTypes: ["longtask"] }); } catch { /* none */ }
    try {
      new PerformanceObserver((list) => { if (P.on) for (const e of list.getEntries()) if (e.name.startsWith("pointer")) P.events.push({ name: e.name, delay: e.processingStart - e.startTime, handlers: e.processingEnd - e.processingStart, total: e.duration }); })
        .observe({ type: "event", durationThreshold: 16, buffered: false });
    } catch { /* none */ }
    const wrap = (obj, name, label = name) => {
      const fn = obj?.[name];
      if (typeof fn !== "function") return;
      obj[name] = function (...a) {
        const t0 = performance.now();
        const out = fn.apply(this, a);
        if (P.on) { P.spent[label] = (P.spent[label] ?? 0) + performance.now() - t0; P.calls[label] = (P.calls[label] ?? 0) + 1; }
        return out;
      };
    };
    const h = globalThis.__chalkProbe.current();
    for (const n of ["extend", "hover", "begin"]) wrap(h.chalk, n);
    for (const n of ["begin", "end", "cancel"]) { const f = h.chalk[n].bind(h.chalk); h.chalk[n] = (...a) => { if (P.on) P.marks.push({ at: performance.now(), what: n, tiles: h.chalk.wall.composite.size }); return f(...a); }; }
    { const f = h.chalk.wall.commit.bind(h.chalk.wall); h.chalk.wall.commit = (...a) => { if (P.on) P.marks.push({ at: performance.now(), what: "commit", tiles: h.chalk.wall.composite.size }); return f(...a); }; }
    { const f = h.chalk.store.save.bind(h.chalk.store); h.chalk.store.save = async (...a) => { if (P.on) P.marks.push({ at: performance.now(), what: "save>" }); const r = await f(...a); if (P.on) P.marks.push({ at: performance.now(), what: "save<" }); return r; }; }
    wrap(h.chalk.wall, "paint", "wall.paint");
    wrap(h.chalk.wall, "flush", "wall.flush");
    wrap(h.chalk.wall, "commit", "wall.commit");
    wrap(h.backend, "draw", "backend.draw");
    wrap(h.backend, "pick", "backend.pick");
    wrap(h.backend, "paintingAt", "backend.paintingAt");
    wrap(h.backend, "setChalkTiles", "backend.setChalkTiles");
    wrap(h.chalk.kit ?? h.kit, "refresh");
    // how long a pointer sample waits before the frame that shows it starts, and what the graphics card spends on that frame
    P.pending = []; P.waits = []; P.gpu = []; P.queries = [];
    window.addEventListener("pointermove", (e) => {
      if (!P.on || !h.chalk?.drawing) return;
      const all = e.getCoalescedEvents?.() ?? [];
      for (const ev of all.length ? all : [e]) P.pending.push(ev.timeStamp);
    }, true);
    const gl = h.backend.renderer?.getContext?.();
    const timer = gl?.getExtension?.("EXT_disjoint_timer_query_webgl2");
    const draw = h.backend.draw.bind(h.backend);
    h.backend.draw = (snap) => {
      const t0 = performance.now();
      if (P.pending.length) { P.waits.push({ oldest: t0 - Math.min(...P.pending), newest: t0 - Math.max(...P.pending) }); P.pending = []; }
      let q = null;
      if (timer && P.on) { q = gl.createQuery(); gl.beginQuery(timer.TIME_ELAPSED_EXT, q); }
      const out = draw(snap);
      if (q) { gl.endQuery(timer.TIME_ELAPSED_EXT); P.queries.push(q); }
      const rest = [];
      for (const k of P.queries) {
        if (gl.getQueryParameter(k, gl.QUERY_RESULT_AVAILABLE)) { if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) P.gpu.push(gl.getQueryParameter(k, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(k); } else rest.push(k);
      }
      P.queries = rest;
      return out;
    };
    P.hasTimer = !!timer; P.gaps = []; P.speed = [];
    {
      const f = h.backend.draw;
      h.backend.draw = (snap) => {
        const d = h.chalk.drawing;
        if (P.on && d) {
          const dabs = h.chalk.wall.strokes.get(d.id)?.dabs;
          const last = dabs?.at(-1);
          const k = h.chalk.scale({ x: h.chalk.pointer?.x ?? 0, y: h.chalk.pointer?.y ?? 0 }) ?? 1;     // window px per wall px... inverted below
          if (last && d.at) P.gaps.push(Math.hypot(last.x - d.at.x, last.y - d.at.y) / k);
        }
        return f(snap);
      };
    }
    const store = h.chalk.store;
    const save = store.save.bind(store);
    store.save = async (...a) => { const t0 = performance.now(); const r = await save(...a); const bytes = JSON.stringify(a[1]?.tiles ?? {}).length + JSON.stringify(a[1]?.step ?? {}).length; if (P.on) P.saves.push({ ms: performance.now() - t0, bytes }); return r; };
    // time the page's own handlers on top of ours: every pointermove listener, in the capture phase at window, to the bubble at window
    window.addEventListener("pointermove", () => { P.__t = performance.now(); }, true);
    window.addEventListener("pointermove", () => { if (P.on && P.__t) { P.spent.pageMove = (P.spent.pageMove ?? 0) + performance.now() - P.__t; P.calls.pageMove = (P.calls.pageMove ?? 0) + 1; } }, false);
    // the journal's hooks, how long Foundry's own listeners take when a page of the chalk journal is written
    for (const name of ["updateJournalEntryPage", "createJournalEntryPage"]) {
      Hooks.on(name, () => { P.__j = performance.now(); });
    }
  });

  const stats = (xs) => {
    if (!xs.length) return { n: 0, p50: 0, p95: 0, p99: 0, max: 0 };
    const s = [...xs].sort((a, b) => a - b);
    const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
    return { n: s.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: s[s.length - 1] };
  };
  const f1 = (x) => x.toFixed(1).padStart(6);

  async function measure(label, act, { trace = false } = {}) {
    await page.evaluate(() => { const P = globalThis.__perf; P.frames = []; P.long = []; P.events = []; P.spent = {}; P.calls = {}; P.saves = []; P.waits = []; P.gpu = []; P.pending = []; P.timeline = []; P.marks = []; P.gaps = []; P.on = true; });
    if (trace) await page.tracing.start({ categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "v8.execute", "gpu", "viz", "cc", "blink", "toplevel", "input"] });
    const t0 = Date.now();
    await act();
    await sleep(900);
    const wall = Date.now() - t0;
    const r = await page.evaluate(() => { const P = globalThis.__perf; P.on = false; return { frames: P.frames, long: P.long, events: P.events, spent: P.spent, calls: P.calls, saves: P.saves, waits: P.waits, gpu: P.gpu, hasTimer: P.hasTimer, timeline: P.timeline, marks: P.marks, gaps: P.gaps }; });
    let traced = null;
    if (trace) traced = JSON.parse((await page.tracing.stop()).toString());
    const f = stats(r.frames);
    const slow = r.frames.filter((x) => x > 20).length;
    const ev = r.events.filter((e) => e.name === "pointermove");
    const evTotal = stats(ev.map((e) => e.total));
    const evDelay = stats(ev.map((e) => e.delay));
    const evHandlers = stats(ev.map((e) => e.handlers));
    console.log(`\n${label}: ${wall} ms; frames ${f.n}  interval p50 ${f1(f.p50)} p95 ${f1(f.p95)} p99 ${f1(f.p99)} max ${f1(f.max)}  >20ms: ${slow}; long tasks ${r.long.length} (${r.long.reduce((a, b) => a + b, 0).toFixed(0)} ms, worst ${Math.max(0, ...r.long).toFixed(0)})`);
    console.log(`  pointermove events slower than 16 ms: ${ev.length}  total p50 ${f1(evTotal.p50)} p95 ${f1(evTotal.p95)} max ${f1(evTotal.max)}  | input delay p95 ${f1(evDelay.p95)} max ${f1(evDelay.max)}  | our+page handlers p95 ${f1(evHandlers.p95)} max ${f1(evHandlers.max)}`);
    console.log(`  spent: ${Object.entries(r.spent).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(0)}ms/${r.calls[k]}`).join(", ")}`);
    if (r.waits.length) {
      const o = stats(r.waits.map((w) => w.oldest));
      const n = stats(r.waits.map((w) => w.newest));
      console.log(`  a pointer sample waits for the frame that shows it: oldest in a frame p50 ${f1(o.p50)} p95 ${f1(o.p95)} max ${f1(o.max)} ms; newest p50 ${f1(n.p50)} p95 ${f1(n.p95)}  (${r.waits.length} frames with new paint)`);
    }
    if (r.gpu.length) {
      const g = stats(r.gpu);
      console.log(`  the graphics card's time for one stage frame (timer query): p50 ${f1(g.p50)} p95 ${f1(g.p95)} max ${f1(g.max)} ms over ${g.n} frames`);
    } else if (r.hasTimer === false) console.log("  (no GPU timer query in this browser)");
    if (r.gaps.length) {
      const g = stats(r.gaps);
      console.log(`  how far the paint's tip is behind the pointer (screen px, at each frame): p50 ${f1(g.p50)} p95 ${f1(g.p95)} max ${f1(g.max)}`);
    }
    if (r.timeline.length) {
      const t0 = (r.marks.find((m) => m.what === "begin") ?? r.marks[0] ?? { at: r.timeline[0].at }).at;
      const rel = (x) => Math.round(x - t0);
      console.log(`  slow frames (+ms from stroke start: gap, tiles on wall): ${r.timeline.map((x) => `+${rel(x.at)}: ${x.gap.toFixed(0)}ms/${x.tiles}t`).join("  ")}`);
      console.log(`  marks: ${r.marks.filter((m) => m.what !== "save>").map((m) => `${m.what} +${rel(m.at)}`).join("  ")}`);
    }
    if (r.saves.length) console.log(`  journal saves: ${r.saves.map((s) => `${s.ms.toFixed(0)} ms (${(s.bytes / 1024).toFixed(0)} KB)`).join(", ")}`);
    if (traced) summariseTrace(traced, label);
    return r;
  }

  /** Where a trace spent its time: self time by event name on the renderer's main thread, and the GPU thread's busy time. */
  function summariseTrace(trace, label) {
    const events = trace.traceEvents ?? trace;
    const names = new Map();
    for (const e of events) if (e.ph === "M" && e.name === "thread_name") names.set(`${e.pid}:${e.tid}`, e.args.name);
    const byThread = new Map();
    for (const e of events) {
      if (e.ph !== "X" || !(e.dur > 0)) continue;
      const key = `${e.pid}:${e.tid}`;
      if (!byThread.has(key)) byThread.set(key, []);
      byThread.get(key).push(e);
    }
    const report = (title, key, top = 14) => {
      const list = (byThread.get(key) ?? []).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
      const self = new Map();
      const stack = [];
      let first = Infinity;
      let lastEnd = 0;
      for (const e of list) {
        first = Math.min(first, e.ts);
        lastEnd = Math.max(lastEnd, e.ts + e.dur);
        while (stack.length && stack.at(-1).end <= e.ts) stack.pop();
        if (stack.length) stack.at(-1).child += e.dur;
        stack.push({ end: e.ts + e.dur, child: 0, e });
        e.__node = stack.at(-1);
      }
      for (const e of list) self.set(e.name, (self.get(e.name) ?? 0) + (e.dur - (e.__node?.child ?? 0)));
      const total = [...self.values()].reduce((a, b) => a + b, 0);
      console.log(`  [trace ${label}] ${title}: busy ${(total / 1000).toFixed(0)} ms of ${((lastEnd - first) / 1000).toFixed(0)} ms. self time: ${[...self].sort((a, b) => b[1] - a[1]).slice(0, top).map(([n, v]) => `${n} ${(v / 1000).toFixed(0)}`).join(", ")}`);
    };
    // the longest single events, with who ran them: the hitches, named
    const longest = (key, n = 10) => (byThread.get(key) ?? []).filter((e) => e.dur >= 3000 && !/^(RunTask|ThreadControllerImpl::RunTask|ThreadControllerImpl::DoWork|SequenceManager|MessagePumpForUI|Scheduler::RunTask|GPUTask)/.test(e.name)).sort((a, b) => b.dur - a.dur).slice(0, n)
      .map((e) => `${e.name}${e.args?.data?.functionName ? `(${e.args.data.functionName} ${String(e.args.data.url ?? "").split("/").pop()}:${e.args.data.lineNumber ?? ""})` : ""} ${(e.dur / 1000).toFixed(1)}ms@${((e.ts - (events.find((x) => x.ph === "X")?.ts ?? 0)) / 1000).toFixed(0)}`);
    const find = (re) => [...names].filter(([, n]) => re.test(n)).map(([k]) => k);
    // the renderer that has the page: the one whose main thread ran the most
    const mains = find(/^CrRendererMain$/).sort((a, b) => (byThread.get(b)?.length ?? 0) - (byThread.get(a)?.length ?? 0));
    if (mains[0]) { report("renderer main thread", mains[0]); console.log(`  [trace ${label}] longest main-thread events: ${longest(mains[0]).join("; ")}`); }
    for (const k of find(/^CrGpuMain$/)) { report("GPU process main", k, 8); console.log(`  [trace ${label}] longest GPU events: ${longest(k).join("; ")}`); }
    for (const k of find(/Compositor$/).slice(0, 3)) report(`compositor (${names.get(k)})`, k, 8);
  }

  /* ---- --breakdown: what the stage's own frame costs the graphics card, switching its parts off one at a time ---- */
  if (args.get("breakdown")) {
    const rows = await page.evaluate(async () => {
      const h = globalThis.__chalkProbe.current();
      const b = h.backend;
      const gl = b.renderer.getContext();
      const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
      const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
      const gpuMs = async (frames = 90) => {
        const out = [];
        const draw = b.draw.bind(b);
        let pending = [];
        b.draw = (snap) => {
          const q = gl.createQuery(); gl.beginQuery(timer.TIME_ELAPSED_EXT, q);
          const r = draw(snap);
          gl.endQuery(timer.TIME_ELAPSED_EXT); pending.push(q);
          pending = pending.filter((k) => { if (gl.getQueryParameter(k, gl.QUERY_RESULT_AVAILABLE)) { if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) out.push(gl.getQueryParameter(k, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(k); return false; } return true; });
          return r;
        };
        for (let i = 0; i < frames; i++) await nextFrame();
        await new Promise((r) => setTimeout(r, 120));
        b.draw = draw;
        out.sort((x, y) => x - y);
        return out.length ? out[Math.floor(out.length / 2)] : null;
      };
      const rows = [];
      const note = async (label, f) => { f?.(); await nextFrame(); await nextFrame(); const calls = (b.renderer.info.render.calls); rows.push({ label, ms: await gpuMs(), calls }); };
      const lights = []; b.scene.traverse((o) => { if (o.isLight) lights.push(o); });
      const shadowCasters = lights.filter((l) => l.castShadow);
      const meshes = []; b.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
      const info = { lights: lights.length, shadowLights: shadowCasters.length, meshes: meshes.length, size: [b.renderer.domElement.width, b.renderer.domElement.height], msaa: b.post?.target?.samples };
      await note("as it is");
      await note("no film grain pass", () => { b.post.grain.enabled = false; });
      await note("+ no bloom", () => { b.post.bloom.enabled = false; });
      await note("+ no shadow-casting lights", () => { for (const l of shadowCasters) l.castShadow = false; });
      for (const l of shadowCasters) l.castShadow = true; b.post.grain.enabled = true; b.post.bloom.enabled = true;
      await note("shadows only off", () => { for (const l of shadowCasters) l.castShadow = false; });
      for (const l of shadowCasters) l.castShadow = true;
      await note("bloom only off", () => { b.post.bloom.enabled = false; });
      b.post.bloom.enabled = true;
      await note("no post at all (straight to the canvas)", () => { b.__post = b.post; b.post = null; });
      b.post = b.__post;
      return { info, rows };
    });
    console.log("\nthe stage's frame on the graphics card (timer query, median of ~90 frames, nothing being painted):", JSON.stringify(rows.info));
    for (const r of rows.rows) console.log(`  ${r.label.padEnd(44)} ${r.ms?.toFixed(2).padStart(6)} ms   (${r.calls} draw calls)`);
    throw new Error("breakdown done");
  }

  /* ---- --prewarm: a throw-away stroke on a scratch wall first, to see whether the first real stroke's hitch is the graphics card meeting each kind of drawing for the first time ---- */
  if (args.get("prewarm")) {
    const t0 = Date.now();
    await page.evaluate(async () => {
      const h = globalThis.__chalkProbe.current();
      const { RasterWall, encodeTile } = await import("/modules/stagecraft/scripts/render/paint/wall.mjs");
      const { lineDabs } = await import("/modules/stagecraft/scripts/core/brush.mjs");
      const wall = new RasterWall({ grid: h.chalk.grid });
      wall.setMask(null);
      for (const [tool, magic] of [["chalk", null], ["magic", { glow: true, sparkle: true, rainbow: false }], ["eraser", null]]) {
        wall.begin({ id: tool, by: "warm", tool, colour: "#ffffff", magic });
        wall.paint(tool, lineDabs({ x: 200, y: 200, p: 0.8 }, { x: 600, y: 330, p: 0.8 }, { tool, size: 10, seed: 3 }));
        wall.flush();
        const changed = wall.commit(tool);
        wall.flush();
        for (const tiles of changed.values()) for (const canvas of tiles.values()) if (canvas) await encodeTile(canvas, true);
        await new Promise((r) => requestAnimationFrame(r));
      }
      wall.clear();
    });
    console.log(`prewarm: a scratch stroke with chalk, magic chalk and the eraser took ${Date.now() - t0} ms`);
  }

  /* ---- take a stick with a real click ---- */
  const stick = await boxPoint(page, "white");
  console.log("box:", JSON.stringify(stick));
  await page.mouse.move(stick.x, stick.y);
  await sleep(100);
  await page.mouse.down();
  await page.mouse.up();
  await sleep(500);
  console.log("in hand:", await page.evaluate(() => globalThis.__chalkProbe.current().chalk.inHand));

  // the wall: strokes across the open middle of the painting, clear of the kit (high on the left)
  const a = await viewportOf(page, 0.3, 0.42);
  const b = await viewportOf(page, 0.78, 0.5);
  await measure("hover (the ring only)", async () => {
    for (let i = 0; i <= MOVES; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / MOVES, a.y + ((b.y - a.y) * i) / MOVES);
  });
  let row = 0;
  for (const tool of TOOLS) {
    await page.evaluate((t) => globalThis.__chalkProbe.current().chalk.choose(t), tool);
    const y = 0.42 + (row++ % 5) * 0.05;     // below Foundry's permanent warning toast, which sits over the top left
    const p = await viewportOf(page, 0.26, y);
    const q = await viewportOf(page, 0.76, y + 0.05);
    const one = async () => {
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      for (let i = 1; i <= MOVES; i++) {
        const u = i / MOVES;
        await page.mouse.move(p.x + (q.x - p.x) * u, p.y + (q.y - p.y) * u + Math.sin(u * 18) * 30);
      }
      await page.mouse.up();
    };
    if (args.get("first")) {
      const n = Number(args.get("first"));
      await measure(`${tool}, first ${n} moves of a stroke`, async () => {
        await page.mouse.move(p.x, p.y);
        await page.mouse.down();
        for (let i = 1; i <= n; i++) await page.mouse.move(p.x + ((q.x - p.x) * i) / MOVES, p.y + ((q.y - p.y) * i) / MOVES + Math.sin((i / MOVES) * 18) * 30);
        await page.mouse.up();
      }, { trace: args.get("trace") === true });
      continue;
    }
    await measure(`${tool}, one long stroke`, one, { trace: args.get("trace") === true });
    // a quick scribble: several short strokes in a row, each one ending in a save (what a doodle really is)
    await measure(`${tool}, six short strokes`, async () => {
      for (let s = 0; s < 6; s++) {
        const x0 = p.x + s * 40;
        await page.mouse.move(x0, p.y + 120);
        await page.mouse.down();
        for (let i = 1; i <= 40; i++) await page.mouse.move(x0 + Math.sin(i / 4) * 40, p.y + 120 + i * 3);
        await page.mouse.up();
        await sleep(120);
      }
    });
  }
  const kept = await page.evaluate(() => {
    const h = globalThis.__chalkProbe.current();
    const entry = game.journal.find((e) => e.getFlag("stagecraft", "chalk") === true);
    const pages = Array.from(entry?.pages ?? []).map((pg) => JSON.stringify(pg.getFlag("stagecraft", "chalk") ?? {}).length);
    return { pages: pages.length, bytes: pages.reduce((x, y) => x + y, 0), tiles: h.chalk.wall.composite.size };
  });
  console.log(`\nthe chalk journal now: ${kept.pages} pages, ${(kept.bytes / 1024).toFixed(0)} KB; ${kept.tiles} tiles on the wall`);
  if (errors.length) console.log("page errors:", errors.slice(0, 4).join(" | "));
} finally {
  try { if (sceneId) await page.evaluate(async (id) => { await game.scenes.get(id)?.delete(); }, sceneId); } catch { /* the page may be gone */ }
  await sleep(500);
  await browser.close();
}
