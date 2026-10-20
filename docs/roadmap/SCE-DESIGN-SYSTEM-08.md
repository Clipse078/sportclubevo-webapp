# SCE-DESIGN-SYSTEM-08 — Tables, Lists & Dense UI

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-08` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-07` (**CLOSED / ACCEPTED / MERGED**, PR **#885**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#886** → **STAGE**; merge recorded on **STAGE** after merge) |
| **`DS08_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **`DS08_R1_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-08-tables-lists-dense-ui` |
| **Baseline STAGE (pre-branch)** | `867d6c4a443d33ee219a65d71c755fd78e352bbc` |
| **Accepted base implementation HEAD** | `280e287ff5e80cd1e987dbb5af6a9c42567b38f9` |
| **Accepted R1 HEAD** | `d164cafd8b2fc9cb8184d7d499d8201ef2b4c783` |
| **Feature HEAD before closure docs** | `d164cafd8b2fc9cb8184d7d499d8201ef2b4c783` |
| **Closure commit** | *(recorded in `SCE_DESIGN_SYSTEM_08_PO_CLOSURE.CLOSURE_COMMIT` after closure commit)* |
| **STAGE merge commit** | *(recorded after PR #886 merge)* |
| **Predecessor DS-07 PR** | **#885** |
| **PR** | **#886** — **MERGED** |
| **Successor** | **`SCE-DESIGN-SYSTEM-09`** — Responsive & Accessibility Hardening |

**PO closure:** `PO_DS08_VISUAL_UAT = PASS` · `PO_DS08_R1_RUNTIME_REVIEW = PASS` · `PO_PEOPLE_ACCESS_DESKTOP_REVIEW = PASS` · `PO_PEOPLE_ACCESS_RESPONSIVE_REVIEW = PASS` · `PO_ROLES_DENSE_TABLE_REVIEW = PASS` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-09`**

---

## PO acceptance (final closure)

Product Owner accepts DS-08 including **R1 Server/Client boundary repair** (Roles overview dense table loads; interactive row handlers confined to client leaf modules). Closure is documentation and programme truth only — no redesign.

**DS-08 does NOT claim** every table/list/dense surface is migrated product-wide, nor that responsive/a11y hardening is complete. Representative adoption + canonical primitives + DS-10 inventory + DS-09 handoff remain the migration gates.

---

## Mission

Establish **one canonical SportClubEvo language** for dense operational information — tables, administrative lists, entity lists, toolbars, row actions, sorting, pagination, and responsive dense layouts — with **visible adoption** on representative screens.

**Not in scope:** product-wide migration (→ **DS-10**), final responsive/a11y hardening (→ **DS-09**).

**Core principles:** TABLE when column relationships matter · LIST when entity hierarchy matters · NO card soup · DS-07 states in the same content region · Communication-quality calm · uniform language ≠ identical layouts.

---

## Deliverables

| Artifact | Purpose |
| --- | --- |
| [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) | Master entry — DS-08 section |
| [`SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md`](../design/SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md) | DS-10 migration gate |
| [`SCE-DESIGN-SYSTEM-08-DS09-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-08-DS09-HANDOFF.md) | Responsive & a11y debt → DS-09 |
| [`SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md) | Consumed DS-07 handoff |
| `lib/design-system/sce-dense-ui-foundation.ts` | Pattern semantics, RSC boundary & contracts |
| `lib/design-system/sce-dense-ui-micro-ux.ts` | Row/header micro recipes |
| `lib/design-system/sce-design-system-08-meta.ts` | Typed audit + governance |
| `components/sce/dense/*` | Canonical dense primitives |

---

## Final architecture (accepted)

**Pattern selection**

```text
TABLE_WHEN_COLUMN_RELATIONSHIPS_MATTER = YES
LIST_WHEN_ENTITY_HIERARCHY_MATTERS = YES
CARD_GRID_AS_DEFAULT_DENSE_UI = NO
```

**Server Component safety**

```text
SERVER_COMPONENT_SAFE_DENSE_UI_API = YES
EVENT_HANDLERS_CROSS_RSC_BOUNDARY = NO
FAKE_INTERACTIVE_ROWS_ALLOWED = NO
SEMANTIC_TABLE_STRUCTURE_PRESERVED = YES
```

**Canonical dense composition**

```text
SceDenseSurface → toolbar → header → rows → empty/loading/error (same region) → optional footer
```

| Primitive | Role |
| --- | --- |
| `SceDenseSurface` | Bounded operational panel (toolbar + rows + DS-07 states) |
| `SceDenseToolbar` | Search / filters / contextual primary action |
| `SceDenseGridHeader` / `SceDenseGridRow` | Entity-oriented responsive grid lists |
| `SceDataTable` / `SceDataTableRow` / `SceDataTableHeaderCell` | Semantic tabular data |
| `SceSortableColumnHeader` | Accessible sort affordance |
| `SceEntityIdentity` | Avatar + primary + secondary identity |
| `SceDenseMetaChip` | Restrained metadata chips |
| `SceDenseRowActions` | Predictable row action region |
| `SceDenseResultCount` | Toolbar result summary |
| `SceDensePagination` | Range + prev/next where needed |
| `SceDenseList` | Non-tabular dense lists (mobile stacks) |

Row actions: **DS-06** `SceIconButton` · `SceOverflowMenu` · `SceActionLink` · `Button`.

Filters: **DS-05** `SceSearchField` · `SceToolbarSelect`.

States: **DS-07** `SceEmptyState` · `SceSkeleton` · `SceActionableError`.

Selection: `ROW_SELECTION_CHECKBOX_ALLOWED = YES_WHEN_MULTI_SELECTION` · `BINARY_SETTING_CHECKBOX_ALLOWED = NO`.

---

## Representative visible adoption (PO accepted)

| Area | Pattern | Status |
| --- | --- | --- |
| Personen & Zugänge | Entity-oriented dense list | **ACCEPTED** — canonical `ENTITY_LIST` / `DENSE_LIST` |
| Roles overview | Semantic table + mobile dense list | **ACCEPTED** — canonical **TABLE** |
| Billing operations tables | `SceDataTable` bridge | **ACCEPTED** |

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
COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES
WORLD_CLASS_MICRO_UX_REQUIRED = YES
LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO
BINARY_CONTROL_COMPLIANCE = PASS
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES
DS10_FINAL_ADOPTION_REQUIRED = YES
PRODUCT_WIDE_DENSE_UI_MIGRATION_COMPLETE = NO
LOCAL_PARALLEL_DENSE_UI_SYSTEMS_ALLOWED = NO
RESPONSIVE_FINAL_HARDENING = DS09
ACCESSIBILITY_FINAL_HARDENING = DS09
PRODUCT_WIDE_RESPONSIVE_AUDIT_REQUIRED = YES
PRODUCT_WIDE_ACCESSIBILITY_AUDIT_REQUIRED = YES
SCE_DESIGN_SYSTEM_COMPLIANCE = PASS
```

Automated guardrails: `lib/design-system/__tests__/sce-design-system-08-dense-ui.test.ts` · `lib/design-system/__tests__/sce-design-system-08-r1-roles-rsc.test.tsx` · `components/sce/dense/__tests__/SceDensePrimitives.test.tsx`.

---

## R1 — Roles overview RSC boundary (PO accepted)

| Lock | Value |
| --- | --- |
| `PO_DS08_R1_RUNTIME_REVIEW` | **PASS** |
| `SERVER_COMPONENT_SAFE_DENSE_UI_API` | **YES** |
| `EVENT_HANDLERS_CROSS_RSC_BOUNDARY` | **NO** |
| Roles administration page | Server Component entry preserved |
| Interactive row handlers | `SceDataTableRow` client module only |

---

## DS-09 handoff (explicit)

DS-08 **does not** claim product-wide responsive or accessibility conformance. See [`SCE-DESIGN-SYSTEM-08-DS09-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-08-DS09-HANDOFF.md).

---

## DS-10 debt (explicit)

Full dense UI migration inventory remains in [`SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md`](../design/SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md). DS-08 closure **does not** imply every legacy table/list has migrated.

---

## Final closure markers

```text
DS08_STATUS = CLOSED / ACCEPTED / MERGED
SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS
NEXT_PACKAGE = SCE-DESIGN-SYSTEM-09 — Responsive & Accessibility Hardening
DENSE_UI_SYSTEM_PRODUCT_WIDE = YES
TABLE_SYSTEM_CANONICAL = YES
LIST_SYSTEM_CANONICAL = YES
WORLD_CLASS_MICRO_UX_REQUIRED = YES
LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO
BINARY_CONTROL_COMPLIANCE = PASS
DS10_FINAL_ADOPTION_REQUIRED = YES
PRODUCT_WIDE_DENSE_UI_MIGRATION_COMPLETE = NO
SCE_DESIGN_SYSTEM_COMPLIANCE = PASS
SCE_DESIGN_SYSTEM_08_CLOSED_ACCEPTED_MERGED
```
