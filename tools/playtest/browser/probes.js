/*
 * Probes: functions the HUB evaluates inside a seat's page to read the state of the game itself, never exposed to an agent (an agent
 * has the screen a person has and no console; design/playtest-process.md, section 5). Each is a function expression, called with its
 * arguments by browser/scripts.mjs. They only READ.
 *
 *   peek      the shared state a table is supposed to agree on: the clock, the Runner's place, the open check, The City, who is on stage.
 *             The convergence check compares one seat's peek with every other's; the reload-invariance check compares a seat with itself.
 *   windows   the ids of every open application and the module's HUD parts
 *   leak      searches the page, and the documents Foundry sent to this client, for strings that should be GM-only
 *   messages  the check results in chat, for the coverage ledger (the system writes the outcome on every check card)
 */

// peek: () => object
const peek = () => {
  const g = window.game;
  if (!g || !g.ready) return { ready: false };
  const get = (key) => {
    try {
      return g.settings.get("blank-inheritance", key);
    } catch {
      return undefined;
    }
  };
  const session = (get("checkConsole") || {}).session || null;
  const city = get("cityState");
  const prompt = get("choicePrompt");
  const runs = get("runnerRuns") || {};
  const runSummary = {};
  for (const [brief, run] of Object.entries(runs)) {
    runSummary[brief] = {};
    for (const [key, value] of Object.entries(run || {})) runSummary[brief][key] = value && typeof value === "object" ? Object.keys(value).length : value;
  }
  return {
    ready: true,
    user: g.user ? g.user.name : null,
    gm: !!(g.user && g.user.isGM),
    scene: window.canvas && canvas.scene ? { id: canvas.scene.id, name: canvas.scene.name } : null,
    moment: get("campaignMoment"),
    runner: { episode: get("runnerEpisode"), brief: get("runnerBrief"), runs: runSummary },
    check: session ? { id: session.id, key: session.key, dc: session.dc, skills: session.skills, asked: session.asked, rolled: Object.keys(session.rolls || {}).length, blind: !!session.blind } : null,
    city: city ? { open: JSON.stringify(city).length } : null,
    prompt: prompt ? { open: JSON.stringify(prompt).length } : null,
    users: g.users.map((u) => ({ name: u.name, active: u.active, character: u.character ? u.character.name : null })),
    counts: { actors: g.actors.size, scenes: g.scenes.size, journals: g.journal.size, messages: g.messages.size, playlists: g.playlists.size }
  };
};

// windows: () => string[]
const windows = () => {
  const v2 = window.foundry && foundry.applications && foundry.applications.instances ? [...foundry.applications.instances.keys()] : [];
  // sf2e's sheets are still the older kind of window, which Foundry keeps in ui.windows.
  const v1 = window.ui && ui.windows ? Object.values(ui.windows).map((a) => String(a.id)) : [];
  const ids = [...new Set([...v2, ...v1])];
  const huds = [...document.querySelectorAll('[id^="bi-"]')].filter((e) => !e.closest(".application, .window-app") && e.getClientRects().length).map((e) => e.id);
  return { applications: ids, hud: [...new Set(huds)] };
};

// leak: (canaries: string[]) => { ui: [...], documents: [...] }
const leak = (canaries) => {
  const text = document.body.innerText.toLowerCase();
  const ui = [];
  const docs = [];
  const lower = canaries.map((c) => ({ canary: c, needle: String(c).toLowerCase() })).filter((c) => c.needle.length >= 12);
  for (const { canary, needle } of lower) if (text.includes(needle)) ui.push({ canary: canary.slice(0, 80), where: "visible page text" });
  const g = window.game;
  if (g && g.ready) {
    const collections = { actors: g.actors, journal: g.journal, scenes: g.scenes, messages: g.messages, items: g.items };
    for (const [name, collection] of Object.entries(collections)) {
      for (const doc of collection) {
        let json = "";
        try {
          json = JSON.stringify(doc.toObject ? doc.toObject() : doc).toLowerCase();
        } catch {
          continue;
        }
        for (const { canary, needle } of lower) if (json.includes(needle)) docs.push({ canary: canary.slice(0, 80), collection: name, document: doc.name || doc.id });
      }
    }
  }
  return { ui, documents: docs.slice(0, 200) };
};

