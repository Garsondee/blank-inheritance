/**
 * The rules glossary, the Foundry-touching half (core/scene-rules.mjs is the pure one): read the generated glossary
 * (data/rules-glossary.json, tools/rules-glossary/build.mjs) once per page, and open a rule when a GM presses it — the
 * system's own sheet for a condition, an action or a creature (sf2e's compendium, read-only), or the SRD article from the
 * shipped rules index for a rule that lives only there, scrolled to where it says what the rule is.
 *
 * The Scene Runner's "Rules in this scene" and the Palette's rules both come here (2026-10-04).
 */

import { fetchModuleJson } from "./io.mjs";
import { loadRulesIndex } from "./rules-index.mjs";
import { escapeHtml } from "../core/inline-triggers.mjs";

const GLOSSARY_PATH = "data/rules-glossary.json";
let glossaryPromise = null;
let glossaryLoaded = null;

/** The glossary, read once per page; an empty one if it cannot be read (a clone whose glossary was never built). */
export function loadRulesGlossary() {
  glossaryPromise ??= fetchModuleJson(GLOSSARY_PATH)
    .catch((err) => {
      console.warn(`Blank Inheritance | No rules glossary at ${GLOSSARY_PATH}; no rules will be offered until it is built and deployed.`, err);
      return { entries: [] };
    })
    .then((g) => (glossaryLoaded = g));
  return glossaryPromise;
}

/** The glossary if it has been read already (the Palette asks at every keystroke and cannot wait), else null. */
export const cachedRulesGlossary = () => glossaryLoaded;

/**
 * Open a rule for the GM: { uuid } opens that document's own sheet (a condition, an action, a creature's stat block);
 * { srd } shows the article. Returns whether anything opened.
 */
export async function openRule(rule) {
  if (!rule) return false;
  if (rule.uuid) {
    const doc = await fromUuid(rule.uuid).catch(() => null);
    if (doc?.sheet) { doc.sheet.render(true); return true; }
  }
  if (rule.srd) {
    const article = (await loadRulesIndex()).find((a) => a.id === rule.srd);
    if (article) { showArticle(article, rule); return true; }
  }
  ui.notifications?.warn(game.i18n.format("BLANKINHERITANCE.Rules.CannotOpen", { name: rule.name ?? rule.id ?? "?" }));
  return false;
}

/**
 * An SRD article in a window of its own: its paragraphs (without the mirror's retrieval note), its source lines small, a link
 * to the page it was mirrored from, and the paragraph that says what the rule is (its `lead`, else the first that names it)
 * marked and scrolled to.
 */
export function showArticle(article, rule = null) {
  const lead = rule?.lead ? new RegExp(rule.lead) : null;
  const named = (rule?.patterns ?? []).map((p) => new RegExp(p, "i"));
  const paragraphs = String(article.text ?? "").split(/\n+/).map((p) => p.trim());
  const target = (lead && paragraphs.find((p) => lead.test(p))) ?? paragraphs.find((p) => !/^RETRIEVAL NOTE:|^Source /i.test(p) && named.some((re) => re.test(p))) ?? null;
  let marked = false;
  const paras = String(article.text ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !/^RETRIEVAL NOTE:/i.test(p))
    .map((p) => {
      if (/^Source /.test(p)) return `<p class="bi-rule-article__source">${escapeHtml(p)}</p>`;
      if (p.length < 48 && !/[.!?]$/.test(p)) return `<h4 class="bi-rule-article__head">${escapeHtml(p)}</h4>`;
      const here = !marked && p === target;
      if (here) marked = true;
      return `<p${here ? ' class="bi-rule-article__here" data-here="1"' : ""}>${escapeHtml(p)}</p>`;
    })
    .join("");
  const link = article.sourceUrl ? `<p class="bi-rule-article__link"><a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(article.pageCitation ?? article.sourceUrl)}</a></p>` : "";
  const content = `<div class="bi-rule-article">${paras}</div>${link}`;
  const dialog = new foundry.applications.api.DialogV2({
    window: { title: rule?.name && rule.name !== article.title ? `${rule.name} · ${article.title}` : article.title, icon: "fa-solid fa-book" },
    position: { width: 560 },
    content,
    buttons: [{ action: "close", label: game.i18n.localize("BLANKINHERITANCE.Rules.Close"), default: true }]
  });
  dialog.render({ force: true }).then(() => {
    dialog.element?.querySelector("[data-here]")?.scrollIntoView({ block: "center" });
  }).catch(() => {});
  return dialog;
}
