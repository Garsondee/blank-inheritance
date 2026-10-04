// The objectives rule, checked over canon (design/objectives.md §2, D057).
//
// An objective is given by someone in the world, in their own words, from their side, with every part marked required
// or optional. Here that becomes things a machine can check: the giver is in the scene that gives it (or the paper it
// came on is), their quoted words are really in that scene, every part is marked, every required part is ticked or
// struck somewhere, a hidden part is revealed somewhere, it is closed somewhere, nothing happens before it is given,
// a direct order states its cost, and an episode gives no more than four group objectives.

export const OBJECTIVE_KINDS = ["order", "request", "own"];
export const OBJECTIVE_SCOPES = ["group", "character"];
export const PART_NEEDS = ["required", "optional"];
export const MOTIVATIONS = ["knowledge", "comfort", "reputation", "serenity", "protection", "conquest", "wealth", "ability", "equipment"];
export const QUARTERS = ["morning", "afternoon", "evening", "night"];
export const OBJECTIVE_ACTS = ["give", "tick", "reveal", "strike", "close"];
export const FACTIONS = ["directorate", "neutral", "party"];
/** Ingram, 2026-10-04: "we won't do anything silly like an objective per scene". */
export const MAX_GROUP_OBJECTIVES_PER_EPISODE = 4;

/** Every string anywhere in a value, for "do these words appear in that scene". */
function strings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) strings(v, out);
  return out;
}

