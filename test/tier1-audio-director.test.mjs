// Tier 1 — the audio director's vocabulary (scripts/core/audio-director.mjs):
// soundscapes, cues, triggers, marker timing and the playlist blueprint.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildLibraryIndex } from "../module/blank-inheritance/scripts/core/audio-library.mjs";
import {
  PLAYLIST_MODES,
  ambienceDiff,
  blueprintLocation,
  categoryTitle,
  cuesForEvent,
  nextScatterDelayMs,
  pickScatterClip,
  playlistBlueprint,
  presentationDelayMs,
  resolveSoundscape,
  stepGroups,
  validateCue,
  validateSoundscape
} from "../module/blank-inheritance/scripts/core/audio-director.mjs";

const asset = (id, kind, extra = {}) => ({
  id,
  proposal: { kind, title: extra.title ?? id, category: extra.category ?? (kind === "music" ? "battle" : "weather"), tags: [], loop: kind === "ambience" },
  source: { durationSec: extra.durationSec ?? 120 },
  output: { durationSec: extra.durationSec ?? 120 },
  encode: extra.unbuilt ? null : { path: `${kind}/${id}.ogg` }
});

const index = buildLibraryIndex({
  library: {
    assets: [
      asset("drums", "music", { title: "Drums of War" }),
      asset("anthem", "music", { title: "Anthem", category: "relaxed" }),
      asset("observer-theme", "music", { title: "Is Paris Burning", category: "baddie-theme" }),
      asset("rain", "ambience"),
      asset("cicadas", "ambience", { category: "nature" }),
      asset("horn", "sting"),
      asset("dispatch-1", "voice"),
      asset("dispatch-2", "voice"),
      asset("ghost", "music", { unbuilt: true })
    ]
  },
  review: { decisions: { "observer-theme": { markers: [{ id: "brass-hit", at: 72.5, label: "Brass" }] } } },
  registry: { assets: [{ id: "observer-theme", kind: "audio", assignedTo: { kind: "npc", ref: "the-observer" } }] }
});

const soundscape = (over = {}) => ({ id: "harbour-night", type: "audio-soundscape", title: "Harbour at night", ...over });
const cue = (over = {}) => ({ id: "observer-arrives", type: "audio-cue", title: "The Observer arrives", steps: [{ do: "music-stop" }], ...over });

test("a well-formed soundscape validates against the real library", () => {
  const doc = soundscape({
    music: { pool: "battle" },
    ambience: [{ track: "rain", level: -3 }, { track: "cicadas", level: -12 }],
    scatter: [{ tracks: ["dispatch-1", "dispatch-2"], every: [20, 60], level: -8 }],
    mix: { music: -4, ambience: 2 },
    combat: { pool: "battle" },
    fade: 4000
  });
  assert.deepEqual(validateSoundscape(doc, index), []);
});

test("soundscape validation names each real mistake", () => {
  const problems = validateSoundscape(
    soundscape({
      music: { pool: "polka", track: "drums" },
      ambience: [{ track: "horn", level: 3 }, { track: "rain" }, { track: "rain" }],
      scatter: [{ tracks: ["rain"], every: [60, 20] }],
      mix: { dialogue: 0, music: 40 },
      fade: 90000
    }),
    index
  ).join("\n");
  assert.match(problems, /exactly one of pool, track or silence/);
  assert.match(problems, /"horn" is sting, expected ambience/);
  assert.match(problems, /level must be -60 to 0 dB, got 3/);
  assert.match(problems, /"rain" is layered twice/);
  assert.match(problems, /"rain" is ambience, expected sfx or voice or sting or interface/);
  assert.match(problems, /every must be \[minSeconds, maxSeconds\]/);
  assert.match(problems, /no bus "dialogue"/);
  assert.match(problems, /mix.music: level must be -60 to 6 dB, got 40/);
  assert.match(problems, /fade must be 0-60000/);
});

