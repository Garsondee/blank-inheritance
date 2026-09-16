"""Working names and one-line summaries for the 40 deployed regions.

    python tools/gazetteer/_region_names.py

This lives in the repo rather than in a scratch directory for one reason: the
session draft it writes into is gitignored, so without this table the only copy
of forty names and forty summaries would be one file outside version control.
The geometry is reproducible -- regions.py is deterministic and its output was
checked -- but the writing is not, and re-running the tessellator would hand
back forty anonymous polygons.

Re-runnable and idempotent: it matches on localId and overwrites `name`, `note`
and `depth`, leaving geometry and provenance alone.

One-shot in intent. The names are WORKING HANDLES, not canon: the city itself is still
unnamed (naming-placeholders.json#city-name is Ingram's call and stays his), so
nothing here invents a proper noun in the setting's own language. They are the
plain descriptive English a civil-defence office would actually use on a duty
roster, which is both in register and easy to replace.

Each summary sits inside core/depth.py's `named` rung -- one line saying what
the place is and what it is for, under the 70-word ceiling. The machine
provenance stays in `provenance`, where the depth check does not read it.
"""

import io
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)

from core import depth as depth_mod  # noqa: E402

DRAFT = os.path.join(_HERE, "..", "..", "data", "map",
                     "gazetteer-drafts", "session-20260911-144323.json")

