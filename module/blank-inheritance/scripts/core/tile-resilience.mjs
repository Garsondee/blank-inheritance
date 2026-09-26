/**
 * Pure decision logic for the tile-texture self-heal pass — module core,
 * touches no Foundry global and no PIXI (design/testing-strategy.md §1).
 *
 * WHY THIS EXISTS: a real bug in Foundry v14's own core, confirmed by reading
 * it (`client/canvas/loader.mjs`, TextureLoader#loadTexture, ~line 351):
 *
 *   let asset = await loadAsset(src);
 *   if ( !asset?.baseTexture?.valid ) return null;
 *
 * `PIXI.Assets.load(src)` can resolve its promise before PIXI's own internal
 * `baseTexture.valid` flag has flipped — that flag flips on a separate
 * `'loaded'` event once the GPU upload finishes, not on promise resolution.
 * Foundry checks it synchronously the instant the promise resolves, with no
 * wait and no retry. Under load (several large textures decoding/uploading
 * at once) the flag can still read false at that exact moment, and Foundry
 * gives up permanently for that draw — it logs `Invalid Asset <src>` and
 * leaves the Tile on its lightweight placeholder texture forever.
 *
 * Found live 2026-09-22 fixing the campaign map's four quarter tiles
 * (14-20MB WebP each): a different quarter failed almost every reload, never
 * the same one twice, uncorrelated with which file was largest. Confirmed
 * NOT a bad upload or a corrupt file: the exact bytes that failed to load in
 * one attempt decoded perfectly via a raw `<img>` tag, `createImageBitmap`,
 * and `PIXI.Texture.from()` in the same tab, seconds later. A timing race in
 * Foundry's own core, not anything about these specific assets — so the fix
 * belongs here, not in re-cut art (see foundry/tile-resilience.mjs for the
 * actual repair, which waits for the real `'loaded'` event Foundry skips).
 */

/**
 * Delays between successive repair passes after canvasReady, in ms. Matches
 * how long Foundry's own loader can leave a tile on its placeholder before
 * giving up for good — observed live at 20+ seconds. The early passes are
 * mostly giving a genuinely still-loading texture more time, not retrying a
 * failure yet; repairing an already-fine tile is a cheap no-op (see
 * `tileNeedsRepair` below), so running every pass unconditionally is safe.
 */
export const REPAIR_PASS_DELAYS_MS = Object.freeze([2000, 5000, 10000, 20000]);

/**
 * Does this tile's actually-rendered texture size disagree with what the
 * Tile document itself declares?
 *
 * True for two different situations — a texture genuinely still loading
 * (harmless; the next pass will find it fixed on its own), and a texture
 * stuck on Foundry's core race (the actual bug). Deliberately does not try
 * to tell them apart: repairing a still-loading tile is safe and cheap (it
 * just awaits the same in-flight resource PIXI is already fetching), so
 * there is no cost to treating both cases identically.
 */
export function tileNeedsRepair({ declaredWidth, declaredHeight, renderedWidth, renderedHeight } = {}) {
  if (!declaredWidth || !declaredHeight) return false; // nothing to compare against
  return renderedWidth !== declaredWidth || renderedHeight !== declaredHeight;
}

/** Which of a list of tile descriptors currently need a repair pass. */
export function tilesNeedingRepair(tiles) {
  return (tiles ?? []).filter(tileNeedsRepair);
}
