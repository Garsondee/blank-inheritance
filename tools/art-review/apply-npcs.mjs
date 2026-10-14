// Builds data/npcs/<id>.json for every spec in npc-specs.mjs, links the canon cast entry
// (npcRef), and tidies the shouted all-caps labels in the nine haunt NPC files written earlier.
// Every change is recorded in tools/art-review/ledger.json for the review page.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { specs } from "./npc-specs.mjs";
import { readLedger, writeLedger } from "./apply-edits.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const catalogue = JSON.parse(fs.readFileSync(path.join(root, "data/campaign/ancestry-catalogue.json"), "utf8")).ancestries;
const TODAY = "2026-09-30";

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const writeJson = (p, v) => fs.writeFileSync(path.join(root, p), JSON.stringify(v, null, 2) + "\n");

function ancestrySentence(spec) {
  const entry = catalogue.find((a) => a.name.toLowerCase() === spec.ancestry.toLowerCase());
  if (!entry) throw new Error(`no ancestry ${spec.ancestry}`);
  const first = entry.description.split(". ")[0].replace(/\.$/, "");
  const place = entry.terrestrial
    ? "one of Golarion's own peoples, so no disguise is needed"
    : "an alien ancestry: aliens are rare in Kurose and draw stares, and many refuse to wear glamour (canon/world/glamour.md, D024), which makes this one of the room's sore thumbs";
  return `${spec.ancestry} ('${first}.' -- ancestry-catalogue.json): ${place}.`;
}

function factsFrom(cast) {
  return (cast.brief?.coercible ?? []).map((c) => {
    const [trigger, ...rest] = c.how.split(": ");
    const slug = c.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return {
      id: slug,
      text: rest.length ? rest.join(": ") : c.how,
      revealTrigger: { narrative: trigger },
      revealed: false,
    };
  });
}

export function buildNpc(spec, cast, ledgerNotes) {
  const facts = factsFrom(cast);
  const npc = {
    $schema: "../schema/npc.schema.json",
    id: spec.id,
    type: "npc",
    authoring: { status: "drafted" },
    name: cast.label ?? spec.id,
    role: spec.role,
    pole: null,
    ancestry: spec.ancestry,
    affiliation: null,
    description: spec.description,
    designNotes:
      `Created ${TODAY} from this regular's cast entry in canon/scenes/${spec.scene}.json. Everything about who they are and what they want is that entry's own; only the physical description and the ancestry are new.\n\n` +
      `ANCESTRY, chosen by Claude under Ingram's ${TODAY} goal (any ancestry is allowed): ${ancestrySentence(spec)}` +
      (spec.portrait && spec.portrait !== "PLACEHOLDER" ? `\n\nPORTRAIT: ${spec.portrait}` : "") +
      (ledgerNotes ? `\n\nVOICE NOTES: ${ledgerNotes}` : "") +
      `\n\nHer or his real statblock is still a placeholder in the scene file (${cast.brief?.statblock ?? "none"}); not carried here.`,
    namingPlaceholderRef: null,
    openQuestionRefs: [],
    status: `drafted ${TODAY} from the haunt's cast entry; portrait chosen the same day`,
    socialProfile: { attitude: cast.brief?.attitude ?? "indifferent", ...(facts.length ? { facts } : {}) },
  };
  return npc;
}

const OLD_FILES = ["tsubaki", "imai", "aucourt", "gennai", "kuroki", "mori", "kiku", "sanzo", "tama"];
const LABEL_EDITS = [
  ["\n\nHER WANT: ", "\n\nShe wants "],
  ["\n\nHIS WANT: ", "\n\nHe wants "],
  ["\n\nWHAT SHE IS NOT SAYING: ", "\n\nShe keeps one thing back: "],
  ["\n\nWHAT HE IS NOT SAYING: ", "\n\nHe keeps one thing back: "],
  ["and calls a whole table 'you two' whatever the actual number sitting there is.", "and counts a table by heads before she pours, and has never once got a tab wrong."],
];

function main() {
  // Finished 2026-09-30, and not safe to run again: it rewrites each data/npcs file whole (dropping the statblock, the canon link and
  // everything added since) and writes the `description` field that D080 retired on 2026-10-07 (the old prose is in
  // quarantine/data/npc-descriptions.json; an Actor sheet's text is generated from canon).
  if (!process.argv.includes("--rewrite-npc-files-anyway")) {
    console.error("tools/art-review/apply-npcs.mjs was a one-shot (2026-09-30) and would overwrite the NPC files. Pass --rewrite-npc-files-anyway only if you mean it.");
    process.exit(1);
  }
  const ledger = readLedger();
  const sceneCache = new Map();
  const loadScene = (id) => {
    if (!sceneCache.has(id)) sceneCache.set(id, readJson(`canon/scenes/${id}.json`));
    return sceneCache.get(id);
  };

  let created = 0, linked = 0;
  for (const spec of specs) {
    const scene = loadScene(spec.scene);
    const cast = scene.cast.find((c) => c.id === spec.id);
    if (!cast) throw new Error(`${spec.scene} has no cast entry ${spec.id}`);
    const notes = ledger.changes.filter((c) => c.kind === "catchphrase" && c.scene === spec.scene && c.npc === spec.id).length
      ? "forced catchphrases in this regular's tics and sample lines were rewritten as habits and manner (tools/art-review/ledger.json has each before and after)."
      : "";
    const file = `data/npcs/${spec.id}.json`;
    const existed = fs.existsSync(path.join(root, file));
    writeJson(file, buildNpc(spec, cast, notes));
    if (!existed) {
      created += 1;
      ledger.changes.push({ kind: "new-npc", npc: spec.id, scene: spec.scene });
    }
    if (cast.npcRef !== spec.id) {
      const rebuilt = {};
      for (const [k, v] of Object.entries(cast)) {
        rebuilt[k] = v;
        if (k === "id") rebuilt.npcRef = spec.id;
      }
      scene.cast[scene.cast.indexOf(cast)] = rebuilt;
      linked += 1;
    }
  }
  for (const [id, scene] of sceneCache) writeJson(`canon/scenes/${id}.json`, scene);

  let tidied = 0;
  for (const id of OLD_FILES) {
    const file = `data/npcs/${id}.json`;
    const npc = readJson(file);
    let d = npc.description;
    for (const [from, to] of LABEL_EDITS) {
      if (d.includes(from)) {
        ledger.changes.push({ kind: "npc-description", npc: id, find: from.trim(), replace: to.trim(), why: "Shouted all-caps label turned into plain prose." });
        d = d.split(from).join(to);
      }
    }
    if (d !== npc.description) {
      npc.description = d;
      writeJson(file, npc);
      tidied += 1;
    }
  }
  writeLedger(ledger);
  console.log(JSON.stringify({ created, linked, tidied }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
