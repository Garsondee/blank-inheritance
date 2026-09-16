// Captures console.log output during a test, restoring the real console.log
// afterward regardless of pass/fail. The module-sync orchestration scripts
// (sync-harvest.mjs, sync-module.mjs, sync-campaign-data.mjs) are CLI tools
// that report their result as printed lines plus process.exitCode, not a
// return value -- see each script's own header comment -- so a test of their
// actual behavior has to read stdout, not just a return type.
//
// Deliberately tiny and single-purpose, same reasoning as
// test/support/mock-foundry.mjs and test/support/sf2e-template.mjs being
// separate small files rather than one grab-bag: this has nothing to do with
// mocking the remote layer (see mock-remote.mjs), and a test that needs one
// but not the other shouldn't have to know about both.
export function captureConsole() {
  const lines = [];
  const original = console.log;
  console.log = (...args) => {
    lines.push(args.map(String).join(" "));
  };
  return {
    lines,
    restore() {
      console.log = original;
    },
  };
}
