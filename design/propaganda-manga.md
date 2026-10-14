# Propaganda Manga — the Directorate's recruitment comic

**Status: drafted, 2026-09-26.** Research done; the cast sheets and page 1 are written
(`design/propaganda-manga-prompts.md`), Ingram's first art has arrived, and **page 1 renders in both editions** from
`data/manga/issue-01.json` with the first slice of the tool, `tools/manga/` (§5.6). Ingram's brief is quoted in §1.
Everything else here is Claude's proposal and can be vetoed. Tracked as the idea `propaganda-manga`
(`ideas/entries/propaganda-manga.json`). The detailed research lives on its own shelf, `design/research/manga/`; this
document is the plan and the summary.

**In short:** a short black-and-white manga that the Directorate itself publishes to recruit young people. It
follows a bubbly young woman through her first days in the service, a front cover and four manga-sized pages, in a
native Japanese edition and an English one. It tells the table the approved version of the history and the job. A
careful reader can see that the approved version is not the whole truth, and that the comic exists to serve the
institution that printed it. Ingram makes the pictures in Midjourney; Claude writes the script and the prompts, crops
and lays out the pages, draws the borders, balloons, lettering and sound effects, and renders both editions for the
screen, for print and for Foundry.

This document names real works and real history because it is GM-facing. Nothing in the comic does.

---

## 1. The brief

Ingram, 2026-09-26, verbatim:

> Propaganda! I want you to help me create a new in game in universe artefact to lift this campaign even further.
> The goal is simple and hopefully fully managable.
>
> I noticed how good you were at putting together the video... incredible work! And that made me wonder how well
> you might be able to do a much simpler (hopefully) task and what we could achieve as a result.
>
> If I asked you to become a manga publisher how would you feel about that? I use midjourney to generate the
> contents, you use your skills to take those images, crop them, lay them out on a page, put nice borders around
> them, add speech bubbles and kanji for the sounds and things like that. Bonus points for having an English
> translated version and a native kanji version.
>
> The idea is that we follow the story of a recruit to the Directorate and it'll be of course completely different
> to the experience that the players get. We are trying to do two things, we're going to use it to fill in gaps in
> the history and inform the players about what the job is, but we're also going to use it as a way of showing that
> the full truth and reality isn't what is advertised, that the fantasy of the Directorate is no longer true and
> that even this publication was made with the aims of the Directorate in mind.
>
> I imagine the art style being black and white manga and the full contents of this first one being at most 4
> pages of manga sized pages with a front cover. We need a 'recruit' and she can be a bubbly fun person.
>
> What do you think? If I asked you to produce manga what tools would you build to do so?
>
> Start by doing a deep research dive into the subject and then provide me with the results.

**What that settles:**

- It is an in-world artefact, published by the Directorate, with two jobs: telling the approved history and the job,
  and letting the table see past it.
- Black-and-white manga. A front cover and at most four manga pages in this first issue. "This first one" leaves
  room for more issues, so the tools and the data are built for a series.
- The lead is a recruit, a bubbly, fun young woman. Her experience is completely different from the players'.
- Two editions: native Japanese and an English translation.
- Ingram makes the art in Midjourney. Claude does the rest, as with the opening titles
  (`design/opening-titles.md` §3.1).

---

## 2. What I think

**Yes, and gladly.** It is very manageable, and the spikes in §5.1 show the hard technical parts already work on
this machine with the libraries the opening titles use.

**How it compares to the opening.** Simpler in one way: nothing moves, so there is no timing, no music and no
motion. Harder in three ways:

1. **Lettering is unforgiving.** A reader holds a page at arm's length and reads every word. A balloon that crowds
   a face, a line broken in the wrong place or a sound effect in the wrong typeface reads as amateur at once.
2. **Two languages, set two different ways.** The Japanese edition sets its dialogue in vertical columns read right
   to left, with rules about which marks may start a line. The English edition sets horizontal lines in reshaped
   balloons. Both come from one script.
3. **One face in twenty panels.** The lead has to look like the same person in every panel. That is Midjourney's
   weakest spot, and it sits at the centre of this job. §4.7 has the tools for it; §7 builds the process around it.

**The one idea that makes it work: the comic is sincere.** It never winks. It believes every word it says, the way
the Directorate believes in itself (`quarantine/ideas/story/dossier-the-directorate.md` §1: "calcified rather than sinister").
The table sees through it from three directions, and none of them needs the comic to be in on the joke:

- **What it leaves out.** The approved history goes from nothing to catastrophe in one sentence (LEDGER #27). The
  comic can do the same in one panel.
- **What the pictures show that the words don't say.** A picture can contradict its own caption. Comics have done
  this on purpose for a century, and it is the richest tool here (§4.5).
- **What the players live through.** They are streamed into Section Nine, handed the worst jobs and told their blood
  screen is nothing to worry about. The comic's recruit chooses her section, gets a cheerful check-up and saves the
  day. The contrast does the work, and it grows every session.

**The shape it wants: an eight-page booklet.** Four manga pages and a cover make five surfaces, and a folded booklet
comes in fours. So the natural form is eight: the cover, the inside of the cover, four manga pages, the inside of
the back cover and the back. The three spare surfaces are where printed propaganda does its real work: an editor's
welcome, a cutaway of a Frame with its parts labelled, a reader's coupon to fill in and post. Printed at home, that is
two sheets of paper folded once.

**Where I'd put the effort.** Into the plan before the pictures. Real manga is drawn from a rough storyboard, the
*name* (ネーム), which the editor approves before a single page is inked. Here the script plays that part: every prompt
is written for one panel whose shape, framing and empty space for balloons are already fixed, so no credit is spent on
a picture that won't fit. (Ingram chose, 2026-09-26, to go straight to the cast sheets and page 1 rather than wait for
rough layouts rendered by the tool; the tool still renders slates for any panel without art.)

---

## 3. What the lore already gives it, and what it must never do

### 3.1 What the table already knows

The comic may say anything that is common knowledge in Kurose, and nothing else unless Ingram decides to disclose it.
Common knowledge is set by LEDGER #24–#28 and spoken aloud in Scene 0 (`data/scene-briefs/episode-c1e1--from-up-here.json`):

