// A small, honest simulation of the Foundry globals foundry/io.mjs and
// foundry/sync.mjs depend on. Not a general Foundry re-implementation —
// every behavior here is either (a) read directly out of the real Foundry
// source in foundryvtt/ (client/applications/apps/file-picker.mjs and
// dist/files/local.mjs — see makeMockFilePicker below for the exact lines),
// (b) directly observed against the real server during the 2026-08-22 live
// run, or (c) a clearly-labeled simplification. Where we haven't verified
// real behavior, this mock must not pretend to. That honesty is the whole
// point: a mock that overclaims confidence is worse than no mock — see
// design/testing-strategy.md's tier 4 section.
//
// sf2e-awareness: when templateJson is supplied, the mock Actor.create
// validates incoming `system.*` field paths via findInvalidActorFieldPaths
// (./sf2e-template.mjs) — the SAME function test/tier3-contract.test.mjs
// uses, so the two checks can't silently drift apart the way they did the
// first time this mock actually ran (see that function's own doc comment).
// It deliberately does NOT simulate sf2e's derived-data computation (AC/
// saves computed from embedded Items, etc.) — reimplementing a real game
// system's logic is a different, much larger, much riskier undertaking than
// this project needs; tier 3 already covers what we actually rely on
// (confirming our output's field *shape* matches the real template).

import { webcrypto } from "node:crypto";
import { File as NodeFile } from "node:buffer";
import { findInvalidActorFieldPaths } from "./sf2e-template.mjs";

function makeId(counter) {
  return `mock${String(counter.n++).padStart(12, "0")}`;
}

function makeDocumentClass(collection, counter, { validateOnCreate, documentName } = {}) {
  return class MockDocument {
    static async create(data, options = {}) {
      if (validateOnCreate) validateOnCreate(data);
      const id = options.keepId && data._id ? data._id : makeId(counter);
      const doc = new MockDocument({ ...data, _id: id, id });
      collection.set(id, doc);
      // Real Foundry fires this from data/client-backend.mjs's own
      // #createDocuments, confirmed directly against that source:
      // `Hooks.callAll(\`create${type}\`, doc, options, userId)` -- callAll,
      // not call, so every listener runs regardless of any one's return
      // value. Only fired when the caller names a documentName (every
      // built-in call site below does); a test that never registers a
      // createX listener pays nothing extra for this.
      if (documentName) Hooks.callAll(`create${documentName}`, doc, options, globalThis.game?.user?.id);
      return doc;
    }

    constructor(data) {
      Object.assign(this, data);
      this.flags = {};
    }

    async setFlag(scope, key, value) {
      this.flags[scope] ??= {};
      this.flags[scope][key] = value;
      return this;
    }

    getFlag(scope, key) {
      return this.flags?.[scope]?.[key];
    }

    async delete() {
      collection.delete(this.id);
      return this;
    }
  };
}

/**
 * Verified directly against the real server source, not just inferred from
 * the live ENOENT we hit: foundryvtt/.../dist/files/local.mjs's
 * LocalFileStorage#createDirectory calls `fs.mkdirSync(o)` with no
 * `{recursive: true}` — a bare mkdir, which is exactly why a missing parent
 * throws ENOENT. The same file's #upload does
 * `if (!fs.existsSync(i)) throw new Error(\`Target directory ${i} does not exist.\`)`
 * — so uploadPersistent has the identical parent-must-exist rule, confirmed,
 * not inferred. That server-side throw surfaces at the CLIENT level (what
 * our io.mjs actually calls) as a returned `false`, not a thrown error —
 * confirmed via client/applications/apps/file-picker.mjs's #manageFiles/
 * upload(), which catches `response.error` and returns false rather than
 * rethrowing. This mock matches the client-visible contract.
 */
