/**
 * The people a scene casts, and whether each one is ready for the table: a file in data/npcs/, a stat block, an entry
 * in the NPC roster, and a portrait registered for the token.
 *
 * Every person cast in the canon scenes passed all of these on 2026-10-14 (npm run npcs:check and the NPC corpus test
 * agree), so this is a tripwire for what comes next, not a backlog: it is how the QC bot notices that a scene it is
 * reviewing, or a change it proposes, casts someone the pipeline has not met. Foundry makes the Actor and its token
 * ring from the NPC file by itself; the only thing no script can supply is the portrait (Ingram's Midjourney art), so a
 * missing portrait is reported, never treated as an error.
 *
 * Pure: pass the repo root. Reads files only.
 */
import { readJsonIf } from "./lib.mjs";

/** @returns {{ id: string, hasFile: boolean, hasStatblock: boolean, inRoster: boolean, existing: boolean, portrait: boolean, name: string|null }[]} */
export function npcChain(root, scene) {
  const roster = readJsonIf(root, "data/campaign/npc-roster.json");
  const rosterIds = new Set((roster?.people ?? []).map((p) => p.npcId));
  const existingCards = (roster?.existing ?? []).map((e) => e.id);
  const registry = readJsonIf(root, "data/campaign/asset-registry.json");
  const portraits = new Set((registry?.assets ?? []).filter((a) => a.assignedTo?.kind === "npc").map((a) => a.assignedTo.ref));
  const ids = [...new Set((scene.cast ?? []).map((c) => c.npcRef).filter(Boolean))];
  return ids.map((id) => {
    const file = readJsonIf(root, `data/npcs/${id}.json`);
    return {
      id,
      hasFile: !!file,
      hasStatblock: !!file?.statblock,
      inRoster: rosterIds.has(id),
      existing: existingCards.includes(id),
      portrait: portraits.has(id),
      name: file?.name ?? null,
    };
  });
}

/** Cast entries with no npcRef at all: a person the scene voices but the pipeline cannot reach. */
export function castWithoutNpc(scene) {
  return (scene.cast ?? []).filter((c) => !c.npcRef).map((c) => c.id ?? c.label ?? "(unnamed)");
}

/** The ones that need work: no file, no stat block, or not in the roster. A creature that ships with the system needs none. */
export function npcGaps(chain) {
  return chain.filter((p) => !p.existing && (!p.hasFile || !p.hasStatblock || !p.inRoster));
}
