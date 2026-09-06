// Tier 3 — contract tests for the visual-identity CSS layers.
//
// The failure mode this exists to kill is design/testing-strategy.md §0's
// big one, in its CSS form: Foundry or sf2e renames a custom property, our
// bridge keeps setting the old name, and NOTHING ERRORS. CSS silently
// ignores an unknown custom property. The theme just quietly stops applying
// in one corner of the UI, and nobody notices until it is on screen in front
// of six players mid-session.
//
// So: every upstream variable the bridge overrides is checked against the
// real foundry2.css / sf2e.css in the local (gitignored) source trees. Like
// the other tier-3 tests, this skips LOUDLY when those trees are absent —
// never fails, never silently passes.
//
// The non-contract tests below need no source trees and always run: they
// enforce the same layering discipline the .mjs code has (§1's pure core /
// thin adapter split, applied to CSS), and they pin the one real bug found
// while building the prototype.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const stylesRoot = path.join(repoRoot, "module", "blank-inheritance", "styles");

const TOKENS = path.join(stylesRoot, "bi-tokens.css");
const COMPONENTS = path.join(stylesRoot, "bi-components.css");
const BRIDGE = path.join(stylesRoot, "bi-foundry-bridge.css");

const foundryCss = path.join(
  repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app",
  "public", "css", "foundry2.css"
);
const sf2eCss = path.join(repoRoot, "gamesystems", "sf2e", "styles", "sf2e.css");

const verifiedVersions = JSON.parse(
  readFileSync(path.join(here, "fixtures", "verified-versions.json"), "utf8")
);

/** Strip comments so prose mentioning a selector or variable never matches. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const read = (p) => stripComments(readFileSync(p, "utf8"));

/** Custom properties DECLARED by this stylesheet (`--x: value`). */
function declaredVars(css) {
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

/** Custom properties CONSUMED by this stylesheet (`var(--x)`). */
function usedVars(css) {
  return new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]));
}

/* ==================================================================
   Layering discipline — no source trees needed, always runs.
   ================================================================== */

test("theme CSS layers all exist", () => {
  for (const file of [TOKENS, COMPONENTS, BRIDGE]) {
    assert.ok(existsSync(file), `missing theme layer: ${path.relative(repoRoot, file)}`);
  }
});

test("tokens and components stay Foundry-agnostic", () => {
  // The CSS mirror of §1's rule that core/ may not touch Foundry globals.
  // Tokens and components must render in a plain HTML page so the design can
  // be reviewed without a running Foundry. Only the bridge knows Foundry.
  const forbidden = [
    /#ui-(?:bottom|left|right|top|middle)\b/,
    /#sidebar\b/,
    /#players\b/,
    /#hotbar\b/,
    /\.application\b/,
    /\.window-header\b/,
    /\.journal-entry-page\b/,
    /body\.bi-theme\b/
  ];
  for (const file of [TOKENS, COMPONENTS]) {
    const css = read(file);
    for (const pattern of forbidden) {
      assert.ok(
        !pattern.test(css),
        `${path.relative(repoRoot, file)} references a Foundry selector (${pattern}). ` +
          `Foundry-specific rules belong in bi-foundry-bridge.css so the token and ` +
          `component layers stay renderable outside Foundry.`
      );
    }
  }
});

test("every --bi- variable used anywhere is defined in bi-tokens.css", () => {
  const defined = declaredVars(read(TOKENS));
  for (const file of [COMPONENTS, BRIDGE]) {
    const css = read(file);
    // Locally-scoped component knobs are declared where they are used
    // (e.g. --lamp on .bi-lamp), so a var counts as satisfied by either
    // the token layer or its own file.
    const localDefs = declaredVars(css);
    for (const v of usedVars(css)) {
      if (!v.startsWith("--bi-")) continue;
      assert.ok(
        defined.has(v) || localDefs.has(v),
        `${path.relative(repoRoot, file)} uses ${v}, which bi-tokens.css does not define.`
      );
    }
  }
});

test("every bridge rule is gated behind the body.bi-theme kill switch", () => {
  // A theme that cannot be switched off is a theme that can end a session.
  // Every selector in the bridge must carry body.bi-theme so dropping one
  // class returns Foundry to stock instantly.
  const css = read(BRIDGE);
  // Drop at-rule blocks (@media forced-colors etc.), whose inner selectors
  // are checked as part of their own text below.
  const selectors = [...css.matchAll(/(^|[}])\s*([^{}@]+?)\s*\{/gm)].map((m) => m[2].trim());
  const offenders = selectors.filter((sel) => {
    if (!sel || sel.startsWith("@")) return false;
    // Every comma-separated selector in the group must be gated.
    return sel.split(",").some((s) => !s.includes("body.bi-theme"));
  });
  assert.deepEqual(
    offenders, [],
    `bi-foundry-bridge.css has ungated rules; each would apply even with the ` +
      `theme switched off:\n  ${offenders.join("\n  ")}`
  );
});

/* ==================================================================
   Regression — the real bug found while building the prototype.
   ================================================================== */

test("command bar height is pinned to the same token the hotbar padding uses", () => {
  // FOUND LIVE, 2026-09-05: .bi-bar used min-height, so the chassis grew to
  // its content (172px) while --bi-bar-height still said 128px. The bridge
  // pads #ui-bottom by that token to lift Foundry's macro hotbar clear of
  // the bar, so in Foundry the hotbar would have sat 44px inside the
  // chassis. The two numbers must come from one source.
  const components = read(COMPONENTS);
  const bridge = read(BRIDGE);

  const barRule = components.match(/\.bi-bar\s*\{[^}]*\}/);
  assert.ok(barRule, "bi-components.css no longer declares a .bi-bar rule");
  assert.match(
    barRule[0],
    /(?<!min-)height:\s*var\(--bi-bar-height\)/,
    ".bi-bar must pin `height: var(--bi-bar-height)`, not min-height — a " +
      "content-sized chassis drifts from the #ui-bottom padding in the bridge."
  );
  assert.match(
    bridge,
    /#ui-bottom[^}]*padding-bottom:[^;]*var\(--bi-bar-height\)/s,
    "the bridge must derive #ui-bottom's padding from --bi-bar-height so the " +
      "hotbar can never end up behind the command bar."
  );
});

/* ==================================================================
   Contract — needs the local source trees.
   ================================================================== */

test("local source trees match the versions this theme was authored against", (t) => {
  if (!existsSync(foundryCss) || !existsSync(sf2eCss)) {
    t.skip(
      "gamesystems/sf2e/ and/or foundryvtt/ not present locally (both gitignored) — " +
        "CSS contract tests need them, skipping loudly rather than failing or silently passing."
    );
    return;
  }
  const sf2eSystem = JSON.parse(
    readFileSync(path.join(repoRoot, "gamesystems", "sf2e", "system.json"), "utf8")
  );
  const foundryPackage = JSON.parse(
    readFileSync(
      path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app", "package.json"),
      "utf8"
    )
  );
  assert.equal(sf2eSystem.version, verifiedVersions.sf2e);
  assert.equal(foundryPackage.version, verifiedVersions.foundry);
});

