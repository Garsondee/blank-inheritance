/**
 * Emotes: the cards' own symbols. A sketch of scripts/core/emotes.mjs.
 *
 * Drawn in the language of the manga symbol (the sweat drop, the popping vein,
 * the gloom lines), because that is a vocabulary the table already reads at a
 * glance, and in the campaign's own print style: a thick ink line, flat colour
 * from the palette, a cream sticker edge so it reads on any picture, and an ink
 * shadow printed a touch out of register, like a 1950s magazine.
 *
 * Every emote is a small SVG on a 100 × 100 box plus a motion: how it pops on,
 * what it does while it stays (a drip, a pulse, a float, a twinkle) and how
 * long it stays.
 */

const INK = "#1b140c";
const HALO = "#fbf5e6";
const P = {
  vermilion: "#d8462a", orange: "#ec8a3c", amber: "#f2b53f", bone: "#f6efdc", cream: "#efe3c4",
  cyan: "#9fd9e4", sky: "#7cc0d6", teal: "#6e8a8f", slate: "#4f5f63", brass: "#b8924f", blush: "#f2a08c", ink: INK
};

/* A shape list -> sticker layers: halo, offset shadow, body, outline. */
function sticker(shapes, { shine = "" } = {}) {
  const halo = [];
  const shadow = [];
  const body = [];
  for (const s of shapes) {
    if (s.t === "fill") {
      halo.push(`<path d="${s.d}" fill="${HALO}" stroke="${HALO}" stroke-width="13" stroke-linejoin="round"/>`);
      shadow.push(`<path d="${s.d}" fill="${INK}" opacity=".32" transform="translate(2.6 3.6)"/>`);
      body.push(`<path d="${s.d}" fill="${s.c}" stroke="${INK}" stroke-width="${s.w ?? 4.6}" stroke-linejoin="round"/>`);
    } else if (s.t === "dot") {
      halo.push(`<circle cx="${s.x}" cy="${s.y}" r="${s.r + 6}" fill="${HALO}"/>`);
      shadow.push(`<circle cx="${s.x + 2.6}" cy="${s.y + 3.6}" r="${s.r}" fill="${INK}" opacity=".32"/>`);
      body.push(`<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.c}" stroke="${INK}" stroke-width="${s.c === INK ? 0 : 4.2}"/>`);
    } else if (s.t === "line") {
      const w = s.w ?? 7;
      halo.push(`<path d="${s.d}" fill="none" stroke="${HALO}" stroke-width="${w + 13}" stroke-linecap="round" stroke-linejoin="round"/>`);
      shadow.push(`<path d="${s.d}" fill="none" stroke="${INK}" opacity=".32" stroke-width="${w + 4.6}" stroke-linecap="round" stroke-linejoin="round" transform="translate(2.6 3.6)"/>`);
      body.push(`<path d="${s.d}" fill="none" stroke="${INK}" stroke-width="${w + 4.6}" stroke-linecap="round" stroke-linejoin="round"/>`);
      if (s.c !== INK) body.push(`<path d="${s.d}" fill="none" stroke="${s.c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);
    } else if (s.t === "text") {
      halo.push(`<text x="${s.x}" y="${s.y}" font-family="${s.font}" font-size="${s.size}" text-anchor="middle" fill="${HALO}" stroke="${HALO}" stroke-width="10" stroke-linejoin="round">${s.s}</text>`);
      body.push(`<text x="${s.x}" y="${s.y}" font-family="${s.font}" font-size="${s.size}" text-anchor="middle" fill="${s.c}" stroke="${INK}" stroke-width="${s.c === INK ? 0 : 2}" paint-order="stroke">${s.s}</text>`);
    }
  }
  return `<svg viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">${halo.join("")}${shadow.join("")}${body.join("")}${shine}</svg>`;
}
const fill = (d, c, w) => ({ t: "fill", d, c, w });
const dot = (x, y, r, c) => ({ t: "dot", x, y, r, c });
const line = (d, c, w) => ({ t: "line", d, c, w });
const text = (s, x, y, size, c, font = "Yuji Syuku, serif") => ({ t: "text", s, x, y, size, c, font });
const shine = (d, w = 4) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity=".85"/>`;

function burst(cx, cy, r1, r2, n, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    const r = i % 2 ? r2 : r1;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}
function star4(cx, cy, r) {
  return `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;
}
function star5(cx, cy, r1, r2) {
  return burst(cx, cy, r1, r2, 5, -90);
}
const cloud = (x, y, s) =>
  `M${x} ${y} q${-12 * s} 0 ${-12 * s} ${-11 * s} q0 ${-12 * s} ${13 * s} ${-12 * s} q${3 * s} ${-12 * s} ${17 * s} ${-11 * s} q${12 * s} ${-6 * s} ${21 * s} ${4 * s} q${13 * s} ${-1 * s} ${14 * s} ${11 * s} q${9 * s} ${3 * s} ${6 * s} ${13 * s} q${-2 * s} ${6 * s} ${-10 * s} ${6 * s} Z`;
const bubble = "M12 30 Q12 14 30 14 L74 14 Q90 14 90 30 L90 50 Q90 66 74 66 L48 66 L28 86 L33 66 L30 66 Q12 66 12 50 Z";

export const EMOTES = Object.freeze({
  surprise: { label: "Surprise", motion: "shake", svg: sticker([fill(burst(50, 50, 48, 30, 11), P.vermilion), fill("M43 18 L57 18 L54.5 58 L45.5 58 Z", P.bone), dot(50, 72, 7, P.bone)]) },
  question: { label: "Question", motion: "tilt", svg: sticker([line("M33 34 C33 17 47 11 56 12 C69 14 73 26 69 35 C65 44 53 46 51 56 L51 61", P.bone, 11), dot(51, 80, 7.5, P.bone)]) },
  shock: { label: "What?!", motion: "shake", svg: sticker([fill("M24 16 L37 16 L34.5 58 L26.5 58 Z", P.vermilion), dot(30.5, 74, 6.5, P.vermilion), line("M52 34 C52 20 63 15 70 16 C81 18 84 27 81 35 C78 42 69 44 67 52 L67 57", P.vermilion, 10), dot(67, 74, 6.5, P.vermilion)]) },
  sweat: { label: "Sweat", motion: "drip", svg: sticker([fill("M60 6 C60 6 30 44 30 62 A23 23 0 0 0 76 64 C76 45 60 6 60 6 Z", P.cyan)], { shine: shine("M43 58 Q41 67 48 74", 5) }) },
  anger: { label: "Anger", motion: "pulse", svg: sticker([line("M18 42 Q38 40 41 18", P.vermilion, 10), line("M59 18 Q62 40 82 42", P.vermilion, 10), line("M82 58 Q62 60 59 82", P.vermilion, 10), line("M41 82 Q38 60 18 58", P.vermilion, 10)]) },
  sparkle: { label: "Sparkle", motion: "twinkle", svg: sticker([fill(star4(48, 50, 36), P.amber), fill(star4(82, 18, 13), P.bone), fill(star4(20, 82, 11), P.bone)]) },
  heart: { label: "Fond", motion: "float", svg: sticker([fill("M50 86 C20 63 10 45 21 30 C32 15 47 21 50 34 C53 21 68 15 79 30 C90 45 80 63 50 86 Z", P.vermilion)], { shine: shine("M28 36 Q30 28 37 27", 5) }) },
  music: { label: "Humming", motion: "float", svg: sticker([fill("M38 22 L80 12 L80 24 L38 34 Z", INK), line("M40 28 L40 70", INK, 5), line("M78 18 L78 60", INK, 5), fill("M20 74 C20 66 30 62 38 64 C46 66 47 74 40 79 C33 84 20 82 20 74 Z", INK), fill("M58 66 C58 58 68 54 76 56 C84 58 85 66 78 71 C71 76 58 74 58 66 Z", INK)]) },
  sleep: { label: "Asleep", motion: "float", svg: sticker([line("M54 14 L84 14 L54 44 L84 44", P.bone, 7), line("M32 50 L52 50 L32 70 L52 70", P.bone, 6), line("M16 76 L30 76 L16 90 L30 90", P.bone, 5)]) },
  gloom: { label: "Gloom", motion: "fall", svg: sticker([line("M24 40 L24 86", P.teal, 5), line("M38 44 L38 92", P.teal, 5), line("M52 40 L52 80", P.teal, 5), line("M66 44 L66 90", P.teal, 5), line("M80 40 L80 82", P.teal, 5), fill(cloud(30, 34, 1.5), P.slate)]) },
  idea: { label: "Idea", motion: "flicker", svg: sticker([line("M50 2 L50 10", P.amber, 5), line("M18 14 L24 20", P.amber, 5), line("M82 14 L76 20", P.amber, 5), line("M8 44 L16 44", P.amber, 5), line("M92 44 L84 44", P.amber, 5), fill("M50 16 A25 25 0 0 1 67 58 L63 68 L37 68 L33 58 A25 25 0 0 1 50 16 Z", P.amber), fill("M37 72 L63 72 L60 86 L40 86 Z", P.brass)], { shine: shine("M38 34 Q40 26 48 24", 5) }) },
  fume: { label: "Fuming", motion: "rise", svg: sticker([fill(cloud(26, 92, 1.1), P.bone), fill(cloud(52, 62, 1.3), P.bone), fill(cloud(30, 34, 1.05), P.bone)]) },
  dizzy: { label: "Dizzy", motion: "spin", svg: sticker([line("M50 50 m0 -5 a5 5 0 1 1 -5 5 a10 10 0 1 1 10 10 a15 15 0 1 1 -15 -15 a20 20 0 1 1 20 20 a25 25 0 1 1 -25 -25 a30 30 0 1 1 30 30", P.orange, 6)]) },
  ellipsis: { label: "…", motion: "bob", svg: sticker([fill(bubble, P.bone), dot(32, 40, 6, INK), dot(51, 40, 6, INK), dot(70, 40, 6, INK)]) },
  laugh: { label: "Laughing", motion: "shake", svg: sticker([fill(burst(50, 44, 46, 36, 14, 0), P.amber), text("ha!", 50, 58, 38, INK)]) },
  shiver: { label: "Shiver", motion: "shake", svg: sticker([line("M14 22 L24 32 L14 42 L24 52 L14 62 L24 72", P.cyan, 5), line("M86 22 L76 32 L86 42 L76 52 L86 62 L76 72", P.cyan, 5), line("M50 8 L58 16 L50 24 L58 32", P.cyan, 4)]) },
  tear: { label: "Tears", motion: "drip", svg: sticker([fill("M40 14 C40 14 18 42 18 56 A20 20 0 0 0 58 58 C58 42 40 14 40 14 Z", P.sky), fill("M74 46 C74 46 62 62 62 70 A12 12 0 0 0 86 71 C86 62 74 46 74 46 Z", P.sky)], { shine: shine("M28 52 Q27 60 32 65", 4) }) },
  blush: { label: "Blush", motion: "pulse", svg: sticker([fill("M8 54 C8 44 34 42 38 52 C42 62 12 66 8 54 Z", P.blush), fill("M62 52 C66 42 92 44 92 54 C88 66 58 62 62 52 Z", P.blush), line("M14 56 L22 46", P.vermilion, 3), line("M22 58 L30 48", P.vermilion, 3), line("M70 58 L78 48", P.vermilion, 3), line("M78 58 L86 48", P.vermilion, 3)]) },
  whisper: { label: "Psst", motion: "bob", svg: sticker([fill("M10 20 Q10 8 24 8 L76 8 Q90 8 90 20 L90 46 Q90 58 76 58 L30 58 Q10 58 10 46 Z", P.cream), text("psst", 50, 42, 26, INK, "Special Elite, monospace"), dot(30, 70, 4, P.cream), dot(22, 82, 3, P.cream), dot(16, 92, 2.4, P.cream)]) },
  think: { label: "Thinking", motion: "bob", svg: sticker([fill("M30 64 C14 64 10 50 18 42 C12 30 24 18 36 22 C42 8 64 8 70 20 C84 18 94 32 86 44 C94 56 82 68 70 64 C62 74 40 74 30 64 Z", P.bone), dot(24, 80, 6, P.bone), dot(14, 92, 4, P.bone)]) },
  skull: { label: "Doomed", motion: "tilt", svg: sticker([fill("M50 10 C26 10 14 26 16 46 C17 58 26 62 30 64 L30 80 L70 80 L70 64 C74 62 83 58 84 46 C86 26 74 10 50 10 Z", P.bone), dot(37, 44, 9, INK), dot(63, 44, 9, INK), fill("M46 58 L50 50 L54 58 Z", INK), line("M40 70 L40 80", INK, 3), line("M50 70 L50 80", INK, 3), line("M60 70 L60 80", INK, 3)]) },
  star: { label: "Well done", motion: "twinkle", svg: sticker([fill(star5(50, 52, 44, 19), P.amber)], { shine: shine("M42 30 Q46 22 50 20", 4) }) },
  hand: { label: "Hand up", motion: "wave", svg: sticker([fill("M30 92 L30 46 Q30 38 37 38 Q44 38 44 46 L44 24 Q44 16 51 16 Q58 16 58 24 L58 30 Q58 22 65 22 Q72 22 72 30 L72 40 Q72 33 79 33 Q86 33 86 40 L86 70 Q86 92 64 94 L44 94 Q32 94 30 92 Z", P.orange)]) },
  bowl: { label: "Hungry", motion: "bob", svg: sticker([line("M36 8 Q30 16 36 24 Q42 32 36 40", P.bone, 4), line("M54 4 Q48 14 54 22 Q60 30 54 38", P.bone, 4), fill("M10 48 L90 48 Q88 80 58 86 L42 86 Q12 80 10 48 Z", P.vermilion), fill("M34 86 L66 86 L62 94 L38 94 Z", P.brass)], { shine: shine("M20 56 Q24 70 34 76", 4) }) }
});

export const EMOTE_ORDER = Object.freeze([
  "surprise", "question", "shock", "sweat", "anger", "sparkle", "heart", "music",
  "sleep", "gloom", "idea", "fume", "dizzy", "ellipsis", "laugh", "shiver",
  "tear", "blush", "whisper", "think", "skull", "star", "hand", "bowl"
]);

/** The eight on the wheel by default; each player can choose their own. */
export const WHEEL = Object.freeze(["surprise", "laugh", "sweat", "heart", "anger", "idea", "ellipsis", "whisper"]);

/**
 * Motions, as functions of time since the emote popped (seconds), returning a
 * transform and opacity. Pop: a quick overshoot. Then the emote's own life.
 */
export function emotePose(motion, t, seed = 0, life = 3.2) {
  const pop = t < 0.28 ? (() => { const u = t / 0.28; return Math.sin(u * Math.PI * 0.62) * (1 + 0.25 * Math.sin(u * Math.PI)); })() : 1;
  const out = Math.max(0, Math.min(1, (life - t) / 0.4));
  const ph = (seed % 97) / 97;
  let x = 0, y = 0, r = 0, s = 1, o = 1;
  switch (motion) {
    case "drip": y = Math.min(14, t * 6); break;
    case "pulse": s = 1 + 0.1 * Math.max(0, Math.sin(t * 13 + ph * 6)); break;
    case "float": y = -t * 14; x = 4 * Math.sin(t * 3 + ph * 6); break;
    case "twinkle": s = 1 + 0.08 * Math.sin(t * 9 + ph * 6); r = 6 * Math.sin(t * 4 + ph); break;
    case "fall": y = Math.min(10, t * 5); break;
    case "flicker": o = t < 0.6 ? (Math.sin(t * 60) > -0.3 ? 1 : 0.35) : 1; break;
    case "rise": y = -t * 10; s = 1 + t * 0.05; break;
    case "spin": r = t * 140; break;
    case "bob": y = 3 * Math.sin(t * 4 + ph * 6); break;
    case "shake": x = t < 0.9 ? 3 * Math.sin(t * 46) * (1 - t / 0.9) : 0; break;
    case "tilt": r = 12 * Math.sin(t * 3 + ph) ; break;
    case "wave": r = 14 * Math.sin(t * 9) * Math.exp(-t * 0.8); break;
    default: break;
  }
  return { x, y, r, s: s * pop, o: o * out };
}
