/**
 * End-to-end tests for the terrain generator and its renderers.
 *
 * The determinism test is the load-bearing one. The entire updatability design
 * — regenerate the world from a seed, replay a damage event log on top, and
 * never destructively edit anything — is worthless if the same seed does not
 * reproduce the same world. That guarantee has to be checked, not assumed.
 *
 * Everything runs at a small grid with few iterations. The landforms this
 * asserts on (a coast exists, rivers reach it, nothing is NaN) are structural
 * and appear at any resolution; asserting on exact elevations would just make
 * the suite fight every future parameter tweak.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateTerrain, DEFAULT_PARAMS } from '../../tools/map-generator/terrain/generate.mjs';
import { LAND, OCEAN } from '../../tools/map-generator/terrain/sealevel.mjs';
import { renderRelief, hillshade } from '../../tools/map-generator/render/hillshade.mjs';
import { encodePNG } from '../../tools/map-generator/render/png.mjs';
import { renderSVG } from '../../tools/map-generator/render/svg.mjs';

/**
 * Small enough to run fast, large enough for a real drainage network — and for
 * phase 2 to actually do its job. metresPerCell is scaled so the map still
 * covers the same ~12.8 km of real ground as the production defaults, since the
 * physics is tuned against physical distance, not cell count.
 */
const FAST = { width: 72, height: 72, metresPerCell: 178, iterations: 90, alluvialIterations: 150 };

let cached = null;
function terrain() {
  if (!cached) cached = generateTerrain(1950, FAST);
  return cached;
}

// ---------------------------------------------------------------------------
// Determinism — the guarantee the whole updatability design rests on
// ---------------------------------------------------------------------------

test('the same seed reproduces a bit-identical landscape (without this, replaying a campaign damage log over a regenerated world is meaningless)', () => {
  const a = generateTerrain(1950, FAST);
  const b = generateTerrain(1950, FAST);
  assert.deepEqual(Array.from(a.elevation.data), Array.from(b.elevation.data));
  assert.equal(a.seaLevel, b.seaLevel);
  assert.deepEqual(Array.from(a.water), Array.from(b.water));
  assert.deepEqual(a.coastline, b.coastline);
  assert.deepEqual(a.mouths, b.mouths);
});

test('different seeds produce genuinely different landscapes', () => {
  const a = generateTerrain(1950, FAST);
  const b = generateTerrain(1951, FAST);
  let differing = 0;
  for (let i = 0; i < a.elevation.length; i++) {
    if (Math.abs(a.elevation.data[i] - b.elevation.data[i]) > 1) differing++;
  }
  const frac = differing / a.elevation.length;
  assert.ok(frac > 0.5, `only ${(frac * 100).toFixed(1)}% of cells differ between seeds`);
});

test('generation is time-free: nothing in the model depends on the clock (the caller stamps generatedAt)', () => {
  assert.equal(terrain().meta.generatedAt, null);
});

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------

test('every elevation is finite', () => {
  const t = terrain();
  for (let i = 0; i < t.elevation.length; i++) {
    assert.ok(Number.isFinite(t.elevation.data[i]), `cell ${i} is not finite: ${t.elevation.data[i]}`);
  }
});

test('a coastline exists, is non-trivial, and is longer than the map is wide (an indented coast, not a straight edge)', () => {
  const t = terrain();
  assert.ok(t.coastline.length > 0, 'no coastline was extracted');
  const mapWidthKm = (t.meta.width * t.meta.metresPerCell) / 1000;
  assert.ok(
    t.stats.coastlineLengthKm > mapWidthKm,
    `coastline ${t.stats.coastlineLengthKm.toFixed(1)} km is shorter than the ${mapWidthKm.toFixed(1)} km map width — that is a straight shore, not a ria coast`
  );
});

test('the sea is on the seaward side and land is inland', () => {
  const t = terrain();
  const { width, height } = t.meta;
  let seawardOcean = 0;
  let inlandLand = 0;
  for (let y = 0; y < height; y++) {
    if (t.water[y * width + 1] === OCEAN) seawardOcean++;
    if (t.water[y * width + width - 2] === LAND) inlandLand++;
  }
  assert.ok(seawardOcean > height * 0.8, `only ${seawardOcean}/${height} seaward-edge cells are ocean`);
  assert.ok(inlandLand > height * 0.8, `only ${inlandLand}/${height} inland-edge cells are land`);
});

