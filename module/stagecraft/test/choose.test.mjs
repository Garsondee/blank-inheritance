// Which backend draws a stage (render/choose.mjs): the player's choice and what the browser can do.

import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseBackend, hasWebGL, hasSoftwareWebGL, webglInfo, isSoftwareRenderer, forgetWebGL } from "../scripts/render/choose.mjs";

test("three.js draws unless the player asked for flat, the browser has no WebGL, or three.js has already failed here", () => {
  assert.equal(chooseBackend({ tier: "high", webgl: true }), "three");
  assert.equal(chooseBackend({ tier: "low", webgl: true }), "three");
  assert.equal(chooseBackend({ tier: "auto", webgl: true }), "three");
  assert.equal(chooseBackend({ tier: "flat", webgl: true }), "flat", "she asked for it");
  assert.equal(chooseBackend({ tier: "high", webgl: false }), "flat", "nothing else can run");
  assert.equal(chooseBackend({ tier: "high", webgl: true, failed: true }), "flat", "it failed once");
  assert.equal(chooseBackend({ tier: "flat", webgl: false, failed: true }), "flat");
});

const docWith = (contexts, onLose = () => {}) => ({
  createElement: () => ({
    getContext: (name) => (contexts.includes(name) ? { getExtension: () => ({ loseContext: onLose }) } : null)
  })
});

test("a browser that can make a WebGL context is seen to, and the context it made to find out is let go at once", () => {
  forgetWebGL();
  let lost = 0;
  assert.equal(hasWebGL(docWith(["webgl2"], () => lost++)), true);
  assert.equal(lost, 1, "the test context is released: a browser allows only so many");
  forgetWebGL();
  assert.equal(hasWebGL(docWith(["webgl"])), true, "older WebGL will do");
});

test("a browser with no WebGL, or one that throws when asked, is seen to have none", () => {
  forgetWebGL();
  assert.equal(hasWebGL(docWith([])), false);
  forgetWebGL();
  assert.equal(hasWebGL({ createElement: () => { throw new Error("no"); } }), false);
});

test("the answer is asked for once per page and remembered", () => {
  forgetWebGL();
  let asked = 0;
  const doc = { createElement: () => { asked++; return { getContext: () => ({}) }; } };
  hasWebGL(doc); hasWebGL(doc); hasWebGL(doc);
  assert.equal(asked, 1);
  forgetWebGL();
});

test("a software rasteriser is recognised by the name the browser gives it, and a real graphics card never is", () => {
  for (const name of ["ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)", "llvmpipe (LLVM 15.0.7, 256 bits)", "Microsoft Basic Render Driver", "Software Rasterizer", "Mesa OffScreen"]) {
    assert.equal(isSoftwareRenderer(name), true, name);
  }
  for (const name of ["ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)", "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)", "Apple M2", "AMD Radeon Pro 5500M OpenGL Engine", "ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)", "", undefined]) {
    assert.equal(isSoftwareRenderer(name), false, String(name));
  }
});

test("left on Automatic, a software browser gets the flat stage; the lit one would run at two frames a second there", () => {
  assert.equal(chooseBackend({ tier: "high", webgl: true, software: true }), "flat");
  assert.equal(chooseBackend({ tier: "low", webgl: true, software: false }), "three");
});

test("the browser's own name for its graphics is read from the debug extension, and asked for once", () => {
  forgetWebGL();
  let asked = 0;
  const gl = {
    RENDERER: 7937,
    getExtension: (name) => (name === "WEBGL_debug_renderer_info" ? { UNMASKED_RENDERER_WEBGL: 37446 } : { loseContext() {} }),
    getParameter: (p) => (p === 37446 ? "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)" : "WebKit WebGL")
  };
  const doc = { createElement: () => { asked++; return { getContext: () => gl }; } };
  assert.deepEqual(webglInfo(doc), { ok: true, renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)" });
  assert.equal(hasSoftwareWebGL(doc), true);
  assert.equal(asked, 1);
  forgetWebGL();
  const plain = { createElement: () => ({ getContext: () => ({ RENDERER: 7937, getExtension: () => null, getParameter: () => "Some Graphics Card" }) }) };
  assert.deepEqual(webglInfo(plain), { ok: true, renderer: "Some Graphics Card" }, "without the debug extension the generic name is used");
  assert.equal(hasSoftwareWebGL(plain), false);
  forgetWebGL();
});
