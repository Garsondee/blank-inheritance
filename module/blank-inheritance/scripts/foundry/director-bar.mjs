/**
 * The Director's console: a BOARD. Many creatures, one row each.
 *
 * Constructed only on a GM's client. That is the point — a player's browser
 * never instantiates this class, so GM-only content is absent rather than
 * hidden, which is the standard doctrine Law 11 holds every surface to.
 */

import { CommandBar } from "./command-bar.mjs";
import { SEATS } from "../core/console-model.mjs";

export class DirectorBar extends CommandBar {
  static SEAT = SEATS.DIRECTOR;

  static DEFAULT_OPTIONS = {
    classes: ["bi-bar--director"]
  };
}
