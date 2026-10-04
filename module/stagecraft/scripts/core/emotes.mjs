/**
 * Emotes: the cards' own symbols.
 *
 * Drawn in manga's own vocabulary, because it is one the table already reads at a glance: the marks a manga artist puts
 * beside a head (the sweat drop, the popping vein, the gloom cloud, the sparkle, the steam of a temper) and the little
 * deformed faces a character pulls in a corner panel (the ^ ^ of a laugh, the half-lidded stare, the > < of a wince, the
 * waterfall of tears).
 *
 * They are drawn to sit beside a card, so they are printed the way the cards are made: the umber ink of the title
 * plates, the plates' cream, and one muted spot colour taken from the card and the paintings (the frame's brass, a
 * lacquer persimmon, the tiles' sea-green, a rain slate). The pen swells and tapers like a nib. A spot colour is
 * printed a hair out of register with the ink, as a two-colour magazine was; a thin cream keyline keeps a mark readable
 * on a dark painting; and the faces sit in a small cream balloon with a tail towards the card, the same cream and ink as
 * the plate under the portrait.
 *
 * Every emote is an SVG on a 100 x 100 box (shown on -8 -8 116 116, as the renderers expect) plus a kind (`face`,
 * `balloon` or `mark`), a label and a motion: how it pops on and what it does while it stays (a drip, a pulse, a float,
 * a twinkle). The pictures are drawn into an image, where no web font can reach, so nothing in them is set in type:
 * every letter is drawn with the pen.
 */

const INK = "#241a0f";          // the plate's ink: a warm umber black
const PAPER = "#f2e8cc";        // the plate's cream
const SHADE = "#dbcca2";        // the plate where it darkens towards the foot
const GLINT = "#fffaee";        // a highlight
const BRASS = "#c39a4e";        // the frame
const GILT = "#ead08e";         // the frame where the light catches it
const LACQUER = "#b04a32";      // persimmon lacquer: a temper, a heart, the teacher's red pencil
const ROSE = "#dd977f";         // a blush
const SEA = "#9cc8c2";          // the tiles and the harbour: sweat, tears, a chill
const DEEP = "#5f8e8b";         // deeper water
const SLATE = "#677a7c";        // a rain cloud

/** Every colour an emote may use: the card's own, and nothing else. */
export const EMOTE_PALETTE = Object.freeze({ INK, PAPER, SHADE, GLINT, BRASS, GILT, LACQUER, ROSE, SEA, DEEP, SLATE });

const KEY = 2.2;                // the cream keyline's width outside a mark
const SHADOW = "1.4 2.4";       // where the soft ink shadow falls
const OFF = "1.7 1.3";          // how far the spot colour is printed out of register
const ECHO = "2.6 2.1";         // how far a glyph's coloured echo sits from its ink
const DEG = Math.PI / 180;

/* ------------------------------------------------------------------------------------------------ the pen */

const f = (n) => String(Math.round(n * 10) / 10);
const pt = ([x, y]) => `${f(x)} ${f(y)}`;

/**
 * A placement in the box: scale, turn and shift a drawing about the middle (50, 50). It is a function from a point to
 * a point, carrying its scale `s` so pen widths can follow.
 */
function place({ s = 1, r = 0, dx = 0, dy = 0 } = {}) {
  const c = Math.cos(r * DEG), n = Math.sin(r * DEG);
  const P = ([x, y]) => { const X = (x - 50) * s, Y = (y - 50) * s; return [50 + dx + X * c - Y * n, 50 + dy + X * n + Y * c]; };
  P.s = s;
  return P;
}
const AS_IS = place();

/** Move a path made only of absolute M, L, Q, C and Z commands through a placement (every number pair is a point). */
function moved(P, d) {
  const out = [];
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+/g);
  for (let i = 0; i < tokens.length; i++) {
    if (/[MLQCZ]/.test(tokens[i])) out.push(tokens[i]);
    else { out.push(pt(P([Number(tokens[i]), Number(tokens[i + 1])]))); i++; }
  }
  return out.join(" ").replace(/([MLQC]) /g, "$1");
}

/**
 * A nib stroke along a cubic curve, as a filled outline: `w0` wide at the start, `w1` at the middle and `w2` at the end,
 * with round ends. The swell and taper are what make it read as drawn rather than plotted.
 */
