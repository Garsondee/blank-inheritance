/**
 * Handouts, carried out: file it in their Papers, then open it on their screens.
 *
 * core/handouts.mjs decides everything (which pages, what each says, who may
 * read each, whose screen each opens on); this file only turns that plan into
 * Foundry documents, in an order that means a player is never shown a page
 * they cannot read:
 *
 *   1. confirm, because anything the players will see gets one (doctrine Law 17)
 *   2. the Papers folder, made once
 *   3. the journal entry, its ownership only ever widened (mergeOwnership)
 *   4. the pages: one shared, or one private copy per player
 *   5. show each page to the players it belongs to, and to nobody else
 *
 * Every id is deterministic (core/ids.mjs), so pressing the button twice, or
 * re-running it after the brief changes, updates the same documents in place
 * rather than leaving a second copy in anyone's Papers.
 *
 * Foundry facts this leans on, checked against the v14 source rather than
 * remembered (foundryvtt/Foundry Virtual Tabletop/resources/app):
 * - client/documents/collections/journal.mjs Journal.show(doc, {force, users}):
 *   with `users` the server relays to those users' sockets only
 *   (dist/database/documents/journal.mjs); the showing GM's own client also
 *   renders it, from the ack callback.
 * - common/abstract/document.mjs getUserLevel(): a page's own ownership wins;
 *   INHERIT (a page's default) defers to its entry. So a page owned
 *   {default: NONE, [player]: OBSERVER} is private inside an entry the whole
 *   group can open, which is what makes "own copy, private" possible.
 * - client/documents/journal-entry.mjs: an entry is listed in a player's
 *   sidebar only at OBSERVER or above.
 * - dist/database/validators.mjs cleanHTML: every page's HTML is sanitised on
 *   the server, which is why core renders every campaign tag to plain spans
 *   first (see core/handouts.mjs's header).
 */

import { contentHash, deriveFoundryId } from "../core/ids.mjs";
import { OWNERSHIP, PAPERS_FOLDER, filedAudience, handoutEntrySeed, mergeOwnership, planHandout } from "../core/handouts.mjs";
import { documentEditFilename, documentEditSnapshot, editedSinceWritten, pageWords } from "../core/foundry-edits.mjs";
import { writeStorageJson } from "./io.mjs";

const MODULE_ID = "blank-inheritance";

/** Every non-GM user, in the shape core/handouts.mjs plans for. */
export function handoutPlayers() {
  return game.users
    .filter((u) => !u.isGM)
    .map((u) => ({ id: u.id, name: u.name, characterName: u.character?.name ?? null, active: Boolean(u.active) }));
}

function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function sameOwnership(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => a[k] === b[k]);
}

/** The one folder every handed-over document lands in, found by its deterministic id. */
export async function ensurePapersFolder() {
  const id = await deriveFoundryId(PAPERS_FOLDER.seed);
  const existing = game.folders.get(id);
  if (existing) return existing;
  return Folder.create(
    { _id: id, name: PAPERS_FOLDER.name, type: "JournalEntry", sorting: "m", flags: { [MODULE_ID]: { papers: true } } },
    { keepId: true }
  );
}

async function upsertEntry(plan, folder) {
  const id = await deriveFoundryId(plan.entry.seed);
  const existing = game.journal.get(id);
  if (!existing) {
    return JournalEntry.create(
      {
        _id: id,
        name: plan.entry.name,
        folder: folder?.id ?? null,
        ownership: mergeOwnership({ default: OWNERSHIP.NONE }, plan.entry.grants),
        // sourceId is what earlier builds of the scene runner wrote; kept so
        // anything still reading it finds these entries too.
        flags: { [MODULE_ID]: { sourceId: plan.handoutId, handout: { id: plan.handoutId } } }
      },
      { keepId: true }
    );
  }
  const patch = {};
  const ownership = mergeOwnership(existing.ownership ?? {}, plan.entry.grants);
  if (!sameOwnership(ownership, existing.ownership)) patch.ownership = ownership;
  if (folder && (existing.folder?.id ?? existing.folder) !== folder.id) patch.folder = folder.id;
  if (existing.name !== plan.entry.name) patch.name = plan.entry.name;
  if (Object.keys(patch).length) await existing.update(patch);
  return existing;
}

function pageData(page, id, handoutId) {
  const data = {
    _id: id,
    name: page.name,
    type: page.type,
    title: { show: page.showTitle, level: 1 },
    flags: { [MODULE_ID]: { handout: { id: handoutId, key: page.key } } }
  };
  if (page.type === "image") data.src = page.src;
  else data.text = { content: page.content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML };
  if (page.ownership) data.ownership = page.ownership;
  return data;
}

