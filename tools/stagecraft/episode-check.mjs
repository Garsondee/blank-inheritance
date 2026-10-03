/**
 * Does Episode One really run on the puppet stage? Drives the local Foundry (http://localhost:30000) from headless Chrome
 * with REAL pointer events, as the GM and as a real player in a second browser, through what a table would do:
 *
 *   - Stagecraft is off in the world; the adventure's bridge switches it on by itself and the page reloads;
 *   - the centipede fight, the Kit Issue and the Canteen are puppet stages (drawn by Stagecraft, the older frames absent);
 *   - the GM opens the Scene Runner, clicks "The nest wakes", and six centipedes come onto the stage;
 *   - a real player sees the stage, holds their own card by a real press, cannot hold a centipede, and is sent nothing about
 *     someone who has not been revealed.
 *
 *   node tools/stagecraft/episode-check.mjs [--keep]
 *
 * Needs the local Foundry running with the world launched (node tools/stagecraft/launch-world.mjs). It makes a test player
 * and a test character and removes them again (unless --keep), and puts the world's active scene back.
 */

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const SHOTS = path.join(repo, "design", "stagecraft", "lab", "shots");
mkdirSync(SHOTS, { recursive: true });
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = [];
const check = (name, pass, detail = "") => { report.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };
const logs = [];

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new",
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"]
});
const gm = await browser.newPage();
gm.on("console", (m) => { if (m.type() === "error") logs.push(`[gm ${m.type()}] ${m.text().slice(0, 300)}`); });
gm.on("pageerror", (e) => logs.push(`[gm pageerror] ${e.message}`));

async function join(p, name) {
  await p.goto("http://localhost:30000/join", { waitUntil: "domcontentloaded" });
  await p.waitForSelector('input[name="username"]', { timeout: 30000 });
  await p.type('input[name="username"]', name);
  await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), p.$eval('button[name="join"]', (b) => b.click())]);
  await p.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
}
const calm = (p) => p.evaluate(() => { for (const app of foundry.applications.instances.values()) if (!/scene-runner|runner/i.test(app.id ?? "")) app.close?.(); document.querySelectorAll(".application").forEach((el) => { if (el.textContent.includes("Sync campaign content now")) [...el.querySelectorAll("button")].find((b) => /not now|later|close/i.test(b.textContent))?.click(); }); });
const stageReady = (p, sceneId) => p.waitForFunction((id) => canvas.scene?.id === id && game.modules.get("stagecraft")?.api?.stage()?.backend?.ready === true, { timeout: 90000, polling: 250 }, sceneId);
const idle = (p) => p.evaluate(async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); });
const cardsOn = (p) => p.evaluate(() => { const s = game.modules.get("stagecraft").api.stage(); return s ? [...s.stage.cards.entries()].map(([id, c]) => ({ id, holder: c.holder, grip: +c.grip.toFixed(2), x: Math.round(c.puppet.x) })) : []; });
const whereOn = (p, id) => p.evaluate((cid) => {
  const s = game.modules.get("stagecraft").api.stage();
  const c = s.stage.cards.get(cid);
  if (!c) return null;
  for (let y = 300; y >= 30; y -= 10) {
    const pt = s.backend.project({ X: c.puppet.x, Y: y, Z: c.Z });
    if (document.elementFromPoint(pt.x, pt.y)?.tagName === "CANVAS" && s.backend.pick(pt.x, pt.y)?.id === cid) return pt;
  }
  return null;
}, id);

