import { describe, expect, test } from "vitest";
import {
  extractMidpoints,
  extractRoadJunctions,
  extractSegments,
  extractVertices,
  nearestInPoints,
  nearestOnLines,
  nearestPointOnSegment,
  pickSnapPosition,
  referenceCoordinateForOrtho,
  SNAP_PRIORITY,
  snapToGrid,
  snapToOrtho,
  type Point,
} from "./snap";

describe("nearestInPoints", () => {
  test("returns the closest point within tolerance", () => {
    const points: Point[] = [
      { x: 10, y: 0 },
      { x: 2, y: 0 },
      { x: 5, y: 0 },
    ];
    expect(nearestInPoints({ x: 0, y: 0 }, points, 100)).toEqual({ x: 2, y: 0 });
  });

  test("null when nothing is within tolerance", () => {
    const points: Point[] = [{ x: 50, y: 0 }];
    expect(nearestInPoints({ x: 0, y: 0 }, points, 10)).toBeNull();
  });

  test("exactly at tolerance boundary counts as a hit", () => {
    const points: Point[] = [{ x: 10, y: 0 }];
    expect(nearestInPoints({ x: 0, y: 0 }, points, 10)).toEqual({ x: 10, y: 0 });
  });

  test("empty candidate list returns null", () => {
    expect(nearestInPoints({ x: 0, y: 0 }, [], 100)).toBeNull();
  });
});

