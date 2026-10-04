/**
 * The card menu check: a right-click on a card (foundry/card-menu.mjs), with the module's real host on the bench
 * (tools/stagecraft/bench/host.html), driven in headless Chrome with real mouse presses, as a GM and as a player in two pages
 * that share scene updates and the module's socket. It proves that a right-click opens a card's menu (and never the browser's),
 * that the GM's menu has the emotes and the GM's things and a player's has the emotes alone and only on a card of theirs, that
 * an emote picked is written on the card and shown on both screens, once or kept, that a player's pick goes through the GM's
 * screen, that Clear takes a kept one off, and that the GM's floor and knock-down work from it. The live check against the real
 * Foundry (foundry-check.mjs) remains the proof that the stage works in Foundry itself.
 *
 *   node tools/stagecraft/bench/menu-check.mjs           (starts its own little web server on port 4194)
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
  args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--window-size=1920,1080"],
  defaultViewport: { width: 1920, height: 1080 }
});

/** A point on a card's face that the pointer can reach (nothing over it), in window pixels. */
const where = (page, id) => page.evaluate((cid) => {
  const h = window.bench.host;
  const c = h.stage.cards.get(cid);
  for (let y = 320; y >= 4; y -= 6) {                          // low enough to find a card lying on the floor
    const p = h.backend.project({ X: c.puppet.x, Y: y, Z: c.Z });
    if (document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS" && h.backend.pick(p.x, p.y)?.id === cid) return p;
  }
  return null;
}, id);
const rightClick = async (page, at) => { await page.bringToFront(); await page.mouse.click(at.x, at.y, { button: "right" }); await sleep(200); };
const menuOf = (page) => page.evaluate(() => {
  const m = document.querySelector(".stagecraft-card-menu");
  if (!m) return null;
  const r = m.getBoundingClientRect();
    // on top of everything: at its middle and near each corner, what the pointer would meet is the menu itself
    const at = [[0.5, 0.5], [0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]].map(([fx, fy]) => document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy));
    const onTop = at.every((e) => !!e && m.contains(e));
  return {
    onTop,
    name: m.querySelector(".menu-name")?.textContent, emotes: m.querySelectorAll(".menu-emote").length,
    actions: [...m.querySelectorAll(".menu-action")].map((b) => b.dataset.action), clear: !!m.querySelector(".menu-clear"),
    inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight
  };
});
const press = async (page, selector) => {
  const el = await page.$(`.stagecraft-card-menu ${selector}`);
  if (!el) return false;
  const b = await el.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(200);
  return true;
};
const emoteOn = (page, id) => page.evaluate((cid) => window.bench.scene.flags.stagecraft.published.cards.find((c) => c.id === cid)?.emote ?? null, id);
const shown = (page, id) => page.evaluate((cid) => window.bench.host.stage.snapshot().cards.find((c) => c.id === cid)?.emote?.id ?? null, id);

