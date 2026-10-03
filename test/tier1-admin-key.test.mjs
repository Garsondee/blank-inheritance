// Tier 1 — where the admin key stands (module/blank-inheritance/scripts/core/admin-key.mjs).
//
// Ingram, 2026-10-01: a big red button on the right of the main screen, "to the
// right of the macro bar stuff but not where the chat toaster popups would
// appear". The numbers in the first tests were MEASURED in a live Foundry at
// 2560x1440 (sidebar collapsed and expanded), not made up; the sweep at the end
// holds the two promises (never over the macro bar, never in the toast column)
// across screen sizes and sidebar states the live check could not cover.
// The wiring is pinned in tier3-admin-contract.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMIN_KEY_FALLBACK_BOTTOM,
  ADMIN_KEY_GAP,
  ADMIN_KEY_SIZE,
  adminKeyPlacement
} from "../module/blank-inheritance/scripts/core/admin-key.mjs";

const W = 2560;
const H = 1440;
// Read off the live page, 2026-10-01: the macro bar (60px tall, bottom 254px up from the foot of the screen)...
const HOTBAR = { left: 680, right: 1832, top: 1126, bottom: 1186 };
// ...and the chat toast column, 300px wide, ending 93px above the macro bar.
const CHAT_COLLAPSED = { left: 2196, right: 2496, top: 16, bottom: 1033 };
const CHAT_EXPANDED = { left: 1896, right: 2196, top: 16, bottom: 1033 };

const keyRect = (p, size = ADMIN_KEY_SIZE, vw = W, vh = H) => ({
  left: vw - p.right - size,
  right: vw - p.right,
  top: vh - p.bottom - size,
  bottom: vh - p.bottom
});
const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

test("LIVE 2560x1440, sidebar collapsed: the key stands on the macro bar's baseline, beside the sidebar's tab strip", () => {
  const p = adminKeyPlacement({ viewportWidth: W, viewportHeight: H, sidebarLeft: 2512, hotbar: HOTBAR, chat: CHAT_COLLAPSED });
  assert.deepEqual(p, { right: 48 + ADMIN_KEY_GAP, bottom: 254, lifted: false, besideChat: false });
  const key = keyRect(p);
  assert.equal(key.bottom, HOTBAR.bottom, "its foot is the macro bar's foot");
  assert.ok(key.top - CHAT_COLLAPSED.bottom >= ADMIN_KEY_GAP, "clear of the foot of the toast column");
});

test("LIVE 2560x1440, sidebar open: the key stays at the sidebar's edge, and below where toasts can reach", () => {
  const p = adminKeyPlacement({ viewportWidth: W, viewportHeight: H, sidebarLeft: 2212, hotbar: HOTBAR, chat: CHAT_EXPANDED });
  assert.equal(p.right, W - 2212 + ADMIN_KEY_GAP);
  assert.equal(p.bottom, 254);
  assert.equal(p.lifted, false);
  assert.equal(p.besideChat, false, "toasts end well above the macro bar row, so there is no need to slide");
});

test("Ingram's own layout (scene runner open, sidebar open) puts the key where she drew it, with no lift", () => {
  // In her screenshot the macro bar's right end is at about x=2056 and the sidebar's edge at 2212.
  const hotbar = { left: 1000, right: 2056, top: 1126, bottom: 1186 };
  const p = adminKeyPlacement({ viewportWidth: W, viewportHeight: H, sidebarLeft: 2212, hotbar, chat: CHAT_EXPANDED });
  const key = keyRect(p);
  assert.equal(p.lifted, false);
  assert.ok(key.left >= 2076 && key.right <= 2212, `the key (${key.left}-${key.right}) sits in the gap between the macro bar's end and the sidebar`);
});

test("a macro bar that would run under the key lifts the key above it instead", () => {
  // Sidebar collapsed: home is x 2396-2492. A macro bar reaching 2420 (a narrow window) would run under it.
  const hotbar = { left: 1200, right: 2420, top: 1126, bottom: 1186 };
  const p = adminKeyPlacement({ viewportWidth: W, viewportHeight: H, sidebarLeft: 2512, hotbar, chat: CHAT_COLLAPSED });
  assert.equal(p.lifted, true);
  assert.equal(p.bottom, 254 + (hotbar.bottom - hotbar.top) + ADMIN_KEY_GAP);
  assert.ok(!intersects(keyRect(p), hotbar));
});

