/**
 * Checks that must pass before the module is pushed to the live server.
 *
 * WHY THIS EXISTS, 2026-09-27. A push on 26 September uploaded a hand-picked
 * subset of the module: its new module.json, which lists
 * styles/bi-agreement.css, but not that stylesheet. Foundry validates a
 * module's manifest when a world launches, and a manifest naming a file that
 * does not exist fails validation outright. The next launch rejected the
 * whole module ("Metadata validation failed for module "blank-inheritance":
 * The file "styles/bi-agreement.css" ... does not exist"), so
 * game.modules.get("blank-inheritance") was undefined and every macro failed
 * with "Cannot read properties of undefined (reading 'api')". Nothing on the
 * push side noticed, because the push verified the files it was given and
 * was never asked whether the module those files made could load.
 *
 * These checks answer exactly that, against the tree about to be pushed:
 *
 *   - the manifest parses, its id matches its directory (Foundry rejects a
 *     mismatch, found live 2026-09-05), and every file it names exists;
 *   - every relative import in every script resolves to a real file, and no
 *     script imports a bare specifier (a browser has no import map here, so
 *     `import x from "lodash"` fails the entry module and everything under
 *     it);
 *   - every script parses (`node --check`);
 *   - every literal templates/*.hbs path a script names exists;
 *   - the language files parse.
 *
 * Plus one WARNING, not an error: a scene in data/campaign/scene-set.json
 * whose picture is missing from assets/scenes/. That scene would build black
 * rather than break the module, so it must not block every other update --
 * but it must be seen.
 *
 * Reads the local filesystem only. The syntax check spawns `node --check`,
 * which is why it is its own function: the unit tests exercise the pure
 * checks against fixture trees and run the syntax check separately.
 */

import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Every file under `dir`, as POSIX paths relative to `root`. */
function walk(root, dir = root, skip = () => false) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (skip(relative)) continue;
    if (entry.isDirectory()) out.push(...walk(root, absolute, skip));
    else if (entry.isFile()) out.push(relative);
  }
  return out;
}

/**
 * The manifest: parses, id matches the directory, every named file exists.
 * @returns {{errors: string[], manifest: object|null}}
 */
export function checkManifest(moduleDir) {
  const errors = [];
  const manifestPath = path.join(moduleDir, "module.json");
  if (!existsSync(manifestPath)) return { errors: ["module.json is missing"], manifest: null };

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    return { errors: [`module.json does not parse: ${err.message}`], manifest: null };
  }

  const dirName = path.basename(path.resolve(moduleDir));
  if (manifest.id !== dirName) {
    errors.push(`module.json id "${manifest.id}" does not match its directory "${dirName}" -- Foundry rejects the module outright`);
  }

  const named = [
    ...(manifest.esmodules ?? []).map((p) => ["esmodules", p]),
    ...(manifest.scripts ?? []).map((p) => ["scripts", p]),
    ...(manifest.styles ?? []).map((p) => ["styles", typeof p === "string" ? p : p?.src]),
    ...(manifest.languages ?? []).map((l) => ["languages", l?.path]),
    ...(manifest.packs ?? []).map((p) => ["packs", p?.path])
  ];
  for (const [field, relative] of named) {
    if (!relative) {
      errors.push(`module.json ${field} has an entry with no path`);
      continue;
    }
    if (!existsSync(path.join(moduleDir, relative))) {
      errors.push(`module.json ${field} names "${relative}", which does not exist -- Foundry will refuse to load the module`);
    }
  }
  return { errors, manifest };
}

// Static and dynamic imports with a literal specifier, plus `export ... from`.
// Comments are stripped first so a commented-out import of a deleted file is
// not reported.
const IMPORT_PATTERNS = [
  /\bimport\s+(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?:\*|\{[^}]*\})(?:\s+as\s+\w+)?\s+from\s+["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g
];

function stripComments(source) {
  // Block comments that open at the start of a line or after whitespace (so a
  // glob inside a string, "data/**/*.json", is not mistaken for one), then
  // line comments not preceded by a colon or quote (so "https://..." in a
  // string survives). Good enough for finding imports; not a JS parser.
  return source.replace(/(^|\s)\/\*[\s\S]*?\*\//g, "$1").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/** Every import specifier a source file names. */
export function importSpecifiers(source) {
  const text = stripComments(source);
  const found = [];
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of text.matchAll(pattern)) found.push(match[1]);
  }
  return found;
}

/**
 * Every script's relative imports resolve; no bare specifiers.
 * @returns {string[]} errors
 */
