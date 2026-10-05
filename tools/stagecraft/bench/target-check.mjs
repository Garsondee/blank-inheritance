/**
 * The select-and-aim check: a click on a card controls its token, T aims (module/stagecraft/scripts/foundry/tokens.mjs, core/tokens.mjs,
 * module.md section 39), with the module's real host, real keys and real stage on the bench (tools/stagecraft/bench/host.html), driven in
 * headless Chrome with a real graphics card, real mouse presses and real key presses, as a GM and as a player. The bench has no
 * Foundry canvas, so the cards' tokens cannot be reached and each screen answers on its own (the stage's fallback); the same things
 * with real tokens through Foundry's own `Token#control` and `Token#setTarget` are section 7e of foundry-check.mjs.
 *
 * It proves: a click chooses a card and a click on the bare stage lets go; T on a card the pointer rests on aims at it; T on nothing
 * (or on the card just chosen) starts aiming, a line says so, a click then aims, Shift adds, a click on the bare stage clears, T or
 * Escape stops; a card in the hand has T for its turn and aims at nothing; a GM's Shift-click still chooses for a formation; a player
 * cannot choose a card that is not theirs; and what is drawn follows (the snapshot says which card is controlled and who aims).
 *
 *   node tools/stagecraft/bench/target-check.mjs           (starts its own little web server on port 4195)
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
const SHOTS = process.env.TARGET_SHOTS ?? null;                    // a folder to keep screenshots in, to look at
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
  for (let y = 320; y >= 4; y -= 6) {
    const p = h.backend.project({ X: c.puppet.x, Y: y, Z: c.Z });
    if (document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS" && h.backend.pick(p.x, p.y)?.id === cid) return p;
  }
  return null;
}, id);
/** A point of the bare stage: nothing of ours under it and the canvas on top. */
const bare = (page) => page.evaluate(() => {
  const h = window.bench.host;
  for (const [fx, fy] of [[0.5, 0.12], [0.08, 0.3], [0.92, 0.3], [0.5, 0.3], [0.3, 0.1], [0.7, 0.1], [0.05, 0.6], [0.95, 0.6]]) {
    const x = innerWidth * fx;
    const y = innerHeight * fy;
    if (document.elementFromPoint(x, y)?.tagName === "CANVAS" && !h.backend.pick(x, y)) return { x, y };
  }
  return null;
});
const click = async (page, at, { shift = false } = {}) => {
  await page.bringToFront();
  if (shift) await page.keyboard.down("Shift");
  await page.mouse.click(at.x, at.y);
  if (shift) await page.keyboard.up("Shift");
  await sleep(180);
};
const hover = async (page, at) => { await page.bringToFront(); await page.mouse.move(at.x, at.y, { steps: 3 }); await sleep(150); };
const key = async (page, code, { shift = false } = {}) => {
  if (shift) await page.keyboard.down("Shift");
  await page.keyboard.press(code);
  if (shift) await page.keyboard.up("Shift");
  await sleep(180);
};
const state = (page) => page.evaluate(() => {
  const h = window.bench.host;
  const s = h.tokens.state();
  return { controlled: [...s.controlled].sort(), targets: Object.fromEntries([...s.targets].sort()), targeting: h.targeting, chosen: [...h.selected].sort(), pill: document.querySelector(".stagecraft-targeting")?.textContent ?? null, cursor: h.backend.canvas.style.cursor };
});
/** What the picture is told (the next frame's snapshot), for one card. */
const told = (page, id) => page.evaluate((cid) => {
  const h = window.bench.host;
  const s = h.tokens.state();
  const c = h.stage.snapshot({ selected: h.selected, controlled: s.controlled, targets: s.targets }).cards.find((x) => x.id === cid);
  return { controlled: c.controlled, targeted: c.targeted };
}, id);
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };

