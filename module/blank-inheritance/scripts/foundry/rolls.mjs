/**
 * Rolling from the console — the Foundry-touching half.
 *
 * The whole point of the console is that a player never opens their sheet, so
 * a roll started here has to be indistinguishable from one started there.
 * It is, because this calls the same method the sheet does:
 *
 *   gamesystems/sf2e/sf2e.mjs, the sheet's own "roll-check" action —
 *     const n = htmlClosest(t, `[data-statistic]`)?.dataset.statistic ?? ``,
 *           r = this.actor.getStatistic(n),
 *           i = eventToRollParams(e, { type: `check` });
 *     return t.dataset.secret !== void 0 && (i.messageMode = ...), r?.roll(i);
 *
 * `Statistic#roll` already does DC resolution, target and off-guard context,
 * roll notes, beforeRoll/afterRoll rule elements, degree-of-success
 * adjustments, incapacitation, MAP, and the chat card. None of that is
 * reimplemented here and none of it should ever be.
 */

import { SEATS } from "../core/console-model.mjs";
import { buildCheckGroups, labelForSlug } from "../core/skills.mjs";
import { CONSOLE_SHOWS_DIALOG_BY_DEFAULT, enricherFor, rollParamsFromEvent, strikeEventShiftKeyFor } from "../core/roll-intent.mjs";

/**
 * The character this client rolls as.
 *
 * `game.user.character` is the assignment Foundry already has a UI for, so the
 * console does not invent a second notion of "your character". Mode 1 is
 * theatre of the mind, where a pilot is a kid on foot, so there is deliberately
 * no chassis switcher here.
 */
export function consoleActor() {
  return game.user?.character ?? null;
}

/**
 * Whose checks the bar is showing.
 *
 * A player's are their own character's. A GM's belong to whatever is
 * selected on the canvas — which is the board's own logic (many creatures,
 * act on the one you picked) rather than a second idea of "my character".
 * With nothing selected a GM falls back to their own assigned character, so
 * a GM who also plays is not left with an empty pod.
 *
 * Only the first of a multi-selection is used: rolling the same skill for
 * six tokens at once is a different feature with different failure modes,
 * and guessing which one was meant is worse than picking the first.
 */
export function actorForSeat(seat) {
  if (seat === SEATS.DIRECTOR) {
    const controlled = canvas?.tokens?.controlled ?? [];
    if (controlled.length > 0) return controlled[0].actor ?? null;
  }
  return consoleActor();
}

/**
 * What this actor can roll, read off the live document.
 *
 * `actor.skills` is the real source and already contains lores alongside the
 * fixed eighteen, each carrying `.slug`, `.label` and (for lores) `.lore`.
 * Reading it means a character with three lores gets three extra keys without
 * anything here knowing what a lore is.
 */
export function checkGroupsFor(actor) {
  if (!actor) return [];

  const skills = Object.values(actor.skills ?? {}).map((statistic) => ({
    slug: statistic.slug,
    label: statistic.label || labelForSlug(statistic.slug),
    lore: !!statistic.lore
  }));

  const saves = Object.values(actor.saves ?? {}).map((statistic) => ({
    slug: statistic.slug,
    label: statistic.label || labelForSlug(statistic.slug)
  }));

  return buildCheckGroups({ skills, saves, hasPerception: !!actor.perception });
}

/**
 * Put a rollable check in chat for the table to click.
 *
 * The GM's most common use of a skill button is not rolling it themselves,
 * it is asking somebody else to. This gives core/roll-intent.mjs's
 * enricherFor a real consumer rather than leaving it as a theoretical
 * fallback, and it is why that function validates its slug: lore slugs come
 * from player-created Items and this string is handed to a parser.
 *
 * No DC yet. A prompt on every use would fight the point of a one-click
 * button, and an undc'd @Check is still rollable — the GM reads the result.
 * Attaching a DC is the obvious next refinement.
 */
export async function postInlineCheck({ slug, label = null }) {
  let content;
  try {
    content = enricherFor({ slug });
  } catch (err) {
    console.error("Blank Inheritance | Refusing to post an inline check:", err);
    ui.notifications?.error(game.i18n.localize("BLANKINHERITANCE.Console.Checks.BadSlug"));
    return null;
  }

  return ChatMessage.create({
    author: game.user?.id,
    content: `<p>${game.i18n.format("BLANKINHERITANCE.Console.Checks.Requested", { label: label ?? slug })}</p><p>${content}</p>`
  });
}

