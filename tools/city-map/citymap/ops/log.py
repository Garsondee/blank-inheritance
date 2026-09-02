"""The operation log itself: an ordered, append-only list of edits.

design/map-generation.md §6: render = import the base world, then replay the
log. Never a destructive edit. Op coordinates are lon/lat (§6, revised
2026-08-24) -- frame-invariant, unlike world-frame metres, because the frame's
centre/rotation/extent have all changed repeatedly during this project's own
render sessions.

An `Operation` here is deliberately a thin, mostly-untyped wrapper around
whatever payload its `op` kind needs -- `ops/construct.py` and
`ops/demolish.py` own the shape of their own payloads and validate them
themselves, rather than this module trying to pre-declare every op kind's
fields (which would make adding `crater`/`excavate`/`reclaim` later a change
to this file instead of a self-contained addition elsewhere).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List

STAGE_CODE_VERSION = 1

KNOWN_OPS = {"construct", "trace", "crater", "excavate", "reclaim",
            "rezone", "rename", "override", "demolish"}


class OpLogError(ValueError):
    pass


@dataclass
class Operation:
    id: str
    op: str
    when: str = ""
    note: str = ""
    payload: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, raw: Dict[str, Any]) -> "Operation":
        if "id" not in raw:
            raise OpLogError(f"operation missing required 'id': {raw}")
        if "op" not in raw:
            raise OpLogError(f"operation {raw['id']!r} missing required 'op'")
        if raw["op"] not in KNOWN_OPS:
            raise OpLogError(f"operation {raw['id']!r} has unknown op kind "
                             f"{raw['op']!r}; known kinds: {sorted(KNOWN_OPS)}")
        payload = {k: v for k, v in raw.items() if k not in ("id", "op", "when", "note")}
        return cls(id=raw["id"], op=raw["op"], when=raw.get("when", ""),
                  note=raw.get("note", ""), payload=payload)

    def to_dict(self) -> Dict[str, Any]:
        out = {"id": self.id, "op": self.op}
        if self.when:
            out["when"] = self.when
        if self.note:
            out["note"] = self.note
        out.update(self.payload)
        return out


def load_ops(path: str) -> List[Operation]:
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    entries = raw["operations"] if isinstance(raw, dict) else raw
    ops = [Operation.from_dict(entry) for entry in entries]
    seen_ids = set()
    for op in ops:
        if op.id in seen_ids:
            raise OpLogError(f"duplicate operation id {op.id!r} -- ids must be "
                             f"unique for replay and for op-sourced feature ids "
                             f"(see ids.op_feature_id) to stay stable")
        seen_ids.add(op.id)
    return ops


def save_ops(path: str, ops: List[Operation]) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"operations": [op.to_dict() for op in ops]}, fh,
                  ensure_ascii=False, indent=2)
        fh.write("\n")


def prefix_key(ops: List[Operation], upto: int) -> str:
    """Content-address the first `upto` ops -- the L3 cache key. Appending an
    op and re-rendering reuses everything up to the append; this is the whole
    point of an append-only log."""
    from .. import cache
    canonical = [op.to_dict() for op in ops[:upto]]
    return cache.cache_key({"ops": canonical})
