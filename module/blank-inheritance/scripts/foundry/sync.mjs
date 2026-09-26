import { deriveFoundryId, contentHash } from "../core/ids.mjs";
import { buildCreatureActorData } from "../core/generators/creature.mjs";
import { buildNpcActorData } from "../core/generators/npc.mjs";
import { authoredProfileFromNpc } from "../core/authored-profile.mjs";
import { authoredProfileFor, writeAuthoredProfile } from "./social-store.mjs";
import { buildCharacterActorData } from "../core/generators/character.mjs";
import { buildSceneData } from "../core/generators/scene.mjs";
import { buildJournalEntryData, episodeToJournalSource } from "../core/generators/journal.mjs";
import { validateActor, validateScene, validateJournalEntry } from "../core/validate.mjs";
import { summarizeReport, reportToHtml, reportToClipboardText } from "../core/report.mjs";
import { PROMOTABLE_STATUSES } from "../core/promote.mjs";
import { fetchModuleJson, writeReportFile, copyTextToClipboard } from "./io.mjs";

const MODULE_ID = "blank-inheritance";
const FLAG_SCOPE = MODULE_ID;
const TEST_MACRO_SOURCE_ID = "blank-inheritance-test-sync-macro";
const REAL_SYNC_MACRO_SOURCE_ID = "blank-inheritance-real-sync-macro";

/**
 * Delete any pre-existing document at this id before creating a fresh one.
 * Deterministic ids mean re-running the sync against unchanged data would
 * otherwise collide with the previous run's documents — this is what makes
 * the diagnostic re-runnable instead of a one-shot.
 * (Bug found after the first live run, 2026-08-22 — see design/testing-strategy.md.)
 *
 * Deliberately teardown-BEFORE-setup, not after: the created documents stay
 * visible in Foundry for manual GM inspection after a run completes, which
 * is exactly how this diagnostic has been used so far.
 */
async function teardown(collection, id) {
  const existing = collection.get(id);
  if (existing) await existing.delete();
}

/**
 * Compares a freshly computed source hash against whatever hash flag is
 * already stored on an existing document at that deterministic id. Returns
 * false (never skip) if there's no existing document, or no stored hash yet
 * — this is the read half of the write-only hash-flag mechanism that's
 * existed since Stage 1 (`contentHash` was always computed and stored, but
 * nothing compared against it until now — GH issue #113).
 */
function shouldSkip(existingDocument, freshHash) {
  if (!existingDocument) return false;
  return existingDocument.getFlag(FLAG_SCOPE, "sourceHash") === freshHash;
}

/**
 * Run one case in isolation: if it throws, report that as a failed result
 * for THIS case only and keep going, rather than the whole sync aborting
 * because one case failed. (Gap found while bootstrapping the test suite,
 * 2026-08-22: the original three-case sequence shared one try/catch, so a
 * creature-case failure would silently skip the character and scene cases
 * too — not what "run all cases" in design/testing-strategy.md's tier-4
 * description actually means.)
 */
async function runCase(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(`Blank Inheritance | Case "${label}" failed:`, err);
    return {
      sourceId: label,
      foundryType: "Case",
      expectedId: null,
      actualId: null,
      checks: [{ label: `case "${label}" completed without throwing`, expected: true, actual: false, pass: false }]
    };
  }
}

async function runCreatureCase(actorIdBySourceId) {
  const creatureSource = await fetchModuleJson("data/_test-fixtures/test-creature.json");
  const creatureData = await buildCreatureActorData(creatureSource);
  const creatureHash = await contentHash(creatureSource);

  const existing = game.actors.get(creatureData._id);
  if (shouldSkip(existing, creatureHash)) {
    actorIdBySourceId[creatureSource.id] = existing.id;
    return { ...(await validateActor(existing, creatureSource, creatureData._id, "creature")), skipped: true };
  }

  await teardown(game.actors, creatureData._id);
  const createdCreature = await Actor.create(creatureData, { keepId: true });
  if (createdCreature) {
    await createdCreature.setFlag(FLAG_SCOPE, "sourceId", creatureSource.id);
    await createdCreature.setFlag(FLAG_SCOPE, "sourceHash", creatureHash);
    actorIdBySourceId[creatureSource.id] = createdCreature.id;
  }
  return { ...(await validateActor(createdCreature, creatureSource, creatureData._id, "creature")), skipped: false };
}

