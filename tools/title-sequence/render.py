#!/usr/bin/env python
"""Render the opening titles from data/title-sequences/opening.json.

    python tools/title-sequence/render.py draft   [--from S] [--to S] [--out FILE] [--clean] [--no-preroll] [--reduced]
    python tools/title-sequence/render.py compare  --from S --to S [--slow N] [--out FILE]
    python tools/title-sequence/render.py stills   --at=S[,S...] | --frames N[,N...] [--compare] [--reduced] [--out DIR]
    python tools/title-sequence/render.py flashcheck --file VIDEO

Times are track seconds (0 = the first note; the programme starts 0.5 s before it, at frame 0).
draft:   the whole opening, or a range, with the music. Shots listed as built are ours; the rest show the source,
         greyed and tagged REF, so every draft plays end to end in context. Labels go in the black side bars,
         never on the picture; --clean leaves them off. Without --from, it opens on the timeline's pre-roll (the
         set flicking through the channels to the tape, which plays with its tracking off, then locks: negative
         frame numbers); --no-preroll leaves it off, and a --from of -0.5 or later never includes it.
compare: the source (left) and ours (right) side by side, optionally slowed down N times, for matching effects.
stills:  single frames as PNG (ours, or side by side with --compare).
--reduced: the reduced-motion opening instead (data/title-sequences/opening-reduced.json): far fewer cuts, half the
         movement at half the speed, no flashing. Built from the full timeline at render time.
flashcheck: check a rendered video for photosensitivity risk (WCAG 2.3.1: no more than three general or red flashes
         in any second over a large enough area) and report the worst second.
"""
import argparse
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from titleseq import clock, fx, raster, timeline  # noqa: E402
from titleseq.encode import Encoder, find_ffmpeg, track_with_lead_in  # noqa: E402
from titleseq.source import Reference  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TIMELINE = os.path.join(ROOT, "data", "title-sequences", "opening.json")
REDUCED = os.path.join(ROOT, "data", "title-sequences", "opening-reduced.json")
RENDERS = os.path.join(ROOT, "artwork", "title-sequences", "opening", "renders")
FONT = os.path.join(ROOT, "third-party", "fonts", "texgyreheroscn-bold.otf")


def _font(size):
    from PIL import ImageFont
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


def our_picture(doc, t, n, ref):
    return raster.to_uint8(timeline.compose(doc, t, ref, finish_n=n))


def ref_picture(ref, t):
    """The source, greyed and dimmed so it reads as a placeholder next to finished shots."""
    if ref is None:
        return raster.to_uint8(raster.canvas((24, 24, 28)))
    pic = ref.frame_at(t)
    grey = pic.mean(axis=2, keepdims=True)
    return raster.to_uint8((pic * 0.45 + grey * 0.55) * 0.8)


def label_bars(frame, shot, t, built):
    """Shot, status and time in the side bars, outside the picture."""
    from PIL import Image, ImageDraw
    im = Image.fromarray(frame)
    d = ImageDraw.Draw(im)
    sid = shot["id"] if shot else "--"
    d.text((20, 20), sid, font=_font(60), fill=(255, 196, 60) if built else (120, 120, 120))
    d.text((22, 90), "OURS" if built else "REF (source)", font=_font(26), fill=(200, 200, 200) if built else (120, 120, 120))
    d.text((1700, 20), f"{t:6.2f} s", font=_font(32), fill=(200, 200, 200))
    bb = clock.bar_beat(t)
    where = f"bar {bb[0]} . {bb[1]:.1f}" if bb else ("pre-roll" if sid == "PRE" else "sung opening")
    d.text((1700, 62), where, font=_font(26), fill=(150, 150, 150))
    return np.asarray(im)


def preroll(doc, args):
    """Frames of blank tape before frame 0: the timeline's pre-roll, unless --no-preroll (or no timeline)."""
    if doc is None or getattr(args, "no_preroll", False):
        return 0
    return timeline.preroll_frames(doc)


def frame_range(args, doc=None):
    """The frames to render. With no --from, a draft starts at the top of the pre-roll; a --from before the
    programme's first frame (-0.5 s) starts partway into it."""
    first = -preroll(doc, args)
    n0 = clock.time_to_frame(args.t_from) if args.t_from is not None else first
    n1 = clock.time_to_frame(args.t_to) + 1 if args.t_to is not None else clock.total_frames()
    return max(first, n0), min(clock.total_frames(), n1)


def soundtrack(doc, args, ffmpeg):
    """The WAV to mux and where frame 0 of it sits: with a pre-roll, the lead-in grows to cover it and carries the
    pre-roll's sound (the channels' static, the tape's hiss)."""
    pre = preroll(doc, args)
    if pre == 0:
        return track_with_lead_in(ffmpeg), 0
    return track_with_lead_in(ffmpeg, lead=clock.LEAD_IN + pre / clock.FPS,
                              noise=doc["preroll"].get("sound", [])), pre


def load_doc(path):
    doc = timeline.load(path)
    problems = timeline.validate(doc)
    if problems:
        sys.exit("timeline problems:\n  " + "\n  ".join(problems))
    return doc


def open_ref():
    return Reference() if Reference.available() else None


def reduced_or_none(args, doc):
    if not getattr(args, "reduced", False):
        return None
    from titleseq import reduced
    return reduced.load(REDUCED, doc)


