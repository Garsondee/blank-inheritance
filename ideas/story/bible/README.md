# The Bible

*Started 2026-09-09, after writing a scene about a sentient species being trapped like vermin
without ever checking whether that was actually the campaign's intent. It wasn't. This directory
exists so that doesn't happen twice.*

---

## What this is, and why it's not `ideas/story/`'s own source documents

`ideas/story/` holds the tier-1 source documents, and this directory expands on all of them:

- `blank-inheritance-v4.md` — the older story bible, slimmed on 2026-09-25 to what exists nowhere else.
  `LEDGER.md` #25–#36 override it wherever they disagree, and the dossiers, the master timeline and the
  twenty-chapter outline supersede it wherever they overlap. Its chapter plan (§17, §19) was removed;
  the few facts only it held are in its "Kept from removed sections" list.
- `blank-inheritance-ch1-v2.md` — Chapter One. Only its method, premise, texture, mystery plants and
  Episode One survive; its other drafted episodes were deleted on 2026-09-13.
- `blank-inheritance-twenty-chapters.md` — the current campaign outline, twenty Chapters in five Books.
  A flexible draft.
- `blank-inheritance-master-timeline.md` — everything that happened before Day 1, in order. Added
  2026-09-09.
- `dossier-observer.md`, `dossier-cicada.md`, `dossier-first-impact.md`, `dossier-shinobu.md` — the
  dossier family: full GM-reference treatment for anything too big for a bible/ entry. The first two
  are **the antagonists** (the Watcher/Observer; Cicada — Manako, the Faithful vs. the Cadre, the whole
  supply chain), explicitly flagged by Ingram as critical, standing material: *"we'll need to keep
  editing and refining them as we go along to get closer to the 'truth' as we go."* Added 2026-09-09.
  `dossier-first-impact.md` (added 2026-09-10) is the full origin event — the Kortos incident, the
  founders, what the Watcher and the Frames actually are, and this world's loose relationship to
  Golarion. `dossier-shinobu.md` (added 2026-09-10) is a sympathetic witness NPC, not an antagonist,
  but her material was dossier-length rather than a few sentences, so it lives here on the same
  pattern. `dossier-the-directorate.md` (2026-09-13) and `dossier-second-generation-frames.md`
  (2026-09-19) joined the family later. **Check these before writing anything involving the Watcher,
  Cicada, Manako, Nobu, Shucks Mordant, the founders, or Shinobu** — they're more complete than a
  bible/ entry would be for the same subject. Several of these people have since been given files in
  `characters/` as well (Manako, Nobu, Shucks Mordant, Anabala, Hori), so read both; this directory's
  job for them is cross-referencing and flagging contradictions, not re-summarizing.

They're where a species, a character or a place gets its first few sentences — or, for the two
dossiers, considerably more than a few.

**This directory is the expanded encyclopaedia.** One file per entity that recurs, is going to
recur, or is sensitive enough that getting it wrong matters. It exists because the two source
documents were never meant to hold everything — Ingram's own fuller take on mitflits lives partly
in a separate, older idea file (`ideas/entries/mitflits-and-anabala.json`) that the v4 bible doesn't
fully restate, and partly nowhere written down at all yet. A single compressed paragraph in a 70KB
document is not enough context to write a whole scene against, and treating it as enough is exactly
what went wrong.

**This is not campaign data.** `data/npcs/`, `data/factions/`, `data/antagonists/` are structured,
schema-validated, and sync to Foundry. These files are prose, for a writer to read before writing,
never parsed by anything. Different job, different shape.

---

## Structure

```
ideas/story/bible/
  README.md          -- this file
  LEDGER.md           -- every direct question ever asked and Ingram's answer, verbatim. Read this note.
  species/            one file per sentient or notable species — mitflits.md is the first
  characters/          one file per named character worth tracking across sessions
  locations/            one file per place the party returns to or that carries real weight
```

**`LEDGER.md` is the single most load-bearing file in this directory — read it before this README if
you're only reading one.** It's the chronological record of every question asked directly and answered
directly: the actual, primary source everything else here gets compiled from when a fact came from a
direct question rather than the two tier-1 source documents. **Check it before asking anything** — a
question already asked and answered there must never be asked again, and its answer must never be
silently re-guessed differently the second time.

Add a new top-level category here only when an entity genuinely doesn't fit the three above
(a faction, an object, an institution) — don't force one of these three to hold something it
isn't. Most factions/institutions are well served by the v4 bible's own Cast section and don't need
a file of their own unless they grow complicated enough to risk contradiction.

**Filename = entity name, kebab-case**, matching every other convention in this repo:
`species/mitflits.md`, `characters/anabala.md`, `locations/harbour-district.md`.

---

## When a file is warranted

Not everything needs one. A walk-on NPC with three lines and no return visit doesn't. Create a file
when an entity is going to **recur across multiple scenes or sessions**, or when it's **sensitive
enough that a wrong guess has real cost** — a whole species' treatment is exactly that second case,
which is the one that went wrong.

---

## The template

```markdown
# <Entity Name>

**Category:** species | character | location
**Status:** established | partial | placeholder
**Sources:** <files this is compiled from, or "not yet written down">

## Read this first
2-3 sentences. The thing to know before writing ANYTHING involving this entity.

## What's established
Compiled facts, each one cited to where it comes from — the v4 bible, ch1-v2, an ideas/entries
file, or "confirmed live in conversation, <date>". Never state something as established that isn't
traceable to one of those.

## Ingram's own take, and how it diverges from any real-world source
If this entity is based on or reflavoured from something with a real default (a Paizo creature, a
historical reference, a genre convention), say what the default is AND exactly how this campaign's
version differs. This section exists because guessing the default instead of the divergence is
precisely the failure this whole directory is for.

## Tone and register — what NOT to do
Explicit guardrails, especially ones learned the hard way. Cite the mistake if there was one; a
rule with no story behind it is easy to forget the reason for.

## Open questions
Things not yet decided. Do not invent answers here — this is the list of what to ask about, not
fill in.

## Appearances so far
A changelog: which scenes, episodes or data files reference this entity, in order, with a one-line
note on what each one adds or assumes. This is what lets the NEXT scene involving this entity be
checked for contradiction rather than trusting memory.

## Related
Links to other bible files, design docs, and data files.
```

---

## The standing discipline (also recorded in memory, so it survives a context compaction)

**Before writing any scene, NPC line, or piece of texture involving a named species, character or
location:** check whether a file exists here. If it does, read it in full first — not skimmed, not
half-remembered from earlier in the session.

**If no file exists for something that clearly warrants one:** do not invent freely, especially not
for anything with a real-world source (a Paizo race, a historical parallel) where a "default" exists
that might not be what Ingram wants. Create a scaffold from what the two source documents already
establish, mark clearly what's missing, and ask rather than fill the gap with a guess.

**After writing content that establishes or reveals something new about an entity:** update its
file's "What's established" and "Appearances so far" sections in the same commit as the content
that revealed it. A bible entry that falls behind the fiction is worse than no bible entry, because
it looks authoritative and isn't.

**When a tone or register question is genuinely unclear, especially for anything sensitive:** the
"Tone and register" section is where the answer should already be. If it isn't there, that is the
signal to ask rather than to proceed on the read-so-far assumption that caused this directory to
exist in the first place.
