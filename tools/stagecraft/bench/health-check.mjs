/**
 * The health check: how each screen at the table is coping (core/health.mjs, foundry/health.mjs), and the start-up speed test
 * (core/speed.mjs, foundry/speed.mjs). The module's real host in headless Chrome with a real graphics card, as a GM and as a
 * player in two pages that share the module's socket. It proves:
 *
 *   - the GM's board lists everyone at the table, "no stage" for a player who has none, and fills in a player's picture and
 *     frame rate once their stage is up; opened, it asks everyone to report; it is the GM's alone;
 *   - left on Automatic, a computer is tested for a moment, found fine, and left alone (and not tested again);
 *   - a computer found slow twice is moved down to the lighter stage, one found to crawl goes to the plain stage at once, the
 *     finding is remembered by that browser's next page, and a player who chose a tier is never tested or moved;
 *   - none of it throws, and the stage is never taken down by it.
 *
 * The limits are laid over by `globalThis.__stagecraftSpeed` (a bench-only seam) so a fast machine can be "slow" on demand.
 *
 *   node tools/stagecraft/bench/health-check.mjs        (starts its own little web server on port 4195)
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
const SHOTS = path.join(repo, "design", "stagecraft", "lab", "shots", "bench");
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

const errors = [];
const messages = [];

/** Open the bench's stage as a seat, with the speed test's limits laid over, and wait for it. */
async function open({ seat = "gm", tier = "high", fresh = false, speed = null, stage = "haunt-the-paper-lantern" } = {}) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(`${seat}: ${e}`));
  page.on("console", (m) => { messages.push(m.text()); });
  if (speed) await page.evaluateOnNewDocument((s) => { globalThis.__stagecraftSpeed = s; }, speed);
  await page.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=${stage}&seat=${seat}&tier=${tier}${fresh ? "&fresh=1" : ""}`);
  await page.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 });
  return page;
}

const kept = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem("stagecraft.speed")); } catch { return null; } });
const rows = (page) => page.$$eval(".stagecraft-health li", (lis) => lis.map((li) => ({ name: li.querySelector("b").textContent, how: li.querySelector("span").textContent, level: li.dataset.level })));
const unfold = async (page) => {
  await page.bringToFront();
  const key = await (await page.$(".stagecraft-gm-toggle")).boundingBox();
  await page.mouse.click(key.x + key.width / 2, key.y + key.height / 2);
  await sleep(200);
};

try {
  /* ------------------------------------------------ the GM's board */
  const gm = await open({ seat: "gm" });
  await sleep(1500);
  check("a player has no board and the GM has one", true);
  await unfold(gm);
  const pill = await gm.$(".stagecraft-health .pill");
  check("the GM has the board's pill beside the Stage key, once the strips are unfolded", !!pill && (await pill.boundingBox()) !== null);
  await pill.click();
  await sleep(400);
  let list = await rows(gm);
  check("opened, it lists everyone at the table: the GM, and the player who has no stage yet", list.length === 2 && list.some((r) => r.name === "Player" && r.how === "no stage" && r.level === "stale"), JSON.stringify(list));
  const own = list.find((r) => r.name === "Gamemaster");
  check("the GM's own screen is on the board, with its picture", !!own && /^lit/.test(own.how), JSON.stringify(own));

  const player = await open({ seat: "player" });
  check("a player has no board", (await player.$(".stagecraft-health")) === null);
  await player.bringToFront();
  await sleep(5000);                                     // a screen's first report goes out four seconds after it starts
  await gm.bringToFront();
  await sleep(600);
  list = await rows(gm);
  const theirs = list.find((r) => r.name === "Player");
  check("a player's stage reports in: the board shows their picture", !!theirs && /^lit/.test(theirs.how), JSON.stringify(theirs));
  check("and the pill says how many are on a stage", await gm.$eval(".stagecraft-health .pill span", (s) => /Table 2\/2/.test(s.textContent)));
  const level = await gm.$eval(".stagecraft-health .pill", (p) => p.dataset.level);
  check("the pill's dot is the worst of the table: nobody is struggling here", level === "ok" || level === "warn" || level === "plain", level);
  await gm.screenshot({ path: path.join(SHOTS, "health-board.jpg"), type: "jpeg", quality: 88, clip: { x: 560, y: 30, width: 800, height: 220 } });
  await player.close();
  await gm.close();

  /* ------------------------------------------------ the start-up speed test */
  const quick = { settle: 300, again: 1200 };

  const fine = await open({ tier: "auto", fresh: true, speed: quick });
  await fine.bringToFront();
  await fine.waitForFunction(() => window.bench.host.speed?.last, { timeout: 15000 }).catch(() => {});
  const found = await fine.evaluate(() => window.bench.host.speed.last);
  check("left on Automatic, a computer is tested for a moment, and a fast one is found fine", found?.verdict === "ok", JSON.stringify(found));
  check("and it is left alone: still the lit stage", await fine.evaluate(() => window.bench.host.backend.name === "three" && window.bench.host.backend.tier === "high"));
  check("what was found is kept, so it is not tested again", (await kept(fine))?.ok === true, JSON.stringify(await kept(fine)));
  await fine.close();

  const again = await open({ tier: "auto", speed: quick });
  await sleep(1500);
  check("the next page of that browser is not tested at all", await again.evaluate(() => window.bench.host.speed.wanted === false && window.bench.host.speed.probe === null && window.bench.host.speed.last === null));
  await again.close();

  const chosen = await open({ tier: "high", fresh: true, speed: quick });
  await chosen.bringToFront();
  await sleep(3000);
  check("a player who chose their tier is never tested", await chosen.evaluate(() => window.bench.host.speed.wanted === false && window.bench.host.speed.last === null));
  await chosen.close();

  const slow = await open({ tier: "auto", fresh: true, speed: { ...quick, slowMs: 0.2 } });
  await slow.bringToFront();
  await slow.waitForFunction(() => window.bench.host.speed.strikes === 1, { timeout: 15000 }).catch(() => {});
  const first = await slow.evaluate(() => ({ strikes: window.bench.host.speed.strikes, verdict: window.bench.host.speed.last?.verdict, backend: window.bench.host.backend.tier }));
  check("a first slow verdict is only a doubt: nothing moves yet", first.verdict === "slow" && first.strikes === 1 && first.backend === "high", JSON.stringify(first));
  await slow.waitForFunction(() => window.bench.host.backend.tier === "low", { timeout: 20000 }).catch(() => {});
  await sleep(500);
  const second = await slow.evaluate(() => ({ name: window.bench.host.backend.name, tier: window.bench.host.backend.tier, running: window.bench.host.running, cards: window.bench.host.stage.cards.size }));
  check("a second one a moment later moves it down one step: the stage is rebuilt as the lighter one", second.name === "three" && second.tier === "low" && second.running && second.cards > 0, JSON.stringify(second));
  check("and the player is told", messages.some((m) => /lit stage heavy/.test(m)));
  check("and what was found is kept: the lighter tier", (await kept(slow))?.tier === "low", JSON.stringify(await kept(slow)));
  await slow.screenshot({ path: path.join(SHOTS, "speed-low.jpg"), type: "jpeg", quality: 85 });
  await slow.close();

  const resumed = await open({ tier: "auto", speed: quick });
  check("the next page of that browser starts on the lighter stage at once", await resumed.evaluate(() => window.bench.host.backend.name === "three" && window.bench.host.backend.tier === "low"));
  await resumed.close();

  const crawl = await open({ tier: "auto", fresh: true, speed: { ...quick, slowMs: 0.2, veryMs: 0.4 } });
  await crawl.bringToFront();
  await crawl.waitForFunction(() => window.bench.host.backend.name === "flat", { timeout: 20000 }).catch(() => {});
  await sleep(500);
  const flat = await crawl.evaluate(() => ({ name: window.bench.host.backend.name, running: window.bench.host.running, cards: window.bench.host.stage.cards.size, canvases: document.querySelectorAll("#stagecraft-stage > canvas").length }));
  check("a computer found to crawl goes straight to the plain stage, and the stage carries on", flat.name === "flat" && flat.running && flat.cards > 0 && flat.canvases >= 1, JSON.stringify(flat));
  check("and the player is told", messages.some((m) => /too heavy/.test(m)));
  check("and what was found is kept: the plain stage", (await kept(crawl))?.tier === "flat");
  await crawl.close();

  const forgotten = await open({ tier: "auto", fresh: true, speed: quick });
  check("a browser that is made to forget is tested afresh, and draws the lit stage again until it knows", await forgotten.evaluate(() => window.bench.host.backend.name === "three" && window.bench.host.backend.tier === "high" && window.bench.host.speed.wanted === true));
  await forgotten.close();

  check("none of it threw", errors.length === 0, errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
