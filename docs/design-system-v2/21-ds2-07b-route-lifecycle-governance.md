# SCE-DS2-07B — Route lifecycle governance

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-07B` |
| **Predecessor** | `SCE-DS2-07A` |
| **Target branch** | `STAGE` |
| **Scope** | Governance infrastructure. No mass visual migration. |

Architectural adoption and visual verification are tracked separately. Importing `SceWorkspaceChrome` or passing a production build does not mark a page `VERIFIED`.

Authenticated browser coverage for this package: **none**.

## Discovered routes

| Classification | Count |
| --- | ---: |
| Page entries | 276 |
| Authenticated renderable pages | 221 |
| Authenticated visual pages (completion denominator) | 218 |
| Authenticated redirect aliases | 15 |
| Public renderable pages | 39 |
| Public redirect aliases | 1 |
| Route handlers | 634 |
| Special Next.js framework files | 40 |

Redirect aliases reference a destination and are excluded from visual completion. Public pages keep public design-system rules and are not forced into authenticated workspace chrome. Print documents are an approved semantic exception.

## Authenticated visual architecture

Counts below are authenticated renderable pages excluding approved exceptions. They describe architecture, not verification.

| Architecture | Count |
| --- | ---: |
| CANONICAL | 218 |
| PARTIAL | 0 |
| LEGACY | 0 |
| NOT_APPLICABLE | 0 |

Architectural canonical adoption: **218 / 218 (100%)**.

## Verification

| Migration status | Count |
| --- | ---: |
| NOT_STARTED | 0 |
| IN_PROGRESS | 0 |
| IMPLEMENTED | 218 |
| VERIFIED | 0 |
| EXCEPTION | 58 |

Verified authenticated visual pages: **0 / 218 (0%)**.

`IMPLEMENTED` means canonical workspace architecture is present. `VERIFIED` additionally requires recorded visual, accessibility, functional, and responsive evidence.

## Ownership

Unassigned authenticated visual routes: **0**.

| Package | Outstanding routes | Scope |
| --- | ---: | --- |
| DS2-07C | 0 | Admin and configuration |
| DS2-07D | 0 | Communication and website CMS |
| DS2-07E | 0 | Planning, matches, training, tournaments and events |
| DS2-07F | 0 | Vereinsleitung and remaining workspaces |
| DS2-07G | 218 | Authenticated visual/accessibility verification and closure |

Canonical pages that are not yet visually verified stay on DS2-07G. Legacy and partial pages stay on DS2-07C–F. Existing tracked debt does not fail CI.

## Exceptions

| Id | Routes |
| --- | ---: |
| SCE-DS2-07B-EX-PREVIEW | 14 |
| SCE-DS2-07B-EX-PRINT | 3 |
| SCE-DS2-07B-EX-PUBLIC | 25 |
| SCE-DS2-07B-EX-REDIRECT | 16 |

## Redirect aliases

| URL pattern | Destination | Source |
| --- | --- | --- |
| `/` | `/dashboard` | `app/page.tsx` |
| `/dashboard/admin/communications` | `/dashboard/communication/email-sender` | `app/(admin)/dashboard/admin/communications/page.tsx` |
| `/dashboard/admin/users` | `/dashboard/admin/people-access` | `app/(admin)/dashboard/admin/users/page.tsx` |
| `/dashboard/admin/users/new` | `/dashboard/admin/people-access/new` | `app/(admin)/dashboard/admin/users/new/page.tsx` |
| `/dashboard/finance/income_statement` | `/dashboard/finance/reports` | `app/(admin)/dashboard/finance/income_statement/page.tsx` |
| `/dashboard/planner` | `/dashboard/planner/week` | `app/(admin)/dashboard/planner/page.tsx` |
| `/dashboard/registrations` | `/tenant/:param/cockpit/registrations` | `app/(admin)/dashboard/registrations/page.tsx` |
| `/dashboard/registrations/archiv` | `/tenant/:param/cockpit/registrations/archiv` | `app/(admin)/dashboard/registrations/archiv/page.tsx` |
| `/dashboard/registrations/warteliste` | `/tenant/:param/cockpit/registrations/warteliste` | `app/(admin)/dashboard/registrations/warteliste/page.tsx` |
| `/dashboard/target-groups` | `/dashboard/communication/zielgruppen` | `app/(admin)/dashboard/target-groups/page.tsx` |
| `/dashboard/target-groups/[id]` | `/dashboard/communication/zielgruppen/:param` | `app/(admin)/dashboard/target-groups/[id]/page.tsx` |
| `/dashboard/target-groups/new` | `/dashboard/communication/zielgruppen/new` | `app/(admin)/dashboard/target-groups/new/page.tsx` |
| `/dashboard/teams/new` | `/dashboard/teams/register` | `app/(admin)/dashboard/teams/new/page.tsx` |
| `/dashboard/veranstaltungen/[eventId]` | `dynamic` | `app/(admin)/dashboard/veranstaltungen/[eventId]/page.tsx` |
| `/dashboard/website/news/[id]` | `/dashboard/website/news/:param/edit` | `app/(admin)/dashboard/website/news/[id]/page.tsx` |
| `/vereinsleitung/finanzen` | `dynamic` | `app/(admin)/vereinsleitung/finanzen/page.tsx` |

## Outstanding routes

### DS2-07C

None.

### DS2-07D

None.

### DS2-07E

None.

### DS2-07F

None.

### DS2-07G

| URL pattern | Architecture | Status | Priority | Source |
| --- | --- | --- | --- | --- |
| `/admin` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/admin/page.tsx` |
| `/dashboard` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/(personal-dashboard)/page.tsx` |
| `/dashboard/account` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/account/page.tsx` |
| `/dashboard/activity/event/[eventId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/activity/event/[eventId]/page.tsx` |
| `/dashboard/activity/training-session/[sessionId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/activity/training-session/[sessionId]/page.tsx` |
| `/dashboard/admin` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/page.tsx` |
| `/dashboard/admin/branding` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/branding/page.tsx` |
| `/dashboard/admin/commercial/billing` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/page.tsx` |
| `/dashboard/admin/commercial/billing/contracts` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/contracts/page.tsx` |
| `/dashboard/admin/commercial/billing/contracts/[contractKey]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/contracts/[contractKey]/page.tsx` |
| `/dashboard/admin/commercial/billing/contracts/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/contracts/new/page.tsx` |
| `/dashboard/admin/commercial/billing/customers` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/customers/page.tsx` |
| `/dashboard/admin/commercial/billing/customers/[customerKey]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/customers/[customerKey]/page.tsx` |
| `/dashboard/admin/commercial/billing/customers/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/customers/new/page.tsx` |
| `/dashboard/admin/commercial/billing/invoices` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/invoices/page.tsx` |
| `/dashboard/admin/commercial/billing/invoices/[invoiceKey]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/invoices/[invoiceKey]/page.tsx` |
| `/dashboard/admin/commercial/billing/invoices/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/invoices/new/page.tsx` |
| `/dashboard/admin/commercial/billing/operations` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/operations/page.tsx` |
| `/dashboard/admin/commercial/billing/reconciliation` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/reconciliation/page.tsx` |
| `/dashboard/admin/commercial/billing/reconciliation/imports/[importKey]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/reconciliation/imports/[importKey]/page.tsx` |
| `/dashboard/admin/commercial/billing/settings` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/settings/page.tsx` |
| `/dashboard/admin/commercial/billing/settings/legal-entities/[entityKey]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/settings/legal-entities/[entityKey]/page.tsx` |
| `/dashboard/admin/commercial/billing/settings/legal-entities/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/commercial/billing/settings/legal-entities/new/page.tsx` |
| `/dashboard/admin/facilities` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/facilities/page.tsx` |
| `/dashboard/admin/integrations` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/integrations/page.tsx` |
| `/dashboard/admin/integrations/sfv` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/integrations/sfv/page.tsx` |
| `/dashboard/admin/people-access` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/people-access/page.tsx` |
| `/dashboard/admin/people-access/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/people-access/new/page.tsx` |
| `/dashboard/admin/tenants` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/tenants/page.tsx` |
| `/dashboard/admin/tenants/[tenantSlug]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/tenants/[tenantSlug]/page.tsx` |
| `/dashboard/admin/tenants/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/tenants/new/page.tsx` |
| `/dashboard/admin/users/[userId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/admin/users/[userId]/page.tsx` |
| `/dashboard/administration/roles` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/administration/roles/page.tsx` |
| `/dashboard/administration/roles/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/administration/roles/[id]/page.tsx` |
| `/dashboard/administration/roles/assignments` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/administration/roles/assignments/page.tsx` |
| `/dashboard/administration/roles/effective-access` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/administration/roles/effective-access/page.tsx` |
| `/dashboard/administration/roles/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/administration/roles/new/page.tsx` |
| `/dashboard/aufgaben` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/aufgaben/page.tsx` |
| `/dashboard/aufgaben/[taskId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/aufgaben/[taskId]/page.tsx` |
| `/dashboard/aufgaben/[taskId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/aufgaben/@task/(.)[taskId]/page.tsx` |
| `/dashboard/aufgaben/anforderung/[recipientId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/aufgaben/anforderung/[recipientId]/page.tsx` |
| `/dashboard/aufgaben/anforderungen/[requirementId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/aufgaben/anforderungen/[requirementId]/page.tsx` |
| `/dashboard/aufgaben/anforderungen/neu` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/aufgaben/anforderungen/neu/page.tsx` |
| `/dashboard/aufgaben/neu` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/aufgaben/neu/page.tsx` |
| `/dashboard/aufgaben/serien/[seriesId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/aufgaben/serien/[seriesId]/page.tsx` |
| `/dashboard/aufgaben/serien/neu` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/aufgaben/serien/neu/page.tsx` |
| `/dashboard/communication` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/page.tsx` |
| `/dashboard/communication/email-sender` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/email-sender/page.tsx` |
| `/dashboard/communication/inbox` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/inbox/page.tsx` |
| `/dashboard/communication/inbox/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/inbox/new/page.tsx` |
| `/dashboard/communication/inbox/settings` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/inbox/settings/page.tsx` |
| `/dashboard/communication/kampagnen` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/kampagnen/page.tsx` |
| `/dashboard/communication/kampagnen/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/kampagnen/[id]/page.tsx` |
| `/dashboard/communication/kampagnen/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/kampagnen/new/page.tsx` |
| `/dashboard/communication/mitteilungen` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/mitteilungen/page.tsx` |
| `/dashboard/communication/mitteilungen/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/mitteilungen/[id]/page.tsx` |
| `/dashboard/communication/mitteilungen/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/mitteilungen/new/page.tsx` |
| `/dashboard/communication/personal-signature` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/personal-signature/page.tsx` |
| `/dashboard/communication/vorlagen` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/vorlagen/page.tsx` |
| `/dashboard/communication/vorlagen/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/vorlagen/[id]/page.tsx` |
| `/dashboard/communication/vorlagen/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/vorlagen/new/page.tsx` |
| `/dashboard/communication/zielgruppen` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/zielgruppen/page.tsx` |
| `/dashboard/communication/zielgruppen/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/zielgruppen/[id]/page.tsx` |
| `/dashboard/communication/zielgruppen/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/communication/zielgruppen/new/page.tsx` |
| `/dashboard/competitions` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/competitions/page.tsx` |
| `/dashboard/dev/sce-icons` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/dev/sce-icons/page.tsx` |
| `/dashboard/events` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/events/page.tsx` |
| `/dashboard/events/import` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/events/import/page.tsx` |
| `/dashboard/events/matches/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/events/matches/new/page.tsx` |
| `/dashboard/events/other/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/events/other/new/page.tsx` |
| `/dashboard/events/tournaments/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/events/tournaments/new/page.tsx` |
| `/dashboard/events/trainings/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/events/trainings/new/page.tsx` |
| `/dashboard/finance` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/page.tsx` |
| `/dashboard/finance/actuals` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/actuals/page.tsx` |
| `/dashboard/finance/budget` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/budget/page.tsx` |
| `/dashboard/finance/commitments` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/commitments/page.tsx` |
| `/dashboard/finance/commitments/approvals` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/commitments/approvals/page.tsx` |
| `/dashboard/finance/forecast` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/forecast/page.tsx` |
| `/dashboard/finance/forecast/scenarios` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/forecast/scenarios/page.tsx` |
| `/dashboard/finance/forecast/scenarios/[scenarioId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/forecast/scenarios/[scenarioId]/page.tsx` |
| `/dashboard/finance/forecast/timing` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/forecast/timing/page.tsx` |
| `/dashboard/finance/publishing` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/publishing/page.tsx` |
| `/dashboard/finance/reports` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/reports/page.tsx` |
| `/dashboard/finance/settings` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/settings/page.tsx` |
| `/dashboard/finance/structure` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/finance/structure/page.tsx` |
| `/dashboard/formulare-freigaben` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/formulare-freigaben/page.tsx` |
| `/dashboard/helfereinsaetze` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/helfereinsaetze/page.tsx` |
| `/dashboard/infoboard` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/infoboard/page.tsx` |
| `/dashboard/infoboard/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/infoboard/[id]/page.tsx` |
| `/dashboard/infoboard/preview` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/infoboard/preview/page.tsx` |
| `/dashboard/kalender` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/kalender/page.tsx` |
| `/dashboard/logs` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/logs/page.tsx` |
| `/dashboard/matchcenter` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/matchcenter/page.tsx` |
| `/dashboard/matchcenter/[matchId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/matchcenter/[matchId]/page.tsx` |
| `/dashboard/matchcenter/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/matchcenter/new/page.tsx` |
| `/dashboard/mein-programm` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/mein-programm/page.tsx` |
| `/dashboard/mitglieder` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/mitglieder/page.tsx` |
| `/dashboard/notifications` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/notifications/page.tsx` |
| `/dashboard/org-units` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/org-units/page.tsx` |
| `/dashboard/org-units/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/org-units/[id]/page.tsx` |
| `/dashboard/org-units/[id]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/org-units/[id]/edit/page.tsx` |
| `/dashboard/org-units/[id]/history` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/org-units/[id]/history/page.tsx` |
| `/dashboard/org-units/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/org-units/new/page.tsx` |
| `/dashboard/permissions` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/permissions/page.tsx` |
| `/dashboard/persons` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/persons/page.tsx` |
| `/dashboard/persons/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/persons/[id]/page.tsx` |
| `/dashboard/persons/[id]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/persons/[id]/edit/page.tsx` |
| `/dashboard/persons/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/persons/new/page.tsx` |
| `/dashboard/persons/settings/development-criteria` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/persons/settings/development-criteria/page.tsx` |
| `/dashboard/planner/day` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/planner/day/page.tsx` |
| `/dashboard/planner/edit/[eventId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/planner/edit/[eventId]/page.tsx` |
| `/dashboard/planner/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/planner/new/page.tsx` |
| `/dashboard/planner/week` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/planner/week/page.tsx` |
| `/dashboard/platform` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/platform/page.tsx` |
| `/dashboard/players` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/players/page.tsx` |
| `/dashboard/programm` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/programm/page.tsx` |
| `/dashboard/roles` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/roles/page.tsx` |
| `/dashboard/roles/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/roles/[id]/page.tsx` |
| `/dashboard/runtime` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/runtime/page.tsx` |
| `/dashboard/seasons` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/seasons/page.tsx` |
| `/dashboard/seasons/planner` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/seasons/planner/page.tsx` |
| `/dashboard/sponsoring` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/sponsoring/page.tsx` |
| `/dashboard/teams` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/page.tsx` |
| `/dashboard/teams/[teamId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/page.tsx` |
| `/dashboard/teams/[teamId]/administration` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/administration/page.tsx` |
| `/dashboard/teams/[teamId]/anwesenheit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/anwesenheit/page.tsx` |
| `/dashboard/teams/[teamId]/dokumente` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/dokumente/page.tsx` |
| `/dashboard/teams/[teamId]/kader` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/kader/page.tsx` |
| `/dashboard/teams/[teamId]/kommunikation` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/kommunikation/page.tsx` |
| `/dashboard/teams/[teamId]/programm` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/programm/page.tsx` |
| `/dashboard/teams/[teamId]/rangliste` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/rangliste/page.tsx` |
| `/dashboard/teams/[teamId]/resultate` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/resultate/page.tsx` |
| `/dashboard/teams/[teamId]/spiele` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/spiele/page.tsx` |
| `/dashboard/teams/[teamId]/teilnahmen` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/teilnahmen/page.tsx` |
| `/dashboard/teams/[teamId]/trainerteam` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/[teamId]/trainerteam/page.tsx` |
| `/dashboard/teams/provider-mapping` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/provider-mapping/page.tsx` |
| `/dashboard/teams/provider-mapping/[teamSeasonId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/provider-mapping/[teamSeasonId]/page.tsx` |
| `/dashboard/teams/provider-mapping/mapping/[mappingId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/provider-mapping/mapping/[mappingId]/page.tsx` |
| `/dashboard/teams/register` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/teams/register/page.tsx` |
| `/dashboard/tournamentcenter` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/tournamentcenter/page.tsx` |
| `/dashboard/tournamentcenter/[tournamentId]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx` |
| `/dashboard/tournamentcenter/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/tournamentcenter/new/page.tsx` |
| `/dashboard/trainer-staff` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/trainer-staff/page.tsx` |
| `/dashboard/trainers` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/trainers/page.tsx` |
| `/dashboard/training` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/training/page.tsx` |
| `/dashboard/training/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/training/new/page.tsx` |
| `/dashboard/training/series/[seriesId]/allocations` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/training/series/[seriesId]/allocations/page.tsx` |
| `/dashboard/training/series/[seriesId]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/training/series/[seriesId]/edit/page.tsx` |
| `/dashboard/training/sessions/[sessionId]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/training/sessions/[sessionId]/edit/page.tsx` |
| `/dashboard/users` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/users/page.tsx` |
| `/dashboard/users/[userId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/users/[userId]/page.tsx` |
| `/dashboard/users/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/users/new/page.tsx` |
| `/dashboard/veranstaltungen` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/veranstaltungen/page.tsx` |
| `/dashboard/veranstaltungen/[eventId]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx` |
| `/dashboard/veranstaltungen/freigaben` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/veranstaltungen/freigaben/page.tsx` |
| `/dashboard/veranstaltungen/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/veranstaltungen/new/page.tsx` |
| `/dashboard/vereine` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/vereine/page.tsx` |
| `/dashboard/vereine/[clubId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/vereine/[clubId]/page.tsx` |
| `/dashboard/vereine/[clubId]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/vereine/[clubId]/edit/page.tsx` |
| `/dashboard/vereine/[clubId]/merge` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/vereine/[clubId]/merge/page.tsx` |
| `/dashboard/vereine/[clubId]/teams/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/vereine/[clubId]/teams/new/page.tsx` |
| `/dashboard/vereine/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/vereine/new/page.tsx` |
| `/dashboard/vereine/teams/[teamId]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/vereine/teams/[teamId]/edit/page.tsx` |
| `/dashboard/vorfaelle-disziplin` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/vorfaelle-disziplin/page.tsx` |
| `/dashboard/website` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/page.tsx` |
| `/dashboard/website/blocks` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/blocks/page.tsx` |
| `/dashboard/website/components` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/components/page.tsx` |
| `/dashboard/website/components/[id]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/components/[id]/edit/page.tsx` |
| `/dashboard/website/components/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/components/new/page.tsx` |
| `/dashboard/website/design-system` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/design-system/page.tsx` |
| `/dashboard/website/editorial` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/editorial/page.tsx` |
| `/dashboard/website/homepage` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/homepage/page.tsx` |
| `/dashboard/website/media` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/media/page.tsx` |
| `/dashboard/website/navigation` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/navigation/page.tsx` |
| `/dashboard/website/news` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/news/page.tsx` |
| `/dashboard/website/news/[id]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/news/[id]/edit/page.tsx` |
| `/dashboard/website/news/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/news/new/page.tsx` |
| `/dashboard/website/pages` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/pages/page.tsx` |
| `/dashboard/website/pages/[id]/builder` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/pages/[id]/builder/page.tsx` |
| `/dashboard/website/pages/[id]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/pages/[id]/edit/page.tsx` |
| `/dashboard/website/pages/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/pages/new/page.tsx` |
| `/dashboard/website/publishing` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/publishing/page.tsx` |
| `/dashboard/website/review` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/review/page.tsx` |
| `/dashboard/website/settings` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/website/settings/page.tsx` |
| `/dashboard/wochenplan` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/wochenplan/page.tsx` |
| `/dashboard/workspace` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/workspace/page.tsx` |
| `/dashboard/workspace/audit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/workspace/audit/page.tsx` |
| `/dashboard/workspace/governance/break-glass` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/dashboard/workspace/governance/break-glass/page.tsx` |
| `/tenant/[tenantSlug]/cockpit/registrations` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/tenant/[tenantSlug]/cockpit/registrations/page.tsx` |
| `/tenant/[tenantSlug]/cockpit/registrations/[registrationId]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/tenant/[tenantSlug]/cockpit/registrations/[registrationId]/page.tsx` |
| `/tenant/[tenantSlug]/cockpit/registrations/archiv` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/tenant/[tenantSlug]/cockpit/registrations/archiv/page.tsx` |
| `/tenant/[tenantSlug]/cockpit/registrations/warteliste` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/tenant/[tenantSlug]/cockpit/registrations/warteliste/page.tsx` |
| `/vereinsleitung` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/page.tsx` |
| `/vereinsleitung/club-entwicklung` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/club-entwicklung/page.tsx` |
| `/vereinsleitung/finanzen/rechnungen` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/finanzen/rechnungen/page.tsx` |
| `/vereinsleitung/initiativen` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/initiativen/page.tsx` |
| `/vereinsleitung/initiativen/[slug]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/initiativen/[slug]/page.tsx` |
| `/vereinsleitung/initiativen/[slug]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/initiativen/[slug]/edit/page.tsx` |
| `/vereinsleitung/initiativen/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/initiativen/new/page.tsx` |
| `/vereinsleitung/kpis` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/kpis/page.tsx` |
| `/vereinsleitung/material` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/material/page.tsx` |
| `/vereinsleitung/meetings` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/meetings/page.tsx` |
| `/vereinsleitung/meetings/[slug]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/meetings/[slug]/page.tsx` |
| `/vereinsleitung/meetings/[slug]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/meetings/[slug]/edit/page.tsx` |
| `/vereinsleitung/meetings/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/meetings/new/page.tsx` |
| `/vereinsleitung/prozesse` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/prozesse/page.tsx` |
| `/vereinsleitung/prozesse/[slug]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/prozesse/[slug]/page.tsx` |
| `/vereinsleitung/prozesse/[slug]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/prozesse/[slug]/edit/page.tsx` |
| `/vereinsleitung/prozesse/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/prozesse/new/page.tsx` |
| `/vereinsleitung/targets` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/targets/page.tsx` |
| `/vereinsleitung/targets/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/targets/[id]/page.tsx` |
| `/vereinsleitung/targets/[id]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/targets/[id]/edit/page.tsx` |
| `/vereinsleitung/targets/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/targets/new/page.tsx` |
| `/vereinsleitung/templates` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/templates/page.tsx` |
| `/vereinsleitung/templates/[id]` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/templates/[id]/page.tsx` |
| `/vereinsleitung/templates/[id]/edit` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/templates/[id]/edit/page.tsx` |
| `/vereinsleitung/templates/new` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/templates/new/page.tsx` |
| `/vereinsleitung/vorhaben` | CANONICAL | IMPLEMENTED | Low | `app/(admin)/vereinsleitung/vorhaben/page.tsx` |

## Changes since the baseline

New routes introduced since the previous baseline: **0**.

None.

## CI

Blocking violations: **0**. Tracked existing debt: **0**.

Blocking codes cover unregistered pages, duplicate URLs, missing lifecycle reconciliation, non-canonical new authenticated pages, missing verification evidence, redirect aliases marked verified, and invalid package assignments. Tracked debt is reported and does not fail the job.

Regenerate with `node scripts/sce-ds2-06-route-inventory-scan.mjs`. Check with `node scripts/sce-ds2-07b-route-governance-check.mjs`.
