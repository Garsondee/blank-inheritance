/**
 * The timeline's segments (design/plot-timeline.md §4, D070): one strip of eras, each with its own plain scale, and a
 * labelled break between them, so thirty thousand years and one evening can sit on the same page. Screen layout, not
 * story: these live here, never in canon.
 *
 * Positions come from timeline-when.mjs: `{ scale: "days", at }` for the past and the episodes (days from the start of
 * Day 1 of intake), `{ scale: "chapters", at }` for the campaign ahead.
 */
import { UNIT_DAYS } from "./timeline-when.mjs";

const Y = UNIT_DAYS.year;

/** Era bounds. `days` eras run [from, to) in days; the last runs in chapters. `unit` is what its ticks count. */
export const ERAS = Object.freeze([
  { id: "deep-past", label: "The deep past", unit: "years", scale: "days", from: -Infinity, to: -300 * Y },
  { id: "old-campaign", label: "The old campaign and the founding", unit: "years", scale: "days", from: -300 * Y, to: -100 * Y },
  { id: "living-memory", label: "Living memory", unit: "years", scale: "days", from: -100 * Y, to: -90 },
  { id: "this-spring", label: "This spring", unit: "weeks", scale: "days", from: -90, to: -1 },
  { id: "episodes", label: "Episodes One and Two", unit: "days", scale: "days", from: -1, to: 3 },
  { id: "ahead", label: "The campaign ahead", unit: "chapters", scale: "chapters", from: 2, to: 21 },
]);

/** Which era a position falls in (null for an open date: each candidate has its own). */
export function eraOf(position, eras = ERAS) {
  if (!position || position.scale === "candidates") return null;
  if (position.scale === "chapters") {
    // Chapter 1 is Episodes One and Two: a chapter-1 date falls in the episodes.
    if (position.at < 2) return eras.find((e) => e.id === "episodes") || null;
    return eras.find((e) => e.scale === "chapters" && position.at >= e.from && position.at < e.to) || eras[eras.length - 1];
  }
  const dayEras = eras.filter((e) => e.scale === "days");
  if (position.at >= dayEras[dayEras.length - 1].to) return dayEras[dayEras.length - 1];
  return dayEras.find((e) => position.at >= e.from && position.at < e.to) || dayEras[0];
}

/** A chapter-scale position in chapter 1 mapped into the episodes' days (chapter 1 runs over days 0 to 3). */
export function chapterOneToDays(at) {
  return -1 + (at - 1) * 4;
}
