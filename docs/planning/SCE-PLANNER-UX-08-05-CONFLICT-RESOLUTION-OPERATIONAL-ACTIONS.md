# SCE-PLANNER-UX-08-05 — Conflict resolution & operational actions

**Status:** IN PROGRESS

**Human UAT:** NOT YET PASSED

**Base:** STAGE `aec52552837e5d789a6f8c5d95a0f05b522a2401` (08-01…08-04 merged)

**Branch:** `cursor/sce-planner-ux-08-05-conflict-resolution-operational-actions`

## Package title & objectives

Turn detected planning conflicts into an efficient, safe operational resolution workflow inside the Wochenplaner — without leaving the planning context. Reuses **08-02** resource manipulation and **08-03** activity rescheduling; **08-04** capability/authority model.

## Architecture diagnosis (pre-implementation)

### A. Conflict detection (canonical truth)

| Concern | Source |
|---------|--------|
| Pairwise pitch / dressing overlap | `lib/weekplanner/conflict-detection.ts` → `detectPairwiseWeekplannerConflicts` / `annotateWeekplannerConflicts` |
| Per-item markers | `WeekplannerItem.conflicts[]` (`WeekplannerConflict`) |
| Deduplicated operator incidents | `lib/planning-hub/conflict-attention.ts` → `buildPlanningConflictIncidents` |
| Server | Read model only — conflicts are **derived client-side** from week items (not persisted) |

### B. Conflict presentation (before 08-05)

| Surface | Role |
|---------|------|
| `PlanningHubConflictAttention` | Top summary + **Prüfen** |
| `AggregatedActivityInspectionDialog` | Simultaneous-activity cluster inspector |
| Calendar / resource cards | Conflict badges |
| `PlanningHubConflictSheet` | Legacy single-incident sheet (replaced by workspace in 08-05) |

### C. Existing operational pipelines (reused)

- **Termin ändern** — `PlanningHubManipulationContext.openActivityScheduleEditor` → 08-03 validate/apply
- **Planung ändern / Spielfeld / Garderobe** — `openManipulationEditor` / `openResourceEditorForConflict` → 08-02 validate/apply
- **Öffnen / Bearbeiten** — existing navigation + planning sheets

### D. Permissions

`deriveConflictResolutionCapabilities` + `manipulation-server-authorization` — no role-name gates.

### E. Re-evaluation

Successful mutation → `router.refresh()` → week re-loaded with `annotateWeekplannerConflicts` → counters and inspector update from canonical truth.

### F. Data model

No persisted `Conflict` entity — presentation contract in `lib/planning-hub/conflict-resolution.ts`.

## Conflict count semantics

- **Top summary / Prüfen / workspace list:** `buildPlanningConflictIncidents(week).length` — one incident per deduplicated resource overlap window (not per affected activity marker).
- **Aggregate inspector metric «Konflikte»:** count of activities with `conflicts.length > 0` (activity-centric cluster view — unchanged; AGGREGATION-01 may align later).

## Resolution architecture

- `PlanningHubConflictWorkspaceDialog` — operational workspace from **Prüfen**
- `PlanningHubConflictResolutionActions` — contextual actions per conflict block (workspace + aggregate inspector)
- `openResourceEditorForConflict` / `openActivityScheduleEditorForConflict` — perspective-independent entry into 08-02/08-03

## Supported resolution actions

| Action | Pipeline | When shown |
|--------|----------|--------------|
| Spielfeld ändern | 08-02 | Pitch overlap + resource permission |
| Garderobe ändern | 08-02 | Dressing overlap + resource permission |
| Termin ändern | 08-03 | Activity authority + domain permission |
| Öffnen | Navigation | View allowed |
| Bearbeiten | Planning sheet | Only when no more specific action applies |

## Deferred / out of scope

- Auto-scheduler, COLLAB-01 notifications, LIST-01 list redesign, AGGREGATION-01 mixed card parity

## Human UAT plan

See package brief §25 — authenticated Vercel Preview; scenarios A–H.

## Regression hooks

`lib/planning-hub/__tests__/sce-planner-ux-08-05-conflict-resolution.test.ts` + existing 08-02/08-03/08-04 and conflict-attention tests.