test("every upstream variable the bridge overrides still exists in Foundry or sf2e", (t) => {
  if (!existsSync(foundryCss) || !existsSync(sf2eCss)) {
    t.skip("Foundry/sf2e source trees absent (gitignored) — cannot verify the CSS contract.");
    return;
  }

  const upstream = new Set([
    ...declaredVars(readFileSync(foundryCss, "utf8")),
    ...declaredVars(readFileSync(sf2eCss, "utf8"))
  ]);

  const bridge = read(BRIDGE);
  // Anything the bridge declares that is not one of ours is, by definition,
  // an upstream property we are overriding.
  const overridden = [...declaredVars(bridge)].filter((v) => !v.startsWith("--bi-"));

  assert.ok(
    overridden.length > 20,
    `only ${overridden.length} upstream overrides found — the bridge should be ` +
      `retinting Foundry/sf2e through their own variables, not out-specifying rules.`
  );

  const missing = overridden.filter((v) => !upstream.has(v));
  assert.deepEqual(
    missing, [],
    `bi-foundry-bridge.css sets custom properties that no longer exist in ` +
      `Foundry ${verifiedVersions.foundry} / sf2e ${verifiedVersions.sf2e}:\n  ${missing.join("\n  ")}\n` +
      `CSS ignores unknown custom properties silently, so these would simply ` +
      `stop theming their part of the UI with no error. Re-derive them from the ` +
      `upgraded source trees, then bump test/fixtures/verified-versions.json.`
  );
});

test("the prototype page loads the real shipped stylesheets", () => {
  // design/ui/style-prototype.html is the review surface for this design. If
  // it ever drifts into carrying its own copy of the palette, reviewing it
  // stops telling us anything about what Foundry will actually render.
  const proto = path.join(repoRoot, "design", "ui", "style-prototype.html");
  assert.ok(existsSync(proto), "design/ui/style-prototype.html is missing");
  const html = readFileSync(proto, "utf8");
  for (const layer of ["bi-tokens.css", "bi-components.css", "bi-foundry-bridge.css"]) {
    assert.ok(
      html.includes(`module/blank-inheritance/styles/${layer}`),
      `the prototype must link the real ${layer} rather than inlining a copy.`
    );
  }
});

test("the bridge styles journals through tokens, never with its own literals", () => {
  // FOUND LIVE 2026-09-05: the bridge's journal block re-implemented the
  // document look with hard-coded hex values and var(--bi-font-body).
  // `body.bi-theme .journal-entry-page` outspecifies `.bi-doc`, so every real
  // Foundry journal silently rendered in the UI body font instead of the
  // document serif — drift hiding in the one file allowed to know Foundry.
  const bridge = read(BRIDGE);
  const journalBlock = bridge.slice(bridge.indexOf(".journal-entry-page"));
  assert.ok(journalBlock.length > 0, "the bridge no longer styles journal pages");

  assert.match(
    journalBlock,
    /font-family:\s*var\(--bi-font-document\)/,
    "journal pages must use --bi-font-document. The body font is for UI prose; " +
      "a Directorate document and a tooltip must not share a typeface."
  );
  assert.ok(
    !/font-family:\s*var\(--bi-font-body\)/.test(journalBlock),
    "the journal block still sets the UI body font somewhere"
  );

  // No raw colours in the journal block: paper colour lives in the tokens.
  const literals = [...journalBlock.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0]);
  const allowed = new Set(["#17130c", "#5c1a0e"]); // heading + emphasis ink
  const strays = literals.filter((c) => !allowed.has(c.toLowerCase()));
  assert.deepEqual(
    strays, [],
    `the bridge hard-codes colours the token layer already owns: ${strays.join(", ")}`
  );
});

test("paper and glass never share a typeface token", () => {
  // The two registers do a functional job: a player must be able to tell at a
  // glance whether they are reading something a person wrote or something a
  // machine measured. Collapsing them into one font destroys that.
  const tokens = read(TOKENS);
  const grab = (name) => {
    const m = tokens.match(new RegExp(`${name}:\s*([^;]+);`));
    return m ? m[1].replace(/\s+/g, " ").trim() : null;
  };
  const document = grab("--bi-font-document");
  const readout = grab("--bi-font-readout");
  const legend = grab("--bi-font-legend");

  assert.ok(document && readout && legend, "a type register token is missing");
  assert.notEqual(document, readout);
  assert.notEqual(document, legend);
  // The document face must not be the panel face.
  assert.ok(
    !document.includes("Bruno Ace"),
    "the document register must not use the engraved panel face"
  );
});

/* ==================================================================
   Wiring — the theme is actually loaded and applied by the module.
   ================================================================== */

test("module.json loads exactly the stylesheets core/theme.mjs declares, in order", async () => {
  // Order is load-bearing: fonts declare the faces tokens name, tokens declare
  // the properties components consume, and the bridge must come LAST because
  // it deliberately out-specifies component defaults on Foundry's selectors.
  const { STYLESHEETS } = await import("../module/blank-inheritance/scripts/core/theme.mjs");
  const manifest = JSON.parse(
    readFileSync(path.join(repoRoot, "module", "blank-inheritance", "module.json"), "utf8")
  );

  assert.ok(Array.isArray(manifest.styles), "module.json has no `styles` array — Foundry would load no CSS at all");
  assert.deepEqual(
    manifest.styles, [...STYLESHEETS],
    "module.json's styles and core/theme.mjs's STYLESHEETS disagree. The manifest is " +
      "what Foundry actually loads; the constant is what the code believes ships."
  );

  for (const rel of manifest.styles) {
    assert.ok(
      existsSync(path.join(repoRoot, "module", "blank-inheritance", rel)),
      `module.json lists ${rel}, which does not exist — Foundry logs a 404 and moves on.`
    );
  }
  assert.equal(
    manifest.styles.at(-1), "styles/bi-foundry-bridge.css",
    "the bridge must load last or its Foundry overrides lose to the component layer"
  );
});

