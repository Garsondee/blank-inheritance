/**
 * "Verified as usable" — the pipeline's own definition, made explicit so it
 * can be tested rather than remembered. Pure: the adapter gathers the facts
 * (does the file exist, what does it hash to, did a strict decode complain)
 * and this decides what they mean.
 *
 * FAIL means a player would hear something wrong or nothing at all.
 * WARN means it plays, but a human should look before relying on it.
 */

import { TRUE_PEAK_CEILING_DBTP } from "../../../module/blank-inheritance/scripts/core/audio-library.mjs";

/**
 * How long the processed file should be: the source, minus any trim, minus the
 * loop crossfade it folded back.
 *
 * Measured against what actually DECODED, not what the container claims. One
 * real MP3 in this library declares 358 seconds and holds 89 (a truncated or
 * mis-tagged file); trusting its header would have reported the correct output
 * as broken, and hidden the fact that the source is the broken thing.
 */
export function expectedDurationSec(entry) {
  const decoded = Number(entry?.analysis?.decodedDurationSec);
  const declared = Number(entry?.source?.durationSec);
  const src = Number.isFinite(decoded) ? decoded : declared;
  if (!Number.isFinite(src)) return null;
  const trim = entry?.encode?.trim;
  let d = trim ? Math.min(trim.endSec, src) - trim.startSec : src;
  if (entry?.encode?.loop?.crossfadeSec) d -= entry.encode.loop.crossfadeSec;
  return Math.round(d * 1000) / 1000;
}

/**
 * How far off that length may be. A lossy source decodes to a whole number of
 * codec frames and its own header rounds, so an MP3 gets more room than a WAV.
 */
export function durationToleranceSec(entry) {
  return entry?.source?.codec && !/^(pcm_|flac|alac)/.test(entry.source.codec) ? 0.45 : 0.25;
}

const measuredFor = (basis, output) =>
  basis === "integrated" ? output?.integratedLufs : basis === "short-term" ? output?.maxShortTermLufs : basis === "momentary" ? output?.maxMomentaryLufs : null;

export function verifyEntry({ entry, asset, exists, sha256, decode, toleranceLu = 1.0 }) {
  const problems = [];
  const warnings = [];
  const enc = entry?.encode;

  if (!enc) problems.push("never processed");
  else {
    if (!exists) problems.push(`processed file missing: audio/library/${enc.path}`);
    else if (sha256 !== enc.sha256) problems.push("processed file on disk does not match the hash recorded when it was built");
    if (decode && !decode.ok) problems.push(`strict decode failed: ${(decode.problems ?? []).slice(0, 2).join(" | ") || `exit ${decode.code}`}`);
    if (enc.kind && asset?.kind && enc.kind !== asset.kind) problems.push(`built as ${enc.kind} but reviewed as ${asset.kind} — reprocess`);

    const expected = expectedDurationSec(entry);
    const actual = Number(entry.output?.durationSec);
    if (expected !== null && Number.isFinite(actual) && Math.abs(actual - expected) > durationToleranceSec(entry)) {
      problems.push(`length ${actual.toFixed(2)}s, expected ${expected.toFixed(2)}s`);
    }

    // The source file lying about its own length is worth knowing — it usually
    // means a truncated download — but it is not a fault in what we built.
    const declared = Number(entry.source?.durationSec);
    const decoded = Number(entry.analysis?.decodedDurationSec);
    if (Number.isFinite(declared) && Number.isFinite(decoded) && Math.abs(declared - decoded) > 1) {
      warnings.push(`the source file's header claims ${declared.toFixed(0)}s but only ${decoded.toFixed(0)}s decodes — check the original download`);
    }

    const peak = Number(entry.output?.truePeakDbtp);
    if (Number.isFinite(peak) && peak > TRUE_PEAK_CEILING_DBTP + 0.5) problems.push(`true peak ${peak.toFixed(1)} dBTP is over the ${TRUE_PEAK_CEILING_DBTP} dBTP ceiling`);

    if (enc.basis) {
      const measured = measuredFor(enc.basis, entry.output);
      const expectedLufs = enc.targetLufs - (enc.shortfallDb || 0);
      if (Number.isFinite(measured) && Math.abs(measured - expectedLufs) > toleranceLu) {
        warnings.push(`${enc.basis} loudness ${measured.toFixed(1)} LUFS, target ${expectedLufs.toFixed(1)}`);
      }
    } else {
      warnings.push("too quiet to measure — check it is not silent");
    }
    if ((enc.shortfallDb || 0) > 0) warnings.push(`plays ${enc.shortfallDb.toFixed(1)} dB under target to keep its peaks intact`);
  }

  if (asset?.status === "proposed" && entry?.proposal?.confidence === "low") warnings.push(`unreviewed, and the classifier was unsure (${entry.proposal.kind})`);

  return { id: entry?.id, status: problems.length ? "fail" : warnings.length ? "warn" : "pass", problems, warnings };
}

export function summariseVerification(results) {
  const count = (s) => results.filter((r) => r.status === s).length;
  const lines = [`verify: ${count("pass")} pass, ${count("warn")} warn, ${count("fail")} FAIL, ${count("skipped")} skipped (rejected)`];
  for (const r of results.filter((x) => x.status === "fail")) lines.push(`  FAIL ${r.id}: ${r.problems.join("; ")}`);
  return lines.join("\n");
}
