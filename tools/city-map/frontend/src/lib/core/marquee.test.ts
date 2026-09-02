import { describe, expect, test } from "vitest";
import {
  featureIdsTouchedByRect,
  rectFromPoints,
  rectIntersectsSegment,
  type FeatureSegments,
} from "./marquee";

describe("rectFromPoints", () => {
  test("top-left to bottom-right drag", () => {
    expect(rectFromPoints({ x: 10, y: 10 }, { x: 50, y: 60 })).toEqual({
      minX: 10, minY: 10, maxX: 50, maxY: 60,
    });
  });

  test("bottom-right to top-left drag (reversed)", () => {
    expect(rectFromPoints({ x: 50, y: 60 }, { x: 10, y: 10 })).toEqual({
      minX: 10, minY: 10, maxX: 50, maxY: 60,
    });
  });

  test("top-right to bottom-left drag", () => {
    expect(rectFromPoints({ x: 50, y: 10 }, { x: 10, y: 60 })).toEqual({
      minX: 10, minY: 10, maxX: 50, maxY: 60,
    });
  });

  test("bottom-left to top-right drag", () => {
    expect(rectFromPoints({ x: 10, y: 60 }, { x: 50, y: 10 })).toEqual({
      minX: 10, minY: 10, maxX: 50, maxY: 60,
    });
  });
});

describe("rectIntersectsSegment", () => {
  const rect = { minX: 10, minY: 10, maxX: 50, maxY: 50 };

  test("segment fully inside the rect", () => {
    expect(rectIntersectsSegment(rect, { x: 20, y: 20 }, { x: 30, y: 30 })).toBe(true);
  });

  test("segment fully outside the rect", () => {
    expect(rectIntersectsSegment(rect, { x: 100, y: 100 }, { x: 200, y: 200 })).toBe(false);
  });

  test("segment crossing the top edge", () => {
    expect(rectIntersectsSegment(rect, { x: 30, y: 0 }, { x: 30, y: 20 })).toBe(true);
  });

  test("segment crossing the bottom edge", () => {
    expect(rectIntersectsSegment(rect, { x: 30, y: 40 }, { x: 30, y: 100 })).toBe(true);
  });

  test("segment crossing the left edge", () => {
    expect(rectIntersectsSegment(rect, { x: 0, y: 30 }, { x: 20, y: 30 })).toBe(true);
  });

  test("segment crossing the right edge", () => {
    expect(rectIntersectsSegment(rect, { x: 40, y: 30 }, { x: 100, y: 30 })).toBe(true);
  });

  test("segment passing entirely through the rect, both endpoints outside", () => {
    expect(rectIntersectsSegment(rect, { x: 0, y: 30 }, { x: 100, y: 30 })).toBe(true);
  });

  test("segment touching exactly one corner, endpoints outside", () => {
    // Passes exactly through (10, 10), the rect's own top-left corner.
    expect(rectIntersectsSegment(rect, { x: 0, y: 0 }, { x: 20, y: 20 })).toBe(true);
  });

  test("degenerate zero-length segment (a point) inside the rect", () => {
    expect(rectIntersectsSegment(rect, { x: 25, y: 25 }, { x: 25, y: 25 })).toBe(true);
  });

  test("degenerate zero-length segment (a point) outside the rect", () => {
    expect(rectIntersectsSegment(rect, { x: 999, y: 999 }, { x: 999, y: 999 })).toBe(false);
  });

  test("segment near but not touching the rect at all", () => {
    expect(rectIntersectsSegment(rect, { x: 60, y: 0 }, { x: 60, y: 100 })).toBe(false);
  });
});

describe("featureIdsTouchedByRect", () => {
  const rect = { minX: 10, minY: 10, maxX: 50, maxY: 50 };

  test("a polygon where only ONE edge is touched still returns the WHOLE feature id", () => {
    // A large square whose left edge alone clips through the marquee rect;
    // its other 3 edges are nowhere near it.
    const bigSquare: FeatureSegments = {
      id: "big-square",
      segments: [
        [{ x: 30, y: -1000 }, { x: 30, y: 1000 }],   // left edge -- passes through the rect
        [{ x: 30, y: 1000 }, { x: 2000, y: 1000 }],  // bottom edge -- far away
        [{ x: 2000, y: 1000 }, { x: 2000, y: -1000 }], // right edge -- far away
        [{ x: 2000, y: -1000 }, { x: 30, y: -1000 }],  // top edge -- far away
      ],
    };
    const touched = featureIdsTouchedByRect([bigSquare], rect);
    expect(touched.has("big-square")).toBe(true);
    expect(touched.size).toBe(1);
  });

  test("a feature entirely outside the rect is never included", () => {
    const farAway: FeatureSegments = {
      id: "far-away",
      segments: [[{ x: 500, y: 500 }, { x: 600, y: 600 }]],
    };
    expect(featureIdsTouchedByRect([farAway], rect).size).toBe(0);
  });

  test("multiple features -- only the touched ones are returned", () => {
    const touching: FeatureSegments = { id: "touching", segments: [[{ x: 20, y: 20 }, { x: 30, y: 30 }]] };
    const notTouching: FeatureSegments = { id: "not-touching", segments: [[{ x: 500, y: 500 }, { x: 600, y: 600 }]] };
    const touched = featureIdsTouchedByRect([touching, notTouching], rect);
    expect(touched.has("touching")).toBe(true);
    expect(touched.has("not-touching")).toBe(false);
    expect(touched.size).toBe(1);
  });

  test("a feature with no segments at all is never included", () => {
    const empty: FeatureSegments = { id: "empty", segments: [] };
    expect(featureIdsTouchedByRect([empty], rect).size).toBe(0);
  });
});
