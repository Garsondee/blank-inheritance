/**
 * The party, read off the live sheets for the Scene Runner -- the Foundry
 * half of core/runner-party.mjs (2026-10-04).
 *
 * Plain data out, nothing kept: hit points, Hero Points, conditions and item
 * names are read fresh on every render, so the party strip and a carry-in's
 * names can never disagree with the sheets they came from.
 */

import { partyActors } from "./fight-setup.mjs";

/** The user who plays this character: whoever has it assigned, else its first non-GM owner. */
function playerOf(actor) {
  const assigned = game.users?.find((u) => !u.isGM && u.character?.id === actor.id);
  if (assigned) return assigned;
  return game.users?.find((u) => !u.isGM && actor.testUserPermission?.(u, "OWNER")) ?? null;
}

function conditionsOf(actor) {
  const active = actor.conditions?.active ?? [];
  return active.map((c) => {
    const value = c.system?.value?.value ?? (typeof c.system?.value === "number" ? c.system.value : null);
    return { slug: c.slug, label: value ? `${c.name} ${value}` : c.name };
  });
}

/** One record per party member, for core/runner-party.mjs. */
export function partyMemberRecords() {
  return partyActors().map((actor) => {
    const hp = actor.system?.attributes?.hp ?? null;
    const hero = actor.system?.resources?.heroPoints ?? null;
    return {
      actorId: actor.id,
      userId: playerOf(actor)?.id ?? null,
      name: actor.name,
      img: actor.img ?? null,
      hp: hp ? { value: Number(hp.value) || 0, max: Number(hp.max) || 0 } : null,
      heroPoints: Number.isFinite(Number(hero?.value)) ? Number(hero.value) : null,
      conditions: conditionsOf(actor),
      itemNames: actor.items?.contents?.map((item) => item.name) ?? []
    };
  });
}
