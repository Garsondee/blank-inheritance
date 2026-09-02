import { describe, expect, test } from "vitest";
import {
  formatClearedNotice,
  formatConnectivityNotice,
  formatEditError,
  formatNearbyTerrainWarning,
  formatRepairNotice,
  roundCoordinatesToPrecision,
  terraDrawModeForGeometryType,
} from "./edit";

describe("roundCoordinatesToPrecision", () => {
  test("rounds a Point's real-world excessive-precision floats down to 9 decimals", () => {
    const rounded = roundCoordinatesToPrecision({
      type: "Point",
      coordinates: [135.20500000000001234, 34.678000000000004321],
    });
    expect(rounded.coordinates).toEqual([135.205, 34.678]);
  });

  test("rounds every coordinate of a Polygon ring, preserving structure", () => {
    const rounded = roundCoordinatesToPrecision({
      type: "Polygon",
      coordinates: [
        [
          [135.1234567891234, 34.1],
          [135.2, 34.2],
          [135.3, 34.3],
          [135.1234567891234, 34.1],
        ],
      ],
    });
    expect(rounded.coordinates[0][0]).toEqual([135.123456789, 34.1]);
    expect(rounded.coordinates[0].length).toBe(4);
  });

  test("rounds a LineString", () => {
    const rounded = roundCoordinatesToPrecision({
      type: "LineString",
      coordinates: [
        [135.00000000019, 34.0],
        [135.1, 34.1],
      ],
    });
    expect(rounded.coordinates[0][0]).toBeCloseTo(135.0, 9);
  });

  test("does not mutate the input geometry", () => {
    const original = { type: "Point" as const, coordinates: [135.123456789123, 34.1] };
    const originalCoords = [...original.coordinates];
    roundCoordinatesToPrecision(original);
    expect(original.coordinates).toEqual(originalCoords);
  });

  test("a custom precision is honoured", () => {
    const rounded = roundCoordinatesToPrecision(
      { type: "Point", coordinates: [135.123456789, 34.1] },
      3,
    );
    expect(rounded.coordinates).toEqual([135.123, 34.1]);
  });
});

describe("terraDrawModeForGeometryType", () => {
  test("maps every geometry type this editor supports editing", () => {
    expect(terraDrawModeForGeometryType("Polygon")).toBe("polygon");
    expect(terraDrawModeForGeometryType("LineString")).toBe("linestring");
    expect(terraDrawModeForGeometryType("Point")).toBe("point");
  });

  test("null for a geometry type not yet supported, not a guess", () => {
    expect(terraDrawModeForGeometryType("MultiPolygon")).toBeNull();
    expect(terraDrawModeForGeometryType("GeometryCollection")).toBeNull();
    expect(terraDrawModeForGeometryType("")).toBeNull();
  });
});

describe("formatNearbyTerrainWarning", () => {
  test("null when nothing is nearby", () => {
    expect(formatNearbyTerrainWarning([])).toBeNull();
  });

  test("singular wording for exactly one", () => {
    expect(formatNearbyTerrainWarning(["te1"])).toBe(
      "1 nearby terrain edit did not move with this feature — review manually",
    );
  });

  test("plural wording for more than one", () => {
    expect(formatNearbyTerrainWarning(["te1", "te2", "te3"])).toBe(
      "3 nearby terrain edits did not move with this feature — review manually",
    );
  });
});

describe("formatRepairNotice", () => {
  test("null when nothing was repaired", () => {
    expect(formatRepairNotice(false)).toBeNull();
  });

  test("a real notice when a repair happened", () => {
    expect(formatRepairNotice(true)).toBe("This shape crossed itself — it was automatically repaired");
  });
});

describe("formatClearedNotice", () => {
  test("null when nothing was cleared", () => {
    expect(formatClearedNotice(0)).toBeNull();
  });

  test("singular for exactly one cleared feature", () => {
    expect(formatClearedNotice(1)).toBe("cleared 1 old feature underneath");
  });

  test("plural for more than one cleared feature", () => {
    expect(formatClearedNotice(7)).toBe("cleared 7 old features underneath");
  });
});

describe("formatEditError", () => {
  test("save, with detail", () => {
    expect(formatEditError("save", "404 Not Found")).toBe("Couldn't save that edit: 404 Not Found");
  });

  test("save, no detail", () => {
    expect(formatEditError("save", null)).toBe("Couldn't save that edit.");
  });

  test("undo, with detail", () => {
    expect(formatEditError("undo", "409 Conflict")).toBe("Couldn't undo: 409 Conflict");
  });

  test("undo, no detail", () => {
    expect(formatEditError("undo", null)).toBe("Couldn't undo.");
  });

  test("delete, with detail", () => {
    expect(formatEditError("delete", "404 Not Found")).toBe("Couldn't delete that feature: 404 Not Found");
  });

  test("delete, no detail", () => {
    expect(formatEditError("delete", null)).toBe("Couldn't delete that feature.");
  });
});

describe("formatConnectivityNotice", () => {
  test("null when the server reported no connectivity at all (a non-road feature)", () => {
    expect(formatConnectivityNotice(null)).toBeNull();
  });

  test("both ends connected, with real counts", () => {
    const notice = formatConnectivityNotice({
      start: { sharedWithRoadIds: ["a"] },
      end: { sharedWithRoadIds: ["b", "c"] },
    });
    expect(notice).toBe("Start: connected to 1 other road · End: connected to 2 other roads");
  });

  test("both ends dangling", () => {
    const notice = formatConnectivityNotice({ start: null, end: null });
    expect(notice).toBe("Start: not connected to anything · End: not connected to anything");
  });

  test("one end connected, one dangling", () => {
    const notice = formatConnectivityNotice({ start: { sharedWithRoadIds: ["a"] }, end: null });
    expect(notice).toBe("Start: connected to 1 other road · End: not connected to anything");
  });
});
