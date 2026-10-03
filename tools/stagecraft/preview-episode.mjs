/**
 * Look at the Episode One scenes that Stagecraft draws, in the real local Foundry (http://localhost:30000), the way a table
 * would meet them: the adventure's bridge switches the module on and gives each scene its stage, the cast the Scene Runner
 * would bring on is summoned, and a screenshot is taken of each.
 *
 *   node tools/stagecraft/preview-episode.mjs                 every scene in module/blank-inheritance/stagecraft/stages.json
 *   node tools/stagecraft/preview-episode.mjs --only=e1-canteen
 *   node tools/stagecraft/preview-episode.mjs --nest          also fire the trigger that wakes the nest (six centipedes)
 *
 * Shots go to design/stagecraft/lab/shots/episode-<scene>.png. It changes only the local world's scenes (their stage
 * flags and cast), which a deploy or the world sync puts right.
 */

import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
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

const stages = JSON.parse(readFileSync(path.join(repo, "module", "blank-inheritance", "stagecraft", "stages.json"), "utf8"));
const wanted = Object.keys(stages.stages).filter((id) => !args.get("only") || id === args.get("only"));

/** The people the Scene Runner brings on in each scene, and the party stand-ins. */
const ART = "modules/blank-inheritance/assets/stage/";
const CAST = {
  "e1-flood-tunnel": [{ id: "section-officer", name: "Vetch", img: `${ART}section-officer.webp` }],
  "e1-kit-issue": [{ id: "nobu", name: "Nobu", img: `${ART}nobu.webp` }, { id: "section-officer", name: "Vetch", img: `${ART}section-officer.webp` }],
  "e1-canteen": [{ id: "taka", name: "Taka", img: `${ART}taka.webp` }, { id: "section-officer", name: "Vetch", img: `${ART}section-officer.webp` }, { id: "the-young-one", name: "A young one", img: `${ART}the-young-one.webp` }]
};
const PARTY = [["rupiah", "Rupiah"], ["anabala", "Anabala"], ["shucks-mordant", "Shucks"], ["hyuck", "Hyuck"]].map(([id, name]) => ({ id: `pc-${id}`, name, img: `${ART}${id}.webp`, isPc: true }));

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new",
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1920,1080", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"]
});
const page = await browser.newPage();
const logs = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type()) || /stagecraft/i.test(m.text())) logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

try {
  await page.goto("http://localhost:30000/join", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 30000 });
  await page.type('input[name="username"]', "Gamemaster");
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), page.$eval('button[name="join"]', (b) => b.click())]);
  // the bridge switches the module on and reloads the page the first time: wait for the module to be up
  await page.waitForFunction(() => globalThis.game?.ready === true && game.modules.get("stagecraft")?.api, { timeout: 120000, polling: 500 }).catch(() => {});
  await sleep(3000);
  const up = await page.evaluate(() => ({ installed: !!game.modules.get("stagecraft"), active: game.modules.get("stagecraft")?.active, api: !!game.modules.get("stagecraft")?.api }));
  console.log("stagecraft:", JSON.stringify(up));
  if (!up.api) throw new Error("Stagecraft is not running in this world (is Foundry restarted since the module folder was linked in?)");
  await page.evaluate(() => { for (const app of foundry.applications.instances.values()) app.close?.(); document.querySelectorAll(".application").forEach((el) => { if (el.textContent.includes("Sync campaign content now")) [...el.querySelectorAll("button")].find((b) => /not now|later|close/i.test(b.textContent))?.click(); }); });

  for (const id of wanted) {
    const found = await page.evaluate(async (sourceId) => {
      const scene = game.scenes.find((s) => s.getFlag("blank-inheritance", "sourceId") === sourceId);
      if (!scene) return null;
      for (let i = 0; i < 60 && !scene.flags?.stagecraft?.stage; i++) await new Promise((r) => setTimeout(r, 250));
      return { id: scene.id, name: scene.name, staged: !!scene.flags?.stagecraft?.stage };
    }, id);
    console.log(id, JSON.stringify(found));
    if (!found?.staged) { console.log("  no stage on this scene; skipped"); continue; }
    await page.evaluate(async (sid) => { while (canvas.loading) await new Promise((r) => setTimeout(r, 100)); await game.scenes.get(sid).view(); }, found.id);
    await page.waitForFunction((sid) => canvas.scene?.id === sid && game.modules.get("stagecraft").api.stage()?.backend?.ready === true, { timeout: 90000, polling: 250 }, found.id);
    // the people the runner would bring on, the party, and (with --nest) the trigger
    await page.evaluate(async (sid, cast, party) => {
      const api = game.modules.get("blank-inheritance").api;
      const scene = game.scenes.get(sid);
      // start from an empty stage, so the places in stages.json are the ones used
      await api.writeAuthoredCast(scene, []);
      await scene.update({ "flags.stagecraft.-=published": null });
      for (const who of [...cast, ...party]) await api.summonToStage(scene, { ...who, sting: "quiet" });
    }, found.id, CAST[id] ?? [], PARTY);
    if (args.get("nest") && id === "e1-flood-tunnel") await page.evaluate(() => Hooks.callAll("blankInheritance.triggerFired", { briefId: "episode-c1e1--flood-tunnel", beatId: "the-fight", trigger: { id: "nest-wakes", kind: "note" } }));
    await sleep(3500);
    const state = await page.evaluate(() => { const s = game.modules.get("stagecraft").api.stage(); return { backend: s.backend.name, cards: [...s.stage.cards.keys()], overlay: !!document.querySelector(".bi-stage, #bi-stage") }; });
    console.log("  ", JSON.stringify(state));
    await page.screenshot({ path: path.join(SHOTS, `episode-${id}${args.get("nest") ? "-nest" : ""}.png`) });
  }
} finally {
  if (logs.length) console.log("\nconsole:\n" + logs.slice(0, 20).join("\n"));
  await browser.close();
}