/** Quotes, dashes, tags and spacing flattened, so a quote matches whatever typography the scene used. */
export function normalizeWords(text) {
  return String(text ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[‘’“”"']/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** The pieces of a giver's quoted words: the quote may skip ahead with " … ". */
export function saidFragments(said) {
  return String(said ?? "").split("…").map((s) => normalizeWords(s)).filter(Boolean);
}

/** Every objective trigger in canon scenes: beats, intro and outro. */
export function objectiveTriggers(model) {
  const out = [];
  for (const s of model.scenes) {
    const groups = [
      ...(s.json.beats || []).map((b) => [b.id, b.triggers]),
      ["intro", s.json.intro?.triggers],
      ["outro", s.json.outro?.triggers]
    ];
    for (const [beatId, triggers] of groups) {
      for (const t of triggers || []) if (t.kind === "objective") out.push({ scene: s.id, file: s.file, beatId, trigger: t });
    }
  }
  return out;
}

export function checkObjectives(model, { scenes, facts, order }) {
  const problems = [];
  const err = (where, message) => problems.push({ level: "error", where, message });
  const warn = (where, message) => problems.push({ level: "warn", where, message });
  const byId = new Map((model.objectives || []).map((o) => [o.id, o]));
  const triggers = objectiveTriggers(model);
  const at = (o) => `objectives/${o.file}`;
  const pos = (sceneId) => (order.has(sceneId) ? order.get(sceneId) : Infinity);

  // Triggers in scenes point at real objectives and parts
  for (const { file, beatId, trigger: t } of triggers) {
    const where = `scenes/${file} → ${beatId} → ${t.id}`;
    if (!OBJECTIVE_ACTS.includes(t.act)) { err(where, `an objective trigger's act is one of ${OBJECTIVE_ACTS.join(", ")}`); continue; }
    const o = byId.get(t.objectiveRef);
    if (!o) { err(where, `objectiveRef ${t.objectiveRef} is not in canon/objectives`); continue; }
    const needsPart = ["tick", "reveal", "strike"].includes(t.act);
    if (needsPart && !(o.json.parts || []).some((p) => p.id === t.partRef)) err(where, `partRef ${t.partRef} is not a part of ${o.id}`);
    if (!needsPart && t.partRef) err(where, `a ${t.act} trigger names no part`);
  }

  const perEpisode = new Map();
  for (const o of model.objectives || []) {
    const j = o.json;
    const where = at(o);
    if (j.id !== o.id) err(where, `id must be the file name (${o.id})`);
    if (j.type !== "objective") err(where, 'type must be "objective"');
    if (!OBJECTIVE_KINDS.includes(j.kind)) err(where, `kind is one of ${OBJECTIVE_KINDS.join(", ")}`);
    if (j.direct && j.kind !== "order") err(where, "only an order can be direct");
    if (!OBJECTIVE_SCOPES.includes(j.scope)) err(where, `scope is one of ${OBJECTIVE_SCOPES.join(", ")}`);
    if (!j.giver?.name) err(where, "every objective is given by someone: giver.name");
    if (j.giver?.faction && !FACTIONS.includes(j.giver.faction)) err(where, `giver.faction is one of ${FACTIONS.join(", ")}`);
    if (!j.title) err(where, "an objective needs its title");
    if (!j.brief) err(where, "an objective needs its brief: what the party understands is wanted");
    if (!MOTIVATIONS.includes(j.want?.motivation)) err(where, `want.motivation is one of the nine: ${MOTIVATIONS.join(", ")}`);
    if (!j.want?.gm) err(where, "want.gm: what the giver actually wants, from their side");
    if (!j.closes) err(where, "closes: what counts as done");

    // Parts: every one marked, at least one required
    const parts = j.parts || [];
    const ids = new Set();
    for (const p of parts) {
      if (ids.has(p.id)) err(where, `part id ${p.id} is used twice`);
      ids.add(p.id);
      if (!PART_NEEDS.includes(p.need)) err(`${where} → ${p.id}`, "every part is marked required or optional");
      if (!p.text) err(`${where} → ${p.id}`, "a part needs its text");
    }
    if (!parts.some((p) => p.need === "required")) err(where, "an objective needs at least one required part");

    // Deadline: Law 19, the cost is visible before it bites
    if (j.deadline) {
      if (!QUARTERS.includes(j.deadline.quarter)) err(where, `deadline.quarter is one of ${QUARTERS.join(", ")}`);
      if (!Number.isInteger(j.deadline.day) || j.deadline.day < 1) err(where, "deadline.day is a campaign day, 1 or more");
      if (j.direct && !j.deadline.cost) err(where, "a direct order with a deadline states what missing it costs (Law 19)");
    }

    // Given: in a real scene, by someone there, in words that scene really says
    const gScene = scenes.get(j.given?.sceneRef);
    if (!gScene) { err(where, `given.sceneRef ${j.given?.sceneRef} is not a canon scene`); continue; }
    const handout = j.given.handoutRef ? (gScene.json.handouts || []).find((h) => h.id === j.given.handoutRef) : null;
    if (j.given.handoutRef && !handout) err(where, `given.handoutRef ${j.given.handoutRef} is not a handout in ${gScene.id}`);
    if (j.giver?.npcRef && !handout && !(gScene.json.cast || []).some((c) => c.npcRef === j.giver.npcRef || c.id === j.giver.npcRef)) {
      err(where, `the giver (${j.giver.npcRef}) isn't in ${gScene.id}'s cast: an objective is given by someone who is there`);
    }
    const sceneWords = normalizeWords(strings(gScene.json).join(" \n "));
    for (const frag of saidFragments(j.said)) {
      if (!sceneWords.includes(frag)) err(where, `"said" must be the giver's own words as ${gScene.id} has them; not found: "${frag}"`);
    }
    if (!saidFragments(j.said).length) err(where, "said: the giver's own words");
    for (const id of j.facts || []) {
      const f = facts.get(id);
      if (!f) { err(where, `cites ${id}, which is not a canon fact`); continue; }
      const reveal = (f.told || "").match(/^in:(.+)$/);
      const ok = f.told === "start" || (reveal && order.has(reveal[1]) && order.get(reveal[1]) <= pos(gScene.id));
      if (!ok) err(where, `its words tell ${id}, which the players aren't told by ${gScene.id} (told: ${f.told})`);
    }

    // The scenes carry it from given to closed
    const mine = triggers.filter((x) => x.trigger.objectiveRef === o.id);
    const gives = mine.filter((x) => x.trigger.act === "give");
    if (!gives.length) err(where, `no scene gives it: add an objective trigger with act "give" in ${gScene.id}`);
    for (const g of gives) if (g.scene !== gScene.id) err(where, `given in ${g.scene}, but given.sceneRef says ${gScene.id}`);
    const givenAt = pos(gScene.id);
    for (const x of mine) if (x.trigger.act !== "give" && pos(x.scene) < givenAt) err(`scenes/${x.file} → ${x.beatId}`, `${x.trigger.act}s ${o.id} before it is given`);
    for (const p of parts) {
      const acts = mine.filter((x) => x.trigger.partRef === p.id).map((x) => x.trigger.act);
      if (p.need === "required" && !acts.some((a) => a === "tick" || a === "strike")) err(`${where} → ${p.id}`, "a required part needs a scene that ticks it or strikes it out");
      if (p.hidden && !acts.includes("reveal")) err(`${where} → ${p.id}`, "a hidden part needs a scene that reveals it");
      if (!p.hidden && acts.includes("reveal")) warn(`${where} → ${p.id}`, "revealed, but not hidden: it is on the page from the start");
      if (acts.includes("strike") && !p.strikeNote) err(`${where} → ${p.id}`, "a part that is struck out needs its strikeNote: why, as the table learns it");
    }
    const closes = mine.filter((x) => x.trigger.act === "close");
    if (!closes.length) err(where, 'no scene closes it: add an objective trigger with act "close"');
    if (closes.length && closes.every((c) => c.scene === gScene.id)) warn(where, "given and closed in one scene: that is an errand, not an objective");

    if (j.scope === "group") perEpisode.set(j.episodeRef, (perEpisode.get(j.episodeRef) || 0) + 1);
  }
  for (const [ep, n] of perEpisode) {
    if (n > MAX_GROUP_OBJECTIVES_PER_EPISODE) err(`objectives (${ep})`, `${n} group objectives in one episode; no more than ${MAX_GROUP_OBJECTIVES_PER_EPISODE}`);
  }
  return problems;
}
