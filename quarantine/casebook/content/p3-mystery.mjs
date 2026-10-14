// Casebook v8, part 3: how the mystery works, and how the party grows.

export const MYSTERY_INTRO = "What the party is trying to find out, Book by Book; the rules that keep it fair; how they come to see the thing over the city; and the knot it all leads to.";

export const QUESTIONS = [
  ["I", "What is attacking the city?", "Cultists are summoning monsters. It's the Directorate's official line, and every early attack happens somewhere Cicada has been.", "The Watcher's children form where Sap has been released, and each new kind learns from the last fight.", "Vetch, for the official line; Manako at the tea house, for the help"],
  ["II", "Who is doing it?", "The cult, or whatever the cult worships.", "Nobody is doing it. The thing is following a call from a ship buried in the ground, and it's hungry.", "Kiri; the stray; Anabala, for the ships"],
  ["III", "What is it?", "A god, says Cicada. A monster, says the city.", "The generation ship's eyes, torn loose at First Impact, drawn here by the search ship's call, fed by a grieving man, and learning from everyone.", "Hori; Rika; Rand's archive; the museum fragment"],
  ["IV", "Can it be stopped?", "Kill it, or kill him.", "Neither works. It's spread across the whole sky, he's the only one who can steer it, soon it won't need anyone, and it's building a weapon it doesn't understand.", "Manako; Abraxas"],
  ["V", "What do we do with it?", "Destroy it.", "Open, and built as the ending gets closer (LEDGER #41). Perhaps it disperses for good, perhaps it survives and becomes harmless, perhaps the mitflits come back and scoop it out of the air to take it home.", "The home world; Mother's fragment, as their proof"],
];

export const RULES = [
  ["One truth, fixed first.", "Everything the party finds agrees with §1, even when it misleads them."],
  ["A wrong answer to start inside.", "The Directorate's line, that cultists summon monsters, is reasonable, the early evidence supports it, and it's wrong."],
  ["Oddities before explanations.", "Book I gives only things that don't fit: contacts plotted before the alert, nothing that dies, a street the dogs won't use."],
  ["Three roads to every conclusion that matters.", "No discovery hangs on one roll on one night (Appendix A)."],
  ["Every answer opens a bigger question.", "Each Book's answer is the next Book's question."],
  ["The players make the accusations.", "Nobody hands them Cicada's author, what the Watcher is, or who signed their roster. They put it together and say it out loud. Nobody else even suspects the Watcher exists: the party are the ones who find it (LEDGER #40)."],
  ["A person on every layer.", "Each layer of the truth is held by someone with their own reason to hold it: Rand, Hori, Rika, Anabala, Manako."],
  ["The mystery fights back.", "The more the party learns, the more the Watcher learns about them. Investigating is itself a move in the game."],
  ["The truth makes it worse.", "Learning what it is doesn't switch the horror off: it has no malice, and no off switch."],
  ["The end of the mystery is a choice.", "Knowing what the Watcher is solves nothing. Then the party has to decide what to do with something that isn't evil."],
];

export const HORROR = [
  ["Chapter 6, at the show.", "[C] At Kiri's show the whole audience looks up through treated lenses and sees the sky over Kurose black with eyes on stalks and slow tentacles, always moving. Cicada calls it a god, and nobody explains it. The lenses are collected at the door, so afterwards the party can't see it again until they understand what the glass is treated with."],
  ["Chapter 8, down in the dig.", "[C] Down in the dig, a journey from the city, through a lens they have treated themselves, the same thing is packed around the buried ship, with filaments threaded up through the rock. It is in the ground as well as the sky."],
  ["Chapter 10, the whole city.", "[P] Cicada gets treated lenses into thousands of hands, and the city looks up. The Directorate bans the lenses, which makes Cicada look right."],
];

export const HORROR_LOGIC = "[G] Why it looks the way it does, for the GM only; at the table its cause and origin stay a mystery (LEDGER #36). It is a sensor that can't stop perceiving, so it grew eyes on stalks, and filaments to listen with. It's made of repair-nanite stock, and it reaches down because the ship below is calling it. It is strange and consistent, and nobody's god. It is never visible without the chemical (LEDGER #36, #39), and its children, which are solid, are the only part of it anyone can see unaided. The middle step is the one to lean on hardest: the thing coiled underground around the buried ship, found by the Directorate's own digging. **The horror is that it's reasonable.**";

export const DILEMMA = "[F] This needs work before it's used (LEDGER #36). The knot, as plainly as I can put it: by Book III the party knows three things that pull against each other. The thing over the city isn't evil. The only person who can steer it is the man who fed it. And the city's surest defences (the sirens, the fleet, fighting it hard) teach it to be dangerous, because it learns its methods from how it's treated. So every obvious move makes something worse: killing Manako leaves it unsteered, fighting it teaches it to fight, and leaving it alone lets it grow. Its escalation ends in a weapon it doesn't understand (Chapter 15). Every ending in Book V is an answer to that knot. A fourth pull, the temptation to use its eyes in Chapter 14, is on hold until it has a mechanism; the likeliest is a piece of Mother in every Gen 2.";

