/**
 * The Scene Runner's objective chips (design/objectives.md §5, D057).
 *
 * One trigger kind, `objective`, with five acts: give it, tick a part, reveal a part, strike one out, close it. The
 * Runner's dispatcher hands every `objective` chip here; this file asks what must be asked and calls the store.
 *
 *   give    always asks first (doctrine Law 17: confirm anything the players will see), then files the page and
 *           sounds a soft cue on every client. A second press says it is already given and changes nothing.
 *   close   asks for the paragraph the Record keeps, with the authored suggestion already in the box, then closes it
 *           with the same soft cue. The GM writes what happened, not what was predicted.
 *   tick, reveal, strike   no question: the GM pressed the chip at the moment it happened. Nothing for a tick
 *           (D057 §9: a sound on give and close only).
 *
 * Returns true when something changed, so the Runner logs only what really happened.
 */

import { actOnObjective, giveObjective, loadAuthored, pageForObjective } from "./objectives-store.mjs";

const CUE = "sounds/notify.wav";
const CUE_VOLUME = 0.35;
const L = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** The soft cue, on every client: Foundry's own interface channel, so each player's own volume setting still rules. */
function playCue() {
  try {
    foundry.audio.AudioHelper.play({ src: CUE, volume: CUE_VOLUME, autoplay: true, loop: false, channel: "interface" }, true);
  } catch (err) {
    console.warn("Blank Inheritance | Could not sound the objective cue:", err);
  }
}

/** One connected player, for an objective given to one character. */
async function pickPlayer() {
  const players = game.users.filter((u) => u.active && !u.isGM);
  if (!players.length) {
    ui.notifications.warn(L("BLANKINHERITANCE.Objectives.Runner.NoPlayers"));
    return null;
  }
  const options = players.map((u) => `<option value="${u.id}">${esc(u.character?.name ?? u.name)} (${esc(u.name)})</option>`).join("");
  const id = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("BLANKINHERITANCE.Objectives.Runner.PickPlayer") },
    content: `<p>${esc(L("BLANKINHERITANCE.Objectives.Runner.PickPlayerHint"))}</p><select name="user">${options}</select>`,
    ok: { callback: (event, button) => button.form.elements.user.value }
  }).catch(() => null);
  const user = id ? game.users.get(id) : null;
  return user ? { userId: user.id, name: user.character?.name ?? user.name } : null;
}

async function give(id, scene) {
  const doc = await loadAuthored(id);
  if (!doc) {
    ui.notifications.warn(L("BLANKINHERITANCE.Objectives.Runner.Missing", { id }));
    return false;
  }
  if (pageForObjective(id)) {
    ui.notifications.info(L("BLANKINHERITANCE.Objectives.Runner.AlreadyGiven", { title: doc.title }));
    return false;
  }
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: L("BLANKINHERITANCE.Objectives.Runner.GiveTitle") },
    content: `<p>${L("BLANKINHERITANCE.Objectives.Runner.GiveConfirm", { title: `<strong>${esc(doc.title)}</strong>`, giver: esc(doc.giver?.name) })}</p>`
  }).catch(() => false);
  if (!ok) return false;
  const owner = doc.scope === "character" ? await pickPlayer() : null;
  if (doc.scope === "character" && !owner) return false;
  const result = await giveObjective(id, { scene, owner });
  if (result?.created) playCue();
  return Boolean(result?.created);
}

async function close(id, scene) {
  const doc = await loadAuthored(id);
  const record = await foundry.applications.api.DialogV2.prompt({
    window: { title: L("BLANKINHERITANCE.Objectives.Runner.CloseTitle", { title: doc?.title ?? id }) },
    position: { width: 560 },
    content:
      `<p>${esc(L("BLANKINHERITANCE.Objectives.Runner.CloseHint"))}</p>` +
      `<textarea name="record" rows="7" style="width:100%;font-family:var(--bi-font-document, serif)">${esc(doc?.suggestedRecord ?? "")}</textarea>`,
    ok: { label: L("BLANKINHERITANCE.Objectives.Runner.CloseOk"), callback: (event, button) => button.form.elements.record.value }
  }).catch(() => null);
  if (record === null) return false;
  const next = await actOnObjective(id, "close", { scene, record });
  if (next) playCue();
  return Boolean(next);
}

/** The dispatcher's one entry point. */
export async function runObjectiveTrigger(trigger, { scene = null } = {}) {
  const { act, objectiveRef: id, partRef } = trigger ?? {};
  if (!game.user.isGM || !id) return false;
  if (act === "give") return give(id, scene);
  if (!pageForObjective(id)) {
    ui.notifications.warn(L("BLANKINHERITANCE.Objectives.Runner.NotGiven"));
    return false;
  }
  if (act === "close") return close(id, scene);
  if (!["tick", "reveal", "strike"].includes(act)) return false;
  const next = await actOnObjective(id, act, { partId: partRef, scene });
  if (!next) ui.notifications.info(L("BLANKINHERITANCE.Objectives.Runner.NoChange"));
  return Boolean(next);
}
