#!/usr/bin/env node
/**
 * pt: the playtest rig's one command (design/playtest-process.md; tools/playtest/README.md).
 *
 * Two kinds of command. LOCAL ones run here and touch files and the Foundry server: build, foundry, world, preflight, cleanup, init,
 * brief, audit, report, seed. SEAT verbs (look, click, say, note ...) are sent to the hub, which owns the browsers; that is the only
 * thing an agent at a seat ever runs, and its startup is deliberately light (no browser library is loaded for it).
 */

const LOCAL = {
  build: "./commands/build.mjs",
  foundry: "./commands/foundry.mjs",
  world: "./commands/world.mjs",
  preflight: "./commands/preflight.mjs",
  cleanup: "./commands/cleanup.mjs",
  init: "./commands/init.mjs",
  brief: "./commands/brief.mjs",
  audit: "./commands/audit.mjs",
  report: "./commands/report.mjs",
  seed: "./commands/seed.mjs",
  hub: "./commands/hub.mjs",
  run: "./commands/run.mjs"
};

let args = process.argv.slice(2);
// A seat names itself first: `pt --as P2:token look`.
if (args[0] === "--as" && args[1]) {
  process.env.PT_AS = args[1];
  args = args.slice(2);
} else if (args[0]?.startsWith("--as=")) {
  process.env.PT_AS = args[0].slice(5);
  args = args.slice(1);
}
const [command, ...rest] = args;

if (!command || command === "help" || command === "--help") {
  const { helpText } = await import("./client.mjs");
  console.log(helpText(Object.keys(LOCAL)));
  process.exit(0);
}

try {
  if (LOCAL[command]) {
    const module = await import(LOCAL[command]);
    process.exitCode = (await module.run(rest)) ?? 0;
  } else {
    const { runVerb } = await import("./client.mjs");
    process.exitCode = await runVerb(command, rest);
  }
} catch (error) {
  console.error(`pt ${command}: ${error?.message ?? error}`);
  process.exitCode = 1;
}
