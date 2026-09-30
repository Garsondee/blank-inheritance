# The admin panel

*Built 2026-09-28 at Ingram's request. GM only. A testing tool, not part of running a session.*

> "Could you give me an 'admin' panel and push it to the remote server. Its main usage at the moment, resetting
> everything to the very start of the adventure for testing purposes. Another button would allow automation of the
> player choices during the day ... the goal is to allow me as the GM to test the whole day's worth of systems and
> make sure they are working. ... this panel is primarily for doing unusual things to all the systems that we've
> invented and added to Foundry."

**Open it** from the Director's Palette ("Admin"), the Console's Hub tab, the macro *Blank Inheritance: Admin Panel*,
or `game.modules.get("blank-inheritance").api.openAdminPanel()`.

## What it does

| Section | What it gives the GM |
|---|---|
| **Start over** | Reset to the very start of Episode One. A confirmation lists every step first. A snapshot is saved before anything changes, and **Undo the last reset** puts it all back. |
| **The players** | Lend test characters to player accounts that have none, so a GM alone has a roster, and take them back exactly. |
| **Autopilot** | Stand-in players for every account with a character: choose where to go on The City (and optionally press Go once everyone has), roll the Scene Runner's checks, book a downtime slice each quarter. Plus one-press versions of each. |
| **Time** | Set the day ring exactly, backwards too, or step it on a quarter. |
| **Jump to a scene** | Any scene of either episode: the Runner opens on it, its backdrop is cued, and the clock is set to its day and quarter. |
| **The City** | Open any authored departure, cancel the open one, remove every pawn. |
| **The world** | Update from the last deploy, rebuild the scenes, stop all sound. |
| **State** | What every system holds right now, and a JSON copy of it. |

## The reset

What it resets: the clock, downtime bookings (public and private), The City (departure, groups, queue, pawns), the
Scene Runner (episode, scene, every tick), the scene-close review count, equipment given out, which portraits have had
their first-appearance splash, the soundscape (and all sound), every event deck (nothing drawn or witnessed), who is on stage in every campaign scene, every NPC's
attitude and revealed facts, journeys in progress on the map. Optionally: the chat log (on by default, because the
Runner reads old rolls from it), combats (on), a cut to the first scene (on), and characters made at the induction
terminal (**off** by default: those are the players' own).

What it never touches: Ingram's scene edits (the records in `storage/` and every scene brief), authored content
(NPCs, locations, the Social Intel vault's facts, the scene set), the session log's files, the build stamp, the GM's
faders, and anything a GM made by hand. **Handouts are taken back, not deleted**: every Papers entry goes back to
GM-only, so an edit made to one in Foundry survives, and showing it again gives it back.

The snapshot is a JSON file in the module's `storage/` folder (`admin-snapshot-<time>.json`, which a deploy never
touches and the scene-edit tools never read). The reset refuses to start if the snapshot cannot be saved. Undo
restores every setting, vault, flag, handout's access, pawn, chat message and deleted induction character; ended
combats are the one thing it cannot bring back, and the confirmation says so.

**Every world setting the module registers is on one of two lists** in `core/admin.mjs`: `RESET_SETTINGS` or
`KEPT_SETTINGS` (with the reason). `test/tier3-admin-contract.test.mjs` fails when a new world setting is on
neither, so a system added later cannot silently survive a reset.

## The autopilot

Stand-ins act only on the active GM's client, and the switches are that GM's own (client scope), so turning the
autopilot on for a test never turns it on for anyone else or for the real session. They obey the rules a real player
meets: a pick goes through the same `applyPick` with `isGM: false`, so a full place or one not open to them refuses
them; a must-go place nobody has taken is covered first; after that, **at random**, **spreading out** or **sticking
together**. A roll uses the character's best skill of those the Runner's check offers, carrying the Runner's own roll
tag, so the Runner records it exactly as it records a click. What the stand-ins did is listed in the panel.

## Files

- `module/blank-inheritance/scripts/core/admin.mjs` — the rules (start, reset plan, settings lists, snapshot checks,
  test party, stand-in choices). `test/tier1-admin.test.mjs`.
- `scripts/foundry/admin-actions.mjs` — reset, snapshot, undo, test party, clock, jump, City, state.
- `scripts/foundry/admin-autopilot.mjs` — the stand-ins.
- `scripts/foundry/admin-panel.mjs`, `templates/admin/panel.hbs` — the window. `test/tier3-admin-contract.test.mjs`.
