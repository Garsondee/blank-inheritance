/**
 * The blueprint: a sketch of scripts/core/blueprint.mjs.
 *
 * Pure. A plan (rooms in metres, doors, stairs, exits) plus what the party
 * knows (visited, glimpsed, unknown) in, an SVG string out. Rooms the party
 * has not found are not drawn at all for a player: absent, not hidden
 * (doctrine Law 11). The building's outer shape is drawn faintly, because a
 * building's outline is what anyone standing in the street can see.
 */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Fit a plan's metre coordinates into a pixel box with a margin. */
export function fitPlan(plan, width, height, margin = 34) {
  const xs = [];
  const ys = [];
  for (const r of plan.rooms) { xs.push(r.x, r.x + r.w); ys.push(r.y, r.y + r.h); }
  for (const [x, y] of plan.shell ?? []) { xs.push(x); ys.push(y); }
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  const k = Math.min((width - margin * 2) / spanX, (height - margin * 2 - 18) / spanY);
  const ox = (width - spanX * k) / 2 - minX * k;
  const oy = (height - 18 - spanY * k) / 2 - minY * k;
  return { k, X: (x) => ox + x * k, Y: (y) => oy + y * k };
}

/** Which rooms a seat may draw. A player never receives an unknown room. */
export function roomsFor(plan, seat = "player") {
  return plan.rooms.filter((r) => seat === "gm" || r.state !== "unknown");
}

