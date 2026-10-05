/**
 * Check that a click on a card controls its token and a T aims, inside a real, running, local Foundry (http://localhost:30000), driven from
 * headless Chrome with a real graphics card, REAL pointer and key events, a real GM and a real second player in a separate browser
 * (module.md section 39; the same things on the bench, without Foundry, are bench/target-check.mjs).
 *
 *   node tools/stagecraft/foundry-token-check.mjs              run every check, print a report
 *   node tools/stagecraft/foundry-token-check.mjs --keep       leave the test scene, actor and player in the world
 *
 * It proves what only a real Foundry can: every card of a stage gets a real token on its scene (the party's own character through its
 * actor, everyone else through a basic actor the adventure makes); a real click controls that token through Foundry's own `Token#control`
 * (so `canvas.tokens.controlled` is what the system reads); a real T goes through Foundry's keybinding manager to ours, not to Foundry's
 * own T, and aims through `Token#setTarget` (so `game.user.targets` is right, and every other screen sees the aim); a player can control
 * only their own token and can aim at anyone; a token deleted by hand is made again; a card renamed renames its token and its actor.
 * It makes its own scene, character and player, and removes what it made (and the basic actors that only it caused), and puts the
 * world's active scene back as it found it.
 */

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CAST, DESCRIPTION } from "./check-stage.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");

const URL_ = "http://localhost:30000";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SHOTS = process.env.TOKEN_SHOTS ?? null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = [];
const check = (name, pass, detail = "") => { report.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };
const logs = [];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
});
const noSpeedTest = (p) => p.evaluateOnNewDocument(() => { globalThis.__stagecraftSpeed = { settle: 3600000 }; });
const watch = (p, who) => {
  p.on("console", (m) => { const t = m.text(); if (m.type() === "error" || /stagecraft/i.test(t)) logs.push(`[${who} ${m.type()}] ${t.slice(0, 400)}`); });
  p.on("pageerror", (e) => logs.push(`[${who} pageerror] ${e.message}`));
};
async function join(name, p) {
  await p.goto(`${URL_}/join`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector('input[name="username"]', { timeout: 30000 });
  await p.type('input[name="username"]', name);
  await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), p.$eval('button[name="join"]', (b) => b.click())]);
  await p.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await sleep(1500);
  await p.evaluate(() => { for (const app of foundry.applications.instances.values()) app.close?.(); });
}
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };

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
const bareOn = (p) => p.evaluate(() => {
  const h = game.modules.get("stagecraft").api.stage();
  for (const [fx, fy] of [[0.5, 0.12], [0.3, 0.1], [0.7, 0.1], [0.08, 0.3], [0.92, 0.3], [0.5, 0.3], [0.05, 0.6], [0.95, 0.6], [0.5, 0.45]]) {
    const x = innerWidth * fx;
    const y = innerHeight * fy;
    if (document.elementFromPoint(x, y)?.tagName === "CANVAS" && !h.backend.pick(x, y)) return { x, y };
  }
  return null;
});
const click = async (p, at, { shift = false } = {}) => {
  await p.bringToFront();
  if (shift) await p.keyboard.down("Shift");
  await p.mouse.click(at.x, at.y);
  if (shift) await p.keyboard.up("Shift");
  await sleep(350);
};
const hover = async (p, at) => { await p.bringToFront(); await p.mouse.move(at.x, at.y, { steps: 4 }); await sleep(250); };
const key = async (p, code, { shift = false } = {}) => {
  if (shift) await p.keyboard.down("Shift");
  await p.keyboard.press(code);
  if (shift) await p.keyboard.up("Shift");
  await sleep(450);
};
/** What Foundry says is controlled and targeted, by card id, as this screen sees it (the system and every other module read these). */
const foundryState = (p) => p.evaluate(() => {
  const cardOf = (t) => t.document.getFlag("stagecraft", "card");
  return {
    controlled: canvas.tokens.controlled.map(cardOf).sort(),
    targets: [...game.user.targets].map(cardOf).sort(),
    everyonesAim: Object.fromEntries(canvas.tokens.placeables.filter((t) => t.targeted.size).map((t) => [cardOf(t), [...t.targeted].map((u) => u.name).sort()])),
    targeting: game.modules.get("stagecraft").api.stage().stage && !!document.querySelector(".stagecraft-targeting")
  };
});
/** What the picture really has drawn for a card now (the 3D card's own parts), not what the host meant to say. */
const painted = (p, id) => p.evaluate((cid) => {
  const v = game.modules.get("stagecraft").api.stage().backend.views?.get(cid);
  return { controlled: !!(v?.halo?.visible && v?.ring?.visible), targeted: v?.reticle?.visible ? v.reticleKey.split("|") : null };
}, id);
const tokensOf = (p) => p.evaluate((sceneId) => game.scenes.get(sceneId).tokens.contents.map((t) => ({ id: t.id, card: t.getFlag("stagecraft", "card") ?? null, name: t.name, actorId: t.actorId, link: t.actorLink, hidden: t.hidden })), SCENE);
let SCENE = null;

