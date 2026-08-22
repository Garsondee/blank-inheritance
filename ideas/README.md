# Ideas

A tracking system for everything that isn't settled design yet — proposals, half-formed mechanics, tooling wishlist items, technical directions being weighed. Built because the volume of ideas coming out of planning sessions was starting to outpace what prose design docs (`design/campaign-arc.md` and friends) can hold without turning into a wall nobody can navigate or update cleanly.

**This is not campaign data** (that's `data/`) **and it's not settled design** (that's `design/`). It's the layer in between: things that have been said out loud and are worth keeping, at whatever stage of commitment they're actually at.

## Why this exists, not just more markdown

Plain files, one idea per file, both of us can open and edit any of them directly — no tool required to read or change this system, same principle as everything else in this project. The thing prose docs don't give you that this does: a real status per idea, so "we're doing this" (`accepted`), "someone floated this, not decided" (`new`), "we talked about it and passed" (`rejected`), and "yes and we built it" (`done`) are all distinguishable at a glance instead of being flattened into one undifferentiated pile of paragraphs.

## Structure

One JSON file per idea in `ideas/entries/`, filename = `id`, schema at `ideas/schema/idea.schema.json`. No index file to maintain — the directory listing is the index, same convention as `data/npcs/`, `data/episodes/`, etc.

## Status meanings

| Status | Means |
|---|---|
| `new` | Captured, not yet reviewed or reacted to. |
| `wishlist` | Reviewed, liked, deliberately not prioritized yet. Different from `new` — this one's been seen. |
| `accepted` | We're doing this. The *how* might be completely undesigned, but the *whether* is settled. |
| `in-progress` | Actively being built right now. |
| `done` | Shipped. `resolution` says what got built and where to find it. |
| `rejected` | Explicitly decided against. `resolution` says why — this is what stops the same idea getting re-proposed from scratch in six months. |

## Staleness — reviewed, never auto-removed

Every idea carries `lastTouchedDate`. Nothing here ever gets silently deleted or downgraded by an automated process — that would violate the whole point of a system both of us are supposed to have full control over. Instead: periodically (worth doing as part of any session that's touching this directory anyway, not on a fixed schedule), scan for ideas whose `lastTouchedDate` is old relative to how active the project is at the time, and surface them explicitly for a real decision — promote to `accepted`, downgrade to `wishlist`, or `reject` with a reason. The scan is a prompt for a human decision, never the decision itself.

## Working with this

- New idea from a conversation → new file in `ideas/entries/`, `capturedDate` and `lastTouchedDate` both set to today, `status` set honestly (don't default everything to `new` — if the user said "we're doing this," that's `accepted`; if they floated it as a maybe, that's genuinely `new` or `wishlist`).
- Revisiting an idea → update `lastTouchedDate`, and `status`/`resolution` if either changed.
- An idea that grows into something big enough to need its own design doc → keep the idea entry (mark `in-progress` or `done` with a `resolution` pointing at the new doc), don't delete it — it's the provenance record.
- An idea whose `openSubQuestions` grows into a real campaign-design decision (not just an implementation detail) → promote that question into `data/campaign/open-questions.json` instead, and reference it from the idea via `relatedRefs`.
