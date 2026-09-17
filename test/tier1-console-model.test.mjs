// Tier 1 — the console's pure model. No Foundry, no DOM, no fixtures.
//
// This is where the rules that shape the whole deck are locked down, because
// each is the kind of thing that reads as a cosmetic glitch when it breaks and
// is actually an architecture mistake:
//
//   1. The zone list for a seat is FIXED, and so is every zone's physical
//      slot. Mode changes what a module shows, never where it is or whether
//      it exists — ApplicationV2's _replaceHTML never removes a part that
//      vanishes from the descriptor set, and a panel whose keys change places
//      between scenes is a panel nobody can learn by hand.
//
//   2. The deck is symmetric: five modules, outer | inner | instrument |
//      inner | outer, on both seats (rebuilt 2026-09-17 as one mounted panel
//      after the UI north star — design/visual-identity.md, "The deck").
//
//   3. Downtime is not a fourth mode, it is theatre of the mind at city
//      scale; in a fight, time is rounds, so the player's selectors read
//      strikes there instead of downtime offers.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MODES,
  MODE_LIST,
  SEATS,
  SEAT_LIST,
  TRACKS,
  consoleLayout,
  resolveMode,
  resolveSeat,
  zonesFor
} from "../module/blank-inheritance/scripts/core/console-model.mjs";

/* ---------------------------------------------------------------- */
/*  resolveMode                                                      */
/* ---------------------------------------------------------------- */

test("out of combat is always theatre of the mind, whatever the scene is flagged as", () => {
  assert.equal(resolveMode({ combatStarted: false, sceneScale: "frame" }), MODES.THEATRE);
  assert.equal(resolveMode({ combatStarted: false, sceneScale: "personnel" }), MODES.THEATRE);
  assert.equal(resolveMode({ combatStarted: false, sceneScale: null }), MODES.THEATRE);
  assert.equal(resolveMode({}), MODES.THEATRE);
  assert.equal(resolveMode(), MODES.THEATRE);
});

test("combat picks its scale from the scene, and an unknown scale degrades to personnel", () => {
  assert.equal(resolveMode({ combatStarted: true, sceneScale: "frame" }), MODES.FRAME);
  assert.equal(resolveMode({ combatStarted: true, sceneScale: "personnel" }), MODES.PERSONNEL);

  // Layer 0 first (design/design-layers.md): an unflagged or mis-flagged scene
  // must fall toward plain SF2E, never toward the homebrew overlay.
  assert.equal(resolveMode({ combatStarted: true, sceneScale: null }), MODES.PERSONNEL);
  assert.equal(resolveMode({ combatStarted: true, sceneScale: "nonsense" }), MODES.PERSONNEL);
});

test("a valid GM override wins over derived state; an invalid one is ignored", () => {
  assert.equal(resolveMode({ combatStarted: true, sceneScale: "frame", gmOverride: MODES.THEATRE }), MODES.THEATRE);
  assert.equal(resolveMode({ combatStarted: false, gmOverride: MODES.FRAME }), MODES.FRAME);

  // A typo must not strand the table in an undefined mode.
  assert.equal(resolveMode({ combatStarted: false, gmOverride: "theater" }), MODES.THEATRE);
  assert.equal(resolveMode({ combatStarted: true, sceneScale: "frame", gmOverride: "" }), MODES.FRAME);
});

/* ---------------------------------------------------------------- */
/*  resolveSeat                                                      */
/* ---------------------------------------------------------------- */

test("the seat is decided by GM status and nothing else", () => {
  assert.equal(resolveSeat({ isGM: true }), SEATS.DIRECTOR);
  assert.equal(resolveSeat({ isGM: false }), SEATS.PLAYER);
  assert.equal(resolveSeat({}), SEATS.PLAYER);
  assert.equal(resolveSeat(), SEATS.PLAYER);
});

/* ---------------------------------------------------------------- */
/*  zonesFor — the golden table                                      */
/* ---------------------------------------------------------------- */

