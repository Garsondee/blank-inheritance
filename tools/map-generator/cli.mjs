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
import { renderSVG } from './render/svg.mjs';

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

const s = terrain.stats;
console.log(`seed ${args.seed} — ${Date.now() - t0} ms`);
console.log(`  land            ${(s.landFraction * 100).toFixed(1)}%`);
console.log(`  highest         ${Math.round(s.elevationAboveSea.max - terrain.seaLevel)} m`);
console.log(`  deepest         ${Math.round(s.deepest)} m`);
console.log(`  coastline       ${s.coastlineLengthKm.toFixed(1)} km in ${s.coastlineRings} rings`);
console.log(`  river segments  ${s.riverSegments}`);
console.log(`  harbour sites   ${s.harbourSites}`);
console.log(`  -> ${outPath}.svg`);
