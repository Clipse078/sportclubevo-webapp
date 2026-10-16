# SCE-TOURNAMENT-PLANNER-01F1 — Smart Timing Advisor + Scheduling Optimisation Foundation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01F1` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01E3D`](./SCE-TOURNAMENT-PLANNER-01E3D.md) — **CLOSED / ACCEPTED / MERGED** (PR **#864**) |
| **Status** | **CURRENT / IN PROGRESS** (pure engine + contracts — no Planung UI) |
| **Branch** | `cursor/sce-tournament-planner-01f1-smart-timing-foundation` |
| **Next** | **01F2** — Automatic Schedule Optimiser implementation |

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
| `recommendMatchAndTransitionDurations` | Backward duration policy (practical whole-minute increments) |
| `SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER` | Lexicographic soft objectives contract (01F2) |
| `HARD_CONSTRAINT_CATALOGUE` | Re-export of 01D H1–H12 |

**`SCHEMA_CHANGE = NO`** — no persistence; recalculation is pure.

## Time concepts (separate)

| Concept | Field / model |
| --- | --- |
| **MATCH_DURATION** | `matchDurationMinutes` |
| **TRANSITION_DURATION** | `transitionMinutes` |
| **MINIMUM_TEAM_REST** | `minRestMinutes` (resolved participants only) |
| **TOURNAMENT_BREAK** | `TournamentBreak` / `FeasibilityTournamentBreakRef` |
| **TOURNAMENT_WINDOW** | `[start, end)` instants |

Half-open interval semantics match **01D** (`[start, end)`).

## Modes

### FORWARD

Known: start, durations, fixtures, pitches, breaks.  
Output: predicted finish, required span, feasibility, reserve (when end boundary known).

### BACKWARD

Known: start, end, fixtures, pitches, breaks.  
Output: recommended practical `matchDurationMinutes` + `transitionMinutes` (deterministic lexicographic policy: longest feasible practical match, then longest feasible practical transition).

### FIXED_ASSESSMENT

Known: start, end, durations, fixtures, pitches, breaks.  
Output: fit/feasibility, structured adjustments, optional backward recommendation when infeasible.

## Unresolved qualification / progression

`GROUP_RANK`, `WINNER_OF_FIXTURE`, and other qualification sides:

- **Structural** pitch/time assessment proceeds with per-fixture structural participant placeholders (no fabricated cross-fixture rest).
- **`participantRestProofStatus`**: `UNRESOLVED` \| `PARTIAL` \| `PROVEN`.

## Nudges & recommendations

Stable semantic codes (`TIME_WINDOW_TIGHT`, `EXTEND_END_TIME`, `RESERVE_REMAINS`, …).  
**Recommendations are never auto-applied** (`recommendationsAutoApplied: false`).

## Canonical 8-match example

1 `TournamentPitch`, 10:00–12:00, 8 fixtures, 12 min match + 3 min transition:

- Slot occupancy = **15 min** per fixture (match + transition, including final slot — **01D H9**).
- **8 × 15 = 120 min** → exact window fit.
- Backward policy may recommend **15 + 0** (longer match with zero transition) as the longest practical pair; **12 + 3** is also feasible under fixed assessment.

## Performance (observed)

Interactive recalculation on representative sizes (8 / 16 fixtures, multi-pitch) completes in **sub-second** ranges in CI.  
Opportunistic pitch-count / match-length proofs are skipped above **16 fixtures** to keep UI recalculation bounded; full 01D limits still apply.

## Adoption

| Consumer | Status |
| --- | --- |
| **Tournament Creator** | **Required** — same engine (future UI) |
| **Tournament → Planung** | **Required** — same engine (future UI) |
| **01F2 Schedule Optimiser** | Builds on this contract |

## Decomposition

| Package | Scope |
| --- | --- |
| **01F1** | Smart Timing Advisor + optimisation foundation (this delivery) |
| **01F2** | Automatic Schedule Optimiser — assignments on `TournamentPitch` |

## Flags

| Flag | Value |
| --- | --- |
| `PARALLEL_FEASIBILITY_ENGINE_CREATED` | **NO** |
| `01D_COMPONENTS_REUSED` | **YES** — candidate slots, breaks, complete search, metrics, status |
| `USER_VISIBLE_UI_CHANGED` | **NO** |
| `SCHEDULER_MUTATES_FIXTURE_TOPOLOGY` | **NO** |
