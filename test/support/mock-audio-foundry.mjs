/**
 * A small, honest simulation of the Foundry surface the AUDIO adapters touch:
 * Playlist/PlaylistSound documents, Folder, world settings, the module socket,
 * and just enough Web Audio to build a node graph.
 *
 * Deliberately a separate file from test/support/mock-foundry.mjs rather than
 * an extension of it: that mock is about file I/O and Actor/Scene creation and
 * is shared with other in-progress work, and nothing here needs it.
 *
 * Every behaviour below is either read out of the real Foundry source in
 * foundryvtt/ (cited inline) or a clearly-labelled simplification. Where the
 * real thing does something we do not model, the comment says so — a mock that
 * overclaims is worse than no mock (design/testing-strategy.md §3, tier 4).
 */

const noop = () => {};

/** An AudioParam that records what was scheduled on it, so ramps can be asserted. */
class MockParam {
  constructor(value = 1) {
    this.value = value;
    this.events = [];
  }
  setValueAtTime(v, t) {
    this.value = v;
    this.events.push({ type: "set", value: v, time: t });
    return this;
  }
  setTargetAtTime(v, t, tc) {
    this.value = v;
    this.events.push({ type: "target", value: v, time: t, timeConstant: tc });
    return this;
  }
  linearRampToValueAtTime(v, t) {
    this.value = v;
    this.events.push({ type: "ramp", value: v, time: t });
    return this;
  }
  cancelScheduledValues(t) {
    this.events.push({ type: "cancel", time: t });
    return this;
  }
}

class MockNode {
  constructor(kind, ctx) {
    this.kind = kind;
    this.context = ctx;
    this.outputs = [];
    this.gain = new MockParam(1);
  }
  connect(target) {
    this.outputs.push(target);
    return target;
  }
  disconnect(target) {
    if (target === undefined) this.outputs.length = 0;
    else this.outputs = this.outputs.filter((o) => o !== target);
  }
}

class MockAnalyser extends MockNode {
  constructor(ctx) {
    super("analyser", ctx);
    this.fftSize = 2048;
    this.smoothingTimeConstant = 0;
    /** Test hook: the samples the next getFloatTimeDomainData call should hand back. */
    this.samples = null;
  }
  getFloatTimeDomainData(target) {
    for (let i = 0; i < target.length; i++) target[i] = this.samples ? this.samples[i % this.samples.length] : 0;
  }
}

class MockCompressor extends MockNode {
  constructor(ctx) {
    super("compressor", ctx);
    for (const p of ["threshold", "knee", "ratio", "attack", "release"]) this[p] = new MockParam(0);
  }
}

/** Mirrors AudioHelper.#createContext: a context with a gainNode wired to its destination. */
class MockAudioContext {
  constructor(name, volume = 0.5) {
    this.name = name;
    this.currentTime = 0;
    this.destination = new MockNode("destination", this);
    this.gainNode = new MockNode("master", this);
    this.gainNode.gain.value = volume;
    this.gainNode.connect(this.destination);
  }
  createGain() {
    return new MockNode("gain", this);
  }
  createAnalyser() {
    return new MockAnalyser(this);
  }
  createDynamicsCompressor() {
    return new MockCompressor(this);
  }
}

/** A PlaylistSound, with the fields our code actually reads or writes. */
class MockPlaylistSound {
  constructor(data, parent) {
    Object.assign(this, { volume: 0.5, repeat: false, playing: false, pausedTime: null, fade: null, flags: {}, ...data });
    this.id = data._id ?? data.id;
    this.parent = parent;
  }
  getFlag(scope, key) {
    return this.flags?.[scope]?.[key];
  }
}

