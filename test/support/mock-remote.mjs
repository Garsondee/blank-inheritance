// A mock of tools/module-sync/remote.mjs's four exports (uploadDirectory,
// remoteChecksums, remoteDirectoryExists, downloadDirectory), built the same
// way test/support/mock-foundry.mjs mocks the Foundry globals: an honest
// stand-in for what the FOUR FUNCTIONS take, return and throw -- not a
// simulation of SSH/SCP itself. remote.mjs's own header comment says it is
// deliberately untested for real ("Tier-5-equivalent -- manual, last
// resort", needs a real key and a real reachable server); this mock is what
// lets the orchestration around those four calls (sync-harvest.mjs,
// sync-module.mjs, sync-campaign-data.mjs) get real, fast, offline coverage
// without ever shelling out to plink/pscp. Passed in via parameter injection
// (see each of those scripts' own runHarvest/runModuleSync/runCampaignDataSync
// for why, given this project's Node 18.16 target has no `mock.module()`),
// not installed onto any global -- there's no global state here to restore,
// which is why this is createMockRemote rather than installMockRemote/
// uninstall like the Foundry mock (that one really does patch globalThis).
//
// Each of the four mocked functions:
//  - records every call's single config-object argument in `calls`, so a
//    test can assert e.g. "uploadDirectory was called with exactly these
//    files" or "remoteChecksums was never called";
//  - resolves/rejects per a canned response configured up front. A response
//    can be a plain value (resolves to it), a function (invoked with the
//    same single argument the real call received -- lets a test compute a
//    result, or perform a side effect such as actually writing files for
//    downloadDirectory), or an Error instance (rejects with it);
//  - for remoteChecksums/remoteDirectoryExists specifically, throws a clear
//    "no response configured" error if called without one, rather than
//    silently resolving to undefined -- both scripts branch directly on
//    these two return values, so a test that forgot to configure one it
//    didn't expect to be called fails loudly here instead of producing a
//    confusing crash three lines further into the script under test.
//
// uploadDirectory and downloadDirectory get a harmless built-in default
// instead (most tests care that they were/weren't called, not what they
// resolve to -- the real functions return nothing either way). downloadDirectory's
// default writes real files under the call's own `localDir`, one per key in
// the `remoteMap` it's invoked with, sourced from the `files` map given to
// createMockRemote: a path with no entry in `files` is simply never written --
// simulating one file that failed to arrive -- and content that doesn't hash
// to what remoteChecksums claimed for that path is exactly how a "changed" /
// "differs" case gets simulated too. Nothing here computes or fakes a hash;
// real crypto (local-hash.mjs's computeLocalChecksums) does that from
// whatever actually landed on disk, same as it would against a real pull.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const NEEDS_EXPLICIT_RESPONSE = new Set(["remoteChecksums", "remoteDirectoryExists"]);

export function createMockRemote({ files = {}, ...responses } = {}) {
  const calls = {
    uploadDirectory: [],
    remoteChecksums: [],
    remoteDirectoryExists: [],
    downloadDirectory: [],
  };

  function makeMock(name, defaultImpl) {
    return async (arg) => {
      calls[name].push(arg);
      const configured = responses[name];
      if (configured instanceof Error) throw configured;
      if (typeof configured === "function") return configured(arg);
      if (configured !== undefined) return configured;
      if (defaultImpl) return defaultImpl(arg);
      throw new Error(
        `createMockRemote: ${name}() was called but no response was configured for it. ` +
          `Pass { ${name}: <value | fn | Error> } to createMockRemote(), even if you expect ` +
          `this call not to matter -- ${NEEDS_EXPLICIT_RESPONSE.has(name) ? "this function's return value drives the script's control flow, so" : ""} a silent default here would hide a real regression.`
      );
    };
  }

  const remote = {
    uploadDirectory: makeMock("uploadDirectory", async () => undefined),
    remoteChecksums: makeMock("remoteChecksums"),
    remoteDirectoryExists: makeMock("remoteDirectoryExists"),
    downloadDirectory: makeMock("downloadDirectory", async ({ localDir, remoteMap }) => {
      for (const relativePath of remoteMap.keys()) {
        if (!(relativePath in files)) continue; // simulates a single file that failed to arrive
        const destination = path.join(localDir, relativePath);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, files[relativePath]);
      }
    }),
  };

  return { remote, calls };
}
