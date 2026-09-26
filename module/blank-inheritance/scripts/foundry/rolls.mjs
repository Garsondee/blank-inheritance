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
 * Whether the table is shown roll outcomes — sf2e's own metagame setting,
 * read here because this file is the one place allowed to reach into the
 * system's namespace (tier0-architecture.test.mjs). The deck's central
 * instrument consults it before telling a player whether they succeeded
 * (ux-doctrine Law 11). Unreadable means shown, which is the system default.
 */
export function tableSeesResults() {
  return game.pf2e?.settings?.metagame?.results ?? true;
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
export async function postInlineCheck({ slug, label = null, dc = null }) {
  let content;
  try {
    content = enricherFor({ slug, dc });
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
 * Roll a strike's damage — or its critical damage — through sf2e's own
 * `strike.damage` / `strike.critical`, the exact calls the sheet's Damage and
 * Critical buttons make (both verified present on a live character's
 * `system.actions[n]`, 2026-09-23). Same synthetic-event reasoning as
 * rollStrike above: the wrapper derives its own dialog choice from the
 * event's shiftKey against the user's real setting, here showDamageDialogs.
 */
export function rollStrikeDamage({ actor, actionIndex, critical = false, event = null }) {
  const target = actor ?? consoleActor();
  const strike = target?.system?.actions?.[actionIndex];
  const roll = critical ? strike?.critical : strike?.damage;
  if (typeof roll !== "function") {
    ui.notifications?.warn(game.i18n.localize("BLANKINHERITANCE.Console.Checks.NoCharacter"));
    return null;
  }
  const params = rollParamsFromEvent(event, {
    showCheckDialogs: CONSOLE_SHOWS_DIALOG_BY_DEFAULT,
    isGM: game.user?.isGM ?? false
  });
  const syntheticEvent = {
    shiftKey: strikeEventShiftKeyFor(params.skipDialog, !!game.user?.settings?.showDamageDialogs),
    ctrlKey: event?.ctrlKey ?? false,
    metaKey: event?.metaKey ?? false
  };
  return roll({ event: syntheticEvent });
}

/**
 * What the deck's Action selector needs to know about each action it lists,
 * read off sf2e's own registry: its localised name, its cost, the names of
 * its variants, and `preview({actor})` — the statistic(s) it rolls and the
 * real modifier for THIS creature (sf2e computes it with the action's own
 * modifiers applied, so the key can print the number that will actually be
 * rolled). An action whose preview throws is kept with no preview rather
 * than dropped: it still works, it just cannot say its number.
 *
 * game.pf2e stays confined to this file (tier0-architecture's lint), which is
 * why the registry is read here and handed to core/deck-actions.mjs as plain
 * data.
 */
export function actionRegistryFor(actor, slugs = []) {
  const registry = {};
  const actions = game.pf2e?.actions;
  if (!actions?.get) return registry;
  for (const slug of new Set(slugs)) {
    const action = actions.get(slug);
    if (!action) continue;
    const variants = {};
    for (const variant of action.variants?.values?.() ?? []) {
      variants[variant.slug] = game.i18n.localize(variant.name ?? variant.slug);
    }
    let preview = [];
    if (actor && typeof action.preview === "function") {
      try {
        const first = action.variants?.size > 1 ? action.variants.values().next().value?.slug : undefined;
        preview = action.preview({ actor, variant: first }) ?? [];
      } catch {
        preview = [];
      }
    }
    registry[slug] = { name: game.i18n.localize(action.name), cost: action.cost ?? null, variants, preview };
  }
  return registry;
}

/**
 * Use one action for this creature — sf2e's own `action.use`, which rolls the
 * right statistic with the action's own modifiers and traits and posts its
 * card (a simple action like Take Cover posts its card and applies its
 * effect). The console's own dialog default applies: plain click rolls, shift
 * opens sf2e's modifier dialog.
 */
export async function useAction({ actor, slug, variant = null, event = null }) {
  const target = actor ?? consoleActor();
  const action = game.pf2e?.actions?.get(slug);
  if (!target || !action) {
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
  try {
    return await action.use({ actors: [target], event: syntheticEvent, ...(variant ? { variant } : {}) });
  } catch (err) {
    console.error(`Blank Inheritance | Could not use ${slug}:`, err);
    ui.notifications?.warn(err?.message ?? String(err));
    return null;
  }
}

/**
 * The table-scale actions sf2e ships as plain functions on its action
 * registry rather than as checks — Rest for the Night, Treat Wounds, Take a
 * Breather — run exactly as the system's own macros run them (each opens its
 * own confirmation or options dialog). Named explicitly rather than by a
 * free string, so a typo is a thrown error here instead of a silent no-op at
 * the table. Added 2026-09-23 for the Director's Palette.
 */
const SYSTEM_TABLE_ACTIONS = Object.freeze(["restForTheNight", "treatWounds", "takeABreather"]);

export async function runSystemAction(name, actors = []) {
  if (!SYSTEM_TABLE_ACTIONS.includes(name)) throw new Error(`Unknown system action "${name}".`);
  // The registry is a Collection keyed by these names (sf2e also calls them
  // as properties, e.g. its own sheet's `game.pf2e.actions.restForTheNight`).
  const registry = game.pf2e?.actions;
  const action = registry?.get?.(name) ?? registry?.[name];
  if (typeof action !== "function") {
    ui.notifications?.warn(`This system has no "${name}" action.`);
    return null;
  }
  return action({ actors });
}

/**
 * Roll this creature into the current encounter — sf2e's own
 * `actor.initiative.roll`, which finds (or, on the GM's side, creates) the
 * combatant and writes the result to the tracker.
 */
export async function rollInitiative({ actor, event = null }) {
  const target = actor ?? consoleActor();
  if (!target?.initiative?.roll) return null;
  const params = rollParamsFromEvent(event, {
    showCheckDialogs: CONSOLE_SHOWS_DIALOG_BY_DEFAULT,
    isGM: game.user?.isGM ?? false
  });
  return target.initiative.roll(params);
}

/** The creature's initiative modifier, for the key's printed number. */
export function initiativeMod(actor) {
  const mod = actor?.initiative?.mod;
  return Number.isFinite(mod) ? mod : null;
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
