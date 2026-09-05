import { deriveFoundryId, contentHash } from "../core/ids.mjs";
import { buildCreatureActorData } from "../core/generators/creature.mjs";
import { buildCharacterActorData } from "../core/generators/character.mjs";
import { buildSceneData } from "../core/generators/scene.mjs";
import { validateActor, validateScene } from "../core/validate.mjs";
import { summarizeReport, reportToHtml, reportToClipboardText } from "../core/report.mjs";
import { fetchModuleJson, writeReportFile, copyTextToClipboard } from "./io.mjs";

const MODULE_ID = "blank-inheritance";
const FLAG_SCOPE = MODULE_ID;
const TEST_MACRO_SOURCE_ID = "blank-inheritance-test-sync-macro";

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
  } catch (err) {
    // Belt-and-braces: nothing here should throw outside the three isolated
    // cases above, but if something unanticipated does, fail loudly rather
    // than silently.
    console.error("Blank Inheritance | Diagnostic test sync failed:", err);
    report.fatalError = err?.message ?? String(err);
  }

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
    ui.notifications.error(game.i18n.localize("BLANKINHERITANCE.TestSync.Failed"));
  } else {
    ui.notifications.info(
      game.i18n.format("BLANKINHERITANCE.TestSync.Complete", { passed: summary.passed, total: summary.total })
    );
  }

  console.log("Blank Inheritance | Diagnostic test sync report:", report);
  return report;
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