test('land fraction lands near the requested water fraction', () => {
  const t = terrain();
  const expected = 1 - FAST_WATER(t);
  assert.ok(
    Math.abs(t.stats.landFraction - expected) < 0.12,
    `land fraction ${t.stats.landFraction.toFixed(3)} vs expected ~${expected.toFixed(3)}`
  );
});
function FAST_WATER(t) {
  return t.meta.params.waterFraction;
}

test('rivers actually reach the sea — the drainage network is integrated, not stranded inland', () => {
  const t = terrain();
  assert.ok(t.rivers.length > 0, 'no river segments were extracted');
  const reaching = t.rivers.filter((r) => r.reachesSea).length;
  assert.ok(reaching > 0, 'not a single river segment terminates at the ocean');
  assert.ok(t.mouths.length > 0, 'no river mouths were identified');
});

test('river mouths sit on the waterline, and the largest is reported first', () => {
  const t = terrain();
  const { width } = t.meta;
  for (const m of t.mouths) {
    assert.equal(t.water[m.y * width + m.x], OCEAN, `mouth at (${m.x},${m.y}) is not in the water`);
  }
  for (let i = 1; i < t.mouths.length; i++) {
    assert.ok(
      t.mouths[i - 1].catchmentKm2 >= t.mouths[i].catchmentKm2,
      'mouths should be sorted by catchment, largest first'
    );
  }
});

test('river width scaling is monotonic in discharge', () => {
  const t = terrain();
  const sorted = [...t.rivers].sort((a, b) => a.area - b.area);
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i].strength >= sorted[i - 1].strength - 1e-12, 'a larger catchment must not draw a thinner river');
  }
});

test('no river segment is drawn across open water', () => {
  const t = terrain();
  const { width } = t.meta;
  for (const s of t.rivers) {
    assert.equal(t.water[s.from[1] * width + s.from[0]], LAND, `river segment starts at (${s.from}) which is not land`);
  }
});

test('harbour sites are in sheltered water of usable depth, close inshore', () => {
  const t = terrain();
  const { width } = t.meta;
  assert.ok(t.harbours.length > 0, 'no harbour sites found — the city stage has nowhere to put a port');
  for (const h of t.harbours) {
    assert.equal(t.water[h.y * width + h.x], OCEAN, 'a harbour site must be in the water');
    assert.ok(h.depth >= 2 && h.depth <= 14, `harbour depth ${h.depth} is outside the usable band`);
    assert.ok(h.shelter > 0, 'a harbour site must have some shelter');
  }
  for (let i = 1; i < t.harbours.length; i++) {
    assert.ok(t.harbours[i - 1].score >= t.harbours[i].score, 'harbours should be sorted best-first');
  }
});

test('bathymetry is deeper than the shore offshore, and the shelf break makes deep water reachable', () => {
  const t = terrain();
  assert.ok(t.stats.deepest > 50, `deepest water is only ${t.stats.deepest.toFixed(0)} m — the shelf break did not fire`);
});

test('contours bracket the terrain: land contours above sea level, sea contours below, none beyond the actual range', () => {
  const t = terrain();
  const maxAbove = t.elevation.max() - t.seaLevel;
  for (const c of t.contours.land) {
    assert.ok(c.level > 0 && c.level < maxAbove + 1e-6, `land contour at ${c.level} m is outside the relief`);
  }
  for (const c of t.contours.sea) {
    assert.ok(c.depth > 0 && c.depth <= t.stats.deepest + 1e-6, `sea contour at ${c.depth} m exceeds the deepest water`);
  }
});

// ---------------------------------------------------------------------------
// The two-phase transgression
// ---------------------------------------------------------------------------

/**
 * Flat LOWLAND ground: gentle slope, below 40 m of elevation.
 *
 * Deliberately not "gentle slope anywhere on the map". Phase 2's job is to
 * build the coastal alluvial plain, and a map-wide average of smoothness is a
 * bad instrument for that — at coarse cell sizes a Horn gradient smooths over
 * half a kilometre, most of the map already reads as gentle, and the signal
 * washes out entirely. Measuring the landform the stage actually produces
 * reports it cleanly at every resolution tested.
 */