- The rift at Kortos two hundred years ago, the four who stood in front of it (Hyuck, Rupiah, Anabala and Shucks
  Mordant), and the gods' answer to Rupiah: it will happen again, here, in Kurose.
- The Directorate, 特別対策本部, built Kurose from a fishing town about a hundred and fifty years ago.
- The Frames are the city's working machines: patched, riveted, loud. The city's favourite joke: *built to save the
  world, mostly moves cargo.*
- The four are long-lived and still about, which the city finds faintly embarrassing. Rupiah still cuts the ribbon on
  Founding Day, when a painting of the four hangs in every shop window.
- The kingdom has its own army and navy, which grumble about a foreign base in their harbour.
- Unusual-looking people tend to wear a fey glamour in public.
- Cicada is in the papers this spring.

The Deputy Director's address at Assembly (`data/scene-briefs/episode-c1e1--assembly.json`) is the institution's own
honest voice: the dig came first; the Directorate keeps the city standing; in a hundred and fifty years the alarm has
never once been real; recruits are auxiliary, and most of the work is dull; *it has always been safe, and it was not
built to be.* The comic is the glossy version of the same institution, and the gap between the two is itself worth
having.

### 3.2 Hidden in plain sight: what the comic could plant (proposals)

The dossier's rule is that every fault of the Directorate is "discoverable by looking… in plain sight, boring, and
nobody's job to ask about" (`dossier-the-directorate.md` §4). The comic is a natural place for several. None of this
is decided; each needs Ingram's yes, and each respects the rules in §3.3.