# localId -> (name, summary), with each region's real centroid in image pixels
# as a comment. The comment is not decoration: a first pass assigned six of
# these by reading label positions off a rendered overview and got them wrong
# -- an upland bowl named as a city slope, and the city slope named as a
# wooded saddle. Every entry below was checked against the centroid the
# tessellator actually produced.
REGIONS = {
    # --- the artificial fortress island -------------------------------------
    "item-176": ("Island Centre",                          # 7661, 7448
        "The fortress island's own downtown: offices, canteens and billets on "
        "a rectilinear grid laid out all at once, with the Directorate's "
        "island complex anchoring the south end. Everything here is the same "
        "age and it shows."),
    "item-177": ("The Long Sheds",                         # 7987, 5907
        "Terminal sheds and marshalling rows across the island's north-east, "
        "each long enough to have its own weather at the far end. Cargo comes "
        "off the water here and then sits for a while."),
    "item-178": ("The Landing End",                        # 6682, 6444
        "Where the causeway meets the island. Checkpoints, a taxi rank that is "
        "usually empty, and the first blocks any visitor sees. The only part "
        "of the island that reliably has a queue."),
    "item-202": ("The Container Ground",                   # 9393, 7181
        "The island's eastern apron: stacked boxes, gantry rails and a "
        "perimeter road kept clear so the cranes can swing. Lit all night, and "
        "audible from the water."),

    # --- the fort that replaced the old island ------------------------------
    "item-191": ("The Redoubt",                            # 9009, 1818
        "A compact artificial fort standing alone off the north-east shore, on "
        "ground that used to be a great deal larger. Batteries, a signal mast, "
        "one causeway. What it is watching for is not discussed at the gate."),
    "item-207": ("Redoubt Shore",                          # 10244, 416
        "The thin coastal strip facing the fort: a pilot station, a boat slip, "
        "and a row of houses whose windows all point the same way. Everyone "
        "here has an opinion about the garrison."),

    # --- the north-east coast -----------------------------------------------
    "item-183": ("The North Shore Town",                   # 9000, 706
        "A coastal settlement on the far side of the headland, joined to the "
        "city by one road and one timetable. It considers itself older than "
        "the city and is probably right."),
    "item-190": ("The North Quay",                         # 7721, 1853
        "Working waterfront on the north-east shore, where the coast road, the "
        "rail spur and the water all meet. Bulk cargo, a fuel jetty, and no "
        "reason to be here if you are not working."),
    "item-196": ("North Wharves",                          # 6960, 3311
        "The mainland's northern finger piers, berths for coastal traffic "
        "rather than the deep-sea tonnage handled across the water. Crews here "
        "know each other and know nobody on the island."),

    # --- the northern city ---------------------------------------------------
    "item-187": ("The Upper Wards",                        # 6914, 785
        "Streets stacked along the northern shelf above the coast, reached by "
        "stairs as often as by road. Good views, bad drainage, and a strong "
        "sense of being a separate town that happens to share a tram line."),
    "item-189": ("The North Approach",                     # 6152, 2088
        "The corridor road and rail share coming into the city from the north, "
        "thickening into workshops and goods yards as it descends."),
    "item-194": ("The Rail Cut",                           # 3951, 3337
        "Where the main line comes down out of the valley and splits the built "
        "ground in two. Everything here is arranged around getting over, under "
        "or alongside the tracks."),
    "item-195": ("The Flats",                              # 5369, 3479
        "The dense low grid behind the waterfront, where the city stops "
        "climbing and simply repeats itself: shophouses, side streets, and "
        "more bicycles than the roads were drawn for."),
    "item-181": ("The Old Landing",                        # 5282, 5047
        "The mainland's original waterfront, still the point every road "
        "eventually reaches. Ferry stages, chandlers, and a customs hall that "
        "predates the Directorate and is politely ignored by it."),
    "item-182": ("The Sawtooth Quays",                     # 4154, 6814
        "A comb of short finger piers stepping out into the inner harbour, "
        "each a different age and a different width. Small freight, fish, and "
        "whatever is being moved without paperwork."),
    "item-198": ("The Slope",                              # 3339, 4838
        "Where the city gives up on the flat and climbs: narrow terraces, "
        "retaining walls, and a gradient that decides what can be built and "
        "who is willing to walk home."),

    # --- the southern city ---------------------------------------------------
    "item-205": ("The South Grid",                         # 4303, 8708
        "The largest continuous stretch of ordinary city on the sheet. "
        "Housing, schools, small industry, and the daily traffic that makes "
        "every other district's plans inconvenient."),
    "item-204": ("The Cutting",                            # 2558, 8612
        "A long shallow valley carrying road, rail and river south-west "
        "together, built up along both banks. The city's main way out by "
        "land."),
    "item-185": ("The Southern Reach",                     # 3647, 10482
        "Outer suburb near the edge of the sheet, where the grid loosens and "
        "the fields start. The last place with a bus stop."),
    "item-184": ("The Far Quarter",                        # 1718, 11554
        "The south-western corner of the built city, far enough out that "
        "sirens arrive late and everyone has made their own arrangements."),
    "item-208": ("South Waterfront",                       # 5324, 10137
        "Working shoreline south of the centre: slipways, a small yard, and "
        "the reclaimed strip where the coast road runs out of shore to "
        "follow."),
    "item-214": ("The River Island",                       # 4378, 11046
        "A flat block of made ground in the river mouth, ringed by water and "
        "reached by two bridges. Storage, mostly, and one building nobody can "
        "account for."),

    # --- the uplands ---------------------------------------------------------
    "item-186": ("The High Ridges",                        # 1006, 942
        "The north-western skyline: bare crests, small tarns, and weather that "
        "arrives here before it reaches the city. No road a truck would "
        "attempt."),
    "item-188": ("The Ridge Valleys",                      # 1727, 2092
        "Parallel wooded ridges with a river working its way between them. "
        "Forestry tracks, one bridge, and a great deal of standing timber."),
    "item-180": ("The North Bowl",                         # 3138, 980
        "A wide wooded basin behind the first ridge, holding a stream and the "
        "beginnings of a settlement that never grew. Sheltered, quiet, and "
        "easy to lose something in."),
    "item-179": ("The Upland Fringe",                      # 4714, 1460
        "Where the northern woods stop being wild: scattered holdings, a "
        "quarry road, and the last houses on the grid before the trees take "
        "over entirely."),
    "item-192": ("The Western Ridge",                      # 825, 3448
        "Upland shoulder above the reservoir country, open enough at the top "
        "to see the whole bay on a clear day. Used by walkers, and by people "
        "who would rather not be seen walking."),
    "item-193": ("Reservoir Country",                      # 2520, 3327
        "The catchment that supplies the city: two reservoirs, their access "
        "roads, and a permanent low-level argument about who is allowed on the "
        "water."),
    "item-197": ("The Back Ridges",                        # 1557, 4747
        "Hill country behind the reservoirs, where the tracks stop being "
        "maintained and the map starts being approximate."),
    "item-199": ("The Western Uplands",                    # 825, 6046
        "Broad wooded hills at the sheet's western edge. Charcoal, timber, and "
        "hamlets that send their children down to the city and get them back "
        "at weekends."),
    "item-200": ("The Middle Ridge",                       # 2604, 6160
        "The long wooded spine dividing the western uplands from the city's "
        "hinterland. Crossed at exactly one point."),
    "item-201": ("The Upper Catchment",                    # 1698, 7345
        "Bare upland where the streams that feed the reservoirs start. Cold, "
        "exposed, and the first place the Directorate looks when it needs "
        "somewhere with no witnesses."),
    "item-203": ("The South Ridges",                       # 825, 8644
        "Wooded hills closing the city in from the south-west, steep enough "
        "that the suburbs stop abruptly at their foot."),
    "item-206": ("The Southern Uplands",                   # 1464, 10142
        "Open hill country at the south-western corner of the sheet, grazed "
        "rather than forested, with long views back over the whole city."),

    # --- the waters ----------------------------------------------------------
    "item-209": ("The North Roads",                        # 10365, 3256
        "The sheltered water inside the headland, where deep-sea traffic waits "
        "for a berth. Anchored ships sit here for days and become landmarks in "
        "their own right."),
    "item-210": ("The Inner Harbour",                      # 5798, 7725
        "The working water between the mainland quays and the fortress island: "
        "crowded, slow, and governed by right-of-way rules that are mostly "
        "customary."),
    "item-211": ("The Open Sea",                           # 8843, 10150
        "Everything south and east of the approaches. Shipping lanes, weather "
        "coming in off the water, and no bottom worth anchoring on."),
    "item-212": ("The East Basins",                        # 9389, 5926
        "The water between the island's piers and the outer channel, cut into "
        "berths by the wharves. Every basin has a name among the crews and "
        "none of them are on the chart."),
    "item-213": ("The North Approach Channel",             # 7225, 4414
        "The marked channel inbound past the headland. Narrow, busy, and the "
        "one stretch of water where the harbour office gives orders rather "
        "than advice."),
    "item-215": ("The Causeway Pool",                      # 6115, 5736
        "A small sheltered pocket where the causeway meets the mainland shore. "
        "Too shallow for anything serious, which is exactly why the small "
        "boats live here."),
}


