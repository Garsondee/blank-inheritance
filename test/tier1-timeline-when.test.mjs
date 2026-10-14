// Plain-words dates for canon's `when:` field (design/plot-timeline.md §3, D070). Ingram edits these by hand, so every
// form must read back exactly as it was written, and every mistake must say what the words should look like.
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseWhen, formatWhen, resolveWhen, resolveAll, anchorsOf, wordsForDays, yearOf, PRESENT_YEAR, UNIT_DAYS } from "../module/blank-inheritance/scripts/core/timeline-when.mjs";

test("the present year is 4921 AR (D070)", () => {
  assert.equal(PRESENT_YEAR, 4921);
  assert.equal(yearOf(0), 4921);
  assert.equal(yearOf(-200 * UNIT_DAYS.year), 4721);
});

test("every form reads, and writes back as it was written", () => {
  for (const words of [
    "about 200 years ago",
    "44 to 40 years ago",
    "about 1000 years after generation-ship.crashed",
    "3 weeks before directorate.letters-sent",
    "day 1, late morning",
    "day 0",
    "chapter 6, late",
    "chapter 12",
    "book iv",
    "4721 AR",
    "about 4721 AR",
    "about 15 years ago | about 1 year ago",
    "2 days ago",
    "1 year ago",
  ]) {
    assert.equal(formatWhen(parseWhen(words)), words, words);
  }
});

test("the one when canon held before D070 still reads", () => {
  assert.deepEqual(parseWhen("about 200 years ago"), { type: "ago", from: 200, to: null, unit: "year", approx: true });
});

test("a span reads from the earlier end, whichever order it is written in", () => {
  const p = parseWhen("40 to 44 years ago");
  assert.equal(p.from, 44);
  assert.equal(p.to, 40);
});

test("numbers may carry thousands commas", () => {
  assert.equal(parseWhen("about 1,000 years after a.b").n, 1000);
});

test("words this tool can't read say what they should look like", () => {
  for (const bad of ["soon", "a long time ago", "day one", "chapter 0", "book vii x", "day 1, teatime", "about  | 3 years ago", "5 to 5 years ago", ""]) {
    assert.throws(() => parseWhen(bad), Error, bad);
  }
  assert.throws(() => parseWhen("yesterday"), /isn't a when this tool reads/);
});

test("day 1 of intake is zero; the past is negative; the campaign ahead counts in chapters", () => {
  assert.equal(resolveWhen(parseWhen("day 1, midday")).at, 0.5);
  assert.equal(resolveWhen(parseWhen("day 0, morning")).at, -1 + 0.35);
  const ago = resolveWhen(parseWhen("200 years ago"));
  assert.equal(ago.scale, "days");
  assert.equal(ago.at, -200 * UNIT_DAYS.year);
  assert.equal(resolveWhen(parseWhen("4721 AR")).at, -200 * UNIT_DAYS.year);
  const ch = resolveWhen(parseWhen("chapter 6, late"));
  assert.equal(ch.scale, "chapters");
  assert.equal(ch.at, 6.8);
  const book = resolveWhen(parseWhen("book iv"));
  assert.deepEqual([book.from, book.to], [13, 16], "Book IV is chapters 13 to 15");
});

test("a rough date is a soft span around its point; an exact one is not", () => {
  const rough = resolveWhen(parseWhen("about 200 years ago"));
  assert.ok(rough.approx);
  assert.ok(rough.from < rough.at && rough.at < rough.to);
  const exact = resolveWhen(parseWhen("200 years ago"));
  assert.equal(exact.from, exact.to);
});

test("an open date resolves to one position per candidate", () => {
  const p = resolveWhen(parseWhen("about 15 years ago | about 1 year ago"));
  assert.equal(p.scale, "candidates");
  assert.equal(p.options.length, 2);
});

test("anchors chain, and a circle is refused", () => {
  const whens = new Map([
    ["ship.crashed", "about 30000 years ago"],
    ["search-ship.arrived", "about 1000 years after ship.crashed"],
    ["search-ship.found", "about 10 years after search-ship.arrived"],
  ]);
  const { positions, problems } = resolveAll(whens);
  assert.deepEqual(problems, []);
  assert.ok(Math.abs(positions.get("search-ship.found").at - (-30000 + 1010) * UNIT_DAYS.year) < 1);
  assert.deepEqual(anchorsOf(parseWhen("about 10 years after search-ship.arrived")), ["search-ship.arrived"]);

  const circle = resolveAll(new Map([["a.x", "1 year after b.y"], ["b.y", "1 year after a.x"]]));
  assert.ok(circle.problems.some((p) => /circle/.test(p.message)), JSON.stringify(circle.problems));
  const dangling = resolveAll(new Map([["a.x", "1 year after nowhere.at-all"]]));
  assert.ok(dangling.problems.some((p) => /has no when/.test(p.message)));
  const open = resolveAll(new Map([["a.x", "1 year after b.y"], ["b.y", "3 years ago | 5 years ago"]]));
  assert.ok(open.problems.some((p) => /still open/.test(p.message)));
});

test("a dragged date is written back as plain words", () => {
  assert.equal(wordsForDays(-44.2 * UNIT_DAYS.year), "about 44 years ago");
  assert.equal(wordsForDays(-21), "about 3 weeks ago");
  assert.equal(wordsForDays(0.5), "day 1, midday");
  assert.equal(wordsForDays(-0.65), "day 0, morning");
  assert.equal(formatWhen(parseWhen(wordsForDays(-44.2 * UNIT_DAYS.year))), "about 44 years ago");
});