async function runCharacterCase(actorIdBySourceId) {
  const characterSource = await fetchModuleJson("data/_test-fixtures/test-character.json");
  const characterData = await buildCharacterActorData(characterSource);
  const characterHash = await contentHash(characterSource);

  const existing = game.actors.get(characterData._id);
  if (shouldSkip(existing, characterHash)) {
    actorIdBySourceId[characterSource.id] = existing.id;
    return { ...(await validateActor(existing, characterSource, characterData._id, "character")), skipped: true };
  }

  await teardown(game.actors, characterData._id);
  const createdCharacter = await Actor.create(characterData, { keepId: true });
  if (createdCharacter) {
    await createdCharacter.setFlag(FLAG_SCOPE, "sourceId", characterSource.id);
    await createdCharacter.setFlag(FLAG_SCOPE, "sourceHash", characterHash);
    actorIdBySourceId[characterSource.id] = createdCharacter.id;
  }
  return { ...(await validateActor(createdCharacter, characterSource, characterData._id, "character")), skipped: false };
}

async function runSceneCase(actorIdBySourceId) {
  const sceneSource = await fetchModuleJson("data/_test-fixtures/test-scene.json");
  const sceneData = await buildSceneData(sceneSource, actorIdBySourceId);
  const sceneHash = await contentHash(sceneSource);

  const existing = game.scenes.get(sceneData._id);
  if (shouldSkip(existing, sceneHash)) {
    return { ...(await validateScene(existing, sceneSource, sceneData._id, actorIdBySourceId)), skipped: true };
  }

  await teardown(game.scenes, sceneData._id);
  const createdScene = await Scene.create(sceneData, { keepId: true, keepEmbeddedIds: true });
  if (createdScene) {
    await createdScene.setFlag(FLAG_SCOPE, "sourceId", sceneSource.id);
    await createdScene.setFlag(FLAG_SCOPE, "sourceHash", sceneHash);
  }
  return { ...(await validateScene(createdScene, sceneSource, sceneData._id, actorIdBySourceId)), skipped: false };
}

async function runJournalCase() {
  const journalSource = await fetchModuleJson("data/_test-fixtures/test-journal.json");
  const journalData = await buildJournalEntryData(journalSource);
  const journalHash = await contentHash(journalSource);

  const existing = game.journal.get(journalData._id);
  if (shouldSkip(existing, journalHash)) {
    return { ...(await validateJournalEntry(existing, journalSource, journalData._id)), skipped: true };
  }

  await teardown(game.journal, journalData._id);
  const createdJournal = await JournalEntry.create(journalData, { keepId: true, keepEmbeddedIds: true });
  if (createdJournal) {
    await createdJournal.setFlag(FLAG_SCOPE, "sourceId", journalSource.id);
    await createdJournal.setFlag(FLAG_SCOPE, "sourceHash", journalHash);
  }
  return { ...(await validateJournalEntry(createdJournal, journalSource, journalData._id)), skipped: false };
}

/**
 * Shared tail for every sync entry point below: write the report file, copy
 * it to the clipboard, post the whispered chat message, and show the right
 * success/failure notification. Every entry point's case-running logic
 * differs; this part never has, so it isn't duplicated per entry point.
 */
async function finalizeSync(report, i18nKeys) {
  const summary = summarizeReport(report);

  try {
    report.reportPath = await writeReportFile(report);
    report.reportFileWritten = true;
  } catch (err) {
    console.error("Blank Inheritance | Could not write report file:", err);
  }

  // Best-effort — a real GM session that isn't a secure/HTTPS context, or
  // lacks clipboard permission, must not make the rest of the sync fail.
  // The chat message below tells the GM either way (see reportToHtml).
  //
  // clipboardCopied is set to true BEFORE building the clipboard text, not
  // after copyTextToClipboard resolves: the JSON that actually lands on the
  // clipboard is a snapshot of `report` taken at serialization time, so
  // setting the flag afterwards would mean a *successful* copy still reads
  // "clipboardCopied: false" inside its own payload — caught by the tier-4
  // test asserting the clipboard JSON matches the returned report exactly.
  // Reset to false in the catch if the copy actually failed; in that case
  // nothing reached the clipboard for the flag's value to be inconsistent with.
  try {
    report.clipboardCopied = true;
    await copyTextToClipboard(reportToClipboardText(report, summary));
  } catch (err) {
    report.clipboardCopied = false;
    console.error("Blank Inheritance | Could not copy report to clipboard:", err);
  }

  await ChatMessage.create({ content: reportToHtml(report, summary), whisper: [game.user.id] });

  if (report.fatalError) {
    ui.notifications.error(game.i18n.localize(i18nKeys.failed));
  } else {
    ui.notifications.info(game.i18n.format(i18nKeys.complete, { passed: summary.passed, total: summary.total }));
  }

  console.log("Blank Inheritance | Sync report:", report);
  return report;
}

