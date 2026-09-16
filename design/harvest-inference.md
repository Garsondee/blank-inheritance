# Harvest Inference

*Written 2026-09-09. How to turn a raw Foundry chat log into an educated guess about what actually
happened at the table — closing #42, and the reason the whole Foundry-integration bet pays off.*

---

## 1. Why this is the point of being this deep in Foundry

Ingram, 2026-09-09: *"a big reason for having all this involvement in Foundry is so that we can get
all the data we need to work out what happened from context clues."*

This is the correct framing and worth stating plainly: everything built so far — the scene runner,
the tick state, the session log, the harvest pull — is plumbing. **This is the payoff.** If the
inbound signal stays thin, the whole offline-writing model degrades into me confidently writing the
wrong campaign next chapter (see the assessment given earlier this session). This design is how it
doesn't.

**Not built yet.** `sync-harvest.mjs` already pulls `storage/` home, byte-verified. What is missing
is turning the raw chat log inside that pull into something worth reading.

---

## 2. Three signals, three confidence tiers

Foundry's chat log already contains almost everything needed. Nothing here requires new Foundry
mechanics — it requires reading what is already being written, which is exactly the kind of thing
`ux-doctrine.md` already names: *"the mechanical track carries a confidence marker... proximity
attribution for bare rolls at reduced confidence."* This design is that principle, applied to the
harvest rather than to the live log bar.

### Tier 1 — HIGH. Structured and unambiguous.

A real `@Check[...]` roll result: who rolled, against what DC, which degree of success. This is
already data, not inference — Foundry's own roll message carries actor, formula and total. Pair it
against the active scene brief's `challengeRef`/`checkRef` (known from tick state at the time) and
it becomes a direct match: *this beat's check happened, here is the degree.*

**Also tier 1: Ingram's own running commentary**, typed live via the existing GM log bar. A human
saying "that mattered" beats any inference this document can produce, and it should be treated as
ground truth rather than merged into the guesswork below.

### Tier 2 — MEDIUM. A roll with no scene context, or an unusual skill.

A roll happens with no active brief, or against a skill nothing in the current scene's `checks`
list expected. Two honest options, both correct depending on the roll:

- **Proximity attribution** — the nearest scene by wall-clock time is probably right, the same
  logic `ux-doctrine.md` already uses for the live log. Confidence stays MEDIUM; it is recorded as
  a guess, not asserted as fact.
- **Flag for Ingram.** Per his own instruction — *"the occasional unusual skill gets rolled, but you
  can ask me what that meant"* — an unexpected skill against no obvious target is exactly the case
  to surface as a question rather than force an inference. One line, asked once, after the session:
  *"Somebody rolled Survival at 9:41pm with no scene open. What was that?"*

### Tier 3 — LOW. Links posted in chat with no roll attached.

An `@Item`, `@UUID` or `@Actor` link appearing in chat is real evidence that something was on
someone's mind, and genuinely ambiguous about what they did with it. Ingram named this exactly:
*"you have to assume that these might be just discussing them or actually doing those things."*

**The rule: never silently resolve tier 3 either way.** A link becomes a candidate log entry with
no verb attached — *"the medic kit was referenced"* — not *"the medic kit was used"*. If it matters
enough to need the distinction (an artefact grant, a track move), it goes in the disambiguation
batch. If it doesn't, it is background colour and stays unresolved on purpose.

---

## 3. The disambiguation batch, not a running interruption

Every low- or medium-confidence item is collected into **one batch, asked once, after the session**
— never mid-play. Ingram is running a table; the harvest reads the record afterward. A typical batch
is short: a handful of unusual rolls, a handful of ambiguous links, nothing else.

Format: a short numbered list, each with just enough context to answer in one line — timestamp,
scene if known, the roll or link itself. Answers merge straight into the log at HIGH confidence,
because a human confirming beats every inference tier above it.

---

## 4. What it feeds

Every resolved item becomes a candidate entry for the **objectives tracker's log**
(`design/objectives.md`) — this is the mechanism that actually populates it from real play rather
than requiring the GM to remember to type things in live. A HIGH-confidence tier-1 match against a
brief's `checkRef` can also directly satisfy `runState.ticked`, closing the loop the scene runner
already tracks locally back to what really happened when the GM was away from the panel mid-fight.

Confidence tier travels with the entry. A LOW-confidence guess reads differently in an objective's
history than a confirmed fact, and both `design/objectives.md`'s log and any future write-up should
say so rather than flattening everything to the same certainty.

---

## 5. What this deliberately does not attempt

- **No sentiment analysis of ordinary chat.** Roleplay text is not parsed for meaning. The three
  signals above are structured (rolls) or explicit (links) on purpose — free text is what Ingram's
  own commentary and the private journals (`ideas/entries/player-and-gm-journals-context-ingestion.json`)
  are for, not something to infer over.
- **No auto-resolution of tier 3.** Stated twice because it is the one rule most likely to be
  "improved" into silent guessing later. Don't.

---

*Related: `ideas/entries/chat-log-knowledge-base.json` (#42); `design/objectives.md`;
`design/ux-doctrine.md` §10.2 (the four-source corpus, and the confidence-marker principle this
extends); `tools/module-sync/sync-harvest.mjs`.*
