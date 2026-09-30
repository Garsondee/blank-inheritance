# Handouts: what the table is handed, and keeps

**Status:** built 2026-09-26. The first handout is the acceptance letter in The Road In
(`data/scene-briefs/episode-c1e1--the-road-in.json`, `handouts[0]`).

Ingram, 2026-09-26:

> "the GM can press a button and it appears as a journal for the group to examine it in depth and
> whenever we do that we also make it so that this journal now is public to the players. This is a
> process we'll do lots throughout the adventure, anything that players find and might want to refer
> to later."

## What one press does

Revealing a handout is two acts at once:

1. **It is filed.** The document goes into a journal folder called **Papers**, readable by the players
   it was given to for the rest of the campaign. They can open it again from Foundry's Journal tab
   whenever they like. They can read it, never edit it.
2. **It is shown.** It opens on the screens of those players who are connected. A player who is not
   connected finds it in their Papers later.

It always asks first (doctrine Law 17: confirm anything the players will see). Pressing it again
opens it again and changes nothing else: no second copy, no second page. If the brief has been
edited since, the new wording replaces the old.

Before 2026-09-26 a reveal was transient: the window closed and the document was gone. Only an
"artefact" was kept. There is now no transient reveal. An artefact is the same act, plus the record
that the party holds it.

## Who gets it

- **The whole table** ("Show the table"): one page, open to every player.
- **One player** ("Show one player", or a beat whose `delivery` is `solo`): filed for that player
  alone. Nobody else can open it, and nobody else is told. Showing it to the table later only ever
  widens who can read it. Nothing is ever taken away from anyone.
- **A personal handout** (`"personal": true`): one private copy per player, each with that
  player's own character's name typed into the gap. For a document every character received
  separately, like the acceptance letter. Each player sees only their own.

## Every way of revealing goes through one filer

| From | How |
|---|---|
| A beat with `kind: "reveal"` and a `handoutRef` | its button in the Scene Runner |
| The runner's **To hand over** list | Show the table / Show one player |
| An inline trigger (`kind: "reveal-handout"`) | the chip in the beat's text |
| A music cue step (`do: "handout"`) | at its marker, with no confirm (the cue press is the deliberate act) |
| An artefact's **Hand it over** | its own confirm, then the same filer |

The code: `module/blank-inheritance/scripts/core/handouts.mjs` decides everything (which pages,
what each one says, who can read each, whose screen each opens on). `scripts/foundry/handouts.mjs`
carries that out in Foundry and decides nothing.

## Writing one

A handout is an entry in a scene brief's `handouts` array (`data/schema/scene-brief.schema.json`):

- `id`, `title`: the title is also the journal's name in the players' Papers.
- `body`: the document, as HTML. Or `imagePath` for a handout that is only a picture.
- `personal`: one private copy each, as above.
- `gmNotes`: what the GM should know that the players should not. Shown in the runner only.
- `catchables`: what a careful reader can find in it. It is the list to check against when a player
  says "wait, hang on".

### Paper documents

A Directorate document is made the way a real one was, in order, and each step has its own face.
Ingram, 2026-09-26: *"you have to do all your typewriter text first and then you can put hand written
notes around that, not inside or within it and the same goes for stamps."* A contract test fails if a
stamp or a pen note is ever put inside a typed paragraph or list item.

1. **Printed:** the letterhead, general stationery used for everything. `bi-paper__letterhead` holds
   the large `bi-paper__mark`, a `bi-paper__org` block (`-jp`, `-en`, `-sub`), and a ruled
   `bi-paper__box` (`bi-paper__box-label`) left blank for something typed, like the form number. It
   wraps rather than overflows in a narrow journal window.
2. **Typed:** everything else, inside `bi-paper__typed`, in **TT2020** (`--bi-font-typed`). This is a
   real typewriter font whose ten versions of every glyph mean no two letters strike alike. Useful
   pieces: `bi-paper__dateline` (office on the left, date on the right), `bi-paper__heading`,
   `bi-paper__notes-head` and `bi-paper__notes` for small print, and `bi-paper__slip` for a tear-off slip
   (the shared `bi-form-row` rows, with typed underlines). Words struck in later on a particular
   machine are `<typed machine="…">`, in a darker ribbon.
3. **Pen:** `<s class="bi-paper__struck">` rules typed words through in the clerk's ink (`--bi-paper-pen`),
   left readable. A note goes in the margin, never in the text: wrap the typed paragraph and a
   `bi-paper__margin` in `bi-paper__annotated`, and write the note as `bi-paper__note` (add
   `bi-paper__note--arrow` for a hooked arrow back to the text). On a wide sheet the margin sits in the
   right-hand gutter beside its paragraph; on a narrow one, under it.
