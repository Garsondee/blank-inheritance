/**
 * The Approvals Desk's play-sequence set (design/approvals-desk.md §1/§4,
 * issue #169) -- what actually needs Ingram's review, ordered the way the
 * table will actually reach it. Pure: takes an already-loaded `catalog` of
 * plain objects (no Foundry globals, no filesystem) and returns an array of
 * "shifts" -- one per scene that still has something drafted in it.
 *
 * THE RULE THAT MAKES THIS DIFFERENT FROM A GENERIC DEPENDENCY GRAPH
 * (Ingram, 2026-09-18): play sequence is the ONLY axis, for both the sort
 * order and the inclusion test. Something is in this set if and only if it
 * is reachable by walking forward from an episode's own scenes[] -- never
 * because something ELSE drafted names it in `dependsOn` (that stays a
 * safety flag shown ON an already-included item, per promote()'s own
 * dependency check, issue #168 -- never a reason to include one here), never
 * because it's referenced in prose anywhere. An item with no path back to a
 * scheduled scene is not deprioritized; it is not in this set at all.
 *
 * Filtered to `authoring.status === "drafted"` specifically -- not
 * "needs-lore" (that belongs to Claude's own out-tray, design/
 * approvals-desk.md §6 -- a queue pointed at Claude, not Ingram) and not
 * "sound"/"final" (already graded, nothing left for the Desk to do).
 *
 * Scoped deliberately narrow on kid/Frame participants: a challenge's
 * `participants` may name a kid/Frame id, but PCs are collaborative,
 * player-authored content reviewed with the real player, not GM-drafted
 * content the Desk grades -- so this only resolves `participants` against
 * NPCs. Flagged here rather than silently decided, since it's a real
 * judgment call and not obviously the only right one.
 */

const DRAFTED = "drafted";

function isDrafted(entity) {
  return entity?.authoring?.status === DRAFTED;
}

function episodeSortKey(episode) {
  return episode.dayRange?.start ?? Number.POSITIVE_INFINITY;
}

export function computePlaySequenceSet(catalog) {
  const {
    episodes = [],
    sceneBriefs = {},
    encounters = {},
    challenges = {},
    subsystems = {},
    npcs = {},
    locations = {},
    creatures = {},
    sceneSetByBriefRef = {}
  } = catalog;

  const seen = new Set();
  const shifts = [];
  let order = 0;

  const sortedEpisodes = [...episodes].sort((a, b) => episodeSortKey(a) - episodeSortKey(b));

  for (const episode of sortedEpisodes) {
    const scenes = [...(episode.scenes ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const scene of scenes) {
      const items = [];
      const include = (type, id, entity) => {
        if (!id) return;
        const key = `${type}:${id}`;
        if (seen.has(key)) return; // already cleared into an earlier, higher-priority shift
        if (!entity || !isDrafted(entity)) return; // unresolved, or not actually awaiting the Desk
        seen.add(key);
        items.push({ type, id, authoring: entity.authoring });
      };

      const sceneId = scene.id ?? `scene-${scene.order}`;
      include("episode-scene", sceneId, scene);

      if (scene.encounterRef) {
        const encounter = encounters[scene.encounterRef];
        include("encounter", scene.encounterRef, encounter);
        for (const creature of encounter?.creatures ?? []) {
          if (creature.creatureRef) include("creature", creature.creatureRef, creatures[creature.creatureRef]);
        }
      }

      for (const challengeId of scene.challengeRefs ?? []) {
        const challenge = challenges[challengeId];
        include("challenge", challengeId, challenge);
        for (const participant of challenge?.participants ?? []) {
          if (npcs[participant]) include("npc", participant, npcs[participant]);
        }
      }

      if (scene.subsystemRef) include("subsystem", scene.subsystemRef, subsystems[scene.subsystemRef]);

      const brief = scene.briefRef ? sceneBriefs[scene.briefRef] : null;
      for (const castMember of brief?.cast ?? []) {
        if (castMember.npcRef) include("npc", castMember.npcRef, npcs[castMember.npcRef]);
      }
      for (const beat of brief?.beats ?? []) {
        if (beat.challengeRef) include("challenge", beat.challengeRef, challenges[beat.challengeRef]);
        if (beat.encounterRef) include("encounter", beat.encounterRef, encounters[beat.encounterRef]);
        if (beat.subsystemRef) include("subsystem", beat.subsystemRef, subsystems[beat.subsystemRef]);
      }

      const sceneSetEntry = scene.briefRef ? sceneSetByBriefRef[scene.briefRef] : null;
      if (sceneSetEntry?.locationRef) include("location", sceneSetEntry.locationRef, locations[sceneSetEntry.locationRef]);

      if (items.length > 0) {
        order += 1;
        shifts.push({
          order,
          episodeId: episode.id,
          episodeTitle: episode.title ?? episode.id,
          sceneId,
          sceneTitle: scene.title ?? sceneId,
          items
        });
      }
    }
  }

  return shifts;
}

/** Flattens computePlaySequenceSet's shifts into one ordered item list, for a caller that just wants a count or a flat queue rather than the shift grouping. */
export function flattenPlaySequenceSet(shifts) {
  return shifts.flatMap((shift) =>
    shift.items.map((item) => ({ ...item, episodeId: shift.episodeId, sceneId: shift.sceneId, shiftOrder: shift.order }))
  );
}
