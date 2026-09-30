# The Approvals Desk

*Written 2026-09-18, from Ingram's brief. Extended the same day, second message, with the priority
model corrected and two open risks resolved into decisions. The GM-side inbox: one surface where
drafted content is read, graded, and cleared for live use. Nothing I write may be built on, shown to
a player, or pushed to the server until it has been through here.*

Ingram's brief, quoted because it contains the two decisions this document is built on:

> "I need, in Foundry, an email inbox but unlike the players my inbox would be all about giving the
> sign off for scenes and story beats and things like that. If you gave me a list to work through
> then I could move content from drafted to live. **You could only produce 'drafted' content and I
> could only make it live by reading through it and giving it the thumbs up.** Maybe I could
> **promote it to different status depending on if it's perfect or if it's good enough to continue
> building upon** or things like that. We'd need to make it into a productive efficient interface
> UI / UX for getting me through the task of clearing things for being live as effectively as
> possible."

**Three things settled in a follow-up message, same day, quoted in full because each one changes
the design rather than just confirming it:**

> "1.) You have full permission to write and change anything you want at all times. You try to
> defend well written content that we think is working from accidental edits. For things which are
> clearly drafts and less important you take simple logical leaps and try to flesh it out carefully.
> If in doubt, you just ask me and I'll give you my preferences. The goal here is for me to be able
> to have a process to check things before sessions, which means that I'll be giving my approval to
> things based entirely on the order that the group will encounter them. If we can make the UX
> prioritise things which are going to be immediately important to the next session and then work
> forwards that is by far the best way to maximise my time and my efforts. Why should I have to sign
> off on a location for bunker #153 when we haven't even decided to include that bunker location in
> anything story related. Why should I have to read an NPC when that NPC isn't part of the story
> yet?
>
> 2.) We make the Approvals Desk in Foundry VTT the final word in what is considered approved. The
> gazetteer is a tool for drawing shapes and drafting things, this interface needs to be the place
> for reading, editing and approving content.
>
> 3.) You've identified lots of systems pulling in different directions. How can we fix that? How
> can we burn it into memory? How can we change this project so that this can't happen again? The
> core of this is the foundry module, how can we make sure that offline tools and the foundry module
> always stay in step with each other and don't fight each other?"

§1 below is corrected to match point 1 — the original draft used a generic dependency/"blast radius"
sort, which was the wrong axis. §7's "two authorities" risk is resolved by point 2, not just
flagged, and §9 is new, written for point 3 and cross-referenced with `design/data-ownership.md`,
the general mechanism this whole project needs, not just this one queue.

---

## 1. The finding that decides the design

**A version of this already exists, for one content type, and it has never cleared a single item.**

`data/schema/location.schema.json` has carried `authoring.status: needs-lore | drafted | approved`
since the gazetteer work. `tools/gazetteer/` (since retired, design/location-editor.md §10 phase 6) had a built review mode: a filterable list, a form
showing the lore fields, a "still owes" depth check, and an Approve button wired to
`POST /api/location/<id>/approve` — the one endpoint in that server permitted to write the value,
with every other write path (promotion, normal edit, mass-edit-by-instruction) refusing it loudly
rather than accepting it as a side effect. The rule is already written into the code, dated
2026-09-13: *approval is Ingram's own seal, never a side effect of a normal write.*

The counts across `data/locations/` as of today:

| status | files |
|---|---|
| `drafted` | 210 |
| `needs-lore` | 22 |
| `approved` | **0** |

The mechanism is not the problem. The mechanism is correct and is worth generalising verbatim.
**The problem is that a review *mode* — a place you go, containing everything, sorted by nothing in
particular — is a place you never go.** 232 items with no ordering and no stated consequence is not
a task, it is a wall.

So the design has one load-bearing consequence, stated before anything else — corrected 2026-09-18
from an earlier draft of this document that had the right instinct (demand-driven, not
supply-driven) but the wrong axis (a generic dependency graph). Ingram's own correction is sharper
and is the actual rule:

> **The Desk orders and gates entirely on play sequence — the order the group will actually
> encounter things — never on a generic notion of "what depends on what." "I'll be giving my
> approval to things based entirely on the order that the group will encounter them... why should I
> have to sign off on a location for bunker #153 when we haven't even decided to include that bunker
> location in anything story related. Why should I have to read an NPC when that NPC isn't part of
> the story yet?"**

