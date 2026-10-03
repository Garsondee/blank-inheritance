/**
 * A scene's stage description: the painting, the rig that turns it into a stage, its lights, set pieces, zones, marks
 * and chalk policy. Pure. This is the authored half of a stage; who is standing on it is the published half.
 *
 * Everything positional is in fractions of the painting (0 to 1 across and down), so a description is the same at any
 * screen size and in any renderer. `describeScene` never throws: it returns what it understood and a list of
 * problems, so a half-written scene can still be drawn and the author can be told what is wrong.
 */

export const SCENE_VERSION = 1;

export const CHALK_MODES = Object.freeze(["off", "zones", "anywhere"]);

/** Zone kinds the module itself knows. Any other kind is a trigger (stage.md §8.9). */
export const ZONE_KINDS = Object.freeze(["door", "spot", "area", "exit", "track", "chalk", "podium", "photo", "quiet", "music", "shelter", "shot", "trigger"]);

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isFraction = (v, lo = -0.25, hi = 1.25) => isNum(v) && v >= lo && v <= hi;
const isPoint = (p) => Array.isArray(p) && p.length === 2 && isFraction(p[0]) && isFraction(p[1]);
const num = (v, d) => (isNum(v) ? v : d);
const str = (v, d = "") => (typeof v === "string" ? v : d);

function points(list, where, problems, min = 0) {
  if (!Array.isArray(list)) { problems.push(`${where}: expected a list of [x, y] points`); return []; }
  const out = [];
  list.forEach((p, i) => (isPoint(p) ? out.push([p[0], p[1]]) : problems.push(`${where}[${i}]: not a point on the painting`)));
  if (out.length < min) problems.push(`${where}: needs at least ${min} points`);
  return out;
}

function unique(items, where, problems) {
  const seen = new Set();
  return items.filter((it) => {
    if (!it.id) { problems.push(`${where}: an entry has no id`); return false; }
    if (seen.has(it.id)) { problems.push(`${where}: id "${it.id}" is used twice`); return false; }
    seen.add(it.id);
    return true;
  });
}

/**
 * Understand a stage description. Returns { ok, scene, problems }: `scene` is always usable when the painting and the
 * rig are present, and `ok` is true only when there is nothing to report.
 */
