// Tier 1 — haunts (canon/decisions/D051.md): the rumour mill's deal
// (core/rumours.mjs), event kinds, episodes and the header alert
// (core/event-deck.mjs), the regulars' attitudes (core/haunt-regulars.mjs),
// and the summary tools/haunts/pull.mjs brings home.

import { test } from "node:test";
import assert from "node:assert/strict";

import { RUMOUR_DEGREES, dealRumours, normalizeRumourSets, rumourSetProblems, setsFor } from "../module/blank-inheritance/scripts/core/rumours.mjs";
import { alertFor, deckView, drawEvent, emptyDeckState, normalizeEvents } from "../module/blank-inheritance/scripts/core/event-deck.mjs";
import {
  conditionOf,
  eventShifts,
  hauntKey,
  regularsView,
  shiftFaction,
  shiftRegular,
  toggleSetback,
  toggleUpgrade
} from "../module/blank-inheritance/scripts/core/haunt-regulars.mjs";
import { summarise } from "../tools/haunts/pull.mjs";

/* ------------------------------------------------------------------ */
/*  The rumour mill                                                    */
/* ------------------------------------------------------------------ */

const SET = normalizeRumourSets([
  {
    id: "e1-1",
    episode: "ep1",
    set: 1,
    truths: ["T1", "T2", { text: "T3", plot: true, fact: "x.y" }, "T4"],
    lies: ["L1", "L2", "L3", "L4"]
  }
])[0];

test("each degree deals exactly what Ingram set: 0/1/2/3 truths out of three", () => {
  for (const [degree, want] of Object.entries(RUMOUR_DEGREES)) {
    const { statements } = dealRumours(SET, degree, { random: () => 0.3 });
    assert.equal(statements.length, 3, degree);
    assert.equal(statements.filter((s) => s.isTrue).length, want.truths, degree);
  }
  assert.deepEqual(dealRumours(SET, "somewhere").statements, []);
});

test("the next player hears something new while there is something new", () => {
  let used = [];
  const heard = [];
  for (let i = 0; i < 2; i++) {
    const r = dealRumours(SET, "success", { used, random: () => 0 });
    heard.push(...r.statements.map((s) => s.key));
    used = r.used;
  }
  assert.equal(new Set(heard).size, heard.length, "no statement dealt twice while fresh ones remain");
  const third = dealRumours(SET, "criticalSuccess", { used, random: () => 0 });
  assert.equal(third.statements.length, 3, "a spent set still deals, repeating the oldest");
});

test("a set needs three of each to deal from, and at most one rumour touching the plot", () => {
  assert.deepEqual(rumourSetProblems(SET), []);
  const [thin] = normalizeRumourSets([{ id: "s", set: 1, truths: ["a"], lies: [{ text: "b", plot: true }, { text: "c", plot: true }] }]);
  const problems = rumourSetProblems(thin);
  assert.ok(problems.some((p) => /true rumours/.test(p)));
  assert.ok(problems.some((p) => /lies/.test(p)));
  assert.ok(problems.some((p) => /at most one/.test(p)));
});

test("an episode shows its own sets, in order", () => {
  const sets = setsFor(
    [
      { id: "b", episode: "ep1", set: 2, truths: [], lies: [] },
      { id: "a", episode: "ep1", set: 1, truths: [], lies: [] },
      { id: "c", episode: "ep2", set: 1, truths: [], lies: [] }
    ],
    "ep1"
  );
  assert.deepEqual(sets.map((s) => s.id), ["a", "b"]);
});

/* ------------------------------------------------------------------ */
/*  Events                                                             */
/* ------------------------------------------------------------------ */

const EVENTS = [
  { id: "quiet", title: "Quiet", text: "t", kind: "roleplay" },
  { id: "fight", title: "Fight", text: "t", kind: "danger" },
  { id: "clue", title: "Clue", text: "t", kind: "plot", episodes: ["ep2"] }
];

test("events keep their kind, outcomes and episodes; an unknown kind is role-play", () => {
  const [e] = normalizeEvents([{ id: "x", title: "X", text: "t", kind: "weird", outcomes: { success: "s", criticalFailure: "cf", junk: "j" } }]);
  assert.equal(e.kind, "roleplay");
  assert.deepEqual(e.outcomes.map((o) => o.degree), ["success", "criticalFailure"]);
});

