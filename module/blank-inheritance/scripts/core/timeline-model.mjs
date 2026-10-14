/**
 * The plot timeline's model (design/plot-timeline.md §4, D070): the whole story, from a plain snapshot of canon, as
 * lanes and items on one strip of eras. Pure: the page on this PC uses it now, and a Foundry window can later.
 *
 * Two clocks run through it. World time (`when`) places what happened: the old campaign, the spill, the letters.
 * Telling time (`told`) places where the table learns it: Scene 0, The Errand, a beat in Chapter 6. An item can have
 * both, and the page draws a line between them.
 *
 * The snapshot is made by tools/story/snapshot.mjs from canon; its shape is documented there.
 */
import { resolveAll, resolveWhen, parseWhen, TIME_OF_DAY, DEFAULT_BOOKS } from "./timeline-when.mjs";
import { ERAS, eraOf } from "./timeline-eras.mjs";
import { LANE_DEFS, laneKeyOfThread, laneKeyOfEntity, laneId } from "./timeline-lanes.mjs";

/** How each status is drawn (D070): ink solid, accepted ticked, pencil outlined, open dashed, provisional hatched. */
export const STYLE = Object.freeze({
  decided: "ink",
  accepted: "ink-accepted",
  provisional: "ink-pending",
  proposal: "ink-pending",
  sketch: "pencil",
  open: "open",
  cut: "cut",
});
export const isInk = (status) => ["decided", "accepted", "provisional", "proposal"].includes(status);

/** Where Scene 0 sits: at the very start of Day 0, before anyone is anywhere. */
export const SCENE_ZERO_AT = -1;

/** A plan row's place in the episodes, in days from the start of Day 1. */
export function scenePosition(row) {
  if (row.day === null || row.day === undefined) return { scale: "days", at: SCENE_ZERO_AT, from: SCENE_ZERO_AT, to: SCENE_ZERO_AT, approx: false };
  const frac = TIME_OF_DAY[row.time] ?? 0.5;
  const at = row.day - 1 + frac;
  return { scale: "days", at, from: at, to: at, approx: row.time === "flexible" || row.time === "unknown" };
}

/** A beat's weight in how busy its thread is: the turns of a story (a reveal, a choice) count double. */
const BEAT_WEIGHT = Object.freeze({ reveal: 2, choice: 2 });

/**
 * How busy each thread is in each chapter, from the plan itself: the weighted count of its beats, so a thread that
 * does nothing for three chapters then reveals twice reads as a rise. Chapter n is index n - 1; 0 to 5 (capped).
 * Authored values (a thread's `intensity:` line) win where it has any.
 */
export function threadIntensity(snap, thread) {
  const authored = thread.intensity || [];
  if (authored.some((v) => v !== null && v !== undefined && !Number.isNaN(v) && v > 0)) return { values: authored, source: "authored" };
  const values = [];
  for (const c of snap.chapters || []) {
    for (const b of c.beats || []) if ((b.threads || []).includes(thread.id)) values[c.n - 1] = (values[c.n - 1] || 0) + (BEAT_WEIGHT[b.kind] || 1);
  }
  for (let i = 0; i < values.length; i++) values[i] = values[i] === undefined ? null : Math.min(5, values[i]);
  return { values, source: "beats" };
}

const booksOf = (snap) => (snap.books?.length ? snap.books.map((b) => ({ book: b.book, from: b.from, to: b.to })) : DEFAULT_BOOKS);

/**
 * Build the timeline from a snapshot of canon.
 * @param {object} snap  see tools/story/snapshot.mjs
 * @returns {{ eras, lanes, items, byId: Map, problems }}
 */
