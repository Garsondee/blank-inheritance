/**
 * The session progress bar — pure logic only.
 *
 * Not fictional time (that's the toprail's own Day/Time readout, driven by
 * console.js's `state` and measured in-world). This is REAL wall-clock
 * time: "I should be able to see at a glance how far through the session
 * I am," where "the session" is the actual Monday-night table, 7:30–10:30 PM
 * — the half-hour matters, because running to 10 and running to 10:30 are
 * both ordinary and only one of them should read as overrunning.
 * A GM's own meta-tool riding on top of the in-fiction console, same
 * category as the terminal's Director mode — for the person running the
 * game, not the characters in it.
 *
 * All functions take `now` as an explicit Date rather than calling
 * `new Date()` internally, so this is fully deterministic under test.
 */

const toMinutes = (h, m) => h * 60 + m;

/**
 * The window: a wider span than the session itself, so there is real
 * "not started yet" / "wrapped up" context either side of it, not just a
 * bar that is either empty or full. Defaults: 5:00 PM window open, 7:30–10:30
 * PM highlighted as the session itself, midnight window close.
 */
export function sessionWindow({
  windowStartHour = 17, windowStartMinute = 0,
  sessionStartHour = 19, sessionStartMinute = 30,
  sessionEndHour = 22, sessionEndMinute = 30,
  windowEndHour = 24, windowEndMinute = 0
} = {}) {
  const windowStart = toMinutes(windowStartHour, windowStartMinute);
  const sessionStart = toMinutes(sessionStartHour, sessionStartMinute);
  const sessionEnd = toMinutes(sessionEndHour, sessionEndMinute);
  const windowEnd = toMinutes(windowEndHour, windowEndMinute);
  if (!(windowStart <= sessionStart && sessionStart < sessionEnd && sessionEnd <= windowEnd)) {
    throw new Error("sessionWindow: expected windowStart <= sessionStart < sessionEnd <= windowEnd");
  }
  return { windowStart, sessionStart, sessionEnd, windowEnd };
}

/** "2h 5m" / "45m" — never "0h 5m", never a bare unlabelled number. */
export function formatMinutes(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}

/**
 * Where "now" sits relative to the window and the session inside it.
 *
 * @param {Date} now
 * @param {ReturnType<typeof sessionWindow>} window
 * @returns {{
 *   phase: "before"|"during"|"after",
 *   windowFrac: number,       // 0..1, clamped — where "now" sits along the WHOLE bar
 *   sessionStartFrac: number, // 0..1 — where the session begins along the bar
 *   sessionEndFrac: number,   // 0..1 — where the session ends along the bar
 *   sessionFillFrac: number,  // 0..1 — how much of the SESSION ITSELF has elapsed
 *   label: string
 * }}
 */
export function sessionProgress(now, window) {
  const { windowStart, sessionStart, sessionEnd, windowEnd } = window;
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const span = windowEnd - windowStart;
  const clampedNow = Math.max(windowStart, Math.min(windowEnd, nowMin));
  const windowFrac = span > 0 ? (clampedNow - windowStart) / span : 0;
  const sessionStartFrac = (sessionStart - windowStart) / span;
  const sessionEndFrac = (sessionEnd - windowStart) / span;

  let phase;
  let label;
  let sessionFillFrac;
  const sessionSpan = sessionEnd - sessionStart;

  if (nowMin < sessionStart) {
    phase = "before";
    sessionFillFrac = 0;
    label = `Session starts in ${formatMinutes(sessionStart - nowMin)}`;
  } else if (nowMin <= sessionEnd) {
    phase = "during";
    sessionFillFrac = (nowMin - sessionStart) / sessionSpan;
    label = `${Math.round(sessionFillFrac * 100)}% through tonight's session`;
  } else {
    phase = "after";
    sessionFillFrac = 1;
    const over = nowMin - sessionEnd;
    label = over <= 90 ? `Running ${formatMinutes(over)} over` : `Session ended ${formatMinutes(over)} ago`;
  }

  return { phase, windowFrac, sessionStartFrac, sessionEndFrac, sessionFillFrac, label };
}
