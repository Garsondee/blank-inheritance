// "What is at this reference?" without loading the whole corpus by hand.
//
// See tools/gazetteer/query.mjs's own docstring for why this exists: every
// other tool reached for this session was a throwaway script reading
// data/locations/*.json fresh each time.

import { test } from "node:test";
import assert from "node:assert/strict";
import { findAt, findNear, filterByKind, filterByStatus, runQuery } from "../tools/gazetteer/query.mjs";

function loc(id, { tier = "site", kind = "building", ref = "C3.44", cells = [ref],
                   centroidPx = [0, 0], status = "needs-lore", name = "" } = {}) {
  return {
    id, tier, kind, name,
    derived: { ref, cells, centroidPx },
    authoring: { status },
  };
}

const CORPUS = [
  loc("harbourmasters-office", { ref: "C3.44", cells: ["C3.44"], centroidPx: [0, 0], name: "Harbourmaster's Office" }),
  loc("signal-box", { ref: "C3.78", cells: ["C3.78", "C3.79"], centroidPx: [100, 0], name: "Signal Box", status: "drafted" }),
  loc("the-old-landing", { tier: "region", kind: "district", ref: "C3.44", cells: ["C3.44", "C3.45"], centroidPx: [5, 5], name: "The Old Landing" }),
  loc("far-away-shed", { ref: "F6.99", cells: ["F6.99"], centroidPx: [9000, 9000], name: "Far Shed", status: "drafted" }),
];

test("findAt matches an exact grid reference in a location's own cells", () => {
  const results = findAt(CORPUS, "C3.44");
  assert.deepEqual(results.map((l) => l.id).sort(),
    ["harbourmasters-office", "the-old-landing"]);
});

test("findAt matches a reference that is one of several cells touched, not just the primary ref", () => {
  const results = findAt(CORPUS, "C3.79");
  assert.deepEqual(results.map((l) => l.id), ["signal-box"]);
});

test("findAt with no ref returns everything unfiltered", () => {
  assert.equal(findAt(CORPUS, undefined).length, CORPUS.length);
});

test("findAt with no matches returns an empty list, not an error", () => {
  assert.deepEqual(findAt(CORPUS, "Z9.99"), []);
});

test("findNear sorts by straight-line pixel distance, nearest first, excluding the origin itself", () => {
  const results = findNear(CORPUS, "harbourmasters-office");
  assert.deepEqual(results.map((l) => l.id),
    ["the-old-landing", "signal-box", "far-away-shed"]);
});

test("findNear respects a limit", () => {
  const results = findNear(CORPUS, "harbourmasters-office", 1);
  assert.deepEqual(results.map((l) => l.id), ["the-old-landing"]);
});

test("findNear on an unknown id throws rather than silently returning everything", () => {
  assert.throws(() => findNear(CORPUS, "no-such-place"), /no location/);
});

test("filterByKind narrows to one kind", () => {
  const results = filterByKind(CORPUS, "district");
  assert.deepEqual(results.map((l) => l.id), ["the-old-landing"]);
});

test("filterByStatus narrows to one status", () => {
  const results = filterByStatus(CORPUS, "drafted");
  assert.deepEqual(results.map((l) => l.id).sort(), ["far-away-shed", "signal-box"]);
});

test("runQuery composes at + kind: narrows both ways, not just the last filter applied", () => {
  const results = runQuery(CORPUS, { at: "C3.44", kind: "district" });
  assert.deepEqual(results.map((l) => l.id), ["the-old-landing"]);
});

test("runQuery's near is resolved against the WHOLE corpus before other filters narrow it", () => {
  // The nearest things to harbourmasters-office, in order, are the-old-landing
  // then signal-box -- if `kind: building` were applied BEFORE near's
  // distance sort instead of after, the ordering guarantee near promises
  // (rank by real distance) would be silently broken.
  const results = runQuery(CORPUS, { near: "harbourmasters-office", kind: "building" });
  assert.deepEqual(results.map((l) => l.id), ["signal-box", "far-away-shed"]);
});

test("runQuery with nothing asked for returns the whole corpus, capped at the default limit", () => {
  const results = runQuery(CORPUS);
  assert.equal(results.length, CORPUS.length);
});

test("runQuery's limit caps the final result, applied after every filter", () => {
  const results = runQuery(CORPUS, { limit: 1 });
  assert.equal(results.length, 1);
});
