/**
 * The portrait a plain Player cannot save for themselves, and how it reaches someone who can.
 *
 * Page 6 of the induction terminal crops a photo and uploads it into the module's storage so it can
 * be the character's portrait. Foundry's server refuses that upload for anyone without the world
 * permission FILES_UPLOAD ("User [...] does not have permission to upload files", dist/server/views/
 * upload.mjs), and a plain Player does not have it by default, so on a stock world the step failed
 * for every real player, with an error notice and a console error. The playtest rig found it on both
 * of its scripted players that chose a portrait, 2026-10-06 (design/playtest-process.md §12.5).
 *
 * The cure is the one Page 9 already uses for the same kind of gap (Actor creation is refused to a
 * Player as well): the player's client hands the work to the GM's client, which may do it, over the
 * module's socket. Nothing about the world's permissions changes, which is why it is not simply
 * granted: players could then put any file anywhere they can browse.
 *
 * This file is the part with no Foundry in it: how the image travels (base64 in a plain message) and
 * what the GM's side is willing to write. The GM's client writes whatever a connected client sends
 * it, so the one thing it must not do is trust the message: only the module's own portrait names,
 * only WebP and PNG, only bytes that really begin like those, only up to a size, and never a path.
 * The adapter that sends and answers is foundry/induction-relay.mjs.
 */

export const PORTRAIT_UPLOAD_REQUEST = "induction-portrait-upload-request";
export const PORTRAIT_UPLOAD_RESULT = "induction-portrait-upload-result";

/** A cropped portrait is 512 x 768 (core/induction-portrait.mjs): well under this even as a PNG. */
export const MAX_PORTRAIT_BYTES = 2 * 1024 * 1024;

/** `writeStorageFile("", filename, ...)` straight into storage/: the terminal's own names (`portrait-<randomID>.<ext>`) and no others. */
export const PORTRAIT_FILENAME = /^portrait-[A-Za-z0-9]{8,32}\.(webp|png)$/;

const EXTENSION_OF = Object.freeze({ "image/webp": "webp", "image/png": "png" });

/** What the player is told when no GM's client answered in time. */
export const NO_GM_FOR_PORTRAIT = "No GM appears to be online to save this picture. Ask your GM to log in and try the photo again, or go on without a portrait: your GM can add one later.";

/** Bytes to base64 text without a spread of the whole array (a long one overflows the call stack). */
export function bytesToBase64(bytes) {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

export function base64ToBytes(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Whether the bytes begin the way a file of that extension must: a PNG signature, or a RIFF container holding WEBP. */
function beginsLike(extension, bytes) {
  if (extension === "png") return bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((b, i) => bytes[i] === b);
  const at = (offset, text) => [...text].every((ch, i) => bytes[offset + i] === ch.charCodeAt(0));
  return bytes.length >= 12 && at(0, "RIFF") && at(8, "WEBP");
}

const refuse = (reason) => ({ ok: false, reason });

/**
 * What the GM's client is willing to write for a message it was sent: ok with the decoded bytes, or the reason it
 * is not. Never throws, whatever it is given.
 */
export function checkPortraitUploadRequest(payload) {
  if (!payload || typeof payload !== "object") return refuse("The portrait request was empty.");
  const { requestId, filename, mimeType, data } = payload;
  if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(requestId)) return refuse("The portrait request had no usable id.");
  const extension = EXTENSION_OF[mimeType];
  if (!extension) return refuse("A portrait has to be a WebP or a PNG picture.");
  if (typeof filename !== "string" || !PORTRAIT_FILENAME.test(filename) || !filename.endsWith(`.${extension}`)) return refuse("That is not a name a portrait may be saved under.");
  if (typeof data !== "string" || data.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return refuse("The picture's data could not be read.");
  if (data.length > Math.ceil((MAX_PORTRAIT_BYTES * 4) / 3) + 4) return refuse("That picture is too big to be a portrait.");
  let bytes;
  try {
    bytes = base64ToBytes(data);
  } catch {
    return refuse("The picture's data could not be read.");
  }
  if (bytes.length === 0 || bytes.length > MAX_PORTRAIT_BYTES) return refuse("That picture is too big to be a portrait.");
  if (!beginsLike(extension, bytes)) return refuse(`That is not really a ${extension.toUpperCase()} picture.`);
  return { ok: true, requestId, filename, mimeType, bytes };
}

/**
 * The message a player's client sends the GM's. Checked by the same rules the GM's side will apply, so a picture that
 * would be refused is refused here, where the player can be told why, instead of after the wait.
 * @throws {Error} with the reason, when the GM's side would refuse it
 */
export function buildPortraitUploadRequest({ requestId, userId, filename, mimeType, bytes }) {
  const payload = { type: PORTRAIT_UPLOAD_REQUEST, requestId, userId, filename, mimeType, data: bytesToBase64(bytes) };
  const checked = checkPortraitUploadRequest(payload);
  if (!checked.ok) throw new Error(checked.reason);
  return payload;
}
