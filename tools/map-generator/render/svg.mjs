/**
 * Compose a terrain model into a self-contained SVG map.
 *
 * The classical cartographic stack, bottom to top: continuous-tone shaded
 * relief as an embedded raster, then vector linework, then type. Vector-first
 * is not an aesthetic preference here — it is what makes the map a campaign
 * asset instead of a picture. Text stays real text, zoom is free at every
 * scale, and a crater carved out mid-campaign is a geometric operation on
 * shapes rather than a paint-over.
 *
 * Coordinates are grid units throughout, so every vector layer aligns exactly
 * with the raster underneath without a transform anywhere.
 */

import { encodePNGDataURI } from './png.mjs';
import { renderRelief } from './hillshade.mjs';

const fmt = (n) => (Math.round(n * 100) / 100).toString();

function pathOf(points, close = false) {
  if (!points.length) return '';
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 1; i < points.length; i++) d += `L${fmt(points[i][0])} ${fmt(points[i][1])}`;
  if (close) d += 'Z';
  return d;
}

/** True if a polyline's ends coincide — i.e. it is a closed ring. */
function isClosed(points) {
  const a = points[0];
  const b = points[points.length - 1];
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
}

export function renderSVG(terrain, opts = {}) {
  const {
    showContours = true,
    showBathymetry = true,
    showRivers = true,
    showGraticule = true,
    showAnnotations = true,
    showAnalysis = false,
    title = 'UNNAMED COAST',
    subtitle = null,
  } = opts;

  const { meta, coastline, contours, rivers, harbours, mouths, stats } = terrain;
  const { width, height, metresPerCell } = meta;

  const relief = renderRelief(terrain, opts);
  const reliefURI = encodePNGDataURI(relief.rgb, relief.width, relief.height);

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 2}" height="${height * 2}" font-family="Georgia, 'Times New Roman', serif">`
  );

  parts.push(`<title>${escapeXML(title)}</title>`);
  parts.push(`<desc>Procedurally generated coastline. Seed ${meta.seed}. ${fmt((width * metresPerCell) / 1000)} km across at ${metresPerCell} m per cell.</desc>`);

  // --- Shaded relief -------------------------------------------------------
  parts.push(
    `<image href="${reliefURI}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>`
  );

  // --- Bathymetric contours ------------------------------------------------
  if (showBathymetry && contours.sea.length) {
    parts.push(`<g fill="none" stroke="#20486b" stroke-linejoin="round" stroke-linecap="round">`);
    for (const { depth, lines } of contours.sea) {
      const major = depth >= 50;
      parts.push(
        `<g stroke-width="${major ? 0.42 : 0.26}" opacity="${major ? 0.42 : 0.26}">` +
          lines.map((l) => `<path d="${pathOf(l, isClosed(l))}"/>`).join('') +
          `</g>`
      );
    }
    parts.push(`</g>`);
  }

  // --- Topographic contours ------------------------------------------------
  if (showContours && contours.land.length) {
    parts.push(`<g fill="none" stroke="#5a4a32" stroke-linejoin="round" stroke-linecap="round">`);
    for (const { lines, major } of contours.land) {
      parts.push(
        `<g stroke-width="${major ? 0.4 : 0.22}" opacity="${major ? 0.4 : 0.24}">` +
          lines.map((l) => `<path d="${pathOf(l, isClosed(l))}"/>`).join('') +
          `</g>`
      );
    }
    parts.push(`</g>`);
  }

  // --- Rivers --------------------------------------------------------------
  // Drawn in three width classes rather than per-segment, so the SVG carries
  // three paths instead of thousands of individually-stroked lines.
  if (showRivers && rivers.length) {
    const classes = [
      { min: 0.0, max: 0.12, w: 0.35, op: 0.55 },
      { min: 0.12, max: 0.34, w: 0.75, op: 0.75 },
      { min: 0.34, max: Infinity, w: 1.7, op: 0.92 },
    ];
    parts.push(`<g fill="none" stroke="#2f6f96" stroke-linecap="round" stroke-linejoin="round">`);
    for (const c of classes) {
      const d = rivers
        .filter((s) => s.strength >= c.min && s.strength < c.max)
        .map((s) => `M${fmt(s.from[0])} ${fmt(s.from[1])}L${fmt(s.to[0])} ${fmt(s.to[1])}`)
        .join('');
      if (d) parts.push(`<path d="${d}" stroke-width="${c.w}" opacity="${c.op}"/>`);
    }
    parts.push(`</g>`);
  }

  // --- Coastline -----------------------------------------------------------
  // The single most important line on the map, so it gets a pale halo beneath
  // it: against dark water AND against pale sand, one flat stroke loses contrast
  // on one side or the other.
  const coastPaths = coastline.map((l) => `<path d="${pathOf(l, isClosed(l))}"/>`).join('');
  parts.push(`<g fill="none" stroke-linejoin="round" stroke-linecap="round">`);
  parts.push(`<g stroke="#f2efe4" stroke-width="1.25" opacity="0.5">${coastPaths}</g>`);
  parts.push(`<g stroke="#17303f" stroke-width="0.55" opacity="0.92">${coastPaths}</g>`);
  parts.push(`</g>`);

  // --- Analysis overlay ----------------------------------------------------
  if (showAnalysis) {
    parts.push(`<g>`);
    for (const h of harbours.slice(0, 10)) {
      parts.push(
        `<circle cx="${fmt(h.x)}" cy="${fmt(h.y)}" r="3.2" fill="none" stroke="#c8452f" stroke-width="0.6" opacity="0.85"/>`
      );
    }
    for (const m of mouths.slice(0, 8)) {
      parts.push(
        `<rect x="${fmt(m.x - 2.4)}" y="${fmt(m.y - 2.4)}" width="4.8" height="4.8" fill="none" stroke="#e0a020" stroke-width="0.6" opacity="0.9"/>`
      );
    }
    parts.push(`</g>`);
  }

  // --- Graticule -----------------------------------------------------------
  if (showGraticule) {
    const stepM = 1000; // One kilometre.
    const step = stepM / metresPerCell;
    const lines = [];
    for (let x = step; x < width; x += step) lines.push(`M${fmt(x)} 0V${height}`);
    for (let y = step; y < height; y += step) lines.push(`M0 ${fmt(y)}H${width}`);
    parts.push(
      `<path d="${lines.join('')}" fill="none" stroke="#1b1b1b" stroke-width="0.12" opacity="0.13"/>`
    );
  }

  // --- Cartouche, scale bar, north arrow -----------------------------------
  if (showAnnotations) {
    parts.push(cartouche(terrain, { title, subtitle, width, height, stats }));
  }

  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#1b1b1b" stroke-width="1.2" opacity="0.55"/>`);
  parts.push(`</svg>`);

  return parts.join('\n');
}

