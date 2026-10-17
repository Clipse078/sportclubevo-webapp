# SCE-TOURNAMENT-PLANNER-01F2 — Automatic Schedule Optimiser

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01F2` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01F1`](./SCE-TOURNAMENT-PLANNER-01F1.md) — **CLOSED / ACCEPTED / MERGED** (PR **#865**) |
| **Status** | **CURRENT — ready for closure (01F2-R1)** |
| **Branch** | `cursor/sce-tournament-planner-01f2-automatic-schedule-optimiser` |
| **Next** | **01G** — Locks + partial regeneration |

## Product purpose

01F2 answers **WHEN** each fixture plays and **WHICH `TournamentPitch`** it uses, without changing fixture topology (WHO).

| Layer | Question |
| --- | --- |
| **Fixture generation (01E)** | WHO |
| **Smart Timing Advisor (01F1)** | WHAT timing is realistic |
| **Feasibility (01D)** | CAN it fit |
| **Schedule optimiser (01F2)** | WHEN + WHICH pitch |

## Pure module

`lib/tournament-scheduling/schedule-optimiser/`

| Export | Role |
| --- | --- |
| `optimiseTournamentSchedule` | `TournamentScheduleOptimisationInput` → `TournamentScheduleOptimisationResult` |
| `SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER` | Re-exported via 01F1 — lexicographic soft objectives |
| `HARD_CONSTRAINT_CATALOGUE` | Re-exported via 01D — H1–H12 |

**`OPTIMISER_PURE = YES`** — no persistence, no UI, no silent timing mutation.

**`SCHEDULE_PERSISTENCE_IMPLEMENTED = NO`** — `TournamentScheduleVersion` / `TournamentFixtureAssignment` remain the future explicit persistence service (01G+ handoff).

## Optimiser contract

### Input (`TournamentScheduleOptimisationInput`)

- Tournament window (UTC instants)
- Fixture set (may include unresolved qualification sides via `sideSources`)
- Tournament pitches + breaks
- Match / transition / minimum rest (same semantics as 01D — **not mutated** by optimiser)
- Optional locked assignments (structural only — full lock UX is 01G)

### Output (`TournamentScheduleOptimisationResult`)

| Field | Meaning |
| --- | --- |
| `status` | `OPTIMAL` \| `FEASIBLE_NOT_PROVEN_OPTIMAL` \| `INFEASIBLE_PROVEN` \| `UNRESOLVED` |
| `assignments` | One row per real fixture: pitch id, start, participant end, resource end |
| `objectiveMetrics` / `objectiveScore` | Lexicographic soft objective vector (final after bounded improvement when applicable) |
| `baselineObjectiveMetrics` | 01D witness objective vector before bounded improvement (`null` when exhaustive search used) |
| `hardConstraintValidationOk` | Post-validation against 01D executable constraints |
| `participantRestProofStatus` | From 01F1 (`PROVEN` \| `PARTIAL` \| `UNRESOLVED`) |
| `searchStats` | Candidate slots, nodes visited, complete assignments explored, bounded-improvement passes/evaluations |
| `optimalityNote` | Honest optimality semantics (see below) |

## Hard constraints

Hard constraints always dominate soft objectives (`HARD_CONSTRAINTS_DOMINATE_SOFT_OBJECTIVES = YES`).

Reuse 01D catalogue (`feasibility/constraints.ts`, candidate slots, break intervals, complete search bounds):

- H1–H12 as documented in [`SCE-TOURNAMENT-PLANNER-01D`](./SCE-TOURNAMENT-PLANNER-01D.md)
- Assignments target **`TournamentPitch`** only (`SCHEDULER_ASSIGNMENT_TARGET = TOURNAMENT_PITCH`)
- **`SCHEDULER_MUTATES_FIXTURE_TOPOLOGY = NO`**

Additional ordering rules (01F2):

| Rule | Enforcement |
| --- | --- |
| **WINNER_OF_FIXTURE** | Dependent fixture start ≥ source `resourceEndUtcMs` |
| **GROUP_RANK** | KO side waits until **all** fixtures in source `tournamentGroupId` complete |
| **BYE** | No fake BYE fixtures scheduled (`FAKE_BYE_SCHEDULE_ASSIGNMENTS = 0`) |

Unresolved qualification sides use structural participant placeholders (01F1); **no fabricated cross-fixture rest** (`GROUP_RANK_REST_FABRICATED = NO`, `WINNER_OF_FIXTURE_REST_FABRICATED = NO`).

## Soft objectives (lexicographic)

Canonical order from `SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER` (01F1):

1. Satisfy all hard constraints (gate)
2. Participant rest fairness (variance + minimum observed rest penalty)
3. Idle-gap quality (penalise excess wait beyond minimum rest)
4. Pitch distribution (usage variance across pitches)
5. Pitch-switch reduction (known participants only)
6. First/last slot fairness
7. Tournament span

**`SOFT_OBJECTIVE_COMPARISON = DETERMINISTIC_LEXICOGRAPHIC`** — **`OPAQUE_WEIGHTED_SCORE = NO`**.

## Search strategy

1. Run **`analyseTournamentFeasibility`** (01D) — if `INFEASIBLE`, return **`INFEASIBLE_PROVEN`** (no heuristic-only infeasible).
2. Generate the same **deterministic candidate-slot grid** as 01D.
3. **Complete optimisation search** when `fixtures.length ≤ EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES` (**6**) — enumerate feasible assignments on the 01D slot grid within `OPTIMISER_MAX_SEARCH_NODES`; may prove **`OPTIMAL`**.
4. **Large schedules** (`fixtures.length > 6`) within 01D bounds:
   - **Baseline:** first feasible witness via **`completeFeasibilitySearch`** (same deterministic slot order as 01D).
   - **Bounded improvement:** deterministic single-fixture relocation hill-climb on the candidate-slot grid (`bounded-improvement-search.ts`).
   - Accept a candidate only when **`compareScheduleObjectiveMetrics` < 0** (strict lex improvement).
   - Return **`FEASIBLE_NOT_PROVEN_OPTIMAL`** — never claim global optimality.
5. Validate assignments + dependency order.

| Constant | Value | Role |
| --- | --- | --- |
| `EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES` | **6** | Complete lex enumeration threshold |
| `OPTIMISER_MAX_SEARCH_NODES` | 750_000 | Exhaustive search node cap |
| `BOUNDED_IMPROVEMENT_MAX_PASSES` | 12 | Hill-climb passes (large schedules) |
| `BOUNDED_IMPROVEMENT_MAX_CANDIDATE_EVALUATIONS` | 80_000 | Alternative-slot evaluation cap |

**`LARGE_SCHEDULE_BOUNDED_OPTIMISATION_IMPLEMENTED = YES`**  
**`OPTIMISATION_BUDGET_DETERMINISTIC = YES`** — wall-clock is observed only, not a termination gate.  
**`FINAL_SCHEDULE_NOT_WORSE_THAN_BASELINE = YES`** — if no improving move is found, the witness is returned unchanged.  
**`HEURISTIC_ONLY_INFEASIBLE_OUTCOMES = 0`**.

## Optimality semantics

| Status | Meaning |
| --- | --- |
| **`OPTIMAL`** | Lexicographically optimal among **all** feasible assignments on the 01D discrete candidate-slot grid (complete enumeration within MVP limits) |
| **`FEASIBLE_NOT_PROVEN_OPTIMAL`** | Feasible schedule; exhaustive search node cap and/or large-schedule bounded improvement without optimality proof |
| **`INFEASIBLE_PROVEN`** | 01D lower-bound proof or complete search exhaustion with diagnostics |
| **`UNRESOLVED`** | Safety limits (fixtures/participants/pitches/candidate slots) prevent complete search |

**`HEURISTIC_SCHEDULE_PRESENTED_AS_PROVEN_OPTIMAL = NO`**.

## Timing handoff (01F1)

Optimiser consumes timing configuration as supplied. **`OPTIMISER_SILENTLY_MUTATES_TIMING_CONFIGURATION = NO`**. When configuration is infeasible, diagnostics remain available for Smart Timing Advisor recommendations.

## 01D / 01F1 reuse

| Component | Reused from |
| --- | --- |
| Feasibility analysis + proofs | `feasibility/analyse.ts` |
| Candidate slots + pitch availability | `feasibility/candidate-slots.ts`, `pitch-availability.ts` |
| Break intervals | `feasibility/break-intervals.ts` |
| Hard constraint checks | `feasibility/constraints.ts` |
| Search state + slot application | `feasibility/complete-search.ts` |
| Timing → feasibility mapping | `smart-timing/prepare-context.ts` |
| Soft objective order | `smart-timing/soft-objectives.ts` |

**`PARALLEL_FEASIBILITY_ENGINE_CREATED = NO`**  
**`PARALLEL_TIMING_ENGINE_CREATED = NO`**

## Performance (observed, 01F2-R1)

Automated observations (not product SLAs):

| Fixtures | Typical outcome | Notes |
| --- | --- | --- |
| 8 | `FEASIBLE_NOT_PROVEN_OPTIMAL`, bounded evals ≪ cap | Witness + relocation passes |
| 16 / 32 | Same, deterministic | Multi-pitch + all-pitch break + min rest |
| 64 / 128 | Feasible when window/slots permit | Bounded by `BOUNDED_IMPROVEMENT_MAX_CANDIDATE_EVALUATIONS` and existing `FEASIBILITY_MAX_*` guards |

Recorded in `searchStats.boundedImprovementEvaluations` / `boundedImprovementPasses` for qualification.

## Technical guards

No new product limits. Existing MVP caps (`FEASIBILITY_MAX_FIXTURES`, `FEASIBILITY_MAX_CANDIDATE_SLOTS`, etc.) unchanged.

**`SCHEMA_CHANGE = NO`**  
**`NEW_PRODUCT_LIMIT_INTRODUCED = NO`**

## Ownership

**`TOURNAMENT_PLANNER_SCOPE = TENANT_ORGANISED_TOURNAMENTS_ONLY`** — application services retain tenant guards; pure optimiser has no away-tournament bypass.

## 01G handoff

- Pure optimiser returns candidate assignments only.
- Persistence via existing `schedule-version-service` / `assignment-service` is **explicit** and deferred to 01G+.
- Locks + partial regeneration: **01G** (not implemented in 01F2).

## Programme position

| Package | Status |
| --- | --- |
| **01A–01F1** | **CLOSED** |
| **01F2** | **CURRENT** |
| **01G** | **NEXT** |
| **01H–01M** | Unchanged |

## Flags (closure target)

| Flag | Value |
| --- | --- |
| `OPTIMISER_PURE` | **YES** |
| `SCHEDULE_PERSISTENCE_IMPLEMENTED` | **NO** |
| `SCHEDULE_OPTIMISER_DETERMINISTIC` | **YES** |
| `LARGE_SCHEDULE_BOUNDED_OPTIMISATION_IMPLEMENTED` | **YES** |
| `BOUNDED_OPTIMISATION_STRATEGY` | **Deterministic single-fixture relocation hill-climb** |
| `FIXTURE_LOCKING_IMPLEMENTED` | **NO** |
| `PARTIAL_REGENERATION_IMPLEMENTED` | **NO** |
| `MANUAL_SCHEDULE_DND_IMPLEMENTED` | **NO** |
| `RESULTS_ENGINE_IMPLEMENTED` | **NO** |
| `USER_VISIBLE_UI_CHANGED` | **NO** |
