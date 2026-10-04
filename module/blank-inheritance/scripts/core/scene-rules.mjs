/**
 * Rules in this scene (2026-10-04), the pure half: the rules a scene's own words name, found in its brief, its checks, its
 * fights and its clock, for the Scene Runner to offer as one press each. Ingram, on the Runner's free search box: "The rules
 * search box isn't very useful either." A box makes the GM think of the word first; these are the words the scene already
 * uses, each opening the system's own rule card (a condition, an action, a creature's stat block) or the SRD article.
 *
 * The glossary is generated (tools/rules-glossary/build.mjs, data/rules-glossary.json). How an entry is recognised:
 *   - `loose`: its name, in any case ("off-guard", "Frightened");
 *   - `strict`: its name written as the rule, capitalised and in the middle of a sentence, and not the first word of a
 *     longer capitalised name ("offer a Demoralize", never "Escape!" or "the Search Party");
 *   - `valued`: a condition with a number after it, in any case ("clumsy 1", "drained 2");
 *   - `pattern`: the SRD rules, by their own words ("difficult terrain", "venom", "flanked").
 * A subsystem's own kind (`subsystemType`: influence, chase...) brings its SRD article too. Pure: no Foundry, no DOM.
 */

/**
 * Keys whose values are not words a GM reads for rules: ids, references to other files, bookkeeping, pictures, the short
 * words a field is set to (a beat's kind, an arrival), and what is said or shown to the players (read-aloud, a person's
 * lines, a handout's body), whose ordinary English ("if you come in here unconscious") is not a ruling.
 */
const SKIP = new Set(["id", "$schema", "$comment", "type", "authoring", "review", "img", "portrait", "src", "art", "audio", "soundscape", "compendium", "skillOptions", "tags", "tag", "kind", "delivery", "mode", "arrival", "act", "state", "degrees", "readAloud", "samples", "opensWith", "line", "body"]);
const isReference = (key) => /Refs?$/.test(key) || /Ids?$/.test(key);

/**
 * Every piece of words in a value, in the order it is written: strings only, without ids, references, tags or markup, and
 * without what anyone says in quotation marks (a line for the GM to read out is ordinary English, not a ruling).
 */
export function wordsOf(value, out = []) {
  if (typeof value === "string") {
    const text = value.replace(/<[^>]*>/g, " ").replace(/"[^"]*"|“[^”]*”/g, " ").replace(/\s+/g, " ").trim();
    if (text) out.push(text);
  } else if (Array.isArray(value)) {
    for (const v of value) wordsOf(v, out);
  } else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) if (!SKIP.has(key) && !isReference(key)) wordsOf(v, out);
  }
  return out;
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compiled = new WeakMap();

/** An entry's tests, made once. */
function testsOf(entry) {
  let t = compiled.get(entry);
  if (t) return t;
  const name = escape(String(entry.name ?? ""));
  const word = `(?<![\\w-])${name}(?![\\w-])`;
  t = {
    loose: entry.match === "loose" ? new RegExp(word + (entry.notFollowedBy ? `(?!\\s+${escape(entry.notFollowedBy)}\\b)` : ""), "i") : null,
    strict: entry.match === "strict" ? new RegExp(word, "g") : null,
    valued: entry.valued ? new RegExp(`(?<![\\w-])${name}\\s+\\d\\b`, "i") : null,
    patterns: entry.match === "pattern" ? (entry.patterns ?? []).map((p) => new RegExp(p, "i")) : []
  };
  compiled.set(entry, t);
  return t;
}

