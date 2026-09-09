# Encyclopaedia Checks

*Written 2026-09-09. A standing pattern, not a one-scene mechanic — "we should always be offering
the group" this kind of check.*

---

## 1. What it is

Ingram: *"we should always be offering the group what I'd call 'Encyclopaedia' checks just like
Disco Elysium where they can recall knowledge during lore scenes to get more background
information, explain something unusual in a scene, or provide players with insight they can use to
get better results in future scenes."*

Three jobs, all optional, all proactively offered rather than waited for:

1. **Background.** Fill in the world without a lecture.
2. **Explain the unusual.** The thing everyone just saw that has no obvious explanation.
3. **Set up future advantage.** Learning something now should sometimes be worth something later.

**The rule that makes this safe to use constantly: failure never costs anything mechanical.** No
lost slice, no lost artefact, no lost Standing. A wrong-but-plausible belief on a bad roll is fine
— often more interesting than a flat "you don't know" — but nothing real is ever on the table. This
is what lets a GM offer these freely without turning every scene into a gauntlet.

---

## 2. It is not a new mechanic — it is a real SF2E action, tagged

**Recall Knowledge is already a real action** (Player Core), and this campaign already has an
`insight`-shaped instance of it: `c1s1-the-medical.json`'s `what-a-screen-tests` check (Medicine or
Nature, "standard panels have no result called irregular") is already exactly this, just not
labelled. So is the Sensor Operator ground role's existing Recall Knowledge use against a Claimant
(`ideas/entries/automated-recall-knowledge-system.json`, #28) — narrower (combat-only, one
creature), but the same shape underneath. This document names the general pattern the narrow one
was always an instance of.

**`sf2e-common.schema.json`'s shared `check` def gained one field** (2026-09-09): `insight: boolean`.
Not a new schema, not a new resolution system — a tag on the check every scene already knows how to
author, so the panel can render it differently and a GM scanning a brief can see at a glance which
checks are safe to hand out freely.

**Grounded in real skills, not a bespoke "lore" stat.** Society, any Lore, Nature, Medicine,
Occultism, Arcana — whichever skill actually fits the fact in question, exactly like every other
check in this project. Never invent a knowledge skill that doesn't exist in SF2E.

---

## 3. Purpose 3 — insight that pays off later — uses machinery that already exists

No new field for this. `gmModifiers` (`scene-brief.schema.json`) already lets a check's outcome set
a bonus applied to a *different* check — the Head Height lens used exactly this shape for a hidden
penalty; the same field authors a hidden *bonus* just as easily. **The convention**: an `insight`
check's `criticalSuccess`/`success` outcome text should say what it sets up, and if it is meant to
move a number, a `gmModifiers` entry on the later check does the moving. Nothing to build — this is
an authoring pattern on top of a field that shipped weeks ago.

---

## 4. What the panel does with the tag

An `insight` check renders with its own stamp style — visually distinct from an ordinary action
check, so a GM scanning the beat list can see at a glance which checks are free to offer. Shipped
2026-09-09 (`.bi-runner__stamp--insight`).

**Not yet wired**: automatically logging a success to the objectives tracker's log (design doc
exists, panel doesn't yet — `design/objectives.md`, #135). When that ships, an `insight` success is
the natural, obvious source of a log entry, since "the party learned something" is precisely what
this tag already marks.

---

## 5. When to reach for one

Any scene with something unusual in it and nobody obligated to ask about it. Offer it, don't wait —
that is the "always offering" instruction. A scene with zero `insight` checks in it should be the
exception that needs a reason, not the default.

---

*Related: `data/challenges/c1s1-the-medical.json` (`what-a-screen-tests`, the pre-existing unlabelled
instance); `design/objectives.md`; `design/strategy-layer.md`; `ideas/entries/automated-recall-knowledge-system.json` (#28, the narrower combat-only case this generalises).*
