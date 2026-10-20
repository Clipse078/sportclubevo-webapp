# SCE-DESIGN-SYSTEM-09 — Responsive & Accessibility Hardening

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-09` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-08` (**CLOSED / ACCEPTED / MERGED**, PR **#886**) |
| **Status** | **READY FOR PO REVIEW** (draft PR — not merged) |
| **`DS09_STATUS`** | **READY FOR PO REVIEW** |
| **Branch** | `cursor/sce-design-system-09-responsive-accessibility` |
| **Baseline STAGE (pre-branch)** | `3224666df3b67cee8c0df38dbc442fb424abc7e3` |
| **Predecessor DS-08 PR** | **#886** |
| **Successor** | **`SCE-DESIGN-SYSTEM-10`** — Product-wide Adoption / Legacy Removal |

**PO review:** `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-10`**

---

## Mission

Final **systematic hardening** of responsive behaviour and accessibility on **canonical Design System primitives** before DS-10 performs product-wide adoption and legacy removal.

**Not in scope:** product-wide route migration (→ **DS-10**), starting DS-10 work in this branch.

**Core principles:** one interaction language across viewports · no page-level horizontal overflow · contained semantic scroll · keyboard + visible focus · touch-safe dense controls · Communication remains positive reference.

---

## Deliverables

| Artifact | Purpose |
| --- | --- |
| [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) | Master entry — DS-09 section |
| [`SCE-DESIGN-SYSTEM-09-RESPONSIVE-A11Y-INVENTORY.md`](../design/SCE-DESIGN-SYSTEM-09-RESPONSIVE-A11Y-INVENTORY.md) | DS-10 migration gate (responsive/a11y) |
| [`SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md) | Adoption debt → DS-10 |
| [`SCE-DESIGN-SYSTEM-08-DS09-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-08-DS09-HANDOFF.md) | Consumed DS-08 handoff |
| `lib/design-system/sce-responsive-accessibility-foundation.ts` | Viewport + a11y contracts |
| `lib/design-system/sce-responsive-accessibility-micro-ux.ts` | Shared class recipes |
| `lib/design-system/sce-design-system-09-meta.ts` | Typed audit + governance |

---

## Final architecture (ready for PO review)

```text
RESPONSIVE_SYSTEM_PRODUCT_WIDE = YES
ACCESSIBILITY_SYSTEM_PRODUCT_WIDE = YES
LOCAL_BREAKPOINT_DRIFT_ALLOWED = NO
HORIZONTAL_PAGE_OVERFLOW_ALLOWED = NO
KEYBOARD_ACCESS_REQUIRED = YES
VISIBLE_FOCUS_REQUIRED = YES
COLOUR_ONLY_SEMANTICS_ALLOWED = NO
TOUCH_TARGET_HARDENING_REQUIRED = YES
TEXT_EXPANSION_RESILIENT = YES
DS10_FINAL_ADOPTION_REQUIRED = YES
PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO
```

**Readiness marker:** `SCE_DESIGN_SYSTEM_09_READY_FOR_PO_REVIEW`

---

## DS-10 handoff (explicit)

DS-09 **does not** claim all routes are migrated. DS-10 consumes DS-01–DS-09 inventories and removes legacy parallel systems. See [`SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md).