export async function runDiagnosticTestSync() {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.TestSync.NotGM"));
    return null;
  }

  ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.TestSync.Running"));
  console.log("Blank Inheritance | Starting diagnostic test sync...");

  const report = {
    timestamp: new Date().toISOString(),
    results: [],
    fatalError: null,
    reportFileWritten: false,
    reportPath: null,
    clipboardCopied: false
  };

  try {
    const actorIdBySourceId = {};
    // Each case is isolated by runCase — a creature-case failure still lets
    // the character and scene cases run and report their own results.
    report.results.push(await runCase("creature", () => runCreatureCase(actorIdBySourceId)));
    report.results.push(await runCase("character", () => runCharacterCase(actorIdBySourceId)));
    report.results.push(await runCase("scene", () => runSceneCase(actorIdBySourceId)));
    report.results.push(await runCase("journal", () => runJournalCase()));
  } catch (err) {
    // Belt-and-braces: nothing here should throw outside the three isolated
    // cases above, but if something unanticipated does, fail loudly rather
    // than silently.
    console.error("Blank Inheritance | Diagnostic test sync failed:", err);
    report.fatalError = err?.message ?? String(err);
  }

  return finalizeSync(report, {
    failed: "BLANKINHERITANCE.TestSync.Failed",
    complete: "BLANKINHERITANCE.TestSync.Complete"
  });
}

/**
 * design/approvals-desk.md §3, issue #168: "drafted must actually withhold
 * something." A creature/NPC has no sub-structure to partially reveal the
 * way an episode's scenes do (see episodeToJournalSource's own per-page
 * gating), so the gate here is coarse: the whole document, or nothing.
 * `existingCollection` lets the report show what's actually live right now
 * (if this content predates the gate) without this function creating or
 * touching anything.
 */
async function withheldForDraftStatus(foundryType, source, existingCollection) {
  const expectedId = await deriveFoundryId(source.id);
  const existing = existingCollection.get(expectedId);
  const status = source.authoring?.status ?? "(no authoring block)";
  return {
    sourceId: source.id,
    foundryType,
    expectedId,
    actualId: existing?.id ?? null,
    checks: [],
    withheld: true,
    withheldReason: `authoring.status is "${status}", not sound/final -- run promote() (module/blank-inheritance/scripts/core/promote.mjs) before this can sync`
  };
}

// Exported (issue #172's own explicit ask: "the sync eligibility set equals
// the set of items at sound or above") so that equivalence is a direct,
// dedicated unit test rather than only ever exercised indirectly through a
// full mocked sync run.
export function isPushable(source) {
  return PROMOTABLE_STATUSES.includes(source?.authoring?.status);
}

async function runRealCreatureCase(fetchPath) {
  const source = await fetchModuleJson(fetchPath);
  if (!isPushable(source)) return withheldForDraftStatus("creature", source, game.actors);

  const data = await buildCreatureActorData(source, { tokenImage: TOKEN_IMAGE_BY_ID[source.id] ?? null });
  const hash = await contentHash(source);

  const existing = game.actors.get(data._id);
  if (shouldSkip(existing, hash)) {
    return { ...(await validateActor(existing, source, data._id, "creature")), skipped: true };
  }

  await teardown(game.actors, data._id);
  const created = await Actor.create(data, { keepId: true });
  if (created) {
    await created.setFlag(FLAG_SCOPE, "sourceId", source.id);
    await created.setFlag(FLAG_SCOPE, "sourceHash", hash);
  }
  return { ...(await validateActor(created, source, data._id, "creature")), skipped: false };
}

async function runRealNpcCase(fetchPath) {
  const source = await fetchModuleJson(fetchPath);
  if (!isPushable(source)) return withheldForDraftStatus("npc", source, game.actors);

  const data = await buildNpcActorData(source, { tokenImage: TOKEN_IMAGE_BY_ID[source.id] ?? null });
  const hash = await contentHash(source);

  const existing = game.actors.get(data._id);
  if (shouldSkip(existing, hash)) {
    await syncAuthoredProfile(source, data._id);
    return { ...(await validateActor(existing, source, data._id, "npc")), skipped: true };
  }

  await teardown(game.actors, data._id);
  const created = await Actor.create(data, { keepId: true });
  if (created) {
    await created.setFlag(FLAG_SCOPE, "sourceId", source.id);
    await created.setFlag(FLAG_SCOPE, "sourceHash", hash);
  }
  await syncAuthoredProfile(source, data._id);
  return { ...(await validateActor(created, source, data._id, "npc")), skipped: false };
}

