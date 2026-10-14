// Tier 1 — a check's pill in the Scene Runner's prose (core/check-pill.mjs, 2026-10-05).
//
// Ingram: "When a scene includes a skill check we put it all into the same pill shaped cartouche with the dice
// symbol. The idea is that I'm reading about something and then I find a section of text which might say '... it's
// at that moment you realise you could bluff or intimidate your way out of here...' and the bluff or intimidate is a
// hyperlink in the pill".

import { test } from "node:test";
import assert from "node:assert/strict";

import { checkPillHtml, decorateWithCheck, findCheckSpot, stripCheckTags, waysInWords } from "../module/blank-inheritance/scripts/core/check-pill.mjs";
import { decorateInlineTriggers } from "../module/blank-inheritance/scripts/core/inline-triggers.mjs";

test("an authored <chk> carries its own words", () => {
  const spot = findCheckSpot("It's at that moment you realise you could <chk>bluff or intimidate</chk> your way out.");
  assert.equal(spot.words, "bluff or intimidate");
  assert.equal(spot.before, "It's at that moment you realise you could ");
  assert.equal(spot.after, " your way out.");
  assert.equal(spot.authored, true);
});

test("otherwise the words that ask for it: 'the check', with up to three words before 'check'", () => {
  const plain = findCheckSpot("If anyone watches the platform instead of the speaker, offer the check.");
  assert.equal(plain.words, null);
  assert.equal(plain.before, "If anyone watches the platform instead of the speaker, offer the ");
  assert.equal(plain.after, ".");
  assert.equal(findCheckSpot("If anyone tries to place his name, offer the very hard knowledge check.").after, ".");
  assert.equal(findCheckSpot("If anyone tries to place his name, offer the very hard knowledge check.").before.endsWith("offer the "), true);
  assert.equal(findCheckSpot("Ask which skill they use, and post the check. Then they tell us.").after, ". Then they tell us.");
});

test("a 'check-in' is not a check, and prose with no asking words has no spot", () => {
  assert.equal(findCheckSpot("They queue at the check-in desk."), null);
  assert.equal(findCheckSpot("Everyone stands for the anthem."), null);
  assert.equal(findCheckSpot(null), null);
});

test("a <chk> left in a field that never carries a pill keeps its words and loses the tag", () => {
  assert.equal(stripCheckTags("you could <chk>bluff</chk> or <chk>run</chk>"), "you could bluff or run");
});

test("the ways in words", () => {
  assert.equal(waysInWords([]), "");
  assert.equal(waysInWords(["Perception"]), "Perception");
  assert.equal(waysInWords(["Perception", "Society"]), "Perception or Society");
  assert.equal(waysInWords(["Deception", "Diplomacy", "Intimidation"], "or"), "Deception, Diplomacy or Intimidation");
});

test("the pill: a key that opens the console, its words escaped, the DC, a struck eye when blind, a small light per result", () => {
  const html = checkPillHtml({
    key: "beat:read-the-room",
    words: "Perception <check>",
    dc: 17,
    blind: true,
    lights: [{ state: "success", name: "Aiko" }, { state: "bogus" }, { state: "rolled" }],
    open: true,
    title: "Read the \"room\""
  });
  assert.match(html, /^<button type="button" class="bi-chk is-open" data-action="openCheck" data-check-key="beat:read-the-room"/);
  assert.match(html, /data-tooltip="Read the &quot;room&quot;"/);
  assert.match(html, /<span class="bi-chk__words">Perception &lt;check&gt;<\/span>/);
  assert.match(html, /<span class="bi-chk__dc"><i class="fa-solid fa-eye-slash"[^>]*><\/i> 17<\/span>/);
  assert.equal((html.match(/class="bi-led-mini"/g) ?? []).length, 2, "an unknown state draws no light");
  assert.match(html, /data-state="success" title="Aiko"/);
  assert.match(html, /fa-dice-d20/);
  const quiet = checkPillHtml({ key: "beat:x", words: "Any skill check", dc: null });
  assert.doesNotMatch(quiet, /bi-chk__dc|bi-chk__lights|is-open|eye-slash/);
});

test("decorated around the pill: trigger chips on either side still work, and an unknown one is still reported", () => {
  const triggers = [{ id: "a", kind: "note", label: "A" }];
  const decorate = (text) => decorateInlineTriggers(text, triggers, "beat", {});
  const pill = (words) => `<PILL:${words ?? "ways"}>`;
  const out = decorateWithCheck('Look <trig id="a"/> then offer the check <trig id="zzz"/>.', decorate, pill);
  assert.equal(out.placed, true);
  assert.match(out.html, /^Look <button[^>]*data-trigger-id="a"/);
  assert.match(out.html, /offer the <PILL:ways> /);
  assert.deepEqual(out.unknownIds, ["zzz"]);
});

test("with no asking words the pill goes at the end of the line, or nowhere if asked not to", () => {
  const decorate = (text) => decorateInlineTriggers(text, [], "beat", {});
  const pill = () => "<PILL>";
  assert.equal(decorateWithCheck("Everyone stands for the anthem.", decorate, pill).html, "Everyone stands for the anthem. <PILL>");
  const none = decorateWithCheck("Everyone stands.", decorate, pill, { append: false });
  assert.equal(none.html, "Everyone stands.");
  assert.equal(none.placed, false);
  assert.equal(decorateWithCheck("You could <chk>run</chk>.", decorate, (w) => `[${w}]`).html, "You could [run].");
});

test("prose around the pill is escaped exactly as before: no markup from the text gets through", () => {
  const decorate = (text) => decorateInlineTriggers(text, [], "beat", {});
  const out = decorateWithCheck("<b>Offer</b> the check.", decorate, () => "<PILL>");
  assert.equal(out.html, "&lt;b&gt;Offer&lt;/b&gt; the <PILL>.");
});
