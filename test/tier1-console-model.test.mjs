// Tier 1 — the console's pure model. No Foundry, no DOM, no fixtures.
//
// This is where the two rules that shape the whole command bar are locked
// down, because both are the kind of thing that reads as a cosmetic glitch
// when it breaks and is actually an architecture mistake:
//
//   1. The zone list for a seat is FIXED. Mode sheds zones, it never adds or
//      removes them — ApplicationV2's _replaceHTML never removes a part that
//      vanishes from the descriptor set, so a shed zone has to keep its slot.
//
//   2. The day/time instrument and the schedule board are theatre-of-the-mind
//      only. Downtime is not a fourth mode, it is theatre of the mind at city
//      scale; in a fight, time is rounds, and a quarter-of-the-day dial there
//      is noise.

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
    ["ident", "left", "personal", false],
    ["dome", "instrument", "day-ring", false],
    ["checks", "right", "skills", false],
    ["segment", "right", "board", false]
  ],
  "player/personnel": [
    ["ident", "left", "personal", false],
    ["dome", "instrument", null, true],
    ["checks", "right", "skills", false],
    ["segment", "right", null, true]
  ],
  "player/frame": [
    ["ident", "left", "personal", false],
    ["dome", "instrument", null, true],
    ["checks", "right", "skills", false],
    ["segment", "right", null, true]
  ],
  "director/theatre": [
    ["cast", "left", "board", false],
    ["dome", "instrument", "day-ring", false],
    ["checks", "right", "skills", false],
    ["log", "right", "bar", false]
  ],
  "director/personnel": [
    ["cast", "left", "board", false],
    ["dome", "instrument", null, true],
    ["checks", "right", "skills", false],
    ["log", "right", "bar", false]
  ],
  "director/frame": [
    ["cast", "left", "board", false],
    ["dome", "instrument", null, true],
    ["checks", "right", "skills", false],
    ["log", "right", "bar", false]
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

test("a fight never shows the day ring or the schedule board", () => {
  for (const seat of SEAT_LIST) {
    for (const mode of [MODES.PERSONNEL, MODES.FRAME]) {
      for (const zone of zonesFor(mode, seat)) {
        if (zone.id === "dome" || zone.id === "segment") {
          assert.equal(zone.hidden, true, `${seat}/${mode} left "${zone.id}" visible`);
          assert.equal(zone.partial, null, `${seat}/${mode} still resolved a partial for "${zone.id}"`);
        }
      }
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

  assert.deepEqual(onlyPlayer, ["ident", "segment"], "the player sheet lost what makes it a sheet");
  assert.deepEqual(onlyDirector, ["cast", "log"], "the Director board lost what makes it a board");

  // Shared zones are shared on purpose and are the same zone, not a copy.
  const shared = playerZones.filter((id) => directorZones.includes(id));
  assert.deepEqual(shared, ["dome", "checks"]);
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

test("a track is marked hidden exactly when every zone in it is shed", () => {
  // The centre berth has a fixed width (--bi-dome-size), so an empty-but-shown
  // instrument track holds a 252px gap open in the middle of the chassis.
  const combat = consoleLayout(MODES.FRAME, SEATS.PLAYER);
  assert.equal(combat.tracks.instrument.hidden, true);
  assert.equal(combat.tracks.left.hidden, false);
  assert.equal(combat.tracks.right.hidden, false, "checks survives into combat, so the right track stays");

  const theatre = consoleLayout(MODES.THEATRE, SEATS.PLAYER);
  for (const name of TRACKS) {
    assert.equal(theatre.tracks[name].hidden, false, `theatre hid the ${name} track`);
  }
});

test("the Director keeps a cast and a log in every mode — running and recording are one act", () => {
  for (const mode of MODE_LIST) {
    const layout = consoleLayout(mode, SEATS.DIRECTOR);
    assert.equal(layout.tracks.left.hidden, false, `${mode} hid the cast`);
    assert.equal(layout.tracks.right.hidden, false, `${mode} hid the log`);
  }
});
