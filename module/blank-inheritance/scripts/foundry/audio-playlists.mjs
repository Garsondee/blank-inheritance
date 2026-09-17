/**
 * Turning the audio library into real Foundry Playlists — design/audio-system.md §6.
 *
 * WHY PLAYLISTS AT ALL, when the module could just play Sounds itself: a
 * PlaylistSound's playing state is a DOCUMENT. Foundry replicates it to every
 * client, keeps late joiners in step, survives a player reloading mid-scene,
 * and gives the GM the native sidebar as a fallback if our own desk ever
 * breaks mid-session. Re-implementing that over a socket would be a strictly
 * worse copy of something already in the box.
 *
 * Generation follows the module's existing sync discipline
 * (design/foundry-module-design.md §1): deterministic ids derived from repo
 * ids, `keepId: true`, a content hash in a flag so a re-run with unchanged
 * data touches nothing.
 *
 * What this DOES delete: sounds and playlists it generated itself (flagged
 * `blank-inheritance.audio.generated`) that no longer belong — a track that
 * has since been reserved must leave its shuffle pool, or the villain's theme
 * turns up at random in a shopping scene. Anything a GM added by hand is
 * never touched, and neither is any other playlist in the world.
 */

import { deriveFoundryId } from "../core/ids.mjs";
import { playlistBlueprint } from "../core/audio-director.mjs";
import { loadAudio, srcFor } from "./audio-store.mjs";

const MODULE_ID = "blank-inheritance";
const FOLDER_NAME = "Blank Inheritance — Audio";

/** Our own flag on every generated document, and the marker that makes deletion safe. */
const flagFor = (payload) => ({ [MODULE_ID]: { audio: { generated: true, ...payload } } });

async function ensureFolder() {
  const id = await deriveFoundryId("audio-folder");
  const existing = game.folders.get(id);
  if (existing) return existing;
  return Folder.create({ _id: id, name: FOLDER_NAME, type: "Playlist", color: "#b45309", flags: flagFor({ kind: "folder" }) }, { keepId: true });
}

/** A PlaylistSound's document data from one blueprint sound. */
async function soundData(sound, root) {
  return {
    _id: await deriveFoundryId(`audio-sound-${sound.key}`),
    name: sound.name,
    path: `${root}/${sound.path}`.replace(`${root}/${root}/`, `${root}/`),
    volume: sound.volume,
    repeat: sound.repeat === true,
    fade: null,
    flags: flagFor({ assetId: sound.assetId })
  };
}

/**
 * Build or update every generated playlist.
 *
 * @returns {Promise<{created: string[], updated: string[], removed: string[], unchanged: string[], problems: string[]}>}
 */
