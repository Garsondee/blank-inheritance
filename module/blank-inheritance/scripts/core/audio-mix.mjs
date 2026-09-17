/**
 * The sound desk's arithmetic — the pure half of design/audio-system.md §4.
 *
 * Everything a mixing console does with numbers lives here: decibels to gain
 * and back, where a fader cap sits for a given level, how a VU needle chases a
 * signal, how deep a duck goes when two stings overlap, and what a GM's bus
 * levels look like once they have been cleaned up. No Web Audio, no Foundry,
 * no DOM — foundry/audio-engine.mjs owns the AudioNodes and only ever asks
 * this file what number to write into them.
 *
 * Levels are always carried in dB, never as raw gain, for the same reason a
 * real desk is printed in dB: equal steps of a fader should sound like equal
 * steps of loudness, and a GM thinking "a bit quieter" means "a few dB".
 */

/** Anything at or below this is treated as silence (the fader's bottom stop). */
export const SILENCE_DB = -60;

/** The highest boost a GM bus fader can apply. The engine's limiter catches the peaks. */
export const MAX_BUS_DB = 6;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round = (n, places = 2) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** dB to linear gain. -Infinity (or anything at the silence floor) is exactly 0. */
export function dbToGain(db) {
  const n = Number(db);
  if (!Number.isFinite(n)) return n === Infinity ? Infinity : 0;
  if (n <= SILENCE_DB) return 0;
  return 10 ** (n / 20);
}

/** Linear gain to dB. Zero or negative gain is -Infinity rather than NaN. */
export function gainToDb(gain) {
  const n = Number(gain);
  if (!(n > 0)) return -Infinity;
  return 20 * Math.log10(n);
}

/**
 * A console fader's printed scale, as (cap position, dB) pairs from the bottom
 * stop to the top. Not linear in either unit: most of the travel is spent in
 * the -20..+3 range where a GM actually works, exactly like the real thing.
 * Unity gain (0 dB) sits at 78% of the travel, leaving room above it to push.
 */
export const FADER_SCALE = Object.freeze([
  [0, -Infinity],
  [0.05, SILENCE_DB],
  [0.15, -40],
  [0.25, -30],
  [0.4, -20],
  [0.55, -10],
  [0.66, -5],
  [0.78, 0],
  [0.89, 3],
  [1, MAX_BUS_DB]
]);

/** The dB a fader cap at `position` (0 = bottom stop, 1 = top) produces. */
export function faderToDb(position) {
  const p = clamp(Number(position) || 0, 0, 1);
  if (p <= 0) return -Infinity;
  for (let i = 1; i < FADER_SCALE.length; i++) {
    const [p1, d1] = FADER_SCALE[i];
    if (p <= p1) {
      const [p0, d0Raw] = FADER_SCALE[i - 1];
      // The bottom segment ramps up out of silence rather than from -Infinity,
      // which cannot be interpolated.
      const d0 = Number.isFinite(d0Raw) ? d0Raw : SILENCE_DB - 30;
      const t = (p - p0) / (p1 - p0);
      return round(d0 + t * (d1 - d0));
    }
  }
  return MAX_BUS_DB;
}

/** Where a fader cap sits for a given level — the exact inverse of faderToDb within the scale. */
export function dbToFader(db) {
  const d = Number(db);
  if (!Number.isFinite(d)) return d === Infinity ? 1 : 0;
  if (d >= MAX_BUS_DB) return 1;
  if (d <= SILENCE_DB - 30) return 0;
  for (let i = 1; i < FADER_SCALE.length; i++) {
    const [p1, d1] = FADER_SCALE[i];
    if (d <= d1) {
      const [p0, d0Raw] = FADER_SCALE[i - 1];
      const d0 = Number.isFinite(d0Raw) ? d0Raw : SILENCE_DB - 30;
      const t = (d - d0) / (d1 - d0);
      return round(p0 + t * (p1 - p0), 4);
    }
  }
  return 1;
}

/**
 * Foundry's own volume-slider law (client/audio/helper.mjs#inputToVolume):
 * slider position to gain is `position ** 1.5`. A player's personal knobs
 * write Foundry's own core settings, so they must use Foundry's curve rather
 * than the desk's — otherwise the same setting would read differently in the
 * native Playlists sidebar and on the Radio.
 */
export function foundrySliderToVolume(position, order = 1.5) {
  return clamp(Number(position) || 0, 0, 1) ** order;
}

/** Inverse of foundrySliderToVolume, matching helper.mjs#volumeToInput. */
export function volumeToFoundrySlider(volume, order = 1.5) {
  return clamp(Number(volume) || 0, 0, 1) ** (1 / order);
}

