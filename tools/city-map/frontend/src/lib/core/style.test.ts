import { describe, expect, test } from "vitest";
import { hashStringToIndex, styleForFeature } from "./style";

describe("hashStringToIndex", () => {
  test("deterministic -- same string always picks the same index", () => {
    expect(hashStringToIndex("abc123", 7)).toBe(hashStringToIndex("abc123", 7));
  });

  test("always within [0, modulus)", () => {
    for (const id of ["a", "0c82d87478d8fa7d", "", "very-long-feature-id-string-here"]) {
      const idx = hashStringToIndex(id, 7);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(7);
    }
  });

  test("different strings usually pick different indices (not a constant function)", () => {
    const indices = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((s) => hashStringToIndex(s, 7)));
    expect(indices.size).toBeGreaterThan(1);
  });
});

describe("styleForFeature -- buildings", () => {
  test("a building:material tag picks the exact flat material color, no height blending", () => {
    const style = styleForFeature({ building: "yes", "building:material": "brick" }, true, 40, "f1");
    expect(style.fillColor).toBe("rgb(176, 128, 104)");
    expect(style.lineColor).toBe("rgb(46, 41, 37)");
  });

  test("every known material maps to its own real palette color", () => {
    const materials: Record<string, string> = {
      concrete: "rgb(206, 202, 193)",
      metal: "rgb(128, 132, 136)",
      brick: "rgb(176, 128, 104)",
      asphalt: "rgb(92, 90, 86)",
      wood: "rgb(168, 138, 96)",
      glass: "rgb(158, 178, 184)",
    };
    for (const [material, expected] of Object.entries(materials)) {
      const style = styleForFeature({ building: "yes", "building:material": material }, true, 10, "f1");
      expect(style.fillColor).toBe(expected);
    }
  });

  test("no material tag -- falls back to a deterministic roof-hash blend, same id always same color", () => {
    const a = styleForFeature({ building: "residential" }, true, 9, "same-id");
    const b = styleForFeature({ building: "residential" }, true, 9, "same-id");
    expect(a.fillColor).toBe(b.fillColor);
  });

  test("no material tag -- a taller building blends further toward its roof color than a short one", () => {
    // Same id (same roof pick), only height differs -- if height genuinely
    // changes the blend ratio, a tall and a short building must differ.
    const short = styleForFeature({ building: "yes" }, true, 3, "tower-1");
    const tall = styleForFeature({ building: "yes" }, true, 200, "tower-1");
    expect(short.fillColor).not.toBe(tall.fillColor);
  });

  test("building tag alone (no landuse) still gets building rules, not the landuse/hint fallback", () => {
    const style = styleForFeature({ building: "yes" }, true, 8, "f1");
    expect(style.fillColor).not.toBe("rgba(140, 150, 158, 0.55)");
    expect(style.lineWidthM).toBeCloseTo(0.586);
  });

  test("building tag takes priority over an also-present landuse tag", () => {
    const style = styleForFeature({ building: "yes", landuse: "retail" }, true, 8, "f1");
    // Retail landuse color is rgb(226, 212, 201) -- a building-tagged feature
    // must NOT produce that color, since building rules apply first.
    expect(style.fillColor).not.toBe("rgb(226, 212, 201)");
  });
});

describe("styleForFeature -- water polygons", () => {
  test("natural=water", () => {
    expect(styleForFeature({ natural: "water" }, true, 0, "f1").fillColor).toBe("rgb(150, 172, 183)");
  });
  test("landuse=basin", () => {
    expect(styleForFeature({ landuse: "basin" }, true, 0, "f1").fillColor).toBe("rgb(150, 172, 183)");
  });
  test("water=pond", () => {
    expect(styleForFeature({ water: "pond" }, true, 0, "f1").fillColor).toBe("rgb(150, 172, 183)");
  });
  test("leisure=swimming_pool", () => {
    expect(styleForFeature({ leisure: "swimming_pool" }, true, 0, "f1").fillColor).toBe("rgb(150, 172, 183)");
  });
  test("water polygons stroke in coastInk, not ink", () => {
    expect(styleForFeature({ natural: "water" }, true, 0, "f1").lineColor).toBe("rgb(58, 78, 84)");
  });
  test("an unrelated leisure value is not treated as water", () => {
    expect(styleForFeature({ leisure: "park" }, true, 0, "f1").fillColor).not.toBe("rgb(150, 172, 183)");
  });
});

