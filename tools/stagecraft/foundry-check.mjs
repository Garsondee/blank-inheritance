/**
 * Check the Stagecraft module inside a real, running, local Foundry (http://localhost:30000), driving it from headless
 * Chrome with a real graphics card and REAL pointer events (the lesson of the Location Editor: calling handlers
 * directly proves the handler, not the tool).
 *
 *   node tools/stagecraft/foundry-check.mjs                run every check, print a report
 *   node tools/stagecraft/foundry-check.mjs --quick        skip the twenty scene switches
 *   node tools/stagecraft/foundry-check.mjs --keep         leave the test scenes and the test player in the world
 *   node tools/stagecraft/foundry-check.mjs --user=Anne    join as someone else (default Gamemaster)
 *   node tools/stagecraft/foundry-check.mjs --verbose      say what the chalk is doing at the awkward moments
 *
 * What it covers: the takeover and giving the canvas back; picking up a card, the wiggle, the bang and the marks; the
 * frame rate beside the real interface; a resize; a lost graphics context; the box of chalk as the GM (the strip's key, the
 * box and the kit clicked for real, painting, the zone's edge, the eraser, Ctrl+Z, colours and magic chalk, every stroke
 * read back out of the world's journal, and all of it again after a reload); a second, real player in a separate browser
 * (strokes seen as they are painted, each other's paint, erasers, Ctrl+Z, the GM's strip overriding the scene for everyone,
 * freeze, hide, undo, wipe); the flat picture (the same stage on a plain 2D canvas: pick up, wiggle, bang, chalk, and the
 * fall back to it when no graphics context can be made); then twenty scene switches that must leak nothing. It makes its
 * own test scenes and a test player, and puts the world's active scene back as it found it.
 *
 * The chalk checks are in chalk-checks.mjs and read the stage through chalk-probe.mjs (chalk has been painted since
 * 2026-10-03; chalk.md §11). bench/live-chalk-check.mjs runs the same chalk checks on the bench, without Foundry, so they
 * can be kept up with the module where no licensed Foundry is to hand.
 *
 * It needs the local Foundry running with the `stagecraft` module linked into its Data/modules (see
 * module/stagecraft/README.md), and puppeteer-core installed in module/stagecraft (npm install there).
 * It lives with the project, not the module, because it knows the adventure's paintings and portraits.
 */

import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installProbe, stageHost, chalkState } from "./chalk-probe.mjs";
import { CAST, DESCRIPTION } from "./check-stage.mjs";
import { gmChalk, wallNow, afterRebuild, afterReload, playerArrives, twoScreens, flatChalk, clickBar } from "./chalk-checks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");

const URL_ = "http://localhost:30000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SHOTS = path.join(repo, "design", "stagecraft", "lab", "shots");
mkdirSync(SHOTS, { recursive: true });

const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ the browser */

const logs = [];
const report = { checks: [], notes: [] };
let restore = null;     // the world's own active scene, to put back last of all (drawing it can log errors of its own: missing map tiles)
const check = (name, pass, detail = "") => { report.checks.push({ name, pass: !!pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

/**
 * The lit stage is what this check is about. A computer left on Automatic is tested for speed a moment after its stage comes
 * up, and may be moved to a lighter one; a machine busy with something else (a game on the same graphics card, say) would
 * change what is being checked. The tests of that test are in the bench (bench/health-check.mjs). The module's own bench seam
 * puts the test an hour off from the first moment of the page, so it is Automatic that is being checked, minus the test.
 */
const noSpeedTest = (p) => p.evaluateOnNewDocument(() => { globalThis.__stagecraftSpeed = { settle: 3600000 }; });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--js-flags=--expose-gc"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
});
const page = await browser.newPage();
await installProbe(page);           // before Foundry's own scripts, so it hears the stage being built (chalk-probe.mjs)
await noSpeedTest(page);
/** What a console message really says: an Error passed to console.error arrives as a bare handle, so ask it for its stack. */
async function describe(m) {
  let t = m.text();
  if (m.type() === "error" || m.type() === "warning") {
    // an error from Foundry's own code is not always `instanceof Error` here (another realm), so anything with a message counts
    const parts = await Promise.all(m.args().map((a) => a.evaluate((v) => (typeof v === "string" ? v : v && typeof v === "object" && (v.stack || v.message) ? String(v.stack || v.message) : "")).catch(() => "")));
    const extra = parts.filter(Boolean).join(" ");
    if (extra) t = extra.length > t.length ? extra : t;
  }
  return t;
}
page.on("console", async (m) => { const t = await describe(m); if (m.type() === "error" || m.type() === "warning" || /stagecraft|WebGL|context/i.test(t)) logs.push(`[${m.type()}] ${t.slice(0, 500)}`); });
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

async function join(name, p = page) {
  await p.goto(`${URL_}/join`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector('input[name="username"]', { timeout: 30000 });
  await p.type('input[name="username"]', name);
  await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), p.$eval('button[name="join"]', (b) => b.click())]);
  await p.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
}

async function ready(p = page) {
  await p.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await sleep(1500);
  // the adventure's periodic reminder can cover the page
  await p.evaluate(() => document.querySelectorAll(".application").forEach((el) => { if (el.textContent.includes("Sync campaign content now")) [...el.querySelectorAll("button")].find((b) => /not now|later|close/i.test(b.textContent))?.click(); }));
}

const grab = async (name, p = page) => { const f = path.join(SHOTS, `${name}.png`); await p.screenshot({ path: f, type: "png" }); return f; };
const shot = grab;

/* ------------------------------------------------------------------ helpers that work on any page (the GM's, or a player's) */

