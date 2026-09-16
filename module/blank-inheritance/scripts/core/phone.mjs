/**
 * The personal comm device — pure logic only.
 *
 * ideas/entries/phone-app-suite.json is the confirmed app list (all nine
 * pieces, user-approved in one pass: "I love all of them"); this module is
 * the small testable core a couple of those apps actually need. Everything
 * DOM-shaped (the physical shell, the pixel-OS screen, drag handling, the
 * eight app pages) lives in design/ui/phone.js, which imports these rather
 * than re-deriving them — the same pure-core/thin-adapter split the rest of
 * this project's own testing rules ask for.
 */

/**
 * Which Resonance band a 0-100 value falls in. Bands are the real numbers
 * from data/campaign/config.json's resonance.bands — kept here as a literal
 * copy rather than an import, since this file must stay runnable from a
 * plain browser <script type="module"> with no bundler and no fetch of
 * campaign JSON; the source is cited so the two never quietly drift without
 * someone noticing they're supposed to match.
 */
export const RESONANCE_BANDS = Object.freeze([
  { id: "dead-weight", name: "Dead Weight", min: 0, max: 39 },
  { id: "nominal", name: "Nominal", min: 40, max: 64 },
  { id: "harmonised", name: "Harmonised", min: 65, max: 84 },
  { id: "absolute", name: "Absolute", min: 85, max: 100 }
]);

export function resonanceBand(value) {
  const v = Math.max(0, Math.min(100, value));
  const band = RESONANCE_BANDS.find((b) => v >= b.min && v <= b.max);
  // The bands are contiguous 0-100 by construction (tested below), so this
  // only trips if that invariant is ever broken by an edit to the table.
  if (!band) throw new Error(`no Resonance band covers ${v}`);
  return band;
}

/**
 * Roll `count` dice of `sides`, plus a flat `bonus`. `random` is injectable
 * (defaults to Math.random) so this is deterministic under test — the same
 * shape every dice-driven system in this repo already uses.
 */
