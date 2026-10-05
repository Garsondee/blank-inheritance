# Stagecraft: the public interface

Everything here is reached through `game.modules.get("stagecraft").api`, or is a hook. Anything else may change
without notice. `api.schema.json` lists exactly this, and a test fails if the code and that file disagree.

**Version 0.15.0.** Early: the interface will grow, and while the major version is 0 it may also change. 0.2.0 added
`api.blocking` and the `stagecraft.walk` and `stagecraft.arrive` hooks; 0.3.0 added the `stagecraft.visit` hook, and a
published card whose `home` changes now goes about its routine round the new one; 0.4.0 added `api.blocking.setCover`;
0.5.0 paints chalk instead of drawing lines: the `stagecraft.chalk` hook now says which tool and colour and where, and
`api.chalkTools` lists the tools; 0.6.0 gave a card a line of text under its name (`title`, and a line break in a name does the same), and a skin a `helpers.titleBlock` to lay it out with; 0.7.0 added `api.blocking.setBadges` (short labels on a card's face, such as conditions) and `api.blocking.setTurn` (whose turn it is: lit, nobody turns); 0.8.0 added `api.blocking.keepPlaces` (where the cards stand becomes where the scene puts them; the `stagecraft.keep` hook says so); 0.9.0 added `api.blocking.setChalkBox` (the box of chalk somewhere else); 0.10.0 added `api.blocking.editStage` (move marks and the corners of zones) and the strip's "Edit stage"; 0.11.0 added `api.blocking.setEmote` and `api.emotes` (an emote on a card, shown once or kept, chosen at the table from the card's menu: a right-click on a card) and a card's `emote` and `actor`; 0.12.0 freed the view (every screen pans and zooms its own: drag the bare stage, right- or middle-drag, the wheel; a double-click or the Home key goes home) and added `api.view.setMargins` and `api.view.home`; 0.13.0 added the wings (`api.wings`: the people a scene could still bring on, shown to the GM as a tray and as faded cards where they would stand, and the `stagecraft.bring` hook when one is brought on) and `api.blocking.setCardActions` (your own things on the GM's card menu); 0.14.0 gave every card a real token on its scene (`api.tokens`: a click on a card controls its token, T aims at one, through Foundry's own `Token#control` and `Token#setTarget`); 0.15.0 let an actor provider say `link: false` (each token its own copy of the actor, so each of a pack of the same creature has its own hit points).

## api

| | |
|---|---|
| `api.version` | The interface's version, a string |
| `api.skins.register(skin)` | Add a skin: everything that makes the cards and sticks look like something. A skin is `{ id, size: { w, h }, face(person, helpers), back(person, helpers), ... }`; see `scripts/skins/paper.mjs` for the default and the fields. `helpers` is `{ loadImage(src), titleBlock }`; `titleBlock.fit(person, style)` lays a card's name, and its line of text under it, out to fit a plate of a given width and says how tall the plate must be, and `titleBlock.draw(ctx, block, rect, look)` draws it (a skin written before 0.6.0 is simply not asked to use it) |
| `api.skins.use(id)` | Choose the skin used when a scene does not name one |
| `api.skins.list()` | The ids of the registered skins |
| `api.scenes.isStage(scene)` | Does this Foundry scene carry a stage description? |
| `api.scenes.describe(scene)` | The scene's description, understood: `{ ok, usable, scene, problems }` |
| `api.scenes.validate(raw)` | The same for a description that is not in a scene yet |
| `api.blocking.formations` | The formations: `line`, `huddle`, `talk`, `gangup`, `panel`, `standoff`, `circle`, `queue`, `scatter`, `audience`, `position`. Each is loosened, after it is arranged, just enough that no card hides more than 15% of another |
| `api.blocking.gaits` | The ways a card can walk: `walk`, `stroll`, `hurry`, `march`, `sneak`, `scurry`, `hop`, `glide` |
| `api.blocking.routines` | What a card can do on its own: `still`, `wander`, `visit`, `patrol`, `pace`, `swarm` (see "Life" below) |
| `api.blocking.move(scene, moves)` | GM only. Send cards somewhere: `[{ id, at: [fx, fy] \| mark, yaw?, lean?, pitch?, gait?, still?, packed? }]`. Every screen walks them there together |
| `api.blocking.arrange(scene, kind, opts)` | GM only. A formation: `{ ids?, focus?: [fx, fy] \| cardId, target?, speakers?, party?, gait?, dir?, away?, size? }` (`dir`: which way a queue runs, `back`, `left`, `right` or `front`; `away`: everyone turns their back to the table to look where the formation looks; `size`: how wide the thing they gather round is, as a share of the painting's width there). Without `ids` it moves every card that is not one of the party's |
| `api.blocking.backToPlaces(scene)` | GM only. Everyone moved walks back to their `home` and takes up their routine again |
| `api.blocking.keepPlaces(scene, ids?)` | GM only. Where the cards stand now (or just `ids`) becomes where the scene puts them: their `home`, which `backToPlaces` returns them to. Resolves to how many cards' homes changed |
| `api.blocking.setChalkBox(scene, [fx, fy])` | GM only. Put the box of chalk at a point of the painting: written into the scene's description (`chalk.box`) and the stage drawn again. The `stagecraft.keepBox` hook says so. Resolves to whether it was written |
| `api.blocking.editStage(scene, edit)` | GM only. Stage by hand: `{ mark: { id, at } }`, `{ vertex: { id, index, at } }` (a corner of a zone), `{ zone: { id, dx, dy } }` (the whole zone, kept inside the painting), `{ addVertex: { id, after, at? } }` or `{ removeVertex: { id, index } }` (a zone keeps three). Points are fractions of the painting. Written into the scene's description and the stage drawn again; the `stagecraft.keepStage` hook says what the marks and zones are now. Resolves to whether anything was written. The GM's strip has the hands for it: **Edit stage** |
| `api.blocking.tidy(scene)` | GM only. Every loose card walks to its nearest free mark |
| `api.blocking.setLife(scene, on)` | GM only. Routines run (on, the default) or everyone stands where they are |
| `api.blocking.setBoard(scene, on)` | GM only. The fight board: positions (zones of kind `area`) drawn plainly, with who is in each and the range bands. While it is up, a card put down inside a position docks in a free place in it |
| `api.blocking.setSpeaker(scene, id)` | GM only. Give someone the floor (a card's id, or `null` to take it back): a pool of light at their feet, and everyone else on the stage turns to look at them. The GM can also Alt-click a card |
| `api.blocking.setTurn(scene, id)` | GM only. Light a card as the one whose turn it is (a card's id, or `null` to put the light out): the pool of light of the speaker, but nobody else turns to look |
| `api.blocking.setBadges(scene, id, badges)` | GM only. Put badges on a card: up to four short labels (16 characters each, text only) drawn down the top-left of its face on every screen and kept in its published card, so a reload finds them. An empty list takes them off. Nothing is written when nothing changed |
| `api.blocking.setEmote(scene, id, emote, { keep })` | GM only. Put an emote on a card (an id from `api.emotes`): shown once, as a reaction, or with `keep: true` brought round every few seconds until it is cleared. `null` clears what the card has, a habit the scene gave it included. Written on its published card (`emote`), stamped to start a moment from now, so every screen shows it together and a reload finds a kept one; the same emote again shows it again. Resolves to whether it was written |
| `api.blocking.setDown(scene, id, down)` | GM only. Knock a card down (a defeated foe, a character at 0 HP: it tips over backwards and lies on the floor, dimmed, going nowhere) or stand it back up. The GM can also Ctrl-click a card |
| `api.blocking.registerMoments(provider)` | Offer a scene's authored blocking as buttons on the GM's strip: `provider(scene)` returns `[{ id, label, tip?, run(scene) }]`. Returns a function that takes it away |
| `api.blocking.setCover(provider)` | Say what your own interface covers over the stage (a deck of controls along the bottom, a dial rising out of it): `provider()` returns shapes in window pixels as they are now, `{ rect: [x0, y0, x1, y1] }` or `{ circle: [cx, cy, r] }`. Formations then keep everyone clear of it: no more than the bottom 15% of a card under it, a card moved back up the stage if need be. Returns a function that takes it away |
| `api.blocking.setCardActions(provider)` | Add your own things to the GM's menu on a card (a right-click): `provider(scene, cardId, card)` returns `[{ id, label, run() }]` for that card, asked each time a GM opens its menu, so it must answer at once. They come after the stage's own, and `run()` is called when one is picked. A player's menu never shows them. Returns a function that takes it away |
| `api.wings.setProvider(provider)` | Say who waits in the wings of a scene: `provider(scene)` returns (or resolves to) `{ people: [{ id, name, title?, portrait?, at?, size?, way?, note? }], ways?: [{ id, label }] }`. The GM's screen shows each person's face in a tray along the top of the stage and, for one with `at` (a point of the painting), a faded card standing there at the size they would be (`size` as a card's). `ways` are how someone can come on (`way` is a person's own); `note` is a line for the GM. Someone with a card on the stage already is not shown. Asked when a stage starts, whenever its scene changes, and on `api.wings.refresh()`. Nothing is written to the scene or sent to another screen. Returns a function that takes it away |
| `api.wings.setFinder(finder)` | Let the GM find anyone else to bring on, from a box on the tray: `finder(scene, query)` returns (or resolves to) `[{ id, name, portrait?, note? }]`, eight at most shown. Returns a function that takes it away |
| `api.tokens.setActorProvider(provider)` | Say who a card's token stands for: `provider(scene, card)` returns (or resolves to) an Actor, an actor id, `{ id, link: false }` (the token is its own copy of that actor, with its own hit points: a pack of the same creature), or `null`. Asked of the acting GM's screen when a card needs a token (a card that has its own `actor` is never asked) and again when its name changes; the first provider whose answer is an actor of the world wins; a card nobody answers for gets a token that stands for no actor. Returns a function that takes it away |
| `api.tokens.refresh()` | Make the tokens of the stage on screen agree with its cards, now (your own actors changed while the cards did not). Resolves when done |
| `api.wings.refresh()` | Ask the providers again, now (your own story changed while the scene did not). Resolves when the tray has been drawn again |
| `api.view.setMargins(provider)` | Say what your own interface takes along the window's edges (a drawer down the left, say): `provider()` returns `{ left?, right?, top?, bottom? }` in window pixels as things are now. A screen's home view then fits the whole width of the stage into what is left, centred there, instead of covering the window. Returns a function that takes it away |
| `api.view.home({ animate })` | Glide this screen's view home: the whole stage in sight, clear of the margins. Call it when your interface opened, shut or changed size (`animate: false` jumps). Each screen's view is its own and is never sent: everyone pans (a drag on the bare stage, a right- or middle-drag) and zooms (the wheel, about the pointer) as they like, and goes home with a double-click on the bare stage or the Home key. Returns whether a stage was there |
| `api.stage()` | The stage on screen now as `{ stage, backend }`, or `null` |
| `api.zoneKinds` | The zone kinds the module knows. Any other kind is treated as a trigger |
| `api.chalkModes` | `off`, `zones`, `anywhere` |
| `api.chalkTools` | The tools in the chalk kit: `chalk`, `magic`, `pencil`, `brush`, `spray`, `smudge`, `eraser`, `fill` |
| `api.emotes` | The emotes a card can show, in the order its menu offers them: the faces (`laugh`, `pleased`, `smug`, `blush`, `determined`, `deadpan`, `wince`, `tear`, `shiver`, `dizzy`, `ko`), the balloons (`ellipsis`, `whisper`, `think`) and the marks (`surprise`, `question`, `shock`, `sweat`, `anger`, `sparkle`, `heart`, `music`, `sleep`, `gloom`, `idea`, `fume`, `soul`, `star`, `hand`, `bowl`) |

## Hooks

Raised with `Hooks.callAll`. The first argument is the event; the second is the running stage host.

| Hook | When |
|---|---|
| `stagecraft.init` | Foundry is initialising, before any scene is drawn. The argument is `{ registerSkin(skin) }`: a skin registered here is there for the very first scene (the api itself only exists at `ready`) |
| `stagecraft.ready` | The module is up; the argument is the api |
| `stagecraft.stageReady` | A stage scene has been taken over and is drawing; the argument is the host |
| `stagecraft.grab` | A hand took hold of a card: `{ card, by, t }` |
| `stagecraft.drop` | A card was let go: `{ card, by, mark, X, Z, t }` |
| `stagecraft.bonk` | A card in a hand met another: `{ a, b, x, speed, Z, t }` |
| `stagecraft.mark` | A card settled on a mark: `{ card, mark, t }` |
| `stagecraft.zone` | A card entered or left a zone: `{ card, zone, entered, t }` |
| `stagecraft.visit` | A card was put down at a door or a thing to look at (a zone of kind `door` or `spot`): `{ card, by, zone, name, hint, t }`. The stage shows who went where for a few seconds on every screen |
| `stagecraft.walk` | A card set off somewhere without a hand (a formation, a move): `{ card, to: { X, Z }, mark, t }` |
| `stagecraft.arrive` | A card that was sent somewhere got there: `{ card, mark, t }` |
| `stagecraft.fall` | A card was knocked down or stood back up: `{ card, down, t }` |
| `stagecraft.keep` | The GM kept the cards' places (`api.blocking.keepPlaces`) and some changed: `{ scene, changed, homes: [{ id, home, homeYaw }] }`, every card that now has a home. Raised once, on the GM's screen |
| `stagecraft.keepBox` | The GM moved the box of chalk (`api.blocking.setChalkBox`): `{ scene, at }`, `at` in fractions of the painting. Raised once, on the GM's screen |
| `stagecraft.keepStage` | The GM moved a mark or a zone (`api.blocking.editStage`): `{ scene, marks: [{ id, at }], zones: [{ id, shape, floor? }] }`, all of them as they are now. Raised once, on the GM's screen |
| `stagecraft.chalk` | Someone on this screen painted on the wall, and it is kept: `{ type: "chalk", scene, by, tool, colour, bounds }`. `tool` is one of `api.chalkTools`, `colour` is `"#rrggbb"`, and `bounds` is where the stroke lay, `{ x0, y0, x1, y1 }` in fractions of the painting. Raised once per stroke, on the painter's own screen |
| `stagecraft.bring` | The GM brought someone on from the wings: `{ scene, id, way, at, found }`. `id` is the provider's (or the finder's, with `found: true`); `way` is one of the provider's ways, or `null` for the person's own; `at` is the point of the painting `[fx, fy]` they were dropped on, or `null` for their own place. The stage puts nobody on itself: answer it by publishing their card. Raised once, on the GM's screen |
| `stagecraft.settingsChanged` | A player changed one of their Stagecraft settings; the argument is its name |

## A stage scene

A Foundry scene is a stage scene when `flags.stagecraft.stage` holds a description, and the cast is in
`flags.stagecraft.published.cards`. The description's fields are documented in `scripts/core/scene.mjs`.

## A card

A published card is `{ id, name, title?, portrait?, colour?, size?, demeanour?, owners?, pc?, at | mark, yaw?, lean?, pitch? }`
plus, for blocking:

| Field | Means |
|---|---|
| `home` | Where the scene put them, `[fx, fy]`: where **Places** sends them back to |
| `life` | A routine: `{ kind, every?, restless?, gait?, radius?, width?, spots?, marks?, path?, loop?, faces?, gestures?, gestureChance? }` (below) |
| `still` | The routine is set aside: the card stays where it was put (a GM's drop, a formation) |
| `packed` | It stands close on purpose (a huddle, a gang-up): the magnets that part overlapping cards leave it be |
| `move` | `{ t0, gait }`: a move the GM made, starting at `t0` on the shared clock (seconds). A screen walks a card when it sees a `t0` it has not walked yet |
| `enter` | `{ from: "left" \| "right" \| "back" \| "rise", t0, gait }`: the card walks on from that side, or rises out of the floor, when it first appears |
| `down` | It is down: lying on the floor, dimmed, until the GM stands it up |
| `emote` | `{ id, t0, once?, chosen? }`: an emote over its head (`api.emotes`), from `t0` on the shared clock. Without `once` it is a habit, shown for five seconds in every six; with `once` it is shown once and gone. `chosen` says a person put it there from the card's menu (a module laying a scene out again should keep it); `{ id: null, chosen: true }` is one cleared |
| `actor` | A Foundry Actor's id: the card's menu offers that actor's sheet to anyone who may see it |

**The words on a card.** A card's face has a title block: its `name` in a bold face and, under it, a line of `title` text (a
role, a description). Both are laid out to fit the plate whatever they hold. A long name is kept on as few lines as it can be
and still be large, broken between words (after a hyphen, between Japanese words, never leaving a closing mark at the start of
a line) and made smaller before it is cut; the text under it is made smaller and then shorter and ends in an ellipsis; the
plate grows to hold them, and the portrait gives way. The author's own line breaks are kept (a line break, a typed `\n` or a
`<br>` in a name or a title); with no `title`, the first line of a name is the name and the rest is the line of text, which is
how a second line has always been given to a card. Changing a published card's `name` or `title` draws its face again.

**Life.** A routine is worked out from the time every screen shares, so the whole table sees the same people do the same
things with no messages: `wander` (drifts about near home, `radius` a share of the painting's width), `visit` (goes between
`spots` and `marks`), `patrol` (walks `path` there and back, or round if `loop`), `pace` (back and forth, `width` wide) and
`swarm` (short quick scurries: vermin, a crowd). `every` is the beat in seconds, `restless` how often a beat moves at all,
`faces` a point to look at when standing still, or another card's id to talk to (turned to them), and `gestures` the small
things it does now and then while standing (`hop`, `nod`, `bow`, `shake`; `gestureChance` is how many beats bring one).

A scene may also say `focus: [fx, fy]` (where formations gather by default) and `board: true` (the fight board is up when it
opens). A zone may say `tags` (its rules as SF2E has them, shown on the board), `near` (the zones one Stride away) and
`colour` (`[r, g, b]`, its wash on the board).

## A card's menu

A right-click on a card opens its menu. Anyone who may put an emote on it (a GM any card; a player one whose `owners`
name them, or one that names no one, hands off or not) gets the emotes: one picked is shown once, or, with **Keep it up**
on, kept until **Clear**. A player's pick goes to the acting GM's screen over the module's socket and is written there, so
it needs a GM on. The GM also gets **Give them the floor** (`setSpeaker`), **Knock down** / **Stand up** (`setDown`) and
**Choose for a formation** (a Shift-click), and, for a card with an `actor`, **Open their sheet**.

## Tokens: a click selects, T aims

Foundry's own systems think in tokens: the one you control is the one your rolls and sheet speak for, and the ones you target
are what an attack is aimed at. So every card on a stage has a real token on its scene, never drawn (the stage is the
picture), made and kept by the acting GM's screen when the card is made (`flags.stagecraft.card` says whose it is; tokens
without it are never touched) and named and pictured as the card is. A **click on a card** controls its token (Shift adds one
for a player; a GM's Shift-click still chooses cards for a formation), and a click on the bare stage lets go. **T** aims at the
card under the pointer (Shift adds another, as in Foundry); with the pointer on nothing, or on the card already chosen, T starts
aiming (a line at the top of the stage says so) and a click on a card then aims at it, a click on the bare stage clears every aim,
and T or Escape stops. A controlled card stands in a gold ring; an aimed-at one wears Foundry's four arrows in the aimer's colour,
with a pip for each aimer. Both are read back from Foundry at every frame, so a choice made anywhere else shows too. With no
token to reach (no GM has opened the scene) the stage still answers, on that screen alone.

## The wings

On the GM's screen only, while a stage scene is up, a tray stands along the top of the stage, under the GM's strips: a face
for everyone `api.wings.setProvider` says is still waiting, and a box to find anyone else (`api.wings.setFinder`). For
someone with a place, a faded card stands there too, at the size their card would be. On a face, a faded card or something
found: a **click** brings them on their own way, a **right-click** asks how (the provider's `ways`), and a **drag** onto the
stage brings them on where they are dropped. Each raises `stagecraft.bring`; the provider's module answers it by putting
their card on the stage, and they leave the wings because the provider stops naming them. The tray's **Show on stage** key
hides the faded cards (remembered on that machine); they also step aside while chalk is in hand, a formation waits for the floor or
the stage is being edited.

## The box of chalk

A stage scene's `chalk` field says who may draw on it: `{ mode: "off" | "zones" | "anywhere", lock, box }`. `zones` means
only inside zones of kind `chalk`; `lock` keeps the wall and takes the chalk away; `box` is where the box of chalk stands
(fractions of the painting). A GM can override the mode and the lock from the strip along the top of the stage, which
writes `flags.stagecraft.live.chalk = { mode, locked }`; `flags.stagecraft.live.chalkHidden` hides the wall.

Chalk is painted in pixels. Paint is kept in one world journal entry, `Stagecraft chalk`, which every player owns, with a
page for each scene and painter: that painter's layer of the wall, as square tiles of pixels (small WebP pictures; the wall
is 1440 pixels high and as wide as the painting's shape makes it, in tiles of 240) and the last eight strokes' history, so
each can be taken back. A painter writes only their own page (a GM may write any), so two people painting at once never
overwrite each other. Strokes being painted travel between screens on the module's socket and are never kept until they
end. Nothing else is stored, so deleting the journal entry clears every wall.
