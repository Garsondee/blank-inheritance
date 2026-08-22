/**
 * Tectonic setup: the uplift field and the initial surface.
 *
 * This is the only place in the terrain pipeline where the map's large-scale
 * geography is CHOSEN rather than derived. Everything downstream — where the
 * valleys go, where the bays are, where the flat buildable ground ends up — is
 * a consequence of this field plus the physics. That makes it the right and
 * only place for art direction to enter.
 *
 * The target is a Japanese Pacific-coast setting: a young, fast-rising range
 * whose mountains come almost to the water, with a narrow coastal strip and
 * short, steep rivers. High uplift near (but not at) the shore is what produces
 * that; a gentle continental ramp would instead give a wide, dull floodplain.
 *
 * Orientation matches the existing battle map asset: the ocean is to the LEFT
 * (x = 0) and the mountains inland to the RIGHT.
 */

import { Field } from '../core/field.mjs';
import { fbm, smoothstep } from '../core/noise.mjs';
import { gaussian, makeRng, subSeed } from '../core/rng.mjs';

/**
 * Build the uplift rate field.
 *
 * Three superimposed components, each doing a specific job:
 *
 *  1. A cross-shore ramp — near zero at the coast, rising inland to a plateau.
 *     This is the basic coastal-range profile.
 *  2. Along-shore variation (low-frequency noise on the ramp's position). This
 *     is what stops the coast being a straight line: where the ramp reaches the
 *     sea earlier, a headland forms; where it hangs back, the valleys behind it
 *     drown into a bay. The ria coastline's rhythm comes from HERE, not from
 *     drawing any coastline.
 *  3. A few discrete massifs — localised high-uplift blobs that become the
 *     named peaks behind the town.
 */
export function makeUpliftField(width, height, seed, opts = {}) {
  const {
    coastalRampStart = 0.06, // Fraction of width where uplift begins climbing.
    coastalRampEnd = 0.62, // Where it reaches full inland rate.
    baseRate = 4e-5, // Inland uplift rate (m/yr, geologically fast).
    coastRate = 2e-6, // Residual uplift at the shore.
    alongShoreAmplitude = 0.22, // How much the ramp position wanders, as a fraction of width.
    massifCount = 3,
    massifStrength = 0.7,
  } = opts;

  const rampSeed = subSeed(seed, 'uplift', 'ramp');
  const massifRng = makeRng(subSeed(seed, 'uplift', 'massifs'));

  // Place the massifs inland, spread over the map's height.
  const massifs = [];
  for (let k = 0; k < massifCount; k++) {
    massifs.push({
      x: (0.55 + 0.4 * massifRng()) * width,
      y: ((k + 0.5) / massifCount + (massifRng() - 0.5) * 0.25) * height,
      radius: (0.10 + 0.13 * massifRng()) * width,
      strength: massifStrength * (0.6 + 0.8 * massifRng()),
    });
  }

  return Field.from(width, height, (x, y) => {
    // Along-shore wander of the ramp: two scales, so the coast has both broad
    // bays and smaller sub-bays inside them.
    const wander =
      (fbm(rampSeed, x / width, (y / height) * 3.0, { octaves: 3, frequency: 1 }) - 0.5) * 2 * alongShoreAmplitude +
      (fbm(rampSeed + 77, x / width, (y / height) * 9.0, { octaves: 2, frequency: 1 }) - 0.5) * 2 * alongShoreAmplitude * 0.4;

    const start = (coastalRampStart + wander) * width;
    const end = (coastalRampEnd + wander) * width;
    const ramp = smoothstep(start, end, x);

    let rate = coastRate + (baseRate - coastRate) * ramp;

    for (const mssf of massifs) {
      const d = Math.hypot(x - mssf.x, y - mssf.y) / mssf.radius;
      if (d < 1) {
        const bump = Math.cos((d * Math.PI) / 2) ** 2;
        rate += baseRate * mssf.strength * bump;
      }
    }

    return rate;
  });
}

/**
 * The initial surface the simulation starts from.
 *
 * Kept low and nearly featureless on purpose — a gentle seaward tilt plus small
 * Gaussian roughness. The landscape is meant to be BUILT by uplift and cut by
 * water over the run, not sculpted here and then lightly weathered. Starting
 * from a dramatic noise field would leave noise-shaped artefacts that erosion
 * never fully reorganises.
 */
export function makeInitialSurface(width, height, seed, opts = {}) {
  const { tilt = 60, roughness = 8 } = opts;
  const rng = makeRng(subSeed(seed, 'terrain', 'initial'));
  return Field.from(width, height, (x) => {
    return (x / width) * tilt + gaussian(rng) * roughness;
  });
}

/**
 * Orographic precipitation: wetter on the seaward-facing slopes.
 *
 * Moist Pacific air rises against the coastal range and dumps its rain on the
 * windward side, leaving a drier interior. Feeding this into the stream-power
 * law's discharge term makes the seaward catchments incise harder than the
 * inland ones — which is a real and visible asymmetry in Japanese terrain, and
 * costs almost nothing to include.
 */
export function makePrecipitationField(width, height, seed, opts = {}) {
  const { windwardBoost = 1.7, interiorFalloff = 0.55, variability = 0.18 } = opts;
  const noiseSeed = subSeed(seed, 'climate', 'precip');
  return Field.from(width, height, (x, y) => {
    const inland = x / width;
    const orographic = windwardBoost * Math.exp(-inland / interiorFalloff);
    const local = 1 + (fbm(noiseSeed, x / width, (y / height) * 2, { octaves: 3 }) - 0.5) * 2 * variability;
    return Math.max(0.15, orographic * local);
  });
}
