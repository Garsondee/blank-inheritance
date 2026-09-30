/**
 * Keeping the world in step with the content on the server -- the pure half.
 *
 * Ingram, 2026-09-27: "Add to the module a system which keeps the Foundry
 * server updated automatically... get rid of scenes which aren't useful, get
 * the new versions of every scene." And, 2026-09-19, the rule it keeps: "every
 * time I load Foundry it just updates, adds or removes scenes to get us to the
 * current state of the adventure."
 *
 * HOW IT WORKS. Every deploy (tools/module-sync/deploy.mjs) writes a small
 * build stamp LAST, at data/campaign/build.json, once every file has verified
 * on the server. The world remembers the build it was last brought up to (a
 * world setting). When a GM logs in, and every couple of minutes while one is
 * logged in, the module reads the stamp; a different id means new content is
 * on disk, and the world updates itself -- content journals and actors, every
 * scene built or refreshed, scenes the adventure no longer has removed -- then
 * says what changed in one whispered card. Nobody runs a macro.
 *
 * TWO THINGS A RUNNING PAGE CANNOT DO FOR ITSELF, and which this decides
 * rather than guesses:
 *   - new module CODE is only picked up by reloading the page. A client that
 *     sees a stamp whose code differs from the code it loaded with must not
 *     apply that content with its old code; it asks the GM to reload, and the
 *     reload applies it.
 *   - a changed module.json FILE LIST (a new stylesheet, say) is only read
 *     when the world launches. Loading with a manifest different from the
 *     stamp's means the world was launched before that deploy.
 *
 * No Foundry globals here (design/testing-strategy.md §1); the adapter is
 * foundry/world-sync.mjs.
 */

/** Where every deploy writes the stamp, relative to the module root. */
export const BUILD_STAMP_PATH = "data/campaign/build.json";

/** How often a logged-in GM's browser looks for a new deploy. */
export const WATCH_INTERVAL_MS = 90 * 1000;

/**
 * The episodes whose journals are synced when the server has no stamp to list
 * them (anything deployed before stamps existed). With a stamp, its own
 * `episodes` list is used instead, so a new episode needs no code change.
 */
export const FALLBACK_EPISODE_PATHS = Object.freeze([
  "episodes/episode-c1e1-mothers-maiden-name.json",
  "episodes/episode-c1e2-scheduled-exercise.json"
]);

/** Diagnostic fixtures are the test sync's own, rebuilt on demand; never retired here. */
const DIAGNOSTIC_SOURCE_PREFIX = "test-fixture-";

/* -------------------------------------------------------------------------- */
/*  Manifests                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The files a manifest names, in one comparable shape, from either the stamp's
 * plain arrays or a live Foundry package (esmodules a Set of strings, styles an
 * array of {src}, languages a Set of {path} in v14 -- common/packages/
 * base-package.mjs). Paths are compared relative to the module root.
 */
export function normalizeManifestFiles(source, moduleId = "blank-inheritance") {
  const clean = (p) => String(p ?? "").replace(/^\/+/, "").replace(new RegExp(`^modules/${moduleId}/`), "");
  const list = (value) =>
    [...(value ?? [])]
      .map((entry) => (typeof entry === "string" ? entry : entry?.src ?? entry?.path))
      .filter(Boolean)
      .map(clean)
      .sort();
  return { esmodules: list(source?.esmodules), styles: list(source?.styles), languages: list(source?.languages) };
}

export function sameManifestFiles(a, b) {
  return JSON.stringify(normalizeManifestFiles(a)) === JSON.stringify(normalizeManifestFiles(b));
}

/* -------------------------------------------------------------------------- */
/*  Deciding                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Whether to bring the world up to date now, and whether the GM needs telling
 * something first.
 *
 * @param {object} input
 * @param {"login"|"poll"|"manual"} input.trigger
 *   login: the GM's page just loaded. poll: the watcher noticed something.
 *   manual: the GM asked (the macro or the API).
 * @param {object|null} input.serverBuild     the stamp as read just now; null when the server has none
 * @param {string|null} input.appliedBuildId  the build this world was last brought up to
 * @param {object|null} input.loadedBuild     the stamp as it was when this page loaded
 * @param {object|null} input.loadedManifest  the manifest this page's module was launched with
 * @returns {{apply: boolean, notice: null|"reload"|"relaunch", reason: string}}
 */
