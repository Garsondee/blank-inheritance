// Tier 4 — objectives' Foundry half against a mocked journal (design/objectives.md, D057).
//
// What these protect: the entry is made once and lets players add pages; a given objective's page is derived from its
// id so a second Give finds the first; the Runner's chips change the page and log only what changed; Give always asks
// first; a player's own page arrives without ownership (Foundry will not let a player set it) and the GM's client gives
// it its level; and the admin reset clears every page and undo puts them back with their own ids.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { installJournalMock } from "./support/mock-journal.mjs";
import { deriveFoundryId } from "../module/blank-inheritance/scripts/core/ids.mjs";
import { LEVELS, OBJECTIVE_FLAG, pageSeed } from "../module/blank-inheritance/scripts/core/objectives.mjs";
import {
  actOnObjective,
  clearObjectives,
  ensureObjectives,
  fileOwnObjective,
  giveObjective,
  objectiveStates,
  objectivesEntry,
  onObjectivePageCreated,
  pageForObjective,
  resetObjectivesCache,
  restoreObjectives,
  snapshotObjectives
} from "../module/blank-inheritance/scripts/foundry/objectives-store.mjs";
import { runObjectiveTrigger } from "../module/blank-inheritance/scripts/foundry/objectives-runner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_ID = "blank-inheritance";
let mock;
let sounds;
let prompts;

/** What the shared mock leaves out and this suite needs: page update/delete/toObject, entry flags and deletes. */
function extendMock() {
  const merge = (target, data) => {
    for (const [k, v] of Object.entries(data)) {
      if (k === "_id") continue;
      if (k === "ownership") target.ownership = { ...v };
      else if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object" && !Array.isArray(target[k])) merge(target[k], v);
      else target[k] = structuredClone(v);
    }
  };
  const entryProto = globalThis.JournalEntry.prototype;
  entryProto.getFlag = function getFlag(scope, key) {
    return this.flags?.[scope]?.[key];
  };
  entryProto.deleteEmbeddedDocuments = async function del(type, ids) {
    for (const id of ids) this.pages.delete(id);
    return ids;
  };
  const origCreate = entryProto.createEmbeddedDocuments;
  entryProto.createEmbeddedDocuments = async function create(type, list, opts) {
    const pages = await origCreate.call(this, type, list, opts);
    for (const page of pages) {
      if (page.update) continue;
      Object.assign(Object.getPrototypeOf(page), {
        async update(data) {
          merge(this, data);
          return this;
        },
        async delete() {
          this.parent.pages.delete(this.id);
          return this;
        },
        toObject() {
          const { parent, id, isOwner, ...rest } = this;
          return structuredClone({ ...rest, _id: id });
        }
      });
    }
    return pages;
  };
  entryProto.updateEmbeddedDocuments = (function wrap(orig) {
    return async function update(type, list) {
      for (const data of list) {
        const page = this.pages.get(data._id);
        if (page) merge(page, data);
      }
      return list.map((d) => this.pages.get(d._id));
    };
  })(entryProto.updateEmbeddedDocuments);
}

beforeEach(() => {
  mock = installJournalMock({ users: [{ id: "u1", name: "Kim" }, { id: "u2", name: "Sam" }] });
  extendMock();
  resetObjectivesCache();
  sounds = [];
  prompts = [];
  let n = 0;
  globalThis.foundry.utils = {
    getRoute: (p) => p,
    randomID: () => `r${String(n++).padStart(11, "0")}`
  };
  globalThis.foundry.audio = { AudioHelper: { play: (data, push) => sounds.push({ src: data.src, push }) } };
  globalThis.foundry.applications.api.DialogV2.prompt = async (config) => {
    prompts.push(config);
    return mock.world.promptAnswer ?? null;
  };
  globalThis.fetch = async (url) => {
    const m = String(url).match(/data\/campaign\/objectives\/([a-z0-9-]+)\.json$/);
    const file = m ? path.join(ROOT, "data", "objectives", `${m[1]}.json`) : null;
    if (!file || !fs.existsSync(file)) return { ok: false, status: 404 };
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(file, "utf8")) };
  };
  globalThis.game.user = { id: "gm", isGM: true };
  globalThis.game.users.set("gm", { id: "gm", isGM: true, active: true });
});

