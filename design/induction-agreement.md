# The Service Agreement — FORM 1-B, page 2 of the induction terminal

*Written 2026-09-25. Status: **drafted**. The page is built but switched off (world setting
"Service Agreement page", default off) until Ingram has read and graded the text.*

## What it is

The second page of the induction terminal (Episode 0, character creation). Before a player picks anything, the
Directorate hands them an agreement to sign: tens of thousands of words of dense, numbered legalese with a
scroll bar that shrinks to a sliver. Players do what everyone does with terms and conditions, and click I AGREE.
Buried in it are clauses the GM can call on later.

Ingram's brief, 2026-09-25:

> "We make the players sign a contract as the second page of the induction and we have you generate an agreement
> for them to sign which is massive, designed to be hard to read and which signs them up for things that aren't
> right or ethical. Nothing horrendous or too close to real world horror, but more that it's a gag where we flood
> them with too much to read so they click past it like most people do and we bury things in there that we can
> use later. We also do our best to make it so that the text can't be copied and pasted to try and counter
> attempts to put the text into an LLM to cheat the knowledge."

Her answers to the four follow-up questions, same day:

- **Hooks:** "All of the above and more. Leave some fairly open ended ones." (Messages monitored, samples kept and
  tested, likeness rights, prototype trials, plus more.)
- **Length:** absurdly long. The length is the joke.
- **Re-reading:** only at signing. Players see it once.
- **Refusal:** there is no way on without signing.

And: *"I'm serious about adding a note at the end which makes it clear that the above is just a joke, not a real
contract."* The document ends with a boxed OUT OF CHARACTER note saying exactly that. A test fails if it's
missing, moved, or reworded to say less.

## Where everything lives

| File | Ships? | What it is |
|---|---|---|
| `tools/induction-agreement/source.mjs` | No | The hand-written clauses, the generator's vocabulary, the hook list with GM notes, the joke note |
| `tools/induction-agreement/build.mjs` | No | Builds the document deterministically (one seeded PRNG) and writes both outputs |
| `module/blank-inheritance/assets/induction/agreement.dat` | **Yes** | The only copy a player's client sees: packed JSON (deflate, XOR keystream, base64) |
| `data/induction-agreement/agreement-gm.md` | No | **The GM copy**: the full text with clause numbers and the hook index. Not in `SYNCED_CAMPAIGN_DIRS`, so it never syncs |
| `module/blank-inheritance/scripts/core/agreement-codec.mjs` | Yes | Pack/unpack, shared by the build and the browser |
| `module/blank-inheritance/scripts/core/agreement-layout.mjs` | Yes | Word wrap, justification, virtual scrolling; pure and tested |
| `module/blank-inheritance/scripts/foundry/induction-agreement-view.mjs` | Yes | Draws the text on a canvas and blocks copying |
| `module/blank-inheritance/templates/induction/page1b-agreement.hbs` | Yes | The page: no agreement text in it at all |
| `module/blank-inheritance/styles/bi-agreement.css` | Yes | "Security paper" background, no text selection |

Rebuild after any change to the source: `node tools/induction-agreement/build.mjs`. The test
`test/tier1-induction-agreement.test.mjs` fails if either output is stale.

## How the hooks are meant to be used

The GM copy's hook index gives each buried clause's number and what it's for. The short version:

- **Planted payoffs:** message monitoring (the Chapter 8 reveal; pairs with Intake Medicals' form 12b), samples
  kept and tested "for matching the Recruit to Machines" (the Gen 2 DNA reveal, without saying what the tests find),
  likeness rights and "the official portraits of the Founders are accurate likenesses" (the sanitised portraits;
  Shucks the skeleton; the gnoll statue), prototype trials (Hyuck), approved accounts (the official line),
  reassignment to sections that "cannot be discussed" (Section Nine and Rand), no talking to the police (LEDGER #35),
  found property becomes Directorate property, damage deducted from the allowance, no feeding strays (the stray).
- **Open-ended, for later invention:** a sealed envelope not to be opened until instructed; custody of items
  nobody told them about; one favour, called in by anyone; Form 7-V visitors at any hour; Form 9-F, confirming
  something has been forgotten; Annex Q, blank and "agreed now"; variation by announcement in an emergency; Board of
  Review findings accepted in advance; a working name the Directorate can change.
- **The biscuit.** Deep in the middle, any Recruit who has read that far is owed one biscuit, on a form that
  isn't available. If a player ever asks for it, honour it.
- **The appearance warranty** ("the Recruit is, in every material respect, what the Recruit appears to be") puts
  every disguised character in breach from the moment they sign. It's for comedy and the Gen 2 reveal. **Never use it
  to push a player to reveal a character's true form**: that reveal belongs to the player, always
  (`design/induction.md` §2).

## Rules the text keeps (tested)

- Nothing reveals what the table shouldn't know yet: no Watcher, no ships, no charter, no finale, no Gap, nothing
  about what the blood tests find (Sign-Off Q18; `feedback_no_scene_contamination`).
- No outside references (no real places, works or decades) and no denials of things that exist (the "pink
  elephant" rule). An early draft listed "conscription" among the things enrolment isn't; that went.
- Bureaucratic overreach and comedy only. Nothing horrendous.
- Every hook is buried: never in the first two clauses of its Article, never before Article 5.

## Anti-copying, and its limits

The text never exists in the page's DOM. It's drawn onto a canvas one screenful at a time, so there's nothing to
select, and Ctrl+C / Ctrl+A / right-click / drag are blocked inside the page. The file on the server is packed, so
"open the module file and paste it into a chatbot" doesn't work either. The "security paper" background (fine
guilloche lines that scroll with the text) is period furniture that also makes a screenshot harder to OCR.

**It is a best effort, not a guarantee.** A determined player can screenshot and OCR it, or reverse the packing
from the module's own JavaScript. Ingram's own standing view covers that: players who hack the files to find
things are cheating themselves.

Zoom is never blocked (the − / + buttons, Ctrl+wheel, Ctrl+plus/minus). "Hard to read" means long and dense,
never unreadable for a player who needs larger type.

## What the page records

On signing, the terminal records when the player signed, how many seconds they spent on the page, and how far down
they scrolled (0 to 1). These go onto the new Actor as `flags.blank-inheritance.agreement`, so an NPC can later
remark that someone signed it in four seconds. It's a small in-fiction joke about the campaign's own theme
(surveillance), and records nothing about the player beyond what they did on this page.
