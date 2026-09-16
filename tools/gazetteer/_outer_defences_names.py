"""Name and describe the fortress island's outer bunkers, watchtowers and
entrance buildings -- the 44-item handoff Ingram pasted after drawing and
tagging them (rough notes like "bunker", "watchtower", "large bunker" and a
few longer ones already in place).

    python tools/gazetteer/_outer_defences_names.py --dry-run
    python tools/gazetteer/_outer_defences_names.py --write

Covers, by district: The Causeway Pool (1), the park at the train entrance
(4), Firing Range and Frame/Vehicle Training Ground (1), The Long Sheds (1),
The Landing End (16), the still-unnamed sub-district bordering Island
Centre/Landing End/Inner Harbour (4), Island Centre (5), the airfield (3),
and The Container Ground (9). 1+4+1+1+16+4+5+3+9 = 44.

Same register as _base_names.py's 22 (read that first): functional,
real-military names, nothing domestic or civic inside The Landing End
itself (its own brief: "Pure military and checkpoints. No civilians."). The
park district is the one exception on purpose -- it is the first thing an
arriving train passenger sees, and Ingram's own note calls it a deliberate
"fresh and green first impression," so its four buildings read as an
arrival experience rather than a fighting position, even though the very
next building over the same grid cell is a gun position wearing a similar
disguise (see item-477 below).

Checked before writing, so this doesn't collide with or duplicate work
already on the island:
  - All 152 names already in the live session (fetched fresh, not hand-
    counted) -- checked for exact collisions against every name below.
  - LEDGER.md #13: the same island's north-west end already has a named,
    lore-complete 22-building core (_base_names.py) -- Roadgate, Gatehouse,
    Search Bay, Pass Office, the workshop row, the vehicle control point.
    None of that is touched or renamed here; these 44 are the buildings
    drawn and adopted SINCE that pass, further out along the same
    perimeter and into three more districts.
  - `data/locations/the-roadgate.json` / `the-gatehouse.json`: already
    promoted. item-476 (Causeway Pool) is sited to watch the causeway's
    own land approach, so it is written as the Roadgate's own overwatch,
    not as a second, redundant gate.
  - `naming-placeholders.json#school-name`'s "candidate camp" is already
    built out in full elsewhere in this session (Row A-G housing blocks,
    Candidate Gate, Long Hall, Wash House) -- nothing here is that.

item-477 and item-174 share one detail that has to be written on both
sides of it: a sky bridge connects them. Splitting that between two
independently-editable notes is exactly how it would go stale the next
time either building's text is touched, so both mention the other by name.

Every entry targets depth `named`: one line, inside the 70-word ceiling.
Three items (item-459, item-501, item-500, item-503) have no existing note
at all, so the line below IS the note, not an addition to one -- the same
append-vs-write branch _base_names.py already handles.
"""

import argparse
import json
import os
import sys
import urllib.request

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)

from core import depth as depth_mod  # noqa: E402

BASE = "http://localhost:8767"

