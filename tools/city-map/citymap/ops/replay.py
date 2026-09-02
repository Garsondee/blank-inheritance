"""Replay an operation log against a World: render = base World + replay
(design/map-generation.md §6). This is the dispatch table `demolish`/
`construct` were always meant to sit behind; lifted out of what was a
throwaway apply-ops script into the real package once it became clear the
CLI needs it too, not just one-off sessions.

Fields must be rebuilt between ops that need real terrain (`construct`) and
whatever ran before them, because each op can change what Fields.elevation
and Fields.features look like (a demolish removes buildings the NEXT op's
routing should no longer treat as obstacles; a construct's own terrain bench
should be visible to whatever comes after it). `demolish` alone never needs
this rebuild (it doesn't touch elevation and works from World directly), so
it is skipped there purely as a cost saving, not for correctness.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple

from . import construct as construct_module
from . import demolish as demolish_module
from . import trace as trace_module
from .log import Operation
from ..world import World

STAGE_CODE_VERSION = 1


@dataclass
class ReplayStepResult:
    op: Operation
    report: object  # DemolishReport | ConstructReport


def replay_ops(world: World, ops: List[Operation], frame, style, dem_cache_dir: str,
               templates_dir: str, on_step: Optional[Callable[[int, int, Operation], None]] = None,
               on_step_done: Optional[Callable[[int, int, Operation, object], None]] = None
               ) -> Tuple[World, List[ReplayStepResult]]:
    """Apply every op in order, returning the final World and one report per
    step. `on_step(index, total, op)` fires just before each op runs;
    `on_step_done(index, total, op, report)` fires right after it finishes,
    report in hand -- both for progress reporting (see progress.py). Two
    separate callbacks, not one fired twice, because a caller printing a
    "[i/total] name ... " prefix without a trailing newline (so "done" can
    land on the same line) needs to know which case it's in without a flag.
    """
    from .. import fields as fields_module
    import os

    current = world
    results: List[ReplayStepResult] = []
    total = len(ops)

    for i, op in enumerate(ops):
        if on_step is not None:
            on_step(i, total, op)

        if op.op == "demolish":
            current, report = demolish_module.apply_demolish(current, op, frame)
        elif op.op == "construct":
            template_path = os.path.join(templates_dir, f"{op.payload['template']}.json")
            template = construct_module.Template.from_file(template_path)
            current_fields = fields_module.build_fields(current, frame, dem_cache_dir, style)
            current, report = construct_module.apply_construct(current, current_fields, op, frame, template)
        elif op.op == "trace":
            current, report = trace_module.apply_trace(current, op, frame)
        else:
            raise NotImplementedError(
                f"operation {op.id!r} has kind {op.op!r}, not yet implemented in replay_ops "
                f"(known but unbuilt: crater, excavate, reclaim, rezone, rename, override)")

        results.append(ReplayStepResult(op=op, report=report))
        if on_step_done is not None:
            on_step_done(i, total, op, report)

    return current, results
