/**
 * Check the Location Editor's real buildings in a real, running, local Foundry (http://localhost:30000), driven from headless Chrome with
 * REAL pointer events (design/location-editor.md section 11: calling handlers proves the handler, not the tool). It makes the checks the GM
 * made by hand on 2026-10-05: the real buildings are on the map; "Change where this happens" -> "Pick on the map" takes a building (not a
 * district) and adopts a real one; Areas can still be chosen on purpose; a click in Places mode on a real building adopts it.
 *
 *   node tools/location-sync/foundry-buildings-check.mjs [--keep]
 *
 * Needs the local Foundry up with the adventure's world synced (a "The City" hub scene), and the module's data folder holding
 * data/campaign/map/buildings-index.json (python tools/location-sync/export_buildings.py, then the module-sync's data copy). It writes nothing
 * to the repo: the editor's own autosave and any record it saves are found and removed at the end.
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
const SHOTS = process.env.BUILDINGS_SHOTS ?? null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const args = new Set(process.argv.slice(2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail = "") => { step = name; results.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const before = new Set(existsSync(STORAGE) ? readdirSync(STORAGE) : []);
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", protocolTimeout: 600000, args: ["--hide-scrollbars", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist"], defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { globalThis.__stagecraftSpeed = { settle: 3600000 }; });
const logs = [];
let step = "start";
page.on("console", (m) => { if (m.type() === "error") logs.push(m.text().slice(0, 300)); });
page.on("pageerror", (e) => logs.push(`pageerror during "${step}": ${e.message}`));
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };
let active = null;

/** Where a scene point is on this page, in client pixels. */
const client = (p) => page.evaluate((pt) => { const c = canvas.clientCoordinatesFromCanvas(pt); return { x: c.x, y: c.y }; }, p);

