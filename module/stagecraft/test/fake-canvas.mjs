// A stand-in for the page's canvas and images, so the flat backend can be drawn in plain Node. A context records every call
// made on it and every property set, so a test can ask "was this drawn, and in what order" without a browser.

export function recordingContext(log = []) {
  const state = {};
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ log, state }, {
    get(target, name) {
      if (name === "log" || name === "state") return target[name];
      if (name === "createRadialGradient" || name === "createLinearGradient") return (...args) => { log.push({ call: name, args }); return gradient; };
      if (name in state) return state[name];
      return (...args) => { log.push({ call: name, args, with: { ...state } }); };
    },
    set(target, name, value) { state[name] = value; return true; }
  });
  return ctx;
}

export function fakeCanvas() {
  const canvas = {
    width: 300, height: 150, style: {}, removed: false, parent: null,
    ctx: null,
    getContext() { this.ctx ??= recordingContext(); return this.ctx; },
    remove() { this.removed = true; },
    toBlob(done) { done({ type: "image/png" }); },
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {}
  };
  return canvas;
}

/** Installs a `document` that makes canvases, and returns them in the order they were made. Call the returned function to put things back. */
export function installFakeDom() {
  const made = [];
  const before = { document: globalThis.document, Image: globalThis.Image };
  globalThis.document = {
    createElement(tag) { if (tag !== "canvas") return {}; const c = fakeCanvas(); made.push(c); return c; },
    fonts: { load: () => Promise.resolve() }
  };
  globalThis.Image = class { set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); } };
  const restore = () => { globalThis.document = before.document; globalThis.Image = before.Image; };
  return { made, restore };
}

/** An element a backend mounts its canvas into. */
export const fakeElement = () => ({ children: [], append(c) { this.children.push(c); c.parent = this; } });

/** The calls of one kind a context recorded, in order. */
export const calls = (ctx, name) => ctx.log.filter((e) => e.call === name);
