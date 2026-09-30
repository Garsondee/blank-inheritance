/**
 * Where location-edit records come from: the module's storage/ folder, live
 * server or a local test Foundry's own copy -- the exact same folder
 * scene-edit records live in, just a different filename prefix. The
 * connection/transport (serverInbox/folderInbox, the SFTP details) is
 * reused unchanged from tools/scene-edits/inbox.mjs rather than duplicated;
 * only the record validation (location-editor's own shape) is new here.
 */

import { RECORD_PREFIX, recordFilename, recordIdFromFilename, validateRecord } from "../../module/blank-inheritance/scripts/core/location-editor.mjs";
import { folderInbox, serverInbox, SERVER } from "../scene-edits/inbox.mjs";
import { sha256 } from "./store.mjs";

export { folderInbox, serverInbox, SERVER };

const BATCH = 60;

/**
 * Everything in the inbox not yet pulled home, verified three ways (hash
 * matches, parses, id matches its filename) before being accepted -- same
 * doctrine as tools/scene-edits/inbox.mjs#pullNew, just against
 * location-editor's own RECORD_PREFIX/validateRecord.
 *
 * @param {{inbox: import("../scene-edits/inbox.mjs").Inbox, harvested: Map<string,string>}} args
 */
export async function pullNew({ inbox, harvested }) {
  const listed = await inbox.list(RECORD_PREFIX);
  const problems = [];
  for (const [name, hash] of listed) {
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
        problems.push(`${name} did not arrive intact (hash mismatch); it will be tried again`);
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
        problems.push(`${name} is not a usable record: ${invalid.join("; ")}`);
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
