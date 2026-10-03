/**
 * The live check's chalk checks (tools/stagecraft/chalk-checks.mjs), run on the bench: the module's real host, kit and
 * painted wall (host.html, its store a stand-in for the world journal that the page's tabs share, as Foundry shares a
 * journal), put onto the live check's own stage (check-stage.mjs) and driven in headless Chrome with a real graphics card,
 * real strokes, real clicks and real keys, as a GM and as a player. It proves the checks themselves, and the probe they
 * read the stage with (chalk-probe.mjs), so the live check can be kept up with the module without a licensed Foundry. The
 * live check in Foundry stays the proof that chalk works there; what only Foundry has (the journal's ownership, a reload,
 * a deleted scene, the Journal list, Foundry's own interface over the stage) is left to it.
 *
 *   node tools/stagecraft/bench/live-chalk-check.mjs [--verbose]     (starts its own little web server on port 4195)
 *
 * The bench shares chalk between tabs only from the moment a tab is open, so the player's tab is opened first, before the
 * GM paints (in Foundry a late joiner reads the journal; that is the live check's to prove).
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installProbe, stageHost, chalkState } from "../chalk-probe.mjs";
import { DESCRIPTION, CAST } from "../check-stage.mjs";
import { gmChalk, wallNow, afterRebuild, playerArrives, twoScreens, flatChalk } from "../chalk-checks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const PORT = 4195;
const SHOTS = path.join(repo, "design", "stagecraft", "lab", "shots", "bench");
mkdirSync(SHOTS, { recursive: true });
const verbose = process.argv.includes("--verbose");
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

/** A bench page as a GM or a player, with the probe in it, showing the live check's own stage. */
async function open(seat, { tier = null } = {}) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(`${seat}: ${e}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(`${m.location()?.url ?? ""} ${m.text()}`)) errors.push(`${seat} [console] ${m.text().slice(0, 300)}`); });
  await installProbe(page);
  await page.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/host.html?stage=haunt-the-paper-lantern${seat === "player" ? "&seat=player" : ""}${tier ? `&tier=${tier}` : ""}`);
  await page.waitForFunction(() => window.bench?.ready === true, { timeout: 30000 });
  // what Foundry has and the bench does not: the module's api, the chalk journal (the bench's store, in the shape Foundry
  // keeps it: one page per scene and painter), and a wipe that remembers it asked
  await page.evaluate(() => {
    const store = window.benchChalkStore;
    const pageOf = (key, p) => ({ id: key, getFlag: (ns, k) => (ns === "stagecraft" && k === "chalk" ? { v: 2, scene: key.split("|")[0], by: p.by, since: p.since, tiles: p.tiles, history: p.history } : undefined) });
    const entry = { ownership: { default: 3 }, getFlag: (ns, k) => (ns === "stagecraft" && k === "chalk" ? true : undefined), get pages() { return [...store.pages].map(([key, p]) => pageOf(key, p)); } };
    game.journal = [entry];
    game.modules = new Map([["stagecraft", { api: { stage: () => (window.bench.host?.backend ? { stage: window.bench.host.stage, backend: window.bench.host.backend } : null) } }]]);
    foundry.applications.api.DialogV2.confirm = async () => { window.askedToWipe = true; return true; };
  });
  // the live check's stage in place of the bench's own
  const ok = await page.evaluate(async (description, cast) => {
    const old = window.bench.host;
    await old.stop();
    window.bench.scene.flags.stagecraft = { stage: description, published: { cards: cast, rev: 1 } };
    const { StageHost } = await import("/module/stagecraft/scripts/foundry/host.mjs");
    const host = new StageHost({ scene: window.bench.scene, skins: old.skins, anchor: old.anchor, services: old.services });
    window.bench.host = window.host = host;
    return host.start();
  }, DESCRIPTION, CAST);
  if (!ok) throw new Error(`the live check's stage would not start on the bench (${seat})`);
  await stageHost(page);
  await sleep(1200);
  return page;
}

try {
  const player = await open("player");
  const gm = await open("gm");
  const t = {
    check, gm, player, scene: "bench-scene", gmId: "gm", playerId: "p1",
    shot: (name, page) => page.screenshot({ path: path.join(SHOTS, `live-${name}.jpg`), type: "jpeg", quality: 85 }),
    trace: async (label, page) => { if (verbose) console.log(`  [${label}]`, JSON.stringify(await chalkState(page), (k, v) => (k === "composite" || k === "tiles3d" ? v?.length : v))); },
    answerWipe: (page) => page.evaluate(() => window.askedToWipe === true)
  };

  await gm.bringToFront();
  await gmChalk(t);

  // a lost graphics context: the 3D picture is built again, with its paint
  const before = await wallNow(gm);
  await gm.evaluate(() => {
    const b = globalThis.__chalkProbe.current().backend;
    window.oldBackend = b;
    (b.canvas.getContext("webgl2") ?? b.canvas.getContext("webgl")).getExtension("WEBGL_lose_context").loseContext();
  });
  await gm.waitForFunction(() => { const h = globalThis.__chalkProbe.current(); return !!h && h.backend !== window.oldBackend && h.backend.ready === true && !!h.backend.chalkTiles; }, { timeout: 30000, polling: 250 });
  await sleep(1500);
  await afterRebuild(t, before);

  await player.bringToFront();
  await playerArrives(t, await wallNow(gm));
  await twoScreens(t);

  const flat = await open("gm", { tier: "flat" });
  await flatChalk(t, flat);
  check("no page threw, and nothing was reported as an error", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (err) {
  check("the run finished without an exception", false, err.stack ?? err.message);
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
