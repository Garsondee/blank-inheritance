/**
 * The Approvals Desk — issue #170. Opens the real play-sequence queue
 * (issues #169/#170's own core/play-sequence.mjs + core/approvals-desk.mjs),
 * shows one item at a time, and grades it with a single keystroke.
 *
 * RENDERING, HONESTLY SCOPED: design/approvals-desk.md §4 asks for each item
 * type to render "in costume" — a location's Encyclopaedia-check card, an
 * NPC's real Character Card, etc. For an NPC that already has a live Actor,
 * this opens the REAL, existing Character Card (character-card.mjs) as a
 * genuine "view in costume" action, not a reimplementation. Every other type
 * — and an NPC with no Actor yet — gets a clean, real, but SIMPLER structured
 * summary of its own authored fields. The bespoke costumes design/
 * approvals-desk.md §4's table names for locations/scenes/encounters/
 * correspondence are not built here; flagged as a known follow-up rather
 * than faked with something that only looks complete.
 *
 * WHERE A GRADE GOES: promote() (core/promote.mjs) computes the graded
 * entity in memory; this writes it to storage/ (writeStorageJson, the same
 * upload mechanism the harvest pipeline already uses) so it survives the
 * session and WinSCP can carry it home. Actually merging a harvested grade
 * back into the canonical data/*.json file, and having the live sync gate
 * (#168) see it, is issue #172's explicit "wire approval to sync" — not
 * duplicated here.
 */

import {
  buildDeskQueue, createDeskState, deskCurrentItem, deskNext, deskPrev,
  deskGrade, deskUndo
} from "../core/approvals-desk.mjs";
import { computePlaySequenceSet } from "../core/play-sequence.mjs";
import { promote } from "../core/promote.mjs";
import { fileChangesInstruction, cutItem, computeOutTray } from "../core/bounce.mjs";
import { deriveFoundryId } from "../core/ids.mjs";
import { fetchModuleJson, listModuleJsonIds, writeStorageJson } from "./io.mjs";
import { openCharacterCard } from "./character-card.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "blank-inheritance";
const MACRO_SOURCE_ID = "blank-inheritance-approvals-desk-macro";
// A `changes` bounce writes the WHOLE updated lore-instructions.json here
// (not per-entity, since it's one aggregated document) -- same storage/
// mechanism and reasoning as desk-grade-*.json above.
const LORE_INSTRUCTIONS_STORAGE_PATH = "desk-lore-instructions.json";

// Matches tools/module-sync/stage-campaign-data.mjs's own SYNCED_CAMPAIGN_DIRS
// allow-list exactly -- data/<dirName>/ deploys 1:1 under the module's own
// data/campaign/<dirName>/. "creature" is deliberately absent: zero creature
// files exist anywhere in the repo today (no approved Claimant yet), and the
// real path when one does exist is the NESTED data/antagonists/claimants/,
// which this flat, one-level listModuleJsonIds can't browse correctly anyway
// -- a latent gap to close together whenever a real creature actually lands,
// not a silently-wrong mapping to leave in place until then.
const DATA_DIR_BY_TYPE = {
  npc: "data/campaign/npcs",
  challenge: "data/campaign/challenges",
  subsystem: "data/campaign/subsystems",
  encounter: "data/campaign/encounters",
  location: "data/campaign/locations",
  "scene-brief": "data/campaign/scene-briefs"
};

async function loadAllByType(type) {
  const dir = DATA_DIR_BY_TYPE[type];
  if (!dir) return {};
  const ids = await listModuleJsonIds(dir);
  const out = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        out[id] = await fetchModuleJson(`${dir}/${id}.json`);
      } catch (err) {
        console.warn(`Blank Inheritance | Approvals Desk could not load ${dir}/${id}.json`, err);
      }
    })
  );
  return out;
}

