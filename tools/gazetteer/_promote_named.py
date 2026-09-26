"""Sweep every draft item that has a name or note but has never been
promoted, and promote each one into data/locations/*.json.

Why this script exists. data/map/gazetteer-drafts/session-*.json is
gitignored on purpose (.gitignore:142, same precedent as
editor-submissions/) -- it is scratch space, autosaved on every edit but
never committed, never backed up by anything this repo controls. It has
already lost data once this session, to a code bug that is now fixed, but
the file itself staying gitignored forever is not a bug, it is the design:
data/locations/*.json is the durable, tracked, schema-validated home a
location is meant to end up in (core/location.py's own docstring calls
promotion "the one-way door" out of scratch space). A name and a note that
only ever exist in the draft are one disk failure, one accidental
`git clean`, or one lost session away from being gone with nothing in git
history to recover them from. Promoting is the only thing that closes that
gap -- so run this after any naming pass, not just once at the end of the
project.

    python tools/gazetteer/_promote_named.py            # dry run
    python tools/gazetteer/_promote_named.py --write

Only touches items that already have BOTH a name and a note (validation
would let a note-only item through too, but a location with no name is not
what "named" depth is supposed to mean, so this script holds itself to a
tighter bar than the server does). Anything named but not yet really
titled -- a rough placeholder like "concrete bunker for storing aircraft",
same text in both name and note -- is left alone rather than promoted
under that placeholder text; it is printed as skipped so it doesn't go
unnoticed, but naming it properly is separate, collaborative work.

/api/promote reads the server's own live draft state at call time by
localId, not a client-supplied snapshot the way /api/session's save does --
so this is safe to run against a session Ingram may be actively editing in
another tab: each promotion is a small, independent, atomic step against
whatever the server currently has, never a whole-draft replace, and never
touches an item this script didn't select.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)

BASE = "http://localhost:8767"
LOCATIONS_DIR = os.path.join(_HERE, "..", "..", "data", "locations")


def fetch():
    with urllib.request.urlopen(BASE + "/api/session", timeout=20) as fh:
        return json.load(fh)["draft"]


def promote(local_id, location_id):
    body = json.dumps({"localId": local_id, "id": location_id}).encode("utf-8")
    req = urllib.request.Request(BASE + "/api/promote", data=body,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as fh:
            return 200, json.load(fh)
    except urllib.error.HTTPError as exc:
        return exc.code, json.load(exc)


def slugify(name):
    # Matches static/app.js's promoteSelected() exactly, so an id typed by
    # hand in the UI and one generated here never disagree on the same name.
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return slug.strip("-")


def looks_like_a_placeholder(item):
    name = (item.get("name") or "").strip()
    note = (item.get("note") or "").strip()
    return name == note


def existing_location_ids():
    return {fn[:-5] for fn in os.listdir(LOCATIONS_DIR) if fn.endswith(".json")}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args(argv)

    draft = fetch()
    taken = existing_location_ids()

    candidates = []
    skipped = []
    for item in draft["items"]:
        name = (item.get("name") or "").strip()
        note = (item.get("note") or "").strip()
        if item.get("locationRef"):
            continue
        if not name or not note:
            continue
        if looks_like_a_placeholder(item):
            skipped.append((item["localId"], name, "name and note are identical -- "
                            "looks like a rough placeholder, not a real title yet"))
            continue
        geom = item.get("geometry") or {}
        if geom.get("kind") == "polygon" and len(geom.get("ringPx") or []) < 3:
            skipped.append((item["localId"], name, "polygon has fewer than 3 points"))
            continue
        if geom.get("kind") == "point" and not geom.get("pointPx"):
            skipped.append((item["localId"], name, "point has no position"))
            continue
        candidates.append(item)

    plan = []
    for item in candidates:
        slug = slugify(item["name"])
        location_id = slug
        if location_id in taken:
            location_id = "%s-%s" % (slug, item["localId"].replace("item-", ""))
        taken.add(location_id)
        plan.append((item["localId"], item["name"], location_id))

    for local_id, name, location_id in plan:
        print("promote  %-9s %-26s -> data/locations/%s.json" % (local_id, name, location_id))
    for local_id, name, reason in skipped:
        print("skip     %-9s %-26s (%s)" % (local_id, name, reason))

    if not plan:
        print("\nnothing to promote.")
        return

    print("\n%d to promote, %d skipped." % (len(plan), len(skipped)))
    if not args.write:
        print("(dry run -- pass --write to actually promote)")
        return

    ok, failed = 0, []
    for local_id, name, location_id in plan:
        status, res = promote(local_id, location_id)
        if status == 200:
            ok += 1
            print("  saved: %s" % res.get("saved"))
        else:
            failed.append((local_id, name, status, res.get("error") or res))
            print("  FAILED %s %r: %s %s" % (local_id, name, status, res.get("error") or res))

    print("\n%d promoted, %d failed." % (ok, len(failed)))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
