/**
 * The playtest's Foundry data root and its world, made from files (no Setup screen to drive). Idempotent: running it again changes
 * nothing that is already right.
 *
 *   - Config/license.json is COPIED from this machine's own activated Foundry. It is not typed anywhere: it is the user's own licence
 *     file moving between two folders of the same install, which is why this needs no EULA screen and no key.
 *   - Config/options.json is written once with the playtest's port and world.
 *   - Data/worlds/<id>/world.json is the whole of a new world as far as Foundry's Setup is concerned; the world's databases are
 *     created at its first launch.
 *
 * Versions are read from the installed Foundry and system rather than written here, so an upgrade does not leave a stale manifest.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { CONFIG_DIR, DATA_DIR, DEFAULT_LICENSE, FOUNDRY_APP, FOUNDRY_PORT, FOUNDRY_ROOT, REPO, WORLD_DIR, WORLD_ID, WORLD_TITLE } from "../paths.mjs";

export function foundryVersions() {
  const core = JSON.parse(readFileSync(path.join(FOUNDRY_APP, "package.json"), "utf8"));
  const system = JSON.parse(readFileSync(path.join(REPO, "gamesystems", "sf2e", "system.json"), "utf8"));
  return { coreVersion: `${core.release?.generation ?? String(core.version).split(".")[0]}.${core.release?.build ?? String(core.version).split(".")[1]}`, systemVersion: system.version, generation: String(core.release?.generation ?? 14) };
}

/** The options.json Foundry reads from <dataPath>/Config. Same keys as an install's own, with this rig's port and world. */
export function optionsFor({ port = FOUNDRY_PORT, world = WORLD_ID } = {}) {
  return {
    dataPath: FOUNDRY_ROOT.replace(/\\/g, "/"),
    compressStatic: true,
    fullscreen: false,
    hostname: null,
    language: "en.core",
    localHostname: null,
    port,
    proxyPort: null,
    proxySSL: false,
    routePrefix: null,
    updateChannel: "stable",
    upnp: false,
    adminUsername: null,
    awsConfig: null,
    compressSocket: true,
    cssTheme: "dark",
    tempDir: null,
    deleteNEDB: false,
    hotReload: false,
    passwordSalt: null,
    unixSocket: null,
    sslCert: null,
    sslKey: null,
    world,
    serviceConfig: null,
    telemetry: false
  };
}

/** The world.json of a new playtest world. */
export function worldManifest({ id = WORLD_ID, title = WORLD_TITLE } = {}) {
  const v = foundryVersions();
  return { title, system: "sf2e", id, coreVersion: v.coreVersion, compatibility: { minimum: v.generation, verified: v.generation }, systemVersion: v.systemVersion, description: "A throwaway world for the table playtest (design/playtest-process.md). Safe to delete.", flags: {} };
}

/**
 * @returns {{created:string[], licence:'copied'|'present'|'missing'}}
 */
export function bootstrapDataRoot({ license = DEFAULT_LICENSE, log = () => {} } = {}) {
  const created = [];
  for (const dir of [CONFIG_DIR, path.join(DATA_DIR, "modules"), path.join(DATA_DIR, "systems"), path.join(DATA_DIR, "worlds")]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      created.push(dir);
    }
  }
  const licenseTarget = path.join(CONFIG_DIR, "license.json");
  let licence = "present";
  if (!existsSync(licenseTarget)) {
    if (existsSync(license)) {
      copyFileSync(license, licenseTarget);
      licence = "copied";
      created.push(licenseTarget);
    } else {
      licence = "missing";
      log(`  warning: no Foundry licence at ${license}; Foundry will ask for one at its Setup screen (a person must enter it)`);
    }
  }
  const optionsTarget = path.join(CONFIG_DIR, "options.json");
  if (!existsSync(optionsTarget)) {
    writeFileSync(optionsTarget, `${JSON.stringify(optionsFor(), null, 2)}\n`);
    created.push(optionsTarget);
  }
  return { created, licence };
}

/** Create the world's folder and manifest if they are not there. Returns true when it made them. */
export function createWorld({ id = WORLD_ID, title = WORLD_TITLE } = {}) {
  const dir = path.join(DATA_DIR, "worlds", id);
  const manifest = path.join(dir, "world.json");
  if (existsSync(manifest)) return false;
  mkdirSync(dir, { recursive: true });
  writeFileSync(manifest, `${JSON.stringify(worldManifest({ id, title }), null, 2)}\n`);
  return true;
}

export const worldExists = () => existsSync(path.join(WORLD_DIR, "world.json"));