afterEach(() => {
  mock.uninstall();
  delete globalThis.fetch;
});

test("the entry is made once, at default OWNER, and a drifted one is repaired by raising levels", async () => {
  const entry = await ensureObjectives();
  assert.equal(entry.ownership.default, LEVELS.OWNER);
  assert.equal(entry.getFlag(MODULE_ID, "sourceId"), "party-objectives");
  entry.ownership = { default: 2, u1: 0 };
  await ensureObjectives();
  assert.equal(mock.world.journal.size, 1);
  assert.deepEqual(objectivesEntry().ownership, { default: 3, u1: 3 });
});

test("Give files a read-only page under a derived id, and a second Give finds it", async () => {
  await ensureObjectives();
  const first = await giveObjective("c1e1-the-docket", { scene: "Kit Issue" });
  assert.equal(first.created, true);
  assert.equal(first.page.id, await deriveFoundryId(pageSeed("c1e1-the-docket")));
  assert.deepEqual(first.page.ownership, { default: LEVELS.OBSERVER });
  const state = first.page.getFlag(MODULE_ID, OBJECTIVE_FLAG);
  assert.equal(state.giver.name, "Section Officer Vetch");
  assert.ok(!state.parts.some((p) => p.id === "requisition"), "a hidden part is not on the page");
  const second = await giveObjective("c1e1-the-docket", { scene: "Kit Issue" });
  assert.equal(second.created, false);
  assert.equal(objectivesEntry().pages.size, 1);
});

test("the Runner's acts change the page; a repeat changes nothing", async () => {
  await ensureObjectives();
  await giveObjective("c1e1-the-docket");
  assert.ok(await actOnObjective("c1e1-the-docket", "tick", { partId: "second-period" }));
  assert.equal(await actOnObjective("c1e1-the-docket", "tick", { partId: "second-period" }), null);
  await actOnObjective("c1e1-the-docket", "strike", { partId: "collect" });
  await actOnObjective("c1e1-the-docket", "reveal", { partId: "requisition" });
  const state = pageForObjective("c1e1-the-docket").getFlag(MODULE_ID, OBJECTIVE_FLAG);
  assert.deepEqual(state.parts.map((p) => [p.id, p.state]), [["second-period", "done"], ["collect", "struck"], ["requisition", "open"], ["back-by-1900", "open"]]);
  await actOnObjective("c1e1-the-docket", "close", { record: "In before nineteen hundred." });
  const closed = objectiveStates()[0];
  assert.equal(closed.status, "done");
  assert.equal(closed.record, "In before nineteen hundred.");
});

test("a Give chip always asks first; declining gives nothing and plays nothing", async () => {
  await ensureObjectives();
  mock.world.confirmAnswer = false;
  assert.equal(await runObjectiveTrigger({ act: "give", objectiveRef: "c1e1-storm-drains" }, { scene: "Canteen" }), false);
  assert.equal(mock.world.confirms.length, 1);
  assert.equal(objectivesEntry().pages.size, 0);
  assert.equal(sounds.length, 0);
  mock.world.confirmAnswer = true;
  assert.equal(await runObjectiveTrigger({ act: "give", objectiveRef: "c1e1-storm-drains" }, { scene: "Canteen" }), true);
  assert.equal(objectivesEntry().pages.size, 1);
  assert.deepEqual(sounds, [{ src: "sounds/notify.wav", push: true }], "a soft cue on every client");
  assert.equal(await runObjectiveTrigger({ act: "give", objectiveRef: "c1e1-storm-drains" }), false, "already given");
});

