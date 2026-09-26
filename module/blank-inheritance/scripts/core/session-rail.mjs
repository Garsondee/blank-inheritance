/**
 * The session rail — a thin strip across the top of the GM's screen showing
 * where tonight's real session is: how far through it we are, how long is
 * left, which scene we are in, and every moment the log recorded. The pure
 * half: plain minutes-since-midnight in, percentages and labels out.
 *
 * Ingram's brief (2026-09-23): "a thin bar designed to show the current
 * progress through a Monday session so that I have a way to see how much time
 * is left, where we are in the session and perhaps we could record marks on
 * it when we change scenes or record things to the log."
 *
 * This is REAL wall-clock time, the same category as core/session-clock.mjs
 * (which it builds on) — a GM's meta-tool, never the fiction's day ring.
 *
 * Where we are is read from two sources, merged: every session-log entry is
 * already stamped with the scene the GM was viewing when it was written, and
 * the adapter separately notes the moment each scene was ACTIVATED for the
 * table (foundry/session-rail.mjs keeps that list in the GM's own browser, so
 * a scene change never needs a second line written into the log to show up
 * here). Both are just "at minute M, the scene was S".
 */

import { formatMinutes } from "./session-clock.mjs";

const round = (n, places = 2) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * "19:30" → 1170. Accepts H:MM or HH:MM on a 24-hour clock, 24:00 included
 * (a session that runs to midnight). Anything else is refused, loudly: a
 * typo in a setting must not silently move the whole evening.
 */
export function parseClock(text) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(String(text ?? ""));
  if (!m) throw new Error(`parseClock: expected HH:MM, got "${text}"`);
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 24 || mm > 59 || (h === 24 && mm !== 0)) throw new Error(`parseClock: not a time of day, "${text}"`);
  return h * 60 + mm;
}

/** 1170 → "19:30". Wraps past midnight, so a rail that runs late still labels its ticks. */
export function clockLabel(minutes) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Minutes since local midnight for a Date. */
export function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

/**
 * The span the rail draws: the session itself, with a lead-in before it (the
 * table gathering) and a tail after it (running over is ordinary and should
 * read as a place on the rail, not fall off its end). Capped at midnight —
 * the session log is one file per real-world day, so a rail spanning two days
 * would be reading two different logs.
 */
export function railWindow({ sessionStart = "19:30", sessionEnd = "22:30", leadIn = 30, tail = 60 } = {}) {
  const start = parseClock(sessionStart);
  const end = parseClock(sessionEnd);
  if (!(end > start)) throw new Error(`railWindow: the session must end after it starts (${sessionStart}–${sessionEnd})`);
  return {
    start: Math.max(0, start - Math.max(0, leadIn)),
    end: Math.min(1440, end + Math.max(0, tail)),
    sessionStart: start,
    sessionEnd: end
  };
}

/** Where a minute sits along the rail, 0–100, clamped to its ends. */
export function railPct(minutes, window) {
  const span = window.end - window.start;
  if (!(span > 0)) return 0;
  return round(clamp(((minutes - window.start) / span) * 100, 0, 100));
}

/**
 * Hour and half-hour ticks across the window. Hours are labelled; halves are
 * not (at a thin rail's size a label every thirty minutes is noise).
 */
export function railTicks(window) {
  const ticks = [];
  const first = Math.ceil(window.start / 30) * 30;
  for (let m = first; m <= window.end; m += 30) {
    const major = m % 60 === 0;
    ticks.push({ pct: railPct(m, window), major, label: major ? clockLabel(m) : null });
  }
  return ticks;
}

/**
 * Scene bands: consecutive stretches of the evening spent in one scene.
 *
 * `events` are `{ minutes, scene }` from both sources, in any order. A band
 * starts at the first event naming a scene and runs until the next event
 * naming a DIFFERENT one — or, for the last band, until now. Events outside
 * the window are clamped onto its edges rather than dropped, so a scene that
 * began before the lead-in still shows as the band the evening opened in.
 * Events with no scene carry no information about where we were and are
 * ignored.
 */
