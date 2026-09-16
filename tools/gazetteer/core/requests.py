"""The Claude -> Ingram "please define this place" queue.

Stage 7 of the original Gazetteer plan, and the one unblock-Claude path that
plan named and nothing since has built: when writing lore for one place turns
up a second place that matters but has no shape and no note yet -- a named
landmark mentioned in passing, a building a scene needs that nobody has drawn
-- there was no way to say so inside the tool itself. The only channel was
saying it in conversation and hoping it did not get lost in the scrollback,
which is exactly the failure this project's own GitHub-tracker-discipline
rule exists to prevent for code; this is the same discipline for the map.

A request is deliberately small: what is needed, why (so it can be judged
without reconstructing the conversation that raised it), and an optional
`hint` -- a grid reference, so a person opening the map can go straight there
rather than searching. It does NOT carry a proposed shape or proposed lore:
per the standing rule against inventing what a place IS, raising a request is
allowed to say "there should be something here," never "here is what I've
decided it is."

Pure module (load/save are the only I/O, same split as core/overrides.py):
takes and returns a plain requests document, never touches the draft or a
location file itself.
"""

from __future__ import annotations

import datetime
import json
import os

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
REQUESTS_PATH = os.path.join(_REPO_ROOT, "data", "map", "gazetteer-requests.json")

SCHEMA_REL = "../schema/gazetteer-requests.schema.json"


class RequestError(ValueError):
    pass


def empty():
    """A fresh, valid requests document."""
    return {
        "$schema": SCHEMA_REL,
        "id": "gazetteer-requests",
        "type": "gazetteer-requests",
        "requests": [],
    }


def _now(now=None):
    return (now or datetime.datetime.now()).isoformat(timespec="seconds")


def create(doc, what, why="", hint=None, now=None):
    """Raise a new request. Returns (new_doc, the_new_entry) -- the caller
    gets the entry back directly rather than having to find it in the list,
    the same reason core/location.py's own build_location returns the doc it
    just built instead of making the caller re-fetch it.
    """
    what = (what or "").strip()
    if not what:
        raise RequestError("a request needs `what` -- what is missing here")

    existing = doc.get("requests") or []
    highest = 0
    for r in existing:
        digits = "".join(c for c in str(r.get("id") or "") if c.isdigit())
        if digits:
            highest = max(highest, int(digits))
    entry = {
        "id": "req-%d" % (highest + 1),
        "what": what,
        "why": (why or "").strip(),
        "hint": hint or None,
        "status": "open",
        "raisedAt": _now(now),
        "resolvedAt": None,
        "resolution": None,
    }
    new_doc = dict(doc, requests=existing + [entry])
    return new_doc, entry


def resolve(doc, request_id, resolution="", now=None):
    """Mark one request resolved. Refuses on an unknown id or a request that
    is already resolved -- both are a caller's mistake worth surfacing rather
    than a silent no-op, the same choice core/location.py's promotion makes
    for an id that is not already on disk.
    """
    existing = doc.get("requests") or []
    match = next((r for r in existing if r.get("id") == request_id), None)
    if match is None:
        raise RequestError("no request %r" % request_id)
    if match.get("status") == "resolved":
        raise RequestError("request %r is already resolved" % request_id)

    updated = []
    resolved_entry = None
    for r in existing:
        if r.get("id") == request_id:
            r = dict(r, status="resolved", resolvedAt=_now(now),
                     resolution=(resolution or "").strip())
            resolved_entry = r
        updated.append(r)
    return dict(doc, requests=updated), resolved_entry


def open_requests(doc):
    """Open requests, oldest first -- the one raised longest ago is the one
    most likely to have been forgotten, so it belongs at the top."""
    return [r for r in (doc.get("requests") or []) if r.get("status") == "open"]


def load(path=None):
    path = path or REQUESTS_PATH
    if not os.path.exists(path):
        return empty()
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save(doc, path=None):
    path = path or REQUESTS_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