try {
  const url = (seat) => `http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern&seat=${seat}`;
  const gm = await browser.newPage();
  const player = await browser.newPage();
  const errors = [];
  for (const [name, p] of [["gm", gm], ["player", player]]) p.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  await gm.goto(url("gm"));
  await player.goto(url("player"));
  for (const p of [gm, player]) { await p.bringToFront(); await p.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 }); }
  await sleep(1500);
  // the browser's own menu, if it ever opened, would be a "contextmenu" event nobody prevented
  for (const p of [gm, player]) await p.evaluate(() => { window.__browserMenu = 0; addEventListener("contextmenu", (e) => { if (!e.defaultPrevented) window.__browserMenu++; }); });

  /* the GM */
  const sanzo = await where(gm, "summon-sanzo");
  check("a point on Sanzo's card can be reached", !!sanzo, JSON.stringify(sanzo));
  await rightClick(gm, sanzo);
  let menu = await menuOf(gm);
  check("a right-click on a card opens its menu, with its name", !!menu && /sanzo/i.test(menu.name ?? ""), JSON.stringify(menu));
  check("the GM's menu has every emote", menu?.emotes === 30, `${menu?.emotes}`);
  check("and the GM's own things: the floor, a knock-down, choosing for a formation", JSON.stringify(menu?.actions) === JSON.stringify(["floor", "down", "choose"]), JSON.stringify(menu?.actions));
  check("it opens inside the window", menu?.inside === true);
  check("it is on top of everything on the page", menu?.onTop === true);
  // the adventure's deck, a window, a notification: a cover over the whole page at Foundry's notification layer
  await gm.evaluate(() => { const c = document.createElement("div"); c.id = "cover"; c.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.1)"; document.body.append(c); });
  check("even over a page-wide cover put on after it, at Foundry's notification layer", (await menuOf(gm))?.onTop === true);
  await gm.evaluate(() => document.getElementById("cover").remove());
  check("the browser's own menu does not open", (await gm.evaluate(() => window.__browserMenu)) === 0);
  await gm.keyboard.press("Escape");
  await sleep(150);
  check("Escape closes it", (await menuOf(gm)) === null);
  await rightClick(gm, sanzo);
  await gm.mouse.click(40, 1040);
  await sleep(150);
  check("a press anywhere else closes it", (await menuOf(gm)) === null);

  await rightClick(gm, sanzo);
  check("picking an emote closes the menu", (await press(gm, '[data-emote="laugh"]')) && (await menuOf(gm)) === null);
  await sleep(400);
  const laugh = await emoteOn(gm, "summon-sanzo");
  check("the emote picked is written on the card, once, chosen", laugh?.id === "laugh" && laugh.once === true && laugh.chosen === true, JSON.stringify(laugh));
  check("and is shown on both screens", (await shown(gm, "summon-sanzo")) === "laugh" && (await shown(player, "summon-sanzo")) === "laugh");
  await sleep(5600);
  check("shown once, it is gone again", (await shown(gm, "summon-sanzo")) === null && (await shown(player, "summon-sanzo")) === null);

  await rightClick(gm, sanzo);
  await press(gm, ".menu-keep");
  check("Keep it up is a switch, and stays open to pick with", (await gm.$(".stagecraft-card-menu .menu-keep.on")) !== null);
  await press(gm, '[data-emote="hand"]');
  await sleep(6400);
  check("kept, it comes round again", (await shown(player, "summon-sanzo")) === "hand" || (await emoteOn(player, "summon-sanzo"))?.once === undefined);
  await rightClick(gm, sanzo);
  menu = await menuOf(gm);
  check("the kept emote is marked in the menu, with Clear beside Keep it up", menu?.clear === true && (await gm.$('.stagecraft-card-menu [data-emote="hand"].on')) !== null);
  await press(gm, ".menu-clear");
  await sleep(400);
  check("Clear takes it off on both screens", (await emoteOn(player, "summon-sanzo"))?.id === null && (await shown(player, "summon-sanzo")) === null);
  await rightClick(gm, sanzo);
  await press(gm, ".menu-keep");                                    // and back off, for whoever uses this browser next

  // the GM's own things
  await rightClick(gm, sanzo);
  await press(gm, '[data-action="floor"]');
  await sleep(400);
  check("Give them the floor gives them the floor", (await player.evaluate(() => window.bench.host.stage.speaker)) === "summon-sanzo");
  await rightClick(gm, sanzo);
  check("and the menu then offers to take it back", await gm.$eval('.stagecraft-card-menu [data-action="floor"]', (b) => /take back/i.test(b.textContent)));
  await press(gm, '[data-action="floor"]');
  await rightClick(gm, sanzo);
  await press(gm, '[data-action="down"]');
  await sleep(400);
  check("Knock down knocks them down", (await emoteOn(gm, "summon-sanzo")) !== undefined && (await player.evaluate(() => window.bench.scene.flags.stagecraft.published.cards.find((c) => c.id === "summon-sanzo").down)) === true);
  await sleep(1500);                                          // it has finished falling
  const lying = await where(gm, "summon-sanzo");
  check("a card lying down can still be right-clicked", !!lying, JSON.stringify(lying));
  if (lying) { await rightClick(gm, lying); await press(gm, '[data-action="down"]'); await sleep(400); }
  check("and Stand up stands them up", (await gm.evaluate(() => window.bench.scene.flags.stagecraft.published.cards.find((c) => c.id === "summon-sanzo").down)) !== true);

  /* the player */
  await sleep(1500);
  const theirs = await where(player, "pc-1");
  await rightClick(player, theirs);
  menu = await menuOf(player);
  check("a player's right-click on their own card opens its menu with the emotes alone", menu?.emotes === 30 && menu.actions.length === 0, JSON.stringify(menu));
  await press(player, '[data-emote="blush"]');
  await sleep(600);
  const blush = await emoteOn(player, "pc-1");
  check("their pick goes through the GM's screen and is written on their card", blush?.id === "blush" && blush.chosen === true, JSON.stringify(blush));
  check("and is shown on both screens", (await shown(gm, "pc-1")) === "blush" && (await shown(player, "pc-1")) === "blush");
  const notTheirs = await where(player, "summon-sanzo");
  await rightClick(player, notTheirs);
  check("a player's right-click on someone else's card opens nothing", (await menuOf(player)) === null);
  check("and never the browser's menu either", (await player.evaluate(() => window.__browserMenu)) === 0);

  check("no page threw", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