test("the redaction filter ids agree across all three files that use them", async () => {
  // The silent-failure trio: core/redact.mjs writes data-edge="1|2|3",
  // bi-components.css references filter: url(#bi-redact-edge-N), and
  // core/theme.mjs defines those filters. A missing filter reference is
  // ignored by the renderer without any error — the bars would just quietly
  // lose their ragged edge and nobody would know until they looked closely.
  const { filterDefsMarkup } = await import("../module/blank-inheritance/scripts/core/theme.mjs");
  const { redactHtml, CLEARANCE } = await import("../module/blank-inheritance/scripts/core/redact.mjs");

  const defined = new Set([...filterDefsMarkup().matchAll(/id="(bi-redact-edge-\d+)"/g)].map((m) => m[1]));
  assert.ok(defined.size >= 3, "fewer than three edge filters are defined");

  const referenced = new Set(
    [...read(COMPONENTS).matchAll(/url\(#(bi-redact-edge-\d+)\)/g)].map((m) => m[1])
  );
  for (const id of referenced) {
    assert.ok(defined.has(id), `bi-components.css references #${id}, which theme.mjs never defines`);
  }

  // And the variants redact.mjs actually emits must all be referenced by CSS.
  const long = "a".repeat(400);
  const { html } = redactHtml(`<redact c="4">${long}</redact>`, CLEARANCE.OPEN, { salt: "edge-coverage" });
  const emitted = new Set([...html.matchAll(/data-edge="(\d+)"/g)].map((m) => `bi-redact-edge-${m[1]}`));
  assert.ok(emitted.size >= 2, "the sample did not exercise multiple edge variants");
  for (const id of emitted) {
    assert.ok(
      defined.has(id),
      `core/redact.mjs emits ${id}, which theme.mjs never defines — those bars render as plain rectangles`
    );
  }
});

test("theme classes gate correctly, and off leaves nothing behind", async () => {
  const { themeClasses, ALL_THEME_CLASSES, THEME_CLASS, ROSTER_IN_BAR_CLASS } =
    await import("../module/blank-inheritance/scripts/core/theme.mjs");

  assert.deepEqual(themeClasses({ enabled: false }), [], "disabled must add no classes at all");
  assert.deepEqual(themeClasses({ enabled: true }), [THEME_CLASS]);
  assert.deepEqual(
    themeClasses({ enabled: true, rosterInBar: true }).sort(),
    [ROSTER_IN_BAR_CLASS, THEME_CLASS].sort()
  );
  // rosterInBar without the theme would hide Foundry's player list while
  // giving nothing back — the players would simply lose the roster.
  assert.deepEqual(
    themeClasses({ enabled: false, rosterInBar: true }), [],
    "rosterInBar must never apply while the theme is off"
  );
  // Everything themeClasses can return must be in the removal list.
  for (const combo of [{ enabled: true }, { enabled: true, rosterInBar: true }]) {
    for (const cls of themeClasses(combo)) {
      assert.ok(ALL_THEME_CLASSES.includes(cls), `${cls} is not in ALL_THEME_CLASSES, so it would never be removed`);
    }
  }
});

test("every registered setting has a translation string", async () => {
  const { THEME_SETTINGS } = await import("../module/blank-inheritance/scripts/core/theme.mjs");
  const lang = JSON.parse(
    readFileSync(path.join(repoRoot, "module", "blank-inheritance", "lang", "en.json"), "utf8")
  );
  const resolve = (key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), lang);

  for (const setting of THEME_SETTINGS) {
    for (const field of ["name", "hint"]) {
      assert.ok(
        typeof resolve(setting[field]) === "string",
        `setting "${setting.key}" has no ${field} string for ${setting[field]} — ` +
          `Foundry renders the raw key in the settings menu.`
      );
    }
  }
});

/* ==================================================================
   Legibility — the Japanese is content, not texture.
   ================================================================== */

test("no Japanese text is set below the readable floor", () => {
  // FOUND LIVE 2026-09-05: 20 of 21 Japanese elements rendered under 12px,
  // the smallest at 7px. A 7px Latin label is merely small; a 7px Kanji is a
  // smudge, because the strokes merge before the glyph resolves. There are
  // Japanese readers at this table, so this is a legibility bug, not a
  // nitpick — and it is the kind that creeps back one inline style at a time.
  const jpFontTokens = [
    "--bi-font-gothic", "--bi-font-mincho", "--bi-font-display-jp",
    "--bi-font-brush", "--bi-font-hand", "--bi-font-pixel-jp"
  ];
  const tokens = read(TOKENS);
  const floorMatch = tokens.match(/--bi-jp-size-sm:\s*(\d+)px/);
  assert.ok(floorMatch, "bi-tokens.css must declare --bi-jp-size-sm as the floor");
  const floor = Number(floorMatch[1]);
  assert.ok(floor >= 12, `the Japanese floor is ${floor}px; Kanji need at least 12px`);

  const offenders = [];

  // (a) CSS rule blocks that select a Japanese face and also set a size.
  const css = read(COMPONENTS);
  for (const block of css.match(/[^{}]*\{[^{}]*\}/g) ?? []) {
    if (!jpFontTokens.some((t) => block.includes(t))) continue;
    for (const m of block.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      if (Number(m[1]) < floor) {
        offenders.push(`bi-components.css: ${m[0]} in "${block.split("{")[0].trim()}"`);
      }
    }
  }

  // (b) Inline styles in the prototype, which is where it crept in before:
  //     a token-driven rule is easy to police, an inline override is not.
  const html = readFileSync(path.join(repoRoot, "design", "ui", "style-prototype.html"), "utf8");
  for (const m of html.matchAll(/style="([^"]*)"/g)) {
    const decl = m[1];
    if (!jpFontTokens.some((t) => decl.includes(t))) continue;
    for (const f of decl.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      if (Number(f[1]) < floor) offenders.push(`style-prototype.html: ${f[0]} in inline style`);
    }
  }

  assert.deepEqual(
    offenders, [],
    `Japanese text set below the ${floor}px floor:\n  ${offenders.join("\n  ")}\n` +
      `Use var(--bi-jp-size-sm/-jp-size/-jp-size-lg) rather than a raw value.`
  );
});

test("panel legends have real leading", () => {
  // line-height:1 on a tracked-out 10px label reads as a printed strip rather
  // than as type, and stacked labels collide outright.
  const tokens = read(TOKENS);
  const lead = tokens.match(/--bi-legend-leading:\s*([\d.]+)/);
  assert.ok(lead, "bi-tokens.css must declare --bi-legend-leading");
  assert.ok(Number(lead[1]) >= 1.3, `legend leading is ${lead[1]}; needs at least 1.3`);

  const legendRule = read(COMPONENTS).match(/\.bi-legend\s*\{[^}]*\}/);
  assert.ok(legendRule, ".bi-legend rule is missing");
  assert.match(
    legendRule[0], /line-height:\s*var\(--bi-legend-leading\)/,
    ".bi-legend must take its leading from the token, not a literal"
  );
});

/* ==================================================================
   Any width, any height — the console must never assume its own shape.
   ================================================================== */

