// The Casebook's styles for the generated sections (derive.mjs, render.mjs). head.html holds the shared tokens and the
// page furniture; detail.mjs holds Part Zero's. This adds what the generated parts need: ink and pencil drawn
// differently, collapsible cards, the key at the top, and the chapter, question and decision cards.
//
// Ink is full strength with a solid rule; awaiting-read is ink with a hatched rule; pencil is lighter type with a
// dashed rule; open is an amber dashed box; cut is struck through. Every colour is a token, so dark mode follows.
export const GENERATED_CSS = `
/* ---------- tokens the generated parts add ---------- */
:root{--pencil:#6f6450;--pencil-rule:#b9a57c}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--pencil:#a99d82;--pencil-rule:#6a5a38}}
:root[data-theme="dark"]{--pencil:#a99d82;--pencil-rule:#6a5a38}

/* ---------- tags, extended: awaiting read, both kinds of pencil, cut, an idea's state ---------- */
.tag.wait{background:repeating-linear-gradient(135deg,var(--canon-bg) 0 4px,transparent 4px 8px);color:var(--canon);box-shadow:inset 0 0 0 1px var(--canon)}
.tag.hers{background:transparent;color:var(--pencil);outline:1px dashed var(--pencil);outline-offset:-1px}
.tag.cut{background:transparent;color:var(--ink-2);text-decoration:line-through;box-shadow:inset 0 0 0 1px var(--rule-strong)}
.tag.state{background:transparent;color:var(--ink-2);box-shadow:inset 0 0 0 1px var(--rule-strong)}

/* ---------- the key and the numbers at the top ---------- */
.howto,.glance{margin:18px 0 0;padding:14px 16px;border:2px solid var(--rule-strong);background:var(--sheet);max-width:980px}
.glance{border:1px solid var(--rule)}
.howto h2,.glance h2{font:700 12px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--red);margin:0 0 10px}
.howto p{margin:.5em 0;max-width:84ch;font-size:15px}
ul.legend{list-style:none;margin:8px 0;padding:0;display:grid;gap:6px 24px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
ul.legend li{display:flex;gap:8px;align-items:baseline;font-size:14px;line-height:1.4;color:var(--ink-2)}
ul.legend li .tag{flex:none}
.glance table{min-width:0;font-size:14px}
.glance th{width:7.5em;background:transparent;position:static}
.glance td,.glance th{padding:4px 8px;border-bottom:1px dotted var(--rule)}
.fold-controls{margin:10px 0 0}
.fold-controls button{font:700 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:6px 10px;border:1px solid var(--rule-strong);background:var(--ground);color:var(--ink);cursor:pointer}
.fold-controls button:hover{border-color:var(--red);color:var(--red)}
nav.toc small{color:var(--ink-2);font:11px var(--mono);margin-left:4px}
.index{margin:6px 0 14px 64px;font-size:14px;line-height:1.9;max-width:78ch;color:var(--ink-2)}
.index a{color:var(--ink);text-decoration:none;border-bottom:1px dotted var(--rule-strong);white-space:nowrap}
.index a:hover{color:var(--red);border-bottom-color:var(--red)}
.none{margin:8px 0 8px 64px;color:var(--ink-2);font-style:italic}
.warnw{color:var(--amber)}
.lbl{display:inline-block;margin-right:8px;font:700 11px/1.6 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
a.ref{text-decoration:none}
a.ref code{color:var(--red)}
a.ref:hover code{text-decoration:underline}
a.chip{display:inline-block;margin:0 4px 3px 0;padding:1px 7px;border:1px solid var(--rule);border-radius:10px;font-size:13px;color:var(--ink);text-decoration:none;background:var(--sheet)}
a.chip:hover{border-color:var(--red);color:var(--red)}
span.chip{display:inline-block;margin:0 4px 3px 0;padding:1px 7px;border:1px dashed var(--rule);border-radius:10px;font-size:13px;color:var(--ink-2)}
.src{font:12px var(--mono)}
.src-import{font-style:italic}

/* ---------- collapsible cards: the same bar for every kind ---------- */
details.ent,details.chap,details.qcard,details.thr,details.call,details.grp,details.topic{margin:10px 0 10px 64px;border:1px solid var(--rule);background:var(--sheet);box-shadow:var(--shadow);max-width:840px;scroll-margin-top:16px}
details.ent > summary,details.chap > summary,details.qcard > summary,details.thr > summary,details.call > summary,details.grp > summary,details.topic > summary{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;padding:8px 12px 8px 30px;cursor:pointer;list-style:none;position:relative}
details > summary::-webkit-details-marker{display:none}
details.ent > summary::before,details.chap > summary::before,details.qcard > summary::before,details.thr > summary::before,details.call > summary::before,details.grp > summary::before,details.topic > summary::before{content:"▸";position:absolute;left:11px;top:9px;color:var(--ink-2);font-size:13px;transition:transform .12s}
details[open] > summary::before{transform:rotate(90deg)}
@media (prefers-reduced-motion: reduce){details > summary::before{transition:none}}
details[open] > summary{border-bottom:1px solid var(--rule)}
details > summary:hover .et,details > summary:hover .qt,details > summary:hover .tt,details > summary:hover .dt{color:var(--red)}
.ebody,.qbody,.tbody,.dbody,.gbody{padding:4px 14px 12px}
@media (max-width:620px){details.ent,details.chap,details.qcard,details.thr,details.call,details.grp,details.topic,.index,.none{margin-left:0}}

/* ---------- entity cards ---------- */
.et{font:600 17px/1.3 var(--body)}
.ek{font:700 10.5px/1.6 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.ec{font:12px/1.5 var(--mono);color:var(--ink-2);margin-left:auto}
.ebody h5,.qbody h5,.cbody h5,.tbody h5,.gbody h5{margin:14px 0 4px;font:700 11px/1.6 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.enote{margin:8px 0;padding:4px 12px;border-left:3px solid var(--rule-strong);background:var(--ground)}
.enote h5{margin:4px 0}
.enote p{margin:.3em 0}
.enote blockquote{margin:.4em 0;padding:2px 12px;border-left:3px solid var(--rule-strong);font-style:italic;color:var(--ink-2)}
.enote blockquote p{margin:.3em 0}
.ethreads{margin:6px 0}
.elsewhere{margin:12px 0 2px;padding-top:8px;border-top:1px dotted var(--rule);font-size:14px;color:var(--ink-2)}
.gmbox{margin:12px 0 4px;padding:6px 12px 8px;border-left:3px solid var(--gm);background:var(--gm-bg)}
.gmbox h5{margin-top:4px;color:var(--gm)}

/* ---------- facts: the one record each fact has ---------- */
ul.facts{list-style:none;margin:6px 0 10px;padding:0}
li.fact{margin:0 0 8px;padding:4px 10px 5px 12px;border-left:3px solid var(--canon);max-width:76ch}
li.fact .ftags{margin-right:6px}
li.fact .ftext{font-weight:500}
li.fact .fmeta{display:block;margin-top:2px;font:12px/1.55 var(--mono);color:var(--ink-2);overflow-wrap:anywhere}
li.fact .fmeta a{color:inherit}
li.fact .fid{font-weight:700}
li.fact.ink .ftext{color:var(--ink)}
li.fact.wait{border-left:3px solid var(--teal);background:linear-gradient(90deg,var(--teal-bg),transparent 14%)}
li.fact.pencil{border-left:2px dashed var(--pencil-rule);color:var(--pencil)}
li.fact.pencil .ftext{font-weight:380;color:var(--pencil)}
li.fact.pencil .fmeta{color:var(--pencil)}
li.fact.open{border:1px dashed var(--amber);border-left:3px dashed var(--amber);background:var(--amber-bg);padding:6px 12px 8px}
li.fact.cut{border-left:3px solid var(--rule-strong)}
li.fact.cut .ftext{text-decoration:line-through;color:var(--ink-2);font-weight:400}
.gmbox li.fact{background:transparent}
.cands{margin:6px 0 2px}
.cand{margin:2px 0;padding-left:1.6em;position:relative}
.cand .cn{position:absolute;left:0;font:700 12px/1.7 var(--mono);color:var(--amber)}
.decby{margin:4px 0 0}
.relied{display:block;margin-top:3px;font:700 11px/1.5 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--red)}
.fabout{display:block;margin-top:2px;font:12px/1.5 var(--mono);color:var(--ink-2)}
.fabout a{color:inherit}
span.pref{display:inline}
span.pref.pencil{color:var(--pencil)}
span.pref .ptext{color:var(--ink-2)}
span.pref.pencil .ptext{color:var(--pencil)}
.pwhy{font:11px var(--mono);color:var(--ink-2);text-transform:uppercase;letter-spacing:.06em}

/* ---------- chapters and Books ---------- */
details.chap{max-width:860px}
details.chap > summary .no{font:400 30px/1 var(--display);color:var(--red);min-width:1.2em}
details.chap > summary .ttl{font:600 20px/1.25 var(--body);flex:1 1 12em}
details.chap > summary .rank{font:700 11px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
details.chap.pencil{border-style:dashed}
details.chap.pencil > summary .ttl{font-weight:500;color:var(--pencil)}
details.chap.built{border-left:4px solid var(--canon)}
.cbody{padding:4px 14px 12px}
.cbody .line{margin:8px 0 4px;color:var(--ink-2);font-style:italic;max-width:68ch}
.cbody .learn{margin:6px 0 2px;max-width:70ch}
ol.play,ul.choices,ul.ends{margin:0;padding-left:1.7em;max-width:72ch}
ul.choices,ul.ends{list-style:none;padding-left:0}
li.beat{margin:0 0 8px;padding-left:2px}
ol.play li.beat::marker{font:700 13px var(--mono);color:var(--red)}
li.beat.pencil{color:var(--pencil)}
li.beat .pace{display:inline-block;min-width:1.5em;font-size:12px;color:var(--ink-2)}
li.beat .pace.up{color:var(--red)}
.bk{display:inline-block;margin-right:6px;padding:1px 5px;font:700 10px/1.4 var(--mono);letter-spacing:.1em;text-transform:uppercase;border:1px solid var(--rule-strong);color:var(--ink-2)}
.bk.fork{border-color:var(--red);color:var(--red)}
.bk.reveal{border-color:var(--gm);color:var(--gm)}
.due{margin:12px 0 4px;padding:6px 12px 8px;border-left:3px dashed var(--amber);background:var(--amber-bg)}
.due h5{margin-top:4px;color:var(--amber)}
.due ul{margin:0;padding-left:1.2em;max-width:70ch}
.due li{margin:0 0 5px}
.bmeta{display:block;margin-top:2px;font:12px/1.6 var(--mono);color:var(--ink-2)}
.tells{margin:4px 0 4px 1.2em}
.bookrows{margin:8px 0 6px 64px;display:grid;grid-template-columns:136px minmax(0,1fr);gap:5px 14px;max-width:780px}
.bookrows dt{font:700 11px/1.75 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.bookrows dd{margin:0}
.book.pencil{border-style:dashed}
@media (max-width:620px){.bookrows{margin-left:0;grid-template-columns:minmax(0,1fr);gap:0}.bookrows dt{margin-top:8px}}
tr.bookrow td{background:var(--ground);font:700 12px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--red)}
td.ch{font:400 22px/1 var(--display);white-space:nowrap}
td.ch a{color:var(--red);text-decoration:none}
.tbl.overview table{min-width:820px}
.tbl.roadsx table{min-width:760px}
.tbl.roadsx th:nth-child(1),.tbl.roadsx td:nth-child(1){width:20%}
.tbl.roadsx th:nth-child(2),.tbl.roadsx td:nth-child(2){width:12%}
.tbl.roadsx th:nth-child(3),.tbl.roadsx td:nth-child(3){width:50%}
.tbl.roadsx td .road{display:block;margin:0 0 6px}
tr.pencil td{color:var(--pencil)}

/* ---------- questions, threads, calls, decisions, ideas ---------- */
.qt,.tt{font:600 16.5px/1.3 var(--body);flex:1 1 14em}
.qm,.tk{font:12px/1.5 var(--mono);color:var(--ink-2)}
.qrows{margin:6px 0;display:grid;grid-template-columns:minmax(0,12em) minmax(0,1fr);gap:4px 14px}
.qrows dt{font:700 11px/1.7 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.qrows dd{margin:0}
@media (max-width:620px){.qrows{grid-template-columns:minmax(0,1fr);gap:0}.qrows dd{margin-bottom:6px}}
ol.roads{margin:6px 0;padding-left:1.6em;max-width:72ch}
ol.roads li{margin:0 0 5px}
.rk{display:inline-block;margin-right:8px;font:700 11px/1.6 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
li.road.core .rk,.road.core .rk{color:var(--red)}
.rt{font:12px var(--mono);color:var(--ink-2)}
.qcheck{margin:8px 0 2px;font-size:14px;color:var(--ink-2)}
.clock{margin:10px 0}
.clock h5{margin:6px 0 4px}
.clock ol{margin:0;padding-left:1.6em;max-width:72ch}
.clock li{margin:0 0 4px}
.rf{display:inline-flex;align-items:flex-end;gap:1px;height:26px;margin-left:auto}
.rf i{display:block;width:4px;background:var(--red);opacity:.8}
.thr.pencil .rf i{background:var(--pencil)}
.dn{font:700 13px/1.5 var(--mono);color:var(--red)}
.dd{font:12px/1.5 var(--mono);color:var(--ink-2)}
.dt{font:600 15.5px/1.35 var(--body);flex:1 1 20em}
blockquote.her{margin:8px 0;padding:6px 14px;border-left:3px solid var(--canon);background:var(--ground);max-width:76ch}
blockquote.her p{margin:0 0 .6em}
.asked{margin:4px 0;color:var(--ink-2);max-width:76ch}
.excerpt{margin:6px 0;max-width:76ch;color:var(--ink-2)}
.note{font-size:13px}
.changes2{margin:8px 0 0;font-size:14px}
.changes2 p{margin:2px 0}
.docs{margin:8px 0 8px 64px;color:var(--ink-2);font-size:14px}
.gt{font:600 16px/1.3 var(--body);flex:1 1 14em}
.gc{font:700 12px/1.5 var(--mono);color:var(--red)}
.fold-controls[hidden]{display:none}
li.idea{margin:0 0 8px;padding:4px 10px 5px 12px;border-left:2px dashed var(--pencil-rule);color:var(--pencil);list-style:none;max-width:76ch}
li.idea .ftags{margin-right:6px}
li.idea .ftext{font-weight:380}
li.idea .fmeta{display:block;margin-top:2px;font:12px/1.55 var(--mono)}
li.idea.st-rejected .ftext{text-decoration:line-through}
li.idea.st-parked{border-left-style:dotted}
ul.retired{margin:4px 0 8px 64px;padding-left:1.2em;max-width:70ch}
.sec > h4.sub{margin-left:64px}
@media (max-width:620px){.sec > h4.sub{margin-left:0}}
`;
