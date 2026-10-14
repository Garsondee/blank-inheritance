/**
 * Chrome for the rig: one browser, one isolated context per seat, and the join routine every seat uses.
 *
 * The browser is the one the repo's live checks drive (puppeteer-core is installed once, in module/stagecraft, and shared) with the
 * flags that make a headless Chrome behave like a real one on this machine: the real GPU path (the Stagecraft stage and Foundry's
 * canvas are WebGL), and no throttling of background pages, because seven seats are all "in the background" to the browser.
 *
 * A seat is a BROWSER CONTEXT, not a tab: its own cookie jar and storage, which is what lets seven different Foundry users be logged in
 * at once (Foundry's session is a cookie, and joining as a user ends any other session of that same user).
 */

import { createRequire } from "node:module";
import path from "node:path";

import { CHROME, FOUNDRY_URL, REPO } from "../paths.mjs";

const require = createRequire(path.join(REPO, "module", "stagecraft", "package.json"));
export const puppeteer = require("puppeteer-core");

export const CHROME_ARGS = [
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  "--use-angle=d3d11",
  "--ignore-gpu-blocklist",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--autoplay-policy=no-user-gesture-required",
  "--js-flags=--expose-gc"
];

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function launchChrome({ extraArgs = [], headless = "new" } = {}) {
  return puppeteer.launch({ executablePath: CHROME, headless, args: [...CHROME_ARGS, ...extraArgs], defaultViewport: null });
}

/**
 * Log a page in as a Foundry user and wait for the game to be ready. Foundry v14's join form is a username field, or a list of users
 * once there are several; both are handled, the way the repo's live checks do.
 */
export async function joinFoundry(page, userName, { url = FOUNDRY_URL, timeoutMs = 180000 } = {}) {
  await page.goto(`${url}/join`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('select[name="userid"], input[name="username"]', { timeout: 60000 });
  if (await page.$('select[name="userid"]')) {
    const found = await page.evaluate((name) => {
      const select = document.querySelector('select[name="userid"]');
      const option = [...select.options].find((o) => o.textContent.trim() === name);
      if (!option) return false;
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }, userName);
    if (!found) throw new Error(`there is no user called "${userName}" on the join page`);
  } else {
    await page.click('input[name="username"]', { clickCount: 3 });
    await page.type('input[name="username"]', userName);
  }
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), page.$eval('button[name="join"]', (button) => button.click())]);
  await page.waitForFunction(() => globalThis.game?.ready === true, { timeout: timeoutMs });
}

/** Wait for the game to be ready again after a reload. */
export async function waitReady(page, { timeoutMs = 180000 } = {}) {
  await page.waitForFunction(() => globalThis.game?.ready === true, { timeout: timeoutMs });
}
