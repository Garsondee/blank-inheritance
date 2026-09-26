// Tier 4 — the audio adapter that WRITES DOCUMENTS (foundry/audio-playlists.mjs),
// against test/support/mock-audio-foundry.mjs.
//
// This is the riskiest audio code in the module: it creates, updates and
// deletes real world documents. What matters is not that it works once, but
// that it (a) is idempotent, (b) never touches anything a GM made by hand, and
// (c) keeps a reserved track out of every shuffle pool — a villain's theme
// heard at random in a shopping scene is no longer that villain's theme.

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";

import { installAudioMock } from "./support/mock-audio-foundry.mjs";

const AUDIO_DIR = "data/campaign/audio";

const asset = (id, kind, extra = {}) => ({
  id,
  source: { durationSec: 100, path: `audio/in-tray/${id}.wav`, sha256: `sha-${id}` },
  analysis: { integratedLufs: -18 },
  proposal: { kind, title: extra.title ?? id, category: extra.category ?? (kind === "music" ? "battle" : "weather"), tags: [], loop: kind === "ambience" },
  encode: { path: `${kind}/${id}.ogg`, sha256: `enc-${id}` },
  output: { durationSec: 100 }
});

function world({ registry = { assets: [] }, review = { decisions: {} }, assets } = {}) {
  return installAudioMock({
    moduleFiles: {
      [`${AUDIO_DIR}/library.json`]: { id: "audio-library", root: "blank-inheritance-audio", assets },
      [`${AUDIO_DIR}/review.json`]: review,
      "data/campaign/campaign/asset-registry.json": registry
    }
  });
}

async function freshModules() {
  // Each test needs its own module instances: audio-store.mjs caches the
  // library for the session, which is right in a browser and wrong here.
  const bust = `?t=${Math.random()}`;
  const playlists = await import(`../module/blank-inheritance/scripts/foundry/audio-playlists.mjs${bust}`);
  return playlists;
}

const LIBRARY = [
  asset("drums", "music", { title: "Drums of War" }),
  asset("anthem", "music", { title: "Anthem", category: "relaxed" }),
  asset("observer-theme", "music", { title: "Is Paris Burning", category: "battle" }),
  asset("rain", "ambience", { title: "Rain" }),
  asset("horn", "sting", { title: "War Horn" })
];

const RESERVED = { assets: [{ id: "observer-theme", kind: "audio", assignedTo: { kind: "npc", ref: "the-observer" } }] };

test("a first build creates one shuffle playlist per pool, a reserved soundboard and an ambience shelf", async () => {
  const mock = world({ assets: LIBRARY, registry: RESERVED });
  try {
    const { syncAudioPlaylists } = await freshModules();
    const report = await syncAudioPlaylists({ notify: false });
    const names = [...mock.playlists.values()].map((p) => p.name).sort();
    assert.deepEqual(names, ["Ambience — Weather", "Music — Battle", "Music — Relaxed", "Music — Reserved"]);
    assert.equal(report.created.length, 4);
    assert.equal(report.problems.length, 0);

    const battle = [...mock.playlists.values()].find((p) => p.name === "Music — Battle");
    assert.deepEqual(battle.sounds.map((s) => s.name), ["Drums of War"], "the reserved theme is not in the pool it would otherwise shuffle in");
    assert.equal(battle.mode, 1, "SHUFFLE");
    assert.equal(battle.channel, "music");

    const reserved = [...mock.playlists.values()].find((p) => p.name === "Music — Reserved");
    assert.equal(reserved.mode, -1, "a soundboard: reserved themes only play when asked for by name");
    assert.equal(reserved.sounds.map((s) => s.name)[0], "Is Paris Burning", "named by its music, never by whose theme it is");

    const ambience = [...mock.playlists.values()].find((p) => p.name === "Ambience — Weather");
    assert.equal(ambience.channel, "environment");
    assert.equal(ambience.sounds.map((s) => s.repeat)[0], true, "beds loop");

    const paths = [...mock.playlists.values()].flatMap((p) => p.sounds.map((s) => s.path));
    assert.ok(paths.every((p) => p.startsWith("blank-inheritance-audio/")), paths.join());
    assert.ok(!paths.some((p) => p.includes("sting/")), "fire-once sounds are deliberately not playlist material");
  } finally {
    mock.restore();
  }
});

