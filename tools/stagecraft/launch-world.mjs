/**
 * Start the local Foundry if it is not running, and launch the campaign world from its Setup screen, so the live checks and
 * the preview have something to join. Foundry must be started afresh whenever a module folder is added or linked in; it
 * finds new folders only at start.
 *
 *   node tools/stagecraft/launch-world.mjs
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WORLD = "blank-inheritance-kuuhaku-souzoku";
const up = async (route = "/") => { try { return (await fetch(`http://localhost:30000${route}`, { redirect: "manual", signal: AbortSignal.timeout(3000) })).status; } catch { return 0; } };

if (!(await up())) {
  const exe = path.join(repo, "foundryvtt", "Foundry Virtual Tabletop", "Foundry Virtual Tabletop.exe");
  spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
  console.log("starting Foundry...");
  for (let i = 0; i < 90 && !(await up()); i++) await sleep(2000);
  if (!(await up())) throw new Error("Foundry did not start listening on port 30000");
}
if ((await up("/join")) === 200 && (await (await fetch("http://localhost:30000/join")).text()).includes('name="username"')) {
  console.log("the world is already launched");
} else {
  const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto("http://localhost:30000/setup", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(`[data-package-id="${WORLD}"] [data-action="worldLaunch"]`, { timeout: 60000 });
    await page.$eval(`[data-package-id="${WORLD}"] [data-action="worldLaunch"]`, (b) => b.click());
    for (let i = 0; i < 60; i++) {
      await sleep(2000);
      if ((await up("/join")) === 200 && (await (await fetch("http://localhost:30000/join")).text()).includes('name="username"')) break;
    }
    console.log("world launched");
  } finally {
    await browser.close();
  }
}
