/**
 * Loads the page scripts as text and turns them into what Puppeteer injects or evaluates. The scripts are plain files, readable and
 * editable as scripts; nothing here is clever, except the dice governor, which is built by putting core/dice.mjs (its `export`s
 * stripped) in front of browser/dice-governor.js inside one function, so the page runs the very functions the tests check.
 *
 * test/playtest/page-scripts.test.mjs compiles every script, and runs them in a real Chrome when one is installed.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(path.join(here, name), "utf8");

/** `export function f` -> `function f`, `export const x` -> `const x`: the module as a script body. */
export function stripExports(source) {
  return source.replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/gm, "");
}

export const pageHooksSource = () => read("page-hooks.js");
export const lookSource = () => read("look.js");
export const detectorsSource = () => read("detectors.js");
export const probesSource = () => read("probes.js");

/** The dice governor, as one script: the pure dice module's functions, then the governor, in one function scope. */
export function diceGovernorSource() {
  const dice = stripExports(readFileSync(path.join(here, "..", "core", "dice.mjs"), "utf8"));
  return `(() => {\n${dice}\n${read("dice-governor.js")}\n})();`;
}

/** An expression Puppeteer can evaluate: call a function-expression script with JSON arguments. */
export const call = (functionSource, ...args) => `(${functionSource})(${args.map((a) => JSON.stringify(a === undefined ? null : a)).join(", ")})`;

/** Evaluate one named probe from probes.js. */
export function probeCall(name, ...args) {
  return `(() => {
${probesSource()}
return probes.${name}(${args.map((a) => JSON.stringify(a === undefined ? null : a)).join(", ")});
})()`;
}
