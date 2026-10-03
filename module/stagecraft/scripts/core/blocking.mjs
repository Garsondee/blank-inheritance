/**
 * Stagecraft: a sketch of scripts/core/stage-blocking.mjs.
 *
 * Pure. Where frames stand, as numbers: a stage grid (columns × three depth
 * rows), formations that fill it with meaning, and the magnets that stop two
 * frames ever overlapping by more than a formation allows. The renderer reads
 * positions; it never decides them.
 *
 * Coordinates are CSS pixels of the stage, x = the frame's centre, `bottom` =
 * where its feet are. Every formation returns the same shape, so a change of
 * formation is one FLIP animation from old positions to new.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ------------------------------------------------------------------ */
/*  The grid                                                            */
/* ------------------------------------------------------------------ */

/** A frame's height from its width: the 2:3 art plus plate, keys and moulding. */
export const npcHeight = (w) => Math.round((w - 12) * 1.5 + 66);
/** Half as tall: a head-and-shoulders crop of the same art, same width. */
export const miniHeight = (w) => Math.round((w - 12) * 0.62 + 62);

/**
 * The stage grid for one screen.
 *
 * Frame width scales with the viewport (9% of its width, clamped) instead of
 * a fixed px value, so a 2560-wide page is not a 1920 layout with gaps. NPCs
 * and PCs share ONE column pitch, which is what makes a dropped frame line up
 * with everyone else.
 */
export function stageGeometry({ width = 2560, height = 1440, deck = 236, headcount = 6 } = {}) {
  const base = clamp(Math.round(width * 0.09), 132, 248);
  const step = headcount <= 6 ? 1 : headcount <= 9 ? 0.88 : headcount <= 12 ? 0.78 : 0.7;
  const frameW = Math.round(base * step);
  const gap = Math.round(clamp(width * 0.011, 14, 30));
  const pitch = frameW + gap;
  const padX = Math.round(width * 0.045);
  const usable = width - padX * 2;
  const count = Math.max(1, Math.floor((usable + gap) / pitch));
  const first = width / 2 - ((count - 1) * pitch) / 2;
  const columns = Array.from({ length: count }, (_, i) => Math.round(first + i * pitch));
  const floor = height - deck - 14;
  const mini = miniHeight(frameW);
  const rows = {
    front: { bottom: floor, scale: 1 },
    mid: { bottom: floor - mini - 22, scale: 1 },
    back: { bottom: floor - mini - 22 - Math.round(frameW * 0.36), scale: 0.84 }
  };
  return { width, height, frameW, gap, pitch, padX, columns, rows, floor, miniH: mini, npcH: npcHeight(frameW) };
}

/** The nearest grid slot to a point: the snap a dropped frame falls into. */
export function nearestSlot(geo, x, bottom, kind = "pc") {
  const rowNames = kind === "pc" ? ["front", "mid"] : ["mid", "back", "front"];
  let best = null;
  for (const row of rowNames) {
    for (let c = 0; c < geo.columns.length; c++) {
      const dx = geo.columns[c] - x;
      const dy = (geo.rows[row].bottom - bottom) * 1.6; // rows are further apart than they look
      const dist = Math.hypot(dx, dy);
      if (!best || dist < best.dist) best = { row, col: c, dist };
    }
  }
  return best;
}

/**
 * Magnets on the grid: put `id` into `slot`. Returns a new occupancy map
 * (id -> {row, col}), never mutating the old one.
 *
 *   - An empty slot simply takes the frame.
 *   - Within the same row it is a reorder, like dragging a tab: everyone
 *     between the old place and the new one shifts one step toward the gap.
 *   - From another row (or from off the grid), the run of frames at the
 *     target is pushed one step toward the nearest free slot in that row.
 *
 * Nobody ever ends up on top of anybody else, and nobody moves further than
 * one place unless they are part of the run being pushed.
 */
export function dropInto(occupancy, id, slot, { columns = 64 } = {}) {
  const next = new Map(occupancy);
  const from = next.get(id);
  next.delete(id);
  const inRow = (row) => [...next].filter(([, s]) => s.row === row);
  const occupantAt = (col) => inRow(slot.row).find(([, s]) => s.col === col)?.[0];

  if (!occupantAt(slot.col)) {
    next.set(id, { ...slot });
    return next;
  }
  if (from && from.row === slot.row) {
    const dir = slot.col > from.col ? -1 : 1;
    for (const [who, s] of inRow(slot.row)) {
      const between = dir < 0 ? s.col > from.col && s.col <= slot.col : s.col >= slot.col && s.col < from.col;
      if (between) next.set(who, { row: s.row, col: s.col + dir });
    }
    next.set(id, { ...slot });
    return next;
  }
  // Push toward the nearer free slot; ties go right.
  const free = (col) => col >= 0 && col < columns && !occupantAt(col);
  let right = slot.col;
  while (right < columns && !free(right)) right++;
  let left = slot.col;
  while (left >= 0 && !free(left)) left--;
  // A full row refuses the drop: the frame springs home, and the crowd rule
  // (stacking) is what makes room, never a frame pushed off the stage.
  if (right >= columns && left < 0) return new Map(occupancy);
  const goRight = right < columns && (left < 0 || right - slot.col <= slot.col - left);
  const dir = goRight ? 1 : -1;
  const end = goRight ? right : left;
  for (const [who, s] of inRow(slot.row)) {
    const inRun = goRight ? s.col >= slot.col && s.col < end : s.col <= slot.col && s.col > end;
    if (inRun) next.set(who, { row: s.row, col: s.col + dir });
  }
  next.set(id, { ...slot });
  return next;
}

