/**
 * Check that the adventure's overlays let REAL pointer events through to whatever is under them, driving the local Foundry
 * (http://localhost:30000, world blank-inheritance-kuuhaku-souzoku) from headless Chrome with real mouse input. Calling a handler,
 * or reading a stylesheet, proves the handler or the stylesheet, not what a hand can do (the lesson of the Location Editor).
 *
 *   node tools/overlay-check/click-through.mjs                      run every check, print a report
 *   node tools/overlay-check/click-through.mjs --shots=<dir>        also save a hit map and screenshots there
 *   node tools/overlay-check/click-through.mjs --scene="NAME"       view this scene (default: the first with a painting, no Stagecraft stage and a free camera)
 *   node tools/overlay-check/click-through.mjs --inject-css=FILE    add a stylesheet after load, to try a fix live before editing the module
 *   node tools/overlay-check/click-through.mjs --user=Anne          join as someone else (default Gamemaster; the Scene Runner is GM-only)
 *
 * WHY IT EXISTS (found live 2026-10-01): the Scene Runner's host element, #bi-scene-runner, is a full-height box down the left of the
 * screen (826 x 744 at 1920 x 1080). While the drawer was CLOSED it was empty, but an empty box still wins the hit test, so
 * document.elementFromPoint returned the host instead of canvas#board anywhere inside it: Foundry's own canvas could not be
 * clicked, panned or zoomed there, and neither could the Stagecraft stage canvas that sits at the same layer. The fix is the
 * idiom the stage, the deck, the session rail and the admin key already use: the root is click-through and its parts opt back in.
 * The static half of that is pinned by test/tier3-scene-runner-click-through-contract.test.mjs; this is the half that needs a browser.
 *
 * WHAT IT PRESSES: only what a GM presses (the deck's Script pill, a control in the drawer, the drawer's edge, the floating toggle) and
 * the canvas itself (a click, a wheel turn, a right-button drag). It writes nothing to the world: the theme and the drawer width are
 * client-scoped settings, kept in the throwaway profile this launches. It does not leave a scene created or changed behind; viewing a
 * scene is per-session state.
 *
 * It needs the local Foundry running with the adventure module linked into its Data/modules, and puppeteer-core installed in
 * module/stagecraft (npm install there): the project keeps one copy of a browser driver, the way tools/stagecraft/foundry-check.mjs does.
 *
 * ONE WORLD, ONE DRIVER: joining as a user ends any other session of that user (Ingram's own browser, if she is in as Gamemaster), and
 * Foundry pulls every connected client onto a scene when someone activates it, which tools/stagecraft/foundry-check.mjs does. Run the
 * two one at a time. If the world moves under this check it stops with "the world stayed as the check left it" and says why, rather than
 * reporting a cascade of failures that belong to the other session.
 */

import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { worldChange } from "./world-guard.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");

const URL_ = "http://localhost:30000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const args = new Map(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shotsDir = typeof args.get("shots") === "string" ? path.resolve(args.get("shots")) : null;
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

/** Three places inside the closed drawer's box at 1920 x 1080 (the host is 826 x 744 from the top left corner). */
const PROBES = [[139, 180], [528, 298], [800, 700]];

/** A place on the board well clear of the drawer, the deck and the sidebar: where a gesture must work whatever the drawer does. */
const CLEAR = [1300, 420];

/**
 * Overlay roots that are KNOWN to catch a few clicks where they paint nothing, as a ceiling on how many of the 10px grid points that
 * may be. The Scene Runner's host was the whole box (6,445 of 6,629 points); these are slivers. A ceiling, not a target: lower it when
 * the thing is fixed, never raise it to make a run pass.
 */
const KNOWN_DEAD_POINTS = {
  // The deck's orb (deck-orb.hbs) is a square box round a round instrument: .bi-orb, svg.bi-orb__bezel and button.bi-orb__hit are all
  // square, so the corners outside the bezel's circle catch clicks and paint nothing. Measured 61 of about 3,300 points, the same on
  // every painting; the two upper corners sit over open board just above the deck. Tracked as a follow-up; the fix would change a
  // control the GM uses mid-session, so it was reported rather than folded into the Scene Runner fix.
  "bi-command-bar": 70
};