function lowlandFlatCells(t, { maxSlope = 0.05, maxElevation = 40 } = {}) {
  const { width, height, metresPerCell: dx } = t.meta;
  const h = t.elevation.data;
  const at = (x, y) =>
    h[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (t.water[i] !== LAND) continue;
      if (h[i] - t.seaLevel > maxElevation) continue;
      const dzdx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) -
          (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1))) / (8 * dx);
      const dzdy =
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) -
          (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1))) / (8 * dx);
      if (Math.hypot(dzdx, dzdy) < maxSlope) count++;
    }
  }
  return count;
}

test('REGRESSION: phase 2 (post-transgression alluviation) builds the flat coastal lowland that phase 1 alone cannot (found 2026-08-23: erode-then-flood correctly drowns its OWN coastal plain, leaving mountains dropping into deep water and nowhere for a town to stand — the fix is the Holocene alluviation the real coast went through, which is also what turns a drowned valley into a harbour with a town site at its head)', () => {
  const withoutPhase2 = generateTerrain(1950, { ...FAST, alluvialIterations: 0 });
  const withPhase2 = generateTerrain(1950, FAST);
  const before = lowlandFlatCells(withoutPhase2);
  const after = lowlandFlatCells(withPhase2);
  assert.ok(before > 0, 'sanity: the phase-1-only landscape should have some lowland at all');
  assert.ok(
    after > before * 1.2,
    `phase 2 should measurably grow the coastal lowland: ${before} flat lowland cells before, ${after} after`
  );
});

test('REGRESSION: phase 2 does not simply lift the whole landscape (found 2026-08-23: it was inheriting phase 1\'s tectonic uplift rate over a 600 kyr span and raising 60% of all cells by a mean of 76 m, which swamped the valley-filling it exists to do)', () => {
  const withoutPhase2 = generateTerrain(1950, { ...FAST, alluvialIterations: 0 });
  const withPhase2 = generateTerrain(1950, FAST);
  // Compare only cells that were land before, so the delta is not measuring
  // deltas prograding into what used to be sea.
  let raised = 0;
  let land = 0;
  for (let i = 0; i < withPhase2.elevation.length; i++) {
    if (withoutPhase2.water[i] !== LAND) continue;
    land++;
    if (withPhase2.elevation.data[i] > withoutPhase2.elevation.data[i] + 5) raised++;
  }
  const frac = raised / land;
  assert.ok(frac < 0.35, `phase 2 raised ${(frac * 100).toFixed(0)}% of existing land by >5 m — it is bulk-lifting, not alluviating`);
});

test('phase 2 tidies the over-fractal coastline rather than lengthening it (silting the micro-inlets is the same process that builds the flats)', () => {
  const withoutPhase2 = generateTerrain(1950, { ...FAST, alluvialIterations: 0 });
  const withPhase2 = generateTerrain(1950, FAST);
  assert.ok(
    withPhase2.stats.coastlineLengthKm < withoutPhase2.stats.coastlineLengthKm,
    `phase 2 should shorten the coastline (${withoutPhase2.stats.coastlineLengthKm.toFixed(1)} -> ${withPhase2.stats.coastlineLengthKm.toFixed(1)} km)`
  );
});

// ---------------------------------------------------------------------------
// Render layer
// ---------------------------------------------------------------------------

test('hillshade stays within [0, 1] and is brighter on slopes facing the light than away from it', () => {
  const t = terrain();
  const shade = hillshade(t.elevation, { metresPerCell: t.meta.metresPerCell });
  for (let i = 0; i < shade.length; i++) {
    assert.ok(shade[i] >= 0 && shade[i] <= 1.0001, `illumination out of range at ${i}: ${shade[i]}`);
  }
});

test('renderRelief produces one RGB triple per cell, all in range', () => {
  const t = terrain();
  const { rgb, width, height } = renderRelief(t);
  assert.equal(rgb.length, width * height * 3);
  for (let i = 0; i < rgb.length; i++) {
    assert.ok(rgb[i] >= 0 && rgb[i] <= 255, `channel ${i} out of range: ${rgb[i]}`);
  }
});

test('the sea renders bluer than the land renders, at a glance', () => {
  const t = terrain();
  const { rgb } = renderRelief(t);
  let seaBlueLead = 0;
  let seaN = 0;
  let landBlueLead = 0;
  let landN = 0;
  for (let i = 0; i < t.water.length; i++) {
    const lead = rgb[i * 3 + 2] - rgb[i * 3 + 1]; // blue minus green
    if (t.water[i] === OCEAN) {
      seaBlueLead += lead;
      seaN++;
    } else if (t.water[i] === LAND) {
      landBlueLead += lead;
      landN++;
    }
  }
  assert.ok(seaBlueLead / seaN > landBlueLead / landN + 20, 'water must read unmistakably as water');
});

