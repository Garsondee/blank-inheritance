// Tier 1 — document ownership (module/blank-inheritance/scripts/core/ownership.mjs).
//
// Found live 2026-10-01: switching to "00. From Up Here" and back to "01. The
// City" threw "RangeError: Maximum call stack size exceeded" and left the
// Director's bar unmounted. The cause is a state our admin panel could write
// (INHERIT, -1, in a world Actor's ownership) meeting an unlinked token, whose
// synthetic Actor is parented to the token. The wiring is pinned in
// tier3-ownership-contract.test.mjs; this is the pure rules, plus a model of
// Foundry's two getUserLevel methods that shows the loop is real.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  INHERIT,
  NONE,
  inheritKeys,
  isPlayerOwned,
  planOwnershipRepair,
  restoredOwnership,
  withoutInherit
} from "../module/blank-inheritance/scripts/core/ownership.mjs";

const GM = "vNM6CSWdIlckXIoT";
const LIAM = "LYkesKELe4BNu9xb";
const CRAIG = "eWitxX4AQNXugEEA";

/* ------------------------------------------------------------------ */
/*  A model of the two methods that loop                               */
/* ------------------------------------------------------------------ */

// Transcribed from foundryvtt/.../common/abstract/document.mjs:386-395 and
// common/documents/token.mjs:940-945 (the real files are pinned by the tier 3
// test, so this model cannot drift from them unnoticed). A tiny depth limit
// stands in for the JavaScript stack, which is what actually runs out.
const LIMIT = 200;

class ModelActor {
  constructor({ ownership, parent = null, depth = { n: 0 } }) {
    this.ownership = ownership;
    this.parent = parent;
    this.depth = depth;
  }

  get isToken() {
    return this.parent instanceof ModelToken;
  }

  get token() {
    return this.isToken ? this.parent : null;
  }

  getUserLevel(user) {
    if (++this.depth.n > LIMIT) throw new RangeError("Maximum call stack size exceeded");
    const level = this.ownership[user.id] ?? this.ownership.default ?? NONE;
    if (level !== INHERIT) return level;
    if (this.parent) return this.parent.getUserLevel(user);
    return NONE;
  }

  testUserPermission(user, permission) {
    if (user.isGM) return true;
    return this.getUserLevel(user) >= permission;
  }

  get hasPlayerOwner() {
    return model.users.some((u) => !u.isGM && this.testUserPermission(u, 3));
  }
}

class ModelToken {
  constructor({ actorLink, baseActor }) {
    this.actorLink = actorLink;
    this.baseActor = baseActor;
    this.depth = { n: 0 };
    this.actor = actorLink
      ? baseActor
      : new ModelActor({ ownership: structuredClone(baseActor.ownership), parent: this, depth: this.depth });
  }

  getUserLevel(user) {
    if (++this.depth.n > LIMIT) throw new RangeError("Maximum call stack size exceeded");
    if (this.actor) return this.actor.getUserLevel(user);
    return user.isGM ? 3 : NONE;
  }
}

const model = { users: [{ id: GM, isGM: true }, { id: LIAM, isGM: false }, { id: CRAIG, isGM: false }] };
const worldActor = (ownership) => new ModelActor({ ownership });

test("the model shows the loop is real: INHERIT in a world Actor + an unlinked token recurses forever", () => {
  const base = worldActor({ default: 1, [GM]: 3, [LIAM]: INHERIT });
  const token = new ModelToken({ actorLink: false, baseActor: base });
  assert.throws(() => token.actor.hasPlayerOwner, RangeError, "the synthetic Actor loops");
  assert.throws(() => token.getUserLevel(model.users[1]), RangeError, "and so does the token that asked");
});

test("the same INHERIT is harmless on the world Actor itself, and on a LINKED token", () => {
  const base = worldActor({ default: 1, [GM]: 3, [LIAM]: INHERIT });
  assert.equal(base.hasPlayerOwner, false, "INHERIT with no parent resolves to NONE, not a loop");
  const linked = new ModelToken({ actorLink: true, baseActor: base });
  assert.equal(linked.actor, base, "a linked token's actor IS the world Actor");
  assert.doesNotThrow(() => linked.actor.hasPlayerOwner);
});

test("no INHERIT, no loop: a clean map is safe even behind an unlinked token", () => {
  const base = worldActor(withoutInherit({ default: 1, [GM]: 3, [LIAM]: INHERIT }));
  const token = new ModelToken({ actorLink: false, baseActor: base });
  assert.doesNotThrow(() => token.actor.hasPlayerOwner);
  assert.equal(token.actor.hasPlayerOwner, false);
});

test("isPlayerOwned asks the world Actor, so it answers even where hasPlayerOwner would loop", () => {
  const base = worldActor({ default: 1, [GM]: 3, [LIAM]: INHERIT, [CRAIG]: 3 });
  const token = new ModelToken({ actorLink: false, baseActor: base });
  token.actor.token.baseActor = base;
  assert.throws(() => token.actor.hasPlayerOwner, RangeError, "the unguarded read loops on this data");
  assert.equal(isPlayerOwned(token.actor), true, "the guarded read still finds Craig owns it");
  assert.equal(isPlayerOwned(worldActor({ default: 0, [GM]: 3 })), false, "a GM-only actor is not a player's");
});

