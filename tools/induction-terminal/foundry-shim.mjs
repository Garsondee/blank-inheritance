/**
 * Just enough of Foundry VTT to run the REAL induction terminal (module/blank-inheritance/scripts/foundry/
 * induction-terminal.mjs) in a plain browser page, with its real templates, stylesheets and catalogues.
 *
 * Why: the terminal is the first thing a player ever sees, and reviewing its UI means clicking through all
 * ten pages at real screen sizes. The local Foundry install is often busy with another world, and joining it
 * as GM would kick whoever is in it. This shim needs nothing running but a static file server at the repo
 * root (the "agreement-preview" launch config). It is a dev tool: it never ships and never touches a world.
 *
 * What it imitates, from foundryvtt/.../client/applications/api/handlebars-application.mjs: one constant
 * part swapped per render, <details data-sync> open state, scrollable positions and focus carried across a
 * re-render, [data-action] clicks dispatched to DEFAULT_OPTIONS.actions with `this` bound to the app, and
 * the `localize` helper (with format() when hash arguments are given). Document creation is faked and logged.
 */

const ROUTES = [
  ["modules/blank-inheritance/data/campaign/", "/data/"],   // the module's synced mirror of data/ → the real source
  ["modules/blank-inheritance/", "/module/blank-inheritance/"],
];
const route = (p) => {
  const clean = String(p).replace(/^\/+/, "");
  for (const [from, to] of ROUTES) if (clean.startsWith(from)) return to + clean.slice(from.length);
  return `/${clean}`;
};

const getPath = (obj, key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const setPath = (obj, key, value) => {
  const parts = key.split(".");
  let o = obj;
  for (const k of parts.slice(0, -1)) o = o[k] ??= {};
  o[parts.at(-1)] = value;
  return true;
};
const merge = (a, b) => {
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object") merge(a[k], v);
    else a[k] = v;
  }
  return a;
};

