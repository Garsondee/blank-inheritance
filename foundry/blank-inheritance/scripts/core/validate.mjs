/**
 * Re-reads what was actually created/derived and compares against what was
 * intended. Never trusts a create() call alone.
 *
 * Pure: takes plain objects in (the created document's own data, already
 * read back by the caller) and plain objects out. No Foundry globals.
 */

function check(checks, label, actual, expected) {
  const pass = actual === expected;
  checks.push({ label, expected, actual, pass });
  return pass;
}

export async function validateActor(created, source, expectedId, entityLabel) {
  const checks = [];
  check(checks, "document id === deterministic hash of source id", created?.id, expectedId);
  check(checks, "name matches source", created?.name, source.name ?? source.id);
  check(checks, "actor type", created?.type, entityLabel === "creature" ? "npc" : "character");
  if (entityLabel === "creature") {
    check(checks, "system.attributes.ac.value matches source", created?.system?.attributes?.ac?.value, source.ac ?? 10);
    check(checks, "system.attributes.hp.max matches source", created?.system?.attributes?.hp?.max, source.hitPoints?.max ?? 1);
    check(checks, "system.details.level.value matches source", created?.system?.details?.level?.value, source.level ?? 0);
  } else {
    check(checks, "system.details.level.value matches source (character)", created?.system?.details?.level?.value, source.level ?? 1);
  }
  return { sourceId: source.id, foundryType: "Actor", entityLabel, expectedId, actualId: created?.id ?? null, checks };
}

export async function validateScene(created, source, expectedId, actorIdBySourceId) {
  const checks = [];
  check(checks, "document id === deterministic hash of source id", created?.id, expectedId);
  check(checks, "name matches source", created?.name, source.name ?? source.id);
  const expectedTokenCount = (source.placements ?? []).filter((p) => actorIdBySourceId[p.actorSourceId]).length;
  check(checks, "token count matches placements", created?.tokens?.size ?? created?.tokens?.length ?? 0, expectedTokenCount);
  for (const placement of source.placements ?? []) {
    const actorId = actorIdBySourceId[placement.actorSourceId];
    if (!actorId) continue;
    const token = created?.tokens?.find?.((t) => t.actorId === actorId) ?? [...(created?.tokens ?? [])].find((t) => t.actorId === actorId);
    check(checks, `token exists for ${placement.actorSourceId} with correct actorId`, Boolean(token), true);
  }
  return { sourceId: source.id, foundryType: "Scene", expectedId, actualId: created?.id ?? null, checks };
}