test("building again changes nothing at all", async () => {
  const mock = world({ assets: LIBRARY, registry: RESERVED });
  try {
    const { syncAudioPlaylists } = await freshModules();
    await syncAudioPlaylists({ notify: false });
    const updatesBefore = [...mock.playlists.values()].map((p) => p.updates ?? 0);
    const second = await syncAudioPlaylists({ notify: false });
    assert.deepEqual(second.created, []);
    assert.deepEqual(second.updated, []);
    assert.equal(second.unchanged.length, 4);
    assert.deepEqual([...mock.playlists.values()].map((p) => p.updates ?? 0), updatesBefore, "an unchanged run must not write documents");
  } finally {
    mock.restore();
  }
});

test("a track that becomes reserved leaves its pool; nothing a GM added by hand is touched", async () => {
  const mock = world({ assets: LIBRARY, registry: { assets: [] } });
  try {
    const { syncAudioPlaylists } = await freshModules();
    await syncAudioPlaylists({ notify: false });
    const battle = [...mock.playlists.values()].find((p) => p.name === "Music — Battle");
    assert.equal(battle.sounds.size, 2, "both battle tracks start in the pool");

    // The GM drops their own track into our playlist. It carries no flag of ours.
    await battle.createEmbeddedDocuments("PlaylistSound", [{ _id: "gm-own-sound", name: "The GM's own track", path: "music/theirs.ogg" }]);
    // And makes a playlist of their own, which we must never consider.
    await globalThis.Playlist.create({ _id: "gm-own-playlist", name: "GM's mood board", sounds: [] });

    mock.restore();
    const mock2 = world({ assets: LIBRARY, registry: RESERVED });
    try {
      // Rebuild the same world state the second mock starts from.
      for (const [id, p] of mock.playlists) mock2.playlists.set(id, p);
      const { syncAudioPlaylists: sync2 } = await freshModules();
      const report = await sync2({ notify: false });
      const battle2 = [...mock2.playlists.values()].find((p) => p.name === "Music — Battle");
      assert.deepEqual(
        battle2.sounds.map((s) => s.name).sort(),
        ["Drums of War", "The GM's own track"],
        "the newly reserved theme was removed; the GM's own addition stayed"
      );
      assert.ok(mock2.playlists.has("gm-own-playlist"), "a playlist we did not generate is never deleted");
      assert.ok(!report.removed.includes("GM's mood board"));
    } finally {
      mock2.restore();
    }
  } catch (err) {
    mock.restore();
    throw err;
  }
});

test("a pool that empties is removed, and stopped first so nothing plays from a deleted document", async () => {
  const mock = world({ assets: LIBRARY, registry: { assets: [] } });
  try {
    const { syncAudioPlaylists } = await freshModules();
    await syncAudioPlaylists({ notify: false });
    const relaxed = [...mock.playlists.values()].find((p) => p.name === "Music — Relaxed");
    await relaxed.playAll();
    assert.equal(relaxed.playing, true);
    mock.restore();

    // Same world, but "anthem" has since been rejected in review, emptying that pool.
    const mock2 = world({ assets: LIBRARY, registry: { assets: [] }, review: { decisions: { anthem: { status: "rejected" } } } });
    try {
      for (const [id, p] of mock.playlists) mock2.playlists.set(id, p);
      const { syncAudioPlaylists: sync2 } = await freshModules();
      const report = await sync2({ notify: false });
      assert.deepEqual(report.removed, ["Music — Relaxed"]);
      assert.equal(relaxed.playing, false, "stopped before deletion");
      assert.ok(![...mock2.playlists.values()].some((p) => p.name === "Music — Relaxed"));
    } finally {
      mock2.restore();
    }
  } catch (err) {
    mock.restore();
    throw err;
  }
});

test("library problems are reported rather than thrown, so one bad reservation cannot stop a build", async () => {
  const mock = world({
    assets: LIBRARY,
    registry: { assets: [{ id: "not-a-real-asset", kind: "audio", assignedTo: { kind: "npc", ref: "nobody" } }] }
  });
  try {
    const { syncAudioPlaylists } = await freshModules();
    const report = await syncAudioPlaylists({ notify: false });
    assert.ok(report.created.length > 0, "the build still happened");
    assert.match(report.problems.join(" "), /not-a-real-asset/);
  } finally {
    mock.restore();
  }
});

