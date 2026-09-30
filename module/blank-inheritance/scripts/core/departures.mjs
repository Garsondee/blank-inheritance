/**
 * Departures -- the pure half of "where does the party go next"
 * (design/world-map-destinations.md).
 *
 * Every move between scenes is a departure, and The City is where departures
 * happen. Some are the story's to decide (sent, muster), some the players'
 * (together, free, arrive). This file owns the arithmetic: which destinations
 * are open to whom, what a pick does, who is ready, how picks become groups,
 * the order the GM runs the groups in, and what one viewer may see of another
 * player's choice. No Foundry, no DOM, no storage -- foundry/city-state.mjs
 * decides where any of this lives.
 *
 * Ingram, 2026-09-28, on the decisions this encodes: players see each other's
 * picks as they arrive, except private ones; the GM waits for everyone before
 * Go; picks lock at Go but the Scene Runner can still move a player; and a
 * private choice leaves no trace at all for anybody else ("use some common
 * sense"), so a private pick never reaches the shared record.
 */

/** Who decides, and whether the party may split. */
export const KINDS = Object.freeze(["sent", "together", "free", "muster", "arrive"]);

/** The kinds a player picks in. Sent and muster are the story's call. */
export const CHOOSING_KINDS = Object.freeze(["together", "free", "arrive"]);

/** The kinds that bring everyone to one place. */
export const GATHERING_KINDS = Object.freeze(["sent", "muster"]);

export const STATUS = Object.freeze({ OPEN: "open", HELD: "held", GONE: "gone" });

/** The City's live record when nothing has happened yet: no pawns, no departure, no groups. */
export const emptyCityState = () => ({ version: 1, pawns: {}, departure: null, assignment: {}, groups: [], queue: [], currentKey: null, lastAssignment: {} });

/**
 * How someone arrives in the city (kind "arrive"): picked for its icon,
 * never for its route. `teleport` is deliberately unexplained -- magical or
 * technological, the player's own colour, never a mechanism this campaign
 * commits to -- it lands them somewhere real near the entrance and the walk
 * in is ordinary from there (Ingram, 2026-09-28).
 */
export const ARRIVAL_MODES = Object.freeze(["train", "ferry", "bus", "road", "tram", "bicycle", "foot", "teleport"]);

/** A player seen doing something in the last minute and a half is still choosing, not stuck. */
export const BROWSING_WINDOW_MS = 90_000;

const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const ids = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === "string" && v) : []);

/**
 * One authored destination, made safe to use. Unknown fields are dropped here
 * rather than carried along, so a typo in authored JSON cannot quietly become
 * a behaviour.
 */
export function normalizeDestination(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const id = text(raw.id) ?? `destination-${index + 1}`;
  const roomFor = Number.isInteger(raw.roomFor) && raw.roomFor > 0 ? raw.roomFor : null;
  return {
    id,
    label: text(raw.label) ?? id,
    blurb: text(raw.blurb),
    placeRef: text(raw.placeRef),
    briefRef: text(raw.briefRef),
    image: text(raw.image),
    mystery: raw.mystery === true,
    mustGo: raw.mustGo === true,
    costsSlice: raw.costsSlice === true,
    roomFor,
    pickedIn: ids(raw.pickedIn),
    private: raw.private === true,
    mode: ARRIVAL_MODES.includes(raw.mode) ? raw.mode : null,
    needs: text(raw.needs)
  };
}

/**
 * An authored departure (a scene brief's `outro.departure`), made safe.
 *
 * No departure at all means "sent to whatever comes next in the episode", the
 * behaviour every scene had before this existed, so nothing already written
 * changes. A muster may be written as just a place and a scene; it becomes a
 * one-destination departure here so everything downstream has one shape.
 */
