/**
 * Which promoted location (if any) a draft item has become.
 *
 * The browser's only source of truth for this is /api/locations -- a draft
 * item is never mutated with lore, so there is nothing on the item itself to
 * read except the link. Two ways to follow it, checked in order: the item's
 * own `locationRef`, stamped by the server at promotion time
 * (server.py's _api_promote), or -- for anything promoted before that stamp
 * existed -- the location's own `sourceLocalId` provenance, which every
 * promotion has always carried regardless. Checking both is what lets this
 * work retroactively on locations promoted before the stamp shipped, the
 * same two-way match server.py's own handoff code makes.
 *
 * Pure: no I/O, no DOM. `locations` is whatever shape the caller already has
 * -- an array (straight from /api/locations), or a Map already keyed by id.
 */
export function resolvePromotedLocation(item, locations) {
  if (!item || !locations) return null;
  const list = locations instanceof Map ? [...locations.values()] : locations;

  if (item.locationRef) {
    const byId = list.find((loc) => loc.id === item.locationRef);
    if (byId) return byId;
  }
  return list.find((loc) => loc.sourceLocalId === item.localId) || null;
}

/**
 * What checkDepth/suggestDepth (core/depth.mjs) should actually be asked
 * about: the promoted location once one exists, never the draft item after
 * that point. A promoted item's draft note is frozen at whatever it said the
 * day it was promoted -- checking it instead of the location it became is
 * exactly the bug this module exists to close.
 */
export function depthSubject(item, locations) {
  return resolvePromotedLocation(item, locations) || item;
}
