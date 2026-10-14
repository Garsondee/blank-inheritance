#!/usr/bin/env node
/**
 * The deck's skill keys, live (D063): wider keys, every name whole on its plate, each key tinted by its attribute.
 *
 *   node tools/deck-keys/live-check.mjs        (the local Foundry on port 30000, world blank-inheritance-kuuhaku-souzoku)
 *
 * Drives the local Foundry from headless Chrome as the GM and as a test player with a character, at Ingram's own
 * window (2560 x 1271) and at 1920 x 1080, with real pointer events. It checks:
 *   - each bank is nine keys under its one "Skills" legend, in alphabetical order, with no blank key;
 *   - every one of the eighteen skills has one key, tinted with its attribute's colour, with a ribbed grip each end;
 *   - every key is over twice as wide as it is tall, and every skill's name is whole on its nameplate with room to
 *     spare, on the GM's asking keys and on a player's rolling keys, at both window sizes;
 *   - a player's keys carry their number and lit pips for their rank, and a hand on one tells the central instrument
 *     the attribute it adds;
 *   - the check window a player sees uses the same keys.
 * The world is left as it was: the test player and character are deleted, the check put to the table is cleared,
 * and the cards its own logins whispered are removed. Screenshots go to design/ui/shots/deck-keys/.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

import { SKILL_ATTRIBUTES } from "../../module/blank-inheritance/scripts/core/skills.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_ = "http://localhost:30000";
const SHOTS = path.join(repo, "design", "ui", "shots", "deck-keys");
const PLAYER = "Deck keys test player";
const SPARE = 4; // px a skill's name must clear on its plate, at the deck's authored size
const RANKS = { acrobatics: 1, intimidation: 2, performance: 3, computers: 4 };
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
  p.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/favicon|\.mp3|\.ogg|\.webm|\.webp|\.png|Failed to load resource/i.test(t)) return; // missing media in the local test world
    errors.push(`[${who}] ${t.slice(0, 900)}`);
  });
};

async function join(p, name) {
  await p.goto(`${URL_}/join`, { waitUntil: "domcontentloaded" });
  await p.waitForSelector('select[name="userid"], input[name="username"]', { timeout: 60000 });
  if (await p.$('select[name="userid"]')) {
    await p.evaluate((n) => {
      const select = document.querySelector('select[name="userid"]');
      select.value = [...select.options].find((o) => o.textContent.trim() === n)?.value ?? "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, name);
  } else {
    await p.type('input[name="username"]', name);
  }
  await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {}), p.$eval('button[name="join"]', (b) => b.click())]);
  await p.waitForFunction(() => globalThis.game?.ready === true, { timeout: 120000 });
  await p.waitForSelector("#bi-command-bar .bi-deck-bank .bi-deck-key", { timeout: 30000 });
  await p.evaluate(() => document.fonts.ready);
  await sleep(2000);
  // Close any window a login opened, but never Foundry's own hotbar or the module's fixed furniture.
  await p.evaluate(() => {
    for (const app of foundry.applications.instances.values()) {
      if (!["bi-command-bar", "bi-objectives", "bi-session-rail", "bi-scene-runner", "hotbar"].includes(app.id)) app.close?.();
    }
  });
  await sleep(500);
}

/** Everything about the two banks, in the deck's authored pixels. */
const readBanks = (p) =>
  p.evaluate(() => {
    const scale = Number(document.body.style.getPropertyValue("--bi-deck-scale")) || 1;
    const textWidth = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().width / scale;
    };
    const tokens = getComputedStyle(document.documentElement);
    return [...document.querySelectorAll("#bi-command-bar .bi-deck-bank")].map((bank) => ({
      side: bank.dataset.side,
      legend: [...bank.querySelectorAll(".bi-deck__legend")].map((l) => l.textContent.trim()),
      keys: [...bank.querySelectorAll(".bi-deck-bank__keys > .bi-deck-key")].map((key) => {
        const rect = key.getBoundingClientRect();
        const label = key.querySelector(".bi-deck-key__label");
        const plate = key.querySelector(".bi-deck-key__plate");
        const plateStyle = plate ? getComputedStyle(plate) : null;
        const plateInner = plate ? plate.clientWidth - parseFloat(plateStyle.paddingLeft) - parseFloat(plateStyle.paddingRight) : 0;
        return {
          blank: key.classList.contains("bi-deck-key--blank"),
          slug: key.dataset.slug ?? null,
          attribute: key.dataset.attribute ?? null,
          attr: getComputedStyle(key).getPropertyValue("--attr").trim(),
          token: key.dataset.attribute ? tokens.getPropertyValue(`--bi-attr-${key.dataset.attribute}`).trim() : null,
          grips: [getComputedStyle(key, "::before").backgroundImage, getComputedStyle(key, "::after").backgroundImage].filter((b) => /repeating-linear-gradient/.test(b)).length,
          text: label?.textContent.trim() ?? "",
          ratio: rect.width / rect.height,
          cut: label ? label.scrollWidth > label.clientWidth : false,
          spare: label ? plateInner - textWidth(label) : null,
          mod: key.querySelector(".bi-deck-key__mod")?.textContent.trim() ?? null,
          lit: key.querySelectorAll(".bi-deck-key__pips i.is-lit").length,
          pips: key.querySelectorAll(".bi-deck-key__pips i").length,
          ask: key.classList.contains("bi-deck-key--ask"),
          sub: key.dataset.previewSub ?? null
        };
      })
    }));
  });