const report = { checks: [], notes: [] };
const check = (name, pass, detail = "") => { report.checks.push({ name, pass: !!pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const USER = typeof args.get("user") === "string" ? args.get("user") : "Gamemaster";
let sceneId = null;                                                        // the plain scene this run chose to look at

/** The world moved under the check: another session activated a scene, or logged in as the same user and bumped this one. */
class WorldChanged extends Error {}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
});
const page = await browser.newPage();
const logs = [];
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") logs.push(`[error] ${m.text().slice(0, 300)}`); });

const snap = async (name) => { if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `${name}.png`), type: "png" }); };

/* ------------------------------------------------------------------ joining */

async function join(name) {
  await page.goto(`${URL_}/join`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 30000 });
  await page.type('input[name="username"]', name);
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), page.$eval('button[name="join"]', (b) => b.click())]);
  await page.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await sleep(1500);
  // the adventure's periodic reminder can cover the page
  await page.evaluate(() => document.querySelectorAll(".application").forEach((el) => { if (el.textContent.includes("Sync campaign content now")) [...el.querySelectorAll("button")].find((b) => /not now|later|close/i.test(b.textContent))?.click(); }));
}

/* ------------------------------------------------------------------ what the page can tell us (installed once) */

async function installHelpers() {
  await page.evaluate(() => {
    const desc = (el) => (el ? `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}` : null);
    /** Who owns the topmost thing at a point: the board, the runner's own parts, the floating toggle, other adventure UI, or Foundry's. */
    const classify = (el) => {
      const host = document.getElementById("bi-scene-runner");
      if (!el) return "nothing";
      if (el === document.getElementById("board")) return "board";
      if (el.closest?.(".bi-runner-toggle")) return "toggle";
      if (host?.contains(el)) return "runner";
      if (el.closest?.('[id^="bi-"]')) return "adventure";
      return "foundry";
    };
    const sweep = (rect, pitch, inset = 0) => {
      const [x0, y0, w, h] = rect;
      const counts = { board: 0, runner: 0, toggle: 0, adventure: 0, foundry: 0, nothing: 0 };
      const samples = [];
      for (let y = y0 + inset + pitch / 2; y < y0 + h - inset; y += pitch) for (let x = x0 + inset + pitch / 2; x < x0 + w - inset; x += pitch) {
        const el = document.elementFromPoint(x, y);
        const k = classify(el);
        counts[k]++;
        if (k === "runner" && samples.length < 4) samples.push(`${Math.round(x)},${Math.round(y)} -> ${desc(el)}`);
      }
      return { counts, samples };
    };
    window.__oc = { desc, classify, sweep };
  });
}

const hitAt = (x, y) => page.evaluate((x, y) => { const el = document.elementFromPoint(x, y); return { desc: window.__oc.desc(el), who: window.__oc.classify(el) }; }, x, y);

/**
 * Stop with one plain message if the page is no longer looking at the scene this run chose, or has lost its connection. Without it a
 * second session in the same world (the Stagecraft check activates its stage scene, which pulls every connected client onto it; a
 * second login as the same user bumps the first) shows up as a confusing cascade of unrelated failures.
 */
async function guard(where) {
  const now = await page.evaluate(() => ({ connected: game.socket?.connected === true, scene: canvas.scene?.id ?? null, name: canvas.scene?.name ?? null })).catch(() => null);
  const change = worldChange(now, sceneId, USER);
  if (change) throw new WorldChanged(`${where}: ${change}`);
}

const drawer = () => page.evaluate(() => {
  const host = document.getElementById("bi-scene-runner");
  if (!host) return null;
  const shell = host.querySelector(".bi-runner-shell");
  const rect = (el) => { const r = el?.getBoundingClientRect(); return r && [r.x, r.y, r.width, r.height].map(Math.round); };
  return {
    open: shell?.classList.contains("bi-runner-shell--open") ?? false,
    host: rect(host), shell: rect(shell),
    hostPE: getComputedStyle(host).pointerEvents, shellPE: shell && getComputedStyle(shell).pointerEvents,
    theme: host.querySelector(".bi-runner")?.dataset.biTheme ?? null
  };
});

