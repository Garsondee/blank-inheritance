// Tier 1 — the audio library's shared rules (scripts/core/audio-library.mjs):
// loudness targets, gain planning, ids, and how library + review + registry
// combine into what the desk and the playlist builder actually use.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AUDIO_KINDS,
  ENCODE_CEILING_DBTP,
  KIND_NAMES,
  TRUE_PEAK_CEILING_DBTP,
  audioReservations,
  buildLibraryIndex,
  effectiveAsset,
  formatDuration,
  measuredLoudness,
  normaliseMarkers,
  planGain,
  searchLibrary,
  slugify,
  stemToIdBase,
  uniqueAssetId,
  webPathFor
} from "../module/blank-inheritance/scripts/core/audio-library.mjs";

test("every kind names one of Foundry's three real audio contexts and a sane target", () => {
  for (const kind of KIND_NAMES) {
    const def = AUDIO_KINDS[kind];
    assert.ok(["music", "environment", "interface"].includes(def.context), `${kind} plays in an unknown context`);
    assert.ok(def.targetLufs < -6 && def.targetLufs > -40, `${kind} target out of range`);
    assert.ok(["integrated", "short-term"].includes(def.measure));
  }
  assert.ok(AUDIO_KINDS.ambience.targetLufs < AUDIO_KINDS.music.targetLufs, "ambience sits under music at unity faders");
  assert.ok(AUDIO_KINDS.sting.targetLufs > AUDIO_KINDS.music.targetLufs, "a sting punches through the score");
});

test("measuredLoudness: beds by integrated loudness, hits by their loudest 3s, with honest fallbacks", () => {
  const a = { integratedLufs: -20, maxShortTermLufs: -15, maxMomentaryLufs: -12 };
  assert.deepEqual(measuredLoudness("music", a, 200), { value: -20, basis: "integrated" });
  assert.deepEqual(measuredLoudness("sting", a, 10), { value: -15, basis: "short-term" });
  assert.deepEqual(measuredLoudness("sting", a, 1.3), { value: -12, basis: "momentary" }, "too short for a short-term window");
  assert.deepEqual(measuredLoudness("ambience", { integratedLufs: -70, maxShortTermLufs: -52 }, 60), { value: -52, basis: "short-term" });
  assert.deepEqual(measuredLoudness("sfx", {}, 5), { value: null, basis: null });
  assert.throws(() => measuredLoudness("podcast", a, 5), /Unknown audio kind/);
});

test("planGain: a loud master is simply turned down", () => {
  const g = planGain({ kind: "music", analysis: { integratedLufs: -9.4, truePeakDbtp: 0.8 }, durationSec: 200 });
  assert.equal(g.gainDb, -8.6);
  assert.equal(g.limitDb, null);
  assert.equal(g.shortfallDb, 0);
});

test("planGain: a quiet track is lifted, with a limiter catching peaks when the overshoot is small", () => {
  const g = planGain({ kind: "music", analysis: { integratedLufs: -22, truePeakDbtp: -3 }, durationSec: 200 });
  assert.equal(g.gainDb, 4);
  assert.equal(g.limitDb, ENCODE_CEILING_DBTP, "encoding aims a dB under the real ceiling, to absorb the codec's own overshoot");
  assert.equal(g.shortfallDb, 0);
});

test("planGain: a very dynamic quiet track keeps its dynamics and plays under target instead", () => {
  const g = planGain({ kind: "music", analysis: { integratedLufs: -30, truePeakDbtp: -2 }, durationSec: 200 });
  assert.equal(g.gainDb, 4, "capped at 4 dB of limiting above the encode ceiling");
  assert.equal(g.shortfallDb, 8);
  assert.equal(g.limitDb, ENCODE_CEILING_DBTP);
});

test("the encode ceiling sits under the verification ceiling — nine real files came back hotter than their sources", () => {
  assert.ok(ENCODE_CEILING_DBTP < TRUE_PEAK_CEILING_DBTP);
});

test("planGain: nothing measurable means no gain, flagged silent", () => {
  const g = planGain({ kind: "sfx", analysis: {}, durationSec: 2 });
  assert.equal(g.silent, true);
  assert.equal(g.gainDb, 0);
});

test("ids: real sound-library names lose their vendor code but keep the number that tells them apart", () => {
  assert.equal(stemToIdBase("Cicadas_BW.174"), "cicadas-174");
  assert.equal(stemToIdBase("PoliceDispatch_S08ER.378"), "police-dispatch-378");
  assert.equal(stemToIdBase("SportsCrowd_S011SSFX.282"), "sports-crowd-282");
  assert.equal(stemToIdBase("ATCVoiceClip_S08TA.24"), "atc-voice-clip-24");
  assert.equal(stemToIdBase("Is Paris Burning _ Overture_Paris Waltz"), "is-paris-burning-overture-paris-waltz");
  assert.equal(stemToIdBase("DS_TD2_145_melodic_stack_dust_D#min"), "ds-td2-145-melodic-stack-dust-d-min");
  assert.equal(stemToIdBase("!!!"), "untitled");
});

test("slugify splits camelCase, strips accents, and trims long names at a word boundary", () => {
  assert.equal(slugify("MonitorTurnOn"), "monitor-turn-on");
  assert.equal(slugify("Café Déjà Vu"), "cafe-deja-vu");
  assert.equal(slugify("Rock & Roll"), "rock-and-roll");
  const long = slugify("a".repeat(10) + " " + "b".repeat(60), 64);
  assert.ok(long.length <= 64 && !long.endsWith("-"));
});