export function buildTimeline(snap) {
  const books = booksOf(snap);
  const problems = [];
  const items = [];
  const placeOf = new Map(); // scene, beat or chapter id -> position (where the table is when it happens)

  // Where each thing is told or played. A scene of a later chapter has no day: it sits in its chapter, spread evenly in plan order.
  const ofChapter = new Map();
  for (const row of snap.scenes || []) if (row.chapter >= 2) { if (!ofChapter.has(row.chapter)) ofChapter.set(row.chapter, []); ofChapter.get(row.chapter).push(row); }
  for (const row of snap.scenes || []) {
    if (row.chapter >= 2 && (row.day === null || row.day === undefined)) {
      const list = ofChapter.get(row.chapter);
      const at = row.chapter + (list.indexOf(row) + 0.5) / list.length;
      placeOf.set(row.id, { scale: "chapters", at, from: at, to: at });
    } else placeOf.set(row.id, scenePosition(row));
  }
  for (const c of snap.chapters || []) {
    if (c.n === 1) placeOf.set(c.id, { scale: "days", at: -1, from: -1, to: 3, approx: true });
    else placeOf.set(c.id, { scale: "chapters", at: c.n + 0.5, from: c.n, to: c.n + 1 });
    const beats = c.beats || [];
    beats.forEach((b, i) => {
      let pos = null;
      if (b.when) { try { pos = resolveWhen(parseWhen(b.when), { books }); } catch (e) { problems.push({ id: b.id, message: e.message }); } }
      if (!pos || pos.scale === "candidates") { const at = c.n + (i + 1) / (beats.length + 1); pos = { scale: "chapters", at, from: at, to: at }; }
      placeOf.set(b.id, pos);
    });
  }
  // A fact still told "later" that a sketched beat would reveal is placed at that beat.
  const revealedAt = new Map();
  for (const c of snap.chapters || []) for (const b of c.beats || []) for (const r of b.reveals || []) if (!revealedAt.has(r)) revealedAt.set(r, b.id);
  const sceneZero = (snap.scenes || []).find((r) => (r.day === null || r.day === undefined) && !(r.chapter >= 2));
  const toldPosition = (told) => {
    if (told === "start") return sceneZero ? placeOf.get(sceneZero.id) : { scale: "days", at: SCENE_ZERO_AT, from: SCENE_ZERO_AT, to: SCENE_ZERO_AT };
    const m = /^in:(.+)$/.exec(told || "");
    return m ? placeOf.get(m[1]) || null : null;
  };

  // World time: every dated fact, beat and idea, anchors followed.
  const whens = new Map();
  for (const f of snap.facts || []) if (f.when) whens.set(f.id, f.when);
  for (const i of snap.ideas || []) if (i.when) whens.set(i.id, i.when);
  const { positions, problems: whenProblems } = resolveAll(whens, { books });
  problems.push(...whenProblems);

  // Lanes (D086): the table's own row first, then a small fixed set of strands (timeline-lanes.mjs). A thread and an entity each
  // belong to one strand, so the rows under "At the table" stay few. A thread that is the party itself has no strand: it is "At the table".
  const threads = [...(snap.threads || [])].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title));
  const entities = new Map((snap.entities || []).map((e) => [e.id, e]));
  const lanes = LANE_DEFS.map((d) => {
    const mine = threads.filter((t) => laneKeyOfThread(t) === d.id);
    // The lane's rise and fall is its busiest thread's: authored values win where any thread has them.
    const per = mine.map((t) => threadIntensity(snap, t));
    const len = Math.max(0, ...per.map((p) => p.values.length));
    const values = [];
    for (let i = 0; i < len; i++) { const vs = per.map((p) => p.values[i]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v)); values[i] = vs.length ? Math.max(...vs) : null; }
    return {
      id: laneId(d.id), key: d.id, title: d.title, group: "", thread: null, colour: d.colour,
      threads: mine.map((t) => t.id),
      entities: (snap.entities || []).filter((e) => laneKeyOfEntity(snap, e) === d.id).map((e) => e.id),
      intensity: values, intensitySource: per.some((p) => p.source === "authored") ? "authored" : "beats", style: "ink",
    };
  });
  // The table's own lane is the spine of the adventure (the scenes, then each chapter), so it comes first.
  lanes.unshift({ id: "play", key: "play", title: "At the table", group: "play", thread: null, colour: null, entities: [] });
  const threadById = new Map(threads.map((t) => [t.id, t]));
  const laneFor = (entity, threadIds = []) => {
    for (const id of threadIds) { const t = threadById.get(id); if (t) return laneId(laneKeyOfThread(t)); }
    return entity ? laneId(laneKeyOfEntity(snap, entities.get(entity) || { id: entity })) : "play";
  };

  // Facts: an event where the world placed it, and a reveal where the table learns it. A fact with neither (most
  // traits, secrets and open questions) is "not placed": the page lists it on its lane and on its entity's page, and
  // typing a `when` for it places it.
  const unplaced = [];
  for (const f of snap.facts || []) {
    if (f.status === "cut") continue;
    const lane = laneFor(f.entity, f.threads || []);
    const base = { ref: f.id, lane, entity: f.entity, title: f.text, status: f.status, by: f.by || null, style: STYLE[f.status] || "ink", ink: isInk(f.status), told: f.told, known: f.known };
    const pos = positions.get(f.id);
    if (pos) items.push({ id: `event:${f.id}`, kind: "event", ...base, position: pos, era: eraOf(pos)?.id || null });
    const tp = toldPosition(f.told) || (f.told === "later" && revealedAt.has(f.id) ? placeOf.get(revealedAt.get(f.id)) : null);
    if (tp) items.push({ id: `reveal:${f.id}`, kind: "reveal", ...base, position: tp, era: eraOf(tp)?.id || null, plannedBy: f.told === "later" ? revealedAt.get(f.id) : null });
    if (!pos && !tp) unplaced.push({ ref: f.id, lane, entity: f.entity, text: f.text, status: f.status, by: f.by || null, known: f.known, told: f.told, when: f.when || null });
  }

  // The table's own lane: Episode One and Two scene by scene, then each chapter ahead.
  for (const row of snap.scenes || []) {
    const pos = placeOf.get(row.id);
    items.push({ id: `scene:${row.id}`, kind: "scene", ref: row.id, lane: "play", title: row.title, text: row.episode || "", status: row.inCanon ? (row.state === "approved" ? "decided" : "provisional") : "sketch", by: row.inCanon ? null : "claude", style: row.inCanon ? (row.state === "approved" ? "ink" : "ink-pending") : "pencil", ink: Boolean(row.inCanon), state: row.state, position: pos, era: eraOf(pos)?.id || null });
  }
  for (const c of snap.chapters || []) {
    if (c.n === 1) continue;
    const pos = placeOf.get(c.id);
    items.push({ id: `chapter:${c.id}`, kind: "chapter", ref: c.id, lane: "play", title: `Chapter ${c.n} · ${c.title}`, text: c.text || "", status: c.status, by: c.by || null, style: STYLE[c.status] || "pencil", ink: isInk(c.status), position: pos, era: eraOf(pos)?.id || null, book: c.book });
    for (const b of c.beats || []) {
      const bpos = placeOf.get(b.id);
      const lane = laneFor(null, b.threads || []);
      items.push({ id: `beat:${b.id}`, kind: "beat", ref: b.id, lane, title: b.text, status: b.status, by: b.by || null, style: STYLE[b.status] || "pencil", ink: isInk(b.status), beatKind: b.kind, pace: b.pace || null, chapter: c.id, position: bpos, era: eraOf(bpos)?.id || null });
    }
  }

  // Ideas with a date sit faintly on their thread's lane.
  for (const i of snap.ideas || []) {
    const pos = positions.get(i.id);
    if (!pos) continue;
    const lane = laneFor(null, i.threads || []);
    items.push({ id: `idea:${i.id}`, kind: "idea", ref: i.id, lane, title: i.text, status: i.status, by: i.by || null, style: "idea", ink: false, state: i.state, position: pos, era: eraOf(pos)?.id || null });
  }

  // Questions: a span from where the table first wonders to where it can know.
  for (const q of snap.questions || []) {
    const from = toldPosition(q.raised);
    const to = toldPosition(q.answered);
    if (!from && !to) continue;
    const a = from || to;
    const b = to || from;
    items.push({ id: `question:${q.id}`, kind: "question", ref: q.id, lane: "questions", title: q.title, status: q.status, by: q.by || null, style: STYLE[q.status] || "pencil", ink: isInk(q.status), position: a, until: b, era: eraOf(a)?.id || null, roads: (q.roads || []).length, answer: q.answer });
  }
  if (items.some((i) => i.lane === "questions")) lanes.push({ id: "questions", title: "Questions", group: "questions", thread: null, entities: [] });
  if (items.some((i) => i.lane === "ideas")) lanes.push({ id: "ideas", title: "Ideas", group: "ideas", thread: null, entities: [] });

  // How many unplaced facts each lane holds (a fact whose lane was never drawn counts under "other").
  const laneIds = new Set(lanes.map((l) => l.id));
  for (const l of lanes) l.unplaced = 0;
  for (const u of unplaced) {
    const l = lanes.find((x) => x.id === u.lane);
    if (l) l.unplaced++;
    else u.lane = "other";
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  return { eras: ERAS, lanes, items, byId, unplaced, problems };
}

