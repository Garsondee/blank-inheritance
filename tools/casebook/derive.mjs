// The Casebook's generated sections, derived from canon (D080: "The Casebook is generated from canon").
//
// Nothing in this file is story. It reads the canon model (tools/story/lib.mjs) and its snapshot (snapshot.mjs), reuses
// what the timeline page already derives (the decision groups, the entity index, the thread rise and fall, the chapter
// a place falls in), and returns one plain document: parts, sections and cards, ready for render.mjs to draw as HTML
// or Markdown. Part Zero (every Episode One scene in full) is detail.mjs's, and is left alone.
//
// The one rule that shapes everything: **every fact has exactly one record on the page**, so nothing is dropped and
// nothing is told twice. A fact's home is
//   - Still hers      if it is open (a decision Ingram still has to make),
//   - Cut             if it is cut (its wording must not come back),
//   - its chapter     if the table is told it in a chapter or one of that chapter's beats,
//   - its entity      otherwise (the person, place, group or thing it is about),
// and everywhere else it is only pointed at, by id. `placed` proves it: deriveCasebook reports in `problems` any fact
// it would place twice or not at all, and the tests count the records on the finished page.
import { snapshot } from "../story/snapshot.mjs";
import { parseBooks } from "../story/plot.mjs";
import { decisionGroups, entityIndex, KIND_ORDER, KIND_TITLE } from "../../module/blank-inheritance/scripts/core/timeline-views.mjs";
import { chapterOfPlace, dueChapter } from "../../module/blank-inheritance/scripts/core/timeline-health.mjs";
import { threadIntensity } from "../../module/blank-inheritance/scripts/core/timeline-model.mjs";

// ---- small helpers

