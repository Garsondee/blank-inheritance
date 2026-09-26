# Art status for Episodes One and Two

What is cast, what is deliberately not cast, and the three things that still
need drawing. Written 2026-09-21, replacing `scene-backdrop-proposal.md`,
which was a proposal and which got one thing badly wrong — see "The method
changed" below.

## Backdrops: 25 of 26 scenes

Every authored scene in both episodes has a background except Slack Water.

Four school scenes and Zero Six Hundred share a room with another scene
rather than having their own image, which is deliberate: a school has a
handful of rooms and the same room hosts different lessons.

| Scene | Image |
|---|---|
| The Road In | `episode-c1e1--the-road-in` |
| Intake Medicals | `episode-c1e1--intake-medicals` (+ exam room) |
| Assembly | `episode-c1e1--assembly` |
| School: First Period | `location--school-classroom` |
| Kit Issue | `episode-c1e1--kit-issue` |
| School: Second Period | `location--school-specimen-room` |
| The Errand | `episode-c1e1--the-errand` (+ tea house, alley) |
| The Tram Back | `episode-c1e1--the-tram-back` |
| Canteen | `episode-c1e1--canteen` (+ alt) |
| The Walk Down | `episode-c1e1--the-walk-down` |
| Flood Tunnel Clearance | `episode-c1e1--flood-tunnel` (+ generator, machine room) |
| As Discussed | `episode-c1e2--as-discussed` |
| The Board | `episode-c1e2--the-board` |
| School: Period One | `location--school-prep-room` |
| **Slack Water** | **nothing — see below** |
| School: Period Two | `location--school-classroom` |
| The Long Afternoon | `episode-c1e2--the-long-afternoon` |
| The Override | `episode-c1e2--the-override` |
| The Night Off | `episode-c1e2--the-night-off` |
| Zero Six Hundred | shares `episode-c1e1--canteen` |
| Familiarisation | `episode-c1e2--familiarisation` |
| The Exercise | `episode-c1e2--the-exercise` |
| Unidentified Contact | `episode-c1e2--unidentified-contact` |
| First Contact | `episode-c1e2--first-contact` |
| The Hammer | `episode-c1e2--the-hammer` |
| The Names Are Still Up | `episode-c1e2--the-names-are-still-up` |

## Portraits: every speaking part except two

Cast this session: the Section Officer and Hulda Brack (both commissioned by
Ingram for the part), Nobu, Taka, the Comms Officer, the Range Safety Officer,
the Time Office Clerk and the Transparency Advocate.

Already cast before this session: Shucks Mordant and his hand, Anabala, Hyuck,
Rupiah, the Deputy Director, the Works Manager, the Hospital Chief of Staff,
the Switchboard Supervisor, the school history teacher, the school natural
history teacher, and the two repair chiefs.

Every registry entry carries a note saying why that picture is that person.

### Deliberately not cast

**The six hangar crew chiefs.** One per pilot, each attached to the specific
machine they are handing over, so who they are depends on who the six PCs turn
out to be. Reference art for what they look like is registered against the
hangar (`hangar-crew-chief`) and the scene brief says not to cast them.

**Manako.** Held for Ingram's eye. He is the primary antagonist and the face
is a decision, not a match.

## Requests sent to Ingram, 2026-09-21

She offered to make art to order rather than have it hunted for. These four
prompts went back, in priority order. Keep this list in sync with what arrives.

1. `episode-c1e2--slack-water` — hand-painted anime background art matte
   painting gouache, a harbour sea wall at low tide, huge fitted stone blocks
   running away down the frame to exposed rock and black mud, thick weed and
   barnacles up the wall to above head height with a hard clean tide line
   above them, iron rungs set into the stone, the water flat and a long way
   out, wet channels and standing puddles in the mud, 1950s, bright overcast,
   wide cinematic.
2. `episode-c1e2--zero-six-hundred` — hand-painted anime background art matte
   painting gouache, an institutional canteen completely empty at six in the
   morning, long rows of wooden tables and chairs with the chairs stacked on
   some of them, one serving hatch open and lit with steam coming out of it
   and the rest of the counter dark and shuttered, tall windows full of grey
   pre-dawn light, a wet floor just mopped, 1950s, wide cinematic.
3. `school-civil-defence-instructor` — 1950s hand-painted gouache and
   watercolour texture, muted palette, portrait of a woman in her forties, a
   serving NCO in a plain uniform tunic with the sleeves rolled and a whistle
   lanyard, short practical hair, standing square with her weight on both
   feet, patient and entirely unhurried, not smiling and not unkind.
4. `episode-c1e2--first-contact` — optional; the scene currently borrows a
   rainy residential street, which is close but not the place. What it wants:
   hand-painted anime background art matte painting gouache, a harbour road in
   the rain at dusk, a tram stopped across the near lane with its lights on
   and its doors open, the dock wall and cranes on one side, low buildings on
   the other, wet road throwing the light back, 1950s, wide cinematic.

## The three things still to draw

1. **A harbour sea wall at low tide.** Slack Water is Episode Two's long
   full-party scene and there is no picture of it. What it wants: a wall going
   down to exposed rock and mud, black with weed to above head height, the
   water a long way out. The four `sea-fort` images are open-coast gun forts
   on cliffs, which is a different place entirely.
2. **The canteen, empty, at six in the morning, one hatch open.** Zero Six
   Hundred currently borrows the full, loud canteen picture. The contrast
   between the two is most of what that scene is doing.
3. **The civil defence instructor.** A woman, a serving NCO of eleven years,
   in uniform, the kind of person who makes a room repeat something back and
   is entirely unhurried about doing it again. Nothing in the portrait tray is
   close: the one uniformed woman reads about twenty.

Nothing else is blocked. Everything above is a nice-to-have that would improve
a scene, not a thing that stops a scene running.

## The method changed

`scene-backdrop-proposal.md` said "no classroom or school interior in 150
images" and called the school "the single biggest art gap in the two
episodes". That was wrong. There are at least four school interiors — a
classroom, a specimen room, a prep room and a gymnasium — and the reason the
proposal could not see them is that it was written from filenames. All four
are called `garsondee_hand-painted_anime_background_art_matte_painting_goua_`
plus a UUID.

Filenames in these trays describe the prompt, not the picture, and they have
now been wrong four times in this project: a portrait labelled
`NERV_administrator` is a junior technician in a lab coat, `sea-fort-01` is a
clifftop gun emplacement rather than a harbour wall, and two portraits labelled
`formal school portrait picture student` are a woman in her thirties and a man
of about seventy.

So `tools/casting/contact_sheet.py` exists now. It tiles a whole tray into one
labelled sheet so every candidate can actually be looked at:

```bash
python tools/casting/contact_sheet.py --intray
python tools/casting/contact_sheet.py --scenes --page 1
python tools/casting/contact_sheet.py --cast
```

Every assignment made on 2026-09-21 was made from one of those sheets, and the
ones that mattered were opened full size before being assigned.
