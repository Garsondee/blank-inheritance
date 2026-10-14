/**
 * The Approvals Desk's two non-promoting outcomes (design/approvals-desk.md
 * §2/§6, issue #171) and the out-tray they feed. Pure: no Foundry globals,
 * no filesystem -- callers hand in already-loaded JSON and get back either
 * an updated entity or an updated lore-instructions.json document; writing
 * the result to disk is the adapter's job, same split as promote.mjs.
 *
 * "A gate that can only say yes is a gate that gets ignored." `changes`
 * bounces an item back to drafted with a note filed as a real instruction to
 * Claude -- reusing lore-instructions.json rather than inventing a fourth
 * store, per the issue's own explicit instruction (design-ownership.md §6's
 * "one pattern instead of six"). `cut` kills an item in one keystroke,
 * recorded rather than vanished -- the same shape data/audio/review.json
 * already uses for "rejected".
 */

import { CLEARED_STATUSES } from "./promote.mjs";

/**
 * `changes`: files a one-line note into a lore-instructions.json document as
 * a real, trackable instruction -- NOT a new store (issue #171's own
 * explicit constraint). `entityType` is optional context (an NPC id and a
 * challenge id could collide in principle) so a later reader isn't left
 * guessing which data/ subdirectory to look in.
 *
 * Pure: takes the CURRENT parsed lore-instructions.json content, returns
 * `{ document, entry }` -- the updated document (exactly one more entry,
 * appended, nothing else touched) and the entry itself. Does not touch the
 * bounced entity's own `authoring.status` at all: it was already `drafted`
 * (the Desk's queue never shows anything else), so "returns the item to
 * drafted" is true by construction, not something this function needs to do.
 */
export function fileChangesInstruction(loreInstructionsDoc, { entityId, entityType = null, text, gradedBy, now }) {
  if (!entityId) throw new Error("fileChangesInstruction requires entityId");
  if (!text) throw new Error("fileChangesInstruction requires text -- a bounce with no reason isn't a loop, it's a shrug");

  const existing = loreInstructionsDoc?.instructions ?? [];
  let highest = 0;
  for (const instr of existing) {
    const digits = String(instr.id ?? "").replace(/[^0-9]/g, "");
    if (digits) highest = Math.max(highest, Number(digits));
  }

  const entry = {
    id: `instr-${highest + 1}`,
    documentId: entityId,
    entityType,
    text,
    status: "pending",
    raisedAt: now ?? new Date().toISOString(),
    resolvedAt: null,
    resolution: null,
    raisedBy: gradedBy ?? null,
    source: "approvals-desk"
  };

  return { document: { ...loreInstructionsDoc, instructions: [...existing, entry] }, entry };
}

/**
 * `cut`: the entity's terminal, recorded "no" -- not a failure, a decision
 * (design/approvals-desk.md §2). Refuses to cut something already cleared
 * (CLEARED_STATUSES: sound/final, or a scene the Sign-Off sealed live -- that
 * is a demotion, a different and much rarer action this project has not asked
 * for yet) or something with no authoring block to begin with.
 */
export function cutItem(entity, { gradedBy, note = null } = {}) {
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) {
    throw new Error("cutItem() needs the entity object itself, not an id, a path, or an array");
  }
  if (!entity.authoring || typeof entity.authoring !== "object") {
    throw new Error(`entity "${entity.id ?? "(no id)"}" has no authoring block -- nothing to cut`);
  }
  if (CLEARED_STATUSES.includes(entity.authoring.status)) {
    throw new Error(
      `cutItem() refused: "${entity.id ?? "(no id)"}" is already "${entity.authoring.status}" -- ` +
      `demoting reviewed content is a different, rarer action this project has not built yet`
    );
  }
  if (!gradedBy) {
    throw new Error("cutItem() requires gradedBy -- who is deciding this, named rather than assumed (design/data-ownership.md §4)");
  }

  const nextAuthoring = { ...entity.authoring, status: "cut", gradedAt: new Date().toISOString().slice(0, 10), gradedBy };
  if (note !== null) nextAuthoring.note = note;
  return { ...entity, authoring: nextAuthoring };
}

/**
 * The out-tray: everything waiting on CLAUDE rather than on Ingram (design/
 * approvals-desk.md §6) -- the same surface as the in-tray queue, counted
 * separately, because "what is waiting on me, and what is waiting on him" is
 * one question. Every `changes` bounce lands in `pendingInstructions`
 * (fileChangesInstruction above writes into the same store), so it is not a
 * fifth category alongside the other three -- counting pending instructions
 * once already covers it.
 *
 * `openQuestions`/`audioLibrary`+`audioReview` (issue #172) are a DIFFERENT
 * direction -- design/approvals-desk.md §6's own table lists these under the
 * IN-tray (waiting on INGRAM, his own creative/classification calls), not
 * the out-tray -- but neither fits the graded S/F/C/X queue either (an open
 * question is "read-only... a real decision, not a keystroke," per the
 * issue's own words). Kept as separately-named fields rather than folded
 * into `total`/the out-tray categories above, so the direction stays honest
 * in the data even though the adapter shows both on the same toggled screen
 * (the issue's real point -- "unify the pattern, not the payload"; one
 * screen, not one undifferentiated pile).
 *
 * Audio's count is computed against the FULL library, not just
 * review.json's own decisions map: that schema's own rule is "an asset with
 * no entry is proposed", so counting only explicit "proposed" entries would
 * under-report -- as of 2026-09-19 review.json has zero explicit decisions
 * at all despite 398 real assets, and reporting "0 unreviewed" would be
 * actively misleading, not just incomplete (design/approvals-desk.md §5:
 * "the counter is honest").
 */
export function computeOutTray({ loreInstructions, gazetteerRequests, allEntitiesById = {}, openQuestions, openDecisions, audioLibrary, audioReview } = {}) {
  const pendingInstructions = (loreInstructions?.instructions ?? []).filter((i) => i.status === "pending");
  const openGazetteerRequests = (gazetteerRequests?.requests ?? []).filter((r) => r.status === "open");
  const needsLoreItems = Object.values(allEntitiesById).filter((e) => e?.authoring?.status === "needs-lore");

  // Her creative calls: the design questions still open, plus every open fact in canon (open-decisions.json, generated
  // from canon: the story's own decisions, which the plot timeline answers; D079).
  const openCreativeQuestions = [...(openQuestions?.questions ?? []), ...(openDecisions?.questions ?? [])].filter((q) => q.status === "open");

  const decisions = audioReview?.decisions ?? {};
  const unreviewedAudio = (audioLibrary?.assets ?? []).filter((asset) => (decisions[asset.id]?.status ?? "proposed") === "proposed");

  return {
    pendingInstructions,
    openGazetteerRequests,
    needsLoreItems,
    total: pendingInstructions.length + openGazetteerRequests.length + needsLoreItems.length,
    openCreativeQuestions,
    unreviewedAudio
  };
}

/** Whether a specific bounce, once resolved (status no longer "pending"), has genuinely left the out-tray -- the regression issue #171 asks for by name. */
export function isInstructionOpen(instruction) {
  return instruction?.status === "pending";
}
