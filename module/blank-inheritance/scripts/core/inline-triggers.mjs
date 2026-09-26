/**
 * Inline scene-runner triggers — buttons embedded mid-sentence in a beat's
 * authored `text`/`readAloud`, sitting at the exact word in the prose where
 * the GM should press them, per design/scene-triggers-and-depth.md §2.
 *
 * THE SYNTAX
 * ----------
 *   "readAloud": "Taka arrives <trig id=\"taka-enters\"/> and claims the table."
 *
 * Deliberately matching core/redact.mjs's own `<redact c="n">` tag shape
 * rather than inventing a new bracket style, for the same reasons that
 * pipeline already ruled out the alternatives: `{{...}}` collides with
 * Handlebars (even though the raw string is never re-parsed by it, a future
 * reader would reasonably assume it might be) and `[[...]]` collides with
 * Foundry's own inline-roll syntax. Self-closing rather than an open/close
 * pair, because a trigger wraps nothing — unlike `<redact>`, there is no
 * hidden inner content to protect.
 *
 * WHERE THIS DIFFERS FROM redact.mjs ON PURPOSE
 * `redactHtml` fails LOUDLY UNSAFE on a problem (an unprocessed `<redact>`
 * tag throws, because the alternative is leaking a secret to a player).
 * A trigger has no secret to leak, so an unrecognised id here fails LOUDLY
 * VISIBLE instead — rendered as literal `⚠ trig:unknown-id` text — matching
 * the existing `gmTool` convention (scene-runner.mjs) that a typo in
 * authored data should be obvious from looking at the panel, never a dead
 * click discovered mid-scene.
 *
 * `text`/`readAloud` are otherwise still plain prose, not HTML like a
 * handout `body` is — every character outside a recognised `<trig>` tag is
 * escaped exactly as the field already renders today (`{{text}}`, a plain
 * Handlebars double-stache). This function only ever ADDS the one new
 * capability; it never opens the field up to arbitrary markup.
 *
 * Pure module: no Foundry globals. See design/testing-strategy.md §1.
 */

import { applyEmphasis } from "./emphasis.mjs";

const TRIG_TAG = /<trig\s+id=["']([a-z0-9-]+)["']\s*\/>/gi;
const ANY_TRIG_OPEN = /<trig\b/i;

/**
 * One entry per `triggers[].kind` (data/schema/scene-brief.schema.json).
 * `key` selects one of the Scene Runner's OWN existing semantic tokens
 * (`--sr-good`/`--sr-info`/`--sr-warn`, bi-components.css) — the same ones
 * `.bi-runner__stamp--insight`/`--tool` already use, not the separate
 * glass-panel `.bi-key--*` vocabulary (visual-identity.md §3f), which is
 * the wrong register and weight for a chip sitting inline in a paragraph.
 * `glyph` is the shape that carries what the colour alone can't (an enter
 * and an exit share `good`, distinguished only by arrow direction).
 */
export const TRIGGER_KIND_META = Object.freeze({
  "npc-enter": { key: "good", glyph: "▸" },
  "npc-exit": { key: "good-dim", glyph: "◂" },
  "reveal-handout": { key: "info", glyph: "▤" },
  "post-check": { key: "info", glyph: "⟳" },
  "gm-tool": { key: "warn", glyph: "⚙" },
  note: { key: "neutral", glyph: "•" }
});

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

/**
 * One `<button>` for a recognised trigger. `beatId` is threaded through only
 * to qualify the DOM dataset — trigger `id`s are scoped to their own beat,
 * the same scoping `checkRef` already uses inside a `challengeRef`.
 */
function renderTriggerChip(trigger, beatId) {
  const meta = TRIGGER_KIND_META[trigger.kind] ?? TRIGGER_KIND_META.note;
  const label = trigger.label ?? trigger.id;
  return (
    `<button type="button" class="bi-trig bi-trig--${meta.key}" data-action="fireTrigger" ` +
    `data-beat-id="${escapeAttr(beatId)}" data-trigger-id="${escapeAttr(trigger.id)}" ` +
    `title="${escapeAttr(label)}"><span class="bi-trig__glyph" aria-hidden="true">${meta.glyph}</span> ${escapeHtml(label)}</button>`
  );
}

/**
 * Turn one `text`/`readAloud` string into safe, renderable HTML, splicing in
 * a real chip for every recognised `<trig id="..."/>` token.
 *
 * Returns `{ html, used, unknownIds }`:
 *   - `html` — ready for a triple-stache render (`{{{decoratedText}}}`).
 *   - `used` — ids of triggers actually found in this string, in order.
 *   - `unknownIds` — ids referenced in the text but absent from `triggers`,
 *     a real authoring error worth surfacing at build/test time even though
 *     the rendered panel already shows it loudly.
 *
 * `triggers` may be omitted or empty — a beat with no `triggers[]` array
 * simply renders every `<trig>` token (there should be none) as unknown,
 * and ordinary prose with no tokens at all passes through unchanged but for
 * HTML-escaping, exactly matching today's `{{text}}` behaviour.
 */
export function decorateInlineTriggers(text, triggers = [], beatId = "") {
  const source = String(text ?? "");
  const byId = new Map((triggers ?? []).map((t) => [t.id, t]));
  const used = [];
  const unknownIds = [];

  let html = "";
  let lastIndex = 0;
  TRIG_TAG.lastIndex = 0;
  let match;
  while ((match = TRIG_TAG.exec(source)) !== null) {
    const [full, id] = match;
    html += applyEmphasis(escapeHtml(source.slice(lastIndex, match.index)));
    const trigger = byId.get(id);
    if (trigger) {
      used.push(id);
      html += renderTriggerChip(trigger, beatId);
    } else {
      unknownIds.push(id);
      html += `<span class="bi-trig bi-trig--error" role="img" aria-label="Unknown trigger">⚠ trig:${escapeHtml(id)}</span>`;
    }
    lastIndex = match.index + full.length;
  }
  html += applyEmphasis(escapeHtml(source.slice(lastIndex)));

  return { html, used, unknownIds };
}

/** True if `text` contains a well-formed `<trig id="..."/>` tag at all — the cheap pre-check before bothering to decorate a field that has none. */
export function hasInlineTriggers(text) {
  return ANY_TRIG_OPEN.test(String(text ?? ""));
}

/**
 * Every trigger `id` a beat's `text`/`readAloud` actually reference, across
 * both fields, de-duplicated. Used by the authoring-time corpus test to
 * catch an authored `triggers[]` entry nobody's prose ever places (dead
 * data — the reverse of `unknownIds` above, and just as real a bug).
 */
export function referencedTriggerIds(beat) {
  const ids = new Set();
  for (const field of [beat?.text, beat?.readAloud]) {
    if (!field) continue;
    TRIG_TAG.lastIndex = 0;
    let match;
    while ((match = TRIG_TAG.exec(String(field))) !== null) ids.add(match[1]);
  }
  return [...ids];
}
