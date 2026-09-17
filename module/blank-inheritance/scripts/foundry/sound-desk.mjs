/**
 * The Sound Desk — the GM's mixing console. design/audio-system.md §7.
 *
 * A panel, not a pod on the deck: design/ux-doctrine.md §9 files the audio
 * mixer under "Move to the terminal (Law 13)", because it is used a few times
 * a session and the chassis belongs to what happens inside a turn. Same
 * toggle chassis as the Summon panel and the City Board.
 *
 * Three things are imperative rather than re-rendered, on purpose:
 *   - the VU needles (a meter repainting through Handlebars sixty times a
 *     second would be absurd),
 *   - a fader being dragged (the cap follows the pointer; the document write
 *     happens on release),
 *   - the "on air" elapsed readout.
 * Everything else is an ordinary ApplicationV2 render.
 */

import { deskChannels, faderDbFromPointer, faderFrame, libraryRow, meterFaceGeometry, nowPlayingModel, paginate, vuNeedleDegrees, LIBRARY_FILTERS } from "../core/audio-desk.mjs";
import { searchLibrary } from "../core/audio-library.mjs";
import { FADE_STEPS_MS, VU_REFERENCE_DBFS, dbToFader, dbToGain, fadeLabel, formatDb, vuStep, withMixChange } from "../core/audio-mix.mjs";
import { vuFace } from "../core/vu-meter.mjs";
import { currentMix, playOneShot, readMeters, setMix } from "./audio-engine.mjs";
import {
  applySoundscape,
  directorState,
  fireSting,
  playMusicPool,
  playMusicTrack,
  runCue,
  setAmbience,
  stopAllAudio,
  stopMusic
} from "./audio-director.mjs";
import { syncAudioPlaylists, generatedPlaylists } from "./audio-playlists.mjs";
import { cachedAudio, loadAudio, refreshAudio, srcFor } from "./audio-store.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const TEMPLATE_ROOT = `modules/${MODULE_ID}/templates/console`;
const PER_PAGE = 9;

export class SoundDesk extends HandlebarsApplicationMixin(ApplicationV2) {
  #open = false;
  #query = "";
  #filter = "all";
  #page = 0;
  #fadeMs = 3000;
  #meters = { music: -Infinity, ambience: -Infinity, stings: -Infinity };
  #raf = null;
  #audition = null;
  #drag = null;

  static DEFAULT_OPTIONS = {
    id: "bi-sound-desk",
    tag: "div",
    classes: ["bi-desk-standalone"],
    window: { frame: false, positioned: false },
    actions: {
      toggle: SoundDesk.#onToggle,
      stopAll: SoundDesk.#onStopAll,
      stopMusic: SoundDesk.#onStopMusic,
      cycleFade: SoundDesk.#onCycleFade,
      applyScape: SoundDesk.#onApplyScape,
      fireCue: SoundDesk.#onFireCue,
      setFilter: SoundDesk.#onSetFilter,
      pageBy: SoundDesk.#onPageBy,
      playAsset: SoundDesk.#onPlayAsset,
      playPool: SoundDesk.#onPlayPool,
      layerAsset: SoundDesk.#onLayerAsset,
      fireAsset: SoundDesk.#onFireAsset,
      audition: SoundDesk.#onAudition,
      muteBus: SoundDesk.#onMuteBus,
      nudgeBus: SoundDesk.#onNudgeBus,
      rebuild: SoundDesk.#onRebuild,
      refresh: SoundDesk.#onRefresh
    }
  };

  static PARTS = { body: { template: `${TEMPLATE_ROOT}/sound-desk.hbs` } };

