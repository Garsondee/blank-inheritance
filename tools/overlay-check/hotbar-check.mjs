/**
 * Check that Foundry's macro hotbar stays ONE row, clear of the deck, at every screen size, in a real browser. The deck lays the hotbar out
 * as a rampart: five slots, the orb's gap, five slots (bi-foundry-bridge.css). Foundry's own hotbar turns "compact" on a narrow screen
 * (two rows of five in a 332px bar, hotbar.mjs#_onResize at 1488px and under), and under those rules the fifth slot fell onto a row of its own
 * and a row of empty slots lay across the deck's Perception key at 1366 x 768: pressing the key pressed the slot.
 *
 *   node tools/overlay-check/hotbar-check.mjs                       the playtest-sized screens, against the local Foundry (port 30000)
 *   node tools/overlay-check/hotbar-check.mjs --url=http://localhost:30100     against the playtest Foundry instead
 *   node tools/overlay-check/hotbar-check.mjs --shots=<dir>         also save a picture at every size
 *   node tools/overlay-check/hotbar-check.mjs --inject-css=FILE     add a stylesheet after load, to try a fix live before editing the module
 *   node tools/overlay-check/hotbar-check.mjs --user=Anne           join as someone else (default Gamemaster; the deck is the same shape for everyone)
 *
 * WHY IT EXISTS (found 2026-10-06 by the playtest rig, tools/playtest, on its 1366 x 768 seat: design/playtest-process.md §12.5, F-0014).
 * The static half (the module's CSS covers every selector Foundry uses for the compact layout, and Foundry has not grown a new one) is
 * pinned by test/tier3-hotbar-compact-contract.test.mjs; this is the half that needs a browser.
 *
 * WHAT IT CHECKS at each of eight sizes from 2560 x 1271 down to 1024 x 768: the hotbar's slots are on one row; no slot lies over a deck
 * control; the bar clears the right-hand sidebar and the left edge. It presses nothing and writes nothing to the world.
 *
 * ONE WORLD, ONE DRIVER: joining as a user ends any other session of that user, so run it when nobody else is in as that user (the
 * same rule as tools/overlay-check/click-through.mjs).
 */

import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const args = new Map(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const URL_ = typeof args.get("url") === "string" ? args.get("url") : "http://localhost:30000";
const USER = typeof args.get("user") === "string" ? args.get("user") : "Gamemaster";
const shotsDir = typeof args.get("shots") === "string" ? path.resolve(args.get("shots")) : null;
const css = typeof args.get("inject-css") === "string" ? readFileSync(path.resolve(args.get("inject-css")), "utf8") : null;
if (shotsDir) mkdirSync(shotsDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wide, laptop, small laptop, and the floor Foundry supports; the one Ingram plays on is the first. */
const SIZES = [[2560, 1271], [1920, 1080], [1680, 1050], [1536, 864], [1440, 900], [1366, 768], [1280, 720], [1024, 768]];

const results = [];
const check = (name, pass, detail = "") => { results.push({ name, pass: !!pass }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }
});

try {
  const page = await browser.newPage();
  await page.goto(`${URL_}/join`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('select[name="userid"], input[name="username"]', { timeout: 60000 });
  if (await page.$('select[name="userid"]')) {
    const found = await page.evaluate((name) => {
      const select = document.querySelector('select[name="userid"]');
      const option = [...select.options].find((o) => o.textContent.trim() === name);
      if (!option) return false;
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }, USER);
    if (!found) throw new Error(`there is no user called "${USER}" on the join page`);
  } else {
    await page.type('input[name="username"]', USER);
  }
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), page.$eval('button[name="join"]', (b) => b.click())]);
  await page.waitForFunction(() => globalThis.game?.ready === true, { timeout: 180000 });
  await page.waitForSelector("#bi-command-bar.bi-deck", { timeout: 60000 }).catch(() => {});
  await sleep(4000);
  if (css) await page.addStyleTag({ content: css });

  const hasDeck = await page.evaluate(() => !!document.querySelector("#bi-command-bar.bi-deck"));
  check("the deck is mounted for this user, so there is a layout to check", hasDeck, hasDeck ? "" : `${USER} has no deck: a player needs a character first`);

  if (hasDeck) {
    for (const [w, h] of SIZES) {
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await sleep(2500);
      const m = await page.evaluate(() => {
        const slots = [...document.querySelectorAll("#hotbar #action-bar .slot")];
        const boxes = slots.map((s) => s.getBoundingClientRect());
        const rows = new Set(boxes.map((b) => Math.round(b.y)));
        const hot = document.querySelector("#hotbar").getBoundingClientRect();
        const deckControls = [...document.querySelectorAll("#bi-command-bar button, #bi-command-bar [data-action], #bi-command-bar .bi-deck-round")].filter((e) => e.getBoundingClientRect().width > 0);
        const over = [];
        slots.forEach((s, i) => {
          const a = boxes[i];
          const hit = deckControls.find((d) => { const b = d.getBoundingClientRect(); return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; });
          if (hit) over.push(`slot ${s.dataset.slot} over "${(hit.innerText || hit.getAttribute("aria-label") || hit.className).toString().replace(/\s+/g, " ").trim().slice(0, 20)}"`);
        });
        const rail = document.querySelector("#sidebar-tabs, #sidebar");
        return { slotCount: slots.length, rows: rows.size, left: Math.round(hot.left), right: Math.round(hot.right), railLeft: rail ? Math.round(rail.getBoundingClientRect().left) : innerWidth, over, classes: document.querySelector("#hotbar").className };
      });
      const label = `${w} x ${h}`;
      check(`${label}: the ten macro slots are one row`, m.slotCount === 10 && m.rows === 1, `${m.rows} row(s) of ${m.slotCount} slots, hotbar classes "${m.classes}"`);
      check(`${label}: no macro slot lies over a deck control`, m.over.length === 0, m.over.slice(0, 3).join("; "));
      check(`${label}: the bar clears the left edge and the sidebar`, m.left >= 0 && m.right <= m.railLeft, `bar ${m.left}..${m.right}, sidebar from ${m.railLeft}`);
      if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `hotbar-${w}x${h}.png`), type: "png" });
    }
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