const waitOpen = async (open) => {
  await page.waitForFunction((o) => !!document.querySelector("#bi-scene-runner .bi-runner-shell")?.classList.contains("bi-runner-shell--open") === o, { timeout: 15000, polling: 100 }, open);
  await sleep(900);                                                        // the slide, and the deck's refit after it
};

/** Click the middle of an element with the real mouse, but only if the hit test says the click would land on it. */
async function press(selector, { dbl = false } = {}) {
  const at = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2;
    const y = r.y + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, w: r.width, reachable: !!hit && el.contains(hit), coveredBy: hit ? window.__oc.desc(hit) : null };
  }, selector);
  if (!at || at.w < 1 || !at.reachable) return { ...(at ?? { missing: true }), clicked: false };
  await page.mouse.move(at.x, at.y);
  await sleep(80);
  await page.mouse.click(at.x, at.y, { clickCount: dbl ? 2 : 1 });
  return { ...at, clicked: true };
}

/** A hit map: every sixteenth pixel coloured by who would receive a click there. Red is the Scene Runner: right when it is open, the bug when it is closed. */
async function hitMap(name) {
  if (!shotsDir) return;
  await page.evaluate(() => {
    const pitch = 16;
    const c = document.createElement("canvas");
    c.id = "oc-hitmap";
    c.width = innerWidth;
    c.height = innerHeight;
    Object.assign(c.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "2147483000" });
    const g = c.getContext("2d");
    const paint = { board: "rgba(60,210,110,0.30)", runner: "rgba(235,40,40,0.60)", toggle: "rgba(255,200,0,0.80)", adventure: "rgba(70,130,255,0.35)", foundry: "rgba(255,255,255,0.10)", nothing: "rgba(0,0,0,0)" };
    for (let y = pitch / 2; y < innerHeight; y += pitch) for (let x = pitch / 2; x < innerWidth; x += pitch) {
      g.fillStyle = paint[window.__oc.classify(document.elementFromPoint(x, y))];
      g.fillRect(x - pitch / 2 + 1, y - pitch / 2 + 1, pitch - 2, pitch - 2);
    }
    // the legend, between the session rail and the banner lane, outlined so it reads over any painting
    g.font = "bold 20px sans-serif";
    g.lineWidth = 4;
    g.strokeStyle = "#000";
    let lx = 400;
    for (const [k, label] of [["board", "canvas: the click reaches Foundry's board"], ["runner", "Scene Runner takes the click (wrong while it is closed)"], ["adventure", "other adventure UI"], ["foundry", "Foundry's own UI"]]) {
      g.fillStyle = paint[k].replace(/0\.\d+\)/, "1)");
      g.strokeRect(lx, 56, 20, 20);
      g.fillRect(lx, 56, 20, 20);
      g.fillStyle = "#fff";
      g.strokeText(label, lx + 28, 73);
      g.fillText(label, lx + 28, 73);
      lx += 28 + g.measureText(label).width + 36;
    }
    document.body.append(c);
  });
  await snap(name);
  await page.evaluate(() => document.getElementById("oc-hitmap")?.remove());
}

/* ------------------------------------------------------------------ the checks */

