// Tier 3 — the deck's one-row macro hotbar against Foundry's own compact hotbar.
//
// Foundry's hotbar turns "compact" on a narrow screen: two rows of five slots in a bar held to 332px
// (public/css/foundry2.css, `#hotbar.compact, #hotbar.md.offset, #hotbar.sm`), switched by hotbar.mjs#_onResize at
// 1488px and under. The deck lays the hotbar out as ONE row with the orb's gap between the fifth and sixth slot, so
// under the compact rules the fifth slot fell onto a row of its own and a row of empty slots lay across the deck's
// Perception key at 1366 x 768 (found by the playtest rig's covered-control detector, 2026-10-06, F-0014;
// design/playtest-process.md §12.5). bi-foundry-bridge.css undoes the compact layout for the deck.
//
// This pins both halves: that the module's CSS covers every selector Foundry uses for the compact layout, and that
// Foundry has not grown a new one, a new size class, or a different bar width since. The picture itself is checked in
// a real browser at eight screen sizes by tools/overlay-check/hotbar-check.mjs.
//
// Skips loudly when the gitignored foundryvtt/ tree is absent (design/testing-strategy.md §3).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const app = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");
const bridge = readFileSync(path.join(repoRoot, "module", "blank-inheritance", "styles", "bi-foundry-bridge.css"), "utf8");

function read(t, ...parts) {
  const file = path.join(app, ...parts);
  if (!existsSync(file)) {
    t.skip("foundryvtt/ not present locally (gitignored): the compact-hotbar contract needs its source, skipping loudly rather than failing or silently passing.");
    return null;
  }
  return readFileSync(file, "utf8");
}

/** The selectors of the rule in `css` whose body begins with `bodyStart`, as a list. */
function selectorsOfRuleWith(css, bodyStart) {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const hit = rules.find(([, , body]) => body.trim().startsWith(bodyStart));
  return hit ? hit[1].split(",").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean) : null;
}

const DECK = "body.bi-theme:has(#bi-command-bar.bi-deck)";

test("Foundry's compact hotbar is still the layout this override undoes: the same selectors, a two-row height, a five-slot bar width", (t) => {
  const css = read(t, "public", "css", "foundry2.css");
  if (!css) return;
  const heightSelectors = selectorsOfRuleWith(css, "height: calc((var(--hotbar-size) * 2) + 8px);");
  assert.deepEqual(heightSelectors, ["#hotbar.compact", "#hotbar.md.offset", "#hotbar.sm"], "Foundry's compact hotbar height rule has new or different selectors: the deck's override has to cover them");
  const widthSelectors = selectorsOfRuleWith(css, "width: calc((var(--hotbar-size) * 5) + 32px);");
  assert.deepEqual(widthSelectors, ["#hotbar.compact #action-bar", "#hotbar.md.offset #action-bar", "#hotbar.sm #action-bar"], "Foundry's compact action-bar width rule has new or different selectors");
  assert.match(css, /#hotbar \{\s*--hotbar-size: 60px;[\s\S]*?width: max-content;/, "the hotbar's own width is no longer max-content, so a one-row bar may now wrap by itself");
  assert.match(css, /#hotbar #action-bar \{\s*flex: none;\s*width: auto;/);
});

test("the size classes are still the four the layout was checked against", (t) => {
  const hotbar = read(t, "client", "applications", "ui", "hotbar.mjs");
  if (!hotbar) return;
  const toggled = [...hotbar.matchAll(/this\.element\.classList\.toggle\("(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(toggled, ["lg", "md", "sm", "min"], "Foundry's hotbar toggles a different set of size classes: check the deck at the new sizes (tools/overlay-check/hotbar-check.mjs)");
  assert.match(hotbar, /classList\.toggle\("sm", effectiveWidth <= \(cameraDock \? 1680 : 1488\)\)/, "the width at which the hotbar goes compact moved");
});

test("the deck's stylesheet puts the hotbar back to one row for every one of Foundry's compact selectors", () => {
  for (const selector of ["#hotbar.compact", "#hotbar.md.offset", "#hotbar.sm"]) {
    assert.ok(bridge.includes(`${DECK} ${selector}`), `bi-foundry-bridge.css no longer overrides ${selector} for the deck`);
  }
  const rule = (selector) => new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(bridge)?.[1] ?? "";
  assert.match(rule(`${DECK} #hotbar.sm {`.replace(" {", "")), /height:\s*var\(--hotbar-size\)/, "the compact bar is no longer put back to one row's height");
  const bar = rule(`${DECK} #hotbar #action-bar`);
  assert.match(bar, /width:\s*auto/, "the compact bar width is no longer undone");
  assert.match(bar, /flex-wrap:\s*nowrap/, "the bar may wrap again, which lays the fifth slot and the right flank over the deck");
});
