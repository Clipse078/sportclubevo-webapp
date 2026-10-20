# SCE-DESIGN-SYSTEM-09 — Responsive & Accessibility Hardening

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-09` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-08` (**CLOSED / ACCEPTED / MERGED**, PR **#886**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#887** → **STAGE**; merge recorded on **STAGE** after merge) |
| **`DS09_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-09-responsive-accessibility` |
| **Baseline STAGE (pre-branch)** | `3224666df3b67cee8c0df38dbc442fb424abc7e3` |
| **Accepted DS-09 implementation HEAD** | `2effdb133a0cd95fbc6fe0d82cec604bfe10effd` |
| **Feature HEAD before closure docs** | `2effdb133a0cd95fbc6fe0d82cec604bfe10effd` |
| **Closure commit** | `0000000000000000000000000000000000000000` |
| **STAGE merge commit** | `0000000000000000000000000000000000000000` |
| **Predecessor DS-08 PR** | **#886** |
| **PR** | **#887** — **MERGED** |
| **Successor** | **`SCE-DESIGN-SYSTEM-10`** — Product-wide Adoption / Legacy Removal |

**PO closure:** `PO_DS09_VISUAL_UAT = PASS` · `PO_RESPONSIVE_REVIEW = PASS` · `PO_ACCESSIBILITY_REVIEW = PASS` · `PO_DESKTOP_REVIEW = PASS` · `PO_MOBILE_REVIEW = PASS` · `PO_TABLET_REVIEW = PASS` · `PO_HORIZONTAL_OVERFLOW_REVIEW = PASS` · `PO_LONG_CONTENT_REFLOW_REVIEW = PASS` · `PO_KEYBOARD_FOCUS_REVIEW = PASS` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-10`**

---

## PO acceptance (final closure)

Product Owner accepts DS-09 responsive and accessibility hardening on **canonical primitives** and **representative adoption sites**. Closure is documentation and programme truth only — no redesign and **no** DS-10 product-wide migration in this package.

**DS-09 does NOT claim** every route is migrated to the canonical responsive and accessibility system. **DS-10** performs product-wide adoption and legacy removal per [`SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md).

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

## Final architecture (PO accepted)

```text
RESPONSIVE_SYSTEM_PRODUCT_WIDE = YES
ACCESSIBILITY_SYSTEM_PRODUCT_WIDE = YES
LOCAL_BREAKPOINT_DRIFT_ALLOWED = NO
HORIZONTAL_PAGE_OVERFLOW_ALLOWED = NO
RESPONSIVE_REFLOW_REQUIRED = YES
FIXED_NAV_CONTENT_COLLISION = NO
BOTTOM_NAV_CONTENT_OBSCURED = NO
KEYBOARD_ACCESS_REQUIRED = YES
VISIBLE_FOCUS_REQUIRED = YES
COLOUR_ONLY_SEMANTICS_ALLOWED = NO
TOUCH_TARGET_HARDENING_REQUIRED = YES
MIN_INTERACTIVE_TARGET_PX = 44
TEXT_EXPANSION_RESILIENT = YES
PRODUCT_WIDE_RESPONSIVE_AUDIT_REQUIRED = YES
PRODUCT_WIDE_ACCESSIBILITY_AUDIT_REQUIRED = YES
COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES
VISIBLE_DESIGN_CONVERGENCE_REQUIRED = YES
FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED = YES
RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE = NO
CARD_SOUP_ALLOWED = NO
WORLD_CLASS_MICRO_UX_REQUIRED = YES
LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO
BINARY_CONTROL_COMPLIANCE = PASS
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES
DS10_FINAL_ADOPTION_REQUIRED = YES
PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO
```

Automated guardrails: `lib/design-system/__tests__/sce-design-system-09-responsive-accessibility.test.ts`.

---

## DS-10 handoff (explicit)

DS-09 **does not** claim all routes are migrated. DS-10 consumes DS-01–DS-09 inventories and removes legacy parallel systems. See [`SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md).

Typed debt: `SCE_DESIGN_SYSTEM_09_DS10_HANDOFF_DEBT` in `lib/design-system/sce-design-system-09-meta.ts`.

---

## Final closure markers

```text
DS09_STATUS = CLOSED / ACCEPTED / MERGED
SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS
NEXT_PACKAGE = SCE-DESIGN-SYSTEM-10 — Product-wide Adoption / Legacy Removal
RESPONSIVE_SYSTEM_PRODUCT_WIDE = YES
ACCESSIBILITY_SYSTEM_PRODUCT_WIDE = YES
DS10_FINAL_ADOPTION_REQUIRED = YES
PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO
SCE_DESIGN_SYSTEM_COMPLIANCE = PASS
SCE_DESIGN_SYSTEM_09_CLOSED_ACCEPTED_MERGED
```
