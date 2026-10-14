/**
 * The plot timeline's play view (design/plot-timeline.md §4, D086): the table's own scenes as a flow, and under each scene what
 * the other strands of the story do in it. Pure: the page on this PC draws it now, and a Foundry window can later.
 *
 * The rule of the layout is hers: scenes that follow each other never overlap, and scenes that do overlap (one above another)
 * are ones the players could take in either order. So the plan row says what a scene follows, and the layout puts a scene one
 * column to the right of everything it follows, and scenes that follow the same thing in a stack in one column.
 *
 * A plan row's note carries its routing as labelled parts after the prose, separated by " // ":
 *   After: <scene id>, <scene id>, group:<name>   what it follows (default: the row above it in its own table)
 *   Branch: any order | only if ...                how the players reach it, when it is a choice
 *   Group: <name>                                  a name other rows can follow as a whole (group:<name>)
 *   Stack: yes                                     many scenes of one group drawn as one card until opened
 *   Kind: plot | downtime | light                  how heavy the scene is
 *   Fight: yes                                     the scene is a fight
 * A scene id may leave off its leading "episode-".
 */
import { laneKeyOfThread, laneKeyOfEntity, laneId, LANE_DEFS, MYSTERY_LANE } from "./timeline-lanes.mjs";

export const KINDS = Object.freeze(["plot", "downtime", "light"]);
const ROUTING = new Set(["After", "Branch", "Group", "Stack", "Kind", "Fight"]);
/** A branch that names a condition is drawn on its own edge, dashed. */
const CONDITIONAL = /^(only if|needs|once|after|if)\b/i;
/** How many notes a cell shows before "+ N more": three is what a row can carry without towering over the scenes it sits under. */
export const NOTES_PER_CELL = 3;
/** Under Scene 0 sit all the facts the table already knows when it starts (dozens), so that cell shows fewer. */
export const START_NOTES_PER_CELL = 2;

/** A plan row's note, split into the labelled parts the inspector shows, and the routing the flow reads. */
export function parseSceneNote(note) {
  const out = { parts: [], after: [], branch: null, group: null, stack: false, kind: null, fight: false, problems: [] };
  for (const raw of String(note || "").split(" // ")) {
    const text = raw.trim();
    if (!text) continue;
    const m = text.match(/^([A-Z][a-z]+(?: [a-z]+)?): (.*)$/);
    if (!m || !ROUTING.has(m[1])) { out.parts.push(text); continue; }
    const [, label, value] = m;
    if (label === "After") out.after.push(...value.split(",").map((s) => s.trim()).filter(Boolean));
    else if (label === "Branch") out.branch = value.trim();
    else if (label === "Group") out.group = value.trim();
    else if (label === "Stack") out.stack = /^yes$/i.test(value.trim());
    else if (label === "Fight") out.fight = /^yes$/i.test(value.trim());
    else if (label === "Kind") { if (KINDS.includes(value.trim())) out.kind = value.trim(); else out.problems.push(`unknown kind "${value.trim()}"`); }
  }
  return out;
}

const shortLabel = (episode, chapter, chapters) => {
  if (chapter >= 2) {
    const c = (chapters || []).find((x) => x.n === chapter);
    const ep = String(episode || "").replace(/\s*\(Episode [^)]*\)\s*$/, "");
    return c ? `Chapter ${chapter} · ${c.title}${ep && ep !== c.title ? ` · ${ep}` : ""}` : `Chapter ${chapter} · ${ep}`;
  }
  return episode || "Episode One";
};

/**
 * The flow of the table's scenes.
 * @param {object} snap  see tools/story/snapshot.mjs
 * @param {{ expanded?: Set<string> }} opts  stacks the reader has opened, by stack id
 * @returns {{ nodes, edges, forks, columns, bands, slots, lanes, byId, problems }}
 */
