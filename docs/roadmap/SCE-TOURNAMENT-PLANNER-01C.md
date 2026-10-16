# SCE-TOURNAMENT-PLANNER-01C — Deterministic Round-Robin Fixture Generation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01C` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01B`](./SCE-TOURNAMENT-PLANNER-01B.md) — **CLOSED / MERGED** |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#855** → STAGE) |
| **Merge commit** | `b62af792af698fd0092e6f9bfd6d632ca99198f8` |
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
2. ascending participant `id` (UTF-16 code-unit lexical tie-break — locale-independent)

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
- DB uniqueness on `(eventId, stageKey, roundIndex, slotIndexInRound)` prevents duplicate slot rows; concurrent callers may race — one transaction commits the full set, the loser’s transaction rolls back (no partial sets), then the service re-reads and returns the winner’s fixture set idempotently when it matches the deterministic generation (raw `P2002` is not surfaced to callers)

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

## Product UX handoff (recorded — no UI in 01C)

**Smart Tournament Scheduling is not a separate top-level product module.** It belongs to the Tournament domain in two contexts:

### A. Tournament Creator Composer

The Tournament Creator progressively adopts scheduling configuration (competition format, match duration, tournament time window, available pitches/resources, transition/buffer, minimum rest, feasibility feedback). Exact field timing follows engine packages — do not implement prematurely.

**Principle:** create the tournament with its scheduling rules. The existing Tournament Creator remains the canonical `SceActivityComposer` adoption — no parallel tournament creation workflow.

### B. Individual Tournament → Planung

Every tournament exposes its scheduling workspace from canonical tournament context navigation (`Übersicht`, `Aufgebot`, `Teilnahme`, **`Planung`**, `Kommunikation`, `Mehr`). Scheduling belongs under **Planung**, progressively containing fixture overview, feasibility, automatic scheduling, pitch × time planner, locks, regeneration/diff, manual adjustments / DnD, conflicts, and approval/publication handoff.

**Principle:** manage and evolve the resulting schedule from that tournament's **Planung** workspace — not from a separate top-level “Smart Tournament Scheduling” navigation domain.

## Future package alignment (01D–01I)

| Package | Scope | Domain |
| --- | --- | --- |
| **01D** | Feasibility + hard-constraint validator | ENGINE / DOMAIN |
| **01E** | Automatic schedule optimiser | ENGINE / DOMAIN |
| **01F** | Locks + regeneration + schedule diff | ENGINE / DOMAIN foundation |
| **01G** | Visual pitch × time planner | First major **Planung** UI adoption |
| **01H** | Manual editing + DnD + conflict UX | Tournament **Planung** |
| **01I** | Approval + publication + sharing | Tournament **Planung** / publication |

Tournament Creator scheduling-rule adoption occurs **progressively** at appropriate package boundaries — not deferred until after 01I. Each future package must explicitly assess:

- `TOURNAMENT_CREATOR_ADOPTION_REQUIRED = YES | NO`
- `TOURNAMENT_PLANUNG_ADOPTION_REQUIRED = YES | NO`

## 01D handoff

01D receives a **persisted deterministic fixture set** (WHO only). Feasibility and hard constraints operate on future schedule assignments — not implemented here.

## Test evidence

- `lib/tournament-scheduling/fixtures/__tests__/round-robin.test.ts`
- `lib/tournament-scheduling/__tests__/fixture-generation-service.test.ts`
- Regression: `lib/tournament-scheduling/__tests__/tournament-scheduling-persistence.test.ts`, `lib/tournaments/__tests__/`

## Schema

`SCHEMA_CHANGE = NO` — 01B `TournamentFixture` model sufficient.