function makeMockFilePicker(world) {
  return {
    implementation: {
      async createDirectory(source, dirPath) {
        const segments = dirPath.split("/");
        const parent = segments.slice(0, -1).join("/");
        if (parent && !world.directories.has(parent)) {
          const err = new Error(`ENOENT: no such file or directory, mkdir '${dirPath}'`);
          err.code = "ENOENT";
          throw err;
        }
        if (world.directories.has(dirPath)) {
          const err = new Error(`EEXIST: file already exists, mkdir '${dirPath}'`);
          err.code = "EEXIST";
          throw err;
        }
        world.directories.add(dirPath);
      },
      async uploadPersistent(moduleId, targetDir, file, _options, _notifyOpts) {
        // Verified against file-picker.mjs's real uploadPersistent: it looks
        // up game.modules.get(packageId) and throws synchronously if the
        // package is missing or lacks persistentStorage, BEFORE ever
        // attempting the upload.
        const pkg = world.game.modules.get(moduleId);
        if (!pkg) throw new Error(`Package ${moduleId} not found`);
        if (!pkg.persistentStorage) {
          throw new Error(
            `Package ${moduleId} does not have persistent storage enabled. Set the "persistentStorage" flag to true in the package manifest.`
          );
        }
        // `targetDir` is a DIRECTORY, never a full file path -- confirmed
        // against the real server (dist/files/local.mjs#upload): the
        // filename always comes from the File object's own .name, appended
        // separately server-side, never taken from the path argument. This
        // mock originally stripped a trailing segment off its path argument
        // assuming it might already be dir+filename, which quietly matched
        // a real bug in writeReportFile instead of catching it (found live,
        // 2026-09-05 -- see that function's own comment). Don't reintroduce
        // that leniency; a caller passing dir+filename here must fail, same
        // as it would against the real server.
        const fullDir = `${pkg.type}s/${pkg.id}/storage/${targetDir}`;
        if (!world.directories.has(fullDir)) {
          return false;
        }
        const content = await file.text();
        const relativePath = `${targetDir}/${file.name}`;
        world.uploadedFiles.set(`${pkg.type}s/${pkg.id}/storage/${relativePath}`, content);
        return { path: relativePath };
      }
    }
  };
}

/**
 * Real DialogV2.confirm() (client/applications/api/dialog.mjs) resolves to
 * true/false/null depending on which button (if any) the user actually
 * clicks -- there's no way to simulate a real click in a headless test, so
 * this mock lets a test pre-set the GM's answer via world.dialogConfirmResponse
 * (defaults to false, the safe "declined" choice) and records every call's
 * config for assertions, same pattern as the clipboard mock below.
 */
function makeMockDialogV2(world) {
  return {
    async confirm(config) {
      world.dialogConfirmCalls.push(config);
      return world.dialogConfirmResponse ?? false;
    }
  };
}

/**
 * A real, minimal Hooks -- on/off/once/call/callAll -- not the no-op stub
 * this used to be. Verified against client/helpers/hooks.mjs and every real
 * call site cited alongside makeDocumentClass above: `call` stops at the
 * first listener that returns exactly `false` and reports whether it was
 * allowed to proceed; `callAll` always runs every listener and reports
 * nothing. Synchronous throughout, same as the real one.
 */
function makeMockHooks() {
  const listeners = new Map();
  const on = (name, fn) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return fn;
  };
  const off = (name, fn) => listeners.get(name)?.delete(fn);
  const once = (name, fn) => {
    const wrapped = (...args) => {
      off(name, wrapped);
      return fn(...args);
    };
    on(name, wrapped);
    return wrapped;
  };
  const call = (name, ...args) => {
    for (const fn of listeners.get(name) ?? []) {
      if (fn(...args) === false) return false;
    }
    return true;
  };
  const callAll = (name, ...args) => {
    for (const fn of listeners.get(name) ?? []) fn(...args);
  };
  return { on, off, once, call, callAll };
}

/**
 * A real, in-process game.socket -- on/off/emit -- standing in for the
 * socket.io client Foundry actually uses. emit() delivers synchronously to
 * every listener registered on this SAME mock, collapsing "broadcast to
 * every connected client" onto one process; that's the right level of
 * fidelity for testing OUR OWN dispatch logic (does the right handler act on
 * the right payload, does a GM-only guard actually gate it), not Foundry's
 * real network layer -- module socket events are confirmed fire-and-forget
 * (this project's own live test, 2026-09-16: a second connection's
 * game.socket.emitWithAck across this exact channel never resolved), so this
 * mock deliberately has no ack support either.
 */
function makeMockSocket() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
    },
    off(event, fn) {
      listeners.get(event)?.delete(fn);
    },
    emit(event, payload) {
      for (const fn of listeners.get(event) ?? []) fn(payload);
    }
  };
}

