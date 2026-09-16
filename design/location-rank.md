# Location rank — how much process a place earns

**Status: accepted, 2026-09-12.** Requested directly: *"We need to start categorising buildings
that we've labelled by their importance to the plot. Literally a ranking. The more important a
building is the more passes of creation/editing/revising they need to go through to be considered
complete. The more back and forth we need to setup things correctly and the more strict you should
be about double checking with me narrative decisions made for those locations."*

`rank` is a field on `location.schema.json`. **1 is the most important.** Null means not yet ranked.

## Rank is not depth

They are two different questions and they are allowed to disagree.

| | asks | set by | enforced by |
|---|---|---|---|
| `depth` | How much has been **written**? | declared as a commission | `core/depth.py`, mechanically |
| `rank` | How much **process** does this earn? | judgement, informed by depth | this document, by Claude's behaviour |

A place seen once that the whole plot turns on is **rank 1, depth sketch**. A place the group
returns to constantly that carries no plot weight is **rank 4, depth standing**. Ranking by depth
alone would get both of those wrong.

Rank is *informed* by depth, though — a standing-depth location is rarely below rank 2, and a
named-depth one is rarely above rank 3. Where the default and the judgement disagree, the
judgement wins and the reason goes in `gmOnly`.

## The rungs

| Rank | | Passes before it counts as finished | How Claude must behave |
|---|---|---|---|
| **1** | **Pivotal** — the campaign turns on it | Three or more. Written, reviewed together, revised, re-read cold before it is called done. | **Check before committing.** No narrative decision about a rank 1 location gets made alone: names, history, what is hidden there, who runs it, what it means. Draft and ask, every time. |
| **2** | **Major** — a named recurring place with real consequence | Two. Written, then revised after Ingram has read it. | Decide routine texture alone; surface anything that would constrain a future session, tie into an antagonist, or answer an open question. |
| **3** | **Supporting** — a scene happens here | One pass, plus corrections. | Write it. Flag only genuine forks. |
| **4** | **Colour** — texture, walked past, mentioned | One pass. | Write it and move on. |
| **5** | **Background** — exists so the map is complete | One line, once. | Write it and move on. Do not gold-plate. |

## What "a pass" means

A pass is a complete read-and-rewrite with fresh eyes, not a tweak. For rank 1 and 2 the passes
are deliberately separated by a conversation: write → Ingram reads → revise against what he
actually said. Two passes done back to back by Claude in one sitting is **one** pass.

## Standing rule for rank 1

Anything at rank 1 is treated the way `data/campaign/open-questions.json` entries already are: the
creative calls belong to Ingram. Claude brings a best-shot draft and the reasoning behind it — per
the standing "bring a draft, don't punt" rule — and then waits. It does not quietly settle a rank 1
location's history, its secret, or its name and report that as done.

## Initial assignment, 2026-09-12

Seeded from depth and adjusted by judgement. Central Fortification is the anchor Ingram named.

| Rank | Locations |
|---|---|
| 1 | Central Fortification, The Rock |
| 2 | Deep Storage, The Erecting Shop, The Calibration Hall, The Plot Room, General Hospital |
| 3 | The Registry, The Proving Ground, The Works Canteen, The Telephone Exchange |
| 4 | the five `pc-adoptable` homes |

Everything else is unranked until it is looked at. Unranked is not rank 5 — it means nobody has
decided yet, and the review mode exists to work through exactly that list.

## Related

- [design/location-depth.md](location-depth.md) — the other axis, and the one enforced in code.
- [data/schema/location.schema.json](../data/schema/location.schema.json) — the field itself.
