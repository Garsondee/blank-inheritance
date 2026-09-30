# Midjourney for black-and-white manga, and the printed look

*Part of the [manga research shelf](README.md), gathered 2026-09-26 for [`design/propaganda-manga.md`](../../propaganda-manga.md). **Research, not lore, and not a decision:** it says what the sources say and what might transfer, and the plan decides. Every factual claim links its source; **(unverified)** marks what could not be confirmed. It names real works, people and places because it is GM-facing; none of them belongs in the comic. Midjourney changes month to month: the model and feature facts here are as read from its own documentation on 2026-09-26.*

**Method and reliability.** Midjourney's documentation and update posts were read directly on 2026-09-26 (the docs through the site's public help-centre API; links are the normal page URLs, with each doc's last-updated date). My web-search allowance ran out before I could cross-check a few community claims; those are marked **(unverified)**. The 2026 community prompt guides are mostly untested SEO pages, so treat them as things to try, not evidence.

---

## 0. Key findings

1. **The default model is V8.2 (since 24 July 2026), and V8.x has no Omni Reference or Character Reference.** Both are replaced by the **Edit Model**, which takes up to four reference images (§1.3).
2. **Aspect-ratio trap.** With Edit Model references, the default aspect ratio set in the web UI is ignored unless the prompt contains `--ar` (§1.6).
3. **Privacy trap.** Edit Model results, including the uploaded references, are public on midjourney.com unless Stealth mode is on, and Stealth needs the Pro or Mega plan (§5).
4. **Pixel budget.** A V8.2 HD image at 2:3 is 1792×2688 px, about 76×114 mm at the 600 dpi printers ask for, so line art must be upscaled before it is thresholded (§4).
5. **Screen tones in our own code, not in Midjourney.** Use round dots at 45°, 60 lpi and 600 dpi, and keep tones between 10% and 80% (§4.1, §4.4).
6. **Use flat greys on screen.** Dot screens produce moiré at arbitrary zoom levels (§4.6).
7. **Precedent.** Rootport sifted 100–200 images per panel. Every account of AI comics names character drift as the main problem (§3).

---

## 1. Midjourney's current models and features (as of 26 Sep 2026)

### 1.1 Versions

