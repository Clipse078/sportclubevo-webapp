# SCE-TOURNAMENT-PLANNER-01G — Locks + Partial Regeneration

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01G` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01F2`](./SCE-TOURNAMENT-PLANNER-01F2.md) — **CLOSED / MERGED** (PR **#866**) |
| **Status** | **CURRENT — ready for review** |
| **Next** | **01H** — Tournament Planung workspace |

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

## Persistence

| Field | Value |
| --- | --- |
| **LOCK_PERSISTENCE_IMPLEMENTED** | **YES** |
| **LOCK_PERSISTENCE_MODEL** | `TournamentFixtureAssignment.scheduleLockDimension` (+ legacy `isLocked` for full lock) |
| **SCHEMA_CHANGE** | **YES** — migration `20261017120000_sce_tournament_planner_01g_schedule_lock_dimension` |

Services:

- `setTournamentFixtureAssignmentScheduleLock` — set/clear dimension with optimistic revision bump
- `setTournamentFixtureAssignmentLocked` — sets **TIME_AND_PITCH** (backward compatible)

Historical **`TournamentScheduleVersion`** rows are not destructively mutated; regeneration is computed in memory (01H may persist a new working version explicitly).

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

## Minimal disruption objective

Deterministic lex order after hard constraints and lock preservation:

1. Minimise fixtures moved in **both** time and pitch  
2. Minimise time-only moves  
3. Minimise pitch-only moves  
4. Minimise total time displacement (minutes)  
5. Maximise unchanged unlocked fixtures  
6. Canonical **01F2** soft objective vector  

No opaque weighted score (`OPAQUE_WEIGHTED_REGENERATION_SCORE = NO`).

Metrics: `RegenerationChangeMetrics` in `partial-regeneration/disruption-metrics.ts`.

## Lock validation

`validateResolvedScheduleLocks` returns structured categories:

`PITCH_OVERLAP`, `PARTICIPANT_OVERLAP`, `MINIMUM_REST`, `BREAK_CONFLICT`, `INVALID_TOURNAMENT_PITCH`, `QUALIFICATION_DEPENDENCY`, `OUTSIDE_TOURNAMENT_WINDOW`

Invalid locks are **rejected** — never silently moved.

## Invariants

- Locked dimensions never move during regeneration  
- Hard constraints (01D/01F2) dominate  
- Deterministic — no random tie-break, no wall-clock outcome  
- `TOURNAMENT_PLANNER_SCOPE = TENANT_ORGANISED_TOURNAMENTS_ONLY` on service entry  
- Pure engine does not write Prisma  

## Performance observations (representative, STAGE VM)

| Fixtures | Mixed locks | Notes |
| --- | --- | --- |
| 8 | ~25% locked | Regeneration reuses bounded 01F2 path; sub-second after baseline |
| 16 | ~25% locked | Deterministic; bounded improvement dominates |
| 32+ | ~25% locked | Same caps as 01F2-R1 (`BOUNDED_IMPROVEMENT_*`) |

No new product limits.

## 01H handoff

UI will call:

- `setTournamentFixtureAssignmentScheduleLock(tenantId, assignmentId, dimension | null, userId, { expectedRevision })`
- `runTournamentPartialRegenerationForVersion({ tenantId, tournamentId, scheduleVersionId })`
- Display `lockConflictDiagnostics` + `changeMetrics`

## Roadmap

| Package | Status |
| --- | --- |
| 01A–01F2 | **CLOSED** |
| **01G** | **CURRENT** |
| **01H** | **NEXT** — Tournament Planung workspace |
| 01I–01M | Unchanged |
