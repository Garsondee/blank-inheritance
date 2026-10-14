/**
 * Check the Location Editor's journeys in a real, running, local Foundry (http://localhost:30000), driven from headless Chrome with REAL pointer
 * events and real button presses (design/location-editor.md sections 11 and 16: calling handlers proves the handler, not the tool). It does what
 * the GM does: opens the editor on the Campaign Map, reads the Story with its routes between scenes, opens the Journeys tab and its verdict, plays
 * the main road (the token moves, the bar moves with it, pause really pauses, the scrubber seeks, the speed changes), looks at a route and the
 * problems, opens the Places tab and previews moving every use of a place, and drops a pin with the one-step card (cursor preview, click, Place).
 *
 *   node tools/location-sync/foundry-journeys-check.mjs [--keep]
 *   JOURNEYS_SHOTS=<dir> node tools/location-sync/foundry-journeys-check.mjs    also saves a screenshot of each step
 *
 * Needs the local Foundry up with the adventure's world synced (a "The City" hub scene), and the module's data folder holding the campaign data
 * (data/campaign/map/land-grid.json, travel-graph.json, ...). It writes nothing to the repo: the editor's own autosave and every record it saves are
 * found and removed at the end.
 */

import { createRequire } from "node:module";
import { readdirSync, rmSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const STORAGE = path.join(repo, "module", "blank-inheritance", "storage");
const SHOTS = process.env.JOURNEYS_SHOTS ?? null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const args = new Set(process.argv.slice(2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let step = "start";
const check = (name, pass, detail = "") => { step = name; results.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const before = new Set(existsSync(STORAGE) ? readdirSync(STORAGE) : []);
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", protocolTimeout: 600000, args: ["--hide-scrollbars", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist"], defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { globalThis.__stagecraftSpeed = { settle: 3600000 }; });
const logs = [];
page.on("console", (m) => { if (m.type() === "error") logs.push(m.text().slice(0, 300)); });
page.on("pageerror", (e) => logs.push(`pageerror during "${step}": ${e.message}`));
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };
let active = null;

const $ = (sel) => `#bi-location-editor ${sel}`;
const click = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); return Boolean(el); }, $(sel));
const text = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.replace(/\s+/g, " ").trim() ?? null, $(sel));
const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, $(sel));
const waitFor = (fn, arg, timeout = 30000) => page.waitForFunction(fn, { timeout, polling: 200 }, arg).then(() => true).catch(() => false);
const client = (p) => page.evaluate((pt) => { const c = canvas.clientCoordinatesFromCanvas(pt); return { x: c.x, y: c.y }; }, p);
const journey = () => page.evaluate(() => { const s = canvas.locationDraw.journey.state; return { ...s }; });

