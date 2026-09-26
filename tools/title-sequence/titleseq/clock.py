"""Time on the opening's clock.

Every time in the timeline is in *track seconds*: seconds on the OST2 music file, so 0.0 is its first sample.
The video starts LEAD_IN seconds before the track, so our frame n shows track time n / FPS - LEAD_IN.
The bar grid was measured from the track (design/opening-titles.md section 4): 128.45 BPM, bar 1 at 12.333 s.
"""
import math

FPS = 24
LEAD_IN = 0.5            # seconds of picture before the first note
TRACK_LENGTH = 89.626    # the OST2 TV-length mix, seconds
BAR1 = 12.333            # bar 1's downbeat, track seconds
BEAT = 0.467100          # one beat at 128.45 BPM


def frame_to_time(n, fps=FPS, lead=LEAD_IN):
    """Track time at the start of our frame n."""
    return n / fps - lead


def time_to_frame(t, fps=FPS, lead=LEAD_IN):
    """The frame on screen at track time t (the frame whose start is at or before t).

    A time typed to a few decimals (-0.1667 for frame 8's -0.16666...) lands a hair early, so anything within
    2% of a frame of the next frame's start counts as that frame."""
    return int(math.floor((t + lead) * fps + 0.02))


def total_frames(fps=FPS, lead=LEAD_IN, length=TRACK_LENGTH):
    return int(round((length + lead) * fps))


def bar_beat(t):
    """(bar, beat) with bar 1 at BAR1 and beat counted 1.0 to 4.999; None before bar 1."""
    if t < BAR1 - 1e-9:
        return None
    beats = (t - BAR1) / BEAT
    bar = int(beats // 4) + 1
    return bar, beats - (bar - 1) * 4 + 1


def bar_to_time(bar, beat=1.0):
    """Inverse of bar_beat: the track time of a bar and beat (beat 1.0 = the downbeat)."""
    return BAR1 + ((bar - 1) * 4 + (beat - 1)) * BEAT
