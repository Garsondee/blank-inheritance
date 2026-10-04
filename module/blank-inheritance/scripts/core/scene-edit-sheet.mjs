/**
 * The edit sheet -- the whole scene as text boxes, in the order it is run.
 *
 * Ingram, 2026-09-27: "Ideally I would go into Scene 0 'From Up Here' and edit
 * the whole scene to fit what I want to say." The running view cannot carry
 * that: it folds most beats to one line, shows the opening and ending only at
 * their moment, never shows a field that is empty, and hides the GM notes and
 * the after-scene prompts altogether. So the Runner's Edit key swaps the
 * script for this sheet: every field the scene has, empty ones included, in
 * running order, each one a text box holding exactly the words the file
 * stores -- `**bold**` and the `<trig id="..."/>` markers that make a line's
 * buttons included, because what she edits is what is saved.
 *
 * Pure: builds the model templates/runner/edit.hbs draws, from the scene as
 * the Runner shows it (already overlaid with her edits) plus the overlay's
 * marks and notes. Every label is a full localisation key, written out, so
 * test/tier0-architecture.test.mjs checks each one against lang/en.json.
 */

import { fieldKey, pathToString } from "./scene-edits.mjs";

/** Field kinds, each drawn in its own face so the sheet still reads like the scene. */
export const FIELD_KINDS = Object.freeze({
  LINE: "line", // a name or one short line
  PROSE: "prose", // a GM instruction or note
  READ: "read", // words said aloud at the table
  NUMBER: "number", // a DC
  FLAG: "flag", // true/false (a required beat)
  CHOICE: "choice" // one of a fixed set (who a beat is for)
});

/** The schema's own delivery values (scene-brief.schema.json, beats[].delivery). */
export const DELIVERY_OPTIONS = Object.freeze(["table", "each", "solo", "passive"]);

