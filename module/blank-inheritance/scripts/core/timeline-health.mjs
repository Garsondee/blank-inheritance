/**
 * The timeline's health strip (design/plot-timeline.md §4, D070): what needs attention before the table gets there.
 * It counts only what lies inside the event horizon, the end of the Book the table is in, because past it answers wait
 * on purpose (D047: "we always have to leave a certain fluidity when scenes are an entire book away"). Pure, on the
 * snapshot that tools/story/snapshot.mjs makes.
 */

const CHAPTER_WORDS = /\bchapter (\d+)\b/i;
const BOOK_WORDS = /\bbook (i{1,3}|iv|v)\b/i;
const ROMAN = ["i", "ii", "iii", "iv", "v"];

/** The last chapter the checks look ahead to: the end of the Book the table is in. */
export function horizonOf(snap) {
  const now = snap.now?.chapter ?? 1;
  const book = (snap.books || []).find((b) => now >= b.from && now <= b.to);
  return book ? book.to : 4;
}

/** The chapter a told/raised/answered place falls in (Infinity when it isn't placed yet). */
export function chapterOfPlace(snap, place) {
  if (place === "start") return 1;
  const m = /^in:(.+)$/.exec(place || "");
  if (!m) return Infinity;
  const id = m[1];
  const row = (snap.scenes || []).find((s) => s.id === id);
  if (row) return row.chapter || 1;
  for (const c of snap.chapters || []) if (c.id === id || (c.beats || []).some((b) => b.id === id)) return c.n;
  return Infinity;
}

/** When an open decision is due, read from its words: a chapter, a Book, or Episode Two. Infinity when it doesn't say. */
export function dueChapter(snap, decideBy) {
  if (!decideBy) return Infinity;
  const c = CHAPTER_WORDS.exec(decideBy);
  if (c) return Number(c[1]);
  const b = BOOK_WORDS.exec(decideBy);
  if (b) {
    const book = (snap.books || []).find((x) => x.book === ROMAN.indexOf(b[1].toLowerCase()) + 1);
    if (!book) return Infinity;
    // "late in Book I", "by the end of Book I", "during Book II": by the Book's last chapter. "before Book II is
    // prepared", "as Book V is prepared", a bare "Book III": needed when the Book starts.
    const within = /\b(?:late in|end of|within|during|in) (?:the )?book\b/i.test(decideBy) && !/\bbefore (?:the )?book\b/i.test(decideBy);
    return within ? book.to : book.from;
  }
  if (/\bepisode (two|2)\b/i.test(decideBy)) return 1;
  return Infinity;
}

/**
 * Every check, inside the horizon. Each finding: { check, id, message }.
 * @param {object} snap
 * @param {{ publishedHash?: string|null }} opts  the canon hash of the copy on claude.ai, if one was published
 */
