# SCE-TOURNAMENT-PLANNER-01I — Manual adjustment + DnD + conflict validation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01I` |
| **Status** | **CURRENT — ready for PO UAT** |
| **Predecessor** | [`01H`](./SCE-TOURNAMENT-PLANNER-01H.md) — Planung workspace (**CLOSED / MERGED PR #868**) |
| **Next** | **01J** — Results + rankings + qualification progression (**NOT STARTED**) |

## Product goal

01I adds **controlled manual adjustment** on top of the generated schedule:

**GENERATE → REVIEW → optionally LOCK → MANUALLY ADJUST → VALIDATE IMMEDIATELY → optionally LOCK → PARTIALLY REGENERATE → REVIEW**

Manual adjustment changes **WHEN** and **WHICH TOURNAMENT PITCH** only. Fixture topology (WHO, groups, qualifiers) remains owned by the generator layer.

## Manual move contract

| Input | `TournamentManualAssignmentInput` |
| --- | --- |
| **Validate** | `validateTournamentManualAssignment` (pure) / `validateTournamentManualAssignmentForInput` (loaded) |
| **Apply** | `applyTournamentManualAssignment` |
| **API** | `POST /api/tournaments/[tournamentId]/planung/manual-move` (same contract for DnD + dialog) |
| **Revision** | `expectedRevision` required — stale → **409** `SCHEDULE.STALE_VERSION` |
| **Invalid candidate** | **422** + structured `diagnostics` + German primary `error` |

End time is **never** trusted from the client: derived from schedule version match duration (+ transition for resource occupancy).

## DnD semantics (desktop)

- Board: **time vertical**, **TournamentPitch horizontal** (not `FacilityResource`).
- Drag threshold reuses Planning Hub pointer gesture (`exceedsDragThreshold`).
- Drop target = grid cell `(rowAnchorUtc, tournamentPitchId)` from `TournamentPlanungTimeScale.rowAnchorsUtc` (01H time scale — **not** an arbitrary 15-minute grid).
- Moving `10:00–10:12` → row `10:15` preserves match duration → `10:15–10:27`.
- Break cells are hard-block drop targets (`BREAK_CONFLICT`).
- **MOVE ≠ LOCK** — manual moves do not create locks.

## Lock interactions (01G reused)

| Lock | Time change | Pitch change | DnD |
| --- | --- | --- | --- |
| **TIME** | No | Yes | Horizontal only |
| **PITCH** | Yes | No | Vertical only |
| **TIME_AND_PITCH** | No | No | Disabled |

## Accessible fallback

**Spiel verschieben** — dialog selects start anchor + TournamentPitch subject to lock dimensions. Same API/service as DnD.

## Mobile

Mobile timeline uses **Spiel verschieben** (no required DnD). Shared validation, persistence, revision, and locks.

## Conflict validation

Reuses **01D** `canPlaceFixtureOnSlot`, break intervals, tournament window, and **01F2** `satisfiesScheduleDependencies`. Categories align with 01G: `PITCH_OVERLAP`, `PARTICIPANT_OVERLAP`, `MINIMUM_REST`, `BREAK_CONFLICT`, `INVALID_TOURNAMENT_PITCH`, `QUALIFICATION_DEPENDENCY`, `OUTSIDE_TOURNAMENT_WINDOW`, plus `SCHEDULE_LOCK_VIOLATION`.

## Regeneration compatibility

Unlocked manually moved fixtures may change on **01G** partial regeneration. Locked dimensions remain fixed (unchanged 01G semantics).

## Schema

**SCHEMA_CHANGE = NO** — existing `TournamentFixtureAssignment` + revision + locks sufficient.

## Package boundary

Does **not** implement results engine, standings, live qualification resolution, or publication (01J+).

## Delivery markers

| Flag | Value |
| --- | --- |
| `MANUAL_TIME_ADJUSTMENT` | **YES** |
| `MANUAL_PITCH_ADJUSTMENT` | **YES** |
| `MANUAL_TIME_AND_PITCH_ADJUSTMENT` | **YES** |
| `DESKTOP_DND` | **YES** |
| `MOBILE_DND_REQUIRED` | **NO** |
| `ACCESSIBLE_MANUAL_MOVE_FALLBACK` | **YES** |
| `MANUAL_MOVE_AUTOMATICALLY_LOCKS` | **NO** |
| `STALE_MANUAL_MOVE_SILENTLY_OVERWRITES` | **NO** |
| `MANUAL_UAT_BY_CURSOR` | **SKIPPED_PO_OWNED** |

**Success marker:** `TOURNAMENT_PLANNER_01I_READY_FOR_PO_UAT`
