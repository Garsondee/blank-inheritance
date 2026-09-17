# The Audio System — music, ambience and the Sound Desk

Built 2026-09-17. This document describes what exists and runs, not a proposal:
the pipeline, the library, the mix engine, the director, and the two pieces of
UI. Where something is deliberately not built, it says so under §9.

The short version: **hundreds of files of very different origins become one
consistently-loud library; Foundry's own playlist documents carry what is
playing; a mix bus spliced into Foundry's own audio contexts gives the GM
faders, ducking and real meters; and a cue vocabulary turns "play the villain's
theme and reveal the memo on the brass hit" into one press.**

---

## 1. The decision everything else follows from

**Work through Foundry's own audio, never beside it.**

Foundry already does three things well and we do not reimplement any of them:

| It already does | So we | Rather than |
|---|---|---|
| Replicates what is playing to every client, including late joiners and reloads (`Playlist`/`PlaylistSound` documents) | Generate real playlists and drive playback by updating those documents | Broadcasting "play this" over a socket and rebuilding state ourselves |
| Gives each client three audio contexts (music, environment, interface) with a master gain each, and three per-client volume settings to drive them | Splice our bus chain into those contexts, and let the Radio write **Foundry's own settings** | Inventing a second, parallel volume system that disagrees with the sidebar |
| Schedules callbacks against a sound's own playback clock (`Sound#schedule`) and crossfades (`Sound#fade`) | Hang musical markers and crossfades off those | Timers that drift away from the audio |

What Foundry does *not* do — and therefore what this system is — is loudness
consistency across a mixed-origin library, a GM mixing surface, ducking,
layered ambience with random one-shots, and cues that fire things on a musical
beat.

---

## 2. The pipeline (`tools/audio-pipeline/`)

```
audio/in-tray/**            →  analyse  →  propose  →  [review]  →  process  →  verify  →  upload
(never modified, ever)         loudness    kind/tags   a human     Ogg Opus    decode +   checksummed
                               + silence   + title     confirms    normalised  loudness   both sides
```

Run it:

```bash
node tools/audio-pipeline/audio-pipeline.mjs analyse     # measure everything (cached)
node tools/audio-pipeline/audio-pipeline.mjs process     # encode what changed
node tools/audio-pipeline/audio-pipeline.mjs verify      # prove every file is usable
node tools/audio-pipeline/audio-pipeline.mjs upload      # push to the server, verified
```

**Nothing in `audio/in-tray/` is ever modified, moved or deleted.** Processed
files go to `audio/library/` (gitignored). Re-running is cheap: analysis is
cached by file content, and a file is only re-encoded when its *plan* changes.

### 2.1 What "normalised" means here

Every file is measured with EBU R128 (`ebur128`, true-peak enabled) and
normalised to a target chosen by what kind of sound it is:

| Kind | Plays in | Judged by | Target | Why |
|---|---|---|---|---|
| `music` | music | integrated loudness | **-18 LUFS** | The reference everything else is set against |
| `ambience` | environment | integrated loudness | **-24 LUFS** | Six dB under music, so beds sit under the score at unity faders |
| `sting` | music | loudest 3 seconds | **-14 LUFS** | A hit has to cut through the bed it lands on |
| `sfx` | environment | loudest 3 seconds | **-16 LUFS** | Diegetic events, a little under stings |
| `voice` | environment | loudest 3 seconds | **-18 LUFS** | Radio chatter, intelligible without dominating |
| `interface` | interface | loudest 3 seconds | **-20 LUFS** | Console blips, deliberately small |

**The gaps between those targets are the default mix.** With every fader at
unity the balance is already right; the GM's faders are for shaping a scene,
not for fixing the library.

Two details that matter:

- **Short sounds are not judged by integrated loudness.** An integrated reading
  of a two-second explosion is mostly silence. Anything fire-once is normalised
  by its loudest three-second window (or its loudest 400 ms if it is shorter
  than that).
