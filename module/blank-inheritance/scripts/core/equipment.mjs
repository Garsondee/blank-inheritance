/**
 * The equipment locker — the pure half.
 *
 * Kit Issue's real need (design/campaign-arc.md-adjacent, see GitHub #139):
 * players draw freely from a curated catalogue within a shared 150cr budget,
 * some items are effectively infinite (the menu), a few might one day be
 * genuinely scarce (one copy for the whole party). This file owns that
 * arithmetic — who has taken what, how much of the budget and the shelf is
 * left, and whether a given take is legal — the same split this project
 * already uses for the downtime board (core/commitments.mjs): pure data in,
 * pure data out, no Foundry, no DOM, no storage.
 *
 * A "grant" is one recorded take: { id, userId, userName, itemId, quantity,
 * unitPrice, kind, timestamp, revoked }. `unitPrice` is stamped from the
 * catalogue AT GRANT TIME rather than re-read from the catalogue later, so a
 * later price edit can't retroactively change what someone already spent —
 * and so a future purchase/sale economy (explicitly named as "eventually" by
 * the person who asked for this) has the one number it would need without
 * this file having to change shape to grow it. `kind` is `"issue"` today
 * (a free Kit Issue grant); a later `"purchase"`/`"sale"` is additive, not a
 * migration.
 */

/** Active grants only — a revoked grant no longer counts against stock or budget. */
function active(grants = []) {
  return grants.filter((g) => g && !g.revoked);
}

export function findItem(catalogue, itemId) {
  return catalogue?.items?.find((item) => item.id === itemId) ?? null;
}

/** How many copies of one item are already spoken for, across every player. */
export function takenCount(itemId, grants = []) {
  return active(grants)
    .filter((g) => g.itemId === itemId)
    .reduce((sum, g) => sum + (g.quantity ?? 1), 0);
}

/** Infinity for an unlimited or unset stock — every real comparison against it just works. */
export function remainingStock(item, grants = []) {
  if (!item) return 0;
  const stock = item.stock;
  if (stock == null || stock === "unlimited") return Infinity;
  return Math.max(0, stock - takenCount(item.id, grants));
}

/** One player's own picks, oldest first. */
export function grantsFor(userId, grants = []) {
  return active(grants).filter((g) => g.userId === userId);
}

/** Credits spent so far, from the price stamped on each grant at take-time. */
export function spentBy(userId, grants = []) {
  return grantsFor(userId, grants).reduce((sum, g) => sum + (g.unitPrice ?? 0) * (g.quantity ?? 1), 0);
}

/** Mirrors core/commitments.mjs#budgetFor's shape: total/spent/remaining/over. */
export function budgetFor(userId, catalogue, grants = []) {
  const total = catalogue?.budget?.credits ?? 0;
  const spent = spentBy(userId, grants);
  return {
    total,
    spent,
    remaining: Math.max(0, total - spent),
    over: spent > total
  };
}

/**
 * Would granting `quantity` of `item` to `userId` be legal right now?
 *
 * `force: true` (GM-only, enforced by the caller, not here — this function
 * just answers the question asked) skips the budget check but never the
 * stock check: budget is a per-player fairness rule a GM can waive on
 * purpose, stock is "how many actually exist," which forcing a grant cannot
 * change without also editing the catalogue.
 */
export function canGrant({ item, userId, catalogue, grants = [], quantity = 1, force = false }) {
  if (!item) return { ok: false, reason: "no-such-item" };
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, reason: "bad-quantity" };
  if (remainingStock(item, grants) < quantity) return { ok: false, reason: "out-of-stock" };
  if (!force) {
    const budget = budgetFor(userId, catalogue, grants);
    if (item.price * quantity > budget.remaining) return { ok: false, reason: "over-budget" };
  }
  return { ok: true, reason: null };
}

/**
 * The catalogue as one player sees it: every item annotated with what is
 * left and what THEY (not everyone) have already taken, plus their own
 * budget summary. This is the whole shape the panel renders from, so the
 * template stays free of arithmetic.
 */
export function projectCatalogue({ catalogue, grants = [], userId }) {
  const mine = grantsFor(userId, grants);
  const items = (catalogue?.items ?? []).map((item) => {
    const remaining = remainingStock(item, grants);
    const myQuantity = mine.filter((g) => g.itemId === item.id).reduce((s, g) => s + (g.quantity ?? 1), 0);
    return {
      ...item,
      remaining: Number.isFinite(remaining) ? remaining : null,
      unlimited: !Number.isFinite(remaining),
      myQuantity,
      takenByMe: myQuantity > 0,
      available: canGrant({ item, userId, catalogue, grants, quantity: 1 }).ok
    };
  });
  return { items, budget: budgetFor(userId, catalogue, grants) };
}

/** The GM's log: every active grant, newest first, with the item's real name resolved in. */
export function logEntries(catalogue, grants = []) {
  return active(grants)
    .map((g) => ({ ...g, itemName: findItem(catalogue, g.itemId)?.name ?? g.itemId }))
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}

const SF2E_ITEM_TYPE = { weapon: "weapon", armor: "armor", gear: "equipment", consumable: "consumable" };

/**
 * One catalogue entry -> a real sf2e physical Item, hand-authored rather than
 * compendium-linked (unlike ancestry/background/class in generators/character.mjs
 * -- this project doesn't yet resolve a catalogue `baseItem` name to a real
 * compendium UUID, so `baseItem`/`category`/`group` are left at their schema
 * defaults rather than guessed at). `price.value` uses sf2e's own `credits`
 * denomination -- confirmed a real, distinct key in its Coins system
 * (gamesystems/sf2e/lang/en.json's CurrencyAbbreviations), not a relabelled
 * `gp`. `quantity` is always 1 here; a repeat take is the adapter's job to
 * fold into an existing embedded Item's quantity rather than create a
 * second Item document -- see foundry/equipment-state.mjs.
 *
 * Pure: no Foundry globals. Field paths checked against
 * gamesystems/sf2e/template.json by test/tier3-contract.test.mjs, same as
 * every other generator.
 */
export function catalogueItemToSf2eItemData(item) {
  const description = [item.mechanics, item.flavorNote].filter(Boolean).join(" ");
  return {
    name: item.name ?? item.id,
    type: SF2E_ITEM_TYPE[item.category] ?? "equipment",
    system: {
      level: { value: item.level ?? 0 },
      traits: { value: item.traits ?? [] },
      quantity: 1,
      bulk: { value: item.bulk ?? 0 },
      price: { value: { credits: item.price ?? 0 } },
      description: { value: description, gm: "" }
    }
  };
}