describe("styleForFeature -- landuse/natural/leisure priority", () => {
  test("landuse wins over natural and leisure when all three are present", () => {
    const style = styleForFeature({ landuse: "industrial", natural: "wood", leisure: "park" }, true, 0, "f1");
    expect(style.fillColor).toBe("rgb(208, 200, 187)"); // industrial
  });
  test("natural is used when landuse is absent", () => {
    const style = styleForFeature({ natural: "wood", leisure: "park" }, true, 0, "f1");
    expect(style.fillColor).toBe("rgb(170, 190, 158)"); // wood
  });
  test("leisure is used when neither landuse nor natural is present", () => {
    const style = styleForFeature({ leisure: "park" }, true, 0, "f1");
    expect(style.fillColor).toBe("rgb(198, 213, 178)"); // park
  });
  test("an unmatched landuse value falls back to the neutral hint color", () => {
    const style = styleForFeature({ landuse: "some_unknown_future_osm_value" }, true, 0, "f1");
    expect(style.fillColor).toBe("rgba(140, 150, 158, 0.55)");
  });
  test("landuse polygons get no stroke (0 width) -- only water/buildings do in the real render", () => {
    const style = styleForFeature({ landuse: "grass" }, true, 0, "f1");
    expect(style.lineWidthM).toBe(0);
  });
});

describe("styleForFeature -- untagged area features", () => {
  test("no building/water/landuse tag at all -- neutral hint, still findable", () => {
    const style = styleForFeature({}, true, 0, "f1");
    expect(style.fillColor).toBe("rgba(140, 150, 158, 0.55)");
    expect(style.lineColor).toBe("rgba(140, 150, 158, 0.55)");
  });

  test("an area-tagged highway (e.g. a mapped pedestrian plaza) is NOT drawn as a road", () => {
    // Matches citymap/render.py's own real behaviour: roads are only drawn
    // for `not feature.area` features. An area=yes + highway=pedestrian
    // plaza with no other landuse tag falls through to the neutral hint,
    // never to road styling.
    const style = styleForFeature({ highway: "pedestrian", area: "yes" }, true, 0, "f1");
    expect(style.fillColor).toBe("rgba(140, 150, 158, 0.55)");
  });
});

describe("styleForFeature -- lines", () => {
  test("railway -- flat railway color regardless of subtype", () => {
    const style = styleForFeature({ railway: "rail" }, false, 0, "f1");
    expect(style.fillColor).toBe("rgb(72, 66, 60)");
    expect(style.lineWidthM).toBeCloseTo(4.0);
  });

  test("waterway -- flat water color, a stand-in fixed width (no per-vertex taper)", () => {
    const style = styleForFeature({ waterway: "river" }, false, 0, "f1");
    expect(style.fillColor).toBe("rgb(150, 172, 183)");
    expect(style.lineWidthM).toBeCloseTo(3.0);
  });

  test("a major road class (motorway/trunk/primary) gets the lighter major tone", () => {
    for (const cls of ["motorway", "trunk", "primary", "primary_link"]) {
      const style = styleForFeature({ highway: cls }, false, 0, "f1");
      expect(style.fillColor).toBe("rgb(246, 242, 234)");
    }
  });

  test("a minor road class gets the darker minor tone", () => {
    for (const cls of ["residential", "service", "footway", "unclassified"]) {
      const style = styleForFeature({ highway: cls }, false, 0, "f1");
      expect(style.fillColor).toBe("rgb(238, 234, 226)");
    }
  });

  test("each known highway class gets its own real-world width in meters", () => {
    expect(styleForFeature({ highway: "motorway" }, false, 0, "f1").lineWidthM).toBeCloseTo(22);
    expect(styleForFeature({ highway: "footway" }, false, 0, "f1").lineWidthM).toBeCloseTo(1.8);
    expect(styleForFeature({ highway: "residential" }, false, 0, "f1").lineWidthM).toBeCloseTo(6.5);
  });

  test("an unknown highway value (not in the real render's road table) is not drawn as a road", () => {
    const style = styleForFeature({ highway: "raceway" }, false, 0, "f1");
    expect(style.fillColor).toBe("rgba(140, 150, 158, 0.55)");
  });

  test("a line feature with no recognised tag at all falls back to the neutral hint", () => {
    const style = styleForFeature({}, false, 0, "f1");
    expect(style.fillColor).toBe("rgba(140, 150, 158, 0.55)");
  });
});