- **Dynamics are not sacrificed to hit a number.** If the gain needed would
  push the true peak over the ceiling, up to 4 dB is caught by a transparent
  limiter; beyond that the gain is capped and the file plays *under* target,
  with the shortfall recorded. A quiet, dynamic orchestral cue stays quiet and
  dynamic rather than being squashed. (Four music files and three ambience beds
  in the current library are in this position.)

### 2.2 Format

**Ogg Opus, 48 kHz**, bitrate by kind (music 160k, ambience/sfx 128k,
interface 96k, voice 64k mono), never above the source's own bitrate for a
lossy source. Checked with Ingram 2026-09-17: every player uses current Chrome,
which Foundry itself requires, so the smallest format that also loops cleanly
is safe to use everywhere.

Measured on the real library: **8.36 GB of sources became 785 MB.**

### 2.3 Seamless loops

A bed that is going to loop gets its last few seconds folded back over its
first with an equal-power crossfade, so the loop point is inaudible. The
crossfade is about 6% of the bed, clamped to 1–4 seconds. This is why a
processed bed is *shorter* than its source — that difference is checked by
`verify`, not a mistake.

### 2.4 What `verify` actually checks

For every processed file: it exists; its bytes still hash to what the pipeline
recorded; it decodes with ffmpeg's strictest error reporting (a file that
decodes "with warnings" is one a browser may refuse); its length matches what
it should be after trimming and loop-folding; its true peak is under the
ceiling; and its measured loudness is on target. Failures block, warnings
surface.

It also reports when a **source** file lies about itself — one MP3 in this
library declares 358 seconds and contains 89 (a truncated download). The
pipeline measures what actually decodes rather than trusting a header.

---

## 3. The three stores, and who owns each

| File | Owner | Rewritten by |
|---|---|---|
| `data/audio/library.json` | the pipeline | every run, in full |
| `data/audio/review.json` | a human | never by a tool |
| `data/campaign/asset-registry.json` | a human | never by a tool |

**This split is the point.** The pipeline can be re-run at any time without
losing a decision, because it has nowhere to write one. A human's decisions
(what a file actually is, what it is called, which moments inside it matter)
live in `review.json`; reservations live in the same asset registry that
already locks artwork to characters, so one track can never quietly end up
serving two purposes.

`core/audio-library.mjs#buildLibraryIndex` is the single place the three are
combined, so the desk, the playlist builder and the pipeline report all see the
same answer — including the same list of problems (an asset reserved twice, a
reservation naming an id that does not exist).

**A reserved track is never in a shuffle pool.** A villain's theme heard at
random in a shopping scene is no longer that villain's theme.

> ⚠ **New stores, flagged deliberately** (see the standing data-fragmentation
> crisis): `data/audio/` is four new things — `library.json`, `review.json`,
> `soundscapes/*.json`, `cues/*.json`. Reservations were deliberately *not* made
> a fifth: they extend the existing asset registry instead.

---

## 4. The mix engine (`scripts/foundry/audio-engine.mjs`, every client)

```
   ctx.gainNode ──► duck ──► bus ──┐
   (this player's own volume)      ├─► limiter ─► speakers
   sting ─► stingLevel ─► stingBus ┘
```

- **`bus`** is the GM's fader for that channel, read from a world setting, so
  every client's mix moves together when the GM rides it.
- **`duck`** dips the beds under a sting and lets them back up.
- **Stings bypass the duck** — a sting that ducked itself would be a bug nobody
  could see — while still passing through a mirror of this player's own channel
  volume, so turning music down turns musical stings down with it.
- **`limiter`** is a safety net, not a sound. Normalised material never reaches
  it; a GM pushing a fader to +6 dB cannot make the output clip.
- The whole chain can be switched off per client (`audioEngine` setting),
  restoring Foundry's plain routing. A layer you cannot remove is a layer that
  can end a session.

**Ducking holds through the hit, not through the tail.** A war horn runs ten
seconds, nine of which are decay; holding the music down for all of it reads as
a fault. The hold is capped at 2.5 seconds.

