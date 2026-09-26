"""The reduced-motion opening: the same song and pictures, far fewer cuts, gentle movement, no flashing.

Ingram: "one video is the full anime epileptic inducing intro and the other one is a reduced motion and zero
flashing version, one designed to fit the beat but we use far less shots and produce something that won't make
people sick. Images should move 50% less and 50% slower whilst trying to keep the middle of their movement front
and center to avoid us always showing the start of pans and not the ends. Instead we'll show the bit in the middle."

It is built from the full timeline, never a copy of it, so every picture swapped into the full opening turns up here
too. data/title-sequences/opening-reduced.json says:

- `segments`: the reduced cut, in order. Each shows one of the full opening's shots (`shot`, or `shots`: [first,
  last] to take a run of them as one) until the reduced video's track time `until`, and it plays the middle of that
  shot slowly: over the segment, time in the shot runs at `motion` (default the file's `motion`, 0.5) times the
  shot's own pace or slower, centred on the shot's middle. So every move shows half its travel or less, at half its
  speed or less, and always the middle of it.
- `dissolve`: frames of cross-dissolve at every cut, so the picture never jumps in brightness from one frame to the
  next.
- `drop_types` and `drop`: layers taken out because they flash (tape tears, lightning, flares, white-outs).
- `layer_overrides`: parameters changed on named clips (the pre-roll's tape stays locked, the haze is gentler).
- `text`: settings forced on every text layer (no flicker, no weave).
- `finish`: overrides to the full timeline's tape finish (no dropouts, less jitter).

Credits are drawn at the reduced video's own time, not the shot's, so they still land on the music exactly as in the
full opening.
"""
import copy
import json
import math

from . import clock, raster, timeline


def load(path, base):
    with open(path, encoding="utf-8") as f:
        spec = json.load(f)
    return Reduced(spec, base)


class Reduced:
    def __init__(self, spec, base):
        self.spec = spec
        self.motion = float(spec.get("motion", 0.5))
        self.dissolve = int(spec.get("dissolve", 0))
        shots = base["shots"]
        order = [s["id"] for s in shots]
        first_frame = lambda t: clock.frame_to_time(math.ceil((t + clock.LEAD_IN) * clock.FPS - 1e-3))
        ins = {s["id"]: first_frame(s["in"]) for s in shots}         # a shot's span runs from its first frame
        end_of = {s["id"]: (ins[order[i + 1]] if i + 1 < len(order) else clock.frame_to_time(clock.total_frames()))
                  for i, s in enumerate(shots)}
        self.segments = []
        start = clock.frame_to_time(0)
        for seg in spec["segments"]:
            first, last = seg.get("shots", [seg.get("shot"), seg.get("shot")])
            s0, s1 = ins[first], end_of[last]
            until = clock.TRACK_LENGTH if seg["until"] == "end" else float(seg["until"])
            motion = float(seg.get("motion", self.motion))
            self.segments.append({"shot": first, "last": last, "a": start, "b": until, "s0": s0, "s1": s1,
                                  "motion": motion})
            start = until
        self.doc = self._calm(base)
        self.credits = [c for c in self.doc["clips"] if c["layer"].get("kind") == "credit"]
        self.pictures = dict(self.doc, clips=[c for c in self.doc["clips"] if c["layer"].get("kind") != "credit"])
        self.credit_doc = {"clips": self.credits}

    def _calm(self, base):
        """The full timeline with everything that flashes taken out, and its type and finish calmed."""
        doc = copy.deepcopy(base)
        drop_types = set(self.spec.get("drop_types", []))
        drop = set(self.spec.get("drop", []))
        doc["clips"] = [c for c in doc["clips"] if c["id"] not in drop and c["layer"]["type"] not in drop_types]
        overrides = self.spec.get("layer_overrides", {})
        text = self.spec.get("text", {})
        for c in doc["clips"]:
            if c["id"] in overrides:
                ov = overrides[c["id"]]
                c["layer"].update(ov)
                for k in c.get("keys", []):                        # an overridden parameter is held, not keyed
                    for name in ov:
                        k.pop(name, None)
            if c["layer"]["type"] == "text":
                c["layer"].update(text)
        vhs = dict(doc.get("finish", {}).get("vhs", {}))
        vhs.update(self.spec.get("finish", {}).get("vhs", {}))
        doc["finish"] = {"vhs": vhs}
        return doc

    def segment_at(self, t):
        for i, s in enumerate(self.segments):
            if t < s["b"]:
                return i
        return len(self.segments) - 1

    def rate(self, i):
        """How fast the shot's own time runs during segment i: at most `motion` of its pace, less when the segment
        is longer than the shot."""
        s = self.segments[i]
        return s["motion"] * min(1.0, (s["s1"] - s["s0"]) / max(1e-6, s["b"] - s["a"]))

    def source_time(self, i, t):
        """The full opening's time shown at reduced-video time t by segment i: the shot's middle, slowed, and kept
        inside the shot."""
        s = self.segments[i]
        if s["motion"] >= 1.0:
            u = s["s0"] + (t - s["a"])                              # a still card played as it is, from its start
        else:
            u = (s["s0"] + s["s1"]) / 2 + (t - (s["a"] + s["b"]) / 2) * self.rate(i)
        return min(max(u, s["s0"]), s["s1"] - 1.0 / (clock.FPS * 4))

    def picture(self, i, t):
        return timeline.compose(self.pictures, self.source_time(i, t))

    def compose(self, n):
        """The reduced opening's frame n: its segment's picture (cross-dissolved at the cuts), the credits at their
        own times, the calmed tape finish. The pre-roll (n < 0) plays as it is, calmed."""
        t = clock.frame_to_time(n)
        if n < 0:
            return timeline.compose(self.doc, t, finish_n=n)
        i = self.segment_at(t)
        img = self.picture(i, t)
        half = self.dissolve / clock.FPS / 2
        s = self.segments[i]
        if self.dissolve and i + 1 < len(self.segments) and t >= s["b"] - half:
            w = (t - (s["b"] - half)) / (2 * half)
            img = img * (1 - w) + self.picture(i + 1, t) * w
        elif self.dissolve and i > 0 and t < s["a"] + half:
            w = (t - (s["a"] - half)) / (2 * half)
            img = self.picture(i - 1, t) * (1 - w) + img * w
        for c in sorted(self.credits, key=lambda c: c.get("z", 0)):
            p = timeline.params_at(c, t)
            if p is not None:
                timeline.draw(img, p)
        timeline.finish(self.doc, img, n)
        for c in self.doc["clips"]:                                   # the VCR's own captions sit above the finish
            if c["layer"].get("above_finish"):
                p = timeline.params_at(c, t)
                if p is not None:
                    timeline.draw(img, p)
        return img

    def cuts(self):
        """The reduced video's cut times (the starts of every segment after the first)."""
        return [s["a"] for s in self.segments[1:]]
