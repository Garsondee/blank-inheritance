// The plot timeline page (design/plot-timeline.md §4, D070, D086). Reads canon as a snapshot and lets Ingram read it two
// ways along time: the Timeline (play.js), the adventure scene by scene as a flow with the strands of the rest of the story
// under it, and History (below), one strip of eras from the deep past to the chapters ahead with the same few strands. Select
// anything for the inspector, search, and two lenses (what the table knows by a point in play; colour by status). Most of the
// story is not an event in time, so the page has two more ways in (views.js): People & places (a page per entity) and Decisions
// (what is still hers), and one search over all of it. Served live from this PC, it also loads the editing (editing.js,
// review.js); the read-only copy never does. Every calculation is in the shared core modules, so a Foundry window can draw
// the same thing later.
import { buildTimeline, tableKnows, tally } from "./core/timeline-model.mjs";
import { buildAxis, ticksFor } from "./core/timeline-axis.mjs";
import { health } from "./core/timeline-health.mjs";
import { UNIT_DAYS, PRESENT_YEAR } from "./core/timeline-when.mjs";
import { buildPlay, routingOf, cellsByColumn } from "./core/timeline-play.mjs";
import { laneKeyOfThread, laneId } from "./core/timeline-lanes.mjs";
import { renderInspector } from "./inspector.js";
import { createViews } from "./views.js";
import { createPlay } from "./play.js";
import { decisionGroups } from "./core/timeline-views.mjs";

const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const SOURCE = document.querySelector('meta[name="timeline-source"]')?.content || "snapshot.json";
const LIVE = SOURCE.startsWith("api/");
// The server puts a token in the page it serves; without one (the claude.ai copy) nothing can be written.
const TOKEN = document.querySelector('meta[name="timeline-token"]')?.content || null;
const LABELS = 190;
const ROW = 26;
// A lane taller than this many rows shows the first of them and a button for the rest.
const MAX_ROWS = 7;
const FOLDED_HEIGHT = 30;
const PACE_GLYPH = { up: "▲", down: "▼", lateral: "▬" };
/** Three dots: how many of the three roads a mystery needs are laid (design/mystery-and-investigation-design.md §3). */
const clueDots = (it) => { const n = Math.min(3, it.roads || 0); return "●".repeat(n) + "○".repeat(3 - n); };
const STATUS_VAR = { decided: "--s-decided", accepted: "--s-accepted", provisional: "--s-pending", proposal: "--s-pending", sketch: "--s-sketch", open: "--s-open", cut: "--s-cut" };

const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(`plot-timeline:${k}`)); localStorage.setItem(`plot-timeline:${k}`, JSON.stringify(v)); } catch { return null; } return null; };
// "view-v2": the Timeline is the first view now, so a browser that last left the old strip open starts on the new one.
const state = { pace: false, zoom: store("zoom") || 1, view: store("view-v2") || "play", density: store("density") || "comfortable", group: store("group") || "scene", stacks: new Set(), folded: new Set(store("folded") || []), expanded: new Set(), status: false, ideas: false, tableAt: null, query: "", selected: null, flash: new Set() };

let snap = null, tl = null, axis = null, index = null;
let editing = null, review = null, flashTimer = null, views = null, search = null;

// ---- text width, for stacking chips without overlap
const measure = (() => { const c = document.createElement("canvas").getContext("2d"); return (text) => { c.font = "12px Signika, system-ui, sans-serif"; return c.measureText(text).width; }; })();
const chipWidth = (text) => Math.min(230, Math.ceil(measure(text)) + 18);

function lookups(s, t) {
  const byId = (list) => new Map((list || []).map((x) => [x.id, x]));
  const beats = new Map();
  for (const c of s.chapters || []) for (const b of c.beats || []) beats.set(b.id, { ...b, chapter: c.id, chapterTitle: c.title, n: c.n });
  return {
    facts: byId(s.facts), scenes: byId(s.scenes), chapters: byId(s.chapters), beats, questions: byId(s.questions), ideas: byId(s.ideas),
    threads: byId(s.threads), decisions: byId(s.decisions), entities: byId(s.entities), items: t.byId, lanes: new Map(t.lanes.map((l, i) => [l.id, { ...l, i }])),
  };
}

/** A strand's colour is the palette slot its lane names (timeline-lanes.mjs), so every view draws it the same. */
function laneColour(lane) {
  if (typeof lane.colour === "number") return `var(--l${lane.colour})`;
  if (lane.id === "questions") return "var(--violet)";
  if (lane.id === "ideas") return "var(--ink-3)";
  if (lane.id === "play") return "var(--ink)";
  return "var(--l11)";
}

// The Timeline view, which draws "At the table" as a flow with the strands under it (play.js).
const playView = createPlay({
  snap: () => snap,
  index: () => index,
  state,
  select: (id) => select(id),
  redraw: () => { draw(); updateBar(); },
  known: () => (state.tableAt ? tableKnows(snap, state.tableAt) : null),
  atOrder: () => (state.tableAt ? (snap.order || {})[state.tableAt] ?? null : null),
  colour: laneColour,
  toggleFold: (id) => { state.folded.has(id) ? state.folded.delete(id) : state.folded.add(id); store("folded", [...state.folded]); draw(); },
});
// The flow with nothing opened, for what the inspector says about a scene's neighbours when the Timeline is not the view.
let closedPlay = { snap: null, model: null };
const flowOf = () => playView.model() || (closedPlay.snap === snap ? closedPlay.model : (closedPlay = { snap, model: buildPlay(snap) }).model);
function playCell(laneKey, col) {
  const m = flowOf();
  const lane = m.lanes.find((l) => l.key === laneKey);
  const cell = lane && cellsByColumn(m, lane).find((c) => c.col === Number(col));
  return cell ? { lane, ...cell } : null;
}