let restore = null;
let userId = null;
let actorId = null;
let player = null;
try {
  /* ---------------------------------------------------------------- 1. it switches itself on */
  await join(gm, "Gamemaster");
  await sleep(2500);
  check("Stagecraft is installed in this world", await gm.evaluate(() => !!game.modules.get("stagecraft")));
  await gm.evaluate(async () => { const c = foundry.utils.deepClone(game.settings.get("core", "moduleConfiguration")); c.stagecraft = false; await game.settings.set("core", "moduleConfiguration", c); });
  await sleep(600);
  await gm.goto("http://localhost:30000/game", { waitUntil: "domcontentloaded" });
  await gm.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  check("with the module off in the world to begin with", await gm.evaluate(() => game.modules.get("stagecraft").active === false));
  await gm.waitForFunction(() => globalThis.game?.ready === true && game.modules.get("stagecraft")?.api, { timeout: 60000, polling: 500 });
  await sleep(2500);
  check("the adventure switches it on by itself, and the page comes back with it running", await gm.evaluate(() => game.modules.get("stagecraft").active === true && !!game.modules.get("stagecraft").api));
  await calm(gm);

  /* ---------------------------------------------------------------- 2. the three scenes are puppet stages */
  const ids = await gm.evaluate(async () => {
    const find = (sourceId) => game.scenes.find((s) => s.getFlag("blank-inheritance", "sourceId") === sourceId);
    const want = ["e1-flood-tunnel", "e1-kit-issue", "e1-canteen"];
    for (let i = 0; i < 80 && !want.every((w) => find(w)?.flags?.stagecraft?.stage); i++) await new Promise((r) => setTimeout(r, 250));
    return Object.fromEntries(want.map((w) => [w, { id: find(w)?.id, staged: !!find(w)?.flags?.stagecraft?.stage, name: find(w)?.name }]));
  });
  for (const [sourceId, s] of Object.entries(ids)) check(`${s.name ?? sourceId} carries its stage description (written by the bridge)`, s.staged, s.id);
  const flood = ids["e1-flood-tunnel"].id;

  /* a test player, with a character who is theirs */
  const made = await gm.evaluate(async (flood) => {
    let user = game.users.getName("Episode test player");
    if (!user) user = await User.create({ name: "Episode test player", role: CONST.USER_ROLES.PLAYER });
    let actor = game.actors.getName("Episode test pilot");
    if (!actor) actor = await Actor.create({ name: "Episode test pilot", type: "character", ownership: { default: 0, [user.id]: 3 } });
    await user.update({ character: actor.id });
    return { userId: user.id, actorId: actor.id, previous: game.scenes.active && !game.scenes.active.name.startsWith("Stagecraft") ? game.scenes.active.id : null };
  }, flood);
  userId = made.userId; actorId = made.actorId; restore = made.previous;

  /* ---------------------------------------------------------------- 3. the centipede fight, from the Scene Runner */
  await gm.evaluate(async (id) => {
    const api = game.modules.get("blank-inheritance").api;
    const scene = game.scenes.get(id);
    await api.writeAuthoredCast(scene, []);
    await scene.update({ "flags.stagecraft.-=published": null });
    await scene.activate();
    await scene.view();
  }, flood);
  await stageReady(gm, flood);
  await sleep(3500);
  const drawn = await gm.evaluate(() => ({ backend: game.modules.get("stagecraft").api.stage().backend.name, overlay: !!document.getElementById("bi-stage"), canvasHidden: canvas.app.view.style.display }));
  check("the flood tunnel is drawn by Stagecraft: no older frames over it, Foundry's own canvas stood down", drawn.backend === "three" && !drawn.overlay && drawn.canvasHidden === "none", JSON.stringify(drawn));
  const party = await cardsOn(gm);
  check("the test pilot is on the stage as a card, put there by itself", party.some((c) => c.id.includes(actorId)), JSON.stringify(party.map((c) => c.id)));
  await gm.evaluate(() => game.modules.get("blank-inheritance").api.openSceneRunner("episode-c1e1-mothers-maiden-name", "episode-c1e1--flood-tunnel"));
  await sleep(2500);
  const chip = await gm.evaluate(async () => {
    const el = document.querySelector('button.bi-trig[data-trigger-id="nest-wakes"]');
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    await new Promise((r) => setTimeout(r, 400));
    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2;
    const y = r.y + r.height / 2;
    return { x, y, reachable: document.elementFromPoint(x, y)?.closest("button.bi-trig") === el };
  });
  check('"The nest wakes" is on the Scene Runner and a real click can reach it', chip?.reachable === true, JSON.stringify(chip));
  const before = (await cardsOn(gm)).length;
  await gm.mouse.move(chip.x, chip.y);
  await sleep(150);
  await gm.mouse.click(chip.x, chip.y);
  await sleep(4000);
  const after = await cardsOn(gm);
  check("a real click on it brings six giant centipedes onto the stage", after.length === before + 6 && after.filter((c) => c.id.includes("giant-centipede")).length === 6, `${before} -> ${after.length} cards`);
  await gm.evaluate(() => game.modules.get("blank-inheritance").api.openSceneRunner?.());   // (closes the drawer if it toggles)
  await sleep(800);
  await gm.screenshot({ path: path.join(SHOTS, "episode-check-gm-nest.png") });

  /* ---------------------------------------------------------------- 4. a real player */
  const context = await browser.createBrowserContext();
  player = await context.newPage();
  player.on("console", (m) => { if (m.type() === "error") logs.push(`[player ${m.type()}] ${m.text().slice(0, 300)}`); });
  player.on("pageerror", (e) => logs.push(`[player pageerror] ${e.message}`));
  await join(player, "Episode test player");
  await sleep(2500);
  await calm(player);
  await stageReady(player, flood);
  await sleep(2500);
  const seen = await player.evaluate(() => ({ backend: game.modules.get("stagecraft").api.stage().backend.name, overlay: !!document.getElementById("bi-stage"), cards: [...game.modules.get("stagecraft").api.stage().stage.cards.keys()] }));
  check("the player is on the same puppet stage, with all the cards, and none of the older frames", seen.backend === "three" && !seen.overlay && seen.cards.length === after.length, JSON.stringify({ backend: seen.backend, cards: seen.cards.length }));
  await player.screenshot({ path: path.join(SHOTS, "episode-check-player.png") });

  // their own card: a real press picks it up by its stick
  const own = await whereOn(player, `summon-${actorId}`);
  check("the player can reach their own card with the pointer", !!own, JSON.stringify(own));
  await player.mouse.move(own.x, own.y);
  await sleep(150);
  await player.mouse.down();
  await sleep(600);
  const mine = (await cardsOn(player)).find((c) => c.id.includes(actorId));
  check("a real press picks it up, stick out, held by the player", mine.holder === userId && mine.grip > 0.5, JSON.stringify(mine));
  const onGm = (await cardsOn(gm)).find((c) => c.id.includes(actorId));
  check("and the GM's screen sees the player holding it", onGm.holder === userId, JSON.stringify(onGm));
  await player.mouse.up();
  await sleep(1200);

  // a centipede is the GM's
  const bug = await whereOn(player, "summon-giant-centipede-2");
  if (bug) {
    await player.mouse.move(bug.x, bug.y);
    await sleep(150);
    await player.mouse.down();
    await sleep(600);
    const held = (await cardsOn(player)).find((c) => c.id === "summon-giant-centipede-2");
    await player.mouse.up();
    check("a player cannot pick up a centipede: the people of the story are the GM's to move", held.holder === null && held.grip < 0.1, JSON.stringify(held));
  } else {
    check("a centipede can be reached to try it", false, "none of its points is clear of the interface");
  }

  // Law 11: someone not yet revealed is not in anything the player was sent
  await gm.evaluate(async (id) => {
    const api = game.modules.get("blank-inheritance").api;
    const scene = game.scenes.get(id);
    const vault = game.journal.find((j) => j.getFlag("blank-inheritance", "casts"));
    const cast = vault?.getFlag("blank-inheritance", "casts")?.[id] ?? [];
    await api.writeAuthoredCast(scene, [...cast, { portraitId: "summon-hidden-guest", label: "Zzyzx Hiddenname", revealed: false, kind: "npc", img: "modules/blank-inheritance/assets/stage/nobu.webp" }]);
  }, flood);
  await sleep(2500);
  const wire = await player.evaluate((id) => JSON.stringify(game.scenes.get(id).flags), flood);
  check("someone who has not been revealed is in nothing the player was sent", !/Zzyzx|hidden-guest/.test(wire));
  const stillSix = (await cardsOn(player)).length;
  check("and the stage the player sees is unchanged by it", stillSix === after.length, `${stillSix} cards`);

  /* ---------------------------------------------------------------- 5. the other two scenes */
  for (const sourceId of ["e1-kit-issue", "e1-canteen"]) {
    const sid = ids[sourceId].id;
    await gm.evaluate(async (id) => { const scene = game.scenes.get(id); await scene.activate(); }, sid);
    await stageReady(gm, sid);
    await sleep(2500);
    const now = await gm.evaluate(() => ({ backend: game.modules.get("stagecraft").api.stage().backend.name, overlay: !!document.getElementById("bi-stage"), cards: game.modules.get("stagecraft").api.stage().stage.cards.size }));
    check(`${ids[sourceId].name} is a puppet stage too, with the test pilot already on it`, now.backend === "three" && !now.overlay && now.cards >= 1, JSON.stringify(now));
    await gm.screenshot({ path: path.join(SHOTS, `episode-check-${sourceId}.png`) });
  }
  await context.close().catch(() => {});
  player = null;
} catch (err) {
  check("the run finished without an exception", false, err.stack?.split("\n").slice(0, 3).join(" | ") ?? String(err));
} finally {
  const errors = logs.filter((l) => !/favicon|404|does not exist|Error creating WebGL/.test(l));
  check("no errors in either console", errors.length === 0, errors.slice(0, 3).join(" | "));
  if (player) await player.close().catch(() => {});
  try {
    await gm.evaluate(async (s) => {
      while (canvas.loading) await new Promise((r) => setTimeout(r, 100));
      if (s.keep) return;
      if (s.userId) await game.users.get(s.userId)?.delete();
      if (s.actorId) await game.actors.get(s.actorId)?.delete();
      if (s.previous) await game.scenes.get(s.previous)?.activate();
      else await game.scenes.active?.update({ active: false });
    }, { userId, actorId, previous: restore, keep: !!args.get("keep") });
  } catch { /* the page may be gone */ }
  console.log(`\n${report.filter(Boolean).length}/${report.length} checks passed`);
  await browser.close();
  process.exitCode = report.every(Boolean) ? 0 : 1;
}
