/**
 * The Sound Desk's own model — what is on the panel, where a fader cap sits,
 * and which page of the library a search is showing. Pure; the adapter
 * (foundry/sound-desk.mjs) owns the DOM and the pointer events.
 *
 * The desk lives in a panel rather than on the deck because the doctrine puts
 * it there: design/ux-doctrine.md §9 lists the audio mixer under "Move to the
 * terminal (Law 13)" — a few uses per session must not occupy chassis space
 * that belongs to what happens inside a turn.
 */

import { AUDIO_KINDS, formatDuration } from "./audio-library.mjs";
import { VU_REFERENCE_DBFS, dbToFader, dbfsToVu, faderToDb, formatDb, normaliseMix } from "./audio-mix.mjs";

/** The three strips, in the order they appear on the panel. */
export const DESK_CHANNELS = Object.freeze([
  { bus: "music", labelKey: "BLANKINHERITANCE.Audio.Bus.Music" },
  { bus: "ambience", labelKey: "BLANKINHERITANCE.Audio.Bus.Ambience" },
  { bus: "stings", labelKey: "BLANKINHERITANCE.Audio.Bus.Stings" }
]);

/** A channel strip: its fader, its readout, and where its needle sits right now. */
export function deskChannels(mix, meters = {}) {
  const m = normaliseMix(mix);
  return DESK_CHANNELS.map(({ bus, labelKey }) => {
    const level = meters[bus] ?? { rmsDb: -Infinity, peakDb: -Infinity };
    return {
      bus,
      labelKey,
      db: m[bus],
      label: formatDb(m[bus]),
      fader: dbToFader(m[bus]),
      muted: m.muted[bus],
      vu: dbfsToVu(level.rmsDb),
      peakVu: dbfsToVu(level.peakDb),
      clipping: Number.isFinite(level.peakDb) && level.peakDb > -0.5
    };
  });
}

/**
 * Where a fader cap should sit for a pointer at `pointerY`, given the track's
 * own box. Top of the track is 1 (loudest), bottom is 0 — the way a real
 * fader works, and the opposite of how screen coordinates run.
 */
export function faderPositionFromPointer({ top, height, pointerY }) {
  if (!(height > 0)) return 0;
  const raw = 1 - (pointerY - top) / height;
  return Math.min(1, Math.max(0, raw));
}

/** The dB a drag lands on, snapped to unity when it comes close — every desk has a detent at 0. */
export function faderDbFromPointer(box, { snapWithinDb = 0.75 } = {}) {
  const db = faderToDb(faderPositionFromPointer(box));
  return Math.abs(db) <= snapWithinDb ? 0 : db;
}

/**
 * The fader graphic is a 150-frame filmstrip (frame 0 = cap at the bottom),
 * so a position becomes a frame number. Pinned by a tier-3 contract test
 * against the stylesheet, so the two can never drift apart.
 */
export const FADER_FRAMES = 150;

export function faderFrame(position) {
  return Math.round(Math.min(1, Math.max(0, Number(position) || 0)) * (FADER_FRAMES - 1));
}

/* -------------------------------------------- */
/*  Now playing                                 */
/* -------------------------------------------- */

/**
 * The playhead readout: how far into the track, how much is left.
 * A GM's real question mid-scene is "have I got time for this beat", so the
 * remaining time is what reads loudest.
 */
export function playheadModel({ currentTime, duration } = {}) {
  const t = Number(currentTime);
  const d = Number(duration);
  if (!Number.isFinite(t) || !Number.isFinite(d) || d <= 0) return { elapsed: "--:--", remaining: "--:--", progress: 0 };
  const clamped = Math.min(Math.max(t, 0), d);
  return {
    elapsed: formatDuration(clamped),
    remaining: `-${formatDuration(Math.max(0, d - clamped))}`,
    progress: Math.round((clamped / d) * 1000) / 1000
  };
}

