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
  // Commands built from what was just TYPED ("athletics 18", "dmg 2d6",
  // "note they bribed the guard") — added 2026-09-23. Always first: the GM
  // has already said exactly what they want.
  { id: "quick", label: "Do it now" },
  { id: "off-script", label: "Off script" },
  // Everything that acts on the token(s) selected on the canvas when the
  // palette opened — damage, healing, conditions, hero points, secret rolls.
  // Only present while something is selected (added 2026-09-23).
  { id: "selected", label: "Selected" },
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

/**
 * Normalise for matching: case-insensitive, punctuation-insensitive — except
 * that a sign in front of a number is MEANING, not punctuation. Found live
 * 2026-09-23: "Frightened +1" and "Frightened −1" both normalised to
 * "frightened 1", tied, and typing "frightened −1" ran +1. A leading "+"
 * now reads as "up" and a minus (any of - − –) as "down", in titles and
 * queries alike.
 */
const norm = (s) => String(s ?? "")
  .toLowerCase()
  .replace(/\+\s*(?=\d)/g, " up ")
  .replace(/(^|\s)[-−–]\s*(?=\d)/g, "$1 down ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

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
  // A command built FROM the query (parseQuickIntent) is the answer to it by
  // construction — it outranks every fuzzy match.
  if (command.pinned) return q ? 5000 : 0;
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
    // Big families (a secret roll per skill, a condition per slug) are found
    // by typing, never dumped into the opening menu — forty condition rows
    // would push every scene and panel off it (2026-09-23).
    if (!q && command.searchOnly) continue;
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
      // Shown but inert — a typed "dmg 5" with nothing selected still says
      // what it WOULD do, and why it cannot yet.
      disabled: command.disabled === true,
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

/* ---------------------------------------------------------------- */
/*  Quick intents: commands built from what was typed (2026-09-23)   */
/* ---------------------------------------------------------------- */

/**
 * The conditions a GM hands out mid-scene, as the palette offers them for the
 * selected token(s). `valued` conditions step up and down (Frightened 2 ->
 * 3); the rest toggle. Slugs are sf2e's own (CONFIG.PF2E.conditionTypes);
 * the adapter calls the actor's own increaseCondition / decreaseCondition /
 * toggleCondition, so every rule the system attaches to a condition (off-guard
 * from prone, the dying/wounded chain) still happens.
 */
export const PALETTE_CONDITIONS = Object.freeze([
  { slug: "off-guard", label: "Off-Guard", valued: false },
  { slug: "frightened", label: "Frightened", valued: true },
  { slug: "prone", label: "Prone", valued: false },
  { slug: "grabbed", label: "Grabbed", valued: false },
  { slug: "restrained", label: "Restrained", valued: false },
  { slug: "immobilized", label: "Immobilized", valued: false },
  { slug: "hidden", label: "Hidden", valued: false },
  { slug: "concealed", label: "Concealed", valued: false },
  { slug: "dazzled", label: "Dazzled", valued: false },
  { slug: "blinded", label: "Blinded", valued: false },
  { slug: "deafened", label: "Deafened", valued: false },
  { slug: "sickened", label: "Sickened", valued: true },
  { slug: "stunned", label: "Stunned", valued: true },
  { slug: "slowed", label: "Slowed", valued: true },
  { slug: "quickened", label: "Quickened", valued: false },
  { slug: "clumsy", label: "Clumsy", valued: true },
  { slug: "enfeebled", label: "Enfeebled", valued: true },
  { slug: "stupefied", label: "Stupefied", valued: true },
  { slug: "drained", label: "Drained", valued: true },
  { slug: "fatigued", label: "Fatigued", valued: false },
  { slug: "confused", label: "Confused", valued: false },
  { slug: "fascinated", label: "Fascinated", valued: false },
  { slug: "fleeing", label: "Fleeing", valued: false },
  { slug: "paralyzed", label: "Paralyzed", valued: false },
  { slug: "unconscious", label: "Unconscious", valued: false },
  { slug: "dying", label: "Dying", valued: true },
  { slug: "wounded", label: "Wounded", valued: true },
  { slug: "doomed", label: "Doomed", valued: true }
]);

const cap = (s) => String(s).replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

/**
 * Read the box as an instruction, not only a search.
 *
 * A GM mid-scene types what they want — "athletics 18", "dmg 2d6+3",
 * "heal 5", "flat 5", "r 1d20+4", "gmr 1d100", "note they bribed the guard" —
 * and the palette should offer to DO exactly that as its first row, one
 * Enter away, rather than make them find a command and then fill a prompt.
 *
 * Returns plain intent descriptors (no `run`): the adapter binds each `kind`
 * to the real call. `skills` is [{ slug, label }] — the checks a GM can ask
 * for; a skill is matched by the start of its slug or label, so "ath 18" and
 * "percep 15" both work, and an ambiguous prefix offers every match (up to
 * three) rather than guessing. Formulas are passed through untouched — the
 * adapter validates them with Foundry's own Roll.validate.
 */
export function parseQuickIntent(query, { skills = [], hasSelection = false } = {}) {
  const raw = String(query ?? "").trim();
  if (!raw) return [];
  const intents = [];
  let m;

  if ((m = /^(?:dmg|damage|hurt|hit)\s+(.+)$/i.exec(raw))) {
    intents.push({ kind: "damage", formula: m[1].trim(), id: "quick.damage", title: `Damage selected: ${m[1].trim()}`, hint: hasSelection ? "applied through the system's own damage rules" : "select a token first", icon: "fa-solid fa-burst", disabled: !hasSelection });
  }
  if ((m = /^(?:heal|hp\+)\s+(.+)$/i.exec(raw))) {
    intents.push({ kind: "heal", formula: m[1].trim(), id: "quick.heal", title: `Heal selected: ${m[1].trim()}`, hint: hasSelection ? "restores hit points" : "select a token first", icon: "fa-solid fa-heart-pulse", disabled: !hasSelection });
  }
  if ((m = /^flat\s+(?:dc\s*)?(\d{1,2})$/i.exec(raw))) {
    intents.push({ kind: "flat", dc: Number(m[1]), id: "quick.flat", title: `Ask for a flat check, DC ${m[1]}`, hint: "posts a rollable flat check", icon: "fa-solid fa-dice-d20" });
  }
  if ((m = /^(?:r|roll)\s+(.+)$/i.exec(raw))) {
    intents.push({ kind: "roll", formula: m[1].trim(), secret: false, id: "quick.roll", title: `Roll ${m[1].trim()}`, hint: "in the open, to chat", icon: "fa-solid fa-dice" });
  }
  if ((m = /^(?:gmr|sr|secret|blind)\s+(.+)$/i.exec(raw))) {
    intents.push({ kind: "roll", formula: m[1].trim(), secret: true, id: "quick.roll-secret", title: `Roll ${m[1].trim()} secretly`, hint: "only you see it", icon: "fa-solid fa-eye-slash" });
  }
  if ((m = /^(?:note|log)\s*[:\-]?\s+(.+)$/i.exec(raw))) {
    intents.push({ kind: "note", text: m[1].trim(), id: "quick.note", title: `Log: ${m[1].trim()}`, hint: "straight into the session log", icon: "fa-solid fa-pen" });
  }

  // "<skill> <dc>", "<skill> dc <dc>" or "dc <dc> <skill>".
  const skillDc = /^([a-z][a-z \-]*?)\s+(?:dc\s*)?(\d{1,2})$/i.exec(raw) ?? (() => {
    const r = /^dc\s*(\d{1,2})\s+([a-z][a-z \-]*)$/i.exec(raw);
    return r ? [r[0], r[2], r[1]] : null;
  })();
  if (skillDc && !intents.length) {
    const word = norm(skillDc[1]);
    const dc = Number(skillDc[2]);
    const hits = skills.filter((s) => norm(s.slug).startsWith(word) || norm(s.label).startsWith(word)).slice(0, 3);
    for (const s of hits) {
      const label = s.label ?? cap(s.slug);
      intents.push({ kind: "ask", slug: s.slug, dc, id: `quick.ask.${s.slug}`, title: `Ask for ${label}, DC ${dc}`, hint: "posts a rollable check to chat", icon: "fa-solid fa-dice-d20" });
    }
  }

  return intents.map((intent) => ({ ...intent, group: "quick", pinned: true }));
}
