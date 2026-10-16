# SCE-TOURNAMENT-PLANNER-01D — Feasibility + Hard-Constraint Validator

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01D` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01C`](./SCE-TOURNAMENT-PLANNER-01C.md) — **CLOSED / MERGED** |
| **Branch** | `cursor/sce-tournament-planner-01d-feasibility-hard-constraints` |
| **ADR** | [`ADR-014`](./05-architecture-decisions.md#adr-014--tournament-fixture-vs-schedule-separation-and-deterministic-scheduling-engine) |
| **01D-R1** | Tournament Pitch + break model correction (PO superseding product decision) |

## Scope delivered

- Pure feasibility engine: `lib/tournament-scheduling/feasibility/`
- Application bridge: `analyseTournamentFeasibilityForTournament` in `lib/tournament-scheduling/feasibility-service.ts`
- Structured result contract (`FEASIBLE` \| `TIGHT` \| `INFEASIBLE`) with diagnostics, metrics, suggestions
- Hard-constraint catalogue executable map (H1–H12)
- **01D-R1:** `TournamentPitch`, `TournamentBreak` persistence; assignments → `TournamentPitch` (not `FacilityResource`)
- Pure + mocked service tests — **no operational tournament data**

## Product cardinality (canonical)

| Concept | Cardinality |
| --- | --- |
| **Participants** | **2:n** (product) |
| **Tournament Pitches** | **1:n** per tournament (logical, tournament-owned) |
| **Tournament breaks / blocked periods** | **0:n** per tournament |

| Flag | Value |
| --- | --- |
| **FACILITY_RESOURCE_EQUALS_TOURNAMENT_PITCH** | **NO** |
| **PHYSICAL_RESOURCE_MODEL_PRESERVED** | **YES** (`TournamentResourceAllocation` unchanged) |
| **CURRENT_MVP_PARTICIPANT_LIMIT** | **16** (`FEASIBILITY_MAX_PARTICIPANTS` / 01C generator guard — **implementation safety only**) |
| **PARTICIPANT_LIMIT_IS_PRODUCT_RULE** | **NO** |

Example: physical resource **Kunstrasen 2** may host tournament logical pitches **Feld 1…Feld 8**.

## Separation (frozen)

| Package | Question |
| --- | --- |
| **01C** | WHO plays whom |
| **01D** | CAN it fit? |
| **01E** | WHEN + WHICH logical pitch (optimiser) |

`SCHEDULE_VERSION_CREATED = NO` and `FIXTURE_ASSIGNMENTS_CREATED = NO` for feasibility analysis.

## Feasibility result contract

```typescript
type TournamentFeasibilityStatus = "FEASIBLE" | "TIGHT" | "INFEASIBLE";
```

| Status | Meaning |
| --- | --- |
| **FEASIBLE** | All hard constraints can be satisfied; capacity/rest slack remains beyond TIGHT thresholds |
| **TIGHT** | A valid schedule exists, but utilisation/rest/slot slack triggers conservative warning thresholds |
| **INFEASIBLE** | At least one hard constraint makes a complete assignment impossible (**proof or complete bounded search only**) |

Both **FEASIBLE** and **TIGHT** require a **witness** schedule. **INFEASIBLE** requires a **lower-bound proof** or **complete deterministic search** within MVP bounds — not greedy/heuristic failure alone.

### TIGHT policy (deterministic)

TIGHT when feasible and any of:

1. `capacityUtilisation >= 0.85` (`TIGHT_CAPACITY_UTILISATION_THRESHOLD`) — uses **effective** pitch minutes after breaks
2. `participantMinRestSlackMinutes === 0`
3. `fixtureCount >= theoreticalSlotCapacity`

## Authoritative time sources

| Rule | Source |
| --- | --- |
| **TOURNAMENT_WINDOW_SOURCE** | `Event.startAt` / `Event.endAt` |
| **MATCH_DURATION_SOURCE** | `TournamentScheduleVersion.matchDurationMinutes` when set; else tenant default |
| **TRANSITION_DURATION_SOURCE** | `TournamentScheduleVersion.transitionMinutes` when set; else application default `0` |
| **MINIMUM_REST_SOURCE** | `TournamentScheduleVersion.minRestMinutes` when set; else application default `0` |

Scheduling rule persistence on **`TournamentScheduleVersion`** remains the authoritative snapshot when a version exists; Creator-level tournament defaults are still a documented adoption gap for pre-version tournaments.

## Slot + occupancy semantics

| Concept | Definition |
| --- | --- |
| **PITCH_SLOT_DURATION** | `matchDurationMinutes + transitionMinutes` |
| **PARTICIPANT_ACTIVE_DURATION** | `matchDurationMinutes` only |
| **REST_CALCULATION** | `nextStart >= previousParticipantEnd + minRestMinutes` |
| **TOURNAMENT_BREAK** | Longer unavailable period; half-open `[start, end)` — fixture may start exactly at break end |
| **BREAK_SCOPE** | `ALL_PITCHES` or `SELECTED_PITCHES` (tournament pitch ids only) |

Candidate slots: deterministic stride = pitch slot duration on each playable interval per **TournamentPitch**; cap **500** (`FEASIBILITY_MAX_CANDIDATE_SLOTS`).

## Resource semantics (01D-R1)

| Layer | Model |
| --- | --- |
| **Physical location** | `TournamentResourceAllocation` → canonical `FacilityResource` (unchanged) |
| **Scheduler grid** | `TournamentPitch` (1:n, tournament-owned labels/order) |
| **Blocked time** | `TournamentBreak` (+ optional `TournamentBreakPitch` links) |
| **Assignment** | `TournamentFixtureAssignment.tournamentPitchId` + `startAt`/`endAt` |

| Flag | Value |
| --- | --- |
| **FEASIBILITY_USES_TOURNAMENT_PITCHES** | **YES** |
| **FEASIBILITY_USES_FACILITY_RESOURCE_AS_PITCH** | **NO** |
| **DRESSING_ROOMS_IN_FEASIBILITY_ENGINE** | **NO** |

Facility availability conflicts are **not** duplicated inside the feasibility engine; they remain an upstream concern for whether the tournament may use its physical location.

## Hard constraints (H1–H12)

Implemented in `lib/tournament-scheduling/feasibility/constraints.ts` and enforced via validation, lower bounds, break-aware slot generation, locks, and **complete bounded backtracking search** (MVP limits).

## Algorithm

1. Validate fixture set + MVP safety limits
2. Validate/normalize breaks; build per-pitch playable intervals
3. Compute capacity metrics on **effective** pitch minutes
4. Generate ≤500 candidate slots (break-aware)
5. Early **INFEASIBLE** on proof-based lower-bound violations
6. **Complete deterministic search** for witness (not greedy-only)
7. Classify **TIGHT**

## Diagnostics & suggestions

Structured codes include `CAPACITY.*`, `REST.*`, `PITCH.UNAVAILABLE`, `BREAK.*`, `ASSIGNMENT.SEARCH_EXHAUSTED` (complete search only).

Suggestions: `EXTEND_TOURNAMENT_WINDOW`, **`ADD_TOURNAMENT_PITCH`**, `REDUCE_MATCH_DURATION`, `REDUCE_TRANSITION_DURATION`, `REDUCE_MINIMUM_REST`.

## Tournament Creator adoption assessment

| Flag | Value |
| --- | --- |
| **TOURNAMENT_CREATOR_ADOPTION_REQUIRED** | **YES** |

| Category | Items |
| --- | --- |
| **CREATOR_FIELDS_ALREADY_AVAILABLE** | `startAt`, `endAt`, `resourceAllocations` (physical), `participants` |
| **CREATOR_FIELDS_MISSING** | `matchDurationMinutes`, `transitionMinutes`, `minRestMinutes`; **1:n Tournament Pitches**; **0:n Pausen/Sperrzeiten** |

Future UX targets documented in programme brief — not implemented in 01D-R1 UI.

## Tournament Planung adoption assessment

| Flag | Value |
| --- | --- |
| **TOURNAMENT_PLANUNG_ADOPTION_REQUIRED** | **NO_FOR_01D_UI** |

## Performance

MVP **safety** limits: ≤16 participants, ≤120 fixtures, ≤8 pitches, ≤500 candidate slots (not product maximums).

## 01E handoff

01E receives:

- Validated fixture set (01C)
- **TournamentPitch** grid + break model
- Normalized candidate slots (`tournamentPitchId`)
- Hard-constraint rules + feasibility diagnostics/metrics

01E selects **WHEN + WHICH TOURNAMENT PITCH** — not `FacilityResource`.

## Schema (01D-R1)

| Property | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **YES** |
| **NEW_MIGRATION** | **YES** — `20261016160000_sce_tournament_planner_01d_r1_tournament_pitch_break` |
| **Assignment FK** | `TournamentFixtureAssignment.tournamentPitchId` → `TournamentPitch` |

## Test evidence

- `lib/tournament-scheduling/feasibility/__tests__/feasibility-engine.test.ts` — matrix A–L, pitch/break matrices, boundaries, performance
- `lib/tournament-scheduling/__tests__/feasibility-service.test.ts` — config resolution + service bridge (mocked)