test("isPlayerOwned is the plain hasPlayerOwner for an ordinary actor, and false for nothing", () => {
  assert.equal(isPlayerOwned(worldActor({ default: 0, [GM]: 3, [LIAM]: 3 })), true);
  assert.equal(isPlayerOwned(null), false);
  assert.equal(isPlayerOwned(undefined), false);
  assert.equal(isPlayerOwned({ isToken: true, token: null, hasPlayerOwner: true }), false, "a token actor whose world actor is gone is not claimed");
});

/* ------------------------------------------------------------------ */
/*  The pure rules                                                     */
/* ------------------------------------------------------------------ */

test("the constants are Foundry's own: INHERIT -1, NONE 0", () => {
  assert.equal(INHERIT, -1);
  assert.equal(NONE, 0);
});

test("inheritKeys lists exactly the entries holding INHERIT, default included", () => {
  assert.deepEqual(inheritKeys({ default: 1, [GM]: 3, [LIAM]: INHERIT, [CRAIG]: INHERIT }), [LIAM, CRAIG]);
  assert.deepEqual(inheritKeys({ default: INHERIT }), ["default"]);
  assert.deepEqual(inheritKeys({ default: 0, [GM]: 3 }), []);
  assert.deepEqual(inheritKeys(undefined), []);
  assert.deepEqual(inheritKeys(null), []);
});

test("withoutInherit drops a user's INHERIT, turns a default INHERIT into NONE, and touches nothing else", () => {
  assert.deepEqual(withoutInherit({ default: 1, [GM]: 3, [LIAM]: INHERIT }), { default: 1, [GM]: 3 });
  assert.deepEqual(withoutInherit({ default: INHERIT, [GM]: 3 }), { default: NONE, [GM]: 3 });
  assert.deepEqual(withoutInherit({ [GM]: 3 }), { [GM]: 3, default: NONE }, "a map with no default gets one, as Foundry's own field does");
  assert.deepEqual(withoutInherit(undefined), { default: NONE });
  const original = { default: 1, [LIAM]: INHERIT };
  withoutInherit(original);
  assert.deepEqual(original, { default: 1, [LIAM]: INHERIT }, "never mutates its input");
});

test("restoredOwnership: handing a test character back leaves NO entry when there was none (the bug wrote INHERIT)", () => {
  const lent = { default: 0, [GM]: 3, [LIAM]: 3 };
  const back = restoredOwnership(lent, LIAM, null);
  assert.deepEqual(back, { default: 0, [GM]: 3 });
  assert.equal(inheritKeys(back).length, 0, "the old code left [LIAM]: -1 here");
  assert.equal(LIAM in back, false);
});

test("restoredOwnership puts back a real previous level, and ignores a recorded INHERIT", () => {
  const lent = { default: 0, [GM]: 3, [LIAM]: 3 };
  assert.deepEqual(restoredOwnership(lent, LIAM, 2), { default: 0, [GM]: 3, [LIAM]: 2 });
  assert.deepEqual(restoredOwnership(lent, LIAM, 0), { default: 0, [GM]: 3, [LIAM]: 0 }, "an explicit NONE is a real level, kept");
  assert.deepEqual(restoredOwnership(lent, LIAM, INHERIT), { default: 0, [GM]: 3 }, "a recorded INHERIT is the stale state, not a level to restore");
  assert.deepEqual(restoredOwnership(lent, LIAM, undefined), { default: 0, [GM]: 3 });
});

test("restoredOwnership also clears any other stale INHERIT on the same actor, so the result is always safe", () => {
  const stale = { default: 1, [GM]: 3, [LIAM]: 3, [CRAIG]: INHERIT };
  assert.deepEqual(restoredOwnership(stale, LIAM, null), { default: 1, [GM]: 3 });
});

test("planOwnershipRepair names only the actors that need it, with the map to write", () => {
  const actors = [
    { id: "a", name: "Clean", ownership: { default: 0, [GM]: 3 } },
    { id: "b", name: "PC 1", ownership: { default: 1, [GM]: 3, [LIAM]: INHERIT, [CRAIG]: INHERIT } },
    { id: "c", name: "Odd", ownership: { default: INHERIT, [GM]: 3 } },
    { id: "d", name: "No map" }
  ];
  const plan = planOwnershipRepair(actors);
  assert.deepEqual(plan.map((p) => p.id), ["b", "c"]);
  assert.deepEqual(plan[0], { id: "b", name: "PC 1", removed: [LIAM, CRAIG], ownership: { default: 1, [GM]: 3 } });
  assert.deepEqual(plan[1].ownership, { default: NONE, [GM]: 3 });
  assert.deepEqual(planOwnershipRepair(plan.map((p) => ({ id: p.id, ownership: p.ownership }))), [], "applying the plan leaves nothing to repair: idempotent");
  assert.deepEqual(planOwnershipRepair([]), []);
  assert.deepEqual(planOwnershipRepair(), []);
});