**The meters read the programme, not the monitoring.** The taps sit after the
player's own volume, so the reading is compensated by that gain — otherwise a
GM listening quietly watches dead meters while the table hears a full mix.
Calibrated so 0 VU = -18 dBFS: a normalised track at unity faders peaks at
about -2 VU, which is where a VU meter should sit.

---

## 5. The director (`scripts/foundry/audio-director.mjs`, GM-side)

Two authored shapes, both validated at load time (`core/audio-director.mjs`),
both one-file-per-entity under `data/audio/`:

### 5.1 Soundscapes — a standing state

A place or a situation: what music (a shuffle pool, one named track, silence,
or **leave whatever is playing alone**), which ambience beds at what levels,
which random one-shot layers, and where the GM's faders should sit.

```jsonc
{ "id": "demo-street-night", "type": "audio-soundscape",
  "music": { "pool": "tense" },
  "combat": { "pool": "battle" },
  "ambience": [ { "track": "city-downtown-1537", "level": -4 },
                { "track": "brs-rain-street-neighborhood-med-2", "level": -10 } ],
  "scatter": [ { "tracks": ["police-dispatch-378", "…"], "every": [25, 70], "level": -8 } ],
  "mix": { "music": -4, "ambience": 0 }, "fade": 4000 }
```

**Scatter layers** are the piece a VTT usually lacks: a dispatch call every
twenty to sixty seconds, a distant explosion now and then, never the same clip
twice running. Timed on the GM's client alone, so the whole table hears the
same clip at the same moment.

Applying a soundscape only writes what changed — a bed already playing at the
right level is left completely alone rather than restarted.

### 5.2 Cues — something that happens

An ordered list of steps, split into groups at every `wait`; steps inside a
group start together, so "the sting and the theme hit on the same beat" is the
default rather than the exception.

Verbs: `music`, `music-stop`, `ambience`, `ambience-stop`, `soundscape`,
`sting`, `mix`, `wait`, `at-marker`, `banner`, `handout`, `macro`.

### 5.3 Triggers — cues that fire themselves

`scene-activate`, `splash`, `stage-reveal`, `combat-start`, `combat-end`,
`segment-advance`, `beat`. A trigger field that is present must match; a field
left out matches anything.

- **A villain's theme on their splash** answers `theatre-of-the-mind-staging.md`
  §10's open question 8 ("what does a splash do to audio?") for the case Ingram
  named on 2026-09-17: *"There may even be baddies with specific songs that play
  when they appear in the story."* A splash for someone with no cue still does
  nothing, which leaves the rest of that question open.
- **Combat music is a detour, not a state change.** If the scene's soundscape
  names combat music, a fight starts it and the end of the fight returns to the
  soundscape's own music.
- **The day ring turning** fires `segment-advance`, which is where the
  segment-transition ceremony's sound cue (`ux-doctrine.md` §7a) belongs.

### 5.4 Markers — music that fires something

A marker is a named moment inside a track, authored in `review.json`. A cue can
hang steps off one:

```jsonc
{ "do": "at-marker", "track": "observer-theme", "marker": "brass-hit",
  "then": [ { "do": "handout", "brief": "…", "handout": "the-memo" } ] }
```

Scheduling runs on the GM's own copy of the sound, on the audio clock, so it
does not drift. **Presentation then lands on each client at that client's own
playback position**: every player starts a track a fraction of a second after
the GM (the document update has to arrive, and each browser decodes the file
itself), so a reveal sent the instant the GM's copy reaches the beat would
arrive *early* for them. Each client waits out its own difference instead.

Measured live: a marker at 22.0 s fired at playhead 22.06 s.

The content of a handout travels **with** the reveal rather than being granted
ahead of time — nothing about it reaches a player's browser until the moment it
lands (doctrine Law 11).

### 5.5 Journals in both directions

- **Journal → music:** an `@Cue[cue-id]{Label}` link in any journal page fires
  that cue (GM only; see §9 for what is not built yet).
