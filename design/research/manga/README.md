# The manga research shelf

*Gathered 2026-09-26 for [`design/propaganda-manga.md`](../../propaganda-manga.md), the plan for the Directorate's
recruitment comic. **Research, not lore, and not a decision:** a document here says what its sources say and what
might transfer to us. Nothing in it exists in the setting, and nothing in it settles a question; the plan proposes,
and Ingram decides. The documents name real works, people, places and decades because they are GM-facing. None of
those names belongs in the comic (LEDGER #24).*

---

## 1. What this shelf is

The two older shelves beside it, [`giant-robo/`](../giant-robo/README.md) and [`evangelion/`](../evangelion/README.md),
are close readings of one work each. This one reads a **medium and a practice** instead: how manga pages are laid
out, lettered and printed; how institutions have used comics to recruit and reassure, and how careful readers have
seen through them; how Midjourney can supply the pictures; and what software can put it all together.

**Its discipline** is a linked source beside every factual claim. **(unverified)** marks what could not be
confirmed, **(derived)** marks arithmetic from cited figures, and recommendations are labelled as such. Six research
strands ran in parallel on 2026-09-26, and several hit their web-search limits near the end, which is why some
claims are marked **(unverified)** rather than confirmed. The strands' own "Implications" sections are suggestions for
the plan, not decisions.

It is linted by `test/manga-research.test.mjs`: every document listed here exists, nothing unlisted sits on the shelf,
every document keeps its "Best sources" list and its research-not-lore statement, and no relative link is broken.

---

## 2. Router: what am I doing?

| I am about to… | Read |
|---|---|
| Lay out a page, a spread or the booklet; check reading order; set print resolution | `page-craft-and-print.md` |
| Letter a balloon in either language, draw a sound effect, choose a font | `lettering-and-sound-effects.md` |
| Decide what the comic says and leaves out, or plant something for a careful reader | `propaganda-and-unreliable-documents.md`, especially its closing toolkit of thirty techniques |
| Write a Midjourney prompt, or turn Midjourney art into printed-manga art | `midjourney-and-the-print-look.md` |
| Build or change the software | `tooling-landscape.md` |
| Decide how period the comic looks and sounds | `period-look-and-language.md`, especially its closing choices table |

---

## 3. The documents

- **`page-craft-and-print.md`.** Manuscript standards and how they scale to a booklet; panel counts, gutters and
  line weights; Neil Cohn's reading-order experiments turned into checkable rules; page turns; screentone, focus lines
  and flashes; magazine furniture (the four cover surfaces, margin hype text, reader surveys); the right-bound
  eight-page imposition; the PDF flags for right-to-left reading.
- **`lettering-and-sound-effects.md`.** The balloon shapes and what each voice means; Japanese commercial typesetting
  (the antique-kana and gothic-kanji convention, sizes in Q, furigana, vertical punctuation, line-break rules); a
  117-entry sound-effect lexicon; English localisation practice; and which fonts we may legally use, with licences.
- **`propaganda-and-unreliable-documents.md`.** Real precedents (a wartime shared-cartoon family in Japan, an army
  maintenance comic that taught through jokes, reassuring mascots whose claims were checked, recruitment art that
  backfired, retouched photographs caught by comparing editions); propaganda theory; comics theory on words and
  pictures that contradict each other; how games and tabletop handouts plant truths for careful readers; and a toolkit
  of thirty named techniques.
- **`midjourney-and-the-print-look.md`.** Midjourney's models and features as of 2026-09-26, especially the Edit
  Model that replaced its character references; prompting black-and-white panels without fake lettering; the
  published precedents of AI-made comics; and how to turn greyscale art into ink and screentone at print resolution.
- **`tooling-landscape.md`.** Ways to set vertical Japanese in software, open-source manga tools worth learning from,
  research on automatic balloon placement and page layout, halftone and speed-line algorithms, output formats, and how
  Foundry can show a comic to the table.
- **`period-look-and-language.md`.** What youth magazines of the later 1950s looked like and how they read: covers,
  gift booklets, page layouts, when screentone arrived, how balloon type changed, the toolkit of early girls' manga for
  a bubbly heroine, the look and language of period recruitment and public-relations material, and a table of
  period-versus-modern choices.

---

## 4. Quick reference

At A5 print size (148 × 210 mm) unless stated. Each figure's source and caveats are in the document named.

| Thing | Value | From |
|---|---|---|
| Trim, bleed, inner frame | 148 × 210 mm; 3 mm; about 122 × 180 mm | page craft |
| Gaps between panels | about 2.5 mm side by side, 5 mm between rows | page craft |
| Line weights | frame about 0.55 mm; balloon outline 0.2–0.25 mm | page craft |
| Panels per page | 5–7 is the norm; warn above 7, refuse above 8 | page craft |
| Print resolution | 600 dpi (1200 for pure black and white) | page craft |
| Screentone | 60 lines per inch at final size, round dots at 45°, 10 / 20 / 30 %; 80 % and darker becomes solid | page craft; Midjourney |
| Screen edition | flat greys avoid shimmer when zoomed; dots only at a fixed, unscaled size | page craft; Midjourney |
| Dialogue size (B6) | about 12.5Q (3.1 mm), line spacing about 130 % | lettering |
| Column length | at most about 10 characters, 3–4 columns per balloon, broken at phrases | lettering |
| Sound-effect outline | white, 0.6–0.8 mm | lettering |
| Midjourney V8.2 sizes | 2:3 is 896 × 1344 px (standard) and 1792 × 2688 px (HD) | Midjourney |
| Midjourney cost | about 4.7 GPU-minutes per panel for one careful pass | Midjourney |
| Reading time at the table | two to four minutes for a cover and four pages | propaganda |

---

## 5. Where the strands disagree

The plan (`design/propaganda-manga.md` §4.9) proposes an answer to each.

1. **Dots on screen.** Print wants real screentone dots; the screen edition shimmers if dots are scaled, so two
   strands recommend flat greys on screen. Spike 3 rendered dots that looked right at one fixed size.
2. **Period or modern.** The period strand recommends restraint (even rows, few sound effects, sparse flat tone); the
   lettering and page strands describe the modern toolkit. Which to use is Ingram's call.
3. **Midjourney parameters.** Keeping the recruit consistent needs reference images, which in V8.2 need `--ar` typed
   into the prompt; Ingram's standing preference for the opening titles was no `--` parameters.
4. **Mincho or antique.** The period strand notes that balloon type moved from mincho to antique-and-gothic around
   1960, while the lettering strand defaults to the antique pairing.

---

## 6. Gaps this shelf could not fill

Marked **(unverified)** in their documents, and worth checking before relying on them:

- a real period recruiting slogan, and whether 「君も〜！」 ("you too!") was a period formula;
- how much furigana 1950s children's magazines carried, magazine by magazine;
- whether Midjourney's Draft mode works with reference images, and whether its "black and white" output is truly
  neutral grey;
- which English publishers letter in capitals and which in mixed case today;
- how PDF viewers combine right-to-left reading with two-page view.
