/**
 * The playtest's dice tooling (tools/playtest/core/dice.mjs, browser/dice-governor.js).
 *
 * Three layers of proof. The pure rule is held to sf2e's own table of degrees (including the natural 20 and natural 1 steps and the
 * clamps at both ends); the uniform-to-face mapping is held to Foundry's formula for every die; and the in-page governor, the very
 * script Chrome is given, is run here against a small stand-in for Foundry's Roll classes, to prove it forces exactly the roll it was
 * armed for, once, and records it as forced.
 */

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import { DEGREES, decideFace, degreeOf, faceToUniform, findPlanEntry, hashSeed, mulberry32, naturalsFor, normalizePlanEntry, parseDegree, pickNatural, summarizeTape, uniformToFace } from "../../tools/playtest/core/dice.mjs";
import { diceGovernorSource } from "../../tools/playtest/browser/scripts.mjs";

test("degreeOf follows sf2e: DC steps of ten, then a natural 20 or 1 moves one step", () => {
  // modifier +5 against DC 15: total = natural + 5
  assert.equal(degreeOf(10, 5, 15), 2, "total 15 meets the DC: success");
  assert.equal(degreeOf(9, 5, 15), 1, "total 14 is below the DC: failure");
  assert.equal(degreeOf(20, 5, 15), 3, "25 is ten over: critical success");
  assert.equal(degreeOf(2, 5, 15), 1, "total 7 is eight under: a plain failure");
  assert.equal(degreeOf(1, 5, 15), 0, "a natural 1 turns a failure into a critical failure");
  assert.equal(degreeOf(1, 25, 15), 2, "26 is ten over, a critical success; a natural 1 lowers it one step: success");
  assert.equal(degreeOf(20, -5, 30), 1, "total 15 against DC 30 is fifteen under (a critical failure); the natural 20 raises it one step, to a failure");
  assert.equal(degreeOf(20, 0, 15), 3, "a natural 20 raises a success to a critical success");
  assert.equal(degreeOf(20, 30, 10), 3, "the top is the top");
  assert.equal(degreeOf(1, -30, 10), 0, "the bottom is the bottom");
  assert.equal(degreeOf(5, 5, 15), 1, "total 10 is five under: failure");
  assert.equal(degreeOf(5, 0, 15), 0, "total 5 is ten under: critical failure");
});

test("naturalsFor lists exactly the faces that give a degree, and is empty when it is out of reach", () => {
  const all = new Set();
  for (const target of [0, 1, 2, 3]) for (const n of naturalsFor(target, 5, 15)) all.add(n);
  assert.equal(all.size, 20, "every face gives exactly one degree");
  for (const target of [0, 1, 2, 3]) for (const n of naturalsFor(target, 5, 15)) assert.equal(degreeOf(n, 5, 15), target);
  assert.deepEqual(naturalsFor(3, -20, 30), [], "a natural 20 lifts a hopeless roll only one step, so a critical success is out of reach at -20 against DC 30");
  assert.deepEqual(naturalsFor(0, 40, 10), [], "a natural 1 lowers a +40 roll against DC 10 only one step, to a success, so a critical failure is out of reach");
});

test("pickNatural avoids the extreme faces when it can, and says null when the degree cannot be reached", () => {
  const rng = () => 0.5;
  for (const target of [0, 1, 2, 3]) {
    const face = pickNatural(target, 5, 15, { rng });
    assert.notEqual(face, null);
    assert.equal(degreeOf(face, 5, 15), target);
    const plainExists = naturalsFor(target, 5, 15).some((n) => n !== 1 && n !== 20);
    if (plainExists) assert.ok(face !== 1 && face !== 20, );
  }
  assert.equal(pickNatural(0, 40, 10), null);
  assert.ok([1, 20].includes(pickNatural(3, 5, 15, { prefer: "extreme", rng })), "extreme asks for the 1 or the 20");
  const plain = naturalsFor(2, 5, 15).filter((n) => n !== 1 && n !== 20);
  assert.equal(pickNatural(2, 5, 15, { prefer: "low", rng }), plain[0]);
  assert.equal(pickNatural(2, 5, 15, { prefer: "high", rng }), plain[plain.length - 1]);
});

