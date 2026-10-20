# SCE-DESIGN-SYSTEM-08 — Dense UI inventory (DS-10 migration gate)

Human-readable product-wide audit of tables, lists, and dense operational surfaces.

**Typed rows:** `SCE_DESIGN_SYSTEM_08_DENSE_UI_INVENTORY` in `lib/design-system/sce-design-system-08-meta.ts`.

**Machine marker:** `DENSE_UI_MIGRATION_INVENTORY`

## Classifications

| Classification | Meaning |
| --- | --- |
| CANONICAL | Already aligned or domain-specific canonical |
| CANONICAL_WITH_REFINEMENT | Mostly aligned — minor DS-10 polish |
| MIGRATE_DS08 | Addressed in DS-08 representative adoption |
| MIGRATE_LATER_DS10 | Inventory-only in DS-08 |
| DOMAIN_SPECIFIC_CANONICAL | Preserve domain composition (tournament, planner) |
| DUPLICATE | Parallel local system — consolidate in DS-10 |
| LEGACY_REPLACE | Replace with canonical dense primitives |

## DS-08 representative adoption

| Surface | Pattern | Status |
| --- | --- | --- |
| Personen & Zugänge | Dense entity grid | **ADOPTED** |
| Roles overview | Semantic table + dense mobile list | **ADOPTED** |
| Billing operations tables | Table bridge | **BRIDGE** |

## DS-10 carry-forward

Facilities admin, Teams lists, Documents, Publishing, Infoboard admin, Platform admin users, and remaining local row/menu systems remain **REMAINING** per typed inventory.