/**
 * Carry an NPC's authored `socialProfile` into the intel vault.
 *
 * Runs on every npc sync, including a skipped one: the Actor may be unchanged
 * while the authored Facts have been edited, and Facts live on the vault rather
 * than on the Actor, so an Actor-level hash says nothing about them.
 *
 * Whether a Fact is REVEALED is table state and stays with the vault -- the
 * merge protecting it is in core/authored-profile.mjs.
 */
/** Character Cards that could not be stored this run. Reset per sync run. */
let cardStoreFailures = 0;

/** Zero the per-run counter. Called at the top of each sync run. */
export function resetCardStoreFailures() {
  const previous = cardStoreFailures;
  cardStoreFailures = 0;
  return previous;
}

async function syncAuthoredProfile(source, actorId) {
  if (!source?.socialProfile) return null;
  try {
    const profile = authoredProfileFromNpc(source, authoredProfileFor(actorId));
    if (!profile) return null;
    return await writeAuthoredProfile(actorId, profile);
  } catch (error) {
    // Never fail an Actor sync over a Character Card. A world with no intel
    // vault is a legitimate state, and so is one where the social layer has
    // not been initialised.
    //
    // Warn ONCE per run rather than per NPC: the cause is almost always a
    // single missing vault, and nine identical lines is a wall rather than a
    // report. The count is what a reader actually needs.
    cardStoreFailures += 1;
    if (cardStoreFailures === 1) {
      console.warn(
        `Blank Inheritance | Actors are syncing, but authored Character Cards cannot be stored (first: "${actorId}"). Further occurrences this run are counted, not logged.`,
        error
      );
    }
    return null;
  }
}

/**
 * `transform` adapts whatever real data/*.json shape lives at `fetchPath`
 * into buildJournalEntryData's {id, name, pages} input shape -- e.g.
 * episodeToJournalSource for an episode file. Kept generic here (rather than
 * one hardcoded shape like the diagnostic runJournalCase above) since real
 * campaign content that becomes a JournalEntry comes in more than one native
 * shape (episodes today; NPC bios and faction lore are the same idea later).
 */
async function runRealJournalCase(fetchPath, transform) {
  const rawSource = await fetchModuleJson(fetchPath);
  const journalSource = transform(rawSource);
  const data = await buildJournalEntryData(journalSource);
  const hash = await contentHash(journalSource);

  const existing = game.journal.get(data._id);
  if (shouldSkip(existing, hash)) {
    return { ...(await validateJournalEntry(existing, journalSource, data._id)), skipped: true };
  }

  await teardown(game.journal, data._id);
  const created = await JournalEntry.create(data, { keepId: true, keepEmbeddedIds: true });
  if (created) {
    await created.setFlag(FLAG_SCOPE, "sourceId", journalSource.id);
    await created.setFlag(FLAG_SCOPE, "sourceHash", hash);
  }
  return { ...(await validateJournalEntry(created, journalSource, data._id)), skipped: false };
}

// A staged Dynamic Token Ring subject texture (tools/token-ring/'s output),
// keyed by the entity's own repo `id` -- resolved here, not inside
// core/generators/npc.mjs|creature.mjs themselves, so those stay pure
// functions of their arguments (see token-ring.mjs's header). Only
// shucks-mordant has one so far: the six placeholder Directorate-staff
// portraits assigned 2026-09-18 (hospital-chief-of-staff, school-history-
// teacher, works-manager, section-officer, repair-chief-ishikawa,
// repair-chief-kaneda) are DELIBERATELY NOT listed here even though they're
// already circle-cropped and registered in asset-registry.json -- see the
// REAL_NPC_PATHS comment immediately below for why a still-placeholder NPC
// never belongs in this real/live sync regardless of whether art exists for
// it. Demoed instead against the local throwaway Foundry world.
const TOKEN_IMAGE_BY_ID = {
  "shucks-mordant": "modules/blank-inheritance/assets/tokens/shucks-mordant.webp"
};

