# SCE-TOURNAMENT-PLANNER-01D — Feasibility + Hard-Constraint Validator

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01D` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01C`](./SCE-TOURNAMENT-PLANNER-01C.md) — **CLOSED / MERGED** |
| **Branch** | `cursor/sce-tournament-planner-01d-feasibility-hard-constraints` |
| **ADR** | [`ADR-014`](./05-architecture-decisions.md#adr-014--tournament-fixture-vs-schedule-separation-and-deterministic-scheduling-engine) |

## Scope delivered

- Pure feasibility engine: `lib/tournament-scheduling/feasibility/`
- Application bridge: `analyseTournamentFeasibilityForTournament` in `lib/tournament-scheduling/feasibility-service.ts`
- Structured result contract (`FEASIBLE` \| `TIGHT` \| `INFEASIBLE`) with diagnostics, metrics, suggestions
- Hard-constraint catalogue executable map (H1–H12)
- Pure + mocked service tests — **no operational tournament data**

## Separation (frozen)

| Package | Question |
| --- | --- |
| **01C** | WHO plays whom |
| **01D** | CAN it fit? |
| **01E** | WHEN + WHERE (optimiser) |

`SCHEDULE_VERSION_CREATED = NO` and `FIXTURE_ASSIGNMENTS_CREATED = NO` for feasibility analysis.

## Feasibility result contract

```typescript
type TournamentFeasibilityStatus = "FEASIBLE" | "TIGHT" | "INFEASIBLE";
```

| Status | Meaning |
| --- | --- |
| **FEASIBLE** | All hard constraints can be satisfied; capacity/rest slack remains beyond TIGHT thresholds |
| **TIGHT** | A valid schedule exists, but utilisation/rest/slot slack triggers conservative warning thresholds |
| **INFEASIBLE** | At least one hard constraint makes a complete assignment impossible |

Both **FEASIBLE** and **TIGHT** mean a witness schedule **exists** (01D greedy witness policy). **INFEASIBLE** means no complete assignment under the model.

### TIGHT policy (deterministic)

TIGHT when feasible and any of:

1. `capacityUtilisation >= 0.85` (`TIGHT_CAPACITY_UTILISATION_THRESHOLD`)
2. `participantMinRestSlackMinutes === 0` (some participant gap equals minimum rest exactly)
3. `fixtureCount >= theoreticalSlotCapacity` (zero slot slack)

## Authoritative time sources

| Rule | Source |
| --- | --- |
| **TOURNAMENT_WINDOW_SOURCE** | `Event.startAt` / `Event.endAt` |
| **MATCH_DURATION_SOURCE** | `TournamentScheduleVersion.matchDurationMinutes` when set; else tenant `defaultTournamentDurationMinutes` (`getTenantOperationalDurationPolicy`) |
| **TRANSITION_DURATION_SOURCE** | `TournamentScheduleVersion.transitionMinutes` when set; else application default `0` (`FEASIBILITY_DEFAULT_TRANSITION_MINUTES`) until Creator persistence |
| **MINIMUM_REST_SOURCE** | `TournamentScheduleVersion.minRestMinutes` when set; else application default `0` (`FEASIBILITY_DEFAULT_MIN_REST_MINUTES`) until Creator persistence |

No competing truths inside the pure engine — normalization happens once in `resolveTournamentSchedulingConfig`.

## Slot + occupancy semantics

| Concept | Definition |
| --- | --- |
| **RESOURCE_SLOT_DURATION** | `matchDurationMinutes + transitionMinutes` |
| **PARTICIPANT_ACTIVE_DURATION** | `matchDurationMinutes` only |
| **REST_CALCULATION** | `nextStart >= previousParticipantEnd + minRestMinutes` (participant active end excludes transition) |
| **COMPETING_TIME_TRUTH** | **NO** |

Candidate slots: deterministic stride = resource slot duration on each playable resource availability interval; **not persisted**; cap **500** (`FEASIBILITY_MAX_CANDIDATE_SLOTS`).

## Resource semantics

- Canonical **`FacilityResource`** ids via `TournamentResourceAllocation` (PITCH_HALL group only)
- **DRESSING_ROOMS_IN_FEASIBILITY_ENGINE = NO**
- External occupancy (H10): normalized from `getResourceAvailability` at application boundary (`excludeEventId = tournamentId`)

## Hard constraints (H1–H12)

Implemented in `lib/tournament-scheduling/feasibility/constraints.ts` (`HARD_CONSTRAINT_CATALOGUE`) and enforced via:

- Structural fixture validation (H8, H12)
- Lower-bound checks (H2, H4, H5, H6)
- External occupancy + slot generation (H10, H9)
- Locked assignment validation (H7)
- Deterministic greedy witness assignment (H1, H2, H3, H4, H5, H6, H9, H12)

Round index from 01C is **generation ordering only** — not a kickoff sequencing hard constraint in 01D.

## Algorithm

1. Validate fixture set + MVP limits (participants/fixtures/pitches)
2. Compute deterministic capacity metrics / lower bounds
3. Generate ≤500 candidate slots
4. Early **INFEASIBLE** on obvious lower-bound violations
5. Deterministic **earliest-feasible greedy** witness (01A §20 — aligned with future 01E seed)
6. Classify **TIGHT** via documented thresholds

No soft-objective scoring, fairness optimiser, or pitch balancing (01E).

## Diagnostics & suggestions

Structured codes only (no UI prose), e.g.:

- `CAPACITY.PITCH_MINUTES_SHORT`, `CAPACITY.WINDOW_TOO_SHORT`, `REST.CANNOT_SATISFY_MIN_REST`
- `RESOURCE.UNAVAILABLE`, `SLOTS.TOO_MANY_CANDIDATES`, `FIXTURE_SET.INVALID`, `LOCKS.CONFLICTING`

Suggestions (advisory): `EXTEND_TOURNAMENT_WINDOW`, `ADD_PLAYING_RESOURCE`, `REDUCE_MATCH_DURATION`, `REDUCE_TRANSITION_DURATION`, `REDUCE_MINIMUM_REST`.

## Tournament Creator adoption assessment

| Flag | Value |
| --- | --- |
| **TOURNAMENT_CREATOR_ADOPTION_REQUIRED** | **YES** (future packages) |

| Category | Items |
| --- | --- |
| **CREATOR_FIELDS_ALREADY_AVAILABLE** | `startAt`, `endAt`, `resourceAllocations` (pitches), `participants`, `competitionLabel` (display only) |
| **CREATOR_FIELDS_MISSING** | `matchDurationMinutes`, `transitionMinutes`, `minRestMinutes` on composer draft / Event |
| **CREATOR_PERSISTENCE_GAPS** | No tournament-level scheduling rule columns beyond optional `TournamentScheduleVersion` snapshot (version may not exist pre-Planung) |

01D does **not** redesign the composer — engine + service only.

## Tournament Planung adoption assessment

| Flag | Value |
| --- | --- |
| **TOURNAMENT_PLANUNG_ADOPTION_REQUIRED** | **NO_FOR_01D_UI** |

Future **Planung** (01G+) consumes the same `TournamentFeasibilityResult` contract.

## Performance

MVP limits: ≤16 participants, ≤120 fixtures, ≤8 pitches, ≤500 candidate slots.

Representative worst-case pure-engine test (16-team RR, 8 pitches): **<500ms** on CI hardware (see `feasibility-engine.test.ts` performance case).

## 01E handoff

01E receives:

- Validated fixture set (01C)
- Normalized candidate slot model + resources
- Hard-constraint rules + feasibility diagnostics/metrics

01E must not violate 01D hard constraints when optimising soft objectives.

## Schema

| Property | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **NO** |
| **NEW_MIGRATION** | **NO** |
| **PERSISTENCE_GAP** | Partial — transition/minRest lack tournament-level persistence until Creator adoption; resolved at application boundary with documented defaults |

## Test evidence

- `lib/tournament-scheduling/feasibility/__tests__/feasibility-engine.test.ts` — matrix A–L, boundaries, performance
- `lib/tournament-scheduling/__tests__/feasibility-service.test.ts` — config resolution + service bridge (mocked)
