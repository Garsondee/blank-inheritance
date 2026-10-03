/**
 * How each screen at the table is coping. Pure.
 *
 * Every screen drawing a stage reports now and then, over the module's socket, what it is drawing with and how well: which
 * picture (lit, low, plain), its frame rate, its graphics card, anything that has gone wrong. The GM's screen gathers the
 * reports into one small board, so a player whose computer is struggling is seen at the table, in the first minutes, not
 * after a session of "it's a bit laggy". This file decides what a report holds, what an incoming one is trusted to be, and
 * what a board says about it; the foundry layer (foundry/health.mjs) measures and sends and shows.
 *
 * It is a relaxed game with friends: a report is believed as it arrives (its sender is the server's word, not its own), and
 * it carries nothing that is not about the picture.
 */

export const HEALTH = Object.freeze({
  every: 20000,        // ms between a screen's own reports
  stale: 75000,        // a report older than this is not news: the player has left the stage, or the page has stopped
  fine: 40,            // frames a second and above is fine
  poor: 24,            // below this is bad
  window: 300,         // frame intervals kept to work the frame rate out
  gap: 400             // an interval longer than this ms (a hidden tab, a stall) is not a frame
});

export const PICTURES = Object.freeze(["lit", "low", "plain"]);

/** { fps, worst, n } from the last frame intervals (ms): the median frame rate, and the longest honest frame. */
export function frameStats(intervals, { gap = HEALTH.gap, least = 10 } = {}) {
  const live = (intervals ?? []).filter((d) => Number.isFinite(d) && d > 0 && d <= gap);
  if (live.length < least) return { fps: null, worst: null, n: live.length };
  const sorted = [...live].sort((a, b) => a - b);
  return { fps: Math.round(1000 / sorted[Math.floor(sorted.length / 2)]), worst: Math.round(sorted[sorted.length - 1]), n: live.length };
}

/** The picture a backend and a tier make: "lit", "low" or "plain". */
export const pictureOf = (backend, tier) => (backend === "flat" || tier === "flat" ? "plain" : tier === "low" ? "low" : "lit");

/** A card's name as a short label: the graphics card, without the browser's wrapping ("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 ...)"). */
export function shortGpu(name) {
  let s = typeof name === "string" ? name.trim() : "";
  const angle = /^ANGLE \((.*)\)$/i.exec(s);
  if (angle) {
    const parts = angle[1].split(",").map((p) => p.trim());
    s = parts.length > 1 ? parts[1] : parts[0];
  }
  s = s.replace(/\s*(Direct3D\d*|OpenGL|Metal|vs_\d_\d|ps_\d_\d|\(0x[0-9a-f]+\)).*$/i, "").replace(/\s{2,}/g, " ").trim();
  return s.length > 34 ? `${s.slice(0, 33)}…` : s;
}

/** A whole number clamped to lo..hi, or null if it is not a number (null, "", an array and the rest are not 0). */
const num = (v, lo, hi) => ((typeof v === "number" || (typeof v === "string" && v.trim() !== "")) && Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : null);
const text = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

/**
 * What a screen sends. `sample` is { backend, tier, stats: { fps, worst }, probe, gpu, dpr, size, losses, failures, hidden,
 * scene }; the report is the same, trimmed to what a board can use.
 */
export function makeReport(sample) {
  return {
    v: 1,
    picture: pictureOf(sample.backend, sample.tier),
    fps: num(sample.stats?.fps, 0, 1000),
    worst: num(sample.stats?.worst, 0, 60000),
    probe: sample.probe == null ? null : Math.round(Number(sample.probe) * 10) / 10,
    gpu: shortGpu(sample.gpu),
    dpr: Math.round((Number(sample.dpr) || 1) * 100) / 100,
    size: [num(sample.size?.[0], 0, 20000) ?? 0, num(sample.size?.[1], 0, 20000) ?? 0],
    losses: num(sample.losses, 0, 99) ?? 0,
    failures: num(sample.failures, 0, 9999) ?? 0,
    hidden: sample.hidden === true,
    scene: text(sample.scene, 60)
  };
}

