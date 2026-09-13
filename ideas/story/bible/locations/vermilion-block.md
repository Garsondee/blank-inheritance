# The Vermilion Block

**Category:** location
**Status:** written, rank 2 — one pass. The reagent stock's actual purpose is deliberately left
open, same treatment as The Rock's nine cells.
**Sources:** `data/locations/vermilion-block.json`, Ingram's drawn note (2026-09-13),
`ideas/story/bible/LEDGER.md` Q2 (the illusionist "magic show" circuit) and Q4 (this world's
relationship to Golarion), `design/strategy-layer.md`'s Site Classification section.

## Read this first

The Directorate's own magic-using department: a black building trimmed in red on Island Centre
(D4·66/76/77), a red diamond hazard placard fixed to its roof, six fenced silos to the
north-west (three large, three small) holding reagent stock brought in from across Golarion in
bulk. Classified `secret` — every ordinary member of staff on the island knows it exists, almost
none of them know what actually happens inside it. What the silo stock is actually *for* is not
decided here, on purpose.

## What's established

- **Ingram's note, verbatim in substance** (2026-09-13): genuinely complex, looks distinctly
  different to anything else on the island; black with red trim, a red diamond on the roof; to
  the north-west, three large red metallic silos and three small ones, surrounded by a barbed
  wire fence and highly restricted; the working assumption is that this is where the island's
  extremely high-level magic-using staff gather, and that the silos hold powerful magical
  reagents brought here from across Golarion in huge quantities.
- **Classification: `secret`**, not `classified` or `omega-zero` — this deliberately reads
  differently from The Rock. The Block's existence is not a secret; staff can point at the
  building and name it. What's restricted is what happens inside it, and further still, what's
  in the silos. Using a heavier tier here would flatten Omega-Zero back down to "just another
  restricted place," which is the exact failure mode `design/strategy-layer.md` already warned
  against.
- **npcRefs:** two new placeholders, `vermilion-block-director` (runs the department, the one
  sign-off that actually means something) and `vermilion-block-custodian` (signs for the silo
  deliveries, deliberately not a spellcaster, knows quantities and nothing about purpose).
- **Rank 2** (`design/location-rank.md`) — a major, named, recurring Directorate facility, not a
  campaign-pivot. Routine texture (which staff work here, day-to-day activities, the building's
  own small history) was decided without asking; the reagents' purpose was not, for the reason
  below.

## Tone and register — what NOT to do

**Do not decide what the silo reagents are actually for.** This is the whole point of the
location and the most tempting invention available. `data/locations/vermilion-block.json`'s own
`gmOnly` says so explicitly and points at The Rock's silo cells as the same standing precedent —
two mysteries, two separate sites, both left open for the same reason: it's a real
campaign-shaping decision, not set dressing.

**Do not connect this to The Watcher.** The hard rule (`feedback_watcher_is_unknown`) applies
here as much as anywhere: the Watcher is unseen and unwitnessed at campaign start, full stop, in
every building's lore including this one. Nothing written here references it, hints at it, or
leaves a thread pointing at it.

**Do not connect this to the illusionist "magic show" circuit either**, at least not without
Ingram deciding to. LEDGER Q2 establishes that showy magic is culturally unusual here and that
private illusion shows are a separate, semi-tolerated underground phenomenon tied into how the
Watcher cult recruits. The Block is the opposite of that: sanctioned, institutional, and
deliberately unglamorous rather than showy. The two facts sit in the same setting (magic is
culturally quiet, one way officially and one way unofficially) without needing to be the same
plot thread.

**Keep the tone bureaucratic-strange, not cosmic-horror.** Consistent with
`feedback_tone_giant_robo_not_eva`: the mystery here is "what is a government department
quietly stockpiling, and why," which can carry real tension without the location itself reading
as dread-soaked. A flash of light nobody reacts to, a director who's visibly annoyed rather than
sinister, a custodian who genuinely doesn't know and isn't tortured by not knowing — all
deliberate choices to keep this a Giant Robo building, not an Eva one.

## Open questions

- What the reagent stock is actually for, and whether it connects to anything else in the
  campaign (a Claimant, an antagonist, a mechanic not yet built). Not decided; do not invent an
  answer here.
- Exactly when the Block was built and what housed the Directorate's magic-using staff before it.
- Whether the director (`vermilion-block-director`) genuinely knows more than they let on, or is
  as much in the dark about the deepest purpose as everyone else.

## Appearances so far

1. `data/locations/vermilion-block.json` — promoted 2026-09-13, standing depth, first pass.

## Related

- [Bible README](../README.md)
- [data/locations/vermilion-block.json](../../../../data/locations/vermilion-block.json)
- [ideas/story/bible/locations/the-rock.md](the-rock.md) — the same "leave the central mystery
  open" treatment, applied to a different kind of restricted site.
- [design/strategy-layer.md](../../../../design/strategy-layer.md) — Site Classification.
- [ideas/story/bible/LEDGER.md](../LEDGER.md) — Q2 (the magic-show circuit and why showy magic
  reads as culturally unusual here), Q4 (this world's own relationship to Golarion).
