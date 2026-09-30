# tools/manga — the recruitment comic's renderer

Renders the Directorate's recruitment manga (`design/propaganda-manga.md`) from its script,
`data/manga/<issue>.json`: Ingram's Midjourney art cropped into panels, borders, balloons, lettering and sound
effects, in a native Japanese edition and an English one. Python with numpy, Pillow, OpenCV and fontTools; nothing
else to install.

## Running it

```
python tools/manga/render.py draft data/manga/issue-01.json                    # every page, both editions
python tools/manga/render.py draft data/manga/issue-01.json --page p1 --edition ja --proof
python tools/manga/render.py draft data/manga/issue-01.json --tone dots --dpi 600 --ss 1   # the print look
python tools/manga/render.py lint data/manga/issue-01.json                     # the checks alone
```

- Renders land in `artwork/manga/<issue>/renders/` (gitignored), named `<issue>-<page>-<edition>.png`, with `-dots`
  or `-art` for another tone and `-proof` for the proof view.
- **Every render lints first** and prints what it finds: layout problems, and any character a font cannot draw (a
  missing glyph renders as nothing at all, silently).
- **The proof view** draws the trim in blue, the inner frame in magenta, the panels numbered in reading order, each
  item's anchor as a red cross and each tail's target as a green ring.
- **Missing art renders as a slate**, a grey panel showing its prompt code, so a draft always renders whole.
- The first render on a machine builds the fonts' vertical-form copies (below), which takes about a minute. After
  that a page takes a few seconds.

## The art

Ingram drops panel art in `artwork/manga/in-tray/`. Claude moves each file (never copies it) into
`artwork/manga/<issue>/art/`, named by its prompt code (`M1-P1-K3.png`). Her cast sheets live in
`artwork/manga/design-sheets/`, which is hers: read them there and never move them.

Each panel crops its art to the panel's own shape around a `focus` point (fractions of the image), optionally
zoomed. Then the whole issue gets one printed look, the `--tone`:

- `flat` (the default): greys settled onto three flat steps with soft edges, the look of a screen edition. Flat greys
  never shimmer when Foundry scales a page to a window.
- `dots`: black, white and 45° screentone dots at 60 lines an inch, the look of print. Dots must be made at the final
  size and never resized, so use `--ss 1` at the print resolution.
- `art`: her greys as drawn, only levelled.

## The script

`data/manga/<issue>.json`, against `data/schema/manga-issue.schema.json`. The parts:

- **`format`**: trim, bleed, the inner frame's margins (the spine margin sits on whichever side the spine is), the
  gaps between panels and between tiers, and the frame line's weight, all in millimetres. `binding: "right"` is a
  Japanese book: odd pages sit on the left of a spread, with the spine on their right.
- **`lettering`**: the Japanese em and the English letter size, the balloon line's weight, and the padding inside a
  balloon, for the whole issue. One size throughout, as a letterer keeps it.
- **`pages[].tiers`**: rows top to bottom; **inside a tier, the first panel listed is the rightmost and is read
  first**. The widths and heights must fill the inner frame exactly; lint says so if they don't.
- **`pages[].panels`**: per panel, its `art`, `focus` and `zoom`, and its `items`.
- **`hashira`**: the editor's line in the outer margin, per edition.
- **`gm`**, anywhere: notes for the GM. **Never drawn**, and a test holds that.

**Items** are placed by fractions of their own panel: `at` is the centre, `tail` the speaker's mouth. A layout change
never strands a balloon. The kinds:

| Kind | What it is |
|---|---|
| `balloon` | Speech. `shape` is the voice: `oval` for ordinary speech, `burst` for shouting, `wobbly` for a small uncertain voice, and `angular` for the institution's machines (the loudspeaker, with a zigzag tail). `stop` is how far the tail runs toward the mouth (0.6 by default: letterers stop it short). |
| `caption` | A narration box: the institution's printed voice, in mincho. |
| `sfx` | A sound effect: outlined, glyph by glyph, growing along the sound. `step` is the direction ([0.8, 0] runs right, [0.08, 0.92] runs down), `size_mm`, `grow`, `angle`, `wobble`. `sub` is the English edition's small gloss. |
| `mark` | A lone ？ or ！ over someone's head. |
| `sign` | Lettering that belongs to the picture (a banner, a notice), vertical, in gothic. |
| `title` | The logo: outlined like a sound effect, bouncing. |
| `aori` | The editor's hype line beside the title, with a white halo and no balloon. |

`text` is a string (the same in both editions) or `{"ja": ..., "en": ...}`. An item may carry a `ja` or `en` block
that overrides its other keys in that edition only: English balloons are wider than Japanese ones and sometimes need
their own spot (`"en": {"at": [0.85, 0.24], "scale": 0.85}`).

**Everything anybody says stays inside the inner frame.** Balloons, captions and effects may break a panel's border,
but they are pushed back in before they could cross the inner frame, where a trimmer might cut them.

## Lettering

**Japanese** is set vertically, one character to a square, columns right to left:

- `/` ends a column. Break by phrase, by hand, as manga letterers do; the machine only wraps what is still too long,
  and it never starts a column with a closing mark, a small kana or the long-vowel bar, never ends one on an opening
  bracket, and never splits a reading or a paired ellipsis.
- `{本部|ほんぶ}` puts the reading beside its characters at half size: furigana, as a youth magazine carries on every
  kanji.
- `!!`, `!?`, `?!` and two-digit numbers sit side by side in one square (縦中横).
- Kana and kanji are set in different faces, the manga convention (アンチゴチ); the loudspeaker's voice is all gothic.
- Vertical punctuation (the upright long-vowel bar, turned brackets, small kana high and right) comes from each font's
  own vertical forms. This Pillow has no shaping engine, so `fonts.vertical_copy()` writes a copy of each font whose
  character map points straight at those forms, cached in `artwork/manga/work/cache/` (or `MANGA_CACHE_DIR`).

**English** is set in capitals and broken into the letterer's lozenge (short lines top and bottom, the longest in the
middle), never hyphenated. `/` forces a break. Sound effects stay in Japanese, with the `sub` gloss beside them.

Every balloon is fitted to its own words (the smallest ellipse around the actual lines or columns), so each edition
gets balloons shaped for its own language, and every shape is built to contain that ellipse, so no edge can clip a
word.

## Fonts

`mangapress/fonts.py` registers every face with its licence. Several are stand-ins until the planned free manga faces
are downloaded (Gen'ei Antique for kana, Comic Neue Bold for English dialogue); Windows' own Yu Gothic and Comic Sans
are used as rasterised output only.

## Tests

```
npm run test:manga
python -m unittest discover -s test/manga -t test/manga
```

They run in a few seconds on small open-licence faces from `third-party/fonts/`, which is gitignored, so a fresh
clone skips them instead of failing. They cover the page geometry and its checks, both lettering setters, that every
balloon holds its words (the long loudspeaker balloon once clipped "PIER SEVEN"), that no effect's border covers a
neighbour's marks (ガ once lost its two dots), the three tones (the screentone once gave every grey the same dots),
whole-page renders of a fixture script in both editions, that GM notes never change a rendered page, and that the real
issue lints clean with the real faces.

## Not built yet

From the plan (`design/propaganda-manga.md` §5.2): the cover and the other booklet pages, slanted gutters and panels
that bleed off the page, focus and speed lines, the ink-line conversion that keeps skin white, keep-clear areas for
balloons, PDF and booklet imposition, and the Foundry handout pages.
