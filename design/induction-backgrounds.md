# Backgrounds for the Induction: ours first, most of the rest, none that are Paizo's plot

*A proposal, written 2026-10-07 from Ingram's direction (canon/decisions/D066.md). Nothing in the game has changed yet: the sort below and the fourteen backgrounds of our own are Claude's first draft, for her to cut, rename and correct.*

Ingram, 2026-10-07: *"We need to work on 'Backgrounds' and I think ideally we would offer a range of options of our own creation as well as a decent amount of the other backgrounds that might work. What we want to avoid is Paizo centric plot backgrounds whilst allowing for most backgrounds + creating some of our own which we put first."*

It began with "Directorate Lore" (D065: nobody in the party worked for the Directorate, but anyone may have lived beside it all their lives and know it well). A single extra Lore skill was the wrong size for that: the right size is a set of backgrounds that say where a character comes from.

## 1. What there is today

`data/campaign/background-catalogue.json` holds 154 backgrounds (118 common, 24 uncommon, 12 rare), read from Starfinder 2e's own. Page 3 of the Induction lists them grouped by rarity and, when one is confirmed, embeds the real sf2e background Item. Each gives two attribute boosts, two trained skills (one a Lore) and a skill feat; thirteen carry a choice the form asks (design/induction-terminal.md).

A large share of them are Paizo's own story. Starfinder 2e's backgrounds were written for the Starfinder Society, Absalom Station and the Pact Worlds' plots, and four are literally the playtest adventures ("You played Starfinder Playtest Scenario #2...").

## 2. The first sort

Three piles, by the background's *premise* and not by whether a Paizo name appears in its text (a bartender who pours drinks "from Akiton to Verces" is still a bartender).

- **Hide:** the premise is a Paizo faction, plot, playtest adventure or being. It could not be reskinned without rewriting its story.
- **Reskin:** an everyday premise whose text or Lore names a Paizo place. Offer it with the name swapped for Kurose's (Absalom Station Lore becomes Kurose Lore; the trade stays).
- **Keep:** everything else, as it is.

**Hide 53, reskin 31, keep 70 of 154.**

#### Hide
- **The Starfinder Society (a faction, its headquarters or its AI)** (20): Acquistive, Advocate, Dataphile, Defiant Victor, Exo-Guardian, Forum Aspirant, Guidance's Favored, Hero in the Making, Lodge Administrator, Lorespire Archivist, Manifold Recruiter, Religious Scholar, Showboater, Simulation Programmer, Society Scout, Starfinder Hopeful, Starfinder Snoop, Starfinder Trapsmith, Vault Diviner, Wayfinder.
- **The Pact Worlds' plot (the First Ones, Akiton's ruins, Eternity)** (4): Akitonian Explorer, Robot Adversary, First Ones Scholar, Tech Delver.
- **Another named Paizo organisation** (7): Acolyte (Grave World), Green Activist, Akashic Recorder, Consultant, Clansworn, Tech Priest, Hellforged Squire.
- **A Starfinder playtest adventure ("You played Starfinder Playtest Scenario...")** (4): Alien Hunter, Planetary Preservationist, War-Hardened Hero, Wheel Winner.
- **A Paizo plot being, event or place (the Newborn, Eox, the Ghost Levels, Salvation's End, Vesk-8, the Diaspora, a named ship)** (18): Anomaly Hunter, Ancient Elebrian, Eoxian Local, Lost Aucturnite, Ghosted, Party Crasher, Dreamer Disciple, Runetouched, Shrouded, Joro Clone, Shimmerstone Savior, Daegox Convict, Cult Escapee, Saw the Afterlight, Unleashed, Crèche Born, Starship Dweller, Rebel.

#### Reskin
- **Absalom Station's streets, markets and politics (swap for Kurose's)** (8): Absalom Local, Political Activist, Spike Larcenist, Substation Custodian, Street Vendor, Street Rat, Magic Scholar, Gun for Hire.
- **A trade or life set among Paizo's planets and stations (swap the name, keep the trade)** (13): Bartender, Hustler, Arena Veteran, Junker, Salvager, Scalawag, Space Trooper, Spacefarer, Space Trucker, Skyrigger, Cloud Chemist, Final Survivor, Sacrifice.
- **A calling whose text name-drops Paizo (swap the name)** (10): Passionate Naturalist, Scaletouched, Chevalier, Cleaner, Urban Explorer, Magitech Specialist, Dream Prophet, Masked, Esoteric Erudite, Brutaris Player.

#### Keep (70)
Antediluvian Seeker, Artist, Athlete, Bouncer, Bounty Hunter, Busker, Chatty, City Slicker, Code Carrier, Comedian, Cook, Corporate Agent, Courier, Crystal Prospector, Cyberborn, Defector, Detective, Diplomat, Disciple, Doctor, Electrician, Emissary, Escaped Experiment, Escort, Fashionista, Fixer, Gambler, Gene Splicer, Grave Medic, Grifter, Hacker, Hacktivist, Haunted, Hitchhiker, Icon, Laborer, Magic Officer, Miner, Necromancer's Apprentice, Outlaw, Phisher, Pickpocket, Pilgrim, Prisoner, Quantum Clone, Raised by Belief, Recluse, Recruit, Scam Mage, Scientist, Shipwrecked, Smuggler, Socialite, Space Pirate, Stowaway, Street Psychic, Taxi Driver, Teacher, Tech Jaded, Tech Support, Tech Troll, Technophile, Timelost, Tomb Born, Tourist, Trooper, Vidgamer, Willing Host, Xenobiologist, Xenoseeker.