const LABEL = Object.freeze({
  sectionScene: "BLANKINHERITANCE.Runner.Edit.Section.Scene",
  sectionOpening: "BLANKINHERITANCE.Runner.Edit.Section.Opening",
  sectionBeats: "BLANKINHERITANCE.Runner.Edit.Section.Beats",
  sectionEnding: "BLANKINHERITANCE.Runner.Edit.Section.Ending",
  sectionPeople: "BLANKINHERITANCE.Runner.Edit.Section.People",
  sectionKit: "BLANKINHERITANCE.Runner.Edit.Section.Kit",
  sectionExtras: "BLANKINHERITANCE.Runner.Edit.Section.Extras",
  title: "BLANKINHERITANCE.Runner.Edit.Field.Title",
  goal: "BLANKINHERITANCE.Runner.Edit.Field.Goal",
  summary: "BLANKINHERITANCE.Runner.Edit.Field.Summary",
  howToPlay: "BLANKINHERITANCE.Runner.Edit.Field.HowToPlay",
  runsAbout: "BLANKINHERITANCE.Runner.Edit.Field.RunsAbout",
  where: "BLANKINHERITANCE.Runner.Edit.Field.Where",
  firstThing: "BLANKINHERITANCE.Runner.Edit.Field.FirstThing",
  readAloud: "BLANKINHERITANCE.Runner.Edit.Field.ReadAloud",
  landmark: "BLANKINHERITANCE.Runner.Edit.Field.Landmark",
  holdInReserve: "BLANKINHERITANCE.Runner.Edit.Field.HoldInReserve",
  carriesInWhen: "BLANKINHERITANCE.Runner.Edit.Field.CarriesInWhen",
  carriesInThen: "BLANKINHERITANCE.Runner.Edit.Field.CarriesInThen",
  beatLine: "BLANKINHERITANCE.Runner.Edit.Field.BeatLine",
  when: "BLANKINHERITANCE.Runner.Edit.Field.When",
  direction: "BLANKINHERITANCE.Runner.Edit.Field.Direction",
  beatNote: "BLANKINHERITANCE.Runner.Edit.Field.BeatNote",
  mandatory: "BLANKINHERITANCE.Runner.Edit.Field.Mandatory",
  delivery: "BLANKINHERITANCE.Runner.Edit.Field.Delivery",
  checkName: "BLANKINHERITANCE.Runner.Edit.Field.CheckName",
  dc: "BLANKINHERITANCE.Runner.Edit.Field.Dc",
  bySkill: "BLANKINHERITANCE.Runner.Edit.Field.BySkill",
  choiceLabel: "BLANKINHERITANCE.Runner.Edit.Field.ChoiceLabel",
  choiceOption: "BLANKINHERITANCE.Runner.Edit.Field.ChoiceOption",
  choiceBlurb: "BLANKINHERITANCE.Runner.Edit.Field.ChoiceBlurb",
  choiceConsequence: "BLANKINHERITANCE.Runner.Edit.Field.ChoiceConsequence",
  endsWhen: "BLANKINHERITANCE.Runner.Edit.Field.EndsWhen",
  transitionLine: "BLANKINHERITANCE.Runner.Edit.Field.TransitionLine",
  onwards: "BLANKINHERITANCE.Runner.Edit.Field.Onwards",
  writeDown: "BLANKINHERITANCE.Runner.Edit.Field.WriteDown",
  carryForward: "BLANKINHERITANCE.Runner.Edit.Field.CarryForward",
  personLabel: "BLANKINHERITANCE.Runner.Edit.Field.PersonLabel",
  role: "BLANKINHERITANCE.Runner.Edit.Field.Role",
  wants: "BLANKINHERITANCE.Runner.Edit.Field.Wants",
  opensWith: "BLANKINHERITANCE.Runner.Edit.Field.OpensWith",
  voice: "BLANKINHERITANCE.Runner.Edit.Field.Voice",
  samples: "BLANKINHERITANCE.Runner.Edit.Field.Samples",
  willTopic: "BLANKINHERITANCE.Runner.Edit.Field.WillTopic",
  willNote: "BLANKINHERITANCE.Runner.Edit.Field.WillNote",
  wontTopic: "BLANKINHERITANCE.Runner.Edit.Field.WontTopic",
  wontWhy: "BLANKINHERITANCE.Runner.Edit.Field.WontWhy",
  coercibleTopic: "BLANKINHERITANCE.Runner.Edit.Field.CoercibleTopic",
  coercibleHow: "BLANKINHERITANCE.Runner.Edit.Field.CoercibleHow",
  handoutTitle: "BLANKINHERITANCE.Runner.Edit.Field.HandoutTitle",
  handoutBody: "BLANKINHERITANCE.Runner.Edit.Field.HandoutBody",
  gmNotes: "BLANKINHERITANCE.Runner.Edit.Field.GmNotes",
  catchables: "BLANKINHERITANCE.Runner.Edit.Field.Catchables",
  artefactTitle: "BLANKINHERITANCE.Runner.Edit.Field.ArtefactTitle",
  artefactBody: "BLANKINHERITANCE.Runner.Edit.Field.ArtefactBody",
  temptation: "BLANKINHERITANCE.Runner.Edit.Field.Temptation",
  reactionPrompt: "BLANKINHERITANCE.Runner.Edit.Field.ReactionPrompt",
  notes: "BLANKINHERITANCE.Runner.Edit.Field.Notes"
});

const DEGREE_LABELS = Object.freeze([
  ["criticalSuccess", "BLANKINHERITANCE.Runner.Edit.Field.CritSuccess"],
  ["success", "BLANKINHERITANCE.Runner.Edit.Field.Success"],
  ["failure", "BLANKINHERITANCE.Runner.Edit.Field.Failure"],
  ["criticalFailure", "BLANKINHERITANCE.Runner.Edit.Field.CritFailure"]
]);

const DELIVERY_LABELS = Object.freeze({
  table: "BLANKINHERITANCE.Runner.Edit.Delivery.table",
  each: "BLANKINHERITANCE.Runner.Edit.Delivery.each",
  solo: "BLANKINHERITANCE.Runner.Edit.Delivery.solo",
  passive: "BLANKINHERITANCE.Runner.Edit.Delivery.passive"
});

