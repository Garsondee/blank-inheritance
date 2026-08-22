/**
 * Shaded relief and hypsometric tinting.
 *
 * Two independent jobs combined into one raster:
 *
 *   HILLSHADE  — Horn's (1981) slope/aspect from a 3x3 window, lit by a
 *   Lambertian source at the cartographic convention of 315 degrees azimuth,
 *   45 degrees altitude. Light from the upper left is a convention, not
 *   physics: lit from below, humans read the relief inverted and every valley
 *   looks like a ridge.
 *
 *   HYPSOMETRIC TINT — elevation mapped to colour. The palette is the main
 *   place the map declares what KIND of landscape this is, and it is
 *   deliberately not the arid tan of the reference satellite image this
 *   generator exists to replace. Japan's Pacific coast is wet and heavily
 *   forested: dark greens through most of the relief, paddy-green on the
 *   alluvial flats, and rock grey only at the very top.
 */

/** Piecewise-linear colour ramp over elevation in metres relative to sea level. */
const LAND_RAMP = [
  { at: 0, rgb: [214, 214, 186] }, // Beach and tidal flat.
  { at: 6, rgb: [176, 190, 141] }, // Reclaimed paddy on the alluvial plain.
  { at: 25, rgb: [141, 168, 112] },
  { at: 80, rgb: [104, 143, 90] }, // Lower forested slopes.
  { at: 200, rgb: [78, 120, 76] },
  { at: 420, rgb: [92, 118, 74] }, // Cedar and cypress belt.
  { at: 700, rgb: [126, 128, 92] },
  { at: 1000, rgb: [158, 148, 122] },
  { at: 1400, rgb: [188, 183, 172] }, // Bare rock near the crest.
  { at: 2000, rgb: [225, 225, 222] },
];

/** Depth in metres below sea level -> colour. */
const SEA_RAMP = [
  { at: 0, rgb: [178, 209, 208] }, // Foreshore.
  { at: 2, rgb: [148, 191, 197] },
  { at: 6, rgb: [116, 170, 187] },
  { at: 15, rgb: [86, 145, 174] },
  { at: 40, rgb: [61, 116, 155] },
  { at: 120, rgb: [43, 88, 130] },
  { at: 350, rgb: [31, 64, 104] },
  { at: 900, rgb: [22, 44, 78] }, // Beyond the shelf break.
];

function rampLookup(ramp, value) {
  if (value <= ramp[0].at) return ramp[0].rgb;
  for (let i = 1; i < ramp.length; i++) {
    if (value <= ramp[i].at) {
      const a = ramp[i - 1];
      const b = ramp[i];
      const t = (value - a.at) / (b.at - a.at);
      return [
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t,
      ];
    }
  }
  return ramp[ramp.length - 1].rgb;
}

/**
 * Horn's slope/aspect hillshade, returned as a 0..1 illumination per cell.
 *
 * `zFactor` exaggerates vertical relief. Real terrain lit truthfully is
 * disappointingly flat on a map at this scale, and every published relief map
 * exaggerates; 2-3x is normal and is what makes the drainage network legible.
 */
export function hillshade(elevation, { metresPerCell = 25, azimuth = 315, altitude = 45, zFactor = 2.4 } = {}) {
  const { width, height } = elevation;
  const h = elevation.data;
  const out = new Float64Array(width * height);

  const azRad = ((360 - azimuth + 90) * Math.PI) / 180;
  const zenith = ((90 - altitude) * Math.PI) / 180;
  const cosZenith = Math.cos(zenith);
  const sinZenith = Math.sin(zenith);
  const cell8 = 8 * metresPerCell;

  const at = (x, y) => {
    const cx = x < 0 ? 0 : x >= width ? width - 1 : x;
    const cy = y < 0 ? 0 : y >= height ? height - 1 : y;
    return h[cy * width + cx];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = at(x - 1, y - 1);
      const b = at(x, y - 1);
      const c = at(x + 1, y - 1);
      const d = at(x - 1, y);
      const f = at(x + 1, y);
      const g = at(x - 1, y + 1);
      const i2 = at(x, y + 1);
      const j = at(x + 1, y + 1);

      const dzdx = ((c + 2 * f + j) - (a + 2 * d + g)) / cell8;
      const dzdy = ((g + 2 * i2 + j) - (a + 2 * b + c)) / cell8;

      const slope = Math.atan(zFactor * Math.hypot(dzdx, dzdy));
      let aspect = Math.atan2(dzdy, -dzdx);
      if (aspect < 0) aspect += 2 * Math.PI;

      let shade = cosZenith * Math.cos(slope) + sinZenith * Math.sin(slope) * Math.cos(azRad - aspect);
      if (shade < 0) shade = 0;
      out[y * width + x] = shade;
    }
  }
  return out;
}

/**
 * Compose elevation, water mask and hillshade into an RGB raster.
 *
 * The shading is applied multiplicatively but pulled toward 1 — a straight
 * multiply crushes shadowed slopes to near-black and loses the hypsometric
 * information the tint was carrying. Underwater the shading is damped further
 * still, because a shaded seabed reads as land to the eye and the single most
 * important thing this map must communicate at a glance is where the water is.
 */
export function renderRelief(terrain, opts = {}) {
  const { contrast = 0.72, seaContrast = 0.3, ambient = 0.35 } = opts;
  const { elevation, water, seaLevel, meta } = terrain;
  const { width, height } = elevation;
  const shade = hillshade(elevation, { metresPerCell: meta.metresPerCell, ...opts });
  const rgb = new Uint8Array(width * height * 3);

  for (let i = 0; i < width * height; i++) {
    const rel = elevation.data[i] - seaLevel;
    const isSea = water[i] !== 0;
    const base = isSea ? rampLookup(SEA_RAMP, -rel) : rampLookup(LAND_RAMP, Math.max(0, rel));
    const k = isSea ? seaContrast : contrast;
    // Map illumination 0..1 into a multiplier centred near 1.
    const lit = ambient + (1 - ambient) * shade[i];
    const mult = 1 - k + k * (lit * 1.45);
    const o = i * 3;
    rgb[o] = clamp255(base[0] * mult);
    rgb[o + 1] = clamp255(base[1] * mult);
    rgb[o + 2] = clamp255(base[2] * mult);
  }

  return { rgb, width, height };
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

export { LAND_RAMP, SEA_RAMP, rampLookup };
