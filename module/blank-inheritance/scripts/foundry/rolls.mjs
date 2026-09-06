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

import { buildCheckGroups, labelForSlug } from "../core/skills.mjs";
import { rollParamsFromEvent } from "../core/roll-intent.mjs";

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
 * Roll one statistic, exactly as the sheet would.
 *
 * Returns null rather than throwing when the slug does not resolve: a stale
 * button after a character swap is a nuisance, not an error worth breaking the
 * render over.
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
    // Read the same way sf2e reads it, so the console and the sheet cannot
    // disagree about whether a player wants roll dialogs.
    showCheckDialogs: game.user?.settings?.showCheckDialogs ?? true,
    isGM: game.user?.isGM ?? false
  });

  return statistic.roll(params);
}
