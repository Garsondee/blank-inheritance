/**
 * The check console, checked live in the local Foundry (foundry/check-console.mjs, 2026-10-05), with a GM and two real
 * players in three browsers, and real pointer, wheel and key events: never by calling a window's handlers.
 *
 *   node tools/check-console/live-check.mjs        (the local Foundry on port 30000, world blank-inheritance-kuuhaku-souzoku)
 *   node tools/check-console/live-check.mjs --keep (leave the test players and their characters in the world)
 *
 * What it proves:
 *   - a beat's check is a pill in the Scene Runner's prose, and the Runner has no check card left
 *   - pressing the pill opens the GM's console and a window on each player's screen, with every way the check offers
 *   - the DC knob turns by a click on either half, by the wheel and by the arrow keys; Show DC reaches the players
 *   - Results are called Results, a tab per way showing that way's own results; the DC's screen says how hard it is
 *     for the party's level (GM Core's DCs by level), and its scale is banded by difficulty
 *   - a way added on the spot from the dropdown arrives as a new key on the players' windows
 *   - the bank of six lights on both screens: lit in its colour by each result, purple for a blind roll on the
 *     players' screens, the GM's tagged hidden; Open and Blind as a lit switch, pressed for real
 *   - the main deck's skill keys carry a ribbed grip at each end (D063); a pill label on black has a dark shadow
 *   - a player's press rolls through their character's own statistic: their gem lights on every screen, and the beat
 *     keeps the result (the Runner's own record)
 *   - a result set by hand, a degree marked as the outcome (and cleared again), Ask again reopening a closed window
 *   - a check made up on the spot from the Runner's Check key, and from the GM deck's Ask keys (a second press adds
 *     another way to the same check)
 *   - Close and record clears every window and writes one line to the log
 *   - nothing logs an error
 *
 * Leaves the world as it found it: the Runner's position and the scene's run state put back, its own chat messages and
 * log lines removed, the test players and characters deleted (unless --keep).
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_ = "http://localhost:30000";
const SHOTS = path.join(repo, "design", "ui", "shots", "check-console");
const KEEP = process.argv.includes("--keep");
const PLAYERS = ["Console test player A", "Console test player B"];
const EPISODE = "episode-c1e1-mothers-maiden-name";
const BRIEF = "episode-c1e1--the-errand";
const OPEN_BEAT = "the-store";       // diplomacy, deception or intimidation, DC 13, open, with a different result per skill
const BLIND_BEAT = "the-mark-again"; // occultism, crafting or society, DC 17, rolled blind
const DEGREES = ["criticalFailure", "failure", "success", "criticalSuccess"];
/** What the scene's own files call a beat's check: the console's title and the log's line both say it. */
function checkName(beatId) {
  const brief = JSON.parse(readFileSync(path.join(repo, "data", "scene-briefs", `${BRIEF}.json`), "utf8"));
  const beat = brief.beats.find((b) => b.id === beatId);
  const challenge = JSON.parse(readFileSync(path.join(repo, "data", "challenges", `${beat.challengeRef}.json`), "utf8"));
  const found = challenge.checks.find((c) => c.id === (beat.checkRef ?? challenge.checks[0].id));
  return found.name ?? found.id;
}
const OPEN_NAME = checkName(OPEN_BEAT);
const BLIND_NAME = checkName(BLIND_BEAT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};
const errors = [];
const watch = (p, who) => {
  p.on("pageerror", (e) => errors.push(`[${who}] ${e.stack ?? e.message}`));
  p.on("console", async (m) => {
    if (m.type() !== "error") return;
    const stacks = await Promise.all(m.args().map((a) => a.evaluate((v) => (v && typeof v === "object" && v.stack) || "").catch(() => "")));
    const t = [m.text(), ...stacks.filter(Boolean)].join("\n");
    if (/favicon|\.mp3|\.ogg|\.webm|\.webp|\.png|Failed to load resource/i.test(t)) return; // missing media in the local test world
    errors.push(`[${who}] ${t.slice(0, 900)}`);
  });
};

async function join(p, name) {
  await p.goto(`${URL_}/join`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector('select[name="userid"], input[name="username"]', { timeout: 30000 });
  if (await p.$('select[name="userid"]')) {
    await p.evaluate((n) => {
      const select = document.querySelector('select[name="userid"]');
      const option = [...select.options].find((o) => o.textContent.trim() === n);
      select.value = option?.value ?? "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, name);
  } else {
    await p.type('input[name="username"]', name);
  }
  await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), p.$eval('button[name="join"]', (b) => b.click())]);
  await p.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await sleep(2500);
  await p.evaluate(() => { for (const app of foundry.applications.instances.values()) if (!["bi-command-bar", "bi-objectives", "bi-session-rail", "bi-scene-runner"].includes(app.id)) app.close?.(); });
}

