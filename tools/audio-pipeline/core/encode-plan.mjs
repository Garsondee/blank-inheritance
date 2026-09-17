/**
 * How one asset gets turned into the file players actually download. Pure:
 * it builds the plan and the exact ffmpeg arguments, and never runs them.
 *
 * Every processed file is Ogg Opus at 48 kHz. That choice was checked with
 * Ingram rather than assumed (2026-09-17): every player uses current Chrome,
 * which Foundry itself requires, so the one format that is both the smallest
 * and loops without a gap is safe to use everywhere.
 *
 * What a plan can do to a file, in filter order:
 *   trim   — cut silence off the front of anything fired once, so a sting
 *            lands on the click rather than half a second after it.
 *   loop   — for a looping bed, fold the last few seconds back over the first
 *            with an equal-power crossfade, so the loop point is inaudible.
 *   format — resample to 48 kHz, downmix surround to stereo (voice to mono).
 *   gain   — the loudness normalisation from core/audio-library.mjs#planGain.
 *   limit  — a transparent lookahead limiter, only when the gain would push
 *            the true peak over the ceiling.
 */

import { AUDIO_KINDS, planGain } from "../../../module/blank-inheritance/scripts/core/audio-library.mjs";
import { createHash } from "node:crypto";

/**
 * Bump when the processing itself changes in a way that should rebuild files
 * already on disk. The plan hash includes it, so every output built under an
 * older version reads as stale.
 */
export const PIPELINE_VERSION = 1;

/** Bitrate (kbit/s) and channel ceiling per kind. Radio chatter is mono by nature and costs nothing in it. */
export const ENCODE_PROFILES = Object.freeze({
  music: Object.freeze({ bitrateK: 160, maxChannels: 2 }),
  ambience: Object.freeze({ bitrateK: 128, maxChannels: 2 }),
  sting: Object.freeze({ bitrateK: 160, maxChannels: 2 }),
  sfx: Object.freeze({ bitrateK: 128, maxChannels: 2 }),
  voice: Object.freeze({ bitrateK: 64, maxChannels: 1 }),
  interface: Object.freeze({ bitrateK: 96, maxChannels: 2 })
});

const round3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Re-encoding a lossy source at a higher bitrate than it arrived with buys
 * nothing but bytes, so a 128k MP3 stays at 128k. Lossless sources get the
 * full profile. A floor keeps very low-bitrate sources from being starved.
 */
export function bitrateFor(kind, probe) {
  const profile = ENCODE_PROFILES[kind];
  if (!profile) throw new Error(`No encode profile for kind "${kind}"`);
  if (probe?.lossless || !Number.isFinite(probe?.bitRate)) return profile.bitrateK;
  const sourceK = Math.round(probe.bitRate / 1000);
  return Math.max(Math.min(profile.bitrateK, sourceK), Math.min(64, profile.bitrateK));
}

/**
 * Silence to cut from a fire-once sound. Only the front is trimmed hard (a
 * late sting is a broken sting); the tail keeps a quarter second of room so a
 * reverb tail is never chopped. Beds are never trimmed — a music track's
 * opening breath is the composer's, not ours.
 */
export function trimFor(kind, analysis, durationSec) {
  if (!AUDIO_KINDS[kind]?.fireOnce || !Number.isFinite(durationSec)) return null;
  const lead = Number(analysis?.leadingSilenceSec) || 0;
  const trail = Number(analysis?.trailingSilenceSec) || 0;
  const start = lead > 0.05 ? Math.max(0, lead - 0.01) : 0;
  const end = trail > 0.5 ? durationSec - (trail - 0.25) : durationSec;
  if (start === 0 && end === durationSec) return null;
  if (end - start < 0.1) return null;
  return { startSec: round3(start), endSec: round3(end) };
}

/**
 * The crossfade length for a seamless loop: about 6% of the bed, between one
 * and four seconds. Too short and the seam is audible as a bump; too long and
 * a recording with a distinct event near its end smears it over the start.
 */
export function loopCrossfadeFor(kind, loop, durationSec) {
  if (!loop || !Number.isFinite(durationSec) || durationSec < 12) return null;
  if (kind !== "ambience" && kind !== "music") return null;
  const d = Math.min(4, Math.max(1, durationSec * 0.06));
  return { crossfadeSec: round3(d) };
}

/**
 * The full plan for one asset.
 *
 * @param {object} p
 * @param {object} p.asset     effective asset (core/audio-library.mjs#effectiveAsset): id, kind, loop
 * @param {object} p.probe     parseProbe() of the SOURCE
 * @param {object} p.analysis  loudness + silence analysis of the SOURCE
 * @param {number} [p.gainCorrectionDb] second-pass correction measured on a first encode
 */
export function planEncode({ asset, probe, analysis, gainCorrectionDb = 0 }) {
  const kind = asset?.kind;
  const profile = ENCODE_PROFILES[kind];
  if (!profile) throw new Error(`Cannot plan an encode for kind "${kind}" (asset ${asset?.id})`);
  const durationSec = Number(probe?.durationSec);
  const channels = Math.max(1, Math.min(profile.maxChannels, Number(probe?.channels) || profile.maxChannels));
  const gain = planGain({ kind, analysis, durationSec });
  const correction = Number(gainCorrectionDb) || 0;
  const trim = trimFor(kind, analysis, durationSec);
  const loop = loopCrossfadeFor(kind, asset.loop === true, trim ? trim.endSec - trim.startSec : durationSec);

  const plan = {
    version: PIPELINE_VERSION,
    id: asset.id,
    kind,
    outputRel: `${kind}/${asset.id}.ogg`,
    codec: "libopus",
    sampleRate: 48000,
    channels,
    bitrateK: bitrateFor(kind, probe),
    gainDb: Math.round((gain.gainDb + correction) * 10) / 10,
    limitDb: gain.limitDb,
    targetLufs: gain.targetLufs,
    measuredLufs: gain.measuredLufs,
    basis: gain.basis,
    shortfallDb: gain.shortfallDb,
    silent: gain.silent,
    trim,
    loop,
    gainCorrectionDb: Math.round(correction * 10) / 10
  };
  // Two fingerprints. `baseHash` ignores any second-pass correction, so a
  // later run can tell "the same plan as last time" apart from "a new plan"
  // and reuse the correction it already measured instead of re-deriving it
  // (which would re-encode every corrected file on every run, forever).
  plan.baseHash = planHash({ ...plan, gainDb: Math.round(gain.gainDb * 10) / 10, gainCorrectionDb: 0 });
  plan.hash = planHash(plan);
  return plan;
}

