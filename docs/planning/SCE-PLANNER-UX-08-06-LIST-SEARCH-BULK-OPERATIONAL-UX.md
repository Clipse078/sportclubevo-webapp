# SCE-PLANNER-UX-08-06 — List / Search / Bulk Operational UX

**Status:** IN PROGRESS — **DRAFT PR #804** — Human UAT **REQUIRED** (08-06R1 corrections landed)

**Base:** `STAGE`

**Branch:** `cursor/sce-planner-ux-08-06-list-search-bulk-operational-ux`

---

## Purpose

Make the Wochenplaner **Liste** perspective a fast operational agenda aligned with Kalender / Spielfeld / Garderobe:

**WHEN → TYPE → ACTIVITY → RESOURCES → STATUS → ACTION**

No parallel activity model, conflict engine, or facility registry.

---

## Diagnosis (pre-08-06)

| Area | Before |
|------|--------|
| Layout | Flat four-column grid; type buried in title suffix |
| Conflicts | Large warning triangle dominated the row |
| Status | No operational readiness badge |
| Search | None (filters only via URL) |
| Row click | Opened planning **edit** sheet on Standardplan |
| Bulk | None |

---

## Architecture reused

| Concern | Canonical source |
|---------|------------------|
| Activity identity | `schedulerDisplayIdentity`, `ActivityTypePill`, `activityVisualStyle` |
| Resources | `schedulerResourceLabel`, `itemInspectionPitchLabel` / dressing labels |
| Filters | `applyPlanningHubFilters` + URL `typ` / `team` / `facility` / `konflikte` |
| Team filter keys | `lib/planning-hub/team-filter.ts` — canonical **TeamSeason** ids (not display labels) |
| Search haystack | Extends `aggregateInspectionSearchHaystack` |
| Conflicts | Item `conflicts[]`, `PlanningConflictIncident`, `PlanningHubConflictWorkspaceDialog` |
| Mutations | `PlanningHubManipulationContext` (schedule / resource editors) |
| Permissions | `deriveConflictResolutionCapabilities`, `canEditPlannerItem` — no role strings |
| Navigation | `getPlanningHubItemHref` |

### SCE-PLANNER-UX-LIST-01 reconciliation

`SCE-PLANNER-UX-LIST-01` was a **planned follow-up** discovered during 08-04 UAT. Its scope (operational agenda, search, filters, status, actions) is **absorbed into 08-06**. LIST-01 remains on the roadmap only as a **pointer** to 08-06 (not a second implementation).

---

## Implementation map

| Piece | Location |
|-------|----------|
| List logic (search, status, day heading) | `lib/planning-hub/list-operational.ts` |
| URL search `q` | `lib/planning-hub/planner-url.ts` |
| Liste toolbar (search + reset) | `components/admin/planning-hub/PlanningHubListeToolbar.tsx` |
| Operational rows | `components/admin/planning-hub/PlanningHubListeView.tsx` |
| Row actions menu | `components/admin/planning-hub/PlanningHubListeRowMenu.tsx` |
| Workspace wiring | `components/admin/planner/WeekPlannerWorkspace.tsx`, `WeekPlannerChrome.tsx` |

### Search contract

- Case-tolerant; canonical **display** labels (e.g. `Hauptfeld`, not `STADION_A`).
- Parent facility semantics: query `Hauptfeld` matches `Hauptfeld A` / `Hauptfeld B` via `facilityName`.
- Debounced client filter over the resolved week (no per-row API).

### Filter contract

Existing hub filters compose with search (intersection). **Filter zurücksetzen** clears `typ`, `team`, `facility`, `konflikte`, and `q`.

### Status contract

| Status | Label |
|--------|--------|
| No conflict, allocations OK | **Bereit** |
| Missing pitch/dressing | **Unvollständig** |
| Match end-time action | **Offen** |
| `conflicts.length > 0` | **Konflikt** (08-05 model) |

### Bulk decision (08-06R1)

- **No exposed multi-selection** in Liste — checkboxes and “Sichtbare auswählen” removed after Human UAT (false affordance without bulk writes).
- Architecture remains ready to reintroduce selection when the first real bulk operation exists.
- **Not implemented:** bulk mutations — no safe canonical server bulk write without bypassing validation/authority.

### Row interaction

- Primary click → **canonical activity detail** (`onItemOpen` / `getPlanningHubItemHref`).
- Mutations only via explicit row menu (Öffnen, Planung ändern, Termin/Spielfeld/Garderobe, Konflikt prüfen) when capabilities allow.
- Row menu uses collision-aware `PopoverContent` (flip/shift) **without** a clipped internal scroll viewport; action icons use existing semantic/resource tokens (supplementary colour, labels primary).

### Team + type filter (08-06R1)

- Team filter values are **TeamSeason ids** across Trainings, Spiele, Turniere, and Veranstaltungen.
- Matches expose `Event.teamSeasonId` on `WeekplannerMatchItem` so **Spiele + team** composes with training-derived team options (e.g. “FC Allschwil Senioren 40+” vs compact “Senioren 40+” display).

### Filtered empty state

- When the week has items but filters/search yield zero rows: **“Für die aktuellen Filter wurden keine Aktivitäten gefunden.”** plus **Filter zurücksetzen** (distinct from a genuinely empty week).

### Conflict integration

- Status badge + menu **Konflikt prüfen** opens existing `PlanningHubConflictWorkspaceDialog` with `focusIncidentId` when resolvable.

### Responsive / a11y baseline

- Stacked card rows (no wide table); sticky day headers; keyboard focus rings; search `aria-label`; type + status not color-only.
- **08-07:** tablet polish, clipped calendar card hover/focus detail (not absorbed here).

---

## Tests

- `lib/planning-hub/__tests__/sce-planner-ux-08-06-list-operational.test.ts`
- `lib/planning-hub/__tests__/team-filter.test.ts` (Spiele + Senioren 40+ regression)
- `components/admin/planning-hub/__tests__/PlanningHubListeView.test.tsx`
- `components/admin/planning-hub/__tests__/PlanningHubListeRowMenu.test.tsx`
- `lib/planning-hub/__tests__/planner-url.test.ts` (`q` round-trip)

---

## Human UAT checklist

| Scenario | Steps |
|----------|--------|
| A Scanning | Planung → Wochenplaner → Liste — day/time/type/activity/resources/status scannable |
| B Search | `Hauptfeld`, real team name |
| C Filter | type + facility + conflict — intersection |
| D Detail | Row opens detail, not silent edit |
| E Conflict | Konflikt prüfen → 08-05 workspace |
| F Permissions | Automated matrix; `MANUAL_READ_ONLY_UAT = BLOCKED_BY_PEOPLE_ACCESS_IMPERSONATION_01` |
| G Team filter | Spiele + FC Allschwil Senioren 40+ keeps the Senioren 40+ match |
| H Row menu | No clipped scroll; semantic icon colours |
| I Empty filter | Filtered-empty copy + reset vs empty week |

---

## Known limitations

- Search is client-side over the loaded week only (bounded planner read model).
- No SCE-PLANNER-UX-AGGREGATION-01 mixed-type summaries.
- Full responsive hardening deferred to **08-07**.

---

## Follow-ups

- **08-07** — responsive / tablet hardening, clipped-card hover+focus detail
- **08-08** — release hardening
- **SCE-PLANNER-UX-AGGREGATION-01**
- **FACILITY-INTEGRITY-01** remaining lifecycle (01A closed)
- **PEOPLE-ACCESS-IMPERSONATION-01**