/** Does a word start a sentence here: nothing before it but the start, a line's end or a sentence's, a quote or a bracket? */
function startsSentence(text, at) {
  let i = at - 1;
  while (i >= 0 && /[\s"'“”‘’([*_]/.test(text[i])) i--;
  return i < 0 || /[.!?:;—–]/.test(text[i]);
}

/** Is the next word capitalised (so this one is the first word of a longer name: "the Search Party")? */
const beforeAName = (text, end) => /^\s+[A-Z]/.test(text.slice(end, end + 3));

/** Does this piece of words name this entry? */
export function names(entry, text) {
  const t = testsOf(entry);
  if (t.patterns.length) return t.patterns.some((re) => re.test(text));
  if (t.valued?.test(text)) return true;
  if (t.loose) return t.loose.test(text);
  if (t.strict) {
    t.strict.lastIndex = 0;
    for (const m of text.matchAll(t.strict)) {
      if (startsSentence(text, m.index) || beforeAName(text, m.index + m[0].length)) continue;
      return true;
    }
  }
  return false;
}

/** What a chip carries: enough to open the rule, to say what it is, and to find where an SRD article says it (`lead`, `patterns`). */
const chip = (e) => {
  const out = { id: e.id, kind: e.kind, name: e.name, summary: e.summary ?? "" };
  if (e.uuid) out.uuid = e.uuid;
  if (e.srd) out.srd = e.srd;
  if (e.citation) out.citation = e.citation;
  if (e.srd && e.lead) out.lead = e.lead;
  if (e.srd && e.patterns?.length) out.patterns = [...e.patterns];
  return out;
};

/**
 * The rules a scene names, in the order a GM meets them: the creatures its fights bring (each opening its stat block), then
 * every condition, action and rule its words name, by where they are first named (the brief from its opening on, then its
 * checks, its fights and its clock), then the subsystem its clock is.
 *
 * @param bundle    { brief, challenges: { id: challenge }, encounters: { id: encounter }, subsystem }
 * @param glossary  data/rules-glossary.json: { entries }
 * @returns [{ id, kind: "creature" | "condition" | "action" | "rule", name, summary, uuid?, srd?, citation? }]
 */
export function rulesInScene({ brief = null, challenges = {}, encounters = {}, subsystem = null } = {}, glossary = null) {
  const out = [];
  const seen = new Set();
  const add = (e) => { if (!seen.has(e.id)) { seen.add(e.id); out.push(chip(e)); } };

  for (const encounter of Object.values(encounters ?? {})) {
    for (const c of encounter?.creatures ?? []) {
      if (typeof c?.compendium === "string" && c.compendium.startsWith("Compendium.")) add({ id: `creature:${c.compendium}`, kind: "creature", name: c.name ?? "Creature", uuid: c.compendium, summary: c.statline ?? "" });
    }
  }

  const entries = Array.isArray(glossary?.entries) ? glossary.entries : [];
  const texts = [
    ...wordsOf(brief),
    ...Object.values(challenges ?? {}).flatMap((c) => wordsOf(c)),
    ...Object.values(encounters ?? {}).flatMap((e) => wordsOf(e)),
    ...wordsOf(subsystem)
  ];
  // one test of each entry against everything at once (each piece closed as a sentence, so the next one's first word reads as
  // a sentence's first), then, for the few it finds, where each is first named
  const all = texts.join(" .\n");
  const named = entries.filter((e) => (e.kind !== "rule" || (e.patterns ?? []).length) && names(e, all));
  const first = new Map(named.map((e) => [e, texts.findIndex((t) => names(e, t))]));
  for (const e of named.filter((x) => first.get(x) >= 0).sort((a, b) => first.get(a) - first.get(b))) add(e);

  const kind = typeof subsystem?.subsystemType === "string" ? subsystem.subsystemType.toLowerCase() : null;
  if (kind) for (const e of entries) if (Array.isArray(e.subsystems) && e.subsystems.includes(kind)) add(e);
  return out;
}

/** Glossary entries whose name answers a query (the Palette's rules), best first: the name starting with it, then holding it. */
export function glossaryMatches(glossary, query, most = 6) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return [];
  const hits = [];
  for (const e of glossary?.entries ?? []) {
    const n = String(e.name ?? "").toLowerCase();
    const s = n.startsWith(q) ? 2 : n.includes(q) ? 1 : 0;
    if (s) hits.push({ s, e });
  }
  return hits.sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name)).slice(0, most).map((h) => chip(h.e));
}
