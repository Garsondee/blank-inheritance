/**
 * Self-heals a real Foundry core bug (see core/tile-resilience.mjs's own
 * header for the confirmed root cause) by bypassing the racy check entirely:
 * load the texture ourselves and explicitly WAIT for the base texture's real
 * `'loaded'` event — the wait Foundry's own `loadTexture()` skips — then
 * assign it straight onto the Tile's mesh.
 *
 * This is exactly the manual recovery applied by hand four times live on
 * 2026-09-22 (campaign-map's four quarter tiles, each 14-20MB), now automatic.
 *
 * RUNS FOR EVERY CLIENT, NOT GM-GATED. The race happens independently inside
 * each browser's own PIXI/WebGL state — a player's client can hit it exactly
 * as a GM's can — and the repair only touches THIS client's own local render
 * state. It never writes to the Tile document and never syncs to anyone
 * else, so there is no reason to restrict it to the GM the way most of this
 * module's canvasReady hooks correctly do for actual world-state work.
 *
 * Scoped to real image tiles only (`isVideo` excluded — a <video> element's
 * own load/ready lifecycle is a different thing entirely and this bug is
 * specifically about PIXI's static-image BaseTexture#valid flag).
 */
import { REPAIR_PASS_DELAYS_MS, tilesNeedingRepair } from "../core/tile-resilience.mjs";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Loads `src` directly through PIXI, waiting for the real `'loaded'` event
 * rather than trusting `loadTexture()`'s racy resolution timing.
 */
async function loadTextureReliably(src, { timeoutMs = 15000 } = {}) {
  const tex = PIXI.Texture.from(src.startsWith("/") ? src : `/${src}`);
  if (tex.baseTexture.valid) return tex;
  await new Promise((resolve, reject) => {
    tex.baseTexture.once("loaded", resolve);
    tex.baseTexture.once("error", reject);
    setTimeout(() => reject(new Error(`timed out waiting for ${src}`)), timeoutMs);
  });
  return tex;
}

/**
 * One tile, repaired: loads the real texture and assigns it directly onto
 * the mesh, skipping Foundry's own (racy) Tile._draw path entirely for this
 * one recovery action.
 */
async function repairTile(tilePlaceable) {
  const src = tilePlaceable.document.texture.src;
  const tex = await loadTextureReliably(src);
  tilePlaceable.texture = tex;
  if (tilePlaceable.mesh) tilePlaceable.mesh.texture = tex;
  tilePlaceable.renderFlags?.set?.({ refreshMesh: true });
}

/** Descriptors for the core decision function -- one real Foundry read each, no PIXI calls of their own. */
function currentTileDescriptors() {
  return canvas.tiles.placeables
    .filter((p) => !p.isVideo)
    .map((p) => ({
      placeable: p,
      declaredWidth: p.document.width,
      declaredHeight: p.document.height,
      renderedWidth: p.texture?.width,
      renderedHeight: p.texture?.height
    }));
}

/** One scan: repairs whatever is currently stuck. Returns counts for logging. */
async function repairPass() {
  const stuck = tilesNeedingRepair(currentTileDescriptors());
  let fixed = 0;
  let failed = 0;
  for (const { placeable } of stuck) {
    try {
      await repairTile(placeable);
      fixed++;
    } catch (err) {
      failed++;
      console.warn(`Blank Inheritance | Tile self-heal could not recover ${placeable.document.texture.src}:`, err);
    }
  }
  return { stuck: stuck.length, fixed, failed };
}

/**
 * Runs several repair passes with increasing delay after the canvas settles,
 * stopping as soon as nothing is left to fix. See REPAIR_PASS_DELAYS_MS's own
 * comment for why the delays are shaped the way they are.
 *
 * Never throws — a scene switch mid-sequence (`canvas.ready` goes false) just
 * ends the loop quietly, since the NEXT canvasReady firing starts a fresh one
 * for whatever scene is now active.
 */
export async function healStuckTiles() {
  for (const delay of REPAIR_PASS_DELAYS_MS) {
    await wait(delay);
    if (!canvas?.ready) return;
    const { stuck, fixed, failed } = await repairPass();
    if (stuck > 0) {
      console.log(`Blank Inheritance | Tile self-heal: ${fixed} fixed, ${failed} still stuck, of ${stuck} needing repair.`);
    }
    if (stuck === 0) return;
  }
}
