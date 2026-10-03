/**
 * Build the module: one bundle, dist/stagecraft.js, from scripts/ and three.js, plus dist/BUILD.json recording what it
 * was built from so a test (and the deploy preflight) can tell a stale bundle from a fresh one.
 *
 *   node tools/build.mjs          minified, for shipping
 *   node tools/build.mjs --dev    readable, with a source map, for working
 */

import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dev = process.argv.includes("--dev");

/** A hash of every source file the bundle is made from, and of the three.js version. */
export function sourcesHash() {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(path.join(root, "scripts"));
  const h = createHash("sha256");
  for (const f of files) { h.update(path.relative(root, f).replaceAll("\\", "/")); h.update("\0"); h.update(readFileSync(f)); h.update("\0"); }
  const three = JSON.parse(readFileSync(path.join(root, "node_modules", "three", "package.json"), "utf8")).version;
  h.update(`three@${three}`);
  return { hash: h.digest("hex"), three, files: files.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(path.join(root, "dist"), { recursive: true });
  if (!dev) rmSync(path.join(root, "dist", "stagecraft.js.map"), { force: true });      // a map left by a dev build would not match this bundle
  await build({
    entryPoints: [path.join(root, "scripts", "stagecraft.mjs")],
    bundle: true,
    format: "esm",
    target: "es2022",
    outfile: path.join(root, "dist", "stagecraft.js"),
    minify: !dev,
    sourcemap: dev ? "linked" : false,
    legalComments: "eof",
    logLevel: "info"
  });
  const { hash, three, files } = sourcesHash();
  writeFileSync(path.join(root, "dist", "BUILD.json"), `${JSON.stringify({ sources: hash, files, three, dev }, null, 2)}\n`);
  console.log(`built dist/stagecraft.js (${dev ? "dev" : "minified"}) from ${files} files, three.js ${three}`);
}
