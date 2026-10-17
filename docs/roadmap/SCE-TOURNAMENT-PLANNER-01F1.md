# SCE-TOURNAMENT-PLANNER-01F1 — Smart Timing Advisor + Scheduling Optimisation Foundation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01F1` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01E3D`](./SCE-TOURNAMENT-PLANNER-01E3D.md) — **CLOSED / ACCEPTED / MERGED** (PR **#864**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#865** → STAGE) |
| **Feature HEAD** | `dcb32db2b39097a479d6ecc6804065489423ae13` (R1 accepted) |
| **Branch** | `cursor/sce-tournament-planner-01f1-smart-timing-foundation` |
| **PR** | **#865** |
| **Next** | **01F2** — Automatic Schedule Optimiser implementation (**NEXT / NOT STARTED**) |

## Product purpose

01F1 introduces the **Smart Timing Advisor** — deterministic, explainable timing intelligence that reuses the **01D feasibility engine** (no parallel feasibility stack).

| Layer | Question |
| --- | --- |
| **Fixture generation (01E)** | WHO plays whom |
| **Smart Timing Advisor (01F1)** | WHAT timing is realistic |
| **Feasibility (01D)** | WHETHER the tournament can fit (hard constraints) |
| **Schedule optimiser (01F2+)** | WHEN + WHICH `TournamentPitch` |

## Pure module

`lib/tournament-scheduling/smart-timing/`

| Export | Role |
| --- | --- |
| `assessTournamentTiming` | `TournamentTimingInput` → `TournamentTimingAssessment` |
| `TournamentTimingMode` | `FORWARD` \| `BACKWARD` \| `FIXED_ASSESSMENT` |
| `recommendBackwardTimingDurations` | `{ mathematicalMaximum, operationalRecommendation }` |
| `recommendMathematicalMaximumTiming` | Tight integer-minute slot packing (oracle-verified) |
| `recommendOperationalMatchAndTransitionDurations` | Practical-grid operational policy |
| `SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER` | Lexicographic soft objectives contract (01F2) |
| `HARD_CONSTRAINT_CATALOGUE` | Re-export of 01D H1–H12 |

**`SCHEMA_CHANGE = NO`** — no persistence; recalculation is pure. **`recommendationsAutoApplied: false`** always.

## Time concepts (separate)

| Concept | Field / model |
| --- | --- |
| **MATCH_DURATION** | `matchDurationMinutes` |
| **TRANSITION_DURATION** | `transitionMinutes` |
| **MINIMUM_TEAM_REST** | `minRestMinutes` (resolved participants only) |
| **TOURNAMENT_BREAK** | `TournamentBreak` / `FeasibilityTournamentBreakRef` |
| **TOURNAMENT_WINDOW** | `[start, end)` instants |

Half-open interval semantics match **01D** (`[start, end)`). Touching break/fixture boundaries are allowed (fixture end == break start; fixture start == break end).

## Modes

### FORWARD

Known: start, durations, fixtures, pitches, breaks.  
Output: predicted finish, required span (`EXACT_WITNESS` when schedule witness exists), feasibility, reserve (when end boundary known).

**Final transition (forward arithmetic):** each fixture occupies one **resource slot** of `matchDuration + transitionDuration` minutes (**01D H9**). The predicted finish is the end of the last slot. There is **no additional unused transition** charged after the final fixture beyond the last slot’s transition component (`FINAL_UNUSED_TRANSITION_CHARGED = NO` in the sense of no extra post-schedule transition).

### BACKWARD

Known: start, end, fixtures, pitches, breaks.  
Output:

| Field | Meaning |
| --- | --- |
| `mathematicalMaximumTiming` | Tightest integer-minute `(match, transition)` verified by 01D |
| `durationRecommendation` | **Operational** practical-grid recommendation (see policy below) |

### FIXED_ASSESSMENT

Known: start, end, durations, fixtures, pitches, breaks.  
Output: fit/feasibility, structured adjustments, opportunities/nudges. When **INFEASIBLE**, emits backward mathematical + operational recommendations (not auto-applied).

## Recommendation policy (R1)

### A. Mathematical maximum

Deterministic integer search within structural per-fixture slot upper bound (effective capacity ÷ fixtures, capped by window × pitches ÷ fixtures):

1. Lexicographic maximise `matchDurationMinutes`, then `transitionMinutes`.
2. Each candidate must pass **`runTimingFeasibilityOracle`** (`FEASIBLE` \| `TIGHT`).

Example (1 pitch, 10:00–12:00, 8 fixtures, no breaks): **15 + 0** (120 ÷ 8 = 15-minute slots).

### B. Operational recommendation

Deterministic practical policy on `PRACTICAL_MATCH_DURATION_MINUTES` × `PRACTICAL_TRANSITION_MINUTES`:

1. Keep only oracle-feasible pairs.
2. **Zero-transition feasibility is allowed** mathematically but **not** the default operational choice when any feasible practical pair has `transitionMinutes > 0`.
3. Among the operational pool, lexicographic maximise match duration, then transition duration.

Same canonical example: operational **14 + 1** (longest practical match with a non-zero transition that still fits). **12 + 3** remains a valid fixed configuration (exact 120-minute fit) but is not selected over **14 + 1** by this lexicographic operational rule.

| Flag | Value |
| --- | --- |
| `MATHEMATICAL_MAXIMUM_DISTINGUISHED_FROM_RECOMMENDATION` | **YES** |
| `ZERO_TRANSITION_FEASIBILITY_ALLOWED` | **YES** |
| `ZERO_TRANSITION_DEFAULT_RECOMMENDATION` | **NO** (when non-zero operational pair exists) |
| `SMART_TIMING_RECOMMENDATIONS_AUTO_APPLIED` | **NO** |

