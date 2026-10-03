/**
 * The chalk check: the module's real host, chalk controller and three.js wall (tools/stagecraft/bench/host.html, with an
 * in-memory store in place of the world journal), driven in headless Chrome with a real graphics card and real mouse
 * strokes. Found 2026-10-03: at the table, chalk could be picked up but left no mark; in a "zones only" scene a stroke
 * outside the chalk zones is clipped away to nothing, and nothing said so. This proves:
 *
 *   - a stick is taken from the box with a real click;
 *   - in a "zones only" scene (Kit Issue: the back wall), the chalk zone lights up and is named while chalk is in hand,
 *     a stroke outside it leaves nothing and the stick says so (faded, and a line by the pointer naming where chalk goes),
 *     and a stroke inside it leaves a visible mark on the wall;
 *   - in an "anywhere" scene (the Paper Lantern), a stroke anywhere on the painting leaves a visible mark.
 *
 *   node tools/stagecraft/bench/chalk-check.mjs        (starts its own little web server on port 4194)
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
  args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--window-size=1920,1080"],
  defaultViewport: { width: 1920, height: 1080 }
});

/** Open a stage as the GM and wait for it. */
async function open(stage) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=${stage}`);
  await page.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 });
  await sleep(1200);
  return { page, errors };
}

/** Where a point of the painting (fractions) is in the viewport. */
const viewportOf = (page, fx, fy) => page.evaluate(([x, y]) => {
  const b = window.bench.host.backend;
  return { x: (b.rig.map.x(x) - b.view.ox) * b.view.s, y: (b.rig.map.y(y) - b.view.oy) * b.view.s };
}, [fx, fy]);

/** A real stroke with the mouse, from one painting point to another, in small steps. */
async function stroke(page, from, to) {
  const a = await viewportOf(page, ...from);
  const b = await viewportOf(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) { await page.mouse.move(a.x + ((b.x - a.x) * i) / 16, a.y + ((b.y - a.y) * i) / 16); await sleep(16); }
  await page.mouse.up();
  await sleep(300);
}

/** How many strokes the wall shows, and how many of its pixels are drawn in a box of painting fractions. */
const wall = (page, box) => page.evaluate((bx) => {
  const w = window.bench.host.backend.chalkWall;
  const { ctx, cw, ch } = w.kept;
  const [x0, y0, x1, y1] = [bx[0] * cw, bx[1] * ch, bx[2] * cw, bx[3] * ch].map(Math.round);
  const data = ctx.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)).data;
  let inked = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 40) inked++;
  return { strokes: w.strokes.size, inked };
}, box);

/** Take a stick of chalk from the box with a real click on it. */
async function takeChalk(page) {
  const at = await page.evaluate(() => {
    const b = window.bench.host.backend;
    const stick = b.chalkBox.sticks[0];
    const v = stick.getWorldPosition(stick.position.clone());
    const p = b.project({ X: v.x, Y: v.y, Z: v.z });
    return { x: p.x, y: p.y };
  });
  await page.mouse.click(at.x, at.y);
  await sleep(200);
  return page.evaluate(() => window.bench.host.chalk.inHand);
}

try {
  /* a "zones only" scene */
  const kit = await open("e1-kit-issue");
  check("Kit Issue keeps chalk to its back wall (zones only)", await kit.page.evaluate(() => window.bench.host.chalk.policy().mode === "zones"));
  check("the chalk zone is not drawn while nobody holds chalk", await kit.page.evaluate(() => !/back-wall:(near|target)/.test(window.bench.host.backend.zones.key) && /back-wall:rest:0\.00/.test(window.bench.host.backend.zones.key)), await kit.page.evaluate(() => window.bench.host.backend.zones.key));
  const tool = await takeChalk(kit.page);
  check("a real click on the box puts a stick of chalk in hand", !!tool && tool !== "rub", String(tool));
  // the pointer over the floor, outside the back wall: the stick says it would leave no mark, and where chalk goes
  const floor = await viewportOf(kit.page, 0.3, 0.9);
  await kit.page.mouse.move(floor.x, floor.y);
  await sleep(250);
  const outside = await kit.page.evaluate(() => {
    const h = window.bench.host;
    const hint = h.root.querySelector(".stagecraft-chalk-hint");
    return { blocked: h.chalk.blocked, hint: hint && !hint.hidden ? hint.textContent : null, zones: h.backend.zones.key };
  });
  check("outside the chalk zone the stick says it will leave no mark", outside.blocked === true);
  check("and a line by the pointer names where chalk goes", /The wall over the bench/.test(outside.hint ?? ""), outside.hint ?? "(none)");
  check("while chalk is in hand the chalk zone is lit and named", /back-wall:(near|target)/.test(outside.zones), outside.zones);
  await stroke(kit.page, [0.25, 0.88], [0.4, 0.92]);
  const none = await wall(kit.page, [0.2, 0.8, 0.45, 1]);
  check("a stroke outside the chalk zone leaves nothing", none.strokes === 0 && none.inked === 0, JSON.stringify(none));
  await stroke(kit.page, [0.45, 0.205], [0.66, 0.245]);
  const mark = await wall(kit.page, [0.415, 0.19, 0.83, 0.262]);
  check("a stroke on the wall over the bench leaves a visible mark", mark.strokes >= 1 && mark.inked > 200, JSON.stringify(mark));
  const inside = await kit.page.evaluate(() => ({ blocked: window.bench.host.chalk.blocked, hint: window.bench.host.root.querySelector(".stagecraft-chalk-hint")?.hidden }));
  check("on the back wall the stick is ready and the hint gone", inside.blocked === false && inside.hint !== false, JSON.stringify(inside));
  check("no page threw (Kit Issue)", kit.errors.length === 0, kit.errors.slice(0, 2).join(" | "));
  await kit.page.close();

  /* an "anywhere" scene */
  const lantern = await open("haunt-the-paper-lantern");
  check("the Paper Lantern lets chalk go anywhere", await lantern.page.evaluate(() => window.bench.host.chalk.policy().mode === "anywhere"));
  await takeChalk(lantern.page);
  await stroke(lantern.page, [0.12, 0.3], [0.3, 0.42]);
  await stroke(lantern.page, [0.58, 0.28], [0.74, 0.36]);
  const graffiti = await lantern.page.evaluate(() => window.bench.host.backend.chalkWall.strokes.size);
  const left = await wall(lantern.page, [0.1, 0.28, 0.32, 0.44]);
  check("anywhere on the painting a stroke leaves a visible mark", graffiti >= 2 && left.inked > 200, `${graffiti} strokes, ${left.inked} pixels`);
  check("no page threw (the Paper Lantern)", lantern.errors.length === 0, lantern.errors.slice(0, 2).join(" | "));
  await lantern.page.screenshot({ path: path.join(repo, "design", "stagecraft", "lab", "shots", "bench", "chalk-lantern.jpg"), type: "jpeg", quality: 88 });
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