describe("nearestPointOnSegment", () => {
  test("projects perpendicularly onto the middle of a segment", () => {
    const result = nearestPointOnSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(result).toEqual({ x: 5, y: 0 });
  });

  test("clamps to the start when the projection falls before it", () => {
    const result = nearestPointOnSegment({ x: -5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(result).toEqual({ x: 0, y: 0 });
  });

  test("clamps to the end when the projection falls past it", () => {
    const result = nearestPointOnSegment({ x: 15, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(result).toEqual({ x: 10, y: 0 });
  });

  test("a zero-length segment returns its own single point, not NaN", () => {
    const result = nearestPointOnSegment({ x: 5, y: 5 }, { x: 2, y: 2 }, { x: 2, y: 2 });
    expect(result).toEqual({ x: 2, y: 2 });
  });
});

describe("nearestOnLines", () => {
  test("finds the nearest point along any segment, not just endpoints", () => {
    const segments: [Point, Point][] = [[{ x: 0, y: 0 }, { x: 100, y: 0 }]];
    const hit = nearestOnLines({ x: 50, y: 3 }, segments, 10);
    expect(hit).toEqual({ x: 50, y: 0 });
  });

  test("picks the closest segment among several", () => {
    const segments: [Point, Point][] = [
      [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      [{ x: 0, y: 5 }, { x: 10, y: 5 }],
    ];
    const hit = nearestOnLines({ x: 5, y: 4 }, segments, 10);
    expect(hit).toEqual({ x: 5, y: 5 });
  });

  test("null when every segment is beyond tolerance", () => {
    const segments: [Point, Point][] = [[{ x: 0, y: 100 }, { x: 10, y: 100 }]];
    expect(nearestOnLines({ x: 0, y: 0 }, segments, 5)).toBeNull();
  });
});

describe("snapToGrid", () => {
  test("snaps to the nearest lattice intersection", () => {
    expect(snapToGrid({ x: 23, y: 47 }, { x: 0, y: 0 }, 10)).toEqual({ x: 20, y: 50 });
  });

  test("respects a non-zero origin", () => {
    expect(snapToGrid({ x: 24, y: 24 }, { x: 5, y: 5 }, 10)).toEqual({ x: 25, y: 25 });
  });

  test("spacing <= 0 disables grid snap, returning the cursor unchanged", () => {
    const cursor = { x: 23.4, y: 47.1 };
    expect(snapToGrid(cursor, { x: 0, y: 0 }, 0)).toEqual(cursor);
    expect(snapToGrid(cursor, { x: 0, y: 0 }, -5)).toEqual(cursor);
  });
});

describe("snapToOrtho", () => {
  test("snaps a near-horizontal drag to exactly horizontal, preserving distance", () => {
    const reference = { x: 0, y: 0 };
    const cursor = { x: 10, y: 1 }; // a few degrees off horizontal
    const result = snapToOrtho(cursor, reference, 45);
    const realDistance = Math.hypot(cursor.x - reference.x, cursor.y - reference.y);
    const snappedDistance = Math.hypot(result.x - reference.x, result.y - reference.y);
    expect(result.y).toBeCloseTo(0, 6);
    // REGRESSION (mirrors this project's OLD Leaflet editor's own hard-won
    // fix): ortho snap must preserve the cursor's REAL raw distance from
    // the reference point, never substitute the distance a naive
    // position-snap would produce.
    expect(snappedDistance).toBeCloseTo(realDistance, 6);
  });

  test("22.5 degree steps land on the expected angles", () => {
    const reference = { x: 0, y: 0 };
    // ~20 degrees should snap to the 22.5 degree step, not to 0 or 45.
    const cursor = { x: Math.cos((20 * Math.PI) / 180) * 10, y: Math.sin((20 * Math.PI) / 180) * 10 };
    const result = snapToOrtho(cursor, reference, 22.5);
    const angleDeg = (Math.atan2(result.y, result.x) * 180) / Math.PI;
    expect(angleDeg).toBeCloseTo(22.5, 6);
  });

  test("zero distance from the reference returns the cursor unchanged, not NaN", () => {
    const reference = { x: 5, y: 5 };
    expect(snapToOrtho({ x: 5, y: 5 }, reference, 45)).toEqual({ x: 5, y: 5 });
  });

  test("stepDeg <= 0 disables ortho snap", () => {
    const cursor = { x: 10, y: 1 };
    expect(snapToOrtho(cursor, { x: 0, y: 0 }, 0)).toEqual(cursor);
  });
});

describe("SNAP_PRIORITY", () => {
  test("matches the map-editor plan's own fixed order", () => {
    expect(SNAP_PRIORITY).toEqual(["vertex", "junction", "midpoint", "ghost", "segment", "grid", "ortho"]);
  });
});

describe("pickSnapPosition", () => {
  test("a higher-priority tier wins even when a lower-priority candidate is numerically closer", () => {
    const cursor = { x: 0, y: 0 };
    const sources = {
      vertices: [{ x: 9, y: 0 }], // farther, but higher priority
      midpoints: [{ x: 1, y: 0 }], // closer, but lower priority
    };
    const result = pickSnapPosition(cursor, sources, { tolerancePx: 20 });
    expect(result).toEqual({ point: { x: 9, y: 0 }, kind: "vertex" });
  });

  test("falls through to the next tier when the higher one has no candidate in tolerance", () => {
    const cursor = { x: 0, y: 0 };
    const sources = {
      vertices: [{ x: 100, y: 0 }], // out of tolerance
      junctions: [{ x: 5, y: 0 }],
    };
    const result = pickSnapPosition(cursor, sources, { tolerancePx: 10 });
    expect(result).toEqual({ point: { x: 5, y: 0 }, kind: "junction" });
  });

  test("ghost lines win over plain segments when both are in tolerance", () => {
    const cursor = { x: 5, y: 1 };
    const sources = {
      ghostLines: [[{ x: 0, y: 0 }, { x: 10, y: 0 }]] as [Point, Point][],
      segments: [[{ x: 0, y: 0.5 }, { x: 10, y: 0.5 }]] as [Point, Point][],
    };
    const result = pickSnapPosition(cursor, sources, { tolerancePx: 10 });
    expect(result?.kind).toBe("ghost");
  });

  test("grid is the fallback when nothing else is close and grid is enabled", () => {
    const cursor = { x: 23, y: 47 };
    const result = pickSnapPosition(cursor, {}, { tolerancePx: 5, grid: { originPx: { x: 0, y: 0 }, spacingPx: 10 } });
    expect(result).toEqual({ point: { x: 20, y: 50 }, kind: "grid" });
  });

  test("ortho is checked after grid", () => {
    const cursor = { x: 10, y: 1 };
    const result = pickSnapPosition(
      cursor,
      {},
      { tolerancePx: 5, ortho: { referencePx: { x: 0, y: 0 }, stepDeg: 45 } },
    );
    expect(result?.kind).toBe("ortho");
  });

  test("null when nothing matches and no grid/ortho fallback is configured", () => {
    const result = pickSnapPosition({ x: 0, y: 0 }, { vertices: [{ x: 100, y: 100 }] }, { tolerancePx: 5 });
    expect(result).toBeNull();
  });

  test("empty sources object with no fallback returns null, not a crash", () => {
    expect(pickSnapPosition({ x: 0, y: 0 }, {}, { tolerancePx: 5 })).toBeNull();
  });
});

describe("referenceCoordinateForOrtho", () => {
  test("a LineString's middle vertex references its immediate predecessor", () => {
    const line = { type: "LineString" as const, coordinates: [[0, 0], [1, 1], [2, 2]] as [number, number][] };
    expect(referenceCoordinateForOrtho(line, 1)).toEqual([0, 0]);
    expect(referenceCoordinateForOrtho(line, 2)).toEqual([1, 1]);
  });

  test("a LineString's own first vertex has no predecessor -- null, not wrap-around", () => {
    const line = { type: "LineString" as const, coordinates: [[0, 0], [1, 1], [2, 2]] as [number, number][] };
    expect(referenceCoordinateForOrtho(line, 0)).toBeNull();
  });

  test("a Polygon ring's closing duplicate point is collapsed -- index 0 and the last index are the SAME real vertex", () => {
    // A square ring: [0,0] -> [10,0] -> [10,10] -> [0,10] -> [0,0] (closed,
    // index 4 duplicates index 0). Real vertex count is 4, not 5.
    const ring: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const polygon = { type: "Polygon" as const, coordinates: [ring] };
    // Dragging index 1 ([10,0]) should reference index 0 ([0,0]).
    expect(referenceCoordinateForOrtho(polygon, 1)).toEqual([0, 0]);
    // Dragging index 0 (the shared start/close point) should wrap to the
    // real previous vertex, [0,10] (index 3), NOT the duplicate at index 4.
    expect(referenceCoordinateForOrtho(polygon, 0)).toEqual([0, 10]);
    // Dragging the closing duplicate (index 4) is the SAME real vertex as
    // index 0, so it must reference the same real predecessor, [0,10].
    expect(referenceCoordinateForOrtho(polygon, 4)).toEqual([0, 10]);
  });

  test("an out-of-range index returns null rather than an incorrect guess", () => {
    const line = { type: "LineString" as const, coordinates: [[0, 0], [1, 1]] as [number, number][] };
    expect(referenceCoordinateForOrtho(line, 5)).toBeNull();
    expect(referenceCoordinateForOrtho(line, -1)).toBeNull();
  });

  test("a degenerate ring with too few real vertices returns null", () => {
    const point = { type: "LineString" as const, coordinates: [[0, 0]] as [number, number][] };
    expect(referenceCoordinateForOrtho(point, 0)).toBeNull();
  });
});

describe("extractVertices", () => {
  test("collects every coordinate from a Polygon, including holes", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
          [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]],
        ],
      },
    };
    const vertices = extractVertices([feature]);
    expect(vertices.length).toBe(10);
    expect(vertices).toContainEqual([2, 2]); // a hole's own vertex, not just the exterior
  });

  test("collects from a GeometryCollection recursively", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: [1, 1] },
          { type: "LineString", coordinates: [[2, 2], [3, 3]] },
        ],
      },
    };
    expect(extractVertices([feature])).toEqual([[1, 1], [2, 2], [3, 3]]);
  });
});

