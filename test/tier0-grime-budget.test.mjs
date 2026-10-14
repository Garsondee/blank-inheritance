// Tier 0 — the grime stays subtle (bi-tokens.css §7a-ii, third pass, 2026-10-05).
//
// Ingram: "the white grime on a dark background needs to be more subtle. Dealer's choice, improve the grime." On the
// black cells the light grime read as smoke (grey clouds over the black, white specks like stars), and on silver the
// stain read as coffee blotches. The textures are inline SVG noise, so how strong each can ever get is written in its
// own numbers: the alpha row of its colour matrix and the opacity it is drawn at. This holds each to a budget, and
// stops a stylesheet from stacking the light ones back up into clouds.
//
// The budgets came from measuring the textures on clean swatches at Ingram's 150% scaling (tools/ui-grime/measure.mjs,
// which also checks the rendered result).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STYLES = path.join(ROOT, "module", "blank-inheritance", "styles");
const tokens = readFileSync(path.join(STYLES, "bi-tokens.css"), "utf8");

/** A texture token's SVG, decoded. */
function svgOf(name) {
  const line = tokens.match(new RegExp(`--${name}: url\\("data:image/svg\\+xml;utf8,([^"]*)"\\);`));
  assert.ok(line, `--${name} is missing from bi-tokens.css`);
  return line[1].replace(/%23/g, "#");
}

/** The opacity the texture is drawn at (its <rect>'s, 1 when it has none). */
function drawnAt(svg) {
  const rect = svg.match(/<rect\b[^>]*>/)?.[0] ?? "";
  const opacity = rect.match(/\bopacity='([\d.]+)'/)?.[1];
  return opacity === undefined ? 1 : Number(opacity);
}

/** Every colour matrix's alpha row as [scale, offset]: the alpha it puts out is scale x noise + offset. */
function alphaRows(svg) {
  return [...svg.matchAll(/<feColorMatrix\b[^>]*values='([^']+)'/g)].map((m) => {
    const v = m[1].trim().split(/\s+/).map(Number);
    assert.equal(v.length, 20, `a colour matrix with ${v.length} values`);
    return [v[18], v[19]];
  });
}

const alphaAt = (row, noise) => Math.min(1, Math.max(0, row[0] * noise + row[1]));

test("the dust film on dark surfaces stays a film: a few percent where the noise runs high, never a light stain", () => {
  const svg = svgOf("bi-wear-stain-light");
  const [row] = alphaRows(svg);
  const opacity = drawnAt(svg);
  // fractalNoise sits around 0.5; 0.8 is already well into its bright tail.
  assert.ok(alphaAt(row, 0.8) * opacity <= 0.05, `the film reaches ${(alphaAt(row, 0.8) * opacity).toFixed(3)} alpha at noise 0.8 (budget 0.05)`);
  assert.ok(alphaAt(row, 1) * opacity <= 0.08, `the film reaches ${(alphaAt(row, 1) * opacity).toFixed(3)} alpha at its peak (budget 0.08)`);
});

test("the motes on dark surfaces are drawn faint, and carry no blots", () => {
  const svg = svgOf("bi-wear-grime-light");
  assert.ok(drawnAt(svg) <= 0.06, `drawn at ${drawnAt(svg)} (budget 0.06): a mote can never be brighter than that over black`);
  assert.doesNotMatch(svg, /<feMerge\b/, "a second layer (the blots) is back: a white blot on black reads as a fleck of paint");
});

test("silver's tarnish, specks and scratches stay within theirs", () => {
  const stain = svgOf("bi-wear-stain");
  const [row] = alphaRows(stain);
  assert.ok(alphaAt(row, 0.8) * drawnAt(stain) <= 0.25, `the tarnish reaches ${alphaAt(row, 0.8).toFixed(3)} alpha at noise 0.8 (budget 0.25)`);
  // Stretched along the brushing: its frequency across is lower than down.
  const [fx, fy] = stain.match(/baseFrequency='([\d.]+) ([\d.]+)'/).slice(1).map(Number);
  assert.ok(fx < fy, "the tarnish no longer runs along the brushing");
  assert.ok(drawnAt(svgOf("bi-wear-grime")) <= 0.25, "silver's specks are drawn heavier than their budget (0.25)");
  const scratch = svgOf("bi-wear-scratch");
  const strongest = Math.max(...[...scratch.matchAll(/stroke-opacity='([\d.]+)'/g)].map((m) => Number(m[1])));
  assert.ok(strongest <= 0.3, `a scratch is drawn at ${strongest} (budget 0.3)`);
});

test("no stylesheet stacks the light textures back up into clouds", () => {
  for (const file of readdirSync(STYLES).filter((f) => f.endsWith(".css"))) {
    const css = readFileSync(path.join(STYLES, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const block of css.matchAll(/\{([^{}]*)\}/g)) {
      for (const decl of block[1].matchAll(/background(?:-image)?\s*:([^;]*);/g)) {
        const film = (decl[1].match(/--bi-wear-stain-light\b/g) ?? []).length;
        const motes = (decl[1].match(/--bi-wear-grime-light\b/g) ?? []).length;
        assert.ok(film <= 1, `${file}: a background stacks the dust film ${film} times`);
        // Two is the most any surface takes: the orb's backlit glass, where dust is meant to show.
        assert.ok(motes <= 2, `${file}: a background stacks the motes ${motes} times`);
      }
    }
  }
});