const made = { scene: null, actor: null, user: null, userWasThere: false };
const before = { actors: new Set(), folders: new Set(), active: null };

const gm = await browser.newPage();
try {
  await noSpeedTest(gm);
  watch(gm, "gm");
  await join("Gamemaster", gm);
  await gm.evaluate(() => Hooks.on("stagecraft.stageReady", (host) => { window.__host = host; }));
  check("the module is on, with the interface that has tokens", await gm.evaluate(() => game.modules.get("stagecraft")?.active === true && game.modules.get("stagecraft").api.version >= "0.14.0" && typeof game.modules.get("stagecraft").api.tokens?.setActorProvider === "function"), await gm.evaluate(() => game.modules.get("stagecraft")?.api?.version));
  const adventure = await gm.evaluate(() => game.modules.get("blank-inheritance")?.active === true);
  console.log(`  (the adventure is ${adventure ? "on" : "off"} in this world)`);

  // what is already in the world, to be left alone (kept here, in this process: a page reload would lose it)
  const snapshot = await gm.evaluate(() => ({ actors: game.actors.map((a) => a.id), folders: game.folders.map((f) => f.id), active: game.scenes.active?.id ?? null }));
  snapshot.actors.forEach((id) => before.actors.add(id));
  snapshot.folders.forEach((id) => before.folders.add(id));
  before.active = snapshot.active;

  /* -------------------------------------------------------------- the world: a character a player owns, a player, a stage scene */
  const playerName = "Stagecraft test player";
  const setup = await gm.evaluate(async (description, cast, playerName) => {
    const idle = async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); };
    await idle();
    let user = game.users.getName(playerName);
    const userWasThere = !!user;
    if (!user) user = await User.create({ name: playerName, role: CONST.USER_ROLES.PLAYER });
    for (const old of game.scenes.filter((s) => s.name === "Stagecraft token test")) { await old.delete(); await idle(); }
    for (const old of game.actors.filter((a) => a.name === "Stagecraft token test hero")) await old.delete();
    const hero = await Actor.create({ name: "Stagecraft token test hero", type: "character", ownership: { default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } });
    const pc = { id: "token-test-hero", name: "Test Hero", pc: true, actor: hero.id, owners: [user.id], portrait: cast[0].portrait, at: [0.5, 0.93], colour: "#33aaff" };
    const scene = await Scene.create({ name: "Stagecraft token test", flags: { stagecraft: { stage: description, published: { cards: [...cast, pc], rev: 1 } } } });
    await idle();
    return { user: user.id, userWasThere, hero: hero.id, scene: scene.id };
  }, DESCRIPTION, CAST, playerName);
  Object.assign(made, { scene: setup.scene, actor: setup.hero, user: setup.user, userWasThere: setup.userWasThere });
  SCENE = setup.scene;
  const CARDS = [...CAST.map((c) => c.id), "token-test-hero"];

  await gm.evaluate((id) => game.scenes.get(id).activate(), SCENE);
  await gm.waitForFunction((id) => canvas.scene?.id === id && game.modules.get("stagecraft").api.stage()?.backend?.ready === true, { timeout: 90000, polling: 250 }, SCENE);
  await gm.waitForFunction((n, id) => game.scenes.get(id).tokens.size >= n, { timeout: 30000, polling: 250 }, CARDS.length, SCENE).catch(() => {});
  await sleep(1500);

  /* -------------------------------------------------------------- 1. every card has a token */
  let tokens = await tokensOf(gm);
  check("every card of the stage has one token, flagged with its id", tokens.length === CARDS.length && CARDS.every((id) => tokens.filter((t) => t.card === id).length === 1), `${tokens.length} tokens for ${CARDS.length} cards`);
  check("a token is called what its card is, and is never hidden", tokens.find((t) => t.card === "kiku")?.name === "Kiku Enomoto" && tokens.every((t) => t.hidden === false), JSON.stringify(tokens.find((t) => t.card === "kiku")));
  const hero = tokens.find((t) => t.card === "token-test-hero");
  check("the party's character's token stands for their own actor, linked", hero?.actorId === setup.hero && hero.link === true, JSON.stringify(hero));
  if (adventure) {
    const basics = await gm.evaluate((sceneId) => game.scenes.get(sceneId).tokens.contents.filter((t) => t.getFlag("stagecraft", "card") !== "token-test-hero").map((t) => ({ actor: t.actor?.name ?? null, basic: t.actor?.getFlag("blank-inheritance", "stagecraftBasic") === true, real: !!t.actor?.getFlag("blank-inheritance", "sourceId"), owned: t.actor?.ownership?.default, folder: t.actor?.folder?.name ?? null, type: t.actor?.type ?? null })), SCENE);
    check("everyone else's token stands for an npc actor: their real one when the world has it (see foundry-npc-check.mjs), else a basic figure the adventure made, in a folder, that no player owns", basics.length === CAST.length && basics.every((b) => b.type === "npc" && (b.real || (b.basic && b.owned === 0 && b.folder === "Stage figures"))), JSON.stringify(basics[0]));
  } else {
    check("with no adventure to say who they are, the others' tokens stand for no actor", tokens.filter((t) => t.card !== "token-test-hero").every((t) => !t.actorId));
  }
  await gm.evaluate(() => game.modules.get("stagecraft").api.tokens.refresh());
  await sleep(500);
  check("asking again makes no more", (await tokensOf(gm)).length === CARDS.length);

  /* -------------------------------------------------------------- 2. a real click controls a token */
  const kiku = await whereOn(gm, "kiku");
  const sanzo = await whereOn(gm, "sanzo");
  const yumiko = await whereOn(gm, "yumiko");
  const heroAt = await whereOn(gm, "token-test-hero");
  const bare = await bareOn(gm);
  check("there are cards to click and bare stage to click on", !!(kiku && sanzo && yumiko && heroAt && bare), JSON.stringify({ kiku, sanzo, yumiko, heroAt, bare }));
  await click(gm, kiku);
  let st = await foundryState(gm);
  check("a real click on a card controls its token in Foundry (canvas.tokens.controlled)", st.controlled.join() === "kiku", JSON.stringify(st));
  const drawn = await painted(gm, "kiku");
  check("and the stage draws it chosen", drawn.controlled === true, JSON.stringify(drawn));
  if (!drawn.controlled) console.log("  debug:", JSON.stringify(await gm.evaluate(() => { const h = window.__host; const s = h?.tokens?.state(); const v = h?.backend?.views?.get("kiku"); return { hasHost: !!h, controlled: s ? [...s.controlled] : null, snap: h?.stage.snapshot({ controlled: s?.controlled }).cards.find((c) => c.id === "kiku")?.controlled, halo: v?.halo?.visible, ring: v?.ring?.visible, map: h?.tokens?.map ? [...h.tokens.map.keys()] : null, tokensLayerHasKiku: !!canvas.tokens.get(h?.tokens?.document("kiku")?.id) }; })));
  await shot(gm, "token-1-controlled");
  await click(gm, sanzo);
  st = await foundryState(gm);
  check("another click moves the control", st.controlled.join() === "sanzo", JSON.stringify(st.controlled));
  await click(gm, bare);
  st = await foundryState(gm);
  check("a click on the bare stage lets go", st.controlled.length === 0, JSON.stringify(st.controlled));

  /* -------------------------------------------------------------- 3. a real T aims through Foundry */
  await click(gm, heroAt);
  await hover(gm, yumiko);
  await key(gm, "KeyT");
  st = await foundryState(gm);
  check("T with the pointer on another card aims at it in Foundry (game.user.targets), once: our key, not Foundry's as well", st.targets.join() === "yumiko" && st.controlled.join() === "token-test-hero", JSON.stringify(st));
  check("and the stage draws the arrows", Array.isArray((await painted(gm, "yumiko")).targeted));
  await shot(gm, "token-2-aimed");
  await hover(gm, kiku);
  await key(gm, "KeyT", { shift: true });
  st = await foundryState(gm);
  check("Shift+T adds another", st.targets.join() === "kiku,yumiko", JSON.stringify(st.targets));
  await hover(gm, bare);
  await key(gm, "KeyT");
  st = await foundryState(gm);
  check("T with the pointer on nothing starts aiming, and says so", st.targeting === true, JSON.stringify(st));
  await click(gm, sanzo);
  st = await foundryState(gm);
  check("while aiming a click aims at the card, replacing the others, and controls nothing new", st.targets.join() === "sanzo" && st.controlled.join() === "token-test-hero", JSON.stringify(st));
  await shot(gm, "token-3-aiming");
  await click(gm, bare);
  st = await foundryState(gm);
  check("a click on the bare stage clears the aim", st.targets.length === 0 && st.targeting === true, JSON.stringify(st));
  await click(gm, kiku);
  await key(gm, "KeyT");
  st = await foundryState(gm);
  check("T stops aiming; the aim stays", st.targeting === false && st.targets.join() === "kiku", JSON.stringify(st));
  await gm.keyboard.press("Escape");
  await sleep(300);
  st = await foundryState(gm);
  check("Escape clears the aim and does not open Foundry's game menu", st.targets.length === 0 && !(await gm.evaluate(() => !!document.querySelector("#game-menu, .game-menu, [id^='menu']:not([hidden]) .menu-items"))), JSON.stringify(st));

  /* -------------------------------------------------------------- 4. a second screen: a real player */
  const context = await browser.createBrowserContext();
  const pp = await context.newPage();
  await pp.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await noSpeedTest(pp);
  watch(pp, "player");
  try {
    await join(playerName, pp);
    await pp.evaluate(() => Hooks.on("stagecraft.stageReady", (host) => { window.__host = host; }));
    await pp.waitForFunction((id) => canvas.scene?.id === id && game.modules.get("stagecraft").api.stage()?.backend?.ready === true, { timeout: 90000, polling: 250 }, SCENE);
    await sleep(2500);
    const pKiku = await whereOn(pp, "kiku");
    const pHero = await whereOn(pp, "token-test-hero");
    check("the player sees the stage and the cards", !!(pKiku && pHero));
    await click(pp, pKiku);
    let ps = await foundryState(pp);
    check("a player cannot control a token that is not theirs", ps.controlled.length === 0, JSON.stringify(ps.controlled));
    await click(pp, pHero);
    ps = await foundryState(pp);
    check("but controls their own character's", ps.controlled.join() === "token-test-hero", JSON.stringify(ps.controlled));
    await shot(pp, "token-4-player");
    const pKiku2 = await whereOn(pp, "kiku");
    await hover(pp, pKiku2);
    await key(pp, "KeyT");
    ps = await foundryState(pp);
    check("and aims at anyone", ps.targets.join() === "kiku", JSON.stringify(ps.targets));
    await sleep(600);
    const gmSees = await foundryState(gm);
    check("the GM's screen sees the player's aim, as theirs", (gmSees.everyonesAim.kiku ?? []).includes(playerName), JSON.stringify(gmSees.everyonesAim));
    const gmPaints = await painted(gm, "kiku");
    check("and draws it", Array.isArray(gmPaints.targeted) && gmPaints.targeted.length === 1, JSON.stringify(gmPaints));
    await gm.bringToFront();
    const gKiku = await whereOn(gm, "kiku");
    await hover(gm, gKiku);
    await key(gm, "KeyT");
    const both = await foundryState(gm);
    check("when the GM aims at the same card both aims are drawn, the GM's colour first", (both.everyonesAim.kiku ?? []).length === 2 && (await painted(gm, "kiku")).targeted.length === 2, JSON.stringify(both.everyonesAim));
    await shot(gm, "token-5-two-aimers");
    await key(gm, "KeyT");
    await pp.keyboard.press("Escape");
    await sleep(300);
  } finally {
    await context.close();
  }

  /* -------------------------------------------------------------- 5. the tokens follow the cards */
  const lost = (await tokensOf(gm)).find((t) => t.card === "tama");
  await gm.evaluate(({ sceneId, id }) => game.scenes.get(sceneId).tokens.get(id).delete(), { sceneId: SCENE, id: lost.id });
  await sleep(2500);
  tokens = await tokensOf(gm);
  check("a token deleted by hand is made again", tokens.filter((t) => t.card === "tama").length === 1 && tokens.length === CARDS.length, `${tokens.length} tokens`);
  await gm.evaluate(async (sceneId) => {
    const scene = game.scenes.get(sceneId);
    const cards = foundry.utils.deepClone(scene.flags.stagecraft.published.cards);
    cards.find((c) => c.id === "tama").name = "Tama Okabe";
    await scene.update({ "flags.stagecraft.published": { cards, rev: 99 } });
  }, SCENE);
  await sleep(2500);
  tokens = await tokensOf(gm);
  check("a card renamed renames its token", tokens.find((t) => t.card === "tama")?.name === "Tama Okabe", tokens.find((t) => t.card === "tama")?.name);
  if (adventure) check("and its basic actor", await gm.evaluate((sceneId) => game.scenes.get(sceneId).tokens.contents.find((t) => t.getFlag("stagecraft", "card") === "tama").actor?.name === "Tama Okabe", SCENE));
  await gm.evaluate(async (sceneId) => {
    const scene = game.scenes.get(sceneId);
    const cards = foundry.utils.deepClone(scene.flags.stagecraft.published.cards).filter((c) => c.id !== "tama");
    await scene.update({ "flags.stagecraft.published": { cards, rev: 100 } });
  }, SCENE);
  await sleep(2500);
  tokens = await tokensOf(gm);
  check("a card that leaves takes its token with it", tokens.every((t) => t.card !== "tama") && tokens.length === CARDS.length - 1, `${tokens.length} tokens`);

  const errors = logs.filter((l) => /^\[(gm|player) (error|pageerror)\]/.test(l) && !/favicon|404|JournalEntryPage "[^"]+" does not exist|Error creating WebGL context|Failed to load audio element/.test(l));
  check("no errors in either console", errors.length === 0, errors.slice(0, 4).join(" | "));
  if (logs.length) console.log("\nconsole:\n" + logs.slice(0, 20).join("\n"));

} catch (err) {
  check("the run finished without an exception", false, err.stack ?? err.message);
} finally {
  if (!args.get("keep") && made.scene) {
    try {
      await gm.evaluate(async ({ made, before }) => {
        const idle = async () => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); };
        // the world's own active scene goes back first, so the test scene is not on screen when it is deleted
        if (before.active) await game.scenes.get(before.active)?.activate(); else await game.scenes.active?.update({ active: false });
        await idle();
        await game.scenes.get(made.scene)?.delete();
        await idle();
        await game.actors.get(made.actor)?.delete();
        // basic actors this run caused (positively: flagged, and not in the world before the run)
        const doomed = game.actors.filter((a) => a.getFlag("blank-inheritance", "stagecraftBasic") === true && !before.actors.includes(a.id)).map((a) => a.id);
        for (const id of doomed) await game.actors.get(id)?.delete();
        // the folder, if this run made it and nothing is left in it
        for (const f of game.folders.filter((f) => f.getFlag("blank-inheritance", "stageFigures") === true && !before.folders.includes(f.id))) if (!f.contents.length) await f.delete();
        if (!made.userWasThere) await game.users.get(made.user)?.delete();
      }, { made, before: { actors: [...before.actors], folders: [...before.folders], active: before.active } });
    } catch (err) { console.log("could not tidy up:", err.message); }
  }
  const failed = report.filter((r) => !r).length;
  console.log(`\n${report.length - failed}/${report.length} checks passed`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