| The comic shows | What the table can come to see | Pays off |
|---|---|---|
| The founders as four tall, handsome humans, three men and one woman | Every approved picture does this (LEDGER #27, #36). The four players who played them know better. | Ch 7: "the statue is right and the pictures are wrong" |
| The rift in a single dramatic panel, with no cause | The approved history never says how it began | The flashbacks (twenty-chapters Appendix E) |
| Glamorous rescues and parades | Section Nine's real work: flood tunnels, sea walls, errands, paperwork | Chapters 1–4, every session |
| A cheerful check-up ("fit as a fiddle!") | Nothing about the blood screen. All six flagged irregular | Ch 4: Shucks's result |
| The recruit choosing her section | The six were streamed, on arrival, by something in their blood | Ch 4 |
| The sirens as the comforting sound of help on the way | It feeds on alarm | Ch 10 |
| The dig as proud public works | Digging is what draws it in | Ch 8 |
| A coupon asking for details, including mother's maiden name, with fine print about reviewing correspondence | The consent nobody reads (dossier §2.7), and Episode One's running joke | Ch 8, road 3 of "something reads what they write" |
| Nobody unusual-looking anywhere in the service | The glamour policy: tell close friends only | The players' own reveals |
| A friendly dig at the kingdom's army and navy | The comic serves the institution's own rivalry | Any time |
| Frames freshly painted, shot from heroic low angles | They are still clanking Gen 1 rust buckets | Episode Two, when the six get theirs |

**Techniques from the research that fit this comic especially well** (proposals; the full toolkit of thirty is in
`design/research/manga/propaganda-and-unreliable-documents.md`):

- **A letter from the recruit** on the inside front cover, in her own bubbly voice, which reads exactly like every
  other letter the office has ever printed. Signed-by-the-heroine copy written by a press office is how honest
  propaganda turns grey.
- **"Draw her yourself!"** A reader-art contest on the inside back cover: send in your drawings of the recruit. It is
  period-true (girls' magazines ran exactly this) and it is the institution collecting what its readers imagine,
  which sits on the campaign's surveillance theme without saying a word about it.
- **The Directorate's own voice in the angular balloon.** A loudspeaker or an official speaks in the shape Japanese
  lettering reserves for cold, bureaucratic voices, while every person in the comic speaks in warm ovals.
- **Nobody is ever the joke except the recruit herself.** She trips, salutes the wrong way, eats too much at the
  canteen. The sergeant, the doctor, the machines and the institution are never the punchline, which a careful reader
  can notice.
- **The quiet second edition.** Later in the campaign, a reprint with one panel changed, issued through the same
  handouts button, beside the copy already in their Papers.

### 3.3 Hard rules

1. **No contamination** (LEDGER #34). The comic carries only what the players may know when they get it. Its GM
   truths live in GM-only fields of the script and are never rendered.
2. **No outside references, no denials** (LEDGER #24). No real works, places or decades. Never mention a thing in
   order to deny it: no "no monster has ever…", no "only one kind of Frame". Leave the unmentioned wholly out.
3. **The Watcher never appears.** The opening titles' exception (LEDGER #37) is for that video only.
4. **Gen 1 only, and never graceful.** The comic may polish its Frames. It never makes them move gently or carefully:
   that register belongs to Gen 2 (Scene 0's note, Mystery Ledger #11), which is never mentioned.
5. **Founders only as the approved faces**, if at all. Never their true forms, never the cause of the rift.
6. **Nothing sexualised, ever.** The lead is a young woman in a recruitment comic, which is exactly where real
   recruitment art has gone wrong (§4.5). She is drawn the way the Directorate wants her seen: capable, cheerful,
   in uniform.
7. **Warm, funny, sincere** (`feedback_tone_giant_robo_not_eva`; `design/research/giant-robo/ham-and-sincerity.md`).
   Comedy is load-bearing. The comic never winks.
8. **Keep the people good and the institution bad** (`dossier-the-directorate.md` §6). The comic's cast is likeable.
   Its dishonesty belongs to the institution's spin, not to any person in it.
9. **Colour.** Black and white inside. If the cover takes a second ink, it is Directorate vermilion (#be3219, the
   approved seal's colour, `data/campaign/asset-registry.json` `directorate-seal-lettered`). Violet, never
   (`design/visual-identity.md`, "the one dishonest colour").
10. **Names** follow `design/prose-craft-and-naming.md` §11–13 and check `data/campaign/open-questions.json` first.
    The name Kai is banned for any character, place or item.

---

## 4. The research, in brief

Six research strands ran on 2026-09-26. Each is a document on the shelf, `design/research/manga/`, with every source
linked; what follows is the part that changes what we build. Unconfirmed claims are marked there, not here.

### 4.1 The page (`page-craft-and-print.md`)

- **The standards scale to us.** Professional manga is drawn on B4 paper with a 180 × 270 mm *inner frame* (基本枠:
  dialogue and anything important stays inside it) and a 220 × 310 mm trim. That is the √2 proportion, the same as A5
  and B6, so a booklet inherits it cleanly. On an A5 page: 3 mm bleed, an inner frame of about 122 × 180 mm, nothing
  essential within 4–5 mm of the trim, and no faces or words in the binding-side margin (ノド).
- **Panels.** Five to seven a page is the professional norm (Weekly Shōnen Jump averages six panels and about ten
  balloons); a publisher's own course says eight at most. The gap between panels side by side is about half the gap
  between rows (at A5 about 2.5 mm and 5 mm), which makes each row read as one unit. Frame lines about 0.55 mm;
  balloon outlines lighter, 0.2–0.25 mm.
- **Reading order can be checked by a program.** Neil Cohn's experiments measured where readers go wrong: gaps that
  line up from row to row, a tall panel beside a stack split half-way down, overlaps on the side where reading enters.
  The shelf turns them into eleven checkable rules for right-to-left pages.
- **Page turns.** In a right-bound booklet odd pages sit on the left. The last panel before a turn (the hook, 引き)
  is drawn small; the first after it is the page's largest.
- **The booklet.** Eight pages from two sheets. Right-bound, sheet 1 carries pages 1 and 8 on its outside and 7 and 2
  inside; sheet 2 carries 3 and 6 outside and 5 and 4 inside. So manga pages 2 and 3 land on the centre spread, the
  only place a picture can cross the fold, and both covers print on one sheet that can be heavier or tinted.
- **Magazine furniture** is real and nameable: the four cover surfaces (表1–表4, the back being the most valuable
  advertising slot), the *hashira* (柱, a margin strip on the outer edge where editors print hype and notices), *aori*
  (アオリ, the editor's hype lines on the title page and at page-turn hooks), and the reader-survey postcard.
- **Print numbers.** 600 dpi masters (1200 for pure black-and-white); tone at 60 lines per inch *at final size*,
  round dots at 45°, 10–30 % (10 % is the standard skin shadow), 80 % and darker becomes solid black; never resize
  after toning.

### 4.2 Balloons and lettering (`lettering-and-sound-effects.md`)

- **The balloon's shape is the voice.** Ellipse for speech; a spiky burst for shouting; a cloud with a trail of
  bubbles for thought; radiating flashes for a realisation or a strong inner feeling; dashes for a whisper; a wavy
  line for fear. Two are ready-made for this comic: an **angular polygon means a cold, bureaucratic or mechanical
  voice**, and a doubled outline means a telephone, a loudspeaker or a radio. The Directorate's official voice has a
  shape waiting for it.
- **Tails** aim at the mouth and stop short of it. A Japanese convention, a notch pointing *into* the balloon, marks
  a speaker off the edge of the panel. When one person has several balloons in a panel, only the one nearest the head
  gets a tail; the rest link to it.
- **Placement:** right to left and top to bottom, near the speaker, never over a face, always inside the inner frame;
  long speeches split at phrase breaks.
- **Japanese type** is set the manga way: kana in an *antique* face (low-contrast, bold-ish) and kanji in a gothic.
  Professionals use commercial Morisawa faces. **Two free fonts are built for exactly this job:** 源暎アンチック
  (Gen'ei Antique, about 18,000 glyphs with vertical setting) and Shippori Antique, both under the SIL Open Font
  Licence, which allows use in images and PDFs.
- **Sizes and rules at B6:** dialogue about 12.5Q (3.1 mm; one Q is a quarter of a millimetre), line spacing about
  130 %, no more than about ten characters to a column and three or four columns to a balloon. Columns break at
  phrase boundaries, chosen by the letterer; the machine only wraps what is left. Children's and boys' manga put
  furigana (small reading aids) on every kanji, half size, to the right of the column, so a recruitment comic for
  young people would too.
- **Vertical punctuation** follows Unicode's vertical-orientation data and the fonts' own vertical forms (spike 1);
  `!!` and `!?` sit side by side in one square; `……` always comes in pairs; one house style is kept for the whole
  book (for example, no 。 at the end of a balloon). The W3C's *Requirements for Japanese Text Layout* gives the
  line-break classes.
- **Role fonts,** as a working magazine uses them: thought in a rounded gothic, narration in a mincho, shouts in a
  heavy display face, the loudspeaker or bureaucrat in BIZ UD Gothic inside the angular balloon, and typed forms in
  BIZ UD Mincho (all free under the same licence).

### 4.3 Sound effects (`lettering-and-sound-effects.md`)

- **Drawn, not typed.** Size is loudness; rounded letters read soft and angular ones hard; a white outline of
  0.6–0.8 mm keeps them legible over the art; they lean into the direction of motion and may break a panel's border.
- **Script carries meaning:** katakana for machines, impacts and hard sounds; hiragana for soft, cute and still
  ones. A final ッ clips a sound (ドキッ, a heart-thump), a long bar sustains it (シーン, the sound of silence, which
  Tezuka coined), and tripled syllables rumble (ゴゴゴ).
- **The shelf holds a 117-entry lexicon,** each word sourced, grouped for this comic: machinery and heavy footsteps
  (ガシャン, ズシン, プシュー), trams (ガタンゴトン, and チンチン, the tram's bell), office work (カタカタ for typing),
  crowds and salutes (ワーッ, パチパチ, ビシッ), bubbly moods (キラキラ, ルンルン, ワクワク) and comic reactions
  (ガーン, ギクッ).
- **Free display faces for them:** Dela Gothic One and Reggae One (already on the machine), Rampart One, Train One
  for trams, DotGothic16 for electronics, Potta One for brush, and Hachi Maru Pop or Mochiy Pop One for the recruit's
  bubbly asides.

### 4.4 Two editions (`lettering-and-sound-effects.md`)

- **Translated manga have kept right-to-left order since 2002,** when a publisher committed to unflipped books for
  the art's sake, for speed, and to keep the sound effects intact; the market followed. So the English edition keeps
  the Japanese page order and the unmirrored art.
- **Sound effects:** publishers either replace them, keep the Japanese with a small English subtitle, or explain
  them in the margin. **The subtitle suits a translated in-world artefact best**, and it is what spike 3 does.
- **Each edition gets balloons shaped for its own language.** Real English editions must cram horizontal lines into
  balloons drawn tall for vertical Japanese; drawing our own balloons removes that problem entirely.
- **English lettering grammar:** capitals, bold italic for stress, three-dot ellipses, a double dash for an
  interruption, no hyphenation. Honorifics can stay, since the setting and its relationships make them matter.
- **English fonts.** The industry's own faces are paid, or licensed for comics creators only (a grey area for a game
  prop). Free options under the same open licence include Comic Neue, with Bangers for titles. A **fonts manifest**
  (each face, its licence and its source) is checked by the build, so no unlicensed font slips in.
- **The Japanese itself.** I write good Japanese, but not native Japanese. The edition should be read by a fluent
  reader before it is final, if one is available.

### 4.5 Propaganda, and documents that tell on themselves (`propaganda-and-unreliable-documents.md`)

- **The closest real precedent is a cheerful shared cartoon family** (Japan, 1940–41). A state-organised cartoonists'
  association licensed it to many artists, it invited readers to draw the family themselves, and its gentle domestic
  comedy made neighbours watching neighbours feel like good manners. It sits almost exactly on this campaign's two
  themes: surveillance, and a system that multiplies through the people it touches.
- **Humour teaches the job.** A US Army maintenance magazine taught soldiers to look after their equipment for two
  decades through a lovable klutz, machines drawn with faces and feelings, and soldiers' own slang. That is the model
  for "inform the players what the job is" without a lecture.
- **Institutions allow jokes only while they are not the butt.** A 1930s dog-soldier strip was stopped in 1941 partly
  for seeming to mock the army; the Army removed the maintenance magazine's klutz in 1955. So a careful reader can
  notice who is never the joke.
- **A cute, reassuring mascot is weakest where its claims can be checked** (a 1993 plutonium mascot reassured a boy
  drinking plutonium solution, and was withdrawn). The players will check this comic's claims against their own days.
- **Sexualised art in a recruiting channel backfires, fast and in public.** Both real fixes were redesigns toward
  competence, which is where rule 6 in §3.3 starts.
- **The core risk is left out by vocabulary.** One army careers website used "enemy" on 36 of 296 pages and "kill"
  on none. A word audit of the script is cheap and telling.
- **Erasures leave traces, and editions get compared.** Soviet retouchers painted purged officials out of
  photographs; the tells were water too smooth, a gap in a crowd, light that doesn't match, and above all two
  printings side by side. The handouts system makes a **quietly revised second edition**, with one panel changed,
  easy to issue later.
- **What kind of propaganda this is.** It names its publisher and is broadly accurate ("white"), and it asks readers
  to settle in rather than rise up ("integration"). It turns grey the moment a "letter from the heroine" turns out to
  have been written by the press office.
- **The richest tool is words and pictures on parallel tracks:** a caption narrating the brochure while the picture
  shows something else. Picture-book scholars call it counterpoint; the classic case is a text about a hen's placid
  walk while a fox chases her through every picture.
- **Where the eye goes.** Readers read the words first and look mostly at faces; background detail is missed unless
  something fails to add up and sends them searching. So a contradiction belongs where the eye lands second (a face,
  a sign, a number), or behind a small visible gap.
- **At the table.** A cover and four pages take a first reader two to four minutes, and handouts get read in
  fragments while play goes on. The careful layer will mostly be found between sessions, so the comic must never be
  the only route to any conclusion: at least three routes, per the Three Clue Rule
  (`design/ttrpg-campaign-and-session-craft.md` §3).
- **The toolkit.** The shelf ends with thirty named techniques, each tied to its real precedent: fine print that
  voids the promise in the only case that matters, statistics that tell on themselves, a date that doesn't fit, the
  missing centrepiece, the too-perfect record of an ordinary recruit, the ghostwritten letters page, the warning box
  that describes the reader, and more.

### 4.6 The period look (`period-look-and-language.md`)

- **The nearest real model** is a B5 children's monthly of the later 1950s. Its serials ran seven to fifteen pages an
  issue, and its free gifts (付録) often came as separate little booklets. **A four-page comic as a gift booklet is
  period-true, and explains its length.**
- **Pages** were regular rows, a mostly straight-on camera, and rounded, big-eyed figures. Tone was flat dots used
  sparingly: adhesive screentone reached Japan in 1952 and spread from about 1954; gradients and scraped highlights
  are 1970s. Bold sound effects, speed lines and dramatic angles came in with *gekiga*, the grittier style born in
  rental comics from 1957; a cheerful state publication would have kept clear of them.
- **Lettering** was metal type: mincho at first, then the antique-kana-and-gothic-kanji mix (アンチゴチ), standard in
  the big children's magazines by about 1960, evenly spaced. Children's print carried furigana.
- **The bubbly heroine has a period toolkit:** star-lit eyes (late 1950s), the full-height "style drawing" of the
  heroine cutting down through the rows (from January 1958), and a long line of sunny tomboy heroines.
- **Black and vermilion** two-colour printing was the period's cheap colour, which happens to be exactly the
  Directorate's own colours.
- **A young woman as the face of a paramilitary service is ahead of the real record** (women featured on Japan's
  defence recruiting posters mainly from the 1970s), but the logic is documented: institutions used women to look
  unlike the old army. In the fiction that makes her a deliberate, slightly forward-looking PR choice.
- **Language:** slogans built on みんなで〜 ("together…"), さあ〜 ("come on…"), もうすぐ〜 ("soon…") and 〇〇募集
  ("now recruiting"); a civic, cheerful register rather than a martial one; period words for women's jobs
  (婦人〜). The big numbered cutaway of a machine is a late-1960s form; the in-period version is a painted scene with
  a few captions.

### 4.7 Midjourney (`midjourney-and-the-print-look.md`)

As read from Midjourney's own documentation on 2026-09-26; it changes month to month.

- **The default model is V8.2.** Its character-consistency tool is the *Edit Model*: up to four reference images
  attached to a prompt and locked across prompts. Omni Reference and Character Reference belong to older models;
  Niji 7, the anime model, has no reference tool at all. Midjourney's own tip is to combine references into **one**
  sheet, which is what the cast sheets in §7 are for.
- **Aspect ratio, settled.** With references attached, V8.2 ignores the aspect ratio set in the web interface unless
  the prompt ends with `--ar W:H`. Ingram's rule for the opening was no `--` parameters (`design/opening-titles.md`
  §6.1); **for the manga she allows them** (2026-09-26): `--ar`, `--no` and similar modifiers are welcome. Still no
  Niji, never a guessed version number, and no reference parameters in the prompt text, because she attaches
  references by hand. So every prompt ends with its own `--ar` and the standard no-list.
- **Don't ask it for screentone.** Diffusion models blur fine dots, and resizing ruins them. Ask for clean ink lines
  and flat grey areas, and put the dots in ourselves at print resolution, which is what spike 2 does.
- **Keep lettering out of the pictures.** Anything in double quotation marks is drawn as text, so prompts never use
  them. "Manga page", "panels" and "speech balloon" stay out of the prompt; text, balloons, borders and extra panels
  go in the no-list; the empty space for balloons is described in words ("figure in the lower half, empty sky
  above"); and each panel is generated 15–25 % wider than its frame so the layout can re-crop.
- **Size and cost.** A V8.2 HD image at 2:3 is 1792 × 2688 px, about 76 × 114 mm at print resolution, so line art is
  upscaled with a permissively licensed anime upscaler before it is inked. One careful pass per panel (a draft, two
  reference jobs, one HD final) is about 4.7 GPU-minutes, so roughly two hours of fast time for a cover and 25
  panels, before fixes.
- **Precedents.** Japan's first published AI-drawn manga (Rootport's *Cyberpunk Momotaro*, 2023, made on Midjourney's
  2022 model) sifted 100–200 images per panel and was composited by hand. An 18-page Midjourney comic with a young
  woman lead (*Zarya of the Dawn*, 2022) is the closest in size to ours. Every account names the same problem: the
  character drifting from panel to panel. The fixes they report are human compositing, characters and backgrounds
  generated separately, and silhouettes distinctive enough to survive black and white.
- **Privacy:** results are public on Midjourney's site unless its Stealth mode is on. Ingram has settled that where
  material sits is not a spoiler risk (LEDGER #34), and this comic is player-facing anyway.

### 4.8 The software (`tooling-landscape.md`)

- **Pillow here cannot lay out vertical text by itself:** its text-shaping layer switches on only when a separate
  FriBiDi library is present, and even then it steps columns the wrong way for Japanese. Spike 1's vertical-forms trick
  makes that unnecessary.
- **Chromium already does most Japanese vertical typesetting** (vertical columns, side-by-side marks, furigana, strict
  line-break rules, phrase breaking), so the research recommends a hybrid: a headless browser sets the text, Python
  does everything else. The cost is a second runtime (Playwright and a pinned Chromium) and two engines that must
  agree to the millimetre.
- **My recommendation: stay in Python.** One runtime, the same stack and test style as the title-sequence renderer,
  and spike 1's route for vertical text. In a comic this size the letterer's own phrase breaks do most of the work;
  the line-break rules, side-by-side marks and furigana are a few hundred testable lines. Proper text shaping
  (uharfbuzz, a pip wheel) is the upgrade path if a font needs it, and Chromium stays the fallback if typography
  problems pile up.
- **No open-source manga tool does Japanese line-break rules or side-by-side marks properly,** and most are GPL, so
  we borrow ideas, not code.
- **Balloons.** Microsoft's 1996 Comic Chat balloon algorithm is about thirty lines and mirrors to right-to-left, but
  our balloons are placed by hand in the script: the program checks them (order, overlap, faces) rather than placing
  them. Shapes come from well-known parametric definitions: the ellipse through the text box's corners, clouds and
  bursts seeded by the balloon's id so every re-render is identical, and tails joined to the body before one outline
  is stroked.
- **Effects.** Screentone is PostScript's spot-function model, about ten lines of numpy; focus and speed lines follow
  Clip Studio's parameters; the hand-drawn wobble on sound effects follows RoughJS.
- **Output.** pypdf, already installed, marks a PDF right to left and can impose the booklet. A CBZ file with the
  comic-reader manga flag suits readers who want one.
- **Foundry's own PDF viewer ignores the right-to-left flag,** so a comic PDF would show its spreads backwards there.
  Filing each page as an image in the handouts system's Papers folder works at once. A small page-turn viewer (right
  to left, with a Japanese/English switch; roughly 200–300 lines, using patterns the opening-titles code already has)
  is the nicer later step.

### 4.9 Where the strands disagree, and what I propose

1. **Dots on screen.** Print gets real screentone dots at 60 lines per inch. On screen, dots shimmer whenever the
   image is scaled, and Foundry scales images to fit the window, so **the screen edition uses flat greys at the same
   three tone steps, with a faint paper grain**. A side-by-side test in Foundry on Ingram's screen settles it once the
   first page exists; it takes minutes.
2. **Period or modern.** Ingram's call, settled by eye: the first cast sheet is prompted in both looks
   (`design/propaganda-manga-prompts.md`, M1-C1a and M1-C1b). My lean is **period bones, modern polish**: the structure,
   lettering and restraint of the period (even rows, one full-height drawing of the recruit, flat tone used sparingly,
   the big sound effects saved for the Frame, furigana, evenly spaced type, a black-and-vermilion cover), with
   Ingram's Midjourney art as the drawing. A city with trams, typewriters and a radio in every kitchen would print a
   comic that looks like this, and the art stays beautiful.
3. **`--ar` in prompts.** Settled by Ingram, 2026-09-26: allowed (§4.7).
4. **Mincho or antique.** The antique-and-gothic pairing for everything anyone *says*, as readers of manga expect and
   as the period's children's magazines did by about 1960. **Mincho for the institution's own printed voice**:
   captions, notices, the fine print. That matches the campaign's existing paper register, where Directorate documents
   are set in mincho (`design/visual-identity.md` §1b), and it makes the difference between a person speaking and the
   Directorate speaking visible at a glance.

---

## 5. The tools I'd build

### 5.1 What the spikes proved

Three throwaway spikes, run 2026-09-26 in the session's scratch folder with only what this machine already has
(Python 3.11, Pillow 12.3 with FreeType, fontTools, numpy, OpenCV):

1. **Vertical Japanese lettering works without new software.** This Pillow has no HarfBuzz/raqm, so it cannot lay
   out vertical text itself. The trick: fontTools reads each font's own vertical-alternate table (the OpenType
   `vert` feature) and writes a working copy of the font whose character map points every character at its vertical
   form. Pillow then draws one character per square, and the font designer's own vertical punctuation comes out
   right: the long-vowel bar ー stands upright, the small っ sits high and right, …… runs down the column, brackets
   turn. Tested on five fonts already on the machine: Noto Serif CJK JP (387 vertical forms), Yu Gothic (2,650),
   Reggae One (839) and Shippori Mincho B1 (667) carry full sets; Dela Gothic One, a display face, carries only the
   five commonest (、。「」ー), so it suits sound effects and headlines rather than dialogue. Also working: kana in one typeface and kanji in another (the manga convention, §4.2), `!?` and
   `!!` set side by side inside one column square (縦中横), and a simple line-break rule that keeps closing marks and
   small kana off the top of a column.
2. **Midjourney greys become printed manga.** Ink lines are drawn from the image with a difference-of-Gaussians
   filter, solid blacks are kept, and mid-greys are quantised to three tone values printed as 45° dots, like sheets
   of screentone. On one of Ingram's opening stills it reads convincingly as a printed manga page. Tuning needed:
   skin should stay white, as in real manga.
3. **A whole page composes end to end in both editions.** Page geometry in millimetres (trim, bleed, inner frame),
   three tiers, a slanted gutter, a panel bleeding off the page edge, art cropped to each panel by a focus point,
   a vertical narration box, vertical balloons with tails, two outlined katakana sound effects, focus lines, a page
   number, and a proof view that numbers the panels in reading order. The English edition renders from the same
   script with horizontal lettering and the sound effects kept and subtitled.

**Two real bugs caught, both of which become tests:** a sound effect drawn glyph by glyph let each glyph's white
border cover the previous glyph's marks (ガ lost its two dots), fixed by drawing all borders first and all fills
last; and a balloon placed by coordinates alone landed on a face, which is why the script needs keep-clear areas and
the prompts need empty space for balloons (§5.3, §7).

### 5.2 The tool: `tools/manga/`

Python, beside `tools/title-sequence/` and sharing its approach: a data file drives a renderer; drafts always render
the whole issue, with slates (text-only placeholder panels showing the prompt code and the prompt) wherever art has
not arrived yet; tests in `test/manga/` in the same stdlib `unittest` style. This is the whole design; §5.6 says which
part of it is built.

**The modules** (package `mangapress`):

| Module | Does |
|---|---|
| `geometry.py` | Page formats in millimetres; trim, bleed and inner frame; which side the spine is on, from the page number and the binding; tiers, gutters, slanted cuts, insets and bleed panels, as polygons. Works out the reading order from the layout and checks it against the script's. |
| `art.py` | Intake by prompt code; crop to a panel by a focus point and zoom; the manga conversion (ink lines, solid blacks, tone levels, skin kept white); cut-outs for figures that break out of their panel, reusing `titleseq/matte.py`. |
| `tone.py` | Dot screentone at a fixed size across the whole issue, gradient tone, focus lines (集中線), speed lines (流線), black and spiky flashes, sparkles, and the paper finish for the screen edition. |
| `letter_ja.py` | The vertical setter from spike 1: cached vertical-form fonts, kana and kanji in their own faces, 縦中横, furigana, emphasis dots, line-break rules, and the script's own hand-placed breaks first. |
| `letter_en.py` | The horizontal setter: the letterer's diamond (short lines top and bottom, long in the middle, to fill an oval), bold for stress, no hyphenation, one size across the issue. |
| `balloon.py` | Shapes (oval, burst, thought cloud, dashed whisper, wobbly, radio, narration box, borderless caption), curved tapered tails aimed at a speaker's mouth, linked balloons, fitting to the text, and keep-clear areas. |
| `sfx.py` | Outlined katakana and hiragana, each glyph scaled and tilted, drawn edges then borders then fills (spike bug 1), optional perspective, and the English edition's small subtitle beside it. |
| `page.py` | Composition, in order: art, tone and effects, borders, balloons, sound effects, then the page furniture (page number, margin text). |
| `cover.py` | The masthead, issue number, catch copy, the Directorate's seal, and a second ink plate in vermilion if the cover takes one. |
| `output.py` | Per-page PNGs for print and screen; a PDF marked to read right to left; the saddle-stitch imposition for home printing; the images the Foundry handout uses. |
| `lint.py` | The checks in §5.5, run before every render. |

**The commands** (`python tools/manga/render.py …`):

- `draft <issue>`: the whole issue, both editions, with slates where art is missing. The default review render.
- `proof <issue>`: the same with trim, bleed, inner frame, panel codes and reading-order numbers drawn over it.
- `prompts <issue>`: writes the prompt sheet from the script, each prompt headed by its code and carrying its panel's
  exact shape, so the aspect ratio set in Midjourney's web interface matches the frame it will fill.
- `contact <issue>`: every panel's crop drawn over its source image, to check framing.
- `print <issue>` and `screen <issue>`: the finished files.
- `lint <issue>`: the checks alone.

### 5.3 The script: `data/manga/<issue>.json`

One file per issue, with its own schema, `data/schema/manga-issue.schema.json`. A new store, flagged deliberately,
like the opening's timeline. The shape, trimmed:

```json
{
  "id": "issue-01",
  "authoring": { "status": "drafted" },
  "format": { "trim": "B6", "bleed_mm": 3, "binding": "right" },
  "editions": ["ja", "en"],
  "pages": [
    {
      "id": "p1",
      "layout": { "tiers": [ { "h": 0.36, "panels": ["k1"] }, { "h": 0.30, "panels": ["k2", "k3"], "slant_mm": 6 } ] },
      "panels": [
        {
          "id": "k2",
          "art": "M1-P1-K2",
          "crop": { "focus": [0.5, 0.28], "zoom": 1.25 },
          "keepClear": [[0.30, 0.10, 0.70, 0.60]],
          "balloons": [
            { "shape": "oval", "at": [0.78, 0.22], "tail": [0.55, 0.40],
              "text": { "ja": "ここが/黒瀬……！", "en": "So this is… Kurose!" } }
          ],
          "sfx": [ { "text": { "ja": "ガシャン", "en": "KLANG" }, "style": "impact", "at": [0.2, 0.3], "angle": -14 } ],
          "gm": "GM-only: what this panel leaves out, and where that pays off."
        }
      ]
    }
  ]
}
```

Positions are fractions of the panel, so a layout change never strands a balloon. A slash in the Japanese marks where
the column breaks; the letterer chooses those breaks by phrase, as in real manga, and the machine only wraps what is
left. The `gm` field is never rendered, and a test holds that.

### 5.4 Getting it to the table

- **Foundry.** Through the handouts system being built today (`module/blank-inheritance/scripts/core/handouts.mjs`:
  one press shows a document on the players' screens and files it in their **Papers** folder for good). That module
  takes one image or one text body per handout, so a comic needs one small extension there: several image pages, in
  reading order. A dedicated reader that turns pages right to left, with a Japanese/English switch, is a later nicety,
  not a requirement.
- **Personal copies, optionally.** The handouts system can already give each player their own copy with their
  character's name typed in. A recruitment coupon on the back page that arrives already filled in with each reader's
  own details, because the Directorate already has them, would put the campaign's surveillance theme in their hands
  on day one. A proposal only.
- **PDF**, marked to open reading right to left, for anyone who wants the file.
- **Print.** Two sheets, printed both sides, folded and stapled: an A5 booklet from A4 paper (the same proportions as
  B6). The imposition (which page goes where on which side) is computed, not hand-arranged.

### 5.5 Tests (`test/manga/`, stdlib `unittest`)

- Geometry: millimetres to pixels, bleed, the spine side for odd and even pages of a right-bound book, tier heights
  summing to the inner frame.
- Reading order: right to left, top to bottom, including slanted gutters; a layout whose order is ambiguous fails.
- Vertical setting: each mark that has a vertical form maps to a different glyph from its horizontal one; a column
  never starts with a closing mark or small kana; `!?` becomes one 縦中横 cell; the script's breaks are kept.
- Sound effects: the dakuten survives (spike bug 1, as a regression test).
- Balloons: every line of text sits inside its balloon, and no balloon covers a keep-clear area (spike bug 2).
- Fonts: every character in the script exists in the face that will draw it (Yuji Syuku once silently dropped four
  of six characters from the seal's lettering; `asset-registry.json`, `directorate-seal-lettered`).
- No image used in two panels.
- **No contamination:** the `gm` fields never reach a rendered page, and a list of GM-only words (kept in data,
  maintained with the lore) never appears in any rendered text.
- Determinism: the same script and art render byte-identical pages twice.
- A smoke render of a tiny fixture issue with slates in place of art.

### 5.6 The first slice, as built (2026-09-26)

Built on page 1, with 70 tests (`npm run test:manga`, a few seconds). How to run it and how the script works:
`tools/manga/README.md`.

- **Built:** `geometry.py` (straight tiers only), `art.py` (crop by focus and zoom; three tones: `flat` for screen,
  `dots` for print, `art`), `letter_ja.py` (vertical columns, kana and kanji in their own faces, 縦中横, furigana,
  line-break rules, hand breaks first), `letter_en.py` (the lozenge), `balloon.py` (oval, burst, wobbly, angular for
  the machines, caption box, halo; tails; each balloon fitted to its own words), `sfx.py` (effects, the title, English
  glosses), `page.py` (composition, the margin line and page number, the proof view, the font-coverage check), and
  `render.py draft|lint` (proof is a `--proof` flag on `draft`).
- **Changed from the design:** balloons, sound effects and captions are kept inside the inner frame automatically, so
  the script needs no keep-clear areas yet; an item can carry a `ja` or `en` block to move or resize it in one edition
  only, because English balloons are wider. The script's shape is flatter than §5.3's sketch: items are one list per
  panel, each with a `kind`.
- **Bugs the tests caught while it was being built:** the loudspeaker's angular balloon clipped "PIER SEVEN" (corners
  spaced by direction bunched up at the ends of a long balloon); the print look's screentone gave every grey the same
  dots; and the English title was spaced "EMI 'S PROMI SE" until Latin letters stepped by their own widths.
- **Not built yet:** slanted gutters, bleed panels and insets; focus and speed lines; the ink-line conversion that
  keeps skin white; thought clouds, whispers and linked balloons; `cover.py`; `output.py` (PDF, booklet imposition,
  the Foundry pages); the `prompts` and `contact` commands; and the tests for images used twice and for GM-only words.

---

## 6. The first issue, as proposed

Everything in this section is Claude's proposal, made on 2026-09-26 at Ingram's instruction to finish the thinking and
deliver the cast sheets and page 1, rather than stop for the four questions in §8. Veto freely.

**Working title: 「エミのやくそく」, *Emi's Promise*.** The Directorate *is* a promise (LEDGER #25: the four agreed to
be there when it came again; "That is the Directorate"), and Scene 0 ends on somebody having to keep it. The comic ends
with Emi making her own. That is the institution asking its readers to inherit the promise, which is integration
propaganda in a single word (§4.5), and it is entirely sincere.

**The cast.** Design sheets and the fixed descriptions are in `design/propaganda-manga-prompts.md`.

- **Emi Hanamura (花村エミ), the recruit.** Bubbly, brave, clumsy, and the only one who is ever the joke. Short black
  bob with a springy cowlick, a star hairclip, big starry eyes, freckles and a grin. She wears the trainee kit from
  the opening's art (a work jacket with rolled sleeves over a white undershirt, a pale peaked cap, the chevron patch,
  cargo trousers and boots), brand new and perfectly fitted. **Written so she works either way:** as an invented
  mascot, or as a real recruit the players could one day meet.
- **Chief Instructor Kumagai (熊谷教官).** A gruff bear of a man with a walrus moustache, a whistle and a clipboard,
  kind underneath and never the punchline. He is the educational manga's guide who explains the job to a newcomer
  (§4.5); a careful reader may notice the questions nobody asks him.
- **The Frame.** The opening's own machine (R23: boxy riveted armour, chevrons on the shoulders and shins, one visor
  eye, construction-plant bones), freshly painted for the comic. Never graceful and never alive (§3.3, rule 4).

**The booklet, page by page** (right-bound; the map from §4.1):

| Booklet page | What's on it |
|---|---|
| 1 · front cover | Emi saluting in front of the Frame; the masthead and "free, take one"; black and vermilion |
| 2 · inside front | "Our Promise": the approved painting of the four founders (three tall, handsome men and one woman) over the approved history in one paragraph of mincho, which goes from nothing to catastrophe in a single sentence (LEDGER #27, #36) |
| 3 · manga page 1 | **Arrival.** Emi runs down to the harbour, reports at the gate at the top of her voice, crosses the base with Kumagai, and stops at the hangar doors as he opens them to meet her partner. *Rendered in both editions: see the prompts doc §2.* |
| 4–5 · manga pages 2–3, the centre spread | **The partner, and training.** The Frame revealed across the fold. Then a montage: the check-up ("fit as a fiddle!"), kit that fits perfectly, the classroom where Kumagai tells the legend (the approved faces again, as a textbook picture), and Emi's first clumsy steps in the cockpit. The hook: the call-out bell rings |
| 6 · manga page 4 | **The rescue.** A storm at the harbour; something heavy has trapped people (a fallen crane across a tram, or a boat pinned against the sea wall); Emi and the Frame lift it clear; the crowd cheers; at sunset she makes her promise, then turns to the reader: 「きみも、本部へ！」, *You too: join the Directorate!* |
| 7 · inside back | A letter from Emi in her own bubbly voice (ghostwritten, §3.2), the "Draw Emi yourself!" contest, and a coupon to post, with its fine print |
| 8 · back cover | The Frame drawn cut away, with numbered callouts (§4.6) |

**What it never shows:** the blood screen's result, anyone unusual-looking, an enemy, a real alarm, a graceful Frame,
anything alive in a machine, Gen 2, the Watcher, or the rift's cause (§3.3).

**Timing.** Page 1 carries only common knowledge (Scene 0) and the idealised welcome, so it is safe at any point from
The Road In onward. That leaves question 1 in §8 open without holding up the art.

---

## 7. How we'd make it together

The opening's method: one step at a time, front to back.

1. **Now: the cast sheets** (`design/propaganda-manga-prompts.md` §1). They double as the style test: Emi's
   turnaround is prompted in both looks, and the pick sets the style line for everything after. Every later prompt
   names the sheets to attach.
2. **Page 1's art** (the prompts doc §2). Five panels, each prompt carrying its panel's shape and saying where the
   empty space for the words goes.
3. **Two folders** (made 2026-09-26). The cast sheets Ingram keeps and attaches as references live in her own
   `artwork/manga/design-sheets/`; Claude reads them there and never moves them. Panel art and anything else for
   Claude goes into the in-tray, `artwork/manga/in-tray/`; Claude moves each file (never copies) into
   `artwork/manga/issue-01/art/`, renamed by prompt code, as with all in-tray art.
4. **The first slice of the tool, built on page 1** (done 2026-09-26, §5.6): layout, cropping, the print look, and
   lettering in both editions, rendered for review, with its tests. The art came back different from the script in
   places, so the words were rewritten to fit the pictures (the prompts doc §2 lists the changes); the pictures are
   never forced to fit the words.
5. **Walk forward:** the centre spread, page 4, then the cover and the three extra surfaces, a batch of prompts at a
   time.
6. **Finish.** A proof, a test print, the Foundry handout, the English edition read cold by someone who hasn't seen
   the script, and the Japanese edition checked by a fluent reader if one is available (§4.4).

---

## 8. Decisions

**Settled by Ingram, 2026-09-26:**

- **Midjourney parameters.** Prompts may carry `--ar`, `--no` and similar modifiers. No Niji, no version numbers, and
  no reference parameters in the prompt text, because she attaches references by hand.
- **Go straight to the work.** "Instead of creating a mock page just finish the thinking you need to do and give me
  two things": the cast sheets and page 1. The four questions below were not put to her, so §6's proposals stand as
  the working defaults until she says otherwise.

**Still open, with the default in use:**

1. **When the table first gets it.** Default: nothing in it goes beyond common knowledge, so it is safe from The Road
   In onward.
2. **Who Emi is in the world.** Default: written so she works as a mascot or as a real person.
3. **How old the issue is in the fiction.** Default: nothing in the pages dates it.
4. **How it looks.** Settled by eye on the first cast sheet (§4.9).
5. **The names and the title:** Emi Hanamura, Chief Instructor Kumagai and *Emi's Promise* are all proposals.

**Later, and not urgent:** the page size (layouts are drawn on A5, the size two folded A4 sheets make, which is B6's
shape); whether the English edition keeps right-to-left reading (proposed: yes); printed copies; and whether later
issues follow the players themselves, their own deeds tidied into approved faces the way the founders' were.

---

## 9. Files

- **This plan:** `design/propaganda-manga.md`. **The prompts and page scripts:** `design/propaganda-manga-prompts.md`.
- **The research shelf:** `design/research/manga/`, linted by `test/manga-research.test.mjs`.
- **The idea:** `ideas/entries/propaganda-manga.json`.
- **The script:** `data/manga/issue-01.json` (schema `data/schema/manga-issue.schema.json`). **The tool:**
  `tools/manga/` (README there), tested by `test/manga/`.
- **Ingram's cast sheets:** `artwork/manga/design-sheets/`. **Claude's in-tray:** `artwork/manga/in-tray/`, filed into
  `artwork/manga/issue-01/art/`. **Renders:** `artwork/manga/issue-01/renders/`. All gitignored, like all artwork.
- **The spikes** (scratch, not in the repo): `spike_vertical.py`, `spike_tone.py`, `spike_page.py` and their PNGs, in
  the 2026-09-26 session's scratchpad `spike/` folder.
