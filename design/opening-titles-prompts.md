# Opening Titles — Midjourney prompts

The prompt sheet for `design/opening-titles.md`. It is written a batch at a time; each batch waits on what the one
before it teaches.

**How to run one:**

1. Attach the listed images as **Style references** (drag them into the Midjourney web prompt bar and set the role).
   They are in `artwork/title-sequences/opening/style-refs/`.
   **Everything is generated new, in the 1990s TV-anime look, framed 4:3** (Ingram, 2026-09-25). Existing scene and
   character art is a subtly different style, so it is never used here, not even as a reference. Other shapes only
   where a plate is meant to be panned, and the prompt says so.
2. Paste the prompt text. **From R13's new options on, prompts carry no parameters** (no `--niji`, `--ar` or
   `--sw`): set 4:3 in the web interface unless a prompt asks for another shape, and use whichever model is giving
   you the best anime results.
3. Save the result you like best into `artwork/in-tray/video/`, **named by its code** (`R02-sky.png`,
   `R13-hand.mp4`). Use PNG for stills and MP4 for video. Claude files it into `artwork/title-sequences/opening/art/`.
   *(This is Ingram's own convention, adopted 2026-09-25. It replaced the per-code drop folders.)*

If a result is close but wrong, use Vary (Subtle) or Vary (Region) freely. Say in chat what you changed, so the
next batch's prompts can learn from it.

## The look: style anchors (Ingram's finding, 2026-09-25)

Naming the show outright is what gets the iconic look. Ingram's anchor, which every prompt from Step 6 on starts
from:

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation
```

Additions worth trying, each for a reason. Swap them in and out and tell me which win; I'll fold the winners into
every prompt.

- **Backgrounds:** `background art by Hiroshi Kato, hand-painted poster-colour background`. Kato was the series'
  art director, and his skies, power lines and empty rooms are half of its look.
- **Machines:** `retro industrial machinery like the 1992 Giant Robo OVA, rivets and pistons`. This keeps our Frames
  the campaign's clanking heavy plant rather than the show's thin purple giants. Naming the show's own mecha
  designer, Ikuto Yamashita, pulls toward its biomechanical look: try that only for the Gen 2 head (R94).
- **Direction and staging:** `directed by Hideaki Anno` for the stark, symmetrical, held compositions; `Tatsunoko
  Production` (the show's animation partner) sometimes warms the colour.
- **Texture:** `LaserDisc capture` or `VHS capture, slight chroma bleed` for the soft broadcast look; `cel shadow,
  two-tone shading` for the hard shadows; `airbrushed gradient sky`; `film grain`.
- **Framing words:** `anime screencap`, `cel animation still`, `key animation frame`.
- **Sketches** (R49, R68, R93, R99): `Yoshiyuki Sadamoto settei model sheet, loose pencil production sketch`.
- **Keeping the show's own cast out:** add `original character`, and never describe the pilot suits, the
  purple-and-green machine or the show's badges. If a face still comes out as one of its pilots, add the hair
  colour and age you want in plain words.
- **Colour rule:** violet is kept for Claimants and the rift (the plan's section 8), so no violet light elsewhere.

---

## The first five, in video order (2026-09-25)

These cover everything Midjourney is needed for from the first frame up to the verse. Everything else in that
stretch is built here: the rings, the flashes, the wordmark, the logo, the beams, the credits, the bay shape (R04,
made from our own art) and the crane silhouettes in the strobe.

**R02 and R03 carry mitflit art, at Ingram's suggestion.** They replace the source's religious diagrams with
drawings the mitflits might make about being a star-faring people who want to go home. No words appear in them.

### R02-sky · The red sky (0.8–5.9 s)

It fades up from black and drifts behind the first credit.
**Style reference:** `sref-intro-01-red-sky`.

```
deep blood-red sky of slow drifting cloud like a nebula, darker crimson hollows, one dark round shadow low on the left like a distant planet in eclipse, soft airbrushed gradients, fine grain, 1990s TV anime background painting, no stars, no people, no text --niji 7 --ar 4:3 --sw 300
```

### R02-mural · The mitflits' going-home mural (fades in behind the credit, 3.0–4.7 s)

Gold lines on pure black, so it can glow over the red. **No style reference.** The source's figure here is
religious, and this should look like the mitflits' own hand.

```
thin glowing gold lines on a pure black background, a naive mural scratched by small hands: a line of tiny long-eared figures holding hands and reaching up toward one bright rayed star, a great seed-shaped ship falling from that star along a long dotted curve, concentric orbit rings around the star, rows of tally marks counting the generations, a spiral climbing from the ground back up to the star, simple symmetrical composition, flat line art only, no shading, no text --niji 7 --ar 4:3
```

If Niji 7 keeps drawing anime people instead of scratched figures, try `--v 7` instead. Save every result you like;
several can be layered.

### R03-chart · The mitflits' star chart (5.9–9.0 s)

The red dissolves into it and the camera pushes in slowly.
**Style references:** `sref-intro-02-blue-chart`, `sref-intro-03-blue-chart-close`.

```
a star chart drawn in fine pale-blue and white lines on deep blue, hand-copied and handed down for generations: one bright central star with long fanned rays like feathers, a dozen circles each holding a small invented glyph, dotted voyage lines joining the circles, concentric rings, tiny white stars scattered across it, symmetrical, antique engraving linework, no real letters --niji 7 --ar 4:3 --sw 250
```

### R06-smoke · Black-and-white smoke, for the strobe (13.0–14.5 s)

The strobe cuts between several of these, one to three frames each, with crane silhouettes built here cut in
between. **Keep all four results.**
**Style references:** `sref-title-01-bw-clouds`, `sref-title-02-bw-clouds`.

```
high-contrast black-and-white photograph of billowing factory smokestack smoke filling a pale sky, dark grey plumes and bright white gaps, heavy film grain and a faint halftone texture, abstract, no buildings, no people, no text --v 7 --ar 4:3 --sw 250
```

### R11-sky · The verse's sky (22.0–36.5 s)

The first lead close-up is double-exposed over this, and it drifts slowly. It is wide on purpose.
**Style references:** `sref-verse-01-sky`, `sref-verse-02-sky`.

```
1990s TV anime background painting, deep blue summer sky with long wisps of white cloud streaming across it, hand-painted poster colour, soft film grain, no ground, no sun, no people, no text --niji 7 --ar 3:1 --sw 300
```

**Delivered 2026-09-25.** Step 1 is rendered on them. Ingram made the sky green-blue rather than red. R04 uses Scene 0's city-from-above art (`artwork/scenes/episode-c1e1--from-up-here.png`), at her pointer.

---

## R04 and R06–R13 (2026-09-25)

R07–R10 (the wordmark card, the blue shards, the 空白相続 logo with 第一部 above it, and the X beams) and R12 (the
dissolve) are built here, so they need no Midjourney. **R04 is regenerated**, so the whole opening shares one look.

### R04-city · Kurose from the edge of space (9.0–13.0 s)

The second credit sits over it, and the burst's white dot lands on the bay, so keep the bay near the middle.
**Style references:** `sref-bg-01-city-sunset`, `sref-intro-02-blue-chart`.

```
1995 TV anime cel animation still, a harbour city on a long curving bay seen from the edge of space at dusk, the curve of the planet along the top of the frame, thin high cloud, the first city lights glowing, deep blue sea, the bay in the middle of the frame, hand-painted background, 4:3 broadcast frame, soft film grain --niji 7 --ar 4:3 --sw 250
```

### R06-smoke · More smoke (13.0–14.5 s)

The strobe flicks between several different smoke stills, so one isn't enough. Rerun your prompt, or this one, and
**save all four**.
**Style references:** `sref-title-01-bw-clouds`, `sref-title-02-bw-clouds`.

```
high-contrast black-and-white photograph of billowing factory smokestack smoke filling a pale sky, dark grey plumes and bright white gaps, heavy film grain and a faint halftone texture, abstract, no buildings, no people, no text --v 7 --ar 4:3 --sw 250
```

### R06-cranes · Crane silhouettes for the strobe (13.0–14.5 s)

Cut in between the smoke for one to three frames each, the way the source cuts in its dark crosses.
**Save all four.**

```
black silhouettes of two harbour crane jibs crossing like an X, lattice steel girders and hanging cables, seen from below against a plain white sky, stark high contrast, no other detail, no text --v 7 --ar 4:3
```

### R11-newcomer · The first of the six temporary faces (22.0–36.5 s)

Lead beat 1, double-exposed over your R11 sky while the credits come and go. It's a stand-in until the real
characters exist, so keep it non-specific. The flat grey background lets it be lifted out cleanly.
**Style references:** `sref-face-08-boy-low-angle-sky`, `sref-face-09-boy-eyes`.

```
1995 TV anime cel animation still, three-quarter profile close-up of a young trainee in a plain brand-new uniform jacket, looking up and to the left, face half in shadow, short dark hair lifting in the wind, calm and unreadable, clean black line art, flat cel shading with one hard shadow tone, plain flat pale grey background, 4:3 broadcast frame --niji 7 --ar 4:3 --sw 300
```

### R11-silhouettes · The other five, drifting behind (22.0–36.5 s)

Flat black shapes that pass through the sky behind the face, the way the source's other characters do.

```
five dark silhouettes of young people in plain uniforms standing apart in a loose row, one looking back over a shoulder, flat solid black shapes on a plain white background, no faces, no detail --niji 7 --ar 4:3
```

### R13-sunset · The orange sky (36.9–40.3 s)

The verse's blue dissolves into this, and the machine hand reaches down through it.
**Style reference:** `sref-bg-01-city-sunset`.

```
1990s TV anime background painting, deep orange sunset sky with long streaks of golden cloud above the dark rooftops and tall factory smokestacks of a harbour town, warm haze, the town in silhouette along the bottom edge, 4:3 broadcast frame --niji 7 --ar 4:3 --sw 250
```

### R13-hand · The machine's hand reaching down (37.1–38.1 s)

**Retired** (Ingram: it doesn't work as a concept). The replacement options are in the next section.

A Gen 1 Frame's hand, cut out and slid down from the top-left, fingers curling.
**Style reference:** `sref-mech-01-hand-vs-sky`.

```
1995 TV anime cel animation still, a giant riveted machine hand reaching down from the top left corner of the frame, fingers slowly curling, boiler-plate armour in worn vermilion paint with yellow and black chevrons, hydraulic knuckles, clean line art, flat cel shading, plain flat white background, 4:3 broadcast frame --niji 7 --ar 4:3 --sw 200
```

### R13-blueprint · The Frame's blueprint rising (38.1–40.3 s)

Glowing green line art on black, laid over the hand and the sky.

```
glowing green line blueprint of a giant riveted utility mech converted from an excavator, front and side elevations, measurement lines, callout circles and small invented labels, thin bright green lines on a pure black background, 1990s anime computer display graphic, no real words, 4:3 frame --niji 7 --ar 4:3
```

## R13's new idea, and R14–R16, rewritten to look like anime (2026-09-25, second pass)

**Why this pass exists.** The first versions of these prompts described objects ("a black silhouette of a radio mast
on a plain white background"), not anime frames, so they came out looking like clip art. Every prompt below
describes **a frame from a 1995 TV anime**. It names the look outright: *Neon Genesis Evangelion*, Gainax, Yoshiyuki
Sadamoto's character designs. It asks for what that look is made of:
- ink lines
- flat cel colour with a single hard shadow tone
- airbrushed highlights
- painted backgrounds
- VHS grain

Even the silhouettes are now sunset frames with a dark shape in them, the way the source draws its own.

**No parameters.** Set 4:3 in the web interface unless a prompt says otherwise, and attach the listed style
references there as before.

**Built here, no Midjourney needed:** the sun glare, the gold and pink grades, the window-pane frame of Taka's inset,
and every credit. The credits over R14 and R15 are the honest music credits (Ingram, 2026-09-25).

**Keying:** a figure that must be cut out and placed (Taka) goes on a flat green screen, which keys cleanly, as the
boy did. Dark shapes against a bright sky (the hands, the mitflit) are cut out here by their darkness.

### R13 · What reaches down through the orange sky (37.1–38.4 s)

The Frame hand is out. The shot keeps the source's shape: your sunset, something reaching down through it, and the
Frame's green blueprint rising (that stays). Three ideas for what reaches:

- **A. Two hands (my pick).** An old hand reaches down from the top and a young hand reaches up from the bottom.
  They stop just short of each other, the low sun between their fingertips, while the blueprint rises behind them.
  It's the one picture in the opening that says the title: something handed down from one generation to the next.
  It echoes the religious painting the source's own hand quotes, and it gives nothing away.
- **B. The crane hook.** A harbour crane's hook comes down out of the sky on its chains, as if something is about to
  be lifted into being. It rhymes with the cranes in the strobe.
- **C. A pilot's fist.** A gloved hand held up against the sun, fingers slowly closing into a fist. That's the
  source's curling fingers, made human and determined.

**A · R13-hand-old** and **R13-hand-young** (two plates, so each hand slides in on its own).
**Style references:** `sref-bg-03-rooftops-dusk`, `sref-bg-01-city-sunset`.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax cel animation, a weathered old man's hand reaching down into the frame from the top edge, fingers loosely open, drawn as a flat dark silhouette with a thin burning-orange rim light along the knuckles, against a plain blazing orange sunset sky, hard-edged cel shading, painted background, VHS film grain, 4:3 broadcast frame, no text
```

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax cel animation, a teenager's hand reaching up into the frame from the bottom edge, fingers stretched wide toward the sky, drawn as a flat dark silhouette with a thin burning-orange rim light, against a plain blazing orange sunset sky, hard-edged cel shading, painted background, VHS film grain, 4:3 broadcast frame, no text
```

**B · R13-hook.** **Style reference:** `sref-bg-01-city-sunset`.

```
1995 TV anime background painting, Neon Genesis Evangelion, a huge harbour crane hook and heavy chains hanging down out of a blazing orange sunset sky, silhouetted black, the sun low behind it, heat haze, lens flare, hand-painted poster-colour cel background, VHS film grain, 4:3 broadcast frame, no text
```

**C · R13-fist.** Best as a video (*the fingers slowly close into a fist*). **Style reference:** `sref-fx-01-blast-dome`.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax cel animation, close-up of a pilot's gloved hand held up against a huge setting sun, fingers slowly curling into a fist, flat dark silhouette with a hot orange rim light, sun flare burning around the fingers, hard-edged cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R14-comms-officer · The voice on the radio (40.5–43.4 s)

One whole frame now, as the source's is: her face in hot gold light, the sun glaring behind her, and the radio
mast and power lines painted into the background. (That replaces the separate mast plate.) The music credit sits
over her. If you animate it: *she opens her eyes and says a few words into the microphone; loose hair stirs.*
**Style references:** `sref-face-10-officer-raising-head`, `sref-face-01-officer-front`, `sref-bg-03-rooftops-dusk`.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, close-up of a young woman radio operator in a high-collared 1950s uniform, a headset over dark hair pinned up with loose strands, a small microphone at her lips, head tilted back and eyes half-closed as she listens, bathed in hot yellow late-afternoon light, a blinding sun glare over her shoulder, a lattice radio mast and sagging power lines silhouetted black behind her, crisp black ink lines, flat cel colours with one hard shadow tone, airbrushed highlights, VHS film grain, 4:3 broadcast frame, no text
```

### R15-newcomer · The second of the six temporary faces (43.4–48.5 s)

Lead beat 2: facing us, for contrast with the first, who looks away. Gold in R15; the same face turns pink in R16
(the tint is done here). The song credit sits over it. If you animate it: *a slow blink; her fringe stirs.*
**Style references:** `sref-face-03-pale-girl`, `sref-face-09-boy-eyes`.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, close-up of a teenage girl trainee facing the camera, head bowed a little, eyes looking up through her fringe with quiet resolve, short tousled hair, a plain new uniform with a stand-up collar, washed in warm golden evening light against a plain golden-yellow sky, crisp black ink lines, flat cel colours with one hard shadow tone, glossy eye highlights, VHS film grain, 4:3 broadcast frame, no text
```

### R15-mitflit · A small mitflit on a rooftop (43.4–47.1 s)

The source sets a small dark figure hugging its knees beside the face. Ours is a mitflit, and it **looks up**: it's
longing for home, like the mural in R02, not despairing. I lay it over the face as a dark, see-through shape.
**Style reference:** `sref-bg-03-rooftops-dusk`.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax cel animation, the small dark silhouette of a goblin-like creature with long pointed elf ears sitting alone on the edge of a rooftop, hugging its knees and looking up at the sky, seen side-on against a huge pale golden evening sky, rooftop aerials and power lines, flat cel colours, VHS film grain, 4:3 broadcast frame, no text
```

### R16-taka · Taka in the window (47.1–48.5 s)

He stands in a see-through window-pane panel beside the pink face, as the source's girl does; I build the panel
here. Portrait shape. **His panel leaves before the eye in R17 arrives**, unlike the source's, so nothing ties him
to it.
**Style references:** `sref-face-06-agent`, `sref-face-08-boy-low-angle-sky`.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, full-length figure of a cheerful young man in a plain trainee uniform with the sleeves rolled up, standing easy, one hand raised in a lazy wave, a big confident grin, messy short dark hair, facing the camera, soft pink evening light, plain flat bright green background, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, portrait frame, no text
```

### R17 · The Watcher: done

Your image (`R17-watcher.png`). A hard cut onto the great eye with the smaller eyes crowding round it, pushing in
fast, gone in under a second. It never blinks, which suits the dossier: it has no eyelids.

## What the second batch became (2026-09-25)

Ingram leaned on what Midjourney is good at, and it covered Steps 4 and 5 whole:
- the Comms Officer
- the second and third temporary newcomers
- the mitflit on its rooftop
- Taka
- the Frame hero plate (used for five shots)
- all four founders

Her other images have proposed homes in the plan's shot notes.

**B0-04 (Kurose at sunset) is retired as unworkable:** Midjourney won't draw a port without sailing ships and making
it look too old. That makes R61 (a sail-rigged trader in the harbour) easy, and leaves R52 needing another answer.

## What the third batch became (2026-09-26)

Every piece went into one shot; the plan's §5 has the table ("Where Ingram's third batch went"). Your two newcomer
animations are lead beats 2 and 3 (R14, R24–R26), and the too-zoomed close-up at 00:57 is retired.

**Filled, so skip these prompts below unless you want to replace what's there:** R18, R21, R44, R45, R46, R49, R52,
R58, R59, R60, R63, R68, R71, R73, R76, R77, R91, R93, R94, R96, R99, R101 and R105.

**Still slates (30):** R32–R37, R39, R41, R43, R50, R56, R62, R70, R75, R79, R81, R83, R85–R88, R90, R92, R102–R104,
R106, R107, R109 and R110.

## Everything still to come (2026-09-25, third pass)

**The whole opening now plays to the end.** Every shot still waiting for art is in the video as a **slate**: a
text-only card showing the shot's code, what belongs there, and `prompt <code>` at the bottom. So each prompt below
is headed by the same code you'll see on screen.

**How to send them:**
- Generate them in any order.
- Save each result into `artwork/in-tray/video/` named by its code (`R52-kurose.png`), and I'll swap it in.

**No image appears twice** (Ingram: "If you use the same image twice it's better to just use a text card"), so each
result goes into one shot only. Where the source cuts to the same face twice (R106 then R107), that means two images.

**Frames:**
- Attach `art/R23-frame.png` as an image or omni reference on every Frame prompt, so it stays the same machine: the
  riveted white-and-grey one with orange-and-black chevrons and one green visor eye.
- The plan's section 8 still says the Frames wear Directorate vermilion and cream. Your R23 machine came out
  white-and-grey with orange chevrons, and the prompts follow yours. Say if you'd rather the plan changed.

**The founders:** attach their portraits (`art/R28-hyuck.png` and the rest) as character references. Those stills
are in the video once already, so here they only keep the likeness.

**Waiting on your decision, not on a prompt:** R92, the small creature. Its heading below says so; tell me what
you decide and I'll write the prompt. (R45's enemy, R49's mask and R93's face came in your third batch.)

## Step 5: the two shots that were repeats

### R18-hatch · The hatch wheel locks shut (49.4–50.0 s)

It was a close-up of the R23 Frame image. Best as a video (*the wheel spins and locks; steam hisses from the seal*).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, retro industrial machinery like the 1992 Giant Robo OVA, extreme close-up of a heavy circular locking wheel set into a riveted white-and-grey armour plate with orange and black chevron stripes, the wheel spinning shut, steam hissing from the seal, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R21-hand · A hand on the lever (50.9–51.1 s)

It was a crop of the Comms Officer's picture, which now has her own shot at R98.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, close-up of a pilot's gloved hand gripping a worn black control lever and shoving it forward, a cramped cockpit of brass gauges glowing amber around it, hard light from below, speed lines, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

## Step 6: chorus one, the Frame in action (R32–R50)

Chorus one is the Frame's showcase: charging, standing in a column of light, venting steam like wings, its bucket,
its grapple, its head against the dusk, its rivets and gauges.

**Built here, no Midjourney needed:**
- the column of orange light the Frame stands in: rising streaks and sparks, re-drawn on twos
- the vermilion shape behind the charge
- the searchlights flaring on (R38)
- the violet core (R47)
- the title cards (UTILITY TYPE, FRAME-01, UNIDENTIFIED / CONTACT)

Frames you make for R32–R35 can be on plain black or grey. I cut them out and stand them in the column.

### R32-charge · The Frame charges (58.8–60.9 s)

50 frames. A wide **3:1** plate that I pan across. **Very specific on purpose** (Ingram: you can't be too specific about the era and style).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, mecha in the style of the 1992 Giant Robo OVA, wide panoramic side view of a colossal riveted utility mech charging across the frame from left to right like a bulldozer, leaning hard forward with one armoured fist drawn back, boxy white-and-grey armour plates scuffed with oil and soot, bold orange-and-black chevron hazard stripes on its shoulders and shins, hydraulic pistons and hoses flexing at every joint, a single glowing green visor eye, chunks of broken concrete and dust exploding from under its feet, horizontal speed lines streaking past, a huge flat vermilion graphic shape slanting behind it, blazing orange evening sky, hand-painted cel on a poster-colour painted background, crisp black ink outlines, two-tone hard cel shading, airbrushed highlights, limited 1990s broadcast palette, LaserDisc capture, film grain, wide panoramic frame, no text, no logos
```

### R33-angles · Quick angles on the charge (60.9–61.7 s)

Four cuts of about five frames each: run it four times, swapping the bracketed part for each of these: *seen from an extreme low angle between its striding legs*; *seen over its right shoulder from behind*; *a tight close-up on the green visor eye and the chevrons of the head*; *seen from a high angle as it barrels past below*. **Very specific on purpose** (Ingram: you can't be too specific about the era and style).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, mecha in the style of the 1992 Giant Robo OVA, a colossal riveted utility mech with boxy white-and-grey armour plates, bold orange-and-black chevron hazard stripes and a single glowing green visor eye, charging forward through a towering column of orange light, [seen from an extreme low angle between its striding legs], dust, sparks and broken concrete flying, speed lines, hand-painted cel, crisp black ink outlines, two-tone hard cel shading, airbrushed highlights, limited 1990s broadcast palette of vermilion, orange and gold, LaserDisc capture, film grain, 4:3 broadcast frame, no text, no logos
```

### R34-column · Standing in a column of light (61.7–62.4 s)

18 frames. A still is fine; I add a slow push. **Very specific on purpose** (Ingram: you can't be too specific about the era and style).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, directed by Hideaki Anno, 1995 TV anime cel animation, mecha in the style of the 1992 Giant Robo OVA, a colossal riveted utility mech standing full figure, front-on and perfectly symmetrical in the centre of the frame, arms hanging at its sides, boxy white-and-grey armour plates scuffed with oil and soot, bold orange-and-black chevron hazard stripes, hydraulic pistons at the knees and elbows, a single glowing green visor eye, inside a towering column of orange light full of thin vertical yellow streaks, sparks raining down past it, deep crimson shadow at the frame's edges, low angle, hand-painted cel on a poster-colour painted background, crisp black ink outlines, two-tone hard cel shading, airbrushed glow, limited 1990s broadcast palette, LaserDisc capture, film grain, 4:3 broadcast frame, no text, no logos
```

### R35-wings · Steam like wings (62.5–65.3 s)

The longest slate (70 frames). Best as a video (*the arms spread slowly, the steam unfurls and billows outward, sparks drift up*). **Very specific on purpose** (Ingram: you can't be too specific about the era and style).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, directed by Hideaki Anno, 1995 TV anime cel animation, mecha in the style of the 1992 Giant Robo OVA, a colossal riveted utility mech built from heavy construction plant, boxy white-and-grey armour plates scuffed with oil and soot, bold orange-and-black chevron hazard stripes on its shoulders and shins, exposed hydraulic pistons and rubber hoses at every joint, a squat armoured head with a single glowing green visor eye, standing full figure and perfectly symmetrical in the centre of the frame, seen from a low angle, throwing both arms wide as the boiler vents on its back release enormous golden plumes of steam and sparks that unfurl to both sides like feathered wings, inside a towering column of orange light full of thin vertical yellow streaks, deep crimson shadow at the frame's edges, hand-painted cel on a poster-colour painted background, crisp black ink outlines, two-tone hard cel shading, airbrushed highlights on the steam, limited 1990s broadcast palette of vermilion, orange, gold and white, LaserDisc capture, slight chroma bleed, film grain, 4:3 broadcast frame, no text, no logos
```

### R36-bucket · The bucket snaps open (65.3–65.8 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax mecha animation, extreme close-up of a giant mech's excavator bucket jaw snapping open, teeth of worn steel, a burst of white steam, shards of concrete flying at the camera, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R37-arm · Whip-pan along the arm (65.8–66.0 s)

A wide plate, **3:1**, for me to whip-pan across.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, retro industrial machinery like the 1992 Giant Robo OVA, a giant riveted hydraulic mech arm stretching across a bright blue summer sky, pistons, hoses and orange and black chevron bands along it, motion blur, speed lines, hard cel shading, VHS film grain, wide panoramic frame, no text
```

### R39-grapple · The grapple in the steam (66.3–66.7 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax mecha animation, a giant riveted mechanical grapple hand clenched in a billowing cloud of steam, a red harbour crane silhouetted behind it against a pale sky, low angle, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R41-head · Its head from behind, in the wires (66.8–67.2 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax mecha animation, the head and shoulders of a giant riveted white-and-grey mech seen from behind, framed by sagging tram wires and a wooden utility pole, blood-red dusk sky, dark silhouette with a thin rim light, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R43-claw · The claw against the sky (67.3–67.6 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, retro industrial machinery like the 1992 Giant Robo OVA, a giant riveted mechanical grapple claw raised against a bright blue sky with towering white summer clouds, seen from directly below, orange and black chevrons around the wrist, sunlight flaring off the steel, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R44-details · Rivets, chevrons, pistons, a gauge (67.5–68.1 s)

Six to eight very quick close-ups, so **save four or five variations**.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax mecha animation, extreme close-up of a giant mech's riveted armour plate with orange and black chevron stripes, a hydraulic piston and a brass pressure gauge with a trembling needle, oil and scratches, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R45-face · A face still forming (68.2–68.4 s)

**Waits on a decision:** what a Claimant looks like isn't settled. The files so far describe them this way:
- "a patch where the surface has not finished forming"
- "unfinished plating and a closing mechanism"
- things that "do not move the way anything should"

Violet belongs to them. Tell me the look and I'll write it.

### R46-haze · The Frame in red haze (68.4–68.6 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, the dark silhouette of a giant riveted utility mech standing in a thick blood-red haze, only its outline and one faint green visor eye showing through, heat shimmer, flat cel colour, VHS film grain, 4:3 broadcast frame, no text
```

### R49-sketch · A red pencil sketch (69.0–69.1 s)

**Waits on a decision:** Cicada's mask isn't described anywhere players will see. When it is, this is a two-frame
flash of it: a loose red pencil sketch, the way the source flashes its mysterious boy.

### R50-rupiah · Rupiah before the moon (69.1–69.8 s)

18 frames. A tall **1:2** plate for a slow tilt up. **Attach `art/R29-rupiah.png` as a character reference.** **Very specific on purpose** (Ingram: you can't be too specific about the era and style).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, an elegant elf nobleman with swept-back platinum hair, long pointed ears, round red-tinted sunglasses and a tailored houndstooth coat, standing small at the bottom of the frame on a rooftop edge, head tilted back, singing up to the stars, before an enormous full moon that fills the upper frame, cool blue night sky scattered with stars, silver rim light along his profile and coat, hand-painted cel on a poster-colour painted night background by Hiroshi Kato, crisp black ink outlines, two-tone hard cel shading, airbrushed moonlight glow, limited 1990s broadcast palette of midnight blue, silver and white, LaserDisc capture, film grain, tall portrait frame, no text
```

## Step 7: the flashes (R51–R100)

The source's rapid-fire middle: title cards, the city, the institution's faces, the first adventure. Most shots
are four to eight frames long, so each picture only has to read at a glance: one face, one strong shape.

**Built here, no Midjourney needed:**
- the title cards (CICADA, KUROSE, CRANE RIG / FRAME-00, SALVAGE AND FIRE / FRAME-02, FIRST IMPACT, HERE)
- the Directorate's own approved seal (R55)
- the acceptance letter's letterhead (R69)
- the rift (R82)
- the searchlight burning out (R84)
- the radar scope (R97)
- the director card (R100)

**Placed from your batch:**

| Shot | Image |
|---|---|
| R54 | the empty hall with the city in its windows (xx-03) |
| R57 | the other hall (xx-02) |
| R61 | the ranks (xx-06) |
| R64 | the tentacled shape over the red city (xx-07) |
| R65 | Vetch (B0-01B) |
| R66 | the agents, graded from purple to blue, since violet is kept for Claimants and the rift (xx-05) |
| R67 | the conspiracy wall, with a 極秘 stamp (xx-08) |
| R78 | Manako at his tea |
| R80 | the explosion (xx-04) |
| R98 | the Comms Officer |

**Portraits:** a head and shoulders, the face lit hard, on a flat colour ground (the slate shows the colour I'd
pick). Each prompt gives only what the files already say about the person.

### R52-kurose · Kurose at sunset (70.0–70.4 s)

Midjourney adds sailing ships to any port, and here that's canon: sail traders tie up beside the coal cranes. The
1950s words below are there to stop it drifting older. Keep the Rock and the Vermilion silos out of it.

```
1995 TV anime background painting, Neon Genesis Evangelion, Gainax, background art by Hiroshi Kato, hand-painted poster-colour background, a steep 1950s harbour town at sunset, red tile roofs climbing a cliff, smokestacks and steel coal cranes along the waterfront, a tall-masted sailing trader moored beside a steamer, trams, a long stone causeway running out across the water to a small sea-fort on an island, blazing orange sky, VHS film grain, 4:3 broadcast frame, no text
```

### R56-deputy · The Deputy Director (71.0–71.25 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, head-and-shoulders portrait of a composed middle-aged man in a pale summer suit with a spotted tie and a pocket square, wire-rimmed glasses, a faint knowing smile, plain flat teal background, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R58-switchboard · The switchboard supervisor (71.4–71.6 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, head-and-shoulders portrait of a young technician in a lab coat over a shirt and tie, wire-rimmed glasses, banks of switchboard jacks and pinned paper notices behind him, cool blue light, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R59-range · The Range Safety Officer (71.6–71.9 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, head-and-shoulders portrait of an officer in a pale uniform shirt with epaulettes and a dark tie, a leather cross-strap over one shoulder, an armband, two pens in the pocket, glasses, chin raised, watching something far past the camera, plain flat grey-violet background, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R60-teacher · The natural-history teacher (71.9–72.2 s)

Best as a video (*her eyes open*).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, head-and-shoulders portrait of a woman teacher in a lab coat and glasses, chin resting on her hand, half-smiling with her eyes closed, shelves of labelled specimen jars behind her, soft lilac light, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R62-hulda · Hulda Brack (72.3–72.7 s)

She's a nuar. Midjourney won't know the word, so the prompt describes her.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, low-angle portrait of a huge minotaur-like woman with a bovine head, heavy curving horns and red-brown hide, a big confident grin, overalls over a white shirt with the sleeves rolled up, one gloved hand resting on an enormous spanner, steel gantry beams behind her, warm golden light, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R63-advocate · The Transparency Advocate (72.7–72.8 s)

Deliberately left unread as a man or a woman, so the prompt doesn't say.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, head-and-shoulders portrait of a person with round glasses and dark wavy hair, a checked jacket over a white collared shirt, holding a sheaf of papers, glancing sideways with quiet conviction, plain flat teal background, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R68-sketch · A blue line sketch (73.4–73.5 s)

Two frames: the source's mysterious sketch. Ingram's note on it was "we can always find a use for a mysterious
looking character", so this one is mine to design and gives nothing away.

```
1995 anime production sketch, Yoshiyuki Sadamoto settei model sheet, loose blue pencil lines on white paper, a tall thin figure in a long coat and a wide-brimmed hat seen in profile, face in shadow except a pale half-smile, rough construction lines, no text
```

### R70-jacket · Hyuck's jacket (73.6–73.8 s)

A joke for the veterans: the horse-leather armour. **Attach `art/R28-hyuck.png` as a character reference.**

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, extreme close-up of a rough patched horse-leather jacket worn as armour on a gnoll's shoulder, coarse stitching, brass buckles, black and tan fur spilling from the collar, feathers and painted bands, warm light, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R71-crane-rig · The crane rig's head (73.8–74.1 s)

Tall, slow, and "folded down like a sleeping bird" when it rests.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, retro industrial machinery like the 1992 Giant Robo OVA, the head of a tall slow crane-like utility mech at night, a single round searchlight eye blazing, folded lattice boom arms, rivets and orange and black chevrons, deep blue night, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R73-salvage-rig · The salvage-and-fire rig (74.2–74.6 s)

Pumps, cutting gear, a ladder and a water cannon.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, retro industrial machinery like the 1992 Giant Robo OVA, a red salvage-and-fire utility mech with pumps, a ladder and a water cannon, a long cutting boom slung diagonally across its body, standing in drifting smoke, fire-engine red and chrome, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R75-hyuck · Hyuck in a test cockpit (74.75–75.1 s)

The mad test pilot of the worst Frame concepts. **Attach `art/R28-hyuck.png` as a character reference.**

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, a gnoll with black and tan fur and a mouth full of teeth, feathers and painted bands, strapped into a cramped test cockpit of levers and brass gauges, harness straps across his chest, grinning wildly, sparks flying from a panel, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R76-taka · Taka shouting across the canteen (75.1–75.7 s)

A new picture: his R16 image is used once already. Best as a video (*he tilts his head, then cups his hands and
shouts*).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, a cheerful young man of about nineteen with big untidy dark hair, one earring and a small mark over one eyebrow, an open-collared white shirt under a dark jacket, hands cupped round his mouth, shouting happily across a busy school canteen, warm orange afternoon light, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R77-instructor · The civil-defence instructor (75.7–75.8 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, head-and-shoulders portrait of a woman in her forties with her arms crossed, a plain olive uniform tunic with the sleeves rolled to the elbow, a whistle on a lanyard, hair pulled back, not smiling but not unkind, plain flat sky-blue background, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R79-history · The history teacher (76.0–76.3 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, head-and-shoulders portrait of a moustached man in wire-rimmed glasses, shirtsleeves and suspenders, pushing his glasses up with one finger, a chalkboard behind him, soft pink light, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R81-road · The Frame on the harbour road (76.5–76.7 s)

I strobe it here, light and dark on alternate frames.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, retro industrial machinery like the 1992 Giant Robo OVA, a giant riveted white-and-grey utility mech striding along a harbour road at dusk, silhouetted black against a huge orange explosion behind it, red rooftops, debris flying, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R83-flame · Walking out of the fire (77.2–77.4 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, retro industrial machinery like the 1992 Giant Robo OVA, a giant riveted white-and-grey utility mech with orange and black chevrons walking out of a wall of flame toward the camera, its green visor eye glowing through the smoke, burning debris, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R85-legend · The four before the rift (77.5–77.8 s)

The public legend, but the four as they really are, never the city's painting. They stand before the rift; nothing
shows what caused it (the plan's section 8). **Attach the four founder portraits as character references.**

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, four heroes seen from behind as backlit silhouettes in a ruined stone temple, facing a violet rift hanging in the air with a black core: a hulking gnoll, a tall slender elf, a tiny goblin-like figure in a wide-brimmed hat, and a skeleton in a long coat, dust in the light, VHS film grain, 4:3 broadcast frame, no text
```

### R86-tavern · The tavern (77.8–78.0 s)

The first adventure, young and loud. **Attach the four founder portraits as character references.**

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, four young adventurers crowded round a table in a lively fantasy tavern at night, laughing and arguing with tankards raised: a gnoll, an elf with swept-back hair, a tiny blue goblin-like girl in a wide hat and round tinted glasses, and a skeleton in a white coat, warm lantern light, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R87-spinosaurus · The Spinosaurus (78.0–78.25 s)

It replaces the source's disturbing memory image (the plan's section 8).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, a huge spinosaurus bursting out of dense green jungle straight at the camera, jaws wide, its sail spine towering, vines and spray flying, dramatic low angle, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R88-skulls · Five tiny skulls (78.25–78.3 s)

Hyuck's five tiny white skulls on a cord. It was planned as a crop of his founder image, which would be a repeat.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, extreme close-up of five tiny white skulls threaded on a leather cord, swinging against black and tan fur, hard rim light, dark background, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R90-light · The figure of light (78.4–78.75 s)

They were received in a golden city of light with a cathedral at its heart. The goddess herself has never been
described, so she's a shape of light.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, a giant radiant figure made of white and golden light towering over four small adventurers in a golden city of light, a cathedral at its heart, rays and lens flare, airbrushed glow, VHS film grain, 4:3 broadcast frame, no text
```

### R91-map · The old map (78.75–78.96 s)

I add the date, 4721 AR, in type here, since Midjourney's lettering can't be trusted.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, an old engraved parchment map of an island coastline with hills and a temple marked, a jagged burned path drawn across it in red ink, a compass rose, stains and creases, top-down, VHS film grain, 4:3 broadcast frame, no text
```

### R92-creature · A small odd creature (78.96–79.2 s)

**Waits on a decision:** what it looks like is still open. It gets a glimpse here (LEDGER #37), alone in a spotlight
in the dark.

### R93-sketch · A pencil sketch in profile (79.2–79.4 s)

**Waits on a decision:** there's no description of his face anywhere yet, and his name, face and survival are all
held back. A sketch in profile is the one glimpse allowed. Tell me what he should look like.

### R94-gen2 · A Gen 2 head (79.4–79.6 s)

A glimpse (LEDGER #37, second round). The one place to try the show's own mecha designer in the anchor. No blue
skin and nothing mitflit-like: who builds them stays a secret.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, mecha design by Ikuto Yamashita, 1995 TV anime cel animation, close-up of a giant machine head where living flesh has grown through the metal plates, one large organic eye among the rivets, veins and cables tangled together, dark maroon light, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R96-anabala · Anabala in profile (79.75–80.0 s)

Just her profile against the blue, not at work: two shots after the Gen 2 head, work could hint at who builds them.
**Attach `art/R30-anabala.png` as a character reference.**

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, a tiny blue-skinned goblin-like girl with long pointed ears, a wide-brimmed hat and round tinted glasses, seen in close profile against a plain deep blue sky, thoughtful, cute rather than gruesome, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R99-sketch · The old party, in sepia (81.0–81.25 s)

Shucks keeps his hands in his pockets (a loose hand is a secret).

```
1995 anime production sketch, Yoshiyuki Sadamoto settei model sheet, faded sepia pencil drawing of four adventurers posing together in their prime: a gnoll, an elf with swept-back hair, a tiny goblin-like girl in a wide-brimmed hat, and a skeleton in a long white coat with a stethoscope and his hands in his coat pockets, loose construction lines, aged paper, no text
```

## Step 8: the last chorus and the end card (R101–R111)

The Frame in its column of light again, then the last three lead beats, then the end card. **Built here:** the
column of light, the vermilion stripe that wipes across R101, the black frame (R108), the searchlight (R109) and the
end card's credit.

**The last three of the six temporary faces** (lead beats 4, 5 and 6) follow the same rule as the first three:
- trainees in plain new uniforms, faces lit hard or half in shadow, so nobody takes them for NPCs
- each is replaced by a real player's character later
- each composition stays fixed when the swap happens

### R101-head · The Frame's head under the stripe (82.3–82.75 s)

**Attach `art/R23-frame.png`.** The vermilion stripe wipes across it here, and the director credit will hold over
it, as the source's does.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, retro industrial machinery like the 1992 Giant Robo OVA, close-up of the head of a giant riveted white-and-grey utility mech in three-quarter view, one green visor eye glowing, orange and black chevrons, dark background, hard rim light, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R102-crouch · Crouched in the light (82.75–83.25 s)

On plain black or grey, for me to stand in the column. **Attach `art/R23-frame.png`.**

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, retro industrial machinery like the 1992 Giant Robo OVA, a giant riveted white-and-grey utility mech crouched low with its arms crossed over its chest, front view, perfectly symmetrical, orange light from above, plain dark grey background, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R103-rise · Arms spread, rising (83.25–83.9 s)

16 frames. Best as a video (*it spreads its arms and rises; the camera pulls back*). **Attach `art/R23-frame.png`.** **Very specific on purpose** (Ingram: you can't be too specific about the era and style).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, directed by Hideaki Anno, 1995 TV anime cel animation, mecha in the style of the 1992 Giant Robo OVA, a colossal riveted utility mech seen from far below, throwing its arms wide and rising upward through a towering column of orange light, boxy white-and-grey armour plates, bold orange-and-black chevron hazard stripes, hydraulic pistons and hoses, a single glowing green visor eye, steam pouring from the vents on its back, sparks falling past the camera, the column narrowing toward a blinding point far above, hand-painted cel on a poster-colour painted background, crisp black ink outlines, two-tone hard cel shading, airbrushed highlights, limited 1990s broadcast palette, LaserDisc capture, film grain, 4:3 broadcast frame, no text, no logos
```

### R104-lead4 · Lead beat 4 (83.9–84.7 s)

Lead beat 4 (18 frames). The Frame dissolves into this pose, so it's front-on and symmetrical. **Very specific on purpose** (Ingram: you can't be too specific about the era and style).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, a sixteen-year-old trainee in a plain new khaki-grey trainee uniform with a stand-up collar and small brass buttons, standing front-on and perfectly symmetrical in the centre of the frame, eyes closed, arms crossed over the chest, calm and composed, inside a towering column of orange light full of thin vertical yellow streaks, sparks drifting down around them, face lit hard from above with the lower half in shadow, hand-painted cel on a poster-colour painted background, crisp black ink outlines, two-tone hard cel shading, airbrushed highlights, limited 1990s broadcast palette of vermilion, orange and gold, LaserDisc capture, film grain, 4:3 broadcast frame, no text
```

### R105-tiny · Tiny in the column (84.7–84.9 s)

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, 1995 TV anime cel animation, a giant utility mech seen tiny and far below at the foot of a vast column of orange light, sparks raining down around it, looking straight down from high above, hard cel shading, VHS film grain, 4:3 broadcast frame, no text
```

### R106-lead5 · Lead beat 5 (84.9–85.9 s)

Lead beat 5 (24 frames). Best as a video (*the head turns up to look at the sky; wind lifts the hair; clouds drift*). One of the six temporary faces, kept non-specific: pick whichever gender the six are short of. **Very specific on purpose** (Ingram: you can't be too specific about the era and style).

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, a sixteen-year-old trainee in a plain new khaki-grey trainee uniform with a stand-up collar and small brass buttons, short dark hair, seen from a very low angle against a deep blue summer sky piled with towering white cumulonimbus clouds, turning to look up at something high above with quiet determination, face half in hard sunlight and half in shadow, wind lifting the hair, hand-painted cel on a poster-colour painted sky background by Hiroshi Kato, crisp black ink outlines, two-tone hard cel shading, glossy eye highlights, limited 1990s broadcast palette, LaserDisc capture, film grain, 4:3 broadcast frame, no text
```

### R107-strain · The same face, straining (85.9–86.3 s)

A second picture of the same trainee as R106: close profile.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, extreme close-up profile of a teenage trainee straining, jaw clenched, eyes squeezed nearly shut, sweat on the brow, deep teal sky behind, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R109-lead6 · Lead beat 6, in the searchlight (86.4–86.6 s)

I strobe it here.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, a teenage trainee silhouetted black against a blinding white searchlight, one arm raised against the glare, dust hanging in the beam, VHS film grain, 4:3 broadcast frame, no text
```

### R110-smile · The sixth's smile (86.6–86.8 s)

A second picture of the same trainee as R109.

```
1995 TV anime screenshot, Neon Genesis Evangelion, Gainax, character design by Yoshiyuki Sadamoto, 1995 TV anime cel animation, original character, close-up of a teenage trainee smiling warmly with eyes closed, soft green summer light and out-of-focus leaves behind, crisp black ink lines, flat cel colours with one hard shadow tone, VHS film grain, 4:3 broadcast frame, no text
```

### R111-wall · The end card's wall (86.8–89.6 s)

The credit (製作 空白相続製作委員会) fades in over it, then everything fades to black. It's a flat dark field for
now.

```
1995 TV anime background painting, Neon Genesis Evangelion, Gainax, background art by Hiroshi Kato, hand-painted poster-colour background, a stained concrete hangar wall in dim red-brown light, large faint alien glyphs painted across it in flaking paint, water stains and rust streaks, flat and straight-on, VHS film grain, 4:3 broadcast frame, no text
```

## Retired: style calibration (Batch 0)

**Superseded 2026-09-25.** Everything is generated new, and existing portraits are never used as references (Ingram), so
the likeness test below (image prompt against omni reference) no longer applies. It's kept only as a record. The
prompts above carry the style through style references and wording instead.

**What it settles:** which method keeps a character's likeness while matching the source's close-ups; whether
Niji 7 draws our Gen 1 Frames as 1995 cel mecha; the city background style; the look of the temporary six; how a
Watcher glimpse reads; and what Midjourney's video does with each of them.

### B0-01 · A close-up of an existing character, two methods

The subject is Section Officer Vetch. Nothing about his look is secret, and he has a portrait.

**Style references (both methods):** `sref-face-01-officer-front`, `sref-face-04-commander-hand`,
`sref-face-05-older-man-smile`.

**B0-01A (Niji 7).** Also attach `artwork/character-portraits/section-officer.png` as an **Image prompt**.

```
1995 TV anime cel animation still, head-and-shoulders close-up of a middle-aged officer with neat dark hair, high-collared pale institutional tunic, a clipboard held flat against his chest, put-upon rather than cruel, looking straight at the camera, clean black line art, flat cel shading with one hard shadow tone, painted grey-green wall behind, 4:3 broadcast frame, soft film grain --niji 7 --ar 4:3 --sw 300
```

**B0-01B (V7).** Attach the same portrait as an **Omni reference** instead.

```
1995 TV anime cel animation still, head-and-shoulders close-up of a middle-aged officer with neat dark hair, high-collared pale institutional tunic, a clipboard held flat against his chest, put-upon rather than cruel, looking straight at the camera, clean black line art, flat cel shading with one hard shadow tone, painted grey-green wall behind, 4:3 broadcast frame, soft film grain --v 7 --ar 4:3 --ow 150 --sw 300
```

*What I'm checking:* which one still looks like Vetch, and which one looks like the source. Save a result from
each into `drop/B0-01A/` and `drop/B0-01B/`.

### B0-02 · A founder flash: Hyuck

**Style references:** `sref-face-04-commander-hand`, `sref-face-06-agent`.
**Image prompt:** `artwork/character-portraits/hyuck.png`, or use B0-01's winning method.

```
1995 TV anime cel animation still, close-up of a huge gnoll barbarian, black and tan fur, feathers and painted bands in his mane, big teeth bared in a fierce grin, hunched shoulders, a cord of five tiny white skulls at his throat, an iron flail chained to an old thigh bone slung over one shoulder, hard orange rim light against a dark background, clean black line art, flat cel shading, 4:3 broadcast frame, soft film grain --niji 7 --ar 4:3 --sw 300
```

### B0-03 · A Gen 1 Frame, hero plate (tall, for a tilt)

**Style references:** `sref-mech-03-arms-spread-column`, `sref-mech-01-hand-vs-sky`.

```
1995 TV anime cel animation still, a giant riveted utility mech converted from an excavator, boiler-plate armour in dull vermilion and cream, yellow and black road-crew chevrons, paint worn through to bare metal at every handhold, hydraulic pistons, a cluster of searchlights for a head, standing front-on in a column of orange light with drifting sparks, dark hangar gantry silhouettes, low angle, clean line art, flat cel shading, soft film grain --niji 7 --ar 1:2 --sw 250
```

*What I'm checking:* it should read as a digger rather than a god, but a heroic one. If the result comes out
purple or sleek, say so and I'll adjust.

### B0-04 · Kurose at sunset (wide, for a pan)

**Style references:** `sref-bg-01-city-sunset`, `sref-bg-03-rooftops-dusk`.

```
1990s TV anime background painting, wide panorama of a harbour city at sunset, dense red-roofed old town terraced up a cliff, factory smokestacks along the waterfront, dockside cranes, tall sail-rigged trading ships at anchor, a long causeway running out to a stone sea-fort in the channel, no tall buildings, warm orange sky with long clouds, hand-painted poster-colour texture, soft film grain --niji 7 --ar 3:1 --sw 250
```

### B0-05 · A temporary newcomer (for lead beat 1)

**Style references:** `sref-face-08-boy-low-angle-sky`, `sref-face-09-boy-eyes`.

```
1995 TV anime cel animation still, three-quarter profile close-up of a young trainee in a plain brand-new uniform jacket, looking up and to the left, face half in shadow, short dark hair lifting in the wind, calm and unreadable, clean black line art, flat cel shading, plain flat pale grey background --niji 7 --ar 4:3 --sw 300
```

*This one is also the cut-out test:* a flat grey background is what the background remover likes best.

### B0-06 · The Watcher, a glimpse

**Style reference:** `sref-bg-02-hq-cavern`.

```
1995 TV anime cel animation still, a black night sky over a harbour town crowded with enormous pale eyes on long swaying stalks and slow drifting tentacles, seen from a narrow street between tiled roofs, silent and eerie, cold grey highlights, clean line art, flat cel shading, soft film grain --niji 7 --ar 4:3 --sw 200
```

### B0-07 · Motion tests (Midjourney video)

Animate your favourite result from each of these with **Manual** motion and **Low motion**. Download HD if your
plan has it.

- **B0-07a**, from B0-02 (Hyuck): `slow push-in, fur stirring in the wind, the tiny skulls swinging, he bares his teeth`
- **B0-07b**, from B0-03 (the Frame): `slow tilt up from the feet to the searchlights, steam venting from its back, sparks drifting upward`
- **B0-07c**, from B0-05 (the newcomer): `wind lifts the hair, the eyes close slowly and open again, clouds drift behind`

Save each into `drop/B0-07a/`, `drop/B0-07b/` and `drop/B0-07c/`.
