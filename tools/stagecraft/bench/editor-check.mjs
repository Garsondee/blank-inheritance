/**
 * The staging editor, in a real browser with real mouse events (module.md §35): the GM presses Edit stage, the marks and the
 * corners of the zones become handles over the painting, and dragging them writes the new places into the scene's description.
 *
 *   - a player never has the button or the handles;
 *   - Edit stage shows a ring for each mark, a square for each corner, a dot for each zone, a diamond for each edge;
 *   - dragging a ring moves that mark, and only that mark, to where the pointer let go (the written place is the one the
 *     handle is now drawn at);
 *   - dragging a square reshapes the zone live (the outline follows the pointer) and writes it once on letting go;
 *   - dragging a zone's dot moves the whole zone, which stays inside the painting;
 *   - a double-click on a diamond adds a corner, on a square takes one away (never below three);
 *   - the stage drawn again from the new description keeps the handles on (a drop must not switch editing off).
 *
 *   node tools/stagecraft/bench/editor-check.mjs        (starts its own little web server on port 4195)
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const PORT = 4195;
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

const errors = [];
async function open(stage, { seat = "gm" } = {}) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=${stage}${seat === "player" ? "&seat=player" : ""}`);
  await page.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 });
  await sleep(1200);
  return page;
}

/** The middle of a handle on the page, in viewport pixels (the stage fills the window). */
const centre = (page, selector) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el || el.hidden) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, selector);

/** A real drag with the mouse, in small steps. */
async function drag(page, from, to, steps = 14) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) { await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps); await sleep(10); }
  await page.mouse.up();
  await sleep(400);
}

const stageFlags = (page) => page.evaluate(() => { const s = window.bench.scene.flags.stagecraft.stage; return { marks: s.marks, zones: s.zones }; });

