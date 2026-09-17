/**
 * The audio director's vocabulary — the pure half of design/audio-system.md §5.
 *
 * Two authored shapes live in data/audio/ and are validated and resolved here:
 *
 *   SOUNDSCAPE  a standing audio state for a place or a situation: what music
 *               (a shuffle pool, one reserved track, silence, or "leave it"),
 *               which ambience beds at what levels, which random one-shot
 *               layers (a dispatch call every 20-60s), and a bus mix preset.
 *
 *   CUE         something that HAPPENS: an ordered list of steps (play this,
 *               fade that, fire a sting, wait, and when the music reaches
 *               its marker, show the handout), plus the events that fire it
 *               on their own (a scene activating, a villain's splash, a
 *               fight starting, the day ring turning).
 *
 * Nothing here plays a sound or touches a document: foundry/audio-director.mjs
 * turns these plans into Playlist updates and socket messages. Keeping the
 * vocabulary pure is what lets a typo in a cue fail a test on the author's
 * machine instead of failing silently in the middle of a session.
 */

import { AUDIO_KINDS } from "./audio-library.mjs";
import { BUSES, MAX_BUS_DB, SILENCE_DB, dbToGain } from "./audio-mix.mjs";

/** Longest fade or wait a cue may ask for. A 20-minute "fade" is a typo, not a choice. */
export const MAX_FADE_MS = 60000;
export const MAX_WAIT_MS = 10 * 60 * 1000;

/** Default crossfade when a soundscape or cue does not say. */
export const DEFAULT_FADE_MS = 3000;

/** The events that can fire a cue by themselves. */
export const TRIGGER_EVENTS = Object.freeze({
  "scene-activate": { keys: ["scene"] },
  splash: { keys: ["actor"] },
  "stage-reveal": { keys: ["actor"] },
  "combat-start": { keys: ["scene"] },
  "combat-end": { keys: ["scene"] },
  "segment-advance": { keys: ["quarter"] },
  beat: { keys: ["brief", "beat"] }
});

/**
 * Every step verb, with the one-line reason it exists. `presentational` steps
 * are the ones a marker must deliver to each client at that client's own
 * playback position (§5.4) — everything else is decided once, on the GM.
 */
export const CUE_STEPS = Object.freeze({
  music: { presentational: false },
  "music-stop": { presentational: false },
  ambience: { presentational: false },
  "ambience-stop": { presentational: false },
  soundscape: { presentational: false },
  sting: { presentational: false },
  mix: { presentational: false },
  wait: { presentational: false },
  "at-marker": { presentational: false },
  banner: { presentational: true },
  handout: { presentational: true },
  macro: { presentational: false }
});

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const isId = (v) => typeof v === "string" && /^[a-z0-9][a-z0-9-]*$/.test(v);

function checkFade(v, where, problems) {
  if (v === undefined) return;
  if (!Number.isFinite(v) || v < 0 || v > MAX_FADE_MS) problems.push(`${where}: fade must be 0-${MAX_FADE_MS} ms, got ${JSON.stringify(v)}`);
}

function checkLevel(v, where, problems, { max = 0 } = {}) {
  if (v === undefined) return;
  if (!Number.isFinite(v) || v < SILENCE_DB || v > max) problems.push(`${where}: level must be ${SILENCE_DB} to ${max} dB, got ${JSON.stringify(v)}`);
}

/**
 * Asset lookup that reports rather than throws, and checks the asset is the
 * right KIND for the job — a sting step pointing at a ten-minute ambience bed
 * is a real mistake an author can make, and the desk would happily play it.
 */
function checkAsset(index, id, kinds, where, problems) {
  if (!isId(id)) {
    problems.push(`${where}: "${id}" is not a valid asset id`);
    return null;
  }
  const asset = index?.assets?.get?.(id);
  if (!index) return null;
  if (!asset) {
    problems.push(`${where}: no asset "${id}" in the audio library`);
    return null;
  }
  if (asset.status === "rejected") problems.push(`${where}: "${id}" was rejected in review`);
  if (kinds && !kinds.includes(asset.kind)) problems.push(`${where}: "${id}" is ${asset.kind}, expected ${kinds.join(" or ")}`);
  return asset;
}

/* -------------------------------------------- */
/*  Soundscapes                                 */
/* -------------------------------------------- */

/**
 * Validate an authored soundscape. Returns a list of human-readable problems
 * (empty when valid). `index` is optional: without it only the shape is
 * checked, with it every track, pool and kind is checked against the library.
 */
