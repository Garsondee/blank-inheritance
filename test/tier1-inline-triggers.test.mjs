// Tier 1 — inline scene-runner triggers (design/scene-triggers-and-depth.md §2).
//
// The load-bearing test in this file is "an unrecognised trigger fails
// loudly, never silently" — the opposite failure mode from redaction
// (tier1-redaction.test.mjs), and deliberately so: a trigger has no secret
// to leak, so the wrong behaviour here is a dead button nobody notices
// until they click it mid-scene, not a security hole.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decorateInlineTriggers,
  hasInlineTriggers,
  referencedTriggerIds,
  escapeHtml,
  TRIGGER_KIND_META
} from "../module/blank-inheritance/scripts/core/inline-triggers.mjs";

test("plain prose with no trigger tokens renders unchanged but escaped, matching today's {{text}} behaviour", () => {
  const { html, used, unknownIds } = decorateInlineTriggers("Taka arrives and claims the table.", []);
  assert.equal(html, "Taka arrives and claims the table.");
  assert.deepEqual(used, []);
  assert.deepEqual(unknownIds, []);
});

test("a recognised trigger becomes a real button at the exact point it was authored", () => {
  const triggers = [{ id: "taka-enters", kind: "npc-enter", npcRef: "taka", label: "Taka arrives" }];
  const { html, used } = decorateInlineTriggers(
    'Taka arrives <trig id="taka-enters"/> and claims the table.',
    triggers,
    "takas-entrance"
  );
  assert.deepEqual(used, ["taka-enters"]);
  assert.ok(html.startsWith("Taka arrives "), "text before the token is preserved in order");
  assert.ok(html.endsWith(" and claims the table."), "text after the token is preserved in order");
  assert.ok(html.includes('data-action="fireTrigger"'), "the chip is wired to the shared dispatch action");
  assert.ok(html.includes('data-beat-id="takas-entrance"'), "the beat id is threaded through so a scoped id resolves");
  assert.ok(html.includes('data-trigger-id="taka-enters"'), "the trigger id is on the element a click reads");
  assert.ok(html.includes("Taka arrives</button>") || html.includes('title="Taka arrives"'), "the authored label reaches the button");
});

test("an unrecognised trigger id fails loudly and visibly, never silently — the opposite of redaction's failure mode", () => {
  const { html, unknownIds, used } = decorateInlineTriggers(
    'Something happens <trig id="does-not-exist"/> here.',
    [{ id: "a-different-id", kind: "note" }]
  );
  assert.deepEqual(unknownIds, ["does-not-exist"]);
  assert.deepEqual(used, []);
  assert.ok(html.includes("does-not-exist"), "the bad id itself is visible in the rendered output, not swallowed");
  assert.ok(/⚠/.test(html), "an unknown trigger renders a visible warning marker");
});

test("plain text either side of the token is HTML-escaped, so authored prose can't accidentally break markup", () => {
  const { html } = decorateInlineTriggers('The sign reads <DANGER> & keep out. <trig id="x"/> after that.', [
    { id: "x", kind: "note", label: "beat" }
  ]);
  assert.ok(html.includes("&lt;DANGER&gt;"), "a literal angle bracket in prose is escaped");
  assert.ok(html.includes("&amp; keep out"), "a literal ampersand in prose is escaped");
});

test("multiple triggers in one string each render in their original order", () => {
  const triggers = [
    { id: "a", kind: "npc-enter", label: "A enters" },
    { id: "b", kind: "npc-exit", label: "B leaves" }
  ];
  const { html, used } = decorateInlineTriggers('<trig id="a"/> then later <trig id="b"/>.', triggers);
  assert.deepEqual(used, ["a", "b"]);
  assert.ok(html.indexOf("A enters") < html.indexOf("B leaves"), "chips preserve authoring order");
});

test("every trigger kind maps to one of the Scene Runner's own existing tokens, never a new one", () => {
  const allowedKeys = new Set(["good", "good-dim", "info", "warn", "neutral"]);
  for (const [kind, meta] of Object.entries(TRIGGER_KIND_META)) {
    assert.ok(allowedKeys.has(meta.key), `${kind} maps to an unrecognised colour key "${meta.key}"`);
    assert.ok(meta.glyph && meta.glyph.length > 0, `${kind} has no glyph to distinguish it by shape`);
  }
});

test("hasInlineTriggers is a cheap true/false pre-check, not a full parse", () => {
  assert.equal(hasInlineTriggers("plain text, nothing here"), false);
  assert.equal(hasInlineTriggers('one <trig id="x"/> token'), true);
  assert.equal(hasInlineTriggers(null), false);
  assert.equal(hasInlineTriggers(undefined), false);
});

test("referencedTriggerIds finds every id across both text and readAloud, de-duplicated", () => {
  const beat = {
    text: 'Something happens <trig id="a"/>.',
    readAloud: '"<trig id="a"/> Then this is said aloud, and <trig id="b"/> too."'
  };
  assert.deepEqual(referencedTriggerIds(beat).sort(), ["a", "b"]);
});

test("referencedTriggerIds returns empty for a beat with neither field, rather than throwing", () => {
  assert.deepEqual(referencedTriggerIds({}), []);
  assert.deepEqual(referencedTriggerIds({ id: "some-beat" }), []);
});

test("escapeHtml handles null/undefined the same way the rest of this module's optional-string fields do", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
  assert.equal(escapeHtml("a & b < c > d"), "a &amp; b &lt; c &gt; d");
});

test("a trigger's authored label can itself contain characters that would break an HTML attribute, and survives quoted", () => {
  const triggers = [{ id: "x", kind: "gm-tool", label: 'Open the "locked" cabinet' }];
  const { html } = decorateInlineTriggers('<trig id="x"/>', triggers, "b1");
  assert.ok(!html.includes('title="Open the "locked"'), "an unescaped quote would break out of the attribute");
  assert.ok(html.includes("&quot;locked&quot;"), "the quote is escaped inside the attribute instead");
});

/* ---------------------------------------------------------------- */
/*  2026-10-04 (D059): pressed chips, and what kind each chip is     */
/* ---------------------------------------------------------------- */

test("a chip already pressed shows a tick and the fired class; every chip says what kind it is", () => {
  const triggers = [
    { id: "taka-enters", kind: "npc-enter", npcRef: "taka", label: "Taka arrives" },
    { id: "give-drains", kind: "objective", act: "give", objectiveRef: "c1e1-storm-drains", label: "Give: drains" }
  ];
  const text = 'Taka arrives. <trig id="taka-enters"/> <trig id="give-drains"/>';
  const { html } = decorateInlineTriggers(text, triggers, "b1", { fired: new Set(["give-drains"]) });
  assert.match(html, /data-trigger-id="taka-enters" data-kind="npc-enter"/);
  assert.match(html, /data-trigger-id="give-drains" data-kind="objective" data-act="give"/);
  assert.match(html, /class="bi-trig bi-trig--warn bi-trig--fired"/, "the pressed give chip is marked");
  assert.doesNotMatch(html, /class="bi-trig bi-trig--good bi-trig--fired"/, "the entrance was not pressed");
  assert.match(html, /<span class="bi-trig__glyph" aria-hidden="true">✓<\/span> Give: drains/);
  const plain = decorateInlineTriggers(text, triggers, "b1").html;
  assert.doesNotMatch(plain, /bi-trig--fired/, "no fired set, nothing marked");
});
