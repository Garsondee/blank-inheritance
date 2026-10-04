/**
 * What the start-up speed test found out about this computer, kept in this browser (core/speed.mjs): either that the lit
 * stage runs well here (`ok`, so nobody tests it again), or the highest tier it can hold (`tier`). It belongs to a graphics
 * card: a browser that is moved to a different machine, or whose graphics card changed, is not held to what was found.
 * Nothing here is shared; it is a note this machine keeps for itself.
 */

import { SPEED, TIER_ORDER, dropStands } from "../core/speed.mjs";
import { webglInfo } from "../render/choose.mjs";

const KEY = "stagecraft.speed";

const gpuNow = () => webglInfo().renderer || "unknown";

/**
 * What was found, if it was found for this graphics card: { ok } or { tier }, else null. A drop is only believed for half a
 * day (core/speed.mjs `keepHours`): one busy evening (a game on the same card, a call) must not decide for good, so after
 * that the computer is tested afresh. A finding that it runs well is kept.
 */
export function readSpeed({ now = Date.now(), limits = { ...SPEED, ...(globalThis.__stagecraftSpeed ?? {}) } } = {}) {
  try {
    const kept = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? "null");
    if (!kept || kept.gpu !== gpuNow()) return null;
    if (kept.tier && !TIER_ORDER.includes(kept.tier)) return null;
    if (kept.tier && !dropStands(kept.at, now, limits)) return null;
    return { ok: kept.ok === true, tier: kept.tier ?? null, at: kept.at ?? null };
  } catch {
    return null;
  }
}

/** Keep a finding: { ok: true } (it runs well here) or { tier } (the highest it can hold). */
export function keepSpeed({ ok = false, tier = null }) {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify({ gpu: gpuNow(), ok, tier, at: Date.now() })); } catch { /* a private window keeps nothing: it is tested each time */ }
}

/** Forget it: the player chose a picture quality themselves, so this computer is judged afresh the next time it is left on Automatic. */
export function forgetSpeed() {
  try { globalThis.localStorage?.removeItem(KEY); } catch { /* nothing kept */ }
}

/** The highest tier this computer was found to hold, or null when nothing is held against it. */
export const speedLimit = () => readSpeed()?.tier ?? null;
