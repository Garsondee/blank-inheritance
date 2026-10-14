// The Timeline view (design/plot-timeline.md §4, D086): "At the table" drawn as a flow, and under it the strands of the story.
//
// Her rules, in the order they shaped this: scenes that follow each other never overlap (each sits one column to the right of
// what it follows); scenes that sit one above another are ones the players could take in either order; curves show which scene
// leads to which, a caption over a stack says where the players choose, and colour says how heavy a scene is (red plot, blue
// downtime, green lighter). The band stays in view while the strands scroll under it, and every strand note sits in the column
// of the scene that tells it. All of the arranging is in core/timeline-play.mjs; this file only draws it.
import { buildPlay, cellsByColumn, clip } from "./core/timeline-play.mjs";

const NS = "http://www.w3.org/2000/svg";
const LABELS = 148;
const PAD = 16;
/** Three densities: how wide a card is, how far apart the columns stand, and how much of a scene each card shows. */
export const DENSITIES = Object.freeze({
  compact: { cardW: 132, gap: 38, single: 66, chip: 22, bandMin: 132, lines: 3, summary: false },
  comfortable: { cardW: 172, gap: 54, single: 114, chip: 26, bandMin: 204, lines: 4, summary: true },
  roomy: { cardW: 220, gap: 66, single: 142, chip: 30, bandMin: 272, lines: 6, summary: true },
});
const KIND_WORD = Object.freeze({ plot: "plot", downtime: "downtime", light: "lighter" });
const STATE_WORD = Object.freeze({ approved: "approved", "awaiting-read": "written, awaiting your read", "old-draft": "an old draft still runs in Foundry", unwritten: "not written yet", mixed: "in several states" });
const STATUS_CLASS = Object.freeze({ decided: "ink", accepted: "ink", provisional: "pending", proposal: "pending", sketch: "pencil", open: "open" });
const BEAT_WORD = Object.freeze({ event: "▸ happens", reveal: "◆ reveal", choice: "⑂ choice", flashback: "↺ flashback", end: "■ ends on" });

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

/**
 * Where every card stands. A column of one is centred in the band; a column of several divides the band between them, so a
 * stack is a list of chips and the band grows only when a stack opened by the reader needs more room.
 */
export function geometry(play, d) {
  const capH = 22, pad = 8, gapY = 4;
  const most = Math.max(1, ...play.columns.map((c) => c.ids.length));
  const H = Math.max(d.bandMin, capH + pad * 2 + most * d.chip + (most - 1) * gapY);
  const usable = H - capH - pad * 2;
  const pitch = d.cardW + d.gap;
  const pos = new Map();
  for (const c of play.columns) {
    const n = c.ids.length;
    const h = n === 1 ? Math.min(d.single, usable) : Math.max(d.chip, Math.min(d.single, Math.floor((usable - (n - 1) * gapY) / n)));
    const total = n * h + (n - 1) * gapY;
    const top = capH + pad + (usable - total) / 2;
    c.ids.forEach((id, i) => pos.set(id, { x: PAD + c.index * pitch, y: top + i * (h + gapY), w: d.cardW, h, chip: h < 50 }));
  }
  return { H, pitch, pos, trackW: PAD * 2 + play.columns.length * pitch };
}

/** The line a card shows under its title: the plan's own words for what the players do there. */
function summaryOf(node) {
  if (node.members) return `${node.members.length} scenes; the players choose.`;
  if (node.outlineOf) return clip(node.summary, 150);
  const parts = node.note?.parts || [];
  const pick = parts.find((p) => /^(Do|Choose|Choose, in any order|Arrive):/.test(p)) || parts[0] || "";
  return clip(pick.replace(/^[A-Z][A-Za-z ,]{1,28}: /, ""), 120);
}

/** "Day 1 · late morning"; Scene 0 comes before Day 1; later chapters have no day yet. */
function metaOf(node) {
  if (node.members) return `${node.members.length} choices · one each`;
  if (node.outlineOf) return "not broken into scenes yet";
  if (node.day === null || node.day === undefined) return node.chapter >= 2 ? "" : "before Day 1";
  return `Day ${node.day}${node.time && node.time !== "flexible" ? ` · ${node.time}` : ""}`;
}

/**
 * @param {{ snap: () => object, index: () => object, state: object, select: (id: string) => void, redraw: () => void,
 *           known: () => Set|null, atOrder: () => number|null, colour: (lane: object) => string }} ctx
 */
