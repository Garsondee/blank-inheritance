/**
 * The plot timeline's lanes (design/plot-timeline.md §4, D086): a small, fixed set of strands the story is read in, so the
 * rows under "At the table" stay few enough to read. Every thread and every person, place or group belongs to one of them.
 *
 * Where something goes is data, not code: a thread's header says `lane: watcher`, and a world file's head may say `lane: crime`.
 * Only what neither says falls back to the thread that lists the entity, then to its kind. Pure: the page on this PC uses it
 * now, and a Foundry window can later.
 */

/**
 * The strands, in the order they are drawn. `colour` is an index into the page's palette (--l0 to --l11). The play view colours a
 * scene by how heavy it is (red plot, blue downtime, green lighter: --l1, --l8, --l6), so no strand uses those three.
 */
export const LANE_DEFS = Object.freeze([
  { id: "watcher", title: "The Watcher", colour: 0 },
  { id: "cicada", title: "Cicada", colour: 2 },
  { id: "crime", title: "Crime", colour: 5 },
  { id: "city", title: "The city", colour: 3 },
  { id: "directorate", title: "The Directorate", colour: 7 },
  { id: "mitflits", title: "The mitflits", colour: 9 },
  { id: "past", title: "The past", colour: 10 },
]);
/** The strand of the mysteries (questions raised, clues, answers): drawn by the play view, which has no thread of its own to put there. */
export const MYSTERY_LANE = Object.freeze({ id: "mysteries", title: "The mysteries", colour: 4 });
export const LANE_IDS = Object.freeze(new Set(LANE_DEFS.map((d) => d.id)));

/** A thread header that still names an old group (powers, people...) lands somewhere sensible. */
const LEGACY = Object.freeze({ powers: "watcher", people: "cicada", institutions: "directorate", others: "mitflits", "the party": "play" });

/** "play" is the party's own row, "At the table": a thread that is the party (Section Nine) has no lane of its own. */
const isLane = (key) => key === "play" || LANE_IDS.has(key);

/** The lane key of a thread: its header's `lane:`, or its old group, or "city". */
export function laneKeyOfThread(thread) {
  const l = thread?.lane;
  if (isLane(l)) return l;
  return LEGACY[l] || "city";
}

/** What a kind of entity is, when nothing says where it belongs. */
const BY_KIND = Object.freeze({ person: "city", place: "city", group: "city", thing: "past", event: "past", concept: "past" });

/** The lane key of an entity: its own `lane:`, else the first thread (by order) that lists it, else by kind. */
export function laneKeyOfEntity(snap, entity) {
  if (!entity) return "city";
  if (isLane(entity.lane)) return entity.lane;
  const threads = [...(snap.threads || [])].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const t = threads.find((x) => (x.entities || []).includes(entity.id));
  if (t) return laneKeyOfThread(t);
  return BY_KIND[entity.kind] || "city";
}

/** The page's lane id for a key: "play" stays "play", the rest are "lane:<key>". */
export const laneId = (key) => (key === "play" ? "play" : `lane:${key}`);
