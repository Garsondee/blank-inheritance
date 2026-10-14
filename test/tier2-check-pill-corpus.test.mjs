// Tier 2 — every real check finds its place in the prose (core/check-pill.mjs, 2026-10-05).
//
// The Scene Runner draws a beat's check as a pill in the beat's own line, where the words ask for it ("offer the
// check"), at an authored `<chk>words</chk>`, or at the end of the line. Run against every scene brief the module
// ships, so a phrasing the matcher misreads, or a `<chk>` written somewhere the Runner never draws one (a read-aloud
// the GM says to the table, a note), fails here rather than at the table.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { decorateWithCheck, findCheckSpot } from "../module/blank-inheritance/scripts/core/check-pill.mjs";
import { decorateInlineTriggers } from "../module/blank-inheritance/scripts/core/inline-triggers.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRIEFS = path.join(ROOT, "data", "scene-briefs");
const briefs = readdirSync(BRIEFS)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ file: f, brief: JSON.parse(readFileSync(path.join(BRIEFS, f), "utf8")) }));

const withChecks = briefs.flatMap(({ file, brief }) => (brief.beats ?? []).filter((b) => b.challengeRef).map((beat) => ({ file, beat })));

test("there are real checks to place", () => {
  assert.ok(withChecks.length >= 20, `expected Episode One's checks at least, found ${withChecks.length}`);
});

test("a beat whose line asks for 'the check' gets its pill right there, never at the end", () => {
  let placed = 0;
  for (const { file, beat } of withChecks) {
    const text = String(beat.text ?? "");
    if (!/\bthe\s+(?:[a-z]+\s+){0,3}?check\b(?!-)/i.test(text)) continue;
    const spot = findCheckSpot(text);
    assert.ok(spot, `${file}#${beat.id}: says "the check" but no spot was found`);
    assert.match(spot.before, /\bthe\s+$/i, `${file}#${beat.id}: the pill must stand where "the ... check" was`);
    placed++;
  }
  assert.ok(placed >= 15, `expected most checks to be asked for in words, found ${placed}`);
});

test("placing the pill never loses or breaks a trigger chip in the line", () => {
  for (const { file, beat } of withChecks) {
    const text = String(beat.text ?? "");
    const decorate = (t) => decorateInlineTriggers(t, beat.triggers ?? [], beat.id, {});
    const whole = decorate(text);
    const around = decorateWithCheck(text, decorate, () => "<PILL>");
    const chips = (html) => (html.match(/data-action="fireTrigger"/g) ?? []).length;
    assert.equal(chips(around.html), chips(whole.html), `${file}#${beat.id}: a trigger chip was lost around the pill`);
    assert.deepEqual(around.unknownIds, whole.unknownIds, `${file}#${beat.id}: a trigger reads differently around the pill`);
    assert.equal((around.html.match(/<PILL>/g) ?? []).length, 1, `${file}#${beat.id}: exactly one pill per checked beat`);
  }
});

/** Every string in a value, with where it sits. */
function* strings(value, at = []) {
  if (typeof value === "string") yield [at.join("."), value];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, [...at, i]);
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) yield* strings(v, [...at, k]);
}

test("<chk> is written only in a checked beat's own line, with words in it", () => {
  for (const { file, brief } of briefs) {
    for (const [where, text] of strings(brief)) {
      if (!/<chk>/i.test(text)) continue;
      const match = where.match(/^beats\.(\d+)\.text$/);
      assert.ok(match, `${file}: <chk> at ${where}, where the Runner never draws a pill (only a beat's text carries one)`);
      const beat = brief.beats[Number(match[1])];
      assert.ok(beat.challengeRef, `${file}#${beat.id}: <chk> in a beat with no check`);
      assert.equal((text.match(/<chk>/gi) ?? []).length, 1, `${file}#${beat.id}: one <chk> per beat`);
      assert.match(text, /<chk>\s*\S[\s\S]*?<\/chk>/i, `${file}#${beat.id}: an empty <chk>`);
    }
  }
});
