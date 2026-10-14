/**
 * Put the choices an item's ChoiceSet rule elements ask for into the induction catalogues, read from the real compendium packs.
 *
 *   node tools/character-builder/extract-rule-choices.mjs            show what each catalogue says and what the packs say
 *   node tools/character-builder/extract-rule-choices.mjs --write    bring data/campaign/{background,class}-catalogue.json up to date
 *   node tools/character-builder/extract-rule-choices.mjs --check    exit 1 if a catalogue is behind the packs (the tests run this)
 *
 * WHY: embedding a background or class that carries a ChoiceSet opens sf2e's own "Select a skill" window over the induction
 * terminal's Review page (found by the playtest rig, 2026-10-06, F-0008). The terminal now asks on its own pages, so the pages need
 * the options: sixteen backgrounds and the Envoy class. core/induction-rule-choices.mjs is the analysis, shared with the terminal's
 * confirm step so what a page offers and what is written into the item are one reading of the same rules. A ChoiceSet whose shape
 * that analysis does not understand stops this tool (and `npm test`) rather than shipping a page that cannot ask it.
 *
 * It rewrites only the `choices` field of an entry, keeps the file's own layout (and writes LF, as git's index holds it), and refuses to
 * write a file whose untouched re-print would not reproduce it byte for byte (class-catalogue.json is hand-formatted that way: for it
 * --write prints the field to add by hand, and --check still compares the data).
 *
 * Needs the gitignored gamesystems/sf2e/packs (the same local copy the pack extractor reads).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readPackDocuments } from "../pack-extractor/read-pack.mjs";
import { analyzeRuleChoices } from "../../module/blank-inheritance/scripts/core/induction-rule-choices.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");

export const TARGETS = Object.freeze([
  { name: "background", pack: "backgrounds", file: "data/campaign/background-catalogue.json", list: "backgrounds" },
  { name: "class", pack: "classes", file: "data/campaign/class-catalogue.json", list: "classes" }
]);

/** slug -> analysis of that item's rules, for every Item in a compendium pack. */
export function analyzePack(packName) {
  const dir = path.join(repo, "gamesystems", "sf2e", "packs", packName);
  const { documents } = readPackDocuments(dir);
  const bySlug = new Map();
  for (const { embedded, doc } of documents) {
    if (embedded || !doc?.system?.slug) continue;
    bySlug.set(doc.system.slug, { name: doc.name, ...analyzeRuleChoices(doc.system.rules) });
  }
  return bySlug;
}

/**
 * The text of a catalogue file printed the way the repository keeps it: LF line endings (what git's index holds; a working copy saved
 * with CRLF would show every line as changed), its final newline if it has one, two-space indent.
 */
function print(data, original) {
  let text = JSON.stringify(data, null, 2);
  if (/\r?\n$/.test(original)) text += "\n";
  return text;
}

const lf = (text) => text.replace(/\r\n/g, "\n");

/**
 * The catalogue as it should be, plus the problems that stop it being written: a ChoiceSet that is not understood, and a catalogue entry
 * that names no item in the pack.
 */
export function plan(target) {
  const file = path.join(repo, target.file);
  const original = readFileSync(file, "utf8");
  const catalogue = JSON.parse(original);
  const problems = [];
  const canWrite = print(catalogue, original) === lf(original);
  const packed = analyzePack(target.pack);
  const entries = catalogue[target.list];
  let changed = 0;
  const changes = [];
  for (const entry of entries) {
    const found = packed.get(entry.id);
    if (!found) {
      problems.push(`${target.file}: "${entry.id}" is not in the ${target.pack} pack`);
      continue;
    }
    for (const u of found.unsupported) problems.push(`${found.name}: a ChoiceSet this form cannot ask (${u.flag ?? "no flag"}: ${u.reason})`);
    const wanted = found.choices.length ? found.choices : undefined;
    if (JSON.stringify(entry.choices) !== JSON.stringify(wanted)) {
      changed++;
      changes.push({ id: entry.id, choices: wanted ?? null });
      if (wanted) entry.choices = wanted;
      else delete entry.choices;
    }
  }
  return { target, file, original, catalogue, text: print(catalogue, original), canWrite, changes, changed, problems, withChoices: entries.filter((e) => e.choices).length, deferred: [...packed.values()].filter((p) => p.deferred.length).map((p) => p.name) };
}

async function main() {
  const flags = new Set(process.argv.slice(2));
  if (!existsSync(path.join(repo, "gamesystems", "sf2e", "packs"))) {
    console.error("gamesystems/sf2e/packs is not here (it is gitignored): nothing to read the choices from.");
    process.exit(2);
  }
  let behind = 0;
  let broken = 0;
  for (const target of TARGETS) {
    const result = plan(target);
    console.log(`${target.file}: ${result.withChoices} ${target.name}(s) ask a choice; ${result.changed} entr${result.changed === 1 ? "y" : "ies"} differ from the pack${result.deferred.length ? `; dropped with their grants: ${result.deferred.join(", ")}` : ""}`);
    for (const problem of result.problems) console.log(`  PROBLEM  ${problem}`);
    broken += result.problems.length;
    behind += result.changed;
    if (flags.has("--write") && !result.problems.length && result.changed) {
      if (result.canWrite) {
        writeFileSync(result.file, result.text);
        console.log(`  wrote ${result.file}`);
      } else {
        console.log(`  ${result.file} is hand-formatted, so it is not rewritten. Put this on each entry by hand:`);
        for (const change of result.changes) console.log(`    ${change.id}: ${JSON.stringify(change.choices)}`);
        broken++;
      }
    }
  }
  if (broken) process.exit(1);
  if (flags.has("--check") && behind) {
    console.log("A catalogue is behind the packs: run with --write.");
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
