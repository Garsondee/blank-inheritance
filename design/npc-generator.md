# The NPC Generator

*Built 2026-10-05, from D047 item 5 ("we'll have to create an 'NPC Generator' you can work with to create archetypes ... a big analysis of
how SF2E creates its stat curves") and Ingram's brief of the same day: **every NPC needs a stat block; nothing else matters yet. Learn how
to make them, then go through all of Episode One and the haunts so everyone gets stats.** Everything it writes is `drafted`: she corrects
the roster and the numbers follow.*

## What it is

A person's stat block is made from three things, none of which is a number written by hand:

1. **GM Core's curves**, extracted once into `tools/reference-extract/output/creature-building-math.json` (`node tools/reference-extract/creature-building.mjs`,
   which fails its test if the SRD mirror ever disagrees): attribute modifiers, Perception, skills, AC, saves, HP, strike attack bonus and
   damage, spell DC, each by level (-1 to 24) and band (extreme, high, moderate, low, terrible). Building Creatures, GM Core pp. 118-124.
2. **An archetype** (`data/campaign/npc-archetypes.json`): a recipe of *bands* ("low AC, low HP, moderate Perception, Will the good save, no
   strike"). Nine so far: an ordinary adult, a skilled professional, a teacher or scholar, a strong working adult, a candidate in training,
   a veteran officer, a brawler, a performer and a founder-grade power. Layer 0: pure SF2E, nothing of this campaign's mechanics.
3. **A roster row** (`data/campaign/npc-roster.json`): *this* person is that archetype at that level, with the skills their role implies.
   **This is the file to read and correct.** Levels are the ones the scenes already proposed ("Proposed: level 2 ..."); where a scene gave
   none the row's note says GUESS. Skills are role-implied drafts, not decisions.

`module/blank-inheritance/scripts/core/npc-generator/statblock.mjs` (pure) turns those into a `combatStatblock`; `tools/npc-generator/apply.mjs`
(`npm run npcs`; `npm run npcs:check` writes nothing and fails if a file differs) writes it into each `data/npcs/<id>.json` and nothing else
of that file. A foe a scene only names in prose (the tug-hands, Kanda, Goro, the lender's men, Kaito) gets a new drafted file restating what
the scene says. The statblocks are derived: change the roster, not the files.

## Rules it follows

- A band's cell that is a range takes the lower end of a short one and the middle of a long one: a weaker NPC, never a stronger one than the book
  allows. No extreme attribute modifier below level 1 (the book has none): high.
- **No actions, features, spells or resistances for a non-combat NPC** (D047). Only what the Actor carries: level, six attribute modifiers,
  Perception, skills, AC, saves, HP, Speed and, for someone built to fight, one plain strike. (Nothing about spells, `nonCombatLevel` or
  abilities reaches the Actor today: `combat-statblock.mjs` does not map them.)
- A skill is at the combat level, or at the non-combat level where the roster says so (GM Core, Non-Combat Level).
- Nothing is above `drafted` (`assertNotPromotedStatus`); names, ancestry, canon links and social profiles are never touched. (An NPC file has
  no `description` any more: its story prose was retired on 2026-10-07, D080, and the text on an Actor's sheet is generated from canon by
  `tools/story/actor-notes.mjs`. A new foe's file from a roster `stub` says where the person comes from in its `designNotes`.)
- **The DCs the scenes already told the GM stay true:** Vetch Perception 19 / Will 19 / Deception 19, the Deputy Director 26 / 29 / 26, Shucks
  39 / 36 / 37, Taka and Nobu 18 / 18 / 17 are what the roster generates (a test holds them). Shucks is level 15 with the founders (D047).

## Who has one (57 people)

Episode One's fourteen (Mordant, the records clerk, the Deputy Director, Vetch, Hulda Brack, the comms officer, Mister Ota, Nobu, the natural
history teacher, the range officer, the instrument maker, Manako, Taka, the pilot-track candidate); every regular of the ten rests and the
Magic Show; the hospital's three walk-ons; and six foes. **Not generated: the giant centipedes.** They ship with the sf2e system (Tales from
the Vast bestiary, level -1; `data/encounters/c1e1-flood-tunnel.json` already reads their numbers), so the roster lists them under `existing`
and their tokens use that actor.

Guesses to settle with Ingram (each marked in its row): Manako's level (5) and Will, the pilot-track candidate's level (3), the comms officer
(1), and the three hospital walk-ons.

## How a card's token gets it

Stagecraft gives every card a token (design/stagecraft/module.md §39). The adventure answers *who it stands for*
(`foundry/stage-figures.mjs#actorForCard`, pure helpers in `core/npc-generator/cards.mjs`), most real first:

1. a creature in the roster's `existing` list: the compendium actor, imported once into the world (a "Stage figures" folder, no player owns it),
   **each token its own copy** (`link: false`: six centipedes, six sets of hit points);
2. the person's **real synced actor** (`deriveFoundryId(npc id)`, found by the real key even when the card's name is held back), which carries
   the generated statblock;
3. otherwise a basic figure made from the card alone, as before.

A token is always named and pictured by its card, so a name the table has not learned never shows.

## Checks

`test/tier1-npc-generator.test.mjs` (the extracted tables, the generator's rules, the DCs above), `test/tier2-npc-stats-corpus.test.mjs`
(everyone cast in Episode One or a haunt, and every summon, has a statblock or an `existing` entry; the files are exactly what the roster
generates; nothing above drafted; the centipede entry points at the compendium actor the encounter names; **a new episode or haunt fails
this until its people are in the roster**), `test/stagecraft-basic-actors.test.mjs` (the resolver), the corpus and contract tests, and
`tools/stagecraft/foundry-npc-check.mjs` in the real Foundry (every Episode One person's token stands for their real actor with the
generated level, HP, AC, Perception and Will; a foe as the actor the generator made; six unlinked compendium centipedes, hurting one leaves
five whole; a real click controls Nobu's token and his actor has his generated hit points).

## Not done

- The scenes' "Proposed: level N ... Made with Ingram once the NPC generator exists" strings are left as they are (canon changes go through
  the re-read); the roster is now the source for those levels.
- Other founders (Rupiah, Anabala, Hyuck) and the flashback PC stat blocks (D047) are not here: they are built from their old sheets.
- Spells, abilities and `nonCombatLevel` are not carried to the Actor (the mapper drops them); worth doing when an NPC needs a feature.
- Other places a person could appear as a card (Episode Two and later chapters) are added to the roster as they are written.