export async function syncAudioPlaylists({ notify = true } = {}) {
  if (!game.user.isGM) throw new Error("Only a GM can build the audio playlists.");
  const audio = await loadAudio({ force: true });
  const blueprint = playlistBlueprint(audio.index, { webPath: (a) => srcFor(a, audio.root) });
  const folder = await ensureFolder();

  const report = { created: [], updated: [], removed: [], unchanged: [], problems: [...audio.problems] };
  const wantedIds = new Set();

  for (const plan of blueprint) {
    const id = await deriveFoundryId(`audio-playlist-${plan.key}`);
    wantedIds.add(id);
    const sounds = [];
    for (const s of plan.sounds) sounds.push(await soundData(s, audio.root));

    const existing = game.playlists.get(id);
    if (!existing) {
      await Playlist.create(
        {
          _id: id,
          name: plan.name,
          folder: folder.id,
          mode: plan.mode,
          channel: plan.channel,
          fade: plan.fade,
          sorting: "a",
          sounds,
          flags: flagFor({ key: plan.key, pool: plan.pool })
        },
        { keepId: true }
      );
      report.created.push(plan.name);
      continue;
    }

    // Header fields first, then the sounds, so a channel change (which
    // Foundry answers by stopping everything) happens once rather than per sound.
    const headerChanges = {};
    if (existing.name !== plan.name) headerChanges.name = plan.name;
    if (existing.mode !== plan.mode) headerChanges.mode = plan.mode;
    if (existing.channel !== plan.channel) headerChanges.channel = plan.channel;
    if (existing.fade !== plan.fade) headerChanges.fade = plan.fade;
    if (existing.folder?.id !== folder.id) headerChanges.folder = folder.id;
    if (Object.keys(headerChanges).length) await existing.update(headerChanges);

    const byId = new Map(existing.sounds.map((s) => [s.id, s]));
    const toCreate = [];
    const toUpdate = [];
    for (const data of sounds) {
      const current = byId.get(data._id);
      if (!current) {
        toCreate.push(data);
        continue;
      }
      const changes = {};
      for (const key of ["name", "path", "volume", "repeat"]) if (current[key] !== data[key]) changes[key] = data[key];
      if (Object.keys(changes).length) toUpdate.push({ _id: data._id, ...changes });
    }
    // Only ever delete sounds WE generated: a GM's own additions stay.
    const wantedSoundIds = new Set(sounds.map((s) => s._id));
    const toDelete = existing.sounds.filter((s) => s.getFlag(MODULE_ID, "audio")?.generated && !wantedSoundIds.has(s.id)).map((s) => s.id);

    if (toCreate.length) await existing.createEmbeddedDocuments("PlaylistSound", toCreate, { keepId: true });
    if (toUpdate.length) await existing.updateEmbeddedDocuments("PlaylistSound", toUpdate);
    if (toDelete.length) await existing.deleteEmbeddedDocuments("PlaylistSound", toDelete);

    if (toCreate.length || toUpdate.length || toDelete.length || Object.keys(headerChanges).length) report.updated.push(plan.name);
    else report.unchanged.push(plan.name);
  }

  // A generated playlist whose whole pool has gone (every track reserved, or
  // the shelf renamed) is removed — but stopped first, so nothing is left
  // playing from a document that no longer exists.
  for (const playlist of game.playlists) {
    if (!playlist.getFlag(MODULE_ID, "audio")?.generated) continue;
    if (wantedIds.has(playlist.id)) continue;
    if (playlist.playing) await playlist.stopAll();
    report.removed.push(playlist.name);
    await playlist.delete();
  }

  if (notify) {
    const line = `Audio: ${report.created.length} new, ${report.updated.length} updated, ${report.unchanged.length} unchanged${report.removed.length ? `, ${report.removed.length} removed` : ""}`;
    ui.notifications.info(line);
    if (report.problems.length) ui.notifications.warn(`Audio library has ${report.problems.length} problem(s) — see the console.`);
  }
  return report;
}

/** Every generated playlist, by the blueprint key it was built from. */
export function generatedPlaylists() {
  const out = new Map();
  for (const playlist of game.playlists ?? []) {
    const flag = playlist.getFlag(MODULE_ID, "audio");
    if (flag?.generated && flag.key) out.set(flag.key, playlist);
  }
  return out;
}

/**
 * Make sure the generated playlists exist, building them if they do not.
 *
 * Reported live by Ingram, 2026-09-18, from a world where they had never been
 * built: every soundscape threw "No music pool — build the audio playlists
 * first", as an UNCAUGHT promise rejection, from a scene cut he had not asked
 * to make any noise. Two things were wrong with that. The build is a one-time
 * step nobody was told about, and an unbuilt library is a state the system can
 * fix by itself — so it now does, rather than instructing a GM mid-session.
 *
 * Tried once per page. A second failure is a real fault (no audio data pushed,
 * no permission) and must not become a rebuild attempt on every cut.
 */
let buildAttempted = false;
export async function ensureAudioPlaylists() {
  if (generatedPlaylists().size) return true;
  if (buildAttempted || !game.user?.isGM) return false;
  buildAttempted = true;
  try {
    await syncAudioPlaylists({ notify: false });
    const built = generatedPlaylists().size;
    if (built) ui.notifications?.info(game.i18n.format("BLANKINHERITANCE.Audio.AutoBuilt", { count: built }));
    return built > 0;
  } catch (err) {
    console.error("Blank Inheritance | Could not build the audio playlists on demand:", err);
    return false;
  }
}

/** Find the PlaylistSound holding a given library asset, wherever it lives. */
export function soundForAsset(assetId) {
  for (const playlist of game.playlists ?? []) {
    for (const sound of playlist.sounds) {
      if (sound.getFlag(MODULE_ID, "audio")?.assetId === assetId) return { playlist, sound };
    }
  }
  return null;
}

/** Every generated sound currently playing, with the asset it came from. */
export function playingGeneratedSounds() {
  const out = [];
  for (const playlist of game.playlists ?? []) {
    for (const sound of playlist.sounds) {
      const flag = sound.getFlag(MODULE_ID, "audio");
      if (sound.playing && flag?.assetId) out.push({ playlist, sound, assetId: flag.assetId });
    }
  }
  return out;
}
