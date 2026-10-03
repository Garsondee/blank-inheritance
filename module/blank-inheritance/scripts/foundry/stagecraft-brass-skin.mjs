/**
 * The adventure's skin for Stagecraft: brass, enamel and a typed label. This is the campaign's own look, so it lives
 * with the campaign (here, in the sketchbook, until the adventure's bridge file takes it over) and is handed to the
 * module through the public api, never built into the module (module.md §7).
 *
 *   game.modules.get("stagecraft").api.skins.register(brass)
 */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export const brass = {
  id: "brass",
  name: "Brass and enamel",
  size: { w: 280, h: 468 },
  thickness: 12,
  fonts: ["700 30px 'Chakra Petch'", "30px 'Special Elite'"],
  stick: { length: 134, collar: 0xb8924f, wood: 0x80512d },
  materials: {
    body: { color: 0xb8924f, metalness: 1, roughness: 0.34 },
    face: { metalness: 0.1, roughness: 0.5, clearcoat: 0.6 },
    back: { metalness: 0.35, roughness: 0.62 }
  },

  async face(person, { loadImage }) {
    const w = 560;
    const h = 936;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ecd29a"); g.addColorStop(0.45, "#a98440"); g.addColorStop(1, "#4a3818");
    roundRect(ctx, 0, 0, w, h, 26);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,246,214,0.55)"; roundRect(ctx, 6, 6, w - 12, h - 12, 22); ctx.stroke();
    ctx.strokeStyle = "rgba(40,28,10,0.7)"; roundRect(ctx, 16, 16, w - 32, h - 32, 16); ctx.stroke();
    const px = 24; const py = 24; const pw = w - 48; const ph = Math.round(pw * 1.5);
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 10); ctx.clip();
    ctx.fillStyle = "#17201f"; ctx.fillRect(px, py, pw, ph);
    const img = person.portrait ? await loadImage(person.portrait) : null;
    if (img) {
      const s = Math.max(pw / img.width, ph / img.height);
      const dw = img.width * s; const dh = img.height * s;
      ctx.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) * 0.15, dw, dh);
    }
    const v = ctx.createRadialGradient(px + pw / 2, py + ph * 0.45, ph * 0.3, px + pw / 2, py + ph * 0.45, ph * 0.78);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = v; ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    if (person.colour) { ctx.fillStyle = person.colour; ctx.shadowColor = person.colour; ctx.shadowBlur = 16; ctx.fillRect(px, py + 18, 9, ph - 36); ctx.shadowBlur = 0; }
    ctx.fillStyle = "#4fc8d8"; ctx.shadowColor = "#4fc8d8"; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(w - 52, 52, 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    const ny = py + ph + 12; const nh = h - ny - 24;
    const n = ctx.createLinearGradient(0, ny, 0, ny + nh);
    n.addColorStop(0, "#f3ecd6"); n.addColorStop(1, "#cbbf9f");
    roundRect(ctx, px, ny, pw, nh, 8); ctx.fillStyle = n; ctx.fill();
    ctx.fillStyle = "#231c10"; ctx.font = '700 36px "Chakra Petch", sans-serif';
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.letterSpacing = "6px";
    ctx.fillText((person.name ?? person.id).toUpperCase(), w / 2, ny + nh / 2 + 2);
    return c;
  },

  async back(person) {
    const w = 560;
    const h = 936;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#9a7c43"); g.addColorStop(0.6, "#5f4a22"); g.addColorStop(1, "#3e2f14");
    roundRect(ctx, 0, 0, w, h, 26); ctx.fillStyle = g; ctx.fill();
    for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) {
      const r = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 13);
      r.addColorStop(0, "#f1d9a2"); r.addColorStop(1, "#5f4a22");
      ctx.fillStyle = r; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "#efe6cf"; roundRect(ctx, w / 2 - 130, h / 2 - 34, 260, 68, 4); ctx.fill();
    ctx.fillStyle = "#2a2316"; ctx.font = '36px "Special Elite", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(person.name ?? person.id, w / 2, h / 2 + 2);
    return c;
  }
};
