# SCE-TOURNAMENT-PLANNER-01C — Deterministic Round-Robin Fixture Generation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01C` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01B`](./SCE-TOURNAMENT-PLANNER-01B.md) — **CLOSED / MERGED** |
| **Branch** | `cursor/sce-tournament-planner-01c-round-robin-generation` |
| **ADR** | [`ADR-014`](./05-architecture-decisions.md#adr-014--tournament-fixture-vs-schedule-separation-and-deterministic-scheduling-engine) |

## Scope delivered

- Pure single **ROUND_ROBIN** generator under `lib/tournament-scheduling/fixtures/`
- Application bridge `generateTournamentRoundRobinFixtures` in `lib/tournament-scheduling/fixture-generation-service.ts`
- Structured errors for generation conflicts and limits
- Pure + service test matrices (mocked Prisma — no operational data)

## Architectural boundary

| Layer | Responsibility |
| --- | --- |
| **Pure generator** | WHO plays whom — circle method, BYE sentinel internal only |
| **Generation service** | Load participants, validate, persist `TournamentFixture` atomically |
| **Out of scope (01C)** | WHEN/WHERE, schedule versions, assignments, resources, UI |

`FIXTURE_SIDE_SEMANTICS = NEUTRAL_A_B` — side A/B are not `Event.homeAway` hosting semantics.

## Format contract

- **SINGLE_ROUND_ROBIN_ONLY** — every unordered participant pair exactly once
- Explicit `format: "ROUND_ROBIN"` at service boundary
- `competitionLabel` remains presentation metadata only

## Participant ordering / seeding

`INPUT_ORDER_DEPENDENCE = NO` for raw retrieval order.

Canonical seed order before rotation:

1. ascending `displayOrder`
2. ascending participant `id` (lexicographic tie-break)

Matches tournament participant list conventions from CREATE-01F / participant service.

## Determinism

- No randomness, timestamps, or locale-sensitive sorts in the generator
- Same canonical participant ids + config → identical fixture definitions
- `roundIndex` is **0-based** (consistent with 01B service tests)

## Circle method + BYE

- Even **N**: `N - 1` rounds, `N / 2` fixtures per round
- Odd **N**: internal `__ROUND_ROBIN_BYE__` sentinel (never persisted); **N** rounds; `(N - 1) / 2` real fixtures per round; each real participant receives exactly one bye

## Fixture identity mapping

| Field | Value |
| --- | --- |
| `stageKey` | `MAIN` (MVP) |
| `roundIndex` | 0-based round |
| `slotIndexInRound` | 0-based per round, dense (no gaps after bye skips) |
| `generatorKey` | `round-robin:{stageKey}:{roundIndex}:{slotIndexInRound}` |
| `sideAParticipantId` / `sideBParticipantId` | lexicographically smaller id → side A |

## Side A/B policy

`SIDE_BALANCE_POLICY`: deterministic lexicographic A/B assignment (no fairness optimiser). Pairing correctness and determinism take precedence.

## Idempotency + existing fixtures

| Case | Behaviour |
| --- | --- |
| No existing fixtures | Persist full set in one transaction |
| Existing set logically identical | Return existing rows — **SECOND_IDENTICAL_GENERATION_CREATES_NEW_ROWS = NO** |
| Existing set differs, same participant universe | `TOURNAMENT_FIXTURES_ALREADY_EXIST` |
| Participant universe changed vs persisted fixtures | `TOURNAMENT_FIXTURE_SET_CONFLICT` (01F owns controlled regeneration) |

No silent delete/recreate.

## Atomicity + concurrency

- `GENERATION_PERSISTENCE_ATOMIC = YES` via `prisma.$transaction`
- DB uniqueness on `(eventId, stageKey, roundIndex, slotIndexInRound)` prevents duplicate slot rows; concurrent callers may race — one succeeds, others fail constraint or see existing fixtures on retry (no partial sets inside a single transaction)

## Limits

| Limit | Value |
| --- | --- |
| `MAX_PARTICIPANTS` | 16 |
| `MAX_FIXTURES` | 120 (16-team single RR) |
| `MIN_PARTICIPANTS` | 2 |

## Explicit non-goals (01C)

- Double round robin, groups, knockout, Swiss, placement rounds
- Schedule versions, assignments, resource allocations, publication
- UI / API routes, feasibility, optimiser, regeneration diff (01D–01F)

## 01D handoff

01D receives a **persisted deterministic fixture set** (WHO only). Feasibility and hard constraints operate on future schedule assignments — not implemented here.

## Test evidence

- `lib/tournament-scheduling/fixtures/__tests__/round-robin.test.ts`
- `lib/tournament-scheduling/__tests__/fixture-generation-service.test.ts`
- Regression: `lib/tournament-scheduling/__tests__/tournament-scheduling-persistence.test.ts`, `lib/tournaments/__tests__/`

## Schema

`SCHEMA_CHANGE = NO` — 01B `TournamentFixture` model sufficient.