function positionsOf(t) {
  const out = [];
  for (const i of t.items) {
    for (const p of [i.position, i.until]) {
      if (!p) continue;
      if (p.scale === "candidates") out.push(...p.options);
      else out.push(p);
    }
  }
  return out;
}

function yearsText(days) { const y = PRESENT_YEAR + Math.round(days / UNIT_DAYS.year); return y >= 1 ? `${y} AR` : `${Math.round(-days / UNIT_DAYS.year).toLocaleString("en-GB")} years ago`; }
function eraRange(seg) {
  if (seg.empty) return "nothing yet";
  if (seg.scale === "chapters") return "Chapters 2 to 20";
  if (seg.unit === "days") return "Day 0 to Day 3, by time of day";
  if (seg.unit === "weeks") return "weeks before intake";
  return `${yearsText(seg.from)} to ${yearsText(seg.to)}`;
}

/**
 * On the History strip the table's scenes are not drawn one by one: several share a day and a time of day, so they would sit on top
 * of each other, and the Timeline already draws them in the order they are played. Each episode is one block here instead, and it
 * opens on the Timeline.
 */
function withEpisodes(items) {
  const eps = new Map();
  for (const it of items) {
    if (it.kind !== "scene" || it.position?.scale !== "days") continue;
    const ep = index.scenes.get(it.ref)?.episode || "Scenes";
    const e = eps.get(ep) || { ep, n: 0, from: Infinity, to: -Infinity };
    e.n++; e.from = Math.min(e.from, it.position.at); e.to = Math.max(e.to, it.position.at);
    eps.set(ep, e);
  }
  const made = [...eps.values()].map((e) => ({ id: `episode:${e.ep}`, kind: "episode", ref: e.ep, lane: "play", title: `${e.ep} · ${e.n} scene${e.n === 1 ? "" : "s"}`, status: "decided", by: null, style: "ink", ink: true, position: { scale: "days", at: e.from, from: e.from, to: e.to, approx: true } }));
  return [...items.filter((it) => it.kind !== "scene"), ...made];
}

// ---- layout of one lane: chips stacked into rows, reveal dots in clusters on a strip of their own
function layoutLane(lane, items) {
  if (lane.id === "play") items = withEpisodes(items);
  const chips = [], dots = [], spans = [];
  for (const it of items) {
    if (it.kind === "idea" && !state.ideas) continue;
    if (it.kind === "reveal") { dots.push(it); continue; }
    const places = it.position.scale === "candidates" ? it.position.options.map((p, k) => ({ p, ghost: true, k })) : [{ p: it.position, ghost: false }];
    for (const { p, ghost, k } of places) {
      const x = axis.toX(p);
      if (x === null) continue;
      if (it.kind === "question") {
        const x2 = it.until && it.until.scale !== "candidates" ? axis.toX(it.until) : x;
        chips.push({ it, x, w: Math.max(140, (x2 ?? x) - x), ghost, k, question: true });
        continue;
      }
      if (p.approx && p.to !== p.from) {
        const a = axis.toX(p, "from"), b = axis.toX(p, "to");
        if (a !== null && b !== null && b - a > 3) spans.push({ it, x: a, w: b - a });
      }
      const label = it.kind === "chapter" ? it.title : (it.title || it.ref);
      chips.push({ it, x, w: chipWidth(label), ghost, k, label });
    }
  }
  // Scenes that happen at the same moment as alternatives (the night's rests) fold into one chip that lists them.
  const sameMoment = new Map();
  for (const c of chips) if (c.it.kind === "scene" && !c.ghost) { const k = Math.round(c.x); if (!sameMoment.has(k)) sameMoment.set(k, []); sameMoment.get(k).push(c); }
  for (const group of sameMoment.values()) {
    const byEpisode = new Map();
    for (const c of group) { const ep = index.scenes.get(c.it.ref)?.episode || ""; if (!byEpisode.has(ep)) byEpisode.set(ep, []); byEpisode.get(ep).push(c); }
    for (const [ep, list] of byEpisode) {
      if (list.length < 4) continue;
      for (const c of list) chips.splice(chips.indexOf(c), 1);
      const label = `${ep} · ${list.length} choices`;
      chips.push({ it: { ...list[0].it, id: `scenes:${list.map((c) => c.it.ref).join(",")}`, title: label }, x: list[0].x, w: chipWidth(label), ghost: false, label });
    }
  }
  // The campaign ahead reads as a grid: each chapter is a column, and a lane's beats in it stack down that column, in
  // the chapter's own order. Everything else flows along its era's scale, stacked so nothing overlaps.
  const columns = new Map();
  for (const c of chips) {
    const p = c.ghost ? null : c.it.position;
    if (!p || p.scale !== "chapters" || c.question || p.at < 2) continue;
    const n = Math.floor(p.at);
    const x0 = axis.toX({ scale: "chapters", at: n }), x1 = axis.toX({ scale: "chapters", at: n + 0.999 });
    c.x = x0 + 3; c.w = Math.max(30, x1 - x0 - 6); c.column = n;
    if (!columns.has(n)) columns.set(n, []);
    columns.get(n).push(c);
  }
  for (const list of columns.values()) list.sort((a, b) => a.it.position.at - b.it.position.at).forEach((c, i) => { c.row = i; });
  const free = chips.filter((c) => c.column === undefined).sort((a, b) => a.x - b.x);
  const rowsEnd = [];
  for (const c of free) {
    let r = rowsEnd.findIndex((end) => end + 4 <= c.x);
    if (r < 0) { r = rowsEnd.length; rowsEnd.push(0); }
    rowsEnd[r] = c.x + c.w;
    c.row = r;
  }
  const columnRows = Math.max(0, ...[...columns.values()].map((l) => l.length));
  // Reveal dots: one per cluster of near-identical places.
  const clusters = new Map();
  for (const d of dots) {
    const x = axis.toX(d.position);
    if (x === null) continue;
    const key = Math.round(x / 9);
    if (!clusters.has(key)) clusters.set(key, { x, its: [] });
    clusters.get(key).its.push(d);
  }
  const rows = Math.max(1, rowsEnd.length, columnRows);
  return { chips, spans, clusters: [...clusters.values()], rows };
}

