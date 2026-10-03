// A small stand-in for the parts of Foundry the chalk store and controller touch: hooks, a journal with embedded pages,
// the current user. It behaves like the real thing where it matters to us: an update lands a moment later and then the
// hook fires, a page inherits its entry's ownership, and creating a page needs the entry to be owned. It is not a model
// of Foundry, only enough to catch our own mistakes (see the live check in tools/stagecraft/foundry-check.mjs for the real one).

export const OWNER = 3;
const tick = () => new Promise((resolve) => setImmediate(resolve));

function setByPath(object, path, value) {
  const keys = path.split(".");
  let at = object;
  for (const key of keys.slice(0, -1)) at = at[key] ??= {};
  at[keys.at(-1)] = value;
}

class FakeHooks {
  #map = new Map();
  #n = 0;
  on(name, fn) { const id = ++this.#n; if (!this.#map.has(name)) this.#map.set(name, new Map()); this.#map.get(name).set(id, fn); return id; }
  off(name, id) { this.#map.get(name)?.delete(id); }
  callAll(name, ...args) { for (const fn of [...(this.#map.get(name)?.values() ?? [])]) fn(...args); }
  count(name) { return this.#map.get(name)?.size ?? 0; }
}

let counter = 0;

export class FakePage {
  constructor(entry, data, world) {
    this.id = `page${++counter}`;
    this.parent = entry;
    this.name = data.name;
    this.flags = structuredClone(data.flags ?? {});
    this.world = world;
  }
  get isOwner() { return this.world.canWrite(this); }
  getFlag(ns, key) { return this.flags?.[ns]?.[key]; }
  async update(changes) {
    if (!this.isOwner) throw new Error("this user does not own that page");
    await tick();
    for (const [path, value] of Object.entries(changes)) setByPath(this, path, structuredClone(value));
    this.world.updates++;
    this.world.hooks.callAll("updateJournalEntryPage", this);
  }
}

export class FakeEntry {
  constructor(data, world) {
    this.id = `entry${++counter}`;
    this.name = data.name;
    this.flags = structuredClone(data.flags ?? {});
    this.ownership = { default: 0, ...(data.ownership ?? {}) };
    this.pages = [];
    this.world = world;
  }
  getFlag(ns, key) { return this.flags?.[ns]?.[key]; }
  async update(changes) {
    await tick();
    for (const [path, value] of Object.entries(changes)) setByPath(this, path, value);
    this.world.hooks.callAll("updateJournalEntry", this);
  }
  async deleteEmbeddedDocuments(type, ids) {
    if (type !== "JournalEntryPage") throw new Error(`unexpected embedded type ${type}`);
    await tick();
    const gone = this.pages.filter((p) => ids.includes(p.id));
    this.pages = this.pages.filter((p) => !ids.includes(p.id));
    for (const page of gone) this.world.hooks.callAll("deleteJournalEntryPage", page);
    return gone;
  }
  async createEmbeddedDocuments(type, list) {
    if (type !== "JournalEntryPage") throw new Error(`unexpected embedded type ${type}`);
    if (!this.world.user.isGM && (this.ownership[this.world.user.id] ?? this.ownership.default) < OWNER) throw new Error("this user may not create pages here");
    await tick();
    const made = list.map((data) => new FakePage(this, data, this.world));
    this.pages.push(...made);
    this.world.creates += made.length;
    for (const page of made) this.world.hooks.callAll("createJournalEntryPage", page);
    return made;
  }
}

/** Install a fake Foundry on globalThis and return it. `user` is who is playing on this client. */
export function installFoundry({ user = { id: "me", name: "Me", isGM: false } } = {}) {
  const world = {
    user,
    hooks: new FakeHooks(),
    entries: [],
    scenes: [],
    updates: 0,
    creates: 0,
    canWrite(page) { return page.ownedBy ? page.ownedBy.includes(this.user.id) || this.user.isGM : true; }
  };
  globalThis.Hooks = world.hooks;
  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: OWNER } };
  globalThis.game = { user, journal: world.entries, scenes: world.scenes };
  globalThis.JournalEntry = {
    async create(data) {
      await tick();
      const entry = new FakeEntry(data, world);
      world.entries.push(entry);
      world.hooks.callAll("createJournalEntry", entry);
      return entry;
    }
  };
  world.page = (entry, data) => { const page = new FakePage(entry, data, world); entry.pages.push(page); return page; };
  return world;
}

export const settle = () => tick().then(tick).then(tick);
