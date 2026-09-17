/**
 * Pure shaping for the Director's Party tab — a GM-glance roster of every
 * actor on `game.actors.party` (sf2e's own real Party actor and its
 * `.members` collection, confirmed live 2026-09-17 rather than inventing a
 * scene-token scan — a PC not currently placed on the viewed scene must
 * still show up here, which a token scan would miss).
 *
 * Input is a plain array already extracted by foundry/party.mjs; nothing
 * here touches Foundry globals.
 */

import { hpStatus } from "./sheet-model.mjs";

/** One roster row: name/portrait plus the handful of numbers a GM actually glances at mid-scene. */
export function partyRow(member = {}) {
  const hp = hpStatus(member.hp);
  return {
    id: member.id,
    name: member.name ?? "",
    img: member.img ?? null,
    level: member.level ?? null,
    hp,
    ac: Number(member.ac ?? 10),
    perception: Number(member.perception ?? 0),
    conditions: (member.conditions ?? []).map((c) => ({ slug: c.slug, label: c.label ?? c.slug, value: c.value ?? null }))
  };
}

/**
 * The whole Party tab: rows plus a summary a GM can read without scanning
 * every row — how many are hurt, how many are down, so a busy table
 * doesn't hide the one PC who actually needs attention.
 */
export function partyOverview(members = []) {
  const rows = members.map(partyRow);
  const anyDown = rows.some((r) => r.hp.tier === "down");
  const anyCritical = rows.some((r) => r.hp.tier === "critical" || r.hp.tier === "down");
  const anyHurt = rows.some((r) => r.hp.tier !== "ok");
  return {
    rows,
    summary: { count: rows.length, anyDown, anyCritical, anyHurt }
  };
}
