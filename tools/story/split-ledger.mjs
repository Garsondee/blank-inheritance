// One-off migration (2026-09-27, design/story-data-refactor.md): split the LEDGER into one decision file per
// entry under canon/decisions/, word for word. Refuses to overwrite an existing decision file, so it can't
// clobber a record that has since been edited. Run once; kept for the record of how D001-D046 were made.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ledgerPath = path.join(root, "quarantine/ideas/story/bible/LEDGER.md");
const outDir = path.join(root, "canon/decisions");
const text = fs.readFileSync(ledgerPath, "utf8").replace(/\r\n/g, "\n");

// Dates come from the index table: | N | date | header | status |
const dates = new Map();
for (const m of text.matchAll(/^\| (\d+) \| ([^|]+?) \| ([^|]+?) \| ([^|]*?) \|$/gm)) dates.set(Number(m[1]), m[2].trim());

const heads = [...text.matchAll(/^### (\d+) — (.+)$/gm)];
if (heads.length === 0) throw new Error("no entries found");
fs.mkdirSync(outDir, { recursive: true });
let written = 0;
heads.forEach((h, i) => {
  const n = Number(h[1]);
  const start = h.index + h[0].length;
  const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
  const body = text.slice(start, end).replace(/\s+$/, "").replace(/^\n+/, "").replace(/\n---$/, "").replace(/\s+$/, "");
  const id = "D" + String(n).padStart(3, "0");
  const file = path.join(outDir, id + ".md");
  if (fs.existsSync(file)) throw new Error(`${id} already exists; refusing to overwrite`);
  const date = dates.get(n) || "unknown";
  const out = `# ${id} · ${date} · ${h[2].trim()}\n\nsource: split word for word from LEDGER #${n}\n\n${body}\n`;
  fs.writeFileSync(file, out);
  written++;
});
console.log(`wrote ${written} decision files to canon/decisions/`);
