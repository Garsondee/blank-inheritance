/**
 * FORM 1-B — the Service Agreement the induction terminal makes every player sign on its second page.
 *
 * A gag and a plant at once (Ingram, 2026-09-25): "a massive agreement, designed to be hard to read,
 * which signs them up for things that aren't right or ethical... we flood them with too much to read so
 * they click past it like most people do and we bury things in there that we can use later." Nothing
 * horrendous; bureaucratic overreach and comedy. Players see it ONCE, at signing, and cannot go on
 * without signing (her answers, same day). It ends with a plain out-of-character note saying it's a
 * joke and not a real contract — she was explicit that this note is required.
 *
 * NEVER SHIPPED. tools/ is not part of the module. The build (./build.mjs) turns this into one encoded
 * asset for the module plus a GM copy under data/induction-agreement/ (not in SYNCED_CAMPAIGN_DIRS, so
 * never synced). HOOKS below is GM-only: it says what each buried clause is for.
 *
 * Player-facing rules that apply to every string here: no outside references (no real places, works or
 * decades), no denials of things that exist, nothing that reveals what the table shouldn't know yet (no
 * Watcher, no charter secrets, no ships, no finale, nothing about what the blood tests find). Status:
 * DRAFTED until Ingram grades it.
 */

export const META = {
  formNumber: "FORM 1-B",
  title: "ARTICLES OF ENROLMENT AND GENERAL CONSENTS",
  grade: "RECRUIT GRADE (CLEARANCE 0)",
  subtitle:
    "together with the Schedules, Annexes, Appendices, Standing Orders and Forms referred to herein, each of which forms part of this Agreement whether or not it is attached, has been printed, or exists at the date of signature",
  issuedBy: "Issued by the Induction Office, Kurose, under the authority of the Directorate",
  seed: 1925, // deterministic build; change only on purpose (it renumbers every generated clause)
};

export const PARTIES = [
  "THIS AGREEMENT is made on the date shown on the terminal clock, which the parties agree is correct.",
  "BETWEEN:",
  "(1) THE DIRECTORATE, acting by its Induction Office and by any other Office it may from time to time decide was acting on its behalf (the \"Directorate\"); and",
  "(2) THE PERSON OPERATING THIS TERMINAL, and any person the Directorate reasonably believes to have been operating it (the \"Recruit\").",
];

export const RECITALS = [
  "The Directorate exists to keep a promise, and keeps it.",
  "The Recruit has applied, or has been streamed, or has otherwise arrived, and wishes to be enrolled.",
  "The Directorate is willing to enrol the Recruit on the terms set out below and on no others, save such others as may be added.",
  "Each party has read this Agreement in full, or has had a reasonable opportunity to do so, which the parties agree amounts to the same thing.",
  "The Recruit has been advised to seek independent advice and has declined, which declining is recorded.",
  "The parties wish to record their understanding in writing, at some length.",
];

// Hand-written definitions. The build adds generated ones (see VOCAB.defTerms) and sorts the lot.
export const DEFINITIONS = [
  ["Agreement", "this instrument, including every Schedule, Annex, Appendix, Standing Order and Form referred to in it, as amended, supplemented, reissued or reinterpreted from time to time"],
  ["Approved Account", "the account of an event recorded by the Office of Approved Accounts, which is the account of that event"],
  ["Canteen", "the Directorate canteen and any place in which the Canteen Committee is sitting"],
  ["Day", "a period of four Quarters, whether or not the sun agrees"],
  ["Directorate Equipment", "any object issued to, lent to, left near, or used by the Recruit, together with anything written, stored or recorded on or by it"],
  ["Duty", "anything the Recruit is asked to do by a person who appears to be entitled to ask"],
  ["Fortnight", "the period shown on the Time Office board as a fortnight"],
  ["Founders", "the four persons honoured as the Founders of the Directorate, as depicted in the official portraits"],
  ["Machine", "any Frame, vehicle, rig, crane, conveyance or apparatus, whether or not it has been given a name, and whether or not it works"],
  ["Meal", "anything served in the Canteen during a mealtime, including on Thursdays"],
  ["Quarter", "one of the four divisions of a Day, as recorded by the Time Office"],
  ["Record", "any record, whether or not accurate, which shall be treated as accurate"],
  ["Sample", "any quantity of blood, tissue, hair, saliva or other material taken from, shed by, or otherwise obtained from the Recruit"],
  ["Section", "any section of the Directorate, including sections not listed in Schedule 2, sections not yet formed, and sections the Recruit has not been told about"],
  ["Tea Urn", "the tea urn, which is Directorate property and is not a place"],
];

