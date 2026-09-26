"""Name and describe the 22 bunkers and watch towers drawn with the new
Circle tool -- Ingram's own words: "I've redrawn the shapes around all the
bunkers. Big round ones are bunkers, small round ones are watch towers."

    python tools/gazetteer/_circle_defences_names.py --dry-run
    python tools/gazetteer/_circle_defences_names.py --write

Every item.geometry.ringPx in the session was re-measured with shape.py's
new circle check (CIRCLE_COMPACTNESS/CIRCLE_MAX_ELONGATION) to find these:
22 hand-drawn (source: "drawn", no OSM build data) circular polygons,
localId item-521 through item-543. Their own diameters split cleanly into
two clusters rather than a continuum -- 23.9-25.6 m (6 items) and
39.1-139.1 m (16 items) -- so "big" and "small" is read directly off that
gap: the small cluster is watch towers, everything above it is a bunker.
The scale itself only makes sense read as Frame-scale defensive works (a
139 m bunker is absurd for a human-sized building, ordinary for something
built to shelter a Frame) -- consistent with "Main Mech Hangar" already
named elsewhere in this session.

Grouped by the district each item's centroid falls in (derived.withinRegionRef
where the tessellation reaches; a handful sit just outside a region boundary,
a known coverage gap, and are grouped with their obvious neighbours instead):
The Container Ground (8), The Long Sheds (3), The Causeway Pool (1),
The Landing End (7), Island Centre (3). 8+3+1+7+3 = 22.

Register matches _base_names.py and _outer_defences_names.py: functional,
real-military, numbered where a district holds more than one of a kind.
"Very basic flavouring" was the actual ask, so these are shorter than the
outer-defences pass's own notes -- one plain sentence each, not several.

Checked before writing:
  - All 142 names already in the live session (fetched fresh), for exact
    collisions against every name below.
  - None of the 44 item ids _outer_defences_names.py named still exist --
    that whole batch of hand-drawn approximations was apparently replaced
    by these precise circles, so there is no stale name left to clash with
    or duplicate.

The server enforces its own optimistic-concurrency check (draft_changed_
underneath) and this script never sends force:true -- if Ingram's own tab
saves between this script's fetch and its post, the save is refused rather
than overwriting anything, and this script has to be re-run against the
fresh state that comes back.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)

from core import depth as depth_mod  # noqa: E402

BASE = "http://localhost:8767"

# localId -> (name, kind, note)
ENTRIES = {
    # --- The Container Ground (item-202) --------------------------------
    "item-528": ("No. 1 Yard Watch", "military",
        "The yard's westernmost lookout, sited to catch anything moving "
        "along the perimeter road before it reaches the stacks."),
    "item-525": ("No. 2 Yard Watch", "military",
        "Stands tall enough over the container stacks to see clean down "
        "every lane at once."),
    "item-524": ("No. 3 Yard Watch", "military",
        "The last watch before open water, covering the loading berths "
        "at the yard's eastern edge."),
    "item-527": ("No. 1 Yard Bunker", "military",
        "A hardened bay on the yard's western row, dug in deep enough to "
        "shelter a Frame between shifts."),
    "item-526": ("No. 2 Yard Bunker", "military",
        "Set mid-yard between two stacking blocks, covering the one gap "
        "neither watch tower can see into."),
    "item-523": ("No. 3 Yard Bunker", "military",
        "The largest bay in the yard, sited apart to the north so a hit "
        "on it can't take the others too."),
    "item-522": ("No. 4 Yard Bunker", "military",
        "Close by the eastern berths, kept ready for whichever Frame is "
        "working the cranes that day."),
    "item-521": ("No. 5 Yard Bunker", "military",
        "The yard's furthest bay, angled to cover the one stretch of "
        "water the others can't reach."),

    # --- The Long Sheds (item-177) ---------------------------------------
    "item-531": ("No. 1 Shed Bunker", "military",
        "Dug in behind the sheds' own back wall, sized to take a Frame "
        "under cover between runs."),
    "item-529": ("No. 2 Shed Bunker", "military",
        "Faces the open ground north of the sheds, the one approach the "
        "warehouses can't watch for themselves."),
    "item-530": ("No. 3 Shed Bunker", "military",
        "Sits furthest from the marshalling yard, held in reserve rather "
        "than manned every shift."),

    # --- The Causeway Pool (item-215) -------------------------------------
    "item-532": ("The Causeway Bunker", "military",
        "Sunk at the water's edge to watch the causeway's own approach, "
        "the one crossing every other gun position was built to ignore."),

    # --- The Landing End (item-178) ---------------------------------------
    "item-537": ("No. 1 Landing Watch", "military",
        "Watches the road in from the causeway, the first thing a Frame "
        "convoy passes after the checkpoint itself."),
    "item-539": ("No. 2 Landing Watch", "military",
        "Set back from the road, covering the ground between the "
        "checkpoint and the barracks rows."),
    "item-540": ("No. 3 Landing Watch", "military",
        "The furthest watch from the causeway, covering the district's "
        "own quiet back edge."),
    "item-538": ("No. 1 Landing Bunker", "military",
        "The smallest of the district's bays, held for a single Frame on "
        "standby rather than a full detachment."),
    "item-534": ("No. 2 Landing Bunker", "military",
        "Sits close to the checkpoint, ready to answer whatever the "
        "Roadgate's own guns can't stop."),
    "item-535": ("No. 3 Landing Bunker", "military",
        "Covers the barracks rows from the district's open side, where "
        "the buildings themselves offer no cover."),
    "item-536": ("No. 4 Landing Bunker", "military",
        "The largest bay this end of the island, sized for a full Frame "
        "detachment rather than a single machine."),

    # --- Island Centre (item-176) ------------------------------------------
    "item-543": ("No. 1 Centre Bunker", "military",
        "Tucked behind the downtown's own offices, held for whichever "
        "Frame is standing ready that shift."),
    "item-541": ("No. 2 Centre Bunker", "military",
        "Faces the harbour side of Island Centre, the one approach the "
        "district's own buildings don't block."),
    "item-542": ("The Deep Bunker", "military",
        "The largest hardened position on the whole island: a full Frame "
        "bay dug in at the fortress's own centre, built to be the last "
        "thing that falls."),
}


def fetch():
    with urllib.request.urlopen(BASE + "/api/session", timeout=20) as fh:
        return json.load(fh)["draft"]


def post(items):
    body = json.dumps({"items": items}).encode("utf-8")
    req = urllib.request.Request(BASE + "/api/session", data=body,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as fh:
            return 200, json.load(fh)
    except urllib.error.HTTPError as exc:
        return exc.code, json.load(exc)


def apply_entries(draft):
    by_id = {item["localId"]: item for item in draft["items"]}
    problems = []
    report = []

    existing_names = {(item.get("name") or "").strip()
                      for item in draft["items"]} - {""}

    for local_id, (name, kind, note) in ENTRIES.items():
        item = by_id.get(local_id)
        if item is None:
            problems.append("%s: missing (session has churned again)" % local_id)
            continue
        current_name = (item.get("name") or "").strip()
        if name in existing_names and name != current_name:
            problems.append("%s: %r already used elsewhere" % (local_id, name))
            continue

        note = " ".join(note.split())
        item["name"] = name
        item["kind"] = kind
        item["note"] = note
        item["depth"] = "named"
        item["locked"] = True
        if "military" not in (item.get("tags") or []):
            item["tags"] = sorted(set((item.get("tags") or []) + ["military"]))

        result = depth_mod.check(item, "named")
        if result["missing"] or result["overweight"]:
            problems.append("%s %r: %s" % (local_id, name,
                                           result["missing"] + result["overweight"]))
        report.append("lore  %-9s %-22s %2d words" % (local_id, name, len(note.split())))

    names = [n for n, _k, _n in ENTRIES.values()]
    if len(set(names)) != len(names):
        problems.append("duplicate names within this batch")
    if len(ENTRIES) != 22:
        problems.append("expected exactly 22 entries, found %d" % len(ENTRIES))

    return report, problems


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)

    draft = fetch()
    report, problems = apply_entries(draft)

    for line in report:
        print(line)
    if problems:
        print("\nPROBLEMS:")
        for problem in problems:
            print("  -", problem)
        raise SystemExit(1)

    print("\n%d entries, all clean." % len(ENTRIES))
    if not args.write:
        print("(dry run -- pass --write to send it to the running server)")
        return

    status, res = post(draft["items"])
    if status == 409:
        print("\nREFUSED (409): the draft changed on disk since this script "
              "fetched it -- Ingram's own tab saved in between. Re-run this "
              "script to pick up the fresh state and try again; no data was "
              "overwritten.")
        raise SystemExit(1)
    if status != 200:
        print("\nunexpected status", status, res)
        raise SystemExit(1)
    print("\nsaved:", res.get("saved"))
    if res.get("problems"):
        print("server problems:", res["problems"])


if __name__ == "__main__":
    main()