test(".bi-console fills its parent and assumes no aspect ratio", () => {
  // FOUND LIVE, reported by the user at their own 4K display: .bi-console —
  // the class meant to ship as the real Foundry interface — hardcoded
  // `aspect-ratio: 16/9`. With width:100%, that forces height = width*9/16,
  // which on a wide real browser window is routinely taller than what the
  // browser chrome actually leaves visible. The bottom of the chassis,
  // right cluster included, ended up below the fold — "the right elements
  // are still not visible" was a true symptom of a real bug, not the
  // centring fix from the previous pass failing.
  //
  // The 16:9 box is a demo convenience for comparing the design against a
  // fake scene, and it must live ONLY in the demo page's own <style>
  // (.demo-frame), never in shared component CSS — a demo assumption
  // leaking into the shipped class is exactly how this happened.
  const rule = read(COMPONENTS).match(/\.bi-console\s*\{[^}]*\}/);
  assert.ok(rule, "bi-components.css no longer declares a .bi-console rule");
  const body = rule[0];

  assert.ok(
    !/aspect-ratio/.test(body),
    ".bi-console must not set aspect-ratio — it has to fill whatever shape " +
      "its container is, and a real Foundry viewport is not guaranteed 16:9."
  );
  assert.match(
    body, /height:\s*100%/,
    ".bi-console must fill its parent's height explicitly, or the middle " +
      "'scene' row (1fr) has nothing real to divide up."
  );
  assert.match(
    body, /width:\s*100%/,
    ".bi-console must fill its parent's width explicitly."
  );
});

test("the 16:9 demo frame lives in the prototype page, not in shared CSS", () => {
  // The inverse check: the ratio has to exist SOMEWHERE (it's a real, useful
  // comparison view), just never where Foundry-bound code can inherit it.
  assert.ok(
    !/aspect-ratio/.test(read(COMPONENTS)),
    "no component CSS file may set aspect-ratio anywhere — that constraint " +
      "belongs to the demo page that chooses to display at 16:9, not to a " +
      "class any other page or Foundry itself might reuse."
  );

  const proto = path.join(repoRoot, "design", "ui", "style-prototype.html");
  const html = readFileSync(proto, "utf8");
  assert.match(
    html, /\.demo-frame\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/,
    "style-prototype.html should keep the 16:9 comparison view as its own " +
      "opt-in wrapper class, not as .bi-console's default shape"
  );
  assert.match(
    html, /\.demo-fill\s*\{/,
    "the prototype should also offer a fill-the-real-viewport mode — the " +
      "only way to actually prove 'any width and height' rather than assert it"
  );
});

test(".bi-console overlays its layers with absolute positioning, not CSS Grid", () => {
  // FOUND LIVE, reported by the user at their real 4K display and reproduced
  // directly: .bi-console used `display:grid; grid-template-columns:1fr;`
  // with descendant @container queries (on this same element) conditionally
  // hiding pods several levels down. Measured directly with getComputedStyle:
  // the grid's own single `1fr` COLUMN TRACK resolved to ~3822px while the
  // box itself correctly rendered at ~1175px — `.gridTemplateColumns`
  // reported the mismatch outright, not a measurement artifact (verified
  // with an unrelated 500px probe element in the same pass, which measured
  // correctly). Content beyond the visible width was silently clipped by
  // `overflow:hidden`, always from the right, which is exactly "the right
  // elements are still not visible."
  //
  // .bi-console never needed two-dimensional grid placement: it is three
  // stacked full-width overlay layers (top / scene / bar), not a grid of
  // areas. Every layer is now `position:absolute` inside this
  // `position:relative` box — the most basic layout primitive there is,
  // with no track-sizing pass that a container-query/grid interaction can
  // get wrong in any engine.
  const rule = read(COMPONENTS).match(/\.bi-console\s*\{[^}]*\}/);
  assert.ok(rule, "bi-components.css no longer declares a .bi-console rule");
  assert.ok(
    !/display:\s*grid/.test(rule[0]),
    ".bi-console must not be display:grid — see the FOUND LIVE comment " +
      "above this rule for the exact reproduction of why."
  );

  for (const layer of [".bi-console__scene", ".bi-console__top", ".bi-console__bar"]) {
    const escaped = layer.replace(/[.]/g, "\\$&");
    const layerRule = read(COMPONENTS).match(new RegExp(escaped + String.raw`\s*\{[^}]*\}`));
    assert.ok(layerRule, `${layer} rule is missing`);
    assert.match(
      layerRule[0], /position:\s*absolute/,
      `${layer} must be position:absolute — it is an overlay layer, not a grid participant`
    );
    assert.ok(
      !/grid-area/.test(layerRule[0]),
      `${layer} still references grid-area, which no longer means anything ` +
        "once .bi-console stopped being a grid container"
    );
  }
});

test(".bi-console declares stated width and height floors, not silent collapse", () => {
  // Below either floor the console still renders at a fixed, documented
  // size (and will overflow its own too-small parent, visibly, via a
  // scrollbar) rather than being squeezed into something broken. Verified
  // live down to a 600px-wide / 500px-tall parent: zero elements escaped
  // the console's own bounds at any tested size from 600px to 7680px wide.
  const rule = read(COMPONENTS).match(/\.bi-console\s*\{[^}]*\}/);
  assert.ok(rule, "bi-components.css no longer declares a .bi-console rule");

  const minH = rule[0].match(/min-height:\s*(\d+)px/);
  const minW = rule[0].match(/min-width:\s*(\d+)px/);
  assert.ok(minH, ".bi-console must declare a min-height floor");
  assert.ok(minW, ".bi-console must declare a min-width floor");
  assert.ok(Number(minH[1]) >= 300, "min-height floor looks too small to hold the toprail + chassis");
  assert.ok(
    Number(minW[1]) >= 1185,
    "min-width must be at least 1185px — the measured true minimum for the " +
      "fixed 680px instrument cluster plus the two pods that never shed " +
      "(Checks, Actions). Narrower and they no longer fit side by side."
  );
});

/* ==================================================================
   Pass 6 — rivets removed, concentric corners, a sharper marquee.
   ================================================================== */

test("rivets are gone, everywhere", () => {
  // "Get rid of rivets, they don't work" — removed entirely rather than
  // hidden, so this stays true rather than needing constant re-checking.
  for (const file of [TOKENS, COMPONENTS]) {
    assert.ok(
      !/rivet/i.test(read(file)),
      `${path.relative(repoRoot, file)} still mentions rivets`
    );
  }
});