- **Music → journal:** the marker mechanism above.

---

## 6. Why real Foundry playlists

`syncAudioPlaylists()` generates, from the library:

- one **SHUFFLE** playlist per music pool (`Music — Battle`, …),
- **`Music — Reserved`**, a soundboard of reserved themes that only play when
  asked for by name,
- one soundboard per **ambience shelf**, every bed set to repeat.

Fire-once sounds are deliberately **not** playlists: a `PlaylistSound`'s playing
state is persisted, so a late joiner or a reload would re-fire a sting that
ended a minute ago. Those go over the socket instead.

Generation follows the module's existing sync discipline: deterministic ids,
`keepId: true`, and a re-run with unchanged data touches nothing (verified:
38 playlists, 299 sounds, second run reports 38 unchanged and writes no
documents). It only ever deletes documents it generated itself — anything a GM
added by hand stays.

**Playlist documents reach every client** — measured on a real player account,
not assumed: all 38 playlists were in that client's collection with their full
sound lists. So a `PlaylistSound` is named by its *music* ("Is Paris Burning"),
never by its purpose ("The Observer's theme"); purpose lives in the GM-side
registry.

Foundry's own `Playlist#visible` (`isOwner || playing`) does limit what a
player's *sidebar* shows to whatever is currently playing, which is a real
mitigation — but it is a rendering filter, not redaction. The names are in
their browser either way, which is why the naming rule above is the actual
protection.

---

## 7. The two surfaces

### 7.1 The Sound Desk (GM)

A panel, not a pod on the deck: `ux-doctrine.md` §9 files the audio mixer under
"move to the terminal" (Law 13), because it is used a few times a session and
the chassis belongs to what happens inside a turn. Same toggle chassis as the
Summon panel.

On air readout (with a playhead: elapsed, remaining and a progress bar on
whatever music is playing) · soundscape list · cue list · music pools · three
channel strips (amber VU meter, photoreal filmstrip fader, mute, ±1 dB nudges)
· searchable library with per-row actions · build/refresh · **Bind to scene**.

**Bind to scene** is how a soundscape gets attached without editing JSON:
apply one, press Bind, and activating that scene brings it back. Pressing it
again unbinds — one key, both directions, because a binding you cannot see how
to remove is one nobody dares press. (Verified live: silence → leave the scene
→ return → music, both beds and the scatter layer all came back by themselves.)

**Audition is pre-fade listen**: the headphone key plays a track on the GM's
machine only, touching no document, so the library is browsable mid-session
without the table hearing it.

### 7.2 The Radio (every player)

A phone app: three knobs writing **Foundry's own** client volume settings, a
mute-all, and a needle showing this client's own output level. No track titles
— a player's handset is not the place to announce that the villain's theme has
started.

The GM's faders and the player's knobs are different layers of the same chain:
the GM balances music against ambience for the table, each player sets how loud
the whole thing is for them.

---

## 8. Operating it

**Adding music:** drop files into `audio/in-tray/music/<mood>/` — the folder is
the category, and a folder whose name contains "sting" makes stings. Run
`process`, then press **Build playlists** on the desk.

**Binding audio to a scene:** apply the soundscape you want, then press **Bind
to scene** on the desk. That writes `flags.blank-inheritance.audio.soundscape`
on the Scene; nothing else is needed.

**Adding samples:** drop them anywhere under `audio/in-tray/`. The classifier
proposes a kind, a shelf, a title and tags from the file's own embedded
description first and its filename second, and records why. Confirm or overrule
in `data/audio/review.json`.

**Reserving a track:** add an `{ "kind": "audio", "id": "<asset id>",
"assignedTo": {...} }` entry to `data/campaign/asset-registry.json`, then
rebuild the playlists. It leaves its pool and joins `Music — Reserved`.

**Authoring a soundscape or cue:** one file under `data/audio/soundscapes/` or
`data/audio/cues/`. Both are validated on load; problems are listed on the desk
rather than thrown, so one bad file cannot take the session down.

