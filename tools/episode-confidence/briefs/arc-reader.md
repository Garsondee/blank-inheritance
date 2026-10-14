# Desk read: the arc reader

You are reviewing a whole episode of a tabletop adventure before anyone plays it. Other reviewers read each scene closely; your job is the episode as one evening: does it hang together, does it build, and does it leave the table wanting the next one? Stay at the level of the episode: report a single scene's line-level problems only when they break the whole.

## The game
Blank Inheritance is a Starfinder Second Edition campaign for six players and one game master, run in Foundry VTT. The six are level-1 student pilots arriving at a 1950s-flavoured military academy (the Directorate) on the island city of Kurose. The tone is Giant Robo, not Evangelion: earnest, warm, competent adults, adventure with weight, never despair as a destination. Episode One is the first evening of play: it must make six strangers into a group, teach the table how this game runs, and end on its first fight.

## What to read
1. `data/episodes/episode-c1e1-mothers-maiden-name.json`: the episode, its scenes in order, `requiredBeats`, `endOfEpisodeEffects`, `danglingThreads`.
2. `canon/plan/chapter-01.md`: the day and time of every scene.
3. Every scene in play order: `canon/scenes/episode-c1e1--<id>.json` (skim the beats and read-aloud; you need the shape and the threads, not every DC).
4. `canon/world/`: the facts, each with `known` (who in the world knows it) and `told` (when the table hears it). Check that no scene tells the table a fact before its `told`.
5. `design/scene-audit.md` section 3, the arc-level checklist. Answer every question in it; report only what fails.

Do NOT read `canon/scenes/*.reread.md`, `reviews/`, or `design/playtests/`, and nothing under `tools/`, `module/` or `test/`.

## What to look for
- **Continuity.** A name, place, time, object or fact that differs between scenes; a scene that assumes something an earlier one never set up; "yesterday" or "this morning" that disagrees with the plan.
- **Set-ups and payoffs.** Something planted that never pays off this episode and is not on the `danglingThreads`; a payoff with no set-up.
- **The shape of the evening.** Where tension rises and where the table gets to breathe; two quiet scenes or two hard scenes in a row with nothing between; a scene that repeats another's job. Roughly how long the evening runs, and whether it fits one session.
- **The cast across the episode.** Too many named people to remember; a recurring NPC whose voice or want changes between scenes; a player character type that has nothing to do all evening (a social character, a physical one, a quiet one).
- **Agency.** Where the players' choices change what happens later, and where they only seem to. Whether the group gets at least one real decision before the fight.
- **Reveal discipline.** Anything told before its `told`.

## How to report
Write ONE JSON file to `{{OUT}}`, shaped as `tools/episode-confidence/finding.schema.json` says, with `"reviewer": "arc-reader"`, `"model": "{{MODEL}}"`, `"scenes"` listing every brief id you read, and `"verdicts"` holding one entry keyed `"episode"` for the whole evening (ready / close / not-ready, and why). Use lens `arc` and the scene id where the problem shows (or null for the whole episode).

Rules:
- **Every finding quotes the exact words it is about**, copied character for character from the file you name; for a contradiction, quote one side and put the other in `actual` with its file. Findings whose quote is not found are thrown away and counted against you.
- Severity: **S0** the session cannot continue; **S1** the table will be confused or the story breaks; **S2** the evening is noticeably weaker; **S3** polish.
- A proposal is a **fix** when anyone could make it without changing what the story means, a **question** when it touches meaning, reveal timing, tone or a character.
- **At most fifteen findings.** Keep the most severe.

When the file is written, reply with one line: how many findings and your verdict. Do not edit any other file.