export function checkImports(moduleDir) {
  const errors = [];
  const scriptsDir = path.join(moduleDir, "scripts");
  for (const relative of walk(moduleDir, scriptsDir).filter((p) => /\.(mjs|js)$/.test(p))) {
    const absolute = path.join(moduleDir, relative);
    const source = readFileSync(absolute, "utf8");
    for (const specifier of importSpecifiers(source)) {
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        const target = path.resolve(path.dirname(absolute), specifier);
        if (!existsSync(target) || !statSync(target).isFile()) {
          errors.push(`${relative} imports "${specifier}", which does not exist`);
        }
      } else if (specifier.startsWith("/")) {
        // A root-relative URL is served by Foundry, not resolvable here; only
        // this module's own files can be checked, and they are always
        // imported relatively in this codebase.
        continue;
      } else {
        errors.push(`${relative} imports the bare specifier "${specifier}" -- a browser cannot resolve that without an import map`);
      }
    }
  }
  return errors;
}

/**
 * Every literal templates/*.hbs path a script names exists. Paths built from
 * variables cannot be checked statically and are left alone.
 * @returns {string[]} errors
 */
export function checkTemplates(moduleDir) {
  const errors = [];
  const seen = new Set();
  for (const relative of walk(moduleDir, path.join(moduleDir, "scripts")).filter((p) => /\.(mjs|js)$/.test(p))) {
    const source = stripComments(readFileSync(path.join(moduleDir, relative), "utf8"));
    for (const match of source.matchAll(/templates\/[a-z0-9_\-/]+\.hbs/gi)) {
      const template = match[0];
      if (seen.has(template)) continue;
      seen.add(template);
      if (!existsSync(path.join(moduleDir, template))) errors.push(`${relative} names "${template}", which does not exist`);
    }
  }
  return errors;
}

/** Every language file the manifest names parses as JSON. */
export function checkLanguages(moduleDir, manifest) {
  const errors = [];
  for (const language of manifest?.languages ?? []) {
    const file = path.join(moduleDir, language?.path ?? "");
    if (!language?.path || !existsSync(file)) continue; // checkManifest already reports it
    try {
      JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      errors.push(`${language.path} does not parse: ${err.message}`);
    }
  }
  return errors;
}

/**
 * Scenes in the scene-set manifest whose picture is not in the module. A
 * warning: the scene still builds, just black.
 * @returns {string[]} warnings
 */
export function checkSceneArt(moduleDir, sceneSet) {
  const warnings = [];
  for (const scene of sceneSet?.scenes ?? []) {
    if (!scene?.art) continue;
    // An adopted scene (the hand-built Campaign Map) keeps its own tiles; its
    // manifest art is never drawn by the pipeline, so it is not required.
    if (scene.adoptSceneNamed) continue;
    const art = path.join(moduleDir, "assets", "scenes", `${scene.art}.webp`);
    if (!existsSync(art)) warnings.push(`scene "${scene.id}" has no picture: assets/scenes/${scene.art}.webp is missing, so it will build black`);
  }
  return warnings;
}

/**
 * `node --check` over every script. Spawns processes, so it is kept apart
 * from the pure checks above.
 * @returns {Promise<string[]>} errors
 */
export async function checkSyntax(moduleDir, { concurrency = 8 } = {}) {
  const files = walk(moduleDir, path.join(moduleDir, "scripts")).filter((p) => /\.(mjs|js)$/.test(p));
  const errors = [];
  let next = 0;
  async function worker() {
    while (next < files.length) {
      const relative = files[next++];
      try {
        await execFileAsync(process.execPath, ["--check", path.join(moduleDir, relative)]);
      } catch (err) {
        const detail = String(err.stderr || err.message).split("\n").filter(Boolean).slice(0, 4).join(" | ");
        errors.push(`${relative} does not parse: ${detail}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
  return errors.sort();
}

/**
 * Everything, in one call.
 * @param {object} options
 * @param {string} options.moduleDir
 * @param {object} [options.sceneSet]  the parsed scene-set manifest, for the art warning
 * @param {boolean} [options.syntax=true]
 * @returns {Promise<{errors: string[], warnings: string[]}>}
 */
export async function runPreflight({ moduleDir, sceneSet = null, syntax = true }) {
  const { errors: manifestErrors, manifest } = checkManifest(moduleDir);
  const errors = [
    ...manifestErrors,
    ...checkImports(moduleDir),
    ...checkTemplates(moduleDir),
    ...checkLanguages(moduleDir, manifest),
    ...(syntax ? await checkSyntax(moduleDir) : [])
  ];
  const warnings = checkSceneArt(moduleDir, sceneSet);
  return { errors, warnings };
}
