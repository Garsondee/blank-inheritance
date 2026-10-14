// ---- the dice governor: the page's half of the dice tooling (design/playtest-process.md, "dice and other tooling") ----
// This file is appended to the SOURCE OF core/dice.mjs (its `export`s stripped) inside one function, by browser/scripts.mjs, so the
// functions below (degreeOf, decideFace, findPlanEntry, normalizePlanEntry, mulberry32, hashSeed) are the very ones the tests hold to
// sf2e's rule. It does two things to the page, both visible in the tape and neither silent:
//   - seeds the dice: CONFIG.Dice.randomUniform draws from a generator seeded by "<run seed>:<seat>", so a run replays
//   - forces the next d20 of THIS seat to a degree or an exact face when the operator has armed it
// Every roll is written to window.__ptDice.tape, and to the page's event log, with whether it was forced.

const pt = window.__pt || (window.__pt = { events: [], push() {} });
const G = (window.__ptDice = { seat: null, seed: null, rng: null, plan: [], tape: [], installed: false, lastError: null });

G.configure = ({ seat, seed } = {}) => {
  if (seat) G.seat = seat;
  if (seed) {
    G.seed = seed;
    G.rng = mulberry32(hashSeed(`${seed}:${G.seat}`));
  } else if (seed === null) {
    G.seed = null;
    G.rng = null;
  }
  return { seat: G.seat, seed: G.seed };
};
G.arm = (spec) => {
  const result = normalizePlanEntry({ ...spec, seat: spec.seat ?? G.seat });
  if (!result.ok) return result;
  G.plan.push(result.entry);
  return { ok: true, plan: G.plan.length };
};
G.clear = () => {
  const n = G.plan.length;
  G.plan.length = 0;
  return n;
};
G.drain = () => G.tape.splice(0);
G.status = () => ({ seat: G.seat, seed: G.seed, installed: G.installed, plan: G.plan.map((e) => ({ ...e })), tape: G.tape.length, lastError: G.lastError });

const contextNow = () => {
  let session = null;
  try {
    session = game.settings.get("blank-inheritance", "checkConsole")?.session ?? null;
  } catch {
    session = null;
  }
  return { seat: G.seat, scene: (window.canvas && canvas.scene && canvas.scene.id) || null, check: (session && (session.key || session.id)) || null, dc: session && Number.isFinite(session.dc) ? session.dc : null };
};

const d20Of = (roll) => roll.terms.find((t) => t instanceof foundry.dice.terms.Die && t.faces === 20) || null;

// The flat modifier of a roll like "1d20 + 7 - 1", or null when the roll has anything else in it (more dice, brackets).
const modifierOf = (roll, d20) => {
  let sign = 1;
  let total = 0;
  for (const term of roll.terms) {
    if (term === d20) continue;
    if (term instanceof foundry.dice.terms.OperatorTerm) {
      if (term.operator === "+") sign = 1;
      else if (term.operator === "-") sign = -1;
      else return null;
      continue;
    }
    if (term instanceof foundry.dice.terms.NumericTerm) {
      total += sign * term.number;
      sign = 1;
      continue;
    }
    return null;
  }
  return total;
};

function prepare(roll) {
  const d20 = d20Of(roll);
  if (!d20) return null;
  const modifier = modifierOf(roll, d20);
  const ctx = contextNow();
  const info = { formula: roll.formula, modifier, ctx, forced: false, entry: null, reason: null, plannedDegree: null };
  const index = findPlanEntry(G.plan, ctx);
  if (index < 0) return info;
  const entry = G.plan[index];
  info.entry = { ...entry };
  const decision = decideFace(entry, { modifier, dc: ctx.dc, rng: G.rng || Math.random });
  if (decision.face === null) {
    info.reason = decision.reason;
    return info; // the entry stays armed: the next roll may be one it can serve
  }
  d20.__ptForce = d20.number > 1 ? Array(d20.number).fill(decision.face) : decision.face;
  info.forced = true;
  info.plannedDegree = decision.degree;
  entry.count -= 1;
  if (entry.count <= 0) G.plan.splice(index, 1);
  return info;
}

function record(roll, info) {
  if (!info) return;
  const d20 = d20Of(roll);
  const results = (d20 && d20.results) || [];
  const kept = results.find((r) => r.active !== false) || results[0];
  const natural = kept ? kept.result : null;
  const dc = info.ctx.dc;
  const degree = Number.isInteger(natural) && info.modifier !== null && dc !== null ? degreeOf(natural, info.modifier, dc) : null;
  const entry = {
    t: Date.now(),
    seat: G.seat,
    formula: info.formula,
    natural,
    modifier: info.modifier,
    total: roll.total === undefined ? null : roll.total,
    dc,
    dcSource: dc === null ? null : "the open check's DC (not necessarily this roll's)",
    degree,
    forced: info.forced,
    plannedDegree: info.plannedDegree,
    why: (info.entry && info.entry.note) || info.reason || "",
    scene: info.ctx.scene,
    check: info.ctx.check
  };
  G.tape.push(entry);
  if (pt.push) pt.push("dice", entry);
}

function install() {
  if (G.installed) return;
  const DiceTerm = foundry.dice.terms.DiceTerm;
  const originalRandom = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => (G.rng ? G.rng() : originalRandom());
  const originalFace = DiceTerm.prototype.randomFace;
  DiceTerm.prototype.randomFace = function randomFace() {
    if (this.__ptForce !== undefined && this.faces === 20) {
      const queue = this.__ptForce;
      let face;
      if (Array.isArray(queue)) {
        face = queue.shift();
        if (!queue.length) delete this.__ptForce;
      } else {
        face = queue;
        delete this.__ptForce;
      }
      if (face !== undefined) return face;
    }
    return originalFace.call(this);
  };
  const Roll = foundry.dice.Roll;
  const originalEvaluate = Roll.prototype.evaluate;
  Roll.prototype.evaluate = async function evaluate(...args) {
    let info = null;
    try {
      info = prepare(this);
    } catch (error) {
      G.lastError = String((error && error.stack) || error);
    }
    const result = await originalEvaluate.apply(this, args);
    try {
      record(this, info);
    } catch (error) {
      G.lastError = String((error && error.stack) || error);
    }
    return result;
  };
  G.installed = true;
}

const started = Date.now();
const timer = setInterval(() => {
  if (window.foundry && foundry.dice && foundry.dice.Roll && window.CONFIG && CONFIG.Dice && foundry.dice.terms && foundry.dice.terms.DiceTerm) {
    clearInterval(timer);
    try {
      install();
    } catch (error) {
      G.lastError = String((error && error.stack) || error);
    }
  } else if (Date.now() - started > 120000) {
    clearInterval(timer);
  }
}, 100);