export function createPlay(ctx) {
  let model = null;
  let geo = null;

  function draw(scroll) {
    const snap = ctx.snap();
    const st = ctx.state;
    const d = DENSITIES[st.density] || DENSITIES.comfortable;
    const play = buildPlay(snap, { expanded: st.stacks });
    model = play;
    const keep = { left: scroll.scrollLeft, top: scroll.scrollTop };
    scroll.innerHTML = "";
    if (!play.nodes.length) { scroll.append(el("div", "empty-state", "No scenes are planned yet.")); return; }
    const g = geometry(play, d);
    geo = g;
    const known = ctx.known();
    const at = ctx.atOrder();
    const order = snap.order || {};
    const query = String(st.query || "").trim().toLowerCase();
    const orderOf = (n) => order[n.members ? n.members[0] : n.id];

    const canvas = el("div", "pl-canvas");
    canvas.style.width = `${LABELS + g.trackW}px`;
    for (const [k, v] of Object.entries({ "--labels": `${LABELS}px`, "--pitch": `${g.pitch}px`, "--cardw": `${d.cardW}px`, "--gap": `${d.gap}px`, "--pad": `${PAD}px`, "--lines": String(d.lines) })) canvas.style.setProperty(k, v);
    const makeRow = (cls, height) => {
      const r = el("div", `pl-r ${cls}`);
      const lab = el("div", "pl-label");
      const tr = el("div", "pl-track");
      tr.style.width = `${g.trackW}px`;
      if (height) tr.style.height = `${height}px`;
      r.append(lab, tr);
      return { r, lab, tr };
    };
    const colX = (c) => PAD + c * g.pitch;

    // ---- the sticky top: where we are (episodes, days), and "At the table" itself
    const top = el("div", "pl-top");
    const bands = makeRow("pl-bandsrow", 26);
    bands.lab.textContent = "";
    for (const b of play.bands) {
      const e = el("div", "pl-band");
      e.style.left = `${colX(b.from) - 8}px`;
      e.style.width = `${(b.to - b.from + 1) * g.pitch - d.gap + 16}px`;
      e.append(el("span", "pl-bandlabel", b.label));
      e.title = b.label;
      bands.tr.append(e);
    }
    top.append(bands.r);
    const days = makeRow("pl-daysrow", 18);
    let prevDay;
    for (const c of play.columns) {
      const first = play.byId.get(c.ids[0]);
      const day = first?.day;
      const label = day === null || day === undefined ? (first && first.chapter < 2 ? "Scene 0" : null) : `Day ${day}`;
      if (label && label !== prevDay) { const t = el("span", "pl-day", label); t.style.left = `${colX(c.index)}px`; days.tr.append(t); }
      prevDay = label ?? prevDay;
    }
    top.append(days.r);

    const main = makeRow("pl-mainrow", g.H);
    const later = play.nodes.filter((n) => n.outlineOf).length;
    main.lab.innerHTML = `<b class="pl-title">At the table</b><span class="pl-sub">${snap.scenes.length} scenes${later ? ` · ${later} chapters to come` : ""} · ${play.forks.length} choices</span>`;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "pl-edges");
    svg.setAttribute("width", String(g.trackW));
    svg.setAttribute("height", String(g.H));
    for (const e of play.edges) {
      const A = g.pos.get(e.from), B = g.pos.get(e.to);
      if (!A || !B) continue;
      const x1 = A.x + A.w, y1 = A.y + A.h / 2, x2 = B.x, y2 = B.y + B.h / 2;
      const c = Math.max(16, (x2 - x1) * 0.5);
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", `M${x1},${y1} C${x1 + c},${y1} ${x2 - c},${y2} ${x2},${y2}`);
      if (e.conditional) p.setAttribute("class", "cond");
      p.dataset.edge = "1";
      p.dataset.from = e.from;
      p.dataset.to = e.to;
      svg.append(p);
    }
    main.tr.append(svg);

    // Captions over the columns where the players choose, and a fold for a stack the reader has opened.
    const caps = new Map();
    const addCap = (col, item) => { if (!caps.has(col)) caps.set(col, []); caps.get(col).push(item); };
    for (const f of play.forks) {
      const col = Math.min(...f.to.map((id) => play.byId.get(id)?.col ?? Infinity));
      if (Number.isFinite(col)) addCap(col, { text: f.label });
    }
    for (const sg of play.stackGroups.filter((s) => s.open)) {
      const first = sg.members.map((id) => play.byId.get(id)).filter(Boolean).sort((a, b) => a.order - b.order)[0];
      if (first) addCap(first.col, { fold: sg });
    }
    for (const [col, items] of caps) {
      const cap = el("div", "pl-cap");
      cap.style.left = `${colX(col)}px`;
      cap.style.width = `${d.cardW}px`;
      for (const item of items) {
        if (item.fold) {
          const b = el("button", "pl-fold", `▾ fold ${item.fold.members.length}`);
          b.title = `Fold ${item.fold.title} back into one card`;
          b.addEventListener("click", (ev) => { ev.stopPropagation(); ctx.state.stacks.delete(item.fold.id); ctx.redraw(); });
          cap.append(b);
        } else cap.append(el("span", "pl-fork", item.text));
      }
      main.tr.append(cap);
    }

    // The cards.
    for (const n of play.nodes) {
      const p = g.pos.get(n.id);
      const isStack = Boolean(n.members);
      const card = el("div", ["pl-card", `k-${n.kind}`, `s-${n.state}`, p.chip ? "chip" : "", isStack ? "stack" : "", n.fight ? "fight" : ""].filter(Boolean).join(" "));
      card.style.left = `${p.x}px`;
      card.style.top = `${p.y}px`;
      card.style.width = `${p.w}px`;
      card.style.height = `${p.h}px`;
      card.dataset.id = isStack ? n.id : n.outlineOf ? `chapter:${n.outlineOf}` : `scene:${n.id}`;
      card.dataset.node = n.id;
      const said = [...new Set([...play.edges.filter((e) => e.to === n.id && e.label).map((e) => e.label), ...(n.tag ? [n.tag] : [])])];
      const html = [`<span class="t">${esc(n.title)}</span>`];
      if (n.fight) html.push('<i class="fx" title="A fight">⚔</i>');
      if (isStack) {
        // A pile of choices says only what it is and that it opens.
        html.push(`<span class="m">${esc(metaOf(n))}</span><span class="open">▸ open them</span>`);
      } else if (!p.chip) {
        const meta = metaOf(n);
        if (meta) html.push(`<span class="m">${esc(meta)}</span>`);
        if (said.length) html.push(`<span class="tg">${esc(said.join(" · "))}</span>`);
        if (d.summary && p.h >= 92) html.push(`<span class="sum">${esc(summaryOf(n))}</span>`);
      }
      card.innerHTML = html.join("");
      const needs = play.edges.filter((e) => e.to === n.id).map((e) => play.byId.get(e.from)?.title).filter(Boolean);
      card.title = [n.title, `${KIND_WORD[n.kind]} · ${STATE_WORD[n.state] || n.state}${n.fight ? " · a fight" : ""}`, metaOf(n), said.length ? said.join(" · ") : "", needs.length ? `follows: ${needs.join(", ")}` : ""].filter(Boolean).join("\n");
      const activate = (ev) => { ev.stopPropagation(); if (isStack) { ctx.state.stacks.add(n.id); ctx.redraw(); } else ctx.select(card.dataset.id); };
      card.addEventListener("click", activate);
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activate(ev); } });
      if (at !== null && at !== undefined && orderOf(n) > at) card.classList.add("future");
      if (query && (`${n.title} ${n.id} ${(n.note?.parts || []).join(" ")}`.toLowerCase().includes(query) || (n.members || []).some((m) => m.toLowerCase().includes(query)))) card.classList.add("pl-hit");
      main.tr.append(card);
    }
    top.append(main.r);
    canvas.append(top);

    // ---- the strands, under the band: the notes sit under the scene that tells them. Two ways to read them: by strand (a row each,
    // to follow one strand across the story) or by scene (one row, each column listing what every strand does in its scene, so a
    // column is only as tall as its own notes).
    const fillCell = (wrap, cell, lane, cap) => {
      const several = (play.columns[cell.col]?.ids.length || 0) > 1;
      // While searching, what matches comes first and is never left behind "+ N more".
      const matched = (note) => Boolean(query) && `${note.text} ${note.ref}`.toLowerCase().includes(query);
      if (query) cap = Math.max(cap, cell.groups.reduce((n, grp) => n + grp.notes.filter(matched).length, 0));
      let shown = 0;
      fill: for (const grp of cell.groups) {
        if (several) wrap.append(el("div", "pl-scn", grp.node.title));
        const future = at !== null && at !== undefined && orderOf(grp.node) > at;
        const notes = query ? [...grp.notes].sort((a, b) => Number(matched(b)) - Number(matched(a))) : grp.notes;
        for (const note of notes) {
          if (shown >= cap) break fill;
          wrap.append(noteEl(note, future));
          shown++;
        }
      }
      if (cell.total > shown) {
        const more = el("button", "pl-more", `+ ${cell.total - shown} more`);
        more.title = "Every note under this scene";
        more.setAttribute("aria-label", `${cell.total - shown} more ${lane.title} notes under ${cell.groups.map((x) => x.node.title).join(" and ")}`);
        more.addEventListener("click", (ev) => { ev.stopPropagation(); ctx.select(`cell:${lane.key}:${cell.col}`); });
        wrap.append(more);
      }
    };
    const strands = el("div", "pl-strands");
    if (st.group === "scene") {
      const r = el("div", "pl-r pl-strand pl-combined lane");
      r.dataset.lane = "combined";
      const lab = el("div", "pl-label");
      for (const lane of play.lanes) {
        const key = el("button", "pl-key");
        key.style.setProperty("--c", ctx.colour(lane));
        key.dataset.lane = lane.id;
        key.innerHTML = `<span class="swatch"></span><span class="pl-lname">${esc(lane.title)}</span><span class="pl-count">${lane.count}</span>`;
        key.title = "Open this strand";
        key.setAttribute("aria-label", `${lane.title}: ${lane.count} notes. Open this strand`);
        key.addEventListener("click", () => ctx.select(`strand:${lane.key}`));
        lab.append(key);
      }
      const track = el("div", "pl-track pl-cells");
      track.style.width = `${g.trackW}px`;
      const byCol = new Map();
      for (const lane of play.lanes) for (const cell of cellsByColumn(play, lane)) { if (!byCol.has(cell.col)) byCol.set(cell.col, []); byCol.get(cell.col).push({ lane, cell }); }
      for (const [col, list] of [...byCol].sort((a, b) => a[0] - b[0])) {
        const wrap = el("div", "pl-cell");
        wrap.style.gridColumn = String(col + 1);
        for (const { lane, cell } of list) {
          const part = el("div", "pl-part");
          part.style.setProperty("--c", ctx.colour(lane));
          part.append(el("div", "pl-strandname", lane.title));
          fillCell(part, cell, lane, Math.min(cell.cap, 2));
          wrap.append(part);
        }
        track.append(wrap);
      }
      r.append(lab, track);
      strands.append(r);
    } else {
      for (const lane of play.lanes) {
        const folded = st.folded.has(lane.id);
        const r = el("div", `pl-r pl-strand lane${folded ? " folded" : ""}`);
        r.dataset.lane = lane.id;
        const lab = el("div", "pl-label");
        lab.style.setProperty("--c", ctx.colour(lane));
        lab.innerHTML = `<button class="fold" title="${folded ? "Unfold" : "Fold"} this strand" aria-label="${folded ? "Unfold" : "Fold"} the ${esc(lane.title)} strand" aria-expanded="${!folded}">${folded ? "▸" : "▾"}</button><span class="swatch"></span><button class="pl-lname pl-lbtn" aria-label="${esc(lane.title)}: ${lane.count} notes. Open this strand">${esc(lane.title)}</button><span class="pl-count" title="${lane.count} notes under scenes">${lane.count}</span>`;
        lab.title = "Open this strand";
        lab.addEventListener("click", () => ctx.select(`strand:${lane.key}`));
        lab.querySelector(".fold").addEventListener("click", (ev) => { ev.stopPropagation(); ctx.toggleFold(lane.id); });
        const track = el("div", "pl-track pl-cells");
        track.style.width = `${g.trackW}px`;
        track.style.setProperty("--c", ctx.colour(lane));
        if (!folded) {
          for (const cell of cellsByColumn(play, lane)) {
            const wrap = el("div", "pl-cell");
            wrap.style.gridColumn = String(cell.col + 1);
            fillCell(wrap, cell, lane, cell.cap);
            track.append(wrap);
          }
        }
        r.append(lab, track);
        strands.append(r);
      }
    }
    canvas.append(strands);
    if (query && canvas.querySelector(".pl-hit")) canvas.classList.add("searching");

    function noteEl(note, future) {
      const index = ctx.index();
      const f = note.kind === "fact" || note.kind === "road" ? index.facts.get(note.ref) : null;
      // A beat the plan gives to a whole chapter, not to one scene, says so: it happens somewhere in it.
      const beatWord = BEAT_WORD[note.beatKind] || "▸ happens";
      const label = note.kind === "beat" ? (note.chapterWide ? `in the chapter ${beatWord}` : beatWord) : note.kind === "raised" ? "? a question" : note.kind === "answered" ? "✓ answered" : note.kind === "road" ? (note.core ? "● the core clue" : "○ a clue") : (index.entities.get(f?.entity)?.title || "");
      const text = note.kind === "raised" || note.kind === "answered" ? note.text.replace(/^(Raises|Answers): /, "") : note.text;
      const blank = known && note.kind === "fact" && !known.has(note.ref);
      const e = el("div", `pl-note st-${STATUS_CLASS[note.status] || "pencil"} n-${note.kind}${blank ? " unknown" : ""}${future ? " future" : ""}${note.chapterWide ? " wide" : ""}${ctx.state.flash.has(note.ref) ? " flash" : ""}`);
      e.innerHTML = `<span class="nl">${esc(label)}${note.by ? ` · ${esc(note.by)}` : ""}</span><span class="nt">${blank ? "unknown to the table" : esc(text)}</span>`;
      e.title = `${label ? `${label}\n` : ""}${text}${note.chapterWide ? "\n(a beat of this chapter, not tied to one scene)" : ""}`;
      e.dataset.id = note.kind === "beat" ? `beat:${note.ref}` : note.kind === "raised" || note.kind === "answered" ? `question:${note.ref}` : `fact:${note.ref}`;
      e.dataset.ref = note.ref;
      const go = () => ctx.select(note.kind === "beat" ? `beat:${note.ref}` : note.kind === "raised" || note.kind === "answered" ? `question:${note.ref}` : note.ref);
      e.addEventListener("click", (ev) => { ev.stopPropagation(); go(); });
      e.tabIndex = 0;
      e.setAttribute("role", "button");
      e.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); go(); } });
      if (query && (`${text} ${note.ref}`.toLowerCase().includes(query))) e.classList.add("pl-hit");
      return e;
    }

    scroll.append(canvas);
    scroll.scrollLeft = keep.left;
    scroll.scrollTop = keep.top;
  }

  /** Light up what the selection touches: a scene's own connectors and its neighbours, or a question's clues. */
  function focus(id) {
    const root = document.querySelector(".pl-canvas");
    if (!root || !model) return;
    for (const n of root.querySelectorAll(".pl-on, .pl-near")) n.classList.remove("pl-on", "pl-near");
    if (!id) return;
    const m = /^scene:(.+)$/.exec(id);
    if (m) {
      const node = model.byId.get(model.stackOf.get(m[1]) || m[1]);
      if (!node) return;
      for (const p of root.querySelectorAll("path[data-edge]")) if (p.dataset.from === node.id || p.dataset.to === node.id) p.classList.add("pl-on");
      for (const other of [...node.preds, ...node.succs]) root.querySelector(`.pl-card[data-node="${CSS.escape(other.id)}"]`)?.classList.add("pl-near");
      return;
    }
    const q = /^question:(.+)$/.exec(id);
    if (q) {
      const roads = new Set((ctx.index().questions.get(q[1])?.roads || []).map((r) => r.fact));
      for (const n of root.querySelectorAll(".pl-note")) if (roads.has(n.dataset.ref)) n.classList.add("pl-on");
    }
  }

  /** Scroll to a band of columns (or the start), leaving a little of the column before it in view. */
  function jump(scroll, bandId) {
    if (!model || !geo) return;
    const band = model.bands.find((b) => b.id === bandId);
    scroll.scrollTo({ left: band ? Math.max(0, PAD + band.from * geo.pitch - 24) : 0, behavior: "auto" });
  }

  /** Bring one scene's card into view if it is not already (review mode and search walk the story this way). */
  function reveal(sceneId, scroll) {
    if (!model || !geo) return;
    const node = model.byId.get(model.stackOf.get(sceneId) || sceneId);
    const p = node && geo.pos.get(node.id);
    if (!p) return;
    // The card stands at LABELS + p.x on the canvas; the sticky label column covers the first LABELS pixels of the view.
    const visible = p.x >= scroll.scrollLeft && LABELS + p.x + p.w + 20 <= scroll.scrollLeft + scroll.clientWidth;
    if (visible) return;
    scroll.scrollTo({ left: Math.max(0, p.x + p.w / 2 - (scroll.clientWidth - LABELS) / 2), behavior: "auto" });
  }

  return { draw, focus, jump, reveal, model: () => model, bands: () => (model ? model.bands : []) };
}