/* ------------------------------------------------------------------ */
/*  Formations                                                          */
/* ------------------------------------------------------------------ */

function centred(geo, n, row, { spread = 1 } = {}) {
  const mid = geo.width / 2;
  return Array.from({ length: n }, (_, i) => ({
    x: Math.round(mid + (i - (n - 1) / 2) * geo.pitch * spread),
    bottom: geo.rows[row].bottom,
    scale: geo.rows[row].scale
  }));
}

/** The party along the front, in a shallow arc that faces the middle. */
function partyArc(geo, pcs, { lift = 26, spread = 1 } = {}) {
  const n = pcs.length;
  return centred(geo, n, "front", { spread }).map((p, i) => {
    const u = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0; // -1 .. 1
    return { ...p, id: pcs[i].id, bottom: p.bottom - Math.round(lift * u * u), rot: Math.round(u * 3 * 10) / 10, z: 30 };
  });
}

/**
 * Every formation answers the same question: given who is on stage, where
 * does each frame stand? `npcs` and `pcs` are arrays of {id}.
 */
export function formation(kind, { geo, npcs = [], pcs = [], speakers = [], target = null, groups = null } = {}) {
  switch (kind) {
    case "conversation": return conversation(geo, npcs, pcs, speakers);
    case "gangup": return gangUp(geo, npcs, pcs, target);
    case "panel": return panel(geo, npcs, pcs);
    case "split": return split(geo, npcs, pcs, groups);
    case "line":
    default: return line(geo, npcs, pcs);
  }
}

function line(geo, npcs, pcs) {
  const out = [];
  centred(geo, npcs.length, "mid").forEach((p, i) => out.push({ ...p, id: npcs[i].id, rot: 0, z: 10 }));
  centred(geo, pcs.length, "front").forEach((p, i) => out.push({ ...p, id: pcs[i].id, rot: 0, z: 30 }));
  return out;
}

/**
 * Two people talking, and the party part of it. The speakers stand either
 * side of a gap, turned towards each other; anyone else listening stands a
 * row back; the party's arc faces them from the front.
 */
function conversation(geo, npcs, pcs, speakers) {
  const out = [];
  const [a, b] = speakers.length ? speakers : npcs.slice(0, 2).map((m) => m.id);
  const mid = geo.width / 2;
  const half = geo.pitch * 0.82;
  out.push({ id: a, x: Math.round(mid - half), bottom: geo.rows.mid.bottom, scale: 1.04, rot: 0, rotY: 24, z: 12, speaking: true });
  out.push({ id: b, x: Math.round(mid + half), bottom: geo.rows.mid.bottom, scale: 1.04, rot: 0, rotY: -24, z: 12 });
  const listeners = npcs.filter((m) => m.id !== a && m.id !== b);
  listeners.forEach((m, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const rank = Math.floor(i / 2) + 1;
    out.push({ id: m.id, x: Math.round(mid + side * (half + geo.pitch * (rank + 0.55))), bottom: geo.rows.back.bottom,
      scale: geo.rows.back.scale, rot: 0, rotY: side * -8, z: 5, dim: true });
  });
  return [...out, ...partyArc(geo, pcs, { lift: 34, spread: 1.04 })];
}

/**
 * Ganging up on one person. The target stands front and centre; the others
 * close round them in a tight arc, leaning in, allowed to overlap; anyone not
 * in it is pushed out to the ends of the front row.
 */
