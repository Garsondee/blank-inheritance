/**
 * The wings: the people a scene could still bring on, shown to the GM alone. Pure: foundry/wings.mjs draws them (a tray
 * along the top of the stage, and a faded card standing where each one would stand) and says when one is brought on.
 *
 * Who waits is not the stage's to know. Another module says (`api.wings.setProvider`), from its own story; the stage only
 * shows them to the GM's screen, never writes them anywhere and never sends them, and raises `stagecraft.bring` when the
 * GM brings one on: with how (`way`, one of the provider's ways, or null for the person's own) and where (`at`, a point of
 * the painting the GM dropped them on, or null for the place the provider gave).
 */

/** More than this in the tray is a list nobody can take in at a glance: the finder is for the rest. */
export const WINGS_MOST = 24;

/** The finder offers no more than this many at once. */
export const FOUND_MOST = 8;

/** A press that has moved less than this (window pixels) is a click; more, and what was pressed is being carried. */
export const DRAG_START = 6;

const clamp01 = (n) => Math.min(1, Math.max(0, n));

/** One line of plain text, or "" (a name with a line break in it shows its first line, as the card menu does). */
function line(v, most = 80) {
  if (typeof v !== "string") return "";
  return v.split(/\n|<br\s*\/?>|\\n/i)[0].replace(/\s+/g, " ").trim().slice(0, most);
}

/** A point of the painting, [fx, fy], kept inside it; null when it is not one. */
function pointOf(at) {
  return Array.isArray(at) && at.length >= 2 && Number.isFinite(at[0]) && Number.isFinite(at[1]) ? [clamp01(at[0]), clamp01(at[1])] : null;
}

/** The ways someone can be brought on, as a provider gives them: [{ id, label }], each id once. */
export function describeWays(raw) {
  const out = [];
  for (const w of Array.isArray(raw) ? raw : []) {
    if (!w || typeof w.id !== "string" || !w.id.trim() || out.some((o) => o.id === w.id)) continue;
    const label = line(w.label, 40);
    if (label) out.push({ id: w.id, label });
  }
  return out;
}

/**
 * What the providers said, made safe and put together: { people, ways }. `answers` are the providers' answers, each
 * `{ people: [{ id, name, title?, portrait?, at?, size?, way?, note? }], ways?: [{ id, label }] }` (anything else is
 * passed over). A person named twice is taken once, from the first that named them; the tray holds at most `most`.
 */
export function describeWings(answers, most = WINGS_MOST) {
  const people = [];
  const ways = [];
  const seen = new Set();
  for (const raw of Array.isArray(answers) ? answers : [answers]) {
    if (!raw || typeof raw !== "object") continue;
    for (const w of describeWays(raw.ways)) if (!ways.some((o) => o.id === w.id)) ways.push(w);
    for (const p of Array.isArray(raw.people) ? raw.people : []) {
      if (people.length >= most) break;
      if (!p || typeof p.id !== "string" || !p.id.trim() || seen.has(p.id)) continue;
      seen.add(p.id);
      people.push({
        id: p.id,
        name: line(p.name) || p.id,
        title: line(p.title, 120),
        portrait: typeof p.portrait === "string" && p.portrait ? p.portrait : null,
        at: pointOf(p.at),
        size: Number.isFinite(p.size) && p.size > 0 ? Math.min(3, p.size) : 1,
        way: typeof p.way === "string" && p.way ? p.way : null,
        note: line(p.note, 120)
      });
    }
  }
  return { people, ways };
}

/** What a finder found, made safe and few: [{ id, name, portrait, note }]. */
export function describeFound(raw, most = FOUND_MOST) {
  const out = [];
  const seen = new Set();
  for (const p of Array.isArray(raw) ? raw : []) {
    if (out.length >= most) break;
    if (!p || typeof p.id !== "string" || !p.id.trim() || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ id: p.id, name: line(p.name) || p.id, portrait: typeof p.portrait === "string" && p.portrait ? p.portrait : null, note: line(p.note, 120) });
  }
  return out;
}

/** Who still waits: everyone named who has no card on the stage (once they have one, the card is them, and the ghost goes). */
export function stillWaiting(people, cardIds) {
  const on = new Set(cardIds ?? []);
  return (people ?? []).filter((p) => !on.has(p.id));
}

/**
 * A faded card's box on the screen, from where its foot, its head and its two edges fall (window pixels, as the picture
 * projects them): { x, y, w, h }, or null when it would not show (behind the eye, or too small to see).
 */
export function ghostBox({ foot, head, left, right }) {
  if (![foot, head, left, right].every((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))) return null;
  const h = foot.y - head.y;
  const w = Math.abs(right.x - left.x);
  if (!(h > 4) || !(w > 2)) return null;
  return { x: Math.round(foot.x - w / 2), y: Math.round(head.y), w: Math.round(w), h: Math.round(h) };
}

/** Has a press moved far enough to be carrying what it pressed? */
export const isDrag = (from, to, threshold = DRAG_START) => Math.hypot(to.x - from.x, to.y - from.y) >= threshold;

/**
 * Where the tray goes, as a distance from the top of the stage: just under whichever of the stage's own strips along the top
 * are showing (`bottoms`, their lower edges), or at `top` when none is.
 */
export function trayTop(bottoms, top = 84, gap = 8) {
  let at = top;
  for (const b of bottoms ?? []) if (Number.isFinite(b)) at = Math.max(at, b + gap);
  return Math.round(at);
}

/** What `stagecraft.bring` carries: { scene, id, way, at, found }, with only what was given. */
export function bringEvent({ scene, id, way = null, at = null, found = false }) {
  return { scene, id, way: typeof way === "string" && way ? way : null, at: pointOf(at), found: found === true };
}
