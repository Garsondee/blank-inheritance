/**
 * The rig's own test files, made from nothing (no real art, nobody's portrait): small PNGs a seat may choose for a file input, and two
 * that are deliberately not images, for the seat whose job is to choose the wrong thing. Written to tools/playtest/assets/, which is
 * the only folder the `upload` verb will take a file from.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

/** An 8-bit RGB PNG from a function (x, y) -> [r, g, b]. */
export function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}

export function makeImages(dir = here) {
  mkdirSync(dir, { recursive: true });
  const files = {
    // A tall 2:3-ish portrait with a clear subject, so a crop is easy to judge: a warm gradient and a pale oval.
    "portrait-1.png": png(800, 1200, (x, y) => {
      const dx = (x - 400) / 230;
      const dy = (y - 470) / 300;
      const inside = dx * dx + dy * dy < 1;
      return inside ? [236, 214, 190] : [40 + Math.round((y / 1200) * 120), 70 + Math.round((x / 800) * 90), 120];
    }),
    // Square, with a checker that shows if a crop was stretched.
    "portrait-2.png": png(1000, 1000, (x, y) => (((x >> 6) + (y >> 6)) & 1 ? [200, 90, 70] : [60, 60, 90])),
    "tiny.png": png(32, 32, (x, y) => [x * 8, y * 8, 128]),
    "wide.png": png(3000, 800, (x, y) => [Math.round((x / 3000) * 255), 100, Math.round((y / 800) * 255)])
  };
  for (const [name, data] of Object.entries(files)) writeFileSync(path.join(dir, name), data);
  // Not images, on purpose: the wrong thing to choose.
  writeFileSync(path.join(dir, "not-an-image.png"), "This is text pretending to be a picture.\n");
  writeFileSync(path.join(dir, "notes.txt"), "A plain text file.\n");
  return [...Object.keys(files), "not-an-image.png", "notes.txt"];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) console.log(`made: ${makeImages().join(", ")}`);