const KIND_LABELS = Object.freeze({
  action: "BLANKINHERITANCE.Runner.Edit.Kind.action",
  check: "BLANKINHERITANCE.Runner.Edit.Kind.check",
  reveal: "BLANKINHERITANCE.Runner.Edit.Kind.reveal",
  combat: "BLANKINHERITANCE.Runner.Edit.Kind.combat"
});

/** Every label key the sheet can hand the page -- for the test that checks each is in lang/en.json. */
export const ALL_LABEL_KEYS = Object.freeze([
  ...Object.values(LABEL),
  ...DEGREE_LABELS.map(([, key]) => key),
  ...Object.values(DELIVERY_LABELS),
  ...Object.values(KIND_LABELS)
]);

/**
 * @param {object} args
 * @param {object} args.brief       the scene brief, as the Runner shows it
 * @param {Record<string, object>} [args.challenges]  check files by id, as shown
 * @param {Record<string, object>} [args.marks]       overlayDocs().marks
 * @param {object[]} [args.notes]   overlayDocs().notes
 * @param {object[]} [args.removed] beats she removed that are still gone, for their undo slots
 * @param {Record<string, string>} [args.npcNames]    cast id -> the name the Runner shows
 */
export function editSheet({ brief, challenges = {}, marks = {}, notes = [], removed = [], npcNames = {} } = {}) {
  if (!brief?.id) return null;
  const file = `scene-briefs/${brief.id}`;
  const field = makeFieldFactory(marks);
  const notesAt = (path) => notesFor(notes, file, path);

  const sections = [];

  // The scene itself -------------------------------------------------------
  sections.push({
    id: "scene",
    title: LABEL.sectionScene,
    blocks: [
      {
        id: "scene",
        fields: [
          field(file, ["title"], brief.title, FIELD_KINDS.LINE, LABEL.title),
          field(file, ["goal"], brief.goal, FIELD_KINDS.PROSE, LABEL.goal),
          field(file, ["summary"], brief.summary, FIELD_KINDS.PROSE, LABEL.summary),
          field(file, ["howToPlay"], brief.howToPlay, FIELD_KINDS.PROSE, LABEL.howToPlay),
          field(file, ["runsAbout"], brief.runsAbout, FIELD_KINDS.LINE, LABEL.runsAbout)
        ],
        lists: [],
        noteAnchor: fieldKey(file, []),
        notes: notesAt([])
      }
    ]
  });

  // The opening ------------------------------------------------------------
  const intro = brief.intro ?? {};
  const openingFields = [
    field(file, ["intro", "where"], intro.where, FIELD_KINDS.LINE, LABEL.where),
    field(file, ["intro", "firstThing"], intro.firstThing, FIELD_KINDS.PROSE, LABEL.firstThing),
    field(file, ["intro", "readAloud"], intro.readAloud, FIELD_KINDS.READ, LABEL.readAloud),
    field(file, ["intro", "landmark"], intro.landmark, FIELD_KINDS.LINE, LABEL.landmark),
    field(file, ["intro", "holdInReserve"], intro.holdInReserve, FIELD_KINDS.PROSE, LABEL.holdInReserve)
  ];
  (intro.carriesIn ?? []).forEach((pair, index) => {
    openingFields.push(field(file, ["intro", "carriesIn", { index }, "when"], pair?.when, FIELD_KINDS.LINE, LABEL.carriesInWhen));
    openingFields.push(field(file, ["intro", "carriesIn", { index }, "then"], pair?.then, FIELD_KINDS.PROSE, LABEL.carriesInThen));
  });
  sections.push({
    id: "opening",
    title: LABEL.sectionOpening,
    blocks: [{ id: "opening", fields: openingFields, lists: [], noteAnchor: fieldKey(file, ["intro"]), notes: notesAt(["intro"]) }]
  });

  // The beats --------------------------------------------------------------
  const beats = brief.beats ?? [];
  sections.push({
    id: "beats",
    title: LABEL.sectionBeats,
    isBeats: true,
    listKey: fieldKey(file, ["beats"]),
    blocks: beats.map((beat, index) => beatBlock({ beat, index, beats, file, field, challenges, marks, notesAt, npcNames, brief })),
    removed: removed
      .filter((r) => r.file === file && pathToString(r.path) === "beats" && r.itemId)
      .map((r) => ({ recordId: r.recordId ?? r.id, itemId: r.itemId, text: r.item?.text || r.itemId }))
  });

  // The ending -------------------------------------------------------------
  const outro = brief.outro ?? {};
  const endingFields = [
    field(file, ["outro", "endsWhen"], outro.endsWhen, FIELD_KINDS.PROSE, LABEL.endsWhen),
    field(file, ["outro", "readAloud"], outro.readAloud, FIELD_KINDS.READ, LABEL.readAloud)
  ];
  if (outro.transition && typeof outro.transition === "object") {
    endingFields.push(field(file, ["outro", "transition", "line"], outro.transition.line, FIELD_KINDS.PROSE, LABEL.transitionLine));
  }
  endingFields.push(field(file, ["outro", "onwards"], outro.onwards, FIELD_KINDS.PROSE, LABEL.onwards));
  sections.push({
    id: "ending",
    title: LABEL.sectionEnding,
    blocks: [
      {
        id: "ending",
        fields: endingFields,
        lists: [
          plainList(file, ["outro", "writeDown"], outro.writeDown, FIELD_KINDS.PROSE, LABEL.writeDown, field),
          plainList(file, ["carryForward"], brief.carryForward, FIELD_KINDS.PROSE, LABEL.carryForward, field)
        ],
        noteAnchor: fieldKey(file, ["outro"]),
        notes: notesAt(["outro"])
      }
    ]
  });

  // The people -------------------------------------------------------------
  const cast = brief.cast ?? [];
  if (cast.length) {
    sections.push({
      id: "people",
      title: LABEL.sectionPeople,
      blocks: cast.filter((m) => m?.id).map((member) => personBlock({ member, file, field, notesAt, npcNames }))
    });
  }

  // Handouts and things they keep ------------------------------------------
  const handouts = (brief.handouts ?? []).filter((h) => h?.id);
  const artefacts = (brief.artefacts ?? []).filter((a) => a?.id);
  if (handouts.length || artefacts.length) {
    sections.push({
      id: "kit",
      title: LABEL.sectionKit,
      blocks: [
        ...handouts.map((handout) => {
          const base = ["handouts", { id: handout.id }];
          return {
            id: `handout:${handout.id}`,
            title: handout.title ?? handout.id,
            fields: [
              field(file, [...base, "title"], handout.title, FIELD_KINDS.LINE, LABEL.handoutTitle),
              field(file, [...base, "body"], handout.body, FIELD_KINDS.PROSE, LABEL.handoutBody, { code: true }),
              field(file, [...base, "gmNotes"], handout.gmNotes, FIELD_KINDS.PROSE, LABEL.gmNotes)
            ],
            lists: [plainList(file, [...base, "catchables"], handout.catchables, FIELD_KINDS.PROSE, LABEL.catchables, field)],
            noteAnchor: fieldKey(file, base),
            notes: notesAt(base)
          };
        }),
        ...artefacts.map((artefact) => {
          const base = ["artefacts", { id: artefact.id }];
          return {
            id: `artefact:${artefact.id}`,
            title: artefact.title ?? artefact.id,
            fields: [
              field(file, [...base, "title"], artefact.title, FIELD_KINDS.LINE, LABEL.artefactTitle),
              field(file, [...base, "body"], artefact.body, FIELD_KINDS.PROSE, LABEL.artefactBody),
              field(file, [...base, "gmNote"], artefact.gmNote, FIELD_KINDS.PROSE, LABEL.gmNotes)
            ],
            lists: [],
            noteAnchor: fieldKey(file, base),
            notes: notesAt(base)
          };
        })
      ]
    });
  }

  // Keeping the table moving, and what to ask afterwards --------------------
  sections.push({
    id: "extras",
    title: LABEL.sectionExtras,
    blocks: [
      {
        id: "extras",
        fields: [field(file, ["notes"], brief.notes, FIELD_KINDS.PROSE, LABEL.notes)],
        lists: [
          idList(file, ["temptations"], brief.temptations, "temptation", "text", FIELD_KINDS.PROSE, LABEL.temptation, field, marks),
          idList(file, ["reactionPrompts"], brief.reactionPrompts, "reaction", "text", FIELD_KINDS.PROSE, LABEL.reactionPrompt, field, marks)
        ],
        noteAnchor: null,
        notes: []
      }
    ]
  });

  const shownMarks = Object.values(marks).filter(Boolean);
  return {
    briefId: brief.id,
    file,
    title: brief.title ?? brief.id,
    sections,
    counts: {
      pending: shownMarks.filter((m) => m.state !== "server-behind").length,
      clash: shownMarks.filter((m) => m.state === "clash").length,
      behind: shownMarks.filter((m) => m.state === "server-behind").length,
      notes: notes.filter((n) => n.file === file && n.state !== "done").length
    }
  };
}

