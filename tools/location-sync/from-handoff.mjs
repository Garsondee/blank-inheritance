#!/usr/bin/env node
/**
 * `npm run locations:handoff -- <file|-> --item N --id <new-id> [options]` -- turn one shape from a Location Editor hand-off into a real
 * location (design/location-editor.md section 14).
 *
 * The GM picks a shape in the editor (a real building adopted as it stands, or one she drew), presses "Copy for Claude" and pastes the JSON
 * in the chat with a brief. This reads that JSON (a file, or `-` for stdin), and writes data/locations/<id>.json through the same
 * apply_geometry.py bridge a saved drawing goes through: exact outline, `drafted`, with the name, kind, tags, lore and note the brief asks for.
 * With --scene / --destination / --position it also puts that slot of the story at the new place (the GM's call: only when she said which).
 *
 *   --fields <file>   a JSON file of form fields (the same shape the editor's form has: lore, scene { hooks, activities }, tags, npcRefs ...), laid over the
 *                     editor's, then the flags below laid over that. For long text, which a shell makes clumsy.
 *   --item N          which item of the hand-off (default 0)
 *   --id <id>         the new location's id (lowercase-kebab); required, and must be free
 *   --name --name-ja --kind --tier --rank --depth --classification --note --tags a,b --summary --player-facing --gm-only
 *                     the form's fields; anything not given is what the editor had
 *   --scene <scene-set id> | --destination <brief>:<destination> | --position <brief>:<which>
 *   --scene-note <text>   the note written beside the placement
 *   --within <region> the region it lies in, when the outline's centre is not inside any (a thin strip on a region's edge): otherwise the
 *                     result says "lies in no region"
 *   --retire <id>     the location this REPLACES (a place that was mislabelled): refused while anything else still names it, unless --force;
 *                     otherwise its file is deleted and every region's contents list drops it
 *   --dry-run         build everything, write nothing
 *
 * Registering a new location is one command: the file, the contents list of the region it lies in, the scene placed at it, and (with --retire) the old
 * place taken away. What is left is the work only a person can do: the words (--fields) and, if a decision was stated, writing it down in canon/decisions/.
 */

import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { emptyFields } from "../../module/blank-inheritance/scripts/core/location-editor.mjs";
import { parseHandoff } from "../../module/blank-inheritance/scripts/core/location-handoff.mjs";
import { destinationTarget, positionTarget, sceneTarget } from "../../module/blank-inheritance/scripts/core/siting.mjs";
import { existingLocationIds, runApplyGeometry } from "./merge.mjs";
import { placeAt } from "./siting.mjs";
import { DEFAULT_PATHS, locationFilePath, readJsonFile, writeFileAtomic, writeJsonFile } from "./store.mjs";

const LOCATION_ID = /^[a-z0-9][a-z0-9-]*$/;

const splitList = (text) => String(text).split(",").map((t) => t.trim()).filter(Boolean);

/** The form's fields: the editor's own, with whatever the command line says laid over them. */
export function fieldsFor(item, overrides = {}) {
  const base = emptyFields();
  const had = item.fields ?? {};
  const fields = {
    ...base,
    ...had,
    lore: { ...base.lore, ...(had.lore ?? {}) },
    scene: { ...base.scene, ...(had.scene ?? {}) }
  };
  const set = (key, value) => { if (value !== undefined) fields[key] = value; };
  const file = overrides.fields ?? {};
  for (const [key, value] of Object.entries(file)) {
    if (key === "lore" || key === "scene") fields[key] = { ...fields[key], ...value };
    else fields[key] = value;
  }
  set("name", overrides.name);
  set("nameJa", overrides.nameJa);
  set("kind", overrides.kind);
  set("tags", overrides.tags);
  set("rank", overrides.rank);
  set("classification", overrides.classification);
  set("depth", overrides.depth);
  set("note", overrides.note);
  if (overrides.summary !== undefined) fields.lore.summary = overrides.summary;
  if (overrides.playerFacing !== undefined) fields.lore.playerFacing = overrides.playerFacing;
  if (overrides.gmOnly !== undefined) fields.lore.gmOnly = overrides.gmOnly;
  if (!fields.name) fields.name = item.name ?? null;
  return fields;
}


/* ---------------------------------------------------------------- keeping the rest of the map in step */

const FOLDERS_NOT_SCANNED = new Set(["generated", "gazetteer-drafts", "editor-submissions", "intray", "schema", "decisions"]);   // a decision record names an id as history, not as a live reference

function* walkFiles(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!FOLDERS_NOT_SCANNED.has(name)) yield* walkFiles(full);
    } else if (/[.](json|md)$/.test(name)) yield full;
  }
}

