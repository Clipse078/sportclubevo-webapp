# SCE-DS2-07F — Remaining workspaces migration

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-07F` |
| **Predecessor** | `SCE-DS2-07E` |
| **Target branch** | `STAGE` |
| **Assigned routes** | 44 |

## Result

Every route assigned to DS2-07F now renders canonical workspace chrome (`SceWorkspaceChrome`, `ListPagePattern`, `DetailPagePattern`, or `FormPagePattern`) with finance-style breadcrumbs. Vereinsleitung list and form routes use breadcrumbs rooted at **Vereinsleitung** (`/vereinsleitung`). Future-module placeholders share `FutureModulePageContent` inside `PageShell` + `ListPagePattern`. Aufgaben routes inherit the governance marker via `aufgaben/layout.tsx` (chrome composed in `AufgabenWorkspaceShell` and record clients).

Authenticated browser coverage for this package: **none**. All 44 routes are `IMPLEMENTED` on DS2-07G. None are `VERIFIED`.

## Architecture counts

| Architecture | Before | After |
| --- | ---: | ---: |
| CANONICAL | 170 | 214 |
| PARTIAL | 9 | 0 |
| LEGACY | 35 | 0 |

| Package | Before | After |
| --- | ---: | ---: |
| DS2-07F | 44 | 0 |
| DS2-07G | 170 | 214 |

Verified authenticated visual pages: **0 / 214**.

## Functional preservation

People & Access, Aufgaben/requirement workflows, Infoboard designer, Vereinsprogramm, club directory, Vereinsleitung governance entities, and future-module placeholders retain existing server and client behaviour. Permissions and tenant isolation are unchanged.

## Remaining backlog

| Package | Routes | Scope |
| --- | ---: | --- |
| DS2-07G | 214 | Authenticated visual/accessibility verification and closure |
