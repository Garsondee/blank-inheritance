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
import { FALLBACK_EPISODE_PATHS, sourceIdFromPath } from "../core/world-sync.mjs";
import { documentEditFilename, documentEditSnapshot, editedSinceWritten, journalWords } from "../core/foundry-edits.mjs";
import { fetchModuleJson, writeReportFile, writeStorageJson, copyTextToClipboard, listModuleJsonIds, listModuleImageIds } from "./io.mjs";

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

async function runRealCreatureCase(fetchPath, { tokenImage = null, portraitImage = null } = {}) {
  const source = await fetchModuleJson(fetchPath);
  if (!isPushable(source)) return withheldForDraftStatus("creature", source, game.actors);

  const data = await buildCreatureActorData(source, { tokenImage, portraitImage });
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

// isPushable/withheldForDraftStatus are DELIBERATELY NOT called here, unlike
// runRealCreatureCase above -- see the block comment where REAL_NPC_PATHS
// used to live, further down this file, for why a social NPC's Actor sync
// and a creature/Claimant's are no longer the same gate.
async function runRealNpcCase(fetchPath, { tokenImage = null, portraitImage = null } = {}) {
  const source = await fetchModuleJson(fetchPath);

  const data = await buildNpcActorData(source, { tokenImage, portraitImage });
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
  if (existing) {
    // A journal Ingram has edited here, in Foundry, since this sync last wrote
    // it is never deleted and rebuilt from the repo -- her words are the
    // latest (design/scene-edits.md §7). Kept, said on the update card, and
    // filed into storage/ for me to fold into the repo.
    const words = journalWords(pagesOf(existing));
    const current = await contentHash(words);
    const written = existing.getFlag(FLAG_SCOPE, "pushedHash");
    if (editedSinceWritten(current, written)) {
      await fileKeptJournal(journalSource, existing, words);
      return { sourceId: journalSource.id, foundryType: "JournalEntry", expectedId: data._id, actualId: existing.id, checks: [], keptEdited: true, name: existing.name };
    }
    if (shouldSkip(existing, hash)) {
      // Journals made before this check carry no fingerprint yet; nothing had
      // been edited in Foundry when it arrived (Ingram, 2026-09-27), so the
      // words they hold now are the words the sync wrote.
      if (!written) await existing.setFlag(FLAG_SCOPE, "pushedHash", current);
      return { ...(await validateJournalEntry(existing, journalSource, data._id)), skipped: true };
    }
  }

  await teardown(game.journal, data._id);
  const created = await JournalEntry.create(data, { keepId: true, keepEmbeddedIds: true });
  if (created) {
    await created.setFlag(FLAG_SCOPE, "sourceId", journalSource.id);
    await created.setFlag(FLAG_SCOPE, "sourceHash", hash);
    // Taken from what Foundry STORED: its server cleans HTML on the way in,
    // so a fingerprint of what was sent would never match on the next sync.
    await created.setFlag(FLAG_SCOPE, "pushedHash", await contentHash(journalWords(pagesOf(created))));
  }
  return { ...(await validateJournalEntry(created, journalSource, data._id)), skipped: false };
}

/**
 * Whether a synced journal has been edited in Foundry since the sync last
 * wrote it. The world sync asks before retiring an old journal whose source
 * is gone: an edit of hers is never deleted, whatever happened to its source.
 */
export async function journalEditedInFoundry(journal) {
  if (!journal || journal.documentName !== "JournalEntry") return false;
  return editedSinceWritten(await contentHash(journalWords(pagesOf(journal))), journal.getFlag(FLAG_SCOPE, "pushedHash"));
}

/** A journal's pages as a plain list: a real EmbeddedCollection, or the plain array a test's mock document holds. */
function pagesOf(journal) {
  const pages = journal?.pages;
  if (Array.isArray(pages)) return pages;
  return pages?.contents ?? [];
}

async function fileKeptJournal(journalSource, journal, words) {
  try {
    const snapshot = documentEditSnapshot({
      kind: "journal",
      sourceId: journalSource.id,
      source: `data/episodes/${journalSource.id}.json`,
      name: journal.name,
      words,
      at: new Date().toISOString()
    });
    await writeStorageJson("", documentEditFilename("journal", journalSource.id), snapshot);
  } catch (err) {
    console.error(`Blank Inheritance | Kept your edits to "${journal.name}", but could not file a copy for Claude:`, err);
  }
}

// The module directories tools/token-ring/'s two staging scripts write into
// -- crop_ring_subject.py for the token's own canvas art (a circle-cropped
// subject), stage_npc_portraits.py for the Actor's own `img` and the
// Theatre-of-Mind character frame (an ordinary rectangular resize). Both are
// keyed by the entity's own repo `id` (asset-registry.json's assignedTo.ref
// IS the filename stem, by convention -- see either script's own header), so
// "does modules/blank-inheritance/assets/<dir>/<id>.webp exist" is the whole
// lookup: no hand-maintained id->path map to keep in sync with the registry
// by hand every time a new portrait is registered (that map used to live
// here, as TOKEN_IMAGE_BY_ID, exactly one entry deep). Resolved ONCE per
// sync run (one FilePicker.browse call per directory, not one per npc) and
// handed down to each case rather than looked up per-id inside it, so
// npc.mjs/creature.mjs stay pure functions of their arguments.
const TOKEN_ART_DIR = "assets/tokens";
const PORTRAIT_ART_DIR = "assets/stage";

async function resolveArtForId(id, stagedTokenIds, stagedPortraitIds) {
  return {
    tokenImage: stagedTokenIds.has(id) ? `modules/${MODULE_ID}/${TOKEN_ART_DIR}/${id}.webp` : null,
    portraitImage: stagedPortraitIds.has(id) ? `modules/${MODULE_ID}/${PORTRAIT_ART_DIR}/${id}.webp` : null
  };
}

// Every social NPC in data/npcs/ is synced now -- not a hand-picked
// REAL_NPC_PATHS array (this used to be exactly three names: shucks-mordant,
// nobu, intake-medicals-clerk). Changed 2026-09-29, at Ingram's direct
// request: every NPC should have a real Actor and a token she can click into
// during Theatre of Mind play, not just the few someone remembered to add to
// a list by hand -- and isPushable()'s sound/final requirement (below) was,
// checked directly, blocking all three of the old names anyway, since
// nothing in data/npcs/ has ever actually been promoted past "drafted".
//
// isPushable/PROMOTABLE_STATUSES is NOT weakened or bypassed by this --
// runRealCreatureCase above still uses it unchanged, and so would any other
// content type that keys off it later. What changed is narrower: a social
// NPC's own Actor sync no longer goes through that gate AT ALL, because the
// two protect different things. isPushable's whole point (see
// withheldForDraftStatus's comment, and design/approvals-desk.md §3) is
// "don't finalize Ingram's own unreviewed creative call without her" --
// but she is the one making that call, directly, by asking for this. And the
// mechanism she asked for is a HIDDEN token (foundry/scene-build.mjs), which
// design/theatre-of-the-mind-staging.md §4 already named as the right way to
// keep something off a player's client regardless of anything else about the
// document: "a Token's `hidden` flag plus document ownership already governs
// what is sent to a client." A GM-only reference sheet for a still-drafted
// NPC finalizes nothing a player will ever see.
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
// case (via runRealCreatureCase, still isPushable-gated -- a creature/
// Claimant's combat stat block is a different, still-sensitive kind of
// content from a social NPC's blurb, and stays behind the Approvals Desk)
// once a new, approved one exists.
const NPC_DIR = "data/campaign/npcs";
// The episodes whose journals this syncs when the caller names none. Stale
// for two weeks before 2026-09-27: it listed Episode One alone, a comment
// having said "Episode One is now the only episode in the repo" on the same
// day Episode Two was created, so Episode Two's journal never reached a
// world. The automatic world sync (foundry/world-sync.mjs) now passes the
// deploy stamp's own list of every episode file instead, and this list is
// only the fallback -- shared with it, so the two cannot disagree.
const REAL_EPISODE_PATHS = FALLBACK_EPISODE_PATHS.map((p) => `data/campaign/${p}`);

/**
 * Every source id this sync manages, for the world sync's old-document
 * clean-up. `npcSourceIds` are bare ids (every id runRealContentSync actually
 * processed this run, read straight off its own report -- see world-sync.mjs's
 * call site), unlike episodePaths, which are still module-relative paths, so
 * the two are combined rather than mapped through sourceIdFromPath the same
 * way.
 */
export function managedSourceIds(episodePaths = REAL_EPISODE_PATHS, npcSourceIds = []) {
  return new Set([...npcSourceIds, ...episodePaths.map(sourceIdFromPath)]);
}

/**
 * @param {object} [options]
 * @param {boolean} [options.quiet]  the automatic world sync's mode: still
 *   writes the report file, but posts no chat card, no toasts, and never
 *   touches the clipboard -- the world sync reports once for everything it did,
 *   and an update that runs by itself at login must not overwrite whatever the
 *   GM last copied.
 * @param {string[]} [options.episodePaths]  module-relative episode files to
 *   sync journals from; REAL_EPISODE_PATHS when omitted
 */
export async function runRealContentSync({ quiet = false, episodePaths = REAL_EPISODE_PATHS } = {}) {
  if (!game.user.isGM) {
    if (!quiet) ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.RealSync.NotGM"));
    return null;
  }

  if (!quiet) ui.notifications.info(game.i18n.localize("BLANKINHERITANCE.RealSync.Running"));
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
    const npcIds = await listModuleJsonIds(NPC_DIR);
    const [stagedTokenIds, stagedPortraitIds] = await Promise.all([
      listModuleImageIds(TOKEN_ART_DIR).then((ids) => new Set(ids)),
      listModuleImageIds(PORTRAIT_ART_DIR).then((ids) => new Set(ids))
    ]);
    for (const id of npcIds) {
      const art = await resolveArtForId(id, stagedTokenIds, stagedPortraitIds);
      report.results.push(await runCase(`npc:${id}`, () => runRealNpcCase(`${NPC_DIR}/${id}.json`, art)));
    }
    for (const path of episodePaths) {
      const label = path.split("/").pop().replace(/\.json$/, "");
      report.results.push(await runCase(`episode:${label}`, () => runRealJournalCase(path, episodeToJournalSource)));
    }
  } catch (err) {
    console.error("Blank Inheritance | Real content sync failed:", err);
    report.fatalError = err?.message ?? String(err);
  }

  if (quiet) {
    try {
      report.reportPath = await writeReportFile(report);
      report.reportFileWritten = true;
    } catch (err) {
      console.error("Blank Inheritance | Could not write report file:", err);
    }
    console.log("Blank Inheritance | Sync report:", report);
    return report;
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