export function validateSoundscape(doc, index = null) {
  const problems = [];
  const where = `soundscape ${doc?.id ?? "(no id)"}`;
  if (!isObj(doc)) return [`${where}: not an object`];
  if (!isId(doc.id)) problems.push(`${where}: id must be kebab-case`);
  if (doc.type !== "audio-soundscape") problems.push(`${where}: type must be "audio-soundscape"`);

  const music = doc.music;
  if (music !== undefined && music !== null) {
    if (!isObj(music)) problems.push(`${where}: music must be an object or null`);
    else {
      const modes = ["pool", "track", "silence"].filter((k) => music[k] !== undefined);
      if (modes.length !== 1) problems.push(`${where}: music needs exactly one of pool, track or silence`);
      if (music.pool !== undefined && index && !index.pools?.[music.pool]) problems.push(`${where}: no music pool "${music.pool}"`);
      if (music.track !== undefined) checkAsset(index, music.track, ["music"], `${where} music`, problems);
    }
  }
  if (doc.combat !== undefined && doc.combat !== null) {
    if (!isObj(doc.combat) || (doc.combat.pool === undefined) === (doc.combat.track === undefined)) {
      problems.push(`${where}: combat needs exactly one of pool or track`);
    } else if (doc.combat.pool !== undefined && index && !index.pools?.[doc.combat.pool]) {
      problems.push(`${where}: no music pool "${doc.combat.pool}" for combat`);
    } else if (doc.combat.track !== undefined) checkAsset(index, doc.combat.track, ["music"], `${where} combat`, problems);
  }

  const seen = new Set();
  for (const [i, layer] of (doc.ambience ?? []).entries()) {
    const w = `${where} ambience[${i}]`;
    if (!isObj(layer)) {
      problems.push(`${w}: not an object`);
      continue;
    }
    checkAsset(index, layer.track, ["ambience"], w, problems);
    checkLevel(layer.level, w, problems);
    if (seen.has(layer.track)) problems.push(`${w}: "${layer.track}" is layered twice`);
    seen.add(layer.track);
  }
  if (doc.ambience !== undefined && !Array.isArray(doc.ambience)) problems.push(`${where}: ambience must be a list`);

  for (const [i, layer] of (doc.scatter ?? []).entries()) {
    const w = `${where} scatter[${i}]`;
    if (!isObj(layer) || !Array.isArray(layer.tracks) || !layer.tracks.length) {
      problems.push(`${w}: needs a non-empty tracks list`);
      continue;
    }
    for (const t of layer.tracks) checkAsset(index, t, ["sfx", "voice", "sting", "interface"], w, problems);
    const every = layer.every;
    if (!Array.isArray(every) || every.length !== 2 || !(every[0] > 0) || !(every[1] >= every[0]) || every[1] > 3600) {
      problems.push(`${w}: every must be [minSeconds, maxSeconds] with 0 < min <= max <= 3600`);
    }
    checkLevel(layer.level, w, problems);
  }

  if (doc.mix !== undefined) {
    if (!isObj(doc.mix)) problems.push(`${where}: mix must be an object`);
    else {
      for (const [k, v] of Object.entries(doc.mix)) {
        if (!BUSES.includes(k)) problems.push(`${where}: mix has no bus "${k}"`);
        else checkLevel(v, `${where} mix.${k}`, problems, { max: MAX_BUS_DB });
      }
    }
  }
  checkFade(doc.fade, where, problems);
  return problems;
}

/**
 * What a soundscape means in playable terms. Music is one of four modes:
 * `keep` (leave whatever is playing alone — the right default for a
 * soundscape that is only about the room), `silence`, `pool`, `track`.
 */
export function resolveSoundscape(doc) {
  const m = doc?.music;
  let music = { mode: "keep" };
  if (m?.silence) music = { mode: "silence" };
  else if (m?.pool) music = { mode: "pool", pool: m.pool };
  else if (m?.track) music = { mode: "track", assetId: m.track, loop: m.loop !== false, from: Number(m.from) || 0 };
  const combat = doc?.combat?.pool ? { mode: "pool", pool: doc.combat.pool } : doc?.combat?.track ? { mode: "track", assetId: doc.combat.track, loop: true, from: 0 } : null;
  return {
    id: doc?.id ?? null,
    music,
    combat,
    ambience: (doc?.ambience ?? []).map((l) => ({ assetId: l.track, gain: dbToGain(Number.isFinite(l.level) ? l.level : 0) })),
    scatter: (doc?.scatter ?? []).map((l, i) => ({
      key: `${doc?.id ?? "scatter"}-${i}`,
      assetIds: [...l.tracks],
      everySec: [l.every[0], l.every[1]],
      levelDb: Number.isFinite(l.level) ? l.level : 0
    })),
    mix: isObj(doc?.mix) ? { ...doc.mix } : null,
    fadeMs: Number.isFinite(doc?.fade) ? doc.fade : DEFAULT_FADE_MS
  };
}