test("a danger event can carry its own theatre-of-the-mind fight (D052); other events carry none", () => {
  const [withFight, without] = normalizeEvents([
    { id: "a", title: "A", text: "t", kind: "danger", fight: { foe: "A collector", press: "Get it down.", retreat: "It doesn't follow.", surrender: "Never -- it isn't alive." } },
    { id: "b", title: "B", text: "t", kind: "roleplay" }
  ]);
  assert.deepEqual(withFight.fight, { foe: "A collector", press: "Get it down.", retreat: "It doesn't follow.", surrender: "Never -- it isn't alive." });
  assert.equal(without.fight, null);
});

test("an event tied to an episode only comes up in that episode", () => {
  let state = emptyDeckState();
  const drawn = [];
  for (let i = 0; i < 3; i++) {
    const r = drawEvent(EVENTS, state, { episodeId: "ep1", random: () => 0 });
    if (r.event) drawn.push(r.event.id);
    state = r.state;
  }
  assert.deepEqual(drawn.sort(), ["fight", "quiet"]);
  assert.equal(deckView(EVENTS, emptyDeckState(), { episodeId: "ep1" }).total, 2);
});

test("the header alerts the GM while danger or plot is on the table; danger first", () => {
  const n = normalizeEvents(EVENTS);
  assert.equal(alertFor([n[0]]), null);
  assert.equal(alertFor([n[0], n[2]]), "plot");
  assert.equal(alertFor([n[2], n[1]]), "danger");
  assert.equal(deckView(EVENTS, { drawn: ["fight"], witnessed: [] }).alert, "danger");
});

/* ------------------------------------------------------------------ */
/*  The regulars                                                       */
/* ------------------------------------------------------------------ */

const BAR = {
  id: "rest--crew-mess",
  haunt: { everyVisit: "Smoke and shouting." },
  intro: { position: { locationRef: "the-crew-mess" } },
  cast: [
    { id: "chief", label: "The crew chief", role: "runs the bar", brief: { attitude: "indifferent", byAttitude: { unfriendly: "Serves you last.", indifferent: "Serves you.", friendly: "Pours you one." } } },
    { id: "drunk", label: "A drunk", walkOn: true, brief: {} }
  ],
  events: [{ id: "trashed", title: "The bar gets trashed", text: "t", shifts: [{ regular: "chief", change: -1, when: "failure" }, { regular: "nobody", change: 1 }] }]
};

test("attitudes are kept per place, so the bar remembers the group whichever episode brings them back", () => {
  assert.equal(hauntKey(BAR), "the-crew-mess");
  assert.equal(hauntKey({ id: "x" }), "x");
});

test("a regular's attitude reads as a line for how they behave now; walk-ons are not regulars", () => {
  const view = regularsView(BAR, null);
  assert.deepEqual(view.map((r) => r.id), ["chief"]);
  assert.equal(view[0].attitude, "indifferent");
  assert.equal(view[0].line, "Serves you.");
});

test("trashing the bar lowers the attitude, keeps the reason, and the scene reads differently next time", () => {
  const { state, entry } = shiftRegular(BAR, null, "chief", -1, { why: "The bar gets trashed", at: "now" });
  assert.deepEqual(entry, { at: "now", regular: "chief", name: "The crew chief", from: "indifferent", to: "unfriendly", why: "The bar gets trashed" });
  assert.equal(regularsView(BAR, state)[0].line, "Serves you last.");
  const lower = shiftRegular(BAR, state, "chief", -5).state;
  assert.equal(regularsView(BAR, lower)[0].attitude, "hostile", "clamped, never wrapping round");
  assert.equal(shiftRegular(BAR, state, "stranger", 1).entry, null);
});

test("an event's shifts only name real regulars, and are capped at two steps", () => {
  assert.deepEqual(eventShifts(BAR.events[0], BAR), [{ regular: "chief", change: -1, when: "failure" }]);
  assert.deepEqual(eventShifts({ shifts: [{ regular: "chief", change: 9 }] }, BAR), [{ regular: "chief", change: 2, when: "any" }]);
});

test("what comes home to Claude names each place's regulars, their attitude and the latest reason", () => {
  const { state } = shiftRegular(BAR, null, "chief", -1, { why: "The bar gets trashed" });
  assert.deepEqual(summarise({ places: { "the-crew-mess": state } }), ["the-crew-mess: The crew chief unfriendly (The bar gets trashed)"]);
  assert.deepEqual(summarise({}), []);
});