---

## 9. Deliberately not built (yet)

- **A review UI.** `review.json` is hand-edited today. The
  `asset-review-pipeline` idea's listen-and-confirm backend is still unbuilt;
  the desk's audition key covers "listen to it" for now.
- **Marker authoring.** Markers are hand-written into `review.json`; tapping a
  marker while auditioning would be the obvious next step.
- **Mech radio chatter** (`mech-radio-chatter-audio`, GH #100) is a separate
  accepted idea. The pieces it needs — a voice kind, one-shot broadcast,
  ducking, scatter layers — now exist.
- **Positional/diegetic ambience** on the canvas (Foundry's own AmbientSound
  placeables) is untouched; it rides the same environment bus for free.
- **Per-player audio profiles** beyond Foundry's three volumes.

---

## 10. Known limitations, honestly

- **Ambience beds are normalised to one loudness**, which means a thunderstorm
  and a room of crickets arrive equally loud. That is deliberate (predictable
  faders beat "correct" absolute levels), and soundscape layer levels are how
  you shape it.
- **Meters freeze while the GM's window is hidden.** `requestAnimationFrame` is
  suspended by the browser; nothing is lost, the needles simply stop until the
  window is visible again.
- **A very quiet source lifted to target lifts its noise floor with it.** The
  pipeline reports the gain it applied; a bed that needed +18 dB is worth
  listening to before trusting.
- **Two tracks in the library are clipped masters** (true peak above 0 dBFS in
  the source). They are played about 2 dB under target rather than limited
  harder.

---

## 11. Session 0/1: the first real content

Authored 2026-09-17, live-verified by clicking through the actual Scene Runner
(not just applied by hand): seven soundscapes, one per scene brief in the
opening episode, plus five cues bound to real beats. `data/audio/soundscapes/`
and `data/audio/cues/` — no demo files remain in either directory.

**Scene Runner integration, added the same day.** Two hooks make this content
play itself rather than needing a GM to remember to press anything:

- **Picking a scene applies its soundscape automatically**, if one has been
  authored (`scene-runner.mjs#applySceneAudio`, called from both the panel's
  own scene picker and `openSceneRunner`'s macro/API entry). A scene with
  nothing authored is a silent no-op — most of the campaign will be in this
  state for a long time yet, and that must never be a console error.
- **Ticking a beat fires whatever cue is bound to it** — the `beat` trigger
  type existed in the schema from the start but had no real caller until now
  (`scene-runner.mjs#fireBeatAudio`, from both `#onToggleBeat` and
  `#onRecordOutcome`). Fires only on the branch that newly sets a tick, never
  on the branch that clears one — ticking a beat again to undo it must not
  re-fire whatever it triggered the first time.

**Three tracks were reserved** (`data/campaign/asset-registry.json`), on
Ingram's own instruction to pick and choose rather than build unique music for
every antagonist: *"I deliberately put the music into different directories
so that we could make sure that some songs are unique, special or associated
with particular baddies/events/themes."* None of the three is a villain
theme — Session 0/1 has no combat-capable antagonist on stage yet (see below):

| Track | Reserved for | Why |
|---|---|---|
| "Main Title" | The campaign's own cold open | It is *called* Main Title. The Road In's soundscape plays it once, straight through, under all six arrival montages — an overture, not a mood loop. |
| "JINTETSU no Toujou" | Section Nine's first fight (flood-tunnel) | The party's very first combat gets a track of its own rather than a shuffle from the 27-track battle pool. Title translates roughly to "\<name\>'s Entrance" — fits six centipedes erupting out of the sludge better than anything generic. |
| "A Crystalline Night Sky" | The cicada-stencil motif (`ideas/entries/cicada-motif.json`) | Reserved *ahead of use* — not spent in Session 0/1 (see below), so it can never be discovered sitting in the mystery pool's shuffle before the thread that owns it is ready for its own cue. |

**The cicada mark gets sound design, not scoring.** The stencil recurs across
`the-road-in` and `the-errand` as a small, unexplained, deep-violet mark —
and, per the story bible, its meaning is inseparable from the campaign's
central secret (`ideas/story/bible/characters/manako.md`: the warm old man
who saves the party in "The Errand" is, unknowingly, the whole antagonist
structure's own operator). **No cue anywhere touches this and none should.**
The cicada motif itself is safe to score — Ingram's own idea entry canonises
cicadas as a beloved, sacred civic animal, not yet a sinister one — but a
musical STING on the mark would read as "something is wrong here," which is
false in-fiction and would spoil a twist the players are nowhere near.
`cicada-motif-appears.json` fires on both beats and does exactly one thing: a
real cicada drone (`cicadas-174`) slips quietly into whatever ambience is
already playing, at -14 dB, easy to miss, never announced with a banner. It
is sound design a keen-eared table might eventually notice recurs — not a
signal. "A Crystalline Night Sky" is held in reserve for whenever this thread
gets a scene that can bear a real musical moment, which is not this one.

**Two more cues do the same kind of quiet, specific work:**
"Section Nine, last, flat, worst" (`canteen-assignment-lands.json`) cuts the
canteen's music to nothing over five seconds when the tannoy reads the
assignment — the brief's own ending note is "don't let the scene wander after
it," and silence lands harder than a mood swap would. "The choice"
(`as-discussed-let-the-silence-do-it.json`) only dips the music -6 dB when the
party decides whether to let their superior take the credit, matching the
brief's explicit instruction to "say nothing to prompt them — let the silence
do it" — a dip, not a stop, because this is the table thinking out loud, not
a scored beat.

**Verified live, beat by beat, against the real Scene Runner UI (not the API
alone):** opening each of the seven scenes applies the right pool or track and
the right ambience beds at the right levels; clicking the real "the-mark-again"
checkbox layers the cicada drone in and leaves it there through an undo/redo
cycle; clicking "the-fight" starts the reserved battle track over silence;
clicking "the-announcement" fades the canteen to nothing; clicking "the-choice"
dips As Discussed's music by exactly -6 dB. Rebuilding the playlists after the
reservations moved the three tracks out of Battle (27→26), Mystery (13→12) and
Moment of Cool (1→0, and the now-empty pool's own playlist was correctly
deleted) and into a freshly created "Music — Reserved".

**A real local-environment bug found doing this**, unrelated to the audio
system itself: the local Foundry test install's `module/blank-inheritance/
data/campaign/campaign/` was a stale, hand-copied snapshot from over a week
earlier, not a junction — so a freshly-edited `asset-registry.json` on disk
was invisible to the locally running app until it was replaced with a real
junction to `data/campaign/`, matching the `audio` junction already in place.
Anyone hitting "my edit doesn't show up locally" after editing something
under `data/campaign/` should check this first.

---

## 12. Where the code lives

| Piece | Pure (`scripts/core/`) | Adapter (`scripts/foundry/`) |
|---|---|---|
| Levels, faders, meters, ducking | `audio-mix.mjs` | `audio-engine.mjs` |
| Kinds, targets, ids, the index | `audio-library.mjs` | `audio-store.mjs` |
| Soundscapes, cues, triggers, playlists-as-data | `audio-director.mjs` | `audio-director.mjs`, `audio-playlists.mjs` |
| The desk's model | `audio-desk.mjs` | `sound-desk.mjs`, `radio-app.mjs`, `audio-present.mjs` |

Pipeline: `tools/audio-pipeline/` (`core/` pure, `adapters/` the only place
ffmpeg or the filesystem is touched).

Tests: `test/tier1-audio-{mix,library,director,desk}.test.mjs`,
`test/tier3-audio-contract.test.mjs` (pins the real Foundry APIs this leans
on), `test/tier4-audio-{engine,playlists}.test.mjs`, `test/audio-pipeline/`.
