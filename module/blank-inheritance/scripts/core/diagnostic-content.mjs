/**
 * This project already writes "TEST FIXTURE — ...", "... (diagnostic ...)"
 * and "ZZ TEST ..." as explicit, self-chosen labels on scratch content meant
 * to be thrown away once reviewed. The first two were already caught by
 * scene-build.mjs's own DIAGNOSTIC_NAME_PATTERN (found live 2026-09-18 in the
 * real world's own scene list — "TOKEN RING PROOF (diagnostic, delete after
 * review)" says so in as many words); the third was already named in that
 * same file's comment and in travel-test-fixtures.mjs's header ("the world's
 * own 'ZZ TEST CHARACTER' Actor") but never actually folded into the regex —
 * found live 2026-09-19 cluttering the Scene Runner's summon list with a real
 * "ZZ TEST CHARACTER — Kestrel Vance (DELETE BEFORE LAUNCH)" Actor that the
 * old two-alternative pattern silently let through.
 *
 * Shared here rather than duplicated per document type, since the convention
 * is about a NAME a human chose, not about being a Scene or an Actor —
 * scene-build.mjs's scene cleanup and scene-runner.mjs's summon list both
 * read the identical rule.
 */
export const DIAGNOSTIC_NAME_PATTERN = /test fixture|\(diagnostic\b|\bzz test\b/i;

export function isDiagnosticName(name) {
  return DIAGNOSTIC_NAME_PATTERN.test(name ?? "");
}
