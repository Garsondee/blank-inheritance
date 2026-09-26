// Tier 3 — the end-of-scroll Close Scene button, 2026-09-22.
//
// Ingram, after being walked through the scene -> map -> scene loop and not yet
// believing it was ready: "Ideally we need a 'Close Scene' button at the bottom
// of each scene in the scene runner, like we have at the top so that when you
// scroll all the way to the bottom there is a button waiting there for me to
// press to move things along."
//
// The contract worth holding is narrow and specific: there are now TWO close
// buttons and they must stay the SAME button. Closing a scene is the single
// highest-value action in the runner -- it records the beats, fires the close
// dialogue, and (when the closure advances) triggers the cut to the world map
// via advanceAfterClose -> needsTravel -> runTravelSequence. A second copy that
// drifted onto its own data-action would be a second, silently different code
// path for the most consequential control on the panel.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const panel = readFileSync(path.join(repoRoot, "module/blank-inheritance/templates/runner/panel.hbs"), "utf8");
const css = readFileSync(path.join(repoRoot, "module/blank-inheritance/styles/bi-components.css"), "utf8");
const lang = JSON.parse(readFileSync(path.join(repoRoot, "module/blank-inheritance/lang/en.json"), "utf8"));

test("the runner has exactly two Close Scene buttons -- header and footer", () => {
  const hits = panel.match(/data-action="closeScene"/g) ?? [];
  assert.equal(hits.length, 2, "one at the top, one at the end of the scroll -- no more, no fewer");
});

test("both close buttons use the SAME action, so they cannot become different code paths", () => {
  // The footer button carries the header's own classes plus a footer modifier.
  assert.match(panel, /class="bi-runner__tier1-btn bi-runner__tier1-btn--close bi-runner__footer-close-btn"/);
  // And no second, near-miss action name crept in alongside it.
  for (const wrong of ["closeSceneFooter", "closeSceneBottom", "endScene", "finishScene"]) {
    assert.equal(panel.includes(`data-action="${wrong}"`), false, `"${wrong}" would be a second path for the same act`);
  }
});

test("the footer button is guarded by {{#if title}} -- with no scene loaded there is nothing to close", () => {
  const footer = panel.slice(panel.indexOf('class="bi-runner__footer-close"'));
  assert.ok(footer.length > 0, "footer block not found");
  const before = panel.slice(0, panel.indexOf('class="bi-runner__footer-close"'));
  const lastGuard = before.lastIndexOf("{{#if title}}");
  const lastClose = before.lastIndexOf("{{/if}}");
  assert.ok(lastGuard > lastClose, "the footer close block must sit inside an open {{#if title}} guard");
});

test("the footer button is the last thing in the SCRIPT column, not mid-script", () => {
  // Rebuilt 2026-09-24: the runner is columns now (the script, the people,
  // the kit), each scrolling on its own, so "the very end of the scroll" is
  // the end of the script column — the people and kit columns legitimately
  // follow it in the markup. What must never follow it inside the script is
  // more scene: the opening, the running order or the ending.
  const idx = panel.indexOf('class="bi-runner__footer-close"');
  const scriptEnd = panel.indexOf('<aside class="bi-runner__side">');
  assert.ok(idx > 0 && scriptEnd > idx, "the footer close must sit inside the script column, before the side column begins");
  const tail = panel.slice(idx, scriptEnd);
  for (const later of ['data-section="intro"', 'data-section="outro"', "bi-runner__beats", "bi-runner__goalbox"]) {
    assert.equal(tail.includes(later), false, `${later} after the footer close would mean scrolling past the button to more of the scene`);
  }
});

test("its styles exist, so it is not an unstyled element CSS silently ignores", () => {
  for (const cls of ["bi-runner__footer-close", "bi-runner__footer-close-btn", "bi-runner__footer-close-hint"]) {
    assert.ok(css.includes(`.${cls}`), `${cls} is used by the template but no stylesheet defines it`);
  }
});

test("its hint string is localised rather than hardcoded English in the template", () => {
  assert.match(panel, /BLANKINHERITANCE\.Runner\.CloseSceneFooterHint/);
  const hint = lang.BLANKINHERITANCE?.Runner?.CloseSceneFooterHint;
  assert.equal(typeof hint, "string");
  assert.ok(hint.length > 20, "the hint should say what closing actually does, not just label the button again");
  assert.match(hint, /travel|next/i, "it should tell the GM that closing moves the table on");
});