test("a pod's inset panel line stays concentric with its own corner radius", () => {
  // FOUND LIVE: the score line hard-coded border-radius:3px regardless of
  // the panel's actual corner, so a 22-30px rounded shoulder got a sharp
  // line nested inside a round one. Every --bi-corner-tl/tr a pod variant
  // declares must be read back by the line, not re-guessed.
  const css = read(COMPONENTS);
  const before = css.match(/\.bi-plate-skin::before\s*\{[^}]*\}/);
  assert.ok(before, ".bi-plate-skin::before rule is missing");
  assert.match(
    before[0], /var\(--bi-corner-tl/,
    "the inset line's border-radius must read --bi-corner-tl, not a literal value"
  );
  assert.match(before[0], /var\(--bi-corner-tr/, "…and --bi-corner-tr for the other top corner");
  assert.ok(
    !/border-radius:\s*\d+px;/.test(before[0]),
    "the inset line must not fall back to a flat literal radius"
  );

  // Every pod variant that sets its own top corners must expose them as
  // --bi-corner-tl/tr, or the line above has nothing correct to read.
  for (const variant of [".bi-pod", ".bi-pod--tall", ".bi-pod--crest", ".bi-pod--crest-r", ".bi-pod--slant"]) {
    const escaped = variant.replace(/[.]/g, "\$&");
    const rule = css.match(new RegExp(escaped + String.raw`\s*\{[^}]*\}`));
    assert.ok(rule, `${variant} rule is missing`);
    assert.match(rule[0], /--bi-corner-tl:/, `${variant} must declare --bi-corner-tl`);
    assert.match(rule[0], /--bi-corner-tr:/, `${variant} must declare --bi-corner-tr`);
  }
});

test("the marquee is chamfered, not a fully-rounded lozenge", () => {
  const css = read(COMPONENTS);
  const rule = css.match(/\.bi-marquee\s*\{[^}]*\}/);
  assert.ok(rule, ".bi-marquee rule is missing");
  assert.ok(
    !/border-radius:\s*calc\(var\(--bi-marquee-height\)/.test(rule[0]),
    ".bi-marquee must not derive a pill radius from half its own height"
  );
  assert.match(rule[0], /clip-path:\s*polygon/, ".bi-marquee should cut chamfered corners via clip-path");
});

test("the marquee scrolls at half its original speed", () => {
  const run = read(COMPONENTS).match(/\.bi-marquee__run\s*\{[^}]*\}/);
  assert.ok(run, ".bi-marquee__run rule is missing");
  const dur = run[0].match(/animation:\s*bi-marquee\s+(\d+)s/);
  assert.ok(dur, "no animation-duration found on .bi-marquee__run");
  assert.equal(Number(dur[1]), 84, "expected 84s (double the original 42s — half speed, not half duration)");
});

/* ==================================================================
   Pass 7 — the button colour language must respect the one standing
   rule about Resonance violet, and the ident instrument must exist.
   ================================================================== */

test("--bi-resonance is used by exactly one key variant: .bi-key--anchor", () => {
  // Standing rule (design/visual-identity.md §1): Resonance violet is
  // reserved for Resonance/Bleed/Anchors/Claimants. Extending a functional
  // colour language to buttons is exactly the kind of change that could
  // spend it somewhere ordinary by accident, so this is checked directly
  // rather than trusted to code review alone.
  const css = read(COMPONENTS);
  const keyRules = [...css.matchAll(/\.bi-key(--[\w-]+)?[^{]*\{[^}]*\}/g)]
    .filter((m) => /--bi-resonance/.test(m[0]));
  for (const rule of keyRules) {
    assert.match(
      rule[0], /\.bi-key--anchor/,
      `a .bi-key rule other than --anchor uses --bi-resonance: ${rule[0].slice(0, 60)}...`
    );
  }
  assert.ok(keyRules.length > 0, ".bi-key--anchor itself should be the one match — none found at all");
});

test("the pilot ID instrument escapes above the WHOLE chassis, not just its pod", () => {
  // FOUND LIVE: the previous version escaped its pod via a negative
  // margin-top, but the pod was a .bi-pod, and .bi-bar .bi-pod sets
  // overflow:hidden (so a two-row key bank can never spill into a
  // neighbour) — which silently clipped the escape. It never actually
  // cleared the pod on screen. The fix is structural: the instrument is
  // now a sibling of any .bi-pod, inside a plain positioning host, the
  // same pattern .bi-bar__cluster already uses for the main dome. This
  // test pins that structure down directly so the clipping bug cannot
  // silently return under a different selector.
  const css = read(COMPONENTS);
  const html = readFileSync(path.join(repoRoot, "design", "ui", "style-prototype.html"), "utf8");

  const host = css.match(/\.bi-pilot-id\s*\{[^}]*\}/);
  assert.ok(host, ".bi-pilot-id (the escape host) is missing");
  assert.match(host[0], /position:\s*relative/, ".bi-pilot-id must be a positioning context");
  assert.match(host[0], /height:\s*var\(--bi-bar-height\)/,
    ".bi-pilot-id must span the FULL chassis row height — that is what makes " +
      "an oversized child's bottom:0 clear the bar's own top edge, not just its pod's");
  assert.doesNotMatch(host[0], /overflow:\s*hidden/, ".bi-pilot-id must not clip its own child");

  const ident = css.match(/\.bi-ident\s*\{[^}]*\}/);
  assert.ok(ident, ".bi-ident rule is missing");
  assert.match(ident[0], /position:\s*absolute/, ".bi-ident must escape via absolute positioning, not flow");
  assert.match(ident[0], /bottom:\s*0/, ".bi-ident must anchor to the bottom of its host, like the main dome");
  assert.match(ident[0], /height:\s*var\(--bi-ident-h\)/, ".bi-ident must use the shared height token");

  const hMatch = host[0].match(/--bi-ident-h:\s*calc\(var\(--bi-bar-height\)\s*\*\s*([\d.]+)\)/);
  assert.ok(hMatch, "--bi-ident-h must be a multiple of the bar height, not a literal pixel value");
  assert.ok(Number(hMatch[1]) > 1,
    `the instrument must be TALLER than the chassis row (got ${hMatch[1]}x) — that is ` +
      "the only way its bottom-anchored top can clear the bar's own top line");
  const wMatch = host[0].match(/--bi-ident-w:\s*(\d+)px/);
  assert.ok(wMatch && Number(wMatch[1]) >= 130, "--bi-ident-w should be meaningfully bigger than the old 92px square");

  // The DOM check that actually rules the original bug back out: .bi-ident
  // must be the FIRST thing inside .bi-pilot-id, not nested inside the
  // plate pod (a .bi-pod) — if it ever moved back inside a .bi-pod, the
  // global `.bi-bar .bi-pod { overflow: hidden }` rule would clip it again.
  assert.match(html, /<div class="bi-pilot-id"[^>]*>\s*<div class="bi-ident">/,
    ".bi-ident must be the direct first child of .bi-pilot-id, not nested inside a .bi-pod");
  assert.match(html, /bi-ident__value">04</, "the ident instrument should still show the candidate number");

  // "More information": the panel now carries Sync AND a live Bleed
  // reading, not a single bare readout.
  assert.match(html, /bi-ident__stat--bleed/, "the ident should carry a Bleed reading");
  assert.match(html, /id="ident-bleed-out"/, "the Bleed readout must be wired up, not decorative");
  assert.match(html, /id="ident-bleed-meter"/, "the Bleed meter must be wired up, not decorative");

  const js = readFileSync(path.join(repoRoot, "design", "ui", "console.js"), "utf8");
  assert.match(js, /identBleedMeter[\s\S]*?setProperty\("--v"/,
    "the ident's Bleed meter must be driven by the same Bleed control as the rest of the chassis");
});

