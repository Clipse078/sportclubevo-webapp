# SCE-TOURNAMENT-PLANNER-01I — Manual adjustment + DnD + conflict validation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01I` |
| **Status** | **CLOSED / ACCEPTED / MERGED** — PO final UAT **PASS** (PR **#869**); includes **01I-R1** build/type closure + **01I-R2** retrospective Creator stability + Termin-first order |
| **Predecessor** | [`01H`](./SCE-TOURNAMENT-PLANNER-01H.md) — Planung workspace (**CLOSED / MERGED PR #868**) |
| **Next** | **01J** — Results + rankings + qualification progression (**NEXT / NOT STARTED**) |

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

**Success marker:** `TOURNAMENT_PLANNER_01I_CLOSED_GREEN_BASELINE`

## 01I-R2 — Creator retrospective-edit stability + Termin-first step order (PO UAT #869)

**Finding A (blocker):** Retrospective edits (Teams, Pausen, cross-step navigation) could freeze the browser when Spielplan Smart Timing ran full fixture generation + dual `assessTournamentTiming` on **every** upstream draft change while the Spielplan panel stayed mounted but hidden.

**Root fix (state ownership):**

- Smart Timing remains **derived** — recommendations never write into planner timing except via **Empfehlung übernehmen**.
- Live Smart Timing derivation runs only when the **Spielplan** tab is active (`activeTab === "spielplan"`), not on Teams/Termin/Format/Pitch edits.
- Spielplan payload uses the memoized composer draft snapshot (no per-render `buildPayload()` churn).
- HOME/AWAY `homeAway` effect no longer clears organiser on unrelated duration-policy dependency churn.

**Finding B (PO order):** **Termin** is the first Creator step (foundational window for Smart Timing and pause date inheritance). Free direct tab navigation and whole-form validation are unchanged — not a locked wizard.

| Surface | Canonical step order |
| --- | --- |
| **HOME** | Termin → Teams → Turnierformat → Spielfelder → Spielplan → Ressourcen → Publikation → Übersicht |
| **AWAY** | Termin → Teams → Ressourcen → Publikation → Übersicht |

**Creator invariant:** Retrospective upstream edits must safely refresh **derived** feasibility/Smart Timing/fixture **estimates** without silent mutation of user timing/break values or schedule persistence in the Creator.

**Regression tests:** `lib/tournaments/__tests__/tournament-composer-creator-01i-r2.test.ts`

**Success marker (R2):** absorbed into PO UAT **PASS** + merge closure (PR **#869**)

## PO final UAT (closure)

| Field | Value |
| --- | --- |
| **PO_FINAL_UAT** | **PASS** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

Validated: manual adjustment (WHEN + TournamentPitch), desktop DnD, Spiel verschieben fallback, mobile explicit move, canonical conflict validation, schedule revision concurrency, 01G lock + partial regeneration compatibility (**MOVE ≠ LOCK**), Creator Termin-first order, retrospective upstream edits without browser freeze, Smart Timing derived-only (**Empfehlung übernehmen**).
