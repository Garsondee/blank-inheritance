/**
 * Minimal PNG encoder (truecolour, 8-bit, no interlacing).
 *
 * Written rather than depended on because this project's testing strategy is
 * explicit about zero runtime dependencies, and a PNG writer over Node's
 * built-in zlib is about sixty lines. It also earns its place twice: the
 * hillshade layer inside the SVG needs it now, and the Foundry raster bake in
 * stage 4 will need exactly the same encoder later.
 *
 * Why raster at all, in a vector-first generator: shaded relief is inherently a
 * per-pixel computation, and faking it with vector bands looks like a 1970s
 * atlas. The map that results is the classical cartographic composition —
 * continuous-tone relief underneath, crisp vector linework and type on top —
 * which is both the most legible and, for a 1950s setting, the most period-
 * appropriate way to draw it.
 */

import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/**
 * Encode RGB pixel data as a PNG.
 *
 * @param {Uint8Array} rgb    width * height * 3 bytes.
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
export function encodePNG(rgb, width, height) {
  if (rgb.length !== width * height * 3) {
    throw new Error(`encodePNG: expected ${width * height * 3} bytes, got ${rgb.length}`);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = truecolour RGB
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type. Filter 1 (Sub) predicts
  // each byte from the pixel to its left, which compresses shaded relief
  // markedly better than no filtering — neighbouring pixels in a hillshade are
  // nearly always close in value.
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 1; // Sub
    const src = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= 3 ? rgb[src + x - 3] : 0;
      raw[rowStart + 1 + x] = (rgb[src + x] - left) & 0xff;
    }
  }

  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Encode straight to a data URI, for embedding in a self-contained SVG. */
export function encodePNGDataURI(rgb, width, height) {
  return `data:image/png;base64,${encodePNG(rgb, width, height).toString('base64')}`;
}
