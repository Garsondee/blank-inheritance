// Tier 3 — the Scene Runner's host lets the pointer through while the drawer is closed.
//
// FOUND LIVE 2026-10-01, with real pointer events against the local Foundry: `#bi-scene-runner`, the ApplicationV2 root the Scene
// Runner mounts in #interface, is a full-height box down the left of the screen (826 x 744 at 1920 x 1080). While the drawer was
// CLOSED it was empty, but an empty box still wins the hit test, so document.elementFromPoint returned the host instead of
// canvas#board anywhere inside it. Foundry's MouseManager#onWheel gives up unless elementFromPoint is the board, so the wheel
// stopped zooming there; a right-button drag could not pan; a click could not reach a token; and the Stagecraft stage canvas, which
// sits at the same layer, could not be clicked either. The drawer's own shell had been click-through when closed all along
// (`.bi-runner-shell { pointer-events: none }`); the host around it, which owns the same box, never was.
//
// The fix is the idiom #bi-stage, #bi-command-bar and #bi-session-rail already use: the root is click-through and the parts that
// take input opt back in. This file pins the STYLESHEET half. The BROWSER half, which is the only thing that can say what a hand
// can actually do (hit tests, a real press, a wheel turn, a drag, the deck's pill, the drawer's edge, the floating toggle, and an
// audit of every adventure overlay for boxes that catch clicks while painting nothing), is
//     node tools/overlay-check/click-through.mjs
// It needs a running Foundry, so it is run by hand, like tools/stagecraft/foundry-check.mjs; its header comment is the usage.
//
// Read as source, like every tier3-*-contract.test.mjs here: the adapters destructure foundry.applications.api at module scope and
// cannot be imported under plain node:test. Needs no source trees; always runs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripCssComments } from "./support/css-lint.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (...parts) => readFileSync(path.join(moduleRoot, ...parts), "utf8");

/* ---------------------------------------------------------------- */
/*  A small CSS reader: enough to ask "what does this selector set"  */
/* ---------------------------------------------------------------- */

/** Split `text` on `sep` wherever it is not inside parentheses, brackets or a string. */
function splitTop(text, sep) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === sep && depth === 0) { out.push(text.slice(start, i)); start = i + 1; }
  }
  out.push(text.slice(start));
  return out;
}

const normaliseSelector = (s) => s.trim().replace(/\s+/g, " ");

function declarations(body) {
  const decls = new Map();
  for (const piece of splitTop(body, ";")) {
    const colon = piece.indexOf(":");
    if (colon === -1) continue;
    const prop = piece.slice(0, colon).trim().toLowerCase();
    const value = piece.slice(colon + 1).replace(/!important\s*$/i, "").trim().replace(/\s+/g, " ");
    if (prop) decls.set(prop, value);                                      // the last declaration in a rule wins
  }
  return decls;
}

/** Every style rule in a stylesheet in source order, flattened out of @media / @container / @supports / @layer. */
function styleRules(css) {
  const text = stripCssComments(css);
  const rules = [];
  const walk = (src) => {
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf("{", i);
      if (open === -1) break;
      let depth = 1;
      let j = open + 1;
      while (j < src.length && depth) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; j++; }
      const raw = src.slice(i, open);
      const prelude = raw.slice(raw.lastIndexOf(";") + 1).trim();           // a statement like @import ends at its own semicolon
      const body = src.slice(open + 1, j - 1);
      if (/^@(media|container|supports|layer)\b/i.test(prelude)) walk(body);
      else if (prelude && !prelude.startsWith("@")) rules.push({ selectors: splitTop(prelude, ",").map(normaliseSelector), decls: declarations(body) });
      i = j;
    }
  };
  walk(text);
  return rules;
}

/** The last compound selector: what the rule actually styles, after any ancestors and combinators. */
function subject(selector) {
  let depth = 0;
  let from = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && (c === " " || c === ">" || c === "+" || c === "~")) from = i + 1;
  }
  return selector.slice(from);
}

