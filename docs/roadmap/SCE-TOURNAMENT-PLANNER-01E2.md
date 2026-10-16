# SCE-TOURNAMENT-PLANNER-01E2 — Smart Mix Generator

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01E2` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01E`](./SCE-TOURNAMENT-PLANNER-01.md) — Smart Generator |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01E1`](./SCE-TOURNAMENT-PLANNER-01E1.md) — **CLOSED / MERGED** (PR **#859**) |
| **Status** | **CURRENT** — implementation branch `cursor/sce-tournament-planner-01e2-smart-mix-generator` |
| **Next** | [`01E3`](./SCE-TOURNAMENT-PLANNER-01.md) Groups + Knockout — **not started** |

## Product purpose

Smart Mix generates a **deterministic, balanced opponent set** when the organiser wants each participant to play approximately the same number of matches without requiring a full round robin.

Primary input: **`targetMatchesPerParticipant`** (“Spiele pro Team” in future Creator).

Smart Mix decides **WHO**. It does **not** schedule times, assign Tournament Pitches, or run feasibility.

## Pipeline (binding)

**Tenant owns tournament?** → Participants → competition format / phase → **Fixture Generator (WHO)** → **01D Feasibility (CAN IT FIT?)** → **01F Schedule Optimiser (WHEN + WHICH Tournament Pitch)** → locks / manual adjustment → results → publication.

## Tournament Planner ownership (unchanged from 01E1)

| Flag | Value |
| --- | --- |
| **TOURNAMENT_PLANNER_SCOPE** | **TENANT_ORGANISED_TOURNAMENTS_ONLY** |
| **AWAY_TOURNAMENT_GENERATION_ALLOWED** | **NO** |
| **UNKNOWN_OWNERSHIP_FAILS_CLOSED** | **YES** |

Resolver: `canTenantPlanTournament` / `resolveTournamentPlannerOwnership` (`planner-eligibility.ts`). Service entry: `requireTenantOrganisedTournament` before writes.

Physical venue does **not** determine planner eligibility. Fixture Home/Away relevance is independent from ownership.

## Architecture

Executable strategies on the **same** foundation as 01E1:

| Strategy | Entry |
| --- | --- |
| `ROUND_ROBIN` | `generateTournamentFixtures` → `generateRoundRobinFixtures` |
| `SMART_MIX` | `generateTournamentFixtures` → `generateSmartMixFixtures` |

Service bridge: `generateTournamentFixturesForEvent` with `strategy: "SMART_MIX"` and `targetMatchesPerParticipant`.

No parallel persistence model, no Smart Mix tables, no scheduling fields on generation output.

## Mathematical model

- `n` participants, target `k` matches each.
- Total appearances `n × k` must yield an **integral** fixture count (`appearances / 2`).
- When `n × k` is **even**: every participant plays exactly `k` matches — **`EXACT`**.
- When `n × k` is **odd**: exact equality is impossible. Canonical parity policy:
  - First participant in **canonical order** receives **`k − 1`** matches.
  - All others receive **`k`**.
  - No participant exceeds `k`.
  - Maximum match-count spread **≤ 1**.
  - Classification: **`NEAR_BALANCED_PARITY`**.
  - Fixture count: **`floor(n × k / 2)`** (= `(n×k−1)/2` under this policy).

No BYE fixtures, fake participants, or half-fixtures.

## Opponent diversity and rematches

1. **Phase 1 — unique opponents:** circle-method round pairings; add edges only while pair multiplicity is zero (no unnecessary rematches when capacity allows).
2. **Phase 2 — fair rematches:** greedy round matchings over remaining degree, prioritising lowest pair multiplicity, deterministic participant-id tie-breaks.

Lexicographic soft objectives: maximise unique opponents → minimise max pair multiplicity → minimise repeat variance → fair participant-level repeats.

When `k ≤ n − 1` and a simple no-repeat balanced graph exists, **unnecessary rematches = 0**.

## Home / Away relevance

Reuses 01E1 `HomeAwayRelevance` (`ON` | `OFF`, default **`OFF`**).

- **OFF:** neutral side A/B (lexicographic min on side A).
- **ON:** alternate orientation per pair encounter index; opponent quality precedes cosmetic balance; target `|home − away| ≤ 1` per participant where possible.

## Determinism

Same event inputs (canonical participant order, strategy, target, Home/Away) → identical fixture definitions. No randomness, no time seeds.

## Generator keys

**`SMART_MIX_GENERATOR_KEY_GRAMMAR`:** `smart-mix:{stageKey}:{fixtureIndex}`

Structural `roundIndex` / `slotIndexInRound` group greedy matchings only — **`SMART_MIX_STRUCTURAL_ORDER_IS_SCHEDULE = NO`**.

## Technical limits

| Constant | Value |
| --- | --- |
| **SMART_MIX_FIXTURE_LIMIT** | `TOURNAMENT_GENERATION_TECHNICAL_MAX_FIXTURES` (= **2000**) |
| **ROUND_ROBIN_FIXTURE_LIMIT** | same (**2000**) |
| **PRODUCT_PARTICIPANT_CARDINALITY** | **2:n** (no product max introduced) |

## Diagnostics (pure, derivable)

`deriveSmartMixDiagnostics` exposes target, balance class, per-participant counts, pair multiplicity stats, fixture count. Not persisted.

## Service behaviour

- Idempotent repeat with unchanged config → reuse canonical set.
- Target / strategy / participant drift → structured conflict (no silent regeneration — **01G**).
- Atomic persistence; concurrency race handling unchanged from 01E1.

## 01D handoff

Feasibility remains generator-agnostic (`FEASIBILITY_REQUIRES_ROUND_ROBIN_SOURCE = NO`). Smart Mix output is valid concrete-participant fixtures.

## Future adoption (not in 01E2)

| Area | Required later |
| --- | --- |
| **Tournament Creator** | Mode choice + “Spiele pro Team” for Smart Mix |
| **Tournament Planung** | Display / locks / manual adjustment on generated Smart Mix sets |

## Out of scope (01E2)

Groups, knockout, results, locks/regeneration, UI, pitch/time assignment, minimum rest in WHO generation.
