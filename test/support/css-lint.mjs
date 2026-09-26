/**
 * A minimal, correct-enough CSS tokenizer for one purpose: catching a comment
 * that closes earlier than a human writer intended.
 *
 * Found live 2026-09-19: a doctrine comment in bi-components.css contained
 * the prose "--bi-paper-* / --bi-bone tokens" written without the spaces --
 * i.e. the literal two characters star-slash inside a hyphenated pair of
 * token names, which is a completely ordinary thing to type and an entirely
 * real comment-close token in both CSS and JS block comments alike (this
 * paragraph itself hit the same bug on its first draft, missing spaces
 * around that exact same pair of token names -- left here as the demonstration
 * neither of us needs repeated). It closed the comment ~30 lines early.
 * Everything between that accidental close and the comment's REAL, intended
 * close became live CSS text, which is
 * not valid CSS, so the parser's error recovery silently discarded the next
 * real rule (`.bi-runner, .bi-scene-close { --sr-bg: ... }`) as collateral
 * damage. No console error, no build failure -- the panel just silently
 * rendered with no background in light mode. Confirmed against a real
 * browser's own CSSOM (`new CSSStyleSheet().replaceSync(...)`) before
 * writing this: the rule was verifiably absent from `cssRules`, and the
 * exact same rule text parsed perfectly fine in isolation.
 *
 * This tokenizer respects comments and strings (both are the two contexts
 * where a stray `{`/`}`/`*`+`/` should NOT count), so `braceBalance` and
 * `ruleSelectors` reflect what a real CSS engine would actually see -- not
 * what a naive regex over the raw text would see.
 */

/** Strips comments the way a real CSS engine does: the FIRST star-slash closes it, full stop -- never nested, never "the one the author meant." */
export function stripCssComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      i = close === -1 ? text.length : close + 2;
      continue;
    }
    if (text[i] === '"' || text[i] === "'") {
      const quote = text[i];
      let j = i + 1;
      while (j < text.length && text[j] !== quote) {
        if (text[j] === "\\") j++;
        j++;
      }
      out += text.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

/**
 * Every selector that opens a rule (text between the previous `{`/`}`/`;`
 * and a `{`), comments and strings already removed. Includes at-rule
 * preludes (`@media ...`) alongside ordinary selectors -- good enough for
 * "does this selector still open a rule somewhere," which is all any
 * caller of this helper needs.
 */
export function ruleSelectors(text) {
  const stripped = stripCssComments(text);
  const selectors = [];
  let last = 0;
  for (let i = 0; i < stripped.length; i++) {
    const c = stripped[i];
    if (c === "{") {
      selectors.push(stripped.slice(last, i).trim());
      last = i + 1;
    } else if (c === "}" || c === ";") {
      last = i + 1;
    }
  }
  return selectors.filter(Boolean);
}

/** Brace balance AFTER removing comments/strings -- a real corruption signal, unlike counting braces over the raw text. */
export function braceBalance(text) {
  const stripped = stripCssComments(text);
  let depth = 0;
  let minDepth = 0;
  for (const c of stripped) {
    if (c === "{") depth++;
    if (c === "}") { depth--; minDepth = Math.min(minDepth, depth); }
  }
  return { finalDepth: depth, wentNegative: minDepth < 0 };
}
