/**
 * The pure half of the auto-sync watcher (autosync.mjs): which file changes
 * matter, when a burst of them has settled enough to push, what to do after a
 * failure, and how the daemon describes itself. No filesystem, no network, no
 * clock of its own -- every function takes `now` -- so all of it is tested
 * offline (test/module-sync/autosync-plan.test.mjs), the same core/adapter
 * split as the rest of this directory.
 *
 * WHY, 2026-10-07. Ingram: "I ALWAYS want changes in the local folders to be
 * reflected in the remote server automatically and every time. I don't want to
 * deploy things to the remote server, I want that to be automatically assumed."
 * Until then `npm run deploy` was a step someone had to remember, and the
 * session-start line only nagged about it. The watcher runs the SAME verified
 * deploy (preflight, scene-edits guard, checksums on both sides, build stamp)
 * whenever the tree has changed and then been quiet for a while. It adds no
 * new way of sending files, so everything deploy.mjs refuses, it still refuses.
 *
 * The decision "is a deploy needed" is never "an event happened". Events only
 * wake the timer. The daemon then compares file HASHES with what was last
 * deployed (deploy-status.mjs), so a deploy's own writes (staged art, the
 * scene-edits merge) and an editor's save-without-change can never start a
 * loop.
 */

import { SYNCED_CAMPAIGN_DIRS, SYNCED_MAP_FILES } from "./stage-campaign-data.mjs";

/**
 * Directories the daemon watches, relative to the repo root. Anything under
 * them is then filtered by classifyPath: a watch root is a place to listen, not
 * a promise that everything in it ships.
 */
export const WATCH_ROOTS = Object.freeze([
  "module/blank-inheritance",
  "module/stagecraft",
  "data",
  "canon",
  "artwork/title-sequences/opening/renders",
  "artwork/title-sequences/episode-titles",
  "audio/library"
]);

/** Editor droppings, VCS internals and our own state: never a reason to push. */
const NOISE = [
  /(^|\/)node_modules\//,
  /(^|\/)\.git(\/|$)/,
  /(^|\/)\.autosync(\/|$)/,
  /~$/,
  /(^|\/)~\$/,
  /(^|\/)\.#/,
  /\.(tmp|swp|swx|crdownload|part|bak)$/i,
  /(^|\/)\.DS_Store$/,
  /(^|\/)Thumbs\.db$/i
];

const MODULE = "module/blank-inheritance/";
const STAGECRAFT = "module/stagecraft/";
const STAGECRAFT_SHIPPED = /^(scripts\/|dist\/stagecraft\.js$|lang\/|styles\/|module\.json$|LICENSE$)/;
const VIDEO_DIRS = ["artwork/title-sequences/opening/renders/", "artwork/title-sequences/episode-titles/"];

/**
 * What a changed path means for syncing, or null when it is none of our
 * business. `lane` is the queue it belongs to (the verified deploy, or the
 * audio upload); `kind` says which prepare steps and deploy flags it implies:
 *
 *   module / data / video / stagecraft   a channel of deploy.mjs
 *   registry   data/campaign/asset-registry.json -- the art step must run
 *   canon      canon/ -- `story build` must copy it into data/ first
 *   audio      the processed audio library
 */