This is stricter than plain "demand-driven" and it matters which one gets built. A dependency-graph
version would still show bunker #153 the moment anything merely *referenced* it — a passing mention,
a speculative link, an idea file. Ingram's version is narrower and correct: **nothing enters the
queue until it is actually part of a scheduled beat** — cast into an episode's scene, named in an
encounter that scene runs, or otherwise committed to something the table will actually sit down to.
Being referenced, linked, or drafted "nearby" does not count. An unscheduled location or NPC does
not wait in a low-priority tier at the bottom of the Desk either — **it is not in the Desk at all**,
exactly as an inbox has no entry for an email nobody sent yet.

The practical ordering, in order:

1. **What the very next session needs.** If Episode Two's opening scene is drafted, everything it
   casts (its location, its NPCs, its encounter) is the top of the queue, full stop.
2. **What a session after that already commits to**, once it exists in draft — further out, lower
   urgency, but real once an episode file names it.
3. **Nothing else.** Not "nice to review eventually," not "referenced somewhere," not sorted by
   volume or blast radius. If it is not on a scene list, it does not appear.

Most of those 210 locations are back-alleys and sheds no session has scheduled a visit to. Reviewing
them is not work that was skipped; under this rule it may never become work at all, for locations
that never end up on-camera. The six places Episode One actually walks through are a different
matter, and they are a twenty-minute job. A Desk that opens on "Episode One needs these 6, in the
order the party will reach them" gets cleared. A Desk that opens on "210 unread," or even a smarter
"210 sorted by how many things reference them," reproduces the gazetteer's dead review mode with
better math.

Everything below follows from that.

---

## 2. Status is a permission, not a score

Ingram asked for graded promotion — "perfect" versus "good enough to continue building upon". That
distinction is the strongest idea in the brief and it generalises cleanly, because each grade can
be made to answer exactly one question:

> **What am I now allowed to do with this?**

This is the same framing `design/ux-doctrine.md` uses for the whole system (SF2E is a permissions
game), and it makes every grade checkable in code rather than a matter of taste.

### The ladder

| Status | Means | Grants |
|---|---|---|
| `drafted` | I wrote it. Nobody has read it. | **Nothing.** Not citable as canon, not syncable, not shown to a player. |
| `sound` | Read. The substance is right. | **Build on it and cite it.** Other content may now depend on it. The prose is still open to rewriting. |
| `final` | Read. The words themselves are right. | **Put it in front of players verbatim.** Read aloud, displayed, printed. |

And two outcomes that are not promotions but matter just as much:

| Action | Does |
|---|---|
| `changes` | Returns the item to `drafted` and files a one-line note as an instruction to me. This is what makes the Desk a loop instead of a gate. |
| `cut` | Kills the item. Not a failure — a decision. **It must cost one keystroke**, because the ability to kill something cheaply is what makes reviewing a large queue survivable. |

### Why the two-grade split is real and not decoration

`sound` and `final` are not "7/10" and "10/10". They correspond to two genuinely different reading
tasks, which is why they deserve separate passes:

- **`sound` is a skim for correctness.** Does this contradict the bible? Is this NPC's want legible?
  Does this location's function make sense next to its neighbours? Fast, batchable, twenty items in
  twenty minutes, keyboard-only.
- **`final` is a proofread.** Does this read well out loud? Is the register right? Is there a
  clumsy sentence a player will trip on? Slow, one item at a time, and it needs the item rendered
  the way it will actually be encountered.

**Most content only ever needs `sound`.** A GM-facing location summary, an encounter's participant
list, a subsystem's thresholds — nobody reads those aloud. `final` is reserved for the small subset
of text that reaches a player as written: a scene's read-aloud, an Encyclopaedia-check reveal, an
NPC's dialogue lines, a correspondence reply. Keeping `final` rare is what keeps the workload
honest, and a `sound` item is never nagging for promotion — it is finished unless something needs
its exact words.

**`sound` must stay cheap and must stay honest about what it claims.** It says *build on this*. It
does not say *this is good*. If it ever comes to mean "approved," it will start being withheld, and
a withheld `sound` blocks me completely.

### The vocabulary change is free right now

Zero files carry `approved`. The location schema's three values can be replaced with the ladder
above at no migration cost whatsoever, and `needs-lore` survives as a real fourth state meaning
*promoted with a note but not yet written* — which is a queue pointed at me, not at Ingram, and
belongs in §6's out-tray rather than the in-tray. **This is the cheapest this change will ever be.**