/** Every file under data/ and canon/ that names a location id (other than its own file), as repo-relative paths. */
export function referencesTo(id, { dataRoot = DEFAULT_PATHS.dataRoot } = {}) {
  const repo = path.resolve(dataRoot, "..");
  const own = path.join(dataRoot, "locations", `${id}.json`);
  const named = new RegExp(`(^|[^a-z0-9-])${id.replace(/-/g, "[-]")}([^a-z0-9-]|$)`);
  const found = [];
  for (const root of [dataRoot, path.join(repo, "canon")]) {
    for (const file of walkFiles(root)) {
      if (file === own) continue;
      // a region's own contents list is kept in step by unlinkFromRegions, so it is not a reason to keep a place
      const text = readFileSync(file, "utf8").replace(/"containsRefs": \[[^\]]*\]/g, '"containsRefs": []');
      if (named.test(text)) found.push(path.relative(repo, file).split(path.sep).join("/"));
    }
  }
  return found.sort();
}

function locationFiles(dataRoot) {
  const dir = path.join(dataRoot, "locations");
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
}

/**
 * Change one region's `derived.containsRefs` and nothing else: the array is rewritten in place in the file's own text, so the rest of the document
 * (whose numbers the Python bridge wrote as 5665.0, not 5665) is byte for byte what it was and a diff shows only the list.
 */
function editContainsRefs(file, change, { dryRun = false } = {}) {
  const raw = readFileSync(file, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const found = /^([ \t]*)"containsRefs": \[([^\]]*)\]/m.exec(raw);
  if (!found) return false;
  const indent = found[1];
  const before = JSON.parse(`[${found[2]}]`);
  const after = change([...before]);
  if (!after || JSON.stringify(after) === JSON.stringify(before)) return false;
  const body = after.length ? `${eol}${after.map((id) => `${indent}  ${JSON.stringify(id)}`).join(`,${eol}`)}${eol}${indent}` : "";
  const text = raw.slice(0, found.index) + `${indent}"containsRefs": [${body}]` + raw.slice(found.index + found[0].length);
  if (!dryRun) writeFileAtomic(file, text);
  return true;
}

/** Add a new site or point to the contents list of the region it lies in (`derived.withinRegionRef`). Returns the region id, or null. */
export function linkIntoRegion(doc, { dataRoot = DEFAULT_PATHS.dataRoot, dryRun = false } = {}) {
  const regionId = doc.tier === "region" ? null : doc.derived?.withinRegionRef ?? null;
  if (!regionId) return null;
  const file = locationFilePath(dataRoot, regionId);
  if (!existsSync(file)) return null;
  editContainsRefs(file, (list) => (list.includes(doc.id) ? null : [...list, doc.id].sort()), { dryRun });
  return regionId;
}

/** Take a retired location out of every region's contents list. Returns the ids of the regions that held it. */
export function unlinkFromRegions(id, { dataRoot = DEFAULT_PATHS.dataRoot, dryRun = false } = {}) {
  const changed = [];
  for (const file of locationFiles(dataRoot)) {
    if (editContainsRefs(file, (list) => (list.includes(id) ? list.filter((x) => x !== id) : null), { dryRun })) changed.push(path.basename(file, ".json"));
  }
  return changed;
}

/**
 * The whole job, as a function (the CLI below is a thin shell over it, and the tests call it with a scratch data root).
 * Returns `{ ok: true, locationId, doc, written, placed }` or `{ ok: false, error }`.
 */
