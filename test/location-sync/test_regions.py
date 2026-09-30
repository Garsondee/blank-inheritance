"""Deploying regions that tile the sheet.

The claim under test is one sentence: whatever this builds, coverage.py --
which is forbidden from knowing anything about the world and is tested on that
separately -- reports as a tessellation. Zero voids, zero overlaps, every
square metre claimed exactly once.

Two failures found live are pinned here so they cannot come back:

  the ping-pong   defragment hands a stray piece to the neighbour it shares the
                  most boundary with. When "shares the most boundary" was
                  measured with a 2 px probe, a piece could be given to a
                  region it did not actually touch, which split that region in
                  two, which produced another stray piece, which went back.
                  Six passes later a 0.58 km2 void was still sitting in the
                  middle of the city. A merge now has to leave the host
                  connected or it is refused.

  the pond        landlocked water came out as its own maritime region, which
                  is wrong twice: nobody sails from the reservoir to the bay,
                  and the district around it obviously contains it. Enclosed
                  water joins the land. Enclosed LAND never joins the sea,
                  because an island in a basin is an island -- and that
                  asymmetry is the reason the rule needs no size threshold.

Nothing here reads the real GeoPackage or the real 12400 px master; both are
gitignored and both are slow. The one test that does is marked and skips
loudly.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

try:
    import coverage as coverage_mod
    import landmask
    import regions as regions_mod
    from shapely.geometry import Point, Polygon, box
    from shapely.ops import unary_union
except ImportError:                                      # pragma: no cover
    regions_mod = None


#: A synthetic sheet, placed INSIDE the real content area rather than at the
#: origin, so that grid references resolve the way they do in production. A
#: fixture at (0, 0) sits in the painted margin and every label falls back to
#: an index, which quietly stops testing the thing the labels are for.
ORIGIN = 200.0
EXTENT = (ORIGIN, ORIGIN, ORIGIN + 1000.0, ORIGIN + 1000.0)


def seed(x, y, domain="land", weight=0, name=None):
    return regions_mod.Seed(x, y, domain, label=None, real_name=name,
                            weight=weight)


@unittest.skipIf(regions_mod is None, "shapely/regions unavailable")
class TestThinning(unittest.TestCase):

    def test_nothing_kept_is_closer_than_the_separation(self):
        seeds = [seed(x, y) for x in range(0, 1000, 40)
                 for y in range(0, 1000, 40)]
        kept = regions_mod.thin(seeds, 200)
        for i, a in enumerate(kept):
            for b in kept[i + 1:]:
                self.assertGreaterEqual((a.x - b.x) ** 2 + (a.y - b.y) ** 2,
                                        200 ** 2 - 1e-9)

    def test_input_order_is_the_priority_order(self):
        # Two seeds too close to both survive: the first one wins, which is
        # how the caller expresses "this source is more authoritative".
        kept = regions_mod.thin([seed(0, 0, name="first"),
                                 seed(10, 0, name="second")], 100)
        self.assertEqual([s.real_name for s in kept], ["first"])

    def test_it_is_deterministic(self):
        seeds = [seed(x * 7 % 1000, x * 13 % 1000) for x in range(200)]
        self.assertEqual([(s.x, s.y) for s in regions_mod.thin(seeds, 90)],
                         [(s.x, s.y) for s in regions_mod.thin(seeds, 90)])

    def test_an_empty_input_is_an_empty_output(self):
        self.assertEqual(regions_mod.thin([], 100), [])


@unittest.skipIf(regions_mod is None, "shapely/regions unavailable")
class TestLatticeFill(unittest.TestCase):

    def test_every_added_seed_is_inside_the_geometry(self):
        blob = Point(ORIGIN + 500, ORIGIN + 500).buffer(300)
        added = regions_mod.lattice_fill(blob, [], 100, "land", extent=EXTENT)
        self.assertTrue(added)
        for s in added:
            self.assertTrue(blob.contains(Point(s.x, s.y)))

    def test_it_keeps_clear_of_seeds_that_are_already_there(self):
        blob = box(*EXTENT)
        existing = [seed(ORIGIN + 500, ORIGIN + 500)]
        added = regions_mod.lattice_fill(blob, existing, 200, "land",
                                         extent=EXTENT)
        for s in added:
            self.assertGreaterEqual(
                (s.x - ORIGIN - 500) ** 2 + (s.y - ORIGIN - 500) ** 2,
                200 ** 2 - 1e-9)

    def test_the_rows_are_staggered_rather_than_square(self):
        # A square lattice of Voronoi seeds makes square districts in rows,
        # which reads as a survey grid and not as a place.
        added = regions_mod.lattice_fill(box(*EXTENT), [], 200, "land",
                                         extent=EXTENT)
        xs_by_row = {}
        for s in added:
            xs_by_row.setdefault(round(s.y), set()).add(round(s.x))
        rows = [xs for _y, xs in sorted(xs_by_row.items())]
        self.assertGreaterEqual(len(rows), 2)
        self.assertNotEqual(rows[0], rows[1])

    def test_nothing_is_placed_in_an_empty_geometry(self):
        self.assertEqual(
            regions_mod.lattice_fill(Polygon(), [], 100, "land",
                                     extent=EXTENT), [])


@unittest.skipIf(regions_mod is None, "shapely/regions unavailable")
class TestSeedUnclaimedParts(unittest.TestCase):

    def test_an_island_with_no_seed_gets_one(self):
        islands = unary_union([Point(100, 100).buffer(80),
                               Point(800, 800).buffer(80)])
        added = regions_mod.seed_unclaimed_parts(
            islands, [seed(100, 100)], "land", min_area_px2=100)
        self.assertEqual(len(added), 1)
        self.assertGreater(added[0].x, 500)

    def test_a_part_below_the_threshold_is_left_to_be_absorbed(self):
        islands = unary_union([Point(100, 100).buffer(80),
                               Point(800, 800).buffer(2)])
        added = regions_mod.seed_unclaimed_parts(
            islands, [seed(100, 100)], "land", min_area_px2=1000)
        self.assertEqual(added, [])


@unittest.skipIf(regions_mod is None, "shapely/regions unavailable")
class TestTessellate(unittest.TestCase):

    def test_the_cells_partition_the_clip_geometry_exactly(self):
        o = ORIGIN
        clip = box(o + 100, o + 100, o + 900, o + 900)
        seeds = [seed(o + 200, o + 200), seed(o + 700, o + 300),
                 seed(o + 400, o + 800), seed(o + 850, o + 850)]
        pairs = regions_mod.tessellate(seeds, clip, extent=EXTENT)
        self.assertEqual(len(pairs), 4)
        total = sum(p.area for _s, p in pairs)
        self.assertAlmostEqual(total, clip.area, places=3)
        for i in range(len(pairs)):
            for j in range(i + 1, len(pairs)):
                self.assertLess(pairs[i][1].intersection(pairs[j][1]).area,
                                1e-6)

    def test_one_seed_claims_the_whole_clip(self):
        clip = Point(ORIGIN + 500, ORIGIN + 500).buffer(200)
        pairs = regions_mod.tessellate([seed(ORIGIN + 500, ORIGIN + 500)], clip,
                                       extent=EXTENT)
        self.assertEqual(len(pairs), 1)
        self.assertAlmostEqual(pairs[0][1].area, clip.area, places=3)

    def test_a_seed_whose_cell_misses_the_clip_is_dropped_not_kept_empty(self):
        o = ORIGIN
        clip = box(o, o, o + 100, o + 100)
        pairs = regions_mod.tessellate([seed(o + 50, o + 50),
                                        seed(o + 900, o + 900)], clip,
                                       extent=EXTENT)
        self.assertEqual(len(pairs), 1)

    def test_no_seeds_is_no_regions(self):
        self.assertEqual(regions_mod.tessellate([], box(0, 0, 10, 10)), [])


@unittest.skipIf(regions_mod is None, "shapely/regions unavailable")
class TestDefragment(unittest.TestCase):

    def test_area_is_conserved_exactly(self):
        split = unary_union([box(0, 0, 100, 100), box(200, 0, 300, 100)])
        pairs = [(seed(50, 50), split), (seed(500, 500), box(400, 400, 500, 500))]
        before = sum(p.area for _s, p in pairs)
        after = sum(p.area for _s, p in regions_mod.defragment(pairs))
        self.assertAlmostEqual(before, after, places=6)

    def test_a_touching_fragment_joins_its_neighbour(self):
        left = box(0, 0, 100, 100)
        right_plus_stray = unary_union([box(100, 0, 200, 100),
                                        box(0, 100, 100, 150)])
        out = regions_mod.defragment([(seed(50, 50), left),
                                      (seed(150, 50), right_plus_stray)])
        self.assertEqual(len(out), 2)
        for _s, poly in out:
            self.assertEqual(len(getattr(poly, "geoms", [poly])), 1)

    def test_a_detached_fragment_becomes_its_own_region(self):
        # An island is an island. Absorbing it into something across open
        # water would be tidier and wrong.
        split = unary_union([box(0, 0, 100, 100), box(500, 500, 560, 560)])
        out = regions_mod.defragment([(seed(50, 50), split)])
        self.assertEqual(len(out), 2)
        self.assertAlmostEqual(sum(p.area for _s, p in out), split.area,
                               places=6)

    def test_a_merge_that_would_split_the_host_is_refused(self):
        """The ping-pong regression.

        The stray sits within the snap probe of `host` but touches it nowhere.
        Merging anyway leaves host in two pieces, which produces another stray
        on the next pass, which comes straight back. Six passes later the
        piece is still unrepresentable and there is a real void on the map.
        """
        host = box(0, 0, 100, 100)
        neighbour = box(100, 0, 200, 100)
        stray = box(0, 101, 100, 150)        # 1 px clear of host
        out = regions_mod.defragment(
            [(seed(50, 50), host),
             (seed(150, 50), unary_union([neighbour, stray]))])
        for _s, poly in out:
            self.assertEqual(len(getattr(poly, "geoms", [poly])), 1,
                             "a region came out of defragment in pieces")
        self.assertAlmostEqual(
            sum(p.area for _s, p in out),
            host.area + neighbour.area + stray.area, places=6)

    def test_a_fragment_only_ever_joins_its_own_domain(self):
        land = box(0, 0, 100, 100)
        water_with_stray = unary_union([box(100, 0, 200, 100),
                                        box(0, 100, 100, 150)])
        out = regions_mod.defragment(
            [(seed(50, 50, "land"), land),
             (seed(150, 50, "water"), water_with_stray)])
        by_domain = {}
        for s, poly in out:
            by_domain.setdefault(s.domain, 0)
            by_domain[s.domain] += poly.area
        self.assertAlmostEqual(by_domain["land"], land.area, places=6,
                               msg="a water fragment was given to the land")


@unittest.skipIf(regions_mod is None, "shapely/regions unavailable")
class TestAbsorbInlandWater(unittest.TestCase):

    def test_a_landlocked_pond_joins_the_district_around_it(self):
        pond = Point(500, 500).buffer(50)
        district = box(300, 300, 700, 700).difference(pond)
        out, absorbed = regions_mod.absorb_inland_water(
            [(seed(500, 300, "land"), district),
             (seed(500, 500, "water"), pond)])
        self.assertEqual(absorbed, 1)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0][0].domain, "land")
        self.assertAlmostEqual(out[0][1].area, district.area + pond.area,
                               places=3)
        self.assertEqual(len(out[0][1].interiors), 0, "the hole should be gone")

    def test_an_island_in_a_bay_is_never_absorbed_into_the_sea(self):
        island = Point(500, 500).buffer(50)
        bay = box(300, 300, 700, 700).difference(island)
        out, absorbed = regions_mod.absorb_inland_water(
            [(seed(500, 300, "water"), bay),
             (seed(500, 500, "land"), island)])
        self.assertEqual(absorbed, 0)
        self.assertEqual(len(out), 2)

    def test_water_that_reaches_the_sea_is_left_alone(self):
        inlet = box(0, 400, 400, 600)
        shore = box(0, 0, 400, 400)
        out, absorbed = regions_mod.absorb_inland_water(
            [(seed(200, 200, "land"), shore),
             (seed(200, 500, "water"), inlet)])
        self.assertEqual(absorbed, 0)
        self.assertEqual(len(out), 2)


@unittest.skipIf(regions_mod is None, "shapely/regions unavailable")
class TestEndToEnd(unittest.TestCase):
    """A synthetic coast, all the way through to coverage's verdict."""

    #: Local coordinates, offset onto the synthetic sheet.
    POND = (ORIGIN + 200, ORIGIN + 500)
    ISLAND = (ORIGIN + 780, ORIGIN + 300)

    def _world(self):
        sheet = box(*EXTENT)
        o = ORIGIN
        # Land on the left, sea on the right, one island offshore and one
        # pond inland -- the four cases that between them broke every earlier
        # version of this.
        coast = Polygon([(o, o), (o + 450, o), (o + 520, o + 400),
                         (o + 430, o + 700), (o + 500, o + 1000), (o, o + 1000)])
        pond = Point(*self.POND).buffer(60)
        island = Point(*self.ISLAND).buffer(70)
        land = coast.difference(pond).union(island)
        water = sheet.difference(land)
        return land, water

    def test_the_result_tessellates(self):
        land, water = self._world()
        pairs = regions_mod.build(land, water, land_spacing=220,
                                  water_spacing=400, extent=EXTENT)
        items = regions_mod.to_items(pairs, 1)
        result = coverage_mod.analyse(items, extent=EXTENT)
        self.assertEqual(result["voids"], [])
        self.assertEqual(result["overlaps"], [])
        self.assertTrue(result["tessellates"], coverage_mod.summarise(result))

    def test_nothing_comes_out_in_pieces(self):
        land, water = self._world()
        for _s, poly in regions_mod.build(land, water, land_spacing=220,
                                          water_spacing=400, extent=EXTENT):
            self.assertEqual(len(getattr(poly, "geoms", [poly])), 1)

    def test_the_offshore_island_is_land_and_is_its_own_region(self):
        land, water = self._world()
        pairs = regions_mod.build(land, water, land_spacing=220,
                                  water_spacing=400, extent=EXTENT)
        owners = [s for s, poly in pairs if poly.contains(Point(*self.ISLAND))]
        self.assertEqual(len(owners), 1)
        self.assertEqual(owners[0].domain, "land")

    def test_the_inland_pond_does_not_survive_as_a_maritime_region(self):
        land, water = self._world()
        pairs = regions_mod.build(land, water, land_spacing=220,
                                  water_spacing=400, extent=EXTENT)
        owners = [s for s, poly in pairs if poly.contains(Point(*self.POND))]
        self.assertEqual(len(owners), 1)
        self.assertEqual(owners[0].domain, "land",
                         "a reservoir was filed as part of the ocean")

    def test_every_item_is_a_valid_session_region(self):
        land, water = self._world()
        items = regions_mod.to_items(
            regions_mod.build(land, water, land_spacing=220,
                              water_spacing=400, extent=EXTENT), 1)
        self.assertTrue(items)
        for item in items:
            self.assertEqual(item["tier"], "region")
            self.assertEqual(item["geometry"]["kind"], "polygon")
            self.assertGreaterEqual(len(item["geometry"]["ringPx"]), 3)
            self.assertIn(item["kind"], ("district", "water"))
            self.assertTrue(item["name"])
            self.assertIn("auto-tessellated", item["tags"])

    def test_a_hole_survives_into_the_session_item(self):
        # The island punches a hole in the water region around it. A session
        # item that dropped it would fill the island in and overlap it.
        land, water = self._world()
        # One coarse water cell, so a single sea region surrounds the island
        # rather than two splitting it between them.
        pairs = regions_mod.build(land, water, land_spacing=220,
                                  water_spacing=2000, extent=EXTENT)
        holed = [p for _s, p in pairs if p.interiors]
        self.assertTrue(holed, "expected the island to hole its bay")
        items = regions_mod.to_items(pairs, 1)
        self.assertTrue(any(item["geometry"].get("holesPx")
                            for item in items),
                        "holes were dropped on the way into the session")

    def test_a_degenerate_hole_is_not_carried_into_the_session(self):
        """Booleans leave zero-area rings; those are not lagoons.

        One came out of the real build as a three-point hole of 0.0001 m2 in a
        southern suburb. Filling it back in moves the area by a ten-thousandth
        of a square metre -- four orders below coverage.py's noise floor -- and
        spares whoever edits that district a triangle they cannot see.
        """
        from shapely.geometry import Polygon
        outer = box(ORIGIN, ORIGIN, ORIGIN + 400, ORIGIN + 400)
        speck = Polygon([(ORIGIN + 100, ORIGIN + 100),
                         (ORIGIN + 100.01, ORIGIN + 100),
                         (ORIGIN + 100, ORIGIN + 100.01)])
        real_hole = Point(ORIGIN + 250, ORIGIN + 250).buffer(40)
        poly = outer.difference(speck).difference(real_hole)
        ring, holes = regions_mod._rings(poly)
        self.assertGreaterEqual(len(ring), 4)
        self.assertEqual(len(holes), 1, "the speck should have been dropped")
        self.assertGreater(len(holes[0]), 10, "the real hole should survive")

    def test_a_holed_region_reports_area_net_of_its_hole(self):
        land, water = self._world()
        items = regions_mod.to_items(
            regions_mod.build(land, water, land_spacing=220,
                              water_spacing=2000, extent=EXTENT), 1)
        for item in items:
            holes = item["geometry"].get("holesPx")
            if not holes:
                continue
            from core import grid as grid_mod
            gross = grid_mod.polygon_area_px(item["geometry"]["ringPx"])
            self.assertLess(item["derived"]["areaPx2"], gross,
                            "the hole was counted as part of the region")
            return
        self.skipTest("no holed region in this build")


