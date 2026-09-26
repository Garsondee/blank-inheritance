/**
 * The deck's Action selector — the pure half.
 *
 * sf2e ships its basic and skill actions as a registry (game.pf2e.actions,
 * 81 entries on sf2e 1.4.1, read live 2026-09-23). Each one's own `use()` is
 * the exact code path the sheet's action buttons call: it finds the right
 * statistic, applies the action's own modifiers and roll options, rolls, and
 * posts the chat card. The deck never reimplements any of that; it only
 * decides WHICH actions sit on its rotary selector and in what order.
 *
 * Two fixed lists, one per mode, because a panel whose detents move between
 * scenes is a panel nobody learns by hand (core/console-model.mjs's own rule
 * for zones, applied to one knob). A fight is Strike/Stride/Step first, then
 * the skill actions that spend an action in combat; theatre of the mind is
 * the social, investigative and infiltration actions a scene actually calls
 * for. Frame scale reads the fight list — a Frame is a PC-grade sheet
 * (project_machine_and_progression_model), so its actions are the same ones.
 *
 * An action with several variants (Administer First Aid, Create a Diversion)
 * names the variant it means: sf2e refuses a bare `use()` on those, and
 * guessing which was meant is worse than committing to the common one.
 *
 * Nothing here touches Foundry. foundry/rolls.mjs hands in plain metadata
 * read off the live registry and gets plain rows back.
 */

/** `slug` is the registry key; `variant` is required only where sf2e has several. */
const THEATRE_ACTIONS = Object.freeze([
  { slug: "seek" },
  { slug: "sense-motive" },
  { slug: "recall-knowledge" },
  { slug: "make-an-impression" },
  { slug: "request" },
  { slug: "gather-information" },
  { slug: "lie" },
  { slug: "coerce" },
  { slug: "impersonate" },
  { slug: "hide" },
  { slug: "sneak" },
  { slug: "avoid-notice" },
  { slug: "conceal-an-object" },
  { slug: "palm-an-object" },
  { slug: "pick-a-lock" },
  { slug: "disable-device" },
  { slug: "force-open" },
  { slug: "hack" },
  { slug: "access-infosphere" },
  { slug: "operate-device" },
  { slug: "decipher-writing" },
  { slug: "climb" },
  { slug: "balance" },
  { slug: "squeeze" },
  { slug: "track" },
  { slug: "administer-first-aid", variant: "stabilize" },
  { slug: "treat-poison" },
  { slug: "treat-disease" }
].map(Object.freeze));

const FIGHT_ACTIONS = Object.freeze([
  { slug: "stride" },
  { slug: "step" },
  { slug: "take-cover" },
  { slug: "seek" },
  { slug: "recall-knowledge" },
  { slug: "demoralize" },
  { slug: "feint" },
  { slug: "create-a-diversion", variant: "gesture" },
  { slug: "grapple" },
  { slug: "trip" },
  { slug: "shove" },
  { slug: "disarm" },
  { slug: "reposition" },
  { slug: "escape" },
  { slug: "tumble-through" },
  { slug: "hide" },
  { slug: "sneak" },
  { slug: "administer-first-aid", variant: "stabilize" },
  { slug: "administer-first-aid", variant: "stop-bleeding" },
  { slug: "stand" },
  { slug: "drop-prone" },
  { slug: "interact" },
  { slug: "point-out" },
  { slug: "ready" },
  { slug: "delay" },
  { slug: "aid" }
].map(Object.freeze));

/** The selector's fixed list for a mode. Anything not theatre is a fight. */
export function actionListFor(mode) {
  return mode === "theatre" ? THEATRE_ACTIONS : FIGHT_ACTIONS;
}

/** A stable id for one list entry, variant included, safe in a data attribute. */
export function actionId({ slug, variant = null }) {
  return variant ? `${slug}:${variant}` : slug;
}

/**
 * sf2e's own cost vocabulary, printed the way the rulebooks print it:
 * one to three filled diamonds, an open diamond for free, a hooked arrow for
 * a reaction. An action with no cost (an exploration or downtime activity)
 * prints nothing rather than a guess.
 */
export function costGlyph(cost) {
  if (cost === 1 || cost === "1") return "◆";
  if (cost === 2 || cost === "2") return "◆◆";
  if (cost === 3 || cost === "3") return "◆◆◆";
  if (cost === "free") return "◇";
  if (cost === "reaction") return "⟲";
  return "";
}

/** "+4" / "-1" / "+0". */
function signedMod(n) {
  const v = Math.round(Number(n) || 0);
  return v >= 0 ? `+${v}` : `${v}`;
}

/**
 * The selector's rows for one mode.
 *
 * `registry` maps a registry slug to what the adapter could read off the live
 * action: `{ name, cost, preview }`, where `preview` is sf2e's own
 * `action.preview({actor})` — the statistic(s) the action rolls and the real
 * modifier for this actor, or an empty list for a simple action that rolls
 * nothing (Stride, Take Cover). A slug missing from the registry is dropped
 * rather than shown as a key that cannot work: a future sf2e that removes or
 * renames an action loses one detent, not the whole knob.
 *
 * When an action can roll more than one statistic (Recall Knowledge, Escape),
 * the key shows the best modifier — that is the one a player reaches for, and
 * sf2e's own dialog still offers the others on shift.
 */
export function actionRows(mode, registry = {}) {
  const rows = [];
  for (const entry of actionListFor(mode)) {
    const meta = registry[entry.slug];
    if (!meta) continue;
    // A variant the live action no longer has would make sf2e refuse use()
    // ("has multiple variants, but no variant was requested" or "does not
    // exist") — drop that detent rather than print a key that cannot work.
    if (entry.variant && meta.variants && !(entry.variant in meta.variants)) continue;
    const previews = Array.isArray(meta.preview) ? meta.preview.filter((p) => p && Number.isFinite(p.modifier)) : [];
    const best = previews.reduce((top, p) => (top === null || p.modifier > top.modifier ? p : top), null);
    const variantName = entry.variant ? meta.variants?.[entry.variant] ?? null : null;
    rows.push({
      id: actionId(entry),
      slug: entry.slug,
      variant: entry.variant ?? null,
      label: variantName ? `${meta.name}: ${variantName}` : meta.name,
      short: variantName ?? meta.name,
      glyph: costGlyph(meta.cost),
      rolls: previews.length > 0,
      stat: best?.label ?? null,
      modLabel: best ? signedMod(best.modifier) : ""
    });
  }
  return rows;
}