function nib(p0, p1, p2, p3, w0, w1 = w0, w2 = w1, n = 16) {
  const left = [];
  const right = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    let dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
    let dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
    if (Math.hypot(dx, dy) < 1e-6) { dx = p3[0] - p0[0]; dy = p3[1] - p0[1]; }
    const len = Math.hypot(dx, dy) || 1;
    const half = (w0 * u + w2 * t + (w1 - (w0 + w2) / 2) * 4 * t * u) / 2;
    left.push([x - (dy / len) * half, y + (dx / len) * half]);
    right.push([x + (dy / len) * half, y - (dx / len) * half]);
  }
  return `M${pt(left[0])} L${left.slice(1).map(pt).join(" L")} A${f(w2 / 2)} ${f(w2 / 2)} 0 0 0 ${pt(right[n])} L${right.slice(0, n).reverse().map(pt).join(" L")} A${f(w0 / 2)} ${f(w0 / 2)} 0 0 0 ${pt(left[0])} Z`;
}
/** A nib stroke along a straight line, or a quadratic (one control point). */
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const straight = (a, b, w0, w1, w2) => nib(a, lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b, w0, w1, w2);
const bent = (a, q, b, w0, w1, w2) => nib(a, lerp(a, q, 2 / 3), lerp(b, q, 2 / 3), b, w0, w1, w2);

function disc([cx, cy], r) {
  return `M${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
}
function oval([cx, cy], rx, ry, turn = 0) {
  const c = Math.cos(turn * DEG), s = Math.sin(turn * DEG);
  const a = [cx + rx * c, cy + rx * s];
  const b = [cx - rx * c, cy - rx * s];
  return `M${pt(a)} A${f(rx)} ${f(ry)} ${f(turn)} 1 0 ${pt(b)} A${f(rx)} ${f(ry)} ${f(turn)} 1 0 ${pt(a)} Z`;
}
/** A line through points, for spirals and other curves worked out by hand. */
const through = (pts) => `M${pt(pts[0])} L${pts.slice(1).map(pt).join(" L")}`;
function spiral([cx, cy], r0, r1, turns, from = -90) {
  const pts = [];
  const n = Math.ceil(turns * 28);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = (from + t * turns * 360) * DEG;
    const r = r0 + (r1 - r0) * t;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return through(pts);
}
/** A slim four-pointed sparkle. */
function twinkle([cx, cy], r, k = 0.14) {
  const q = r * k;
  return `M${f(cx)} ${f(cy - r)} Q${f(cx + q)} ${f(cy - q)} ${f(cx + r)} ${f(cy)} Q${f(cx + q)} ${f(cy + q)} ${f(cx)} ${f(cy + r)} Q${f(cx - q)} ${f(cy + q)} ${f(cx - r)} ${f(cy)} Q${f(cx - q)} ${f(cy - q)} ${f(cx)} ${f(cy - r)} Z`;
}

/* ------------------------------------------------------------------------------------------------ the print */

// A mark is { d, fill?, stroke?, w?, dash?, opacity?, inner?, bare? }. An inner mark sits inside another (a face's
// features, a highlight) and gets no keyline or shadow of its own; a bare one is cream already, as the title plate is,
// and needs no keyline.
const ink = (d) => ({ d, fill: INK });
const pen = (d, w = 4, c = INK) => ({ d, stroke: c, w });
const body = (d, c, w = 3) => ({ d, fill: c, stroke: INK, w });
const tint = (d, c, opacity) => ({ d, fill: c, opacity });
const inner = (m) => ({ ...m, inner: true });

const attrs = (m) => [
  `d="${m.d}"`,
  `fill="${m.fill ?? "none"}"`,
  m.stroke ? `stroke="${m.stroke}" stroke-width="${f(m.w)}" stroke-linecap="round" stroke-linejoin="round"` : "",
  m.dash ? `stroke-dasharray="${m.dash}"` : "",
  m.opacity != null ? `opacity="${m.opacity}"` : ""
].filter(Boolean).join(" ");

/** The same shape, solid in one colour and grown by `grow` on every side: for keylines, shadows and echoes. */
function silhouette(m, colour, grow) {
  const w = (m.stroke ? m.w : 0) + grow * 2;
  const fill = m.fill ? colour : "none";
  const stroke = w > 0 ? ` stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"` : "";
  return `<path d="${m.d}" fill="${fill}"${stroke}/>`;
}