export function describeScene(raw) {
  const problems = [];
  const r = raw && typeof raw === "object" ? raw : {};
  if (!raw || typeof raw !== "object") problems.push("the scene carries no stage description");

  const painting = {
    src: str(r.painting?.src),
    size: Array.isArray(r.painting?.size) && r.painting.size.length === 2 && r.painting.size.every((n) => isNum(n) && n > 0) ? [r.painting.size[0], r.painting.size[1]] : null
  };
  if (!painting.src) problems.push("painting.src: the stage needs a painting");
  if (!painting.size) problems.push("painting.size: give the painting's size in pixels, [width, height]");

  const rig = {
    horizon: num(r.rig?.horizon, null),
    floorFront: num(r.rig?.floorFront, null),
    depth: num(r.rig?.depth, null),
    vanish: num(r.rig?.vanish, 0.5),
    lift: num(r.rig?.lift, 0)
  };
  for (const k of ["horizon", "floorFront", "depth"]) if (rig[k] === null) problems.push(`rig.${k}: the rig needs a number here`);
  if (rig.horizon !== null && rig.floorFront !== null && rig.floorFront <= rig.horizon) problems.push("rig: the floor must meet the front of the picture below the horizon");
  if (rig.depth !== null && rig.depth <= 0) problems.push("rig.depth: must be above zero");

  const lights = (Array.isArray(r.lights) ? r.lights : []).flatMap((l, i) => {
    if (!isPoint(l?.at)) { problems.push(`lights[${i}].at: not a point on the painting`); return []; }
    const colour = Array.isArray(l.colour) && l.colour.length === 3 && l.colour.every(isNum) ? l.colour.map((c) => Math.max(0, Math.min(255, c))) : [255, 172, 96];
    return [{
      id: str(l.id, `light-${i + 1}`), at: [l.at[0], l.at[1]], below: num(l.below, 0.9), colour,
      intensity: Math.max(0, num(l.intensity, 1)), flicker: Math.max(0, Math.min(0.5, num(l.flicker, 0.05))), flickerHz: Math.max(0.5, num(l.flickerHz, 7)),
      pool: isNum(l.pool) && l.pool > 0 ? l.pool : 0, shadow: l.shadow === true
    }];
  });

  const occluders = (Array.isArray(r.occluders) ? r.occluders : []).flatMap((o, i) => {
    const poly = points(o?.poly, `occluders[${i}].poly`, problems, 3);
    if (poly.length < 3) return [];
    // a card standing behind a cut-out is raised, as on a box behind a bar, until no more than `hideAtMost` of it is hidden;
    // `riser: false` lets the cut-out hide whoever is behind it entirely (a wall, a curtain)
    return [{ id: str(o.id, `occluder-${i + 1}`), poly, base: num(o.base, 0.86), x: num(o.x, 0.5), riser: o.riser !== false, hideAtMost: Math.max(0.1, Math.min(1, num(o.hideAtMost, 0.45))) }];
  });

  const zonesRaw = (Array.isArray(r.zones) ? r.zones : []).flatMap((z, i) => {
    const shape = points(z?.shape, `zones[${i}].shape`, problems, 3);
    if (shape.length < 3) return [];
    // A door, a window or an exit is drawn on the wall, but a card acts on it from the floor in front: `floor` is that strip.
    const floor = z.floor === undefined ? null : points(z.floor, `zones[${i}].floor`, problems, 3);
    // a fight position's rules as SF2E has them (cover, difficult terrain...), shown on the fight board; which positions are
    // next to it (one Stride); and a colour for its wash on the board ([r, g, b])
    const tags = Array.isArray(z.tags) ? z.tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim()) : [];
    const near = Array.isArray(z.near) ? z.near.filter((id) => typeof id === "string") : [];
    const colour = Array.isArray(z.colour) && z.colour.length === 3 && z.colour.every(isNum) ? z.colour.map((c) => Math.max(0, Math.min(255, c))) : null;
    return [{ id: str(z.id), kind: str(z.kind, "trigger") || "trigger", name: str(z.name), hint: str(z.hint), shape, floor: floor && floor.length >= 3 ? floor : null, quiet: z.quiet === true, gate: ["open", "ask", "locked", "hidden"].includes(z.gate) ? z.gate : "open", to: str(z.to), tags, near, colour }];
  });
  const zones = unique(zonesRaw, "zones", problems);
  for (const z of zones) for (const other of z.near) if (!zones.some((q) => q.id === other)) problems.push(`zones: "${z.id}" is near "${other}", which is not in this scene`);

  const marksRaw = (Array.isArray(r.marks) ? r.marks : []).flatMap((m, i) => {
    if (!isPoint(m?.at)) { problems.push(`marks[${i}].at: not a point on the painting`); return []; }
    const faces = m.faces && typeof m.faces === "object" ? (isPoint(m.faces.point) ? { point: [m.faces.point[0], m.faces.point[1]] } : str(m.faces.zone) ? { zone: str(m.faces.zone) } : str(m.faces.card) ? { card: str(m.faces.card) } : null) : null;
    return [{
      id: str(m.id), at: [m.at[0], m.at[1]], yaw: num(m.yaw, 0), lean: num(m.lean, 0), pitch: num(m.pitch, 0), lift: Math.max(0, num(m.lift, 0)),
      capacity: Math.max(1, Math.round(num(m.capacity, 1))), label: str(m.label), group: str(m.group), zone: str(m.zone), faces
    }];
  });
  const marks = unique(marksRaw, "marks", problems);
  for (const m of marks) if (m.zone && !zones.some((z) => z.id === m.zone)) problems.push(`marks: "${m.id}" belongs to zone "${m.zone}", which is not in this scene`);
  for (const m of marks) if (m.faces?.zone && !zones.some((z) => z.id === m.faces.zone)) problems.push(`marks: "${m.id}" faces zone "${m.faces.zone}", which is not in this scene`);

  const chalkMode = CHALK_MODES.includes(r.chalk?.mode) ? r.chalk.mode : "off";
  if (r.chalk?.mode !== undefined && !CHALK_MODES.includes(r.chalk.mode)) problems.push(`chalk.mode: "${r.chalk.mode}" is not one of ${CHALK_MODES.join(", ")}`);
  const chalk = { mode: chalkMode, lock: r.chalk?.lock === true, weather: r.chalk?.weather === true, box: isPoint(r.chalk?.box) ? [r.chalk.box[0], r.chalk.box[1]] : null };
  if (chalk.mode === "zones" && !zones.some((z) => z.kind === "chalk")) problems.push("chalk: the mode is zones but the scene has no zone of kind chalk");

  const scene = {
    version: SCENE_VERSION,
    painting, rig,
    skin: str(r.skin),
    cardScale: Math.max(0.2, Math.min(2, num(r.cardScale, 0.7))),
    ambient: Math.max(0, num(r.ambient, 1.7)),
    lights, occluders, zones, marks, chalk,
    marksOnly: r.marksOnly === true,
    footlights: r.footlights === true,
    // where the GM's formations gather people when nobody points somewhere else: the counter, the middle of the room
    focus: isPoint(r.focus) ? [r.focus[0], r.focus[1]] : null,
    // whether the scene opens with the fight board up (zones drawn plainly, with who is in each)
    board: r.board === true,
    reach: { snap: Math.max(40, num(r.reach?.snap, 170)), show: Math.max(200, num(r.reach?.show, 700)) }
  };
  const usable = !!(painting.src && painting.size && rig.horizon !== null && rig.floorFront !== null && rig.depth !== null);
  return { ok: problems.length === 0, usable, scene, problems };
}