/** An incoming message as a report, or null if it is not one (never trust the shape of what arrives). */
export function readReport(message) {
  if (!message || message.type !== "health" || message.op === "ask" || message.v !== 1) return null;
  if (!PICTURES.includes(message.picture)) return null;
  return makeReport({
    backend: message.picture === "plain" ? "flat" : "three", tier: message.picture === "low" ? "low" : message.picture === "plain" ? "flat" : "high",
    stats: { fps: message.fps, worst: message.worst }, probe: message.probe, gpu: message.gpu, dpr: message.dpr, size: message.size,
    losses: message.losses, failures: message.failures, hidden: message.hidden, scene: message.scene
  });
}

/** "ok" (fine), "plain" (on the plain stage), "warn" (a low frame rate), "bad" (a very low one, or something has failed), "idle" (in the background) or "stale". */
export function levelOf(report, at, now) {
  if (!report || now - at > HEALTH.stale) return "stale";
  if (report.hidden) return "idle";
  if (report.losses >= 2 || report.failures > 0) return "bad";
  if (report.fps != null && report.fps < HEALTH.poor) return "bad";
  if (report.fps != null && report.fps < HEALTH.fine) return "warn";
  return report.picture === "plain" ? "plain" : "ok";
}

const PICTURE_WORD = Object.freeze({ lit: "lit", low: "low", plain: "plain" });

/** One screen as a line for the board: { id, name, level, text, tip }. `entry` is { report, at } or undefined (no report yet). */
export function chipOf({ id, name }, entry, now) {
  const level = levelOf(entry?.report, entry?.at ?? 0, now);
  const r = entry?.report;
  if (!r || level === "stale") return { id, name, level: "stale", text: "no stage", tip: `${name}: not on a stage, or not heard from for a while` };
  const fps = r.fps == null ? "…" : `${r.fps} fps`;
  const tip = [
    `${name}: the ${PICTURE_WORD[r.picture]} stage${r.fps == null ? ", not measured yet" : ` at ${fps}`}${r.worst != null ? `, longest frame ${r.worst} ms` : ""}`,
    r.gpu ? `Graphics: ${r.gpu}` : "Graphics: not known",
    `Window: ${r.size[0]} × ${r.size[1]} at ${r.dpr}x`,
    r.probe != null ? `Start-up test: a frame costs ${r.probe} ms` : null,
    r.losses ? `Lost its graphics context ${r.losses} time${r.losses === 1 ? "" : "s"}` : null,
    r.failures ? `${r.failures} frame${r.failures === 1 ? "" : "s"} failed` : null,
    r.hidden ? "The tab is in the background" : null
  ].filter(Boolean).join("\n");
  return { id, name, level, text: level === "idle" ? `${PICTURE_WORD[r.picture]} · away` : `${PICTURE_WORD[r.picture]} · ${fps}`, tip };
}

const RANK = Object.freeze({ bad: 4, warn: 3, plain: 2, ok: 1, idle: 0, stale: 0 });

/** The whole board: { chips, level (the worst of them), counts, line }. `people` is [{ id, name }], `table` a Map of id to { report, at }. */
export function board(people, table, now) {
  const chips = people.map((p) => chipOf(p, table.get(p.id), now)).sort((a, b) => RANK[b.level] - RANK[a.level] || a.name.localeCompare(b.name));
  const counts = { ok: 0, plain: 0, warn: 0, bad: 0, idle: 0, stale: 0 };
  for (const c of chips) counts[c.level]++;
  const level = counts.bad ? "bad" : counts.warn ? "warn" : counts.plain ? "plain" : counts.ok ? "ok" : "stale";
  const live = chips.length - counts.stale;
  const parts = [`${live} of ${chips.length} on a stage`];
  if (counts.bad) parts.push(`${counts.bad} struggling`);
  if (counts.warn) parts.push(`${counts.warn} slow`);
  if (counts.plain) parts.push(`${counts.plain} on the plain stage`);
  return { chips, level, counts, line: parts.join(" · ") };
}