export function health(snap, { publishedHash = null } = {}) {
  const horizon = horizonOf(snap);
  const out = [];
  const add = (check, id, message) => out.push({ check, id, message });
  const order = snap.order || {};
  const facts = new Map((snap.facts || []).map((f) => [f.id, f]));
  const told = (f) => f && (f.told === "start" || (/^in:/.test(f.told || "") && order[f.told.slice(3)] !== undefined));
  const placeSeq = (place) => (place === "start" ? -1 : /^in:/.test(place || "") && order[place.slice(3)] !== undefined ? order[place.slice(3)] : Infinity);

  // 1. Decisions due: open facts whose deadline falls inside the horizon, or that something inside it relies on.
  for (const f of snap.facts || []) {
    if (f.status !== "open") continue;
    const due = dueChapter(snap, f.decideBy);
    const usedInside = (snap.citations?.[f.id] || []).some((w) => /canon\/(scenes|objectives)\//.test(w.file));
    if (due <= horizon || usedInside) add("decision-due", f.id, `open, and due by chapter ${due === Infinity ? "now (play material relies on it)" : due}: ${f.decideBy || "no deadline written"}`);
  }

  // 2. Weak questions: answered inside the horizon with fewer than three roads, one kind only, or no core road.
  for (const q of snap.questions || []) {
    if (chapterOfPlace(snap, q.answered) > horizon) continue;
    const roads = q.roads || [];
    if (roads.length < 3) add("weak-question", q.id, `only ${roads.length} road(s) to "${q.title}"`);
    else if (new Set(roads.map((r) => r.kind)).size === 1) add("weak-question", q.id, `every road to "${q.title}" is the same kind of clue`);
    else if (!roads.some((r) => r.core)) add("weak-question", q.id, `no core road to "${q.title}"`);
  }

  // 3. Payoffs with no plant: a question answered inside the horizon whose answer nothing plants and no road reaches.
  const planted = new Set((snap.facts || []).filter((f) => f.payoff).map((f) => f.payoff));
  for (const q of snap.questions || []) {
    if (chapterOfPlace(snap, q.answered) > horizon || !q.answer) continue;
    if (!planted.has(q.answer) && !(q.roads || []).some((r) => told(facts.get(r.fact)))) add("unplanted-payoff", q.id, `"${q.title}" pays off with nothing planted before it`);
  }

  // 4. Clocks with no next step: every step already reached by the table, or no steps at all. A step is reached when
  // its fact is told, or its beat or scene played, by the end of the chapter the table is in.
  const nowChapter = snap.now?.chapter ?? 1;
  const nowSeq = Math.max(-1, ...Object.entries(order).filter(([id]) => chapterOfPlace(snap, `in:${id}`) <= nowChapter).map(([, seq]) => seq));
  const reached = (id) => {
    const f = facts.get(id);
    if (f) return placeSeq(f.told) <= nowSeq;
    return order[id] !== undefined && order[id] <= nowSeq;
  };
  for (const t of snap.threads || []) {
    for (const c of t.clocks || []) {
      const filled = (c.items || []).filter(reached);
      if (!c.items?.length) add("clock-stuck", t.id, `clock "${c.name}" has no steps`);
      else if (filled.length === c.items.length) add("clock-stuck", t.id, `clock "${c.name}" is full and has no next step`);
    }
  }

  // 5. Threads silent inside the horizon: no intensity sketched or every value 0 for the chapters up to it.
  for (const t of snap.threads || []) {
    const window = (t.intensity || []).slice((snap.now?.chapter ?? 1) - 1, horizon);
    if (window.length && window.every((v) => v === null || v === 0)) add("thread-silent", t.id, `"${t.title}" is silent until after chapter ${horizon}`);
  }

  // 6. Told and never used again: a secret (known to few or nobody) the table learns in a scene, that nothing later
  // relies on. Common knowledge told once is texture, not a loose end.
  for (const f of snap.facts || []) {
    if (!/^in:/.test(f.told || "") || f.status === "cut") continue;
    const at = placeSeq(f.told);
    const uses = (snap.citations?.[f.id] || []).filter((w) => w.as !== "change" && w.as !== "facts");
    const later = uses.some((w) => {
      const m = /canon\/scenes\/(.+)\.json$/.exec(w.file);
      if (m) return (order[m[1]] ?? -Infinity) > at;
      return w.as !== "gmFacts";
    });
    if (!later && ["few", "nobody"].includes(f.known) && chapterOfPlace(snap, f.told) <= horizon) add("told-unused", f.id, `a secret told in ${f.told.slice(3)}, and nothing after relies on it`);
  }

  // 7. Runs of down beats: three or more in a row inside the horizon.
  let run = [];
  const flush = () => { if (run.length >= 3) add("down-run", run[0], `${run.length} down beats in a row from ${run[0]}`); run = []; };
  for (const c of (snap.chapters || []).filter((x) => x.n <= horizon)) {
    for (const b of c.beats || []) { if (b.pace === "down") run.push(b.id); else flush(); }
  }
  flush();

  // 8. The copy on claude.ai is behind canon.
  if (publishedHash && snap.canonHash && publishedHash !== snap.canonHash) add("stale-copy", "claude.ai", `the copy on claude.ai was made from canon ${publishedHash}; canon is now ${snap.canonHash}`);

  return { horizon, findings: out };
}
