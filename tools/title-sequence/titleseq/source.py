"""The source opening, used for drafts (unbuilt shots show the source, marked REF) and side-by-side comparisons.

The source and its analysis are third-party material and live only in the gitignored artwork/ tree
(see CREDITS.md). Nothing here is needed to render finished shots.
"""
import json
import os

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
REF_DIR = os.path.join(ROOT, "artwork", "title-sequences", "reference", "source-op")
VIDEO = os.path.join(ROOT, "artwork", "in-tray", "video", "Neon-Genesis-Evangelion-A-Cruel-Angel-s.mp4")
CONTINUITY = os.path.join(REF_DIR, "analysis", "reference-continuity.json")
CROP_X0, CROP_W = 240, 1440      # the source's 4:3 picture inside its 1920-wide frame
LAST_VF = 5481


def load_continuity(path=CONTINUITY):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def shot_at(shots, t):
    """The continuity shot on screen at track time t."""
    cur = shots[0]
    for s in shots:
        if s["music_in"] <= t + 1e-9:
            cur = s
        else:
            break
    return cur


class Reference:
    """Frames of the source, addressed by track time through the measured, drift-corrected time map."""

    def __init__(self, video=VIDEO, continuity=CONTINUITY):
        import cv2
        doc = load_continuity(continuity)
        self.a = doc["time_map"]["video_time_of_ost_zero"]
        self.b = doc["time_map"]["video_seconds_per_ost_second"]
        self.shots = doc["shots"]
        self._cv2 = cv2
        self._cap = cv2.VideoCapture(video)
        self._pos = -1
        self._cur = None

    @staticmethod
    def available(video=VIDEO, continuity=CONTINUITY):
        return os.path.exists(video) and os.path.exists(continuity)

    def vf_at(self, t):
        return int(round((self.a + self.b * t) * 60))

    def frame_by_vf(self, vf):
        """The source's 4:3 picture at 60 fps frame vf, as float32 RGB 0..1 (black outside the file)."""
        if vf < 0 or vf > LAST_VF:
            return np.zeros((1080, CROP_W, 3), np.float32)
        cv2 = self._cv2
        if vf < self._pos or vf > self._pos + 240:
            self._cap.set(cv2.CAP_PROP_POS_FRAMES, vf)
            self._pos = vf - 1
        while self._pos < vf:
            ok, fr = self._cap.read()
            if not ok:
                return np.zeros((1080, CROP_W, 3), np.float32)
            self._pos += 1
            self._cur = fr
        pic = self._cur[:, CROP_X0:CROP_X0 + CROP_W, ::-1]
        return pic.astype(np.float32) / 255.0

    def frame_at(self, t):
        return self.frame_by_vf(self.vf_at(t))

    def shot_at(self, t):
        return shot_at(self.shots, t)
