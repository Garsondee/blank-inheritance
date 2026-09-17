/**
 * The only file in the audio pipeline allowed to start ffmpeg or ffprobe.
 *
 * Arguments always travel as an ARRAY to `spawn` (never through a shell):
 * the source library is full of spaces, apostrophes, ampersands and one
 * `#` in a filename, and a quoting bug here would silently process the
 * wrong file. stderr is read line by line into the parsers in
 * core/ffmpeg-parse.mjs rather than buffered whole.
 */

import { spawn, execFile } from "node:child_process";
import { existsSync, readdirSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { createEbur128Accumulator, createSilenceAccumulator, parseFfmpegVersion, parseProbe } from "../core/ffmpeg-parse.mjs";
import { analysisArgsFor, ffmpegArgsFor } from "../core/encode-plan.mjs";

const execFileAsync = promisify(execFile);
const EXE = process.platform === "win32" ? ".exe" : "";

/**
 * Where ffmpeg lives, in order of preference: an explicit BI_FFMPEG_DIR,
 * the user-level tools folder the 2026-09-17 install went into, then PATH.
 * Throws with install instructions rather than a bare ENOENT.
 */
export async function locateFfmpeg() {
  const candidates = [];
  if (process.env.BI_FFMPEG_DIR) candidates.push(process.env.BI_FFMPEG_DIR);
  const toolsDir = path.join(homedir(), "tools");
  if (existsSync(toolsDir)) {
    for (const entry of readdirSync(toolsDir).sort().reverse()) {
      if (/^ffmpeg/i.test(entry)) candidates.push(path.join(toolsDir, entry, "bin"));
    }
  }
  for (const dir of candidates) {
    const ffmpeg = path.join(dir, `ffmpeg${EXE}`);
    const ffprobe = path.join(dir, `ffprobe${EXE}`);
    if (existsSync(ffmpeg) && existsSync(ffprobe)) return withVersion({ ffmpeg, ffprobe });
  }
  try {
    return await withVersion({ ffmpeg: `ffmpeg${EXE}`, ffprobe: `ffprobe${EXE}` });
  } catch {
    throw new Error(
      "ffmpeg was not found. Install a full build (https://www.gyan.dev/ffmpeg/builds/ — the 'essentials' zip) and either unzip it under " +
        `${toolsDir} or set BI_FFMPEG_DIR to its bin/ folder. See tools/audio-pipeline/README.md.`
    );
  }
}

async function withVersion(tools) {
  const { stdout } = await execFileAsync(tools.ffmpeg, ["-hide_banner", "-version"], { windowsHide: true });
  const version = parseFfmpegVersion(stdout);
  if (!version) throw new Error(`Could not read a version from ${tools.ffmpeg}`);
  const { stdout: encoders } = await execFileAsync(tools.ffmpeg, ["-hide_banner", "-encoders"], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (!/\blibopus\b/.test(encoders)) {
    throw new Error(`${tools.ffmpeg} (${version}) has no libopus encoder — it is a stripped build (Playwright ships one like this). Use a full build.`);
  }
  return { ...tools, version };
}

/** Run a process, feeding each stderr line to `onLine`. Resolves with the exit code and the last lines of stderr. */
export function runLines(bin, args, { onLine = () => {}, tailLines = 25 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    const tail = [];
    let buffer = "";
    const emit = (line) => {
      onLine(line);
      tail.push(line);
      if (tail.length > tailLines) tail.shift();
    };
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.search(/\r?\n/)) >= 0) {
        emit(buffer.slice(0, idx));
        buffer = buffer.slice(buffer[idx] === "\r" ? idx + 2 : idx + 1);
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (buffer) emit(buffer);
      resolve({ code, tail });
    });
  });
}

export async function probeFile(tools, file) {
  const { stdout } = await execFileAsync(tools.ffprobe, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], {
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024
  });
  return parseProbe(stdout);
}

/** Loudness and silence for one file, in a single decoding pass. */
export async function analyseFile(tools, file, durationSec) {
  const loud = createEbur128Accumulator();
  const silence = createSilenceAccumulator();
  const { code, tail } = await runLines(tools.ffmpeg, analysisArgsFor(file), {
    onLine(line) {
      loud.push(line);
      silence.push(line);
    }
  });
  if (code !== 0) throw new Error(`ffmpeg analysis failed (exit ${code}) for ${file}:\n${tail.join("\n")}`);
  const result = { ...loud.result(), ...silence.result(durationSec) };
  delete result.spans;
  return result;
}

/**
 * Encode one plan to its output path. Writes to a temporary `.part` file and
 * renames it into place only after ffmpeg exits cleanly, so an interrupted
 * run can never leave a truncated file that looks finished.
 */
export async function encodeFile(tools, plan, inputPath, outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const partial = `${outputPath}.part`;
  const args = ffmpegArgsFor(plan, inputPath, partial);
  const { code, tail } = await runLines(tools.ffmpeg, args);
  if (code !== 0) {
    rmSync(partial, { force: true });
    throw new Error(`ffmpeg encode failed (exit ${code}) for ${plan.id}:\n${tail.join("\n")}`);
  }
  renameSync(partial, outputPath);
}

/**
 * A full decode of a processed file with ffmpeg's strictest error reporting.
 * Anything at all on stderr is a failure: a file that decodes "with warnings"
 * is a file a player's browser may refuse.
 */
export async function decodeCheck(tools, file) {
  const problems = [];
  const { code } = await runLines(tools.ffmpeg, ["-hide_banner", "-nostats", "-v", "error", "-i", file, "-f", "null", "-"], {
    onLine(line) {
      if (line.trim()) problems.push(line.trim());
    }
  });
  return { ok: code === 0 && problems.length === 0, code, problems };
}