/**
 * The minimal set of changes that turns the ambience currently playing into
 * the target. `replace` stops every bed not in the target; `add` only starts
 * and re-levels. A bed already playing at the right level is left entirely
 * alone — re-sending it would restart nothing, but would still be a document
 * update every client has to process, mid-scene, for no audible change.
 */
export function ambienceDiff(current, target, { mode = "replace" } = {}) {
  const now = new Map((current ?? []).map((c) => [c.assetId, c]));
  const want = new Map((target ?? []).map((t) => [t.assetId, t]));
  const start = [];
  const adjust = [];
  const stop = [];
  for (const [id, t] of want) {
    const c = now.get(id);
    if (!c) start.push({ assetId: id, gain: t.gain });
    else if (Math.abs((c.gain ?? 1) - t.gain) > 0.005) adjust.push({ assetId: id, gain: t.gain });
  }
  if (mode === "replace") for (const id of now.keys()) if (!want.has(id)) stop.push({ assetId: id });
  return { start, adjust, stop };
}

/* -------------------------------------------- */
/*  Cues                                        */
/* -------------------------------------------- */

function validateStep(step, where, index, soundscapeIds, problems, depth) {
  if (!isObj(step) || typeof step.do !== "string") {
    problems.push(`${where}: a step needs a "do"`);
    return;
  }
  if (!CUE_STEPS[step.do]) {
    problems.push(`${where}: unknown step "${step.do}"`);
    return;
  }
  const w = `${where} (${step.do})`;
  switch (step.do) {
    case "music": {
      if ((step.pool === undefined) === (step.track === undefined)) problems.push(`${w}: needs exactly one of pool or track`);
      if (step.pool !== undefined && index && !index.pools?.[step.pool]) problems.push(`${w}: no music pool "${step.pool}"`);
      if (step.track !== undefined) {
        const a = checkAsset(index, step.track, ["music"], w, problems);
        if (a && Number.isFinite(step.from) && Number.isFinite(a.durationSec) && step.from >= a.durationSec) problems.push(`${w}: from ${step.from}s is past the end of "${step.track}"`);
      }
      checkFade(step.fade, w, problems);
      break;
    }
    case "music-stop":
    case "ambience-stop":
      checkFade(step.fade, w, problems);
      break;
    case "ambience":
      if (!Array.isArray(step.layers) || !step.layers.length) problems.push(`${w}: needs a non-empty layers list`);
      for (const [i, l] of (step.layers ?? []).entries()) {
        checkAsset(index, l?.track, ["ambience"], `${w} layers[${i}]`, problems);
        checkLevel(l?.level, `${w} layers[${i}]`, problems);
      }
      if (step.mode !== undefined && !["replace", "add"].includes(step.mode)) problems.push(`${w}: mode must be replace or add`);
      checkFade(step.fade, w, problems);
      break;
    case "soundscape":
      if (!isId(step.ref)) problems.push(`${w}: needs a soundscape ref`);
      else if (soundscapeIds && !soundscapeIds.has(step.ref)) problems.push(`${w}: no soundscape "${step.ref}"`);
      checkFade(step.fade, w, problems);
      break;
    case "sting": {
      const a = checkAsset(index, step.track, null, w, problems);
      if (a && !AUDIO_KINDS[a.kind]?.fireOnce) problems.push(`${w}: "${step.track}" is ${a.kind}, which is not a fire-once sound`);
      checkLevel(step.level, w, problems, { max: MAX_BUS_DB });
      if (step.duck !== undefined && !(Number.isFinite(step.duck) && step.duck <= 0 && step.duck >= -30)) problems.push(`${w}: duck must be -30 to 0 dB`);
      break;
    }
    case "mix":
      for (const [k, v] of Object.entries(step)) {
        if (k === "do" || k === "fade") continue;
        if (!BUSES.includes(k)) problems.push(`${w}: no bus "${k}"`);
        else checkLevel(v, `${w} ${k}`, problems, { max: MAX_BUS_DB });
      }
      checkFade(step.fade, w, problems);
      break;
    case "wait":
      if (!Number.isFinite(step.ms) || step.ms < 0 || step.ms > MAX_WAIT_MS) problems.push(`${w}: ms must be 0-${MAX_WAIT_MS}`);
      break;
    case "at-marker": {
      if (depth > 0) problems.push(`${w}: markers cannot be nested inside another marker's steps`);
      const a = checkAsset(index, step.track, ["music", "ambience"], w, problems);
      if (!isId(step.marker)) problems.push(`${w}: needs a marker id`);
      else if (a && !(a.markers ?? []).some((m) => m.id === step.marker)) problems.push(`${w}: "${step.track}" has no marker "${step.marker}"`);
      if (!Array.isArray(step.then) || !step.then.length) problems.push(`${w}: needs a non-empty then list`);
      for (const [i, s] of (step.then ?? []).entries()) validateStep(s, `${w} then[${i}]`, index, soundscapeIds, problems, depth + 1);
      break;
    }
    case "banner":
      if (typeof step.text !== "string" || !step.text.trim()) problems.push(`${w}: needs text`);
      break;
    case "handout":
      if (!isId(step.brief) || !isId(step.handout)) problems.push(`${w}: needs brief and handout ids`);
      break;
    case "macro":
      if (typeof step.name !== "string" || !step.name.trim()) problems.push(`${w}: needs a macro name`);
      break;
  }
}

