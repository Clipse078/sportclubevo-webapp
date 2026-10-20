# SCE Design System — DS-03 Legacy Migration Inventory

> **Package:** `SCE-DESIGN-SYSTEM-03` · **Gate:** DS-10 requires no unexplained legacy workspace/navigation patterns.

## LEGACY_MIGRATION_INVENTORY

| CURRENT_IMPLEMENTATION | ROUTES / DOMAIN | CLASSIFICATION | CANONICAL_TARGET | MIGRATION_PACKAGE | STATUS | NOTES |
| --- | --- | --- | --- | --- | --- | --- |
| `PersonDetailTabs` local tablist | `/dashboard/persons/[id]` | MIGRATE_IN_DS03 | `SceContextTabs` + `?tab=` | DS-03 | **DS03_DONE** | URL-first person workspace tabs |
| `RolesAdminTabs` underline row | `/dashboard/administration/roles/*` | MIGRATE_IN_DS03 | `SceContextTabs` + `tabRoutes` | DS-03 | **DS03_DONE** | Route-segment admin module |
| `PageBreadcrumbs` | Product-wide | CANONICAL_WITH_REFINEMENT | `SceBreadcrumbs` | DS-03 | **DS03_PARTIAL** | Alias retained |
| `WorkspaceBreadcrumbs` | `/dashboard/workspace` | MIGRATE_IN_DS03 | `SceBreadcrumbs` | DS-03 | **DS03_DONE** | Folder hierarchy |
| `CommunicationWorkspaceHeader` | `/dashboard/communication/*` | ALREADY_CANONICAL | `SceWorkspaceHeader` + `SceBreadcrumbs` | DS-03 | **DS03_DONE** | Visual reference preserved |
| `AdminSectionHeader` | Legacy admin pages | LEGACY_MIGRATE | `SceWorkspaceHeader` | DS-10 | DS10_REMAINING | Mechanical header migration |
| `TeamCockpitNav` | `/dashboard/teams/[teamId]/*` | DOMAIN_SPECIFIC_BUT_ALIGNED | Route tabs (exception) | DS-10 | **JUSTIFIED_EXCEPTION** | Team cockpit URL model |
| `ProgrammeViewSwitcher` | `/dashboard/mein-programm` | DOMAIN_SPECIFIC_BUT_ALIGNED | View mode switcher | DS-10 | **JUSTIFIED_EXCEPTION** | Not object context tabs |
| `BillingWorkspaceNav` | Billing | LEGACY_MIGRATE | `SceContextTabs` | DS-10 | DS10_REMAINING | |
| `CommunicationInboxToolbar` | Inbox filters | DOMAIN_SPECIFIC_BUT_ALIGNED | Toolbar filters | DS-10 | **JUSTIFIED_EXCEPTION** | Filter modes ≠ context tabs |
| `SceActivityComposerWorkflowNav` | Composer overlay | CANONICAL | `SceContextTabs` `localNavigation` | DS-03 | DS03_PARTIAL | Overlay local state |
| Activity detail navigation | Match/Training/Tournament/Event | CANONICAL | `SceContextTabs` | DS-01/03 | **DS03_DONE** | Arrow-key a11y implemented |

## Representative DS-03 adoptions

| Domain | Change |
| --- | --- |
| Mein Programm | `SceWorkspaceChrome` + breadcrumbs |
| Personen & Zugänge | `PersonDetailTabs` → `SceContextTabs` |
| Roles / Permissions | Layout + `SceContextTabs` route tabs |
| Communication | Canonical header/breadcrumb primitives (no layout clone) |
| Documents workspace | `WorkspaceBreadcrumbs` → `SceBreadcrumbs` |

## DS-10 obligation

`UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE = NO` — every row must reach **DS03_DONE**, **CANONICAL**, or **JUSTIFIED_EXCEPTION** before DS-10 closure.
