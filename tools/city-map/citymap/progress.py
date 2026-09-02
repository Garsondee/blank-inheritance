"""Minimal, dependency-free progress reporting for long-running CLI stages.

Stdlib only, on purpose: requirements.txt is deliberately pinned to exactly
what render.py needs (shapely, pyproj, numpy, pillow, scipy) -- a progress
bar is not worth adding a new one for.
"""

from __future__ import annotations

import sys
import time
from typing import Optional, TextIO

STAGE_CODE_VERSION = 1

BAR_WIDTH = 30


class ProgressReporter:
    """A single updating line: a bar, a count, elapsed time, and an ETA
    projected from the average time-per-item seen so far. `label` identifies
    the stage (e.g. "DEM tiles", "export tiles") since a full render runs
    through several of these one after another.
    """

    def __init__(self, total: int, label: str, stream: Optional[TextIO] = None):
        self.total = max(int(total), 1)
        self.label = label
        self.stream = stream if stream is not None else sys.stdout
        self.done = 0
        self.start_time = time.perf_counter()
        self._closed = False
        self._render()

    def update(self, n: int = 1) -> None:
        self.done = min(self.total, self.done + n)
        self._render()

    def set(self, done: int) -> None:
        self.done = min(self.total, max(0, done))
        self._render()

    def finish(self) -> None:
        if self._closed:
            return
        self.done = self.total
        self._render()
        self.stream.write("\n")
        self.stream.flush()
        self._closed = True

    def _render(self) -> None:
        elapsed = time.perf_counter() - self.start_time
        frac = self.done / self.total
        filled = int(round(BAR_WIDTH * frac))
        bar = "#" * filled + "-" * (BAR_WIDTH - filled)
        if self.done == 0:
            eta = "estimating..."
        elif self.done >= self.total:
            eta = "done"
        else:
            per_item = elapsed / self.done
            eta = f"~{per_item * (self.total - self.done):.0f}s left"
        line = (f"\r{self.label}: [{bar}] {self.done}/{self.total} "
               f"({100*frac:5.1f}%)  {elapsed:6.1f}s elapsed, {eta}")
        # Pad with trailing spaces so a shorter line fully overwrites a
        # longer previous one instead of leaving stray characters behind.
        self.stream.write(line.ljust(100))
        self.stream.flush()

    def __enter__(self) -> "ProgressReporter":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is None:
            self.finish()
        else:
            self.stream.write("\n")


class StageTimer:
    """Prints a start line, then an elapsed-time end line -- for stages with
    no natural item count to bar against (e.g. 'building the sea polygon')."""

    def __init__(self, label: str, stream: Optional[TextIO] = None):
        self.label = label
        self.stream = stream if stream is not None else sys.stdout
        self.start_time: Optional[float] = None

    def __enter__(self) -> "StageTimer":
        self.start_time = time.perf_counter()
        self.stream.write(f"{self.label}... ")
        self.stream.flush()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        elapsed = time.perf_counter() - (self.start_time or time.perf_counter())
        if exc_type is None:
            self.stream.write(f"done ({elapsed:.1f}s)\n")
        else:
            self.stream.write(f"FAILED after {elapsed:.1f}s\n")
        self.stream.flush()