/** Validate an authored cue: shape, every step, every trigger, and (with an index) every referenced asset and marker. */
export function validateCue(doc, index = null, soundscapeIds = null) {
  const problems = [];
  const where = `cue ${doc?.id ?? "(no id)"}`;
  if (!isObj(doc)) return [`${where}: not an object`];
  if (!isId(doc.id)) problems.push(`${where}: id must be kebab-case`);
  if (doc.type !== "audio-cue") problems.push(`${where}: type must be "audio-cue"`);
  if (!Array.isArray(doc.steps) || !doc.steps.length) problems.push(`${where}: needs at least one step`);
  for (const [i, step] of (doc.steps ?? []).entries()) validateStep(step, `${where} steps[${i}]`, index, soundscapeIds, problems, 0);
  for (const [i, t] of (doc.triggers ?? []).entries()) {
    const w = `${where} triggers[${i}]`;
    const def = isObj(t) ? TRIGGER_EVENTS[t.on] : null;
    if (!def) {
      problems.push(`${w}: unknown event ${JSON.stringify(t?.on)}`);
      continue;
    }
    for (const k of Object.keys(t)) if (k !== "on" && !def.keys.includes(k)) problems.push(`${w}: "${t.on}" has no field "${k}"`);
  }
  return problems;
}

/**
 * Which cues an event fires. A trigger field that is present must match the
 * event exactly; a field left out matches anything — so `{on: "combat-start"}`
 * fires for every fight and `{on: "combat-start", scene: "the-docks"}` only
 * for fights on that scene.
 */
export function cuesForEvent(cues, event) {
  if (!event?.on || !TRIGGER_EVENTS[event.on]) return [];
  const keys = TRIGGER_EVENTS[event.on].keys;
  return (cues ?? []).filter((cue) =>
    (cue?.triggers ?? []).some((t) => t?.on === event.on && keys.every((k) => t[k] === undefined || t[k] === event[k]))
  );
}

/**
 * Split a cue's steps at every `wait`, so the adapter can run each group back
 * to back with a real delay between them. Steps inside a group are started
 * together — "the sting and the theme hit on the same beat" is the common case.
 */
export function stepGroups(steps) {
  const groups = [];
  let current = { delayMs: 0, steps: [] };
  for (const step of steps ?? []) {
    if (step?.do === "wait") {
      if (current.steps.length || current.delayMs) groups.push(current);
      current = { delayMs: Number(step.ms) || 0, steps: [] };
    } else current.steps.push(step);
  }
  if (current.steps.length || current.delayMs) groups.push(current);
  return groups;
}

/* -------------------------------------------- */
/*  Timing                                      */
/* -------------------------------------------- */

/**
 * How long a client should wait before presenting something the GM's marker
 * just fired, given that client's OWN playback position of the same track.
 *
 * Every player starts a track slightly after the GM does (the document update
 * has to arrive, and each browser decodes the file itself), so a reveal sent
 * the instant the GM's copy reaches the marker usually arrives BEFORE the
 * player's copy does. Waiting out the difference lands the reveal on the beat
 * on every screen. A client that is somehow ahead, or not playing the track
 * at all, presents at once rather than never.
 */