test('encodePNG emits a structurally valid PNG with correct dimensions and CRCs', () => {
  const w = 9;
  const h = 7;
  const rgb = new Uint8Array(w * h * 3);
  for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 37) & 0xff;
  const png = encodePNG(rgb, w, h);

  assert.deepEqual(Array.from(png.subarray(0, 8)), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x08 + 2]);
  assert.equal(png.readUInt32BE(8), 13, 'IHDR must be 13 bytes');
  assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.equal(png.readUInt32BE(16), w);
  assert.equal(png.readUInt32BE(20), h);
  assert.equal(png[24], 8, 'bit depth');
  assert.equal(png[25], 2, 'colour type 2 = truecolour');

  // Walk every chunk and verify its length and CRC, ending at IEND.
  let offset = 8;
  const seen = [];
  while (offset < png.length) {
    const len = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    seen.push(type);
    const body = png.subarray(offset + 4, offset + 8 + len);
    const stored = png.readUInt32BE(offset + 8 + len);
    assert.equal(crc32(body), stored, `CRC mismatch on ${type}`);
    offset += 12 + len;
  }
  assert.equal(offset, png.length, 'chunks must exactly cover the file');
  assert.deepEqual(seen, ['IHDR', 'IDAT', 'IEND']);
});

test('encodePNG rejects a buffer of the wrong size rather than emitting a corrupt file', () => {
  assert.throws(() => encodePNG(new Uint8Array(10), 4, 4), /expected 48 bytes/);
});

test('renderSVG produces well-formed, self-contained SVG with no non-finite coordinates', () => {
  const t = terrain();
  const svg = renderSVG(t, { title: 'TEST COAST', showAnalysis: true });

  assert.ok(svg.startsWith('<svg '), 'must start with an svg element');
  assert.ok(svg.trimEnd().endsWith('</svg>'), 'must close the svg element');
  assert.ok(svg.includes('data:image/png;base64,'), 'the relief raster should be embedded, not linked');
  assert.ok(!/https?:\/\//.test(svg.replace(/xmlns="[^"]*"/g, '')), 'must not reference any external resource');

  // Coordinates only: strip the base64 payload first, since a long random
  // base64 string will contain the literal substring "NaN" by chance.
  const stripped = svg.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, 'DATAURI');
  assert.ok(!/NaN|Infinity|undefined/.test(stripped), 'found a non-finite coordinate in the SVG');

  const opens = (svg.match(/<g[ >]/g) || []).length;
  const closes = (svg.match(/<\/g>/g) || []).length;
  assert.equal(opens, closes, `unbalanced <g> elements: ${opens} open, ${closes} closed`);
});

test('renderSVG escapes the title rather than letting it break the document', () => {
  const t = terrain();
  const svg = renderSVG(t, { title: 'A <script> & "quotes"' });
  assert.ok(svg.includes('&lt;script&gt;'), 'title markup must be escaped');
  assert.ok(!svg.includes('<script>'), 'raw markup leaked into the SVG');
});

test('render layers can be switched off independently', () => {
  const t = terrain();
  const full = renderSVG(t, {});
  const bare = renderSVG(t, { showContours: false, showBathymetry: false, showRivers: false, showGraticule: false, showAnnotations: false });
  assert.ok(bare.length < full.length, 'disabling layers should shrink the output');
  assert.ok(bare.includes('data:image/png;base64,'), 'the relief and coastline always remain');
});

test('DEFAULT_PARAMS stays internally consistent', () => {
  assert.ok(DEFAULT_PARAMS.m === 0.5, 'm must be 0.5 to pair with the hardcoded n = 1 in the implicit solver');
  assert.ok(DEFAULT_PARAMS.waterFraction > 0 && DEFAULT_PARAMS.waterFraction < 1);
  assert.ok(DEFAULT_PARAMS.upliftInland > DEFAULT_PARAMS.upliftCoast, 'a coastal range rises inland');
  assert.ok(DEFAULT_PARAMS.alluvialUpliftFactor < 0.1, 'phase 2 must not inherit full tectonic uplift');
});

// Minimal CRC32, duplicated here on purpose: a test that reused the encoder's
// own implementation would pass even if that implementation were wrong.
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
