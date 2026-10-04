/**
 * The lab page for card title blocks (Ingram, 2026-10-04: they had to take a lot of text and line breaks, in a bolder face,
 * with the name and a line of text under it). It draws real cards with the real skins and fonts from awkward inputs, twice:
 * large enough to look at, and at the size the table sees them. titles-check.mjs reads what it reports in `window.titles`.
 *
 *   node tools/stagecraft/bench/titles-check.mjs     (starts its own little web server)
 */

import { paper } from "/module/stagecraft/scripts/skins/paper.mjs";
import { brass } from "/module/blank-inheritance/scripts/foundry/stagecraft-brass-skin.mjs";
import { makeTitleBlock } from "/module/stagecraft/scripts/render/titleblock.mjs";

const ART = "/module/blank-inheritance/assets/stage/";
const PEOPLE = [
  { id: "short", name: "Tama", portrait: `${ART}tama.webp`, why: "a short name" },
  { id: "named", name: "Kiku Enomoto", title: "Class representative, 2B", portrait: `${ART}kiku.webp`, colour: "#e3c45a", why: "a name, and a line of text under it" },
  { id: "breaks", name: "Etsuko\nKimura\nthe girl from the library", portrait: `${ART}kimura-etsuko.webp`, colour: "#5fb3d9", why: "the author's own line breaks, and no title of its own" },
  { id: "long-name", name: "Captain Isamu Kobayashi-Takahashi the Third", title: "Commander of the Seventh Fleet of the Outer Reach", portrait: `${ART}sato-hiroshi.webp`, why: "a long name and a long line of text" },
  { id: "long-text", name: "Sanzo", title: "He has sold tea at the east gate since before the Directorate had a name for the district, and he knows every face that has gone in and out of it since. Ask him anything.", portrait: `${ART}sanzo.webp`, colour: "#c99be0", why: "a paragraph of text: it is cut, the name is not made smaller for it" },
  { id: "japanese", name: "木村 悦子", title: "二年B組の学級委員。放課後はいつも図書室にいる。", portrait: `${ART}watanabe-yumiko.webp`, why: "Japanese: broken between characters, never a closing mark at the start of a line" },
  { id: "word", name: "Pneumonoultramicroscopicsilicovolcanoconiosis", title: "a very long word", portrait: `${ART}kaneda-masaru.webp`, why: "a word wider than the plate" },
  { id: "summon-nobu", portrait: `${ART}nakamura-ren.webp`, why: "no name: the id, as the stage has always shown" },
  { id: "mixed", name: "Mr. 田中 🙂", title: "unit 第三艦隊 — on standby, back by six", portrait: `${ART}tama.webp`, why: "Latin, Japanese and an emoji together" }
];

const out = document.getElementById("out");
const real = makeTitleBlock();
const calls = [];
/** The helper the skins are handed, recording every layout they ask for, and what it drew. */
const helper = { textOf: real.textOf, draw: real.draw, fit(person, style) { const block = real.fit(person, style); calls.push({ person, style, block }); return block; } };

const imageCache = new Map();
const loadImage = (src) => {
  if (!imageCache.has(src)) imageCache.set(src, new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = src; }));
  return imageCache.get(src);
};

/** The width of the ink of a block when it is drawn alone, and how far from the middle it sits: what the eye sees against what was measured. */
function inkOf(block, w) {
  const c = document.createElement("canvas");
  c.width = w; c.height = Math.ceil(block.height) + 40;
  const ctx = c.getContext("2d");
  real.draw(ctx, block, { x: 0, y: 20, w, h: block.height }, { embolden: 0.04 });
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  let minX = c.width; let maxX = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
  return maxX < 0 ? { width: 0, off: 0 } : { width: maxX - minX + 1, off: (minX + maxX) / 2 - w / 2 };
}

const report = { ready: false, fonts: {}, skins: {} };
window.titles = report;

const fontsWanted = ["700 40px Antonio", "700 30px Rajdhani", "700 30px 'Noto Sans JP'", "30px 'Special Elite'", "700 40px 'Modesto Condensed'", "700 28px Signika"];
await Promise.all(fontsWanted.map((f) => document.fonts.load(f).catch(() => null)));
await document.fonts.ready;
for (const f of fontsWanted) report.fonts[f] = document.fonts.check(f);

for (const skin of [brass, paper]) {
  const section = document.createElement("section");
  section.innerHTML = `<h2>${skin.name} (${skin.id})</h2><div class="row big"></div><h2>the same, at the size the table sees</h2><div class="row real"></div>`;
  out.append(section);
  const [big, small] = section.querySelectorAll(".row");
  const results = [];
  for (const person of PEOPLE) {
    const before = calls.length;
    const face = await skin.face(person, { loadImage, titleBlock: helper });
    const back = await skin.back(person, { titleBlock: helper });
    const mine = calls.slice(before);
    const frontCall = mine[0];
    for (const [row, caption] of [[big, true], [small, false]]) {
      const fig = document.createElement("figure");
      const canvas = document.createElement("canvas");
      canvas.width = face.width; canvas.height = face.height;
      canvas.getContext("2d").drawImage(face, 0, 0);
      fig.append(canvas);
      if (caption) { const cap = document.createElement("figcaption"); cap.textContent = `${person.id}: ${person.why}`; fig.append(cap); }
      row.append(fig);
    }
    const block = frontCall?.block;
    const width = frontCall?.style.width ?? 0;
    const ink = block ? inkOf(block, face.width) : null;
    results.push({
      id: person.id,
      cardSize: [face.width, face.height], backSize: [back.width, back.height],
      width, height: block ? Math.round(block.height) : null,
      name: block ? { size: block.name.size, lines: block.name.lines.map((l) => l.text), truncated: block.truncated.name } : null,
      text: block?.text ? { size: block.text.size, lines: block.text.lines.map((l) => l.text), truncated: block.truncated.text } : null,
      full: block?.full ?? null,
      ink,
      backCalls: mine.length - 1
    });
  }
  report.skins[skin.id] = results;
}
report.ready = true;