/**
 * Print a list of marks: a cream keyline under every outer mark, a soft ink shadow, an optional coloured echo of the
 * ink (a glyph printed twice, a little apart), then each mark in turn, its colour a hair out of register with its ink.
 */
function print(marks, { echo = null, shadow = true } = {}) {
  const outer = marks.filter((m) => !m.inner);
  const key = outer.filter((m) => !m.bare).map((m) => silhouette(m, PAPER, KEY)).join("");
  const shade = shadow ? `<g opacity=".26" transform="translate(${SHADOW})">${outer.map((m) => silhouette(m, INK, 0)).join("")}</g>` : "";
  const inks = outer.filter((m) => m.fill === INK || (!m.fill && m.stroke === INK));
  const echoed = echo ? `<g transform="translate(${ECHO})">${inks.map((m) => silhouette(m, echo, 0)).join("")}</g>` : "";
  const drawn = marks.map((m) => {
    const coloured = m.fill && m.fill !== INK && m.fill !== PAPER && m.stroke === INK;
    if (!coloured) return `<path ${attrs(m)}/>`;
    // the colour slips off its ink: the colour first, nudged, then the ink line on its true place
    return `<path d="${m.d}" fill="${m.fill}" transform="translate(${OFF})"/><path ${attrs({ ...m, fill: undefined })}/>`;
  }).join("");
  return `<svg viewBox="-8 -8 116 116" xmlns="http://www.w3.org/2000/svg">${key}${shade}${echoed}${drawn}</svg>`;
}

/* ------------------------------------------------------------------------------------------------ glyphs */

/** An exclamation mark drawn with the nib, about 70 tall. */
const bang = (P = AS_IS) => [
  ink(nib(P([53, 12]), P([53.5, 28]), P([51.5, 44]), P([50, 59]), 15 * P.s, 11.5 * P.s, 4.6 * P.s)),
  ink(disc(P([49.6, 75.5]), 7.2 * P.s))
];
/** A question mark drawn with the nib. */
const query = (P = AS_IS) => [
  ink(nib(P([31, 32]), P([29, 8]), P([71, 4]), P([69, 28]), 5.4 * P.s, 11.5 * P.s, 11 * P.s)),
  ink(nib(P([69, 28]), P([67.5, 42]), P([53, 43]), P([52, 59]), 11 * P.s, 9.6 * P.s, 4.6 * P.s)),
  ink(disc(P([51.6, 75.5]), 7.2 * P.s))
];
/** A Z drawn with the nib: top bar, diagonal, foot. */
const zed = ([x, y], size) => {
  const w = size * 0.24;
  return [
    ink(straight([x, y], [x + size, y - size * 0.06], w * 0.7, w * 0.9, w)),
    ink(straight([x + size, y - size * 0.06], [x + size * 0.04, y + size], w, w * 0.8, w * 0.9)),
    ink(straight([x + size * 0.04, y + size], [x + size * 1.08, y + size * 0.96], w * 0.9, w, w * 0.6))
  ];
};

/* ------------------------------------------------------------------------------------------------ the balloon */

// The faces' balloon: an oval with a tail towards the card, which stands below and to the left of the emote.
const B = { cx: 52, cy: 44, rx: 40, ry: 33 };
const onOval = (deg, inset = 0) => [B.cx + (B.rx - inset) * Math.cos(deg * DEG), B.cy + (B.ry - inset) * Math.sin(deg * DEG)];
function balloonPath() {
  const a = onOval(114);
  const b = onOval(146);
  return `M${pt(a)} A${B.rx} ${B.ry} 0 1 0 ${pt(b)} Q20 76 9 93 Q30 84 ${pt(a)} Z`;
}
/** The cream darkening towards the foot of the balloon, as the plate does. */
function footShade() {
  const a = onOval(24, 1.8);
  const b = onOval(108, 1.8);
  return `M${pt(a)} A${f(B.rx - 1.8)} ${f(B.ry - 1.8)} 0 0 1 ${pt(b)} Q${pt(onOval(66, 10))} ${pt(a)} Z`;
}
/** Where a line drawn down from the balloon's top edge, at x, starts. */
const topAt = (x, inset = 3) => B.cy - (B.ry - inset) * Math.sqrt(Math.max(0, 1 - ((x - B.cx) / (B.rx - inset)) ** 2));