/**
 * What the table knows by a point in play (a scene, beat or chapter id, in the snapshot's play order): every fact told
 * by then. Everything else is still a blank to the players.
 */
export function tableKnows(snap, atId) {
  const order = snap.order || {};
  const here = order[atId];
  if (here === undefined) throw new Error(`${atId} is not in the play order`);
  const told = new Set();
  const revealedAt = new Map();
  for (const c of snap.chapters || []) for (const b of c.beats || []) for (const r of b.reveals || []) if (!revealedAt.has(r)) revealedAt.set(r, b.id);
  for (const f of snap.facts || []) {
    if (f.status === "cut") continue;
    if (f.told === "start") told.add(f.id);
    else if (/^in:/.test(f.told || "") && order[f.told.slice(3)] !== undefined && order[f.told.slice(3)] <= here) told.add(f.id);
    else if (f.told === "later" && revealedAt.has(f.id) && order[revealedAt.get(f.id)] <= here) told.add(f.id);
  }
  return told;
}

/** Counts for the header: ink, pencil and open, overall and per kind. */
export function tally(snap) {
  const out = { ink: 0, pencil: 0, open: 0, byKind: {} };
  const add = (kind, status) => {
    const k = (out.byKind[kind] ||= { ink: 0, pencil: 0, open: 0 });
    const bucket = status === "open" ? "open" : status === "sketch" ? "pencil" : status === "cut" ? null : "ink";
    if (!bucket) return;
    out[bucket]++;
    k[bucket]++;
  };
  for (const f of snap.facts || []) add("facts", f.status);
  for (const c of snap.chapters || []) for (const b of c.beats || []) add("beats", b.status);
  for (const t of snap.threads || []) add("threads", t.status);
  for (const q of snap.questions || []) add("questions", q.status);
  for (const i of snap.ideas || []) add("ideas", i.status);
  return out;
}