4. **Stamped:** `bi-stamp` (`bi-stamp__kanji`, `bi-stamp__label`) goes in a margin, and `bi-paper__seal`
   beside the signature block (`bi-paper__sign`, `bi-paper__sign-text`, `bi-paper__signature`,
   `bi-paper__signatory`), in the open, never over typing.

Add `bi-paper--letter` for the creases of a letter folded in three.

### Three campaign tags

These are turned into plain HTML before anything reaches Foundry:

| Tag | Does |
|---|---|
| `<typed>Monday next</typed>` | words struck on a typewriter, not printed |
| `<typed machine="admissions">…</typed>` | struck on a particular machine, with that machine's fault |
| `<typed field="character" fallback="Candidate" machine="admissions"/>` | the reader's own character's name, typed into the gap on their copy |
| `<redact c="2">…</redact>` | the existing clearance pipeline (`core/redact.mjs`): removed below the reader's clearance |

**Typewriters with broken letters** are listed in `TYPEWRITERS` in `core/handouts.mjs`, each with
its `faults` (a string of lower-case letters). The first is `admissions`, whose lower-case e is broken
(The Road In, canon since 2026-09-10). A fault is a fingerprint: every document that machine types
carries it, which makes a typewriter a real way to trace a paper to a desk later in the campaign.
**The damage is not drawn by us** (Ingram, 2026-09-26: a damaged typewriter font, "so that you can have
some variation when you need it without having to invent it yourself"). Each broken letter is set in
one of three damaged cuts of TT2020 Style F, real misstrikes, taken in turn across the document, so the
same letter never prints the same way twice in a row. Only the low strike of a bent typebar is ours.
Any lower-case letter can be a fault: the damaged cuts carry the whole alphabet. Add a machine the day a
document needs one; a `machine` the list does not name is an error.

**The fonts:** TT2020 (OFL 1.1, Fredrick R. Brennan, credited in `CREDITS.md`) comes from GitHub, not
Google Fonts. `tools/font-pipeline/build_fonts.py` builds it from each family's `source` in
`fonts.json`: Style E subset to Latin with its glyph-cycling `calt` kept (`tt2020-400.woff2`, 440 KB),
and three single-variant damaged cuts from Style F (`tt2020-fault-1..3-400.woff2`, about 130 KB each).

### Two rules Foundry imposes

- **Foundry's server cleans every page's HTML** (`cleanHTML`, allowlist in its
  `common/constants.mjs`). A tag it does not allow is dropped *and its text kept*. So an unprocessed
  campaign tag would publish its contents bare. That is why an unprocessed tag is a hard error in
  the renderer, and why a contract test checks every rendered handout against Foundry's real
  allowlist.
- **No inline `<svg>`** (not on the allowlist). Draw it as a file and use `<img src="modules/…">`.
  The handout art lives in `module/blank-inheritance/assets/ui/handouts/`. The two seals there are
  built from the registered artwork by `tools/handouts/build_paper_assets.py`. The signature is
  hand-drawn SVG.

## Looking at one without Foundry

`design/ui/handout-preview.html`, served by the `ui-prototypes` launch config (`design/ui/serve.py`),
renders any brief's handout through the real renderer and the real stylesheets, inside the same
journal-page wrapper the bridge styles:

    http://localhost:4175/design/ui/handout-preview.html?brief=episode-c1e1--the-road-in&handout=acceptance-letter&name=Hanae%20Kesse

Leave `name` off to see the copy a player with no character yet receives.

## Tests

- `test/tier1-handouts.test.mjs`: the renderer and the filing plan.
- `test/tier4-handouts.test.mjs`: the filer against a mocked Foundry (`test/support/mock-journal.mjs`).
- `test/tier3-handouts-contract.test.mjs`: every handout against Foundry's real sanitiser, the theme's
  layering rules and the module's files. It also covers the scene runner's wiring, the solo-button
  regression, and the acceptance letter itself: the paper says what the GM reads aloud, word for
  word, and names nothing the players may not know yet.
- `test/handouts/test_build_paper_assets.py`: the asset builder (`npm run test:handouts`).

## Not built

- `journalRef` (a handout living in an existing world journal) is in the schema but was never read by
  the runner, before or after this.
- One page per clearance tier, for the redacted-document chain (`design/visual-identity.md` §3b).
  Today every reader is rendered at clearance 0.
- Anything a player can write on a handout. The acceptance letter's return slip is printed and left
  blank, by Ingram's choice (2026-09-26).