export function normalizeDeparture(raw, { sourceBriefId = null, nextBriefRef = null } = {}) {
  if (!raw || typeof raw !== "object") {
    return {
      kind: "sent",
      sourceBriefId,
      question: null,
      destinations: nextBriefRef ? [normalizeDestination({ id: "next", briefRef: nextBriefRef, label: nextBriefRef })] : [],
      then: null
    };
  }
  const kind = KINDS.includes(raw.kind) ? raw.kind : "sent";
  let destinations = (Array.isArray(raw.destinations) ? raw.destinations : [])
    .map((d, i) => normalizeDestination(d, i))
    .filter(Boolean);
  if (GATHERING_KINDS.includes(kind) && destinations.length === 0 && (raw.placeRef || raw.briefRef)) {
    destinations = [normalizeDestination({ id: kind, label: raw.label, placeRef: raw.placeRef, briefRef: raw.briefRef ?? nextBriefRef, mustGo: kind === "muster" })];
  }
  const then = raw.then && typeof raw.then === "object"
    ? {
        kind: raw.then.kind === "sent" ? "sent" : "muster",
        placeRef: text(raw.then.placeRef),
        briefRef: text(raw.then.briefRef),
        question: text(raw.then.question),
        label: text(raw.then.label)
      }
    : null;
  return { kind, sourceBriefId, question: text(raw.question), destinations, then };
}

/** The departure a `then` block turns into once every group has been run. */
export function departureFromThen(then, { sourceBriefId = null } = {}) {
  if (!then) return null;
  return normalizeDeparture(
    { kind: then.kind, question: then.question, placeRef: then.placeRef, briefRef: then.briefRef, label: then.label },
    { sourceBriefId }
  );
}

/** A departure as it stands at the table: open for picks, with nobody decided yet. */
export function openDeparture(departure, { id, openedAt }) {
  return {
    id,
    kind: departure.kind,
    sourceBriefId: departure.sourceBriefId ?? null,
    question: departure.question ?? null,
    destinations: departure.destinations,
    then: departure.then ?? null,
    status: STATUS.OPEN,
    openedAt,
    // Public picks only. A private pick is kept by the GM, never here: this
    // record is a world setting every client can read (Law 11: removal, not
    // hiding).
    picks: {},
    // Who has made a private pick, so the GM (and the readiness row) know
    // they are done. It says nothing about where.
    ready: {}
  };
}

export const isChoosing = (live) => Boolean(live) && CHOOSING_KINDS.includes(live.kind);

/** Whether one player may pick one destination: the authored gate, never the head-count. */
export function eligible(destination, { userId, lastAssignment = {} } = {}) {
  if (!destination) return false;
  if (destination.pickedIn.length > 0) return destination.pickedIn.includes(lastAssignment[userId]);
  return true;
}

/** How many have already picked a destination, not counting one player (so re-clicking your own pick is never "full"). */
export function takers(live, destinationId, { exceptUserId = null, privatePicks = {} } = {}) {
  let count = 0;
  for (const [userId, pick] of Object.entries(live?.picks ?? {})) if (pick === destinationId && userId !== exceptUserId) count++;
  for (const [userId, pick] of Object.entries(privatePicks)) if (pick === destinationId && userId !== exceptUserId) count++;
  return count;
}

/**
 * One pick, decided. Returns the next public record, plus a `privatePick` when
 * the destination is private (the caller keeps that out of the shared record).
 * `destinationId` null takes a pick back.
 *
 * Refusals come back with a reason a player can read, never silently: a card
 * that says "full" is a decision, a click that does nothing is a bug.
 */
export function applyPick(live, { userId, destinationId, isGM = false, lastAssignment = {}, privatePicks = {} } = {}) {
  if (!live || !isChoosing(live)) return { ok: false, reason: "nothing-to-pick" };
  if (live.status === STATUS.GONE) return { ok: false, reason: "gone" };
  if (live.status === STATUS.HELD && !isGM) return { ok: false, reason: "held" };
  if (!userId) return { ok: false, reason: "no-user" };

  const next = { ...live, picks: { ...live.picks }, ready: { ...live.ready } };
  delete next.picks[userId];
  delete next.ready[userId];
  if (destinationId == null) return { ok: true, live: next, privatePick: { userId, destinationId: null } };

  const destination = live.destinations.find((d) => d.id === destinationId);
  if (!destination) return { ok: false, reason: "unknown-destination" };
  if (!isGM && !eligible(destination, { userId, lastAssignment })) return { ok: false, reason: "not-eligible" };
  if (!isGM && destination.roomFor && takers(live, destinationId, { exceptUserId: userId, privatePicks }) >= destination.roomFor) {
    return { ok: false, reason: "full" };
  }
  if (destination.private) {
    next.ready[userId] = true;
    return { ok: true, live: next, privatePick: { userId, destinationId } };
  }
  next.picks[userId] = destinationId;
  return { ok: true, live: next, privatePick: { userId, destinationId: null } };
}

