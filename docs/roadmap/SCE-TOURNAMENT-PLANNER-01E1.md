# SCE-TOURNAMENT-PLANNER-01E1 — Smart Generator Foundation + Repeated Round Robin

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01E1` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01E`](./SCE-TOURNAMENT-PLANNER-01.md) — Smart Generator Foundation |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01D`](./SCE-TOURNAMENT-PLANNER-01D.md) — **CLOSED / MERGED** |
| **Status** | **DRAFT / IN REVIEW** |

## Scope

| In scope | Out of scope |
| --- | --- |
| Canonical generator foundation (`generateTournamentFixtures`) | Smart Mix algorithm (01E2) |
| Repeated round robin (`meetingsPerOpponent = 1:n`) | Groups / knockout (01E3) |
| Fixture Home/Away relevance (`ON` / `OFF`, default `OFF`) | Schedule optimisation (01F) |
| Tenant-organised planner guard (hard reject away tournaments) | Tournament Planner UI |
| 01D feasibility handoff for generated fixture sets | Partial / full regeneration (01G) |

## Product flags

| Flag | Value |
| --- | --- |
| **SMART_TOURNAMENT_GENERATOR** | **CANONICAL** |
| **AUTOMATIC_GENERATION_IS_PRIMARY** | **YES** |
| **MANUAL_ADJUSTMENT_IS_SUPPORTED** | **YES** |
| **TOURNAMENT_PLANNER_SCOPE** | **TENANT_ORGANISED_TOURNAMENTS_ONLY** |

## Pipeline (binding)

**TENANT-ORGANISED TOURNAMENT** → `TournamentParticipants` → competition structure → tournament phase (`stageKey`) → **01E fixture generator** → `TournamentFixture` → **01D feasibility** → **01F schedule optimiser** → `TournamentFixtureAssignment` → locks / manual adjustment → results → publication.

- **01E decides WHO.**
- **01D determines CAN IT FIT?**
- **01F decides WHEN + WHICH Tournament Pitch.**

## Tournament Planner ownership

Planner eligibility is **organiser ownership**, not physical venue.

| Resolver | Source |
| --- | --- |
| **`canTenantPlanTournament`** | `Event.homeAway` for `type=TOURNAMENT` — `HOME` = tenant organises, `AWAY` = external organiser |

Implementation: `lib/tournament-scheduling/planner-eligibility.ts` (aliases `isTenantHostedTournament`).

Fixture generation **must** call `requireTenantOrganisedTournament` before any fixture writes. Away tournaments return **`TOURNAMENT_PLANNER_NOT_OWNED_BY_TENANT`**.

Future navigation:

- Tenant-organised → **Turnier → Planung** (full planner)
- Away → participation / operational workflows only (no disabled fake planner)

## Generator foundation

Entry point: `generateTournamentFixtures` (`lib/tournament-scheduling/fixtures/generate-tournament-fixtures.ts`).

| Strategy | 01E1 |
| --- | --- |
| `ROUND_ROBIN` | **Implemented** |
| `SMART_MIX` | Contract only — explicit structured rejection |

Service bridge: `generateTournamentFixturesForEvent` (`fixture-generation-service.ts`).

## Repeated round robin

| Concept | Rule |
| --- | --- |
| **PRODUCT_ROUND_ROBIN_MEETINGS_PER_OPPONENT** | **1:n** |
| Fixture count | `n × (n − 1) / 2 × m` |
| **cycleIndex** | `0 … m−1` — encoded in `generatorKey` |
| **roundIndex** (persisted) | Globally increasing across cycles |
| **slotIndexInRound** | Slot within the round |

**Generator key grammar:**

`round-robin:{stageKey}:{cycleIndex}:{roundIndexInCycle}:{slotIndexInRound}`

Example: `round-robin:MAIN:1:3:0`

## Fixture Home/Away relevance

Distinct from tournament organiser HOME/AWAY.

| Setting | Behaviour |
| --- | --- |
| **OFF** (default) | Neutral side A/B — lower participant id is side A |
| **ON** | Alternating home exposure across cycles (`cycleIndex % 2` reverses sides) |

## Technical limits

| Limit | Value | Notes |
| --- | --- | --- |
| **ROUND_ROBIN_FIXTURE_LIMIT** | 2000 | `TOURNAMENT_ROUND_ROBIN_TECHNICAL_MAX_FIXTURES` |
| **ROUND_ROBIN_PARTICIPANT_LIMIT** | Unbounded with fixture guard | 01C 16-cap removed from pure generator |
| **FEASIBILITY_PARTICIPANT_LIMIT** | 16 | Unchanged 01D MVP envelope |

## Idempotency & drift

Same participants + strategy + configuration → identical canonical set; repeated calls reuse persisted rows.

Changed `meetingsPerOpponent` or participant set with existing fixtures → structured conflict (`TOURNAMENT_FIXTURES_ALREADY_EXIST` / participant drift) — no destructive delete in 01E1.

## Tests

See `lib/tournament-scheduling/**/__tests__/*01e1*` and extended round-robin matrix.