/* ==================================================================
   Pass 9 — the chassis sheds PER SIDE, the floor is heavier-side math,
   and the test bed measures itself.
   ================================================================== */

test("each chassis side group sheds against its OWN width, not the console's", () => {
  // FOUND LIVE: a single console-wide ladder let the heavier (left) cluster
  // slide 25px under the left subdome at a 2532px console while the right
  // cluster still had 200px spare. Each side is now its own container.
  const css = stripComments(read(COMPONENTS));
  assert.match(css, /\.bi-bar__group--left\s*\{[^}]*container-type:\s*inline-size[^}]*container-name:\s*bi-bar-left/);
  assert.match(css, /\.bi-bar__group--right\s*\{[^}]*container-type:\s*inline-size[^}]*container-name:\s*bi-bar-right/);
  assert.doesNotMatch(css, /@container bi-console/, "the old console-wide shedding queries must be gone");
  for (const side of ["left", "right"]) {
    for (const pri of ["2", "3", "4"]) {
      const re = new RegExp(String.raw`@container bi-bar-${side} \(width < \d+px\)\s*\{\s*\.bi-bar__group--${side}\s+\[data-bi-priority="${pri}"\]\s*\{\s*display:\s*none;?\s*\}\s*\}`);
      assert.match(css, re, `${side} side lacks a priority-${pri} shedding query`);
    }
  }
  // The ladder must be monotonic per side: higher priority number sheds first.
  for (const side of ["left", "right"]) {
    const px = ["2", "3", "4"].map((pri) =>
      Number(css.match(new RegExp(String.raw`@container bi-bar-${side} \(width < (\d+)px\)\s*\{\s*\.bi-bar__group--${side}\s+\[data-bi-priority="${pri}"\]`))[1]));
    assert.ok(px[0] < px[1] && px[1] < px[2], `${side} thresholds must rise with priority: ${px.join(" < ")}`);
  }
});

test("the console width floor is derived from the heavier side, not a sum", () => {
  // FOUND LIVE: 1200px was Checks + Actions + cluster. The side tracks are
  // halves, so the floor is 2 x the widest never-shed pod + cluster + padding
  // + gaps = 1276px. Anything below lets Checks run under the left subdome.
  const css = stripComments(read(COMPONENTS));
  const m = css.match(/\.bi-console\s*\{[^}]*min-width:\s*(\d+)px/);
  assert.ok(m, ".bi-console has no min-width");
  assert.ok(Number(m[1]) >= 1188, `min-width ${m[1]}px is below the measured 1188px floor`);
});

test("the Direction module sits in the LEFT group, in the ident pod's slot", () => {
  // The two are traded (GM shows Direction, hides ident). Keeping them in the
  // same group is what lets one set of left-side thresholds cover both modes;
  // with Direction on the right, GM mode overflowed the right track by 16px.
  const html = readFileSync(path.join(repoRoot, "design", "ui", "style-prototype.html"), "utf8");
  const left = html.indexOf('class="bi-bar__group bi-bar__group--left"');
  const right = html.indexOf('class="bi-bar__group bi-bar__group--right"');
  const gm = html.indexOf('id="gm-pod"');
  const ident = html.indexOf('id="ident-pod"');
  assert.ok(left > -1 && right > -1 && gm > -1 && ident > -1, "expected markers missing from the prototype");
  assert.ok(gm > left && gm < right, "#gm-pod is not inside the left group");
  assert.ok(ident > left && ident < right, "#ident-pod is not inside the left group");
  const js = readFileSync(path.join(repoRoot, "design", "ui", "console.js"), "utf8");
  assert.match(js, /\$\("#ident-pod"\)/, "console.js must select the ident pod by id, not by priority attribute");
});

test("the console scales as one unit through --bi-ui-scale and zoom", () => {
  const tokens = stripComments(read(TOKENS));
  const css = stripComments(read(COMPONENTS));
  assert.match(tokens, /--bi-ui-scale:\s*1;/, "--bi-ui-scale token (default 1) missing");
  assert.match(css, /\.bi-console\s*\{[^}]*zoom:\s*var\(--bi-ui-scale,\s*1\)/, ".bi-console must zoom by --bi-ui-scale");
  // zoom, not transform: a transform does not take part in layout, so the
  // per-side container queries would measure unscaled px and the ladder
  // would shed at the wrong widths.
  assert.doesNotMatch(css, /\.bi-console\s*\{[^}]*transform:\s*scale/);
});