export function decideWorldSync({ trigger, serverBuild, appliedBuildId = null, loadedBuild = null, loadedManifest = null }) {
  const manifestStale = Boolean(serverBuild?.module?.manifest && loadedManifest && !sameManifestFiles(serverBuild.module.manifest, loadedManifest));

  if (trigger === "login") {
    // This page's code was read from disk just now, so it is current; only the
    // manifest's file list can be older than the stamp.
    if (!serverBuild) return { apply: true, notice: null, reason: "the server has no build stamp yet, so the world is updated on every login" };
    const notice = manifestStale ? "relaunch" : null;
    if (serverBuild.id === appliedBuildId) return { apply: false, notice, reason: `the world is already at build ${serverBuild.id}` };
    return { apply: true, notice, reason: `new content: build ${serverBuild.id}` };
  }

  const force = trigger === "manual";
  if (!serverBuild) {
    return force
      ? { apply: true, notice: null, reason: "asked for; the server has no build stamp" }
      : { apply: false, notice: null, reason: "the server has no build stamp to watch" };
  }
  if (!force && serverBuild.id === appliedBuildId) return { apply: false, notice: null, reason: `the world is already at build ${serverBuild.id}` };

  // Never run old code against new content: after a code deploy, the page must
  // reload first. A page that loaded before any stamp existed cannot tell, so
  // it asks for the reload too -- one reload is cheap, a half-understood
  // update is not.
  if (manifestStale) return { apply: false, notice: "relaunch", reason: `build ${serverBuild.id} changes module.json's file list` };
  if (!loadedBuild || loadedBuild.module?.code !== serverBuild.module?.code) {
    return { apply: false, notice: "reload", reason: `build ${serverBuild.id} includes new module code` };
  }
  return { apply: true, notice: null, reason: force ? "asked for" : `new content: build ${serverBuild.id}` };
}

/* -------------------------------------------------------------------------- */
/*  What changed                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Every path deployed since the world's own build, from the stamp's history
 * (newest first). `known: false` when the world's build is too old to be in
 * the history, or it has never been updated from a stamp.
 */
export function changesSince(serverBuild, appliedBuildId) {
  const history = Array.isArray(serverBuild?.history) ? serverBuild.history : [];
  const changed = new Set();
  const removed = new Set();
  for (const entry of history) {
    if (entry?.id === appliedBuildId) return { known: true, changed: [...changed].sort(), removed: [...removed].sort() };
    for (const p of entry?.changed ?? []) changed.add(p);
    for (const p of entry?.removed ?? []) removed.add(p);
  }
  return { known: false, changed: [...changed].sort(), removed: [...removed].sort() };
}

const idFromPath = (p, prefix) => p.slice(prefix.length).replace(/\.json$/, "");

/**
 * Group changed paths into what a GM would name them by. `names` maps a
 * scene-brief id to the scene's own name, where one is known.
 */
