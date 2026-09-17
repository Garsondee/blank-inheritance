# audio-pipeline

Turns `audio/in-tray/` into one consistently-loud, web-ready library that
Foundry can play, and proves each file is usable before anyone relies on it.

Full design and reasoning: [`design/audio-system.md`](../../design/audio-system.md).

```bash
node tools/audio-pipeline/audio-pipeline.mjs analyse   # measure everything (cached)
node tools/audio-pipeline/audio-pipeline.mjs process   # encode whatever changed
node tools/audio-pipeline/audio-pipeline.mjs verify    # prove every processed file is usable
node tools/audio-pipeline/audio-pipeline.mjs upload    # push to the server, checksummed both sides
node tools/audio-pipeline/audio-pipeline.mjs status    # what the library currently holds
```

Options: `--only <text>` (limit to matching paths/ids), `--jobs N` (parallel
ffmpeg processes, default half your cores), `--dry-run` (upload only).

## Two promises

1. **Nothing in `audio/in-tray/` is ever modified, moved or deleted.** A
   processed file can always be rebuilt; an original cannot.
2. **Every claim is measured, not assumed.** Loudness, true peak, decoded
   length and the output's own loudness are all measured with ffmpeg, and
   `verify` re-checks the files on disk rather than trusting the record.

## ffmpeg

Needs a full ffmpeg build (**not** Playwright's bundled copy, which has no
audio codecs at all — the tool checks for `libopus` and says so if it finds a
stripped build). Installed 2026-09-17 under `~/tools/ffmpeg-*/bin`; the tool
looks there, then on `PATH`. Set `BI_FFMPEG_DIR` to point somewhere else.

Note: the Windows "essentials" build has **no libsoxr**, so the pipeline uses
ffmpeg's own swr resampler deliberately — a plan that depended on which build
ran it would produce different bytes on different machines.

## What comes out

| Path | Tracked? | What it is |
|---|---|---|
| `audio/library/<kind>/<id>.ogg` | no (gitignored) | the processed files, served as `blank-inheritance-audio/…` |
| `data/audio/library.json` | yes | every measurement and how each file was processed — regenerated in full each run |
| `data/audio/review.json` | yes | human decisions. **The pipeline never writes this.** |
| `audio/.pipeline-cache/` | no | analysis cache (safe to delete; the next run rebuilds it, slowly) |

## Structure (core/adapter split, same as the rest of the project)

- `core/` — pure: parsing ffmpeg output, classifying, planning an encode,
  building the library document, deciding what "verified" means. Fully unit
  tested (`test/audio-pipeline/`) against **real captured ffmpeg output**.
- `adapters/` — the only place a process is spawned or a file is touched.
- `audio-pipeline.mjs` — the CLI wiring them together.
- `upload.mjs` — reuses `tools/module-sync/`'s transport and pure diffing;
  sends only what the server does not already have, then re-hashes both sides.

## Gotchas found the hard way

- **Checkpoint writes race.** Several workers writing the same JSON at once
  collided on one temp filename and Windows failed the rename with `EPERM`,
  losing one asset's record mid-run and reporting it as an ffmpeg failure.
  Temp names now carry a counter (`adapters/files.mjs`).
- **A container can lie about its length.** One MP3 here declares 358 seconds
  and contains 89. The pipeline records what actually decoded and `verify`
  reports the discrepancy against the source rather than the output.
- **Opus reconstructs peaks.** Nine files came back hotter than their sources
  (up to +1.9 dB), so encoding aims a dB under the true-peak ceiling.
- **A surround downmix changes measured loudness**, because R128 weights the
  rear channels. The second pass exists for exactly this and corrects it.
