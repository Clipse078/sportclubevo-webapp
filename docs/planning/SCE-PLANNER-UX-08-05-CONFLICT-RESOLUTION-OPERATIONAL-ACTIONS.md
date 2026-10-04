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

## Human UAT (08-05R1)

| Scenario | Result | Notes |
|----------|--------|-------|
| A — Conflict workspace opens | **PASS** | Prüfen → workspace dialog |
| B — Pitch conflict selection | **PASS** | Kunstrasen 2 A / Junioren F1+F2 detail |
| C — Pitch resolution handoff (`Spielfeld ändern`) | **FAIL → fixed in 08-05R1** | See root cause below |

**Root cause (C):** `openResourceEditorForConflict` set `editTarget` correctly, but canonical **08-02** editors (`PlanningHubManipulationEditDialog` / confirm) rendered as inline `fixed z-50` layers **below** the portalled conflict workspace (`SceModalOverlay`, `z-index: 100`). The handoff ran with no visible UI.

**Correction (08-05R1):** Manipulation editors use `PlanningHubManipulationModalShell` → portalled `SceModalOverlay` with **elevated** stack layer (`z-index: 110`) so 08-02/08-03 open above the conflict workspace without a second editor implementation.

**Time presentation (UAT):** Activity header showed **sporting** time (`item.startAt`/`endAt`) while an unlabeled line showed **resource overlap** time from `PlanningConflictIncident` (occupancy windows). These differ when pitch buffers apply (e.g. sport 17:00–18:30 vs reservation 16:45–18:30). Detail panel now labels **Sporttermin** vs **Reservierung** explicitly.

**Status after 08-05R1:** Automated handoff + modal stacking regression tests added; **human re-test required** for C and dressing/time/open actions on Preview.

## 08-05R2 — Resource Availability Picker

### Human UAT finding

After 08-05R1, **Spielfeld ändern → Planung ändern** handoff works, but the resource field was still a blind native `<select>`: coordinators could not see which pitches/rooms are free, occupied, conflicting, or recommended before clicking **Weiter**.

### Architecture

| Layer | Role |
|-------|------|
| Occupancy truth | Reuses `collectWeekplannerOccupiedResources` + `facilityResourcesShareConflictCapacity` + `resourceOccupancyWindowsOverlap` (same as `detectPairwiseWeekplannerConflicts`) |
| Derivation | `lib/planning-hub/manipulation-resource-availability.ts` — in-memory over current week items (excludes editing item), **no N+1 API** |
| UI | `PlanningHubManipulationResourceAvailabilityPicker` in canonical **08-02** `PlanningHubManipulationEditDialog` |
| Validation | Unchanged — **Weiter** still runs `evaluateManipulationConflicts` + server `/api/planning-hub/resource-manipulation/validate` |

### Availability semantics

- **AVAILABLE** → label **Frei**
- **PARTIAL** → **Teilweise belegt** (+ detail e.g. **Belegt ab HH:MM**) only when overlap does not cover the full requested reservation window
- **OCCUPIED** → **Belegt** (+ activity label and occupancy time, or **N Konflikte**)

States are derived only; nothing is persisted.

### Hierarchy (Gesamt / A / B)

Uses canonical pitch capacity rules from `lib/weekplanner/pitch-capacity-overlap.ts` (FULL↔HALF within one facility; independent HALF siblings do not block each other). Facility resource refs in the manipulation context now include `resourceType` via `weekplannerResourceRefFromFacilityOption`.

### Recommendation ranking (deterministic, informational)

1. **AVAILABLE** (not current)
2. Same `facilityId` as current resource
3. Same `resourceType` where possible
4. Stable order from `resourceOptions`

Badge **Empfohlen** — user must still explicitly select.

### Reservation time behavior

Picker evaluates **Reserviert ab / Reserviert bis** (effective reservation window from `resourceSegmentDisplayWindow`, including buffers). Changing times recomputes availability client-side. Sporting activity time is not mutated (`timeTarget: resourceOccupancy` unchanged).

### Reuse

Same model for **PITCH_HALL** and **DRESSING_ROOM** (`ManipulationResourceKind`); picker title switches **Spielfeld auswählen** / **Garderobe auswählen**.

### Accessibility

Listbox-style popover: keyboard open, arrow navigation, Enter select, Escape close, text labels always present (not color-only).

### Status

**IN PROGRESS** — automated coverage in `manipulation-resource-availability.test.ts`; **Human UAT not yet passed** for informed picker flow (pitch + Garderobe).

## 08-05R3 — At-a-glance Resource Availability Board

### Human UAT finding

R2 canonical availability architecture **accepted** (derivation, pitch hierarchy, states, recommendation, reservation reactivity, server validation). Human UAT of **Planung ändern** found availability still **primarily behind the resource picker** — coordinators saw *what* was wrong but not *where to move* without opening the dropdown.

**R2:** functional pass · **R2 UX:** needs R3 presentation.

### Architecture

| Layer | Role |
|-------|------|
| Truth | Unchanged — `manipulation-resource-availability.ts` (no second calculation) |
| Primary UI | `PlanningHubManipulationResourceAvailabilityBoard` — immediate pitch matrix / dressing list |
| Secondary UI | `PlanningHubManipulationResourceAvailabilityPicker` — compact selected resource, search, a11y fallback |
| Dialog | `PlanningHubManipulationEditDialog` — shared memoized availability entries for picker + board; reservation fields recompute board header and cells |

### Pitch board

- Header **Spielfeld-Verfügbarkeit** + **Für Reservierung HH:MM–HH:MM**
- Rows grouped by physical facility (`PlanningResourceGroup` / facility groups)
- Columns **Gesamt · A · B** when subdivided
- Cell text: **Frei**, **Belegt**, **Teilweise**, **Aktuell**, **Konflikt**, **Empfohlen**
- **Frei** / **Empfohlen** cells are direct selection controls; occupied details via focusable detail control (popover)

### Garderobe board

- **Garderoben-Verfügbarkeit** compact list (same canonical model, not a pitch matrix)

### Status

**IN PROGRESS** — `PlanningHubManipulationResourceAvailabilityBoard.test.tsx` + extended availability tests; **Human UAT not yet passed**.

## Regression hooks

`lib/planning-hub/__tests__/sce-planner-ux-08-05-conflict-resolution.test.ts` + `components/admin/planning-hub/__tests__/PlanningHubConflictResolutionHandoff.test.tsx` + existing 08-02/08-03/08-04 and conflict-attention tests.
