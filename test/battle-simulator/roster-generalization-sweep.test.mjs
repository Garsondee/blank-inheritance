/**
 * Tests for analysis/roster-generalization-sweep.mjs (design doc §54). The real measuring
 * (runTournamentParallel/aggregateTournament) is already covered by tournament-runner.test.mjs —
 * this file only covers what's genuinely new here: sweepOneRoster's own orchestration (real battles,
 * one row per opponent, a real error on an unknown profile id) and formatRosterSweep's table shape.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sweepOneRoster, formatRosterSweep } from "../../tools/battle-simulator/analysis/roster-generalization-sweep.mjs";
import { BASELINE_V1 } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";

const ROSTER = ["lunar-17.json", "security-goon.json"];

test("sweepOneRoster: one real row per opponent id, in the order given, with real aggregated numbers", async () => {
  const rows = await sweepOneRoster({ roster: ROSTER, partyProfile: BASELINE_V1, opponentIds: ["aggressive-v1", "cautious-v1"], seedSpec: "1-3" });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.opponentId), ["aggressive-v1", "cautious-v1"]);
  for (const { agg } of rows) {
    assert.equal(agg.n, 3);
    assert.ok(agg.partyWinRate >= 0 && agg.partyWinRate <= 1);
    assert.ok(Number.isFinite(agg.meanRounds));
  }
});

test("sweepOneRoster: a real, unknown opponent id throws rather than silently skipping a matchup", async () => {
  await assert.rejects(
    () => sweepOneRoster({ roster: ROSTER, partyProfile: BASELINE_V1, opponentIds: ["not-a-real-profile"], seedSpec: "1" }),
    /Unknown opponent profile id/
  );
});

test("formatRosterSweep: one real markdown table row per opponent, in order, with real percentages", () => {
  const rows = [
    { opponentId: "aggressive-v1", agg: { n: 24, partyWinRate: 0.75, oppositionWinRate: 0.25, timeoutRate: 0, meanRounds: 8.4 } },
    { opponentId: "cautious-v1", agg: { n: 24, partyWinRate: 0.5, oppositionWinRate: 0.4, timeoutRate: 0.1, meanRounds: 15.2 } }
  ];
  const text = formatRosterSweep({ rosterLabel: "bennit.json+erabryth.json", partyId: "baseline-v1", rows, seedSpec: "1-24" });
  assert.match(text, /bennit\.json\+erabryth\.json/);
  assert.match(text, /n=24/);
  assert.match(text, /\| `aggressive-v1` \| 75\.0% \| 25\.0% \| 0\.0% \| 8\.4 \|/);
  assert.match(text, /\| `cautious-v1` \| 50\.0% \| 40\.0% \| 10\.0% \| 15\.2 \|/);
});
