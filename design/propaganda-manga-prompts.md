# Propaganda Manga — prompts and page scripts

**Status: drafted, 2026-09-26.** The prompts and the page-by-page script for the Directorate's recruitment comic. The
plan is `design/propaganda-manga.md` (§6 has the cast and the outline); the research behind every choice is on the
shelf, `design/research/manga/`. Every name, line and design here is Claude's proposal until Ingram says otherwise.
**Batch 0 and page 1's art have come back** (§1 and §2 say what arrived and what changed); page 1 is lettered in both
editions in `data/manga/issue-01.json`, which from now on holds the words as lettered.

---

## How to use this sheet

- **Codes.** Every prompt has a code: `M1-C1` is issue 1, cast sheet 1; `M1-P1-K3` is issue 1, page 1, panel
  (*koma*) 3.
- **Two folders** (made 2026-09-26):
  - **`artwork/manga/design-sheets/`** is Ingram's own: the cast sheets she keeps and attaches as references, named
    by code (`M1-C1a.png`). Claude reads them there and never moves them.
  - **`artwork/manga/in-tray/`** is Claude's in-tray: panel art and anything else to work with. Name files by code
    (`M1-P1-K3.png`) if convenient; plain numbers in reading order work too. Claude moves each file into
    `artwork/manga/issue-01/art/` under its code (moved, never copied, as with all in-tray art).
- **Parameters** (Ingram, 2026-09-26): `--ar` and `--no` are welcome. **No Niji, no version number, and no reference
  parameters** in the prompt: attach references by hand. Each panel prompt below says which cast sheets to attach.
  If results come out painterly or over-styled, try adding `--style raw`.
- **Never in the picture:** lettering, balloons, sound effects, panel borders. Claude draws all of those, in both
  editions, so the prompts ask for clean art with empty space where the words will go. No prompt contains double
  quotation marks, which Midjourney would try to draw as text.
- **Generated wider than the panel.** Each `--ar` is a little wider (or taller) than the panel it fills, so the layout
  can re-crop without losing a head.
- **The standard no-list**, at the end of every panel prompt:
  `--no text, letters, words, labels, speech bubbles, captions, panel borders, multiple panels, color, signature, watermark`.
  The cast sheets leave out "multiple panels", since each sheet shows several views on purpose.

---

## The style anchor

Every prompt opens with one of two style lines. **The cast sheets test both** (§1): run `M1-C1a` and `M1-C1b`, pick
the look, and use that anchor for everything after. The prompts below are written with **look A**; for look B, swap
the first line.

