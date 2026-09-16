// Tier 1 — the cast board's ordering and labelling.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DISPOSITIONS,
  buildCast,
  castSummary,
  dispositionName
} from "../module/blank-inheritance/scripts/core/cast.mjs";

const TOKENS = [
  { id: "t3", name: "Zita", isPC: false, disposition: DISPOSITIONS.HOSTILE, hasActor: true },
  { id: "t1", name: "Ren", isPC: true, disposition: DISPOSITIONS.FRIENDLY, hasActor: true },
  { id: "t4", name: "Aoi", isPC: false, disposition: DISPOSITIONS.NEUTRAL, hasActor: true },
  { id: "t2", name: "Etsuko", isPC: true, disposition: DISPOSITIONS.FRIENDLY, hasActor: true }
];

test("player characters come first, then everyone else, each by name", () => {
  // PCs first because they are the fixed points of a scene — the GM finds them
  // by position rather than by reading. Name order within each group because
  // any ordering that changes on its own makes the row you want move while you
  // are reaching for it.
  assert.deepEqual(
    buildCast(TOKENS).map((row) => row.name),
    ["Etsuko", "Ren", "Aoi", "Zita"]
  );
});

test("ordering is stable regardless of the order tokens came off the canvas", () => {
  const forwards = buildCast(TOKENS).map((r) => r.id);
  const backwards = buildCast([...TOKENS].reverse()).map((r) => r.id);
  assert.deepEqual(forwards, backwards);
});

test("hidden tokens stay on the board and are flagged", () => {
  // This board only ever renders on a GM's client, and a hidden token the GM
  // cannot see on their own board is a trap.
  const rows = buildCast([{ id: "x", name: "Ambusher", hidden: true, disposition: DISPOSITIONS.HOSTILE }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hidden, true);
});

test("a token with no actor is kept but marked unrollable", () => {
  const rows = buildCast([{ id: "x", name: "Scenery", hasActor: false }]);
  assert.equal(rows[0].hasActor, false);
});

test("a nameless token renders a placeholder rather than an empty row", () => {
  const rows = buildCast([{ id: "x", name: "" }, { id: "y" }]);
  for (const row of rows) assert.equal(row.name, "—");
});

test("every flag is a real boolean, whatever the canvas handed over", () => {
  const rows = buildCast([{ id: "x", name: "A", isPC: undefined, hidden: null, selected: 0 }]);
  for (const key of ["isPC", "hidden", "selected", "hasActor"]) {
    assert.equal(typeof rows[0][key], "boolean", `${key} is not a boolean`);
  }
});

test("disposition becomes a name the stylesheet can hook, and an odd value degrades to neutral", () => {
  assert.equal(dispositionName(DISPOSITIONS.HOSTILE), "hostile");
  assert.equal(dispositionName(DISPOSITIONS.FRIENDLY), "friendly");
  assert.equal(dispositionName(DISPOSITIONS.NEUTRAL), "neutral");
  assert.equal(dispositionName(DISPOSITIONS.SECRET), "secret");

  // Disposition is a number on a document a GM can edit by hand. A board that
  // refuses to render because of one strange value is worse than one that
  // shows the token plainly.
  assert.equal(dispositionName(99), "neutral");
  assert.equal(dispositionName(undefined), "neutral");
});

test("an empty scene produces an empty board, not an error", () => {
  assert.deepEqual(buildCast([]), []);
  assert.deepEqual(buildCast(), []);
});

test("the summary counts what a GM would otherwise count by hand", () => {
  const summary = castSummary(buildCast(TOKENS));
  assert.deepEqual(summary, { total: 4, players: 2, others: 2 });
  assert.deepEqual(castSummary([]), { total: 0, players: 0, others: 0 });
  assert.deepEqual(castSummary(), { total: 0, players: 0, others: 0 });
});

test("buildCast does not mutate what it was given", () => {
  const input = [{ id: "b", name: "B" }, { id: "a", name: "A" }];
  const snapshot = JSON.parse(JSON.stringify(input));
  buildCast(input);
  assert.deepEqual(input, snapshot);
});
