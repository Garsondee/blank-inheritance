# General Hospital

**Category:** location
**Status:** established — geometry, lore and cross-references are all written and promoted; the
administrative link to Shucks Mordant is a flagged proposal, not a confirmed decision.
**Sources:** `data/locations/general-hospital.json`, `data/scene-briefs/episode-c1s1--intake-medicals.json`,
`ideas/story/bible/characters/shucks-mordant.md`, direct conversation (Ingram's drawn note), 2026-09-12.

## Read this first

The fortress island's main civilian and garrison hospital, in Island Centre — a large, blocky
former commercial building repurposed wholesale, not built for the job. This is **not** the same
place as Intake Medicals (`data/scene-briefs/episode-c1s1--intake-medicals.json`), which is a
smaller clinic on the combined campus that only processes new arrivals. The two are easy to
conflate because both nominally fall under Shucks Mordant's title; keep them separate at the
table.

## What's established

- **Name as it stands in the tool is "General Hospital"** (Ingram typed it there; an
  earlier draft of this page called it "The General Hospital"). **Premise, Ingram's own** (drawn note, 2026-09-12): "This is the main hospital
  building for the fortress island." The `[real-world: 東京インテリア]` research tag is a real-world
  furniture retailer whose actual footprint the drawing was adopted from — research only, and it
  must never appear in player-facing text. The location's `history`/`playerFacing` lore lean on
  its *retail* architectural bones (display windows, a loading bay) without ever naming the store.
- **16,799 m², a single counted storey, in Island Centre** (`item-176` in the draft; not yet
  promoted as its own region, so `general-hospital.json`'s `derived.withinRegionRef` is currently
  `null` — expected, not a bug, and will backfill automatically once Island Centre itself is
  promoted, the same way `core/location.py`'s region-promotion path already backfills any site
  drawn before its district).
- **Separate from Intake Medicals.** Intake Medicals' own `intro.where` is explicit: "The
  Directorate's medical hall on the combined campus." This is a different, larger building
  elsewhere on the island, serving the whole population rather than just candidate intake.
- **npcRefs:** `shucks-mordant` and `hospital-chief-of-staff` (new placeholder, the person actually
  running the building day to day).

## Ingram's own take, and how it diverges from any real-world source

Adopted from a real Kobe building footprint (research-only, see the hard wall above) but nothing
about the fiction is based on what that building actually is or was.

## Tone and register — what NOT to do

**Don't turn "answers to Shucks Mordant" into him actually appearing here.** His own bible file is
explicit that he staffs Intake Medicals in person and has never set foot in this building — that
should read as an ordinary fact about a busy man's job, not foreshadowing.

**The Shucks-oversees-this administrative link is a proposal, not canon yet.** It was written
while grounding this location, flagged in his own bible file's Open Questions, surfaced directly to
Ingram for confirmation, and is a one-line change (`general-hospital.json`'s `npcRefs`) to undo if Ingram
would rather this hospital answer to nobody in particular, or someone else.

## Open questions

- Whether Shucks Mordant's administrative oversight of this hospital is confirmed, changed to
  someone else, or dropped entirely — proposed 2026-09-12, see his own bible file.
- Whether the Chief of Staff is ever worth naming and casting as a recurring character.

## Appearances so far

1. `data/locations/general-hospital.json` — promoted 2026-09-12, full standing-depth lore, this
   bible page's primary source.

## Related

- [Bible README](../README.md)
- [data/locations/general-hospital.json](../../../../data/locations/general-hospital.json)
- [data/scene-briefs/episode-c1s1--intake-medicals.json](../../../../data/scene-briefs/episode-c1s1--intake-medicals.json) — the separate campus clinic.
- [ideas/story/bible/characters/shucks-mordant.md](../characters/shucks-mordant.md)
