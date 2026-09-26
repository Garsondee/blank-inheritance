# Sign-Off Report — {{TITLE}}

`{{SCENE_ID}}` · scene {{ORDER}} of {{TOTAL}} in play order · {{EPISODE_TITLE}}
Checklist v{{CHECKLIST_VERSION}} · opened {{DATE}} · status **{{STATUS}}**

<!-- This file is generated from tools/scene-signoff/report-template.md and then
     written into by hand, one pass at a time. Regions between signoff:auto
     markers are rewritten by `report.mjs --refresh`; everything else is prose
     and is never touched by the tool. -->

---

## Verdicts

<!-- signoff:auto:verdicts:start -->
{{VERDICT_TABLE}}
<!-- signoff:auto:verdicts:end -->

**Stopping rule in force:** two rounds of `FIX` per pass. On a third run through, every remaining
finding is either applied or dropped with a one-line reason, and the pass clears.

**Who may record which verdict.** `FIX`, `STOP` and `BLOCKED` are findings and I record them myself.
`CLEAR` is assent and only Ingram gives it, so a pass I believe is clear sits here unrecorded with my
proposed verdict stated in its own section until she answers. That is what makes the seal impossible
to reach alone rather than merely discouraged.

---

## ⟶ What I need from you

*Plain questions, never check ids. A review that names `P3` and stops has done the work and failed to
deliver it — a real correction from Ingram, 2026-09-22. If this section is empty, say so explicitly
rather than leaving it blank.*

{{ASKS}}

---

## 1. Comprehension — the scene as I would run it

*One flowing narration, start to finish, verbatim on everything said out loud. Verdict at the end.*

{{COMPREHENSION}}

---

## 2. Completeness — is anything missing

{{COMPLETENESS}}

### The mechanical half

<!-- signoff:auto:completeness:start -->
{{COMPLETENESS_TABLE}}
<!-- signoff:auto:completeness:end -->

---

## 3. Place — does this happen somewhere real

<!-- signoff:auto:place:start -->
{{PLACE_TABLE}}
<!-- signoff:auto:place:end -->

{{PLACE}}

---

## 4. Quality — is it good, and where is the best available improvement

*At most five findings, ranked by how much each would change what happens at the table. Obvious
fixes applied and shown as done; anything touching meaning, reveal timing or character proposed and
waiting. Then what I considered and judged fine, named.*

{{QUALITY}}

### The mechanical half

<!-- signoff:auto:quality:start -->
{{QUALITY_TABLE}}
<!-- signoff:auto:quality:end -->

---

## Changes applied to the scene

*Diffs, as done. Nothing here needs your approval — it was obvious, non-semantic, or you asked for it.*

{{APPLIED}}

---

## Consequence radar

<!-- signoff:auto:radar:start -->
{{RADAR}}
<!-- signoff:auto:radar:end -->

---

## Not applicable to this scene

*A check that cannot apply here is not answered, not passed and not waived. Inventing an answer is
noise; skipping one silently is indistinguishable from forgetting it.*

<!-- signoff:auto:na:start -->
{{NOT_APPLICABLE}}
<!-- signoff:auto:na:end -->
