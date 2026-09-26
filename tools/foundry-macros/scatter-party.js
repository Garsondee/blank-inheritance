/**
 * TEMPORARY DEMO — six candidate tokens, scattered across the mainland.
 *
 * Paste into a Foundry macro (Script type) and execute as GM, or run from the
 * console. Written 2026-09-22 for Ingram's own test: "Create 6 temporary PC
 * tokens, place them around the mainland, let's simulate 'The Road In' actually
 * live. You do it yourself once, then I'll do it myself to prove it works."
 *
 * WHY IT USES THE MODULE'S OWN MATHS. It imports sceneCalibration/toScenePoint
 * straight from core/travel-animation.mjs — the same two functions
 * foundry/travel.mjs uses to place the travelling marker. A demo with its own
 * private coordinate conversion would prove nothing about the real pipeline; if
 * these tokens land in the right places, the travel ritual's placement is right
 * too, because it is literally the same code.
 *
 * WHY "Candidate N" AND NOT NAMES. The six real PCs do not exist yet — they are
 * made collaboratively at the table during Induction, and inventing names here
 * would pre-empt that. "Candidate" is also what the Directorate's own letter
 * calls them, so it is what the institution would have written on a roster.
 *
 * CLEANUP. Everything created carries flags["blank-inheritance"].demoParty, so
 * removing it all is one filter — see the bottom of this file.
 *
 * SUPERSEDED BY THE DEMO RUNNER 2026-09-23 for everyday use — the "Blank
 * Inheritance: Demos" macro's own "The Road In → Intake Medicals" walk now
 * does this as its own first step (foundry/demo-runner.mjs's
 * scatterDemoParty, sharing this exact plan via core/demo-party.mjs) and
 * follows it straight into a real map crossing. This file is kept as the
 * standalone, no-panel entry point for running just the scatter on its own.
 */

const MODULE_ID = "blank-inheritance";

const { sceneCalibration } = await import(`/modules/${MODULE_ID}/scripts/core/travel-animation.mjs`);
const { demoPartyPlan } = await import(`/modules/${MODULE_ID}/scripts/core/demo-party.mjs`);
const { deriveFoundryId } = await import(`/modules/${MODULE_ID}/scripts/core/ids.mjs`);

/** The campaign-map hub scene — the same one travel.mjs animates on. */
const hubId = await deriveFoundryId("scene-the-city");
const hub = game.scenes.get(hubId) ?? game.scenes.find((s) => s.getFlag(MODULE_ID, "sourceId") === "the-city");
if (!hub) throw new Error("No campaign-map hub scene in this world — build it before running this demo.");

// The manifest's own image width, so the calibration matches travel.mjs exactly.
const manifest = await foundry.utils.fetchJsonWithTimeout(
  `/modules/${MODULE_ID}/data/campaign/map/campaign-map.json`
);
const calibration = sceneCalibration(hub.tiles?.contents ?? [], hub.width, manifest?.image?.width ?? hub.width);
const plan = await demoPartyPlan(calibration);

// --- one Actor per candidate, reused on a re-run ---------------------------
const created = [];
for (const p of plan) {
  let actor = game.actors.get(p.actorId);
  if (!actor) {
    [actor] = await Actor.createDocuments([{
      _id: p.actorId,
      name: p.label,
      type: "character",
      img: "icons/svg/mystery-man.svg",
      flags: { [MODULE_ID]: { demoParty: true, originRef: p.originRef } }
    }], { keepId: true });
  }

  const existing = hub.tokens.get(p.tokenId);
  if (existing) {
    await existing.update({ x: p.x, y: p.y });
  } else {
    await hub.createEmbeddedDocuments("Token", [{
      _id: p.tokenId,
      actorId: actor.id,
      name: p.label,
      x: p.x,
      y: p.y,
      width: 1,
      height: 1,
      texture: { src: "icons/svg/mystery-man.svg" },
      disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      flags: { [MODULE_ID]: { demoParty: true, originRef: p.originRef } }
    }], { keepId: true });
  }
  created.push(`${p.label} @ ${p.originRef} (${p.x}, ${p.y})`);
}

ui.notifications.info(`Scattered ${created.length} candidates across the mainland.`);
console.log("Blank Inheritance | demo party placed:\n" + created.join("\n"));

/* ---------------------------------------------------------------------------
CLEANUP — paste this instead when the demo is done:

const MODULE_ID = "blank-inheritance";
const hub = game.scenes.find((s) => s.tokens.some((t) => t.getFlag(MODULE_ID, "demoParty")));
if (hub) {
  await hub.deleteEmbeddedDocuments("Token",
    hub.tokens.filter((t) => t.getFlag(MODULE_ID, "demoParty")).map((t) => t.id));
}
await Actor.deleteDocuments(
  game.actors.filter((a) => a.getFlag(MODULE_ID, "demoParty")).map((a) => a.id));
ui.notifications.info("Demo party removed.");
--------------------------------------------------------------------------- */