const pad2 = (n) => String(n).padStart(2, "0");
/** A decision record is hers when it holds her words: a decision, or her day's edits on the timeline (never an import). */
const isHers = (d) => d.kind === "decision" || d.kind === "timeline";
/** Plain code-unit order, so the page is the same on every machine and every locale. */
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const titleKey = (t) => String(t || "").replace(/^(?:the|a|an)\s+/i, "").toLowerCase();
export const clip = (text, n = 110) => {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** The six tags a record can carry, from its status (and, for pencil, whose words it is). */
export function tagOf(item) {
  switch (item?.status) {
    case "decided":
    case "accepted": return "ink";
    case "provisional":
    case "proposal": return "wait";
    case "sketch": return item.by === "ingram" ? "pencil-hers" : "pencil-claude";
    case "open": return "open";
    case "cut": return "cut";
    default: return null;
  }
}
export const isSecret = (known) => known === "few" || known === "nobody";

/** A world file's free-text notes, with import bookkeeping lines (`from: ...`) left out. */
function cleanNote(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n").filter((l) => !/^from: \S/.test(l));
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** A chapter file's own `## Notes` (the GM's), which the plot parser leaves in the raw text. */
function chapterNotes(raw) {
  if (!raw) return "";
  const m = String(raw).replace(/\r\n/g, "\n").split(/^## Notes[ \t]*$/m);
  if (m.length < 2) return "";
  return cleanNote(m[1].split(/^## /m)[0]);
}

/** The first words of a decision record's body, for the old split records that quote nothing. */
function excerptOf(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n").slice(1);
  const out = [];
  for (const l of lines) {
    if (/^(source|asked|kind): /.test(l) || /^#{1,6} /.test(l) || /^\s*$/.test(l)) { if (out.length) break; continue; }
    out.push(l.trim());
  }
  return clip(out.join(" ").replace(/\*\*/g, ""), 600);
}

// ---- the context every section reads from

function makeContext(model, snap) {
  const facts = model.world.flatMap((e) => e.facts);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const entityById = new Map(model.world.map((e) => [e.id, e]));
  const chapters = [...(model.chapters || [])].sort((a, b) => a.n - b.n);
  const chapterById = new Map(chapters.map((c) => [c.id, c]));
  const beatById = new Map();
  for (const c of chapters) for (const b of c.beats) beatById.set(b.id, { beat: b, chapter: c });
  const books = [...(model.books || [])].sort((a, b) => a.book - b.book);
  const rowByScene = new Map((model.plan || []).map((r) => [r.scene, r]));
  const canonScenes = new Set((model.scenes || []).map((s) => s.id));
  // Part Zero shows a scene only once it is in canon and waiting for, or past, her read.
  const partZero = new Set((model.plan || []).filter((r) => (r.state === "awaiting-read" || r.state === "approved") && canonScenes.has(r.scene)).map((r) => r.scene));
  const decisionById = new Map(model.decisions.map((d) => [d.id, d]));
  // The records that have an entry under "Her calls": hers (a decision) or her day's edits (the timeline). An import is
  // Claude's record, so nothing links to it.
  const callIds = new Set(model.decisions.filter(isHers).map((d) => d.id));
  const sourceIds = new Set((model.sources || []).map((s) => s.id));
  const threadById = new Map((model.threads || []).map((t) => [t.id, t]));
  const questionById = new Map((model.questions || []).map((q) => [q.id, q]));
  const ideaById = new Map((model.ideas || []).map((i) => [i.id, i]));
  const bookOfChapter = (n) => books.find((b) => n >= b.from && n <= b.to) || null;
  return { model, snap, facts, byId, entityById, chapters, chapterById, beatById, books, rowByScene, canonScenes, partZero, decisionById, callIds, sourceIds, threadById, questionById, ideaById, bookOfChapter };
}

// ---- where the table hears things

const shortEpisode = (episode) => String(episode || "").split(":")[0];

/** A `told`, `raised` or `answered` place in words, with the page link that goes to it when there is one. */
function placeView(place, cx) {
  if (place === "start") return { kind: "start", label: "from the start", href: null, chapter: 1 };
  if (!place || place === "later") return { kind: "later", label: "later", href: null, chapter: null };
  const m = /^in:(.+)$/.exec(place);
  if (!m) return { kind: "other", label: String(place), href: null, chapter: null };
  const id = m[1];
  const row = cx.rowByScene.get(id);
  if (row) return { kind: "scene", label: `${shortEpisode(row.episode)} · ${row.title}`, href: cx.partZero.has(id) ? `#scene-${id}` : null, chapter: chapterOfPlace(cx.snap, place) };
  const chapter = cx.chapterById.get(id);
  if (chapter) return { kind: "chapter", label: `Chapter ${chapter.n}`, href: `#c${chapter.n}`, chapter: chapter.n };
  const hit = cx.beatById.get(id);
  if (hit) return { kind: "beat", label: `Chapter ${hit.chapter.n}: ${clip(hit.beat.text, 50)}`, href: `#b-${id}`, chapter: hit.chapter.n };
  return { kind: "other", label: id, href: null, chapter: null };
}

function sourceView(id, cx) {
  if (/^D\d{3}$/.test(id)) {
    const d = cx.decisionById.get(id);
    return { id, kind: !d ? "unknown" : cx.callIds.has(id) ? "decision" : "import", href: cx.callIds.has(id) ? `#d-${id}` : null };
  }
  if (/^S\d{3}$/.test(id)) return { id, kind: "source", href: cx.sourceIds.has(id) ? `#d-${id}` : null };
  return { id, kind: "scene", href: cx.partZero.has(id) ? `#scene-${id}` : null };
}

/** A thread named somewhere, with its title, and whether canon has a file for it (so the page can link to it). */
function threadChip(id, cx) {
  const t = cx.threadById.get(id);
  return { id, title: t?.title || id, known: Boolean(t) };
}

/** A fact named by another fact (a payoff, a truth): linked only if it exists. */
function factLink(id, cx) {
  return id ? { id, href: cx.byId.has(id) ? `#f-${id}` : null } : null;
}

function factView(f, cx) {
  return {
    id: f.id, entity: f.entity, text: f.text, status: f.status, by: f.by || null, tag: tagOf(f),
    secret: isSecret(f.known), known: f.known, told: f.told, toldAt: placeView(f.told, cx), when: f.when || null,
    threads: f.threads || [], source: (f.source || []).map((s) => sourceView(s, cx)),
    payoff: factLink(f.payoff, cx), truth: factLink(f.truth, cx), heldBy: f.heldBy || null, isTrue: f.isTrue || null,
    candidates: f.candidates || [], decideBy: f.decideBy || null, retire: f.retire || [],
  };
}

/** Where a fact lives (the rule at the top of this file). */
function homeOf(f, cx) {
  if (f.status === "open") return { kind: "hers" };
  if (f.status === "cut") return { kind: "cut" };
  const m = /^in:(.+)$/.exec(f.told || "");
  if (m) {
    const chapter = cx.chapterById.get(m[1]);
    if (chapter) return { kind: "plan", chapter: chapter.n, beat: null };
    const hit = cx.beatById.get(m[1]);
    if (hit) return { kind: "plan", chapter: hit.chapter.n, beat: hit.beat.id };
  }
  return { kind: "world", entity: f.entity };
}

/** A reference to anything with an id, for the places that point at a record without repeating it. */
function refView(id, cx) {
  const f = cx.byId.get(id);
  if (f) return { id, kind: "fact", text: clip(f.text, 120), href: `#f-${id}`, tag: tagOf(f), secret: isSecret(f.known), toldAt: placeView(f.told, cx), status: f.status };
  const b = cx.beatById.get(id);
  if (b) return { id, kind: "beat", text: clip(b.beat.text, 120), href: `#b-${id}`, tag: tagOf(b.beat), chapter: b.chapter.n, toldAt: { kind: "beat", label: `Chapter ${b.chapter.n}`, href: `#c${b.chapter.n}`, chapter: b.chapter.n } };
  const row = cx.rowByScene.get(id);
  if (row) return { id, kind: "scene", text: row.title, href: cx.partZero.has(id) ? `#scene-${id}` : null, tag: null, toldAt: placeView(`in:${id}`, cx) };
  const c = cx.chapterById.get(id);
  if (c) return { id, kind: "chapter", text: `Chapter ${c.n}: ${c.title}`, href: `#c${c.n}`, tag: tagOf(c) };
  const t = cx.threadById.get(id);
  if (t) return { id, kind: "thread", text: t.title, href: `#t-${id}`, tag: tagOf(t) };
  const i = cx.ideaById.get(id);
  if (i) return { id, kind: "idea", text: clip(i.text, 120), href: `#i-${id}`, tag: tagOf(i) };
  return { id, kind: "missing", text: "", href: null, tag: null };
}

// ---- the world, by entity

function worldSections(cx, buckets, ei) {
  const eiById = new Map(ei.map((e) => [e.id, e]));
  const cards = cx.model.world.map((e) => {
    const all = e.facts;
    const count = { ink: 0, wait: 0, pencilHers: 0, pencilClaude: 0, open: 0, cut: 0, secret: 0, total: all.length };
    for (const f of all) {
      const tag = tagOf(f);
      if (tag === "ink") count.ink++;
      else if (tag === "wait") count.wait++;
      else if (tag === "pencil-hers") count.pencilHers++;
      else if (tag === "pencil-claude") count.pencilClaude++;
      else if (tag === "open") count.open++;
      else if (tag === "cut") count.cut++;
      if (f.status !== "cut" && isSecret(f.known)) count.secret++;
    }
    const mine = buckets.world.get(e.id) || [];
    const inPlan = new Map();
    for (const f of all) {
      const home = homeOf(f, cx);
      if (home.kind !== "plan") continue;
      if (!inPlan.has(home.chapter)) inPlan.set(home.chapter, []);
      inPlan.get(home.chapter).push(f.id);
    }
    const notes = Object.entries(e.notes || {}).map(([heading, text]) => ({ heading, text: cleanNote(text) })).filter((n) => n.text);
    return {
      id: e.id, title: e.title, kind: e.kind || "", count,
      notes,
      threads: (eiById.get(e.id)?.threads || []).map((t) => ({ id: t.id, title: t.title })),
      known: mine.filter((v) => !v.secret),
      secrets: mine.filter((v) => v.secret),
      inPlan: [...inPlan].sort((a, b) => a[0] - b[0]).map(([n, ids]) => ({ chapter: n, href: `#c${n}`, ids })),
      open: all.filter((f) => f.status === "open").map((f) => f.id),
      cut: all.filter((f) => f.status === "cut").map((f) => f.id),
    };
  });
  const kinds = [...KIND_ORDER];
  for (const k of [...new Set(cards.map((c) => c.kind))].sort(cmp)) if (!kinds.includes(k)) kinds.push(k);
  const sections = [];
  for (const kind of kinds) {
    const list = cards.filter((c) => c.kind === kind).sort((a, b) => cmp(titleKey(a.title), titleKey(b.title)) || cmp(a.id, b.id));
    if (!list.length) continue;
    sections.push({ key: "world", id: `world-${kind || "other"}`, title: KIND_TITLE[kind] || cap(kind) || "Other", kind, cards: list, count: list.length });
  }
  return sections;
}

// ---- the plan: Books and chapters

function beatView(b, cx, buckets) {
  const fork = b.fork === "yes";
  return {
    id: b.id, text: b.text, kind: b.kind, pace: b.pace || null, tag: tagOf(b), status: b.status, by: b.by || null,
    threads: (b.threads || []).map((t) => threadChip(t, cx)),
    when: b.when || null, fork,
    reveals: (b.reveals || []).map((id) => refView(id, cx)),
    tells: buckets.beat.get(b.id) || [],
  };
}

function chapterCard(c, cx, buckets) {
  const rows = (cx.model.plan || []).filter((r) => r.file === `chapter-${pad2(c.n)}.md`);
  const episodes = [];
  for (const r of rows) {
    let ep = episodes.find((e) => e.name === r.episode);
    if (!ep) episodes.push((ep = { name: r.episode, scenes: 0, awaiting: 0, approved: 0, oldDraft: 0 }));
    ep.scenes++;
    if (r.state === "awaiting-read") ep.awaiting++;
    else if (r.state === "approved") ep.approved++;
    else ep.oldDraft++;
  }
  const beats = c.beats.map((b) => beatView(b, cx, buckets));
  const book = cx.bookOfChapter(c.n);
  const threadIds = [...new Set(c.beats.flatMap((b) => b.threads || []))];
  return {
    id: c.id, n: c.n, title: cap(c.title), book: book ? book.numeral : c.book || null, rank: c.rank || null,
    tag: tagOf(c), status: c.status, by: c.by || null, text: c.text || "", learn: c.learn || null,
    built: rows.length > 0, episodes,
    table: beats.filter((b) => !["choice", "end"].includes(b.kind)),
    choices: beats.filter((b) => b.kind === "choice"),
    ends: beats.filter((b) => b.kind === "end"),
    finds: buckets.chapter.get(c.n) || [],
    notes: chapterNotes(cx.model.plotRaw?.[`plan/chapter-${pad2(c.n)}.md`]),
    // The decisions still hers that say they are due by this chapter (pointers: each lives under Still hers).
    due: cx.facts.filter((f) => f.status === "open" && dueChapter(cx.snap, f.decideBy) === c.n).map((f) => refView(f.id, cx)),
    threads: threadIds.map((t) => threadChip(t, cx)),
  };
}

function bookCard(b, chapterCards) {
  return {
    id: b.id, numeral: b.numeral, book: b.book, title: b.title, from: b.from, to: b.to, text: b.text || "", rows: b.rows || [],
    tag: tagOf(b), status: b.status, by: b.by || null,
    chapters: chapterCards.filter((c) => c.n >= b.from && c.n <= b.to),
  };
}

/** The rows every Book says something about, which is what "how the party grows" can honestly compare. */
function growthTable(books) {
  if (books.length < 2) return null;
  const labels = [];
  for (const b of books) for (const [label] of b.rows) if (!labels.includes(label)) labels.push(label);
  const common = labels.filter((l) => books.every((b) => b.rows.some(([x]) => x === l)));
  if (!common.length) return null;
  return {
    books: books.map((b) => ({ id: b.id, numeral: b.numeral, title: b.title, from: b.from, to: b.to })),
    rows: common.map((label) => ({ label, cells: books.map((b) => (b.rows.find(([x]) => x === label) || [])[1] || "") })),
  };
}

// ---- questions and their roads

function questionCard(q, cx) {
  const roads = q.roads.map((r) => ({ core: r.core, kind: r.kind, note: r.note || null, ref: refView(r.fact, cx) }));
  const kinds = [...new Set(roads.map((r) => r.kind))].sort(cmp);
  const flags = [];
  if (roads.length < 3) flags.push(`short of three roads (${roads.length})`);
  if (roads.length && kinds.length === 1) flags.push("every road is the same kind of clue");
  if (roads.length && roads.every((r) => r.kind === "pattern")) flags.push("a pattern clue is the only road");
  if (roads.length && !roads.some((r) => r.core)) flags.push("no road is marked core");
  const answeredCh = chapterOfPlace(cx.snap, q.answered);
  const at = Number.isFinite(answeredCh) ? answeredCh : null;
  const book = at ? cx.bookOfChapter(at) : null;
  // The earliest a road reaches the table, by play order (a road told later than the answer, or not yet, is last).
  const order = cx.snap.order || {};
  let earliest = null;
  for (const r of roads) {
    const place = r.ref.toldAt;
    const toldKey = r.ref.kind === "fact" ? cx.byId.get(r.ref.id)?.told : `in:${r.ref.id}`;
    const seq = toldKey === "start" ? -1 : /^in:/.test(toldKey || "") && order[toldKey.slice(3)] !== undefined ? order[toldKey.slice(3)] : null;
    if (seq === null) continue;
    if (earliest === null || seq < earliest.seq) earliest = { seq, place };
  }
  return {
    id: q.id, title: q.title, text: q.text || "", tag: tagOf(q), status: q.status, by: q.by || null,
    answer: q.answer ? refView(q.answer, cx) : null, misdirect: q.misdirect ? refView(q.misdirect, cx) : null,
    raised: q.raised ? placeView(q.raised, cx) : null, answered: q.answered ? placeView(q.answered, cx) : null,
    book: book ? book.numeral : null, roads, kinds, flags, earliest: earliest ? earliest.place : null,
  };
}

function questionsSection(cx) {
  const cards = (cx.model.questions || []).map((q) => questionCard(q, cx));
  const order = cx.snap.order || {};
  const answeredSeq = (card) => { const q = cx.questionById.get(card.id); const m = /^in:(.+)$/.exec(q.answered || ""); return m && order[m[1]] !== undefined ? order[m[1]] : Infinity; };
  const groups = [];
  for (const b of cx.books) {
    const list = cards.filter((c) => c.book === b.numeral).sort((x, y) => answeredSeq(x) - answeredSeq(y) || cmp(x.id, y.id));
    if (list.length) groups.push({ book: b.numeral, title: b.title, cards: list });
  }
  const rest = cards.filter((c) => !cx.books.some((b) => b.numeral === c.book)).sort((x, y) => cmp(x.id, y.id));
  if (rest.length) groups.push({ book: null, title: "Answer not yet placed in a chapter", cards: rest });
  return { key: "questions", id: "questions", title: "The questions and their roads", groups, count: cards.length };
}

// ---- threads and fronts

function threadCard(t, cx) {
  const rf = threadIntensity(cx.snap, { id: t.id, intensity: t.intensity });
  return {
    id: t.id, title: t.title, kind: t.kind, lane: t.lane, order: t.order, text: t.text || "", impulse: t.impulse, doom: t.doom,
    tag: tagOf(t), status: t.status, by: t.by || null,
    entities: t.entities.map((e) => ({ id: e, title: cx.entityById.get(e)?.title || e, known: cx.entityById.has(e) })),
    byBook: cx.books.map((b) => ({ numeral: b.numeral, text: t.byBook[b.book] || "" })),
    rise: { values: rf.values, source: rf.source },
    clocks: t.clocks.map((cl) => ({ name: cl.name, steps: cl.items.map((id) => refView(id, cx)) })),
  };
}

// ---- her calls, and what is still hers

function callsSection(cx) {
  const records = cx.snap.decisions.filter(isHers);
  const byId = new Map(cx.model.decisions.map((d) => [d.id, d]));
  const calls = records.sort((a, b) => cmp(b.id, a.id)).map((d) => {
    const byVerb = new Map();
    for (const ch of d.changes) {
      if (!byVerb.has(ch.verb)) byVerb.set(ch.verb, []);
      byVerb.get(ch.verb).push(ch.target);
    }
    return {
      id: d.id, date: d.date, title: d.title, kind: d.kind, asked: d.asked, quotes: d.quotes,
      excerpt: d.quotes.length ? null : excerptOf(byId.get(d.id)?.text),
      changes: [...byVerb].map(([verb, targets]) => ({ verb, targets: targets.map((id) => refView(id, cx)) })),
    };
  });
  return { key: "calls", id: "calls", title: "Her calls", calls, count: calls.length, sources: (cx.model.sources || []).map((s) => ({ id: s.id, title: s.title })) };
}

function hersSection(cx, factViews) {
  const groups = decisionGroups(cx.snap).map((g) => ({
    key: g.key, title: g.title,
    items: g.items
      .slice()
      .sort((a, b) => (a.due === b.due ? 0 : a.due < b.due ? -1 : 1) || cmp(titleKey(a.entityTitle), titleKey(b.entityTitle)) || cmp(a.id, b.id))
      .map((it) => ({ fact: factViews.get(it.id), entityTitle: it.entityTitle, usedInside: it.usedInside, uses: it.uses.map((u) => ({ file: u.file, at: u.at, as: u.as })) })),
  }));
  // Claude's two kinds of record each keep a list of where the pencil disagrees with itself, for her to rule on.
  const disagreements = cx.snap.decisions
    .filter((d) => (d.kind === "import" || d.kind === "merge") && d.conflicts.length)
    .sort((a, b) => cmp(a.id, b.id))
    .map((d) => ({ id: d.id, title: d.title, conflicts: d.conflicts }));
  return { key: "hers", id: "hers", title: "Still hers", groups, disagreements, count: groups.reduce((n, g) => n + g.items.length, 0) };
}

// ---- ideas

const IDEA_STATES = ["live", "parked", "adopted", "rejected"];

function ideasSection(cx) {
  const topics = (cx.model.ideaFiles || []).map((f) => {
    const ideas = f.ideas.map((i) => ({
      id: i.id, text: i.text, tag: tagOf(i), by: i.by || null, state: i.state, when: i.when || null,
      threads: (i.threads || []).map((t) => threadChip(t, cx)),
      became: (i.became || []).map((id) => refView(id, cx)), retire: i.retire || [], source: (i.source || []).map((s) => sourceView(s, cx)),
    }));
    const rank = (s) => { const k = IDEA_STATES.indexOf(s); return k < 0 ? IDEA_STATES.length : k; };
    return {
      topic: f.topic, title: String(f.title || f.topic).replace(/^Ideas:\s*/i, ""), text: f.text || "",
      ideas: ideas.map((x, n) => ({ x, n })).sort((a, b) => rank(a.x.state) - rank(b.x.state) || a.n - b.n).map((o) => o.x),
      counts: Object.fromEntries(IDEA_STATES.map((s) => [s, ideas.filter((i) => i.state === s).length])),
    };
  });
  const total = topics.reduce((n, t) => n + t.ideas.length, 0);
  return { key: "ideas", id: "ideas", title: "The ideas", topics, count: total };
}

// ---- appendices

function plantsSection(cx) {
  const rows = cx.facts.filter((f) => f.payoff && f.status !== "cut").map((f) => ({ plant: refView(f.id, cx), payoff: refView(f.payoff, cx) }));
  return rows.length ? { key: "plants", id: "plants", title: "Plants and payoffs", rows } : null;
}

function flashbacksSection(cx) {
  const rows = [];
  for (const c of cx.chapters) for (const b of c.beats) if (b.kind === "flashback") rows.push({ chapter: c.n, beat: refView(b.id, cx), when: b.when || null, tag: tagOf(b) });
  return rows.length ? { key: "flashbacks", id: "flashbacks", title: "Flashbacks", rows } : null;
}

function forksSection(cx) {
  const rows = [];
  for (const c of cx.chapters) for (const b of c.beats) if (b.fork === "yes") rows.push({ chapter: c.n, beat: refView(b.id, cx), threads: (b.threads || []).map((t) => threadChip(t, cx)) });
  return { key: "forks", id: "forks", title: "The forks", rows, count: rows.length };
}

function cutSection(cx, buckets) {
  const retired = [];
  for (const f of cx.facts) if (f.status === "cut") for (const p of f.retire || []) retired.push({ phrase: p, from: refView(f.id, cx) });
  for (const i of cx.model.ideas || []) if (i.state === "rejected") for (const p of i.retire || []) retired.push({ phrase: p, from: refView(i.id, cx) });
  retired.sort((a, b) => cmp(a.phrase.toLowerCase(), b.phrase.toLowerCase()));
  return { key: "cut", id: "cut", title: "Cut: never say", facts: buckets.cut, retired };
}

// ---- the whole document

/** Counts for the top of the page: every number is read from canon. */
function glanceOf(cx, calls) {
  const count = { ink: 0, wait: 0, pencilHers: 0, pencilClaude: 0, open: 0, cut: 0, secret: 0, total: cx.facts.length };
  for (const f of cx.facts) {
    const tag = tagOf(f);
    if (tag === "ink") count.ink++;
    else if (tag === "wait") count.wait++;
    else if (tag === "pencil-hers") count.pencilHers++;
    else if (tag === "pencil-claude") count.pencilClaude++;
    else if (tag === "open") count.open++;
    else if (tag === "cut") count.cut++;
    if (f.status !== "cut" && isSecret(f.known)) count.secret++;
  }
  const beats = cx.chapters.reduce((n, c) => n + c.beats.length, 0);
  const ideaStates = Object.fromEntries(IDEA_STATES.map((s) => [s, (cx.model.ideas || []).filter((i) => i.state === s).length]));
  return {
    facts: count, entities: cx.model.world.length, chapters: cx.chapters.length, books: cx.books.length, beats,
    threads: (cx.model.threads || []).length, questions: (cx.model.questions || []).length, ideas: (cx.model.ideas || []).length, ideaStates,
    calls: calls.calls.length, scenes: (cx.model.plan || []).length, scenesInDetail: cx.partZero.size,
  };
}

/**
 * Derive the whole Casebook from canon.
 * @param model  tools/story/lib.mjs#loadModel
 * @param snap   tools/story/snapshot.mjs#snapshot (made from the model when left out)
 * @returns {{ meta, glance, parts, toc, anchors, placed, problems }}
 */
export function deriveCasebook(model, snap = snapshot(model, { root: model.root })) {
  const cx = makeContext(model, snap);
  const problems = [];
  const placed = new Map();
  const place = (f, where) => {
    if (placed.has(f.id)) { problems.push(`fact ${f.id} would be placed twice (${placed.get(f.id)} and ${where})`); return factView(f, cx); }
    placed.set(f.id, where);
    return factView(f, cx);
  };

  // Every fact to its one home, in canon's own order (ink before pencil inside each file).
  const buckets = { world: new Map(), chapter: new Map(), beat: new Map(), hers: new Map(), cut: [] };
  const push = (map, key, v) => { if (!map.has(key)) map.set(key, []); map.get(key).push(v); };
  for (const f of cx.facts) {
    const home = homeOf(f, cx);
    if (home.kind === "hers") { buckets.hers.set(f.id, place(f, "hers")); continue; }
    if (home.kind === "cut") { buckets.cut.push(place(f, "cut")); continue; }
    if (home.kind === "plan") {
      const v = place(f, `chapter-${pad2(home.chapter)}`);
      if (home.beat) push(buckets.beat, home.beat, v); else push(buckets.chapter, home.chapter, v);
      continue;
    }
    push(buckets.world, home.entity, place(f, `entity:${home.entity}`));
  }

  const ei = entityIndex(snap);
  const world = worldSections(cx, buckets, ei);
  const questions = questionsSection(cx);
  const chapterCards = cx.chapters.map((c) => chapterCard(c, cx, buckets));
  const bookCards = cx.books.map((b) => bookCard(b, chapterCards));
  const claimed = new Set(bookCards.flatMap((b) => b.chapters.map((c) => c.n)));
  const loose = chapterCards.filter((c) => !claimed.has(c.n));
  const growth = growthTable(bookCards);
  // What books.md says about the Books as a whole, in canon's own words.
  let booksIntro = "";
  try { const raw = cx.model.plotRaw?.["plan/books.md"]; booksIntro = raw ? parseBooks(raw).text : ""; } catch { booksIntro = ""; }
  const threads = [...(cx.model.threads || [])].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || cmp(titleKey(a.title), titleKey(b.title)) || cmp(a.id, b.id)).map((t) => threadCard(t, cx));
  const weave = { books: bookCards.map((b) => ({ numeral: b.numeral, title: b.title })), threads };
  const calls = callsSection(cx);
  const hers = hersSection(cx, buckets.hers);
  const ideas = ideasSection(cx);
  const cut = cutSection(cx, buckets);
  const forks = forksSection(cx);
  const plants = plantsSection(cx);
  const flashbacks = flashbacksSection(cx);

  // Every fact must have been placed: a fact with no home would silently vanish from the page.
  for (const f of cx.facts) if (!placed.has(f.id)) problems.push(`fact ${f.id} has no home on the page`);

  // The parts, in reading order. A section is { key, id, title, ... } and render.mjs draws it by its key.
  const parts = [];
  parts.push({ id: "part0", kicker: "Part Zero", title: "Written in detail", sections: [{ key: "detail", id: "detail", title: "Chapter 1, scene by scene" }] });
  if (world.length) parts.push({ id: "part1", kicker: "Part One", title: "The world", sections: world });
  const howSections = [questions];
  if (growth || booksIntro) howSections.push({ key: "growth", id: "growth", title: "How the party grows", growth, intro: booksIntro });
  parts.push({ id: "part2", kicker: "Part Two", title: "How it works", sections: howSections });
  const campaign = [{ key: "overview", id: "overview", title: `Chapters 1–${chapterCards.length || 0} on one page`, books: bookCards, loose }];
  for (const b of bookCards) campaign.push({ key: "book", id: `book-${b.numeral.toLowerCase()}`, title: `Book ${b.numeral}: ${b.title}`, book: b });
  if (loose.length) campaign.push({ key: "chapters-loose", id: "chapters-loose", title: "Chapters outside the Books", chapters: loose });
  parts.push({ id: "part3", kicker: "Part Three", title: "The campaign, chapter by chapter", sections: campaign });
  parts.push({ id: "part4", kicker: "Part Four", title: "Threads, choices and decisions", sections: [{ key: "weave", id: "weave", title: "Who's moving, Book by Book", weave, count: threads.length }, forks, calls, hers] });
  parts.push({ id: "part5", kicker: "Part Five", title: "Ideas and what was cut", sections: [ideas, cut] });
  const appendix = [{ key: "roads", id: "roads", title: "Three roads to every conclusion", cards: questions.groups.flatMap((g) => g.cards) }];
  if (plants) appendix.push(plants);
  if (flashbacks) appendix.push(flashbacks);
  parts.push({ id: "appendices", kicker: "Appendices", title: "For the table", sections: appendix });

  // Section numbers and letters, kept in one place so the page, its contents list and the Markdown agree.
  let n = 0;
  let letter = 0;
  for (const p of parts) {
    for (const s of p.sections) {
      if (p.id === "appendices") s.num = String.fromCharCode(65 + letter++);
      else s.num = String(n++);
    }
  }
  const toc = parts.map((p) => ({ id: p.id, kicker: p.kicker, title: p.title, sections: p.sections.map((s) => ({ id: s.id, num: s.num, title: s.title, key: s.key, count: s.count })) }));

  // Where every id on the page lives, so a backticked id in any text can be linked to its one place.
  const anchors = new Map();
  for (const f of cx.facts) anchors.set(f.id, `#f-${f.id}`);
  for (const e of cx.model.world) anchors.set(e.id, `#e-${e.id}`);
  for (const c of cx.chapters) { anchors.set(c.id, `#c${c.n}`); for (const b of c.beats) anchors.set(b.id, `#b-${b.id}`); }
  for (const b of cx.books) anchors.set(b.id, `#book-${b.numeral.toLowerCase()}`);
  for (const t of cx.model.threads || []) anchors.set(t.id, `#t-${t.id}`);
  for (const q of cx.model.questions || []) anchors.set(q.id, `#q-${q.id}`);
  for (const i of cx.model.ideas || []) anchors.set(i.id, `#i-${i.id}`);
  for (const id of cx.callIds) anchors.set(id, `#d-${id}`);
  for (const s of cx.model.sources || []) anchors.set(s.id, `#d-${s.id}`);
  for (const id of cx.partZero) anchors.set(id, `#scene-${id}`);

  return {
    meta: { canonHash: snap.canonHash, presentYear: snap.presentYear },
    glance: glanceOf(cx, calls),
    parts, toc, anchors, placed, problems,
    // the section payloads, by key, for the tests and for anything that wants one section alone
    world, questions, growth, chapters: chapterCards, books: bookCards, threads, weave, forks, calls, hers, ideas, cut, plants, flashbacks,
  };
}