try {
  await page.goto("http://localhost:30000/join", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 30000 });
  await page.type('input[name="username"]', "Gamemaster");
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), page.$eval('button[name="join"]', (b) => b.click())]);
  await page.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await sleep(2000);
  await page.evaluate(() => { for (const app of foundry.applications.instances.values()) app.close?.(); });
  active = await page.evaluate(() => game.scenes.active?.id ?? null);

  const hub = await page.evaluate(() => game.scenes.find((s) => s.getFlag("blank-inheritance", "sourceId") === "the-city")?.id ?? null);
  check("the world has the Campaign Map hub scene", !!hub);
  await page.evaluate(async (id) => { const idle = async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); }; await idle(); await game.scenes.get(id).view(); await idle(); }, hub);
  await page.waitForFunction((id) => canvas.scene?.id === id && canvas.ready, { timeout: 120000, polling: 500 }, hub);
  await sleep(2000);
  logs.length = 0;   // (viewing the hub throws one error of Foundry's own scene-controls code in this adventure's world, before the editor is involved)

  await page.evaluate(() => game.modules.get("blank-inheritance").api.openLocationEditor());
  await page.waitForFunction(() => canvas.locationDraw?.active === true, { timeout: 30000 });
  await page.waitForFunction(() => canvas.locationDraw.publishedSummary.state === "ok", { timeout: 120000, polling: 500 });
  check("the editor opened on the hub with the existing locations drawn", true);

  // ---- the tabs
  const tabs = await page.evaluate(() => [...document.querySelectorAll("#bi-location-editor .bi-location-editor__tab")].map((b) => b.dataset.tab));
  check("the panel has four tabs: Story, Journeys, Places, Map tools", JSON.stringify(tabs) === JSON.stringify(["story", "journeys", "places", "map"]), JSON.stringify(tabs));

  // ---- the Story: routes between the scenes
  await waitFor(() => document.querySelector("#bi-location-editor .bi-story__group-head"), null, 60000);
  await page.evaluate(() => { for (const g of document.querySelectorAll("#bi-location-editor .bi-story__group:not(.is-open) .bi-story__group-head")) g.click(); });
  await sleep(800);
  const ready = await waitFor(() => document.querySelectorAll("#bi-location-editor .bi-story__leg").length > 3, null, 60000);
  const legs = await page.evaluate(() => [...document.querySelectorAll("#bi-location-editor .bi-story__leg .bi-story__leg-text")].slice(0, 6).map((e) => e.textContent.replace(/\s+/g, " ").trim()));
  check("the Story draws the way between scenes: a line with distance, time and ways of moving", ready && legs.some((t) => /\d+(\.\d)? (km|m) · \d+ s/.test(t)), JSON.stringify(legs.slice(0, 3)));
  await shot("journeys-1-story");

  // ---- the Journeys tab
  await click('[data-action="setTab"][data-tab="journeys"]');
  await waitFor(() => document.querySelector("#bi-location-editor .bi-journeys__verdict"), null, 60000);
  await sleep(1200);
  const verdict = await page.evaluate(() => ({
    word: document.querySelector("#bi-location-editor .bi-journeys__verdict-head")?.textContent?.replace(/\s+/g, " ").trim(),
    summary: document.querySelector("#bi-location-editor .bi-journeys__summary")?.textContent?.replace(/\s+/g, " ").trim(),
    groups: [...document.querySelectorAll("#bi-location-editor .bi-journeys__group option")].map((o) => o.textContent.trim()),
    legs: document.querySelectorAll("#bi-location-editor .bi-journeys__leg").length,
    issues: document.querySelectorAll("#bi-location-editor .bi-journeys__issue").length
  }));
  check("the Journeys tab gives the episode a verdict and counts", /walked|attention|cannot/i.test(verdict.word ?? "") && /\d+ scenes · \d+ journeys/.test(verdict.summary ?? ""), JSON.stringify({ word: verdict.word, summary: verdict.summary }));
  check("it lists the episodes, every journey in play order, and the problems", verdict.groups.length >= 2 && verdict.legs >= 20, `${verdict.groups.length} episodes, ${verdict.legs} journeys, ${verdict.issues} problems`);
  await shot("journeys-2-tab");

  // the routes are drawn on the canvas
  const drawn = await page.evaluate(() => {
    const container = canvas.locationDraw.children.at(-2);
    const graphics = container.children.filter((c) => c.geometry);
    return { visible: container.visible, layers: graphics.length, routesDrawn: (graphics[1]?.geometry?.graphicsData?.length ?? 0), stops: (graphics[4]?.geometry?.graphicsData?.length ?? 0) };
  });
  check("the routes of the episode are on the map, with a numbered stop for each scene", drawn.visible && drawn.layers === 6 && drawn.routesDrawn > 10 && drawn.stops > 3, JSON.stringify(drawn));
  await shot("journeys-3-routes");

  // ---- play the main road
  const pivotBefore = await page.evaluate(() => ({ x: canvas.stage.pivot.x, y: canvas.stage.pivot.y, s: canvas.stage.scale.x }));
  await click('[data-action="playGroup"][data-main="true"]');
  const barThere = await waitFor(() => document.querySelector("#bi-location-editor .bi-jbar"), null, 15000);
  await sleep(1500);
  const playing1 = await journey();
  const bar1 = await page.evaluate(() => ({ time: document.querySelector("#bi-location-editor .bi-jbar__time")?.textContent, title: document.querySelector("#bi-location-editor .bi-jbar__title")?.textContent, scrub: Number(document.querySelector("#bi-location-editor .bi-jbar__scrub")?.value), playingClass: document.querySelector("#bi-location-editor .bi-jbar")?.classList.contains("is-playing") }));
  check("Play shows the player bar and the token starts walking", barThere && playing1.active && playing1.playing && playing1.t > 500, JSON.stringify({ t: Math.round(playing1.t), total: Math.round(playing1.total), step: playing1.stepIndex }));
  check("the bar moves with it: time, step title, playing state", /\d+:\d\d \/ \d+:\d\d/.test(bar1.time ?? "") && (bar1.title ?? "").includes("→") && bar1.playingClass === true, JSON.stringify(bar1));
  const tokenDrawn = await page.evaluate(() => { const g = canvas.locationDraw.children.at(-2).children.filter((c) => c.geometry)[5]; return g?.geometry?.graphicsData?.length ?? 0; });
  check("a token is drawn on the map", tokenDrawn > 0, `${tokenDrawn} shapes`);
  await shot("journeys-4-playing");
  const pivotAfter = await page.evaluate(() => ({ x: canvas.stage.pivot.x, y: canvas.stage.pivot.y, s: canvas.stage.scale.x }));
  check("the camera moved to frame the journey being walked", Math.hypot(pivotBefore.x - pivotAfter.x, pivotBefore.y - pivotAfter.y) > 1 || Math.abs(pivotBefore.s - pivotAfter.s) > 0.001, `${JSON.stringify(pivotBefore)} -> ${JSON.stringify(pivotAfter)}`);
  const framed = await page.evaluate(() => { const box = canvas.locationDraw.journey.boxOf([...document.querySelectorAll("#bi-location-editor .bi-journeys__leg.is-playing")].map((e) => e.dataset.legRow)); const p = canvas.stage.pivot; return box ? { inside: p.x >= box.x0 - 400 && p.x <= box.x1 + 400 && p.y >= box.y0 - 400 && p.y <= box.y1 + 400 } : { inside: null }; });
  check("and it is on the first step's journey", framed.inside === true, JSON.stringify(framed));

  // pause really pauses
  await click('[data-action="togglePlay"]');
  await sleep(300);
  const pausedAt = await journey();
  await sleep(1000);
  const stillAt = await journey();
  check("Pause stops the clock", !pausedAt.playing && Math.abs(stillAt.t - pausedAt.t) < 1, `${Math.round(pausedAt.t)} then ${Math.round(stillAt.t)}`);
  // the scrubber seeks
  await page.evaluate(() => { const s = document.querySelector("#bi-location-editor .bi-jbar__scrub"); s.value = "500"; s.dispatchEvent(new Event("input", { bubbles: true })); });
  await sleep(300);
  const sought = await journey();
  check("the scrubber jumps to the middle of the journey", Math.abs(sought.t - sought.total / 2) < sought.total * 0.02, `${Math.round(sought.t)} of ${Math.round(sought.total)}`);
  // speed
  await click('[data-action="setSpeed"][data-speed="4"]');
  await sleep(200);
  check("the speed buttons change the speed", (await journey()).speed === 4);
  // skip forward lands on the start of another step
  const stepBefore = (await journey()).stepIndex;
  await click('[data-action="skipStep"][data-dir="1"]');
  await sleep(300);
  const stepAfter = (await journey()).stepIndex;
  check("skip goes on to the next step", stepAfter === stepBefore + 1 || stepAfter === stepBefore, `${stepBefore} -> ${stepAfter}`);
  await shot("journeys-5-seeked");
  // playing to the end stops by itself
  await click('[data-action="setSpeed"][data-speed="8"]');
  await page.evaluate(() => canvas.locationDraw.journey.seek(canvas.locationDraw.journey.state.total - 3000));
  await click('[data-action="togglePlay"]');
  const ended = await waitFor(() => !canvas.locationDraw.journey.state.playing, null, 20000);
  check("it stops itself at the end", ended && (await journey()).t >= (await journey()).total - 1);
  // stop takes everything away
  await click('[data-action="stopPlay"]');
  await sleep(500);
  const stopped = await page.evaluate(() => ({ active: canvas.locationDraw.journey.state.active, bar: !!document.querySelector("#bi-location-editor .bi-jbar") }));
  check("Stop takes the bar and the token away", !stopped.active && !stopped.bar, JSON.stringify(stopped));

  // ---- a route on its own, and the problems
  await page.evaluate(() => { const leg = [...document.querySelectorAll("#bi-location-editor .bi-journeys__leg")].find((li) => li.querySelector('[data-action="playStep"]')); leg?.querySelector(".bi-journeys__leg-main")?.click(); });
  await sleep(1500);
  const shown = await page.evaluate(() => ({ focus: canvas.locationDraw.children.at(-2).children.filter((c) => c.geometry)[2]?.geometry?.graphicsData?.length ?? 0, shownClass: document.querySelectorAll("#bi-location-editor .bi-journeys__leg.is-shown").length }));
  check("pressing a journey shows its route bold, with arrows, on the map", shown.focus > 3 && shown.shownClass === 1, JSON.stringify(shown));
  await shot("journeys-6-leg");
  const problems = await count(".bi-journeys__issue");
  if (problems > 0) {
    await click('[data-action="nextIssue"][data-dir="1"]');
    await sleep(1200);
    check("Next problem goes to the first problem and shows it", (await count(".bi-journeys__issue.is-current")) === 1);
    await shot("journeys-7-problem");
  } else {
    check("(no problems to step through in this episode)", true);
  }

  // ---- the report
  const report = await page.evaluate(async () => {
    window.__copied = null;
    game.clipboard.copyPlainText = async (t) => { window.__copied = t; };
    document.querySelector('#bi-location-editor [data-action="copyJourneyReport"]')?.click();
    for (let i = 0; i < 30 && !window.__copied; i++) await new Promise((r) => setTimeout(r, 100));
    return window.__copied;
  });
  check("Copy report puts the verdict, the problems and every journey on the clipboard", /^# Journeys: /m.test(report ?? "") && /Verdict: /.test(report ?? "") && /Every journey, in play order/.test(report ?? ""), (report ?? "nothing").slice(0, 80));

  // ---- the Places tab
  await click('[data-action="setTab"][data-tab="places"]');
  await waitFor(() => document.querySelectorAll("#bi-location-editor .bi-places__row").length > 10, null, 30000);
  const rows = await count(".bi-places__row");
  check("the Places tab lists the places the story uses, with how many slots use each", rows > 10 && (await count(".bi-places__count")) === rows, `${rows} places`);
  await shot("journeys-8-places");
  // a place used more than once, opened
  const shared = await page.evaluate(() => { const rows = [...document.querySelectorAll("#bi-location-editor .bi-places__row")]; const r = rows.find((x) => Number(x.querySelector(".bi-places__count")?.textContent) >= 3) ?? rows[0]; return { key: r.querySelector("[data-action='openPlace']").dataset.key, uses: Number(r.querySelector(".bi-places__count").textContent), name: r.querySelector(".bi-places__title").textContent }; });
  await page.evaluate((k) => document.querySelector(`#bi-location-editor [data-action="openPlace"][data-key="${k}"]`)?.click(), shared.key);
  await sleep(500);
  check("opening a place lists every use of it", (await count(".bi-places__row.is-open .bi-places__uses li")) === shared.uses, `${shared.name}: ${shared.uses} uses`);
  // move everything: the card, ticking, a replacement, what it would do
  await page.evaluate((k) => document.querySelector(`#bi-location-editor [data-action="startBulk"][data-key="${k}"]`)?.click(), shared.key);
  await sleep(600);
  check("'Move all' opens a card with every use ticked", (await count(".bi-places__bulk input[type=checkbox]:checked")) === shared.uses);
  await page.evaluate(() => { const i = document.querySelector('#bi-location-editor [name="bulkSearch"]'); i.focus(); i.value = "long hall"; i.dispatchEvent(new Event("input", { bubbles: true })); });
  await waitFor(() => document.querySelector('#bi-location-editor [data-action="bulkStagePick"]'), null, 10000);
  await shot("journeys-9-bulk-search");
  await click('[data-action="bulkStagePick"]');
  await waitFor(() => document.querySelector("#bi-location-editor .bi-places__bulk .bi-story__whatif"), null, 15000);
  const whatif = await page.evaluate(() => ({ head: document.querySelector("#bi-location-editor .bi-places__bulk .bi-story__whatif-head")?.textContent?.replace(/\s+/g, " ").trim(), items: document.querySelectorAll("#bi-location-editor .bi-places__bulk .bi-story__whatif li").length, move: document.querySelector('#bi-location-editor [data-action="confirmBulk"]')?.textContent?.replace(/\s+/g, " ").trim(), previewDrawn: (canvas.locationDraw.children.at(-2).children.filter((c) => c.geometry)[0]?.geometry?.graphicsData?.length ?? 0) }));
  check("choosing a replacement says what it would do to every journey, before anything is written, and draws it", !!whatif.head && whatif.items > 0 && /Move \d+/.test(whatif.move ?? "") && whatif.previewDrawn > 0, JSON.stringify(whatif));
  await shot("journeys-10-bulk-whatif");
  const savedBefore = await page.evaluate(async () => (await (await fetch("/modules/blank-inheritance/storage/")).text().catch(() => "")).length);
  void savedBefore;
  await click('[data-action="cancelBulk"]');
  await sleep(500);
  check("cancelling writes nothing and clears the preview", (await count(".bi-places__bulk")) === 0 && (await page.evaluate(() => canvas.locationDraw.children.at(-2).children.filter((c) => c.geometry)[0]?.geometry?.graphicsData?.length ?? 0)) === 0);

  // ---- the quick pin, from the Story
  await click('[data-action="setTab"][data-tab="story"]');
  await sleep(800);
  await page.evaluate(() => { for (const g of document.querySelectorAll("#bi-location-editor .bi-story__group:not(.is-open) .bi-story__group-head")) g.click(); });
  await sleep(600);
  // a placement staged in the Story says what it would do to the journeys before it is confirmed (a scene with journeys on either side of it)
  await page.evaluate(() => document.querySelectorAll('#bi-location-editor .bi-story__scene [data-action="editSlot"]')[2]?.click());
  await sleep(700);
  await page.evaluate(() => { const i = document.querySelector('#bi-location-editor [name="storySearch"]'); i.value = "long hall"; i.dispatchEvent(new Event("input", { bubbles: true })); });
  await waitFor(() => document.querySelector('#bi-location-editor [data-action="stagePick"]'), null, 10000);
  await click('[data-action="stagePick"]');
  await waitFor(() => document.querySelector("#bi-location-editor .bi-story__confirm .bi-story__whatif"), null, 10000);
  const staged = await page.evaluate(() => ({ head: document.querySelector("#bi-location-editor .bi-story__confirm .bi-story__whatif-head")?.textContent?.replace(/\s+/g, " ").trim(), items: document.querySelectorAll("#bi-location-editor .bi-story__confirm .bi-story__whatif li").length, preview: canvas.locationDraw.children.at(-2).children.filter((c) => c.geometry)[0]?.geometry?.graphicsData?.length ?? 0 }));
  check("staging a placement in the Story shows what it would do to the journeys, and draws the new routes", !!staged.head && staged.items > 0 && staged.preview > 0, JSON.stringify(staged));
  await shot("journeys-11a-story-whatif");
  await click('[data-action="cancelStage"]');
  await sleep(500);
  check("cancelling clears the preview", (await page.evaluate(() => canvas.locationDraw.children.at(-2).children.filter((c) => c.geometry)[0]?.geometry?.graphicsData?.length ?? 0)) === 0);
  await page.evaluate(() => document.querySelectorAll('#bi-location-editor .bi-story__scene [data-action="editSlot"]')[2]?.click());   // close that chooser
  await sleep(500);
  await page.evaluate(() => document.querySelector('#bi-location-editor .bi-story__scene [data-action="editSlot"]')?.click());
  await sleep(700);
  check("the place chooser offers 'Pin on the map'", (await count('[data-action="quickPin"]')) === 1);
  await shot("journeys-11-chooser");
  await click('[data-action="quickPin"]');
  await sleep(800);
  const armed = await page.evaluate(() => ({ armed: canvas.locationDraw.pinArmed, card: !!document.querySelector("#bi-location-editor .bi-pin"), help: document.querySelector("#bi-location-editor .bi-pin__help")?.textContent?.trim() ?? null }));
  check("the pin card appears and the map waits for a click", armed.armed && armed.card, JSON.stringify(armed));
  // put the camera on the Candidate Gate and move the real mouse over it
  const gate = await page.evaluate(async () => {
    const pub = await import("/modules/blank-inheritance/scripts/foundry/location-published.mjs");
    const tr = await import("/modules/blank-inheritance/scripts/core/travel-animation.mjs");
    const loaded = await pub.loadPublishedShapes();
    const cal = (await pub.hubCalibration()).calibration;
    const c = loaded.index["candidate-gate"].centroidPx;
    return tr.toScenePoint({ x: c[0] + 140, y: c[1] + 90 }, cal);
  });
  await page.evaluate((g) => canvas.animatePan({ x: g.x, y: g.y, scale: 0.8, duration: 0 }), gate);
  await sleep(1200);
  const at = await client(gate);
  await page.mouse.move(at.x - 200, at.y - 120, { steps: 4 });
  await page.mouse.move(at.x, at.y, { steps: 8 });
  await sleep(700);
  const readout = await page.evaluate(() => ({ lines: [...document.querySelectorAll("#bi-location-editor .bi-pin__readout li")].map((l) => l.textContent.replace(/\s+/g, " ").trim()), preview: canvas.locationDraw.children.at(-2).children.filter((c) => c.geometry)[0]?.geometry?.graphicsData?.length ?? 0 }));
  check("moving the cursor shows what the journeys to and from that spot would be, and draws them", readout.lines.length >= 1 && readout.preview > 0, JSON.stringify(readout.lines.slice(0, 4)));
  await shot("journeys-12-pin-preview");
  await page.mouse.click(at.x, at.y);
  await sleep(900);
  const placed = await page.evaluate(() => ({ armed: canvas.locationDraw.pinArmed, name: !!document.querySelector('#bi-location-editor [name="pinName"]'), place: !!document.querySelector('#bi-location-editor [data-action="confirmPin"]'), placeholder: document.querySelector('#bi-location-editor [name="pinName"]')?.placeholder ?? null }));
  check("the click puts the pin down and asks for a name; the wait is over", !placed.armed && placed.name && placed.place, JSON.stringify(placed));
  await shot("journeys-13-pin-placed");
  await page.evaluate(() => { const i = document.querySelector('#bi-location-editor [name="pinName"]'); i.value = "Gate queue (journeys check)"; i.dispatchEvent(new Event("input", { bubbles: true })); });
  const filesBefore = new Set(readdirSync(STORAGE));
  await click('[data-action="confirmPin"]');
  await sleep(2500);
  const written = readdirSync(STORAGE).filter((n) => !filesBefore.has(n) && /^location-edit-/.test(n));
  const records = [];
  for (const n of written) records.push(await page.evaluate(async (name) => (await fetch(`/modules/blank-inheritance/storage/${name}`)).json(), n));
  const create = records.find((r) => r.op === "create");
  const site = records.find((r) => r.op === "site");
  check("Place writes one 'create' for a point and one 'site' that points at it", records.length === 2 && create?.tier === "point" && create.geometry.point.length === 2 && create.fields.name === "Gate queue (journeys check)" && site?.viaRecord === create.id, JSON.stringify({ n: records.length, ops: records.map((r) => r.op) }));
  check("the pin's note is filled in (the pull insists on one) and its geometry is in the map image's pixels", /pin dropped/i.test(create?.fields?.note ?? "") && create.geometry.point[0] > 100 && create.geometry.point[0] < 12300, create?.fields?.note);
  const after = await page.evaluate(() => ({ card: !!document.querySelector("#bi-location-editor .bi-pin"), preview: canvas.locationDraw.children.at(-2).children.filter((c) => c.geometry)[0]?.geometry?.graphicsData?.length ?? 0, text: [...document.querySelectorAll("#bi-location-editor .bi-story__chip--pending-new")].map((c) => c.textContent.replace(/\s+/g, " ").trim()) }));
  check("the card is gone, and the Story shows the scene waiting on the new pin", !after.card && after.preview === 0 && after.text.some((t) => /Gate queue/.test(t)), JSON.stringify(after));
  await shot("journeys-14-pin-saved");
  // the journeys follow the new pin without being asked
  await click('[data-action="setTab"][data-tab="journeys"]');
  await sleep(2500);
  const rechecked = await page.evaluate(() => ({ ready: !!document.querySelector("#bi-location-editor .bi-journeys__verdict"), legs: document.querySelectorAll("#bi-location-editor .bi-journeys__leg").length }));
  check("the Journeys tab works out the new pin's journeys at once", rechecked.ready && rechecked.legs >= 20, JSON.stringify(rechecked));

  // ---- one pin for everything at a place: Places -> Move all -> Pin on the map (one 'create', and a 'site' for every use)
  await click('[data-action="setTab"][data-tab="places"]');
  await waitFor(() => document.querySelectorAll("#bi-location-editor .bi-places__row").length > 10, null, 30000);
  const everything = await page.evaluate(() => { const rows = [...document.querySelectorAll("#bi-location-editor .bi-places__row")]; const r = rows.find((x) => Number(x.querySelector(".bi-places__count")?.textContent) >= 3 && Number(x.querySelector(".bi-places__count")?.textContent) <= 6) ?? rows[0]; return { key: r.querySelector("[data-action='openPlace']").dataset.key, uses: Number(r.querySelector(".bi-places__count").textContent), name: r.querySelector(".bi-places__title").textContent }; });
  await page.evaluate((k) => document.querySelector(`#bi-location-editor [data-action="startBulk"][data-key="${k}"]`)?.click(), everything.key);
  await sleep(600);
  await click('[data-action="bulkPin"]');
  await sleep(900);
  const bulkCard = await page.evaluate(() => ({ armed: canvas.locationDraw.pinArmed, title: document.querySelector("#bi-location-editor .bi-pin__head strong")?.textContent ?? null, many: document.querySelector("#bi-location-editor .bi-pin__head small")?.textContent ?? null }));
  check("'Pin on the map' from a move-all card pins for every ticked use", bulkCard.armed && /Everything at/.test(bulkCard.title ?? "") && /\d+ places? move/.test(bulkCard.many ?? ""), JSON.stringify(bulkCard));
  await page.evaluate((g) => canvas.animatePan({ x: g.x, y: g.y, scale: 0.8, duration: 0 }), gate);
  await sleep(1000);
  const at2 = await client(gate);
  await page.mouse.move(at2.x - 160, at2.y - 90, { steps: 4 });
  await page.mouse.move(at2.x, at2.y, { steps: 6 });
  await sleep(600);
  await page.mouse.click(at2.x, at2.y);
  await sleep(800);
  await page.evaluate(() => { const i = document.querySelector('#bi-location-editor [name="pinName"]'); i.value = "Everything pin (journeys check)"; i.dispatchEvent(new Event("input", { bubbles: true })); });
  const filesBefore2 = new Set(readdirSync(STORAGE));
  await click('[data-action="confirmPin"]');
  await sleep(3500);
  const written2 = readdirSync(STORAGE).filter((n) => !filesBefore2.has(n) && /^location-edit-/.test(n));
  const records2 = [];
  for (const n of written2) records2.push(await page.evaluate(async (name) => (await fetch(`/modules/blank-inheritance/storage/${name}`)).json(), n));
  const create2 = records2.find((r) => r.op === "create");
  const sites2 = records2.filter((r) => r.op === "site");
  check("one pin and one placement for every use of the place", records2.filter((r) => r.op === "create").length === 1 && sites2.length === everything.uses && sites2.every((r) => r.viaRecord === create2?.id), JSON.stringify({ expected: everything.uses, creates: records2.filter((r) => r.op === "create").length, sites: sites2.length }));
  await shot("journeys-15-pin-for-all");

  // ---- leaving the editor
  await page.evaluate(() => { for (const app of foundry.applications.instances.values()) if (app.id === "bi-location-editor") app.close(); });
  await sleep(1200);
  const left = await page.evaluate(() => ({ container: canvas.locationDraw.children.at(-2).visible, state: canvas.locationDraw.journey.state.active, pin: canvas.locationDraw.pinArmed, routes: canvas.locationDraw.children.at(-2).children.filter((c) => c.geometry)[1]?.geometry?.graphicsData?.length ?? 0 }));
  check("closing the editor takes the routes, the token and any waiting pin off the canvas", !left.container && !left.state && !left.pin && left.routes === 0, JSON.stringify(left));

  const errors = logs.filter((l) => !/favicon|404|Failed to load resource|Failed to load audio|WebGL|reading 'querySelector'/.test(l));
  check("no errors in the console", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (err) {
  check("the run finished without an exception", false, err.stack ?? err.message);
} finally {
  try {
    await page.evaluate(async (activeId) => {
      canvas.locationDraw?.disarmAssign?.();
      canvas.locationDraw?.disarmPin?.();
      for (const id of Object.keys(canvas.locationDraw?.getSession?.().items ?? {})) await canvas.locationDraw.deleteItem(id);
      for (const app of foundry.applications.instances.values()) app.close?.();
      if (activeId) await game.scenes.get(activeId)?.activate();
    }, active);
  } catch { /* the page may be gone */ }
  await browser.close();
  if (!args.has("--keep") && existsSync(STORAGE)) {
    for (const name of readdirSync(STORAGE)) if (!before.has(name) && /^location-(edit-|draw-session)/.test(name)) rmSync(path.join(STORAGE, name), { force: true });
  }
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}
