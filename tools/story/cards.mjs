// Cards (design/plot-timeline.md, "Cards over claims", D083): a titled group of pencil facts about one thing.
//
// A card changes nothing about the facts in it. Every fact keeps its own id, words, author, who knows it, when the table is
// told and its sources; the card only names the group, so a person can hold and decide "the revenge list" instead of six
// separate claims. Because nothing about a fact is touched, nothing can be lost by grouping, and undoing it is deleting
// the group.
//
// In a world file the cards are one section at the END of the file (after every fact, so no fact's position moves), each
// card a "### Title" followed by "- entity.fact-id" lines:
//
//   ## Cards
//
//   ### The revenge list
//   - manako.revenge-list
//   - manako.its-steering
//
// A title is a LABEL, never a claim: a short noun phrase (at most nine words, no full stop), so a card can't say
// something its facts don't. Pure: text in, plain data out.

export const CARDS_HEADING = "Cards";
export const MAX_TITLE_WORDS = 9;

export const slugOf = (title) => String(title).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * The cards of one world file's "## Cards" body: [{ id, title, members }] and any format problems. A card's id is
 * "entity/slug-of-its-title".
 */
export function parseCards(body, entity) {
  const cards = [];
  const problems = [];
  let cur = null;
  for (const raw of body) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("### ")) {
      const title = line.slice(4).trim();
      cur = { id: `${entity}/${slugOf(title)}`, title, members: [] };
      cards.push(cur);
    } else if (/^[-*] /.test(line)) {
      if (!cur) { problems.push(`a member line comes before any "### Title": ${line}`); continue; }
      cur.members.push(line.slice(2).replace(/`/g, "").trim());
    } else problems.push(`a card line must be "### Title" or "- fact-id": ${line}`);
  }
  return { cards, problems };
}

/**
 * Checks one file's cards against its facts. `facts` is a Map of the file's fact id to the fact; `resolve` follows an id a
 * merge absorbed to the item that holds its words now. Errors are things that break the grouping; notes are things that
 * simply need tidying (a fact she inked has left the pencil, so it drops out of its card on its own).
 */
export function checkCards(entity, cards, facts, resolve = (id) => id) {
  const out = [];
  const err = (message) => out.push({ level: "error", message });
  const note = (message) => out.push({ level: "note", message });
  const seen = new Map();
  const titles = new Set();
  for (const c of cards) {
    if (titles.has(c.id)) err(`two cards are titled alike: ${c.id}`);
    titles.add(c.id);
    const words = c.title.split(/\s+/).filter(Boolean);
    if (!words.length) err(`a card has no title`);
    if (words.length > MAX_TITLE_WORDS || /[.!?]$/.test(c.title)) err(`card "${c.title}": a title is a label (at most ${MAX_TITLE_WORDS} words, no full stop), never a claim`);
    let live = 0;
    for (const raw of c.members) {
      const id = resolve(raw);
      const f = facts.get(id);
      if (!f) { err(`card "${c.title}" names ${raw}, which is not a fact of ${entity}.md`); continue; }
      if (seen.has(id)) { err(`${id} is in two cards: "${seen.get(id)}" and "${c.title}"`); continue; }
      seen.set(id, c.title);
      if (f.status !== "sketch") { note(`card "${c.title}": ${id} has left the pencil (${f.status}); drop it from the card`); continue; }
      live++;
    }
    if (!live) note(`card "${c.title}" holds no pencil any more; delete it`);
  }
  return out;
}

/** fact id -> card id, for every member that exists (followed through `resolve`). */
export function cardIndex(cards, resolve = (id) => id) {
  const m = new Map();
  for (const c of cards) for (const raw of c.members) m.set(resolve(raw), c.id);
  return m;
}