test("the prototype measures its own layout and reports it", () => {
  const js = readFileSync(path.join(repoRoot, "design", "ui", "console.js"), "utf8");
  assert.match(js, /function runDiagnostics\(\)/, "runDiagnostics() missing");
  assert.match(js, /window\.biDiagnostics\s*=\s*runDiagnostics/, "diagnostics must be reachable from automation");
  // Resize -> layoutScene -> runDiagnostics: the markers are re-placed
  // first, then measured, so the readout never reports a stale layout.
  assert.match(js, /new ResizeObserver\([\s\S]*?layoutScene/, "the scene must re-layout on resize");
  assert.match(js, /function layoutScene\(\)[\s\S]*?runDiagnostics\(\);/, "layoutScene must end by running diagnostics");
  for (const check of ["over its track", "subdome overlapped", "under top rail", "under chassis", "off the frame"]) {
    assert.ok(js.includes(check), `diagnostics no longer checks: ${check}`);
  }
  const html = readFileSync(path.join(repoRoot, "design", "ui", "style-prototype.html"), "utf8");
  assert.match(html, /id="demo-diag"/, "the toolbar readout element is missing");
});

test("small keys and the ident labels clear the 4K readability floor", () => {
  // Nine-pixel tracked-out capitals were the most common "hard to read"
  // element in the user's own 4K screenshots. 10px is the floor for any
  // Latin label on the chassis; 7px macro keys and 8px ident legends were
  // the worst offenders.
  const css = stripComments(read(COMPONENTS));
  const size = (sel) => {
    const m = css.match(new RegExp(String.raw`${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\s*\{[^}]*font-size:\s*(\d+)px`));
    assert.ok(m, `${sel} has no px font-size`);
    return Number(m[1]);
  };
  assert.ok(size(".bi-key--sm") >= 10, ".bi-key--sm below 10px");
  assert.ok(size(".bi-ident__label") >= 10, ".bi-ident__label below 10px");
  assert.ok(size(".bi-ident__stat-value") >= 11, ".bi-ident__stat-value below 11px");
  assert.ok(size(".bi-macro__key") >= 8, ".bi-macro__key below 8px");
  assert.ok(size(".bi-marquee__cap") >= 10, ".bi-marquee__cap below 10px");
});


/* ==================================================================
   Pass 10 — the main dome's protrusion was brought down on live
   feedback ("about half way up the smaller circle displays"), without
   dragging the flanking subdomes or the HUD's Japanese text down with it.
   ================================================================== */

test("the main dome's protrusion above the chassis was roughly halved, per live feedback", () => {
  const tokens = read(TOKENS);
  const m = tokens.match(/--bi-dome-size:\s*calc\(var\(--bi-bar-height\)\s*\*\s*([\d.]+)\)/);
  assert.ok(m, "--bi-dome-size must stay expressed as a multiple of --bi-bar-height, not a literal pixel value");
  const multiplier = Number(m[1]);
  // Protrusion above the bar = (multiplier - 1) x bar-height, since the dome
  // is bottom-anchored to the bar's own bottom edge. multiplier=2 gave a
  // FULL bar-height of protrusion (168px), reported live as looming far
  // higher than the flanking subdomes; multiplier=1.5 halves that to 84px.
  assert.equal(multiplier, 1.5,
    `--bi-dome-size multiplier is ${multiplier}x; expected exactly 1.5x -- half the ORIGINAL ` +
      "protrusion (a full bar-height) above the bar, matching the request directly");
});

test("the flanking subdomes' size no longer depends on the main dome's own size", () => {
  // FOUND LIVE: --bi-dome-half used to be `calc(var(--bi-dome-size) / 2)` --
  // one formula shared by both instruments. Bringing the main dome down
  // would therefore have silently shrunk the subdomes too, which nobody
  // asked for. --bi-dome-half is now its own independent invariant.
  const tokens = read(TOKENS);
  const half = tokens.match(/--bi-dome-half:\s*([^;]+);/);
  assert.ok(half, "--bi-dome-half is missing from bi-tokens.css");
  assert.doesNotMatch(half[1], /--bi-dome-size/, "--bi-dome-half must not be derived from --bi-dome-size any more");
  assert.match(half[1], /var\(--bi-bar-height\)/, "--bi-dome-half should be pinned directly to --bi-bar-height");
});

test("the dome HUD's Japanese text still clears the readable floor after the resize", () => {
  // A plain "is the px value in this rule >= 12" check (the general
  // Japanese-floor test above) cannot see this: .bi-hud__jp's font-size is
  // in SVG USER UNITS, scaled by whatever --bi-dome-size/viewBox ratio is
  // live at the time, not a literal CSS pixel value. Shrinking the dome
  // without rescaling this number would pass that generic test while the
  // real rendered text quietly dropped under the floor -- so this computes
  // the actual effective size the same way the browser would.
  const tokens = read(TOKENS);
  const css = read(COMPONENTS);
  const html = readFileSync(path.join(repoRoot, "design", "ui", "style-prototype.html"), "utf8");

  const barHeight = Number(tokens.match(/--bi-bar-height:\s*(\d+)px/)[1]);
  const multiplier = Number(tokens.match(/--bi-dome-size:\s*calc\(var\(--bi-bar-height\)\s*\*\s*([\d.]+)\)/)[1]);
  const domeSizePx = barHeight * multiplier;

  const viewBoxMatch = html.match(/class="bi-dome__svg" viewBox="0 0 (\d+)/);
  assert.ok(viewBoxMatch, "could not find the dome HUD's SVG viewBox width in the prototype");
  const viewBoxWidth = Number(viewBoxMatch[1]);

  const jpRule = css.match(/\.bi-hud__jp\s*\{[^}]*\}/);
  assert.ok(jpRule, ".bi-hud__jp rule is missing");
  const jpUnits = Number(jpRule[0].match(/font-size:\s*(\d+(?:\.\d+)?)px/)[1]);

  const scale = domeSizePx / viewBoxWidth;
  const effectivePx = jpUnits * scale;
  assert.ok(
    effectivePx >= 12 - 1e-6,
    `the dome's Japanese HUD text renders at ~${effectivePx.toFixed(1)}px ` +
      `(dome ${domeSizePx}px / viewBox ${viewBoxWidth} x ${jpUnits} raw units) -- below the 12px floor. ` +
      "If --bi-dome-size or the SVG viewBox ever changes again, .bi-hud__jp's raw unit value " +
      "must be rescaled by the same ratio to compensate."
  );
});


/* ==================================================================
   Pass 12 — lit lamps in the floating rails were showing with half
   their glow clipped: a real CSS Overflow spec gotcha
   (overflow-y:auto with overflow-x left unset silently computes BOTH
   axes to auto), not a typo anywhere. Fixed by declaring overflow-x
   explicitly and giving every lamp-bearing row real left clearance.
   ================================================================== */

/** Parse a CSS padding SHORTHAND value into {top,right,bottom,left} px. */
function parsePadding(value) {
  const parts = value.trim().split(/\s+/).map((p) => {
    const m = p.match(/^(-?\d+(?:\.\d+)?)px$/);
    return m ? Number(m[1]) : null;
  });
  if (parts.some((p) => p === null)) return null;
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 2) return { top: parts[0], bottom: parts[0], right: parts[1], left: parts[1] };
  if (parts.length === 3) return { top: parts[0], right: parts[1], left: parts[1], bottom: parts[2] };
  if (parts.length === 4) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  return null;
}

/** A lit lamp's worst-case outward bleed in px, computed from its own
 *  box-shadow rule rather than assumed -- so this stays correct if the
 *  glow is ever retuned. */
function litLampGlowReach(css) {
  const rule = css.match(/\.bi-lamp--lit\s*\{[^}]*\}/);
  if (!rule) return null;
  const decl = rule[0].match(/box-shadow:\s*([^;]+);/s);
  if (!decl) return null;
  let maxReach = 0;
  for (const layer of decl[1].split(",")) {
    if (/\binset\b/.test(layer)) continue;   // inset shadows don't bleed outward
    // box-shadow layers are `offsetX offsetY [blur [spread]] color`, and a
    // zero length is valid unitless CSS (`0`, not `0px`) — this reads the
    // leading run of length tokens (however many there are) and stops at
    // the colour (var(...), rgb(...), a hex value), rather than assuming
    // every length carries a px suffix.
    const m = layer.trim().match(/^((?:-?[\d.]+(?:px)?\s+){1,3}-?[\d.]+(?:px)?)/);
    if (!m) continue;
    const nums = m[1].trim().split(/\s+/).map((s) => Number(s.replace("px", "")));
    const blur = nums[2] || 0;
    const spread = nums[3] || 0;
    maxReach = Math.max(maxReach, blur + spread);
  }
  return maxReach;
}

test("floating-rail scroll areas declare overflow-x explicitly, not by CSS Overflow accident", () => {
  // FOUND LIVE: .bi-rail__scroll set overflow-y:auto and left overflow-x
  // unset. Per the CSS Overflow spec, "if one of overflow-x/overflow-y is
  // visible and the other is not, the visible one computes to auto
  // instead" -- so overflow-x was silently auto all along, clipping a lit
  // lamp's box-shadow glow at the container's own left edge. Confirmed
  // live: getComputedStyle(scrollEl).overflowX === "auto" before this fix.
  const css = read(COMPONENTS);
  const rule = css.match(/\.bi-rail__scroll\s*\{[^}]*\}/);
  assert.ok(rule, ".bi-rail__scroll rule is missing");
  assert.match(rule[0], /overflow-x:\s*hidden/,
    ".bi-rail__scroll must declare overflow-x explicitly -- leaving it unset lets the " +
      "CSS Overflow spec silently pick `auto` for it, which is the exact bug this pins down");
});

