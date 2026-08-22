// Polyfills the browser Web Crypto global for the Node test environment.
//
// core/ids.mjs uses `crypto.subtle` because that's what's actually available
// as a real global inside Foundry (verified). Node 18.16 ships the same
// SubtleCrypto implementation, but — verified directly, 2026-08-22, after
// tests failed with "crypto is not defined" — does NOT expose it as a bare
// `globalThis.crypto` in this version/module context the way a browser does.
// Node 19+ does this automatically; until this project's Node is upgraded,
// every test file that (directly or transitively) calls deriveFoundryId or
// contentHash must import this file first.
//
// This file is test-only. core/ids.mjs itself must never import from
// "node:crypto" — that would break it when actually loaded inside Foundry,
// which has no Node built-ins.
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}
