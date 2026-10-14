/**
 * The seat verbs: the whole vocabulary an agent has at the table. One definition, used by the CLI (to parse), the hub (to check who may
 * call what) and the agent brief (to say what exists). Pure.
 *
 * Deliberately small and deliberately human: look, press, type, scroll, drag, wait, speak, remember, note a problem. There is no verb
 * that reads the game's data, runs code in the page or touches a file; the orchestrator has those, under a separate path of the hub.
 */

/** Flags that take a value (everything else is a plain on/off flag). */
export const VALUED_FLAGS = ["find", "window", "chars", "scale", "region", "label", "into", "to", "since", "limit", "kind", "severity", "expected", "actual", "repro", "evidence", "ref", "add", "why", "beat", "ms", "text", "gone", "timeout", "repeat", "summary", "as", "seat", "dc", "degree", "natural", "count", "check", "scene", "prefer", "note", "seed", "name", "roster", "reason", "names", "run", "format", "code", "who", "episode", "scenes", "roll-delay"];

/** Verb -> { who: "any"|"gm", usage, help }. `who: "gm"` verbs refuse a player seat. */
export const SEAT_VERBS = {
  look: { who: "any", usage: 'look [--all] [--find "words"] [--window "title"] [--chars N]', help: "Read your screen as text: every window, what it says, and every control with a ref like r12. Run it after anything changes. --find lists only controls whose words match (the way to search a long list)." },
  shot: { who: "any", usage: "shot [--scale 0.6] [--region x,y,w,h]", help: "Save a picture of your screen and print where it is; view it with the Read tool. Use it for the stage, the map, or anything drawn rather than written." },
  click: { who: "any", usage: 'click <ref | "words on the control" | x,y> [--right] [--double]', help: "Press something with the mouse, the way a person would." },
  type: { who: "any", usage: 'type "text" [--into <ref>] [--clear] [--enter]', help: "Type into the focused field, or click --into a field first. --clear empties it; --enter presses Enter afterwards." },
  key: { who: "any", usage: 'key "Tab" | "Shift+Tab" | "Enter" | "Escape" | "Ctrl+Shift+K" | "ArrowDown ArrowDown Enter" [--repeat N]', help: "Press keys. Several separated by spaces are pressed in order." },
  scroll: { who: "any", usage: "scroll [<ref | x,y>] <up|down|left|right> [amount]", help: "Turn the mouse wheel over a control or the middle of the screen." },
  drag: { who: "any", usage: "drag <from> <to>", help: "Press at one place, move, and let go at another (a card on the stage, a slider)." },
  upload: { who: "any", usage: "upload <ref of a file input> <test file>", help: "Choose one of the rig's test files for a file input. `upload --list` shows the files you may choose." },
  wait: { who: "any", usage: 'wait [--ms 800] | [--text "words"] | [--gone "words"] [--timeout 15000]', help: "Pause, or wait until words appear on or leave the screen." },
  reload: { who: "any", usage: "reload", help: "Refresh the page, as a person pressing F5. The game comes back in a few seconds." },
  say: { who: "any", usage: 'say "what you say" [--to P3,GM]', help: "Speak at the table. With --to it is a whisper only those seats hear." },
  do: { who: "any", usage: 'do "what your character does"', help: "Say what your character does, in the third person, for the table to hear." },
  read: { who: "any", usage: "read [--all] [--since N] [--limit N]", help: "What has been said at the table that you have not yet heard (or the latest with --all)." },
  note: { who: "any", usage: 'note --kind <bug|ux-friction|a11y|perf|sync|material-gap|material-weak|continuity|rules|praise> --severity <S0..S3> "what you noticed" [--expected ""] [--actual ""] [--repro "step" ...] [--ref "R10"]', help: "Tell the observers about a problem or something that worked, OUT of the story. A screenshot is attached for you. S0 stops play or shows you something you should not see; S1 wrong or missing information, or you needed a workaround; S2 friction or confusion; S3 polish. Never fix, never suggest a fix: just say what happened." },
  memory: { who: "any", usage: 'memory [--add "a line to remember"]', help: "Your own notes: what your character knows and wants. They are kept for the next stretch of play." },
  who: { who: "any", usage: "who", help: "Who you are at this table, and whether play is paused." },
  improv: { who: "gm", usage: 'improv "what I had to invent" --why "what the scene lacked" [--beat <id>]', help: "GM only. Log each time the material gave you nothing and you made something up. Counted by beat; a cluster is a hole in the scene." },
  "read-aloud": { who: "gm", usage: "read-aloud", help: "GM only. Post the open beat's read-aloud text, exactly as the Runner shows it, to the table." }
};

export const ORCHESTRATOR_ONLY = ["run", "pause", "resume", "dice", "detect", "probe", "coverage", "findings", "eval", "table", "status", "shots", "bots", "walk", "predict", "brief-seat"];

/** Validate a seat verb call. Returns an error sentence, or null. */
export function checkVerbCall(verb, role) {
  const spec = SEAT_VERBS[verb];
  if (!spec) return `There is no verb "${verb}". The verbs are: ${Object.keys(SEAT_VERBS).join(", ")}.`;
  if (spec.who === "gm" && role !== "gm") return `"${verb}" is for the GM seat only.`;
  return null;
}

/** The verb reference an agent brief carries. */
export function verbReference(role) {
  return Object.entries(SEAT_VERBS)
    .filter(([, v]) => v.who === "any" || role === "gm")
    .map(([name, v]) => `- ${v.usage}\n    ${v.help}`)
    .join("\n");
}
