"""The timeline: data/title-sequences/opening.json.

Shape (all times are track seconds, see clock.py):

    {
      "id": "opening",
      "built": ["R00", "R01", ...],          # shots rendered from our own layers; the rest show the source (REF)
      "clips": [
        {"id": "r01-dot", "shot": "R01", "start": -0.5, "end": 0.15, "z": 10,
         "layer": {"type": "glow_dot", ...fixed params...},
         "interp": "hold" | "linear",        # how keyed params change between keys (default "hold")
         "keys": [{"t": -0.5, "strength": 1.0}, ...]}   # optional keyframes; a key's params override the layer's
      ]
    }

"hold" is the default because cel animation holds each drawing: a key's values stay until the next key, exactly
as the source's drawings do. A clip is on screen from start (inclusive) to end (exclusive), and only from its
first key onward if it has keys.
"""
import json
import math
import numbers

from . import clock, finale, fx, hud, layers, matte
from .raster import canvas, rgb01

LAYER_TYPES = {"solid", "glow_dot", "glint", "cel_band", "droplets", "airbrush_ring", "wash", "bloom",
               "image", "video", "text", "dust", "logo", "logo_light", "beam", "polygon", "ref_still",
               "vhs_damage", "heat_haze", "tape_blank", "osd", "slate", "light_column", "field", "orb", "ray_fan",
               "arcs", "radar", "data_bars", "streaks", "cast_card", "tab_panel", "status_wall", "door_open", "scope_hud", "stained_wall",
               "motes", "lens_flare"}
TEXT_KINDS = {"credit", "diegetic", "title"}
LOGO_PARTS = {"wordmark", "kanji", "book", "kanji_alpha"}


def load(path):
    with open(path, encoding="utf-8") as f:
        return normalize(json.load(f))


def length(doc):
    """Seconds of programme on the timeline's clock, from time 0: the track's own length (or the timeline's
    `length`, for one with no track, such as an episode title card), plus its `tail`, the seconds held after the
    music ends so the picture can fade out slowly (Ingram, 2026-09-26: "we need a longer tail")."""
    return float(doc.get("length", clock.TRACK_LENGTH)) + float(doc.get("tail", 0.0))


def end_frame(doc):
    """The frame after the timeline's last one."""
    return clock.total_frames(length=length(doc))


_EPS = 1e-6


def normalize(doc):
    """Turn frame-addressed times into track seconds, in place.

    Animation is timed in frames, like an animator's exposure sheet, so clips may give startF/endF and keys may
    give f (our 24 fps frame numbers) instead of track seconds. Frame F's time is taken a hair early so the frame
    itself is included by start and by a key, and excluded by end."""
    for c in doc.get("clips", []):
        if "startF" in c:
            c["start"] = clock.frame_to_time(c.pop("startF")) - _EPS
        if "endF" in c:
            c["end"] = clock.frame_to_time(c.pop("endF")) - _EPS
        for k in c.get("keys", []):
            if "f" in k:
                k["t"] = clock.frame_to_time(k.pop("f")) - _EPS
    for s in doc.get("shots", []):
        if "inF" in s:
            s["in"] = clock.frame_to_time(s.pop("inF")) - _EPS
    return doc


def shot_at(doc, t):
    """Our own shot on screen at time t (the timeline's cut list, not the source's)."""
    cur = None
    for s in doc.get("shots", []):
        if s["in"] <= t:
            cur = s
        else:
            break
    return cur


