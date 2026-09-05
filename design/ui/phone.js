/* Blank Inheritance — the personal terminal.
 *
 * Prototype-only, same rules as console.js. Second pass at
 * ideas/entries/phone-app-suite.json: the first pass built a small
 * draggable phone with a pixel-art OS, and the user reviewed it live and
 * changed course on both counts — "very modern" (the small floating
 * window IS the generic modern-app-mockup form factor, regardless of
 * what runs inside it) and "deciding against pixelated." This pass is a
 * genuine rebuild, not a patch: a large panel that rises from the
 * chassis floor and fills 80% of the scene, rendered in this project's
 * own established GLASS register instead of a pixel font, because it
 * now has to hold real content — website-page-shaped email, a real
 * messaging log, a media grid — that a phone-sized window cannot
 * honestly show.
 *
 * Pure logic (dice, staggered-alert delays, fortune, the pet's state
 * machine, Snake) lives in scripts/core/phone.mjs and is unit-tested
 * there; this file is the thin DOM adapter plus the six apps' own
 * layouts, which are deliberately light — first-pass content, not
 * finished features.
 */

import {
  drawFortune,
  petMood,
  feedPet,
  playWithPet,
  createSnake,
  turnSnake,
  stepSnake
} from "../../module/blank-inheritance/scripts/core/phone.mjs";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ------------------------------------------------------------------ *
 * Real campaign content, lightly held — the same roster shape
 * console.js's own CANDIDATES/ROLES use (data/campaign/ground-roles.json)
 * and the three Directorate NPCs verbatim (data/npcs/*.json), one line
 * each. Candidate NUMBER is still the only identity a message/email uses;
 * nothing here invents a name for the six real kids.
 * ------------------------------------------------------------------ */
const ROSTER = [
  { no: "01", role: "Sensor Op" },
  { no: "02", role: "Umbilical" },
  { no: "03", role: "Evac Marshal" },
  { no: "05", role: "Structural" },
  { no: "06", role: "Signals" }
];
const ME = "04"; // the terminal's owner — the Frame pilot, per the console's own default

const CHANNELS = [
  {
    id: "squad", label: "# squad", group: true,
    messages: [
      { from: "05", text: "Causeway checkpoint holding. SO-14 in force — nobody moves the Frame under its own power." },
      { from: "02", text: "Cradle's engaged on my end. +2 rounds banked whenever you need them, 04." },
      { from: "03", text: "Shelter 4 at 62%. Slow, but it's moving the right way." },
      { from: "06", text: "Resonance reading steady from up here. I'll say something the second that changes." }
    ]
  },
  {
    id: "ops-relay", label: "# ops-relay", group: true,
    messages: [
      { from: "directorate", text: "Reminder: unauthorized Frame movement past the causeway is a Standing Order 14 violation. This applies regardless of Contact status." }
    ]
  }
];
const DMS = [
  { id: "01", label: "01 · Sensor Op", messages: [{ from: "01", text: "Contact reads EXTREME on the gauge. Whatever it is, it's not on any manifest I've got access to." }] },
  { id: "05", label: "05 · Structural", messages: [{ from: "05", text: "Hey. You good? That was close out there." }] },
  { id: "03", label: "03 · Evac Marshal", messages: [] },
  { id: "02", label: "02 · Umbilical", messages: [] },
  { id: "06", label: "06 · Signals", messages: [] }
];
const SENDER_LABEL = (id) => (id === "directorate" ? "DIRECTORATE" : id === ME ? "YOU" : `${id} · ${(ROSTER.find((r) => r.no === id) || {}).role || ""}`.trim());

const EMAILS = [
  {
    from: "The Commander", subject: "Debrief — Day 04", unread: true,
    body: "Candidate 04.\n\nThe causeway hold cost us four hours we did not have. I am not interested in why — I am interested in it not happening again. Standing Order 14 exists because a Frame under its own power on that structure is a liability to everyone standing on it, your ground crew included.\n\nFile a full action report by end of day. This is not a request."
  },
  {
    from: "The Caretaker", subject: "Rest Rotation", unread: true,
    body: "I know you're tired. I got you two extra hours off rotation this week — it cost three technician-days out of the pool that also repairs your Frame, so I need you to actually use them and not spend them on the simulator again.\n\nEat something that isn't from the machine. That's not a joke, that's a note in your file if you don't."
  },
  {
    from: "Transparency Advocate", subject: "What You're Owed", unread: false,
    body: "You should have been told about the causeway's structural rating before you were asked to hold position on it. You weren't, because someone decided it would 'complicate the order.'\n\nI'm telling you now because I think you're owed the truth more than I think you're owed my job security. Do with that what you will."
  },
  {
    from: "Medical Administration", subject: "Evaluation Scheduled", unread: false,
    body: "Your quarterly aptitude and fitness evaluation has been scheduled. Report to the Medical Division terminal at your earliest convenience to review your standing file.\n\nThis is routine. It is always routine, right up until it isn't."
  },
  {
    from: "Directorate Notices", subject: "Standing Order 14 — Reminder", unread: false,
    body: "This is an automated reminder. Standing Order 14 remains in force: no Frame passes the causeway under its own power. Violations are logged automatically and reviewed weekly.\n\nThis message was not sent in response to any specific incident."
  }
];

const MEDIA_ITEMS = [
  { id: "fort", title: "Directorate HQ", kind: "IMAGE", src: "assets/pins/fort.jpg" },
  { id: "causeway", title: "Causeway Check", kind: "IMAGE", src: "assets/pins/causeway.jpg" },
  { id: "contact", title: "Contact — Old Town", kind: "IMAGE", src: "assets/pins/contact.jpg" },
  { id: "shelter", title: "Shelter 4", kind: "IMAGE", src: "assets/pins/shelter.jpg" },
  { id: "pier", title: "Pier 3 — Sortie", kind: "IMAGE", src: "assets/pins/pier.jpg" },
  { id: "mast", title: "Sensor Mast", kind: "IMAGE", src: "assets/pins/mast.jpg" },
  {
    id: "so14", title: "Standing Order 14", kind: "DOCUMENT",
    doc: {
      titleJp: "統制局 命令第十四号", title: "Standing Order 14", meta: "D-14/0411-B · 04.11 · copy 3 of 11",
      body: "No Frame may pass the causeway under its own power while Standing Order 14 remains in force. Ground crew are authorised to physically restrain non-compliant units by any means short of lethal force."
    }
  }
];

const FORTUNE_POOL = [
  { text: "A quiet day is still a day.", weight: 3 },
  { text: "Do not trust anything that thanks you for your patience.", weight: 3 },
  { text: "Today favours the cautious. Tomorrow will not.", weight: 3 },
  { text: "The Directorate cannot see everything. Neither can you.", weight: 3 },
  { text: "Something you filed as unimportant is not.", real: true, weight: 1 },
  { text: "You will be asked a question you already know the answer to.", weight: 3 }
];

/* ------------------------------------------------------------------ *
 * Persisted, per-viewer, purely textural state (the Pet — kept exactly
 * per the user's request, redrawn to fit the new register).
 * ------------------------------------------------------------------ */
const PET_KEY = "bi-terminal-pet-v1";
function loadPet() {
  try {
    const raw = localStorage.getItem(PET_KEY);
    if (!raw) return { fed: 60, played: 60 };
    return JSON.parse(raw);
  } catch { return { fed: 60, played: 60 }; }
}
function savePet(state) {
  try { localStorage.setItem(PET_KEY, JSON.stringify(state)); } catch { /* private mode, etc — fine to lose */ }
}

/* ------------------------------------------------------------------ *
 * Small hand-drawn icons, in the same "flat coloured line-shapes" idiom
 * the chassis already uses for its own hardware details (chevrons,
 * corner ticks) — chosen over relying on font glyph coverage, and over a
 * pixel sprite sheet, which is exactly the register being moved away
 * from this pass.
 * ------------------------------------------------------------------ */
const ICONS = {
  messaging: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6"/></svg>`,
  email: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="1.2" stroke="currentColor" stroke-width="1.6"/><path d="M4 6.5 12 13l8-6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  media: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="8" height="8" stroke="currentColor" stroke-width="1.6"/><rect x="12.5" y="3.5" width="8" height="8" stroke="currentColor" stroke-width="1.6"/><rect x="3.5" y="12.5" width="8" height="8" stroke="currentColor" stroke-width="1.6"/><rect x="12.5" y="12.5" width="8" height="8" stroke="currentColor" stroke-width="1.6"/></svg>`,
  snake: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 8h6v6H10V8h6v4" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg>`,
  pet: `<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="14" rx="7" ry="5.5" stroke="currentColor" stroke-width="1.6"/><circle cx="9.5" cy="13" r="1" fill="currentColor"/><circle cx="14.5" cy="13" r="1" fill="currentColor"/><path d="M8 6.5 9.5 9M16 6.5 14.5 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  medical: `<svg viewBox="0 0 24 24" fill="none"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z" fill="currentColor"/></svg>`
};

function petSvg() {
  return `<svg class="bi-pet__svg" viewBox="0 0 100 100" fill="none">
    <ellipse cx="50" cy="60" rx="34" ry="26" stroke="var(--bi-phosphor)" stroke-width="2.5" fill="rgb(111 227 154 / 8%)"/>
    <circle cx="38" cy="52" r="4.5" fill="var(--bi-phosphor)"/>
    <circle cx="62" cy="52" r="4.5" fill="var(--bi-phosphor)"/>
    <path d="M28 30 38 42M72 30 62 42" stroke="var(--bi-phosphor)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 70q10 8 20 0" stroke="var(--bi-phosphor)" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
}

/* ------------------------------------------------------------------ *
 * The six apps. Each render()s into the main pane and may return a
 * cleanup function (intervals/listeners a page starts that must not
 * keep running once you navigate away from it).
 * ------------------------------------------------------------------ */
const APPS = [
  { id: "messaging", label: "Messaging", glyph: ICONS.messaging, color: "var(--bi-cyan)", render: renderMessaging },
  { id: "email", label: "Email", glyph: ICONS.email, color: "var(--bi-amber)", render: renderEmail },
  { id: "media", label: "Media", glyph: ICONS.media, color: "var(--bi-phosphor)", render: renderMedia },
  { id: "snake", label: "Snake", glyph: ICONS.snake, color: "var(--bi-vermilion)", render: renderSnake },
  { id: "pet", label: "Pet", glyph: ICONS.pet, color: "var(--bi-resonance)", render: renderPet },
  { id: "medical", label: "Medical Report", glyph: ICONS.medical, color: "var(--bi-brass)", render: renderMedical, paper: true }
];

/* --- Messaging --------------------------------------------------------- */
function renderMessaging(main) {
  main.innerHTML = `
    <div class="bi-msg">
      <div class="bi-msg__list" id="msg-list">
        <div class="bi-msg__section">Channels</div>
        ${CHANNELS.map((c) => `<button class="bi-msg__item" data-thread="${c.id}"><span>${c.label}</span></button>`).join("")}
        <div class="bi-msg__section">Direct</div>
        ${DMS.map((d) => `<button class="bi-msg__item" data-thread="${d.id}"><span>${d.label}</span><span class="bi-msg__item-unread" ${d.messages.length ? "" : "hidden"}></span></button>`).join("")}
      </div>
      <div class="bi-msg__thread" id="msg-thread"></div>
    </div>`;
  const threadEl = $("#msg-thread", main);
  const findThread = (id) => CHANNELS.find((c) => c.id === id) || DMS.find((d) => d.id === id);
  let openId = null;

  function openThread(id) {
    openId = id;
    for (const b of $$(".bi-msg__item", main)) b.setAttribute("aria-pressed", String(b.dataset.thread === id));
    const t = findThread(id);
    threadEl.innerHTML = `
      <div class="bi-msg__log" id="msg-log"></div>
      <div class="bi-msg__composer">
        <input class="bi-msg__input" id="msg-input" placeholder="Message ${t.label}..." autocomplete="off">
        <button class="bi-msg__send" id="msg-send">SEND</button>
      </div>`;
    paintLog(t);
    $("#msg-send", threadEl).addEventListener("click", () => sendMessage(t));
    $("#msg-input", threadEl).addEventListener("keydown", (ev) => { if (ev.key === "Enter") sendMessage(t); });
  }
  function paintLog(t) {
    const log = $("#msg-log", threadEl);
    if (!log) return;
    log.innerHTML = t.messages.map((m) => `
      <div class="bi-msg__row ${m.from === ME ? "bi-msg__row--me" : ""}">
        <span class="bi-msg__avatar">${m.from === "directorate" ? "D" : m.from}</span>
        <div>
          <div class="bi-msg__who">${SENDER_LABEL(m.from)}</div>
          <div class="bi-msg__bubble"><div class="bi-msg__text">${escapeHtml(m.text)}</div></div>
        </div>
      </div>`).join("");
    log.scrollTop = log.scrollHeight;
  }
  function sendMessage(t) {
    const input = $("#msg-input", threadEl);
    const text = input.value.trim();
    if (!text) return;
    t.messages.push({ from: ME, text });
    input.value = "";
    paintLog(t);
  }

  $("#msg-list", main).addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-thread]");
    if (!btn) return;
    const item = DMS.find((d) => d.id === btn.dataset.thread);
    if (item) $(".bi-msg__item-unread", btn)?.setAttribute("hidden", "");
    openThread(btn.dataset.thread);
  });
  openThread(CHANNELS[0].id);
}

/* --- Email --------------------------------------------------------------- */
function renderEmail(main) {
  main.innerHTML = `
    <div class="bi-mail">
      <div class="bi-mail__list" id="mail-list"></div>
      <div class="bi-mail__reader" id="mail-reader"><div class="bi-mail__empty">Select a message.</div></div>
    </div>`;
  const list = $("#mail-list", main);
  const reader = $("#mail-reader", main);
  list.innerHTML = EMAILS.map((e, i) => `
    <button class="bi-mail__item" data-i="${i}" data-unread="${e.unread}">
      <div class="bi-mail__from"><span>${e.from}</span><span class="bi-mail__date">DAY 04</span></div>
      <div class="bi-mail__subject">${e.subject}</div>
      <div class="bi-mail__snippet">${escapeHtml(e.body.split("\n")[0])}</div>
    </button>`).join("");
  list.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-i]");
    if (!btn) return;
    const e = EMAILS[Number(btn.dataset.i)];
    e.unread = false;
    btn.dataset.unread = "false";
    for (const b of $$(".bi-mail__item", list)) b.setAttribute("aria-pressed", String(b === btn));
    reader.innerHTML = `
      <div class="bi-mail__reader-head">
        <div class="bi-mail__reader-subject">${e.subject}</div>
        <div class="bi-mail__reader-meta"><span>FROM <b>${e.from}</b></span><span>TO <b>Candidate ${ME}</b></span><span>DAY <b>04</b></span></div>
      </div>
      <div class="bi-mail__reader-body">${escapeHtml(e.body)}</div>`;
  });
}

/* --- Media organiser ------------------------------------------------------ */
function renderMedia(main) {
  main.innerHTML = `
    <div style="position:relative;height:100%">
      <div class="bi-media__grid" id="media-grid"></div>
      <div class="bi-media__viewer" id="media-viewer" hidden>
        <div class="bi-media__viewer-bar"><button class="bi-term-key" id="media-close">&lt; BACK</button><span class="bi-media__viewer-title" id="media-title"></span></div>
        <div class="bi-media__viewer-body" id="media-body"></div>
      </div>
    </div>`;
  $("#media-grid", main).innerHTML = MEDIA_ITEMS.map((m) => `
    <button class="bi-media__tile" data-id="${m.id}">
      ${m.kind === "IMAGE" ? `<img class="bi-media__thumb" src="${m.src}" alt="">` : `<div class="bi-media__doc-face">▤</div>`}
      <div class="bi-media__caption"><span class="bi-media__title">${m.title}</span><span class="bi-media__kind">${m.kind}</span></div>
    </button>`).join("");
  const viewer = $("#media-viewer", main);
  $("#media-grid", main).addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-id]");
    if (!btn) return;
    const item = MEDIA_ITEMS.find((m) => m.id === btn.dataset.id);
    $("#media-title", viewer).textContent = item.title;
    $("#media-body", viewer).innerHTML = item.kind === "IMAGE"
      ? `<img src="${item.src}" alt="${item.title}">`
      : `<div class="bi-doc">
           <div class="bi-doc__head"><div><span class="bi-doc__title-jp">${item.doc.titleJp}</span><h1 class="bi-doc__title">${item.doc.title}</h1></div><div class="bi-doc__meta">${item.doc.meta}</div></div>
           <p>${item.doc.body}</p>
         </div>`;
    viewer.hidden = false;
  });
  $("#media-close", main).addEventListener("click", () => { viewer.hidden = true; });
}

/* --- Snake ----------------------------------------------------------------- */
function renderSnake(main) {
  const W = 20, H = 14, CELL = 20;
  main.innerHTML = `
    <div class="bi-snake">
      <div class="bi-snake__hud"><span class="bi-legend">Score</span><span class="bi-readout bi-readout--lg" id="snake-score">0</span></div>
      <div class="bi-snake__board-wrap">
        <div class="bi-snake__board" id="snake-board" style="grid-template-columns:repeat(${W}, ${CELL}px);grid-template-rows:repeat(${H}, ${CELL}px)"></div>
        <div class="bi-snake__overlay" id="snake-overlay" hidden>
          <div id="snake-overlay-text">GAME OVER</div>
          <button class="bi-term-key" id="snake-restart">RESTART</button>
        </div>
      </div>
      <p class="bi-phone__body" style="opacity:.6;font-family:var(--bi-font-readout);font-size:11px">Arrow keys to steer.</p>
    </div>`;
  const board = $("#snake-board", main);
  const cells = [];
  for (let i = 0; i < W * H; i++) { const c = document.createElement("div"); c.className = "bi-snake__cell"; board.appendChild(c); cells.push(c); }

  let state = createSnake(W, H);
  let tickId = null;

  function paint() {
    for (const c of cells) c.className = "bi-snake__cell";
    state.snake.forEach((p, i) => {
      const cell = cells[p.y * W + p.x];
      if (cell) cell.className = "bi-snake__cell " + (i === 0 ? "bi-snake__cell--head" : "bi-snake__cell--snake");
    });
    if (state.food) { const f = cells[state.food.y * W + state.food.x]; if (f) f.classList.add("bi-snake__cell--food"); }
    $("#snake-score", main).textContent = String(state.score);
    $("#snake-overlay", main).hidden = state.alive;
  }
  function tick() {
    state = stepSnake(state);
    paint();
    if (!state.alive) clearInterval(tickId);
  }
  function restart() {
    state = createSnake(W, H);
    $("#snake-overlay", main).hidden = true;
    paint();
    clearInterval(tickId);
    tickId = setInterval(tick, 140);
  }
  function onKey(ev) {
    const map = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
    const dir = map[ev.key];
    if (!dir) return;
    ev.preventDefault();
    state = turnSnake(state, dir);
  }
  document.addEventListener("keydown", onKey);
  $("#snake-restart", main).addEventListener("click", restart);
  restart();
  return () => { clearInterval(tickId); document.removeEventListener("keydown", onKey); };
}

/* --- Pet --------------------------------------------------------------------- */
function renderPet(main) {
  let state = loadPet();
  main.innerHTML = `
    <div class="bi-pet">
      <div class="bi-pet__stage">${petSvg()}</div>
      <div class="bi-pet__mood" id="pet-mood"></div>
      <div class="bi-pet__meters">
        <div class="bi-pet__meter-col"><span class="bi-pet__meter-label">Fed</span><div class="bi-pet__meter-track"><div class="bi-pet__meter-fill" id="pet-fed"></div></div></div>
        <div class="bi-pet__meter-col"><span class="bi-pet__meter-label">Played</span><div class="bi-pet__meter-track"><div class="bi-pet__meter-fill" id="pet-played"></div></div></div>
      </div>
      <div style="display:flex;gap:10px"><button class="bi-term-key" id="pet-feed">FEED</button><button class="bi-term-key" id="pet-play">PLAY</button></div>
    </div>`;
  const paint = () => {
    $("#pet-fed", main).style.width = state.fed + "%";
    $("#pet-played", main).style.width = state.played + "%";
    $("#pet-mood", main).textContent = petMood(state).toUpperCase();
    savePet(state);
  };
  paint();
  $("#pet-feed", main).addEventListener("click", () => { state = feedPet(state); paint(); });
  $("#pet-play", main).addEventListener("click", () => { state = playWithPet(state); paint(); });
}

/* --- Medical Report (mocked character sheet) --------------------------------- */
function renderMedical(main) {
  // Explicitly a template, not a real candidate's file — the six real
  // kids' stats have not been decided, and this is not the place to
  // invent them. The "grades -> ability boosts" conceit is the user's
  // own idea for how the eventual real onboarding flow should work.
  main.innerHTML = `
    <div class="bi-doc">
      <div class="bi-vertical bi-vertical--edge">見本 &middot; 訓練用書式</div>
      <div class="bi-doc__head">
        <div>
          <span class="bi-doc__title-jp">統制局 医務部 &middot; 適性評価書</span>
          <h1 class="bi-doc__title">Aptitude &amp; Fitness Report</h1>
        </div>
        <div style="display:flex;align-items:flex-start;gap:14px">
          <div class="bi-doc__meta">書式番号<br><b>MED-00/0000</b><br>候補生 <b>SAMPLE</b><br>写 <b>TEMPLATE</b></div>
          <span class="bi-stamp bi-stamp--amber"><span class="bi-stamp__jp">見本</span><span class="bi-stamp__en">Sample</span></span>
        </div>
      </div>

      <h2>Aptitude Assessment — School Transcript</h2>
      <p style="font-size:12px;opacity:.75">Recorded at intake. Grades are converted to standing bonuses at evaluation.</p>
      <div class="bi-form-row"><span class="bi-form-row__label">Physical Conditioning</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">B+ &middot; STR +1</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Reflex &amp; Coordination Drills</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">A- &middot; DEX +2</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Endurance Trials</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">B &middot; CON +1</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Tactical Theory</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">A &middot; INT +2</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Composure Under Stress</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">C+ &middot; WIS +0</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Command Presence</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">B- &middot; CHA +1</span></div>

      <h2>Clinical Readings</h2>
      <div class="bi-form-row"><span class="bi-form-row__label">Structural Integrity (AC)</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">18</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Cardiovascular Reserve (HP)</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">18 / 18</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Situational Awareness (Perception)</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">+5</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Stress Response — Physical (Fortitude)</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">+6</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Stress Response — Evasive (Reflex)</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">+7</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Stress Response — Mental (Will)</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">+4</span></div>
      <div class="bi-form-row"><span class="bi-form-row__label">Mobility (Speed)</span><span class="bi-form-row__lead"></span><span class="bi-form-row__value">25 ft.</span></div>

      <p style="margin-top:20px;font-size:11px;opacity:.6">Template only. No candidate's actual standing is recorded here — see onboarding, not yet implemented.</p>
    </div>`;
}

function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ------------------------------------------------------------------ *
 * The shell.
 * ------------------------------------------------------------------ */
let termEl = null;
let cleanupCurrentApp = null;

function buildTerminal(mountInto) {
  const term = document.createElement("div");
  term.className = "bi-terminal";
  term.id = "terminal";
  term.innerHTML = `
    <div class="bi-terminal__frame">
      <div class="bi-terminal__titlebar">
        <span class="bi-terminal__title-glyph" id="term-title-glyph"></span>
        <span class="bi-terminal__title" id="term-title">Terminal</span>
        <span class="bi-terminal__spacer"></span>
        <span class="bi-terminal__clock" id="term-clock">16:42</span>
        <button class="bi-terminal__close" id="term-close" aria-label="Close">&times;</button>
      </div>
      <div class="bi-terminal__body">
        <nav class="bi-terminal__nav" id="term-nav"></nav>
        <div class="bi-terminal__main" id="term-main"></div>
      </div>
    </div>`;
  mountInto.appendChild(term);

  $("#term-nav", term).innerHTML = APPS.map((a) => `
    <button class="bi-terminal__navbtn" style="--app:${a.color}" data-app="${a.id}" aria-pressed="false">
      <span class="bi-terminal__navbtn-glyph">${a.glyph}</span>
      <span>${a.label}</span>
    </button>`).join("");
  $("#term-nav", term).addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-app]");
    if (btn) openApp(term, btn.dataset.app);
  });
  return term;
}

function openApp(term, id) {
  const app = APPS.find((a) => a.id === id);
  if (!app) return;
  if (cleanupCurrentApp) { cleanupCurrentApp(); cleanupCurrentApp = null; }
  for (const b of $$(".bi-terminal__navbtn", term)) b.setAttribute("aria-pressed", String(b.dataset.app === id));
  $("#term-title", term).textContent = app.label;
  $("#term-title-glyph", term).innerHTML = app.glyph;
  $("#term-title-glyph", term).style.color = app.color;
  const main = $("#term-main", term);
  main.className = "bi-terminal__main" + (app.paper ? " bi-terminal__main--paper" : "");
  main.innerHTML = "";
  const cleanup = app.render(main);
  if (typeof cleanup === "function") cleanupCurrentApp = cleanup;
}

/* ------------------------------------------------------------------ *
 * Wire the toolbar button up.
 * ------------------------------------------------------------------ */
export function initPhone({ mountInto, badgeCount = 3 }) {
  const btn = $("#phone-btn");
  const badge = $("#phone-badge");
  if (badge) { badge.textContent = String(badgeCount); badge.hidden = badgeCount <= 0; }
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (!termEl) {
      termEl = buildTerminal(mountInto);
      $("#term-close", termEl).addEventListener("click", () => setOpen(false));
      const tick = () => {
        const clock = $("#term-clock", termEl);
        const src = $("#clock-out");
        if (clock && src) clock.textContent = src.textContent;
      };
      tick();
      setInterval(tick, 4000);
      openApp(termEl, APPS[0].id);
    }
    setOpen(!termEl.classList.contains("bi-terminal--open"));
  });

  function setOpen(open) {
    termEl.classList.toggle("bi-terminal--open", open);
    btn.setAttribute("aria-pressed", String(open));
    if (open && badge) badge.hidden = true;
  }
}
