# SCE-DESIGN-SYSTEM-10 — Product-wide Adoption / Legacy Removal

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-10` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-09` (**CLOSED / ACCEPTED / MERGED**, PR **#887**) |
| **`DS10_STATUS`** | **PO_VISUAL_UAT_IN_PROGRESS** (R1 Batch 01 — not closed) |
| **Branch** | `cursor/sce-design-system-10-product-wide-adoption` |
| **Baseline STAGE (pre-branch)** | `758a52fd403406ad6cb2843cfdd0218e6b9974ad` |
| **PR** | **DRAFT** against **STAGE** |

**PO review:** `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

---

## Mission

Make SportClubEvo **visibly and structurally** converge on SCE Design System v1.0 across dashboard modules — one navigation, workspace, activity, and visual family. Communication (`/dashboard/communication`, `/dashboard/communication/email-sender`) remains the primary visual reference without copying Communication layout into every domain.

---

## Deliverables

| Artifact | Purpose |
| --- | --- |
| [`SCE-DESIGN-SYSTEM-10-PRODUCT-WIDE-MIGRATION-MATRIX.md`](../design/SCE-DESIGN-SYSTEM-10-PRODUCT-WIDE-MIGRATION-MATRIX.md) | Authoritative disposition matrix |
| [`SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md) | Consumed handoff debt |
| `lib/design-system/sce-design-system-10-meta.ts` | Typed matrix + governance |
| Product migrations | Workspace chrome, dense UI, toggles, billing tabs, facilities shell |

---

## Closure gates (PO acceptance — not claimed in this PR)

```text
PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO   (PO visual UAT R1 in progress)
DS10_PO_VISUAL_UAT = IN_PROGRESS
DS10_R1_REQUIRED = YES
WORKSPACE_SYSTEM_PRODUCT_WIDE = YES
BREADCRUMB_SYSTEM_PRODUCT_WIDE = YES
CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC = YES
SCE_DESIGN_SYSTEM_COMPLIANCE = PASS
```

**Do not merge without PO visual UAT.** **Do not start DS-11** in this package.