test("uniqueAssetId suffixes a clash instead of sharing an id", () => {
  assert.equal(uniqueAssetId("Theme", []), "theme");
  assert.equal(uniqueAssetId("Theme", ["theme"]), "theme-2");
  assert.equal(uniqueAssetId("Theme", new Set(["theme", "theme-2"])), "theme-3");
});

const entry = (id, proposal, extra = {}) => ({
  id,
  proposal: { kind: "music", title: id, category: "battle", tags: [], loop: false, ...proposal },
  source: { durationSec: 180 },
  encode: { path: `${proposal.kind ?? "music"}/${id}.ogg` },
  output: { durationSec: 180 },
  ...extra
});

test("effectiveAsset: review decisions override the proposal field by field; nonsense kinds are ignored", () => {
  const e = entry("a", { kind: "sfx", title: "Proposed", tags: ["x"] });
  const out = effectiveAsset(e, { status: "confirmed", kind: "sting", title: "Mine", tags: ["y"], kindConfusion: 1 });
  assert.equal(out.kind, "sting");
  assert.equal(out.title, "Mine");
  assert.deepEqual(out.tags, ["y"]);
  assert.equal(out.status, "confirmed");
  assert.equal(effectiveAsset(e, { kind: "podcast" }).kind, "sfx");
  assert.equal(effectiveAsset(e, { status: "maybe" }).status, "proposed");
});

test("markers are sorted, de-duplicated, and anything outside the track is dropped", () => {
  const m = normaliseMarkers(
    [
      { id: "drop", at: 72.35 },
      { id: "intro", at: 1.2, label: "Intro" },
      { id: "drop", at: 90 },
      { id: "Bad Id", at: 5 },
      { id: "late", at: 999 },
      { id: "neg", at: -1 }
    ],
    180
  );
  assert.deepEqual(m, [
    { id: "intro", at: 1.2, label: "Intro" },
    { id: "drop", at: 72.35, label: "drop" }
  ]);
});

const registry = {
  assets: [
    { id: "observer-theme", kind: "audio", assignedTo: { kind: "npc", ref: "the-observer" } },
    { id: "some-image", kind: "image", assignedTo: { kind: "scene", ref: "x" } },
    { id: "twice", kind: "audio", assignedTo: { kind: "npc", ref: "a" } },
    { id: "twice", kind: "audio", assignedTo: { kind: "location", ref: "b" } },
    { id: "ghost", kind: "audio", assignedTo: { kind: "scene", ref: "c" } }
  ]
};

test("audio reservations come only from audio entries in the shared asset registry", () => {
  const r = audioReservations(registry);
  assert.equal(r.has("some-image"), false);
  assert.deepEqual(r.get("observer-theme"), [{ kind: "npc", ref: "the-observer", note: null }]);
  assert.equal(r.get("twice").length, 2);
});

test("the index keeps reserved and rejected tracks out of every shuffle pool", () => {
  const library = {
    assets: [
      entry("observer-theme", { category: "baddie-theme" }),
      entry("battle-a", {}),
      entry("battle-b", {}),
      entry("battle-bad", {}),
      entry("twice", {}),
      entry("rain", { kind: "ambience", category: "weather" }),
      entry("unbuilt", {}, { encode: null })
    ]
  };
  const review = { decisions: { "battle-bad": { status: "rejected" } } };
  const index = buildLibraryIndex({ library, review, registry });
  assert.deepEqual(index.pools.battle, ["battle-a", "battle-b"], "reserved 'twice', rejected and unbuilt tracks never shuffle in");
  assert.equal(index.pools["baddie-theme"], undefined, "a category holding only a reserved theme has no pool at all");
  assert.deepEqual(index.byKind.ambience, ["rain"]);
  assert.deepEqual(index.assets.get("observer-theme").reservedFor.map((r) => r.ref), ["the-observer"]);
  assert.ok(index.assets.has("battle-bad"), "rejected assets stay visible to a report");
});

test("the index names every reservation problem a human must fix", () => {
  const index = buildLibraryIndex({ library: { assets: [entry("twice", {}), entry("observer-theme", {})] }, review: {}, registry });
  const kinds = index.problems.map((p) => `${p.kind}:${p.id}`).sort();
  assert.deepEqual(kinds, ["double-reservation:twice", "missing-asset:ghost"]);
});

test("search: every term must match; title hits outrank tag hits; filters apply", () => {
  const library = {
    assets: [
      entry("storm-drums", { title: "Storm Drums", tags: ["percussion"] }),
      entry("quiet-rain", { kind: "ambience", title: "Quiet Rain", tags: ["storm"], category: "weather" }),
      entry("observer-theme", { title: "Observer", tags: ["storm"] })
    ]
  };
  const index = buildLibraryIndex({ library, review: {}, registry });
  assert.deepEqual(
    searchLibrary(index, "storm").map((a) => a.id),
    ["storm-drums", "observer-theme", "quiet-rain"],
    "the title match ranks first; equal tag matches fall back to title order"
  );
  assert.deepEqual(searchLibrary(index, "storm rain").map((a) => a.id), ["quiet-rain"]);
  assert.deepEqual(searchLibrary(index, "storm", { kinds: ["ambience"] }).map((a) => a.id), ["quiet-rain"]);
  assert.ok(!searchLibrary(index, "storm", { includeReserved: false }).some((a) => a.id === "observer-theme"));
});

test("formatDuration and webPathFor", () => {
  assert.equal(formatDuration(187.9), "3:07");
  assert.equal(formatDuration(3765), "1:02:45");
  assert.equal(formatDuration(null), "--:--");
  assert.equal(webPathFor({ encode: { path: "music/misato.ogg" } }), "blank-inheritance-audio/music/misato.ogg");
  assert.equal(webPathFor({ encode: null }), null);
});
