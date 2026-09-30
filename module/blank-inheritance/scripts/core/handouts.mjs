/**
 * Handouts: what the table is handed, and what it keeps.
 *
 * Ingram, 2026-09-26: "the GM can press a button and it appears as a journal
 * for the group to examine it in depth and whenever we do that we also make it
 * so that this journal now is public to the players. This is a process we'll
 * do lots throughout the adventure, anything that players find and might want
 * to refer to later."
 *
 * So one press is two acts. It SHOWS the document (it opens on their screens
 * now) and it FILES it (it sits in their Papers folder for the rest of the
 * campaign, readable, never editable). Before this, a reveal was transient by
 * design and only an artefact was kept; that split is gone, because anything
 * worth putting in front of the table is worth letting them read again.
 *
 * This module decides everything about both acts as plain data: which pages
 * exist, what each one says, who may read each one, and whose screen each one
 * opens on. foundry/handouts.mjs carries the plan out and decides nothing.
 *
 * THE MARKUP. A handout body is HTML with two campaign-specific tags, both
 * turned into ordinary spans here, BEFORE anything reaches Foundry. That order
 * is not a style choice: Foundry's server runs every HTML field through
 * cleanHTML (dist/database/validators.mjs, allowlist in common/constants.mjs
 * ALLOWED_HTML_TAGS), which drops unknown tags and keeps their text. A tag
 * that slipped through would not fail loudly there; it would quietly publish
 * whatever was inside it. So an unprocessed tag in the output is a hard error
 * here, the same rule core/redact.mjs already enforces for <redact>.
 *
 *   <redact c="2">…</redact>   the existing clearance pipeline (core/redact.mjs)
 *   <typed>…</typed>           text struck on a typewriter, not printed
 *   <typed machine="admissions">…</typed>
 *                              …on a particular machine, with its own fault
 *   <typed field="character" fallback="Candidate"/>
 *                              the reader's own character's name, typed into
 *                              the gap on their copy
 *
 * Pure module: no Foundry globals (design/testing-strategy.md §1).
 */

import { redactHtml, assertNoUnprocessedRedactions } from "./redact.mjs";

/**
 * Mirrors CONST.DOCUMENT_OWNERSHIP_LEVELS (foundryvtt common/constants.mjs),
 * which a core module may not import. The values are Foundry's and are
 * checked against it by the handout contract test.
 */
export const OWNERSHIP = Object.freeze({ INHERIT: -1, NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 });

/**
 * The one folder every handed-over document lands in, so a player looking for
 * "that letter from the first night" has exactly one place to look. Named for
 * what it is in the fiction: a character's own papers.
 */
export const PAPERS_FOLDER = Object.freeze({ name: "Papers", seed: "folder-papers" });

/**
 * Typewriters with known broken letters, by the office that owns them.
 *
 * A machine's faults are a real, repeatable fingerprint: every document it
 * types carries them, which is exactly how a period document gets traced to a
 * desk. The first one is canon (The Road In's holdInReserve, 2026-09-10): the
 * machine that typed every acceptance letter strikes its lower-case e low and
 * faint. `faults` is the broken lower-case letters, as a string. Add a machine
 * here the day a document needs one; a <typed machine> naming a machine not
 * listed is a data bug and throws.
 *
 * The damage itself is not drawn by us (Ingram, 2026-09-26: a damaged
 * typewriter font, "so that you can have some variation when you need it
 * without having to invent it yourself"). Each broken letter is set in one of
 * FAULT_VARIANTS cuts of TT2020 Style F, a real misstruck typewriter face,
 * taken in turn, so the same broken letter never prints identically twice in
 * a row. Only the low strike (a bent typebar) is ours.
 */
export const TYPEWRITERS = Object.freeze({
  admissions: Object.freeze({ faults: "e" })
});

/** How many damaged cuts the font pipeline builds (tools/font-pipeline/fonts.json, "TT2020 Fault n"). */
export const FAULT_VARIANTS = 3;

/** The fields a `<typed field="…"/>` may ask for, filled per reader. */
export const HANDOUT_FIELDS = Object.freeze(["character"]);

