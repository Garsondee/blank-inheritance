/**
 * Canaries: strings that must never reach a player. Pure.
 *
 * The leak scan (browser/probes.js `leak`) searches each player's page, and the documents Foundry sent to that client, for them. They
 * come from what the authored material marks GM-only: the "Secret:" lines in a beat's note (the Runner tints and locks them so they are
 * never read out by mistake), and any string the caller adds. A canary shorter than 12 characters is dropped: a short phrase is not
 * distinctive enough to mean a leak, and a false S0 costs more trust than it earns.
 *
 * Two severities follow from where a canary is found: on the VISIBLE page it is a leak (S0, the player is reading the GM's page); only in
 * the client's documents it is the known exposure of GitHub #212 (Foundry sends players every document; ownership does not hide it from
 * a browser), recorded for the report and not an S0.
 */

const SECRET_LINE = /(^|\n)\s*Secret:\s*([^\n]+)/g;

/** The GM-only lines of a set of briefs, each with where it came from. */
export function secretLines(briefs) {
  const out = [];
  for (const brief of briefs) {
    for (const beat of brief.beats ?? []) {
      for (const field of ["note", "direction"]) {
        const text = typeof beat[field] === "string" ? beat[field] : "";
        for (const match of text.matchAll(SECRET_LINE)) out.push({ scene: brief.id, beat: beat.id, field, text: match[2].trim() });
      }
    }
    const notes = typeof brief.notes === "string" ? brief.notes : "";
    for (const match of notes.matchAll(SECRET_LINE)) out.push({ scene: brief.id, beat: null, field: "notes", text: match[2].trim() });
  }
  return out;
}

/** Distinct, distinctive strings to search for: the opening of each secret line, long enough to mean something. */
export function canaryStrings(briefs, extra = []) {
  const seen = new Set();
  const out = [];
  for (const line of [...secretLines(briefs).map((s) => s.text), ...extra]) {
    const text = String(line).replace(/\s+/g, " ").trim().slice(0, 90);
    if (text.length < 12 || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

/** What a scan result means: visible page text is a leak; documents alone are the known baseline. */
export function judgeLeaks(result) {
  const ui = result?.ui ?? [];
  const documents = result?.documents ?? [];
  return {
    leak: ui.length > 0,
    severity: ui.length ? "S0" : documents.length ? "S3" : null,
    summary: ui.length ? `${ui.length} GM-only string(s) are visible on a player's screen` : documents.length ? `${documents.length} GM-only string(s) are in documents sent to this client but not on its screen (the known exposure, GitHub #212)` : "no GM-only string found",
    ui,
    documents
  };
}
