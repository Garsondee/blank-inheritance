# Source Material

*Created 2026-09-24 at Ingram's request: "Grab everything you can… and mark everything as source material
from the original Abomination Vaults adventure which set the ground for this new adventure."*

---

## What this is

Everything that could be recovered from the old Foundry VTT server (`old server data/` at the project root),
transcribed into readable files. The main folder is **the original campaign**. It was a Pathfinder 2e game in which Ingram
ran Paizo's *Abomination Vaults* and bent it into her own story, *The Trouble with Mitflits*. Its player
characters were **Hyuck, Shucks, Anabala and Rupiah**, and they went on to become the Directorate's four founders.
Blank Inheritance grew out of that table.

| Folder | What it holds |
|---|---|
| [`the-trouble-with-mitflits/`](the-trouble-with-mitflits/README.md) | **The founders' campaign.** Played from June 2022 into 2024. Character sheets, every hand-made NPC, every GM journal, the maps, custom items, roll tables, the chat log, the macros. **Start here.** |
| [`abomination-vaults-2026-run/`](abomination-vaults-2026-run/README.md) | A separate, later run of the same published adventure with a different party (Nov 2025 to Apr 2026). Not the founders' game. Kept because "everything" was asked for. |

**Why it matters (LEDGER #30).** The original campaign was never finished. It stopped with the four on another
plane, Nirvana. Blank Inheritance is meant to give it closure, tying everything up at once while also being a new
campaign. So this folder is the other half of the story being finished.

**Giving it to another AI?** [`BRIEFING-for-an-LLM.md`](BRIEFING-for-an-LLM.md) is a self-contained summary of all
of this, written to hand to an assistant as background.

## The rules for using it

1. **This is source material, not canon.** It records what happened at a different table, under a
   different game system, years before this campaign was designed. It is here to be *drawn on*.
   Nothing in it is true in Blank Inheritance until it is placed there.
2. **The ledger wins.** Where anything here disagrees with `ideas/story/bible/LEDGER.md`, the dossiers,
   or the bible, those win, and this folder is left as it was found. Contradictions are expected. For example,
   the sheet says "Shucks **Mord**" while his token and the bible say **Mordant**, and the old maps put all of
   this on Golarion, which this campaign's world is only loosely based on.
3. **Check here before inventing founder history.** This is the same "check before you guess"
   rule the bible exists for. Anything about the founders' past, the mitflits' first contact with
   people, the Baldwin shadow incident, or what the four were like as people probably has a real
   answer somewhere in this folder.
4. **Do not edit the transcriptions.** They are a record. If one turns out to matter, lift the fact into the
   bible or a dossier and log it in `LEDGER.md` the usual way.
5. **Never player-facing as-is.** It names real-world things, Paizo's published setting and the
   original players. See the "no references" rule before quoting any of it at the table.

## What was, and wasn't, transcribed

- **In full:** everything written by hand in the world. That covers character biographies, homebrew abilities
  and items, NPC stat blocks and notes, the GM's journals and handouts, text written on the maps, the
  homebrew roll tables, the chat log, and the campaign-specific macros.
- **By name only:** Paizo's own *Abomination Vaults* adventure text and bestiary creatures, bought
  map packs, compendium items, and the generic name-generator tables. They were on the table and are
  indexed (`published-content-index.md`), but they are the published product, and the full text is still in
  `old server data/`. Also by name only are the six PF2e rules quick-reference journals, because the same
  rules live in `reference/srd/`.
- **Not recoverable:** the portraits and handout images, which were hosted on the Forge
  (`assets.forge-vtt.com/...`). The URLs are kept in case they still resolve.
- **A known gap in the readable files:** an item dragged in from a compendium and then *rewritten* in play is
  listed by name only, because the transcription can't tell an edited description from a stock one. Its full
  text is still in `raw/`. Hyuck's Heartripper Blade is one example: its description gained a line about the blade
  talking back to another sword.
- **Raw data:** each campaign folder has a `raw/` directory holding the complete Foundry JSON for every player
  character and hand-made NPC, embedded items included. It could be reimported into a PF2e world if that's
  ever wanted.

## How it was extracted

The world databases are LevelDB. They were read byte-for-byte, and read-only, with the project's own
`tools/pack-extractor/read-pack.mjs`, which never opens or locks the database. The `lost/` subfolders in the old data
only held empty logs, so nothing was missing from them. The transcription script was a one-off and wasn't
kept in the repo. `ideas/story/source-material/` itself is the output.
