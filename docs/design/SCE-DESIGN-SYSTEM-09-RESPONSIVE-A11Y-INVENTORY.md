# SCE-DESIGN-SYSTEM-09 — Responsive & accessibility inventory

Human-readable product-wide audit for responsive behaviour and accessibility conformance on canonical primitives and representative routes.

**Typed rows:** `SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_INVENTORY` in `lib/design-system/sce-design-system-09-meta.ts`.

**Machine marker:** `RESPONSIVE_A11Y_MIGRATION_INVENTORY`

## Classifications

| Classification | Meaning |
| --- | --- |
| CANONICAL | Already aligned — DS-09 documents contract |
| MIGRATE_DS09 | Hardened in DS-09 representative adoption |
| MIGRATE_LATER_DS10 | Inventory-only — DS-10 product-wide migration |
| DOMAIN_SPECIFIC_CANONICAL | Preserve domain composition (tournament, planner) |
| DUPLICATE | Parallel local pattern — consolidate in DS-10 |
| LEGACY_REPLACE | Replace with canonical system in DS-10 |

## DS-09 representative hardening (PO review)

| Surface | Status |
| --- | --- |
| Global nav + mobile bottom nav | **HARDENED** |
| Workspace header | **HARDENED** |
| Personen & Zugänge dense toolbar | **HARDENED** |
| Roles dense table / mobile list | **HARDENED** (strategy unchanged) |
| Activity card text resilience | **HARDENED** (contract + existing min-w-0 grammar) |
| Dialog mobile adaptive shell | **HARDENED** |
| Feedback empty state reflow | **HARDENED** |

**DS-09 does not** imply `PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE`. Remaining surfaces stay **REMAINING** until **DS-10**.

## DS-10 carry-forward

Legacy admin forms, publishing tables, facilities admin, platform admin users, and unexplained local overflow wrappers remain **REMAINING** per typed inventory and [`SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md`](./SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md).