export function presentationDelayMs({ markerAt, currentTime, playing }) {
  if (!playing || !Number.isFinite(markerAt) || !Number.isFinite(currentTime)) return 0;
  const behind = markerAt - currentTime;
  if (behind <= 0) return 0;
  // A client more than a few seconds behind is not "late", it is a client
  // that started the track over (a reload). Do not hold a reveal hostage to it.
  if (behind > 8) return 0;
  return Math.round(behind * 1000);
}

/** The next gap before a scatter layer fires again, uniformly inside its range. `random` is injectable for tests. */
export function nextScatterDelayMs(everySec, random = Math.random) {
  const [min, max] = everySec;
  return Math.round((min + (max - min) * random()) * 1000);
}

/** Pick a scatter clip, never the same one twice running when there is a choice. */
export function pickScatterClip(assetIds, lastId, random = Math.random) {
  const pool = assetIds.length > 1 ? assetIds.filter((id) => id !== lastId) : assetIds;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/* -------------------------------------------- */
/*  Foundry playlists, as data                  */
/* -------------------------------------------- */

/** "unexpected-enemy-reinforcements" -> "Unexpected Enemy Reinforcements". */
export function categoryTitle(slug) {
  return String(slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Foundry's CONST.PLAYLIST_MODES, mirrored so this file stays pure. Pinned by a tier-3 contract test. */
export const PLAYLIST_MODES = Object.freeze({ DISABLED: -1, SEQUENTIAL: 0, SHUFFLE: 1, SIMULTANEOUS: 2 });

/**
 * The world Playlists the library becomes, as plain data. The adapter derives
 * ids from `key`, creates what is missing and updates what changed.
 *
 * - One SHUFFLE playlist per music pool, crossfading at track boundaries.
 * - "Reserved Music": every reserved music track, as a soundboard (DISABLED
 *   mode) — they play only when a cue or the GM asks for them by name.
 * - One soundboard per ambience shelf, every bed set to repeat.
 *
 * Fire-once sounds are deliberately NOT playlists: a PlaylistSound's playing
 * state is persisted, so a late joiner or a reload would re-fire a sting that
 * ended a minute ago. The engine plays those over the socket instead (§4.3).
 *
 * `path` is the web path; `name` is the asset's musical title, never its
 * purpose — Playlist documents reach every player's browser (§7).
 */
export function playlistBlueprint(index, { webPath, crossfadeMs = DEFAULT_FADE_MS } = {}) {
  const pathFor = webPath ?? ((a) => a.encode?.path);
  const playable = [...(index?.assets?.values?.() ?? [])].filter((a) => a.status !== "rejected" && a.encode?.path);
  const soundOf = (a, extra) => ({
    key: a.id,
    assetId: a.id,
    name: a.title ?? a.id,
    path: pathFor(a),
    volume: 1,
    ...extra
  });
  const byTitle = (x, y) => String(x.name).localeCompare(String(y.name)) || x.key.localeCompare(y.key);
  const out = [];

  for (const [pool, ids] of Object.entries(index?.pools ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const sounds = ids.map((id) => index.assets.get(id)).filter(Boolean).map((a) => soundOf(a, { repeat: false }));
    if (!sounds.length) continue;
    out.push({ key: `music-${pool}`, name: `Music — ${categoryTitle(pool)}`, channel: "music", mode: PLAYLIST_MODES.SHUFFLE, fade: crossfadeMs, pool, sounds: sounds.sort(byTitle) });
  }

  const reserved = playable.filter((a) => a.kind === "music" && a.reservedFor?.length);
  if (reserved.length) {
    out.push({ key: "music-reserved", name: "Music — Reserved", channel: "music", mode: PLAYLIST_MODES.DISABLED, fade: crossfadeMs, pool: null, sounds: reserved.map((a) => soundOf(a, { repeat: true })).sort(byTitle) });
  }

  const shelves = {};
  for (const a of playable.filter((x) => x.kind === "ambience")) (shelves[a.category ?? "misc"] ??= []).push(a);
  for (const [shelf, assets] of Object.entries(shelves).sort(([a], [b]) => a.localeCompare(b))) {
    out.push({ key: `ambience-${shelf}`, name: `Ambience — ${categoryTitle(shelf)}`, channel: "environment", mode: PLAYLIST_MODES.DISABLED, fade: crossfadeMs, pool: null, sounds: assets.map((a) => soundOf(a, { repeat: true })).sort(byTitle) });
  }
  return out;
}

/** Where a given asset lives in the blueprint: which playlist key holds it. */
export function blueprintLocation(blueprint, assetId) {
  for (const pl of blueprint ?? []) if (pl.sounds.some((s) => s.assetId === assetId)) return pl.key;
  return null;
}