export function sceneBands(events = [], window, nowMinutes) {
  const sorted = events
    .filter((e) => e && typeof e.scene === "string" && e.scene.trim() && Number.isFinite(e.minutes))
    .sort((a, b) => a.minutes - b.minutes);
  const bands = [];
  for (const event of sorted) {
    const scene = event.scene.trim();
    const last = bands[bands.length - 1];
    if (last && last.scene === scene) continue;
    if (last) last.to = event.minutes;
    bands.push({ scene, from: event.minutes, to: null });
  }
  const end = Math.min(nowMinutes, window.end);
  return bands
    .map((band, i) => {
      const from = clamp(band.from, window.start, window.end);
      const to = clamp(band.to ?? end, window.start, window.end);
      return { scene: band.scene, from, to, current: i === bands.length - 1 };
    })
    .filter((band) => band.to > band.from || band.current)
    .map((band, i) => {
      const startPct = railPct(band.from, window);
      const endPct = railPct(band.to, window);
      return {
        scene: band.scene,
        startPct,
        widthPct: round(Math.max(0, endPct - startPct)),
        current: band.current,
        // Alternate shade so two neighbouring bands never read as one.
        shade: i % 2,
        from: clockLabel(band.from),
        to: clockLabel(band.to),
        length: formatMinutes(band.to - band.from)
      };
    });
}

/**
 * One pin per log entry. A deliberate bookmark (an entry whose text is the
 * word "Mark", which is what the rail's own Mark key writes) gets its own
 * kind so it can be drawn taller; a tagged entry keeps its tag so the rail can
 * colour decisions differently from rules calls. Pins before the window or
 * after now are dropped: a pin in the future is a bug, and one before the
 * lead-in has nowhere honest to sit.
 */
export const MARK_TEXT = "Mark";

export function railMarks(entries = [], window, nowMinutes) {
  return entries
    .filter((e) => e && Number.isFinite(e.minutes) && e.minutes >= window.start && e.minutes <= Math.min(window.end, nowMinutes + 1))
    .sort((a, b) => a.minutes - b.minutes)
    .map((e) => {
      const text = String(e.text ?? "").trim();
      const isMark = text === MARK_TEXT || text.startsWith(`${MARK_TEXT} —`);
      return {
        pct: railPct(e.minutes, window),
        kind: isMark ? "mark" : e.tag ? "tag" : "entry",
        tag: e.tag ?? null,
        time: clockLabel(e.minutes),
        text
      };
    });
}

/**
 * The whole rail for one moment.
 *
 * `phase` and the label follow core/session-clock.mjs's own three states, in
 * the rail's own short words: a thin strip has room for "1h 12m left", not a
 * sentence.
 */
export function railModel({ nowMinutes, window, entries = [], sceneEvents = [] }) {
  const { sessionStart, sessionEnd } = window;
  let phase;
  let remaining;
  if (nowMinutes < sessionStart) {
    phase = "before";
    remaining = `Starts in ${formatMinutes(sessionStart - nowMinutes)}`;
  } else if (nowMinutes <= sessionEnd) {
    phase = "during";
    remaining = `${formatMinutes(sessionEnd - nowMinutes)} left`;
  } else {
    phase = "after";
    remaining = `${formatMinutes(nowMinutes - sessionEnd)} over`;
  }
  const sessionFill = phase === "before" ? 0 : phase === "after" ? 1 : (nowMinutes - sessionStart) / (sessionEnd - sessionStart);
  const events = [
    ...sceneEvents,
    ...entries.map((e) => ({ minutes: e.minutes, scene: e.scene ?? null }))
  ];
  const bands = sceneBands(events, window, nowMinutes);
  return {
    phase,
    remaining,
    clock: clockLabel(nowMinutes),
    percent: Math.round(sessionFill * 100),
    nowPct: railPct(nowMinutes, window),
    sessionStartPct: railPct(sessionStart, window),
    sessionEndPct: railPct(sessionEnd, window),
    sessionWidthPct: round(railPct(sessionEnd, window) - railPct(sessionStart, window)),
    overPct: round(100 - railPct(sessionEnd, window)),
    sessionLabel: `${clockLabel(sessionStart)}–${clockLabel(sessionEnd)}`,
    ticks: railTicks(window),
    bands,
    currentScene: bands.find((b) => b.current)?.scene ?? null,
    marks: railMarks(entries, window, nowMinutes)
  };
}
