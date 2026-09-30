/**
 * The audio director — design/audio-system.md §5. GM-side authority.
 *
 * Everything here happens on the GM's client and travels to the table one of
 * two ways, chosen per thing rather than globally:
 *
 *   DOCUMENTS for anything that should still be true in five minutes — what
 *   music is playing, which ambience beds are up and at what level. Foundry
 *   replicates those, so a player who reloads lands back in the same room.
 *
 *   SOCKET for anything momentary — a sting, a duck, a reveal landing on a
 *   musical beat. Re-playing those after a reload would be wrong, so they are
 *   deliberately not persisted.
 *
 * Cue steps run in groups split at every `wait` (core/audio-director.mjs
 * #stepGroups), and the steps inside one group start together: "the sting and
 * the theme hit on the same beat" is the common case, not the exception.
 */

import {
  DEFAULT_FADE_MS,
  ambienceDiff,
  cuesForEvent,
  presentationDelayMs,
  nextScatterDelayMs,
  pickScatterClip,
  resolveSoundscape,
  stepGroups
} from "../core/audio-director.mjs";
import { dbToGain, withMixChange } from "../core/audio-mix.mjs";
import { AUDIO_KINDS } from "../core/audio-library.mjs";
import { broadcastAudio, currentMix, onAudioMessage, playOneShot, setMix } from "./audio-engine.mjs";
import { ensureAudioPlaylists, generatedPlaylists, playingGeneratedSounds, soundForAsset } from "./audio-playlists.mjs";
import { assetFor, cachedAudio, loadAudio, srcFor } from "./audio-store.mjs";
import { presentLocally } from "./audio-present.mjs";

const MODULE_ID = "blank-inheritance";
export const SETTING_SCAPE = "audioScape";
export const SETTING_AUTO_COMBAT = "audioAutoCombat";

let scatterTimers = [];
let combatMemory = null;

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

