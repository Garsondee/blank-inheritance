import { describe, expect, test } from "vitest";
import { BUILDING_PRESETS, previewStyleForButton, ROAD_RAIL_CLASSES, TOOLBAR_FEATURE_BUTTONS } from "./toolbarConfig";

describe("ROAD_RAIL_CLASSES", () => {
  test("every one of the 21 real highway classes gets its own button, plus rail", () => {
    // The user's own explicit answer: "every real class (21 + rail)" --
    // not a curated subset. 21 highway + 1 rail = 22.
    expect(ROAD_RAIL_CLASSES).toHaveLength(22);
  });

  test("every entry is a LineString with no area", () => {
    for (const config of ROAD_RAIL_CLASSES) {
      expect(config.geometryType).toBe("LineString");
      expect(config.isArea).toBe(false);
    }
  });

  test("exactly one rail button, tagged railway=rail, not part of the highway table", () => {
    const railButtons = ROAD_RAIL_CLASSES.filter((c) => "railway" in c.tags);
    expect(railButtons).toHaveLength(1);
    expect(railButtons[0].tags.railway).toBe("rail");
    expect(railButtons[0].tags.highway).toBeUndefined();
  });

  test("every other button carries a distinct highway= tag", () => {
    const highwayValues = ROAD_RAIL_CLASSES.filter((c) => "highway" in c.tags).map((c) => c.tags.highway);
    expect(highwayValues).toHaveLength(21);
    expect(new Set(highwayValues).size).toBe(21);
  });
});

describe("BUILDING_PRESETS", () => {
  test("House, Hall, Tall Building, Tower, Antenna -- the user's own named list", () => {
    expect(BUILDING_PRESETS.map((c) => c.label)).toEqual([
      "House", "Hall", "Tall Building", "Tower", "Antenna",
    ]);
  });

  test("heights strictly increase from House to Antenna", () => {
    const heights = BUILDING_PRESETS.map((c) => c.heightM);
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeGreaterThan(heights[i - 1]);
    }
  });

  test("every preset is a Polygon area with a real building= tag, including Antenna", () => {
    for (const config of BUILDING_PRESETS) {
      expect(config.geometryType).toBe("Polygon");
      expect(config.isArea).toBe(true);
      expect(config.tags.building).toBeTruthy();
    }
  });
});

describe("TOOLBAR_FEATURE_BUTTONS", () => {
  test("every key is unique across all 27 buttons", () => {
    const keys = TOOLBAR_FEATURE_BUTTONS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(27);
  });

  test("every button's tags resolve to something other than the unmatched-fallback color", () => {
    // Catches a mistyped tag among 27 near-identical entries -- the fallback
    // HINT color is "rgba(140, 150, 158, 0.55)" for an area, or the same
    // HINT fill+line for an unmatched line; a real road/rail/building tag
    // must never land there.
    for (const config of TOOLBAR_FEATURE_BUTTONS) {
      const style = previewStyleForButton(config);
      expect(style.fillColor).not.toBe("rgba(140, 150, 158, 0.55)");
    }
  });
});
