/**
 * The Service Agreement's shipping format (induction terminal, page 2).
 *
 * Players must never find the agreement as plain text: not on the page (it is drawn on a canvas, see
 * foundry/induction-agreement-view.mjs) and not in the module's files on the server. So the build
 * (tools/induction-agreement/build.mjs) ships one opaque asset: the document's JSON, deflated, then
 * XORed with a seeded keystream, then base64. This is obfuscation, not security -- anyone determined can
 * reverse it from this file -- but it defeats "open the module file and paste it into a chatbot",
 * which is the whole brief (Ingram, 2026-09-25: "do our best to make it so that the text can't be
 * copied and pasted").
 *
 * Pure: no Foundry globals, no Node built-ins, no DOM. Compression is the caller's job (zlib in the
 * build, DecompressionStream in the browser), so this file runs unchanged in both.
 */

export const FORMAT = "bi-agreement/1";
const KEY_SEED = 0x1b5eed17;

/** mulberry32 -- a tiny seeded PRNG, used here only as a keystream. */
function* keystream(seed) {
  let a = seed >>> 0;
  for (;;) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    yield ((t ^ (t >>> 14)) >>> 0) & 0xff;
  }
}

/** XOR is its own inverse: the same call scrambles and unscrambles. Returns a new array. */
export function scramble(bytes, seed = KEY_SEED) {
  const out = new Uint8Array(bytes.length);
  const ks = keystream(seed);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ ks.next().value;
  return out;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (b === undefined ? "=" : B64[(n >> 6) & 63]) + (c === undefined ? "=" : B64[n & 63]);
  }
  return out;
}

export function base64ToBytes(text) {
  const clean = String(text).replace(/[^A-Za-z0-9+/=]/g, "");
  const pad = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const out = new Uint8Array((clean.length / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) |
      ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    if (o < out.length) out[o++] = (n >> 16) & 0xff;
    if (o < out.length) out[o++] = (n >> 8) & 0xff;
    if (o < out.length) out[o++] = n & 0xff;
  }
  return out;
}

/** Wraps an already-compressed payload for shipping. The first line is a format tag, the rest base64. */
export function pack(compressedBytes) {
  const b64 = bytesToBase64(scramble(compressedBytes));
  return `${FORMAT}\n${b64.replace(/.{1,76}/g, "$&\n")}`;
}

/** The inverse of pack(): returns the still-compressed bytes. Throws on a wrong or missing format tag. */
export function unpack(text) {
  const nl = String(text).indexOf("\n");
  const tag = nl < 0 ? String(text) : String(text).slice(0, nl);
  if (tag.trim() !== FORMAT) throw new Error(`Not a ${FORMAT} file (got "${tag.slice(0, 40)}")`);
  return scramble(base64ToBytes(String(text).slice(nl + 1)));
}

/** Utf-8 helpers that work in both Node 18+ and browsers. */
export const encodeUtf8 = (s) => new TextEncoder().encode(s);
export const decodeUtf8 = (b) => new TextDecoder().decode(b);
