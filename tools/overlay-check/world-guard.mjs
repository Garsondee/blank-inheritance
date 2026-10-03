/**
 * Has the world moved under a live check? Pure, so it can be tested without a browser; click-through.mjs reads the snapshot from the page.
 *
 * The check looks at one plain scene over one connection. Two things move it: another session activates a scene (Foundry pulls every
 * connected client onto it, and the Stagecraft check does exactly that), and a second login as the same user bumps the first one off.
 * Either shows up downstream as a cascade of failures that belong to the other session, so the check asks before each section and
 * after each gesture, and stops with one plain message.
 *
 * @param {{ connected: boolean, scene: string | null, name: string | null } | null} now  what the page reports (null when the page is gone)
 * @param {string | null} chosenSceneId  the scene the check chose to look at
 * @param {string} [user]                the user the check is logged in as, for the message
 * @returns {string | null}              what changed, or null when all is as the check left it
 */
export function worldChange(now, chosenSceneId, user = "Gamemaster") {
  if (now?.connected === true && now.scene === chosenSceneId && chosenSceneId !== null) return null;
  const what = !now ? "the page is gone" : now.connected !== true ? "the connection to Foundry dropped" : `the world switched to "${now.name}"`;
  return `${what}. Another session is probably using this world (as ${user}, or by activating a scene); run the check when nothing else is.`;
}