  /** Persistent chrome mounts into #interface, same idiom as every other panel here. */
  async _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else (document.getElementById("interface") ?? document.body).append(element);
    return element;
  }

  get open() {
    return this.#open;
  }

  /** @override */
  async _prepareContext() {
    const audio = cachedAudio() ?? (await loadAudio());
    const index = audio?.index ?? { assets: new Map(), pools: {} };
    const mix = currentMix();
    const state = directorState();

    const kinds = this.#filter === "all" ? null : [this.#filter];
    const matches = searchLibrary(index, this.#query, { kinds, limit: 400 })
      .map(libraryRow)
      .map((row) => ({ ...row, auditioning: row.id === this.#audition?.assetId }));
    const pageData = paginate(matches, this.#page, PER_PAGE);

    return {
      open: this.#open,
      face: vuFace({ min: -20, max: 3, danger: { from: 0, to: 3 }, labelCount: 5, minorPerGap: 2 }),
      meterGeometry: meterFaceGeometry(),
      channels: deskChannels(mix, {}).map((c) => ({ ...c, faderFrame: faderFrame(c.fader) })),
      duckLabel: formatDb(mix.duckDb),
      fadeLabel: fadeLabel(this.#fadeMs),
      nowPlaying: nowPlayingModel(state, index),
      pools: Object.entries(index.pools ?? {})
        .map(([pool, ids]) => ({ pool, label: pool.replace(/-/g, " "), count: ids.length }))
        .sort((a, b) => a.pool.localeCompare(b.pool)),
      soundscapes: [...(audio?.soundscapes?.values() ?? [])].map((s) => ({
        id: s.id,
        title: s.title ?? s.id,
        current: s.id === state.soundscapeId
      })),
      cues: [...(audio?.cues?.values() ?? [])].map((c) => ({ id: c.id, title: c.title ?? c.id })),
      filters: LIBRARY_FILTERS.map((f) => ({ id: f, label: f === "all" ? game.i18n.localize("BLANKINHERITANCE.Audio.All") : f, current: f === this.#filter })),
      query: this.#query,
      rows: pageData.items,
      page: { index: pageData.page + 1, pages: pageData.pages, total: pageData.total },
      auditionId: this.#audition?.assetId ?? null,
      problems: audio?.problems ?? [],
      built: generatedPlaylists().size > 0
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element;
    if (!root) return;

    const search = root.querySelector("[data-desk-search]");
    if (search && !search.dataset.biBound) {
      search.dataset.biBound = "1";
      search.addEventListener("input", foundry.utils.debounce((event) => {
        this.#query = event.target.value ?? "";
        this.#page = 0;
        this.render({});
      }, 200));
    }

    for (const track of root.querySelectorAll("[data-fader-bus]")) {
      if (track.dataset.biBound) continue;
      track.dataset.biBound = "1";
      track.addEventListener("pointerdown", (event) => this.#startFaderDrag(event, track));
    }

    if (this.#open) this.#startMeters();
    else this.#stopMeters();
  }

  /* ------------------------------------------ */
  /*  Faders                                    */
  /* ------------------------------------------ */

  #startFaderDrag(event, track) {
    event.preventDefault();
    const bus = track.dataset.faderBus;
    const rect = track.getBoundingClientRect();
    const cap = track.querySelector(".bi-fader");
    const readout = this.element.querySelector(`[data-fader-readout="${bus}"]`);
    const move = (ev) => {
      const db = faderDbFromPointer({ top: rect.top, height: rect.height, pointerY: ev.clientY });
      this.#drag = { bus, db };
      // The cap follows the pointer immediately; the world setting is written
      // once, on release — a fader dragged across its travel must not write
      // a document per frame to every client at the table.
      if (cap) cap.style.setProperty("--frame", String(faderFrame(dbToFader(db))));
      if (readout) readout.textContent = formatDb(db);
    };
    const up = async () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!this.#drag) return;
      const { bus: b, db } = this.#drag;
      this.#drag = null;
      await setMix(withMixChange(currentMix(), { [b]: db }));
      this.render({});
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    move(event);
  }

  /* ------------------------------------------ */
  /*  Meters                                    */
  /* ------------------------------------------ */

  /**
   * One frame of metering. Factored out of the animation loop so it can be
   * driven directly — by a test, or by a diagnostic — rather than only by
   * requestAnimationFrame, which is fully SUSPENDED whenever the window is
   * hidden and therefore cannot be relied on to prove anything.
   * Returns what it wrote, so a caller can check it.
   */
  paintMeters(dtMs = 16) {
    const written = {};
    if (!this.element?.isConnected) return written;
    const levels = readMeters();
    for (const bus of ["music", "ambience", "stings"]) {
      const level = levels[bus] ?? { rmsDb: -Infinity, peakDb: -Infinity };
      this.#meters[bus] = vuStep(this.#meters[bus], level.rmsDb, dtMs);
      const needle = this.element.querySelector(`[data-vu-needle="${bus}"]`);
      // The face sweeps 96 degrees about vertical (core/vu-meter.mjs), so the
      // needle only ever needs one CSS variable written per frame.
      const deg = vuNeedleDegrees(this.#meters[bus] - VU_REFERENCE_DBFS);
      if (needle) needle.style.setProperty("--needle", `${deg.toFixed(2)}deg`);
      const lamp = this.element.querySelector(`[data-vu-clip="${bus}"]`);
      if (lamp) lamp.classList.toggle("is-lit", Number.isFinite(level.peakDb) && level.peakDb > -0.5);
      written[bus] = { rmsDb: level.rmsDb, deg };
    }
    return written;
  }

  #startMeters() {
    if (this.#raf) return;
    let last = performance.now();
    const tick = (now) => {
      if (!this.#open || !this.element?.isConnected) {
        this.#raf = null;
        return;
      }
      this.paintMeters(now - last);
      last = now;
      this.#raf = requestAnimationFrame(tick);
    };
    this.#raf = requestAnimationFrame(tick);
  }

  #stopMeters() {
    if (this.#raf) cancelAnimationFrame(this.#raf);
    this.#raf = null;
  }

  /* ------------------------------------------ */
  /*  Actions                                   */
  /* ------------------------------------------ */

  toggle() {
    SoundDesk.#onToggle.call(this);
  }

  static #onToggle() {
    this.#open = !this.#open;
    if (!this.#open) this.#stopAudition();
    this.render({});
  }

  static async #onStopAll() {
    await stopAllAudio({ fadeMs: this.#fadeMs });
    this.render({});
  }

  static async #onStopMusic() {
    await stopMusic({ fadeMs: this.#fadeMs });
    this.render({});
  }

  static #onCycleFade() {
    const i = FADE_STEPS_MS.indexOf(this.#fadeMs);
    this.#fadeMs = FADE_STEPS_MS[(i + 1) % FADE_STEPS_MS.length];
    this.render({});
  }

  static async #onApplyScape(event, target) {
    await applySoundscape(target.dataset.scapeId, { fadeMs: this.#fadeMs });
    this.render({});
  }

  static async #onFireCue(event, target) {
    await runCue(target.dataset.cueId);
    this.render({});
  }

  static #onSetFilter(event, target) {
    this.#filter = target.dataset.filterId;
    this.#page = 0;
    this.render({});
  }

  static #onPageBy(event, target) {
    this.#page += Number(target.dataset.by) || 0;
    this.render({});
  }

  static async #onPlayAsset(event, target) {
    await playMusicTrack(target.dataset.assetId, { fadeMs: this.#fadeMs, loop: false });
    this.render({});
  }

  static async #onPlayPool(event, target) {
    await playMusicPool(target.dataset.pool, { fadeMs: this.#fadeMs });
    this.render({});
  }

  /** Add (or remove) one ambience bed under whatever is already up. */
  static async #onLayerAsset(event, target) {
    const assetId = target.dataset.assetId;
    const state = directorState();
    const already = state.ambience.some((a) => a.assetId === assetId);
    const layers = state.ambience
      .filter((a) => a.assetId !== assetId)
      .map((a) => ({ assetId: a.assetId, gain: a.gain }));
    if (!already) layers.push({ assetId, gain: dbToGain(-6) });
    await setAmbience(layers, { fadeMs: this.#fadeMs });
    this.render({});
  }

  static async #onFireAsset(event, target) {
    await fireSting(target.dataset.assetId, {});
    this.render({});
  }

  /**
   * Pre-fade listen: the GM alone hears it, on the interface channel, nothing
   * broadcast and no document touched. This is what makes the library usable
   * mid-session — auditioning a track must never be audible at the table.
   */
  static async #onAudition(event, target) {
    const assetId = target.dataset.assetId;
    if (this.#audition?.assetId === assetId) {
      this.#stopAudition();
      this.render({});
      return;
    }
    this.#stopAudition();
    const asset = (cachedAudio()?.index?.assets ?? new Map()).get(assetId);
    const src = srcFor(asset);
    if (!src) return;
    const sound = await playOneShot({ src, kind: "interface", levelDb: -6 });
    this.#audition = { assetId, sound };
    this.render({});
  }

  #stopAudition() {
    try {
      this.#audition?.sound?.stop();
    } catch (err) {
      console.warn("Blank Inheritance | Could not stop the audition:", err);
    }
    this.#audition = null;
  }

  static async #onMuteBus(event, target) {
    const bus = target.dataset.bus;
    const mix = currentMix();
    await setMix(withMixChange(mix, { muted: { [bus]: !mix.muted[bus] } }));
    this.render({});
  }

  static async #onNudgeBus(event, target) {
    const bus = target.dataset.bus;
    const by = Number(target.dataset.by) || 0;
    const mix = currentMix();
    await setMix(withMixChange(mix, { [bus]: (mix[bus] ?? 0) + by }));
    this.render({});
  }

  static async #onRebuild() {
    const report = await syncAudioPlaylists({ notify: true });
    console.log("Blank Inheritance | Audio playlists:", report);
    this.render({});
  }

  static async #onRefresh() {
    await refreshAudio();
    this.render({});
  }
}

let active = null;

export function mountSoundDesk() {
  if (!game.user?.isGM) return null;
  if (!active) active = new SoundDesk();
  active.render({ force: true });
  return active;
}

export function toggleSoundDesk() {
  if (!game.user?.isGM) return null;
  (active ?? mountSoundDesk())?.toggle();
  return active;
}

export function refreshSoundDesk() {
  if (active?.open) active.render({});
}

/** Drive one meter frame by hand (diagnostics, and verification where rAF is suspended). */
export function paintSoundDeskMeters(dtMs = 16) {
  return active?.paintMeters(dtMs) ?? null;
}

/** For the module API and diagnostics: the desk's own state, rendering nothing. */
export function soundDeskState() {
  return {
    mounted: !!active,
    open: !!active?.open,
    assets: cachedAudio()?.index?.assets?.size ?? 0,
    playlistsBuilt: generatedPlaylists().size,
    director: directorState()
  };
}
