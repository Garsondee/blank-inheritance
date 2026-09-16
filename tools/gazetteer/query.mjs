#!/usr/bin/env node
/**
 * Stage 6's other half: "what is at this reference?" without loading the
 * whole corpus by hand.
 *
 * Every other tool this session reached for to answer that question was a
 * throwaway Python script reading data/locations/*.json fresh each time --
 * this replaces that with one real, tested command:
 *
 *   node tools/gazetteer/query.mjs --at C3.44
 *   node tools/gazetteer/query.mjs --near the-old-landing --limit 5
 *   node tools/gazetteer/query.mjs --kind district --status needs-lore
 *
 * Filters compose (an --at plus a --kind narrows both ways) and --near sorts
 * by straight-line pixel distance from the named location's own centroid --
 * real road-graph routing is future work the original plan already flagged
 * as a separate, bigger piece, not something to fake here.
 *
 * The matching logic is exported and pure (no fs) so it can be tested
 * against fixture data directly; only the bottom of this file touches disk.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Locations whose own `derived.cells` includes this grid reference exactly. */
export function findAt(locations, ref) {
  if (!ref) return locations;
  return locations.filter((loc) => (loc.derived?.cells || []).includes(ref));
}

/** Every OTHER location, nearest-first by straight-line pixel distance from
 * `id`'s own centroid. Throws if `id` is not in the corpus -- a typo'd id
 * silently returning everything, unsorted, would look like a working query
 * that just happened to return the whole map. */
export function findNear(locations, id, limit = 10) {
  const origin = locations.find((loc) => loc.id === id);
  if (!origin) throw new Error(`no location ${JSON.stringify(id)} in the corpus`);
  const [ox, oy] = origin.derived?.centroidPx || [];
  if (ox === undefined) throw new Error(`${id} has no derived.centroidPx to measure from`);
  return locations
    .filter((loc) => loc.id !== id)
    .map((loc) => {
      const [x, y] = loc.derived?.centroidPx || [];
      const distancePx = x === undefined ? Infinity : Math.hypot(x - ox, y - oy);
      return { loc, distancePx };
    })
    .filter((entry) => Number.isFinite(entry.distancePx))
    .sort((a, b) => a.distancePx - b.distancePx)
    .slice(0, limit)
    .map((entry) => entry.loc);
}

export function filterByKind(locations, kind) {
  return kind ? locations.filter((loc) => loc.kind === kind) : locations;
}

export function filterByStatus(locations, status) {
  return status ? locations.filter((loc) => loc.authoring?.status === status) : locations;
}

/** Every filter that was actually asked for, applied together. `near` is
 * resolved against the FULL corpus (an id near the edge of a --kind filter
 * still needs the whole map to find its real neighbours) and then the other
 * filters narrow that result -- so `--near X --kind site` means "sites near
 * X", not "the nearest thing to X, which happens to also be a site or not". */
export function runQuery(locations, { at, near, kind, status, limit = 10 } = {}) {
  let results = near ? findNear(locations, near, Math.max(limit, locations.length)) : locations;
  results = findAt(results, at);
  results = filterByKind(results, kind);
  results = filterByStatus(results, status);
  return results.slice(0, limit);
}

function parseArgs(argv) {
  const args = { limit: 10 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--at') args.at = argv[++i];
    else if (a === '--near') args.near = argv[++i];
    else if (a === '--kind') args.kind = argv[++i];
    else if (a === '--status') args.status = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--json') args.json = true;
  }
  return args;
}

function loadCorpus(locationsDir) {
  return readdirSync(locationsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(locationsDir, f), 'utf8')));
}

function formatLine(loc) {
  const ref = loc.derived?.ref || '?';
  const name = loc.name || `(unnamed ${loc.tier})`;
  const status = loc.authoring?.status || 'unknown';
  return `${ref}  ${loc.id.padEnd(28)} ${name.padEnd(32)} ${loc.tier}/${loc.kind || '?'}  [${status}]`;
}

// pathToFileURL, not a hand-built "file://" + argv[1] string: on Windows a
// space in the real path ("Blank Inheritance") is %20-encoded in
// import.meta.url but not in argv[1], and the drive-letter form needs a
// third slash ("file:///E:/...") that a naive concatenation does not add --
// either mismatch means this check silently never fires and the CLI prints
// nothing at all, found by actually running it rather than trusting the unit
// tests, which never exercise this branch.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const locationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'locations');
  const locations = loadCorpus(locationsDir);
  let results;
  try {
    results = runQuery(locations, args);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else if (!results.length) {
    console.log('no matches');
  } else {
    results.forEach((loc) => console.log(formatLine(loc)));
    console.log(`\n${results.length} of ${locations.length} locations`);
  }
}
