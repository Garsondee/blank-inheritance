# Stagecraft as a module of its own

*Drafted 2026-10-01 at Ingram's request. Part of [Stagecraft: Puppet Show](README.md). **Started the same day**: the
module exists in [`module/stagecraft/`](../../module/stagecraft/), is enabled in the local Foundry and passes its tests and
a live check; §17 says what is built and what is still only a plan. The rest of this document is the design it follows,
and §16 lists the calls that are hers. Read [`renderer.md`](renderer.md) first for why the system is drawn with three.js,
and [`feel.md`](feel.md) for what the module must never lose.*

*Words. A **card** is a person on the stage; a **name caption** the label beside a first appearance; a **stick** the
handle that appears when a card is picked up. "The adventure" is Blank Inheritance (`module/blank-inheritance/`).
"Stagecraft" is the new module. "Frame" appears only in its drawing sense.*

---

## 0. In one page

> This could have serious value as a stand alone Foundry VTT module so that is how I'd prefer to build it. This system
> is going to be tested as part of this adventure, but I want to build it as its own separate and very cleanly built
> module which just happens to interface 100% with the adventure we're making here.

**The plan.** Build Stagecraft from the first line as a separate Foundry module that knows nothing about Blank
Inheritance, and have the adventure use it only through a public interface. Develop it inside this repository, in
`module/stagecraft/`, because that is where it can be tested against the adventure every day; keep it extractable, so
that moving it to its own repository later is a copy, not a rewrite.

**What makes it clean.** Four rules (§3), each enforced by a test rather than by good intentions: the module never
mentions the campaign; the adventure reaches the module through one file; the module's public interface is a written
contract that a test compares against; and the module's own tests run without the adventure.

**What it offers a stranger.** Theatre-of-the-mind scenes where the *players* hold physical puppets (cards on sticks
that wiggle and bang), lit and layered like a diorama, built from a single painting, with blocking, zones, a blueprint
and automatic first appearances. §1 says how that differs from what is already on the registry.

**What it costs.** A public module is support, documentation and a release for as long as it lives. That is why the
extraction (§14) is a decision of its own and not a consequence of the architecture: the architecture makes it
*possible* without making it *compulsory*.

---

## 1. What it is, and who it is for

**Stagecraft** (subtitle **Puppet Show**) is a Foundry VTT module for running scenes without a battle map.

- **The GM** sets a scene up from one painting: marks the horizon and the floor, places the lights and a few set pieces,
  and the painting becomes a stage. Cards (people) arrive with a first-appearance flourish, are arranged in formations,
  and can be put in zones that lead to other scenes.
- **The players** each have a card in the wings. They pick it up by its stick, move it onto the stage, wiggle it, bump
  it into others, and make it hop, nod, bow, shake its head or turn its back. Everyone sees it move, in step.
- **The picture** is drawn by the Stage Renderer (`renderer.md`): lit, layered, with air and weather, or, on a weak
  machine, a plain flat version.

**Prior art, so the claim is honest.** As of 2026-10-01 the registry has several modules for theatre-of-the-mind play,
and none that I found does this:

