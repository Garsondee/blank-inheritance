/**
 * Choice prompts -- the pure half of "the GM presses one button and every
 * player picks" (design/scene-triggers-and-depth.md §2.4, the choicePoint).
 *
 * A scene's `choicePoint` used to be two or three buttons only the GM could
 * press, so the table said what it wanted out loud and the GM recorded it.
 * Now the GM presses ONE button on the beat; every player's screen gets the
 * question with a big button per option, and the Runner shows who has picked
 * what as it arrives.
 *
 * Ingram, 2026-10-04: "We always include a third choice button that players
 * can opt for which covers things that went unexpectedly." So every prompt
 * ends in a "Something else" option, whatever the author wrote, whether or
 * not the choicePoint says `allowsInventedOption`. It is a real option with a
 * real id: choosing it records that the table did something none of the
 * authored options cover, and the GM adjudicates it in the spirit of them.
 *
 * No Foundry, no DOM, no storage -- foundry/choice-prompt.mjs decides where
 * any of this lives.
 */

/** The id of the option every prompt ends with. An authored option may not use it. */
export const ELSE_ID = "something-else";

/** The shared record when no question is open. */
export const emptyPromptState = () => ({ version: 1, prompt: null });

const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

/**
 * A choicePoint's options as the GM's Runner shows them: the authored ones,
 * then "Something else", always last and always exactly once.
 *
 * Each option carries TWO texts and they must never be confused.
 * `consequence` is the GM's: what it actually does, often naming the right
 * answer or the hidden reaction ("do not signal which is correct"). `blurb` is
 * the table's: one plain line shown on the player's button, written so it
 * spoils nothing. The audit of every scene on 2026-10-04 found authored
 * consequences that would have wrecked a puzzle printed on a player's screen,
 * so the player window gets the blurb and nothing else.
 */
export function promptOptions(choicePoint, { elseLabel = "Something else", elseBlurb = null, elseConsequence = null } = {}) {
  const authored = (Array.isArray(choicePoint?.options) ? choicePoint.options : [])
    .filter((o) => o && typeof o === "object" && text(o.id) && o.id !== ELSE_ID)
    .map((o) => ({ id: o.id, label: text(o.label) ?? o.id, blurb: text(o.blurb), consequence: text(o.consequence), isElse: false }));
  return [...authored, { id: ELSE_ID, label: elseLabel, blurb: elseBlurb, consequence: elseConsequence, isElse: true }];
}

/**
 * A question as it stands at the table: open for picks, nobody decided yet.
 *
 * The record is a world setting every client can read, so it holds only what a
 * player may see: id, label, blurb. The GM-facing `consequence` stays in the
 * scene brief, where the Runner reads it from.
 */
export function openPrompt({ id, briefId, beatId, choicePoint, openedAt, elseLabel, elseBlurb } = {}) {
  return {
    id,
    briefId: briefId ?? null,
    beatId: beatId ?? null,
    question: text(choicePoint?.label),
    options: promptOptions(choicePoint, { elseLabel, elseBlurb }).map(({ id: optionId, label, blurb, isElse }) => ({ id: optionId, label, blurb, isElse })),
    openedAt: openedAt ?? null,
    // userId -> option id. Public to every client, like the City's picks:
    // players see each other's picks as they arrive.
    picks: {}
  };
}

/**
 * One pick, decided. `optionId` null takes a pick back. Refusals carry a
 * reason a player can read, never silence: a click that does nothing is a bug.
 */
export function applyPromptPick(prompt, { userId, optionId = null } = {}) {
  if (!prompt) return { ok: false, reason: "nothing-to-pick" };
  if (!userId) return { ok: false, reason: "no-user" };
  const picks = { ...prompt.picks };
  delete picks[userId];
  if (optionId != null) {
    if (!prompt.options.some((o) => o.id === optionId)) return { ok: false, reason: "unknown-option" };
    picks[userId] = optionId;
  }
  return { ok: true, prompt: { ...prompt, picks } };
}

/**
 * Where every player stands, one row each, and what each option has collected.
 * `roster` is `[{ userId, name, characterName, color, img, active }]`. A pick
 * by someone not on the roster still counts (a player whose character was
 * unassigned a moment ago has not stopped being at the table).
 */
export function promptTally(prompt, roster = []) {
  const options = prompt?.options ?? [];
  const label = new Map(options.map((o) => [o.id, o.label]));
  const who = (member) => member.characterName || member.name || "?";
  const known = new Set(roster.map((m) => m.userId));
  const rows = roster.map((member) => {
    const optionId = prompt?.picks?.[member.userId] ?? null;
    return {
      userId: member.userId,
      name: who(member),
      color: member.color ?? null,
      img: member.img ?? null,
      active: member.active !== false,
      optionId: label.has(optionId) ? optionId : null,
      label: label.get(optionId) ?? null,
      done: label.has(optionId)
    };
  });
  const strays = Object.entries(prompt?.picks ?? {}).filter(([userId, optionId]) => !known.has(userId) && label.has(optionId));
  const byOption = options.map((option) => {
    const takers = rows.filter((r) => r.optionId === option.id).map((r) => r.name);
    const extra = strays.filter(([, optionId]) => optionId === option.id).length;
    return { id: option.id, label: option.label, isElse: option.isElse, takers, count: takers.length + extra };
  });
  const done = rows.filter((r) => r.done).length;
  return { rows, byOption, done, total: rows.length, complete: rows.length > 0 && done === rows.length };
}

/**
 * What a closed prompt means for the Runner's record. `choice` is the single
 * most-picked option (a tie goes to the one written first), because the run
 * state has always held one; `picks` keeps the whole split, since "who went to
 * which room" is the whole point of a beat like Local Studies. Null when
 * nobody picked anything: there is nothing to record.
 */
export function settlePrompt(prompt) {
  const picks = Object.fromEntries(Object.entries(prompt?.picks ?? {}).filter(([, id]) => (prompt?.options ?? []).some((o) => o.id === id)));
  if (Object.keys(picks).length === 0) return null;
  let choice = null;
  let best = 0;
  for (const option of prompt.options) {
    const count = Object.values(picks).filter((id) => id === option.id).length;
    if (count > best) {
      best = count;
      choice = option.id;
    }
  }
  return { choice, picks };
}

/**
 * The line a recorded beat shows on its row: every option anyone picked, with
 * its head-count when the table split. `tick` is the beat's run-state entry.
 */
export function recordedChoiceLabel(options, tick) {
  const label = new Map((options ?? []).map((o) => [o.id, o.label]));
  const picks = Object.values(tick?.picks ?? {});
  if (picks.length === 0) return label.get(tick?.choice) ?? tick?.choice ?? null;
  const parts = (options ?? [])
    .map((o) => ({ label: o.label, count: picks.filter((id) => id === o.id).length }))
    .filter((p) => p.count > 0);
  return parts.length === 1 ? parts[0].label : parts.map((p) => `${p.label} ×${p.count}`).join(" · ");
}
