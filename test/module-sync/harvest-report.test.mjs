// Pure logic tests for tools/module-sync/harvest-report.mjs -- no
// filesystem, no network. See tools/module-sync/review-harvest.mjs for the
// thin CLI layer that reads real harvest/ files and calls this.

import { test } from "node:test";
import assert from "node:assert/strict";
import { availableDates, defaultDate, formatReport } from "../../tools/module-sync/harvest-report.mjs";

test("availableDates: merges session and chat dates, de-duplicated, newest first", () => {
  const result = availableDates(["2026-09-07", "2026-09-16"], ["2026-09-16", "2026-09-10"]);
  assert.deepEqual(result, ["2026-09-16", "2026-09-10", "2026-09-07"]);
});

test("availableDates: a date only present on one side still appears", () => {
  assert.deepEqual(availableDates(["2026-09-07"], []), ["2026-09-07"]);
  assert.deepEqual(availableDates([], ["2026-09-07"]), ["2026-09-07"]);
});

test("availableDates: no data on either side is an empty list", () => {
  assert.deepEqual(availableDates([], []), []);
  assert.deepEqual(availableDates(), []);
});

test("defaultDate: the single most recent date across both sources", () => {
  assert.equal(defaultDate(["2026-09-07"], ["2026-09-16", "2026-09-10"]), "2026-09-16");
});

test("defaultDate: null when there is nothing to report on at all", () => {
  assert.equal(defaultDate([], []), null);
});

test("formatReport: an empty day still produces a readable report, not a crash", () => {
  const report = formatReport({ date: "2026-09-16", highConfidence: [], batch: [] });
  assert.match(report, /Harvest inference — 2026-09-16/);
  assert.match(report, /RESOLVED \(0\)/);
  assert.match(report, /\(none\)/);
  assert.match(report, /NEEDS A LOOK \(0\)/);
  assert.match(report, /nothing ambiguous today/);
});

test("formatReport: resolved entries are listed without numbering, batch entries ARE numbered", () => {
  const report = formatReport({
    date: "2026-09-16",
    highConfidence: [{ at: "2026-09-16T20:15:00.000Z", summary: "Kimura rolled Stealth: success (DC 15)." }],
    batch: [
      { at: "2026-09-16T20:20:00.000Z", summary: "The Commander was referenced by Gamemaster (no action recorded)." },
      { at: "2026-09-16T20:25:00.000Z", summary: "Nobu rolled Survival: failure." }
    ]
  });
  assert.match(report, /\[20:15\] Kimura rolled Stealth: success \(DC 15\)\.\n/);
  assert.match(report, /1\. \[20:20\] The Commander was referenced/);
  assert.match(report, /2\. \[20:25\] Nobu rolled Survival: failure\./);
});

test("formatReport: a missing timestamp degrades to a placeholder rather than throwing", () => {
  const report = formatReport({ date: "2026-09-16", batch: [{ at: null, summary: "Something happened." }] });
  assert.match(report, /\[--:--\] Something happened\./);
});

test("formatReport: a missing date is labelled honestly rather than printing 'undefined'", () => {
  const report = formatReport({ highConfidence: [], batch: [] });
  assert.match(report, /Harvest inference — \(no date\)/);
});
