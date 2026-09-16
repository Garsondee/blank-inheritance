# The Yokoyama Crossover Method

*Part of the [Giant Robo research shelf](README.md). Imagawa was forbidden the original supporting cast and responded by casting the whole of Mitsuteru Yokoyama's back catalogue instead. This document covers what the constraint produced, what made it hold together, and how to run the same method on material this project already owns. **This is not a decision document** and it casts nobody. Claims are tagged **[S]** source, **[R]** reading, **[U]** suggested use.*

---

## 1. The constraint

**[S]** In pre-production, Imagawa was told he could not use any supporting character from the *Giant Robo* manga or its 1967 live-action series. Only two fixtures survived: the boy, Daisaku, and the enemy's name, Big Fire. With Yokoyama's permission, he populated everything else from the rest of Yokoyama's catalogue — *Babel II* and its sequels, *Tetsujin 28-go*, *Mars*, *Sally the Witch*, *Kamen no Ninja Akakage*, *Iga no Kagemaru*, *Yami no Dokiya*, *Earth Number V-7*, *Abare Tendou*, and the long historical adaptations of the *Water Margin*, *Romance of the Three Kingdoms* and the Chu–Han contention. Mecha from several of those works appear as cameos in the opening sequence.

**[R]** It is one of the earliest large-scale crossovers of its type, assembled a quarter-century before the shared-universe format became standard, and it was produced by a restriction rather than by a marketing plan. That is worth remembering: the method is what you do when you are not allowed to use the obvious thing.

## 2. Why it held together

**[R]** Four supports, and all four are necessary.

1. **One visual register.** The character designers were told to emulate Yokoyama's 1960s drawing style rather than modernise it. Characters from a dozen unrelated works look like they came from one place, because they did — one artist drew all of them, and the adaptation chose to preserve that rather than update it. **A crossover cast without a unifying visual grammar reads as a costume party.**
2. **Every borrowed character works cold.** No viewer is required to know the source. A silent masked swordsman is legible; the fact that he is named after a Song-dynasty cavalry general is a bonus for the writer, not a prerequisite for the audience.
3. **Borrowed relationships were kept, and used.** The single best example: two sorcerers who share a master in the *Water Margin* still share one here, which places one on each side of the war and gives the story a standing personal conflict at no cost. See [legendary-sources-china-and-japan.md](legendary-sources-china-and-japan.md) §4.
4. **The plot was new.** Nothing was adapted. The cast was borrowed and the story was not, so the series never had to serve anyone else's continuity.

## 3. What it cost

**[S]** The standard criticism is blunt: the OVA has very little to do with *Giant Robo* or its title character, and functions instead as a crossover vehicle for another artist's whole body of work. **[R]** That is a fair charge. The nominal subject of the production became a frame around which other people's characters did the interesting things — the robot barely fights, and the boy is the least powerful person present.

**[R]** The lesson is specific: **casting from a catalogue can hollow out the thing you were nominally making.** If everyone interesting is borrowed, the spine has to be defended deliberately.

## 4. Running the method here

**[U]** Our equivalent of "Yokoyama's back catalogue" is the material this project has already written and is not yet using:

- the gazetteer's 207 locations and their NPCs;
- `ideas/story/bible/` — its characters, locations and species;
- `ideas/entries/` — a long tail of ideas with real statuses;
- `data/locations/`, `data/hangar/legacy-units.json` (empty, and therefore an invitation), `data/npcs/`;
- the battle-simulator's fixtures, which are explicitly **not** casting proposals and should stay that way.

**[U] The method, in four steps:**

1. **Sift rather than invent.** Read the existing material looking for people it already implies but has never named. A location described as a working shed implies a foreman; a rank implies someone who was passed over for it. `design/quests-objectives-and-threads.md` calls this story sifting, and `design/location-depth.md` and `design/harvest-inference.md` are the project's own machinery for it.
2. **Keep one relationship per pair.** When two implied people could plausibly know each other, decide that they do, and write down how. This is where the method gets its density.
3. **Unify the register before casting.** Ours is already fixed — `design/visual-identity.md` and the locked 1950s tone pivot. Anything cast from the catalogue has to be drawable in that register, or it will read as an import.
4. **Defend the spine.** Check the resulting roster against `ideas/story/blank-inheritance-v4.md` and the bible. If the most interesting people on the roster have nothing to do with the campaign's actual subject, the §3 failure has happened.

## 5. The test to apply before borrowing anything

**[U]** Three questions, for any character brought in from elsewhere:

1. **Does it work cold?** Describe them in one sentence to someone who knows nothing about the source. If the sentence needs a footnote, the transplant has failed.
2. **What relationship comes with them?** If the answer is none, they are a name, not a character, and should be cast as a stub (`feedback_npc_stubs_by_default`).
3. **What does the spine gain?** If the honest answer is "nothing, but it is a good character", that is still allowed — but say so at the time, so the roster's balance stays visible.

---

**Sources:** English Wikipedia (the pre-production prohibition, Yokoyama's permission, the list of source works, the retro art direction and why it was chosen); Manga Wiki mirror (the same, with the Bandai Visual liner-note citations); TV Tropes `Anime/GiantRobo` (Massive Multiplayer Crossover, Cast of Expies, the full Expy list, Retraux, The Cameo, In Name Only); Japanese Wikipedia character page (per-character source attributions).

**Related on this shelf:** [legendary-sources-china-and-japan.md](legendary-sources-china-and-japan.md), [npc-archetype-catalogue.md](npc-archetype-catalogue.md), [characters/the-big-nine.md](characters/the-big-nine.md), [characters/ryozanpaku-rank-and-file.md](characters/ryozanpaku-rank-and-file.md).

**Related in this project:** `design/quests-objectives-and-threads.md`, `design/location-depth.md`, `design/harvest-inference.md`, `design/worldbuilding-craft.md`, `design/visual-identity.md`, `ideas/story/bible/`.
