"""L3 cache: the World after replaying a full operation log, keyed by the
L1 world key plus a content hash of the ops list itself.

design/map-generation.md's own L3 layer, planned from the start ("content-
addressed by op-log prefix hash") but never built -- every render this
session paid the full `replay_ops` cost (500s+ and growing with every op
added) before a single pixel was drawn, even when re-rendering the exact
same map state at a different resolution. Reuses world.py's own
save_world/load_world Artifact machinery completely unchanged: a
post-replay World is structurally just a World, nothing new to serialize.

This is EXACT-match caching (the whole ops list must hash identically), not
true prefix-incremental caching (reusing a shorter prefix's cache when one
new op is appended). That is deliberately the smaller, simpler thing: the
motivating cost is a render panel where the user hits "render" repeatedly
at different resolutions for the SAME map state, which this fully solves.
Prefix-incremental reuse is a real future improvement, not this one.
"""

from __future__ import annotations

from typing import Callable, List, Optional, Tuple

from .. import cache
from ..world import World, load_world, save_world
from . import construct as construct_module
from . import demolish as demolish_module
from . import trace as trace_module
from .log import Operation
from .replay import STAGE_CODE_VERSION as REPLAY_STAGE_CODE_VERSION
from .replay import ReplayStepResult, replay_ops

STAGE_CODE_VERSION = 1


def ops_hash(ops: List[Operation]) -> str:
    """Content hash of an ops list, in order -- reordering, adding, removing,
    or editing any op's payload changes this. The one thing this deliberately
    does NOT do is hash the op module's own logic (see the STAGE_CODE_VERSION
    fields in replayed_world_key_parts for that half of correctness)."""
    return cache.cache_key({"ops": [op.to_dict() for op in ops]})


def replayed_world_key_parts(l1_key_parts: dict, ops: List[Operation]) -> dict:
    return {
        "l1": l1_key_parts,
        # world.py's load_world/world_crs_from_key reads crsEpsg straight off
        # the artifact's key_parts (matching world_key_parts' own shape) --
        # duplicated here from l1_key_parts rather than nested only under
        # "l1", or save_world/load_world would KeyError on this artifact.
        "crsEpsg": l1_key_parts["crsEpsg"],
        "opsHash": ops_hash(ops),
        "replayStageVersion": REPLAY_STAGE_CODE_VERSION,
        "demolishStageVersion": demolish_module.STAGE_CODE_VERSION,
        "constructStageVersion": construct_module.STAGE_CODE_VERSION,
        "traceStageVersion": trace_module.STAGE_CODE_VERSION,
        "cacheStageVersion": STAGE_CODE_VERSION,
    }


def resolve_replayed_world(
    world: World, ops: List[Operation], frame, style, dem_cache_dir: str,
    templates_dir: str, repo_root: str, l1_key_parts: dict,
    on_step: Optional[Callable] = None, on_step_done: Optional[Callable] = None,
    on_note: Callable[[str], None] = lambda msg: None,
) -> Tuple[World, Optional[List[ReplayStepResult]]]:
    """Replays `ops` against `world`, or loads a cached result if this exact
    ops list has already been replayed for this L1 world. `results` is None
    on a cache hit (no step actually ran, so there is nothing to report per
    op) -- callers that print a per-op progress line should treat None as
    "nothing to print, replay was skipped entirely".
    """
    if not ops:
        return world, []

    key_parts = replayed_world_key_parts(l1_key_parts, ops)
    artifact = cache.Artifact(cache.artifact_root(repo_root, "replayed-world"), key_parts)
    if artifact.exists():
        on_note(f"replayed-world cache hit ({artifact.dir})")
        return load_world(artifact), None

    new_world, results = replay_ops(world, ops, frame, style, dem_cache_dir, templates_dir,
                                    on_step=on_step, on_step_done=on_step_done)
    save_world(new_world, artifact)
    return new_world, results
