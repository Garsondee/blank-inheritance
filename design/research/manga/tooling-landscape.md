# The software landscape, and the algorithms worth borrowing

*Part of the [manga research shelf](README.md), gathered 2026-09-26 for [`design/propaganda-manga.md`](../../propaganda-manga.md). **Research, not lore, and not a decision:** it says what the sources say and what might transfer, and the plan decides. Every factual claim links its source; **(unverified)** marks what could not be confirmed. It names real works, people and places because it is GM-facing; none of them belongs in the comic. Where it recommends an architecture, read it beside the vertical-lettering spike in `design/propaganda-manga.md` §5.1, which found a route it did not know about.*

## Headline findings

1. **Pillow cannot set vertical text on this machine today.** Pillow 12.3.0 is installed, and `PIL.features.check("raqm")` and `check("fribidi")` both return False (local check). The official wheels bundle a modified libraqm that only switches on when a FriBiDi DLL is found at runtime ([Pillow docs](https://pillow.readthedocs.io/en/stable/installation/building-from-source.html); [`_imagingft.c`](https://github.com/python-pillow/Pillow/blob/main/src/_imagingft.c)).
2. **uharfbuzz plus FreeType gives full vertical shaping with nothing but pip wheels**, and fontTools' documentation has a worked vertical-Japanese example ([fontTools](https://fonttools.readthedocs.io/en/latest/pens/freetypePen.html)).
3. **Chromium already does most Japanese vertical typesetting.** It has `writing-mode: vertical-rl`, `text-combine-upright: all`, ruby, `line-break: strict`, BudouX phrase breaking, `text-spacing-trim` and composite fonts through `unicode-range`. It lacks `hanging-punctuation` and `text-combine-upright: digits` (MDN compatibility data, §1.5).
4. **No open-source manga tool I checked implements kinsoku (line-break rules) or tate-chu-yoko in its renderer**, and most are GPL or AGPL. Borrow their ideas, not their engines.
5. **Comic Chat (1996) is still the most implementable balloon-layout algorithm.** Its pseudo-code is about 30 lines and mirrors cleanly to right-to-left.
6. **PostScript's spot-function model gives screentone in about ten lines of numpy.**
7. **Foundry's own PDF viewer shows spreads left-to-right.** Foundry v14 bundles pdf.js 4.0.379, which never reads a PDF's `/Direction` (local source), so a manga PDF's spreads display in the wrong order there. A small ApplicationV2 viewer is the right answer, and this module already has the pattern for it.
8. **Booklet imposition with right-edge binding exists off the shelf:** `pdfimpose` saddle with `bind='right'`, and LaTeX `pdfpages` with `booklet*`.

---

## 1. Vertical Japanese text rendering

### 1.1 Pillow + libraqm

- `direction` accepts `"rtl"`, `"ltr"` or `"ttb"` and requires libraqm; `features` switches OpenType features on or off; `language` takes a BCP 47 tag ([ImageDraw](https://pillow.readthedocs.io/en/stable/reference/ImageDraw.html)).
- **Windows.** Wheels since 8.2.0 include a modified libraqm that loads libfribidi at runtime. On Windows that means putting `fribidi.dll` (or `fribidi-0.dll` / `libfribidi-0.dll`) on the DLL search path ([Pillow docs](https://pillow.readthedocs.io/en/stable/installation/building-from-source.html)). The extension sets `have_raqm = !!p_fribidi`. Without the DLL, any direction, language or features argument raises `KeyError: setting text direction, language or font features is not supported without libraqm`, and `ttb` also needs raqm 0.7 or later ([`_imagingft.c`](https://github.com/python-pillow/Pillow/blob/main/src/_imagingft.c)). Where to get a trustworthy `fribidi.dll` (MSYS2, vcpkg or conda-forge) is **(unverified)**.
- **Multiline `ttb`.** It raised an error until PR #8730, which shipped in 11.3.0 ([issue #4945](https://github.com/python-pillow/Pillow/issues/4945); [11.3.0 notes](https://github.com/python-pillow/Pillow/releases/tag/11.3.0)).
  - The implementation places each new line at `left += line_spacing`, so **columns advance left-to-right, the opposite of Japanese**.
  - `Text.wrap()` raises "Only ltr direction supported" ([ImageText.py](https://github.com/python-pillow/Pillow/blob/main/src/PIL/ImageText.py)).
  - So for Japanese, set each column with its own call and step x leftwards yourself.
- **Glyph substitution.** In vertical direction HarfBuzz enables only `vert`, not `vrt2` ([hb-ot-shape.cc](https://github.com/harfbuzz/harfbuzz/blob/main/src/hb-ot-shape.cc)), so passing `features=["vert"]` is redundant.
  - Latin letters stay upright unless you rotate those runs yourself. The OpenType spec says `vert`/`vrtr` are for engines that rotate sideways runs per UAX #50, while `vrt2` is for engines that rely on pre-rotated glyphs ([OpenType u–z](https://learn.microsoft.com/en-us/typography/opentype/spec/features_uz)).
- **Anchors for vertical text.** Horizontal anchors are `m` or `s` (`s` is recommended); vertical anchors are `t`, `m` or `b`; the default is `lt` ([text anchors](https://pillow.readthedocs.io/en/stable/handbook/text-anchors.html)).
- **What you would still write yourself:** ruby, tate-chu-yoko (TCY), kinsoku and mixed fonts.

### 1.2 uharfbuzz (+ FreeType or skia)

- uharfbuzz is a set of Cython bindings to HarfBuzz under Apache-2.0 ([GitHub](https://github.com/harfbuzz/uharfbuzz)). Version 0.56.2 (2026-09-21) ships `cp310-abi3-win_amd64` wheels ([PyPI](https://pypi.org/project/uharfbuzz/)).
- It exposes `draw_glyph` and `draw_glyph_with_pen`, which give you glyph outlines ([API](https://uharfbuzz.readthedocs.io/reference.html)).
- fontTools' `FreeTypePen` rasterises outlines through freetype-py into numpy arrays or PIL images. Its documentation includes a uharfbuzz example that sets Japanese `ttb` with `vert`, `vpal` and `vkrn` and walks `y_advance` ([freetypePen](https://fonttools.readthedocs.io/en/latest/pens/freetypePen.html)).
- **Pros:**
  - only wheels, no DLL hunting;
  - a per-run feature list, which is what mixed fonts and TCY need;
  - real outlines, which the SFX jitter in §5 can reuse.
- **Cons:** every layout rule is yours to write.

### 1.3 Pango/Cairo

- Pango sets vertical text by rotating the context matrix with "gravity" (East rotates glyphs 90° counter-clockwise), and has done so correctly since 1.16 ([Gravity](https://docs.gtk.org/Pango/enum.Gravity.html); [Vertical Text](https://www.manpagez.com/html/pango/pango-1.38.0/pango-Vertical-Text.php)). A historical Japanese/Latin misalignment under East gravity was fixed by Fedora 34 ([bugzilla](https://bugzilla.redhat.com/show_bug.cgi?id=1786596)).
- Verdict: it needs the GTK/MSYS2 runtime on Windows and has no ruby or TCY API **(both unverified)**, so it offers nothing over uharfbuzz.

### 1.4 skia-python

- BSD-3-licensed, with Windows x86_64/arm64 wheels for Python 3.8–3.14 ([GitHub](https://github.com/kyamagu/skia-python)), and a PDF backend ([`skia.Document`](https://kyamagu.github.io/skia-python/reference/skia.Document.html)).
- I found no vertical writing mode in SkParagraph **(unverified)**.
- Worth having as an anti-aliased path renderer and PDF writer for glyph runs shaped by uharfbuzz.

### 1.5 Chromium (CSS Writing Modes)

Chrome version numbers below come from MDN's browser-compat-data ([repo](https://github.com/mdn/browser-compat-data), `css/properties/*.json`).

| Feature | Chrome | Notes |
|---|---|---|
| `writing-mode: vertical-rl` | 48 | `sideways-rl/lr` since 132 |
| `text-orientation: mixed / upright` | 48 / 12 | |
| `text-combine-upright: all` | 48 | Fits the run into 1em. `digits` is unsupported in every browser ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/text-combine-upright)). Auto-TCY is therefore a preprocessing step: wrap `!!`, `!?` and short digit runs in spans. |
| `ruby-position: over/under` | 84 | `alternate` unsupported; `inter-character` only prefixed (partial) |
| `ruby-align` | 128 | |
| `line-break: strict` | 58 unprefixed | See the note below the table. |
| `word-break: auto-phrase` | 119 | For `ja`, uses the BudouX C++ port ([Chrome blog](https://developer.chrome.com/blog/css-i18n-features)) |
| `text-spacing-trim` | 123 | Chrome only |
| `text-autospace` | 140 | `normal` and `no-autospace` only |
| `hanging-punctuation` | not supported | Safari only |
| `@font-face unicode-range` / `size-adjust` | 1 / 92 | A composite kana/kanji font is two `@font-face` rules. |

About `line-break: strict` ([CSS Text 3](https://www.w3.org/TR/css-text-3/#line-break-property)):
- `normal` and `strict` both forbid breaks before small kana and ー, before iteration marks, and inside inseparables such as `…`.
- `strict` additionally forbids breaks before 〜 and ゠.

### 1.6 Headless rendering (Playwright or Puppeteer)

- **DPI.** `device_scale_factor` sets the device pixel ratio. Screenshots default to `scale="device"`, and `omit_background` gives a transparent PNG ([Playwright params](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/api/params.md)). For 600 dpi, use a scale factor of 600/96 = 6.25, since a CSS pixel is 1/96 inch. `locator.screenshot()` captures a single element, for example one balloon's text block ([screenshots](https://playwright.dev/python/docs/screenshots)).
- **PDF.** `page.pdf()` works only in headless Chromium ([Checkly](https://www.checklyhq.com/docs/learn/playwright/generating-pdfs/)). It adjusts colours for print unless `-webkit-print-color-adjust` is set, and it can emulate screen media ([Playwright](https://playwright.dev/python/docs/api/class-page#page-pdf)).
- **Browser choice.** `channel="msedge"` or `"chrome"` drives the installed branded browser in Chrome's new headless mode, which differs from the "headless shell" Playwright uses by default ([browsers](https://playwright.dev/python/docs/browsers)). Playwright needs Windows 11 or later ([intro](https://playwright.dev/python/docs/intro)).
- **Local state.** Edge 153 and Chrome 153 are installed; Node is v18.16.0; Playwright is not. For golden-image tests, pin Playwright's bundled Chromium, since the system Edge auto-updates (inference).

### 1.7 TeX (LuaTeX-ja / upLaTeX)

- LuaTeX-ja (manual 20260517.0) switches between yoko (horizontal) and tate (vertical) directions with `\yoko` and `\tate` ([manual](https://ctan.math.illinois.edu/macros/luatex/generic/luatexja/doc/luatexja-en.pdf)).
- `jlreq` (BSD, 2026-07-17) implements the W3C JLREQ layout rules for LuaTeX-ja, pLaTeX and upLaTeX ([CTAN](https://ctan.org/pkg/jlreq)) and provides `\tatechuyoko` ([jlreq](https://github.com/abenori/jlreq)).
- PXrubrica sets ruby per JLREQ and JIS X 4051, including vertical text in LuaTeX-ja ([PXrubrica](https://github.com/zr-tex8r/PXrubrica)).
- Verdict: best-in-class kinsoku and ruby. The cost is a TeX installation, a compile per balloon or page, and then compositing the PDF. A fallback, not the main path.

### 1.8 What Clip Studio Paint and InDesign do

**Clip Studio Paint** ([text](https://help.clip-studio.com/en-us/manual_en/480_text/Vertical_text_and_readings.htm), [balloons](https://help.clip-studio.com/en-us/manual_en/540_comic/Balloons.htm), [frames](https://help.clip-studio.com/en-us/manual_en/540_comic/Frames_and_Panels.htm), [tones](https://help.clip-studio.com/en-us/manual_en/540_comic/Screentones.htm), [line settings](https://help.clip-studio.com/en-us/manual_en/810_subtools/D.htm)):
- **Text:** a vertical text direction; automatic TateChuYoko for runs of 0–4 characters, or applied manually; ruby with size, position and spacing controls.
- **Balloons:** ellipse, curve and polyline tools; tail tools with bend and width; a balloon can be drawn over existing text.
- **Frames:** frame-border folders that mask their contents, and a divide tool with separate horizontal and vertical gutters.
- **Tones:** frequency in lines per inch, an angle, and many dot types (circle, square, lozenge, line, cross, ellipse, noise and more).
- **Focus and speed lines:** a parameter model that §5.2 borrows.

**InDesign.** Adobe's help pages refused direct fetch, so these points come from search extracts:
- composite fonts assign a font per class (Kanji, Kana, Punctuation, Symbols, Latin, Numbers);
- hard and soft kinsoku sets, where soft omits long-vowel marks and small kana;
- tate-chu-yoko, ruby and burasagari (hanging punctuation) ([Adobe](https://helpx.adobe.com/indesign/using/composing-cjk-characters.html); [TCY](https://helpx.adobe.com/indesign/desktop/language-and-proofing/chinese-japanese-and-korean/apply-tate-chu-yoko-in-vertical-text.html)).

**The manga font convention.** アンチック体 has long been the balloon face: mincho-style kana with gothic kanji ([Adobe JP blog](https://blog.adobe.com/jp/publish/2023/11/16/cc-design-tenmin-antique)).
- Adobe's 貂明朝アンチック combines Ten Mincho kana with Source Han Sans kanji, in six weights (same source).
- The free **源暎アンチック** (SIL OFL 1.1) already combines both scripts in one file. It has about 18,000 glyphs, vertical composition samples, and manga-specific symbols, including dakuten on every kana from v5 ([okoneya](https://okoneya.jp/font/genei-antique.html); [mirror](https://github.com/tani/genei-fonts-mirror)).
- A pre-composited font removes the need to mix two fonts at runtime.

### 1.9 What any do-it-yourself engine must implement

- **Per-character orientation** from UAX #50's Vertical_Orientation property (U, R, Tu, Tr; Unicode 18.0) ([UAX #50](https://www.unicode.org/reports/tr50/)).
- **`vert` substitution:** it shifts small kana and rotates brackets. The optional **`vchw`** feature adds contextual half-width punctuation spacing when the engine lacks JLREQ spacing; it cannot be combined with `vhal` or `vpal` ([OpenType u–z](https://learn.microsoft.com/en-us/typography/opentype/spec/features_uz)).
- **Kinsoku** per JLREQ §3.1.7–3.1.10 ([JLREQ](https://www.w3.org/TR/jlreq/)):
  - closing brackets, full stops, commas and middle dots may not start a line;
  - rules for small kana, ー and iteration marks may be relaxed;
  - opening brackets may not end a line;
  - `‥` and `…` may not be split.
- **TCY** per JLREQ §3.2.5, and **ruby** per §3.3.
- **Phrase-aware breaks** with **BudouX** ([GitHub](https://github.com/google/budoux)): Apache-2.0, a standalone model of about 15 KB, with a Python package. Manga balloons break at phrase boundaries, which is exactly its job.
- **manga-image-translator does none of the kinsoku or TCY work** (§2), so it cannot be lifted as-is.

---

## 2. Existing open-source tools

| Tool | Licence | Worth reading | Gaps |
|---|---|---|---|
| **manga-image-translator** ([repo](https://github.com/zyddnys/manga-image-translator)) | GPL-3.0 | See the note below the table. | No kinsoku and no TCY (checked in source). Presentation forms depend on the font covering them; `vert` is better. |
| **BallonsTranslator** ([repo](https://github.com/dmMaze/BallonsTranslator)) | GPL-3.0, PyQt6 | `utils/text_layout.py` ([mirror](https://huggingface.co/datasets/dlxjj/BallonsTranslator/blob/main/utils/text_layout.py)): **centre-outward layout on the balloon mask.** The first word sits at the mask centroid; each line grows left and right while the mask stays inside the balloon; then the lower and upper halves are laid out; an aspect-ratio test handles overflow. | Its vertical layout "awaiting improvement" (README). It crashes when the mask size mismatches ([#702](https://github.com/dmMaze/BallonsTranslator/issues/702)). |
| **comic-translate** ([repo](https://github.com/ogkalu2/comic-translate)) | **Apache-2.0**, PySide6 | `render.py`: binary search over font size, greedy per-character wrap for scripts without spaces, and a 30% shrink of the bubble box for vertical blocks | Fits text only; does no layout. |
| **mokuro** ([repo](https://github.com/kha-white/mokuro)) | GPL-3.0 | Its legacy overlay uses inline `writing-mode: vertical-rl` with OCR-derived font sizes clipped to 12–32 px ([overlay_generator.py](https://github.com/kha-white/mokuro/blob/master/mokuro/legacy/overlay_generator.py)). That is proof that CSS vertical text lines up with manga balloons. | The legacy HTML is frozen. |
| **Kumiko** ([repo](https://github.com/njean42/kumiko)) | AGPL-3.0 | Panel detection from OpenCV contours, right-to-left numbering, JSON output | Detects panels; does not lay them out. |
| **Krita** | GPL | Its panel tool cuts gutters, sizing them from the cut angle ([docs](https://docs.krita.org/en/reference_manual/tools/comic_panel_editing_tool.html)). The text tool does vertical text and text-in-shape ([docs](https://docs.krita.org/en/reference_manual/tools/text.html); rewritten in 5.3, [notes](https://krita.org/en/release-notes/krita-5-3-release-notes/)). A comics-manager plugin exports with metadata ([plugins](https://docs.krita.org/en/reference_manual/default_python_plugins.html)). | Interactive program, not a library. |
| **Inkscape** | GPL | Renders CSS3 `writing-mode` and `text-orientation` since 0.92; Latin is rotated sideways by default ([0.92](https://wiki.inkscape.org/wiki/Release_notes/0.92)). | Interactive program. |
| **Scribus** | GPL | — | No native vertical CJK text **(unverified)**. |
| **Comicgen** ([repo](https://github.com/gramener/comicgen)) | MIT code; art under a mix of CC0 and CC-BY | SVG characters with speech-bubble layers, served from a web API | Not a page composer. |
| **KCC** ([repo](https://github.com/ciromattia/kcc)) | ISC | Manga mode (right-to-left plus page splitting) exporting EPUB, KEPUB, MOBI, CBZ and PDF | A converter only. |
| **resvg** ([repo](https://github.com/linebender/resvg)) | Apache-2.0 / MIT | An SVG rasteriser with no browser. `writing-mode` is absent from its unsupported list ([list](https://github.com/linebender/resvg/blob/main/docs/unsupported.md)). | Vertical Japanese is untested **(unverified)**. |

What to read in manga-image-translator:
- `text_render.py` places vertical glyphs with freetype-py, using `vertBearingX/Y` and `vertAdvance`.
- Its `CJK_H2V` table maps punctuation to Unicode vertical presentation forms (「→﹁, !→︕), and it rotates ー by 90°.
- Columns wrap when the accumulated `vertAdvance` exceeds the maximum height.
- Outlines come from FreeType's `Stroker` (radius 0.07 × font size), and English is hyphenated with pyphen.
- `resize_regions_to_font_size` grows the box along one axis by the number of rows needed, with a minimum font size of (w+h)/200.
- The text block is warped into its region with a homography ([text_render.py](https://github.com/zyddnys/manga-image-translator/blob/main/manga_translator/rendering/text_render.py), [rendering/__init__.py](https://github.com/zyddnys/manga-image-translator/blob/main/manga_translator/rendering/__init__.py)).

I found no maintained Python library for balloon shapes or page layout, and no open web comic creator with vertical Japanese **(unverified negative; the search budget ran out)**. Shapely (installed here, 2.1.2) plus the TikZ shape algorithms in §4 cover the need.

---

## 3. Research: balloon placement and page layout

### Comic Chat — Kurlander, Skelly & Salesin, SIGGRAPH 96 ([PDF](https://www.kurlander.net/DJ/Pubs/SIGGRAPH96.pdf))

**Inputs.**
- The utterances in order, with a speaker for each.
- The x position of each speaker's face centre.
- A band for balloons above the tallest head.

**Constraints.**
- Balloons read top-down, and left-to-right at equal height.
- Part of each balloon floats over its speaker's face.
- Tails stay clear of other balloons and tails.

**Algorithm.** Balloon bodies are placed greedily; tails are placed afterwards, once all bodies are fixed. For each balloon *j*:
1. Pick a random target width between a minimum and the panel width. The minimum is the larger of the widest word and area ÷ allowable height, where area is one typeset line scaled up by a third.
2. Set the "routing channel" R_j = [x_j − w_j, x_j + w_j].
3. Trim R_j with `MaxAllowable` so every earlier channel keeps at least tail width *t* and still contains its speaker's x.
4. If R_j is still wide enough, place the balloon at a random position inside it. Otherwise `SqueezeBalloon` it narrower. If that also fails, the panel is full.
5. Shrink the earlier channels with `ReduceChannel`.
6. For height: place each balloon as high as possible while staying no higher than the bottom of already-placed balloons to its right, and no higher than the top of those to its left.

**Overflow.** A balloon too large for any panel is split into smaller balloons, with ellipses marking the break.

**Balloon bodies.**
- Text is centred per line, with a margin.
- The outline is a B-spline at tension 5.0.
- It never dips inwards for a single line, and ignores small changes in line width.
- Low-frequency waves are added along long straight runs.

**Tails.**
- They attach under the last line of text, inside the balloon's routing channel.
- All tips end at a common height, in the lowest third of the balloon band.
- They curve counter-clockwise or clockwise depending on the side, and end above the speaker's face.

**New panels** start when layout fails, when there would be more than five characters, or when one character would speak twice.

**Cheap version for manga.**
- Mirror x.
- Swap "right" and "left" in the height rule.
- Run it per panel, with the balloon band taken from the panel's free-space mask, not a strip.

### Chun et al. 2006 — "An Automated Procedure for Word Balloon Placement in Cinema Comics"

- Published at ISVC 2006, LNCS 4292, pp. 576–585 ([DOI](https://doi.org/10.1007/11919629_58)).
- Semantic Scholar's summary says it places balloons by applying a **cartographic label-placement algorithm**, with results comparable to hand-drawn comics ([S2](https://api.semanticscholar.org/graph/v1/paper/DOI:10.1007/11919629_58)). The abstract is closed, so any finer detail is **(unverified)**.

**Cheap version.** Treat balloons as point-feature labels (Christensen, Marks & Shieber 1995, [DOI](https://doi.org/10.1145/212332.212334)): discrete candidate positions per label, a problem shown to be NP-hard, solved with discrete gradient descent or simulated annealing and compared empirically.
- **Candidates:** 8–16 positions around the speaker's head, inside the panel's safe area.
- **Cost terms:**
  - overlap with faces or an importance mask from the JSON;
  - overlap between balloons and between tails;
  - distance from speaker to tail tip;
  - violations of right-to-left reading order;
  - tail crossings.

### Cao, Chan & Lau 2012 — "Automatic Stylistic Manga Layout" ([abstract](https://scholars.cityu.edu.hk/en/publications/automatic-stylistic-manga-layout))

- **Inputs:** a set of artworks with user-specified semantics.
- **Models:** three parametric style models — layout structure, panel importance and panel shape.
- **Stage 1:** a generative probabilistic framework picks the initial layout that best fits the artworks and the structure model.
- **Stage 2:** the layout and the artwork geometry are refined jointly by optimisation.

**Cheap version:**
- a small library of guillotine layouts (recursive straight cuts), one set per panel count;
- panel area in proportion to the script's importance weight;
- a few cuts randomly tilted a few degrees;
- each crop box optimised to keep the subject's region of interest and leave balloon space.

### Cao, Lau & Chan 2014 — "Look Over Here" ([abstract](https://scholars.cityu.edu.hk/en/publications/look-over-here-attention-directing-composition-of-manga-elements))

- A probabilistic graphical model links the artist's guiding path, the panel elements (subjects and balloons), and viewer attention. It is learned from a small set of manga pages.
- It measurably improved readability and appeal, and let novices compose faster than with commercial tools.

**Cheap version:**
- give each panel an entry and an exit point along the page's right-to-left, top-down path;
- place balloons in reading order along that path;
- penalise balloons that cover faces.

### The video-to-comics line: Hong 2010, Wang 2012, Jing 2015, Yang 2021

Summarised by Yang et al. 2021 ([arXiv:2101.11111](https://arxiv.org/abs/2101.11111), read via [ar5iv](https://ar5iv.labs.arxiv.org/html/2101.11111)):
- **Hong:** mapped the script to faces, then placed the balloon near the speaker with its tip pointing at them.
- **Wang:** replaced the script with speech recognition.
- **Jing:** content-aware layout that maximised the information per page, with a fixed balloon shape.

**Yang 2021 itself** lays out pages with a genetic algorithm (costs: panels per page, uniformity of maximum importance across pages, semantic coherence), finds speakers from dlib mouth landmarks plus lip motion, and picks round, thought or jagged balloons and the font size with an SVM on audio and subtitle emotion.

### Learning-based work, 2024–25

- **MangaDiffusion** ([arXiv:2412.19303](https://arxiv.org/abs/2412.19303)) generates multi-panel pages from plain text (Manga109Story dataset), stressing correct panel counts and varied layouts.
- **DiffSensei** ([arXiv:2412.07589](https://arxiv.org/abs/2412.07589)) pairs a multimodal LLM with diffusion and masked cross-attention for character layout (MangaZero: 43,264 pages).
- Both are image generators with no balloon geometry; a JSON-driven renderer does not need them.

---

## 4. Balloon shapes and lettering

- **Balloon from text box.** PGF's `ellipse` node multiplies the text box's half-extent by 1.4142136 ([PGF source](https://github.com/pgf-tikz/pgf/blob/master/tex/generic/pgf/libraries/shapes/pgflibraryshapes.geometric.code.tex)). That is the ellipse with the box's aspect ratio that passes through its corners; add padding after.
- **The lens or "diamond" text shape.** TeX's `\shapepar` fills a diamond or circle and scales the text to fill it ([CTAN](https://ctan.org/pkg/shapepar)).
  - Algorithm: for *n* lines, or columns in vertical Japanese, the target length of line *i* is the chord of the inner ellipse at that line's offset, L_i = 2a·√(1−(y_i/b)²) − 2·pad.
  - Break the text with a Knuth–Plass-style dynamic program ([DOI](https://doi.org/10.1002/spe.4380111102)) that minimises Σ(L_i − len_i)².
  - Penalties: an infinite cost for breaks kinsoku forbids; a low cost at BudouX phrase boundaries; a high cost mid-phrase.
  - Loop over *n* and font size.
  - Vertical Japanese gets long centre columns and short outer ones: the classic manga balloon.
- **Auto-sizing.** Two ways round:
  - text first: set the text, then wrap the ellipse around it;
  - region first: binary-search the font size into a fixed balloon, as comic-translate does.
- **Cloud (thought) balloons.** TikZ's cloud is made of puffs (10 by default), each an arc of 135°, sitting on a "circum-ellipse" through the puff midpoints ([TikZ shapes](https://tikz.dev/library-shapes)).
- **Burst (shout) balloons.** TikZ's starburst puts its inner points on the ellipse that fits the content, and its outer points at random heights between h and h/4. It has 17 points by default and a seeded random generator (same source). Seed it from the balloon id so re-renders are identical.
- **Whisper balloons.** Comic Chat draws a thick white halo, then a thin dashed outline (§3).
- **Tails.**
  - A tail points to the mouth "as if continuing" to the face, stops 50–60% of the way there, and avoids tangents ([Blambot](https://www.blambot.com/pages/comic-book-grammar-tradition)).
  - Comic Chat's rules add arcs, a common tip height, and clockwise or counter-clockwise curves by side.
  - Geometry: two quadratic Béziers from base points on the outline to the tip, bent by an offset perpendicular to the base–tip line. Union the tail with the body before stroking the outline once. Use Shapely `unary_union` and `buffer` for halos, margins and joined balloons ([buffer](https://shapely.readthedocs.io/en/stable/reference/shapely.buffer.html)).

---

## 5. Effects

### 5.1 Screentone (amplitude-modulated halftone)

**The PostScript model ([PLRM](https://www.adobe.com/jp/print/postscript/pdfs/PLRM.pdf) §7.4.4, pp. 485–487):**
- Each halftone cell has local coordinates in [−1, 1].
- A *spot function* ranks the pixels of a cell in the order they turn white as the tone lightens.
- The frequency is cells per inch, and the angle orients the grid.
- The manual's round-dot example is (cos 180x + cos 180y)/2, with the angle in degrees.

A numpy version:

```python
f = lpi / dpi                                    # cells per pixel
u = (xx*np.cos(a) + yy*np.sin(a)) * f            # rotated screen coords
v = (-xx*np.sin(a) + yy*np.cos(a)) * f
fx = 2*(u - np.floor(u)) - 1; fy = 2*(v - np.floor(v)) - 1
spot = (np.cos(np.pi*fx) + np.cos(np.pi*fy)) / 2  # round dot; swap for line/square
T = rank_normalise(spot)                          # empirical CDF → exact coverage
ink = tone_map > T                                # tone_map may be a gradient
```

- Swap in other spot functions for other dot types: CSP offers circle, square, lozenge, line, cross, ellipse, noise and more (§1.8). The PLRM describes a line screen as distance from a line through the cell centre.
- **Rulings.** Typical print rulings are 65 lpi on a 300 dpi laser and 85–185 lpi offset ([Wikipedia](https://en.wikipedia.org/wiki/Halftone)). The usual manga-tone range of about 55–70 lpi is **(unverified)**.
- **Resolution.** Generate tone at the final output resolution, because rescaling tone produces moiré (same source). For the Foundry screen version, regenerate the tone at screen resolution or replace it with flat grey.
- python-halftone's dot-per-cell drawing is simpler but softer-edged ([repo](https://github.com/philgyford/python-halftone)).

### 5.2 Focus lines (集中線) and speed lines (流線)

**CSP's parameter model** ([D.htm](https://help.clip-studio.com/en-us/manual_en/810_subtools/D.htm), [concept](https://help.clip-studio.com/en-us/manual_en/540_comic/Speed_lines_and_Focus_lines.htm)):
- gap between lines, with "disarray" (randomness);
- grouping into bundles, with a gap between groups;
- a maximum line count;
- length, with its own disarray;
- extension past the frame;
- a reference position with an uneven offset;
- for focus lines, a circle whose size sets how far from the centre the lines start.

**Implementation (my design):**
1. **Angles.** Accumulate jittered angular gaps. For bundles, emit *k* close lines, then one large gap.
2. **Inner ends.** Put each inner end on an ellipse, with radius r(θ)(1 + unevenness noise).
3. **Outer ends.** Take each outer end beyond the page corner.
4. **Shape.** Draw each line as a tapered wedge (入り抜き: fat at the outer end, a point at the inner end).
5. **Raster.** Fill the polygons at print DPI with skia or supersampled Pillow, then threshold to 1-bit.
6. **Vectorised alternative.** Convert every pixel to polar (ρ, φ) and find the nearest line angle with `np.searchsorted`. The pixel is inked if |φ−θ_i| < w_i·taper(ρ)/ρ and ρ > r_i.
7. **Speed lines.** Use the same scheme in a rotated (along, across) frame: random offsets across, random start and end along, and both ends tapered. For curved flow, map the "along" axis onto an arc.

### 5.3 Hand-drawn jitter for SFX

- **RoughJS** (MIT) ([algorithms](https://shihn.ca/posts/2020/roughjs-algorithms/), [repo](https://github.com/rough-stuff/rough)):
  - randomise line endpoints by a roughness value;
  - bow each line through random points at 50% and 75%;
  - draw it twice, damping roughness on long lines;
  - build ellipses from perturbed sample points that deliberately overlap and do not close.
- **matplotlib's sketch filter** is the same idea: amplitude (`scale`), wiggle `length` and `randomness`; `xkcd()` defaults to 1/100/2 ([sketch](https://matplotlib.org/stable/api/_as_gen/matplotlib.artist.Artist.set_sketch_params.html), [xkcd](https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.xkcd.html)).
- **For SFX glyphs:**
  1. Take outlines from uharfbuzz `draw_glyph`.
  2. Resample them at an even spacing.
  3. Displace points along their normals with low-frequency noise.
  4. Give each glyph a random rotation and scale.
  5. Stroke a white halo and a black outline with Shapely `buffer`.

---

## 6. Output formats

- **Right-to-left PDF.** In pypdf, call `create_viewer_preferences()`, then set `viewer_preferences.direction = "/R2L"` ([pypdf](https://pypdf.readthedocs.io/en/stable/user/viewer-preferences.html)). The same object has a `duplex` hint (for example DuplexFlipShortEdge), and `page_layout = "/TwoPageRight"` puts odd pages on the right ([PdfWriter](https://pypdf.readthedocs.io/en/stable/modules/PdfWriter.html)). pypdf is BSD-3; version 6.19.0 is installed here.
  - How well viewers honour `/Direction` varies **(unverified beyond pdf.js)**.
  - **Local source:** Foundry v14 bundles `@foundryvtt/pdfjs` 4.0.379. Its worker parses `Direction`, but its viewer never reads viewer preferences. It only maps `TwoPageRight`/`TwoColumnRight` to "EVEN" spreads and `TwoPageLeft` to "ODD" (`node_modules/@foundryvtt/pdfjs/web/viewer.mjs`, `apiPageLayoutToViewerModes`).
- **CBZ.** In ComicInfo.xml (schema v2.0, v2.1 draft), `Manga=YesAndRightToLeft` sets right-to-left reading; `<Page>` carries `Type`, `DoublePage` and image size; `LanguageISO` takes BCP 47 ([Anansi](https://anansi-project.github.io/docs/comicinfo/documentation)).
- **Fixed-layout EPUB.** Set `page-progression-direction="rtl"` on the spine, `rendition:layout` to `pre-paginated`, `rendition:spread`, and `page-spread-left`/`page-spread-right` on items, with a viewport meta tag in each page ([EPUB 3.3](https://www.w3.org/TR/epub-33/)). KCC can produce these (§2).
- **Booklet imposition.**
  - **pdfimpose** (AGPL-3.0; 2.9.0, March 2026): `saddle.impose(..., bind='left'|'right'|'top'|'bottom', creep=..., folds=..., imargin=..., omargin=..., mark=['crop'])` ([docs](https://pdfimpose.readthedocs.io/en/latest/lib/saddle/), [PyPI](https://pypi.org/project/pdfimpose/)).
  - **LaTeX pdfpages:** `booklet*` and `signature*` for right-edge binding, plus `flip-other-edge` for duplex ([manual](https://ctan.math.illinois.edu/macros/latex/contrib/pdfpages/pdfpages.pdf)).
  - **cpdf 2.9:** `-impose-xy "2 1"` with `-impose-rtl`, but you must order the pages yourself ([manual](https://www.coherentpdf.com/cpdfmanual.pdf)).
  - **Do it yourself** with pypdf's `merge_transformed_page` and `Transformation().translate/rotate` ([pypdf](https://pypdf.readthedocs.io/en/stable/user/cropping-and-transforming.html)).
  - Right-to-left saddle order for *n* pages (a multiple of 4), sheet *k*, shown as left | right: outside = [2k+1 | n−2k], inside = [n−2k−1 | 2k+2]. That is the left-to-right order mirrored. This is my derivation; check it on a paper dummy.
- **1-bit output.**
  - Pillow writes mode-"1" PNGs at bit depth 1 ([PngImagePlugin](https://github.com/python-pillow/Pillow/blob/main/src/PIL/PngImagePlugin.py)).
  - TIFF `group3`, `group4` and `tiff_ccitt` compression need libtiff and mode "1" ([formats](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html)). libtiff 4.7.1 is present here.
  - Pillow's PDF writer uses TIFF encoding for 1-bit images (same page).
  - img2pdf (LGPL-3.0) embeds PNG, JPEG, JPEG2000, CCITT-G4 TIFF and JBIG2 without re-encoding ([PyPI](https://pypi.org/project/img2pdf/)).

---

## 7. Foundry VTT (v12–v14)

**Core.** Journal pages come in four types: text, image, video and PDF. "Show Players" works on a whole entry or a single page, for everyone or chosen players ([KB](https://foundryvtt.com/article/journal/)). In the v14 source (`client/documents/collections/journal.mjs`, lines 56–138):
- `Journal.show(doc, {force, users})` opens the parent entry in SINGLE view at that page and grants temporary OBSERVER permission.
- `Journal.showImage(src, {users, ...})` sends `shareImage`, which opens an ImagePopout.
- ImagePopout has been an ApplicationV2 with `shareImage()` since v13 ([API](https://foundryvtt.com/api/v13/classes/foundry.applications.apps.ImagePopout.html)).
- A PDF page's "Load PDF" button (it needs OBSERVER) swaps in an iframe running the bundled pdf.js viewer (`journal-entry-page-pdf-sheet.mjs`). Spreads there come out left-to-right (§6).

**Community modules** (package pages, read 2026-09-26):

| Module | Version | Foundry compatibility | What it offers |
|---|---|---|---|
| Monk's Enhanced Journal ([page](https://foundryvtt.com/packages/monks-enhanced-journal)) | 14.01 | verified 14 | Picture and Slideshow journal types |
| Monk's Common Display ([page](https://foundryvtt.com/packages/monks-common-display)) | 14.01 | verified 14 | A shared "TV" display |
| PDF Pager ([page](https://foundryvtt.com/packages/pdf-pager)) | 14.1.0 | verified 14.362 | Opens a PDF at a given page; reads outlines |
| Storyteller ([page](https://foundryvtt.com/packages/storyteller)) | — | maximum 11 | Open-book view; last updated about 2 years 8 months ago |
| PDFoundry ([page](https://foundryvtt.com/packages/pdfoundry)) | — | verified 9 | Last updated 4 years ago |
| JTCS Art Gallery ([page](https://foundryvtt.com/packages/journal-to-canvas-slideshow)) | — | maximum 10 | Art slideshows |

I found no maintained right-to-left comic reader module **(unverified negative)**.

**Page-flip libraries.** StPageFlip is MIT-licensed, renders to canvas or HTML, and has no right-to-left option ([repo](https://github.com/Nodlik/StPageFlip)). turn.js needs jQuery and its third release is under a non-commercial BSD licence ([repo](https://github.com/blasten/turn.js)). Avoid turn.js.

**Building a viewer is straightforward.** ApplicationV2 supplies `DEFAULT_OPTIONS` (id, classes, window, actions, position), routing of `data-action` clicks, and `_prepareContext` and `_onRender` hooks ([API](https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html)). This module already has most of the pieces:
- It targets v14 and declares `"socket": true` (`module.json`).
- `scripts/foundry/opening-titles.mjs` already does GM broadcast over the module socket plus a local run, because Foundry does not echo a message back to its sender, and has a per-player choice dialog built as `HandlebarsApplicationMixin(ApplicationV2)`.
- v14 adds a `user` settings scope, stored in the world database (`common/constants.mjs:2258`). That is the place for each player's language and reduced-motion choice.
- `scripts/foundry/handouts.mjs` and `core/handouts.mjs` (uncommitted, dated today) already file journal pages into players' "Papers" and show them. Filing each comic page there as an image page gives players a durable copy to reread.

The viewer itself: JP and EN page arrays with a language toggle; spreads shown as [n+1 | n] with `flex-direction: row-reverse`; ← means "next"; preloading; and an optional GM "follow me" broadcast of `{comicId, page}`. Serve **pre-rendered PNG/WebP pages**, never live CSS vertical text, because players' browsers differ (`text-spacing-trim` is Chrome-only, §1.5). My estimate is 200–300 lines plus a template.

---

## Recommended architecture options

| | **(A) Pure Python** (Pillow+raqm, or better uharfbuzz + FreeType/skia) | **(B) SVG/HTML rendered by headless Chromium** | **(C) Hybrid** |
|---|---|---|---|
| **Typography** | You write UAX #50 orientation, kinsoku, TCY, ruby, mixed fonts and phrase breaks (BudouX helps). Pillow's own ttb path needs a FriBiDi DLL, advances columns left-to-right and only wraps left-to-right. | Native vertical-rl, TCY via `all`, ruby, strict line breaks, auto-phrase, `text-spacing-trim`, `unicode-range` composite fonts. No hanging punctuation and no `digits` TCY. | Chromium sets the text only. |
| **Art and effects** | Excellent: numpy tone at print DPI, exact 1-bit, deterministic | Weak: anti-aliasing, resampling and moiré; 1-bit images may be re-encoded in PDF **(unverified)** | Python does geometry, cropping, balloons, tone, lines, SFX and compositing |
| **Output** | PNG/TIFF/CBZ directly; vector text only via skia's PDF | Vector PDF; RGB only | Lossless raster page (img2pdf) with a Chromium text-layer PDF overlaid via pypdf, plus PNGs |
| **Fit to repo** | Same stack as the title renderer (Pillow + numpy; Python `unittest`) | New runtime (Playwright ~ Chromium build) | Two runtimes over one JSON contract |
| **Main risks** | Subtle typography bugs; large effort; you become the JLREQ implementer | Browser upgrades shift line breaks (pin Playwright's Chromium); memory at 600 dpi; per-page latency | Page boxes must line up exactly between the two engines (same point size, `@page` size); fonts must be identical in both; ruby degrades if thresholded to 1-bit (keep the text layer grey or vector) |

**Recommendation: (C).**
1. Python writes one small HTML document per page, with absolutely positioned text boxes that each carry `writing-mode`, TCY spans and ruby.
2. Playwright measures each box (`getBoundingClientRect`).
3. Python sizes the balloons and tails to those exact metrics.
4. Playwright renders the text layer, either as a transparent PNG at print DPI or as a vector PDF page.
5. Python composites the layers and assembles PNG, the right-to-left PDF, CBZ, the booklet and the Foundry images.

Keep a uharfbuzz measuring path (A) as a browser-free fallback, useful as a unit-test oracle for metrics and punctuation. Use Genei Antique so that mixed kana/kanji fonts become a font choice rather than engine work.

## Best sources

1. https://www.kurlander.net/DJ/Pubs/SIGGRAPH96.pdf — Comic Chat: complete balloon layout, body and tail rules with pseudo-code.
2. https://www.w3.org/TR/jlreq/ — Japanese layout requirements: kinsoku, tate-chu-yoko, ruby.
3. https://www.w3.org/TR/css-text-3/#line-break-property — the exact normal/strict/loose break rules for Japanese.
4. https://github.com/mdn/browser-compat-data — ground truth for Chromium's vertical-text, ruby and trim support.
5. https://github.com/python-pillow/Pillow/blob/main/src/_imagingft.c — why raqm is off on Windows without FriBiDi.
6. https://fonttools.readthedocs.io/en/latest/pens/freetypePen.html — uharfbuzz + FreeType vertical Japanese example.
7. https://learn.microsoft.com/en-us/typography/opentype/spec/features_uz — `vert`, `vrt2`, `vchw`, `vpal`, `vkrn` semantics.
8. https://github.com/zyddnys/manga-image-translator/blob/main/manga_translator/rendering/text_render.py — working vertical glyph placement to learn from and improve on.
9. https://tikz.dev/library-shapes — parametric cloud, starburst and callout shapes.
10. https://pdfimpose.readthedocs.io/en/latest/lib/saddle/ — saddle-stitch imposition with `bind='right'`.
