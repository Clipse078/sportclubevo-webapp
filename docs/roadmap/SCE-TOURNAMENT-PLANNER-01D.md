# SCE-TOURNAMENT-PLANNER-01D — Feasibility + Hard-Constraint Validator

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01D` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01C`](./SCE-TOURNAMENT-PLANNER-01C.md) — **CLOSED / MERGED** |
| **Branch** | `cursor/sce-tournament-planner-01d-feasibility-hard-constraints` |
| **ADR** | [`ADR-014`](./05-architecture-decisions.md#adr-014--tournament-fixture-vs-schedule-separation-and-deterministic-scheduling-engine) |
| **01D-R1** | Tournament Pitch + break model correction (PO superseding product decision) |
| **01D-R2** | Smart Tournament Generator architecture alignment (PO product decisions pre-smart generator) |
| **01D-R3** | Roadmap dependency correction + closure-readiness review |

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
| **PARTICIPANT_PRODUCT_CARDINALITY** | **2:n** (product) |
| **TOURNAMENT_PITCH_CARDINALITY** | **1:n** per tournament (logical, tournament-owned) |
| **TOURNAMENT_BREAK_CARDINALITY** | **0:n** per tournament |
| **TOURNAMENT_PHASE_CARDINALITY** | **1:n** per tournament (contract; persistence deferred) |

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
| **01F** | WHEN + WHICH logical pitch (optimiser) |

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

## 01F handoff (schedule optimiser)

01F receives:

- Validated fixture set (01C)
- **TournamentPitch** grid + break model
- Normalized candidate slots (`tournamentPitchId`)
- Hard-constraint rules + feasibility diagnostics/metrics

01F selects **WHEN + WHICH TOURNAMENT PITCH** — not `FacilityResource`.

## Schema (01D-R1)

| Property | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **YES** |
| **NEW_MIGRATION** | **YES** — `20261016160000_sce_tournament_planner_01d_r1_tournament_pitch_break` |
| **Assignment FK** | `TournamentFixtureAssignment.tournamentPitchId` → `TournamentPitch` |

## Test evidence

- `lib/tournament-scheduling/feasibility/__tests__/feasibility-engine.test.ts` — matrix A–L, pitch/break matrices, boundaries, performance
- `lib/tournament-scheduling/__tests__/feasibility-service.test.ts` — config resolution + service bridge (mocked)
- `lib/tournament-scheduling/__tests__/smart-generator-architecture-01d-r2.test.ts` — R2 contracts + generator-agnostic feasibility
- `lib/tournaments/__tests__/tournament-planner-01d-r2-roadmap.test.ts` — documentation integrity
- `lib/tournaments/__tests__/participant-service.test.ts` — same-team multi-participant + displayName (01D-R2)

---

## 01D-R2 — Smart Tournament Generator architecture alignment

| Flag | Value |
| --- | --- |
| **SMART_TOURNAMENT_GENERATOR** | **CANONICAL** |
| **AUTOMATIC_GENERATION_IS_PRIMARY** | **YES** |
| **MANUAL_ADJUSTMENT_IS_SUPPORTED** | **YES** |
| **SAME_SOURCE_TEAM_MULTIPLE_PARTICIPANTS** | **YES** (schema + service; migration drops `@@unique([eventId, teamId])`) |
| **TOURNAMENT_LOCAL_DISPLAY_NAME** | **YES** (`displayName` on TEAM + EXTERNAL_CLUB; never mutates Team/Club) |
| **MANUAL_PARTICIPANT_SUPPORTED** | **YES** (`manualLabel`) |
| **EXTERNAL_PARTICIPANT_SUPPORTED** | **YES** (`externalClubId` / historical `externalTeamId`) |
| **FEASIBILITY_REQUIRES_ROUND_ROBIN_SOURCE** | **NO** |
| **HEURISTIC_ONLY_INFEASIBLE_OUTCOMES** | **0** (preserved from R1) |
| **FUTURE_KNOCKOUT_QUALIFICATION_MODEL_DEFINED** | **YES** (`FixtureSideSourceContract` in `smart-generator-architecture.ts`) |
| **FACILITY_RESOURCE_EQUALS_TOURNAMENT_PITCH** | **NO** |
| **MULTIPLE_GLOBAL_BREAKS_SUPPORTED** | **YES** |
| **MULTIPLE_PITCH_SPECIFIC_BREAKS_SUPPORTED** | **YES** |
| **PARTICIPANT_LIMIT_IS_PRODUCT_RULE** | **NO** |
| **PARTICIPANT_LIMIT_REQUALIFICATION_RECORDED** | **YES** |
| **HOME_AWAY_RELEVANCE_EXPLICIT** | **YES** (contract only; default OFF for neutral youth) |
| **ROADMAP_RESEQUENCING_RECOMMENDED** | **YES** (see programme brief) |

**COMPETITION_MODES =** `GROUP_MIX_ONLY` \| `KNOCKOUT_ONLY` \| `GROUP_PLUS_KNOCKOUT`

**GROUP_MIX_GENERATORS =** `ROUND_ROBIN` \| `SMART_MIX`

**CURRENT_ROUND_ROBIN_MEETINGS_PER_OPPONENT = 1** — **PRODUCT = 1:n** — **ROUND_ROBIN_EXTENSION_REQUIRED = YES**

### Tournament phase architecture

`TournamentFixture.stageKey` evolves to **`TournamentPhaseContract`** (`stageKey`, `kind`, generator strategy). Durable `TournamentPhase` table **deferred** until Group+KO implementation — no parallel stage concept.

### Feasibility generalization

`validateFeasibilityFixtureSet` checks structural validity only (participants known, no self-play, unique round slots) — **not** generator type. Unresolved knockout qualification fixtures: future feasibility may reserve time/resource slots; participant-rest feasibility may depend on qualification paths (documented, not faked in 01D).

### Schema (01D-R2)

| Property | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **YES** |
| **NEW_MIGRATION** | **YES** — `20261016180000_sce_tournament_planner_01d_r2_participant_identity` |
| **Change** | Drop unique `(eventId, teamId)` — enable multiple tournament participants per canonical Team |

### Creator / UX freeze (R2)

| Flag | Value |
| --- | --- |
| **PROGRAMME_BEHAVIOUR_CHANGED** | **NO** |
| **TOURNAMENT_CARD_CHANGED** | **NO** |
| **MATCH_CARD_CHANGED** | **NO** |
| **USER_VISIBLE_UI_CHANGED** | **NO** |
| **PRODUCT_NAVIGATION_CHANGED** | **NO** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |

---

## 01D-R3 — Closure readiness

| Flag | Value |
| --- | --- |
| **01D_CAN_CLOSE_BEFORE_FUTURE_GENERATORS** | **YES** |
| **FEASIBILITY_REQUIRES_ROUND_ROBIN_SOURCE** | **NO** |
| **REST_IDENTITY** | **TOURNAMENT_PARTICIPANT_ID** |
| **GENERATOR_KEY_IS_ROUND_ROBIN_LOCKED** | **NO** (`round-robin:…` today; future namespaces e.g. `smart-mix:`, `group:`, `knockout:`) |
| **DURABLE_PHASE_TABLE_REQUIRED_FOR_01D** | **NO** |
| **FUTURE_PHASE_MIGRATION_PATH_DEFINED** | **YES** (`TournamentPhaseContract` / `stageKey` on fixtures) |
| **SIDE_A_B_CURRENTLY_NEUTRAL** | **YES** |
| **HOME_AWAY_NOT_INFERRED_FROM_SIDE_ORDER** | **YES** |
| **TECHNICAL_LIMIT_REQUALIFICATION_PACKAGE** | **01M** |

### 01D close criteria (generator-agnostic)

01D may merge **before** Smart Mix, groups, or knockout generators when:

- Feasibility validates and schedules **concrete** `TournamentFixture` rows by `sideAParticipantId` / `sideBParticipantId` only.
- No inspection of `generatorKey` or round-robin provenance is required for correctness.
- Rest and exclusivity constraints key on **tournament participant ids** (same source `teamId` → independent rows).
- Scheduler grid uses **TournamentPitch** + **TournamentBreak** only (not `FacilityResource` as pitch).
- Unresolved knockout sides have a documented extension path (below) without faking participant ids in 01D.

### Unresolved knockout / qualification (future)

| Feasibility layer | Meaning |
| --- | --- |
| **STRUCTURAL_CAPACITY_FEASIBILITY** | Fixture exists with duration and pitch demand; time/resource slots can be reserved even when participant ids are unknown (e.g. Winner QF1 vs Winner QF2). |
| **PARTICIPANT_PATH_FEASIBILITY** | Participant-rest and dependency correctness uses **qualification paths** (`FixtureSideSourceContract`, `QualificationReference`) — not collapsed team or pretend participant ids. |

01D does not implement bracket resolution; current contracts do not block this extension.

### Migration chain (from STAGE `10dd0208…`)

Execution order on feature branch (tournament planner slice):

1. `20261016140000_sce_tournament_planner_01b_fixture_schedule_foundation` — fixtures, schedule versions, assignments (`facilityResourceId`)
2. `20261016160000_sce_tournament_planner_01d_r1_tournament_pitch_break` — pitches, breaks, assignment → `tournamentPitchId`
3. `20261016180000_sce_tournament_planner_01d_r2_participant_identity` — drop `@@unique([eventId, teamId])`

R1 assignment migration is safe **iff** zero assignment rows exist pre-migration (no user-facing scheduling yet). R2 is non-destructive index drop only.

### Participant uniqueness (tournament-local identity)

| Rule | Allowed |
| --- | --- |
| Same event + same **Team** | **YES** — multiple rows; distinguish via `displayName` |
| Same event + same **ExternalClub** | **YES** — multiple rows; distinguish via `displayName` |
| Same event + same **ExternalTeam** (historical) | **NO** — `@@unique([eventId, externalTeamId])` preserved |
| Duplicate **manualLabel** rows | **YES** — no DB uniqueness; free-text fallback only |

### Roadmap

Programme brief [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) **01D-R3** table is canonical; R2’s “01J/01K before 01D” presentation is **withdrawn**.
