"""ffmpeg: find it, feed it raw frames, and mux the track (with the lead-in) under them."""
import glob
import hashlib
import json
import os
import re
import shutil
import subprocess

from . import clock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
TRACK = os.path.join(ROOT, "audio", "in-tray", "music", "intro", "OST2 -02 - Zankoku na Tenchi no Teize.mp3")
WORK = os.path.join(ROOT, "artwork", "title-sequences", "opening", "work")
MUSIC_LUFS = -18.0      # the campaign's music level (design/audio-system.md); the titles play at the table's music volume


def find_ffmpeg():
    """ffmpeg from BI_FFMPEG_DIR, then ~/tools/ffmpeg-*/bin (where the audio pipeline's lives), then PATH."""
    exe = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
    env = os.environ.get("BI_FFMPEG_DIR")
    if env and os.path.exists(os.path.join(env, exe)):
        return os.path.join(env, exe)
    for d in sorted(glob.glob(os.path.join(os.path.expanduser("~"), "tools", "ffmpeg-*", "bin")), reverse=True):
        if os.path.exists(os.path.join(d, exe)):
            return os.path.join(d, exe)
    return shutil.which("ffmpeg")


def track_with_lead_in(ffmpeg, work=WORK, track=TRACK, lead=clock.LEAD_IN, noise=()):
    """The track as WAV with the lead-in's silence in front, so time 0 of the file is the first frame rendered.

    `noise` lays sound into that lead-in: each item is {"color": "white" | "pink" | "brown", "amplitude", "from",
    "to"} (seconds of the file), such as an empty channel's static and then a tape's hiss under the pre-roll. Each
    cuts in and out cleanly (20 ms ramps, so nothing clicks); an item's `fade` fades it out over that many seconds
    instead."""
    os.makedirs(work, exist_ok=True)
    ms = int(round(lead * 1000))
    tag = ""
    if noise:
        tag = "_" + hashlib.sha1(json.dumps(list(noise), sort_keys=True).encode()).hexdigest()[:10]
    out = os.path.join(work, f"_track_lead{ms}ms{tag}.wav")
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(track):
        if not noise:
            subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", track,
                            "-af", f"adelay={ms}:all=1", "-c:a", "pcm_s16le", out], check=True)
        else:
            parts = [f"[0:a]adelay={ms}:all=1,{_FMT}[m]"] + _noise_parts(noise)
            subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", track,
                            "-filter_complex", ";".join(parts), "-map", "[a]", "-c:a", "pcm_s16le", out], check=True)
    return levelled(ffmpeg, out)


_FMT = "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo"


def _noise_parts(noise):
    """Filter chains laying each noise item into the mix after [m] (see track_with_lead_in), ending in [a]."""
    parts = []
    for i, nz in enumerate(noise):
        dur = float(nz["to"]) - float(nz["from"])
        fade = max(0.02, float(nz.get("fade", 0.02)))
        parts.append(f"anoisesrc=color={nz.get('color', 'pink')}:amplitude={float(nz['amplitude'])}:"
                     f"duration={dur}:sample_rate=44100:seed={i + 1},"
                     f"afade=t=in:d=0.02,afade=t=out:st={max(0.0, dur - fade)}:d={fade},"
                     f"adelay={int(round(float(nz['from']) * 1000))}:all=1,{_FMT}[n{i}]")
    labels = "[m]" + "".join(f"[n{i}]" for i in range(len(noise)))
    parts.append(f"{labels}amix=inputs={len(noise) + 1}:duration=longest:normalize=0[a]")
    return parts


def silent_track(ffmpeg, seconds, work=WORK, noise=()):
    """Silence `seconds` long with `noise` laid in (items as for track_with_lead_in), for a timeline with no music,
    such as an episode title card's tape hiss. It isn't levelled: the hiss is set by its own amplitude."""
    os.makedirs(work, exist_ok=True)
    tag = hashlib.sha1(json.dumps([round(seconds, 3), list(noise)], sort_keys=True).encode()).hexdigest()[:10]
    out = os.path.join(work, f"_silence_{tag}.wav")
    if not os.path.exists(out):
        parts = [f"anullsrc=r=44100:cl=stereo:d={seconds:.3f},{_FMT}[m]"] + _noise_parts(noise)
        subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-filter_complex", ";".join(parts),
                        "-map", "[a]", "-t", f"{seconds:.3f}", "-c:a", "pcm_s16le", out], check=True)
    return out


def loudness(ffmpeg, path):
    """A file's integrated loudness in LUFS, measured the way EBU R128 does (ffmpeg's loudnorm, measuring only)."""
    r = subprocess.run([ffmpeg, "-hide_banner", "-nostats", "-i", path, "-af", "loudnorm=print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True)
    m = re.search(r'"input_i"\s*:\s*"(-?[\d.]+)"', r.stderr)
    if not m:
        raise RuntimeError(f"could not measure the loudness of {path}")
    return float(m.group(1))


def levelled(ffmpeg, wav, target=MUSIC_LUFS):
    """The WAV brought to `target` integrated loudness by one measured gain, so the song's own dynamics are untouched,
    with a limiter a little under full scale in case the gain is upward. Cached beside the WAV. (The audio pipeline
    sets all the campaign's music to -18 LUFS, and players hear the titles at their own music volume, so the titles
    would otherwise jump out louder than everything else in the evening.)"""
    out = wav[:-4] + f"_lufs{int(round(-target))}.wav"
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(wav):
        gain = target - loudness(ffmpeg, wav)
        subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", wav,
                        "-af", f"volume={gain:.2f}dB,alimiter=limit=0.841:level=0", "-c:a", "pcm_s16le", out],
                       check=True)
    return out


class Encoder:
    """Pipe RGB frames into an H.264 MP4, optionally with the track from start_time to the end of the range."""

    def __init__(self, path, width, height, fps=clock.FPS, audio=None, audio_start=0.0, audio_duration=None,
                 ffmpeg=None, crf=18):
        ffmpeg = ffmpeg or find_ffmpeg()
        if not ffmpeg:
            raise RuntimeError("ffmpeg not found (set BI_FFMPEG_DIR)")
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        cmd = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
               "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{width}x{height}", "-r", str(fps), "-i", "-"]
        if audio:
            cmd += ["-ss", f"{max(audio_start, 0):.4f}"]
            if audio_duration:
                cmd += ["-t", f"{audio_duration:.4f}"]
            # no -shortest: it trims the video to the audio's rounded end and drops the last frame. The audio is
            # already cut to the range's exact length with -t, so the picture defines the file's length.
            cmd += ["-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k"]
            if audio_duration:                     # silence to the end of the picture, when the sound runs out first
                cmd += ["-af", f"apad=whole_dur={audio_duration:.4f}"]
        # faststart puts the index at the front, so a browser (Foundry's players) can start playing while it downloads
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", path]
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        self.path = path

    def write(self, frame_u8):
        self.proc.stdin.write(frame_u8.tobytes())

    def close(self):
        self.proc.stdin.close()
        code = self.proc.wait()
        if code != 0:
            raise RuntimeError(f"ffmpeg exited with {code}")
        return self.path