class MockPlaylist {
  static collection = null;
  static async create(data, options = {}) {
    const playlist = new MockPlaylist(data);
    MockPlaylist.collection.set(playlist.id, playlist);
    return playlist;
  }
  constructor(data) {
    this.id = data._id ?? data.id ?? `pl${Math.random().toString(36).slice(2, 10)}`;
    this.name = data.name;
    this.folder = data.folder ? { id: data.folder } : null;
    this.mode = data.mode ?? 0;
    this.channel = data.channel ?? "music";
    this.fade = data.fade ?? null;
    this.sorting = data.sorting ?? "a";
    this.playing = data.playing ?? false;
    this.flags = data.flags ?? {};
    this.sounds = new Map();
    for (const s of data.sounds ?? []) {
      const sound = new MockPlaylistSound(s, this);
      this.sounds.set(sound.id, sound);
    }
    // Foundry's EmbeddedCollection is iterable and has .map/.find/.filter;
    // a Map is iterable over [k, v] pairs, so hand out the values instead.
    Object.defineProperty(this.sounds, "map", { value: (fn) => [...this.sounds.values()].map(fn) });
    Object.defineProperty(this.sounds, "filter", { value: (fn) => [...this.sounds.values()].filter(fn) });
    Object.defineProperty(this.sounds, "find", { value: (fn) => [...this.sounds.values()].find(fn) });
    Object.defineProperty(this.sounds, "some", { value: (fn) => [...this.sounds.values()].some(fn) });
    Object.defineProperty(this.sounds, "contents", { get: () => [...this.sounds.values()] });
  }

  getFlag(scope, key) {
    return this.flags?.[scope]?.[key];
  }

  async update(changes) {
    const { sounds, ...rest } = changes;
    Object.assign(this, rest);
    for (const change of sounds ?? []) {
      const sound = this.sounds.get(change._id);
      if (sound) Object.assign(sound, change);
    }
    this.updates = (this.updates ?? 0) + 1;
    return this;
  }

  async createEmbeddedDocuments(type, data) {
    const created = [];
    for (const d of data) {
      const sound = new MockPlaylistSound(d, this);
      this.sounds.set(sound.id, sound);
      created.push(sound);
    }
    return created;
  }

  async updateEmbeddedDocuments(type, updates) {
    for (const u of updates) Object.assign(this.sounds.get(u._id) ?? {}, u);
    return updates;
  }

  async deleteEmbeddedDocuments(type, ids) {
    for (const id of ids) this.sounds.delete(id);
    return ids;
  }

  async playAll() {
    this.playing = true;
    const first = [...this.sounds.values()][0];
    if (first) first.playing = true;
    return this;
  }

  async playSound(sound) {
    this.playing = true;
    for (const s of this.sounds.values()) if (s !== sound && this.mode !== -1) s.playing = false;
    sound.playing = true;
    return this;
  }

  async stopAll() {
    this.playing = false;
    for (const s of this.sounds.values()) s.playing = false;
    return this;
  }

  async delete() {
    MockPlaylist.collection.delete(this.id);
    return this;
  }
}

class MockFolder {
  static collection = null;
  static async create(data) {
    const folder = new MockFolder(data);
    MockFolder.collection.set(folder.id, folder);
    return folder;
  }
  constructor(data) {
    this.id = data._id ?? data.id;
    this.name = data.name;
    this.type = data.type;
    this.flags = data.flags ?? {};
  }
}

/**
 * Install the globals. Returns the world, plus helpers for driving it.
 * Call `restore()` in a `finally` — leaving mock globals installed leaks into
 * every later test file in the same process.
 */