test("faceToUniform is the inverse of Foundry's own mapping, for every die", () => {
  for (const faces of [2, 4, 6, 8, 10, 12, 20, 100]) {
    for (let face = 1; face <= faces; face++) {
      const r = faceToUniform(face, faces);
      assert.ok(r >= 0 && r < 1, `d${faces} face ${face}: ${r} is in [0, 1)`);
      assert.equal(uniformToFace(r, faces), face, `d${faces} face ${face}`);
    }
  }
});

test("the seeded generator replays, and different seeds differ", () => {
  const a = mulberry32(hashSeed("run-1:P3"));
  const b = mulberry32(hashSeed("run-1:P3"));
  const c = mulberry32(hashSeed("run-1:P4"));
  const seqA = Array.from({ length: 12 }, a);
  assert.deepEqual(seqA, Array.from({ length: 12 }, b));
  assert.notDeepEqual(seqA, Array.from({ length: 12 }, c));
  assert.ok(seqA.every((x) => x >= 0 && x < 1));
  assert.equal(hashSeed("abc"), hashSeed("abc"));
  assert.notEqual(hashSeed("abc"), hashSeed("abd"));
});

test("parseDegree accepts what an operator would type", () => {
  assert.equal(parseDegree("crit-fail"), 0);
  assert.equal(parseDegree("Critical Failure"), 0);
  assert.equal(parseDegree("fail"), 1);
  assert.equal(parseDegree("success"), 2);
  assert.equal(parseDegree("crit-success"), 3);
  assert.equal(parseDegree("critical_success"), 3);
  assert.equal(parseDegree(2), 2);
  assert.equal(parseDegree("maybe"), null);
  assert.equal(parseDegree(7), null);
  assert.deepEqual(DEGREES, ["criticalFailure", "failure", "success", "criticalSuccess"]);
});

test("a plan entry must name a degree or a face, and says why when it is wrong", () => {
  assert.equal(normalizePlanEntry({}).ok, false);
  assert.match(normalizePlanEntry({ degree: "banana" }).error, /unknown degree/);
  assert.match(normalizePlanEntry({ natural: 21 }).error, /1 to 20/);
  assert.match(normalizePlanEntry({ degree: "fail", count: 0 }).error, /count/);
  assert.match(normalizePlanEntry({ degree: "fail", dc: "x" }).error, /dc/);
  const ok = normalizePlanEntry({ seat: "P3", degree: "fail", dc: 15, count: 2 });
  assert.equal(ok.ok, true);
  assert.deepEqual({ seat: ok.entry.seat, degree: ok.entry.degree, dc: ok.entry.dc, count: ok.entry.count }, { seat: "P3", degree: 1, dc: 15, count: 2 });
});

test("a plan entry for a seat beats a wildcard, and a scene or check narrows it", () => {
  const plan = [normalizePlanEntry({ degree: "fail" }).entry, normalizePlanEntry({ seat: "P3", degree: "success" }).entry, normalizePlanEntry({ seat: "P3", degree: "crit-fail", scene: "s2" }).entry];
  assert.equal(findPlanEntry(plan, { seat: "P3", scene: "s1" }), 1);
  assert.equal(findPlanEntry(plan, { seat: "P4", scene: "s1" }), 0);
  assert.equal(findPlanEntry(plan, { seat: "P3", scene: "s2" }), 1, "the first matching seat entry wins");
  assert.equal(findPlanEntry([plan[2]], { seat: "P3", scene: "s1" }), -1);
});

