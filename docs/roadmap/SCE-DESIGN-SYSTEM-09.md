# SCE-DESIGN-SYSTEM-09 — Responsive & Accessibility Hardening

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-09` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-08` (**CLOSED / ACCEPTED / MERGED**, PR **#886**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#887** responsive/a11y baseline → PR **#889** PO addendum → **STAGE**) |
| **`DS09_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-09-responsive-accessibility` |
| **Baseline STAGE (final PO review)** | `758a52fd403406ad6cb2843cfdd0218e6b9974ad` |
| **Accepted DS-09 implementation HEAD** | `2a71b2779f56d307419714b1c4e7ecebe06c6d10` |
| **Feature HEAD before final closure docs** | `2a71b2779f56d307419714b1c4e7ecebe06c6d10` |
| **Prior closure commit (PR #887)** | `ae705a70f0fa3876cea6c66f94e22ab82249d504` |
| **Prior STAGE merge (PR #887)** | `0dbfb886714ff7bf2164a6f41611b7657e17b590` |
| **Final closure commit** | `60d4c81b083451a55953333287274c732b985410` |
| **Final STAGE merge commit (PR #889)** | `1c1b91852215db819239e70090d2a64759a977ca` |
| **Predecessor DS-08 PR** | **#886** |
| **PR (responsive/a11y baseline)** | **#887** — **MERGED** |
| **PR (PO addendum + final closure)** | **#889** — **MERGED** |
| **Successor** | **`SCE-DESIGN-SYSTEM-10`** — Product-wide Adoption / Legacy Removal |

**PO closure:** `PO_DS09_VISUAL_UAT = PASS` · `PO_DS09_RESPONSIVE_REVIEW = PASS` · `PO_DS09_ACCESSIBILITY_REVIEW = PASS` · `PO_DS09_DENSITY_BORDER_REVIEW = PASS` · `PO_DS09_MODAL_FIRST_CREATE_REVIEW = PASS` · `PO_DS09_TOGGLE_FIRST_REVIEW = PASS` · `PO_DS09_ROLES_OVERFLOW_REVIEW = PASS` · `PO_RESPONSIVE_REVIEW = PASS` · `PO_ACCESSIBILITY_REVIEW = PASS` · `PO_DESKTOP_REVIEW = PASS` · `PO_MOBILE_REVIEW = PASS` · `PO_TABLET_REVIEW = PASS` · `PO_HORIZONTAL_OVERFLOW_REVIEW = PASS` · `PO_LONG_CONTENT_REFLOW_REVIEW = PASS` · `PO_KEYBOARD_FOCUS_REVIEW = PASS` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-10`**

---

## PO acceptance (final closure)

Product Owner accepts DS-09 responsive and accessibility hardening **and** the PO addendum (density/borders, modal-first create, toggle-first binary audit, roles overflow containment) on **canonical primitives** and **representative adoption sites**. Closure is documentation and programme truth only — no redesign and **no** DS-10 product-wide migration in this package.

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
| `lib/design-system/sce-density-border-foundation.ts` | Density/border programme locks |
| `lib/design-system/sce-create-flow-foundation.ts` | Modal-first create locks |
| `lib/design-system/sce-design-system-09-meta.ts` | Typed audit + governance |

---

## Final architecture (PO accepted)

```text
RESPONSIVE_SYSTEM_PRODUCT_WIDE = YES
ACCESSIBILITY_SYSTEM_PRODUCT_WIDE = YES
RESPONSIVE_FINAL_HARDENING = DS09
ACCESSIBILITY_FINAL_HARDENING = DS09
LOCAL_BREAKPOINT_DRIFT_ALLOWED = NO
HORIZONTAL_PAGE_OVERFLOW_ALLOWED = NO
RESPONSIVE_REFLOW_REQUIRED = YES
MOBILE_IS_NOT_SHRUNK_DESKTOP = YES
DESKTOP_IS_NOT_STRETCHED_MOBILE = YES
FIXED_NAV_CONTENT_COLLISION = NO
BOTTOM_NAV_CONTENT_OBSCURED = NO
KEYBOARD_ACCESS_REQUIRED = YES
VISIBLE_FOCUS_REQUIRED = YES
COLOUR_ONLY_SEMANTICS_ALLOWED = NO
ICON_ONLY_ACTION_ACCESSIBLE_NAME_REQUIRED = YES
DIALOG_FOCUS_MANAGEMENT_REQUIRED = YES
REDUCED_MOTION_SUPPORTED = YES
TOUCH_TARGET_HARDENING_REQUIRED = YES
TEXT_EXPANSION_RESILIENT = YES
PRODUCT_WIDE_RESPONSIVE_AUDIT_REQUIRED = YES
PRODUCT_WIDE_ACCESSIBILITY_AUDIT_REQUIRED = YES
COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES
DENSITY_SYSTEM_CANONICAL = YES
BORDER_SYSTEM_CANONICAL = YES
NESTED_BORDER_SOUP_ALLOWED = NO
CARD_SOUP_ALLOWED = NO
DENSE_UI_PAGE_HORIZONTAL_OVERFLOW = NO
CREATE_FLOW_MODAL_FIRST = YES
CREATE_FLOW_FULL_PAGE_DEFAULT = NO
BINARY_CONTROL_COMPLIANCE = PASS
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES
WORLD_CLASS_MICRO_UX_REQUIRED = YES
LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO
DS10_FINAL_ADOPTION_REQUIRED = YES
PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO
```

Automated guardrails: `lib/design-system/__tests__/sce-design-system-09-responsive-accessibility.test.ts` · `lib/design-system/__tests__/sce-design-system-09-po-addendum.test.ts`.

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