test("a lifted key that would rise into the toast column slides left to stand beside it", () => {
  const hotbar = { left: 1000, right: 2150, top: 1126, bottom: 1186 };
  const p = adminKeyPlacement({ viewportWidth: W, viewportHeight: H, sidebarLeft: 2212, hotbar, chat: CHAT_EXPANDED });
  assert.equal(p.lifted, true);
  assert.equal(p.besideChat, true);
  const key = keyRect(p);
  assert.ok(key.right <= CHAT_EXPANDED.left - ADMIN_KEY_GAP + 0.5, "its right edge is a gap short of the toast column");
  assert.ok(!intersects(key, CHAT_EXPANDED));
});

test("the size the key is drawn at (a token) is the size the placement leaves room for", () => {
  const tokens = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "module", "blank-inheritance", "styles", "bi-tokens.css"),
    "utf8"
  );
  assert.equal(Number(tokens.match(/--bi-akey-size:\s*(\d+)px/)?.[1]), ADMIN_KEY_SIZE, "bi-tokens.css and core/admin-key.mjs disagree about the key's size");
});

test("with nothing measurable it still gives a usable spot, and never throws", () => {
  assert.deepEqual(adminKeyPlacement({}), { right: ADMIN_KEY_GAP, bottom: ADMIN_KEY_FALLBACK_BOTTOM, lifted: false, besideChat: false });
  assert.deepEqual(adminKeyPlacement({ viewportWidth: NaN, viewportHeight: 1000 }).bottom, ADMIN_KEY_FALLBACK_BOTTOM);
  const bare = adminKeyPlacement({ viewportWidth: 1920, viewportHeight: 1080 });
  assert.equal(bare.right, ADMIN_KEY_GAP, "no sidebar to stand beside: the screen's own edge");
  assert.equal(bare.bottom, ADMIN_KEY_FALLBACK_BOTTOM, "no macro bar to stand on: the fixed baseline");
  // A zero-size rectangle is a hidden element, not furniture.
  const hidden = adminKeyPlacement({ viewportWidth: 1920, viewportHeight: 1080, hotbar: { left: 0, right: 0, top: 0, bottom: 0 }, chat: { left: 5, right: 5, top: 5, bottom: 5 } });
  assert.deepEqual(hidden, bare);
});

test("SWEEP: across screen sizes and sidebar states the key is never over the macro bar and never in the toast column", () => {
  let cases = 0;
  for (const [vw, vh] of [[1366, 768], [1600, 900], [1920, 1080], [2560, 1440], [3840, 2160]]) {
    const scale = Math.min(1.25, vw / 2000);
    const baseline = Math.round(vh - (196 * scale + 9));
    for (const sidebarOpen of [false, true]) {
      const sidebarLeft = vw - (sidebarOpen ? 348 : 48);
      // The toast column is 300px wide and stands 16px left of the sidebar, in either state (as measured live).
      const chatLeft = sidebarLeft - 316;
      const chat = { left: chatLeft, right: chatLeft + 300, top: 16, bottom: Math.round(vh - (196 * scale + 150)) };
      // The macro bar: ten slots and controls, centred on the free width, or pushed right by the scene runner.
      for (const runnerShare of [0, 0.25, 0.43]) {
        const free = sidebarLeft - vw * runnerShare;
        const width = Math.min(1152, free - 40);
        const left = vw * runnerShare + (free - width) / 2;
        const hotbar = { left, right: left + width, top: baseline - 60, bottom: baseline };
        const p = adminKeyPlacement({ viewportWidth: vw, viewportHeight: vh, sidebarLeft, hotbar, chat });
        const key = keyRect(p, ADMIN_KEY_SIZE, vw, vh);
        const where = `${vw}x${vh} sidebar ${sidebarOpen ? "open" : "collapsed"}, runner ${runnerShare}`;
        assert.ok(!intersects(key, hotbar), `${where}: the key ${JSON.stringify(key)} is over the macro bar ${JSON.stringify(hotbar)}`);
        assert.ok(!intersects(key, chat), `${where}: the key ${JSON.stringify(key)} is in the toast column ${JSON.stringify(chat)}`);
        assert.ok(key.left >= 0 && key.top >= 0 && key.right <= vw && key.bottom <= vh, `${where}: the key ${JSON.stringify(key)} is off the screen`);
        cases += 1;
      }
    }
  }
  assert.equal(cases, 30);
});
