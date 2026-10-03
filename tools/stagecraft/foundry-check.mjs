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
 * frame rate beside the real interface; a resize; a lost graphics context; the box of chalk as the GM (drawing, the
 * zone's edge, the eraser, colours, persistence across a reload); and a second, real player in a separate browser (their
 * own chalk, other people's, the GM's strip overriding the scene for everyone, freeze, hide, undo, wipe); the flat picture
 * (the same stage on a plain 2D canvas: pick up, wiggle, bang, chalk, and the fall back to it when no graphics context can
 * be made); then twenty scene switches that must leak nothing. It makes its own test scenes and a test player, and puts the world's active scene
 * back as it found it.
 *
 * It needs the local Foundry running with the `stagecraft` module linked into its Data/modules (see
 * module/stagecraft/README.md), and puppeteer-core installed in module/stagecraft (npm install there).
 * It lives with the project, not the module, because it knows the adventure's paintings and portraits.
 */

import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

/* ------------------------------------------------------------------ the stage we draw */

const PAINTING = "modules/blank-inheritance/assets/scenes/the-paper-lantern.webp";
const STAGE_ART = "modules/blank-inheritance/assets/stage/";
const CAST = [
  { id: "kiku", name: "Kiku Enomoto", portrait: "kiku.webp", at: [0.548, 0.782], yaw: -8, size: 1.2, demeanour: "calm" },
  { id: "sanzo", name: "Sanzo", portrait: "sanzo.webp", at: [0.275, 0.885], yaw: 34, demeanour: "bouncy", emote: { id: "music", t0: 0.5 } },
  { id: "hiroshi", name: "Hiroshi", portrait: "sato-hiroshi.webp", colour: "#e3c45a", at: [0.355, 0.895], yaw: -20, demeanour: "calm", emote: { id: "laugh", t0: 2.6 } },
  { id: "masaru", name: "Masaru", portrait: "kaneda-masaru.webp", colour: "#e06a5a", at: [0.43, 0.9], yaw: 168, demeanour: "slouch" },
  { id: "etsuko", name: "Etsuko", portrait: "kimura-etsuko.webp", colour: "#5fb3d9", at: [0.635, 0.89], yaw: 42, demeanour: "sly", emote: { id: "whisper", t0: 1.2 } },
  { id: "yumiko", name: "Yumiko", portrait: "watanabe-yumiko.webp", colour: "#c99be0", at: [0.695, 0.885], yaw: -24, demeanour: "calm" },
  { id: "nren", name: "Ren", portrait: "nakamura-ren.webp", colour: "#86c76a", at: [0.1, 0.965], yaw: 34, size: 1.05, demeanour: "slouch", emote: { id: "sleep", t0: 0.2 } },
  { id: "tama", name: "Tama", portrait: "tama.webp", at: [0.865, 0.885], yaw: -30, demeanour: "nervous", emote: { id: "bowl", t0: 3.1 } }
].map((c) => ({ ...c, portrait: STAGE_ART + c.portrait }));