test("decideFace gives the face and the degree it will produce, or the reason it cannot", () => {
  const degree = normalizePlanEntry({ degree: "success", dc: 15 }).entry;
  const d = decideFace(degree, { modifier: 5, dc: null, rng: () => 0.5 });
  assert.equal(degreeOf(d.face, 5, 15), 2);
  assert.equal(d.degree, 2);
  assert.match(decideFace(normalizePlanEntry({ degree: "success" }).entry, { modifier: 5, dc: null }).reason, /no DC/);
  assert.match(decideFace(degree, { modifier: null, dc: 15 }).reason, /cannot add up/);
  assert.match(decideFace(normalizePlanEntry({ degree: "crit-fail", dc: 10 }).entry, { modifier: 40, dc: 10 }).reason, /out of reach/);
  const exact = decideFace(normalizePlanEntry({ natural: 14 }).entry, { modifier: 5, dc: 15 });
  assert.deepEqual({ face: exact.face, degree: exact.degree }, { face: 14, degree: 2 });
  assert.equal(decideFace(normalizePlanEntry({ natural: 14 }).entry, { modifier: null, dc: null }).degree, null, "an exact face needs no DC");
});

test("summarizeTape counts forced and natural rolls and the degrees", () => {
  const s = summarizeTape([{ natural: 20, degree: 3, forced: false }, { natural: 1, degree: 0, forced: true }, { natural: 9, degree: null, forced: true }, { notARoll: true }]);
  assert.equal(s.rolls, 3);
  assert.equal(s.forced, 2);
  assert.equal(s.natural, 1);
  assert.equal(s.nat1, 1);
  assert.equal(s.nat20, 1);
  assert.equal(s.byDegree.unknown, 1);
});

// --- the governor, the real script, against a stand-in for Foundry ----------------------------------------------------------------