| Model | Status and dates | What Midjourney says it is good at |
|---|---|---|
| **V8.2** | Default since 24 Jul 2026 | Bolder, more creative results; better Personalization; ships with the Edit Model ([Version doc](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version); [V8.2 post](https://updates.midjourney.com/version-8-2/)) |
| **V8.1** | Released 14 Apr 2026; default 10 Jun–23 Jul 2026 | Fastest model; holds small prompt details well; Raw gives stricter prompt adherence ([Version doc](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version)). Renders text better than earlier versions ([V8.1 default post, 11 Jun 2026](https://updates.midjourney.com/v8-1-is-now-the-default-model/)) |
| V8.0 | Alpha only, 17 Mar–24 Jul 2026; retired | Its alpha post warned that V7 prompts may not transfer and that longer, more specific prompts suit it ([V8 alpha](https://updates.midjourney.com/v8-alpha/)) |
| **V7** | 3 Apr 2025; default 17 Jun 2025–9 Jun 2026; still selectable | Precision; more coherent bodies, **hands** and objects; introduced Draft mode and Omni Reference ([Version doc](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version)) |
| **Niji 7** | 9 Jan 2026 (made with Spellbrush) | Anime model: clearer eyes and fine detail; more literal; a cleaner, flatter look to show off its line work ([Version doc](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version); [Niji V7 post](https://updates.midjourney.com/niji-v7/)). It **has no Omni or Character Reference** ([Blake Crosley guide, upd. 2026-09-22](https://blakecrosley.com/guides/midjourney)), and the Edit Model covers V8.1/8.2 only |

No Midjourney source makes a claim about monochrome or ink output, and I found no V8.2 test of black-and-white manga. One review found only modest gains over V8.1 ([RunThePrompts](https://runtheprompts.com/resources/midjourney-info/midjourney-v8-2-whats-new-and-is-it-better-than-v8-1/)).

### 1.2 Compatibility (from the official chart, upd. 2026-09-01)

| Feature | V7 | V8.1 / V8.2 |
|---|---|---|
| Omni Reference and `--ow` | Yes | **No** (use the Edit Model) |
| Edit Model (up to 4 refs) | No | **Yes** |
| Style Reference, codes and `--sw` | Yes | Yes |
| Personalization and Moodboards | Yes | Yes |
| Seeds | Yes | Yes ("99% identical") |
| Draft mode | Yes | Chart says No; the Draft doc says Yes (see 1.5) |
| HD images (2048 px) | No | Yes (1.3 GPU-min) |
| Editor, Pan, Zoom | Via V6.1 | Via the Edit Model |
| `--no`, Raw, Stylize | Yes | Yes |
| Max aspect ratio | 14:1 | 14:1 (4:1 in HD) |

Source: [Version doc](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version).

### 1.3 Character-consistency tools and how each works in the web UI

- **Edit Model (V8.1/8.2), the current tool.** Click the image icon in the Imagine bar, then drag up to four images into **Attach to prompt**. The lock icon pins them across prompts, and "Quick Edit" on any image sends it there. The model accepts plain instructions as well as descriptions, can change viewpoint ("from the front / from behind"), and can retexture into another style. Midjourney's own tip: if features blend between characters, combine them into *one* reference image. It works with image prompts, style references, moodboards, Personalization and `--hd`. It does not work with `--tile`, and its results cannot be Remixed. GPU cost is 1 minute for SD and 2.3 for HD ([Edit Model doc](https://docs.midjourney.com/hc/en-us/articles/48495453462797-Edit-Model); [GPU doc, upd. 2026-08-28](https://docs.midjourney.com/hc/en-us/articles/32016412137741-GPU-Speed-Fast-Relax-Turbo)). The edit model launched on 27 Aug 2026 and was updated for image quality on 29 Aug; Midjourney itself says it still has many edge cases ([Edit Model for V8 post](https://updates.midjourney.com/edit-model-for-v8/); [RSS](https://updates.midjourney.com/rss/)). I found no independent test of it on manga.
- **Omni Reference (V7 only).** Takes one image in the Omni Reference slot. `--ow` runs 1–1000 (default 100); keep it under 400 unless Stylize is very high. On the web it is an "Omni Strength" slider. It costs twice a normal V7 job. It does not work with Draft or Conversational mode or `--q 4`, and its results cannot go into Vary Region, Pan or Zoom until the reference is removed. Fine details such as freckles and logos may not match ([Omni Reference doc, upd. 2026-09-01](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference)).
- **Character Reference (`--cref`, `--cw`).** Legacy, for V6 and Niji 6 only. `--cw` defaults to 100, its maximum; lower values keep only the face ([Legacy Features](https://docs.midjourney.com/hc/en-us/articles/33329788681101-Legacy-Features)).
- **Style Reference.** Captures medium, texture and lighting, but not people. `--sw` runs 0–1000 (default 100). The docs advise short content prompts that do not fight the reference, and adding style words only when needed. Numeric style codes, `--sref random` and the Style Explorer are also available ([Style Reference doc, upd. 2026-09-01](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference)). The Style Creator builds a custom code over 5–15 rounds, but it renders in V7 and every round spends GPU time ([Style Creator](https://docs.midjourney.com/hc/en-us/articles/41308374558221-Style-Creator)).
- **Moodboards.** A curated image set becomes a `--p` code. Stylize (0–1000) sets its strength; moodboards cannot be combined with `--sw` or `--sv` ([Moodboards](https://docs.midjourney.com/hc/en-us/articles/39193335040013-Moodboards)).
- **Personalization profiles.** Unlocked by picking favourites from a grid; the Global V7 profile works in V8.1/8.2, and extra V8 profiles are possible ([Personalization](https://docs.midjourney.com/hc/en-us/articles/32433330574221-Personalization)).
- **Seeds.** Range 0–4294967295, "99% identical" in V8.x. The docs say plainly that seeds cannot carry a character or style from prompt to prompt and may behave differently in a later session. They are for controlled A/B changes only ([Seeds](https://docs.midjourney.com/hc/en-us/articles/32604356340877-Seeds)).

Before the Edit Model, community practice was one fixed profile, one style reference, a noted seed and a character description never reworded ([ClipDance, 10 Aug 2026](https://clipdance.ai/blog/midjourney-v8-character-consistency)). That discipline still helps.

### 1.4 Editing: Editor, Vary Region, Retexture

- **The web Editor** has a "light" version in the image view and a full **Edit** tab. Its tools include custom aspect ratios, erase brushes, **Smart Select** with "Erase Background", and Layers; **Save Current Edit** exports a transparent PNG with the erased areas cleared. In V8.x, inpainting and outpainting run on the Edit Model, and Retexture is part of the Edit Model; the old Retexture tool needs V7 set as default ([Editor doc](https://docs.midjourney.com/hc/en-us/articles/32764383466893-Editor)). Since 24 Sep 2026, targeted edits change only the selected pixels, so repeated fixes should not degrade the rest of the image ([Edit updates, 24 Sep 2026](https://updates.midjourney.com/edit-updates-thumbnail-previews-and-more/)).
- **Vary Region** is the Discord name for the same job and still runs on V6.1 for V8.2 SD images ([Vary Region](https://docs.midjourney.com/hc/en-us/articles/32794723105549-Vary-Region)).
- **HD caveat.** Pan, Zoom Out or Edit on an HD image returns an SD result, which can then be upscaled ([Version doc](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version)). The alpha site says edit canvases can now run in HD ([Alpha changelog 9/23/26](https://updates.midjourney.com/alpha-changelog-9-23-26/)).

### 1.5 Draft, HD, upscalers, pixel sizes and costs

- **Draft (V8.1/8.2).** One prompt gives **24 images at 512×512** for **0.4 GPU-min**, half an SD job. It is web only; clicking Vary or Remix on a draft re-renders it at SD or HD ([Draft doc, upd. 2026-07-27](https://docs.midjourney.com/hc/en-us/articles/35577175650957-Draft-Conversational-Modes); [Draft for V8.1 post](https://updates.midjourney.com/draft-mode-for-v8-1-and-new-feature-previews/)). The compatibility chart marks Draft "No" for V8.1/8.2, which contradicts this; test it once. Whether Draft accepts Edit Model references is **(unverified)**.
- **HD** renders at 2K natively for 1.3 GPU-min against 0.8 for SD. It is switched in Settings → Model or with `--hd`/`--sd`. "Run batch as HD" re-runs a seed-locked SD prompt in HD. HD images cannot be upscaled further ([Version doc](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version); [Upscalers](https://docs.midjourney.com/hc/en-us/articles/32804058614669-Upscalers)).
- **Upscalers.** Subtle keeps the image and Creative adds detail. Both double an SD image and cost 2 GPU-min. Creative may fix awkward hands or expressions, but it changes the image ([Upscalers](https://docs.midjourney.com/hc/en-us/articles/32804058614669-Upscalers); [GPU doc](https://docs.midjourney.com/hc/en-us/articles/32016412137741-GPU-Speed-Fast-Relax-Turbo)).

| Aspect ratio | V8.2 SD | V8.2 HD or upscaled |
|---|---|---|
| 1:1 | 1024×1024 | 2048×2048 |
| 4:3 | 1232×928 | 2464×1856 |
| 2:3 | 896×1344 | 1792×2688 |
| 16:9 | 1456×816 | 2912×1632 |

Source: [Upscalers doc](https://docs.midjourney.com/hc/en-us/articles/32804058614669-Upscalers). HD sizes can differ slightly from these.

Midjourney itself says a 2048 px image prints at 6.8 in at 300 dpi and points to third-party upscalers for anything larger ([Image Size & Resolution](https://docs.midjourney.com/hc/en-us/articles/33329374594957-Image-Size-Resolution)).

### 1.6 Choosing the aspect ratio in the web UI

Set it in the Imagine bar under Settings → Aspect Ratio, which becomes the default, or append `--ar W:H` (whole numbers only); some ratios shift slightly when upscaled ([Aspect Ratio doc](https://docs.midjourney.com/hc/en-us/articles/31894244298125-Aspect-Ratio)). The Editor also accepts custom ratios ([Editor](https://docs.midjourney.com/hc/en-us/articles/32764383466893-Editor)). The exception that matters is the one in finding 2: with Edit Model references, the default setting does not apply.

The alpha site (alpha.midjourney.com) now turns parameters into "pills". Since 23 Sep 2026 it can save them as defaults under Settings → Advanced → Your defaults, or through "Set current pills as default" ([Alpha changelog 9/23/26](https://updates.midjourney.com/alpha-changelog-9-23-26/)). That could hold a standing `--no` list without retyping it.

### 1.7 Is "black and white" output true neutral greyscale?

**Unknown (unverified).** No Midjourney document addresses it, and I found no reliable test. Midjourney files are RGB images, so a "black and white" result can carry a slight warm or cool cast, and prompts that mention an era or "vintage" may drift towards sepia. Both are **(unverified)**. Our pipeline should measure the cast (CIELAB chroma) on the first batch and always convert to a luminance channel, which removes any tint whatever the cause.

---

## 2. Prompting black-and-white manga panels

### 2.1 What Midjourney itself says

- Short, specific prompts; **describe what you want, not what you don't.** Midjourney's example: a prompt asking for "no cake" can still produce a cake. Its list of composition words includes portrait, headshot, closeup and birds-eye view, and its colour words include monochromatic and black and white ([Prompt Basics, upd. 2026-08-31](https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics)). The V8 alpha post leaned the other way, towards longer and more specific prompts ([V8 alpha](https://updates.midjourney.com/v8-alpha/)), so both are worth trying in Draft.
- **Anything in double quotation marks is treated as text to render in the image.** Panel prompts must never contain double quotes ([Text Generation](https://docs.midjourney.com/hc/en-us/articles/32502277092109-Text-Generation)).
- **`--no`** takes a comma-separated list and is equivalent to a −0.5 weight. The moderation filter reads each word separately: "--no modern clothing" is read as "no clothing" and can trigger a warning ([No doc](https://docs.midjourney.com/hc/en-us/articles/32173351982093-No)). There is no separate negative-prompt field; it is typed at the end of the prompt. A 16 Sep fix made alpha read the whole list ([Alpha changelog 9/16/26](https://updates.midjourney.com/alpha-changelog-9-16-26/)). Blocked jobs cost nothing ([Omni doc](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference)).
- **Raw** turns off Midjourney's default house styling so that stylistic words carry more weight; **low Stylize** makes results more literal ([Raw](https://docs.midjourney.com/hc/en-us/articles/32634113811853-Raw); [Stylize](https://docs.midjourney.com/hc/en-us/articles/32196176868109-Stylize)). Time-period words work as style modifiers; Midjourney's own examples run from the 1400s to the 2000s ([Art of Prompting](https://docs.midjourney.com/hc/en-us/articles/32835253061645-Art-of-Prompting)).

### 2.2 Vocabulary that community guides recommend (to be tested)

- **Words to use** (claimed as tested on V6/V7, but no images shown): screentone shading, halftone dots, Ben-Day dot pattern, high contrast black and white ink, variable line weight, deep shadow fills, cross-hatching, speed lines ([PromptSpace, 8 Jul 2026](https://www.promptspace.in/blog/manga-panel-ai-art-prompts-black-white-comic-2026)).
- **Negative list:** color, photorealistic, 3D render, soft gradients, airbrushed, smooth shading, watercolor, painting, CGI ([PromptSpace](https://www.promptspace.in/blog/manga-panel-ai-art-prompts-black-white-comic-2026)).
- **Another way to organise it:** line weight, inking style (crosshatching, spotted blacks, clean lines) and screentone density ([Prompt Architects, 3 Sep 2026](https://prompt-architects.com/blog/474-comic-and-manga-panel-prompting)).
- **Untested:** "G-pen" and named eras such as gekiga or 1970s shōjo **(unverified)**.
- **For our pipeline,** ask for "flat grey tones" rather than "screentone" (§4.1).

### 2.3 Keeping out fake text, balloons, borders and multi-panel pages

Midjourney offers no specific guidance. One cross-vendor guide advises never asking the model for lettering and adding it afterwards ([Prompt Architects](https://prompt-architects.com/blog/474-comic-and-manga-panel-prompting)). My inferences, **(unverified)** but grounded in the "no cake" rule and the quotation-mark rule:

- Keep "manga page", "panels", "comic strip" and "speech balloon" out of the *positive* prompt.
- Say "single illustration, full-bleed".
- Put the unwanted items in `--no`: text, letters, words, speech bubble, caption, sound effects, panel border, frame, multiple panels, signature, watermark, colour.
- V8's stronger text rendering ([V8.1 post](https://updates.midjourney.com/v8-1-is-now-the-default-model/)) may make stray lettering more legible when it does appear.

### 2.4 Leaving room for balloons

One guide suggests prompt wording such as `generous negative space in the upper third`, or even `empty speech balloon shape, no text` ([Prompt Architects](https://prompt-architects.com/blog/474-comic-and-manga-panel-prompting)). That advice covers several vendors, not Midjourney specifically. The more reliable routes are to **generate wider or taller than the panel** and let the layout crop leave space, or to outpaint with Pan or Zoom Out, which go through the Edit Model and fall back to SD from HD ([Version doc](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version)).

### 2.5 Camera and shot language

Officially shown: portrait, headshot, closeup, birds-eye view ([Prompt Basics](https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics)). Community prompts also use "extreme close-up" and "wide establishing shot" ([PromptSpace](https://www.promptspace.in/blog/manga-panel-ai-art-prompts-black-white-comic-2026)). Low angle, over-the-shoulder and Dutch angle are **(unverified)** for V8.2. Draft mode, at 24 thumbnails for 0.4 GPU-min, is the cheap way to find out which ones it obeys. The Edit Model can also re-view an existing character from the front or behind ([Edit Model doc](https://docs.midjourney.com/hc/en-us/articles/48495453462797-Edit-Model)).

### 2.6 Hands and faces

- V7 improved bodies and hands ([Version doc](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version)).
- The first tool for a bad hand is Editor inpainting, which now changes only the selected pixels ([24 Sep post](https://updates.midjourney.com/edit-updates-thumbnail-previews-and-more/)).
- The Creative upscaler can fix hands but alters details ([Upscalers](https://docs.midjourney.com/hc/en-us/articles/32804058614669-Upscalers)), which is risky on the lead's face.
- Omni Reference admits that fine details may not transfer ([Omni doc](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference)).
- Small faces in wide shots get few pixels and tend to break **(unverified)**. Real manga simplifies distant faces, and our line thresholding simplifies them too.

---

## 3. Precedents for AI-assisted manga

### 3.1 Rootport, *Cyberpunk Momotaro* (サイバーパンク桃太郎; English title *Cyberpunk: Peach John*)

**The book.** Shinchosha, 9 Mar 2023: 128 pages, full colour, B6 ([Shinchosha](https://www.shinchosha.co.jp/book/772573/); [Famitsu](https://www.famitsu.com/news/202301/05288646.html)). It was made in August–September 2022 and includes 10 new pages on "How to make" it. By publication the author already considered its AI art style outdated ([PR Times, 3 Feb 2023](https://prtimes.jp/main/html/rd/p/000000873.000047877.html)).

**The workflow.**
- Model: Midjourney **V3** ([Netorabo interview, 9 Mar 2023](https://nlab.itmedia.co.jp/cont/articles/3352721/)).
- Storyboards came first, then AI images were fitted into the panels in **CLIP STUDIO PAINT**. He generated **100–200 images per panel** when he wanted variety, and about 100 expression images per emotion as reusable stock ([Gendai, 4 Jan 2023](https://gendai.media/articles/-/103995?page=3)). Netorabo says several hundred per emotion ([Netorabo](https://nlab.itmedia.co.jp/cont/articles/3352721/)).
- His creativity went into **assembling** the images, not into improving the generations. He treated the images as symbols that carry the story, under a *done is better than perfect* rule ([Netorabo](https://nlab.itmedia.co.jp/cont/articles/3352721/)).
- He generated characters and backgrounds **separately** and composited them, because generating them together wasted effort ([All the Anime review, 24 Mar 2023](https://blog.alltheanime.com/manga-cyberpunk-peach-john/)).
- **Time:** six weeks for 100+ pages. He said the process "reminded me of playing the lottery" ([AFP via Gulf News, 7 Mar 2023](https://gulfnews.com/world/asia/machine-magic-or-art-menace--japans-first-ai-manga-cyberpunk-peach-john-hits-the-shelves-1.1678188836451)).

**Problems he hit.** V3 could not draw full bodies or hands, faces collapsed at complex angles, and the same character would not repeat ([Netorabo](https://nlab.itmedia.co.jp/cont/articles/3352721/)).

**Reception.**
- One reviewer called it historically significant but a novelty. Readers recognise Peach John by signature traits (pink hair, dog ears), yet only his hair colour stays consistent ([All the Anime](https://blog.alltheanime.com/manga-cyberpunk-peach-john/)).
- In AFP's survey, a veteran manga artist saw AI as a companion, a student preferred human drawings *because* they are messy, and copyright and training-data concerns were raised ([Gulf News/AFP](https://gulfnews.com/world/asia/machine-magic-or-art-menace--japans-first-ai-manga-cyberpunk-peach-john-hits-the-shelves-1.1678188836451)).

### 3.2 Other documented cases

- ***Zarya of the Dawn*** (Kris Kashtanova, 2022, Midjourney). An **18-page comic including its cover**, with a young woman as the lead: the closest precedent in size to our project. The author described hundreds or thousands of prompts and hundreds of iterations to reach a final image. On 21 Feb 2023 the US Copyright Office registered the text and the selection and arrangement, but not the Midjourney images. It judged her Photoshop edit to the lead's lip too minor to count ([USCO letter](https://www.copyright.gov/docs/zarya-of-the-dawn.pdf)).
- ***The Bestiary Chronicles*** (Steve Coulson, Campfire, Nov 2022). Its process is described as a collage, selecting from many Midjourney outputs ([MBN](https://mbn.media/2022/11/128203/)). An annotated edition explained how the characters were kept consistent ([Geekspin](https://geekspin.co/the-bestiary-chronicles-comic-by-ai/)).
- **A 2026 preprint** (not peer-reviewed): a five-page chapter made with ChatGPT, Stable Diffusion, Midjourney and CLIP STUDIO PAINT. Character consistency across panels remained the main problem ([Zenodo, 12 Mar 2026](https://zenodo.org/records/18913179)).

### 3.3 Recurring pain points

The same problems come back each time: identity drift, broken hands, a narrow range of poses and angles, and huge numbers of images to sift. The tools also change faster than a book can be finished. The fix everyone reports is human compositing, backed by distinctive silhouettes.

---

## 4. Making Midjourney greyscale look like printed manga

### 4.1 Screen in our own code, not in Midjourney

Diffusion models with a VAE lose the high-frequency detail that tone dots are made of. Sketch2Manga found that Stable Diffusion produces blurred and distorted screentone, so its pipeline generates shading first and screentone afterwards ([Lin et al., 2024](https://arxiv.org/html/2403.08266v1)). Midjourney's architecture is not public, so applying this to Midjourney is an inference **(unverified)**.

Separately, any pseudo-dots Midjourney draws at 2K would have to be resampled to print resolution, and resampling fills screentone with aliasing and blur ([Xie et al., *Screentone-Preserved Manga Retargeting*, CGF 2025](https://arxiv.org/abs/2203.03396)). So ask for **clean ink lines and flat grey areas**, and generate the dots at the final resolution.

### 4.2 Neutralise and set levels

1. Convert to luminance (for example CIELAB L*), which discards any tint.
2. Log the chroma so the black-and-white question in §1.7 gets answered.
3. Set black and white points from percentiles, per panel.

### 4.3 Line-art extraction

- **Global threshold with Otsu's method**, after a 5×5 Gaussian blur, suits clean bimodal images. **Adaptive thresholding** (mean or Gaussian neighbourhood, `blockSize`, constant `C`) copes with uneven shading ([OpenCV tutorial source](https://github.com/opencv/opencv/blob/4.x/doc/py_tutorials/py_imgproc/py_thresholding/py_thresholding.markdown)).
- **XDoG** (Winnemöller, Kyprianidis & Olsen, *Computers & Graphics* 36(6), 2012) extends difference-of-Gaussians edges into stylised ink, hatching and woodcut looks ([paper page](https://www.kyprianidis.com/p/cag2012/)).
- **Learned extractors:** *Deep Extraction of Manga Structural Lines* separates structural lines from screentone ([MangaLineExtraction_PyTorch, MIT](https://github.com/ljsabc/MangaLineExtraction_PyTorch)). Anime2Sketch is a more general alternative ([MIT](https://github.com/Mukosame/Anime2Sketch)).

### 4.4 Tone: turning mid-greys into screentone

- **Printers' specifications (Japan).**
  - Monochrome at 600 dpi; above 1200 dpi files become unwieldy ([Kanazawa](https://www.kanazawa-p.co.jp/howtodata/kaizoudo.html)).
  - When converting grey to 1-bit: ≤600 dpi, **60 lpi, 45°, round dots**. Moiré can still appear with some tones, and large solid blacks band on digital presses ([Eikou](https://www.eikou.com/icon/icon-ond/)).
  - 60 lines is the usual recommendation, with artists varying tones and staying under about 80 lpi ([CLIP STUDIO ASK](https://ask.clip-studio.com/en-us/detail?id=83233)).
  - 60 lpi is a 0.42 mm pitch, about 10 px at 600 dpi. Reducing a page raises the effective frequency: 60 lpi becomes about 85 from B4 to B5 ([CSP Web Tools, upd. 2026-09-06](https://csp-web-tools.com/en/articles/tone-lpi-reduction/)).
- **Grey levels.** At 600 dpi and 60 lpi a 10×10 cell gives 101 levels; at 1200 dpi, 401. This is arithmetic, not a sourced claim.
- **Density limits.**
  - Offset printing is stable from 10% to about 90% and on-demand from 10% to about 80%. Keep at least 10% between neighbouring tones, and expect prints to be darker than the monitor ([Sunrise Printing](https://www.sunrisep.co.jp/genkou/monokurohonbun/)).
  - Another printer gives 10–80%. It also warns against layering tones of the same frequency, putting tone over grey, and scaling after toning, because anti-aliasing causes moiré. Anti-aliasing must be off in 1-bit art ([K-9](https://www.k-k9.jp/data/notice/)).
- **Dots versus dither.** Amplitude-modulated (AM) screens are a regular grid of dots that vary in size; frequency-modulated or stochastic screens vary the spacing instead ([Wikipedia: Halftone](https://en.wikipedia.org/wiki/Halftone)). A 45° angle hides a one-colour screen best ([The Print Guide](http://the-print-guide.blogspot.com/2009/05/halftone-screen-angles.html)). Error diffusion (Floyd–Steinberg, 1976) gives stochastic patterns with artefacts at some grey levels ([Wikipedia: Error diffusion](https://en.wikipedia.org/wiki/Error_diffusion)). It reads as photocopy grain rather than tone sheet, which is my own judgement.
- **How manga artists actually tone.** They use discrete flat tones labelled by frequency and density, for example "60L30%" ([ja.wikipedia: スクリーントーン](https://ja.wikipedia.org/wiki/スクリーントーン)). The CVPR 2021 manga-generation work models a page as line drawing plus regular screentone plus irregular texture ([Zhang et al.](https://openaccess.thecvf.com/content/CVPR2021/html/Zhang_Generating_Manga_From_Illustrations_via_Mimicking_Manga_Creation_Workflow_CVPR_2021_paper.html)). So posterise greys into a few flat tones rather than screening the continuous gradient.

### 4.5 Upscaling line art

- **Real-ESRGAN** (BSD-3-Clause) includes `RealESRGAN_x4plus_anime_6B` for anime ([repo](https://github.com/xinntao/Real-ESRGAN); [anime doc](https://github.com/xinntao/Real-ESRGAN/blob/master/docs/anime_model.md)). Its portable ncnn-Vulkan build is MIT-licensed ([repo](https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan)).
- **waifu2x** is MIT-licensed, and so is its ncnn-Vulkan build ([waifu2x](https://github.com/nagadomi/waifu2x); [ncnn-vulkan](https://github.com/nihui/waifu2x-ncnn-vulkan)).
- **Real-CUGAN** (bilibili/ailab): GitHub detects no licence ([repo](https://github.com/bilibili/ailab)).
- **chaiNNer** is GPL-3.0 ([repo](https://github.com/chaiNNer-org/chaiNNer)).
- Licences for the model weights are not stated separately; treat them as the repository licence **(unverified)**.
- Upscale the lines, then threshold. The tone layer is low-frequency and can use plain Lanczos resampling.

### 4.6 The screen version and moiré

- Artists advise that tones are unnecessary for digital manga, that they look bad on screens, and that moiré is unavoidable when readers can zoom ([CLIP STUDIO ASK](https://ask.clip-studio.com/en-us/detail?id=83233)).
- Manga posted online commonly shows screentone artefacts from bad scanning and rescaling ([Xie et al., CVPR 2021](https://openaccess.thecvf.com/content/CVPR2021/html/Xie_Exploiting_Aliasing_for_Manga_Restoration_CVPR_2021_paper.html)).
- Arithmetic: an A5 page shown 1600 px tall is about 194 ppi, so a 60 lpi dot would be about 3 px across and alias at any zoom.

### 4.7 Paper white and grain

Manga magazines use low-quality newsprint and tankōbon use better paper ([Wikipedia: Manga](https://en.wikipedia.org/wiki/Manga); [Wikipedia: Tankōbon](https://en.wikipedia.org/wiki/Tank%C5%8Dbon)). In print, the real paper supplies the white and the grain. On screen, an off-white background and faint grain are a design choice.

### 4.8 Research code on screentone

| Tool | What it does | Licence |
|---|---|---|
| **ScreenVAE** (TOG / SIGGRAPH Asia 2020) | Converts both ways between screened manga and colour ([project](https://ttwong12.github.io/papers/screenstyle/screenstyle.html)) | CUHK licence: free for research and commercial use, with written notice required for commercial use ([code](https://github.com/msxie92/ScreenStyle)) |
| **MangaRestoration** (CVPR 2021) | Restores degraded screentone | Same CUHK text ([code](https://github.com/msxie92/MangaRestoration)) |
| **MangaInpainting** (SIGGRAPH 2021) | Inpainting that respects screentone ([code](https://github.com/msxie92/MangaInpainting)) | Not read **(unverified)** |
| **Sketch2Manga** (2024) | Diffusion-based shading, then screening | No code mentioned ([paper](https://arxiv.org/abs/2403.08266)) |
| **MangaFilter** (CVPR 2021) | Illustration to manga | Repo has no licence ([repo](https://github.com/lllyasviel/MangaFilter)) |
| **Shading-guided manga screening from reference** (TVCG 2023) | Screening guided by a reference page ([ACM](https://dl.acm.org/doi/abs/10.1109/TVCG.2023.3282223)) | Not checked |

---

## 5. Midjourney's terms of service as they affect a private project (neutral summary)

**Ownership.**
- The customer owns the images they create to the fullest extent the law allows, even after cancelling ([ToS, upd. 2026-08-17](https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service); [Commercial use doc](https://docs.midjourney.com/hc/en-us/articles/27870375276557-Using-Images-Videos-Commercially)).
- Exceptions: companies with over US$1M in annual revenue need Pro or Mega, and upscaled images made by *other* users stay theirs.
- In the US, purely Midjourney-generated images were refused copyright registration, while human text and arrangement were protected ([USCO, 21 Feb 2023](https://www.copyright.gov/docs/zarya-of-the-dawn.pdf)). Other jurisdictions are not covered here.

**Licence to Midjourney.** Using the service grants Midjourney a perpetual, worldwide, irrevocable, royalty-free licence over both the inputs (including uploaded images) and the outputs ([ToS](https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service)).

**Visibility.**
- Content is **public and remixable by default**. With Stealth (Pro or Mega), Midjourney promises only "best efforts not to publish" ([ToS](https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service)).
- Shared Discord channels are visible regardless ([Stealth Mode](https://docs.midjourney.com/hc/en-us/articles/32019750070669-Stealth-Mode); [Keeping Private](https://docs.midjourney.com/hc/en-us/articles/28014645615373-Keeping-Your-Creations-Private)).
- Trashing an image does not make it private ([Stealth Mode](https://docs.midjourney.com/hc/en-us/articles/32019750070669-Stealth-Mode)).
- Edit Model results, and the external images used with them, appear on the site unless Stealth is on. V7 Editor work with uploaded images was private ([Editor](https://docs.midjourney.com/hc/en-us/articles/32764383466893-Editor)).

**Other terms.**
- No automated tools may be used to access or generate through the service, and the service is provided as-is, without warranty ([ToS](https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service)).
- Content is expected to be PG-13 ([ToS](https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service)).
- Uploaders must have rights to the images they upload ([Omni doc](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference)).
- Every delivered file carries a hidden ID tag, checkable at midjourney.com/verify. Edits and screenshots remove it ([Content Authenticity](https://docs.midjourney.com/hc/en-us/articles/48207461163661-Content-Authenticity)).

**Plans.**

| Plan | Price | Fast GPU time | Relax mode | Stealth |
|---|---|---|---|---|
| Basic | $10 | 200 min | No | No |
| Standard | $30 | 15 h | Unlimited images | No |
| Pro | $60 | 30 h | Unlimited images | Yes |
| Mega | $120 | 60 h | Unlimited images | Yes |

Extra fast time costs $4/hour, and rating images earns free fast time ([Plans](https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans)).

---

## 6. Practical production advice

- **How many generations per usable panel.** Rootport needed 100–200 per panel on V3; Kashtanova described hundreds of iterations per image (§3). I found no published figure for V8.2 with the Edit Model **(unverified)**. Budget, and measure our own rate on the first page.
- **Cost arithmetic (official unit prices).**

  | Step | GPU-min |
  |---|---|
  | Draft (24 images) | 0.4 |
  | SD job | 0.8 |
  | HD job | 1.3 |
  | Edit Model SD / HD | 1.0 / 2.3 |
  | Upscale | 2.0 |

  Sources: [GPU doc](https://docs.midjourney.com/hc/en-us/articles/32016412137741-GPU-Speed-Fast-Relax-Turbo); [Draft doc](https://docs.midjourney.com/hc/en-us/articles/35577175650957-Draft-Conversational-Modes). One pass per panel (draft, two Edit Model SD jobs, one HD final) is about 4.7 GPU-min. For 26 images (cover plus about 25 panels) that is about 120 min, before fixes. It fits Basic's 200 minutes only with discipline; on Standard, Relax mode makes exploration free.
- **Generate wider than the panel.** Add a 15–25% margin on the long axis so the layout can re-crop, and keep in mind that HD caps at 4:1.
- **Break-the-border figures.** Generate full figures with margin on a plain white or pale-grey background, then cut them out. Two ways:
  - Our own keyer. The repo already keys Ingram's art off plain grey or cream backdrops in `tools/title-sequence/titleseq/matte.py`, per CLAUDE.md.
  - The Editor: Smart Select → Erase Background → Save Current Edit (transparent PNG) ([Editor](https://docs.midjourney.com/hc/en-us/articles/32764383466893-Editor)). How well this works is **(unverified)**.
- **Keep figure and background apart.** This was Rootport's efficiency lesson ([All the Anime](https://blog.alltheanime.com/manga-cyberpunk-peach-john/)).
- **Naming and tracking.**
  - Name takes as `pP-kK-tT` (page, panel, take).
  - Log Midjourney's job ID and seed (More Options → Copy; [Creating on Web](https://docs.midjourney.com/hc/en-us/articles/33390732264589-Creating-on-Web)), the prompt text, the reference images, the version and the SD/HD setting.
  - Keep downloaded originals untouched so their authenticity tag survives.

---

## Implications for our prompts and our image pipeline

**Prompts: what Ingram does in the web UI**

1. **Use V8.2 in the web UI.** Settings: Raw on, Stylize about 50–100, Variety low, Weird 0. Use Draft for composition and HD only for finals. Test Draft once, because of the chart conflict.
2. **Build one reference image for the lead.**
   - Approve three or four strong images: a front ¾ bust, a full figure, and two expressions.
   - Our tool combines them into **one** sheet, following Midjourney's tip, and keeps it locked in "Attach to prompt" for every panel she appears in.
   - Carry a fixed written description and one or two **silhouette signatures** (hair shape, accessory), because black and white has no hair colour to lean on (the Rootport lesson).
3. **Include the aspect ratio in any prompt that has a reference attached.** Every such prompt must end with `--ar W:H`, because the UI default does not apply. We should give Ingram paste-ready prompt strings with the `--ar` and `--no` already in them. That is a copy-paste exception to her "no `--`" habit, and it needs her agreement. Padding the reference sheet to the panel's ratio might avoid it **(untested)**.

   **Settled by Ingram, 2026-09-26.** For the opening titles she had asked for no `--` parameters (`design/opening-titles.md` §6.1). For the manga she allows them: prompts may carry `--ar`, `--no` and similar modifiers. Still no Niji, and never a guessed version number; and no reference parameters in the prompt text, because she attaches references by hand. So every panel prompt ends with its own `--ar`, which also clears the aspect-ratio trap above.
4. **Lock the style with references.** After the first page is approved, attach one or two approved panels as a **Style Reference**, or make a moodboard of them, and restate the style in words.
5. **Prompt template.** `[shot], [who is doing what], [where], black and white manga illustration, clean black ink line art, varied line weight, solid black shadows, flat grey tones, white paper`. Default `--no` list: `color, text, letters, words, speech bubble, caption, sound effects, panel border, frame, multiple panels, signature, watermark`.
   - No double quotes anywhere, and none of the words page, panel or balloon in the positive part.
   - No clothing words in `--no`, because of the moderation parsing.
6. **Placement in plain words.** Write it out, for example "figure in the lower half, empty sky above". Balloons are always our own lettering.
7. **Fix, don't reroll.** Mend hands, faces and stray text with Editor inpainting. Avoid the Creative upscaler on the lead's face.
8. **Privacy, as a note.** Unless Ingram is on Pro or Mega with Stealth on, assume every panel and every uploaded reference sheet becomes visible on midjourney.com. Ingram has already settled that where material is stored is not a spoiler risk, because the table won't go digging (LEDGER #34, N20), and the comic is player-facing anyway. So this is worth knowing, not a blocker.

**Pipeline: what our software does**

1. **Intake.** Only files Ingram has downloaded; our software never drives midjourney.com (the ToS bans automation). Keep originals read-only and record provenance.
2. **Neutralise.** Luminance only, log the chroma, set black and white points per panel.
3. **Separate the layers.**
   - Line layer: upscale 2–4× with Real-ESRGAN anime 6B or waifu2x (permissive licences), then threshold at final size: adaptive or Otsu, XDoG as an option, MangaLineExtraction as a learned option.
   - Tone layer: remove the lines from the grey image, smooth it, and posterise into 3–4 flat tones plus solid black. Use gradient tone only where the image already has a gradient, such as sky.
4. **Print output.** 1-bit at 600 dpi (1200 as an option) at final trim plus bleed. For A5 that is 3496×4961 px before bleed.
   - Halftone: round AM dots, 45°, 55–65 lpi, tones clamped to 10–80% with steps at least 10% apart, and midtones lightened slightly because presses darken them.
   - No anti-aliasing, no scaling after screening, and sparing solid blacks if the printer is on-demand.
5. **Screen output.** Flat greys on a warm off-white with faint grain; no dots. Offer an optional fixed-size "dot look" rendered at the exact display resolution with cells of 6 px or more, displayed unscaled.
6. **Record per take:** job ID, seed, prompt, references, version, SD/HD, crop box and tone settings, so any panel can be regenerated.
7. **Calibrate early.** Measure images generated per accepted panel and the grey cast on the first page, then adjust the budget and the neutralising step.

---

## Best sources

1. https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version — official model list and feature-compatibility chart (upd. 2026-09-01).
2. https://docs.midjourney.com/hc/en-us/articles/48495453462797-Edit-Model — the V8 replacement for Omni and Character Reference, including the aspect-ratio rule (upd. 2026-09-24).
3. https://docs.midjourney.com/hc/en-us/articles/32016412137741-GPU-Speed-Fast-Relax-Turbo — per-job GPU costs for budgeting (upd. 2026-08-28).
4. https://docs.midjourney.com/hc/en-us/articles/32804058614669-Upscalers — V8.2 pixel sizes and the Subtle and Creative upscalers.
5. https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service — ownership, licence to Midjourney, public by default, no automation (upd. 2026-08-17).
6. https://nlab.itmedia.co.jp/cont/articles/3352721/ — Rootport's own account of the *Cyberpunk Momotaro* workflow (2023-03-09).
7. https://www.copyright.gov/docs/zarya-of-the-dawn.pdf — USCO letter on an 18-page Midjourney comic (2023-02-21).
8. https://arxiv.org/html/2403.08266v1 — Sketch2Manga: why diffusion models make blurry screentone (2024).
9. https://www.eikou.com/icon/icon-ond/ — a Japanese printer's greyscale-to-1-bit settings: 600 dpi, 60 lpi, 45°, round dot.
10. https://www.sunrisep.co.jp/genkou/monokurohonbun/ — printable tone-density ranges for offset and on-demand printing.
