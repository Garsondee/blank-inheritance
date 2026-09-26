# Sign-Off reports

Two files per scene, and one command:

```bash
node tools/scene-signoff/report.mjs <scene>     # renders the HTML from the JSON
```

| File | What it is |
|---|---|
| `<scene>.json` | **The source.** Everything written by hand: the four passes' analysis, the questions for Ingram, the findings, the diffs of what was applied. Tracked in git. |
| `<scene>.html` | **The build.** Fully generated from that JSON plus whatever the mechanical checks currently say. Gitignored — regenerate it, never edit it. |

See [design/scene-signoff.md](../design/scene-signoff.md) for the process and
[data/campaign/signoff-checklist.json](../data/campaign/signoff-checklist.json) for the checks.

## Why HTML rather than markdown

Ingram asked for a document per review on 2026-09-22, then for it to be a page rather than prose:

> *"Reading huge amounts of basic text is what I spend a lot of my time doing and it's exhausting.
> Clearly accessible and strong visual language in a html template artefact would make it easier to
> see what's good, bad, what needs work, what you need from me and so on and so forth."*

Then, immediately after: **"Prioritise reading comprehension above in universe style."** That second
line is the one that decides the design. The palette comes from
`module/blank-inheritance/styles/bi-tokens.css` — the standing one-CSS-identity rule — but it is
there for low glare, not for costume. Two faces, a warm ground, generous leading, a 68-character
measure, and no distressed typewriter face anywhere near running text.

What the page does that a markdown file could not:

- **State is carried by shape and word, not only colour** — verdict chips, a severity stripe down the
  left of each finding, a state tag on every check row. Colour-blind safe, and scannable at a glance.
- **The questions for Ingram sit above the analysis**, in the loudest block on the page, with a count
  and a "blocks the seal" flag. They are the only part that blocks her.
- **Findings are cards with before/after diffs**, so an applied rewrite reads as a change rather than
  as a paragraph describing a change.
- **Failing checks open by default; passing ones collapse.** A clean pass is one line, not a table.
- **The consequence radar is three bars**, so an empty middle horizon is visible instead of inferred.

## Why the content is data

An earlier version kept the prose and the generated tables in one markdown file behind
`<!-- signoff:auto:* -->` comment markers. It worked, but a refresh could only ever rewrite part of
the page, and a report whose markers got edited away could not be refreshed at all.

With the prose in JSON there is nothing to preserve and nothing to clobber: re-render any time, from
anywhere, and the mechanical half can never be stale against the corpus.

## These are not the record of record

**The authoritative state of a scene's review lives on the scene** — `data/episodes/<id>.json` →
`scenes[].authoring.review`, written only by `tools/scene-signoff/seal.mjs`. That is what the console
counts and what `seal()` checks before it will clear a scene to `live`.

A report is the readable face of that record plus the reasoning behind it. The page marks a verdict
I believe is clear as **proposed** and shows only Ingram's own verdicts as recorded, because `CLEAR`
is assent and `FIX`/`STOP`/`BLOCKED` are findings. If the page and the episode file ever disagree, the
episode file is right — the [data-ownership](../design/data-ownership.md) rule applied to a document.

## Naming

`<scene brief id>.json` / `.html` — e.g. `episode-c1e1--the-road-in.json`. Same id as the brief, so
the report, the brief and the scene-set entry all sort together and a missing one is obvious.
