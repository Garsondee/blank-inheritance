/**
 * The mix engine — design/audio-system.md §4. Runs on EVERY client.
 *
 * Foundry already gives each client three AudioContexts (music, environment,
 * interface), each ending in a master gain node driven by that player's own
 * volume settings. This file splices one chain into each of them:
 *
 *     ctx.gainNode ──► duck ──► bus ──┐
 *     (the player's own volume)       ├─► limiter ─► speakers
 *     sting ─► stingLevel ─► stingBus ┘
 *
 * - `bus` is the GM's fader for that channel, read from a world setting, so
 *   every client's mix moves together when the GM rides it.
 * - `duck` dips the beds under a sting and lets them back up.
 * - stings deliberately bypass `duck` (a sting must not duck itself) while
 *   still passing through a mirror of the player's own channel volume, so a
 *   player who turns music down turns musical stings down with it.
 * - `limiter` is a safety net, not a sound: normalised material never reaches
 *   it, but a GM pushing a fader to +6 dB cannot make the output clip.
 *
 * THE PLAYER'S OVERRIDE IS FOUNDRY'S OWN. We add a GM layer above it and
 * never replace it — the Radio app writes core.globalPlaylistVolume and
 * friends, so the native Playlists sidebar sliders stay in agreement with it.
 *
 * A client setting switches this whole chain off (`audioEngine`), restoring
 * Foundry's plain routing — the same discipline as the theme's kill switch:
 * a layer you cannot remove is a layer that can end a session.
 */

import { BUSES, DEFAULT_MIX, busGain, combineDucks, dbToGain, duckEnvelope, duckHoldMs, levelFromSamples, normaliseMix } from "../core/audio-mix.mjs";
import { AUDIO_KINDS } from "../core/audio-library.mjs";

const MODULE_ID = "blank-inheritance";
const SOCKET = `module.${MODULE_ID}`;
export const SETTING_MIX = "audioMix";
export const SETTING_ENGINE = "audioEngine";

/** Foundry's three contexts, and which GM fader rides each one's beds. */
const CONTEXT_BUS = Object.freeze({ music: "music", environment: "ambience", interface: null });

/** @type {Map<string, object>} */
const chains = new Map();
let activeDucks = [];
let installed = false;

/* -------------------------------------------- */
/*  Settings                                    */
/* -------------------------------------------- */

