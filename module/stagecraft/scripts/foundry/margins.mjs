/**
 * What another module's interface takes along each edge of the window, so a screen's home look (core/look.mjs) fits the
 * stage into what is left. Asked afresh every time a home look is worked out, never kept, so a drawer that slides open
 * is seen the moment its owner says so (`api.view.home()`).
 */

import { NS } from "./scene-data.mjs";

const providers = new Set();

/** provider() -> { left?, right?, top?, bottom? } in window pixels, as things are now. Returns a function that takes it away. */
export function registerMargins(provider) {
  if (typeof provider !== "function") throw new TypeError("a margins provider must be a function");
  providers.add(provider);
  return () => providers.delete(provider);
}

/** The margins every provider asks for, the widest along each edge; a provider that throws asks for nothing. */
export function marginsNow() {
  const out = { left: 0, right: 0, top: 0, bottom: 0 };
  for (const provider of providers) {
    try {
      const m = provider();
      for (const edge of Object.keys(out)) if (Number.isFinite(m?.[edge]) && m[edge] > out[edge]) out[edge] = m[edge];
    } catch (err) {
      console.warn(`${NS} | a margins provider failed`, err);
    }
  }
  return out;
}