/**
 * Where every player is in the choosing task, one row each -- Ingram: "so that
 * we can see which player is struggling, not just how many haven't done it
 * yet." A row says who, what they picked (if the viewer may know), and for
 * anyone undecided whether they are looking or have not started, and for how
 * long the question has been waiting on them.
 *
 * `activity` is the in-memory map of when each player last touched a card or
 * the dialogue; `now` and `openedAt` are ISO strings or epoch milliseconds.
 */
export function readiness(live, { roster = [], activity = {}, now = Date.now(), viewerId = null, isGM = false, privatePicks = {} } = {}) {
  const ms = (value) => (typeof value === "number" ? value : Date.parse(value ?? "") || 0);
  const nowMs = ms(now);
  const openedMs = ms(live?.openedAt);
  const rows = roster.map((member) => {
    const publicPick = live?.picks?.[member.userId] ?? null;
    const privateVisible = isGM || member.userId === viewerId ? privatePicks[member.userId] ?? null : null;
    const destinationId = publicPick ?? privateVisible;
    const lastSeen = ms(activity[member.userId]);
    let status;
    if (destinationId) status = "picked";
    else if (live?.ready?.[member.userId]) status = "ready";
    else if (!member.active) status = "away";
    else if (lastSeen && nowMs - lastSeen <= BROWSING_WINDOW_MS) status = "browsing";
    else status = "waiting";
    return {
      userId: member.userId,
      name: member.name ?? null,
      characterName: member.characterName ?? null,
      color: member.color ?? null,
      img: member.img ?? null,
      active: member.active !== false,
      status,
      done: status === "picked" || status === "ready",
      destinationId,
      waitingMs: status === "picked" || status === "ready" || live?.openedAt == null ? 0 : Math.max(0, nowMs - openedMs)
    };
  });
  const done = rows.filter((r) => r.done).length;
  return { rows, done, total: rows.length, complete: rows.length > 0 && done === rows.length };
}

/**
 * What one viewer's client may hold of the live record. A private destination
 * only exists for players it is open to; everybody else's client never
 * receives it. Public picks pass through; the viewer's own private pick is
 * folded back in for them alone.
 */
export function projectForViewer(live, { userId, isGM = false, lastAssignment = {}, privatePicks = {} } = {}) {
  if (!live) return null;
  const destinations = live.destinations.filter((d) => isGM || !d.private || eligible(d, { userId, lastAssignment }));
  const visible = new Set(destinations.map((d) => d.id));
  const picks = Object.fromEntries(Object.entries(live.picks ?? {}).filter(([, pick]) => visible.has(pick)));
  const mine = privatePicks[userId];
  if (mine && visible.has(mine)) picks[userId] = mine;
  if (isGM) for (const [uid, pick] of Object.entries(privatePicks)) if (pick) picks[uid] = pick;
  return { ...live, destinations, picks };
}

/**
 * Picks become groups at Go. Everyone who picked the same destination is one
 * group, and one group is one scene.
 *
 * - A must-go destination takes everyone it is open to, whatever they picked
 *   (the override is shown, never silent: the readiness row still says what
 *   they had picked).
 * - Together: one destination for all -- the GM's `choice`, or the most-picked.
 * - Anyone undecided goes with the largest group; with no picks at all, the
 *   first open destination.
 */
export function formGroups(live, { roster = [], privatePicks = {}, lastAssignment = {}, choice = null } = {}) {
  const destinations = live?.destinations ?? [];
  const userIds = roster.map((m) => m.userId);
  const assignment = {};
  if (destinations.length === 0) return { assignment, groups: [] };

  const counts = new Map(destinations.map((d) => [d.id, 0]));
  const pickOf = (uid) => live.picks?.[uid] ?? privatePicks[uid] ?? null;
  for (const uid of userIds) {
    const p = pickOf(uid);
    if (counts.has(p)) counts.set(p, counts.get(p) + 1);
  }
  const mostPicked = () => {
    let best = null;
    for (const d of destinations) if (!d.private && (best === null || counts.get(d.id) > counts.get(best.id))) best = d;
    return (best ?? destinations[0]).id;
  };

  if (live.kind === "together" || GATHERING_KINDS.includes(live.kind)) {
    const target = destinations.some((d) => d.id === choice) ? choice : live.kind === "together" ? mostPicked() : destinations[0].id;
    for (const uid of userIds) assignment[uid] = target;
  } else {
    const fallback = mostPicked();
    for (const uid of userIds) {
      const must = destinations.find((d) => d.mustGo && eligible(d, { userId: uid, lastAssignment }));
      const pick = pickOf(uid);
      assignment[uid] = must ? must.id : counts.has(pick) ? pick : fallback;
    }
  }
  return { assignment, groups: groupsFor(assignment, destinations) };
}

