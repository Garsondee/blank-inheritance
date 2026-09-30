/**
 * Where Ingram's edit records come from: the module's storage/ folder on the
 * live server (the only place she edits, 2026-09-27: "I ONLY WILL REWRITE
 * SCENES ON THE REMOTE SERVER"), or any local folder laid out the same way --
 * the local test Foundry's own storage/, or a test's scratch directory.
 *
 * READ-ONLY against the server: this lists and reads, and never writes,
 * moves or deletes anything there. Records are immutable, so "new" simply
 * means a file name not yet in harvest/scene-edits/.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { RECORD_PREFIX, recordFilename, recordIdFromFilename, validateRecord } from "../../module/blank-inheritance/scripts/core/scene-edits.mjs";
import { DOCUMENT_EDIT_PREFIX } from "../../module/blank-inheritance/scripts/core/foundry-edits.mjs";
import { readRemoteFiles, remoteListMatching } from "../module-sync/remote.mjs";
import { REPO_ROOT, sha256 } from "./store.mjs";

/** The live server, the same one tools/module-sync pushes to. */
export const SERVER = Object.freeze({
  remoteHost: "ubuntu@132.145.38.144",
  keyPath: path.join(REPO_ROOT, "SSH.ppk"),
  hostKey: "SHA256:7EsvSGvu2DqJfokfzaVnysbx/Ehf52fij/M9DLHo9cE",
  storageDir: "/home/ubuntu/foundrydata/Data/modules/blank-inheritance/storage"
});

/** How many files one SSH round trip reads; a whole-scene rewrite is a few hundred small files at most. */
const BATCH = 60;

/**
 * @typedef {object} Inbox
 * @property {string} describe                          where it reads from, for messages
 * @property {(prefix?: string) => Promise<Map<string, string>>} list  file name -> sha256, for names
 *   starting with `prefix` (edit records by default)
 * @property {(names: string[]) => Promise<Map<string, string>>} read  name -> exact text
 */

/** @returns {Inbox} the live server's storage/ */
export function serverInbox(server = SERVER, remote = { remoteListMatching, readRemoteFiles }) {
  const connection = { remoteHost: server.remoteHost, keyPath: server.keyPath, hostKey: server.hostKey, remoteDir: server.storageDir };
  return {
    describe: `${server.remoteHost}:${server.storageDir}`,
    list: (prefix = RECORD_PREFIX) => remote.remoteListMatching({ ...connection, prefix }),
    read: (names) => remote.readRemoteFiles({ ...connection, names })
  };
}

/** @returns {Inbox} a local folder laid out like storage/ */
export function folderInbox(dir) {
  return {
    describe: dir,
    async list(prefix = RECORD_PREFIX) {
      const out = new Map();
      if (!existsSync(dir)) return out;
      for (const name of readdirSync(dir).sort()) {
        const wanted = prefix === RECORD_PREFIX ? Boolean(recordIdFromFilename(name)) : name.startsWith(prefix) && name.endsWith(".json");
        if (wanted) out.set(name, sha256(readFileSync(path.join(dir, name), "utf8")));
      }
      return out;
    },
    async read(names) {
      return new Map(names.filter((n) => existsSync(path.join(dir, n))).map((n) => [n, readFileSync(path.join(dir, n), "utf8")]));
    }
  };
}

/**
 * Everything in the inbox that has not been pulled home yet, checked three
 * ways before it is accepted: the bytes hash to what the source said they
 * hash to, the text is a valid record, and the record's own id is the one its
 * file name carries. A file failing any of them is reported by name and not
 * kept -- the next pull tries it again.
 *
 * @param {object} args
 * @param {Inbox} args.inbox
 * @param {Map<string, string>} args.harvested  name -> text already home
 * @returns {Promise<{fetched: Array<{name: string, text: string, record: object}>, problems: string[], onServer: number}>}
 */
export async function pullNew({ inbox, harvested }) {
  const listed = await inbox.list();
  const problems = [];
  for (const [name, hash] of listed) {
    // Records never change. One that has, since it came home, is worth saying out loud.
    if (harvested.has(name) && sha256(harvested.get(name)) !== hash) {
      problems.push(`${name} on the server no longer matches the copy pulled earlier; the earlier copy is kept`);
    }
  }
  const wanted = [...listed.keys()].filter((name) => !harvested.has(name)).sort();
  const fetched = [];
  for (let i = 0; i < wanted.length; i += BATCH) {
    const names = wanted.slice(i, i + BATCH);
    const texts = await inbox.read(names);
    for (const name of names) {
      const text = texts.get(name);
      if (text === undefined) {
        problems.push(`${name} was listed but could not be read`);
        continue;
      }
      if (sha256(text) !== listed.get(name)) {
        problems.push(`${name} did not arrive intact (its hash does not match the server's); it will be tried again`);
        continue;
      }
      let record;
      try {
        record = JSON.parse(text);
      } catch (err) {
        problems.push(`${name} is not JSON: ${err.message}`);
        continue;
      }
      const invalid = validateRecord(record);
      if (invalid.length) {
        problems.push(`${name} is not a usable edit: ${invalid.join("; ")}`);
        continue;
      }
      if (recordFilename(record) !== name) {
        problems.push(`${name} carries the id ${record.id}, which does not match its name`);
        continue;
      }
      fetched.push({ name, text, record });
    }
  }
  return { fetched, problems, onServer: listed.size };
}

/**
 * Copies of documents Ingram edited directly in Foundry (a journal the sync
 * kept instead of rebuilding, a Papers handout kept instead of rewritten --
 * core/foundry-edits.mjs). Unlike edit records these are the latest state of
 * one document and are rewritten on the server when she edits it again, so
 * "new" means a hash that differs from the copy already home. Each is
 * verified the same way before it is kept.
 *
 * @param {{inbox: Inbox, harvested: Map<string, string>}} args  harvested: name -> text in harvest/foundry-edits/
 * @returns {Promise<{changed: Array<{name: string, text: string, snapshot: object}>, problems: string[]}>}
 */
export async function pullDocumentEdits({ inbox, harvested }) {
  const listed = await inbox.list(DOCUMENT_EDIT_PREFIX);
  const wanted = [...listed].filter(([name, hash]) => !harvested.has(name) || sha256(harvested.get(name)) !== hash).map(([name]) => name);
  const changed = [];
  const problems = [];
  if (!wanted.length) return { changed, problems };
  const texts = await inbox.read(wanted);
  for (const name of wanted) {
    const text = texts.get(name);
    if (text === undefined || sha256(text) !== listed.get(name)) {
      problems.push(`${name} did not arrive intact; it will be tried again`);
      continue;
    }
    try {
      const snapshot = JSON.parse(text);
      if (snapshot?.kind !== "foundry-document-edit") throw new Error("not a copy of an edited document");
      changed.push({ name, text, snapshot });
    } catch (err) {
      problems.push(`${name}: ${err.message}`);
    }
  }
  return { changed, problems };
}