/* ------------------------------------------------------------------ */
/*  D052: the attitude promise -- doors, factions, upgrades, setbacks  */
/* ------------------------------------------------------------------ */

const GANG_BAR = {
  ...BAR,
  cast: [
    {
      id: "chief",
      label: "The crew chief",
      role: "runs the bar",
      brief: {
        attitude: "indifferent",
        byAttitude: { unfriendly: "Serves you last.", indifferent: "Serves you.", friendly: "Pours you one." },
        faction: "the-repair-crews",
        doors: [
          { kind: "opens", at: "friendly", text: "The back room, and a tab." },
          { kind: "closes", at: "unfriendly", text: "Served last, and only what's left." },
          { kind: "closes", at: "hostile", text: "Turned away at the door." }
        ]
      }
    },
    { id: "drunk", label: "A drunk", walkOn: true, brief: {} }
  ]
};

test("a regular's doors say what their attitude opens and shuts, resolved to right now", () => {
  const view = regularsView(GANG_BAR, null);
  const doors = view[0].doors;
  assert.deepEqual(doors, [
    { kind: "opens", text: "The back room, and a tab.", active: false },
    { kind: "closes", text: "Served last, and only what's left.", active: false },
    { kind: "closes", text: "Turned away at the door.", active: false }
  ]);
  const lower = shiftRegular(GANG_BAR, null, "chief", -1).state;
  assert.equal(regularsView(GANG_BAR, lower)[0].doors[1].active, true, "unfriendly shuts the unfriendly-or-worse door");
  const higher = shiftRegular(GANG_BAR, null, "chief", 2).state;
  assert.equal(regularsView(GANG_BAR, higher)[0].doors[0].active, true, "friendly opens the friendly-or-better door");
});

test("a faction's own standing moves separately from any one regular's, and a regular is played at the worse of the two", () => {
  const { state: faction } = shiftFaction(null, "the-repair-crews", "the-repair-crews", -2, { why: "burned a job for the whole crew" });
  assert.equal(faction.attitudes.__self, "hostile");
  const view = regularsView(GANG_BAR, null, { "the-repair-crews": faction });
  assert.equal(view[0].personal, "indifferent", "the chief's own dealings with the group are untouched");
  assert.equal(view[0].attitude, "hostile", "but the whole crew's grudge reaches him anyway");
  assert.equal(view[0].loweredByFaction, true);
  assert.equal(regularsView(GANG_BAR, null, {})[0].loweredByFaction, false, "no faction record yet, nothing lowered");
});

const CLUB = {
  ...BAR,
  haunt: {
    everyVisit: "Smoke and shouting.",
    upgrades: [{ id: "fixed-boiler", title: "The boiler's fixed", text: "Hot water now, so the rest heals half instead of a quarter.", how: "Craft the part and hand it to Tomoe." }],
    setbacks: [{ id: "raided", title: "Raided last week", text: "Half the regulars are keeping their heads down.", lasting: "temporary" }]
  }
};

test("upgrades and setbacks toggle by hand and the Runner can see which are live", () => {
  assert.deepEqual(conditionOf(CLUB, null), {
    upgrades: [{ id: "fixed-boiler", title: "The boiler's fixed", text: "Hot water now, so the rest heals half instead of a quarter.", how: "Craft the part and hand it to Tomoe.", unlocked: false }],
    setbacks: [{ id: "raided", title: "Raided last week", text: "Half the regulars are keeping their heads down.", lasting: "temporary", active: false }]
  });
  const unlocked = toggleUpgrade(CLUB, null, "fixed-boiler");
  assert.equal(unlocked.unlocked, true);
  assert.equal(conditionOf(CLUB, unlocked.state).upgrades[0].unlocked, true);
  const relocked = toggleUpgrade(CLUB, unlocked.state, "fixed-boiler");
  assert.equal(relocked.unlocked, false);
  assert.equal(toggleUpgrade(CLUB, null, "no-such-id").unlocked, null);

  const broken = toggleSetback(CLUB, null, "raided");
  assert.equal(broken.active, true);
  assert.equal(conditionOf(CLUB, broken.state).setbacks[0].active, true);
  assert.equal(toggleSetback(CLUB, broken.state, "raided").active, false);
});