try {
  /* ------------------------------------------------ a player has none of it */
  const player = await open("e1-kit-issue", { seat: "player" });
  check("a player has no Edit stage button and no handles", (await player.evaluate(() => !document.querySelector('[data-act="edit"]') && !document.querySelector(".stagecraft-editor"))));
  await player.close();

  /* ------------------------------------------------ the GM */
  const gm = await open("e1-kit-issue");
  check("the GM's strip has Edit stage, and the handles are off to begin with", (await gm.$('[data-act="edit"]')) !== null && (await gm.$(".stagecraft-editor")) === null);
  const before = await stageFlags(gm);
  await gm.$eval('[data-act="edit"]', (b) => b.click());
  await sleep(500);
  const counts = await gm.evaluate(() => ({
    marks: document.querySelectorAll(".stagecraft-editor .handle.mark").length,
    corners: document.querySelectorAll(".stagecraft-editor .handle.vertex").length,
    zones: document.querySelectorAll(".stagecraft-editor .handle.zone").length,
    edges: document.querySelectorAll(".stagecraft-editor .handle.edge").length,
    outlines: document.querySelectorAll(".stagecraft-editor polygon").length
  }));
  const wantCorners = before.zones.reduce((n, z) => n + z.shape.length, 0);
  check("Edit stage shows a ring per mark, a square per corner, a dot per zone, a diamond per edge, and an outline per zone",
    counts.marks === before.marks.length && counts.corners === wantCorners && counts.zones === before.zones.length && counts.edges === wantCorners && counts.outlines === before.zones.length, JSON.stringify(counts));
  check("and the button says it is pressed", await gm.evaluate(() => document.querySelector('[data-act="edit"]').getAttribute("aria-pressed") === "true"));

  /* a mark: dragged somewhere else */
  const mark0 = await centre(gm, '.stagecraft-editor .handle.mark[data-id="counter-1"]');
  const target = { x: mark0.x + 90, y: mark0.y - 40 };
  await drag(gm, mark0, target);
  const afterMark = await stageFlags(gm);
  const moved = afterMark.marks.find((m) => m.id === "counter-1");
  const wasMark = before.marks.find((m) => m.id === "counter-1");
  check("dragging a ring moves that mark, to the right and up as the pointer went", moved.at[0] > wasMark.at[0] + 0.01 && moved.at[1] < wasMark.at[1] - 0.01, `${wasMark.at} -> ${moved.at}`);
  check("and only that mark: the others are as they were", afterMark.marks.filter((m) => m.id !== "counter-1").every((m) => JSON.stringify(m) === JSON.stringify(before.marks.find((o) => o.id === m.id))));
  const handleNow = await centre(gm, '.stagecraft-editor .handle.mark[data-id="counter-1"]');
  check("the handle is drawn where the mark now is (where the pointer let go)", Math.abs(handleNow.x - target.x) < 12 && Math.abs(handleNow.y - target.y) < 12, `${JSON.stringify(handleNow)} vs ${JSON.stringify(target)}`);
  check("the stage drawn again keeps the handles on", (await gm.$(".stagecraft-editor")) !== null);

  /* a corner: reshaped, live, then written once */
  const corner = await centre(gm, '.stagecraft-editor .handle.vertex[data-id="back-wall"][data-index="2"]');
  const outlineBefore = await gm.evaluate(() => document.querySelector(".stagecraft-editor polygon").getAttribute("points"));
  await gm.mouse.move(corner.x, corner.y);
  await gm.mouse.down();
  for (let i = 1; i <= 10; i++) { await gm.mouse.move(corner.x + i * 6, corner.y + i * 4); await sleep(10); }
  const outlineLive = await gm.evaluate(() => document.querySelector(".stagecraft-editor polygon").getAttribute("points"));
  const writtenMid = (await stageFlags(gm)).zones[0].shape[2];
  await gm.mouse.up();
  await sleep(400);
  const afterCorner = await stageFlags(gm);
  check("while a corner is dragged the outline follows the pointer and nothing is written yet", outlineLive !== outlineBefore && JSON.stringify(writtenMid) === JSON.stringify(before.zones[0].shape[2]));
  check("on letting go the corner is written, and only that corner", JSON.stringify(afterCorner.zones[0].shape[2]) !== JSON.stringify(before.zones[0].shape[2]) && JSON.stringify(afterCorner.zones[0].shape.filter((_, i) => i !== 2)) === JSON.stringify(before.zones[0].shape.filter((_, i) => i !== 2)));

  /* the whole zone: dragged to the far corner of the painting, and kept in */
  const dot = await centre(gm, '.stagecraft-editor .handle.zone[data-id="back-wall"]');
  await drag(gm, dot, { x: 1900, y: 1060 }, 20);
  const afterZone = await stageFlags(gm);
  const all = afterZone.zones[0].shape;
  check("dragging a zone's dot moves the whole zone, and it stays inside the painting", all.every((p) => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1) && all[0][0] > afterCorner.zones[0].shape[0][0] + 0.02, JSON.stringify(all));

  /* corners added and taken away */
  const n0 = (await stageFlags(gm)).zones[0].shape.length;
  const edge = await centre(gm, '.stagecraft-editor .handle.edge[data-id="back-wall"][data-index="0"]');
  await gm.mouse.click(edge.x, edge.y, { clickCount: 2 });
  await sleep(500);
  check("a double-click on a diamond adds a corner there", (await stageFlags(gm)).zones[0].shape.length === n0 + 1);
  const square = await centre(gm, '.stagecraft-editor .handle.vertex[data-id="back-wall"][data-index="1"]');
  await gm.mouse.click(square.x, square.y, { clickCount: 2 });
  await sleep(500);
  check("a double-click on a square takes a corner away", (await stageFlags(gm)).zones[0].shape.length === n0);
  for (let i = 0; i < 4; i++) {
    const s = await centre(gm, '.stagecraft-editor .handle.vertex[data-id="back-wall"][data-index="0"]');
    await gm.mouse.click(s.x, s.y, { clickCount: 2 });
    await sleep(350);
  }
  check("but a zone keeps three corners", (await stageFlags(gm)).zones[0].shape.length === 3);

  /* off again */
  await gm.$eval('[data-act="edit"]', (b) => b.click());
  await sleep(300);
  check("pressing Edit stage again puts the handles away", (await gm.$(".stagecraft-editor")) === null);
  check("and the page threw no errors", errors.length === 0, errors.join(" | "));
  await gm.close();
} finally {
  await browser.close();
  server.kill();
}

const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