/** A compound selector without its pseudo-classes, pseudo-elements and attribute selectors: `#a.b:not(.c:has(.d))[x]` -> `#a.b`. */
function withoutStates(compound) {
  let out = "";
  for (let i = 0; i < compound.length; i++) {
    const c = compound[i];
    if (c === "[") { while (i < compound.length && compound[i] !== "]") i++; continue; }
    if (c === ":") {
      while (compound[i] === ":") i++;
      while (/[\w-]/.test(compound[i] ?? "")) i++;
      if (compound[i] === "(") { let depth = 0; do { if (compound[i] === "(") depth++; else if (compound[i] === ")") depth--; i++; } while (i < compound.length && depth); }
      i--;
      continue;
    }
    out += c;
  }
  return out;
}

/** What the LAST rule in source order that lists exactly this selector says for `prop` (undefined when none does). */
function declared(rules, selector, prop) {
  const hits = rules.filter((r) => r.selectors.includes(selector) && r.decls.has(prop));
  return hits.length ? hits.at(-1).decls.get(prop) : undefined;
}

const bridge = styleRules(read("styles", "bi-foundry-bridge.css"));
const components = styleRules(read("styles", "bi-components.css"));

/* ---------------------------------------------------------------- */
/*  The reader itself (so a wrong answer below can be trusted)       */
/* ---------------------------------------------------------------- */

test("the CSS reader flattens at-rules, splits selector lists and declarations at the top level, and ignores comments", () => {
  const rules = styleRules(`
    /* .nope { pointer-events: auto } */
    @import url("x.css");
    a, b:is(c, d) > e { color: red; background: url(data:image/png;base64,AAA) ; pointer-events: none !important }
    @media (max-width: 10px) { .f { pointer-events: auto; pointer-events: none } }
    @keyframes k { from { opacity: 0 } to { opacity: 1 } }
  `);
  assert.deepEqual(rules.map((r) => r.selectors), [["a", "b:is(c, d) > e"], [".f"]]);
  assert.equal(rules[0].decls.get("pointer-events"), "none", "!important is not part of the value");
  assert.equal(rules[0].decls.get("background"), "url(data:image/png;base64,AAA)", "a semicolon inside url() does not end the declaration");
  assert.equal(rules[1].decls.get("pointer-events"), "none", "the last declaration in a rule wins");
  assert.equal(subject("body.bi-theme:has(#a .b) #bi-scene-runner"), "#bi-scene-runner");
  assert.equal(subject("#bi-command-bar > *"), "*");
  assert.equal(withoutStates("#bi-scene-runner.x:hover:not(.a:has(.b))[data-k=\"v\"]::before"), "#bi-scene-runner.x");
});

/* ---------------------------------------------------------------- */
/*  The host                                                         */
/* ---------------------------------------------------------------- */

test("the Scene Runner's host is click-through: an empty box still wins the hit test (regression: it swallowed every click, drag and wheel turn over the left of the board, 2026-10-01)", () => {
  assert.equal(
    declared(bridge, "body.bi-theme #bi-scene-runner", "pointer-events"),
    "none",
    "the closed drawer's host must be pointer-events: none -- it is a 826 x 744 empty box over the canvas while closed"
  );
});

test("the floating toggle opts back in, because it inherits `none` from the host and is the way back in when the deck has not mounted", () => {
  assert.equal(
    declared(bridge, "body.bi-theme .bi-runner-toggle", "pointer-events"),
    "auto",
    ".bi-runner-toggle must say pointer-events: auto itself; otherwise a click-through host makes the fallback door dead"
  );
});

test("the drawer's shell is the only part of the host that takes input, and only while open", () => {
  assert.equal(declared(components, ".bi-runner-shell", "pointer-events"), "none", "a closed (slid-away) shell must not catch the pointer");
  assert.equal(declared(components, ".bi-runner-shell--open", "pointer-events"), "auto", "an open shell must take input again");
});

