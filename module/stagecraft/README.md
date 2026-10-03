# Stagecraft: Puppet Show

A Foundry VTT module for theatre-of-the-mind scenes where the players hold the puppets.

A scene is a painting. People are **cards** that stand in it, lit by its lamps. Each player picks up their own card
by its **stick**, moves it about, wiggles it, and bumps it into other cards. A scene can carry **zones** (faint dashed
areas that mean something), **marks** (places a card likes to rest, shown only when a card is picked up) and a **box of
chalk** for graffiti that stays on the wall between sessions. Where a scene is a stage, the module draws it itself with
three.js instead of Foundry's canvas; Foundry keeps drawing everything that is not the scene.

**Status: early.** Version 0.1.0. Foundry v14 only. Works today: the takeover of a flagged scene, the lit stage, picking
up and moving your own card, the wiggle and the bang, zones, marks, the box of chalk with a GM strip, held cards moving on everyone's screen, and a flat stage (a plain 2D canvas) for machines that cannot draw the 3D one. Not yet: the adventure's bridge file, and any deploy.

## Working on it

```
npm install            once, in this folder
npm run build:dev      a readable bundle with a source map  (dist/stagecraft.js)
npm run build          the minified bundle that ships
npm test               the module's own tests; they need no Foundry
```

The module is a Foundry module like any other: put (or link) this folder in Foundry's `Data/modules/stagecraft`, **restart
Foundry** (a new module folder is only discovered at start), enable it in a world, and give a scene a stage description
(see `API.md`).

## Using it

- **A stage scene** is any scene whose `flags.stagecraft.stage` holds a description (a painting, how its floor sits, its
  lamps, zones, marks, chalk rules) and whose `flags.stagecraft.published.cards` lists who is on the stage. `API.md` has the
  fields and `api.scenes.validate(description)` tells you what is wrong with one.
- **Cards**: click and hold a card to pick it up by its stick; move the pointer to carry it; let go to put it down. Space
  hops, N nods, B bows, X shakes its head, T turns its back (rebindable in Foundry's controls).
- **Chalk**: where a scene allows it, a small box of chalk stands on the floor. Click a stick (or the felt eraser) and draw;
  Escape, a right click or the same stick again puts it back. A GM gets a strip along the top: chalk off or on for this
  scene whatever the scene says, freeze the wall, undo, wipe, hide it.
- **Settings** (each player's own): picture quality, how visible zone outlines are at rest, calm mode (no flashes, sparks or
  grain; also on when Foundry's Photosensitive Mode or the system's reduced-motion setting is).

## Layout

```
scripts/core/     pure logic: the stage engine, springs, zones, marks, chalk. No Foundry, no DOM, no three.js.
scripts/render/   the renderers: three.js, and the contract every renderer provides
scripts/foundry/  the only code that touches Foundry: the scene manager, settings, keys, the host, the chalk store
scripts/skins/    the default skin and the skin registry
test/             node --test, no Foundry needed (a stand-in journal is in test/fake-foundry.mjs)
tools/            the build
dist/             the built bundle
```

The design documents live with the project that develops this module: `../../design/stagecraft/README.md`.