## Canonical 8-match example

1 `TournamentPitch`, 10:00–12:00, 8 fixtures:

| Configuration | Result |
| --- | --- |
| **12 + 3** (fixed / forward) | 8 slots × 15 min = **120 min** → finish **12:00**, reserve **0** |
| **Backward mathematical** | **15 + 0** |
| **Backward operational** | **14 + 1** |

Cadence under 12 + 3 (slot stride 15 min from engine): 10:00, 10:15, 10:30, … last slot ending 12:00.

## Unresolved qualification / progression

`GROUP_RANK`, `WINNER_OF_FIXTURE`, and other qualification sides:

- Structural pitch/time assessment proceeds with per-fixture structural participant placeholders (**no fabricated cross-fixture rest**).
- **`participantRestProofStatus`**: `UNRESOLVED` \| `PARTIAL` \| `PROVEN`.
- Nudge **`UNRESOLVED_PARTICIPANT_REST`** prevents implying participant-rest proof where none exists.

## Required span semantics

| Kind | Meaning |
| --- | --- |
| **`EXACT_WITNESS`** | Finish derived from a feasible schedule witness |
| **`STRUCTURAL_LOWER_BOUND`** | Conservative bound when no witness finish is available |

Structural lower bounds are **not** presented as guaranteed schedule spans.

## TIGHT policy

**TIGHT** follows **01D** metrics using **effective playable capacity** after breaks, pitch availability, and hard constraints (`TIGHT_USES_EFFECTIVE_CAPACITY = YES`).

## Opportunities & adjustments

| Feature | Proof requirement |
| --- | --- |
| **Pitch count minimum** | Descending search with full oracle — no average-capacity-only claim |
| **Match duration increase** | Oracle verifies increased duration remains feasible |
| **Break opportunity** | Oracle verifies break can coexist — not inferred from reserve alone |
| **Structured adjustments** | Mapped from 01D suggestions only when justified |
| **Positive nudges** | Evidence-backed (`RESERVE_REMAINS`, `LONGER_MATCHES_POSSIBLE`, …) |

Heavy opportunistic proofs skip above **16 fixtures** for interactive bounds; core feasibility limits unchanged.

## Feasibility proof (01D reuse)

- Heuristic success may establish a witness.
- Heuristic failure alone does **not** establish `INFEASIBLE`.
- **`HEURISTIC_ONLY_INFEASIBLE_OUTCOMES = 0`** (regression contract).

## Soft objectives contract (01F2 handoff)

Lexicographic order preserved in `SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER`:

1. Hard constraints  
2. Participant rest fairness  
3. Idle-gap quality  
4. Pitch distribution  
5. Pitch-switch / movement reduction  
6. First/last slot fairness  
7. Tournament span  

**01F2 must not duplicate** 01D hard-constraint machinery or 01F1 timing assessment/recommendation contracts.

### 01F2 pure boundary (NOT STARTED)

**Input:** fixture set + `TournamentTimingAssessment` + locked assignments + same 01D config refs.  
**Output:** assignment schedule optimising soft objectives without mutating fixture topology.  
**Recommended next package:** `SCE-TOURNAMENT-PLANNER-01F2 — AUTOMATIC SCHEDULE OPTIMISER IMPLEMENTATION`.

## Performance (observed, R1)

Representative advisor workloads (8 / 16 / 32 / 64 / 128 fixtures, multi-pitch, break scenarios) complete in **sub-second to low-second** ranges locally/CI; no SLA claimed.

## Adoption

| Consumer | Status |
| --- | --- |
| **Tournament Creator** | **Required** — same engine (future UI) |
| **Tournament → Planung** | **Required** — same engine (future UI) |
| **01F2 Schedule Optimiser** | Builds on this contract |

## Programme position

| Package | Status |
| --- | --- |
| **01A–01E3D** | **CLOSED** |
| **01F1** | **CLOSED / ACCEPTED / MERGED** (PR **#865**) |
| **01F2** | **NEXT / NOT STARTED** |
| **01G–01M** | Unchanged |

## Decomposition

| Package | Scope |
| --- | --- |
| **01F1** | Smart Timing Advisor + optimisation foundation (this delivery) |
| **01F2** | Automatic Schedule Optimiser — assignments on `TournamentPitch` |

## Flags (closure)

| Flag | Value |
| --- | --- |
| `PARALLEL_FEASIBILITY_ENGINE_CREATED` | **NO** |
| `01D_COMPONENTS_REUSED` | **YES** |
| `USER_VISIBLE_UI_CHANGED` | **NO** |
| `SCHEDULER_MUTATES_FIXTURE_TOPOLOGY` | **NO** |
| `SCHEDULER_ASSIGNMENT_TARGET` | **TOURNAMENT_PITCH** |
| `TOURNAMENT_PLANNER_SCOPE` | **TENANT_ORGANISED_TOURNAMENTS_ONLY** |

## Closure notes (merged)

- PR **#865** merged to **STAGE** after R1 acceptance; feature HEAD **`dcb32db2b39097a479d6ecc6804065489423ae13`**.
- Manual UAT / screenshots: **PO-owned** (skipped in Cursor closure gate).
- **01F2** schedule optimiser: **NOT STARTED** — builds on this contract without duplicating 01D or 01F1 timing assessment.
