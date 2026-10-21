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

**Status:** `DS10_STATUS = PO_VISUAL_UAT_IN_PROGRESS` · `PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO` · R1 Batch 01 (Club / Organisation core) recorded in `SCE_DESIGN_SYSTEM_10_R1_BATCH_01_PO_VISUAL_UAT`.

| Route | PO visual status (Batch 01) |
| --- | --- |
| `/dashboard` | PO_ACCEPTED |
| `/dashboard/org-units` | PO_ACCEPTED |
| `/dashboard/teams` | PO_ACCEPTED_WITH_MINOR_REVIEW |
| `/dashboard/teams/provider-mapping` | R1_REQUIRED → R1 delivered in branch (awaiting PO re-review) |
| `/dashboard/vereine` | PO_ACCEPTED_WITH_MINOR_REVIEW |
| `/dashboard/persons` | PO_ACCEPTED_WITH_MINOR_REVIEW |
| `/dashboard/competitions` | R1_REQUIRED → R1 delivered in branch (awaiting PO re-review) |
