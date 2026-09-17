// tools/audio-pipeline/core/classify.mjs — the pipeline's first opinion.
// Inputs mirror REAL files from audio/in-tray/ (names, durations and embedded
// descriptions copied from the actual library, 2026-09-17).

import { test } from "node:test";
import assert from "node:assert/strict";

import { humaniseStem, musicTitle, proposeClassification, sampleTitle } from "../../tools/audio-pipeline/core/classify.mjs";

const sample = (name, durationSec, comment, extra = {}) =>
  proposeClassification({ relPath: `unorganised/${name}`, probe: { durationSec, tags: comment ? { comment, ...extra } : { ...extra } }, analysis: {} });

test("a hand-sorted music folder is trusted: kind music, category from the folder, high confidence", () => {
  const p = proposeClassification({ relPath: "music/tense/Some Cue.mp3", probe: { durationSec: 180, tags: {} } });
  assert.equal(p.kind, "music");
  assert.equal(p.category, "tense");
  assert.equal(p.confidence, "high");
  assert.equal(p.loop, false);
});

test("multi-word mood folders become slugs, and a folder that says 'sting' makes a sting", () => {
  assert.equal(proposeClassification({ relPath: "music/unexpected enemy reinforcements/x.mp3", probe: {} }).category, "unexpected-enemy-reinforcements");
  const sting = proposeClassification({ relPath: "music/bad guy introduction sting/x.mp3", probe: { durationSec: 40 } });
  assert.equal(sting.kind, "sting");
  assert.equal(sting.category, "bad-guy-introduction-sting");
});

test("music titles come from a real ID3 title, else the filename with underscores read as separators", () => {
  assert.equal(musicTitle("track01", { title: "Misato" }), "Misato");
  assert.equal(musicTitle("Is Paris Burning _ Overture_Paris Waltz", {}), "Is Paris Burning — Overture / Paris Waltz");
  assert.equal(musicTitle("x", { title: "Track 3" }), "x", "a generic 'Track 3' tag is not a title");
});

test("a theme at the top of music/ lands in 'themes' with only medium confidence", () => {
  const p = proposeClassification({ relPath: "music/Directorate Theme Song - Is Paris Burning _ Overture_Paris Waltz.mp3", probe: { durationSec: 300 } });
  assert.equal(p.kind, "music");
  assert.equal(p.category, "themes");
  assert.equal(p.confidence, "medium");
});

test("console sounds are interface: MonitorTurnOn, loginauthorised", () => {
  assert.equal(sample("MonitorTurnOn_SFXB.3762.wav", 1.29, "Monitor, Turn, On, Power, Up").kind, "interface");
  assert.equal(sample("loginauthorised.wav", 1.2, null).kind, "interface");
});

test("dispatch calls are voice on the radio shelf; an unusually long one is flagged low-confidence", () => {
  const p = sample("PoliceDispatch_S08ER.378.wav", 2.8, "Police, Dispatch, Phone, Filter, Middle, Age, Female, 911, What, Is, Your, Emergency");
  assert.equal(p.kind, "voice");
  assert.equal(p.category, "radio");
  const long = sample("ATCVoiceClip_S08TA.24.wav", 300, null);
  assert.equal(long.kind, "voice");
  assert.equal(long.confidence, "low");
});

test("the embedded description outranks the filename — a real misnamed file (found 2026-09-17)", () => {
  // Named ATCVoiceClip_S08TA.24, actually five minutes of forest ambience.
  const p = sample("ATCVoiceClip_S08TA.24.wav", 300.32, "Ambience, Forest, Birds, Light, Rain, Loop, 5-1");
  assert.equal(p.kind, "ambience", "its own description says forest, birds and rain");
  assert.equal(p.category, "nature");
  assert.match(p.reasons.join(" "), /embedded description/);
});

test("'chatter' alone is not radio traffic — a factory loop's description says 'chatter, machine, factory'", () => {
  const p = sample("ESM_EMDP1_cinematic_fx_ambience_loop_industry_factory_gear_machine_flame_03.wav", 36, "chatter, machine, factory, appliance, hum, buzz, shaking, motor, engine");
  assert.equal(p.kind, "ambience");
  assert.equal(p.category, "industrial");
  const crowd = sample("CafeCoffeeShop_S08AM.6.wav", 109, "Ambience, People, Chatter, Industry, Restraint, Loop");
  assert.equal(crowd.kind, "ambience", "a cafe's chatter is a room, not a transmission");
});

test("an explicit 'ambience loop' beats a hit-word in the same name", () => {
  const p = sample("ESM_EMDP1_cinematic_fx_ambience_loop_battle_field_explode_impact_heavy_explode_01.wav", 39, null);
  assert.equal(p.kind, "ambience", "'impact' would otherwise have made this a sting");
  assert.equal(p.loop, true);
});

