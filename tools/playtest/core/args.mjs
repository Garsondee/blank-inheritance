/**
 * A small command-line parser shared by the `pt` CLI and the hub. Pure.
 *
 *   --flag             -> { flag: true }
 *   --flag=value       -> { flag: "value" }
 *   --flag value       -> { flag: "value" }   (only for flags named in `valued`; every other bare flag is a boolean)
 *   --no-flag          -> { flag: false }
 *   --                 -> everything after it is positional
 *
 * Repeating a valued flag collects an array: `--repro a --repro b` -> { repro: ["a","b"] }. A value that starts with `--` after a valued flag is
 * taken as the next flag (the value was missing), except after `--flag=`.
 */

export function parseArgs(argv, { valued = [], aliases = {} } = {}) {
  const valuedSet = new Set(valued);
  const flags = {};
  const positionals = [];
  const put = (name, value) => {
    if (name in flags) flags[name] = Array.isArray(flags[name]) ? [...flags[name], value] : [flags[name], value];
    else flags[name] = value;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith("--") || arg.length === 2) {
      positionals.push(arg);
      continue;
    }
    let name = arg.slice(2);
    const eq = name.indexOf("=");
    if (eq >= 0) {
      const key = aliases[name.slice(0, eq)] ?? name.slice(0, eq);
      put(key, name.slice(eq + 1));
      continue;
    }
    name = aliases[name] ?? name;
    if (name.startsWith("no-") && !valuedSet.has(name)) {
      flags[name.slice(3)] = false;
      continue;
    }
    if (valuedSet.has(name)) {
      const next = argv[i + 1];
      if (next !== undefined && !(next.startsWith("--") && next.length > 2)) {
        put(name, next);
        i++;
      } else {
        put(name, true);
      }
    } else {
      put(name, true);
    }
  }
  return { flags, positionals };
}

/** Quote one argument for display in a command line (used when the hub echoes what an agent ran). */
export function quote(arg) {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : JSON.stringify(arg);
}
