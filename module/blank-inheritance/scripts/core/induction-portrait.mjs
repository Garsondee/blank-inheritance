/**
 * Pure crop-geometry math for the induction terminal's Page 6 (Portrait).
 * No Foundry, no DOM, no Canvas -- everything here operates on plain numbers
 * (image dimensions, a fixed-size crop viewport, a pan/zoom state) so it can
 * be unit-tested directly. The adapter (scripts/foundry/induction-terminal.mjs)
 * is what actually loads a file, drives the pointer-drag/zoom-slider UI, and
 * draws the result to a <canvas> -- this module only computes where.
 *
 * The crop viewport (on-screen, CSS pixels) and the exported OUTPUT
 * resolution are DELIBERATELY decoupled: every function below takes
 * boxWidth/boxHeight as plain parameters, so the same math describes "what
 * rectangle of the source image is currently visible in the interactive
 * crop box" regardless of that box's physical on-screen size. The adapter
 * reads that rectangle back out in SOURCE-image pixels (cropSourceRect) and
 * draws it into a canvas sized to OUTPUT_WIDTH/OUTPUT_HEIGHT -- full-
 * resolution crop, independent of how large the on-screen widget happens to
 * be. Both the interactive box and the output are 2:3, the same ratio every
 * other staged portrait in this project already uses (design/
 * theatre-of-the-mind-staging.md) -- but nothing here hardcodes that ratio;
 * a caller could in principle pass a different one and this would still be
 * correct, since only the caller's own box dimensions matter.
 */

/**
 * 512x768, 2:3 -- the closest existing precedent for a portrait's output
 * size (tools/stage-assets/stage_assets.py's own MAX_EDGE.portrait = 768,
 * a different pipeline for GM-curated art, but the only concrete pixel
 * target anywhere in this repo). No target was ever stated for a PLAYER-
 * uploaded portrait specifically (design/induction-terminal.md only ever
 * says "2:3 ratio," never a resolution) -- this is a reasonable default,
 * not a verified requirement.
 */
export const OUTPUT_WIDTH = 512;
export const OUTPUT_HEIGHT = 768;

/**
 * The minimum scale at which a naturalWidth x naturalHeight image fully
 * covers a boxWidth x boxHeight viewport with no letterboxing -- the same
 * "cover" behavior as CSS object-fit: cover, computed by hand since the
 * actual pixels crossing into the output canvas need to come from a real
 * source rectangle, not a CSS visual effect.
 */
export function coverScale(naturalWidth, naturalHeight, boxWidth, boxHeight) {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    throw new Error(`coverScale needs a positive image size, got ${naturalWidth}x${naturalHeight}.`);
  }
  return Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight);
}

/**
 * Clamp one axis of pan so the crop box never shows past the scaled
 * image's own edges. `offset` is how far the box's top-left corner has
 * scrolled into the scaled image (0 = flush with the image's own top/left).
 */
export function clampOffset(offset, scale, naturalDimension, boxDimension) {
  const maxOffset = Math.max(0, naturalDimension * scale - boxDimension);
  return Math.min(Math.max(offset, 0), maxOffset);
}

/** The default crop on first loading an image: cover-scaled and centered. */
export function initialCropState(naturalWidth, naturalHeight, boxWidth, boxHeight) {
  const scale = coverScale(naturalWidth, naturalHeight, boxWidth, boxHeight);
  return {
    scale,
    offsetX: clampOffset((naturalWidth * scale - boxWidth) / 2, scale, naturalWidth, boxWidth),
    offsetY: clampOffset((naturalHeight * scale - boxHeight) / 2, scale, naturalHeight, boxHeight)
  };
}

/**
 * Pan by (dx, dy) screen pixels -- dragging the pointer right/down moves
 * the image right/down under the box, matching direct-manipulation drag
 * conventions (photo editors, map tools), which is why the box's own
 * offset moves the OPPOSITE way the pointer does.
 */
export function panBy(cropState, dx, dy, naturalWidth, naturalHeight, boxWidth, boxHeight) {
  return {
    ...cropState,
    offsetX: clampOffset(cropState.offsetX - dx, cropState.scale, naturalWidth, boxWidth),
    offsetY: clampOffset(cropState.offsetY - dy, cropState.scale, naturalHeight, boxHeight)
  };
}

/**
 * Rescale to `nextScale` (clamped to never go below cover), keeping the
 * crop box's current CENTER fixed in image space -- zooming in/out holds
 * whatever's in the middle of the box steady instead of drifting toward
 * the image's own top-left corner.
 */
export function zoomTo(cropState, nextScale, naturalWidth, naturalHeight, boxWidth, boxHeight) {
  const minScale = coverScale(naturalWidth, naturalHeight, boxWidth, boxHeight);
  const scale = Math.max(nextScale, minScale);
  const centerX = (cropState.offsetX + boxWidth / 2) / cropState.scale;
  const centerY = (cropState.offsetY + boxHeight / 2) / cropState.scale;
  return {
    scale,
    offsetX: clampOffset(centerX * scale - boxWidth / 2, scale, naturalWidth, boxWidth),
    offsetY: clampOffset(centerY * scale - boxHeight / 2, scale, naturalHeight, boxHeight)
  };
}

/**
 * The rectangle of the ORIGINAL (natural-resolution) image currently
 * visible in the crop box, in the source image's own pixel coordinates --
 * exactly what a canvas drawImage(source, sx, sy, sWidth, sHeight, ...)
 * call needs as its source-rect arguments.
 */
export function cropSourceRect(cropState, boxWidth, boxHeight) {
  return {
    sx: cropState.offsetX / cropState.scale,
    sy: cropState.offsetY / cropState.scale,
    sWidth: boxWidth / cropState.scale,
    sHeight: boxHeight / cropState.scale
  };
}

/**
 * The zoom <input type="range"> uses a fixed [0,1] slider regardless of any
 * given image's own natural size, rather than the raw `scale` value
 * directly -- 0 always means "as zoomed out as this image is allowed to
 * go" (coverScale) and 1 always means MAX_ZOOM_MULTIPLIER times that,
 * however large coverScale itself happens to be for a particular photo.
 * These two are exact inverses of each other; both take the already-
 * computed coverScale rather than recomputing it, since every real caller
 * already has it on hand.
 */
export const MAX_ZOOM_MULTIPLIER = 3;

export function sliderValueToScale(sliderValue, coverScaleValue, maxMultiplier = MAX_ZOOM_MULTIPLIER) {
  return coverScaleValue * (1 + sliderValue * (maxMultiplier - 1));
}

export function scaleToSliderValue(scale, coverScaleValue, maxMultiplier = MAX_ZOOM_MULTIPLIER) {
  return (scale / coverScaleValue - 1) / (maxMultiplier - 1);
}