| Module | What it does | How Stagecraft differs |
|---|---|---|
| [Storyteller's Cinema](https://foundryvtt.com/packages/storyteller-cinema) | Turns the battle map into a "visual novel" stage with portraits and dialogue subtitles | A presenter the GM drives; players do not hold anything |
| [ViNo](https://foundryvtt.com/packages/vino) (successor to Theatre Inserts) | Portraits with text underneath, low-click | Same |
| [Cast & Scene](https://github.com/DungeonMaxter/cast-and-scene) | A GM toolkit: prepared casts, camera focus, quick access | Same |
| [Theater of the Mind Manager](https://foundryvtt.com/packages/totm-manager) | Visual and thematic elements for theatre-of-the-mind play | Same |
| [3D Canvas](https://foundryvtt.com/packages/levels-3d-preview) | Replaces Foundry's canvas with a three.js scene driven by tokens as 3D models (Foundry 11 to 14) | Built round tokens and models; no painted standees, no puppets |
| [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice/) | A transparent three.js canvas over the board for physical dice | The precedent for three.js on Foundry's page, not a stage |

The difference is the thing Ingram named: **a shared stage of physical puppets that the players hold.** That is also a
risk (it is a bigger thing to build and to support than a presenter), and §2 weighs it.

---

## 2. Why separate, and what it costs

**For.**

- **It forces the clean design she asked for.** A module that cannot mention the campaign cannot quietly depend on it.
  Every line is either Stagecraft's or the adventure's.
- **It can be tested alone.** The pure core runs under `node --test` with no Foundry at all; the module's own tests
  never need the adventure's data.
- **It is reusable.** The Paper Lantern is one painting; every table has paintings. The feel, the blocking and the
  renderer do not care what the painting is.
- **It might be worth sharing.** Her own words: "serious value as a stand alone Foundry VTT module".

**Against, honestly.**

- **A promise of stability.** Once other people use a public interface, changing it is a breaking change with a version
  number and a changelog.
- **Two release trains.** The adventure and the module each have versions and a compatibility range.
- **Support.** People will ask for features, report bugs on browsers and graphics cards we have never seen, and expect
  an answer.
- **Generality has a price.** Things the adventure wants (a brass card, a typewriter name caption) must be *skins*
  (§7), which is more work than hard-coding them.

**Recommendation.** Do the separation now, because it is cheap at the start and ruinous to retrofit; make the
publication a later, separate decision (§14). Until then the module is "separate" in every way that matters to the code
and "in this repository" in the one way that matters to her workflow.

---

## 3. The boundary

**The golden rule: Stagecraft knows nothing about Blank Inheritance. Blank Inheritance reaches Stagecraft only through
Stagecraft's public interface, from one file.**

| # | Rule | How a test enforces it |
|---|---|---|
| 1 | Nothing in `module/stagecraft/` names the campaign: no `blank-inheritance`, no `Directorate`, no character, no `--bi-` style token, no Midjourney path | `test/stagecraft-boundary.test.mjs` scans the module for a denylist of campaign words (it already scans the pure files that will become its core) |
| 2 | The pure core touches no Foundry global, no DOM and no three.js, and imports nothing outside itself | The same test, over `scripts/core/` (today, over the lab's pure files) |
| 3 | The adventure imports from Stagecraft in exactly one place, `module/blank-inheritance/scripts/foundry/stagecraft-bridge.mjs`, and through `game.modules.get("stagecraft").api`, never by file path | The same test scans the adventure for any other reference |
| 4 | The public interface is a written contract: adding, renaming or removing anything in it is a deliberate act | An interface snapshot, `api.schema.json`, compared with `Object.keys(api)` and the hook names; the test fails until the snapshot and `API.md` are updated together |
| 5 | The module's tests run without the adventure | `node --test module/stagecraft/test` from a copy of the folder alone (a script, run at extraction time, §14) |
| 6 | Secrets stay on the adventure's side of the line (the vault of authored people); the module is only ever handed *published* data | The redaction property test (`renderer.md` §6.5) |

**The bridge.** Everything the adventure wants from Stagecraft, and everything Stagecraft tells the adventure, passes
through `stagecraft-bridge.mjs`. It registers the adventure's skin (§7), feeds scene data from the adventure's scene
briefs, and listens to Stagecraft's hooks (§6) to do campaign things: file a photograph in Papers, play a knock through
the audio system, open a card's notebook page. If the bridge were deleted the adventure would lose its stage and
nothing else.

**A real finding from checking this today.** The debut-family code in the lab (`flourish.mjs`) described its "official"
arrival as "Directorate business" in two comments. The behaviour was already generic; the wording was not. Both are now
"official business", and the boundary test would have caught it. This is exactly the leak the rule is for.

---

## 4. The layout

*The tree below is the plan. The tree as built on 2026-10-01 is in §17; it differs in small ways (no `ui/` or `systems/`
yet, and the pure core has `scene`, `zones`, `marks`, `rigspace`, `stage` and `chalk` besides the lab's files).*

```
module/stagecraft/
  module.json  README.md  LICENSE  CHANGELOG.md  API.md  api.schema.json
  scripts/
    core/            PURE. No Foundry, no DOM, no three.js. The bulk of the tests.
      model.mjs        the stage: cards, positions, lanes, published-state shape
      puppets.mjs      the spring model: follow, lean, wobble, bonk, verbs, grip buffer   (the lab's puppets.mjs)
      blocking.mjs     the stage grid, formations, magnets                                 (the lab's blocking.mjs)
      diorama.mjs      the camera rig, floor points, deck lip, poses, idle life           (the lab's diorama.mjs)
      flourish.mjs     the debut composer                                                  (the lab's flourish.mjs)
      blueprint.mjs    the blueprint drawing                                               (the lab's blueprint.mjs)
      zones.mjs        zones, subscenes, range bands
      redact.mjs       the allow-list: published data in, nothing else out
      snapshot.mjs     the stage's state to what a renderer needs
      mirror.mjs       the accessible mirror's content and announcements
      sync.mjs         the grip protocol and arbitration
    render/
      contract.mjs   what every backend provides (renderer.md §8.1)
      three/         the Stage Renderer
      flat/          the fallback: a plain 2D canvas (geometry, box, backend)
    foundry/         the ONLY place that touches Foundry
      manager.mjs      the scene manager: takes a scene over and gives it back
      scene-data.mjs   reading and writing flags
      socket.mjs       the grip stream
      settings.mjs     quality, calm mode, keybindings
      systems/         adapters: sf2e, pf2e, dnd5e, generic (§8)
    ui/              ApplicationV2 windows: stage bar, scene set-up, rig editor
    skins/default/   the plain skin, CC0 (§7)
    api.mjs          the public interface (§6)
  templates/  styles/  lang/  assets/
  tools/             build (esbuild), validators, the rig and mask helpers
  test/              tier 0 (architecture) to tier 3 (contract with Foundry), as the adventure's
```

The `core/` files marked with the lab's names already exist and are already pure; they were written to move. **The CSS-3D
diorama stays in the lab**, a contingency backend (`renderer.md` §8.2).

Everything that touches Foundry is under `foundry/`, so an upgrade of Foundry is a change to one folder, and everything
that draws is under `render/`, so a change of renderer is a change to one folder. The architecture test already in the
adventure (`test/tier0-architecture.test.mjs`) is the pattern: core stays pure, adapters stay thin.

---

## 5. Where the data lives

| Thing | Where | Who sees it |
|---|---|---|
| **A scene's stage description**: the rig (horizon, floor, depth), lights, set pieces, zones, blueprint, standard | `scene.flags.stagecraft.stage` (authored, in the scene) | Everyone who can see the scene; contains nothing secret |
| **The authored cast**, including people not yet revealed | A GM-only journal entry in a Stagecraft folder (the vault) | GM only |
| **The published stage**: who is on stage now, where, doing what | `scene.flags.stagecraft.published`, written only by the publish step | Everyone; the only cast data a player's browser ever receives |
| **Who holds what, right now** | The module socket (`module.stagecraft`), not saved | Everyone in the scene, for as long as it lasts |
| **Per-player settings** (quality tier, calm mode, zone outlines, keybindings) | Client settings | That player |
| **Chalk** (`chalk.md`) | One world journal entry, "Stagecraft chalk", owned by every player, a page per scene and drawer. Hidden from players' Journal lists | Everyone in the scene; nothing secret by design |
| **The GM's live overrides** (chalk mode, freeze, hide the wall) | `scene.flags.stagecraft.live` | Everyone; they persist until the GM changes them |
| **Resting places** (where a card stands when nobody holds it) | In the published stage; changed only by a deliberate drop | Everyone |

**Publishing is redaction.** The publish step takes authored data and produces the published stage through an allow-list
(`core/redact.mjs`): a field not on the list does not reach the scene, so a person who has not been revealed is absent,
not hidden. This is the same law the adventure already follows (`stage.md` §10, Law 11) generalised, and the property
test (`renderer.md` §6.5) holds it.

---

## 6. The public interface

The interface is `game.modules.get("stagecraft").api`, versioned (`api.version`), plus hooks. Names below are a sketch to
be fixed in phase 1; the point is its shape.

**Calls.**

| Area | Calls |
|---|---|
| **Scenes** | `scenes.enable(scene, description)`, `scenes.disable(scene)`, `scenes.describe(scene)` |
| **Cards** | `cards.add(scene, person)`, `cards.remove`, `cards.move(card, to)`, `cards.arrange(scene, formation)`, `cards.debut(card, options)` |
| **Puppets** | `puppets.hold(card, user)`, `puppets.release(card)`, `puppets.perform(card, verb)` |
| **Zones** | `zones.define(scene, zone)`, `zones.enter(card, zone)` |
| **Camera and light** | `camera.cut(shot)`, `camera.push(card)`, `camera.shake(amount)`, `light.spot(card)`, `light.board(preset)` (needs the three.js backend; a backend without them ignores the call) |
| **Capture** | `capture(scene, options)` returns a still image (the photograph) |
| **Extension** | `skins.register(skin)`, `systems.register(adapter)`, `renderers.register(backend)` |

**Hooks** (Foundry's convention: `Hooks.call` for things that can be cancelled, `Hooks.callAll` for notices). All are
prefixed `stagecraft.`.

| Hook | Kind | Meaning |
|---|---|---|
| `stagecraft.ready` | notice | The module is up; the api is usable |
| `stagecraft.preDebut` / `stagecraft.debut` | cancel / notice | A card is about to make a first appearance / has |
| `stagecraft.preMove` / `stagecraft.move` | cancel / notice | A card is about to be dropped somewhere / was |
| `stagecraft.bonk` | notice | Two cards bumped: who, where, how hard (the audio hook of `feel.md` §4) |
| `stagecraft.zoneEnter` | notice | A card entered a zone |
| `stagecraft.preSubscene` | cancel | The group is about to go through a door |
| `stagecraft.publish` | notice | The published stage changed |
| `stagecraft.photograph` | notice | A still was taken |
| `stagecraft.tier` | notice | The quality tier changed (for a module that wants to know) |

Anything the adventure does that is campaign-specific is a listener on one of these in the bridge.

**As built in 0.1.0** (`API.md` and `api.schema.json`, which a test holds equal to the code): the api has `version`,
`skins.{register,use,list}`, `scenes.{isStage,describe,validate}`, `stage()`, `zoneKinds` and `chalkModes`; the hooks are
`stagecraft.ready`, `stageReady`, `grab`, `drop`, `bonk`, `mark`, `zone`, `chalk` and `settingsChanged`. The cancelling
hooks, `cards.*`, `camera.*`, `capture` and `systems.register` above are still the plan.

---

## 7. Skins

A **skin** is everything that makes the stage *look like something*: a function from a person to the pictures on their
card (face, back, foot), the stick, the hand ring, the name caption, the emotes, the impact marks, the fonts. It is
plain data and functions, registered through `skins.register`.

- **The module ships one skin**, plain and fully licensed (CC0), so it works out of the box: a paper card, a wooden
  stick, a neutral caption.
- **The adventure ships its own**: brass and enamel, the typewriter name caption, the sticker emotes in the campaign's
  print style. It is the adventure's art and stays in the adventure.
- A skin may draw in canvas (the three.js backend turns the canvas into a texture) and supplies an HTML version for the
  flat backend. The spike's `paintFace` and `paintBack` are the shape of the first.

---

## 8. Systems and other modules

- **System adapters** map a Foundry actor to a card (name, portrait, a few status marks, an HP hairline), conditions to
  ways of standing, and combat to turn markers. The module ships `generic`; the adventure's bridge registers `sf2e`
  (the conditions and the Hero Point keys of `stage.md` §4), and a public module would add `pf2e` and `dnd5e`.
- **Tokens.** The module's own state is the source of truth for the stage. An optional **token bridge** can create a
  real Token per card so a system's token-based tools work (`renderer.md` §6.4); it is off by default.
- **Compatibility list** (to be filled by testing, never guessed): Dice So Nice (its canvas must stay above ours),
  modules that read `canvas.*`, modules that screenshot the canvas (they will see nothing of ours), and any module that
  replaces the sidebar or the chat.

---

## 9. What the adventure supplies

| It supplies | Through |
|---|---|
| The brass skin | `skins.register` in the bridge |
| The Papers filing of a photograph, the audio knock, the notebook page on a click | Listeners on `stagecraft.photograph`, `stagecraft.bonk` and card events |
| Scene descriptions: rigs, lights, set pieces, zones | A writer that turns each scene brief's stage data into `scenes.enable` calls |
| The vault: who is authored and when they are revealed | `cards.add` at the reveal; the reveal is the adventure's rule, not the module's |
| The sf2e adapter | `systems.register` |
| The admin panel's test players and autopilot | Calls to `puppets.hold` and `cards.move` like any other client |

---

## 10. Packaging, versions, compatibility

A sketch of the manifest. Nothing here is registered. (The real one is `module/stagecraft/module.json`: the bundle is
`dist/stagecraft.js`, with a `dist/BUILD.json` recording the hash of the sources it was built from.)

```json
{
  "id": "stagecraft",
  "title": "Stagecraft: Puppet Show",
  "description": "Theatre-of-the-mind scenes where the players hold the puppets.",
  "version": "0.1.0",
  "compatibility": { "minimum": "14", "verified": "14.367" },
  "esmodules": ["scripts/stagecraft.bundle.js"],
  "styles": ["styles/stagecraft.css"],
  "languages": [{ "lang": "en", "name": "English", "path": "lang/en.json" }],
  "socket": true,
  "relationships": { "requires": [], "recommends": [], "conflicts": [] },
  "license": "LICENSE"
}
```

- **Semantic versioning** for both the module and its interface (`api.version`), with a changelog.
- **The bundle** is built by esbuild from `scripts/`; the preflight of `npm run deploy` refuses a bundle older than its
  sources (`renderer.md` §6.6).
- **The adventure's manifest** gains `relationships.requires: [stagecraft]` once the module is separate, and the
  adventure's preflight checks it.
- **Foundry v14 and later only.** The scene manager is a v14 mechanism, and nothing here is back-ported.

---

## 11. Name, licence, ownership

- **Name.** "Stagecraft" with the subtitle "Puppet Show" are hers. The package id `stagecraft` looked free on 2026-10-01
  (the registry page for it returned 404), but that is a hint, not a reservation; check in the package administration
  before relying on it. Fallbacks: `stagecraft-vtt`, `stagecraft-puppet-show`.
- **Licence.** Suggested: MIT for the code, CC0 for the default skin, with three.js's MIT notice kept in the bundle.
  Hers to choose; a public module needs a licence file.
- **Ownership of art.** Her paintings, portraits and the brass skin belong to the adventure. The module must never ship
  them, and the boundary test (rule 1) would catch a path to one.

---

## 12. Building and testing

The adventure's rule applies unchanged: **every feature ships a test in the same commit** (`design/testing-strategy.md`).

| Tier | What | Where |
|---|---|---|
| **0. Architecture** | The boundary rules of §3; core stays pure; adapters stay thin | `test/stagecraft-boundary.test.mjs` |
| **1. Core logic** | Springs, blocking, zones, marks, chalk rules, the scene description, the stage engine (redaction, the sync protocol and the accessible mirror are still to come) | `module/stagecraft/test/`, `node --test`, no Foundry |
| **1c. Foundry adapters, against stand-ins** | The scene manager's lifecycle (draw, tear down, fail, twenty in a row); the chalk store and controller on a stand-in journal (`test/fake-foundry.mjs`); the box's picking with real three.js; the language file | `module/stagecraft/test/` |
| **1d. The contract** | The api and the hooks equal `api.schema.json` and `API.md`; the bundle is built from the sources as they are now | `api-contract.test.mjs`, `build.test.mjs` |
| **1b. The feel** | The golden tables of `feel.md` | `test/stagecraft-feel.test.mjs` (today, against the lab) |
| **2. Rendering** | A frozen moment looks as it should | Headless Chrome with the software renderer (same pixels on every machine), perceptual diff |
| **3. Contract with Foundry** | The scene-manager doorway and the performance setting still exist in the local source | Reads `foundryvtt/` and `gamesystems/sf2e/`; fails loudly on an upgrade |
| **4. In Foundry** | The takeover works, switches cleanly and Dice So Nice still shows | The local licensed Foundry (port 30000); first as `renderer.md` §10 phase 0b |
| **Docs** | The idea ledger is true; every link and section exists | `test/stagecraft-docs.test.mjs` |

**Build.** `npm run build:stagecraft` runs esbuild; `npm run deploy` runs it first and refuses a stale bundle.

---

## 13. Deploying

`tools/module-sync/` already pushes the adventure with checksums and a build stamp (`npm run deploy`). Stagecraft joins it
as a second module: the preflight validates both manifests, both are pushed in one run, and neither is ever pushed alone
(the rule of `feedback_remote_is_source_of_truth`: a subset push once broke the live server for a day). The world-sync
that keeps the adventure's content current is the adventure's; Stagecraft keeps no world content of its own beyond scene
flags.

---

## 14. Becoming a public module

**Until she says so, nothing is published.** The extraction is a checklist, run once, only on her go-ahead:

1. The boundary test passes and `module/stagecraft/` has had no reference to the adventure for a full phase.
2. `git subtree split` (or a copy) into a fresh repository; its tests pass there, alone.
3. README with pictures (the lab's plates are the source), `API.md`, `LICENSE`, `CHANGELOG.md`.
4. The default skin is complete, and no file in the repository is hers by art.
5. Manifest and download URLs; a tagged release; a registry listing.
6. The adventure switches to `relationships.requires` and loses its local copy.
7. A compatibility list from real testing, and a statement of what is supported.

**Roadmap** (the renderer's phases, `renderer.md` §10, seen from the module): **0b** the in-Foundry takeover spike
(**done 2026-10-01**); **1** the core and two backends with the feel, the mirror, calm mode and tiers (the core, the
three.js backend, the flat backend, calm mode and tiers are built; the mirror is not); **2** the adventure uses it
(the bridge file is not written); **3** the extras she picks (chalk is done); **4** extraction.

---

## 15. Open questions that are not hers

Things to settle while building, recorded so they are not forgotten: the exact shape of `api.schema.json`; how a scene
without a painting (a plain colour) is described; keyboard bindings that do not collide with Foundry's; whether the
accessible mirror's announcements are configurable per player; and how a table that plays in person puts the stage on a
shared screen.

---

## 16. Ingram's calls

1. **Build it separate from the first line**, in `module/stagecraft/`, extractable? *Default: yes.*
2. **Publish it?** Not now; decide at the end of phase 2. *Default: later.*
3. **Name and id**: "Stagecraft: Puppet Show" and `stagecraft`?
4. **Licence**: MIT for code and CC0 for the default skin?
5. **What does the default skin look like?** (She will want a say: it is the face of the module to strangers.)
6. **Which systems, if it goes public?** sf2e is needed; pf2e and dnd5e are the obvious next two.

---

## 17. What exists (2026-10-01)

*The module is started, not finished. This section is the honest list; update it when the code changes.*

**The tree as built** (`module/stagecraft/`):

```
  module.json  package.json  README.md  LICENSE  API.md  api.schema.json
  dist/stagecraft.js  dist/BUILD.json       the bundle, built by tools/build.mjs; BUILD.json holds the hash of its sources
  lang/en.json  styles/stagecraft.css
  scripts/
    stagecraft.mjs        entry: settings, keys, the chalk store, the scene manager, the api
    api.mjs               the public interface
    skins/                registry + the plain "paper" skin
    core/                 PURE (no Foundry, no DOM, no three.js)
      puppets  diorama  blocking  flourish  blueprint  emotes     the lab's files, moved
      scene      a stage description, normalised and checked
      zones      zones, outlines, floor strips, enter and leave
      marks      resting places offered to a held card
      rigspace   the room a stage lives in (painting fractions <-> floor <-> screen)
      stage      the engine: cards, hands, grips, bonks, marks, zones, tidy
      chalk      strokes, the policy, clipping, merging, rubbing out, the caps
      sync       held cards on every screen: the hand's path, who wins a clash, the drop, the silent
      frame-guard  one bad pass of the draw loop must not end the show
    render/
      contract.mjs  canvas-art  images  choose         what both backends share, and which one draws
      three/{support,cards,world,fx,overlay,post,chalk,backend}.mjs
      flat/{geometry,box,backend}.mjs                  the plain 2D fallback
    foundry/                the ONLY place that touches Foundry
      manager  host  scene-data  settings  keys  socket  chalk-store  chalk  bar  journal-tidy
  tools/build.mjs  test/    (219 tests)
```

**Works, proved in the local Foundry with a real graphics card and real pointer events** (`tools/stagecraft/foundry-check.mjs`;
the adventure's Blank Inheritance world, a stage scene with eight cards):

- A stage scene (one that carries `flags.stagecraft.stage`) is taken over through `CONFIG.Canvas.managedScenes` and the
  `SceneManager` lifecycle, Foundry's own canvas is hidden and idle, and a plain scene is untouched. Twenty switches
  leave one stage root, the same GPU object counts and no leak; the browser never warns of too many contexts.
- A real press picks a card up by its stick, a real wiggle leans it, a real swing bonks another; letting go puts the stick away;
  marks appear near a held card, at most five.
- Foundry's own sidebar and chat work over the stage.
- **Held cards on every screen** (`stage.md` §6.5, "As built"): a card a player picks up is held, with its stick out, on the
  GM's screen too; it follows the hand; put down it rests in the identical place on both; the GM's screen saves where it
  landed in the scene, so a reload keeps it; the GM's "Hands off" stops a player picking one up. Two grabs at once, silent
  holders and late joiners are covered by simulated-network tests (`test/sync.test.mjs`), and two real browsers grabbing the same card at once agree on who has it and only the winner's hand carries it (live check).
- **The card keys** (Space hop, N nod, B bow, X shake, T turn): real key presses make a held card do each, the other screen sees each, and with nothing held a key does nothing to the stage.
- **The flat stage** (`renderer.md` §8.5): the player's "Flat" setting draws the stage on a plain 2D canvas with no graphics context at all; a real press picks a card up with its stick, a furious wiggle leans it, a swing into another card bonks, chalk is drawn and kept; with the graphics context taken away on purpose, the stage is drawn flat instead of not at all. Left on Automatic, a browser whose WebGL is software gets the flat stage by itself (`tools/stagecraft/weak-machine.mjs`: a frame rate of about 30 flat against 2 for the lit stage, on a machine with no graphics card; with a real card every tier holds the full rate, even with the processor slowed to a quarter).
- The box of chalk (`chalk.md` §10): a GM and a real second player in a separate browser, drawing, rubbing out, persisting
  across a reload, and the GM's strip overriding the scene for everyone at once.

**Not built.**

- The accessible mirror, camera moves, `capture`, the cancelling hooks, `cards.*` and `scenes.enable`
  (a scene is made a stage scene by writing its flags).
- The scene set-up and rig editor windows; the token bridge; systems adapters.
- (The adventure's bridge and the deploy are built: see §19.)

**Findings that should be remembered.**

1. **Foundry must be restarted to discover a new module folder**, even one added through a junction while it runs. Reloading
   the page does not do it.
2. **Foundry draws the first scene before it calls `ready`**, so everything a stage needs is made at `init`.
3. **`Scene#view()` is refused while a canvas is loading** ("You cannot switch Scenes until resources finish loading"), so
   a script that switches scenes must wait for `!canvas.loading`.
4. **A language file is expanded into nested objects**, so a word that is also the start of another key is lost. A test now
   guards the file.
5. **Escape is also Foundry's key** (the game menu). Chalk in hand takes it in the capture phase.
6. **The adventure's closed Scene Runner is an invisible box that swallows clicks** over the top left of every scene
   (verified on a plain Foundry canvas too). That is the adventure's CSS; a task to fix it was raised. A stage scene must
   keep what has to be clicked clear of it, and of the deck (`rig.lift` raises the whole painting; the live scene uses 250).
7. **The occluders of a scene hide whatever stands behind them**, including the box of chalk; a scene sets `chalk.box`.
8. **Foundry's page ownership is inherited from the entry**, so "a player writes only their own pages" is a convention the
   module keeps, not a rule Foundry enforces.
9. **A hand that stops must say so**, or the screens that guess a little past the last sample carry the card past it until the
   next heartbeat; and **a drop must be rounded before it is used**, or two screens disagree in the fourth decimal.
10. **Two GM connections race.** Anything done by "a GM's screen" (saving a drop, making or clearing the chalk journal) is
   done by the acting GM only (the lowest-id active one); a second connection of the same user still races, and Foundry then
   logs "does not exist" for the second delete, which is harmless.
11. **The game already uses some of the card keys.** The adventure's Notes key is N, Foundry's Target key is T and its Pause key is
   Space, and the first real key presses found that N and T never reached a held card. The card keys are now asked first
   (`PRIORITY`) and pass the key on untouched whenever nothing is held, so they cost the game nothing. Calling the handler
   directly would never have shown it; the live check presses the real keys.
12. **A Windows junction into the module's folder also exposes `node_modules/`** to Foundry's file server. Harmless, but not
   something to publish; a release is built from `dist/`, `lang/`, `styles/`, `module.json` and the licence.

---

## 18. How much to guard: not much (her call, 2026-10-01)

> No need to worry about spoofing or strong security measures. This is a relaxed game with friends. If people do things
> that complicated to attack the system that is an acceptable risk but not a real concern.

**The rule.** Stagecraft trusts the table. Nobody spends effort making a message, a page or a flag tamper-proof, and a
feature is never made heavier or later to defend against someone who would have to go out of their way to abuse it.

**What it changes.**

- Held-card sync does not get extra checks against a browser lying about where a hand is or whose card it holds. The
  server already tells the listener who sent a message, and that stays because it costs nothing; no more is built on it.
- Chalk pages stay as they are: "a player writes only their own pages" is a convention the module keeps, not a rule
  Foundry enforces (`chalk.md` §4.2), and it is not made a rule.
- Anything that comes up while building that is only a defence against a determined attacker is noted and left.

**What it does not change.** Hiding a story reveal is a different thing from defending against an attack, and it stays: a
person who has not been revealed is absent from what a player's browser receives (Law 11, `README.md`), and the same goes
for a face-down draft card (`draft.md` §4). That is a rule about the story, and it is cheap because the data is simply
never sent. The GM's moderation tools (wipe, hide the wall, hands off) stay as well, because they are for friends getting
carried away, which is the likelier problem.

---

## 19. The adventure uses it: Episode One (2026-10-02)

Her goal: "Get Episode 1 on the remote server to the point where three important scenes are fully upgraded into this wonderful
sock puppet theatre and have this feature turn on automatically. Ideally do the centipede fight and two other scenes."

**The three scenes.** *Flood Tunnel Clearance* (the centipede fight), *Kit Issue* (the quartermaster stands behind his bench,
which hides his feet) and *The Canteen*. Each has an entry in `module/blank-inheritance/stagecraft/stages.json`: Stagecraft's
own stage description (rig, lamps, cut-outs, marks, chalk) plus the adventure's part (where each person stands when they arrive,
the row the party stands in, who a fired trigger calls). A deploy that changes an entry changes the scene.

**The bridge** is one file in two halves, plus a gate and a skin, all named `stagecraft-*.mjs`:
`scripts/core/stagecraft-bridge.mjs` (pure: which cards a published cast makes, and where they stand),
`scripts/foundry/stagecraft-bridge.mjs` (everything that touches Foundry), `stagecraft-gate.mjs` (the one question the older
overlay asks) and `stagecraft-brass-skin.mjs` (the campaign's own look, handed over at `stagecraft.init`, which Stagecraft
now raises so a skin is there for the first scene, drawn before `ready`). It is automatic:

- a GM's screen switches the module on in the world if it is installed and off, and the page reloads once;
- each built scene with an entry gets its stage description (by the scene-set id the builder stamped on it);
- **who is on the stage is still the theatre-of-the-mind stage's published cast**, mirrored into cards. Reveals, concealment
  and names the table has not been told all work as before (Law 11 is unchanged: a concealed person is on no card);
- the party's characters get cards, held by their players; the story's people are held by the GMs (a card that names no one
  is anyone's in Stagecraft, so the bridge names the GMs);
- the Scene Runner announces a fired trigger (`blankInheritance.triggerFired`); **"The nest wakes" calls six giant
  centipedes** onto the stage (one real click on the chip), their card cut from the art in the in-tray;
- on a scene Stagecraft draws, the older overlay of portraits is not mounted.

**The deploy** (`npm run deploy`) now has a fourth channel for Stagecraft's release files (manifest, licence, the built
bundle, language, style), refuses if the bundle is older than its sources, and prints the reminder that Foundry finds a new
module folder only when it starts. Done on the live server on 2026-10-02: verified file by file, Foundry restarted (nobody
was connected), and the server serves the bundle, `stages.json`, the centipede card and the painting.

**Checked live** (`tools/stagecraft/episode-check.mjs`, 20 checks, local Foundry, real pointer events, a real player in
another browser): the module off in the world → on by itself; all three scenes carry their stages; the fight scene is drawn by
Stagecraft with none of the older overlay; the party's card is there unasked; a real click on "The nest wakes" brings six centipedes; a
player holds their own card by a real press, cannot hold a centipede, and is sent nothing about someone not yet revealed.
`tools/stagecraft/preview-episode.mjs` takes pictures of each scene; `launch-world.mjs` starts the local Foundry.

**Not done.** The remote world itself has not been joined: its URL and the GM sign-in are not something I have, so the first
GM to load it switches the module on and stages the scenes, as the local cold start showed. The other scenes of Episode One
are not stages yet (the entry in `stages.json` is all one needs, plus a painting rig). The centipedes have one card each,
so their stats still live in the encounter, not on the stage.

---

## 20. Blocking, life and the fight board (2026-10-03)

Her goal: place people for fun and roleplay, split a scene into zones that make a fight easy to read and run, and give
life to where cards stand and how they move. What is in the module now (the design as built is `stage.md` §5.8 and
§8.12):

- **Pure core:** `core/walks.mjs` (gaits, a walk as numbers on the shared clock, entrances), `core/life.mjs` (routines from
  the shared clock and a seed: no messages), `core/formations.mjs` (nine formations on the floor), and in `core/stage.mjs`
  `walkTo`, routines, `still`/`packed`, entrances (from a side, or rising out of the floor), heads that turn to a carried
  card or a bump, magnets that part overlapping cards, risers behind cut-outs, `formationMoves`, the board's counts and
  `bandBetween`. `core/zones.mjs` gained `rangeBands`; `core/sync.mjs` gained `commitMoves` and `homeMoves`.
- **Foundry:** `foundry/blocking.mjs` (every GM write, queued with the saving of drops so neither overwrites the other) and
  `foundry/blocking-bar.mjs` (the strip under the chalk strip). The host applies a published move on every screen when it
  sees a new `move.t0`, runs everything on Foundry's server time, lets the GM shift-click to choose who a formation moves,
  and shows the board's key to everyone.
- **Drawing:** the board in `canvas-art.mjs` (`drawBoard`, `boardLabelCanvas`), `BoardLabels` in the three.js overlay
  (labels stand on their floor over the cards), the selection glow, and the floor that no longer hides the zones.
- **Interface 0.2.0:** `api.blocking` (formations, gaits, routines, move, arrange, backToPlaces, tidy, setLife, setBoard,
  registerMoments) and the hooks `stagecraft.walk` and `stagecraft.arrive`. `API.md` documents the card fields.
- **The adventure** (`stages.json` version 2): per person `life`, `enter`, `emotes`, `yaws`; per scene `moments` and a
  trigger's `moment`; the party row's `gap`. The bridge carries them onto cards (Law 11 unchanged: everything is looked up by
  the real id on the GM's side), keeps what Stagecraft wrote when it mirrors again, and plays moments.
- **Scenes staged:** Flood Tunnel Clearance (fight board, rising and swarming centipedes, three moments), Kit Issue (Nobu
  works his bench, the queue), the Canteen, and the first three haunts: the Paper Lantern, the Crew Mess (the slate is a
  chalk zone), the Bathhouse.
- **The bench** (`tools/stagecraft/bench/`): the real engine and renderer with the real stage entries in a plain page, to
  see and photograph any of it without Foundry (`shoot.mjs` takes the pictures headless at 1920 x 1080).

Tests: `walks`, `life`, `formations`, `blocking`, `three-world` in the module (258 in all), and the bridge's own in
`test/stagecraft-bridge.test.mjs`. Deployed to the live server on 2026-10-03.

**Later the same day:** whoever has the floor (Alt-click, `api.blocking.setSpeaker`: a pool of light and every head turned
to them), docking in fight positions while the board is up, an audience formation, `away` (backs to the table), and the
host bench with its two-screen check (`npm run bench:stagecraft`, all passing with real clicks). Then: regulars who talk to
each other and gesture now and then; nobody left hidden behind a cut-out (taller risers; formations step in front); circles
sized to what they gather round (`size`); knocked down (Ctrl-click, `api.blocking.setDown`, the `stagecraft.fall` hook, and in
the adventure a character at 0 HP falls by themself), with the board counting the fallen apart; the Position formation
(spread into a zone's free places); board labels that hang above heads; and people who glance round at someone falling or
arriving.

**Not done yet.** A live check of the strip on the real Foundry with two screens (the remote world needs a GM signed in;
the host bench covers the module's side); stacks of foes (§5.6); the speaking bars and the Runner lighting the speaker by
itself (§5.3).

## 21. Every face in view, and chalk that marks (2026-10-03, later)

Her eighth message asked for cards half as big again, backs of rooms that do not shrink people away, no more collisions,
nothing hiding more than the bottom 15% of a card, characterful staging of every scene, and chalk that leaves a mark. What
changed in the module (the design as built is `stage.md` §5.8.1 and `chalk.md` §10.1):

- **`core/visibility.mjs`**: how much of each card can be seen (`hiddenShares`, sampled over each card's rectangle on the
  page), and `spreadApart`, which loosens a formation just enough that nobody is hidden more than 15% by anybody;
  `formationMoves` runs every formation through it. The circle is an arc open to the table; the gang-up has two flanks.
- **`core/rigspace.mjs`**: `depthGrow` (a card at depth drawn bigger, so the back of a room keeps it readable),
  `BACKDROP_DEPTH` and `DEEPEST` (the painting's depth is the core's to say, and `rig.place` never puts a card behind it;
  the three.js world takes the depth from here).
- **`core/scene.mjs`**: a cut-out hides at most 15% of a card by default (`HIDE_AT_MOST`).
- **The `stagecraft.visit` hook** (interface 0.3.0): a card put down at a door or a spot raises it, and the host shows who
  went where over the place for a few seconds. Zone outlines are hidden at rest by default (the player's setting), and lit
  with their name and purpose when a card comes near.
- **Chalk**: the stick fades over a place it cannot mark, with a line by the pointer saying where chalk goes; chalk zones
  are drawn only while chalk is in hand; the GM's strips fold behind one key and step aside while chalk is in hand.
- **A routine given a new home** (`setRoutine(id, life, home)`) goes about its business round it, and the host redraws a
  stage whose description changes under it.
- **The adventure**: every party stands in the wings (`partyRow.wings`, `split`) and has a home there; every scene and
  haunt re-staged; four new stages (the tram back, the canteen's long tables, the generator and machine rooms, 28 in all);
  a deploy that changes how a scene places people walks them to their new places (`layoutOf`, kept on the scene as
  `stageLayout`).
- **Checks**: `chalk-check.mjs` (13 real-mouse checks on the bench: a stick taken, a mark left in a zone and anywhere,
  nothing left outside a zone, and the stick saying so), and the bridge's tests that every scene, moment, routine stop and
  zone keeps everyone fully in view with six in the party.

Tests: 275 in the module, 31 in `test/stagecraft-bridge.test.mjs`. Deployed to the live server the same day.

**Then, checked on the live server** (the GM's page reloaded, read and photographed through the browser), four things
the bench could not show:

1. **Foundry's shared clock is the server's uptime**, not the time of day (`game.time.serverTime` was 13.6 hours: the
   server restarts at 03:00 every night). Every screen still agrees, but after a restart each time stamped the day before
   is hours "ahead", so a card that walked on yesterday would have waited at the side of the stage, and one that rose out
   of the floor lain flat. A stamp more than a minute ahead of the clock is now long over (`CLOCK_SLACK`).
2. **A change that lands while the stage is loading was lost**: the deploy's new layout was written as the GM's page
   loaded, before the stage listened, so it showed everyone where they had been. The host takes the scene up once more
   when it is ready; `host-check.mjs` changes a card mid-build and fails without the fix.
3. **A Stagecraft-only deploy never reached anyone**: the build stamp fingerprinted the adventure, its data and its
   videos but not Stagecraft, so the stamp did not change and no open page was asked to reload. Stagecraft's files are
   now part of the stamp's id and of its code fingerprint.
4. **The deck's orb hid whoever stood front and centre** (`stage.md` §5.8.1): `api.blocking.setCover` (interface
   0.4.0), the adventure's `deckCover`, and the middle of every stage staged a step further back.

Tests: 278 in the module, 33 in the bridge's.

## 22. Chalk, painted (2026-10-03, last)

Her ninth message asked for chalk to be rethought: no vector lines, a smooth art experience, magic chalk in any colour,
more precise and less clunky, a range of tools, and the storage rethought (`chalk.md` §11 has her words and what each
became). What changed in the module:

- **`core/brush.mjs`** (new, pure): the tools (`TOOLS`: chalk, magic, pencil, brush, spray, smudge, eraser, fill, each a
  kind, a tip, sizes, spacing, flow, opacity, grain, scatter, jitter, pressure and taper), the tips' shapes (`tipAlpha`),
  steady hand (`Steady`, `STEADY`), pressure from a pen or from a mouse's speed (`Feel`), a stroke as dabs along a smooth
  curve (`Stroke`, seeded, so every screen paints the same stroke), straight lines (`lineDabs`) and colours (`hexToHsv`,
  `hsvToHex`, `rainbowAt`, `cleanHex`).
- **`core/chalk.mjs`** (rewritten): the wall's grid (`wallGrid`, `WALL`), tiles (`tileKey`, `tileRect`, `tilesFor`),
  layers and their history (`layerOrder`, `newestStep`, `overflowSteps`, `HISTORY`, `stepId`), the box's measures with
  the magic stick, and the policy with `paintMask`. The first edition's strokes are gone from it.
- **`render/paint/wall.mjs`** (new): `RasterWall`, every painter's layer as tile canvases, strokes painted into buffers
  (grain fixed to the wall, the zones mask), erasing, the smudge, magic chalk's glow, sparkle and rainbow, the fill
  (`fill`), the dropper (`pick`), the whole wall laid together tile by tile (`composite`); `encodeTile` (WebP) and
  `samplePainting`.
- **`foundry/chalk-store.mjs`** (rewritten): a page per scene and painter holding the layer's tiles and history, each key
  written and taken away on its own (`_del` on Foundry 14), `layers`, `save`, `undo` (own steps, or the whole wall's),
  `wipe`, `painters`; it removes the first edition's pages.
- **`foundry/chalk.mjs`** (rewritten): the controller, the hand (tool, colour, recent colours, sizes, steady hand, magic's
  tricks, kept on the player's machine), strokes from pointer samples, the live messages on the stage's channel and their
  settling, keeping, undo and redo, Shift-click, the fill, the dropper and a pen's eraser end.
- **`foundry/chalk-kit.mjs`** (new): the kit of tools beside the stage, with its colour picker, size, steady hand, dropper,
  undo, redo and close, the keys ([, ], Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Alt) and the ring round the pointer. Draggable;
  where it was left is kept on the machine.
- **The pictures**: the 3D picture shows the wall as one plane per painted tile (`ChalkTiles`, with `paintingPlane` now
  able to cover part of the painting) and the box has the magic stick (coloured at its corners, so no picture is needed);
  the plain picture draws the tiles into its backdrop and redraws only their places while someone paints; both answer
  `paintingColour`. The held stick in the pointer's place is gone: the kit's ring replaces it.
- **The host**: every coalesced pointer sample with its pressure and kind, Alt and Shift, a pen's eraser end, Escape that
  throws away a stroke before it puts the chalk away, the ring going when the pointer leaves, and the channel carrying
  chalk as well as cards.
- **The interface (0.5.0)**: the `stagecraft.chalk` hook says `{ type, scene, by, tool, colour, bounds }`, and
  `api.chalkTools` lists the tools.
- **The box finds its own place** (`boxSpot`, `boxClear`, `boxOnPage` in `core/chalk.mjs`; `Stage#cardShapes`;
  `setChalkBoxAt` in both pictures): found on the live server, where the adventure's deck and Foundry's macro bar lay
  over it. The host places it clear of what covers the stage, once a second and when the window changes (`chalk.md` §11).
- **The bench**: its in-memory store keeps layers like the real one and shares them between the page's tabs;
  `chalk-check.mjs` reads the wall's own pixels after real strokes, clicks and keys, and lays a deck over the box (42
  checks).

Tests: 288 in the module (new: `brush.test.mjs`, `fake-wall.mjs`; rewritten: the chalk, store, controller, box and plain
picture tests).

## 23. A fade, not a cut (2026-10-03, last of all)

Her tenth message: *"Where we occlude cards let's use a nice fade instead of a harsh cut."* `core/visibility.mjs` gains
`cutoutFade` (how solid each pixel of a cut-out is: clear at its top edge, solid `CUTOUT_FADE`, 44 reference pixels, below
it, and never over more than `CUTOUT_FADE_MOST`, two fifths, of its height). The 3D picture gives each cut-out a fade mask
on a second set of texture coordinates and draws it after the cards (`renderOrder` 3), so the ones behind show through the
fade; the plain picture cuts the same fade into its cut-out pictures. `stage.md` §5.8.1. Tests: 290 in the module.

Two things found on the live server the same evening: a stroke that left nothing (painted outside the chalk zones) still
made a page and a step, and now keeps nothing (`#changesOf` in `foundry/chalk.mjs`, and the `end` message names only the
layers that really change); and the box of chalk moves clear of the deck and the macro bar (§22).

## 24. Chalk, made quick (2026-10-03)

Her message: *"Chalk is really good but very laggy. What can we do about that?"* `chalk.md` §11.1 has the measurements
and the changes. In the module: `render/paint/wall.mjs` lays the wall together once per frame (`flush`, called by the host
before it draws), only the parts that changed, on canvases kept rather than made every frame, skips dabs that cannot reach the
chalk zones, blurs the glow at a quarter of the size, makes the tips and the grain while the browser is idle (`warmUp`),
and encodes tiles in a worker (`encodeTile(canvas, sure)`); `foundry/chalk.mjs` keeps strokes in order (`#keepStroke`)
from pictures taken the moment a stroke ends; the kit's ring is a few small elements; the 3D picture keeps its raycaster
and builds the chalk tiles' program at load. The bench has `chalk-perf.mjs` (no pass or fail: a table to compare against).

## 25. The table measures itself (2026-10-04)

From her goal that evening ("Proceed through as much as possible"), the second item of the priority list in `README.md`.
`renderer.md` §9.1 has the design and the measurements. In the module: `core/speed.mjs` (the probe of the gaps between
delivered pictures, the display's own pace, the verdicts judged against it, the rule that a tier only drops on two readings
that agree and never rises, and how long a drop is believed), `core/health.mjs` (what a screen reports, what an incoming
report is trusted to be, what the board says), `foundry/speed-store.mjs` (what the test found, kept in the browser for that
graphics card, a drop for half a day), `foundry/speed.mjs` (the test the host runs on the first stage of a session: it
samples the display while the picture is being built, waits for Foundry to be ready, and starts over if the page is put
away), `foundry/health.mjs` (`HealthMeter` on every screen, `HealthBoard` on the GM's), and the stored limit in
`chosenTier()`. The module's channel now carries three kinds of message (cards in hand, strokes of chalk, health), told
apart by their `type`. Tests: `speed.test.mjs` (11), `health.test.mjs` (8) and `tools/stagecraft/bench/health-check.mjs` (25
checks about the board and the test: the board as a GM and a player in two pages, the test finding a fast machine fine and
leaving it alone, a "slow" machine moved down after two readings, a first crawl only a doubt and a second one the plain
stage, the finding remembered by the next page, a drop thirteen hours old forgotten, a player who chose a tier never tested).
The limits can be laid over in the bench (`globalThis.__stagecraftSpeed`), so a fast machine can be "slow" on demand;
nothing sets it at a table. **It was redone the night it was built:** the first version measured how long the graphics card
took to finish a draw, and the first run in a real Foundry (§27) found a game on the same card made a good machine look slow.
## 26. Drawing only as often as it is needed, and nothing built at the first touch (2026-10-04)

From the same goal, the third item of the priority list in `README.md`. `renderer.md` §9.2 has the design, the measurements and
the finding about a card's creep on its spring. In the module: `core/pace.mjs` (pure: Foundry's cap, the wake time, what counts
as moving, and the frame rate read against the pace), `foundry/host.mjs` (lets a picture the browser offers go before one is
due, and wakes the pace on every real movement: `#notice` for the cards, and the pointer, the scene changing and strokes of
chalk), `foundry/settings.mjs` (the player's `power` setting, *Ease off when still*, on by default; `foundryCap()` reads
Foundry's own `core.maxFPS` and performance mode), `foundry/health.mjs` (the health meter reads its frame rate through the
pace), and `#compileFor` in the three.js backend (every shader built at load for the target it will be drawn into, and again
for each card as it arrives; the wait is bounded at four seconds). Tests: `pace.test.mjs` (11, including a replay of the
spring's tail) and the seven pace checks in `health-check.mjs` (32 in all: easing to about 30 a second, the first grab not
stalling, the full rate when a pointer is pressed, easy again once a card has landed, the player's cap obeyed with easing off
turned off). The pace checks compare pictures drawn with pictures offered rather than counting against a fixed number, so a
machine busy with something else cannot fail them; the one that finds a fast machine fine is given generous limits for the
same reason. The bench's web server (`tools/induction-terminal/serve.py`) now listens with a backlog of 128: with Python's
default of five, Windows refused one connection in about ten pages, and a module that fails to load kills the page.

## 27. A real Foundry for the checks, and what it found (2026-10-04)

Ingram licensed the local copy of Foundry that night ("feel free to create worlds to test in"), so the live check
(`tools/stagecraft/foundry-check.mjs`, 114 checks) has somewhere to run again. How it is set up, so the next session does not
rediscover it: `.claude/launch.json` has a `foundry-local` entry (a headless server on port 30000, started with
`preview_start`); its data folder is `%LOCALAPPDATA%\FoundryVTT`; the sf2e system, `module/stagecraft` and
`module/blank-inheritance` are linked into its `Data/systems` and `Data/modules` as junctions (a new module folder needs
a restart of Foundry); the world `blank-inheritance-kuuhaku-souzoku` was made through Foundry's Setup screen in headless
Chrome, with the Gamemaster user left without a password. The desktop app gives the programs it starts a private view of
`%LOCALAPPDATA%`, which is why the local Foundry once looked unlicensed: everything about it is done from that same shell.

**What the first real run found.**

- **Chalk was never kept.** The chalk store's writes had been made quiet (no redraw) with one shared, frozen options object,
  and Foundry writes into the options it is given, so every create threw "Cannot add property parent, object is not
  extensible": strokes showed while they were painted and were never kept, on the live server too, for the hours between
  that deploy and this run. Each write now gets its own object (`quiet()` in `foundry/chalk-store.mjs`). The bench could not
  see it (its chalk store is in memory) and the stand-in Foundry the unit tests use took options without touching them; the
  stand-in now writes into them and refuses ones that were used before, as the real thing effectively does, and with the old
  constant put back a dozen chalk tests fail.
- **The speed test dropped a good machine** (§25, `renderer.md` §9.1): a game was using 97% of the graphics card.
- **The check's own pages** are kept out of the speed test through the bench seam (`globalThis.__stagecraftSpeed`), console
  errors from Foundry's own code are now printed in full (they are not `instanceof Error` in the page), and the comparison
  after a reload allows 3% (the world keeps lossy pictures, the painter's own wall is lossless until it is reloaded).

Where it stands: 111 to 113 of 114 pass, and what varies from run to run is timing (the two screens agreeing on where a card
was put down, the Ctrl+Z settling, the plain stage's count of draws) while a game uses the same graphics card. Look at the
card's load (`Get-Counter '\GPU Engine(*engtype_3D)\Utilization Percentage'`) before reading a failure as a regression.