/** Scroll the strip to the deep past, to Day 1 (where the table is), or to the campaign ahead. */
function jumpTo(where) {
  const scroll = $("#scroll");
  if (!scroll || !axis) return;
  const seg = (id) => axis.segments.find((s) => s.id === id);
  const target = where === "past" ? 0 : where === "ahead" ? (seg("ahead")?.x0 ?? 0) - 12 : (axis.toX({ scale: "days", at: 0 }) ?? 0) - scroll.clientWidth / 3 + LABELS;
  scroll.scrollTo({ left: Math.max(0, target), behavior: "auto" });
}

/** Everything the views read, from the snapshot: the timeline, its lookups and its axis. */
function prepare() {
  tl = buildTimeline(snap);
  index = lookups(snap, tl);
  axis = buildAxis(positionsOf(tl), { zoom: state.zoom });
}

function render() {
  if (!snap) return;
  prepare();
  draw();
  updateBar();
}

/** The main pane: the Timeline, the History strip, or one of the lists. */
function draw() {
  const scroll = $("#scroll");
  if (state.view === "play") {
    playView.draw(scroll);
    fillJump();
    if (state.selected) { highlight(state.selected); playView.focus(state.selected); }
    return;
  }
  if (state.view !== "strip") {
    scroll.innerHTML = "";
    const root = el("div", "listview");
    scroll.append(root);
    if (state.view === "entities") views.renderEntities(root); else views.renderDecisions(root);
    return;
  }
  drawStrip(scroll);
}

/** A thread's rise and fall: one bar per chapter along the chapter columns, as tall as that chapter's intensity (0 to 5). */
function drawIntensity(track, lane, colour, maxH) {
  const values = lane.intensity || [];
  values.forEach((v, i) => {
    const n = i + 1;
    if (n < 2 || v === null || v === undefined || Number.isNaN(v) || v <= 0) return;
    const x0 = axis.toX({ scale: "chapters", at: n }), x1 = axis.toX({ scale: "chapters", at: n + 0.999 });
    if (x0 === null || x1 === null) return;
    const bar = el("div", "ibar");
    bar.style.left = `${x0 + 2}px`;
    bar.style.width = `${Math.max(4, x1 - x0 - 4)}px`;
    bar.style.height = `${Math.round(3 + (v / 5) * (maxH - 3))}px`;
    bar.style.setProperty("--c", colour);
    bar.title = lane.intensitySource === "authored" ? `Chapter ${n}: intensity ${v} of 5` : `Chapter ${n}: ${v >= 5 ? "5 or more" : v} point${v === 1 ? "" : "s"} of story on this thread (a beat is 1, a reveal or a choice 2)`;
    track.append(bar);
  });
}

