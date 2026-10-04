/**
 * What the table has been told so far -- pure, no Foundry.
 *
 * "What do we know about the founders?" gets asked at every table, usually
 * by a player who was getting a drink when it was said. The canon tree
 * already records which facts every beat says out loud (a beat's `facts`,
 * canon/README.md); `node tools/story/story.mjs build` writes their words to
 * data/campaign/told-facts.json; and the Runner knows which beats have
 * happened. This puts the three together (2026-10-04): every fact told so far
 * this episode, scene by scene, in the order they were told, so the answer is
 * the same every time and nobody has to remember it.
 *
 * Only `facts` ever appear here, never `gmFacts`: those are what a beat
 * relies on, and the table is never told them.
 */

/**
 * The facts told so far, grouped by scene in episode order.
 *
 *   order   the episode's scenes in running order: [{ briefRef, title }]
 *   briefs  brief id -> the scene brief (its beats carry `facts`)
 *   runs    brief id -> run state (a beat in `ticked` has happened)
 *   facts   fact id -> { text } from told-facts.json
 *
 * A fact told twice is listed where it was first told. A fact id with no
 * words (told-facts.json is older than the scene) still shows, by its id,
 * rather than vanishing.
 */
export function toldSoFar({ order = [], briefs = {}, runs = {}, facts = {} } = {}) {
  const seen = new Set();
  const groups = [];
  for (const scene of order) {
    const brief = briefs?.[scene.briefRef];
    const ticked = runs?.[scene.briefRef]?.ticked ?? {};
    if (!brief) continue;
    const items = [];
    for (const beat of brief.beats ?? []) {
      if (!ticked[beat.id]) continue;
      for (const id of beat.facts ?? []) {
        if (seen.has(id)) continue;
        seen.add(id);
        items.push({ id, text: facts?.[id]?.text ?? id, beatId: beat.id });
      }
    }
    if (items.length) groups.push({ briefRef: scene.briefRef, title: scene.title ?? brief.title ?? scene.briefRef, items });
  }
  return groups;
}

/** How many facts a grouped list holds, for the drawer's count. */
export function toldCount(groups = []) {
  return groups.reduce((sum, group) => sum + (group.items?.length ?? 0), 0);
}