const LANTERN = [255, 172, 96];
const DESCRIPTION = {
  painting: { src: PAINTING, size: [1920, 960] },
  rig: { horizon: 0.56, floorFront: 0.935, depth: 1.1, vanish: 0.52, lift: 250 },   // lifted to clear the adventure's deck (about 270 reference pixels)
  cardScale: 0.7,
  skin: "brass",
  lights: [
    { at: [0.165, 0.12], below: 0.97, colour: LANTERN, intensity: 1.0, flicker: 0.06 },
    { at: [0.31, 0.2], below: 0.88, colour: LANTERN, intensity: 0.9, flicker: 0.07 },
    { at: [0.53, 0.29], below: 0.82, colour: LANTERN, intensity: 1.2, flicker: 0.05, pool: 380, shadow: true },
    { at: [0.81, 0.22], below: 0.92, colour: LANTERN, intensity: 1.0, flicker: 0.06, pool: 340, shadow: true },
    { at: [0.37, 0.56], below: 0.78, colour: [255, 120, 60], intensity: 0.8, flicker: 0.18, flickerHz: 11, shadow: true }
  ],
  occluders: [{ id: "counter", poly: [[0.235, 0.7], [0.728, 0.7], [0.728, 0.9], [0.235, 0.9]], base: 0.86, x: 0.48 }],
  zones: [
    // The chalk zone is on the right, clear of the adventure's Scene Runner: its closed drawer is an invisible 826 x 744 box
    // in the top left that swallows every click (found 2026-10-01; it would swallow Foundry's own canvas clicks too).
    { id: "back-wall", kind: "chalk", name: "The back wall", shape: [[0.52, 0.2], [0.88, 0.2], [0.88, 0.6], [0.52, 0.6]] },
    { id: "kitchen", kind: "door", name: "The kitchen", hint: "Go in", shape: [[0.87, 0.35], [0.97, 0.35], [0.97, 0.75], [0.87, 0.75]], floor: [[0.87, 0.8], [0.97, 0.8], [0.97, 0.9], [0.87, 0.9]] },
    { id: "grill", kind: "spot", name: "The grill", hint: "Look closer", shape: [[0.3, 0.5], [0.42, 0.5], [0.42, 0.6], [0.3, 0.6]], floor: [[0.3, 0.8], [0.42, 0.8], [0.42, 0.87], [0.3, 0.87]] },
    { id: "front", kind: "podium", name: "The front", shape: [[0.6, 0.8], [0.8, 0.8], [0.8, 0.95], [0.6, 0.95]] }
  ],
  marks: [
    { id: "bar-1", at: [0.3, 0.895], label: "at the bar", faces: { point: [0.548, 0.782] }, group: "bar" },
    { id: "bar-2", at: [0.4, 0.9], label: "at the bar", faces: { point: [0.548, 0.782] }, group: "bar" },
    { id: "bar-3", at: [0.5, 0.9], label: "at the bar", faces: { point: [0.548, 0.782] }, group: "bar" },
    { id: "booth-a", at: [0.78, 0.885], yaw: -34, lean: 6, label: "the booth", group: "booth" },
    { id: "booth-b", at: [0.86, 0.885], yaw: 34, lean: -6, label: "the booth", group: "booth" },
    { id: "corner", at: [0.12, 0.955], yaw: 34, label: "the corner" }
  ],
  chalk: { mode: "zones", box: [0.77, 0.91] }     // in front of the counter (the counter hides things behind it), clear of cards and the deck
};

/* ------------------------------------------------------------------ the browser */