function drawStrip(scroll) {
  const known = state.tableAt ? tableKnows(snap, state.tableAt) : null;
  const keep = { left: scroll.scrollLeft, top: scroll.scrollTop };
  scroll.innerHTML = "";
  const canvas = el("div", "canvas");
  canvas.style.width = `${LABELS + axis.width + 40}px`;
  canvas.style.setProperty("--labels", `${LABELS}px`);
  canvas.style.setProperty("--brk", `${axis.segments.length > 1 ? axis.segments[1].x0 - axis.segments[0].x1 : 28}px`);
  if (state.status) canvas.classList.add("status-mode");
  if (state.pace) canvas.classList.add("pace-mode");
  // Dim what doesn't match a search only when something on the strip does (most of the story isn't on the strip).
  if (state.query && tl.items.some(matches)) canvas.classList.add("searching");

  // the head: eras, Books, ticks
  const head = el("div", "head");
  const headRow = (cls, h) => { const r = el("div", `row ${cls}`); r.style.display = "flex"; const lab = el("div", "label"); lab.style.width = `${LABELS}px`; lab.style.height = `${h}px`; lab.style.flex = "none"; const tr = el("div", "track"); tr.style.width = `${axis.width + 40}px`; tr.style.height = `${h}px`; r.append(lab, tr); head.append(r); return { r, lab, tr }; };
  const eras = headRow("eras", 44);
  eras.lab.innerHTML = `<div style="padding:6px 10px 0 16px;font-size:11px;color:var(--ink-3)">${state.zoom === 1 ? "" : `zoom ×${state.zoom}`}</div>`;
  axis.segments.forEach((s, i) => {
    const e = el("div", `era${s.empty ? " empty" : ""}`);
    e.style.left = `${s.x0}px`; e.style.width = `${s.x1 - s.x0}px`;
    e.append(el("b", "", s.label), el("span", "", eraRange(s)));
    e.title = `${s.label}: ${eraRange(s)}`;
    eras.tr.append(e);
    if (i > 0) { const b = el("div", "brk"); b.style.left = `${axis.segments[i - 1].x1}px`; b.title = "A break in time"; eras.tr.append(b); }
  });
  const books = headRow("books", 22);
  for (const b of snap.books || []) {
    const x0 = axis.toX({ scale: "chapters", at: b.from });
    const x1 = axis.toX({ scale: "chapters", at: b.to + 0.999 });
    if (x0 === null || x1 === null) continue;
    const e = el("div", "book", `Book ${b.numeral} · ${b.title}`);
    e.style.left = `${x0}px`; e.style.width = `${Math.max(40, x1 - x0)}px`;
    e.title = `${b.text || b.title} (open the Book's page)`;
    e.style.cursor = "pointer";
    e.tabIndex = 0;
    e.setAttribute("role", "button");
    e.addEventListener("click", () => select(`book:${b.id}`));
    e.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(`book:${b.id}`); } });
    books.tr.append(e);
  }
  const ticks = headRow("ticks", 34);
  const ahead = axis.segments.find((s) => s.id === "ahead");
  const chw = Math.max(40, (ahead.x1 - ahead.x0) / (ahead.to - ahead.from) - 6);
  canvas.style.setProperty("--chw", `${chw}px`);
  for (const s of axis.segments) for (const t of ticksFor(s)) {
    const isChapter = s.scale === "chapters";
    const ch = isChapter ? index.chapters.get(`chapter-${String(t.value).padStart(2, "0")}`) : null;
    const e = el("div", `tick${t.major ? "" : " minor"}${isChapter ? " chapter" : ""}`, t.major ? (ch ? `${t.value} · ${ch.title}` : t.label) : "");
    e.style.left = `${t.x}px`;
    if (!t.major) e.title = t.label;
    if (ch) { e.title = `Chapter ${ch.n} · ${ch.title}`; e.addEventListener("click", () => select(`chapter:${ch.id}`)); }
    ticks.tr.append(e);
  }
  if (state.pace) {
    const pr = headRow("pace", 26);
    pr.lab.innerHTML = '<div style="padding:5px 10px 0 16px;font-size:11px;color:var(--ink-3)">pacing: ▲ lifts · ▼ lets down</div>';
    const seq = [];
    for (const c of snap.chapters || []) for (const b of c.beats || []) seq.push({ n: c.n, pace: b.pace });
    const flagged = new Set();
    let run = [];
    seq.forEach((b, i) => { if (b.pace === "down") run.push(i); else { if (run.length >= 3) run.forEach((k) => flagged.add(k)); run = []; } });
    if (run.length >= 3) run.forEach((k) => flagged.add(k));
    const byChapter = new Map();
    seq.forEach((b, i) => { if (b.n < 2) return; if (!byChapter.has(b.n)) byChapter.set(b.n, []); byChapter.get(b.n).push({ pace: b.pace, flag: flagged.has(i) }); });
    for (const [n, beats] of byChapter) {
      const x0 = axis.toX({ scale: "chapters", at: n });
      if (x0 === null) continue;
      const cell = el("div", "pcell");
      cell.style.left = `${x0 + 3}px`;
      for (const b of beats) { const g = el("span", `pg ${b.pace || "none"}${b.flag ? " run" : ""}`, PACE_GLYPH[b.pace] || "·"); if (b.flag) g.title = "three or more slow beats in a row"; cell.append(g); }
      pr.tr.append(cell);
    }
  }
  canvas.append(head);

  // the lanes
  const byLane = new Map(tl.lanes.map((l) => [l.id, []]));
  for (const it of tl.items) (byLane.get(it.lane) || byLane.set(it.lane, []).get(it.lane)).push(it);
  const lanesBox = el("div", "lanes");
  for (const lane0 of tl.lanes) {
    const lane = index.lanes.get(lane0.id);
    const items = byLane.get(lane.id) || [];
    if (lane.id === "ideas" && !state.ideas) continue;
    if (!items.length) continue;
    const L = layoutLane(lane, items);
    const folded = state.folded.has(lane.id);
    const tall = L.rows > MAX_ROWS;
    const capped = tall && !state.expanded.has(lane.id);
    const shownRows = capped ? MAX_ROWS : L.rows;
    const dotsTop = 6 + shownRows * ROW;
    const height = folded ? FOLDED_HEIGHT : dotsTop + (L.clusters.length ? 20 : 4) + (tall ? 20 : 0);
    const row = el("div", `lane${folded ? " folded" : ""}`);
    row.dataset.lane = lane.id;
    const colour = laneColour(lane);
    const lab = el("div", "lane-label");
    lab.style.height = `${height}px`;
    const placedNote = lane0.unplaced ? `<button class="badge" title="${lane0.unplaced} fact${lane0.unplaced === 1 ? "" : "s"} here with no date: most are traits and secrets, which live on their page">+${lane0.unplaced}</button>` : "";
    lab.innerHTML = `${placedNote}<span class="grp"><button class="fold" title="${folded ? "Unfold" : "Fold"} this lane" aria-expanded="${!folded}">${folded ? "▸" : "▾"}</button>${esc(lane.group || "")}</span><span class="swatch" style="background:${colour}"></span>${esc(lane.title)}`;
    lab.title = lane.key ? "Open this strand: its threads, and who and what is in it" : "";
    lab.addEventListener("click", () => { if (lane.key) select(`strand:${lane.key}`); });
    lab.querySelector(".fold").addEventListener("click", (ev) => { ev.stopPropagation(); state.folded.has(lane.id) ? state.folded.delete(lane.id) : state.folded.add(lane.id); store("folded", [...state.folded]); drawStrip($("#scroll")); updateBar(); });
    lab.querySelector(".badge")?.addEventListener("click", (ev) => { ev.stopPropagation(); select(`unplaced:${lane.id}`); });
    const track = el("div", "track");
    track.style.width = `${axis.width + 40}px`;
    track.style.height = `${height}px`;
    if (folded) { track.title = `${items.length} item${items.length === 1 ? "" : "s"}: unfold the lane to see them`; drawIntensity(track, lane, colour, FOLDED_HEIGHT - 4); row.append(lab, track); lanesBox.append(row); continue; }
    drawIntensity(track, lane, colour, 30);
    for (const s of L.spans) {
      const sp = el("div", "span");
      sp.style.left = `${s.x}px`; sp.style.width = `${s.w}px`; sp.style.top = `${4 + 0}px`; sp.style.setProperty("--c", colour);
      track.append(sp);
    }
    for (const c of L.chips) {
      if (capped && c.row >= MAX_ROWS) continue;
      const it = c.it;
      const unknown = known && it.kind === "event" && !known.has(it.ref);
      const node = el("div", c.question ? `q ${it.ink ? "ink" : ""}` : `it ${it.style} ${it.kind}${it.beatKind ? ` ${it.beatKind}` : ""}${c.ghost ? " ghost" : ""}${unknown ? " unknown" : ""}`, c.question ? `${clueDots(it)} ${it.title}` : c.label);
      node.style.left = `${c.x}px`;
      node.style.top = `${6 + c.row * ROW}px`;
      node.style.width = c.question || c.column !== undefined ? `${c.w}px` : "";
      if (c.column !== undefined) node.style.maxWidth = `${c.w}px`;
      node.style.setProperty("--c", colour);
      node.style.setProperty("--sc", `var(${STATUS_VAR[it.status] || "--s-sketch"})`);
      node.dataset.id = it.id;
      if (index.beats.get(it.ref)?.fork === "yes") node.classList.add("fork");
      if (it.kind === "beat" && it.pace) { node.classList.add(`pace-${it.pace}`); if (state.pace) node.textContent = `${PACE_GLYPH[it.pace]} ${c.label}`; }
      node.title = tooltip(it, c);
      const open = () => (it.kind === "episode" ? goPlay(it.ref) : select(it.id));
      node.addEventListener("click", (ev) => { ev.stopPropagation(); open(); });
      // Reachable from the keyboard: Tab to a chip, Enter or Space opens it.
      node.tabIndex = 0;
      node.setAttribute("role", "button");
      node.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); open(); } });
      if (matches(it)) node.classList.add("hit");
      if (state.flash.has(it.ref)) node.classList.add("flash");
      if (editing) editing.chip(node, it, c);
      track.append(node);
    }
    if (L.clusters.length) {
      const strip = el("div", "dots");
      strip.style.top = `${dotsTop + 4}px`; strip.style.left = "0"; strip.style.width = "100%";
      for (const cl of L.clusters) {
        const allPencil = cl.its.every((d) => d.style === "pencil");
        const anyOpen = cl.its.some((d) => d.style === "open");
        const unknown = known && cl.its.every((d) => !known.has(d.ref));
        const dot = el("div", `dot${allPencil ? " pencil" : ""}${anyOpen ? " open" : ""}${unknown ? " unknown" : ""}`);
        dot.style.left = `${cl.x}px`;
        dot.style.setProperty("--c", colour);
        dot.style.setProperty("--sc", `var(${STATUS_VAR[cl.its[0].status] || "--s-sketch"})`);
        if (cl.its.length > 1) dot.append(el("span", "n", String(cl.its.length)));
        dot.dataset.id = cl.its.length === 1 ? cl.its[0].id : `cluster:${cl.its.map((d) => d.ref).join(",")}`;
        dot.title = cl.its.length === 1 ? `Where the table learns: ${cl.its[0].title}` : `${cl.its.length} things the table learns here`;
        dot.addEventListener("click", (ev) => { ev.stopPropagation(); select(dot.dataset.id); });
        dot.tabIndex = 0;
        dot.setAttribute("role", "button");
        dot.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); select(dot.dataset.id); } });
        if (cl.its.some(matches)) dot.classList.add("hit");
        strip.append(dot);
      }
      track.append(strip);
    }
    if (tall) {
      const hidden = L.chips.filter((c) => c.row >= MAX_ROWS).length;
      const more = el("button", "more", capped ? `+ ${hidden} more` : "show fewer");
      more.title = capped ? "Show every item in this lane" : "Show only the first rows";
      more.addEventListener("click", (ev) => { ev.stopPropagation(); state.expanded.has(lane.id) ? state.expanded.delete(lane.id) : state.expanded.add(lane.id); drawStrip($("#scroll")); updateBar(); });
      track.append(more);
    }
    row.append(lab, track);
    lanesBox.append(row);
  }
  canvas.append(lanesBox);

  // Now: Day 1, or the point the table-knows lens is set to
  const nowPos = state.tableAt ? placePosition(state.tableAt) : { scale: "days", at: 0 };
  const nx = nowPos ? axis.toX(nowPos) : null;
  if (nx !== null) {
    const line = el("div", "nowline");
    line.style.left = `${LABELS + nx}px`;
    line.dataset.label = state.tableAt ? `the table, at ${placeName(state.tableAt)}` : "Now: Day 1";
    canvas.append(line);
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("links");
  canvas.append(svg);
  scroll.append(canvas);
  scroll.scrollLeft = keep.left; scroll.scrollTop = keep.top;
  // The first time the strip is drawn it opens where the table is (Day 1), not at the far left of the deep past.
  if (!state.opened) { state.opened = true; jumpTo("now"); }
  if (state.selected) { highlight(state.selected); drawLinks(state.selected); }
}