export function buildPlay(snap, { expanded = new Set() } = {}) {
  const problems = [];
  const rows = snap.scenes || [];
  const byScene = new Map();
  const nodes = rows.map((r, order) => {
    const note = parseSceneNote(r.note);
    for (const p of note.problems) problems.push({ id: r.id, message: p });
    const n = {
      id: r.id, title: r.title, episode: r.episode || "", chapter: r.chapter || 1, day: r.day ?? null, time: r.time || null, state: r.state, inCanon: Boolean(r.inCanon),
      order, kind: note.kind || "light", fight: note.fight, branch: note.branch, group: note.group, stack: note.stack, note, preds: [], members: null,
    };
    byScene.set(r.id, n);
    return n;
  });
  const find = (token) => byScene.get(token) || byScene.get(`episode-${token}`) || null;

  // What each scene follows.
  const raw = new Map();
  rows.forEach((r, i) => {
    const n = byScene.get(r.id);
    const preds = [];
    if (n.note.after.length) {
      for (const tok of n.note.after) {
        if (tok.startsWith("group:")) {
          const members = nodes.filter((m) => m.group === tok.slice(6) && m !== n);
          if (!members.length) problems.push({ id: r.id, message: `${tok} names no scene` });
          preds.push(...members);
        } else {
          const p = find(tok);
          if (p) preds.push(p); else problems.push({ id: r.id, message: `After: ${tok} is not a scene in the plan` });
        }
      }
    } else {
      // Nothing said: it follows the row above it, whatever table that is in. Standing level with an earlier scene would say
      // "either order", and nothing here says that unless an After: puts it there.
      const above = nodes[i - 1];
      if (above) preds.push(above);
    }
    raw.set(n.id, [...new Set(preds.filter((p) => p !== n))]);
  });

  // A chapter with no scenes planned yet is one card (kind "outline"), so the flow carries on to the last chapter of the campaign.
  // It follows the scenes that close the chapter before it, and the next such chapter follows it.
  const planned = new Set(rows.map((r) => r.chapter || 1));
  const closersOf = (chapter) => {
    const inChapter = nodes.filter((n) => n.chapter === chapter && !n.outlineOf);
    const followed = new Set();
    for (const n of inChapter) for (const p of raw.get(n.id) || []) followed.add(p.id);
    return inChapter.filter((n) => !followed.has(n.id));
  };
  let tail = closersOf(1);
  for (const c of [...(snap.chapters || [])].filter((x) => x.n >= 2).sort((a, b) => a.n - b.n)) {
    if (planned.has(c.n)) { tail = closersOf(c.n); continue; }
    const book = (snap.books || []).find((b) => c.n >= b.from && c.n <= b.to);
    const bandLabel = book ? `Book ${book.numeral} · ${book.title}` : "Later chapters";
    const o = {
      id: c.id, title: `Chapter ${c.n} · ${c.title}`, episode: bandLabel, bandLabel, chapter: c.n, day: null, time: null, state: "unwritten", inCanon: false,
      order: nodes.length, kind: "outline", fight: false, branch: null, group: null, stack: false, outlineOf: c.id, summary: c.learn || c.text || "",
      note: { parts: [], after: [], branch: null, group: null, stack: false, kind: "outline", fight: false, problems: [] }, preds: [], members: null,
    };
    nodes.push(o);
    byScene.set(o.id, o);
    raw.set(o.id, tail.slice());
    tail = [o];
  }

  // Stacks: many scenes of one group drawn as one card until opened.
  const stackOf = new Map();
  const stacks = new Map();
  for (const n of nodes) {
    if (!n.stack || !n.group) continue;
    const sid = `stack:${n.group}`;
    if (expanded.has(sid)) continue;
    if (!stacks.has(sid)) stacks.set(sid, []);
    stacks.get(sid).push(n);
    stackOf.set(n.id, sid);
  }
  const drawn = [];
  const idOf = (n) => stackOf.get(n.id) || n.id;
  const made = new Map();
  for (const n of nodes) {
    const sid = stackOf.get(n.id);
    if (!sid) { drawn.push(n); made.set(n.id, n); continue; }
    if (made.has(sid)) continue;
    const members = stacks.get(sid);
    const kinds = new Map();
    for (const m of members) kinds.set(m.kind, (kinds.get(m.kind) || 0) + 1);
    const kind = [...kinds].sort((a, b) => b[1] - a[1])[0][0];
    const first = members[0];
    const stack = {
      id: sid, title: `${first.episode || "Choices"} · ${members.length} choices`, episode: first.episode, chapter: first.chapter, day: first.day, time: first.time,
      state: members.every((m) => m.state === first.state) ? first.state : "mixed", inCanon: members.every((m) => m.inCanon), order: first.order, kind,
      fight: false, branch: first.branch, group: first.group, stack: true, note: { parts: [], after: [], branch: first.branch, group: first.group, stack: true, kind, fight: false }, preds: [], members: members.map((m) => m.id),
    };
    drawn.push(stack);
    made.set(sid, stack);
  }
  const drawnById = new Map(drawn.map((n) => [n.id, n]));
  for (const n of drawn) {
    const sources = n.members ? n.members.map((id) => byScene.get(id)) : [n];
    const preds = new Set();
    for (const s of sources) for (const p of raw.get(s.id) || []) preds.add(idOf(p));
    preds.delete(n.id);
    n.preds = [...preds].map((id) => drawnById.get(id)).filter(Boolean);
  }
  for (const n of drawn) n.succs = [];
  for (const n of drawn) for (const p of n.preds) p.succs.push(n);

  // Layers: a scene is one column to the right of the furthest-right scene it follows. A cycle is reported and its closing edge dropped.
  const col = new Map();
  const state = new Map();
  const visit = (n) => {
    if (state.get(n.id) === 2) return col.get(n.id);
    if (state.get(n.id) === 1) return 0;
    state.set(n.id, 1);
    let c = 0;
    n.preds = n.preds.filter((p) => {
      if (state.get(p.id) === 1) { problems.push({ id: n.id, message: `a cycle: ${n.title} and ${p.title} follow each other` }); p.succs = p.succs.filter((s) => s !== n); return false; }
      return true;
    });
    for (const p of n.preds) c = Math.max(c, visit(p) + 1);
    state.set(n.id, 2);
    col.set(n.id, c);
    return c;
  };
  for (const n of [...drawn].sort((a, b) => a.order - b.order)) visit(n);
  for (const n of drawn) n.col = col.get(n.id);

  // Rows within a column: ordered by where the scenes they follow sit, then centred on the middle, so a fork fans out and a join closes in.
  const columns = [];
  const maxCol = Math.max(-1, ...drawn.map((n) => n.col));
  const y = new Map();
  for (let c = 0; c <= maxCol; c++) {
    const list = drawn.filter((n) => n.col === c);
    const bary = (n) => (n.preds.length ? n.preds.reduce((s, p) => s + (y.get(p.id) ?? 0), 0) / n.preds.length : 0);
    list.sort((a, b) => bary(a) - bary(b) || a.order - b.order);
    list.forEach((n, i) => { n.y = i - (list.length - 1) / 2; y.set(n.id, n.y); });
    const first = [...list].sort((a, b) => a.order - b.order)[0];
    columns.push({ index: c, ids: list.map((n) => n.id), episode: first?.episode || "", chapter: first?.chapter || 1, label: first?.bandLabel || null });
  }
  const minY = Math.min(0, ...drawn.map((n) => n.y));
  const maxY = Math.max(0, ...drawn.map((n) => n.y));
  const slots = maxY - minY + 1;
  for (const n of drawn) n.row = n.y - minY;

  // Bands: runs of columns in one episode.
  const bands = [];
  for (const c of columns) {
    const label = c.label || shortLabel(c.episode, c.chapter, snap.chapters);
    const last = bands[bands.length - 1];
    if (last && last.label === label) last.to = c.index;
    else bands.push({ id: `band-${bands.length}`, label, chapter: c.chapter, from: c.index, to: c.index });
  }

  // Edges, and where a label belongs: one on the fork when siblings share it, one on the edge when it is theirs alone or a condition.
  const edges = [];
  const forks = [];
  for (const p of drawn) {
    const labels = new Map();
    for (const s of p.succs) { const b = s.branch; if (b && !CONDITIONAL.test(b)) labels.set(b, (labels.get(b) || 0) + 1); }
    const shared = [...labels].filter(([, k]) => k >= 2).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    if (shared) forks.push({ from: p.id, label: shared, to: p.succs.filter((s) => s.branch === shared).map((s) => s.id) });
    for (const s of p.succs) {
      const b = s.branch;
      const conditional = Boolean(b && CONDITIONAL.test(b));
      // Three or more edges into one scene would each repeat its words, so a join of many carries them on its card instead.
      const own = b && b !== shared && s.preds.length < 3;
      edges.push({ from: p.id, to: s.id, conditional, label: own ? b : null });
    }
  }
  // A card carries its own branch when it is not already said on its edges (a join of many, say).
  for (const n of drawn) {
    const onEdge = edges.some((e) => e.to === n.id && e.label);
    n.tag = n.branch && !onEdge && !forks.some((f) => f.to.includes(n.id)) ? n.branch : null;
  }

  // Every group that can be drawn as a card, open or shut, so the page can offer to fold one it has opened.
  const groups = new Map();
  for (const n of nodes) if (n.stack && n.group) { if (!groups.has(n.group)) groups.set(n.group, []); groups.get(n.group).push(n); }
  const stackGroups = [...groups].map(([group, list]) => ({ id: `stack:${group}`, group, members: list.map((m) => m.id), open: expanded.has(`stack:${group}`), title: `${list[0].episode || "Choices"} · ${list.length} choices` }));

  const play = { nodes: drawn, edges, forks, columns, bands, slots, byId: drawnById, byScene, stackOf, stackGroups, problems };
  play.lanes = playLanes(snap, play);
  return play;
}

