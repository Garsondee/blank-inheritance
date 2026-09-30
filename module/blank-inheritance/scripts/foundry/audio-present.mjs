/**
 * What a musical marker actually puts on screen — design/audio-system.md §5.4.
 *
 * Each client calls this at ITS OWN playback position of the track, not when
 * the GM's copy reached the beat, so a reveal lands on the same note on every
 * screen even though every browser started the track a fraction of a second
 * apart (foundry/audio-director.mjs#delayForSync).
 *
 * The content travels with the reveal rather than being granted in advance:
 * nothing reaches a player's browser until the moment it lands (doctrine
 * Law 11 — redaction is removal, not hiding).
 */

import { showNotice } from "./sting.mjs";

/** core/notices.mjs's own kinds. An unknown one would throw inside the queue. */
const NOTICE_KINDS = new Set(["info", "caution", "alert"]);

/** Foundry's own image popout, opened locally — no permissions, no broadcast, exact timing. */
function showImage({ src, title }) {
  if (!src) return;
  new foundry.applications.apps.ImagePopout({ src, window: { title: title ?? "" } }).render({ force: true });
}

// A cue's handout used to arrive here too, as a PAPER card built from the
// brief's raw body. Since 2026-09-26 a handout is filed in the players' Papers
// on the GM's side instead (foundry/audio-director.mjs#presentHandout ->
// foundry/handouts.mjs), so no handout body is ever broadcast to clients.

/**
 * Present one payload on this client. Never throws: a reveal that fails must
 * not take the music down with it.
 */
export function presentLocally(payload) {
  try {
    switch (payload?.kind) {
      case "banner":
        return showNotice(NOTICE_KINDS.has(payload.noticeKind) ? payload.noticeKind : "info", payload.text);
      case "image":
        return showImage(payload);
      default:
        console.warn(`Blank Inheritance | Unknown audio presentation "${payload?.kind}"`);
        return null;
    }
  } catch (err) {
    console.error(`Blank Inheritance | Could not present ${payload?.kind}:`, err);
    return null;
  }
}
