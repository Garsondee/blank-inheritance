/**
 * The Scene Runner / Close Scene comprehension-first light/dark theme
 * (2026-09-19 redesign) -- an unrelated axis from foundry/theme.mjs's own
 * "visual identity" GLASS/PAPER system (redaction filters, the world-wide
 * body classes). This is one client setting, one place that reads and
 * writes it, so a toggle in either the Runner or the Close Scene dialogue
 * never disagrees with the other.
 */
const MODULE_ID = "blank-inheritance";
const SETTING_THEME = "runnerTheme";

export function registerRunnerThemeSetting() {
  game.settings.register(MODULE_ID, SETTING_THEME, { scope: "client", config: false, type: String, default: "dark" });
}

/** Ingram's own stated preference (2026-09-19) is the default, not an arbitrary pick. */
export function currentRunnerTheme() {
  try {
    return game.settings.get(MODULE_ID, SETTING_THEME) || "dark";
  } catch {
    return "dark";
  }
}

export async function setRunnerTheme(next) {
  await game.settings.set(MODULE_ID, SETTING_THEME, next);
}

export function runnerThemeContext() {
  const theme = currentRunnerTheme();
  return { theme, themeIsDark: theme === "dark" };
}
