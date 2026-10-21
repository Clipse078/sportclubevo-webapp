# SCE-DESIGN-SYSTEM-10 — Product-wide migration matrix

**Machine-readable gate:** `SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX` in `lib/design-system/sce-design-system-10-meta.ts`.

DS-10 consumes DS-01–DS-09 inventories (primitive registry, workspace, cards, forms, actions, feedback, dense UI, responsive/a11y) and assigns every applicable surface a **final disposition**.

## Dispositions

| Disposition | Meaning |
| --- | --- |
| **MIGRATED_DS10** | Production UI migrated to canonical SCE primitives in DS-10 |
| **ALREADY_CANONICAL** | Aligned before DS-10 or reference surface (Communication, activity shells) |
| **DOMAIN_SPECIFIC_CANONICAL** | Purpose-built domain layout with shared SCE visual DNA |
| **EXPLICIT_ARCHITECTURE_EXCEPTION** | Documented IA exception (team cockpit URLs, mode switchers, inbox filters) |

`MIGRATE_LATER` is **not** used at DS-10 delivery.

## Counts (typed)

See `SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS` — reconciled on branch `cursor/sce-design-system-10-product-wide-adoption`.

## Representative DS-10 migrations

| Area | Change |
| --- | --- |
| Admin module headers | `AdminSectionHeader` → `SceWorkspaceHeader` bridge |
| Billing | `BillingWorkspaceContextTabs` (`SceContextTabs`) |
| Facilities | `SceWorkspaceChrome` + bounded information surface |
| Platform users | `SceDenseSurface` + `SceDenseList` |
| List pages | `ListPagePattern` → `SceBreadcrumbs` + `SceWorkspaceHeader` |
| Binary settings | Toggle First sweep (forms, composers, infoboard designer) |
| Billing API | Actionable 500 copy — no `Interner Fehler.` default |
| Aufgaben / Anforderungen | `AufgabenWorkspaceShell` + `SceContextTabs` (`?bereich=`), DS-07 load errors |
| Aufgaben R4.2 | One workspace: **Meine Aufgaben** \| **Verwaltung**; local filters for action types; `AufgabenWorkspaceCreateChooser` (`+ Erstellen`); per-recipient Anforderung aggregates in Verwaltung |

**Status:** `DS10_STATUS = PO_VISUAL_UAT_IN_PROGRESS` · `PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO` · **R4.2** unified Aufgaben workspace / action-type convergence (`SCE-DESIGN-SYSTEM-10-R4.2`) · **R4** / R4.1 Aufgaben baseline · **R3 Batch 03** (Administration, Documents DAM, Planning Administration) · PO Publishing/CMS/Infoboard baseline **PASS** · R1 Batch 01/02 — awaiting PO re-review.

| Route | R3 disposition |
| --- | --- |
| `/dashboard/workspace` | MIGRATED_DS10_R3 — `SceWorkspaceChrome` |
| `/dashboard/workspace/audit` | MIGRATED_DS10_R3 |
| `/dashboard/workspace/governance/break-glass` | MIGRATED_DS10_R3 |
| `/dashboard/logs` | MIGRATED_DS10_R3 — dense audit table |
| `/dashboard/planner/day` | MIGRATED_DS10_R3 |
| `/dashboard/planner/new` | MIGRATED_DS10_R3 — create form SCE surfaces |
| `/dashboard/admin/facilities` | MIGRATED_DS10_R3 — panel control tokens |
| `/dashboard/seasons/planner` | MIGRATED_DS10_R3 |

| Route | PO visual status (Batch 01) |
| --- | --- |
| `/dashboard` | PO_ACCEPTED |
| `/dashboard/org-units` | PO_ACCEPTED |
| `/dashboard/teams` | PO_ACCEPTED_WITH_MINOR_REVIEW |
| `/dashboard/teams/provider-mapping` | R1_REQUIRED → R1 delivered in branch (awaiting PO re-review) |
| `/dashboard/vereine` | PO_ACCEPTED_WITH_MINOR_REVIEW |
| `/dashboard/persons` | PO_ACCEPTED_WITH_MINOR_REVIEW |
| `/dashboard/competitions` | R1_REQUIRED → R1 delivered in branch (awaiting PO re-review) |

| Route | PO visual status (Batch 02 baseline) |
| --- | --- |
| `/dashboard/planner/week` | R1_REQUIRED (PO 7.5/10) |
| `/dashboard/programm` | R1_REQUIRED (PO 8.5/10 minor) |
| `/dashboard/training` | R1_REQUIRED (PO 8/10) |
| `/dashboard/matchcenter` | R1_REQUIRED (PO 7/10) |
| `/dashboard/tournamentcenter` | R1_REQUIRED (PO 8/10 minor) |
| `/dashboard/veranstaltungen` | R1_REQUIRED (PO 8/10 minor) |