/* -------------------------------------------- */
/*  Metering                                    */
/* -------------------------------------------- */

/** Digital-broadcast convention: 0 VU reads -18 dBFS. A normalised music bed sits right on it. */
export const VU_REFERENCE_DBFS = -18;

/**
 * RMS and peak level of one block of time-domain samples, in dBFS — what an
 * AnalyserNode#getFloatTimeDomainData buffer turns into on the meter.
 * An empty or silent block reads -Infinity for both, never NaN.
 */
export function levelFromSamples(samples) {
  const n = samples?.length ?? 0;
  if (!n) return { rmsDb: -Infinity, peakDb: -Infinity };
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    sum += s * s;
    const a = s < 0 ? -s : s;
    if (a > peak) peak = a;
  }
  return { rmsDb: gainToDb(Math.sqrt(sum / n)), peakDb: gainToDb(peak) };
}

/**
 * One step of a needle's ballistics: move from where it was toward the new
 * reading with a time constant, in dB. A real VU reaches 99% in 300ms, which
 * is a time constant of about 65ms. -Infinity is handled by chasing the
 * silence floor instead, so a needle falls smoothly rather than snapping.
 */
export function vuStep(previousDb, targetDb, dtMs, { riseMs = 65, fallMs = 90 } = {}) {
  const floor = SILENCE_DB - 10;
  const prev = Number.isFinite(previousDb) ? previousDb : floor;
  const target = Number.isFinite(targetDb) ? Math.max(targetDb, floor) : floor;
  const tau = target > prev ? riseMs : fallMs;
  const dt = Math.max(0, Number(dtMs) || 0);
  if (tau <= 0) return target;
  const k = 1 - Math.exp(-dt / tau);
  return prev + (target - prev) * k;
}

/** A dBFS level expressed in VU against the digital reference level. */
export function dbfsToVu(dbfs, referenceDbfs = VU_REFERENCE_DBFS) {
  return Number.isFinite(dbfs) ? dbfs - referenceDbfs : -Infinity;
}

/**
 * The peak lamp's hold: a new peak lights it immediately, and it only lets go
 * once `holdMs` has passed with nothing louder. Returns the next hold state.
 */
export function peakHold(state, peakDb, nowMs, holdMs = 1200) {
  const held = state && Number.isFinite(state.db) ? state : { db: -Infinity, at: -Infinity };
  if (Number.isFinite(peakDb) && (peakDb >= held.db || nowMs - held.at > holdMs)) {
    return { db: peakDb, at: nowMs };
  }
  if (nowMs - held.at > holdMs) return { db: -Infinity, at: nowMs };
  return held;
}

/* -------------------------------------------- */
/*  The GM's buses                              */
/* -------------------------------------------- */

/**
 * The three buses a GM rides. `music` and `ambience` are faders on the beds;
 * `stings` is the level fire-once hits play at. Each maps onto Foundry's own
 * audio contexts in foundry/audio-engine.mjs — music bus on the music context,
 * ambience bus on the environment context.
 */
export const BUSES = Object.freeze(["music", "ambience", "stings"]);

export const DEFAULT_MIX = Object.freeze({
  music: 0,
  ambience: 0,
  stings: 0,
  muted: Object.freeze({ music: false, ambience: false, stings: false }),
  duckDb: -8
});

/**
 * Clean a stored or incoming mix into a complete, in-range one. A world
 * setting can hold anything an older build or a hand-edit wrote, so every
 * reader goes through this rather than trusting the stored shape.
 */
export function normaliseMix(input) {
  const src = input && typeof input === "object" ? input : {};
  const level = (v, fallback) => {
    const n = Number(v);
    if (n === -Infinity) return -Infinity;
    return Number.isFinite(n) ? round(clamp(n, SILENCE_DB, MAX_BUS_DB)) : fallback;
  };
  const muted = src.muted && typeof src.muted === "object" ? src.muted : {};
  return {
    music: level(src.music, DEFAULT_MIX.music),
    ambience: level(src.ambience, DEFAULT_MIX.ambience),
    stings: level(src.stings, DEFAULT_MIX.stings),
    muted: {
      music: muted.music === true,
      ambience: muted.ambience === true,
      stings: muted.stings === true
    },
    duckDb: round(clamp(Number.isFinite(Number(src.duckDb)) ? Number(src.duckDb) : DEFAULT_MIX.duckDb, -30, 0))
  };
}

/** The linear gain a bus node should hold for a given mix. A muted bus is exactly silent. */
export function busGain(mix, bus) {
  const m = normaliseMix(mix);
  if (!BUSES.includes(bus)) throw new Error(`Unknown bus "${bus}"`);
  if (m.muted[bus]) return 0;
  return dbToGain(m[bus]);
}

