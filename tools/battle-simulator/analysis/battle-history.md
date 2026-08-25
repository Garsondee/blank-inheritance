# Battle History

A running, hand-appended-by-script log of real battery runs — design doc §39. Never hand-edited; re-run `node tools/battle-simulator/analysis/xp-budget-battery.mjs` to add a new dated entry.

## 2026-08-25 — XP-budget battery (seeds 1-15)

**XP-budget tiers** (same 4-PC party throughout: Lunar-17, Tapkey, Bennit, Vorza Moonshot; opposition grows one real fixture at a time):

### Moderate (80xp budget) — n=15

- Outcomes: party-victory=14, timeout=1
- Mean rounds to resolution: 8.7
- Mean party final HP: 97.6% of max
- Mean party damage taken: 14.3
- Mean party healing received: 24.0
- Cover usage — move-into-cover rate: 35.6%, attack-from-cover rate: 21.2%
### Severe (120xp budget) — n=15

- Outcomes: party-victory=15
- Mean rounds to resolution: 6.1
- Mean party final HP: 96.8% of max
- Mean party damage taken: 33.0
- Mean party healing received: 48.0
- Cover usage — move-into-cover rate: 36.3%, attack-from-cover rate: 21.2%
### Extreme (160xp budget) — n=15

- Outcomes: party-victory=9, party-defeat=5, timeout=1
- Mean rounds to resolution: 11.9
- Mean party final HP: 53.2% of max
- Mean party damage taken: 84.5
- Mean party healing received: 67.3
- Cover usage — move-into-cover rate: 39.7%, attack-from-cover rate: 20.6%

**Ranged-combat/cover investigation:**

### Ranged duel (Obozaya vs. Kuriaku) — n=15

- Outcomes: party-victory=5, party-defeat=7, timeout=3
- Mean rounds to resolution: 18.4
- Mean party final HP: 17.5% of max
- Mean party damage taken: 21.1
- Mean party healing received: 0.0
- Cover usage — move-into-cover rate: 25.3%, attack-from-cover rate: 31.0%

---
