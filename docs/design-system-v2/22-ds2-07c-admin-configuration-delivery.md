# SCE-DS2-07C — Admin and configuration migration

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-07C` |
| **Predecessor** | `SCE-DS2-07B` (`d93bf2bb165bd9c15ea838789a8ba8f390d3156e`, PR #947) |
| **Target branch** | `STAGE` |
| **Assigned routes** | 41 |

## Result

Every route assigned to DS2-07C now renders canonical workspace chrome (`ListPagePattern`, `DetailPagePattern`, `FormPagePattern`, or `SceWorkspaceChrome`) with finance-style breadcrumbs, uppercase condensed page titles, and semantic tokens. Module workspaces that already had sibling navigation use one `SceContextTabs` row: commercial billing, registrations, platform roles/permissions, and organisation-unit records.

Redirect aliases `/dashboard/admin/users` and `/dashboard/admin/users/new` stay redirects. They were not part of the 41 visual assignments.

Authenticated browser coverage for this package: **none**. No safe authenticated session was available in this environment, and manual UAT was out of scope. All 41 routes are `IMPLEMENTED` on DS2-07G. None are `VERIFIED`.

## Architecture counts

| Architecture | Before | After |
| --- | ---: | ---: |
| CANONICAL | 64 | 105 |
| PARTIAL | 47 | 42 |
| LEGACY | 103 | 67 |

| Package | Before | After |
| --- | ---: | ---: |
| DS2-07C | 41 | 0 |
| DS2-07D | 38 | 38 |
| DS2-07E | 27 | 27 |
| DS2-07F | 44 | 44 |
| DS2-07G | 64 | 105 |

Verified authenticated visual pages: **0 / 214**.

## Route results

| URL pattern | Result | Verification gap |
| --- | --- | --- |
| `/admin` | IMPLEMENTED | No authenticated desktop, mobile, axe, or functional browser pass |
| `/dashboard/account` | IMPLEMENTED | Same gap |
| `/dashboard/admin` | IMPLEMENTED | Same gap |
| `/dashboard/admin/branding` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/contracts` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/contracts/[contractKey]` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/contracts/new` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/customers` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/customers/[customerKey]` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/customers/new` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/invoices` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/invoices/[invoiceKey]` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/invoices/new` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/operations` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/reconciliation` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/reconciliation/imports/[importKey]` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/settings` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/settings/legal-entities/[entityKey]` | IMPLEMENTED | Same gap |
| `/dashboard/admin/commercial/billing/settings/legal-entities/new` | IMPLEMENTED | Same gap |
| `/dashboard/admin/integrations/sfv` | IMPLEMENTED | Same gap |
| `/dashboard/admin/tenants` | IMPLEMENTED | Same gap |
| `/dashboard/admin/tenants/[tenantSlug]` | IMPLEMENTED | Same gap |
| `/dashboard/admin/tenants/new` | IMPLEMENTED | Same gap |
| `/dashboard/admin/users/[userId]` | IMPLEMENTED | Same gap |
| `/dashboard/org-units/[id]/edit` | IMPLEMENTED | Same gap |
| `/dashboard/org-units/[id]/history` | IMPLEMENTED | Same gap |
| `/dashboard/org-units/new` | IMPLEMENTED | Same gap |
| `/dashboard/permissions` | IMPLEMENTED | Same gap |
| `/dashboard/platform` | IMPLEMENTED | Same gap |
| `/dashboard/roles` | IMPLEMENTED | Same gap |
| `/dashboard/roles/[id]` | IMPLEMENTED | Same gap |
| `/dashboard/runtime` | IMPLEMENTED | Same gap |
| `/dashboard/seasons` | IMPLEMENTED | Same gap |
| `/dashboard/users` | IMPLEMENTED | Same gap |
| `/dashboard/users/[userId]` | IMPLEMENTED | Same gap |
| `/dashboard/users/new` | IMPLEMENTED | Same gap |
| `/tenant/[tenantSlug]/cockpit/registrations` | IMPLEMENTED | Same gap |
| `/tenant/[tenantSlug]/cockpit/registrations/[registrationId]` | IMPLEMENTED | Same gap |
| `/tenant/[tenantSlug]/cockpit/registrations/archiv` | IMPLEMENTED | Same gap |
| `/tenant/[tenantSlug]/cockpit/registrations/warteliste` | IMPLEMENTED | Same gap |

Genuinely VERIFIED pages in this package: **0**.

## Functional preservation

Authentication, permission gates, tenant resolution, CRUD forms, search, filters, and existing redirects are unchanged. Facility pitch and dressing-room behaviour was not in this assignment and was not modified. Team names on the waiting-list scope column use `SceTeamName` (presentation only).

## Remaining backlog

| Package | Routes | Scope |
| --- | ---: | --- |
| DS2-07D | 38 | Communication and website CMS |
| DS2-07E | 27 | Planning, matches, training, tournaments and events |
| DS2-07F | 44 | Vereinsleitung and remaining workspaces |
| DS2-07G | 105 | Authenticated visual/accessibility verification and closure |
