# DS-09 → DS-10 handoff — Product-wide Adoption / Legacy Removal

**DS-09 does NOT claim** every route is migrated to the canonical responsive and accessibility system.

DS-09 established **canonical viewport & accessibility contracts**, **shared micro-UX class recipes**, **representative hardening** on navigation, workspace chrome, dense adoption sites, dialogs, and feedback primitives. **DS-10** performs product-wide adoption and legacy removal.

## DS-10 must consume

| Source | Content |
| --- | --- |
| DS-01 | [`SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md`](./SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md) · migration matrix |
| DS-05 | Binary-control deferred inventory |
| DS-07 | Feedback inventory |
| DS-08 | [`SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md`](./SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md) |
| DS-09 | [`SCE-DESIGN-SYSTEM-09-RESPONSIVE-A11Y-INVENTORY.md`](./SCE-DESIGN-SYSTEM-09-RESPONSIVE-A11Y-INVENTORY.md) |
| Cross-cutting | Legacy workspaces, navigation duplicates, local empty states, row menus, desktop-only forms |

## Programme locks (unchanged by DS-09 readiness)

```text
DS10_FINAL_ADOPTION_REQUIRED = YES
PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO
PRODUCT_WIDE_RESPONSIVE_MIGRATION_COMPLETE = NO
PRODUCT_WIDE_ACCESSIBILITY_MIGRATION_COMPLETE = NO
```

Automated classification: `SCE_DESIGN_SYSTEM_09_DS10_HANDOFF_DEBT` in `lib/design-system/sce-design-system-09-meta.ts`.

**DS-10 consumption:** migrate remaining routes to canonical primitives — **not** re-open DS-09 architecture.