export function rollDice(sides, count = 1, bonus = 0, random = Math.random) {
  if (!Number.isInteger(sides) || sides < 2) throw new Error(`bad die size: ${sides}`);
  if (!Number.isInteger(count) || count < 1) throw new Error(`bad die count: ${count}`);
  const rolls = Array.from({ length: count }, () => Math.floor(random() * sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0) + bonus;
  return { sides, count, bonus, rolls, total };
}

/**
 * The Attack Alert app's one confirmed, load-bearing mechanic: a few
 * seconds of staggered delay between when different players are notified a
 * Contact is happening, "so the table doesn't learn simultaneously" (the
 * idea entry calls this out as the best part). Returns one delay in ms per
 * candidate, in the SAME order they were given — the caller decides what
 * "candidate order" means (duty roster, seat order, whatever); this just
 * guarantees the delays are staggered, sorted, and never identical.
 *
 * @param {number} count how many recipients
 * @param {{minMs?:number, maxMs?:number, random?:()=>number}} [opts]
 */
export function staggeredAlertDelays(count, opts = {}) {
  const { minMs = 400, maxMs = 6000, random = Math.random } = opts;
  if (!Number.isInteger(count) || count < 1) throw new Error(`bad recipient count: ${count}`);
  const delays = Array.from({ length: count }, () => Math.round(minMs + random() * (maxMs - minMs)));
  delays.sort((a, b) => a - b);
  // De-duplicate adjacent equal values (two people should not appear to
  // learn at EXACTLY the same millisecond) by nudging the later one later.
  for (let i = 1; i < delays.length; i++) {
    if (delays[i] <= delays[i - 1]) delays[i] = delays[i - 1] + 1;
  }
  return delays;
}

/**
 * The Fortune app's own confirmed mechanic: "campy daily-horoscope flavour
 * most of the time; sometimes a real hint... buried in it" — and the two
 * must be indistinguishable at the point of reading, or the "sometimes
 * true" stops being a fun surprise and starts being a tell. `pool` entries
 * are `{text, real?: boolean, weight?: number}`; `real` is metadata for
 * whoever authors the pool (a GM deciding what counts as a hint that
 * session), never surfaced by this function or by the UI that calls it.
 */
export function drawFortune(pool, random = Math.random) {
  if (!pool.length) throw new Error("fortune pool is empty");
  const total = pool.reduce((s, f) => s + (f.weight ?? 1), 0);
  let r = random() * total;
  for (const f of pool) {
    r -= f.weight ?? 1;
    if (r < 0) return f;
  }
  return pool[pool.length - 1];
}

/**
 * The Pet app's tiny, deliberately low-stakes state machine. Two meters
 * (fed, played) that decay slowly and are nudged up by direct action —
 * "purely textural, zero mechanical weight" per the idea entry, so this is
 * intentionally the simplest possible thing that still feels alive rather
 * than static. `mood` is derived, never stored, so it can't drift out of
 * sync with the two meters it's computed from.
 */
export function petMood({ fed, played }) {
  const avg = (fed + played) / 2;
  if (avg >= 75) return "delighted";
  if (avg >= 45) return "content";
  if (avg >= 20) return "restless";
  return "sulking";
}

export function feedPet(state, amount = 30) {
  return { ...state, fed: Math.min(100, state.fed + amount) };
}

export function playWithPet(state, amount = 30) {
  return { ...state, played: Math.min(100, state.played + amount) };
}

/** Both meters drift down slowly between visits — never to zero-forever,
 *  there's no fail state here, just something worth checking in on. */
export function decayPet(state, amount = 5) {
  return {
    fed: Math.max(0, state.fed - amount),
    played: Math.max(0, state.played - amount)
  };
}

/**
 * The phone's Session Log app: today's recorded entries (core/log-entry.mjs),
 * newest first, with a table-ready HH:MM instead of a full ISO timestamp.
 * The command bar's own log zone already shows the last three as a receipt
 * (foundry/director-bar.mjs); this is the same data, just all of it, for
 * catching up on what the table did five scenes ago without scrolling the bar.
 */
export function formatLogEntriesForDisplay(entries = []) {
  return [...entries].reverse().map((entry) => ({
    ...entry,
    time: typeof entry.at === "string" ? entry.at.slice(11, 16) : ""
  }));
}

/* ------------------------------------------------------------------ *
 * Snake — one of the terminal's own apps. A grid game is allowed to be
 * a grid; the "not pixelated" direction was about the OS chrome, not
 * about a game whose entire point is a grid. All state here is plain
 * data ({x,y} points), so design/ui/phone.js only ever needs to paint
 * whatever this returns — no game logic lives in the DOM layer.
 * ------------------------------------------------------------------ */

/** A board position not currently under the snake, or null if the board
 *  is completely full (a genuine win state, vanishingly unlikely). */
export function spawnFood(snake, width, height, random = Math.random) {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (!free.length) return null;
  return free[Math.floor(random() * free.length)];
}

/** A fresh 3-long snake, centred, moving right, with one food already placed. */
export function createSnake(width, height, random = Math.random) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 5 || height < 5) {
    throw new Error(`board too small: ${width}x${height} (minimum 5x5)`);
  }
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
  return { width, height, snake, dir: { x: 1, y: 0 }, food: spawnFood(snake, width, height, random), alive: true, score: 0 };
}

/** Change heading. A direct reversal (turning straight back into your own
 *  neck) is ignored rather than accepted-then-immediately-fatal — every
 *  real Snake does this, and it is the one input-handling rule worth a
 *  test, since it is exactly the kind of thing an "obviously correct"
 *  implementation gets wrong by taking every keypress literally. */
export function turnSnake(state, dir) {
  if (dir.x === -state.dir.x && dir.y === -state.dir.y) return state;
  return { ...state, dir };
}

/** Advance one tick: move, check wall/self collision, check food. A dead
 *  snake stepping again is a no-op, not an error — the caller (a
 *  setInterval loop) does not need to know to stop calling immediately. */
export function stepSnake(state, random = Math.random) {
  if (!state.alive) return state;
  const head = state.snake[0];
  const next = { x: head.x + state.dir.x, y: head.y + state.dir.y };
  const hitWall = next.x < 0 || next.x >= state.width || next.y < 0 || next.y >= state.height;
  const ateFood = !!state.food && next.x === state.food.x && next.y === state.food.y;
  // The tail cell is about to vacate (unless the snake is growing this
  // tick), so colliding with what is CURRENTLY the last segment is not
  // actually fatal — checking against the post-move body, not the
  // pre-move one, is the second easy-to-get-wrong rule here.
  const body = ateFood ? state.snake : state.snake.slice(0, -1);
  const hitSelf = body.some((p) => p.x === next.x && p.y === next.y);
  if (hitWall || hitSelf) return { ...state, alive: false };
  const snake = [next, ...body];
  return {
    ...state,
    snake,
    score: ateFood ? state.score + 1 : state.score,
    food: ateFood ? spawnFood(snake, state.width, state.height, random) : state.food
  };
}