test("every lamp-bearing rail row keeps enough left clearance to clear a lit lamp's own glow", () => {
  const css = read(COMPONENTS);
  const reach = litLampGlowReach(css);
  assert.ok(reach > 0, "could not compute .bi-lamp--lit's glow reach from its own box-shadow rule");

  for (const sel of [".bi-role", ".bi-unit"]) {
    const rule = css.match(new RegExp(String.raw`${sel.replace(".", "\\.")}\s*\{[^}]*\}`));
    assert.ok(rule, `${sel} rule is missing`);
    const m = rule[0].match(/padding:\s*([^;]+);/);
    assert.ok(m, `${sel} has no padding declaration`);
    const pad = parsePadding(m[1]);
    assert.ok(pad, `${sel}'s padding shorthand "${m[1]}" could not be parsed`);
    assert.ok(
      pad.left > reach,
      `${sel}'s left padding (${pad.left}px) does not clear a lit lamp's glow ` +
        `(reaches ~${reach}px) -- its lamp is the first child, sitting flush against ` +
        `.bi-rail__scroll's own clipping edge otherwise`
    );
  }

  const js = readFileSync(path.join(repoRoot, "design", "ui", "console.js"), "utf8");
  const factsRow = js.match(/padding:\s*2px\s+[\d.]+px\s+2px\s+([\d.]+)px/);
  assert.ok(factsRow, "the Known-facts row template no longer sets the expected 4-value padding shorthand");
  assert.ok(
    Number(factsRow[1]) > reach,
    `the Known-facts row's left padding (${factsRow[1]}px) does not clear a lit lamp's glow (~${reach}px)`
  );
});


/* ==================================================================
   Pass 14 — "poor visibility": the risk gauge's unlit segments were
   the same colour as the glass they sit on, and the marker stems were
   too thin/faint to reliably read against a real photo background.
   ================================================================== */

test("the risk gauge's unlit segments are visibly distinct from the screen glass behind them", () => {
  // FOUND LIVE: .bi-marker__gauge i's unlit fill (--bi-phosphor-bed,
  // #0d1c14) was effectively the SAME colour as .bi-screen's own glass
  // background (--bi-mat-screen fades to that exact value), so an unlit
  // segment was invisible against its own backdrop -- a 5-segment gauge
  // that only ever shows the LIT segments is not a gauge, it is a stray
  // green rectangle with no sense of scale.
  const css = read(COMPONENTS);
  const rule = css.match(/\.bi-marker__gauge i\s*\{[^}]*\}/);
  assert.ok(rule, ".bi-marker__gauge i rule is missing");
  assert.doesNotMatch(
    rule[0], /background:\s*var\(--bi-phosphor-bed\)/,
    "the unlit gauge segment must not fill with --bi-phosphor-bed -- that is " +
      "the exact colour .bi-screen's own glass fades to, which is why it was invisible"
  );
  // Tied to --risk (not a fixed colour) so every band's unlit track stays
  // visually related to that band's own lit colour, rather than a fixed
  // green track sitting oddly under an amber or vermilion lit segment.
  assert.match(rule[0], /var\(--risk/, "the unlit segment should stay tied to the gauge's own --risk colour");
});

test("marker stems keep a strong dark halo, since they cross real photo imagery, not a flat demo colour", () => {
  // FOUND LIVE, reported as "poor visibility": a 2px coloured line with
  // only a 1px/55%-opacity dark halo reads fine over the flat colours used
  // while building the feature, and disappears against a busy, brightly
  // lit real aerial photo. Verified against the actual box-shadow spread,
  // not a specific opacity number, so this stays correct if the halo is
  // ever retuned rather than only checking today's exact values.
  const css = read(COMPONENTS);
  const rule = css.match(/\.bi-marker__stem\s*\{[^}]*\}/);
  assert.ok(rule, ".bi-marker__stem rule is missing");
  const halo = rule[0].match(/box-shadow:\s*0\s+0\s+0\s+([\d.]+)px\s+rgb\(0 0 0 \/ (\d+)%\)/);
  assert.ok(halo, ".bi-marker__stem must carry a dark halo box-shadow to read against photo imagery");
  assert.ok(Number(halo[1]) >= 1.5, `stem halo spread is ${halo[1]}px; expected at least 1.5px`);
  assert.ok(Number(halo[2]) >= 70, `stem halo opacity is ${halo[2]}%; expected at least 70%`);
});

test("our sidebar-gutter token still matches Foundry's own", (t) => {
  // bi-foundry-bridge.css keeps the command bar's controls clear of the
  // sidebar by reserving --sidebar-width + --bi-sidebar-gutter. The width is a
  // real Foundry variable we can read; the gutter is declared ON #sidebar
  // (--sidebar-scroll-gutter) and so is not inherited anywhere our rule can
  // reach it, which is why we mirror it. A mirror nobody checks is just a
  // number that used to be right.
  const foundryCssPath = foundryCss;
  if (!existsSync(foundryCssPath)) {
    t.skip("foundryvtt/ not present locally (gitignored) — skipping loudly rather than passing.");
    return;
  }

  const theirs = readFileSync(foundryCssPath, "utf8").match(/--sidebar-scroll-gutter:\s*(\d+)px/);
  assert.ok(theirs, "Foundry no longer declares --sidebar-scroll-gutter — re-derive the reserved width");

  const tokens = readFileSync(path.join(repoRoot, "module", "blank-inheritance", "styles", "bi-tokens.css"), "utf8");
  const ours = tokens.match(/--bi-sidebar-gutter:\s*(\d+)px/);
  assert.ok(ours, "bi-tokens.css no longer declares --bi-sidebar-gutter");

  assert.equal(
    ours[1],
    theirs[1],
    `--bi-sidebar-gutter is ${ours[1]}px but Foundry's --sidebar-scroll-gutter is now ${theirs[1]}px. ` +
      `The command bar's pods would sit ${Math.abs(ours[1] - theirs[1])}px wrong relative to the sidebar.`
  );

  // And the rule that consumes it must still exist.
  const bridge = readFileSync(path.join(repoRoot, "module", "blank-inheritance", "styles", "bi-foundry-bridge.css"), "utf8");
  assert.match(bridge, /#sidebar-content\.expanded/, "the bridge no longer reacts to the sidebar being open");
  assert.match(bridge, /--bi-sidebar-gutter/, "the bridge no longer uses the mirrored gutter token");
});