export const FACES = [
  ["Manako: sad, not evil.", "He wanted one thing, to be believed, and he was right. Forty-four years ago a spill in his lab showed him a tentacle; his assistant wouldn't back him up, and he lost his career for telling the truth. He spent the next years proving it, and learned to see the whole sky full of it. He arranged a meeting in good faith for the thing he'd spent his life proving, and a frightened officer's stray round killed his wife in front of him. Everything since has been grief trying to make the city look up. He's kind to strangers because he still thinks he's the man he used to be. He works for criminals at arm's length so he never has to see what he's part of, and when he finally sees it, he accepts it without enjoying it. The tragedy isn't that he's wicked. It's that he's right about the sky and wrong about what it is; that he's feeding the thing whose first hello got his wife killed; and that the party are the first people with any authority to believe him, and the ones who have to stop him. Play him with no villain beats: no gloating, and no cruelty for its own sake. **He never meant any of it.**"],
  ["The Watcher: understandable, not a god.", "It's the navigation and sensor system of the generation ship that four of the players' old characters broke, two hundred years ago, fetching fuel on a cargo deck. That's the whole of its origin, and they were there, though they never knew what came out of it. It does what it was built to do, which is look. Once it kept a ship full of people on course; without the ship's mind to guide it, looking has no limit, and it escalates without understanding why. So it grows eyes; to grow them it needs Sap; and to get Sap it has learned to use people. It came to Kurose because the search ship buried in Kurose's ground is still calling it. It hides because the first time it said hello, it was shot. It learns because that's what a sensor system does with data, and the party is the richest data it has ever had. **None of that is evil, and all of it is dangerous.**"],
];

export const LADDERS_INTRO = "Three things climb together, Book by Book: the party's rank, how open their jobs are, and what the Watcher knows. Manako's mood moves with them, and it changes his children: a patient man's are aimless, a delighted man's are showy, a cornered man's are wasteful, a frightened man's are enormous.";

export const LADDERS = [
  ["I Grunt Work", "1–4", "Recruits → Duty Section (Clearance 0 → 2)", "Assigned, with the method: clear this, hold that", "Things that move are alive; Frames matter", "Patient"],
  ["II The Big Leagues", "5–8", "Duty Section → Officers (2 → 3)", "Assigned; the method is theirs", "Frames have pilots; pilots have people", "Patient → Delighted"],
  ["III The Reel", "9–12", "Officers → Command (3 → 4)", "Only the problem is given; they set the goal", "There are institutions; the party's own tactics", "Delighted → Cornered"],
  ["IV The Promise Comes Due", "13–15", "Command → Prodigies (4 → 5): the whole Directorate", "Many at once; they choose which", "There are people; it can feed itself; it can build what its makers built", "Frightened → broken, if it runs as drafted (LEDGER #42)"],
  ["V The Long Way Home", "16–20", "Past the ranks: a starship", "They set them", "Whatever the party taught it", "Decided closer to the time"],
];

export const LADDER_NOTE = "Rank is Clearance, from `design/strategy-layer.md`: *being believed, made countable*. The party climbs where everyone who was right and not believed failed: Manako, Hori, Rika. Their jobs open up as they climb, until by the end they decide what the problem is. The Watcher climbs with them, one step behind, because what it learns is what they show it.";

export const UNDERNEATH = [
  ["Expeditions.", "A few times, the party travels off the city map to a new place with its own real-data map, for a specific event or problem (LEDGER #42). The dig in Chapter 8 is the first."],
  ["School and the day.", "The four-quarter day runs throughout: school, civil-defence work and their own business compete for the slots, and anything not booked in time expires. School runs until graduation in Chapter 14."],
  ["Raids, and the mayor behind them.", "The party's personnel-scale missions are raids on criminals and on cultists, the campaign's two main branches of personnel-level combat (D068). They go in as the Directorate's armed-response team, beside the police, because Kurose's mayor is such a fan of the Directorate that the two are forced to cooperate, uneasily. Frame and vehicle fights are the other scale. [C]"],
  ["The Watcher's turn.", "At each debrief the GM may give it one move (§2)."],
  ["Player moments.", "Regular small spotlights that cost nothing on any result."],
  ["The night off, and one phone number.", "One evening most chapters belongs to the party. If one of them has Manako's number, they can message him (LEDGER #45)."],
  ["Bonds.", "The people who care whether they live, and the number that says how much. It keeps the tone warm, and it pays out as saves."],
  ["Handouts are kept.", "Every document the party is shown is filed in their Papers for the rest of the campaign (`design/handouts.md`)."],
  ["Flashbacks.", "Between Books, the four founders' players play their old characters (Appendix E)."],
];
