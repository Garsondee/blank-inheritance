/**
 * The Sign-Off's corpus loader -- the only file here that touches the disk.
 *
 * Everything else in tools/scene-signoff/ is pure and takes this object, per
 * design/testing-strategy.md §1's core/adapter split: the checks and the board
 * are unit-testable against fixtures, and this is the thin part that reads real
 * files. It loads deliberately WIDE (every entity a scene can reference) rather
 * than lazily, because the whole corpus is a few megabytes and a check that
 * cannot see a neighbouring scene cannot answer the questions that actually
 * matter -- reveal timing, cast return, the emotional arrow, skill variety
 * across the episode.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadModel } from "../story/lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");
const dataRoot = path.join(repoRoot, "data");

const read = (p) => JSON.parse(readFileSync(p, "utf8"));

function indexDir(rel, { recursive = false } = {}) {
  const dir = path.join(dataRoot, rel);
  if (!existsSync(dir)) return {};
  const out = {};
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (recursive) walk(full);
      } else if (entry.name.endsWith(".json")) {
        let doc;
        try {
          doc = read(full);
        } catch {
          continue; // a malformed file is tier2-data-corpus's finding to report, not ours to crash on
        }
        if (doc && typeof doc === "object" && doc.id) out[doc.id] = { ...doc, __file: full };
      }
    }
  };
  walk(dir);
  return out;
}

/**
 * The scene-set entry that carries each brief's map link: the scene's OWN entry, not one of its rooms.
 * A scene-set entry of kind "sub" is a room of a scene (The Errand's tea house, its alley), and several entries can share one brief. This used to keep the LAST
 * entry for a brief, which was a room, so the moment a room had no place the scene itself read as having none (found 2026-10-07, when the Errand's rooms were
 * deregistered and its scene, already placed at the workshop, still failed P1). The Location Editor's Story (core/siting.mjs#buildStory) picks the same way:
 * the first entry that is not a room.
 */
export function sceneSetIndex(entries = []) {
  const isRoom = (entry) => entry.kind === "sub";
  const out = {};
  for (const entry of entries) {
    if (!entry.briefRef) continue;
    const held = out[entry.briefRef];
    if (!held || (isRoom(held) && !isRoom(entry))) out[entry.briefRef] = entry;
  }
  return out;
}

/** Every canon fact by id (status, told, payoff), so a check can see that what a beat cites exists. Null when canon can't be read. */
function canonFacts() {
  try {
    const m = loadModel();
    const out = new Map();
    for (const e of m.world) for (const f of e.facts) out.set(f.id, { status: f.status, told: f.told });
    return out;
  } catch {
    return null;
  }
}

export function loadCorpus() {
  const episodes = Object.values(indexDir("episodes")).sort(
    (a, b) => (a.dayRange?.start ?? Infinity) - (b.dayRange?.start ?? Infinity)
  );
  const sceneSet = existsSync(path.join(dataRoot, "campaign", "scene-set.json"))
    ? read(path.join(dataRoot, "campaign", "scene-set.json"))
    : { scenes: [] };

  const sceneSetByBriefRef = sceneSetIndex(sceneSet.scenes ?? []);

  return {
    episodes,
    sceneBriefs: indexDir("scene-briefs"),
    challenges: indexDir("challenges"),
    encounters: indexDir("encounters"),
    subsystems: indexDir("subsystems"),
    npcs: indexDir("npcs", { recursive: true }),
    creatures: indexDir("antagonists", { recursive: true }),
    locations: indexDir("locations"),
    facts: canonFacts(),
    sceneSet,
    sceneSetByBriefRef,
    checklist: read(path.join(dataRoot, "campaign", "signoff-checklist.json"))
  };
}

/**
 * Every scene in the corpus, in play order, each bundled with the three
 * records that describe it: the episode's own scene entry (which is where the
 * status and the Sign-Off record live -- see design/scene-signoff.md §3 on why
 * it is there and not on the brief), the brief, and the scene-set entry that
 * carries the map link.
 */
export function scenesInPlayOrder(corpus) {
  const out = [];
  for (const episode of corpus.episodes) {
    const scenes = [...(episode.scenes ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const scene of scenes) {
      out.push({
        episode,
        scene,
        brief: scene.briefRef ? corpus.sceneBriefs[scene.briefRef] ?? null : null,
        setEntry: scene.briefRef ? corpus.sceneSetByBriefRef[scene.briefRef] ?? null : null,
        briefRef: scene.briefRef ?? null,
        key: `${episode.id}#${scene.id}`
      });
    }
  }
  return out;
}

/** One scene by brief id, scene id, or `episodeId#sceneId`. */
export function findScene(corpus, needle) {
  const all = scenesInPlayOrder(corpus);
  return (
    all.find((s) => s.briefRef === needle) ??
    all.find((s) => s.key === needle) ??
    all.find((s) => s.scene.id === needle) ??
    null
  );
}