const logs = [];
const report = { checks: [], notes: [] };
let restore = null;     // the world's own active scene, to put back last of all (drawing it can log errors of its own: missing map tiles)
const check = (name, pass, detail = "") => { report.checks.push({ name, pass: !!pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--js-flags=--expose-gc"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
});
const page = await browser.newPage();
/** What a console message really says: an Error passed to console.error arrives as a bare handle, so ask it for its stack. */
async function describe(m) {
  let t = m.text();
  if (m.type() === "error" || m.type() === "warning") {
    const parts = await Promise.all(m.args().map((a) => a.evaluate((v) => (v instanceof Error ? v.stack || v.message : typeof v === "string" ? v : "")).catch(() => "")));
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

/** A point of the painting (fractions) as a point of the viewport, the inverse of what the chalk does with the pointer. */
const toScreen = (p, fx, fy) => p.evaluate((fx, fy) => {
  const { rig, view } = game.modules.get("stagecraft").api.stage().backend;
  const rx = fx * rig.size[0] * rig.map.s + rig.map.ox;
  const ry = fy * rig.size[1] * rig.map.s + rig.map.oy;
  return { x: (rx - view.ox) * view.s, y: (ry - view.oy) * view.s };
}, fx, fy);

/** Everything about the chalk that can be seen from outside the module: the wall, the journal, the box, the strip. */
const SAVED_JS = `(() => {
  const entry = game.journal.find((e) => e.getFlag("stagecraft", "chalk") === true);
  const scene = canvas.scene?.id;
  return (entry?.pages ?? []).filter((pg) => pg.getFlag("stagecraft", "chalk")?.scene === scene).flatMap((pg) => pg.getFlag("stagecraft", "chalk").strokes ?? []);
})()`;
const wallState = (p) => p.evaluate((savedJs) => {
  const h = game.modules.get("stagecraft").api.stage();
  if (!h) return null;
  const b = h.backend;
  const saved = eval(savedJs);
  const entry = game.journal.find((e) => e.getFlag("stagecraft", "chalk") === true);
  const root = document.getElementById("stagecraft-stage");
  return {
    wall: b.chalkWall.strokes.size, wallIds: [...b.chalkWall.strokes.keys()], saved: saved.length, savedStrokes: saved,
    box: b.chalkBox.group.visible, inHand: root.classList.contains("stagecraft-chalk"), cursor: b.chalkCursor.group.visible,
    hidden: b.chalkWall.hidden, bar: [...root.querySelectorAll(".stagecraft-bar button")].map((x) => x.textContent),
    journal: !!entry, ownership: entry?.ownership?.default, live: canvas.scene?.flags?.stagecraft?.live ?? null, me: game.userId
  };
}, SAVED_JS);
const waitSaved = (p, test, timeout = 15000) => p.waitForFunction(`(${test})(${SAVED_JS})`, { timeout, polling: 200 });

/** A point on a stick of chalk (or the eraser, "rub") where a real click reaches the stage and picks that stick. */
const findStick = (p, tool) => p.evaluate((tool) => {
  const b = game.modules.get("stagecraft").api.stage().backend;
  const stick = b.chalkBox.pickables.find((s) => (tool === "rub" ? s.userData.eraser : s.userData.chalk === tool));
  if (!stick) return null;
  const w = stick.parent.localToWorld(stick.position.clone());
  const c = b.project({ X: w.x, Y: w.y, Z: w.z });
  for (const [dx, dy] of [[0, 0], [10, 0], [-10, 0], [0, 8], [0, -8], [22, 0], [-22, 0], [0, 16], [0, -16], [30, 10], [-30, -10]]) {
    const x = c.x + dx;
    const y = c.y + dy;
    const hit = b.pick(x, y);
    const want = tool === "rub" ? hit?.kind === "eraser" : hit?.kind === "chalk" && hit.colour === tool;
    if (want && document.elementFromPoint(x, y)?.tagName === "CANVAS") return { x, y };
  }
  return { x: c.x, y: c.y, blocked: document.elementFromPoint(c.x, c.y)?.tagName ?? "nothing" };
}, tool);

async function takeChalk(p, tool) {
  const at = await findStick(p, tool);
  if (!at || at.blocked) return at;
  await p.mouse.move(at.x, at.y);
  await sleep(60);
  await p.mouse.down();
  await p.mouse.up();
  await sleep(200);
  return at;
}

/** Press on the first point, move through the others, and let go; chalk must already be in hand. */
async function drawFractions(p, points, { holdForShot = null } = {}) {
  const pts = [];
  for (const [fx, fy] of points) pts.push(await toScreen(p, fx, fy));
  await p.mouse.move(pts[0].x, pts[0].y);
  await p.mouse.down();
  let i = 0;
  for (const q of pts.slice(1)) {
    await p.mouse.move(q.x, q.y, { steps: 4 });
    if (holdForShot && ++i === Math.floor(pts.length / 2)) await holdForShot();
  }
  await p.mouse.up();
}

/** Click one of the GM's strip buttons the way a person would, after checking that nothing covers it. */
async function clickBar(p, act) {
  const r = await p.evaluate((a) => {
    const b = document.querySelector(`.stagecraft-bar button[data-act="${a}"]`);
    if (!b) return null;
    const box = b.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    return { x, y, reachable: document.elementFromPoint(x, y) === b, disabled: b.disabled };
  }, act);
  if (!r?.reachable || r.disabled) return r;
  await p.mouse.move(r.x, r.y);
  await sleep(50);
  await p.mouse.click(r.x, r.y);
  await sleep(500);
  return r;
}

/** With --verbose, say what the chalk is doing at this moment. */
const trace = async (label, p = page) => {
  if (!args.get("verbose")) return;
  const w = await wallState(p);
  console.log(`  [${label}]`, JSON.stringify(w, (k, v) => (k === "savedStrokes" || k === "wallIds" ? undefined : v)));
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
const wave = (x0, y0, n = 14, step = 0.024, amp = 0.05) => Array.from({ length: n }, (_, i) => [x0 + i * step, y0 + amp * Math.sin(i * 0.9)]);

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
  const brassSource = readFileSync(path.join(repo, "design", "stagecraft", "lab", "brass-skin.mjs"), "utf8").replace(/^export const brass/m, "const brass");
  await page.evaluate((src) => { const brass = new Function(`${src}; return brass;`)(); game.modules.get("stagecraft").api.skins.register(brass); }, brassSource);
  check("a table can register its own skin through the api", await page.evaluate(() => game.modules.get("stagecraft").api.skins.list().includes("brass")));

  // Foundry refuses to switch scenes while a canvas is still loading, and redraws when the scene on screen is deleted, so
  // get onto a plain scene first, then clear out the old test scenes, then make the new stage scene.
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
    const chalkPagesOf = (id) => (game.journal.find((e) => e.getFlag("stagecraft", "chalk") === true)?.pages ?? []).filter((pg) => pg.getFlag("stagecraft", "chalk")?.scene === id).length;
    const doomed = olds.filter((x) => x.id !== plain.id).map((x) => x.id);
    const pagesBefore = doomed.reduce((n, id) => n + chalkPagesOf(id), 0);
    for (const s of olds) if (s.id !== plain.id) await s.delete();
    await new Promise((r) => setTimeout(r, 1500));
    const pagesAfter = doomed.reduce((n, id) => n + chalkPagesOf(id), 0);
    await idle();
    const stage = await Scene.create({ name: "Stagecraft test: Paper Lantern", flags: { stagecraft: { stage: description, published: { cards: cast, rev: 1 } } } });
    await idle();
    return { stage: stage.id, plain: plain.id, pagesBefore, pagesAfter, originalActive };
  }, DESCRIPTION, CAST);
  report.notes.push(`deleting the old test scenes: ${ids.pagesBefore} chalk pages before, ${ids.pagesAfter} after`);
  check("deleting a scene takes its chalk pages with it", ids.pagesAfter === 0, `${ids.pagesBefore} before, ${ids.pagesAfter} after`);
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

  /* -------------------------------------------------------------- 7b. the box of chalk, on the GM's screen */
  const me = await page.evaluate(() => game.userId);
  let w = await wallState(page);
  check("the chalk journal exists and every player owns it", w.journal && w.ownership === 3, `ownership ${w.ownership}`);
  check("the GM's strip is on the stage, six buttons", w.bar.length === 6, JSON.stringify(w.bar));
  check("the box of chalk is out on the stage (this scene lets players chalk its back wall)", w.box === true);
  await shot("foundry-9-chalk-box");
  const first = await takeChalk(page, "yellow");
  w = await wallState(page);
  check("a real click on a stick of chalk picks it up and the stick follows the pointer", !!first && !first.blocked && w.inHand && w.cursor, JSON.stringify({ first, inHand: w.inHand, cursor: w.cursor }));

  await drawFractions(page, wave(0.56, 0.35, 14, 0.022, 0.04));
  await waitSaved(page, "(s) => s.length >= 1");
  w = await wallState(page);
  check("a line drawn with the real mouse is on the wall and kept in the world's journal", w.wall === 1 && w.saved === 1, `wall ${w.wall}, kept ${w.saved}`);
  check("the drawer is recorded on it", w.savedStrokes[0]?.by === me && w.savedStrokes[0]?.colour === "yellow", JSON.stringify({ by: w.savedStrokes[0]?.by, colour: w.savedStrokes[0]?.colour }));

  // a long line across the back wall's edge, photographed while the stick is still down
  await drawFractions(page, [[0.7, 0.45], [0.7, 0.5], [0.7, 0.55], [0.7, 0.59], [0.7, 0.62], [0.7, 0.7], [0.7, 0.75]], { holdForShot: async () => { await shot("foundry-10-chalk-drawing"); } });
  await waitSaved(page, "(s) => s.length >= 2");
  w = await wallState(page);
  const crossing = w.savedStrokes.find((s) => s !== w.savedStrokes[0]);
  const crossingY = Math.max(...crossing.p.filter((_, i) => i % 2 === 1));
  check("a line that runs out of the chalk zone stops at its edge", crossingY <= 601 && crossingY > 560, `the line ends at ${crossingY / 10}% down the painting; the zone ends at 60%`);

  await drawFractions(page, [[0.55, 0.72], [0.65, 0.72], [0.75, 0.72]]);
  await sleep(900);
  w = await wallState(page);
  check("a line drawn wholly outside the zone leaves nothing", w.saved === 2 && w.wall === 2, `kept ${w.saved}, wall ${w.wall}`);

  // the eraser: swipe across the first line; it is cut in two
  const rub = await takeChalk(page, "rub");
  w = await wallState(page);
  check("the felt eraser can be taken instead", w.inHand && !!rub && !rub.blocked);
  await drawFractions(page, [[0.62, 0.25], [0.62, 0.45]]);
  await waitSaved(page, "(s) => s.length >= 3");
  w = await wallState(page);
  check("rubbing across a line cuts it in two", w.saved === 3 && w.savedStrokes.filter((s) => /\.\d$/.test(s.id)).length === 2, `ids: ${w.savedStrokes.map((s) => s.id.slice(-8)).join(", ")}`);
  check("the wall shows exactly what is kept", JSON.stringify([...w.wallIds].sort()) === JSON.stringify(w.savedStrokes.map((s) => s.id).sort()));
  await page.keyboard.press("Escape");
  await sleep(250);
  w = await wallState(page);
  check("Escape puts the chalk back in the box", !w.inHand && !w.cursor);

  // a line in each colour of the box: it is a box of chalk, not one stick
  for (const [colour, y] of [["pink", 0.5], ["blue", 0.54]]) {
    const at = await takeChalk(page, colour);
    await trace(`took ${colour} at ${JSON.stringify(at)}`);
    await drawFractions(page, wave(0.56, y, 10, 0.03, 0.01));
    await sleep(500);
    await trace(`drew ${colour}`);
  }
  await page.keyboard.press("Escape");
  await waitSaved(page, "(s) => s.length >= 5");
  w = await wallState(page);
  check("several colours can be used", new Set(w.savedStrokes.map((s) => s.colour)).size >= 3, [...new Set(w.savedStrokes.map((s) => s.colour))].join(", "));
  await shot("foundry-11-chalk-wall");
  const keptBefore = w.savedStrokes.map((s) => s.id).sort();

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

  const lostAt = await page.evaluate(() => {
    const b = game.modules.get("stagecraft").api.stage().backend;
    window.__oldBackend = b;
    const gl = b.canvas.getContext("webgl2") ?? b.canvas.getContext("webgl");
    gl.getExtension("WEBGL_lose_context").loseContext();
    return performance.now();
  });
  await page.waitForFunction(() => { const st = game.modules.get("stagecraft").api.stage(); return st && st.backend !== window.__oldBackend && !!st.backend.world && !!st.backend.chalkWall; }, { timeout: 30000, polling: 250 });
  await sleep(1500);
  const rebuilt = await page.evaluate(() => {
    const st = game.modules.get("stagecraft").api.stage();
    return { cards: st.stage.cards.size, canvases: document.querySelectorAll("#stagecraft-stage canvas").length, calls: st.backend.stats().calls, wall: st.backend.chalkWall.strokes.size, box: st.backend.chalkBox.group.visible, lost: st.backend.contextLost === true };
  });
  check("a lost graphics context is recovered: the stage is rebuilt and draws again, with its cards", rebuilt.cards === CAST.length && rebuilt.canvases === 1 && rebuilt.calls > 40 && !rebuilt.lost, JSON.stringify(rebuilt));
  check("and its chalk comes back with it", rebuilt.wall === keptBefore.length && rebuilt.box === true, `${rebuilt.wall} lines, box ${rebuilt.box}`);
  const again = await where("etsuko");
  await page.mouse.move(again.x, again.y);
  await sleep(250);
  check("and the pointer still finds a card on the new picture", await page.evaluate(() => document.querySelector("#stagecraft-stage canvas").style.cursor === "grab"));

  /* -------------------------------------------------------------- 7c. the graffiti is still there after a reload (it persists between sessions) */
  await page.reload({ waitUntil: "domcontentloaded" });
  try { await ready(); } catch { await join(args.get("user") ?? "Gamemaster"); await ready(); }
  await page.evaluate((id) => game.scenes.get(id).view(), ids.stage);
  await page.waitForFunction(() => !!game.modules.get("stagecraft").api.stage()?.backend?.chalkWall, { timeout: 60000, polling: 250 });
  await sleep(1500);
  w = await wallState(page);
  check("after a reload the same chalk is on the wall", JSON.stringify([...w.wallIds].sort()) === JSON.stringify(keptBefore), `${w.wall} lines, was ${keptBefore.length}`);
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
  pp.on("console", async (m) => { const t = await describe(m); if (m.type() === "error" || m.type() === "warning" || /stagecraft/i.test(t)) logs.push(`[player ${m.type()}] ${t.slice(0, 500)}`); });
  pp.on("pageerror", (e) => logs.push(`[player pageerror] ${e.message}`));
  try {
    await join(playerName, pp);
    await ready(pp);
    await pp.evaluate(() => { for (const app of foundry.applications.instances.values()) app.close?.(); });
    await pp.waitForFunction(() => !!game.modules.get("stagecraft").api.stage()?.backend?.chalkWall, { timeout: 60000, polling: 250 });
    await sleep(1500);
    let pw = await wallState(pp);
    check("a player lands on the stage scene and sees the GM's chalk", pw.wall === keptBefore.length, `${pw.wall} lines`);
    check("a player has no GM strip", pw.bar.length === 0);
    check("a player has the box of chalk", pw.box === true);
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

    // hands off
    await page.bringToFront();
    await clickBar(page, "hands");
    await sleep(700);
    check("the GM's strip can switch hands off", (await wallState(page)).bar[0] === "Hands off" && (await sceneFlags(page))?.handsOff === true, JSON.stringify(await sceneFlags(page)));
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

    await pp.bringToFront();
    const took = await takeChalk(pp, "green");
    pw = await wallState(pp);
    check("a player can take a stick with a real click", !!took && !took.blocked && pw.inHand, JSON.stringify(took));
    await drawFractions(pp, wave(0.56, 0.26, 12, 0.026, 0.02));
    await waitSaved(page, `(s) => s.length >= ${keptBefore.length + 1}`);
    await sleep(500);
    const gw = await wallState(page);
    const mine = gw.savedStrokes.filter((s) => s.by === setup.userId);
    check("the player's line is kept in the world under the player's name", mine.length === 1 && mine[0].colour === "green", JSON.stringify(mine.map((s) => ({ by: s.by === setup.userId ? "player" : s.by, colour: s.colour }))));
    check("and it appears on the GM's screen at once (nobody reloads)", gw.wall === keptBefore.length + 1, `${gw.wall} lines on the GM's wall`);
    const pageOwners = await page.evaluate(() => { const e = game.journal.find((x) => x.getFlag("stagecraft", "chalk") === true); return e.pages.map((pg) => pg.getFlag("stagecraft", "chalk")?.by); });
    check("the GM's lines and the player's are on separate pages (so two hands never overwrite each other)", new Set(pageOwners).size >= 2, `${pageOwners.length} pages, ${new Set(pageOwners).size} drawers`);

    // the other direction: the GM draws, the player sees it
    await page.bringToFront();
    await takeChalk(page, "orange");
    await drawFractions(page, wave(0.56, 0.58, 8, 0.03, 0.01));
    await page.keyboard.press("Escape");
    await sleep(900);
    pw = await wallState(pp);
    check("the GM's new line appears on the player's screen without a reload", pw.wall === keptBefore.length + 2, `${pw.wall} lines on the player's wall`);

    // a player cannot rub out someone else's chalk, but can rub out their own
    const gmIds = (await wallState(page)).savedStrokes.filter((s) => s.by === me).map((s) => s.id).sort();
    await pp.bringToFront();
    await takeChalk(pp, "rub");
    await drawFractions(pp, [[0.64, 0.42], [0.64, 0.6]]);                   // across three of the GM's lines
    await sleep(900);
    await drawFractions(pp, [[0.7, 0.2], [0.7, 0.34]]);                     // across the player's own green line, and past the GM's yellow one
    await sleep(1200);
    const afterRub = (await wallState(page)).savedStrokes.filter((s) => s.by === me).map((s) => s.id).sort();
    check("a player's eraser leaves other people's chalk alone", JSON.stringify(afterRub) === JSON.stringify(gmIds), `${afterRub.length} of the GM's ${gmIds.length} lines untouched`);
    const ownAfter = (await wallState(page)).savedStrokes.filter((s) => s.by === setup.userId);
    check("but their own can be rubbed out", ownAfter.length === 2 && ownAfter.every((s) => /\.\d$/.test(s.id)), `ids: ${ownAfter.map((s) => s.id.slice(-8)).join(", ")}`);
    await pp.keyboard.press("Escape");
    await grab("foundry-13-chalk-player", pp);

    // the GM closes the scene to chalk: the player's box goes and the wall stays
    await page.bringToFront();
    const off = await clickBar(page, "mode");
    check("the GM's strip can be reached by a real click", !!off?.reachable, JSON.stringify(off));
    await sleep(900);
    pw = await wallState(pp);
    check("closing chalk from the GM's strip takes the box away from the player at once", pw.box === false && pw.wall >= keptBefore.length + 2, `box ${pw.box}, wall ${pw.wall}`);
    check("and the strip says so", (await wallState(page)).bar[1] === "Chalk: off", (await wallState(page)).bar[1]);
    await clickBar(page, "mode");                                                // zones only
    await clickBar(page, "mode");                                                // anywhere
    await sleep(900);
    pw = await wallState(pp);
    check("opening it to anywhere brings the box back", pw.box === true, `box ${pw.box}`);
    await pp.bringToFront();
    await takeChalk(pp, "white");
    const before = (await wallState(page)).saved;
    await drawFractions(pp, [[0.55, 0.72], [0.65, 0.76], [0.75, 0.72]]);          // outside the back wall: only allowed because the GM opened it
    await waitSaved(page, `(s) => s.length >= ${before + 1}`);
    check("with chalk open anywhere a player can draw outside the zone", true);
    await pp.keyboard.press("Escape");
    await page.bringToFront();
    await clickBar(page, "mode");                                                // back to as the scene says
    check("one more press hands the decision back to the scene", (await sceneFlags(page))?.chalk?.mode === null && (await wallState(page)).bar[1] === "Chalk: zones only (scene)", JSON.stringify(await sceneFlags(page)));

    // freeze, hide, undo, wipe
    const live0 = await wallState(page);
    await clickBar(page, "freeze");
    await sleep(700);
    pw = await wallState(pp);
    check("freezing keeps the wall and takes the chalk away from everyone", pw.box === false && pw.wall === live0.wall, `box ${pw.box}, wall ${pw.wall}`);
    await clickBar(page, "freeze");
    await clickBar(page, "hide");
    await sleep(700);
    pw = await wallState(pp);
    check("hiding the wall puts it out of sight for everyone without losing it", pw.hidden === true && pw.saved === live0.saved, `hidden ${pw.hidden}, kept ${pw.saved}`);
    await shot("foundry-14-chalk-hidden");
    await clickBar(page, "hide");
    await clickBar(page, "undo");
    await sleep(900);
    const afterUndo = await wallState(page);
    check("undo takes the newest line off the wall", afterUndo.saved === live0.saved - 1 && (await wallState(pp)).wall === afterUndo.saved, `${live0.saved} -> ${afterUndo.saved}`);
    await clickBar(page, "wipe");
    await page.waitForSelector('dialog.application [data-action="yes"]', { timeout: 10000 });
    await sleep(300);
    await shot("foundry-15-chalk-wipe-asks");
    const yes = await page.evaluate(() => { const b = document.querySelector('dialog.application [data-action="yes"]'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.click(yes.x, yes.y);
    await sleep(1200);
    const wiped = await wallState(page);
    pw = await wallState(pp);
    check("wipe asks first, and then clears every line for everyone", wiped.saved === 0 && wiped.wall === 0 && pw.wall === 0, `GM ${wiped.wall}, player ${pw.wall}`);
    // the card the player moved is where they left it after a reload
    await page.bringToFront();
    await page.reload({ waitUntil: "domcontentloaded" });
    try { await ready(); } catch { await join(args.get("user") ?? "Gamemaster"); await ready(); }
    await page.evaluate((id) => game.scenes.get(id).view(), ids.stage);
    await page.waitForFunction(() => !!game.modules.get("stagecraft").api.stage()?.backend?.ready, { timeout: 60000, polling: 250 });
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
    await sleep(1500);
  };
  await page.evaluate(() => game.settings.set("stagecraft", "tier", "flat"));
  await backToStage();
  const flat = await page.evaluate(() => {
    const h = game.modules.get("stagecraft").api.stage();
    const c = document.querySelector("#stagecraft-stage canvas");
    return { name: h.backend.name, cards: h.stage.cards.size, views: h.backend.views.size, gl: !!(c.getContext("webgl2") ?? c.getContext("webgl")), canvases: document.querySelectorAll("#stagecraft-stage canvas").length, draws: h.backend.stats().calls, hidden: canvas.app.view.style.display };
  });
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
  check("the pointer turns to a grabbing hand over a card on the flat stage", await page.evaluate(() => document.querySelector("#stagecraft-stage canvas").style.cursor === "grab"));
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

  // chalk on the flat stage: the same strokes, kept in the same journal
  const flatStick = (tool) => page.evaluate((tool) => {
    const b = game.modules.get("stagecraft").api.stage().backend;
    const layout = b.order.find((d) => d.kind === "box")?.layout;
    if (!layout) return null;
    const r = tool === "rub" ? layout.eraser.hit : layout.sticks.find((s) => s.colour === tool)?.hit;
    if (!r) return null;
    const x = (r.x0 + r.x1) / 2;
    const y = (r.y0 + r.y1) / 2;
    const hit = b.pick(x, y);
    return { x, y, ok: tool === "rub" ? hit?.kind === "eraser" : hit?.kind === "chalk" && hit.colour === tool, over: document.elementFromPoint(x, y)?.tagName };
  }, tool);
  const pink = await flatStick("pink");
  check("the box of chalk is on the flat stage, and a click on a stick reaches it", pink?.ok === true && pink.over === "CANVAS", JSON.stringify(pink));
  await page.mouse.move(pink.x, pink.y);
  await sleep(60);
  await page.mouse.down();
  await page.mouse.up();
  await sleep(300);
  check("a click on a stick takes it", await page.evaluate(() => document.getElementById("stagecraft-stage").classList.contains("stagecraft-chalk")));
  await drawFractions(page, wave(0.56, 0.35, 14));
  await sleep(300);
  await drawFractions(page, wave(0.56, 0.45, 14));
  await waitSaved(page, `(s) => s.length >= 2`).catch(() => {});
  const flatWall = await page.evaluate((savedJs) => ({ shown: game.modules.get("stagecraft").api.stage().backend.strokes.size, saved: eval(savedJs).length }), SAVED_JS);
  check("chalk drawn on the flat stage is on its wall and kept in the world", flatWall.shown >= 2 && flatWall.saved >= 2, JSON.stringify(flatWall));
  await page.mouse.move(pink.x - 160, pink.y - 260);
  await sleep(200);
  await shot("foundry-18-flat-chalk");
  await page.keyboard.press("Escape");
  await sleep(200);

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
  const fallback = await page.evaluate(() => { const h = game.modules.get("stagecraft").api.stage(); return { name: h.backend.name, cards: h.stage.cards.size, canvases: document.querySelectorAll("#stagecraft-stage canvas").length }; });
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
  check("the run finished without an exception", false, err.message);
} finally {
  // "JournalEntryPage ... does not exist" is a second GM connection (another session on this Foundry) clearing the same deleted
  // scene's chalk a moment before this one: harmless, and Foundry logs it itself
  // "Error creating WebGL context" is three.js saying so when the check takes the graphics context away on purpose
  const errors = logs.filter((l) => /^\[(error|pageerror)\]/.test(l) && !/favicon|404|JournalEntryPage "[^"]+" does not exist|Error creating WebGL context/.test(l));
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