/** The numbers and buttons that are the same in every view. */
function updateBar() {
  const known = state.tableAt ? tableKnows(snap, state.tableAt) : null;
  const t = tally(snap);
  const pieces = [`<b>${t.ink}</b> ink`, `<b>${t.pencil}</b> pencil`, `<b>${t.open}</b> open`];
  if (known) pieces.unshift(`the table knows <b>${known.size}</b> of ${snap.facts.filter((f) => f.status !== "cut").length} facts`);
  $("#counts").innerHTML = pieces.join(" · ");
  const h = health(snap, { publishedHash: snap.published?.canonHash || null });
  const hb = $("#health");
  hb.hidden = !h.findings.length;
  hb.textContent = `${h.findings.length} to look at`;
  $("#sub").textContent = `Blank Inheritance · present year ${snap.presentYear} AR · canon ${snap.canonHash}`;
  const open = decisionGroups(snap).reduce((n, g) => n + g.items.length, 0);
  $("#decisions-n").textContent = open ? String(open) : "";
  const mb = $("#merges");
  const live = (snap.merges || []).filter((m) => m.state === "live");
  const toCheck = live.filter((m) => !m.accepted).length;
  mb.hidden = !live.length;
  mb.textContent = toCheck ? `Merges · ${toCheck} to check` : "Merges";
  const np = tl.unplaced.length;
  const ub = $("#unplaced");
  ub.hidden = !np;
  ub.textContent = `Not placed in time · ${np}`;
  for (const [id, view] of VIEW_TABS) $(`#${id}`).setAttribute("aria-selected", String(state.view === view));
  const onTime = state.view === "play" || state.view === "strip";
  $("#shared-controls").hidden = !onTime;
  $("#strip-controls").hidden = state.view !== "strip";
  $("#play-controls").hidden = state.view !== "play";
  $("#legend-play").hidden = state.view !== "play";
  $("#legend-strip").hidden = state.view !== "strip";
  $("#play-density").value = state.density;
  $("#play-group").value = state.group;
}

