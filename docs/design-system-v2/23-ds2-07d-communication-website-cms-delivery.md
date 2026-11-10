# SCE-DS2-07D — Communication and website CMS migration

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-07D` |
| **Predecessor** | `SCE-DS2-07C` (`fbd3979909855effc92b00af0c9f5f4b63cd8ac6`, PR #948) |
| **Target branch** | `STAGE` |
| **Assigned routes** | 38 |

## Result

Every route assigned to DS2-07D now renders canonical workspace chrome (`SceWorkspaceChrome`, `ListPagePattern`, `DetailPagePattern`, or `FormPagePattern`) with finance-style breadcrumbs, uppercase condensed page titles, and semantic tokens. Communication routes keep `CommunicationContentSurface` and existing workflows. Website CMS routes share `WebsiteWorkspaceTabs` (`SceContextTabs`) on primary workspace surfaces.

Authenticated browser coverage for this package: **none**. No safe authenticated session was available in this environment. All 38 routes are `IMPLEMENTED` on DS2-07G. None are `VERIFIED`.

## Architecture counts

| Architecture | Before | After |
| --- | ---: | ---: |
| CANONICAL | 105 | 143 |
| PARTIAL | 42 | 12 |
| LEGACY | 67 | 59 |

| Package | Before | After |
| --- | ---: | ---: |
| DS2-07D | 38 | 0 |
| DS2-07E | 27 | 27 |
| DS2-07F | 44 | 44 |
| DS2-07G | 105 | 143 |

Verified authenticated visual pages: **0 / 214**.

## Functional preservation

Communication templates, targeting, draft/publish/scheduling, inbox workflows, email-sender configuration, personal signatures, and zielgruppen/vorlagen/kampagnen/mitteilungen business logic are unchanged. Website publishing, media, page builder, navigation, blocks, components, editorial/review queues, and settings forms retain existing server and client behaviour. Permissions and tenant isolation are unchanged.

## Remaining backlog

| Package | Routes | Scope |
| --- | ---: | --- |
| DS2-07E | 27 | Planning, matches, training, tournaments and events |
| DS2-07F | 44 | Vereinsleitung and remaining workspaces |
| DS2-07G | 143 | Authenticated visual/accessibility verification and closure |