// Real content synced so far -- deliberately NOT the kids/Frames (still
// marked DRAFT/not confirmed in data/characters/) or the three Directorate
// poles (Commander/Caretaker/Transparency Advocate are still "placeholder —
// not yet named or cast"). Syncing draft/placeholder identity content into a
// live world reads as finalizing it, which is the user's collaborative
// creative call to make, not something to do just because the pipeline can
// now technically reach it -- see CLAUDE.md's "don't invent/finalize the six
// kids/Frames" rule. The episode outlines and the three NPCs below all have
// no such open-question flag -- each is "established and voiced" per its own
// data/npcs/*.json status field, not a placeholder. This is also why
// TOKEN_IMAGE_BY_ID above stays this short: a portrait existing for a
// placeholder NPC is not the same thing as that NPC being real enough to
// sync -- the same "placeholder" status gate applies to both.
//
// REMOVED 2026-09-19, at Ingram's direct instruction: there was a
// REAL_CLAIMANT_PATH constant here and a "claimant:contact-unclassified" case
// in runRealContentSync() below, pointing at
// data/antagonists/claimants/contact-unclassified.json. That file (and the
// whole frame-scale battle-simulator engine/AI it was also the single source
// of truth for -- see tools/battle-simulator/data/combatants.mjs's own former
// header) was deleted: unapproved, stale, and the frame-scale simulator work
// it belonged to predates and is lower quality than the personnel-scale work
// that superseded it. No real Claimant exists to sync right now. Restore this
// case (same shape as REAL_NPC_PATHS below, but via runRealCreatureCase since
// a Claimant carries a combat statblock) once a new, approved one exists.
// Statblock-less social NPCs, already fully written in ideas/story/bible/ and
// voiced in real scene briefs -- see GitHub epic #140's Session 0/1 audit.
// Pushed via buildNpcActorData (core/generators/npc.mjs), not
// buildCreatureActorData: none of the three carry a combat statblock.
const REAL_NPC_PATHS = [
  "data/campaign/npcs/shucks-mordant.json",
  "data/campaign/npcs/nobu.json",
  "data/campaign/npcs/intake-medicals-clerk.json"
];
// Narrowed 2026-09-13: the three episodes this used to list were deleted along
// with every other drafted beat beyond Session 0/1 (see CLAUDE.md's data/episodes
// entry). Episode One is now the only episode in the repo, and the only one this
// pipeline has anything real to push.
const REAL_EPISODE_PATHS = [
  "data/campaign/episodes/episode-c1e1-mothers-maiden-name.json"
];

export async function runRealContentSync() {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.RealSync.NotGM"));
    return null;
  }

  ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.RealSync.Running"));
  console.log("Blank Inheritance | Starting real content sync...");

  const report = {
    timestamp: new Date().toISOString(),
    results: [],
    fatalError: null,
    reportFileWritten: false,
    reportPath: null,
    clipboardCopied: false
  };

  try {
    for (const path of REAL_NPC_PATHS) {
      const label = path.split("/").pop().replace(/\.json$/, "");
      report.results.push(await runCase(`npc:${label}`, () => runRealNpcCase(path)));
    }
    for (const path of REAL_EPISODE_PATHS) {
      const label = path.split("/").pop().replace(/\.json$/, "");
      report.results.push(await runCase(`episode:${label}`, () => runRealJournalCase(path, episodeToJournalSource)));
    }
  } catch (err) {
    console.error("Blank Inheritance | Real content sync failed:", err);
    report.fatalError = err?.message ?? String(err);
  }

  return finalizeSync(report, {
    failed: "BLANKINHERITANCE.RealSync.Failed",
    complete: "BLANKINHERITANCE.RealSync.Complete"
  });
}

export async function createTestSyncMacroIfMissing() {
  const macroId = await deriveFoundryId(TEST_MACRO_SOURCE_ID);
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: game.i18n.localize("BLANKINHERITANCE.TestSync.MacroName"),
      type: "script",
      img: "icons/svg/dice-target.svg",
      command: `await game.modules.get("${MODULE_ID}").api.runDiagnosticTestSync();`
    },
    { keepId: true }
  );
  console.log("Blank Inheritance | Created the diagnostic test-sync macro.");
}

/** Manual fallback for runRealContentSync, same as the diagnostic macro above -- for re-running later in a session, after the automatic canvasReady prompt. */
export async function createRealSyncMacroIfMissing() {
  const macroId = await deriveFoundryId(REAL_SYNC_MACRO_SOURCE_ID);
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: game.i18n.localize("BLANKINHERITANCE.RealSync.MacroName"),
      type: "script",
      img: "icons/svg/upgrade.svg",
      command: `await game.modules.get("${MODULE_ID}").api.runRealContentSync();`
    },
    { keepId: true }
  );
  console.log("Blank Inheritance | Created the real content sync macro.");
}