test("a soundscape's music can be a pool, a reserved track, silence, or left alone", () => {
  assert.deepEqual(resolveSoundscape(soundscape()).music, { mode: "keep" });
  assert.deepEqual(resolveSoundscape(soundscape({ music: { silence: true } })).music, { mode: "silence" });
  assert.deepEqual(resolveSoundscape(soundscape({ music: { pool: "battle" } })).music, { mode: "pool", pool: "battle" });
  assert.deepEqual(resolveSoundscape(soundscape({ music: { track: "observer-theme", from: 12 } })).music, { mode: "track", assetId: "observer-theme", loop: true, from: 12 });
  const r = resolveSoundscape(soundscape({ ambience: [{ track: "rain", level: -6 }], scatter: [{ tracks: ["dispatch-1"], every: [5, 9] }] }));
  assert.ok(Math.abs(r.ambience[0].gain - 0.501) < 0.001);
  assert.deepEqual(r.scatter[0], { key: "harbour-night-0", assetIds: ["dispatch-1"], everySec: [5, 9], levelDb: 0 });
  assert.equal(r.fadeMs, 3000, "a soundscape that doesn't say gets the default crossfade");
});

test("ambienceDiff touches only what actually changes", () => {
  const current = [
    { assetId: "rain", gain: 1 },
    { assetId: "cicadas", gain: 0.5 },
    { assetId: "wind", gain: 1 }
  ];
  const target = [
    { assetId: "rain", gain: 1 },
    { assetId: "cicadas", gain: 0.25 },
    { assetId: "surf", gain: 0.7 }
  ];
  assert.deepEqual(ambienceDiff(current, target), {
    start: [{ assetId: "surf", gain: 0.7 }],
    adjust: [{ assetId: "cicadas", gain: 0.25 }],
    stop: [{ assetId: "wind" }]
  });
  assert.deepEqual(ambienceDiff(current, target, { mode: "add" }).stop, [], "add never stops a bed");
});

test("a cue with every verb validates, including a handout on a musical marker", () => {
  const doc = cue({
    triggers: [{ on: "splash", actor: "the-observer" }],
    steps: [
      { do: "sting", track: "horn", duck: -10, level: -2 },
      { do: "music", track: "observer-theme", fade: 1500 },
      { do: "wait", ms: 2000 },
      { do: "ambience", layers: [{ track: "rain", level: -9 }], mode: "add" },
      { do: "mix", music: 2, fade: 500 },
      { do: "at-marker", track: "observer-theme", marker: "brass-hit", then: [{ do: "handout", brief: "episode-c1e1--canteen", handout: "the-memo" }, { do: "banner", text: "He is here." }] },
      { do: "soundscape", ref: "harbour-night" },
      { do: "macro", name: "Lights Down" },
      { do: "ambience-stop", fade: 8000 },
      { do: "music-stop", fade: 0 }
    ]
  });
  assert.deepEqual(validateCue(doc, index, new Set(["harbour-night"])), []);
});

test("cue validation catches wrong kinds, missing markers, nesting and bad triggers", () => {
  const problems = validateCue(
    cue({
      triggers: [{ on: "lunch" }, { on: "splash", scene: "x" }],
      steps: [
        { do: "sting", track: "rain" },
        { do: "music", track: "drums", from: 500 },
        { do: "at-marker", track: "observer-theme", marker: "nope", then: [{ do: "at-marker", track: "observer-theme", marker: "brass-hit", then: [{ do: "banner", text: "x" }] }] },
        { do: "soundscape", ref: "nowhere" },
        { do: "teleport" },
        { do: "wait", ms: -1 },
        { do: "music", pool: "battle", track: "drums" }
      ]
    }),
    index,
    new Set(["harbour-night"])
  ).join("\n");
  assert.match(problems, /unknown event "lunch"/);
  assert.match(problems, /"splash" has no field "scene"/);
  assert.match(problems, /"rain" is ambience, which is not a fire-once sound/);
  assert.match(problems, /from 500s is past the end of "drums"/);
  assert.match(problems, /has no marker "nope"/);
  assert.match(problems, /markers cannot be nested/);
  assert.match(problems, /no soundscape "nowhere"/);
  assert.match(problems, /unknown step "teleport"/);
  assert.match(problems, /ms must be/);
  assert.match(problems, /needs exactly one of pool or track/);
});

test("cue validation reports assets missing from the library, and unbuilt assets are still known", () => {
  assert.match(validateCue(cue({ steps: [{ do: "sting", track: "no-such-thing" }] }), index).join(), /no asset "no-such-thing"/);
  assert.deepEqual(validateCue(cue({ steps: [{ do: "music-stop" }] }), null), [], "shape-only validation needs no library");
});

