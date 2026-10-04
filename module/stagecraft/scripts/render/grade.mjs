/**
 * The painting as a coarse grid of colours, for core/grade.mjs: the painting is shrunk once into a small canvas that can be read
 * (the browser averages it down) and read out. Null if it cannot be (a picture from another origin).
 */

import { gridFromPixels } from "../core/grade.mjs";

const COLS = 48;

export function paintingGrid(image, make = () => document.createElement("canvas")) {
  const iw = image?.naturalWidth || image?.width;
  const ih = image?.naturalHeight || image?.height;
  if (!iw || !ih) return null;
  const w = COLS;
  const h = Math.max(2, Math.round((COLS * ih) / iw));
  try {
    const canvas = make();
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, w, h);
    return gridFromPixels(ctx.getImageData(0, 0, w, h).data, w, h);
  } catch {
    return null;
  }
}
