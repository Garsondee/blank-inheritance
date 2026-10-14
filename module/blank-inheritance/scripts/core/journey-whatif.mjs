/**
 * "What would that do to the journeys?" (design/location-editor.md section 16): the same routes and checks as the Journeys tab, run on a placement that has not been
 * made yet, so the GM sees the consequence before confirming it.
 *
 *   whatIf       a placement staged in the Story (one slot, or several moved together): each journey it touches, before and after
 *   previewAt    a point under the cursor while a pin is being dropped: the journeys that would end there, planned to that spot
 *
 * Both reuse `planLeg`; nothing here has a rule of its own about what makes a journey good.
 */

import { buildStory, targetKey } from "./siting.mjs";
import { buildJourneyModel } from "./journey.mjs";
import { slotIndex } from "./story-lines.mjs";
import { endpointFromSlot, legBadge, placeIssues, planLeg, SEVERITY } from "./journey-checks.mjs";

const countOf = (result, severity) => (result?.issues ?? []).filter((i) => i.severity === severity).length;

/** What the panel shows of one planned leg. */
export function summariseLeg(result) {
  return {
    status: result?.status ?? "none",
    badge: legBadge(result),
    errors: countOf(result, "error"),
    warns: countOf(result, "warn"),
    infos: countOf(result, "info"),
    issues: (result?.issues ?? []).map(({ id, severity, text, hint }) => ({ id, severity, text, hint })),
    metres: result?.metres ?? 0,
    seconds: result?.seconds ?? 0,
    runs: result?.runs ?? [],
    from: result?.from ?? null,
    to: result?.to ?? null
  };
}

/** "better" | "worse" | "same": fewer errors, then fewer warnings, then (by a tenth or more) a shorter way. A leg that did not route is worse than one that did. */
export function compareLegs(before, after) {
  const routed = (s) => (s.status === "routed" || s.status === "same" ? 0 : 1);
  const rank = (s) => [routed(s), s.errors, s.warns];
  const a = rank(before);
  const b = rank(after);
  for (let i = 0; i < a.length; i++) {
    if (b[i] < a[i]) return "better";
    if (b[i] > a[i]) return "worse";
  }
  if (before.metres > 0 && after.metres > 0) {
    if (after.metres < before.metres * 0.9) return "better";
    if (after.metres > before.metres * 1.1) return "worse";
  }
  return "same";
}

/**
 * @param docs          the raw scene documents (core/siting.mjs)
 * @param locations     id -> `{ id, name, tier, kind }`
 * @param overrides     the placements waiting to be pulled, as the Story has them
 * @param newLocations  places drawn but not pulled, by record id
 * @param changes       what is staged: `[{ target, locationId | viaRecord | offMap }]`
 * @param deps          `{ pointOf, router, wayClass, landGrid, metresPerPixel }` (core/journey-checks.mjs#planLeg)
 * @returns `{ legs: [{ id, label, kind, before, after, change }], places: [issues of the places that would change], errors, warns, worse, better }`
 */
export function whatIf({ docs, locations, overrides = {}, newLocations = {}, changes, deps }) {
  const changed = new Set(changes.map((c) => targetKey(c.target)));
  const next = { ...overrides };
  for (const c of changes) {
    const key = targetKey(c.target);
    if (c.offMap) next[key] = { locationId: null, offMap: c.offMap, recordId: "what-if" };
    else if (c.viaRecord) next[key] = { viaRecord: c.viaRecord, recordId: "what-if" };
    else next[key] = { locationId: c.locationId ?? null, recordId: "what-if" };
  }
  const storyBefore = buildStory(docs, { locations, overrides, newLocations });
  const storyAfter = buildStory(docs, { locations, overrides: next, newLocations });
  const modelBefore = buildJourneyModel(storyBefore);
  const modelAfter = buildJourneyModel(storyAfter);
  const beforeById = new Map(modelBefore.legs.map((leg) => [leg.id, leg]));
  const touching = (leg) => changed.has(leg.from.slotKey) || changed.has(leg.to.slotKey) || (leg.settle?.slotKey && changed.has(leg.settle.slotKey));

  const legs = [];
  for (const leg of modelAfter.legs.filter(touching)) {
    const before = summariseLeg(beforeById.has(leg.id) ? planLeg(beforeById.get(leg.id), deps) : null);
    const after = summariseLeg(planLeg(leg, deps));
    legs.push({ id: leg.id, label: leg.label, kind: leg.kind, before, after, change: beforeById.has(leg.id) ? compareLegs(before, after) : "same" });
  }

  const afterIndex = slotIndex(storyAfter);
  const places = [];
  for (const key of changed) {
    const found = afterIndex.get(key);
    if (!found) continue;
    const end = endpointFromSlot(found.slot, found.row);
    const point = end.offMapReason || (!end.locationId && !end.viaRecord) ? null : deps.pointOf(end);
    for (const issue of placeIssues(end, { point, landGrid: deps.landGrid ?? null })) places.push({ ...issue, slotKey: key });
  }

  const errors = legs.reduce((n, l) => n + l.after.errors, 0) + places.filter((p) => p.severity === "error").length;
  const warns = legs.reduce((n, l) => n + l.after.warns, 0) + places.filter((p) => p.severity === "warn").length;
  return { legs, places, errors, warns, worse: legs.some((l) => l.change === "worse"), better: legs.some((l) => l.change === "better") };
}

