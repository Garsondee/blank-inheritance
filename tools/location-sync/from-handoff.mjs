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
 *   --item N          which item of the hand-off (default 0)
 *   --id <id>         the new location's id (lowercase-kebab); required, and must be free
 *   --name --name-ja --kind --tier --rank --depth --classification --note --tags a,b --summary --player-facing --gm-only
 *                     the form's fields; anything not given is what the editor had
 *   --scene <scene-set id> | --destination <brief>:<destination> | --position <brief>:<which>
 *   --scene-note <text>   the note written beside the placement
 *   --dry-run         build everything, write nothing
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { emptyFields } from "../../module/blank-inheritance/scripts/core/location-editor.mjs";
import { parseHandoff } from "../../module/blank-inheritance/scripts/core/location-handoff.mjs";
import { destinationTarget, positionTarget, sceneTarget } from "../../module/blank-inheritance/scripts/core/siting.mjs";
import { existingLocationIds, runApplyGeometry } from "./merge.mjs";
import { placeAt } from "./siting.mjs";
import { DEFAULT_PATHS, locationFilePath, writeJsonFile } from "./store.mjs";

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

/**
 * The whole job, as a function (the CLI below is a thin shell over it, and the tests call it with a scratch data root).
 * Returns `{ ok: true, locationId, doc, written, placed }` or `{ ok: false, error }`.
 */
export function fromHandoff({ text, itemIndex = 0, id, overrides = {}, target = null, sceneNote = null, dryRun = false, dataRoot = DEFAULT_PATHS.dataRoot, date = null } = {}) {
  const parsed = parseHandoff(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const item = parsed.handoff.items.find((i) => i.index === itemIndex) ?? parsed.handoff.items[itemIndex];
  if (!item) return { ok: false, error: `the hand-off has no item ${itemIndex} (it has ${parsed.handoff.items.length})` };
  if (item.saved) return { ok: false, error: `item ${itemIndex} is the existing location "${item.locationId}": edit data/locations/${item.locationId}.json instead` };
  if (!LOCATION_ID.test(id ?? "")) return { ok: false, error: `--id must be lowercase-kebab (a-z, 0-9, dashes); got ${JSON.stringify(id)}` };
  if (existingLocationIds(dataRoot).has(id)) return { ok: false, error: `a location "${id}" already exists` };

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
  if (!dryRun) writeJsonFile(locationFilePath(dataRoot, id), doc);

  let placed = null;
  if (target) {
    placed = placeAt(target, id, { dataRoot, note: sceneNote, date, dryRun });
    if (placed.state === "error") return { ok: false, error: `the location was ${dryRun ? "built" : "written"} but the placement failed: ${placed.error}`, locationId: id, doc };
  }
  return { ok: true, locationId: id, doc, written: !dryRun, placed, tier };
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
    summary: values.summary, playerFacing: values["player-facing"], gmOnly: values["gm-only"]
  };
  const result = fromHandoff({
    text: await readInput(positionals[0]),
    itemIndex: values.item !== undefined ? Number(values.item) : 0,
    id: values.id,
    overrides,
    target: targetFromArgs(values),
    sceneNote: values["scene-note"] ?? null,
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
  if (result.placed) {
    console.log(`${result.written ? "Placed" : "Would place"} ${result.placed.files.join(", ")} at ${result.locationId} (was ${result.placed.before ?? "unplaced"}).`);
    if (result.placed.canonChanged.length) console.log(`  ! changed canon scene(s) ${result.placed.canonChanged.join(", ")}: their approval hash changes, so Ingram needs to read them again.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => { console.error(err); process.exitCode = 1; });
}
