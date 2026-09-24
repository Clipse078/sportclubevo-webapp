# DASHBOARD-05 — Personal Attention + Meine Aufgaben

## Mission

Establish the canonical personal action layer for the SCE dashboard:

- **Benötigt meine Aufmerksamkeit** — bounded, authorized, personally actionable signals
- **Meine Aufgaben** — canonical open-task preview (assignee scope)

No parallel task system. No permission-as-relevance. No tenant-wide operational counts in the personal contract.

## Attention contract

| Field | Location |
|-------|----------|
| Loader | `loadDashboardPersonalWork()` → `loadDashboardPersonalWork` / `personal-attention/` |
| Public DTO | `PersonalAttentionItem` |
| Display limit | `DASHBOARD_PERSONAL_ATTENTION_DISPLAY_LIMIT` (8) |
| Aggregate fetch | `DASHBOARD_PERSONAL_WORK_AGGREGATE_LIMIT` (50) |
| Deep link | `deepLink` → canonical module routes (via personal-actions) |

### Sort

Reuses `sortPersonalActions()` (task urgency buckets + participation/requirement ordering).

### Dedupe / coordination

| Rule | Behavior |
|------|----------|
| Stable id | `dedupePersonalActionsById` in personal-actions foundation |
| Task overlap | Tasks in **attention** (overdue / due today) are **excluded** from Meine Aufgaben preview |
| Participation / requirements | Attention only; not duplicated as task rows |

### Count semantics

- **Attention KPI / header:** `totalCount` = authorized attention candidates after filter, before display cap
- **Meine Aufgaben KPI:** `countPersonalActions().taskActionable` (assignee-scoped open tasks)
- **Never** tenant-wide registration/news/meeting aggregates

## Source classification

| Source | Status | Notes |
|--------|--------|-------|
| TASK | **READY** | `taskPersonalActionSource` + `listMyTasks` assignee scope |
| PARTICIPATION | **READY** | `attendancePersonalActionSource`, guardian/self unchanged |
| REQUIREMENT | **READY** | `requirementPersonalActionSource` |
| MEETING_ACTION | **DEFER** | No explicit assignee-only contract for dashboard attention |
| REGISTRATION | **DEFER** | No personal responsibility model without assignee |
| NEWS_REVIEW | **DEFER** | No reviewer assignment field |
| PLANNING_CONFLICT | **DEFER** | No personal ownership contract in this phase |
| HELPER_GAP | **DEFER** | No canonical personal actionable contract |

## Personal relevance & authorization

Order per item:

1. Candidate from personal-actions adapters (relationship / assignee / obligation)
2. Domain authorization inside adapters (zero disclosure)
3. Attention filter (`isPersonalAttentionCandidate`)
4. DTO mapping (`mapPersonalActionsToAttentionItems`)

`resolvePersonalContext()` remains available for future context labels; team names come from action context when present.

**Club Admin:** broad permissions do **not** expand personal-actions sources; unrelated tenant items stay absent.

## UI components

| Component | Role |
|-----------|------|
| `PersonalAttention` | Attention list, i18n, a11y urgency text |
| `PersonalTasksPreview` | Task-only preview, i18n |
| `DashboardAttentionList` | **Legacy** — keep until DASHBOARD-06 removal |
| `MeineAufgabenWidget` | **Legacy** — superseded by `PersonalTasksPreview` in `ClubDashboardView` |

## Legacy replacement map

| Legacy | DASHBOARD-05 | DASHBOARD-06 |
|--------|--------------|--------------|
| `buildAttentionItems()` | Replaced for runtime data; function kept for tests | Remove call sites / strip |
| Tenant registration count in attention | Removed | Remove KPI strip cell |
| `DashboardAttentionList` data | Personal attention DTO | Final composition |
| KPI `Offene Anmeldungen` in personal strip | Removed | Full KPI strip redesign |

## Performance

- Single bounded `loadPersonalActions` fetch per dashboard request (shared with task preview)
- Parallel `countPersonalActions` for task KPI
- Removed unused tenant-wide news/meeting count queries from command-center fetch

## DASHBOARD-06 handoff

Ready canonical contracts:

- Personal welcome (existing)
- Schnellzugriff (DASHBOARD-04)
- Mein Programm / Mein Kalender (DASHBOARD-02/03)
- **Benötigt meine Aufmerksamkeit** (`PersonalAttention` + snapshot)
- **Meine Aufgaben** (`PersonalTasksPreview` + snapshot)

DASHBOARD-06: page hierarchy, demote club widgets, remove legacy Schnellaktionen / oversized KPI strip, responsive polish.

## Security test matrix (automated coverage)

Covered in `personal-attention/__tests__` and existing personal-actions sentinel suites:

- Assigned + authorized → visible
- Authorized without personal assignment → absent (club admin registration case)
- Cross-tenant isolation on loader args
- Attention count excludes non-urgent tasks
- Task preview excludes other users (via `listMyTasks` mocks in task-source tests)
