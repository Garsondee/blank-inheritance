---
description: Register a place Ingram picked in the Location Editor (pasted "Copy for Claude" JSON plus her brief): fill in the details and do every other step, end to end
argument-hint: "[her brief, if not already in the message]"
---

# Register a location — `$ARGUMENTS`

Ingram picks a shape in the Location Editor, presses **Copy for Claude**, and pastes the JSON with a few words (`design/location-editor.md` section 14).
**Do all the rest, in one go, without asking permission for the steps below.** Ask only about a genuine creative fork (a name she has not given, a
canon fact in conflict), and even then bring a best-shot draft and carry on with it marked as proposed.

## 1. Understand what was asked

- Read the paste: `items[].adoptedFrom` (the real building), `geometry` (map-image px), `containedIn` (its district, and any existing place it
  sits on), `nearest`, `drawingFor` (the slot she was working from, often not what this paste is for: her message decides).
- **Is it a new place, a place that was mislabelled, or an existing place changed?** A paste that sits on an existing location
  (`containedIn` names a site) usually means *that* place is wrong: use `--retire <old-id>` and say so. `saved: true` means edit
  `data/locations/<id>.json` directly.
- Find what the place is for: the scene/haunt/episode that needs it (`canon/scenes/`, `data/campaign/scene-set.json`,
  `canon/plan/`, the NPC files). **Write only what those already say.** The place gets canon's words, never new canon. A name she did not give is
  yours to propose: mark it open (`data/campaign/open-questions.json`, `namingPlaceholderRef`), do not hide it.
- Look at it when the shape is odd: `crop.py` or a labelled crop of `artwork/in-tray/campaign-map.png` with the neighbours drawn.

## 2. Write the form

A JSON file of fields in the scratchpad (never in the repo): `name`, `kind` (commercial / civic / transport / military / residential ...),
`tags`, `rank` (design/location-rank.md), `depth` (design/location-depth.md: a place a scene runs in is `scene` or `standing`, colour is `named`),
`lore.summary/playerFacing/gmOnly`, `scene.hooks/activities`, `npcRefs`, `episodeRefs`, `assetRefs` (the scene brief id that uses its art),
`playlistRefs`, `note` (what it is and where it came from; keep the old text of anything it replaces), `namingPlaceholderRef`.
Check the depth advice (`python -c` on `core/depth.py#check`): `missing` is yours to fix or to report.

## 3. Run it

```bash
node tools/location-sync/from-handoff.mjs <paste.json> --item N --id <new-id> --fields <fields.json> \
  [--scene <scene-set id> | --destination <brief>:<id> | --position <brief>:<which>] [--scene-note "..."] \
  [--retire <old-id>] [--within <region>] --dry-run
```

then again without `--dry-run`. It writes the location (drafted, exact outline), lists it in its region's contents, places the scene (canon copy
first), and retires the old place after proving nothing else names it. Siting a scene is hers to decide: pass `--scene` only when her message says which.

## 4. The rest of the work

- A decision she stated (what a place IS) goes in `canon/decisions/` the same turn, her words verbatim (next free `D0nn`).
- Something stale that named the old state (a plan line, a registry note, a scene-set blurb): fix it. Anything that changed a canon scene needs the
  re-read (`canon/reread.md`, `<scene>.reread.md`) and `node tools/story/story.mjs build`.
- `npm test` (the corpus tests validate the new file's schema, the haunt tests the scene's place), `python -m unittest` in `test/location-sync` if
  the bridge changed.
- `npm run journeys`: the party can still walk every episode (`design/location-editor.md` section 16). A new or moved place can strand a scene (a token that would stand in the sea, a street network that stops short); it exits 1 on an error, and `--notes` lists what a place being an area, a detour or a slow walk costs. Fix an error, or say it in the report.
- Commit only your own files (blob-stage anything another session also changed), then `npm run deploy` (`--prune` when a location was retired:
  `npm run deploy:check` first and read what it would delete). Ingram has said: deploy at the end, do not ask.
- Report in her terms: what the place is, what you proposed that she should check, what is still open, the build id.