// The authored spine. Each article: [title, clauses]. A clause is a string, an array (a sub-clause
// list), or { hook: "<id>" } (pulled from HOOKS). The build pads every article with generated filler
// clauses around the authored ones, so the authored ones sit deep in the middle, never first.
export const PARTS = [
  ["ENROLMENT", [
    ["Enrolment", [
      "The Recruit is enrolled with effect from the moment of signature, or from such earlier moment as the Directorate may later determine.",
      "Enrolment is not employment, apprenticeship, tenancy or friendship, and shall not be construed as any of them unless the Directorate so construes it.",
    ]],
    ["Grade and Clearance", [
      "The Recruit holds the grade of Recruit and Clearance 0 until notified otherwise on the appropriate Form.",
      "A Recruit who believes they have been promoted shall continue to act as a Recruit until the notice of promotion has been stamped.",
    ]],
    ["Designations", [
      { hook: "working-name" },
      "A designation is not a nickname. A nickname is not a designation. Neither is a rank.",
    ]],
    ["Warranties", [
      "The Recruit warrants that everything entered on Form 1-A is true and complete, and that any part left blank was left blank truthfully.",
      { hook: "appearance-warranty" },
    ]],
  ]],
  ["DUTIES OF THE RECRUIT", [
    ["General Duties", [
      "The Recruit shall perform every Duty diligently, cheerfully and in the correct order.",
      "Where two Duties conflict, the Recruit shall perform the Duty assigned by the more senior Office, as listed in Schedule 2, and shall apologise to the other.",
    ]],
    ["The Board and the Quarters", [
      "The Recruit shall be findable, in each Quarter, in the place recorded against the Recruit's name on the Time Office board.",
      "The Recruit may do more than one thing in a Quarter, but may be recorded as being in only one place, and shall be in that place if anybody looks.",
    ]],
    ["Uniform", [
      "The Recruit shall wear the uniform issued, in the combinations set out in Schedule 3, and shall not wear socks of an unapproved hue.",
    ]],
    ["Conduct in Queues", [
      "The Recruit shall queue in the manner set out in Annex F and shall not form, join, or be seen near an unauthorised queue.",
    ]],
    ["Humming and Whistling", [
      "Humming is permitted during the Hours set out in Schedule 4. Whistling is governed separately and is not permitted.",
    ]],
    ["The Canteen", [
      "The Recruit accepts that the Thursday Meal is a Meal.",
      "The Recruit shall not attempt to read this Agreement aloud in the Canteen.",
      "The Tea Urn is Directorate property. The Recruit shall not lean on it, name it, or arrange to meet anyone at it.",
    ]],
    ["Salutes", [
      "The Recruit shall not salute an officer of the Kingdom's army or navy first, but shall return any salute promptly and with a neutral expression.",
    ]],
  ]],
  ["EQUIPMENT, MACHINES AND PROPERTY", [
    ["Issue of Equipment", [
      "Directorate Equipment is issued in the condition in which it is issued.",
    ]],
    ["Damage and Deductions", [
      { hook: "damage-deductions" },
    ]],
    ["Machines", [
      "The Recruit shall operate any Machine to which the Recruit is assigned, in the manner the Machine appears to expect.",
      { hook: "prototype-trials" },
    ]],
    ["Naming of Machines", [
      "The Recruit shall not name any Machine after a member of staff, living or retired, or after the Quartermaster in particular.",
    ]],
    ["Found Property", [
      { hook: "salvage" },
    ]],
    ["Sealed Envelopes", [
      { hook: "sealed-envelope" },
    ]],
    ["Custody", [
      { hook: "custody" },
    ]],
  ]],
  ["COMMUNICATIONS AND RECORDS", [
    ["Directorate Communications Equipment", [
      "Any telephone, terminal, radio, notebook, noticeboard or message pad supplied by the Directorate is Directorate Equipment for all purposes, including this Part.",
    ]],
    ["Correspondence", [
      { hook: "monitoring" },
      "The Recruit waives any objection to the matters in this Article, including objections the Recruit has not yet thought of.",
    ]],
    ["Records", [
      "A Record is conclusive as to its contents, and where a Record and an event disagree, the Record shall prevail.",
    ]],
    ["Approved Accounts", [
      { hook: "approved-account" },
    ]],
    ["Forgetting", [
      { hook: "forgetting" },
    ]],
  ]],
  ["MEDICAL AND BIOLOGICAL MATTERS", [
    ["Examinations", [
      "The Recruit shall attend such medical examinations as are arranged, and shall sign Form 12b (Medical Consents) when it is presented, which the Recruit hereby agrees to do.",
    ]],
    ["Samples", [
      { hook: "samples" },
    ]],
    ["Fitness", [
      "The Recruit shall remain fit for Duty, and shall report any change in fitness to the Medical Division before the change occurs where practicable.",
    ]],
  ]],
  ["NAME, LIKENESS AND PUBLIC LIFE", [
    ["Likeness", [
      { hook: "likeness" },
    ]],
    ["The Founders", [
      { hook: "founders-portraits" },
    ]],
    ["Ceremonies", [
      "The Recruit shall attend Founding Day and such other ceremonies as are announced, and shall stand, sit and applaud as instructed.",
    ]],
  ]],
  ["EXTERNAL BODIES", [
    ["The Civil Police", [
      { hook: "police" },
    ]],
    ["The Press", [
      "The Recruit shall not speak to the press, except to say \"good morning\", and then only in the morning.",
    ]],
    ["Family", [
      "The Directorate may write to the Recruit's family on the Recruit's behalf, in a tone of its choosing.",
    ]],
  ]],
  ["ASSIGNMENT", [
    ["Sections", [
      { hook: "any-section" },
    ]],
    ["Favours", [
      { hook: "one-favour" },
    ]],
    ["Contact", [
      { hook: "form-7v" },
    ]],
    ["Biscuit", [
      { hook: "biscuit" },
    ]],
  ]],
  ["ANIMALS AND STRAYS", [
    ["Animals", [
      { hook: "strays" },
    ]],
  ]],
  ["VARIATION, SURVIVAL AND REVIEW", [
    ["Annex Q", [
      { hook: "annex-q" },
    ]],
    ["Variation", [
      { hook: "variation" },
    ]],
    ["Hearings", [
      { hook: "hearings" },
    ]],
    ["Survival", [
      "The terms of this Agreement survive the Recruit's discharge, transfer, promotion, retirement, and any later event.",
    ]],
  ]],
  ["GENERAL", [
    ["Entire Agreement", [
      "This Agreement is the entire agreement between the parties, save for anything else the parties may be found to have agreed.",
    ]],
    ["Time", [
      "The Directorate's clocks are correct. Time is of the essence, and the essence is the Directorate's.",
    ]],
    ["Headings", [
      "Headings are for convenience only, and the Recruit shall not rely on them, or on anything else in this Agreement for convenience.",
    ]],
    ["Signature", [
      "The Recruit signs this Agreement by pressing the button marked I AGREE, and acknowledges that the button is a signature, a seal, and a witness.",
    ]],
  ]],
];

