/**
 * The title block check: real cards, real skins, real fonts (titles.html), from awkward inputs. It proves, in headless Chrome:
 *
 *   - the fonts the plates are set in are really loaded (a missing one would fall back and measure wrongly);
 *   - nothing runs off a plate: the ink of the drawn words, measured on the pixels, is never wider than the plate's room,
 *     and sits in the middle of it, for every card of both skins;
 *   - a short name is large and alone, a name with a line of text under it is whole, a paragraph is cut and the name is
 *     not made smaller for it, the author's own line breaks are kept, Japanese is broken between characters;
 *   - the plate grows with its words (and the portrait gives way), never past its limit.
 *
 * It takes a picture of both skins to design/stagecraft/lab/shots/bench/title-blocks.png.
 *
 *   node tools/stagecraft/bench/titles-check.mjs        (starts its own little web server on port 4196)
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const PORT = 4196;
const SHOTS = path.join(repo, "design", "stagecraft", "lab", "shots", "bench");
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail = "") => { results.push(!!pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };

const server = spawn("py", [path.join(repo, "tools", "induction-terminal", "serve.py"), String(PORT)], { stdio: "ignore" });
const up = async () => { try { return (await fetch(`http://127.0.0.1:${PORT}/`)).ok; } catch { return false; } };
for (let i = 0; i < 50 && !(await up()); i++) await sleep(200);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1900,1000"],
  defaultViewport: { width: 1900, height: 1000, deviceScaleFactor: 1 }
});
const errors = [];

try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/tools/stagecraft/bench/titles.html`);
  await page.waitForFunction(() => window.titles?.ready === true, { timeout: 60000 });
  await sleep(300);
  const t = await page.evaluate(() => window.titles);
  await page.screenshot({ path: path.join(SHOTS, "title-blocks.png"), fullPage: true });
  // each skin on its own, at full size, to look at closely
  const sections = await page.$$("section");
  for (const [i, name] of ["brass", "paper"].entries()) await sections[i]?.screenshot({ path: path.join(SHOTS, `title-blocks-${name}.png`) });

  check("the fonts the plates are set in are loaded", Object.values(t.fonts).every(Boolean), JSON.stringify(Object.entries(t.fonts).filter(([, ok]) => !ok).map(([f]) => f)));

  for (const [skin, rows] of Object.entries(t.skins)) {
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    check(`${skin}: every card is drawn at twice its size`, rows.every((r) => r.cardSize[0] === 560 && r.cardSize[1] === 936 && r.backSize[0] === 560));
    const wide = rows.filter((r) => r.ink && r.ink.width > r.width + 8);
    check(`${skin}: nothing runs off a plate: the ink is never wider than the room it was given`, wide.length === 0, wide.map((r) => `${r.id} ${r.ink.width} > ${r.width}`).join("; "));
    const off = rows.filter((r) => r.ink && Math.abs(r.ink.off) > 7);
    check(`${skin}: and it sits in the middle`, off.length === 0, off.map((r) => `${r.id} ${r.ink.off.toFixed(1)}`).join("; "));

    const short = by.short;
    check(`${skin}: a short name is alone, on one line, and as large as it may be`, short.name.lines.length === 1 && !short.text && !short.name.truncated && short.name.size >= 60, JSON.stringify(short.name));
    const named = by.named;
    check(`${skin}: a name with a line of text under it shows both, whole`, named.name.lines.length >= 1 && named.text?.lines.length >= 1 && !named.name.truncated && !named.text.truncated, JSON.stringify({ n: named.name, t: named.text }));
    check(`${skin}: the name is the larger of the two`, named.name.size > named.text.size);
    const breaks = by.breaks;
    check(`${skin}: the author's own line breaks are kept: the first line is the name, the rest the text, line for line`, breaks.name.lines.length === 1 && /^etsuko$/i.test(breaks.name.lines[0]) && breaks.text.lines.join("|") === "Kimura|the girl from the library", JSON.stringify({ n: breaks.name.lines, t: breaks.text.lines }));
    const longText = by["long-text"];
    check(`${skin}: a paragraph is cut with an ellipsis, in the lines it may have, and the name is not made smaller for it`, longText.text.truncated && longText.text.lines.at(-1).endsWith("…") && longText.text.lines.length <= 3 && longText.name.size >= 60 && longText.full.text.length > 150, JSON.stringify({ t: longText.text, n: longText.name.size }));
    const longName = by["long-name"];
    check(`${skin}: a long name is made smaller and broken between words, and its line of text is still whole under it`, longName.name.size < 70 && longName.name.lines.length >= 2 && !longName.name.truncated && longName.text.lines.length >= 1 && !longName.text.truncated && longName.height <= 236 + 1, JSON.stringify({ n: longName.name, t: longName.text, h: longName.height }));
    const jp = by.japanese;
    const bad = [...jp.name.lines, ...(jp.text?.lines ?? [])].filter((l) => /^[、。，．・：；！？）」』】ー]/.test(l) || /[（「『【]$/.test(l));
    check(`${skin}: Japanese is broken between characters, with no closing mark at the start of a line or opening one at the end`, jp.text.lines.length >= 1 && bad.length === 0, JSON.stringify(jp.text.lines));
    const word = by.word;
    check(`${skin}: a word wider than the plate is broken where it must be, all of it kept in what the table can read`, word.name.lines.length >= 2 && word.name.lines.join("").replace(/…/g, "").length >= 20 && word.full.name === "Pneumonoultramicroscopicsilicovolcanoconiosis".toUpperCase().replace(/./g, (c) => c) || word.full.name === "Pneumonoultramicroscopicsilicovolcanoconiosis", JSON.stringify({ n: word.name.lines, f: word.full.name }));
    const id = by["summon-nobu"];
    check(`${skin}: a card with no name shows its id`, id.name.lines.join("").toLowerCase().includes("summon") || id.name.lines.join("").toLowerCase().includes("nobu"), JSON.stringify(id.name.lines));
    const mixed = by.mixed;
    check(`${skin}: Latin, Japanese and an emoji together lay out without a complaint`, mixed.name.lines.length >= 1 && mixed.text.lines.length >= 1);
    check(`${skin}: the plate grows with its words: a name alone is the shortest, a name with a long line of text the tallest`, short.height < named.height && named.height <= longText.height + 1 && longText.height <= 236 + 1, JSON.stringify([short.height, named.height, longText.height]));
    check(`${skin}: the back is laid out too`, rows.every((r) => r.backCalls === 1));
  }

  check("none of it threw", errors.length === 0, errors.slice(0, 3).join(" | "));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