test("a chip on an objective not yet given warns and changes nothing; a tick makes no sound", async () => {
  await ensureObjectives();
  assert.equal(await runObjectiveTrigger({ act: "tick", objectiveRef: "c1e1-storm-drains", partRef: "waders" }), false);
  assert.ok(mock.world.notifications.some((n) => n.level === "warn"));
  await giveObjective("c1e1-storm-drains");
  sounds.length = 0;
  assert.equal(await runObjectiveTrigger({ act: "tick", objectiveRef: "c1e1-storm-drains", partRef: "waders" }), true);
  assert.equal(sounds.length, 0);
});

test("Close asks for the Record's paragraph with the suggestion already in the box", async () => {
  await ensureObjectives();
  await giveObjective("c1e1-report-for-enrolment");
  mock.world.promptAnswer = null;
  assert.equal(await runObjectiveTrigger({ act: "close", objectiveRef: "c1e1-report-for-enrolment" }), false, "dismissed: nothing closes");
  assert.match(prompts[0].content, /Section Nine reported at the Candidate Gate/);
  mock.world.promptAnswer = "They reported, were examined, and drew their kit.";
  assert.equal(await runObjectiveTrigger({ act: "close", objectiveRef: "c1e1-report-for-enrolment" }), true);
  assert.equal(objectiveStates()[0].record, "They reported, were examined, and drew their kit.");
});

test("a player's own page arrives without ownership, and the GM's client gives it its level", async () => {
  await ensureObjectives();
  globalThis.game.user = { id: "u1", isGM: false };
  const draft = { giverName: "Ren", giverIsSelf: true, why: "Trouble for the section", required: ["Find out who Rand is"], visibility: "owner" };
  const page = await fileOwnObjective(draft, { ownerName: "Ren" });
  assert.deepEqual(page.ownership, { default: -1 }, "a player cannot set ownership, so none is sent");
  globalThis.game.user = { id: "gm", isGM: true };
  onObjectivePageCreated(page);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(page.ownership, { default: LEVELS.NONE, u1: LEVELS.OWNER }, "only me: hidden from the others' screens");
  assert.equal(page.getFlag(MODULE_ID, OBJECTIVE_FLAG).kind, "own");
});

// Found live 2026-10-04: Foundry gives a page's creator an OWNER entry; the first repair set every key the state
// didn't name to NONE, which locked the writer out of their own Section Nine objective.
test("REGRESSION: the ownership repair never locks the writer out of a Section Nine objective", async () => {
  await ensureObjectives();
  globalThis.game.user = { id: "u1", isGM: false };
  const page = await fileOwnObjective({ giverName: "Taka", why: "He asked", required: ["Wear the waders"], scope: "group" }, { ownerName: "Ren" });
  page.ownership = { default: -1, u1: LEVELS.OWNER }; // what Foundry's server makes of a player's create
  globalThis.game.user = { id: "gm", isGM: true };
  onObjectivePageCreated(page);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(page.ownership, { default: LEVELS.OWNER, u1: LEVELS.OWNER });
});

test("the GM's live objective is read-only for players, like a given one", async () => {
  await ensureObjectives();
  const page = await fileOwnObjective({ giverName: "The Deputy Director", why: "He asked", required: ["Find out, and tell me"], scope: "group" }, { asGM: true });
  const state = page.getFlag(MODULE_ID, OBJECTIVE_FLAG);
  assert.equal(state.source, "gm");
  assert.deepEqual(page.ownership, { default: LEVELS.OBSERVER });
});

test("the admin reset clears every page and undo puts them back with their own ids", async () => {
  await ensureObjectives();
  await giveObjective("c1e1-the-docket");
  await giveObjective("c1e1-storm-drains");
  const snap = snapshotObjectives();
  assert.equal(snap.length, 2);
  assert.equal(await clearObjectives(), 2);
  assert.equal(objectivesEntry().pages.size, 0);
  assert.equal(await restoreObjectives(snap), 2);
  assert.deepEqual([...objectivesEntry().pages.keys()].sort(), snap.map((p) => p._id).sort());
  assert.equal(await restoreObjectives(snap), 0, "undo twice changes nothing");
});