- **Look A, period** (the plan's lean: *period bones*): `black and white manga illustration, vintage Japanese manga
  from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink
  linework with varied line weight, rounded expressive cartoon characters with big sparkling star-lit eyes, solid
  black shadows, flat grey tones, white paper`
- **Look B, modern polish:** `black and white manga illustration, retro 1960s designs drawn with crisp modern G-pen
  inking, fine varied line weight, expressive faces with big sparkling eyes, bold solid black shadows, flat grey
  tones, clean white paper`

Both ask for **flat grey tones, not screentone**: the dots are added later in code, at print resolution, so every
panel's tone matches (`design/research/manga/midjourney-and-the-print-look.md` §4).

---

## The cast: fixed descriptions

Paste these exact words wherever the character appears, so the prompt never drifts even when the reference sheet is
attached. Black and white has no hair colour to lean on, so each design carries a **silhouette signature** that
survives in ink.

- **Emi Hanamura (花村エミ), the recruit.** `a cheerful sturdy young woman with a short black bob, blunt bangs and one
  springy cowlick curling up from the crown, a small star-shaped hairclip above her left ear, big round sparkling
  eyes with star highlights, freckles, a wide open grin, wearing a crisp new work uniform: a work jacket with rolled
  sleeves over a white undershirt, a chevron-striped patch on the left upper sleeve, cargo trousers tucked into
  lace-up boots, and a pale peaked cap pushed back on her head`
  - *Silhouette signature:* the cowlick, the cap pushed back, the star clip.
  - *The uniform* is the trainee kit from the opening's art (R110: work jacket, rolled sleeves, white undershirt,
    pale cap, chevron patch, cargo trousers, boots), shown here brand new and perfectly fitted.
- **Chief Instructor Kumagai (熊谷教官).** `a towering broad-shouldered man in his fifties with a square jaw, a thick
  bristly walrus moustache, bushy eyebrows and small kind eyes shaded by the peak of his cap, a whistle on a cord
  around his neck, a clipboard under one arm, wearing a dark double-breasted work tunic with rolled sleeves and a
  chevron-striped patch, a wide belt and heavy work boots`
  - *Silhouette signature:* the size, the moustache, the whistle and clipboard.
- **The Frame (the utility machine).** `a four-storey riveted utility walking machine built from heavy construction
  plant, boxy pale armour plates with grey panels and rivets, bold black and white chevron hazard stripes on its
  shoulders and shins, a small armoured head with one round visor eye, a round cockpit hatch in the chest, exposed
  hydraulic pistons at the joints, big three-fingered grab claws, heavy flat feet, exhaust stacks on its back,
  freshly painted and spotless`
  - *It is the opening's machine* (R23: boxy white-and-grey riveted armour, orange-and-black chevrons, one visor eye),
    so attach `artwork/title-sequences/opening/art/R23-frame.png` beside its sheet.
  - *Never graceful and never alive.* The comic polishes the Frames; it never shows one moving gently or carefully,
    and never gives one a face that feels anything (plan §3.3, rule 4). "Partner" is a word the instructor uses, not
    a feeling the machine has.

---

## 1. Batch 0: the cast sheets

Run these first. They calibrate the style and become the references for every panel. Pick the best of each and save it
under its code.

**What came back (2026-09-26, in `artwork/manga/design-sheets/`):**

| File | From | Verdict |
|---|---|---|
| `Emi_01.png` | C1 | **The reference for Emi.** Five clean views, on model with every panel. |
| `Kumagai_01.png` | C4 | **The reference for Kumagai.** Five views, clipboard and whistle, on model. |
| `Frame_01_Reference.png` | C6 | **The reference for the Frame.** Three views with a person for scale. |
| `Emi_02.png` | C1 | A second Emi: older, longer hair, slimmer, a different face. Keep it out of the reference stack, or she drifts. |
| `Emi_Expressions.png` | C2 | Off model (a heavier bob, older faces), drawn with bare shoulders, and several faces read flirtatious rather than bubbly. Don't attach it; the comic's rule is nothing sexualised (plan §3.3). If an expression sheet is wanted, C2b below keeps her dressed. |

Not run yet, and not needed for page 1: C3 (Emi in motion), C5 (Kumagai's expressions), C7 (the Frame's details). C7
becomes useful for the cockpit panels in the centre spread.

### M1-C1a · Emi, turnaround, look A

```
character model sheet, black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework with varied line weight, the same young woman drawn four times standing side by side in a relaxed neutral pose, front view, three-quarter view, side profile and back view, full body from head to boots, identical proportions in every view, a cheerful sturdy young woman with a short black bob, blunt bangs and one springy cowlick curling up from the crown, a small star-shaped hairclip above her left ear, big round sparkling eyes with star highlights, freckles, a wide open grin, wearing a crisp new work uniform: a work jacket with rolled sleeves over a white undershirt, a chevron-striped patch on the left upper sleeve, cargo trousers tucked into lace-up boots, and a pale peaked cap pushed back on her head, flat grey tones, plain white background --ar 16:9 --no text, letters, words, labels, speech bubbles, captions, panel borders, color, signature, watermark
```

### M1-C1b · Emi, turnaround, look B

```
character model sheet, black and white manga illustration, retro 1960s designs drawn with crisp modern G-pen inking, fine varied line weight, the same young woman drawn four times standing side by side in a relaxed neutral pose, front view, three-quarter view, side profile and back view, full body from head to boots, identical proportions in every view, a cheerful sturdy young woman with a short black bob, blunt bangs and one springy cowlick curling up from the crown, a small star-shaped hairclip above her left ear, big round sparkling eyes with star highlights, freckles, a wide open grin, wearing a crisp new work uniform: a work jacket with rolled sleeves over a white undershirt, a chevron-striped patch on the left upper sleeve, cargo trousers tucked into lace-up boots, and a pale peaked cap pushed back on her head, flat grey tones, plain white background --ar 16:9 --no text, letters, words, labels, speech bubbles, captions, panel borders, color, signature, watermark
```

### M1-C2 · Emi, expressions (attach C1)

```
character expression sheet, black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework, the same young woman's head and shoulders drawn twelve times in a neat grid of twelve different expressions: huge grin, laughing with eyes shut, star-eyed wonder, fierce determination, embarrassed blush, happy tears, pouting, wide-eyed shock, sheepish grin with a sweat drop, cheeky wink, sleepy yawn, shouting with joy, a young woman with a short black bob, blunt bangs and one springy cowlick curling up from the crown, a small star-shaped hairclip above her left ear, big round sparkling eyes with star highlights, freckles, a pale peaked cap pushed back on her head, identical face in every drawing, flat grey tones, plain white background --ar 3:2 --no text, letters, words, labels, speech bubbles, captions, panel borders, color, signature, watermark
```

### M1-C2b · Emi, expressions, dressed (attach Emi_01; optional)

Only if a sheet of faces would help; the panels so far kept her face without one.

```
character expression sheet, black and white manga illustration, clean confident ink linework, the same cheerful young woman drawn as ten head-and-shoulders portraits in a neat grid, each wearing her work jacket over a white crew-neck undershirt and a pale peaked cap pushed back on her head: huge grin, laughing with eyes shut, star-eyed wonder, fierce determination, embarrassed blush with a sweat drop, happy tears, pouting, wide-eyed shock, sheepish grin, shouting with joy, a short black bob, blunt bangs and one springy cowlick curling up from the crown, a small star-shaped hairclip above her left ear, big round sparkling eyes with star highlights, freckles, a round friendly face, identical face in every drawing, flat grey tones, plain white background --ar 3:2 --no text, letters, words, labels, speech bubbles, captions, panel borders, color, signature, watermark, bare shoulders
```

### M1-C3 · Emi, in motion (attach C1)

```
character action sheet, black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework, the same young woman in five full-body poses side by side: sprinting with an envelope held high, snapping a salute, climbing a steel ladder, tripping over her own boots, cheering with both fists in the air, a cheerful sturdy young woman with a short black bob, blunt bangs and one springy cowlick curling up from the crown, a small star-shaped hairclip, big round sparkling eyes, freckles, a crisp new work uniform with a work jacket with rolled sleeves, a chevron-striped patch on the left upper sleeve, cargo trousers tucked into lace-up boots, and a pale peaked cap pushed back on her head, flat grey tones, plain white background --ar 16:9 --no text, letters, words, labels, speech bubbles, captions, panel borders, color, signature, watermark
```

### M1-C4 · Chief Instructor Kumagai, turnaround

```
character model sheet, black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework with varied line weight, the same man drawn four times standing side by side, front view, three-quarter view, side profile and back view, full body, identical proportions in every view, a towering broad-shouldered man in his fifties with a square jaw, a thick bristly walrus moustache, bushy eyebrows and small kind eyes shaded by the peak of his cap, a whistle on a cord around his neck, a clipboard under one arm, wearing a dark double-breasted work tunic with rolled sleeves and a chevron-striped patch, a wide belt and heavy work boots, flat grey tones, plain white background --ar 16:9 --no text, letters, words, labels, speech bubbles, captions, panel borders, color, signature, watermark
```

### M1-C5 · Kumagai, expressions (attach C4)

```
character expression sheet, black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework, the same man's head and shoulders drawn six times in a row: stern, deadpan stare, exasperated sigh, bellowing an order, a rare small proud smile half hidden under his moustache, a big warm laugh, a towering man in his fifties with a square jaw, a thick bristly walrus moustache, bushy eyebrows, small kind eyes shaded by the peak of his cap, a whistle on a cord around his neck, dark double-breasted work tunic, identical face in every drawing, flat grey tones, plain white background --ar 2:1 --no text, letters, words, labels, speech bubbles, captions, panel borders, color, signature, watermark
```

### M1-C6 · The Frame, turnaround (attach R23-frame.png)

```
mecha model sheet, black and white manga illustration, vintage Japanese giant robot manga from the early 1960s in the style of Mitsuteru Yokoyama, clean confident ink linework with varied line weight, the same giant machine drawn four times side by side, front view, three-quarter view, side view and back view, full figure, with one small human figure standing at its feet for scale, a four-storey riveted utility walking machine built from heavy construction plant, boxy pale armour plates with grey panels and rivets, bold black and white chevron hazard stripes on its shoulders and shins, a small armoured head with one round visor eye, a round cockpit hatch in the chest, exposed hydraulic pistons at the joints, big three-fingered grab claws, heavy flat feet, exhaust stacks on its back, freshly painted and spotless, flat grey tones, plain white background --ar 16:9 --no text, letters, words, labels, speech bubbles, captions, panel borders, color, signature, watermark
```

### M1-C7 · The Frame, details (attach C6)

```
mecha detail sheet, black and white manga illustration, vintage Japanese giant robot manga from the early 1960s in the style of Mitsuteru Yokoyama, clean confident ink linework, five close-up studies of the same riveted utility walking machine arranged on one sheet: its small armoured head with one round visor eye, its round cockpit hatch swung open showing a padded seat and brass control levers, one big three-fingered grab claw, one heavy flat foot with hydraulic ankle pistons, a riveted shoulder plate with bold black and white chevron stripes, freshly painted and spotless, flat grey tones, plain white background --ar 16:9 --no text, letters, words, labels, speech bubbles, captions, panel borders, color, signature, watermark
```

---

## 2. Page 1 (manga page 1; booklet page 3)

**What happens.** Emi runs down to the harbour with her acceptance letter, reports at the gate at the top of her voice,
is walked across the base by her instructor, and stops at the hangar doors as he opens them to meet her partner. The
page turn reveals the Frame across the centre spread.

**As lettered (2026-09-26).** The art came back different from this script in places, and the words were changed to
fit the pictures, never the other way round. The words tables under each panel below are the original script, kept as
the record of what Midjourney was asked for; **the words as lettered are these, and `data/manga/issue-01.json`**.
Renders: `artwork/manga/issue-01/renders/issue-01-p1-ja.png` and `-en.png`.

| Panel | What the art gave | Japanese, as lettered | English, as lettered |
|---|---|---|---|
| K1 | As asked. | Title エミのやくそく; hype line 元気いっぱい！新人隊員エミの、はじめての一日！; caption 港町・黒瀬。; Emi (burst) いま行くよーっ！！; タッタッタッ | EMI'S PROMISE; FULL OF PEP! RECRUIT EMI'S VERY FIRST DAY!; KUROSE, A HARBOUR CITY.; HERE I COME!!; gloss TAP TAP TAP |
| K2 | She salutes with the correct hand, so the wrong-hand gag is gone. Little sky, so one balloon. | Emi 花村エミ、入隊します！！; ビシッ | EMI HANAMURA, REPORTING FOR DUTY!!; gloss SNAP! |
| K3 | Kumagai looks away over her head; she salutes, sweating. The new joke: she shouted. | Kumagai ……聞こえる。; Emi (wobbly) あっ、はい！ | …I CAN HEAR YOU.; OH! YES, SIR! |
| K4 | As asked, less busy: two Frames, the loudspeaker, the tower with a blank banner. | Kumagai ここが本部だ。; Emi すごい……！; loudspeaker (angular) 第三作業班、七番埠頭へ。; banner 掘削工事中 | THIS IS HQ.; WOW…!; WORK CREW THREE TO PIER SEVEN.; gloss EXCAVATION WORKS |
| K5 | Too narrow for two balloons. | Kumagai きみの相棒だ。; Emi's ？; ギギギ | MEET YOUR PARTNER.; ？; gloss CREAAK |

**One panel to redo:** K2. Emi and the queue fill the frame's height, so the tall Japanese balloon covers the faces
of the recruits behind her (the English one just fits). **M1-P1-K2b** below asks for the same picture pulled back,
with open sky above the queue.

**Where it sits.** A left-hand page, facing the inside front cover. The spine is on its right, so nothing important
goes in the right-hand margin. Its last panel (bottom left) is the first page-turn hook.

**Layout** (A5 print; the inner frame is 122 × 180 mm; read right to left, top to bottom):

| Tier | Right panel (read first) | Left panel | Height |
|---|---|---|---|
| 1 | **K1**, the title panel, full width, 122 × 75 mm | — | 75 mm |
| 2 | **K2**, the gate, 63.5 × 46 mm | **K3**, "I can hear you", 56 × 46 mm | 46 mm |
| 3 | **K4**, the yard, 79.5 × 49 mm | **K5**, the doors (the hook), 40 × 49 mm | 49 mm |

Gaps of 2.5 mm between panels side by side and 5 mm between tiers; frame lines 0.55 mm. The two vertical gaps sit
16 mm apart, so the eye never runs straight down them (`page-craft-and-print.md`, reading-order rule 11). The hook
panel is the page's smallest, as page-turn craft asks. (K2 and K3 were re-cut from 67.5 and 52 mm to fit the art.)

**Page furniture** (lettered by Claude): the page number 3 at the bottom outer corner; in the outer margin, a small
vertical line of editor's copy, 「★本部では、きみのような新人隊員をぼしゅうしています！」 (*"★The Directorate is
looking for new recruits just like you!"*).

**Lettering notes.** Every kanji carries furigana in the Japanese edition, as a youth magazine's would. People speak in
oval balloons; the loudspeaker speaks in the angular one Japanese lettering keeps for cold, bureaucratic voices. The
English edition is set in capitals; sound effects stay in Japanese with a small English subtitle.

### M1-P1-K1 · The title panel

**What we see.** A sunny morning above Kurose. Emi sprints down a steep street toward us, waving her acceptance letter
over her head, grinning. Below and behind her the harbour opens out: warehouses, cranes, a tram, gulls, and a Frame on
the docks lifting a crate. A big sky fills the top half for the title.

**Words:**

| | Japanese | English |
|---|---|---|
| Title (logo) | エミのやくそく | EMI'S PROMISE |
| Hype line (vertical, beside the title) | 元気いっぱい！新人隊員エミの、はじめての一日！ | Full of pep! Recruit Emi's very first day! |
| Caption (mincho, the institution's voice) | 港町・黒瀬。 | Kurose, a harbour city. |
| Emi, burst balloon | いま行くよーっ、本部ーっ！！ | Here I come, Directorate!! |
| Sound effect, by her feet | タッタッタッ | TAP TAP TAP |

**GM note.** Kurose is spotless and sunny, and the Frame lifts its crate cleanly, freshly painted, with no patches. The
real ones are patched and loud, and one of them in Scene 0 is trying to step over a tram and not quite managing it.

**Attach:** C1 (Emi), C6 (the Frame).

```
black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework with varied line weight, rounded expressive cartoon characters with big sparkling star-lit eyes, solid black shadows, flat grey tones, white paper, a sunny morning in a harbour city seen from the top of a steep street, a cheerful sturdy young woman with a short black bob, blunt bangs and one springy cowlick curling up from the crown, a small star-shaped hairclip above her left ear, big round sparkling eyes with star highlights, freckles, a wide open grin, wearing a crisp new work jacket with rolled sleeves over a white undershirt, a chevron-striped patch on the left upper sleeve, cargo trousers tucked into lace-up boots and a pale peaked cap pushed back on her head, sprinting down the street toward the viewer in the left half of the frame, waving an envelope high over her head, and behind and below her the harbour spreads out with warehouses, cranes, a tram on its rails, gulls, and a four-storey riveted utility walking machine with chevron-striped shoulders lifting a cargo crate on the docks, a wide bright empty sky filling the upper half, slightly low camera angle --ar 16:9 --no text, letters, words, labels, speech bubbles, captions, panel borders, multiple panels, color, signature, watermark
```

### M1-P1-K2 · The gate

**What we see.** The Directorate's main gate: tall riveted gateposts, the watchtower seal on the gate, a striped
barrier arm, a guard hut. Emi stands to attention in the right half of the panel, beaming, saluting with the wrong
(left) hand, the letter tucked under her other arm. Behind her, a short queue of cheerful new recruits with suitcases.
Clear sky above her for her two balloons.

**Words:**

| | Japanese | English |
|---|---|---|
| Emi | 花村エミ、本日付で入隊します！ | Emi Hanamura, reporting for duty as of today! |
| Emi, linked balloon | よろしくおねがいしまーす！！ | Pleased to meet you allll!! |
| Sound effect, the salute | ビシッ | SNAP |

**GM note.** Everyone in the queue is cheerful, and everyone is an ordinary-looking human: nobody unusual-looking
anywhere in the service. That is the glamour policy (Scene 0: some call it good manners, some say it's a city asking
people to hide), and it is the "everyone's joining" pitch.

**Production note.** If Midjourney gives her the correct (right) hand, the panel is mirrored; nothing in it reads
left to right, because all the lettering is added afterwards.

**Attach:** C1, C3 (the salute pose).

```
black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework with varied line weight, rounded expressive cartoon characters with big sparkling star-lit eyes, solid black shadows, flat grey tones, white paper, the main gate of a big harbour base on a bright morning, tall riveted gateposts, an emblem of a watchtower on a rocky island ringed by gear teeth fixed to the gate, a striped barrier arm and a small guard hut, a cheerful sturdy young woman with a short black bob, blunt bangs and one springy cowlick, a small star-shaped hairclip, big round sparkling eyes, freckles, a crisp new work jacket with rolled sleeves, a chevron-striped patch on the left upper sleeve, cargo trousers tucked into lace-up boots and a pale peaked cap pushed back on her head, standing to attention in the right half of the frame with a huge grin, saluting with her left hand, an envelope tucked under her right arm, behind her a short queue of other cheerful new recruits carrying suitcases, clear empty sky above her head in the upper right --ar 16:9 --no text, letters, words, labels, speech bubbles, captions, panel borders, multiple panels, color, signature, watermark
```

### M1-P1-K2b · The gate, pulled back (requested 2026-09-26)

**What we see.** The same gate and queue, seen from a little further back and lower down, so Emi and the queue fill
only the lower half of the frame, with a wide empty sky above the queue for Emi's tall Japanese balloon. She salutes
with her right hand (the joke moved to K3).

**Attach:** Emi_01, and the old K2 (`artwork/manga/issue-01/art/M1-P1-K2.png`) if Midjourney should keep its gate.

```
black and white manga illustration, clean confident ink linework with varied line weight, expressive faces with big sparkling eyes, solid black shadows, flat grey tones, white paper, the main gate of a big harbour base on a bright morning seen from a little further back and slightly low, tall riveted gateposts, an emblem of a watchtower on a rocky island ringed by gear teeth fixed to the gate, a striped barrier arm and a small guard hut on the left, a cheerful sturdy young woman with a short black bob, blunt bangs and one springy cowlick, a small star-shaped hairclip, big round sparkling eyes, freckles, a crisp new work jacket with rolled sleeves, a chevron-striped patch on the left upper sleeve, cargo trousers tucked into lace-up boots and a pale peaked cap pushed back on her head, standing to attention just right of centre with a huge grin, saluting smartly, and a short queue of cheerful new recruits with suitcases stretching away behind her to the right, all the figures small in the lower half of the frame, a wide clear empty sky filling the whole upper right above the queue --ar 3:2 --no text, letters, words, labels, speech bubbles, captions, panel borders, multiple panels, color, signature, watermark
```

### M1-P1-K3 · Wrong hand (lettered as "I can hear you")

**What we see.** Kumagai fills the right side of the panel, arms folded, looking down at Emi with a deadpan stare, his
eyes shaded by his cap. Small in the lower left, Emi freezes mid-salute, sweating, blushing.

**Words:**

| | Japanese | English |
|---|---|---|
| Kumagai | ……手が逆だ。 | …Wrong hand. |
| Emi, small wobbly balloon | あっ。 | Oh. |
| Sound effect, by her cheeks | カァーッ | FLUSH |

**GM note.** The joke is on Emi, and only ever on Emi. The instructor, the machines and the institution are never the
punchline anywhere in the comic, which a careful reader can notice (`propaganda-and-unreliable-documents.md`: real
institutions allow jokes only while they are not the butt).

**Attach:** C4 (Kumagai), C1.

```
black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework with varied line weight, rounded expressive cartoon characters, solid black shadows, flat grey tones, white paper, comic contrast of size, a towering broad-shouldered man in his fifties with a square jaw, a thick bristly walrus moustache, bushy eyebrows and small kind eyes shaded by the peak of his cap, a whistle on a cord around his neck, wearing a dark double-breasted work tunic with rolled sleeves, filling the right side of the frame with his arms folded, looking down with a deadpan stare, and small in the lower left a cheerful young woman with a short black bob, one springy cowlick, a small star-shaped hairclip, big round eyes and freckles, in a crisp new work jacket and a pale peaked cap pushed back, frozen mid-salute with her left hand, sweating and blushing with embarrassment, a simple background of riveted gateposts, empty space above his head at the top right --ar 4:3 --no text, letters, words, labels, speech bubbles, captions, panel borders, multiple panels, color, signature, watermark
```

### M1-P1-K4 · The yard

**What we see.** A busy base yard. Kumagai strides in from the right; Emi trots beside him in the centre, gazing about
with star-struck eyes. Behind them two Frames carry steel girders and mechanics wave from scaffolding. A loudspeaker horn
on a tall pole stands at the far left. Far off, a tall lattice excavation tower with a big blank banner.

**Words** (read in this order: Kumagai, Emi, the loudspeaker):

| | Japanese | English |
|---|---|---|
| Kumagai | ここが本部だ。黒瀬の町を、毎日ささえている。 | This is the Directorate. It keeps Kurose standing, every single day. |
| Emi | わぁ……！ | Wowww…! |
| Loudspeaker, angular balloon | 第三作業班、七番埠頭へ。くりかえす、第三作業班—— | Work Crew Three to Pier Seven. Repeat, Work Crew Three— |
| Sound effect, the Frames' footsteps | ズシン　ズシン | THOOM THOOM |
| Banner on the tower (lettered) | 掘削工事中　黒瀬のあしたを掘りおこそう！ | Excavation works: let's dig up Kurose's tomorrow! |

**GM note.** Kumagai's line is the Deputy Director's own ("the Directorate exists to keep this city standing",
Assembly), said warmly. The loudspeaker's shape is the institution's voice. The banner is the dig as proud public
works; it pays off in Chapter 8. Cut the banner if you'd rather the comic not touch the dig yet. Nothing here goes
beyond common knowledge: the Assembly speech says the dig came first, and that it is on the municipal seal.

**Attach:** C4, C1, C6.

```
black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework with varied line weight, rounded expressive cartoon characters with big sparkling star-lit eyes, solid black shadows, flat grey tones, white paper, wide shot of a busy harbour base yard on a sunny day, a towering broad-shouldered man in his fifties with a thick bristly walrus moustache, a whistle on a cord and a clipboard, in a dark double-breasted work tunic, striding forward on the right, and beside him in the centre a cheerful young woman with a short black bob, one springy cowlick, a small star-shaped hairclip, freckles and a pale peaked cap pushed back, in a crisp new work jacket with rolled sleeves and cargo trousers, trotting along and gazing around with star-struck sparkling eyes, behind them two four-storey riveted utility walking machines with chevron-striped shoulders carrying long steel girders, mechanics waving from scaffolding, a loudspeaker horn on a tall pole at the far left, and far in the distance a tall lattice excavation tower with a large blank banner hanging on it, clear sky across the upper third --ar 2:1 --no text, letters, words, labels, speech bubbles, captions, panel borders, multiple panels, color, signature, watermark
```

### M1-P1-K5 · The doors (the hook)

**What we see.** Enormous riveted hangar doors tower over Kumagai, who has one big hand on the door lever and glances
back over his shoulder with the hint of a smile under his moustache. Emi stands beside him looking up, wide-eyed. The
doors have just begun to part: a bright vertical slit of light spills across both of them.

**Words:**

| | Japanese | English |
|---|---|---|
| Kumagai | さて。きみの相棒に、会わせてやろう。 | Now, then. Time you met your partner. |
| Emi | あ……あいぼう？ | My… partner? |
| Sound effect, the doors | ギギギ…… | CREEEAK… |

**GM note.** The hangar has no number. It is never Hangar Four, where the tarp is. The page turn lands on the centre
spread, where the Frame is revealed across the fold.

**Attach:** C4, C1.

```
black and white manga illustration, vintage Japanese manga from the early 1960s in the style of Osamu Tezuka and Mitsuteru Yokoyama, clean confident brush-and-pen ink linework with varied line weight, rounded expressive cartoon characters with big sparkling star-lit eyes, dramatic solid black shadows, flat grey tones, white paper, enormous riveted hangar doors towering over two small figures, a broad-shouldered man in his fifties with a thick bristly walrus moustache and a peaked cap, in a dark double-breasted work tunic, one big hand on a heavy door lever, glancing back over his shoulder with the hint of a smile, and beside him a young woman with a short black bob, one springy cowlick, a small star-shaped hairclip and a pale peaked cap pushed back, looking up at the doors wide-eyed, the great doors just beginning to part, a bright vertical slit of light spilling through the gap across both of them, the rest in deep shadow --ar 2:3 --no text, letters, words, labels, speech bubbles, captions, panel borders, multiple panels, color, signature, watermark
```

**Readings** for the furigana on page 1: 港町 みなとまち · 黒瀬 くろせ · 元気 げんき · 新人 しんじん · 隊員 たいいん ·
一日 いちにち · 行く いく · 本部 ほんぶ · 花村 はなむら · 本日付 ほんじつづけ · 入隊 にゅうたい · 手 て · 逆 ぎゃく ·
町 まち · 毎日 まいにち · 聞こえる きこえる · 第三 だいさん · 作業班 さぎょうはん · 七番 ななばん · 埠頭 ふとう · 掘削工事中
くっさくこうじちゅう · 掘り ほり · 相棒 あいぼう · 会わせて あわせて · 新人隊員 しんじんたいいん.