describe("extractSegments", () => {
  test("a 3-point LineString yields exactly 2 segments", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[0, 0], [1, 1], [2, 0]] },
    };
    const segments = extractSegments([feature]);
    expect(segments).toEqual([
      [[0, 0], [1, 1]],
      [[1, 1], [2, 0]],
    ]);
  });

  test("a closed Polygon ring's last-to-first segment is included", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] },
    };
    const segments = extractSegments([feature]);
    expect(segments.length).toBe(3);
    expect(segments[2]).toEqual([[10, 10], [0, 0]]);
  });
});

describe("extractMidpoints", () => {
  test("the midpoint of a single straight segment", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[0, 0], [10, 0]] },
    };
    expect(extractMidpoints([feature])).toEqual([[5, 0]]);
  });
});

describe("extractRoadJunctions", () => {
  function road(id: string, coords: [number, number][]): GeoJSON.Feature {
    return {
      type: "Feature",
      id,
      properties: { id, tags: { highway: "residential" } },
      geometry: { type: "LineString", coordinates: coords },
    };
  }

  test("a coordinate shared by two distinct roads is a junction", () => {
    const a = road("a", [[0, 0], [10, 0]]);
    const b = road("b", [[10, 0], [10, 10]]);
    expect(extractRoadJunctions([a, b])).toEqual([[10, 0]]);
  });

  test("a T-junction (shared point is a MIDDLE vertex of one road) is still detected", () => {
    const through = road("through", [[0, 5], [10, 5], [20, 5]]);
    const spur = road("spur", [[10, 5], [10, 15]]);
    expect(extractRoadJunctions([through, spur])).toEqual([[10, 5]]);
  });

  test("a single road looping back through its own start point is NOT a junction", () => {
    const loop = road("loop", [[0, 0], [10, 0], [10, 10], [0, 0]]);
    expect(extractRoadJunctions([loop])).toEqual([]);
  });

  test("a vertex touched by only one road is not a junction", () => {
    const a = road("a", [[0, 0], [10, 0]]);
    expect(extractRoadJunctions([a])).toEqual([]);
  });

  test("non-road features (no highway tag) are ignored entirely", () => {
    const buildingLikeLine: GeoJSON.Feature = {
      type: "Feature",
      id: "fence",
      properties: { id: "fence", tags: { barrier: "fence" } },
      geometry: { type: "LineString", coordinates: [[0, 0], [10, 0]] },
    };
    const a = road("a", [[0, 0], [5, 5]]);
    expect(extractRoadJunctions([buildingLikeLine, a])).toEqual([]);
  });
});
