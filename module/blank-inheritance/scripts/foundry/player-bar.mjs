/**
 * The player's console: a SHEET. One character, deep.
 *
 * Thin on purpose — the seat is the entire difference, and every consequence
 * of it is worked out in core/console-model.mjs. If this file ever grows a
 * branch on isGM, the split has been broken: see design/ux-doctrine.md's rule
 * that a GM console is never a player console with more buttons.
 */

import { CommandBar } from "./command-bar.mjs";
import { SEATS } from "../core/console-model.mjs";

export class PlayerBar extends CommandBar {
  static SEAT = SEATS.PLAYER;

  // `classes` arrays CONCATENATE up the inheritance chain rather than
  // replacing (application.mjs:459-461), so this adds to .bi-bar.
  static DEFAULT_OPTIONS = {
    classes: ["bi-bar--player"]
  };
}