const GOLDEN = {
  "player/theatre": [
    ["ident", "left", "ident", false],
    ["checks-left", "left", "checks", false],
    ["orb", "instrument", "orb", false],
    ["checks-right", "right", "checks", false],
    ["selectors", "right", "downtime", false]
  ],
  "player/personnel": [
    ["ident", "left", "ident", false],
    ["checks-left", "left", "checks", false],
    ["orb", "instrument", "orb", false],
    ["checks-right", "right", "checks", false],
    ["selectors", "right", "strikes", false]
  ],
  "player/frame": [
    ["ident", "left", "ident", false],
    ["checks-left", "left", "checks", false],
    ["orb", "instrument", "orb", false],
    ["checks-right", "right", "checks", false],
    ["selectors", "right", "strikes", false]
  ],
  "director/theatre": [
    ["cast", "left", "cast", false],
    ["checks-left", "left", "checks", false],
    ["orb", "instrument", "orb", false],
    ["checks-right", "right", "checks", false],
    ["director", "right", "director", false]
  ],
  "director/personnel": [
    ["cast", "left", "cast", false],
    ["checks-left", "left", "checks", false],
    ["orb", "instrument", "orb", false],
    ["checks-right", "right", "checks", false],
    ["director", "right", "director", false]
  ],
  "director/frame": [
    ["cast", "left", "cast", false],
    ["checks-left", "left", "checks", false],
    ["orb", "instrument", "orb", false],
    ["checks-right", "right", "checks", false],
    ["director", "right", "director", false]
  ]
};

test("zonesFor is golden across every seat and mode", () => {
  for (const seat of SEAT_LIST) {
    for (const mode of MODE_LIST) {
      const key = `${seat}/${mode}`;
      const actual = zonesFor(mode, seat).map((z) => [z.id, z.track, z.partial, z.hidden]);
      assert.deepEqual(actual, GOLDEN[key], `zone table changed for ${key}`);
    }
  }
});

test("the zone list for a seat is identical in every mode — mode sheds, it never adds or removes", () => {
  for (const seat of SEAT_LIST) {
    const lists = MODE_LIST.map((mode) => zonesFor(mode, seat).map((z) => z.id));
    for (const list of lists) {
      assert.deepEqual(
        list,
        lists[0],
        `${seat}'s zone ids differ between modes. ApplicationV2 never REMOVES a part that ` +
          `disappears from the descriptor set, so a zone that comes and goes leaves a stale ` +
          `pod on screen. Shed it with hidden:true instead.`
      );
    }
  }
});

test("a fight never shows downtime offers — the player's selectors read strikes instead", () => {
  for (const mode of [MODES.PERSONNEL, MODES.FRAME]) {
    const selectors = zonesFor(mode, SEATS.PLAYER).find((z) => z.id === "selectors");
    assert.equal(selectors.partial, "strikes", `player/${mode} selectors should read strikes`);
    for (const seat of SEAT_LIST) {
      assert.ok(
        zonesFor(mode, seat).every((z) => z.partial !== "downtime"),
        `${seat}/${mode} still shows downtime offers in a fight`
      );
    }
  }
  const theatre = zonesFor(MODES.THEATRE, SEATS.PLAYER).find((z) => z.id === "selectors");
  assert.equal(theatre.partial, "downtime");
});

test("the deck is symmetric: outer | inner | instrument | inner | outer on both seats", () => {
  for (const seat of SEAT_LIST) {
    for (const mode of MODE_LIST) {
      const layout = consoleLayout(mode, seat);
      assert.equal(layout.tracks.left.zones.length, 2, `${seat}/${mode} left side is not two modules`);
      assert.equal(layout.tracks.instrument.zones.length, 1, `${seat}/${mode} has no single instrument`);
      assert.equal(layout.tracks.right.zones.length, 2, `${seat}/${mode} right side is not two modules`);
      // The inner modules mirror each other across the instrument.
      assert.equal(layout.tracks.left.zones[1].id, "checks-left", `${seat}/${mode} inner-left is not the left key bank`);
      assert.equal(layout.tracks.right.zones[0].id, "checks-right", `${seat}/${mode} inner-right is not the right key bank`);
      assert.equal(layout.tracks.instrument.zones[0].id, "orb");
      // Physical slots read outer | inner | spine | inner | outer, left to right.
      const slots = TRACKS.flatMap((name) => layout.tracks[name].zones.map((z) => z.slot));
      assert.deepEqual(slots, ["outer", "inner", "spine", "inner", "outer"], `${seat}/${mode} slots are not symmetric`);
    }
  }
});

test("the central instrument is present in every mode — only its face changes", () => {
  for (const seat of SEAT_LIST) {
    for (const mode of MODE_LIST) {
      const orb = zonesFor(mode, seat).find((z) => z.id === "orb");
      assert.equal(orb.hidden, false, `${seat}/${mode} hid the instrument`);
      assert.equal(orb.partial, "orb");
    }
  }
});

