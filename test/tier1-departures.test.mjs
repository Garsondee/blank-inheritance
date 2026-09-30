// Tier 1 -- core/departures.mjs, the pure half of the world map destination system
// (design/world-map-destinations.md). Ingram, 2026-09-28: "sometimes players will get to choose where to go next
// and sometimes they won't be given a choice, sometimes players will be allowed to split off from the main group
// and sometimes the players will be forced to recombine into a group."

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  applyPick,
  dashSegments,
  departureFromThen,
  eligible,
  formGroups,
  formation,
  markRun,
  markerState,
  nextInQueue,
  normalizeDeparture,
  openDeparture,
  projectForViewer,
  readiness,
  reassign,
  resolutionQueue,
  thumbnailFor
} from "../module/blank-inheritance/scripts/core/departures.mjs";

const roster = [
  { userId: "a", name: "Liam", active: true },
  { userId: "b", name: "Pippa", active: true },
  { userId: "c", name: "Craig", active: true },
  { userId: "d", name: "Steve", active: false }
];

function nightOff() {
  return openDeparture(
    normalizeDeparture(
      {
        kind: "free",
        question: "What does everyone do with the evening?",
        destinations: [
          { id: "stay-in", label: "Stay in", placeRef: "main-mech-hangar", briefRef: "night" },
          { id: "go-out", label: "Over the wire", placeRef: "old-landing", briefRef: "night" }
        ],
        then: { kind: "muster", placeRef: "long-hall", briefRef: "breakfast" }
      },
      { sourceBriefId: "long-afternoon" }
    ),
    { id: "dep-1", openedAt: 0 }
  );
}

test("no departure written means sent to whatever comes next, exactly as before this existed", () => {
  const d = normalizeDeparture(null, { sourceBriefId: "x", nextBriefRef: "y" });
  assert.equal(d.kind, "sent");
  assert.equal(d.destinations.length, 1);
  assert.equal(d.destinations[0].briefRef, "y");
});

test("a muster written as just a place and a scene becomes one must-go destination", () => {
  const d = normalizeDeparture({ kind: "muster", placeRef: "the-muster-yard", briefRef: "override" });
  assert.equal(d.destinations.length, 1);
  assert.equal(d.destinations[0].placeRef, "the-muster-yard");
  assert.equal(d.destinations[0].mustGo, true);
  const then = departureFromThen({ kind: "muster", placeRef: "long-hall", briefRef: "breakfast" });
  assert.equal(then.kind, "muster");
  assert.equal(then.destinations[0].briefRef, "breakfast");
});

test("unknown authored fields are dropped, never carried through as behaviour", () => {
  const d = normalizeDeparture({ kind: "free", destinations: [{ id: "x", teleport: true, roomFor: -3, mode: "hovercraft" }] });
  assert.equal("teleport" in d.destinations[0], false);
  assert.equal(d.destinations[0].roomFor, null);
  assert.equal(d.destinations[0].mode, null);
});

test("a pick is visible to everyone, and taking it back clears it", () => {
  let live = nightOff();
  const r1 = applyPick(live, { userId: "a", destinationId: "go-out" });
  assert.equal(r1.ok, true);
  live = r1.live;
  assert.equal(live.picks.a, "go-out");
  const r2 = applyPick(live, { userId: "a", destinationId: null });
  assert.equal(r2.live.picks.a, undefined);
});

test("a destination with room for two refuses the third, with a reason -- but never your own re-click", () => {
  let live = openDeparture(
    normalizeDeparture({ kind: "free", destinations: [{ id: "frame", roomFor: 2 }, { id: "bike" }] }),
    { id: "x", openedAt: 0 }
  );
  live = applyPick(live, { userId: "a", destinationId: "frame" }).live;
  live = applyPick(live, { userId: "b", destinationId: "frame" }).live;
  assert.deepEqual(applyPick(live, { userId: "c", destinationId: "frame" }), { ok: false, reason: "full" });
  assert.equal(applyPick(live, { userId: "a", destinationId: "frame" }).ok, true, "re-picking your own full place is fine");
  assert.equal(applyPick(live, { userId: "c", destinationId: "frame", isGM: true }).ok, true, "the GM can always place someone");
});

