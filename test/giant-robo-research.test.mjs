// Tier 0 — Giant Robo research shelf structural lint. Instant, no fixtures, no Foundry.
//
// The shelf is 10 thematic documents and 32 character files behind one index
// (design/research/giant-robo/README.md). The checks themselves live in
// test/support/research-shelf.mjs and are shared with the Evangelion shelf —
// two copies of a lint drift, and the drift is invisible until it matters.
// This file is the manifest: what the shelf contains, and what its router
// promises to cover.

import { registerCommonShelfTests } from "./support/research-shelf.mjs";

registerCommonShelfTests({
  slug: "giant-robo",

  // The thematic documents, exactly as design/research/giant-robo/README.md §3 lists them.
  thematic: [
    "what-makes-it-tick.md",
    "the-yokoyama-crossover-method.md",
    "legendary-sources-china-and-japan.md",
    "the-recurring-antagonist-engine.md",
    "the-magnificent-ten-as-an-org-chart.md",
    "epithets-and-name-calling.md",
    "ham-and-sincerity.md",
    "the-buried-atrocity.md",
    "series-shape-and-unmade-arcs.md",
    "npc-archetype-catalogue.md",
  ],

  // One file per character, as §4's tables list them.
  characters: [
    // Experts of Justice / IPO
    "daisaku-kusama.md",
    "giant-robo.md",
    "ginrei.md",
    "kenji-murasame.md",
    "tetsugyu.md",
    "taisou.md",
    "youshi.md",
    "chief-chujo.md",
    "professor-go.md",
    "dojin-issei.md",
    "kaei-and-koushin.md",
    "ryozanpaku-rank-and-file.md",
    "the-big-nine.md",
    "doctor-kusama.md",
    // Big Fire / the BF Group
    "big-fire.md",
    "shokatsu-koumei.md",
    "ko-enshaku.md",
    "genya.md",
    "alberto-the-shockwave.md",
    "ivan.md",
    "hanzui.md",
    "kawarazaki.md",
    "cervantes.md",
    "mask-the-red.md",
    "doki-and-the-keppuren.md",
    "zangetsu.md",
    "jujoji.md",
    "yuki-the-twilight.md",
    "fitzcarraldo.md",
    "sunny-the-magician.md",
    // Outside both
    "franken-von-vogler.md",
    "professor-shizuma.md",
  ],

  // §2 is the whole point of the index: a task with no row is a task that
  // silently gets written with no reference consulted.
  routerTasks: [
    "recurring villain",
    "villain organisation",
    "ally drawn from legend",
    "epithet",
    "named attack",
    "buried-atrocity",
    "campaign or arc shape",
  ],
});
