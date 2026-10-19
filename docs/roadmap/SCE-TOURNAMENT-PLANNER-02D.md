# SCE-TOURNAMENT-PLANNER-02D — Predefined Spielplan Templates & Instant Generation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02D` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-02`](./SCE-TOURNAMENT-PLANNER-02.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-02C`](./SCE-TOURNAMENT-PLANNER-02C.md) — **CLOSED / ACCEPTED / MERGED** (PR **#876**) |
| **Status** | **READY FOR PO UAT** |
| **Next package** | **02E** — Spielplan UX, Outputs & Final Hardening |

## Product objective

**PARTICIPATING TEAMS → PARTICIPANT COUNT → PREDEFINED SPIELPLAN TEMPLATE → PREDEFINED FELDER / ROUNDS / PAIRINGS → MAP REAL TEAMS TO SLOTS A… → APPLY EXISTING TIMING → SPIELPLAN READY**

| Flag | Value |
| --- | --- |
| **TEMPLATE_FIELD_COUNT_IS_AUTHORITATIVE** | **YES** |
| **OPTIMISER_REDECIDES_FIELD_COUNT** | **NO** |
| **PARALLEL_SCHEDULE_TRUTH_CREATED** | **NO** |
| **TP01_GENERATORS_PRESERVED** | **YES** (fallback when no template) |
| **EXTERNAL_BRANDING_COPIED** | **NO** |

## Template architecture

| Item | Choice |
| --- | --- |
| **TEMPLATE_MODEL** | `TournamentProgrammeTemplate` (`lib/tournament-scheduling/programme-templates/types.ts`) |
| **TEMPLATE_STORAGE** | **Code-backed versioned catalogue** (git + tests) |
| **VERSIONED** | **YES** (`id` + `version`) |
| **DATA_DRIVEN** | **YES** (typed registry, not participant-count switch) |
| **GIANT_COUNT_SWITCH** | **NO** |

Templates encode: participant slots, logical fields + optional `playersPerSide`, rounds, field assignments, break hints, optional operational hints (Kleinteam switch metadata only).

## Curated catalogue (evidence-based)

Approved **E/FF12 youth rotation** reference Spielpläne (maintainer `referenceDocumentId` only — not shown in UI):

| Count | Template id |
| --- | --- |
| 4 | `e-ff12-youth-rotation-4` |
| 5 | `e-ff12-youth-rotation-5` |
| 6 | `e-ff12-youth-rotation-6` |
| 7 | `e-ff12-youth-rotation-7` |
| 8 | `e-ff12-youth-rotation-8` |

| Flag | Value |
| --- | --- |
| **CURATED_TEMPLATE_COUNTS** | **4, 5, 6, 7, 8** |
| **MISSING_CURATED_TEMPLATE_COUNTS (initial 4–16 target)** | **9, 10, 11, 12, 13, 14, 15, 16** |
| **INITIAL_TARGET_RANGE** | **4–16** (architecture allows 17+) |
| **ARBITRARY_PRODUCT_PARTICIPANT_MAX** | **NONE** |
| **NO_TEMPLATE_FALLBACK** | **YES** — existing TP01 generator path |

## Participant mapping

| Flag | Value |
| --- | --- |
| **ABSTRACT_SLOTS** | **A…P** |
| **DETERMINISTIC_MAPPING** | **YES** — `displayOrder` asc, then participant id |
| **STABLE_MAPPING** | **YES** — persisted on `TournamentCompetitionConfiguration.programmeTemplateSlotMappingJson` |
| **SOURCE_TEAM_MUTATED** | **NO** |
| **PLAYING_UNIT_MODEL_REUSED** | **YES** (`TournamentParticipantUnit`, implicit FULL + split workflow) |
| **CAPACITY_RULES_REUSED** | **YES** (`doParticipantUnitsOverlapCapacity`) |

## Instantiation

| Item | Value |
| --- | --- |
| **INSTANTIATION_SERVICE** | `applyProgrammeTemplateToTournament` |
| **PURE_PLAN** | `instantiateProgrammeTemplate` |
| **CANONICAL_FIXTURES_CREATED** | **YES** (`TournamentFixture` + `TournamentFixtureSide.participantUnitId`) |
| **CANONICAL_TOURNAMENT_PITCHES_USED** | **YES** |
| **CANONICAL_BREAKS_USED** | **YES** (`TournamentBreak` after configured round) |
| **EXISTING_TIMING_REUSED** | **YES** (round-parallel deterministic schedule, no optimiser search) |
| **EXPENSIVE_OPTIMISER_REQUIRED** | **NO** |
| **LOCKS_RESPECTED** | **YES** — locked assignments block replace |
| **IDEMPOTENT** | **Replace requires explicit `replaceExisting`** |

## Persistence (additive)

Migration `20261019160000_sce_tournament_planner_02d_programme_templates`:

- `TournamentFixtureSide.participantUnitId` (optional FK)
- `TournamentCompetitionConfiguration.programmeTemplateId` / `programmeTemplateVersion` / `programmeTemplateSlotMappingJson`

| Flag | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **YES** (additive) |
| **DESTRUCTIVE_MIGRATION** | **NO** |
| **PROD_TOUCHED** | **NO** |
| **PERSISTENT_TEST_DATA** | **0** |

## UX (Planung fast path)

When participant count matches a curated template and no schedule exists:

- **Empfohlener Spielplan** panel (name, rounds, Felder, formats)
- Primary action **Spielplan erstellen** → `POST …/planung/instantiate-template`
- Field count shown as requirement (`Dieser Spielplan verwendet N Felder.`)
- If no template: message + existing **✨ Spielplan erstellen** optimiser path

| Flag | Value |
| --- | --- |
| **FAST_PATH_IMPLEMENTED** | **YES** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES** | **0** |

## Tests

Exact reference fixtures per encoded template, catalogue integrity, mapping, unit capacity, pitch formats, breaks, lock guard — see `lib/tournament-scheduling/programme-templates/__tests__/`.

## UAT

| Flag | Value |
| --- | --- |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **PO_UAT_REQUIRED** | **YES** |