// leakUi: (canaries) => { ui: [{ canary, where }] }   the visible page text only: cheap, so the hub runs it every few seconds on every player seat
const leakUi = (canaries) => {
  const text = document.body.innerText.toLowerCase();
  const ui = [];
  for (const canary of canaries) {
    const needle = String(canary).toLowerCase();
    if (needle.length >= 12 && text.includes(needle)) ui.push({ canary: String(canary).slice(0, 80), where: "visible page text" });
  }
  return { ui };
};

// messages: () => [{ id, user, flavor, outcome, total, dc, rollTag }]
const messages = () => {
  const g = window.game;
  if (!g || !g.ready) return [];
  return g.messages.contents.slice(-400).map((m) => {
    const ctx = (m.flags && m.flags.pf2e && m.flags.pf2e.context) || null;
    return {
      id: m.id,
      time: m.timestamp,
      user: m.author ? m.author.name : null,
      speaker: m.speaker ? m.speaker.alias : null,
      isRoll: !!m.isRoll,
      total: m.isRoll && m.rolls && m.rolls[0] ? m.rolls[0].total : null,
      type: ctx ? ctx.type : null,
      outcome: ctx ? ctx.outcome : null,
      dc: ctx && ctx.dc ? ctx.dc.value : null,
      options: ctx && Array.isArray(ctx.options) ? ctx.options.filter((o) => /^bi-/.test(o)).slice(0, 6) : [],
      whisper: m.whisper ? m.whisper.length : 0,
      excerpt: String(m.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140)
    };
  });
};

// characters: () => [{ name, id, ... }]   every player character, as sf2e built it, for the chargen oracle (core/oracle.mjs)
const characters = () => {
  const g = window.game;
  if (!g || !g.ready) return [];
  const slots = (obj) => Object.values(obj || {}).map((b) => ({ value: b.value || [], selected: b.selected || null }));
  return g.actors
    .filter((a) => a.type === "character")
    .map((a) => ({
      id: a.id,
      name: a.name,
      level: a.system.details.level.value,
      hp: a.system.attributes.hp.max,
      ac: a.system.attributes.ac.value,
      mods: Object.fromEntries(Object.entries(a.system.abilities || {}).map(([k, v]) => [k, v.mod])),
      free: (a.system.build && a.system.build.attributes && a.system.build.attributes.boosts && a.system.build.attributes.boosts["1"]) || [],
      ancestry: a.ancestry ? { slug: a.ancestry.slug, hp: a.ancestry.system.hp, boosts: slots(a.ancestry.system.boosts), flaws: slots(a.ancestry.system.flaws) } : null,
      background: a.background ? { slug: a.background.slug, boosts: slots(a.background.system.boosts) } : null,
      class: a.class ? { slug: a.class.slug, hp: a.class.system.hp, key: { value: a.class.system.keyAbility.value || [], selected: a.class.system.keyAbility.selected || null } } : null,
      // The questions a background or class asks (ChoiceSet rules), as stored on the item, and which skills are trained on the sheet.
      choices: Object.fromEntries(["background", "class"].filter((k) => a[k]).map((k) => [k, ((a[k]._source && a[k]._source.system && a[k]._source.system.rules) || a[k].system.rules || []).filter((r) => r.key === "ChoiceSet").map((r) => ({ flag: r.flag || null, selection: r.selection === undefined ? null : r.selection }))])),
      skillRanks: Object.fromEntries(Object.entries(a.system.skills || {}).map(([k, v]) => [k, v && v.rank])),
      owners: Object.entries(a.ownership || {}).filter(([id, level]) => id !== "default" && level >= 3).map(([id]) => (g.users.get(id) ? g.users.get(id).name : id)),
      assignedTo: g.users.filter((u) => u.character && u.character.id === a.id).map((u) => u.name),
      tokens: g.scenes.map((s) => ({ scene: s.name, n: s.tokens.filter((t) => t.actorId === a.id).length })).filter((x) => x.n),
      hasAnswers: (() => { const intake = (a.flags && a.flags["blank-inheritance"] && a.flags["blank-inheritance"].intake) || {}; return Object.values(intake.questions || {}).some((v) => String(v || "").trim()) || String(intake.freeform || "").trim().length > 0; })(),
      agreement: (a.flags && a.flags["blank-inheritance"] && a.flags["blank-inheritance"].agreement) || null,
      intakeWhispers: g.messages.filter((m) => m.whisper && m.whisper.length && String(m.content || "").includes(a.name)).length,
      portrait: a.img
    }));
};

const probes = { peek, windows, leak, leakUi, messages, characters };
