# The Rock

**Category:** location
**Status:** partial — deliberately, same as Central Fortification. Ingram asked for the basic
concept only; the central mystery (what the nine cells hold) is written as open on purpose, not
as a gap to fill in later.
**Sources:** `data/locations/the-rock.json`, Ingram's drawn note (2026-09-12),
`design/strategy-layer.md`'s Site Classification section, `ideas/story/bible/locations/central-fortification.md`.

## Read this first

A military prison and laboratory cut into the same rock as Central Fortification, reachable only
by a tunnel from it. This is the first location in the campaign classified `omega-zero` — a tier
above the Directorate's ordinary five-level document classification, reserved for places whose
existence is unknown even to most Directorate staff, not merely restricted. Nine circular silo
doors on its south-east side open vertically onto cells sized for something Frame-scale. What is
actually held in them is an open question, deliberately.

## What's established

- **Ingram's note, verbatim in substance** (2026-09-12): a military prison and laboratory; a
  heavily armoured and defended bunker complex, accessible underground from Central; cut from the
  same rock as an island that stood here "over a hundred years ago," before the artificial island
  was built around it; a carpark to the north-west serving Central HQ; nine round circular metal
  silo doors to the south-east, opening vertically, sized to admit very large things into cells
  below; highly classified, with students and most staff unaware of its purpose or its secrets.
- **General note attached to the same handoff, 2026-09-12:** *"We need to start building in
  levels of secrecy to treat sites with. Public, private, restrict etc etc all the way up to
  Omega-Zero level classification. Have fun with it, give it an EVA vibe."* This location is the
  first real use of the classification system that note asked for — see
  `design/strategy-layer.md`'s Site Classification section for the full design (five tiers reused
  from the existing document-redaction ladder, plus Omega-Zero sitting above it as a rare,
  different kind of secret).
- **Physically connected to Central Fortification** by tunnel, not by any surface door of its
  own — the two were very likely cut from the same rock formation at a related time, though
  whether The Rock came first, alongside, or after Central is not decided.
- **npcRefs:** two new placeholders, `the-rock-warden` (prison side) and
  `the-rock-research-director` (laboratory side) — deliberately NOT the Directorate's three known
  poles (Commander/Caretaker/Transparency Advocate), since a publicly-known face running an
  Omega-Zero site would undercut the premise that almost nobody knows it exists.

## Ingram's own take, and how it diverges from any real-world source

Explicitly commissioned with "give it an EVA vibe" — Neon Genesis Evangelion's own layered
secrecy (most of Tokyo-3 doesn't know what NERV really does; within NERV, only a handful know
about SEELE, Instrumentality, the deeper truths) is the model for the two-tier system this
location introduced: ordinary Directorate classification (known-but-restricted) versus
Omega-Zero (existence itself hidden). The EVA vibe is scoped to the classification aesthetic and
the shape of the secret, not to the campaign's overall tone — `feedback_tone_giant_robo_not_eva`
is a standing rule (Giant Robo, not Evangelion: warm, funny, uplifting; dark is allowed,
depressing is a fault) and nothing here overrides it. The mundane carpark sitting right next to
nine cells sized for something enormous is meant to read as exactly that kind of tonal
juxtaposition, not as horror.

## Tone and register — what NOT to do

**Do not decide what's in the nine cells.** This is the most tempting invention available here,
and it is explicitly left open in the location's own `gmOnly` text. It plausibly connects to the
Claimant material (`data/antagonists/claimants/claimant-guidelines.json`) or to something
unrelated; either is Ingram's call.

**Do not make this place easy to find.** Omega-Zero means a party should not stumble onto it by
a routine roll. See the location's own `gmOnly` for how a search aimed at it should fail.

**Do not let "EVA vibe" bleed into the party's everyday experience of the Directorate.** This is
one compartment of one building, not a reason to darken the Directorate's overall register.

## Open questions

- What is actually held in the nine cells, if anything currently is. Not decided; do not invent
  an answer here.
- Whether The Rock predates, postdates, or was built alongside Central Fortification.
- How a party would ever actually earn Omega-Zero standing, mechanically — not designed yet; see
  `design/strategy-layer.md`'s note that the Clearance-vs-Classification check is a GM judgement
  call "for now, not a formula, since only one site uses this so far."
- Whether the Warden and Research Director answer to the same chain of command or deliberately
  separate ones.

## Appearances so far

1. `data/locations/the-rock.json` — promoted 2026-09-12, standing depth, first pass.

## Related

- [Bible README](../README.md)
- [data/locations/the-rock.json](../../../../data/locations/the-rock.json)
- [design/strategy-layer.md](../../../../design/strategy-layer.md) — Site Classification.
- [ideas/entries/redacted-document-chain.json](../../../../ideas/entries/redacted-document-chain.json) — the document ladder this generalises from.
- [ideas/story/bible/locations/central-fortification.md](central-fortification.md) — the building
  this one tunnels from, and the same "built into real rock" fact extended.
- `data/antagonists/claimants/claimant-guidelines.json` — a plausible but unconfirmed connection
  for what the nine cells hold.