/* -------------------------------------------------------------------------- */

function makeFieldFactory(marks) {
  return function field(file, path, value, kind, label, extra = {}) {
    const key = fieldKey(file, path);
    const mark = marks[key] ?? null;
    const shown = value === null || value === undefined ? "" : value;
    return {
      key,
      label,
      kind,
      value: kind === FIELD_KINDS.FLAG ? Boolean(value) : shown,
      rows: rowsFor(kind, shown),
      isLine: kind === FIELD_KINDS.LINE,
      isProse: kind === FIELD_KINDS.PROSE,
      isRead: kind === FIELD_KINDS.READ,
      isNumber: kind === FIELD_KINDS.NUMBER,
      isFlag: kind === FIELD_KINDS.FLAG,
      isChoice: kind === FIELD_KINDS.CHOICE,
      isText: kind === FIELD_KINDS.LINE || kind === FIELD_KINDS.PROSE || kind === FIELD_KINDS.READ,
      isCode: extra.code === true,
      options: extra.options ?? null,
      labelData: extra.labelData ?? null,
      mark: mark?.state ?? null,
      isPending: mark?.state === "pending",
      isClash: mark?.state === "clash",
      isServerBehind: mark?.state === "server-behind"
    };
  };
}

/**
 * How tall a text box starts, so the sheet does not jump when the page first
 * sizes each box to its words. The page grows it further as she types.
 */
