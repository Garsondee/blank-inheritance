# Foundry VTT Technical Reference

Condensed findings from direct source research against the local `foundryvtt/` (Foundry VTT v14.367, unminified `client/`+`common/`, minified `dist/`) and `gamesystems/sf2e/` (sf2e v1.4.1) trees — see [[reference-foundry-source-trees]] in memory. Verified against source, not recalled Foundry knowledge; v14 changed enough (ApplicationV2, the Level document, ES2020+ module namespacing) that pre-v13 tutorials and general knowledge are unreliable.

Everything here is either a direct citation (`file:line`, relative to `foundryvtt/Foundry Virtual Tabletop/resources/app/` unless noted) or explicitly marked **NOT VERIFIED**. Where sf2e pack data was the evidence, it was extracted by parsing the LevelDB write-ahead logs directly (12,428 documents across 29 packs, 0 parse failures) — real shipped content, not documentation.

This is a reference, not a tutorial — [foundry-module-design.md](foundry-module-design.md) is where the architecture and decisions live. Come back here for exact field names/types/constants.

---

## 1. File I/O and the sync channel

### Reading module files
Plain `fetch()` on a manifest-relative path — this is literally what core does for language files (`client/helpers/localization.mjs:352`). No dedicated "read a package file" API exists. `foundry.utils.fetchJsonWithTimeout(url, data, {timeoutMs})` (`common/utils/http.mjs:67`) is the generic helper if a timeout is wanted.

### Enumerating a directory
`FilePicker.implementation.browse(source, target, {extensions, wildcard})` (`client/applications/apps/file-picker.mjs:372`). Requires `FILES_BROWSE` permission (default role: ASSISTANT). Returns `{dirs[], files[]}`, paths URL-encoded (`decodeURIComponent` before comparing). **Extensionless files are invisible** — the browse filter excludes them. Dotfiles are skipped.

### Writing files back — the critical path
`FilePicker.implementation.upload(source, path, file, body, options)` (`file-picker.mjs:434`) POSTs to `/upload`. Requires `FILES_UPLOAD` (default role: ASSISTANT). Return contract has three silent-failure shapes to handle: `response.error` → returns `false`; missing `response.path` → returns `undefined`; HTTP 413 → returns `undefined`.

**`.json` overwrite is explicitly permitted.** The server's overwrite gate checks `MEDIA_MIME_TYPES`, which despite the name includes the `TEXT` category, and `json` is a `TEXT_FILE_EXTENSIONS` entry (`common/constants.mjs:1691`). So re-uploading a changed `.json` over an existing one succeeds. Blocked by exact filename regardless of type: `module.json`, `system.json`, `world.json`, `template.json`. There is a containment check (`Files.isPathContained`) but **no `modules/`-specific deny-rule** — any path under `Data/` is writable given permission and an existing target directory (no implicit mkdir).

**Files can never be deleted by a module.** The `manageFiles` socket only supports `browseFiles`, `createDirectory`, `configurePath` — no delete action exists anywhere in the client-reachable API.

### The update-wipe trap
`dist/packages/installer.mjs`: on every module install/update, **everything in the module's folder is deleted except a directory literally named `storage/`**, and only if the manifest declares `"persistentStorage": true` (in which case `storage/` is also auto-created if missing). This is the load-bearing constraint for the whole sync design:

- Ship read-only seed content in `data/` (wiped on every update — fine, since it's re-pushed by WinSCP every time anyway)
- Write mutated/harvested state to `storage/` (survives updates, and Foundry guarantees the directory exists)
- **Never rely on Foundry's own module updater for this project** — deploy only via WinSCP. The updater is exactly the operation that triggers the wipe; `persistentStorage` is insurance, not the primary strategy.
- Manifest needs: `"persistentStorage": true`, and (per convention, not schema-enforced) `"flags": {"canUpload": true}` to avoid a client-side upload warning toast.
- `FilePicker.implementation.uploadPersistent(packageId, path, file, body, {notify})` (`file-picker.mjs:507`) is a thin wrapper: `upload("data", "modules/<id>/storage/<path>", ...)`.

### No hashing utility exists
Nothing in `foundry.utils` provides a hash/checksum. `diffObject(original, other, {bidirectional: true})` (`common/utils/helpers.mjs:311`) plus `equals` (`:416`) covers diffing, but the module must bring its own hash function (e.g. `SubtleCrypto.digest`, a standard browser API) for change detection.

`mergeObject` mutates its first argument by default (`inplace: true`) — pass `inplace: false` for a pure merge. The `performDeletions` option is a **broken no-op in v14**; use `applyOperators: true` instead (`common/utils/helpers.mjs:1132-1138`).

### Settings — do not use for bulk data
Every world/user-scoped setting is serialized into the payload sent to **every connecting client** on join (`client/game.mjs:67`). No size limit is enforced (verified: no `maxLength` anywhere in the field chain), which makes this a real footgun, not just a style preference. `client`-scope settings write to `localStorage` with no quota handling — an oversized client setting throws an unhandled `DOMException`. **Conclusion: keep the sync index as small per-document flags, not one central settings blob.**

### Module-to-client sockets
Requires `"socket": true` in the manifest or the server never registers the listener (silent no-op, not an error). Event name is fixed: `module.<your-module-id>`. `game.socket.emit("module.blank-inheritance", payload, {recipients: [userId]})` for targeted send (broadcast excludes the sender by default); `game.socket.on("module.blank-inheritance", (payload, senderUserId) => {...})` — note the second argument.

---

## 2. Document schemas (v14)

### ⚠️ Scene background moved to a new `Level` sub-document
This is the single biggest v13→v14 break. **Scene no longer has top-level `background`/`foreground`/`backgroundColor` fields.** They now live on an embedded `Level` document (`common/documents/level.mjs`), and a Scene must always have at least one Level (`defaultLevelId: "defaultLevel0000"`).

`Level` schema fields: `_id`, `name`, `elevation.{bottom,top}`, `background.{src,color,tint,alphaThreshold}`, `foreground.{src,tint,alphaThreshold}`, `fog.src`, `textures.{anchorX,anchorY,offsetX,offsetY,fit,scaleX,scaleY,rotation}` (`fit` ∈ `fill|contain|cover|width|height`), `visibility.levels`, `sort`, `flags`.

`background.src`/`foreground.src` are `FilePathField` with `categories:["TEXTURE"]`, which is images **∪ video** (`m4v mp4 ogv webm`) ∪ `basis/ktx2`. **So a Scene background CAN be a video** — but there is no exposed autoplay/loop control for it (hardcoded `loop:true` at the render call site, `client/canvas/groups/primary.mjs:315-320`). Only **Tiles** have a configurable `video.{loop,autoplay,volume}` block. For a non-looping cold-open video that needs to auto-advance, use a **Tile**, not a scene background.

Legacy flat authoring (`background`, `backgroundColor`, etc. at scene-create time) still works via a `_preCreate` shim **only when `data.levels` is empty** — but author `levels` explicitly rather than relying on this.

### Scene — full field list (other than the Level split)
`name`, `active`, `navigation`, `navOrder`, `navName`, `thumb`, `width`/`height` (px, default 4000×3000), `padding` (0–0.5, default 0.25), `shiftX`/`shiftY`, `initial.{x,y,scale}`, `initialLevel` (which Level shows on load), `grid.{type,size,style,thickness,color,alpha,distance,units}`, `tokenVision`, `fog.{mode,reset,colors}`, `environment.{darknessLevel,darknessLock,cycle,globalLight,base,dark}`, **`transition.{type,duration,activeOnly}`** (see §3), embedded collections (`lights`,`sounds`,`drawings`,`notes`,`regions`,`levels`,`tiles`,`tokens`,`walls`), `playlist` (resolves to doc), `playlistSound` (id-only), `journal` (resolves to doc), `journalEntryPage` (id-only), `weather`, `folder`, `sort`, `ownership`, `flags`.

`grid.type` values (`GRID_TYPES`): `GRIDLESS:0, SQUARE:1, HEXODDR:2, HEXEVENR:3, HEXODDQ:4, HEXEVENQ:5`.

**`MeasuredTemplate` no longer exists as a document type** — merged into `Region` in v14.

### Embedded scene documents, placement-relevant fields
- **Note**: `entryId`/`pageId` (id-only refs), `x`/`y`, `elevation`, `texture` (IMAGE only, default `icons/svg/book.svg`), `iconSize` (min 32, default 40), `text` (label override), `fontFamily`/`fontSize`, `textAnchor` (`CENTER:0,BOTTOM:1,TOP:2,LEFT:3,RIGHT:4`), `textColor`, `global` (bool — true = always visible, false = requires line of sight; this is the only "display mode" concept, there's no `NOTE_DISPLAY_MODES` constant in v14).
- **AmbientSound**: `x`/`y`, `elevation`, `radius`, `path` (AUDIO), `repeat`, `volume` (default 0.5), `walls` (constrained by walls, default true), `easing` (distance falloff, default true), `darkness.{min,max}`, `effects.{base,muffled}`.
- **Token** (placement subset): `actorId` (id-only), `actorLink`, `x`/`y` (pixels), `elevation`, `width`/`height` (grid units), `depth` (new in v14), `level` (which Level the token sits on — new in v14, defaults to the scene's `defaultLevel0000`), `texture` (IMAGE+VIDEO, wildcard supported), `hidden`, `disposition` (`SECRET:-2,HOSTILE:-1,NEUTRAL:0,FRIENDLY:1`), `rotation`, `sight.{enabled,range,angle,visionMode,...}`, `detectionModes` (**keyed object in v14, was an array**).
- **Tile**: `texture` (TEXTURE = images+video), `width`/`height` (required, no default), `x`/`y`, `elevation`, `rotation`, `alpha`, `occlusion.{modes,alpha}` (**`modes` is a Set in v14**, bit flags `NONE:0,FADE:1,SURFACE:2,RADIAL:4,VISION:8`), **`video.{loop,autoplay,volume}`** (defaults `true,true,0`).

### JournalEntry / JournalEntryPage
JournalEntry: `name`, `pages` (embedded collection), `categories` (embedded, new in v14), `folder`, `sort`, `ownership`, `flags`.

JournalEntryPage `coreTypes`: `text`, `image`, `pdf`, `video` (systems/modules can register more). Per type:
- `title.show` (default **true**), `title.level` (1–6, default 1)
- `text`: **`text.content`** (HTMLField), `text.markdown` (separate field, not auto-derived), `text.format` (`CONST.JOURNAL_ENTRY_PAGE_FORMATS`: `HTML:1, MARKDOWN:2`)
- `image`: `src` + `image.caption`
- `pdf`: `src`
- `video`: `src`, `video.{controls,loop,autoplay,volume,timestamp,width,height}`. **YouTube URLs are supported** on video pages (`game.video.isYouTubeURL`).
- **`src` is a plain `StringField`, not a `FilePathField`** — no extension validation, same field carries image/pdf/video paths.

### Playlist / PlaylistSound
Playlist: `name`, `description`, `sounds` (embedded), `channel` (`music|environment|interface`, default `music`), **`mode`** (`PLAYLIST_MODES`: `DISABLED:-1, SEQUENTIAL:0, SHUFFLE:1, SIMULTANEOUS:2` — **no soundboard mode in v14**, that's `DISABLED`), `playing` (derived, not authored — `= sounds.some(s => s.playing)`), `fade` (ms crossfade), `sorting` (`ALPHABETICAL:"a"|MANUAL:"m"`), `seed` (shared shuffle seed, deterministic via `MersenneTwister`).

PlaylistSound: `name`, `description`, **`path`** (not `src`), `channel` (blank = inherit playlist's), `playing`, `pausedTime`, `repeat`, `volume` (default 0.5), `fade` (overrides playlist fade), `sort`.

**Scene↔Playlist is fully automatic.** `Scene.playlist`/`Scene.playlistSound` fields; on scene activation, `Playlists#_onChangeScene` stops the prior scene's audio and starts the new one — if `playlistSound` is set, plays that one sound; else if `playlist` is set, calls `playlist.playAll()`. No custom code needed for basic mood-binding.

Methods: `playlist.playAll()`, `.playSound(sound)`, `.stopSound(sound)`, `.stopAll()`, `.cycleMode()` — all are document updates under the hood, so playback state syncs to every client for free. **Audio is locked until a user gesture** — calls before that silently no-op.

### Folder
`name`, `type` (which document type — `FOLDER_DOCUMENT_TYPES`), `description`, `folder` (parent — nesting), `sorting` (`a|m`), `sort`, `color`, `flags`. A folder cannot be its own parent (validated).

### Flags, IDs, and import mechanics — the pieces that make sync idempotent
- `flags` shape: `{[scope: string]: object}`. Valid scopes = `["core", "world", game.system.id, ...active module ids]` — **the module must be active** for its flag scope to validate. Convention: use your module id as the scope.
- `getFlag(scope, key)` / `setFlag(scope, key, value)` / `unsetFlag(scope, key)` on every document (`common/abstract/document.mjs:947-1004`). Setting a flag to `null` deletes it.
- **Explicit `_id` on create is fully supported.** Must match `/^[a-zA-Z0-9]{16}$/`. `create(data, {keepId: true})` retains a supplied top-level `_id` instead of generating one. **`keepEmbeddedIds` defaults to `true`** — so a Scene created with inline `tokens`/`notes`/`levels` carrying explicit `_id`s preserves them automatically, no extra option needed.
- Embedded-document id collisions **throw**; primary/world document id collisions have no such guard (this is exactly why `Adventure` import pre-partitions into create-vs-update by id).
- `_stats.compendiumSource` / `.duplicateSource` / `.exportSource` are settable; `_stats.coreVersion` etc. are server-managed and ignored on normal create.

**Practical consequence for this project: mint every document `_id` deterministically from its repo `id`** (e.g. a stable hash of `"kid-naomi-oduya"` truncated/mapped to the 16-char alphanumeric alphabet), and always create with `keepId: true`. This makes push idempotent — re-running the sync against unchanged data is a no-op comparison, not a duplicate-creation risk — and makes cross-references in authored JSON (`"journal": "journal-ep1-scene3"`) resolvable to real Foundry ids without a lookup table.

### `Adventure` document — evaluated and rejected as the delivery vehicle
Schema: sets of embedded `actors`, `combats`, `items`, `journal`, `scenes`, `tables`, `macros`, `cards`, `playlists`, `folders`. Real API (`Adventure#import`), and it does solve id-based create-vs-update partitioning automatically. **But:**
1. **Adventures only live in compendium packs** (`Adventure` is a `COMPENDIUM_DOCUMENT_TYPES` entry but not a `WORLD_DOCUMENT_TYPES` entry) — requires shipping a LevelDB pack, which needs a build step this project has no tooling for (see §4).
2. **Import is destructive**: updates use `{diff: false, recursive: false}` — a full replacement, not a merge. Re-importing over a GM's in-Foundry edits discards them wholesale. This directly conflicts with the harvest/promote model this project needs.
3. Content types are fixed to the 10 listed above — no custom document types, no partial-field sync.

**Decision: hand-rolled import into world documents, not the Adventure pipeline.** See design doc for the actual mechanism.

---

## 3. Cinematic/UI-relevant APIs

### Scene activation — three distinct operations
- **`Scene#view(options)`** — client-local only. No database write, no notification to other clients, no `active` flag change. `canvas.draw(this)`.
- **`Scene#activate({viewOptions, pullUsers, ...})`** — GM-only, writes `active: true` via a real document update, which is what makes every connected client's `_onActivate` fire `view()` for them. This is "make this the world's active scene, and everyone sees it" (unless `pullUsers` is explicitly false in a way that matters — see below).
- **`Scene#pullUsers(users, viewOptions)`** — GM-only, explicit "make these specific users follow me to my current view right now" without changing which scene is world-active. Fine-grained lever distinct from `activate`.
- `game.users.map(u => u.viewedScene)` gives a free "who's looking at what" readout with zero custom socket code.

### Transitions — a real core cinematic system already exists
`canvas.transition` (`TransitionContainer`, `client/canvas/transition.mjs`) with `async run({operation, nextScene, activate, duration, transitionType, easing})`. **13 built-in transition types** in `CONFIG.Canvas.sceneTransitions`: `fade, swirl, waterDrop, morph, crosshatch, wind, waves, whiteNoise, hologram, hole, holeSwirl, glitch, dots` — each with its own default duration (1000–2500ms).

Two invocation routes:
1. **Declarative, reaches every client**: pass `transition: {type, duration}` inside `viewOptions` to `activate()` or `pullUsers()`. This rides through the normal document-update → `_onActivate` → `view()` path automatically.
2. **Imperative, local only**: `await canvas.transition.run({...})` directly.

Scene schema also carries its own default `transition.{type, duration, activeOnly}` — so a scene can declare "always fade in over 1200ms" without the caller specifying anything. **A module can register a custom transition type** by adding a key to `CONFIG.Canvas.sceneTransitions`; unknown types silently fall back to `fade`.

There is **no dedicated transition-related hook** — nothing fires when a transition starts/ends.

### Video playback and the "detect end" gap
- `game.video` (`VideoHelper`, `client/helpers/media/video-helper.mjs`): `getVideoSource(obj)`, `play(video, {loop, offset, volume})`, `stop(video)`, `hasVideoExtension(src)`, `awaitFirstGesture()`.
- Scene background/foreground video elements: `canvas.primary.backgroundSource` / `.foregroundSource`. All active video meshes: `canvas.primary.videoMeshes`.
- Tile video element: `tile.sourceElement`. **No `Tile#play()` method** — playback is driven by render flags off the `video.*` schema fields; the verified core idiom for imperative control passes `playVideo`/`offset` as **update options**, not data: `tile.document.update({"video.autoplay": false}, {diff: false, playVideo: true, offset: 0})`.
- **No core "video ended" event or hook exists anywhere** (`ended`/`timeupdate` listeners appear nowhere in `client/` for video; only for audio). A module must attach its own DOM `ended` listener to the actual `<video>` element. A looping video (the scene-background default) never fires `ended` — must be a non-looping Tile instead.

### ApplicationV2 — the current UI framework
`foundry.applications.api.{ApplicationV2, HandlebarsApplicationMixin}`. AppV1 (`Application`, `FormApplication`, etc.) is **deprecated since v13, scheduled for removal in v16** — still functional in v14, but build new UI on V2.

Skeleton (verified minimal complete example):

```js
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class DirectorPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "director-panel",
    tag: "div",
    classes: ["director-panel"],
    window: { title: "DIRECTOR.PanelTitle", icon: "fa-solid fa-clapperboard", resizable: true },
    position: { width: 420, height: "auto" },
    actions: { cue: DirectorPanel.#onCue }   // matches [data-action="cue"] in the template
  };

  static PARTS = {
    body: { template: "modules/blank-inheritance/templates/panel.hbs", scrollable: [""] }
  };

  async _prepareContext(options) {
    return { scenes: game.scenes.map(s => ({ id: s.id, name: s.name, active: s.active })) };
  }

  static async #onCue(event, target) {           // `this` is bound to the application instance
    const scene = game.scenes.get(target.dataset.sceneId);
    await scene?.activate({ viewOptions: { transition: { type: "fade", duration: 1200 } } });
  }
}
```

Key constraints:
- **Every `PARTS` template must render exactly one top-level element**, or the render throws.
- `DEFAULT_OPTIONS` inheritance merges unusually: **arrays concatenate**, **plain objects deep-merge**, everything else is replaced — a subclass's `classes: [...]` *adds to* the parent's, never replaces it.
- `render({force: true})` is required on first open — a plain `render()` (no force) on a never-rendered app is a silent no-op.
- `data-action="..."` on any element dispatches to `options.actions[name]`, called as `handler.call(app, event, target)`.
- Template paths resolve from the user-data root: `modules/<id>/templates/...` is correct (not `systems/`).
- `{{localize "KEY" ...hashArgs}}` is a real helper; **`{{#localize}}` block form does not exist**.

### Hooks — order and gotchas
Verified firing order: `init` → (settings registered) → `i18nInit` → `setup` → (canvas init kicked off, `ui.*` becomes non-null) → `canvasReady` → `ready`.

> **`initializeUI` is NOT a hook.** Corrected 2026-09-06: an earlier version of this line listed it inline in the order above, which reads as something you can `Hooks.on`. You cannot — it is a `Game` method (called at `client/game.mjs:764`, defined at `:1020`), and nothing anywhere in `client/` dispatches it. A listener registered for it never fires, silently. It matters only as the *moment* `ui.*` becomes non-null, which sits between `setup` and `canvasReady`. To attach persistent UI, mount on `ready` and re-assert on `canvasReady`.

- `game.i18n.localize` doesn't work in `init` (fires before i18n loads).
- `ui.controls`/`ui.sidebar` don't exist in `setup` (which runs before the `initializeUI` step).
- **`canvasReady` fires before `ready`**, and again on every scene change — and uniquely among canvas hooks, it's dispatched with `Hooks.call` (cancellable), not `callAll`. Never return `false` from a `canvasReady` handler, it silently suppresses every other listener.

**`getSceneControlButtons(controls)`** — v14 shape is **`Record<string, SceneControl>`, not an array**, and each control's `tools` is likewise `Record<string, SceneControlTool>`. This is the v11-era breaking change that's easy to get wrong from stale examples:
```js
Hooks.on("getSceneControlButtons", controls => {
  controls.tokens.tools.myTool = { name: "myTool", order: 99, title: "...", icon: "fa-solid fa-star", onChange: (event, active) => {...} };
});
```
A control left with zero visible tools after the hook runs is deleted entirely. `onClick` is deprecated in favor of `onChange(event, active)`.

**`getHeaderControls<ClassName>`** — array-based (unlike scene controls), appends `{label, icon, action, onClick?, visible?}` entries to an app's title-bar dropdown menu. Fires on every menu open, not just once.

### Settings menu constraint
`game.settings.registerMenu(namespace, key, {type, ...})` — `type` must be an ApplicationV2 (or legacy FormApplication) subclass, and **it's instantiated with zero constructor arguments** (`new menu.type()`). Design any settings-launched panel to be fully self-configuring on construction.

### Module public API — convention only, not core-supported
`game.modules.get(id).api = {...}` works only because the `Module` class doesn't seal its properties — it is **not** a declared schema field, not validated, not typed by core. Fine to use as the standard pattern, just don't treat it as a guaranteed contract.

---

## 4. sf2e data model

### Actor types
`character, npc, hazard, vehicle, familiar, loot, party, army`. Only `character`/`npc`/`familiar` are "creatures" for rule purposes. `familiar`/`loot`/`party`/`army` have zero instances in any shipped pack — their shapes are code-only and unverified here.

### ⚠️ NPCs store flat totals; PCs store almost nothing (derive everything from embedded Items)
This is the single most important asymmetry for a generator to respect.

**`npc` actors** author the final numbers directly:
- `system.abilities.{str,dex,con,int,wis,cha}.mod` — modifier only, no separate score
- `system.attributes.ac.value`, `.hp.{value,max,temp}`, `.speed.{value,otherSpeeds[],details}`, `.immunities[]`/`.resistances[]`/`.weaknesses[]` (each `{type, value?, exceptions[]}`), `.adjustment` (`"elite"|"weak"|null` — **just a label, confirmed no numeric delta table exists in the sf2e source either**, consistent with finding nothing in the SRD text)
- `system.perception.mod` (total), `.senses[]` (`{type, acuity: precise|imprecise, range}`)
- `system.saves.{fortitude,reflex,will}.value` — **total modifier**, not a proficiency rank
- `system.skills.<slug>.base` — **total modifier**, not a rank. 18 skills (sf2e adds `computers`, `piloting` over PF2e's list).
- `system.traits.{value[], rarity, size.value}` (size ∈ `tiny|sm|med|lg|huge|grg`)
- `system.details.{level.value, blurb, publicNotes, privateNotes, languages}`

This maps directly onto this project's `creature.schema.json`/`combatStatblock` shape — the `modifier` half of our `proficiency` object is exactly what sf2e's `npc` actor wants; `rank` is extra bookkeeping we keep that sf2e doesn't need.

**`character` actors** store the opposite: `system.abilities` is **literally `null`** on every one of the 35 characters in the shipped packs. There is no `system.attributes.ac` at all. `system.skills.<slug>.rank` is present (0–4, a proficiency rank — contrast NPCs' `.base` modifier), but saves, most proficiencies, and all derived defenses are computed at runtime from embedded **Items**: `ancestry`, `heritage`, `background`, `class`, `feat` (with `system.category` distinguishing ancestry/class/skill/general/etc.), `weapon`/`armor` (for PC strikes/AC).

**Consequence for this project:** generating a `kid` or `frame` Actor is not "compute the numbers and write them into system fields" — it's **"create the actor, then create/link the real ancestry/background/class/feat Items (by UUID reference into the sf2e compendia, or as bespoke authored Items for anything homebrew), and let sf2e's own derived-data engine compute AC/saves/proficiencies."** Generating a `creature` (Claimant) Actor is the simple, flat-field case by comparison.

### Embedded Item types (25 total)
`action, affliction, ammo, ancestry, armor, background, backpack, book, campaignFeature, class, condition, consumable, deity, effect, equipment, feat, heritage, kit, lore, melee, spell, spellcastingEntry, treasure, weapon, shield`. (`affliction` is actually deleted from the registry at system init — present in the template but non-functional.) No separate `ranged` type — ranged NPC strikes are `melee` items with `system.range` set.

### `melee` Item — how an NPC Strike is represented (both melee and ranged)
Real example (Claw, melee):
```json
{
  "name": "Claw", "type": "melee",
  "system": {
    "action": "strike",
    "bonus": { "value": 6 },
    "damageRolls": { "<random16charId>": { "damage": "1d4+1", "damageType": "slashing" } },
    "range": null,
    "traits": { "value": ["agile"] }
  }
}
```
Ranged example (Laser Pistol): `"range": {"increment": 40, "max": null}`, plus traits like `expend-2`, `reload-1`, `tech`, `tracking-1`.

Field meanings: `bonus.value` = attack modifier (int). `damageRolls` = **map keyed by a random 16-char id** → `{damage: "NdX+B" dice string, damageType, category?}` (`category` ∈ `persistent|precision|splash` when present). `range: null` = melee; `{increment, max: null}` = ranged with a range increment; `{increment: null, max}` = fixed max range. `action` ∈ `strike|area-fire|auto-fire` (the latter two pair with an `area.{type,value}` block, `type` ∈ `burst|cone|cube|cylinder|emanation|line|ring|square`). `attackEffects.value[]` = slugs of follow-up abilities (`grab`, `knockdown`, `push`...). `subjectToMAP` (bool).

Damage types: `acid cold electricity fire force sonic vitality void` (energy) · `bleed bludgeoning piercing slashing` (physical) · `mental poison spirit untyped`.

This maps closely onto this project's `strike` $def (`attackBonus`→`bonus.value`, `damage[]`→`damageRolls` map, `traits`→`traits.value`) — the translation is nearly 1:1.

### `action` Item — NPC special/reactive abilities
`actionType.value` ∈ `passive|action|reaction|free`. `actions.value` = 1/2/3 or null. `category` ∈ `offensive|defensive|interaction|familiar`. `frequency.{max, per}` (`per` ∈ `round|turn|PT1M|PT10M|PT1H|PT24H|day|P1W|P1M|P1Y`). `traits.{value[],rarity}`. `description.value` frequently contains `@Localize[PF2E.NPC.Abilities.Glossary.<Name>]` for shared glossary abilities (Grab, Knockdown, Reactive Strike, etc. — see `bestiary-ability-glossary-srd` pack).

### `spellcastingEntry` Item
`tradition.value` ∈ `arcane|divine|occult|primal`. `prepared.value` ∈ `innate|spontaneous|prepared|focus`. `spelldc.dc` (spell DC, int), `spelldc.value` (spell attack modifier, int). `slots.slot0` through `slot11` (`slot0` = cantrips, `slot11` = focus), each `{value, max, prepared: [{id}]}`. Spells attach via `spell.system.location.value` = the entry's `_id`.

### Conditions
Applied by **creating an embedded `condition` Item copied from the `conditions` compendium** (43 conditions, catalogued below) — not a bare flag or string. API: `actor.increaseCondition(slug, {value,max})`, `.decreaseCondition(slug)`, `.toggleCondition(slug)`, `.hasCondition(slug)`, `game.pf2e.ConditionManager.getCondition(slug)`. **Namespace is `game.pf2e` even in the sf2e system** (rebuilt on the pf2e codebase; SF2E made no naming changes to the enrichers, condition API, or `data-pf2-*` attributes).

Valued conditions carry `system.value.{isValued: true, value: <rank>, immutable}`; the rank is what "frightened 2" means. Full slug catalogue (id, valued?, group): `blinded· broken· clumsy✓(abilities)· concealed· confused· controlled· cursebound✓(abilities)· dazzled· deafened· doomed✓(death)· drained✓(abilities)· dying✓(death)· encumbered· enfeebled✓(abilities)· fascinated· fatigued· fleeing· friendly(attitudes)· frightened✓· grabbed· helpful(attitudes)· hidden(detection)· hostile(attitudes)· immobilized· indifferent(attitudes)· invisible· observed(detection)· off-guard· paralyzed· persistent-damage(special — opens a dialog)· petrified· prone· quickened· restrained· sickened✓· slowed✓· stunned✓· stupefied✓(abilities)· unconscious(death)· undetected(detection)· unfriendly(attitudes)· unnoticed(detection)· wounded✓(death)`.

### Compendium packs (29 total) — reference by UUID instead of hand-authoring
Format: `Compendium.sf2e.<packName>.<DocumentType>.<16-char-id>`. Pack catalogue: `actions`(285 basic/skill/exploration actions), `ancestries`(51), `ancestry-features`(91), `backgrounds`(162), `classes`(6 — the full class list), `class-features`(132), `feats`(2411), `heritages`(354), `spells`(447), `equipment`(675 across weapon/equipment/consumable/armor/ammo/backpack/shield), `deities`(37), `conditions`(46), `bestiary-effects`/`equipment-effects`/`feat-effects`/`spell-effects`/`other-effects` (effect items by source), `bestiary-ability-glossary-srd`(89 — reusable NPC abilities like Grab), `starfinder-society-boons`(15), `alien-core-bestiary`(247 Actors — the core bestiary), `rulebook-bestiaries`/`tales-from-the-vast-bestiary`/`starfinder-society-bestiary`/`guilt-of-the-grave-world-bestiary`/`standalone-adventure-bestiary` (more Actor bestiaries), `iconics`(24 pregen characters), `paizo-pregens`(11), `macros`(1), `journals`(4 entries / 150 pages incl. a GM Screen).

Verified real UUIDs: `Compendium.sf2e.conditions.Item.TBSHQspnbcqxsmjL` (Frightened), `Compendium.sf2e.actions.Item.2u915NdUyQan6uKF` (Demoralize), `Compendium.sf2e.actions.Item.1kGNdIIhuglAjIp9` (Treat Wounds), `Compendium.sf2e.bestiary-ability-glossary-srd.Item.Tkd8sH4pwFIPzqTr` (Grab).

### Inline enrichers — the mechanism behind clickable check/damage buttons
All confirmed against 12,428 real pack documents, not just source code. Registered patterns (`sf2e.mjs`): `@Check[...]{label}`, `@Damage[...]{label}`, `@Template[...]{label}`, `@Localize[key]` (sf2e-implemented), plus `[[/act slug options]]{label}` (an SF2E/PF2E-specific action-macro enricher), and Foundry-core `@UUID[...]{label}` / `@Embed[...]`.

**`@Check`** — both `@Check[skill|dc:N]` (1586 real uses) and `@Check[type:skill|dc:N]` (12 uses) work; first segment without a colon is positional `type`. Parameters: `type` (skill slug / `fortitude|reflex|will` / `perception` / `flat` / a lore slug; comma-list = check group), `dc:` (integer, `@self.level`, or `resolve(<expr>)`), `against:`/`defense:` (alias — derived DC from a statistic, mutually exclusive with `dc:`), `basic` (flag, for saves), `traits:`, `showDC:` (`all|owner|gm|none`), `rollerRole:` (`origin|target`), `options:`, `adjustment:`, `name:`, trailing `{Label}`.

Real examples: `@Check[reflex|dc:35|basic]` · `@Check[flat|dc:5|name:Concealed|showDC:all]` · `@Check[athletics|dc:15|traits:action:climb]` · `@Check[computers|dc:18]` · `@Check[reflex|against:class|basic]` · `@Check[perception|against:deception|traits:action:seek]{Deception}`.

**`@Damage`** — positional formula `NdX[type]` with the type in brackets immediately after the dice term (comma-separate multiple instances inside one formula, not pipe-separated). Params: `traits:`, `options:` (`area-damage` common), `domains:`, `name:`, `shortLabel` (flag), `immutable`, `overrideTraits`. Damage kinds beyond type: `[healing]`, `[persistent,<type>]`.

Real examples: `@Damage[2d6[fire]]` · `@Damage[1d4[persistent,poison]]` · `@Damage[(3d6+6)[healing]]` · `@Damage[(2d10+8)[piercing]|traits:magical,unholy|options:area-damage]` · `@Damage[(@item.rank+1)d8[acid]]` (formulas can reference roll data).

**`@Template`** — `type` (`burst|cone|cube|cylinder|emanation|line|ring|square`), `distance:` (required, feet), `traits:`/`itemUuid:` (default to the parent item's). Real: `@Template[type:burst|distance:10]`, `@Template[cone|distance:30]`.

**`[[/act slug key=value]]`** — whitespace-delimited, not pipe-delimited. Real: `[[/act demoralize]]`, `[[/act disable-device skill=thievery dc=15]]{Thievery}`.

No enricher differs between PF2E and SF2E — same syntax, same `data-pf2-*` DOM attributes, same `PF2E.*` i18n namespace, same `game.pf2e` runtime API. SF2E's only data-level addition is the two extra skill slugs (`computers`, `piloting`) as valid `@Check` types.

**Practical translator for this project:** `challenge.schema.json`'s `check` shape (`skillOptions[0]`, `dc.value`, `dc.adjustment`) maps directly to `@Check[<skillOptions[0]>|dc:<dc.value>]{name}`, with `dc.adjustment` translating to `traits:` rarity tags where relevant. This is a small, mechanical string-template function, not a parser — the hard work (confirming the real syntax) is already done above.

---

## Explicitly not verified / open

- Compendium pack build tooling (JSON source → LevelDB): no packer ships in either source tree; only the LevelDB runtime reader and a one-time NeDB migration path exist locally. External tooling (the community `@foundryvtt/foundryvtt-cli`) would be needed if this project ever ships its own compendium packs — not evaluated, not currently planned (world documents are the chosen delivery path, see design doc).
- `familiar`/`loot`/`party`/`army` actor system shapes — no instances in any shipped pack.
- Character `system.proficiencies.defenses.*`, `system.martial.*`, full `system.saves.*` — not present in any shipped character (runtime-derived); only `proficiencies.attacks.*` has literal evidence.
- Any numeric Elite/Weak adjustment delta table, in either the official SRD text or the sf2e system source — confirmed absent from both. `system.adjustment` on an sf2e NPC is just a `"elite"|"weak"` label with no attached formula in the data itself.
- `@Check` multi-type groups and `adjustment:` param, `@Damage`'s `domains:`/`immutable`/`overrideTraits`, `@Template`'s `width:` — real in source, zero examples in shipped packs.
