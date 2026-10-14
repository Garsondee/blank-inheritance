/**
 * How grimy is each surface? Renders a clean swatch of every grimed surface with the module's real stylesheets, at
 * Ingram's 150% display scaling, in headless Chrome, and measures each one (bi-tokens.css §7a-ii, third pass).
 *
 *   node tools/ui-grime/measure.mjs                   print the measures
 *   node tools/ui-grime/measure.mjs --check           and fail when a surface is over its budget
 *   node tools/ui-grime/measure.mjs --shot out.png    and save the rendered swatches
 *   node tools/ui-grime/measure.mjs --bare            with every wear texture switched off: each surface's own shading,
 *                                                     the floor the grime adds to
 *
 * For each swatch, over its middle (clear of rims, screws and edge shading):
 *   mean   its average brightness, 0 to 255
 *   cloud  how blotchy it is: the spread of a heavily blurred copy (stains, smoke)
 *   speck  how speckled it is: the spread of what that blur took away (motes, grain, scratches)
 *   peak   how far its brightest fine detail stands above its surroundings, 99.9th percentile (white specks on black)
 *
 * Measured with this tool on 2026-10-05: the textures at the last commit, after the third pass, and --bare (no wear
 * textures at all, so the surface's own shading and placed dirt alone):
 *   black cell              cloud 8.18 -> 2.86  (bare 2.07)   peak 14.2 -> 4.4  (bare 0.9)
 *   black key bank          cloud 8.57 -> 6.63  (bare 6.81)   peak 14.4 -> 5.6  (bare 3.2)
 *   rail                    cloud 4.66 -> 4.65  (bare 4.66)   peak 11.4 -> 1.1  (bare 1.1)
 *   silver shoulder         cloud 9.99 -> 8.23  (bare 8.61)   peak 20.4 -> 12.7 (bare 5.1)
 *   silver plate (console)  cloud 11.43 -> 9.71 (bare 9.89)   peak 11.4 -> 7.6  (bare 4.9)
 * So on every surface the cloudiness left is the surface's own shading, not the grime; the old textures fail --check
 * on five of the six.
 *
 * Needs puppeteer-core, installed in module/stagecraft (as for the other live checks), and Chrome.
 */

import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { inflateSync } from "node:zlib";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const styles = path.join(repo, "module", "blank-inheritance", "styles");
const require = createRequire(path.join(repo, "module", "stagecraft", "package.json"));
const puppeteer = require("puppeteer-core");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SCALE = 1.5;
const args = process.argv.slice(2);
const shotAt = args.includes("--shot") ? args[args.indexOf("--shot") + 1] : null;
const BARE = args.includes("--bare")
  ? "<style>:root { --bi-wear-stain: none; --bi-wear-stain-light: none; --bi-wear-grime: none; --bi-wear-grime-light: none; --bi-wear-scratch: none; }</style>"
  : "";

/** Each swatch, and its budget: what a dark surface may carry is far less than silver. */
const SWATCHES = [
  { name: "black cell", html: `<div class="bi-deck__cell" style="width:440px;height:200px"></div>`, cloud: 4, peak: 7 },
  { name: "black key bank", html: `<section class="bi-deck__module" data-slot="inner" style="width:272px;height:196px"></section>`, cloud: 8, peak: 7 },
  { name: "rail", html: `<div class="bi-srail__body" style="width:440px"></div>`, cloud: 6.5, peak: 7 },
  { name: "silver shoulder", html: `<section class="bi-deck__module" data-slot="outer" style="width:285px;height:196px"></section>`, cloud: 11, peak: 16 },
  { name: "silver plate (console)", html: `<div class="bi-check" style="width:440px;height:200px;display:block"></div>`, cloud: 11, peak: 16 },
  { name: "silver well", html: `<div class="bi-deck__well" style="width:280px;height:140px;margin:0;flex:none"></div>`, cloud: 6, peak: 10 }
];

const links = ["bi-fonts.css", "bi-tokens.css", "bi-components.css", "bi-check.css"]
  .map((f) => `<link rel="stylesheet" href="${pathToFileURL(path.join(styles, f)).href}">`)
  .join("");