export function rowsFor(kind, value) {
  if (kind === FIELD_KINDS.NUMBER || kind === FIELD_KINDS.FLAG || kind === FIELD_KINDS.CHOICE) return 1;
  const text = String(value ?? "");
  const perLine = kind === FIELD_KINDS.LINE ? 80 : 90;
  const lines = text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0);
  return Math.max(1, Math.min(kind === FIELD_KINDS.LINE ? 3 : 40, lines));
}

function notesFor(notes, file, path) {
  const anchor = pathToString(path);
  return notes
    .filter((n) => n.file === file && pathToString(n.path ?? []) === anchor)
    .map((n) => ({ id: n.id, text: n.text, at: n.at, reply: n.reply ?? null, isDone: n.state === "done" }));
}

function beatBlock({ beat, index, beats, file, field, challenges, marks, notesAt, npcNames, brief }) {
  const base = ["beats", { id: beat.id }];
  const fields = [field(file, [...base, "text"], beat.text, FIELD_KINDS.LINE, LABEL.beatLine)];
  if (beat.when && typeof beat.when === "object" && typeof beat.when.condition === "string") {
    fields.push(field(file, [...base, "when", "condition"], beat.when.condition, FIELD_KINDS.LINE, LABEL.when));
  }
  fields.push(
    field(file, [...base, "readAloud"], beat.readAloud, FIELD_KINDS.READ, LABEL.readAloud),
    field(file, [...base, "direction"], beat.direction, FIELD_KINDS.PROSE, LABEL.direction),
    field(file, [...base, "note"], beat.note, FIELD_KINDS.PROSE, LABEL.beatNote)
  );

  const delivery = DELIVERY_OPTIONS.includes(beat.delivery) ? beat.delivery : "table";
  const settings = [
    field(file, [...base, "mandatory"], beat.mandatory === true, FIELD_KINDS.FLAG, LABEL.mandatory),
    field(file, [...base, "delivery"], delivery, FIELD_KINDS.CHOICE, LABEL.delivery, {
      options: DELIVERY_OPTIONS.map((value) => ({ value, label: DELIVERY_LABELS[value], selected: delivery === value }))
    })
  ];

  // The check this beat asks for, from its own check file.
  let check = null;
  const challenge = beat.challengeRef ? challenges[beat.challengeRef] : null;
  const found = challenge ? (beat.checkRef ? (challenge.checks ?? []).find((c) => c.id === beat.checkRef) : (challenge.checks ?? [])[0]) : null;
  if (found?.id && challenge?.id) {
    const cfile = `challenges/${challenge.id}`;
    const cbase = ["checks", { id: found.id }];
    const checkFields = [
      field(cfile, [...cbase, "name"], found.name, FIELD_KINDS.LINE, LABEL.checkName),
      field(cfile, [...cbase, "dc", "value"], found.dc?.value ?? null, FIELD_KINDS.NUMBER, LABEL.dc)
    ];
    for (const [degree, label] of DEGREE_LABELS) {
      checkFields.push(field(cfile, [...cbase, "outcomes", degree], found.outcomes?.[degree], FIELD_KINDS.PROSE, label));
    }
    for (const skill of Object.keys(found.bySkill ?? {})) {
      checkFields.push(field(cfile, [...cbase, "bySkill", skill], found.bySkill[skill], FIELD_KINDS.PROSE, LABEL.bySkill, { labelData: skill }));
    }
    check = { file: cfile, name: found.name ?? found.id, fields: checkFields, sharedWith: sharedCheckScenes(challenge, brief) };
  }

  // A disclosed live decision, if the beat carries one.
  let choice = null;
  if (beat.choicePoint && typeof beat.choicePoint === "object") {
    const pbase = [...base, "choicePoint"];
    const choiceFields = [field(file, [...pbase, "label"], beat.choicePoint.label, FIELD_KINDS.LINE, LABEL.choiceLabel)];
    for (const option of beat.choicePoint.options ?? []) {
      if (!option?.id) continue;
      choiceFields.push(field(file, [...pbase, "options", { id: option.id }, "label"], option.label, FIELD_KINDS.LINE, LABEL.choiceOption));
      choiceFields.push(field(file, [...pbase, "options", { id: option.id }, "blurb"], option.blurb, FIELD_KINDS.LINE, LABEL.choiceBlurb));
      choiceFields.push(field(file, [...pbase, "options", { id: option.id }, "consequence"], option.consequence, FIELD_KINDS.PROSE, LABEL.choiceConsequence));
    }
    choice = { fields: choiceFields };
  }

  const itemMark = marks[`${fieldKey(file, ["beats"])}[${beat.id}]`] ?? null;
  return {
    id: `beat:${beat.id}`,
    beatId: beat.id,
    order: index + 1,
    kindLabel: KIND_LABELS[beat.kind] ?? KIND_LABELS.action,
    npcName: beat.npcRef ? (npcNames[beat.npcRef] ?? beat.npcRef) : null,
    // Up: to after the beat two above, or to the top. Down: to after the next one.
    upAfterId: index >= 2 ? beats[index - 2].id : "",
    canUp: index > 0,
    downAfterId: index < beats.length - 1 ? beats[index + 1].id : "",
    canDown: index < beats.length - 1,
    isNew: itemMark?.op === "insert",
    isMoved: itemMark?.op === "move",
    fields,
    settings,
    check,
    choice,
    lists: [],
    noteAnchor: fieldKey(file, base),
    notes: notesAt(base)
  };
}

