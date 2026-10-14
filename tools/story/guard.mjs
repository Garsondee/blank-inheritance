// The timeline's reversion guard, for tools outside canon's own check (design/plot-timeline.md §5, D070): `npm run
// deploy` refuses while canon holds older words than the ones Ingram set on the timeline, as it refuses for her Scene
// Runner edits. `story check` runs the same rule (tools/story/lib.mjs#checkModel).
import { ROOT, loadModel, itemIndex } from "./lib.mjs";
import { findTimelineReversions } from "./daybook.mjs";

/** @returns {Array<{ id, field, record, expected, found }>} every place older words came back over hers */
export function checkTimelineReversions(root = ROOT) {
  const model = loadModel(root);
  return findTimelineReversions(model, itemIndex(model));
}