/**
 * The buried clauses, GM-ONLY. `text` is what the player sees (inside an otherwise dull Article).
 * `use` is what it's for. Nothing here reveals anything; every one is a plant with a payoff to come.
 */
export const HOOKS = {
  "monitoring": {
    text: "The Recruit consents to the Directorate reading, copying, keeping and acting upon any correspondence, message, note, drawing or record made, sent, received, begun, abandoned or left lying about by the Recruit by means of Directorate Equipment, at any time, for any purpose the Directorate considers proper, without further notice, and agrees that such consent extends to Form 12b and to any form that replaces it.",
    use: "The Chapter 8 reveal: the Directorate has been reading their messages all along, under the paperwork they signed on day one. Pairs with Intake Medicals' form 12b.",
    refs: ["episode-c1e1--intake-medicals (form-12b)", "blank-inheritance-twenty-chapters.md Ch 8"],
  },
  "samples": {
    text: "The Recruit consents to the taking, keeping, testing and comparison of Samples, including for the purpose of matching the Recruit to Machines or other equipment, and agrees that all Samples, and all results derived from them, and all conclusions drawn from those results, are the property of the Directorate, which is under no obligation to share them.",
    use: "Sets up the Gen 2 DNA piloting reveal around level 4 without saying what the tests find. Pairs with the blood screen at Intake Medicals.",
    refs: ["project flag-vs-disguise (blood-screen irregular flag)", "dossier-second-generation-frames.md"],
  },
  "likeness": {
    text: "The Recruit grants the Directorate the perpetual and irrevocable right to use, reproduce, alter, improve, restyle, idealise and replace the Recruit's name, likeness, voice, height and signature in any official portrait, photograph, poster, statue, broadcast, memorial or commemorative object, and waives any right to be recognisable in it.",
    use: "Echoes the founders' 'famous names, sanitised faces' portraits: the Directorate can make anyone look like whatever it wants. Use when the party finds themselves on a recruitment poster, improved.",
    refs: ["LEDGER #27", "LEDGER #36 (portrait wall idea)"],
  },
  "founders-portraits": {
    text: "The Recruit accepts the official portraits of the Founders as accurate likenesses, and shall not make, repeat, sketch, sculpt or sing any unofficial depiction of them.",
    use: "The four founders' players will read this later and laugh. Pays off against Shucks the skeleton and the gnoll statue labelled HYUCK.",
    refs: ["LEDGER #27", "LEDGER #28"],
  },
  "prototype-trials": {
    text: "The Recruit agrees to take part in trials of experimental, prototype and conceptual Machines when assigned, and acknowledges that the words \"experimental\", \"prototype\" and \"conceptual\" have their ordinary meanings and that no further warning will be given.",
    use: "Hyuck, the mad test pilot of the Directorate's worst Frame concepts, arrives with the paperwork already signed. Also any GM-invented ridiculous machine.",
    refs: ["project hyuck-founder-concept", "blank-inheritance-twenty-chapters.md Ch 7"],
  },
  "appearance-warranty": {
    text: "The Recruit further warrants that the Recruit is, in every material respect, what the Recruit appears to be, and undertakes to notify the Induction Office in writing, within one Quarter, of any respect in which this warranty is or becomes untrue.",
    use: "Every disguised character is in breach the moment they sign, and (GM-only) so is everyone, given the universal mitflit DNA. For comedy and the Gen 2 reveal. NEVER use it to force a player's reveal; the reveal is always the player's.",
    refs: ["design/induction.md §2 (the reveal belongs to the player)", "project flag-vs-disguise"],
  },
  "working-name": {
    text: "The Directorate may assign the Recruit a working name, callsign or designation, which the Recruit shall answer to, and may change it without notice, and the Recruit shall answer to the new one as though it had always been so.",
    use: "Callsigns and nicknames later; also a way to rename a PC in the fiction as a joke.",
    refs: [],
  },
  "damage-deductions": {
    text: "The Recruit is liable for loss of or damage to Directorate Equipment and Machines, recoverable by deduction from the Recruit's allowance at the rates in Schedule 6, which rates the Quartermaster may revise upward at any time and downward never.",
    use: "Hook into the machine credit budget and repair backlog: the bill for a wrecked vehicle, itemised.",
    refs: ["config.json frameEconomy"],
  },
  "salvage": {
    text: "Any object, material, substance or residue recovered, found, handled, carried or trodden in by the Recruit in the course of any Duty becomes Directorate property on the instant, including any object the Recruit did not know they had, and the Recruit shall surrender it on request.",
    use: "Strategy-layer artefacts and anything the party wants to keep: the Directorate can claim it. Also any residue from a site.",
    refs: ["project strategy-layer (artefacts)"],
  },
  "sealed-envelope": {
    text: "The Recruit shall keep, and shall not open, any sealed envelope issued to the Recruit under this Agreement until instructed to open it, and agrees that the instruction may itself arrive in a sealed envelope.",
    use: "OPEN-ENDED. Hand a PC a sealed envelope at any point (Kit Issue, a briefing) and decide later what's in it.",
    refs: [],
  },
  "custody": {
    text: "The Recruit accepts custody of such items as may be entrusted to the Recruit from time to time, including items the Recruit is not told have been entrusted to them, and is responsible for their safe keeping.",
    use: "OPEN-ENDED. Something was put in a PC's locker, kitbag or machine. It's their responsibility now.",
    refs: [],
  },
  "approved-account": {
    text: "The Recruit agrees to be debriefed, and re-debriefed, and to accept the Approved Account of any event as the account of that event, and shall not maintain, repeat or write down any other account once the Approved Account has been issued.",
    use: "The official line and approved accounts (LEDGER #27, #35): the Directorate rewrites what happened, and the party signed up to believe it.",
    refs: ["LEDGER #35 (the official line)", "LEDGER #27"],
  },
  "forgetting": {
    text: "Where the Recruit becomes aware of anything the Recruit ought not to know, the Recruit shall forget it promptly and shall confirm in writing, on Form 9-F, that it has been forgotten.",
    use: "OPEN-ENDED and funny: a clerk handing a PC Form 9-F after they've seen something. Also a way to acknowledge a discovery without the Directorate admitting it.",
    refs: [],
  },
  "police": {
    text: "The Recruit shall not discuss the business of the Directorate with any officer of the civil police, and shall refer any such officer to the Liaison Office, which is open on alternate Tuesdays.",
    use: "The police and the Directorate distrust each other (LEDGER #35). Friction at a cordon; a PC caught talking to Hori.",
    refs: ["LEDGER #35"],
  },
  "any-section": {
    text: "The Recruit may be assigned to any Section, for any period, for any purpose, and consents in advance to assignment to a Section that is not listed in Schedule 2, has not yet been formed, or cannot be discussed.",
    use: "Section Nine's roster, countersigned by a Medical officer who doesn't exist (Rand, LEDGER #34). Any mystery assignment later.",
    refs: ["LEDGER #34 (Rand)", "the-section-officer.md"],
  },
  "one-favour": {
    text: "The Recruit agrees to perform one (1) favour for the Directorate, of the Directorate's choosing, at a time of the Directorate's choosing, without asking why, and acknowledges that the favour may be called in by any Office.",
    use: "OPEN-ENDED. The GM can call it in at any point, from anyone who can show the clause.",
    refs: [],
  },
  "form-7v": {
    text: "The Recruit consents to being contacted at any hour by any person presenting a valid Form 7-V, and shall extend to that person every reasonable courtesy and the use of a chair.",
    use: "OPEN-ENDED. A stranger with a Form 7-V can knock at midnight. Who issues Form 7-Vs is undecided.",
    refs: [],
  },
  "biscuit": {
    text: "Any Recruit who has read this far is entitled to one (1) biscuit, redeemable at the Canteen on presentation of Form 1-B(ii), which is not available.",
    use: "A reward for the one player who actually reads it. If anyone asks for the biscuit, honour it in the fiction (and at the table, if there are biscuits).",
    refs: [],
  },
  "strays": {
    text: "The Recruit shall not feed, name, shelter or keep any animal or stray found on or near Directorate property, and shall report any such animal or stray that appears to be following the Recruit.",
    use: "Plants the stray (v4 §6: something small that follows one PC home, waiting to be fed) without saying what it is.",
    refs: ["open-questions.json#the-stray"],
  },
  "annex-q": {
    text: "The Recruit agrees to the terms of Annex Q, which will be notified to the Recruit when they become relevant, and acknowledges that they are agreed now.",
    use: "OPEN-ENDED. Annex Q is blank. Fill it whenever the story needs a term the party has 'already agreed to'.",
    refs: [],
  },
  "variation": {
    text: "In an emergency, as declared by the Directorate, any term of this Agreement may be varied by announcement, and an announcement made in any Canteen is an announcement made in every Canteen.",
    use: "Lets the Directorate change the rules mid-crisis, legally, in the fiction.",
    refs: [],
  },
  "hearings": {
    text: "The Recruit shall attend any Hearing of the Board of Review to which the Recruit is summoned, and accepts the findings of any such Hearing in advance, on the understanding that this saves everybody time.",
    use: "OPEN-ENDED satire: a disciplinary hearing whose verdict is already typed.",
    refs: [],
  },
};