test("nothing makes the host hit-testable again while the drawer is closed", () => {
  // Any rule that can style the host (its id or its class, whatever pseudo-class or attribute narrows it -- `:hover` matches an
  // ANCESTOR of the hovered toggle, so it would switch the box back on the moment the pointer reached the button) and that sets
  // pointer-events must either keep it `none` or be scoped to the open drawer.
  const isHost = (compound) => /#bi-scene-runner(?![\w-])|\.bi-runner-host(?![\w-])/.test(withoutStates(compound));
  const offenders = [];
  for (const rule of [...bridge, ...components]) {
    if (!rule.decls.has("pointer-events")) continue;
    for (const selector of rule.selectors) {
      if (!isHost(subject(selector))) continue;
      if (rule.decls.get("pointer-events") === "none" || selector.includes(".bi-runner-shell--open")) continue;
      offenders.push(`${selector} { pointer-events: ${rule.decls.get("pointer-events")} }`);
    }
  }
  assert.deepEqual(offenders, [], "a rule re-enables pointer events on the Scene Runner's host with the drawer closed");
});

test("the host the stylesheet targets is the element the Scene Runner really mounts, and it has no window frame of its own", () => {
  const src = read("scripts", "foundry", "scene-runner.mjs");
  assert.match(src, /id:\s*"bi-scene-runner"/, "the ApplicationV2 id changed; the click-through rule targets #bi-scene-runner");
  assert.match(src, /classes:\s*\["bi-runner-host"\]/);
  assert.match(src, /window:\s*\{\s*frame:\s*false,\s*positioned:\s*false\s*\}/, "the host is the bare root (no Foundry window frame), so its own box is what the rule governs");
});

test("the frame inside the host has exactly two children, the toggle and the shell -- a third one would inherit `none` and be dead", () => {
  // Template-level tripwire for the reason above: everything in the host inherits pointer-events: none unless it says otherwise.
  // Whoever adds a third child to .bi-runner-frame must give it pointer-events: auto (and then list it here).
  const src = read("templates", "runner", "panel.hbs").replace(/\{\{!--[\s\S]*?--\}\}/g, "").replace(/\{\{![\s\S]*?\}\}/g, "");
  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  const stack = [];
  const children = [];
  for (let m = tag.exec(src); m; m = tag.exec(src)) {
    const [, closing, name, attrs] = m;
    if (closing) { stack.pop(); continue; }
    const cls = (attrs.match(/class="([^"]*)"/)?.[1] ?? "").replace(/\{\{[\s\S]*?\}\}/g, " ").trim();   // `bi-runner-shell{{#if open}} ...` -> the real classes
    if (stack.at(-1)?.cls.split(/\s+/).includes("bi-runner-frame")) children.push(`${name}.${cls.split(/\s+/)[0]}`);
    if (!VOID.has(name.toLowerCase()) && !/\/\s*$/.test(attrs)) stack.push({ name, cls });
  }
  assert.deepEqual(children, ["button.bi-runner-toggle", "section.bi-runner-shell"]);
});

/* ---------------------------------------------------------------- */
/*  The sibling overlays, checked live the same day and found right  */
/* ---------------------------------------------------------------- */

test("the other adventure overlay roots are click-through with their parts opting back in (verified live 2026-10-01: they catch nothing they do not paint)", () => {
  assert.equal(declared(components, "#bi-stage.bi-stage", "pointer-events"), "none", "the theatre-of-the-mind stage is a full-viewport sheet");
  assert.equal(declared(components, ".bi-frame", "pointer-events"), "auto", "its portrait frames take clicks");
  assert.equal(declared(bridge, "body.bi-theme #bi-command-bar", "pointer-events"), "none", "the deck's chassis is inert...");
  assert.equal(declared(bridge, "body.bi-theme #bi-command-bar > *", "pointer-events"), "auto", "...its controls are not");
  assert.equal(declared(bridge, "body.bi-theme #bi-session-rail", "pointer-events"), "none", "the session rail is a thin strip over the board");
});

/* ---------------------------------------------------------------- */
/*  The browser half still runs                                      */
/* ---------------------------------------------------------------- */

test("the live check at tools/overlay-check/click-through.mjs still parses (it cannot run here: it needs a running Foundry)", () => {
  const result = spawnSync(process.execPath, ["--check", path.join(repoRoot, "tools", "overlay-check", "click-through.mjs")], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