export function installMockFoundry({ moduleFiles = {}, templateJson = null, moduleManifest = null } = {}) {
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  if (!globalThis.File) globalThis.File = NodeFile;

  const world = {
    actors: new Map(),
    scenes: new Map(),
    macros: new Map(),
    journal: new Map(),
    chatMessages: [],
    directories: new Set(["data", "modules"]),
    uploadedFiles: new Map(),
    notifications: [],
    clipboardText: null,
    dialogConfirmResponse: null,
    dialogConfirmCalls: []
  };

  const counter = { n: 1 };

  function validateActorOnCreate(data) {
    if (!templateJson) return;
    const invalid = findInvalidActorFieldPaths(templateJson, data.type, data.system);
    if (invalid.length > 0) {
      throw new Error(
        `Mock Actor.create rejected: system.${invalid[0]} does not exist on sf2e's real "${data.type}" Actor template. ` +
          `(This mock enforces the same contract as test/tier3-contract.test.mjs, via the shared findInvalidActorFieldPaths helper.)`
      );
    }
  }

  const previous = {
    game: globalThis.game,
    ui: globalThis.ui,
    Hooks: globalThis.Hooks,
    CONST: globalThis.CONST,
    Actor: globalThis.Actor,
    Scene: globalThis.Scene,
    Macro: globalThis.Macro,
    JournalEntry: globalThis.JournalEntry,
    ChatMessage: globalThis.ChatMessage,
    foundry: globalThis.foundry,
    fetch: globalThis.fetch
  };

  // navigator gets its own descriptor-based save/restore, not the plain
  // assignment the rest of `previous` uses: Node 21+ ships its own built-in
  // `globalThis.navigator` (userAgent, etc.) as a non-writable accessor
  // property, so a bare `globalThis.navigator = ...` can throw depending on
  // Node version. Object.defineProperty with configurable:true sidesteps
  // that regardless of what shape (or absence) the real one has.
  const previousNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  const modules = new Map();
  if (moduleManifest) {
    // type: "module" is assigned by Foundry's package loader, not present in
    // module.json itself — hardcoded here because this mock only ever
    // represents this one module. Everything else comes from the REAL
    // manifest, so if persistentStorage is ever removed from module.json,
    // this mock starts failing the same way real Foundry would.
    modules.set(moduleManifest.id, { id: moduleManifest.id, type: "module", persistentStorage: moduleManifest.persistentStorage === true });
  }

  globalThis.game = {
    user: { id: "mock-gm-user", isGM: true },
    // .activeGM is a plain settable stand-in, not a reimplementation of
    // Foundry's real "lowest-id connected GM" selection -- every consumer in
    // this codebase only ever reads `.activeGM?.isSelf` (the GM-relay guard
    // shared by campaign-state.mjs/equipment-state.mjs/induction-relay.mjs),
    // never anything about how that GM was chosen. Defaults to "yes, acting
    // as the one active GM" to match game.user's own isGM: true default.
    users: { activeGM: { isSelf: true } },
    socket: makeMockSocket(),
    actors: world.actors,
    scenes: world.scenes,
    macros: world.macros,
    journal: world.journal,
    i18n: {
      localize: (key) => key,
      format: (key, data) => `${key} ${JSON.stringify(data)}`
    },
    modules
  };
  world.game = globalThis.game;

  globalThis.ui = {
    notifications: {
      info: (msg) => world.notifications.push({ level: "info", msg }),
      warn: (msg) => world.notifications.push({ level: "warn", msg }),
      error: (msg) => world.notifications.push({ level: "error", msg })
    }
  };

  globalThis.Hooks = makeMockHooks();

  // Verified against common/constants.mjs directly -- OWNER's own doc
  // comment there is the exact citation for why Actor delete needs the GM
  // relay too: "Owned documents cannot be deleted by anyone other than a
  // gamemaster level User."
  globalThis.CONST = {
    DOCUMENT_OWNERSHIP_LEVELS: Object.freeze({ INHERIT: -1, NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 })
  };

  globalThis.Actor = makeDocumentClass(world.actors, counter, { validateOnCreate: validateActorOnCreate, documentName: "Actor" });
  globalThis.Scene = makeDocumentClass(world.scenes, counter, { documentName: "Scene" });
  globalThis.Macro = makeDocumentClass(world.macros, counter, { documentName: "Macro" });
  globalThis.JournalEntry = makeDocumentClass(world.journal, counter, { documentName: "JournalEntry" });
  globalThis.ChatMessage = {
    create: async (data) => {
      world.chatMessages.push(data);
      return data;
    }
  };

  globalThis.foundry = {
    utils: {
      getRoute: (p) => `/${p}`,
      // Same alphabet/length as common/utils/helpers.mjs's real randomID --
      // cryptographic quality doesn't matter for a test id, uniqueness and
      // shape do.
      randomID: (length = 16) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let id = "";
        for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
        return id;
      }
    },
    applications: {
      apps: { FilePicker: makeMockFilePicker(world) },
      api: { DialogV2: makeMockDialogV2(world) }
    }
  };

  globalThis.fetch = async (url) => {
    const relative = url.replace(/^\//, "").replace(/^modules\/[^/]+\//, "");
    const content = moduleFiles[relative];
    if (content === undefined) {
      return { ok: false, status: 404, json: async () => { throw new Error("not found"); } };
    }
    return { ok: true, status: 200, json: async () => content };
  };

  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText: async (text) => { world.clipboardText = text; } } },
    configurable: true,
    writable: true,
    enumerable: true
  });

  return {
    world,
    uninstall() {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
      if (previousNavigatorDescriptor) {
        Object.defineProperty(globalThis, "navigator", previousNavigatorDescriptor);
      } else {
        delete globalThis.navigator;
      }
    }
  };
}
