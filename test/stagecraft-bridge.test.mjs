// The adventure's bridge to Stagecraft (module/blank-inheritance/scripts/{core,foundry}/stagecraft-*.mjs and
// module/blank-inheritance/stagecraft/stages.json): which scenes are puppet stages, that each description is one Stagecraft
// understands, that the people on a stage are exactly the people the table may see, and that the older overlay steps aside.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rawKeyOf, partySlot, partyYaw, placeFor, mirrorCards, momentMoves, sameCards, summonsForTrigger, entryFor, descriptionFor, layoutOf, deckCover, ORB_COLLAR, DECK_MAX_SCALE, STAGES_PATH } from "../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs";
import { publishedCast, leaksConcealed } from "../module/blank-inheritance/scripts/core/stage-layout.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleDir = path.join(root, "module", "blank-inheritance");
const stages = JSON.parse(readFileSync(path.join(moduleDir, "stagecraft", "stages.json"), "utf8"));
const sceneSet = JSON.parse(readFileSync(path.join(root, "data", "campaign", "scene-set.json"), "utf8"));
const { describeScene } = await import("../module/stagecraft/scripts/core/scene.mjs");

/* ------------------------------------------------------------------ the file that says which scenes are stages */

test("the stages file is where the bridge looks for it, and says what it is for", () => {
  assert.equal(path.join(root, "module", STAGES_PATH.replace(/^modules\//, "")), path.join(moduleDir, "stagecraft", "stages.json").replace(/\\/g, path.sep));
  assert.ok(Object.keys(stages.stages).length >= 3, "three scenes at least are stages (the centipede fight and two more)");
  assert.equal(stages.skin, "brass");
});

test("every stage is a built scene of Episode One or a haunt, and its painting is that scene's own art", () => {
  for (const [id, entry] of Object.entries(stages.stages)) {
    const scene = sceneSet.scenes.find((s) => s.id === id);
    assert.ok(scene, `${id} is not in the scene set`);
    assert.match(scene.briefRef, /^(episode-c1e1--|rest--|discovery--)/, `${id} is an Episode One scene or a haunt`);
    assert.equal(entry.description.painting.src, `modules/blank-inheritance/assets/scenes/${scene.art}.webp`, `${id} paints with its own art`);
    assert.ok(existsSync(path.join(moduleDir, "assets", "scenes", `${scene.art}.webp`)), `${scene.art}.webp is not in the module`);
  }
});

test("every description is one Stagecraft understands without a complaint", () => {
  for (const [id, entry] of Object.entries(stages.stages)) {
    const d = describeScene(descriptionFor(stages, entry));
    assert.deepEqual(d.problems, [], `${id}: ${d.problems.join("; ")}`);
    assert.ok(d.usable);
    assert.equal(d.scene.skin, "brass");
  }
});

test("the centipede fight is one of them, and the nest waking calls six centipedes with art that is shipped", () => {
  const entry = entryFor(stages, "e1-flood-tunnel");
  const summons = summonsForTrigger(entry, "nest-wakes");
  assert.equal(summons.length, 6);
  assert.equal(new Set(summons.map((s) => s.id)).size, 6, "six different cards");
  for (const s of summons) {
    assert.ok(entry.places[s.id], `${s.id} has a place to stand`);
    if (existsSync(path.join(moduleDir, "assets", "stage"))) assert.ok(existsSync(path.join(root, "module", "blank-inheritance", s.img.replace("modules/blank-inheritance/", ""))), `${s.img} is not in the module`);
  }
  assert.deepEqual(summonsForTrigger(entry, "something-else"), []);
  assert.deepEqual(summonsForTrigger(null, "nest-wakes"), []);
});

test("the trigger that wakes the nest is really in the flood tunnel scene, so the two cannot drift apart", () => {
  const brief = JSON.parse(readFileSync(path.join(root, "data", "scene-briefs", "episode-c1e1--flood-tunnel.json"), "utf8"));
  const triggers = brief.beats.flatMap((b) => b.triggers ?? []);
  assert.ok(triggers.some((t) => t.id === "nest-wakes"), "the brief no longer has a trigger called nest-wakes");
});

test("anyone a stage entry names a place for is a person in that scene's cast, or a summon", () => {
  for (const [id, entry] of Object.entries(stages.stages)) {
    const scene = sceneSet.scenes.find((s) => s.id === id);
    const brief = JSON.parse(readFileSync(path.join(root, "data", "scene-briefs", `${scene.briefRef}.json`), "utf8"));
    const known = new Set([...brief.cast.map((c) => c.npcRef), ...Object.values(entry.onTrigger ?? {}).flatMap((t) => (t.summon ?? []).map((s) => s.id))]);
    for (const who of Object.keys(entry.places ?? {})) assert.ok(known.has(who), `${id}: ${who} is neither in the brief's cast nor summoned by a trigger`);
    for (const who of Object.keys(entry.life ?? {})) assert.ok(known.has(who), `${id}: ${who} has a routine but is not in the scene`);
    for (const [mid, m] of Object.entries(entry.moments ?? {})) {
      for (const who of Object.keys(m.places ?? {})) assert.ok(known.has(who), `${id}: moment ${mid} places ${who}, who is not in the scene`);
    }
  }
});

test("every routine, moment and trigger in the stages file is one Stagecraft and the Runner understand", async () => {
  const { describeRoutine } = await import("../module/stagecraft/scripts/core/life.mjs");
  const { FORMATIONS } = await import("../module/stagecraft/scripts/core/formations.mjs");
  const { GAITS } = await import("../module/stagecraft/scripts/core/walks.mjs");
  for (const [id, entry] of Object.entries(stages.stages)) {
    const scene = sceneSet.scenes.find((s) => s.id === id);
    const brief = JSON.parse(readFileSync(path.join(root, "data", "scene-briefs", `${scene.briefRef}.json`), "utf8"));
    const marks = new Set((entry.description.marks ?? []).map((m) => m.id));
    for (const [who, life] of Object.entries(entry.life ?? {})) {
      assert.ok(describeRoutine(life), `${id}: ${who}'s routine is not one Stagecraft runs`);
      for (const m of life.marks ?? []) assert.ok(marks.has(m), `${id}: ${who} visits mark ${m}, which the scene does not have`);
      if (life.gait) assert.ok(GAITS[life.gait], `${id}: ${who} walks with an unknown gait ${life.gait}`);
      if (typeof life.faces === "string") {
        assert.ok(life.faces in (entry.places ?? {}), `${id}: ${who} talks to ${life.faces}, who is not in the scene`);
        assert.notEqual(life.faces, who, `${id}: ${who} talks to themself`);
      }
    }
    for (const [mid, m] of Object.entries(entry.moments ?? {})) {
      assert.ok(typeof m.label === "string" && m.label, `${id}: moment ${mid} has a label for the GM's button`);
      if (m.formation) assert.ok(FORMATIONS.includes(m.formation.kind), `${id}: moment ${mid} uses an unknown formation`);
      for (const [who, p] of Object.entries(m.places ?? {})) {
        assert.ok(Array.isArray(p.at) || marks.has(p.mark), `${id}: moment ${mid} sends ${who} nowhere the scene has`);
        if (p.gait) assert.ok(GAITS[p.gait], `${id}: moment ${mid}: unknown gait ${p.gait}`);
      }
    }
    const triggers = new Set(brief.beats?.flatMap((b) => (b.triggers ?? []).map((t) => t.id)) ?? []);
    for (const [tid, t] of Object.entries(entry.onTrigger ?? {})) {
      assert.ok(triggers.has(tid), `${id}: the trigger ${tid} is not in the scene brief`);
      if (t.moment) assert.ok(entry.moments?.[t.moment], `${id}: the trigger ${tid} plays a moment the entry does not have`);
    }
    for (const [who, e] of Object.entries(entry.enter ?? {})) {
      const from = typeof e === "string" ? e : e.from;
      assert.ok(["left", "right", "back", "rise"].includes(from), `${id}: ${who} walks on from nowhere`);
    }
  }
});

test("nobody a scene places stands where a cut-out would hide them entirely, and everyone stands on the floor", async () => {
  const { Stage } = await import("../module/stagecraft/scripts/core/stage.mjs");
  const problems = [];
  for (const [id, entry] of Object.entries(stages.stages)) {
    const d = describeScene(descriptionFor(stages, entry)).scene;
    const people = Object.entries(entry.places ?? {}).map(([key, at]) => ({ id: key, name: key, at, size: entry.sizes?.[key] }));
    const s = new Stage(d, people, { card: { w: 280, h: 468 } });
    for (const p of people) {
      if (!s.rig.standing(p.at)) { problems.push(`${id}: ${p.id} stands above the horizon`); continue; }
      const c = s.cards.get(p.id);
      if (s.unhidden(c.puppet.x, c.Z, c.w * c.grow, c.h * c.grow) !== c.Z) problems.push(`${id}: ${p.id} would be hidden behind a cut-out`);
    }
  }
  assert.deepEqual(problems, []);
});

test("the deck's cover over a stage is where the deck really is: measured on the live GM window, 2026-10-03", () => {
  // 2560 x 1271, the sidebar folded: the faceplate from x 291 to 2221, its top at y 1035; the orb's collar 374 across, its
  // top at y 890 (window pixels). At that size one window pixel is one page pixel, and the page's top 84.5 are cut off.
  const [plate, orb] = deckCover({ viewportWidth: 2560, viewportHeight: 1271, rightReserve: 48 });
  const near = (a, b, what) => assert.ok(Math.abs(a - b) < 2, `${what}: ${a} is not ${b}`);
  near(plate.rect[0], 291, "faceplate left");
  near(plate.rect[2], 2221, "faceplate right");
  near(plate.rect[1], 1035 + 84.5, "faceplate top");
  near(orb.circle[2], 187, "collar radius");
  near(orb.circle[1] - orb.circle[2], 890 + 84.5, "collar top");
  near(orb.circle[0], 1256, "collar centre");
  // and the numbers it is built from are the deck's own
  const tokens = readFileSync(path.join(moduleDir, "styles", "bi-tokens.css"), "utf8");
  assert.match(tokens, new RegExp(`--bi-orb-collar:\\s*${ORB_COLLAR}px`));
  const deck = readFileSync(path.join(moduleDir, "scripts", "foundry", "deck.mjs"), "utf8");
  assert.match(deck, new RegExp(`const DECK_MAX_SCALE = ${DECK_MAX_SCALE};`));
});

/** A scene's people where the entry puts them (or where a moment sends them), with a party of six in their places, as cards. */
async function sceneCards(entry, moment = null) {
  const { Stage } = await import("../module/stagecraft/scripts/core/stage.mjs");
  const d = describeScene(descriptionFor(stages, entry)).scene;
  const people = [
    ...Object.entries(entry.places ?? {}).map(([key, at]) => ({ id: key, name: key, at: moment?.places?.[key]?.at ?? at, size: entry.sizes?.[key] })),
    ...Array.from({ length: 6 }, (_, n) => ({ id: `pc-${n + 1}`, name: `PC ${n + 1}`, at: partySlot(entry, n), pc: true }))
  ];
  const s = new Stage(d, people, { card: { w: 280, h: 468 } });
  const cards = people.map((p) => {
    const at = s.rig.standing(p.at);
    const c = s.cards.get(p.id);
    const g = s.grow(at.Z);
    return { id: p.id, X: at.X, Z: at.Z, w: c.w * g, h: c.h * g, lift: s.riserFor(at.X, at.Z, c.w * g, c.h * g) };
  });
  return { s, cards };
}

test("every scene with everyone in it and six in the party: no card is hidden by another more than the rule allows", async () => {
  // Ingram, 2026-10-03: people placed "fully in view", and anything in front of a card hiding no more than its bottom 15%;
  // with cards half as big again, a party of six standing across the front hid the room behind it
  const { hiddenShares, HIDDEN_AT_MOST } = await import("../module/stagecraft/scripts/core/visibility.mjs");
  const problems = [];
  for (const [id, entry] of Object.entries(stages.stages)) {
    const { s, cards } = await sceneCards(entry);
    for (const [who, v] of hiddenShares(s.rig, cards)) if (v.hidden > HIDDEN_AT_MOST + 0.001) problems.push(`${id}: ${who} is ${Math.round(v.hidden * 100)}% hidden by ${v.by.join(", ")}`);
  }
  assert.deepEqual(problems, []);
});

test("every place a routine takes someone to is in view too, and hides nobody: the waitress's rounds never go behind the party", async () => {
  // found 2026-10-03: Obi's rounds in the Rumour Mill stopped right in front of Hana's armchair
  const { hiddenShares, HIDDEN_AT_MOST } = await import("../module/stagecraft/scripts/core/visibility.mjs");
  const problems = [];
  for (const [id, entry] of Object.entries(stages.stages)) {
    for (const [who, life] of Object.entries(entry.life ?? {})) {
      for (const at of [...(life.spots ?? []), ...(life.path ?? [])]) {
        const { s, cards } = await sceneCards(entry, { places: { [who]: { at } } });
        for (const [other, v] of hiddenShares(s.rig, cards)) {
          if (v.hidden <= HIDDEN_AT_MOST + 0.001) continue;
          if (other === who) problems.push(`${id}: ${who} at ${at} is ${Math.round(v.hidden * 100)}% hidden by ${v.by.join(", ")}`);
          else if (v.by.includes(who)) problems.push(`${id}: ${who} at ${at} hides ${other} (${Math.round(v.hidden * 100)}%)`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("a scene's moments played one after another leave everyone in view too: nobody is sent where another was sent", async () => {
  // found 2026-10-03: "Sanzo takes the floor" and "Tama brings a round" sent both to the middle of the floor
  const { hiddenShares, HIDDEN_AT_MOST } = await import("../module/stagecraft/scripts/core/visibility.mjs");
  const problems = [];
  for (const [id, entry] of Object.entries(stages.stages)) {
    const all = {};
    for (const m of Object.values(entry.moments ?? {})) for (const [who, p] of Object.entries(m.places ?? {})) if (Array.isArray(p.at)) all[who] = p;
    if (Object.keys(all).length < 2) continue;
    const { s, cards } = await sceneCards(entry, { places: all });
    for (const [who, v] of hiddenShares(s.rig, cards)) if (v.hidden > HIDDEN_AT_MOST + 0.001) problems.push(`${id}: with every moment played, ${who} is ${Math.round(v.hidden * 100)}% hidden by ${v.by.join(", ")}`);
  }
  assert.deepEqual(problems, []);
});

test("every door and thing to look at can be gone to in view: a card at it is on the page and not behind the party", async () => {
  // a zone is used by putting a card down at it (stagecraft.visit); one whose floor is behind the wings, or off the page,
  // cannot be (found 2026-10-03: the examination room's door was off the left edge of the page)
  const { hiddenShares, HIDDEN_AT_MOST } = await import("../module/stagecraft/scripts/core/visibility.mjs");
  const problems = [];
  for (const [id, entry] of Object.entries(stages.stages)) {
    for (const z of entry.description.zones ?? []) {
      if (!["door", "spot"].includes(z.kind)) continue;
      const area = z.floor ?? z.shape;
      const at = [area.reduce((s, p) => s + p[0], 0) / area.length, Math.max(...area.map((p) => p[1])) - 0.012];
      const visitor = { ...entry, places: { ...entry.places, "a-visitor": at } };
      const { s, cards } = await sceneCards(visitor);
      const v = hiddenShares(s.rig, cards.filter((c) => c.id === "a-visitor" || c.id.startsWith("pc-"))).get("a-visitor");
      if (v.hidden > HIDDEN_AT_MOST + 0.001) problems.push(`${id}: a card at ${z.id} is ${Math.round(v.hidden * 100)}% hidden by ${v.by.join(", ")}`);
      const { cardRect, coveredShare } = await import("../module/stagecraft/scripts/core/visibility.mjs");
      const deck = deckCover({ viewportWidth: 2560, viewportHeight: 1271, rightReserve: 48 });
      const covered = coveredShare(cardRect(s.rig, cards.find((c) => c.id === "a-visitor")), deck);
      if (covered > 0.151) problems.push(`${id}: a card at ${z.id} is ${Math.round(covered * 100)}% behind the deck`);
      const [x0] = s.rig.fractionOfScreen(0, 0);
      const [x1] = s.rig.fractionOfScreen(2560, 0);
      if (at[0] < x0 + 0.03 || at[0] > x1 - 0.03) problems.push(`${id}: ${z.id} is off the page`);
    }
  }
  assert.deepEqual(problems, []);
});

test("every moment of every scene leaves everyone in view as well", async () => {
  const { hiddenShares, HIDDEN_AT_MOST } = await import("../module/stagecraft/scripts/core/visibility.mjs");
  const problems = [];
  for (const [id, entry] of Object.entries(stages.stages)) {
    for (const [mid, m] of Object.entries(entry.moments ?? {})) {
      if (!m.places || Object.values(m.places).some((p) => !Array.isArray(p.at))) continue;
      const { s, cards } = await sceneCards(entry, m);
      for (const [who, v] of hiddenShares(s.rig, cards)) if (v.hidden > HIDDEN_AT_MOST + 0.001) problems.push(`${id} / ${mid}: ${who} is ${Math.round(v.hidden * 100)}% hidden by ${v.by.join(", ")}`);
    }
  }
  assert.deepEqual(problems, []);
});

test("the party stands in the wings unless a stage says otherwise: two groups at the front corners, the middle open", () => {
  const slots = Array.from({ length: 6 }, (_, n) => partySlot({}, n));
  const left = slots.filter((p) => p[0] < 0.5);
  const right = slots.filter((p) => p[0] > 0.5);
  assert.equal(left.length, 3);
  assert.equal(right.length, 3);
  assert.ok(Math.max(...left.map((p) => p[0])) < 0.3 && Math.min(...right.map((p) => p[0])) > 0.7, "the middle of the stage is left open");
  assert.deepEqual(slots[0], [0.12, 0.972], "the outermost places fill first");
  assert.ok(slots[4][1] < slots[0][1], "each wing steps back as it comes in");
  assert.ok(partyYaw({}, slots[0]) > 20 && partyYaw({}, slots[1]) < -20, "and turns in towards the middle");
  // a stage that keeps one side clearer (a door on the right) puts more of the party on the other
  const split = Array.from({ length: 6 }, (_, n) => partySlot({ partyRow: { split: 4 } }, n));
  assert.equal(split.filter((p) => p[0] < 0.5).length, 4);
  assert.equal(split.filter((p) => p[0] > 0.5).length, 2);
  assert.equal(new Set(split.map((p) => p.join())).size, 6, "six different places");
});

test("a stage laid out afresh walks the people already on it to their new places, keeps the fallen down, and stamps its layout", () => {
  const def = { places: { tama: [0.4, 0.8] }, partyRow: { wings: [0.15, 0.85] } };
  const before = [{ id: "summon-tama", name: "Tama", at: [0.7, 0.75], home: [0.7, 0.75], still: true, down: true }, { id: "summon-pc-a", name: "A", pc: true, at: [0.5, 0.95] }];
  const published = [member("summon-tama"), member("summon-pc-a", { kind: "pc", actorId: "A1" })];
  const kept = mirrorCards({ published, existing: before, def, now: 1790995000 });
  assert.deepEqual(kept[0].at, [0.7, 0.75], "without a new layout, a place once made is kept");
  const fresh = mirrorCards({ published, existing: before, def, now: 1790995000, relayout: true });
  assert.deepEqual(fresh[0].at, [0.4, 0.8]);
  assert.deepEqual(fresh[0].home, [0.4, 0.8]);
  assert.deepEqual(fresh[0].move, { t0: 1790995000, gait: "walk" }, "it walks over rather than jumping");
  assert.equal(fresh[0].down, true, "the fallen stay down");
  assert.equal(fresh[0].enter, undefined, "nobody already there walks on again");
  assert.deepEqual(fresh[1].at, partySlot(def, 0));
  assert.notEqual(layoutOf(def), layoutOf({ ...def, places: { tama: [0.41, 0.8] } }), "a moved place is a new layout");
  assert.equal(layoutOf(def), layoutOf(JSON.parse(JSON.stringify(def))), "and the same entry is the same layout");
});

test("everything a scene places is fully on screen: its people wherever they go, its marks, the party's row, its chalk zones and its box", async () => {
  // found 2026-10-03: the painting is raised to clear the deck, which pushed Kit Issue's chalk wall off the top of the
  // screen, so "chalk goes on the back wall" pointed at a wall nobody could reach; and with cards half as big again
  // (Ingram: "fully in view"), a person put 0.06 in from the painting's edge had half their card off the page
  const { Stage } = await import("../module/stagecraft/scripts/core/stage.mjs");
  const { DEEPEST } = await import("../module/stagecraft/scripts/core/rigspace.mjs");
  const { coveredShare } = await import("../module/stagecraft/scripts/core/visibility.mjs");
  const W = 2560;
  const FLOOR = 1440 - 270;                           // the deck covers about the bottom 270 pixels of the 2560 x 1440 page
  // the deck as it lies over the stage on the GM's own window (measured live, 2560 x 1271) and a player's 1920-wide one,
  // the sidebar folded: nobody may be covered more than the bottom 15% by it, its rising orb included
  const decks = [deckCover({ viewportWidth: 2560, viewportHeight: 1271, rightReserve: 48 }), deckCover({ viewportWidth: 1920, viewportHeight: 969, rightReserve: 48 })];
  const problems = [];
  for (const [id, entry] of Object.entries(stages.stages)) {
    const d = describeScene(descriptionFor(stages, entry)).scene;
    const people = Object.entries(entry.places ?? {}).map(([key, at]) => ({ id: key, name: key, at, size: entry.sizes?.[key] }));
    const s = new Stage(d, people, { card: { w: 280, h: 468 } });
    const r = s.rig;
    // how tall a card is drawn at the front of the stage, where the party stands
    const front = r.standing(partySlot(entry, 0));
    const frontH = r.screenOf(0, 0, front.Z).y - r.screenOf(0, 468 * d.cardScale * s.grow(front.Z), front.Z).y;
    // the rectangle a card standing at a point of the painting fills on the page: drawn bigger at its depth, raised over any
    // cut-out in front of it, and as wide as it is face-on (a card turned away is narrower, never wider)
    const fits = (what, at, size = 1) => {
      const p = r.standing(at);
      if (!p) { problems.push(`${id}: ${what} stands above the horizon`); return; }
      // found 2026-10-03: people put at the back of a long room stood behind the painting itself and were never drawn;
      // and a face must stay big enough to read (a little under half its size at the front)
      if (p.Z < DEEPEST) { problems.push(`${id}: ${what} stands behind the painting (${at})`); return; }
      const g = s.grow(p.Z);
      const w = 280 * d.cardScale * size * g;
      const h = 468 * d.cardScale * size * g;
      const lift = s.riserFor(p.X, p.Z, w, h);
      const a = r.screenOf(p.X - w / 2, lift, p.Z);
      const b = r.screenOf(p.X + w / 2, lift + h, p.Z);
      if (a.x < 0 || b.x > W) problems.push(`${id}: ${what} is cut off by the ${a.x < 0 ? "left" : "right"} edge (${at})`);
      if (b.y < 0) problems.push(`${id}: ${what} has their head off the top (${at})`);
      const rect = { x0: a.x, x1: b.x, y0: b.y, y1: a.y };
      const covered = Math.max(...decks.map((d) => coveredShare(rect, d)));
      if (covered > 0.151) problems.push(`${id}: ${what} is ${Math.round(covered * 100)}% behind the deck (${at})`);
      if ((a.y - b.y) / size < frontH * 0.42) problems.push(`${id}: ${what} stands too far back to be read (${at}: ${Math.round(((a.y - b.y) / size / frontH) * 100)}% of the front)`);
    };
    const sizeOf = (who) => entry.sizes?.[who] ?? 1;
    for (const [who, at] of Object.entries(entry.places ?? {})) fits(who, at, sizeOf(who));
    for (const [who, life] of Object.entries(entry.life ?? {})) for (const at of [...(life.spots ?? []), ...(life.path ?? [])]) fits(`${who} on their rounds`, at, sizeOf(who));
    for (const [mid, m] of Object.entries(entry.moments ?? {})) for (const [who, p] of Object.entries(m.places ?? {})) if (Array.isArray(p.at)) fits(`${who} in ${mid}`, p.at, sizeOf(who));
    for (const m of d.marks) fits(`mark ${m.id}`, m.at);
    for (let n = 0; n < (entry.partyRow?.of ?? 6); n++) fits(`the party's place ${n + 1}`, partySlot(entry, n));
    // what the page shows of the painting, in fractions of it
    const [x0, y0] = r.fractionOfScreen(0, 0);
    const [x1, y1] = r.fractionOfScreen(W, FLOOR);
    const seen = { x0, x1, y0, y1 };
    const inside = ([x, y], pad = 0) => x >= seen.x0 + pad && x <= seen.x1 - pad && y >= seen.y0 && y <= seen.y1 + 0.03;
    for (const z of d.zones.filter((q) => q.kind === "chalk")) {
      const ys = z.shape.map((p) => p[1]);
      const xs = z.shape.map((p) => p[0]);
      const h = Math.max(...ys) - Math.min(...ys);
      const shownH = Math.min(Math.max(...ys), seen.y1) - Math.max(Math.min(...ys), seen.y0);
      const shownW = Math.min(Math.max(...xs), seen.x1) - Math.max(Math.min(...xs), seen.x0);
      if (shownH < h * 0.8 || shownW <= 0) problems.push(`${id}: chalk zone ${z.id} is mostly off screen`);
    }
    if (d.chalk.mode !== "off" && d.chalk.box && !inside(d.chalk.box, 0.03)) problems.push(`${id}: the box of chalk is off screen`);
    // and nobody of the party stands over it, or a click on the box finds their card (found 2026-10-03, when the party
    // moved into the wings at the front corners where the box was)
    if (d.chalk.mode !== "off" && d.chalk.box) {
      for (let n = 0; n < 6; n++) {
        const p = partySlot(entry, n);
        if (p[1] >= d.chalk.box[1] - 0.004 && Math.abs(p[0] - d.chalk.box[0]) < 0.1) problems.push(`${id}: the party's place ${n + 1} is on top of the box of chalk`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("a new person on the stage takes their routine, their home and their entrance from the entry; the party only a home", () => {
  const entry = { places: { tama: [0.4, 0.8] }, life: { tama: { kind: "wander" } }, enter: { tama: "right" }, yaws: { tama: -12 } };
  const [tama, pc] = mirrorCards({ published: [member("summon-tama"), member("summon-pc-a", { kind: "pc", actorId: "A1" })], def: entry, now: 1790995000.5 });
  assert.deepEqual(tama.life, { kind: "wander" });
  assert.deepEqual(tama.home, [0.4, 0.8]);
  assert.equal(tama.homeYaw, -12);
  assert.deepEqual(tama.enter, { from: "right", t0: 1790995000.5, gait: "walk" });
  assert.equal(pc.life, undefined);
  assert.equal(pc.enter, undefined);
  // 2026-10-03: the party's place in the wings is its home, so a scene can be put back as it was, the party included
  assert.deepEqual(pc.home, pc.at);
  assert.equal(pc.homeYaw, pc.yaw);
  const keyOf = (id) => id.replace(/^summon-/, "");
  const back = { home: true };
  const away = [{ ...tama, at: [0.7, 0.9] }, { ...pc, at: [0.5, 0.8] }];
  assert.deepEqual(momentMoves(back, away, keyOf).map((m) => m.id), ["summon-tama"], "a moment sends the scene's own people home");
  assert.deepEqual(momentMoves({ ...back, party: true }, away, keyOf).map((m) => m.id), ["summon-tama", "summon-pc-a"], "and the party too when it says so");
  // mirrored again, everything Stagecraft wrote is kept, and the entrance is not played twice
  const moved = [{ ...tama, at: [0.6, 0.85], still: true, move: { t0: 5, gait: "walk" } }, pc];
  const again = mirrorCards({ published: [member("summon-tama"), member("summon-pc-a", { kind: "pc", actorId: "A1" })], existing: moved, def: entry, now: 1790995999 });
  assert.deepEqual(again[0].at, [0.6, 0.85]);
  assert.equal(again[0].still, true);
  assert.deepEqual(again[0].move, { t0: 5, gait: "walk" });
  assert.equal(again[0].enter.t0, 1790995000.5, "the entrance keeps its first stamp");
});

test("a moment's formation names who it arranges (the party, everyone, or people by key) and whom it is about", async () => {
  const { formationRequest } = await import("../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs");
  const cards = [{ id: "c1" }, { id: "c2" }, { id: "p1", pc: true }, { id: "p2", pc: true }];
  const keys = { c1: "lucan", c2: "chiyo", p1: "pc-a", p2: "pc-b" };
  const keyOf = (id) => keys[id];
  assert.deepEqual(formationRequest({ kind: "queue", who: "party", dir: "left" }, cards, keyOf).opts.ids, ["p1", "p2"]);
  const all = formationRequest({ kind: "circle", who: "all" }, cards, keyOf);
  assert.equal(all.opts.ids, null);
  assert.equal(all.opts.party, true, "everyone, the party included");
  const gang = formationRequest({ kind: "gangup", who: ["chiyo"], target: "lucan" }, cards, keyOf);
  assert.deepEqual(gang.opts.ids, ["c2", "c1"], "the target is part of it");
  assert.equal(gang.opts.target, "c1", "found by key, sent by card id");
  assert.equal(formationRequest({ kind: "line", who: ["nobody"] }, cards, keyOf), null, "nobody on the stage, nothing to arrange");
  assert.equal(formationRequest(null, cards, keyOf), null);
});

test("two regulars talking: the one each talks to is named by their card on the stage, and nobody not yet revealed", () => {
  const entry = { places: { kiku: [0.4, 0.8], sanzo: [0.6, 0.8] }, life: { kiku: { kind: "wander", faces: "sanzo" }, sanzo: { kind: "wander", faces: "kiku" } } };
  const both = mirrorCards({ published: [member("summon-kiku"), member("summon-sanzo")], def: entry });
  assert.equal(both[0].life.faces, "summon-sanzo");
  assert.equal(both[1].life.faces, "summon-kiku");
  assert.equal(entry.life.kiku.faces, "sanzo", "the stage entry itself is left as it was");
  const alone = mirrorCards({ published: [member("summon-kiku")], def: entry });
  assert.equal(alone[0].life.faces, undefined, "Sanzo is not on the stage: Kiku talks to no one, and his name is not sent");
  assert.equal(JSON.stringify(alone).includes("sanzo"), false);
});

test("a character at 0 HP is down on the stage: their card carries their actor, and their HP says when", async () => {
  const { downByHp, cardOfActor } = await import("../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs");
  const cards = mirrorCards({ published: [member("summon-pc-a", { kind: "pc", actorId: "A1" }), member("summon-nobu")], def });
  assert.equal(cards[0].actor, "A1");
  assert.equal(cards[1].actor, undefined, "the story's people carry no actor");
  assert.equal(cardOfActor(cards, "A1").id, "summon-pc-a");
  assert.equal(cardOfActor(cards, "nope"), null);
  assert.equal(downByHp({ system: { attributes: { hp: { value: 0 } } } }), true);
  assert.equal(downByHp({ system: { attributes: { hp: { value: -3 } } } }), true);
  assert.equal(downByHp({ system: { attributes: { hp: { value: 7 } } } }), false);
  assert.equal(downByHp({ system: {} }), null, "no HP to read: no guess");
  assert.match(read("foundry/stagecraft-bridge.mjs"), /Hooks\.on\("updateActor"/, "the bridge listens for HP changes");
  // a card that is down stays down when the cast is mirrored again
  const again = mirrorCards({ published: [member("summon-pc-a", { kind: "pc", actorId: "A1" })], existing: [{ ...cards[0], down: true }], def });
  assert.equal(again[0].down, true);
});

test("a character's conditions are badges on their card, and the fight's turn finds the card to light", async () => {
  const { badgesByConditions, cardOfCombatant } = await import("../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs");
  assert.deepEqual(badgesByConditions([{ name: "Frightened", value: 2 }, { name: "Prone" }, { name: " Dying ", value: 1 }, { name: "" }, { name: "Wounded", value: 0 }]), ["Frightened 2", "Prone", "Dying 1", "Wounded"]);
  assert.deepEqual(badgesByConditions([]), [], "no conditions: the badges are taken off");
  assert.equal(badgesByConditions(undefined), null, "nothing to read: no guess");
  const cards = mirrorCards({ published: [member("summon-pc-a", { kind: "pc", actorId: "A1" }), member("summon-nobu")], def });
  assert.equal(cardOfCombatant(cards, { actorId: "A1", name: "whoever" }).id, "summon-pc-a", "a party member by their actor");
  const nobu = cards[1];
  assert.equal(cardOfCombatant(cards, { actorId: "Z9", name: ` ${nobu.name.toUpperCase()} ` }).id, nobu.id, "anyone else by the name they go by");
  assert.equal(cardOfCombatant(cards, { actorId: "Z9", name: "Nobody" }), null);
  assert.equal(cardOfCombatant(cards, {}), null);
  // badges survive the cast being mirrored again, like a card that is down
  const again = mirrorCards({ published: [member("summon-pc-a", { kind: "pc", actorId: "A1" })], existing: [{ ...cards[0], badges: ["Prone"] }], def });
  assert.deepEqual(again[0].badges, ["Prone"]);
  assert.match(read("foundry/stagecraft-bridge.mjs"), /Hooks\.on\("updateCombat"/, "the bridge listens for the turn");
  assert.match(read("foundry/stagecraft-bridge.mjs"), /"createItem", "updateItem", "deleteItem"/, "and for conditions coming and going");
});
test("places the GM kept become a stage entry's places, are filed, laid over the stages file, and folded home", async () => {
  const { placesRecord, withKept, applyKept, foldKept } = await import("../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs");
  const keys = { "summon-nobu": "nobu", "summon-pc-a": "pc-a", "summon-ghost": null };
  const homes = [{ id: "summon-nobu", home: [0.61234, 0.6449], homeYaw: -15.04 }, { id: "summon-pc-a", home: [0.2, 0.9], homeYaw: 0 }, { id: "summon-ghost", home: [0.1, 0.1], homeYaw: 3 }, { id: "x", homeYaw: 1 }];
  const rec = placesRecord(homes, (id) => keys[id] ?? null, new Set(["summon-pc-a"]));
  assert.deepEqual(rec, { places: { nobu: [0.612, 0.645] }, yaws: { nobu: -15 } }, "the party's row and unknown cards are not places; a facing of 0 is not written");
  const filed = withKept(null, "e1-kit-issue", rec, "T1");
  assert.equal(filed.scenes["e1-kit-issue"].keptAt, "T1");
  assert.deepEqual(withKept(filed, "e1-canteen", rec, "T2").scenes["e1-kit-issue"].keptAt, "T1", "another scene's record is kept");
  const stages = { stages: { "e1-kit-issue": { places: { nobu: [0.6, 0.64], "section-officer": [0.64, 0.895] }, yaws: { "section-officer": -18 } } } };
  const laid = applyKept(stages, filed);
  assert.deepEqual(laid.stages["e1-kit-issue"].places, { nobu: [0.612, 0.645], "section-officer": [0.64, 0.895] }, "hers wins, the rest stays");
  assert.deepEqual(laid.stages["e1-kit-issue"].yaws, { "section-officer": -18, nobu: -15 });
  assert.deepEqual(stages.stages["e1-kit-issue"].places.nobu, [0.6, 0.64], "the file's own is not touched");
  assert.equal(applyKept(stages, { scenes: { nowhere: { places: { a: [0, 0] } } } }).stages.nowhere, undefined, "a scene the file does not know is ignored");
  assert.equal(applyKept(stages, null), stages);
  const { kept, lines } = foldKept({ scenes: { "e1-kit-issue": { places: { nobu: [0.5, 0.5] }, yaws: {} } } }, filed);
  assert.deepEqual(kept.scenes["e1-kit-issue"].places.nobu, [0.612, 0.645]);
  assert.match(lines[0], /nobu stands at \[0\.612,0\.645\] \(was \[0\.5,0\.5\]\)/);
  assert.deepEqual(foldKept(kept, filed).lines, [], "folding the same keep again changes nothing");
  assert.match(read("foundry/stagecraft-bridge.mjs"), /Hooks\.on\("stagecraft\.keep"/);
});
test("the chalk box's spot is filed with the kept places, laid over the entry's description, and folded home", async () => {
  const { withKept, applyKept, foldKept } = await import("../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs");
  const places = withKept(null, "e1-kit-issue", { places: { nobu: [0.6, 0.6] }, yaws: {} }, "T1");
  const both = withKept(places, "e1-kit-issue", { box: [0.3, 0.9] }, "T2");
  assert.deepEqual(both.scenes["e1-kit-issue"].places, { nobu: [0.6, 0.6] }, "moving the box does not forget the places");
  assert.deepEqual(both.scenes["e1-kit-issue"].box, [0.3, 0.9]);
  assert.deepEqual(withKept(both, "e1-kit-issue", { places: { nobu: [0.7, 0.7] }, yaws: {} }, "T3").scenes["e1-kit-issue"].box, [0.3, 0.9], "nor does a keep of places forget the box");
  const stages = { stages: { "e1-kit-issue": { description: { skin: "brass", chalk: { mode: "zones" } }, places: {} } } };
  const laid = applyKept(stages, both);
  assert.deepEqual(laid.stages["e1-kit-issue"].description.chalk, { mode: "zones", box: [0.3, 0.9] }, "the box goes into the description's chalk, beside what is there");
  assert.equal(stages.stages["e1-kit-issue"].description.chalk.box, undefined);
  const { kept, lines } = foldKept({ scenes: { "e1-kit-issue": { places: {}, yaws: {}, box: [0.5, 0.5] } } }, both);
  assert.deepEqual(kept.scenes["e1-kit-issue"].box, [0.3, 0.9]);
  assert.ok(lines.some((l) => /the box of chalk stands at \[0\.3,0\.9\] \(was \[0\.5,0\.5\]\)/.test(l)));
  assert.deepEqual(foldKept(kept, both).lines, []);
  assert.match(read("foundry/stagecraft-bridge.mjs"), /Hooks\.on\("stagecraft\.keepBox"/);
});
test("marks and zones the GM moved: filed as what differs from the stages file, laid over it, and folded home", async () => {
  const { stageRecord, withKept, applyKept, foldKept } = await import("../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs");
  const authored = { marks: [{ id: "a", at: [0.5, 0.9] }, { at: [0.2, 0.2] }], zones: [{ id: "wall", shape: [[0, 0], [1, 0], [1, 1]] }, { id: "door", shape: [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2]] }] };
  const rec = stageRecord(
    [{ id: "a", at: [0.55, 0.9] }, { id: "mark-2", at: [0.2, 0.2] }],
    [{ id: "wall", shape: [[0, 0], [1, 0], [1, 1]] }, { id: "door", shape: [[0.1, 0.1], [0.3, 0.1], [0.2, 0.2]] }],
    authored
  );
  assert.deepEqual(rec, { marks: { a: { at: [0.55, 0.9] } }, zones: { door: { shape: [[0.1, 0.1], [0.3, 0.1], [0.2, 0.2]] } } }, "only what differs from the stages file; an unnamed mark is mark-2");
  const filed = withKept(null, "e1-x", rec, "T1");
  const stages = { stages: { "e1-x": { description: authored, places: {} } } };
  const laid = applyKept(stages, filed).stages["e1-x"].description;
  assert.deepEqual(laid.marks[0].at, [0.55, 0.9]);
  assert.deepEqual(laid.marks[1], authored.marks[1], "an unmoved mark is as authored");
  assert.deepEqual(laid.zones[1].shape, [[0.1, 0.1], [0.3, 0.1], [0.2, 0.2]]);
  assert.deepEqual(authored.marks[0].at, [0.5, 0.9], "the stages file's own is not touched");
  const first = foldKept(null, filed);
  assert.ok(first.lines.some((l) => /mark a moved/.test(l)) && first.lines.some((l) => /zone door moved/.test(l)));
  assert.deepEqual(foldKept(first.kept, filed).lines, [], "folding the same edit again changes nothing");
  // putting a mark back where its author had it takes it out of the kept file
  const back = withKept(filed, "e1-x", stageRecord([{ id: "a", at: [0.5, 0.9] }], [{ id: "door", shape: [[0.1, 0.1], [0.3, 0.1], [0.2, 0.2]] }], authored), "T2");
  const next = foldKept(first.kept, back);
  assert.deepEqual(next.kept.scenes["e1-x"].marks, {});
  assert.ok(next.lines.some((l) => /mark a put back/.test(l)));
  // and it leaves the places and the box alone
  assert.deepEqual(withKept(withKept(null, "e1-x", { places: { n: [1, 1] }, yaws: {} }, "T0"), "e1-x", rec, "T1").scenes["e1-x"].places, { n: [1, 1] });
  assert.match(read("foundry/stagecraft-bridge.mjs"), /Hooks\.on\("stagecraft\.keepStage"/);
});

test("an authored moment moves the people it names (by their real id), and may send everyone else home", async () => {
  const { momentsOf } = await import("../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs");
  const cards = [{ id: "c1", home: [0.2, 0.9] }, { id: "c2", home: [0.5, 0.9] }, { id: "pc", pc: true, at: [0.5, 0.95] }];
  const keys = { c1: "kiku", c2: "sanzo", pc: "pc" };
  const moment = { label: "A round", gait: "stroll", places: { kiku: { at: [0.4, 0.8], yaw: 10 }, nobody: { at: [0.1, 0.1] } }, home: true };
  const moves = momentMoves(moment, cards, (id) => keys[id]);
  assert.deepEqual(moves.map((m) => [m.id, m.at, m.gait, m.still]), [["c1", [0.4, 0.8], "stroll", true], ["c2", [0.5, 0.9], "stroll", false]]);
  assert.equal(moves[0].yaw, 10);
  assert.deepEqual(momentsOf({ moments: { a: { label: "A" }, b: { label: "B" } } }).map((m) => m.id), ["a", "b"]);
  assert.deepEqual(momentsOf(null), []);
});

/* ------------------------------------------------------------------ who stands where */

const member = (portraitId, extra = {}) => ({ portraitId, label: portraitId, revealed: true, ...extra });
const def = { places: { nobu: [0.6, 0.64] }, npcSlots: [[0.2, 0.9], [0.4, 0.9]], partyRow: { y: 0.95, x: [0.2, 0.8], of: 6 }, sizes: { nobu: 1.5 } };

test("a person is looked up by their real id when they have one (the published id is an alias for a protected person)", () => {
  assert.equal(rawKeyOf({ portraitId: "summon-nobu" }), "nobu");
  assert.equal(rawKeyOf({ portraitId: "summon-abc123" }, { nameKey: "section-officer" }), "section-officer");
});

test("the party stands in a row across the front, six places, none the same", () => {
  const slots = Array.from({ length: 6 }, (_, n) => partySlot(def, n));
  assert.equal(new Set(slots.map((s) => s.join())).size, 6);
  assert.ok(slots.every(([x, y]) => x >= 0.2 && x <= 0.8 && y === 0.95));
  assert.ok(slots[0][0] < slots[5][0]);
});

test("a new card goes where its entry says, else to the next free slot, and two never arrive on the same spot", () => {
  const cards = mirrorCards({ published: [member("summon-nobu"), member("summon-x"), member("summon-y"), member("summon-z")], def });
  assert.deepEqual(cards[0].at, [0.6, 0.64], "named");
  assert.deepEqual(cards[1].at, [0.2, 0.9], "first slot");
  assert.deepEqual(cards[2].at, [0.4, 0.9], "next slot");
  const spots = cards.map((c) => c.at.join());
  assert.equal(new Set(spots).size, spots.length, "all different");
  assert.equal(cards[0].size, 1.5, "a size the entry gives");
});

test("a card's line of text comes from its entry's `titles`, or from the cast member's own, and follows a change to it", () => {
  const withTitles = { ...def, titles: { nobu: "Quartermaster\nKit Issue", blank: "   " } };
  const cards = mirrorCards({ published: [member("summon-nobu"), member("summon-blank"), member("summon-x"), member("summon-y", { title: "Her own line" })], def: withTitles });
  assert.equal(cards[0].title, "Quartermaster\nKit Issue", "the entry gives it, line breaks and all");
  assert.equal(cards[1].title, undefined, "a title of nothing is none");
  assert.equal(cards[2].title, undefined, "nobody else has one");
  assert.equal(cards[3].title, "Her own line", "a cast member may carry its own");
  assert.equal(mirrorCards({ published: [member("summon-nobu", { title: "Overridden" })], def: withTitles })[0].title, "Quartermaster\nKit Issue", "the entry wins over the member");
  // a card already on the stage follows a changed title, though it keeps where it was put
  const first = mirrorCards({ published: [member("summon-nobu")], def });
  const placed = [{ ...first[0], at: [0.3, 0.8], mark: "counter-1" }];
  const later = mirrorCards({ published: [member("summon-nobu")], existing: placed, def: withTitles });
  assert.equal(later[0].title, "Quartermaster\nKit Issue");
  assert.deepEqual(later[0].at, [0.3, 0.8]);
  assert.equal(mirrorCards({ published: [member("summon-nobu")], def: { ...withTitles, titles: {} } })[0].title, undefined, "and loses it when the entry drops it");
});

test("the bridge mirrors only the scenes the adventure built: a Stagecraft scene made any other way keeps its own cast", async () => {
  const { ownsScene } = await import("../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs");
  assert.equal(ownsScene("e1-kit-issue"), true, "a scene its sync built carries a sourceId");
  assert.equal(ownsScene(undefined), false, "one made by hand does not");
  assert.equal(ownsScene(null), false);
  assert.equal(ownsScene(""), false);
  assert.equal(ownsScene("   "), false);
  assert.equal(ownsScene(42), false);
  // and the Foundry side asks before it mirrors a cast or puts the party on a stage (found 2026-10-04: a test scene's cards were cleared)
  const bridge = readFileSync(path.join(root, "module", "blank-inheritance", "scripts", "foundry", "stagecraft-bridge.mjs"), "utf8");
  for (const fn of ["mirrorScene", "ensureParty"]) {
    const body = bridge.slice(bridge.indexOf(`export async function ${fn}(`));
    const head = body.slice(0, body.indexOf("\n}\n"));
    assert.match(head, /ownsScene\(scene\.getFlag\(MODULE_ID, "sourceId"\)\)/, `${fn} leaves a scene that is not the adventure's alone`);
  }
});

test("members of the party are cards held by their players, in the front row", () => {
  const cards = mirrorCards({
    published: [member("summon-pc-a", { kind: "pc", actorId: "A1" }), member("summon-pc-b", { kind: "pc", actorId: "B1" })],
    def, ownersOf: (id) => (id === "A1" ? ["userA"] : ["userB"])
  });
  assert.deepEqual(cards.map((c) => c.owners), [["userA"], ["userB"]]);
  assert.ok(cards.every((c) => c.pc && c.at[1] === 0.95));
  assert.notDeepEqual(cards[0].at, cards[1].at);
});

test("where a card was put down is kept when the cast is mirrored again, and a new arrival does not disturb it", () => {
  const first = mirrorCards({ published: [member("summon-nobu")], def });
  const moved = [{ ...first[0], at: [0.3, 0.8], yaw: 20, mark: "counter-1" }];
  const again = mirrorCards({ published: [member("summon-nobu"), member("summon-x")], existing: moved, def });
  assert.deepEqual(again[0].at, [0.3, 0.8]);
  assert.equal(again[0].yaw, 20);
  assert.equal(again[0].mark, "counter-1");
  assert.equal(sameCards(mirrorCards({ published: [member("summon-nobu")], existing: moved, def }), moved), true, "nothing to write when nothing changed");
});

test("someone who leaves the published cast leaves the stage", () => {
  const first = mirrorCards({ published: [member("summon-a"), member("summon-b")], def });
  const after = mirrorCards({ published: [member("summon-b")], existing: first, def });
  assert.deepEqual(after.map((c) => c.id), ["summon-b"]);
});

test("Law 11: a concealed person is on no card, and a protected person's card carries only the name the table has", () => {
  const authored = [
    member("summon-vetch", { called: "the officer", nameKey: "section-officer", label: "Vetch", img: "modules/blank-inheritance/assets/stage/stage-art-section-officer.webp" }),
    { portraitId: "summon-secret", label: "The Watcher's Friend", revealed: false, img: "modules/blank-inheritance/assets/stage/secret.webp" }
  ];
  const published = publishedCast(authored, new Set());
  const cards = mirrorCards({ published, authored, def: { places: { "section-officer": [0.5, 0.5] } } });
  assert.equal(cards.length, 1, "the concealed person is not a card");
  assert.equal(cards[0].name, "the officer", "the table's own line, not the real name");
  assert.deepEqual(cards[0].at, [0.5, 0.5], "found by the real id on the GM's side");
  const wire = JSON.stringify(cards);
  assert.equal(wire.includes("Vetch"), false);
  assert.equal(wire.includes("Watcher"), false);
  assert.equal(wire.includes("secret"), false);
  assert.deepEqual(leaksConcealed(cards, authored), []);
});

/* ------------------------------------------------------------------ the Foundry side, read as text and as a stand-in */

const read = (p) => readFileSync(path.join(moduleDir, "scripts", p), "utf8");

test("the older overlay of frames does not mount on a scene Stagecraft draws, and does everywhere else", async () => {
  assert.match(read("foundry/stage.mjs"), /!stagecraftDraws\(canvas\.scene\)/);
  const { stagecraftDraws } = await import("../module/blank-inheritance/scripts/foundry/stagecraft-gate.mjs");
  const scene = { flags: { stagecraft: { stage: { painting: {} } } } };
  globalThis.game = { modules: new Map([["stagecraft", { active: true }]]) };
  assert.equal(stagecraftDraws(scene), true);
  assert.equal(stagecraftDraws({ flags: {} }), false, "no description, no stage");
  globalThis.game = { modules: new Map([["stagecraft", { active: false }]]) };
  assert.equal(stagecraftDraws(scene), false, "the module is off");
  globalThis.game = { modules: new Map() };
  assert.equal(stagecraftDraws(scene), false, "the module is not installed");
  delete globalThis.game;
});

test("the bridge does its part with nobody pressing anything: skin before the first scene, switch on, stages, cast, party, triggers", () => {
  const bridge = read("foundry/stagecraft-bridge.mjs");
  assert.match(bridge, /Hooks\.once\("stagecraft\.init"/, "the skin is handed over at init");
  assert.match(bridge, /moduleConfiguration/, "the module is switched on in the world");
  assert.match(bridge, /blankInheritance\.triggerFired/);
  assert.match(read("foundry/scene-runner.mjs"), /Hooks\.callAll\("blankInheritance\.triggerFired"/, "the Runner announces a fired trigger");
  assert.match(read("blank-inheritance.mjs"), /startStagecraftBridge\(\)/, "and it starts at ready");
});

test("the brass skin the bridge hands over is a skin Stagecraft accepts", async () => {
  globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
  const { brass } = await import("../module/blank-inheritance/scripts/foundry/stagecraft-brass-skin.mjs");
  const { SkinRegistry } = await import("../module/stagecraft/scripts/skins/registry.mjs");
  const skins = new SkinRegistry();
  assert.equal(skins.register(brass), "brass");
  assert.ok(skins.list().includes("brass"));
  delete globalThis.document;
});

test("the story's people are the GMs' to move: their cards name the GMs, a player's card names the player", () => {
  const cards = mirrorCards({
    published: [member("summon-nobu"), member("summon-pc-a", { kind: "pc", actorId: "A1" })],
    def, ownersOf: () => ["userA"], npcOwners: ["gm1", "gm2"]
  });
  assert.deepEqual(cards[0].owners, ["gm1", "gm2"]);
  assert.deepEqual(cards[1].owners, ["userA"]);
  assert.equal(mirrorCards({ published: [member("summon-nobu")], def })[0].owners, undefined, "with no GM named there is no restriction to write");
});

test("every emote a stage gives someone is one Stagecraft draws, and it belongs to someone on that stage", async () => {
  const { EMOTES } = await import("../module/stagecraft/scripts/core/emotes.mjs");
  for (const [id, entry] of Object.entries(stages.stages)) {
    for (const [who, emote] of Object.entries(entry.emotes ?? {})) {
      assert.ok(EMOTES[emote], `${id}: ${who} is given "${emote}", which is not an emote`);
      assert.ok(who in (entry.places ?? {}), `${id}: ${who} has an emote but no place on the stage`);
    }
  }
});

test("an emote someone chose at the table (or cleared) is kept when the scene is laid out again; one the scene gave is the scene's", () => {
  const withHabit = { ...def, emotes: { nobu: "music" } };
  const cards = mirrorCards({ published: [member("summon-nobu")], def: withHabit });
  assert.equal(cards[0].emote.id, "music", "the scene's habit");
  assert.equal(cards[0].emote.chosen, undefined);
  const chosen = { id: "laugh", t0: 1790995001.25, once: true, chosen: true };
  for (const relayout of [false, true]) {
    const again = mirrorCards({ published: [member("summon-nobu"), member("summon-x")], existing: [{ ...cards[0], emote: chosen }], def: withHabit, relayout, now: 1790995002 });
    assert.deepEqual(again[0].emote, chosen, `a chosen emote survives${relayout ? " a fresh layout" : ""}`);
  }
  const cleared = mirrorCards({ published: [member("summon-nobu")], existing: [{ ...cards[0], emote: { id: null, chosen: true } }], def: withHabit });
  assert.deepEqual(cleared[0].emote, { id: null, chosen: true }, "a habit cleared from the card's menu does not come back");
  const habitAgain = mirrorCards({ published: [member("summon-nobu")], existing: [{ ...cards[0], emote: { id: "sleep", t0: 1 } }], def: withHabit });
  assert.equal(habitAgain[0].emote.id, "music", "a habit the scene once gave is the scene's to change");
});