def main():
    with io.open(DRAFT, encoding="utf-8") as fh:
        draft = json.load(fh)

    by_id = {item["localId"]: item for item in draft["items"]}
    touched = 0
    problems = []

    for local_id, (name, summary) in REGIONS.items():
        item = by_id.get(local_id)
        if item is None:
            problems.append("%s: no such item" % local_id)
            continue
        if item["tier"] != "region":
            problems.append("%s: not a region (%s)" % (local_id, item["tier"]))
            continue
        summary = " ".join(summary.split())
        item["name"] = name
        item["note"] = summary
        item["depth"] = "named"
        result = depth_mod.check(item, "named")
        if result["missing"] or result["overweight"]:
            problems.append("%s %r: %s" % (
                local_id, name, result["missing"] + result["overweight"]))
        touched += 1

    unnamed = [i["localId"] for i in draft["items"]
               if i["tier"] == "region" and i["localId"] not in REGIONS]
    if unnamed:
        problems.append("regions with no entry: %s" % unnamed)

    names = [n for n, _s in REGIONS.values()]
    if len(set(names)) != len(names):
        problems.append("duplicate names in the table")

    if problems:
        print("PROBLEMS:")
        for problem in problems:
            print("  -", problem)
        raise SystemExit(1)

    with io.open(DRAFT, "w", encoding="utf-8") as fh:
        json.dump(draft, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    words = sorted(len(s.split()) for _n, s in REGIONS.values())
    print("named %d regions; summary words min %d median %d max %d"
          % (touched, words[0], words[len(words) // 2], words[-1]))


if __name__ == "__main__":
    main()