/**
 * Everything computePlaySequenceSet/buildDeskQueue need, loaded from the
 * module's own deployed copy of data/. Exported (alongside the class itself)
 * purely so a mocked-adapter test can assert on the exact fetch paths used --
 * see test/tier4-mocked-adapter.test.mjs's "loadCatalog: every singleton
 * fetch..." test, added after the doubled-data/campaign/campaign path
 * mistake below shipped undetected across #170-#172.
 */
export async function loadCatalog() {
  const episodeIds = await listModuleJsonIds("data/campaign/episodes");
  const episodes = await Promise.all(episodeIds.map((id) => fetchModuleJson(`data/campaign/episodes/${id}.json`)));

  const [npcs, challenges, subsystems, encounters, locations, sceneBriefs] = await Promise.all([
    loadAllByType("npc"), loadAllByType("challenge"), loadAllByType("subsystem"),
    loadAllByType("encounter"), loadAllByType("location"),
    loadAllByType("scene-brief")
  ]);
  const creatures = {}; // none exist yet -- see DATA_DIR_BY_TYPE's own note

  // Every singleton below lives at repo data/campaign/<file> — which
  // stage-campaign-data.mjs deploys under the module at the DOUBLED
  // data/campaign/campaign/<file>, same as campaign-state.mjs's CONFIG_PATH
  // and sync.mjs's REAL_EPISODE_PATHS already document and rely on. This
  // block used to fetch the single-"campaign" path for all four and 404 on
  // every one of them, silently, since each fetch is its own try/catch
  // falling back to null/"Nothing here." — found live 2026-09-20 while
  // verifying #172's out-tray sections actually render real data, not just
  // an empty state that looks the same as a working one.
  let sceneSetByBriefRef = {};
  try {
    const sceneSet = await fetchModuleJson("data/campaign/campaign/scene-set.json");
    for (const s of sceneSet.scenes ?? []) if (s.briefRef) sceneSetByBriefRef[s.briefRef] = s;
  } catch (err) {
    console.warn("Blank Inheritance | Approvals Desk could not load scene-set.json", err);
  }

  // The out-tray's two remaining sources (issue #171 §6) -- needs-lore items
  // are just a filter over allEntitiesById below, not a separate fetch.
  let loreInstructions = null;
  try {
    loreInstructions = await fetchModuleJson("data/campaign/campaign/lore-instructions.json");
  } catch (err) {
    console.warn("Blank Inheritance | Approvals Desk could not load lore-instructions.json", err);
  }
  let gazetteerRequests = null;
  try {
    // Not a "campaign" singleton -- gazetteer-requests.json is staged out of
    // data/map/ instead (stage-campaign-data.mjs's SYNCED_MAP_FILES, right
    // alongside travel-graph.json/campaign-map.json, which travel.mjs's own
    // TRAVEL_GRAPH_PATH/CAMPAIGN_MAP_MANIFEST_PATH already read from this
    // same data/campaign/map/ location).
    gazetteerRequests = await fetchModuleJson("data/campaign/map/gazetteer-requests.json");
  } catch (err) {
    console.warn("Blank Inheritance | Approvals Desk could not load gazetteer-requests.json", err);
  }

  // issue #172's two "waiting on Ingram, not gradeable here" sources -- see
  // core/bounce.mjs's own header for why they're kept out of the out-tray's
  // "waiting on Claude" total despite sharing its screen.
  let openQuestions = null;
  try {
    openQuestions = await fetchModuleJson("data/campaign/campaign/open-questions.json");
  } catch (err) {
    console.warn("Blank Inheritance | Approvals Desk could not load open-questions.json", err);
  }
  let audioLibrary = null;
  let audioReview = null;
  try {
    [audioLibrary, audioReview] = await Promise.all([
      fetchModuleJson("data/campaign/audio/library.json"),
      fetchModuleJson("data/campaign/audio/review.json")
    ]);
  } catch (err) {
    console.warn("Blank Inheritance | Approvals Desk could not load audio library/review", err);
  }

  const allEntitiesById = { ...npcs, ...challenges, ...subsystems, ...encounters, ...locations, ...creatures };
  for (const episode of episodes) {
    allEntitiesById[episode.id] = episode;
    for (const scene of episode.scenes ?? []) allEntitiesById[scene.id] = scene;
  }

  return {
    episodes, npcs, challenges, subsystems, encounters, locations, creatures, sceneBriefs, sceneSetByBriefRef,
    allEntitiesById, loreInstructions, gazetteerRequests, openQuestions, audioLibrary, audioReview
  };
}

