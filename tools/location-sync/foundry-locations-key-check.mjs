/**
 * Check, in a real, running, local Foundry (http://localhost:30000), that the Scene Runner header's Locations key does what Ingram asked
 * (2026-10-05): from any other scene, one real click cuts the GM's own screen to the Campaign Map (01. The City), opens the Location Editor
 * on it and puts the canvas into the editor (so drawing and picking work at once); and on the map already, the click only (re)opens the editor.
 * The players' scene is never changed (`view`, not `activate`).
 *
 *   node tools/location-sync/foundry-locations-key-check.mjs
 *
 * It leaves the world as it found it: the scene the GM was viewing is shown again, the editor is closed.
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail = "") => { results.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", protocolTimeout: 600000, args: ["--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist"], defaultViewport: { width: 1920, height: 1080 } });
const gm = await browser.newPage();
await gm.evaluateOnNewDocument(() => { globalThis.__stagecraftSpeed = { settle: 3600000 }; });
const logs = [];
gm.on("console", (m) => { if (m.type() === "error") logs.push(m.text().slice(0, 300)); });
gm.on("pageerror", (e) => logs.push(`pageerror ${e.message}`));
const idle = () => gm.evaluate(async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); });
let viewedBefore = null;
try {
  await gm.goto("http://localhost:30000/join", { waitUntil: "domcontentloaded" });
  await gm.waitForSelector('input[name="username"]', { timeout: 30000 });
  await gm.type('input[name="username"]', "Gamemaster");
  await Promise.all([gm.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), gm.$eval('button[name="join"]', (b) => b.click())]);
  await gm.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await sleep(5000);
  // (nothing is closed here: the Scene Runner is an application too, and it is what is being tested)

  const world = await gm.evaluate(async () => {
    const { hubScene } = await import("/modules/blank-inheritance/scripts/foundry/travel.mjs");
    const hub = await hubScene();
    const other = game.scenes.contents.find((s) => s.id !== hub?.id && !s.active);
    return { hub: hub ? { id: hub.id, name: hub.name } : null, other: other ? { id: other.id, name: other.name } : null, viewing: canvas.scene?.id ?? null, active: game.scenes.active?.id ?? null };
  });
  viewedBefore = world.viewing;
  check("the world has a Campaign Map scene (01. The City)", !!world.hub, JSON.stringify(world.hub));
  if (!world.hub || !world.other) throw new Error("needs a Campaign Map scene and one other scene in the local world");

  // the Runner is on screen when the world loads (it is not remounted by a later scene change in this headless run): so start from whatever scene
  // the GM is on, and if that IS the map, only then move off it with Foundry's own scene call and let the Runner follow
  if (!world.viewing || world.viewing === world.hub.id) { await gm.evaluate(async (id) => { await game.scenes.get(id).view(); }, world.other.id); await idle(); }
  await gm.waitForSelector('#bi-scene-runner [data-action="openLocationEditor"]', { timeout: 30000 }).catch(() => {});
  let key = await gm.$('#bi-scene-runner [data-action="openLocationEditor"]');
  // the Runner slides in from the left: closed, its header is off screen. Open it the way the GM does (its own toggle).
  if (key && ((await key.boundingBox())?.x ?? 0) < 0) { await gm.evaluate(() => document.querySelector(".bi-runner-toggle")?.click()); await sleep(1500); key = await gm.$('#bi-scene-runner [data-action="openLocationEditor"]'); }
  check("the Scene Runner header has the Locations key", !!key);
  if (!key) console.log("runner dom:", await gm.evaluate(() => JSON.stringify({ host: document.querySelector("#bi-scene-runner")?.className, html: document.querySelector("#bi-scene-runner")?.innerHTML.slice(0, 400), scene: canvas.scene?.name })));
  if (!key) throw new Error("no Locations key in the Runner header (is the Runner open and showing a scene?)");
  const box = await key.boundingBox();
  check("it is small and on screen", !!box && box.x >= 0 && box.width < 200 && box.height < 60, JSON.stringify(box));

  const before = await gm.evaluate(() => ({ scene: canvas.scene?.name, active: game.scenes.active?.id ?? null }));
  await key.click();
  await gm.waitForFunction((id) => canvas.scene?.id === id && !canvas.loading, { timeout: 60000, polling: 250 }, world.hub.id);
  await sleep(3000);
  const after = await gm.evaluate(() => ({
    scene: canvas.scene?.name,
    layerActive: canvas.locationDraw?.active === true,
    editorOpen: [...foundry.applications.instances.values()].some((a) => a.id?.includes?.("location") || a.constructor?.name === "LocationEditorApplication"),
    active: game.scenes.active?.id ?? null
  }));
  check("one click cut the GM's screen to the Campaign Map", after.scene === world.hub.name, `${before.scene} -> ${after.scene}`);
  check("the Location Editor window is open", after.editorOpen);
  check("the canvas is in the editor (its layer is active), so picking and drawing work at once", after.layerActive);
  check("the players' scene was not moved (view, not activate)", after.active === before.active, `${before.active} -> ${after.active}`);

  // on the map already: the key does not cut again, and re-claims the canvas if the layer was left
  await gm.evaluate(() => canvas.tokens.activate());
  await sleep(500);
  await (await gm.$('#bi-scene-runner [data-action="openLocationEditor"]')).click();
  await sleep(1500);
  const again = await gm.evaluate(() => ({ scene: canvas.scene?.name, layerActive: canvas.locationDraw?.active === true }));
  check("pressed again on the map: still the map, and the canvas is back in the editor", again.scene === world.hub.name && again.layerActive);

  const errors = logs.filter((l) => !/favicon|404|Failed to load resource|Failed to load audio|WebGL|querySelector|addChild|addHighlightLayer/.test(l));
  check("no errors in the console", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (err) {
  check("the run finished without an exception", false, err.stack ?? err.message);
} finally {
  try {
    await gm.evaluate(async (id) => {
      for (const app of foundry.applications.instances.values()) if (app.constructor?.name === "LocationEditorApplication") await app.close();
      if (id) await game.scenes.get(id)?.view();
    }, viewedBefore);
  } catch (err) { console.log("could not tidy up:", err.message); }
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