/** One line per thing currently making noise, for the desk's "on air" panel. */
export function nowPlayingModel(state, index) {
  const asset = (id) => index?.assets?.get?.(id) ?? null;
  const row = (entry) => {
    const a = asset(entry.assetId);
    return {
      assetId: entry.assetId,
      title: a?.title ?? entry.name ?? entry.assetId,
      duration: formatDuration(a?.durationSec ?? null),
      playlist: entry.playlist ?? null,
      reserved: !!a?.reservedFor?.length,
      gainLabel: entry.gain === undefined ? null : formatDb(20 * Math.log10(Math.max(entry.gain, 0.0001)))
    };
  };
  return {
    soundscapeId: state?.soundscapeId ?? null,
    music: (state?.music ?? []).map(row),
    ambience: (state?.ambience ?? []).map(row),
    scatterLayers: state?.scatterLayers ?? 0,
    silent: !(state?.music?.length || state?.ambience?.length)
  };
}

/* -------------------------------------------- */
/*  Library browsing                            */
/* -------------------------------------------- */

/** The filters offered above the library list: everything, then one per kind. */
export const LIBRARY_FILTERS = Object.freeze(["all", ...Object.keys(AUDIO_KINDS)]);

/** Split a list into pages. A page beyond the end clamps rather than showing nothing. */
export function paginate(items, page = 0, perPage = 10) {
  const list = items ?? [];
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const current = Math.min(Math.max(0, page), pages - 1);
  return { items: list.slice(current * perPage, current * perPage + perPage), page: current, pages, total: list.length };
}

/**
 * What a library row offers depends on what the asset IS: a bed can be laid
 * under the scene, a fire-once sound can be fired, music can be played. Every
 * row can be auditioned privately by the GM first (a real desk's pre-fade
 * listen), which is the control that makes a library browsable mid-session.
 */
export function libraryRow(asset) {
  const def = AUDIO_KINDS[asset?.kind] ?? null;
  return {
    id: asset.id,
    title: asset.title ?? asset.id,
    kind: asset.kind,
    category: asset.category ?? null,
    duration: formatDuration(asset.durationSec),
    reserved: !!asset.reservedFor?.length,
    reservedFor: (asset.reservedFor ?? []).map((r) => r.ref).filter(Boolean).join(", ") || null,
    status: asset.status,
    markers: (asset.markers ?? []).length,
    canPlayMusic: asset.kind === "music",
    canLayer: asset.kind === "ambience",
    canFire: !!def?.fireOnce,
    unbuilt: !asset.encode?.path
  };
}

/* -------------------------------------------- */
/*  The meter face                              */
/* -------------------------------------------- */

/** The printed VU scale: -20..+3, with the red band from 0 up, like the north star's meter. */
export const VU_SCALE = Object.freeze({ min: -20, max: 3, danger: { from: 0, to: 3 }, reference: VU_REFERENCE_DBFS });

/** The face's sweep, matching core/vu-meter.mjs's own default: 96 degrees, centred on vertical. */
export const VU_SWEEP_DEG = 96;

/**
 * A VU face is drawn into a 200x200 box but only fills the band between its
 * printed numbers and its pivot — everything else is empty. A meter window
 * that shows the whole box either wastes two thirds of its height or, if it
 * is shifted up to compensate, cuts the numbers off (which is exactly what
 * happened, measured live 2026-09-17: three of five labels sat above the
 * window). Crop to the part that is actually drawn instead.
 *
 * Returns the cropped viewBox plus where the needle has to sit, as
 * percentages of the window, so the markup needs no magic numbers.
 */
export function meterFaceGeometry({ pivotX = 100, pivotY = 124, radius = 86, labelReach = 20, margin = 6 } = {}) {
  const top = pivotY - radius - labelReach;
  const height = pivotY - top + margin;
  const x = pivotX - radius - labelReach;
  const width = (radius + labelReach) * 2;
  return {
    viewBox: `${x} ${top} ${width} ${height}`,
    // The pivot's distance from the bottom of the crop, and the needle's own
    // length, both as a share of the window's height.
    needleBottomPct: Math.round(((height - (pivotY - top)) / height) * 10000) / 100,
    needleHeightPct: Math.round((radius / height) * 10000) / 100
  };
}

/** The needle angle for a VU reading, in degrees from vertical. */
export function vuNeedleDegrees(vu) {
  return (vuNeedlePosition(vu) - 0.5) * VU_SWEEP_DEG;
}

/** Needle position 0..1 across the printed scale. */
export function vuNeedlePosition(vu) {
  if (!Number.isFinite(vu)) return 0;
  return Math.min(1, Math.max(0, (vu - VU_SCALE.min) / (VU_SCALE.max - VU_SCALE.min)));
}