def validate(doc, shot_ids=None):
    """Return a list of problems (empty when the timeline is sound)."""
    problems = []
    seen = set()
    for c in doc.get("clips", []):
        cid = c.get("id", "?")
        if cid in seen:
            problems.append(f"{cid}: duplicate clip id")
        seen.add(cid)
        if not (isinstance(c.get("start"), numbers.Number) and isinstance(c.get("end"), numbers.Number)):
            problems.append(f"{cid}: start and end must be numbers")
        elif c["end"] <= c["start"]:
            problems.append(f"{cid}: ends before it starts")
        lt = c.get("layer", {}).get("type")
        if lt not in LAYER_TYPES:
            problems.append(f"{cid}: unknown layer type {lt!r}")
        if lt == "logo" and c["layer"].get("part") not in LOGO_PARTS:
            problems.append(f"{cid}: unknown logo part {c['layer'].get('part')!r}")
        if lt in ("image", "video"):
            for p in [c["layer"]] + c.get("keys", []):
                if "blend" in p and p["blend"] not in layers.BLENDS:
                    problems.append(f"{cid}: unknown blend {p['blend']!r}")
                if p.get("matte") and p["matte"].get("mode", "flat") not in matte.MODES:
                    problems.append(f"{cid}: unknown matte mode {p['matte'].get('mode')!r}")
                if p.get("matte") and p.get("keyed"):
                    problems.append(f"{cid}: keyed art brings its own alpha, so it takes no matte")
        if lt == "text" and c["layer"].get("kind") not in TEXT_KINDS:
            problems.append(f"{cid}: a text layer's kind must be credit, diegetic or title")
        if lt == "slate" and not c["layer"].get("text"):
            problems.append(f"{cid}: a slate must say what belongs there")
        if lt == "video" and c["layer"].get("mode", "once") not in layers.VIDEO_MODES:
            problems.append(f"{cid}: unknown video mode {c['layer'].get('mode')!r}")
        keys = c.get("keys", [])
        ts = [k.get("t") for k in keys]
        if any(not isinstance(t, numbers.Number) for t in ts):
            problems.append(f"{cid}: every key needs a numeric t")
        elif ts != sorted(ts):
            problems.append(f"{cid}: keys are not in time order")
        if c.get("interp", "hold") not in ("hold", "linear"):
            problems.append(f"{cid}: interp must be hold or linear")
        if not isinstance(c.get("on", 1), int) or c.get("on", 1) < 1:
            problems.append(f"{cid}: on (the exposure) must be a whole number of frames")
        if c.get("ease") not in EASES:
            problems.append(f"{cid}: ease must be in, out or inout")
        if shot_ids is not None and c.get("shot") not in shot_ids:
            problems.append(f"{cid}: shot {c.get('shot')!r} is not in the continuity")
    shots = doc.get("shots", [])
    ins = [s.get("in") for s in shots]
    if shots and ins != sorted(ins):
        problems.append("the cut list's shots are not in time order")
    own_ids = {s.get("id") for s in shots}
    for s in doc.get("built", []):
        if shots and s not in own_ids:
            problems.append(f"built lists {s!r}, which is not in the cut list")
        if shot_ids is not None and s not in shot_ids:
            problems.append(f"built lists {s!r}, which is not in the continuity")
    return problems


def _lerp(a, b, f):
    if isinstance(a, numbers.Number) and isinstance(b, numbers.Number):
        return a + (b - a) * f
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        return [_lerp(x, y, f) for x, y in zip(a, b)]
    return a


EASES = {
    None: lambda f: f,
    "in": lambda f: 1.0 - math.cos(f * math.pi / 2),          # starts still, leaves at speed
    "out": lambda f: math.sin(f * math.pi / 2),               # arrives at speed, settles still
    "inout": lambda f: (1.0 - math.cos(math.pi * f)) / 2,     # still at both ends
}


def eval_keys(keys, t, interp="hold", ease=None):
    """The keyed parameters at time t, or None before the first key.

    Each key carries only what changes; values carry forward from earlier keys. With "linear", each parameter
    moves from the last key that set it to the next key that sets it, so a camera move keyed only at its two ends
    glides through keys that change other things (an opacity fade, say). `ease` curves every such move ("in",
    "out" or "inout"); a move keyed only at its ends is then one smooth curve with no change of speed along it."""
    if not keys or t < keys[0]["t"]:
        return None
    state, set_at = {}, {}
    i = 0
    while i < len(keys) and keys[i]["t"] <= t:
        for k, v in keys[i].items():
            if k != "t":
                state[k], set_at[k] = v, keys[i]["t"]
        i += 1
    if interp == "linear":
        curve = EASES[ease]
        for k in list(state):
            nxt = next((key for key in keys[i:] if k in key), None)
            if nxt is not None:
                f = (t - set_at[k]) / (nxt["t"] - set_at[k])
                state[k] = _lerp(state[k], nxt[k], curve(f))
    return state


def active(clip, t):
    return clip["start"] <= t < clip["end"]


def _frame(t):
    """Our frame showing time t (times here are frame times, or a hair before one)."""
    return int(math.floor((t + clock.LEAD_IN) * clock.FPS + 0.5))


