/**
 * pt world <create|provision|snapshot|restore|list|delete> [name]
 *
 *   create             make the playtest world's folder and manifest (idempotent)
 *   provision          switch the modules on, let the module build the content, make the six players, switch the agreement on
 *                      (needs the playtest Foundry running; --no-agreement leaves the Service Agreement page off)
 *   snapshot <name>    copy the world and the module's storage/ aside   (Foundry must be stopped)
 *   restore <name>     put a snapshot back                             (Foundry must be stopped)
 *   list / delete <name>
 */

import { parseArgs } from "../core/args.mjs";
import { createWorld, worldExists } from "../foundry/bootstrap.mjs";
import { provision } from "../foundry/provision.mjs";
import { deleteSnapshot, listSnapshots, restoreWorld, snapshotWorld } from "../foundry/snapshots.mjs";

export async function run(argv) {
  const { flags, positionals } = parseArgs(argv, { valued: ["note"] });
  const [sub, name] = positionals;
  if (sub === "create") {
    console.log(createWorld() ? "World made." : "The world is already there.");
    return 0;
  }
  if (sub === "provision") {
    if (!worldExists()) throw new Error("no world yet (pt world create)");
    const result = await provision({ log: (line) => console.log(line), agreement: flags.agreement !== false });
    console.log(`PROVISIONED: world built to ${result.stamp}; ${result.after.users.length} user(s); agreement ${result.after.agreementNow ? "ON" : "off"}.`);
    if (result.pageErrors.length) console.log(`(${result.pageErrors.length} page error line(s) during provisioning; first: ${result.pageErrors[0]})`);
    return 0;
  }
  if (sub === "snapshot") {
    const meta = await snapshotWorld(name, { note: typeof flags.note === "string" ? flags.note : "" });
    console.log(`Snapshot "${meta.name}" taken ${meta.takenAt}${meta.hasStorage ? " (with storage/)" : ""}.`);
    return 0;
  }
  if (sub === "restore") {
    const meta = await restoreWorld(name);
    console.log(`Restored snapshot "${meta.name}" (taken ${meta.takenAt}).`);
    return 0;
  }
  if (sub === "list") {
    const all = await listSnapshots();
    if (!all.length) console.log("No snapshots.");
    for (const s of all) console.log(`${s.name.padEnd(28)} ${s.takenAt}  ${s.note ?? ""}`);
    return 0;
  }
  if (sub === "delete") {
    await deleteSnapshot(name);
    console.log(`Deleted snapshot "${name}".`);
    return 0;
  }
  console.log("usage: pt world <create|provision|snapshot|restore|list|delete> [name]");
  return 2;
}
