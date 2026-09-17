/**
 * Parsers for what ffmpeg and ffprobe print. Pure: text or parsed JSON in,
 * plain objects out, no processes, no files. Every format here was captured
 * from real ffmpeg 9.0.1 output against real files in audio/in-tray/ before
 * this parser was written (see test/audio-pipeline/fixtures/).
 *
 * The loudness analysis is streamed line by line rather than collected into
 * one string: a long music track logs ten ebur128 frames a second, and a
 * library's worth of that should never have to sit in memory at once.
 */

/** ffmpeg prints this for a window with nothing in it yet (or pure silence). */
const EMPTY_WINDOW_LUFS = -120.7;

const num = (s) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/**
 * An accumulator for `ebur128=peak=true:framelog=info` output.
 *
 * Per-frame lines give the maximum momentary (400ms) and short-term (3s)
 * loudness, which the final summary does not print at all; the summary gives
 * integrated loudness, loudness range and true peak. Both are needed:
 * integrated loudness judges a long bed, the short-term maximum judges a hit.
 */
export function createEbur128Accumulator() {
  let maxM = null;
  let maxS = null;
  let frames = 0;
  let lastT = null;
  let inSummary = false;
  let section = null;
  const summary = { integratedLufs: null, integratedThresholdLufs: null, lraLu: null, lraLowLufs: null, lraHighLufs: null, truePeakDbtp: null };

  const frameRe = /\bt:\s*([\d.]+)\s+TARGET:\S+\s+LUFS\s+M:\s*(-?[\d.]+)\s+S:\s*(-?[\d.]+)/;

  return {
    push(line) {
      const text = String(line);
      const frame = text.match(frameRe);
      if (frame) {
        frames += 1;
        // The last frame's timestamp is how much audio actually DECODED, which
        // is not always what the container claims: one real MP3 in this library
        // declares 358s and contains 89s (found 2026-09-17).
        lastT = num(frame[1]);
        const m = num(frame[2]);
        const s = num(frame[3]);
        if (m !== null && m > EMPTY_WINDOW_LUFS && (maxM === null || m > maxM)) maxM = m;
        if (s !== null && s > EMPTY_WINDOW_LUFS && (maxS === null || s > maxS)) maxS = s;
        return;
      }
      if (/\bSummary:\s*$/.test(text)) {
        inSummary = true;
        section = null;
        return;
      }
      if (!inSummary) return;
      if (/Integrated loudness:/.test(text)) section = "integrated";
      else if (/Loudness range:/.test(text)) section = "range";
      else if (/True peak:/.test(text)) section = "peak";
      else if (/Sample peak:/.test(text)) section = "sample-peak";

      const kv = text.match(/^\s*(I|Threshold|LRA|LRA low|LRA high|Peak):\s*(-?[\d.]+|-inf|inf)\s*(LUFS|LU|dBFS)?\s*$/);
      if (!kv) return;
      const value = kv[2] === "-inf" ? -Infinity : kv[2] === "inf" ? Infinity : num(kv[2]);
      if (section === "integrated") {
        if (kv[1] === "I") summary.integratedLufs = value;
        else if (kv[1] === "Threshold") summary.integratedThresholdLufs = value;
      } else if (section === "range") {
        if (kv[1] === "LRA") summary.lraLu = value;
        else if (kv[1] === "LRA low") summary.lraLowLufs = value;
        else if (kv[1] === "LRA high") summary.lraHighLufs = value;
      } else if (section === "peak" && kv[1] === "Peak") {
        summary.truePeakDbtp = value;
      }
    },
    result() {
      // Each frame's timestamp is the END of its own 100ms window, so the last
      // one is the decoded length to within a frame.
      const decodedDurationSec = lastT === null ? null : Math.round((lastT + 0.1) * 1000) / 1000;
      return { ...summary, maxMomentaryLufs: maxM, maxShortTermLufs: maxS, frames, decodedDurationSec };
    }
  };
}

/** Convenience for tests and small inputs: the whole log at once. */
export function parseEbur128Log(text) {
  const acc = createEbur128Accumulator();
  for (const line of String(text).split(/\r?\n/)) acc.push(line);
  return acc.result();
}

/**
 * An accumulator for `silencedetect` output. Reports silence at the very start
 * and very end — what matters for a sting that must hit the instant it's fired
 * and a bed whose tail should not leave a gap before the next track.
 */
export function createSilenceAccumulator() {
  const spans = [];
  let open = null;
  return {
    push(line) {
      const text = String(line);
      const start = text.match(/silence_start:\s*(-?[\d.]+)/);
      if (start) {
        open = Math.max(0, Number(start[1]));
        return;
      }
      const end = text.match(/silence_end:\s*(-?[\d.]+)/);
      if (end && open !== null) {
        spans.push({ start: open, end: Number(end[1]) });
        open = null;
      }
    },
    /** `durationSec` closes a silence that ran to the end of the file without an explicit end line. */
    result(durationSec) {
      const all = [...spans];
      if (open !== null && Number.isFinite(durationSec)) all.push({ start: open, end: durationSec });
      const eps = 0.05;
      const leading = all.find((s) => s.start <= eps);
      const trailing = Number.isFinite(durationSec) ? all.find((s) => Math.abs(s.end - durationSec) <= Math.max(eps, durationSec * 0.002)) : null;
      const round3 = (n) => Math.round(n * 1000) / 1000;
      return {
        leadingSilenceSec: leading ? round3(leading.end - leading.start) : 0,
        trailingSilenceSec: trailing && trailing !== leading ? round3(trailing.end - trailing.start) : 0,
        silentThroughout: !!(leading && Number.isFinite(durationSec) && leading.end >= durationSec - eps),
        spans: all.map((s) => ({ start: round3(s.start), end: round3(s.end) }))
      };
    }
  };
}

const TAG_KEYS = ["title", "artist", "album", "album_artist", "genre", "comment", "description", "copyright", "encoded_by", "date"];

/**
 * The parts of `ffprobe -show_format -show_streams -print_format json` the
 * pipeline uses. Tag keys are matched case-insensitively (MP3 ID3 and WAV
 * BEXT/INFO disagree on case) and empty values are dropped.
 */
export function parseProbe(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  const stream = (data?.streams ?? []).find((s) => s.codec_type === "audio");
  if (!stream) throw new Error("ffprobe found no audio stream");
  const format = data.format ?? {};
  const rawTags = { ...(format.tags ?? {}), ...(stream.tags ?? {}) };
  const tags = {};
  for (const [k, v] of Object.entries(rawTags)) {
    const key = k.toLowerCase();
    if (!TAG_KEYS.includes(key)) continue;
    const value = String(v ?? "").trim();
    if (value && !(key in tags)) tags[key] = value;
  }
  const duration = num(stream.duration) ?? num(format.duration);
  return {
    container: String(format.format_name ?? "").split(",")[0] || null,
    codec: stream.codec_name ?? null,
    sampleRate: num(stream.sample_rate),
    channels: num(stream.channels),
    bitsPerSample: num(stream.bits_per_raw_sample) ?? (num(stream.bits_per_sample) || null),
    bitRate: num(stream.bit_rate) ?? num(format.bit_rate),
    durationSec: duration === null ? null : Math.round(duration * 1000) / 1000,
    lossless: /^(pcm_|flac|alac|wavpack)/.test(String(stream.codec_name ?? "")),
    tags
  };
}

/** The version line ffmpeg prints, e.g. "9.0.1-essentials_build-www.gyan.dev". */
export function parseFfmpegVersion(text) {
  const m = String(text).match(/ffmpeg version (\S+)/);
  return m ? m[1] : null;
}
