/**
 * The performance check (2026-10-05 audit): what the lit stage asks of a real graphics card, proved in headless Chrome with the
 * module's real host and no Foundry. Not a timing test (a frame's milliseconds depend on whose computer it is); it counts what
 * the picture does:
 *
 *   - a still stage draws its shadow maps once, not at every frame (the draw calls of a frame fall by the shadow pass), and a
 *     card in a hand brings them back at every frame;
 *   - cards that come and go leave nothing on the graphics card: its geometries and textures return to what they were;
 *   - the picture is drawn within the pixel budget.
 *
 *   node tools/stagecraft/bench/perf-check.mjs           (starts its own little web server on port 4194)
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const PORT = 4194;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail = "") => { results.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const server = spawn("py", [path.join(repo, "tools", "induction-terminal", "serve.py"), String(PORT)], { stdio: "ignore" });
const up = async () => { try { return (await fetch(`http://127.0.0.1:${PORT}/`)).ok; } catch { return false; } };
for (let i = 0; i < 50 && !(await up()); i++) await sleep(200);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--window-size=1920,1080"],
  defaultViewport: { width: 1920, height: 1080 }
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern&seat=gm`);
  await page.bringToFront();
  await page.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 });
  await sleep(2500);                                   // the entrances are over; the stage is still

  /**
   * For every frame drawn over `ms`: did the shadow maps get drawn in it? The picture's own shadow pass is watched: it draws
   * (and so adds to the renderer's draw calls) only in a frame the shadows were asked for.
   */
  const record = (ms) => page.evaluate((ms) => new Promise((resolve) => {
    const b = window.host.backend;
    const map = b.renderer.shadowMap;
    const frames = [];
    const render = map.render.bind(map);
    let drew = false;
    map.render = (...args) => { const before = b.renderer.info.render.calls; render(...args); if (b.renderer.info.render.calls > before) drew = true; };
    const draw = b.draw.bind(b);
    b.draw = (snap) => { drew = false; draw(snap); frames.push(drew); };
    setTimeout(() => { b.draw = draw; map.render = render; resolve(frames); }, ms);
  }), ms);

  const stats = (frames) => ({ n: frames.length, shadowed: frames.filter(Boolean).length });

  /* the shadows */
  const lit = await page.evaluate(() => ({ shadows: window.host.backend.settings.shadows, auto: window.host.backend.renderer.shadowMap.autoUpdate }));
  check("the lit stage has its shadows, drawn on request and not at every frame", lit.shadows === true && lit.auto === false, JSON.stringify(lit));

  // a calm stage: nobody walking about their business, nobody hopping (a bouncy card's hop is real movement, and is drawn)
  await page.evaluate(() => {
    const h = window.host;
    h.stage.setLife(false);
    for (const c of h.stage.cards.values()) { c.person = { ...c.person, demeanour: "calm" }; c.walk = null; c.puppet.restX = c.puppet.x; }
  });
  await sleep(2500);
  const still = stats(await record(2500));
  check("a still stage has frames to look at", still.n >= 20, `${still.n} frames`);
  check("a still stage draws its shadow maps in almost none of them", still.shadowed <= Math.ceil(still.n * 0.2), `${still.shadowed} of ${still.n} frames`);

  // a card taken in hand: every frame moves it by many steps, so the shadow is drawn at every frame
  const held = await page.evaluate(() => {
    const id = [...window.host.stage.cards.keys()][0];
    window.host.stage.hold(id, "me");
    return id;
  });
  const moving = await page.evaluate((id, ms) => new Promise((resolve) => {
    const h = window.host;
    const b = h.backend;
    const map = b.renderer.shadowMap;
    const frames = [];
    const render = map.render.bind(map);
    let drew = false;
    map.render = (...args) => { const before = b.renderer.info.render.calls; render(...args); if (b.renderer.info.render.calls > before) drew = true; };
    const draw = b.draw.bind(b);
    const c = h.stage.cards.get(id);
    let x = c.puppet.x;
    b.draw = (snap) => { x += 6; h.stage.setHand(id, { x, z: c.Z }); drew = false; draw(snap); frames.push(drew); };
    setTimeout(() => { b.draw = draw; map.render = render; h.stage.release(id); resolve(frames); }, ms);
  }), held, 1200);
  const m = stats(moving);
  check("a card in a hand has its shadow drawn at almost every frame", m.n >= 8 && m.shadowed >= Math.floor(m.n * 0.9), `${m.shadowed} of ${m.n} frames`);

  await sleep(2500);
  const after = stats(await record(2000));
  check("and when it is put down the stage goes still again", after.shadowed <= Math.ceil(after.n * 0.2), `${after.shadowed} of ${after.n} frames`);

  /* cards that come and go leave nothing on the graphics card */
  const memory = await page.evaluate(async () => {
    const b = window.host.backend;
    const read = () => ({ geometries: b.renderer.info.memory.geometries, textures: b.renderer.info.memory.textures, tracked: b.tracker.size });
    const cycle = async (n) => {
      for (let i = 0; i < n; i++) {
        const id = `visitor${i}`;
        await b.addCard({ id, name: `Visitor ${i}`, colour: "#d96" });
        await new Promise((r) => setTimeout(r, 60));        // drawn at least once
        b.removeCard(id);
      }
      await new Promise((r) => setTimeout(r, 200));
    };
    await cycle(1);                                          // the shared things (brass, shapes) exist after the first
    await new Promise((r) => setTimeout(r, 300));
    const before = read();
    await cycle(8);
    const afterEight = read();
    return { before, afterEight };
  });
  check("eight cards that came and went leave no geometry on the graphics card", memory.afterEight.geometries <= memory.before.geometries, `${memory.before.geometries} -> ${memory.afterEight.geometries}`);
  check("nor any texture", memory.afterEight.textures <= memory.before.textures, `${memory.before.textures} -> ${memory.afterEight.textures}`);
  check("nor anything the picture still keeps a list of", memory.afterEight.tracked <= memory.before.tracked, `${memory.before.tracked} -> ${memory.afterEight.tracked}`);

  /* the pixel budget */
  const size = await page.evaluate(() => {
    const b = window.host.backend;
    return { w: b.width, h: b.height, ratio: b.ratio, pixels: b.width * b.height * b.ratio * b.ratio, budget: b.settings.maxPixels };
  });
  check("the picture is drawn within the pixel budget (or at one to one)", size.pixels <= size.budget * 1.001 || size.ratio <= 1, JSON.stringify(size));

  check("no page threw", errors.length === 0, errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
