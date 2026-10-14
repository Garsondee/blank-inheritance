/**
 * Foundry's own "pick your character" window, and when this adventure keeps it from opening.
 *
 * At the end of its own setup, before it announces `ready`, Foundry opens the player's User
 * Configuration window for anyone who is not a GM and has no character
 * (client/game.mjs: "If the player is not a GM and does not have an impersonated character,
 * prompt for selection"). A brand-new player is exactly that, and in this adventure a
 * characterless player is also who the induction terminal opens for, in the module's own `ready`
 * hook, on the very same condition. So the two windows opened together and Foundry's lay over the
 * terminal's list, which a new player had no reason to understand or to close. The playtest rig
 * found it on every one of its six scripted players, 2026-10-06 (design/playtest-process.md §12.5).
 *
 * The terminal makes the character and sets `user.character` itself, so the window has nothing to
 * offer here. This is only the decision, kept free of Foundry so a test can walk every case; the
 * adapter that acts on it is foundry/first-login.mjs.
 */

/**
 * Whether a User Configuration window that is about to render is Foundry's own automatic prompt
 * for a characterless player, which this adventure replaces with the induction terminal.
 *
 * `ready` is Foundry's `game.ready`: false while it is still setting itself up, which is the only
 * time it opens this window by itself. A player who opens their own User Configuration later, on
 * purpose (from the player list), is never stopped.
 *
 * @param {{ready:boolean, isGM:boolean, hasCharacter:boolean, ownSheet:boolean}} state
 * @returns {boolean} true when the window should not open
 */
export function shouldSuppressUserConfigPrompt({ ready, isGM, hasCharacter, ownSheet }) {
  return ready === false && isGM === false && hasCharacter === false && ownSheet === true;
}