test("only a GM may build the playlists", async () => {
  const mock = installAudioMock({ isGM: false, moduleFiles: {} });
  try {
    const { syncAudioPlaylists } = await freshModules();
    await assert.rejects(() => syncAudioPlaylists({ notify: false }), /Only a GM/);
  } finally {
    mock.restore();
  }
});
/* ---------------------------------------------------------------- */
/*  Building on demand (reported live, 2026-09-18)                   */
/* ---------------------------------------------------------------- */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (rel) => JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));

/** A world holding the REAL library and one real soundscape. */
function realWorld(soundscapeOverrides = null) {
  const scape = readJson("data/audio/soundscapes/episode-c1e1--canteen.json");
  if (soundscapeOverrides) Object.assign(scape, soundscapeOverrides);
  return installAudioMock({
    moduleFiles: {
      [`${AUDIO_DIR}/library.json`]: readJson("data/audio/library.json"),
      [`${AUDIO_DIR}/review.json`]: readJson("data/audio/review.json"),
      "data/campaign/campaign/asset-registry.json": readJson("data/campaign/asset-registry.json"),
      [`${AUDIO_DIR}/soundscapes/episode-c1e1--canteen.json`]: scape
    }
  });
}

async function freshAudio() {
  const bust = `?t=${Math.random()}`;
  const playlists = await import(`../module/blank-inheritance/scripts/foundry/audio-playlists.mjs${bust}`);
  const director = await import(`../module/blank-inheritance/scripts/foundry/audio-director.mjs${bust}`);
  const engine = await import(`../module/blank-inheritance/scripts/foundry/audio-engine.mjs${bust}`);
  const store = await import("../module/blank-inheritance/scripts/foundry/audio-store.mjs");
  engine.registerAudioSettings();
  // audio-store caches the library for the page, and a cache-busted director
  // still imports the SHARED store — so without this the previous test's world
  // is what the next one reads.
  await store.loadAudio({ force: true });
  return { playlists, director, engine, store };
}

test("a world whose playlists were never built builds them on demand rather than throwing at the GM", async () => {
  // Reported live by Ingram, 2026-09-18: every soundscape threw "No music pool
  // — build the audio playlists first" as an UNCAUGHT rejection, from a scene
  // cut he had not asked to make any noise. The build is a one-time step
  // nobody was told about, and an unbuilt library is a state the system can
  // fix by itself.
  const mock = realWorld();
  try {
    const { playlists, director } = await freshAudio();
    assert.equal(playlists.generatedPlaylists().size, 0, "this world starts with nothing built");

    await assert.doesNotReject(() => director.applySoundscape("episode-c1e1--canteen"));

    assert.ok(playlists.generatedPlaylists().size > 0, "the playlists should have been built on the way");
    const state = director.directorState();
    assert.equal(state.soundscapeId, "episode-c1e1--canteen");
    assert.ok(state.music.length > 0, "and the music should actually be playing");
  } finally {
    mock.restore();
  }
});

test("a soundscape whose music cannot start still lays its ambience beds down", async () => {
  // Half a soundscape beats an uncaught rejection and silence.
  const mock = realWorld({ music: { pool: "no-such-pool" } });
  try {
    const { playlists, director } = await freshAudio();
    await playlists.syncAudioPlaylists({ notify: false });

    await assert.doesNotReject(() => director.applySoundscape("episode-c1e1--canteen"));

    const state = director.directorState();
    assert.equal(state.music.length, 0, "the music could not start");
    assert.ok(state.ambience.length > 0, "but the beds it also named are up");
  } finally {
    mock.restore();
  }
});

test("a pool that genuinely does not exist still reports itself to whoever asked", async () => {
  // Auto-building must not turn a real mistake into silence.
  const mock = realWorld();
  try {
    const { director } = await freshAudio();
    await assert.rejects(() => director.playMusicPool("no-such-pool"), /No music pool "no-such-pool"/);
  } finally {
    mock.restore();
  }
});
