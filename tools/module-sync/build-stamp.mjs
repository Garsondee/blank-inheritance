/**
 * The build stamp: one small JSON file, written to the server LAST by every
 * deploy, that tells the running module which content is on disk.
 *
 * It lands at Data/modules/blank-inheritance/data/campaign/build.json, where
 * the module's own fetchModuleJson can read it. The module compares its `id`
 * with the build the world was last updated to (a world setting), and when
 * they differ it brings the world up to date by itself -- scenes built,
 * refreshed and retired, journals rewritten -- with nobody running a macro.
 * See module/blank-inheritance/scripts/core/world-sync.mjs for that half.
 *
 * Written last, and only after every channel verified, so a GM whose browser
 * polls it mid-deploy can never see a new id while half the files are still
 * old.
 *
 * Pure: no filesystem, no network. deploy.mjs gathers the inputs.
 */

import { createHash } from "node:crypto";

/** Where the stamp lives, relative to the module directory on the server. */
export const STAMP_PATH_IN_MODULE = "data/campaign/build.json";
/** The same file, relative to the campaign-data channel's own remote root. */
export const STAMP_PATH_IN_DATA = "build.json";
/** How many past deploys the stamp remembers, so a world several builds behind can still be told what changed. */
export const HISTORY_LIMIT = 30;

/** The module files whose change means a running client holds stale code. */
const CODE_PREFIXES = ["scripts/", "templates/", "styles/", "lang/"];
export const isModuleCodePath = (p) => p === "module.json" || CODE_PREFIXES.some((prefix) => p.startsWith(prefix));

/**
 * A short, stable fingerprint of a path->hash Map: the same files with the
 * same contents always give the same answer, whatever order they were read in.
 */
export function fingerprint(map) {
  const lines = [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([p, h]) => `${p}\t${h}\n`);
  return createHash("sha256").update(lines.join("")).digest("hex").slice(0, 16);
}

/** The code-only subset of the module map. */
export function codeMap(moduleMap) {
  return new Map([...moduleMap].filter(([p]) => isModuleCodePath(p)));
}

/**
 * The files the manifest itself names -- what the server loaded at world
 * launch. The module compares this with its own loaded manifest to tell "reload
 * the page" apart from "relaunch the world": Foundry reads module.json only
 * when a world launches, so a changed stylesheet list needs a relaunch, while a
 * changed script only needs a reload.
 */
export function manifestFiles(manifest) {
  const list = (value) => [...(value ?? [])].map((entry) => (typeof entry === "string" ? entry : entry?.src ?? entry?.path)).filter(Boolean).sort();
  return {
    esmodules: list(manifest?.esmodules),
    styles: list(manifest?.styles),
    languages: list(manifest?.languages)
  };
}

/**
 * The episode files the campaign data carries, in the paths the module
 * fetches them by -- so the module syncs every episode's journal without a
 * hand-kept list that can fall behind (the old one named only Episode One for
 * a fortnight after Episode Two existed).
 */
export function episodePaths(dataMap) {
  return [...dataMap.keys()].filter((p) => /^episodes\/[^/]+\.json$/.test(p)).sort();
}

/**
 * The stamp for this deploy.
 *
 * @param {object} input
 * @param {Date}   input.now
 * @param {{commit: string|null, uncommitted: number|null}} input.git
 * @param {{module: Map, data: Map, video: Map|null, stagecraft?: Map|null}} input.maps   path->hash per channel, as
 *   now on the server. `video: null` means the videos were not checked this deploy (--no-video): the previous
 *   stamp's video fingerprint is carried forward, so skipping the check never reads as "no videos". `stagecraft`
 *   (the second module the adventure uses, all of it code) is the same: null carries the previous fingerprint.
 * @param {object} input.manifest     the parsed module.json that was pushed
 * @param {{module: string[], data: string[], video: string[]}} input.sent     paths uploaded this deploy
 * @param {string[]} [input.removed]  channel-prefixed paths pruned this deploy
 * @param {string[]} [input.warnings]
 * @param {object|null} [input.previous]  the stamp this one replaces, if any
 * @returns {{stamp: object, unchanged: boolean}}  unchanged: same content as `previous`; nothing to write
 */
export function composeStamp({ now, git, maps, manifest, sent, removed = [], warnings = [], previous = null }) {
  const video = maps.video
    ? { files: maps.video.size, hash: fingerprint(maps.video) }
    : { files: previous?.video?.files ?? 0, hash: previous?.video?.hash ?? fingerprint(new Map()) };
  // Stagecraft is a module of its own and all code: a deploy that changes only it is still new code every open page must
  // reload for (found 2026-10-03: a Stagecraft-only fix left the stamp, and so every open page, exactly as it was)
  const stagecraft = maps.stagecraft
    ? { files: maps.stagecraft.size, hash: fingerprint(maps.stagecraft) }
    : { files: previous?.stagecraft?.files ?? 0, hash: previous?.stagecraft?.hash ?? fingerprint(new Map()) };
  const id = fingerprint(
    new Map([
      ["module", fingerprint(maps.module)],
      ["data", fingerprint(maps.data)],
      ["video", video.hash],
      ["stagecraft", stagecraft.hash]
    ])
  );

  const changed = [
    ...(sent.module ?? []).map((p) => `module:${p}`),
    ...(sent.data ?? []).map((p) => `data:${p}`),
    ...(sent.video ?? []).map((p) => `video:${p}`),
    ...(sent.stagecraft ?? []).map((p) => `stagecraft:${p}`)
  ].sort();

  const unchanged = previous?.id === id && !removed.length;
  const priorHistory = Array.isArray(previous?.history) ? previous.history : [];
  const history = unchanged
    ? priorHistory
    : [{ id, deployedAt: now.toISOString(), changed, removed: [...removed].sort() }, ...priorHistory].slice(0, HISTORY_LIMIT);

  const stamp = {
    $comment: "Written by tools/module-sync/deploy.mjs after a verified push; never edit by hand. The Blank Inheritance module reads it to know which content is on the server.",
    schema: 1,
    id,
    deployedAt: unchanged ? previous.deployedAt : now.toISOString(),
    git: { commit: git?.commit ?? null, uncommitted: git?.uncommitted ?? null },
    module: {
      files: maps.module.size,
      // the adventure's code and Stagecraft's together: either changing means an open page holds stale code
      code: fingerprint(new Map([["blank-inheritance", fingerprint(codeMap(maps.module))], ["stagecraft", stagecraft.hash]])),
      manifest: manifestFiles(manifest)
    },
    data: { files: maps.data.size, hash: fingerprint(maps.data) },
    video,
    stagecraft,
    episodes: episodePaths(maps.data),
    warnings: [...warnings],
    history
  };
  return { stamp, unchanged };
}
