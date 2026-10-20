# SCE-DESIGN-SYSTEM-08 — Tables, Lists & Dense UI

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-08` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-07` (**CLOSED / ACCEPTED / MERGED**, PR **#885**) |
| **Status** | **DRAFT — PO VISUAL REVIEW** |
| **`DS08_STATUS`** | **DRAFT — PO VISUAL REVIEW** |
| **Branch** | `cursor/sce-design-system-08-tables-lists-dense-ui` |
| **Baseline STAGE (pre-branch)** | `867d6c4a443d33ee219a65d71c755fd78e352bbc` |
| **Predecessor DS-07 PR** | **#885** |
| **Successor** | **`SCE-DESIGN-SYSTEM-09`** — Responsive & Accessibility Hardening |

**PO review:** `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-09`**

---

## Mission

Establish **one canonical SportClubEvo language** for dense operational information — tables, administrative lists, entity lists, toolbars, row actions, sorting, pagination, and responsive dense layouts — with **visible adoption** on representative screens.

**Not in scope:** product-wide migration (→ **DS-10**), final responsive/a11y hardening (→ **DS-09**).

**Core principles:** TABLE when column relationships matter · LIST when entity hierarchy matters · NO card soup · DS-07 states in the same content region · Communication-quality calm.

---

## Deliverables

| Artifact | Purpose |
| --- | --- |
| [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) | Master entry — DS-08 section |
| [`SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md`](../design/SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md) | DS-10 migration gate |
| [`SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md) | Consumed handoff debt |
| `lib/design-system/sce-dense-ui-foundation.ts` | Pattern semantics & contracts |
| `lib/design-system/sce-dense-ui-micro-ux.ts` | Row/header micro recipes |
| `lib/design-system/sce-design-system-08-meta.ts` | Typed audit + governance |
| `components/sce/dense/*` | Canonical dense primitives |

---

## Canonical primitives

| Primitive | Role |
| --- | --- |
| `SceDenseSurface` | Bounded operational panel (toolbar + rows + DS-07 states) |
| `SceDenseToolbar` | Search / filters / contextual primary action |
| `SceDenseGridRow` / `SceDenseGridHeader` | Entity-oriented responsive grid lists |
| `SceDataTable` | Semantic tabular data |
| `SceEntityIdentity` | Avatar + primary + secondary identity |
| `SceDenseList` | Non-tabular dense lists (mobile stacks) |
| `SceSortableColumnHeader` | Accessible sort affordance |
| `SceDensePagination` | Range + prev/next where needed |

Row actions: **DS-06** `SceIconButton` · `SceOverflowMenu` · `SceActionLink` · `Button`.

Filters: **DS-05** `SceSearchField` · `SceToolbarSelect`.

States: **DS-07** `SceEmptyState` · `SceSkeleton` · `SceActionableError`.

---

## Representative visible adoption

| Area | Evidence |
| --- | --- |
| Personen & Zugänge | `TenantUsersSearchableList` + `PeopleAccessDenseUserRow` |
| Roles overview | `TenantRolesOverviewDenseTable` — table vs entity grid flexibility |
| Billing tables | `BillingDataTable` → `SceDataTable` bridge |

---

## Governance locks

```text
DENSE_UI_SYSTEM_PRODUCT_WIDE = YES
TABLE_SYSTEM_CANONICAL = YES
LIST_SYSTEM_CANONICAL = YES
DENSE_SURFACE_CANONICAL = YES
ROW_ACTION_SYSTEM_CANONICAL = YES
DENSE_FILTER_TOOLBAR_CANONICAL = YES
TABLE_WHEN_COLUMN_RELATIONSHIPS_MATTER = YES
LIST_WHEN_ENTITY_HIERARCHY_MATTERS = YES
CARD_GRID_AS_DEFAULT_DENSE_UI = NO
VISIBLE_PRODUCT_ADOPTION_REQUIRED = YES
VISIBLE_DESIGN_CONVERGENCE_REQUIRED = YES
FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED = YES
RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE = NO
CARD_SOUP_ALLOWED = NO
BINARY_CONTROL_COMPLIANCE = PASS
NEW_BINARY_CHECKBOXES = 0
SCE_DESIGN_SYSTEM_COMPLIANCE = PASS
```

---

## Finish marker (PO merge)

```text
SCE_DESIGN_SYSTEM_08_READY_FOR_PO_REVIEW
```

(Draft PR — PO visual UAT before closure.)
