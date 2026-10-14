# Deep Storage

**Category:** location
**Status:** established — geometry, lore and cross-references are all written and promoted;
what's actually stored on most of its floors is deliberately still open.
**Sources:** `data/locations/deep-storage.json`, `design/strategy-layer.md` (Clearance rungs),
`ideas/entries/redacted-document-chain.json`, `data/hangar/legacy-units.json`, direct conversation
(Ingram's drawn note), 2026-09-12.

## Read this first

A below-ground holding facility the Directorate uses for anything unusual that isn't currently
in use, dug in under the working crane yard of the Container Ground on the fortress island's
eastern apron. It is a site inside that district, and the location entity's `tags` field marks it
`"underground"` as a plain descriptive fact. Several floors, most gated by a real Clearance rung,
run by a custodian who decides what counts as "currently being used." Nothing about it is a fixed
mystery box: what's actually down there is written as open on purpose, so a specific find can be
placed later without contradicting anything already on record.

## What's established

- **Name and premise, Ingram's own** (drawn note, 2026-09-12): "Deep Storage — so called because
  it's a bunker warehouse where anything unusual gets stored which isn't currently being used.
  Many underground floors, most of which have elevated security requirements to reach." Nothing
  in the promoted entity invents past this; it fills in texture around exactly this premise.
- **Physically underneath The Container Ground**, a working surface district (`item-202` in the
  draft, not yet promoted), not beside it. It is a **site inside that district**, which is how
  Ingram re-tiered it on 2026-09-12 after it was first drawn with the region tool — that tier fix
  is what actually resolved the 32,719 m² coverage overlap it had been producing, more simply
  than the `underground` region tag written for it the day before. The tag is kept on the
  location because it is true and useful (this place really is below ground), but it is no longer
  load-bearing for coverage: sites don't take part in the region tessellation at all.
  `tools/gazetteer/coverage.py` still honours the tag for any genuinely underground *region* that
  turns up later.
- **Access is gated by real Clearance rungs** (`design/strategy-layer.md`), not GM fiat by default
  — Rung 2 gets a supervised look, Rung 3 gets an unquestioned requisition, anything past that
  needs the custodian personally on side.
- **A plausible physical home for the legacy-Frame graveyard.** `data/hangar/legacy-units.json`
  exists to hold decommissioned/damaged Frame units but its `units` list is still empty by
  design. Deep Storage's history section now states that compromised or politically awkward units
  get moved here quietly — a connection, not a specific unit — so that file can be populated later
  without needing to invent where such a unit would physically be.
- **npcRefs:** `commander` (the Directorate pole most plausibly holding ultimate authority over
  what it's allowed to contain) and `deep-storage-custodian` (new placeholder, the person actually
  running it day to day).

## Ingram's own take, and how it diverges from any real-world source

Not based on a real-world reference beyond the generic idea of a military bunker warehouse; no
divergence to track.

## Tone and register — what NOT to do

**Don't resolve what's actually stored on the gated floors as a fixed answer.** The location's
own `gmOnly` text is explicit that at least one manifest was never filed at all, and that this is
a GM-decided-at-the-table question, not a pre-written reveal. Treat any specific find (legacy
Frame hardware included) as something to place when it serves a scene, not something waiting to
be looked up here.

**Don't let "elevated security" become hand-waved.** It's meant to be a real, checkable
consequence of the party's actual Clearance rung (`design/strategy-layer.md`), not a vibe.

## Open questions

- What is actually on the gated floors — if anything specific ever needs deciding — and whether
  any of it ties to the Day 1 pilot's original Frame (per `data/hangar/legacy-units.json`'s own
  stated purpose). Not decided; do not invent an answer here.
- Whether the custodian is ever worth naming and casting as a recurring character, or stays a
  functional role indefinitely.

## Appearances so far

1. `data/locations/deep-storage.json` — promoted 2026-09-12, full standing-depth lore, this bible
   page's primary source.

## Related

- [Bible README](../README.md)
- [data/locations/deep-storage.json](../../../../data/locations/deep-storage.json)
- [design/strategy-layer.md](../../../../design/strategy-layer.md) — Clearance rungs.
- [ideas/entries/redacted-document-chain.json](../../../../ideas/entries/redacted-document-chain.json)
- [data/hangar/legacy-units.json](../../../../data/hangar/legacy-units.json)
- [tools/gazetteer/coverage.py](../../../../tools/gazetteer/coverage.py) — the `underground` tag
  exclusion, which this location no longer relies on (see What's established).