---

## 3. Enforcement by construction, not by discipline

Ingram: *"You could only produce 'drafted' content and I could only make it live."* That is a hard
constraint, and a hard constraint that lives in a comment is a constraint that survives until the
next tired edit forgets it — which, per the gazetteer server's own note, is exactly how `approved`
once got into its review editor unguarded.

Three enforcement points, all of them testable:

**1. One promotion path, guarded.** Exactly one function may raise a status, and it requires a human
action taken in the Desk. Every generator, every authoring script, every sync path, every bulk edit
refuses `sound`/`final` with an error rather than silently downgrading — loudly, so a caller that
typed it learns it did nothing instead of wondering later why the approval never stuck. This is the
gazetteer's existing rule, lifted unchanged and applied to every entity type.

**2. A test that walks every write path.** Per the standing rule that every feature ships with a
test: a test that enumerates the repo's writers and asserts none of them can emit a promoted status.
A second test asserts the Desk's own path can, and that it records who and when.

**3. `drafted` must actually withhold something.** A status that gates nothing is a label. So:

- `tools/module-sync/` and `sync.mjs` refuse to push drafted content to the live world. There is
  already a real/placeholder gate there (`REAL_NPC_PATHS`, `TOKEN_IMAGE_BY_ID`) — this extends an
  existing pattern rather than inventing one.
- The Scene Runner will not cue a drafted scene without an explicit, visible override.
- **I may not cite drafted content as established canon when writing the next thing.** This one is
  a rule for me rather than for the code, but it is partially enforceable: the Desk shows, on each
  item, which other items depend on it, and flags any dependency that is itself still drafted.

### The escape hatch, because a hard gate would stall everything

If nothing may be built on `drafted` and Ingram is busy for a week, I stop. That is a worse failure
than the one the gate prevents. So: **I may build on drafted content provided the dependent thing is
also drafted and the dependency is recorded.** A rejection then cascades visibly — bounce the
foundation and everything standing on it lights up in the Desk — instead of unreviewed material
quietly hardening into canon. Nothing reaches `sound` on top of a `drafted` foundation.

---

## 4. What the Desk actually shows

**Rendered in costume, never as a diff.** A JSON field list is unreadable at volume and hides
exactly the faults `final` is meant to catch. Each item is presented as it will be met:

| Item | Rendered as |
|---|---|
| Location | its Encyclopaedia-check reveal card |
| NPC | the Character Card from `design/npc-social-intel.md` |
| Scene | the Scene Runner's own beat view |
| Encounter | the participant list with its XP budget resolved |
| Correspondence reply | the in-fiction comms device |

`design/ux-doctrine.md` §7b already decides the registers — Frame scale in GLASS, personnel in PAPER
— and the Desk uses them, so a thing approved as `final` was read in the typeface it will be read in.

**Each item carries three things above the content**, and they are the reason this is not an email
client:

1. **Which scheduled beat it belongs to, and when the table reaches it.** "Episode Two, opening
   scene." Sort order is play sequence — the order the group will actually encounter it — never a
   generic dependency count. This is also the inclusion test, not just the sort: nothing without an
   answer to this question is on the Desk at all.
