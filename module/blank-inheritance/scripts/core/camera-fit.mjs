/**
 * Framing a set of scene-space points into a viewport — the pure half of
 * the travel camera (foundry/travel-camera.mjs).
 *
 * Ingram's own brief, 2026-09-23, after watching the first real crossing
 * live and finding it illegible: "the arrow is white on a pale coloured
 * map... the camera was extremely zoomed out. What I want ideally is an
 * ideal level of zoom which highlights the token with some context." A
 * second requirement came with it — "if the group splits so does their
 * view of the map" — which is why this takes a plain list of points rather
 * than one: the caller decides which points are relevant to a given
 * viewer (foundry/travel-camera.mjs's own ownership filter), and this file
 * only ever answers "given these points and this screen, where should the
 * camera sit."
 */

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

/**
 * `points` is a non-empty array of `{x, y}` in scene-space. `viewportWidth`/
 * `viewportHeight` are the VIEWING CLIENT's own canvas pixels (each client
 * fits locally, since screen size is never the same on two machines).
 * Returns `{x, y, scale}` — a `canvas.animatePan`-ready frame — or `null`
 * for an empty input.
 *
 * One point: centre on it, at a fixed "ideal" close-in scale — a single
 * token has no spread to fit, so there is nothing to compute FROM.
 * Several points: fit their bounding box plus a real-world margin (so a
 * token doesn't sit flush against the screen edge), clamped to a sane
 * range so two nearly-coincident points don't zoom in past legibility and
 * a widely-scattered set doesn't zoom out past the point of "highlighting"
 * anything.
 */
export function fitPointsToViewport(points, viewportWidth, viewportHeight, opts = {}) {
  const {
    marginPx = 400,
    minScale = 0.5,
    maxScale = 1.5,
    singlePointScale = 1.2
  } = opts;

  if (!Array.isArray(points) || points.length === 0) return null;
  if (!(viewportWidth > 0) || !(viewportHeight > 0)) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  if (points.length === 1) {
    return { x: centerX, y: centerY, scale: singlePointScale };
  }

  const boxWidth = Math.max(1, maxX - minX + marginPx * 2);
  const boxHeight = Math.max(1, maxY - minY + marginPx * 2);
  const scale = Math.min(viewportWidth / boxWidth, viewportHeight / boxHeight);
  return { x: centerX, y: centerY, scale: clamp(scale, minScale, maxScale) };
}

/**
 * Where the camera starts on a STAGED scene (a picture, not a map — see
 * foundry/stage-camera.mjs), and where it goes back to when the Scene Runner
 * opens, shuts or is dragged wider. It is only a starting point: the viewer
 * pans and zooms freely from there (Ingram, 2026-10-04: "free the user to pan
 * and zoom in and out again").
 *
 * A player's whole window is the stage, so for them this is the plain cover
 * fit: scale until the picture covers the window, centre on the picture's
 * middle. The GM is the one whose view differs — the Scene Runner takes the
 * left of their screen, and "scene which is under the scene runner is
 * inaccessible" (Ingram, 2026-10-04). So with the drawer open the picture's
 * whole WIDTH is fitted into the band that is left and centred there: nothing
 * lies behind the drawer, at the price of a little black above and below.
 * `leftInset` is the width the drawer covers.
 *
 * Returns a `{x, y, scale}` pivot, the shape `canvas.pan` takes. The pivot
 * is the scene point that lands at the window's centre, which is why it
 * shifts LEFT by half the inset (in scene units) to put the picture's own
 * centre in the middle of the visible band. The same rule as Stagecraft's own
 * home view (its core/look.mjs, homeLook).
 */
export function stageFrame({ sceneX = 0, sceneY = 0, sceneWidth, sceneHeight, viewportWidth, viewportHeight, leftInset = 0 } = {}) {
  if (!(sceneWidth > 0 && sceneHeight > 0 && viewportWidth > 0 && viewportHeight > 0)) return null;
  const inset = clamp(Number(leftInset) || 0, 0, viewportWidth * 0.9);
  const visibleWidth = viewportWidth - inset;
  const scale = inset > 0 ? visibleWidth / sceneWidth : Math.max(viewportWidth / sceneWidth, viewportHeight / sceneHeight);
  return {
    x: sceneX + sceneWidth / 2 - inset / (2 * scale),
    y: sceneY + sceneHeight / 2,
    scale
  };
}