# localId -> (name, note_addition, kind)
ENTRIES = {
    # --- The Causeway Pool ---------------------------------------------------
    "item-476": ("The Land Battery", "military",
        "Faces inland across the causeway approach rather than out to sea -- "
        "the one gun position on the island built to watch its own front "
        "door."),

    # --- the park at the train entrance --------------------------------------
    "item-170": ("The Welcome House", "transport",
        "The first roof over anyone's head after the causeway: a waiting "
        "hall downstairs, a records office above, built pretty on purpose so "
        "the crossing feels like an arrival rather than a search."),
    "item-167": ("The Ticket Window", "transport",
        "One counter, one clerk, one queue. Nobody gets further onto the "
        "island without a stub from here."),
    "item-171": ("The Arrivals Hall", "transport",
        "Baggage laid out on trestles for a look before it travels any "
        "further, under the same roof as the benches where families wait "
        "for a platform to be called."),
    "item-172": ("The Wayside Shrine", "green",
        "A single stone lantern and a coin box, tucked under the elevated "
        "line's own shadow. Off-duty guards leave the first coin of their "
        "pay here more often than anyone admits."),

    # --- Firing Range and Frame / Vehicle Training Ground --------------------
    "item-475": ("The Backstop Bund", "military",
        "An earth-and-concrete wall built to fail long before a stray round "
        "or a bad detonation reaches the harbour behind it. Nobody has ever "
        "seen it tested to the limit and everybody would like to keep it "
        "that way."),

    # --- The Long Sheds -------------------------------------------------------
    "item-474": ("The Sheds Battery", "military",
        "Sunk into the same shoreline the sheds themselves back onto, "
        "watching the one stretch of open water the district's own "
        "warehouses can't see past."),

    # --- The Landing End -------------------------------------------------------
    "item-174": ("The Arrivals Guardhouse", "military",
        "Every candidate and every crate off the train is logged here "
        "first. A sky bridge from the Garden Bunker next door lets its "
        "crew reach the gate without stepping outside."),
    "item-175": ("The Watch Range", "civic",
        "A long, low frontage built to be walked its whole length on a "
        "patrol, doors set at intervals rather than one at each end."),
    "item-164": ("The Duty Records Room", "military",
        "Every pass, permit and manifest for this end of the island "
        "crosses one counter here before it is worth anything anywhere "
        "else."),
    "item-166": ("The Reserve Store", "military",
        "Kit and rations held back from the working stores nearer the "
        "shops, signed for only when the everyday supply runs short."),
    "item-168": ("The Muster Hall", "military",
        "Big enough to fall a whole intake in for roll call under one "
        "roof when the weather makes the yard outside a bad idea."),
    "item-169": ("The Drill Shed", "military",
        "A single covered lane just wide enough to march a squad down in "
        "the rain, which on this island is most of the year."),
    "item-478": ("The Grey Block", "military",
        "Cast in the same tight-grained concrete as its neighbour along "
        "the row, until you notice the slits: every one of them a firing "
        "port, none of them a window."),
    "item-479": ("The Second Watch Bunker", "military",
        "Sited to cover the ground the Grey Block's own guns can't reach, "
        "and named for the shift that mostly stands it."),
    "item-480": ("The Approach Bunker", "military",
        "The first hardened position anyone crossing from the mainland "
        "side actually sees, and built to be seen: the whole point of it "
        "is that it's obvious."),
    "item-481": ("The Rail Watch", "military",
        "Looks straight down the line the trains use, and is manned every "
        "time one is due."),
    "item-173": ("The Transit Barracks", "military",
        "Four floors of bunks for personnel passing through rather than "
        "posted here, none of them assigned a bed for longer than a week "
        "at a time."),
    "item-477": ("The Garden Bunker", "military",
        "The building the bridge leads to is the Arrivals Guardhouse."),
    "item-161": ("The Equipment Store", "military",
        "Webbing, tools and the things a posting actually needs day to "
        "day, signed out each morning and checked back in every night."),
    "item-162": ("The Charge Room", "military",
        "Barely bigger than the batteries and generators racked inside "
        "it, kept locked whether anyone's working or not."),
    "item-163": ("The Vehicle Shed", "military",
        "An L-shaped bay built around the one corner of the yard wide "
        "enough to turn a truck without reversing twice."),
    "item-165": ("The Orderly Room", "military",
        "Paperwork for this corner of the compound: postings, leave, and "
        "a duty roster nobody has ever seen finished a week in advance."),

    # --- the sub-district bordering Island Centre / Landing End / Inner Harbour
    "item-482": ("The Harbour Bunker", "military",
        "Faces the Inner Harbour rather than the open sea, covering the "
        "one approach the bigger coastal guns were never angled for."),
    "item-483": ("The Harbour Watch", "military",
        "Stands beside the Harbour Bunker and answers the same telephone "
        "line, so the two are worked as one post in practice."),
    "item-484": ("The Crooked Bunker", "military",
        "Poured in one continuous, awkward run rather than the usual "
        "straight lines, because the ground underneath it wouldn't take a "
        "normal footing. Nobody who works inside it finds a single right "
        "angle."),
    "item-485": ("The Point Watch", "military",
        "The furthest-flung post on this stretch of shore, and the first "
        "to lose its telephone line whenever the weather turns."),

    # --- Island Centre ----------------------------------------------------------
    "item-459": ("The Signal Bunker", "military",
        "Every field telephone line at this end of the island runs "
        "through one exchange room here before it goes anywhere else."),
    "item-460": ("The Ready Bunker", "military",
        "Ready ammunition kept above the Magazine's own strict limits, "
        "close enough to the HQ's sea front to be resupplied in minutes "
        "rather than hours."),
    "item-461": ("The Deep Command", "military",
        "Built lower and thicker than anything else on the island: the "
        "post the HQ actually falls back to if the sea front itself is "
        "ever overrun."),
    "item-501": ("No. 2 Barracks", "military",
        "Three floors, laid out identically, built for whoever is posted "
        "to Island Centre rather than for any one unit in particular."),
    "item-500": ("No. 1 Barracks", "military",
        "The tallest posting on this end of the island: five floors for "
        "the units held in reserve closest to the HQ."),

    # --- the airfield -------------------------------------------------------
    "item-473": ("No. 1 Blast Pen", "military",
        "Built to take a single Frame or a pair of aircraft under cover, "
        "walled high enough on three sides that a strike on one pen can't "
        "reach the next."),
    "item-503": ("The Flight Office", "military",
        "Where a sortie is actually logged: who flew, what left loaded, "
        "and what came back."),
    "item-472": ("No. 2 Blast Pen", "military",
        "The airfield's second hardened bay, sited far enough from the "
        "first that the same strike can't take both."),

    # --- The Container Ground -------------------------------------------------
    "item-463": ("The West Yard Bunker", "military",
        "Covers the container stacks nearest the water, where a lift "
        "crane working after dark makes the easiest target on the whole "
        "ground."),
    "item-464": ("No. 1 Yard Watch", "military",
        "Looks straight down the nearest stacking lane and nowhere else; "
        "the container walls block everything past it."),
    "item-465": ("The Mid Yard Bunker", "military",
        "Sited between two stacking blocks rather than at either end, so "
        "its own arc of fire covers the gap the other bunkers can't."),
    "item-466": ("The East Yard Bunker", "military",
        "The furthest bunker from the gate, and the one most often "
        "forgotten on a supply run until someone remembers it still needs "
        "feeding too."),
    "item-471": ("The Rail Interchange Bunker", "military",
        "Built where the yard's own siding meets the main line, big "
        "enough to hold a full platoon for as long as a train takes to "
        "unload."),
    "item-467": ("No. 2 Yard Watch", "military",
        "Stands taller than its neighbours specifically to see over the "
        "highest stack the yard is ever allowed to build."),
    "item-468": ("No. 3 Yard Watch", "military",
        "The last tower before the open ground past the container yard's "
        "own fence line."),
    "item-469": ("The Fence Line Bunker", "military",
        "Sits astride the yard's outer perimeter fence rather than behind "
        "it -- the one position built to be the first thing hit rather "
        "than the last."),
    "item-470": ("The Reserve Yard Bunker", "military",
        "Holds the spare stacking crews and their gear against the day "
        "the working bunkers nearer the gate are ever knocked out."),
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

    # Every existing name in the session, so a new one can never silently
    # collide with something already on the map -- the exact failure mode
    # _base_names.py only checked ITS OWN 22 against each other, not
    # against the other 152 already drawn since.
    existing_names = {(item.get("name") or "").strip()
                      for item in draft["items"]} - {""}

    for local_id, (name, kind, addition) in ENTRIES.items():
        item = by_id.get(local_id)
        if item is None:
            problems.append("%s: missing" % local_id)
            continue
        current_name = (item.get("name") or "").strip()
        if name in existing_names and name != current_name:
            problems.append("%s: %r already used elsewhere" % (local_id, name))
            continue

        existing = (item.get("note") or "").strip()
        addition = " ".join(addition.split())
        if existing.endswith(addition):
            note = existing
        elif existing:
            joiner = "" if existing[-1] in ".!?:" else "."
            note = existing + joiner + " " + addition
        else:
            note = addition

        item["name"] = name
        item["kind"] = kind
        item["note"] = note
        item["depth"] = "named"
        item["locked"] = True
        if "military" not in (item.get("tags") or []) and kind == "military":
            item["tags"] = sorted(set((item.get("tags") or []) + ["military"]))

        result = depth_mod.check(item, "named")
        if result["missing"] or result["overweight"]:
            problems.append("%s %r: %s" % (local_id, name,
                                           result["missing"] + result["overweight"]))
        words = len(note.split())
        kept = "kept+appended" if existing else "written"
        report.append("lore  %-9s %-26s %2d words  %s" % (local_id, name, words, kept))

    names = [n for n, _k, _a in ENTRIES.values()]
    if len(set(names)) != len(names):
        problems.append("duplicate names within this batch")
    if len(ENTRIES) != 44:
        problems.append("expected exactly 44 entries, found %d" % len(ENTRIES))

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

    res = post(draft["items"])
    print("\nsaved:", res.get("saved"))
    if res.get("problems"):
        print("server problems:", res["problems"])


if __name__ == "__main__":
    main()
