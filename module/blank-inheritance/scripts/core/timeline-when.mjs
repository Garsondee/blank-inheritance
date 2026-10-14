/**
 * Plain-words dates for canon's `when:` field (design/plot-timeline.md §3, D070).
 *
 * Ingram edits these by hand, so they stay words: "about 200 years ago", "44 to 40 years ago", "day 1, late morning",
 * "chapter 6, late", "book iv", "4721 AR", or anchored to another fact: "about 1000 years after generation-ship.crashed".
 * An open fact may list one date per candidate, separated by "|".
 *
 * Time is counted in days from the start of Day 1 of intake, the first day of Episode One (D047's plan: Day 0 is the
 * days before intake). The past is negative. The campaign ahead is counted in chapters, not days, because its pace is
 * the table's. Pure: no file access, no Foundry, so the timeline page and a Foundry window can share it.
 */

/** The campaign's present year, in Absalom Reckoning (D070: "Let's make this the current year."). */
export const PRESENT_YEAR = 4921;
export const UNIT_DAYS = Object.freeze({ day: 1, week: 7, month: 30.44, year: 365.25 });
/** Where in its day a scene's rough time of day sits, as a fraction of the day. The words are the plan's own TIMES. */
export const TIME_OF_DAY = Object.freeze({
  "early morning": 0.25,
  morning: 0.35,
  "late morning": 0.45,
  midday: 0.5,
  afternoon: 0.6,
  evening: 0.75,
  night: 0.9,
});
/** Where in a chapter "early", "middle" and "late" sit. A chapter N runs from N to N + 1. */
export const PARTS = Object.freeze({ early: 0.2, middle: 0.5, late: 0.8 });
export const ROMAN = Object.freeze(["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]);
/** The five Books' chapters (canon/plan/books.md); used when a caller passes none. */
export const DEFAULT_BOOKS = Object.freeze([
  { book: 1, from: 1, to: 4 },
  { book: 2, from: 5, to: 8 },
  { book: 3, from: 9, to: 12 },
  { book: 4, from: 13, to: 15 },
  { book: 5, from: 16, to: 20 },
]);

const ID = "[a-z0-9-]+\\.[a-z0-9-]+";
const NUM = "(\\d[\\d,]*(?:\\.\\d+)?)";
const UNIT = "(day|week|month|year)s?";
const number = (s) => Number(String(s).replace(/,/g, ""));

/**
 * Parse one `when:` value. Throws an Error that says what the words should look like.
 * @param {string} input
 * @returns {object} one of: {type:"ago"}, {type:"anchored"}, {type:"day"}, {type:"chapter"}, {type:"book"},
 *   {type:"year"}, {type:"candidates", options:[...]}
 */
export function parseWhen(input) {
  if (typeof input !== "string" || !input.trim()) throw new Error("a when needs words");
  const text = input.trim();
  if (text.includes("|")) {
    const options = text.split("|").map((s) => s.trim());
    if (options.some((o) => !o)) throw new Error(`"${text}": an empty candidate between the "|"s`);
    return { type: "candidates", options: options.map((o) => {
      const p = parseWhen(o);
      if (p.type === "candidates") throw new Error(`"${text}": candidates cannot nest`);
      return p;
    }) };
  }
  const t = text.toLowerCase().replace(/\s+/g, " ");
  let m;
  if ((m = t.match(/^day (\d+)(?:, (.+))?$/))) {
    const time = m[2] || null;
    if (time && !(time in TIME_OF_DAY)) throw new Error(`"${text}": the time of day must be one of ${Object.keys(TIME_OF_DAY).join(", ")}`);
    return { type: "day", day: Number(m[1]), time };
  }
  if ((m = t.match(/^chapter (\d+)(?:, (early|middle|late))?$/))) {
    const chapter = Number(m[1]);
    if (chapter < 1) throw new Error(`"${text}": chapters start at 1`);
    return { type: "chapter", chapter, part: m[2] || null };
  }
  if ((m = t.match(/^book ([ivx]+)$/))) {
    const book = ROMAN.indexOf(m[1]) + 1;
    if (book < 1) throw new Error(`"${text}": a Book is a Roman numeral, i to v`);
    return { type: "book", book };
  }
  if ((m = t.match(new RegExp(`^(about )?${NUM} ar$`)))) {
    return { type: "year", year: number(m[2]), approx: Boolean(m[1]) };
  }
  if ((m = t.match(new RegExp(`^(about )?${NUM}(?: to ${NUM})? ${UNIT} ago$`)))) {
    const a = number(m[2]);
    const b = m[3] === undefined ? null : number(m[3]);
    if (b !== null && a === b) throw new Error(`"${text}": a span needs two different ends`);
    return { type: "ago", from: b === null ? a : Math.max(a, b), to: b === null ? null : Math.min(a, b), unit: m[4], approx: Boolean(m[1]) };
  }
  if ((m = t.match(new RegExp(`^(about )?${NUM} ${UNIT} (after|before) (${ID})$`)))) {
    return { type: "anchored", n: number(m[2]), unit: m[3], dir: m[4] === "after" ? 1 : -1, anchor: m[5], approx: Boolean(m[1]) };
  }
  throw new Error(
    `"${text}" isn't a when this tool reads. Use one of: "about 200 years ago", "44 to 40 years ago", "4721 AR", ` +
    `"about 1000 years after <fact id>", "day 1, late morning", "chapter 6, late", "book iv", or candidates joined by "|"`,
  );
}

const plural = (n, unit) => `${unit}${n === 1 ? "" : "s"}`;
const fmtNum = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

/** The canonical words for a parsed when. parseWhen(formatWhen(p)) gives p back. */
export function formatWhen(p) {
  switch (p.type) {
    case "candidates": return p.options.map(formatWhen).join(" | ");
    case "day": return `day ${p.day}${p.time ? `, ${p.time}` : ""}`;
    case "chapter": return `chapter ${p.chapter}${p.part ? `, ${p.part}` : ""}`;
    case "book": return `book ${ROMAN[p.book - 1]}`;
    case "year": return `${p.approx ? "about " : ""}${fmtNum(p.year)} AR`;
    case "ago": return p.to === null
      ? `${p.approx ? "about " : ""}${fmtNum(p.from)} ${plural(p.from, p.unit)} ago`
      : `${p.approx ? "about " : ""}${fmtNum(p.from)} to ${fmtNum(p.to)} ${p.unit}s ago`;
    case "anchored": return `${p.approx ? "about " : ""}${fmtNum(p.n)} ${plural(p.n, p.unit)} ${p.dir > 0 ? "after" : "before"} ${p.anchor}`;
    default: throw new Error(`formatWhen: unknown type ${p.type}`);
  }
}

/** Every fact id a when is anchored to (so a check can see that each exists). */
export function anchorsOf(p) {
  if (p.type === "anchored") return [p.anchor];
  if (p.type === "candidates") return p.options.flatMap(anchorsOf);
  return [];
}

// A rough date gets a soft span: a tenth of its distance from the present, and never less than a day.
const fuzz = (days) => Math.max(1, Math.abs(days) * 0.1);

/**
 * Where a parsed when falls. Returns a position:
 *  - `{ scale: "days", at, from, to, approx }`: the past and the episodes, in days from the start of Day 1;
 *  - `{ scale: "chapters", at, from, to }`: the campaign ahead, in chapters (chapter 6 runs from 6 to 7);
 *  - `{ scale: "candidates", options: [positions] }` for an open date.
 * `resolveAnchor(id)` returns the position of the fact an anchored when hangs from (or null), so anchors chain.
 */
export function resolveWhen(p, { resolveAnchor = () => null, books = DEFAULT_BOOKS } = {}) {
  switch (p.type) {
    case "candidates":
      return { scale: "candidates", options: p.options.map((o) => resolveWhen(o, { resolveAnchor, books })) };
    case "day": {
      const at = (p.day - 1) + (p.time ? TIME_OF_DAY[p.time] : 0.5);
      return p.time ? { scale: "days", at, from: at, to: at, approx: false } : { scale: "days", at, from: p.day - 1, to: p.day, approx: false };
    }
    case "chapter": {
      if (p.part) { const at = p.chapter + PARTS[p.part]; return { scale: "chapters", at, from: at, to: at }; }
      return { scale: "chapters", at: p.chapter + 0.5, from: p.chapter, to: p.chapter + 1 };
    }
    case "book": {
      const b = books.find((x) => x.book === p.book);
      if (!b) throw new Error(`book ${ROMAN[p.book - 1]} has no chapters in canon/plan/books.md`);
      return { scale: "chapters", at: (b.from + b.to + 1) / 2, from: b.from, to: b.to + 1 };
    }
    case "year": {
      const at = (p.year - PRESENT_YEAR) * UNIT_DAYS.year;
      return p.approx ? { scale: "days", at, from: at - fuzz(at), to: at + fuzz(at), approx: true } : { scale: "days", at, from: at, to: at + UNIT_DAYS.year, approx: false };
    }
    case "ago": {
      const a = -p.from * UNIT_DAYS[p.unit];
      if (p.to === null) return p.approx ? { scale: "days", at: a, from: a - fuzz(a), to: a + fuzz(a), approx: true } : { scale: "days", at: a, from: a, to: a, approx: false };
      const b = -p.to * UNIT_DAYS[p.unit];
      return { scale: "days", at: (a + b) / 2, from: p.approx ? a - fuzz(a) : a, to: p.approx ? b + fuzz(b) : b, approx: p.approx };
    }
    case "anchored": {
      const base = resolveAnchor(p.anchor);
      if (!base) throw new Error(`anchored to ${p.anchor}, which has no when`);
      if (base.scale !== "days") throw new Error(`anchored to ${p.anchor}, which isn't dated in days`);
      const offset = p.dir * p.n * UNIT_DAYS[p.unit];
      const at = base.at + offset;
      const spread = p.approx ? fuzz(offset) : 0;
      return { scale: "days", at, from: base.from + offset - spread, to: base.to + offset + spread, approx: p.approx || base.approx };
    }
    default:
      throw new Error(`resolveWhen: unknown type ${p.type}`);
  }
}

/**
 * Resolve every when in a set at once, following anchors and refusing cycles.
 * @param {Map<string,string>} whens  fact id -> its `when:` words
 * @returns {{ positions: Map<string,object>, problems: Array<{id:string, message:string}> }}
 */
export function resolveAll(whens, { books = DEFAULT_BOOKS } = {}) {
  const positions = new Map();
  const problems = [];
  const parsed = new Map();
  for (const [id, words] of whens) {
    try { parsed.set(id, parseWhen(words)); } catch (e) { problems.push({ id, message: e.message }); }
  }
  const visiting = new Set();
  const failed = new Set();
  const visit = (id) => {
    if (positions.has(id)) return positions.get(id);
    if (failed.has(id) || !parsed.has(id)) return null;
    if (visiting.has(id)) throw new Error(`its when goes round in a circle through ${id}`);
    visiting.add(id);
    try {
      const pos = resolveWhen(parsed.get(id), { books, resolveAnchor: (a) => {
        if (!whens.has(a)) throw new Error(`anchored to ${a}, which has no when`);
        const r = visit(a);
        if (!r) throw new Error(`anchored to ${a}, whose when can't be read`);
        if (r.scale === "candidates") throw new Error(`anchored to ${a}, whose date is still open`);
        return r;
      } });
      positions.set(id, pos);
      return pos;
    } finally {
      visiting.delete(id);
    }
  };
  for (const id of parsed.keys()) {
    try { visit(id); } catch (e) { failed.add(id); problems.push({ id, message: e.message }); }
  }
  return { positions, problems };
}

/** Words for a date in days, as the page's labels and a drag write it back: "about 44 years ago", "day 1, midday". */
export function wordsForDays(days, { approx = true } = {}) {
  if (days >= -1) {
    const day = Math.floor(days) + 1;
    const frac = days - Math.floor(days);
    const time = Object.entries(TIME_OF_DAY).reduce((best, [w, f]) => (Math.abs(f - frac) < Math.abs(best[1] - frac) ? [w, f] : best))[0];
    return `day ${day}, ${time}`;
  }
  const ago = -days;
  const pick = ago >= UNIT_DAYS.year * 1.5 ? "year" : ago >= UNIT_DAYS.month * 1.5 ? "month" : ago >= UNIT_DAYS.week * 1.5 ? "week" : "day";
  const n = Math.max(1, Math.round(ago / UNIT_DAYS[pick]));
  return `${approx ? "about " : ""}${n} ${plural(n, pick)} ago`;
}

/** The year in AR of a date in days. */
export function yearOf(days) {
  return PRESENT_YEAR + Math.floor(days / UNIT_DAYS.year);
}
