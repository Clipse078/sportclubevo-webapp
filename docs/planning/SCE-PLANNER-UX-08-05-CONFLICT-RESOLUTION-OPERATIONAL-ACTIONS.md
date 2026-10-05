# SCE-PLANNER-UX-08-05 — Conflict resolution & operational actions

**Status:** IN PROGRESS

**Human UAT:** RETEST / FINAL GARDEROBE FLOW REQUIRED (08-05R7)

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

## 08-05R4 — Adaptive Resource Availability for Large Clubs

### Human UAT finding (R3)

**PASS** for FCA / small-club compact inventory: immediate **Spielfeld-Verfügbarkeit** matrix (physical pitch rows, **Gesamt / A / B**, **Frei / Belegt / Teilweise**, **Aktuell · Konflikt**, **Empfohlen**) is operationally strong and must be preserved.

**Scalability finding:** a permanently expanded full matrix inside the manipulation modal does not scale for tenants with many facilities / pitches / dressing rooms. R4 adds a **presentation-only** adaptive contract; R2 availability derivation and R3 matrix semantics stay canonical.

### Presentation modes (deterministic)

Derived in `lib/planning-hub/manipulation-resource-availability-presentation.ts` from **physical group count** (`PlanningResourceGroup` rows — not raw Gesamt/A/B segment count):

| Mode | Physical groups | UX |
|------|-----------------|-----|
| `COMPACT_MATRIX` | 1–6 | R3 full matrix immediately (FCA) — no dominating search chrome |
| `GROUPED_MATRIX` | 7–12 | Best free alternatives + local search / **Nur freie** + full grouped matrix |
| `LARGE_INVENTORY` | 13+ | Best alternatives + search/filter + **collapsed site summaries** (expand for R3 cells) |

Thresholds live in `MANIPULATION_AVAILABILITY_PRESENTATION_POLICY` (tunable, not domain constants).

### Best alternatives

`pickBestManipulationAlternatives` — same transparent criteria as R2 `pickRecommendedManipulationResourceId`, up to **3** **AVAILABLE** targets (current excluded). Empty state: **Keine konfliktfreie Alternative für HH:MM–HH:MM**.

### Filtering & search

Local only (no API): facility name, resource name, segment label; optional **Anlage** `<select>` when multiple canonical `facilityName` buckets exist. **Nur freie** hides physical groups with no **AVAILABLE** segment (current resource summary stays visible when filters active).

### Group summaries

Collapsed site headers (large mode) show counts from the same availability entries: **N Plätze · X frei · Y teilweise · Z belegt** via `summarizeManipulationPhysicalGroups`.

### Multi-site / FACILITY-MODEL-01

Canonical inventory today: **tenant → Facility (facility record) → physical pitch group → segments (Gesamt/A/B)**. There is **no** separate Site/Anlage entity in the data model; R4 buckets presentation by existing `facilityName` only.