export async function installFoundryShim({ settings = {}, user = {} } = {}) {
  const [moduleLang, systemLang] = await Promise.all([
    fetch("/module/blank-inheritance/lang/en.json").then((r) => r.json()),
    fetch("/gamesystems/sf2e/lang/en.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  const translations = merge(merge({}, systemLang), moduleLang);
  const format = (s, data = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in data ? String(data[k]) : m));
  const i18n = {
    translations,
    has: (key) => typeof getPath(translations, key) === "string",
    localize: (key) => { const v = getPath(translations, key); return typeof v === "string" ? v : key; },
    format: (key, data) => format(i18n.localize(key), data),
    lang: "en",
  };

  const Handlebars = globalThis.Handlebars;
  if (!Handlebars) throw new Error("Load Handlebars before the shim");
  Handlebars.registerHelper("localize", (key, options) => {
    const hash = options?.hash ?? {};
    return Object.keys(hash).length ? i18n.format(key, hash) : i18n.localize(key);
  });

  const templateCache = new Map();
  const loadTemplate = async (path) => {
    if (!templateCache.has(path)) templateCache.set(path, fetch(route(path)).then((r) => r.text()).then((t) => Handlebars.compile(t)));
    return templateCache.get(path);
  };

  class ApplicationV2 {
    constructor(options = {}) {
      // Shallow on purpose: DEFAULT_OPTIONS.actions holds functions, which structuredClone refuses.
      this.options = { ...(this.constructor.DEFAULT_OPTIONS ?? {}), ...options };
      this.element = null;
      this.rendered = false;
      this._clickHandler = (event) => {
        const target = event.target.closest?.("[data-action]");
        if (!target || !this.element?.contains(target)) return;
        const handler = this.constructor.DEFAULT_OPTIONS?.actions?.[target.dataset.action];
        if (!handler) return;
        if (target.matches("button, a")) event.preventDefault();
        handler.call(this, event, target);
      };
    }
    async _prepareContext() { return {}; }
    _onRender() {}
    _onClose() {}
    async _insertElement(element) { document.body.append(element); return element; }
    async close() {
      this._onClose?.({});
      this.element?.remove();
      this.element = null;
      this.rendered = false;
      return this;
    }
  }

  const HandlebarsApplicationMixin = (Base) => class extends Base {
    _configureRenderParts() { return structuredClone(this.constructor.PARTS ?? {}); }
    async render(options = {}) {
      const context = await this._prepareContext(options);
      const parts = this._configureRenderParts(options);
      if (!this.element) {
        const el = document.createElement(this.options.tag ?? "div");
        el.id = this.options.id ?? "";
        el.classList.add(...(this.options.classes ?? []));
        el.addEventListener("click", this._clickHandler);
        this.element = el;
        await this._insertElement(el);
      }
      for (const [partId, part] of Object.entries(parts)) {
        const html = (await loadTemplate(part.template))(context, { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true });
        const holder = document.createElement("div");
        holder.innerHTML = html.trim();
        const fresh = holder.firstElementChild ?? holder;
        fresh.dataset.applicationPart = partId;
        const prior = this.element.querySelector(`[data-application-part="${partId}"]`);
        if (prior) {
          const state = {};
          const focus = prior.querySelector(":focus");
          state.focus = focus?.id ? `#${CSS.escape(focus.id)}` : focus?.closest("[name]")?.name ? `${focus.tagName}[name="${focus.closest("[name]").name}"]` : null;
          state.scroll = (part.scrollable ?? []).map((sel) => { const e = sel === "" ? prior : prior.querySelector(sel); return e ? [sel, e.scrollTop] : null; }).filter(Boolean);
          state.details = Object.fromEntries([...prior.querySelectorAll("details[data-sync]")].map((d) => [d.dataset.sync, d.open]));
          prior.replaceWith(fresh);
          for (const [sel, top] of state.scroll) { const e = sel === "" ? fresh : fresh.querySelector(sel); if (e) e.scrollTop = top; }
          for (const [id, open] of Object.entries(state.details)) { const d = fresh.querySelector(`details[data-sync="${id}"]`); if (d) d.open = open; }
          if (state.focus) fresh.querySelector(state.focus)?.focus();
        } else this.element.append(fresh);
      }
      this.rendered = true;
      this._onRender(context, options);
      return this;
    }
  };

  const store = new Map(Object.entries(settings));
  // Client-scoped settings persist in localStorage, as Foundry's own do, so a saved form survives a reload here too.
  const settingConfigs = new Map();
  const readLocal = (id, fallback) => { try { const raw = localStorage.getItem(id); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } };
  const created = [];
  globalThis.__shim = { created, route };
  globalThis.foundry = {
    applications: {
      api: { ApplicationV2, HandlebarsApplicationMixin },
      apps: { FilePicker: { implementation: {
        uploadPersistent: async (_pkg, _dir, file) => ({ path: URL.createObjectURL(file), status: "success" }),
        browse: async () => ({ files: [], dirs: [] }),
        createDirectory: async () => ({}),
      } } },
    },
    utils: {
      getRoute: route,
      getProperty: getPath,
      setProperty: setPath,
      randomID: () => Math.random().toString(36).slice(2, 18),
      mergeObject: (a, b) => merge(structuredClone(a), b),
      deepClone: (x) => structuredClone(x),
    },
  };
  const gameUser = { id: "preview-user", name: "Preview Player", isGM: false, active: true, character: null, update: async (d) => Object.assign(gameUser, d), ...user };
  globalThis.game = {
    i18n,
    user: gameUser,
    users: Object.assign([gameUser], { activeGM: null, filter: (fn) => [gameUser].filter(fn) }),
    world: { id: "preview-world" },
    userId: gameUser.id,
    settings: {
      register: (mod, key, cfg) => {
        const id = `${mod}.${key}`;
        settingConfigs.set(id, cfg);
        if (!store.has(id)) store.set(id, cfg.scope === "client" ? readLocal(id, cfg.default) : cfg.default);
      },
      get: (mod, key) => store.get(`${mod}.${key}`) ?? store.get(key),
      set: async (mod, key, v) => {
        const id = `${mod}.${key}`;
        store.set(id, v);
        if (settingConfigs.get(id)?.scope === "client") localStorage.setItem(id, JSON.stringify(v));
        return v;
      },
    },
    packs: { get: () => ({ getDocuments: async () => [], getIndex: async () => [] }) },
    actors: { get: (id) => created.find((a) => a.id === id) ?? null },
    macros: { get: () => null },
    modules: { get: () => ({ api: {} }) },
    socket: { on() {}, off() {}, emit() {}, emitWithAck: async () => ({ ok: false, error: "No GM in the preview" }) },
    permissions: {},
  };
  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 } };
  globalThis.Hooks = { on() {}, once() {}, off() {}, call() {}, callAll() {} };
  globalThis.ui = { notifications: { info: console.info, warn: console.warn, error: console.error } };
  globalThis.fromUuid = async () => null;
  globalThis.ChatMessage = { create: async (d) => { console.info("[shim] ChatMessage.create", d); return d; } };
  globalThis.Actor = {
    create: async (data) => {
      const actor = { id: `actor${created.length + 1}`, ...structuredClone(data), flags: {}, items: [],
        setFlag: async (scope, key, v) => { (actor.flags[scope] ??= {})[key] = v; },
        update: async (d) => Object.assign(actor, d), createEmbeddedDocuments: async (_t, docs) => docs, delete: async () => {} };
      created.push(actor);
      console.info("[shim] Actor.create", data);
      return actor;
    },
  };
  return { i18n, settings: store };
}
