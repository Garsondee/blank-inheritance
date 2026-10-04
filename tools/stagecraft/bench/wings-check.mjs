/**
 * The wings check: the people a scene could still bring on (foundry/wings.mjs), with the module's real host on the bench
 * (tools/stagecraft/bench/host.html), driven in headless Chrome with real mouse presses, drags and keys, as a GM and as a
 * player in two pages that share scene updates. It proves that the GM, and only the GM, gets the tray and a faded card where
 * each waiting person would stand; that a click, a right-click's way and a drag onto the stage each raise `stagecraft.bring`
 * with what they mean, and a drag dropped anywhere else (or put down with Escape) raises nothing; that the finder finds and
 * brings; that the faded cards can be hidden; that someone whose card arrives leaves the wings; and that another module's
 * own things on a card's menu are offered and run. The live check against the real Foundry (foundry-check.mjs) remains the
 * proof that the stage works in Foundry itself.
 *
 *   node tools/stagecraft/bench/wings-check.mjs           (starts its own little web server on port 4195)
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

/** A point on a card's face that the pointer can reach (nothing over it), in window pixels. */
const where = (page, id) => page.evaluate((cid) => {
  const h = window.bench.host;
  const c = h.stage.cards.get(cid);
  if (!c) return null;
  for (let y = 320; y >= 4; y -= 6) {
    const p = h.backend.project({ X: c.puppet.x, Y: y, Z: c.Z });
    if (document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS" && h.backend.pick(p.x, p.y)?.id === cid) return p;
  }
  return null;
}, id);
/** The middle of something on the page, or null. */
const middle = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
}, selector);
/** Where on the window a point of the painting (its floor) is. */
const onFloor = (page, at) => page.evaluate((f) => {
  const h = window.bench.host;
  const p = h.stage.rig.place(f);
  return h.backend.project({ X: p.X, Y: 0, Z: p.Z });
}, at);
const brought = (page) => page.evaluate(() => window.brought.splice(0));
const drag = async (page, from, to, { escape = false } = {}) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12); await sleep(16); }
  if (escape) { await page.keyboard.press("Escape"); await sleep(60); }
  await page.mouse.up();
  await sleep(200);
};