**Follow-up (no schema in #802):** FACILITY-MODEL-01 — explicit **Tenant → Site/Anlage → physical facility/pitch → resource segment** when product requires true multi-site hierarchy above Facility.

### Dressing rooms

Same presentation policy by physical dressing group count: compact list (small), alternatives + controls (medium/large), collapsible site sections (large). No Gesamt/A/B matrix for dressing rows.

### Occupied interaction (R4 tweak)

Occupied / partial cells use the **full cell** as the accessible occupancy-detail control (not a tiny **Details** link). **AVAILABLE** cells remain direct selection controls.

### Performance

Single in-memory `buildManipulationResourceAvailabilityList` per reservation window; filtering, search, summaries, and mode derivation are memoized client-side — **no per-group / per-cell API**.

### Test fixtures (automated only)

`lib/planning-hub/manipulation-availability-scale-fixtures.ts` — **small FCA-like (4)**, **medium (10)**, **large (24)** physical pitch groups (+ large dressing catalog). **Not seeded on STAGE.**

### Tests

- `manipulation-resource-availability-presentation.test.ts`
- `PlanningHubManipulationResourceAvailabilityBoard.r4.test.tsx`
- R3 board regression retained

### Status

**IN PROGRESS** — automated R4 coverage; **Human UAT not yet passed** (FCA compact matrix regression + end-to-end resolution on Preview).

## Regression hooks

`lib/planning-hub/__tests__/sce-planner-ux-08-05-conflict-resolution.test.ts` + `components/admin/planning-hub/__tests__/PlanningHubConflictResolutionHandoff.test.tsx` + existing 08-02/08-03/08-04 and conflict-attention tests.

## 08-05R5 — Applied resource mutation / read-after-write blocker

### Human UAT reproduction (08-05R4 PASS path)

Wochenplaner → **Prüfen** → Kunstrasen 2 A (Junioren F1 + F2) → **Spielfeld ändern** (F2) → Hauptfeld A → **Weiter** → „Keine neuen Ressourcenkonflikte“ → **Änderung übernehmen**.

Observed: confirm layer closed, conflict workspace unchanged (still Kunstrasen 2 A, same incident, **25 Konflikte**).

### Root cause

**A — apply never ran (primary):** `PlanningHubManipulationEditDialog` / activity schedule edit confirm called `onSubmitDraft` + `onClose()` only. That staged `confirmationDraft` in context but did **not** invoke the authoritative `handleConfirm` apply pipeline. Users could complete the visible confirm while **zero** canonical mutation executed.

**E — read-after-write / workspace (secondary):** `PlanningHubConflictWorkspaceDialog` reset `pendingResolutionRef`, feedback, filters, and selection whenever `incidents` changed (including post-`router.refresh()`), preventing success acknowledgement and stable incident reconciliation.

### DB truth (expected canonical model)

| Layer | Before F2 move | After successful F2 move |
|-------|----------------|---------------------------|
| TrainingSeries allocation | Kunstrasen 2 A (both teams default) | unchanged |
| F2 `TrainingSessionAllocation` | none (inherits series) | **Hauptfeld A** occurrence override (PITCH_HALL group) |
| F1 occurrence | Kunstrasen 2 A | unchanged |
| F2 sport time | 17:00–18:30 | unchanged |
| F2 dressing | unchanged | unchanged |

Conflict detection reads **effective** `pitchAllocations` on week items (not a separate persisted incident store).

### Fix

| Area | Change |
|------|--------|
| Apply handoff | Edit/schedule confirm → `applyConfirmationDraft` (same pipeline as DnD confirm): validate → mutate → `planner-revalidate` → `router.refresh()` |
| Training pitch move | Standardplan F2 occurrence move uses canonical `POST /api/training/planning-grid/reassign` (`scope: occurrence`) instead of silent client-only staging |
| Mutation contract | `applyStandardPlanSchedulerDraft` returns `{ applied, mutationKinds }`; throws when a requested change produces **zero** writes |
| Cache | `revalidatePlannerWeekPaths()` on training session allocation POST/DELETE, planning-grid reassign, and `POST /api/planning-hub/planner-revalidate` after hub apply |
| Workspace | Initialize conflict workspace only on **open**; reconcile selected incident by stable id when incidents rebuild; success feedback when incident count/item conflicts decrease |
| Failure UX | Apply errors stay on confirm layer (`applyError`); dialog does not close as success |

### Tests

- `lib/planning-hub/__tests__/sce-planner-ux-08-05-r5-read-after-write.test.ts`
- Updated `PlanningHubManipulationEditDialog.test.tsx` (confirm invokes apply, not stage-only)

### Facility integrity input (FACILITY-INTEGRITY-01)

No duplicate persisted incident entity; week read model is assembled from series + occurrence allocations + plan overrides. R5 reinforces that **occurrence overrides** must be written through the same services the weekplanner loader consumes (`session-allocation-service` / planning-grid reassign).

### Status

**IN PROGRESS** — automated R5 coverage added; **Human UAT retest required** (same Kunstrasen 2 A → Hauptfeld A scenario).

## 08-05R6 — Resource manipulation runtime date-type failure

### Human UAT reproduction (08-05R5 retest)

Same scenario as R5: Wochenplaner → **Prüfen** → Kunstrasen 2 A (Junioren F1 + F2) → **Spielfeld ändern** (F2) → Hauptfeld A → **Weiter** → „Keine neuen Ressourcenkonflikte“ → **Änderung übernehmen**.

Observed on Preview (Vercel):

- Confirm layer stayed open with **Speichern fehlgeschlagen.**
- `POST /api/planning-hub/resource-manipulation/validate` → **HTTP 500**
- Runtime: `TypeError: E.getTime is not a function`

R5 wiring (**authoritative apply reached validate**) and failure UX (**modal stays open**) **confirmed**.

### Root cause

| Boundary | Expected | Actual on confirm apply |
|----------|----------|-------------------------|
| Client draft / week state | `WeekplannerItem.startAt` / `endAt` as `Date` | `Date` in React |
| JSON request (`JSON.stringify(draftPayload)`) | ISO-8601 strings | ISO strings (correct transport) |
| API route (before R6) | Domain `Date` on items + draft | Draft instants revived; **`draft.item` and `allItems[*]` left as strings** |
| `projectItemWithDraft` → `buffersFromOccupancyInterval` | `activityStart` / `activityEnd` as `Date` | **`item.startAt` string** → `.getTime()` throws |

Exact failing call: `buffersFromOccupancyInterval` in `lib/planning-hub/scheduler/resource-occupancy-manipulation.ts` (lines 13–17), invoked from `projectItemWithDraft` when `timeTarget === "resourceOccupancy"` (canonical **MOVE_RESOURCE** / **RESIZE_*** / unchanged reservation window paths from **Planung ändern**).

**Weiter** did not hit the server validate route (client-only `evaluateManipulationConflicts` with in-memory `Date` objects); **Änderung übernehmen** re-validates on the server and exposed the defect.

### Transport contract (after R6)

| Layer | Contract |
|-------|----------|
| Transport DTO | ISO-8601 strings for all instants in JSON bodies |
| API boundary | `lib/planning-hub/manipulation-transport.ts` — validate + revive to `Date` |
| Domain | Planning helpers keep strong `Date` semantics (no `Date \| string` deep in logic) |

Applied on:

- `POST /api/planning-hub/resource-manipulation/validate`
- `POST /api/planning-hub/activity-rescheduling/validate` (shared `evaluateManipulationConflicts` path)

Invalid / missing instants → **400** with `Ungültiges Datum` (not HTTP 500).

### Tests

- `lib/planning-hub/__tests__/sce-planner-ux-08-05-r6-resource-manipulation-transport.test.ts` — client payload → `JSON.stringify` → route → MOVE_RESOURCE F2 scenario
- Extended `app/api/planning-hub/resource-manipulation/validate/__tests__/route.test.ts`

### Facility integrity input (unchanged)

Week read model still assembled from series + occurrence allocations + plan overrides; R6 does not expand into FACILITY-INTEGRITY-01.

### Status

**IN PROGRESS** — automated R6 coverage; **Human UAT pitch mutation PASS** (see 08-05R7).

### Human UAT (08-05R6 retest — PASS)

| Check | Result |
|-------|--------|
| Pitch mutation persisted (F2 → Hauptfeld A) | **PASS** |
| „Planung aktualisiert“ without manual refresh | **PASS** |
| F2 detail Anlage = Hauptfeld A | **PASS** |
| Sport time 17:00–18:30 unchanged | **PASS** |
| Garderobe E1 unchanged | **PASS** |
| Kunstrasen 2 A pitch incident disappeared | **PASS** |
| Conflict workspace rebuilt + selection reconciled | **PASS** |

Read-after-write / authoritative resource mutation blocker from R5–R6 is **resolved** for the pitch path.

## 08-05R7 — Conflict workspace resource-type clarity

### Human UAT finding

After R6 pitch resolution, the incident list was technically correct but operationally unclear: bare codes such as **E1**, **E2**, **E4** mixed with pitch names without strong resource-type semantics.

### Presentation (UX only)

| Area | Change |
|------|--------|
| Incident list primary line | Canonical category + resource label — e.g. **Garderobe E1**, **Spielfeld Kunstrasen 2 · B** |
| Secondary line | Overlap window · affected activities (unchanged structure) |
| Filter | **Alle Konflikte (n)**, **Spielfelder (x)**, **Garderoben (y)** — options omitted when count is zero |
| Search | Matches type label, canonical resource label, activity/team labels (local filter on incident list) |
| Detail panel | Unchanged strong contextual copy (no duplicate type noise) |

Helpers: `lib/planning-hub/conflict-workspace-presenters.ts`. **No** changes to `buildPlanningConflictIncidents`, identity, deduplication, or availability engine.

### Tests

- `lib/planning-hub/__tests__/sce-planner-ux-08-05-r7-conflict-workspace-presentation.test.ts`
- Extended `PlanningHubConflictResolutionHandoff.test.tsx` (list labels + filter counts)

### Status

**IN PROGRESS** — **Human UAT:** final shortened **Garderobe ändern** flow (E1 conflict → free room → apply without refresh).

## 08-05R8 — Prüfen workspace crash

### Human UAT failure

On authenticated PR **#802** Preview (feature head **146b7f7c**), **Wochenplaner → Prüfen** crashed the entire Planner page into the Next.js error boundary (“This page couldn’t load”).

**Human UAT:** **BLOCKED — R8 RETEST REQUIRED**

### Deployment / commit correlation

| Check | Value |
|-------|--------|
| Branch | `cursor/sce-planner-ux-08-05-conflict-resolution-operational-actions` |
| Local / origin / PR #802 `headRefOid` | **146b7f7c** (pre-R8) |
| Failure introduced | **08-05R7** filter UI (`buildConflictResolutionFilterOptions`) |
| Vercel Preview | Must be rebuilt from post-R8 push (same PR #802, new commit) |

Tester-visible Vercel log **~18:13** `POST …/resource-manipulation/validate` **500** `TypeError: *.getTime is not a function` is the **known R6-pre-fix** validate failure and is **not** the Prüfen open crash (~**18:42**). R8 does not change manipulation transport.

### Reproduction

1. Load week planner with conflicts (FCA-like week).
2. Dialog mounts with `open={false}` (default while workspace closed).
3. Click **Prüfen** → `open={true}`.

**Failure class:** **C** — rendering `PlanningHubConflictWorkspaceDialog` after open transition.

### Root cause

**React Rules of Hooks violation** in `PlanningHubConflictWorkspaceDialog.tsx`: R7 added `useMemo` / `useEffect` for kind-filter options **after** `if (!open) return null`. While closed, those hooks did not run; on **Prüfen**, React saw **more hooks than the previous render** and threw (page-level error boundary).

Not caused by conflict engine, incident construction, or `getTime` on filter sort (incidents already had `Date` instants client-side).

### Fix

- Move kind-filter `useMemo` / `useEffect` **above** the early `open` return (stable hook order for closed → open lifecycle).
- Harden `conflict-workspace-presenters.ts` for optional `facilityName` / `teamNames` (presentation-only fallbacks).

### Tests

- `PlanningHubConflictResolutionHandoff.test.tsx` — **open lifecycle (08-05R8)** (`open={false}` → `open={true}`).
- Extended `sce-planner-ux-08-05-r7-conflict-workspace-presentation.test.ts` — stale resource ref + empty `facilityName`.
- R6 transport + R5 apply tests unchanged (regression suite).

### Facility integrity

No new structural facility defect identified; crash was client hook ordering. Legacy label fallbacks (`facilityResourceName`) remain relevant for **FACILITY-INTEGRITY-01** read-model gaps.

### Status

**IN PROGRESS**

### Human UAT (next step after R8 deploy)

**FIRST TEST ONLY:** Wochenplaner → **Prüfen** — expect workspace opens, Garderobe/Spielfeld labels, filter counts, search; **no** page crash. **Stop** before Garderobe mutation until this passes.