test("theatre of the mind shows every zone its seat has", () => {
  for (const seat of SEAT_LIST) {
    for (const zone of zonesFor(MODES.THEATRE, seat)) {
      assert.equal(zone.hidden, false, `${seat}/theatre hid "${zone.id}"`);
      assert.ok(zone.partial, `${seat}/theatre gave "${zone.id}" no content`);
    }
  }
});

test("hidden and partial always agree — no visible pod with nothing in it", () => {
  for (const seat of SEAT_LIST) {
    for (const mode of MODE_LIST) {
      for (const zone of zonesFor(mode, seat)) {
        assert.equal(
          zone.hidden,
          zone.partial === null,
          `${seat}/${mode}: "${zone.id}" is hidden=${zone.hidden} but partial=${JSON.stringify(zone.partial)}`
        );
      }
    }
  }
});

test("every zone declares a real track and a localisation key", () => {
  for (const seat of SEAT_LIST) {
    for (const zone of zonesFor(MODES.THEATRE, seat)) {
      assert.ok(TRACKS.includes(zone.track), `"${zone.id}" sits in unknown track "${zone.track}"`);
      assert.match(zone.labelKey, /^BLANKINHERITANCE\.Console\.Zone\./, `"${zone.id}" has no legend key`);
    }
  }
});

test("the two seats are different shapes, not the same shape with more buttons", () => {
  const playerZones = zonesFor(MODES.THEATRE, SEATS.PLAYER).map((z) => z.id);
  const directorZones = zonesFor(MODES.THEATRE, SEATS.DIRECTOR).map((z) => z.id);

  // NEITHER seat is a superset of the other, and that is the whole point.
  // The doctrine's two-shapes rule is about layout and information density,
  // not capability -- both seats roll checks, because a GM rolls constantly
  // (refined 2026-09-06 after the rule was first read too strictly). What
  // must never happen is one seat becoming the other plus extras, because
  // that is the point at which the GM console has become a player console
  // with more buttons.
  const onlyPlayer = playerZones.filter((id) => !directorZones.includes(id));
  const onlyDirector = directorZones.filter((id) => !playerZones.includes(id));

  assert.deepEqual(onlyPlayer, ["ident", "selectors"], "the player sheet lost what makes it a sheet");
  assert.deepEqual(onlyDirector, ["cast", "director"], "the Director board lost what makes it a board");

  // Shared zones are shared on purpose and are the same zone, not a copy.
  const shared = playerZones.filter((id) => directorZones.includes(id));
  assert.deepEqual(shared, ["checks-left", "orb", "checks-right"]);
});

test("an unknown seat or mode throws rather than rendering an empty bar", () => {
  assert.throws(() => zonesFor(MODES.THEATRE, "spectator"), /Unknown seat/);
  assert.throws(() => zonesFor("downtime", SEATS.PLAYER), /Unknown mode/);
});

/* ---------------------------------------------------------------- */
/*  consoleLayout                                                    */
/* ---------------------------------------------------------------- */

test("consoleLayout groups every zone into exactly one track, losing none", () => {
  for (const seat of SEAT_LIST) {
    for (const mode of MODE_LIST) {
      const zones = zonesFor(mode, seat);
      const layout = consoleLayout(mode, seat);

      assert.equal(layout.mode, mode);
      assert.equal(layout.seat, seat);
      assert.deepEqual(Object.keys(layout.tracks), [...TRACKS]);

      const grouped = TRACKS.flatMap((name) => layout.tracks[name].zones.map((z) => z.id));
      assert.deepEqual(grouped.sort(), zones.map((z) => z.id).sort(), `${seat}/${mode} lost or duplicated a zone`);
    }
  }
});

test("no track is ever shed on the deck — every module keeps a face in every mode", () => {
  // The old bar hid its whole centre track in a fight. The deck is one
  // physical object, so a missing module would be a hole in the faceplate.
  for (const seat of SEAT_LIST) {
    for (const mode of MODE_LIST) {
      const layout = consoleLayout(mode, seat);
      for (const name of TRACKS) {
        assert.equal(layout.tracks[name].hidden, false, `${seat}/${mode} hid the ${name} track`);
      }
    }
  }
});

test("the Director keeps a cast and a log in every mode — running and recording are one act", () => {
  for (const mode of MODE_LIST) {
    const zones = zonesFor(mode, SEATS.DIRECTOR);
    assert.equal(zones.find((z) => z.id === "cast").hidden, false, `${mode} hid the cast`);
    assert.equal(zones.find((z) => z.id === "director").hidden, false, `${mode} hid the log`);
  }
});
