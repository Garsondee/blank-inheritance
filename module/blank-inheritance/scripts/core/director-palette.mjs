/**
 * The Director's Palette — one search box for everything a GM can do.
 *
 * "I'd love a quick menu system for everything that a Foundry VTT GM might be
 * called upon to do, half of which is based on the system that we
 * write/build and fully control and the other equally important part is
 * building a system where the GM can adjust, adapt and keep the session
 * running if the group decides to do something different." (Ingram, 2026-09-17)
 *
 * Both halves are load-bearing and this file treats them as equals: the
 * OFF_SCRIPT group is not a footnote at the bottom of the list, it is the one
 * group that sorts to the top when nothing has been typed, because the moment
 * a GM reaches for this thing in a hurry is usually the moment the table has
 * just done something nobody wrote down.
 *
 * Pure: scoring, ranking, grouping and keyboard movement. No Foundry globals,
 * no command actually runs from here -- the adapter supplies `run`.
 */

/**
 * Groups, in the order they appear when the box is empty.
 *
 * `off-script` first is a deliberate inversion of the obvious order. A palette
 * that opens showing "Cut to scene" first is optimised for the prepared case,
 * which is the case a GM least needs help with.
 */
export const COMMAND_GROUPS = Object.freeze([
  { id: "off-script", label: "Off script" },
  { id: "scene", label: "Scenes" },
  { id: "cast", label: "Cast" },
  { id: "audio", label: "Audio" },
  { id: "reveal", label: "Show the table" },
  { id: "check", label: "Checks" },
  { id: "log", label: "Log" },
  { id: "panel", label: "Panels" },
  { id: "table", label: "The table" }
]);

const GROUP_ORDER = new Map(COMMAND_GROUPS.map((g, i) => [g.id, i]));

/** Normalise for matching: case-insensitive, punctuation-insensitive. */
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * How well a command answers a query, or 0 for "not at all".
 *
 * Four tiers, most specific first, so "can" finds "Canteen" before it finds
 * "Cast a spell". Every tier is a real distinction a GM would make:
 *
 *   1000  the whole query is the start of the title      ("can" -> Canteen)
 *    800  the query starts a word inside the title       ("tun" -> Flood Tunnel)
 *    600  the title contains it anywhere                 ("unnel")
 *    400  a keyword matches the same way
 *    200  the letters appear in order, spread out        ("fldtn" -> Flood Tunnel)
 *
 * Shorter titles win ties, because a short exact-ish match is almost always
 * the thing meant.
 */
export function scoreCommand(query, command) {
  const q = norm(query);
  if (!q) return 1; // everything matches an empty box
  const title = norm(command.title);
  const hint = norm(command.hint);
  const keywords = (command.keywords ?? []).map(norm).join(" ");

  let score = 0;
  if (title.startsWith(q)) score = 1000;
  else if (new RegExp(`\\b${escapeRe(q)}`).test(title)) score = 800;
  else if (title.includes(q)) score = 600;
  else if (keywords.includes(q) || hint.includes(q)) score = 400;
  else if (isSubsequence(q.replace(/ /g, ""), title.replace(/ /g, ""))) score = 200;
  else return 0;

  // A shorter title matching the same way is the better answer.
  return score + Math.max(0, 60 - title.length);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function isSubsequence(needle, haystack) {
  if (!needle) return true;
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

/**
 * Rank commands for a query.
 *
 * With an empty box this is NOT "everything" -- it is a short, ordered
 * starting menu: recents first (what a GM did a minute ago is overwhelmingly
 * what they want again), then group order. Dumping two hundred commands into
 * an empty palette is the same as dumping none.
 *
 * @param {string} query
 * @param {Array} commands
 * @param {object} [options]
 * @param {string[]} [options.recents]  command ids, most recent first
 * @param {number} [options.limit]
 */
export function matchCommands(query, commands, { recents = [], limit = 40 } = {}) {
  const q = norm(query);
  const recentRank = new Map(recents.map((id, i) => [id, i]));

  const scored = [];
  for (const command of commands) {
    if (command.hidden) continue;
    const score = scoreCommand(query, command);
    if (!score) continue;
    scored.push({ command, score });
  }

  scored.sort((a, b) => {
    if (!q) {
      // Empty box: recents, then group order, then the command's own order.
      const ra = recentRank.has(a.command.id) ? recentRank.get(a.command.id) : Infinity;
      const rb = recentRank.has(b.command.id) ? recentRank.get(b.command.id) : Infinity;
      if (ra !== rb) return ra - rb;
      const ga = GROUP_ORDER.get(a.command.group) ?? 99;
      const gb = GROUP_ORDER.get(b.command.group) ?? 99;
      if (ga !== gb) return ga - gb;
      return (a.command.order ?? 0) - (b.command.order ?? 0);
    }
    if (b.score !== a.score) return b.score - a.score;
    // A recent command breaks a scoring tie.
    const ra = recentRank.has(a.command.id) ? recentRank.get(a.command.id) : Infinity;
    const rb = recentRank.has(b.command.id) ? recentRank.get(b.command.id) : Infinity;
    if (ra !== rb) return ra - rb;
    return String(a.command.title).localeCompare(String(b.command.title));
  });

  return scored.slice(0, limit).map((s) => s.command);
}

/**
 * The rendered shape: a flat list with group headings inserted, because a flat
 * list is what arrow keys move through and a grouped list is what eyes read.
 */
export function paletteModel(query, commands, { recents = [], selected = 0, limit = 40 } = {}) {
  const matched = matchCommands(query, commands, { recents, limit });
  const index = clampSelection(selected, matched.length);

  const rows = [];
  let lastGroup = null;
  matched.forEach((command, i) => {
    if (command.group !== lastGroup) {
      rows.push({ isHeading: true, label: COMMAND_GROUPS.find((g) => g.id === command.group)?.label ?? command.group });
      lastGroup = command.group;
    }
    rows.push({
      isHeading: false,
      id: command.id,
      title: command.title,
      hint: command.hint ?? null,
      icon: command.icon ?? null,
      danger: command.danger === true,
      isSelected: i === index
    });
  });

  return { rows, matched, selected: index, empty: matched.length === 0, query };
}

/** Arrow-key movement that wraps, because a list that stops at the end feels broken. */
export function moveSelection(selected, delta, length) {
  if (length <= 0) return 0;
  return (((selected + delta) % length) + length) % length;
}

function clampSelection(selected, length) {
  if (length <= 0) return 0;
  return Math.min(Math.max(selected, 0), length - 1);
}

/** Most-recent-first, de-duplicated, capped. */
export function rememberCommand(recents, id, cap = 8) {
  return [id, ...(recents ?? []).filter((r) => r !== id)].slice(0, cap);
}

/**
 * The generic outcomes a scene can close with when nobody wrote any.
 *
 * design/ux-doctrine.md §10.3a: "For improvised scenes there has to be a
 * generic fallback, because improvisation is a first-class mode here and a
 * dialogue that only works for prepared material would be worse than none."
 */
export const IMPROVISED_OUTCOMES = Object.freeze([
  "They got what they came for",
  "They got part of it",
  "They walked away from it",
  "It went wrong",
  "Something else started"
]);
