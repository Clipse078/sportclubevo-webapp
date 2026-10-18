# SCE-TOURNAMENT-PLANNER-01M — Integrity + Performance + Technical-Limit Requalification + Final Closure

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01M` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01L`](./SCE-TOURNAMENT-PLANNER-01L.md) — **CLOSED / ACCEPTED / MERGED** (PR **#872**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PO UAT **PASS**, merge to **STAGE**) |
| **PR** | **#873** — merged to **STAGE** |
| **Accepted feature HEAD (R1)** | `d6c26fd56c0dbe43715c5bad15b544a87145e1a1` |

## Product baseline preserved

- Primary output remains a **usable Spielplan**, not competition completion.
- **ONE canonical tournament schedule** → Planung / Master / Team / Print / PDF / Public.
- **01A–01L behaviour retained** (Home/Away, Pause/Sperrzeit, manual planning, outputs, HOME planner ownership).
- **No Tournament Planner 02** scope; no rotation / participant units / tournament stations.

## Integrity audit (summary)

| Area | Result |
| --- | --- |
| Identity / tenant / HOME ownership | Existing service-boundary checks retained; no new cross-tenant or cross-tournament defects found in 01M code paths |
| Schedule revision / locks / results separation | Unchanged 01G/01J contracts preserved |
| Duplicate canonical state | No parallel Team-Spielplan or output-local schedule truth introduced |

## Technical-limit requalification (01M changes)

| Limit | Class | Rationale |
| --- | --- | --- |
| `FEASIBILITY_COMPLETE_SEARCH_MAX_FIXTURES` (120) | ALGORITHM_THRESHOLD | Complete 01D backtracking proof budget |
| `FEASIBILITY_COMPLETE_SEARCH_MAX_PITCHES` (32) | PERFORMANCE_GUARD | Candidate-slot grid growth |
| `FEASIBILITY_COMPLETE_SEARCH_MAX_CANDIDATE_SLOTS` (500) | PERFORMANCE_GUARD | H9 complete-search cap |
| `EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES` (12) | ALGORITHM_THRESHOLD | Lexicographic exhaustive optimiser; larger → bounded improvement |
| `SMART_TIMING_HEAVY_OPPORTUNITY_MAX_FIXTURES` (16) | PERFORMANCE_GUARD | Skip heavy interactive scans; structural bounds still apply |
| `SMART_TIMING_PITCH_PROOF_SEARCH_MAX` (32) | ALGORITHM_THRESHOLD | Pitch-count binary search cap |
| `TOURNAMENT_*_TECHNICAL_MAX_FIXTURES` (2000) | SAFETY_GUARD | Generation memory/CPU ceiling |
| `MAX_VISIBLE_TOURNAMENT_LOGOS` (16) | LEGACY_ASSUMPTION | Dashboard avatar overflow UI only — not participant cap |

**Removed / corrected**

- **`FEASIBILITY_MAX_PARTICIPANTS = 16` as INFEASIBLE gate** — removed. Participant count is **not** a feasibility dimension.
- **Heuristic-only INFEASIBLE** for `SLOTS.TOO_MANY_CANDIDATES` and complete-search boundary → new feasibility status **`UNRESOLVED`** (tournament remains planable; generation/optimiser use deterministic fallbacks).

| Flag | Value |
| --- | --- |
| PARTICIPANT_LIMIT_IS_PRODUCT_RULE = NO | (no arbitrary participant product cap) |
| **ARBITRARY_PRODUCT_PARTICIPANT_MAX** | **NONE** |

Documented in `lib/tournament-scheduling/feasibility/constants.ts` and `bounds.ts`.

## Scale scenarios (automated)

| Participants | Format | Coverage |
| --- | --- | --- |
| 4, 8, 12, 16 | Smart Mix / Round Robin | `tournament-planner-01m-scale-integrity.test.ts` |
| 24, 32 | Smart Mix | Generation + identity invariants |
| 64 | Knockout | Larger bounded fixture set (63 matches) |
| 32 fixtures | Optimiser | Bounded improvement path within time budget |

## Performance audit (summary)

- No new optimiser calls from presentation layers.
- Removed redundant optimiser early-exit on participant count; optimiser still bounded by candidate-slot guard.
- Existing N+1 patterns not expanded in 01M diff.

## Schema / database

| Flag | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **NO** |
| **NEW_MIGRATION** | **NO** |
| **INDEX_CHANGES** | **NO** |
| **PROD_TOUCHED** | **NO** |

## Future extensibility (deferred — documented only)

| Concept | Implemented |
| --- | --- |
| E/FF12 Rotation | **NO** |
| Participant playing units (A1/A2) | **NO** |
| TournamentStation | **NO** |
| In-round rotation phases | **NO** |

**Future-safe today:** `TournamentParticipant` and logical `TournamentPitch` remain separable from `FacilityResource`. Fixture model is side-based (not hard-coded “one full team only forever”), but 01M does not add playing-unit persistence.

## Optimiser R1 correction (preserved at closure)

Lexicographic complete search is gated by **`shouldUseLexicographicCompleteSearch`** (`lib/tournament-scheduling/schedule-optimiser/search-mode.ts`):

- **≤6 fixtures:** complete lexicographic search (as implemented).
- **7–12 fixtures:** complete lex search only when the candidate grid is narrow (≤2 pitches, ≤24 candidate slots); otherwise 01D witness + deterministic bounded improvement.
- **>12 fixtures (within product optimiser ceiling):** bounded improvement — not fixture-count-only exhaustive enumeration.

| Flag | Value |
| --- | --- |
| **HEURISTIC_ONLY_INFEASIBLE_OUTCOMES** | **0** |
| **FALSE_INFEASIBILITY_FROM_PARTICIPANT_COUNT** | **NO** |
| **DETERMINISTIC** | **YES** |
| **BOUNDED_EXECUTION** | **YES** |

## Automated verification (final closure)

Command (Tournament Planner regression gate):

`npm test -- tournament-planner feasibility smart-timing schedule-optimiser partial-regeneration spielplan planung tournament-scheduling components/sce/tournament`

| Metric | Result |
| --- | --- |
| **Test files** | 113 passed \| 1 skipped |
| **Tests** | 701 total |
| **PASS** | 696 |
| **FAIL** | 0 |
| **SKIPPED** | 5 |

Also: `prisma validate`, `prisma generate`, production build (`NODE_OPTIONS=--max-old-space-size=8192`) — **PASS** at closure.

## PO UAT

| Flag | Value |
| --- | --- |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_ALREADY_PASSED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **PO_UAT_STATUS** | **PASS** |

## Programme outcome

| Flag | Value |
| --- | --- |
| **01M_STATUS** | **CLOSED / ACCEPTED / MERGED** |
| **SCE-TOURNAMENT-PLANNER-01** | **CLOSED / ACCEPTED / MERGED** (with **01M**) |
| **TOURNAMENT_PLANNER_02_STARTED** | **NO** |
