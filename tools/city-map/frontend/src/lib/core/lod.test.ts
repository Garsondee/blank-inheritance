import { describe, expect, test } from "vitest";
import {
  formatHiddenBanner,
  metresPerPixel,
  MIN_QUERY_ZOOM,
  shouldQueryFeatures,
  ZOOM_IN_TO_SELECT_MESSAGE,
} from "./lod";

describe("metresPerPixel", () => {
  test("matches the well-known Web Mercator value at the equator, zoom 0", () => {
    // A textbook reference value: zoom 0 at the equator is ~156543 m/px
    // (the standard "resolution table" every Mercator map library ships).
    expect(metresPerPixel(0, 0)).toBeCloseTo(156543.03392804097, 3);
  });

  test("halves for every zoom level increment", () => {
    const z10 = metresPerPixel(10, 0);
    const z11 = metresPerPixel(11, 0);
    expect(z11).toBeCloseTo(z10 / 2, 6);
  });

  test("shrinks toward the poles (cosine of latitude)", () => {
    const equator = metresPerPixel(10, 0);
    const midLat = metresPerPixel(10, 45);
    expect(midLat).toBeLessThan(equator);
    expect(midLat).toBeCloseTo(equator * Math.cos((45 * Math.PI) / 180), 6);
  });

  test("is symmetric for north and south latitude", () => {
    expect(metresPerPixel(12, 34.678)).toBeCloseTo(metresPerPixel(12, -34.678), 9);
  });
});

describe("shouldQueryFeatures", () => {
  test("false below MIN_QUERY_ZOOM", () => {
    expect(shouldQueryFeatures(MIN_QUERY_ZOOM - 1)).toBe(false);
    expect(shouldQueryFeatures(0)).toBe(false);
  });

  test("true at and above MIN_QUERY_ZOOM", () => {
    expect(shouldQueryFeatures(MIN_QUERY_ZOOM)).toBe(true);
    expect(shouldQueryFeatures(MIN_QUERY_ZOOM + 5)).toBe(true);
  });
});

describe("formatHiddenBanner", () => {
  test("null when nothing is capped, even if LOD hid features", () => {
    // hiddenByLod alone is normal decluttering, never alarming on its own
    // -- see lod.ts's own doc comment on why this must not surface a banner.
    expect(formatHiddenBanner({ hiddenByLod: 50, hiddenByCap: 0 })).toBeNull();
  });

  test("singular wording for exactly one capped feature", () => {
    expect(formatHiddenBanner({ hiddenByLod: 0, hiddenByCap: 1 })).toBe(
      "1 more feature here — zoom in to see them",
    );
  });

  test("plural wording for more than one", () => {
    expect(formatHiddenBanner({ hiddenByLod: 0, hiddenByCap: 7 })).toBe(
      "7 more features here — zoom in to see them",
    );
  });

  test("negative hiddenByCap (should never happen, but must not crash or misreport) is treated as null", () => {
    expect(formatHiddenBanner({ hiddenByLod: 0, hiddenByCap: -1 })).toBeNull();
  });
});

describe("ZOOM_IN_TO_SELECT_MESSAGE", () => {
  test("is a non-empty, distinct message from the hidden-banner text", () => {
    expect(ZOOM_IN_TO_SELECT_MESSAGE.length).toBeGreaterThan(0);
    expect(ZOOM_IN_TO_SELECT_MESSAGE).not.toContain("zoom in to see them");
  });
});