/** Assignment → groups, in the destinations' own authored order. */
export function groupsFor(assignment, destinations) {
  const groups = [];
  for (const d of destinations) {
    const members = Object.entries(assignment).filter(([, id]) => id === d.id).map(([uid]) => uid);
    if (members.length > 0) groups.push({ destinationId: d.id, briefRef: d.briefRef, placeRef: d.placeRef, userIds: members });
  }
  return groups;
}

/**
 * The order the GM runs the groups in: must-go first, then anything only some
 * players could go to (personal business), then everything else, in authored
 * order (design/ux-doctrine.md §3). Groups that share a scene -- every
 * destination of a rotation scene like The Long Afternoon -- are one entry,
 * because they are one scene.
 *
 * A destination nobody went to never appears, which is the whole of "if
 * everyone goes to one, skip the other".
 */
export function resolutionQueue(groups, destinations) {
  const byId = new Map(destinations.map((d) => [d.id, d]));
  const rank = (g) => {
    const d = byId.get(g.destinationId);
    if (d?.mustGo) return 0;
    if (d?.private || d?.pickedIn?.length) return 1;
    return 2;
  };
  const order = new Map(destinations.map((d, i) => [d.id, i]));
  const sorted = [...groups].sort((a, b) => rank(a) - rank(b) || order.get(a.destinationId) - order.get(b.destinationId));
  const entries = [];
  for (const g of sorted) {
    const key = g.briefRef ?? `place:${g.placeRef ?? g.destinationId}`;
    let entry = entries.find((e) => e.key === key);
    if (!entry) {
      entry = { key, briefRef: g.briefRef ?? null, destinationIds: [], userIds: [], done: false };
      entries.push(entry);
    }
    entry.destinationIds.push(g.destinationId);
    entry.userIds.push(...g.userIds);
  }
  return entries;
}

/**
 * Move one player after Go -- the Scene Runner's "change their choice" for a
 * player who changes their mind, or a scene that calls for it. Entries already
 * run stay run; the rest are rebuilt from the new assignment.
 */
export function reassign(state, { userId, destinationId }) {
  const destinations = state?.departure?.destinations ?? [];
  if (!destinations.some((d) => d.id === destinationId)) return { ok: false, reason: "unknown-destination" };
  const assignment = { ...(state.assignment ?? {}), [userId]: destinationId };
  const groups = groupsFor(assignment, destinations);
  const done = new Set((state.queue ?? []).filter((e) => e.done).map((e) => e.key));
  const queue = resolutionQueue(groups, destinations).map((e) => ({ ...e, done: done.has(e.key) }));
  return { ok: true, state: { ...state, assignment, groups, queue } };
}

/** The next entry still to run, or null when the queue is empty. */
export const nextInQueue = (queue = []) => queue.find((e) => !e.done) ?? null;

/** Mark one entry run. */
export function markRun(queue = [], key) {
  return queue.map((e) => (e.key === key ? { ...e, done: true } : e));
}

/**
 * How a destination's marker looks to one viewer: who is heading there (as far
 * as the viewer may know), whether it is theirs, full, closed to them, or a
 * must. Every state that stops a player carries its reason in words.
 */
export function markerState(destination, { live, viewerId, isGM = false, lastAssignment = {}, privatePicks = {} } = {}) {
  const projected = projectForViewer(live, { userId: viewerId, isGM, lastAssignment, privatePicks });
  const pickers = Object.entries(projected?.picks ?? {}).filter(([, id]) => id === destination.id).map(([uid]) => uid);
  const mine = pickers.includes(viewerId);
  const count = takers(live, destination.id, { exceptUserId: viewerId, privatePicks: isGM ? privatePicks : {} });
  const full = Boolean(destination.roomFor) && count >= destination.roomFor && !mine;
  const closed = !isGM && !eligible(destination, { userId: viewerId, lastAssignment });
  return {
    pickers,
    mine,
    full,
    closed,
    reason: closed ? "not-for-you" : full ? "full" : destination.needs ? "needs" : null,
    must: destination.mustGo
  };
}