// ---- what the other strands do in each scene

/** The node (or stack) a scene id is drawn as. */
const nodeOf = (play, sceneId) => play.byId.get(play.stackOf.get(sceneId) || sceneId) || null;

/** A short line of a fact's words, for a note. */
export const clip = (text, n = 150) => {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

function playLanes(snap, play) {
  const threads = new Map((snap.threads || []).map((t) => [t.id, t]));
  const entities = new Map((snap.entities || []).map((e) => [e.id, e]));
  const lanes = LANE_DEFS.map((d) => ({ id: laneId(d.id), key: d.id, title: d.title, colour: d.colour, cells: new Map(), count: 0 }));
  lanes.push({ id: MYSTERY_LANE.id, key: MYSTERY_LANE.id, title: MYSTERY_LANE.title, colour: MYSTERY_LANE.colour, cells: new Map(), count: 0 });
  const laneById = new Map(lanes.map((l) => [l.key, l]));
  const add = (laneKey, node, note) => {
    const lane = laneById.get(laneKey);
    if (!lane || !node) return;
    if (!lane.cells.has(node.id)) lane.cells.set(node.id, []);
    lane.cells.get(node.id).push(note);
    lane.count++;
  };
  const firstOf = (chapter) => [...play.nodes].filter((n) => n.chapter === chapter).sort((a, b) => a.order - b.order)[0] || null;
  const sceneZero = [...play.nodes].filter((n) => !n.preds.length).sort((a, b) => a.order - b.order)[0] || null;

  // Beats: what a strand does in a chapter, under the scene it names (`scene:`), else under the chapter's first scene, or the
  // chapter's own card when it has no scenes yet.
  const beatNode = new Map();
  for (const c of snap.chapters || []) {
    if (c.n < 2) continue;
    for (const b of c.beats || []) {
      const scene = b.meta?.scene ? (play.byScene.get(b.meta.scene) || play.byScene.get(`episode-${b.meta.scene}`)) : null;
      const node = (scene && nodeOf(play, scene.id)) || firstOf(c.n);
      if (!node) continue;
      beatNode.set(b.id, node);
      let key = null;
      for (const id of b.threads || []) { const t = threads.get(id); if (t) { key = laneKeyOfThread(t); break; } }
      if (!key || key === "play") continue;
      add(key, node, { kind: "beat", ref: b.id, id: b.id, beatKind: b.kind, text: b.text, status: b.status, by: b.by || null, chapterWide: !scene && node.kind !== "outline" });
    }
  }

  // Where a fact (or a question) is told: a scene, a beat, or a chapter (its first scene, or its own card).
  const chapterNode = new Map((snap.chapters || []).map((c) => [c.id, c.n < 2 ? null : firstOf(c.n)]));
  const placeOfTold = (told) => {
    if (told === "start") return sceneZero;
    const m = /^in:(.+)$/.exec(told || "");
    if (!m) return null;
    return nodeOf(play, m[1]) || beatNode.get(m[1]) || chapterNode.get(m[1]) || null;
  };

  // Facts: a note under the scene that tells them, in the strand of their thread or person.
  const factByScene = new Map();
  for (const f of snap.facts || []) {
    if (f.status === "cut") continue;
    const node = placeOfTold(f.told);
    if (!node) continue;
    if (/^in:/.test(f.told)) factByScene.set(f.id, node);
    let key = null;
    for (const id of f.threads || []) { const t = threads.get(id); if (t) { key = laneKeyOfThread(t); break; } }
    if (!key) key = laneKeyOfEntity(snap, entities.get(f.entity) || { id: f.entity });
    if (key === "play") continue;
    add(key, node, { kind: "fact", ref: f.id, id: f.id, text: f.text, status: f.status, by: f.by || null, known: f.known });
  }

  // Mysteries: where each question is raised, where its clues reach the table, and where it is answered.
  for (const q of snap.questions || []) {
    const raised = placeOfTold(q.raised);
    const answered = placeOfTold(q.answered);
    if (raised) add("mysteries", raised, { kind: "raised", ref: q.id, id: `question:${q.id}`, text: `Raises: ${q.title}`, status: q.status, by: q.by || null });
    for (const r of q.roads || []) {
      const node = factByScene.get(r.fact) || beatNode.get(r.fact);
      if (!node) continue;
      const f = (snap.facts || []).find((x) => x.id === r.fact);
      add("mysteries", node, { kind: "road", ref: r.fact, id: r.fact, core: Boolean(r.core), clue: r.kind, text: `${q.title} ${r.core ? "(core clue)" : "(clue)"}: ${clip(f ? f.text : r.fact, 110)}`, status: f?.status || q.status, by: null });
    }
    if (answered) add("mysteries", answered, { kind: "answered", ref: q.id, id: `question:${q.id}`, text: `Answers: ${q.title}`, status: q.status, by: q.by || null });
  }
  for (const l of lanes) for (const notes of l.cells.values()) notes.sort((a, b) => noteRank(a) - noteRank(b));
  return lanes.filter((l) => l.count > 0);
}

/**
 * Which notes win the room when a scene tells more than a cell can show: what the plan itself says happens (a beat) first, then
 * what bears on a mystery, then facts, and in each the settled before the sketched before the still open.
 */
const KIND_RANK = Object.freeze({ beat: 0, raised: 1, road: 1, answered: 1, fact: 2 });
const STATUS_RANK = Object.freeze({ decided: 0, accepted: 0, provisional: 1, proposal: 1, sketch: 2, open: 3 });
export const noteRank = (note) => (KIND_RANK[note.kind] ?? 3) * 10 + (STATUS_RANK[note.status] ?? 2);

/**
 * A strand's cells by column. Scenes that stand in one column (the stops of a choice) share its cell, each as a group under its
 * own scene, so a note always sits straight under the card column that holds its scene.
 * @returns {{ col: number, total: number, cap: number, groups: { node: object, notes: object[] }[] }[]}  `cap` is how many of
 *   `total` the cell shows before "+ N more".
 */
export function cellsByColumn(play, lane) {
  const byCol = new Map();
  for (const [nodeId, notes] of lane.cells) {
    const node = play.byId.get(nodeId);
    if (!node) continue;
    if (!byCol.has(node.col)) byCol.set(node.col, []);
    byCol.get(node.col).push({ node, notes });
  }
  return [...byCol].sort((a, b) => a[0] - b[0]).map(([col, groups]) => {
    groups.sort((a, b) => a.node.y - b.node.y);
    const atStart = groups.some((g) => !g.node.preds.length);
    return { col, groups, total: groups.reduce((n, g) => n + g.notes.length, 0), cap: atStart ? START_NOTES_PER_CELL : NOTES_PER_CELL };
  });
}

/** What a scene follows and what follows it, as titles with ids, for the inspector. */
export function routingOf(play, sceneId) {
  const n = nodeOf(play, sceneId);
  if (!n) return { after: [], next: [] };
  const pick = (x) => ({ id: x.members ? x.members[0] : x.id, title: x.title, stack: Boolean(x.members) });
  return { after: n.preds.map(pick), next: n.succs.map(pick), branch: n.branch, kind: n.kind, fight: n.fight };
}