export function classifyPath(input) {
  const rel = String(input ?? "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "");
  if (!rel || NOISE.some((re) => re.test(rel))) return null;

  if (rel.startsWith(MODULE)) {
    const inner = rel.slice(MODULE.length);
    // storage/ is Foundry's own write channel; data/campaign/ is the data channel's (see deploy.mjs's isLocalOnlyModulePath).
    if (/^(storage|data\/campaign)(\/|$)/.test(inner)) return null;
    return { lane: "deploy", kind: "module" };
  }
  if (rel.startsWith(STAGECRAFT)) {
    return STAGECRAFT_SHIPPED.test(rel.slice(STAGECRAFT.length)) ? { lane: "deploy", kind: "stagecraft" } : null;
  }
  if (rel.startsWith("data/")) {
    const [first, second, ...more] = rel.slice("data/".length).split("/");
    if (first === "campaign" && second === "build.json") return null; // the stamp is written on the server by deploy
    if (first === "campaign" && second === "asset-registry.json" && !more.length) return { lane: "deploy", kind: "registry" };
    if (SYNCED_CAMPAIGN_DIRS.includes(first)) return { lane: "deploy", kind: "data" };
    if (first === "map" && second && !more.length && SYNCED_MAP_FILES.includes(second)) return { lane: "deploy", kind: "data" };
    return null;
  }
  if (rel.startsWith("canon/")) return /\.(json|md)$/i.test(rel) ? { lane: "deploy", kind: "canon" } : null;
  if (VIDEO_DIRS.some((d) => rel.startsWith(d))) return /\.mp4$/i.test(rel) ? { lane: "deploy", kind: "video" } : null;
  if (rel.startsWith("audio/library/")) return { lane: "audio", kind: "audio" };
  return null;
}

/**
 * The kinds implied by a deploy-status comparison (`channel:path` strings), so
 * the startup and safety-net checks pick the same flags a live edit would.
 */
export function kindsFromDiff(diff) {
  const kinds = new Set();
  for (const entry of [...(diff?.changed ?? []), ...(diff?.added ?? []), ...(diff?.removed ?? [])]) {
    const colon = entry.indexOf(":");
    const channel = entry.slice(0, colon);
    const file = entry.slice(colon + 1);
    if (channel === "data" && file === "campaign/asset-registry.json") kinds.add("registry");
    if (["module", "data", "video", "stagecraft"].includes(channel)) kinds.add(channel);
  }
  return kinds;
}

/**
 * deploy.mjs flags for this set of kinds. Never --prune: deleting server files
 * is a deliberate act (README, "Known limitations"). The art step takes
 * minutes and the video channel hashes hundreds of megabytes, so each runs only
 * when something it reads has changed; the deploy record carries the skipped
 * channel forward (writeDeployRecord), so skipping never loses track of it.
 */
export function deployFlags(kinds) {
  const flags = [];
  if (!kinds.has("video")) flags.push("--no-video");
  if (!kinds.has("registry")) flags.push("--no-art");
  return flags;
}

/**
 * Does a watcher event mean the file really changed? Found live on 2026-10-07:
 * with NTFS last-access updates on (the Windows default here), merely READING a
 * file -- which is all the daemon's own hashing does -- is reported as a change,
 * so the watcher woke itself. An event counts only when the file's size or
 * modified time differs from what was last seen. `signatureOf(rel)` is the
 * adapter's stat: "dir" for a directory, null when the path does not exist, else
 * a string that changes whenever size or mtime does.
 */
export function createChangeFilter(signatureOf) {
  const seen = new Map();
  return {
    /** Record a file as it is now, without calling it a change (the startup scan). */
    know(rel) {
      const signature = signatureOf(rel);
      if (signature && signature !== "dir") seen.set(rel, signature);
    },
    /** True when the event reflects a real write, creation or deletion. */
    changed(rel) {
      const signature = signatureOf(rel);
      const before = seen.get(rel);
      if (signature === "dir") return false; // a directory's own change is always its children's, which report themselves
      if (signature === null) {
        seen.delete(rel);
        return before !== undefined; // a file we knew has gone; a temp file that came and went is nothing
      }
      seen.set(rel, signature);
      return signature !== before;
    }
  };
}

export const DEFAULT_TIMING = Object.freeze({
  /** how long the tree must be still before a deploy starts */
  quietMs: 30_000,
  /** audio is written in long bursts by ffmpeg: wait longer */
  audioQuietMs: 60_000,
  /** shortest gap between two deploys: the module re-syncs the world after each one, which interrupts a table in play */
  minGapMs: 120_000,
  /** retry delays after consecutive failures (a refused module, a dropped connection); the last repeats */
  retryMs: Object.freeze([30_000, 60_000, 120_000, 300_000, 600_000])
});

const LANE_NAMES = ["deploy", "audio"];

function newLane() {
  return { kinds: new Set(), dirty: false, lastEventAt: 0, lastStartAt: null, running: false, failures: 0, retryAt: null, taken: null };
}

/**
 * The debounce / backoff state machine. Two lanes -- "deploy" and "audio" --
 * run one at a time by the daemon, deploy first.
 */
export function createScheduler(timing = DEFAULT_TIMING) {
  const lanes = Object.fromEntries(LANE_NAMES.map((n) => [n, newLane()]));
  const quietFor = (name) => (name === "audio" ? timing.audioQuietMs : timing.quietMs);
  const readyAt = (name) => {
    const lane = lanes[name];
    const gap = name === "deploy" && lane.lastStartAt != null ? lane.lastStartAt + timing.minGapMs : 0;
    return Math.max(lane.lastEventAt + quietFor(name), lane.retryAt ?? 0, gap);
  };

  return {
    /** A file changed. A new edit also cancels any backoff: the person may just have fixed what was refused. */
    noteEvent(name, kind, now) {
      const lane = lanes[name];
      lane.kinds.add(kind);
      lane.dirty = true;
      lane.lastEventAt = now;
      lane.retryAt = null;
    },
    /** A comparison (startup, the safety-net poll) found the server behind. Does not push an already-open quiet window later. */
    markStale(name, kinds, now) {
      const lane = lanes[name];
      for (const k of kinds) lane.kinds.add(k);
      if (!lane.dirty) lane.lastEventAt = now;
      lane.dirty = true;
    },
    /** Which lane may start now, or when to look again. `paused` holds everything and keeps it pending. */
    next(now, { paused = false } = {}) {
      if (paused) return { run: null, wakeAt: null };
      let wakeAt = null;
      for (const name of LANE_NAMES) {
        const lane = lanes[name];
        if (lane.running || !lane.dirty) continue;
        const at = readyAt(name);
        if (now >= at) return { run: name, wakeAt: null };
        wakeAt = wakeAt === null ? at : Math.min(wakeAt, at);
      }
      return { run: null, wakeAt };
    },
    /** The lane begins: take what was pending. Anything that changes while it runs is pending again. */
    start(name, now) {
      const lane = lanes[name];
      lane.running = true;
      lane.lastStartAt = now;
      lane.taken = new Set(lane.kinds);
      lane.kinds.clear();
      lane.dirty = false;
      return new Set(lane.taken);
    },
    /** The lane ended. A failure keeps what it took and waits out a growing delay; a success forgets it. */
    finish(name, ok, now) {
      const lane = lanes[name];
      lane.running = false;
      if (ok) {
        lane.failures = 0;
        lane.retryAt = null;
      } else {
        lane.failures += 1;
        lane.retryAt = now + timing.retryMs[Math.min(lane.failures - 1, timing.retryMs.length - 1)];
        for (const k of lane.taken ?? []) lane.kinds.add(k);
        lane.dirty = true;
      }
      lane.taken = null;
    },
    /** For the status file. */
    snapshot() {
      return Object.fromEntries(
        LANE_NAMES.map((n) => [n, { pending: lanes[n].dirty, kinds: [...lanes[n].kinds].sort(), running: lanes[n].running, failures: lanes[n].failures, retryAt: lanes[n].retryAt }])
      );
    }
  };
}

/**
 * The daemon writes a heartbeat; a pid alone is not proof it is still ours
 * (Windows reuses them after a reboot).
 */
export function daemonAlive(state, now, pidAlive, staleMs = 60_000) {
  return Boolean(state?.pid && typeof state.heartbeat === "number" && now - state.heartbeat < staleMs && pidAlive(state.pid));
}

/** Lines of a deploy's output worth keeping on the status line: what was sent, or exactly why it was refused. */
export function summariseDeployOutput(text) {
  const keep = /^(DEPLOYED build|REFUSED|NOT DEPLOYED|DEPLOY FAILED|STAMP NOT VERIFIED|PRUNE INCOMPLETE|  ERROR:|  MISMATCH)|=== stamp: the server already has/;
  const lines = String(text ?? "").split(/\r?\n/).filter((l) => keep.test(l)).map((l) => l.trim());
  return lines.slice(0, 4);
}

const clock = (ms) => new Date(ms).toISOString().replace("T", " ").slice(0, 16);

/** One line for the session-start hook. */
export function statusLine(state, { alive, paused, now }) {
  if (!alive) return "Auto-sync: not running (it starts with the next session; `npm run autosync -- start` starts it now).";
  const d = state?.deploy ?? {};
  const bits = [`Auto-sync: watching, pid ${state.pid}`];
  if (paused) bits.push("PAUSED (`npm run autosync -- resume`)");
  if (d.running) bits.push("deploying now");
  else if (d.pending) bits.push(`changes waiting${d.retryAt && d.retryAt > now ? `, retry ${clock(d.retryAt)} UTC` : ""}`);
  if (d.lastAt) {
    const outcome = d.ok ? `pushed${d.build ? ` build ${d.build}` : ""}` : `FAILED${d.summary?.[0] ? ` (${d.summary[0]})` : ""}`;
    bits.push(`last deploy ${clock(d.lastAt)} UTC, ${outcome}`);
  } else {
    bits.push("no deploy yet this run");
  }
  const a = state?.audio ?? {};
  if (a.lastAt && !a.ok) bits.push(`audio upload FAILED ${clock(a.lastAt)} UTC`);
  return bits.join("; ") + ".";
}