function gangUp(geo, npcs, pcs, target) {
  const out = [];
  const mid = geo.width / 2;
  const victim = pcs.find((p) => p.id === target) ?? npcs.find((p) => p.id === target);
  const crowd = npcs.filter((m) => m.id !== target);
  const n = crowd.length;
  const spanDeg = Math.min(160, 70 + n * 26);
  crowd.forEach((m, i) => {
    const u = n > 1 ? i / (n - 1) : 0.5;
    const deg = 180 + (180 - spanDeg) / 2 + u * spanDeg; // an arc over the target
    const rad = (deg * Math.PI) / 180;
    const rx = geo.pitch * (0.6 + n * 0.12);
    // The flanks come lower and closer, wrapping round the target; whoever is
    // straight behind stands tallest, looming over them.
    const depth = Math.abs(Math.cos(rad));
    out.push({
      id: m.id,
      x: Math.round(mid + rx * Math.cos(rad)),
      bottom: Math.round(geo.rows.mid.bottom + depth * 92),
      scale: 0.96 + depth * 0.1,
      rot: Math.round(-Math.cos(rad) * 9 * 10) / 10,
      rotY: Math.round(-Math.cos(rad) * 16),
      z: 10 + Math.round(depth * 10),
      maxOverlap: 0.3
    });
  });
  if (victim) out.push({ id: victim.id, x: Math.round(mid), bottom: geo.rows.front.bottom - 10, scale: 1.08, rot: 0, z: 40, targeted: true, pinned: true });
  const others = pcs.filter((p) => p.id !== target);
  const ends = geo.columns.length;
  others.forEach((p, i) => {
    const left = i < Math.ceil(others.length / 2);
    const k = left ? i : i - Math.ceil(others.length / 2);
    const col = left ? k : ends - 1 - k;
    out.push({ id: p.id, x: geo.columns[col], bottom: geo.rows.front.bottom, scale: 0.94, rot: 0, z: 30, dim: true });
  });
  return out;
}

/** A row of people to answer to: a hearing, a board, the night crew at the counter. */
function panel(geo, npcs, pcs) {
  const n = npcs.length;
  const out = centred(geo, n, "mid", { spread: 1.02 }).map((p, i) => {
    const u = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
    return { ...p, id: npcs[i].id, bottom: p.bottom - Math.round(30 * (1 - u * u)), rot: 0, rotY: Math.round(-u * 10), z: 10 };
  });
  return [...out, ...partyArc(geo, pcs, { lift: 0 })];
}

/** Two groups, two places in one picture: the split party. */
function split(geo, npcs, pcs, groups) {
  const out = [];
  const [left, right] = groups ?? [pcs.slice(0, Math.ceil(pcs.length / 2)), pcs.slice(Math.ceil(pcs.length / 2))];
  const quarter = geo.width / 4;
  [left, right].forEach((members, g) => {
    const cx = g === 0 ? quarter + geo.padX * 0.5 : geo.width - quarter - geo.padX * 0.5;
    members.forEach((m, i) => out.push({ id: m.id, x: Math.round(cx + (i - (members.length - 1) / 2) * geo.pitch), bottom: geo.rows.front.bottom, scale: 1, rot: 0, z: 30 }));
  });
  centred(geo, npcs.length, "mid").forEach((p, i) => out.push({ ...p, id: npcs[i].id, rot: 0, z: 10 }));
  return out;
}

/* ------------------------------------------------------------------ */
/*  Magnets off the grid                                                */
/* ------------------------------------------------------------------ */

/**
 * Free placement still never stacks two frames on top of each other. Frames
 * sharing a row band repel horizontally until no pair overlaps by more than
 * `maxOverlap` of a frame's width (a gang-up allows more than a line does).
 * Deterministic, a few relaxation passes, clamped inside the stage.
 */
export function settle(items, { geo, maxOverlap = 0.06, passes = 16 } = {}) {
  const out = items.map((it) => ({ ...it }));
  const band = (it) => Math.round(it.bottom / 60);
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    out.sort((a, b) => a.x - b.x);
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        if (band(a) !== band(b)) continue;
        const wa = geo.frameW * (a.scale ?? 1);
        const wb = geo.frameW * (b.scale ?? 1);
        const allowed = (wa + wb) / 2 - Math.min(wa, wb) * (a.maxOverlap ?? b.maxOverlap ?? maxOverlap);
        const dist = b.x - a.x;
        if (dist < allowed) {
          const push = (allowed - dist) / 2;
          if (!a.pinned) a.x -= push;
          if (!b.pinned) b.x += push;
          moved = true;
        }
      }
    }
    for (const it of out) it.x = clamp(it.x, geo.padX + geo.frameW / 2, geo.width - geo.padX - geo.frameW / 2);
    if (!moved) break;
  }
  return out.map((it) => ({ ...it, x: Math.round(it.x) }));
}

/** How many frames a row can hold before the crowd rule starts stacking. */
export function capacity(geo) {
  return { front: geo.columns.length, mid: geo.columns.length, back: geo.columns.length - 1 };
}

/**
 * Overflow: when more NPCs are on stage than the rows can show, the ones who
 * have spoken least recently fold into a stack (a fanned deck with a count),
 * which the GM can fan back out with one press. Nobody leaves the stage.
 */
export function crowdRule(npcs, geo, { recent = [] } = {}) {
  const room = capacity(geo).mid + capacity(geo).back;
  if (npcs.length <= room) return { shown: npcs, stacked: [] };
  const rank = (m) => {
    const i = recent.indexOf(m.id);
    return i === -1 ? Infinity : i;
  };
  const ordered = [...npcs].sort((a, b) => rank(a) - rank(b));
  return { shown: ordered.slice(0, room - 1), stacked: ordered.slice(room - 1) };
}
