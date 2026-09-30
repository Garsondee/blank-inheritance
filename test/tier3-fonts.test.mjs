// Tier 3 — the bundled font library.
//
// The failure mode: a font family is referenced by a token, the woff2 never
// gets built (or gets deleted, or renamed by a pipeline change), and CSS
// falls back SILENTLY. Nothing errors, nothing logs — the document just
// quietly renders in Times New Roman at the table. That is the same silent
// class of failure as a renamed Foundry variable, so it gets the same
// treatment: verify the whole chain, manifest to token.
//
// These tests read files only; they never hit the network. The pipeline
// itself (tools/font-pipeline/build_fonts.py) is what downloads.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const pipelineRoot = path.join(repoRoot, "tools", "font-pipeline");
const fontsDir = path.join(repoRoot, "module", "blank-inheritance", "assets", "fonts");
const manifestPath = path.join(pipelineRoot, "fonts.json");
const receiptPath = path.join(pipelineRoot, "receipt.json");
const fontsCssPath = path.join(repoRoot, "module", "blank-inheritance", "styles", "bi-fonts.css");
const tokensPath = path.join(repoRoot, "module", "blank-inheritance", "styles", "bi-tokens.css");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

/** slug() from build_fonts.py, kept in step deliberately. */
function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function expectedFiles() {
  const out = [];
  for (const family of manifest.families) {
    for (const weight of family.weights) {
      out.push({ family: family.name, weight, profile: family.profile, file: `${slug(family.name)}-${weight}.woff2` });
    }
  }
  return out;
}

test("every family in the manifest has a built woff2", () => {
  const missing = expectedFiles().filter((e) => !existsSync(path.join(fontsDir, e.file)));
  assert.deepEqual(
    missing.map((m) => m.file), [],
    "font files are missing. Rebuild: python tools/font-pipeline/build_fonts.py"
  );
});

test("bi-fonts.css declares a face for every built file, and no phantom ones", () => {
  const css = readFileSync(fontsCssPath, "utf8");
  const declared = [...css.matchAll(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
  const expected = expectedFiles().map((e) => e.file);

  for (const file of expected) {
    assert.ok(declared.includes(file), `bi-fonts.css never declares ${file}`);
  }
  for (const file of declared) {
    assert.ok(
      existsSync(path.join(fontsDir, file)),
      `bi-fonts.css points at ${file}, which does not exist — the browser would ` +
        `fall back silently with no error.`
    );
  }
});

test("every @font-face uses font-display: swap", () => {
  // Shippori Mincho is 2.8MB. Without swap a player stares at invisible text
  // while it arrives, which is worse than reading it in a fallback first.
  const css = readFileSync(fontsCssPath, "utf8");
  const faces = css.split("@font-face").slice(1);
  assert.ok(faces.length > 20, "bi-fonts.css looks truncated");
  for (const face of faces) {
    assert.match(face, /font-display:\s*swap/, "an @font-face is missing font-display: swap");
  }
});

test("every family named in a type token is actually bundled", () => {
  // The whole point of bundling: a token must not name a family we do not
  // ship and merely hope is installed. Non-bundled names are allowed ONLY
  // after a bundled one, as fallbacks.
  const tokens = readFileSync(tokensPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const bundled = new Set(manifest.families.map((f) => f.name));
  // Faces Foundry itself ships, which are legitimate to name without bundling.
  const foundryProvided = new Set(["Signika", "Modesto Condensed", "Amiri"]);

  const tokenRules = [...tokens.matchAll(/(--bi-font-[\w-]+):\s*([^;]+);/g)];
  assert.ok(tokenRules.length >= 10, "type tokens not found — did the token file move?");

  for (const [, name, value] of tokenRules) {
    const families = value.split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));
    const first = families[0];
    // Generic keywords are fine as a whole value only for pure fallback chains.
    if (/^(ui-|system-|serif|sans-serif|monospace|cursive)/.test(first)) continue;
    assert.ok(
      bundled.has(first) || foundryProvided.has(first),
      `${name} leads with "${first}", which is neither bundled by the font ` +
        `pipeline nor shipped by Foundry. It would resolve to whatever happens ` +
        `to be installed — exactly the failure this bundle exists to remove.`
    );
  }
});

test("the receipt matches what is on disk", () => {
  assert.ok(existsSync(receiptPath), "tools/font-pipeline/receipt.json is missing");
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  for (const entry of receipt.built) {
    const full = path.join(fontsDir, entry.file);
    assert.ok(existsSync(full), `receipt lists ${entry.file}, which is not on disk`);
    assert.equal(
      statSync(full).size, entry.bytes,
      `${entry.file} changed size since the receipt was written — rebuild the pipeline.`
    );
  }
});

test("the bundle stays within a sane size budget", () => {
  // Guards against someone giving a decorative face the `full` CJK profile,
  // which is a 2.8MB mistake per weight and easy to make by accident.
  const files = readdirSync(fontsDir).filter((f) => f.endsWith(".woff2"));
  const total = files.reduce((a, f) => a + statSync(path.join(fontsDir, f)).size, 0);
  const mb = total / 1048576;
  assert.ok(mb < 12, `font bundle is ${mb.toFixed(1)}MB, over the 12MB budget`);

  // Only the profiles declared `full` may be large.
  const fullFamilies = new Set(
    manifest.families.filter((f) => f.profile === "full").map((f) => slug(f.name))
  );
  // `typewriter` families (TT2020, built from GitHub rather than Google) carry
  // ten versions of every glyph on purpose, so they get a higher, still-fixed cap.
  const typewriterFamilies = new Set(
    manifest.families.filter((f) => f.profile === "typewriter").map((f) => slug(f.name))
  );
  for (const file of files) {
    const size = statSync(path.join(fontsDir, file)).size;
    if (size <= 400_000) continue;
    const stem = file.replace(/-\d+\.woff2$/, "");
    if (typewriterFamilies.has(stem)) {
      assert.ok(size <= 600_000, `${file} is ${(size / 1024).toFixed(0)}KB, over the 600KB typewriter cap`);
      continue;
    }
    assert.ok(
      fullFamilies.has(stem),
      `${file} is ${(size / 1048576).toFixed(1)}MB but its family is not declared ` +
        `profile "full" — it is almost certainly carrying CJK glyphs it does not need.`
    );
  }
});

test("every externally sourced family is openly licensed and says where it came from", () => {
  // Google Fonts families are OFL by construction; a `source` family is not, so
  // its licence is recorded in the manifest and it must appear in CREDITS.md.
  const credits = readFileSync(path.join(repoRoot, "CREDITS.md"), "utf8");
  for (const family of manifest.families.filter((f) => f.source)) {
    assert.match(family.source.url, /^https:\/\//, `${family.name} has no source URL`);
    assert.match(family.source.license, /^(OFL-1\.1|Apache-2\.0)$/, `${family.name} is not under a licence that allows bundling`);
    assert.ok(credits.includes(family.name.split(" ")[0]), `${family.name} is bundled but not credited in CREDITS.md`);
    if ("alternate" in family.source) assert.match(family.source.letters, /^[a-z]+$/, `${family.name} names no letters to damage`);
  }
});

test("the pipeline download cache is not committed", () => {
  // 68MB of upstream TTFs, reproducible from the manifest. They must stay out
  // of git; only the subsetted woff2 output ships.
  const gitignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  assert.match(
    gitignore, /tools\/font-pipeline\/\.cache\//,
    "tools/font-pipeline/.cache/ must be gitignored — it holds tens of MB of " +
      "upstream TTFs used only as subsetting input."
  );
});
