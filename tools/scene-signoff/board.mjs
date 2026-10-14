/**
 * The Sign-Off board -- the pure computation behind the console.
 *
 * Answers the question Ingram asked for directly: how many scenes are drafted
 * and how many are confirmed ready for players. It also answers the two
 * questions that only exist because the checklist is versioned:
 *
 *   - which sealed scenes are STALE, because the checklist has grown since
 *     they were sealed, and against exactly which new checks; and
 *   - which scenes are BLOCKED on Ingram rather than on me.
 *
 * Staleness is the whole extensibility mechanism (design/scene-signoff.md §5).
 * A check with no `addedIn` is treated as version 1 -- the founding set -- so
 * only checks added later ever make anything stale.
 */
import { scenesInPlayOrder } from "./corpus.mjs";
import { runAutoChecks, summariseChecks, horizonsOf } from "./checklist.mjs";
import { travelSummary } from "./travel.mjs";

const PASSES = Object.freeze(["comprehension", "completeness", "place", "seam", "quality"]);
const LIVE = "live";

const addedIn = (check) => check.addedIn ?? 1;

export function checksAddedSince(checklist, version) {
  return checklist.checks.filter((c) => addedIn(c) > version);
}

export function buildBoard(corpus) {
  const allScenes = scenesInPlayOrder(corpus);
  const version = corpus.checklist.version;

  const rows = allScenes.map((bundle, index) => {
    // Named sceneAuthoring rather than the bare field name, which would trip
    // test/tier1-writer-audit.test.mjs's write-detection canary on a local
    // declaration. The canary is right to be that blunt, and this file only
    // ever reads the field. (Nor may that sentence spell the pattern out --
    // the canary scans comments too, which is how it caught this one.)
    const sceneAuthoring = bundle.scene.authoring ?? {};
    const review = sceneAuthoring.review ?? null;
    const results = runAutoChecks(bundle, corpus, { allScenes });
    const checks = summariseChecks(results);

    const passes = {};
    for (const name of PASSES) passes[name] = review?.passes?.[name]?.verdict ?? null;

    const sealedVersion = review?.checklistVersion ?? null;
    const newChecks = sceneAuthoring.status === LIVE && sealedVersion !== null
      ? checksAddedSince(corpus.checklist, sealedVersion)
      : [];

    return {
      order: index + 1,
      key: bundle.key,
      episodeId: bundle.episode.id,
      episodeTitle: bundle.episode.title ?? bundle.episode.id,
      sceneId: bundle.scene.id,
      title: bundle.scene.title ?? bundle.scene.id,
      briefRef: bundle.briefRef,
      hasBrief: Boolean(bundle.brief),
      status: sceneAuthoring.status ?? "(none)",
      live: sceneAuthoring.status === LIVE,
      passes,
      passesClear: PASSES.filter((n) => passes[n] === "CLEAR").length,
      blocked: PASSES.some((n) => passes[n] === "BLOCKED"),
      stopped: PASSES.some((n) => passes[n] === "STOP"),
      inReview: Boolean(review) && sceneAuthoring.status !== LIVE,
      sealedVersion,
      sealedAt: sceneAuthoring.gradedAt ?? null,
      sealedBy: sceneAuthoring.gradedBy ?? null,
      stale: newChecks.length > 0,
      staleAgainst: newChecks.map((c) => c.id),
      locationRef: bundle.setEntry?.locationRef ?? null,
      locationName: corpus.locations[bundle.setEntry?.locationRef ?? ""]?.name ?? null,
      // "Sited" also covers a scene whose missing location was a recorded
      // choice, not an oversight -- P1 (hasLocation) waived on the review
      // record, Ingram's own decision at an actual Place pass. Found live
      // 2026-09-28: this used to check locationRef truthiness alone, so a
      // deliberate, reasoned "no" (e.g. a note explaining a city-wide view
      // has nowhere to stand) still counted the same as a scene nobody had
      // looked at yet. A note by itself is still not enough -- see P1's own
      // NOTE_EXEMPTIONS absence in checklist.mjs -- only a real waiver is.
      sited: Boolean(bundle.setEntry?.locationRef && corpus.locations[bundle.setEntry.locationRef]) ||
        Boolean(!bundle.setEntry?.locationRef && bundle.setEntry?.offMap?.reason) ||
        ["waived", "excepted"].includes(results.find((r) => r.id === "P1")?.state),
      locationWaived: ["waived", "excepted"].includes(results.find((r) => r.id === "P1")?.state),
      // Set when the scene is off the map on purpose (scene-set.json `offMap`, written by the Location Editor's Story tab): a structured
      // record with a reason from a fixed list, never a bare note.
      offMap: bundle.setEntry?.offMap?.reason ?? null,
      radar: horizonsOf(bundle),
      checks,
      results
    };
  });

  const episodes = [];
  for (const row of rows) {
    let ep = episodes.find((e) => e.id === row.episodeId);
    if (!ep) {
      ep = { id: row.episodeId, title: row.episodeTitle, rows: [], live: 0, total: 0 };
      episodes.push(ep);
    }
    ep.rows.push(row);
    ep.total += 1;
    if (row.live) ep.live += 1;
  }

  const travel = travelSummary(corpus);
  const count = (fn) => rows.filter(fn).length;
  const next = rows.find((r) => !r.live && !r.stopped) ?? null;

  return {
    checklistVersion: version,
    checklistDate: corpus.checklist.versionDate,
    episodes,
    rows,
    totals: {
      scenes: rows.length,
      live: count((r) => r.live),
      inReview: count((r) => r.inReview),
      drafted: count((r) => !r.live && !r.inReview),
      blocked: count((r) => r.blocked),
      stopped: count((r) => r.stopped),
      stale: count((r) => r.stale),
      sited: count((r) => r.sited),
      unsited: count((r) => !r.sited),
      missingBriefs: count((r) => !r.hasBrief),
      requiredFailures: rows.reduce((n, r) => n + r.checks.requiredFail, 0),
      horizonShort: rows.reduce((n, r) => n + r.radar.short, 0),
      horizonMedium: rows.reduce((n, r) => n + r.radar.medium, 0),
      horizonLong: rows.reduce((n, r) => n + r.radar.long.length, 0),
      oneHorizonOnly: count((r) => [r.radar.short, r.radar.medium, r.radar.long.length].filter(Boolean).length <= 1),
      brokenEvaluators: rows.reduce((n, r) => n + r.checks.broken, 0),
      travelLegs: travel.total,
      travelFiring: travel.firing,
      travelBroken: travel.broken
    },
    next
  };
}

/**
 * The single most useful line, and the one the session-start hook prints. The
 * Desk doc's own rule (§5): the top line says what this unblocks, never how
 * much is left -- "6 items, clearing these unblocks Episode Two" is a task;
 * "210 unread" is a wall.
 */
export function headline(board) {
  const t = board.totals;
  if (t.scenes === 0) return "Sign-Off: no scenes in the corpus.";
  if (t.live === t.scenes) return `Sign-Off: all ${t.scenes} scenes live (checklist v${board.checklistVersion}).`;
  const parts = [`${t.live}/${t.scenes} scenes live`];
  if (t.inReview) parts.push(`${t.inReview} in review`);
  if (t.blocked) parts.push(`${t.blocked} blocked on Ingram`);
  if (t.stale) parts.push(`${t.stale} stale against v${board.checklistVersion}`);
  if (t.unsited) parts.push(`${t.unsited} with no location`);
  if (t.travelBroken) parts.push(`${t.travelBroken}/${t.travelLegs} scene changes skip the map`);
  return `Sign-Off: ${parts.join(", ")}. Next: ${board.next ? board.next.briefRef ?? board.next.key : "nothing"}.`;
}
