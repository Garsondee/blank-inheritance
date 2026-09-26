# Central Fortification

**Category:** location
**Status:** partial — deliberately. Ingram's brief says this building will carry a great deal of
lore later and asked for the basic concept only, so this is a frame to hang detail on, not an
account.
**Sources:** `data/locations/central-fortification.json`, Ingram's drawn note (2026-09-12),
`design/strategy-layer.md`, `ideas/story/dossier-first-impact.md`, `ideas/story/blank-inheritance-master-timeline.md`.

## Read this first

The Directorate's seat, on the island's south edge, and **the reason the island exists**: it was
built on a real rock outcrop and the artificial island was reclaimed around it afterwards. A
windowless multi-storey fortified block; mostly underground; two vehicle roadways enter through
the north-west face, each with its own checkpoint. Ingram's own framing is "our universe's
equivalent of NERV HQ." The name below is a proposal and easy to change.

## What's established

- **Ingram's note, verbatim in substance** (2026-09-12): incredibly imposing, multiple storeys of
  fortifications; no windows visible from outside, though armoured doors and window covers can
  slide away to let light in sometimes; two large roadways into the north-west side with another
  set of security checkpoints, large enough to drive vehicles into; "said to be like an iceberg
  where the vast majority of it is underground"; built on an actual real island with the rest of
  the artificial island constructed around it; lowest levels carved straight from that rock.
- **It is a building, not a district** — confirmed by Ingram directly, 2026-09-12 ("It's a
  building."). It was briefly drawn with the region tool, which put a 142,224 m² total overlap on
  top of Island Centre; re-tiered to a site, it sits cleanly inside Island Centre, which is what
  that district's own note already implied ("the Directorate's island complex anchoring the south
  end"). The same wrong-tool slip is recorded twice before in `tools/gazetteer/_base_names.py`'s
  `TIER_FIXES`.
- **142,224 m² of footprint**, at `D4·87` — by a wide margin the largest single structure drawn on
  the map so far.
- **npcRefs:** `commander` and `caretaker` — two of the Directorate's three existing poles, who
  plausibly sit here. No new placeholder NPC was invented for it.

## Ingram's own take, and how it diverges from any real-world source

The stated reference is **NERV HQ (Neon Genesis Evangelion)** — a buried, fortified command
structure for an organisation that runs child pilots. Two divergences are already visible and
worth protecting:

- **NERV's Geofront is a vast hollow sphere; this is solid rock, cut into.** The iceberg here is
  mass, not a cavern. Nothing established says there is an open volume down there.
- **Tone.** `feedback_tone_giant_robo_not_eva` is a standing rule for this campaign: Giant Robo,
  not Evangelion. The building should read as imposing, institutional and old, not as a sinister
  conspiracy set. The Directorate's own register elsewhere (Form 12-B, "Records and Welfare
  haven't spoken since the flood") is bureaucratic comedy, and this building is the same
  institution's headquarters.

## Tone and register — what NOT to do

**Do not connect the rock to the buried ship or the crater without asking.** First Impact happened
roughly two hundred years ago on a different island entirely (`dossier-first-impact.md`). Nothing
currently links them. *(Since LEDGER #26 and #31, a second buried ship, the search ship, does lie
under Kurose. No location file says where its hull sits, so the rule stands: linking it to this rock
is Ingram's call.)* It is the single most tempting invention available here, it would be a
campaign-shaping decision, and it is Ingram's to make.

**Do not treat this entry as finished.** It was explicitly commissioned as a first pass.

## Open questions

- **The name.** "Central Fortification", with everyone calling it "Central", is a proposal, chosen
  to match the map's plain-functional register (`The Long Sheds`, `The Container Ground`, `The
  Magazine`). "The Rock" was the main alternative considered, for the carved-from-rock fact. Not
  decided — one-line change to `data/locations/central-fortification.json`.
- Is there anything in the rock the lowest levels were cut from? (See the guardrail above.)
- How much of the building's construction involves the Directorate's four founders, and when
  exactly it was built relative to the Directorate's founding ~195 years ago.
- Whether the three `directorate-headquarters` images in `data/campaign/asset-registry.json`
  belong to this building. They currently do **not** — they show an ordinary brick facility with
  trees, a vending machine and a noticeboard, which is not this. See Related.

## Appearances so far

1. `data/locations/central-fortification.json` — promoted 2026-09-12, standing depth, first pass.

## Related

- [Bible README](../README.md)
- [data/locations/central-fortification.json](../../../../data/locations/central-fortification.json)
- [design/strategy-layer.md](../../../../design/strategy-layer.md) — the Clearance ladder this
  building is the physical expression of.
- [ideas/story/dossier-first-impact.md](../../dossier-first-impact.md) — the rock guardrail.
- `data/campaign/asset-registry.json` — three images assigned to a `directorate-headquarters`
  location that has never existed, and which do not depict this building.