const TYPED_ATTRIBUTES = new Set(["field", "fallback", "machine"]);
const TYPED_FILLED = /<typed\b([^>]*?)\/>/g;
const TYPED_BLOCK = /<typed\b([^>]*)>([\s\S]*?)<\/typed\s*>/g;
const ANY_TYPED = /<\/?typed\b/i;
const ENTITY = /(&#?[a-zA-Z0-9]+;)/;

function escapeText(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function parseAttributes(raw, where) {
  const attrs = {};
  const source = String(raw ?? "");
  const pair = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
  let consumed = source;
  for (const [whole, name, value] of source.matchAll(pair)) {
    if (!TYPED_ATTRIBUTES.has(name)) throw new Error(`handout: ${where} has an unknown attribute "${name}"`);
    attrs[name] = value;
    consumed = consumed.replace(whole, "");
  }
  if (consumed.trim()) throw new Error(`handout: ${where} has attributes that are not name="value" pairs: "${consumed.trim()}"`);
  return attrs;
}

function machineFor(name, where) {
  if (name === undefined) return null;
  const machine = TYPEWRITERS[name];
  if (!machine) throw new Error(`handout: ${where} names typewriter "${name}", which core/handouts.mjs TYPEWRITERS does not list`);
  return { name, ...machine };
}

/**
 * Strike already-escaped text on a machine. Entities are passed through whole,
 * so a fault letter inside `&eacute;` never splits the entity. `counter` is
 * shared across one whole document, so the damaged cuts keep rotating from
 * one typed run to the next rather than restarting at every gap.
 */
function strike(escapedText, machine, counter) {
  const faults = machine?.faults ?? "";
  const struck = !faults
    ? escapedText
    : escapedText
        .split(ENTITY)
        .map((part) =>
          ENTITY.test(part)
            ? part
            : [...part]
                .map((ch) => {
                  if (!faults.includes(ch)) return ch;
                  counter.n += 1;
                  const variant = ((counter.n - 1) % FAULT_VARIANTS) + 1;
                  return `<span class="bi-typed__fault bi-typed__fault--${variant}">${ch}</span>`;
                })
                .join("")
        )
        .join("");
  const data = machine ? ` data-machine="${machine.name}"` : "";
  return `<span class="bi-typed"${data}>${struck}</span>`;
}

/**
 * Render a handout body for one reader.
 *
 * `fields` holds that reader's own values (`{ character: "…" }`); `clearance`
 * is theirs too, and defaults to 0 so a forgotten one over-censors rather
 * than leaks, the same default core/redact.mjs chose.
 */
export function renderHandoutBody(body, { fields = {}, clearance = 0, salt = "" } = {}) {
  let html = redactHtml(String(body ?? ""), clearance, { salt }).html;
  const counter = { n: 0 };

  html = html.replace(TYPED_FILLED, (_whole, raw) => {
    const where = "a <typed …/> field";
    const attrs = parseAttributes(raw, where);
    if (!attrs.field) throw new Error(`handout: ${where} with no field="…" (did you mean <typed>…</typed>?)`);
    if (!HANDOUT_FIELDS.includes(attrs.field)) throw new Error(`handout: <typed field="${attrs.field}"/> is not a known field (${HANDOUT_FIELDS.join(", ")})`);
    const value = String(fields[attrs.field] ?? "").trim() || attrs.fallback;
    if (!value) throw new Error(`handout: <typed field="${attrs.field}"/> has no value for this reader and no fallback="…"`);
    return strike(escapeText(value), machineFor(attrs.machine, where), counter);
  });

  html = html.replace(TYPED_BLOCK, (_whole, raw, inner) => {
    const where = "a <typed> block";
    const attrs = parseAttributes(raw, where);
    if (attrs.field || attrs.fallback) throw new Error(`handout: field="…" belongs on a self-closing <typed field="…"/>, not a <typed> block`);
    if (/[<>]/.test(inner)) throw new Error(`handout: <typed> may only hold plain text, found markup inside: "${inner.trim().slice(0, 40)}"`);
    return strike(inner, machineFor(attrs.machine, where), counter);
  });

  if (ANY_TYPED.test(html)) {
    throw new Error("handout: an unprocessed <typed> tag reached the output (unclosed, or malformed). Foundry would strip the tag and publish its contents bare.");
  }
  assertNoUnprocessedRedactions(html);
  return html;
}

/**
 * Whether a body carries its own heading, as every PAPER document does. A
 * Foundry page title printed above a letterhead is two titles on one sheet, so
 * those pages are filed with the page title hidden.
 */
export function hasOwnHeading(body) {
  return /class="[^"]*\bbi-paper\b/.test(String(body ?? ""));
}

/** Repo-side seeds for the module's deterministic ids (core/ids.mjs deriveFoundryId). */
export function handoutEntrySeed(handoutId) {
  // The same seed the scene runner has always used, so an entry made by an
  // earlier build is found and reused rather than duplicated.
  return `handout-${handoutId}`;
}

export function handoutPageSeed(handoutId, pageKey) {
  return `handout-${handoutId}-page-${pageKey}`;
}

/**
 * Never lower anyone. Filing only ever adds readers: a document already open
 * to the whole table stays open when it is later shown to one player, and a
 * player who has a page keeps it when somebody else is given theirs. There is
 * no way to un-hand something, on purpose (the scene runner's artefact grant
 * says why: un-showing what people have read is not a thing software can do).
 */
export function mergeOwnership(current = {}, grants = {}) {
  const merged = { ...current };
  for (const [key, level] of Object.entries(grants)) {
    const existing = merged[key];
    merged[key] = existing === undefined || existing === OWNERSHIP.INHERIT ? level : Math.max(existing, level);
  }
  return merged;
}

/**
 * Who a handout reaches, and what each of them gets.
 *
 * `players` is every non-GM user as `{ id, name, characterName, active }`;
 * `audience` is "table" or the ids of the players it goes to. The result:
 *
 *   recipients  the players it is filed for
 *   entry       the journal entry: its name and the ownership to MERGE in
 *   pages       one shared page, or one private page per recipient
 *   show        which page opens on whose screen, now (connected players only)
 *
 * A `personal` handout gives every recipient their own copy, readable by them
 * alone, with their character's name typed into any `<typed field>` gap. The
 * entry is opened to each recipient rather than to the table, so a player who
 * joins later does not see an empty journal before their copy exists.
 */
export function planHandout(handout, { audience = "table", players = [] } = {}) {
  if (!handout?.id) throw new Error("handout: planHandout needs a handout with an id");
  const toTable = audience === "table";
  const wanted = toTable ? null : new Set(Array.isArray(audience) ? audience : [audience]);
  const recipients = players.filter((p) => toTable || wanted.has(p.id));
  const title = handout.title ?? handout.id;
  const base = handout.pageName ?? title;
  const isImage = Boolean(handout.imagePath);
  const hideTitle = isImage || hasOwnHeading(handout.body);

  const pageFor = (key, name, fields, ownership = null) => ({
    key,
    seed: handoutPageSeed(handout.id, key),
    name,
    type: isImage ? "image" : "text",
    src: isImage ? handout.imagePath : null,
    content: isImage ? null : renderHandoutBody(handout.body ?? "", { fields, salt: `${handout.id}:${key}` }),
    showTitle: !hideTitle,
    ownership
  });

  let pages;
  let grants;
  let show;
  if (handout.personal) {
    pages = recipients.map((p) =>
      pageFor(p.id, `${base} — ${p.characterName || p.name}`, { character: p.characterName }, { default: OWNERSHIP.NONE, [p.id]: OWNERSHIP.OBSERVER })
    );
    grants = Object.fromEntries(recipients.map((p) => [p.id, OWNERSHIP.OBSERVER]));
    show = recipients.filter((p) => p.active).map((p) => ({ pageKey: p.id, userIds: [p.id] }));
  } else {
    pages = [pageFor("shared", base, {})];
    grants = toTable ? { default: OWNERSHIP.OBSERVER } : Object.fromEntries(recipients.map((p) => [p.id, OWNERSHIP.OBSERVER]));
    const watching = recipients.filter((p) => p.active).map((p) => p.id);
    show = watching.length ? [{ pageKey: "shared", userIds: watching }] : [];
  }

  return {
    handoutId: handout.id,
    title,
    toTable,
    personal: Boolean(handout.personal),
    recipients: recipients.map((p) => p.id),
    entry: { seed: handoutEntrySeed(handout.id), name: title, grants },
    pages,
    show
  };
}

/**
 * Who a filed handout is open to, read back off the entry's own ownership --
 * the journal is the record, so the panel can never disagree with it.
 */
export function filedAudience(ownership = {}, playerIds = []) {
  const table = (ownership.default ?? OWNERSHIP.NONE) >= OWNERSHIP.OBSERVER;
  const userIds = playerIds.filter((id) => table || (ownership[id] ?? OWNERSHIP.NONE) >= OWNERSHIP.OBSERVER);
  return { table, userIds, filed: table || userIds.length > 0 };
}