export function installAudioMock({ settings = {}, isGM = true, moduleFiles = {} } = {}) {
  const previous = {
    game: globalThis.game,
    ui: globalThis.ui,
    Hooks: globalThis.Hooks,
    Playlist: globalThis.Playlist,
    Folder: globalThis.Folder,
    CONST: globalThis.CONST,
    fetch: globalThis.fetch,
    foundry: globalThis.foundry,
    requestAnimationFrame: globalThis.requestAnimationFrame
  };

  const playlists = new Map();
  const folders = new Map();
  MockPlaylist.collection = playlists;
  MockFolder.collection = folders;

  const store = new Map(Object.entries(settings));
  const emitted = [];
  const hooks = new Map();
  const contexts = {
    music: new MockAudioContext("music"),
    environment: new MockAudioContext("environment"),
    interface: new MockAudioContext("interface")
  };
  const played = [];

  globalThis.Playlist = MockPlaylist;
  globalThis.Folder = MockFolder;
  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 } };
  globalThis.Hooks = {
    on: (name, fn) => {
      hooks.set(name, [...(hooks.get(name) ?? []), fn]);
    },
    once: (name, fn) => globalThis.Hooks.on(name, fn),
    callAll: (name, ...args) => {
      for (const fn of hooks.get(name) ?? []) fn(...args);
    },
    call: (name, ...args) => globalThis.Hooks.callAll(name, ...args)
  };
  globalThis.ui = { notifications: { info: noop, warn: noop, error: noop } };
  globalThis.requestAnimationFrame = () => 0;

  const playlistsCollection = Object.assign([], {
    get: (id) => playlists.get(id),
    get size() {
      return playlists.size;
    },
    [Symbol.iterator]: () => playlists.values(),
    filter: (fn) => [...playlists.values()].filter(fn),
    map: (fn) => [...playlists.values()].map(fn),
    find: (fn) => [...playlists.values()].find(fn),
    reduce: (fn, init) => [...playlists.values()].reduce(fn, init)
  });

  globalThis.game = {
    user: { id: "mock-gm", isGM },
    i18n: { localize: (k) => k, format: (k, d) => `${k} ${JSON.stringify(d)}` },
    settings: {
      register: (scope, key, config) => store.set(`${scope}.${key}`, config.default),
      get: (scope, key) => store.get(`${scope}.${key}`),
      set: async (scope, key, value) => {
        store.set(`${scope}.${key}`, value);
        return value;
      }
    },
    socket: { emit: (channel, payload) => emitted.push({ channel, payload }), on: noop },
    playlists: playlistsCollection,
    folders: { get: (id) => folders.get(id), filter: (fn) => [...folders.values()].filter(fn) },
    macros: { getName: () => null },
    audio: {
      locked: false,
      unlock: Promise.resolve(),
      music: contexts.music,
      environment: contexts.environment,
      interface: contexts.interface,
      playing: new Map(),
      create: ({ src, context }) => {
        const sound = {
          src,
          context,
          destination: undefined,
          gainNode: null,
          duration: 2,
          playing: false,
          async load() {
            return this;
          },
          play(options) {
            this.playing = true;
            played.push({ src, destination: this.destination, options });
            return this;
          },
          stop() {
            this.playing = false;
          }
        };
        return sound;
      }
    },
    modules: new Map()
  };

  globalThis.fetch = async (url) => {
    const key = String(url).replace(/^.*modules\/blank-inheritance\//, "");
    if (!(key in moduleFiles)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => moduleFiles[key] };
  };

  // The parts of the `foundry` global the audio adapters reach through
  // foundry/io.mjs: a route builder and the file browser that finds authored
  // soundscape/cue files. browse() answers from `moduleFiles`, so a test
  // declaring `data/campaign/audio/cues/x.json` gets exactly that file listed.
  globalThis.foundry = {
    utils: {
      getRoute: (path) => `/${String(path).replace(/^\/+/, "")}`,
      debounce: (fn) => fn,
      escapeHTML: (s) => String(s),
      hasProperty: (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj) !== undefined
    },
    applications: {
      apps: {
        FilePicker: {
          implementation: {
            async browse(source, target) {
              const prefix = `${String(target).replace(/^modules\/blank-inheritance\//, "")}/`;
              const files = Object.keys(moduleFiles)
                .filter((k) => k.startsWith(prefix) && k.slice(prefix.length).indexOf("/") === -1)
                .map((k) => `modules/blank-inheritance/${k}`);
              return { files, dirs: [] };
            }
          }
        }
      }
    }
  };

  return {
    playlists,
    folders,
    contexts,
    emitted,
    played,
    settings: store,
    hooks,
    restore() {
      for (const [k, v] of Object.entries(previous)) {
        if (v === undefined) delete globalThis[k];
        else globalThis[k] = v;
      }
      MockPlaylist.collection = null;
      MockFolder.collection = null;
    }
  };
}

export { MockAudioContext, MockPlaylist };
