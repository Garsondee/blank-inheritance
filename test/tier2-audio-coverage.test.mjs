// Tier 2 — every authored scene keeps a soundscape, and cue/combat wiring
// stays real. 2026-09-22.
//
// WHY THIS EXISTS. A full audio sweep of Episodes One and Two found real
// coverage and correctness gaps, none visible to any prior test: 19 of 26
// scenes had no soundscape at all, because audio was built (2026-09-17,
// "seven soundscapes, one per scene brief in the opening episode" --
// design/audio-system.md's own stated baseline) before either episode grew
// past that; one cue's trigger beat id had drifted to a typo and had
// therefore NEVER fired, with the existing test for it calling
// `fireBeatAudio` using the same wrong id, so the test stayed green while the
// content was dead. All fixed the same pass: 19 soundscapes authored, the
// cue and its test both corrected, First Contact given a combat override
// matching Flood Tunnel Clearance's precedent.
//
// This file guards the coverage/correctness half of that sweep permanently.
// It DOES NOT enforce anything about which show a track's music comes from --
// an earlier version of this file also rejected 61 Evangelion-sourced music
// tracks project-wide on a tone-guardrail theory. Ingram reversed that the
// same day: EVA music is fine without reservation, and EVA-shaped STORY beats
// may be drawn on too, with the caution scoped to not landing scenes in
// trauma/misery/apocalypse rather than to the source material's mere
// presence (design/research/evangelion/tone-guardrail.md carries the actual
// wording). That is an editorial judgement, not a testable schema property,
// so nothing here checks it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const readJson = (p) => JSON.parse(readFileSync(path.join(repoRoot, p), "utf8"));

test("every scene in Episode One and Two has its own soundscape", () => {
  const scenes = [];
  for (const file of ["episode-c1e1-mothers-maiden-name", "episode-c1e2-scheduled-exercise"]) {
    const episode = readJson(`data/episodes/${file}.json`);
    for (const s of episode.scenes) if (s.briefRef) scenes.push(s.briefRef);
  }
  const have = new Set(
    readdirSync(path.join(repoRoot, "data", "audio", "soundscapes"))
      .filter((n) => n.endsWith(".json"))
      .map((n) => n.replace(/\.json$/, ""))
  );
  const missing = scenes.filter((id) => !have.has(id));
  assert.deepEqual(missing, [], "scenes with no soundscape at all -- author one, or record why the scene deliberately has none");
});

test("every combat encounter's soundscape carries its own reserved combat track", () => {
  const problems = [];
  for (const file of ["episode-c1e1-mothers-maiden-name", "episode-c1e2-scheduled-exercise"]) {
    const episode = readJson(`data/episodes/${file}.json`);
    for (const s of episode.scenes) {
      if (!s.encounterRef || !s.briefRef) continue;
      const ssPath = path.join(repoRoot, "data", "audio", "soundscapes", `${s.briefRef}.json`);
      let combat = null;
      try {
        combat = JSON.parse(readFileSync(ssPath, "utf8")).combat ?? null;
      } catch {
        problems.push(`${s.briefRef}: encounter ${s.encounterRef} but no soundscape file at all`);
        continue;
      }
      if (!combat) problems.push(`${s.briefRef}: encounter ${s.encounterRef} but soundscape has no combat field`);
    }
  }
  assert.deepEqual(problems, []);
});

test("every cue trigger's beat id exists in the scene brief it targets", () => {
  const briefCache = new Map();
  const brief = (id) => {
    if (!briefCache.has(id)) {
      try {
        briefCache.set(id, readJson(`data/scene-briefs/${id}.json`));
      } catch {
        briefCache.set(id, null);
      }
    }
    return briefCache.get(id);
  };

  const cuesDir = path.join(repoRoot, "data", "audio", "cues");
  const problems = [];
  for (const f of readdirSync(cuesDir).filter((n) => n.endsWith(".json"))) {
    const doc = JSON.parse(readFileSync(path.join(cuesDir, f), "utf8"));
    for (const t of doc.triggers ?? []) {
      if (t.on !== "beat" || !t.brief) continue;
      const b = brief(t.brief);
      if (!b) {
        problems.push(`${f}: trigger points at unknown scene brief "${t.brief}"`);
        continue;
      }
      if (!(b.beats ?? []).some((beat) => beat.id === t.beat)) {
        problems.push(`${f}: trigger beat "${t.beat}" does not exist in ${t.brief}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("the campaign overture cold-opens From Up Here, not The Road In -- moved 2026-09-24, track picked by Ingram 2026-09-27", () => {
  // Ingram asked for a "Scene 0" ahead of The Road In: From Up Here, a long
  // GM speech over one high-altitude picture of the city. The overture
  // (reserved as the campaign-open moment) belongs to whatever the campaign
  // actually opens on, so it moved with the cold open. The Road In got its
  // own track the same day, which must be a real, playable, unreserved one --
  // not the overture played twice in a row. The overture was "Main Title"
  // until Ingram picked "Ashita e no Kibou" for it instead, 2026-09-27.
  const OVERTURE = "05-masamichi-amano-ashita-e-no-kibou";
  const fromUpHere = readJson("data/audio/soundscapes/episode-c1e1--from-up-here.json");
  const roadIn = readJson("data/audio/soundscapes/episode-c1e1--the-road-in.json");
  assert.equal(fromUpHere.music?.track, OVERTURE, "From Up Here no longer plays the overture");
  assert.notEqual(roadIn.music?.track, OVERTURE, "The Road In still plays the overture -- it would open the campaign twice");

  // Nothing else anywhere may name the overture either: a soundscape or a
  // cue playing it elsewhere would make it one more mood track, not an opening.
  const others = [];
  for (const dir of ["soundscapes", "cues"]) {
    for (const f of readdirSync(path.join(repoRoot, "data", "audio", dir)).filter((n) => n.endsWith(".json"))) {
      if (dir === "soundscapes" && f === "episode-c1e1--from-up-here.json") continue;
      if (readFileSync(path.join(repoRoot, "data", "audio", dir, f), "utf8").includes(OVERTURE)) others.push(`${dir}/${f}`);
    }
  }
  assert.deepEqual(others, [], "the overture is named somewhere other than From Up Here");

  const registry = readJson("data/campaign/asset-registry.json");
  const reservation = registry.assets.find((a) => a.kind === "audio" && a.id === OVERTURE);
  assert.deepEqual(reservation?.assignedTo, { kind: "moment", ref: "campaign-open" }, "the overture lost its campaign-open reservation");

  // Its predecessor is freed, not left reserved for a track that no longer plays.
  const RETIRED_OVERTURE = "01-masamichi-amano-main-title";
  assert.ok(!registry.assets.some((a) => a.kind === "audio" && a.id === RETIRED_OVERTURE), `"${RETIRED_OVERTURE}" is still reserved after the overture moved off it`);

  // The Road In's replacement: in the library, a music track, not rejected in
  // review, and not already held for some other purpose.
  const library = readJson("data/audio/library.json");
  const review = readJson("data/audio/review.json");
  const track = roadIn.music?.track;
  const asset = library.assets.find((a) => a.id === track);
  assert.ok(asset, `The Road In names "${track}", which is not in the audio library`);
  assert.equal(asset.proposal?.kind, "music");
  assert.notEqual(review.decisions?.[track]?.status, "rejected", `"${track}" was rejected in review`);
  assert.ok(!registry.assets.some((a) => a.kind === "audio" && a.id === track), `"${track}" is reserved for something else in asset-registry.json`);
});
