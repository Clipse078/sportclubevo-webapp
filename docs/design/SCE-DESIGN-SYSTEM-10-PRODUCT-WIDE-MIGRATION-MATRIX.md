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

**Status:** `DS10_STATUS = READY_FOR_PO_REVIEW` — PO visual UAT required before closure.
