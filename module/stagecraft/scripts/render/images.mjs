/**
 * Images by address, loaded once; null when one cannot be loaded (the skin draws without it). Both backends use it, and
 * the host makes one per stage and hands it to whichever backend draws.
 */

export class ImageCache {
  constructor() { this.byUrl = new Map(); }
  loadImage = (src) => {
    if (!src) return Promise.resolve(null);
    if (!this.byUrl.has(src)) {
      this.byUrl.set(src, new Promise((resolve) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => resolve(im);
        im.onerror = () => resolve(null);
        im.src = src;
      }));
    }
    return this.byUrl.get(src);
  };
}