/** Plain-language fields worth showing per type, in order -- not every field, not raw JSON. */
const SUMMARY_FIELDS_BY_TYPE = {
  "episode-scene": [["description", "Description"]],
  npc: [["role", "Role"], ["description", "Description"], ["designNotes", "Design notes"]],
  location: [["kind", "Kind"], ["lore.summary", "Summary"], ["lore.playerFacing", "Player-facing"], ["lore.gmOnly", "GM only"]],
  challenge: [["description", "Description"], ["levelContext", "Level context"]],
  encounter: [["description", "Description"], ["environment", "Environment"], ["specialRules", "Special rules"]],
  subsystem: [["description", "Description"], ["winCondition", "Win condition"]],
  creature: [["notes", "Notes"]]
};

function readPath(obj, dotted) {
  return dotted.split(".").reduce((v, k) => v?.[k], obj);
}

function itemDisplayName(item, catalog) {
  const entity = catalog.allEntitiesById[item.id] ?? {};
  return entity.name ?? entity.title ?? entity.workingName ?? item.id;
}

/** Renders the CURRENT item's own authored fields, honestly and simply -- see this file's header for the costume-fidelity scope note. */
function renderItemBody(item, catalog) {
  const entity = catalog.allEntitiesById[item.id] ?? {};
  const fields = SUMMARY_FIELDS_BY_TYPE[item.type] ?? [];
  const rows = fields
    .map(([path, label]) => {
      const value = readPath(entity, path);
      if (!value) return "";
      const text = Array.isArray(value) ? value.join("; ") : String(value);
      return `<p class="bi-desk__field"><strong>${label}:</strong> ${foundry.utils.escapeHTML(text)}</p>`;
    })
    .join("");
  return rows || `<p class="bi-desk__field bi-desk__field--empty">Nothing authored on this field set yet.</p>`;
}

async function actorIdForNpc(npcId) {
  const foundryId = await deriveFoundryId(npcId);
  return game.actors.get(foundryId) ? foundryId : null;
}

export class ApprovalsDesk extends HandlebarsApplicationMixin(ApplicationV2) {
  #state = createDeskState([]);
  #catalog = null;
  #loading = true;
  #undoNotice = null;
  #keydownBound = false;
  // Adapter-side, parallel to core's own #state.history: one entry per
  // sound/final grade, holding what's needed to reverse the STORAGE write
  // (core's deskUndo only reverses queue navigation -- it has no concept of
  // files, correctly, since that's this adapter's job alone).
  #writeHistory = [];
  // "One screen, both directions" (issue #171 §6) -- a toggle, not a second
  // window, since the question "what's waiting on me vs. on him" is one
  // question. Read-only: resolving an out-tray entry happens through the
  // existing mechanism each source already has (lore_library.py, the
  // gazetteer), not rebuilt here.
  #showOutTray = false;

