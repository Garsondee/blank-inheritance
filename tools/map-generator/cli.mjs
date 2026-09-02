#!/usr/bin/env node
/**
 * Stage 1 CLI: generate a coastline and write it out.
 *
 *   node tools/map-generator/cli.mjs --seed 1950 --out out/coast
 *
 * Writes <out>.svg (the map) and <out>.json (the model's summary, so a run is
 * inspectable and comparable without re-reading the SVG). The full field data
 * is not serialised yet — stage 4 will define that format alongside the damage
 * event log, and guessing at it now would only have to be redone.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { generateTerrain } from './terrain/generate.mjs';
import { amplifyTerrain, toDecimetres } from './terrain/amplify.mjs';
import { renderSVG } from './render/svg.mjs';
import { renderRelief } from './render/hillshade.mjs';
import { encodePNG } from './render/png.mjs';

function parseArgs(argv) {
  const args = { seed: 1950, out: 'out/coast', title: 'UNNAMED COAST', analysis: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed') args.seed = Number(argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--title') args.title = argv[++i];
    else if (a === '--size') args.size = Number(argv[++i]);
    else if (a === '--iterations') args.iterations = Number(argv[++i]);
    else if (a === '--water') args.waterFraction = Number(argv[++i]);
    else if (a === '--analysis') args.analysis = true;
    else if (a === '--amplify') args.amplify = Number(argv[++i]);
    else if (a === '--quiet') args.quiet = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const overrides = {};
if (args.size) {
  overrides.width = args.size;
  overrides.height = args.size;
}
if (args.iterations) overrides.iterations = args.iterations;
if (args.waterFraction) overrides.waterFraction = args.waterFraction;

if (!args.quiet) {
  let last = -1;
  overrides.onProgress = (step, total) => {
    const pct = Math.floor((step / total) * 10) * 10;
    if (pct !== last) {
      last = pct;
      process.stderr.write(`\r  eroding… ${pct}%   `);
    }
  };
}

const t0 = Date.now();
const terrain = generateTerrain(args.seed, overrides);
if (!args.quiet) process.stderr.write('\r                        \r');

terrain.meta.generatedAt = new Date().toISOString();

const svg = renderSVG(terrain, { title: args.title, showAnalysis: args.analysis });

const outPath = resolve(args.out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(`${outPath}.svg`, svg, 'utf8');
writeFileSync(
  `${outPath}.json`,
  JSON.stringify(
    {
      meta: { ...terrain.meta, params: { ...terrain.meta.params, onProgress: undefined } },
      stats: terrain.stats,
      harbours: terrain.harbours.slice(0, 12),
      mouths: terrain.mouths,
    },
    null,
    2
  ),
  'utf8'
);

// --- Stage 2: amplification -------------------------------------------------
// Deliberately NOT rendered into the SVG. A 4096^2 relief raster embedded as a
// data URI runs to tens of megabytes and no browser enjoys it — that is exactly
// the tiled level-of-detail problem design/map-generation.md defers to stage 9.
// Until then this writes the DTM itself plus a downsampled preview, which is
// what the later stages actually consume anyway.
if (args.amplify) {
  const t1 = Date.now();
  const fine = amplifyTerrain(terrain, args.seed, { factor: args.amplify });
  const dtm = toDecimetres(fine.elevation);
  writeFileSync(`${outPath}.dtm`, Buffer.from(dtm.buffer, dtm.byteOffset, dtm.byteLength));

  const { rgb } = renderRelief(fine);
  const step = Math.max(1, Math.round(fine.meta.width / 1400));
  const pw = Math.floor(fine.meta.width / step);
  const preview = new Uint8Array(pw * pw * 3);
  for (let y = 0; y < pw; y++) {
    for (let x = 0; x < pw; x++) {
      const src = (y * step * fine.meta.width + x * step) * 3;
      const dst = (y * pw + x) * 3;
      preview[dst] = rgb[src];
      preview[dst + 1] = rgb[src + 1];
      preview[dst + 2] = rgb[src + 2];
    }
  }
  writeFileSync(`${outPath}-dtm.png`, encodePNG(preview, pw, pw));

  console.log(`amplified x${args.amplify} -> ${fine.meta.width}^2 @ ${fine.meta.metresPerCell.toFixed(2)} m in ${((Date.now() - t1) / 1000).toFixed(0)} s`);
  console.log(`  DTM           ${(dtm.byteLength / 1048576).toFixed(0)} MB Int16 -> ${outPath}.dtm`);
  console.log(`  preview       ${pw}^2 -> ${outPath}-dtm.png`);
}

const s = terrain.stats;
console.log(`seed ${args.seed} — ${Date.now() - t0} ms`);
console.log(`  land            ${(s.landFraction * 100).toFixed(1)}%`);
console.log(`  highest         ${Math.round(s.elevationAboveSea.max - terrain.seaLevel)} m`);
console.log(`  deepest         ${Math.round(s.deepest)} m`);
console.log(`  coastline       ${s.coastlineLengthKm.toFixed(1)} km in ${s.coastlineRings} rings`);
console.log(`  river segments  ${s.riverSegments}`);
console.log(`  harbour sites   ${s.harbourSites}`);
console.log(`  -> ${outPath}.svg`);