@unittest.skipIf(regions_mod is None, "shapely/regions unavailable")
class TestProvisionalNaming(unittest.TestCase):

    def test_a_real_name_is_filed_as_research_and_never_as_the_name(self):
        # The hard wall: real-world names are research and never canon.
        land = box(ORIGIN, ORIGIN, ORIGIN + 500, ORIGIN + 500)
        pairs = [(seed(ORIGIN + 250, ORIGIN + 250, "land", name="Kitano-cho"),
                  land)]
        pairs[0][0].label = "district A1.00"
        item = regions_mod.to_items(pairs, 1)[0]
        self.assertEqual(item["provenance"]["realWorldSeed"], "Kitano-cho")
        self.assertIn("Research only", item["provenance"]["realWorldNote"])
        self.assertNotIn("Kitano-cho", item["name"])
        self.assertNotIn("Kitano-cho", item["note"])

    def test_the_note_is_left_empty_for_a_person_to_write(self):
        # core/depth.py reads the note as the summary and counts its words.
        # Machine provenance in there would put every generated region over
        # the depth ceiling before anyone had written a word about the place.
        pairs = [(seed(ORIGIN + 250, ORIGIN + 250, "land", name="Somewhere"),
                  box(ORIGIN, ORIGIN, ORIGIN + 500, ORIGIN + 500))]
        pairs[0][0].label = "district A1.00"
        item = regions_mod.to_items(pairs, 1)[0]
        self.assertEqual(item["note"], "")
        self.assertTrue(item["provenance"]["method"])

    def test_a_label_says_only_what_is_actually_known(self):
        """No guess at what the ground is like. See regions.py's own note.

        Four versions of a colour classifier were tried against the real sheet
        and the best of them called bare mountain crests "built-up" and the
        densest city grid "upland". Land and water come from the landmask and
        are measured; everything else about a district is a sentence somebody
        writes after looking at it.
        """
        o = ORIGIN
        pairs = regions_mod.build(box(o, o, o + 500, o + 1000),
                                  box(o + 500, o, o + 1000, o + 1000),
                                  land_spacing=300, water_spacing=400,
                                  extent=EXTENT)
        for seed, _poly in pairs:
            expected = "water" if seed.domain == "water" else "district"
            self.assertTrue(seed.label.startswith(expected), seed.label)
            for guess in ("upland", "wooded", "built-up", "reclaimed", "flat"):
                self.assertNotIn(guess, seed.label)

    def test_provenance_records_the_domain_and_nothing_it_cannot_know(self):
        pairs = [(seed(ORIGIN + 250, ORIGIN + 250, "land"),
                  box(ORIGIN, ORIGIN, ORIGIN + 500, ORIGIN + 500))]
        pairs[0][0].label = "district A1.00"
        prov = regions_mod.to_items(pairs, 1)[0]["provenance"]
        self.assertEqual(prov["domain"], "land")
        self.assertNotIn("character", prov)

    def test_every_label_carries_a_grid_reference(self):
        o = ORIGIN
        land = box(o, o, o + 500, o + 1000)
        water = box(o + 500, o, o + 1000, o + 1000)
        for s, _p in regions_mod.build(land, water, land_spacing=300,
                                       water_spacing=400, extent=EXTENT):
            self.assertTrue(s.label)
            self.assertIn(regions_mod.grid.SEPARATOR, s.label)


@unittest.skipIf(regions_mod is None, "shapely/regions unavailable")
class TestAgainstTheRealSheet(unittest.TestCase):

    def setUp(self):
        if not os.path.exists(landmask.DEFAULT_CACHE):
            self.skipTest("no cached mask -- run tools/gazetteer/landmask.py")
        self.land, self.water = landmask.load()[1:]

    def test_the_real_sheet_tessellates_without_the_ground_truth(self):
        # No gpkg: proves the tessellation does not depend on the real world
        # being available, only on the painted map.
        pairs = regions_mod.build(self.land, self.water, land_spacing=1500,
                                  water_spacing=3800)
        result = coverage_mod.analyse(regions_mod.to_items(pairs, 1))
        self.assertTrue(result["tessellates"], coverage_mod.summarise(result))
        self.assertGreater(len(pairs), 15)


if __name__ == "__main__":
    unittest.main()
