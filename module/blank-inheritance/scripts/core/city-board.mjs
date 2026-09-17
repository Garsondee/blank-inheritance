/**
 * The city board — pure logic only.
 *
 * V1's own map screen (design/ui/console.js's MARKERS array) placed
 * location pins over a background image using exactly the geometry
 * core/marker-layout.mjs already provides (placeMarker/layoutMarkers — an
 * anchor dot, a card that finds a nearby free spot, a stem joining them).
 * That placement engine is untouched and already tested; this file is the
 * small, genuinely-new piece — turning a location's fractional map position
 * and a viewport size into the {id, anchor, size, priority} shape
 * layoutMarkers expects, and reading back a risk band's printed colour.
 *
 * See ideas/entries/city-map-location-board.json for why this stops at a
 * pure layout function and a demo dataset rather than a live Foundry
 * feature: there is no real campaign location data yet to point pins at.
 */

import { layoutMarkers, visibleBand } from "./marker-layout.mjs";

/** Five steps, amber from 3 up, vermilion at 5 — the same read the deck's own key pips use. */
export function riskTone(risk) {
  const r = Math.max(0, Math.min(5, Math.round(Number(risk) || 0)));
  if (r >= 4) return "danger";
  if (r >= 3) return "warn";
  return "ok";
}

/**
 * Every location placed on the board.
 *
 * `locations` items: {id, name, code, x, y (fractions of the board, 0..1),
 * status, risk (0-5), detail}. `viewport` is {width, height} in the SAME
 * pixel space the caller will actually render in — the board scales the
 * whole panel as one object (deckFit's own approach), so this is called
 * with the board's own authored size, not the real window.
 */
export function cityBoardLayout(locations = [], viewport, opts = {}) {
  const { cardWidth = 220, cardHeight = 120, topRail = 0, chassis = 0 } = opts;
  const bounds = visibleBand({ width: viewport.width, height: viewport.height, topRail, chassis });

  const items = locations.map((loc, index) => ({
    id: loc.id,
    anchor: { x: loc.x * viewport.width, y: loc.y * viewport.height },
    size: { w: cardWidth, h: cardHeight },
    // Earlier entries hold their preferred spot when two cards would
    // otherwise collide — the same "who stays put" rule layoutMarkers itself
    // already implements, keyed here by authoring order.
    priority: locations.length - index
  }));

  const placed = layoutMarkers(items, bounds, [], {});
  const byId = new Map(placed.map((p) => [p.id, p]));

  return locations.map((loc) => {
    const p = byId.get(loc.id);
    return {
      ...loc,
      tone: riskTone(loc.risk),
      dot: { x: Math.round(loc.x * viewport.width), y: Math.round(loc.y * viewport.height) },
      card: p ? { x: Math.round(p.x), y: Math.round(p.y), side: p.side } : null,
      stem: p?.stem ?? null
    };
  });
}