/**
 * Roll one statistic through the sheet's own code path — with one
 * deliberate difference from the sheet itself: see
 * CONSOLE_SHOWS_DIALOG_BY_DEFAULT. A plain click never opens sf2e's roll
 * dialog; shift does.
 *
 * Returns null rather than throwing when the slug does not resolve: a stale
 * button after a selection change is a nuisance, not an error worth breaking
 * the render over.
 */
export async function rollCheck({ actor, slug, event = null }) {
  const target = actor ?? consoleActor();
  if (!target) {
    ui.notifications?.warn(game.i18n.localize("BLANKINHERITANCE.Console.Checks.NoCharacter"));
    return null;
  }

  const statistic = target.getStatistic?.(slug);
  if (!statistic) {
    ui.notifications?.warn(
      game.i18n.format("BLANKINHERITANCE.Console.Checks.UnknownStatistic", { slug })
    );
    return null;
  }

  const params = rollParamsFromEvent(event, {
    showCheckDialogs: CONSOLE_SHOWS_DIALOG_BY_DEFAULT,
    isGM: game.user?.isGM ?? false
  });

  return statistic.roll(params);
}

/**
 * Roll one strike variant through the sheet's own code path.
 *
 * A real dead end, found live 2026-09-17 (an automated call to this
 * function with a bare `{event}` never resolved — a chat message never
 * appeared, and a `roll-modifiers-dialog` titled "Melee Strike: …" was
 * sitting open in the DOM): unlike `Statistic#roll`, a strike variant's own
 * `roll({event, ...})` wrapper (gamesystems/sf2e/sf2e.mjs, the character
 * strike closure around "attack-roll") builds its OWN fresh options object
 * for the underlying `Check.roll(check, options, event, callback)` call and
 * does **not** forward a caller's `skipDialog` into it at all — passing
 * `{event, skipDialog: true}` here is silently ignored; confirmed by
 * calling sf2e's own `variant.roll({skipDialog:true, event:null})` directly
 * from the console and watching the dialog open anyway.
 *
 * `Check.roll` DOES read the event, but only for its own
 * `eventToRollParams(event, {type:"check"})` call — see
 * core/roll-intent.mjs's `strikeEventShiftKeyFor` for the formula this
 * solves against and why. Verified nothing else in Check.roll's body reads
 * the event — its only other use of the same identifier is a shadowed
 * local inside an unrelated inner closure, not the outer parameter — so a
 * plain `{shiftKey, ctrlKey, metaKey}` object is safe to substitute for a
 * real DOM event here.
 *
 * actionIndex/variantIndex are the stable pair core/sheet-model.mjs's
 * strikeRows() attaches to every button, so a click never has to carry a
 * slug back through the template.
 */
export function rollStrike({ actor, actionIndex, variantIndex, event = null }) {
  const target = actor ?? consoleActor();
  const variant = target?.system?.actions?.[actionIndex]?.variants?.[variantIndex];
  if (!variant) {
    ui.notifications?.warn(game.i18n.localize("BLANKINHERITANCE.Console.Checks.NoCharacter"));
    return null;
  }
  const params = rollParamsFromEvent(event, {
    showCheckDialogs: CONSOLE_SHOWS_DIALOG_BY_DEFAULT,
    isGM: game.user?.isGM ?? false
  });
  const syntheticEvent = {
    shiftKey: strikeEventShiftKeyFor(params.skipDialog, !!game.user?.settings?.showCheckDialogs),
    ctrlKey: event?.ctrlKey ?? false,
    metaKey: event?.metaKey ?? false
  };
  return variant.roll({ event: syntheticEvent });
}

/**
 * Cast one spell through its own casting entry — `entry.cast(spell, {message: true})`,
 * the same method the sheet's own spellbook calls (verified live against
 * `gamesystems/sf2e/sf2e.mjs`'s SpellcastingEntry#cast). This spends the
 * real slot and posts the real chat card; nothing about slot bookkeeping is
 * reimplemented here.
 */
export async function castSpell({ actor, entryIndex, spellIndex, groupId }) {
  const target = actor ?? consoleActor();
  const entry = target?.spellcasting?.contents?.[entryIndex];
  if (!entry) return null;
  const sheetData = await entry.getSheetData();
  const group = sheetData.groups?.find((g) => g.id === groupId);
  const spell = group?.active?.filter(Boolean)?.[spellIndex]?.spell;
  if (!spell) return null;
  return entry.cast(spell, { message: true });
}
