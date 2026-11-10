# SCE-DS2-07E — Planning activities migration

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-07E` |
| **Predecessor** | `SCE-DS2-07D` |
| **Target branch** | `STAGE` |
| **Assigned routes** | 27 |

## Result

Every route assigned to DS2-07E now renders canonical workspace chrome (`SceWorkspaceChrome`, `ListPagePattern`, `DetailPagePattern`, or `FormPagePattern`) with finance-style breadcrumbs, `Planung` eyebrow, and shared `PlanningActivitiesPageFrame` where appropriate. Management workspaces that previously duplicated headers accept `hidePlanningPageHeader` or `hidePageHeader` so page-level chrome is singular.

Quality closure (SCE-DS2-07E): record create/edit flows nested under `FormPagePattern` use `hideNavChrome` on record shells, `suppressPageChrome` / `suppressBackNav` on planning headers, and Veranstaltung create drops the inner `PlanningEditorHeader`. Governance scanners treat `PlanningActivitiesPageFrame` as a canonical marker.

Authenticated browser coverage for this package: **none**. All 27 routes are `IMPLEMENTED` on DS2-07G. None are `VERIFIED`.

## Architecture counts

| Architecture | Before | After |
| --- | ---: | ---: |
| CANONICAL | 143 | 170 |
| PARTIAL | 12 | 9 |
| LEGACY | 59 | 35 |

| Package | Before | After |
| --- | ---: | ---: |
| DS2-07E | 27 | 0 |
| DS2-07F | 44 | 44 |
| DS2-07G | 143 | 170 |

Verified authenticated visual pages: **0 / 214**.

## Functional preservation

Training series and session composers, match and tournament record workspaces, Veranstaltungen approval flows, legacy Events import, Wochenplaner and Wochenplan board logic, activity detail views, and planner edit flows retain existing server and client behaviour. Permissions and tenant isolation are unchanged.

## Remaining backlog

| Package | Routes | Scope |
| --- | ---: | --- |
| DS2-07F | 44 | Vereinsleitung and remaining workspaces |
| DS2-07G | 170 | Authenticated visual/accessibility verification and closure |