const balloon = (opts = {}) => [{ ...body(balloonPath(), PAPER, 3.2), bare: true, ...opts }, inner(tint(footShade(), SHADE, 0.75))];
/** A face in the balloon: its features are inner marks; anything given as `around` spills outside it. */
const face = (features, around = []) => print([...balloon(), ...features.map(inner), ...around]);

// The parts faces are made of. Eyes sit at (37.5, 40) and (66.5, 40); the mouth at (52, 57).
const happyEyes = (h = 10) => [pen(`M31 ${f(40 + h / 4)} Q37.5 ${f(40 - h * 0.85)} 44 ${f(40 + h / 4)}`, 4.4), pen(`M60 ${f(40 + h / 4)} Q66.5 ${f(40 - h * 0.85)} 73 ${f(40 + h / 4)}`, 4.4)];
const lids = (y = 38, tilt = 0) => [pen(`M29 ${f(y - tilt)} L46 ${f(y + tilt)}`, 4.2), pen(`M58 ${f(y + tilt)} L75 ${f(y - tilt)}`, 4.2)];
const halfMoons = (y = 38, look = 0) => [
  ink(`M${f(33 + look)} ${y} A4.6 4.6 0 0 0 ${f(42.2 + look)} ${y} Z`),
  ink(`M${f(62 + look)} ${y} A4.6 4.6 0 0 0 ${f(71.2 + look)} ${y} Z`)
];
const cheeks = (opacity = 0.85) => [tint(oval([29, 52], 7, 4), ROSE, opacity), tint(oval([75, 52], 7, 4), ROSE, opacity)];
const hatch = (cx) => [-5, 0, 5].map((o) => pen(`M${f(cx + o - 2.4)} 55.5 L${f(cx + o + 2.4)} 48.5`, 1.8, LACQUER));

/* ------------------------------------------------------------------------------------------------ the set */

// the gloom cloud and the fume's puffs share one cloud shape: a bottom edge and four bumps
const cloud = (x, y, s) =>
  `M${x} ${y} Q${f(x - 12 * s)} ${f(y)} ${f(x - 12 * s)} ${f(y - 10 * s)} Q${f(x - 12 * s)} ${f(y - 21 * s)} ${f(x + 1 * s)} ${f(y - 21 * s)} Q${f(x + 4 * s)} ${f(y - 32 * s)} ${f(x + 18 * s)} ${f(y - 30 * s)} Q${f(x + 30 * s)} ${f(y - 36 * s)} ${f(x + 38 * s)} ${f(y - 24 * s)} Q${f(x + 50 * s)} ${f(y - 24 * s)} ${f(x + 50 * s)} ${f(y - 12 * s)} Q${f(x + 50 * s)} ${f(y)} ${f(x + 38 * s)} ${f(y)} Z`;