/** The other scenes a check file serves, since changing it changes them too. */
function sharedCheckScenes(challenge, brief) {
  const others = (challenge.relatedRefs ?? []).filter((ref) => typeof ref === "string" && ref.includes("--") && ref !== brief.id);
  return others.length ? others.join(", ") : null;
}

function personBlock({ member, file, field, notesAt, npcNames }) {
  const base = ["cast", { id: member.id }];
  const brief = member.brief ?? {};
  const voice = brief.voice && typeof brief.voice === "object" ? brief.voice : null;
  const fields = [];
  if (member.label !== undefined && member.label !== null) fields.push(field(file, [...base, "label"], member.label, FIELD_KINDS.LINE, LABEL.personLabel));
  fields.push(field(file, [...base, "role"], member.role, FIELD_KINDS.LINE, LABEL.role));
  fields.push(field(file, [...base, "brief", "wants"], brief.wants, FIELD_KINDS.PROSE, LABEL.wants));
  fields.push(field(file, [...base, "brief", "opensWith"], brief.opensWith, FIELD_KINDS.PROSE, LABEL.opensWith));
  if (voice) fields.push(field(file, [...base, "brief", "voice", "register"], voice.register, FIELD_KINDS.PROSE, LABEL.voice));
  (brief.willDiscuss ?? []).forEach((topic, index) => {
    fields.push(field(file, [...base, "brief", "willDiscuss", { index }, "topic"], topic?.topic, FIELD_KINDS.LINE, LABEL.willTopic));
    fields.push(field(file, [...base, "brief", "willDiscuss", { index }, "note"], topic?.note, FIELD_KINDS.PROSE, LABEL.willNote));
  });
  (brief.willNotDiscuss ?? []).forEach((topic, index) => {
    fields.push(field(file, [...base, "brief", "willNotDiscuss", { index }, "topic"], topic?.topic, FIELD_KINDS.LINE, LABEL.wontTopic));
    fields.push(field(file, [...base, "brief", "willNotDiscuss", { index }, "why"], topic?.why, FIELD_KINDS.PROSE, LABEL.wontWhy));
  });
  (brief.coercible ?? []).forEach((topic, index) => {
    fields.push(field(file, [...base, "brief", "coercible", { index }, "topic"], topic?.topic, FIELD_KINDS.LINE, LABEL.coercibleTopic));
    fields.push(field(file, [...base, "brief", "coercible", { index }, "how"], topic?.how, FIELD_KINDS.PROSE, LABEL.coercibleHow));
  });
  return {
    id: `person:${member.id}`,
    title: npcNames[member.id] ?? member.label ?? member.npcRef ?? member.id,
    fields,
    lists: voice ? [plainList(file, [...base, "brief", "voice", "samples"], voice.samples, FIELD_KINDS.READ, LABEL.samples, field)] : [],
    noteAnchor: fieldKey(file, base),
    notes: notesAt(base)
  };
}

/** A list of plain lines (things to write down, lines to steal): each a text box with a remove key, and a box to add one. */
function plainList(file, path, items, kind, label, field) {
  const list = Array.isArray(items) ? items : [];
  return {
    key: fieldKey(file, path),
    label,
    isPlain: true,
    idPrefix: "",
    textKey: "",
    items: list.map((text, index) => ({ ...field(file, [...path, { index }], text, kind, label), index, itemId: "" }))
  };
}

/** A list of short items with ids of their own (temptations, after-scene prompts): the same, but an added item gets an id. */
function idList(file, path, items, idPrefix, textKey, kind, label, field, marks) {
  const shown = (Array.isArray(items) ? items : []).filter((item) => item && typeof item.id === "string");
  return {
    key: fieldKey(file, path),
    label,
    isPlain: false,
    idPrefix,
    textKey,
    items: shown.map((item, index) => ({
      ...field(file, [...path, { id: item.id }, textKey], item[textKey], kind, label),
      index,
      itemId: item.id,
      isNewItem: marks[`${fieldKey(file, path)}[${item.id}]`]?.op === "insert"
    }))
  };
}
