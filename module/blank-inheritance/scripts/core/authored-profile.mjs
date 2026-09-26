/**
 * Turning an authored `socialProfile` from `data/npcs/*.json` into the shape
 * the intel vault stores.
 *
 * WHY THIS EXISTS. `design/npc-social-intel.md` designed the Character Card,
 * `npc.schema.json` grew a `socialProfile` field, `foundry/social-store.mjs`
 * built the vault and `foundry/character-card.mjs` built the window. Then
 * nothing connected them: `social-store.mjs`'s own doc comment says the
 * authored side "is generated from `data/npcs/*.json` by the sync pipeline",
 * and that step was never written. Nine NPCs carried real Facts that no GM
 * could ever see.
 *
 * This is that step's pure half — what the vault should hold, given an NPC
 * record. The adapter (`foundry/sync.mjs`) does the writing.
 *
 * THE ONE RULE WORTH STATING. A Fact's `revealed` flag is TABLE STATE, not
 * authored content: it records that a specific group learned something on a
 * specific night. The repo is the source of truth for the Facts themselves and
 * must never be the source of truth for whether they are known. So a re-sync
 * carries the text, the trigger and the attitude, and preserves whatever the
 * vault already knows about what has been revealed.
 *
 * Pure module: no Foundry globals. See design/testing-strategy.md §1.
 */

/**
 * @param {object|null} npc an NPC record from data/npcs/*.json
 * @param {object|null} existing whatever the vault already holds for this actor
 * @returns {object|null} the profile to store, or null if this NPC has none
 */
export function authoredProfileFromNpc(npc, existing = null) {
  const profile = npc?.socialProfile;
  if (!profile) return null;

  const facts = Array.isArray(profile.facts) ? profile.facts : [];
  if (!facts.length && !profile.attitude) return null;

  // What the table already learned, keyed by fact id.
  const known = new Map(
    (existing?.facts ?? []).filter((f) => f?.id).map((f) => [f.id, f])
  );

  return {
    // Attitude is authored as a STARTING attitude. If the vault has one, the
    // table has been shifting it with real Diplomacy checks and the repo does
    // not get to reset that.
    attitude: existing?.attitude ?? profile.attitude ?? "indifferent",
    facts: facts
      .filter((f) => f?.id && f?.text)
      .map((f) => {
        const prior = known.get(f.id);
        return {
          id: f.id,
          text: f.text,
          revealTrigger: f.revealTrigger ?? null,
          // Table state, never authored state. A Fact authored as
          // `revealed: true` is a mistake the corpus test already catches; if
          // one gets through, it still must not silently un-hide itself here.
          revealed: prior?.revealed === true,
          revealedNote: prior?.revealedNote ?? null
        };
      })
  };
}

/**
 * Every NPC record in `npcs` that has a profile worth storing, as
 * `[sourceId, profile]` pairs. Used by the sync pipeline to walk a batch.
 */
export function authoredProfiles(npcs, existingFor = () => null) {
  const out = [];
  for (const npc of npcs ?? []) {
    const profile = authoredProfileFromNpc(npc, existingFor(npc?.id));
    if (profile) out.push([npc.id, profile]);
  }
  return out;
}
