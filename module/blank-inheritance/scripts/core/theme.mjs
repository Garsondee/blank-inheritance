/**
 * Visual identity — the pure half.
 *
 * Everything here is a plain function of its inputs: no Foundry globals, no
 * DOM. scripts/foundry/theme.mjs is the only file that touches either. See
 * design/testing-strategy.md §1 and design/visual-identity.md.
 *
 * The SVG filter definitions live here rather than in the prototype page so
 * there is exactly ONE copy. The first pass had the defs pasted into the
 * demo HTML, which meant the module would have shipped without them and every
 * redaction bar would have silently lost its ragged edge — a `filter: url()`
 * pointing at a missing id is ignored without error.
 */

/** The class that gates every rule in bi-foundry-bridge.css. */
export const THEME_CLASS = "bi-theme";

/** Opt-in: hide Foundry's own player list once our bar carries a roster. */
export const ROSTER_IN_BAR_CLASS = "bi-roster-in-bar";

/** The id of the injected <svg> holding the redaction filters. */
export const FILTER_DEFS_ID = "bi-filter-defs";

/**
 * Which body classes should be present, given the resolved settings.
 * Returned as a sorted array so the result is stable and easy to assert.
 */
export function themeClasses({ enabled = true, rosterInBar = false } = {}) {
  const classes = [];
  if (enabled) classes.push(THEME_CLASS);
  if (enabled && rosterInBar) classes.push(ROSTER_IN_BAR_CLASS);
  return classes.sort();
}

/**
 * Every class this module ever adds to <body>, so the adapter can remove
 * them all when the theme is switched off without having to remember the
 * list. Turning the theme off must leave nothing of ours behind.
 */
export const ALL_THEME_CLASSES = Object.freeze([THEME_CLASS, ROSTER_IN_BAR_CLASS]);

/**
 * The ragged-edge filters for redaction bars.
 *
 * Low frequency across, high frequency down: the displacement map pushes the
 * bar's top and bottom edges into an ink-soaked ragged line while leaving the
 * ends roughly vertical. Three seeds, cycled by the `data-edge` attribute
 * core/redact.mjs writes, so adjacent bars never share an outline.
 *
 * Returned as a string rather than built with DOM calls so it is testable in
 * plain Node and so the adapter stays a one-liner.
 */
export function filterDefsMarkup() {
  const filters = [
    { id: 1, freq: "0.07 0.62", octaves: 3, seed: 11, scale: 4.4 },
    { id: 2, freq: "0.09 0.48", octaves: 4, seed: 47, scale: 5.2 },
    { id: 3, freq: "0.055 0.74", octaves: 3, seed: 83, scale: 3.8 }
  ];
  const body = filters
    .map(
      (f) =>
        `<filter id="bi-redact-edge-${f.id}" x="-10%" y="-45%" width="120%" height="190%" color-interpolation-filters="sRGB">` +
        `<feTurbulence type="fractalNoise" baseFrequency="${f.freq}" numOctaves="${f.octaves}" seed="${f.seed}" result="n"/>` +
        `<feDisplacementMap in="SourceGraphic" in2="n" scale="${f.scale}" xChannelSelector="R" yChannelSelector="G"/>` +
        `</filter>`
    )
    .join("");
  return (
    `<svg id="${FILTER_DEFS_ID}" width="0" height="0" ` +
    `style="position:absolute;width:0;height:0;overflow:hidden" ` +
    `aria-hidden="true" focusable="false"><defs>${body}</defs></svg>`
  );
}

/**
 * The stylesheets the module ships, in the order they must load.
 *
 * Order is load-bearing: fonts declare the @font-face rules the tokens name,
 * tokens declare the custom properties components consume, and the bridge
 * must come last because it deliberately out-specifies component defaults on
 * Foundry's own selectors. This list is checked against module.json by
 * test/tier3-theme-contract.test.mjs, so the manifest and the code cannot
 * disagree about what ships.
 */
export const STYLESHEETS = Object.freeze([
  "styles/bi-fonts.css",
  "styles/bi-tokens.css",
  "styles/bi-components.css",
  "styles/bi-agreement.css",
  "styles/bi-papers.css",
  "styles/bi-notebook.css",
  "styles/bi-objectives.css",
  "styles/bi-check.css",
  "styles/bi-journeys.css",
  "styles/bi-foundry-bridge.css"
]);

/** Settings this module registers, as data, so the adapter just iterates. */
export const THEME_SETTINGS = Object.freeze([
  {
    key: "themeEnabled",
    name: "BLANKINHERITANCE.Settings.ThemeEnabled.Name",
    hint: "BLANKINHERITANCE.Settings.ThemeEnabled.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  },
  {
    key: "rosterInBar",
    name: "BLANKINHERITANCE.Settings.RosterInBar.Name",
    hint: "BLANKINHERITANCE.Settings.RosterInBar.Hint",
    // world, not client (changed live 2026-09-17): this started as a
    // per-browser preference, but that meant a client-scoped `default: true`
    // only actually hides the roster for a browser that has never touched
    // the setting before — anyone (GM or player) who had it stored from
    // before the default flipped keeps seeing Foundry's roster regardless,
    // with no way for the table to fix it except hunting down that one
    // obscure checkbox in Foundry's own Configure Settings, once per
    // browser. Found live on the real server: Ingram's own browser still
    // showed the roster after this exact default change shipped. Whether
    // Foundry's roster is redundant with the deck's own ident/cast modules
    // is a campaign-wide fact, not a personal taste — a world setting, GM-
    // set once, is instant for the whole table via the onChange below and
    // needs nobody else to go looking for it.
    scope: "world",
    config: true,
    type: Boolean,
    // Defaults true as of the deck (2026-09-17): the deck's own ident
    // (player) and cast (Director) modules now cover who's in this scene,
    // and Ingram asked directly to hide Foundry's own roster now that a
    // replacement exists. Still a real setting, not a hard removal — a GM
    // who wants the connection/online status the deck doesn't show can
    // switch it back on for everyone.
    default: true
  }
]);
