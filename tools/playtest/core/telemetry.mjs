/**
 * Telemetry: what every seat's browser reports about itself, classified and tied to the action that probably caused it. Pure.
 * (design/playtest-process.md, section 4, "Telemetry" and "Detectors".)
 *
 * The page-side collectors (browser/seat.mjs, browser/page-hooks.mjs) produce raw events; this file decides what each one MEANS.
 * Two rules:
 *   - Known noise is SHOWN, never hidden. An entry in NOISE carries the reason it is harmless, and a noisy event is still counted
 *     and kept in the evidence; it just does not become a finding. A missing media file is NOT noise here: the playtest copy is a
 *     full deploy, so a 404 on an asset means the deploy forgot to send it, which is the very thing a deploy-shaped copy is for finding.
 *   - Every event is stamped with the action it followed ("this error came 120 ms after P3 pressed Continue"), because "an error
 *     appeared" is not a repro and "an error appeared 120 ms after this press" nearly is.
 */

/** Harmless, known, and said so. Add an entry only with the reason; an unexplained entry is a hidden bug. */
export const NOISE = [
  { id: "favicon", re: /favicon\.ico/i, why: "headless Chrome asks for a site icon Foundry does not serve; no player sees it" },
  { id: "autoplay-policy", re: /AudioContext was not allowed to start|play\(\) failed because the user didn't interact/i, why: "Chrome holds audio until the first gesture; the module resumes it on the first press (checked functionally by the audio probe)" },
  { id: "gpu-readpixels", re: /GPU stall due to ReadPixels|GL Driver Message/i, why: "Chrome's own WebGL performance chatter from the headless GPU path; not the game's" },
  { id: "devtools-source-map", re: /DevTools failed to load source map|Could not load content for .*\.map/i, why: "a dev-only source map the shipped bundle deliberately does not carry" }
];

const MEDIA = new Set(["image", "media", "font", "stylesheet", "script"]);

/** The noise entry a text matches, or null. */
export function noiseOf(text) {
  const hit = NOISE.find((n) => n.re.test(text));
  return hit ? hit.id : null;
}

/**
 * What one raw event means.
 * @param {object} ev a raw event: { type, ...fields }
 * @returns {{category:string, severity:"S0"|"S1"|"S2"|"S3"|null, noise:string|null}} severity null = informational, never a finding
 */
export function classify(ev) {
  const text = String(ev.text ?? ev.message ?? ev.url ?? "");
  const noise = noiseOf(text);
  const out = (category, severity) => ({ category, severity: noise ? null : severity, noise });
  switch (ev.type) {
    case "console":
      // Chrome logs every failed request to the console as well as reporting it: the request event is the finding, this is its echo.
      if (ev.level === "error" && /^Failed to load resource/i.test(text)) return { category: "console-echo", severity: null, noise: null };
      if (ev.level === "error") return /Failed to load resource.*\b(404|403)\b/i.test(text) ? out("missing-asset", "S2") : /deprecat/i.test(text) ? out("deprecation", "S3") : out("console-error", "S2");
      if (ev.level === "warning" || ev.level === "warn") return /deprecat/i.test(text) ? out("deprecation", "S3") : out("console-warning", "S3");
      return { category: "console-info", severity: null, noise };
    case "pageerror": return out("page-error", "S1");
    case "rejection": return out("unhandled-rejection", "S1");
    case "requestfailed": return MEDIA.has(ev.resourceType) ? out("missing-asset", ev.resourceType === "script" || ev.resourceType === "stylesheet" ? "S1" : "S2") : out("network-error", "S2");
    case "response":
      if (ev.status >= 500) return out("server-error", "S1");
      if (ev.status >= 400) return MEDIA.has(ev.resourceType) || /\.(png|jpe?g|webp|webm|mp4|ogg|mp3|woff2?|css|js|json)(\?|$)/i.test(ev.url ?? "") ? out("missing-asset", "S2") : out("network-error", "S2");
      return { category: "response", severity: null, noise };
    case "notification": return ev.level === "error" ? out("notification-error", "S2") : ev.level === "warn" || ev.level === "warning" ? out("notification-warning", "S3") : { category: "notification", severity: null, noise };
    case "socket": return ev.state === "closed" ? out("socket-closed", "S2") : { category: "socket", severity: null, noise };
    case "longtask": return ev.durationMs >= 1000 ? out("long-task", "S2") : ev.durationMs >= 250 ? out("long-task", "S3") : { category: "long-task", severity: null, noise };
    case "dialog": return out("browser-dialog", "S2");
    case "dead-click": return out("dead-click", "S2");
    case "detector": return out(`detector:${ev.name}`, ev.severity ?? "S2");
    default: return { category: ev.type, severity: null, noise };
  }
}

/**
 * Tie each event to the latest action of the same seat that came before it, within `windowMs`.
 * @param {object[]} events  each { t (ms), seat, ... }
 * @param {object[]} actions each { id, t (ms), seat, verb }
 */
export function stampEvents(events, actions, { windowMs = 3000 } = {}) {
  const bySeat = new Map();
  for (const a of [...actions].sort((x, y) => x.t - y.t)) {
    if (!bySeat.has(a.seat)) bySeat.set(a.seat, []);
    bySeat.get(a.seat).push(a);
  }
  return events.map((ev) => {
    const list = bySeat.get(ev.seat) ?? [];
    let found = null;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].t <= ev.t) {
        found = list[i];
        break;
      }
    }
    const dt = found ? ev.t - found.t : null;
    return found && dt <= windowMs ? { ...ev, after: { action: found.id, verb: found.verb, ms: dt } } : { ...ev };
  });
}

/** A message with ids, numbers and query strings removed, so the same complaint counts as one. */
export function normalizeMessage(text) {
  return String(text).replace(/https?:\/\/[^\s)]+/g, "<url>").replace(/\b[0-9a-f]{12,}\b/gi, "<id>").replace(/\d+(\.\d+)?/g, "#").replace(/\s+/g, " ").trim().slice(0, 160);
}

/** Counts by category and severity, and the most repeated messages (noise kept apart). */
export function summarizeEvents(events) {
  const byCategory = {};
  const bySeverity = { S0: 0, S1: 0, S2: 0, S3: 0 };
  const noisy = {};
  const messages = new Map();
  for (const ev of events) {
    const c = classify(ev);
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
    if (c.noise) {
      noisy[c.noise] = (noisy[c.noise] ?? 0) + 1;
      continue;
    }
    if (c.severity) {
      bySeverity[c.severity]++;
      const key = `${c.category}: ${normalizeMessage(ev.text ?? ev.message ?? ev.url ?? "")}`;
      const m = messages.get(key) ?? { key, category: c.category, severity: c.severity, count: 0, seats: new Set(), first: ev };
      m.count++;
      m.seats.add(ev.seat);
      messages.set(key, m);
    }
  }
  const top = [...messages.values()].sort((a, b) => b.count - a.count || a.severity.localeCompare(b.severity)).slice(0, 25).map((m) => ({ ...m, seats: [...m.seats].sort() }));
  return { byCategory, bySeverity, noisy, top };
}