/**
 * Apply a partial change to a mix, e.g. one fader moving. Unknown keys are
 * dropped rather than stored, so a typo in a cue can never grow the setting.
 */
export function withMixChange(mix, change) {
  const base = normaliseMix(mix);
  const c = change && typeof change === "object" ? change : {};
  const next = { ...base, muted: { ...base.muted } };
  for (const bus of BUSES) {
    if (bus in c) next[bus] = c[bus];
    if (c.muted && typeof c.muted === "object" && bus in c.muted) next.muted[bus] = c.muted[bus] === true;
  }
  if ("duckDb" in c) next.duckDb = c.duckDb;
  return normaliseMix(next);
}

/* -------------------------------------------- */
/*  Ducking                                     */
/* -------------------------------------------- */

/**
 * The gain automation for one duck: down over `attackMs`, held for `holdMs`,
 * back up over `releaseMs`. Points are in ms from the moment the sting starts,
 * in dB relative to the bus. A depth of 0 (or a positive one, which would be
 * a boost, not a duck) produces no automation at all.
 */
export function duckEnvelope({ depthDb = DEFAULT_MIX.duckDb, attackMs = 120, holdMs = 0, releaseMs = 900 } = {}) {
  const depth = Number(depthDb);
  if (!(depth < 0)) return [];
  const a = Math.max(0, Number(attackMs) || 0);
  const h = Math.max(0, Number(holdMs) || 0);
  const r = Math.max(0, Number(releaseMs) || 0);
  return [
    { atMs: 0, db: 0 },
    { atMs: a, db: depth },
    { atMs: a + h, db: depth },
    { atMs: a + h + r, db: 0 }
  ];
}

/**
 * How long to hold the beds down for a sting of a given length.
 *
 * Not simply "as long as the sting": a war horn runs ten seconds, nine of
 * which are its tail ringing away to nothing, and holding the music down
 * through all of it reads as a fault rather than an effect (heard live,
 * 2026-09-17). Hold through the hit, then let the music back up underneath
 * the tail, which is what a broadcast desk does.
 */
export function duckHoldMs(durationSec, { minMs = 400, maxMs = 2500 } = {}) {
  const ms = (Number(durationSec) || 0) * 1000;
  return Math.min(maxMs, Math.max(minMs, ms));
}

/**
 * When stings overlap, the beds must stay down until the LAST one ends and at
 * the DEEPEST depth any of them asked for — never bounce back up between two
 * hits a second apart. Each active duck is `{depthDb, untilMs}` (absolute
 * time the hold ends). Returns the combined state at `nowMs`, or null when
 * nothing is ducking any more.
 */
export function combineDucks(ducks, nowMs) {
  const live = (ducks ?? []).filter((d) => d && Number(d.untilMs) > nowMs && Number(d.depthDb) < 0);
  if (!live.length) return null;
  return {
    depthDb: Math.min(...live.map((d) => Number(d.depthDb))),
    untilMs: Math.max(...live.map((d) => Number(d.untilMs)))
  };
}

/* -------------------------------------------- */
/*  Fades                                       */
/* -------------------------------------------- */

/** The fade lengths a GM can pick on the desk's rotary, in ms. Also the vocabulary cues use. */
export const FADE_STEPS_MS = Object.freeze([0, 250, 500, 1000, 2000, 4000, 8000, 16000]);

/** Snap an arbitrary fade length to the nearest desk step (cues may say anything; the knob has detents). */
export function nearestFadeStep(ms) {
  const n = Math.max(0, Number(ms) || 0);
  let best = FADE_STEPS_MS[0];
  for (const step of FADE_STEPS_MS) if (Math.abs(step - n) < Math.abs(best - n)) best = step;
  return best;
}

/** Human label for a fade length on the desk: "cut", "0.5s", "2s", "16s". */
export function fadeLabel(ms) {
  const n = Math.max(0, Number(ms) || 0);
  if (n === 0) return "cut";
  const s = n / 1000;
  return `${Number.isInteger(s) ? s : round(s, 2)}s`;
}

/** Format a dB value the way a desk prints it: "+3.0", "0.0", "-12.5", "-∞". */
export function formatDb(db, places = 1) {
  const n = Number(db);
  if (!Number.isFinite(n)) return n > 0 ? "+∞" : "-∞";
  const fixed = Math.abs(n).toFixed(places);
  if (Number(fixed) === 0) return (0).toFixed(places);
  return `${n > 0 ? "+" : "-"}${fixed}`;
}