/** With --verbose, say what the chalk is doing at this moment. */
const trace = async (label, p = page) => {
  if (!args.get("verbose")) return;
  console.log(`  [${label}]`, JSON.stringify(await chalkState(p), (k, v) => (k === "composite" || k === "tiles3d" ? v?.length : v)));
};
/** Is the chalk journal in this person's Journal list? (the module hides it from players) */
const journalRow = (p) => p.evaluate(async () => {
  const entry = game.journal.find((x) => x.getFlag("stagecraft", "chalk") === true);
  await ui.journal.render({ force: true });
  await new Promise((r) => setTimeout(r, 500));
  const list = ui.journal.element;
  return { entry: !!entry, row: !!list?.querySelector(`[data-entry-id="${entry?.id}"]`), rows: list?.querySelectorAll("[data-entry-id]").length ?? -1 };
});
/** A point on a card where a real click on this page reaches the stage and picks that card. */
const whereOn = (p, id) => p.evaluate((cid) => {
  const h = game.modules.get("stagecraft").api.stage();
  const c = h.stage.cards.get(cid);
  for (let y = 320; y >= 40; y -= 12) {
    const pt = h.backend.project({ X: c.puppet.x, Y: y, Z: c.Z });
    if (document.elementFromPoint(pt.x, pt.y)?.tagName === "CANVAS" && h.backend.pick(pt.x, pt.y)?.id === cid) return pt;
  }
  return null;
}, id);
const cardOn = (p, id) => p.evaluate((cid) => {
  const h = game.modules.get("stagecraft").api.stage();
  const c = h.stage.cards.get(cid);
  return { holder: c.holder, grip: +c.grip.toFixed(2), x: Math.round(c.puppet.x), z: Math.round(c.Z), place: h.stage.placeOf(cid) };
}, id);
const sceneFlags = (p) => p.evaluate(() => canvas.scene?.flags?.stagecraft?.live ?? null);
/** The stage's picture: its own canvas, not the chalk kit's colour picker or the ring round the pointer (canvases too). */
const PICTURES = "#stagecraft-stage > canvas:not(.stagecraft-chalk-ring):not(.stagecraft-wet)";