export function fromHandoff({ text, itemIndex = 0, id, overrides = {}, target = null, sceneNote = null, retire = null, force = false, within = null, dryRun = false, dataRoot = DEFAULT_PATHS.dataRoot, date = null } = {}) {
  const parsed = parseHandoff(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const item = parsed.handoff.items.find((i) => i.index === itemIndex) ?? parsed.handoff.items[itemIndex];
  if (!item) return { ok: false, error: `the hand-off has no item ${itemIndex} (it has ${parsed.handoff.items.length})` };
  if (item.saved) return { ok: false, error: `item ${itemIndex} is the existing location "${item.locationId}": edit data/locations/${item.locationId}.json instead` };
  if (!LOCATION_ID.test(id ?? "")) return { ok: false, error: `--id must be lowercase-kebab (a-z, 0-9, dashes); got ${JSON.stringify(id)}` };
  if (existingLocationIds(dataRoot).has(id)) return { ok: false, error: `a location "${id}" already exists` };

  if (retire) {
    if (!existingLocationIds(dataRoot).has(retire)) return { ok: false, error: `--retire ${retire}: there is no such location` };
    const refs = referencesTo(retire, { dataRoot });
    if (refs.length && !force) return { ok: false, error: `--retire ${retire}: still named by ${refs.join(", ")} (change those first, or --force)` };
  }

  const tier = overrides.tier ?? item.tier;
  const fields = fieldsFor(item, overrides);
  if (!fields.name) return { ok: false, error: "the new location needs a name (--name)" };
  if (!String(fields.note ?? "").trim()) {
    const from = item.adoptedFrom?.buildingId ? ` from the real building ${item.adoptedFrom.buildingId}` : "";
    fields.note = `Made${from} from a Location Editor hand-off${date ? ` on ${date}` : ""}.`;
  }
  const geometry = tier === "point" && !item.geometry.point
    ? { rings: [], point: item.centreImagePx }
    : item.geometry;

  const doc = runApplyGeometry({ op: "create", locationId: id, tier, draftId: item.localId ?? null, geometry, fields });
  if (within) {
    const region = readJsonFile(locationFilePath(dataRoot, within));
    if (!region || region.doc.tier !== "region") return { ok: false, error: `--within ${within}: there is no such region` };
    doc.derived.withinRegionRef = within;
  }
  const warnings = [];
  if (tier !== "region" && !doc.derived.withinRegionRef) warnings.push("its centre lies in no region (pass --within <region> if it belongs to one)");
  if (!dryRun) writeJsonFile(locationFilePath(dataRoot, id), doc);
  const region = linkIntoRegion(doc, { dataRoot, dryRun });

  let retired = null;
  if (retire) {
    const regions = unlinkFromRegions(retire, { dataRoot, dryRun });
    if (!dryRun) rmSync(locationFilePath(dataRoot, retire));
    retired = { id: retire, regions };
  }

  let placed = null;
  if (target) {
    placed = placeAt(target, id, { dataRoot, note: sceneNote, date, dryRun });
    if (placed.state === "error") return { ok: false, error: `the location was ${dryRun ? "built" : "written"} but the placement failed: ${placed.error}`, locationId: id, doc };
  }
  return { ok: true, locationId: id, doc, written: !dryRun, placed, tier, region, retired, warnings };
}

function targetFromArgs(values) {
  if (values.scene) return sceneTarget(values.scene);
  if (values.destination) {
    const [brief, destination] = values.destination.split(":");
    return destinationTarget(brief, destination);
  }
  if (values.position) {
    const [brief, which] = values.position.split(":");
    return positionTarget(brief, which);
  }
  return null;
}

async function readInput(arg) {
  if (arg === "-") return readFileSync(0, "utf8");
  return readFileSync(arg, "utf8");
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      item: { type: "string" }, id: { type: "string" }, name: { type: "string" }, "name-ja": { type: "string" }, kind: { type: "string" },
      tier: { type: "string" }, rank: { type: "string" }, depth: { type: "string" }, classification: { type: "string" }, note: { type: "string" },
      tags: { type: "string" }, summary: { type: "string" }, "player-facing": { type: "string" }, "gm-only": { type: "string" },
      scene: { type: "string" }, destination: { type: "string" }, position: { type: "string" }, "scene-note": { type: "string" },
      fields: { type: "string" }, retire: { type: "string" }, force: { type: "boolean" }, within: { type: "string" },
      "dry-run": { type: "boolean" }
    }
  });
  if (!positionals[0]) {
    console.error("usage: node tools/location-sync/from-handoff.mjs <file|-> --item N --id <new-id> [--name ...] [--scene <scene-set id>] [--dry-run]");
    process.exitCode = 2;
    return;
  }
  const overrides = {
    name: values.name, nameJa: values["name-ja"], kind: values.kind, tier: values.tier, rank: values.rank, depth: values.depth,
    classification: values.classification, note: values.note, tags: values.tags !== undefined ? splitList(values.tags) : undefined,
    summary: values.summary, playerFacing: values["player-facing"], gmOnly: values["gm-only"],
    fields: values.fields ? JSON.parse(readFileSync(values.fields, "utf8")) : undefined
  };
  const result = fromHandoff({
    text: await readInput(positionals[0]),
    itemIndex: values.item !== undefined ? Number(values.item) : 0,
    id: values.id,
    overrides,
    target: targetFromArgs(values),
    sceneNote: values["scene-note"] ?? null,
    retire: values.retire ?? null,
    within: values.within ?? null,
    force: values.force === true,
    dryRun: values["dry-run"] === true,
    date: new Date().toISOString().slice(0, 10)
  });
  if (!result.ok) {
    console.error(`from-handoff: ${result.error}`);
    process.exitCode = 1;
    return;
  }
  const { doc } = result;
  console.log(`${result.written ? "Wrote" : "Would write"} data/locations/${result.locationId}.json -- ${doc.tier} "${doc.name}", status ${doc.authoring?.status ?? "?"}.`);
  for (const w of result.warnings ?? []) console.log(`  ! ${w}`);
  if (result.region) console.log(`${result.written ? "Listed" : "Would list"} it among the contents of the region ${result.region}.`);
  if (result.retired) console.log(`${result.written ? "Retired" : "Would retire"} ${result.retired.id}${result.retired.regions.length ? ` (also dropped from ${result.retired.regions.join(", ")})` : ""}.`);
  if (result.placed) {
    console.log(`${result.written ? "Placed" : "Would place"} ${result.placed.files.join(", ")} at ${result.locationId} (was ${result.placed.before ?? "unplaced"}).`);
    if (result.placed.canonChanged.length) console.log(`  ! changed canon scene(s) ${result.placed.canonChanged.join(", ")}: their approval hash changes, so Ingram needs to read them again.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => { console.error(err); process.exitCode = 1; });
}
