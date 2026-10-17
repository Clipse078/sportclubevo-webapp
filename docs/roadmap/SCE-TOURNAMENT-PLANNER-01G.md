# SCE-TOURNAMENT-PLANNER-01G — Locks + Partial Regeneration

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01G` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01F2`](./SCE-TOURNAMENT-PLANNER-01F2.md) — **CLOSED / MERGED** (PR **#866**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#867**) |
| **Next** | **01I** — Manual adjustment + DnD (**NEXT**) — 01H workspace **CURRENT** |

## Product purpose

After 01F2 generates a schedule, organisers can **lock** accepted decisions and **regenerate** only the unlocked remainder:

`GENERATE → REVIEW → LOCK → REGENERATE UNLOCKED → REVIEW`

Pure engine + durable lock persistence foundation. **No Planung UI** (01H).

## Lock model

Locks target **`TournamentFixture` schedule decisions** (time and/or `TournamentPitch`). **`FacilityResource` is not lockable.**

| Dimension | Preserved | May change |
| --- | --- | --- |
| **TIME** | Exact `startAt` / `endAt` interval | `TournamentPitch` (if valid) |
| **PITCH** | Exact `TournamentPitch.id` | Start time (if valid) |
| **TIME_AND_PITCH** | Full assignment | Nothing |

Domain type: `TournamentFixtureScheduleLock` in `lib/tournament-scheduling/schedule-lock/`.

### Legacy `isLocked` compatibility

| Rule | Semantics |
| --- | --- |
| **`scheduleLockDimension` set** | Authoritative dimension (`TIME`, `PITCH`, `TIME_AND_PITCH`). |
| **`scheduleLockDimension` null + `isLocked=true`** | Normalized to **`TIME_AND_PITCH`** (legacy full lock). |
| **`mergeScheduleLocks`** | Explicit `scheduleLocks` win; `lockedAssignments` only fill fixtures without an explicit dimension. |
| **Persistence helper** | `resolveEffectiveScheduleLockDimension` / `scheduleLockFromPersistedAssignment` in `schedule-lock/normalize.ts`. |

## Persistence

| Field | Value |
| --- | --- |
| **LOCK_PERSISTENCE_IMPLEMENTED** | **YES** |
| **LOCK_PERSISTENCE_MODEL** | `TournamentFixtureAssignment.scheduleLockDimension` (+ legacy `isLocked` for full lock) |
| **SCHEMA_CHANGE** | **YES** — migration `20261017120000_sce_tournament_planner_01g_schedule_lock_dimension` |

Services:

- `setTournamentFixtureAssignmentScheduleLock` — set/clear dimension with optimistic revision bump (`SCHEDULE.STALE_VERSION` on mismatch)
- `setTournamentFixtureAssignmentLocked` — sets **TIME_AND_PITCH** (backward compatible)

Historical **`TournamentScheduleVersion`** rows are not destructively mutated; regeneration is computed in memory (01H may persist a new working version explicitly). Lock mutations bump **working** schedule `revision` only.

## Regeneration contract

| Pure function | Module |
| --- | --- |
| `regenerateTournamentSchedule` | `lib/tournament-scheduling/partial-regeneration/regenerate.ts` |
| Service loader | `runTournamentPartialRegenerationForVersion` — tenant-organised guard only; **no result persistence** |

Input: 01F2 optimiser input + **`baselineAssignments`** + **`scheduleLocks`**.

Output: `TournamentPartialRegenerationResult` — assignments, 01F2 status/metrics, **`changeMetrics`**, **`lockConflictDiagnostics`**.

## 01F2 reuse

**`PARALLEL_SCHEDULE_OPTIMISER_CREATED = NO`**

Partial locks extend **`optimiseTournamentSchedule`** (slot filtering, lock seed state, regeneration lex compare). No second optimiser.

## Minimal disruption objective (integrated in search)

Regeneration ranks **complete** feasible schedules using a deterministic **lexicographic** objective — not a weighted score.

**Precedence:**

1. Hard constraints (01D / 01F2 validator)
2. Absolute lock preservation (invalid locks → structured diagnostics, no silent override)
3. **Minimal disruption** vs `baselineAssignments`
4. Canonical **01F2** soft objective vector

**`REGENERATION_DISRUPTION_LEX_ORDER` (exact):**

1. Minimize `fixturesMovedInBoth`
2. Minimize `fixturesMovedInTime`
3. Minimize `fixturesMovedInPitch`
4. Minimize `totalTimeDisplacementMinutes`
5. Maximize `unchangedFixtureCount`
6. `compareScheduleObjectiveMetrics` (01F2 lex vector)

Implementation: `compareRegenerationObjectiveBundles` in `partial-regeneration/disruption-metrics.ts`.

### Search integration

| Mode | Fixture count | Behaviour |
| --- | --- | --- |
| **Complete lex enumeration** | ≤ `EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES` (6) | Leaf schedules compared with regeneration bundle; best disruption lex winner, then 01F2. |
| **Bounded improvement** | > 6 | Hill-climb accepts relocations only when regeneration bundle improves; baseline seeded as incumbent witness. |

Zero locks still pass **`baselineAssignments`** — unnecessary changes are penalized even without locks.

## Lock validation

`validateResolvedScheduleLocks` returns structured categories:

`PITCH_OVERLAP`, `PARTICIPANT_OVERLAP`, `MINIMUM_REST`, `BREAK_CONFLICT`, `INVALID_TOURNAMENT_PITCH`, `QUALIFICATION_DEPENDENCY`, `OUTSIDE_TOURNAMENT_WINDOW`

Invalid locks are **rejected** — never silently moved, auto-fixed, or removed.

## Invariants

- Locked dimensions never move during regeneration  
- Hard constraints (01D/01F2) dominate  
- Deterministic — no random tie-break, no wall-clock outcome  
- `TOURNAMENT_PLANNER_SCOPE = TENANT_ORGANISED_TOURNAMENTS_ONLY` on service entry  
- Pure engine does not write Prisma  

## STAGE migration (01G closure)

| Item | Value |
| --- | --- |
| **Migration** | `20261017120000_sce_tournament_planner_01g_schedule_lock_dimension` |
| **Designated STAGE** | `APP_ENV=stage`, `SCE_DATA_ENVIRONMENT=STAGE`, fingerprint `acd3b37682911890`, host fragment `ep-wispy-hall-aso93dy6`, database `neondb` |
| **Script** | `scripts/sce-tournament-planner-01g-stage-migration-verify.ts` |
| **Apply workflow** | Guarded `APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled` (not `db push`) |
| **DESIGNATED_STAGE_DB_VERIFIED** | **YES** |
| **STAGE_MIGRATION_APPLIED** | **YES** |
| **MIGRATION_APPLIED_EXACTLY_ONCE** | **YES** |
| **MIGRATION_HISTORY_HEALTHY** | **YES** |
| **PROD_TOUCHED** | **NO** |

Migration SQL is additive: enum + nullable `scheduleLockDimension` + `UPDATE … WHERE isLocked = true` → `TIME_AND_PITCH` only (no `SET isLocked`, no destructive DDL, **BLIND_LOCK_BACKFILL = NO**).

**Pre/post counts (aggregate; designated STAGE):**

| Metric | Pre | Post |
| --- | ---: | ---: |
| `TournamentFixtureAssignment` rows | 0 | 0 |
| Legacy `isLocked = true` rows | 0 | 0 |
| `TournamentScheduleVersion` rows | 0 | 0 |

**Legacy lock preservation:** every pre-existing `isLocked = true` row receives `scheduleLockDimension = TIME_AND_PITCH`; unlocked rows are not backfilled (`LEGACY_UNLOCKED_ROWS_REMAIN_UNLOCKED = YES`). Normalization for reads without dimension remains in `schedule-lock/normalize.ts`.

## Technical fixture guard (deferred requalification)

| Field | Value |
| --- | --- |
| **CURRENT_TECHNICAL_FIXTURE_GUARD** | **120** (`FEASIBILITY_MAX_FIXTURES`) |
| **PRODUCT_FIXTURE_MAX** | **NONE** (not a business cap) |
| **128-fixture workloads** | Blocked by existing technical guard until requalification in **SCE-TOURNAMENT-PLANNER-01M** |

## Performance observations (representative, deterministic budgets)

Observed via `schedule-partial-regeneration-performance.test.ts` (mixed TIME / PITCH / TIME_AND_PITCH locks, ~25% locked):

| Fixtures | Path | Notes |
| --- | --- | --- |
| 8 | Bounded 01F2 | Sub-second typical after baseline optimise |
| 16 | Bounded | Deterministic evaluations within `BOUNDED_IMPROVEMENT_*` caps |
| 32 | Bounded | Same caps as 01F2-R1 |
| 64 | Bounded | Same caps as 32; automated test asserts `count ≤ FEASIBILITY_MAX_FIXTURES` and `count > EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES` (operator may profile on STAGE) |
| 128 | Guard | `FEASIBILITY_MAX_FIXTURES` (120) — regeneration not invoked; guard reported in tests |

No new product limits; no wall-clock timeouts in engine decisions.

## 01H handoff

UI will call:

- `setTournamentFixtureAssignmentScheduleLock(tenantId, assignmentId, dimension | null, userId, { expectedRevision })`
- `runTournamentPartialRegenerationForVersion({ tenantId, tournamentId, scheduleVersionId })`
- Display `lockConflictDiagnostics` + `changeMetrics`

**`TOURNAMENT_PLANUNG_LOCK_ADOPTION_READY = YES`** (engine + service contracts stable).

## Roadmap

| Package | Status |
| --- | --- |
| 01A–01F2 | **CLOSED / ACCEPTED / MERGED** |
| **01G** | **CLOSED / ACCEPTED / MERGED** (PR **#867**) |
| **01H** | **NEXT / NOT STARTED** — Tournament Planung workspace |
| 01I–01M | **PLANNED** |