try {
  /* -------------------------------------------------------------- 1. the module is there and enabled */
  await join(args.get("user") ?? "Gamemaster");
  await ready();
  check("the module is discovered by Foundry", await page.evaluate(() => !!game.modules.get("stagecraft")));
  let active = await page.evaluate(() => game.modules.get("stagecraft")?.active);
  if (!active) {
    await page.evaluate(async () => {
      const cfg = foundry.utils.deepClone(game.settings.get("core", "moduleConfiguration"));
      cfg.stagecraft = true;
      await game.settings.set("core", "moduleConfiguration", cfg);
    });
    await sleep(800);
    await page.reload({ waitUntil: "domcontentloaded" });
    try { await ready(); } catch { await join(args.get("user") ?? "Gamemaster"); await ready(); }
    active = await page.evaluate(() => game.modules.get("stagecraft")?.active);
  }
  check("the module is enabled in the world", active);
  check("its api is published", await page.evaluate(() => typeof game.modules.get("stagecraft")?.api?.version === "string"), await page.evaluate(() => game.modules.get("stagecraft")?.api?.version));
  if (!active) throw new Error("the module did not enable; see the console log below");


  /* -------------------------------------------------------------- 2. the skin and the scenes */
  // the adventure's own skin, the one drawn at the table (the sketchbook's copy of it in lab/ is out of date)
  const brassSource = readFileSync(path.join(repo, "module", "blank-inheritance", "scripts", "foundry", "stagecraft-brass-skin.mjs"), "utf8").replace(/^export const brass/m, "const brass");
  await page.evaluate((src) => { const brass = new Function(`${src}; return brass;`)(); game.modules.get("stagecraft").api.skins.register(brass); }, brassSource);
  check("a table can register its own skin through the api", await page.evaluate(() => game.modules.get("stagecraft").api.skins.list().includes("brass")));

  // Foundry refuses to switch scenes while a canvas is still loading, and redraws when the scene on screen is deleted, so
  // get onto a plain scene first, then clear out the old test scenes, then make the new stage scene. The scenes cleared out
  // must take their chalk pages with them: the last run's stage has its paint, and on a first run a scratch stage is given
  // a page of its own here, so there is always something to prove.
  const ids = await page.evaluate(async (description, cast) => {
    const idle = async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); };
    await idle();
    // what was the world's active scene before this run (a scene left over from an earlier run does not count)
    const active = game.scenes.active;
    const originalActive = active && !active.name.startsWith("Stagecraft test:") ? active.id : null;
    const olds = game.scenes.filter((x) => x.name.startsWith("Stagecraft test:"));
    const plain = olds.find((x) => x.name === "Stagecraft test: plain scene") ?? await Scene.create({ name: "Stagecraft test: plain scene" });
    await plain.view();
    await idle();
    const journal = () => game.journal.find((e) => e.getFlag("stagecraft", "chalk") === true);
    const chalkPagesOf = (id) => Array.from(journal()?.pages ?? []).filter((pg) => pg.getFlag("stagecraft", "chalk")?.scene === id).length;
    const doomed = olds.filter((x) => x.id !== plain.id);
    if (!doomed.some((s) => chalkPagesOf(s.id))) {
      const scratch = await Scene.create({ name: "Stagecraft test: scratch", flags: { stagecraft: { stage: description } } });
      // a scene that allows chalk has the GM's client make the chalk journal, if the world has none yet
      for (let i = 0; i < 50 && !journal(); i++) await new Promise((r) => setTimeout(r, 100));
      await journal()?.createEmbeddedDocuments("JournalEntryPage", [{ name: `chalk ${scratch.id} ${game.userId}`, type: "text", text: { content: "" }, flags: { stagecraft: { chalk: { v: 2, scene: scratch.id, by: game.userId, since: Date.now(), tiles: {}, history: {} } } } }]);
      doomed.push(scratch);
    }
    const doomedIds = doomed.map((s) => s.id);
    const pagesBefore = doomedIds.reduce((n, id) => n + chalkPagesOf(id), 0);
    for (const s of doomed) await s.delete();
    for (let i = 0; i < 50 && doomedIds.some((id) => chalkPagesOf(id)); i++) await new Promise((r) => setTimeout(r, 100));
    const pagesAfter = doomedIds.reduce((n, id) => n + chalkPagesOf(id), 0);
    await idle();
    const stage = await Scene.create({ name: "Stagecraft test: Paper Lantern", flags: { stagecraft: { stage: description, published: { cards: cast, rev: 1 } } } });
    await idle();
    return { stage: stage.id, plain: plain.id, pagesBefore, pagesAfter, originalActive };
  }, DESCRIPTION, CAST);
  report.notes.push(`deleting the old test scenes: ${ids.pagesBefore} chalk pages before, ${ids.pagesAfter} after`);
  check("deleting a scene takes its chalk pages with it", ids.pagesBefore > 0 && ids.pagesAfter === 0, `${ids.pagesBefore} before, ${ids.pagesAfter} after`);
  check("a scene with a stage description is recognised", await page.evaluate((id) => game.modules.get("stagecraft").api.scenes.isStage(game.scenes.get(id)), ids.stage));
  check("a plain scene is not", await page.evaluate((id) => !game.modules.get("stagecraft").api.scenes.isStage(game.scenes.get(id)), ids.plain));
  check("the description is understood without a complaint", await page.evaluate((id) => game.modules.get("stagecraft").api.scenes.describe(game.scenes.get(id)).problems.length === 0, ids.stage));

  /* -------------------------------------------------------------- 3. a plain scene is untouched */
  await page.evaluate((id) => game.scenes.get(id).view(), ids.plain);
  await page.waitForFunction((id) => canvas.scene?.id === id && canvas.ready && !canvas.loading, { timeout: 60000, polling: 250 }, ids.plain);
  await sleep(1000);
  const plainState = await page.evaluate(() => ({ board: canvas.app.view.style.display, started: canvas.app.ticker.started, ours: !!document.getElementById("stagecraft-stage"), ready: canvas.ready }));
  check("a plain scene is drawn by Foundry as always", plainState.board !== "none" && plainState.started && !plainState.ours && plainState.ready, JSON.stringify(plainState));
  await shot("foundry-1-plain");

  /* -------------------------------------------------------------- 4. the takeover */
  await page.evaluate(() => { window.__events = []; for (const h of ["bonk", "grab", "drop", "mark", "zone"]) Hooks.on(`stagecraft.${h}`, (e) => window.__events.push({ h, ...e })); });
  await page.evaluate((id) => game.scenes.get(id).view(), ids.stage);
  await page.waitForFunction(() => !!game.modules.get("stagecraft").api.stage(), { timeout: 60000 });
  await sleep(2500);
  const taken = await page.evaluate(() => {
    const api = game.modules.get("stagecraft").api.stage();
    const root = document.getElementById("stagecraft-stage");
    const r = root.getBoundingClientRect();
    return {
      boardDisplay: canvas.app.view.style.display, tickerStarted: canvas.app.ticker.started, canvasReady: canvas.ready, sceneViewed: canvas.scene?.name,
      root: [Math.round(r.width), Math.round(r.height)], canvases: document.querySelectorAll("canvas").length, cards: api.stage.cards.size,
      stats: api.backend.stats(), tier: api.backend.tier, interface: !!document.getElementById("interface") && getComputedStyle(document.getElementById("sidebar") ?? document.body).display !== "none"
    };
  });
  check("the stage scene is taken over: Foundry's own canvas is hidden and idle", taken.boardDisplay === "none" && taken.tickerStarted === false, JSON.stringify({ display: taken.boardDisplay, ticker: taken.tickerStarted }));
  check("our canvas fills the page", taken.root[0] >= 1900 && taken.root[1] >= 1000, taken.root.join("x"));
  check("Foundry still thinks the scene is drawn and ready", taken.canvasReady === true && taken.sceneViewed === "Stagecraft test: Paper Lantern");
  check("every card is on the stage", taken.cards === CAST.length, `${taken.cards} cards`);
  check("it draws with lights (draw calls and triangles)", taken.stats.calls > 40 && taken.stats.triangles > 5000, JSON.stringify(taken.stats));
  await shot("foundry-2-stage");

  /* -------------------------------------------------------------- 5. real pointer events: pick up, wiggle, bang */
  // Find a point on a card where a click really reaches the stage: the adventure's own deck, macro bar and Scene Runner
  // cover parts of the screen, and a click there belongs to them.
  const where = (id) => page.evaluate((cid) => {
    const h = game.modules.get("stagecraft").api.stage();
    const c = h.stage.cards.get(cid);
    for (let y = 320; y >= 40; y -= 12) {
      const p = h.backend.project({ X: c.puppet.x, Y: y, Z: c.Z });
      if (document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS" && h.backend.pick(p.x, p.y)?.id === cid) return p;
    }
    return null;
  }, id);
  const yumiko = await where("yumiko");
  await page.mouse.move(yumiko.x, yumiko.y);
  await sleep(150);
  check("a point on the card can be reached by the pointer", !!yumiko, JSON.stringify(yumiko));
  check("the pointer turns to a grabbing hand over a card", await page.evaluate(() => document.querySelector("#stagecraft-stage canvas").style.cursor === "grab"));
  await page.mouse.down();
  await sleep(500);
  const held = await page.evaluate(() => { const c = game.modules.get("stagecraft").api.stage().stage.cards.get("yumiko"); return { holder: c.holder, grip: c.grip }; });
  check("a real press picks the card up and the stick comes out", !!held.holder && held.grip > 0.5, JSON.stringify(held));
  await shot("foundry-3-held");
  // carry it out into the open stretch of bar between its neighbours, where a wiggle bumps nothing
  const etsuko = await where("etsuko");
  const tama = await where("tama");
  const open = (etsuko.x + tama.x) / 2 + 40;
  await page.mouse.move(open, yumiko.y, { steps: 18 });
  await sleep(700);
  // wiggle furiously: 3 swings a second, 55 px each way
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < 1500) {
    const t = (Date.now() - t0) / 1000;
    await page.mouse.move(open + 55 * Math.sin(2 * Math.PI * 3 * t), yumiko.y);
    if (i++ === 30) await shot("foundry-4-wiggle");
    await sleep(8);
  }
  const lean = await page.evaluate(() => game.modules.get("stagecraft").api.stage().stage.cards.get("yumiko").puppet.lean);
  report.notes.push(`lean at the end of the wiggle: ${lean.toFixed(1)} degrees`);
  // wind up, then charge at Tama and stop short of the far edge
  await page.mouse.move(open - 110, yumiko.y, { steps: 6 });
  await sleep(60);
  let banged = false;
  const target = tama.x - 30;
  for (let k = 1; k <= 24; k++) {
    await page.mouse.move(open - 110 + k * ((target - (open - 110)) / 24), yumiko.y);
    await sleep(10);
    if (!banged && await page.evaluate(() => window.__events.some((e) => e.h === "bonk" && (e.a === "tama" || e.b === "tama")))) { banged = true; await sleep(70); await shot("foundry-6-bang"); }
    if (k === 10) await shot("foundry-5-charge");
  }
  await sleep(700);
  await shot("foundry-6b-after");
  const bonks = await page.evaluate(() => window.__events.filter((e) => e.h === "bonk").map((e) => ({ a: e.a, b: e.b, speed: Math.round(e.speed) })));
  check("a real swing into another card is a bonk", bonks.some((b) => [b.a, b.b].includes("yumiko")), JSON.stringify(bonks));
  await page.mouse.up();
  await sleep(1500);
  const after = await page.evaluate(() => { const c = game.modules.get("stagecraft").api.stage().stage.cards.get("yumiko"); return { holder: c.holder, grip: +c.grip.toFixed(3) }; });
  check("letting go puts the stick away", after.holder === null && after.grip < 0.05, JSON.stringify(after));

  /* -------------------------------------------------------------- 6. marks and zones are subtle, and appear when a card is held */
  const sanzo = await where("nren");
  const noneAtRest = await page.evaluate(() => game.modules.get("stagecraft").api.stage().stage.snapshot({ viewer: game.userId }).marks.length);
  check("with nothing held, no marks are shown", noneAtRest === 0);
  await page.mouse.move(sanzo.x, sanzo.y);
  await page.mouse.down();
  await sleep(300);
  await page.mouse.move(sanzo.x + 80, sanzo.y + 10, { steps: 8 });
  await sleep(500);
  const marks = await page.evaluate(() => game.modules.get("stagecraft").api.stage().stage.snapshot({ viewer: game.userId }).marks.map((m) => ({ id: m.id, alpha: +m.alpha.toFixed(2), target: m.target })));
  check("picking a card up shows marks near it, at most five", marks.length > 0 && marks.length <= 5, JSON.stringify(marks));
  await shot("foundry-7-marks");
  await page.mouse.up();
  await sleep(1200);
  await shot("foundry-8-dropped");

  /* -------------------------------------------------------------- 7. Foundry's own interface still works over our stage */
  const ui = await page.evaluate(async () => {
    const before = document.querySelectorAll(".application").length;
    ui.sidebar?.activateTab?.("chat");
    await ChatMessage.create({ content: "Stagecraft check: chat still works over the stage" });
    await new Promise((r) => setTimeout(r, 500));
    return { chat: !!document.querySelector("#chat, .chat-log, [data-tab='chat']"), sidebar: !!document.getElementById("sidebar"), applications: before };
  });
  check("the sidebar and chat are still there over the stage", ui.chat && ui.sidebar);

  /* -------------------------------------------------------------- 7b. the box of chalk, on the GM's screen (chalk-checks.mjs) */
  const me = await page.evaluate(() => game.userId);
  const t = {
    check, gm: page, player: null, scene: ids.stage, gmId: me, playerId: null,
    shot: (name, p) => grab(`foundry-${name}`, p),
    trace,
    /** The wipe asks first, in Foundry's own dialog: answer it with a real click. */
    answerWipe: async (p) => {
      try { await p.waitForSelector('dialog.application [data-action="yes"]', { timeout: 10000 }); } catch { return false; }
      await sleep(300);
      await grab("foundry-15-chalk-wipe-asks", p);
      const yes = await p.evaluate(() => { const b = document.querySelector('dialog.application [data-action="yes"]'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await p.mouse.click(yes.x, yes.y);
      return true;
    }
  };
  await stageHost(page);
  const journal = await page.evaluate(() => { const e = game.journal.find((x) => x.getFlag("stagecraft", "chalk") === true); return { made: !!e, ownership: e?.ownership?.default ?? null }; });
  check("the chalk journal exists and every player owns it", journal.made && journal.ownership === 3, `ownership ${journal.ownership}`);
  await gmChalk(t);

  /* -------------------------------------------------------------- 7b2. the picture survives a resize, a lost graphics context, and holds its frame rate */
  const fps = await page.evaluate(() => new Promise((resolve) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => { n++; const dt = performance.now() - t0; if (dt >= 3000) resolve(n / (dt / 1000)); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }));
  report.notes.push(`${fps.toFixed(0)} frames a second with the adventure's interface over the stage`);
  check("the stage holds a steady frame rate beside the real interface", fps >= 45, `${fps.toFixed(1)} fps`);

  await page.setViewport({ width: 1400, height: 800, deviceScaleFactor: 1 });
  await sleep(1000);
  const small = await page.evaluate(() => {
    const r = document.getElementById("stagecraft-stage").getBoundingClientRect();
    const b = game.modules.get("stagecraft").api.stage().backend;
    return { root: [Math.round(r.width), Math.round(r.height)], backend: [b.width, b.height], canvas: [b.canvas.clientWidth, b.canvas.clientHeight] };
  });
  check("a resized window resizes the stage with it", small.root[0] === 1400 && small.root[1] === 800 && small.backend[0] === 1400 && small.backend[1] === 800 && small.canvas[0] === 1400, JSON.stringify(small));
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await sleep(1000);

  const lostBefore = await wallNow(page);
  await page.evaluate(() => {
    const b = game.modules.get("stagecraft").api.stage().backend;
    window.__oldBackend = b;
    const gl = b.canvas.getContext("webgl2") ?? b.canvas.getContext("webgl");
    gl.getExtension("WEBGL_lose_context").loseContext();
  });
  await page.waitForFunction(() => { const st = game.modules.get("stagecraft").api.stage(); return st && st.backend !== window.__oldBackend && !!st.backend.world && !!st.backend.chalkTiles; }, { timeout: 30000, polling: 250 });
  await sleep(1500);
  const rebuilt = await page.evaluate((pictures) => {
    const st = game.modules.get("stagecraft").api.stage();
    return { cards: st.stage.cards.size, canvases: document.querySelectorAll(pictures).length, calls: st.backend.stats().calls, lost: st.backend.contextLost === true };
  }, PICTURES);
  check("a lost graphics context is recovered: the stage is rebuilt and draws again, with its cards", rebuilt.cards === CAST.length && rebuilt.canvases === 1 && rebuilt.calls > 40 && !rebuilt.lost, JSON.stringify(rebuilt));
  await afterRebuild(t, lostBefore);
  const again = await where("etsuko");
  await page.mouse.move(again.x, again.y);
  await sleep(250);
  check("and the pointer still finds a card on the new picture", await page.evaluate(() => game.modules.get("stagecraft").api.stage().backend.canvas.style.cursor === "grab"));

  /* -------------------------------------------------------------- 7c. the graffiti is still there after a reload (it persists between sessions) */
  const keptBefore = await wallNow(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  try { await ready(); } catch { await join(args.get("user") ?? "Gamemaster"); await ready(); }
  await page.evaluate((id) => game.scenes.get(id).view(), ids.stage);
  await stageHost(page);
  await sleep(1500);
  await afterReload(t, keptBefore);
  await shot("foundry-12-chalk-after-reload");

  /* -------------------------------------------------------------- 7d. a second person at the table: a real player, in their own browser */
  const playerName = "Stagecraft test player";
  const setup = await page.evaluate(async (sceneId, name, originalActive) => {
    let user = game.users.getName(name);
    if (!user) user = await User.create({ name, role: CONST.USER_ROLES.PLAYER });
    await game.scenes.get(sceneId).activate();
    return { userId: user.id, previous: originalActive };
  }, ids.stage, playerName, ids.originalActive);
  const context = await browser.createBrowserContext();
  const pp = await context.newPage();
  await pp.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await installProbe(pp);
  await noSpeedTest(pp);
  pp.on("console", async (m) => { const t = await describe(m); if (m.type() === "error" || m.type() === "warning" || /stagecraft/i.test(t)) logs.push(`[player ${m.type()}] ${t.slice(0, 500)}`); });
  pp.on("pageerror", (e) => logs.push(`[player pageerror] ${e.message}`));
  try {
    await join(playerName, pp);
    await ready(pp);
    await pp.evaluate(() => { for (const app of foundry.applications.instances.values()) app.close?.(); });
    await stageHost(pp);
    await sleep(1500);
    Object.assign(t, { player: pp, playerId: setup.userId });
    await playerArrives(t, await wallNow(page));
    const playerRow = await journalRow(pp);
    const gmRow = await journalRow(page);
    check("a player does not meet the chalk journal in their Journal list", playerRow.entry && !playerRow.row, JSON.stringify(playerRow));
    check("a GM still sees it there", gmRow.entry && gmRow.row, JSON.stringify(gmRow));
    // ---- held cards, on both screens
    await pp.bringToFront();
    const from = await whereOn(pp, "yumiko");
    check("a card can be reached on the player's screen", !!from, JSON.stringify(from));
    await pp.mouse.move(from.x, from.y);
    await sleep(150);
    await pp.mouse.down();
    await sleep(600);
    const seenByGm = await cardOn(page, "yumiko");
    check("a card a player picks up is held on the GM's screen too, with its stick out", seenByGm.holder === setup.userId && seenByGm.grip > 0.5, JSON.stringify(seenByGm));
    await pp.mouse.move(from.x - 330, from.y, { steps: 26 });
    await sleep(700);
    const heldHere = await cardOn(pp, "yumiko");
    const heldThere = await cardOn(page, "yumiko");
    check("and it follows the player's hand across the stage there", heldThere.x < seenByGm.x - 250 && Math.abs(heldThere.x - heldHere.x) < 90, `GM ${heldThere.x}, player ${heldHere.x}, started ${seenByGm.x}`);
    await shot("foundry-16-held-on-both");
    await pp.mouse.up();
    await sleep(2200);
    const droppedHere = await cardOn(pp, "yumiko");
    const droppedThere = await cardOn(page, "yumiko");
    check("put down, it rests in exactly the same place on both screens", droppedThere.holder === null && droppedHere.holder === null && JSON.stringify(droppedHere.place) === JSON.stringify(droppedThere.place), JSON.stringify(droppedThere.place));
    const savedPlace = await page.evaluate(() => canvas.scene.flags.stagecraft.published.cards.find((c) => c.id === "yumiko"));
    check("and the GM's screen saved where it landed, in the scene", JSON.stringify(savedPlace.at) === JSON.stringify(droppedThere.place.at), JSON.stringify(savedPlace));

    // ---- a card's menu (foundry/card-menu.mjs): a real right-click, the player's emotes going through the GM's screen
    const menuOn = (p) => p.evaluate(() => {
      const m = document.querySelector(".stagecraft-card-menu");
      if (!m) return null;
      const r = m.getBoundingClientRect();
      // on top of the adventure's interface, Foundry's windows and everything else: what the pointer would meet is the menu
      const onTop = [[0.5, 0.5], [0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]].every(([fx, fy]) => m.contains(document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy)));
      return { emotes: m.querySelectorAll(".menu-emote").length, actions: [...m.querySelectorAll(".menu-action")].map((b) => b.dataset.action), onTop };
    });
    await pp.bringToFront();
    const forMenu = await whereOn(pp, "yumiko");
    await pp.mouse.click(forMenu.x, forMenu.y, { button: "right" });
    await sleep(300);
    const playerMenu = await menuOn(pp);
    check("a player's right-click on a card they may hold opens its menu, with the emotes alone", playerMenu?.emotes === 30 && playerMenu.actions.length === 0, JSON.stringify(playerMenu));
    check("and it is on top of everything on the player's screen", playerMenu?.onTop === true);
    const wince = await (await pp.$('.stagecraft-card-menu [data-emote="wince"]')).boundingBox();
    await pp.mouse.click(wince.x + wince.width / 2, wince.y + wince.height / 2);
    await sleep(900);
    const chosen = await page.evaluate(() => canvas.scene.flags.stagecraft.published.cards.find((c) => c.id === "yumiko").emote);
    check("the emote the player picks is written on the card by the GM's screen", chosen?.id === "wince" && chosen.chosen === true, JSON.stringify(chosen));
    const showing = await Promise.all([page, pp].map((p) => p.evaluate(() => game.modules.get("stagecraft").api.stage().stage.snapshot().cards.find((c) => c.id === "yumiko").emote?.id ?? null)));
    check("and it is shown on both screens", showing[0] === "wince" && showing[1] === "wince", JSON.stringify(showing));
    await page.bringToFront();
    const forGm = await whereOn(page, "yumiko");
    await page.mouse.click(forGm.x, forGm.y, { button: "right" });
    await sleep(300);
    const gmMenu = await menuOn(page);
    check("the GM's right-click opens the same menu with the GM's things too", gmMenu?.emotes === 30 && JSON.stringify(gmMenu.actions) === JSON.stringify(["floor", "down", "choose"]), JSON.stringify(gmMenu));
    check("and it is on top of everything on the GM's screen, the adventure's interface included", gmMenu?.onTop === true);
    await page.keyboard.press("Escape");
    await sleep(150);
    check("and Escape closes it", (await menuOn(page)) === null);

    // hands off
    await page.bringToFront();
    await clickBar(page, "hands");
    await sleep(700);
    check("the GM's strip can switch hands off", (await chalkState(page)).strip.buttons[0] === "Hands off" && (await sceneFlags(page))?.handsOff === true, JSON.stringify(await sceneFlags(page)));
    await pp.bringToFront();
    const tamaP = await whereOn(pp, "tama");
    await pp.mouse.move(tamaP.x, tamaP.y);
    await sleep(100);
    await pp.mouse.down();
    await sleep(500);
    const refused = await cardOn(pp, "tama");
    await pp.mouse.up();
    check("with hands off a player cannot pick a card up", refused.holder === null && refused.grip < 0.1, JSON.stringify(refused));
    await page.bringToFront();
    const tamaG = await whereOn(page, "tama");
    await page.mouse.move(tamaG.x, tamaG.y);
    await sleep(100);
    await page.mouse.down();
    await sleep(500);
    const gmHolds = await cardOn(page, "tama");
    await page.mouse.up();
    await sleep(1200);
    check("but the GM still can", gmHolds.holder === me, JSON.stringify(gmHolds));
    await clickBar(page, "hands");
    await sleep(700);
    check("and hands come back on with one more press", (await sceneFlags(page))?.handsOff === false);

    // ---- two people reach for the same card at the same moment: the screens must agree on who has it
    const both = { g: await whereOn(page, "hiroshi"), p: await whereOn(pp, "hiroshi") };
    await page.bringToFront();
    await page.mouse.move(both.g.x, both.g.y);
    await pp.bringToFront();
    await pp.mouse.move(both.p.x, both.p.y);
    await sleep(200);
    await Promise.all([page.mouse.down(), pp.mouse.down()]);
    await sleep(900);
    const [gs, ps] = [await cardOn(page, "hiroshi"), await cardOn(pp, "hiroshi")];
    check("two people reach for one card at once: both screens agree who holds it", !!gs.holder && gs.holder === ps.holder, JSON.stringify({ gm: gs.holder, player: ps.holder }));
    // only the winner's hand carries it: both people now swing their mice, in opposite directions, and the card goes with one
    const winner = gs.holder === setup.userId ? pp : page;
    const loser = winner === pp ? page : pp;
    const [x0g, x0p] = [gs.x, ps.x];
    const at = winner === pp ? both.p : both.g;
    const lat = winner === pp ? both.g : both.p;
    await winner.bringToFront();
    await winner.mouse.move(at.x + 170, at.y, { steps: 14 });
    await loser.bringToFront();
    await loser.mouse.move(lat.x - 170, lat.y, { steps: 14 });
    await sleep(900);
    const [gm2, pl2] = [await cardOn(page, "hiroshi"), await cardOn(pp, "hiroshi")];
    check("and only the winner's hand carries it: it goes the way the winner went, on both screens", gm2.x > x0g + 80 && pl2.x > x0p + 80 && Math.abs(gm2.x - pl2.x) < 90, `GM ${x0g} -> ${gm2.x}, player ${x0p} -> ${pl2.x}`);
    await Promise.all([page.mouse.up(), pp.mouse.up()]);
    await sleep(1500);
    const [gf, pf] = [await cardOn(page, "hiroshi"), await cardOn(pp, "hiroshi")];
    check("and when they let go the card is free on both screens, in the same place", gf.holder === null && pf.holder === null && JSON.stringify(gf.place) === JSON.stringify(pf.place), JSON.stringify(gf.place));

    // ---- the hotkeys, by real key presses: they act on the card in the hand and on nothing else
    const watchVerbs = (q) => q.evaluate(() => { window.__verbs = new Set(); window.__verbTimer = setInterval(() => { for (const c of game.modules.get("stagecraft").api.stage().stage.cards.values()) { for (const v of c.puppet.verbs) window.__verbs.add(v.verb); if (c.puppet.turnTo) window.__verbs.add("turn"); } }, 4); });   // a turn is a state (back to the audience), not a timed verb
    const readVerbs = (q) => q.evaluate(() => { clearInterval(window.__verbTimer); return [...window.__verbs].sort(); });
    await page.bringToFront();
    await watchVerbs(page);
    await watchVerbs(pp);
    await page.keyboard.press("KeyX");
    await sleep(500);
    check("with no card in the hand, a hotkey does nothing to the stage", JSON.stringify(await page.evaluate(() => [...window.__verbs])) === "[]");
    const sanzoK = await whereOn(page, "sanzo");
    await page.mouse.move(sanzoK.x, sanzoK.y);
    await sleep(120);
    await page.mouse.down();
    await sleep(500);
    for (const key of ["Space", "KeyN", "KeyB", "KeyX", "KeyT"]) { await page.keyboard.press(key); await sleep(140); }
    await sleep(400);
    const [seenHere, seenThere] = [await readVerbs(page), await readVerbs(pp)];
    check("real key presses with a card in the hand make it hop, nod, bow, shake its head and turn its back", JSON.stringify(seenHere) === JSON.stringify(["bow", "hop", "nod", "shake", "turn"]), JSON.stringify(seenHere));
    check("and the other screen sees every one of them", JSON.stringify(seenThere) === JSON.stringify(seenHere), JSON.stringify(seenThere));
    await page.keyboard.press("KeyT");           // turn it back round
    await sleep(600);
    await page.mouse.up();
    await sleep(1200);

    // ---- chalk, the two of them (chalk-checks.mjs): live strokes, each other's paint, erasers, Ctrl+Z, the GM's strip
    await twoScreens(t);

    // the card the player moved is where they left it after a reload
    await page.bringToFront();
    await page.reload({ waitUntil: "domcontentloaded" });
    try { await ready(); } catch { await join(args.get("user") ?? "Gamemaster"); await ready(); }
    await page.evaluate((id) => game.scenes.get(id).view(), ids.stage);
    await stageHost(page);
    await sleep(1500);
    const afterReload = await cardOn(page, "yumiko");
    check("after a reload the card the player moved is still where they put it", JSON.stringify(afterReload.place.at) === JSON.stringify(droppedThere.place.at), JSON.stringify(afterReload.place));
  } finally {
    await context.close().catch(() => {});
    // the test player goes unless --keep; the world's active scene is put back at the very end (see `restore`)
    await page.evaluate(async (s, keep) => {
      if (!keep) { const user = game.users.get(s.userId); if (user) await user.delete(); }
    }, setup, !!args.get("keep")).catch(() => {});
    restore = { previous: setup.previous };
  }

  /* -------------------------------------------------------------- 7e. the flat picture: the same stage on a plain 2D canvas, for a weak machine */
  await page.bringToFront();
  const backToStage = async () => {
    await page.evaluate((id) => game.scenes.get(id).view(), ids.plain);
    await page.waitForFunction(() => !document.getElementById("stagecraft-stage") && canvas.ready && !canvas.loading, { timeout: 60000, polling: 250 });
    await page.evaluate((id) => game.scenes.get(id).view(), ids.stage);
    await page.waitForFunction(() => game.modules.get("stagecraft").api.stage()?.backend?.ready === true, { timeout: 60000, polling: 250 });
    await stageHost(page);
    await sleep(1500);
  };
  await page.evaluate(() => game.settings.set("stagecraft", "tier", "flat"));
  await backToStage();
  const flat = await page.evaluate((pictures) => {
    const h = game.modules.get("stagecraft").api.stage();
    const c = h.backend.canvas;
    return { name: h.backend.name, cards: h.stage.cards.size, views: h.backend.views.size, gl: !!(c.getContext("webgl2") ?? c.getContext("webgl")), canvases: document.querySelectorAll(pictures).length, draws: h.backend.stats().calls, hidden: canvas.app.view.style.display };
  }, PICTURES);
  check("the player can ask for the flat picture: one plain canvas, no graphics context, and Foundry's own canvas still hidden", flat.name === "flat" && !flat.gl && flat.canvases === 1 && flat.hidden === "none", JSON.stringify(flat));
  check("the flat stage draws every card", flat.views === CAST.length && flat.cards === CAST.length && flat.draws > 100, JSON.stringify(flat));
  await shot("foundry-16-flat-stage");
  const flatFps = await page.evaluate(() => new Promise((resolve) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else resolve(Math.round(n / 2)); }; requestAnimationFrame(f); }));
  report.notes.push(`${flatFps} frames a second on the flat stage`);

  // the pointer: pick up, wiggle (the stick and the lean are the feel, so they must survive), bang, put down
  const ren = await where("nren");
  check("a point on a card can be reached by the pointer on the flat stage", !!ren, JSON.stringify(ren));
  await page.mouse.move(ren.x, ren.y);
  await sleep(150);
  check("the pointer turns to a grabbing hand over a card on the flat stage", await page.evaluate(() => game.modules.get("stagecraft").api.stage().backend.canvas.style.cursor === "grab"));
  await page.mouse.down();
  await sleep(500);
  const flatHeld = await page.evaluate(() => { const c = game.modules.get("stagecraft").api.stage().stage.cards.get("nren"); return { holder: c.holder, grip: c.grip }; });
  check("a real press picks the card up on the flat stage and the stick comes out", !!flatHeld.holder && flatHeld.grip > 0.5, JSON.stringify(flatHeld));
  await page.mouse.move(ren.x + 40, ren.y - 20, { steps: 8 });
  await sleep(500);
  await shot("foundry-17-flat-held");
  // the lean is recorded inside the page, so slow round trips between here and the page do not blunt the wiggle
  await page.evaluate(() => { window.__leanMost = 0; window.__leanTimer = setInterval(() => { const l = Math.abs(game.modules.get("stagecraft").api.stage().stage.cards.get("nren").puppet.lean); if (l > window.__leanMost) window.__leanMost = l; }, 8); });
  const flatT0 = Date.now();
  while (Date.now() - flatT0 < 1500) {
    const t = (Date.now() - flatT0) / 1000;
    await page.mouse.move(ren.x + 40 + 55 * Math.sin(2 * Math.PI * 3 * t), ren.y - 20);
    await sleep(8);
  }
  const leanMost = await page.evaluate(() => { clearInterval(window.__leanTimer); return window.__leanMost; });
  // feel.md §3: a furious wiggle peaks at 3 to 9 degrees by design (it is a damped spring, so it never flies apart)
  check("a furious wiggle leans the card on the flat stage", leanMost > 4 && leanMost < 25, `${leanMost.toFixed(1)} degrees at the most`);
  await page.mouse.up();
  await sleep(1200);
  const flatAfter = await page.evaluate(() => { const c = game.modules.get("stagecraft").api.stage().stage.cards.get("nren"); return { holder: c.holder, grip: +c.grip.toFixed(3) }; });
  check("letting go puts the stick away on the flat stage", flatAfter.holder === null && flatAfter.grip < 0.05, JSON.stringify(flatAfter));

  // the bang: Sanzo winds up and charges at Hiroshi, along the same row of the bar (a swing across depths misses)
  const sz = await where("sanzo");
  const hs = await where("hiroshi");
  await page.mouse.move(sz.x, sz.y);
  await sleep(150);
  await page.mouse.down();
  await sleep(400);
  // the page was reloaded since the hooks of section 4 were set, so listen again
  await page.evaluate(() => { window.__events = []; Hooks.on("stagecraft.bonk", (e) => window.__events.push({ h: "bonk", ...e })); });
  await page.mouse.move(sz.x - 110, sz.y, { steps: 6 });
  await sleep(60);
  const stopAt = hs.x - 30;
  for (let k = 1; k <= 24; k++) {
    await page.mouse.move(sz.x - 110 + k * ((stopAt - (sz.x - 110)) / 24), sz.y);
    await sleep(10);
  }
  await sleep(300);
  await shot("foundry-17b-flat-bang");
  const flatBonks = await page.evaluate(() => window.__events.filter((e) => e.h === "bonk").map((e) => ({ a: e.a, b: e.b })));
  check("a real swing into another card is a bonk on the flat stage", flatBonks.some((x) => [x.a, x.b].includes("sanzo")), JSON.stringify(flatBonks));
  await page.mouse.up();
  await sleep(1200);

  // chalk on the flat stage (chalk-checks.mjs): the box clicked for real, paint in the picture, kept in the same journal
  await flatChalk(t);

  // a graphics context that cannot be made at all: the 3D picture falls through to the flat one, and says so
  await page.evaluate(() => game.settings.set("stagecraft", "tier", "auto"));
  await page.evaluate((id) => game.scenes.get(id).view(), ids.plain);
  await page.waitForFunction(() => !document.getElementById("stagecraft-stage") && canvas.ready && !canvas.loading, { timeout: 60000, polling: 250 });
  await page.evaluate(() => {
    window.__realGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /^webgl/.test(type) ? null : window.__realGetContext.call(this, type, ...rest); };
  });
  await page.evaluate((id) => game.scenes.get(id).view(), ids.stage);
  await page.waitForFunction(() => game.modules.get("stagecraft").api.stage()?.backend?.ready === true, { timeout: 60000, polling: 250 });
  await sleep(1000);
  const fallback = await page.evaluate((pictures) => { const h = game.modules.get("stagecraft").api.stage(); return { name: h.backend.name, cards: h.stage.cards.size, canvases: document.querySelectorAll(pictures).length }; }, PICTURES);
  await page.evaluate(() => { HTMLCanvasElement.prototype.getContext = window.__realGetContext; });
  check("with no graphics context to be had, the stage is drawn flat instead of not at all", fallback.name === "flat" && fallback.cards === CAST.length && fallback.canvases === 1, JSON.stringify(fallback));
  check("and the console says why", logs.some((l) => /the 3D picture could not start here; drawing the plain one/.test(l)));
  await shot("foundry-19-flat-fallback");
  await backToStage();
  const backToThree = await page.evaluate(() => game.modules.get("stagecraft").api.stage().backend.name);
  check("with the context available again, the next scene is drawn in 3D as before", backToThree === "three", backToThree);

  /* -------------------------------------------------------------- 8. twenty scene switches leave nothing behind */
  if (!args.get("quick")) {
    const samples = [];
    for (let n = 0; n < 20; n++) {
      await page.evaluate((id) => game.scenes.get(id).view(), ids.plain);
      await page.waitForFunction(() => !document.getElementById("stagecraft-stage") && canvas.ready, { timeout: 60000 });
      const plainNow = await page.evaluate(() => ({ display: canvas.app.view.style.display, started: canvas.app.ticker.started }));
      await page.evaluate((id) => game.scenes.get(id).view(), ids.stage);
      await page.waitForFunction(() => !!game.modules.get("stagecraft").api.stage()?.backend?.world, { timeout: 60000 });
      await sleep(250);
      const s = await page.evaluate(async () => { const h = game.modules.get("stagecraft").api.stage(); globalThis.gc?.(); await new Promise((r) => setTimeout(r, 50)); globalThis.gc?.(); return { stats: h.backend.stats(), canvases: document.querySelectorAll("canvas").length, roots: document.querySelectorAll("#stagecraft-stage").length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; });
      samples.push({ n, plainNow, ...s });
    }
    const first = samples[0];
    const last = samples[samples.length - 1];
    check("every switch to a plain scene gives Foundry's canvas back, visible and running", samples.every((s) => s.plainNow.display !== "none" && s.plainNow.started), `${samples.length} switches`);
    check("exactly one stage root and no stray canvases after twenty switches", samples.every((s) => s.roots === 1) && last.canvases <= first.canvases, `canvases ${first.canvases} -> ${last.canvases}`);
    check("GPU objects return to the same count each time (no leak)", last.stats.geometries === first.stats.geometries && last.stats.textures === first.stats.textures && last.stats.tracked === first.stats.tracked, `geometries ${first.stats.geometries} -> ${last.stats.geometries}, textures ${first.stats.textures} -> ${last.stats.textures}, tracked ${first.stats.tracked} -> ${last.stats.tracked}`);
    if (first.heap !== null) report.notes.push(`JS heap: ${first.heap} MB after the first switch, ${last.heap} MB after the twentieth`);
    check("the browser never warned about too many WebGL contexts", !logs.some((l) => /too many active webgl contexts/i.test(l)));
  }
} catch (err) {
  check("the run finished without an exception", false, err.stack ?? err.message);
} finally {
  // "JournalEntryPage ... does not exist" is a second GM connection (another session on this Foundry) clearing the same deleted
  // scene's chalk a moment before this one: harmless, and Foundry logs it itself
  // "Error creating WebGL context" is three.js saying so when the check takes the graphics context away on purpose
  // "Failed to load audio element ... blank-inheritance-audio/" is the adventure's music cue on the world's active scene: those
  // files live in the real server's data folder, not in a local test world's (and are not Stagecraft's to play)
  const errors = logs.filter((l) => /^\[(error|pageerror)\]/.test(l) && !/favicon|404|JournalEntryPage "[^"]+" does not exist|Error creating WebGL context|Failed to load audio element "blank-inheritance-audio\//.test(l));
  check("no errors in the console", errors.length === 0, errors.slice(0, 4).join(" | "));
  if (logs.length) console.log("\nconsole:\n" + logs.slice(0, 30).join("\n"));
  if (!args.get("keep")) {
    try { await page.evaluate(async () => { for (const s of game.scenes.filter((x) => x.name === "Stagecraft test: plain scene")) await s.delete(); }); } catch { /* the page may be gone */ }
  }
  console.log("\nnotes:", report.notes.join("; ") || "(none)");
  if (restore) {
    // put the world's active scene back as it was before the run (none, if it had none)
    try {
      await page.evaluate(async (previous) => {
        while (canvas.loading) await new Promise((r) => setTimeout(r, 100));
        if (previous) await game.scenes.get(previous)?.activate();
        else await game.scenes.active?.update({ active: false });
      }, restore.previous);
    } catch { /* the page may be gone */ }
  }
  const failed = report.checks.filter((c) => !c.pass);
  console.log(`\n${report.checks.length - failed.length}/${report.checks.length} checks passed`);
  await browser.close();
  process.exitCode = failed.length ? 1 : 0;
}