test("a named one-shot event is an effect at medium confidence, not a shrug", () => {
  const p = sample("JetFlyBy_S08WA.579.wav", 25.1, "Jet, Fly By, Blue Angel, Pass Overhead");
  assert.equal(p.kind, "sfx");
  assert.equal(p.confidence, "medium");
});

test("vendor licensing boilerplate never reaches a title or a tag", () => {
  const p = sample("FF_EFX_ambience_subway_onboard.wav", 51.7, "Distributed Exclusively By  Splice.com, Subway, Onboard");
  assert.equal(p.title, "Subway Onboard");
  assert.ok(!p.tags.some((t) => /splice|distributed/.test(t)), `boilerplate leaked into tags: ${p.tags.join()}`);
  const esm = sample("ESM_3_The_Shire_Ambience_Nature_Game_Background_Atmosphere_World_Fantasy_Sci_fi_Ancient_Loopwav.wav", 71, "Fantasy World, Ambient, Atmospheric, Environments, soundscapes, Game Loop, Loopable, airy, Shire");
  assert.equal(esm.title, "The Shire", "every description term is either boilerplate or already in the name");
  assert.deepEqual(esm.tags.filter((t) => /fantasy|loopable|soundscapes|airy/.test(t)), []);
});

test("a long described place is an ambience bed that loops, shelved by what it is", () => {
  const p = sample("Cicadas_BW.174.wav", 123.4, "Cicadas, Steady Drone, Insects");
  assert.equal(p.kind, "ambience");
  assert.equal(p.category, "nature");
  assert.equal(p.loop, true);
  assert.equal(p.confidence, "high");
  assert.equal(sample("BRS_Rain_INT_Car_Pouring_Roof.wav", 168, "Rain,Interior Car,Pouring,Roof Perspective").category, "weather");
  assert.equal(sample("FactoryBodyShop_S011IN.249.wav", 270, null).category, "industrial");
});

test("a named dramatic hit is a sting even from the unsorted pile", () => {
  assert.equal(sample("MNT_HV_brass_fx_war_horn_villain_black_hole_dark_A.wav", 12, null).kind, "sting");
});

test("a short unremarkable sound is a one-shot effect", () => {
  const p = sample("CarHornHonk_BW.62202.wav", 1.5, "Car, Horn, Honk");
  assert.equal(p.kind, "sfx");
  assert.equal(p.loop, false);
});

test("a long file with no telling name is guessed as a bed, but only at low confidence", () => {
  const p = sample("Wind_02.wav", 48, null);
  assert.equal(p.kind, "ambience", "wind is a weather word, so this one is actually confident");
  const unknown = sample("Thing_7.wav", 60, null);
  assert.equal(unknown.kind, "ambience");
  assert.equal(unknown.confidence, "low");
});

test("every proposal explains itself", () => {
  for (const p of [sample("Cicadas_BW.174.wav", 123, "Cicadas"), sample("Thing.wav", 3, null), proposeClassification({ relPath: "music/fun/a.mp3", probe: {} })]) {
    assert.ok(p.reasons.length > 0, "a proposal with no reason cannot be reviewed");
  }
});

test("titles: vendor prefixes, catalogue codes, numbers and boilerplate are stripped", () => {
  assert.equal(humaniseStem("PoliceDispatch_S08ER.378"), "Police Dispatch");
  assert.equal(humaniseStem("ESM_29_God_Shrine_Ambience_Nature_Game_Background_Atmosphere_World_Fantasy_Sci_fi_Ancient_Loopwav"), "God Shrine");
  assert.equal(humaniseStem("ATCVoiceClip_S08TA.24"), "ATC Voice Clip");
  assert.equal(humaniseStem("BRS_Crowd_Teens_Party_Chatter_Reax_2"), "Crowd Teens Party Chatter Reax");
});

test("sample titles add what the embedded description says that the name does not", () => {
  assert.equal(sampleTitle("Cicadas_BW.174", "Cicadas, Steady Drone, Insects"), "Cicadas — Steady Drone, Insects");
  assert.equal(sampleTitle("MonitorTurnOn_SFXB.3762", "Monitor, Turn, On"), "Monitor Turn On", "nothing new to add");
});

test("tags drop stopwords and fragments", () => {
  const p = sample("MonitorTurnOn_SFXB.3762.wav", 1.29, "Monitor, Turn, On, Power, Up");
  assert.ok(!p.tags.includes("on") && !p.tags.includes("up"));
  assert.ok(p.tags.includes("monitor") && p.tags.includes("power"));
});
