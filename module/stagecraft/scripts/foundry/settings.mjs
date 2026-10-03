/**
 * The module's settings. All are the player's own (client scope): how good a picture their machine can draw, how loud
 * the zone outlines are, and whether they want the calm version.
 */

import { NS } from "./scene-data.mjs";
import { lowestOf } from "../core/speed.mjs";
import { speedLimit, forgetSpeed } from "./speed-store.mjs";

export function registerSettings() {
  const F = foundry.data.fields;
  game.settings.register(NS, "tier", {
    name: "STAGECRAFT.Settings.Tier.Name",
    hint: "STAGECRAFT.Settings.Tier.Hint",
    scope: "client",
    config: true,
    requiresReload: false,
    type: new F.StringField({ required: true, blank: false, initial: "auto", choices: { auto: "STAGECRAFT.Settings.Tier.Auto", high: "STAGECRAFT.Settings.Tier.High", low: "STAGECRAFT.Settings.Tier.Low", flat: "STAGECRAFT.Settings.Tier.Flat" } }),
    // any choice a player makes here clears what the start-up test found: Automatic tests this computer afresh
    onChange: () => { forgetSpeed(); Hooks.callAll("stagecraft.settingsChanged", "tier"); }
  });
  game.settings.register(NS, "zones", {
    name: "STAGECRAFT.Settings.Zones.Name",
    hint: "STAGECRAFT.Settings.Zones.Hint",
    scope: "client",
    config: true,
    // hidden until a card comes near (2026-10-03: a faint dashed box nobody had brought a card to was a puzzle, saying
    // nothing of what it was for; near a card in hand it lights up with its name and what it is for)
    type: new F.StringField({ required: true, blank: false, initial: "off", choices: { off: "STAGECRAFT.Settings.Zones.Off", faint: "STAGECRAFT.Settings.Zones.Faint", full: "STAGECRAFT.Settings.Zones.Full" } }),
    onChange: () => Hooks.callAll("stagecraft.settingsChanged", "zones")
  });
  game.settings.register(NS, "calm", {
    name: "STAGECRAFT.Settings.Calm.Name",
    hint: "STAGECRAFT.Settings.Calm.Hint",
    scope: "client",
    config: true,
    type: new F.BooleanField({ initial: false }),
    onChange: () => Hooks.callAll("stagecraft.settingsChanged", "calm")
  });
}

/** What the player left the picture quality on: auto, high, low or flat. */
export const tierSetting = () => game.settings.get(NS, "tier");

/**
 * The tier to draw at: the player's choice, else what Foundry's own performance mode says about their machine, held down
 * to what the start-up speed test found this computer can hold (foundry/speed.mjs). A limit only ever lowers a tier.
 */
export function chosenTier() {
  const set = game.settings.get(NS, "tier");
  if (set === "high" || set === "low" || set === "flat") return set;
  const mode = game.settings.get("core", "performanceMode");
  const base = mode !== null && mode <= CONST.CANVAS_PERFORMANCE_MODES.LOW ? "low" : "high";
  return lowestOf(base, speedLimit() ?? "high");
}

/** Calm when the player asked for it, or when their system or Foundry asks for reduced motion or photosensitive mode. */
export function isCalm() {
  if (game.settings.get(NS, "calm")) return true;
  if (game.settings.get("core", "photosensitiveMode")) return true;
  return !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export const zoneSetting = () => game.settings.get(NS, "zones");
