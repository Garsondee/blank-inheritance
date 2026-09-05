/**
 * Visual identity — the Foundry-touching half.
 *
 * Thin on purpose. Every decision (which classes, what markup, which
 * settings) is made by core/theme.mjs; this file only reads settings and
 * moves the results onto the real document. See design/testing-strategy.md §1.
 *
 * The stylesheets themselves are loaded by Foundry from module.json's
 * `styles` array, not from here — a module's CSS is declarative and should
 * not depend on our script running.
 */

import {
  ALL_THEME_CLASSES,
  FILTER_DEFS_ID,
  THEME_SETTINGS,
  filterDefsMarkup,
  themeClasses
} from "../core/theme.mjs";

const MODULE_ID = "blank-inheritance";

/** Read the two theme settings, tolerating a not-yet-registered setting. */
function readSettings() {
  const get = (key, fallback) => {
    try {
      return game.settings.get(MODULE_ID, key);
    } catch {
      return fallback;
    }
  };
  return {
    enabled: get("themeEnabled", true),
    rosterInBar: get("rosterInBar", false)
  };
}

/**
 * Put the SVG filter definitions in the document exactly once.
 *
 * Without these, `filter: url(#bi-redact-edge-1)` resolves to nothing and the
 * redaction bars lose their ragged edge — silently, because a missing filter
 * reference is ignored rather than erroring.
 */
export function ensureFilterDefs() {
  if (document.getElementById(FILTER_DEFS_ID)) return;
  document.body.insertAdjacentHTML("afterbegin", filterDefsMarkup());
}

function removeFilterDefs() {
  document.getElementById(FILTER_DEFS_ID)?.remove();
}

/**
 * Apply the theme to <body> from current settings.
 *
 * Turning the theme off removes every class we added AND the injected defs,
 * so "off" really means Foundry is back to stock rather than mostly-stock.
 */
export function applyTheme() {
  const { enabled, rosterInBar } = readSettings();
  const wanted = themeClasses({ enabled, rosterInBar });

  document.body.classList.remove(...ALL_THEME_CLASSES);
  if (wanted.length) document.body.classList.add(...wanted);

  if (enabled) ensureFilterDefs();
  else removeFilterDefs();

  return wanted;
}

/**
 * Register the theme settings. Called from `init`, before `ready`, because
 * Foundry requires settings to be registered during initialisation.
 */
export function registerThemeSettings() {
  for (const setting of THEME_SETTINGS) {
    game.settings.register(MODULE_ID, setting.key, {
      name: setting.name,
      hint: setting.hint,
      scope: setting.scope,
      config: setting.config,
      type: setting.type,
      default: setting.default,
      // Instant, no reload. The kill switch is only useful if it works the
      // moment a GM reaches for it mid-session.
      onChange: () => applyTheme()
    });
  }
}