/** A real click: the mouse moves to the element (or a point in it) and presses, so Foundry sees pointer events. */
async function click(p, selector, { timeout = 10000, at = null } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const el = await p.waitForSelector(selector, { visible: true, timeout });
      await el.evaluate((node) => node.scrollIntoView({ block: "center", inline: "center" }));
      if (at) {
        const box = await el.boundingBox();
        await p.mouse.click(box.x + box.width * at[0], box.y + box.height * at[1]);
      } else {
        await el.click();
      }
      break;
    } catch (err) {
      if (attempt >= 3 || !/detached|not clickable|Node is|null/i.test(String(err?.message))) throw err;
      await sleep(250);
    }
  }
  await sleep(450);
}

const check_ = () => ({ get: (p) => p.evaluate(() => game.settings.get("blank-inheritance", "checkConsole")?.session ?? null) });
const sessionOf = (p) => check_().get(p);
const lightStates = (p, root) => p.evaluate((r) => [...document.querySelectorAll(`${r} .bi-leds__slot:not(.is-empty) .bi-led`)].map((g) => g.dataset.state), root);
const playerWindow = '[id^="bi-check-player-"]';
const gmWindow = "#bi-check-console";

const SESSION_LOG = path.join(repo, "module", "blank-inheritance", "storage", "sessions", `${new Date().toISOString().slice(0, 10)}.json`);
const logBefore = existsSync(SESSION_LOG) ? readFileSync(SESSION_LOG, "utf8") : null;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--force-device-scale-factor=1", "--window-size=1920,1080"], defaultViewport: { width: 1920, height: 1080 } });
const gm = await browser.newPage();
watch(gm, "gm");
const players = [];
let before = null;
const started = Date.now();
try {
  await join(gm, "Gamemaster");

  /* --- the world as it was, and two test players with characters --------------------------------------------- */
  before = await gm.evaluate(async (names) => {
    const out = {
      messages: game.messages.contents.map((m) => m.id),
      runs: foundry.utils.deepClone(game.settings.get("blank-inheritance", "runnerRuns") ?? {}),
      episode: game.settings.get("blank-inheritance", "runnerEpisode"),
      brief: game.settings.get("blank-inheritance", "runnerBrief"),
      users: [],
      actors: []
    };
    for (const name of names) {
      let user = game.users.getName(name);
      const made = !user;
      if (!user) user = await User.create({ name, role: CONST.USER_ROLES.PLAYER });
      const actorName = `${name} (character)`;
      let actor = game.actors.getName(actorName);
      const madeActor = !actor;
      if (!actor) actor = await Actor.create({ name: actorName, type: "character" });
      await actor.update({ [`ownership.${user.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER });
      if (user.character?.id !== actor.id) await user.update({ character: actor.id });
      out.users.push({ id: user.id, made });
      out.actors.push({ id: actor.id, made: madeActor });
    }
    await game.settings.set("blank-inheritance", "checkConsole", { session: null });
    return out;
  }, PLAYERS);
  const [A, B] = before.users.map((u) => u.id);

  for (const name of PLAYERS) {
    const context = await browser.createBrowserContext();
    const p = await context.newPage();
    await p.setViewport({ width: 1920, height: 1080 });
    watch(p, name.slice(-1));
    await join(p, name);
    players.push(p);
  }
  const [pa, pb] = players;

  /* --- the pill in the Runner's prose ----------------------------------------------------------------------- */
  await gm.evaluate((e, b) => game.modules.get("blank-inheritance").api.openSceneRunner(e, b), EPISODE, BRIEF);
  await gm.waitForSelector(`.bi-chk[data-check-key="beat:${OPEN_BEAT}"]`, { timeout: 30000 });
  const pill = await gm.evaluate((beat) => {
    const el = document.querySelector(`.bi-chk[data-check-key="beat:${beat}"]`);
    return { words: el?.querySelector(".bi-chk__words")?.textContent ?? "", dc: el?.querySelector(".bi-chk__dc")?.textContent?.trim() ?? "", inLine: Boolean(el?.closest(".bi-runner__beat-text")) };
  }, OPEN_BEAT);
  check("a beat's check is a pill in its own line, saying its ways and its DC", pill.inLine && /Diplomacy, Deception or Intimidation check/.test(pill.words) && pill.dc === "13", JSON.stringify(pill));
  const blindPill = await gm.evaluate((beat) => document.querySelector(`.bi-chk[data-check-key="beat:${beat}"] .bi-chk__dc .fa-eye-slash`) !== null, BLIND_BEAT);
  check("a blind check's pill carries the struck eye", blindPill);
  const placed = await gm.evaluate((beat) => {
    const text = document.querySelector(`.bi-chk[data-check-key="beat:${beat}"]`)?.closest(".bi-runner__beat-text")?.textContent ?? "";
    return text.replace(/\s+/g, " ").trim();
  }, BLIND_BEAT);
  check("a pill stands where the line asks for the check", /Offer the Occultism, Crafting or Society check\s*17/.test(placed), placed);
  check("no check card is left in the Runner", await gm.evaluate(() => !document.querySelector(".bi-runner__checkbox, [data-action='postCheck'], [data-action='recordOutcome']")));
  await gm.screenshot({ path: path.join(SHOTS, "01-runner-pills.png") });

  /* --- the pill opens the console on every screen ------------------------------------------------------------ */
  await click(gm, `.bi-chk[data-check-key="beat:${OPEN_BEAT}"]`);
  await gm.waitForSelector(`${gmWindow} .bi-check--gm`, { timeout: 10000 });
  await Promise.all(players.map((p) => p.waitForSelector(`${playerWindow} .bi-check--player`, { timeout: 10000 })));
  let s = await sessionOf(gm);
  const gmView = await gm.evaluate((w) => ({
    title: document.querySelector(`${w} .bi-check__title`)?.textContent?.trim(),
    lcd: document.querySelector(`${w} .bi-check__lcd`)?.textContent?.trim(),
    ways: [...document.querySelectorAll(`${w} .bi-check__pills .bi-deck-pill.is-on .bi-deck-pill__label`)].map((n) => n.textContent.trim()),
    tabs: [...document.querySelectorAll(`${w} .bi-check__tab`)].map((n) => n.dataset.slug),
    note: document.querySelector(`${w} .bi-check__note`)?.textContent?.trim() ?? "",
    results: document.querySelector(`${w} .bi-check__results .bi-check__legend`)?.textContent?.trim(),
    difficulty: document.querySelector(`${w} .bi-check__difficulty`)?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    lights: document.querySelectorAll(`${w} .bi-leds .bi-led`).length,
    outcomes: [...document.querySelectorAll(`${w} .bi-check__outcome`)].map((n) => n.dataset.degree)
  }), gmWindow);
  check("the GM's console names the check, as the scene's file does", gmView.title === OPEN_NAME, `${gmView.title} / ${OPEN_NAME}`);
  check("the DC reads 13 on its screen, and every way is on", gmView.lcd === "13" && gmView.ways.length === 3, JSON.stringify(gmView.ways));
  check("Results are called Results, with a tab per way and the way shown's own line before anyone rolls", gmView.results === "Results" && gmView.tabs.join(",") === "diplomacy,deception,intimidation" && /Diplomacy/.test(gmView.note), JSON.stringify([gmView.results, gmView.tabs, gmView.note]));
  check("each degree's result reads best first", gmView.outcomes.join(",") === "criticalSuccess,success,failure,criticalFailure");
  check("the DC's screen says how hard it is for a level-1 party: DC 13 is easy", /^Easy\s*-2 · Lv 1$/.test(gmView.difficulty), gmView.difficulty);
  check("the bank along the bottom has six lights", gmView.lights === 6, String(gmView.lights));
  await click(gm, `${gmWindow} .bi-check__tab[data-slug="intimidation"]`);
  await sleep(500);
  const shownNote = await gm.evaluate((w) => document.querySelector(`${w} .bi-check__note`)?.textContent?.trim() ?? "", gmWindow);
  check("a way's tab shows that way's own results", /^Intimidation/.test(shownNote), shownNote);
  check("the player's bank has six lights too", (await pa.evaluate((w) => document.querySelectorAll(`${w} .bi-leds .bi-led`).length, playerWindow)) === 6);
  const playerKeys = await pa.evaluate((w) => [...document.querySelectorAll(`${w} .bi-deck-key`)].map((k) => k.dataset.slug), playerWindow);
  check("each player's window offers every way as its own key", playerKeys.join(",") === "diplomacy,deception,intimidation", playerKeys.join(","));
  check("a player's window never names the check or what a degree means", await pa.evaluate((w, name) => !(document.querySelector(w)?.textContent ?? "").includes(name) && !document.querySelector(`${w} .bi-check__outcome`), playerWindow, OPEN_NAME));

  /* --- who is asked: anyone else at this (shared) world's table is taken off with a real press on their pill ----- */
  const others = await gm.evaluate((w, ids) => [...document.querySelectorAll(`${w} .bi-leds__slot[data-user-id]`)].map((li) => li.dataset.userId).filter((id) => !ids.includes(id)), gmWindow, [A, B]);
  for (const id of others) await click(gm, `${gmWindow} .bi-leds__slot[data-user-id="${id}"] [data-action="toggleAsked"]`);
  await sleep(500);
  s = await sessionOf(gm);
  check("the GM takes someone off the check with their Asked pill", others.every((id) => !s.asked.includes(id)) && s.asked.includes(A) && s.asked.includes(B), `${others.length} taken off`);
  await gm.screenshot({ path: path.join(SHOTS, "02-gm-console.png") });

  /* --- the DC knob ------------------------------------------------------------------------------------------- */
  await click(gm, `${gmWindow} .bi-check__dc-knob`, { at: [0.85, 0.5] });
  await sleep(500);
  s = await sessionOf(gm);
  check("a click on the knob's right half raises the DC", s.dc === 14, String(s.dc));
  await click(gm, `${gmWindow} .bi-check__dc-knob`, { at: [0.15, 0.5] });
  await sleep(500);
  s = await sessionOf(gm);
  check("a click on its left half lowers it", s.dc === 13, String(s.dc));
  const knob = await (await gm.$(`${gmWindow} .bi-check__dc-knob`)).boundingBox();
  await gm.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
  await gm.mouse.wheel({ deltaY: -120 });
  await sleep(500);
  await gm.mouse.wheel({ deltaY: -120 });
  await sleep(600);
  s = await sessionOf(gm);
  check("the wheel turns it", s.dc === 15, String(s.dc));
  await gm.focus(`${gmWindow} .bi-check__dc-knob`);
  await gm.keyboard.press("ArrowUp");
  await sleep(600);
  s = await sessionOf(gm);
  check("and the arrow keys", s.dc === 16, String(s.dc));
  const lcd = await gm.evaluate((w) => document.querySelector(`${w} .bi-check__lcd`)?.textContent?.trim(), gmWindow);
  const tick = await gm.evaluate((w) => document.querySelectorAll(`${w} .bi-check__tick.is-active`).length, gmWindow);
  check("its screen and its printed scale follow it", lcd === "16" && tick === 1, `${lcd} ${tick}`);
  const hardness = await gm.evaluate((w) => document.querySelector(`${w} .bi-check__difficulty b`)?.textContent?.trim(), gmWindow);
  check("and so does how hard it is: DC 16 is standard for level 1", hardness === "Standard", hardness);
  check("the scale is printed with a band for each difficulty and a notch at the standard DC", await gm.evaluate((w) => document.querySelectorAll(`${w} .bi-check__band`).length >= 5 && Boolean(document.querySelector(`${w} .bi-check__notch`)), gmWindow));
  const playerDc = await pa.evaluate((w) => document.querySelector(`${w} .bi-deck__chip b`)?.textContent?.trim(), playerWindow);
  check("an open check shows the players its DC as it changes", playerDc === "16", playerDc);
  await click(gm, `${gmWindow} [data-action="resetDc"]`);
  await sleep(500);
  check("the reset key puts back the DC the scene sets", (await sessionOf(gm)).dc === 13);

  /* --- a way added on the spot --------------------------------------------------------------------------------- */
  const choices = await gm.evaluate((w) => [...document.querySelectorAll(`${w} select[data-bi-add-way] optgroup`)].map((g) => `${g.label}:${g.querySelectorAll("option").length}`), gmWindow);
  check("the Add dropdown lists every way not yet offered, in three groups", choices.join(",") === "Perception:1,Skills:15,Saves:3", choices.join(","));
  await gm.select(`${gmWindow} select[data-bi-add-way]`, "perception");
  await sleep(700);
  s = await sessionOf(gm);
  check("choosing a way in the dropdown adds it to the check", s.skills.includes("perception"), s.skills.join(","));
  check("and the dropdown goes back to its prompt", (await gm.evaluate((w) => document.querySelector(`${w} select[data-bi-add-way]`)?.value, gmWindow)) === "");
  await pa.waitForFunction((w) => document.querySelectorAll(`${w} .bi-deck-key`).length === 4, { timeout: 5000 }, playerWindow).catch(() => {});
  check("and it arrives on the players' windows as a new key", (await pa.evaluate((w) => document.querySelectorAll(`${w} .bi-deck-key`).length, playerWindow)) === 4);
  await click(gm, `${gmWindow} [data-action="toggleWay"][data-slug="perception"]`);
  await sleep(500);
  check("a way's pill takes it off again", !(await sessionOf(gm)).skills.includes("perception"));

  /* --- a player rolls --------------------------------------------------------------------------------------------- */
  await click(pa, `${playerWindow} .bi-deck-key[data-slug="intimidation"]`);
  await gm.waitForFunction((a) => game.settings.get("blank-inheritance", "checkConsole")?.session?.rolls?.[a], { timeout: 15000 }, A);
  await sleep(1200);
  s = await sessionOf(gm);
  const rollA = s.rolls[A];
  check("a player's press rolls their character's own Intimidation, tagged for this check", rollA?.skill === "intimidation" && DEGREES.includes(rollA?.degree) && Number.isFinite(rollA?.total), JSON.stringify(rollA));
  const gmGems = await lightStates(gm, gmWindow);
  check("their gem lights on the GM's console in its degree's colour", gmGems.includes(rollA.degree), gmGems.join(","));
  const paGems = await lightStates(pa, playerWindow);
  const pbGems = await lightStates(pb, playerWindow);
  check("and on both players' windows", paGems.includes(rollA.degree) && pbGems.includes(rollA.degree), `${paGems} / ${pbGems}`);
  check("their keys are spent until the GM clears their result", await pa.evaluate((w) => [...document.querySelectorAll(`${w} .bi-deck-key`)].every((k) => k.disabled), playerWindow));
  const runs = await gm.evaluate((b) => game.settings.get("blank-inheritance", "runnerRuns")?.[b] ?? {}, BRIEF);
  const actorA = before.actors[0].id;
  check("the beat keeps the result, as a roll from chat always did", runs.results?.[OPEN_BEAT]?.[actorA]?.degree === rollA.degree && runs.ticked?.[OPEN_BEAT]?.degree === rollA.degree, JSON.stringify(runs.ticked?.[OPEN_BEAT] ?? null));
  await pa.screenshot({ path: path.join(SHOTS, "03-player-rolled.png") });
  await click(pb, `${playerWindow} .bi-deck-key[data-slug="diplomacy"]`);
  await gm.waitForFunction((b) => game.settings.get("blank-inheritance", "checkConsole")?.session?.rolls?.[b], { timeout: 15000 }, B);
  await sleep(1500);
  const done = await gm.evaluate((w) => document.querySelector(`${w} .bi-check__count`)?.classList.contains("is-done"), gmWindow);
  check("with everyone in, the count says so", done);
  const pillLights = await gm.evaluate((beat) => document.querySelectorAll(`.bi-chk[data-check-key="beat:${beat}"] .bi-led-mini`).length, OPEN_BEAT);
  check("the Runner's pill carries a small light per result while it is open", pillLights === 2, String(pillLights));
  await gm.screenshot({ path: path.join(SHOTS, "04-gm-results.png") });

  /* --- a degree marked as the outcome, then cleared --------------------------------------------------------------- */
  // Mark a degree the beat does not already hold: the first roll in sets the outcome, and pressing the degree that is
  // already marked clears it (found 2026-10-05, when player A happened to roll a critical success).
  const tickedOf = () => gm.evaluate((b, beat) => game.settings.get("blank-inheritance", "runnerRuns")?.[b]?.ticked?.[beat] ?? null, BRIEF, OPEN_BEAT);
  const markedBefore = (await tickedOf())?.degree ?? null;
  const markDegree = ["criticalSuccess", "criticalFailure"].find((d) => d !== markedBefore);
  await click(gm, `${gmWindow} .bi-check__mark[data-degree="${markDegree}"]`);
  await sleep(900);
  let ticked = await tickedOf();
  check("a degree marked in the console becomes the beat's outcome", ticked?.degree === markDegree, JSON.stringify(ticked));
  await click(gm, `${gmWindow} .bi-check__mark[data-degree="${markDegree}"]`);
  await sleep(900);
  ticked = await gm.evaluate((b, beat) => game.settings.get("blank-inheritance", "runnerRuns")?.[b]?.ticked?.[beat] ?? null, BRIEF, OPEN_BEAT);
  check("marking it again clears it", ticked === null, JSON.stringify(ticked));

  /* --- a blind check replaces it -------------------------------------------------------------------------------- */
  await click(gm, `.bi-chk[data-check-key="beat:${BLIND_BEAT}"]`);
  await gm.waitForFunction((beat) => game.settings.get("blank-inheritance", "checkConsole")?.session?.key === beat, { timeout: 10000 }, BLIND_BEAT);
  await sleep(1200);
  s = await sessionOf(gm);
  check("another check's pill replaces the open one, which is closed and recorded", s.blind === true && Object.keys(s.rolls).length === 0);
  const blindKeys = await pa.evaluate((w) => [...document.querySelectorAll(`${w} .bi-deck-key`)].map((k) => k.dataset.slug), playerWindow);
  check("the players' windows follow to the new check", blindKeys.join(",") === "occultism,crafting,society", blindKeys.join(","));
  check("a blind check never shows the players its DC", await pa.evaluate((w) => !/\b17\b/.test(document.querySelector(`${w} .bi-check__head`)?.textContent ?? ""), playerWindow));
  await click(pa, `${playerWindow} .bi-deck-key[data-slug="society"]`);
  await gm.waitForFunction((a) => game.settings.get("blank-inheritance", "checkConsole")?.session?.rolls?.[a], { timeout: 15000 }, A);
  await sleep(1500);
  s = await sessionOf(gm);
  check("the record keeps only that a blind roll was made", s.rolls[A]?.rolled === true && !("degree" in s.rolls[A]) && !("total" in s.rolls[A]), JSON.stringify(s.rolls[A]));
  const blindPlayer = await lightStates(pa, playerWindow);
  const blindOther = await lightStates(pb, playerWindow);
  const blindGm = await lightStates(gm, gmWindow);
  check("on the players' screens a blind roll lights purple, never its degree", blindPlayer.includes("rolled") && blindOther.includes("rolled") && !blindPlayer.some((g) => DEGREES.includes(g)), `${blindPlayer} / ${blindOther}`);
  const purple = await pa.evaluate((w) => getComputedStyle(document.querySelector(`${w} .bi-led[data-state="rolled"]`)).getPropertyValue("--led").trim(), playerWindow);
  check("and purple is #8a3dff", purple === "#8a3dff", purple);
  check("on the GM's it is its degree, tagged hidden", blindGm.some((g) => DEGREES.includes(g)) && (await gm.evaluate((w) => Boolean(document.querySelector(`${w} .bi-led[data-hidden] .bi-led__tag`)), gmWindow)), blindGm.join(","));
  check("the GM's head says the check is blind", await gm.evaluate((w) => Boolean(document.querySelector(`${w} .bi-check__blind-tag`)), gmWindow));
  check("the Blind side of its switch is the lit one", await gm.evaluate((w) => document.querySelector(`${w} [data-action="setBlind"][data-value="1"]`)?.classList.contains("is-on") && !document.querySelector(`${w} [data-action="setBlind"][data-value="0"]`)?.classList.contains("is-on"), gmWindow));
  check("the player who rolled is told the GM will say how it went", /GM will tell you/i.test(await pa.evaluate((w) => document.querySelector(`${w} .bi-check__result`)?.textContent ?? "", playerWindow)));
  await pa.screenshot({ path: path.join(SHOTS, "05-player-blind.png") });
  await gm.screenshot({ path: path.join(SHOTS, "06-gm-blind.png") });

  /* --- a result set by hand ------------------------------------------------------------------------------------- */
  await click(gm, `${gmWindow} .bi-leds__slot[data-user-id="${B}"] [data-action="setResult"][data-degree="success"]`);
  await sleep(1200);
  s = await sessionOf(gm);
  const actorB = before.actors[1].id;
  const handRuns = await gm.evaluate((b) => game.settings.get("blank-inheritance", "runnerRuns")?.[b] ?? {}, BRIEF);
  check("a result set by hand on a blind check is kept blind in the record", s.rolls[B]?.via === "gm" && s.rolls[B]?.rolled === true && !("degree" in s.rolls[B]), JSON.stringify(s.rolls[B]));
  const seatB = await gm.evaluate((w, b) => document.querySelector(`${w} .bi-leds__slot[data-user-id="${b}"] .bi-led`)?.dataset.state, gmWindow, B);
  check("the GM's light shows it", seatB === "success", seatB);
  check("and the beat keeps it for that character", handRuns.results?.[BLIND_BEAT]?.[actorB]?.degree === "success", JSON.stringify(handRuns.results?.[BLIND_BEAT] ?? null));

  /* --- a window closed, and Ask again ---------------------------------------------------------------------------- */
  await click(pb, `${playerWindow} .window-header [data-action="close"]`);
  await sleep(800);
  check("a player can close their window", !(await pb.$(playerWindow)));
  await click(gm, `${gmWindow} [data-action="askAgain"]`);
  const back = await pb.waitForSelector(`${playerWindow} .bi-check--player`, { timeout: 8000 }).catch(() => null);
  check("Ask again puts it back on their screen", Boolean(back));

  /* --- Close and record ----------------------------------------------------------------------------------------- */
  await click(gm, `${gmWindow} [data-action="closeCheck"]`);
  await sleep(1500);
  check("Close and record clears the check", (await sessionOf(gm)) === null);
  check("every window closes with it", !(await gm.$(gmWindow)) && !(await pa.$(playerWindow)) && !(await pb.$(playerWindow)));
  const lines = await gm.evaluate(async () => (await import("/modules/blank-inheritance/scripts/foundry/session-log.mjs")).currentEntries().filter((e) => /::check$/.test(e?.context?.subject ?? "")).map((e) => e.text));
  check(
    "the log keeps one line for each check closed, saying who rolled what",
    lines.some((t) => t.startsWith(`${OPEN_NAME} (DC 13): `) && /Intimidation/.test(t)) && lines.some((t) => t.startsWith(`${BLIND_NAME} (DC 17): `) && /Society/.test(t)),
    JSON.stringify(lines)
  );

  /* --- a check made up on the spot ------------------------------------------------------------------------------- */
  await click(gm, '[data-action="openAdhocCheck"]');
  await gm.waitForSelector(`${gmWindow} .bi-check--gm`, { timeout: 10000 });
  await sleep(800);
  s = await sessionOf(gm);
  check("the Runner's Check key opens one with no ways yet, at DC 15", s?.source?.kind === "adhoc" && s.skills.length === 0 && s.dc === 15, JSON.stringify(s?.skills));
  await gm.select(`${gmWindow} select[data-bi-add-way]`, "athletics");
  await sleep(800);
  s = await sessionOf(gm);
  check("the dropdown adds Athletics to the made-up check", s.skills.join(",") === "athletics", `${s.skills}`);
  await click(gm, `${gmWindow} [data-action="setBlind"][data-value="1"]`);
  await sleep(600);
  check("pressing Blind makes it blind", (await sessionOf(gm)).blind === true);
  check("and the players' DC switch can no longer be set", await gm.evaluate((w) => document.querySelector(`${w} [data-action="setShowDc"][data-value="1"]`)?.disabled === true, gmWindow));
  await click(gm, `${gmWindow} [data-action="setBlind"][data-value="0"]`);
  await sleep(600);
  check("pressing Open makes it open again", (await sessionOf(gm)).blind === false);
  await pa.waitForSelector(`${playerWindow} .bi-deck-key[data-slug="athletics"]`, { timeout: 8000 });
  await click(pa, `${playerWindow} .bi-deck-key[data-slug="athletics"]`);
  await gm.waitForFunction((a) => game.settings.get("blank-inheritance", "checkConsole")?.session?.rolls?.[a], { timeout: 15000 }, A);
  await sleep(1500);
  s = await sessionOf(gm);
  check("a player rolls the made-up check, and their light comes on in its colour", DEGREES.includes(s.rolls[A]?.degree) && (await lightStates(pb, playerWindow)).includes(s.rolls[A]?.degree), JSON.stringify(s.rolls[A]));
  await gm.screenshot({ path: path.join(SHOTS, "07-gm-adhoc.png") });
  await pb.screenshot({ path: path.join(SHOTS, "08-other-player-adhoc.png") });
  // Measured while the way's pill is on screen: a pill label on black (Ingram's "Perception") must carry a dark
  // shadow, never the pale offset one a pill on the light plate has. No pill to measure is a failure, not a pass.
  const pillShadow = await gm.evaluate((w) => {
    const label = document.querySelector(`${w} .bi-check__pills .bi-deck-pill__label`);
    return label ? getComputedStyle(label).textShadow : null;
  }, gmWindow);
  check("a pill's label on black has a dark shadow, not a light one", /^rgba\(0, 0, 0, 0\.7\)/.test(pillShadow ?? ""), String(pillShadow));
  await click(gm, `${gmWindow} [data-action="closeCheck"]`);
  await sleep(1200);
  check("and it closes the same way", (await sessionOf(gm)) === null);

  /* --- the main deck: tactile skill keys (D062's nubs and ribs became D063's two grips) --------------------------- */
  // The whole of the deck's keys is checked by tools/deck-keys/live-check.mjs; this keeps the tactile part in view here.
  const deckLook = await gm.evaluate(() => {
    const key = document.querySelector("#bi-command-bar .bi-deck-key");
    const ribbed = (pseudo) => (key ? /repeating-linear-gradient/.test(getComputedStyle(key, pseudo).backgroundImage) : false);
    return { grips: [ribbed("::before"), ribbed("::after")].filter(Boolean).length };
  });
  check("the deck's skill keys carry a ribbed grip at each end", deckLook.grips === 2, JSON.stringify(deckLook));

  /* --- the deck's Ask keys: one press asks the table, a second adds another way -------------------------------- */
  await gm.evaluate(() => canvas?.tokens?.releaseAll?.());
  const askKey = (slug) => `#bi-command-bar .bi-deck-key--ask[data-action="rollCheck"][data-slug="${slug}"]`;
  const hasAsk = await gm.$(askKey("athletics"));
  if (hasAsk) {
    await click(gm, askKey("athletics"));
    await gm.waitForFunction(() => game.settings.get("blank-inheritance", "checkConsole")?.session, { timeout: 8000 });
    await click(gm, askKey("acrobatics"));
    await sleep(900);
    s = await sessionOf(gm);
    check("the deck's Ask keys put a check to the table, and a second press adds another way to it", s?.source?.kind === "adhoc" && s.skills.join(",") === "athletics,acrobatics", JSON.stringify(s?.skills));
    check("the players' windows open on it", Boolean(await pa.waitForSelector(`${playerWindow} .bi-deck-key[data-slug="acrobatics"]`, { timeout: 8000 }).catch(() => null)));
    await click(gm, `${gmWindow} [data-action="closeCheck"]`);
    await sleep(1000);
  } else {
    check("the deck's Ask keys are on the GM's deck with nothing selected", false, "no Ask key for Athletics");
  }
} catch (err) {
  check("the run finished", false, String(err?.stack ?? err).slice(0, 1200));
} finally {
  /* --- leave the world as it was ------------------------------------------------------------------------------------ */
  try {
    if (before) {
      await gm.evaluate(async (b, keep, since) => {
        await game.settings.set("blank-inheritance", "checkConsole", { session: null });
        const known = new Set(b.messages);
        const mine = game.messages.contents.filter((m) => {
          // The card this run's own GM login whispered lands before the snapshot is taken, so it is picked by when
          // it was posted rather than by being new to the snapshot.
          const syncCard = m.author?.id === game.user.id && (m.whisper ?? []).length && /bi-sync|world|new content/i.test(m.content ?? "");
          if (syncCard && m.timestamp >= since) return true;
          if (known.has(m.id)) return false;
          const options = m.flags?.sf2e?.context?.options ?? m.flags?.pf2e?.context?.options ?? [];
          const fromTest = b.users.some((u) => u.id === (m.author?.id ?? m.author));
          return options.some((o) => String(o).startsWith("bi-check:")) || fromTest || syncCard;
        });
        if (mine.length) await ChatMessage.deleteDocuments(mine.map((m) => m.id));
        await game.settings.set("blank-inheritance", "runnerRuns", b.runs);
        await game.settings.set("blank-inheritance", "runnerEpisode", b.episode);
        await game.settings.set("blank-inheritance", "runnerBrief", b.brief);
        if (!keep) {
          const actors = b.actors.filter((a) => a.made).map((a) => a.id).filter((id) => game.actors.get(id));
          const users = b.users.filter((u) => u.made).map((u) => u.id).filter((id) => game.users.get(id));
          if (actors.length) await Actor.deleteDocuments(actors);
          if (users.length) await User.deleteDocuments(users);
        }
      }, before, KEEP, started);
    }
  } catch (err) {
    console.error("Could not put the world back:", err);
  }
  await browser.close();
  // The log lines this run wrote: today's file back to what it was.
  try {
    if (logBefore === null && existsSync(SESSION_LOG)) {
      const entries = JSON.parse(readFileSync(SESSION_LOG, "utf8"));
      const others = (Array.isArray(entries) ? entries : entries.entries ?? []).filter((e) => Date.parse(e?.at ?? 0) < started);
      if (!others.length) unlinkSync(SESSION_LOG);
    } else if (logBefore !== null) {
      writeFileSync(SESSION_LOG, logBefore, "utf8");
    }
  } catch (err) {
    console.error("Could not put the session log back:", err);
  }
}

console.log(errors.length ? `\nErrors:\n${errors.join("\n")}` : "\nNo errors logged.");
check("nothing logged an error", errors.length === 0);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed. Screenshots in ${path.relative(repo, SHOTS)}`);
process.exit(failed ? 1 : 0);