const VIEW_TABS = [["view-play", "play"], ["view-strip", "strip"], ["view-entities", "entities"], ["view-decisions", "decisions"]];

/** The episodes and chapters the Timeline can jump to, filled each time it is drawn. */
function fillJump() {
  const sel = $("#play-jump");
  const bands = playView.bands();
  sel.innerHTML = `<option value="">the start</option>${bands.map((b) => `<option value="${esc(b.id)}">${esc(b.label)}</option>`).join("")}`;
}

/** Open the Timeline at an episode (a block on the History strip leads here). */
function goPlay(episode) {
  state.view = "play";
  store("view-v2", "play");
  render();
  const band = playView.bands().find((b) => b.label === episode);
  if (band) playView.jump($("#scroll"), band.id);
}

function placePosition(id) {
  const scene = tl.byId.get(`scene:${id}`) || tl.byId.get(`beat:${id}`) || tl.byId.get(`chapter:${id}`);
  return scene ? scene.position : null;
}
function placeName(id) {
  const s = index.scenes.get(id); if (s) return s.title;
  const c = index.chapters.get(id); if (c) return `Chapter ${c.n}`;
  return id;
}
function tooltip(it, c) {
  if (it.kind === "episode") return `${it.title}\nOpen these scenes on the Timeline`;
  const st = it.status + (it.by ? ` by ${it.by}` : "");
  const where = c.ghost ? " (one candidate date)" : "";
  const clues = it.kind === "question" ? `\n${it.roads || 0} road${it.roads === 1 ? "" : "s"} to the answer (three are wanted)` : "";
  return `${it.title || it.ref}\n${it.kind} · ${st}${where}${clues}`;
}
function esc(s) { return String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }
function matches(it) {
  if (!state.query) return false;
  const q = state.query.toLowerCase();
  return String(it.title || "").toLowerCase().includes(q) || String(it.ref || "").toLowerCase().includes(q);
}

// ---- selection, the inspector and the line from an event to where the table learns it
// A bare fact id stands for its event if it has a date, else where the table learns it.
const placed = (id) => (index.facts.has(id) ? (tl.byId.has(`event:${id}`) ? `event:${id}` : tl.byId.has(`reveal:${id}`) ? `reveal:${id}` : id) : id);
function select(id) {
  id = placed(id);
  const box = $("#insp");
  // Selecting what is already open (after a save, say) keeps the panel where it was scrolled to.
  const keep = state.selected === id && !box.hidden ? box.scrollTop : 0;
  state.selected = id;
  $("#work").classList.add("open");
  box.hidden = false;
  if (id.startsWith("entity:") || id.startsWith("unplaced:") || id === "recent" || id === "merges" || id.startsWith("record:")) {
    highlight(null);
    drawLinks(null);
    if (id.startsWith("entity:")) views.renderEntityPage(box, id.slice("entity:".length), { close: closeInspector });
    else if (id === "recent") views.renderRecent(box, { close: closeInspector });
    else if (id === "merges") views.renderMerges(box, { close: closeInspector });
    else if (id.startsWith("record:")) views.renderRecord(box, id.slice("record:".length), { close: closeInspector });
    else views.renderUnplaced(box, id.slice("unplaced:".length), { close: closeInspector });
    box.scrollTop = keep;
    return;
  }
  // The side panel's other views, live only: going through the pencil, and her notes to Claude.
  if ((id === "review" && review) || (id === "notes" && editing)) {
    highlight(null);
    drawLinks(null);
    if (id === "review") review.render(box); else editing.renderNotes(box);
    return;
  }
  renderInspector(box, { snap, tl, index, select, close: closeInspector, routing: (sceneId) => routingOf(flowOf(), sceneId), playCell }, id);
  if (editing) editing.decorate(box, id);
  box.scrollTop = keep;
  highlight(id);
  drawLinks(id);
  if (state.view === "play") {
    playView.focus(id);
    if (id.startsWith("scene:")) playView.reveal(id.slice("scene:".length), $("#scroll"));
  }
}
function setView(view) {
  if (state.view === view && snap) return;
  state.view = view;
  store("view-v2", view);
  if (snap) render();
}

