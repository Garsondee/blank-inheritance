import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Dev server proxies /api and /tiles to the real FastAPI backend
// (tools/city-map/api/main.py, port 8766) -- avoids CORS entirely during
// development rather than configuring CORS headers on the API server for
// what is, for now, a single-machine local tool.
export default defineConfig({
  plugins: [svelte()],
  // NOTE: no optimizeDeps.exclude here, deliberately -- see App.svelte's
  // top comment for the full story. The short version: excluding
  // maplibre-gl from esbuild's pre-bundling (tried first, to work around
  // an unrelated crash in code this app no longer imports) made Vite serve
  // maplibre-gl-worker.mjs through its normal per-request dev transform,
  // which injects Vite's HMR-client boilerplate (`import ... from
  // "/@vite/client"`) into every served module -- fine for the main page,
  // fatal for a Worker's entry script, which gets its own separate
  // realm/module graph with no HMR client connected, so that injected
  // import silently never resolves and the worker never starts (confirmed
  // directly: fetching the served file showed the injected import; a raw
  // `new Worker(url, {type:'module'})` against that exact URL hung
  // forever with no error). Pre-bundled (not excluded) dependencies are
  // NOT per-request-transformed this way, so leaving maplibre-gl on the
  // normal pre-bundling path is the actual fix, not a workaround.
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8766",
      "/tiles": "http://127.0.0.1:8766",
      "/health": "http://127.0.0.1:8766",
    },
  },
  // `vite preview` (serves the real dist/ build) does NOT inherit
  // server.proxy -- needs its own, identical entry.
  preview: {
    port: 4174,
    proxy: {
      "/api": "http://127.0.0.1:8766",
      "/tiles": "http://127.0.0.1:8766",
      "/health": "http://127.0.0.1:8766",
    },
  },
  test: {
    environment: "node", // src/lib/core/ is DOM-free by construction (see
                         // the tier0 scan in test/city-map-editor/) --
                         // plain node is enough, and faster than jsdom.
    include: ["src/**/*.test.ts"],
  },
});