try {
  /* ------------------------------------------------------------ 1. the world, and a plain scene to look at */
  await join(USER);
  await installHelpers();

  // A plain scene has no Stagecraft stage and is not one of the adventure's own staged scenes: stage-camera.mjs pins those, so the wheel and
  // the right-button drag are dead on them by design and could not tell us whether the drawer swallowed them.
  sceneId = await page.evaluate((wanted) => {
    const free = game.scenes.contents.filter((s) => !s.flags?.stagecraft?.stage && !s.getFlag("blank-inheritance", "stage")).sort((a, b) => a.name.localeCompare(b.name));
    return (typeof wanted === "string" ? game.scenes.getName(wanted) : free.find((s) => s.background?.src) ?? free[0])?.id ?? null;
  }, args.get("scene"));
  check("there is a plain scene with a free camera to view", !!sceneId);
  if (!sceneId) throw new Error("no plain scene to view; pass --scene=\"NAME\"");
  await page.evaluate((id) => game.scenes.get(id).view(), sceneId);
  await page.waitForFunction((id) => canvas.scene?.id === id && canvas.ready && !canvas.loading && !document.getElementById("stagecraft-stage"), { timeout: 60000, polling: 250 }, sceneId);
  await page.waitForFunction(() => !!document.getElementById("bi-scene-runner") && !!document.querySelector("#bi-command-bar.bi-deck"), { timeout: 60000, polling: 250 });
  await sleep(4000);                                                       // the interface settles: the sidebar, the rail, the deck's first fit
  if (typeof args.get("inject-css") === "string") await page.addStyleTag({ content: readFileSync(path.resolve(args.get("inject-css")), "utf8") });
  await sleep(400);

  const scene = await page.evaluate(() => ({ name: canvas.scene.name, board: getComputedStyle(document.getElementById("board")).display }));
  check("a plain scene is drawn by Foundry's own canvas", scene.board !== "none", scene.name);
  let d = await drawer();
  check("the Scene Runner's host and the deck are mounted, the drawer is closed", !!d && d.open === false && d.host[2] > 300, JSON.stringify(d?.host));
  report.notes.push(`host box ${d.host.join("x")} (x, y, w, h), host pointer-events ${d.hostPE}, shell pointer-events ${d.shellPE}`);
  check("the probe points are inside the closed drawer's box (so the probes mean something)", PROBES.every(([x, y]) => x >= d.host[0] && x < d.host[0] + d.host[2] && y >= d.host[1] && y < d.host[1] + d.host[3]));
  await snap("1-closed-drawer");
  await hitMap("1-closed-drawer-hit-map");

  /* ------------------------------------------------------------ 2. a closed drawer lets the pointer through */
  await guard("before the closed-drawer checks");
  const hits = [];
  for (const [x, y] of PROBES) hits.push({ x, y, ...(await hitAt(x, y)) });
  for (const h of hits) check(`closed drawer: elementFromPoint(${h.x},${h.y}) is the canvas`, h.who === "board", h.desc);

  const closedSweep = await page.evaluate((rect) => window.__oc.sweep(rect, 24), d.host);
  check("closed drawer: not one point of its box is caught by the drawer", closedSweep.counts.runner === 0, `${closedSweep.counts.runner} of ${Object.values(closedSweep.counts).reduce((a, b) => a + b, 0)} points caught${closedSweep.samples.length ? "; e.g. " + closedSweep.samples.join(" | ") : ""}`);

  // real presses: a press at each probe point must be delivered to the board, not to the host
  await page.evaluate(() => {
    window.__ocEvents = [];
    for (const type of ["pointerdown", "mousedown", "click", "wheel", "contextmenu"]) window.addEventListener(type, (e) => window.__ocEvents.push({ type, x: Math.round(e.clientX), y: Math.round(e.clientY), target: window.__oc.desc(e.target), who: window.__oc.classify(e.target) }), true);
  });
  for (const [x, y] of PROBES) { await page.mouse.move(x, y); await sleep(60); await page.mouse.click(x, y); await sleep(120); }
  const downs = await page.evaluate(() => window.__ocEvents.filter((e) => e.type === "pointerdown"));
  check("closed drawer: a real press at each probe point is delivered to the canvas", downs.length === PROBES.length && downs.every((e) => e.who === "board"), downs.map((e) => `${e.x},${e.y}->${e.target}`).join("  "));

  // Foundry's own camera controls. MouseManager#onWheel (client/helpers/interaction/mouse-manager.mjs) gives up unless
  // elementFromPoint is #board, and the right-button drag is the canvas's own pointer pipeline, so a host that wins the hit test kills both.
  // Each gesture is made twice: once at a point clear of the drawer (the control, proving this scene's camera is free and the gesture
  // works at all), then over the closed drawer's box.
  const view = () => page.evaluate(() => ({ s: canvas.stage.scale.x, px: canvas.stage.pivot.x, py: canvas.stage.pivot.y }));
  const wheelAt = async ([x, y]) => {
    const a = await view();
    await page.mouse.move(x, y);
    await sleep(120);
    await page.mouse.wheel({ deltaY: -240 });
    await sleep(700);
    await guard("during a wheel turn");
    return [a.s, (await view()).s];
  };
  const dragAt = async ([x, y]) => {
    const a = await view();
    await page.mouse.move(x, y);
    await sleep(150);
    await page.mouse.down({ button: "right" });
    await sleep(100);
    await page.mouse.move(x + 100, y + 60, { steps: 12 });
    await page.mouse.up({ button: "right" });
    await sleep(700);
    await guard("during a right-button drag");
    const b = await view();
    return [a, b, Math.hypot(b.px - a.px, b.py - a.py)];
  };
  const clearHit = await hitAt(...CLEAR);
  check("the control point is clear of the drawer, the deck and the sidebar (it is the canvas)", clearHit.who === "board", clearHit.desc);
  const [w0, w1] = await wheelAt(CLEAR);
  check("control: a turn of the wheel clear of the drawer zooms Foundry's canvas (so this scene's camera is free)", w1 > w0 + 1e-4, `scale ${w0.toFixed(3)} -> ${w1.toFixed(3)}`);
  const [, , dragged] = await dragAt(CLEAR);
  check("control: a right-button drag clear of the drawer pans Foundry's canvas", dragged > 1, `moved ${dragged.toFixed(0)} canvas px`);
  const [z0, z1] = await wheelAt(PROBES[1]);
  check("closed drawer: a turn of the wheel over its box zooms Foundry's canvas", z1 > z0 + 1e-4, `scale ${z0.toFixed(3)} -> ${z1.toFixed(3)}`);
  const [p0, p1, panned] = await dragAt(PROBES[1]);
  check("closed drawer: a right-button drag from inside its box pans Foundry's canvas", panned > 1, `pivot ${p0.px.toFixed(0)},${p0.py.toFixed(0)} -> ${p1.px.toFixed(0)},${p1.py.toFixed(0)}`);

  /* ------------------------------------------------------------ 3. an open drawer still works */
  await guard("before the open-drawer checks");
  const pill = await press('#bi-command-bar [data-action="openRunner"]');
  check("the deck's Script pill can be reached and pressed with the real mouse", pill.clicked, pill.coveredBy ? `covered by ${pill.coveredBy}` : "");
  let opened = false;
  try { await waitOpen(true); opened = true; } catch { /* reported below */ }
  d = await drawer();
  check("pressing it opens the drawer", opened && d.open, `shell pointer-events ${d?.shellPE}`);
  if (opened) {
    await snap("2-open-drawer");
    await hitMap("2-open-drawer-hit-map");
    const openSweep = await page.evaluate((rect) => window.__oc.sweep(rect, 40, 8), d.shell);
    check("open drawer: nothing in its box leaks through to the canvas", openSweep.counts.board === 0, JSON.stringify(openSweep.counts));

    const theme0 = d.theme;
    const t1 = await press('.bi-runner-shell [data-action="toggleTheme"]');
    await sleep(900);
    const theme1 = (await drawer()).theme;
    check("open drawer: a real click on one of its controls (the theme key) reaches it", t1.clicked && theme1 !== theme0, t1.clicked ? `${theme0} -> ${theme1}` : `covered by ${t1.coveredBy}`);
    if (t1.clicked && theme1 !== theme0) {
      await press('.bi-runner-shell [data-action="toggleTheme"]');
      await sleep(900);
      check("and clicking it again puts it back", (await drawer()).theme === theme0);
    }

    // the drawer's edge: drag it with the real mouse (the grip is 10px wide and hangs 5px over the edge)
    const w0 = (await drawer()).host[2];
    const grip = await page.evaluate(() => { const r = document.querySelector("#bi-scene-runner .bi-runner__grip")?.getBoundingClientRect(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const gripHit = grip && await hitAt(grip.x, grip.y);
    check("the drawer's edge handle is reachable", !!gripHit && /bi-runner__grip/.test(gripHit.desc ?? ""), gripHit?.desc ?? "no handle");
    if (gripHit && /bi-runner__grip/.test(gripHit.desc ?? "")) {
      await page.mouse.move(grip.x, grip.y);
      await sleep(80);
      await page.mouse.down();
      await page.mouse.move(grip.x - 160, grip.y, { steps: 10 });
      await page.mouse.up();
      await sleep(700);
      const w1 = (await drawer()).host[2];
      check("dragging the edge with the real mouse resizes the drawer", w1 < w0 - 100, `${w0}px -> ${w1}px`);
      await snap("3-resized-drawer");
      const grip2 = await page.evaluate(() => { const r = document.querySelector("#bi-scene-runner .bi-runner__grip")?.getBoundingClientRect(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await page.mouse.move(grip2.x, grip2.y);
      await sleep(80);
      await page.mouse.click(grip2.x, grip2.y, { clickCount: 2 });
      await sleep(900);
      const w2 = (await drawer()).host[2];
      check("double-clicking the edge puts the width back", Math.abs(w2 - w0) <= 2, `${w1}px -> ${w2}px (was ${w0}px)`);
    }

    const hide = await press('.bi-runner-shell [data-action="toggle"]');
    let closed = false;
    try { await waitOpen(false); closed = true; } catch { /* reported below */ }
    check("the drawer's own Hide key closes it with a real click", hide.clicked && closed, hide.clicked ? "" : `covered by ${hide.coveredBy}`);
  }

  /* ------------------------------------------------------------ 4. closed again: the box gives the screen back */
  await guard("after the open-drawer checks");
  d = await drawer();
  if (d && !d.open) {
    const again = await page.evaluate((rect) => window.__oc.sweep(rect, 24), d.host);
    check("after opening and closing, the closed drawer still catches nothing", again.counts.runner === 0, `${again.counts.runner} points caught`);
    const hitsAgain = [];
    for (const [x, y] of PROBES) hitsAgain.push(await hitAt(x, y));
    check("and the probe points are the canvas again", hitsAgain.every((h) => h.who === "board"), hitsAgain.map((h) => h.desc).join("  "));
  }

  /* ------------------------------------------------------------ 5. the floating toggle: the fallback door when the deck has not mounted */
  // The deck hides .bi-runner-toggle while it is mounted (bi-foundry-bridge.css), so take the deck's class away to see the toggle as a
  // GM would if the deck failed to mount. A click-through host must not take the toggle's clicks with it.
  await guard("before the floating-toggle checks");
  await page.evaluate(() => document.getElementById("bi-command-bar").classList.remove("bi-deck"));
  await sleep(500);
  const toggleBox = await page.evaluate(() => { const el = document.querySelector("#bi-scene-runner .bi-runner-toggle"); const r = el?.getBoundingClientRect(); return el && { display: getComputedStyle(el).display, pe: getComputedStyle(el).pointerEvents, w: r.width }; });
  check("with no deck, the floating toggle is shown", !!toggleBox && toggleBox.display !== "none" && toggleBox.w > 20, JSON.stringify(toggleBox));
  report.notes.push(`floating toggle pointer-events ${toggleBox?.pe}`);
  await snap("4-fallback-toggle");
  const open2 = await press("#bi-scene-runner .bi-runner-toggle");
  let toggled = false;
  try { await waitOpen(true); toggled = true; } catch { /* reported below */ }
  check("the floating toggle opens the drawer with a real click", open2.clicked && toggled, open2.clicked ? "" : `covered by ${open2.coveredBy}`);
  if (toggled) {
    const close2 = await press("#bi-scene-runner .bi-runner-toggle");
    let shut = false;
    try { await waitOpen(false); shut = true; } catch { /* reported below */ }
    check("and closes it again with a real click", close2.clicked && shut, close2.clicked ? "" : `covered by ${close2.coveredBy}`);
  }
  await page.evaluate(() => document.getElementById("bi-command-bar").classList.add("bi-deck"));
  await sleep(500);

  /* ------------------------------------------------------------ 6. no adventure overlay is an invisible click catcher */
  // For every adventure overlay root that catches the pointer anywhere, ask whether it paints anything at the points it catches. The
  // board is hidden so only a flat backdrop is behind the overlays; each root is then shown and hidden against a white and against a
  // black backdrop. A point counts as "paints nothing" only if hiding the root changes it on NEITHER, so a faint semi-transparent
  // shadow cannot pass for empty on a dark painting (the count swung from 37 to 127 on the painting alone before it worked this way).
  await guard("before the overlay audit");
  const caught = await page.evaluate(() => {
    const iface = document.getElementById("interface");
    const byRoot = {};
    for (let y = 5; y < innerHeight; y += 10) for (let x = 5; x < innerWidth; x += 10) {
      let root = document.elementFromPoint(x, y);
      while (root && root.parentElement !== iface) root = root.parentElement;
      if (root?.id.startsWith("bi-")) (byRoot[root.id] ??= []).push([x, y]);
    }
    return byRoot;
  });
  const ids = Object.keys(caught);
  const shot = () => page.screenshot({ type: "png", encoding: "base64" });
  const shots = {};
  const hideBoard = await page.addStyleTag({ content: "#board { visibility: hidden !important; }" });
  for (const bg of ["#fff", "#000"]) {
    await page.evaluate((bg) => { for (const el of [document.documentElement, document.body]) el.style.setProperty("background", bg, "important"); }, bg);
    await sleep(300);
    shots[bg] = { everything: await shot() };
    for (const id of ids) {
      await page.evaluate((id) => { document.getElementById(id).style.visibility = "hidden"; }, id);
      await sleep(250);
      shots[bg][id] = await shot();
      await page.evaluate((id) => { document.getElementById(id).style.visibility = ""; }, id);
    }
  }
  await page.evaluate(() => { for (const el of [document.documentElement, document.body]) el.style.removeProperty("background"); });
  await hideBoard.evaluate((el) => el.remove());
  const audit = [];
  for (const id of ids) {
    const unpainted = await page.evaluate(async (pairs, points) => {
      const load = async (b64) => { const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob()); const c = new OffscreenCanvas(bmp.width, bmp.height); const g = c.getContext("2d"); g.drawImage(bmp, 0, 0); return g.getImageData(0, 0, bmp.width, bmp.height); };
      const [wAll, wNot, bAll, bNot] = await Promise.all(pairs.flat().map(load));
      const differs = (a, b, i) => Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])) > 6;
      let n = 0;
      for (const [x, y] of points) {
        const i = (y * wAll.width + x) * 4;
        if (!differs(wAll, wNot, i) && !differs(bAll, bNot, i)) n++;
      }
      return n;
    }, [[shots["#fff"].everything, shots["#fff"][id]], [shots["#000"].everything, shots["#000"][id]]], caught[id]);
    audit.push({ id, caught: caught[id].length, unpainted });
  }
  for (const row of audit) {
    const known = KNOWN_DEAD_POINTS[row.id];
    const allowed = known ?? Math.max(3, Math.ceil(row.caught * 0.005));                  // a few antialiased edges are not a bug
    check(`${row.id} catches clicks only where it paints something`, row.unpainted <= allowed, `${row.unpainted} of ${row.caught} caught points show nothing${known ? ` (a known sliver, ceiling ${known}: see KNOWN_DEAD_POINTS)` : ""}`);
  }
  if (!audit.length) report.notes.push("no adventure overlay root caught the pointer anywhere in the idle state");
  report.notes.push("#bi-stage catches nothing while nobody is staged, so the audit cannot see its frames; the stylesheet contract test pins its idiom");
} catch (err) {
  check(err instanceof WorldChanged ? "the world stayed as the check left it" : "the run finished without an exception", false, err.message);
  report.interfered = err instanceof WorldChanged;
} finally {
  const errors = logs.filter((l) => !/favicon|404/.test(l));
  if (!report.interfered) check("no errors in the console", errors.length === 0, errors.slice(0, 3).join(" | "));   // a dropped connection logs errors of its own; the guard already said why
  console.log("\nnotes:", report.notes.join("; ") || "(none)");
  const failed = report.checks.filter((c) => !c.pass);
  console.log(`\n${report.checks.length - failed.length}/${report.checks.length} checks passed`);
  await browser.close();
  process.exitCode = failed.length ? 1 : 0;
}