export function describeChanges(paths, { names = new Map() } = {}) {
  const out = { scenes: [], episodes: [], sceneList: false, soundscapes: [], people: [], places: 0, code: false, art: 0, video: [], other: 0 };
  for (const p of paths ?? []) {
    if (p.startsWith("data:scene-briefs/")) {
      const id = idFromPath(p, "data:scene-briefs/");
      out.scenes.push(names.get(id) ?? id);
    } else if (p.startsWith("data:episodes/")) out.episodes.push(idFromPath(p, "data:episodes/"));
    else if (p === "data:campaign/scene-set.json") out.sceneList = true;
    else if (p.startsWith("data:audio/soundscapes/")) out.soundscapes.push(idFromPath(p, "data:audio/soundscapes/"));
    else if (p.startsWith("data:npcs/")) out.people.push(idFromPath(p, "data:npcs/"));
    else if (p.startsWith("data:locations/")) out.places += 1;
    else if (/^module:(scripts|templates|styles|lang)\//.test(p) || p === "module:module.json") out.code = true;
    else if (p.startsWith("module:assets/")) out.art += 1;
    else if (p.startsWith("video:")) out.video.push(p.slice("video:".length));
    else out.other += 1;
  }
  out.scenes.sort();
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Which content to sync, and which old documents to retire                  */
/* -------------------------------------------------------------------------- */

/** The episode files to sync journals from, as module-relative paths. */
export function episodePathsFor(serverBuild) {
  const listed = Array.isArray(serverBuild?.episodes) && serverBuild.episodes.length ? serverBuild.episodes : FALLBACK_EPISODE_PATHS;
  return listed.map((p) => `data/campaign/${p}`);
}

/** A source id from a data path: one JSON file per entity, filename = id (CLAUDE.md's own convention). */
export const sourceIdFromPath = (p) => String(p).split("/").pop().replace(/\.json$/, "");

/**
 * Actors and journals the content sync made from a source that no longer
 * exists: the three episodes deleted on 2026-09-13, Episode One under its old
 * c1s1 id, the Claimant deleted on 2026-09-19. Proof of ownership, never a
 * guess: a document qualifies only when it carries BOTH flags only the content
 * sync ever writes (sourceId and sourceHash -- the vault journals and the demo
 * party carry neither pair and are invisible here), its source is not one the
 * sync still manages, and it is not one of the diagnostic's own fixtures.
 *
 * @param {Array<{id: string, name: string, sourceId?: string, sourceHash?: string}>} documents
 * @param {Set<string>} liveSourceIds  every source the content sync manages now
 */
export function orphanedSyncedDocuments(documents, liveSourceIds) {
  return (documents ?? []).filter(
    (doc) =>
      typeof doc?.sourceId === "string" &&
      typeof doc?.sourceHash === "string" &&
      !liveSourceIds.has(doc.sourceId) &&
      !doc.sourceId.startsWith(DIAGNOSTIC_SOURCE_PREFIX)
  );
}

/**
 * The synced documents the content sync KEPT because Ingram had edited them
 * in Foundry (foundry/sync.mjs#runRealJournalCase, design/scene-edits.md §7),
 * by name, for the update card to say out loud.
 */
export function keptEditedDocuments(content) {
  return (content?.results ?? []).filter((r) => r?.keptEdited).map((r) => r.name ?? r.sourceId);
}

/**
 * An empty copy of a scene the adventure already has: a scene NOT built from
 * the scene set, carrying the exact name of one that is, with nothing placed
 * on it. The known case is the old "Directorate HQ — Lobby" the first landing
 * scene code made (2026-09-17), which a later clean-up could only set aside in
 * "Diagnostics & Fixtures" because it could not be sure. Empty is what makes
 * deleting it safe: nothing on it can be lost. A copy with anything on it
 * stays set aside for a person to look at.
 *
 * @param {{name: string, sourceId?: string|null, placeables: number}} scene
 */
export function isDisposableDuplicateScene(scene, { knownSourceIds, knownCleanNames }) {
  if (!scene) return false;
  if (scene.sourceId && knownSourceIds.has(scene.sourceId)) return false;
  return knownCleanNames.has(scene.name) && (scene.placeables ?? 1) === 0;
}

/* -------------------------------------------------------------------------- */
/*  The report                                                                */
/* -------------------------------------------------------------------------- */

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const listLine = (label, items, limit = 8) => {
  if (!items?.length) return null;
  const shown = items.slice(0, limit).map(escapeHtml).join(", ");
  const more = items.length > limit ? ` and ${items.length - limit} more` : "";
  return `<li><strong>${escapeHtml(label)}:</strong> ${shown}${more}</li>`;
};

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "27 Sep, 15:10" in the GM's own time zone; the ISO string itself if it cannot be read. */
export function formatDeployTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso ?? "");
  const pad = (n) => String(n).padStart(2, "0");
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
  return `${date.getDate()} ${month}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The one whispered card a GM sees after the world updates itself. Plain
 * sentences, only the lines that have something in them.
 *
 * @param {object} report  assembled by foundry/world-sync.mjs
 */
export function worldSyncCardHtml(report) {
  const title = report.trigger === "manual" ? "World updated (you asked)" : "World updated to the latest content";
  const build = report.build
    ? `Content deployed ${escapeHtml(formatDeployTime(report.build.deployedAt))} (build <code>${escapeHtml(report.build.id)}</code>).`
    : "The server has no build stamp yet; everything was checked anyway.";

  const scenes = report.scenes ?? {};
  const changes = report.changes;
  const lines = [
    listLine("New scenes", scenes.created),
    listLine("Removed scenes", [...(scenes.removed ?? []), ...(scenes.temporary ?? []), ...(scenes.duplicates ?? [])]),
    listLine("Set aside in Diagnostics & Fixtures", scenes.quarantined),
    listLine("Removed old documents", report.documents?.removed),
    // Never rebuilt or removed: she edited these in Foundry, and her words win.
    listLine("Kept your edits (made in Foundry, so not rebuilt from the repo; filed for Claude to fold in)", report.documents?.kept),
    changes?.scenes?.length ? listLine("Scenes whose content changed", changes.scenes) : null,
    changes?.episodes?.length ? listLine("Episodes changed", changes.episodes) : null,
    changes?.sceneList ? "<li><strong>The scene list itself changed.</strong></li>" : null,
    changes?.soundscapes?.length ? listLine("Soundscapes changed", changes.soundscapes) : null,
    listLine("Audio playlists rebuilt", [...(report.audio?.created ?? []), ...(report.audio?.updated ?? [])]),
    listLine("Audio playlists removed (their whole pool is gone)", report.audio?.removed),
    changes?.people?.length ? listLine("People changed", changes.people) : null,
    changes?.places ? `<li><strong>Places changed:</strong> ${plural(changes.places, "location")}</li>` : null,
    changes?.video?.length ? listLine("Videos changed", changes.video) : null,
    changes?.code ? "<li><strong>Module code changed.</strong> Anyone who had Foundry open before this update should reload it (F5).</li>" : null
  ].filter(Boolean);

  const kept = typeof scenes.updated === "number" ? `<p>${plural(scenes.updated, "scene")} checked against the latest content${scenes.pinsRetired ? `, ${plural(scenes.pinsRetired, "old map pin")} removed` : ""}.</p>` : "";
  const unknownHistory = changes && changes.known === false && report.appliedBuildId
    ? "<p>This world was last updated too long ago to list every change.</p>"
    : "";
  const problems = [...(report.problems ?? []), ...(report.build?.warnings ?? [])];
  const problemBlock = problems.length ? `<p><strong>Needs a look:</strong></p><ul>${problems.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>` : "";
  const notice = report.notice === "relaunch"
    ? "<p><strong>Relaunch the world</strong> (Return to Setup, then Launch World) — this build changes which stylesheets or scripts the module loads, and Foundry only reads that at launch.</p>"
    : "";

  return [
    `<div class="bi-world-sync">`,
    `<h3>${escapeHtml(title)}</h3>`,
    `<p>${build}</p>`,
    lines.length ? `<ul>${lines.join("")}</ul>` : "<p>No scenes were added or removed.</p>",
    kept,
    unknownHistory,
    problemBlock,
    notice,
    `</div>`
  ].join("");
}

/** The short toast that goes with the card. */
export function worldSyncToast(report) {
  const scenes = report.scenes ?? {};
  const removed = (scenes.removed?.length ?? 0) + (scenes.temporary?.length ?? 0) + (scenes.duplicates?.length ?? 0);
  const parts = [];
  if (scenes.created?.length) parts.push(`${plural(scenes.created.length, "new scene")}`);
  if (removed) parts.push(`${plural(removed, "scene")} removed`);
  const audioTouched = (report.audio?.created?.length ?? 0) + (report.audio?.updated?.length ?? 0);
  if (audioTouched) parts.push(`${plural(audioTouched, "audio playlist")} rebuilt`);
  if (report.documents?.removed?.length) parts.push(`${plural(report.documents.removed.length, "old document")} removed`);
  const problems = (report.problems?.length ?? 0) + (report.build?.warnings?.length ?? 0);
  if (problems) parts.push(`${plural(problems, "thing")} to look at`);
  return `Blank Inheritance: the world is up to date${parts.length ? ` — ${parts.join(", ")}` : ""}. Details in chat.`;
}

/** What to tell a GM whose page cannot apply the new content itself. */
export function noticeText(notice, serverBuild) {
  const when = serverBuild?.deployedAt ? ` (deployed ${formatDeployTime(serverBuild.deployedAt)})` : "";
  if (notice === "relaunch") {
    return `Blank Inheritance: new content is on the server${when}, and it changes which stylesheets or scripts the module loads. Return to Setup and launch the world again; it will update itself as it loads.`;
  }
  if (notice === "reload") {
    return `Blank Inheritance: new content is on the server${when}, with new module code. Reload Foundry (F5) and the world will update itself.`;
  }
  return "";
}