try {
  await page.goto("http://localhost:30000/join", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 30000 });
  await page.type('input[name="username"]', "Gamemaster");
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), page.$eval('button[name="join"]', (b) => b.click())]);
  await page.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await sleep(2000);
  await page.evaluate(() => { for (const app of foundry.applications.instances.values()) app.close?.(); });
  active = await page.evaluate(() => game.scenes.active?.id ?? null);

  // the hub, on screen
  const hub = await page.evaluate(() => game.scenes.find((s) => s.getFlag("blank-inheritance", "sourceId") === "the-city")?.id ?? null);
  check("the world has the Campaign Map hub scene", !!hub);
  await page.evaluate(async (id) => { const idle = async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); }; await idle(); await game.scenes.get(id).view(); await idle(); }, hub);
  await page.waitForFunction((id) => canvas.scene?.id === id && canvas.ready, { timeout: 120000, polling: 500 }, hub);
  await sleep(2000);

  // (viewing the hub throws one error of Foundry's own scene-controls code in this adventure's world, before the editor is involved: not this check's to count)
  logs.length = 0;
  // the editor opens on the story tab, claims the canvas, and loads the buildings
  await page.evaluate(() => game.modules.get("blank-inheritance").api.openLocationEditor());
  await page.waitForFunction(() => canvas.locationDraw?.active === true, { timeout: 30000 });
  await page.waitForFunction(() => ["ok", "missing", "error", "no-hub"].includes(canvas.locationDraw.buildingsSummary.state), { timeout: 120000, polling: 500 });
  const summary = await page.evaluate(() => ({ ...canvas.locationDraw.buildingsSummary }));
  check("the real buildings of the map are loaded on the hub scene", summary.state === "ok" && summary.count > 30000 && summary.onHub, JSON.stringify(summary));

  // find a real building worth clicking: named, not under any existing place, with room around it; and the existing places near it
  const target = await page.evaluate(async () => {
    const core = await import("/modules/blank-inheritance/scripts/core/buildings-index.mjs");
    const pub = await import("/modules/blank-inheritance/scripts/foundry/location-published.mjs");
    const tr = await import("/modules/blank-inheritance/scripts/core/travel-animation.mjs");
    const doc = await (await fetch("/modules/blank-inheritance/data/campaign/map/buildings-index.json")).json();
    const decoded = core.decodeIndex(doc);
    const hubCal = await pub.hubCalibration();
    const toScene = (p) => tr.toScenePoint(p, hubCal.calibration);
    const field = core.layOutBuildings(decoded, toScene, { cell: 400 });
    const loaded = await pub.loadPublishedShapes();
    const placeAt = (x, y) => { const sceneP = { x, y }; return canvas.locationDraw && loaded.shapes.some((s) => { const c = toScene({ x: s.point?.[0] ?? (s.rings[0]?.[0]?.[0] ?? 0), y: s.point?.[1] ?? (s.rings[0]?.[0]?.[1] ?? 0) }); return Math.hypot(c.x - sceneP.x, c.y - sceneP.y) < 90; }); };
    const candidates = field.all.filter((b) => b.name && b.area > 400);
    const free = candidates.find((b) => !placeAt((b.bounds.x0 + b.bounds.x1) / 2, (b.bounds.y0 + b.bounds.y1) / 2));
    const b = free ?? candidates[0] ?? field.all[0];
    return { id: b.id, name: b.name, kind: b.kind, centre: { x: (b.bounds.x0 + b.bounds.x1) / 2, y: (b.bounds.y0 + b.bounds.y1) / 2 }, ring: b.ringScene.map((p) => [p.x, p.y]), imageRing: decoded.buildings.find((x) => x.id === b.id).ring, areaM2: b.areaM2 };
  });
  check("a real building to try was found", !!target?.id, `${target.name ?? "(unnamed)"} ${target.kind} ${target.areaM2} m2`);

  // look at it: close in, so its outline and its neighbours are on screen
  await page.evaluate((c) => canvas.animatePan({ x: c.x, y: c.y, scale: 0.9, duration: 0 }), target.centre);
  await sleep(1500);
  const drawn = await page.evaluate(() => { const g = canvas.locationDraw.children[0].children[0]; return { visible: canvas.locationDraw.children[0].visible, shapes: g?.geometry?.graphicsData?.length ?? g?.polygons?.length ?? 0 }; });
  check("the real buildings are drawn on the map", drawn.visible && drawn.shapes > 20, JSON.stringify(drawn));
  await shot("buildings-1-drawn");

  // ---- the Story flow: Change where this happens -> Pick on the map -> a real building, not a district
  await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 500)); });
  const hasStory = await page.waitForFunction(() => document.querySelector('#bi-location-editor [data-action="editSlot"], #bi-location-editor [data-action="toggleGroup"]'), { timeout: 60000 }).then(() => true).catch(() => false);
  check("the Story tab is there", hasStory);
  for (let i = 0; i < 4; i++) {
    const open = await page.evaluate(() => !!document.querySelector('#bi-location-editor [data-action="editSlot"]'));
    if (open) break;
    await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="toggleGroup"]:not(.is-open)')?.click());
    await sleep(600);
    await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="toggleScene"]')?.click());
    await sleep(600);
  }
  await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="editSlot"]')?.click());
  await sleep(800);
  const chooser = await page.evaluate(() => ({
    pick: !!document.querySelector('#bi-location-editor [data-action="pickOnMap"]'),
    targets: [...document.querySelectorAll('#bi-location-editor [data-action="setPickTarget"]')].map((b) => ({ target: b.dataset.target, on: b.classList.contains("is-active") }))
  }));
  check("'Change where this happens' offers Pick on the map, with Buildings and pins on and Areas as the other choice", chooser.pick && chooser.targets.length === 2 && chooser.targets.find((t) => t.target === "places")?.on === true && chooser.targets.find((t) => t.target === "areas")?.on === false, JSON.stringify(chooser));
  await shot("buildings-2-chooser");

  await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="pickOnMap"]')?.click());
  await sleep(800);
  check("Pick on the map waits for a click", await page.evaluate(() => canvas.locationDraw.assignArmed === true));
  check("while it waits the layer is taking buildings, not districts", await page.evaluate(() => canvas.locationDraw.assignTarget === "places"));
  const at = await client(target.centre);
  await page.mouse.move(at.x, at.y, { steps: 6 });
  await sleep(500);
  await shot("buildings-3-hover");
  await page.mouse.click(at.x, at.y);
  await sleep(1500);
  const afterPick = await page.evaluate(() => {
    const items = Object.values(canvas.locationDraw.getSession().items);
    const panel = document.querySelector("#bi-location-editor");
    return {
      armed: canvas.locationDraw.assignArmed,
      items: items.map((i) => ({ tier: i.tier, locationId: i.locationId, name: i.name, source: i.source?.buildingId ?? null, vertices: i.geometry?.ringPx?.length ?? 0, note: i.fields?.note ?? "" })),
      selected: canvas.locationDraw.selectedIds.length,
      banner: panel?.querySelector(".bi-story__banner")?.textContent?.trim() ?? null
    };
  });
  check("the click took the REAL building (a new draft place), not a district", afterPick.items.length === 1 && afterPick.items[0].tier === "site" && afterPick.items[0].source === target.id && afterPick.items[0].locationId === null, JSON.stringify(afterPick.items));
  check("with its exact footprint", afterPick.items[0]?.vertices === target.ring.length, `${afterPick.items[0]?.vertices} vertices (the map's has ${target.ring.length})`);
  check("named from the map and noted, ready to save", (afterPick.items[0]?.name ?? "") === (target.name ?? "") && /real .*building .*store id/.test(afterPick.items[0]?.note ?? ""), afterPick.items[0]?.note);
  check("it is selected, and the panel is on the map tab drawing it for the scene", afterPick.selected === 1 && /Drawing a place for/.test(afterPick.banner ?? ""), afterPick.banner);
  await shot("buildings-4-adopted");

  // "Copy for Claude" (section 14): the picked shape as one JSON document on the clipboard. The clipboard itself is not what is tested (a headless
  // page may refuse it): Foundry's own copy call is taken over to catch the text, and the real button is pressed.
  const handed = await page.evaluate(async () => {
    window.__copied = null;
    game.clipboard.copyPlainText = async (text) => { window.__copied = text; };
    document.querySelector('#bi-location-editor [data-action="copyForClaude"]')?.click();
    for (let i = 0; i < 40 && !window.__copied; i++) await new Promise((r) => setTimeout(r, 100));
    return window.__copied;
  });
  let doc = null;
  try { doc = JSON.parse(handed); } catch { /* reported below */ }
  const first = doc?.items?.[0];
  check("Copy for Claude puts a location hand-off on the clipboard", doc?.kind === "location-handoff" && doc?.items?.length === 1, (handed ?? "nothing copied").slice(0, 120));
  check("it names the REAL building adopted, with its exact outline in the map image's pixels", first?.adoptedFrom?.buildingId === target.id && first?.geometry?.rings?.[0]?.length === target.ring.length && first?.tier === "site" && first?.saved === false, JSON.stringify(first?.adoptedFrom));
  check("the outline is the map's own pixels (the building's, not the scene's)", !!first && first.geometry.rings[0].every(([x, y], i) => Math.abs(x - target.imageRing[i][0]) < 1.5 && Math.abs(y - target.imageRing[i][1]) < 1.5), JSON.stringify(first?.geometry?.rings?.[0]?.slice(0, 2)));
  check("it carries the form, the district and the neighbours", !!first?.fields && Array.isArray(first.containedIn) && Array.isArray(first.nearest) && first.nearest.length > 0 && doc.map.sceneName?.length > 0, `${first?.containedIn?.length} containing, ${first?.nearest?.length} near`);

  // Save: the same road a drawn building takes, then back on the story tab to confirm the placement
  const saved = await page.evaluate(async () => {
    document.querySelector('#bi-location-editor [data-action="save"]')?.click();
    for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 250)); if (document.querySelector("#bi-location-editor .bi-story__confirm")) break; }
    return { confirm: document.querySelector("#bi-location-editor .bi-story__confirm-line")?.textContent?.replace(/\s+/g, " ").trim() ?? null };
  });
  check("Save writes the new place and the Story tab asks to confirm putting the scene there", !!saved.confirm && /drawn just now/i.test(saved.confirm), saved.confirm);
  await shot("buildings-5-confirm");
  await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="cancelStage"]')?.click());
  await sleep(500);

  // ---- Areas on purpose
  await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="editSlot"]')?.click());
  await sleep(500);
  await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="editSlot"]')?.click());
  await sleep(500);
  await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="pickOnMap"]')?.click());
  await sleep(500);
  await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="setPickTarget"][data-target="areas"]')?.click());
  await sleep(500);
  check("Areas can be chosen on purpose", await page.evaluate(() => canvas.locationDraw.assignTarget === "areas" && canvas.locationDraw.assignArmed));
  await shot("buildings-6-areas-target");
  await page.mouse.click(at.x, at.y);
  await sleep(1200);
  const area = await page.evaluate(() => {
    const confirm = document.querySelector("#bi-location-editor .bi-story__confirm-line")?.textContent?.replace(/\s+/g, " ").trim() ?? null;
    return { confirm, armed: canvas.locationDraw.assignArmed, sessionItems: Object.keys(canvas.locationDraw.getSession().items).length };
  });
  check("a click then takes the district under it (a confirm card for an area), adopting no building", !!area.confirm && !area.armed, JSON.stringify(area));
  await shot("buildings-7-area-picked");
  await page.evaluate(() => document.querySelector('#bi-location-editor [data-action="cancelStage"]')?.click());

  // "reading 'querySelector'": Foundry's own SceneControls#activate, run by the editor's layer.activate() in this adventure's world, where the
  // left-hand scene controls are not on screen (found 2026-10-05; the editor works regardless, and it predates the real buildings)
  const errors = logs.filter((l) => !/favicon|404|Failed to load resource|Failed to load audio|WebGL|reading 'querySelector'/.test(l));
  check("no errors in the console", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (err) {
  check("the run finished without an exception", false, err.stack ?? err.message);
} finally {
  try {
    await page.evaluate(async (activeId) => {
      canvas.locationDraw?.disarmAssign?.();
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

