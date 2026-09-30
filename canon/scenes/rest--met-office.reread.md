# Re-read: The Night Observer

version 1 · re-read against canon/reread.md version 2 · 2026-09-29 · by Claude · state: awaiting Ingram's read

Built on the approved idea in `canon/plan/chapter-01.md` ("The night's rest", number 9): a quarter of maximum HP,
Nature or Survival to learn tomorrow's weather and tides, a +1 circumstance bonus to one weather- or sea-affected check
tomorrow on a critical success, and room for two. All four are kept as written. The haunt's shape follows
`canon/scenes/rest--crew-mess.json`, and D050 and D051.

**Does every part earn its place?**

- **R1** Every part gives the GM something to run and a player something to do. The roof and settling-in beats set
  the place and give each visitor a turn to speak; the deck is ten events (six rolls, one role-play, one informant,
  one dilemma, one buff), each with a prompt; the four o'clock beat is where the rest's roll happens, in character.
  `holdInReserve` (Genzō's margin poems) is only for a player who reads over his shoulder, and gives the GM his soft
  spot to play.
- **R2** Cutting any instrument roll would leave the deck thinner but not broken; they stay because the task asked for
  each instrument, and each fails differently (a jumpy needle, a frozen climber, a lost lantern, a lost frog, an
  invented cloud). The squall is the one group event and the only time pressure in the scene.
- **R16** Directions kept: "Give them a moment to picture it" and "Take a moment" on prompts (Ingram's own ask in
  D051, time to think before speaking), "Decide tomorrow's weather and tides before the roll" (critical: the roll is
  meaningless otherwise), and the informant's note on answering tomorrow's order sheet in readings (critical: it stops
  it becoming a spoiler).
- **R17** No negative directions to the GM. The "don't" lines are the regulars' own speech.
- **R18** Nothing prepared that the shape rules out. The one risk was a third visitor on a roof with room for two; the
  notes say what happens.

**Is it clean?**

- **R3** Nothing mentions how it was made: no decision numbers, dates, tools or other scenes in the GM text. The
  informant's "on the night of the flood tunnel duty" names an event in the fiction, not another scene file.

**Does it give away too much?**

- **R12** Nothing beyond what the table already has: the island, Frames, the flood tunnel duty they just did, and
  things ordinary and new about this building. No founders, rift, starship, Watcher, Cicada, screening or blood. The
  logbooks "going back further than anyone has read" agree with the Directorate settling in Kurose about a hundred and
  fifty years ago (`directorate.came-to-kurose`, told at the start) without saying so.
- **R19** The informant is the one place that could over-answer. Genzō gives a rule of thumb (readings tell you what's
  going out), never a reason, and tomorrow's sheet is answered in readings for the table to interpret.
- **R20** Nothing tells the players what the drum means for the city. The dilemma is put as a choice with a cost each
  way; the note says either answer is fair.

**Do the players roll?**

- **R4** Yes: every instrument, the squall, the drum (Crafting to find the fault) and the rest itself. The role-play
  events (the Remarks line, the bearing) are deliberately rolls-free: they are the time to talk.
- **R5** Yes, partly: the Crafting check decides what they know when they choose (bent pen arm, a fixable fault, or
  nothing), and the choice itself is theirs.
- **R6** Yes. Every roll has four outcomes; each failure moves the night on (Nadi steps in, the reading is corrected,
  the board is chalked again) and each critical failure escalates (an attitude drops, the watch's record is spoiled, a
  wrong forecast carried into tomorrow).

**Who's in it?**

- **R7** Both regulars have `willDiscuss`, `willNotDiscuss` with a deflecting line, and a `coercible` entry with the
  skill, DC and result: Genzō's retirement date (Diplomacy at his Will DC, friendly or better); Nadi's day-clerk post
  (Diplomacy at her Will DC, friendly or better, out of Genzō's hearing).
- **R8** Six questions for Genzō and five for Nadi, answered in their own voices.
- **R9** Not yet. Both have a proposed level and archetype (Genzō level 1, Nadi level 0, non-combat); the stat blocks,
  with Perception, Will and Deception DCs, wait for the NPC generator. The notes use their Perception and Will DCs.
- **R10** In the notes: a third visitor, breaking an instrument, attacking, lying (a false reading goes on the board),
  stealing from the log, searching the desk, splitting (roof and cellar), and leaving early (the rest still covers
  them, but only those there at four roll for tomorrow).

**Is it well said?**

- **R15** The read-aloud was read out loud: one room-sized paragraph, instruments named plainly, ending on Genzō's
  line.
- **R21** Clipped outcomes rewritten in full sentences ("Up, oiled and spinning" became "They are up, the bearing is
  oiled and the Sparrow is spinning inside a minute"; "Frog out, rain measured" and "Wrong." likewise). The log entry
  "Rain: some. Frog: one." stays: it's Genzō's own clipped handwriting, and the joke.
- **R22** Coined or unfamiliar words explained on first hearing: kame (turtle), making and ebbing (rising and
  falling), the slatted box (where the thermometers live), the recording drum (a clockwork drum that draws the
  pressure by itself). Frame is used only in GM text and in Genzō's line, where the table already knows it.
- **R23** About the Crew Mess's length, which suits a 10 to 20 minute rest for one or two players.

**Does it hold up?**

- **R11** The frog, which may end the night on a character's shoulder and named after them; or whatever they chalk
  under Remarks for the whole island to read at breakfast.
- **R13** The scene cites no facts (`facts` and `gmFacts` are empty, as in the Crew Mess). Everything it states is
  either told at the start (the island, Frames, the flood tunnel duty) or new and ordinary about this building and its
  two people, owned by this scene. If Ingram wants the Met Office, Genzō and Nadi in `canon/world/`, those are the
  facts to add.
- **R14** Day 1, night, in the plan. "Tonight" and "tomorrow" agree with it; the informant's flood tunnel line is
  marked for the night of that duty, so the event still works when the rest comes back in Episode Two.
- **R24** The Met Office is in the middle of the island, which agrees with its map entry; the harbour and the lights of
  Kurose on the far shore are what the roof would see over the fence. The tide gauge's pipe from the harbour and the
  harbour lighthouse are new details, not yet on the map.
- **R25** Everything the idea promised is here, and every thread in the task: each instrument as a roll, the hourly
  board, the squall, the decades of logs and the observer reading operations from the readings they ask for, the drum
  dilemma as a mirror of the changing city, and role-play prompts.

## Still missing

- Stat blocks for Genzō and Nadi (the NPC generator).
- The Met Office's location is not in `canon/` yet, and neither are the lighthouse or the tide pipe.
- The `data/` copy is not built; `node tools/story/story.mjs build` makes it.
- Tomorrow's weather and tides are not decided anywhere yet. Episode Two has a low-tide scene at midday on Day 2,
  which a critical success here could touch; the GM needs the day's tides settled before this rest is run.

**Edited after the re-read (2026-09-29, the prose tests):** the read-aloud is split into three units a GM can cut
live, and the night's deck beat always runs (it is the menu). Wording only otherwise: no meaning changed.

**Added after the re-read (2026-09-29, attitude as a promise, upgrades and setbacks):** Each regular has doors: Genzo helps the four o'clock forecast at friendly and turns them away at the stairhead at hostile; Nadi reports them at hostile. No faction here. Upgrade: Assistant observers. Setbacks: The drum passes (permanent, from the new boy) and Storm watch (temporary). No danger event. Nothing already in the scene was changed. Waiting for Ingram's read with the rest.
