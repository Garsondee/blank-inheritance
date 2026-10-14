/**
 * The plot timeline's other ways in (design/plot-timeline.md §4, D070, D079): the strip shows what happens when, but most
 * of the story is not an event in time (a trait, a secret, an open question), so the page also reaches everything by
 * who or what it is about, by what is still undecided, and by searching. Pure: the snapshot in, plain lists out. The page
 * on this PC uses it now, and a Foundry window can later.
 */
import { dueChapter, horizonOf } from "./timeline-health.mjs";

export const KIND_ORDER = Object.freeze(["person", "group", "place", "thing", "event", "concept"]);
export const KIND_TITLE = Object.freeze({ person: "People", group: "Groups", place: "Places", thing: "Things", event: "Events", concept: "The world" });

const INK = new Set(["decided", "accepted", "provisional", "proposal"]);
/** "ink", "pencil", "open" or null (a cut item is in no bucket). */
export const bucketOf = (status) => (status === "open" ? "open" : status === "sketch" ? "pencil" : status === "cut" ? null : INK.has(status) ? "ink" : null);

const clip = (text, n) => {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** Every entity with what canon holds about it, for the "People & places" view. */
export function entityIndex(snap) {
  const threadsOf = new Map();
  const note = (entity, thread) => { if (!threadsOf.has(entity)) threadsOf.set(entity, new Set()); threadsOf.get(entity).add(thread); };
  for (const t of snap.threads || []) for (const e of t.entities || []) note(e, t.id);
  const out = (snap.entities || []).map((e) => ({ id: e.id, title: e.title, kind: e.kind || "thing", notes: e.notes || null, counts: { ink: 0, pencil: 0, open: 0, cards: 0 }, total: 0, dated: 0, snippet: "", threads: [], threadIds: [] }));
  const byId = new Map(out.map((e) => [e.id, e]));
  const firstInk = new Map();
  const firstPencil = new Map();
  for (const f of snap.facts || []) {
    const e = byId.get(f.entity);
    const b = bucketOf(f.status);
    if (!e || !b) continue;
    e.counts[b]++;
    e.total++;
    if (f.when) e.dated++;
    for (const t of f.threads || []) note(e.id, t);
    if (b === "ink" && !firstInk.has(e.id)) firstInk.set(e.id, f.text);
    if (b === "pencil" && !firstPencil.has(e.id)) firstPencil.set(e.id, f.text);
  }
  const titles = new Map((snap.threads || []).map((t) => [t.id, t.title]));
  // What a person holds is a card, or a pencil fact that is in none: counts.cards is that number (0 when nothing is grouped).
  const carded = new Map();
  for (const c of snap.cards || []) { const e = byId.get(c.entity); if (e && c.members.length) { e.counts.cards++; carded.set(c.entity, (carded.get(c.entity) || 0) + c.members.length); } }
  for (const e of out) if (e.counts.cards) e.counts.cards += e.counts.pencil - (carded.get(e.id) || 0);
  for (const e of out) {
    e.snippet = clip(firstInk.get(e.id) ?? firstPencil.get(e.id) ?? "", 150);
    e.threadIds = [...(threadsOf.get(e.id) || [])];
    e.threads = e.threadIds.map((id) => ({ id, title: titles.get(id) || id }));
  }
  return out;
}

/** Entities grouped by kind in a steady order, biggest first within a kind: [{ kind, title, entities }]. */
export function entityGroups(snap, { query = "", kinds = null } = {}) {
  const q = String(query || "").trim().toLowerCase();
  const list = entityIndex(snap).filter((e) => (!kinds || kinds.includes(e.kind)) && (!q || `${e.title} ${e.id} ${e.snippet}`.toLowerCase().includes(q)));
  const groups = new Map();
  for (const e of list) { if (!groups.has(e.kind)) groups.set(e.kind, []); groups.get(e.kind).push(e); }
  const order = (k) => { const i = KIND_ORDER.indexOf(k); return i < 0 ? 99 : i; };
  return [...groups].sort((a, b) => order(a[0]) - order(b[0])).map(([kind, entities]) => ({ kind, title: KIND_TITLE[kind] || kind, entities: entities.sort((a, b) => b.total - a.total || a.title.localeCompare(b.title)) }));
}

/** One entity's page: its facts in the order to trust them (open, ink, pencil), its ideas and where its threads go. */
export function entityPage(snap, id) {
  const entity = (snap.entities || []).find((e) => e.id === id);
  if (!entity) return null;
  const facts = (snap.facts || []).filter((f) => f.entity === id);
  const ofBucket = (b) => facts.filter((f) => bucketOf(f.status) === b);
  const threads = (snap.threads || []).filter((t) => (t.entities || []).includes(id) || facts.some((f) => (f.threads || []).includes(t.id)));
  const needle = new RegExp(`\\b${String(entity.title).replace(/^The /, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const ideas = (snap.ideas || []).filter((i) => needle.test(i.text || "") || (i.threads || []).some((t) => threads.some((x) => x.id === t) && false));
  const pencil = ofBucket("pencil");
  const byId = new Map(pencil.map((f) => [f.id, f]));
  const cards = (snap.cards || []).filter((c) => c.entity === id).map((c) => ({ id: c.id, title: c.title, facts: c.members.map((m) => byId.get(m)).filter(Boolean) })).filter((c) => c.facts.length);
  const carded = new Set(cards.flatMap((c) => c.facts.map((f) => f.id)));
  return { entity, open: ofBucket("open"), ink: ofBucket("ink"), pencil, cards, loose: pencil.filter((f) => !carded.has(f.id)), cut: facts.filter((f) => f.status === "cut"), threads, ideas };
}

// ---- search

const WHERE = {
  fact: (x) => x.id,
  beat: (x) => `beat:${x.id}`,
  idea: (x) => `idea:${x.id}`,
  question: (x) => `question:${x.id}`,
  thread: (x) => `thread:${x.id}`,
  entity: (x) => `entity:${x.id}`,
  scene: (x) => `scene:${x.id}`,
  chapter: (x) => `chapter:${x.id}`,
};

/**
 * Search the whole story: every word must appear somewhere in an item's id, title or words. Titles and ids rank above
 * words, ink above pencil. Returns [{ kind, id, target, title, snippet, status, by, score }] best first.
 */
export function searchAll(snap, query, { limit = 40 } = {}) {
  const terms = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out = [];
  // Pages you navigate by rank a little above the facts that merely mention them.
  const BOOST = { entity: 2, thread: 1, chapter: 0.6, question: 0.6 };
  const consider = (kind, x, title, text, status, by) => {
    const head = `${x.id} ${title}`.toLowerCase();
    const body = String(text || "").toLowerCase();
    let score = BOOST[kind] || 0;
    for (const t of terms) {
      if (head.includes(t)) score += 3;
      else if (body.includes(t)) score += 1;
      else return;
    }
    if (bucketOf(status) === "ink") score += 0.5;
    else if (bucketOf(status) === "open") score += 0.4;
    out.push({ kind, id: x.id, target: WHERE[kind](x), title: title || x.id, snippet: clip(text, 160), status: status || null, by: by || null, score });
  };
  for (const e of snap.entities || []) consider("entity", e, e.title, e.notes ? Object.values(e.notes).join(" ") : "", null, null);
  for (const t of snap.threads || []) consider("thread", t, t.title, `${t.text || ""} ${t.impulse || ""} ${t.doom || ""}`, t.status, t.by);
  for (const q of snap.questions || []) consider("question", q, q.title, q.text, q.status, q.by);
  for (const s of snap.scenes || []) consider("scene", s, s.title, s.episode, s.state === "approved" ? "decided" : s.inCanon ? "provisional" : "sketch", null);
  for (const c of snap.chapters || []) {
    consider("chapter", c, `Chapter ${c.n} · ${c.title}`, `${c.text || ""} ${c.learn || ""}`, c.status, c.by);
    for (const b of c.beats || []) consider("beat", b, "", b.text, b.status, b.by);
  }
  for (const i of snap.ideas || []) consider("idea", i, "", i.text, i.status, i.by);
  const entityTitle = new Map((snap.entities || []).map((e) => [e.id, e.title]));
  for (const f of snap.facts || []) {
    if (f.status === "cut") continue;
    consider("fact", f, entityTitle.get(f.entity) || f.entity, f.text, f.status, f.by);
  }
  return out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

// ---- not placed in time

/**
 * The facts the strip can't place, for one lane (or every lane), grouped by entity: [{ entity, title, facts }].
 * @param {{ unplaced: object[] }} tl  buildTimeline()'s result
 */
export function unplacedGroups(snap, tl, lane = "all") {
  const titles = new Map((snap.entities || []).map((e) => [e.id, e.title]));
  const groups = new Map();
  for (const u of tl.unplaced || []) {
    if (lane !== "all" && u.lane !== lane) continue;
    if (!groups.has(u.entity)) groups.set(u.entity, []);
    groups.get(u.entity).push(u);
  }
  const rank = { open: 0, ink: 1, pencil: 2 };
  return [...groups].map(([entity, facts]) => ({ entity, title: titles.get(entity) || entity, facts: facts.sort((a, b) => (rank[bucketOf(a.status)] ?? 3) - (rank[bucketOf(b.status)] ?? 3)) })).sort((a, b) => b.facts.length - a.facts.length || a.title.localeCompare(b.title));
}

// ---- what changed, and what the imports disagreed with

const KIND_WORD = { decision: "your words", import: "Claude's import", timeline: "your edits", merge: "Claude's merge" };

/** Every decision record, newest first, with what it holds. */
export function recentDecisions(snap) {
  return [...(snap.decisions || [])].sort((a, b) => b.id.localeCompare(a.id)).map((d) => ({
    id: d.id, date: d.date, title: d.title, kind: d.kind, kindWord: KIND_WORD[d.kind] || d.kind,
    changes: (d.changes || []).length, conflicts: (d.conflicts || []).length, quoted: (d.quotes || []).length,
  }));
}

/** One record in full: what was asked, her words, the conflicts, and its changes grouped by what was done. */
export function recordPage(snap, id) {
  const d = (snap.decisions || []).find((x) => x.id === id);
  if (!d) return null;
  const known = new Set([...(snap.facts || []).map((f) => f.id), ...(snap.ideas || []).map((i) => i.id), ...(snap.threads || []).map((t) => t.id), ...(snap.questions || []).map((q) => q.id), ...(snap.chapters || []).flatMap((c) => [c.id, ...(c.beats || []).map((b) => b.id)])]);
  const byVerb = new Map();
  for (const ch of d.changes || []) {
    if (!byVerb.has(ch.verb)) byVerb.set(ch.verb, []);
    byVerb.get(ch.verb).push({ id: ch.target, rest: ch.rest || "", exists: known.has(ch.target) });
  }
  return { ...d, kindWord: KIND_WORD[d.kind] || d.kind, groups: [...byVerb].map(([verb, targets]) => ({ verb, targets })) };
}

// ---- Claude's merges (tools/story/merge.mjs): pieces of one thing made one, each for her to accept, edit or undo

/** The live merge that made an item, if any: { ref, kept, why, pieces: [{ id, text, ... }], accepted, edited }. */
export function mergeFor(snap, id) {
  return (snap.merges || []).find((m) => m.kept === id && m.state === "live") || null;
}

/**
 * The merges she can still act on, grouped by the file they are in: [{ key, title, merges }], the ones not yet marked
 * "looks right" first. `toCheck` counts the live merges she has not looked at; `pieces` the items they replaced.
 */
export function mergesPage(snap) {
  const titles = new Map([...(snap.entities || []).map((e) => [e.id, e.title]), ...(snap.ideas || []).map((i) => [i.topic, `Ideas: ${i.topic}`])]);
  const text = new Map([...(snap.facts || []).map((f) => [f.id, f.text]), ...(snap.ideas || []).map((i) => [i.id, i.text])]);
  const live = (snap.merges || []).filter((m) => m.state === "live");
  const groups = new Map();
  for (const m of live) {
    const key = m.kind === "idea" ? `ideas:${(snap.ideas || []).find((i) => i.id === m.kept)?.topic || "ideas"}` : m.kept.split(".")[0];
    if (!groups.has(key)) groups.set(key, { key, title: m.kind === "idea" ? `Ideas · ${key.slice(6)}` : titles.get(key) || key, merges: [] });
    groups.get(key).merges.push({ ...m, text: text.get(m.kept) || "" });
  }
  const list = [...groups.values()].map((g) => ({ ...g, merges: g.merges.sort((a, b) => Number(a.accepted) - Number(b.accepted) || a.ref.localeCompare(b.ref, "en", { numeric: true })) }));
  list.sort((a, b) => b.merges.filter((m) => !m.accepted).length - a.merges.filter((m) => !m.accepted).length || a.title.localeCompare(b.title));
  return {
    groups: list,
    live: live.length,
    toCheck: live.filter((m) => !m.accepted).length,
    accepted: live.filter((m) => m.accepted).length,
    edited: live.filter((m) => m.edited).length,
    undone: (snap.merges || []).filter((m) => m.state === "undone").length,
    pieces: live.reduce((n, m) => n + m.pieces.length, 0),
  };
}

// ---- what is still hers to decide

/** One open fact as the Decisions view shows it. */
function decision(snap, f, titles) {
  const used = (snap.citations?.[f.id] || []).filter((w) => /canon\/(scenes|objectives)\//.test(w.file));
  const due = dueChapter(snap, f.decideBy);
  return {
    id: f.id, entity: f.entity, entityTitle: titles.get(f.entity) || f.entity, text: f.text, candidates: f.candidates || [], decideBy: f.decideBy || null,
    when: f.when || null, known: f.known, told: f.told, due, usedInside: used.length > 0, uses: used,
  };
}

/**
 * Every open fact, in groups by how soon it is needed: [{ key, title, items }].
 *   now    play material relies on it, or it is due by the chapter the table is in
 *   book   due by the end of the Book the table is in (the event horizon)
 *   later  due after the horizon
 *   event  its deadline is a moment in the story ("before a scene names him"), not a chapter or a Book
 *   none   no deadline written
 */
export function decisionGroups(snap) {
  const horizon = horizonOf(snap);
  const nowChapter = snap.now?.chapter ?? 1;
  const titles = new Map((snap.entities || []).map((e) => [e.id, e.title]));
  const items = (snap.facts || []).filter((f) => f.status === "open").map((f) => decision(snap, f, titles));
  const keyOf = (d) => (d.usedInside || d.due <= nowChapter ? "now" : d.due <= horizon ? "book" : d.due !== Infinity ? "later" : d.decideBy ? "event" : "none");
  const names = { now: "Needed now", book: `Needed before the end of Book ${["I", "II", "III", "IV", "V"][((snap.books || []).find((b) => nowChapter >= b.from && nowChapter <= b.to)?.book ?? 1) - 1]}`, later: "Needed later", event: "Needed when a scene reaches it", none: "No deadline written" };
  const groups = ["now", "book", "later", "event", "none"].map((key) => ({ key, title: names[key], items: items.filter((d) => keyOf(d) === key).sort((a, b) => a.due - b.due || a.entityTitle.localeCompare(b.entityTitle) || a.id.localeCompare(b.id)) }));
  return groups.filter((g) => g.items.length);
}

/**
 * The `when` an answer implies: an open fact's `when` lists one date per candidate, in the candidates' own order, so
 * picking candidate i picks date i; when the two lists differ in length there is no way to tell, and she types it.
 */
export function whenForCandidate(openWhen, candidates, index) {
  const options = String(openWhen || "").split("|").map((s) => s.trim()).filter(Boolean);
  return options.length > 1 && options.length === (candidates || []).length ? options[index] ?? "" : "";
}
