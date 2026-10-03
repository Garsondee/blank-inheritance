/**
 * The one question the older theatre-of-the-mind overlay asks before it mounts: is this scene drawn by Stagecraft? Kept in
 * a file of its own with no imports so that foundry/stage.mjs can ask it without a loop (the bridge imports stage.mjs).
 */

const NS = "stagecraft";

export const stagecraftInstalled = () => !!game.modules.get(NS);
export const stagecraftActive = () => game.modules.get(NS)?.active === true;

/** The module is on, and the scene carries a stage description: Stagecraft draws it, and the older overlay stays away. */
export const stagecraftDraws = (scene) => stagecraftActive() && !!scene?.flags?.[NS]?.stage;