const allKeys = (banks) => banks.flatMap((b) => b.keys);
const live = (banks) => allKeys(banks).filter((k) => !k.blank);
const tightest = (keys) => keys.filter((k) => k.spare !== null).sort((a, b) => a.spare - b.spare)[0];

function checkBanks(view, banks) {
  check(`${view}: two banks of nine keys, under one legend each and nothing else`,
    banks.length === 2 && banks.every((b) => b.keys.length === 9 && b.legend.length === 1 && b.legend[0] === "Skills"),
    banks.map((b) => `${b.side} ${b.keys.length} keys, legend ${JSON.stringify(b.legend)}`).join("; "));
  const keys = live(banks);
  check(`${view}: all eighteen skills have a key, and none is blank`, keys.length === 18 && new Set(keys.map((k) => k.slug)).size === 18 && allKeys(banks).every((k) => !k.blank));
  const order = banks.map((b) => b.keys.map((k) => k.text));
  check(`${view}: the keys keep their alphabetical order, A–M left and N–T right`,
    order.every((list) => list.join("|") === [...list].sort((a, b) => a.localeCompare(b)).join("|")) && order[0].at(-1).localeCompare(order[1][0]) < 0,
    order.map((l) => `${l[0]}…${l.at(-1)}`).join(" / "));
  const wrong = keys.filter((k) => SKILL_ATTRIBUTES[k.slug] !== k.attribute || !k.attr || k.attr !== k.token || k.grips !== 2);
  check(`${view}: every key is tinted with its attribute's colour and has a ribbed grip at each end`, wrong.length === 0, wrong.map((k) => k.slug).join(", "));
  const narrow = keys.filter((k) => k.ratio < 2);
  check(`${view}: every key is over twice as wide as it is tall`, narrow.length === 0, `narrowest ${Math.min(...keys.map((k) => k.ratio)).toFixed(2)}:1`);
  const cut = keys.filter((k) => k.cut || k.spare < SPARE);
  const tight = tightest(keys);
  check(`${view}: every skill's name is whole on its plate with ${SPARE}px to spare`, cut.length === 0, `tightest: ${tight?.text} ${tight?.spare.toFixed(1)}px${cut.length ? `; short: ${cut.map((k) => k.text).join(", ")}` : ""}`);
}