def cmd_draft(args):
    doc = load_doc(args.timeline)
    red = reduced_or_none(args, doc)
    ref = open_ref()
    built = set(doc.get("built", []))
    n0, n1 = frame_range(args, doc)
    ffmpeg = find_ffmpeg()
    out = args.out or os.path.join(RENDERS, time.strftime("draft-%Y%m%d-%H%M%S.mp4"))
    audio, offset = soundtrack(doc, args, ffmpeg)
    enc = Encoder(out, raster.OUT_W, raster.OUT_H, audio=audio,
                  audio_start=(n0 + offset) / clock.FPS, audio_duration=(n1 - n0) / clock.FPS, ffmpeg=ffmpeg)
    for n in range(n0, n1):
        t = clock.frame_to_time(n)
        shot = {"id": "PRE"} if n < 0 else timeline.shot_at(doc, t)      # the pre-roll is always ours
        is_built = n < 0 or bool(shot and shot["id"] in built)
        if red is not None:
            pic = raster.to_uint8(red.compose(n))
        else:
            pic = our_picture(doc, t, n, ref) if is_built else ref_picture(ref, t)
        frame = raster.pillarbox(pic)
        if not args.clean:
            frame = label_bars(frame, shot, t, is_built)
        enc.write(frame)
    print("wrote", enc.close(), f"({n1 - n0} frames)")


def side_by_side(src_u8, ours_u8, t, shot):
    from PIL import Image, ImageDraw
    canvas = Image.new("RGB", (raster.OUT_W, raster.OUT_H), (0, 0, 0))
    canvas.paste(Image.fromarray(src_u8).resize((960, 720), Image.LANCZOS), (0, 180))
    canvas.paste(Image.fromarray(ours_u8).resize((960, 720), Image.LANCZOS), (960, 180))
    d = ImageDraw.Draw(canvas)
    d.text((20, 120), "SOURCE", font=_font(40), fill=(150, 150, 150))
    d.text((980, 120), "OURS", font=_font(40), fill=(255, 196, 60))
    d.text((20, 920), f"{shot['id'] if shot else '--'}   {t:7.3f} s   frame {clock.time_to_frame(t)}",
           font=_font(36), fill=(200, 200, 200))
    return np.asarray(canvas)


def cmd_compare(args):
    doc = load_doc(args.timeline)
    ref = open_ref()
    if ref is None:
        sys.exit("compare needs the source reference (artwork/title-sequences/reference/source-op/)")
    n0, n1 = frame_range(args)
    out = args.out or os.path.join(RENDERS, time.strftime("compare-%Y%m%d-%H%M%S.mp4"))
    enc = Encoder(out, raster.OUT_W, raster.OUT_H)
    for n in range(n0, n1):
        t = clock.frame_to_time(n)
        frame = side_by_side(raster.to_uint8(ref.frame_at(t)), our_picture(doc, t, n, ref), t,
                             timeline.shot_at(doc, t))
        for _ in range(max(1, args.slow)):
            enc.write(frame)
    print("wrote", enc.close(), f"({n1 - n0} frames, slowed x{max(1, args.slow)})")


def cmd_stills(args):
    from PIL import Image
    doc = load_doc(args.timeline)
    red = reduced_or_none(args, doc)
    ref = open_ref()
    os.makedirs(args.out, exist_ok=True)
    if args.frames:
        frames = [int(x) for x in args.frames.split(",")]
    else:
        frames = [clock.time_to_frame(float(x)) for x in args.at.split(",")]
    for n in frames:
        t = clock.frame_to_time(n)
        ours = raster.to_uint8(red.compose(n)) if red is not None else our_picture(doc, t, n, ref)
        img = side_by_side(raster.to_uint8(ref.frame_at(t)), ours, t, timeline.shot_at(doc, t)) \
            if args.compare and ref else raster.pillarbox(ours)
        path = os.path.join(args.out, f"f{n:05d}_{t:+07.3f}s.png")
        Image.fromarray(img).save(path)
        print("wrote", path)


def cmd_flashcheck(args):
    from titleseq import flashcheck
    report = flashcheck.check(flashcheck.read_video(args.file, find_ffmpeg()))
    for name in ("general", "red"):
        n, at, where = report[name]
        when = f" (the second starting {at / clock.FPS:.2f} s into the file, window {where})" if where else ""
        print(f"{name} flashes: {n // 2} in the worst second{when}")
    print(f"{report['frames']} frames:", "PASSES (no more than three flashes in any second)" if report["passes"]
          else "FAILS: more than three flashes in a second")
    return report


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    fc = sub.add_parser("flashcheck")
    fc.add_argument("--file", required=True)
    for name in ("draft", "compare", "stills"):
        p = sub.add_parser(name)
        p.add_argument("--timeline", default=TIMELINE)
        p.add_argument("--from", dest="t_from", type=float)
        p.add_argument("--to", dest="t_to", type=float)
        p.add_argument("--out")
        if name in ("draft", "stills"):
            p.add_argument("--reduced", action="store_true",
                           help="the reduced-motion opening: fewer cuts, gentle movement, no flashing")
        if name == "draft":
            p.add_argument("--clean", action="store_true")
            p.add_argument("--no-preroll", dest="no_preroll", action="store_true",
                           help="start at frame 0, without the channel flick and blank tape before it")
        if name == "compare":
            p.add_argument("--slow", type=int, default=1)
        if name == "stills":
            p.add_argument("--at", help="comma-separated track times (use --at=-0.5,... for negatives)")
            p.add_argument("--frames", help="comma-separated frame numbers instead of times")
            p.add_argument("--compare", action="store_true")
    args = ap.parse_args(argv)
    if args.cmd == "stills" and not args.out:
        args.out = os.path.join(RENDERS, "stills")
    {"draft": cmd_draft, "compare": cmd_compare, "stills": cmd_stills, "flashcheck": cmd_flashcheck}[args.cmd](args)


if __name__ == "__main__":
    main()