/** The lane an entity is drawn on, if any. */
function laneOf(entityId) {
  return tl?.lanes.find((l) => (l.entities || []).includes(entityId) && ((l.id !== "ideas" && l.id !== "questions" && l.id !== "play"))) || null;
}
function showLane(entityId) {
  const lane = laneOf(entityId);
  if (!lane) return;
  if (state.folded.has(lane.id)) { state.folded.delete(lane.id); store("folded", [...state.folded]); }
  // What happened long ago is on the History strip; everything else is told in scenes, so its strand is on the Timeline.
  state.view = lane.key === "past" ? "strip" : "play";
  store("view-v2", state.view);
  render();
  // A strand is a row of its own, or (when the notes are read by scene) a key in the legend.
  const node = document.querySelector(`.lane[data-lane="${CSS.escape(lane.id)}"]`) || document.querySelector(`.pl-key[data-lane="${CSS.escape(lane.id)}"]`);
  if (node) { node.scrollIntoView({ block: "center" }); node.classList.add("flashlane"); setTimeout(() => node.classList.remove("flashlane"), 2500); }
}
/** A thread is the colour of the strand it belongs to. */
const threadColour = (id) => {
  const thread = index?.threads.get(id);
  const lane = thread ? index.lanes.get(laneId(laneKeyOfThread(thread))) : null;
  return lane ? laneColour(lane) : "var(--l11)";
};

/** Light up something on the strip and bring it into view, without opening it (review mode walks the pencil this way). */
function reveal(id) {
  id = placed(id);
  highlight(id);
  const ref = id.includes(":") ? id.split(":").slice(1).join(":") : id;
  const node = document.querySelector(`[data-id="${CSS.escape(id)}"]`) || [...document.querySelectorAll('[data-id^="cluster:"]')].find((n) => n.dataset.id.slice(8).split(",").includes(ref)) || document.querySelector(`[data-id="fact:${CSS.escape(ref)}"]`);
  node?.scrollIntoView({ block: "nearest", inline: "center" });
}
function closeInspector() {
  state.selected = null;
  $("#insp").hidden = true;
  $("#work").classList.remove("open");
  highlight(null);
  drawLinks(null);
  playView.focus(null);
}
function highlight(id) {
  for (const n of document.querySelectorAll(".sel")) n.classList.remove("sel");
  if (!id) return;
  const ref = id.includes(":") ? id.split(":").slice(1).join(":") : id;
  for (const n of document.querySelectorAll("[data-id]")) {
    const d = n.dataset.id;
    if (d === id || d.endsWith(`:${ref}`) || (d.startsWith("cluster:") && d.slice(8).split(",").includes(ref))) n.classList.add("sel");
  }
}
/** The chip, or the dot that holds it, that shows a fact (or beat) on the strip. */
function chipFor(ref) {
  const q = (kind) => document.querySelector(`[data-id="${kind}:${CSS.escape(ref)}"]`);
  return q("event") || q("reveal") || [...document.querySelectorAll('[data-id^="cluster:"]')].find((n) => n.dataset.id.slice(8).split(",").includes(ref)) || q("beat") || null;
}

function drawLinks(id) {
  const svg = document.querySelector("svg.links");
  if (!svg) return;
  svg.innerHTML = "";
  for (const n of document.querySelectorAll(".road")) n.classList.remove("road", "core");
  if (!id) return;
  const canvasEl = document.querySelector(".canvas");
  if (!canvasEl) return;
  const canvas = canvasEl.getBoundingClientRect();
  svg.setAttribute("width", canvas.width); svg.setAttribute("height", canvas.height);
  const curve = (a, b, cls = "") => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x1 = ra.left + ra.width / 2 - canvas.left, y1 = ra.top + ra.height / 2 - canvas.top;
    const x2 = rb.left + rb.width / 2 - canvas.left, y2 = rb.top + rb.height / 2 - canvas.top;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const dx = x2 - x1, dy = y2 - y1;
    // A smooth S: along the longer direction, so a far-off clue reads as a line to it rather than a loop.
    p.setAttribute("d", Math.abs(dy) > Math.abs(dx) ? `M${x1},${y1} C${x1},${y1 + dy / 2} ${x2},${y1 + dy / 2} ${x2},${y2}` : `M${x1},${y1} C${x1 + dx / 2},${y1} ${x2 - dx / 2},${y2} ${x2},${y2}`);
    if (cls) p.setAttribute("class", cls);
    svg.append(p);
  };
  const ref = id.split(":").slice(1).join(":");
  if (/^(event|reveal):/.test(id)) {
    const a = document.querySelector(`[data-id="event:${CSS.escape(ref)}"]`);
    let b = document.querySelector(`[data-id="reveal:${CSS.escape(ref)}"]`);
    if (!b) b = [...document.querySelectorAll('[data-id^="cluster:"]')].find((n) => n.dataset.id.slice(8).split(",").includes(ref)) || null;
    if (a && b) curve(a, b);
  } else if (id.startsWith("question:")) {
    // A mystery and the roads to it: a line to each clue on the strip, the core road heavier, the answer in violet.
    const q = index.questions.get(ref);
    const qn = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!q || !qn) return;
    for (const r of q.roads || []) {
      const t = chipFor(r.fact);
      if (!t) continue;
      t.classList.add("road");
      if (r.core) t.classList.add("core");
      curve(qn, t, r.core ? "core" : "");
    }
    const ans = q.answer ? chipFor(q.answer) : null;
    if (ans) { ans.classList.add("road"); curve(qn, ans, "answer"); }
  }
}