const html = `<!doctype html><html><head><meta charset="utf-8">${links}${BARE}<style>
  body { margin: 0; background: #121314; }
  #swatches { display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; width: 1200px; }
  #swatches > * { flex: none; }
</style></head><body><div id="swatches">${SWATCHES.map((s) => s.html).join("")}</div></body></html>`;

/* --- a small PNG reader: what Chrome writes is 8-bit RGB or RGBA, not interlaced ------------------------------- */
function readPng(buf) {
  let at = 8;
  let width = 0;
  let height = 0;
  let type = 0;
  const idat = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const kind = buf.toString("ascii", at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (kind === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error("only 8-bit, non-interlaced PNGs");
      type = data[9];
    } else if (kind === "IDAT") idat.push(data);
    at += 12 + len;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!bpp) throw new Error(`PNG colour type ${type} is not read here`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  const lum = new Float64Array(width * height);
  for (let i = 0; i < width * height; i++) lum[i] = 0.299 * out[i * bpp] + 0.587 * out[i * bpp + 1] + 0.114 * out[i * bpp + 2];
  return { width, height, lum };
}

/** Three box blurs, about a Gaussian of 9 device pixels. */
function blur(src, w, h, r = 9) {
  let a = Float64Array.from(src);
  let b = new Float64Array(src.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) { sum += a[y * w + k]; n++; }
        b[y * w + x] = sum / n;
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let sum = 0;
        let n = 0;
        for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) { sum += b[k * w + x]; n++; }
        a[y * w + x] = sum / n;
      }
    }
  }
  return a;
}

const spread = (values) => {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return { mean, sd: Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) };
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--allow-file-access-from-files"] });
let over = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 900, deviceScaleFactor: SCALE });
  // From a file, not setContent: a blank page may not load stylesheets from the disk.
  const dir = mkdtempSync(path.join(tmpdir(), "bi-grime-"));
  const file = path.join(dir, "swatches.html");
  writeFileSync(file, html, "utf8");
  await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
  rmSync(dir, { recursive: true, force: true });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 400));
  const boxes = await page.evaluate(() => [...document.querySelectorAll("#swatches > *")].map((el) => {
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height];
  }));
  const png = await page.screenshot({ type: "png", fullPage: true });
  if (shotAt) writeFileSync(shotAt, png);
  const image = readPng(Buffer.from(png));

  for (const [i, swatch] of SWATCHES.entries()) {
    const [l, t, w, h] = boxes[i];
    // The middle of the swatch, plus a margin round it for the blur to read from.
    const x0 = Math.round((l + w * 0.08) * SCALE);
    const y0 = Math.round((t + h * 0.18) * SCALE);
    const x1 = Math.round((l + w * 0.92) * SCALE);
    const y1 = Math.round((t + h * 0.82) * SCALE);
    const pad = 40;
    const cw = x1 - x0 + 2 * pad;
    const ch = y1 - y0 + 2 * pad;
    const crop = new Float64Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) crop[y * cw + x] = image.lum[(y0 - pad + y) * image.width + (x0 - pad + x)];
    const soft = blur(crop, cw, ch);
    const px = [];
    const bl = [];
    const hi = [];
    for (let y = pad; y < ch - pad; y++) {
      for (let x = pad; x < cw - pad; x++) {
        px.push(crop[y * cw + x]);
        bl.push(soft[y * cw + x]);
        hi.push(crop[y * cw + x] - soft[y * cw + x]);
      }
    }
    const { mean } = spread(px);
    const cloud = spread(bl).sd;
    const speck = spread(hi).sd;
    const peak = hi.sort((a, b) => a - b)[Math.floor(hi.length * 0.999)];
    const fails = (cloud > swatch.cloud ? " CLOUD OVER BUDGET" : "") + (peak > swatch.peak ? " PEAK OVER BUDGET" : "");
    if (fails) over++;
    console.log(`${swatch.name.padEnd(24)} mean ${mean.toFixed(1).padStart(6)}   cloud ${cloud.toFixed(2).padStart(5)} (${swatch.cloud})   speck ${speck.toFixed(2).padStart(5)}   peak ${peak.toFixed(1).padStart(5)} (${swatch.peak})${fails}`);
  }
} finally {
  await browser.close();
}
if (args.includes("--check") && over) {
  console.log(`\n${over} surface(s) over budget.`);
  process.exit(1);
}
