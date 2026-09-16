# School Life and the Ordinary Day

*Part of the [Evangelion research shelf](README.md). **Mined for structure, not for register** — see [tone-guardrail.md](tone-guardrail.md). The gap the Giant Robo sweep could not fill: a mundane layer that is doing real structural work. **This is not a decision document and none of it is lore.** Claims are tagged **[S]** source, **[R]** reading, **[U]** suggested use.*

---

## 1. What the ordinary layer actually contains

**[S]** Class 2-A of a municipal school in the fortress city. Laptops on every desk — the one piece of technology the series shows advancing in fifteen years. A single homeroom teacher, extremely old, who appears in nearly every classroom scene. After-school cleaning duty. A class representative with real authority over her classmates. Transfer students introduced at the front of the room. A swimming pool. A class trip. Gossip.

**[S] Two facts about that classroom are worth the whole document:**

1. **The teacher's lessons are almost entirely about the disaster** — long recitations of the tragedy and struggle of Second Impact and the children's duty to build a new world. **And the version he teaches is the cover story.** He tells them it was a meteor strike. It was not. The classroom is where the official history is installed.
2. **Every student in that class is a potential pilot candidate.** The class was not assembled by chance. The children do not know.

**[R]** Those two facts convert a filler set into a piece of the conspiracy. The school is not where the story pauses; it is the delivery mechanism for the lie and the holding pen for the next intake.

## 2. What the ordinary day is structurally for

**[R]** Five jobs, all of which a campaign needs somewhere.

1. **It is where the consequences land.** A pilot's sister is injured in a battle the pilot fought. The pilot goes to school the next day and her brother punches him in the face, in a corridor, in front of everyone. The fight was spectacle; **the corridor is the consequence**, and it is the corridor that the audience remembers.
2. **It is where relationships are built cheaply.** Battles are expensive in screen time and produce shouting. Classrooms are free and produce conversations, and conversations are what make the next battle matter.
3. **It is the measuring stick.** The extraordinary only reads as extraordinary against something ordinary. A city that unfolds into a fortress means nothing without a maths lesson happening in it twenty minutes earlier.
4. **It shows the cost without dramatising it.** The desks are the most efficient device in the series: the audience can count who is not at one.
5. **It is where the institution's lie is repeated in public.** See §1.

**[R]** Note what it is *not* doing. It is not comic relief, though it is often funny. It is not a reward for sitting through the plot. It carries information the plot cannot.

## 3. The people the ordinary layer needs

**[S]** The series staffs it with very few people:

- **A class representative** with genuine, ordinary authority — she runs the room, scolds her classmates, organises things, and is the one person who approaches the girl nobody likes ([characters/hikari-horaki.md](characters/hikari-horaki.md)).
- **Two friends who are not pilots** — one who resents the pilot for a specific, legitimate reason and later becomes his closest friend, and one who desperately wants the pilot's job and is never going to be offered it ([characters/toji-suzuhara.md](characters/toji-suzuhara.md), [characters/kensuke-aida.md](characters/kensuke-aida.md)).
- **One teacher**, who is a running joke and a propaganda instrument at the same time.
- **A room full of named-nobody classmates** who gossip, stare, and provide the social temperature.

**[R]** That is four roles and a crowd. It is not an expensive layer to build.

## 4. The rules that make it work **[U]**

1. **Put the consequence of the last mission in the ordinary scene.** Not a debrief — a corridor, a shopkeeper, a parent, an empty chair.
2. **Give the class rep real authority.** An NPC who can tell a PC what to do about something trivial, and be obeyed, is more useful than three NPCs who admire them.
3. **Let the ordinary scene carry one piece of plot information, delivered by someone with no idea what they are holding.** The teacher reciting the official history is the model.
4. **Never make the ordinary scene optional.** If the players learn that school is skippable, it becomes a tax. Put something in it they cannot get elsewhere.
5. **Keep it short and frequent** rather than long and occasional.

## 5. For this campaign **[U]**

This is the closest match on either shelf to work already in progress.

- The campaign is a school campaign. `ideas/story/bible/locations/main-school-complex.md` exists; `ideas/entries/school-schedule-system.json` is a tracked idea with its own status; the four-quarter day ring in `data/campaign/config.json` already models a day split into slices that school events compete for (`design/ux-doctrine.md` §3, §7a).
- **The finding that transfers most directly:** the day ring currently treats school as one category of demand on a slice. This series suggests school is also **an information channel and a consequence surface** — which would mean a school slice should sometimes deliver plot rather than only cost time. Whether that is worth building is a design question for the user and the `school-schedule-system` idea's own status, **not a decision this file makes.**
- The campaign already has a buried official history and a redaction system in design (`ideas/entries/redacted-document-chain.json`, `design/harvest-inference.md`). **A teacher who sincerely teaches the redacted version is the cheapest possible way to put that lie in front of the players every week**, and it costs one NPC stub (`feedback_npc_stubs_by_default`).

---

**Sources:** English Wikipedia, *List of Neon Genesis Evangelion characters* (class 2-A, the class representative and her authority, Toji's grievance and his arc, Kensuke's military enthusiasm, the classmates' family situations); TV Tropes `Anime/NeonGenesisEvangelion` (After-School Cleaning Duty, the classroom laptops as the only visible technological advance, the single-teacher school); EvaWiki/EvaGeeks and Evangelion Wiki via search (the Old Teacher's repeated Second Impact lectures, the meteor-strike cover story he teaches, and that every student in class 2-A is a pilot candidate) — flagged as fan-wiki sourcing rather than a primary text.

**Related on this shelf:** [characters/hikari-horaki.md](characters/hikari-horaki.md), [characters/toji-suzuhara.md](characters/toji-suzuhara.md), [characters/kensuke-aida.md](characters/kensuke-aida.md), [the-institution-that-uses-children.md](the-institution-that-uses-children.md), [relationships-that-degrade.md](relationships-that-degrade.md).

**Related in this project:** `design/japanese-narrative-conventions.md` (the school story), `design/ux-doctrine.md` §3 and §7a (the day ring), `ideas/entries/school-schedule-system.json`, `ideas/story/bible/locations/main-school-complex.md`, `design/harvest-inference.md`.