// a thought balloon's edge: bumps round an oval
function thoughtCloud([cx, cy], rx, ry, n = 9) {
  const pts = Array.from({ length: n }, (_, i) => { const a = (-100 + (i * 360) / n) * DEG; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
  let d = `M${pt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const b = pts[(i + 1) % n];
    const r = Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]) * 0.6;
    d += ` A${f(r)} ${f(r)} 0 0 1 ${pt(b)}`;
  }
  return `${d} Z`;
}
// the teacher's red-pencil flower: a spiral, and scallops round it
function petals([cx, cy], r0, n, bulge = 1.12) {
  const at = (deg) => [cx + r0 * Math.cos(deg * DEG), cy + r0 * Math.sin(deg * DEG)];
  const start = -70;
  const r = r0 * Math.sin(Math.PI / n) * bulge;     // each petal a little more than a half circle
  let d = `M${pt(at(start))}`;
  for (let i = 1; i <= n; i++) d += ` A${f(r)} ${f(r)} 0 1 1 ${pt(at(start + (i * 360) / n))}`;
  return d;
}

const heart = moved(place({ r: -10 }), "M50 84 C24 66 12 48 22 32 C31 18 46 21 50 34 C54 21 69 18 78 32 C88 48 76 66 50 84 Z");
const drop = "M60 8 C56 24 29 44 29 62 C29 74 39 83 50 83 C61 83 71 74 71 62 C71 46 64 24 60 8 Z";
const smallDrop = "M86 30 C84 36 78 41 78 46 C78 51 82 54 86 54 C90 54 94 51 94 46 C94 41 88 36 86 30 Z";
const veinPiece = (P, a, q, b) => body(bent(P(a), P(q), P(b), 3.4, 12, 3.4), LACQUER, 2.4);

export const EMOTES = Object.freeze({
  /* faces: the deformed expressions of a corner panel, in the cream balloon */
  laugh: { kind: "face", label: "Laughing", motion: "shake", svg: face([
    ...happyEyes(12),
    ink("M40 50 L64 50 C64 60 58.5 67 52 67 C45.5 67 40 60 40 50 Z"),
    tint("M45 62 C48 58.5 56 58.5 59 62 C56 65.5 48 65.5 45 62 Z", ROSE)
  ], [ink(bent([88, 12], [93, 6], [99, 4], 2, 4.4, 1.6)), ink(bent([92, 24], [98, 22], [104, 24], 2, 4.4, 1.6))]) },
  pleased: { kind: "face", label: "Pleased", motion: "bob", svg: face([
    ...happyEyes(8), pen("M43 54 Q52 62 61 54", 3.8), ...cheeks(0.7)
  ]) },
  smug: { kind: "face", label: "Smug", motion: "tilt", svg: face([
    pen("M29 38.5 Q37.5 35.5 46 38.5", 4), pen("M58 38.5 Q66.5 35.5 75 38.5", 4), ...halfMoons(38.5, 3),
    pen("M60 27 Q67 23 74 26", 3.2),
    pen("M41 55 Q46.5 61 52 55 Q57.5 61 63 55", 3.6)
  ], [body(twinkle([92, 10], 9), GILT, 2)]) },
  blush: { kind: "face", label: "Flustered", motion: "pulse", svg: face([
    ...cheeks(0.95), ...hatch(29), ...hatch(75),
    pen("M31 30 Q36.5 27 42 30", 3), pen("M62 30 Q67.5 27 73 30", 3),
    ink(disc([37.5, 40], 3.6)), ink(disc([66.5, 40], 3.6)),
    pen("M45 58 Q48.5 54.5 52 58 Q55.5 61.5 59 58", 3.4)
  ]) },
  determined: { kind: "face", label: "Fired up", motion: "pulse", svg: face([
    ink(straight([27, 27], [45, 34.5], 3.2, 6.4, 5.4)), ink(straight([77, 27], [59, 34.5], 3.2, 6.4, 5.4)),
    ink(oval([37.5, 43], 4.4, 6.2)), ink(oval([66.5, 43], 4.4, 6.2)),
    tint(disc([39, 40.6], 1.6), GLINT), tint(disc([68, 40.6], 1.6), GLINT),
    pen("M42 59 Q52 55 62 59", 3.8)
  ], [body(twinkle([92, 11], 10.5), GILT, 2.2), body(twinkle([98.5, 30], 5), PAPER, 1.8)]) },
  deadpan: { kind: "face", label: "Unimpressed", motion: "still", svg: face([
    ...lids(38), ...halfMoons(38), pen("M45 58 L59 58", 3.6)
  ]) },
  wince: { kind: "face", label: "Argh!", motion: "shake", svg: face([
    pen("M30 33 L43 40 L30 47", 4.4), pen("M74 33 L61 40 L74 47", 4.4),
    body("M41 52 L63 52 Q66 52 66 55 L66 61 Q66 64 63 64 L41 64 Q38 64 38 61 L38 55 Q38 52 41 52 Z", PAPER, 3),
    pen("M39 58 L65 58", 1.8), pen("M45.5 52.5 L45.5 63.5", 1.6), pen("M52 52.5 L52 63.5", 1.6), pen("M58.5 52.5 L58.5 63.5", 1.6)
  ], [body(smallDrop, SEA, 2.4)]) },
  tear: { kind: "face", label: "Tears", motion: "bob", svg: face([
    ink("M45.5 55 Q52 51 58.5 55 Q59 61 52 61.5 Q45 61 45.5 55 Z")
  ], [
    // two streams that widen as they fall and spill out of the balloon, a drop leaving each
    body("M34.6 39 L40.4 39 C41 50 39.6 60 41.6 70 C43 77 43.6 82 41.6 85.5 Q37.4 89 33.2 85.5 C31.2 82 32.8 77 33.6 70 C34.8 60 34 50 34.6 39 Z", SEA, 2.2),
    body("M63.6 39 L69.4 39 C70 50 68.6 60 70.6 70 C72 77 72.6 82 70.6 85.5 Q66.4 89 62.2 85.5 C60.2 82 61.8 77 62.6 70 C63.8 60 63 50 63.6 39 Z", SEA, 2.2),
    body(disc([27, 94], 2.6), SEA, 1.8), body(disc([77, 95], 2.6), SEA, 1.8),
    pen("M30 36.5 L45 36.5", 4.4), pen("M59 36.5 L74 36.5", 4.4)
  ]) },
  shiver: { kind: "face", label: "Shiver", motion: "shake", svg: face([
    // the blue lines that come down over a face that has gone pale
    ...[32, 42, 52, 62, 72].map((x) => pen(`M${x} ${f(topAt(x) + 1)} L${x} ${f(topAt(x) + 13 - Math.abs(x - 52) / 6)}`, 2.2, DEEP)),
    pen(disc([37.5, 42], 5.4), 2.8), pen(disc([66.5, 42], 5.4), 2.8), ink(disc([37.5, 42.5], 2.1)), ink(disc([66.5, 42.5], 2.1)),
    pen("M40 59 L44 55.5 L48 59 L52 55.5 L56 59 L60 55.5 L64 59", 3)
  ], [ink(bent([95, 30], [99.5, 38], [95, 46], 1.6, 3.6, 1.6)), ink(bent([100.5, 27], [105.5, 38], [100.5, 49], 1.6, 3.4, 1.6))]) },
  dizzy: { kind: "face", label: "Dizzy", motion: "tilt", svg: face([
    pen(spiral([37.5, 40], 1, 8.4, 2.1), 3), pen(spiral([66.5, 40], 1, 8.4, 2.1, 90), 3),
    pen("M40 59 Q44 55 48 59 Q52 63 56 59 Q60 55 64 59", 3.4)
  ], [body(twinkle([86, 5], 8), GILT, 2), body(twinkle([98, 19], 5.5), GILT, 1.8), ink(disc([97, 4], 2))]) },
  ko: { kind: "face", label: "Out cold", motion: "tilt", svg: face([
    pen("M31 34 L43 46 M43 34 L31 46", 4.2), pen("M61 34 L73 46 M73 34 L61 46", 4.2),
    pen(oval([52, 58], 4.6, 3.6), 3.2)
  ]) },

  /* balloons: things said without words */
  ellipsis: { kind: "balloon", label: "…", motion: "bob", svg: print([...balloon(), ...[36, 52, 68].map((x) => inner(ink(disc([x, 45], 4.4))))]) },
  whisper: { kind: "balloon", label: "Psst", motion: "bob", svg: print([
    ...balloon({ dash: "6.5 4.5", w: 2.8 }),
    ...[
      pen("M26 39 L26 62", 3.6), pen(oval([31.5, 45], 5.4, 6.2), 3.6),
      pen("M48 39.5 C45 36.5 39 37.5 39 41.5 C39 46.5 48 44.5 48 49.5 C48 53.5 41 54.5 38 51.5", 3.6),
      pen("M62 39.5 C59 36.5 53 37.5 53 41.5 C53 46.5 62 44.5 62 49.5 C62 53.5 55 54.5 52 51.5", 3.6),
      pen("M70 31 L70 48 C70 52.5 73.5 53 77 50.5", 3.6), pen("M65 39 L77 39", 3.6)
    ].map(inner)
  ]) },
  think: { kind: "balloon", label: "Thinking", motion: "bob", svg: print([
    { ...body(thoughtCloud([54, 38], 37, 27), PAPER, 3), bare: true },
    ...[40, 54, 68].map((x) => inner(tint(disc([x, 40], 3.4), SLATE))),
    { ...body(disc([23, 77], 6.4), PAPER, 2.6), bare: true }, { ...body(disc([12, 91], 4), PAPER, 2.2), bare: true }
  ]) },

  /* marks: what a manga artist draws beside a head */
  surprise: { kind: "mark", label: "Surprise", motion: "shake", svg: print([
    ...bang(place({ dx: -6 })),
    ink(straight([68, 26], [84, 13], 2, 5, 1.6)), ink(straight([72, 44], [92, 42], 2, 5, 1.6)), ink(straight([68, 62], [84, 72], 2, 5, 1.6))
  ], { echo: LACQUER, shadow: false }) },
  question: { kind: "mark", label: "Question", motion: "tilt", svg: print(query(place({ r: 8 })), { echo: BRASS, shadow: false }) },
  shock: { kind: "mark", label: "What?!", motion: "shake", svg: print([...bang(place({ s: 0.84, dx: -18, r: -8 })), ...query(place({ s: 0.84, dx: 16, r: 10 }))], { echo: LACQUER, shadow: false }) },
  sweat: { kind: "mark", label: "Sweat", motion: "drip", svg: print([
    body(drop, SEA, 3.2), inner(pen("M38 58 C37 66 40 72 46 75", 4, GLINT)), body(smallDrop, SEA, 2.4)
  ]) },
  anger: { kind: "mark", label: "Anger", motion: "pulse", svg: (() => {
    const P = place({ s: 0.92, r: -10 });
    return print([
      veinPiece(P, [16, 43], [40, 41], [42, 17]), veinPiece(P, [58, 17], [60, 41], [84, 43]),
      veinPiece(P, [84, 57], [60, 59], [58, 83]), veinPiece(P, [42, 83], [40, 59], [16, 57])
    ]);
  })() },
  sparkle: { kind: "mark", label: "Sparkle", motion: "twinkle", svg: print([
    body(twinkle([45, 55], 36), GILT, 2.6), body(twinkle([81, 19], 14), PAPER, 2.2), body(twinkle([18, 20], 8), PAPER, 2),
    ink(disc([84, 64], 2.6)), ink(disc([70, 86], 1.8))
  ]) },
  heart: { kind: "mark", label: "Fond", motion: "float", svg: print([
    body(heart, LACQUER, 3.2), inner(pen("M29 37 Q30 29 37 27", 4, GLINT)),
    ink(straight([80, 20], [90, 10], 1.6, 4.2, 1.4)), ink(straight([86, 34], [99, 31], 1.6, 4.2, 1.4)), ink(straight([70, 12], [73, 0], 1.6, 4, 1.4))
  ]) },
  music: { kind: "mark", label: "Humming", motion: "float", svg: print([
    ink(oval([30, 75], 9.6, 7, -22)), ink(oval([68, 64], 9.6, 7, -22)),
    ink(straight([38.4, 72], [38.4, 30], 3.6, 3.6, 3.6)), ink(straight([76.4, 61], [76.4, 19], 3.6, 3.6, 3.6)),
    ink("M36.6 24 L78.2 13 L78.2 23 L36.6 34 Z")
  ], { echo: BRASS, shadow: false }) },
  sleep: { kind: "mark", label: "Asleep", motion: "float", svg: print([...zed([14, 74], 13), ...zed([32, 46], 19), ...zed([56, 8], 28)], { echo: SLATE, shadow: false }) },
  gloom: { kind: "mark", label: "Gloom", motion: "fall", svg: print([
    body(cloud(28, 42, 1.24), SLATE, 3),
    inner(pen("M22 32 Q28 28 34 32", 2.4, SHADE)),
    // the rain under it: thin, broken, drawn straight onto the picture with no keyline
    ...[[26, 50, 66], [38, 52, 80], [50, 50, 70], [62, 52, 84], [74, 50, 64], [44, 76, 92], [68, 74, 90]].map(([x, y0, y1]) => inner(pen(`M${x} ${y0} L${x - 1.5} ${y1}`, 2.4, DEEP)))
  ]) },
  idea: { kind: "mark", label: "Idea", motion: "flicker", svg: (() => {
    const rays = [200, 240, 270, 300, 340].map((a) => ink(straight([50 + 34 * Math.cos(a * DEG), 42 + 34 * Math.sin(a * DEG)], [50 + 46 * Math.cos(a * DEG), 42 + 46 * Math.sin(a * DEG)], 4.4, 3.2, 1.4)));
    return print([
      ...rays,
      body("M50 16 C35 16 26 27 26 40 C26 50 31.5 55.5 36 61 L38 70 L62 70 L64 61 C68.5 55.5 74 50 74 40 C74 27 65 16 50 16 Z", GILT, 3.2),
      inner(pen("M35 37 Q36 28 44 24", 4, GLINT)),
      inner(pen("M45 64 L45 54 C45 46 55 46 55 54 L55 64", 2.2, BRASS)),
      body("M38 72 L62 72 L60.5 84 L39.5 84 Z", BRASS, 3), inner(pen("M39 78 L61 78", 2.2)),
      ink(disc([50, 89], 3.8))
    ]);
  })() },
  fume: { kind: "mark", label: "Fuming", motion: "rise", svg: print([
    // the steam of a temper: two puffs blown out of the head, each with its curl, and the streaks behind them
    ink(straight([14, 98], [28, 80], 1, 2.4, 3.2)), ink(straight([24, 100], [36, 86], 1, 2, 2.6)),
    body(thoughtCloud([38, 70], 15, 12, 6), PAPER, 2.6), inner(pen(spiral([38, 71], 1, 6.4, 1.3, 180), 2.4)),
    ink(straight([44, 50], [56, 38], 1, 2.4, 3.2)),
    body(thoughtCloud([70, 30], 21, 17, 7), PAPER, 2.8), inner(pen(spiral([70, 31], 1.2, 9.4, 1.35, 180), 2.8))
  ]) },
  soul: { kind: "mark", label: "Done for", motion: "rise", svg: print([
    body("M47 27 C47 14 59 8 69 11 C80 14 83 29 77 39 C71 49 59 52 51 60 C43 68 41 77 30 86 C31 77 34 71 32 65 C30 57 36 51 42 45 C46 39 47 34 47 27 Z", PAPER, 2.8),
    inner(pen("M56 27 Q59 29.5 62 27", 2.6)), inner(pen("M67 25 Q70 27.5 73 25", 2.6)), inner(pen(oval([65.5, 35], 2.8, 2.2), 2.4)),
    inner(tint("M33 82 C38 76 40 70 44 64 C41 72 38 78 33 82 Z", SEA, 0.9)),
    ink(disc([22, 94], 2.2)), ink(disc([14, 101], 1.5))
  ], { echo: SEA }) },
  star: { kind: "mark", label: "Well done", motion: "pulse", svg: print([
    pen(spiral([50, 50], 2, 17, 1.9), 3.8, LACQUER), pen(petals([50, 50], 27, 6), 3.8, LACQUER)
  ], { shadow: false }) },
  hand: { kind: "mark", label: "Hand up", motion: "wave", svg: print([
    body("M37 92 L37 61 C33 57 26 51 24 45 C22 39 27 35 31 38 L38 45 L38 22 C38 15 44 12 49.5 12.5 C55 12 59 14 60.5 18 C64.5 16 71 18.5 71 25 L71 63 C71 77 66 86 61 92 Z", PAPER, 3.2),
    inner(pen("M49.5 14 L49.5 43", 2.2)), inner(pen("M60.5 19 L60.5 45", 2.2)),
    inner(tint("M60 72 C66 66 70 60 70 50 L70 63 C70 72 66 80 62 86 Z", SHADE)),
    body("M34 88 L64 88 L64 98 L34 98 Z", BRASS, 3),
    ink(straight([78, 16], [88, 8], 1.6, 4, 1.4)), ink(straight([80, 32], [93, 30], 1.6, 4, 1.4))
  ]) },
  bowl: { kind: "mark", label: "Hungry", motion: "bob", svg: print([
    pen("M34 34 Q28 25 34 17 Q40 9 34 1", 3, SLATE), pen("M50 31 Q44 22 50 14 Q56 6 50 -2", 3, SLATE),
    body("M18 52 C22 40 38 33 50 35 C62 33 78 40 82 52 Z", PAPER, 2.6),
    body(straight([64, 44], [95, 14], 4, 4, 3.2), BRASS, 2), body(straight([70, 46], [99, 22], 4, 4, 3.2), BRASS, 2),
    body("M12 51 L88 51 C88 71 74 85 56 87 L44 87 C26 85 12 71 12 51 Z", LACQUER, 3.2),
    inner(pen("M19 60 C36 67 64 67 81 60", 2.6, PAPER)),
    body("M38 87 L62 87 L60 95 L40 95 Z", BRASS, 2.8)
  ]) }
});

/** The order they are offered in: the faces, the balloons, then the marks. */
export const EMOTE_ORDER = Object.freeze([
  "laugh", "pleased", "smug", "blush", "determined", "deadpan", "wince", "tear", "shiver", "dizzy", "ko",
  "ellipsis", "whisper", "think",
  "surprise", "question", "shock", "sweat", "anger", "sparkle", "heart", "music", "sleep", "gloom", "idea", "fume", "soul", "star", "hand", "bowl"
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
    default: break;   // "still": it pops on and stays put
  }
  return { x, y, r, s: s * pop, o: o * out };
}
