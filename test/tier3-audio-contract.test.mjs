// Tier 3 — contract tests against the REAL Foundry source tree in foundryvtt/.
//
// The audio system leans on a handful of facts about Foundry that are not
// documented anywhere we control: that each audio context carries a gainNode
// wired straight to its destination (which is the wire we splice into), that a
// Sound's `destination` is only defaulted when it has none (which is how a
// sting bypasses the duck node), that PlaylistSound#sync reads `pausedTime` as
// a start offset, and the numeric values of the playlist modes and channels we
// mirror in pure code.
//
// If a Foundry upgrade changes any of these, the audio system would misbehave
// in ways that are hard to see and easy to blame on the files. This makes it
// fail loudly at `npm test` instead. See design/testing-strategy.md §3 tier 3.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AUDIO_KINDS } from "../module/blank-inheritance/scripts/core/audio-library.mjs";
import { PLAYLIST_MODES } from "../module/blank-inheritance/scripts/core/audio-director.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const appRoot = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");
const available = existsSync(appRoot);
const read = (rel) => readFileSync(path.join(appRoot, rel), "utf8");

// The local Foundry tree is gitignored, so a fresh clone has nothing to check
// against. Skip rather than fail — the same treatment tier 3 already gives the
// sf2e tree elsewhere in this suite.
const describeIf = available ? test : test.skip;

describeIf("each audio context is created with a gainNode wired straight to its destination", () => {
  const helper = read("client/audio/helper.mjs");
  assert.match(
    helper,
    /ctx\.gainNode\s*=\s*ctx\.createGain\(\);\s*ctx\.gainNode\.connect\(ctx\.destination\);/,
    "AudioHelper#createContext no longer wires gainNode -> destination; foundry/audio-engine.mjs splices exactly that wire"
  );
  assert.match(helper, /static AUDIO_CONTEXTS = Object\.freeze\(\["music", "environment", "interface"\]\)/);
});

describeIf("the three per-client volume settings the Radio writes still exist, with the same names", () => {
  const helper = read("client/audio/helper.mjs");
  for (const setting of ["globalPlaylistVolume", "globalAmbientVolume", "globalInterfaceVolume"]) {
    assert.match(helper, new RegExp(`game\\.settings\\.register\\("core", "${setting}"`), `core.${setting} is gone — the Radio writes it`);
  }
  for (const hook of ["globalPlaylistVolumeChanged", "globalAmbientVolumeChanged", "globalInterfaceVolumeChanged"]) {
    assert.match(helper, new RegExp(`Hooks\\.callAll\\("${hook}"`), `${hook} is gone — the sting path mirrors the player's volume from it`);
  }
  assert.match(helper, /static inputToVolume\(value, order=1\.5\)/, "Foundry's slider curve changed; core/audio-mix.mjs mirrors it");
});

describeIf("a Sound only defaults its destination when it has none — how a sting bypasses the duck", () => {
  const sound = read("client/audio/sound.mjs");
  assert.match(
    sound,
    /this\.destination \|\|= \(this\.#context\.gainNode \?\? this\.#context\.destination\)/,
    "Sound#_createNodes no longer respects a destination set by the caller; stings would duck themselves"
  );
  assert.match(sound, /schedule\(fn, playbackTime\)/, "Sound#schedule is what fires a cue on a musical marker");
  assert.match(sound, /async fade\(volume, \{duration=1000, from, type="linear"\}=\{\}\)/, "Sound#fade's signature changed; crossfades use it");
  assert.match(sound, /static MAX_BUFFER_DURATION = 10 \* 60/, "the 10-minute buffer/stream threshold moved — long beds stream rather than decode");
});

describeIf("PlaylistSound still reads pausedTime as a start offset, and fade from itself or its playlist", () => {
  const ps = read("client/documents/playlist-sound.mjs");
  assert.match(ps, /offset: this\.pausedTime && !sound\.playing \? this\.pausedTime : undefined/, "playing a track 'from 0:22' rides on this");
  assert.match(ps, /const fade = this\.fade \?\? this\.parent\?\.fade \?\? 0/, "per-cue crossfade lengths are written to these fields");
  assert.match(ps, /if \( sound\.playing \) \{/, "sync's already-playing branch is what forces a stop before a re-seek");
});

describeIf("the playlist modes and audio channels mirrored in pure code still match Foundry's own", () => {
  const constants = read("common/constants.mjs");
  const modes = constants.match(/export const PLAYLIST_MODES = Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(modes, "PLAYLIST_MODES not found");
  for (const [name, value] of Object.entries(PLAYLIST_MODES)) {
    assert.match(modes[1], new RegExp(`${name}:\\s*${value}\\b`), `PLAYLIST_MODES.${name} is no longer ${value}`);
  }
  const channels = constants.match(/export const AUDIO_CHANNELS = Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(channels, "AUDIO_CHANNELS not found");
  for (const kind of Object.keys(AUDIO_KINDS)) {
    assert.match(channels[1], new RegExp(`\\b${AUDIO_KINDS[kind].context}:`), `${kind} plays in the "${AUDIO_KINDS[kind].context}" channel, which Foundry no longer has`);
  }
});

describeIf("ogg is still an audio extension Foundry will accept in a FilePathField", () => {
  const constants = read("common/constants.mjs");
  const audio = constants.match(/export const AUDIO_FILE_EXTENSIONS = Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(audio, "AUDIO_FILE_EXTENSIONS not found");
  assert.match(audio[1], /ogg: "audio\/ogg"/, "the whole library is Ogg Opus");
});

describeIf("a Scene still carries the playlist fields the audio design deliberately leaves alone", () => {
  const scene = read("common/documents/scene.mjs");
  assert.match(scene, /playlist: new fields\.ForeignDocumentField\(documents\.BasePlaylist\)/);
  assert.match(scene, /playlistSound: new fields\.ForeignDocumentField\(documents\.BasePlaylistSound/);
});