test("a held departure refuses players and still takes the GM's hand", () => {
  const live = { ...nightOff(), status: "held" };
  assert.deepEqual(applyPick(live, { userId: "a", destinationId: "go-out" }), { ok: false, reason: "held" });
  assert.equal(applyPick(live, { userId: "a", destinationId: "go-out", isGM: true }).ok, true);
});

test("sent and muster are the story's to decide: nobody picks", () => {
  const muster = openDeparture(normalizeDeparture({ kind: "muster", placeRef: "yard", briefRef: "o" }), { id: "m", openedAt: 0 });
  assert.equal(applyPick(muster, { userId: "a", destinationId: "muster" }).reason, "nothing-to-pick");
});

test("PRIVATE: a private pick never reaches the shared record -- only that the player is done", () => {
  let live = openDeparture(
    normalizeDeparture({ kind: "free", destinations: [{ id: "public" }, { id: "secret-errand", private: true }] }),
    { id: "p", openedAt: 0 }
  );
  const r = applyPick(live, { userId: "a", destinationId: "secret-errand" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.privatePick, { userId: "a", destinationId: "secret-errand" });
  live = r.live;
  assert.equal(live.picks.a, undefined);
  assert.equal(live.ready.a, true);
  assert.doesNotMatch(JSON.stringify(live.picks), /secret-errand/);
});

test("PRIVATE: another player's client never receives a private destination or pick at all", () => {
  const live = openDeparture(
    normalizeDeparture({ kind: "free", destinations: [{ id: "public" }, { id: "secret-errand", private: true, pickedIn: ["x"] }] }),
    { id: "p", openedAt: 0 }
  );
  const privatePicks = { a: "secret-errand" };
  const forB = projectForViewer(live, { userId: "b", lastAssignment: { a: "x" }, privatePicks });
  assert.doesNotMatch(JSON.stringify(forB), /secret-errand/, "not hidden: absent");
  const forA = projectForViewer(live, { userId: "a", lastAssignment: { a: "x" }, privatePicks });
  assert.equal(forA.picks.a, "secret-errand");
  const forGM = projectForViewer(live, { userId: "gm", isGM: true, privatePicks });
  assert.equal(forGM.picks.a, "secret-errand");
});

test("readiness shows every player on their own: picked, still browsing, not started, or away -- and for how long", () => {
  let live = nightOff();
  live = applyPick(live, { userId: "a", destinationId: "go-out" }).live;
  const now = 5 * 60_000;
  const r = readiness(live, { roster, activity: { b: now - 10_000 }, now });
  const byId = Object.fromEntries(r.rows.map((row) => [row.userId, row]));
  assert.equal(byId.a.status, "picked");
  assert.equal(byId.a.destinationId, "go-out");
  assert.equal(byId.b.status, "browsing");
  assert.equal(byId.c.status, "waiting");
  assert.equal(byId.c.waitingMs, now, "how long the question has waited on them");
  assert.equal(byId.d.status, "away");
  assert.equal(r.done, 1);
  assert.equal(r.total, 4);
  assert.equal(r.complete, false);
});

test("free: each pick is its own group, and anyone undecided goes with the largest group", () => {
  let live = nightOff();
  live = applyPick(live, { userId: "a", destinationId: "go-out" }).live;
  live = applyPick(live, { userId: "b", destinationId: "go-out" }).live;
  live = applyPick(live, { userId: "c", destinationId: "stay-in" }).live;
  const { assignment, groups } = formGroups(live, { roster });
  assert.deepEqual(assignment, { a: "go-out", b: "go-out", c: "stay-in", d: "go-out" });
  assert.deepEqual(groups.map((g) => [g.destinationId, g.userIds]), [["stay-in", ["c"]], ["go-out", ["a", "b", "d"]]]);
});

test("together: one destination for all -- the GM's choice, or the most-picked", () => {
  let live = openDeparture(normalizeDeparture({ kind: "together", destinations: [{ id: "north" }, { id: "south" }] }), { id: "t", openedAt: 0 });
  live = applyPick(live, { userId: "a", destinationId: "south" }).live;
  live = applyPick(live, { userId: "b", destinationId: "south" }).live;
  live = applyPick(live, { userId: "c", destinationId: "north" }).live;
  assert.deepEqual(new Set(Object.values(formGroups(live, { roster }).assignment)), new Set(["south"]));
  assert.deepEqual(new Set(Object.values(formGroups(live, { roster, choice: "north" }).assignment)), new Set(["north"]));
});

test("a must-go destination takes everyone it is open to, whatever they picked", () => {
  let live = openDeparture(
    normalizeDeparture({ kind: "free", destinations: [{ id: "school" }, { id: "summons", mustGo: true, pickedIn: ["flagged"] }] }),
    { id: "s", openedAt: 0 }
  );
  live = applyPick(live, { userId: "a", destinationId: "school" }).live;
  const { assignment } = formGroups(live, { roster, lastAssignment: { a: "flagged" } });
  assert.equal(assignment.a, "summons");
  assert.equal(assignment.b, "school");
});

test("pickedIn: only the players who made an earlier pick may take this one (whoever went out has to get back in)", () => {
  const back = normalizeDeparture({ kind: "free", destinations: [{ id: "climb-back", pickedIn: ["go-out"] }] }).destinations[0];
  assert.equal(eligible(back, { userId: "a", lastAssignment: { a: "go-out" } }), true);
  assert.equal(eligible(back, { userId: "b", lastAssignment: { b: "stay-in" } }), false);
});

test("the queue: must-go first, a shared scene is one entry, and a destination nobody chose never appears", () => {
  const destinations = normalizeDeparture({
    kind: "free",
    destinations: [
      { id: "shop", briefRef: "afternoon" },
      { id: "range", briefRef: "afternoon" },
      { id: "summons", briefRef: "office", mustGo: true },
      { id: "sleep", briefRef: "afternoon" },
      { id: "nobody", briefRef: "elsewhere" }
    ]
  }).destinations;
  const groups = [
    { destinationId: "shop", briefRef: "afternoon", userIds: ["a"] },
    { destinationId: "range", briefRef: "afternoon", userIds: ["b"] },
    { destinationId: "summons", briefRef: "office", userIds: ["c"] }
  ];
  const queue = resolutionQueue(groups, destinations);
  assert.deepEqual(queue.map((e) => e.briefRef), ["office", "afternoon"]);
  assert.deepEqual(queue[1].destinationIds, ["shop", "range"]);
  assert.equal(queue.some((e) => e.briefRef === "elsewhere"), false, "if everyone goes to one, the other is skipped");
  const after = markRun(queue, queue[0].key);
  assert.equal(nextInQueue(after).briefRef, "afternoon");
  assert.equal(nextInQueue(markRun(after, after[1].key)), null);
});

test("after Go the Scene Runner can still move a player; scenes already run stay run", () => {
  const departure = normalizeDeparture({ kind: "free", destinations: [{ id: "x", briefRef: "one" }, { id: "y", briefRef: "two" }] });
  const assignment = { a: "x", b: "y" };
  const groups = [{ destinationId: "x", briefRef: "one", userIds: ["a"] }, { destinationId: "y", briefRef: "two", userIds: ["b"] }];
  const queue = markRun(resolutionQueue(groups, departure.destinations), "one");
  const r = reassign({ departure, assignment, groups, queue }, { userId: "b", destinationId: "x" });
  assert.equal(r.ok, true);
  assert.equal(r.state.assignment.b, "x");
  assert.deepEqual(r.state.queue.map((e) => [e.briefRef, e.done]), [["one", true]]);
  assert.equal(reassign({ departure, assignment, groups, queue }, { userId: "b", destinationId: "nowhere" }).ok, false);
});

test("a marker knows who is heading there, whether it is yours, full, or closed to you -- with the reason", () => {
  let live = openDeparture(
    normalizeDeparture({ kind: "free", destinations: [{ id: "frame", roomFor: 1 }, { id: "back", pickedIn: ["out"] }] }),
    { id: "m", openedAt: 0 }
  );
  live = applyPick(live, { userId: "a", destinationId: "frame" }).live;
  const [frame, back] = live.destinations;
  assert.deepEqual(markerState(frame, { live, viewerId: "a" }).pickers, ["a"]);
  assert.equal(markerState(frame, { live, viewerId: "a" }).mine, true);
  assert.equal(markerState(frame, { live, viewerId: "b" }).full, true);
  assert.equal(markerState(frame, { live, viewerId: "b" }).reason, "full");
  assert.equal(markerState(back, { live, viewerId: "b" }).closed, true);
  assert.equal(markerState(back, { live, viewerId: "b" }).reason, "not-for-you");
});

test("dashes march along the line and never run past either end", () => {
  const segs = dashSegments({ x: 0, y: 0 }, { x: 100, y: 0 }, { dash: 10, gap: 10, offset: 0 });
  assert.equal(segs.length, 5);
  assert.deepEqual(segs[0], { x1: 0, y1: 0, x2: 10, y2: 0 });
  const shifted = dashSegments({ x: 0, y: 0 }, { x: 100, y: 0 }, { dash: 10, gap: 10, offset: 5 });
  assert.ok(shifted.every((s) => s.x1 >= 0 && s.x2 <= 100));
  assert.ok(shifted[0].x1 === 0 && shifted[0].x2 === 5, "the first dash is cut at the start, then they march");
  assert.deepEqual(dashSegments({ x: 1, y: 1 }, { x: 1, y: 1 }), []);
});

test("thumbnails: the destination's own image, else a scene at the same place, else the scene it leads to", () => {
  const scenes = [
    { art: "canteen", kind: "beat", locationRef: "long-hall", briefRef: "canteen" },
    { art: "canteen-tables", kind: "sub", locationRef: "long-hall", briefRef: "canteen" },
    { art: "afternoon", kind: "beat", locationRef: "landing-end", briefRef: "afternoon" }
  ];
  const root = "modules/blank-inheritance/assets/scenes";
  assert.equal(thumbnailFor({ image: "x.webp" }, { scenes, artRoot: root }), "x.webp");
  assert.equal(thumbnailFor({ placeRef: "long-hall", briefRef: "afternoon" }, { scenes, artRoot: root }), `${root}/thumbs/canteen.webp`);
  assert.equal(thumbnailFor({ placeRef: "the-range", briefRef: "afternoon" }, { scenes, artRoot: root }), `${root}/thumbs/afternoon.webp`);
  assert.equal(thumbnailFor({ placeRef: "nowhere" }, { scenes, artRoot: root }), null);
});

test("six people at one place stand in a ring, not a stack", () => {
  const spots = formation({ x: 1000, y: 1000 }, 6, { spacing: 60 });
  assert.equal(spots.length, 6);
  assert.equal(new Set(spots.map((p) => `${p.x},${p.y}`)).size, 6);
  assert.deepEqual(formation({ x: 5, y: 5 }, 1), [{ x: 5, y: 5 }]);
});

test("crowded markers climb their own stems until they clear each other; a lone one stays put", async () => {
  const { declutter } = await import("../module/blank-inheritance/scripts/core/departures.mjs");
  // Sleep and The Kitchens, 51 screen pixels apart at the zoom they were found overlapping at.
  const lifts = declutter([
    { id: "sleep", x: 100, y: 300, w: 180, h: 90 },
    { id: "kitchens", x: 110, y: 250, w: 180, h: 90 },
    { id: "far", x: 900, y: 300, w: 180, h: 90 }
  ]);
  assert.equal(lifts.sleep, 0, "the lowest marker keeps its short stem");
  assert.equal(lifts.far, 0, "a marker with nobody near it is never moved");
  assert.ok(lifts.kitchens > 0, "the upper of two crowded markers is lifted");
  // Cleared: the kitchens box now ends above the sleep box's top (with padding).
  const sleepTop = 300 - 28 - 90;
  const kitchensBottom = 250 - 28 - lifts.kitchens;
  assert.ok(kitchensBottom <= sleepTop - 6, `still overlapping: ${kitchensBottom} vs ${sleepTop}`);
  // Never past the cap, however crowded.
  const pile = declutter(Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, x: 0, y: 500 - i, w: 180, h: 90 })), { max: 120 });
  assert.ok(Object.values(pile).every((l) => l <= 120));
});