function cartouche(terrain, { title, subtitle, width, height, stats }) {
  const { meta } = terrain;
  const m = meta.metresPerCell;
  const km = 2;
  const barLen = (km * 1000) / m;
  const pad = 10;
  const boxW = Math.max(150, barLen + 40);
  const boxH = 62;
  const x = pad;
  const y = height - boxH - pad;

  const sub = subtitle ?? `seed ${meta.seed} · ${fmt((width * m) / 1000)} × ${fmt((height * m) / 1000)} km · ${m} m/cell`;

  return `<g>
  <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" fill="#f4f1e6" opacity="0.88" stroke="#1b1b1b" stroke-width="0.5"/>
  <text x="${x + 9}" y="${y + 17}" font-size="10" letter-spacing="1.6" fill="#1b1b1b">${escapeXML(title)}</text>
  <text x="${x + 9}" y="${y + 29}" font-size="5.4" fill="#4a4436">${escapeXML(sub)}</text>
  <text x="${x + 9}" y="${y + 38}" font-size="5.4" fill="#4a4436">${escapeXML(
    `relief ${Math.round(stats.elevationAboveSea.max - meta.seaLevel)} m · deepest ${Math.round(stats.deepest)} m · coast ${fmt(stats.coastlineLengthKm)} km`
  )}</text>
  <g transform="translate(${x + 9}, ${y + 47})">
    <rect x="0" y="0" width="${barLen / 2}" height="3.2" fill="#1b1b1b"/>
    <rect x="${barLen / 2}" y="0" width="${barLen / 2}" height="3.2" fill="#f4f1e6" stroke="#1b1b1b" stroke-width="0.4"/>
    <text x="0" y="11" font-size="4.6" fill="#1b1b1b">0</text>
    <text x="${barLen - 6}" y="11" font-size="4.6" fill="#1b1b1b">${km} km</text>
  </g>
  <g transform="translate(${width - 26}, ${y + 12})" fill="#1b1b1b">
    <path d="M0 22 L0 2 M0 2 L-4 9 M0 2 L4 9" stroke="#1b1b1b" stroke-width="1" fill="none"/>
    <text x="-3.2" y="30" font-size="7">N</text>
  </g>
</g>`;
}

function escapeXML(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
}
