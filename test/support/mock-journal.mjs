// A small, honest simulation of what foundry/handouts.mjs touches: users,
// folders, journal entries with embedded pages, Journal.show and a confirm
// dialog. Separate from mock-foundry.mjs because that mock's game.users is a
// plain object other suites rely on, and this one needs a real collection.
//
// Every behaviour here is read from the Foundry v14 source in foundryvtt/
// (resources/app), or is a clearly labelled simplification:
//
// - Journal.show(doc, {force, users}) (client/documents/collections/journal.mjs
//   :69): throws unless the caller owns the doc; emits to the named users only
//   (the server relay in dist/database/documents/journal.mjs). Recorded here,
//   not delivered: there is no second client.
// - createEmbeddedDocuments(..., {keepId}) keeps a supplied _id, as
//   Document.create does (the same keepId contract mock-foundry.mjs models).
// - A page's ownership defaults to INHERIT, -1 (common/documents/
//   journal-entry-page.mjs:75: `initial: {default: INHERIT}`).
// - SIMPLIFICATION: update() REPLACES an `ownership` object rather than
//   merging keys. foundry/handouts.mjs always sends the complete, already
//   merged object (core mergeOwnership), so the adapter is correct under either
//   semantics; replacing is the stricter of the two to test against.

function makeCollection() {
  const map = new Map();
  map.find = (fn) => [...map.values()].find(fn);
  map.filter = (fn) => [...map.values()].filter(fn);
  // defineProperty, not Object.assign: assign would copy the getter's value
  // once, freezing `contents` at whatever the collection held when it was made.
  Object.defineProperty(map, "contents", { get: () => [...map.values()] });
  return map;
}

function applyUpdate(target, data) {
  for (const [key, value] of Object.entries(data)) {
    if (key === "_id") continue;
    if (key === "ownership") target.ownership = { ...value };
    else if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
      target[key] = { ...target[key], ...value };
    } else target[key] = value;
  }
}

export function installJournalMock({ users = [], confirm = true } = {}) {
  const world = {
    folders: makeCollection(),
    journal: makeCollection(),
    shows: [],
    confirms: [],
    notifications: [],
    confirmAnswer: confirm,
    counter: 1
  };
  const nextId = () => `mock${String(world.counter++).padStart(12, "0")}`;

  class MockPage {
    constructor(data, parent) {
      Object.assign(this, { ownership: { default: -1 }, flags: {}, ...structuredClone(data) });
      this.id = this._id;
      this.parent = parent;
      this.isOwner = true; // the acting user is the GM
    }
    get uuid() {
      return `JournalEntry.${this.parent.id}.JournalEntryPage.${this.id}`;
    }
    // Document#getFlag/setFlag (common/abstract/document.mjs): a flag lives at
    // flags[scope][key]. setFlag is an update of that one path.
    getFlag(scope, key) {
      return this.flags?.[scope]?.[key];
    }
    async setFlag(scope, key, value) {
      this.flags = { ...this.flags, [scope]: { ...(this.flags?.[scope] ?? {}), [key]: value } };
      return this;
    }
  }

  class MockJournalEntry {
    static async create(data, { keepId = false } = {}) {
      const entry = new MockJournalEntry(data, keepId);
      world.journal.set(entry.id, entry);
      return entry;
    }
    constructor(data, keepId) {
      const { pages = [], ...rest } = structuredClone(data);
      Object.assign(this, { ownership: { default: 0 }, flags: {}, ...rest });
      this._id = keepId && rest._id ? rest._id : nextId();
      this.id = this._id;
      this.isOwner = true;
      this.pages = makeCollection();
      for (const page of pages) this.pages.set(page._id, new MockPage(page, this));
    }
    get folder() {
      return this._folderId ? world.folders.get(this._folderId) ?? null : null;
    }
    set folder(id) {
      this._folderId = id;
    }
    async update(data) {
      world.entryUpdates = (world.entryUpdates ?? 0) + 1;
      applyUpdate(this, data);
      return this;
    }
    async createEmbeddedDocuments(type, list, { keepId = false } = {}) {
      if (type !== "JournalEntryPage") throw new Error(`mock: unexpected embedded type ${type}`);
      return list.map((data) => {
        const id = keepId && data._id ? data._id : nextId();
        const page = new MockPage({ ...data, _id: id }, this);
        this.pages.set(id, page);
        return page;
      });
    }
    async updateEmbeddedDocuments(type, list) {
      if (type !== "JournalEntryPage") throw new Error(`mock: unexpected embedded type ${type}`);
      return list.map((data) => {
        const page = this.pages.get(data._id);
        if (!page) throw new Error(`mock: no page ${data._id} to update`);
        applyUpdate(page, data);
        return page;
      });
    }
  }

  const previous = {
    game: globalThis.game,
    ui: globalThis.ui,
    CONST: globalThis.CONST,
    Folder: globalThis.Folder,
    JournalEntry: globalThis.JournalEntry,
    foundry: globalThis.foundry
  };

  const userCollection = makeCollection();
  for (const u of users) userCollection.set(u.id, { isGM: false, active: true, character: null, ...u });

  globalThis.game = {
    user: { id: "gm", isGM: true },
    users: userCollection,
    folders: world.folders,
    journal: world.journal,
    i18n: {
      localize: (key) => key,
      format: (key, data) => `${key} ${JSON.stringify(data)}`
    }
  };
  globalThis.ui = {
    notifications: {
      info: (msg) => world.notifications.push({ level: "info", msg }),
      warn: (msg) => world.notifications.push({ level: "warn", msg }),
      error: (msg) => world.notifications.push({ level: "error", msg })
    }
  };
  globalThis.CONST = {
    DOCUMENT_OWNERSHIP_LEVELS: Object.freeze({ INHERIT: -1, NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 }),
    JOURNAL_ENTRY_PAGE_FORMATS: Object.freeze({ HTML: 1, MARKDOWN: 2 })
  };
  globalThis.Folder = {
    async create(data, { keepId = false } = {}) {
      const folder = { ...structuredClone(data), id: keepId && data._id ? data._id : nextId() };
      world.folders.set(folder.id, folder);
      return folder;
    }
  };
  globalThis.JournalEntry = MockJournalEntry;
  globalThis.foundry = {
    documents: {
      collections: {
        Journal: {
          async show(doc, { force = false, users: to = [] } = {}) {
            if (!doc.isOwner) throw new Error("JOURNAL.ShowBadPermissions");
            world.shows.push({ uuid: doc.uuid, pageId: doc.id, force, users: [...to] });
            return doc;
          }
        }
      }
    },
    applications: {
      api: {
        DialogV2: {
          async confirm(config) {
            world.confirms.push(config);
            return world.confirmAnswer;
          }
        }
      }
    }
  };

  return {
    world,
    uninstall() {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    }
  };
}