export function registerAudioDirectorSettings(onChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING_SCAPE, {
    scope: "world",
    config: false,
    type: Object,
    default: { soundscapeId: null, at: null },
    onChange
  });
  game.settings.register(MODULE_ID, SETTING_AUTO_COMBAT, {
    name: "BLANKINHERITANCE.Settings.AudioAutoCombat.Name",
    hint: "BLANKINHERITANCE.Settings.AudioAutoCombat.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
}

export function currentSoundscapeId() {
  return game.settings.get(MODULE_ID, SETTING_SCAPE)?.soundscapeId ?? null;
}

async function rememberSoundscape(soundscapeId) {
  if (!game.user.isGM) return;
  await game.settings.set(MODULE_ID, SETTING_SCAPE, { soundscapeId, at: Date.now() });
}

/* -------------------------------------------- */
/*  Music                                       */
/* -------------------------------------------- */

const musicPlaylists = () => [...generatedPlaylists().values()].filter((p) => p.channel === "music");

async function fadeOutPlaylist(playlist, fadeMs) {
  if (!playlist?.playing) return;
  await playlist.update({
    playing: false,
    fade: fadeMs,
    sounds: playlist.sounds.map((s) => ({ _id: s.id, playing: false, pausedTime: null }))
  });
}

/** Stop every generated music playlist except one. */
async function stopOtherMusic(keepId, fadeMs) {
  for (const playlist of musicPlaylists()) {
    if (playlist.id === keepId) continue;
    await fadeOutPlaylist(playlist, fadeMs);
  }
}

/**
 * Play a shuffle pool. Crossfades against whatever is already playing, because
 * the outgoing playlist fades out as the incoming one fades in — both are
 * document updates carrying their own fade length.
 */
export async function playMusicPool(pool, { fadeMs = DEFAULT_FADE_MS } = {}) {
  await ensureAudioPlaylists();
  const playlist = generatedPlaylists().get(`music-${pool}`);
  if (!playlist) throw new Error(`No music pool "${pool}" — build the audio playlists first.`);
  await stopOtherMusic(playlist.id, fadeMs);
  const changes = {};
  if (playlist.fade !== fadeMs) changes.fade = fadeMs;
  if (Object.keys(changes).length) await playlist.update(changes);
  await playlist.playAll();
  return playlist;
}

/**
 * Play one named track. `from` uses Foundry's own `pausedTime` field, which
 * `PlaylistSound#sync` reads as the offset to start at.
 */
export async function playMusicTrack(assetId, { fadeMs = DEFAULT_FADE_MS, loop = true, from = 0, restart = true } = {}) {
  await ensureAudioPlaylists();
  const found = soundForAsset(assetId);
  if (!found) throw new Error(`No playlist sound for "${assetId}" — build the audio playlists first.`);
  const { playlist, sound } = found;
  await stopOtherMusic(playlist.id, fadeMs);

  // A track that is ALREADY playing has to be stopped before it can be asked
  // to start somewhere else: PlaylistSound#sync only re-fades a sound it finds
  // already playing and never re-seeks it, so "play this from 0:22" would
  // silently do nothing at all (found live, 2026-09-17, when a cue's marker
  // fired instantly because the track was 147 seconds past it).
  if (playlist.sounds.get(sound.id)?.playing && (restart || from > 0)) {
    await playlist.update({ sounds: [{ _id: sound.id, playing: false, pausedTime: null, fade: 0 }] });
  }

  await playlist.updateEmbeddedDocuments("PlaylistSound", [{ _id: sound.id, repeat: !!loop, fade: fadeMs, pausedTime: from > 0 ? from : null }]);
  await playlist.playSound(playlist.sounds.get(sound.id));
  return sound;
}

export async function stopMusic({ fadeMs = DEFAULT_FADE_MS } = {}) {
  for (const playlist of musicPlaylists()) await fadeOutPlaylist(playlist, fadeMs);
}

/* -------------------------------------------- */
/*  Ambience                                    */
/* -------------------------------------------- */

const ambiencePlaylists = () => [...generatedPlaylists().values()].filter((p) => p.channel === "environment");

/** Which beds are up right now, and how loud. */
export function currentAmbience() {
  return playingGeneratedSounds()
    .filter(({ playlist }) => playlist.channel === "environment")
    .map(({ sound, assetId }) => ({ assetId, gain: sound.volume }));
}

/**
 * Bring the ambience to a target set of layers. Only what actually changes is
 * written — an unchanged bed is left completely alone rather than restarted.
 */
export async function setAmbience(layers, { fadeMs = DEFAULT_FADE_MS, mode = "replace" } = {}) {
  const diff = ambienceDiff(currentAmbience(), layers, { mode });
  const updates = new Map();
  const queue = (assetId, change) => {
    const found = soundForAsset(assetId);
    if (!found || found.playlist.channel !== "environment") return;
    const list = updates.get(found.playlist.id) ?? [];
    list.push({ _id: found.sound.id, ...change });
    updates.set(found.playlist.id, list);
  };

  for (const { assetId, gain } of diff.start) queue(assetId, { playing: true, volume: gain, repeat: true, fade: fadeMs, pausedTime: null });
  for (const { assetId, gain } of diff.adjust) queue(assetId, { volume: gain });
  for (const { assetId } of diff.stop) queue(assetId, { playing: false, fade: fadeMs, pausedTime: null });

  for (const [playlistId, sounds] of updates) {
    const playlist = game.playlists.get(playlistId);
    if (!playlist) continue;
    const anyPlaying = sounds.some((s) => s.playing) || playlist.sounds.some((s) => s.playing && !sounds.find((u) => u._id === s.id && u.playing === false));
    await playlist.update({ playing: anyPlaying, sounds });
  }
  return diff;
}

export async function stopAmbience({ fadeMs = DEFAULT_FADE_MS } = {}) {
  for (const playlist of ambiencePlaylists()) await fadeOutPlaylist(playlist, fadeMs);
}

/* -------------------------------------------- */
/*  Stings                                      */
/* -------------------------------------------- */

/**
 * Fire a one-shot for the whole table. Not a document: a sting is a moment,
 * and a moment re-fired on reload is a bug, not a feature.
 */
export async function fireSting(assetId, { levelDb = 0, duckDb = null } = {}) {
  const asset = assetFor(assetId);
  if (!asset) throw new Error(`No audio asset "${assetId}"`);
  const src = srcFor(asset);
  const kind = asset.kind;
  const duck = duckDb ?? (AUDIO_KINDS[kind]?.context === "interface" ? null : currentMix().duckDb);
  broadcastAudio({ type: "audio.oneshot", src, kind, levelDb, duckDb: duck, durationSec: asset.durationSec });
  return asset;
}

/* -------------------------------------------- */
/*  Scatter layers                              */
/* -------------------------------------------- */

function clearScatter() {
  for (const t of scatterTimers) clearTimeout(t.handle);
  scatterTimers = [];
}

/**
 * Random one-shot layers: a dispatch call every twenty to sixty seconds, a
 * distant explosion now and then. Timed on the GM's client alone, so every
 * client hears the same clip at the same moment.
 */
function startScatter(layers) {
  clearScatter();
  if (!game.user.isGM) return;
  for (const layer of layers ?? []) {
    const state = { lastId: null, handle: null };
    const schedule = () => {
      state.handle = setTimeout(async () => {
        const id = pickScatterClip(layer.assetIds, state.lastId);
        state.lastId = id;
        try {
          await fireSting(id, { levelDb: layer.levelDb, duckDb: null });
        } catch (err) {
          console.warn(`Blank Inheritance | scatter layer "${layer.key}" could not play ${id}:`, err);
        }
        schedule();
      }, nextScatterDelayMs(layer.everySec));
    };
    schedule();
    scatterTimers.push(state);
  }
}

/* -------------------------------------------- */
/*  Soundscapes                                 */
/* -------------------------------------------- */

/**
 * Apply a whole soundscape: music, beds, scatter layers and the bus preset.
 * `music: keep` leaves whatever is playing alone, which is what a soundscape
 * that only describes a room should do.
 */
export async function applySoundscape(soundscapeId, { fadeMs = null } = {}) {
  const audio = cachedAudio() ?? (await loadAudio());
  const doc = audio.soundscapes.get(soundscapeId);
  if (!doc) throw new Error(`No soundscape "${soundscapeId}"`);
  const plan = resolveSoundscape(doc);
  const fade = fadeMs ?? plan.fadeMs;

  if (plan.mix) await setMix(withMixChange(currentMix(), plan.mix));

  // The music step is allowed to fail without taking the rest of the scene's
  // sound with it. A soundscape naming a pool that is empty (or a library that
  // was never built) should still lay its ambience beds down and still say so
  // out loud -- half a soundscape beats an uncaught rejection and silence.
  try {
    if (plan.music.mode === "silence") await stopMusic({ fadeMs: fade });
    else if (plan.music.mode === "pool") await playMusicPool(plan.music.pool, { fadeMs: fade });
    else if (plan.music.mode === "track") await playMusicTrack(plan.music.assetId, { fadeMs: fade, loop: plan.music.loop, from: plan.music.from });
  } catch (err) {
    console.error(`Blank Inheritance | Soundscape "${soundscapeId}" could not start its music:`, err);
    ui.notifications?.warn(err.message);
  }

  await setAmbience(plan.ambience, { fadeMs: fade });
  startScatter(plan.scatter);
  await rememberSoundscape(soundscapeId);
  return plan;
}

/** Everything off, the way a session ends. */
export async function stopAllAudio({ fadeMs = 2000 } = {}) {
  clearScatter();
  await stopMusic({ fadeMs });
  await stopAmbience({ fadeMs });
  await rememberSoundscape(null);
}

/* -------------------------------------------- */
/*  Cues                                        */
/* -------------------------------------------- */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Run a cue by id, or a cue document directly (the desk's "try this" path). */
export async function runCue(cueOrId, context = {}) {
  const audio = cachedAudio() ?? (await loadAudio());
  const cue = typeof cueOrId === "string" ? audio.cues.get(cueOrId) : cueOrId;
  if (!cue) throw new Error(`No audio cue "${cueOrId}"`);
  for (const group of stepGroups(cue.steps)) {
    if (group.delayMs) await wait(group.delayMs);
    await Promise.all(group.steps.map((step) => runStep(step, { cue, ...context })));
  }
  return cue;
}

async function runStep(step, context) {
  try {
    switch (step.do) {
      case "music":
        if (step.pool) return await playMusicPool(step.pool, { fadeMs: step.fade ?? DEFAULT_FADE_MS });
        return await playMusicTrack(step.track, { fadeMs: step.fade ?? DEFAULT_FADE_MS, loop: step.loop !== false, from: step.from ?? 0 });
      case "music-stop":
        return await stopMusic({ fadeMs: step.fade ?? DEFAULT_FADE_MS });
      case "ambience":
        return await setAmbience(
          step.layers.map((l) => ({ assetId: l.track, gain: dbToGain(Number.isFinite(l.level) ? l.level : 0) })),
          { fadeMs: step.fade ?? DEFAULT_FADE_MS, mode: step.mode ?? "replace" }
        );
      case "ambience-stop":
        return await stopAmbience({ fadeMs: step.fade ?? DEFAULT_FADE_MS });
      case "soundscape":
        return await applySoundscape(step.ref, { fadeMs: step.fade ?? null });
      case "sting":
        return await fireSting(step.track, { levelDb: step.level ?? 0, duckDb: step.duck ?? undefined });
      case "mix": {
        const change = {};
        for (const bus of ["music", "ambience", "stings"]) if (step[bus] !== undefined) change[bus] = step[bus];
        return await setMix(withMixChange(currentMix(), change));
      }
      case "at-marker":
        return await armMarker(step, context);
      case "banner":
        return present({ kind: "banner", text: step.text }, context.sync);
      case "handout":
        return await presentHandout(step, context.sync);
      case "macro": {
        const macro = game.macros.getName(step.name);
        if (!macro) throw new Error(`No macro named "${step.name}"`);
        return await macro.execute();
      }
      default:
        throw new Error(`Unknown cue step "${step.do}"`);
    }
  } catch (err) {
    console.error(`Blank Inheritance | cue step "${step.do}" failed:`, err);
    ui.notifications.warn(`Audio cue step "${step.do}" failed: ${err.message}`);
    return null;
  }
}

/* -------------------------------------------- */
/*  Markers: music that fires something          */
/* -------------------------------------------- */

/**
 * Wait for a named moment inside a track, then run the steps hung off it.
 *
 * Scheduling happens on the GM's own copy of the sound (Foundry's
 * `Sound#schedule` runs on the audio clock, not a JS timer, so it does not
 * drift). Presentational steps then carry the marker's time with them, and
 * each client delays by its OWN distance from that moment — see
 * core/audio-director.mjs#presentationDelayMs.
 */
export async function armMarker(step, context = {}) {
  const asset = assetFor(step.track);
  const marker = (asset?.markers ?? []).find((m) => m.id === step.marker);
  if (!marker) throw new Error(`"${step.track}" has no marker "${step.marker}"`);
  const found = soundForAsset(step.track);
  if (!found) throw new Error(`"${step.track}" is not in any playlist`);

  const sound = await waitForSound(found.sound);
  if (!sound) throw new Error(`"${step.track}" is not playing, so its marker can never arrive`);

  return sound.schedule(async () => {
    for (const inner of step.then ?? []) {
      await runStep(inner, { ...context, sync: { assetId: step.track, markerAt: marker.at } });
    }
  }, marker.at);
}

/** A PlaylistSound's live Sound, once it exists and is actually playing. */
async function waitForSound(playlistSound, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const sound = playlistSound.parent?.sounds?.get(playlistSound.id)?.sound ?? playlistSound.sound;
    if (sound?.playing) return sound;
    await wait(120);
  }
  return null;
}

/* -------------------------------------------- */
/*  Presentation                                */
/* -------------------------------------------- */

/** Show something on every client, each at its own musical beat. */
function present(payload, sync = null) {
  broadcastAudio({ type: "audio.present", payload, sync });
}

/**
 * A scene brief's handout, revealed by the music: filed in the players' Papers
 * and opened on their screens at the marker, the same act as the scene
 * runner's own reveal button (foundry/handouts.mjs). No confirm: pressing the
 * cue is the deliberate act, and a dialog mid-phrase would miss the beat.
 *
 * Until 2026-09-26 this broadcast the handout's RAW body into a dialog on
 * every client. That skipped the renderer, so a <redact> in a music-revealed
 * handout would have shown its hidden words (a browser displays the text
 * inside a tag it does not know), and nothing it showed was kept. The marker
 * still decides WHEN; the journal opens at the GM's copy of the beat rather
 * than each client's own, which is close enough for a document.
 */
async function presentHandout(step, _sync) {
  const brief = await fetchBrief(step.brief);
  const handout = (brief?.handouts ?? []).find((h) => h.id === step.handout);
  if (!handout) throw new Error(`Scene brief "${step.brief}" has no handout "${step.handout}"`);
  const { fileHandout } = await import("./handouts.mjs");
  const handed = await fileHandout(handout, { audience: "table", confirm: false });
  if (!handed) throw new Error(`Could not hand over "${handout.title}"`);
}

const briefCache = new Map();
async function fetchBrief(briefId) {
  if (briefCache.has(briefId)) return briefCache.get(briefId);
  const { fetchModuleJson } = await import("./io.mjs");
  const doc = await fetchModuleJson(`data/campaign/scene-briefs/${briefId}.json`).catch(() => null);
  briefCache.set(briefId, doc);
  return doc;
}

/* -------------------------------------------- */
/*  Triggers                                    */
/* -------------------------------------------- */

/** Run every cue an event fires. Never throws: a broken cue must not break the event. */
export async function fireEvent(event) {
  if (!game.user?.isGM) return [];
  const audio = cachedAudio();
  if (!audio) return [];
  const cues = cuesForEvent([...audio.cues.values()], event);
  for (const cue of cues) {
    try {
      await runCue(cue, { event });
    } catch (err) {
      console.error(`Blank Inheritance | cue "${cue.id}" failed on ${event.on}:`, err);
    }
  }
  return cues;
}

/** The identifiers a trigger may name a scene by: its repo id, or its Foundry id. */
function sceneKeys(scene) {
  return [scene?.getFlag?.(MODULE_ID, "sourceId"), scene?.id, scene?.name].filter(Boolean);
}

async function onSceneActivated(scene) {
  if (!game.user.isGM || !scene) return;
  const bound = scene.getFlag(MODULE_ID, "audio")?.soundscape;
  if (bound) {
    try {
      await applySoundscape(bound);
    } catch (err) {
      console.error(`Blank Inheritance | Could not apply this scene's soundscape "${bound}":`, err);
    }
  }
  for (const key of sceneKeys(scene)) await fireEvent({ on: "scene-activate", scene: key });
}

async function onCombatStart(combat) {
  if (!game.user.isGM) return;
  for (const key of sceneKeys(combat?.scene ?? canvas?.scene)) await fireEvent({ on: "combat-start", scene: key });
  if (!game.settings.get(MODULE_ID, SETTING_AUTO_COMBAT)) return;
  const audio = cachedAudio();
  const scape = audio?.soundscapes?.get(currentSoundscapeId());
  const plan = scape ? resolveSoundscape(scape) : null;
  if (!plan?.combat) return;
  // Remember what to come back to, so the fight's music is a detour, not a change of state.
  combatMemory = { soundscapeId: currentSoundscapeId() };
  if (plan.combat.mode === "pool") await playMusicPool(plan.combat.pool, { fadeMs: 1500 });
  else await playMusicTrack(plan.combat.assetId, { fadeMs: 1500, loop: true });
}

async function onCombatEnd(combat) {
  if (!game.user.isGM) return;
  for (const key of sceneKeys(combat?.scene ?? canvas?.scene)) await fireEvent({ on: "combat-end", scene: key });
  if (combatMemory?.soundscapeId) {
    const back = combatMemory.soundscapeId;
    combatMemory = null;
    try {
      await applySoundscape(back, { fadeMs: 3000 });
    } catch (err) {
      console.error("Blank Inheritance | Could not return to the scene's own soundscape after the fight:", err);
    }
  }
}

/** Called from the module entry point when the campaign clock turns a quarter. */
export async function onSegmentChanged(moment) {
  await fireEvent({ on: "segment-advance", quarter: moment?.quarter ?? null });
}

/** Called when the stage reveals or splashes someone — a villain's theme lives here. */
export async function onCastRevealed({ actorId, sting }) {
  if (!actorId) return;
  await fireEvent({ on: sting === "splash" ? "splash" : "stage-reveal", actor: actorId });
}

export function registerAudioTriggers() {
  Hooks.on("updateScene", (scene, changed) => {
    if (changed?.active !== true) return;
    onSceneActivated(scene).catch((err) => console.error("Blank Inheritance | scene audio failed:", err));
  });
  Hooks.on("combatStart", (combat) => onCombatStart(combat).catch((err) => console.error("Blank Inheritance | combat audio failed:", err)));
  Hooks.on("deleteCombat", (combat) => onCombatEnd(combat).catch((err) => console.error("Blank Inheritance | combat audio failed:", err)));

  // Presentation lands on every client, each at its own playback position.
  onAudioMessage("audio.present", ({ payload, sync }) => {
    const delay = delayForSync(sync);
    if (!delay) return presentLocally(payload);
    setTimeout(() => presentLocally(payload), delay);
  });
}

/** How long THIS client should wait, given where its own copy of the track is. */
function delayForSync(sync) {
  if (!sync?.assetId) return 0;
  const found = soundForAsset(sync.assetId);
  const sound = found?.sound?.sound;
  return presentationDelayMs({ markerAt: sync.markerAt, currentTime: sound?.currentTime, playing: !!sound?.playing });
}

/** For the desk and for diagnostics. */
export function directorState() {
  const playing = playingGeneratedSounds();
  return {
    soundscapeId: currentSoundscapeId(),
    music: playing.filter((p) => p.playlist.channel === "music").map((p) => ({ assetId: p.assetId, name: p.sound.name, playlist: p.playlist.name })),
    ambience: playing.filter((p) => p.playlist.channel === "environment").map((p) => ({ assetId: p.assetId, name: p.sound.name, gain: p.sound.volume })),
    scatterLayers: scatterTimers.length,
    inCombat: !!combatMemory
  };
}