/**
 * The journeys that would end at `point` if the slot `slotKey` were put there: every leg of `model` that starts or ends at the slot, planned with that end moved to
 * the point. Returns `[{ id, label, kind, side, summary }]` (`side` is which end of the leg the slot is); an empty list for a slot no journey touches.
 */
export function previewAt({ model, slotKey, point, deps }) {
  const HOVER = "hover-preview";
  const moved = { slotKey, rowKey: null, title: "the pin", label: "the pin", locationId: null, viaRecord: HOVER, state: "pending-new", name: "the pin", tier: "point", pending: true, offMapReason: null };
  const pointOf = (end) => (end.viaRecord === HOVER ? point : deps.pointOf(end));
  const out = [];
  for (const leg of model.legs) {
    const fromHere = leg.from.slotKey === slotKey;
    const toHere = leg.to.slotKey === slotKey;
    if (!fromHere && !toHere) continue;
    const swapped = { ...leg, from: fromHere ? { ...moved, rowKey: leg.from.rowKey, title: leg.from.title } : leg.from, to: toHere ? { ...moved, rowKey: leg.to.rowKey, title: leg.to.title } : leg.to, settle: null };
    out.push({ id: leg.id, label: leg.label, kind: leg.kind, side: toHere ? "to" : "from", summary: summariseLeg(planLeg(swapped, { ...deps, pointOf })) });
  }
  return out;
}

/** The worst severity among some summaries ("error" | "warn" | "info" | null). */
export function worstOf(summaries) {
  let worst = null;
  for (const s of summaries) for (const i of s.issues) if (SEVERITY[i.severity] > (SEVERITY[worst] ?? 0)) worst = i.severity;
  return worst;
}

/* ------------------------------------------------------------------ */
/*  The words                                                           */
/* ------------------------------------------------------------------ */

const MAX_LEGS_SHOWN = 8;
const badgeText = (summary) => (summary.status === "routed" ? [summary.badge.distance, summary.badge.time].filter(Boolean).join(" · ") : summary.badge.statusText || summary.status);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * A what-if result as the panel shows it: `{ summary: "better" | "worse" | "mixed" | "same", headline, legs, more, places }`. Each leg is `{ id, label, change, before, after, unchanged (the two are the same words),
 * issues: [{ severity, text }] }` (the problems of the journey AFTER the change; the ones that matter come first), `more` how many touched journeys are left out of a
 * short list, and `places` the problems of the new place itself.
 */
export function viewOfWhatIf(result) {
  if (!result) return null;
  const better = result.legs.filter((l) => l.change === "better").length;
  const worse = result.legs.filter((l) => l.change === "worse").length;
  const summary = better && worse ? "mixed" : worse ? "worse" : better ? "better" : "same";
  let headline;
  if (!result.legs.length) headline = "No journey touches this place.";
  else if (summary === "same") headline = result.errors || result.warns ? `${plural(result.legs.length, "journey")} touched, none better or worse; ${plural(result.errors + result.warns, "problem")} remain.` : `${plural(result.legs.length, "journey")} touched, and every one can be walked.`;
  else headline = [better ? `${plural(better, "journey")} better` : null, worse ? `${plural(worse, "journey")} worse` : null].filter(Boolean).join(", ");
  const rank = { worse: 0, better: 1, same: 2 };
  const ordered = [...result.legs].sort((a, b) => rank[a.change] - rank[b.change] || b.after.errors - a.after.errors);
  const legs = ordered.slice(0, MAX_LEGS_SHOWN).map((l) => ({
    id: l.id, label: l.label, change: l.change, before: badgeText(l.before), after: badgeText(l.after), unchanged: badgeText(l.before) === badgeText(l.after),
    issues: l.after.issues.filter((i) => i.severity !== "info").map((i) => ({ severity: i.severity, text: i.text }))
  }));
  return {
    summary, summaryClass: `bi-story__whatif--${summary}`, headline, legs, more: Math.max(0, ordered.length - legs.length),
    places: result.places.filter((p) => p.severity !== "info").map((p) => ({ severity: p.severity, text: p.text }))
  };
}
