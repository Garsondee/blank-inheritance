/**
 * Who at the table can browse the server's files.
 *
 * Foundry lets the Trusted role (and any role the GM grants it to) browse the
 * data folder, and this module keeps every portrait in the campaign there. A
 * player who can browse can read a file name, and a file name is a name. This
 * is the one part of name protection the module cannot fix from inside, so it
 * tells the GM instead.
 *
 * Pure: the caller hands over the users and the roles Foundry allows.
 */

/** Foundry's user roles (CONST.USER_ROLES), mirrored so this stays free of globals. */
export const ROLES = Object.freeze({ NONE: 0, PLAYER: 1, TRUSTED: 2, ASSISTANT: 3, GAMEMASTER: 4 });

/**
 * The non-GM users whose role lets them browse files.
 *
 * @param {Array<{name: string, role: number}>} users
 * @param {number[]} allowedRoles  the roles game.permissions.FILES_BROWSE grants
 * @returns {string[]} their names, in the order given
 */
export function playersWhoCanBrowseFiles(users = [], allowedRoles = []) {
  const allowed = new Set(allowedRoles);
  return users
    .filter((user) => user && user.role < ROLES.ASSISTANT && allowed.has(user.role))
    .map((user) => user.name);
}
