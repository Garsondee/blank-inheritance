/**
 * Which backend draws a stage (renderer.md §6, §8.5): the plain 2D one when the player asked for it, when this browser
 * cannot make a WebGL context at all, when it makes one only in software (no graphics card, so three.js crawls), or when the
 * 3D one has already failed on this stage. Everything else gets three.js. Pure, except `webglInfo`, which asks the page once.
 *
 * Measured (tools/stagecraft/weak-machine.mjs, 1280 x 720, no graphics card): the lit stage draws about 2 frames a second,
 * the low one 9, Foundry's own canvas 7 and the flat stage about 30. With a real card all three hold the full frame rate.
 */

/** `software` is true when the player left the picture on Automatic and the browser's WebGL turned out to be software. */
export function chooseBackend({ tier, webgl, failed = false, software = false }) {
  if (tier === "flat" || !webgl || failed || software) return "flat";
  return "three";
}

/** The names a browser gives a software rasteriser instead of a graphics card. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;
export const isSoftwareRenderer = (name) => SOFTWARE.test(String(name ?? ""));

let cached = null;

/** What WebGL this browser has: { ok, renderer }. A context is made and let go at once, and the answer is remembered for the page. */
export function webglInfo(doc = globalThis.document) {
  if (cached !== null) return cached;
  let info = { ok: false, renderer: "" };
  try {
    const canvas = doc.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (gl) {
      const debug = gl.getExtension?.("WEBGL_debug_renderer_info");
      info = { ok: true, renderer: String((debug ? gl.getParameter?.(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter?.(gl.RENDERER)) ?? "") };
      gl.getExtension?.("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    info = { ok: false, renderer: "" };
  }
  cached = info;
  return info;
}

export const hasWebGL = (doc) => webglInfo(doc).ok;
export const hasSoftwareWebGL = (doc) => { const i = webglInfo(doc); return i.ok && isSoftwareRenderer(i.renderer); };

/** For tests: forget what was learned. */
export const forgetWebGL = () => { cached = null; };