async function fakeFoundry({ session = { key: "beat:the-store", dc: 15 } } = {}) {
  const CONFIG = { Dice: { randomUniform: () => 0.5 } };
  class DiceTerm {
    constructor(faces, number = 1) {
      this.faces = faces;
      this.number = number;
      this.results = [];
    }
    randomFace() {
      return this.mapRandomFace(CONFIG.Dice.randomUniform());
    }
    mapRandomFace(r) {
      return Math.ceil((1 - r) * this.faces);
    }
  }
  class Die extends DiceTerm {}
  class OperatorTerm {
    constructor(operator) {
      this.operator = operator;
    }
  }
  class NumericTerm {
    constructor(number) {
      this.number = number;
    }
  }
  class Roll {
    constructor(terms, label) {
      this.terms = terms;
      this.formula = label;
    }
    async evaluate() {
      for (const t of this.terms) if (t instanceof DiceTerm) for (let i = 0; i < t.number; i++) t.results.push({ result: t.randomFace(), active: true });
      this.total = this.terms.reduce((sum, t, i) => {
        if (t instanceof DiceTerm) return sum + t.results[0].result;
        if (t instanceof NumericTerm) return sum + (this.terms[i - 1]?.operator === "-" ? -t.number : t.number);
        return sum;
      }, 0);
      return this;
    }
  }
  const events = [];
  const context = {
    foundry: { dice: { Roll, terms: { DiceTerm, Die, OperatorTerm, NumericTerm } } },
    CONFIG,
    game: { settings: { get: (m, k) => (k === "checkConsole" ? { session } : null) } },
    canvas: { scene: { id: "scene-1" } },
    __pt: { push: (type, data) => events.push({ type, ...data }), events: [] },
    setInterval: (fn) => {
      setTimeout(fn, 0);
      return 1;
    },
    clearInterval: () => {},
    console,
    Date,
    Math,
    Array,
    Number,
    JSON,
    Object
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(diceGovernorSource(), context);
  await new Promise((resolve) => setTimeout(resolve, 15)); // the governor installs on its first timer tick
  const make = (modifier = 5, { dice = 1, sign = "+" } = {}) => new context.foundry.dice.Roll([new context.foundry.dice.terms.Die(20, dice), new context.foundry.dice.terms.OperatorTerm(sign), new context.foundry.dice.terms.NumericTerm(modifier)], `${dice}d20 ${sign} ${modifier}`);
  return { context, make, events, G: () => context.window.__ptDice };
}

test("the governor, run as Chrome would run it, forces the armed roll once and records it as forced", async () => {
  const { make, G, events } = await fakeFoundry();
  G().configure({ seat: "P3" });
  assert.equal(G().arm({ degree: "failure", count: 1 }).ok, true);
  const first = await make(5).evaluate();
  const n = first.terms[0].results[0].result;
  assert.equal(degreeOf(n, 5, 15), 1, `the armed roll is a failure against the open check's DC 15 (rolled ${n})`);
  assert.notEqual(n, 1);
  assert.notEqual(n, 20);
  const second = await make(5).evaluate();
  assert.equal(second.terms[0].results[0].result, 10, "after one use the plan is empty: the next roll is the ordinary draw (0.5 maps to 10)");
  const tape = G().drain();
  assert.equal(tape.length, 2);
  assert.equal(tape[0].forced, true);
  assert.equal(tape[0].degree, 1);
  assert.equal(tape[0].dc, 15);
  assert.equal(tape[0].check, "beat:the-store");
  assert.equal(tape[1].forced, false);
  assert.equal(events.filter((e) => e.type === "dice").length, 2, "every roll is also reported to the hub");
});

test("the governor can be armed with an exact face, and with a degree it cannot reach it refuses and keeps the plan", async () => {
  const { make, G } = await fakeFoundry();
  G().configure({ seat: "P3" });
  G().arm({ natural: 17 });
  assert.equal((await make(2).evaluate()).terms[0].results[0].result, 17);
  G().arm({ degree: "crit-fail", dc: 10 });
  const r = await make(40).evaluate();
  assert.equal(r.terms[0].results[0].result, 10, "out of reach: the roll is left natural");
  const tape = G().drain();
  assert.match(tape[tape.length - 1].why, /out of reach/);
  assert.equal(G().status().plan.length, 1, "the unserved entry stays armed");
});

test("with no open check there is no DC, so a degree cannot be forced without one, but a dc on the arming serves", async () => {
  const { make, G } = await fakeFoundry({ session: null });
  G().configure({ seat: "P1" });
  G().arm({ degree: "success" });
  const r = await make(5).evaluate();
  assert.equal(r.terms[0].results[0].result, 10);
  assert.match(G().drain()[0].why, /no DC/);
  G().clear();
  G().arm({ degree: "success", dc: 18 });
  const forced = await make(5).evaluate();
  assert.equal(degreeOf(forced.terms[0].results[0].result, 5, 18), 2);
});

test("seeding makes every natural roll repeat, per seat", async () => {
  const run = async (seat, seed) => {
    const { make, G } = await fakeFoundry();
    G().configure({ seat, seed });
    const out = [];
    for (let i = 0; i < 6; i++) out.push((await make(0).evaluate()).terms[0].results[0].result);
    return out;
  };
  assert.deepEqual(await run("P2", "run-9"), await run("P2", "run-9"));
  assert.notDeepEqual(await run("P2", "run-9"), await run("P5", "run-9"));
});

test("fortune and misfortune (two d20) are forced on both dice, so the kept one is the armed face", async () => {
  const { make, G } = await fakeFoundry();
  G().configure({ seat: "P3" });
  G().arm({ natural: 4 });
  const r = await make(0, { dice: 2 }).evaluate();
  assert.deepEqual(r.terms[0].results.map((x) => x.result), [4, 4]);
});

test("a roll with other dice in it cannot be added up, so only an exact face can be forced on it", async () => {
  const { make, G, context } = await fakeFoundry();
  G().configure({ seat: "P3" });
  const roll = new context.foundry.dice.Roll([new context.foundry.dice.terms.Die(20), new context.foundry.dice.terms.OperatorTerm("+"), new context.foundry.dice.terms.Die(4)], "1d20 + 1d4");
  G().arm({ degree: "success", dc: 15 });
  await roll.evaluate();
  assert.match(G().drain()[0].why, /cannot add up/);
  void make;
});