export function blueprintSVG(plan, { width = 520, height = 360, seat = "player" } = {}) {
  const { k, X, Y } = fitPlan(plan, width, height);
  const rooms = roomsFor(plan, seat);
  const known = new Set(rooms.map((r) => r.id));
  const parts = [];

  parts.push(`<rect class="plan-paper" x="0" y="0" width="${width}" height="${height}"/>`);
  for (let gx = 0; gx < width; gx += 16) parts.push(`<line class="plan-grid" x1="${gx}" y1="0" x2="${gx}" y2="${height}"/>`);
  for (let gy = 0; gy < height; gy += 16) parts.push(`<line class="plan-grid" x1="0" y1="${gy}" x2="${width}" y2="${gy}"/>`);

  if (plan.shell?.length) {
    const d = plan.shell.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(" ") + " Z";
    parts.push(`<path class="plan-shell" d="${d}"/>`);
  }

  for (const r of rooms) {
    const cls = r.state === "unknown" ? "is-gm" : r.state === "glimpsed" ? "is-glimpsed" : r.id === plan.current ? "is-current" : "";
    parts.push(`<rect class="plan-room ${cls}" x="${X(r.x).toFixed(1)}" y="${Y(r.y).toFixed(1)}" width="${(r.w * k).toFixed(1)}" height="${(r.h * k).toFixed(1)}"/>`);
  }

  // Doors: only between rooms this seat can see, as a gap in the wall and a swing.
  for (const door of plan.doors ?? []) {
    if (!door.rooms.some((id) => known.has(id))) continue;
    const x = X(door.x);
    const y = Y(door.y);
    const w = door.w * k;
    if (door.axis === "h") {
      parts.push(`<rect class="plan-cut" x="${(x - w / 2).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="${w.toFixed(1)}" height="6"/>`);
      const s = door.swing ?? 1;
      parts.push(`<path class="plan-door" d="M${(x - w / 2).toFixed(1)} ${y.toFixed(1)} L${(x - w / 2).toFixed(1)} ${(y + s * w).toFixed(1)} A${w.toFixed(1)} ${w.toFixed(1)} 0 0 ${s > 0 ? 0 : 1} ${(x + w / 2).toFixed(1)} ${y.toFixed(1)}"/>`);
    } else {
      parts.push(`<rect class="plan-cut" x="${(x - 3).toFixed(1)}" y="${(y - w / 2).toFixed(1)}" width="6" height="${w.toFixed(1)}"/>`);
      const s = door.swing ?? 1;
      parts.push(`<path class="plan-door" d="M${x.toFixed(1)} ${(y - w / 2).toFixed(1)} L${(x + s * w).toFixed(1)} ${(y - w / 2).toFixed(1)} A${w.toFixed(1)} ${w.toFixed(1)} 0 0 ${s > 0 ? 1 : 0} ${x.toFixed(1)} ${(y + w / 2).toFixed(1)}"/>`);
    }
  }

  for (const st of plan.stairs ?? []) {
    if (!known.has(st.room)) continue;
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const yy = Y(st.y + (st.h * i) / n);
      parts.push(`<line class="plan-stair" x1="${X(st.x).toFixed(1)}" y1="${yy.toFixed(1)}" x2="${X(st.x + st.w).toFixed(1)}" y2="${yy.toFixed(1)}"/>`);
    }
  }

  for (const r of rooms) {
    if (r.state === "unknown" && seat !== "gm") continue;
    const label = r.state === "glimpsed" && !r.named ? "?" : r.name;
    const cx = X(r.x + r.w / 2);
    const cy = Y(r.y + r.h / 2) - (r.labelUp ?? 0) * k;
    parts.push(`<text class="plan-label ${r.state === "glimpsed" ? "is-glimpsed" : ""}" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}">${esc(label)}</text>`);
  }

  for (const exit of plan.exits ?? []) {
    parts.push(`<text class="plan-exit" x="${X(exit.x).toFixed(1)}" y="${Y(exit.y).toFixed(1)}" text-anchor="${exit.anchor ?? "middle"}">${esc(exit.label)}</text>`);
  }

  // Tethers: Follow the Expert, drawn from follower to the one they follow.
  for (const t of plan.tethers ?? []) {
    parts.push(`<path class="plan-tether" d="M${X(t.from[0]).toFixed(1)} ${Y(t.from[1]).toFixed(1)} Q${X((t.from[0] + t.to[0]) / 2).toFixed(1)} ${(Y((t.from[1] + t.to[1]) / 2) - 18).toFixed(1)} ${X(t.to[0]).toFixed(1)} ${Y(t.to[1]).toFixed(1)}"/>`);
  }

  for (const group of plan.party ?? []) {
    const room = plan.rooms.find((r) => r.id === group.room);
    if (!room) continue;
    const n = group.members.length;
    group.members.forEach((m, i) => {
      const x = X(room.x + room.w / 2) + (i - (n - 1) / 2) * 21;
      const y = Y(room.y + room.h * (group.at ?? 0.72));
      parts.push(`<circle class="plan-mark" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${esc(m.color)}"/>`);
      parts.push(`<text class="plan-initial" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${esc(m.initial)}</text>`);
    });
    if (group.here) {
      parts.push(`<text class="plan-here" x="${X(room.x + room.w / 2).toFixed(1)}" y="${(Y(room.y + room.h * (group.at ?? 0.72)) + 24).toFixed(1)}" text-anchor="middle">YOU ARE HERE</text>`);
    }
  }

  if (seat === "gm") {
    for (const npc of plan.npcs ?? []) {
      const room = plan.rooms.find((r) => r.id === npc.room);
      if (!room) continue;
      const x = X(room.x + room.w * (npc.at?.[0] ?? 0.5));
      const y = Y(room.y + room.h * (npc.at?.[1] ?? 0.35));
      parts.push(`<path class="plan-npc" d="M${x} ${y - 6} L${x + 6} ${y} L${x} ${y + 6} L${x - 6} ${y} Z"/>`);
    }
  }

  // North arrow, scale bar, title block: an architect's sheet, very small.
  const nx = width - 26;
  parts.push(`<path d="M${nx} 18 L${nx + 6} 34 L${nx} 30 L${nx - 6} 34 Z" fill="rgb(233 226 204 / 85%)"/><text class="plan-sheet" x="${nx}" y="48" text-anchor="middle">N</text>`);
  const bar = 10 * k;
  parts.push(`<line x1="16" y1="${height - 14}" x2="${(16 + bar).toFixed(1)}" y2="${height - 14}" stroke="rgb(233 226 204 / 80%)" stroke-width="2"/><text class="plan-sheet" x="${(20 + bar).toFixed(1)}" y="${height - 10}">10 M</text>`);
  parts.push(`<text class="plan-sheet" x="${width - 12}" y="${height - 10}" text-anchor="end">${esc(plan.sheet ?? "")}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
}
