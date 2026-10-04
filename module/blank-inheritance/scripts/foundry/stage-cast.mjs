/**
 * A scene brief's own cast, for staging: the one place the Scene Runner and the Stagecraft bridge both build a person's
 * stage descriptor, find their portrait, read the brief a built scene belongs to, and tell the table a name.
 *
 * Moved here 2026-10-04 out of foundry/scene-runner.mjs when the stage itself started bringing people on (the wings,
 * foundry/stagecraft-bridge.mjs): two callers building the same person two ways is how the stage and the script end up
 * disagreeing about who is who.
 */

import { MODULE_ID } from "./stage-store.mjs";
import { fetchModuleJson, listModuleImageIds } from "./io.mjs";
import { displayName } from "../core/scene-brief.mjs";
import { isNameProtected, rawStageId, stageIdFor } from "../core/stage-names.mjs";
import { loadSceneEdits, overlayScene } from "./scene-edits.mjs";
import { revealName } from "./stage.mjs";
import { recordLogEntry } from "./session-log.mjs";

/**
 * The plain-data description of a brief's cast member that `summonToStage`
 * takes. One place, so the Cast fold's Stage key, the `npc-enter` trigger and
 * the stage's own wings cannot drift apart on what a protected person is
 * summoned with.
 */
export function summonDescriptorFor(member, sting) {
  const descriptor = {
    id: stageIdFor(member),
    // The real name, GM-side only: the stage publishes `called` in its place
    // until the table is told (core/stage-names.mjs#tableLabel). It is
    // core's own displayName, not a second fallback chain: it is what the
    // panel's heading uses, and a stage that labels someone differently from
    // the script beside it is worse than either label alone.
    name: displayName(member),
    img: member.img ?? stagePortraitFor(rawStageId(member)),
    isPc: false,
    // The brief's own authored arrival tier (scene-brief.schema.json's
    // `arrival`) fires Announced/Splash automatically on the beats that
    // called for it; castMemberFromDescriptor falls back to "quiet" for
    // null/undefined, same as a plain summon.
    sting: sting || undefined
  };
  if (isNameProtected(member)) {
    descriptor.called = member.called;
    descriptor.nameKey = rawStageId(member);
    descriptor.nameOnArrival = Boolean(member.nameOnArrival);
  }
  return descriptor;
}

/**
 * The id the STAGE stores them under.
 *
 * core/stage-layout.mjs#castMemberFromDescriptor prepends "summon-" to the
 * descriptor id itself, so the descriptor gets the RAW id and only this
 * function knows about the prefix. Passing an already-prefixed id produced
 * "summon-summon-shucks-mordant" — found live, first click.
 */
export function portraitIdFor(member) {
  return `summon-${stageIdFor(member)}`;
}

/**
 * Which stage portraits the module actually ships, by id.
 *
 * Browsed once per page rather than per render, and per cast member it is a
 * plain Set lookup. A brief's cast member has no Actor to take an `img` from,
 * so without this they stage as a nameplate over an empty frame.
 */
let stagePortraitIds = null;
export async function primeStagePortraits() {
  if (stagePortraitIds) return stagePortraitIds;
  stagePortraitIds = new Set(await listModuleImageIds("assets/stage"));
  return stagePortraitIds;
}

export function stagePortraitFor(id) {
  return stagePortraitIds?.has(id) ? `modules/${MODULE_ID}/assets/stage/${id}.webp` : undefined;
}

const briefs = new Map();

/**
 * A scene brief as the table will meet it: the deployed file with Ingram's
 * Scene Runner edits laid over it (design/scene-edits.md), or null. Read once
 * per page; `resetStageCastCache` forgets it (a deploy, an admin reset).
 */
export function loadBrief(briefRef) {
  if (!briefRef) return Promise.resolve(null);
  if (!briefs.has(briefRef)) {
    briefs.set(briefRef, (async () => {
      const brief = await fetchModuleJson(`data/campaign/scene-briefs/${briefRef}.json`).catch(() => null);
      if (!brief) return null;
      await loadSceneEdits().catch(() => {});
      return overlayScene({ brief }).brief ?? brief;
    })());
  }
  return briefs.get(briefRef);
}

/** The brief a built scene belongs to (the scene's `briefRef` flag), or null. */
export function briefOfScene(scene) {
  return loadBrief(scene?.getFlag?.(MODULE_ID, "briefRef") ?? null);
}

export function resetStageCastCache() {
  briefs.clear();
}

/**
 * Tell the table one person's real name, for the rest of the campaign wherever
 * they appear (foundry/stage.mjs#revealName), and say so in the session log.
 * `announce` drops the banner too. The Runner's Name key and the stage card's
 * "Tell their name" both come here.
 */
export async function tellName({ nameKey, called, name }, { announce = false } = {}) {
  if (!nameKey) return null;
  const when = await revealName(nameKey, { announce: Boolean(announce) });
  await recordLogEntry({
    text: game.i18n.format("BLANKINHERITANCE.Runner.NameToldLog", { called: called ?? "", name: name ?? nameKey }),
    nowIso: new Date().toISOString(),
    scene: canvas?.scene?.name ?? null,
    subject: `name:${nameKey}`
  }).catch((err) => console.error("Blank Inheritance | Could not log that name being told:", err));
  return when;
}
