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

function makeDocumentClass(collection, counter, { validateOnCreate } = {}) {
  return class MockDocument {
    static async create(data, options = {}) {
      if (validateOnCreate) validateOnCreate(data);
      const id = options.keepId && data._id ? data._id : makeId(counter);
      const doc = new MockDocument({ ...data, _id: id, id });
      collection.set(id, doc);
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
      async uploadPersistent(moduleId, relativePath, file, _options, _notifyOpts) {
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
        const fullDir = `${pkg.type}s/${pkg.id}/storage/${relativePath.split("/").slice(0, -1).join("/")}`;
        if (!world.directories.has(fullDir)) {
          return false;
        }
        const content = await file.text();
        world.uploadedFiles.set(`${pkg.type}s/${pkg.id}/storage/${relativePath}`, content);
        return { path: relativePath };
      }
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
    chatMessages: [],
    directories: new Set(["data", "modules"]),
    uploadedFiles: new Map(),
    notifications: [],
    clipboardText: null
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
    Actor: globalThis.Actor,
    Scene: globalThis.Scene,
    Macro: globalThis.Macro,
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
    actors: world.actors,
    scenes: world.scenes,
    macros: world.macros,
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

  globalThis.Hooks = {
    once: (_name, _fn) => {}
  };

  globalThis.Actor = makeDocumentClass(world.actors, counter, { validateOnCreate: validateActorOnCreate });
  globalThis.Scene = makeDocumentClass(world.scenes, counter);
  globalThis.Macro = makeDocumentClass(world.macros, counter);
  globalThis.ChatMessage = {
    create: async (data) => {
      world.chatMessages.push(data);
      return data;
    }
  };

  globalThis.foundry = {
    utils: { getRoute: (p) => `/${p}` },
    applications: { apps: { FilePicker: makeMockFilePicker(world) } }
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