test("cuesForEvent: present fields must match, absent fields match anything", () => {
  const cues = [
    { id: "any-fight", triggers: [{ on: "combat-start" }] },
    { id: "dock-fight", triggers: [{ on: "combat-start", scene: "the-docks" }] },
    { id: "observer", triggers: [{ on: "splash", actor: "the-observer" }, { on: "stage-reveal", actor: "the-observer" }] },
    { id: "untriggered" }
  ];
  assert.deepEqual(cuesForEvent(cues, { on: "combat-start", scene: "the-docks" }).map((c) => c.id), ["any-fight", "dock-fight"]);
  assert.deepEqual(cuesForEvent(cues, { on: "combat-start", scene: "a-bar" }).map((c) => c.id), ["any-fight"]);
  assert.deepEqual(cuesForEvent(cues, { on: "stage-reveal", actor: "the-observer" }).map((c) => c.id), ["observer"]);
  assert.deepEqual(cuesForEvent(cues, { on: "splash", actor: "someone-else" }), []);
  assert.deepEqual(cuesForEvent(cues, { on: "nonsense" }), []);
});

test("stepGroups splits a cue at every wait and keeps simultaneous steps together", () => {
  const groups = stepGroups([{ do: "sting" }, { do: "music" }, { do: "wait", ms: 2000 }, { do: "banner" }, { do: "wait", ms: 500 }, { do: "wait", ms: 700 }]);
  assert.deepEqual(groups.map((g) => [g.delayMs, g.steps.map((s) => s.do)]), [
    [0, ["sting", "music"]],
    [2000, ["banner"]],
    [500, []],
    [700, []]
  ]);
});

test("presentationDelayMs lands a reveal on each client's own beat", () => {
  assert.equal(presentationDelayMs({ markerAt: 72.5, currentTime: 72.1, playing: true }), 400, "a player 400ms behind the GM waits 400ms");
  assert.equal(presentationDelayMs({ markerAt: 72.5, currentTime: 72.9, playing: true }), 0, "a client already past the beat shows it now");
  assert.equal(presentationDelayMs({ markerAt: 72.5, currentTime: 3, playing: true }), 0, "a client that restarted the track is not made to wait a minute");
  assert.equal(presentationDelayMs({ markerAt: 72.5, currentTime: 70, playing: false }), 0, "a client not playing the track shows it now rather than never");
});

test("scatter timing stays in range and never repeats a clip back to back when it can help it", () => {
  assert.equal(nextScatterDelayMs([20, 60], () => 0), 20000);
  assert.equal(nextScatterDelayMs([20, 60], () => 0.999999), 60000);
  for (let i = 0; i < 50; i++) assert.notEqual(pickScatterClip(["a", "b", "c"], "b", Math.random), "b");
  assert.equal(pickScatterClip(["only"], "only", () => 0.5), "only");
});

test("playlist blueprint: shuffle pools, a reserved soundboard, ambience shelves — and no fire-once sounds", () => {
  const bp = playlistBlueprint(index, { webPath: (a) => `blank-inheritance-audio/${a.encode.path}` });
  assert.deepEqual(bp.map((p) => p.key), ["music-battle", "music-relaxed", "music-reserved", "ambience-nature", "ambience-weather"]);
  const battle = bp.find((p) => p.key === "music-battle");
  assert.equal(battle.mode, PLAYLIST_MODES.SHUFFLE);
  assert.equal(battle.channel, "music");
  assert.deepEqual(battle.sounds.map((s) => s.assetId), ["drums"], "the unbuilt 'ghost' track is not offered");
  assert.equal(battle.sounds[0].path, "blank-inheritance-audio/music/drums.ogg");
  const reserved = bp.find((p) => p.key === "music-reserved");
  assert.equal(reserved.mode, PLAYLIST_MODES.DISABLED, "reserved themes only ever play by name");
  assert.equal(reserved.sounds[0].name, "Is Paris Burning", "named by its music, not by who it belongs to");
  assert.equal(reserved.sounds[0].repeat, true);
  const weather = bp.find((p) => p.key === "ambience-weather");
  assert.equal(weather.channel, "environment");
  assert.equal(weather.sounds[0].repeat, true);
  assert.equal(blueprintLocation(bp, "horn"), null, "stings are not playlist material");
  assert.equal(blueprintLocation(bp, "observer-theme"), "music-reserved");
});

test("categoryTitle", () => {
  assert.equal(categoryTitle("unexpected-enemy-reinforcements"), "Unexpected Enemy Reinforcements");
  assert.equal(categoryTitle(""), "");
});
