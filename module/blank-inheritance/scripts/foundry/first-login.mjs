/**
 * Keeps Foundry's own "User Configuration" window from opening over the induction terminal at a new
 * player's first login. The decision is core/first-login.mjs; this is the one place it touches
 * Foundry.
 *
 * Foundry asks every application whether it may render (`ApplicationV2#_canRender`: returning
 * `false` stops the render, client/applications/api/application.mjs). Its own login prompt is
 * `game.user.sheet.render({force: true})` while `game.ready` is still false (client/game.mjs), so
 * answering `false` for that one case, and passing every other render to what was there before,
 * removes the prompt without hiding the window from a player who opens it on purpose.
 */

import { shouldSuppressUserConfigPrompt } from "../core/first-login.mjs";

/** Marks the patched method so a second call (a reload of the module's own code) does not wrap it twice. */
const PATCHED = Symbol.for("blank-inheritance.firstLoginUserConfig");

/**
 * @param {object} [options]
 * @param {Function} [options.UserConfig] the window class; Foundry's own by default (tests pass a stand-in)
 * @param {() => object} [options.getGame] where to read `game` from (tests pass a stand-in)
 * @returns {boolean} whether the guard is in place
 */
export function suppressFirstLoginUserConfig({ UserConfig = globalThis.foundry?.applications?.sheets?.UserConfig, getGame = () => globalThis.game } = {}) {
  const proto = UserConfig?.prototype;
  if (!proto) {
    console.warn("Blank Inheritance | Foundry's User Configuration window was not found, so it cannot be kept off the induction terminal at first login.");
    return false;
  }
  if (proto._canRender?.[PATCHED]) return true;

  const original = proto._canRender;
  const guarded = function canRender(options) {
    const game = getGame();
    const user = game?.user;
    if (user && shouldSuppressUserConfigPrompt({ ready: game.ready === true, isGM: user.isGM === true, hasCharacter: Boolean(user.character), ownSheet: this.document === user })) return false;
    return original?.call(this, options);
  };
  guarded[PATCHED] = true;
  proto._canRender = guarded;
  return true;
}