/**
 * A dashed line from `from` to `to`, as the dash segments to draw. `offset`
 * slides the pattern along the line, which is how the dashes march toward the
 * destination (the caller advances it every frame). Lengths are in whatever
 * space the points are in; the caller scales them for zoom.
 */
export function dashSegments(from, to, { dash = 14, gap = 10, offset = 0 } = {}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const period = dash + gap;
  if (!(length > 0) || !(dash > 0) || !(period > 0)) return [];
  const ux = dx / length;
  const uy = dy / length;
  const segments = [];
  let start = -(((offset % period) + period) % period);
  for (; start < length; start += period) {
    const a = Math.max(0, start);
    const b = Math.min(length, start + dash);
    if (b > a) segments.push({ x1: from.x + ux * a, y1: from.y + uy * a, x2: from.x + ux * b, y2: from.y + uy * b });
  }
  return segments;
}

/**
 * The picture a destination shows. Players come to recognise places by their
 * thumbnails as much as by their names (Ingram), so every destination gets one
 * when the scene set has any art for the place:
 * 1. the destination's own `image`;
 * 2. a scene set entry sitting at the same place (a scene's own art is the
 *    best picture of a place there is);
 * 3. the art of the scene the destination leads to;
 * 4. none -- the marker falls back to its emblem.
 *
 * Returns the small thumbnail path (`<artRoot>/thumbs/<art>.webp`), which
 * tools/scene-thumbs builds from the full art.
 */
export function thumbnailFor(destination, { scenes = [], artRoot = "" } = {}) {
  if (destination?.image) return destination.image;
  const thumb = (art) => `${artRoot}/thumbs/${art}.webp`;
  const rank = { beat: 0, landing: 1, sub: 2 };
  const atPlace = scenes
    .filter((s) => s.art && destination?.placeRef && s.locationRef === destination.placeRef)
    .sort((a, b) => (rank[a.kind] ?? 3) - (rank[b.kind] ?? 3));
  if (atPlace.length) return thumb(atPlace[0].art);
  const forBrief = scenes.filter((s) => s.art && destination?.briefRef && s.briefRef === destination.briefRef).sort((a, b) => (rank[a.kind] ?? 3) - (rank[b.kind] ?? 3));
  if (forBrief.length) return thumb(forBrief[0].art);
  return null;
}

/**
 * Where each pawn stands at one place, so six people at the gate are six
 * visible tokens rather than one stack: a small ring around the point, in
 * roster order, sized for the token.
 */
export function formation(point, count, { spacing = 60 } = {}) {
  if (count <= 1) return [{ x: point.x, y: point.y }];
  const radius = Math.max(spacing, (spacing * count) / (2 * Math.PI));
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: Math.round(point.x + radius * Math.cos(angle)), y: Math.round(point.y + radius * Math.sin(angle)) };
  });
}

/**
 * Markers that would sit on top of each other at this zoom: how far to lift
 * each one up its own stem so none of them overlap, while every foot stays on
 * its place. Works in screen pixels, where markers have one fixed size.
 *
 * `items`: [{ id, x, y, w, h }] -- x/y the foot, w/h the medal-and-plate box
 * that sits `base` pixels above it. Bottom markers are placed first and keep
 * short stems; a crowded one climbs in `step`s, never past `max` (past that,
 * overlapping is the lesser evil than a stem across half the screen).
 * Returns { [id]: lift }.
 */
export function declutter(items, { base = 28, step = 10, max = 260, pad = 6 } = {}) {
  const placed = [];
  const lifts = {};
  const order = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const hits = (box) =>
    placed.some((p) => box.left < p.right + pad && box.right > p.left - pad && box.top < p.bottom + pad && box.bottom > p.top - pad);
  for (const item of order) {
    const boxAt = (lift) => {
      const bottom = item.y - base - lift;
      return { left: item.x - item.w / 2, right: item.x + item.w / 2, top: bottom - item.h, bottom };
    };
    let lift = 0;
    while (lift < max && hits(boxAt(lift))) lift += step;
    placed.push(boxAt(lift));
    lifts[item.id] = lift;
  }
  return lifts;
}