  // Full-screen, frameless, above the Foundry chrome entirely -- Ingram's
  // own direct correction, live: "anything less than full screen is stupid"
  // for a surface built to read a lot of text at once. Same technique
  // induction-terminal.mjs uses (.bi-induction-host: position:fixed, its own
  // stacking context) rather than scene-runner.mjs's persistent side-drawer
  // -- the Desk is a deliberate take-everything-over review session, not
  // something meant to coexist with a running scene the way the Runner is.
  static DEFAULT_OPTIONS = {
    id: "bi-approvals-desk",
    tag: "div",
    classes: ["bi-desk-host"],
    window: { frame: false, positioned: false },
    actions: {
      next: ApprovalsDesk.#onNext,
      prev: ApprovalsDesk.#onPrev,
      grade: ApprovalsDesk.#onGrade,
      undo: ApprovalsDesk.#onUndo,
      openCard: ApprovalsDesk.#onOpenCard,
      close: ApprovalsDesk.#onCloseButton,
      toggleOutTray: ApprovalsDesk.#onToggleOutTray
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/console/approvals-desk.hbs` }
  };

  async _prepareContext() {
    if (this.#loading) {
      this.#catalog = await loadCatalog();
      const shifts = computePlaySequenceSet(this.#catalog);
      const queue = buildDeskQueue(shifts, { allEntitiesById: this.#catalog.allEntitiesById });
      this.#state = createDeskState(queue);
      this.#loading = false;
    }

    const outTray = computeOutTray({
      loreInstructions: this.#catalog.loreInstructions,
      gazetteerRequests: this.#catalog.gazetteerRequests,
      allEntitiesById: this.#catalog.allEntitiesById,
      openQuestions: this.#catalog.openQuestions,
      audioLibrary: this.#catalog.audioLibrary,
      audioReview: this.#catalog.audioReview
    });

    if (this.#showOutTray) {
      return {
        loading: false, empty: false, showOutTray: true,
        outTrayCount: outTray.total,
        pendingInstructions: outTray.pendingInstructions,
        openGazetteerRequests: outTray.openGazetteerRequests,
        needsLoreItems: outTray.needsLoreItems.map((e) => ({ id: e.id, name: e.name ?? e.title ?? e.id })),
        // Waiting on INGRAM, not Claude (core/bounce.mjs's own header) --
        // shown on the same screen (issue #172's "one screen" ask) but kept
        // visually separate, never folded into outTrayCount above.
        openCreativeQuestions: outTray.openCreativeQuestions,
        unreviewedAudio: outTray.unreviewedAudio
      };
    }

    const item = deskCurrentItem(this.#state);
    const total = this.#state.items.length;
    const undoNotice = this.#undoNotice;
    this.#undoNotice = null;

    if (!item) {
      return { loading: false, empty: true, remaining: 0, undoNotice, outTrayCount: outTray.total };
    }

    const actorId = item.type === "npc" ? await actorIdForNpc(item.id) : null;
    return {
      loading: false,
      empty: false,
      remaining: total,
      outTrayCount: outTray.total,
      index: this.#state.index + 1,
      item: {
        type: item.type,
        id: item.id,
        name: itemDisplayName(item, this.#catalog),
        status: item.authoring?.status,
        sceneId: item.sceneId,
        episodeId: item.episodeId,
        unblocks: item.unblocks,
        blockedBy: (item.blockedBy ?? []).map((dep) => ({
          ...dep,
          // A modifier class assembled dynamically can't be verified by
          // tier0-architecture's own "every bi- class exists" lint (it
          // strips {{...}} before checking) -- computed from a closed,
          // fully-enumerated set here rather than left unchecked as a
          // template-side string concatenation. "cut" gets its own class,
          // distinct from merely-unreviewed: a bounce must "cascade
          // VISIBLY" (issue #171) and a dependency that's gone forever is a
          // more severe warning than one that's simply still drafted.
          statusClass:
            dep.status === "sound" || dep.status === "final" ? "bi-desk__dep--clear"
              : dep.status === "cut" ? "bi-desk__dep--severed"
                : "bi-desk__dep--blocking"
        })),
        uncertainty: item.authoring?.uncertainty ?? null,
        bodyHtml: renderItemBody(item, this.#catalog),
        canOpenCard: Boolean(actorId),
        actorId
      },
      canUndo: this.#state.history.length > 0,
      undoNotice
    };
  }

  static async #onNext() { this.#state = deskNext(this.#state); this.render(); }
  static async #onPrev() { this.#state = deskPrev(this.#state); this.render(); }

  /**
   * U. core's deskUndo only reverses QUEUE navigation -- it has no concept
   * of files. Every grade action ALSO writes something to storage (#onGrade
   * above: a promoted/cut entity, or an appended lore-instructions.json
   * entry), so undoing one must ALSO reverse that write, or a later harvest
   * could pick up a decision the GM explicitly took back. Both cases are
   * reversed by re-writing the PRE-grade state, not a delete: simpler
   * (reuses writeStorageJson, no new Foundry API surface under time
   * pressure) and just as correct -- a harvest of the reverted file is then
   * a safe no-op, since it matches the never-graded baseline exactly.
   */
  static async #onUndo() {
    if (this.#state.history.length === 0) return;
    const last = this.#state.history[this.#state.history.length - 1];

    if (last.kind === "single" && ["sound", "final", "cut"].includes(last.action)) {
      const writeRecord = this.#writeHistory.pop();
      if (writeRecord?.kind === "entity") {
        this.#catalog.allEntitiesById[writeRecord.itemId] = writeRecord.preGradeEntity;
        await writeStorageJson("", writeRecord.storagePath, writeRecord.preGradeEntity);
      }
    } else if (last.kind === "single" && last.action === "changes") {
      const writeRecord = this.#writeHistory.pop();
      if (writeRecord?.kind === "instructions") {
        this.#catalog.loreInstructions = writeRecord.preBounceDocument;
        await writeStorageJson("", LORE_INSTRUCTIONS_STORAGE_PATH, writeRecord.preBounceDocument);
      }
    }

    this.#state = deskUndo(this.#state);
    this.#undoNotice = `Restored "${last.kind === "batch" ? `${last.items.length} items` : last.item.id}".`;
    this.render();
  }

  static async #onOpenCard(event, target) {
    const actorId = target.dataset.actorId;
    if (actorId) openCharacterCard(actorId);
  }

  static async #onToggleOutTray() {
    this.#showOutTray = !this.#showOutTray;
    this.render();
  }

  /**
   * S/F/C/X. `sound`/`final` call the real promote(); `cut` calls the real
   * cutItem() (issue #171) -- both persist the graded entity to storage the
   * same way (see this file's header for what "persist" means today).
   * `changes` files a real instruction into lore-instructions.json via
   * fileChangesInstruction() (issue #171) rather than just recording a note
   * nobody reads -- the whole point of a bounce LOOP, not a rejection.
   */
  static async #onGrade(event, target) {
    // Foundry's own action-delegation reads data-action="grade" to route the
    // click here at all; data-action-KEY names WHICH grade, since one
    // registered action handler serves all four buttons.
    const action = target.dataset.actionKey;
    const item = deskCurrentItem(this.#state);
    if (!item) return;

    let note = null;
    if (action === "changes") {
      note = await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize("BLANKINHERITANCE.Desk.ChangesTitle") },
        content: `<input type="text" name="note" placeholder="${game.i18n.localize("BLANKINHERITANCE.Desk.ChangesPlaceholder")}" autofocus>`,
        ok: { callback: (ev, btn) => btn.form.elements.note.value }
      }).catch(() => null);
      if (note === null) return; // dialog dismissed -- do not grade
    }

    if (action === "sound" || action === "final" || action === "cut") {
      const entity = this.#catalog.allEntitiesById[item.id];
      const storagePath = `desk-grade-${item.type}-${item.id}.json`;
      try {
        const graded = action === "cut"
          ? cutItem(entity, { gradedBy: game.user.name, note })
          : promote(entity, action, { gradedBy: game.user.name, dependencyStatuses: this.#dependencyStatuses(item) });
        await writeStorageJson("", storagePath, graded);
        this.#catalog.allEntitiesById[item.id] = graded;
        this.#writeHistory.push({ kind: "entity", itemId: item.id, preGradeEntity: entity, storagePath });
      } catch (err) {
        ui.notifications.error(err.message);
        console.error(`Blank Inheritance | Approvals Desk ${action}() refused:`, err);
        return;
      }
    } else if (action === "changes") {
      try {
        const preBounceDocument = this.#catalog.loreInstructions ?? { id: "lore-instructions", type: "lore-instructions", instructions: [] };
        const { document } = fileChangesInstruction(preBounceDocument, {
          entityId: item.id, entityType: item.type, text: note, gradedBy: game.user.name
        });
        await writeStorageJson("", LORE_INSTRUCTIONS_STORAGE_PATH, document);
        this.#catalog.loreInstructions = document;
        this.#writeHistory.push({ kind: "instructions", preBounceDocument });
      } catch (err) {
        ui.notifications.error(err.message);
        console.error("Blank Inheritance | Approvals Desk fileChangesInstruction() refused:", err);
        return;
      }
    }

    this.#state = deskGrade(this.#state, action, { note, gradedBy: game.user.name });
    this.render();
  }

  #dependencyStatuses(item) {
    const out = {};
    for (const dep of item.blockedBy ?? []) out[dep.id] = dep.status;
    return out;
  }

  /** No window chrome (frame: false) means no built-in close button either -- this and Escape (in #onKey) are the whole story. */
  static async #onCloseButton() { this.close(); }

  _onRender(context, options) {
    super._onRender?.(context, options);
    // _onRender fires on EVERY render, not just the first (this panel
    // re-renders on every J/K/grade/undo) -- this.element is the SAME DOM
    // node across those renders (HandlebarsApplicationMixin patches parts in
    // place, it doesn't recreate the root), so an unconditional
    // addEventListener here would silently accumulate one MORE duplicate
    // listener per render. Found live: a single "s" keypress removed TWO
    // items instead of one, because by then two listeners were both firing
    // for the same event. Guarded to attach exactly once per instance.
    if (!this.#keydownBound) {
      this.element.addEventListener("keydown", this.#onKey.bind(this));
      this.#keydownBound = true;
    }
    // Keyboard-first (issue #170's whole point) needs an actual focus target
    // inside the panel -- a keydown is dispatched to whatever currently has
    // focus and bubbles from THERE, not from wherever the mouse last
    // clicked. Nothing in this panel is focusable by default (no input,
    // unlike director-palette's search box), so without this J/K/S/F/C/X/U
    // would silently do nothing until a player happened to tab into it.
    this.element.tabIndex = -1;
    this.element.focus();
  }

  #onKey(event) {
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return; // never steal keys from a real text field (e.g. the changes-note dialog)
    if (event.key === "Escape") { event.preventDefault(); this.close(); return; }
    const key = event.key.toLowerCase();
    const map = { j: "next", k: "prev", u: "undo" };
    const gradeMap = { s: "sound", f: "final", c: "changes", x: "cut" };
    if (map[key]) {
      event.preventDefault();
      this.constructor.DEFAULT_OPTIONS.actions[map[key]].call(this, event, this.element);
    } else if (gradeMap[key]) {
      event.preventDefault();
      ApprovalsDesk.#onGrade.call(this, event, { dataset: { actionKey: gradeMap[key] } });
    }
  }
}

let open = null;

export function openApprovalsDesk() {
  if (!game.user?.isGM) return null;
  if (open?.rendered) {
    open.bringToFront();
    return open;
  }
  open = new ApprovalsDesk();
  open.render({ force: true });
  return open;
}

export async function createApprovalsDeskMacroIfMissing() {
  if (!game.user?.isGM) return;
  const macroId = await deriveFoundryId(MACRO_SOURCE_ID);
  if (game.macros.get(macroId)) return;
  await Macro.create(
    {
      _id: macroId,
      name: game.i18n.localize("BLANKINHERITANCE.Desk.MacroName"),
      type: "script",
      img: "icons/svg/inbox-in.svg",
      command: `await game.modules.get("${MODULE_ID}").api.openApprovalsDesk();`
    },
    { keepId: true }
  );
  console.log("Blank Inheritance | Created the Approvals Desk macro.");
}