async function upsertPages(entry, plan) {
  const ids = new Map();
  const creates = [];
  const updates = [];
  const kept = [];
  for (const page of plan.pages) {
    const id = await deriveFoundryId(page.seed);
    ids.set(page.key, id);
    const data = pageData(page, id, plan.handoutId);
    const existing = entry.pages.get(id);
    if (!existing) {
      creates.push(data);
      continue;
    }
    // The brief is the source: name, content and picture are rewritten from
    // it every time, so an edited letter reaches the table on the next press
    // (and a letter Ingram rewrote in the Scene Runner's edit sheet is part
    // of the brief). EXCEPT a page she has edited here, in Foundry, since it
    // was last filed: her words are kept, never rewritten from the scene
    // (design/scene-edits.md §7). Ownership is merged either way.
    const update = { _id: id };
    if (editedSinceWritten(await contentHash(pageWords(existing)), existing.getFlag?.(MODULE_ID, "filedHash"))) {
      kept.push(existing);
    } else {
      Object.assign(update, { name: data.name, title: data.title });
      if (data.text) update.text = data.text;
      if (data.src) update.src = data.src;
    }
    if (page.ownership) {
      const ownership = mergeOwnership(existing.ownership ?? {}, page.ownership);
      if (!sameOwnership(ownership, existing.ownership)) update.ownership = ownership;
    }
    if (Object.keys(update).length > 1) updates.push(update);
  }
  if (creates.length) await entry.createEmbeddedDocuments("JournalEntryPage", creates, { keepId: true });
  if (updates.length) await entry.updateEmbeddedDocuments("JournalEntryPage", updates);

  // A fingerprint of the words each page now holds, taken from what Foundry
  // stored (its server cleans HTML on the way in, so a fingerprint of what was
  // SENT would never match), so an edit made here later is recognised.
  for (const id of ids.values()) {
    const stored = entry.pages.get(id);
    if (stored && !kept.includes(stored)) await stored.setFlag?.(MODULE_ID, "filedHash", await contentHash(pageWords(stored)));
  }
  if (kept.length) await keepEditedHandout(plan, kept);
  return new Map([...ids].map(([key, id]) => [key, entry.pages.get(id)]));
}

/**
 * A handout she has edited in Foundry: say it was kept, and file her words
 * into storage/ for tools/scene-edits to bring home, where I fold them into
 * the scene's handout by hand. Never fails the handout itself.
 */
async function keepEditedHandout(plan, pages) {
  ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.HandoutKept", { title: plan.title }));
  try {
    const snapshot = documentEditSnapshot({
      kind: "handout",
      sourceId: plan.handoutId,
      name: plan.title,
      words: pages.map(pageWords),
      at: new Date().toISOString()
    });
    await writeStorageJson("", documentEditFilename("handout", plan.handoutId), snapshot);
  } catch (err) {
    console.error(`Blank Inheritance | Kept your edits to "${plan.title}", but could not file a copy for Claude:`, err);
  }
}

function describeAudience(plan, players) {
  if (plan.toTable) return game.i18n.localize("BLANKINHERITANCE.Runner.Everyone");
  const names = plan.recipients.map((id) => players.find((p) => p.id === id)?.name ?? "?");
  return names.join(", ");
}

/**
 * Hand a document to the table, or to some of it: file it in their Papers for
 * good, then open it on their screens. `audience` is "table" or a list of user
 * ids. Returns whether it was actually handed over -- false for a cancelled
 * confirm, nobody to give it to, or an error -- so a caller that logs the
 * press (the scene runner's triggers) can tell a real handout from a GM who
 * backed out.
 */
export async function fileHandout(handout, { audience = "table", confirm = true } = {}) {
  const players = handoutPlayers();
  let plan;
  try {
    plan = planHandout(handout, { audience, players });
  } catch (err) {
    // A malformed body is an authoring bug. Say so, and hand over nothing:
    // a half-rendered document in front of six players is worse than a GM
    // reading it aloud for once.
    console.error(`Blank Inheritance | Handout "${handout?.id}" could not be rendered:`, err);
    ui.notifications.error(String(err?.message ?? err));
    return false;
  }
  if (!plan.recipients.length) {
    ui.notifications.warn(game.i18n.localize("BLANKINHERITANCE.Runner.NoPlayersToFile"));
    return false;
  }

  const who = describeAudience(plan, players);
  if (confirm) {
    const hint = plan.personal ? "BLANKINHERITANCE.Runner.RevealConfirmPersonal" : "BLANKINHERITANCE.Runner.RevealConfirmHint";
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("BLANKINHERITANCE.Runner.Reveal") },
      content: `<p>${game.i18n.format("BLANKINHERITANCE.Runner.RevealConfirm", { title: escape(plan.title), who: escape(who) })}</p>
                <p><em>${game.i18n.localize(hint)}</em></p>`
    }).catch(() => false);
    if (!confirmed) return false;
  }

  try {
    const folder = await ensurePapersFolder();
    const entry = await upsertEntry(plan, folder);
    const pages = await upsertPages(entry, plan);
    const { Journal } = foundry.documents.collections;
    for (const { pageKey, userIds } of plan.show) {
      const page = pages.get(pageKey);
      if (page && userIds.length) await Journal.show(page, { force: true, users: userIds });
    }
    ui.notifications.info(game.i18n.format("BLANKINHERITANCE.Runner.Filed", { title: plan.title, who }));
    return true;
  } catch (err) {
    console.error(`Blank Inheritance | Could not hand over "${plan.title}":`, err);
    ui.notifications.error(String(err?.message ?? err));
    return false;
  }
}

/**
 * Whether each of these handouts is already in the players' Papers, read off
 * the journal itself rather than a separate record, so the panel can never
 * claim something was handed over that was not.
 */
export async function handoutStates(handouts = []) {
  const playerIds = handoutPlayers().map((p) => p.id);
  const states = {};
  for (const handout of handouts) {
    const entry = game.journal.get(await deriveFoundryId(handoutEntrySeed(handout.id)));
    states[handout.id] = entry ? filedAudience(entry.ownership ?? {}, playerIds) : { table: false, userIds: [], filed: false };
  }
  return states;
}