export function registerAudioSettings(onMixChange = () => {}) {
  game.settings.register(MODULE_ID, SETTING_MIX, {
    scope: "world",
    config: false,
    type: Object,
    default: { ...DEFAULT_MIX, muted: { ...DEFAULT_MIX.muted } },
    onChange: (value) => {
      applyMix(value);
      onMixChange(normaliseMix(value));
    }
  });

  game.settings.register(MODULE_ID, SETTING_ENGINE, {
    name: "BLANKINHERITANCE.Settings.AudioEngine.Name",
    hint: "BLANKINHERITANCE.Settings.AudioEngine.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
}

export function currentMix() {
  return normaliseMix(game.settings.get(MODULE_ID, SETTING_MIX));
}

/** GM-only: write the mix every client reads. */
export async function setMix(mix) {
  if (!game.user.isGM) return currentMix();
  const next = normaliseMix(mix);
  await game.settings.set(MODULE_ID, SETTING_MIX, next);
  return next;
}

/* -------------------------------------------- */
/*  The chain                                   */
/* -------------------------------------------- */

function buildChain(name, ctx) {
  const duck = ctx.createGain();
  const bus = ctx.createGain();
  const stingLevel = ctx.createGain();
  const stingBus = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;

  const bedMeter = ctx.createAnalyser();
  const stingMeter = ctx.createAnalyser();
  for (const a of [bedMeter, stingMeter]) {
    a.fftSize = 1024;
    a.smoothingTimeConstant = 0;
  }

  // Beds: Foundry's own master -> our duck -> our bus -> limiter.
  try {
    ctx.gainNode.disconnect(ctx.destination);
  } catch (err) {
    console.warn(`Blank Inheritance | ${name} context was not wired the way we expected:`, err);
  }
  ctx.gainNode.connect(duck);
  duck.connect(bus);
  bus.connect(bedMeter);
  bus.connect(limiter);

  // Stings: past the duck, but still under the player's own volume.
  stingLevel.gain.value = ctx.gainNode.gain.value;
  stingLevel.connect(stingBus);
  stingBus.connect(stingMeter);
  stingBus.connect(limiter);

  limiter.connect(ctx.destination);

  return {
    name,
    ctx,
    duck,
    bus,
    stingLevel,
    stingBus,
    limiter,
    bedMeter,
    stingMeter,
    bedData: new Float32Array(bedMeter.fftSize),
    stingData: new Float32Array(stingMeter.fftSize)
  };
}

/**
 * Build the chains. Must run after `game.audio.unlock` resolves: the contexts
 * do not exist until Foundry sees the first user gesture.
 */
export async function installAudioEngine() {
  if (installed) return chains;
  if (game.settings.get(MODULE_ID, SETTING_ENGINE) === false) {
    console.log("Blank Inheritance | Audio mixer disabled by client setting — Foundry's own routing is untouched.");
    return chains;
  }
  await game.audio.unlock;
  for (const name of Object.keys(CONTEXT_BUS)) {
    const ctx = game.audio[name];
    if (!ctx?.gainNode) continue;
    chains.set(name, buildChain(name, ctx));
  }
  installed = chains.size > 0;
  applyMix(currentMix());

  // Keep the sting path's copy of the player's own volume honest.
  for (const [hook, context] of [
    ["globalPlaylistVolumeChanged", "music"],
    ["globalAmbientVolumeChanged", "environment"],
    ["globalInterfaceVolumeChanged", "interface"]
  ]) {
    Hooks.on(hook, (volume) => {
      const chain = chains.get(context);
      if (chain) chain.stingLevel.gain.setTargetAtTime(Math.clamp(volume, 0, 1), chain.ctx.currentTime, 0.01);
    });
  }
  return chains;
}

export function isEngineInstalled() {
  return installed;
}

/** Undo the splice — for tests and for turning the mixer off without a reload. */
export function uninstallAudioEngine() {
  for (const chain of chains.values()) {
    try {
      chain.limiter.disconnect();
      chain.bus.disconnect();
      chain.duck.disconnect();
      chain.stingBus.disconnect();
      chain.stingLevel.disconnect();
      chain.ctx.gainNode.disconnect(chain.duck);
      chain.ctx.gainNode.connect(chain.ctx.destination);
    } catch (err) {
      console.warn("Blank Inheritance | Could not fully unwire the audio chain:", err);
    }
  }
  chains.clear();
  activeDucks = [];
  installed = false;
}

/** Push a mix onto the nodes. Ramped, never stepped: a fader jump is a click. */
export function applyMix(mix) {
  const m = normaliseMix(mix);
  for (const [name, busName] of Object.entries(CONTEXT_BUS)) {
    const chain = chains.get(name);
    if (!chain) continue;
    const now = chain.ctx.currentTime;
    const bedGain = busName ? busGain(m, busName) : 1;
    chain.bus.gain.setTargetAtTime(bedGain, now, 0.02);
    chain.stingBus.gain.setTargetAtTime(busName ? busGain(m, "stings") : 1, now, 0.02);
  }
}

/* -------------------------------------------- */
/*  Ducking                                     */
/* -------------------------------------------- */

/**
 * Dip the beds for `holdMs`, at `depthDb`. Overlapping stings extend the hold
 * and deepen it rather than letting the music bounce back between two hits.
 */
export function duckBeds({ depthDb, holdMs }) {
  const depth = Number(depthDb);
  if (!(depth < 0) || !installed) return;
  const now = Date.now();
  activeDucks = activeDucks.filter((d) => d.untilMs > now);
  activeDucks.push({ depthDb: depth, untilMs: now + Math.max(0, Number(holdMs) || 0) });
  const combined = combineDucks(activeDucks, now);
  if (!combined) return;

  const holdFor = Math.max(0, combined.untilMs - now);
  const envelope = duckEnvelope({ depthDb: combined.depthDb, attackMs: 120, holdMs: holdFor, releaseMs: 900 });
  for (const name of ["music", "environment"]) {
    const chain = chains.get(name);
    if (!chain) continue;
    const t0 = chain.ctx.currentTime;
    const gain = chain.duck.gain;
    gain.cancelScheduledValues(t0);
    gain.setValueAtTime(gain.value, t0);
    for (const point of envelope) gain.linearRampToValueAtTime(dbToGain(point.db), t0 + point.atMs / 1000);
  }
}

/* -------------------------------------------- */
/*  One-shots                                   */
/* -------------------------------------------- */

/**
 * Play a fire-once sound locally. `kind` picks the context (a diegetic effect
 * belongs on the environment channel, a musical hit on music), and the sound
 * is routed past the duck node so it cannot duck itself.
 *
 * Returns the Sound so a caller can stop it early; a failure is logged and
 * swallowed, because a missing sting must never break the cue around it.
 */
export async function playOneShot({ src, kind = "sting", levelDb = 0, duckDb = null, durationSec = null }) {
  if (!src) return null;
  const contextName = AUDIO_KINDS[kind]?.context ?? "interface";
  const chain = chains.get(contextName);
  const context = game.audio[contextName];
  try {
    const sound = game.audio.create({ src, context, singleton: false });
    // Set BEFORE play: Sound#_createNodes only defaults `destination` when it
    // has none, so assigning it here keeps the sting on our own path.
    if (chain) {
      chain.stingLevel.gain.value = chain.ctx.gainNode.gain.value;
      sound.destination = chain.stingLevel;
    }
    await sound.load();
    const volume = dbToGain(levelDb);
    sound.play({ volume, loop: false });
    if (duckDb !== null && duckDb !== undefined) {
      duckBeds({ depthDb: duckDb, holdMs: duckHoldMs(Number(durationSec) || sound.duration || 1) });
    }
    return sound;
  } catch (err) {
    console.error(`Blank Inheritance | Could not play "${src}":`, err);
    return null;
  }
}

/* -------------------------------------------- */
/*  Metering                                    */
/* -------------------------------------------- */

/**
 * Current levels for the desk's meters, in dBFS. Reads the analyser taps
 * directly — no state, no smoothing (core/audio-mix.mjs#vuStep does the
 * ballistics where they belong, in the thing drawing the needle).
 *
 * The reading is MONITORING-COMPENSATED: the taps sit after Foundry's own
 * per-client volume, so without this a GM listening quietly would watch their
 * meters sit at the bottom of the scale while the table heard a full mix
 * (seen live, 2026-09-17, needles pinned at rest with real programme playing).
 * A desk meter reads the programme, not how loudly the engineer is monitoring
 * it — the same correction Foundry's own analyser offers as `ignoreVolume`.
 */
export function readMeters() {
  const out = { music: { rmsDb: -Infinity, peakDb: -Infinity }, ambience: { rmsDb: -Infinity, peakDb: -Infinity }, stings: { rmsDb: -Infinity, peakDb: -Infinity } };
  const read = (chain, which) => {
    const data = which === "bed" ? chain.bedData : chain.stingData;
    (which === "bed" ? chain.bedMeter : chain.stingMeter).getFloatTimeDomainData(data);
    const level = levelFromSamples(data);
    const monitoring = chain.ctx.gainNode?.gain?.value ?? 1;
    const compensationDb = monitoring > 0 ? -20 * Math.log10(monitoring) : 0;
    return { rmsDb: level.rmsDb + compensationDb, peakDb: level.peakDb + compensationDb };
  };
  const music = chains.get("music");
  const environment = chains.get("environment");
  if (music) out.music = read(music, "bed");
  if (environment) out.ambience = read(environment, "bed");
  const stingLevels = [music, environment].filter(Boolean).map((c) => read(c, "sting"));
  if (stingLevels.length) {
    out.stings = {
      rmsDb: Math.max(...stingLevels.map((l) => l.rmsDb)),
      peakDb: Math.max(...stingLevels.map((l) => l.peakDb))
    };
  }
  return out;
}

/* -------------------------------------------- */
/*  The socket                                  */
/* -------------------------------------------- */

const handlers = new Map();

/** Register a handler for one `audio.*` socket message type. */
export function onAudioMessage(type, handler) {
  handlers.set(type, handler);
}

/**
 * Emit to every OTHER client, then run locally — Foundry's socket never
 * echoes to the sender, so a GM who only emitted would be the one person at
 * the table who did not hear the sting.
 */
export function broadcastAudio(payload) {
  game.socket.emit(SOCKET, payload);
  handlers.get(payload.type)?.(payload);
}

export function registerAudioSocket() {
  game.socket.on(SOCKET, (payload) => {
    if (!payload?.type?.startsWith?.("audio.")) return; // other subsystems share this socket
    handlers.get(payload.type)?.(payload);
  });

  onAudioMessage("audio.oneshot", (payload) => {
    playOneShot(payload);
  });
  onAudioMessage("audio.duck", (payload) => {
    duckBeds(payload);
  });
}

/** For tests and diagnostics: what the chain currently looks like. */
export function engineDiagnostics() {
  const mix = currentMix();
  return {
    installed,
    contexts: [...chains.keys()],
    mix,
    busGains: Object.fromEntries([...chains.entries()].map(([name, c]) => [name, { bed: c.bus.gain.value, sting: c.stingBus.gain.value, duck: c.duck.gain.value }])),
    ducks: activeDucks.length,
    buses: BUSES
  };
}