2. **What it depends on**, with any still-drafted dependency flagged — a safety check ("this stands
   on something unread"), not a second ordering axis. Dependency never promotes an item into the
   queue by itself; only a scheduled beat does that.
3. **What I was unsure about.** A drafted item may carry my own note — *I invented a surname here* —
   pointing attention at the part most likely to be wrong.
   This is cheap for me to write and is the single highest-value thing on the card.

---

## 5. Throughput: the specific things that make 200 items clearable

The brief's actual ask was efficiency, so these are commitments, not nice-to-haves.

- **Keyboard only, one hand.** `J`/`K` move, `S` sound, `F` final, `C` changes (opens a one-line
  note — the same interaction as the log bar, which Ingram already has in her fingers), `X` cut,
  `U` undo. No confirmation dialogs anywhere: **undo is what makes no-confirmation safe**, and a
  confirm step on a 200-item pass is 200 wasted keystrokes.
- **One item on screen, fully rendered.** Not a list with a preview pane to scroll. The Scene
  Runner already took this correction — it "opens on the running order instead of below two screens
  of it."
- **Shifts, not a firehose.** A shift is a bounded set with a visible end: one dependency cluster,
  or ten to twenty items. Finishing a shift is a completion. There is no infinite pile in view.
- **Machine-proposed batches, never blind select-all.** The Desk may offer *"these 14 unranked
  alleys are all under 60 words and all pass their depth check — sound, as a batch?"* Ingram
  approving fourteen things she glanced at is legitimate; the UI should not pretend otherwise, so a
  batch approval is **recorded as a batch**, and a problem traced back later can see it was a sweep
  rather than a read.
- **The counter is honest and small.** The top line is always *what this unblocks*, never *how much
  is left*. "6 items — clearing these unblocks Episode Two drafting" is a task. "210 unread" is a wall.

---

## 6. One desk, two trays — and no new storage bin

There is a standing crisis about data fragmentation in this repo, so this matters: **the Desk adds
no new store.** The status lives on the entity, in the `authoring` block locations already have,
promoted into a shared `$def` that every entity schema references. The Desk is a *view*, computed by
scanning `data/`.

It also unifies something that has been independently reinvented **six times**:

| Existing queue | Vocabulary | Direction | State |
|---|---|---|---|
| `location.authoring.status` | `needs-lore / drafted / approved` | me → Ingram | built, 0/232 cleared |
| `data/audio/review.json` | `proposed / confirmed / rejected` | me → Ingram | store exists, **UI deliberately unbuilt** (#163) |
| `asset-review-pipeline` idea | AI proposes, human confirms | me → Ingram | `accepted`, unbuilt |
| `data/campaign/lore-instructions.json` | `pending / done / needs-clarification` | **Ingram → me** | built, one test row |
| `data/map/gazetteer-requests.json` | `open / resolved` | me → Ingram (gaps) | built, empty |
| `data/campaign/open-questions.json` | `open / resolved` | Ingram's creative calls | in use |

Six shapes, six vocabularies, none aware of the others. This is the fragmentation crisis in
miniature, and the Desk's real value is less the new UI than **making that one pattern instead of
six.**

The shape that falls out is a desk with two trays:

- **In-tray — things waiting on Ingram.** Drafted content, audio classifications, asset
  confirmations, and `open-questions.json`'s unanswered creative calls. All of it is the same
  gesture: read a thing, grade it, move on.
- **Out-tray — things waiting on me.** `lore-instructions.json`, `gazetteer-requests.json`,
  `needs-lore` items, and every `changes` bounce. A bounce does not need a new store: it files an
  instruction into `lore-instructions.json`, which is already exactly "a thing for Claude to do,
  with a status." That is a consolidation rather than an addition.

Both directions on one surface, with a count on each. **Approval is also what makes something
eligible for sync**, so the sync dialog gains a line — *3 newly-approved items ready to push* —
which is the step that turns "approved" into Ingram's actual word, "live."

One pleasing alignment worth naming, since `design/visual-identity.md` locks the look to 1950s
military-tech: an approvals desk with an in-tray, an out-tray and a countersignature is exactly
what a Directorate office would have on it. The same alignment the doctrine already noticed about
the player journals — in a campaign about an organisation that reads your file, the tooling that
reads your file is thematically correct.

---

## 7. Red team

Written against my own proposal, per the standing create → analyse → critique → evolve workflow.

**The Desk becomes the bottleneck and everything stalls.** Mitigated by §3's escape hatch and by
`sound` being deliberately cheap, but the residual risk is real and should be watched: if a week
passes with a non-empty in-tray, the answer is to shrink what enters it, not to relax the gate.

**The grades get gamed.** Everything gets marked `sound` to clear the queue and `sound` comes to
mean nothing. The defence is that `sound` is honest — it claims *build on this*, not *this is good*
— so marking it is never a lie. The failure mode to watch for is `final` creeping onto things
nobody reads aloud.

**The 0/232 might not be a UI problem at all.** Possibly reviewing 232 locations was never worth
doing, in which case a better inbox fixes nothing. §1 concedes this outright and builds the answer
in: demand-driven intake is the fix, and it is the part that must ship first. **A Desk built without
it is just the gazetteer's review mode again.**

**Two authorities for the same seal — RESOLVED 2026-09-18, no longer a risk.** Ingram decided
directly: *"We make the Approvals Desk in Foundry VTT the final word in what is considered approved.
The gazetteer is a tool for drawing shapes and drafting things, this interface needs to be the place
for reading, editing and approving content."* The gazetteer's `/api/location/<id>/approve` endpoint
is retired as of the same date — it now refuses unconditionally (410, not 404: the route existed and
is gone, not merely unmatched), its Approve button is disabled with a tooltip pointing at this
decision, and both halves are covered by `test/gazetteer/test_server.py`'s
`test_the_dedicated_endpoint_is_retired_and_refuses_unconditionally` and
`test_the_retired_endpoint_refuses_even_an_unknown_location`. The gazetteer keeps its real drafting
work — rank, depth, note, lore fields, geometry — none of which is approval. **This is worth reading
as the general case, not a one-off:** the same failure (a second tool quietly gaining write access
to a field another tool already owns) is the subject of §9 and `design/data-ownership.md`.

**Scope.** This touches every entity schema, the sync gate, the Scene Runner, and four existing
queues. It is not a weekend. The staging in §8 exists so the useful half lands early.

---

## 8. Staging

The order matters; items 1–3 are useful on their own even if nothing after them is built.

1. **The vocabulary and the schema `$def`**, applied to every entity type, with the location
   migration. Free today; not free later.
2. **The guarded promotion path and its tests** — nothing can promote except the one path.
3. **The gates** — sync refuses drafted, the Scene Runner refuses drafted, dependencies recorded.
4. **The play-sequence queue** — compute what the next scheduled beats actually cast, in the order
   the table reaches them; nothing else enters. Ships before any UI, and is testable without one.
5. **The Desk UI in Foundry** — keyboard-first, one item, rendered in costume, shifts.
6. **The bounce loop and the out-tray** — `changes` files an instruction; both trays on one surface.
7. **Subsume the remaining existing surfaces** — audio review, asset review. The gazetteer's own
   piece of this (its Approve button) is already done — see §7.

---

## 9. The general fix, not just this queue's fix

Ingram's third point asked something bigger than this document: *"You've identified lots of systems
pulling in different directions. How can we fix that? How can we burn it into memory? How can we
change this project so that this can't happen again?"*

The Desk is one instance of a pattern that has now shown up twice in one afternoon — first as **six
independently-invented review queues** (§6), then as **the gazetteer and the Desk both reaching for
the same approval seal** (§7). Both are the identical failure: a field with more than one system
willing to write it, and no standing rule saying which one is allowed to.

**The fix is not specific to approval status, and does not belong only in this document.** It is
written up as its own standing policy at `design/data-ownership.md`: every field, in every schema,
declares exactly one system as its writer, and a repo-wide test (not a comment, not a docstring — a
test, because a comment is exactly what already failed once on this project, per §3 and §7's own
citations) walks every known writer in the codebase and fails if two of them can touch the same
declared-owned field. `design/foundry-module-design.md` §4's existing `authored / promotable /
runtime` field taxonomy gets a fourth member, `lifecycle`, for exactly the shape this field has:
the repo may only ever write the baseline (`drafted`), one specific system is the sole legal writer
of every value above it, and harvest between them is mandatory and one-directional rather than the
optional GM-judgment merge `promotable` fields get — because there is no real conflict case to
adjudicate when only one side is allowed to write.

That document is the actual answer to "burn it into memory": a rule stated once, in the one place
new schema work already has to look (`data/schema/` is read before any new field is added, per
CLAUDE.md's own schema-architecture section), enforced by a test rather than trusted to be
remembered. This document's own status field is the first field written under that rule, and the
gazetteer retirement in §7 is the first violation the rule would have caught in code review rather
than in a live decision.

---

## 10. Status of this document

**A proposal, not a decision** for everything except the two points Ingram settled directly in her
2026-09-18 follow-up, which this revision folds in as decided: the play-sequence ordering/inclusion
rule (§1, §4) and the Foundry Desk's sole authority over approval, with the gazetteer's matching
piece already shipped (§7). Still open and still her call: the exact status vocabulary
(`sound`/`final`), the consolidation of the six queues into two trays, and everything in §8 not yet
built. Tracked in GitHub as an epic; see §8 for the staging the sub-issues follow, and the new issue
tracking §9's general mechanism separately, since it is bigger than this one feature.

*(Since built: epic #165 and its sub-issues #166–#172 were all closed by 2026-09-20, with the Desk in
`module/blank-inheritance/scripts/foundry/approvals-desk.mjs`. A scene's own final gate is now the
Sign-Off, `design/scene-signoff.md`.)*
