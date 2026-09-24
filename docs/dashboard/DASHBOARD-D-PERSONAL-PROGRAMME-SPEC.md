# DASHBOARD-D — Mein Programm Spec

## Purpose

Chronological personal operational schedule replacing club-wide “Heute im Verein” as the centerpiece.

## Source domains

| Domain | Status in codebase | Projection module |
|--------|-------------------|-------------------|
| Training/Match/Tournament/OTHER events | Team-scoped query | `lib/personal-agenda/calendar-entries.ts` |
| Meetings | Participant userId | same |
| Task deadlines | Assignee userId | `task-projections.ts` |
| Participation deadlines | Guardian/self persons | `participation-projections.ts` |
| Requirements | personal-actions only today | Extend or surface via programme adapter |
| Helper assignments | Not in personal-agenda | Future adapter |

## Aggregation layer

**Canonical loader:** `loadPersonalAgenda()` in `lib/personal-agenda/load-personal-agenda.ts`

Modes:

- `dashboard` — today + tomorrow (+ overdue tasks lookback 90d)  
- `calendar` — month-visible range from `getPersonalKalenderVisibleRange`

**Dashboard target window (proposed):**

- Programme list: today through +14 days  
- Overdue tasks/participation: include with cap  
- Single loader invocation per page

### Deduplication

- Stable ids: `task:{id}`, `event:{id}`, `meeting:{id}`, participation composite ids.  
- Same entity must not appear twice if multiple relationships (pick primary context label).

### Sorting

1. Overdue flagged items first (tasks/participation).  
2. Chronological `startAt`.  
3. Title tie-break.

### Timezone

- Tenant timezone from `TenantFormatConfig` / active tenant.  
- Task deadlines: tenant-local noon anchor (existing task convention).  
- Calendar day keys: use tenant TZ for grouping (align PersonalKalender with `matchDayKeyInTimezone` pattern from matchcenter).

### Status / cancellation

- Events: respect cancelled/postponed statuses when modeled on `Event` (filter in projection — verify lifecycle fields in DASHBOARD-02).  
- Meetings: `status: PLANNED` (current).  
- Tasks: OPEN, IN_PROGRESS only.

### Context labels

Resolved in presentation layer from relationship resolver (DASHBOARD-01):

- Input: `{ personId, teamId, eventId, sourceType }`  
- Output: `contextLabel` string (see CONTRACT-MAP)

### Deep links

| Source | Href |
|--------|------|
| Event | `/dashboard/planner/edit/{eventId}` |
| Meeting | `/vereinsleitung/meetings/{slug}` |
| Task | `taskWorkspaceHref(id)` |
| Participation | `/dashboard/aufgaben?bereich=meine` |

### Authorization

**Critical gap:** `loadPersonalCalendarEntryProjections` filters by `teamId IN teamIds` without per-event visibility ACL.

Required in DASHBOARD-02:

- Invoke canonical event read guard per row OR batch visibility filter service.  
- Fail closed: skip row entirely.

Meetings and tasks already follow tighter scoping.

### Calendar integration

- **One dataset:** `PersonalCalendarItem[]` fetched once.  
- Dashboard embeds month view component; selecting day filters list client-side.  
- Full page remains at `/dashboard/kalender`.

### Empty state

- No linked person and no meetings/tasks: explain linking + permissions.  
- Linked person but no teams: show meetings/tasks only; suggest trainer assignment contact.

## Can aggregation avoid duplicating domain logic?

**Yes**, if:

- Projections remain **read-only selectors + DTO mapping**.  
- Match presentation (logos, opponents) reuses `command-center-presentation` helpers only when item authorized.  
- No business rules for training allocation, match state, etc. in dashboard layer.

## Performance bounds

| Parameter | Value |
|-----------|-------|
| Dashboard item cap | 12 (existing `DASHBOARD_PERSONAL_AGENDA_ITEM_LIMIT`) → propose 20 for programme |
| Calendar month range | Existing visible range helper |
| Parallel projections | Keep `Promise.all` in loader |
| Avoid | Second full `getCommandCenterData` club event queries for personal dashboard |

## Mapping to dashboard DTO

See `DashboardProgrammeItemDto` in CONTRACT-MAP.
