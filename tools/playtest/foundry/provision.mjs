/**
 * Provision the playtest world: everything a fresh world needs before a run, done through Foundry's own Document API from a GM's page
 * (design/foundry-module-design.md, Safety: never raw files). Idempotent: it does only what is not already done.
 *
 *   1. switch the adventure and Stagecraft on (a new world has no modules on),
 *   2. wait for the module's own world-sync to build the content from the deployed stamp (scenes, actors, journals ...),
 *   3. make the six player accounts (no password, NO character, so the induction terminal opens by itself, A-4),
 *   4. switch the Service Agreement page on (Ingram, 2026-10-06: it is a gag, but the page must be exercised for real).
 *
 * The world is then left exactly as a deploy and a GM login would leave a new world, which is the start of a run.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { MODULE_DIR, FOUNDRY_URL } from "../paths.mjs";
import { launchChrome, joinFoundry, sleep, waitReady } from "../browser/chrome.mjs";
import { foundryStatus } from "./launch.mjs";

export const PLAYER_NAMES = ["PT Player 1", "PT Player 2", "PT Player 3", "PT Player 4", "PT Player 5", "PT Player 6"];
export const GM_NAME = "Gamemaster";

/** The stamp the module will bring the world up to. */
export function deployedStamp() {
  return JSON.parse(readFileSync(path.join(MODULE_DIR, "data", "campaign", "build.json"), "utf8"));
}

export async function provision({ log = console.log, agreement = true, timeoutMs = 15 * 60 * 1000 } = {}) {
  const status = await foundryStatus();
  if (!status.up || !status.active) throw new Error("The playtest Foundry is not running with its world (pt foundry start, or the app's foundry-playtest preview).");
  const stamp = deployedStamp();
  const browser = await launchChrome();
  const consoleErrors = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(`console: ${m.text().slice(0, 300)}`));

    log(`  joining as ${GM_NAME}`);
    await joinFoundry(page, GM_NAME);

    const before = await page.evaluate(() => ({
      modules: [...game.modules].filter((m) => m.active).map((m) => m.id),
      users: game.users.map((u) => u.name),
      scenes: game.scenes.size,
      actors: game.actors.size
    }));
    log(`  before: modules on [${before.modules.join(", ")}], ${before.users.length} user(s), ${before.scenes} scene(s), ${before.actors} actor(s)`);

    // 1. Modules.
    if (!before.modules.includes("blank-inheritance") || !before.modules.includes("stagecraft")) {
      log("  switching the adventure and Stagecraft on, then reloading");
      await page.evaluate(async () => {
        const config = foundry.utils.deepClone(game.settings.get("core", "moduleConfiguration"));
        config["blank-inheritance"] = true;
        config["stagecraft"] = true;
        await game.settings.set("core", "moduleConfiguration", config);
      });
      await sleep(1500);
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitReady(page);
    }
    const apiReady = await page.evaluate(() => Boolean(game.modules.get("blank-inheritance")?.active && game.modules.get("blank-inheritance")?.api));
    if (!apiReady) throw new Error("the adventure module did not come up after being switched on (its api is missing); see the page errors below\n" + consoleErrors.join("\n"));

    // 2. The module's own build of the world from the deployed stamp.
    log(`  waiting for the world to be built to ${stamp.id} (the module does this itself on a GM's login)`);
    const started = Date.now();
    let last = "";
    for (;;) {
      const progress = await page.evaluate(() => ({ sync: game.settings.get("blank-inheritance", "worldSync"), scenes: game.scenes.size, actors: game.actors.size, journals: game.journal.size }));
      const line = `${progress.scenes} scenes, ${progress.actors} actors, ${progress.journals} journals`;
      if (line !== last) log(`    ${line}${progress.sync?.buildId ? ` (applied ${progress.sync.buildId})` : ""}`);
      last = line;
      if (progress.sync?.buildId === stamp.id) break;
      if (Date.now() - started > timeoutMs) throw new Error(`the world was not built to ${stamp.id} within ${Math.round(timeoutMs / 60000)} minutes (at ${line})`);
      await sleep(4000);
    }
    await sleep(3000);

    // 3 and 4. Players, and the agreement.
    const result = await page.evaluate(async ({ names, agreementOn }) => {
      const made = [];
      for (const name of names) {
        if (!game.users.getName(name)) {
          await User.create({ name, role: CONST.USER_ROLES.PLAYER });
          made.push(name);
        }
      }
      let agreementWas = null;
      try {
        agreementWas = game.settings.get("blank-inheritance", "inductionAgreementEnabled");
        if (agreementOn && agreementWas !== true) await game.settings.set("blank-inheritance", "inductionAgreementEnabled", true);
      } catch (error) {
        return { made, error: `agreement setting: ${error.message}` };
      }
      return {
        made,
        agreementWas,
        agreementNow: game.settings.get("blank-inheritance", "inductionAgreementEnabled"),
        users: game.users.map((u) => ({ name: u.name, role: u.role, character: u.character?.name ?? null })),
        scenes: game.scenes.size,
        actors: game.actors.size,
        journals: game.journal.size,
        playlists: game.playlists.size
      };
    }, { names: PLAYER_NAMES, agreementOn: agreement });
    if (result.error) throw new Error(result.error);
    log(`  players made: ${result.made.length ? result.made.join(", ") : "(all were there already)"}`);
    log(`  Service Agreement page: ${result.agreementNow ? "ON" : "off"}`);
    log(`  world now: ${result.scenes} scenes, ${result.actors} actors, ${result.journals} journals, ${result.playlists} playlists; users ${result.users.map((u) => u.name).join(", ")}`);
    await sleep(1500);
    return { ok: true, stamp: stamp.id, before, after: result, pageErrors: consoleErrors.slice(0, 20) };
  } finally {
    await browser.close();
  }
}