async function shoot(p, file) {
  const r = await p.evaluate(() => {
    const rects = [...document.querySelectorAll("#bi-command-bar .bi-deck-bank")].map((b) => b.getBoundingClientRect());
    return { x: Math.min(...rects.map((r) => r.left)), y: Math.min(...rects.map((r) => r.top)), r: Math.max(...rects.map((r) => r.right)), b: Math.max(...rects.map((r) => r.bottom)) };
  });
  await p.screenshot({ path: path.join(SHOTS, file), clip: { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.r - r.x + 16, height: r.b - r.y + 16 } });
}

const SESSION_LOG = path.join(repo, "module", "blank-inheritance", "storage", "sessions", `${new Date().toISOString().slice(0, 10)}.json`);
const logBefore = existsSync(SESSION_LOG) ? readFileSync(SESSION_LOG, "utf8") : null;
const started = Date.now();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--force-device-scale-factor=1"] });
let made = null;
let gm = null;
try {
  gm = await browser.newPage();
  watch(gm, "gm");
  await gm.setViewport({ width: 2560, height: 1271 });
  await join(gm, "Gamemaster");
  made = await gm.evaluate(async (name, ranks) => {
    let user = game.users.getName(name);
    const madeUser = !user;
    if (!user) user = await User.create({ name, role: CONST.USER_ROLES.PLAYER });
    let actor = game.actors.getName(`${name} (character)`);
    const madeActor = !actor;
    if (!actor) actor = await Actor.create({ name: `${name} (character)`, type: "character" });
    await actor.update({ [`ownership.${user.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER, ...Object.fromEntries(Object.entries(ranks).map(([s, r]) => [`system.skills.${s}.rank`, r])) });
    if (user.character?.id !== actor.id) await user.update({ character: actor.id });
    await game.settings.set("blank-inheritance", "checkConsole", { session: null });
    return { user: madeUser ? user.id : null, actor: madeActor ? actor.id : null };
  }, PLAYER, RANKS);

  /* --- the GM's deck: asking keys ------------------------------------------------------------------------------ */
  const gmBanks = await readBanks(gm);
  checkBanks("GM at 2560x1271", gmBanks);
  check("GM: every key asks the table", live(gmBanks).every((k) => k.ask));
  await shoot(gm, "gm-2560.png");

  /* --- a player's deck: their own numbers ---------------------------------------------------------------------- */
  // Its own browser context, as a second machine would be: two users in one profile share Foundry's session
  // cookie, and the GM's uploads then go out as the player.
  const playerContext = await browser.createBrowserContext();
  const pl = await playerContext.newPage();
  watch(pl, "player");
  await pl.setViewport({ width: 2560, height: 1271 });
  await join(pl, PLAYER);
  const plBanks = await readBanks(pl);
  checkBanks("player at 2560x1271", plBanks);
  const bySlug = Object.fromEntries(live(plBanks).map((k) => [k.slug, k]));
  check("player: every key prints its number and four pips", live(plBanks).every((k) => /^[+-]\d+$/.test(k.mod ?? "") && k.pips === 4));
  check("player: the pips light for each skill's rank", Object.entries(RANKS).every(([slug, rank]) => bySlug[slug]?.lit === rank) && bySlug.medicine?.lit === 0,
    Object.keys(RANKS).map((s) => `${s} ${bySlug[s]?.lit}`).join(", "));
  check("player: each key says on hover which attribute it adds", bySlug.medicine?.sub?.endsWith("Wisdom") && bySlug.athletics?.sub?.endsWith("Strength"), `${bySlug.medicine?.sub} / ${bySlug.athletics?.sub}`);
  // A real hand on a key: the central instrument reads it out.
  const medicine = await pl.$('#bi-command-bar .bi-deck-key[data-slug="medicine"]');
  const box = await medicine.boundingBox();
  await pl.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await sleep(400);
  const orb = await pl.evaluate(() => document.querySelector("#bi-command-bar [data-orb-window]")?.textContent.replace(/\s+/g, " ").trim() ?? "");
  check("player: a hand on Medicine tells the instrument it adds Wisdom", /Medicine/.test(orb) && /Wisdom/.test(orb), orb);
  await pl.mouse.move(5, 5);
  await shoot(pl, "player-2560.png");
  await pl.setViewport({ width: 1920, height: 1080 });
  await sleep(1500);
  checkBanks("player at 1920x1080", await readBanks(pl));
  await shoot(pl, "player-1920.png");

  /* --- the check window a player sees uses the same keys ------------------------------------------------------- */
  await click(gm, '#bi-command-bar .bi-deck-key--ask[data-slug="intimidation"]');
  await click(gm, '#bi-command-bar .bi-deck-key--ask[data-slug="medicine"]');
  const playerWindow = '[id^="bi-check-player-"]';
  const opened = await pl.waitForSelector(`${playerWindow} .bi-deck-key[data-slug="medicine"]`, { timeout: 10000 }).catch(() => null);
  const windowKeys = await pl.evaluate((w) => [...document.querySelectorAll(`${w} .bi-check__keybank .bi-deck-key`)].map((k) => {
    const label = k.querySelector(".bi-deck-key__plate .bi-deck-key__label");
    return { slug: k.dataset.slug, attribute: k.dataset.attribute, attr: getComputedStyle(k).getPropertyValue("--attr").trim(), whole: label ? label.scrollWidth <= label.clientWidth : false, mod: k.querySelector(".bi-deck-key__read .bi-deck-key__mod")?.textContent.trim() };
  }), playerWindow);
  check("the player's check window offers the same keys: plate, number and attribute colour",
    Boolean(opened) && windowKeys.length === 2 && windowKeys.every((k) => SKILL_ATTRIBUTES[k.slug] === k.attribute && k.attr && k.whole && /^[+-]\d+$/.test(k.mod ?? "")),
    JSON.stringify(windowKeys));
  if (opened) {
    const r = await pl.evaluate((w) => { const b = document.querySelector(w).getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, playerWindow);
    await pl.screenshot({ path: path.join(SHOTS, "player-check-window.png"), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
  }
  await pl.close();
} catch (err) {
  check("the run finished", false, String(err?.stack ?? err).slice(0, 1200));
} finally {
  try {
    if (gm) {
      await gm.evaluate(async (m, since) => {
        await game.settings.set("blank-inheritance", "checkConsole", { session: null });
        const cards = game.messages.contents.filter((x) => x.timestamp >= since && x.author?.id === game.user.id && (x.whisper ?? []).length && /bi-sync|new content|World updated/i.test(x.content ?? ""));
        if (cards.length) await ChatMessage.deleteDocuments(cards.map((x) => x.id));
        if (m?.actor && game.actors.get(m.actor)) await Actor.deleteDocuments([m.actor]);
        if (m?.user && game.users.get(m.user)) await User.deleteDocuments([m.user]);
      }, made, started);
    }
  } catch (err) {
    console.error("Could not put the world back:", err);
  }
  await browser.close();
  try {
    if (logBefore !== null) writeFileSync(SESSION_LOG, logBefore, "utf8");
    else if (existsSync(SESSION_LOG)) {
      const entries = JSON.parse(readFileSync(SESSION_LOG, "utf8"));
      const list = Array.isArray(entries) ? entries : entries.entries ?? [];
      if (!list.some((e) => Date.parse(e?.at ?? 0) < started)) unlinkSync(SESSION_LOG);
    }
  } catch (err) {
    console.error("Could not put the session log back:", err);
  }
}

/** A real click: the mouse moves to the element and presses, so Foundry sees pointer events. */
async function click(p, selector) {
  const el = await p.waitForSelector(selector, { visible: true, timeout: 10000 });
  await el.click();
  await sleep(700);
}

console.log(errors.length ? `\nErrors:\n${errors.join("\n")}` : "\nNo errors logged.");
check("nothing logged an error", errors.length === 0);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed. Screenshots in ${path.relative(repo, SHOTS)}`);
process.exit(failed ? 1 : 0);
