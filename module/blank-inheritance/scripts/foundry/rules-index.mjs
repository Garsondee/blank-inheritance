/**
 * The Rules drawer's search index — the Foundry-touching half.
 *
 * `data/srd-index.json` is built by tools/rules-search/build-index.mjs from
 * the real reference/srd/ mirror (245 articles measured 2026-09-19) and
 * shipped as a real module asset — see that tool's own header for why a
 * derived index, not the raw mirror, is what ships. Cached in memory the
 * same way equipment-state.mjs caches its catalogue: it's read-only content
 * that never changes within a running world, so re-fetching it on every
 * drawer open would just be a slower version of the same answer.
 */

import { fetchModuleJson } from "./io.mjs";

const INDEX_PATH = "data/srd-index.json";

let indexCache = null;

/** Empty-but-valid index on failure (a fresh clone whose index hasn't been built/pushed yet), same honesty rule as equipment-state.mjs#loadCatalogue. */
export async function loadRulesIndex() {
  if (indexCache) return indexCache;
  try {
    indexCache = await fetchModuleJson(INDEX_PATH);
  } catch (err) {
    console.warn(`Blank Inheritance | No rules index at ${INDEX_PATH}; the Rules drawer will find nothing until it's built and pushed.`, err);
    indexCache = [];
  }
  return indexCache;
}

export function resetRulesIndexCache() {
  indexCache = null;
}