/** The last thing in the document. Ingram, 2026-09-25: "I'm serious about adding a note at the end which makes it clear that the above is just a joke, not a real contract." */
export const OOC_NOTE = [
  "OUT OF CHARACTER",
  "This agreement is a joke, and part of the game's story. It is not a real contract. It binds your character, not you, and pressing I AGREE doesn't commit you, the player, to anything in real life.",
];

/** Signature block, before the OOC note. */
export const SIGNATURE = [
  "IN WITNESS WHEREOF the parties have signed this Agreement on the date first written above, or shown on the clock, whichever the Directorate prefers.",
  "SIGNED by the Recruit, by pressing the button marked I AGREE.",
  "SIGNED for and on behalf of the Directorate, by stamp.",
];

// Generator vocabulary. Deliberately dull, occasionally ridiculous, never alarming.
export const VOCAB = {
  offices: [
    "Induction Office", "Time Office", "Quartermaster's Stores", "Canteen Committee", "Records Office", "Liaison Office",
    "Medical Division", "Motor Pool", "Hangar Office", "Office of Approved Accounts", "Stationery Office", "Office of Forms",
    "Correspondence Office", "Board of Review", "Duty Office", "Lost Property Office", "Uniform Store",
    "Inspectorate of Queues", "Office of Ceremonies", "Signals Office", "Works Department", "Laundry", "Boiler House",
    "Post Room", "Restricted Library", "Office of Keys", "Office of Duplicate Keys", "Dormitory Wardens",
  ],
  items: [
    "left boot", "right boot", "pair of regulation socks", "HB pencil", "2B pencil", "eraser", "ration card", "mess tin",
    "tea mug", "dormitory key", "locker key", "helmet", "pair of ear defenders", "torch", "torch battery", "flask",
    "clipboard", "whistle", "spanner", "stepladder", "black umbrella", "identity disc", "lanyard", "blanket", "pillow",
    "mop", "bucket", "spoon", "fork", "butter knife", "tray", "rubber stamp", "ink pad", "sheet of carbon paper",
    "typewriter ribbon", "paperclip", "drawing pin", "length of string", "stick of chalk", "oil can", "rag",
    "pair of goggles", "pair of gloves", "set of overalls", "raincoat", "kitbag", "canteen chit", "timetable",
    "copy of this Agreement", "fire bucket", "sand bucket", "coat hook", "coat hanger", "name tape", "shoe brush",
    "tin of boot polish", "sewing kit", "ruler", "protractor", "slide rule", "notebook", "message pad",
  ],
  verbs: [
    "sign for", "return", "account for", "report the loss of", "polish", "inspect", "store", "label", "stack", "fold",
    "count", "dust", "requisition", "re-requisition", "present", "surrender", "retain", "carry", "decline to carry",
    "keep dry", "keep in a cool place", "keep out of reach of the Canteen Committee",
  ],
  states: [
    "lost", "found", "surplus", "unaccounted for", "accounted for twice", "in store", "out of store", "in transit",
    "obsolete", "provisionally obsolete", "reissued", "damaged", "undamaged but suspected", "pending inspection",
  ],
  conditions: [
    "save where the Duty Officer directs otherwise",
    "provided that Form {form} has been lodged in triplicate",
    "except on alternate Tuesdays",
    "unless the Time Office records otherwise, in which case the Record prevails",
    "where practicable",
    "without prejudice to Article {article}",
    "in accordance with Annex {annex}",
    "to the reasonable satisfaction of the {office}",
    "within one Quarter of being asked",
    "before the Tea Urn is emptied",
    "during any Quarter other than the first",
    "subject always to Schedule {schedule}",
    "notwithstanding Clause {clause}",
    "save as provided in Appendix {appendix}",
    "whether or not the {office} is open",
    "if so requested, and if not so requested, then in any event",
    "on the next working Day, or the Day after, at the {office}'s discretion",
    "in the presence of a witness, who shall not be the Recruit",
  ],
  defTerms: [
    "Allowance", "Annex", "Appendix", "Assignment", "Badge", "Board", "Boot", "Briefing", "Bulletin", "Callsign",
    "Canteen Chit", "Chit", "Clearance", "Clipboard", "Corridor", "Countersignature", "Debrief", "Deduction", "Designation",
    "Discharge", "Dormitory", "Drill", "Duplicate", "Duty Officer", "Duty Roster", "Envelope", "Exercise", "Form",
    "Hatch", "Hearing", "Hours", "Inspection", "Issue", "Kitbag", "Ledger", "Liaison", "Locker", "Mealtime",
    "Muster", "Notice", "Noticeboard", "Office", "Parade", "Pass", "Pencil", "Permit", "Posting", "Precedence",
    "Probation", "Queue", "Receipt", "Requisition", "Roster", "Rota", "Schedule", "Seal", "Sock", "Stamp",
    "Standing Order", "Stationery", "Stores", "Tray", "Triplicate", "Uniform", "Voucher", "Waiting Room", "Witness",
  ],
  defPhrases: [
    "has the meaning given to it by the {office}, as amended",
    "means any {item} or thing that the {office} reasonably considers to be one",
    "includes any part of it, anything of which it forms part, and anything described as such on Form {form}",
    "has the meaning it had on the last occasion it was defined, unless redefined",
    "means that which is recorded as such by the {office}",
    "shall be construed in accordance with Schedule {schedule}",
    "includes the plural, the singular, and any intermediate quantity",
    "means the item so called by the {office} at the relevant time, whatever it was called at any other time",
  ],
  articleTitles: [
    "Requisitions", "Returns", "Inspections", "Receipts", "Duplicates", "Keys", "Lockers", "Stationery", "Notices",
    "Musters", "Precedence", "Passes", "Permits", "Chits", "Vouchers", "Rotas", "Hatches", "Waiting Rooms", "Stamps",
    "Seals", "Ledgers", "Corridors", "Laundry", "Lost Property", "Surplus Property", "Stores", "Boots", "Socks",
    "Trays", "Umbrellas", "Clipboards", "Carbon Paper", "Queues (Supplementary)", "Tea (Supplementary)",
  ],
  schedules: [
    ["Forms Referred To", "forms"],
    ["Sections of the Directorate", "sections"],
    ["Approved Hues of Regulation Socks", "socks"],
    ["Permitted Hours of Humming", "humming"],
    ["The Canteen Menu (Standing)", "menu"],
    ["Tariff of Deductions", "tariff"],
    ["Order of Precedence in Queues", "precedence"],
    ["Salutes, Nods and Acknowledgements", "salutes"],
    ["Approved Expressions of Enthusiasm", "enthusiasm"],
    ["Stationery Allocation per Quarter", "stationery"],
    ["Items Issued on Enrolment", "issue"],
    ["Items Not Issued on Enrolment", "notissued"],
  ],
  annexTitles: [
    "Procedure for the Orderly Queueing of Recruits", "Procedure for the Return of Boots", "Procedure for Reporting a Procedure",
    "Procedure for the Lodging of Forms in Triplicate", "Procedure for the Reissue of Lost Keys", "Procedure at the Hatch",
    "Procedure for the Folding of Blankets", "Procedure for Attending a Muster", "Procedure for Waiting",
    "Procedure for the Correction of Records", "Procedure for Declining the Correction of Records",
    "Procedure for the Use of the Tea Urn", "Procedure for Leaving a Waiting Room", "Procedure for Re-entering a Waiting Room",
  ],
  sections: [
    "Section One (Administration)", "Section Two (Stores)", "Section Three (Machines)", "Section Four (Medical)",
    "Section Five (Signals)", "Section Six (Works)", "Section Seven (Ceremonies)", "Section Eight (Records)",
  ],
  socks: ["Regulation Grey", "Regulation Grey (Winter)", "Parade Black", "Canteen Beige", "Workshop Brown", "Medical White (issued on request only)"],
  menu: [
    ["Monday", "Rice, fish, pickles"], ["Tuesday", "Noodles, broth"], ["Wednesday", "Rice, egg, pickles"],
    ["Thursday", "Curry (a Meal; see the Article headed \"The Canteen\")"], ["Friday", "Fish, rice, the remainder of Thursday"],
    ["Saturday", "Whatever the Canteen Committee decides"], ["Sunday", "As Saturday, reheated"],
  ],
};
