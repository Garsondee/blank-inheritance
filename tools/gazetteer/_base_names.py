"""Name and describe the Frame base at the island's north-west end.

    python tools/gazetteer/_base_names.py --dry-run
    python tools/gazetteer/_base_names.py --write

The 22 structures Ingram drew and adopted at D3.26-D3.57, plus the two tier
corrections that came with them.

Constraints he gave while this was being written, and they are the shape of
the whole thing: "This end of the island is pure military and checkpoints",
and the school is elsewhere on the island, further south-east. So there is
nothing domestic or civic here -- no classrooms, no shops, no civilian
anything. A garrison, a hangar, workshops, and the machinery of deciding who
gets through a gate.

Names are functional on purpose. Real militaries number their sheds, and it
also sidesteps the naming wall: the city and the Directorate are both still
unnamed and both are Ingram's call.

What is canon and load-bearing here, checked before writing:

  - Six Frames on the roster (config.json frameEconomy.rosterSize). Ingram's
    hangar has NINE bays. Three empty bays is a fact worth leaving alone and
    not explaining.
  - Repair is bought with technician-days from ONE shared weekly pool the
    Directorate allocates, and Frame upgrades compete for the same pool. That
    allocation is a document, and a document has to be posted somewhere.
  - Each pilot has their own repair crew with a named chief. They are never
    called "ground crew" in player-facing text -- Ground Roles are something
    else entirely (config.json frameEconomy.repairCrew.terminologyWarning).
  - Frames do not heal between fights; they walk down Operational ->
    Degraded -> Critical -> Hulked.
  - `A tarp in Hangar Four with a blank maintenance schedule` is a live Ch6
    thread (ideas/story/blank-inheritance-v4.md). Referenced as a GM-facing
    fact and deliberately not explained.

Every entry is written to `named` -- one line, inside the 70-word ceiling --
and the footprint checks in core/shape.py were consulted for each. Three
carry Ingram's own notes; those are APPENDED to, never overwritten, per the
rule in core/session.py.
"""

import argparse
import io
import json
import os
import sys
import urllib.request

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)

from core import depth as depth_mod  # noqa: E402
from core import shape as shape_mod  # noqa: E402

BASE = "http://localhost:8767"

# --- the two tier corrections -------------------------------------------------
# Both were drawn or changed with the wrong tool selected, and both broke the
# tessellation: a building filed as a district overlaps the district it stands
# in, and a district filed as a building leaves a hole where it used to be.
TIER_FIXES = {
    "item-216": "site",    # a 12-point military building, not a district
    "item-217": "site",    # likewise
    "item-178": "region",  # an auto-tessellated district, flipped to site
}

# localId -> (name, note). `note` is APPENDED where Ingram already wrote one.
ENTRIES = {
    # --- the hangar line, on the southern shore ------------------------------
    "item-216": ("Main Mech Hangar",
        "Six bays hold Frames. Three are swept, lit, numbered and empty, and "
        "nobody has been told why the bunker was built with nine."),
    "item-217": ("The Long Store",
        "A quarter-kilometre of racking on rails, ordered by Frame rather "
        "than by part, so a crew can walk their own aisle end to end without "
        "once asking anybody else to move."),
    "item-218": ("The Training House",
        "Its internal walls are bolted rather than built, and the layout is "
        "changed on a schedule that is never published in advance."),

    # --- the workshops, west to east ----------------------------------------
    "item-236": ("No. 1 Machine Shop",
        "The heaviest work on the island: gantries, a pit deep enough to "
        "stand a limb in, and the week's technician-day allocation posted on "
        "the door every Monday. The allocation is argued about for the rest "
        "of the week."),
    "item-222": ("No. 2 Machine Shop",
        "Fitting and assembly, one long bay under a travelling crane. Work "
        "too big for a bench and too small to be worth opening No. 1."),
    "item-229": ("The Plate Shop",
        "Cutting, forming and welding armour plate. Audible across the whole "
        "compound and cordially hated by everyone trying to sleep south of "
        "it."),
    "item-221": ("The Butts",
        "A hundred and twenty metres of covered range under one roof, fourteen "
        "wide. Small-arms qualification happens here in all weather, which on "
        "this island is the entire reason it has a roof."),
    "item-234": ("The Long Shed",
        "Bulk stores: timber, cable, sandbags, the drums nobody has signed "
        "for. Everything here is either about to be needed urgently or has "
        "been in the same place for four years."),
    "item-227": ("The Crew Mess",
        "Where the repair crews eat, and where they drink when a refit "
        "finishes. A pilot who turns up unasked and stands a round tends to "
        "find their Frame gets a night shift nobody allocated."),
    "item-232": ("The Compressor House",
        "Air for the shops, and the reason the whole compound hums. Shut it "
        "down and three buildings stop working within the minute."),
    "item-233": ("The Gas Store",
        "Cylinders in a long narrow shed set apart from everything else, "
        "chained upright, with the door kept open in all but the worst "
        "weather."),
    "item-220": ("The Magazine",
        "Ammunition, sited on its own well clear of the compound and banked "
        "on three sides. Two signatures to open it and a walk to get there, "
        "both of which are the point."),

    # --- the vehicle control point, at the north-east road junction ---------
    "item-230": ("The Gatehouse",
        "The compound's own checkpoint, inside the island's outer ones. "
        "Everything that comes up from the Roadgate stops here a second time "
        "and is asked the same questions by different people."),
    "item-223": ("The Search Bay",
        "A covered lane vehicles are driven through rather than parked in: "
        "inspection pits, mirrors on poles, and a hard standing wide enough "
        "to unload a lorry that has failed."),
    "item-226": ("The Pass Office",
        "Where a permit becomes a pass for this end of the island. Queue "
        "outside, counter inside, and a list on the wall of people who are "
        "not to be issued one."),
    "item-237": ("The Standby House",
        "Generators for when the island's supply drops, which it does. Tested "
        "every Thursday at eleven, loudly, whatever else is happening."),
    "item-235": ("The Transformer House",
        "The compound's power comes ashore here before it goes anywhere else. "
        "Fenced, locked, and the only building at this end with no windows at "
        "all."),
    "item-224": ("The Kennels",
        "Working dogs for the perimeter patrols, and the one building on the "
        "base that anybody volunteers to be posted to."),
    "item-225": ("The Sentry Box",
        "One person, one stove, one telephone, and a view straight down the "
        "approach road."),
    "item-219": ("The Barrier Canopy",
        "Not a building: a roofed lane four metres across with a barrier at "
        "each end. Nobody works inside it, everybody passes through it, and "
        "in the rain that matters more than it sounds."),
    "item-231": ("The Duty Office",
        "One room, one desk, and the log every movement onto this end of the "
        "island is written into by hand."),
    "item-228": ("The Fire Point",
        "Hoses, extinguishers and a hand bell, sited between the shops and "
        "the stores because that is where a fire would start."),
}


