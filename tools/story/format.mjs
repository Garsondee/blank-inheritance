// Small text helpers shared by the canon readers (lib.mjs, plot.mjs) and the editor (edit.mjs).

export const lf = (s) => s.replace(/\r\n/g, "\n");
export const csv = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
export const bars = (v) => (v ? v.split("|").map((s) => s.trim().replace(/^"(.*)"$/, "$1")).filter(Boolean) : []);

// "status: decided · source: D024, D025 · known: everyone"
export function parseMeta(line) {
  const meta = {};
  for (const part of line.split(" · ")) {
    const i = part.indexOf(":");
    if (i < 0) throw new Error(`a meta entry has no colon: "${part}"`);
    meta[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return meta;
}

// The fields every item in canon shares, read from its meta line.
export function statusBlock(meta) {
  return {
    status: meta.status || null,
    by: meta.by || null,
    source: csv(meta.source),
    // `from:` in a file is where an imported item came from (a key the import record resolves); `origin` here, so
    // it never shadows a Book's own chapter range.
    origin: meta.from || null,
  };
}

/**
 * Split text into sections at headings of one level ("## " or "### "). Each section has its heading, the line it
 * starts on (0-based), and its body lines. Whatever comes before the first heading is `head`.
 */
export function sections(text, level = 2) {
  const marker = "#".repeat(level) + " ";
  const lines = lf(text).split("\n");
  const out = { head: [], list: [] };
  let cur = null;
  lines.forEach((line, i) => {
    if (line.startsWith(marker)) {
      cur = { heading: line.slice(marker.length).trim(), line: i, body: [] };
      out.list.push(cur);
    } else if (cur) cur.body.push(line);
    else out.head.push(line);
  });
  return out;
}

/** An item's body: its words, then one meta line starting "status:". */
export function itemBody(body, where) {
  const lines = body.map((l) => l.trimEnd());
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const metaLine = lines.pop() || "";
  if (!metaLine.startsWith("status:")) throw new Error(`${where} must end with its "status: ..." line`);
  return { text: lines.join(" ").replace(/\s+/g, " ").trim(), meta: parseMeta(metaLine) };
}

/**
 * A file's head: "# Title", then "key: value" lines (a line with " · " holds several), then free words.
 */
export function parseHead(headLines, where) {
  const titleLine = headLines.find((l) => l.trim());
  const title = (titleLine || "").match(/^# (.+)$/)?.[1]?.trim();
  if (!title) throw new Error(`${where}: the first line must be "# Title"`);
  const meta = {};
  const words = [];
  for (const raw of headLines.slice(headLines.indexOf(titleLine) + 1)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[a-z][a-z-]*: /.test(line)) Object.assign(meta, parseMeta(line));
    else words.push(line);
  }
  return { title, meta, text: words.join(" ").replace(/\s+/g, " ").trim() };
}