/* ------------------------------------------------------------------ */
/*  2026-10-04 (D059): the Runner fires chips by itself                */
/* ------------------------------------------------------------------ */

import { undoObjectiveAct } from "../module/blank-inheritance/scripts/foundry/objectives-runner.mjs";

test("a Give the Runner fires with a handout shown or a beat marked done does not ask again", async () => {
  await ensureObjectives();
  mock.world.confirmAnswer = false;
  const confirmsBefore = mock.world.confirms.length;
  assert.equal(await runObjectiveTrigger({ act: "give", objectiveRef: "c1e1-storm-drains" }, { scene: "Canteen", confirm: false, quiet: true }), true);
  assert.equal(mock.world.confirms.length, confirmsBefore, "showing the handout or ticking the beat was the deliberate act");
  assert.equal(objectivesEntry().pages.size, 1);
  const noticesBefore = mock.world.notifications.length;
  assert.equal(await runObjectiveTrigger({ act: "give", objectiveRef: "c1e1-storm-drains" }, { confirm: false, quiet: true }), false, "already given");
  assert.equal(mock.world.notifications.length, noticesBefore, "quiet: the Runner says once what it did");
});

test("a quiet chip on an objective not yet given changes nothing and adds no notification of its own", async () => {
  await ensureObjectives();
  const before = mock.world.notifications.length;
  assert.equal(await runObjectiveTrigger({ act: "tick", objectiveRef: "c1e1-storm-drains", partRef: "waders" }, { quiet: true }), false);
  assert.equal(mock.world.notifications.length, before);
});

test("un-marking a beat undoes what its tick did: a ticked part is unticked and a closed objective reopens", async () => {
  await ensureObjectives();
  await giveObjective("c1e1-storm-drains");
  await actOnObjective("c1e1-storm-drains", "tick", { partId: "waders" });
  assert.equal(await undoObjectiveAct({ objectiveRef: "c1e1-storm-drains", partRef: "waders", undo: "untick" }), true);
  const part = pageForObjective("c1e1-storm-drains").getFlag(MODULE_ID, OBJECTIVE_FLAG).parts.find((p) => p.id === "waders");
  assert.equal(part.state, "open");
  await actOnObjective("c1e1-storm-drains", "close", { record: "Done." });
  assert.equal(await undoObjectiveAct({ objectiveRef: "c1e1-storm-drains", undo: "reopen" }), true);
  assert.equal(objectiveStates()[0].status, "active");
  assert.equal(await undoObjectiveAct({ objectiveRef: "c1e1-the-docket", undo: "untick", partRef: "collect" }), false, "an objective never given has nothing to undo");
  assert.equal(await undoObjectiveAct({ objectiveRef: "c1e1-storm-drains", undo: null }), false, "a give cannot be taken back");
});

test("re-ticking a beat never asks for a closed objective's Record again; a chip the GM presses still does", async () => {
  await ensureObjectives();
  await giveObjective("c1e1-report-for-enrolment");
  await actOnObjective("c1e1-report-for-enrolment", "close", { record: "Done." });
  const before = prompts.length;
  assert.equal(await runObjectiveTrigger({ act: "close", objectiveRef: "c1e1-report-for-enrolment" }, { confirm: false, quiet: true }), false);
  assert.equal(prompts.length, before, "fired by a tick, a closed objective is left alone");
  mock.world.promptAnswer = null;
  await runObjectiveTrigger({ act: "close", objectiveRef: "c1e1-report-for-enrolment" });
  assert.equal(prompts.length, before + 1, "pressed by hand, it still asks: the GM may be rewriting the Record");
});