// ---- the bar's controls
/** The lens can stand at any planned scene (the plan is the play order), grouped by episode, and at each chapter ahead. */
function fillTableAt() {
  const sel = $("#table-at");
  const order = snap.order || {};
  const groups = new Map();
  for (const s of snap.scenes || []) {
    if (order[s.id] === undefined) continue;
    const g = s.episode || "Scenes";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ id: s.id, label: s.title, seq: order[s.id] });
  }
  const chapters = (snap.chapters || []).filter((c) => c.n > 1 && order[c.id] !== undefined).map((c) => ({ id: c.id, label: `Chapter ${c.n} · ${c.title}`, seq: order[c.id] }));
  const opt = (p) => `<option value="${esc(p.id)}"${p.id === state.tableAt ? " selected" : ""}>by ${esc(p.label)}</option>`;
  const group = (label, list) => `<optgroup label="${esc(label)}">${list.sort((a, b) => a.seq - b.seq).map(opt).join("")}</optgroup>`;
  sel.innerHTML = `<option value=""${state.tableAt ? "" : " selected"}>everything (lens off)</option>${[...groups].map(([g, list]) => group(g, list)).join("")}${chapters.length ? group("Chapters ahead", chapters) : ""}`;
}
function wire() {
  search = views.attachSearch($("#search"), $("#results"));
  for (const [id, view] of VIEW_TABS) $(`#${id}`).addEventListener("click", () => setView(view));
  $("#play-density").addEventListener("change", (e) => { state.density = e.target.value; store("density", state.density); render(); });
  $("#play-group").addEventListener("change", (e) => { state.group = e.target.value; store("group", state.group); render(); });
  $("#play-jump").addEventListener("change", (e) => { playView.jump($("#scroll"), e.target.value); });
  $("#unplaced").addEventListener("click", () => select("unplaced:all"));
  $("#recent").addEventListener("click", () => select("recent"));
  $("#merges").addEventListener("click", () => select("merges"));
  for (const where of ["past", "now", "ahead"]) $(`#jump-${where}`).addEventListener("click", () => jumpTo(where));
  $("#table-at").addEventListener("change", (e) => {
    state.tableAt = e.target.value || null;
    $("#lens-table").setAttribute("aria-pressed", String(Boolean(state.tableAt)));
    render();
  });
  $("#lens-status").addEventListener("click", () => { state.status = !state.status; $("#lens-status").setAttribute("aria-pressed", String(state.status)); render(); });
  $("#lens-ideas").addEventListener("click", () => { state.ideas = !state.ideas; $("#lens-ideas").setAttribute("aria-pressed", String(state.ideas)); render(); });
  $("#lens-pace").addEventListener("click", () => { state.pace = !state.pace; $("#lens-pace").setAttribute("aria-pressed", String(state.pace)); render(); });
  const zoomTo = (z) => { state.zoom = Math.min(8, Math.max(0.25, Math.round(z * 100) / 100)); store("zoom", state.zoom); render(); };
  $("#zoom-in").addEventListener("click", () => zoomTo(state.zoom * 1.5));
  $("#zoom-out").addEventListener("click", () => zoomTo(state.zoom / 1.5));
  $("#zoom-fit").addEventListener("click", () => { const w = $("#scroll").clientWidth - LABELS - 40; zoomTo((w / (axis.width / state.zoom)) || 1); });
  $("#health").addEventListener("click", () => select("health"));
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, select, textarea")) return;
    if (e.key === "Escape") closeInspector();
    if (state.view !== "strip") return;
    if (e.key === "+" || e.key === "=") zoomTo(state.zoom * 1.25);
    if (e.key === "-") zoomTo(state.zoom / 1.25);
  });
  $("#scroll").addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    zoomTo(state.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  }, { passive: false });
}

// The editing, only on the live page with the server's token: never part of the read-only copy.
async function startEditing() {
  const [{ createEditing }, { createReview }] = await Promise.all([import("./editing.js"), import("./review.js")]);
  editing = createEditing({ getSnap: () => snap, getAxis: () => axis, reload: () => load(), select, rerender: render, selected: () => state.selected, close: closeInspector });
  if (editing) review = createReview({ getSnap: () => snap, index: () => index, editing, select, close: closeInspector, reveal, selected: () => state.selected });
}

async function load() {
  const res = await fetch(SOURCE, { cache: "no-store" });
  if (!res.ok) throw new Error(`${SOURCE}: ${res.status}`);
  const previous = snap;
  snap = await res.json();
  if (!views) {
    views = createViews({
      getSnap: () => snap, getTimeline: () => tl, select, reveal, laneOf, showLane, threadColour, editing: () => editing,
      setQuery: (q) => { state.query = q; if (snap && (state.view === "strip" || state.view === "play")) render(); },
    });
    wire();
  }
  if (LIVE && TOKEN && !editing) await startEditing();
  // What changed since the last look (Claude's edits, arriving while she reads) glows for a few seconds.
  const changed = editing ? editing.loaded(previous, snap) : [];
  if (changed.length) {
    state.flash = new Set(changed);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { state.flash = new Set(); }, 6000);
  }
  fillTableAt();
  // A list she is typing an answer into stays as it is (and says canon moved); everything else follows canon.
  const typing = Boolean(editing && editing.holding());
  const inList = state.view !== "strip" && state.view !== "play" && document.activeElement?.matches?.("textarea, input") && $("#scroll").contains(document.activeElement);
  prepare();
  updateBar();
  if (!inList) draw();
  search?.refresh();
  if (state.selected && !typing) select(state.selected);
}

load().catch((e) => { $("#scroll").innerHTML = `<div class="empty-state">The timeline couldn't read canon: ${esc(e.message)}</div>`; });
if (LIVE && "EventSource" in window) {
  const live = $("#live");
  const es = new EventSource("api/events");
  es.addEventListener("hello", () => { live.textContent = TOKEN ? "live: follows canon as it changes; drag pencil to move it in time" : "live: follows canon as it changes"; });
  es.addEventListener("canon", (e) => {
    let news = {};
    try { news = JSON.parse(e.data); } catch { /* reload anyway */ }
    // Her own save is already loaded; anything else (Claude's edit, a reply to a note) is not.
    if (snap && news.hash === snap.canonHash && (news.notes ?? "") === (snap.timeline?.notesStamp ?? "")) return;
    live.textContent = `updated ${new Date().toLocaleTimeString("en-GB")}`;
    load().catch(() => {});
  });
  es.onerror = () => { live.textContent = "not connected to canon; reload to try again"; };
} else {
  document.querySelector("#live").textContent = "a copy: read-only";
}
