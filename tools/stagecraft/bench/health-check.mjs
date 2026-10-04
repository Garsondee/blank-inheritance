/**
 * The health check: how each screen at the table is coping (core/health.mjs, foundry/health.mjs), and the start-up speed test
 * (core/speed.mjs, foundry/speed.mjs). The module's real host in headless Chrome with a real graphics card, as a GM and as a
 * player in two pages that share the module's socket. It proves:
 *
 *   - the GM's board lists everyone at the table, "no stage" for a player who has none, and fills in a player's picture and
 *     frame rate once their stage is up; opened, it asks everyone to report; it is the GM's alone;
 *   - left on Automatic, a computer is tested for a moment, found fine, and left alone (and not tested again);
 *   - a computer found slow twice is moved down to the lighter stage, one found to crawl twice goes to the plain stage (a
 *     single reading is only a doubt: a game on the same graphics card makes any computer look slow for a while), the finding
 *     is remembered by that browser's next page for half a day, and a player who chose a tier is never tested or moved;
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

  // the limits themselves are unit-tested (test/speed.test.mjs); here a machine that is momentarily busy with something else
  // must not fail the path "a measured median under the limit is found fine", so that page is given generous ones
  const fine = await open({ tier: "auto", fresh: true, speed: { ...quick, fineMs: 1000 } });
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

  // every reading "slow" (a ratio of the display's pace that nothing can meet, and none that is a crawl) / every reading a crawl
  const SLOW = { fineMs: 0, slowRatio: 0.01, veryRatio: 1000 };
  const CRAWL = { fineMs: 0, slowRatio: 0.01, veryRatio: 0.02 };
  const slow = await open({ tier: "auto", fresh: true, speed: { ...quick, ...SLOW } });
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
  // a drop is remembered for half a day: one busy evening (a game on the same graphics card) must not decide for good
  await resumed.evaluate(() => { const k = JSON.parse(localStorage.getItem("stagecraft.speed")); k.at -= 13 * 3600 * 1000; localStorage.setItem("stagecraft.speed", JSON.stringify(k)); });
  await resumed.close();
  const aged = await open({ tier: "auto", speed: quick });
  check("but a drop found thirteen hours ago is forgotten: it starts on the lit stage, and is to be tested afresh", await aged.evaluate(() => window.bench.host.backend.tier === "high" && window.bench.host.speed.wanted === true));
  await aged.close();

  const crawl = await open({ tier: "auto", fresh: true, speed: { ...quick, ...CRAWL } });
  await crawl.bringToFront();
  await crawl.waitForFunction(() => window.bench.host.speed.strikes === 1, { timeout: 15000 }).catch(() => {});
  const doubt = await crawl.evaluate(() => ({ strikes: window.bench.host.speed.strikes, verdict: window.bench.host.speed.last?.verdict, name: window.bench.host.backend.name, tier: window.bench.host.backend.tier }));
  check("a first crawl is a doubt too, since a busy moment looks like one: nothing moves yet", doubt.verdict === "very-slow" && doubt.strikes === 1 && doubt.name === "three" && doubt.tier === "high", JSON.stringify(doubt));
  await crawl.waitForFunction(() => window.bench.host.backend.name === "flat", { timeout: 20000 }).catch(() => {});
  await sleep(500);
  const flat = await crawl.evaluate(() => ({ name: window.bench.host.backend.name, running: window.bench.host.running, cards: window.bench.host.stage.cards.size, canvases: document.querySelectorAll("#stagecraft-stage > canvas").length }));
  check("a second crawl a moment later sends a computer to the plain stage, and the stage carries on", flat.name === "flat" && flat.running && flat.cards > 0 && flat.canvases >= 1, JSON.stringify(flat));
  check("and the player is told", messages.some((m) => /too heavy/.test(m)));
  check("and what was found is kept: the plain stage", (await kept(crawl))?.tier === "flat");
  await crawl.close();

  const forgotten = await open({ tier: "auto", fresh: true, speed: quick });
  check("a browser that is made to forget is tested afresh, and draws the lit stage again until it knows", await forgotten.evaluate(() => window.bench.host.backend.name === "three" && window.bench.host.backend.tier === "high" && window.bench.host.speed.wanted === true));
  await forgotten.close();

  /* ------------------------------------------------ how often the stage draws (core/pace.mjs) */
  const drawnIn = (page, ms) => page.evaluate(async (wait) => { const h = window.bench.host; const before = h.frames; await new Promise((r) => setTimeout(r, wait)); return Math.round(((h.frames - before) * 1000) / wait); }, ms);
  // what the browser offered against what the stage drew: an awake stage draws nearly every frame it is offered, whatever
  // the machine can manage; an easy one every other (so a machine busy with something else cannot fail the first reading)
  const offeredAndDrawn = (page, ms) => page.evaluate((wait) => new Promise((resolve) => {
    const h = window.bench.host;
    const before = h.frames;
    const t0 = performance.now();
    let offered = 0;
    const f = () => { offered++; if (performance.now() - t0 < wait) requestAnimationFrame(f); else resolve({ offered: Math.round((offered * 1000) / wait), drawn: Math.round(((h.frames - before) * 1000) / wait) }); };
    requestAnimationFrame(f);
  }), ms);

  const paced = await open({ tier: "high" });
  await paced.bringToFront();
  await paced.evaluate(() => window.bench.host.stage.setLife(false));              // no regular wandering about: nothing moves on its own
  await sleep(4500);                                                                // its first moments, and the wake time, are over
  const idle = await drawnIn(paced, 2500);
  check("while nothing moves the stage eases off to about 30 a second", idle >= 24 && idle <= 38, `${idle} a second`);
  const quietFps = await paced.evaluate(() => window.bench.host.health.report().fps);
  check("and an easy stage is not mistaken for a slow computer: its reported frame rate is read against what it was asked for", quietFps >= 40, `reported ${quietFps} fps`);
  // pressing and dragging the pointer over the stage is movement
  const middle = { x: 960, y: 540 };
  await paced.mouse.move(middle.x, middle.y);
  await paced.evaluate(() => {                                                      // the longest single draw from here on
    const h = window.bench.host;
    const draw = h.backend.draw.bind(h.backend);
    window.__longest = 0;
    h.backend.draw = (...a) => { const t0 = performance.now(); const r = draw(...a); window.__longest = Math.max(window.__longest, performance.now() - t0); return r; };
  });
  await paced.mouse.down();
  const busy = offeredAndDrawn(paced, 1500);
  for (let i = 0; i < 40; i++) { await paced.mouse.move(middle.x + (i % 2 ? 40 : -40), middle.y + i); await sleep(30); }
  const busyRate = await busy;
  await paced.mouse.up();
  const released = Date.now();
  const longest = await paced.evaluate(() => Math.round(window.__longest));
  check("the first card a player ever picks up does not stall the stage (its stick's shaders were built before it was shown)", longest <= 120, `the longest draw took ${longest} ms`);
  // an easy stage draws every other frame it is offered (0.5), an awake one nearly all (the harness's own mouse traffic and the
  // browser's uneven frames take some); three quarters is between them
  check("the moment the pointer is pressed on the stage it is back to the full rate: nearly every frame offered is drawn", busyRate.drawn >= 0.75 * Math.min(busyRate.offered, 60), `${busyRate.drawn} a second drawn of ${busyRate.offered} offered`);
  // a card let go lands and creeps the last of its way on a spring, and cards left on top of each other drift apart: movement
  // that is the stage's own, so the check is that within seconds there is a stretch of a second and a half at the easy rate
  let calmAgain = null;
  for (let i = 0; i < 8 && calmAgain === null; i++) {
    const a = await drawnIn(paced, 750);
    const b = await drawnIn(paced, 750);
    if (a >= 22 && a <= 38 && b >= 22 && b <= 38) calmAgain = Math.round((a + b) / 2);
  }
  const calmAfter = Date.now() - released;
  check("and eases off again once nothing has moved for a moment", calmAgain !== null && calmAfter < 12000, `${calmAgain} a second, easy within ${(calmAfter / 1000).toFixed(1)} s of the pointer being let go`);
  await paced.evaluate(() => { window.bench.host.pace.easing = false; });
  await sleep(300);
  const off = await offeredAndDrawn(paced, 2000);
  check("a player who turns easing off gets the full rate always", off.drawn >= 0.75 * Math.min(off.offered, 60), `${off.drawn} a second drawn of ${off.offered} offered`);
  await paced.close();

  const capped = await open({ tier: "high" , seat: "gm" });
  await capped.close();
  const slowCap = await browser.newPage();
  slowCap.on("pageerror", (e) => errors.push(`cap: ${e}`));
  await slowCap.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern&seat=gm&tier=high&fps=30&power=off`);
  await slowCap.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 });
  await slowCap.bringToFront();
  await sleep(2500);
  const capRate = await drawnIn(slowCap, 2500);
  check("Foundry's own Maximum Framerate is obeyed, even with easing off turned off", capRate >= 26 && capRate <= 34, `${capRate} a second at a cap of 30`);
  await slowCap.close();

  check("none of it threw", errors.length === 0, errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