/** A stable fingerprint of everything that affects the output bytes. */
export function planHash(plan) {
  const { hash, baseHash, measuredLufs, basis, shortfallDb, silent, targetLufs, ...material } = plan;
  return createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 16);
}

const dbToLinear = (db) => 10 ** (db / 20);

/**
 * The ffmpeg command line for a plan. Returned as an argument ARRAY, never a
 * shell string — filenames here contain spaces, apostrophes and ampersands.
 */
export function ffmpegArgsFor(plan, inputPath, outputPath) {
  const chain = [];
  const layout = plan.channels === 1 ? "mono" : "stereo";

  const graph = [];
  let label = "[0:a]";
  if (plan.trim) {
    graph.push(`${label}atrim=start=${plan.trim.startSec}:end=${plan.trim.endSec},asetpts=PTS-STARTPTS,afade=t=in:d=0.005[trimmed]`);
    label = "[trimmed]";
  }
  if (plan.loop) {
    const f = plan.loop.crossfadeSec;
    graph.push(`${label}asplit=2[lp_a][lp_b]`);
    graph.push(`[lp_a]atrim=start=${f},asetpts=PTS-STARTPTS[lp_body]`);
    graph.push(`[lp_b]atrim=end=${f},asetpts=PTS-STARTPTS[lp_head]`);
    graph.push(`[lp_body][lp_head]acrossfade=d=${f}:c1=qsin:c2=qsin[looped]`);
    label = "[looped]";
  }
  // ffmpeg's own swr resampler, deliberately, not soxr: the Windows
  // "essentials" build this project installs has no libsoxr at all (it fails
  // with "Requested resampling engine is unavailable" — found live
  // 2026-09-17), and a plan that depended on which build ran it would produce
  // different bytes, and different hashes, on different machines. swr's
  // default windowed-sinc is transparent for 96k/44.1k -> 48k game audio.
  chain.push(`aresample=48000`);
  chain.push(`aformat=sample_fmts=flt:channel_layouts=${layout}`);
  if (plan.gainDb !== 0) chain.push(`volume=${plan.gainDb}dB`);
  if (plan.limitDb !== null && plan.limitDb !== undefined) {
    // Half a dB of margin under the ceiling: the limiter catches sample peaks,
    // and Opus decoding can add a little inter-sample overshoot on top.
    const limit = Math.max(0.0625, Math.min(1, dbToLinear(plan.limitDb - 0.5)));
    chain.push(`alimiter=limit=${limit.toFixed(4)}:attack=5:release=60:level=false:latency=true`);
  }
  if (plan.trim && AUDIO_KINDS[plan.kind]?.fireOnce) {
    const len = plan.trim.endSec - plan.trim.startSec;
    if (len > 0.1) chain.push(`afade=t=out:st=${round3(Math.max(0, len - 0.02))}:d=0.02`);
  }
  graph.push(`${label}${chain.join(",")}[out]`);

  return [
    "-hide_banner",
    "-nostats",
    "-y",
    "-i",
    inputPath,
    "-filter_complex",
    graph.join(";"),
    "-map",
    "[out]",
    "-map_metadata",
    "-1",
    "-c:a",
    "libopus",
    "-b:a",
    `${plan.bitrateK}k`,
    "-vbr",
    "on",
    "-compression_level",
    "10",
    "-application",
    "audio",
    "-f",
    "ogg",
    outputPath
  ];
}

/** Analysis arguments: loudness (EBU R128 with true peak) and silence, in one pass. */
export function analysisArgsFor(inputPath) {
  return [
    "-hide_banner",
    "-nostats",
    "-i",
    inputPath,
    "-map",
    "0:a:0",
    "-af",
    "ebur128=peak=true:framelog=info,silencedetect=noise=-50dB:duration=0.25",
    "-f",
    "null",
    "-"
  ];
}

/**
 * Whether a first encode landed close enough to target. If not, the size of
 * the correction for a second pass — surround downmixing is the usual cause,
 * since R128 weights the rear channels differently from the stereo result.
 * A planned shortfall is not a miss: it was deliberate.
 */
export function secondPassCorrection(plan, outputLoudness, toleranceLu = 0.8) {
  if (plan.silent || !plan.basis) return 0;
  const measured =
    plan.basis === "integrated" ? outputLoudness?.integratedLufs : plan.basis === "short-term" ? outputLoudness?.maxShortTermLufs : outputLoudness?.maxMomentaryLufs;
  if (!Number.isFinite(measured)) return 0;
  const expected = plan.targetLufs - (plan.shortfallDb || 0);
  const miss = expected - measured;
  if (Math.abs(miss) <= toleranceLu) return 0;
  // Never correct upward into a limiter that is already doing work.
  if (miss > 0 && plan.limitDb !== null && (plan.shortfallDb || 0) > 0) return 0;
  return Math.round(miss * 10) / 10;
}
