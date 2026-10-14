# SCE-ACTIVITY-CREATE-01I — Programme & Calendar Engine (Team + Club)

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01I` |
| **Status** | **IN PROGRESS** — implementation on branch `cursor/sce-activity-create-01i-programme-calendar-engine` |
| **Depends on** | **01H CLOSED** (World Activity Cards + planning surfaces) |
| **Next** | **Navbar Upgrade** (planned directly after 01I) → **01J** Dashboard + Mein Programm |

## Objective

One shared, scope-aware **Programme Engine** powers Team and Club programme/calendar experiences. Domain models and domain APIs remain authoritative — no generic Activity entity or `POST /api/activity`.

## Architecture

```text
queryProgramme(ProgrammeQueryInput)
  → loadProgrammeSourceItems(scope)
      TRAINING | MATCH | TOURNAMENT | CLUB_EVENT (domain reads)
  → applyProgrammeFilters (club multi-select)
  → sortProgrammeItems
  → ProgrammeItem[]
       ├─ ProgrammeListeView   (Sce*Card list-row)
       └─ ProgrammeCalendarView (same items, month grid)
```

### Scope model

| Scope | Status in 01I | Relevance |
|-------|---------------|-----------|
| `TEAM` | **Implemented** | Team season trainings/matches; tournament participation; Club Event audience (canonical, exact OrgUnit) |
| `CLUB` | **Implemented** | Tenant-wide aggregation + filters (teams, org units, activity type, temporal) |
| `PERSON` | **Extension point only (01J)** | Reuse engine with personal relevance rules — no UI in 01I |

### ProgrammeItem contract

Each item retains: activity kind, domain id, `SceActivityPresentationModel`, schedule, team/org context, status, canonical navigation target (`navigationTarget`), stable `id` (`KIND:domainId`).

### Permissions

Uses existing personal projection gates (`canIncludeEventInPersonalProjection`, `canIncludeTrainingSessionInPersonalProjection`) — programme queries do not bypass domain authorization.

### Date range

Default upcoming window: tenant-local today → +90 days (`PROGRAMME_DEFAULT_FORWARD_DAYS`). Past window: 30 days. Explicit `from`/`to` supported for 01J.

### Navbar boundary

01I adds minimal routes only (`/dashboard/programm`, Team Cockpit **Programm**). No FM26 / global navbar redesign (deferred Navbar Upgrade package).

## Routes

| Surface | Route |
|---------|-------|
| Team Programme | `/dashboard/teams/[teamId]/programm` |
| Club Programme | `/dashboard/programm` |

URL state: `ansicht=liste|kalender`, `zeitraum=kommend|vergangen`, `teams`, `org`, `typ`, `monat` (calendar).

## Automated validation

- `lib/programme-engine/__tests__/sce-activity-create-01i-programme-engine.test.ts`
- `lib/programme-engine/__tests__/programme-view-contract.test.ts`

## Manual UAT

| Field | Value |
|-------|-------|
| **OWNER_UAT** | **PENDING_PO_UAT** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
