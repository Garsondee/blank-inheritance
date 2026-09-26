/**
 * Foundry v14's Dynamic Token Ring STYLE (bronze vs steel) is a single core
 * world setting — "core.dynamicTokenRing" — not a per-Actor/per-Token field
 * (verified against client/canvas/placeables/tokens/ring-config.mjs: core
 * registers exactly two styles, "coreSteel" and "coreBronze", and the active
 * one is `game.settings.register("core", "dynamicTokenRing", {..., initial:
 * "coreSteel", requiresReload: true})`). sf2e itself only ever nudges this
 * setting's *default* (still "coreSteel", `sf2e.mjs`'s own setup hook) —
 * this is the module's equivalent one-time move, choosing bronze instead
 * (Ingram, 2026-09-18: "the bronze version would be best").
 *
 * A real `.set()`, not just changing `.default` the way sf2e does: this
 * world may already have an explicit stored value (from a prior session, or
 * from sf2e's own default nudge running first), and only a real set is
 * guaranteed to actually apply bronze rather than silently doing nothing.
 * Idempotent — checks the current value first, so a GM reloading mid-session
 * never gets a spurious "reload needed" prompt for a style that's already set.
 */

const CORE_BRONZE = "coreBronze";

export async function ensureBronzeTokenRingStyle() {
  if (!game.user.isGM) return;
  if (game.settings.get("core", "dynamicTokenRing") === CORE_BRONZE) return;

  await game.settings.set("core", "dynamicTokenRing", CORE_BRONZE);
  // requiresReload: true on this setting (core's own registration) — Foundry
  // does not hot-swap an already-drawn ring's atlas; the world needs a reload
  // for the bronze spritesheet to actually take over rendering.
  ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.TokenRing.StyleSetReloadNeeded"));
}