How the sort was made, so it can be checked: each description's first two sentences were read, with its Lore skill. "Starfinder Society" alone puts twenty in the hide pile, which is why the pile is a third of the catalogue. **Every id is hers to move.**

## 3. Fourteen of our own, for her to cut

Each is rooted in a fact already in canon (`canon/world/kurose.md`, `directorate.md`). The suggested Lore and skill feat use only things the catalogue's own 154 already use, so none needs a new rule. Skills and boosts are left until she picks.

| Name | The premise, in a line | Rooted in | Lore | Feat |
|---|---|---|---|---|
| **Directorate Neighbour** | Grew up on the housing rows beside the base and knows its fences, rotas and rumours from outside. Never worked for it. | `kurose.locals-and-newcomers`, `directorate.public-view` | Directorate Lore | Streetwise |
| **Old Town Family** | One of the families who were in Kurose before the Directorate, still in the old town. | `kurose.first-families-stayed` | Old Town Lore | Hobnobber |
| **Newcomer's Child** | Your parents were among the hundreds who came from across Golarion to be part of the Directorate. | `directorate.newcomers` | Directorate Lore | Multilingual |
| **Left-Behind Family** | Your family sold its land too cheaply and never forgave anybody. | `kurose.winners-and-losers` | Kurose Lore | Intimidating Glare |
| **Harbour Hand** | Works the ferry stages, quays and chandlers of the Old Landing. | `kurose.old-town` | Harbour Lore | Hefty Hauler |
| **Net-Mender** | A fishing family, from the village that came before the city. | `kurose.fishing-village` | Fishing Lore | Survey Wildlife |
| **Night-Shift Hand** | The factories along the shore work through the night, and so did you. | `kurose.everyday` | Factory Lore | Quick Repair |
| **Tram Brat** | Grew up on the trams that run on time and knows every line and stop. | `kurose.everyday` | Kurose Lore | Cat Fall |
| **Radio Kid** | A radio in most kitchens; you built, fixed or lived by yours. | `kurose.everyday` | Radio Lore | Assurance |
| **Streamed from School** | Picked out by your teachers for the Directorate's intake. | `directorate.who-joins` | Academia Lore | Assurance |
| **Isolationist's Child** | Raised in a household that wants the foreign base gone. | `kurose.isolationists` | Politics Lore | Lie to Me |
| **Shrine Ward** | Grew up around a shrine gate and the people who keep it. | the Shrine Gate (a place on the map) | Shrine Lore | Student of the Canon |
| **Back-Street Runner** | Organised crime runs the streets you grew up in, and you ran for it. | `kurose.organised-crime` | Underworld Lore | Experienced Smuggler |
| **Frame-Watcher** | Spent every day watching the Frames work on the docks. | Scene 0's picture | Frame Lore | Quick Identification |

*Why trainees come* (`directorate.how-trainees-come`: some volunteer, some are encouraged, some are pushed) is a story about the character, not a background. It fits the **Review page's questions** better than a background and is left there.

## 4. How it would work

1. **The data.** Each catalogue entry gains `source` (`kurose` or `paizo`) and `stance` (`ours`, `reskinned`, `stock` or `hidden`). A hidden one carries `hiddenWhy`. A reskinned one carries the `name`, `description` and `loreSkills` it is shown with. One of ours carries its whole definition: two boost slots, two trained skills (one a Lore), a feat from the catalogue's own list, and a description.
2. **The Item.** A stock background is embedded as the real sf2e Item, as now. A reskinned one is the same Item with its name, description and Lore renamed on the embedded copy. One of ours is built from its entry in code. That needs one live check against a real sf2e background Item before it is trusted; nothing else in the pipeline changes.
3. **Page 3.** A group **"Of Kurose"** first (ours), then the reskinned and stock, grouped by rarity as now. A hidden one is never shown. An empty group heading never remains (the filter bug the playtest found).
4. **Directorate Lore.** It is the Lore of Directorate Neighbour and Newcomer's Child. It could also be offered wherever a background says "a Lore of your choice" (Hustler, Busker, Street Rat, Urban Explorer: the playtest's F-0107, where the form never asked which Lore).
5. **Tests.** A hidden background is never offered; ours come first; every feat and Lore is real; each of ours has the shape a background must have; a reskinned name never still contains a Paizo place.
6. **The order of work.** She trims and corrects the lists; the data and loader; page 3's grouping; the Item builder and its live check in the playtest Foundry; the text of ours. About half a day, with the live check the one unknown.

## 5. Questions for her

- Is the **hide** pile right? (A third of the catalogue; the Starfinder Society alone is twenty.)
- Which of the fourteen stay, and what should they be called?
- Should **reskinned** ones say *Kurose*, or a generic place?
- Should "Directorate Lore" be offered wherever a background's Lore is open, or only on the backgrounds that are about the Directorate?