try {
  const url = (seat) => `http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=e1-kit-issue&seat=${seat}`;
  const gm = await browser.newPage();
  const player = await browser.newPage();
  const errors = [];
  for (const [name, p] of [["gm", gm], ["player", player]]) p.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  await gm.goto(url("gm"));
  await player.goto(url("player"));
  for (const p of [gm, player]) { await p.bringToFront(); await p.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 }); }
  await sleep(1200);

  // the adventure's part, as its bridge plays it: who waits, how they can come on, anyone else, and two things of its own on
  // a card's menu. Registered the way api.wings and api.blocking.setCardActions register them.
  for (const p of [gm, player]) await p.evaluate(async () => {
    const wings = await import("/module/stagecraft/scripts/foundry/wings.mjs");
    const menu = await import("/module/stagecraft/scripts/foundry/card-menu.mjs");
    window.brought = [];
    window.ran = [];
    window.waiting = [
      { id: "summon-waiting-a", name: "Waiting A", title: "Stands by the counter", at: [0.3, 0.86], portrait: "modules/blank-inheritance/assets/stage/nobu.webp", way: "announced" },
      { id: "summon-waiting-b", name: "Waiting B" },
      { id: "summon-nobu", name: "Already on the stage", at: [0.5, 0.8] }
    ];
    wings.registerWings(() => ({
      people: window.waiting,
      ways: [{ id: "quiet", label: "Walk on" }, { id: "announced", label: "Announce" }, { id: "splash", label: "Splash" }]
    }));
    wings.registerFinder(async (scene, q) => (/ta/i.test(q) ? [{ id: "found-taka", name: "Taka", note: "Canteen" }] : []));
    menu.registerCardActions((scene, id) => [{ id: "send-off", label: "Send off", run: () => window.ran.push(id) }]);
    Hooks.on("stagecraft.bring", (e) => window.brought.push({ ...e, scene: e.scene?.id }));
  });
  await sleep(500);

  /* who waits, and where */
  await gm.bringToFront();                                   // a page in the back draws nothing, and a press there waits for ever
  const tray = await gm.evaluate(() => ({
    faces: [...document.querySelectorAll(".stagecraft-wings .wings-person")].map((b) => b.dataset.id),
    none: document.querySelector(".stagecraft-wings .wings-none")?.hidden,
    ghosts: [...document.querySelectorAll(".stagecraft-ghost")].map((g) => g.dataset.id)
  }));
  check("the GM's tray shows everyone waiting, and not someone already on the stage", JSON.stringify(tray.faces) === JSON.stringify(["summon-waiting-a", "summon-waiting-b"]), JSON.stringify(tray.faces));
  check("'Nobody waiting' is not shown while someone is", tray.none === true);
  check("a faded card stands for the one with a place, and only for them", JSON.stringify(tray.ghosts) === JSON.stringify(["summon-waiting-a"]), JSON.stringify(tray.ghosts));
  const ghost = await gm.evaluate(() => {
    const el = document.querySelector(".stagecraft-ghost");
    const r = el.getBoundingClientRect();
    const h = window.bench.host;
    const p = h.stage.rig.place([0.3, 0.86]);
    const foot = h.backend.project({ X: p.X, Y: 0, Z: p.Z });
    return { cx: r.left + r.width / 2, bottom: r.bottom, w: r.width, h: r.height, footX: foot.x, footY: foot.y };
  });
  check("the faded card stands where the stage would stand them, card-sized", Math.abs(ghost.cx - ghost.footX) < 3 && Math.abs(ghost.bottom - ghost.footY) < 40 && ghost.h > ghost.w && ghost.h > 60, JSON.stringify(ghost));
  const trayBox = await gm.evaluate(() => document.querySelector(".stagecraft-wings").getBoundingClientRect().toJSON());
  const key = await gm.evaluate(() => document.querySelector(".stagecraft-gm-toggle").getBoundingClientRect().toJSON());
  check("the tray stands under the Stage key, clear of it", trayBox.top >= key.bottom, `${trayBox.top} vs ${key.bottom}`);
  await gm.click(".stagecraft-gm-toggle");
  await sleep(250);
  const opened = await gm.evaluate(() => ({ tray: document.querySelector(".stagecraft-wings").getBoundingClientRect().top, strips: Math.max(...[...document.querySelectorAll(".stagecraft-bar")].map((b) => b.getBoundingClientRect().bottom)) }));
  check("with the strips unfolded, the tray moves down under them", opened.tray >= opened.strips, JSON.stringify(opened));
  await gm.click(".stagecraft-gm-toggle");
  await sleep(250);

  await player.bringToFront();
  await sleep(300);
  const playerSees = await player.evaluate(() => ({ tray: !!document.querySelector(".stagecraft-wings"), ghosts: document.querySelectorAll(".stagecraft-ghost").length }));
  check("a player's screen has no tray and no faded cards", !playerSees.tray && playerSees.ghosts === 0, JSON.stringify(playerSees));

  /* the three hands */
  await gm.bringToFront();
  const g = await middle(gm, ".stagecraft-ghost");
  await gm.mouse.click(g.x, g.y);
  await sleep(200);
  let b = await brought(gm);
  check("a click on a faded card brings them on, their own way, at their own place", b.length === 1 && b[0].id === "summon-waiting-a" && b[0].way === null && b[0].at === null && b[0].found === false && b[0].scene === "bench-scene", JSON.stringify(b));
  check("and they are dimmed while they come", await gm.evaluate(() => document.querySelector('.stagecraft-ghost[data-id="summon-waiting-a"]')?.classList.contains("coming")));
  await gm.evaluate(() => { window.bench.host.wings.coming.clear(); window.bench.host.wings.trayKey = null; return window.bench.host.wings.refresh(); });
  await sleep(150);

  const faceB = await middle(gm, '.wings-person[data-id="summon-waiting-b"]');
  await gm.mouse.click(faceB.x, faceB.y, { button: "right" });
  await sleep(200);
  const ways = await gm.evaluate(() => {
    const m = document.getElementById("stagecraft-ways-menu");
    if (!m) return null;
    const r = m.getBoundingClientRect();
    const onTop = [[0.5, 0.5], [0.1, 0.1], [0.9, 0.9]].every(([fx, fy]) => m.contains(document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy)));
    return { name: m.querySelector(".menu-name")?.textContent, ways: [...m.querySelectorAll(".menu-action")].map((x) => x.textContent), onTop };
  });
  check("a right-click on a face asks how: their own way first, then the provider's", ways?.name === "Waiting B" && JSON.stringify(ways?.ways) === JSON.stringify(["Bring on", "Walk on", "Announce", "Splash"]), JSON.stringify(ways));
  check("the menu is on top of everything", ways?.onTop === true);
  const splash = await gm.evaluate(() => { const el = [...document.querySelectorAll("#stagecraft-ways-menu .menu-action")].find((x) => x.textContent === "Splash"); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await gm.mouse.click(splash.x, splash.y);
  await sleep(200);
  b = await brought(gm);
  check("picking a way brings them on that way", b.length === 1 && b[0].id === "summon-waiting-b" && b[0].way === "splash", JSON.stringify(b));
  check("and the menu closes", (await gm.$("#stagecraft-ways-menu")) === null);
  await gm.evaluate(() => { window.bench.host.wings.coming.clear(); window.bench.host.wings.trayKey = null; return window.bench.host.wings.refresh(); });
  await sleep(150);

  const g2 = await middle(gm, ".stagecraft-ghost");
  await gm.mouse.click(g2.x, g2.y, { button: "right" });
  await sleep(200);
  const own = await gm.evaluate(() => [...document.querySelectorAll("#stagecraft-ways-menu .menu-action")].map((x) => x.textContent));
  check("a faded card's right-click names their own way first", JSON.stringify(own) === JSON.stringify(["Bring on: Announce", "Walk on", "Splash"]), JSON.stringify(own));
  await gm.keyboard.press("Escape");
  await sleep(150);
  check("Escape closes the ways and brings nobody", (await gm.$("#stagecraft-ways-menu")) === null && (await brought(gm)).length === 0);

  const target = await onFloor(gm, [0.62, 0.9]);
  const faceA = await middle(gm, '.wings-person[data-id="summon-waiting-a"]');
  await drag(gm, faceA, target);
  b = await brought(gm);
  const landed = b[0]?.at;
  check("a face dragged onto the stage brings them on where it was dropped", b.length === 1 && b[0].id === "summon-waiting-a" && Array.isArray(landed) && Math.abs(landed[0] - 0.62) < 0.02 && Math.abs(landed[1] - 0.9) < 0.02, JSON.stringify(b));
  check("nothing is left following the pointer", (await gm.$(".stagecraft-carry")) === null);
  await gm.evaluate(() => { window.bench.host.wings.coming.clear(); window.bench.host.wings.trayKey = null; return window.bench.host.wings.refresh(); });
  await sleep(150);

  const g3 = await middle(gm, ".stagecraft-ghost");
  const target2 = await onFloor(gm, [0.45, 0.92]);
  await drag(gm, g3, target2);
  b = await brought(gm);
  check("a faded card dragged somewhere else on the stage comes on there", b.length === 1 && Math.abs((b[0].at?.[0] ?? 9) - 0.45) < 0.02, JSON.stringify(b));
  await gm.evaluate(() => { window.bench.host.wings.coming.clear(); window.bench.host.wings.trayKey = null; return window.bench.host.wings.refresh(); });
  await sleep(150);

  const faceA2 = await middle(gm, '.wings-person[data-id="summon-waiting-a"]');
  await drag(gm, faceA2, { x: faceA2.x + 120, y: faceA2.y });
  check("dropped back on the tray, nobody comes", (await brought(gm)).length === 0);
  await drag(gm, faceA2, target, { escape: true });
  check("Escape while carrying puts them back, and nobody comes", (await brought(gm)).length === 0 && (await gm.$(".stagecraft-carry")) === null);

  /* anyone else */
  const find = await middle(gm, ".wings-find");
  await gm.mouse.click(find.x, find.y);
  await gm.keyboard.type("ta");
  await sleep(450);
  const hits = await gm.evaluate(() => [...document.querySelectorAll(".wings-found .wings-hit")].map((h) => h.textContent));
  check("the finder finds anyone else", hits.length === 1 && /Taka/.test(hits[0]) && /Canteen/.test(hits[0]), JSON.stringify(hits));
  const hit = await middle(gm, ".wings-found .wings-hit");
  await gm.mouse.click(hit.x, hit.y);
  await sleep(200);
  b = await brought(gm);
  check("a click on what was found brings them on, marked as found", b.length === 1 && b[0].id === "found-taka" && b[0].found === true, JSON.stringify(b));
  check("and the box is cleared", (await gm.evaluate(() => document.querySelector(".wings-find").value)) === "" && (await gm.evaluate(() => document.querySelector(".wings-found").hidden)) === true);
  await gm.mouse.click(find.x, find.y);
  await gm.keyboard.type("zz");
  await sleep(450);
  check("a name nobody has says so", await gm.evaluate(() => !!document.querySelector(".wings-found .wings-nohit")));
  await gm.keyboard.press("Escape");
  await sleep(100);

  /* showing them, and their leaving */
  await gm.click(".wings-eye");
  await sleep(250);
  check("the eye hides the faded cards", await gm.evaluate(() => document.querySelector(".stagecraft-ghosts").hidden === true));
  await gm.click(".wings-eye");
  await sleep(250);
  check("and shows them again", await gm.evaluate(() => document.querySelector(".stagecraft-ghosts").hidden === false && document.querySelectorAll(".stagecraft-ghost").length === 1));
  const clear = await gm.evaluate(() => { const r = document.querySelector(".stagecraft-ghost").getBoundingClientRect(); const e = document.elementFromPoint(r.right + 60, r.top + r.height / 2); return e?.tagName; });
  check("beside a faded card, the stage itself still takes the pointer", clear === "CANVAS", clear);

  await gm.evaluate(async () => {
    const s = window.bench.scene;
    const cards = [...s.flags.stagecraft.published.cards, { id: "summon-waiting-a", name: "Waiting A", at: [0.3, 0.86], owners: ["gm"] }];
    await s.update({ "flags.stagecraft.published": { cards, rev: (s.flags.stagecraft.published.rev ?? 0) + 1 } });
  });
  await sleep(700);
  const after = await gm.evaluate(() => ({
    faces: [...document.querySelectorAll(".stagecraft-wings .wings-person")].map((x) => x.dataset.id),
    ghosts: document.querySelectorAll(".stagecraft-ghost").length,
    card: window.bench.host.stage.cards.has("summon-waiting-a")
  }));
  check("someone whose card arrives leaves the wings: their face and their faded card go", after.card && JSON.stringify(after.faces) === JSON.stringify(["summon-waiting-b"]) && after.ghosts === 0, JSON.stringify(after));

  /* another module's own things on a card's menu */
  await sleep(800);
  const nobu = await where(gm, "summon-nobu");
  check("a point on Nobu's card can be reached", !!nobu, JSON.stringify(nobu));
  await gm.mouse.click(nobu.x, nobu.y, { button: "right" });
  await sleep(200);
  const actions = await gm.evaluate(() => [...document.querySelectorAll("#stagecraft-card-menu .menu-action")].map((x) => [x.dataset.action, x.textContent]));
  check("the GM's card menu offers another module's own things after the stage's", JSON.stringify(actions.at(-1)) === JSON.stringify(["extra:send-off", "Send off"]), JSON.stringify(actions));
  const send = await middle(gm, '#stagecraft-card-menu [data-action="extra:send-off"]');
  await gm.mouse.click(send.x, send.y);
  await sleep(200);
  check("and runs it, for that card", JSON.stringify(await gm.evaluate(() => window.ran)) === JSON.stringify(["summon-nobu"]));
  await player.bringToFront();
  await sleep(600);
  const theirs = await where(player, "pc-1");
  if (theirs) { await player.mouse.click(theirs.x, theirs.y, { button: "right" }); await sleep(200); }
  check("a player's card menu never offers them", (await player.evaluate(() => document.querySelectorAll('#stagecraft-card-menu [data-action^="extra:"]').length)) === 0);

  check("no page threw", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