def fetch():
    with urllib.request.urlopen(BASE + "/api/session", timeout=20) as fh:
        return json.load(fh)["draft"]


def post(items, force=False):
    body = json.dumps({"items": items, "force": force}).encode("utf-8")
    req = urllib.request.Request(BASE + "/api/session", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as fh:
        return json.load(fh)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)

    draft = fetch()
    by_id = {item["localId"]: item for item in draft["items"]}
    problems = []
    report = []

    for local_id, tier in TIER_FIXES.items():
        item = by_id.get(local_id)
        if item is None:
            problems.append("%s: missing" % local_id)
            continue
        if item["tier"] != tier:
            report.append("tier  %s  %s -> %s" % (local_id, item["tier"], tier))
            item["tier"] = tier
            if tier == "site" and item.get("kind") in ("district", "water"):
                item["kind"] = "military"

    for local_id, (name, addition) in ENTRIES.items():
        item = by_id.get(local_id)
        if item is None:
            problems.append("%s: missing" % local_id)
            continue
        existing = (item.get("note") or "").strip()
        addition = " ".join(addition.split())
        # Ingram's own text is never rewritten -- corrections append. Two
        # details that matter when appending to somebody else's sentence:
        # re-running must not append twice, and a note that ends without
        # punctuation needs a full stop supplied or the two run together.
        if existing.endswith(addition):
            note = existing
        elif existing:
            joiner = "" if existing[-1] in ".!?:" else "."
            note = existing + joiner + " " + addition
        else:
            note = addition
        item["name"] = name
        item["note"] = note
        item["depth"] = "named"
        item["locked"] = True
        if "military" not in (item.get("tags") or []):
            item["tags"] = sorted(set((item.get("tags") or []) + ["military"]))

        result = depth_mod.check(item, "named")
        if result["missing"] or result["overweight"]:
            problems.append("%s %r: %s" % (local_id, name,
                                           result["missing"] + result["overweight"]))
        words = len(note.split())
        kept = "kept+appended" if existing else "written"
        report.append("lore  %-9s %-22s %2d words  %s" % (local_id, name, words, kept))

    names = [n for n, _a in ENTRIES.values()]
    if len(set(names)) != len(names):
        problems.append("duplicate names")

    for line in report:
        print(line)
    if problems:
        print("\nPROBLEMS:")
        for problem in problems:
            print("  -", problem)
        raise SystemExit(1)

    if not args.write:
        print("\n(dry run -- pass --write to send it to the running server)")
        return

    res = post(draft["items"])
    print("\nsaved:", res.get("saved"))
    if res.get("problems"):
        print("server problems:", res["problems"])


if __name__ == "__main__":
    main()