try {
  const url = (seat) => `http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern&seat=${seat}`;
  const gm = await browser.newPage();
  const player = await browser.newPage();
  const errors = [];
  for (const [name, p] of [["gm", gm], ["player", player]]) p.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  await gm.goto(url("gm"));
  await player.goto(url("player"));
  for (const p of [gm, player]) { await p.bringToFront(); await p.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 }); }
  await sleep(1800);

  const ids = await gm.evaluate(() => window.bench.scene.flags.stagecraft.published.cards.filter((c) => !c.pc).map((c) => c.id));
  const [A, B] = ids;
  const PC = "pc-1";
  const a = await where(gm, A);
  const b = await where(gm, B);
  const pc = await where(gm, PC);
  const empty = await bare(gm);
  check("there are cards to click and bare stage to click on", !!(a && b && pc && empty), JSON.stringify({ A, B, a, b, pc, empty }));
  check("the bench has no Foundry canvas, so a card has no token to reach and the stage answers on its own", (await gm.evaluate(() => window.bench.host.tokens.document(window.bench.scene.flags.stagecraft.published.cards[0].id))) === null);

  /* choosing */
  await click(gm, a);
  let st = await state(gm);
  check("a click on a card chooses it", JSON.stringify(st.controlled) === JSON.stringify([A]), JSON.stringify(st.controlled));
  check("and the picture is told so", (await told(gm, A)).controlled === true && (await told(gm, B)).controlled === false);
  check("a click is not a formation choice", st.chosen.length === 0);
  await shot(gm, "1-chosen");
  await click(gm, b);
  st = await state(gm);
  check("choosing another lets go of the first", JSON.stringify(st.controlled) === JSON.stringify([B]), JSON.stringify(st.controlled));
  await click(gm, empty);
  st = await state(gm);
  check("a click on the bare stage lets go", st.controlled.length === 0, JSON.stringify(st.controlled));
  await click(gm, a);
  await gm.mouse.move(empty.x, empty.y, { steps: 2 });
  await gm.mouse.down();
  await gm.mouse.move(empty.x + 90, empty.y + 20, { steps: 6 });
  await gm.mouse.up();
  await sleep(150);
  st = await state(gm);
  check("a drag of the bare stage (moving the view) does not let go", JSON.stringify(st.controlled) === JSON.stringify([A]), JSON.stringify(st.controlled));
  await gm.evaluate(() => window.bench.host.home({ animate: false }));
  await sleep(200);
  await click(gm, empty);
  await gm.evaluate(() => window.bench.host.home({ animate: false }));
  await sleep(150);

  /* a GM's Shift-click is still the formation's choice */
  const a2 = await where(gm, A);
  await click(gm, a2, { shift: true });
  st = await state(gm);
  check("a GM's Shift-click chooses for a formation and controls nothing", JSON.stringify(st.chosen) === JSON.stringify([A]) && st.controlled.length === 0, JSON.stringify(st));
  await click(gm, a2, { shift: true });
  check("and a second Shift-click unchooses", (await state(gm)).chosen.length === 0);

  /* T on the card under the pointer */
  const pc2 = await where(gm, PC);
  await click(gm, pc2);
  const a3 = await where(gm, A);
  await hover(gm, a3);
  await key(gm, "KeyT");
  st = await state(gm);
  check("T aims at the card the pointer rests on, while another is chosen", Object.keys(st.targets).join() === A && st.controlled.join() === PC && !st.targeting, JSON.stringify(st));
  check("and the picture shows it: the aimer's colour", Array.isArray((await told(gm, A)).targeted) && (await told(gm, A)).targeted.length === 1);
  await shot(gm, "2-aimed");
  await key(gm, "KeyT");
  check("T again on the same card lets it go", Object.keys((await state(gm)).targets).length === 0);
  const b3 = await where(gm, B);
  await hover(gm, a3);
  await key(gm, "KeyT");
  await hover(gm, b3);
  await key(gm, "KeyT", { shift: true });
  st = await state(gm);
  check("Shift+T adds another, as in Foundry", Object.keys(st.targets).sort().join() === [A, B].sort().join(), JSON.stringify(st.targets));
  await hover(gm, b3);
  await key(gm, "KeyT");
  check("T on a card that is aimed at lets that one go, and only it", Object.keys((await state(gm)).targets).join() === A);
  await hover(gm, a3);
  await key(gm, "KeyT");

  /* T on nothing: aiming */
  const bareNow = await bare(gm);
  await hover(gm, bareNow);
  await key(gm, "KeyT");
  st = await state(gm);
  check("T with the pointer on nothing starts aiming, and a line says so", st.targeting === true && /aim/i.test(st.pill ?? ""), JSON.stringify({ t: st.targeting, pill: st.pill }));
  await shot(gm, "3-aiming");
  const b4 = await where(gm, B);
  await click(gm, b4);
  st = await state(gm);
  check("while aiming, a click on a card aims at it and takes hold of nothing", Object.keys(st.targets).join() === B && st.controlled.join() === PC, JSON.stringify(st));
  check("and the pointer is a crosshair over a card", await (async () => { await hover(gm, b4); return (await state(gm)).cursor === "crosshair"; })());
  const a4 = await where(gm, A);
  await click(gm, a4, { shift: true });
  check("Shift adds another", Object.keys((await state(gm)).targets).sort().join() === [A, B].sort().join());
  await shot(gm, "4-two-aimed");
  await click(gm, a4);
  check("a click on a card aimed at lets it go", Object.keys((await state(gm)).targets).join() === B);
  await click(gm, bareNow);
  st = await state(gm);
  check("a click on the bare stage clears every aim, and the card stays chosen", Object.keys(st.targets).length === 0 && st.controlled.join() === PC && st.targeting === true, JSON.stringify(st));
  await click(gm, b4);
  await key(gm, "KeyT");
  st = await state(gm);
  check("T stops aiming, and the line goes; who was aimed at stays aimed at", !st.targeting && st.pill === null && Object.keys(st.targets).join() === B, JSON.stringify(st));
  await hover(gm, bareNow);
  await key(gm, "KeyT");
  await gm.keyboard.press("Escape");
  await sleep(150);
  st = await state(gm);
  check("Escape also stops aiming", !st.targeting && st.pill === null && Object.keys(st.targets).join() === B);
  await gm.keyboard.press("Escape");
  await sleep(150);
  check("and the next Escape clears who is aimed at", Object.keys((await state(gm)).targets).length === 0);

  /* T where the pointer rests on the card just chosen */
  await click(gm, await where(gm, PC));
  await key(gm, "KeyT");
  st = await state(gm);
  check("T on the card just chosen starts aiming (it does not aim at itself)", st.targeting === true && Object.keys(st.targets).length === 0, JSON.stringify(st));
  await key(gm, "KeyT");
  check("and T again stops", (await state(gm)).targeting === false);

  /* a card in the hand has T */
  const held = await where(gm, A);
  await gm.mouse.move(held.x, held.y, { steps: 2 });
  await gm.mouse.down();
  await gm.mouse.move(held.x + 30, held.y - 10, { steps: 4 });
  await sleep(250);
  const grabbed = await gm.evaluate(() => !!window.bench.host.dragging);
  await key(gm, "KeyT");
  st = await state(gm);
  check("with a card in the hand, T turns its back and aims at nothing", grabbed && Object.keys(st.targets).length === 0 && !st.targeting, JSON.stringify({ grabbed, ...st }));
  await gm.mouse.up();
  await sleep(300);
  await gm.keyboard.press("Escape");
  await sleep(100);

  /* the player */
  await sleep(500);
  const pa = await where(player, A);
  await click(player, pa);
  let pst = await state(player);
  check("a player cannot choose a card that is not theirs", pst.controlled.length === 0, JSON.stringify(pst.controlled));
  const own = await where(player, PC);
  await click(player, own);
  pst = await state(player);
  check("but can choose their own", pst.controlled.join() === PC, JSON.stringify(pst.controlled));
  const pa2 = await where(player, A);
  await hover(player, pa2);
  await key(player, "KeyT");
  pst = await state(player);
  check("and T aims at anyone, theirs or not", Object.keys(pst.targets).join() === A, JSON.stringify(pst.targets));
  check("what a player chooses and aims at is their screen's own: the GM's is untouched", (await state(gm)).controlled.length <= 1 && Object.keys((await state(gm)).targets).length === 0);
  await shot(player, "5-player");

  check("no page threw", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