def exposed_time(clip, t):
    """The time a clip's drawing was made for, given its exposure `on` (2 = on twos, 3 = on threes).

    Cel animation holds each drawing for two or three frames (effects on twos, TV characters on threes; the
    source's slow drifts step on threes, measured). A clip with `on` > 1 is evaluated at the first frame of its
    current exposure, counted from the clip's own first frame."""
    on = int(clip.get("on", 1))
    if on <= 1:
        return t
    n0, n = _frame(clip["start"]), _frame(t)
    return clock.frame_to_time(n0 + ((n - n0) // on) * on)


def params_at(clip, t):
    """Layer parameters at time t: the layer's fixed params, overridden by its keys. None when not on screen.

    With an exposure (`on`), every keyed move and the layer's own clock (dust, video) step with the drawings, but
    opacity and visibility follow the frame itself: a fade or a cut is the camera's, not a drawing's."""
    if not active(clip, t):
        return None
    p = dict(clip["layer"])
    tq = exposed_time(clip, t)
    if clip.get("keys"):
        interp, ease = clip.get("interp", "hold"), clip.get("ease")
        k = eval_keys(clip["keys"], t, interp, ease)
        if k is None:
            return None
        if tq != t:
            held = eval_keys(clip["keys"], tq, interp, ease) or {}
            for name, v in held.items():
                if name not in ("opacity", "visible"):
                    k[name] = v
        p.update(k)
    if p.get("visible", True) is False:
        return None
    p["_t"], p["_t0"] = tq, clip["start"]
    return p


def draw(img, p, ref=None):
    """Draw one layer (already evaluated at the current time) into img."""
    t = p["type"]
    if t == "solid":
        img[:] = rgb01(p["color"])
    elif t == "glow_dot":
        fx.glow_dot(img, p["cx"], p["cy"], p["r_core"], p["sigma"], p["color"], p.get("strength", 1.0))
    elif t == "glint":
        fx.glint(img, p["cx"], p["cy"], p["arm"], p["color"], p.get("width", 1.2), p.get("strength", 1.0))
    elif t == "cel_band":
        fx.cel_band(img, p["cx"], p["cy"], p["r_in"], p["r_out"], p["color"], p.get("wobble", 0.0),
                    p.get("wobble_seed", 0), p.get("coverage", 1.0), p.get("dash_seed", 1),
                    p.get("dash_segments", 48), dash_smooth=p.get("dash_smooth", 1))
    elif t == "droplets":
        fx.droplets(img, p["cx"], p["cy"], p["r_lo"], p["r_hi"], p["n"], p["size_lo"], p["size_hi"],
                    p["color"], p.get("seed", 0))
    elif t == "airbrush_ring":
        fx.airbrush_ring(img, p["cx"], p["cy"], p["r"], p["band"], p.get("glow", 22.0), p.get("spray", 36.0),
                         p.get("inner_glow", 30.0), p.get("core", (255, 255, 255)),
                         p.get("halo", (205, 232, 255)), p.get("seed", 0), p.get("strength", 1.0))
    elif t == "wash":
        fx.wash(img, p["color"], p["amount"], p.get("mode", "mix"))
    elif t == "bloom":
        fx.bloom(img, p["sigma"], p["strength"], p.get("threshold", 0.0))
    elif t == "image":
        layers.draw_image(img, p)
    elif t == "video":
        layers.draw_video(img, p, p["_t"])
    elif t == "text":
        layers.draw_text(img, p)
    elif t == "dust":
        layers.draw_dust(img, p, p["_t"])
    elif t == "logo":
        layers.draw_logo(img, p)
    elif t == "logo_light":
        layers.draw_logo_light(img, p)
    elif t == "beam":
        fx.light_beam(img, p["x0"], p["y0"], p["x1"], p["y1"], p.get("width", 8), p.get("glow", 40),
                      p.get("color", (80, 170, 255)), p.get("strength", 1.0), p.get("core", (235, 250, 255)))
    elif t == "polygon":
        fx.polygon_light(img, p["points"], p["color"], p.get("opacity", 1.0), p.get("blur", 0.0),
                         p.get("blend", "screen"))
    elif t == "tape_blank":
        fx.tape_blank(img, p["_t"], p.get("strength", 1.0), p.get("snow", 0.0), p.get("seed", 0))
    elif t == "osd":
        layers.draw_osd(img, p)
    elif t == "slate":
        layers.draw_slate(img, p)
    elif t == "light_column":
        fx.light_column(img, p["_t"], p.get("cx", 720.0), p.get("width", 360.0), p.get("edge", (128, 22, 10)),
                        p.get("core", (236, 96, 26)), p.get("streak", (255, 214, 120)), p.get("spark", (255, 244, 200)),
                        p.get("n", 150), p.get("sparks", 110), p.get("speed", 240.0), p.get("boil", 2),
                        p.get("strength", 1.0), p.get("seed", 0), p.get("bloom", 0.3), p.get("vignette", 0.3))
    elif t == "field":
        fx.field(img, p["color"], p.get("gradient", 0.14), p.get("vignette", 0.22), p.get("mottle", 0.03),
                 p.get("seed", 0))
    elif t == "orb":
        fx.orb(img, p["cx"], p["cy"], p["r"], p["color"], tuple(p.get("light", (-0.5, -0.6))),
               p.get("rim", (255, 236, 255)), p.get("glow", 0.6), p.get("mottle", 0.16), p.get("strength", 1.0),
               p.get("seed", 0))
    elif t == "ray_fan":
        fx.ray_fan(img, p["_t"], p["cx"], p["cy"], p["sectors"], p.get("n", 40), tuple(p.get("length", (300, 700))),
                   tuple(p.get("width", (6, 26))), p.get("color", (255, 206, 110)), p.get("unfurl", 1.0),
                   p.get("boil", 2), p.get("blur", 2.0), p.get("strength", 1.0), p.get("seed", 0))
    elif t == "arcs":
        fx.arcs(img, p["_t"], p["cx"], p["cy"], p["r_in"], p["r_out"], p.get("n", 7), p.get("color", (214, 170, 255)),
                p.get("jag", 0.35), p.get("boil", 2), p.get("strength", 1.0), p.get("seed", 0))
    elif t == "radar":
        fx.radar(img, p["_t"], p.get("cx", 720.0), p.get("cy", 540.0), p.get("r", 440.0), p.get("rings", 4),
                 p.get("sweep_speed", 150.0), [tuple(c) for c in p.get("contacts", [(0.62, -40.0), (0.45, 128.0),
                                                                                    (0.8, 206.0)])],
                 p.get("color", (70, 255, 140)), p.get("blip", (255, 190, 70)), p.get("boil", 2), p.get("strength", 1.0))
    elif t == "streaks":
        fx.streaks(img, p["_t"], p.get("angle", 0.0), p.get("n", 40), p.get("speed", 2400.0),
                   tuple(p.get("length", (160.0, 520.0))), tuple(p.get("width", (3.0, 12.0))),
                   p.get("color", (255, 200, 110)), tuple(p.get("band", (0.0, 1080.0))), p.get("boil", 2),
                   p.get("strength", 1.0), p.get("seed", 0))
    elif t == "data_bars":
        fx.data_bars(img, p["_t"], p["x"], p["y"], p["w"], p["h"], p.get("cols", 10), p.get("segs", 18),
                     [tuple(c) for c in p.get("colors", [(255, 76, 60), (76, 255, 140), (255, 206, 70),
                                                         (90, 196, 255)])],
                     p.get("boil", 2), p.get("strength", 1.0), p.get("seed", 0))
    elif t == "cast_card":
        hud.cast_card(img, p)
    elif t == "tab_panel":
        hud.tab_panel(img, p)
    elif t == "status_wall":
        hud.status_wall(img, p)
    elif t == "door_open":
        finale.door_open(img, p)
    elif t == "scope_hud":
        finale.scope_hud(img, p)
    elif t == "stained_wall":
        finale.stained_wall(img, p)
    elif t == "motes":
        finale.motes(img, p)
    elif t == "lens_flare":
        finale.lens_flare(img, p)
    elif t == "heat_haze":
        fx.heat_haze(img, p["_t"], p.get("amp", 1.6), p.get("scale", 40.0), p.get("speed", 45.0), p.get("y_hot", 860.0),
                     p.get("y_cool", 260.0), p.get("seed", 0))
    elif t == "vhs_damage":
        fx.vhs_damage(img, _frame(p["_t"]), p.get("band_y", 540.0), p.get("band_h", 70.0), p.get("tear", 36.0),
                      p.get("fizz", 0.35), p.get("dropouts", 8), p.get("strength", 1.0), p.get("seed", 0))
    elif t == "ref_still":
        if ref is None:
            raise ValueError("a ref_still layer needs the source reference")
        img[:] = ref.frame_by_vf(p["vf"])
    else:
        raise ValueError(f"unknown layer type {t!r}")
    return img


def compose(doc, t, ref=None, finish_n=None):
    """Our frame at time t: every active clip, lowest z first, over black.

    Given `finish_n` (the frame's number), the finishing pass runs over everything drawn, and then the layers marked
    `above_finish` go on top of it: the VCR's own captions, which the deck lays over the tape as it plays, so no tape
    noise touches them."""
    img = canvas()
    live = [c for c in doc.get("clips", []) if active(c, t)]
    later = []
    for c in sorted(live, key=lambda c: c.get("z", 0)):
        p = params_at(c, t)
        if p is None:
            continue
        if finish_n is not None and p.get("above_finish"):
            later.append(p)
        else:
            draw(img, p, ref)
    if finish_n is not None:
        finish(doc, img, finish_n)
        for p in later:
            draw(img, p, ref)
    return img


def preroll_frames(doc):
    """How many frames of blank tape play before our frame 0 (the timeline's `preroll`), or 0 without one."""
    return int(round(float(doc.get("preroll", {}).get("seconds", 0.0)) * clock.FPS))


def finish(doc, img, n):
    """The finishing pass over every one of our frames: the timeline's `finish` settings (a broadcast tape's
    `vhs`, see fx.vhs), or, without them, a light film grain."""
    vhs = doc.get("finish", {}).get("vhs")
    if vhs:
        fx.vhs(img, n, **vhs)
    else:
        fx.film_grain(img, seed=n, amount=0.01)
    return img
