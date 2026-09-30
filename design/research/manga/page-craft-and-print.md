# Page craft and print production

*Part of the [manga research shelf](README.md), gathered 2026-09-26 for [`design/propaganda-manga.md`](../../propaganda-manga.md). **Research, not lore, and not a decision:** it says what the sources say and what might transfer, and the plan decides. Every factual claim links its source; **(unverified)** marks what could not be confirmed and **(derived)** marks arithmetic from cited figures. It names real works, people and places because it is GM-facing; none of them belongs in the comic.*

This report collects the facts a program needs to lay out a cover plus up to four manga pages in an 8-page saddle-stitched booklet, in two editions: Japanese (read right to left, 右綴じ) and English.

Conventions used throughout:

- **B4 scale** means measurements on professional B4 manuscript paper.
- **Side gutter** is the gap between panels within one tier (左右の間隔). **Tier gutter** is the gap between tiers (上下の間隔).
- **(derived)** marks my own arithmetic from cited figures.
- **(unverified)** marks an inference, or a claim I could not confirm from a page I fetched.
- **"search summary"** means the page blocked direct fetching, so I relied on the search engine's summary of it.

---

## 1. Manuscript standards

### 1.1 The two standard manuscript papers

| | B4 投稿用 (professional/submission) | A4 同人誌用 (self-published) |
|---|---|---|
| Sheet | B4, 257 × 364 mm ([CSP tips][csp7706]) | A4, 210 × 297 mm |
| 仕上がり線 / タチキリ枠 (trim) | 220 × 310 mm | 182 × 257 mm (= JIS B5) |
| 基本枠 / 内枠 (inner frame; printers call it 版面) | 180 × 270 mm | 150 × 220 mm |
| Bleed (裁ち落とし / 塗り足し) | Art past 240 × 330 mm ([Kanazawa][kanazawa]); CSP's commercial preset uses 5 mm ([CSP][csp7706]); one CSP answer says 1–2 cm past trim ([CSP ASK][cspask-hanzura]) | 3 or 5 mm depending on the printer ([CSP][csp733]) |
| Usually printed at | about 83 % for B5 magazines ([Kanazawa][kanazawa]) | 100 % for B5 books |

Sources for the frame sizes: [Hamano Manga Club][hamano] and Deleter's retail listing ([Sekaido][sekaido]). 版面 is defined as a synonym for 基本枠 in the same [CSP ASK][cspask-hanzura] answer. That answer also quotes slightly different A4 figures (150 × 224 inner, 179 × 257 trim), so manufacturers vary by a few millimetres. The paper also carries crop marks (トンボ), including centre marks ([BOOK LINER guide][bookliner]).

Placement rules:

- **Balloons and dialogue always stay inside the inner frame.** Art may run from the inner frame out to the trim; anything beyond the trim is cut off ([Hamano][hamano]; [Terastorys][terastorys-use]).
- **Essential elements stay at least 5 mm inside the trim** ([Kanazawa][kanazawa]).
- **ノド, the binding-side margin, stays blank except in spreads.** On odd pages that is the right margin; on even pages, the left ([Hamano][hamano]).
- **Even in a spread, keep faces and dialogue away from the centre fold.** The inner-frame limit still applies on the binding side ([Karin's Mound][karin]).
- **Page numbers (ノンブル) go on every page, within 1 cm of the inner frame** ([Kanazawa][kanazawa]).
- **Margins, if the frame is centred:** 20 mm all round on B4; about 16 mm at the sides and 18.5 mm top and bottom on A4 (derived).

### 1.2 How manuscripts map to printed sizes

Kanazawa Printing's reduction table ([Kanazawa][kanazawa]):

| Finished size | From a doujin B5 master | From a B4 submission master |
|---|---|---|
| A4 | 116 % | 95 % |
| B5 | 100 % | 83 % |
| A5 | 82 % | 67 % |
| B6 | 72 % | 58 % |

- **A5 and B6.** A5 is 148 × 210 mm and B6 is 128 × 182 mm ([Wikipedia: Tankōbon][wp-tankobon]).
- **B5.** Wikipedia's "B5 176 × 250" is the ISO size. Japanese printing uses JIS B5, 182 × 257 mm, which is the doujin trim above.
- **新書判 comics.** The nominal B40 size is 103 × 182 mm, but comic lines run 113 × 177 (Shueisha), 116 × 173 (Kodansha) and 113 × 176 (Shogakukan) ([JA Wikipedia: 新書判][jawp-shinsho]).
- **Proportions.** The B4 trim, 220 × 310 mm, is 1 : 1.41, which is √2. It therefore scales cleanly to A and JIS-B sizes: its inner frame lands at about 149 × 224 mm on a B5 page. 新書判 pages, at about 1 : 1.57, need the frame refitting rather than simple scaling (derived).

### 1.3 Clip Studio Paint presets

- **The New (Comic) dialog** ([CSP manual][csp-manual]) offers:
  - bleed of 3 or 5 mm;
  - monochrome at 600 or 1200 dpi, and colour or grey at 350 or 600 dpi;
  - base colour of colour, grey or monochrome;
  - facing pages set up as spreads;
  - left (左綴じ) or right (右綴じ) binding.
- **For a magazine submission,** the official tutorial uses the preset "商業誌用 断ち落とし5mm モノクロ(600dpi)" on B4 paper and enters 180 × 270 mm, which it says matches most publishers. It treats 5 mm bleed as standard and recommends at least 600 dpi ([CSP tips][csp7706]).
- **For doujinshi,** A4 paper produces a B5 book, and the bleed follows the printer ([CSP tips][csp733]).

### 1.4 Resolution norms, and why

- **Printer specification:**
  - monochrome 2-level: 600 or 1200 dpi;
  - greyscale: 600 dpi;
  - colour: 350 or 400 dpi;
  - files flattened, as PSD or TIFF.

  Source: [Taiyou Shuppan][taiyou-csp]. CSP's own guide calls 1200 dpi heavy and rarely used ([CSP moiré guide][csp-moire]).
- **Why 600 dpi is enough.** In theory 600 dpi carries about 300 lines and 1200 dpi about 600. In practice commercial print tops out near 60 lines at 600 dpi, and 85–133 lines at 1200 dpi depending on the output, because ink spread closes up fine dots on magazine paper ([CSP ASK][cspask-1200]).
- **Anti-aliasing is the biggest cause of moiré.** The grey edge pixels it creates cannot survive conversion to two levels ([Taiyou][taiyou-moire]).
- **Resampling a screened image causes moiré.** It rounds the dot positions, which prints stray white or black lines ([Taiyou glossary][taiyou-vocab]).
- **Grey levels per halftone cell.** A cell is dpi ÷ lpi pixels wide. At 600 dpi and 60 lpi that is 10 × 10 px, giving 101 grey levels; at 1200 dpi, 20 × 20 px, giving 401 levels. This is the numeric case for 1200-dpi 1-bit output (derived).
- **Colour at 350 dpi** is usually explained as about twice a 175-lpi screen (unverified rule of thumb). For comparison, offset printing runs at 85 lpi on newsprint and 85–185 lpi on coated paper, and a 600-dpi laser printer manages 85–105 lpi ([Wikipedia: Halftone][wp-halftone]).

---

## 2. Panel layout (コマ割り)

### 2.1 Order and density

- **Reading order.** Panels read right to left, then top to bottom ([Shogakukan][shogakukan]). Each page runs from top right to bottom left ([Hanasakichu][hanasakichu-order]).
- **Basic forms.** The standard forms are 3-tier and 4-tier pages, around a Japanese average of 6 panels per page ([Ichi-up][ichiup16]).
- **Panel counts.**
  - *Weekly Shōnen Jump* averages 6 panels and about 10 balloons per page; most artists use 5–7 panels ([MANZEMI][manzemi416]).
  - Shogakukan's course for new artists says 8 panels at most, with about 5 comfortable ([Shogakukan][shogakukan]).
  - One school says 6–7 at most, and calls 9 or more congested ([Art School Osaka][artschool-creie]).
- **Density over time.** Tezuka rose from 3.5 panels per page in 1947 to 7.25 in 1983; one gekiga series fell from 5.6 to 2.8 ([MANZEMI][manzemi416]).
- **Shōjo layouts** nest panels in ways a row/column model cannot represent ([Cao 2012][cao2012]).

### 2.2 Gutters and line weights (manuscript scale, mostly B4)

| Source | Side gutter | Tier gutter | Frame line |
|---|---|---|---|
| [Shogakukan][shogakukan] | 4–6 mm | 8–10 mm | — |
| [Hamano][hamano] | 2–4 mm | 5–8 mm (about 2× the side gutter) | 0.8–1.0 mm |
| [Hanasakichu][hanasakichu-gutter] | 3 mm | 5 mm | 1 mm (balloons 0.3 mm) |
| [CSP support answer][csp-forum-gutter] | 2–4 mm | 5–10 mm | 0.6–0.8 mm |

- **Why the two gutters differ.** A narrow side gutter paired with a wide tier gutter reads more easily and gives the page contrast ([Hanasakichu][hanasakichu-gutter]). Narrowing a gap steers the eye ([Shogakukan][shogakukan]).
- **The experimental basis.** Readers group panels by proximity, and wider gutters are crossed less often ([Cohn & Campbell 2015][cohn2015]). A tier gutter about twice the side gutter therefore makes each tier read as one unit (unverified inference).
- **A deliberate exception.** Wide side gutters with narrow tier gutters can signal simultaneous action in different places ([Haru-buro][haruburo]).
- **Frame lines are heavier than balloon outlines** ([Hanasakichu][hanasakichu-gutter]).

### 2.3 Slants, bleeds, insets and spreads

- **Slants.**
  - A calm page (静) keeps horizontal lines at 0° and vertical lines at 90°; slanting only the verticals still reads as calm.
  - Slanting both suits action, entrances and climaxes.
  - Overused irregular or overlapping panels bury the focal point and confuse the reading order ([Ichi-up][ichiup27]).
  - Subjects placed off-centre or on a diagonal signal fast action ([Cao 2014][cao2014]).
- **Bleed panels (断ち切り).** Manga uses more vertical segments and more bleeding panels than European or US comics ([VLL][vll-cultural]). Balloons still stay inside the inner frame ([Hamano][hamano]).
- **Insets.** 60 % of readers read the containing panel first ([Cohn 2013][cohn2013]).
- **Spreads (見開き).**
  - A spread is the two facing pages ([Tombo Studio][tttombo-mihiraki]). In a right-bound book it is an even (right) page plus the next odd (left) page (derived).
  - Keep faces and text off the fold ([Karin's Mound][karin]).
  - Offset the tier gutters of facing pages, or readers will read straight across the spread ([Ichi-up][ichiup16]).

### 2.4 The page turn (めくり / 引き)

- **The terms.** The last panel before a turn is the 引き (hook). The first panel after it is the 受け (payoff). Together they make the めくり (page-turn) effect ([MANGA AGENCY][mangaagency]).
- **The sizing rule.** Keep the hook small and make the payoff large; the contrast feels like a release. Debuts and climaxes belong on page turns ([Ichi-up][ichiup27]; [STOTUKU][stotuku]).
- **Page sides.** Manga normally starts on a left page (片起こし), with odd pages on the left. The exception is a chapter that opens on a spread (見開き始まり) ([Chiebukuro][chiebukuro-left], search summary; consistent with [Hamano][hamano]'s ノド rule).
- **So in this booklet,** every hook is the bottom-left panel of an odd page, and every payoff is the top-right panel of the next even page (derived).

### 2.5 ネーム (the storyboard)

- **Format.** Draw on one side of the paper, in spreads, with about 1 cm of margin and the page number at the bottom centre ([MANZEMI][manzemi407]).
- **Revision.** Revise with sticky notes or by cutting and pasting ([MANZEMI][manzemi407]).
- **What an editor needs.** Frames, balloons and dialogue are enough for an editor to review ([MANZEMI][manzemi407]).
- **The usual order of stages** is plot, ネーム, pencils, inks, finishing (unverified).

### 2.6 Pause (間), shots and directing the eye

- **Pause.** A single wordless panel gives the reader time to feel the moment. Many small panels slow time down; large ones speed it up ([Art School Osaka][artschool-creie]).
- **Showing time passing** ([Haru-buro][haruburo]):
  - 2–3 diagonal hatch lines at the right edge of a panel mean minutes to hours;
  - 1–3 shrinking empty panels mark a gap in time;
  - put time-skip panels at the top right of a page.
- **Shot types.** Cao et al. label shots as long, medium, close-up and big close-up, and motion as slow, medium or fast. Close-ups fill the panel; long shots in wide panels spread horizontally ([Cao 2014][cao2014]).
- **How manga frames shots.**
  - US comics frame whole scenes more often. Manga individuates: more single characters (Mono), more parts of characters (Micro), and more panels with no character at all (Amorphic) ([VLL][vll-framing]; [PubMed][framing-pubmed]). The category names are paraphrased and unverified.
  - For this booklet that suggests setting-only panels as establishing and pause beats, and single-character close-ups for reactions (unverified).
- **Directing the eye.**
  - Subjects and balloons act as road signs along a path from the top-right corner to the bottom-left ([Cao 2014][cao2014]).
  - Punches travelling right to left feel fast; punches travelling left to right feel heavy. Solid black (ベタ) hits hardest ([MANGA AGENCY][mangaagency]).
  - When the layout is ambiguous, where the text sits decides the reading path ([Kirtley et al. 2023][kirtley2023]).

### 2.7 Common reading-order failures

1. **Vertical gutters that line up across tiers.** Readers cannot tell whether to go across or down ([Ichi-up][ichiup16]).
2. **A plain 2 × 2 grid.** It was once used for 4-koma; the vertical strip is standard now ([JA Wikipedia: 4コマ][jawp-4koma]).
3. **A half-way stagger beside a tall panel.** Only about 30 % of readers followed the tier ([Cohn & Campbell][cohn2015]).
4. **Tier gutters that line up across a spread** ([Ichi-up][ichiup16]).
5. **Balloons in panels 1 and 4 placed so close that readers skip panel 2** ([Cao 2014][cao2014]).
6. **Too many irregular panels** ([Ichi-up][ichiup27]), **or 9 or more panels on a page** ([Art School Osaka][artschool-creie]).

---

## 3. Reading-order research

### 3.1 Cohn 2013: "Navigating comics" ([PMC][cohn2013])

**Method.** 145 attendees at Comic-Con 2004 numbered the empty panels on 12 pages.

**Results.** Rates of reading along the Z-path (left to right, then down), as recapped in [Cohn & Campbell][cohn2015]:

| Layout | Z-path rate |
|---|---|
| Grid | about 95 % |
| Blockage (a tall panel beside a stack) | 31 %; readers went down the stack about 2 : 1 |
| Staggering | 89 % |
| Separation | 71 % |
| Overlap | 50 % |

- **Entry.** 96 % began at the top-left panel when one existed.
- **Manga readers.** Frequent manga readers gave significantly fewer left-to-right orders when there was no top-left panel (F(3,141) = 3.87, p < .05).
- **Assemblage principles.** Readers prefer grouped areas and smooth paths, and avoid jumping over panels or leaving gaps.
- **Preference rules.**
  - *Entry:* go to the top-left panel; failing that, the highest or leftmost.
  - *Navigation, in priority order:* follow the outer border, follow the inner border, move right, move down, go far left and down, then read any unread panel.
  - For manga these would be mirrored (unverified).

### 3.2 Cohn & Campbell 2015: "Navigating comics II" ([PDF][cohn2015])

- **Method.** 72 UCSD readers, 3 excluded; 65 layouts. The control grids followed the Z-path 91 % of the time.
- **Blockage and staggering.** The Z-path rate falls step by step as the right-hand gutter moves down: about 0.66, 0.39, 0.29, 0.21 and 0.08 across the five positions (read off Fig. 3a). It is under 10 % at full blockage. Readers key on whether the gutters line up.
- **Separation.** Wider gutters meant less Z-path reading (about 0.47 at full width against 0.62 at half). Which side the gap was on made no difference.
- **Overlap.** Overlaps on the left, entry side cut the Z-path more (about 0.50 and 0.41) than overlaps on the right (0.68 and 0.62).
- **Fluency.** Comic-reading fluency showed no significant correlation. Some participants read right to left, manga-style.
- **A caution.** Eye-tracking (Omori et al., 2004) found eyes following the Z-path more often in blockage layouts, so what readers say and what their eyes do can differ.

### 3.3 Later work, including Japanese versus Western readers

- **Blockage is read reliably.** Readers went down the stack about 91 % of the time, as consistently as grids are read across. Blockage is far more common in Asian books, and how often someone read manga did not predict their choice ([VLL 2016][vll-myths]).
- **Cross-cultural corpus.**
  - Manga and manhua: more vertical segments and bleeds.
  - European and US independent comics: more horizontal staggering.
  - US mainstream comics: panels spanning a whole row, and variable separation and overlap.

  Source: [VLL 2018][vll-cultural].
- **Writing direction** (1,030 comics from 144 countries, 57 languages, 17 writing systems). Layouts follow the direction of the writing system. Manga favour right-to-left-then-down paths and vertical columns beyond what writing direction explains ([Cognition 2025][cohn2025], search summary).
- **Eye-tracking.** Panel outlines drive most navigation decisions; content, especially text placement, settles the ambiguous cases ([Kirtley et al. 2023][kirtley2023]).
- **What makes experienced readers read blockage vertically.** Five patterns: breaking and bridging; gradual object movement; sequential actions; entering or leaving an embedded narrative; and terminal-initial ellipses ([JGNC 2024][blockage2024], search summary).
- **Holistic readers** focused less on the main object, but only when reading manga ([Shimizu et al. 2025][shimizu2025], search summary).

### 3.4 Automatic layout research

**Cao, Chan & Lau 2012** ([PDF][cao2012]):

- **Training data.** About 4,000 annotated pages.
- **Page structure.** The page is split recursively into rows, then columns. Split counts and proportions are learned; for example, one series' 6-panel pages favour 3 rows.
- **Panel importance** has three levels. Important panels are wide and fill their row; minor panels are narrow verticals.
- **Size contrast.** If an importance-1 or importance-3 panel does not get a matching size, the layout's likelihood drops to e⁻¹⁰.
- **Related panels** go along a straight path, ideally one full row, so that shot changes line up with row boundaries.
- **Edges.** Collinear edges stay collinear.
- **Artwork** is only scaled and moved, with faces protected.
- **Panel shapes** come from a 3-component shape model.
- **Speed.** The system samples 500 layouts and offers the top 5. Novices took 1.36 minutes per layout against 4.09 minutes by hand.
- **Limits.** It cannot do shōjo-style nesting, and the user must choose the panel count.

**Cao, Lau & Chan 2014, "Look over here"** ([PDF][cao2014]):

- **Training data.** 80 pages from three series, eye-tracked with 30 viewers. A transition between two elements counts when more than 50 % of viewers make it.
- **The artist's guiding path** is a smooth spline from the top-right corner, through every panel centre, to the bottom-left corner.
- **Weighted constraints** (0.3 / 0.3 / 0.2 / 0.2):
  - no significant overlap between elements;
  - balloon order: each earlier balloon sits up and to the right of the later one;
  - boundary: an element more than 20 % outside its panel is penalised;
  - how the subjects relate (talk, fight or none).
- **Results.**
  - Readability was preferred 60 % to 20 % over a rule-based balloon placer.
  - A page took 45 seconds with the tool against 140 seconds by hand.
  - Fewer than 5 % of panels hold more than 4 subjects.
  - The model ignores tonal contrast.

**Other work:**

- **Yang et al. 2021:** multi-page comics generated from video, with balloon shapes driven by emotion ([arXiv][yang2021]).
- **Feng et al. 2025:** panel outlines alone identify a series 84.3 % of the time, against 87.5 % for the full art. Publisher (12.6 %) and genre (20.8 %) barely register. The deciding features are size, spacing and alignment, so layout is effectively a house signature ([arXiv][feng2025]).
- **Generative systems:** MangaDiffusion with the Manga109Story dataset ([arXiv][mangadiffusion]); DiffSensei ([CVPR 2025][diffsensei]); and MangaFlow, which keeps page layout and lettering as editable intermediate stages ([arXiv 2026][mangaflow]).
- **Manga109** is a benchmark of 109 volumes and 21,142 pages, with panel, face and text boxes ([arXiv][manga109]).

---

## 4. Effects conventions

### 4.1 Screentone

- **The "61" tone.** 61番 is 60 lines per inch at 10 %, the standard skin-shadow tone: Deleter sells it as SE-61 and IC as S-61 ([Deleter][deleter-se61]; [IC][ic-s61]). An essay argues the historical 61番 was 55 lines at 10 %; I saw only its title (unverified) ([Masuda][masuda]).
- **Line counts.**
  - 60–65 lines is the most used range: 60 for commercial work, 60 or 65 for B5 doujinshi.
  - Tones above 70 lines can clog on some commercial presses.
  - Tones look lighter on screen than in print.

  Source: [Comic Assistant][comicassistant].
- **Densities.**
  - Skin shadow runs 10–20 %, most often 60 lines at 10 % ([Comic Assistant][comicassistant]).
  - Tanned skin runs 5–25 % ([Comic Assistant][comicassistant]).
  - Hair and clothes run 20–30 % ([my-best][mybest], search summary).
- **Avoiding moiré.**
  - Layered tones must share line count and angle ([CSP][csp-moire]).
  - Set 45° screens, at 60 lpi or less ([Taiyou][taiyou-moire]); on-demand printing needs 60 lines or fewer ([Taiyou glossary][taiyou-vocab]).
  - Stay at about 70 lines or below, and avoid 80 % or darker dot tones.
  - Apply tone only in monochrome 2-level mode, and never resize afterwards.

  Source for the last two points: [PrintKing][printking].
- **For screen display,** turn tone screening off so tones export as smooth grey ([CSP][csp-moire]).
- **Reduction multiplies the line count.** Effective lines = original ÷ scale:

  | Printed size | Scale from B4 | 60 lines on B4 becomes |
  |---|---|---|
  | B5 | 83 % | about 72 |
  | A5 | 67 % | about 90 |
  | B6 | 58 % | about 103 |

  These figures are derived. A forum claim that 60 lines becomes 85 at B5 only holds if you measure from the B4 sheet edge, not the trim ([CSP ASK][cspask-1200]).
- **Tone as emotion** ([Art School Osaka][artschool-tone]):
  - joy: light greys, flowers, stars, polka dots;
  - anger or sadness: dark tones, crosshatching (カケアミ), sand tones;
  - surprise: focus lines and lightning flashes;
  - romance: sparkles and soft tones.
- **Flowers** serve as backgrounds and as scenery for a character's inner state (心象風景) ([CLIP STUDIO][csp-flowers]).
- **Tone-scraping (削り) highlights, gradation tones and white ink (ホワイト)** are standard practice, but I confirmed none of them from a source (unverified).

### 4.2 Lines and flashes

- **集中線 (focus lines)** are ruled lines drawn toward one chosen point, for surprise or force. **流線 (speed lines)** are parallel lines laid over a moving subject ([Vantan][vantan], search summary). Clip Studio calls them "saturated lines" and "stream lines".
- **Direction of speed lines** ([CSP tips][csp-effects]):
  - lines coming from above read as gloom;
  - lines from below read as uplift;
  - curved lines mean dizziness.
- **Drawing focus lines.**
  - By hand: mark the centre and the outer limit in pencil, then rotate the paper, not the ruler ([Hamano][hamano-lines]).
  - Digitally: build the effect at 10–15 cm and scale it down ([CSP][csp-flash]).
- **ベタフラ (black flash)** is a radiating flash with a black-filled background ([pixiv][pixiv-beta], search summary). It is drawn over concentric-circle guides, with heavy-pressure strokes whose thick ends merge into black ([Hamano][hamano-lines]).
- **ウニフラ (sea-urchin flash)** is a spiky outline with no black fill. It works like a balloon, usually for shouted inner monologue, and can hold text or even a flashback image ([pixiv][pixiv-uni], search summary; [CSP][csp-miura]).

---

## 5. Magazine furniture

- **Cover dating.** Japanese magazines once dated issues inconsistently, some months ahead of release. Guidelines since 1986 allow up to 15 days ahead for weeklies, one month for semi-monthlies and 45 days for monthlies ([JA Wikipedia: 雑誌][jawp-zasshi]).
- **Magazine codes.** The magazine code (雑誌コード, printed bottom left on the back cover) dates from 1978, its barcode from 1986 and the current code from 2004. **A 1950s-style cover should carry neither** ([JA Wikipedia: 雑誌コード][jawp-code]).
- **Other cover elements.** Masthead, issue number, price, catch copy and 付録 (free-gift) callouts are conventional, but I found no source listing them (unverified).
- **Period models.**
  - 光文社『少年』 (monthly, 1946–68) serialised a robot-boy series from 1952 and a remote-controlled giant-robot series from the mid-1950s. It switched from A5 to B5 in January 1954 and shipped several booklet supplements with each issue ([JA Wikipedia: 少年][jawp-shonen]).
  - 『少年画報』 printed 720,000 copies of its 1958 New Year issue, with 1.2 % returned ([JA Wikipedia: 少年画報][jawp-gaho]).
- **Magazine format.** Each series gets 20–40 pages per issue; issues run from 200 to over 850 pages on newsprint ([Wikipedia: Manga magazine][wp-mangamag]).
- **表1–表4.** These are the front cover, inside front, inside back and back cover. Everything except 表1 is almost always advertising, and 表4 is the most expensive advertising slot ([JA Wikipedia: 表紙][jawp-hyoshi]).
- **扉 (title page).** It carries the title logo, the author's name, the アオリ hype line and the chapter number. It can be a spread or a single page; 大扉 is a book's main title page and 中扉 a chapter title page ([Tombo Studio][tttombo-tobira]).
- **柱 (hashira).** The vertical margin on the fore-edge side, outside the frame, where thumbs rest. Editors fill it with hype lines, notices, next-issue information, author news and ads, and artists leave it empty ([Tombo Studio][tttombo-hashira]; [Weblio][weblio-hashira]).
- **アオリ (hype copy).** Written by the editor on the title page, at the page-turn hook and in the hashira. It disappears when a series is collected, and moves onto the book's paper band (帯) instead ([Tonbi-kobo][tonbi-a], search summary).
- **次号予告 and 作者コメント.** The next-issue teaser and the authors' comments, which *Jump* prints with its table of contents, are common features (unverified).
- **Reader survey.**
  - *Jump* readers name their three favourite series of the week, plus demographics, on a postcard; digital buyers vote in Jump+.
  - The table-of-contents order reflects the ranking.
  - New series (under 8 chapters), colour-page features and final chapters are exempt.
  - Series face review after about 10–12 issues.

  Sources: [mangaka.online][mangakaonline]; [note][note-jump]; [OTAKU HACK][otakuhack]. The ranking is not applied rigidly ([JA Wikipedia: ジャンプ][jawp-jump]).

---

## 6. Booklet production

### 6.1 Why pages come in multiples of 4

A sheet folded once makes 4 pages, and every further fold doubles that. A printer's spread (the imposed sheet) is not the same as a reader's spread. Wikipedia's 32-page example orders the pages 1, 32, 31, 2, 3, 30, 29, 4 … ([Wikipedia: Imposition][wp-imposition]).

### 6.2 Imposition for 8 pages on 2 sheets

Each cell shows the page on the left half and the right half of that sheet face (derived):

| Face | Left-bound (Western) | Right-bound (右綴じ) |
|---|---|---|
| Sheet 1, outside | 8 \| 1 | 1 \| 8 |
| Sheet 1, inside | 2 \| 7 | 7 \| 2 |
| Sheet 2, outside | 6 \| 3 | 3 \| 6 |
| Sheet 2, inside (centre spread) | 4 \| 5 | 5 \| 4 |

- **Reading spreads, right-bound:** page 1 alone, then [3 | 2], [5 | 4], [7 | 6], then page 8 alone. Odd pages fall on the left, which matches §2.4.
- **Only the centre spread, pages 4–5, sits on one side of one sheet.** It is the only place a picture can cross the fold without having to line up across two sheets (derived).

### 6.3 Proposed page map (right-bound; unverified)

| Page | Content |
|---|---|
| 1 | 表1: front cover |
| 2 | 表2: Directorate notice. It is the right-hand page, so it is read first. |
| 3 | Manga page 1, a left page, used as the 扉 splash. First hook in its bottom-left panel. |
| 4–5 | Manga pages 2–3, the centre spread; a true 見開き is possible. Second hook at the bottom left of page 5. |
| 6 | Manga page 4, a right page: the reveal at top right, the ending at bottom left. |
| 7 | 表3: survey or application postcard, plus the next-issue teaser. |
| 8 | 表4: advertisement. |

- **Covers and manga fall on separate sheets.** The whole manga prints on sheet 2, and the covers on sheet 1, which could be heavier or coloured stock.
- **A left-bound English edition mirrors everything.** Hooks move to the bottom right of the pages, and layouts must mirror; flipping the art is Ingram's call.

### 6.4 Printing at home

- **Paper sizes.**
  - A4 sheets make an A5 booklet, with the B5 master scaled to 82 %.
  - A3 sheets make an A4 booklet, at 116 %.

  Source: [Kanazawa][kanazawa].
- **US Letter** makes 139.7 × 215.9 mm pages (1 : 1.545). A √2 page fitted to the width is 197.5 mm tall, leaving about 9 mm spare top and bottom (derived).
- **Duplex.** PDF can preselect duplex mode: Simplex, DuplexFlipShortEdge or DuplexFlipLongEdge ([pdf-lib][pdflib-vp]). Landscape sheets with two pages side by side normally flip on the short edge (unverified; test with a dummy).
- **Edge-to-edge printing.** Most home printers cannot print to the edge, so either print oversize and trim, or keep a white margin (unverified).
- **Creep** is negligible at 2 sheets (unverified).

### 6.5 PDF flags

- **`/ViewerPreferences /Direction /R2L`.** Declares the main reading order. It changes neither the content nor the numbering, but viewers may use it when showing pages side by side or printing several to a sheet ([pdf-lib][pdflib-vp]; [PDFBox][pdfbox-dir]).
- **`/PageLayout`.** `TwoPageLeft` shows pages two at a time with odd pages on the left; `TwoPageRight` puts odd pages on the right ([PDFBox][pdfbox-layout]).
- **Viewer support varies.** How viewers combine `R2L` with these layouts is not consistent (unverified), so test each one; the fallback is to export pre-composed spread images.
- **`setPrintScaling`** preselects the print dialog's scaling option, which can suppress fit-to-page ([pdf-lib][pdflib-vp]).

---

## 7. The 4-koma option

- **Format.** Four equal panels, usually in one vertical column read top to bottom ([Wikipedia: Yonkoma][wp-yonkoma]).
- **Structure (起承転結):**
  - 起 sets the scene;
  - 承 develops it;
  - 転 brings an unforeseen turn;
  - 結 shows the effect, and the punchline (オチ) lands in panel 4.

  Sources: [Wikipedia][wp-yonkoma]; [JA Wikipedia][jawp-4koma].
- **Two strips per page:** the right-hand strip is read first ([JA Wikipedia][jawp-4koma]).
- **History.** Kitazawa Rakuten originated the format in 1902 ([Wikipedia][wp-yonkoma]). Newspaper 4-koma of the 1950s, such as *Sazae-san*, set the self-contained daily strip. The 2 × 2 layout is historical; the vertical column is standard now ([JA Wikipedia][jawp-4koma]).
- **Sizing on this booklet.** On an A5 inner frame of about 122 × 180 mm: two strips 58 mm wide with a 6 mm gap, a title box of about 12 mm, and four panels of about 58 × 40 mm with 3 mm gaps between them (derived; placing the title box on top is unverified).

---

## Implications for the layout software

All figures are at A5 print size (148 × 210 mm), scaled from the standards above (derived) unless stated otherwise.

**Page geometry and resolution**

1. **Canvas.** Trim 148 × 210 mm, bleed 3 mm, so the canvas is 154 × 216 mm.
2. **Inner frame.** About 122 × 180 mm, centred: 13 mm margins at the sides and 15 mm top and bottom.
3. **Hard layout rules.**
   - Balloons and text stay inside the inner frame.
   - Nothing essential goes within 4 mm of the trim.
   - No faces or text in the ノド margin (the binding-side gutter).
4. **Resolution.** The print master is 600 dpi, which is 3638 × 5102 px with bleed; use 1200 dpi for 1-bit output. Screen output is smooth greyscale with no halftone ([CSP][csp-moire]).
5. **Faking screentone** from greyscale art:
   - round dots at 45°, 60 lpi measured at final size, never above 65–70;
   - tone densities of 10, 20 and 30 %;
   - anything 80 % or darker becomes solid black;
   - screen once, at output resolution, and never resample afterwards;
   - no anti-aliasing in 1-bit output.

**Panel defaults**

6. **Line weights.** Frame line 0.55 mm; balloon outline 0.2–0.25 mm, always lighter than the frame.
7. **Gutters.** Side gutter 2.5 mm, tier gutter 5 mm. Enforce a tier-to-side ratio of at least 1.8 unless the page is flagged as simultaneous action.
8. **Panel counts.** 4–6 panels in 3–4 tiers. Warn above 7 panels; refuse above 8.
9. **House style.** Fix one set of gutter, frame and tier parameters for both editions, since layout alone identifies a series ([Feng 2025][feng2025]).

**Reading-order checker (the right-to-left mirror of Cohn's rules)**

10. **Entry.** The first panel owns the page's top-right corner.
11. **Aligned gutters.** Vertical gutters in adjacent tiers must not line up. Flag offsets smaller than three gutter widths (threshold unverified).
12. **Blockage.** A tall panel must run the full height of the stack beside it. Flag stack gutters 25–75 % of the way down, the ambiguous zone where only 0.2–0.4 of readers took the tier.
13. **No 2 × 2 four-way crossings.**
14. **Facing pages.** Offset tier gutters by at least 5 mm unless the pair is a deliberate 見開き.
15. **Insets** are read after their container.
16. **Overlaps.** Avoid overlapping panels on the entry side (mirrored; unverified for manga readers).

**Balloons, subjects and page turns**

17. **Balloon order.** Each later balloon sits lower or further left than the one before. The path through balloon centres must visit panels in order, never jumping over one.
18. **Crowding.** At most 4 main subjects per panel; no element more than 20 % outside its panel.
19. **Page turns.** The hook panel (p3 and p5) is no bigger than the page's median panel. The first panel after each turn (p4 and p6) is the page's largest.
20. **Size contrast.** The largest panel has at least twice the area of the smallest (heuristic; unverified).

**Output and furniture**

21. **Two PDFs.**
    - Print: 4 landscape A4 faces in the right-bound imposition above, with DuplexFlipShortEdge and print scaling set to none.
    - Reading: 8 pages with `/Direction /R2L` and a two-page layout, tested in each viewer, with spread images as the fallback.
22. **Furniture slots.**
    - Hashira text on the fore-edge side, outside the frame.
    - アオリ hype lines on the 扉 and at each hook.
    - A survey postcard on 表3 and an advertisement on 表4.
    - A cover dated with a 月号 issue month, showing a price and furoku callouts, and no barcode.

---

## Best sources

1. [Cohn & Campbell 2015 (PDF)][cohn2015]: measured stagger, separation and overlap thresholds.
2. [Cohn 2013 (PMC)][cohn2013]: Assemblage and the entry and navigation preference rules.
3. [Cao, Chan & Lau 2012 (PDF)][cao2012]: a programmable model of rows, columns, importance and panel shape.
4. [Cao, Lau & Chan 2014 (PDF)][cao2014]: the guiding path, balloon-order and boundary constraints, and eye-tracking.
5. [Hamano Manga Club][hamano]: both paper standards, balloon limits, ノド, gutters and line weights.
6. [Kanazawa Printing][kanazawa]: reduction percentages, the safe margin and the page-number rule.
7. [Shogakukan new-artist course][shogakukan]: a publisher's own panel-count and gutter figures.
8. [CSP moiré-free guide][csp-moire]: resolution and tone settings, and tone versus greyscale output.
9. [Ichi-up: コマ割りの約束][ichiup16]: the gutter and spread offset rules, and the tier forms.
10. [PDFBox PageLayout][pdfbox-layout] and [pdf-lib ViewerPreferences][pdflib-vp]: the PDF layout, direction and duplex flags.

<!-- link definitions -->
[hamano]: https://www.hamano-manga-club.com/skill-box/skill/manuscript-paper/
[sekaido]: https://webshop.sekaido.co.jp/product/A001088
[kanazawa]: https://www.kanazawa-p.co.jp/genkousakusei/kihon.html
[cspask-hanzura]: https://ask.clip-studio.com/ja-jp/detail?id=117518
[csp7706]: https://tips.clip-studio.com/ja-jp/articles/7706
[csp733]: https://tips.clip-studio.com/ja-jp/articles/733
[csp-manual]: https://www.clip-studio.com/site/gd/csp/manual/userguide/csp_userguide/500_menu/500_menu_file_new_comic.htm
[bookliner]: https://howto.clip-studio.com/library/page/view/bookliner_pre_bl_001
[terastorys-use]: https://raon-terastorys.com/youshi-use/
[karin]: https://karin.wakasa.jp/other-contents/%E3%83%9E%E3%83%B3%E3%82%AC%E3%83%88%E3%83%AC%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0/%E7%AC%AC3%E5%9B%9E-%E5%8E%9F%E7%A8%BF%E7%94%A8%E7%B4%99%E3%81%AE%E8%A6%8B%E6%96%B9/
[wp-tankobon]: https://en.wikipedia.org/wiki/Tank%C5%8Dbon
[jawp-shinsho]: https://ja.wikipedia.org/wiki/%E6%96%B0%E6%9B%B8%E5%88%A4
[taiyou-csp]: https://www.taiyoushuppan.co.jp/doujin/howto/clipstudiopro.php
[taiyou-moire]: https://www.taiyoushuppan.co.jp/doujin/howto/moire.php
[taiyou-vocab]: https://www.taiyoushuppan.co.jp/doujin/howto/vocabulary03.php
[csp-moire]: https://howto.clip-studio.com/library/page/view/clipstudiopaint_tora_001_089
[cspask-1200]: https://ask.clip-studio.com/ja-jp/detail?id=75397
[wp-halftone]: https://en.wikipedia.org/wiki/Halftone
[printking]: https://lab.printking.co.jp/notmoare/
[shogakukan]: https://shincomi.shogakukan.co.jp/training/004.html
[hanasakichu-gutter]: https://hanasakichu.com/panel-layout2/
[hanasakichu-order]: https://hanasakichu.com/panel-turn/
[csp-forum-gutter]: https://www.clip-studio.com/clip_site/support/help/detail/svc/53/tid/72857
[ichiup16]: https://ichi-up.net/2019/16
[ichiup27]: https://ichi-up.net/2019/27
[manzemi416]: https://manzemi.net/lesson/416
[manzemi407]: https://manzemi.net/lesson/407
[mangaagency]: https://manga-agency.jp/lesson/lesson-11.html
[stotuku]: https://takagi-shinry.com/2017/07/16/how-to-make-manga-layout-mekuri-hiki/
[chiebukuro-left]: https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q1433145859
[tttombo-mihiraki]: https://www.tttombo.com/tombo2-manga-seisakuyougo-ma-mihiraki.html
[tttombo-hashira]: https://www.tttombo.com/tombo2-manga-seisakuyougo-ha-hasira.html
[tttombo-tobira]: https://www.tttombo.com/tombo2-manga-seisakuyougo-ta-tobira.html
[artschool-creie]: https://www.art-school.co.jp/creie/blog/teacher/24774/
[haruburo]: https://haru-buro.com/komawari-jikan/
[cohn2013]: https://pmc.ncbi.nlm.nih.gov/articles/PMC3629985/
[cohn2015]: https://www.visuallanguagelab.com/P/NCHC_pagelayouts2.pdf
[vll-myths]: https://www.visuallanguagelab.com/2016/08/dispelling-myths-about-comics-page-layout.html
[vll-cultural]: https://www.visuallanguagelab.com/2018/11/new-paper-the-cultural-pages-of-comics.html
[cohn2025]: https://www.sciencedirect.com/science/article/pii/S0010027725000769
[kirtley2023]: https://discovery.dundee.ac.uk/en/publications/navigating-the-narrative-an-eye-tracking-study-of-readers-strateg/
[blockage2024]: https://www.tandfonline.com/doi/abs/10.1080/21504857.2024.2410921
[shimizu2025]: https://pmc.ncbi.nlm.nih.gov/articles/PMC12281072/
[vll-framing]: https://www.visuallanguagelab.com/2012/09/new-article-framing-attention-in-japanese-and-american-comics.html
[framing-pubmed]: https://pubmed.ncbi.nlm.nih.gov/23015794/
[cao2012]: http://ying-cao.com/projects/stylistic_layout/files/layout_paper.pdf
[cao2014]: https://www.ying-cao.com/projects/manga_composition/files/composition_paper.pdf
[yang2021]: https://arxiv.org/abs/2101.11111
[feng2025]: https://arxiv.org/html/2412.19141
[mangadiffusion]: https://arxiv.org/abs/2412.19303
[diffsensei]: https://openaccess.thecvf.com/content/CVPR2025/papers/Wu_DiffSensei_Bridging_Multi-Modal_LLMs_and_Diffusion_Models_for_Customized_Manga_CVPR_2025_paper.pdf
[mangaflow]: https://arxiv.org/abs/2605.28173
[manga109]: https://arxiv.org/pdf/2005.04425
[deleter-se61]: https://deleter.jp/d_lineup/se-61
[ic-s61]: https://www.icscr.jp/icscreendb/s-61/
[masuda]: https://mitimasu.fanbox.cc/posts/1469658
[comicassistant]: https://comicassistant.com/screentone
[mybest]: https://my-best.com/1554
[artschool-tone]: https://www.art-school.co.jp/blog/manga/8679/
[vantan]: https://www.vantan-game.com/glossary/effect-line/
[pixiv-uni]: https://dic.pixiv.net/a/%E3%82%A6%E3%83%8B%E3%83%95%E3%83%A9
[pixiv-beta]: https://dic.pixiv.net/a/%E3%83%99%E3%82%BF%E3%83%95%E3%83%A9%E3%83%83%E3%82%B7%E3%83%A5
[hamano-lines]: https://www.hamano-manga-club.com/skill-box/skill/concentration-line/
[csp-flash]: https://tips.clip-studio.com/en-us/articles/9382
[csp-effects]: https://tips.clip-studio.com/en-us/articles/10107
[csp-miura]: https://tips.clip-studio.com/ja-jp/articles/1479
[csp-flowers]: https://www.clipstudio.net/oekaki/archives/151755
[jawp-hyoshi]: https://ja.wikipedia.org/wiki/%E8%A1%A8%E7%B4%99
[jawp-zasshi]: https://ja.wikipedia.org/wiki/%E9%9B%91%E8%AA%8C
[jawp-code]: https://ja.wikipedia.org/wiki/%E9%9B%91%E8%AA%8C%E3%82%B3%E3%83%BC%E3%83%89
[jawp-shonen]: https://ja.wikipedia.org/wiki/%E5%B0%91%E5%B9%B4_(%E9%9B%91%E8%AA%8C)
[jawp-gaho]: https://ja.wikipedia.org/wiki/%E5%B0%91%E5%B9%B4%E7%94%BB%E5%A0%B1
[tonbi-a]: http://tonbi.jp/Comic/Terms/A.html
[weblio-hashira]: https://www.weblio.jp/content/%E3%83%8F%E3%82%B7%E3%83%A9
[mangakaonline]: https://www.mangaka.online/blog/weekly-shonen-jump-explained/
[note-jump]: https://note.com/fine_roses612/n/n1c0886196ca9
[jawp-jump]: https://ja.wikipedia.org/wiki/%E9%80%B1%E5%88%8A%E5%B0%91%E5%B9%B4%E3%82%B8%E3%83%A3%E3%83%B3%E3%83%97
[otakuhack]: https://otakuhack.com/comic/jump-anke/
[wp-mangamag]: https://en.wikipedia.org/wiki/Manga_magazine
[wp-imposition]: https://en.wikipedia.org/wiki/Imposition
[pdflib-vp]: https://pdf-lib.js.org/docs/api/classes/viewerpreferences
[pdfbox-layout]: https://pdfbox.apache.org/docs/2.0.13/javadocs/org/apache/pdfbox/pdmodel/PageLayout.html
[pdfbox-dir]: https://pdfbox.apache.org/docs/2.0.13/javadocs/org/apache/pdfbox/pdmodel/interactive/viewerpreferences/PDViewerPreferences.READING_DIRECTION.html
[wp-yonkoma]: https://en.wikipedia.org/wiki/Yonkoma
[jawp-4koma]: https://ja.wikipedia.org/wiki/4%E3%82%B3%E3%83%9E%E6%BC%AB%E7%94%BB
