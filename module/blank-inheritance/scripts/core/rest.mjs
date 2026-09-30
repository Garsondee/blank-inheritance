/**
 * A night's rest restores a fraction of maximum HP (canon/decisions/D050.md,
 * points 2, 3 and 11).
 *
 * Ingram, 2026-09-29: "Fractions of max HP ... I want to have less combat in
 * this adventure than the average adventure, therefore I want to make
 * injuries a little bit more scary ... It would be interesting to me and
 * hopefully to the players to have to decide between gambling on a buff in
 * their rest or doing the sensible sober thing and going to the hospital."
 *
 * A fraction of the sheet's own maximum scales with level by construction,
 * so a rest is as useful at level ten as at level one. The hospital is the
 * one full recovery. The numbers are to be tested and balanced in play.
 */

export const REST_GRADES = Object.freeze({
  quarter: Object.freeze({ id: "quarter", fraction: 0.25, labelKey: "BLANKINHERITANCE.Runner.Rest.quarter" }),
  half: Object.freeze({ id: "half", fraction: 0.5, labelKey: "BLANKINHERITANCE.Runner.Rest.half" }),
  "three-quarters": Object.freeze({ id: "three-quarters", fraction: 0.75, labelKey: "BLANKINHERITANCE.Runner.Rest.threeQuarters" }),
  full: Object.freeze({ id: "full", fraction: 1, labelKey: "BLANKINHERITANCE.Runner.Rest.full" })
});

export const REST_GRADE_IDS = Object.freeze(Object.keys(REST_GRADES));

/** A brief's rest, or null when the scene is not a rest. */
export function restOf(brief) {
  const grade = REST_GRADES[brief?.rest?.hp];
  if (!grade) return null;
  return { grade, buff: typeof brief.rest.buff === "string" && brief.rest.buff ? brief.rest.buff : null };
}

/**
 * What one character's HP becomes after a rest of this grade: the fraction
 * of maximum, rounded down, added to what they have, never past maximum and
 * never taking anything away. At least 1 HP, so a rest is never nothing.
 */
export function restHealing({ value, max }, gradeId) {
  const grade = REST_GRADES[gradeId];
  const top = Number.isFinite(max) && max > 0 ? Math.floor(max) : 0;
  const now = Math.max(0, Math.min(top, Number.isFinite(value) ? Math.floor(value) : 0));
  if (!grade || !top) return { from: now, to: now, gained: 0 };
  const amount = grade.fraction >= 1 ? top : Math.max(1, Math.floor(top * grade.fraction));
  const to = Math.min(top, now + amount);
  return { from: now, to, gained: to - now };
}
