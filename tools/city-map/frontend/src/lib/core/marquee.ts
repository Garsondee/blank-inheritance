/**
 * Pure geometry for map-editor plan Phase 14's marquee multi-select --
 * "if I drag click it should create a selection marquee and if that
 * touches a line belonging to a polygon then include that whole polygon
 * in the selection" (the user's own words, verbatim). No maplibre-gl/
 * svelte/window/document import -- same tier0 split every other
 * core/*.ts module follows.
 *
 * "Touches" means touching ANY boundary segment of a feature includes the
 * WHOLE feature -- not full-containment. A marquee that only grazes one
 * edge of a huge polygon still selects that entire polygon.
 *
 * Screen-space pixels throughout (App.svelte converts a marquee drag's
 * pixel rect and every candidate feature's own screen-projected segments
 * before calling into this module) -- this module knows nothing about
 * MapLibre projection, lon/lat, or the frame's source CRS.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Two drag corners, in any order/direction -- normalized to a proper
 * min/max rect regardless of which corner the drag started from. */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

function pointInRect(p: Point, rect: Rect): boolean {
  return p.x >= rect.minX && p.x <= rect.maxX && p.y >= rect.minY && p.y <= rect.maxY;
}

function onSegment(a: Point, b: Point, p: Point): boolean {
  return (
    Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y)
  );
}

function cross(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Standard orientation-based segment intersection test, including the
 * collinear-touching edge cases (a segment that ends exactly ON the other
 * segment, or passes exactly through its endpoint -- the "touching a
 * corner" case a marquee edge needs to catch too). */
function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;
  return false;
}

/** Does the segment a->b touch rect at all -- either endpoint inside
 * (including exactly on its border, a closed rect), or the segment
 * crosses one of the rect's 4 edges. A complete test for a convex
 * rectangle against any segment, including a degenerate zero-length one
 * (a === b), which is just a point test at that point. */
export function rectIntersectsSegment(rect: Rect, a: Point, b: Point): boolean {
  if (pointInRect(a, rect) || pointInRect(b, rect)) return true;
  const topLeft = { x: rect.minX, y: rect.minY };
  const topRight = { x: rect.maxX, y: rect.minY };
  const bottomRight = { x: rect.maxX, y: rect.maxY };
  const bottomLeft = { x: rect.minX, y: rect.maxY };
  return (
    segmentsIntersect(a, b, topLeft, topRight) ||
    segmentsIntersect(a, b, topRight, bottomRight) ||
    segmentsIntersect(a, b, bottomRight, bottomLeft) ||
    segmentsIntersect(a, b, bottomLeft, topLeft)
  );
}

export interface FeatureSegments {
  id: string;
  segments: [Point, Point][];
}

/** Every feature id whose boundary is touched anywhere by rect -- touching
 * ANY ONE segment includes the WHOLE feature (the user's own "if that
 * touches a line belonging to a polygon then include that whole polygon"),
 * not full-containment of every segment. */
export function featureIdsTouchedByRect(perFeatureSegments: FeatureSegments[], rect: Rect): Set<string> {
  const touched = new Set<string>();
  for (const { id, segments } of perFeatureSegments) {
    for (const [a, b] of segments) {
      if (rectIntersectsSegment(rect, a, b)) {
        touched.add(id);
        break;
      }
    }
  }
  return touched;
}
