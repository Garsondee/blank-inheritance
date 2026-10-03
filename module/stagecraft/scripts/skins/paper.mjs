/**
 * The default skin: a paper card on a wooden stick. Plain, readable and fully ours to give away.
 *
 * A skin is everything that makes the stage look like something: the picture on a card's face and back, the stick, the
 * materials. The module draws with whatever skin is registered; a table may register its own (`api.skins.register`).
 *
 *   id, name         for the registry
 *   size             the card's face in reference pixels at scale 1: { w, h }
 *   thickness        how thick the card is
 *   fonts            CSS font strings to load before the first face is drawn
 *   stick            { length, collar, wood }: colours as numbers
 *   materials        { body: {color, metalness, roughness}, face: {...}, back: {...} }
 *   async face(person, helpers)   a canvas, 2 x size, for the front
 *   async back(person, helpers)   a canvas, 2 x size, for the back
 *
 * `helpers.loadImage(src)` returns a cached image or null when it cannot be loaded.
 */

const FONT = '600 34px "Helvetica Neue", Arial, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export const paper = {
  id: "paper",
  name: "Paper",
  size: { w: 280, h: 468 },
  thickness: 9,
  fonts: [],
  stick: { length: 134, collar: 0xb9b3a4, wood: 0xc79a62 },
  materials: {
    body: { color: 0xe7dfcd, metalness: 0, roughness: 0.9 },
    face: { metalness: 0, roughness: 0.85, clearcoat: 0.15 },
    back: { metalness: 0, roughness: 0.9 }
  },

  async face(person, { loadImage }) {
    const w = 560;
    const h = 936;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    roundRect(ctx, 0, 0, w, h, 28);
    ctx.fillStyle = "#f3ecdc"; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = "#3b3226"; roundRect(ctx, 6, 6, w - 12, h - 12, 24); ctx.stroke();
    const px = 36; const py = 36; const pw = w - 72; const ph = Math.round(pw * 1.5);
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 14); ctx.clip();
    ctx.fillStyle = "#cfc6b0"; ctx.fillRect(px, py, pw, ph);
    const img = person.portrait ? await loadImage(person.portrait) : null;
    if (img) {
      const s = Math.max(pw / img.width, ph / img.height);
      ctx.drawImage(img, px + (pw - img.width * s) / 2, py + (ph - img.height * s) * 0.15, img.width * s, img.height * s);
    } else {
      ctx.fillStyle = "#3b3226"; ctx.font = `700 ${Math.round(pw * 0.5)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText((person.name ?? "?").slice(0, 1).toUpperCase(), px + pw / 2, py + ph / 2);
    }
    ctx.restore();
    if (person.colour) { ctx.fillStyle = person.colour; ctx.fillRect(px, py + ph + 14, pw, 8); }
    const ny = py + ph + 34;
    ctx.fillStyle = "#3b3226"; ctx.font = FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((person.name ?? person.id).toUpperCase(), w / 2, ny + (h - ny - 36) / 2);
    return c;
  },

  async back(person) {
    const w = 560;
    const h = 936;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    roundRect(ctx, 0, 0, w, h, 28);
    ctx.fillStyle = "#b9966a"; ctx.fill();
    ctx.fillStyle = "#f3ecdc"; roundRect(ctx, w / 2 - 190, h / 2 - 44, 380, 88, 6); ctx.fill();
    ctx.fillStyle = "#3b3226"; ctx.font = FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(person.name ?? person.id, w / 2, h / 2 + 2);
    return c;
  }
};
